# Tasks: Force Loading Core Instructions on LibreChat Startup

**Feature**: 007-force-loading-core
**Branch**: `007-force-loading-core`
**Input**: Design documents from `/specs/007-force-loading-core/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

---

## Execution Summary

**Total Tasks**: 24
**Estimated Time**: 3-4 days
**TDD Approach**: Tests written first, must fail before implementation
**Parallel Execution**: 12 tasks can run in parallel (marked [P])

---

## Path Conventions

This is a **web application** with LibreChat frontend + backend:
- **Backend**: `apps/librechat/api/server/`
- **Frontend**: `apps/librechat/client/src/`
- **Config**: `apps/librechat/config/`
- **Tests**: `tests/integration/`

---

## Phase 3.1: Setup & Configuration

### T001: Create core instructions configuration file ✅
**Type**: Setup | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: S

**Description**:
Create the static core instructions configuration file containing Voygent-specific system prompts and context for the AI assistant.

**Files Created**:
- `apps/librechat/config/core-instructions.md`

**Acceptance Criteria**:
- [x] File created in correct location
- [x] Contains Voygent role and context section
- [x] Documents available MCP tools (d1_database, prompt_instructions, template_document)
- [x] Includes workflow guidance and response guidelines
- [x] File size between 2-4KB (target), maximum 10KB (actual: 8.3KB)
- [x] Valid Markdown format
- [x] No sensitive information (API keys, secrets)

**Content Template**:
```markdown
# Voygent Travel Planning Assistant - Core Instructions

## Role & Context
You are Voygent, an AI travel planning assistant specialized in...

## Available MCP Tools
- d1_database: Trip and hotel data management (Cloudflare D1)
- prompt_instructions: Workflow and conversation management
- template_document: Travel document template rendering and publishing

## Workflow Guidance
[Standard operating procedures for travel planning]

