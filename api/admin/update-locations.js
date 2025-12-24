import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import logger from '../../lib/logger.js';

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);

  // Accept ADMIN_PASSWORD or RADAR_ADMIN_TOKEN
  const validTokens = [
    process.env.ADMIN_PASSWORD,
    process.env.RADAR_ADMIN_TOKEN
  ].filter(Boolean);

  for (const validToken of validTokens) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(validToken))) {
        return true;
      }
    } catch { /* ignore */ }
  }

  return false;
}

// Location updates extracted from detail pages (Dec 2025)
const locationUpdates = [
  {
    titleMatch: 'bots in szene setzen',
    location: 'Hörsaal 5¾',
    address: 'Innrain 52, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    titleMatch: 'stammtisch: praxislabor ki in der medizin',
    location: 'Health Hub, Raum M1.4',
    address: 'Exlgasse 24, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    titleMatch: 'kooperation für souveräne ki',
    location: 'IKB-Smart-City-Lab',
    address: 'Langer Weg 32, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    titleMatch: 't[ai]rol',
    location: 'Health Hub Tirol im Westpark',
    address: 'Exlgasse 24, 6020 Innsbruck',
    city: 'Innsbruck'
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const eventIds = await kv.smembers('radar:events');
    logger.info(`Checking ${eventIds.length} events for missing locations`);

    const updates = [];

    for (const id of eventIds) {
      const event = await kv.hgetall(`radar:event:${id}`);
      if (!event || !event.title) continue;

      const titleLower = event.title.toLowerCase();

      for (const update of locationUpdates) {
        if (titleLower.includes(update.titleMatch)) {
          const oldLocation = event.location || 'Not specified';

          await kv.hset(`radar:event:${id}`, {
            location: update.location,
            address: update.address,
            city: update.city
          });

          updates.push({
            id,
            title: event.title,
            oldLocation,
            newLocation: update.location,
            newAddress: update.address
          });

          logger.info(`Updated location for: ${event.title}`);
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Updated ${updates.length} event locations`,
      updates
    });

  } catch (error) {
    logger.error('Error updating locations:', error);
    return res.status(500).json({ error: 'Failed to update locations' });
  }
}
