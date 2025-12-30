# Work Order: Silent Fallback Violations

**Phase:** Code Quality (CLAUDE.md Compliance)
**Created:** 2025-12-28
**Status:** COMPLETED

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/silent-fallback-violations/spec.md`
- **Related:** `CLAUDE.md` (Error Handling section)

---

## Requirements Summary

Per CLAUDE.md: "NEVER use fallback values to mask errors. If data is missing or invalid, crash immediately with a clear error message."

Fix these violations:

1. `NeedsSystem.ts:44` - console.warn + continue → throw
2. `PlantSystem.ts:79` - console.warn + return fallback → throw
3. `MemoryFormationSystem.ts:173-196` - console.error + return → throw

---

## Acceptance Criteria

### Criterion 1: NeedsSystem Throws on Missing Component
- **WHEN:** An entity in NeedsSystem query lacks needs component
- **THEN:** The system SHALL throw with message including entity ID
- **NOT:** Log warning and continue

### Criterion 2: PlantSystem Throws on Unknown Species
- **WHEN:** A plant has an unknown speciesId
- **THEN:** The system SHALL throw with species ID and available options
- **NOT:** Return a fallback species

### Criterion 3: MemoryFormationSystem Throws on Invalid Event
- **WHEN:** A conversation event lacks speakerId or listenerId
- **THEN:** The system SHALL throw with event details
- **NOT:** Silently skip the event

### Criterion 4: Error Messages Are Actionable
- **WHEN:** An error is thrown
- **THEN:** The message SHALL include:
  - What is missing/invalid
  - Where it was expected (entity ID, event type)
  - How to fix it (what to check)

---

## Files to Modify

- `packages/core/src/systems/NeedsSystem.ts` (line 44)
- `packages/core/src/systems/PlantSystem.ts` (line 79)
- `packages/core/src/systems/MemoryFormationSystem.ts` (lines 173-196)
- Add error path tests for each

---

## Success Definition

1. ✅ `NeedsSystem` throws on missing needs component
2. ✅ `PlantSystem` throws on unknown species (no fallback)
3. ✅ `MemoryFormationSystem` throws on invalid event data
4. ✅ Error messages include entity/event context
5. ✅ Tests verify error paths
6. ✅ No `console.warn` + `continue` patterns in core systems
7. ✅ Build passes: `npm run build`
8. ✅ Tests pass: `npm run test`

---

**End of Work Order**
