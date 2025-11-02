/**
 * PWA Install Prompt Module
 * Smart prompts for app installation based on user behavior
 *
 * Triggers:
 * - After 2nd visit
 * - After profile 50% complete
 * - Manual "Installieren" button in settings
 *
 * Features:
 * - Dismissable for 7 days
 * - Mobile-first design (bottom banner)
 * - Uses native browser install prompt
 */

import { getVisitCount, isPWAPromptDismissed, dismissPWAPrompt } from './auth.js';

let deferredPrompt = null;

/**
 * Initialize PWA install prompt
 * Call this on dashboard load
 */
export function initPWAInstallPrompt() {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Store the event so it can be triggered later
    deferredPrompt = e;

    console.log('[PWA] Install prompt available');

    // Check if we should show the prompt
    checkAndShowPrompt();
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    hideInstallPrompt();
  });
}

/**
 * Check conditions and show prompt if appropriate
 */
function checkAndShowPrompt() {
  // Don't show if already dismissed recently
  if (isPWAPromptDismissed()) {
    console.log('[PWA] Prompt dismissed recently, skipping');
    return;
  }

  // Don't show if app is already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('[PWA] App already installed, skipping prompt');
    return;
  }

  // Check visit count (show after 2nd visit)
  const visitCount = getVisitCount();

  if (visitCount >= 2) {
    console.log(`[PWA] Showing install prompt (visit count: ${visitCount})`);
    showInstallPrompt();
  }
}

/**
 * Show custom install prompt banner
 */
function showInstallPrompt() {
  // Check if prompt already exists
  if (document.getElementById('pwa-install-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #5ED9A6 0%, #4EC995 100%);
      padding: 1rem;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      animation: slideUp 0.3s ease-out;
    ">
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #000; margin-bottom: 0.25rem;">
          KINN als App installieren
        </div>
        <div style="font-size: 0.875rem; color: rgba(0,0,0,0.7);">
          Schnellerer Zugriff & Offline-Support
        </div>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button
          onclick="window.pwaInstallBanner.install()"
          style="
            background: #000;
            color: #fff;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9375rem;
            cursor: pointer;
            font-family: 'Work Sans', sans-serif;
          "
        >
          Installieren
        </button>
        <button
          onclick="window.pwaInstallBanner.dismiss()"
          style="
            background: rgba(255,255,255,0.2);
            color: #000;
            border: 1px solid rgba(0,0,0,0.2);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.9375rem;
            cursor: pointer;
            font-family: 'Work Sans', sans-serif;
          "
        >
          Später
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Expose functions to window for onclick handlers
  window.pwaInstallBanner = {
    install: handleInstall,
    dismiss: handleDismiss
  };
}

/**
 * Hide install prompt banner
 */
function hideInstallPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.animation = 'slideDown 0.3s ease-out forwards';
    setTimeout(() => {
      banner.remove();
      delete window.pwaInstallBanner;
    }, 300);
  }
}

/**
 * Handle install button click
 */
async function handleInstall() {
  if (!deferredPrompt) {
    console.error('[PWA] No install prompt available');
    alert('Installation nicht verfügbar. Bitte verwende ein unterstütztes Gerät/Browser.');
    return;
  }

  // Show the native install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  console.log(`[PWA] User response: ${outcome}`);

  if (outcome === 'accepted') {
    console.log('[PWA] User accepted the install prompt');
  } else {
    console.log('[PWA] User dismissed the install prompt');
    dismissPWAPrompt(); // Dismiss for 7 days
  }

  // Clear the deferredPrompt
  deferredPrompt = null;

  // Hide our custom banner
  hideInstallPrompt();
}

/**
 * Handle dismiss button click
 */
function handleDismiss() {
  dismissPWAPrompt(); // Dismiss for 7 days
  hideInstallPrompt();
  console.log('[PWA] Install prompt dismissed for 7 days');
}

/**
 * Check if profile is 50%+ complete and show prompt
 * Call this after profile data is loaded
 * @param {number} completionPercentage - Profile completion (0-100)
 */
export function checkProfileCompletion(completionPercentage) {
  if (completionPercentage >= 50 && !isPWAPromptDismissed() && deferredPrompt) {
    console.log(`[PWA] Profile ${completionPercentage}% complete - showing install prompt`);
    showInstallPrompt();
  }
}

/**
 * Manual install trigger (for settings page button)
 */
export async function triggerManualInstall() {
  if (!deferredPrompt) {
    alert('Die App ist bereits installiert oder dein Browser unterstützt keine Installation.');
    return false;
  }

  await handleInstall();
  return true;
}

// Add slideDown animation
const slideDownStyle = document.createElement('style');
slideDownStyle.textContent = `
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(slideDownStyle);
