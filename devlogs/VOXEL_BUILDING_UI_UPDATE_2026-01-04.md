# Voxel Building UI Update - 2026-01-04

## Summary

Updated the DevPanel spawn building UI to use the tile-based voxel blueprint system with click-to-place functionality. Replaced the old BuildingComponent system with TileBasedBlueprintRegistry and added support for both blueprint placement (for agents to build) and instant fully-built placement.

## Changes Made

### 1. DevPanel.ts - UI and Placement Logic

**Imports Updated:**
- Removed: `BuildingType`, `createBuildingComponent`, `createEntityId`, `createPositionComponent`, etc.
- Added: `getTileBasedBlueprintRegistry`, `parseLayout`, `WallMaterial`, `DoorMaterial`, `WindowMaterial`

**New State Fields:**
```typescript
private clickToPlaceMode = false;
private selectedBlueprintId: string | null = null;
private placeAsBlueprint = true; // true = blueprint, false = instant build
```

**Updated renderBuildingsSection():**
- Replaced "SPAWN BUILDING" header with "PLACE BUILDING"
- Removed X/Y coordinate sliders
- Added mode toggle: "Blueprint" vs "Instant" buttons
- Added click-to-place status display with cancel button
- Replaced old BuildingType buttons with tile blueprint buttons:
  - tile_small_house (3×3)
  - tile_medium_house (5×4)
  - tile_workshop (4×4)
  - tile_storage_shed (3×2)
  - tile_barn (6×5)
  - tile_stone_house
  - tile_guard_tower
  - tile_longhouse

**New Methods:**
- `isClickToPlaceActive()`: Public method for main renderer to check if in click-to-place mode
- `handleWorldClick(worldX, worldY)`: Public method called by main renderer when user clicks on game world
- `placeBlueprintForConstruction(worldX, worldY)`: Creates construction task via TileConstructionSystem for agents to build
- `placeFullyBuiltBuilding(worldX, worldY)`: Instantly places all tiles without construction phase
- `getWallInsulation(material)`: Helper for wall insulation values

**Updated executeAction():**
- Added handlers for `toggle_blueprint_mode_true` and `toggle_blueprint_mode_false`
- Added handler for `select_blueprint_*` actions
- Added handler for `cancel_blueprint_placement`
- Removed old `spawn_building_*` handler

**Removed:**
- `spawnBuilding(buildingType)` method (old BuildingComponent system)

### 2. main.ts - Click Handler Integration

**Updated handleMouseClick():**
Added DevPanel click-to-place check before placement UI:
```typescript
// DevPanel click-to-place mode
if (devPanel.isClickToPlaceActive() && button === 0) {
  const worldPos = renderer.screenToWorld(screenX, screenY);
  if (devPanel.handleWorldClick(worldPos.x, worldPos.y)) {
    return true;
  }
}
```

## How It Works

### User Workflow

1. **Open Dev Panel** → Go to "Buildings" tab
2. **Choose Mode:**
   - **Blueprint**: Agents will construct the building over time
   - **Instant**: Building appears fully built immediately
3. **Select Blueprint:** Click on any blueprint button (e.g., "Small House")
4. **Place Building:** Click anywhere on the game world to place
5. **Cancel (Optional):** Click "Cancel Placement" to exit click-to-place mode

### Blueprint Mode (placeAsBlueprint = true)

1. User clicks on game world
2. `DevPanel.placeBlueprintForConstruction()` is called
3. Gets `TileConstructionSystem` from world
4. Calls `tileConstructionSystem.createTask()` with blueprint ID and coordinates
5. Calls `tileConstructionSystem.startTask()` to mark tiles as needing construction
6. Agents with building skills will now construct the building tile-by-tile

### Instant Mode (placeAsBlueprint = false)

1. User clicks on game world
2. `DevPanel.placeFullyBuiltBuilding()` is called
3. Gets blueprint from `TileBasedBlueprintRegistry`
4. Parses layout with `parseLayout()` to get all tile positions
5. For each tile, directly sets `world.getTileAt(x, y).wall/door/window/floor`
6. Building appears instantly without construction phase

## Technical Details

### Tile Placement

Fully-built buildings directly modify world tiles:
- **Walls**: Set `tile.wall` with material, condition, insulation, constructedAt
- **Doors**: Set `tile.door` with material, state, constructedAt
- **Windows**: Set `tile.window` with material, condition, lightsThrough, constructedAt
- **Floors**: Set `tile.floor` with material ID

### Blueprint Placement

Blueprint mode creates a `ConstructionTask`:
```typescript
{
  id: string,
  blueprintId: string,
  originPosition: { x, y },
  rotation: number,
  tiles: ConstructionTile[],
  state: 'planned' | 'in_progress' | 'completed',
  activeBuilders: Set<string>,
  createdBy?: string,
}
```

Agents will:
1. Detect the construction task
2. Assign themselves as builders
3. Deliver materials to each tile
4. Build each tile when materials are ready

## Files Modified

- `packages/renderer/src/DevPanel.ts`
- `demo/src/main.ts`

## Bug Fixes

### 1. TypeError: renderer.screenToWorld is not a function

**Issue**: Called `renderer.screenToWorld()` but the method is on the Camera object, not the Renderer.

**Fix**: Changed to `renderer.getCamera().screenToWorld(screenX, screenY)` in main.ts:2466

### 2. Unknown building type: Workbench warning

**Issue**: LLMDecisionProcessor still references old BuildingType enum ("Workbench", etc.) when agents plan buildings.

**Status**: Expected warning during transition period. The code gracefully handles this by:
- Logging warning: `[LLMDecisionProcessor] Unknown building type: ${build.buildingType}`
- Removing the invalid build from agent's queue
- This prevents crashes while old building plans are still in agents' decision queues

**Future**: Update LLMDecisionProcessor to use tile blueprints instead of old BuildingType enum

## Testing

1. **Build passed**: `npm run build` ✓
2. **Manual testing needed:**
   - Start game: `./start.sh`
   - Open Dev Panel
   - Test blueprint mode: Select "Small House" → Click on map → Verify construction task created
   - Test instant mode: Toggle to "Instant" → Select "Workshop" → Click on map → Verify building appears immediately
   - Test cancel: Select blueprint → Click "Cancel Placement" → Verify mode exits
   - Test mode toggle: Switch between Blueprint and Instant modes

## Known Limitations

1. **No rotation UI yet**: Buildings are always placed at 0° rotation (can be added later)
2. **No material selection UI**: Uses blueprint default materials (wood, stone, etc.)
3. **No validation preview**: No visual preview of where building will be placed before clicking
4. **X/Y sliders removed**: Agent spawning still uses sliders in Agents tab (intentional)

## Future Enhancements

- [ ] Add rotation controls (0°, 90°, 180°, 270°)
- [ ] Add material selection dropdown
- [ ] Add placement preview ghost/outline
- [ ] Add validation indicators (red/green for valid/invalid placement)
- [ ] Add undo/redo for building placement
- [ ] Add blueprint cost display
- [ ] Add tech requirements indicator
