import { createClient } from '@vercel/kv';
import { Resend } from 'resend';
import { SOURCE_CONFIGS } from './source-configs.js';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = 'admin@libralab.ai';
const PUSHBULLET_API_KEY = process.env.PUSHBULLET_API_KEY;

/**
 * GET /api/radar/weekly-digest
 * Sends weekly summary email to admin
 * Called by cron: Mondays at 9:00
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow cron or admin auth
  const authHeader = req.headers.authorization;
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isAdmin = authHeader === `Bearer ${process.env.RADAR_ADMIN_TOKEN}`;

  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Gather weekly metrics
    const metrics = await gatherWeeklyMetrics();
    const sourceHealth = await gatherSourceHealth();
    const pendingEvents = await gatherPendingEvents();

    // Build email content
    const emailHtml = buildDigestEmail(metrics, sourceHealth, pendingEvents);

    // Send email
    const senderEmail = process.env.SENDER_EMAIL || 'KINN <thomas@kinn.at>';
    let emailResult = { id: null, error: null };
    try {
      emailResult = await resend.emails.send({
        from: senderEmail,
        to: ADMIN_EMAIL,
        subject: `KINN Radar Weekly: ${metrics.eventsFound} Events gefunden`,
        html: emailHtml,
      });
      console.log('[WEEKLY-DIGEST] Email result:', JSON.stringify(emailResult));
    } catch (emailError) {
      console.error('[WEEKLY-DIGEST] Email send error:', emailError);
      emailResult = { id: null, error: emailError.message };
    }

    // Check for source failures and notify via Pushbullet
    const failingSources = sourceHealth.filter(s => s.status === 'failing');
    if (failingSources.length > 0 && PUSHBULLET_API_KEY) {
      await notifyFailuresViaPushbullet(failingSources);
    }

    return res.status(200).json({
      success: true,
      emailSent: emailResult.id ? true : false,
      emailError: emailResult.error || null,
      metrics: {
        eventsFound: metrics.eventsFound,
        eventsAdded: metrics.eventsAdded,
        pending: pendingEvents.length,
        failingSources: failingSources.length
      }
    });

  } catch (error) {
    console.error('[WEEKLY-DIGEST] Error:', error);
    return res.status(500).json({
      error: 'Failed to send digest',
      message: error.message
    });
  }
}

async function gatherWeeklyMetrics() {
  let eventsFound = 0;
  let eventsAdded = 0;

  // Sum up last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayMetrics = await kv.hgetall(`radar:metrics:daily:${date}`) || {};
    eventsFound += parseInt(dayMetrics.found || 0);
    eventsAdded += parseInt(dayMetrics.added || 0);
  }

  // Get approval stats
  const allEventIds = await kv.smembers('radar:events') || [];
  let approved = 0;
  let rejected = 0;

  const eventPromises = allEventIds.slice(0, 100).map(id =>
    kv.hgetall(`radar:event:${id}`).catch(() => null)
  );
  const events = await Promise.all(eventPromises);

  events.forEach(event => {
    if (!event) return;
    if (event.approved === 'true' || event.approved === true) approved++;
    if (event.rejected === 'true' || event.rejected === true) rejected++;
  });

  const totalReviewed = approved + rejected;
  const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

  return {
    eventsFound,
    eventsAdded,
    approved,
    rejected,
    approvalRate
  };
}

async function gatherSourceHealth() {
  const sources = [];
  const sourceNames = Object.keys(SOURCE_CONFIGS);

  for (const name of sourceNames) {
    const config = SOURCE_CONFIGS[name];
    if (!config.active) continue;

    const normalizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [lastSuccess, lastError, events7d] = await Promise.all([
      kv.get(`radar:source:${normalizedName}:lastSuccess`),
      kv.get(`radar:source:${normalizedName}:lastError`),
      kv.get(`radar:source:${normalizedName}:events7d`)
    ]);

    let status = 'unknown';
    const now = new Date();
    const lastSuccessDate = lastSuccess ? new Date(lastSuccess) : null;
    const daysSinceSuccess = lastSuccessDate
      ? (now - lastSuccessDate) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (lastError && (!lastSuccessDate || daysSinceSuccess > 1)) {
      status = 'failing';
    } else if (daysSinceSuccess > 3) {
      status = 'degraded';
    } else if (lastSuccessDate) {
      status = 'healthy';
    }

    sources.push({
      name,
      status,
      lastSuccess: lastSuccess || null,
      lastError: lastError || null,
      events7d: parseInt(events7d) || 0
    });
  }

  return sources;
}

async function gatherPendingEvents() {
  const allEventIds = await kv.smembers('radar:events') || [];
  const pending = [];

  for (const id of allEventIds.slice(0, 50)) {
    const event = await kv.hgetall(`radar:event:${id}`);
    if (!event) continue;

    const isApproved = event.approved === 'true' || event.approved === true;
    const isRejected = event.rejected === 'true' || event.rejected === true;

    if (!isApproved && !isRejected) {
      pending.push({
        title: event.title,
        date: event.date,
        source: event.source,
        category: event.category
      });
    }
  }

  return pending.slice(0, 10); // Top 10 for email
}

function buildDigestEmail(metrics, sourceHealth, pendingEvents) {
  const healthy = sourceHealth.filter(s => s.status === 'healthy').length;
  const failing = sourceHealth.filter(s => s.status === 'failing').length;
  const degraded = sourceHealth.filter(s => s.status === 'degraded').length;

  const failingList = sourceHealth
    .filter(s => s.status === 'failing')
    .map(s => `<li style="color: #dc2626;">${s.name}: ${s.lastError || 'No data'}</li>`)
    .join('');

  const pendingList = pendingEvents
    .map(e => `<li>${e.title} - ${e.date} (${e.source})</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Work Sans', -apple-system, sans-serif; line-height: 1.6; color: #3A3A3A; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2C3E50; font-size: 24px; margin-bottom: 20px; }
    h2 { color: #4A90E2; font-size: 18px; margin-top: 30px; }
    .metric { display: inline-block; background: #f3f4f6; padding: 15px 20px; margin: 5px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; color: #2C3E50; }
    .metric-label { font-size: 12px; color: #6B6B6B; }
    .status-healthy { color: #16a34a; }
    .status-failing { color: #dc2626; }
    .status-degraded { color: #d97706; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .cta { display: inline-block; background: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6B6B6B; }
  </style>
</head>
<body>
  <h1>KINN Radar Weekly Digest</h1>

  <div style="margin: 20px 0;">
    <div class="metric">
      <div class="metric-value">${metrics.eventsFound}</div>
      <div class="metric-label">Events gefunden</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.eventsAdded}</div>
      <div class="metric-label">Neu hinzugefuegt</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.approvalRate}%</div>
      <div class="metric-label">Approval Rate</div>
    </div>
  </div>

  <h2>Source Health</h2>
  <p>
    <span class="status-healthy">${healthy} healthy</span> |
    <span class="status-degraded">${degraded} degraded</span> |
    <span class="status-failing">${failing} failing</span>
  </p>

  ${failing > 0 ? `
  <h2>Failing Sources</h2>
  <ul>${failingList}</ul>
  ` : ''}

  ${pendingEvents.length > 0 ? `
  <h2>Pending Events (${pendingEvents.length})</h2>
  <ul>${pendingList}</ul>
  ` : '<p>Keine pending Events.</p>'}

  <a href="https://kinn.at/admin#radar" class="cta">Zum Admin Dashboard</a>

  <div class="footer">
    <p>KINN Radar - Automatischer Weekly Digest</p>
    <p>Gesendet jeden Montag um 9:00 Uhr</p>
  </div>
</body>
</html>
  `;
}

async function notifyFailuresViaPushbullet(failingSources) {
  if (!PUSHBULLET_API_KEY) return;

  const title = `KINN Radar: ${failingSources.length} Source(s) failing`;
  const body = failingSources
    .map(s => `${s.name}: ${s.lastError || 'No data'}`)
    .join('\n');

  try {
    await fetch('https://api.pushbullet.com/v2/pushes', {
      method: 'POST',
      headers: {
        'Access-Token': PUSHBULLET_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'note',
        title: title,
        body: body
      })
    });
  } catch (error) {
    console.error('[PUSHBULLET] Failed to send notification:', error);
  }
}
