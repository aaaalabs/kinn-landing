#!/usr/bin/env node

/**
 * Quick test script for Firecrawl API with InnCubator
 * Run with: node test-firecrawl-quick.js
 */

const FIRECRAWL_API_KEY = 'fc-c1c58558e52442819f890adeb5ea580a';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

async function testFirecrawl() {
  console.log('🔥 Testing Firecrawl with InnCubator...\n');

  try {
    // Test 1: Scrape InnCubator events page
    console.log('📡 Scraping https://www.inncubator.at/events');
    console.log('⏳ Waiting for JavaScript to render...\n');

    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.inncubator.at/events',
        formats: ['html', 'markdown'],
        waitFor: 5000, // Wait 5 seconds for Angular to load
        onlyMainContent: false,
        includeTags: ['article', 'div', 'section', 'main', 'h1', 'h2', 'h3', 'p', 'span', 'table']
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Firecrawl API Error:', response.status, error);
      return;
    }

    const data = await response.json();

    if (!data.success) {
      console.error('❌ Scraping failed:', data.error);
      return;
    }

    console.log('✅ Scraping successful!\n');
    console.log('📊 Results:');
    console.log(`- HTML length: ${data.data.html?.length || 0} characters`);
    console.log(`- Markdown length: ${data.data.markdown?.length || 0} characters`);

    // Check if we found event elements
    const html = data.data.html || '';
    const eventCount = (html.match(/event-item/g) || []).length;
    const eventTitles = html.match(/<h2[^>]*class="event-title"[^>]*>([^<]+)<\/h2>/g) || [];

    console.log(`\n🎯 Events found: ${eventCount}`);

    if (eventTitles.length > 0) {
      console.log('\n📅 Event Titles Found:');
      eventTitles.forEach((title, i) => {
        const cleanTitle = title.replace(/<[^>]+>/g, '').trim();
        console.log(`  ${i + 1}. ${cleanTitle}`);
      });
    }

    // Check for "kostenlos" (free) events
    const freeEvents = (html.match(/kostenlos/gi) || []).length;
    console.log(`\n💰 Free events (with "kostenlos"): ${freeEvents}`);

    // Save sample for inspection
    const fs = await import('fs');
    const sampleFile = '/tmp/firecrawl-sample.html';
    await fs.promises.writeFile(sampleFile, html.substring(0, 10000));
    console.log(`\n💾 Sample HTML saved to: ${sampleFile}`);

    // Show a snippet of the markdown
    if (data.data.markdown) {
      console.log('\n📝 Markdown Preview (first 500 chars):');
      console.log('---');
      console.log(data.data.markdown.substring(0, 500));
      console.log('---');
    }

    return data;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run the test
testFirecrawl().then(() => {
  console.log('\n✨ Test complete!');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});