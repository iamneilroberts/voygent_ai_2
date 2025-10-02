# Usage Analytics Data Model

**Feature**: Usage Analytics & Cost Monitoring Dashboard
**Database**: voygent-prod (Cloudflare D1 / SQLite)
**Last Updated**: 2025-10-02

---

## Overview

This document defines the complete database schema for tracking user sessions, interactions, and cost estimates in the Voygent v2 system. The design follows research decisions from [research.md](research.md):

- **Decision #1**: Separate `*_active` and `*_archive` tables for hot/cold data (90-day cutoff)
- **Decision #2**: Hybrid normalized + JSON metadata columns
- **Decision #3**: Timestamp-based indexing for 36K rows/year scale
- **Decision #4**: INTEGER micro-cents storage for exact cost arithmetic
- **Decision #5**: LibreChat `conversationId` as session identifier

---

## Schema Diagram

```
┌─────────────────────┐
│  sessions_active    │
│  sessions_archive   │
├─────────────────────┤
│ • id (PK)           │
│ • user_id           │◄────┐
│ • start_time        │     │
│ • end_time          │     │
│ • metadata (JSON)   │     │
└─────────────────────┘     │
                            │
┌─────────────────────┐     │
│ interactions_active │     │
│ interactions_archive│     │
├─────────────────────┤     │
│ • id (PK)           │     │
│ • session_id (FK) ──┼─────┘
│ • user_id           │
│ • timestamp         │
│ • type              │
│ • model_name        │
│ • token_count       │
│ • duration_ms       │
│ • *_cost_mc (INT)   │◄────┐
│ • *_cost (REAL gen) │     │
│ • metadata (JSON)   │     │
│ • status            │     │
└─────────────────────┘     │
                            │
┌─────────────────────┐     │
│  cost_estimates     │     │
│  cost_estimates_arc │     │
├─────────────────────┤     │
│ • id (PK)           │     │
│ • interaction_id ───┼─────┘
│ • ai_tokens_cost_mc │
│ • db_ops_cost_mc    │
│ • api_calls_cost_mc │
│ • compute_cost_mc   │
│ • total_cost_mc     │
│ • calculation_ver   │
└─────────────────────┘

┌─────────────────────┐
│   pricing_cache     │
├─────────────────────┤
│ • id (PK)           │
│ • provider          │
│ • model_name        │
│ • unit_type         │
│ • cost_per_unit_mc  │
│ • effective_date    │
│ • expires_at        │
└─────────────────────┘
```

---

## Table Definitions

### 1. Sessions (Active)

Tracks active user sessions (last 90 days). A session corresponds to a LibreChat conversation thread.

```sql
CREATE TABLE sessions_active (
  -- Identity
  id TEXT PRIMARY KEY,  -- LibreChat conversationId (UUID)
  user_id TEXT NOT NULL,  -- LibreChat user.id from JWT

  -- Timestamps
  start_time TEXT NOT NULL,  -- ISO 8601: '2025-10-02T14:30:00.000Z'
  end_time TEXT,  -- NULL = session still active

  -- Aggregated metrics (denormalized for dashboard performance)
  total_interactions INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,  -- Micro-cents (sum of all interactions)
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,

  -- Flexible metadata
  metadata TEXT,  -- JSON: {ip_address, user_agent, client_version, ...}

  -- Audit
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_sessions_active_user_time
  ON sessions_active(user_id, start_time DESC);

CREATE INDEX idx_sessions_active_start_time
  ON sessions_active(start_time DESC);

CREATE INDEX idx_sessions_active_end_time
  ON sessions_active(end_time)
  WHERE end_time IS NULL;  -- Partial index for active sessions

-- Triggers
CREATE TRIGGER sessions_active_update_timestamp
  AFTER UPDATE ON sessions_active
  FOR EACH ROW
  BEGIN
    UPDATE sessions_active
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
  END;
```

**Metadata JSON Schema** (TypeScript reference):
```typescript
interface SessionMetadata {
  ip_address?: string;
  user_agent?: string;
  client_version?: string;
  endpoint?: string;  // LibreChat endpoint (e.g., 'openAI', 'anthropic')
  preset_id?: string;  // LibreChat preset/assistant ID
}
```

### 2. Sessions (Archive)

