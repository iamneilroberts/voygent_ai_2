# Quickstart: Force Loading Core Instructions

**Feature**: 007-force-loading-core
**Purpose**: Verify that core instructions load automatically on startup and can be manually reloaded via `/voygent` command
**Estimated Time**: 5 minutes

---

## Prerequisites

- [ ] LibreChat application is running locally or in test environment
- [ ] Browser developer tools accessible (for localStorage inspection)
- [ ] Core instructions config file deployed at `apps/librechat/config/core-instructions.md`
- [ ] Feature implementation complete

---

## Test Scenario 1: First-Time Load (No Cache)

**Goal**: Verify automatic loading on fresh browser session

### Setup
1. Open browser developer tools (F12)
2. Navigate to Application → Local Storage → `http://localhost:3080` (or your domain)
3. Delete `voygent-core-instructions` key if it exists
4. Refresh the page

### Expected Behavior
1. ✓ Page loads successfully
2. ✓ Loading toast appears: "Loading Voygent instructions..."
3. ✓ Success toast appears within 1-2 seconds: "✓ Voygent instructions loaded successfully"
4. ✓ Toast auto-dismisses after 3-5 seconds
5. ✓ localStorage now contains `voygent-core-instructions` key
6. ✓ Stored value is valid JSON with `content`, `cachedAt`, `source` fields

### Validation Steps
```javascript
// In browser console:
const stored = localStorage.getItem('voygent-core-instructions');
const data = JSON.parse(stored);

console.assert(data.content.length > 100, 'Content should be substantial');
console.assert(data.source === 'network', 'Source should be network');
console.assert(data.cachedAt > 0, 'CachedAt should be a timestamp');
console.assert(typeof data.content === 'string', 'Content should be string');
```

**Pass Criteria**: All assertions pass, toast notifications displayed correctly

---

## Test Scenario 2: Subsequent Load (With Cache)

**Goal**: Verify fast load from localStorage on page refresh

### Setup
1. Complete Scenario 1 first (cache populated)
2. Note the `cachedAt` timestamp from localStorage
3. Refresh the page

### Expected Behavior
1. ✓ Page loads successfully
2. ✓ NO loading toast appears (cache load is near-instant)
3. ✓ NO success toast appears (silent cache restoration)
4. ✓ Chat functionality available immediately
5. ✓ localStorage `voygent-core-instructions` still present
6. ✓ `cachedAt` timestamp unchanged (cache not refreshed)

### Validation Steps
```javascript
// In browser console before and after refresh:
const before = JSON.parse(localStorage.getItem('voygent-core-instructions'));
// Refresh page
const after = JSON.parse(localStorage.getItem('voygent-core-instructions'));

console.assert(before.cachedAt === after.cachedAt, 'Cache timestamp should be unchanged');
console.assert(before.content === after.content, 'Content should be identical');
```

**Pass Criteria**: Page loads instantly, no network request made, cache preserved

---

## Test Scenario 3: Manual Reload via /voygent Command

**Goal**: Verify `/voygent` command reloads instructions and updates cache

### Setup
1. Complete Scenario 2 (cache populated)
2. Open a new chat or use existing chat
3. Note the current `cachedAt` timestamp from localStorage

### Expected Behavior
1. Type `/voygent` in the chat input
2. Press Enter
3. ✓ Loading toast appears: "Loading Voygent instructions..."
4. ✓ Success toast appears: "✓ Voygent instructions loaded successfully"
5. ✓ Toast auto-dismisses after 3-5 seconds
6. ✓ Message input is cleared (command consumed, not sent as chat)
7. ✓ localStorage `cachedAt` timestamp is updated (newer than before)

### Validation Steps
```javascript
// In browser console:
const before = JSON.parse(localStorage.getItem('voygent-core-instructions'));
// Execute /voygent command
// Wait for success toast
const after = JSON.parse(localStorage.getItem('voygent-core-instructions'));

console.assert(after.cachedAt > before.cachedAt, 'Timestamp should be newer');
console.assert(after.content.length > 100, 'Content reloaded');
console.assert(after.source === 'network', 'Source should be network');
```

**Pass Criteria**: Command reloads instructions, cache updated, toast feedback shown

---

## Test Scenario 4: Error Handling (Network Failure)

**Goal**: Verify graceful degradation when instructions fail to load

### Setup
1. Clear localStorage (`voygent-core-instructions` key)
2. Open browser developer tools → Network tab
3. Set network throttling to "Offline" mode
4. Refresh the page

### Expected Behavior
1. ✓ Page loads successfully (not blocked)
2. ✓ Loading toast appears briefly
3. ✓ Error toast appears: "⚠ Failed to load instructions. Type /voygent to retry"
4. ✓ Error toast persists (does not auto-dismiss)
5. ✓ Chat interface remains functional (can type messages)
6. ✓ localStorage does not contain `voygent-core-instructions` key

### Recovery Test
1. Set network throttling back to "Online"
2. Type `/voygent` in chat
3. ✓ Success toast appears
4. ✓ Instructions now loaded and cached

**Pass Criteria**: App remains functional despite load failure, user can retry

---

## Test Scenario 5: Error Handling (Missing Config File)

**Goal**: Verify error when config file is missing (404)

### Setup
1. Temporarily rename or remove `apps/librechat/config/core-instructions.md`
2. Clear localStorage
3. Restart LibreChat server (if needed for file change)
4. Refresh browser

