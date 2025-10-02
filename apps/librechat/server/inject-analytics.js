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

        // Core instructions endpoint for /voygent feature
        const fs = require('fs').promises;
        const path = require('path');
        app.get('/api/config/core-instructions', async (req, res) => {
          try {
            const filePath = path.join(__dirname, '../config/core-instructions.md');
            const content = await fs.readFile(filePath, 'utf-8');
            res.set('Content-Type', 'text/markdown; charset=utf-8');
            res.set('Cache-Control', 'public, max-age=3600');
            res.send(content);
          } catch (error) {
            if (error.code === 'ENOENT') {
              return res.status(404).json({
                error: 'Core instructions file not found',
                code: 'CONFIG_NOT_FOUND',
                message: 'The core-instructions.md configuration file is missing'
              });
            }
            console.error('Error serving core instructions:', error);
            res.status(500).json({
              error: 'Internal server error',
              code: 'READ_ERROR',
              message: 'Failed to read core instructions file'
            });
          }
        });

        console.log('✅ Analytics middleware and core instructions endpoint attached to Express app');
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
