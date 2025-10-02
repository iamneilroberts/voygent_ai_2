# Quickstart: LibreChat Interface Modifications

**Feature**: 002-librechat-interface-modifications
**Target Audience**: Developers implementing the feature
**Estimated Setup Time**: 30-45 minutes

## Overview

This guide will help you set up and implement the LibreChat interface modifications including:
1. **Token Usage Indicator**: Real-time display of token metrics and costs
2. **Trip Progress Indicator**: Live trip planning workflow progress
3. **Voygent Branding**: Complete UI rebrand with custom logo, colors, fonts
4. **Travel Agent Mode Lock**: System-wide mode enforcement with auto-enabled MCP servers

## Prerequisites

- [ ] LibreChat instance running (v0.7.5+)
- [ ] Node.js 20+ and npm installed
- [ ] Access to Voygent codebase at `/home/neil/dev/Voygent_ai_2`
- [ ] MCP servers deployed and accessible (see [MCP Server URLs](#mcp-server-urls))
- [ ] D1 database `voygent-prod` configured
- [ ] Cloudflare credentials (for database migrations)

## Quick Start (5 minutes)

### 1. Clone Reference Implementation

```bash
# Copy StatusBar component from voygen reference
cd /home/neil/dev/Voygent_ai_2/apps/librechat
cp /home/neil/dev/voygen/librechat-source/client/src/components/StatusBar.tsx \
   customizations/components/StatusBar.tsx

# Copy Recoil store definitions
cp /home/neil/dev/voygen/librechat-source/client/src/store/settings.ts \
   customizations/store/voygent.ts
```

### 2. Install Dependencies

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat
npm install @tanstack/react-query recoil zod
```

### 3. Verify MCP Configuration

```bash
# Check librechat.yaml has startup: true for all servers
cat config/librechat.yaml | grep -A 5 "mcpServers:"
```

Expected output:
```yaml
mcpServers:
  d1_database:
    startup: true  # ✅
  prompt_instructions:
    startup: true  # ✅
  # ... etc
```

### 4. Start LibreChat

```bash
npm run dev
# Open http://localhost:3000
# Verify StatusBar appears in bottom-right corner
```

## Detailed Setup

### Phase 1: Token Usage Indicator

#### 1.1 Backend API Endpoint

Create the token usage tracking API:

```bash
# Create API route
touch apps/librechat/server/routes/voygent/token-usage.js
```

```javascript
// apps/librechat/server/routes/voygent/token-usage.js
import { Router } from 'express';
import { calculateCost } from '../../utils/pricing.js';

const router = Router();

router.get('/token-usage', async (req, res) => {
  const { conversationId, cumulative } = req.query;

  try {
    // Fetch from database (implement your logic)
    const usage = await fetchTokenUsage(conversationId, cumulative);

    if (!usage) {
      return res.status(204).send();
    }

    res.json({ ok: true, usage });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      code: 'USAGE_FETCH_ERROR'
    });
  }
});

export default router;
```

#### 1.2 Frontend StatusBar Component

```bash
# Create StatusBar component
mkdir -p apps/librechat/client/src/components/StatusBar
touch apps/librechat/client/src/components/StatusBar/index.tsx
```

Copy the reference implementation from voygen and adapt:

```typescript
// apps/librechat/client/src/components/StatusBar/index.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { voygentLastUsage, voygentStatusVerbosity } from '~/store/voygent';

