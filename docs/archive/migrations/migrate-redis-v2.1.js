import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

// All possible values for experience and availability
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'lead'];
const WORK_TYPES = ['employed', 'freelancer', 'student', 'between-jobs', 'side-projects'];

/**
 * Admin Endpoint: Migrate Redis Schema v2.0 → v2.1
 * POST /api/admin/migrate-redis-v2.1
 *
 * Changes:
 * - xp:* → level:* (more professional naming)
 * - status:* → work:* (more precise naming)
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
    console.log('[MIGRATION v2.1] Starting Redis Schema v2.1 Migration...');

    let movedCount = 0;
    let deletedCount = 0;
    const errors = [];

    // 1. Migrate experience levels (xp → level)
    console.log('[MIGRATION v2.1] Migrating experience levels...');
    for (const level of EXPERIENCE_LEVELS) {
      const oldKey = `xp:${level}`;
      const newKey = `level:${level}`;

      try {
        const members = await redis.smembers(oldKey);

        if (members && members.length > 0) {
          console.log(`[MIGRATION v2.1] ${oldKey}: ${members.length} members`);

          // Add to new key
          for (const member of members) {
            await redis.sadd(newKey, member);
          }

          // Delete old key
          await redis.del(oldKey);

          console.log(`[MIGRATION v2.1] Moved to ${newKey}`);
          movedCount += members.length;
          deletedCount++;
        }
      } catch (error) {
        errors.push({ key: oldKey, error: error.message });
        console.error(`[MIGRATION v2.1] Error migrating ${oldKey}:`, error.message);
      }
    }

    // 2. Migrate work status (status → work)
    console.log('[MIGRATION v2.1] Migrating work status...');
    for (const type of WORK_TYPES) {
      const oldKey = `status:${type}`;
      const newKey = `work:${type}`;

      try {
        const members = await redis.smembers(oldKey);

        if (members && members.length > 0) {
          console.log(`[MIGRATION v2.1] ${oldKey}: ${members.length} members`);

          // Add to new key
          for (const member of members) {
            await redis.sadd(newKey, member);
          }

          // Delete old key
          await redis.del(oldKey);

          console.log(`[MIGRATION v2.1] Moved to ${newKey}`);
          movedCount += members.length;
          deletedCount++;
        }
      } catch (error) {
        errors.push({ key: oldKey, error: error.message });
        console.error(`[MIGRATION v2.1] Error migrating ${oldKey}:`, error.message);
      }
    }

    // 3. Verify new keys
    console.log('[MIGRATION v2.1] Verifying new schema...');

    const verifyStats = {
      level: {},
      work: {}
    };

    for (const level of EXPERIENCE_LEVELS) {
      const count = await redis.scard(`level:${level}`);
      if (count > 0) {
        verifyStats.level[level] = count;
      }
    }

    for (const type of WORK_TYPES) {
      const count = await redis.scard(`work:${type}`);
      if (count > 0) {
        verifyStats.work[type] = count;
      }
    }

    console.log('[MIGRATION v2.1] Migration complete!');

    return res.status(200).json({
      success: true,
      message: 'Migration v2.1 completed successfully',
      stats: {
        membersMigrated: movedCount,
        oldKeysDeleted: deletedCount
      },
      newSchema: {
        level: verifyStats.level,
        work: verifyStats.work
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[MIGRATION v2.1] Migration failed:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message
    });
  }
}
