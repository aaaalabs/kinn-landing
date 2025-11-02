/**
 * Migration Script: Redis Schema v2.0 → v2.1
 *
 * Changes:
 * - xp:* → level:* (more professional, less gaming-associated)
 * - status:* → work:* (more precise, avoids namespace collision)
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

// All possible values for experience and availability
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'lead'];
const WORK_TYPES = ['employed', 'freelancer', 'student', 'between-jobs', 'side-projects'];

async function migrate() {
  console.log('🔄 Starting Redis Schema v2.1 Migration...\n');
  console.log('Changes:');
  console.log('  xp:* → level:* (professional naming)');
  console.log('  status:* → work:* (precise naming)\n');

  let movedCount = 0;
  let deletedCount = 0;

  // 1. Migrate experience levels (xp → level)
  console.log('📊 Migrating experience levels (xp → level)...');
  for (const level of EXPERIENCE_LEVELS) {
    const oldKey = `xp:${level}`;
    const newKey = `level:${level}`;

    try {
      // Get members from old key
      const members = await redis.smembers(oldKey);

      if (members && members.length > 0) {
        console.log(`  ${oldKey}: ${members.length} members`);

        // Add to new key
        for (const member of members) {
          await redis.sadd(newKey, member);
        }

        // Delete old key
        await redis.del(oldKey);

        console.log(`  ✅ Moved to ${newKey}`);
        movedCount += members.length;
        deletedCount++;
      } else {
        console.log(`  ⚪ ${oldKey}: empty or not found`);
      }
    } catch (error) {
      console.log(`  ❌ Error migrating ${oldKey}:`, error.message);
    }
  }

  console.log('');

  // 2. Migrate work status (status → work)
  console.log('💼 Migrating work status (status → work)...');
  for (const type of WORK_TYPES) {
    const oldKey = `status:${type}`;
    const newKey = `work:${type}`;

    try {
      // Get members from old key
      const members = await redis.smembers(oldKey);

      if (members && members.length > 0) {
        console.log(`  ${oldKey}: ${members.length} members`);

        // Add to new key
        for (const member of members) {
          await redis.sadd(newKey, member);
        }

        // Delete old key
        await redis.del(oldKey);

        console.log(`  ✅ Moved to ${newKey}`);
        movedCount += members.length;
        deletedCount++;
      } else {
        console.log(`  ⚪ ${oldKey}: empty or not found`);
      }
    } catch (error) {
      console.log(`  ❌ Error migrating ${oldKey}:`, error.message);
    }
  }

  console.log('');

  // 3. Verify new keys
  console.log('🔍 Verifying new schema...');

  const verifyStats = {
    level: {},
    work: {}
  };

  for (const level of EXPERIENCE_LEVELS) {
    const count = await redis.scard(`level:${level}`);
    if (count > 0) {
      verifyStats.level[level] = count;
      console.log(`  ✅ level:${level} → ${count} members`);
    }
  }

  for (const type of WORK_TYPES) {
    const count = await redis.scard(`work:${type}`);
    if (count > 0) {
      verifyStats.work[type] = count;
      console.log(`  ✅ work:${type} → ${count} members`);
    }
  }

  console.log('');
  console.log('✨ Migration Complete!');
  console.log(`   Members migrated: ${movedCount}`);
  console.log(`   Old keys deleted: ${deletedCount}`);
  console.log('');
  console.log('📊 New Schema Stats:');
  console.log('   Experience:', JSON.stringify(verifyStats.level, null, 2));
  console.log('   Work Status:', JSON.stringify(verifyStats.work, null, 2));
  console.log('');
  console.log('🎉 Redis Schema v2.1 is now live!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
