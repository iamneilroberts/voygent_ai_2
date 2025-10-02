# Implementation Plan: Force Loading Core Instructions on LibreChat Startup

**Branch**: `007-force-loading-core` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-force-loading-core/spec.md`

## Execution Flow (/plan command scope)
```
✓ 1. Load feature spec from Input path
✓ 2. Fill Technical Context (scan for NEEDS CLARIFICATION)
✓ 3. Fill the Constitution Check section
✓ 4. Evaluate Constitution Check section
✓ 5. Execute Phase 0 → research.md
✓ 6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
✓ 7. Re-evaluate Constitution Check section
✓ 8. Plan Phase 2 → Describe task generation approach
✓ 9. STOP - Ready for /tasks command
```

**STATUS**: Complete - Ready for `/tasks` command

---

## Summary

Implement automatic loading of Voygent-specific core instructions (system prompts and context) in LibreChat on application startup, with browser localStorage persistence and manual reload capability via `/voygent` slash command. The system uses graceful degradation—allowing users to proceed with chat interactions even if instruction loading fails. Visual feedback via toast notifications for all states (loading, success, error).

**Key Components**:
1. Static configuration file (`core-instructions.md`) served by LibreChat API
2. Client-side loading service with localStorage caching
3. React hook for instruction management
4. `/voygent` slash command for manual reload
5. Toast notifications for user feedback

**Technical Approach** (from research.md):
- Client-side async loading on app initialization
- localStorage for persistence (2-4KB instructions, <5MB limit)
- Fetch API for network requests with 5s timeout
- React state management for load status
- Extension of existing LibreChat slash command system
- No database changes required

---

## Technical Context

**Language/Version**: JavaScript/Node.js 18+ (LibreChat backend), TypeScript/React 18+ (LibreChat client)
**Primary Dependencies**:
- React 18+ (LibreChat client framework)
- Express.js (LibreChat API server)
- Existing toast notification library (react-toastify or similar)
- Browser APIs: localStorage, fetch

**Storage**: Browser localStorage (client-side), static config file (server filesystem)
**Testing**: Jest + React Testing Library (existing LibreChat test stack)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Initial load: <500ms (network fetch)
- Cache load: <50ms (localStorage)
- Manual reload: <500ms
**Constraints**:
- Instructions file size: <10KB (target 2-4KB)
- Graceful degradation required (no blocking on failure)
- Must persist across page refreshes
**Scale/Scope**:
- Single config file
- Client-side feature (minimal backend changes)
- ~5-7 implementation tasks

---

## Constitution Check

**Note**: No formal constitution.md exists for this project yet. Applying general software engineering principles from CLAUDE.md.

### Principles Evaluation

**Principle: Optimize for fewest DB calls per LLM task**
- ✅ **PASS**: No database usage - static file + localStorage only

**Principle: Prefer boring, observable infrastructure**
- ✅ **PASS**: Uses standard web APIs (fetch, localStorage), no exotic dependencies

**Principle: Keep legacy only if demonstrably better**
- ✅ **PASS**: New feature, no legacy conflicts

**Principle: Everything as code**
- ✅ **PASS**: Configuration in version-controlled file, infrastructure as code

**Principle: Ship small, test early, add rollback**
- ✅ **PASS**: Small feature scope, comprehensive test plan in quickstart.md, easy rollback (remove files)

### Architecture Evaluation

**Edge-first Architecture Compatibility**
- ✅ **PASS**: Static config served by LibreChat (already on Render), no new edge services needed
- Client-side caching aligns with edge principles (reduce round-trips)

**Spec-First Approach**
- ✅ **PASS**: Full spec → plan → tasks workflow followed
- Research, data model, contracts, quickstart all documented

### Complexity Assessment

**Deviation Check**: None
- No new services required
- No database schema changes
- No external API integrations
- Uses existing LibreChat patterns (slash commands, toast notifications)
- Minimal surface area: 1 config file + 1 API endpoint + client-side logic

**Verdict**: ✅ All principles satisfied, no complexity justification needed

---

## Project Structure

### Documentation (this feature)
```
specs/007-force-loading-core/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (complete)
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (complete)
├── quickstart.md        # Phase 1 output (complete)
├── contracts/           # Phase 1 output (complete)
│   └── api-contract.yaml
└── tasks.md             # Phase 2 output (TO BE CREATED by /tasks command)
```

### Source Code (repository root)

**Structure Decision**: Web application (LibreChat has frontend + backend)

```
apps/librechat/
├── api/
│   └── server/
│       └── routes/
│           └── config.js          # [NEW] Serve core-instructions.md
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useCoreInstructions.ts  # [NEW] React hook for instruction loading
│       ├── services/
│       │   └── CoreInstructionsService.ts  # [NEW] Fetch/cache logic
│       ├── commands/
│       │   └── voygentCommand.ts  # [NEW] /voygent slash command
│       └── App.tsx                # [MODIFY] Add initialization hook
├── config/
│   └── core-instructions.md       # [NEW] Static config file with system prompts
└── package.json                   # No changes needed (uses existing deps)

