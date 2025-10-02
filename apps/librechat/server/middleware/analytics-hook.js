/**
 * Analytics Tracking Middleware
 * Feature: Usage Analytics & Cost Monitoring Dashboard
 *
 * Intercepts LibreChat API requests to track usage analytics.
 * Tracks chat interactions with token counts and associates them with user sessions.
 */

const analyticsClient = require('../services/analytics-client');

/**
 * Extract session ID from conversation context
 * Uses conversationId as session identifier
 */
function extractSessionId(req) {
  // Try multiple sources for session ID
  if (req.body?.conversationId) {
    return req.body.conversationId;
  }

  if (req.params?.conversationId) {
    return req.params.conversationId;
  }

  if (req.query?.conversationId) {
    return req.query.conversationId;
  }

  // Fallback: generate new session ID
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract user ID from request
 */
function extractUserId(req) {
  // LibreChat stores user in req.user (from auth middleware)
  if (req.user?.id) {
    return req.user.id;
  }

  if (req.user?._id) {
    return req.user._id.toString();
  }

  // Fallback for development/testing
  return 'anonymous';
}

/**
 * Middleware to track message interactions
 * Attaches to POST /api/messages or similar endpoints
 */
async function trackMessageInteraction(req, res, next) {
  // Store original json method to capture response
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Track interaction asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const sessionId = extractSessionId(req);
        const userId = extractUserId(req);

        // Extract token usage from response (OpenAI format)
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const modelName = data.model || req.body?.model || 'unknown';

        // Only track if we have actual token usage
        if (promptTokens > 0 || completionTokens > 0) {
          await analyticsClient.trackInteraction({
            session_id: sessionId,
            user_id: userId,
            type: 'chat',
            model_name: modelName,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            metadata: {
              endpoint: req.path,
              method: req.method,
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('Analytics tracking error:', error);
      }
    });

    // Return original response
    return originalJson(data);
  };

  next();
}

/**
 * Middleware to track session start
 * Attaches to conversation creation endpoints
 */
async function trackSessionStart(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Track session start asynchronously
    setImmediate(async () => {
      try {
        const sessionId = data.conversationId || extractSessionId(req);
        const userId = extractUserId(req);

        await analyticsClient.startSession({
          session_id: sessionId,
          user_id: userId,
          metadata: {
            endpoint: req.path,
            created_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Session start tracking error:', error);
      }
    });

    return originalJson(data);
  };

  next();
}

/**
 * Middleware to track session end
 * Attaches to conversation deletion/archival endpoints
 */
async function trackSessionEnd(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Track session end asynchronously
    setImmediate(async () => {
      try {
        const sessionId = extractSessionId(req);

        await analyticsClient.endSession({
          session_id: sessionId,
        });
      } catch (error) {
        console.error('Session end tracking error:', error);
      }
    });

    return originalJson(data);
  };

  next();
}

/**
 * Error handling wrapper for analytics middleware
 * Ensures analytics failures don't break the application
 */
function safeAnalyticsMiddleware(middleware) {
  return async (req, res, next) => {
    try {
      await middleware(req, res, next);
    } catch (error) {
      // Log error and continue without blocking
      console.error('Analytics middleware error:', error);
      next();
    }
  };
}

module.exports = {
  trackMessageInteraction: safeAnalyticsMiddleware(trackMessageInteraction),
  trackSessionStart: safeAnalyticsMiddleware(trackSessionStart),
  trackSessionEnd: safeAnalyticsMiddleware(trackSessionEnd),
};
