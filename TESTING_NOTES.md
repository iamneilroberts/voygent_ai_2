# Manual Testing Setup - Voygent LibreChat v2

**Date**: 2025-10-02
**Status**: Build Complete - Runtime Fixes Needed

---

## Current Status

✅ **Production build successful** with all Voygent branding
✅ **All files copied** and integrated
✅ **Dependencies installed** (2,412 packages)
⚠️ **Backend server** - needs TypeScript file conversion

---

##  Issues Found During Manual Testing Setup

### Issue 1: Missing customizations directory ✅ FIXED
**Problem**: Backend routes imported from `api/customizations/pricing/model-pricing.ts`
**Solution**: Copied `customizations/` directory to `apps/librechat/api/`

### Issue 2: TypeScript file import in production ⚠️ NEEDS FIX
**Problem**: Node.js cannot load `.ts` files directly in production mode
**File**: `/home/neil/dev/Voygent_ai_2/apps/librechat/api/customizations/pricing/model-pricing.js`
**Error**: `SyntaxError: Unexpected token 'export'` at line 9 (`export interface ModelPricing`)

**Solution Options**:
1. **Convert TypeScript to JavaScript**: Remove `interface` and type annotations
2. **Use backend:dev** instead of backend (runs with ts-node)
3. **Build/compile customizations** before starting backend

### Recommended Fix for Issue 2

Edit `/home/neil/dev/Voygent_ai_2/apps/librechat/api/customizations/pricing/model-pricing.js`:

```javascript
// Remove or comment out TypeScript-only syntax:
// export interface ModelPricing { ... }

// Convert to JSDoc comments if type info needed:
/**
 * @typedef {Object} ModelPricing
 * @property {string} model
 * @property {number} inputCostPer1M
 * @property {number} outputCostPer1M
 */

// Keep only JavaScript-compatible exports:
export function calculateCost(model, inputTokens, outputTokens) {
  // Implementation...
}
```

---

## Manual Testing Steps

Once backend fixes are applied:

### 1. Start Backend Server
```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat

# Option A: Production mode (after fixing TypeScript)
npm run backend

# Option B: Development mode (if backend:dev script exists)
npm run backend:dev
```

**Expected Output**:
```
Server listening on http://localhost:3080
MongoDB connected
```

**Health Check**:
```bash
curl http://localhost:3080/api/health
# Expected: {"status":"ok"}
```

### 2. Start Frontend Dev Server
```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat/client
npm run dev
```

**Expected Output**:
```
VITE v6.3.6  ready in X ms
➜  Local:   http://localhost:3090/
```

### 3. Browser Verification

Open http://localhost:3090 and verify:

#### ✅ Branding Checklist
- [ ] Page title shows "Voygent - AI Travel Planning" (check browser tab)
- [ ] Voygent favicon visible (not LibreChat icon)
- [ ] Voygent logo displays (not "LibreChat" text)
- [ ] Theme colors match Voygent branding (check voygent-theme.css)
- [ ] No console errors in browser DevTools

#### ✅ Components Checklist
- [ ] VoygenWelcome component renders on landing page
- [ ] StatusBar component visible (check bottom-right corner)
  - Note: May not show until after sending first message
- [ ] StatusBar displays token usage after chat interaction

#### ✅ Functionality Checklist
- [ ] Can create new conversation
- [ ] Can select "Claude Sonnet (Premium)" model
- [ ] Can send chat message
- [ ] AI responds successfully
- [ ] StatusBar updates with token count
- [ ] MCP servers connect (check /api/voygen/status)

---

## API Endpoints to Test

### GET /api/voygen/status
```bash
curl http://localhost:3080/api/voygen/status
```

**Expected Responses**:
- `204 No Content` - No token usage data yet
- `200` with JSON - Token usage or trip progress data

**Example Response**:
```json
{
  "ok": true,
  "model": "claude-3-5-sonnet-20241022",
  "inputTokens": 1234,
  "outputTokens": 567,
  "approximate": false,
  "price": 0.0089
}
```

### POST /api/voygen/start
```bash
curl -X POST http://localhost:3080/api/voygen/start
```

**Expected**: `{"ok": true}`

---

## Files That Were Modified

