#!/usr/bin/env node

/**
 * Script to set status: "pending" for all events that don't have a status field
 * This completes the migration to the new schema
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

async function setPendingStatus() {
  console.log('📝 Setting status: "pending" for all events without status field...\n');

  try {
    // Get all event IDs
    const eventIds = await kv.smembers('radar:events');
    console.log(`Found ${eventIds.length} total events to check\n`);

    let updatedCount = 0;
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

        // Check if event already has status field
        if (event.status) {
          console.log(`⏭️  Event "${event.title || id}" already has status: ${event.status}`);
          skippedCount++;
        } else {
          // Set status to pending
          console.log(`📝 Event: ${event.title || id}`);
          console.log(`   Setting status: "pending"`);

          await kv.hset(eventKey, {
            status: 'pending',
            statusUpdatedAt: new Date().toISOString()
          });

          console.log(`   ✅ Status set\n`);
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing event ${id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Status Update Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Updated: ${updatedCount} events (set to pending)`);
    console.log(`⏭️  Skipped: ${skippedCount} events (already have status)`);
    console.log(`❌ Errors: ${errorCount} events`);
    console.log(`📁 Total: ${eventIds.length} events`);
    console.log('='.repeat(50));

    if (updatedCount > 0) {
      console.log('\n🎉 Status field successfully set for all events!');
    } else if (skippedCount === eventIds.length) {
      console.log('\n✨ All events already have status field set!');
    }

  } catch (error) {
    console.error('\n❌ Status update failed:', error);
    process.exit(1);
  }
}

// Run update
console.log('KINN Radar Events - Set Pending Status');
console.log('=' .repeat(50));
console.log('This will set status: "pending" for all events without a status field.\n');

setPendingStatus()
  .then(() => {
    console.log('\n✨ Status update complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Status update failed:', error);
    process.exit(1);
  });