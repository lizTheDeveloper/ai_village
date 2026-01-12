# Work Order: Performance Hotspots

**Phase:** Performance (Optimization)
**Created:** 2025-12-28
**Status:** READY_FOR_IMPLEMENTATION

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/agents/autonomous-dev/work-orders/performance-hotspots/spec.md`

---

## Requirements Summary

Fix performance issues that cause frame drops with many entities:

1. Fix BuildingSystem double query of storage buildings
2. Fix GovernanceDataSystem queries inside loops
3. Fix SocialGradientSystem linear search (Array → Set)
4. Fix MovementSystem collision query caching
5. Fix repeated getComponent() calls
6. Fix entity lookup by ID (use Map instead of find)

---

## Acceptance Criteria

### Criterion 1: No Duplicate Queries
- **WHEN:** A system needs entity data
- **THEN:** It SHALL query once and reuse results
- **NOT:** Query inside nested loops

### Criterion 2: O(1) Lookups for Pending Sets
- **WHEN:** Checking if ID is in pending set
- **THEN:** Use `Set.has()` not `Array.includes()`

### Criterion 3: Cached Collision Data
- **WHEN:** Checking building collisions
- **THEN:** Use cached building positions
- **AND:** Invalidate cache on building change events

### Criterion 4: Single-Pass Component Access
- **WHEN:** A function needs multiple components
- **THEN:** Get all at start, not repeatedly

### Criterion 5: Entity Lookup Maps
- **WHEN:** Finding entity by ID
- **THEN:** Use `Map.get()` not `Array.find()`

---

## Files to Modify

### Critical
- `systems/BuildingSystem.ts:650-727` - Double query
- `systems/GovernanceDataSystem.ts:145,191,312` - Loop queries
- `systems/SocialGradientSystem.ts:78,91` - Linear search
- `systems/MovementSystem.ts:201-237` - Collision caching

### Medium
- `systems/MovementSystem.ts:45-66` - Repeated getComponent
- `systems/GovernanceDataSystem.ts:203-204` - Dual filter

---

## Success Definition

1. ✅ BuildingSystem queries storage once per update
2. ✅ GovernanceDataSystem queries agents once, passes to methods
3. ✅ SocialGradientSystem uses Set for pending processing
4. ✅ MovementSystem caches collision data
5. ✅ No system takes >2ms per tick with 100 entities
6. ✅ Build passes: `npm run build`
7. ✅ Tests pass: `npm run test`

---

**End of Work Order**