tests/
└── integration/
    └── core-instructions.test.ts  # [NEW] Integration tests
```

**Key Files**:
1. **Config**: `apps/librechat/config/core-instructions.md` - Markdown file with Voygent system prompts
2. **API Route**: `apps/librechat/api/server/routes/config.js` - Serve config file as `/api/config/core-instructions`
3. **Service**: `apps/librechat/client/src/services/CoreInstructionsService.ts` - Fetch, cache, error handling
4. **Hook**: `apps/librechat/client/src/hooks/useCoreInstructions.ts` - React state management
5. **Command**: `apps/librechat/client/src/commands/voygentCommand.ts` - Slash command handler
6. **App Init**: `apps/librechat/client/src/App.tsx` - Call hook on startup
7. **Tests**: `tests/integration/core-instructions.test.ts` - Integration tests

---

## Phase 0: Outline & Research

**STATUS**: ✅ Complete

**Output**: [research.md](./research.md)

**Key Decisions Made**:
1. **Storage**: Static config file + localStorage caching
2. **Loading**: Client-side async on app init with React hook
3. **Slash Command**: Extend existing LibreChat command system
4. **Visual Feedback**: Toast notifications (loading/success/error)
5. **Error Handling**: Graceful degradation, never block users
6. **Format**: Markdown, 2-4KB target size

**Technologies Confirmed**:
- React 18+ for client state management
- Express.js for API endpoint (serve static config)
- Browser localStorage API (5-10MB limit, instructions ~2-4KB)
- Fetch API with 5s timeout
- Existing toast library (react-toastify or similar)

**Alternatives Rejected**:
- Database storage (unnecessary complexity)
- Environment variables (poor for multi-line text)
- MCP server endpoint (unnecessary latency)
- Modal dialogs (too intrusive)
- Blocking on load failure (violates FR-004)

---

## Phase 1: Design & Contracts

**STATUS**: ✅ Complete

### 1. Data Model
**Output**: [data-model.md](./data-model.md)

**Entities**:
1. **CoreInstructions** (static config file)
   - content: string (100-10000 chars)
   - version: string (optional)
   - lastModified: timestamp

2. **InstructionsLoadState** (client state)
   - status: 'idle' | 'loading' | 'loaded' | 'error'
   - content: string | null
   - errorMessage: string | null
   - lastLoadTime: number | null
   - source: 'localStorage' | 'network' | 'none'

3. **LocalStorageCache** (browser storage)
   - Key: 'voygent-core-instructions'
   - Value: `{ content: string, cachedAt: number, source: 'network', version?: string }`

**No Database Schema**: All data is configuration or client-side state

### 2. API Contracts
**Output**: [contracts/api-contract.yaml](./contracts/api-contract.yaml)

**HTTP Endpoint**:
```
GET /api/config/core-instructions
Response: 200 (text/markdown), 404, 500
Headers: Content-Type, Cache-Control (public, max-age=3600), Content-Length
Size: 100-10240 bytes
```

**TypeScript Interfaces**:
- `CoreInstructionsService` - Main service interface
- `InstructionsLoadState` - State shape
- `StoredInstructions` - localStorage schema
- `SlashCommand` - Command registration
- `InstructionToasts` - Toast notifications

**Contract Tests** (35 test requirements documented in contract file)

### 3. Integration Tests
**Output**: Test scenarios in [quickstart.md](./quickstart.md)

**7 Test Scenarios**:
1. First-time load (no cache) - verify auto-load + toast + caching
2. Subsequent load (with cache) - verify fast restore, no toast
3. Manual reload via /voygent - verify command works, cache updates
4. Error handling (network failure) - verify graceful degradation
5. Error handling (missing file) - verify 404 handling
6. Edge case (corrupted cache) - verify recovery
7. Multi-tab behavior - verify localStorage sharing

**Performance Benchmarks**:
- First load: 100-500ms (target 200ms)
- Cache load: 5-50ms (target 10ms)
- Manual reload: 100-500ms (target 200ms)

### 4. Agent Context Update
**Output**: Updated [CLAUDE.md](../../CLAUDE.md)

- ✅ Executed `.specify/scripts/bash/update-agent-context.sh claude`
- Added feature-specific context (JavaScript/TypeScript, React, Express, D1)
- Preserved existing project context

---

## Phase 2: Task Planning Approach

**STATUS**: Documented (ready for `/tasks` command)

### Task Generation Strategy

The `/tasks` command will generate tasks from Phase 1 artifacts:

**From contracts/api-contract.yaml**:
- [ ] Contract test: GET /api/config/core-instructions endpoint (API)
- [ ] Contract test: CoreInstructionsService interface (client)
- [ ] Contract test: localStorage operations
- [ ] Contract test: /voygent command handler

**From data-model.md**:
- [ ] Create CoreInstructions config file (`core-instructions.md`)
- [ ] Implement InstructionsLoadState type/interface
- [ ] Implement StoredInstructions schema

**From quickstart.md user stories**:
- [ ] Integration test: First-time load scenario
- [ ] Integration test: Cached load scenario
- [ ] Integration test: Manual reload via /voygent
- [ ] Integration test: Error handling (network/404)
- [ ] Integration test: Corrupted cache recovery

**Implementation tasks** (to make tests pass):
1. [ ] Create `core-instructions.md` config file with sample content [P]
2. [ ] Implement API endpoint: GET /api/config/core-instructions [P]
3. [ ] Implement CoreInstructionsService (fetch, cache, error handling) [P]
4. [ ] Implement useCoreInstructions React hook
5. [ ] Register /voygent slash command in LibreChat command system
6. [ ] Integrate hook in App.tsx for auto-load on startup
7. [ ] Add toast notifications for loading states
8. [ ] Handle localStorage errors (quota exceeded, corrupted data)
9. [ ] Write unit tests for service methods [P]
10. [ ] Write unit tests for React hook [P]
11. [ ] Write integration tests per quickstart scenarios
12. [ ] Manual quickstart validation (all 7 scenarios)

**Ordering Strategy**:
- **Tests first** (TDD): Contract tests → Integration tests → Implementation
- **Dependency order**:
  1. Config file + API endpoint (foundation)
  2. Service layer (business logic)
  3. React hook (state management)
  4. Slash command (user interface)
  5. App integration (wiring)
- **Parallel markers [P]**: Independent tasks that can run concurrently
  - Config file creation
  - API endpoint (doesn't depend on client)
  - Unit tests (can be written alongside implementation)

**Task Count Estimate**: ~20-25 tasks
- ~10 test tasks (contract + integration)
- ~10 implementation tasks
- ~2 documentation/validation tasks

**Task Output Format** (per tasks-template.md):
```markdown
## Task [N]: [Title]
**Type**: [contract-test | integration-test | implementation | validation]
**Priority**: [P0 | P1 | P2]
**Parallel**: [Yes/No]
**Dependencies**: [Task IDs]
**Estimated Time**: [S/M/L]

### Description
[What to do]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Files Affected
- path/to/file.ts
```

**IMPORTANT**: Tasks will be created by the `/tasks` command, NOT during `/plan`

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (**`/tasks` command creates tasks.md**)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance checks)

---

## Complexity Tracking

*No entries - no constitutional violations*

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 clarifications documented in spec.md)
- [x] Complexity deviations documented (none required)

**Artifact Status**:
- [x] research.md created
- [x] data-model.md created
- [x] contracts/api-contract.yaml created
- [x] quickstart.md created
- [x] CLAUDE.md updated
- [ ] tasks.md (awaiting /tasks command)

---

## Next Steps

✅ **Planning Complete** - Execute `/tasks` command to generate tasks.md

The `/tasks` command will:
1. Load this plan.md
2. Load contracts/api-contract.yaml
3. Load data-model.md
4. Load quickstart.md
5. Generate ~20-25 ordered, testable tasks
6. Output to `specs/007-force-loading-core/tasks.md`

---

*Based on Voygent v2 architecture principles - See `/CLAUDE.md`*
*Plan template version from `.specify/templates/plan-template.md`*
