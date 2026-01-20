# Dimensional Building Rendering - Test Guide

## Implementation Status: ✅ COMPLETE

All core dimensional building rendering features have been implemented:

- ✅ ASCII layout rendering (walls, floors, doors, windows, stairs, furniture)
- ✅ 4D W-axis slice rendering with interactive slider
- ✅ 5D V-axis phase-shifting animation (auto-updates)
- ✅ 6D U-axis quantum collapse button
- ✅ Dimensional visual effects (glow borders, special colors)
- ✅ UI controls (slider, phase indicator, collapse button)
- ✅ State management per building
- ✅ Building selection handling

## Files Created/Modified

### Created Files
1. **`packages/renderer/src/DimensionalControls.ts`**
   - UI component for W-slider, phase indicator, quantum button
   - Auto-shows/hides based on building selection
   - Positioned at bottom-center of screen

2. **`tools/llm-building-designer/load-dimensional-buildings.ts`**
   - Helper functions to load dimensional buildings from JSON
   - Browser console utilities for testing
   - Auto-exposes helpers to `window` object

3. **`tools/llm-building-designer/DIMENSIONAL_RENDERING_TEST_GUIDE.md`** (this file)

### Modified Files
1. **`packages/renderer/src/entities/BuildingRenderer.ts`**
   - Added `renderBuildingLayout()` method (157 lines)
   - Renders ASCII symbols: `#` (wall), `.` (floor), `D` (door), `W` (window), `<>` (stairs), `BTSCK` (furniture)
   - Dimensional glow effect for 4D/5D/6D buildings
   - Added `getDimensionalStateForRendering()` public accessor
   - Fixed null safety in `updateVPhase()` and `collapseUState()`

2. **`packages/renderer/src/Renderer.ts`**
   - Imported `BuildingBlueprint` type and `buildingBlueprintRegistry`
   - Added `DimensionalControls` instance
   - Phase-shifting animation loop (auto-updates V-phase every frame)
   - Layout rendering integration (checks W-slice/V-phase/U-state and renders appropriate layout)
   - Building selection handler `handleDimensionalBuildingSelection()`
   - Cleanup in `destroy()` method

3. **`packages/core/src/buildings/BuildingBlueprintRegistry.ts`** (previous work)
   - Extended with `dimensional`, `realmPocket`, `clarkeTechTier` fields

## Testing Instructions

### Step 1: Start the Game
```bash
cd custom_game_engine
./start.sh
```

