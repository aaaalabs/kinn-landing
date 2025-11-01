#!/usr/bin/env node
/**
 * PWA Screenshot Generator
 *
 * Generates screenshots for PWA manifest using Playwright
 * - Wide format (1280x720) for desktop/tablet
 * - Narrow format (540x720) for mobile
 *
 * [CP01] KISS: Simple screenshot capture without complex UI manipulation
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_URL = process.env.SCREENSHOT_URL || 'https://kinn.at';
const OUTPUT_DIR = join(__dirname, '..', 'public');

async function generateScreenshots() {
  console.log('[PWA Screenshots] Starting generation...');
  console.log(`[PWA Screenshots] Target URL: ${TARGET_URL}`);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Generate wide screenshot (1280x720) - Desktop/Tablet landscape
    console.log('[PWA Screenshots] Generating wide screenshot (1280x720)...');
    const wideContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });

    const widePage = await wideContext.newPage();
    await widePage.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // Wait for content to be visible
    await widePage.waitForTimeout(1000);

    await widePage.screenshot({
      path: join(OUTPUT_DIR, 'screenshot-wide.png'),
      fullPage: false,
    });

    console.log('[PWA Screenshots] ✅ Wide screenshot saved: screenshot-wide.png');
    await wideContext.close();

    // Generate narrow screenshot (540x720) - Mobile portrait
    console.log('[PWA Screenshots] Generating narrow screenshot (540x720)...');
    const narrowContext = await browser.newContext({
      viewport: { width: 540, height: 720 },
      deviceScaleFactor: 2, // Higher DPI for mobile
    });

    const narrowPage = await narrowContext.newPage();
    await narrowPage.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // Wait for content to be visible
    await narrowPage.waitForTimeout(1000);

    await narrowPage.screenshot({
      path: join(OUTPUT_DIR, 'screenshot-narrow.png'),
      fullPage: false,
    });

    console.log('[PWA Screenshots] ✅ Narrow screenshot saved: screenshot-narrow.png');
    await narrowContext.close();

    console.log('[PWA Screenshots] 🎉 All screenshots generated successfully!');

  } catch (error) {
    console.error('[PWA Screenshots] ❌ Error generating screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the script
generateScreenshots();
