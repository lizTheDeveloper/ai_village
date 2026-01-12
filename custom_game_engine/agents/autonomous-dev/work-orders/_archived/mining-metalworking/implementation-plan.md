# Mining & Metalworking System Implementation Plan

## Overview

Add a mining and metalworking system to the game, including ore deposits that spawn across the map, mining mechanics, and smelting at forges.

## Current State Analysis

### Already Implemented
- **Items**: `iron_ore`, `coal`, `copper_ore`, `gold_ore`, `iron_ingot` defined in `defaultItems.ts`
- **Forge building**: Registered in `BuildingBlueprintRegistry` with recipes for `iron_ingot`, `steel_sword`, etc.
- **GatherBehavior**: Works for any entity with `ResourceComponent` - agents can harvest resources
- **Affordances**: `iron_ore`, `iron_ingot`, `forge` already in `AffordanceRegistry`

### Missing Components
- **Ore Deposit Entities**: No entities to represent ore veins on the map
- **Terrain Spawning**: `TerrainGenerator` doesn't spawn ore deposits
- **Renderer Support**: Need visual representation for ore deposits

## Implementation Steps

### Phase 1: Ore Deposit Entities

Create ore deposit entity factories following the `RockEntity.ts` pattern:

**File: `packages/world/src/entities/OreDepositEntity.ts`**

```typescript
// Create factories for each ore type:
// - createIronDeposit(world, x, y)
// - createCoalDeposit(world, x, y)
// - createCopperDeposit(world, x, y)
// - createGoldDeposit(world, x, y)

// Each deposit uses:
// - ResourceComponent with regenerationRate: 0 (finite resource)
// - Tags: 'iron_deposit', 'minable', 'obstacle'
// - Physics: solid (true)
// - Renderable: unique sprite per ore type
```

Key properties:
| Ore Type | Resource Amount | Spawn Rarity | Terrain |
|----------|----------------|--------------|---------|
| Iron | 50-100 | Common | Stone, Mountains |
| Coal | 40-80 | Common | Stone, Mountains |
| Copper | 30-60 | Uncommon | Stone, Mountains, Grass |
| Gold | 15-30 | Rare | Stone only |

### Phase 2: Terrain Generation

Update `TerrainGenerator.placeEntities()` to spawn ore deposits:

**File: `packages/world/src/terrain/TerrainGenerator.ts`**

```typescript
// Add ore spawning in stone/mountain terrain
// Use Perlin noise for natural clustering (ore veins)
// Different noise offsets for each ore type

// Iron: 15% chance in stone terrain
// Coal: 10% chance in stone terrain
// Copper: 5% chance in stone, 2% in high-elevation grass
// Gold: 2% chance in deep stone areas only
```

### Phase 3: Renderer Support

Add ore deposit sprites to the renderer:

**File: `packages/renderer/src/SpriteRenderer.ts`**

Add new sprite types:
- `iron_deposit`: Dark gray/brown rock with metallic streaks
- `coal_deposit`: Black rock chunks
- `copper_deposit`: Greenish-brown rock
- `gold_deposit`: Brown rock with gold flecks

### Phase 4: Export and Integration

**File: `packages/world/src/entities/index.ts`**
- Export new ore deposit factories

**File: `packages/world/src/terrain/TerrainGenerator.ts`**
- Import and use ore deposit factories

### Phase 5: Recipe Verification

Verify smelting recipes are complete in the crafting system:

| Recipe | Station | Inputs | Output |
|--------|---------|--------|--------|
| iron_ingot | forge | 3x iron_ore | 1x iron_ingot |
| copper_ingot | forge | 3x copper_ore | 1x copper_ingot |
| gold_ingot | forge | 3x gold_ore | 1x gold_ingot |
| steel_ingot | forge | 2x iron_ingot + 1x coal | 1x steel_ingot |

## Future Considerations (Z-Levels)

For Dwarf Fortress/Rimworld style vertical gameplay:
- Add `z` coordinate to PositionComponent
- Create underground terrain generation
- Ore deposits more common at lower z-levels
- Mining reveals adjacent tiles
- Support for stairs, ramps, vertical shafts

## Files to Create/Modify

### Create:
1. `packages/world/src/entities/OreDepositEntity.ts` - Ore deposit factories

### Modify:
1. `packages/world/src/terrain/TerrainGenerator.ts` - Spawn ore deposits
2. `packages/world/src/entities/index.ts` - Export ore factories
3. `packages/renderer/src/SpriteRenderer.ts` - Add ore sprites
4. `packages/core/src/items/defaultItems.ts` - Add copper_ingot, gold_ingot if missing

## Testing

1. Verify ore deposits spawn in appropriate terrain
2. Verify agents can gather ore with pickaxe
3. Verify smelting produces ingots at forge
4. Verify ore doesn't regenerate (finite resource)

## Notes

- Ore deposits are **finite** (regenerationRate: 0)
- Agents need a pickaxe to gather ore
- Coal can be used as forge fuel (already supported)
- GatherBehavior already handles resource harvesting - no changes needed
