// ============================================================
// APP CONFIGURATION
// Change your church name and branding in ONE place
// ============================================================

export const APP_CONFIG = {
  // ── Church Information ──────────────────────────────────────
  churchName: 'CIDC Budapest',
  churchFullName: 'Candle In The Dark Church Budapest',
  // churchTagline: 'A community of faith, prayer, and fellowship',
  
  // ── Contact Information ─────────────────────────────────────
  churchEmail: 'info@cidcbudapest.com',
  churchPhone: '+36 XX XXX XXXX',
  churchAddress: 'Budapest, Hungary',
  
  // ── Branding ────────────────────────────────────────────────
  // Primary color (used in buttons, headers, etc.)
  primaryColor: 'slate', // slate, blue, purple, green, etc.
  
  // ── Features ────────────────────────────────────────────────
  features: {
    prayers: true,
    basonta: true,
    bancenta: true,
    shepherding: true,
    announcements: true,
    firstTimers: true,
  },
  
  // ── Footer ──────────────────────────────────────────────────
  footerText: 'Church Prayer Management System',
  copyrightYear: new Date().getFullYear(),
  
  // ── Meta Information (for SEO) ──────────────────────────────
  meta: {
    title: 'CIDC Budapest - Prayer Management',
    description: 'Prayer request and church management system for CIDC Budapest',
    keywords: 'church, prayer, budapest, CIDC, management',
  }
}

// ── Helper Functions ────────────────────────────────────────────

/**
 * Get church name in different formats
 */
export const getChurchName = {
  // Short name: "CIDC Budapest"
  short: () => APP_CONFIG.churchName,
  
  // Full name: "Christ Is Deliverance Church Budapest"
  full: () => APP_CONFIG.churchFullName,
  
  // With tagline: "CIDC Budapest - A community of faith..."
  withTagline: () => `${APP_CONFIG.churchName} - ${APP_CONFIG.churchTagline}`,
}

/**
 * Get page title formatted
 * @param pageTitle - The specific page title
 * @returns Formatted title like "Prayer Requests | CIDC Budapest"
 */
export const getPageTitle = (pageTitle?: string) => {
  if (!pageTitle) return APP_CONFIG.churchName
  return `${pageTitle} | ${APP_CONFIG.churchName}`
}

/**
 * Check if a feature is enabled
 * @param feature - Feature name
 * @returns boolean
 */
export const isFeatureEnabled = (feature: keyof typeof APP_CONFIG.features) => {
  return APP_CONFIG.features[feature]
}

// ── Export Default ──────────────────────────────────────────────

export default APP_CONFIG