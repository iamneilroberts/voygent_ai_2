
# Implementation Plan: LibreChat Interface Modifications

**Branch**: `002-librechat-interface-modifications` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/neil/dev/Voygent_ai_2/specs/002-librechat-interface-modifications/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Loaded spec with clarifications resolved
2. Fill Technical Context
   → Project Type: Web application (LibreChat frontend + configuration)
   → Structure Decision: Configuration-focused (apps/librechat/config)
3. Fill Constitution Check section
   → Evaluation complete
4. Evaluate Constitution Check section
   → PASS: MVP exception applies for Render.com hosting
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → Tasks: LibreChat customization, token metrics, branding, mode locking
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Design artifacts for token metrics, branding assets, mode configuration
7. Re-evaluate Constitution Check section
   → Post-design check after Phase 1
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature enhances the LibreChat interface with four major improvements:

1. **Token Usage Indicator**: Real-time display of input/output tokens and cost estimates, referencing the implementation from voygent.appCE
2. **Voygent.ai Branding**: Complete visual rebrand with custom logo, colors, fonts, and tagline replacing all LibreChat branding
3. **Travel Agent Mode Auto-Start**: System-wide configuration that automatically initializes LibreChat in travel agent mode with Voygent Anthropic endpoint, all MCP servers enabled, and core instructions loaded
4. **Mode Locking**: Prevent users from switching out of travel agent mode, ensuring consistent experience

The implementation prioritizes configuration-based changes to avoid forking LibreChat, leveraging existing customization APIs and configuration options.

## Technical Context

**Language/Version**: JavaScript/TypeScript (LibreChat frontend), YAML (configuration), CSS (styling)
**Primary Dependencies**: LibreChat (latest), React, browser localStorage/sessionStorage, LibreChat configuration API
**Storage**:
  - Configuration files (librechat.yaml for MCP/endpoint setup)
  - Browser localStorage for token metrics persistence
  - Static assets for branding (logos, fonts, colors)
**Testing**: Manual testing, configuration validation, visual regression testing
**Target Platform**: Web (Render.com hosted LibreChat), modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web (configuration + frontend customization)
**Performance Goals**:
  - Token indicator update latency: <500ms after API response
  - Page load time: No degradation from branding assets (<100KB total assets)
  - MCP server initialization: <2s for all servers
**Constraints**:
  - MUST NOT fork LibreChat (configuration-only changes preferred)
  - Token metrics must persist across page refreshes
  - Branding must be consistent across all screens
  - Mode locking must be server-enforced (not just UI hiding)
**Scale/Scope**:
  - Single-tenant deployment (one LibreChat instance)
  - ~10-50 concurrent users (travel agents)
  - Token tracking per session, conversation, and cumulative
  - 5 MCP servers to auto-enable
  - Complete brand asset replacement (~15-20 UI touchpoints)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Edge-First Latency ✅ (MVP Exception)
- **Status**: PASS with MVP Exception
- **Justification**: LibreChat hosted on Render.com (non-edge) is acceptable per Constitution v1.2.0 MVP Exception. Token indicator and branding are frontend-only with no backend latency impact. MCP servers remain on Cloudflare Workers (edge).
- **Production Migration Plan**: LibreChat migration to edge (Cloudflare Pages or Workers) deferred to post-MVP phase. Token metrics are client-side JavaScript with no edge requirement.

### Principle II: Database Efficiency ✅
- **Status**: PASS (Not Applicable)
- **Justification**: This feature adds no database queries. Token metrics stored in browser localStorage, branding assets are static files, configuration is read once at startup.

### Principle III: Spec-Driven Development ✅
- **Status**: PASS
- **Evidence**: Following spec.md → plan.md → tasks.md workflow. All clarifications resolved in spec. This plan precedes implementation.

### Principle IV: Observable Infrastructure ✅
- **Status**: PASS
- **Evidence**: Token usage indicator provides real-time observability of LLM costs. MCP server status display shows connection health. Branding changes have no observability impact (static assets).

