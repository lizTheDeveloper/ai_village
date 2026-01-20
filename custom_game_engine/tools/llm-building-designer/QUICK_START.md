# Dimensional Buildings - Quick Start Guide

**Status**: Foundation complete, rendering in progress
**Last Updated**: 2026-01-19

---

## TL;DR

Dimensional buildings (4D/5D/6D) now have **full type support** and **basic visual indicators**. Layout rendering and UI controls are next.

---

## What You Can Do Now

### 1. Define a 4D Building

```typescript
const my4DBuilding: BuildingBlueprint = {
  id: "tesseract_lab",
  name: "4D Research Lab",
  category: "research",
  width: 11,
  height: 11,

  // NEW: Dimensional config
  dimensional: {
    dimension: 4,
    w_axis: {
      layers: 3,
      currentSlice: 0,
      sliceLayouts: [
        // W-slice 0 (outermost)
        [
          "###########",
          "#.........#",
          "#.........#",
          "#.........#",
          "###########"
        ],
        // W-slice 1 (middle)
        [
          "#####...###",
          "#####...###",
          "###.......#",
          "#####...###"
        ],
        // W-slice 2 (innermost - treasure room)
        [
          "###########",
          "#.........#",
          "#....T....#",  // T = treasure
          "#.........#",
          "###########"
        ]
      ]
    }
  }
};
```

### 2. Load Generated Buildings

```typescript
import dimensionalBuildings from '../tools/llm-building-designer/dimensional-buildings-game-format.json';

// Load all High Fae buildings (includes 4D/5D/6D)
for (const building of dimensionalBuildings.high_fae) {
  buildingBlueprintRegistry.register(building);
}

// Or load specific exotic buildings
for (const building of dimensionalBuildings.tesseracts) {
  buildingBlueprintRegistry.register(building);
}
```

### 3. Render Dimensional Indicator

In your renderer:

```typescript
// After rendering building sprite
if (building.dimensional || building.realmPocket) {
  this.buildingRenderer.drawDimensionalIndicator(
    screen.x,
    screen.y,
    entity.id,
    building.dimensional,
    building.realmPocket,
    this.tileSize,
    this.camera.zoom
  );
}
```

Result: Building shows badge like `4D [W1/3]` or `TARDIS [5x5→21x21]`

---

## Available Buildings

13 pre-generated dimensional buildings ready to use:

### Elven (2 × 3D multi-tier)
- `treehouse_elven_2tier` - Living Wood Treehouse
- `crystal_meditationbower_01` - Crystal Meditation Bower

### Centaur (2 × 3D wide open)
- `centaur_meeting_hall_01` - Clan Meeting Hall
- `centaur_training_shelter_01` - Training Grounds Shelter

### Angelic (1 × 3D + 1 × 4D)
- `prayer_spire_01` - Prayer Spire (3 floors)
- `celestial_archives_01` - Celestial Archives (4D library)

### High Fae (4 buildings: 3D pocket + 4D + 5D + 6D)
- `fae_pocket_manor_01` - TARDIS-like (5×5 → 21×21, 0.1× time)
- `folded_manor_01` - 4D impossible geometry
- `chronodream_spire_01` - 5D phase-shifting (4 phases)
- `tesseract_court_01` - 6D quantum superposition (3 states)

### Exotic (2 × 4D + 2 × higher)
- `tesseract_research_01` - 4D research lab
- `tesseract_vault_01` - 4D security vault
- `phaseshifting_temple_01` - 5D temple (morphs through 4 phases)
- `quantum_observatory_01` - 6D observatory (superposition)

---

## API Reference

### BuildingRenderer Methods

```typescript
// Draw dimensional status badge
drawDimensionalIndicator(
  screenX: number,
  screenY: number,
  buildingId: string,
  dimensional?: DimensionalConfig,
  realmPocket?: RealmPocketConfig,
  tileSize?: number,
  zoom?: number
): void

// Change W-slice for 4D building (player control)
setWSlice(buildingId: string, wSlice: number): void

// Update phase for 5D building (auto-animation)
updateVPhase(buildingId: string, gameTick: number, dimensional?: DimensionalConfig): void

// Collapse quantum state for 6D building (observation)
collapseUState(buildingId: string, dimensional?: DimensionalConfig): void
```

### Example: Player Changes W-Slice

```typescript
// When player moves W-slider
const newSlice = parseInt(wSliderInput.value);
renderer.buildingRenderer.setWSlice(selectedBuilding.id, newSlice);
// TODO: Re-render building with new layout from sliceLayouts[newSlice]
```

---

## What Doesn't Work Yet

1. **Layout rendering**: Buildings still show as single sprites, not actual dimensional layouts
2. **UI controls**: No W-slider or Observe button yet
3. **Phase animation**: V-axis phases don't auto-cycle
4. **Realm pockets**: Can't enter interior space

See `DIMENSIONAL_IMPLEMENTATION_GUIDE.md` for implementation details.

---

## Next Steps for Developers

### Priority 1: Layout Rendering (2-4 hours)
Implement `renderBuildingLayout()` in `Renderer.ts` to actually draw sliceLayouts/phaseLayouts.

### Priority 2: UI Controls (1-2 hours)
Create `DimensionalControls.ts` with W-slider, phase indicator, Observe button.

### Priority 3: Phase Animation (1 hour)
Auto-call `updateVPhase()` in render loop for 5D buildings.

---

## Files to Know

- **Types**: `packages/core/src/buildings/BuildingBlueprintRegistry.ts`
- **Rendering**: `packages/renderer/src/entities/BuildingRenderer.ts`
- **Main renderer**: `packages/renderer/src/Renderer.ts` (line 545-582)
- **Generated buildings**: `tools/llm-building-designer/dimensional-buildings-game-format.json`
- **Full guide**: `tools/llm-building-designer/DIMENSIONAL_IMPLEMENTATION_GUIDE.md`
- **Completion report**: `tools/llm-building-designer/COMPLETION_REPORT.md`

---

## Questions?

1. Check `DIMENSIONAL_IMPLEMENTATION_GUIDE.md` for detailed architecture
2. Check `COMPLETION_REPORT.md` for status summary
3. Check `DIMENSIONAL_SYSTEM_STATUS.md` for original requirements
4. Check `packages/magic/src/DimensionalParadigms.ts` for 4D helpers

---

**Status**: Ready for layout rendering implementation
**Risk**: Low - foundation is solid, no breaking changes
**Estimated MVP**: 3-6 hours (layout + UI)
