# Work Order: Component Update Utility

**Phase:** Infrastructure (Critical Bug Prevention)
**Created:** 2025-12-26
**Priority:** HIGH
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

The codebase has a recurring critical bug pattern: using JavaScript spread operators (`{...current}`) when updating component state destroys the class prototype chain, causing:
- Class methods to become unavailable
- Component state changes to be silently lost
- Bugs that are extremely difficult to diagnose (values appear correct but don't persist)

**Example from sleep system (took 5+ iterations to fix):**
```typescript
// This LOSES the CircadianComponent class methods and breaks state updates
entity.updateComponent('circadian', (current) => ({
  ...current,
  sleepDrive: newValue,  // This value gets lost next frame!
}));
```

---

## Requirements

### R1: Create safeUpdateComponent Utility
Create a type-safe utility function that preserves component prototypes:

```typescript
// packages/core/src/utils/componentUtils.ts
export function safeUpdateComponent<T extends ComponentBase>(
  entity: Entity,
  componentType: string,
  updater: (current: T) => Partial<T>
): void {
  entity.updateComponent(componentType, (current: T) => {
    const updated = Object.create(Object.getPrototypeOf(current));
    Object.assign(updated, current);
    const changes = updater(current);
    Object.assign(updated, changes);
    return updated;
  });
}
```

### R2: Update Existing Code
Find and replace all instances of the dangerous pattern in:
- `packages/core/src/systems/SleepSystem.ts`
- `packages/core/src/systems/AISystem.ts`
- Any other files using `updateComponent` with spread operators

### R3: Add ESLint Rule (Optional but Recommended)
Consider adding a custom ESLint rule or grep check to CI that flags:
```regex
updateComponent.*\{\s*\.\.\.current
```

---

## Acceptance Criteria

### Criterion 1: Utility Function Exists
- **WHEN:** A developer needs to update component state
- **THEN:** They can use `safeUpdateComponent()` from `packages/core/src/utils/componentUtils.ts`
- **Verification:** Import and call works, TypeScript types are correct

### Criterion 2: Prototype Preservation Verified
- **WHEN:** `safeUpdateComponent()` is called on a component with class methods
- **THEN:** The returned component still has all original methods
- **Verification:** Unit test calling a method on updated component

### Criterion 3: State Persistence Verified
- **WHEN:** A component value is updated via `safeUpdateComponent()`
- **THEN:** The value persists across multiple update cycles
- **Verification:** Integration test with multiple frames

### Criterion 4: Existing Dangerous Patterns Fixed
- **WHEN:** Running `grep -rn "updateComponent.*{\.\.\.current" packages/core/`
- **THEN:** Zero matches found
- **Verification:** Grep returns empty

### Criterion 5: Tests Pass
- **WHEN:** Running `npm test`
- **THEN:** All tests pass, including new utility tests
- **Verification:** CI green

---

## Files to Create

- `packages/core/src/utils/componentUtils.ts` - The utility function
- `packages/core/src/utils/__tests__/componentUtils.test.ts` - Unit tests

## Files to Modify

Based on current codebase analysis, at minimum:
- `packages/core/src/systems/SleepSystem.ts` (lines 81-87, 141-152, 259-268)
- `packages/core/src/systems/AISystem.ts` (lines 1414-1423, 1466-1475, 1516-1525)

Run this to find all affected files:
```bash
grep -rn "updateComponent" packages/core/src/systems/ | grep -v test
```

---

## Implementation Notes

### Why Object.create + Object.assign?

```typescript
// Step 1: Create new object with SAME prototype as original
const updated = Object.create(Object.getPrototypeOf(current));
// Now: updated instanceof CircadianComponent === true
// Now: updated.shouldSeekSleep() is a valid method call

// Step 2: Copy all properties from original
Object.assign(updated, current);
// Now: updated has all the same values as current

// Step 3: Apply changes
updated.sleepDrive = newValue;
// Now: updated has the new value AND the class methods
```

### Why NOT Spread Operator?

```typescript
const updated = { ...current };
// Result: updated is a PLAIN OBJECT
// Result: updated instanceof CircadianComponent === false
// Result: updated.shouldSeekSleep === undefined
// Result: Any code that calls class methods will BREAK
```

---

## Testing Checklist

- [ ] `safeUpdateComponent` preserves prototype chain
- [ ] Class methods still callable after update
- [ ] State changes persist across multiple frames
- [ ] TypeScript types are correct (generic type inference works)
- [ ] Build passes: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Grep for dangerous pattern returns zero matches

---

## Notes for Implementation Agent

1. **Start with the utility** - Create and test `safeUpdateComponent` first
2. **Find all usages** - Use grep to find every `updateComponent` call
3. **Prioritize systems** - Fix SleepSystem and AISystem first (known affected)
4. **Verify each fix** - Run tests after each file change
5. **Don't just find-replace** - Some uses may be correct (e.g., plain object components)

---

## Notes for Review Agent

1. **Verify no spread patterns remain** - Run the grep check
2. **Check prototype preservation** - Review the utility implementation
3. **Test integration** - Run full test suite
4. **Check for new usages** - Future code should use the utility

---

## Success Metrics

This work order is COMPLETE when:

1. ✅ `safeUpdateComponent` utility exists and is exported
2. ✅ Utility has unit tests verifying prototype preservation
3. ✅ All existing `{...current}` patterns in updateComponent are replaced
4. ✅ `grep -rn "updateComponent.*{\.\.\.current" packages/` returns empty
5. ✅ Build passes
6. ✅ All tests pass
7. ✅ Sleep system still works correctly (regression test)

---

**Estimated Complexity:** MEDIUM (utility is small, finding all usages takes time)
**Estimated Time:** 2-4 hours
**Priority:** HIGH (prevents recurring critical bugs)
