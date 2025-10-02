/**
 * Analytics Injection Script
 *
 * This script patches LibreChat at runtime to inject analytics middleware
 * without modifying the base image source code.
 *
 * It monkey-patches Express Router to intercept route registrations
 * and inject analytics middleware on relevant endpoints.
 */

const analyticsClient = require('./services/analytics-client');

// Only enable if configured
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED === 'true';

if (!ANALYTICS_ENABLED) {
  console.log('📊 Analytics disabled (ANALYTICS_ENABLED not set to true)');
  module.exports = () => {}; // No-op
  return;
}

console.log('📊 Injecting analytics middleware...');

// Track sessions in memory (simple in-memory cache)
const activeSessions = new Map();

/**
 * Extract user ID from request
 */
function getUserId(req) {
  return req.user?.id || req.headers['x-user-id'] || 'anonymous';
}

/**
 * Extract conversation ID from request/response
 */
function getConversationId(req, data) {
  return req.body?.conversationId ||
         req.params?.conversationId ||
         data?.conversationId ||
         req.query?.conversationId;
}

/**
 * Analytics middleware for chat messages
 */
function trackChatMessage(req, res, next) {
  const originalJson = res.json;

  res.json = function(data) {
    // Track asynchronously after response
    setImmediate(async () => {
      try {
        const conversationId = getConversationId(req, data);
        const userId = getUserId(req);

        // Track session start if new conversation
        if (conversationId && !activeSessions.has(conversationId)) {
          activeSessions.set(conversationId, { userId, startTime: Date.now() });
          await analyticsClient.trackSessionStart(conversationId, userId);
        }

        // Track interaction if usage data present
        if (data?.usage && conversationId) {
          await analyticsClient.trackInteraction({
            session_id: conversationId,
            user_id: userId,
            type: 'chat',
            model_name: req.body?.model || data?.model,
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            metadata: {
              endpoint: req.path,
              method: req.method
            }
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error.message);
      }
    });

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Inject analytics into Express app
 */
function injectAnalytics(app) {
  if (!app) {
    console.warn('⚠️  No Express app provided to injectAnalytics');
    return;
  }

  console.log('✅ Injecting analytics middleware into Express app');

  // Inject middleware on message endpoints
  const messagePaths = [
    '/api/messages',
    '/api/ask',
    '/api/ask/:conversationId',
    '/api/messages/:conversationId'
  ];

  messagePaths.forEach(path => {
    try {
      app.use(path, trackChatMessage);
      console.log(`  ✓ Analytics tracking on ${path}`);
    } catch (error) {
      console.error(`  ✗ Failed to inject analytics on ${path}:`, error.message);
    }
  });

  // Health check for analytics
  app.get('/api/analytics/health', async (req, res) => {
    const health = await analyticsClient.healthCheck();
    res.json({
      analytics_enabled: ANALYTICS_ENABLED,
      tracker_healthy: health,
      tracker_url: process.env.ANALYTICS_TRACKER_URL,
      active_sessions: activeSessions.size
    });
  });

  console.log('📊 Analytics injection complete');
}

module.exports = injectAnalytics;
