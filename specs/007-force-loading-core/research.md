# Research: Force Loading Core Instructions on LibreChat Startup

**Feature**: 007-force-loading-core
**Date**: 2025-10-02
**Status**: Complete

## Research Questions

### 1. Where should core instructions be stored?

**Decision**: Store core instructions as a static configuration file in the LibreChat config directory

**Rationale**:
- LibreChat already uses `librechat.yaml` for configuration - consistent pattern
- Core instructions are essentially system-level prompts/context
- Static files are easier to version control and deploy
- No database dependency needed for this feature
- Can be updated through code deployment pipeline

**Alternatives Considered**:
- **Database storage**: Rejected - adds unnecessary database dependency, increases latency, overkill for static content
- **Environment variable**: Rejected - poor for multi-line text, hard to maintain, no versioning
- **MCP server endpoint**: Rejected - adds network call latency, unnecessary complexity for static content
- **Hardcoded in client**: Rejected - requires recompile for updates, not maintainable

**Implementation Notes**:
- Create `apps/librechat/config/core-instructions.md` or similar
- Format: Markdown for readability and maintainability
- Size constraint: Keep under 4KB for browser storage compatibility

---

### 2. How should LibreChat load instructions on startup?

**Decision**: Client-side initialization hook with async loading + browser localStorage persistence

**Rationale**:
- LibreChat is a React/Node.js application with client-side initialization lifecycle
- Modern browsers support localStorage (5-10MB typical limit, instructions ~4KB)
- Async loading prevents blocking UI rendering
- localStorage provides persistence across page refreshes without server round-trips

**Alternatives Considered**:
- **Server-side preload**: Rejected - requires server modification, increases initial page load, doesn't help with persistence
- **Service Worker**: Rejected - over-engineered for this use case, adds PWA complexity
- **IndexedDB**: Rejected - overkill for single text blob, more complex API than localStorage
- **Session storage**: Rejected - cleared on page close, fails persistence requirement

**Implementation Notes**:
- Hook into React app initialization (e.g., `useEffect` in root component)
- Fetch from `/config/core-instructions.md` endpoint
- Store in `localStorage.setItem('voygent-core-instructions', content)`
- Check localStorage first before fetching on subsequent loads

---

### 3. How should the `/voygent` slash command work in LibreChat?

**Decision**: Extend LibreChat's existing slash command system

**Rationale**:
- LibreChat has an existing command pattern (e.g., `/clear`, `/help`)
- Consistent UX with existing commands
- Slash commands are parsed before message submission
- Can trigger state updates and API calls

**Research Findings**:
- LibreChat uses a command registry pattern
- Commands are defined in client-side code
- Command handlers can update application state
- Commands can trigger async operations

**Alternatives Considered**:
- **Custom UI button**: Rejected - user specified slash command preference in clarifications
- **Context menu action**: Rejected - less discoverable, not requested
- **Auto-completion suggestion**: Complementary, not alternative - consider as enhancement

**Implementation Notes**:
- Register `/voygent` command in LibreChat's command handler
- Handler should:
  1. Fetch fresh instructions from `/config/core-instructions.md`
  2. Update localStorage
  3. Update application state
  4. Show toast notification (loading → success/error)

---

### 4. What visual feedback pattern should be used?

**Decision**: Toast notifications for state feedback (loading/success/error)

**Rationale**:
- LibreChat already uses toast notifications (likely React-Toastify or similar)
- Non-blocking UI pattern - doesn't interrupt user workflow
- Clear visual feedback without modal dialogs
- Supports all required states: loading, success, error

**Research Findings**:
- Modern React apps commonly use toast libraries (react-hot-toast, react-toastify, sonner)
- Toast duration typically: loading (persist), success (3-5s auto-dismiss), error (persist with dismiss)
- Supports action buttons (e.g., "Retry" on error toast)

**Alternatives Considered**:
- **Modal dialogs**: Rejected - too intrusive, blocks user interaction
- **Inline status bar**: Rejected - takes permanent screen space
- **Console logging only**: Rejected - not visible to end users
- **Banner notification**: Rejected - takes permanent space, less flexible than toast

**Implementation Notes**:
- Loading toast: "Loading Voygent instructions..." (with spinner)
- Success toast: "✓ Voygent instructions loaded successfully" (auto-dismiss 3s)
- Error toast: "⚠ Failed to load instructions. Type /voygent to retry" (manual dismiss)

---

### 5. How should error handling and graceful degradation work?

**Decision**: Try-catch with fallback, never block user interactions

**Rationale**:
- Requirement FR-004: Allow users to proceed even if loading fails
- Better UX to allow degraded mode than hard failure
- User has recovery mechanism via `/voygent` command
- Network failures should be transient - retry usually succeeds

**Error Scenarios & Handling**:

