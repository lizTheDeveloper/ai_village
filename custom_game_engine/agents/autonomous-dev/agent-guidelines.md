# Autonomous Agent Guidelines

**Created:** 2025-12-26
**Purpose:** Prevent recurring failure patterns across all autonomous agents

---

## Implementation Agent Checklist

Before marking work as complete, verify:

### Component State Management
- [ ] **NO spread operators on components** - Using `{...current}` destroys class prototypes and methods
- [ ] Use prototype-preserving pattern for component updates:
  ```typescript
  // WRONG - loses class methods, causes state bugs
  entity.updateComponent('circadian', (current) => ({
    ...current,
    sleepDrive: newValue,
  }));

  // CORRECT - preserves prototype chain
  entity.updateComponent('circadian', (current) => {
    const updated = Object.create(Object.getPrototypeOf(current));
    Object.assign(updated, current);
    updated.sleepDrive = newValue;
    return updated;
  });
  ```
- [ ] If you modify component state, verify the change persists across frames

### Visual Feedback
- [ ] **Backend state changes MUST have visual representation** - If tilled=true, the tile must look different
- [ ] Check renderer for visual indicators when implementing state changes
- [ ] If no visual exists, flag as part of the work order (not a separate issue)

### Test Infrastructure
- [ ] **Use factory functions, not interfaces** for component creation:
  ```typescript
  // WRONG - AgentComponent is an interface, undefined at runtime
  import { AgentComponent } from '../../components/AgentComponent';
  agent.addComponent(AgentComponent, { name: 'Test' }); // CRASHES

  // CORRECT - use factory functions
  import { createAgentComponent } from '../../components/AgentComponent';
  agent.addComponent(createAgentComponent('wander'));
  ```
- [ ] Verify mock world objects have `getEntity()` method if panels use it
- [ ] Run tests before AND after changes: `npm test`

### CLAUDE.md Compliance (existing)
- [ ] No silent fallbacks
- [ ] Throw on invalid input with clear messages
- [ ] Run build: `npm run build`

---

## Playtest Agent Checklist

Before reporting a feature as "NOT_IMPLEMENTED":

### Verify Test Conditions
- [ ] **Check weather/autonomic overrides** - Cold weather triggers SEEK_WARMTH, masking other behaviors
- [ ] **Check agent priorities** - Food/warmth/sleep take precedence over most behaviors
- [ ] **Minimum test duration by feature type:**
  | Feature Type | Minimum Duration |
  |--------------|------------------|
  | Sleep/circadian | 24+ game hours |
  | Gathering/inventory | 4+ game hours |
  | Autonomous decisions | 10+ game hours |
  | Immediate actions (till, build) | Can test immediately |
- [ ] **Time skip if needed** - Use Shift+2 to advance days for long-cycle behaviors

### Before Claiming Feature Missing
- [ ] Search code for the behavior: `grep -r "behavior_name" packages/`
- [ ] Check console logs for related events (e.g., "seed:gathered", "deposit_items")
- [ ] Query game state via `window.__gameTest` API
- [ ] If feature exists in code but didn't trigger, report as "CONDITIONS_NOT_MET" not "NOT_IMPLEMENTED"

### Canvas UI Limitations
- [ ] Canvas-rendered UI (build menu tabs, etc.) cannot be clicked by Playwright
- [ ] Use `window.__gameTest.blueprintRegistry.getAll()` to verify data
- [ ] Use `window.__gameTest.placementUI.selectBuilding('id')` to programmatically select
- [ ] Report UI verification separately from backend verification

### Report Format
When a feature doesn't work as expected, include:
1. **Test conditions** (weather, time of day, agent state)
2. **Console logs** showing what DID happen
3. **Duration tested** (game hours, not real minutes)
4. **Autonomic state** (was agent overridden by sleep/warmth/hunger?)

---

## Review Agent Checklist

### Critical Pattern Checks

#### Component Updates
- [ ] **Grep for spread operators in updateComponent calls:**
  ```bash
  grep -n "updateComponent.*{\.\.\.current" packages/
  ```
- [ ] Any matches are POTENTIAL BUGS - verify prototype preservation

#### Test Setup Patterns
- [ ] **Check test files import factory functions, not interfaces:**
  ```bash
  grep -n "import { \w*Component }" packages/**/__tests__/*.ts
  ```
- [ ] Verify imports like `createAgentComponent`, `createInventoryComponent`

#### Visual State Sync
- [ ] If implementation adds boolean state (tilled, sleeping, etc.), verify renderer checks it
- [ ] Search renderer for corresponding visual:
  ```bash
  grep -n "tilled\|isSleeping\|stateName" packages/renderer/
  ```

### Existing Checks (from CLAUDE.md)
- [ ] No silent fallbacks (`|| defaultValue` or `?? defaultValue` for required fields)
- [ ] No `any` types in production code
- [ ] All errors throw with context
- [ ] Build passes
- [ ] Tests pass

---

## Common Failure Patterns Reference

### Pattern 1: Component State Lost
**Symptom:** Value set in one system, but reads as old value in another
**Cause:** Spread operator creating plain object, losing class prototype
**Fix:** Use `Object.create(Object.getPrototypeOf(current))` pattern

### Pattern 2: Test Infrastructure Mismatch
**Symptom:** Tests fail with "Cannot read properties of undefined (reading 'type')"
**Cause:** Importing interface as class, or mock missing required methods
**Fix:** Use factory functions (`createXxxComponent`), add `getEntity()` to mock world

### Pattern 3: Playtest Conditions Masking Feature
**Symptom:** Feature reported as "not working" but code exists
**Cause:** Autonomic overrides (weather, hunger, sleep) taking precedence
**Fix:** Test under controlled conditions, longer duration, or skip time forward

### Pattern 4: Missing Visual Feedback
**Symptom:** Backend works (console shows events) but no visual change
**Cause:** Renderer doesn't check new state property
**Fix:** Add visual indicator in renderer, not just backend state

### Pattern 5: Insufficient Test Duration
**Symptom:** "Never observed" behavior that requires time to trigger
**Cause:** Testing 2 hours when behavior needs 10+ hours to manifest
**Fix:** Establish minimum test durations per feature type (see table above)

---

## Quick Reference Commands

```bash
# Check for spread operator bugs in component updates
grep -rn "updateComponent.*{\.\.\.current" packages/core/src/

# Check for interface imports in tests (should be factory functions)
grep -rn "import { \w*Component }" packages/**/__tests__/*.ts

# Verify visual representation exists for state
grep -rn "\.tilled\|\.isSleeping" packages/renderer/

# Run full test suite
cd custom_game_engine && npm test

# Run build
cd custom_game_engine && npm run build
```

---

**Last Updated:** 2025-12-26
**Based on:** Analysis of recurring failures in work orders from 2025-12-22 through 2025-12-26
