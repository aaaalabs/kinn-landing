#!/usr/bin/env node

// Seed script for KINN #6 voting topics
// Run with: node scripts/seed-voting.js

import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Initialize Redis client
const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

const TOPICS_KEY = 'voting:kinn-6:topics';

// Seed data
const seedTopics = [
  {
    id: 'topic-seed-1',
    title: 'Voice AI für KMU - Telefon-Bots die funktionieren',
    authorEmail: 'demo@kinn.at',
    authorName: 'Thomas',
    votes: 14,
    voterEmails: ['demo@kinn.at', 'user1@example.com', 'user2@example.com'],
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'topic-seed-2',
    title: 'Agentic AI - Wenn KI selbstständig handelt',
    authorEmail: 'anna@example.com',
    authorName: 'Anna',
    votes: 11,
    voterEmails: ['anna@example.com', 'user3@example.com'],
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  },
  {
    id: 'topic-seed-3',
    title: 'Vibe Coding - Die neue Art zu programmieren',
    authorEmail: 'martin@example.com',
    authorName: 'Martin',
    votes: 8,
    voterEmails: ['martin@example.com', 'user4@example.com'],
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
  {
    id: 'topic-seed-4',
    title: 'KI-Automatisierung für Kleinunternehmen',
    authorEmail: 'sarah@example.com',
    authorName: 'Sarah',
    votes: 7,
    voterEmails: ['sarah@example.com'],
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
  },
  {
    id: 'topic-seed-5',
    title: 'KI & Compliance - NIS2, DORA, AI Act',
    authorEmail: 'peter@example.com',
    authorName: 'Peter',
    votes: 5,
    voterEmails: ['peter@example.com'],
    createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
  },
];

async function seedVotingTopics() {
  console.log('🌱 Starting seed process for KINN #6 voting topics...\n');

  try {
    // Check if topics already exist
    const existing = await redis.json.get(TOPICS_KEY, '$');

    if (existing && existing[0] && existing[0].length > 0) {
      console.log('⚠️  Topics already exist in Redis. Clear them first? (y/n)');

      // For automated scripts, skip if topics exist
      console.log('📋 Existing topics:', existing[0].length);
      console.log('ℹ️  To reset: Delete key manually or modify script');
      return;
    }

    // Add seed topics
    await redis.json.set(TOPICS_KEY, '$', seedTopics);

    console.log('✅ Successfully seeded', seedTopics.length, 'topics:');
    console.log('');

    seedTopics.forEach(topic => {
      console.log(`  • "${topic.title}" by ${topic.authorName} (${topic.votes} votes)`);
    });

    console.log('\n✨ Seed complete! Topics are ready for voting.');
    console.log('🔗 Visit: https://kinn.at/pages/profil.html#kinn6');

  } catch (error) {
    console.error('❌ Error seeding topics:', error);
    process.exit(1);
  }
}

// Run the seed function
seedVotingTopics();