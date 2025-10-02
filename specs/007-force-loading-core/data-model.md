# Data Model: Force Loading Core Instructions

**Feature**: 007-force-loading-core
**Date**: 2025-10-02

## Overview

This feature has minimal data modeling needs as it deals primarily with configuration loading and UI state. The "data" is the core instructions content itself, which is static configuration, not dynamic user data.

---

## Entities

### 1. CoreInstructions (Static Configuration)

**Description**: The Voygent-specific system prompt and context that configures AI assistant behavior

**Storage**: Static file (`apps/librechat/config/core-instructions.md`)

**Attributes**:
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| content | string | Required, 100-10000 chars | The actual instruction text in Markdown format |
| version | string | Optional, semantic versioning | Version identifier for tracking updates (in file metadata/header) |
| lastModified | timestamp | System-generated | File modification timestamp (from filesystem) |

**Relationships**: None (standalone configuration)

**Lifecycle**:
- **Created**: During deployment/configuration setup
- **Read**: On application startup, on `/voygent` command
- **Updated**: Through code deployment pipeline
- **Deleted**: N/A (required configuration)

**Validation Rules**:
- Content must not be empty
- Content size must be ≤10KB (10,240 bytes)
- Content must be valid UTF-8
- Should be valid Markdown (warning only, not enforced)

---

### 2. InstructionsLoadState (Client-Side State)

**Description**: Runtime state tracking the loading status and content of core instructions

**Storage**: React state (in-memory), persisted content in localStorage

**Attributes**:
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| content | string \| null | Optional | The loaded instructions content |
| status | enum | Required | One of: 'idle', 'loading', 'loaded', 'error' |
| errorMessage | string \| null | Optional | Error description if status === 'error' |
| lastLoadTime | timestamp \| null | Optional | When instructions were last successfully loaded |
| source | enum | Required | One of: 'localStorage', 'network', 'none' |

**State Transitions**:
```
idle → loading (on app init or /voygent command)
loading → loaded (on successful fetch)
loading → error (on fetch failure)
error → loading (on retry)
loaded → loading (on manual reload)
```

**Validation Rules**:
- status and source are required
- errorMessage required when status === 'error'
- content and lastLoadTime required when status === 'loaded'

---

### 3. LocalStorageCache (Browser Storage)

**Description**: Browser localStorage entry for persisting instructions across sessions

**Storage**: localStorage (browser API)

**Schema**:
```typescript
interface StoredInstructions {
  content: string;           // The instruction text
  version?: string;          // Optional version from file
  cachedAt: number;          // Unix timestamp when cached
  source: 'network';         // Always 'network' for stored data
}
```

**Key**: `'voygent-core-instructions'`

**Constraints**:
- Maximum size: ~5MB (browser-dependent, instructions ~2-4KB)
- Same-origin policy applies (LibreChat origin only)
- Survives page refresh, browser restart
- Cleared on: browser data clear, manual cache clear

**Invalidation**:
- No automatic expiration (instructions are relatively static)
- Invalidated on manual `/voygent` reload (overwrites cache)
- Invalidated if parse error (fetch fresh copy)

---

## Data Flow Diagrams

### Initial Load (No Cache)
```
┌─────────────┐
│  App Start  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Check localStorage  │
└──────┬──────────────┘
       │ (miss)
       ▼
┌─────────────────────┐
│ Fetch from /config  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Parse & Validate    │
└──────┬──────────────┘
       │ (success)
       ▼
┌─────────────────────┐
│ Store in localStorage│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Update App State    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Show Success Toast  │
└─────────────────────┘
```

### Subsequent Load (With Cache)
```
┌─────────────┐
│  App Start  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Check localStorage  │
└──────┬──────────────┘
       │ (hit)
       ▼
┌─────────────────────┐
│ Parse Cached Data   │
└──────┬──────────────┘
       │ (success)
       ▼
┌─────────────────────┐
│ Update App State    │
│ (no toast on cache) │
└─────────────────────┘
```

### Manual Reload (/voygent Command)
```
┌─────────────────┐
│ /voygent typed  │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│ Show Loading Toast  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Fetch from /config  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Parse & Validate    │
└──────┬──────────────┘
       │
       ├─(success)──────────────┬─(error)────────────┐
       │                         │                     │
       ▼                         ▼                     ▼
┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ Update localStorage │  │ Keep old cache   │  │ Update state    │
└──────┬──────────────┘  └──────┬───────────┘  │ status = 'error'│
       │                         │               └────┬────────────┘
       ▼                         ▼                    │
┌─────────────────────┐  ┌──────────────────┐       │
│ Update App State    │  │ Update App State │       │
└──────┬──────────────┘  └──────┬───────────┘       │
       │                         │                    │
       ▼                         ▼                    ▼
┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ Show Success Toast  │  │ Show Error Toast │  │ Show Error Toast│
└─────────────────────┘  └──────────────────┘  └─────────────────┘
```

---

## Persistence Strategy

### Client-Side (localStorage)
- **Pros**: Fast access, works offline, no server dependency
- **Cons**: Limited size, client-side only, manual cache invalidation
- **Use case**: Perfect for small, static configuration (2-4KB)

### Server-Side (Not Used)
- **Not needed**: Instructions are static config, not user data
- **Avoided**: Adds unnecessary DB dependency and latency

---

## Migration Considerations

**Initial Deployment**:
1. Deploy `core-instructions.md` config file
2. Deploy client code with loading logic
3. Existing users will have no localStorage cache (first load path)
4. Future sessions will use cached instructions

**Updates to Instructions**:
1. Update `core-instructions.md` file
2. Deploy updated file
3. Users with old cache will keep old version until:
   - They manually run `/voygent` command
   - They clear browser cache
   - Cache invalidation logic added (future enhancement)

**Future Enhancement**: Consider adding version check or ETag-based cache invalidation

---

## No Database Schema

This feature requires **no database changes**. All data is:
- Static configuration (file system)
- Client-side state (React memory)
- Client-side cache (browser localStorage)

---

## Edge Cases

### localStorage Quota Exceeded
- **Scenario**: Browser storage full (rare with 2-4KB data)
- **Handling**: Log error, allow app to function without cache, show warning toast
- **Data impact**: Instructions load on every session (slower but functional)

### Corrupted localStorage Data
- **Scenario**: Invalid JSON or malformed data in cache
- **Handling**: Catch parse error, clear corrupted cache, fetch fresh copy
- **Data impact**: One extra network request, cache rebuilt

### Concurrent Updates (Multiple Tabs)
- **Scenario**: User has multiple LibreChat tabs open
- **Handling**: localStorage is shared across tabs (automatic sync)
- **Data impact**: All tabs share same cache (desired behavior)

### Instructions File Missing (404)
- **Scenario**: Deployment error, missing config file
- **Handling**: Show error toast, allow app to proceed without instructions
- **Data impact**: No instructions loaded (degraded mode)

---

## Summary

**Data Complexity**: Minimal
- 1 static configuration file
- 2 client-side state objects
- 1 localStorage cache entry

**No Database Required**: All data is configuration or client-side state

**Persistence**: Browser localStorage only

**Validation**: Basic size and format checks

**Ready for**: API contract definition (Phase 1 continues)