### Expected Behavior
1. ✓ Page loads successfully
2. ✓ Loading toast appears briefly
3. ✓ Error toast appears with configuration error message
4. ✓ Error toast persists
5. ✓ Chat interface remains functional
6. ✓ Browser console shows 404 error for `/api/config/core-instructions`

### Cleanup
1. Restore `core-instructions.md` file
2. Restart server if needed
3. Verify recovery with `/voygent` command

**Pass Criteria**: Graceful error handling, user notified, app functional

---

## Test Scenario 6: Edge Case - Corrupted localStorage

**Goal**: Verify recovery from corrupted cache data

### Setup
1. Load instructions successfully (cache populated)
2. Open browser developer tools → Application → Local Storage
3. Manually edit `voygent-core-instructions` value to invalid JSON: `{invalid`
4. Refresh the page

### Expected Behavior
1. ✓ Page loads successfully
2. ✓ Loading toast appears (cache parse fails, fetches from network)
3. ✓ Success toast appears (fresh load successful)
4. ✓ localStorage `voygent-core-instructions` now contains valid JSON
5. ✓ Corrupted data overwritten with fresh data

### Validation Steps
```javascript
// After refresh:
const stored = localStorage.getItem('voygent-core-instructions');
try {
  const data = JSON.parse(stored);
  console.assert(data.content && data.cachedAt, 'Valid data structure restored');
  console.log('✓ Corrupted cache recovered successfully');
} catch (e) {
  console.error('✗ Cache still corrupted after recovery attempt');
}
```

**Pass Criteria**: App recovers automatically, fetches fresh data, overwrites bad cache

---

## Test Scenario 7: Multi-Tab Behavior

**Goal**: Verify localStorage sharing across multiple tabs

### Setup
1. Load LibreChat in Tab 1
2. Verify instructions loaded and cached
3. Open LibreChat in Tab 2 (same browser)

### Expected Behavior - Tab 2
1. ✓ Page loads with cached instructions (no loading toast)
2. ✓ Instructions available immediately

### Execute /voygent in Tab 2
1. Type `/voygent` in Tab 2
2. ✓ Instructions reload
3. ✓ localStorage updated

### Check Tab 1
1. Refresh Tab 1
2. ✓ Tab 1 loads updated cache from Tab 2's reload
3. ✓ Timestamps match between tabs

**Pass Criteria**: localStorage shared correctly, both tabs see same cached data

---

## Performance Benchmarks

### Expected Timings

| Operation | Target | Acceptable Range | Failure Threshold |
|-----------|--------|------------------|-------------------|
| First load (network) | 200ms | 100-500ms | >1000ms |
| Cache load (localStorage) | 10ms | 5-50ms | >100ms |
| Manual reload (/voygent) | 200ms | 100-500ms | >1000ms |
| Error detection | 5000ms | 3000-8000ms | >10000ms (timeout) |

### How to Measure
```javascript
// In browser console:
console.time('instruction-load');
// Trigger load (refresh or /voygent)
// Wait for success/error toast
console.timeEnd('instruction-load');
```

**Pass Criteria**: All operations complete within acceptable ranges

---

## Acceptance Checklist

### Must Pass (P0)
- [ ] Automatic load on first visit (no cache)
- [ ] Fast restore from cache on subsequent visits
- [ ] `/voygent` command reloads instructions
- [ ] Error toast shown on network failure
- [ ] App remains functional when load fails
- [ ] Cache persists across page refreshes

### Should Pass (P1)
- [ ] Loading, success, and error toasts all displayed correctly
- [ ] Toast auto-dismiss timing correct (3-5s for success)
- [ ] localStorage structure matches schema
- [ ] Performance within acceptable ranges
- [ ] Corrupted cache recovery works

### Nice to Have (P2)
- [ ] Multi-tab behavior consistent
- [ ] Network tab shows cache hit/miss correctly
- [ ] Console errors are descriptive and actionable

---

## Troubleshooting

### Issue: Instructions not loading
**Check**:
1. Is `core-instructions.md` file present in correct location?
2. Is server route `/api/config/core-instructions` configured?
3. Check browser console for network errors
4. Check server logs for file read errors

### Issue: Cache not persisting
**Check**:
1. Is localStorage enabled in browser?
2. Is storage quota exceeded? (unlikely with 2-4KB data)
3. Is browser in private/incognito mode? (storage cleared on close)
4. Check localStorage in dev tools to confirm write operation

### Issue: /voygent command not working
**Check**:
1. Is command registered in command handler?
2. Check browser console for JS errors
3. Verify command handler is being called (add console.log)
4. Check network tab to confirm fetch request sent

### Issue: Toasts not appearing
**Check**:
1. Is toast library initialized?
2. Check z-index CSS (toast may be hidden behind other elements)
3. Verify toast service is available in component context
4. Check for JS errors that might prevent toast rendering

---

## Success Criteria Summary

✓ **All 7 test scenarios pass**
✓ **All P0 acceptance criteria met**
✓ **Performance benchmarks within range**
✓ **No console errors during normal operation**

---

## Next Steps After Quickstart

1. Run automated test suite (unit + integration tests)
2. Test in production-like environment (staging)
3. Test across different browsers (Chrome, Firefox, Safari, Edge)
4. Test on mobile devices (responsive behavior)
5. Conduct user acceptance testing with real users

---

**Document Version**: 1.0
**Last Updated**: 2025-10-02
**Maintained By**: Voygent Development Team