Identical schema to `sessions_active` for data older than 90 days.

```sql
CREATE TABLE sessions_archive (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  total_interactions INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Same indexes as active table
CREATE INDEX idx_sessions_archive_user_time
  ON sessions_archive(user_id, start_time DESC);

CREATE INDEX idx_sessions_archive_start_time
  ON sessions_archive(start_time DESC);
```

### 3. Sessions (Unified View)

Transparent access to both active and archived sessions.

```sql
CREATE VIEW sessions_all AS
  SELECT
    id, user_id, start_time, end_time,
    total_interactions, total_cost_mc, total_cost,
    metadata, created_at, updated_at,
    NULL as archived_at,
    'active' as data_source
  FROM sessions_active
  UNION ALL
  SELECT
    id, user_id, start_time, end_time,
    total_interactions, total_cost_mc, total_cost,
    metadata, created_at, updated_at,
    archived_at,
    'archive' as data_source
  FROM sessions_archive;
```

---

### 4. Interactions (Active)

Tracks individual user interactions within sessions (last 90 days).

```sql
CREATE TABLE interactions_active (
  -- Identity
  id TEXT PRIMARY KEY,  -- UUID v7 (time-sortable)
  session_id TEXT NOT NULL,  -- FK to sessions_active.id
  user_id TEXT NOT NULL,  -- Denormalized for query performance

  -- Timing
  timestamp TEXT NOT NULL,  -- ISO 8601
  duration_ms INTEGER,  -- NULL if instant operation

  -- Classification
  type TEXT NOT NULL,  -- 'chat' | 'db' | 'api' | 'cost-event'
  status TEXT DEFAULT 'completed',  -- 'completed' | 'failed' | 'timeout'

  -- AI-specific fields (NULL for non-chat interactions)
  model_name TEXT,  -- e.g., 'gpt-4-turbo', 'claude-3-5-sonnet'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  token_count INTEGER GENERATED ALWAYS AS (
    COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)
  ) STORED,

  -- Cost breakdown (normalized for fast aggregation)
  ai_tokens_cost_mc INTEGER DEFAULT 0,  -- Micro-cents
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,

  -- Generated REAL columns for sorting/display
  ai_tokens_cost REAL GENERATED ALWAYS AS (ai_tokens_cost_mc / 100000.0) STORED,
  db_ops_cost REAL GENERATED ALWAYS AS (db_ops_cost_mc / 100000.0) STORED,
  api_calls_cost REAL GENERATED ALWAYS AS (api_calls_cost_mc / 100000.0) STORED,
  compute_time_cost REAL GENERATED ALWAYS AS (compute_time_cost_mc / 100000.0) STORED,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,

  -- Flexible metadata (JSON)
  metadata TEXT,  -- {request_id, tool_name, error_code, cache_hit, ...}

  -- Audit
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Constraints
  FOREIGN KEY (session_id) REFERENCES sessions_active(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_interactions_active_timestamp
  ON interactions_active(timestamp DESC);

CREATE INDEX idx_interactions_active_session
  ON interactions_active(session_id, timestamp DESC);

CREATE INDEX idx_interactions_active_user_time
  ON interactions_active(user_id, timestamp DESC);

-- Covering index for cost analytics (index-only scans)
CREATE INDEX idx_interactions_active_cost_analytics
  ON interactions_active(timestamp, user_id, type, total_cost_mc);

-- Covering index for session rollups
CREATE INDEX idx_interactions_active_session_rollup
  ON interactions_active(session_id, total_cost_mc);

-- Expression index for JSON queries (add only if needed)
-- CREATE INDEX idx_interactions_tool_name
--   ON interactions_active(json_extract(metadata, '$.tool_name'));
```

**Metadata JSON Schema** (TypeScript reference):
```typescript
interface InteractionMetadata {
  request_id?: string;  // LibreChat message ID
  tool_name?: string;  // For 'api' type: MCP tool name
  error_code?: string;  // For 'failed' status
  error_message?: string;
  cache_hit?: boolean;  // LLM response from cache
  retry_count?: number;
  mcp_server?: string;  // For 'api' type: MCP server name
  db_operation?: 'read' | 'write';  // For 'db' type
  db_rows_affected?: number;
}
```

