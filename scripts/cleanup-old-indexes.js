/**
 * Cleanup Script: Delete old Redis indexes after v2 migration
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

const OLD_KEYS = [
  // Old experience
  'supply:senior+',

  // Old demand keys
  'demand:job',
  'demand:freelance',
  'demand:cofounder',
  'demand:collaboration',
  'demand:learning',

  // Old supply keys
  'supply:mentoring',
  'supply:code-review',
  'supply:workshop',
  'supply:projects',

  // Old location keys
  'location:ibk',
  'location:tirol',
  'location:remote',
  'location:hybrid',
  'location:in-person',
  'location:online',
  'location:all'
];

async function cleanup() {
  console.log('🗑️  Cleaning up old Redis indexes...\n');

  let deletedCount = 0;
  let notFoundCount = 0;

  for (const key of OLD_KEYS) {
    try {
      const result = await redis.del(key);
      if (result > 0) {
        console.log(`✅ Deleted: ${key}`);
        deletedCount++;
      } else {
        console.log(`⚪ Not found: ${key}`);
        notFoundCount++;
      }
    } catch (error) {
      console.log(`❌ Error deleting ${key}:`, error.message);
    }
  }

  console.log(`\n✨ Cleanup Complete!`);
  console.log(`   Deleted: ${deletedCount}`);
  console.log(`   Not found: ${notFoundCount}`);
  console.log(`\n🎉 Redis Schema v2 migration is complete!`);
}

cleanup();
