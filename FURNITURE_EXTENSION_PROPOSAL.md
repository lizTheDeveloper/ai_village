# Proposal: Add Furniture Support to TileBasedBlueprintRegistry

## Problem

The current `TileBasedBlueprintRegistry` only supports basic structural elements:
- Walls (`#`)
- Floors (`.`)
- Doors (`D`)
- Windows (`W`)
- Empty (` `)

Houses have no furniture (beds, chests, tables), which makes them feel empty and incomplete.

## Solution

Extend the `SYMBOL_TO_TYPE` mapping to support furniture symbols:

```typescript
// Add to TileBasedBlueprintRegistry.ts

export type TileType = 'wall' | 'floor' | 'door' | 'window' | 'empty'
  | 'bed' | 'storage' | 'table' | 'workstation' | 'counter';

const SYMBOL_TO_TYPE: Record<string, TileType> = {
  '#': 'wall',
  '.': 'floor',
  'D': 'door',
  'W': 'window',
  ' ': 'empty',
  // NEW: Furniture
  'B': 'bed',       // Bed - blocks movement, provides sleep
  'S': 'storage',   // Storage chest - blocks movement, stores items
  'T': 'table',     // Table - blocks movement, decoration
  'K': 'workstation', // Workstation/anvil - blocks movement, crafting
  'C': 'counter',   // Counter - blocks movement, decoration
};
```

## Updated Building Layouts

### Small House with Furniture
```
#####
#B.S#  ← Bed (B) and Storage chest (S)
W...D
#...#
#####
```

### Cozy Cottage with Furniture
```
######
#B..S#  ← Bed and Storage
W....W
#T..T#  ← Tables
#....#
###D##
```

### Workshop with Workstation
```
#####
W...W
#K.K#  ← Workstations (anvil/forge)
#...#
##D##
```

## Implementation Steps

1. **Extend type definitions**:
   - Add furniture types to `TileType`
   - Update `SYMBOL_TO_TYPE` mapping

2. **Update parser**:
   - Handle furniture symbols in `parseLayout()`
   - Assign material for furniture (default to wood)

3. **Update buildings**:
   - Add furniture to all residential buildings
   - Add workstations to production buildings
   - Add counters/tables to commercial buildings

4. **Update validator** (optional):
   - Check that beds are inside houses
   - Check that workstations are in workshops
   - Warn if no furniture in residential buildings

## Benefits

- Houses feel lived-in with beds and storage
- Workshops have clear purpose with workstations
- More visual variety in buildings
- Gameplay benefit: agents know where to sleep/work
- Easy to implement (just extend existing system)

## Roofs and 3D View

For side views with roofs, we have two options:

### Option A: Assume Default Roof
All buildings automatically get a roof above them. No need to specify in layout.
- Height: `width * 0.5` (pyramid/peaked roof)
- Material: Same as walls
- Always solid, no holes

### Option B: Add Voxel Building System
Create full 3D voxel buildings with explicit roof tiles.
- Requires new building type: `VoxelBuildingDefinition`
- Can specify each vertical layer
- More complex but more flexible

I recommend **Option A** (automatic roofs) for simplicity. Buildings are assumed to have roofs - we don't need to explicitly model them in the 2D floor plan.

## Example with Auto-Roof Assumption

**Floor Plan (what we see):**
```
#####
#B.S#  ← Furniture inside
W...D
#...#
#####
```

**Assumed 3D Structure:**
```
Side View:
    /\       ← Auto-generated peaked roof (wood)
   /  \
  #----#     ← Walls with window (W)
  #    D     ← Walls with door (D)
  ######     ← Floor
```

The roof is automatically generated:
- **Shape**: Peaked/pyramid based on building footprint
- **Material**: Same as walls (wood for wooden houses, stone for stone houses)
- **Height**: Half the width of the building
- **Always solid**: No holes (guaranteed weather protection)

## Decision

Do you want me to:
1. **Just add furniture** (beds, chests, tables to current buildings)
2. **Add furniture + document auto-roof assumption**
3. **Create full voxel building system** (more complex, more features)

I recommend **Option 1** - add furniture to make houses feel lived-in, assume roofs exist automatically.