**Type Enum Values**:
- `chat`: User message to AI assistant (counts tokens, model costs)
- `db`: Database operation via MCP server (counts D1 read/write costs)
- `api`: External API call via MCP tool (counts API provider costs)
- `cost-event`: Manual cost adjustment or correction

### 5. Interactions (Archive)

Identical schema to `interactions_active` for data older than 90 days.

```sql
CREATE TABLE interactions_archive (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration_ms INTEGER,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  model_name TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  token_count INTEGER GENERATED ALWAYS AS (
    COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)
  ) STORED,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  ai_tokens_cost REAL GENERATED ALWAYS AS (ai_tokens_cost_mc / 100000.0) STORED,
  db_ops_cost REAL GENERATED ALWAYS AS (db_ops_cost_mc / 100000.0) STORED,
  api_calls_cost REAL GENERATED ALWAYS AS (api_calls_cost_mc / 100000.0) STORED,
  compute_time_cost REAL GENERATED ALWAYS AS (compute_time_cost_mc / 100000.0) STORED,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (session_id) REFERENCES sessions_archive(id) ON DELETE CASCADE
);

-- Same indexes as active table
CREATE INDEX idx_interactions_archive_timestamp
  ON interactions_archive(timestamp DESC);

CREATE INDEX idx_interactions_archive_session
  ON interactions_archive(session_id, timestamp DESC);

CREATE INDEX idx_interactions_archive_user_time
  ON interactions_archive(user_id, timestamp DESC);

CREATE INDEX idx_interactions_archive_cost_analytics
  ON interactions_archive(timestamp, user_id, type, total_cost_mc);
```

### 6. Interactions (Unified View)

```sql
CREATE VIEW interactions_all AS
  SELECT
    id, session_id, user_id, timestamp, duration_ms,
    type, status, model_name, prompt_tokens, completion_tokens, token_count,
    ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc, compute_time_cost_mc, total_cost_mc,
    ai_tokens_cost, db_ops_cost, api_calls_cost, compute_time_cost, total_cost,
    metadata, created_at,
    NULL as archived_at,
    'active' as data_source
  FROM interactions_active
  UNION ALL
  SELECT
    id, session_id, user_id, timestamp, duration_ms,
    type, status, model_name, prompt_tokens, completion_tokens, token_count,
    ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc, compute_time_cost_mc, total_cost_mc,
    ai_tokens_cost, db_ops_cost, api_calls_cost, compute_time_cost, total_cost,
    metadata, created_at,
    archived_at,
    'archive' as data_source
  FROM interactions_archive;
```

---

### 7. Cost Estimates (Active)

Detailed cost breakdown snapshots. Used when cost calculation requires auditing or versioning.

```sql
CREATE TABLE cost_estimates (
  -- Identity
  id TEXT PRIMARY KEY,  -- UUID
  interaction_id TEXT NOT NULL,  -- FK to interactions_active.id

  -- Cost factors (micro-cents)
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,

  -- Calculation metadata
  calculation_version TEXT NOT NULL,  -- e.g., 'v1.2.0'
  calculation_method TEXT,  -- JSON: {formula, provider_rates_used, ...}
  currency TEXT DEFAULT 'USD',

  -- Audit
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Constraints
  FOREIGN KEY (interaction_id) REFERENCES interactions_active(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_cost_estimates_interaction
  ON cost_estimates(interaction_id);

CREATE INDEX idx_cost_estimates_created
  ON cost_estimates(created_at DESC);
```

**Notes**:
- This table is **optional** for Phase 1. Cost data is denormalized into `interactions_active` for performance.
- Use this table if you need to store multiple cost calculation attempts (e.g., before/after pricing updates).
- For most queries, `interactions_active.*_cost_mc` is sufficient.

### 8. Cost Estimates (Archive)

```sql
CREATE TABLE cost_estimates_archive (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  calculation_version TEXT NOT NULL,
  calculation_method TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (interaction_id) REFERENCES interactions_archive(id) ON DELETE CASCADE
);

CREATE INDEX idx_cost_estimates_archive_interaction
  ON cost_estimates_archive(interaction_id);
```

---

### 9. Pricing Cache

Stores synchronized pricing rates from provider APIs (OpenAI, Cloudflare, etc.).

