# Buildings Module

Building definitions, placement validation, and construction blueprints for the game's construction system.

## Overview

Buildings are defined as **blueprints** stored in `BuildingBlueprintRegistry`. The `BuildingSystem` handles construction progress. The `PlacementValidator` validates terrain, collisions, and resource requirements before placement.

## Building Types

**Categories**: `residential`, `production`, `storage`, `commercial`, `community`, `farming`, `research`, `decoration`, `governance`, `religious`

**Tiers**: 1-5 (power level, affects complexity and requirements)

**Specialized Collections**:
- **Standard Voxel Buildings** (`StandardVoxelBuildings.ts`): Multi-tile structures with furniture (houses, workshops, barns)
- **Tile-Based Blueprints** (`TileBasedBlueprintRegistry.ts`): ASCII layout system (`#` = wall, `.` = floor, `D` = door, `W` = window)
- **Temple Buildings** (`TempleBlueprints.ts`): Prayer sites, ritual sites, pilgrimage destinations
- **Farm Buildings** (`FarmBlueprints.ts`): Scarecrows, irrigation, compost bins, greenhouses
- **Shop Buildings** (`ShopBlueprints.ts`): General stores, blacksmiths, taverns
- **Governance Buildings** (`GovernanceBlueprints.ts`): Town halls, census bureaus, archives
- **Automation Buildings** (`AutomationBuildings.ts`): Solar panels, mining drills, assemblers (Phase 38)

## Construction System

1. **Blueprint Selection**: UI queries `BuildingBlueprintRegistry.getByCategory()` or `getUnlocked()`
2. **Placement Validation**: `PlacementValidator.validate()` checks terrain, collisions, resources, rotation
3. **Entity Creation**: `BuildingSystem` creates entity on `building:placement:confirmed` event
4. **Progress Tracking**: Building starts at 0% progress, advances based on `buildTime`, emits `building:complete` at 100%

## Building Effects

Buildings provide **functionality** via `BuildingFunction[]`:

- **`crafting`**: Recipes, crafting speed bonus
- **`storage`**: Item capacity, filtered types
- **`sleeping`**: Rest bonus multiplier
- **`shop`**: Shop type (general, blacksmith, farm_supply, tavern)
- **`research`**: Research fields, speed bonus
- **`mood_aura`**: Mood bonus radius
- **`automation`**: Automated tasks
- **`governance`**: Data collection (demographics, workforce)
- **`prayer_site`**: Belief multiplier, domain bonuses
- **`pest_deterrent`**: Farming protection
- **`irrigation`**: Auto-watering

Effects are read by corresponding systems (CraftingSystem, SleepSystem, ShopSystem, ResearchSystem).

## Blueprint Structure

```typescript
interface BuildingBlueprint {
  id: string;
  name: string;
  category: BuildingCategory;
  tier: 1-5;

  // Dimensions
  width: number;
  height: number;

  // Requirements
  resourceCost: { resourceId: string; amountRequired: number }[];
  techRequired: string[];
  terrainRequired: string[];
  terrainForbidden: string[];
  skillRequired?: { skill: string; level: 0-5 };

  // Construction
  buildTime: number; // seconds
  unlocked: boolean;

  // Effects
  functionality: BuildingFunction[];

  // Placement
  canRotate: boolean;
  rotationAngles: number[];

  // Optional: Voxel buildings
  layout?: string[]; // ASCII layout
  materials?: { wall, floor, door };
  floors?: BuildingFloor[]; // Multi-floor
}
```

## Placement Validation

**PlacementValidator** enforces:
- **Terrain**: Must match `terrainRequired`, avoid `terrainForbidden`
- **Collisions**: No overlap with existing buildings
- **Resources**: Sufficient inventory for `resourceCost`
- **Rotation**: Angle in `rotationAngles`
- **Grid Snapping**: `snapToGrid(x, y, tileSize)`

Returns `PlacementValidationResult` with `errors[]` and `warnings[]`.

## Adding New Buildings

1. Create blueprint object in appropriate file (`FarmBlueprints.ts`, etc.)
2. Add to category array (e.g., `FARM_BLUEPRINTS`)
3. Blueprint auto-registers via `BuildingBlueprintRegistry.registerDefaults()`
4. Define `functionality[]` for effects
5. Set `skillRequired` for progressive reveal system

**No registration code needed** - blueprints in exported arrays auto-register on world init.
