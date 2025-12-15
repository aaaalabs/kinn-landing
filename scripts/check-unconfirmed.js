#!/usr/bin/env node

/**
 * Script to check for potential unconfirmed signups
 *
 * Strategy:
 * 1. Check Vercel logs for "New user - sending confirmation email" entries
 * 2. Cross-reference with confirmed subscribers
 * 3. Identify who might have received broken confirmation links
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

async function checkUnconfirmed() {
  console.log('🔍 Checking for unconfirmed signups...\n');

  try {
    // Get all confirmed subscribers
    const confirmedEmails = await redis.smembers('subscribers:confirmed');
    console.log(`✅ Confirmed subscribers: ${confirmedEmails.length}`);

    // Check for any pending confirmations still in Redis (unlikely after 48h)
    // These would have keys like kinn:pending:*
    console.log('\n📋 Checking for pending confirmations in Redis...');

    // Note: We can't directly scan for keys with Upstash Redis REST API
    // But we can provide instructions for manual checking

    console.log('\n📌 Manual Check Instructions:');
    console.log('1. Check your email inbox (treff@in.kinn.at) for "Neue Anmeldung" emails');
    console.log('   These contain all signup attempts from the last 44 days');
    console.log('');
    console.log('2. Cross-reference with confirmed list:');
    console.log('   Confirmed emails:');
    confirmedEmails.forEach(email => {
      console.log(`   - ${email}`);
    });
    console.log('');
    console.log('3. Check Vercel Function Logs:');
    console.log('   Go to: https://vercel.com/thomas-projects-2f71c075/kinn/functions');
    console.log('   Filter for: api/signup');
    console.log('   Search for: "New user - sending confirmation email"');
    console.log('   Time range: Last 45 days (since early November)');
    console.log('');
    console.log('4. Emails that appear in signup logs but NOT in confirmed list');
    console.log('   likely encountered the broken link issue');

    // Additional analysis if we had access to logs
    console.log('\n💡 Recommendation:');
    console.log('After identifying unconfirmed users from the logs, you can:');
    console.log('1. Send them a personal email apologizing for the issue');
    console.log('2. Include a new, working confirmation link');
    console.log('3. Or use the admin invite endpoint to resend invitations');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkUnconfirmed().catch(console.error);