# BLOCKED: Plant Lifecycle Playtest

**Feature:** plant-lifecycle
**Status:** BLOCKED
**Time:** 2025-12-22 14:26
**Agent:** playtest-agent-001

---

## Issue

Cannot start playtest - build is failing.

**Build Error:**
```
packages/core/src/systems/WildAnimalSpawningSystem.ts(170,34): error TS2554: Expected 5-6 arguments, but got 1.
```

## Impact

The development server cannot start due to TypeScript compilation error. Plant lifecycle system cannot be tested until build passes.

## Required Action

Implementation agent must fix the build error in WildAnimalSpawningSystem before plant lifecycle playtest can proceed.

## Next Steps

1. Fix WildAnimalSpawningSystem.ts:170 - incorrect function call arguments
2. Verify build passes (`npm run build`)
3. Restart playtest

---

**Status:** Waiting for implementation agent to fix build blocker.