1. **Added**: `api/customizations/` directory (pricing and MCP configs)
2. **Fixed**: `api/server/routes/voygent/token-usage.js` - changed `.ts` to `.js` in import
3. **Renamed**: `model-pricing.ts` → `model-pricing.js`
4. **Still needs**: TypeScript syntax removal from `model-pricing.js`

---

## Environment Configuration

**File**: `/home/neil/dev/Voygent_ai_2/apps/librechat/.env`

✅ **Copied from working source** (`/home/neil/dev/voygen/librechat-source/.env`)

**Key Variables** (verify these are set):
- `MONGO_URI` - MongoDB connection string
- `ANTHROPIC_API_KEY` - For Claude models
- `Z_AI_API_KEY` - For z.ai GLM models (optional)
- `PORT=3080` - Backend server port

---

## Next Steps for Deployment

### Before Git Commit:
1. Fix `model-pricing.js` TypeScript syntax
2. Test backend starts successfully
3. Test frontend dev server
4. Manual browser verification
5. Take screenshot showing Voygent branding

### Git Commit:
```bash
cd /home/neil/dev/Voygent_ai_2
git add .
git commit -m "feat: Complete LibreChat rebuild with Voygent customizations

- Full file migration from librechat-source
- Production build successful with Voygent branding
- All components integrated (StatusBar, VoygenWelcome)
- Backend routes mounted at /api/voygent
- MCP config corrected (mcp-chrome, d1-database, prompt-instructions, template-document)
- 7 comprehensive test files created
- Dependencies: 2,412 packages installed

Known issues:
- model-pricing.js needs TypeScript syntax conversion for production mode
- Tests use Vitest syntax, project uses Jest (conversion needed)

Testing: Manual browser testing required
Build: ✓ client/dist/ production bundle ready
Deployment: Ready for Render.com after runtime verification"
```

### GitHub Push:
```bash
git push origin master
```

### Render.com Deployment:
1. Verify `render.yaml` exists in repository root
2. Push triggers automatic deployment
3. Monitor build logs at https://dashboard.render.com
4. Verify deployed app shows Voygent branding
5. Test MCP server connectivity in production

---

## Troubleshooting

### Backend Won't Start

**Error**: `Cannot find module`
**Fix**: Check all dependencies installed: `npm install`

**Error**: `Unknown file extension .ts`
**Fix**: Convert TypeScript files to JavaScript or use dev mode

**Error**: `MongoDB connection failed`
**Fix**: Verify `MONGO_URI` in `.env` and MongoDB is running

### Frontend Build Fails

**Error**: `Failed to resolve import "dompurify"`
**Fix**: `cd packages/client && npm install dompurify`

**Error**: `vite-plugin-pwa errors`
**Fix**: Non-blocking, build still succeeds

### Branding Not Showing

**Issue**: Still shows "LibreChat" instead of "Voygent"
**Fix**: Check browser cache, hard refresh (Ctrl+Shift+R)
**Verify**: `grep "Voygent" client/dist/index.html` shows results

---

## Test Files Created (Need Jest Conversion)

Backend tests should work as-is:
- ✓ `api/__tests__/contract/voygen-status-get.test.js`
- ✓ `api/__tests__/contract/voygen-start-post.test.js`
- ✓ `api/__tests__/integration/voygen-routes.test.js`
- ✓ `api/__tests__/integration/mcp-config.test.js`

Frontend tests need Vitest→Jest conversion:
- ⚠️ `client/__tests__/unit/StatusBar.test.tsx`
- ⚠️ `client/__tests__/unit/VoygenWelcome.test.tsx`
- ⚠️ `client/__tests__/unit/voygent-store.test.ts`

---

## Documentation

- **Completion Summary**: `specs/002-rebuild-the-whole/COMPLETION_SUMMARY.md`
- **Task List**: `specs/002-rebuild-the-whole/tasks.md` (24/40 complete)
- **API Contracts**: `specs/002-rebuild-the-whole/contracts/api-voygen-status.yaml`
- **Quickstart**: `specs/002-rebuild-the-whole/quickstart.md`

---

**Status**: ✅ Build complete, ⚠️ Runtime testing pending TypeScript fixes
**Next**: Fix model-pricing.js, test manually, commit to Git, deploy to Render.com
