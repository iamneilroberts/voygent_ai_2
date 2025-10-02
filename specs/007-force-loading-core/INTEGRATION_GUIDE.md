# Integration Guide: Core Instructions Force Loading

**Feature**: 007-force-loading-core
**Last Updated**: 2025-10-02
**Status**: Ready for Integration

---

## Overview

This guide provides step-by-step instructions for integrating the core instructions force-loading feature into a LibreChat deployment. All implementation files are complete and ready for use.

---

## Prerequisites

- LibreChat instance (deployed or local)
- Node.js ≥18.x
- npm or yarn package manager
- Access to modify LibreChat source code

---

## Integration Steps

### Step 1: Copy Implementation Files

Copy all implementation files from this repository to your LibreChat instance:

#### Backend Files

```bash
# API Route
cp apps/librechat/server/routes/config.js \
   <LIBRECHAT_ROOT>/api/server/routes/config.js

# Configuration File
cp apps/librechat/config/core-instructions.md \
   <LIBRECHAT_ROOT>/config/core-instructions.md
```

#### Frontend Files

```bash
# Type Definitions
cp apps/librechat/client/src/types/coreInstructions.ts \
   <LIBRECHAT_ROOT>/client/src/types/coreInstructions.ts

# Services
cp apps/librechat/client/src/services/CoreInstructionsService.ts \
   <LIBRECHAT_ROOT>/client/src/services/CoreInstructionsService.ts

# Utilities
cp apps/librechat/client/src/utils/storageAdapter.ts \
   <LIBRECHAT_ROOT>/client/src/utils/storageAdapter.ts

cp apps/librechat/client/src/utils/instructionToasts.ts \
   <LIBRECHAT_ROOT>/client/src/utils/instructionToasts.ts

# Hooks
cp apps/librechat/client/src/hooks/useCoreInstructions.ts \
   <LIBRECHAT_ROOT>/client/src/hooks/useCoreInstructions.ts

# Commands
cp apps/librechat/client/src/commands/voygentCommand.ts \
   <LIBRECHAT_ROOT>/client/src/commands/voygentCommand.ts
```

---

### Step 2: Register API Route

Edit `<LIBRECHAT_ROOT>/api/server/index.js` (or equivalent Express app file):

```javascript
// Near the top with other route imports
const configRoutes = require('./routes/config');

// In the routes section
app.use('/api/config', configRoutes);
```

**Verify**:
```bash
curl http://localhost:3080/api/config/core-instructions
# Should return Markdown content with 200 status
```

---

### Step 3: Integrate into App Component

Find your main App component (usually `<LIBRECHAT_ROOT>/client/src/App.tsx` or `client/src/index.tsx`).

Add the following imports at the top:

```tsx
import { useCoreInstructions } from './hooks/useCoreInstructions';
import {
  showLoadingToast,
  showSuccessToast,
  showErrorToast,
} from './utils/instructionToasts';
```

Inside your App component function, add this code:

```tsx
function App() {
  // Add core instructions hook
  const { load, state } = useCoreInstructions();

  // Load instructions on app startup
  useEffect(() => {
    let toastId: string | number | undefined;

    const loadInstructions = async () => {
      try {
        // Only show toast for network loads (not cache)
        if (!state.content) {
          toastId = showLoadingToast();
        }

        await load();

        // Show success toast only for initial network load
        if (toastId) {
          showSuccessToast(toastId);
        }
      } catch (error) {
        // Show error toast
        if (toastId) {
          showErrorToast(
            error instanceof Error ? error : new Error('Failed to load'),
            toastId
          );
        } else {
          showErrorToast(
            error instanceof Error ? error : new Error('Failed to load')
          );
        }

        // Don't block app startup on error
        console.error('Failed to load core instructions:', error);
      }
    };

    loadInstructions();
  }, []); // Run once on mount

  // ... rest of your app component
}
```

**Reference**: See [AppIntegration.example.tsx](../../apps/librechat/client/src/AppIntegration.example.tsx) for complete example.

---

### Step 4: Register /voygent Command

Find your command registry initialization (usually in `client/src/commands/index.ts` or similar).

Add the import:

