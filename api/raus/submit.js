/**
 * POST /api/raus/submit
 *
 * Submits a use case and sends notification email
 * Also persists to Redis for future admin dashboard
 *
 * Request: { extracted, transcript, region, visibility, inputMode, userEmail? }
 * Response: { success: true, id }
 */

import { Resend } from 'resend';
import { Redis } from '@upstash/redis';

const resend = new Resend(process.env.RESEND_API_KEY);
const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { extracted, transcript, region, visibility, inputMode, userEmail } = req.body;

    if (!extracted) {
      return res.status(400).json({ error: 'Missing extracted data' });
    }

    const id = `raus-${Date.now()}`;
    const timestamp = new Date().toLocaleString('de-AT', { timeZone: 'Europe/Vienna' });
    const submittedAt = new Date().toISOString();

    // 1. Send notification email
    const adminEmail = process.env.RAUS_ADMIN_EMAIL || 'admin@libralab.ai';
    await resend.emails.send({
      from: 'KINN:RAUS <noreply@kinn.at>',
      to: adminEmail,
      replyTo: userEmail || undefined,
      subject: `RAUS: ${extracted.headline || 'Neuer Use Case'}`,
      html: buildEmailHtml({ extracted, transcript, region, visibility, inputMode, id, timestamp, userEmail })
    });

    // 2. Persist to Redis for admin dashboard
    // Schema v1: Pipeline-ready with status tracking
    await redis.lpush('raus:submissions', JSON.stringify({
      v: 1,  // Schema version for future migrations
      id,
      status: 'submitted',  // submitted → reviewed → verified → published
      extracted,
      transcript,
      region,
      visibility,
      inputMode,
      userEmail: userEmail || null,
      submittedAt,
      // Future fields (added during review):
      // reviewedBy, reviewedAt, verifiedAt, publishedAt, adminNotes
    }));

    // 3. Increment total submissions counter (for teaser widget)
    await redis.incr('raus:stats:total');

    return res.status(200).json({ success: true, id });

  } catch (error) {
    console.error('[RAUS] Submit error:', error);
    return res.status(500).json({ error: 'Submit failed', message: error.message });
  }
}

function buildEmailHtml({ extracted, transcript, region, visibility, inputMode, id, timestamp, userEmail }) {
  const e = extracted;
  const tools = Array.isArray(e.tools) ? e.tools.join(', ') : (e.tools || '—');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #5ED9A6; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 18px; color: #2C3E50; }
    .meta { font-size: 12px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 20px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 4px; }
    .value { font-size: 15px; color: #2C3E50; }
    .headline { font-size: 18px; font-weight: 600; color: #2C3E50; margin-bottom: 16px; }
    .tools { display: inline-block; background: #E8F8F2; color: #059669; padding: 4px 12px; border-radius: 16px; font-size: 13px; margin-right: 4px; }
    .transcript { background: #f5f5f5; padding: 16px; border-radius: 8px; font-size: 13px; color: #666; margin-top: 24px; white-space: pre-wrap; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>KINN:RAUS Use Case</h1>
    <div class="meta">${timestamp} | ${inputMode === 'voice' ? 'Voice' : 'Text'} | ${region} | ${visibility}${userEmail ? ` | ${userEmail}` : ''}</div>
  </div>

  <div class="headline">${e.headline || '—'}</div>

  <div class="section">
    <div class="label">Problem</div>
    <div class="value">${e.problem || '—'}</div>
  </div>

  <div class="section">
    <div class="label">Lösung</div>
    <div class="value">${e.solution || '—'}</div>
  </div>

  <div class="section">
    <div class="label">Ergebnis</div>
    <div class="value">${e.result || '—'}</div>
  </div>

  <div class="section">
    <div class="label">KI-Tools</div>
    <div class="value">${tools}</div>
  </div>

  <div class="section">
    <div class="label">Branche</div>
    <div class="value">${e.industry || '—'}</div>
  </div>

  <div class="section">
    <div class="label">Konfidenz</div>
    <div class="value">${Math.round((e.confidence || 0) * 100)}%</div>
  </div>

  ${transcript ? `
  <div class="transcript">
    <div class="label" style="margin-bottom: 8px;">Original ${inputMode === 'voice' ? 'Transkript' : 'Text'}</div>
    ${transcript}
  </div>
  ` : ''}

  <div class="footer">
    ID: ${id}
  </div>
</body>
</html>
  `.trim();
}
