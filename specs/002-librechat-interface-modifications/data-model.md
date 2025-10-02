# Data Model: LibreChat Interface Modifications

**Feature**: 002-librechat-interface-modifications
**Version**: 1.0
**Date**: 2025-10-01

## Overview

This data model defines the state management, API contracts, and data structures required for token usage tracking, trip progress monitoring, and mode configuration in the Voygent LibreChat interface.

## 1. Client State (Recoil Atoms)

### 1.1 Token Usage State

```typescript
// store/voygent.ts

interface TokenUsageData {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  approximate?: boolean;
  price?: number;
  timestamp?: number;
}

export const voygentLastUsage = atom<TokenUsageData | null>({
  key: 'voygentLastUsage',
  default: null,
  effects: [
    ({ setSelf, onSet }) => {
      // Persist to localStorage
      const stored = localStorage.getItem('voygent_last_usage');
      if (stored) {
        setSelf(JSON.parse(stored));
      }

      onSet((newValue) => {
        if (newValue) {
          localStorage.setItem('voygent_last_usage', JSON.stringify(newValue));
        } else {
          localStorage.removeItem('voygent_last_usage');
        }
      });
    }
  ]
});

export const voygentCumulativeUsage = atom<TokenUsageData | null>({
  key: 'voygentCumulativeUsage',
  default: null,
});
```

### 1.2 Trip Progress State

```typescript
// store/voygent.ts

interface TripProgressData {
  tripId?: string;
  tripName?: string;
  dates?: string;
  phase?: 'Research' | 'Hotels' | 'Activities' | 'Booking' | 'Finalization';
  step?: number;
  totalSteps?: number;
  percent?: number;
  cost?: number;
  budget?: number;
  commission?: number;
  url?: string;
  lastUpdated?: number;
}

export const voygentTripProgress = atom<TripProgressData | null>({
  key: 'voygentTripProgress',
  default: null,
});
```

### 1.3 Status Display Configuration

```typescript
// store/voygent.ts

export type StatusVerbosity = 'minimal' | 'normal' | 'verbose';
export type StatusMode = 'auto' | 'tokens' | 'progress';

export const voygentStatusVerbosity = atomWithLocalStorage<StatusVerbosity>({
  key: 'voygentStatusVerbosity',
  default: 'normal',
});

export const voygentStatusMode = atomWithLocalStorage<StatusMode>({
  key: 'voygentStatusMode',
  default: 'auto', // Auto-switch between tokens and progress
});

export const voygentDefaultQuery = atom<string>({
  key: 'voygentDefaultQuery',
  default: '',
});
```

### 1.4 MCP Server Status

```typescript
// store/voygent.ts

interface MCPServerStatus {
  name: string;
  connected: boolean;
  healthy: boolean;
  lastCheck: number;
  error?: string;
}

export const voygentMCPStatus = atom<MCPServerStatus[]>({
  key: 'voygentMCPStatus',
  default: [
    { name: 'd1_database', connected: false, healthy: false, lastCheck: 0 },
    { name: 'prompt_instructions', connected: false, healthy: false, lastCheck: 0 },
    { name: 'template_document', connected: false, healthy: false, lastCheck: 0 },
    { name: 'web_fetch', connected: false, healthy: false, lastCheck: 0 },
    { name: 'document_publish', connected: false, healthy: false, lastCheck: 0 },
  ],
});

export const voygentMCPHealthy = selector<boolean>({
  key: 'voygentMCPHealthy',
  get: ({ get }) => {
    const status = get(voygentMCPStatus);
    return status.every(server => server.healthy);
  },
});
```

## 2. API Contracts

### 2.1 Token Usage Endpoint

**Endpoint**: `GET /api/voygent/token-usage`

**Query Parameters**:
- `conversationId` (optional): Return usage for specific conversation
- `cumulative` (optional): Return cumulative session usage

**Response** (200 OK):
```json
{
  "ok": true,
  "usage": {
    "model": "claude-3-5-sonnet-20241022",
    "inputTokens": 5243,
    "outputTokens": 1872,
    "totalTokens": 7115,
    "approximate": false,
    "price": 0.0437,
    "conversationId": "conv_abc123",
    "timestamp": 1738368000
  }
}
```

