import { Redis } from '@upstash/redis';
import {
  getAllSubscribers,
  getEventsConfig
} from '../utils/redis.js';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

/**
 * Admin Endpoint: Dashboard Metrics
 * GET /api/admin/dashboard
 *
 * Returns comprehensive overview of KINN community:
 * - Subscriber stats
 * - Profile completion rate
 * - Top skills
 * - Location/Work distribution
 * - Event RSVP stats
 *
 * Requires Bearer token (ADMIN_PASSWORD)
 */
export default async function handler(req, res) {
  // Only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    console.log('[DASHBOARD] Fetching metrics...');

    // 1. Subscriber Stats
    const allSubscribers = await getAllSubscribers();
    const totalSubscribers = allSubscribers.length;

    // 2. Profile Completion Rate
    let completeProfiles = 0;
    let incompleteProfiles = [];

    for (const email of allSubscribers) {
      try {
        const profile = await redis.get(`profile:${email}`);

        if (profile) {
          const hasName = profile.identity?.name && profile.identity.name.trim() !== '';
          const hasSkills = profile.supply?.skills && profile.supply.skills.length > 0;
          const hasExperience = profile.supply?.experience;

          if (hasName && hasSkills && hasExperience) {
            completeProfiles++;
          } else {
            incompleteProfiles.push({
              email,
              missing: {
                name: !hasName,
                skills: !hasSkills,
                experience: !hasExperience
              }
            });
          }
        } else {
          // No profile at all
          incompleteProfiles.push({
            email,
            missing: { name: true, skills: true, experience: true }
          });
        }
      } catch (error) {
        console.error(`[DASHBOARD] Error checking profile ${email}:`, error.message);
      }
    }

    const completionRate = totalSubscribers > 0
      ? Math.round((completeProfiles / totalSubscribers) * 100)
      : 0;

    // 3. Top Skills (from skill:* indexes)
    const skillKeys = await redis.keys('skill:*');
    const skillCounts = [];

    for (const key of skillKeys) {
      const skillName = key.replace('skill:', '');
      const count = await redis.scard(key);
      if (count > 0) {
        skillCounts.push({ skill: skillName, count });
      }
    }

    // Sort by count desc, take top 10
    const topSkills = skillCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Location Distribution
    const locationStats = {
      tirol: await redis.scard('loc:tirol') || 0,
      online: await redis.scard('loc:online') || 0,
      all: await redis.scard('loc:all') || 0
    };

    // 5. Work Status Distribution
    const workStats = {
      employed: await redis.scard('work:employed') || 0,
      freelancer: await redis.scard('work:freelancer') || 0,
      student: await redis.scard('work:student') || 0,
      betweenJobs: await redis.scard('work:between-jobs') || 0,
      sideProjects: await redis.scard('work:side-projects') || 0
    };

    // 6. Experience Level Distribution
    const levelStats = {
      junior: await redis.scard('level:junior') || 0,
      mid: await redis.scard('level:mid') || 0,
      senior: await redis.scard('level:senior') || 0,
      lead: await redis.scard('level:lead') || 0
    };

    // 7. Event Stats
    const eventsConfig = await getEventsConfig();
    const upcomingEvents = eventsConfig.events
      .filter(e => new Date(e.start) > new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const lastEvent = eventsConfig.events
      .filter(e => new Date(e.start) < new Date())
      .sort((a, b) => new Date(b.start) - new Date(a.start))[0];

    let lastEventStats = null;
    if (lastEvent && lastEvent.rsvps) {
      const yesCount = lastEvent.rsvps.yes?.length || 0;
      const noCount = lastEvent.rsvps.no?.length || 0;
      const maybeCount = lastEvent.rsvps.maybe?.length || 0;
      const totalResponses = yesCount + noCount + maybeCount;
      const rsvpRate = totalSubscribers > 0
        ? Math.round((totalResponses / totalSubscribers) * 100)
        : 0;

      lastEventStats = {
        title: lastEvent.title,
        date: lastEvent.date,
        rsvps: {
          yes: yesCount,
          no: noCount,
          maybe: maybeCount,
          total: totalResponses,
          rate: rsvpRate
        }
      };
    }

    // 8. Growth Stats (simple: just current total, can be extended with timestamps)
    const growthStats = {
      total: totalSubscribers,
      // Future: Track signups per week/month
    };

    console.log('[DASHBOARD] Metrics fetched successfully');

    return res.status(200).json({
      success: true,
      metrics: {
        subscribers: {
          total: totalSubscribers,
          complete: completeProfiles,
          incomplete: totalSubscribers - completeProfiles,
          completionRate
        },
        incompleteProfiles: incompleteProfiles.slice(0, 50), // Limit to 50 for performance
        skills: {
          top: topSkills,
          total: skillCounts.length
        },
        location: locationStats,
        work: workStats,
        level: levelStats,
        events: {
          upcoming: upcomingEvents.length,
          nextEvent: upcomingEvents[0] || null,
          lastEvent: lastEventStats
        },
        growth: growthStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DASHBOARD] Error fetching metrics:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
}