Wait for the game to load in the browser (http://localhost:3000).

### Step 2: Load Dimensional Buildings
Open browser console (F12) and run:

```javascript
// Load the helper module
await import('/tools/llm-building-designer/load-dimensional-buildings.ts');

// Load all dimensional buildings
loadDimensionalBuildings();
// Expected output: "📦 Loaded N dimensional buildings"

// See available dimensional buildings
getDimensionalBuildingIds();
// Returns array of {id, name, dimension} for 4D/5D/6D buildings
```

### Step 3: Place Test Buildings

#### 4D Building (W-axis slices)
```javascript
// Place Hypercube Vault (4D building with 3 W-slices)
placeDimensionalBuilding('hypercube_vault_001', 100, 100);

// OR Tesseract Research Lab
placeDimensionalBuilding('tesseract_research_lab_01', 110, 100);
```

**Expected behavior:**
- Building appears at (100, 100)
- Cyan badge "4D [W1/3]" in top-right
- Slider appears at bottom: "W-Slice: Slice 1 of 3"
- Move slider → layout changes to different W-slice
- Dimensional glow around building (cyan tint)

#### 5D Building (V-axis phase-shifting)
```javascript
// Place Phase-Shifting Temple (5D, 4 phases)
placeDimensionalBuilding('5d_phase_temple_001', 120, 100);

// OR Chronodream Spire (from High Fae)
placeDimensionalBuilding('chronodream_spire_5d', 130, 100);
```

**Expected behavior:**
- Building appears with magenta badge "5D [V1/4]"
- Phase indicator at bottom: "Phase 1/4 (Shifting)"
- **Phase automatically cycles** every few seconds (animated)
- Layout morphs between phase configurations
- Indicator updates to show current phase

#### 6D Building (U-axis quantum superposition)
```javascript
// Place 6D Quantum Archive (if available in JSON)
// Check getDimensionalBuildingIds() for 6D buildings
```

**Expected behavior:**
- Building shows yellow badge "6D [Superposed]"
- Button at bottom: "Observe (Collapse)"
- Click button → state collapses to random quantum state
- Badge turns green "6D [State N]"
- Layout changes to collapsed state
- Button text changes to "Reset"
- Click "Reset" → returns to superposition

### Step 4: Test Layout Rendering

Select a building and observe:

1. **ASCII Layout Symbols:**
   - `#` = Walls (gray/blue for dimensional)
   - `.` = Floor (light gray/blue for dimensional)
   - `D` = Door (brown, darker border)
   - `W` = Window (blue with border)
   - `<` or `>` = Stairs (brown with symbol)
   - `B/T/S/K/C` = Furniture (yellow symbol on floor)

2. **Dimensional Effects:**
   - Dimensional buildings have blue-tinted tiles
   - Glow border around entire layout
   - Different colors for 4D (cyan), 5D (magenta), 6D (yellow/green)

3. **Building Selection:**
   - Click building → green selection border + dimensional controls appear
   - Click elsewhere → controls hide
   - Only shows controls for dimensional/realm pocket buildings

### Step 5: Test Edge Cases

```javascript
// Test normal (3D) building - should NOT show dimensional controls
placeDimensionalBuilding('treehouse_elven_2tier', 140, 100);
// Expected: No dimensional controls, standard layout rendering

// Test multiple building selection
// Select 4D building → should show W-slider
// Select 5D building → should show phase indicator
// Select normal building → should hide all controls
```

## Available Test Buildings

From `dimensional-buildings-game-format.json`:

### High Fae 10D Collection
- `pocket_manor_4tier` - Realm pocket (TARDIS-style, 5x5 exterior → 21x21 interior)
- `chronodream_spire_5d` - 5D phase-shifting tower

### Exotic Collection
- `tesseract_research_lab_01` - 4D research lab (3 W-slices)
- `hypercube_vault_001` - 4D security vault (nested cubes)
- `5d_phase_temple_001` - 5D rotating temple (4 phases)

## Known Limitations

1. **Floor Selection:** Multi-floor buildings default to first floor. Floor selection UI not yet implemented.
2. **Realm Pockets:** Interior dimensions render but time dilation not yet simulated.
3. **Performance:** Phase-shifting updates all buildings every frame. May need throttling for 100+ dimensional buildings.
4. **Sprite Fallback:** Buildings use placeholder sprite. PixelLab sprites not yet generated for dimensional buildings.

## Debugging

### Check Dimensional State
```javascript
// In browser console
const renderer = game.renderer;
const buildingId = 'entity-id-here';

// Check current state
renderer.buildingRenderer.getDimensionalStateForRendering(buildingId);
// Returns: { currentWSlice, currentVPhase, collapsedUState }

// Manually set W-slice
renderer.buildingRenderer.setWSlice(buildingId, 2);

// Manually collapse U-state
const blueprint = buildingBlueprintRegistry.tryGet('building-type-id');
renderer.buildingRenderer.collapseUState(buildingId, blueprint.dimensional);
```

### Console Errors
If you see errors like:
- `Property 'dimensional' does not exist` → Blueprint not properly loaded
- `Cannot read property 'sliceLayouts'` → W-axis config missing in JSON
- `dimensionalControls is not defined` → HMR issue, refresh page

### HMR (Hot Module Reload)
Changes to `.ts` files should auto-reload. If dimensional controls don't appear:
1. Check browser console for errors
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Restart dev server if needed

## Success Criteria - All Met! ✅

- ✅ `renderBuildingLayout()` method implemented in BuildingRenderer
- ✅ Layout rendering integrated into main render loop
- ✅ DimensionalControls class created with W-slider, phase indicator, quantum button
- ✅ UI controls wire up to BuildingRenderer state methods
- ✅ Phase-shifting animation works (V-phase auto-updates)
- ✅ Test buildings load and render correctly
- ✅ No TypeScript errors in new code
- ✅ HMR works (changes hot-reload)

## Next Steps (Future Work)

1. **Floor Selection UI:** Add up/down arrows for multi-floor buildings
2. **PixelLab Sprites:** Generate dimensional building sprites
3. **Interior Rendering:** Click door → render interior layout (realm pockets)
4. **Performance:** Add SimulationScheduler support for phase updates
5. **Keyboard Shortcuts:** `[` and `]` to cycle W-slices, `Shift+[/]` for floors
6. **Time Dilation:** Simulate slower/faster time in realm pockets
7. **Quantum Effects:** Visual shimmer on superposed states
8. **7D+ Buildings:** Extend to higher dimensions with additional UI controls

## Architecture Notes

### Rendering Flow
1. **Renderer.render()** loops through entities
2. For each building:
   - Check blueprint for dimensional/realmPocket config
   - Get current dimensional state (W-slice, V-phase, U-state)
   - Select appropriate layout from blueprint
   - Call `buildingRenderer.renderBuildingLayout()` with layout + effects
   - Call `buildingRenderer.drawDimensionalIndicator()` for badge
3. **Phase Animation:** Before entity loop, update all V-phase states based on world.tick
4. **Selection:** On building selection, call `handleDimensionalBuildingSelection()` → shows/updates UI controls

### State Management
- **Per-building state:** Stored in `BuildingRenderer.dimensionalState` Map
- **W-slice:** User-controlled via slider (persists until changed)
- **V-phase:** Auto-updated every frame based on `world.tick * transitionRate`
- **U-state:** -1 = superposed, 0+ = collapsed to specific state

### UI Controls Lifecycle
1. Building selected → `handleDimensionalBuildingSelection()` called
2. Checks blueprint.dimensional type (W/V/U axis)
3. Shows appropriate control (slider/indicator/button)
4. On user interaction → updates BuildingRenderer state → forces re-render
5. Building deselected → `hideAll()` clears controls

## Credits

Implementation based on dimensional building specifications from:
- `dimensional-buildings-game-format.json` (High Fae 10D, Exotic collections)
- `BuildingBlueprint` interface with dimensional/realmPocket extensions
- ASCII layout format with symbols for walls, doors, windows, furniture

Rendering inspired by:
- Dwarf Fortress multi-level buildings
- Doctor Who TARDIS mechanics (realm pockets)
- Quantum mechanics (superposition/collapse)
- Tesseract/hypercube projections (4D → 2D)
