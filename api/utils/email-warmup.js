/**
 * Email Warmup Manager
 * Gradually increases daily sending volume to build sender reputation
 *
 * [CP01] KISS: Simple daily limit based on launch date
 */

/**
 * Get current daily sending limit based on warmup schedule
 * Launch date: 2025-11-02 (adjust if needed)
 */
export function getDailySendingLimit() {
  const launchDate = new Date('2025-11-02');
  const today = new Date();
  const daysLive = Math.floor((today - launchDate) / (1000 * 60 * 60 * 24));

  // Warmup schedule (progressive)
  if (daysLive < 7) {
    return 20;   // Week 1: 10-20/day
  } else if (daysLive < 14) {
    return 50;   // Week 2: 30-50/day
  } else if (daysLive < 21) {
    return 100;  // Week 3: 75-100/day
  } else if (daysLive < 28) {
    return 200;  // Week 4: 150-200/day
  } else if (daysLive < 35) {
    return 400;  // Week 5: 300-400/day
  } else {
    return 1000; // Week 6+: Full volume
  }
}

/**
 * Check if we can send an email today (within daily limit)
 * Uses Redis to track daily send count
 *
 * @param {Object} redis - Redis client
 * @returns {Promise<boolean>} - True if sending allowed
 */
export async function canSendToday(redis) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `email:daily-count:${today}`;

  // Get current count
  const currentCount = parseInt(await redis.get(key) || '0');
  const dailyLimit = getDailySendingLimit();

  console.log(`[WARMUP] Daily sends: ${currentCount}/${dailyLimit}`);

  return currentCount < dailyLimit;
}

/**
 * Increment daily send counter
 * Auto-expires at end of day (UTC)
 */
export async function incrementDailySendCount(redis) {
  const today = new Date().toISOString().split('T')[0];
  const key = `email:daily-count:${today}`;

  // Increment counter
  await redis.incr(key);

  // Set expiry to end of day (UTC) + 1 day buffer
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ttlSeconds = Math.floor((tomorrow - new Date()) / 1000);
  await redis.expire(key, ttlSeconds);
}

/**
 * Get warmup status for admin dashboard
 */
export async function getWarmupStatus(redis) {
  const today = new Date().toISOString().split('T')[0];
  const key = `email:daily-count:${today}`;

  const currentCount = parseInt(await redis.get(key) || '0');
  const dailyLimit = getDailySendingLimit();
  const launchDate = new Date('2025-11-02');
  const daysLive = Math.floor((new Date() - launchDate) / (1000 * 60 * 60 * 24));

  return {
    daysLive,
    currentCount,
    dailyLimit,
    remainingToday: Math.max(0, dailyLimit - currentCount),
    percentUsed: Math.round((currentCount / dailyLimit) * 100),
    warmupComplete: daysLive >= 35,
  };
}
