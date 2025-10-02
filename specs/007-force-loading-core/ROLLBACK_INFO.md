# Rollback Information for Deployment

**Date**: 2025-10-02
**Feature**: 007-force-loading-core

---

## Current Production Deployment (BEFORE Integration)

**Service**: voygent-librechat
**Service ID**: srv-d3egukvfte5s73cihpl0
**URL**: https://voygent-librechat.onrender.com
**Region**: Oregon
**Plan**: Starter

### Live Deployment Details

**Deployment ID**: dep-d3fc3nje5dus739l2ev0
**Status**: live
**Commit**: b4051931a581653fbcbb23c30c803b2d526b4db3
**Commit Message**: fix(analytics): attach middleware + session routes via express monkey-patch; use analytics-hook to ensure sessions/interactions tracked
**Deployed At**: 2025-10-02T18:22:39.417151Z
**Trigger**: API

### Service Configuration

- **Branch**: master
- **Repository**: https://github.com/iamneilroberts/voygent_ai_2
- **Docker Context**: ./apps/librechat
- **Dockerfile Path**: ./apps/librechat/Dockerfile
- **Auto Deploy**: yes
- **Health Check Path**: /api/health
- **Port**: 3080
- **Disk**: dsk-d3egul7fte5s73cihq30 (1GB at /app/client/public/images/uploads)

---

## Rollback Procedure

If the new deployment causes issues, follow these steps:

### Option 1: Rollback via Render Dashboard
1. Go to https://dashboard.render.com/web/srv-d3egukvfte5s73cihpl0
2. Click "Manual Deploy" dropdown
3. Select deployment ID: **dep-d3fc3nje5dus739l2ev0**
4. Click "Deploy"
5. Wait for deployment to complete (~4-5 minutes)

### Option 2: Rollback via Git
```bash
cd /home/neil/dev/Voygent_ai_2

# Revert to previous commit
git revert HEAD --no-edit

# Push to trigger auto-deploy
git push origin master
```

### Option 3: Rollback Specific Files (Surgical)
If only the core instructions feature is problematic:

```bash
cd /home/neil/dev/Voygent_ai_2

# Remove integration from App component
git checkout HEAD~1 -- apps/librechat/client/src/App.tsx

# Or remove just the feature files
rm -rf apps/librechat/client/src/types/coreInstructions.ts
rm -rf apps/librechat/client/src/services/CoreInstructionsService.ts
rm -rf apps/librechat/client/src/utils/storageAdapter.ts
rm -rf apps/librechat/client/src/utils/instructionToasts.ts
rm -rf apps/librechat/client/src/hooks/useCoreInstructions.ts
rm -rf apps/librechat/client/src/commands/voygentCommand.ts
rm -rf apps/librechat/server/routes/config.js
rm -rf apps/librechat/config/core-instructions.md

# Commit and push
git add -A
git commit -m "rollback: Remove core instructions feature"
git push origin master
```

---

## Previous Deployments (Last 5)

1. **dep-d3fc3nje5dus739l2ev0** (CURRENT - LIVE)
   - Commit: b4051931a581653fbcbb23c30c803b2d526b4db3
   - Status: live
   - Deployed: 2025-10-02T18:22:39Z

2. **dep-d3f8tpemcj7s73de4fhg** (deactivated)
   - Commit: b4051931a581653fbcbb23c30c803b2d526b4db3
   - Status: deactivated
   - Deployed: 2025-10-02T14:43:59Z

3. **dep-d3f8hi4ttd3c73flpb8g** (deactivated)
   - Commit: 0763375aabc569783916f1795e51052b5d12e9d2
   - Status: deactivated
   - Deployed: 2025-10-02T14:19:40Z

4. **dep-d3f8gj9r0fns73dctg10** (deactivated)
   - Commit: 8705c369c5811fe8059607c5731bfff73a160534
   - Status: deactivated
   - Deployed: 2025-10-02T14:16:15Z

5. **dep-d3f8bmur433s73aqsnp0** (deactivated)
   - Commit: 8705c369c5811fe8059607c5731bfff73a160534
   - Status: deactivated
   - Deployed: 2025-10-02T14:06:13Z

---

## Health Check

After rollback, verify service health:

```bash
# Check health endpoint
curl https://voygent-librechat.onrender.com/api/health

# Expected response: 200 OK with health status
```

---

## Monitoring

Watch for these issues that might require rollback:

1. **App won't load** - Check browser console for errors
2. **API errors** - Check Render logs for 500 errors
3. **Performance degradation** - Monitor response times
4. **Toast notifications broken** - UI feedback not appearing
5. **localStorage errors** - Quota exceeded warnings

---

## Contact

If rollback needed, document:
- What broke?
- Error messages (browser console and server logs)
- Steps to reproduce
- Deployment ID that failed

---

**Saved**: 2025-10-02
**By**: Claude Code Integration Process
