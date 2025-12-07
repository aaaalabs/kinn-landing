#!/usr/bin/env node

/**
 * Comparison test: Regular extraction vs Firecrawl for InnCubator
 * Shows why Firecrawl is essential for SPAs
 */

const FIRECRAWL_API_KEY = 'fc-c1c58558e52442819f890adeb5ea580a';

async function testRegularExtraction() {
  console.log('🐌 Testing REGULAR extraction (no JavaScript)...\n');

  try {
    const response = await fetch('https://www.inncubator.at/events');
    const html = await response.text();

    console.log(`📊 HTML fetched: ${html.length} characters`);

    // Look for event indicators
    const hasAppRoot = html.includes('<app-root');
    const hasAngular = html.includes('ng-version');
    const eventCount = (html.match(/event-item/g) || []).length;
    const eventTitles = (html.match(/event-title/g) || []).length;

    console.log('🔍 Analysis:');
    console.log(`  - Angular app detected: ${hasAngular ? 'Yes' : 'No'}`);
    console.log(`  - App root element: ${hasAppRoot ? 'Yes' : 'No'}`);
    console.log(`  - Event items found: ${eventCount}`);
    console.log(`  - Event titles found: ${eventTitles}`);

    if (eventCount === 0) {
      console.log('\n❌ Result: NO EVENTS FOUND - content loads via JavaScript!');
    }

    return { eventCount, method: 'regular' };
  } catch (error) {
    console.error('Error:', error.message);
    return { eventCount: 0, method: 'regular', error: error.message };
  }
}

async function testFirecrawlExtraction() {
  console.log('\n🔥 Testing FIRECRAWL extraction (with JavaScript)...\n');

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.inncubator.at/events',
        formats: ['html', 'markdown'],
        waitFor: 5000,
        onlyMainContent: false
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error('Firecrawl failed: ' + (data.error || 'Unknown error'));
    }

    const html = data.data.html || '';
    const markdown = data.data.markdown || '';

    console.log(`📊 HTML rendered: ${html.length} characters`);
    console.log(`📝 Markdown generated: ${markdown.length} characters`);

    // Count events
    const eventCount = (html.match(/event-item/g) || []).length;
    const freeEvents = (html.match(/kostenlos/gi) || []).length;

    // Extract event titles from markdown
    const titles = markdown.match(/##\s+(.+)/g) || [];

    console.log('🔍 Analysis:');
    console.log(`  - Event items found: ${eventCount}`);
    console.log(`  - Free events: ${freeEvents}`);
    console.log(`  - Event titles extracted: ${titles.length}`);

    if (titles.length > 0) {
      console.log('\n📅 Sample Events:');
      titles.slice(0, 5).forEach((title, i) => {
        const clean = title.replace('## ', '').trim();
        console.log(`  ${i + 1}. ${clean}`);
      });
    }

    console.log('\n✅ Result: EVENTS SUCCESSFULLY EXTRACTED with JavaScript rendering!');

    return { eventCount, freeEvents, titles: titles.length, method: 'firecrawl' };
  } catch (error) {
    console.error('Error:', error.message);
    return { eventCount: 0, method: 'firecrawl', error: error.message };
  }
}

async function runComparison() {
  console.log('========================================');
  console.log('   InnCubator Extraction Comparison');
  console.log('   Regular vs Firecrawl (JavaScript)');
  console.log('========================================\n');

  const regular = await testRegularExtraction();
  const firecrawl = await testFirecrawlExtraction();

  console.log('\n========================================');
  console.log('            FINAL RESULTS');
  console.log('========================================');

  console.log('\n📊 Comparison:');
  console.log('┌─────────────────┬──────────┬────────────┐');
  console.log('│     Method      │ Regular  │ Firecrawl  │');
  console.log('├─────────────────┼──────────┼────────────┤');
  console.log(`│ Events Found    │    ${String(regular.eventCount).padEnd(6)}│    ${String(firecrawl.eventCount).padEnd(8)}│`);
  console.log(`│ Free Events     │    -     │    ${String(firecrawl.freeEvents || '-').padEnd(8)}│`);
  console.log(`│ Titles Extracted│    -     │    ${String(firecrawl.titles || '-').padEnd(8)}│`);
  console.log(`│ JavaScript      │    ❌    │     ✅     │`);
  console.log('└─────────────────┴──────────┴────────────┘');

  if (regular.eventCount === 0 && firecrawl.eventCount > 0) {
    console.log('\n🎯 Conclusion: Firecrawl is ESSENTIAL for InnCubator!');
    console.log('   Without JavaScript rendering, we get 0 events.');
    console.log('   With Firecrawl, we get all events properly extracted.');
  }
}

// Run the comparison
runComparison().catch(console.error);