export default function StatusBar() {
  const verbosity = useRecoilValue(voygentStatusVerbosity);

  const { data } = useQuery({
    queryKey: ['voygent-status'],
    queryFn: async () => {
      const res = await fetch('/api/voygent/status');
      if (res.status === 204) return { ok: false };
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // ... (rest of implementation from research.md section 2)
}
```

#### 1.3 Database Migration

```bash
# Run D1 migration for token tracking
cd /home/neil/dev/Voygent_ai_2/infra/cloudflare/migrations

# Create migration file
cat > 003_token_usage_log.sql <<EOF
CREATE TABLE IF NOT EXISTS token_usage_log (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  approximate BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_token_usage_conversation ON token_usage_log(conversation_id);
CREATE INDEX idx_token_usage_user ON token_usage_log(user_id);
EOF

# Apply migration
export CLOUDFLARE_API_TOKEN=NkYJjz86DTJ8ciEjALmX4OqGrUBsKPsUeATY_0Cu
export CLOUDFLARE_ACCOUNT_ID=5c2997e723bf93da998a627e799cd443
npx wrangler d1 execute voygent-prod --file=003_token_usage_log.sql
```

### Phase 2: Trip Progress Indicator

#### 2.1 Update D1 Schema

```bash
# Add progress fields to trips_v2 table
cat > 004_trip_progress_fields.sql <<EOF
ALTER TABLE trips_v2 ADD COLUMN phase TEXT DEFAULT 'Research';
ALTER TABLE trips_v2 ADD COLUMN step INTEGER DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN total_steps INTEGER DEFAULT 5;
ALTER TABLE trips_v2 ADD COLUMN percent INTEGER DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN cost REAL DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN commission REAL DEFAULT 0;
ALTER TABLE trips_v2 ADD COLUMN last_updated INTEGER;
EOF

npx wrangler d1 execute voygent-prod --file=004_trip_progress_fields.sql
```

#### 2.2 Backend Progress API

```bash
touch apps/librechat/server/routes/voygent/trip-progress.js
```

```javascript
// apps/librechat/server/routes/voygent/trip-progress.js
import { Router } from 'express';

const router = Router();

router.get('/trip-progress', async (req, res) => {
  const { tripId, conversationId } = req.query;

  try {
    const progress = await fetchTripProgress(tripId || conversationId);

    if (!progress) {
      return res.status(204).send();
    }

    res.json({ ok: true, progress });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      code: 'PROGRESS_FETCH_ERROR'
    });
  }
});

export default router;
```

### Phase 3: Voygent Branding

#### 3.1 Create Branding Assets Directory

```bash
mkdir -p apps/librechat/client/public/assets/voygent
mkdir -p apps/librechat/client/src/customizations/branding
```

#### 3.2 Custom CSS Theme

```bash
touch apps/librechat/client/src/customizations/branding/voygent-theme.css
```

```css
/* apps/librechat/client/src/customizations/branding/voygent-theme.css */

:root {
  /* Voygent Primary Colors */
  --voygent-primary: #0066cc;
  --voygent-primary-dark: #004999;
  --voygent-secondary: #ff6b35;
  --voygent-accent: #00c9a7;

  /* Override LibreChat CSS variables */
  --surface-primary: #ffffff;
  --surface-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-medium: #d1d1d1;
  --accent-primary: var(--voygent-primary);

  /* Fonts */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-heading: 'Plus Jakarta Sans', var(--font-family-primary);
}

/* Override LibreChat branding */
.app-header .logo {
  content: url('/assets/voygent/logo.svg');
}

.app-title::after {
  content: 'Voygent Travel Agent';
}

/* Dark mode overrides */
.dark {
  --surface-primary: #1a1a1a;
  --surface-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --border-medium: #404040;
}
```

#### 3.3 Load Custom Theme

```javascript
// apps/librechat/client/src/App.tsx
import './customizations/branding/voygent-theme.css';
```

### Phase 4: Travel Agent Mode Lock

#### 4.1 Hide Endpoint Selector

```bash
touch apps/librechat/client/src/customizations/components/EndpointLock.tsx
```

```typescript
// apps/librechat/client/src/customizations/components/EndpointLock.tsx
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import store from '~/store';

export default function EndpointLock() {
  const setEndpoint = useSetRecoilState(store.currentEndpoint);

  useEffect(() => {
    // Force Voygent Anthropic endpoint
    setEndpoint('voygent-anthropic');

    // Hide endpoint selector (CSS)
    const style = document.createElement('style');
    style.textContent = '.endpoint-selector { display: none !important; }';
    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, [setEndpoint]);

  return null;
}
```

#### 4.2 Auto-Load Instructions

```javascript
// apps/librechat/server/middleware/autoLoadInstructions.js
export async function autoLoadInstructions(req, res, next) {
  if (req.path === '/api/conversations/new') {
    // Call prompt_instructions MCP to get core + travel_agent_start
    const instructions = await fetchInstructions(['core', 'travel_agent_start']);
    req.body.systemMessage = instructions;
  }
  next();
}
```

## Verification Checklist

After setup, verify each component:

### Token Usage Indicator
- [ ] StatusBar visible in bottom-right corner
- [ ] Shows model name, input tokens, output tokens, cost
- [ ] Updates after each AI response (~15s delay)
- [ ] Cost calculation accurate (verify against Anthropic pricing)
- [ ] Persists across page refresh (localStorage)

### Trip Progress Indicator
- [ ] StatusBar switches to progress mode when trip active
- [ ] Shows trip name, phase, step, percentage
- [ ] Updates as trip progresses through phases
- [ ] Budget tracking displays cost vs. budget
- [ ] Commission estimate shown in verbose mode

### Voygent Branding
- [ ] Voygent logo appears in header
- [ ] Custom colors applied (primary blue, secondary orange)
- [ ] Custom fonts loaded (Inter, Plus Jakarta Sans)
- [ ] No "LibreChat" branding visible
- [ ] Dark mode theme applied correctly

### Travel Agent Mode Lock
- [ ] Endpoint selector hidden
- [ ] Only "Voygent Anthropic" endpoint available
- [ ] All 5 MCP servers auto-enabled on startup
- [ ] Core instructions loaded automatically
- [ ] Users cannot switch to other endpoints

### MCP Server Health
- [ ] All 5 servers showing "connected" status
- [ ] Health indicator green in header
- [ ] Individual server status visible on click
- [ ] Latency < 100ms for all servers

## Configuration Reference

### MCP Server URLs

```yaml
d1_database: https://d1-database-prod.somotravel.workers.dev/sse
prompt_instructions: https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse
template_document: https://template-document-mcp.somotravel.workers.dev/sse
web_fetch: https://web-fetch-mcp.somotravel.workers.dev/sse
document_publish: https://document-publish-mcp.somotravel.workers.dev/sse
```

### Token Pricing

```typescript
const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'gpt-4o': { input: 5.00, output: 15.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};
```

### Workflow Phases

```typescript
const PHASES = {
  Research: { range: [0, 20], steps: 4 },
  Hotels: { range: [20, 40], steps: 5 },
  Activities: { range: [40, 60], steps: 6 },
  Booking: { range: [60, 80], steps: 4 },
  Finalization: { range: [80, 100], steps: 3 },
};
```

## Troubleshooting

### StatusBar Not Showing
1. Check browser console for errors
2. Verify API endpoint responding: `curl http://localhost:3000/api/voygent/status`
3. Check Recoil atoms initialized: `localStorage.getItem('voygent_last_usage')`

### Token Counts Inaccurate
1. Verify model ID matches pricing table
2. Check API response metadata from Anthropic
3. Enable approximate flag if counts estimated

### MCP Servers Not Connected
1. Test SSE endpoint: `curl https://d1-database-prod.somotravel.workers.dev/health`
2. Check librechat.yaml `startup: true` for all servers
3. Review LibreChat logs for connection errors

### Trip Progress Not Updating
1. Verify D1 schema has progress fields: `ALTER TABLE trips_v2`
2. Check MCP servers writing progress updates
3. Test API: `curl http://localhost:3000/api/voygent/trip-progress?tripId=test`

### Branding Not Applied
1. Verify CSS file imported in App.tsx
2. Clear browser cache and hard reload (Ctrl+Shift+R)
3. Check CSS specificity (use `!important` if needed)

## Next Steps

After completing quickstart:
1. Review [data-model.md](./data-model.md) for data structures
2. Check [contracts/](./contracts/) for API specifications
3. See [plan.md](./plan.md) for full implementation phases
4. Run `/tasks` command to generate implementation tasks

## Support

- **Codebase**: `/home/neil/dev/Voygent_ai_2`
- **Reference Implementation**: `/home/neil/dev/voygen`
- **Constitution**: `.specify/memory/constitution.md`
- **Spec Document**: `specs/002-librechat-interface-modifications/spec.md`