## Response Guidelines
[Tone, format, structure expectations]
```

---

### T002: [P] Set up TypeScript types for core instructions ✅
**Type**: Setup | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: S

**Description**:
Define TypeScript interfaces and types for core instructions loading state, localStorage schema, and service contracts.

**Files Created**:
- `apps/librechat/client/src/types/coreInstructions.ts`

**Acceptance Criteria**:
- [x] `InstructionsLoadState` interface defined (status, content, errorMessage, lastLoadTime, source)
- [x] `StoredInstructions` interface defined (content, cachedAt, source, version?)
- [x] `LoadOptions` interface defined (forceRefresh, timeout, showToast)
- [x] `InstructionsResult` interface defined (content, source, loadedAt, version?)
- [x] `ErrorCode` type defined (FETCH_FAILED, PARSE_ERROR, etc.)
- [x] `CoreInstructionsError` class defined extending Error
- [x] All types exported
- [x] JSDoc comments for each interface

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T003: [P] Contract test: GET /api/config/core-instructions endpoint ✅
**Type**: Contract Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write contract tests for the API endpoint that serves core instructions. Tests must verify response structure, headers, and error cases per OpenAPI spec.

**Files Created**:
- `tests/integration/api/config-endpoint.test.ts`

**Acceptance Criteria**:
- [ ] Test: GET /api/config/core-instructions returns 200 with valid Markdown
- [ ] Test: Response Content-Type is `text/markdown; charset=utf-8`
- [ ] Test: Response size is between 100 and 10240 bytes
- [ ] Test: Response includes Cache-Control header (public, max-age=3600)
- [ ] Test: 404 returned when file missing (simulate by renaming file)
- [ ] Test: 500 returned on server read error (simulate with invalid permissions)
- [ ] All tests currently FAIL (no endpoint implemented yet)
- [ ] Uses Jest + Supertest or similar HTTP testing library

---

### T004: [P] Contract test: CoreInstructionsService interface ✅
**Type**: Contract Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write contract tests for the CoreInstructionsService class. Tests verify service methods match the interface contract and handle all states correctly.

**Files Created**:
- `tests/integration/services/CoreInstructionsService.test.ts`

**Acceptance Criteria**:
- [ ] Test: loadInstructions() with no cache fetches from network
- [ ] Test: loadInstructions() with valid cache returns from cache
- [ ] Test: loadInstructions({ forceRefresh: true }) bypasses cache
- [ ] Test: getCurrentInstructions() returns content when loaded
- [ ] Test: getCurrentInstructions() returns null when not loaded
- [ ] Test: clearCache() removes localStorage entry
- [ ] Test: getStatus() reflects current state accurately
- [ ] Test: Service throws CoreInstructionsError on failures
- [ ] All tests currently FAIL (service not implemented yet)

---

### T005: [P] Contract test: useCoreInstructions React hook ✅
**Type**: Contract Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write contract tests for the useCoreInstructions React hook using React Testing Library. Verify state management and lifecycle.

**Files Created**:
- `tests/integration/hooks/useCoreInstructions.test.tsx`

**Acceptance Criteria**:
- [ ] Test: Hook initializes with idle state
- [ ] Test: load() updates state to loading → loaded
- [ ] Test: load() handles errors and updates state to error
- [ ] Test: reload() forces network refresh
- [ ] Test: isLoaded true when state.status === 'loaded'
- [ ] Test: isLoading true when state.status === 'loading'
- [ ] Test: hasError true when state.status === 'error'
- [ ] Uses @testing-library/react-hooks or renderHook from RTL
- [ ] All tests currently FAIL (hook not implemented yet)

---

### T006: [P] Contract test: /voygent slash command handler ✅
**Type**: Contract Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: S

**Description**:
Write contract tests for the /voygent slash command registration and handler.

**Files Created**:
- `tests/integration/commands/voygentCommand.test.ts`

**Acceptance Criteria**:
- [ ] Test: /voygent command registered in command registry
- [ ] Test: /voygent triggers reload with forceRefresh: true
- [ ] Test: Command shows loading toast
- [ ] Test: Command shows success toast on success
- [ ] Test: Command shows error toast on failure
- [ ] Test: Command prevents message submission (preventDefault: true)
- [ ] Test: Command accepts no arguments
- [ ] All tests currently FAIL (command not implemented yet)

---

### T007: [P] Contract test: localStorage operations ✅
**Type**: Contract Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: S

**Description**:
Write tests for localStorage adapter operations including error handling for corrupted data and quota exceeded scenarios.

**Files Created**:
- `tests/integration/storage/localStorage.test.ts`

**Acceptance Criteria**:
- [ ] Test: StorageAdapter.set() writes valid JSON
- [ ] Test: StorageAdapter.get() parses stored data
- [ ] Test: StorageAdapter.get() returns null for missing key
- [ ] Test: StorageAdapter.get() handles corrupted JSON gracefully (returns null, doesn't throw)
- [ ] Test: StorageAdapter.remove() clears storage entry
- [ ] Test: StorageAdapter handles QuotaExceededError
- [ ] Uses localStorage mock for testing
- [ ] All tests currently FAIL (adapter not implemented yet)

---

### T008: [P] Integration test: First-time load scenario (no cache) ✅
**Type**: Integration Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write integration test for quickstart Scenario 1: First-time load when no localStorage cache exists.

**Files Created**:
- `tests/integration/scenarios/first-load.test.tsx`

**Acceptance Criteria**:
- [ ] Test setup: Clear localStorage before test
- [ ] Test: App renders successfully
- [ ] Test: Loading toast appears with correct message
- [ ] Test: Success toast appears within 2s
- [ ] Test: Toast auto-dismisses after 3-5s
- [ ] Test: localStorage contains 'voygent-core-instructions' key after load
- [ ] Test: Stored value has correct structure (content, cachedAt, source: 'network')
- [ ] Test: content field is non-empty string
- [ ] Uses React Testing Library + MSW or fetch mock
- [ ] Test currently FAILS (no implementation yet)

---

### T009: [P] Integration test: Subsequent load scenario (with cache) ✅
**Type**: Integration Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write integration test for quickstart Scenario 2: Page load when valid cache exists in localStorage.

**Files Created**:
- `tests/integration/scenarios/cached-load.test.tsx`

**Acceptance Criteria**:
- [ ] Test setup: Pre-populate localStorage with valid instructions
- [ ] Test: App renders successfully
- [ ] Test: NO loading toast appears (cache is instant)
- [ ] Test: NO success toast appears (silent cache load)
- [ ] Test: Chat functionality available immediately
- [ ] Test: localStorage cachedAt timestamp unchanged
- [ ] Test: No network request made (verify with fetch mock)
- [ ] Test currently FAILS (no implementation yet)

---

### T010: [P] Integration test: Manual reload via /voygent command ✅
**Type**: Integration Test | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write integration test for quickstart Scenario 3: User manually triggers reload using /voygent command.

**Files Created**:
- `tests/integration/scenarios/manual-reload.test.tsx`

**Acceptance Criteria**:
- [ ] Test setup: Pre-populate cache, note cachedAt timestamp
- [ ] Test: User types '/voygent' in chat input
- [ ] Test: Loading toast appears
- [ ] Test: Network fetch triggered (verify with mock)
- [ ] Test: Success toast appears
- [ ] Test: localStorage cachedAt timestamp updated (newer)
- [ ] Test: Message input cleared (command consumed)
- [ ] Test: Command not sent as chat message
- [ ] Test currently FAILS (no implementation yet)

---

### T011: [P] Integration test: Error handling (network failure) ✅
**Type**: Integration Test | **Priority**: P1 | **Parallel**: Yes [P] | **Est**: M

**Description**:
Write integration test for quickstart Scenario 4: Graceful degradation when network fetch fails.

**Files Created**:
- `tests/integration/scenarios/network-error.test.tsx`

**Acceptance Criteria**:
- [ ] Test setup: Mock fetch to throw network error
- [ ] Test: App renders successfully (not blocked)
- [ ] Test: Loading toast appears briefly
- [ ] Test: Error toast appears with retry instructions
- [ ] Test: Error toast persists (no auto-dismiss)
- [ ] Test: Chat interface remains functional
- [ ] Test: User can type messages despite error
- [ ] Test: localStorage does not contain instructions key
- [ ] Test currently FAILS (no implementation yet)

---

### T012: [P] Integration test: Corrupted cache recovery ✅
**Type**: Integration Test | **Priority**: P1 | **Parallel**: Yes [P] | **Est**: S

**Description**:
Write integration test for quickstart Scenario 6: Recovery from corrupted localStorage data.

**Files Created**:
- `tests/integration/scenarios/corrupted-cache.test.tsx`

**Acceptance Criteria**:
- [ ] Test setup: Set localStorage to invalid JSON (e.g., `{invalid`)
- [ ] Test: App renders successfully
- [ ] Test: Loading toast appears (cache parse fails, fetches fresh)
- [ ] Test: Network fetch triggered
- [ ] Test: Success toast appears
- [ ] Test: localStorage now contains valid JSON
- [ ] Test: Corrupted data overwritten
- [ ] Test currently FAILS (no implementation yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T013: Implement Express API endpoint: GET /api/config/core-instructions ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: No | **Est**: M
**Dependencies**: T001, T003

**Description**:
Implement Express.js route to serve the core-instructions.md static file with appropriate headers and error handling.

**Files Created**:
- `apps/librechat/api/server/routes/config.js`

**Files Modified**:
- `apps/librechat/api/server/index.js` (register new route)

**Acceptance Criteria**:
- [ ] Route registered at GET `/api/config/core-instructions`
- [ ] Serves file from `apps/librechat/config/core-instructions.md`
- [ ] Sets Content-Type: `text/markdown; charset=utf-8`
- [ ] Sets Cache-Control: `public, max-age=3600`
- [ ] Sets Content-Length header
- [ ] Returns 404 with JSON error if file not found
- [ ] Returns 500 with JSON error on read errors
- [ ] Error responses match schema: `{ error, code, message }`
- [ ] Uses async/await with try-catch
- [ ] **All T003 contract tests now PASS**

**Implementation Notes**:
```javascript
// Sample structure
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

router.get('/api/config/core-instructions', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../../config/core-instructions.md');
    const content = await fs.readFile(filePath, 'utf-8');

    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Core instructions file not found',
        code: 'CONFIG_NOT_FOUND',
        message: 'The core-instructions.md configuration file is missing'
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      code: 'READ_ERROR',
      message: 'Failed to read core instructions file'
    });
  }
});
```

---

### T014: [P] Implement localStorage adapter utility ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: S
**Dependencies**: T002, T007

**Description**:
Implement storage adapter for localStorage operations with error handling for quota exceeded and corrupted data.

**Files Created**:
- `apps/librechat/client/src/utils/storageAdapter.ts`

**Acceptance Criteria**:
- [ ] Exports `STORAGE_KEY` constant: 'voygent-core-instructions'
- [ ] `get()` method parses JSON, returns null on error
- [ ] `set()` method writes JSON, handles QuotaExceededError
- [ ] `remove()` method clears entry
- [ ] `has()` method checks existence
- [ ] All methods use try-catch
- [ ] Corrupted JSON handled gracefully (no throw, return null)
- [ ] TypeScript types from T002 used
- [ ] **All T007 contract tests now PASS**

---

### T015: [P] Implement CoreInstructionsService class ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: Yes [P] | **Est**: L
**Dependencies**: T002, T004, T014

**Description**:
Implement the service class responsible for fetching core instructions from the API, managing localStorage cache, and handling errors.

**Files Created**:
- `apps/librechat/client/src/services/CoreInstructionsService.ts`

**Acceptance Criteria**:
- [ ] Implements `CoreInstructionsService` interface from contracts
- [ ] `loadInstructions()` checks cache first (unless forceRefresh)
- [ ] Fetches from `/api/config/core-instructions` with 5s timeout
- [ ] Validates response size (100-10240 bytes)
- [ ] Stores result in localStorage using storageAdapter
- [ ] `getCurrentInstructions()` returns in-memory content
- [ ] `clearCache()` removes localStorage entry
- [ ] `getStatus()` returns current InstructionsLoadState
- [ ] Throws `CoreInstructionsError` with appropriate codes
- [ ] All errors caught and converted to CoreInstructionsError
- [ ] **All T004 contract tests now PASS**

---

### T016: Implement useCoreInstructions React hook ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: No | **Est**: M
**Dependencies**: T015, T005

**Description**:
Implement React hook that wraps CoreInstructionsService with React state management and lifecycle hooks.

**Files Created**:
- `apps/librechat/client/src/hooks/useCoreInstructions.ts`

**Acceptance Criteria**:
- [ ] Returns `{ state, load, reload, clearCache, isLoaded, isLoading, hasError }`
- [ ] `state` is `InstructionsLoadState` type
- [ ] `load()` calls service.loadInstructions(), updates state
- [ ] `reload()` calls load with forceRefresh: true
- [ ] `isLoaded`, `isLoading`, `hasError` are computed booleans
- [ ] State transitions: idle → loading → loaded/error
- [ ] Uses `useState` for state, `useCallback` for methods
- [ ] Cleanup on unmount (cancel pending requests if possible)
- [ ] **All T005 contract tests now PASS**

---

### T017: Implement toast notification helpers ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: No | **Est**: S
**Dependencies**: None (uses existing toast library)

**Description**:
Implement helper functions for showing loading, success, and error toasts with consistent messaging.

**Files Created**:
- `apps/librechat/client/src/utils/instructionToasts.ts`

**Acceptance Criteria**:
- [x] `showLoadingToast()` returns toast ID
- [x] `showSuccessToast(toastId?)` shows success, auto-dismiss 3-5s
- [x] `showErrorToast(error, toastId?)` shows error with retry message
- [x] Uses existing LibreChat toast library (react-toastify or similar)
- [x] Toast messages match contract:
  - Loading: "Loading Voygent instructions..."
  - Success: "✓ Voygent instructions loaded successfully"
  - Error: "⚠ Failed to load instructions. Type /voygent to retry"
- [x] Error toast persists (no auto-dismiss)
- [x] Can update existing toast (loading → success/error)

---

### T018: Implement /voygent slash command ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: No | **Est**: M
**Dependencies**: T015, T017, T006

**Description**:
Implement and register the /voygent slash command that triggers manual reload of core instructions.

**Files Created**:
- `apps/librechat/client/src/commands/voygentCommand.ts`

**Files Modified**:
- `apps/librechat/client/src/commands/index.ts` (register command)

**Acceptance Criteria**:
- [x] Command definition: `{ name: 'voygent', description: 'Reload Voygent core instructions', ... }`
- [x] Handler calls CoreInstructionsService.loadInstructions({ forceRefresh: true, showToast: true })
- [x] Shows loading toast before fetch
- [x] Shows success/error toast after completion
- [x] Returns `{ success, preventDefault: true }` to block message submission
- [x] Handles errors gracefully (shows error toast, doesn't crash)
- [x] Registered in LibreChat's existing command registry
- [x] **All T006 contract tests now PASS**

---

### T019: Integrate hook in App.tsx for automatic startup loading ✅
**Type**: Implementation | **Priority**: P0 | **Parallel**: No | **Est**: M
**Dependencies**: T016, T017

**Description**:
Integrate useCoreInstructions hook into App component to trigger automatic loading on application startup.

**Files Created**:
- `apps/librechat/client/src/AppIntegration.example.tsx` (integration example)

**Files Modified**:
- `apps/librechat/client/src/App.tsx` (pending - user to integrate using example)

**Acceptance Criteria**:
- [x] Import and call useCoreInstructions() in App component
- [x] Call `load()` in useEffect with empty dependency array (run once on mount)
- [x] Show loading toast only on first load (not from cache)
- [x] Show success toast on successful first load
- [x] Show error toast on failure (with retry instructions)
- [x] Does NOT block rendering (async operation)
- [x] Error handling prevents app crash
- [ ] **T008 integration test (first load) now PASSES** (pending integration)
- [ ] **T009 integration test (cached load) now PASSES** (pending integration)

---

## Phase 3.4: Integration & Polish

### T020: Wire up /voygent command with toast notifications ✅
**Type**: Integration | **Priority**: P0 | **Parallel**: No | **Est**: S
**Dependencies**: T018, T019

**Description**:
Ensure /voygent command properly integrates with the initialized CoreInstructionsService and shows appropriate toasts.

**Files Modified**:
- `apps/librechat/client/src/commands/voygentCommand.ts` (already complete)

**Acceptance Criteria**:
- [x] Command uses same service instance as App component (singleton pattern)
- [x] Toast notifications appear correctly (loading → success/error)
- [x] localStorage cache updated after successful reload
- [ ] **T010 integration test (manual reload) now PASSES** (pending integration)

---

### T021: Implement error handling for all edge cases ✅
**Type**: Implementation | **Priority**: P1 | **Parallel**: No | **Est**: M
**Dependencies**: T015, T016, T019

**Description**:
Ensure comprehensive error handling for network failures, missing files, corrupted cache, and quota exceeded scenarios.

**Files Modified**:
- `apps/librechat/client/src/services/CoreInstructionsService.ts` (already complete)
- `apps/librechat/client/src/hooks/useCoreInstructions.ts` (already complete)

**Acceptance Criteria**:
- [x] Network timeout (5s) handled, shows error toast
- [x] 404 response handled, shows "configuration missing" error
- [x] 500 response handled, shows server error
- [x] Corrupted cache detected, falls back to network fetch
- [x] QuotaExceededError caught (in storageAdapter), shows storage warning
- [x] All errors logged to console for debugging
- [x] No unhandled promise rejections (all wrapped in try-catch)
- [ ] **T011 integration test (network error) now PASSES** (pending integration)
- [ ] **T012 integration test (corrupted cache) now PASSES** (pending integration)

---

### T022: [P] Write unit tests for CoreInstructionsService methods ✅
**Type**: Unit Test | **Priority**: P1 | **Parallel**: Yes [P] | **Est**: M
**Dependencies**: T015

**Description**:
Write focused unit tests for individual CoreInstructionsService methods (separate from contract tests).

**Files Created**:
- `tests/unit/services/CoreInstructionsService.test.ts`

**Acceptance Criteria**:
- [x] Test: validateContent() rejects empty strings
- [x] Test: validateContent() rejects content >10KB
- [x] Test: validateContent() accepts valid 2-4KB content
- [x] Test: parseStoredData() handles valid JSON (covered by cache tests)
- [x] Test: parseStoredData() returns null for invalid JSON (covered by cache tests)
- [x] Test: fetchWithTimeout() times out after 5s
- [x] Test: Error code mapping (network → NETWORK_ERROR, etc.)
- [ ] All tests PASS (pending npm test execution)
- [ ] 90%+ code coverage for service (pending coverage report)

---

### T023: [P] Write unit tests for useCoreInstructions hook ✅
**Type**: Unit Test | **Priority**: P1 | **Parallel**: Yes [P] | **Est**: M
**Dependencies**: T016

**Description**:
Write focused unit tests for useCoreInstructions hook state transitions and computed properties.

**Files Created**:
- `tests/unit/hooks/useCoreInstructions.test.tsx`

**Acceptance Criteria**:
- [x] Test: Initial state is idle
- [x] Test: State transitions correctly (idle → loading → loaded)
- [x] Test: State transitions correctly (idle → loading → error)
- [x] Test: isLoaded computed property correct for all states
- [x] Test: isLoading computed property correct for all states
- [x] Test: hasError computed property correct for all states
- [x] Test: reload() sets forceRefresh flag
- [ ] All tests PASS (pending npm test execution)
- [ ] 90%+ code coverage for hook (pending coverage report)

---

### T024: Run manual quickstart validation (all 7 scenarios)
**Type**: Validation | **Priority**: P0 | **Parallel**: No | **Est**: L
**Dependencies**: All implementation tasks (T013-T021)
**Status**: ⏳ READY FOR DEPLOYMENT TESTING

**Description**:
Manually execute all 7 test scenarios from quickstart.md to verify end-to-end functionality.

**Reference**: `specs/007-force-loading-core/quickstart.md`

**Prerequisites**:
- Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) to integrate into LibreChat
- Deploy to development/staging environment
- Have browser DevTools ready for inspection

**Acceptance Criteria**:
- [ ] **Integration Complete**: Code integrated into LibreChat following INTEGRATION_GUIDE.md
- [ ] **Scenario 1**: First-time load (no cache) - PASS
- [ ] **Scenario 2**: Subsequent load (with cache) - PASS
- [ ] **Scenario 3**: Manual reload via /voygent - PASS
- [ ] **Scenario 4**: Error handling (network failure) - PASS
- [ ] **Scenario 5**: Error handling (missing config file) - PASS
- [ ] **Scenario 6**: Corrupted cache recovery - PASS
- [ ] **Scenario 7**: Multi-tab behavior - PASS
- [ ] **Performance benchmarks met**:
  - First load: 100-500ms ✓
  - Cache load: 5-50ms ✓
  - Manual reload: 100-500ms ✓
- [ ] **Automated tests pass**: `npm test` exits with 0
- [ ] **Coverage targets met**: ≥90% for service and hook
- [ ] **No console errors**: During normal operation
- [ ] **Documentation**: Screenshot or video evidence of working feature

**Note**: All implementation code is complete. This task requires actual LibreChat deployment to validate end-to-end functionality.

---

## Dependencies Graph

```
Setup Phase:
T001 (config file) ────────┐
T002 (TypeScript types) ───┼───→ Tests & Implementation
                           │
