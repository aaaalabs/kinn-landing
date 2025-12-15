#!/usr/bin/env node

/**
 * Script to resend invitations to users who couldn't confirm due to the broken link bug
 *
 * Usage: node scripts/resend-invites.js email1@example.com email2@example.com
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resendInvites(emails) {
  console.log('📨 Resending invitations to affected users...\n');

  if (!emails || emails.length === 0) {
    console.log('❌ No email addresses provided');
    console.log('Usage: node scripts/resend-invites.js email1@example.com email2@example.com');
    return;
  }

  const baseUrl = (process.env.BASE_URL || 'https://kinn.at').trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD not set in environment');
    return;
  }

  for (const email of emails) {
    console.log(`\n📧 Sending invite to: ${email}`);

    try {
      const response = await fetch(`${baseUrl}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({
          email,
          message: `Hallo!

Wir hatten leider ein technisches Problem mit unserem Bestätigungslink.
Falls du dich in den letzten Wochen angemeldet hast und der Link nicht funktioniert hat - das tut uns sehr leid!

Der Fehler ist jetzt behoben. Hier ist dein neuer Bestätigungslink:`,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Success: ${result.message}`);
      } else {
        console.log(`❌ Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }

  console.log('\n✨ Done!');
}

// Get email addresses from command line arguments
const emails = process.argv.slice(2);
resendInvites(emails).catch(console.error);