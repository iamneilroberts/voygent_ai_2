/**
 * Analytics Injection Script
 *
 * This script patches LibreChat at runtime to inject analytics middleware
 * without modifying the base image source code.
 *
 * It attaches our existing analytics middleware to key Express routes
 * so sessions and interactions are tracked without changing LibreChat core.
 */

const analyticsClient = require('./services/analytics-client');
const {
  trackMessageInteraction,
  trackSessionStart,
  trackSessionEnd,
} = require('./middleware/analytics-hook');

// Only enable if configured
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED === 'true';

if (!ANALYTICS_ENABLED) {
  console.log('📊 Analytics disabled (ANALYTICS_ENABLED not set to true)');
  module.exports = () => {}; // No-op
  return;
}

console.log('📊 Injecting analytics middleware (express monkey patch)...');

// Monkey-patch express() factory so any app created gets our middleware
const Module = require('module');
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'express') {
    const express = originalLoad.apply(this, arguments);

    const wrappedExpress = function wrappedExpress() {
      const app = express();

      try {
        // Message interaction tracking
        const messagePaths = [
          '/api/messages',
          '/api/ask',
          '/api/ask/:conversationId',
          '/api/messages/:conversationId',
          '/api/chat',
        ];
        messagePaths.forEach((path) => app.use(path, trackMessageInteraction));

        // Session lifecycle tracking
        app.post('/api/conversations', trackSessionStart);
        app.delete('/api/conversations/:conversationId', trackSessionEnd);

        // Health endpoint
        app.get('/api/analytics/health', async (req, res) => {
          const health = await analyticsClient.healthCheck();
          res.json({
            analytics_enabled: ANALYTICS_ENABLED,
            tracker_healthy: health,
            tracker_url: process.env.ANALYTICS_TRACKER_URL,
          });
        });

        console.log('✅ Analytics middleware attached to Express app');
      } catch (err) {
        console.error('⚠️  Failed to attach analytics middleware:', err?.message || err);
      }

      return app;
    };

    // Preserve express properties (Router, json, urlencoded, etc.)
    Object.assign(wrappedExpress, express);
    return wrappedExpress;
  }

  return originalLoad.apply(this, arguments);
};

module.exports = () => {};
