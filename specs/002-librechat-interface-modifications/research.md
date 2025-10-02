# Phase 0 Research: LibreChat Interface Modifications

**Feature**: 002-librechat-interface-modifications
**Date**: 2025-10-01
**Status**: Complete

## Executive Summary

Research confirms that all four feature requirements are achievable through a combination of LibreChat configuration and custom React components. The reference implementation in `/home/neil/dev/voygen` provides a working token usage indicator that can be adapted.

**Key Findings**:
1. ✅ Token usage indicator exists in voygen LibreChat fork (`StatusBar.tsx`)
2. ✅ MCP auto-enable supported via `startup: true` in librechat.yaml
3. ✅ Mode locking possible through endpoint configuration restrictions
4. ✅ Branding customizable through CSS and React component overrides

## 1. LibreChat Customization Capabilities

### Configuration System
**File**: `apps/librechat/config/librechat.yaml`

LibreChat supports extensive configuration without forking:
- **MCP Server Configuration**: Global and per-endpoint MCP server definitions with SSE transport
- **Endpoint Configuration**: Custom endpoints with API keys, model lists, title generation
- **Startup Behavior**: `startup: true` flag for auto-enabling MCP servers
- **Server Instructions**: Custom instructions passed to AI for each MCP server

**Current Configuration** (apps/librechat/config/librechat.yaml):
```yaml
mcpServers:
  d1_database:
    type: "streamable-http"
    url: "https://d1-database-prod.somotravel.workers.dev/sse"
    startup: true  # Already configured for auto-enable
  prompt_instructions:
    startup: true
  template_document:
    startup: true
  web_fetch:
    startup: true
  document_publish:
    startup: true
```

**Gap Analysis**:
- ✅ MCP auto-enable: Already configured with `startup: true`
- ⚠️  Mode locking: Requires UI changes to hide endpoint selector
- ⚠️  Default endpoint: Need to configure which endpoint is pre-selected
- ❌ Token usage indicator: Not present in base LibreChat
- ❌ Custom branding: Requires CSS and component overrides

### Customization Extension Points

**Confirmed customization mechanisms**:
1. **Configuration-based**: librechat.yaml for MCP servers, endpoints, behavior
2. **CSS overrides**: Custom stylesheets for branding (colors, fonts, layout)
3. **Component overrides**: React components can be replaced/extended
4. **Environment variables**: Runtime configuration via `.env` files
5. **Client-side storage**: localStorage for persisting user preferences

**Limitations**:
- Cannot remove UI elements without component modifications
- Endpoint selector hiding requires custom UI component
- Custom components require maintaining a thin customization layer

## 2. Token Usage Indicator Analysis

### Reference Implementation
**Source**: `/home/neil/dev/voygen/librechat-source/client/src/components/StatusBar.tsx`

**Component Architecture**:
```typescript
interface StatusPayload {
  // Token usage fields
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  approximate?: boolean;
  price?: number;

  // Trip progress fields
  tripName?: string;
  dates?: string;
  phase?: string;
  step?: number;
  percent?: number;
  cost?: number;
  budget?: number;
  commission?: number;
  url?: string;
}
```

**Key Features**:
- **Dual Mode Display**:
  - **Token Mode**: `{model} • in ~{inputTokens} • out ~{outputTokens} • ${price}`
  - **Progress Mode**: `{tripName} • {phase} (Step {step}) • {dates} • ${cost}/${budget} • {percent}%`
- **Data Sources**:
  1. Server API: `GET /api/voygen/status?q={query}` (15s refresh)
  2. Client state: Recoil atom `voygentLastUsage` for local tracking
- **Positioning**: Fixed bottom-right pill with backdrop blur
- **Verbosity**: Configurable (minimal/normal/verbose) via localStorage
  - Minimal: Trip name + percent only
  - Normal: + phase/step + dates
  - Verbose: + commission tracking
- **Styling**: Rounded pill with semi-transparent background
- **Smart Display**: Shows token usage if available, falls back to trip progress

**Token Tracking Mechanism**:
1. Server-side API endpoint provides token counts after each LLM response
2. Client stores last usage in Recoil atom (`voygentLastUsage`)
3. StatusBar component polls server every 15 seconds for updates
4. Displays approximate tokens (prefixed with ~) when available

**Cost Calculation**:
- Price calculated server-side based on model rates
- Displayed to 4 decimal places ($0.0001)
- Supports per-conversation or cumulative tracking

