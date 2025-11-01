#!/usr/bin/env node
/**
 * Font Comparison Screenshot Generator
 *
 * Generates side-by-side screenshots of font options
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_URL = 'file://' + join(__dirname, '..', 'font-comparison.html');
const OUTPUT_DIR = join(__dirname, '..');

async function generateComparison() {
  console.log('[Font Comparison] Starting generation...');
  console.log(`[Font Comparison] Target: ${TARGET_URL}`);

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 1200 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // Wait for fonts to load
    await page.waitForTimeout(2000);

    // Full page screenshot
    await page.screenshot({
      path: join(OUTPUT_DIR, 'font-comparison-full.png'),
      fullPage: true,
    });

    console.log('[Font Comparison] ✅ Full comparison saved: font-comparison-full.png');

    // Screenshot of just Option 1 (Bebas Neue)
    const option1 = await page.locator('.option-bebas');
    await option1.screenshot({
      path: join(OUTPUT_DIR, 'font-option-bebas.png'),
    });

    console.log('[Font Comparison] ✅ Bebas Neue option saved: font-option-bebas.png');

    // Screenshot of just Option 2 (Work Sans)
    const option2 = await page.locator('.option-work');
    await option2.screenshot({
      path: join(OUTPUT_DIR, 'font-option-work.png'),
    });

    console.log('[Font Comparison] ✅ Work Sans option saved: font-option-work.png');

    await context.close();
    console.log('[Font Comparison] 🎉 All screenshots generated!');

  } catch (error) {
    console.error('[Font Comparison] ❌ Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generateComparison();
