#!/usr/bin/env node

/**
 * Send a personalized invitation to Martin Gyurkó who reported the bug
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function sendMartinInvite() {
  console.log('📨 Sending personalized invitation to Martin Gyurkó...\n');

  const baseUrl = (process.env.BASE_URL || 'https://kinn.at').trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD not set in environment');
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/admin/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminPassword}`,
      },
      body: JSON.stringify({
        name: 'Martin Gyurkó',
        email: 'gyurma@gyurma.de',
        message: `Hallo Martin!

Vielen Dank für deine Meldung heute Morgen! Du hattest völlig recht - der Bestätigungslink hatte einen Bug mit einem versteckten Zeilenumbruch (%0D%0A).

Der Fehler ist jetzt behoben. Hier ist dein neuer, funktionierender Link zur KINN Community.

Sorry für die Umstände und danke für dein Verständnis!`,
        invitedBy: 'Thomas'
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Success: ${result.message}`);
      console.log('\n📧 Martin hat eine personalisierte Einladung erhalten mit:');
      console.log('   - Entschuldigung für den Bug');
      console.log('   - Funktionierender Bestätigungslink');
      console.log('   - Danke für seine Meldung');
    } else {
      console.log(`❌ Error: ${result.message || result.error}`);
    }
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

// Send the invite
sendMartinInvite().catch(console.error);