| Error Scenario | Detection | User Feedback | System Behavior |
|----------------|-----------|---------------|-----------------|
| Network failure on startup | Fetch timeout/error | Error toast with retry instructions | Allow chat without instructions |
| 404 - instructions file missing | HTTP 404 response | Error toast "Configuration missing" | Allow chat, log error |
| Malformed instructions content | Parse/validation error | Error toast "Invalid configuration" | Use last known good, or none |
| localStorage quota exceeded | QuotaExceededError | Error toast "Storage full" | Load works, persistence fails |
| Corrupted localStorage data | Parse error on load | Silent fallback | Fetch fresh copy |

**Implementation Notes**:
- Wrap all fetch/storage operations in try-catch
- Set fetch timeout (e.g., 5 seconds)
- Log all errors to console for debugging
- Never throw unhandled errors that crash the app
- Provide actionable error messages to users

---

### 6. What is the expected format and size of core instructions?

**Decision**: Markdown format, ~2-4KB text size, contains Voygent-specific system prompts

**Rationale**:
- Markdown is human-readable and versionable
- 2-4KB is small enough for localStorage and network transfer
- System prompts are essentially structured text instructions
- Can be easily edited without code changes

**Expected Content Structure**:
```markdown
# Voygent Travel Planning Assistant - Core Instructions

## Role & Context
[System-level prompt defining Voygent's role, capabilities, constraints]

## Available MCP Tools
[Reference to d1_database, prompt_instructions, template_document servers]

## Workflow Guidance
[Standard operating procedures, conversation patterns]

## Response Guidelines
[Tone, format, structure expectations]
```

**Size Constraints**:
- Target: 2-4KB (2,000-4,000 characters)
- Maximum: 10KB (to stay well under localStorage limits)
- Compression: Not needed at this size

**Validation**:
- Check file size on load
- Warn if >10KB (may indicate configuration error)
- Basic structure validation (not empty, valid UTF-8)

---

## Technology Stack Summary

**Primary Technologies**:
- **Frontend**: React (LibreChat client)
- **State Management**: React Context or Redux (existing LibreChat patterns)
- **Storage**: Browser localStorage API
- **HTTP Client**: fetch API or axios (existing LibreChat patterns)
- **Notifications**: Toast library (existing LibreChat implementation)

**File Locations**:
- **Config file**: `apps/librechat/config/core-instructions.md`
- **Client code**: `apps/librechat/client/src/` (hooks, commands, utils)
- **Server route**: `apps/librechat/api/server/routes/` (to serve config file)

**Dependencies**:
- No new dependencies required
- Use existing LibreChat patterns and libraries

---

## Performance Considerations

**Initial Load (no localStorage)**:
- Fetch time: ~100-300ms (static file, CDN/local server)
- Parse time: <10ms (small text file)
- Storage time: <10ms (localStorage write)
- **Total: ~110-320ms** (non-blocking, async)

**Subsequent Loads (with localStorage)**:
- localStorage read: <5ms
- Parse time: <10ms
- **Total: <15ms** (near-instant)

**Manual Reload via /voygent**:
- Same as initial load: ~110-320ms
- User-initiated, expected latency

**Optimization**:
- Instructions cached in memory after first load (avoid repeated localStorage reads)
- No optimization needed at this scale

---

## Security Considerations

**Threat Model**:
- Instructions are not sensitive data (no secrets, API keys, PII)
- Content is static configuration, version-controlled
- localStorage is origin-bound (same-origin policy)

**Security Measures**:
- Serve instructions from same origin (no CORS needed)
- Validate content size and format (prevent injection)
- No dynamic code execution from instructions content
- Content-Security-Policy compatible

**Non-Concerns**:
- No encryption needed (public information)
- No authentication needed (public configuration)
- XSS risk minimal (content not rendered as HTML in chat)

---

## Testing Strategy

**Unit Tests**:
- localStorage read/write operations
- Instruction fetch logic
- Error handling branches
- Command parser registration

**Integration Tests**:
- Full load cycle: fetch → store → retrieve
- `/voygent` command end-to-end
- Error scenarios (network failure, missing file)
- Toast notification triggering

**Manual Testing**:
- First-time load (clear localStorage)
- Page refresh with persisted data
- `/voygent` command execution
- Network offline simulation

---

## Open Questions Resolved

1. ~~Where should core instructions be stored?~~ → Config file
2. ~~How to load on startup?~~ → Client-side async with localStorage
3. ~~How to implement /voygent?~~ → Extend existing command system
4. ~~Visual feedback pattern?~~ → Toast notifications
5. ~~Error handling approach?~~ → Graceful degradation with retry
6. ~~Instruction format?~~ → Markdown, 2-4KB

**All research questions resolved. Ready for Phase 1: Design & Contracts.**
