# Tasks: LibreChat Interface Modifications

**Input**: Design documents from `/home/neil/dev/Voygent_ai_2/specs/002-librechat-interface-modifications/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Summary

This task list implements four major LibreChat interface modifications:
1. **Token Usage Indicator**: Real-time token metrics and cost tracking
2. **Trip Progress Indicator**: Live trip planning workflow progress display
3. **Voygent Branding**: Complete UI rebrand (logo, colors, fonts)
4. **Travel Agent Mode Lock**: System-wide mode enforcement with auto-enabled MCP servers

**Tech Stack**: React/TypeScript (LibreChat client), Node.js/Express (backend), D1 (SQLite), YAML (config)
**Structure**: Web application (`apps/librechat/`) with client/server separation
**Total Tasks**: 42 tasks across 6 phases

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

---

## Phase 1: Database & Backend Setup

### Database Schema

- [ ] **T001** [P] Create D1 migration `003_token_usage_log.sql` for token tracking table
  - **File**: `infra/cloudflare/migrations/003_token_usage_log.sql`
  - **Description**: Create `token_usage_log` table with fields: id, conversation_id, user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, approximate, created_at. Add indexes on conversation_id, user_id, created_at.
  - **Acceptance**: Migration file exists, table schema matches data-model.md section 3.1

- [ ] **T002** [P] Create D1 migration `004_model_pricing.sql` for pricing lookup table
  - **File**: `infra/cloudflare/migrations/004_model_pricing.sql`
  - **Description**: Create `model_pricing` table with fields: model_id (PK), model_name, input_price_per_1m, output_price_per_1m, effective_from, effective_to, created_at. Seed with Anthropic/OpenAI pricing from research.md section 6.
  - **Acceptance**: Migration file exists, seed data includes Claude 3.5 Sonnet, Haiku, GPT-4o, GPT-4o mini

- [ ] **T003** [P] Create D1 migration `005_trip_progress_fields.sql` for trip progress tracking
  - **File**: `infra/cloudflare/migrations/005_trip_progress_fields.sql`
  - **Description**: Add progress fields to existing `trips_v2` table: phase (TEXT), step (INTEGER), total_steps (INTEGER), percent (INTEGER), cost (REAL), commission (REAL), last_updated (INTEGER).
  - **Acceptance**: ALTER TABLE statements for all 7 new fields

- [ ] **T004** Apply all D1 migrations to voygent-prod database
  - **Command**: `npx wrangler d1 execute voygent-prod --file=infra/cloudflare/migrations/003_token_usage_log.sql && npx wrangler d1 execute voygent-prod --file=infra/cloudflare/migrations/004_model_pricing.sql && npx wrangler d1 execute voygent-prod --file=infra/cloudflare/migrations/005_trip_progress_fields.sql`
  - **Description**: Execute all three migrations against production D1 database
  - **Dependencies**: T001, T002, T003
  - **Acceptance**: All tables exist in voygent-prod, pricing seed data present

### Backend API Endpoints

- [ ] **T005** [P] Create token pricing utility `model-pricing.ts`
  - **File**: `apps/librechat/customizations/pricing/model-pricing.ts`
  - **Description**: Implement MODEL_PRICING lookup object and calculateCost() function per data-model.md section 4.1. Support claude-3-5-sonnet, claude-3-5-haiku, gpt-4o, gpt-4o-mini.
  - **Acceptance**: calculateCost(5000, 1500, 'claude-3-5-sonnet-20241022') returns 0.0375

- [ ] **T006** [P] Create MCP server registry `server-registry.ts`
  - **File**: `apps/librechat/customizations/mcp/server-registry.ts`
  - **Description**: Define MCP_SERVERS array with 5 server configs per data-model.md section 4.2 (d1_database, prompt_instructions, template_document, web_fetch, document_publish).
  - **Acceptance**: Array contains all 5 servers with correct URLs and autoEnable: true

- [ ] **T007** Create token usage API route `token-usage.js`
  - **File**: `apps/librechat/server/routes/voygent/token-usage.js`
  - **Description**: Implement GET /api/voygent/token-usage endpoint per contracts/token-usage-api.yaml. Support query params: conversationId, cumulative. Return 200 with usage data or 204 if none. Fetch from token_usage_log table.
  - **Dependencies**: T004 (database), T005 (pricing)
  - **Acceptance**: curl returns usage data with model, inputTokens, outputTokens, price

- [ ] **T008** Create trip progress API route `trip-progress.js`
  - **File**: `apps/librechat/server/routes/voygent/trip-progress.js`
  - **Description**: Implement GET /api/voygent/trip-progress endpoint per contracts/trip-progress-api.yaml. Support query params: tripId, conversationId. Return 200 with progress data or 204 if no active trip. Fetch from trips_v2 table.
  - **Dependencies**: T004 (database)
  - **Acceptance**: curl returns progress with tripName, phase, step, percent

- [ ] **T009** Create combined status API route `status.js`
  - **File**: `apps/librechat/server/routes/voygent/status.js`
  - **Description**: Implement GET /api/voygent/status endpoint per contracts/status-api.yaml. Combine token usage, trip progress, and MCP health in single response. Support include query param to filter sections.
  - **Dependencies**: T007 (token API), T008 (progress API)
  - **Acceptance**: curl returns combined payload with tokens, progress, mcp sections

- [ ] **T010** Create MCP health check API route `mcp-health.js`
  - **File**: `apps/librechat/server/routes/voygent/mcp-health.js`
  - **Description**: Implement GET /api/voygent/mcp-health endpoint per contracts/status-api.yaml. Ping all 5 MCP server health endpoints, measure latency, return connection status.
  - **Dependencies**: T006 (server registry)
  - **Acceptance**: curl returns healthy: true with all 5 servers connected

---

## Phase 2: Frontend State Management

### Recoil Atoms

- [ ] **T011** [P] Create Recoil store file `voygent.ts`
  - **File**: `apps/librechat/client/src/store/voygent.ts`
  - **Description**: Define all Recoil atoms per data-model.md section 1: voygentLastUsage, voygentCumulativeUsage, voygentTripProgress, voygentStatusVerbosity, voygentStatusMode, voygentDefaultQuery, voygentMCPStatus, voygentMCPHealthy (selector). Include localStorage persistence for verbosity and mode.
  - **Acceptance**: All 8 atoms/selectors defined with correct types and effects

- [ ] **T012** [P] Create TypeScript interfaces `types.ts`
  - **File**: `apps/librechat/client/src/components/StatusBar/types.ts`
  - **Description**: Define StatusBarProps, StatusPayload, MCPStatusIndicatorProps, MCPServerHealth interfaces per data-model.md section 5.
  - **Acceptance**: All interfaces match data-model.md schemas

---

## Phase 3: Token Usage Indicator

### Component Implementation

- [ ] **T013** Create StatusBar component `StatusBar.tsx`
  - **File**: `apps/librechat/client/src/components/StatusBar/index.tsx`
  - **Description**: Port StatusBar component from ~/dev/voygen reference (research.md section 2). Implement dual-mode display (tokens vs progress), 15s polling via react-query, smart fallback to localStorage, verbosity modes (minimal/normal/verbose).
  - **Dependencies**: T011 (Recoil store), T012 (types), T009 (status API)
  - **Acceptance**: Component renders token usage in bottom-right pill, updates every 15s, shows all metrics per verbosity setting

- [ ] **T014** [P] Create StatusBar styles `StatusBar.module.css`
  - **File**: `apps/librechat/client/src/components/StatusBar/StatusBar.module.css`
  - **Description**: Implement fixed positioning (bottom-right), rounded pill design, backdrop blur, semi-transparent background, responsive text sizing (xs on mobile, sm on desktop).
  - **Acceptance**: Matches design from research.md section 2, positioned at right: 12px, bottom: 12px

- [ ] **T015** Integrate StatusBar into root layout
  - **File**: `apps/librechat/client/src/App.tsx`
  - **Description**: Import and render StatusBar component at root level (after main content). Ensure renders on all pages.
  - **Dependencies**: T013 (StatusBar component)
  - **Acceptance**: StatusBar visible on all LibreChat pages

### Backend Integration

- [ ] **T016** Create token logging middleware `logTokenUsage.js`
  - **File**: `apps/librechat/server/middleware/logTokenUsage.js`
  - **Description**: Extract token metadata from AI API responses (Anthropic, OpenAI), calculate cost via model-pricing.ts, insert into token_usage_log table. Hook into response pipeline.
  - **Dependencies**: T004 (database), T005 (pricing)
  - **Acceptance**: Token usage logged to DB after each AI response, cost calculated correctly

- [ ] **T017** Wire token logging into LibreChat response handler
  - **File**: `apps/librechat/server/routes/ask/[endpoint].js` (modify existing)
  - **Description**: Call logTokenUsage middleware after AI response completes. Pass conversation_id, user_id, model, token counts.
  - **Dependencies**: T016 (middleware)
  - **Acceptance**: Every AI response triggers token logging

---

## Phase 4: Trip Progress Indicator

### Backend Integration

- [ ] **T018** Create trip progress update function `updateTripProgress.js`
  - **File**: `apps/librechat/server/utils/updateTripProgress.js`
  - **Description**: Function to update trips_v2 progress fields (phase, step, percent). Calculate percent based on phase weights per data-model.md section 3 (Research 0-20%, Hotels 20-40%, etc.).
  - **Dependencies**: T004 (database)
  - **Acceptance**: updateTripProgress('trip_xyz', 'Hotels', 3, 5) sets percent to 32

- [ ] **T019** Integrate progress updates into MCP workflow
  - **File**: `apps/librechat/server/routes/ask/[endpoint].js` (modify existing)
  - **Description**: After MCP tool calls (d1_database, prompt_instructions), check for trip context and update progress. Call updateTripProgress() when trip phase/step changes.
  - **Dependencies**: T018 (update function)
  - **Acceptance**: Progress updates when MCP tools execute during trip planning

### Frontend Display

- [ ] **T020** Update StatusBar to show trip progress
  - **File**: `apps/librechat/client/src/components/StatusBar/index.tsx` (modify existing)
  - **Description**: Add smart switching logic: if tripName present in status payload, show progress instead of tokens. Display tripName, phase, step, percent, cost/budget based on verbosity.
  - **Dependencies**: T013 (StatusBar component), T008 (progress API)
  - **Acceptance**: StatusBar switches to progress mode when trip active, shows all progress fields

---

## Phase 5: Voygent Branding

### Brand Assets

- [ ] **T021** [P] Create Voygent logo SVG (light mode) `logo-light.svg`
  - **File**: `apps/librechat/client/public/assets/voygent/logo-light.svg`
  - **Description**: Design or obtain Voygent.ai logo in SVG format optimized for light backgrounds. Max dimensions 200x50px, under 10KB.
  - **Acceptance**: SVG file exists, renders cleanly in browser

- [ ] **T022** [P] Create Voygent logo SVG (dark mode) `logo-dark.svg`
  - **File**: `apps/librechat/client/public/assets/voygent/logo-dark.svg`
  - **Description**: Dark mode variant of logo (white/light colors). Same dimensions as light mode.
  - **Acceptance**: SVG file exists, contrasts well on dark background

- [ ] **T023** [P] Create favicon `favicon.ico`
  - **File**: `apps/librechat/client/public/assets/voygent/favicon.ico`
  - **Description**: Generate favicon from logo (16x16, 32x32, 64x64 sizes in single .ico file).
  - **Dependencies**: T021 (logo)
  - **Acceptance**: Favicon displays in browser tab

- [ ] **T024** [P] Define color palette constants `colors.ts`
  - **File**: `apps/librechat/customizations/branding/colors.ts`
  - **Description**: Export color constants per research.md section 4: primary (#0066cc), primary-dark (#004999), secondary (#ff6b35), accent (#00c9a7). Include light/dark mode variants.
  - **Acceptance**: All colors defined with hex codes, accessible (WCAG AA)

### CSS Theme

- [ ] **T025** Create Voygent theme CSS `voygent-theme.css`
  - **File**: `apps/librechat/client/src/customizations/branding/voygent-theme.css`
  - **Description**: Override LibreChat CSS variables per research.md section 4. Set --accent-primary to Voygent blue, update fonts to Inter/Plus Jakarta Sans, apply logo via content: url(), hide LibreChat branding text.
  - **Dependencies**: T021, T022, T024 (assets and colors)
  - **Acceptance**: Custom theme fully replaces LibreChat branding

- [ ] **T026** Load custom theme in app
  - **File**: `apps/librechat/client/src/App.tsx` (modify existing)
  - **Description**: Import voygent-theme.css before other styles to ensure proper override precedence.
  - **Dependencies**: T025 (theme CSS)
  - **Acceptance**: Voygent colors and logo visible on app load

### Component Modifications

- [ ] **T027** [P] Update Header component for logo `Header.tsx`
  - **File**: `apps/librechat/client/src/components/Header/Header.tsx` (modify existing)
  - **Description**: Replace LibreChat logo with Voygent logo (logo-light.svg for light mode, logo-dark.svg for dark mode). Update alt text and title.
  - **Dependencies**: T021, T022 (logos)
  - **Acceptance**: Voygent logo displays in header, switches with theme

- [ ] **T028** [P] Update LoginForm component for branding `LoginForm.tsx`
  - **File**: `apps/librechat/client/src/components/Auth/LoginForm.tsx` (modify existing)
  - **Description**: Replace LibreChat branding on login screen (logo, title, tagline). Add "Voygent Travel Agent" tagline.
  - **Dependencies**: T021, T022 (logos)
  - **Acceptance**: Login screen shows only Voygent branding

- [ ] **T029** [P] Update Sidebar component for icon `Sidebar.tsx`
  - **File**: `apps/librechat/client/src/components/Sidebar/Sidebar.tsx` (modify existing)
  - **Description**: Replace collapsed sidebar icon with Voygent icon (simplified logo).
  - **Dependencies**: T021 (logo)
  - **Acceptance**: Sidebar icon is Voygent branded

---

## Phase 6: Travel Agent Mode Lock

### Configuration

- [ ] **T030** Update librechat.yaml for default endpoint
  - **File**: `apps/librechat/config/librechat.yaml`
  - **Description**: Set Voygent Anthropic endpoint as default. Add `default: true` to Voygent Anthropic endpoint config. Verify all 5 MCP servers have `startup: true`.
  - **Acceptance**: Config has default endpoint set, all MCP servers auto-enable

- [ ] **T031** Create endpoint lock component `EndpointLock.tsx`
  - **File**: `apps/librechat/client/src/customizations/components/EndpointLock.tsx`
  - **Description**: Force Voygent Anthropic endpoint via Recoil state on mount. Inject CSS to hide endpoint selector (.endpoint-selector { display: none !important; }).
  - **Dependencies**: T011 (Recoil store)
  - **Acceptance**: Endpoint selector hidden, voygent-anthropic always selected

- [ ] **T032** Integrate EndpointLock into app
  - **File**: `apps/librechat/client/src/App.tsx` (modify existing)
  - **Description**: Render EndpointLock component at root level to enforce mode lock on startup.
  - **Dependencies**: T031 (EndpointLock component)
  - **Acceptance**: Users cannot switch endpoints

### Startup Instructions

- [ ] **T033** Create auto-load instructions middleware `autoLoadInstructions.js`
  - **File**: `apps/librechat/server/middleware/autoLoadInstructions.js`
  - **Description**: On new conversation creation, fetch core + travel_agent_start instructions from prompt_instructions MCP server. Inject as system message.
  - **Acceptance**: New conversations auto-load travel agent instructions

- [ ] **T034** Wire instructions middleware into conversation routes
  - **File**: `apps/librechat/server/routes/api/conversations.js` (modify existing)
  - **Description**: Call autoLoadInstructions middleware before creating new conversation.
  - **Dependencies**: T033 (middleware)
  - **Acceptance**: Instructions loaded on POST /api/conversations

### MCP Health Indicator

- [ ] **T035** Create MCP status indicator component `MCPStatusIndicator.tsx`
  - **File**: `apps/librechat/client/src/components/MCPStatusIndicator/index.tsx`
  - **Description**: Display minimal green/yellow/red dot in header based on MCP health. Poll /api/voygent/mcp-health every 30s. Green if all healthy, yellow if 1-2 degraded, red if 3+ down. Click to expand server list.
  - **Dependencies**: T010 (health API), T011 (Recoil store)
  - **Acceptance**: Dot displays in header, updates every 30s, clickable for details

- [ ] **T036** Integrate MCP indicator into Header
  - **File**: `apps/librechat/client/src/components/Header/Header.tsx` (modify existing)
  - **Description**: Render MCPStatusIndicator component in header (top-right corner).
  - **Dependencies**: T035 (indicator component)
  - **Acceptance**: MCP health dot visible in header

---

## Phase 7: Testing & Validation

### Contract Tests

- [ ] **T037** [P] Contract test for token-usage-api.yaml
  - **File**: `apps/librechat/tests/contract/test_token_usage_api.js`
  - **Description**: Validate GET /api/voygent/token-usage response matches OpenAPI schema. Test 200 success, 204 no data, 400 invalid params.
  - **Dependencies**: T007 (token API)
  - **Acceptance**: All schema validations pass, HTTP status codes correct

- [ ] **T038** [P] Contract test for trip-progress-api.yaml
  - **File**: `apps/librechat/tests/contract/test_trip_progress_api.js`
  - **Description**: Validate GET /api/voygent/trip-progress response matches OpenAPI schema. Test 200 success, 204 no trip, 404 not found.
  - **Dependencies**: T008 (progress API)
  - **Acceptance**: All schema validations pass, percent calculation correct

- [ ] **T039** [P] Contract test for status-api.yaml
  - **File**: `apps/librechat/tests/contract/test_status_api.js`
  - **Description**: Validate GET /api/voygent/status combined response. Test include parameter filtering (tokens, progress, mcp).
  - **Dependencies**: T009 (status API)
  - **Acceptance**: Combined payload schema valid, filtering works

### Integration Tests

- [ ] **T040** [P] Integration test: Branding displays on startup
  - **File**: `apps/librechat/tests/integration/test_branding.spec.js`
  - **Description**: E2E test that Voygent logo, colors, fonts display on app load. No LibreChat branding visible.
  - **Dependencies**: T025, T026, T027, T028 (branding complete)
  - **Acceptance**: Visual regression test passes, Voygent branding 100% applied

- [ ] **T041** [P] Integration test: Token usage updates and persists
  - **File**: `apps/librechat/tests/integration/test_token_persistence.spec.js`
  - **Description**: E2E test that token metrics update after AI response, persist to localStorage, restore on page refresh.
  - **Dependencies**: T013, T016, T017 (token tracking complete)
  - **Acceptance**: Token count increments, localStorage contains data, refresh restores state

- [ ] **T042** Integration test: Mode lock prevents endpoint switching
  - **File**: `apps/librechat/tests/integration/test_mode_lock.spec.js`
  - **Description**: E2E test that endpoint selector is hidden, Voygent Anthropic endpoint always active, MCP servers always enabled.
  - **Dependencies**: T031, T032, T034 (mode lock complete)
  - **Acceptance**: Endpoint selector not in DOM, endpoint state immutable

---

## Dependencies Graph

```
Setup (Database):
  T001, T002, T003 [P] → T004

