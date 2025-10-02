# Analytics Integration Guide

This document describes how to integrate the analytics tracking middleware into LibreChat.

## Overview

The analytics system tracks:
- **Sessions**: Conversations with start/end timestamps
- **Interactions**: Individual chat messages with token counts and costs
- **Cost tracking**: Automatic cost calculation based on model usage

## Files Created

1. `/server/middleware/analytics-hook.js` - Express middleware for tracking
2. `/server/services/analytics-client.js` - HTTP client for analytics API

## Integration Steps

### 1. Environment Configuration

Add to `.env`:

```bash
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_TRACKER_URL=https://analytics-tracker.somotravel.workers.dev
```

### 2. Register Middleware in Routes

Find your main chat/messages route file (typically `api/server/routes/messages.js` or similar) and add:

```javascript
const {
  trackMessageInteraction,
  trackSessionStart,
  trackSessionEnd,
} = require('../../server/middleware/analytics-hook');

// Apply to message endpoints
router.post('/api/messages', trackMessageInteraction, messageController);
router.post('/api/chat', trackMessageInteraction, chatController);

// Apply to conversation endpoints
router.post('/api/conversations', trackSessionStart, conversationController);
router.delete('/api/conversations/:conversationId', trackSessionEnd, conversationController);
```

### 3. Manual Tracking (Optional)

For more granular control, use the analytics client directly:

```javascript
const analyticsClient = require('../services/analytics-client');

// Track custom interactions
await analyticsClient.trackInteraction({
  session_id: conversationId,
  user_id: userId,
  type: 'chat',
  model_name: 'gpt-4',
  prompt_tokens: 1000,
  completion_tokens: 500,
  metadata: { custom: 'data' }
});

// Track database operations
await analyticsClient.trackDbOperation({
  session_id: conversationId,
  user_id: userId,
  read_ops: 5,
  write_ops: 2
});

// Track external API calls
await analyticsClient.trackApiCall({
  session_id: conversationId,
  user_id: userId,
  call_count: 1,
  metadata: { api: 'openai', endpoint: '/v1/chat/completions' }
});
```

### 4. Health Check

Verify analytics service is available:

```javascript
const analyticsClient = require('../services/analytics-client');

const isHealthy = await analyticsClient.healthCheck();
console.log('Analytics service healthy:', isHealthy);
```

## How It Works

### Middleware Flow

1. **Request arrives** → Original request proceeds normally
2. **Response generated** → Response includes token usage (OpenAI format)
3. **Middleware intercepts** → Wraps `res.json()` to capture response data
4. **Async tracking** → Sends tracking data to analytics-tracker worker
5. **Original response sent** → Client receives response without delay

### Session Tracking

- **Session ID**: Extracted from `conversationId` (LibreChat's conversation identifier)
- **User ID**: Extracted from `req.user.id` (authentication middleware)
- **Start**: Tracked when conversation is created
- **End**: Tracked when conversation is deleted/archived

### Interaction Tracking

- **Type**: `chat` (default), `db`, `api`, or `cost-event`
- **Tokens**: Extracted from response `usage.prompt_tokens` and `usage.completion_tokens`
- **Model**: Extracted from response `model` or request `body.model`
- **Cost**: Automatically calculated by analytics-tracker using pricing cache

## Error Handling

The middleware is designed to **fail silently**:
- Analytics failures will NOT break your application
- All tracking happens asynchronously after the response is sent
- Errors are logged to console but don't affect user requests

## Testing

### Test Session Tracking

```bash
# Start session
curl -X POST http://localhost:3080/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Conversation"}'

# Should track session start in analytics
```

### Test Interaction Tracking

```bash
# Send message
curl -X POST http://localhost:3080/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "abc123",
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Should track interaction with token counts
```

### Verify in Dashboard

1. Navigate to Analytics Dashboard (once UI is deployed)
2. View sessions list for your user
3. Click session to see interaction details and costs

## Troubleshooting

### Analytics not tracking

1. Check `ANALYTICS_ENABLED=true` in `.env`
2. Verify `ANALYTICS_TRACKER_URL` is correct
3. Check console logs for errors
4. Test health check: `curl https://analytics-tracker.somotravel.workers.dev/health`

### Incorrect costs

1. Verify pricing cache is seeded (see database setup)
2. Check model name matches pricing cache entries
3. Run pricing sync worker to update rates

### Performance impact

- Tracking is **non-blocking** (runs after response sent)
- Default 5-second timeout on analytics requests
- Failed requests are logged but don't retry

## Architecture

```
LibreChat Request
      ↓
Analytics Middleware (intercept response)
      ↓
Analytics Client (HTTP request)
      ↓
Analytics Tracker Worker (Cloudflare)
      ↓
D1 Database (voygent-prod)
```

## Next Steps

After integration:
1. Deploy analytics-tracker and analytics-api workers
2. Run database migrations (`db/migrations/voygent-prod/`)
3. Seed pricing cache with initial rates
4. Build and deploy analytics dashboard UI