```tsx
import { registerVoygentCommand } from './voygentCommand';
```

In your command initialization function:

```tsx
// During app/command registry initialization
export function initializeCommands(commandRegistry: CommandRegistry) {
  // ... existing command registrations

  // Register /voygent command
  registerVoygentCommand(commandRegistry);
}
```

**Alternative**: If LibreChat auto-discovers commands, ensure the command file is in the correct directory and exports the proper interface.

---

### Step 5: Verify Toast Library Integration

The toast utilities use LibreChat's existing toast service. Verify your toast library is available:

```tsx
// In instructionToasts.ts, check the getToastService() function
// It should match your LibreChat toast implementation

// Common LibreChat patterns:
// - react-toastify: import { toast } from 'react-toastify';
// - Custom toast: import { useToast } from 'client/src/hooks/useToast';
```

If using a different toast library, update `instructionToasts.ts` accordingly.

---

### Step 6: Environment Configuration (Optional)

Add environment variables to `.env` if you want to customize defaults:

```bash
# Optional: Override API endpoint
VITE_CORE_INSTRUCTIONS_ENDPOINT=/api/config/core-instructions

# Optional: Override cache timeout (milliseconds)
VITE_CORE_INSTRUCTIONS_TIMEOUT=5000
```

Then update `CoreInstructionsService.ts` constants to read from `import.meta.env`.

---

### Step 7: Build and Deploy

```bash
# Install dependencies (if new packages needed)
cd <LIBRECHAT_ROOT>
npm install

# Build frontend
cd client
npm run build

# Build backend (if TypeScript)
cd ../api
npm run build

# Start server
npm start
```

---

## Testing Integration

### Manual Test Scenarios

Follow the quickstart guide to test all scenarios:

1. **First-time load (no cache)**
   - Clear browser localStorage
   - Refresh page
   - ✓ Should see loading toast → success toast
   - ✓ localStorage should contain 'voygent-core-instructions'

2. **Subsequent load (with cache)**
   - Refresh page with existing cache
   - ✓ Should load instantly (no toast)
   - ✓ No network request made

3. **Manual reload via /voygent**
   - Type `/voygent` in chat input
   - ✓ Should see loading toast → success toast
   - ✓ Cache timestamp updated

4. **Error handling (network failure)**
   - Disable network or stop server
   - Refresh page or type `/voygent`
   - ✓ Should see error toast with retry instructions
   - ✓ App remains functional

5. **Corrupted cache recovery**
   - Open DevTools Console
   - Run: `localStorage.setItem('voygent-core-instructions', '{invalid')`
   - Refresh page
   - ✓ Should detect corruption, fetch fresh, show success

6. **Missing config file**
   - Rename `config/core-instructions.md` temporarily
   - Refresh page
   - ✓ Should show 404 error toast
   - ✓ App remains functional

7. **Multi-tab behavior**
   - Open two browser tabs
   - Type `/voygent` in tab 1
   - Switch to tab 2 and refresh
   - ✓ Tab 2 should use updated cache

### Automated Test Execution

```bash
# Run all tests
npm test

# Run specific test suites
npm test tests/integration/scenarios/
npm test tests/unit/services/CoreInstructionsService.test.ts

# Run with coverage
npm test -- --coverage

# Expected results:
# ✓ All 12 test files pass
# ✓ Coverage ≥90% for CoreInstructionsService
# ✓ Coverage ≥90% for useCoreInstructions hook
```

---

## Performance Benchmarks

Verify the following performance targets:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| First network load | 100-500ms | DevTools Network tab, check API request time |
| Cache load | 5-50ms | DevTools Console, measure time between page load and success |
| Manual reload | 100-500ms | Same as first load |
| localStorage size | 2-10KB | DevTools Application tab → Storage → Local Storage |

---

## Troubleshooting

### Issue: Toast not appearing

**Solution**: Check toast library integration in `instructionToasts.ts`. Ensure toast service matches LibreChat's implementation.

```tsx
// Debug: Add console.log to verify toast calls
console.log('Toast service:', getToastService());
```

### Issue: API returns 404

**Solution**: Verify config route is registered in server index file and `core-instructions.md` exists.

