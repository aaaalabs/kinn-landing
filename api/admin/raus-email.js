/**
 * POST /api/admin/raus-email
 *
 * Send verification request email to submitter
 *
 * Body: { id, type: 'verification' | 'verified' | 'rejected' }
 */

import { Redis } from '@upstash/redis';
import { Resend } from 'resend';
import { isAuthenticated } from '../utils/auth.js';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED_ORIGINS = [
  'https://kinn.at',
  'https://www.kinn.at',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8000', 'http://localhost:3000'] : [])
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  return {};
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id, type } = req.body;

    if (!id || !type) {
      return res.status(400).json({ error: 'Missing id or type' });
    }

    // Get submission
    const submissions = await redis.lrange('raus:submissions', 0, -1);
    const parsed = submissions.map(s => typeof s === 'string' ? JSON.parse(s) : s);
    const submission = parsed.find(s => s.id === id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (!submission.userEmail) {
      return res.status(400).json({ error: 'Submission has no email' });
    }

    const e = submission.extracted || {};
    let emailResult;

    switch (type) {
      case 'verification':
        emailResult = await resend.emails.send({
          from: 'KINN <noreply@kinn.at>',
          to: submission.userEmail,
          subject: `Dein Use Case braucht eine Referenz`,
          html: buildVerificationEmail(e, submission.id)
        });
        break;

      case 'verified':
        emailResult = await resend.emails.send({
          from: 'KINN <noreply@kinn.at>',
          to: submission.userEmail,
          subject: `Dein Use Case wurde verifiziert!`,
          html: buildVerifiedEmail(e)
        });
        break;

      case 'rejected':
        emailResult = await resend.emails.send({
          from: 'KINN <noreply@kinn.at>',
          to: submission.userEmail,
          subject: `Zu deinem Use Case`,
          html: buildRejectedEmail(e)
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    return res.status(200).json({ success: true, emailId: emailResult.data?.id });

  } catch (error) {
    console.error('[RAUS Email] Error:', error);
    return res.status(500).json({ error: 'Email failed', message: error.message });
  }
}

function buildVerificationEmail(e, id) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #2C3E50; max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; }
    .header p { font-size: 14px; color: #6B6B6B; margin: 0; }
    .card { background: #F8FAFC; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .card h2 { font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1F2937; }
    .card p { font-size: 14px; margin: 0; color: #374151; }
    .cta { margin: 24px 0; }
    .cta p { font-size: 14px; color: #374151; margin-bottom: 16px; }
    .cta ul { margin: 0; padding-left: 20px; }
    .cta li { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .button { display: inline-block; background: #5ED9A6; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Fast geschafft!</h1>
    <p>Dein Use Case braucht noch eine Referenz zur Verifizierung.</p>
  </div>

  <div class="card">
    <h2>${e.headline || 'Dein Use Case'}</h2>
    <p>${e.problem ? e.problem.substring(0, 100) + '...' : ''}</p>
  </div>

  <div class="cta">
    <p>Um deinen Case im KI Praxis Report Tirol 2026 zu publizieren, brauchen wir eine Referenz-Person, die bestätigen kann, dass der Use Case echt ist.</p>
    <p><strong>Bitte antworte auf diese Email mit:</strong></p>
    <ul>
      <li>Name der Referenzperson</li>
      <li>Position/Rolle</li>
      <li>E-Mail oder Telefonnummer</li>
    </ul>
  </div>

  <p style="font-size: 14px; color: #374151;">
    <a href="mailto:kontakt@kinn.at?subject=Referenz%20für%20Use%20Case%20${id}" class="button">Referenz angeben</a>
  </p>

  <div class="footer">
    <p>KINN - KI Treff Innsbruck</p>
    <p>Bei Fragen: <a href="mailto:kontakt@kinn.at" style="color: #5ED9A6;">kontakt@kinn.at</a></p>
  </div>
</body>
</html>
  `.trim();
}

function buildVerifiedEmail(e) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #2C3E50; max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; color: #059669; }
    .header p { font-size: 14px; color: #6B6B6B; margin: 0; }
    .card { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .card h2 { font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #065F46; }
    .card p { font-size: 14px; margin: 0; color: #047857; }
    .content p { font-size: 14px; color: #374151; margin-bottom: 16px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Verifiziert!</h1>
    <p>Dein Use Case ist jetzt Teil des KI Praxis Report Tirol 2026.</p>
  </div>

  <div class="card">
    <h2>${e.headline || 'Dein Use Case'}</h2>
    <p>Status: Verifiziert</p>
  </div>

  <div class="content">
    <p>Danke, dass du deinen Use Case mit der Community geteilt hast! Dein Case wird im Report publiziert, sobald wir 50 verifizierte Cases gesammelt haben.</p>
    <p>Du bekommst eine Benachrichtigung, sobald der Report live geht.</p>
  </div>

  <div class="footer">
    <p>KINN - KI Treff Innsbruck</p>
    <p>Bei Fragen: <a href="mailto:kontakt@kinn.at" style="color: #5ED9A6;">kontakt@kinn.at</a></p>
  </div>
</body>
</html>
  `.trim();
}

function buildRejectedEmail(e) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #2C3E50; max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; }
    .header p { font-size: 14px; color: #6B6B6B; margin: 0; }
    .card { background: #F8FAFC; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .card h2 { font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1F2937; }
    .content p { font-size: 14px; color: #374151; margin-bottom: 16px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Zu deinem Use Case</h1>
    <p>Leider konnten wir deinen Case nicht verifizieren.</p>
  </div>

  <div class="card">
    <h2>${e.headline || 'Dein Use Case'}</h2>
  </div>

  <div class="content">
    <p>Dein eingereichter Use Case konnte nicht für den KI Praxis Report verifiziert werden. Das kann verschiedene Gründe haben:</p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #374151;">
      <li>Die Referenz konnte nicht bestätigt werden</li>
      <li>Der Case erfüllt nicht die Kriterien</li>
      <li>Unvollständige Angaben</li>
    </ul>
    <p>Du kannst jederzeit einen neuen Use Case einreichen oder dich bei uns melden, wenn du Fragen hast.</p>
  </div>

  <div class="footer">
    <p>KINN - KI Treff Innsbruck</p>
    <p>Bei Fragen: <a href="mailto:kontakt@kinn.at" style="color: #5ED9A6;">kontakt@kinn.at</a></p>
  </div>
</body>
</html>
  `.trim();
}
