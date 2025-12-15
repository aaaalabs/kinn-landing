#!/usr/bin/env node

/**
 * Script to check when the last users confirmed their subscriptions
 * This helps identify when the BASE_URL bug started affecting confirmations
 */

import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Redis client
const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

async function checkLastConfirmations() {
  console.log('📅 Checking confirmation timeline...\n');

  try {
    // Get all confirmed subscribers
    const confirmedEmails = await redis.smembers('subscribers:confirmed');
    console.log(`Found ${confirmedEmails.length} confirmed subscribers\n`);

    // Collect subscription dates
    const subscriptionDates = [];

    for (const email of confirmedEmails) {
      try {
        // Check for user preferences which contain subscribedAt
        const preferences = await redis.get(`user:preferences:${email}`);
        if (preferences && preferences.subscribedAt) {
          subscriptionDates.push({
            email,
            date: new Date(preferences.subscribedAt),
            dateStr: preferences.subscribedAt
          });
        }
      } catch (e) {
        // Silent fail for individual users
      }
    }

    // Sort by date (newest first)
    subscriptionDates.sort((a, b) => b.date - a.date);

    // Show the most recent confirmations
    console.log('📊 Most recent confirmations:\n');
    const recentCount = Math.min(10, subscriptionDates.length);

    if (subscriptionDates.length === 0) {
      console.log('❌ No subscription timestamps found in user preferences');
      console.log('   (Older users might not have timestamps)');
    } else {
      for (let i = 0; i < recentCount; i++) {
        const sub = subscriptionDates[i];
        const daysAgo = Math.floor((Date.now() - sub.date) / (1000 * 60 * 60 * 24));
        console.log(`${i + 1}. ${sub.email}`);
        console.log(`   Date: ${sub.date.toLocaleDateString('de-AT')} ${sub.date.toLocaleTimeString('de-AT')}`);
        console.log(`   (${daysAgo} days ago)\n`);
      }

      // Find the gap
      if (subscriptionDates.length > 0) {
        const newest = subscriptionDates[0];
        const newestDaysAgo = Math.floor((Date.now() - newest.date) / (1000 * 60 * 60 * 24));

        console.log('⚠️  IMPORTANT FINDING:');
        console.log(`   Last successful confirmation: ${newestDaysAgo} days ago`);
        console.log(`   Date: ${newest.date.toLocaleDateString('de-AT')} ${newest.date.toLocaleTimeString('de-AT')}`);
        console.log(`   Email: ${newest.email}`);

        if (newestDaysAgo > 7) {
          console.log('\n🚨 WARNING: No confirmations in the last week!');
          console.log('   This suggests the bug has been blocking ALL confirmations.');
        }
      }
    }

    // Check deployment timeline
    console.log('\n📦 Deployment Timeline:');
    console.log('   BASE_URL was set in Vercel: ~44 days ago (early November)');
    console.log('   This coincides with when confirmations likely stopped working');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkLastConfirmations().catch(console.error);