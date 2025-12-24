#!/usr/bin/env node
/**
 * One-time script to update missing event locations in Redis
 * Run with: node --env-file=.env.local scripts/update-missing-locations.js
 *
 * Requires environment variables:
 * - KINNST_KV_REST_API_URL
 * - KINNST_KV_REST_API_TOKEN
 */

import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

// Location updates extracted from detail pages
const locationUpdates = [
  {
    // "Bots in Szene setzen. KI als Akteur im Theater"
    titleMatch: 'bots in szene setzen',
    location: 'Hörsaal 5¾',
    address: 'Innrain 52, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    // "Stammtisch: Praxislabor KI in der Medizin"
    titleMatch: 'stammtisch: praxislabor ki in der medizin',
    location: 'Health Hub, Raum M1.4',
    address: 'Exlgasse 24, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    // "Impulsgespräch: Kooperation für souveräne KI in Tirol"
    titleMatch: 'impulsgespräch: kooperation für souveräne ki',
    location: 'IKB-Smart-City-Lab',
    address: 'Langer Weg 32, 6020 Innsbruck',
    city: 'Innsbruck'
  },
  {
    // "T[AI]ROL"
    titleMatch: 't[ai]rol',
    location: 'Health Hub Tirol im Westpark',
    address: 'Exlgasse 24, 6020 Innsbruck',
    city: 'Innsbruck'
  }
];

async function updateLocations() {
  console.log('Fetching all radar events...');

  const eventIds = await kv.smembers('radar:events');
  console.log(`Found ${eventIds.length} events total`);

  let updatedCount = 0;

  for (const id of eventIds) {
    const event = await kv.hgetall(`radar:event:${id}`);

    if (!event || !event.title) continue;

    const titleLower = event.title.toLowerCase();

    // Check if this event needs a location update
    for (const update of locationUpdates) {
      if (titleLower.includes(update.titleMatch)) {
        console.log(`\nUpdating: ${event.title}`);
        console.log(`  Old location: ${event.location || 'Not specified'}`);
        console.log(`  New location: ${update.location}`);
        console.log(`  New address: ${update.address}`);

        await kv.hset(`radar:event:${id}`, {
          location: update.location,
          address: update.address,
          city: update.city
        });

        updatedCount++;
        console.log(`  Updated!`);
        break;
      }
    }
  }

  console.log(`\nDone! Updated ${updatedCount} events.`);
}

updateLocations().catch(console.error);
