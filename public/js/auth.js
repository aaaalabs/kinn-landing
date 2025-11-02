/**
 * KINN Authentication Module
 * Client-side session management using localStorage
 *
 * Security Notes:
 * - Tokens stored in localStorage (acceptable for KINN's use case)
 * - XSS mitigation via CSP headers (configured in vercel.json)
 * - Tokens expire after 24 hours (enforced server-side)
 * - Session cleared on logout
 *
 * Usage:
 *   import { saveSession, getSession, isSessionValid, clearSession } from './auth.js';
 */

const SESSION_KEY = 'kinn_session';
const EMAIL_KEY = 'kinn_email';

/**
 * Save session to localStorage
 * @param {string} sessionToken - JWT session token (24h expiry)
 * @param {string} email - User email address
 */
export function saveSession(sessionToken, email) {
  try {
    localStorage.setItem(SESSION_KEY, sessionToken);
    localStorage.setItem(EMAIL_KEY, email);
    console.log('[AUTH] Session saved for:', email);
    return true;
  } catch (error) {
    console.error('[AUTH] Failed to save session:', error);
    return false;
  }
}

/**
 * Get current session from localStorage
 * @returns {Object|null} Session object with token and email, or null if no session
 */
export function getSession() {
  try {
    const token = localStorage.getItem(SESSION_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    if (!token || !email) {
      return null;
    }

    return { token, email };
  } catch (error) {
    console.error('[AUTH] Failed to get session:', error);
    return null;
  }
}

/**
 * Check if current session is valid
 * Validates JWT expiration by decoding token payload
 * @returns {boolean} True if session exists and is not expired
 */
export function isSessionValid() {
  const session = getSession();

  if (!session) {
    return false;
  }

  try {
    // Decode JWT payload (without verification - server will verify)
    const payload = JSON.parse(atob(session.token.split('.')[1]));

    // Check expiration (exp is in seconds, Date.now() is in milliseconds)
    const now = Math.floor(Date.now() / 1000);
    const isValid = payload.exp > now;

    if (!isValid) {
      console.log('[AUTH] Session expired');
      clearSession();
    }

    return isValid;
  } catch (error) {
    console.error('[AUTH] Failed to validate session:', error);
    clearSession();
    return false;
  }
}

/**
 * Clear session from localStorage (logout)
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EMAIL_KEY);
    console.log('[AUTH] Session cleared');
    return true;
  } catch (error) {
    console.error('[AUTH] Failed to clear session:', error);
    return false;
  }
}

/**
 * Redirect to dashboard if session is valid
 * Call this on landing page to auto-login returning users
 */
export function redirectToDashboard() {
  if (isSessionValid()) {
    console.log('[AUTH] Valid session found - redirecting to user portal');
    window.location.href = '/pages/profil.html';
    return true;
  }
  return false;
}

/**
 * Redirect to landing page
 * Call this when session expires or user logs out
 */
export function redirectToLanding() {
  console.log('[AUTH] Redirecting to landing page');
  window.location.href = '/';
}

/**
 * Get user email from session
 * @returns {string|null} Email if session exists, null otherwise
 */
export function getUserEmail() {
  const session = getSession();
  return session ? session.email : null;
}

/**
 * Get session token for API calls
 * @returns {string|null} Token if session exists, null otherwise
 */
export function getSessionToken() {
  const session = getSession();
  return session ? session.token : null;
}

/**
 * Initialize visit counter for PWA install prompts
 * Increments count on each page visit
 * @returns {number} Current visit count
 */
export function trackVisit() {
  try {
    const VISIT_COUNT_KEY = 'kinn_visit_count';
    const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(VISIT_COUNT_KEY, newCount.toString());
    console.log(`[AUTH] Visit count: ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('[AUTH] Failed to track visit:', error);
    return 1;
  }
}

/**
 * Get current visit count
 * @returns {number} Visit count
 */
export function getVisitCount() {
  try {
    const VISIT_COUNT_KEY = 'kinn_visit_count';
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  } catch (error) {
    console.error('[AUTH] Failed to get visit count:', error);
    return 0;
  }
}

/**
 * Check if user has dismissed PWA install prompt
 * @returns {boolean} True if dismissed
 */
export function isPWAPromptDismissed() {
  try {
    const PWA_DISMISSED_KEY = 'kinn_pwa_dismissed';
    const dismissedUntil = localStorage.getItem(PWA_DISMISSED_KEY);

    if (!dismissedUntil) {
      return false;
    }

    // Check if dismissal has expired (7 days)
    const now = Date.now();
    const dismissedTime = parseInt(dismissedUntil, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (now - dismissedTime > sevenDays) {
      localStorage.removeItem(PWA_DISMISSED_KEY);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[AUTH] Failed to check PWA dismiss status:', error);
    return false;
  }
}

/**
 * Dismiss PWA install prompt for 7 days
 */
export function dismissPWAPrompt() {
  try {
    const PWA_DISMISSED_KEY = 'kinn_pwa_dismissed';
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
    console.log('[AUTH] PWA prompt dismissed for 7 days');
    return true;
  } catch (error) {
    console.error('[AUTH] Failed to dismiss PWA prompt:', error);
    return false;
  }
}
