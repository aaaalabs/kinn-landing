/**
 * Playwright Screenshot Script
 * Creates a 1200x630 OG image with centered KINN logo
 *
 * Usage:
 *   npm install -D playwright
 *   node scripts/screenshot-logo.js
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureLogoScreenshot() {
  console.log('🚀 Starting Playwright screenshot capture...');

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 }
  });
  const page = await context.newPage();

  // Navigate to logo page
  const logoPagePath = path.join(__dirname, '../pages/logo.html');
  const fileUrl = `file://${logoPagePath}`;

  console.log(`📄 Loading page: ${fileUrl}`);
  await page.goto(fileUrl);

  // Wait for fonts and rendering
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath = path.join(__dirname, '../public/og-image.png');

  // Ensure public directory exists
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`📸 Taking screenshot...`);
  await page.screenshot({
    path: screenshotPath,
    type: 'png'
  });

  console.log(`✅ Screenshot saved: ${screenshotPath}`);

  // Also create different sizes for manifest
  const sizes = [
    { width: 192, height: 192, name: 'icon-192.png' },
    { width: 512, height: 512, name: 'icon-512.png' },
    { width: 1200, height: 630, name: 'og-image.png' }
  ];

  for (const size of sizes) {
    await context.setViewportSize({ width: size.width, height: size.height });
    const outputPath = path.join(publicDir, size.name);
    await page.screenshot({
      path: outputPath,
      type: 'png'
    });
    console.log(`✅ Created ${size.name} (${size.width}x${size.height})`);
  }

  await browser.close();
  console.log('🎉 Done! Screenshots created in /public directory');
}

captureLogoScreenshot().catch(console.error);