**Response** (204 No Content):
No usage data available.

**Response** (500 Error):
```json
{
  "ok": false,
  "error": "Failed to fetch token usage",
  "code": "USAGE_FETCH_ERROR"
}
```

### 2.2 Trip Progress Endpoint

**Endpoint**: `GET /api/voygent/trip-progress`

**Query Parameters**:
- `tripId` (optional): Specific trip ID
- `conversationId` (optional): Auto-detect trip from conversation context

**Response** (200 OK):
```json
{
  "ok": true,
  "progress": {
    "tripId": "trip_xyz789",
    "tripName": "April 2026 Scotland & Ireland",
    "dates": "Apr 15-28, 2026",
    "phase": "Hotels",
    "step": 3,
    "totalSteps": 5,
    "percent": 32,
    "cost": 4200.00,
    "budget": 8000.00,
    "commission": 420.00,
    "url": "https://somotravel.us/trip_xyz789.html",
    "lastUpdated": 1738368000
  }
}
```

**Response** (204 No Content):
No active trip in progress.

**Response** (404 Not Found):
```json
{
  "ok": false,
  "error": "Trip not found",
  "code": "TRIP_NOT_FOUND"
}
```

### 2.3 Combined Status Endpoint

**Endpoint**: `GET /api/voygent/status`

**Query Parameters**:
- `conversationId` (optional): Conversation context
- `include` (optional): Comma-separated list (`tokens`, `progress`, `mcp`)

**Response** (200 OK):
```json
{
  "ok": true,
  "tokens": {
    "model": "claude-3-5-sonnet-20241022",
    "inputTokens": 5243,
    "outputTokens": 1872,
    "approximate": false,
    "price": 0.0437
  },
  "progress": {
    "tripName": "April 2026 Scotland & Ireland",
    "phase": "Hotels",
    "percent": 32
  },
  "mcp": {
    "healthy": true,
    "servers": [
      { "name": "d1_database", "connected": true, "healthy": true },
      { "name": "prompt_instructions", "connected": true, "healthy": true },
      { "name": "template_document", "connected": true, "healthy": true },
      { "name": "web_fetch", "connected": true, "healthy": true },
      { "name": "document_publish", "connected": true, "healthy": true }
    ]
  }
}
```

### 2.4 MCP Health Check Endpoint

**Endpoint**: `GET /api/voygent/mcp-health`

**Response** (200 OK):
```json
{
  "ok": true,
  "healthy": true,
  "servers": [
    {
      "name": "d1_database",
      "url": "https://d1-database-prod.somotravel.workers.dev",
      "connected": true,
      "healthy": true,
      "latency": 45,
      "lastCheck": 1738368000
    },
    {
      "name": "prompt_instructions",
      "url": "https://prompt-instructions-d1-mcp.somotravel.workers.dev",
      "connected": true,
      "healthy": true,
      "latency": 38,
      "lastCheck": 1738368000
    }
  ]
}
```

## 3. Database Schema (D1)

### 3.1 Token Usage Tracking

```sql
CREATE TABLE IF NOT EXISTS token_usage_log (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  approximate BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_token_usage_conversation ON token_usage_log(conversation_id);
CREATE INDEX idx_token_usage_user ON token_usage_log(user_id);
CREATE INDEX idx_token_usage_created ON token_usage_log(created_at);
```

### 3.2 Model Pricing Configuration

```sql
CREATE TABLE IF NOT EXISTS model_pricing (
  model_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  input_price_per_1m REAL NOT NULL,
  output_price_per_1m REAL NOT NULL,
  effective_from INTEGER NOT NULL,
  effective_to INTEGER,
  created_at INTEGER NOT NULL
);

-- Seed data
INSERT INTO model_pricing VALUES
  ('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 3.00, 15.00, 1704067200, NULL, 1704067200),
  ('claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 0.80, 4.00, 1704067200, NULL, 1704067200);
```

### 3.3 Trip Progress Tracking