Backend APIs:
  T005, T006 [P] (no deps)
  T004 + T005 → T007
  T004 → T008
  T007 + T008 → T009
  T006 → T010

Frontend State:
  T011, T012 [P] (no deps)

Token Indicator:
  T011 + T012 + T009 → T013
  T014 [P] (no deps)
  T013 → T015
  T004 + T005 → T016
  T016 → T017

Trip Progress:
  T004 → T018
  T018 → T019
  T013 + T008 → T020

Branding:
  T021, T022, T023, T024 [P] (no deps)
  T021 + T022 + T024 → T025
  T025 → T026
  T021 + T022 → T027, T028, T029 [P]

Mode Lock:
  T030 (no deps)
  T011 → T031
  T031 → T032
  T033 (no deps)
  T033 → T034
  T010 + T011 → T035
  T035 → T036

Testing:
  T007 → T037 [P]
  T008 → T038 [P]
  T009 → T039 [P]
  (All branding) → T040 [P]
  (All token tracking) → T041 [P]
  (All mode lock) → T042
```

---

## Parallel Execution Examples

### Database Migrations (Launch Together)
```bash
# T001, T002, T003 can run in parallel (different files)
Task: "Create D1 migration 003_token_usage_log.sql for token tracking table"
Task: "Create D1 migration 004_model_pricing.sql for pricing lookup table"
Task: "Create D1 migration 005_trip_progress_fields.sql for trip progress tracking"
```

### Backend Utilities (Launch Together)
```bash
# T005, T006 can run in parallel (independent files)
Task: "Create token pricing utility model-pricing.ts"
Task: "Create MCP server registry server-registry.ts"
```

### Brand Assets (Launch Together)
```bash
# T021, T022, T023, T024 can run in parallel (different assets)
Task: "Create Voygent logo SVG (light mode) logo-light.svg"
Task: "Create Voygent logo SVG (dark mode) logo-dark.svg"
Task: "Create favicon favicon.ico"
Task: "Define color palette constants colors.ts"
```

### Component Branding (Launch Together)
```bash
# T027, T028, T029 can run in parallel (different component files)
Task: "Update Header component for logo Header.tsx"
Task: "Update LoginForm component for branding LoginForm.tsx"
Task: "Update Sidebar component for icon Sidebar.tsx"
```

### Contract Tests (Launch Together)
```bash
# T037, T038, T039, T040, T041 can run in parallel (different test files)
Task: "Contract test for token-usage-api.yaml"
Task: "Contract test for trip-progress-api.yaml"
Task: "Contract test for status-api.yaml"
Task: "Integration test: Branding displays on startup"
Task: "Integration test: Token usage updates and persists"
```

---

## Validation Checklist

### Database
- [ ] All 3 migrations applied to voygent-prod
- [ ] token_usage_log table exists with indexes
- [ ] model_pricing table seeded with 4 models
- [ ] trips_v2 has 7 new progress fields

### Backend APIs
- [ ] GET /api/voygent/token-usage returns 200 or 204
- [ ] GET /api/voygent/trip-progress returns 200 or 204
- [ ] GET /api/voygent/status combines all 3 sections
- [ ] GET /api/voygent/mcp-health pings all 5 servers
- [ ] Token logging middleware extracts metadata correctly
- [ ] Cost calculation matches pricing table

### Frontend State
- [ ] All 8 Recoil atoms defined
- [ ] localStorage persists verbosity and mode
- [ ] Types match data-model.md schemas

### Token Indicator
- [ ] StatusBar renders in bottom-right corner
- [ ] Displays model, input tokens, output tokens, cost
- [ ] Updates within 15s of API response
- [ ] Persists to localStorage
- [ ] Restores from localStorage on refresh
- [ ] Verbosity modes work (minimal/normal/verbose)

### Trip Progress
- [ ] StatusBar switches to progress mode when trip active
- [ ] Shows tripName, phase, step, percent
- [ ] Budget tracking displays cost/budget
- [ ] Percentage calculation correct per phase weights
- [ ] Progress updates on MCP tool calls

### Branding
- [ ] Voygent logo in header (light + dark mode)
- [ ] Voygent logo on login screen
- [ ] Voygent favicon in browser tab
- [ ] Custom colors applied (blue primary, orange secondary)
- [ ] Custom fonts loaded (Inter, Plus Jakarta Sans)
- [ ] No LibreChat branding visible
- [ ] Visual regression tests pass

### Mode Lock
- [ ] Endpoint selector hidden
- [ ] Voygent Anthropic always selected
- [ ] All 5 MCP servers auto-enabled
- [ ] Users cannot disable MCP servers
- [ ] New conversations auto-load instructions
- [ ] MCP health indicator displays in header

### Testing
- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] Manual testing per quickstart.md complete
- [ ] Performance: token update <500ms latency
- [ ] Performance: page load <3s (no asset bloat)

---

## Notes

- **Parallel Tasks**: Tasks marked [P] modify different files and can run simultaneously
- **Sequential Tasks**: Avoid running tasks on same file in parallel (e.g., T015, T017, T020 all modify App.tsx)
- **TDD**: Contract tests (T037-T039) should be written before implementation if following strict TDD
- **Reference Implementation**: Token indicator ported from ~/dev/voygen/librechat-source/client/src/components/StatusBar.tsx
- **Constitution Compliance**: MVP Exception applies for Render.com hosting (Principle I), all other principles satisfied
- **Rollback**: Each phase can be rolled back independently via git revert

---

**Total Estimated Time**: 15-20 hours for full implementation
**Critical Path**: T001→T004→T007→T013→T015 (token indicator end-to-end)
**Quick Win**: T021→T025→T026 (branding visible in <2 hours)
