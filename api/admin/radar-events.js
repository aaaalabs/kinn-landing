import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[ADMIN] ADMIN_PASSWORD not configured');
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(adminPassword)
    );
  } catch (error) {
    console.error('[ADMIN] Auth error:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // List all radar events (both approved and pending)
    try {
      const eventIds = await kv.smembers('radar:events');
      const allEvents = [];
      const now = new Date();

      console.log(`[RADAR-ADMIN] Checking ${eventIds.length} radar events`);

      for (const id of eventIds) {
        const event = await kv.hgetall(`radar:event:${id}`);

        // Filter: not rejected and future events only
        if (event && event.rejected !== 'true') {
          const eventDate = new Date(event.date);
          if (eventDate >= now) {
            allEvents.push(event);
          }
        }
      }

      // Sort by date (closest first)
      allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      console.log(`[RADAR-ADMIN] Returning ${allEvents.length} events (approved and pending)`);

      return res.status(200).json({
        events: allEvents,
        total: allEvents.length,
        approved: allEvents.filter(e => e.approved === 'true').length,
        pending: allEvents.filter(e => !e.approved || e.approved === 'false').length
      });

    } catch (error) {
      console.error('[RADAR-ADMIN] Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

  } else if (req.method === 'POST') {
    // Approve/reject events
    const { action, eventIds } = req.body;

    if (!action || !eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    try {
      let updatedCount = 0;

      if (action === 'approve') {
        // Approve events
        for (const id of eventIds) {
          await kv.hset(`radar:event:${id}`, {
            approved: 'true',
            approvedAt: new Date().toISOString()
          });
          updatedCount++;
        }

        console.log(`[RADAR-ADMIN] Approved ${updatedCount} events`);

        return res.status(200).json({
          success: true,
          action: 'approve',
          message: `${updatedCount} Events freigegeben`,
          count: updatedCount
        });

      } else if (action === 'reject') {
        // Reject events
        for (const id of eventIds) {
          await kv.hset(`radar:event:${id}`, {
            approved: 'false',
            rejected: 'true',
            rejectedAt: new Date().toISOString()
          });
          updatedCount++;
        }

        console.log(`[RADAR-ADMIN] Rejected ${updatedCount} events`);

        return res.status(200).json({
          success: true,
          action: 'reject',
          message: `${updatedCount} Events abgelehnt`,
          count: updatedCount
        });

      } else {
        return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
      }

    } catch (error) {
      console.error('[RADAR-ADMIN] Error updating events:', error);
      return res.status(500).json({ error: 'Failed to update events' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}