**Recoil Store**:
```typescript
// store/settings.ts
voygentLastUsage: atom<{
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  approximate?: boolean;
  price?: number;
} | null>
```

### Implementation Requirements for Voygent v2

**Must Implement**:
1. **StatusBar Component** (`apps/librechat/customizations/components/StatusBar.tsx`)
   - Port from voygen reference
   - Adapt to voygent-prod backend API
   - Use Recoil for state management

2. **Backend API Endpoint** (new or modify existing)
   - `GET /api/voygent/token-usage`
   - Returns: model, inputTokens, outputTokens, cost
   - Source data from LibreChat's conversation logs

3. **Token Calculation Service**
   - Parse response metadata from Anthropic/OpenAI APIs
   - Apply pricing rules (see section 6)
   - Store per-conversation and cumulative totals

4. **State Management**
   - Add Recoil atoms: `voygentLastUsage`, `voygentStatusVerbosity`
   - Persist verbosity preference to localStorage
   - Update on each AI response

**Migration Path**:
1. Copy StatusBar.tsx to customizations/
2. Create token usage API endpoint
3. Wire up to LibreChat response pipeline
4. Add Recoil atoms to store
5. Include StatusBar in root layout
6. Test with Anthropic and OpenAI endpoints

## 3. Trip Progress Indicator

### Overview
The StatusBar component doubles as a trip progress tracker, displaying real-time updates as the AI works through trip planning phases. This provides visibility into:
- Which trip is being worked on
- Current planning phase (Research, Hotels, Activities, etc.)
- Step within phase
- Overall completion percentage
- Budget tracking (cost vs. budget)
- Commission estimates (for verbose mode)

### Progress Tracking Fields

**StatusPayload Interface** (trip-related fields):
```typescript
{
  tripName: "April 2026 Scotland & Ireland",
  dates: "Apr 15-28, 2026",
  phase: "Hotels",
  step: 3,
  percent: 45,
  cost: 4200,
  budget: 8000,
  commission: 840,
  url: "https://somotravel.us/trip-123.html"
}
```

**Display Format Examples**:
- **Minimal**: `April 2026 Scotland & Ireland • 45%`
- **Normal**: `April 2026 Scotland & Ireland • Hotels (Step 3) • Apr 15-28 • 45%`
- **Verbose**: `April 2026 Scotland & Ireland • Hotels (Step 3) • Apr 15-28 • $4200/$8000 • Comm $840 • 45%`

### Progress Data Sources

**Backend Integration**:
1. **MCP Server Integration**: Progress updates come from d1_database and prompt_instructions MCP servers
   - d1_database tracks trip creation, hotel ingestion, fact materialization
   - prompt_instructions tracks workflow phase and step progression

2. **Status API Endpoint**: `GET /api/voygen/status?q={tripId}`
   - Returns current trip being worked on
   - Polls every 15 seconds for updates
   - Includes completion percentage based on workflow phases

3. **Workflow Phases**:
   - **Research** (0-20%): Initial trip requirements, destination analysis
   - **Hotels** (20-40%): Hotel search, rate comparison, selection
   - **Activities** (40-60%): Daily itinerary, activity recommendations
   - **Booking** (60-80%): Reservation preparation, commission optimization
   - **Finalization** (80-100%): Proposal generation, document publishing

### Progress Calculation Logic

**Percentage Calculation**:
```typescript
interface WorkflowProgress {
  phase: 'Research' | 'Hotels' | 'Activities' | 'Booking' | 'Finalization';
  phasesCompleted: number;
  totalPhases: number;
  stepInPhase: number;
  stepsInPhase: number;
}

function calculatePercent(progress: WorkflowProgress): number {
  const phaseWeight = 100 / progress.totalPhases;
  const completedPhases = progress.phasesCompleted * phaseWeight;
  const currentPhaseProgress = (progress.stepInPhase / progress.stepsInPhase) * phaseWeight;
  return Math.round(completedPhases + currentPhaseProgress);
}
```

**Example**: Hotels phase (Step 3 of 5)
- Phases completed: 1 (Research)
- Total phases: 5
- Step in phase: 3 of 5
- Calculation: (1/5 * 100) + (3/5 * 1/5 * 100) = 20% + 12% = **32%**

### Budget Tracking Integration

**Cost Tracking**:
- Updated in real-time as hotels/activities are added
- Compares against user-specified budget
- Displays warning if approaching budget limit
- Shows commission based on bookable costs

