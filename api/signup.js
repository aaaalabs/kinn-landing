import { Resend } from 'resend';
import { render } from '@react-email/render';
import OptInEmail from '../emails/opt-in.jsx';
import { generateConfirmToken } from './utils/tokens.js';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Serverless function to handle signup email via Resend API
 *
 * [CP01] KISS: Simple request/response pattern
 * [EH02] User-friendly error messages
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    // [SC02] Validate input
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email address is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // [EH01] Log for debugging (without sensitive data)
    console.log(`[SIGNUP] Processing request for domain: ${email.split('@')[1]}`);

    // Generate confirmation token (48h expiry)
    const confirmToken = generateConfirmToken(email);
    const confirmUrl = `${process.env.BASE_URL || 'https://kinn.at'}/api/confirm?token=${confirmToken}`;

    // Render React Email template to HTML
    const optInHtml = render(OptInEmail({ confirmUrl }));

    // Send TWO emails in parallel for speed
    const [adminEmail, userEmail] = await Promise.all([
      // 1. Admin notification to treff@in.kinn.at
      resend.emails.send({
        from: process.env.SENDER_EMAIL || 'KINN <noreply@in.kinn.at>',
        to: process.env.RECIPIENT_EMAIL || 'treff@in.kinn.at',
        subject: 'Neue Anmeldung: KI Treff Verteiler',
        html: `
          <h2>Neue Anmeldung für den KI Treff Verteiler</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-AT', {
            timeZone: 'Europe/Vienna'
          })}</p>
          <p><strong>Status:</strong> Wartet auf Bestätigung</p>
          <hr>
          <p><em>Automatisch generiert von in.kinn.at</em></p>
        `,
      }),

      // 2. Opt-in confirmation to user with React Email template
      resend.emails.send({
        from: process.env.SENDER_EMAIL || 'KINN <noreply@in.kinn.at>',
        to: email,
        subject: 'Bestätige deine Anmeldung zum KINN KI Treff',
        html: optInHtml,
      }),
    ]);

    // [EH01] Log success
    console.log(`[SIGNUP] Dual emails sent - Admin: ${adminEmail.id}, User: ${userEmail.id}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Anmeldung erfolgreich! Check deine Inbox für die Bestätigung.',
      emailIds: {
        admin: adminEmail.id,
        user: userEmail.id,
      }
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[SIGNUP] Error sending email:', {
      message: error.message,
      name: error.name,
      // Don't log full stack trace in production
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    // NO FALLBACKS - fail fast as per CLAUDE.md
    return res.status(500).json({
      error: 'Email delivery failed',
      message: 'Die Anmeldung konnte nicht verarbeitet werden. Bitte versuche es später erneut.',
      // Include error details in dev mode only
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