### Principle V: Legacy Evaluation ✅
- **Status**: PASS (Keep & Reference)
- **Component**: voygent.appCE token indicator implementation
- **Decision**: REFERENCE existing implementation
- **Scoring**:
  - Maintainability: 8/10 (working implementation, proven in production)
  - Latency: 9/10 (client-side JavaScript, no backend calls)
  - Cost: 10/10 (zero additional cost, uses existing API responses)
  - Reliability: 8/10 (stable in voygent.appCE)
  - Simplicity: 7/10 (straightforward token counting and display)
- **Total**: 42/50 (Keep and adapt for v2)
- **ADR**: Not required (configuration changes, not architectural)

**Gate Status**: ✅ PASS - All principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)
```
specs/002-librechat-interface-modifications/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── token-metrics-api.yaml      # Token usage data structure
│   ├── branding-config.yaml        # Brand assets schema
│   └── mode-lock-config.yaml       # Mode lock configuration
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
apps/
└── librechat/
    ├── Dockerfile                          # Updated to include branding assets
    ├── config/
    │   ├── librechat.yaml                  # Updated: mode lock, auto-enable MCP
    │   └── branding/                       # NEW: Brand assets directory
    │       ├── logo-light.svg
    │       ├── logo-dark.svg
    │       ├── favicon.ico
    │       └── brand-colors.css
    ├── customizations/                     # NEW: LibreChat customizations
    │   ├── components/
    │   │   └── TokenUsageIndicator.jsx     # Token usage component
    │   ├── styles/
    │   │   ├── voygent-theme.css           # Custom branding styles
    │   │   └── token-indicator.css         # Token indicator styles
    │   └── utils/
    │       ├── tokenMetrics.js             # Token counting logic
    │       └── localStorage.js             # Persistence utilities
    └── .env.example                        # Updated with new env vars

infra/
└── render.yaml                             # Updated environment variables

docs/
└── runbooks/
    └── librechat-customization.md          # NEW: Maintenance guide

/CLAUDE.md                                  # Updated with LibreChat guidance
```

**Structure Decision**: Configuration-focused web application. LibreChat is a monolithic React application with configuration-based customization. We extend via:
1. **librechat.yaml**: Endpoint/MCP configuration, startup behavior
2. **Custom components**: React components mounted via LibreChat's customization API
3. **CSS overrides**: Branding theme via custom stylesheets
4. **Docker build**: Include custom assets in container image

This avoids forking while achieving deep customization.

## Phase 0: Outline & Research

**Research Tasks**:

1. **LibreChat Customization API** (NEEDS CLARIFICATION resolved)
   - Research: LibreChat's official customization mechanisms (custom endpoints, UI components, theming)
   - Questions:
     - Does LibreChat support custom React component injection?
     - What is the branding override mechanism (CSS variables, config, or code changes)?
     - How are custom UI components mounted/registered?
     - Is there a plugin/extension API?
   - Output: Document customization patterns in research.md

2. **Token Usage Implementation Reference** (voygent.appCE)
   - Research: Review /home/neil/dev/voygent.appCE token indicator implementation
   - Questions:
     - How is token data extracted from API responses?
     - Where is token data persisted (localStorage, state management)?
     - What is the UI component structure?
     - How are costs calculated (pricing per model)?
   - Output: Document token indicator architecture in research.md

3. **Branding Asset Requirements**
   - Research: LibreChat branding touchpoints
   - Questions:
     - Which UI elements display LibreChat branding (header, sidebar, footer, login, etc.)?
     - What asset formats are required (SVG, PNG, CSS variables)?
     - How are logos displayed (light/dark mode variants)?
     - What font loading mechanisms are supported?
   - Output: Complete branding asset checklist in research.md

4. **Mode Locking Mechanisms**
   - Research: LibreChat endpoint selection and locking
   - Questions:
     - Can default endpoint be enforced system-wide?
     - Is there a config option to hide endpoint selector UI?
     - How are MCP servers enabled by default (startup: true)?
     - Can users disable MCP servers via UI?
   - Output: Document mode lock configuration approach in research.md

5. **MCP Auto-Enable Configuration**
   - Research: Current librechat.yaml MCP configuration
   - Questions:
     - Does `startup: true` in mcpServers auto-enable on load?
     - How to verify MCP server connection status?
     - What error handling occurs if MCP server unavailable?
     - Can users toggle MCP servers off?
   - Output: Document MCP auto-enable best practices in research.md

