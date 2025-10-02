# Implementation Plan: Usage Analytics & Cost Monitoring Dashboard

**Branch**: `002-track-detailed-usage` | **Date**: 2025-10-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/neil/dev/Voygent_ai_2/specs/002-track-detailed-usage/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Project Type detected: web (LibreChat frontend + Cloudflare Workers backend)
   → Structure Decision: Web application with edge workers
3. Fill the Constitution Check section ⏳
   → Constitution file is template - using general best practices
4. Evaluate Constitution Check section
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → Research D1 analytics patterns, cost tracking systems
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Build a usage analytics and cost monitoring dashboard for the Voygent AI assistant. Track detailed interaction statistics (chat messages, database operations, API calls, cost events) per user session with granular cost estimates broken down by AI tokens, database ops, API calls, and compute time. Dashboard provides filtering by date range, user, and session with drill-down capabilities. System auto-syncs pricing from provider APIs, archives data after 1 year, and scales to 100 sessions/50 users per day.

**Technical Approach**: Edge-first architecture using Cloudflare Workers for data collection and analytics API, D1 database for storage with active (recent) + archived (>1 year) partitioning, LibreChat frontend integration for tracking hooks, and separate analytics dashboard interface.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Workers runtime), Node.js 18+ (LibreChat)
**Primary Dependencies**: Cloudflare Workers, Wrangler, LibreChat (existing), D1 database client, React (dashboard UI)
**Storage**: Cloudflare D1 (voygent-prod database) with active + archive table strategy
**Testing**: Vitest (Workers), Jest (LibreChat integration), Playwright (E2E dashboard)
**Target Platform**: Cloudflare Workers (edge compute), Browser (dashboard), LibreChat server hooks
**Project Type**: web (frontend + backend workers)
**Performance Goals**: <100ms query time for dashboard, <10ms tracking write latency, archive query <500ms
**Constraints**: D1 query limits (50ms preferred), Workers CPU limits (50ms), edge-first latency requirements
**Scale/Scope**: 100 sessions/day × 50 users = ~3K sessions/month, ~36.5K sessions/year, ~10-20 interactions/session average

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (using general best practices - constitution file is template)

**Checks**:
- ✅ **Library-First**: Analytics tracking, cost calculation, and dashboard query logic implemented as reusable modules
- ✅ **Test-First**: Contract tests before implementation, integration tests for data flow
- ✅ **Observability**: Structured logging for all tracking events, cost calculations, and archival processes
- ✅ **Simplicity**: Direct D1 queries, avoid over-abstraction, pragmatic table design
- ✅ **Edge-First**: Cloudflare Workers for compute, D1 for data (aligns with Voygent architecture)

## Project Structure

### Documentation (this feature)
```
specs/002-track-detailed-usage/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── analytics-api.yaml       # OpenAPI spec for analytics queries
│   ├── tracking-api.yaml        # OpenAPI spec for event ingestion
│   └── pricing-sync-api.yaml    # OpenAPI spec for cost rate updates
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
infra/cloudflare/workers/
├── analytics-tracker/       # NEW: Event ingestion worker
│   ├── src/
│   │   ├── index.ts         # Worker entry point
│   │   ├── models/          # Interaction, Session, CostEstimate models
│   │   ├── services/        # Tracking service, cost calculation
│   │   └── lib/             # D1 client wrapper, utilities
│   └── tests/
│       ├── contract/        # Schema validation tests
│       ├── integration/     # D1 interaction tests
│       └── unit/            # Cost calculation tests
│
├── analytics-api/           # NEW: Query API worker
│   ├── src/
│   │   ├── index.ts         # Worker entry point
│   │   ├── routes/          # Dashboard endpoints
│   │   ├── services/        # Query service, aggregation
│   │   └── lib/             # Shared utilities
│   └── tests/
│
├── pricing-sync/            # NEW: Cost rate sync worker (scheduled)
│   ├── src/
│   │   ├── index.ts         # Cron worker
│   │   ├── providers/       # OpenAI, Cloudflare pricing adapters
│   │   └── services/        # Rate update service
│   └── tests/
│
└── [existing workers...]

apps/librechat/
├── server/
│   ├── middleware/
│   │   └── analytics-hook.js   # NEW: Tracking middleware
│   └── services/
│       └── analytics-client.js # NEW: Worker API client
└── client/
    └── src/
        ├── components/
        │   └── AnalyticsDashboard/  # NEW: Dashboard UI
        │       ├── SessionList.tsx
        │       ├── SessionDetail.tsx
        │       ├── CostBreakdown.tsx
        │       └── DateRangeFilter.tsx
        └── pages/
            └── Analytics.tsx        # NEW: Dashboard page

db/migrations/
└── voygent-prod/
    ├── 0001_create_usage_tables.sql        # NEW
    ├── 0002_create_archived_tables.sql     # NEW
    └── 0003_create_pricing_cache.sql       # NEW
```