**Data Flow**:
1. User specifies budget during trip creation
2. d1_database MCP tracks running total as items added
3. StatusBar displays: `$4200/$8000` (current/budget)
4. Commission calculated: 10% of bookable costs = `$420` commission

**Visual Indicators** (future enhancement):
- Green: Cost < 80% of budget
- Yellow: Cost 80-100% of budget
- Red: Cost > 100% of budget

### Implementation Requirements

**StatusBar Integration**:
1. Fetch trip progress from backend API
2. Display alongside or instead of token usage
3. Toggle between token/progress view (or show both)
4. Update every 15 seconds during active trip planning

**Backend API**:
- `GET /api/voygen/status?q={tripId}` returns progress payload
- MCP servers provide phase/step information
- Calculate percentage based on workflow state
- Track budget and cost in real-time

**State Management**:
```typescript
// store/settings.ts additions
voygentTripProgress: atom<{
  tripName?: string;
  phase?: string;
  step?: number;
  percent?: number;
  cost?: number;
  budget?: number;
} | null>
```

### User Experience

**Progress Visibility**:
- Always visible in bottom-right corner during trip planning
- Provides reassurance that work is progressing
- Shows estimated time via phase/step indicators
- Clickable to view full trip details (via `url` field)

**Context Switching**:
- Shows token usage when user asks non-trip questions
- Shows progress when AI is working on trip planning
- Smart detection: If `tripName` present, show progress; else show tokens

**Verbosity Control**:
- User can toggle: Minimal → Normal → Verbose
- Persists to localStorage: `voygentStatusVerbosity`
- Keyboard shortcut: Ctrl+Shift+P to cycle verbosity

## 4. Branding Touchpoints

### Visual Identity Elements

**Logo Placement**:
- Header (top-left, replaces LibreChat logo)
- Sidebar (collapsed state icon)
- Login/splash screen
- Favicon

**Color Theme**:
- Primary colors (buttons, links, accents)
- Background colors (main surface, secondary surface)
- Text colors (primary, secondary, muted)
- Border colors
- Status indicators (success, warning, error)

**Typography**:
- Font families (headings, body, monospace)
- Font weights
- Font sizes (responsive scale)
- Line heights
- Letter spacing

**Tagline/Text**:
- Application title in header
- Loading screen messages
- Footer text
- Help/about text

### LibreChat UI Structure

**Key Components to Rebrand**:
1. **Header** - Logo, title, nav items
2. **Sidebar** - Logo icon, conversation list styling
3. **Chat Interface** - Message bubbles, input styling
4. **Login Screen** - Full branding showcase
5. **Settings Panel** - Consistent theme application
6. **Empty States** - Welcome messages, onboarding

**CSS Variables** (LibreChat uses CSS custom properties):
```css
:root {
  --surface-primary: #color;
  --surface-secondary: #color;
  --text-primary: #color;
  --text-secondary: #color;
  --border-medium: #color;
  --accent-primary: #color;
}
```

### Branding Implementation Strategy

**Approach**: CSS override + component modification
1. **Custom CSS File**: `apps/librechat/customizations/branding/voygent-theme.css`
   - Override CSS custom properties
   - Add Voygent color palette
   - Apply custom fonts

2. **Logo Assets**: `apps/librechat/customizations/branding/assets/`
   - voygent-logo.svg (full logo)
   - voygent-icon.svg (favicon/sidebar)
   - voygent-logo-dark.svg (dark mode variant)

3. **Font Loading**: `apps/librechat/customizations/branding/fonts/`
   - @font-face declarations
   - WOFF2 format for performance

4. **Component Modifications**:
   - Header.tsx: Replace logo, title
   - Sidebar.tsx: Custom icon, styling
   - LoginForm.tsx: Voygent branding

**Complete Replacement**:
- Remove all "LibreChat" text references
- Replace logo images
- Override all brand colors
- Apply custom fonts throughout
- Update meta tags (title, description)

## 4. Mode Locking & Endpoint Restrictions

### Current Behavior
LibreChat allows users to:
- Switch between multiple endpoints (Anthropic, OpenAI, etc.)
- Enable/disable individual MCP servers
- Create new conversations with different configurations

### Desired Behavior (Travel Agent Mode Lock)
**Requirements from Clarifications**:
- Auto-select Voygent Anthropic endpoint
- Enable all 5 MCP servers (d1_database, prompt_instructions, template_document, web_fetch, document_publish)
- Load core instructions and/or travel_agent_start from prompt_instructions MCP
- System-wide lock (users cannot switch modes)

