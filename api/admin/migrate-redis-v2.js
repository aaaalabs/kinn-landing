import { Redis } from '@upstash/redis';
import { updateReverseIndexes } from '../utils/redis.js';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

/**
 * Admin Endpoint: Migrate Redis Schema to v2
 * POST /api/admin/migrate-redis-v2
 *
 * Requires Bearer token (ADMIN_PASSWORD)
 */
export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    console.log('[MIGRATION] Starting Redis v2 migration...');

    // 1. Load all subscribers
    const subscribers = await redis.smembers('subscribers:confirmed');
    console.log(`[MIGRATION] Found ${subscribers.length} subscribers`);

    if (subscribers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subscribers to migrate',
        migrated: 0
      });
    }

    // 2. Migrate each profile
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const stats = {
      skills: new Set(),
      xp: { junior: 0, mid: 0, senior: 0, lead: 0 },
      status: {},
      loc: { tirol: 0, online: 0, all: 0 }
    };

    for (const email of subscribers) {
      try {
        // Load profile
        const profile = await redis.get(`profile:${email}`);

        if (!profile) {
          console.log(`[MIGRATION] No profile found for ${email}`);
          continue;
        }

        // Update indexes
        await updateReverseIndexes(email, profile);

        // Collect stats
        if (profile.supply?.skills) {
          profile.supply.skills.forEach(skill => stats.skills.add(skill));
        }
        if (profile.supply?.experience) {
          stats.xp[profile.supply.experience] = (stats.xp[profile.supply.experience] || 0) + 1;
        }
        if (profile.supply?.availability) {
          stats.status[profile.supply.availability] = (stats.status[profile.supply.availability] || 0) + 1;
        }
        if (profile.identity?.location) {
          const locMap = {
            'in-person': 'tirol', 'online': 'online', 'all': 'all',
            'ibk': 'tirol', 'tirol': 'tirol', 'remote': 'online', 'hybrid': 'all'
          };
          const loc = locMap[profile.identity.location.toLowerCase()];
          if (loc) {
            stats.loc[loc] = (stats.loc[loc] || 0) + 1;
          }
        }

        successCount++;

      } catch (error) {
        errorCount++;
        errors.push({ email, error: error.message });
        console.error(`[MIGRATION] Error migrating ${email}:`, error.message);
      }
    }

    // 3. Delete old indexes
    console.log('[MIGRATION] Deleting old indexes...');
    const oldKeys = [
      'supply:senior+',
      'demand:job', 'demand:freelance', 'demand:cofounder', 'demand:collaboration', 'demand:learning',
      'supply:mentoring', 'supply:code-review', 'supply:workshop', 'supply:projects',
      'location:ibk', 'location:tirol', 'location:remote', 'location:hybrid',
      'location:in-person', 'location:online', 'location:all'
    ];

    let deletedCount = 0;
    for (const key of oldKeys) {
      try {
        await redis.del(key);
        deletedCount++;
      } catch (error) {
        console.error(`[MIGRATION] Error deleting ${key}:`, error.message);
      }
    }

    console.log('[MIGRATION] Migration complete!');

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        total: subscribers.length,
        migrated: successCount,
        errors: errorCount,
        oldKeysDeleted: deletedCount
      },
      data: {
        skills: stats.skills.size,
        experience: stats.xp,
        status: stats.status,
        location: stats.loc
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message
    });
  }
}