```bash
# Check file exists
ls -lh config/core-instructions.md

# Check route registration
grep -n "configRoutes" api/server/index.js
```

### Issue: TypeScript errors

**Solution**: Ensure TypeScript types are imported correctly. Check `tsconfig.json` includes the new files.

```bash
# Rebuild TypeScript
npm run build
```

### Issue: localStorage quota exceeded

**Solution**: This is handled gracefully by the storage adapter. Check console for warnings. Instructions will fall back to network-only mode.

### Issue: CORS errors in development

**Solution**: Ensure API endpoint is on same origin or configure CORS headers in `server/routes/config.js`.

---

## Rollback Procedure

If integration causes issues, follow this rollback:

1. **Remove App integration** (Step 3)
   - Remove `useCoreInstructions` hook call
   - Remove `useEffect` for loading
   - Keep the files in place for future use

2. **Unregister command** (Step 4)
   - Comment out `registerVoygentCommand()` call

3. **Keep API route** (Step 2)
   - API route is harmless if not called
   - Can leave in place

4. **Clear user cache**
   - Instruct users to clear localStorage if needed
   - Key: `voygent-core-instructions`

---

## Customization

### Modify Core Instructions Content

Edit `config/core-instructions.md` with your system prompts. The file will be auto-reloaded on server restart or when users type `/voygent`.

### Change Cache Duration

By default, cache never expires until force-refreshed. To add expiration:

```tsx
// In CoreInstructionsService.ts, modify loadInstructions():

const cached = storageAdapter.get(STORAGE_KEY);
if (cached && cached.content) {
  // Check if cache is older than 24 hours
  const cacheAge = Date.now() - cached.cachedAt;
  const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  if (cacheAge < MAX_CACHE_AGE && this.validateContent(cached.content)) {
    // Use cache
  }
}
```

### Add Metrics/Analytics

Track instruction loads:

```tsx
// In CoreInstructionsService.ts, after successful load:

// Send analytics event
if (window.analytics) {
  window.analytics.track('Core Instructions Loaded', {
    source: result.source,
    loadTime: Date.now() - startTime,
  });
}
```

---

## Security Considerations

1. **Content Security**: The `core-instructions.md` file is served with `Content-Type: text/markdown` and caching headers. Ensure the file contains no sensitive data.

2. **localStorage**: Data is stored unencrypted in browser localStorage. Only store non-sensitive configuration.

3. **Cache Control**: The API sets `Cache-Control: public, max-age=3600` for CDN/browser caching. Adjust if needed.

4. **Error Messages**: Error messages are generic to avoid leaking server details. Keep this pattern.

---

## Maintenance

### Updating Core Instructions

1. Edit `config/core-instructions.md`
2. Restart server (or deploy)
3. Users can manually refresh with `/voygent` command
4. Or clear cache: `localStorage.removeItem('voygent-core-instructions')`

### Monitoring

Add monitoring for:
- API endpoint response times
- Error rates (404, 500, timeout)
- Cache hit ratio
- User /voygent command usage

---

## Next Steps After Integration

1. **Run T024 Manual Validation**
   - Execute all 7 scenarios from [quickstart.md](./quickstart.md)
   - Document results

2. **Performance Testing**
   - Verify benchmarks under production load
   - Test with slow network (throttle in DevTools)

3. **User Training**
   - Document `/voygent` command in user guide
   - Add to chat command help menu

4. **Monitoring Setup**
   - Add metrics for instruction load success rate
   - Alert on persistent failures

---

## Support

For issues during integration:

1. Check [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for file locations
2. Review [quickstart.md](./quickstart.md) for test scenarios
3. Check unit tests for expected behavior
4. Review error logs in browser console and server logs

---

## Success Criteria Checklist

After integration, verify:

- [ ] App loads without errors
- [ ] Toast notifications appear on first load
- [ ] `/voygent` command works
- [ ] localStorage contains cached instructions
- [ ] Error handling works (test network failure)
- [ ] All automated tests pass
- [ ] Performance benchmarks met
- [ ] No console errors during normal operation

---

**Integration Complete** ✓

Once all checklist items are verified, the feature is fully integrated and ready for production use.