**Structure Decision**: Web application with edge workers backend. Analytics tracking separated into 3 workers: `analytics-tracker` (ingestion), `analytics-api` (queries), and `pricing-sync` (scheduled rate updates). LibreChat frontend extended with dashboard page and server middleware for event hooks. D1 migrations for schema evolution.

## Phase 0: Outline & Research

### Research Tasks

1. **D1 Analytics Patterns**:
   - Decision needed: Active/archive table split strategy
   - Decision needed: Materialized view patterns in D1
   - Decision needed: JSON column usage for flexible metadata
   - Research: D1 query performance at 36K rows/year scale
   - Research: Best practices for time-series data in SQLite/D1

2. **Cost Tracking Systems**:
   - Decision needed: Real-time vs. batch cost calculation
   - Research: OpenAI pricing API availability and rate limits
   - Research: Cloudflare pricing exposure (D1, Workers, etc.)
   - Research: Cost calculation precision requirements (cents vs. fractions)

3. **LibreChat Integration**:
   - Research: Available middleware hooks for request/response tracking
   - Research: Session management in LibreChat (how sessions are identified)
   - Decision needed: User identification method (LibreChat user ID vs. session cookie)

4. **Dashboard UI**:
   - Decision needed: Visualization library (Chart.js, Recharts, D3)
   - Research: Real-time updates vs. polling vs. static load
   - Research: Export formats (CSV, JSON)

5. **Data Archival**:
   - Decision needed: Archive trigger (age-based cron, on-query lazy, manual)
   - Research: D1 attachment patterns for archive database
   - Decision needed: Archive compression or raw copy

### Research Output

Research findings will be consolidated in `research.md` with format:
- **Decision**: [what was chosen]
- **Rationale**: [why chosen + trade-offs]
- **Alternatives considered**: [what else evaluated]

**Output**: [research.md](research.md) with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model (data-model.md)

Extract entities from spec + clarifications:

**Core Entities**:
- **Session**: `id, user_id, start_time, end_time, interaction_count, total_cost`
- **Interaction**: `id, session_id, timestamp, type (chat|db|api|cost-event), duration_ms, token_count, model_name, cost_breakdown, metadata (JSON), status`
- **CostEstimate**: `interaction_id, ai_tokens_cost, db_ops_cost, api_calls_cost, compute_time_cost, total_cost, currency, calculation_version`
- **PricingCache**: `provider, resource_type, rate, currency, updated_at, cache_ttl`

**Archived Entities** (mirrored schema):
- **SessionArchive**: Same as Session
- **InteractionArchive**: Same as Interaction
- **CostEstimateArchive**: Same as CostEstimate

**Aggregated Views**:
- **DailyStats**: `date, user_id, session_count, interaction_count, total_cost`
- **UserStats**: `user_id, lifetime_sessions, lifetime_interactions, lifetime_cost`

### 2. API Contracts (contracts/)

Generate OpenAPI 3.0 schemas:

