# Soul & Plot System Phase 2: Linking Systems - 2026-01-03

## Summary

Completed Phase 2 of the Soul and Plot Line system, establishing the linking infrastructure between agents, souls, plots, and the timeline/snapshot system. This phase enables:

- **Agent-Soul binding** with influence strength tracking
- **Plot template registry** for reusable narrative arc storage
- **Soul position tracking** in timeline snapshots for proper fork mechanics

## Files Created

### Soul System (`packages/core/src/soul/`)

**SoulLinkComponent.ts**
- Links agent entities to soul entities
- Tracks soul influence strength (0-1) - how much wisdom guides decisions
- Manages incarnation number and primary incarnation status
- Functions: `createSoulLinkComponent`, `increaseSoulInfluence`, `decreaseSoulInfluence`, `shouldSoulInfluence`, `severSoulLink`

**SoulSnapshotUtils.ts**
- Records soul positions at snapshot time for all souls in world
- Validates soul checksums on load to detect corruption
- Integrates with TimelineManager for proper fork mechanics
- Functions: `recordSoulPositions`, `validateSoulPosition`, `getSoulsInSnapshot`, `getSoulPosition`
- Automatically records snapshot waypoints on soul's silver thread

### Plot System (`packages/core/src/plot/`)

**PlotLineRegistry.ts**
- Singleton registry for all plot line templates
- Template registration and lookup by ID, scale, or eligibility criteria
- Plot instantiation with parameter binding
- Eligibility filtering based on wisdom, archetype, interests, learned lessons
- Functions: `registerPlotTemplate`, `getPlotTemplate`, `instantiatePlot`
- Registry stats tracking (total templates, templates by scale)

## Key Design Decisions

### 1. Soul Influence Strength
Soul-agent link has variable influence (0-1):
- **Low influence (0.0-0.3)**: Learning mode - agent makes mistakes, learns lessons
- **Medium influence (0.3-0.7)**: Balanced - wisdom guides but doesn't dominate
- **High influence (0.7-1.0)**: Wisdom-driven - experienced soul guides decisions strongly

Influence changes over time:
- Increases as agent matures and learns lessons
- Decreases with trauma, corruption, or willful ignorance

### 2. Plot Template Registry
Centralized singleton for all plot templates:
- Templates registered once at startup
- Instantiated dynamically for individual souls
- Parameter binding allows template reuse with different values
- Eligibility filtering prevents inappropriate plot assignment

### 3. Soul Snapshot Integration
Every timeline snapshot now records:
- Personal tick for each soul (append-only timeline position)
- Current segment index (which universe they're in)
- Current incarnation (if any)
- Active plot instance IDs
- Wisdom level
- Validation checksum

This enables proper fork mechanics where:
- Personal tick increments on fork (never resets)
- Souls carry their timeline forward to new universe
- Plots can be configured to continue, reset, or suspend on fork

### 4. Validation & Checksums
Simple but effective validation:
- Checksum = hash of `true_name:created_at:personal_ticks:wisdom_level`
- Detects corrupted souls or timeline anomalies
- Prevents personal tick regression
- Optional strict mode can reject corrupted souls

## Integration Points

### With TimelineManager
- `recordSoulPositions()` called during snapshot creation
- Returns Map of soul positions for storage in snapshot metadata
- Automatically records snapshot waypoints on each soul's silver thread
- Enables soul tracing across all snapshots/universes

### With Agent System
- SoulLinkComponent placed on agent entities
- Links to soul entity via soul_id
- Tracks primary incarnation status
- Influence strength affects decision-making weights

### With Plot System
- PlotLineRegistry provides template lookup for assignment systems
- Eligibility filtering integrates with soul wisdom/archetype
- Template instantiation binds parameters for soul-specific plots

## Technical Notes

### Singleton Pattern
PlotLineRegistry uses singleton pattern for global access:
```typescript
export const plotLineRegistry = new PlotLineRegistry();
```
Convenience functions wrap the singleton for cleaner API.

### Entity Queries in SoulSnapshotUtils
Uses world.query() to find:
- All soul entities (with SoulIdentity + SilverThread)
- All agents (with SoulLink) to determine current incarnations
- Efficient ECS queries avoid full entity iteration

### Checksum Algorithm
Simple 32-bit hash converted to base36:
- Fast to compute
- Good enough for validation (not cryptographic)
- Deterministic across platforms

## Build Status
✅ All Phase 2 components compile successfully with no errors
✅ Exported from main components and soul/plot indices
✅ No breaking changes to existing code

## Files Created
- `custom_game_engine/packages/core/src/soul/SoulLinkComponent.ts`
- `custom_game_engine/packages/core/src/soul/SoulSnapshotUtils.ts`
- `custom_game_engine/packages/core/src/plot/PlotLineRegistry.ts`

## Files Modified
- `custom_game_engine/packages/core/src/soul/index.ts` - Added SoulLink and SoulSnapshot exports
- `custom_game_engine/packages/core/src/plot/index.ts` - Added PlotLineRegistry exports

## Next Steps (Phase 3: Soul-Memory Integration)

From WORK_ORDERS.md Phase 3:
- **WO-DREAM-01**: Create SoulConsolidationSystem (runs after MemoryConsolidationSystem)
- **WO-DREAM-02**: Extract significant events during sleep, write to silver thread
- **WO-DREAM-03**: Integrate with existing dream generation
- **WO-DREAM-04**: Queue soul-influenced dreams (past life echoes, wisdom hints)

### Integration with Existing Systems
Phase 3 will connect to:
- `SleepSystem` - triggers soul consolidation after memory consolidation
- `MemoryConsolidationSystem` - provides consolidated memories as input
- Existing dream generation system - adds soul-influenced dream types

## Time Investment

~20 minutes for Phase 2 linking systems.

---

**Status**: ✅ Phase 2 Complete - Linking infrastructure ready for soul-memory integration