```sql
-- Already exists in voygent-prod schema
-- Ensure trips_v2 table has progress fields:
ALTER TABLE trips_v2 ADD COLUMN phase TEXT DEFAULT 'Research';
ALTER TABLE trips_v2 ADD COLUMN step INTEGER DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN total_steps INTEGER DEFAULT 5;
ALTER TABLE trips_v2 ADD COLUMN percent INTEGER DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN cost REAL DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN commission REAL DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN last_updated INTEGER;
```

## 4. Configuration Data

### 4.1 Model Pricing Lookup

```typescript
// customizations/pricing/model-pricing.ts

export interface ModelPricing {
  modelId: string;
  modelName: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    modelName: 'Claude 3.5 Sonnet',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  'claude-3-5-haiku-20241022': {
    modelId: 'claude-3-5-haiku-20241022',
    modelName: 'Claude 3.5 Haiku',
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    inputPricePer1M: 5.00,
    outputPricePer1M: 15.00,
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    modelName: 'GPT-4o Mini',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
  },
};

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    console.warn(`Pricing not found for model: ${modelId}`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M;

  return parseFloat((inputCost + outputCost).toFixed(6));
}
```

### 4.2 MCP Server Configuration

```typescript
// customizations/mcp/server-registry.ts

export interface MCPServerConfig {
  name: string;
  displayName: string;
  url: string;
  healthEndpoint: string;
  required: boolean;
  autoEnable: boolean;
}

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'd1_database',
    displayName: 'D1 Database',
    url: 'https://d1-database-prod.somotravel.workers.dev/sse',
    healthEndpoint: 'https://d1-database-prod.somotravel.workers.dev/health',
    required: true,
    autoEnable: true,
  },
  {
    name: 'prompt_instructions',
    displayName: 'Prompt Instructions',
    url: 'https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse',
    healthEndpoint: 'https://prompt-instructions-d1-mcp.somotravel.workers.dev/health',
    required: true,
    autoEnable: true,
  },
  {
    name: 'template_document',
    displayName: 'Template Document',
    url: 'https://template-document-mcp.somotravel.workers.dev/sse',
    healthEndpoint: 'https://template-document-mcp.somotravel.workers.dev/health',
    required: true,
    autoEnable: true,
  },
  {
    name: 'web_fetch',
    displayName: 'Web Fetch',
    url: 'https://web-fetch-mcp.somotravel.workers.dev/sse',
    healthEndpoint: 'https://web-fetch-mcp.somotravel.workers.dev/health',
    required: false,
    autoEnable: true,
  },
  {
    name: 'document_publish',
    displayName: 'Document Publisher',
    url: 'https://document-publish-mcp.somotravel.workers.dev/sse',
    healthEndpoint: 'https://document-publish-mcp.somotravel.workers.dev/health',
    required: false,
    autoEnable: true,
  },
];
```

## 5. Component Props Interfaces

### 5.1 StatusBar Component

```typescript
// components/StatusBar/types.ts

export interface StatusBarProps {
  // Optional overrides
  forceMode?: StatusMode;
  verbosity?: StatusVerbosity;
  className?: string;
}

export interface StatusPayload {
  ok?: boolean;

  // Token usage fields
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  approximate?: boolean;
  price?: number;

  // Trip progress fields
  tripId?: string;
  tripName?: string;
  dates?: string;
  phase?: string;
  step?: number;
  totalSteps?: number;
  percent?: number;
  cost?: number;
  budget?: number;
  commission?: number;
  url?: string;
}
```

### 5.2 MCP Status Indicator Component

```typescript
// components/MCPStatusIndicator/types.ts

export interface MCPStatusIndicatorProps {
  mode: 'minimal' | 'detailed' | 'hidden';
  showLatency?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface MCPServerHealth {
  name: string;
  displayName: string;
  connected: boolean;
  healthy: boolean;
  latency?: number;
  lastCheck: number;
  error?: string;
}
```

## 6. Data Flow

### 6.1 Token Usage Flow

```
AI Response
    ↓
LibreChat Backend (extract token metadata)
    ↓
POST /api/voygent/token-usage/log
    ↓
D1: token_usage_log table
    ↓
GET /api/voygent/token-usage (polling 15s)
    ↓
Recoil: voygentLastUsage atom
    ↓
StatusBar Component (display)
```

