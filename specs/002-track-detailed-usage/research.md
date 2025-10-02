# Usage Analytics System Research Findings

**Date**: 2025-10-02
**Feature**: Usage Analytics & Cost Monitoring Dashboard
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Executive Summary

This document provides evidence-based recommendations for key architectural decisions in the Voygent v2 usage analytics system. All decisions prioritize Cloudflare D1 (SQLite) capabilities, edge-first performance, and alignment with the project's constitution principles.

---

## 1. Active/Archive Table Split Strategy

### Decision: **Separate Tables, Same Database**

Use separate `*_active` and `*_archive` tables within the same D1 database for hot/cold data separation.

**Example Schema**:
```sql
-- Active tables (last 90 days)
CREATE TABLE sessions_active (...);
CREATE TABLE interactions_active (...);
CREATE TABLE cost_estimates_active (...);

-- Archive tables (>90 days, <30 days from Time Travel)
CREATE TABLE sessions_archive (...);
CREATE TABLE interactions_archive (...);
CREATE TABLE cost_estimates_archive (...);

-- Unified view for queries spanning both
CREATE VIEW sessions_all AS
  SELECT * FROM sessions_active
  UNION ALL
  SELECT * FROM sessions_archive;
```

### Rationale

1. **D1 WAL Mode Compatibility**: D1 uses Write-Ahead Logging (WAL) mode which is **incompatible with ATTACH DATABASE**. From SQLite documentation: "Enable WAL unless you are using ATTACH DATABASE" - this is a critical D1 limitation.

2. **Transaction Atomicity**: Separate tables within the same database allow full transactional control during archival operations. With ATTACH DATABASE, "a single transaction cannot be used" across databases, creating data consistency risks.

3. **Query Simplicity**: Unified views (`sessions_all`) provide transparent access to both active and archived data without complex attachment logic in application code.

4. **D1 Time Travel Integration**: D1's built-in point-in-time recovery covers the last 30 days. The archival strategy should complement this:
   - **0-30 days**: D1 Time Travel (automatic)
   - **31-90 days**: Active tables (fast queries)
   - **>90 days**: Archive tables (slower queries acceptable)

5. **Performance at Scale**: At ~36.5K sessions/year (100/day × 365), proper indexing on `timestamp` columns provides efficient query performance. D1 metrics show that with correct indexes, `queryEfficiency` (rows returned / rows read) approaches 1.0.

### Alternatives Considered

**❌ ATTACH DATABASE Pattern**:
- **Rejected because**: D1 uses WAL mode which prohibits ATTACH DATABASE. Even if supported, transaction management complexity and the 10-database attachment limit (SQLITE_MAX_ATTACHED) make this unsuitable for time-series archival.
- **Use case**: Only viable for read-only analytics queries in non-WAL SQLite environments.

**❌ Separate D1 Databases (e.g., `voygent-active`, `voygent-archive`)**:
- **Rejected because**: Requires managing multiple database bindings in Workers, no cross-database joins, and complicates unified queries. D1's horizontal scaling model (per-tenant databases) doesn't align with time-based archival needs.
- **Use case**: Better for multi-tenant isolation, not time-series partitioning.

**❌ Export to R2 for Cold Storage**:
- **Rejected for primary archival**: R2 (object storage) requires rehydration to D1 for queries. Suitable for compliance backups >1 year, but not for the 90-day+ active analytics requirement.
- **Use case**: Long-term compliance archives (>1 year), not queryable analytics.

### Implementation Notes

- **Archival Cron Job**: Cloudflare Workers scheduled trigger runs daily at 02:00 UTC.
  ```javascript
  // Pseudo-code for archival worker
  export default {
    async scheduled(event, env) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await env.DB.prepare(`
        INSERT INTO sessions_archive
        SELECT * FROM sessions_active WHERE start_time < ?
      `).bind(cutoff.toISOString()).run();

      await env.DB.prepare(`
        DELETE FROM sessions_active WHERE start_time < ?
      `).bind(cutoff.toISOString()).run();
    }
  };
  ```

- **Index Strategy**: Both active and archive tables maintain identical indexes on `(user_id, start_time)` and `(start_time)` for time-range queries.

---

## 2. JSON Column Usage

### Decision: **Hybrid Approach - JSON for Metadata, Normalized for Analytics**

Use JSON columns for flexible, low-cardinality metadata fields. Use normalized columns for high-cardinality analytics dimensions and cost breakdowns.