```sql
CREATE TABLE pricing_cache (
  -- Identity
  id TEXT PRIMARY KEY,  -- UUID
  provider TEXT NOT NULL,  -- 'openai' | 'anthropic' | 'cloudflare' | 'custom'
  model_name TEXT,  -- NULL for provider-level rates (e.g., D1 row pricing)
  unit_type TEXT NOT NULL,  -- 'token' | 'row' | 'request' | 'gb-second'

  -- Pricing (micro-cents per unit)
  cost_per_unit_mc INTEGER NOT NULL,  -- e.g., 10 = $0.00010/token
  currency TEXT DEFAULT 'USD',

  -- Versioning
  effective_date TEXT NOT NULL,  -- ISO 8601: when this rate became active
  expires_at TEXT,  -- NULL = no expiration
  is_active INTEGER DEFAULT 1,  -- 0 = superseded by newer rate

  -- Source metadata
  source_url TEXT,  -- API endpoint or documentation URL
  metadata TEXT,  -- JSON: {tier, region, rate_limit_tier, ...}

  -- Audit
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE UNIQUE INDEX idx_pricing_cache_active_rate
  ON pricing_cache(provider, model_name, unit_type, effective_date)
  WHERE is_active = 1;

CREATE INDEX idx_pricing_cache_provider_model
  ON pricing_cache(provider, model_name);

CREATE INDEX idx_pricing_cache_effective_date
  ON pricing_cache(effective_date DESC);

-- Triggers
CREATE TRIGGER pricing_cache_update_timestamp
  AFTER UPDATE ON pricing_cache
  FOR EACH ROW
  BEGIN
    UPDATE pricing_cache
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
  END;
```

**Example Rows**:
```sql
-- OpenAI GPT-4 Turbo (as of 2025-10-02)
INSERT INTO pricing_cache VALUES (
  'uuid-1', 'openai', 'gpt-4-turbo-2024-04-09', 'token',
  10, 'USD',  -- $0.00010 per prompt token
  '2024-04-09T00:00:00Z', NULL, 1,
  'https://openai.com/api/pricing',
  '{"token_type": "prompt", "tier": "standard"}',
  datetime('now'), datetime('now')
);

-- Cloudflare D1 read pricing
INSERT INTO pricing_cache VALUES (
  'uuid-2', 'cloudflare', NULL, 'row',
  0, 'USD',  -- First 5B rows/day free, then $0.001/1000 rows
  '2025-01-01T00:00:00Z', NULL, 1,
  'https://developers.cloudflare.com/d1/pricing/',
  '{"operation": "read", "free_tier": 5000000000}',
  datetime('now'), datetime('now')
);
```

---

## Relationships and Constraints

### Foreign Key Relationships

```sql
-- Interactions reference Sessions (cascade delete)
interactions_active.session_id → sessions_active.id (ON DELETE CASCADE)
interactions_archive.session_id → sessions_archive.id (ON DELETE CASCADE)

-- Cost Estimates reference Interactions (cascade delete)
cost_estimates.interaction_id → interactions_active.id (ON DELETE CASCADE)
cost_estimates_archive.interaction_id → interactions_archive.id (ON DELETE CASCADE)
```

### Referential Integrity

D1 supports foreign keys but **does not enforce them by default**. Enable enforcement:

```sql
PRAGMA foreign_keys = ON;
```

**Migration Note**: Include this in all migration files and Worker startup scripts.

---

## Archival Strategy

### Archival Process (Daily Cron Job)

Runs at 02:00 UTC via Cloudflare Workers scheduled trigger.

```sql
-- 1. Archive sessions older than 90 days
INSERT INTO sessions_archive
SELECT
  id, user_id, start_time, end_time,
  total_interactions, total_cost_mc, total_cost,
  metadata, created_at, updated_at,
  datetime('now') as archived_at
FROM sessions_active
WHERE start_time < datetime('now', '-90 days');

-- 2. Archive related interactions (cascading archival)
INSERT INTO interactions_archive
SELECT
  id, session_id, user_id, timestamp, duration_ms,
  type, status, model_name, prompt_tokens, completion_tokens, token_count,
  ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc,
  compute_time_cost_mc, total_cost_mc,
  ai_tokens_cost, db_ops_cost, api_calls_cost,
  compute_time_cost, total_cost,
  metadata, created_at,
  datetime('now') as archived_at
FROM interactions_active
WHERE session_id IN (
  SELECT id FROM sessions_active
  WHERE start_time < datetime('now', '-90 days')
);

-- 3. Archive cost estimates (if used)
INSERT INTO cost_estimates_archive
SELECT
  id, interaction_id,
  ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc,
  compute_time_cost_mc, total_cost_mc,
  calculation_version, calculation_method, currency,
  created_at,
  datetime('now') as archived_at
FROM cost_estimates
WHERE interaction_id IN (
  SELECT id FROM interactions_active
  WHERE session_id IN (
    SELECT id FROM sessions_active
    WHERE start_time < datetime('now', '-90 days')
  )
);

-- 4. Delete from active tables (in reverse FK order)
DELETE FROM cost_estimates
WHERE interaction_id IN (
  SELECT id FROM interactions_active
  WHERE session_id IN (
    SELECT id FROM sessions_active
    WHERE start_time < datetime('now', '-90 days')
  )
);

DELETE FROM interactions_active
WHERE session_id IN (
  SELECT id FROM sessions_active
  WHERE start_time < datetime('now', '-90 days')
);

DELETE FROM sessions_active
WHERE start_time < datetime('now', '-90 days');
```

**Transaction Wrapper**: Entire archival process runs in a single transaction to ensure atomicity.

---

## Performance Considerations

### Expected Query Patterns

Based on FR-015 to FR-022 (dashboard filtering and display):

1. **Session List (Date Range)**:
   ```sql
   SELECT id, user_id, start_time, end_time,
          total_interactions, total_cost
   FROM sessions_active
   WHERE start_time BETWEEN ? AND ?
   ORDER BY start_time DESC
   LIMIT 50;
   ```
   **Index Used**: `idx_sessions_active_start_time`
   **Expected Performance**: 5-10ms (index seek + scan)

2. **User Session Summary**:
   ```sql
   SELECT user_id,
          COUNT(*) as session_count,
          SUM(total_cost_mc) / 100000.0 as total_cost
   FROM sessions_active
   WHERE user_id = ?
   GROUP BY user_id;
   ```
   **Index Used**: `idx_sessions_active_user_time`
   **Expected Performance**: 10-20ms (index-only scan)

3. **Session Detail Drill-Down**:
   ```sql
   SELECT id, timestamp, type, model_name,
          token_count, total_cost, status
   FROM interactions_active
   WHERE session_id = ?
   ORDER BY timestamp ASC;
   ```
   **Index Used**: `idx_interactions_active_session`
   **Expected Performance**: 5-15ms (10-100 interactions typical)

4. **Daily Cost Aggregation**:
   ```sql
   SELECT DATE(timestamp) as day,
          SUM(ai_tokens_cost_mc) / 100000.0 as ai_cost,
          SUM(db_ops_cost_mc) / 100000.0 as db_cost,
          SUM(total_cost_mc) / 100000.0 as total_cost
   FROM interactions_active
   WHERE timestamp BETWEEN ? AND ?
   GROUP BY DATE(timestamp)
   ORDER BY day DESC;
   ```
   **Index Used**: `idx_interactions_active_cost_analytics`
   **Expected Performance**: 15-30ms (index-only scan)

5. **Active Sessions (Dashboard Sidebar)**:
   ```sql
   SELECT id, user_id, start_time, total_interactions
   FROM sessions_active
   WHERE end_time IS NULL
   ORDER BY start_time DESC
   LIMIT 20;
   ```
   **Index Used**: `idx_sessions_active_end_time` (partial index)
   **Expected Performance**: 5-10ms

### Index Coverage Analysis

All dashboard queries achieve **index-only scans** (no table lookups required). D1 `queryEfficiency` metric should be >0.9 for all queries.

**Monitoring Query**:
```javascript
// In Cloudflare Worker
const result = await env.DB.prepare(query).all();
const efficiency = result.meta.rows_returned / result.meta.rows_read;

if (efficiency < 0.5) {
  console.warn('Low query efficiency', {
    query_id: crypto.randomUUID(),
    efficiency,
    rows_read: result.meta.rows_read,
    rows_returned: result.meta.rows_returned
  });
}
```