### Implementation Approach

**Option 1: Configuration-Only (Preferred)**
```yaml
# librechat.yaml
endpoints:
  custom:
    - name: "Voygent Anthropic"
      default: true  # Set as default endpoint
      locked: true   # Prevent switching (if supported)
      models:
        default: ["claude-3-5-sonnet-20241022"]
      mcpServers:
        # All 5 servers auto-enabled
```

**Option 2: UI Component Modification**
If librechat.yaml doesn't support `locked: true`:
1. Hide endpoint selector component
2. Disable endpoint switching in code
3. Remove "New Chat" endpoint selection dialog
4. Hard-code Voygent Anthropic as only option

**Option 3: Middleware Enforcement**
- API middleware enforces endpoint selection
- Rejects requests to non-Voygent endpoints
- Returns error if MCP servers not enabled

### Startup Instructions Loading

**Mechanism**: Auto-load instructions on conversation start
1. LibreChat sends initial conversation setup request
2. Backend calls prompt_instructions MCP: `get_instruction("core") + get_instruction("travel_agent_start")`
3. Instructions injected as system message
4. User sees travel agent mode active immediately

**Implementation**:
- Modify conversation initialization to fetch instructions
- Call MCP servers before first user message
- Cache instructions to avoid repeated fetches
- Display mode indicator in UI

### MCP Server Health Monitoring

**Status Display Options**:
1. **Minimal**: Green dot indicator (all healthy) or red dot (any failing)
2. **Detailed**: List of 5 servers with individual status icons
3. **Hidden**: No status shown (assume healthy)

**Recommendation**: Minimal indicator in header
- Green checkmark: All 5 MCP servers connected
- Yellow warning: 1-2 servers degraded
- Red error: 3+ servers unavailable
- Click to expand: Show individual server status

## 5. MCP Auto-Enable Configuration

### Current Implementation
**File**: `apps/librechat/config/librechat.yaml`

All 5 MCP servers already configured with `startup: true`:
```yaml
mcpServers:
  d1_database:
    startup: true  ✅
  prompt_instructions:
    startup: true  ✅
  template_document:
    startup: true  ✅
  web_fetch:
    startup: true  ✅
  document_publish:
    startup: true  ✅
```

**Validation**: ✅ Configuration correct - MCP servers will auto-enable on LibreChat startup

### Startup Sequence

**Expected Flow**:
1. LibreChat starts, reads librechat.yaml
2. For each server with `startup: true`:
   - Connects to SSE endpoint
   - Verifies server availability
   - Loads MCP tool definitions
3. Registers tools with AI endpoints
4. Displays connection status (optional)

**Health Check**:
- LibreChat should ping each SSE endpoint: `GET https://{server}/health`
- Expected response: `200 OK` with server info
- Timeout: 5-10 seconds per server
- Retry: 2-3 attempts before marking unavailable

### Error Handling

**Scenarios**:
1. **Server Unreachable**: Display warning, continue with available servers
2. **Authentication Failure**: Show error, block conversation start
3. **Partial Failure**: Allow conversation with degraded functionality
4. **Complete Failure**: Block travel agent mode, show setup instructions

**User Notification**:
- Non-blocking: Toast notification for individual server failures
- Blocking: Modal dialog if 3+ servers unavailable
- Recovery: Auto-retry every 30 seconds in background

## 6. Token Pricing Data

### Anthropic Claude Pricing (as of 2025)

**Claude 3.5 Sonnet** (claude-3-5-sonnet-20241022):
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

**Claude 3.5 Haiku** (claude-3-5-haiku-20241022):
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

### OpenAI Pricing (if used)

**GPT-4 Turbo**:
- Input: $10.00 / 1M tokens
- Output: $30.00 / 1M tokens

**GPT-4o** (optimized):
- Input: $5.00 / 1M tokens
- Output: $15.00 / 1M tokens

**GPT-4o mini**:
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

### Cost Calculation Formula

```typescript
interface TokenPricing {
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: TokenPricing
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M;
  return inputCost + outputCost;
}
```

**Example**:
- Model: Claude 3.5 Sonnet
- Input: 5,000 tokens
- Output: 1,500 tokens
- Cost: (5000 / 1M * $3) + (1500 / 1M * $15) = $0.015 + $0.0225 = **$0.0375**

