#!/usr/bin/env node

/**
 * Migration script to remove old schema fields from existing radar events
 * Removes: reviewed, rejected, reviewedAt, rejectedAt
 * Keeps: status, approvedAt, rejectedAt (new schema)
 */

import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Redis client
const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL || process.env.KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Fields to remove (old schema)
const OLD_FIELDS = ['reviewed', 'rejected', 'reviewedAt'];

async function cleanupOldSchema() {
  console.log('🧹 Starting cleanup of old schema fields...\n');

  try {
    // Get all event IDs
    const eventIds = await kv.smembers('radar:events');
    console.log(`Found ${eventIds.length} total events to check\n`);

    let cleanedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const id of eventIds) {
      try {
        const eventKey = `radar:event:${id}`;
        const event = await kv.hgetall(eventKey);

        if (!event) {
          console.log(`⚠️  Event ${id} not found`);
          skippedCount++;
          continue;
        }

        // Check if event has old fields
        const hasOldFields = OLD_FIELDS.some(field => event[field] !== undefined);

        if (hasOldFields) {
          console.log(`📝 Event: ${event.title || id}`);
          console.log(`   Status: ${event.status || 'not set'}`);

          // Log what we're removing
          const fieldsToRemove = OLD_FIELDS.filter(field => event[field] !== undefined);
          console.log(`   Removing fields: ${fieldsToRemove.join(', ')}`);

          // Remove old fields
          for (const field of fieldsToRemove) {
            await kv.hdel(eventKey, field);
          }

          console.log(`   ✅ Cleaned up\n`);
          cleanedCount++;
        } else {
          // Event already uses new schema only
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing event ${id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Cleaned: ${cleanedCount} events`);
    console.log(`⏭️  Skipped: ${skippedCount} events (already clean)`);
    console.log(`❌ Errors: ${errorCount} events`);
    console.log(`📁 Total: ${eventIds.length} events`);
    console.log('='.repeat(50));

    if (cleanedCount > 0) {
      console.log('\n🎉 Old schema fields successfully removed!');
    } else {
      console.log('\n✨ No events needed cleaning - all using new schema!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('KINN Radar Events - Old Schema Cleanup');
console.log('=' .repeat(50));
console.log('This will remove old boolean fields (reviewed, rejected, reviewedAt)');
console.log('and keep only the new status field schema.\n');

cleanupOldSchema()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });