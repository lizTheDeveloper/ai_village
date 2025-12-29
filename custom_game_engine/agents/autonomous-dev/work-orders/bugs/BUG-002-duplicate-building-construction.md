# BUG-002: Duplicate Building Construction

**Created:** 2025-12-28
**Status:** 🔴 OPEN
**Priority:** MEDIUM
**Detected In:** Session game_1766914249543_mtj3u7

---

## Summary

Multiple agents are starting construction on the same building type simultaneously, resulting in duplicate buildings being built.

## Observed Behavior

```
Building Progress:
  storage-chest    In Progress: 4    Completed: 2

In-Progress Details:
  storage-chest - started 50s ago (builders: system)
  storage-chest - started 28s ago (builders: system)
  storage-chest - started 28s ago (builders: system)
  storage-chest - started 27s ago (builders: system)

Dashboard Warning:
  [WARNING] Multiple storage-chest in progress (4) - possible duplication issue
```

4 storage chests started within seconds of each other.

## Expected Behavior

When an agent decides to build a storage-chest:
1. Check if one is already in progress
2. If in progress, either help build existing one OR choose different action
3. Only start new building if genuinely needed AND none in progress

## Reproduction

1. Start game with LLM agents
2. Wait for initial storage-box to complete
3. Observe multiple storage-chest constructions starting simultaneously

## Files to Investigate

- `packages/llm/src/StructuredPromptBuilder.ts` - `getAvailableActions()` should filter buildings
- `packages/core/src/systems/BuildingSystem.ts` - Building state tracking
- `packages/core/src/actions/BuildActionHandler.ts` - Build action validation

## Potential Root Causes

1. `getAvailableActions()` not checking for buildings already in construction
2. LLM agents making decisions simultaneously without coordination
3. Building count check only looking at completed buildings, not in-progress

## Acceptance Criteria

- [ ] `getAvailableActions()` excludes buildings already in construction
- [ ] LLM prompt shows buildings currently being constructed
- [ ] Add "help build" option when building in progress needs workers
- [ ] Add test for building deduplication

## Notes

All 4 storage-chests show "system" as builder, suggesting this may be an auto-construction issue rather than agent decision issue. Need to check if the system is auto-spawning buildings.