---

## Migration Scripts

### Initial Schema Migration

File: `migrations/0001_create_usage_analytics_schema.sql`

```sql
-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SESSIONS
-- ============================================================================

CREATE TABLE sessions_active (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  total_interactions INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_active_user_time
  ON sessions_active(user_id, start_time DESC);
CREATE INDEX idx_sessions_active_start_time
  ON sessions_active(start_time DESC);
CREATE INDEX idx_sessions_active_end_time
  ON sessions_active(end_time) WHERE end_time IS NULL;

CREATE TRIGGER sessions_active_update_timestamp
  AFTER UPDATE ON sessions_active
  FOR EACH ROW
  BEGIN
    UPDATE sessions_active SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- Archive table (identical schema)
CREATE TABLE sessions_archive (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  total_interactions INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_archive_user_time
  ON sessions_archive(user_id, start_time DESC);
CREATE INDEX idx_sessions_archive_start_time
  ON sessions_archive(start_time DESC);

-- Unified view
CREATE VIEW sessions_all AS
  SELECT id, user_id, start_time, end_time, total_interactions,
         total_cost_mc, total_cost, metadata, created_at, updated_at,
         NULL as archived_at, 'active' as data_source
  FROM sessions_active
  UNION ALL
  SELECT id, user_id, start_time, end_time, total_interactions,
         total_cost_mc, total_cost, metadata, created_at, updated_at,
         archived_at, 'archive' as data_source
  FROM sessions_archive;

-- ============================================================================
-- INTERACTIONS
-- ============================================================================

CREATE TABLE interactions_active (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration_ms INTEGER,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  model_name TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  token_count INTEGER GENERATED ALWAYS AS (
    COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)
  ) STORED,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  ai_tokens_cost REAL GENERATED ALWAYS AS (ai_tokens_cost_mc / 100000.0) STORED,
  db_ops_cost REAL GENERATED ALWAYS AS (db_ops_cost_mc / 100000.0) STORED,
  api_calls_cost REAL GENERATED ALWAYS AS (api_calls_cost_mc / 100000.0) STORED,
  compute_time_cost REAL GENERATED ALWAYS AS (compute_time_cost_mc / 100000.0) STORED,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions_active(id) ON DELETE CASCADE
);

CREATE INDEX idx_interactions_active_timestamp
  ON interactions_active(timestamp DESC);
CREATE INDEX idx_interactions_active_session
  ON interactions_active(session_id, timestamp DESC);
CREATE INDEX idx_interactions_active_user_time
  ON interactions_active(user_id, timestamp DESC);
CREATE INDEX idx_interactions_active_cost_analytics
  ON interactions_active(timestamp, user_id, type, total_cost_mc);
CREATE INDEX idx_interactions_active_session_rollup
  ON interactions_active(session_id, total_cost_mc);

-- Archive table
CREATE TABLE interactions_archive (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration_ms INTEGER,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  model_name TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  token_count INTEGER GENERATED ALWAYS AS (
    COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)
  ) STORED,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  ai_tokens_cost REAL GENERATED ALWAYS AS (ai_tokens_cost_mc / 100000.0) STORED,
  db_ops_cost REAL GENERATED ALWAYS AS (db_ops_cost_mc / 100000.0) STORED,
  api_calls_cost REAL GENERATED ALWAYS AS (api_calls_cost_mc / 100000.0) STORED,
  compute_time_cost REAL GENERATED ALWAYS AS (compute_time_cost_mc / 100000.0) STORED,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,
  metadata TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions_archive(id) ON DELETE CASCADE
);

CREATE INDEX idx_interactions_archive_timestamp
  ON interactions_archive(timestamp DESC);
CREATE INDEX idx_interactions_archive_session
  ON interactions_archive(session_id, timestamp DESC);
CREATE INDEX idx_interactions_archive_user_time
  ON interactions_archive(user_id, timestamp DESC);
CREATE INDEX idx_interactions_archive_cost_analytics
  ON interactions_archive(timestamp, user_id, type, total_cost_mc);

-- Unified view
CREATE VIEW interactions_all AS
  SELECT id, session_id, user_id, timestamp, duration_ms,
         type, status, model_name, prompt_tokens, completion_tokens, token_count,
         ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc,
         compute_time_cost_mc, total_cost_mc,
         ai_tokens_cost, db_ops_cost, api_calls_cost,
         compute_time_cost, total_cost,
         metadata, created_at,
         NULL as archived_at, 'active' as data_source
  FROM interactions_active
  UNION ALL
  SELECT id, session_id, user_id, timestamp, duration_ms,
         type, status, model_name, prompt_tokens, completion_tokens, token_count,
         ai_tokens_cost_mc, db_ops_cost_mc, api_calls_cost_mc,
         compute_time_cost_mc, total_cost_mc,
         ai_tokens_cost, db_ops_cost, api_calls_cost,
         compute_time_cost, total_cost,
         metadata, created_at,
         archived_at, 'archive' as data_source
  FROM interactions_archive;

-- ============================================================================
-- COST ESTIMATES (Optional for Phase 1)
-- ============================================================================

CREATE TABLE cost_estimates (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  calculation_version TEXT NOT NULL,
  calculation_method TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (interaction_id) REFERENCES interactions_active(id) ON DELETE CASCADE
);

CREATE INDEX idx_cost_estimates_interaction
  ON cost_estimates(interaction_id);
CREATE INDEX idx_cost_estimates_created
  ON cost_estimates(created_at DESC);

CREATE TABLE cost_estimates_archive (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  ai_tokens_cost_mc INTEGER DEFAULT 0,
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,
  calculation_version TEXT NOT NULL,
  calculation_method TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (interaction_id) REFERENCES interactions_archive(id) ON DELETE CASCADE
);

CREATE INDEX idx_cost_estimates_archive_interaction
  ON cost_estimates_archive(interaction_id);

-- ============================================================================
-- PRICING CACHE
-- ============================================================================

CREATE TABLE pricing_cache (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT,
  unit_type TEXT NOT NULL,
  cost_per_unit_mc INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  effective_date TEXT NOT NULL,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  source_url TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_pricing_cache_active_rate
  ON pricing_cache(provider, model_name, unit_type, effective_date)
  WHERE is_active = 1;

CREATE INDEX idx_pricing_cache_provider_model
  ON pricing_cache(provider, model_name);

CREATE INDEX idx_pricing_cache_effective_date
  ON pricing_cache(effective_date DESC);

CREATE TRIGGER pricing_cache_update_timestamp
  AFTER UPDATE ON pricing_cache
  FOR EACH ROW
  BEGIN
    UPDATE pricing_cache SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
```

