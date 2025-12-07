#!/usr/bin/env node

// Test script for KINN-RADAR system
// Run with: node test-radar-system.js

const BASE_URL = 'https://kinn.at';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n📍 Testing ${name}...`);
  try {
    const response = await fetch(BASE_URL + url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`❌ ${name}: HTTP ${response.status}`);
      console.log('   Error:', data.error || data.message);
      return false;
    }

    console.log(`✅ ${name}: Success`);
    if (data.events_found !== undefined) {
      console.log(`   Found: ${data.events_found} events`);
      console.log(`   Added: ${data.events_added} new`);
      console.log(`   Duplicates: ${data.duplicates} skipped`);
    }
    if (data.sources_updated !== undefined) {
      console.log(`   Sources updated: ${data.sources_updated}`);
      console.log(`   Active sources: ${data.active_sources}`);
    }
    if (data.lines_written !== undefined) {
      console.log(`   Lines written: ${data.lines_written}`);
    }
    if (data.synced !== undefined) {
      console.log(`   Events synced: ${data.synced}`);
    }

    return data;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullTest() {
  console.log('🚀 KINN-RADAR System Test');
  console.log('========================\n');

  const startTime = Date.now();

  // Step 1: Check PRIMARY sites (HIGH priority)
  console.log('📊 STEP 1: Checking HIGH-priority event sources');
  const sitesResult = await testEndpoint(
    'Site Checker (PRIMARY)',
    '/api/radar/check-sites?priority=primary'
  );

  if (!sitesResult) {
    console.log('⚠️  Site checking failed, but continuing...');
  }

  await sleep(2000); // Wait for Redis to settle

  // Step 2: Update Sources tab with metrics
  console.log('\n📊 STEP 2: Updating Sources tab with metrics');
  const sourcesResult = await testEndpoint(
    'Sources Update',
    '/api/radar/update-sources'
  );

  await sleep(1000);

  // Step 3: Update Info tab
  console.log('\n📊 STEP 3: Updating Info tab documentation');
  const infoResult = await testEndpoint(
    'Info Update',
    '/api/radar/update-info'
  );

  await sleep(1000);

  // Step 4: Sync events to Google Sheets
  console.log('\n📊 STEP 4: Syncing events to Google Sheets');
  const syncResult = await testEndpoint(
    'Sheets Sync',
    '/api/radar/sheets-sync'
  );

  await sleep(1000);

  // Step 5: Generate iCal feed (AI events only)
  console.log('\n📊 STEP 5: Testing iCal feed generation');
  const calResult = await testEndpoint(
    'Calendar Feed',
    '/api/radar/calendar.ics'
  );

  if (calResult && typeof calResult === 'string' && calResult.includes('BEGIN:VCALENDAR')) {
    console.log('   ✓ Valid iCal format detected');
  }

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(50));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(50));

  if (sitesResult) {
    console.log(`✅ Sites checked: ${sitesResult.sites_checked || 0}`);
    console.log(`✅ Events found: ${sitesResult.events_found || 0}`);
    console.log(`✅ New events: ${sitesResult.events_added || 0}`);
  }

  if (sourcesResult) {
    console.log(`✅ Sources tracked: ${sourcesResult.sources_updated || 0}`);
  }

  if (syncResult) {
    console.log(`✅ Events in sheet: ${syncResult.synced || 0}`);
  }

  console.log(`⏱️  Total time: ${elapsed} seconds`);

  console.log('\n📋 Google Sheets URL:');
  console.log(`   ${syncResult?.sheetUrl || 'https://docs.google.com/spreadsheets/d/[SHEET_ID]'}`);

  console.log('\n🎯 Next Steps:');
  console.log('1. Check Google Sheets for populated data');
  console.log('2. Review Sources tab for status indicators');
  console.log('3. Subscribe to priority newsletters');
  console.log('4. Set up daily cron schedule');

  console.log('\n✨ KINN-RADAR system test complete!');
}

// Run the test
runFullTest().catch(console.error);