6. **Token Pricing Data**
   - Research: Anthropic and OpenAI token pricing
   - Questions:
     - Current per-token pricing for claude-3-5-sonnet, claude-3-5-haiku, gpt-4o, gpt-4o-mini
     - How to handle pricing updates (hardcoded, config file, API)?
     - Should pricing be per-model or per-endpoint?
   - Output: Token pricing table in research.md

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Extract entities from feature spec → `data-model.md`

**Entities**:
- **TokenUsageMetrics**: Real-time and historical token consumption
  - Fields: inputTokens, outputTokens, totalTokens, costEstimate, timestamp, modelName, endpoint
  - Relationships: Belongs to Conversation, Session
  - Validation: Non-negative integers, valid timestamp, positive cost
  - State: Created on API response, updated incrementally, persisted to localStorage

- **BrandingAssets**: Voygent.ai visual identity
  - Fields: logoLight (SVG), logoDark (SVG), favicon (ICO), primaryColor, accentColor, fontFamily, tagline
  - Relationships: Applied globally to UI components
  - Validation: Valid color hex codes, accessible font URLs, valid SVG/ICO format
  - State: Loaded at application startup, cached

- **AgentModeConfig**: Travel agent mode settings
  - Fields: defaultEndpoint (string), lockedMode (boolean), autoLoadInstructions (boolean), mcpServersEnabled (array)
  - Relationships: References MCPServerConfig list
  - Validation: Valid endpoint name, boolean flags, non-empty MCP server list
  - State: Read from librechat.yaml at startup, immutable during session

- **MCPServerConfig**: Individual MCP server connection
  - Fields: serverName, url, type, description, startupEnabled, connectionStatus, healthCheck
  - Relationships: Referenced by AgentModeConfig
  - Validation: Valid URL format, supported type (streamable-http, http), non-empty name
  - State: Initialized at startup, connection status updated on health check

- **ConversationSession**: User interaction context
  - Fields: sessionId, startTime, activeEndpoint, tokenUsage (array of TokenUsageMetrics), mcpServersActive (array)
  - Relationships: Contains multiple TokenUsageMetrics, applies BrandingAssets and AgentModeConfig
  - Validation: Valid session ID, future-proof timestamp, active endpoint matches AgentModeConfig
  - State: Created on new conversation, persisted across page refreshes, cleared on logout

### 2. Generate API contracts from functional requirements

**Contracts to generate**:

1. **Token Metrics API** (`/contracts/token-metrics-api.yaml`):
   - Schema for TokenUsageMetrics data structure
   - localStorage persistence format
   - Cost calculation formulas (per-model pricing)

2. **Branding Configuration** (`/contracts/branding-config.yaml`):
   - BrandingAssets schema (asset paths, color codes, fonts)
   - CSS variable mapping (--primary-color, --accent-color, etc.)
   - Theme application logic (light/dark mode variants)

3. **Mode Lock Configuration** (`/contracts/mode-lock-config.yaml`):
   - AgentModeConfig schema for librechat.yaml
   - Default endpoint enforcement rules
   - UI element visibility flags (hide endpoint selector, hide MCP toggle)
   - Auto-load instructions configuration

**Output**: OpenAPI/JSON Schema specifications in `/contracts/`

### 3. Generate contract tests from contracts

**Contract Tests** (in repository tests/ directory):
- `test_token_metrics_schema.js`: Validate TokenUsageMetrics structure
- `test_branding_config_schema.js`: Validate BrandingAssets structure
- `test_mode_lock_config.js`: Validate librechat.yaml mode lock settings
- `test_mcp_autostart.js`: Verify MCP servers auto-enable configuration

**Assertions**:
- Token metrics have required fields (inputTokens, outputTokens, cost)
- Branding assets exist at specified paths
- librechat.yaml contains mode lock configuration
- All 5 MCP servers have `startup: true`

**Tests must fail**: No implementation exists yet.

### 4. Extract test scenarios from user stories

**Integration Test Scenarios** (from spec.md User Scenarios):

1. **Scenario: First-time user sees branding and auto-starts in travel agent mode**
   - Given: User opens LibreChat for first time
   - When: Page loads
   - Then: Voygent.ai logo displays, all MCP servers connect, Voygent Anthropic endpoint selected, core instructions loaded
   - Validation: Visual inspection, endpoint API call, MCP server status API

