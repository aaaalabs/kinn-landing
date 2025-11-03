/**
 * iCal Feed Endpoint for KINN Events
 * Generates an .ics file that users can subscribe to in any calendar app
 *
 * Usage: webcal://kinn.at/api/calendar.ics
 * Works with: Google Calendar, Apple Calendar, Outlook, etc.
 */

import { getEventsConfig } from './utils/redis.js';

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Get events from Redis configuration
    const config = await getEventsConfig();
    const events = config.events || [];

    console.log('[CALENDAR.ICS] Generating feed for', events.length, 'events');

    // Generate iCal format
    const ical = generateICalFeed(events, config.defaults);

    // Set headers for calendar file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename=kinn-events.ics');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return res.status(200).send(ical);

  } catch (error) {
    console.error('[CALENDAR.ICS] Error generating feed:', error.message);
    return res.status(500).send(
      'BEGIN:VCALENDAR\r\n' +
      'VERSION:2.0\r\n' +
      'PRODID:-//KINN//KI Treff Innsbruck//DE\r\n' +
      'X-ERROR:Internal server error\r\n' +
      'END:VCALENDAR\r\n'
    );
  }
}

/**
 * Generate iCal feed from events array
 * @param {Array} events - Array of event objects
 * @param {Object} defaults - Default configuration (timezone, organizer, etc.)
 * @returns {string} - iCal formatted string
 */
function generateICalFeed(events, defaults = {}) {
  const now = new Date();
  const timestamp = formatICalDate(now);
  const timezone = defaults.timezone || 'Europe/Vienna';

  let ical =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//KINN//KI Treff Innsbruck//DE\r\n' +
    'CALSCALE:GREGORIAN\r\n' +
    'METHOD:PUBLISH\r\n' +
    'NAME:KINN Events\r\n' +
    'X-WR-CALNAME:KINN Events\r\n' +
    'X-WR-CALDESC:Monatliche KI-Treffs in Innsbruck\r\n' +
    `X-WR-TIMEZONE:${timezone}\r\n` +
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n'; // Refresh every hour

  // Add VTIMEZONE definition for Europe/Vienna
  ical += generateVTimezone(timezone);

  // Add each event
  events.forEach(event => {
    ical += generateICalEvent(event, timestamp, defaults);
  });

  ical += 'END:VCALENDAR\r\n';

  return ical;
}

/**
 * Generate VTIMEZONE component for Europe/Vienna
 * @param {string} timezone - Timezone identifier (e.g., 'Europe/Vienna')
 * @returns {string} - iCal formatted VTIMEZONE component
 */
function generateVTimezone(timezone) {
  if (timezone !== 'Europe/Vienna') {
    // Only generate VTIMEZONE for Europe/Vienna
    // Other timezones would need their own definitions
    return '';
  }

  return (
    'BEGIN:VTIMEZONE\r\n' +
    'TZID:Europe/Vienna\r\n' +
    'BEGIN:DAYLIGHT\r\n' +
    'TZOFFSETFROM:+0100\r\n' +
    'TZOFFSETTO:+0200\r\n' +
    'DTSTART:19700329T020000\r\n' +
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\n' +
    'TZNAME:CEST\r\n' +
    'END:DAYLIGHT\r\n' +
    'BEGIN:STANDARD\r\n' +
    'TZOFFSETFROM:+0200\r\n' +
    'TZOFFSETTO:+0100\r\n' +
    'DTSTART:19701025T030000\r\n' +
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\n' +
    'TZNAME:CET\r\n' +
    'END:STANDARD\r\n' +
    'END:VTIMEZONE\r\n'
  );
}

/**
 * Generate a single iCal event
 * @param {Object} event - Event object
 * @param {string} timestamp - Current timestamp
 * @param {Object} defaults - Default configuration
 * @returns {string} - iCal formatted event
 */
function generateICalEvent(event, timestamp, defaults = {}) {
  const timezone = defaults.timezone || 'Europe/Vienna';
  const organizer = defaults.organizer || 'thomas@kinn.at';
  const categories = defaults.categories || ['KI', 'AI', 'Networking'];

  // Parse event dates
  const startDate = formatICalDate(new Date(event.start || event.date + 'T' + event.startTime));
  const endDate = formatICalDate(new Date(event.end || event.date + 'T' + event.endTime));

  // Build UID from event ID or generate one
  const uid = event.uid || event.id + '@kinn.at';

  // Build iCal event string
  let icalEvent = 'BEGIN:VEVENT\r\n' +
    'UID:' + uid + '\r\n' +
    'DTSTAMP:' + timestamp + '\r\n' +
    `DTSTART;TZID=${timezone}:` + startDate + '\r\n' +
    `DTEND;TZID=${timezone}:` + endDate + '\r\n' +
    'SUMMARY:' + escapeICalText(event.title) + '\r\n' +
    'DESCRIPTION:' + escapeICalText(event.description) + '\r\n' +
    'LOCATION:' + escapeICalText(event.location) + '\r\n';

  // Add meeting link for online/hybrid events
  if (event.meetingLink && (event.type === 'online' || event.type === 'hybrid')) {
    // CONFERENCE property for modern calendar clients (Apple Calendar, Google Calendar)
    icalEvent += 'CONFERENCE:' + event.meetingLink + '\r\n';
    // X-properties for better compatibility
    icalEvent += 'X-GOOGLE-CONFERENCE:' + event.meetingLink + '\r\n';
    icalEvent += 'X-MICROSOFT-SKYPETEAMSMEETINGURL:' + event.meetingLink + '\r\n';
    // Add to description as fallback
    const descriptionWithLink = escapeICalText(event.description + '\\n\\nMeeting Link: ' + event.meetingLink);
    icalEvent = icalEvent.replace(
      'DESCRIPTION:' + escapeICalText(event.description),
      'DESCRIPTION:' + descriptionWithLink
    );
  }

  icalEvent += 'URL:' + (event.url || 'https://kinn.at') + '\r\n' +
    'ORGANIZER;CN=KINN:mailto:' + organizer + '\r\n' +
    'CATEGORIES:' + categories.join(',') + '\r\n' +
    'STATUS:' + (event.status || 'CONFIRMED').toUpperCase() + '\r\n' +
    'SEQUENCE:0\r\n' +
    'BEGIN:VALARM\r\n' +
    'TRIGGER:-PT24H\r\n' + // Reminder 24 hours before
    'ACTION:DISPLAY\r\n' +
    'DESCRIPTION:KINN Event morgen um ' + new Date(event.start || event.date + 'T' + event.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: timezone }) + ' Uhr\r\n' +
    'END:VALARM\r\n' +
    'END:VEVENT\r\n';

  return icalEvent;
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSS)
 * Converts UTC timestamps to Europe/Vienna local time
 * @param {Date} date - Date object (typically in UTC)
 * @returns {string} - iCal formatted date string in Vienna timezone
 */
function formatICalDate(date) {
  // Use Intl.DateTimeFormat to convert to Europe/Vienna timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Extract formatted parts
  const parts = formatter.formatToParts(date);
  const obj = {};
  parts.forEach(p => obj[p.type] = p.value);

  // Return iCal format: YYYYMMDDTHHMMSS
  return `${obj.year}${obj.month}${obj.day}T${obj.hour}${obj.minute}${obj.second}`;
}

/**
 * Escape special characters for iCal text fields
 * @param {string} text
 * @returns {string}
 */
function escapeICalText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/;/g, '\\;')     // Semicolon
    .replace(/,/g, '\\,')     // Comma
    .replace(/\n/g, '\\n');   // Newline
}
