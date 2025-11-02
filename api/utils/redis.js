import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KINNST_KV_REST_API_URL?.trim(),
  token: process.env.KINNST_KV_REST_API_TOKEN?.trim(),
});

const SUBSCRIBERS_KEY = 'subscribers:confirmed';
const EVENTS_CONFIG_KEY = 'events:config';

/**
 * Get Redis client instance
 * Used by endpoints that need direct Redis access
 * @returns {Redis} Redis client instance
 */
export function getRedisClient() {
  return redis;
}

/**
 * Adds a confirmed subscriber to Redis set
 * @param {string} email - Subscriber email address
 * @returns {Promise<boolean>} True if added, false if already exists
 */
export async function addSubscriber(email) {
  try {
    // SADD returns 1 if member added, 0 if already exists
    const result = await redis.sadd(SUBSCRIBERS_KEY, email.toLowerCase());
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to add subscriber:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Checks if an email is already subscribed
 * @param {string} email - Email address to check
 * @returns {Promise<boolean>} True if subscribed, false otherwise
 */
export async function isSubscribed(email) {
  try {
    const result = await redis.sismember(SUBSCRIBERS_KEY, email.toLowerCase());
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to check subscription:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets all confirmed subscribers
 * @returns {Promise<string[]>} Array of subscriber email addresses
 */
export async function getAllSubscribers() {
  try {
    const subscribers = await redis.smembers(SUBSCRIBERS_KEY);
    return subscribers || [];
  } catch (error) {
    console.error('[REDIS] Failed to get subscribers:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets total subscriber count
 * @returns {Promise<number>} Number of confirmed subscribers
 */
export async function getSubscriberCount() {
  try {
    const count = await redis.scard(SUBSCRIBERS_KEY);
    return count || 0;
  } catch (error) {
    console.error('[REDIS] Failed to get subscriber count:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

// ===== Event Configuration Storage =====

/**
 * Gets event configuration from Redis
 * @returns {Promise<Object>} Event configuration with events array and defaults
 */
export async function getEventsConfig() {
  try {
    const config = await redis.get(EVENTS_CONFIG_KEY);

    // Return config or default structure
    if (!config) {
      return {
        events: [],
        defaults: {
          timezone: 'Europe/Vienna',
          organizer: 'thomas@kinn.at',
          categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
          reminder: '24h'
        }
      };
    }

    return config;
  } catch (error) {
    console.error('[REDIS] Failed to get events config:', error.message);
    // Return default config on error
    return {
      events: [],
      defaults: {
        timezone: 'Europe/Vienna',
        organizer: 'thomas@kinn.at',
        categories: ['KI', 'AI', 'Networking', 'Innsbruck'],
        reminder: '24h'
      }
    };
  }
}

/**
 * Updates event configuration in Redis
 * @param {Object} config - Event configuration object
 * @returns {Promise<void>}
 */
export async function updateEventsConfig(config) {
  try {
    await redis.set(EVENTS_CONFIG_KEY, config);
    console.log('[REDIS] Events config updated:', config.events?.length || 0, 'events');
  } catch (error) {
    console.error('[REDIS] Failed to update events config:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

// ===== User Preferences Management =====

/**
 * Gets user preferences from Redis
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User preferences object or null if not found
 */
export async function getUserPreferences(email) {
  try {
    const key = `user:preferences:${email.toLowerCase()}`;
    const preferences = await redis.get(key);
    return preferences;
  } catch (error) {
    console.error('[REDIS] Failed to get user preferences:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Updates user preferences in Redis
 * @param {string} email - User email address
 * @param {Object} preferences - Preferences object to store
 * @returns {Promise<void>}
 */
export async function updateUserPreferences(email, preferences) {
  try {
    const key = `user:preferences:${email.toLowerCase()}`;
    await redis.set(key, {
      ...preferences,
      email: email.toLowerCase(),
      updatedAt: new Date().toISOString()
    });
    console.log('[REDIS] User preferences updated:', email.toLowerCase());
  } catch (error) {
    console.error('[REDIS] Failed to update user preferences:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Deletes user preferences from Redis (used during unsubscribe)
 * @param {string} email - User email address
 * @returns {Promise<boolean>} True if deleted, false if didn't exist
 */
export async function deleteUserPreferences(email) {
  try {
    const key = `user:preferences:${email.toLowerCase()}`;
    const result = await redis.del(key);
    console.log('[REDIS] User preferences deleted:', email.toLowerCase());
    return result === 1;
  } catch (error) {
    console.error('[REDIS] Failed to delete user preferences:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Removes a subscriber completely (from both subscribers set and preferences)
 * @param {string} email - User email address
 * @returns {Promise<boolean>} True if removed, false if wasn't subscribed
 */
export async function removeSubscriber(email) {
  try {
    const normalizedEmail = email.toLowerCase();

    // Remove from subscribers set
    const removedFromSet = await redis.srem(SUBSCRIBERS_KEY, normalizedEmail);

    // Delete preferences
    await deleteUserPreferences(normalizedEmail);

    console.log('[REDIS] Subscriber completely removed:', normalizedEmail);
    return removedFromSet === 1;
  } catch (error) {
    console.error('[REDIS] Failed to remove subscriber:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

// ===== Extended Profile Management =====

/**
 * Gets full profile including extended data
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} Full profile object or null if not found
 */
export async function getProfile(email) {
  try {
    const key = `profile:${email.toLowerCase()}`;
    const profile = await redis.get(key);
    return profile;
  } catch (error) {
    console.error('[REDIS] Failed to get profile:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Updates extended profile with supply/demand data
 * @param {string} email - User email address
 * @param {Object} profileData - Profile data object
 * @returns {Promise<Object>} Updated profile
 */
export async function updateProfileExtended(email, profileData) {
  try {
    const normalizedEmail = email.toLowerCase();
    const key = `profile:${normalizedEmail}`;

    // Get existing profile or create new
    const existing = await redis.get(key) || {
      email: normalizedEmail,
      createdAt: new Date().toISOString()
    };

    // Merge with new data
    const updated = {
      ...existing,
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
      identity: {
        ...(existing.identity || {}),
        ...(profileData.identity || {})
      },
      supply: {
        ...(existing.supply || {}),
        ...(profileData.supply || {})
      },
      demand: {
        ...(existing.demand || {}),
        ...(profileData.demand || {})
      },
      preferences: {
        ...(existing.preferences || { notifications: { enabled: true } }),
        ...(profileData.preferences || {})
      },
      meta: {
        ...(existing.meta || {}),
        ...(profileData.meta || {})
      }
    };

    // Save to Redis
    await redis.set(key, updated);

    // Update reverse indexes
    await updateReverseIndexes(normalizedEmail, updated);

    console.log('[REDIS] Extended profile updated:', normalizedEmail);
    return updated;
  } catch (error) {
    console.error('[REDIS] Failed to update extended profile:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Updates reverse indexes for efficient matching - ULTRA-SIMPLE (v2)
 * [CP01] KISS: Only 4 index types, no cleanup logic (YAGNI)
 * @param {string} email - User email address
 * @param {Object} profile - Full profile object
 * @returns {Promise<void>}
 */
export async function updateReverseIndexes(email, profile) {
  try {
    const normalizedEmail = email.toLowerCase();

    // 1. Index skills (unchanged)
    if (profile.supply?.skills && Array.isArray(profile.supply.skills)) {
      for (const skill of profile.supply.skills) {
        await redis.sadd(`skill:${skill.toLowerCase()}`, normalizedEmail);
      }
    }

    // 2. Index experience level (ALL levels, granular)
    if (profile.supply?.experience) {
      await redis.sadd(`level:${profile.supply.experience}`, normalizedEmail);
    }

    // 3. Index work status (availability)
    if (profile.supply?.availability) {
      await redis.sadd(`work:${profile.supply.availability}`, normalizedEmail);
    }

    // 4. Index location (mapped to simple values)
    if (profile.identity?.location) {
      const locationMap = {
        'in-person': 'tirol',
        'online': 'online',
        'all': 'all',
        // Legacy values (backward compat)
        'ibk': 'tirol',
        'tirol': 'tirol',
        'remote': 'online',
        'hybrid': 'all'
      };
      const loc = locationMap[profile.identity.location.toLowerCase()];
      if (loc) {
        await redis.sadd(`loc:${loc}`, normalizedEmail);
      }
    }

    console.log('[REDIS] Reverse indexes updated (SIMPLE v2):', normalizedEmail);
  } catch (error) {
    console.error('[REDIS] Failed to update reverse indexes:', error.message);
    // Don't throw - indexing is not critical
  }
}

/**
 * Gets match hints for a profile - ULTRA-SIMPLE (v2)
 * @param {Object} profile - User profile object
 * @returns {Promise<Object>} Match hints with count and messages
 */
export async function getMatchHints(profile) {
  try {
    const hints = [];
    let totalMatches = 0;

    // Match 1: People with similar skills
    if (profile.supply?.skills && profile.supply.skills.length > 0) {
      const topSkill = profile.supply.skills[0];
      const skillMatches = await redis.scard(`skill:${topSkill.toLowerCase()}`);

      if (skillMatches > 1) {
        hints.push(`${skillMatches - 1} andere KINN'der mit ${topSkill}`);
        totalMatches += skillMatches - 1;
      }
    }

    // Match 2: Same location
    if (profile.identity?.location) {
      const locationMap = {
        'in-person': 'tirol',
        'online': 'online',
        'all': 'all',
        'ibk': 'tirol',
        'tirol': 'tirol',
        'remote': 'online',
        'hybrid': 'all'
      };
      const loc = locationMap[profile.identity.location.toLowerCase()];

      if (loc === 'tirol') {
        const locationMatches = await redis.scard('loc:tirol');
        if (locationMatches > 1) {
          hints.push(`${locationMatches - 1} KINN'der in Tirol`);
        }
      }
    }

    // Match 3: Senior+ devs (combined count)
    const seniorCount = await redis.scard('level:senior');
    const leadCount = await redis.scard('level:lead');
    const totalSeniorPlus = seniorCount + leadCount;

    if (totalSeniorPlus > 0 && profile.supply?.experience && !['senior', 'lead'].includes(profile.supply.experience)) {
      hints.push(`${totalSeniorPlus} Senior+ Devs im Netzwerk`);
    }

    return {
      count: totalMatches,
      hints: hints.slice(0, 3) // Max 3 hints
    };
  } catch (error) {
    console.error('[REDIS] Failed to get match hints:', error.message);
    return { count: 0, hints: [] };
  }
}

// ===== RSVP Management =====

/**
 * Updates RSVP for a specific event
 * @param {string} eventId - Event ID
 * @param {string} email - User email address
 * @param {string} response - RSVP response: 'yes' | 'no' | 'maybe'
 * @returns {Promise<Object>} Updated event config
 */
export async function updateEventRSVP(eventId, email, response) {
  try {
    const normalizedEmail = email.toLowerCase();
    const config = await getEventsConfig();

    // Find the event
    const eventIndex = config.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      throw new Error('Event not found');
    }

    const event = config.events[eventIndex];

    // Initialize rsvps if not exists
    if (!event.rsvps) {
      event.rsvps = { yes: [], no: [], maybe: [] };
    }

    // Remove email from all RSVP lists
    event.rsvps.yes = event.rsvps.yes?.filter(e => e !== normalizedEmail) || [];
    event.rsvps.no = event.rsvps.no?.filter(e => e !== normalizedEmail) || [];
    event.rsvps.maybe = event.rsvps.maybe?.filter(e => e !== normalizedEmail) || [];

    // Add to selected list
    if (response === 'yes' || response === 'no' || response === 'maybe') {
      event.rsvps[response].push(normalizedEmail);
    }

    // Update event in config
    config.events[eventIndex] = event;

    // Save to Redis
    await updateEventsConfig(config);

    console.log('[REDIS] RSVP updated:', eventId, normalizedEmail, response);
    return config;
  } catch (error) {
    console.error('[REDIS] Failed to update RSVP:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets RSVP statistics for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} RSVP stats { yes: [], no: [], maybe: [], counts: {} }
 */
export async function getEventRSVPs(eventId) {
  try {
    const config = await getEventsConfig();
    const event = config.events.find(e => e.id === eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    const rsvps = event.rsvps || { yes: [], no: [], maybe: [] };

    return {
      yes: rsvps.yes || [],
      no: rsvps.no || [],
      maybe: rsvps.maybe || [],
      counts: {
        yes: rsvps.yes?.length || 0,
        no: rsvps.no?.length || 0,
        maybe: rsvps.maybe?.length || 0,
        total: (rsvps.yes?.length || 0) + (rsvps.no?.length || 0) + (rsvps.maybe?.length || 0)
      }
    };
  } catch (error) {
    console.error('[REDIS] Failed to get event RSVPs:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Gets subscribers filtered by RSVP status
 * @param {string} eventId - Event ID
 * @param {string} filter - Filter: 'all' | 'yes' | 'no' | 'maybe' | 'yes_maybe' | 'none'
 * @returns {Promise<string[]>} Array of email addresses
 */
export async function getSubscribersByRSVP(eventId, filter = 'all') {
  try {
    const allSubscribers = await getAllSubscribers();

    if (filter === 'all') {
      return allSubscribers;
    }

    const rsvps = await getEventRSVPs(eventId);

    switch (filter) {
      case 'yes':
        return rsvps.yes;

      case 'no':
        return rsvps.no;

      case 'maybe':
        return rsvps.maybe;

      case 'yes_maybe':
        return [...rsvps.yes, ...rsvps.maybe];

      case 'none':
        // Subscribers who haven't responded
        const responded = new Set([...rsvps.yes, ...rsvps.no, ...rsvps.maybe]);
        return allSubscribers.filter(email => !responded.has(email));

      default:
        return allSubscribers;
    }
  } catch (error) {
    console.error('[REDIS] Failed to get subscribers by RSVP:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }
}
