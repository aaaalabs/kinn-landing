import { createClient } from '@vercel/kv';
import logger from '../../lib/logger.js';
import { isEventApproved } from '../../lib/radar-status.js';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // Log request for debugging mobile issues
  logger.debug('[RADAR ICS] Method:', req.method, 'User-Agent:', req.headers['user-agent']?.substring(0, 80));

  // Accept GET, HEAD, and OPTIONS requests (mobile calendar apps need HEAD)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET, HEAD, and OPTIONS requests are accepted'
    });
  }

  // Handle OPTIONS for CORS preflight (mobile browsers)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(204).end();
  }

  try {
    // Get all event IDs
    const eventIds = await kv.smembers('radar:events') || [];

    // Fetch all events
    const events = [];
    const now = new Date();

    for (const eventId of eventIds) {
      const event = await kv.hgetall(`radar:event:${eventId}`);

      if (event && event.date) {
        // Only include approved, future events for the ICS feed
        const eventDate = new Date(event.date);
        const isApproved = isEventApproved(event);

        if (isApproved && eventDate >= now) {
          events.push(event);
        }
      }
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    logger.debug(`[RADAR] Generating ICS with ${events.length} future events`);

    // Generate ICS content
    const icsContent = generateICS(events);

    // Set headers for calendar file (desktop + mobile compatible)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="kinn-radar.ics"');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour (like KINN ICS)

    // Mobile-friendly headers (matching KINN ICS)
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS for mobile browsers
    res.setHeader('Accept-Ranges', 'none'); // Prevent partial content requests
    res.setHeader('Last-Modified', new Date().toUTCString()); // Cache validation

    // HEAD request: return headers only (mobile calendar apps validate feeds this way)
    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', Buffer.byteLength(icsContent, 'utf8').toString());
      logger.debug('[RADAR ICS] HEAD request successful');
      return res.status(200).end();
    }

    // GET request: return full iCal content
    return res.status(200).send(icsContent);

  } catch (error) {
    logger.error('[RADAR Calendar] Error generating ICS:', error);
    // Return valid ICS structure even on error
    return res.status(500).send(
      'BEGIN:VCALENDAR\r\n' +
      'VERSION:2.0\r\n' +
      'PRODID:-//KINN//RADAR AI Events Tyrol//EN\r\n' +
      'X-ERROR:Internal server error\r\n' +
      'END:VCALENDAR\r\n'
    );
  }
}

function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KINN//RADAR AI Events Tyrol//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'NAME:KINN Radar',
    'X-WR-CALNAME:KINN Radar',
    'X-WR-CALDESC:Alle KI Events in Tirol - automatisch aktualisiert',
    'X-WR-TIMEZONE:Europe/Vienna',
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
    'X-PUBLISHED-TTL:PT4H',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Vienna',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZNAME:CET',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  // Add each event
  for (const event of events) {
    const eventLines = generateVEvent(event);
    lines.push(...eventLines);
  }

  lines.push('END:VCALENDAR');

  // Join with proper CRLF line endings (ICS standard)
  return lines.join('\r\n');
}

function generateVEvent(event) {
  const lines = ['BEGIN:VEVENT'];

  // Generate UID
  const uid = `${event.id}@radar.kinn.at`;
  lines.push(`UID:${uid}`);

  // Generate DTSTAMP (current time in UTC format)
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  lines.push(`DTSTAMP:${dtstamp}`);

  // Generate timestamps
  const startTime = event.time || '18:00';
  const dtstart = formatDateTime(event.date, startTime);
  const dtend = formatDateTime(event.date, event.endTime || addHours(startTime, 2));

  lines.push(`DTSTART;TZID=Europe/Vienna:${dtstart}`);
  lines.push(`DTEND;TZID=Europe/Vienna:${dtend}`);

  // Title without emoji (cleaner for calendar clients)
  lines.push(`SUMMARY:${escapeICS(event.title)}`);

  // Build description
  const descriptionParts = [];

  if (event.description) {
    descriptionParts.push(event.description);
    descriptionParts.push('');
  }

  if (event.location && event.location !== 'TBA' && event.location !== 'TBD') {
    descriptionParts.push(`Ort: ${event.location}`);
  }

  if (event.city) {
    descriptionParts.push(`Stadt: ${event.city}`);
  }

  if (event.registrationUrl || event.detailUrl) {
    descriptionParts.push('');
    descriptionParts.push(`Details: ${event.registrationUrl || event.detailUrl}`);
  }

  descriptionParts.push('');
  descriptionParts.push(`Quelle: ${event.source || 'KINN Radar'}`);
  descriptionParts.push('via KINN Radar - kinn.at');

  lines.push(`DESCRIPTION:${descriptionParts.map(p => escapeICS(p)).join('\\n')}`);

  // Location
  if (event.location && event.location !== 'TBA' && event.location !== 'TBD') {
    const location = event.address
      ? `${event.location}, ${event.address}, ${event.city || 'Innsbruck'}`
      : `${event.location}, ${event.city || 'Innsbruck'}`;
    lines.push(`LOCATION:${escapeICS(location)}`);
  }

  // URL - use detailUrl or registrationUrl
  const eventUrl = event.detailUrl || event.registrationUrl;
  if (eventUrl) {
    lines.push(`URL:${eventUrl}`);
  }

  // Organizer
  lines.push('ORGANIZER;CN=KINN Radar:mailto:thomas@kinn.at');

  // Categories
  lines.push('CATEGORIES:KI,AI,Networking,Tirol');

  // Status
  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');

  // 24h Reminder (like KINN ICS)
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT24H');
  lines.push('ACTION:DISPLAY');
  lines.push(`DESCRIPTION:${escapeICS(event.title)} morgen`);
  lines.push('END:VALARM');

  lines.push('END:VEVENT');

  return lines;
}

function formatDateTime(date, time) {
  // Parse the date
  const d = new Date(date);

  // Parse the time
  const [hours, minutes] = (time || '18:00').split(':').map(Number);

  // Set the time
  d.setHours(hours);
  d.setMinutes(minutes);
  d.setSeconds(0);

  // Format as YYYYMMDDTHHMMSS
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${min}00`;
}

function addHours(time, hours) {
  const [h, m] = time.split(':').map(Number);
  const newHour = (h + hours) % 24;
  return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function escapeICS(text) {
  if (!text) return '';

  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}