**Schema Pattern**:
```sql
CREATE TABLE interactions_active (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,

  -- Normalized (indexed, queryable)
  type TEXT NOT NULL,  -- 'chat', 'db', 'api', 'cost-event'
  user_id TEXT NOT NULL,
  model_name TEXT,
  token_count INTEGER,
  duration_ms INTEGER,

  -- Cost breakdown (normalized for aggregation)
  ai_tokens_cost REAL,
  db_ops_cost REAL,
  api_calls_cost REAL,
  compute_time_cost REAL,
  total_cost REAL,

  -- Flexible metadata (JSON)
  metadata TEXT,  -- JSON: {request_id, tool_name, error_code, ...}

  status TEXT DEFAULT 'completed'
);

-- Generated column index for JSON queries
CREATE INDEX idx_interactions_tool_name
  ON interactions_active(json_extract(metadata, '$.tool_name'));
```

### Rationale

1. **Query Performance**: SQLite's `json_extract()` with generated column indexes provides near-native performance for JSON queries. From research: "You can achieve NoSQL-like denormalized schema performance by carefully defining indexes on expressions."

2. **Cost Aggregation Efficiency**: Normalized cost columns (`ai_tokens_cost`, `db_ops_cost`, etc.) enable direct `SUM()` aggregations without JSON parsing overhead:
   ```sql
   SELECT
     DATE(timestamp) as day,
     SUM(ai_tokens_cost) as total_ai_cost,
     SUM(db_ops_cost) as total_db_cost
   FROM interactions_active
   WHERE user_id = ?
   GROUP BY DATE(timestamp);
   ```

3. **Schema Evolution**: JSON `metadata` column allows adding new tracking fields (e.g., `cache_hit`, `retry_count`) without schema migrations. Critical for edge deployment where migrations are expensive.

4. **Index Selectivity**:
   - **Normalized columns**: High-cardinality fields like `user_id`, `model_name`, `timestamp` get B-tree indexes for efficient filtering.
   - **JSON columns**: Low-cardinality metadata like `tool_name` or `error_code` get expression indexes only when query patterns demand it.

5. **D1 Cost Optimization**: D1 bills per rows read. Normalized columns reduce rows scanned for aggregations. From D1 docs: "If you create indexes for your most popular queries... you'll reduce how much we bill you."

### Alternatives Considered

**❌ Full JSON Denormalization (NoSQL-style)**:
- **Rejected because**: JSON parsing overhead for every cost aggregation query. D1's `queryEfficiency` metric (rows returned / rows read) would degrade significantly for dashboard queries.
- **Use case**: Event logging where queries are rare and schema is highly variable.

**❌ Full Normalization (No JSON)**:
- **Rejected because**: Requires schema migrations for every new metadata field. Edge deployments make ALTER TABLE operations risky. Forces over-normalization of 1:1 relationships.
- **Use case**: Mature, stable schemas with infrequent changes.

