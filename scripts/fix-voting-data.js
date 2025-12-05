#!/usr/bin/env node

// Fix voting topics data format in Redis
// Converts object with numeric keys to proper array

import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

// Initialize Redis client
const redis = new Redis({
  url: envVars.KINNST_KV_REST_API_URL,
  token: envVars.KINNST_KV_REST_API_TOKEN,
});

const TOPICS_KEY = 'voting:kinn-6:topics';

async function fixVotingData() {
  console.log('🔧 Fixing voting topics data format...\n');

  try {
    // Get existing data
    const existing = await redis.json.get(TOPICS_KEY, '$');
    console.log('📋 Current data:', JSON.stringify(existing, null, 2));

    // Check if data exists
    if (!existing || !existing[0]) {
      console.log('❌ No data found at', TOPICS_KEY);
      return;
    }

    const data = existing[0];

    // Check if it's already an array
    if (Array.isArray(data)) {
      console.log('✅ Data is already in correct array format');
      return;
    }

    // Convert object to array
    console.log('🔄 Converting object to array...');
    const topics = [];

    // Sort keys numerically and convert to array
    const keys = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));

    for (const key of keys) {
      const topic = data[key];
      if (topic && typeof topic === 'object') {
        // Ensure all required fields exist
        topic.id = topic.id || `topic-${Date.now()}-${key}`;
        topic.votes = topic.votes || 0;
        topic.voterEmails = topic.voterEmails || [];
        topic.createdAt = topic.createdAt || new Date().toISOString();

        topics.push(topic);
        console.log(`  ✓ Added topic: "${topic.title}" (${topic.votes} votes)`);
      }
    }

    // Save back as array
    await redis.json.set(TOPICS_KEY, '$', topics);

    console.log(`\n✅ Successfully converted ${topics.length} topics to array format`);

    // Verify the fix
    const verification = await redis.json.get(TOPICS_KEY, '$');
    console.log('\n🔍 Verification - data is now:');
    console.log(JSON.stringify(verification, null, 2));

  } catch (error) {
    console.error('❌ Error fixing voting data:', error);
    process.exit(1);
  }
}

// Run the fix
fixVotingData();