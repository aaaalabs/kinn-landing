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

    // 2. Profile Completion Rate (PARALLEL fetch)
    const profilePromises = allSubscribers.map(email =>
      redis.get(`profile:${email}`).catch(() => null)
    );
    const profiles = await Promise.all(profilePromises);

    let completeProfiles = 0;
    let incompleteProfiles = [];

    profiles.forEach((profile, i) => {
      const email = allSubscribers[i];
      if (profile) {
        const hasName = profile.identity?.name && profile.identity.name.trim() !== '';
        const hasSkills = profile.supply?.skills && profile.supply.skills.length > 0;
        const hasExperience = profile.supply?.experience;

        if (hasName && hasSkills && hasExperience) {
          completeProfiles++;
        } else {
          incompleteProfiles.push({
            email,
            missing: { name: !hasName, skills: !hasSkills, experience: !hasExperience }
          });
        }
      } else {
        incompleteProfiles.push({
          email,
          missing: { name: true, skills: true, experience: true }
        });
      }
    });

    const completionRate = totalSubscribers > 0
      ? Math.round((completeProfiles / totalSubscribers) * 100)
      : 0;

    // 3. Top Skills (PARALLEL fetch)
    const skillKeys = await redis.keys('skill:*');
    const skillCountPromises = skillKeys.map(key =>
      redis.scard(key).then(count => ({ skill: key.replace('skill:', ''), count }))
    );
    const skillCounts = (await Promise.all(skillCountPromises)).filter(s => s.count > 0);
    const topSkills = skillCounts.sort((a, b) => b.count - a.count).slice(0, 10);

    // 4-6. Location, Work, Level Stats (PARALLEL)
    const [locTirol, locOnline, locAll, workEmployed, workFreelancer, workStudent, workBetween, workSide, lvlJunior, lvlMid, lvlSenior, lvlLead] = await Promise.all([
      redis.scard('loc:tirol'),
      redis.scard('loc:online'),
      redis.scard('loc:all'),
      redis.scard('work:employed'),
      redis.scard('work:freelancer'),
      redis.scard('work:student'),
      redis.scard('work:between-jobs'),
      redis.scard('work:side-projects'),
      redis.scard('level:junior'),
      redis.scard('level:mid'),
      redis.scard('level:senior'),
      redis.scard('level:lead')
    ]);

    const locationStats = { tirol: locTirol || 0, online: locOnline || 0, all: locAll || 0 };
    const workStats = { employed: workEmployed || 0, freelancer: workFreelancer || 0, student: workStudent || 0, betweenJobs: workBetween || 0, sideProjects: workSide || 0 };
    const levelStats = { junior: lvlJunior || 0, mid: lvlMid || 0, senior: lvlSenior || 0, lead: lvlLead || 0 };

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