### Seed Pricing Data

File: `migrations/0002_seed_pricing_cache.sql`

```sql
-- OpenAI GPT-4 Turbo (2024-04-09 pricing)
INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'openai', 'gpt-4-turbo-2024-04-09', 'token',
  10, 'USD',  -- $0.00010/prompt token
  '2024-04-09T00:00:00Z', NULL, 1,
  'https://openai.com/api/pricing',
  '{"token_type": "prompt"}',
  datetime('now'), datetime('now')
);

INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'openai', 'gpt-4-turbo-2024-04-09', 'token',
  30, 'USD',  -- $0.00030/completion token
  '2024-04-09T00:00:00Z', NULL, 1,
  'https://openai.com/api/pricing',
  '{"token_type": "completion"}',
  datetime('now'), datetime('now')
);

-- Anthropic Claude 3.5 Sonnet
INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'anthropic', 'claude-3-5-sonnet-20241022', 'token',
  3, 'USD',  -- $0.00003/prompt token
  '2024-10-22T00:00:00Z', NULL, 1,
  'https://www.anthropic.com/pricing',
  '{"token_type": "prompt"}',
  datetime('now'), datetime('now')
);

INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'anthropic', 'claude-3-5-sonnet-20241022', 'token',
  15, 'USD',  -- $0.00015/completion token
  '2024-10-22T00:00:00Z', NULL, 1,
  'https://www.anthropic.com/pricing',
  '{"token_type": "completion"}',
  datetime('now'), datetime('now')
);

-- Cloudflare D1 (rows read)
INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'cloudflare', NULL, 'row',
  0, 'USD',  -- $0.001/1000 rows after free tier
  '2025-01-01T00:00:00Z', NULL, 1,
  'https://developers.cloudflare.com/d1/pricing/',
  '{"operation": "read", "free_tier_rows": 5000000000}',
  datetime('now'), datetime('now')
);

-- Cloudflare D1 (rows written)
INSERT INTO pricing_cache VALUES (
  lower(hex(randomblob(16))),
  'cloudflare', NULL, 'row',
  0, 'USD',  -- $0.001/1000 rows after free tier
  '2025-01-01T00:00:00Z', NULL, 1,
  'https://developers.cloudflare.com/d1/pricing/',
  '{"operation": "write", "free_tier_rows": 1000000}',
  datetime('now'), datetime('now')
);
```