### 6.2 Trip Progress Flow

```
MCP Server Updates (d1_database, prompt_instructions)
    ↓
D1: trips_v2 table (phase, step, percent)
    ↓
GET /api/voygent/trip-progress (polling 15s)
    ↓
Recoil: voygentTripProgress atom
    ↓
StatusBar Component (display)
```

### 6.3 MCP Health Check Flow

```
App Startup
    ↓
MCP Health Check Service (every 30s)
    ↓
GET https://{server}/health (parallel requests)
    ↓
Recoil: voygentMCPStatus atom
    ↓
MCPStatusIndicator Component (display)
```

## 7. Caching Strategy

### 7.1 Client-Side Cache

**localStorage**:
- `voygent_last_usage`: Last token usage (persist across sessions)
- `voygent_status_verbosity`: User preference for display mode
- `voygent_status_mode`: Auto/tokens/progress toggle

**sessionStorage**:
- `voygent_cumulative_usage`: Cumulative session usage (clear on logout)

**In-Memory (Recoil)**:
- Poll intervals: 15s for status, 30s for health
- Cache TTL: 10s (staleTime)
- Refetch on window focus

### 7.2 Server-Side Cache

**Token usage**:
- Cache key: `token_usage:{conversationId}:latest`
- TTL: 60 seconds
- Invalidate on new AI response

**Trip progress**:
- Cache key: `trip_progress:{tripId}:latest`
- TTL: 30 seconds
- Invalidate on MCP database write

**MCP health**:
- Cache key: `mcp_health:all`
- TTL: 60 seconds
- Force refresh on user request

## 8. Validation Rules

### 8.1 Token Usage

```typescript
import { z } from 'zod';

export const TokenUsageSchema = z.object({
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  approximate: z.boolean().default(false),
  price: z.number().nonnegative(),
  conversationId: z.string().uuid(),
  timestamp: z.number().int().positive(),
});
```

### 8.2 Trip Progress

```typescript
export const TripProgressSchema = z.object({
  tripId: z.string().min(1),
  tripName: z.string().min(1).max(200),
  dates: z.string().optional(),
  phase: z.enum(['Research', 'Hotels', 'Activities', 'Booking', 'Finalization']),
  step: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive(),
  percent: z.number().int().min(0).max(100),
  cost: z.number().nonnegative(),
  budget: z.number().nonnegative(),
  commission: z.number().nonnegative(),
  url: z.string().url().optional(),
});
```

## 9. Error Handling

### 9.1 Token Usage Errors

| Error Code | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| `USAGE_FETCH_ERROR` | 500 | Failed to fetch token usage | Retry, fallback to local cache |
| `PRICING_NOT_FOUND` | 404 | Model pricing not configured | Display "Unknown" cost |
| `INVALID_CONVERSATION` | 400 | Conversation ID invalid | Clear state, refresh |

### 9.2 Trip Progress Errors

| Error Code | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| `TRIP_NOT_FOUND` | 404 | Trip ID does not exist | Hide progress indicator |
| `PROGRESS_UPDATE_FAILED` | 500 | Failed to update progress | Retry, show stale data |

### 9.3 MCP Health Errors

| Error Code | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| `MCP_SERVER_DOWN` | 503 | Server unreachable | Show warning, retry |
| `MCP_TIMEOUT` | 504 | Health check timeout | Mark degraded |
| `MCP_AUTH_FAILED` | 401 | Authentication failure | Block conversation |

## 10. Performance Considerations

### 10.1 Polling Optimization

- Use exponential backoff on errors (15s → 30s → 60s)
- Pause polling when tab backgrounded
- Batch multiple status requests into single endpoint
- Use Server-Sent Events for real-time updates (future)

### 10.2 Data Size

- Token usage payload: ~150 bytes
- Trip progress payload: ~300 bytes
- MCP health payload: ~500 bytes
- Total per poll: ~950 bytes (negligible)

### 10.3 Database Queries

- Token usage: Single query with `conversationId` index
- Trip progress: Single query with `tripId` index
- Avoid N+1 queries by batching status requests