**analytics-api.yaml**:
- `GET /sessions?user_id&start_date&end_date&limit&offset` → Session list
- `GET /sessions/{id}` → Session detail with interactions
- `GET /sessions/{id}/interactions` → Interaction list for session
- `GET /stats/daily?start_date&end_date` → Daily aggregates
- `GET /stats/users/{user_id}` → User lifetime stats
- `GET /stats/system` → System-wide totals

**tracking-api.yaml**:
- `POST /track/interaction` → Record new interaction
- `POST /track/session/start` → Start new session
- `POST /track/session/end` → Close session

**pricing-sync-api.yaml**:
- `POST /pricing/sync` → Manual trigger sync (admin only)
- `GET /pricing/rates` → Current cached rates

### 3. Contract Tests

Generate failing tests:
- `tests/contract/analytics-api.test.ts`: Schema validation for all endpoints
- `tests/contract/tracking-api.test.ts`: Ingestion schema validation
- `tests/integration/session-lifecycle.test.ts`: Start session → track interactions → end session flow
- `tests/integration/cost-calculation.test.ts`: Cost breakdown correctness

### 4. Quickstart Test Scenarios

Extract from user stories:
1. **Scenario**: Admin views dashboard → sees session list
2. **Scenario**: Admin clicks session → sees interaction details with costs
3. **Scenario**: User interacts with AI → interaction auto-tracked → cost calculated
4. **Scenario**: Filter by date range → aggregated stats update
5. **Scenario**: Cost rates auto-sync → new calculations use updated rates

**Output**:
- [data-model.md](data-model.md)
- [contracts/analytics-api.yaml](contracts/analytics-api.yaml)
- [contracts/tracking-api.yaml](contracts/tracking-api.yaml)
- [contracts/pricing-sync-api.yaml](contracts/pricing-sync-api.yaml)
- Failing contract tests
- [quickstart.md](quickstart.md)
- [CLAUDE.md](/home/neil/dev/Voygent_ai_2/CLAUDE.md) (updated)

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
3. Map contracts → contract test tasks [P]
4. Map entities → D1 migration + model tasks [P]
5. Map user stories → integration test tasks
6. Implementation tasks to make tests pass
7. Dashboard UI component tasks
8. Deployment tasks (wrangler.toml, bindings)

**Task Categories**:
- **Schema** (P): D1 migrations for sessions, interactions, cost_estimates, pricing_cache
- **Workers - Tracking** (P): analytics-tracker worker (ingestion logic)
- **Workers - API** (P): analytics-api worker (query endpoints)
- **Workers - Pricing**: pricing-sync worker (scheduled job)
- **LibreChat Integration**: Middleware hooks, analytics client
- **Dashboard UI**: React components, pages, routing
- **Testing**: Contract tests → integration tests → E2E tests
- **Operations**: Archive cron job, monitoring, deployment

**Ordering Strategy**:
1. **TDD order**: Tests before implementation
2. **Dependency order**:
   - D1 migrations first (data layer)
   - Models + cost calculation (domain logic)
   - Workers (services layer)
   - LibreChat integration (tracking hooks)
   - Dashboard UI (presentation layer)
3. **Parallel markers [P]**: Independent workers, UI components

**Estimated Output**: ~35-40 numbered, dependency-ordered tasks in tasks.md

**Example Task Flow**:
```
[P] 001: Create D1 migration for sessions table
[P] 002: Create D1 migration for interactions table
[P] 003: Create D1 migration for cost_estimates table
004: Write contract tests for tracking API (will fail)
005: Implement Session model with validation
006: Implement Interaction model with validation
007: Implement CostCalculator service
008: Write unit tests for CostCalculator
009: Implement analytics-tracker worker ingestion endpoint
010: Make tracking API contract tests pass
...
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD + constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance benchmarking)

## Complexity Tracking

*No constitutional violations - all choices align with edge-first, library-first, test-first principles.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved (research phase)
- [x] Complexity deviations documented (none)

---
*Based on Voygent v2 constitution principles - See `/home/neil/dev/Voygent_ai_2/CLAUDE.md`*