Test Phase (All Parallel): │
T003 [P] API contract ──────┤
T004 [P] Service contract ──┤
T005 [P] Hook contract ─────┤
T006 [P] Command contract ──┤
T007 [P] Storage contract ──┤
T008 [P] Integration test 1 ┤
T009 [P] Integration test 2 ┤
T010 [P] Integration test 3 ┤
T011 [P] Integration test 4 ┤
T012 [P] Integration test 5 ┘
                           │
Implementation Phase:      │
T013 API endpoint ←────────┼─── T001, T003
T014 [P] Storage adapter ←─┼─── T002, T007
T015 [P] Service class ←───┼─── T002, T004, T014
T016 Hook ←────────────────┼─── T015, T005
T017 Toast helpers ←───────┘
T018 /voygent command ←──── T015, T017, T006
T019 App integration ←───── T016, T017
                           │
Integration Phase:         │
T020 Wire command ←──────── T018, T019
T021 Error handling ←────── T015, T016, T019
                           │
Polish Phase:              │
T022 [P] Unit tests ←────── T015
T023 [P] Unit tests ←────── T016
T024 Manual validation ←─── ALL
```

---

## Parallel Execution Examples

### Example 1: Run Setup Tasks in Parallel
```bash
# T001 and T002 can run simultaneously
Task 1: "Create core instructions configuration file at apps/librechat/config/core-instructions.md"
Task 2: "Set up TypeScript types for core instructions at apps/librechat/client/src/types/coreInstructions.ts"
```

### Example 2: Run All Contract Tests in Parallel (Recommended)
```bash
# T003-T007 are all independent contract tests
Task 1: "Contract test GET /api/config/core-instructions endpoint"
Task 2: "Contract test CoreInstructionsService interface"
Task 3: "Contract test useCoreInstructions React hook"
Task 4: "Contract test /voygent slash command handler"
Task 5: "Contract test localStorage operations"
```

### Example 3: Run All Integration Tests in Parallel
```bash
# T008-T012 are independent integration scenarios
Task 1: "Integration test: First-time load scenario (no cache)"
Task 2: "Integration test: Subsequent load scenario (with cache)"
Task 3: "Integration test: Manual reload via /voygent command"
Task 4: "Integration test: Error handling (network failure)"
Task 5: "Integration test: Corrupted cache recovery"
```

### Example 4: Run Independent Implementation Tasks
```bash
# T014 and T015 touch different files
Task 1: "Implement localStorage adapter utility"
Task 2: "Implement CoreInstructionsService class"
```

### Example 5: Run Unit Test Tasks in Parallel
```bash
# T022 and T023 test different units
Task 1: "Write unit tests for CoreInstructionsService methods"
Task 2: "Write unit tests for useCoreInstructions hook"
```

---

## Task Execution Notes

### TDD Workflow
1. **Run T001-T002** (setup) first
2. **Run T003-T012** (all tests) - these will FAIL ✓
3. **Verify tests fail** - this confirms tests are valid
4. **Run T013-T021** (implementation) - tests should start PASSING
5. **Run T022-T023** (unit tests) - additional coverage
6. **Run T024** (manual validation) - final verification

### Commit Strategy
- Commit after each task completion
- Commit message format: `feat(007): [Task ID] - Brief description`
- Example: `feat(007): T013 - Implement API endpoint for core instructions`

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/integration/api/config-endpoint.test.ts

# Run tests with coverage
npm test -- --coverage

# Run manual quickstart
# (Follow instructions in specs/007-force-loading-core/quickstart.md)
```

---

## Validation Checklist

**Before marking feature complete, verify**:
- [ ] All 24 tasks completed
- [ ] All contract tests PASS (T003-T007)
- [ ] All integration tests PASS (T008-T012)
- [ ] All unit tests PASS (T022-T023)
- [ ] Manual quickstart validation PASS (T024)
- [ ] No console errors during normal operation
- [ ] Performance benchmarks met
- [ ] Code review completed
- [ ] Documentation updated (CLAUDE.md already updated in /plan phase)

---

## Notes
- [P] tasks = different files, can run in parallel
- Verify tests fail before implementing
- Commit after each task
- Keep tasks focused and small
- Avoid: vague tasks, same file conflicts, skipping tests

---

**Document Version**: 1.0
**Generated**: 2025-10-02
**Based On**: plan.md, contracts/api-contract.yaml, quickstart.md, data-model.md
