/**
 * Migration Script: Redis Schema v2 (ULTRA-SIMPLE)
 *
 * Migrates all existing profiles to new index structure:
 * - skill:* (unchanged)
 * - xp:* (NEW - granular experience levels)
 * - status:* (NEW - availability status)
 * - loc:* (NEW - simplified locations)
 *
 * OLD indexes will be deleted manually after verification.
 */

import { Redis } from '@upstash/redis';
import { updateReverseIndexes } from '../api/utils/redis.js';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

async function migrate() {
  console.log('🚀 Starting Redis Schema v2 Migration...\n');

  try {
    // 1. Load all subscribers
    const subscribers = await redis.smembers('subscribers:confirmed');
    console.log(`📧 Found ${subscribers.length} subscribers\n`);

    if (subscribers.length === 0) {
      console.log('⚠️  No subscribers found. Nothing to migrate.');
      return;
    }

    // 2. Migrate each profile
    let successCount = 0;
    let errorCount = 0;
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
          console.log(`⚠️  No profile found for ${email}`);
          continue;
        }

        // Update indexes (writes to new structure)
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
            'in-person': 'tirol',
            'online': 'online',
            'all': 'all',
            'ibk': 'tirol',
            'tirol': 'tirol',
            'remote': 'online',
            'hybrid': 'all'
          };
          const loc = locMap[profile.identity.location.toLowerCase()];
          if (loc) {
            stats.loc[loc] = (stats.loc[loc] || 0) + 1;
          }
        }

        successCount++;
        process.stdout.write(`✅ Migrated ${successCount}/${subscribers.length}\r`);

      } catch (error) {
        errorCount++;
        console.log(`\n❌ Error migrating ${email}:`, error.message);
      }
    }

    console.log(`\n\n✨ Migration Complete!\n`);
    console.log(`📊 Statistics:`);
    console.log(`   Migrated: ${successCount}/${subscribers.length}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n   Skills: ${stats.skills.size} unique skills`);
    console.log(`   Experience:`);
    console.log(`     - Junior: ${stats.xp.junior || 0}`);
    console.log(`     - Mid: ${stats.xp.mid || 0}`);
    console.log(`     - Senior: ${stats.xp.senior || 0}`);
    console.log(`     - Lead: ${stats.xp.lead || 0}`);
    console.log(`   Status:`);
    Object.entries(stats.status).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });
    console.log(`   Location:`);
    console.log(`     - Tirol: ${stats.loc.tirol || 0}`);
    console.log(`     - Online: ${stats.loc.online || 0}`);
    console.log(`     - All: ${stats.loc.all || 0}`);

    console.log(`\n🗑️  Next Steps:`);
    console.log(`   1. Verify new indexes work correctly`);
    console.log(`   2. Delete old indexes manually:`);
    console.log(`      - supply:senior+`);
    console.log(`      - demand:*`);
    console.log(`      - supply:* (except supply:senior+ is already gone)`);
    console.log(`      - location:ibk, location:remote, location:hybrid`);
    console.log(`\n   Run: node scripts/cleanup-old-indexes.js`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
