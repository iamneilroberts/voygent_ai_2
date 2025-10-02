# Force Loading Core Instructions on LibreChat Startup

**Feature ID**: 007-force-loading-core
**Status**: ✅ Implementation Complete - Ready for Integration
**Created**: 2025-10-02

---

## Overview

This feature automatically loads Voygent-specific core instructions (system prompts, MCP tool documentation, workflow guidance) when LibreChat starts, ensuring the AI assistant always has the correct context. Users can also manually reload instructions using the `/voygent` slash command.

---

## Key Features

### 1. Automatic Loading ✅
- Instructions load automatically on app startup
- Uses localStorage for instant cache (5-50ms)
- Falls back to network if cache invalid (100-500ms)
- Graceful degradation - app works even if loading fails

### 2. Manual Reload Command ✅
- Type `/voygent` to force reload instructions
- Bypasses cache, fetches fresh from server
- Shows loading/success/error toasts
- Useful for recovering from errors

### 3. Visual Feedback ✅
- **Loading**: "Loading Voygent instructions..." (toast)
- **Success**: "✓ Voygent instructions loaded successfully" (auto-dismiss)
- **Error**: "⚠ Failed to load instructions. Type /voygent to retry" (persists)

### 4. localStorage Caching ✅
- Persists 2-10KB instructions across page refreshes
- Validates cached content (size, structure)
- Auto-recovery from corrupted cache
- Handles quota exceeded gracefully

### 5. Comprehensive Error Handling ✅
- Network timeouts (5s default)
- 404/500 server errors
- Corrupted cache detection
- Invalid content validation

---

## Quick Start

### For Developers

**Integrate into LibreChat**:
1. Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. Run tests: `npm test`
3. Test manually: [quickstart.md](./quickstart.md)

**Development Commands**:
```bash
# Run all tests
npm test

# Run specific test suite
npm test tests/integration/scenarios/

# Run with coverage
npm test -- --coverage

# Test API endpoint
curl http://localhost:3080/api/config/core-instructions
```

### For Users

**Normal Use**:
- Instructions load automatically - no action needed
- App works normally even if loading fails

**Manual Reload**:
1. Type `/voygent` in chat input
2. Press Enter
3. Wait for success toast

**Troubleshooting**:
- If error persists, clear browser cache and reload
- Check network connection
- Contact support if issue continues

---

## Documentation

| Document | Purpose |
|----------|---------|
| [spec.md](./spec.md) | Feature specification and requirements |
| [plan.md](./plan.md) | Implementation plan and architecture |
| [tasks.md](./tasks.md) | Task breakdown (23/24 complete) |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Step-by-step integration instructions |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Current status and file inventory |
| [quickstart.md](./quickstart.md) | Manual test scenarios |
| [data-model.md](./data-model.md) | Data structures and schemas |
| [contracts/](./contracts/) | API contracts (OpenAPI) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LibreChat App                        │
│  ┌────────────────────────────────────────────────┐     │
│  │  App Component (App.tsx)                       │     │
│  │  ┌──────────────────────────────────────┐      │     │
│  │  │  useCoreInstructions Hook             │      │     │
│  │  │  - load()                             │      │     │
│  │  │  - reload()                           │      │     │
│  │  │  - state (idle/loading/loaded/error)  │      │     │
│  │  └──────────────────┬───────────────────┘      │     │
│  │                     │                           │     │
│  │                     ▼                           │     │
│  │  ┌──────────────────────────────────────┐      │     │
│  │  │  CoreInstructionsService             │      │     │
│  │  │  - loadInstructions()                │      │     │
│  │  │  - getCurrentInstructions()          │      │     │
│  │  │  - clearCache()                      │      │     │
│  │  └──────┬───────────────────┬───────────┘      │     │
│  │         │                   │                   │     │
│  │         ▼                   ▼                   │     │
│  │  ┌─────────────┐   ┌─────────────────┐        │     │
│  │  │ localStorage│   │  Fetch API      │        │     │
│  │  │  Adapter    │   │  /api/config/   │        │     │
│  │  └─────────────┘   └─────────────────┘        │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  /voygent Slash Command                        │     │
│  │  - Triggers reload()                           │     │
│  │  - Shows toast notifications                   │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘

Backend:
┌─────────────────────────────────────────┐
│  Express API                            │
│  GET /api/config/core-instructions      │
│  ┌─────────────────────────────────┐    │
│  │  Serves: core-instructions.md   │    │
│  │  Content-Type: text/markdown    │    │
│  │  Cache-Control: public, 1h      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## File Structure

```
specs/007-force-loading-core/
├── README.md                          # This file
├── spec.md                           # Feature specification
├── plan.md                           # Implementation plan
├── tasks.md                          # Task breakdown
├── INTEGRATION_GUIDE.md              # Integration instructions
├── IMPLEMENTATION_STATUS.md          # Current status
├── quickstart.md                     # Manual test guide
├── data-model.md                     # Data structures
└── contracts/
    └── api-contract.yaml             # OpenAPI spec

apps/librechat/
├── config/
│   └── core-instructions.md          # System prompts (8.3KB)
├── server/routes/
│   └── config.js                     # API endpoint
└── client/src/
    ├── types/
    │   └── coreInstructions.ts       # TypeScript types
    ├── services/
    │   └── CoreInstructionsService.ts # Business logic
    ├── utils/
    │   ├── storageAdapter.ts         # localStorage wrapper
    │   └── instructionToasts.ts      # Toast helpers
    ├── hooks/
    │   └── useCoreInstructions.ts    # React hook
    ├── commands/
    │   └── voygentCommand.ts         # /voygent command
    └── AppIntegration.example.tsx    # Integration example

tests/
├── integration/
│   ├── api/
│   │   └── config-endpoint.test.ts
│   ├── services/
│   │   └── CoreInstructionsService.test.ts
│   ├── hooks/
│   │   └── useCoreInstructions.test.tsx
│   ├── commands/
│   │   └── voygentCommand.test.ts
│   ├── storage/
│   │   └── localStorage.test.ts
│   └── scenarios/
│       ├── first-load.test.tsx
│       ├── cached-load.test.tsx
│       ├── manual-reload.test.tsx
│       ├── network-error.test.tsx
│       └── corrupted-cache.test.tsx
└── unit/
    ├── services/
    │   └── CoreInstructionsService.test.ts
    └── hooks/
        └── useCoreInstructions.test.tsx
```

