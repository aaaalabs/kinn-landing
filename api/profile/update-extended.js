import { verifyProfileToken } from '../utils/tokens.js';
import { updateProfileExtended, getMatchHints } from '../utils/redis.js';

/**
 * Updates extended user profile with supply/demand data
 *
 * [CP01] KISS: Single token type (30 days) for simplicity
 * [EH02] User-friendly error messages
 * [SC02] Input validation
 */
export default async function handler(req, res) {
  // Only accept PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT requests are accepted'
    });
  }

  try {
    const { token, identity, supply, demand, preferences } = req.body;

    // [SC02] Validate token
    if (!token) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Token is required'
      });
    }

    // Verify auth token (30 days validity)
    const email = verifyProfileToken(token);

    if (!email) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token ist ungültig oder abgelaufen'
      });
    }

    // [EH01] Log for debugging
    console.log('[PROFILE_UPDATE] Updating extended profile:', email);

    // Build profile data object
    const profileData = {};

    if (identity) {
      profileData.identity = {
        name: identity.name?.trim() || undefined,
        linkedIn: identity.linkedIn?.trim() || undefined,
        github: identity.github?.trim() || undefined,
        portfolio: identity.portfolio?.trim() || undefined,
        location: identity.location || undefined
      };
      // Remove undefined fields
      Object.keys(profileData.identity).forEach(key =>
        profileData.identity[key] === undefined && delete profileData.identity[key]
      );
    }

    if (supply) {
      profileData.supply = {
        skills: Array.isArray(supply.skills) ? supply.skills.map(s => s.toLowerCase().trim()) : undefined,
        experience: supply.experience || undefined,
        availability: supply.availability || undefined,
        canOffer: Array.isArray(supply.canOffer) ? supply.canOffer.map(o => o.toLowerCase().trim()) : undefined
      };
      // Remove undefined fields
      Object.keys(profileData.supply).forEach(key =>
        profileData.supply[key] === undefined && delete profileData.supply[key]
      );
    }

    if (demand) {
      profileData.demand = {
        seeking: Array.isArray(demand.seeking) ? demand.seeking.map(s => s.toLowerCase().trim()) : undefined,
        industries: Array.isArray(demand.industries) ? demand.industries.map(i => i.toLowerCase().trim()) : undefined,
        activeSearch: typeof demand.activeSearch === 'boolean' ? demand.activeSearch : undefined,
        interests: demand.interests?.trim() || undefined
      };
      // Remove undefined fields
      Object.keys(profileData.demand).forEach(key =>
        profileData.demand[key] === undefined && delete profileData.demand[key]
      );
    }

    if (preferences) {
      profileData.preferences = {};

      if (preferences.privacy) {
        profileData.preferences.privacy = {
          showInDirectory: typeof preferences.privacy.showInDirectory === 'boolean'
            ? preferences.privacy.showInDirectory
            : false,
          allowMatching: typeof preferences.privacy.allowMatching === 'boolean'
            ? preferences.privacy.allowMatching
            : false
        };
      }
    }

    // Update profile in Redis
    const updatedProfile = await updateProfileExtended(email, profileData);

    // Get match hints
    const matches = await getMatchHints(updatedProfile);

    // [EH01] Log success
    console.log('[PROFILE_UPDATE] Extended profile updated successfully:', email);

    // Return success with profile and matches
    return res.status(200).json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      profile: updatedProfile,
      matches: {
        count: matches.count,
        hints: matches.hints
      }
    });

  } catch (error) {
    // [EH01] Contextual logging
    console.error('[PROFILE_UPDATE] Error updating extended profile:', {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });

    // [EH02] User-friendly error response
    return res.status(500).json({
      error: 'Update failed',
      message: 'Profil konnte nicht aktualisiert werden. Bitte versuche es später erneut.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
