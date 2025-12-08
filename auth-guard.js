// Authentication Guard for Admin Pages
(function() {
    'use strict';

    const STORAGE_KEY = 'radar_admin_token';
    const TOKEN_VERIFIED_KEY = 'radar_token_verified';
    const VERIFY_ENDPOINT = '/api/radar/verify-token';

    // Check if token is already stored and verified
    async function checkAuth() {
        const storedToken = localStorage.getItem(STORAGE_KEY);
        const verified = localStorage.getItem(TOKEN_VERIFIED_KEY);

        if (storedToken && verified === 'true') {
            // Verify token is still valid (in case it changed on server)
            try {
                const response = await fetch(VERIFY_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: storedToken })
                });
                const data = await response.json();
                if (data.valid) {
                    return true;
                }
            } catch (e) {
                // Network error, assume valid if previously verified
                return true;
            }
        }
        return false;
    }

    // Prompt for token and verify with API
    async function promptForToken() {
        const token = prompt('Admin-Token eingeben:');
        if (!token) return false;

        try {
            const response = await fetch(VERIFY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await response.json();

            if (data.valid) {
                localStorage.setItem(STORAGE_KEY, token);
                localStorage.setItem(TOKEN_VERIFIED_KEY, 'true');
                return true;
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            alert('Verbindungsfehler. Bitte später erneut versuchen.');
        }
        return false;
    }

    // Initialize authentication
    async function initAuth() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            const tokenValid = await promptForToken();
            if (!tokenValid) {
                document.body.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif;">
                        <div style="text-align: center; padding: 2rem;">
                            <h1 style="color: #dc2626;">Zugriff verweigert</h1>
                            <p style="color: #6b7280; margin-top: 1rem;">Ungültiges Admin-Token</p>
                            <button onclick="location.reload()" style="margin-top: 2rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">Erneut versuchen</button>
                        </div>
                    </div>
                `;
                throw new Error('Unauthorized access');
            } else {
                // Token valid, reload to show content
                location.reload();
            }
        }
    }

    // Export functions for use in pages
    window.AuthGuard = {
        init: initAuth,
        getToken: () => localStorage.getItem(STORAGE_KEY),
        logout: () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TOKEN_VERIFIED_KEY);
            location.reload();
        }
    };

    // Auto-initialize if not in module context
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAuth());
    } else {
        initAuth();
    }
})();