---

## Data Retention Summary

| Table                  | Retention Policy                      | Archival Trigger         | Storage Location |
|------------------------|---------------------------------------|--------------------------|------------------|
| `sessions_active`      | Last 90 days                          | `start_time < NOW-90d`   | D1 (voygent-prod)|
| `sessions_archive`     | 91 days - indefinite                  | —                        | D1 (voygent-prod)|
| `interactions_active`  | Last 90 days (parent session age)     | Parent session archived  | D1 (voygent-prod)|
| `interactions_archive` | 91 days - indefinite                  | —                        | D1 (voygent-prod)|
| `cost_estimates`       | Last 90 days (parent interaction age) | Parent interaction arch. | D1 (voygent-prod)|
| `pricing_cache`        | Indefinite (soft-delete via `is_active`) | —                    | D1 (voygent-prod)|

**Future Enhancement** (>1 year retention):
Export `*_archive` tables to R2 (Cloudflare Object Storage) for long-term compliance. Queryable via Parquet format.

---

## Validation & Testing

### Data Integrity Checks

```sql
-- Check for orphaned interactions (session deleted but interactions remain)
SELECT COUNT(*) as orphaned_interactions
FROM interactions_active i
LEFT JOIN sessions_active s ON i.session_id = s.id
WHERE s.id IS NULL;
-- Expected: 0 (foreign key cascade should prevent this)

-- Check cost consistency (session total_cost_mc = SUM(interaction costs))
SELECT s.id, s.total_cost_mc as session_cost,
       COALESCE(SUM(i.total_cost_mc), 0) as calculated_cost
FROM sessions_active s
LEFT JOIN interactions_active i ON s.id = i.session_id
GROUP BY s.id
HAVING session_cost != calculated_cost;
-- Expected: 0 rows (or known discrepancies with explanation)

-- Check timestamp ordering (interactions within session time bounds)
SELECT i.id, i.timestamp, s.start_time, s.end_time
FROM interactions_active i
JOIN sessions_active s ON i.session_id = s.id
WHERE i.timestamp < s.start_time
   OR (s.end_time IS NOT NULL AND i.timestamp > s.end_time);
-- Expected: 0 rows
```

### Performance Benchmarks

```sql
-- Benchmark: Session list query (should use idx_sessions_active_start_time)
EXPLAIN QUERY PLAN
SELECT id, user_id, start_time, total_cost
FROM sessions_active
WHERE start_time BETWEEN '2025-09-01' AND '2025-10-02'
ORDER BY start_time DESC
LIMIT 50;
-- Expected output: "SEARCH sessions_active USING INDEX idx_sessions_active_start_time"

-- Benchmark: Daily cost aggregation (should use idx_interactions_active_cost_analytics)
EXPLAIN QUERY PLAN
SELECT DATE(timestamp) as day, SUM(total_cost_mc) / 100000.0 as total
FROM interactions_active
WHERE timestamp BETWEEN '2025-09-01' AND '2025-10-02'
GROUP BY DATE(timestamp);
-- Expected output: "SEARCH interactions_active USING COVERING INDEX idx_interactions_active_cost_analytics"
```

---

## References

- **Research Decisions**: [research.md](research.md)
- **Feature Spec**: [spec.md](spec.md)
- **D1 Documentation**: [Cloudflare D1 Best Practices](https://developers.cloudflare.com/d1/best-practices/)
- **SQLite Generated Columns**: [SQLite Documentation](https://sqlite.org/gencol.html)

---

**Document Status**: ✅ Phase 1 Complete
**Next Artifact**: [contracts/](contracts/) - OpenAPI specifications for analytics, tracking, and pricing APIs