---

## Implementation Progress

### ✅ Completed (23/24 tasks - 95.8%)

- [x] Phase 3.1: Setup & Configuration (2/2)
- [x] Phase 3.2: Tests First - TDD (10/10)
- [x] Phase 3.3: Core Implementation (7/7)
- [x] Phase 3.4: Integration & Polish (4/5)
  - [x] T020: Wire up /voygent command
  - [x] T021: Implement error handling
  - [x] T022: Unit tests - CoreInstructionsService
  - [x] T023: Unit tests - useCoreInstructions hook
  - [ ] **T024: Manual quickstart validation** (pending deployment)

### 📋 Remaining Work

**T024: Manual Quickstart Validation**
- Requires integration into actual LibreChat deployment
- Must execute all 7 test scenarios
- Must verify performance benchmarks
- Must run automated test suite

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for instructions.

---

## Performance Benchmarks

| Operation | Target | Actual (Expected) |
|-----------|--------|-------------------|
| First network load | 100-500ms | ~150ms (typical) |
| Cache load | 5-50ms | ~10ms (typical) |
| Manual reload | 100-500ms | ~150ms (typical) |
| localStorage size | 2-10KB | ~8.3KB (current) |

---

## Test Coverage

- **Contract Tests**: 5 files (API, Service, Hook, Command, Storage)
- **Integration Tests**: 5 files (7 scenarios)
- **Unit Tests**: 2 files (Service methods, Hook behavior)
- **Total**: 12 test files

**Expected Coverage**:
- CoreInstructionsService: ≥90%
- useCoreInstructions: ≥90%
- Overall: ≥85%

---

## Technology Stack

- **Frontend**: React, TypeScript, localStorage API
- **Backend**: Express.js, Node.js
- **Testing**: Jest, React Testing Library
- **Notifications**: react-toastify (or LibreChat's toast library)
- **Storage**: Browser localStorage (2-10KB)

---

## Design Decisions

### Why localStorage?
- Fast cache reads (5-50ms)
- Persists across page refreshes
- No server round-trip for cached data
- Graceful degradation (fallback to network)

### Why Singleton Service?
- Single source of truth for state
- Shared cache across components
- Easier testing with mocks
- Command and hook use same instance

### Why Toast Notifications?
- Non-blocking user feedback
- Standard LibreChat pattern
- Clear success/error states
- Auto-dismiss on success, persist on error

### Why /voygent Command?
- Familiar LibreChat pattern
- Easy to discover and use
- Provides manual recovery option
- Doesn't pollute UI with buttons

---

## Security Considerations

1. **Content Security**: Instructions served as `text/markdown`, no script execution
2. **localStorage**: Unencrypted client-side storage (non-sensitive data only)
3. **Error Messages**: Generic messages, no server details leaked
4. **Cache Control**: Public cache header (1 hour), suitable for non-sensitive config

---

## Future Enhancements

Potential improvements (not in scope for v1):

1. **Cache Expiration**: Auto-refresh after 24 hours
2. **Version Detection**: Reload when server version changes
3. **Analytics**: Track load success/failure rates
4. **A/B Testing**: Different instructions for different users
5. **Admin UI**: Edit instructions without file access
6. **Multi-language**: Serve instructions in user's language

---

## Troubleshooting

### Common Issues

**Toast not appearing**
- Check toast library integration in `instructionToasts.ts`
- Verify LibreChat's toast service is available

**API returns 404**
- Verify `core-instructions.md` exists in `config/` directory
- Check route registration in server index file

**TypeScript errors**
- Rebuild TypeScript: `npm run build`
- Check `tsconfig.json` includes new files

**localStorage quota exceeded**
- Check console for warnings
- Storage adapter handles gracefully
- Falls back to network-only mode

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed troubleshooting.

---

## Contributing

To modify this feature:

1. **Update core instructions**: Edit `config/core-instructions.md`
2. **Modify behavior**: Edit service, hook, or command files
3. **Add tests**: Follow TDD pattern (test first, then implementation)
4. **Update docs**: Keep README, spec, and integration guide in sync

---

## License

Part of Voygent v2 project. See repository root for license.

---

## Contact

For questions or issues:
- Review documentation in `specs/007-force-loading-core/`
- Check test files for expected behavior
- Review error logs in browser console and server logs

---

## Changelog

### 2025-10-02 - v1.0.0 (Initial Implementation)
- ✅ Automatic loading on startup
- ✅ Manual `/voygent` command
- ✅ Toast notifications (loading/success/error)
- ✅ localStorage caching with validation
- ✅ Comprehensive error handling
- ✅ 12 test files (contract, integration, unit)
- ✅ Full documentation suite
- 📋 Ready for integration (T024 pending)

---

**Status**: ✅ Implementation Complete - Ready for Integration

Next step: Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) to deploy.
