# Dead Code Cleanup - Test Verification Plan

**Work Order:** dead-code-cleanup
**Type:** Code Quality (Cleanup)
**Date:** 2025-12-28

---

## Pre-Implementation Verification

### 1. Identify All Usages (Before Deletion)

Before deleting exports, verify they are truly unused:

```bash
# Check ActionDefinitions exports
cd custom_game_engine
grep -r "formatBehaviorExamples" packages/
grep -r "formatInventoryContext" packages/
grep -r "formatMemoryContext" packages/
grep -r "formatRelationshipContext" packages/

# Check SkillContextTemplates exports
grep -r "getConversationContext" packages/
grep -r "getInventoryContext" packages/
grep -r "getRelationshipContext" packages/
```

**Expected:** No imports found (or only in test files that will also be cleaned)

### 2. Baseline Test Run

```bash
cd custom_game_engine
npm test
```

**Record:** Current test count and pass/fail status

### 3. Baseline Build

```bash
npm run build
```

**Expected:** Build succeeds with current warnings/errors recorded

---

## Post-Implementation Verification

### 1. Code Removal Verification

**File: demo/src/main.ts**

```bash
# Verify animal interaction block is gone (lines 2570-2626)
sed -n '2570,2626p' demo/src/main.ts
# Expected: Different content or file is shorter

# Verify duplicate game assignment is gone (lines 2632-2636)
sed -n '2632,2636p' demo/src/main.ts
# Expected: Only ONE (window as any).game assignment exists in entire file
```

**File: packages/llm/src/ActionDefinitions.ts**

```bash
# Verify exports removed
grep "formatBehaviorExamples\|formatInventoryContext\|formatMemoryContext\|formatRelationshipContext" packages/llm/src/ActionDefinitions.ts
# Expected: No matches
```

**File: packages/llm/src/SkillContextTemplates.ts**

```bash
# Verify exports removed
grep "getConversationContext\|getInventoryContext\|getRelationshipContext" packages/llm/src/SkillContextTemplates.ts
# Expected: No matches
```

### 2. Build Verification

```bash
npm run build
```

**Expected:**
- ✅ Build succeeds
- ✅ No new errors introduced
- ✅ Possible reduction in bundle size

### 3. Test Suite Verification

```bash
npm test
```

**Expected:**
- ✅ All existing tests still pass
- ✅ Test count unchanged (no tests should break from cleanup)
- ✅ No new warnings or errors

### 4. Runtime Verification (Manual)

```bash
npm run dev
```

**In browser console:**
- ✅ No new errors
- ✅ Game loads normally
- ✅ `(window as any).game` is accessible (only one definition)

---

## Success Criteria Checklist

- [ ] Lines 2570-2626 deleted from demo/src/main.ts
- [ ] Lines 2632-2636 deleted from demo/src/main.ts
- [ ] Unused ActionDefinitions exports removed (if truly unused)
- [ ] Unused SkillContextTemplates exports removed (if truly unused)
- [ ] `npm run build` passes
- [ ] `npm test` passes with same test count
- [ ] Game runs without new console errors

---

## Notes

**Why no unit tests?**

This is a deletion-only task with no new behavior:
- Deleting dead code doesn't add functionality
- Existing tests verify nothing broke
- Static analysis (grep) verifies deletions
- Build/runtime verify no breakage

**If tests fail after cleanup:**

This indicates the "dead" code was actually used:
1. Identify the failing test
2. Restore the deleted code
3. Update work order spec with the usage
4. Reclassify as "not dead code"

---

**Test Agent Status:** VERIFICATION PLAN COMPLETE

This cleanup work order uses static verification instead of unit tests.
Ready for Implementation Agent.
