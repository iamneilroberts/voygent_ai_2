/**
 * Analytics Client Service
 * Feature: Usage Analytics & Cost Monitoring Dashboard
 *
 * HTTP client for interacting with analytics-tracker Cloudflare Worker.
 * Provides methods to track sessions and interactions.
 */

const https = require('https');

// Configuration from environment variables
const ANALYTICS_TRACKER_URL =
  process.env.ANALYTICS_TRACKER_URL || 'https://analytics-tracker.somotravel.workers.dev';

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false'; // Enabled by default

/**
 * Make HTTP request to analytics tracker
 */
async function makeRequest(endpoint, method, body) {
  if (!ANALYTICS_ENABLED) {
    console.log('Analytics disabled, skipping tracking');
    return null;
  }

  const url = new URL(endpoint, ANALYTICS_TRACKER_URL);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Analytics API error: ${res.statusCode} - ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse analytics response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Analytics request failed: ${error.message}`));
    });

    // Set timeout to prevent hanging requests
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Analytics request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Start a new session
 */
async function startSession(params) {
  try {
    const response = await makeRequest('/v1/track/session/start', 'POST', {
      session_id: params.session_id,
      user_id: params.user_id,
      start_time: params.start_time || new Date().toISOString(),
      metadata: params.metadata || {},
    });

    console.log('Session started:', params.session_id);
    return response;
  } catch (error) {
    console.error('Failed to start session:', error.message);
    // Don't throw - analytics failures should not break the app
    return null;
  }
}

/**
 * End an existing session
 */
async function endSession(params) {
  try {
    const response = await makeRequest('/v1/track/session/end', 'POST', {
      session_id: params.session_id,
      end_time: params.end_time || new Date().toISOString(),
    });

    console.log('Session ended:', params.session_id);
    return response;
  } catch (error) {
    console.error('Failed to end session:', error.message);
    return null;
  }
}

/**
 * Track an interaction
 */
async function trackInteraction(params) {
  try {
    const payload = {
      session_id: params.session_id,
      user_id: params.user_id,
      type: params.type || 'chat',
      timestamp: params.timestamp || new Date().toISOString(),
      metadata: params.metadata || {},
    };

    // Add optional fields if provided
    if (params.model_name) payload.model_name = params.model_name;
    if (params.prompt_tokens !== undefined) payload.prompt_tokens = params.prompt_tokens;
    if (params.completion_tokens !== undefined) payload.completion_tokens = params.completion_tokens;
    if (params.db_read_ops !== undefined) payload.db_read_ops = params.db_read_ops;
    if (params.db_write_ops !== undefined) payload.db_write_ops = params.db_write_ops;
    if (params.api_call_count !== undefined) payload.api_call_count = params.api_call_count;
    if (params.compute_duration_ms !== undefined)
      payload.compute_duration_ms = params.compute_duration_ms;

    const response = await makeRequest('/v1/track/interaction', 'POST', payload);

    console.log('Interaction tracked:', {
      session: params.session_id,
      type: params.type,
      tokens: params.prompt_tokens + params.completion_tokens,
    });

    return response;
  } catch (error) {
    console.error('Failed to track interaction:', error.message);
    return null;
  }
}

/**
 * Track database operation
 */
async function trackDbOperation(params) {
  return trackInteraction({
    session_id: params.session_id,
    user_id: params.user_id,
    type: 'db',
    db_read_ops: params.read_ops || 0,
    db_write_ops: params.write_ops || 0,
    metadata: params.metadata || {},
  });
}

/**
 * Track API call
 */
async function trackApiCall(params) {
  return trackInteraction({
    session_id: params.session_id,
    user_id: params.user_id,
    type: 'api',
    api_call_count: params.call_count || 1,
    metadata: params.metadata || {},
  });
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const url = new URL('/health', ANALYTICS_TRACKER_URL);

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.status === 'ok');
            } catch {
              resolve(false);
            }
          });
        })
        .on('error', () => resolve(false));
    });
  } catch {
    return false;
  }
}

module.exports = {
  startSession,
  endSession,
  trackInteraction,
  trackDbOperation,
  trackApiCall,
  healthCheck,
};
