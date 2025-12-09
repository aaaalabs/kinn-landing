#!/usr/bin/env node

/**
 * Migration script: Convert dual-boolean approval schema to single status field
 *
 * Old schema:
 *   reviewed: true/false/"true"/"false"
 *   rejected: true/false/"true"/"false"/undefined
 *
 * New schema:
 *   status: "pending" | "approved" | "rejected"
 *
 * Migration is safe and idempotent - can be run multiple times
 */

import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.cyan}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    debug: `${colors.gray}[DEBUG]${colors.reset}`
  };

  console.log(`${prefix[type]} ${message}`);
}

/**
 * Determine new status based on old schema
 */
function determineStatus(event) {
  const isReviewed = event.reviewed === true || event.reviewed === 'true';
  const isRejected = event.rejected === true || event.rejected === 'true';

  if (isRejected) {
    return 'rejected';
  } else if (isReviewed) {
    return 'approved';
  } else {
    return 'pending';
  }
}

/**
 * Migrate a single event
 */
async function migrateEvent(eventId, dryRun = false) {
  try {
    const event = await kv.hgetall(`radar:event:${eventId}`);

    if (!event) {
      log(`Event ${eventId} not found`, 'warning');
      return null;
    }

    // Skip if already migrated
    if (event.status && !event.reviewed && !event.rejected) {
      log(`Event ${eventId} already migrated (status: ${event.status})`, 'debug');
      return { id: eventId, status: 'already_migrated', newStatus: event.status };
    }

    // Determine new status
    const oldReviewed = event.reviewed;
    const oldRejected = event.rejected;
    const newStatus = determineStatus(event);

    log(`Event ${eventId}: reviewed=${oldReviewed}, rejected=${oldRejected} → status=${newStatus}`, 'debug');

    if (!dryRun) {
      // Add new status field
      await kv.hset(`radar:event:${eventId}`, { status: newStatus });

      // Remove old fields
      await kv.hdel(`radar:event:${eventId}`, 'reviewed', 'rejected');

      // Keep audit fields if they exist
      if (event.reviewedAt && newStatus === 'approved') {
        await kv.hset(`radar:event:${eventId}`, { approvedAt: event.reviewedAt });
        await kv.hdel(`radar:event:${eventId}`, 'reviewedAt');
      }
      if (event.rejectedAt && newStatus === 'rejected') {
        // Keep rejectedAt as-is
      }
    }

    return {
      id: eventId,
      status: 'migrated',
      oldReviewed,
      oldRejected,
      newStatus
    };

  } catch (error) {
    log(`Error migrating event ${eventId}: ${error.message}`, 'error');
    return { id: eventId, status: 'error', error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrate(options = {}) {
  const { dryRun = false, limit = null } = options;

  log(`${colors.bright}Starting Redis Schema Migration${colors.reset}`, 'info');
  log(`Mode: ${dryRun ? colors.yellow + 'DRY RUN' : colors.green + 'LIVE'} ${colors.reset}`, 'info');

  try {
    // Get all event IDs
    const eventIds = await kv.smembers('radar:events');
    log(`Found ${eventIds.length} events to process`, 'info');

    const results = {
      total: eventIds.length,
      migrated: 0,
      already_migrated: 0,
      errors: 0,
      details: []
    };

    // Process events
    const eventsToProcess = limit ? eventIds.slice(0, limit) : eventIds;

    for (let i = 0; i < eventsToProcess.length; i++) {
      const eventId = eventsToProcess[i];

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        log(`Progress: ${i + 1}/${eventsToProcess.length}`, 'info');
      }

      const result = await migrateEvent(eventId, dryRun);

      if (result) {
        results.details.push(result);

        if (result.status === 'migrated') {
          results.migrated++;
        } else if (result.status === 'already_migrated') {
          results.already_migrated++;
        } else if (result.status === 'error') {
          results.errors++;
        }
      }
    }

    // Print summary
    console.log('\n' + colors.bright + '=== Migration Summary ===' + colors.reset);
    console.log(`${colors.green}✓ Migrated: ${results.migrated}${colors.reset}`);
    console.log(`${colors.cyan}⟲ Already Migrated: ${results.already_migrated}${colors.reset}`);
    console.log(`${colors.red}✗ Errors: ${results.errors}${colors.reset}`);
    console.log(`Total Processed: ${results.migrated + results.already_migrated + results.errors}/${results.total}`);

    // Show status distribution
    const statusCounts = {};
    for (const detail of results.details) {
      if (detail.newStatus || detail.status === 'already_migrated') {
        const status = detail.newStatus || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    }

    console.log('\n' + colors.bright + 'Status Distribution:' + colors.reset);
    for (const [status, count] of Object.entries(statusCounts)) {
      const color = status === 'approved' ? colors.green :
                   status === 'rejected' ? colors.red :
                   status === 'pending' ? colors.yellow :
                   colors.gray;
      console.log(`  ${color}${status}: ${count}${colors.reset}`);
    }

    if (dryRun) {
      console.log('\n' + colors.yellow + '⚠️  DRY RUN - No changes were made' + colors.reset);
      console.log('Run with --execute to apply changes');
    } else {
      console.log('\n' + colors.green + '✅ Migration completed successfully!' + colors.reset);
    }

    return results;

  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const limit = args.includes('--limit') ?
    parseInt(args[args.indexOf('--limit') + 1]) : null;

  if (args.includes('--help')) {
    console.log(`
${colors.bright}Redis Schema Migration Script${colors.reset}

Converts dual-boolean approval schema to single status field.

${colors.bright}Usage:${colors.reset}
  node migrate-radar-status.js [options]

${colors.bright}Options:${colors.reset}
  --execute      Apply changes (without this flag, runs in dry-run mode)
  --limit <n>    Process only first n events (for testing)
  --help         Show this help message

${colors.bright}Examples:${colors.reset}
  node migrate-radar-status.js              # Dry run - show what would change
  node migrate-radar-status.js --execute    # Apply migration
  node migrate-radar-status.js --limit 10   # Test with first 10 events
`);
    process.exit(0);
  }

  try {
    await migrate({ dryRun, limit });
    process.exit(0);
  } catch (error) {
    console.error(colors.red + 'Migration failed:' + colors.reset, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrate, determineStatus };