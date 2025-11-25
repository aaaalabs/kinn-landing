import { Resend } from 'resend';
import { render } from '@react-email/render';
import ProfileWalkthrough from '../../emails/profile-walkthrough';
import { generateAuthToken } from '../utils/tokens.js';
import { getAllSubscribers, getProfile, getUserPreferences } from '../utils/redis.js';
import { enforceRateLimit } from '../utils/rate-limiter.js';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Admin API: Send Profile Walkthrough Newsletter
 * POST /api/newsletter/send
 *
 * Sends educational newsletter about Profile feature to subscribers
 * who haven't filled out their profile yet.
 *
 * Body: {
 *   testMode?: boolean,    // If true, doesn't send emails (dry run)
 *   limit?: number,        // Limit recipients (for gradual rollout)
 *   filter?: string        // 'all' | 'incomplete' | 'no-profile'
 * }
 *
 * Authentication: Bearer token via ADMIN_PASSWORD env var
 */

/**
 * Verify admin password using timing-safe comparison
 */
function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[NEWSLETTER] ADMIN_PASSWORD not set');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const tokenBuffer = Buffer.from(token);
    const passwordBuffer = Buffer.from(adminPassword);

    if (tokenBuffer.length !== passwordBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, passwordBuffer);
  } catch (error) {
    console.error('[NEWSLETTER] Auth error:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  // Rate limiting: 2 requests per hour (strict for bulk sending)
  const rateLimitAllowed = await enforceRateLimit(req, res, {
    maxRequests: 2,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'ratelimit:newsletter:send'
  });

  if (!rateLimitAllowed) {
    return; // Response already sent by enforceRateLimit
  }

  // Verify authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing admin password'
    });
  }

  try {
    const {
      testMode = false,
      limit,
      filter = 'incomplete'
    } = req.body;

    console.log('[NEWSLETTER] Starting send job:', { testMode, limit, filter });

    // Get all subscribers
    const allSubscribers = await getAllSubscribers();
    console.log('[NEWSLETTER] Total subscribers:', allSubscribers.length);

    // Filter eligible recipients
    const eligibleSubscribers = [];

    for (const email of allSubscribers) {
      try {
        // Check user preferences
        const preferences = await getUserPreferences(email);

        // Skip if notifications disabled
        if (preferences?.notifications?.enabled === false) {
          console.log('[NEWSLETTER] Skipped (notifications off):', email);
          continue;
        }

        // Get full profile
        const profile = await getProfile(email);

        // Apply filter
        if (filter === 'incomplete') {
          // Skip if profile is complete (has skills or demand filled)
          if (profile?.supply?.skills?.length > 0 || profile?.demand?.seeking?.length > 0) {
            console.log('[NEWSLETTER] Skipped (profile complete):', email);
            continue;
          }
        } else if (filter === 'no-profile') {
          // Only send to users with NO profile at all
          if (profile) {
            console.log('[NEWSLETTER] Skipped (has profile):', email);
            continue;
          }
        }
        // filter === 'all': no additional filtering

        eligibleSubscribers.push({
          email,
          name: profile?.identity?.name || email.split('@')[0],
          profile
        });

      } catch (error) {
        console.error('[NEWSLETTER] Error checking eligibility for', email, ':', error.message);
        // Skip this user on error
      }
    }

    console.log('[NEWSLETTER] Eligible recipients:', eligibleSubscribers.length);

    // Apply limit if specified
    const recipients = limit
      ? eligibleSubscribers.slice(0, limit)
      : eligibleSubscribers;

    console.log('[NEWSLETTER] Will send to:', recipients.length);

    // Stats tracking
    const stats = {
      total: allSubscribers.length,
      eligible: eligibleSubscribers.length,
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send in batches of 10 (Resend rate limit)
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);

      await Promise.all(
        batch.map(async ({ email, name }) => {
          try {
            // Generate URLs with magic link token
            const authToken = generateAuthToken(email);
            const baseUrl = process.env.BASE_URL || 'https://kinn.at';
            const profileUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=profil`;
            const unsubscribeUrl = `${baseUrl}/api/auth/login?token=${encodeURIComponent(authToken)}&redirect=settings`;

            // Render React component to HTML (new async API in v5)
            const html = await render(
              ProfileWalkthrough({
                name,
                profileUrl,
                unsubscribeUrl
              })
            );

            // Send email (unless test mode)
            if (!testMode) {
              await resend.emails.send({
                from: process.env.SENDER_EMAIL || 'Thomas @ KINN <thomas@kinn.at>',
                to: email,
                subject: 'KINN Profil: Supply & Demand Matching in 5 Minuten',
                html,
                headers: {
                  'List-Unsubscribe': `<mailto:thomas@kinn.at?subject=Abmelden>, <${unsubscribeUrl}>`,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                },
                tags: [
                  { name: 'type', value: 'newsletter' },
                  { name: 'campaign', value: 'profile-walkthrough' }
                ]
              });
            }

            stats.sent++;
            console.log(`[NEWSLETTER] ${testMode ? '[TEST]' : 'Sent to'} ${email}`);

          } catch (error) {
            stats.failed++;
            stats.errors.push({ email, error: error.message });
            console.error(`[NEWSLETTER] Failed for ${email}:`, error.message);
          }
        })
      );

      // Rate limiting: wait 1 second between batches
      if (i + 10 < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('[NEWSLETTER] Send job complete:', stats);

    return res.status(200).json({
      success: true,
      message: testMode ? 'Test mode - no emails sent' : 'Newsletter sent successfully',
      stats
    });

  } catch (error) {
    console.error('[NEWSLETTER] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