2. **Scenario: Token usage updates in real-time**
   - Given: User is in active conversation
   - When: Message sent and response received
   - Then: Token indicator updates within 500ms showing new counts and cost
   - Validation: Assert token metrics increment, timestamp updates, cost recalculated

3. **Scenario: Token usage persists across page refresh**
   - Given: User has accumulated token usage in session
   - When: Page is refreshed
   - Then: Token usage metrics display previous cumulative totals
   - Validation: Assert localStorage contains metrics, UI renders persisted data

4. **Scenario: User cannot switch out of travel agent mode**
   - Given: User is in travel agent mode
   - When: User attempts to change endpoint or disable MCP servers
   - Then: UI controls are hidden/disabled, mode remains locked
   - Validation: Assert endpoint selector not rendered, MCP toggles disabled

5. **Scenario: MCP server connection failure displays error**
   - Given: One MCP server is unavailable (simulated downtime)
   - When: LibreChat attempts to initialize
   - Then: Error message displays for failed server, other servers connect normally
   - Validation: Assert error UI renders, connection status API returns failure for one server

**Quickstart Test**: Complete user flow from login → see branding → use MCP tool → view token usage → refresh page → verify persistence

### 5. Update CLAUDE.md incrementally

**Update Approach**:
- Run `.specify/scripts/bash/update-agent-context.sh claude` after Phase 1 design complete
- Add new sections:
  - **LibreChat Customization**: Reference customization patterns from research.md
  - **Token Indicator Maintenance**: How to update pricing, add new models
  - **Branding Asset Updates**: How to swap logos, colors, fonts
  - **Mode Lock Configuration**: How to modify default endpoint or MCP servers
- Preserve existing content (Project Overview, Database, Architecture Strategy)
- Keep under 150 lines for token efficiency

**Output**: Updated /home/neil/dev/Voygent_ai_2/CLAUDE.md

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**: `.specify/templates/tasks-template.md`
2. **Generate from Phase 1 Artifacts**:
   - Each contract → contract test task
   - Each entity → implementation task
   - Each user story → integration test task
3. **Task Categories**:
   - **Research Tasks**: Phase 0 investigation (LibreChat API, voygent.appCE reference, branding touchpoints)
   - **Asset Creation Tasks**: Logo design, color palette, font selection, favicon
   - **Configuration Tasks**: Update librechat.yaml for mode lock + MCP auto-enable
   - **Implementation Tasks**: Token usage component, branding CSS overrides, localStorage utils
   - **Testing Tasks**: Contract tests, integration tests, visual regression tests
   - **Documentation Tasks**: Quickstart, runbook, CLAUDE.md updates

**Ordering Strategy**:

1. **Phase 0: Research** (Parallel - all independent)
   - [P] Research LibreChat customization API
   - [P] Review voygent.appCE token indicator implementation
   - [P] Identify branding touchpoints
   - [P] Research mode locking mechanisms
   - [P] Document MCP auto-enable configuration
   - [P] Compile token pricing data

2. **Phase 1: Design** (Sequential - depends on research)
   - Generate data-model.md from research findings
   - Write contract specifications (token metrics, branding, mode lock)
   - Write failing contract tests
   - Create quickstart.md test scenarios
   - Update CLAUDE.md with customization guidance

3. **Phase 2: Asset Creation** (Parallel - independent)
   - [P] Design Voygent.ai logo (light + dark mode SVG)
   - [P] Create favicon from logo
   - [P] Define color palette (primary, accent, backgrounds)
   - [P] Select and configure web fonts
   - [P] Write tagline copy

4. **Phase 3: Configuration** (Sequential - depends on assets)
   - Update librechat.yaml: Set default endpoint to "Voygent Anthropic"
   - Update librechat.yaml: Add mode lock configuration
   - Update librechat.yaml: Set all MCP servers `startup: true`
   - Update librechat.yaml: Configure auto-load instructions
   - Update Dockerfile: Copy branding assets to image