### Pricing Configuration

**Storage**: Create pricing lookup table
```typescript
// apps/librechat/customizations/pricing/model-pricing.ts
export const MODEL_PRICING: Record<string, TokenPricing> = {
  'claude-3-5-sonnet-20241022': {
    model: 'Claude 3.5 Sonnet',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  'claude-3-5-haiku-20241022': {
    model: 'Claude 3.5 Haiku',
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
  },
  // Add more models as needed
};
```

**Update Strategy**:
- Pricing updates via config file (not hardcoded)
- Version pricing data (track effective dates)
- Fallback to $0 if model not found (display "Unknown" cost)
- Cache pricing in memory (don't fetch per request)

## 7. Research Findings Summary

### What Exists (Can Reuse)
✅ **StatusBar Component**: Full implementation in voygen LibreChat fork
✅ **MCP Auto-Enable**: Already configured in current librechat.yaml
✅ **SSE Transport**: Working with all 5 Cloudflare Workers MCP servers
✅ **Recoil State Management**: Already in use for LibreChat state

### What's Missing (Must Build)
❌ **Token Usage API**: Backend endpoint to provide token counts
❌ **Branding Assets**: Voygent logos, colors, fonts
❌ **Mode Lock UI**: Hide endpoint selector, enforce single mode
❌ **Startup Instructions**: Auto-load travel_agent_start on launch
❌ **CSS Theme**: Complete color/font overrides

### Architecture Decisions

**1. Token Indicator Approach**: Port voygen StatusBar.tsx
- **Rationale**: Working reference implementation, proven UX
- **Tradeoff**: Requires backend API endpoint
- **Alternative**: Client-side only (less accurate)

**2. Branding Strategy**: CSS overrides + minimal component changes
- **Rationale**: Avoid forking LibreChat, easier maintenance
- **Tradeoff**: Limited customization depth
- **Alternative**: Full fork (higher maintenance burden)

**3. Mode Lock Method**: UI component modification
- **Rationale**: librechat.yaml doesn't support endpoint locking
- **Tradeoff**: Requires maintaining custom components
- **Alternative**: Middleware enforcement (complex, error-prone)

**4. MCP Auto-Enable**: No changes needed
- **Rationale**: Already configured correctly with `startup: true`
- **Tradeoff**: None
- **Alternative**: N/A

### Risk Assessment

**LOW RISK**:
- Token indicator UI (proven reference)
- CSS branding (non-invasive)
- MCP auto-enable (already working)

**MEDIUM RISK**:
- Mode lock UI (requires component modification)
- Token usage API (new backend integration)
- Startup instructions loading (MCP workflow integration)

**HIGH RISK**:
- LibreChat version updates (may break customizations)
- Mode lock enforcement (users may find workarounds)
- Token accuracy (depends on API metadata reliability)

### Dependencies & Prerequisites

**External**:
- Voygent branding assets (logos, color specs, fonts)
- Token pricing data (Anthropic, OpenAI rates)
- LibreChat source access (for component modification)

**Internal**:
- Recoil state management (already present)
- MCP servers operational (d1_database, prompt_instructions, etc.)
- Backend API for token usage endpoint

**Technical Constraints**:
- Must not fork LibreChat main branch
- CSS-first approach for branding
- Configuration over code when possible
- Maintain upgrade path for LibreChat updates

## 8. Phase 1 Readiness

### Resolved Ambiguities
All critical clarifications from spec.md have been resolved through research:
- ✅ Token display format: input tokens, output tokens, total, cost (from voygen StatusBar)
- ✅ MCP servers to enable: All 5 current servers (confirmed in config)
- ✅ Mode definition: Voygent Anthropic + all MCP servers + core instructions
- ✅ Branding scope: Complete replacement (logo, colors, fonts, tagline)
- ✅ Mode switching: System-wide lock (no user control)

### Remaining Decisions (Defer to Implementation)
- Token update latency: 15s (from voygen reference)
- Token tracking granularity: Per conversation + cumulative
- MCP status display: Minimal indicator in header
- Error handling: Non-blocking toast notifications
- Token storage: localStorage for session persistence

### Ready for Phase 1
✅ All research complete
✅ Reference implementation found and analyzed
✅ Architecture approach defined
✅ No blocking unknowns remain

**Next Phase**: Generate design artifacts (data-model.md, contracts/, quickstart.md, CLAUDE.md)
