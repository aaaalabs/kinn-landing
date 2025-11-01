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
    'X-WR-CALNAME:KINN - KI Treff Innsbruck\r\n' +
    'X-WR-CALDESC:Monatlicher KI-Austausch in Innsbruck\r\n' +
    `X-WR-TIMEZONE:${timezone}\r\n` +
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n'; // Refresh every hour

  // Add each event
  events.forEach(event => {
    ical += generateICalEvent(event, timestamp, defaults);
  });

  ical += 'END:VCALENDAR\r\n';

  return ical;
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
  const organizer = defaults.organizer || 'treff@in.kinn.at';
  const categories = defaults.categories || ['KI', 'AI', 'Networking'];

  // Parse event dates
  const startDate = formatICalDate(new Date(event.start || event.date + 'T' + event.startTime));
  const endDate = formatICalDate(new Date(event.end || event.date + 'T' + event.endTime));

  // Build UID from event ID or generate one
  const uid = event.uid || event.id + '@kinn.at';

  return (
    'BEGIN:VEVENT\r\n' +
    'UID:' + uid + '\r\n' +
    'DTSTAMP:' + timestamp + '\r\n' +
    `DTSTART;TZID=${timezone}:` + startDate + '\r\n' +
    `DTEND;TZID=${timezone}:` + endDate + '\r\n' +
    'SUMMARY:' + escapeICalText(event.title) + '\r\n' +
    'DESCRIPTION:' + escapeICalText(event.description) + '\r\n' +
    'LOCATION:' + escapeICalText(event.location) + '\r\n' +
    'URL:' + (event.url || 'https://kinn.at') + '\r\n' +
    'ORGANIZER;CN=KINN:mailto:' + organizer + '\r\n' +
    'CATEGORIES:' + categories.join(',') + '\r\n' +
    'STATUS:' + (event.status || 'CONFIRMED').toUpperCase() + '\r\n' +
    'SEQUENCE:0\r\n' +
    'BEGIN:VALARM\r\n' +
    'TRIGGER:-PT24H\r\n' + // Reminder 24 hours before
    'ACTION:DISPLAY\r\n' +
    'DESCRIPTION:KINN Event morgen um ' + new Date(event.start || event.date + 'T' + event.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: timezone }) + ' Uhr\r\n' +
    'END:VALARM\r\n' +
    'END:VEVENT\r\n'
  );
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSS)
 * @param {Date} date
 * @returns {string}
 */
function formatICalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
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
