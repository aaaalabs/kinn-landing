#!/usr/bin/env node

/**
 * Script to replace console.log/error statements with logger utility
 * in all radar API files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const radarFiles = [
  'api/radar/verify-token.js',
  'api/radar/check-sites.js',
  'api/radar/extract-firecrawl.js',
  'api/radar/cleanup-redis-duplicates.js',
  'api/radar/run-all-extractions.js',
  'api/radar/list-sheets.js',
  'api/radar/update-info-sheet.js',
  'api/radar/sync-events-to-sheets.js',
  'api/radar/cleanup-cron.js',
  'api/radar/cleanup.js',
  'api/radar/update-sources.js',
  'api/radar/extract-dynamic.js',
  'api/radar/extract-with-config.js',
  'api/radar/check-sites-advanced.js',
  'api/radar/debug-source.js',
  'api/radar/test-single-source.js',
  'api/radar/inbound.js',
  'api/radar/update-info.js',
  'api/radar/sheets-sync.js.OLD_DISABLED',
  'api/radar/calendar.ics.js',
  'api/radar/debug.js',
  'api/radar/health.js'
];

let totalReplacements = 0;
let filesUpdated = 0;

for (const file of radarFiles) {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Check if logger is already imported
  const hasLoggerImport = content.includes("import logger from '../../lib/logger.js'") ||
                          content.includes('import logger from "../../lib/logger.js"');

  // Add logger import if not present (after other imports)
  if (!hasLoggerImport && (content.includes('console.log') || content.includes('console.error'))) {
    // Find the last import statement
    const importMatches = content.match(/^import .* from .*;$/gm);
    if (importMatches && importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      content = content.slice(0, insertPosition) +
                "\nimport logger from '../../lib/logger.js';" +
                content.slice(insertPosition);
    } else {
      // No imports found, add at the beginning
      content = "import logger from '../../lib/logger.js';\n\n" + content;
    }
  }

  // Count replacements
  let replacements = 0;

  // Replace console.log statements
  // Match various patterns of console.log
  content = content.replace(/console\.log\s*\(/g, () => {
    replacements++;
    return 'logger.debug(';
  });

  // Replace console.error statements
  content = content.replace(/console\.error\s*\(/g, () => {
    replacements++;
    return 'logger.error(';
  });

  // Replace console.warn statements
  content = content.replace(/console\.warn\s*\(/g, () => {
    replacements++;
    return 'logger.warn(';
  });

  // Replace console.info statements
  content = content.replace(/console\.info\s*\(/g, () => {
    replacements++;
    return 'logger.info(';
  });

  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file} - ${replacements} replacements`);
    totalReplacements += replacements;
    filesUpdated++;
  } else {
    console.log(`⏭️  No changes needed in ${file}`);
  }
}

console.log('\n📊 Summary:');
console.log(`Files updated: ${filesUpdated}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\n✨ Console log cleanup complete!');