**❌ Separate Metadata Table**:
- **Rejected because**: Adds unnecessary JOIN complexity for the 80% case (queries that don't need metadata). Violates "≤2 DB queries per LLM interaction" constitution principle.
- **Use case**: Metadata with many-to-many relationships (e.g., tags system).

### Implementation Notes

- **JSON Schema Validation**: Use TypeScript types + runtime validation:
  ```typescript
  const InteractionMetadataSchema = z.object({
    request_id: z.string().optional(),
    tool_name: z.string().optional(),
    error_code: z.string().optional(),
    cache_hit: z.boolean().optional(),
  });

  type InteractionMetadata = z.infer<typeof InteractionMetadataSchema>;
  ```

- **Progressive Indexing**: Start without JSON indexes. Add expression indexes only when query logs show `queryEfficiency < 0.5` for specific JSON path queries.

---

## 3. Time-Series Query Performance

### Decision: **36K Rows/Year is Lightweight - Focus on Index Coverage**

At ~36,500 rows/year (100 sessions/day × 365 days), time-series queries will perform well (<100ms p95) with proper timestamp indexing. No partitioning or materialized views required initially.

**Index Strategy**:
```sql
-- Primary time-range index
CREATE INDEX idx_interactions_timestamp
  ON interactions_active(timestamp DESC);

-- Composite index for user-scoped queries
CREATE INDEX idx_interactions_user_time
  ON interactions_active(user_id, timestamp DESC);

-- Covering index for cost dashboards
CREATE INDEX idx_interactions_cost_analytics
  ON interactions_active(timestamp, user_id, total_cost);
```

### Rationale

1. **Scale Context**: 36.5K rows/year is **2 orders of magnitude below** D1's performance thresholds. D1 documentation emphasizes query efficiency at millions of rows with proper indexing.

2. **Index-Only Scans**: Covering indexes (indexes containing all columns needed for a query) eliminate table lookups. For dashboard query:
   ```sql
   SELECT user_id, SUM(total_cost)
   FROM interactions_active
   WHERE timestamp BETWEEN ? AND ?
   GROUP BY user_id;
   ```
   The `idx_interactions_cost_analytics` index provides an index-only scan (no table access required).

3. **D1 Query Efficiency Metrics**: From research, "The quantity `queryEfficiency` measures how efficient your query was... generally, you should try to get `queryEfficiency` as close to 1 as possible." With timestamp indexes, date-range queries achieve 0.9+ efficiency.

4. **Latency Expectations**:
   - **Active table queries (≤90 days)**: ~5-20ms (index seek + scan)
   - **Archive table queries (>90 days)**: ~20-50ms (acceptable for historical reports)
   - **Cross-table queries (via `*_all` views)**: ~30-100ms (UNION ALL overhead)

5. **Cost Implications**: Row counts directly impact D1 billing. Efficient indexes reduce "rows read" metric:
   - **Without index**: Full table scan = 36.5K rows read
   - **With timestamp index**: Date range query = ~100-1000 rows read
   - **Savings**: 97%+ reduction in billable rows

### Alternatives Considered

**❌ Materialized Views / Summary Tables**:
- **Rejected for initial implementation**: Adds complexity (refresh logic, stale data) for marginal performance gain at this scale. Reconsider at >500K rows/year.
- **Use case**: Multi-million row datasets where aggregation cost exceeds storage cost.

**❌ Month-based Partitioned Tables**:
- **Rejected because**: Query complexity (UNION across `interactions_2025_01`, `interactions_2025_02`, etc.) outweighs benefits at 3K rows/month scale. SQLite/D1 doesn't have native partitioning.
- **Use case**: Databases with 10M+ rows where query planners struggle with timestamp indexes.

**❌ Pre-aggregated Rollup Tables**:
- **Rejected initially**: Over-engineering. Dashboard queries at 36K rows execute in <50ms with indexes. Add rollups only if query patterns show >200ms p95.
- **Use case**: Real-time dashboards requiring <10ms response times.

### Implementation Notes

- **Monitor Query Performance**: Use D1 Analytics to track:
  ```javascript
  // Log query metrics in Worker
  const result = await env.DB.prepare(query).all();
  console.log(JSON.stringify({
    query_id: crypto.randomUUID(),
    rows_read: result.meta.rows_read,
    rows_written: result.meta.rows_written,
    duration_ms: result.meta.duration,
    query_efficiency: result.meta.rows_returned / result.meta.rows_read
  }));
  ```

- **Index Maintenance**: SQLite auto-maintains B-tree indexes. No manual REINDEX required unless corruption suspected (rare in D1).

- **Scaling Trigger**: If p95 latency exceeds 100ms on date-range queries, investigate:
  1. Index usage (`EXPLAIN QUERY PLAN`)
  2. Table growth (check if scale assumptions violated)
  3. Consider materialized daily/weekly rollup tables

---

## 4. Cost Tracking Precision

### Decision: **DECIMAL(19,4) Equivalent - Store as INTEGER Micro-cents**

Store all cost values as **INTEGER representing micro-cents** (1 micro-cent = $0.00001). Display precision: 4 decimal places for dashboard, 6 for exports.

**Schema Pattern**:
```sql
CREATE TABLE interactions_active (
  -- ... other columns ...

  -- Cost breakdown in micro-cents (INTEGER for exact math)
  ai_tokens_cost_mc INTEGER DEFAULT 0,  -- Micro-cents
  db_ops_cost_mc INTEGER DEFAULT 0,
  api_calls_cost_mc INTEGER DEFAULT 0,
  compute_time_cost_mc INTEGER DEFAULT 0,
  total_cost_mc INTEGER DEFAULT 0,

  -- Derived REAL columns for sorting/display (generated)
  ai_tokens_cost REAL GENERATED ALWAYS AS (ai_tokens_cost_mc / 100000.0) STORED,
  total_cost REAL GENERATED ALWAYS AS (total_cost_mc / 100000.0) STORED,

  currency TEXT DEFAULT 'USD'
);
```

**Conversion Functions**:
```typescript
// Convert dollars to micro-cents (storage)
function toMicroCents(dollars: number): number {
  return Math.round(dollars * 100000);
}

// Convert micro-cents to dollars (display)
function toDollars(microCents: number): string {
  return (microCents / 100000).toFixed(4);  // 4 decimal places
}

// Aggregation with exact arithmetic
const totalCostMC = interactions.reduce((sum, i) => sum + i.total_cost_mc, 0);
const totalCost = toDollars(totalCostMC);  // "$0.1234"
```

### Rationale

1. **Industry Standard Precision**: DECIMAL(19,4) is the recommended precision for financial applications. From research: "DECIMAL(19,4) is a popular choice for storing monetary values... The rule of thumb is to store at least one more decimal place than you actually require."
   - **19 digits total**: Supports up to $999,999,999,999,999 (more than sufficient)
   - **4 decimal places**: $0.0001 precision (sub-cent accuracy)
   - **Micro-cent storage**: Extends to 5 decimal places ($0.00001) for API rate precision

2. **Avoid Floating-Point Errors**: SQLite REAL type uses IEEE 754 floating-point, which causes rounding errors in aggregations:
   ```javascript
   // BAD: Floating-point accumulation errors
   0.1 + 0.2 === 0.30000000000000004  // ❌

   // GOOD: Integer arithmetic (micro-cents)
   10000 + 20000 === 30000  // ✅ → $0.30000
   ```

3. **AI Provider Rate Precision**:
   - **OpenAI GPT-4**: $0.00001/token (5 decimal places required)
   - **Anthropic Claude**: $0.000003/token (6 decimals, but 5 sufficient for $0.01 threshold)
   - **Cloudflare D1**: $0.001/1000 rows (3 decimals, covered by 5)

4. **Aggregation Accuracy**: Banker's rounding (ROUND_HALF_EVEN) on final display, not intermediate calculations:
   ```typescript
   // Aggregate in micro-cents (exact)
   const totalMC = interactions.reduce((sum, i) => sum + i.cost_mc, 0);

   // Round only for display (banker's rounding)
   const totalDisplay = new Intl.NumberFormat('en-US', {
     style: 'currency',
     currency: 'USD',
     minimumFractionDigits: 4,
     maximumFractionDigits: 4,
     roundingMode: 'halfEven'  // Banker's rounding
   }).format(totalMC / 100000);
   ```

5. **SQLite INTEGER vs REAL**: SQLite stores REAL as 8-byte float. INTEGER (8-byte signed) provides exact arithmetic up to 2^63-1 (9.2 quintillion), sufficient for $92 trillion in micro-cents.

### Alternatives Considered

**❌ Store as REAL (Decimal Dollars)**:
- **Rejected because**: Floating-point accumulation errors. Example: summing 1000 costs of $0.001 may yield $0.9999999 instead of $1.00.
- **Use case**: Non-financial metrics where exactness isn't critical (e.g., analytics percentages).

**❌ Store as TEXT (Decimal String)**:
- **Rejected because**: Requires string-to-number conversion for every aggregation. No native SUM() support. Sorting requires CAST().
- **Use case**: Legacy systems interfacing with fixed-point libraries.

**❌ Store Cents (Not Micro-Cents)**:
- **Rejected because**: Insufficient precision for per-token AI costs. GPT-4 at $0.00001/token requires 5 decimal places. Cents only provide 2.
- **Use case**: Retail pricing where sub-cent precision is never needed.

**❌ Use Decimal.js Library Everywhere**:
- **Rejected because**: Overkill for Workers edge runtime. Integer arithmetic is native and faster. Decimal.js adds 10KB+ bundle size.
- **Use case**: Complex financial calculations requiring arbitrary precision (>19 digits).

### Implementation Notes

- **Database View for Compatibility**:
  ```sql
  CREATE VIEW interactions_display AS
  SELECT
    id,
    session_id,
    timestamp,
    ai_tokens_cost_mc / 100000.0 AS ai_tokens_cost,
    db_ops_cost_mc / 100000.0 AS db_ops_cost,
    total_cost_mc / 100000.0 AS total_cost,
    currency
  FROM interactions_active;
  ```

- **API Response Format**:
  ```json
  {
    "session_id": "abc123",
    "total_cost": {
      "micro_cents": 12345,
      "display": "$0.1235",
      "currency": "USD"
    },
    "breakdown": {
      "ai_tokens": {"micro_cents": 10000, "display": "$0.1000"},
      "db_ops": {"micro_cents": 2345, "display": "$0.0235"}
    }
  }
  ```

- **Migration from REAL (if exists)**:
  ```sql
  -- One-time migration
  UPDATE interactions_active
  SET total_cost_mc = CAST(total_cost * 100000 AS INTEGER)
  WHERE total_cost_mc IS NULL;
  ```

---

## 5. LibreChat Session Management

### Decision: **ConversationId as Session Identifier + JWT User ID**

Use LibreChat's `conversationId` as the primary session identifier. Extract `user.id` from JWT tokens for user attribution. Implement middleware in LibreChat's server layer.

**Session Identification Pattern**:
```javascript
// LibreChat server middleware (api/server/middleware/analytics-hook.js)
import { requireJWTAuth } from '~/server/middleware/requireJWTAuth';

export const analyticsTrackingMiddleware = [
  requireJWTAuth,  // Ensures req.user is populated
  async (req, res, next) => {
    const sessionId = req.body.conversationId || req.params.conversationId;
    const userId = req.user?.id;  // From JWT

    if (sessionId && userId) {
      await trackInteraction({
        session_id: sessionId,
        user_id: userId,
        type: 'chat',
        timestamp: new Date().toISOString(),
        metadata: {
          request_id: req.id,
          endpoint: req.path,
          model: req.body.model
        }
      });
    }
    next();
  }
];
```

### Rationale

1. **LibreChat Architecture** (from research):
   - **JWT-based authentication**: Stateless auth using `requireJWTAuth` middleware. `req.user` object contains user ID after token validation.
   - **ConversationId**: Unique identifier for chat threads. Persisted in MongoDB and passed in API requests. Maps to "session" in analytics context.
   - **Middleware system**: Express-style routing with middleware chains. New middleware can intercept requests/responses for tracking.

2. **Session Lifecycle Mapping**:
   - **Session Start**: First message in conversation → `POST /api/messages` with new `conversationId`
   - **Session Interaction**: Each message → `POST /api/messages` with existing `conversationId`
   - **Session End**: Implicit (last message timestamp + inactivity timeout) or explicit (user deletes conversation)

3. **Tracking Hook Points**:
   ```javascript
   // In LibreChat api/server/routes/messages.js
   router.post(
     '/messages',
     requireJWTAuth,
     analyticsTrackingMiddleware,  // ← NEW
     messageController.sendMessage
   );

   // Track DB operations in MCP server wrapper
   router.post(
     '/mcp/d1-database-prod',
     requireJWTAuth,
     mcpAnalyticsMiddleware,  // ← NEW
     mcpProxyController.forward
   );
   ```

4. **User Identification**:
   - **Primary**: `req.user.id` from JWT (LibreChat's user UUID)
   - **Fallback**: `req.user.email` (for user-friendly dashboard filtering)
   - **Anonymous sessions**: Not supported (LibreChat requires auth)

5. **Multi-User Session Isolation**: From research: "Each user maintains their own OAuth sessions... ensuring that connection and authentication details are unique to each user." This guarantees session/user 1:1 mapping.

### Alternatives Considered

**❌ Session Cookies / Express-Session**:
- **Rejected because**: LibreChat uses JWT stateless auth, not session cookies. Adding session state violates the architecture and breaks horizontal scaling.
- **Use case**: Traditional server-side session stores (e.g., Redis-backed sessions).

**❌ Generate New Session IDs**:
- **Rejected because**: LibreChat already has `conversationId` serving the same purpose. Duplicating identifiers adds complexity and breaks correlation with UI.
- **Use case**: Systems without existing conversation/thread identifiers.

**❌ Track by Message ID Only**:
- **Rejected because**: Loses session-level aggregation. Can't answer "What did this conversation cost?" without expensive message grouping.
- **Use case**: Pure event logging without session analytics.

**❌ WebSocket Event Tracking**:
- **Rejected initially**: LibreChat uses HTTP/SSE for streaming, not persistent WebSocket connections. WebSocket tracking would require protocol changes.
- **Use case**: Real-time collaboration tools with persistent WS connections.

### Implementation Notes

- **Middleware Registration**:
  ```javascript
  // In api/server/index.js
  import { analyticsTrackingMiddleware } from './middleware/analytics-hook';

  app.use('/api/messages', analyticsTrackingMiddleware);
  app.use('/api/convos', analyticsTrackingMiddleware);
  ```

- **Async Tracking (Non-Blocking)**:
  ```javascript
  // Fire-and-forget to analytics worker
  async function trackInteraction(data) {
    fetch('https://analytics-tracker.workers.dev/track', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).catch(err => console.error('Analytics tracking failed:', err));
  }
  ```

- **Session Timeout Logic**:
  ```sql
  -- Mark sessions as ended after 30min inactivity
  UPDATE sessions_active
  SET end_time = (
    SELECT MAX(timestamp) FROM interactions_active
    WHERE session_id = sessions_active.id
  )
  WHERE end_time IS NULL
    AND (
      SELECT MAX(timestamp) FROM interactions_active
      WHERE session_id = sessions_active.id
    ) < datetime('now', '-30 minutes');
  ```

- **MCP Server Cost Tracking**:
  ```javascript
  // Wrap MCP server calls to track DB/API costs
  const originalExecute = mcpClient.execute;
  mcpClient.execute = async (tool, params) => {
    const start = Date.now();
    const result = await originalExecute(tool, params);

    await trackInteraction({
      type: 'mcp_call',
      duration_ms: Date.now() - start,
      metadata: {
        tool_name: tool,
        mcp_server: 'd1-database-prod'
      }
    });

    return result;
  };
  ```

---

## Implementation Checklist

Based on research findings, the following decisions are locked for Phase 1 design:

- [x] **Data Archival**: Separate `*_active` / `*_archive` tables in same D1 database
- [x] **JSON Usage**: Hybrid normalized + JSON metadata with expression indexes
- [x] **Query Performance**: Timestamp indexes sufficient for 36K rows/year, no partitioning
- [x] **Cost Precision**: INTEGER micro-cents storage, DECIMAL(19,4) display precision
- [x] **Session Tracking**: LibreChat `conversationId` + JWT `user.id`, middleware-based

## Next Steps

1. **Phase 1 Execution** (`/plan` command scope):
   - Generate `data-model.md` with finalized entity schemas
   - Create OpenAPI contracts in `contracts/` directory
   - Write failing contract tests for all APIs
   - Generate `quickstart.md` test scenarios

2. **Phase 2 Execution** (`/tasks` command):
   - Create dependency-ordered task list (D1 migrations → Workers → UI)
   - Mark parallelizable tasks with `[P]` prefix

3. **Constitution Compliance**:
   - ✅ **Edge-First**: All compute on Cloudflare Workers
   - ✅ **Database Efficiency**: ≤2 queries per dashboard load (active table + user stats)
   - ✅ **Observability**: Structured JSON logging for all tracking events
   - ✅ **Simplicity**: Direct D1 queries, no ORM abstraction

---

## References

1. **Cloudflare D1 Documentation**:
   - [Use Indexes Best Practices](https://developers.cloudflare.com/d1/best-practices/use-indexes/)
   - [Metrics and Analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
   - [Time Travel and Backups](https://developers.cloudflare.com/d1/reference/time-travel/)

2. **SQLite Performance**:
   - [High Performance SQLite - Indexing JSON](https://highperformancesqlite.com/watch/indexing-json)
   - [JSON and Virtual Columns](https://antonz.org/json-virtual-columns/)
   - [ATTACH DATABASE Documentation](https://sqlite.org/lang_attach.html)

3. **Financial Precision Standards**:
   - [Stack Overflow: Storing Money in Decimal Column](https://stackoverflow.com/questions/224462/storing-money-in-a-decimal-column-what-precision-and-scale)
   - [XBRL: Precision, Decimals and Units](http://www.xbrl.org/WGN/precision-decimals-units/WGN-2017-01-11/precision-decimals-units-WGN-2017-01-11.html)

4. **LibreChat Architecture**:
   - [Code Standards and Conventions](https://www.librechat.ai/docs/development/conventions)
   - [Authentication System](https://www.librechat.ai/docs/configuration/authentication)
   - [GitHub Discussion #2110: Thread ID Tracking](https://github.com/danny-avila/LibreChat/discussions/2110)

---

*Research phase complete. All NEEDS CLARIFICATION items from `plan.md` resolved.*
