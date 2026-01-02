import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

// Source color mapping - distinct colors for each source
const SOURCE_COLORS = {
  'KINN': '#5ED9A6',              // Mint (KINN brand)
  'InnCubator': '#F59E0B',        // Orange
  'Startup.Tirol': '#3B82F6',     // Blue
  'AI Austria': '#8B5CF6',        // Purple
  'Uni Innsbruck': '#06B6D4',     // Cyan
  'MCI': '#14B8A6',               // Teal
  'FH Kufstein': '#10B981',       // Emerald
  'Standortagentur Tirol': '#EC4899', // Pink
  'DIH West': '#6366F1',          // Indigo
  'Die Bäckerei': '#78716C',      // Stone
  'Das Wundervoll': '#A855F7',    // Fuchsia
  'Impact Hub Tirol': '#F97316',  // Orange-dark
  'WKO Tirol': '#EF4444',         // Red
  'LSZ': '#84CC16',               // Lime
  'Congress Messe Innsbruck': '#0EA5E9', // Sky
  'Innsbruck.info': '#FB923C',    // Amber
};

// Group sources into categories
function getSourceCategory(source) {
  if (source === 'KINN') return 'KINN';
  if (source === 'InnCubator') return 'InnCubator';
  if (source === 'Startup.Tirol') return 'Startup.Tirol';
  if (source === 'AI Austria') return 'AI Austria';
  if (['Uni Innsbruck', 'MCI', 'FH Kufstein'].includes(source)) return 'Uni';
  return 'Andere';
}

function getSourceColor(source) {
  return SOURCE_COLORS[source] || '#9CA3AF';
}

/**
 * GET /api/radar/calendar?year=2026
 * Returns event data formatted for the radar calendar widget
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Edge cache: 5 min fresh, serve stale up to 10 min while revalidating
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // Get all event IDs
    const eventIds = await kv.smembers('radar:events') || [];

    // Fetch all events
    const eventPromises = eventIds.map(id =>
      kv.hgetall(`radar:event:${id}`).catch(() => null)
    );
    const allEvents = await Promise.all(eventPromises);

    // Filter to approved events in the requested year (exclude rejected)
    const yearEvents = allEvents.filter(event => {
      if (!event || !event.date) return false;

      // Explicitly exclude rejected events
      const isRejected = event.status === 'rejected' ||
                         event.rejected === 'true' ||
                         event.rejected === true;
      if (isRejected) return false;

      // Check if approved (support both schemas)
      const isApproved = event.status === 'approved' ||
                         event.approved === 'true' ||
                         event.approved === true;
      if (!isApproved) return false;

      // Check if in year range
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Deduplicate events by title+date (same event may have been extracted multiple times)
    const seen = new Set();
    const dedupedEvents = yearEvents.filter(event => {
      const key = `${event.title}|${event.date}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Group events by date
    const dayMap = {};
    const bySource = {};  // Dynamic - will be populated with actual source names

    dedupedEvents.forEach(event => {
      const date = event.date;
      const sourceName = event.source || 'Unbekannt';

      // Count by actual source name
      bySource[sourceName] = (bySource[sourceName] || 0) + 1;

      if (!dayMap[date]) {
        dayMap[date] = [];
      }

      dayMap[date].push({
        id: event.id,
        title: event.title,
        time: event.time || '18:00',
        location: event.location || event.city || 'TBA',
        source: event.source,
        sourceColor: getSourceColor(event.source),
        detailUrl: event.detailUrl || event.registrationUrl || null,
        thumbnail: event.thumbnail || null,
        soldOut: event.soldOut === true || event.soldOut === 'true'
      });
    });

    // Convert to array format
    const days = Object.entries(dayMap)
      .map(([date, events]) => ({
        date,
        events: events.sort((a, b) => a.time.localeCompare(b.time))
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate all weeks of the year for the grid
    const weeks = generateYearWeeks(year);

    // Build sourceColors dynamically from actual sources found
    const sourceColors = {};
    Object.keys(bySource).forEach(source => {
      sourceColors[source] = getSourceColor(source);
    });

    return res.status(200).json({
      success: true,
      year,
      totalEvents: dedupedEvents.length,
      bySource,
      days,
      weeks,
      sourceColors
    });

  } catch (error) {
    console.error('[RADAR-CALENDAR] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch calendar data',
      message: error.message
    });
  }
}

/**
 * Generate week structure for the year
 * Returns array of 52-53 weeks, each with 7 days
 */
function generateYearWeeks(year) {
  const weeks = [];

  // Start from first Monday of the year (or last Monday of previous year)
  let current = new Date(`${year}-01-01`);
  const dayOfWeek = current.getDay();

  // Adjust to Monday (day 1, or 0 for Sunday needs to go back 6 days)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  current.setDate(current.getDate() - daysToMonday);

  // Generate 53 weeks to cover the full year
  for (let w = 0; w < 53; w++) {
    const week = {
      weekNumber: w + 1,
      days: []
    };

    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0];
      const isInYear = current.getFullYear() === year;

      week.days.push({
        date: dateStr,
        dayOfWeek: d, // 0 = Monday, 6 = Sunday
        isInYear
      });

      current.setDate(current.getDate() + 1);
    }

    // Get month for first day of week (for month labels)
    const firstDayOfWeek = new Date(week.days[0].date);
    week.month = firstDayOfWeek.getMonth(); // 0-11
    week.isFirstWeekOfMonth = firstDayOfWeek.getDate() <= 7;

    weeks.push(week);
  }

  return weeks;
}
