# TimelineMergerSystem Implementation

Implementation of timeline merge compatibility checking and merging operations for the multiverse mechanics.

**Spec Reference:** `custom_game_engine/openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md`

**Status:** ✅ Implemented (2026-01-18)

---

## Files Created

### 1. Component: MergeCompatibilityComponent
**Path:** `packages/core/src/components/MergeCompatibilityComponent.ts`

Tracks merge compatibility between universe branches. Attached to timeline_merger ships or universe entities.

**Key Types:**
- `BranchCompatibility` - Compatibility check result (compatible, divergenceScore, conflicts)
- `MergeConflict` - Individual conflict (conflictType, entityId, parentValue, forkValue, resolvable)
- `MergeResult` - Merge operation result (success, mergedUniverseId, conflictsResolved)

**Conflict Types:**
- `agent_state` - Agent exists in both but with different state
- `building_exists` - Building exists in one but not the other
- `item_quantity` - Item has different quantities
- `terrain_difference` - Terrain differs (usually unresolvable)

### 2. Utilities: MergeHelpers
**Path:** `packages/core/src/multiverse/MergeHelpers.ts`

Helper functions for timeline merging operations.

**Functions:**
- `findCommonAncestor()` - Find shared parent of two branches
- `compareAgentStates()` - Deep compare agent components
- `compareAgentSkills()` - Which agent has higher total skills
- `findEntity()` - Find entity by ID in snapshot
- `replaceEntity()` - Replace entity in snapshot
- `addEntity()` - Add entity to snapshot
- `findComponent()` - Find component by type in entity
- `markBranchAsMerged()` - Deactivate merged branches (preserves for time travel)

### 3. System: TimelineMergerSystem
**Path:** `packages/core/src/systems/TimelineMergerSystem.ts`

Manages timeline_merger ships and merge operations.

**Priority:** 95 (after passage traversal, before invasion)
**Throttle:** 100 ticks (5 seconds)

**Key Methods:**
- `checkBranchCompatibility()` - Can two branches merge?
  - Must share common ancestor
  - Divergence must be < 0.3
  - All conflicts must be resolvable
- `findMergeConflicts()` - Find agent_state, building_exists, item_quantity, terrain_difference
- `mergeBranches()` - Create merged universe from two compatible branches
- `resolveConflict()` - Resolve individual conflicts
  - agent_state: take higher skills
  - building_exists: keep building
  - item_quantity: take max
  - terrain_difference: keep branch1 (unresolvable)
- `attemptTimelineMerge()` - Full merge operation for timeline_merger ship

**Ship Requirements:**
- Ship type must be `timeline_merger`
- Crew coherence must be >= 0.75

---

## Integration

### Events Added
**File:** `packages/core/src/events/domains/multiverse.events.ts`

```typescript
'timeline:merge_requested'  // UI or system requests merge
'timeline:merge_started'    // Merge operation started
'timeline:merge_completed'  // Merge succeeded
'timeline:merge_failed'     // Merge failed (incompatibility/coherence)
```

### Component Type Added
**File:** `packages/core/src/types/ComponentType.ts`

```typescript
MergeCompatibility = 'merge_compatibility'
```

### System Registration
**File:** `packages/core/src/systems/registerAllSystems.ts`

```typescript
gameLoop.systemRegistry.register(new TimelineMergerSystem());
```

**Priority:** 95 (between PassageTraversalSystem at 90 and InvasionSystem at 100)

### Exports
**Files:**
- `packages/core/src/components/index.ts` - exports MergeCompatibilityComponent
- `packages/core/src/systems/index.ts` - exports TimelineMergerSystem
- `packages/core/src/multiverse/index.ts` - exports MergeHelpers functions

---

## Merge Rules (from Spec)

### Compatibility Requirements
1. **Common Ancestor:** Branches must share a parent universe
2. **Divergence Threshold:** Divergence score must be < 0.3
3. **Resolvable Conflicts:** All conflicts must be automatically resolvable

### Conflict Resolution
- **agent_state:** Take agent with higher total skill levels
- **building_exists:** Keep building (add if missing)
- **item_quantity:** Take max quantity
- **terrain_difference:** Keep branch1 terrain (unresolvable)

### Merged Universe
- New universe ID generated
- Name: "Branch1 + Branch2 [Merged]"
- Parent ID: Common ancestor
- Original branches marked as merged (not deleted - Conservation of Game Matter)

---

## Usage Example

```typescript
// Check compatibility
const compatibility = timelineMergerSystem.checkBranchCompatibility(
  branch1Snapshot,
  branch2Snapshot
);

if (compatibility.compatible) {
  // Attempt merge with timeline_merger ship
  const result = timelineMergerSystem.attemptTimelineMerge(
    mergerShipComponent,
    branch1Snapshot,
    branch2Snapshot
  );

  if (result.success) {
    console.log(`Merged into universe ${result.mergedUniverseId}`);
    console.log(`Resolved ${result.conflictsResolved} conflicts`);
  }
}
```

---

## Testing Notes

### Build Status
✅ TypeScript compilation passes (no errors in new files)

**Pre-existing errors:** The codebase has existing TypeScript errors unrelated to this implementation. Our files compile cleanly with `--skipLibCheck`.

### Manual Testing Needed
1. Create timeline_merger ship with coherence >= 0.75
2. Create two universe branches with divergence < 0.3
3. Emit `timeline:merge_requested` event
4. Verify merge compatibility check
5. Verify conflict resolution
6. Verify merged universe creation
7. Verify original branches marked as merged

---

## Conservation of Game Matter

**Critical:** Following CLAUDE.md principles, merged branches are **never deleted**.

When branches are merged:
1. New merged universe is created
2. Original branches are marked as `merged`
3. Original snapshots are preserved for:
   - Time travel (can still load old saves)
   - Temporal archaeology (Svetz retrieval ships)
   - Recovery/debugging

**Implementation:** `markBranchAsMerged()` in MergeHelpers.ts

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Component for tracking merge state
- ✅ Helper functions for merge operations
- ✅ System for compatibility checking and merging
- ✅ Event emission for merge lifecycle

### Phase 2 (Future)
- [ ] UI for initiating timeline merges
- [ ] Visualization of divergence scores
- [ ] Preview of merge conflicts before execution
- [ ] Undo/rollback of merges (via time travel)

### Phase 3 (Advanced)
- [ ] Automatic merge suggestions for low-divergence branches
- [ ] Timeline fork prevention via merge incentives
- [ ] Merge conflict resolution strategies (player choice)
- [ ] Cross-multiverse merges (different multiverse instances)

---

## Related Systems

**Dependencies:**
- PassageTraversalSystem (priority 90) - Ships traverse passages
- SpaceshipComponent - timeline_merger ship type and coherence
- UniverseForkMetadata - Divergence tracking and fork metadata
- Persistence types - UniverseSnapshot, VersionedEntity

**Dependent Systems:**
- InvasionSystem (priority 100) - Uses merge mechanics for conquest
- CanonEventSystem - Canon events affect merge compatibility
- DivergenceTrackingSystem - Tracks timeline differences

---

## Documentation References

- **Spec:** `openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md`
- **CLAUDE.md:** Conservation of Game Matter, No Silent Fallbacks
- **ComponentType:** All component types use lowercase_with_underscores
- **System Priority:** 95 (between passage traversal and invasion)

---

**Implementation Date:** 2026-01-18
**Implemented By:** Claude (Sonnet 4.5)
**Status:** Ready for testing
