import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

// Initialize Sentry only when DSN is provided
if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      sendDefaultPii: true,
      attachStacktrace: true,
      maxBreadcrumbs: 50,
      release: process.env.APP_VERSION || '1.0.0'
    });
    console.log('[Sentry] ✅ Initialized');
  } catch (err) {
    console.error('[Sentry] ❌ Failed to initialize:', err.message);
  }
} else {
  console.log('[Sentry] ⚠️ Skipped - SENTRY_DSN not configured');
}

/**
 * Attach Sentry error handlers to Express app
 * Must be called after all routes/middleware but before server.listen()
 * @param {import('express').Application} app - Express application instance
 * 
 * Note: Sentry is fully initialized in instrument.js (imported first in server.js)
 * Express middleware setup is handled automatically by modern @sentry/node SDK
 * This function remains for backward compatibility but is no longer required
 */
export function attachSentryErrorHandlers(app) {
  if (!dsn) {
    // Silent no-op when Sentry not configured
    return;
  }

  try {
    // Modern @sentry/node (v8+) handles Express integration automatically
    // when instrument.js is imported first (which it is at line 2 of server.js)
    
    // Attempt to attach legacy error handler for older SDK versions
    if (Sentry.Handlers && Sentry.Handlers.errorHandler) {
      app.use(Sentry.Handlers.errorHandler());
      console.log('[Sentry] ✅ Legacy error handlers attached');
    } else {
      // Modern SDK - error handling is automatic via instrument.js
      console.log('[Sentry] ✅ Modern SDK - error handling active via instrument.js');
    }
  } catch (err) {
    // Non-fatal error - Sentry will still work via instrument.js
    console.log('[Sentry] Note: Express middleware auto-configured via instrument.js');
  }
}

/**
 * Initialize Sentry (legacy function for backward compatibility)
 * Sentry is already initialized at module load time and in instrument.js
 * @param {import('express').Application} app - Express application instance
 * @returns {boolean} - Whether Sentry is initialized
 */
export function initializeSentry(app) {
  // Sentry is already initialized at module level
  // This function exists for backward compatibility
  return !!dsn;
}

export default Sentry;
export { Sentry };