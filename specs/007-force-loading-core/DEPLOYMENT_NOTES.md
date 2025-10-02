# Deployment Notes: Core Instructions Feature

**Date**: 2025-10-02
**Feature**: 007-force-loading-core
**Deployment**: Render.com (voygent-librechat)

---

## Integration Approach

Since Voygent uses the official LibreChat Docker image as a base (`ghcr.io/danny-avila/librechat-dev:latest`), we cannot directly modify the React App component. Instead, we use the existing monkey-patch pattern to inject the API endpoint and copy frontend files into the container.

### What Was Integrated

#### ✅ Backend Integration (Complete)
1. **API Endpoint**: Added `/api/config/core-instructions` route via `inject-analytics.js`
   - Serves `core-instructions.md` file
   - Returns 404 if file missing
   - Sets proper Content-Type and Cache-Control headers
   - Uses same monkey-patch pattern as analytics

2. **Configuration File**: `config/core-instructions.md` copied to container
   - 8.3KB Voygent system prompts
   - MCP tool documentation
   - Workflow guidance

#### ⚠️ Frontend Integration (Partial)
**Status**: Files copied to container, but NOT yet integrated into React app

**Files Copied**:
- `/app/client/src/types/coreInstructions.ts`
- `/app/client/src/services/CoreInstructionsService.ts`
- `/app/client/src/utils/storageAdapter.ts`
- `/app/client/src/utils/instructionToasts.ts`
- `/app/client/src/hooks/useCoreInstructions.ts`
- `/app/client/src/commands/voygentCommand.ts`

**Not Yet Done**:
- App.tsx modification (requires base image rebuild or runtime injection)
- Command registry integration
- Toast library wiring

---

## Current Functionality

### ✅ Working Now (After This Deployment)
1. **API Endpoint**: `GET /api/config/core-instructions`
   ```bash
   curl https://voygent-librechat.onrender.com/api/config/core-instructions
   # Should return Markdown content
   ```

2. **Files Available**: All implementation files are in the container at `/app/client/src/`

### ❌ Not Yet Working
1. **Automatic Loading**: Instructions won't load on startup (App.tsx not modified)
2. **`/voygent` Command**: Not registered (command registry not modified)
3. **Toast Notifications**: Not wired up

---

## Testing This Deployment

### Test API Endpoint
```bash
# Check if endpoint is live
curl -I https://voygent-librechat.onrender.com/api/config/core-instructions

# Expected: 200 OK with Content-Type: text/markdown

# Get content
curl https://voygent-librechat.onrender.com/api/config/core-instructions

# Expected: Markdown content (~8KB)
```

### Verify Container Files
If you have shell access to the Render container:
```bash
# Check if files were copied
ls -lh /app/config/core-instructions.md
ls -lh /app/client/src/types/coreInstructions.ts
ls -lh /app/client/src/services/CoreInstructionsService.ts
ls -lh /app/client/src/utils/storageAdapter.ts
ls -lh /app/client/src/utils/instructionToasts.ts
ls -lh /app/client/src/hooks/useCoreInstructions.ts
ls -lh /app/client/src/commands/voygentCommand.ts
```

---

## Next Steps for Full Integration

To complete the frontend integration, you have three options:

### Option 1: Custom LibreChat Fork (Recommended for Production)
1. Fork the LibreChat repository
2. Modify `client/src/App.tsx` to add the core instructions hook
3. Register `/voygent` command in command registry
4. Build custom Docker image
5. Update Dockerfile FROM line to use your custom image

**Pros**: Full control, proper integration
**Cons**: Maintenance overhead, need to track upstream changes

### Option 2: Runtime JavaScript Injection
1. Create a client-side script that runs on page load
2. Inject via LibreChat's custom scripts feature or browser extension
3. Dynamically load the core instructions service

**Pros**: No fork needed
**Cons**: Hacky, may break with LibreChat updates

### Option 3: Wait for LibreChat Plugin System
LibreChat is working on a plugin system that would allow this type of extension without forking.

**Pros**: Clean, supported approach
**Cons**: Not yet available

---

## Rollback Instructions

See [ROLLBACK_INFO.md](./ROLLBACK_INFO.md) for detailed rollback procedures.

**Quick Rollback**:
```bash
cd /home/neil/dev/Voygent_ai_2
git revert HEAD --no-edit
git push origin master
```

This will revert to deployment **dep-d3fc3nje5dus739l2ev0**.

---

## Changes Made in This Deployment

### Modified Files
1. **`apps/librechat/server/inject-analytics.js`**
   - Added `/api/config/core-instructions` endpoint
   - Serves `core-instructions.md` with proper headers
   - Error handling for 404/500

2. **`apps/librechat/Dockerfile`**
   - Added `COPY config/core-instructions.md`
   - Added COPY commands for 6 frontend implementation files
   - Files placed in standard LibreChat locations

### New Files (Already Existed)
- `apps/librechat/config/core-instructions.md` (8.3KB)
- `apps/librechat/client/src/types/coreInstructions.ts`
- `apps/librechat/client/src/services/CoreInstructionsService.ts`
- `apps/librechat/client/src/utils/storageAdapter.ts`
- `apps/librechat/client/src/utils/instructionToasts.ts`
- `apps/librechat/client/src/hooks/useCoreInstructions.ts`
- `apps/librechat/client/src/commands/voygentCommand.ts`

---

## Deployment Timeline

1. **Commit Changes**: Git commit with feature files
2. **Push to GitHub**: Trigger Render auto-deploy
3. **Build Phase**: ~3-4 minutes (Docker build)
4. **Deploy Phase**: ~1 minute
5. **Health Check**: Render verifies `/api/health` endpoint
6. **Live**: New deployment active

**Expected Total Time**: 4-5 minutes

---

## Monitoring

### Health Checks
```bash
# Main health check
curl https://voygent-librechat.onrender.com/api/health

# Analytics health (includes core instructions status)
curl https://voygent-librechat.onrender.com/api/analytics/health

# Core instructions endpoint
curl -I https://voygent-librechat.onrender.com/api/config/core-instructions
```

### Logs to Watch
- Check Render logs for: "✅ Analytics middleware and core instructions endpoint attached to Express app"
- No errors about missing `core-instructions.md` file
- No 500 errors on `/api/config/core-instructions` requests

---

## Known Limitations

1. **Frontend Not Integrated**: Files are in container but not used by React app
2. **Manual Testing Required**: `/voygent` command won't work until frontend integration complete
3. **No Automatic Loading**: Instructions won't load on startup

---

## Future Work

To complete T024 (Manual Validation), we need to:

1. **Choose Integration Approach**: Fork LibreChat or wait for plugin system
2. **Modify App.tsx**: Add useCoreInstructions hook
3. **Register Command**: Wire up `/voygent` command
4. **Test All Scenarios**: Execute 7 manual test scenarios from quickstart.md
5. **Verify Performance**: Check load times meet benchmarks

---

## Questions?

- API working? Check endpoint with curl
- Files missing? Check Dockerfile COPY commands
- Deployment failed? Check Render logs and rollback
- Need full integration? Consider Option 1 (Fork LibreChat)

---

**Status**: Backend ✅ | Frontend ⚠️ (files copied, not integrated)
**Next Action**: Test API endpoint, then decide on frontend integration approach
