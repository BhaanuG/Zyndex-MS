/**
 * Centralized Authentication & Navigation Redirect Helper
 * Manages redirect intents (Plan selection, Document reading, Protected Route recovery)
 */

export const REDIRECT_KEYS = {
  TARGET_URL: 'auth_redirect_target',
  SELECTED_PLAN: 'selected_plan_id',
  INTENT: 'auth_redirect_intent',
};

/**
 * Stores a redirect intent before logging in
 * @param {string} targetUrl - e.g. '/Profile/Billing/Pricing', '/Resource/5', '/Search?q=AI'
 * @param {object} options - { planId, type, metadata }
 */
export function setRedirectIntent(targetUrl, options = {}) {
  try {
    if (targetUrl) {
      sessionStorage.setItem(REDIRECT_KEYS.TARGET_URL, targetUrl);
    }
    if (options.planId) {
      sessionStorage.setItem(REDIRECT_KEYS.SELECTED_PLAN, options.planId);
    }
    if (options.type || options.metadata) {
      sessionStorage.setItem(
        REDIRECT_KEYS.INTENT,
        JSON.stringify({
          type: options.type || 'navigation',
          planId: options.planId || null,
          metadata: options.metadata || {},
          timestamp: Date.now(),
        })
      );
    }
  } catch (e) {
    console.error('Failed to set redirect intent:', e);
  }
}

/**
 * Retrieves the stored redirect target & plan intent
 */
export function getRedirectIntent() {
  try {
    const target = sessionStorage.getItem(REDIRECT_KEYS.TARGET_URL);
    const planId = sessionStorage.getItem(REDIRECT_KEYS.SELECTED_PLAN);
    const intentStr = sessionStorage.getItem(REDIRECT_KEYS.INTENT);
    const intent = intentStr ? JSON.parse(intentStr) : null;

    return {
      target,
      planId: planId || intent?.planId || null,
      intent,
    };
  } catch {
    return { target: null, planId: null, intent: null };
  }
}

/**
 * Clears stored redirect intent keys
 */
export function clearRedirectIntent() {
  try {
    sessionStorage.removeItem(REDIRECT_KEYS.TARGET_URL);
    sessionStorage.removeItem(REDIRECT_KEYS.SELECTED_PLAN);
    sessionStorage.removeItem(REDIRECT_KEYS.INTENT);
  } catch (e) {
    console.error('Failed to clear redirect intent:', e);
  }
}

/**
 * Resolves the final destination path for an authenticated user
 * @param {object} user - Authenticated user { name, email, role }
 * @param {string} overrideTarget - Optional override path
 * @returns {string} Final path to navigate to
 */
export function resolveAuthRedirectPath(user, overrideTarget = null) {
  if (!user) return '/Zyndex/User/Log-In';

  const safeName = encodeURIComponent((user.name || 'User').replace(/\s+/g, '-'));
  const safeEmail = encodeURIComponent(user.email || 'user@zyndex.com');
  const role = (user.role || 'user').toLowerCase();

  const { target: storedTarget, planId } = getRedirectIntent();
  const rawTarget = overrideTarget || storedTarget;

  // Admin routing
  if (role === 'admin') {
    if (rawTarget && typeof rawTarget === 'string') {
      if (rawTarget.includes('/Admin/')) {
        const match = rawTarget.match(/\/Zyndex\/Admin\/[^/]+\/[^/]+(\/.*)?$/);
        const subPath = match && match[1] ? match[1] : '';
        return `/Zyndex/Admin/${safeName}/${safeEmail}${subPath || '/Dashboard'}`;
      }
      if (rawTarget.startsWith('/Dashboard') || rawTarget.startsWith('/Upload-Resource') || rawTarget.startsWith('/Resource-Management') || rawTarget.startsWith('/User-Access') || rawTarget.startsWith('/Payments') || rawTarget.startsWith('/Feedback-Review') || rawTarget.startsWith('/Profile')) {
        return `/Zyndex/Admin/${safeName}/${safeEmail}${rawTarget}`;
      }
    }
    return `/Zyndex/Admin/${safeName}/${safeEmail}/Dashboard`;
  }

  // Regular user routing
  // 1. If a plan selection intent exists OR target is Pricing/Billing -> go straight to transactional Pricing
  if (planId || (rawTarget && (rawTarget.includes('Pricing') || rawTarget.includes('Billing')))) {
    return `/Zyndex/User/${safeName}/${safeEmail}/Profile/Billing/Pricing`;
  }

  // 2. If a specific target URL exists
  if (rawTarget && typeof rawTarget === 'string') {
    // If it's a full user path: /Zyndex/User/:name/:email/Resource/5
    if (rawTarget.includes('/Zyndex/User/')) {
      const match = rawTarget.match(/\/Zyndex\/User\/[^/]+\/[^/]+(\/.*)?$/);
      const subPath = match && match[1] ? match[1] : '';
      return `/Zyndex/User/${safeName}/${safeEmail}${subPath || '/Home'}`;
    }

    // If it's public browse or public categories, map to user home / search
    if (rawTarget.includes('/Resources/Browse') || rawTarget === '/Home') {
      return `/Zyndex/User/${safeName}/${safeEmail}/Home`;
    }

    if (rawTarget.includes('/Resources/Categories')) {
      return `/Zyndex/User/${safeName}/${safeEmail}/Home`;
    }

    // If it's a public informational page, user can either stay on it or go home
    if (rawTarget.startsWith('/Zyndex/About/') || rawTarget.startsWith('/Zyndex/Support/') || rawTarget.startsWith('/Zyndex/Legal/')) {
      return rawTarget;
    }

    // If it's a relative user subpath e.g. '/Resource/5', '/Search?q=AI', '/Profile/My-Favorites'
    if (rawTarget.startsWith('/')) {
      return `/Zyndex/User/${safeName}/${safeEmail}${rawTarget}`;
    }
  }

  // 3. Default fallback
  return `/Zyndex/User/${safeName}/${safeEmail}/Home`;
}
