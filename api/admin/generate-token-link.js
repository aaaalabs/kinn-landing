import { isAuthenticated } from '../utils/auth.js';
import { generateAuthToken } from '../utils/tokens.js';
import { getAllSubscribers, isSubscribed } from '../utils/redis.js';

/**
 * Generate Token Link(s) for Event Participants
 *
 * POST /api/admin/generate-token-link
 *
 * Body:
 * - email: string (single user)
 * - all: boolean (generate for all subscribers)
 * - redirect: string (where to redirect after login, e.g., 'profil')
 *
 * Returns magic login link(s) that redirect directly to the profile page
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  // Admin authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  try {
    const { email, all, redirect = 'profil' } = req.body;
    const baseUrl = process.env.BASE_URL || 'https://kinn.at';

    // Generate link for single user
    if (email && !all) {
      // Verify user exists
      const userIsSubscribed = await isSubscribed(email);
      if (!userIsSubscribed) {
        return res.status(404).json({
          success: false,
          message: `User ${email} not found in subscribers`
        });
      }

      const token = generateAuthToken(email);
      const link = `${baseUrl}/api/auth/login?token=${encodeURIComponent(token)}&redirect=${redirect}`;

      console.log(`[GENERATE-TOKEN-LINK] Generated link for ${email}`);

      return res.status(200).json({
        success: true,
        email,
        link
      });
    }

    // Generate links for all subscribers
    if (all) {
      const subscribers = await getAllSubscribers();

      if (!subscribers || subscribers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No subscribers found'
        });
      }

      const links = subscribers.map(subscriberEmail => {
        const token = generateAuthToken(subscriberEmail);
        const link = `${baseUrl}/api/auth/login?token=${encodeURIComponent(token)}&redirect=${redirect}`;
        return { email: subscriberEmail, link };
      });

      // Sort alphabetically by email
      links.sort((a, b) => a.email.localeCompare(b.email));

      console.log(`[GENERATE-TOKEN-LINK] Generated ${links.length} links for all subscribers`);

      return res.status(200).json({
        success: true,
        count: links.length,
        links
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Either "email" or "all: true" is required'
    });

  } catch (error) {
    console.error('[GENERATE-TOKEN-LINK] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