5. **Phase 4: Implementation** (Sequential - depends on configuration)
   - Create tokenMetrics.js utility (extract from API responses, calculate cost)
   - Create localStorage.js utility (persist/retrieve metrics)
   - Implement TokenUsageIndicator.jsx component (display metrics, update on API response)
   - Create voygent-theme.css (brand colors, fonts, logo placement)
   - Create token-indicator.css (indicator layout, animations)
   - Integrate TokenUsageIndicator into LibreChat UI

6. **Phase 5: Testing** (Sequential - depends on implementation)
   - Run contract tests (verify schemas)
   - Run integration tests (user scenarios)
   - Visual regression testing (branding consistency)
   - Manual testing (mode lock, MCP auto-enable, token persistence)

7. **Phase 6: Documentation** (Parallel - can start during implementation)
   - [P] Write librechat-customization.md runbook
   - [P] Update quickstart.md with actual test steps
   - [P] Document known limitations and workarounds

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Task Format Example**:
```
### Task 15: Implement TokenUsageIndicator Component [P]
**Category**: Implementation
**Dependencies**: Tasks 12 (tokenMetrics.js), 13 (localStorage.js)
**Files**: apps/librechat/customizations/components/TokenUsageIndicator.jsx
**Description**: Create React component to display real-time token usage (input, output, total, cost). Update on API response, read from localStorage on mount.
**Acceptance Criteria**:
- Component renders in LibreChat header
- Displays 4 metrics: input tokens, output tokens, total tokens, cost estimate
- Updates within 500ms of API response
- Persists to localStorage on update
- Loads persisted data on page refresh
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, visual inspection, performance validation)

**Validation Criteria**:
- All contract tests pass
- All integration tests pass
- Visual regression tests show consistent branding
- Token usage updates within 500ms latency
- Token metrics persist across page refresh
- Mode locked to Voygent Anthropic endpoint
- All 5 MCP servers auto-enable on startup
- Page load time remains under 3s (no branding asset bloat)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | All principles satisfied | N/A |

**Justification Notes**:
- MVP Exception (Principle I) is pre-approved in Constitution v1.2.0 for Render.com hosting
- No other constitutional violations identified
- Configuration-first approach minimizes complexity and avoids LibreChat forking

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
- [x] Initial Constitution Check: PASS (MVP exception applied)
- [ ] Post-Design Constitution Check: PASS (pending Phase 1 completion)
- [ ] All NEEDS CLARIFICATION resolved (pending research.md)
- [x] Complexity deviations documented (none - all principles satisfied)

**Research Progress**:
- [ ] LibreChat customization API documented
- [ ] voygent.appCE token indicator analyzed
- [ ] Branding touchpoints identified
- [ ] Mode locking mechanism designed
- [ ] MCP auto-enable configuration validated
- [ ] Token pricing data compiled

**Design Progress**:
- [ ] data-model.md created (5 entities defined)
- [ ] Token metrics API contract generated
- [ ] Branding configuration contract generated
- [ ] Mode lock configuration contract generated
- [ ] Contract tests written (4 test files)
- [ ] Quickstart scenarios documented (5 scenarios)
- [ ] CLAUDE.md updated

**Implementation Readiness**:
- [ ] All Phase 0 research complete
- [ ] All Phase 1 design artifacts generated
- [ ] Post-design constitution check passed
- [ ] Ready for /tasks command

---

## External Review

*To be completed by Codex CLI in critic mode before implementation*

**Review Status**: ⏳ PENDING

**Codex Critique Command**:
```bash
codex --profile critic "Review /home/neil/dev/Voygent_ai_2/specs/002-librechat-interface-modifications/plan.md for constitution violations, edge cases, performance risks, security issues, and maintainability problems. Focus on: 1) LibreChat customization approach (forking risk), 2) Token metrics accuracy (API response parsing), 3) Mode lock bypass vulnerabilities, 4) Branding asset performance, 5) MCP server initialization failure handling. Be adversarial."
```

**Expected Findings** (to be documented post-review):
- HIGH: [To be filled by Codex]
- MEDIUM: [To be filled by Codex]
- LOW: [To be filled by Codex]

**Action Items**: Address all HIGH severity findings before Phase 2 task generation.

---

*Based on Constitution v1.2.0 - See `/home/neil/dev/Voygent_ai_2/.specify/memory/constitution.md`*
