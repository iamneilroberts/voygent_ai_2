# Phase 1: Data Model - Voygent Customizations

**Date**: 2025-10-02
**Feature**: 002-rebuild-the-whole

## Overview

This document defines the data structures used by Voygent customizations. Since this is primarily a UI/API integration feature rather than a data-heavy feature, the "entities" are mostly runtime state and API response shapes.

---

## Entities

### 1. TokenUsageData
**Purpose**: Represents token usage information for a single AI interaction

**Fields**:
- `model` (string, optional): AI model name (e.g., "claude-3-5-sonnet-20241022")
- `inputTokens` (number, optional): Input tokens consumed
- `outputTokens` (number, optional): Output tokens generated
- `totalTokens` (number, optional): Sum of input + output
- `approximate` (boolean, optional): Whether counts are estimated (affects UI display with ~prefix)
- `price` (number, optional): Cost in USD for this interaction
- `timestamp` (number, optional): Unix timestamp of measurement

**Validation Rules**:
- If `approximate` is true, UI displays counts with "~" prefix
- `price` should be non-negative
- `inputTokens` and `outputTokens` should be non-negative integers

**State Transitions**: N/A (immutable once created)

**Storage**:
- Recoil atom `voygentLastUsage` (persisted to localStorage)
- Recoil atom `voygentCumulativeUsage` (session-only)

---

### 2. TripProgressData
**Purpose**: Represents the current state of a travel planning workflow

**Fields**:
- `tripId` (string, optional): Unique identifier for the trip
- `tripName` (string, optional): Human-readable trip name
- `dates` (string, optional): Trip date range (e.g., "Dec 15-22, 2025")
- `phase` (enum, optional): Current planning phase
  - Values: "Research" | "Hotels" | "Activities" | "Booking" | "Finalization"
- `step` (number, optional): Current step within phase
- `totalSteps` (number, optional): Total steps in current phase
- `percent` (number, optional): Overall completion percentage (0-100)
- `cost` (number, optional): Current estimated cost in USD
- `budget` (number, optional): Budget limit in USD
- `commission` (number, optional): Agent commission in USD
- `url` (string, optional): URL to detailed trip view
- `lastUpdated` (number, optional): Unix timestamp of last update

**Validation Rules**:
- `percent` must be between 0 and 100
- `cost` and `budget` should be non-negative
- `phase` must be one of the enum values
- If both `cost` and `budget` exist, `cost` should not exceed `budget` (warning, not error)

**State Transitions**:
- Research → Hotels → Activities → Booking → Finalization
- Can skip phases depending on user workflow

**Storage**: Recoil atom `voygentTripProgress` (session-only)

---

### 3. MCPServerStatus
**Purpose**: Health and connectivity status of a Model Context Protocol server

**Fields**:
- `name` (string, required): Server identifier (e.g., "d1_database", "prompt_instructions")
- `connected` (boolean, required): Whether connection is established
- `healthy` (boolean, required): Whether server is responding correctly
- `latency` (number, optional): Round-trip latency in milliseconds
- `lastCheck` (number, required): Unix timestamp of last health check
- `error` (string, optional): Error message if unhealthy

**Validation Rules**:
- `name` must match one of the configured servers: "chrome", "d1_database", "prompt_instructions", "template_document"
- `latency` should be positive if present
- If `connected` is false, `healthy` must also be false

**State Transitions**:
- Disconnected → Connecting → Connected/Healthy
- Connected → Unhealthy (on error response)
- Unhealthy → Healthy (on successful recovery)

**Storage**: Recoil atom `voygentMCPStatus` (array, session-only)

---

### 4. StatusPayload (API Response)
**Purpose**: Combined status response from `/api/voygen/status` endpoint

**Fields**:
- `ok` (boolean, optional): Whether status data is available (false = no active trip/usage)
- **Token Usage Fields** (if token mode):
  - `model` (string, optional)
  - `inputTokens` (number, optional)
  - `outputTokens` (number, optional)
  - `approximate` (boolean, optional)
  - `price` (number, optional)
- **Trip Progress Fields** (if trip mode):
  - `tripName` (string, optional)
  - `dates` (string, optional)
  - `phase` (string, optional)
  - `step` (number, optional)
  - `percent` (number, optional)
  - `cost` (number, optional)
  - `budget` (number, optional)
  - `commission` (number, optional)
  - `url` (string, optional)

**Validation Rules**:
- If `ok` is false, no other fields should be present
- Server decides which mode to return based on what data is available

**Usage**: Returned by `/api/voygen/status` endpoint, consumed by StatusBar component

---

## Relationships

```
StatusBar Component
  ├── Polls /api/voygen/status → StatusPayload
  │   ├── Token usage fields → displays as "model • in X • out Y • $Z"
  │   └── Trip progress fields → displays as "trip • phase • dates • cost/budget • %"
  ├── Falls back to voygentLastUsage (Recoil) if API returns ok=false
  └── Controlled by voygentStatusVerbosity (Recoil)

App.jsx
  └── Renders StatusBar component at root level

voygentMCPStatus (Recoil array)
  └── Polled by separate mechanism (future - not in this rebuild scope)
```

---

## Storage Strategy

### LocalStorage (persisted across sessions)
- `voygentLastUsage`: Last token usage for reference when no server data
- `voygentStatusVerbosity`: User preference for status detail level
- `voygentStatusMode`: User preference for display mode (auto/tokens/progress)

### Session State (Recoil, lost on refresh)
- `voygentCumulativeUsage`: Running total for current session
- `voygentTripProgress`: Current trip planning state
- `voygentMCPStatus`: MCP server health array
- `voygentDefaultQuery`: Query parameter for status API

### Remote (API/Database)
- Trip data stored in Cloudflare D1 via MCP servers (out of scope for this rebuild)
- Status endpoint queries D1 on demand

---

## Data Flow Examples

### Example 1: Token Usage Display
```
1. User sends chat message to AI
2. AI responds with token metadata
3. Frontend updates voygentLastUsage (persisted) and voygentCumulativeUsage (session)
4. StatusBar polls /api/voygen/status every 15s
5. If server has fresh data, displays it; otherwise shows voygentLastUsage
6. UI renders: "claude-3-5-sonnet-20241022 • in 1,234 • out 567 • $0.0089"
```

### Example 2: Trip Progress Display
```
1. User starts trip planning workflow
2. Backend updates trip state in D1
3. StatusBar polls /api/voygen/status
4. Server returns trip progress fields
5. UI renders: "Paris Winter Trip • Hotels (Step 2) • Dec 15-22 • $1,200/$2,000 • 35%"
```

### Example 3: Graceful Degradation (MCP Offline)
```
1. StatusBar polls /api/voygen/status
2. Server can't reach D1 MCP server
3. Server returns {ok: false} or 204 No Content
4. StatusBar falls back to localStorage voygentLastUsage
5. UI still displays last known token usage
```

---

## Notes

- This is not a database schema - it's runtime state and API contracts
- Actual persistence (D1 database schema) is managed by MCP servers (out of scope)
- Focus is on UI state management and API response shapes
