import { createClient } from '@vercel/kv';

// Use KINNST_ prefixed environment variables
const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    // Get all event IDs
    const eventIds = await kv.smembers('radar:events') || [];

    // Fetch all events
    const events = [];
    const now = new Date();

    for (const eventId of eventIds) {
      const event = await kv.hgetall(`radar:event:${eventId}`);

      if (event && event.date) {
        // Only include future events
        const eventDate = new Date(event.date);
        if (eventDate >= now) {
          events.push(event);
        }
      }
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`[RADAR] Generating ICS with ${events.length} future events`);

    // Generate ICS content
    const icsContent = generateICS(events);

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="kinn-radar.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(icsContent);

  } catch (error) {
    console.error('[RADAR Calendar] Error generating ICS:', error);
    return res.status(500).send('Error generating calendar feed');
  }
}

function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KINN//RADAR AI Events Tyrol//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KINN-RADAR - Free AI Events Tyrol',
    'X-WR-CALDESC:Every FREE AI/ML/Data Science Event in Tyrol - Auto-Updated',
    'X-WR-TIMEZONE:Europe/Vienna',
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
    'X-PUBLISHED-TTL:PT4H',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Vienna',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:20240331T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:20241027T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  // Add each event
  for (const event of events) {
    const eventLines = generateVEvent(event);
    lines.push(...eventLines);
  }

  lines.push('END:VCALENDAR');

  // Join with proper line endings
  return lines.join('\\r\\n');
}

function generateVEvent(event) {
  const lines = ['BEGIN:VEVENT'];

  // Generate UID
  const uid = `${event.id}@radar.kinn.at`;
  lines.push(`UID:${uid}`);

  // Generate timestamps
  const dtstart = formatDateTime(event.date, event.time || '18:00');
  const dtend = formatDateTime(event.date, event.endTime || addHours(event.time || '18:00', 2));

  lines.push(`DTSTART;TZID=Europe/Vienna:${dtstart}`);
  lines.push(`DTEND;TZID=Europe/Vienna:${dtend}`);
  lines.push(`DTSTAMP:${formatDateTime(new Date().toISOString().split('T')[0], new Date().toTimeString().split(' ')[0].substring(0, 5))}`);

  // Add event details
  const summary = `🤖 ${event.title}`;
  lines.push(`SUMMARY:${escapeICS(summary)}`);

  // Build description
  const descriptionParts = [];

  if (event.description) {
    descriptionParts.push(escapeICS(event.description));
    descriptionParts.push('');
  }

  descriptionParts.push(`📍 Location: ${event.location || 'TBA'}`);

  if (event.address) {
    descriptionParts.push(`📮 Address: ${event.address}`);
  }

  descriptionParts.push(`🏢 City: ${event.city || 'Innsbruck'}`);

  if (event.language) {
    const langMap = { 'de': 'Deutsch', 'en': 'English', 'mixed': 'DE/EN' };
    descriptionParts.push(`🗣️ Language: ${langMap[event.language] || event.language}`);
  }

  if (event.registrationUrl) {
    descriptionParts.push('');
    descriptionParts.push(`🔗 Register: ${event.registrationUrl}`);
  }

  if (event.tags && event.tags.length > 0) {
    descriptionParts.push('');
    descriptionParts.push(`🏷️ Tags: ${event.tags.join(', ')}`);
  }

  descriptionParts.push('');
  descriptionParts.push('✨ FREE EVENT - Part of KINN-RADAR');
  descriptionParts.push('📅 Subscribe for all FREE AI events in Tyrol');

  lines.push(`DESCRIPTION:${descriptionParts.map(escapeICS).join('\\n')}`);

  // Location
  if (event.location) {
    const location = event.address
      ? `${event.location}, ${event.address}, ${event.city || 'Innsbruck'}`
      : `${event.location}, ${event.city || 'Innsbruck'}`;
    lines.push(`LOCATION:${escapeICS(location)}`);
  }

  // URL if available
  if (event.registrationUrl) {
    lines.push(`URL:${event.registrationUrl}`);
  }

  // Categories
  const categories = event.tags || ['AI', 'Technology'];
  lines.push(`CATEGORIES:${categories.join(',')}`);

  // Status and transparency
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');

  // Classification
  lines.push('CLASS:PUBLIC');

  // Priority (normal)
  lines.push('PRIORITY:5');

  // Add source as comment
  lines.push(`COMMENT:Source: ${event.source || 'Newsletter'}`);

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
    .replace(/\\/g, '\\\\\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}