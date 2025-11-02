import { verifyProfileToken } from '../utils/tokens.js';
import { getRedisClient } from '../utils/redis.js';

/**
 * Auto-save Skills Endpoint
 * Updates only the skills array in user's supply profile
 *
 * Designed for instant save on every skill toggle (Notion-style UX)
 * No rate limiting needed - Redis is fast enough for this
 */
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT requests are accepted'
    });
  }

  try {
    const { token, skills } = req.body;

    if (!token || !Array.isArray(skills)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Token and skills array required'
      });
    }

    // Verify token
    const email = verifyProfileToken(token);
    if (!email) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token expired or invalid'
      });
    }

    // Validate skills limit
    if (skills.length > 20) {
      return res.status(400).json({
        error: 'Too many skills',
        message: 'Maximum 20 skills allowed'
      });
    }

    // Get Redis client
    const redis = getRedisClient();
    const profileKey = `profile:${email}`;

    // Get existing profile
    const existingProfile = await redis.get(profileKey);

    if (!existingProfile) {
      // No profile yet - create minimal one with just skills
      const newProfile = {
        email,
        supply: {
          skills
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await redis.set(profileKey, newProfile);

      console.log(`[AUTO-SAVE-SKILLS] Created profile with ${skills.length} skills for ${email}`);
      return res.status(200).json({
        success: true,
        skillCount: skills.length
      });
    }

    // Update existing profile - only skills in supply
    // Note: Upstash Redis automatically handles JSON serialization
    const profile = typeof existingProfile === 'string'
      ? JSON.parse(existingProfile)
      : existingProfile;

    profile.supply = profile.supply || {};
    profile.supply.skills = skills;
    profile.updatedAt = new Date().toISOString();

    await redis.set(profileKey, profile);

    console.log(`[AUTO-SAVE-SKILLS] Updated ${skills.length} skills for ${email}`);

    return res.status(200).json({
      success: true,
      skillCount: skills.length
    });

  } catch (error) {
    console.error('[AUTO-SAVE-SKILLS] Error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save skills'
    });
  }
}
