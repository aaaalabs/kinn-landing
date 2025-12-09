#!/usr/bin/env node

/**
 * Script to update extraction endpoints to use new status schema
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const files = [
  '../api/radar/inbound.js',
  '../api/radar/check-sites-advanced.js',
  '../api/radar/extract-with-config.js',
  '../api/radar/extract-dynamic.js',
  '../api/radar/check-sites.js'
];

async function updateFile(filepath) {
  try {
    const fullPath = join(__dirname, filepath);
    let content = await readFile(fullPath, 'utf-8');

    // Check if file needs updating
    if (!content.includes('reviewed: false')) {
      console.log(`⏭️  ${filepath} already updated`);
      return false;
    }

    // Check if file already imports createPendingEvent
    const hasImport = content.includes('radar-status.js');

    if (!hasImport) {
      // Add import after logger import
      content = content.replace(
        /import logger from '\.\.\/\.\.\/lib\/logger\.js';/,
        `import logger from '../../lib/logger.js';
import { createPendingEvent } from '../../lib/radar-status.js';`
      );
    }

    // Replace reviewed: false with status: 'pending'
    content = content.replace(/reviewed: false/g, "status: 'pending'");

    // For event creation patterns, wrap with createPendingEvent if not already
    // This is a simple pattern - may need manual review for complex cases
    if (!content.includes('createPendingEvent')) {
      // Pattern 1: const eventData = { ... }
      content = content.replace(
        /const eventData = \{([^}]+)\};/g,
        (match, props) => {
          if (props.includes("status: 'pending'")) {
            return `const eventData = createPendingEvent({${props}});`;
          }
          return match;
        }
      );

      // Pattern 2: Direct object in hset
      content = content.replace(
        /await kv\.hset\(`radar:event:\$\{[^}]+\}`, \{([^}]+status: 'pending'[^}]+)\}\)/g,
        (match, props) => {
          return `await kv.hset(\`radar:event:\${eventId}\`, createPendingEvent({${props}}))`;
        }
      );
    }

    await writeFile(fullPath, content, 'utf-8');
    console.log(`✅ Updated ${filepath}`);
    return true;

  } catch (error) {
    console.error(`❌ Error updating ${filepath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📝 Updating extraction endpoints to use new status schema...\n');

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const result = await updateFile(file);
    if (result === true) updatedCount++;
    else if (result === false) skippedCount++;
    else errorCount++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Update Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Updated: ${updatedCount} files`);
  console.log(`⏭️  Skipped: ${skippedCount} files (already updated)`);
  console.log(`❌ Errors: ${errorCount} files`);
  console.log('='.repeat(50));

  if (updatedCount > 0) {
    console.log('\n⚠️  Please review the updated files to ensure correct implementation!');
    console.log('Some complex patterns may need manual adjustment.');
  }
}

main().catch(console.error);