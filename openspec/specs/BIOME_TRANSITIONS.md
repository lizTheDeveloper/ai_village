# Biome Transitions Specification

**Status**: Draft
**Created**: 2026-01-12
**Priority**: Medium
**System**: Terrain Generation (`packages/world/src/terrain/`)

## Problem Statement

Current biome generation uses hard thresholds in `TerrainGenerator.ts:determineTerrainAndBiome()`, causing unrealistic abrupt transitions:

- Forest instantly appears at `moisture > 0.2` (line 732)
- Mountains instantly appear at `elevation > 0.5` (line 724)
- Desert instantly appears at `moisture < -0.3 && temperature > 0.2` (line 740)

**Result**: Forest tiles directly adjacent to desert tiles, mountains rising from flat plains, no gradual ecological succession.

**Real-world terrain**: Biomes transition gradually due to environmental gradients (moisture, temperature, elevation). Forests thin to woodland to grassland. Mountains have foothills. Deserts have scrubland edges.

## Design Philosophy

Biome transitions occur for **ecological reasons**:

1. **Moisture gradient** (wet → dry)
   - Dense forest → woodland → grassland → scrubland → desert

2. **Elevation gradient** (high → low)
   - Mountain peaks → alpine zone → foothills → plains

3. **Temperature gradient** (cold → hot)
   - Affects tree species, rock weathering, soil formation

4. **Water proximity** (land → water)
   - Upland → riparian zone → wetland/marsh → shallow water → deep water

## Solution Architecture

### Phase 1: Add Transition Biomes

Add new biome types to `Tile.ts:BiomeType`:

```typescript
export type BiomeType =
  | 'plains'
  | 'forest'
  | 'desert'
  | 'mountains'
  | 'ocean'
  | 'river'
  // NEW: Transition biomes
  | 'scrubland'    // Desert ↔ Plains (moisture: -0.3 to 0.0)
  | 'wetland'      // Land ↔ Water (elevation: -0.3 to 0.0, high moisture)
  | 'foothills'    // Mountains ↔ Plains (elevation: 0.35 to 0.5)
  | 'savanna'      // Forest ↔ Desert/Plains via temperature (hot + moderate moisture)
  | 'woodland';    // Forest ↔ Plains (moisture: 0.05 to 0.2)
```

### Phase 2: Revise `determineTerrainAndBiome()` Logic

Replace hard thresholds with graduated zones:

#### Current Logic (Hard Boundaries)
```typescript
// BEFORE: Abrupt forest boundary
if (moisture > 0.2 && temperature > -0.2) {
  return { terrain: 'forest', biome: 'forest' };
}
```

#### New Logic (Soft Boundaries)
```typescript
// AFTER: Graduated moisture transitions
if (moisture > 0.35 && temperature > -0.2) {
  // Dense forest core
  return { terrain: 'forest', biome: 'forest' };
} else if (moisture > 0.2 && temperature > -0.2) {
  // Forest edge → woodland transition
  return { terrain: 'forest', biome: 'woodland' };
} else if (moisture > 0.05 && temperature > -0.2) {
  // Woodland → grassland transition
  return { terrain: 'grass', biome: 'woodland' };
}
```

### Phase 3: Modify Entity Placement Density

Update `placeEntities()` to respect transition zones with density gradients:

#### Forest → Woodland → Plains Transition

```typescript
// Tree placement based on biome
if (biome === 'forest') {
  if (placementValue > -0.2 && Math.random() > 0.2) {
    // 80% tree density in core forest
    createTree(world, worldX, worldY, 1 + Math.floor(Math.random() * 4));
  }
} else if (biome === 'woodland') {
  // Woodland: 30-50% tree density based on moisture
  const woodlandDensity = 0.3 + ((moisture - 0.05) / 0.15) * 0.2; // 30-50%
  if (placementValue > 0.0 && Math.random() > (1 - woodlandDensity)) {
    createTree(world, worldX, worldY, 1 + Math.floor(Math.random() * 3));
  }
}
```

#### Mountains → Foothills → Plains Transition

```typescript
// Rock placement based on elevation gradient
if (biome === 'mountains') {
  // Dense rocks at high elevation (current logic)
} else if (biome === 'foothills') {
  // Foothills: 20-40% rock density based on elevation
  const elevationFactor = (elevation - 0.35) / 0.15; // 0.0 at elev=0.35, 1.0 at elev=0.5
  const rockDensity = 0.2 + elevationFactor * 0.2; // 20-40%
  if (placementValue < -0.1 && Math.random() < rockDensity) {
    createRock(world, worldX, worldY);
  }
}
```

## Detailed Transition Specifications

### 1. Forest ↔ Plains (Moisture Gradient)

**Environmental driver**: Decreasing moisture

**Biome sequence**:
```
Forest (moisture > 0.35)
  → Woodland (moisture 0.2-0.35)
  → Woodland-Grassland (moisture 0.05-0.2)
  → Plains (moisture < 0.05)
```

**Visual changes**:
- Forest: 80% tree cover, tall trees (1-4 tiles), dense leaf piles
- Woodland: 40-60% tree cover, medium trees (1-3 tiles), scattered leaf piles
- Woodland-Grassland: 10-30% tree cover, short trees (0-2 tiles), sparse leaf piles
- Plains: <5% tree cover (isolated trees), no leaf piles

**Fertility gradient**: 60-70 (forest) → 65-75 (woodland) → 70-80 (plains)

### 2. Desert ↔ Plains (Moisture Gradient)

**Environmental driver**: Increasing moisture

**Biome sequence**:
```
Desert Core (moisture < -0.4)
  → Scrubland (moisture -0.4 to -0.1)
  → Dry Grassland (moisture -0.1 to 0.0)
  → Plains (moisture > 0.0)
```

**Visual changes**:
- Desert Core: 5-75% rock coverage (geological features), sand terrain, no vegetation
- Scrubland: 10-30% rock coverage, sand/dirt terrain, sparse fiber plants (5% density)
- Dry Grassland: <10% rock coverage, dirt terrain, moderate vegetation (15% fiber plants)
- Plains: Minimal rocks, grass terrain, normal vegetation

**Fertility gradient**: 20-30 (desert) → 35-45 (scrubland) → 50-60 (dry grassland) → 70-80 (plains)

**Terrain type transitions**:
- Desert: `sand`
- Scrubland: 60% `sand`, 40% `dirt` (use noise to mix)
- Dry Grassland: 20% `dirt`, 80% `grass` (noise-based blend)
- Plains: `grass`

### 3. Mountains ↔ Plains (Elevation Gradient)

**Environmental driver**: Decreasing elevation

**Biome sequence**:
```
Mountain Peaks (elevation > 0.6)
  → Mountains (elevation 0.5-0.6)
  → Foothills (elevation 0.35-0.5)
  → Rolling Plains (elevation 0.15-0.35)
  → Plains (elevation < 0.15)
```

**Visual changes**:
- Mountain Peaks: 100% stone terrain, mountain entities, very high elevation (10-15 tiles)
- Mountains: 80-100% stone terrain, dense rocks (50-70% density), high elevation (6-10 tiles)
- Foothills: 30-60% stone terrain (noise blend), moderate rocks (20-40% density), medium elevation (3-6 tiles)
- Rolling Plains: <10% stone terrain, sparse rocks (5-15% density), low elevation (1-3 tiles)
- Plains: No stone, minimal rocks (spawn area: 5%), flat elevation (0-1 tiles)

**Terrain type transitions**:
- Mountains: `stone`
- Foothills: Noise-based blend of `stone` (30-60%), `dirt` (20-40%), `grass` (10-30%)
- Rolling Plains: Mostly `grass` with occasional `stone` outcrops
- Plains: `grass` or `dirt`

**Fertility gradient**: 40-50 (mountains) → 50-60 (foothills) → 65-75 (rolling plains) → 70-80 (plains)

### 4. Forest ↔ Water (Elevation + Moisture)

**Environmental driver**: Elevation dropping to water level + high moisture

**Biome sequence**:
```
Forest (elevation > 0.0, moisture > 0.2)
  → Wetland (elevation -0.1 to 0.05, moisture > 0.3)
  → Marsh (elevation -0.2 to -0.1, moisture > 0.3)
  → Shallow Water (elevation -0.3 to -0.2)
  → River/Ocean (elevation < -0.3)
```

**Visual changes**:
- Forest: Dense trees, `forest` terrain
- Wetland: 20-40% tree coverage, `grass` terrain, high moisture (80-100)
- Marsh: 5-15% tree coverage (dead/sparse trees), `grass` or `dirt` terrain, saturated (moisture 90-100)
- Shallow Water: `water` terrain, elevation -1 to -2
- River/Ocean: `water` terrain, elevation -2 to -3

**Special rules**:
- Wetland trees are shorter (0-2 tiles) and sparser than forest
- Marsh may have standing water in future fluid system
- Sand beaches only appear in LOW moisture areas (moisture < 0.1)

### 5. Plains ↔ Water (Beach Formation)

**Environmental driver**: Elevation + low moisture

**Biome sequence**:
```
Plains (elevation > 0.0, moisture < 0.1)
  → Beach/Shore (elevation -0.1 to 0.0, moisture < 0.1)
  → Shallow Water (elevation -0.3 to -0.1)
  → Ocean/River (elevation < -0.3)
```

**Visual changes**:
- Plains: `grass` terrain
- Beach: `sand` terrain, scattered rocks (10% density), elevation 0 to -1
- Shallow Water: `water` terrain, elevation -1 to -2
- Ocean/River: `water` terrain, elevation -2 to -3

**Current implementation**: Already works reasonably well (SAND_LEVEL = -0.1, WATER_LEVEL = -0.3)

### 6. Forest ↔ Desert (Temperature/Moisture)

**Environmental driver**: Combined moisture drop + temperature increase

**Biome sequence** (rare transition):
```
Forest (moisture > 0.2, temperature > -0.2)
  → Savanna (moisture 0.0-0.2, temperature > 0.3)
  → Scrubland (moisture -0.1-0.0, temperature > 0.2)
  → Desert (moisture < -0.3, temperature > 0.2)
```

**Visual changes**:
- Forest: Dense trees, `forest` terrain
- Savanna: Sparse trees (10-20% density), `grass` terrain, widely spaced
- Scrubland: Very sparse trees (0-5% dead trees), `dirt` terrain, scattered rocks
- Desert: No trees, `sand` terrain, geological rock formations

**Special rules**:
- Savanna trees are widely spaced (require high `placementValue > 0.4`)
- Transition is usually forest → woodland → plains → scrubland → desert (not direct)

### 7. Mountains ↔ Forest (Elevation + Moisture)

**Environmental driver**: High elevation meets high moisture

**Biome sequence**:
```
Mountain Peaks (elevation > 0.6, any moisture)
  → Alpine Zone (elevation 0.5-0.6, moisture > 0.0)
  → Subalpine Forest (elevation 0.4-0.5, moisture > 0.2)
  → Forest (elevation < 0.4, moisture > 0.2)
```

**Implementation approach**:
- Use `foothills` biome for alpine/subalpine zones
- Add sparse tree placement in high-elevation foothills with moisture > 0.2
- Trees at elevation 0.4-0.5 are shorter (1-2 tiles max) and sparser (15-25% density)

### 8. Mountains ↔ Desert (Elevation + Aridity)

**Environmental driver**: High elevation meets low moisture

**Biome sequence**:
```
Mountain Peaks (elevation > 0.6)
  → Mountains (elevation 0.5-0.6)
  → Rocky Highlands (elevation 0.35-0.5, moisture < -0.2)
  → Rocky Desert (elevation 0.0-0.35, moisture < -0.3)
  → Sandy Desert (elevation 0.0-0.35, moisture < -0.4)
```

**Visual changes**:
- Mountain Peaks/Mountains: `stone` terrain, mountain entities
- Rocky Highlands: `stone` terrain, dense rocks (foothills biome)
- Rocky Desert: Mix of `stone` (40%) and `sand` (60%), desert geological features (mesas, arroyos)
- Sandy Desert: `sand` terrain, dune fields, minimal rocks

**Current implementation**: Desert geological features already excellent (lines 466-583), just need better transitions from mountains

## Implementation Plan

### Step 1: Update Type Definitions

**File**: `packages/world/src/chunks/Tile.ts`

Add new biome types:
```typescript
export type BiomeType =
  | 'plains'
  | 'forest'
  | 'desert'
  | 'mountains'
  | 'ocean'
  | 'river'
  | 'scrubland'    // NEW
  | 'wetland'      // NEW
  | 'foothills'    // NEW
  | 'savanna'      // NEW
  | 'woodland';    // NEW
```

### Step 2: Update Biome Determination Logic

**File**: `packages/world/src/terrain/TerrainGenerator.ts`

**Method**: `determineTerrainAndBiome()` (lines 702-752)

Replace hard thresholds with graduated zones. Use helper methods:

```typescript
/**
 * Determine biome with soft transitions using environmental gradients.
 * Returns both the biome and terrain type based on elevation, moisture, temperature.
 */
private determineTerrainAndBiome(
  elevation: number,
  moisture: number,
  temperature: number
): { terrain: TerrainType; biome: BiomeType } {

  // PRIORITY 1: Water (hard boundary at WATER_LEVEL)
  if (elevation < this.WATER_LEVEL) {
    return {
      terrain: 'water',
      biome: elevation < -0.5 ? 'ocean' : 'river',
    };
  }

  // PRIORITY 2: Near-water transitions (beaches, wetlands, marshes)
  if (elevation < this.SAND_LEVEL) { // -0.1 to -0.3 range
    // High moisture near water = wetland/marsh
    if (moisture > 0.3) {
      return { terrain: 'grass', biome: 'wetland' };
    }
    // Low moisture near water = beach
    return {
      terrain: 'sand',
      biome: moisture < -0.3 ? 'desert' : 'plains',
    };
  }

  // PRIORITY 3: Wetlands (just above water level, high moisture)
  if (elevation < 0.05 && moisture > 0.35) {
    return { terrain: 'grass', biome: 'wetland' };
  }

  // PRIORITY 4: Mountains and foothills (elevation-based)
  if (elevation > this.STONE_LEVEL) { // > 0.5
    return { terrain: 'stone', biome: 'mountains' };
  }
  if (elevation > 0.35) { // 0.35 to 0.5 = foothills
    // Foothills terrain is a blend (implemented in separate method)
    const terrain = this.determineFoothillsTerrain(elevation, moisture);
    return { terrain, biome: 'foothills' };
  }

  // PRIORITY 5: Temperature/moisture-based biomes (forests, deserts, plains)

  // Hot and dry = Desert spectrum
  if (temperature > 0.2 && moisture < -0.3) {
    return { terrain: 'sand', biome: 'desert' };
  }

  // Hot with some moisture = Scrubland (desert transition)
  if (temperature > 0.2 && moisture >= -0.3 && moisture < -0.1) {
    const terrain = this.determineTransitionTerrain('sand', 'dirt', moisture, -0.3, -0.1);
    return { terrain, biome: 'scrubland' };
  }

  // Hot with moderate moisture = Savanna (grassland with sparse trees)
  if (temperature > 0.3 && moisture >= -0.1 && moisture < 0.15) {
    return { terrain: 'grass', biome: 'savanna' };
  }

  // High moisture = Forest spectrum (temperate zones)
  if (moisture > 0.35 && temperature > -0.2) {
    return { terrain: 'forest', biome: 'forest' };
  }

  // Moderate-high moisture = Woodland (forest transition)
  if (moisture > 0.2 && temperature > -0.2) {
    return { terrain: 'forest', biome: 'woodland' };
  }

  // Light moisture = Woodland-grassland transition
  if (moisture > 0.05 && temperature > -0.2) {
    return { terrain: 'grass', biome: 'woodland' };
  }

  // Dry grassland (plains edge toward desert)
  if (moisture >= -0.1 && moisture <= 0.05) {
    return { terrain: moisture > 0 ? 'grass' : 'dirt', biome: 'plains' };
  }

  // DEFAULT: Plains/grassland
  return {
    terrain: moisture > 0 ? 'grass' : 'dirt',
    biome: 'plains',
  };
}
```

**New Helper Methods**:

```typescript
/**
 * Determine terrain for foothills based on elevation gradient.
 * Blends stone, dirt, and grass based on how close to mountain threshold.
 */
private determineFoothillsTerrain(elevation: number, moisture: number): TerrainType {
  // elevation range: 0.35 to 0.5
  const elevationFactor = (elevation - 0.35) / 0.15; // 0.0 at base, 1.0 at mountains

  // Higher elevation = more stone
  const stoneThreshold = 0.4 + elevationFactor * 0.4; // 40-80% chance of stone
  const terrainRoll = Math.random();

  if (terrainRoll < stoneThreshold) {
    return 'stone';
  } else if (moisture > 0.1) {
    return 'grass';
  } else {
    return 'dirt';
  }
}

/**
 * Blend between two terrain types based on a gradient value.
 * Used for smooth transitions (e.g., sand → dirt in scrubland).
 */
private determineTransitionTerrain(
  terrainA: TerrainType,
  terrainB: TerrainType,
  value: number,
  minValue: number,
  maxValue: number
): TerrainType {
  const factor = (value - minValue) / (maxValue - minValue); // 0.0 to 1.0
  const threshold = factor; // 0% terrainB at min, 100% terrainB at max

  return Math.random() < threshold ? terrainB : terrainA;
}
```

### Step 3: Update Fertility Calculation

**File**: `packages/world/src/terrain/TerrainGenerator.ts`

**Method**: `calculateBiomeFertility()` (lines 672-697)

Add fertility ranges for new biomes:

```typescript
private calculateBiomeFertility(biome: BiomeType, moisture: number): number {
  const BIOME_FERTILITY_RANGES: Record<BiomeType, [number, number]> = {
    plains: [70, 80],
    forest: [60, 70],
    river: [80, 90],
    ocean: [0, 0],
    desert: [20, 30],
    mountains: [40, 50],
    // NEW BIOMES
    scrubland: [35, 45],     // Desert transition
    wetland: [75, 85],       // High moisture, rich soil
    foothills: [50, 60],     // Mountain transition
    savanna: [50, 60],       // Hot grassland
    woodland: [65, 75],      // Forest transition (good soil)
  };

  const range = BIOME_FERTILITY_RANGES[biome];
  if (!range) {
    throw new Error(`No fertility data for biome: ${biome}`);
  }

  const [min, max] = range;
  const normalizedMoisture = (moisture + 1) / 2;
  const fertility = min + (max - min) * normalizedMoisture;

  return fertility / 100;
}
```

### Step 4: Update Entity Placement

**File**: `packages/world/src/terrain/TerrainGenerator.ts`

**Method**: `placeEntities()` (lines 144-362)

Add placement logic for new biomes with density gradients:

```typescript
private placeEntities(chunk: Chunk, world: WorldMutator): void {
  const placementNoise = new PerlinNoise(this.hashString(this.seed) + 5000);

  for (let localY = 0; localY < CHUNK_SIZE; localY++) {
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      const worldX = chunk.x * CHUNK_SIZE + localX;
      const worldY = chunk.y * CHUNK_SIZE + localY;
      const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
      if (!tile || tile.terrain === 'water') continue;

      const placementValue = placementNoise.noise(worldX * 0.1, worldY * 0.1);

      // === TREE PLACEMENT (biome-based density) ===

      // Core forest: 80% density, tall trees
      if (tile.biome === 'forest' && placementValue > -0.2) {
        if (Math.random() > 0.2) {
          const treeHeight = 1 + Math.floor(Math.random() * 4);
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // Woodland: 40-50% density, medium trees
      else if (tile.biome === 'woodland') {
        // Density increases with moisture in woodland zone
        const moisture = (tile.moisture / 100) * 2 - 1; // Convert back to -1..1
        const woodlandDensity = 0.35 + Math.max(0, Math.min(0.15, (moisture - 0.05) / 0.3 * 0.15));
        if (placementValue > 0.1 && Math.random() < woodlandDensity) {
          const treeHeight = 1 + Math.floor(Math.random() * 3);
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // Wetland: 20-30% density, short trees
      else if (tile.biome === 'wetland' && placementValue > 0.3) {
        if (Math.random() < 0.25) {
          const treeHeight = Math.floor(Math.random() * 3); // 0-2 tiles
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // Savanna: 10-15% density, widely spaced trees
      else if (tile.biome === 'savanna' && placementValue > 0.5) {
        if (Math.random() < 0.12) {
          const treeHeight = 1 + Math.floor(Math.random() * 3);
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // Foothills (alpine/subalpine): 5-15% density at high moisture
      else if (tile.biome === 'foothills' && tile.moisture > 50 && placementValue > 0.4) {
        if (Math.random() < 0.1) {
          const treeHeight = 1 + Math.floor(Math.random() * 2); // Short alpine trees
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // Plains: Keep existing scattered tree logic
      else if (tile.terrain === 'grass' && tile.biome === 'plains' && placementValue > 0.1) {
        if (Math.random() > 0.7) {
          const treeHeight = Math.floor(Math.random() * 3);
          createTree(world, worldX, worldY, treeHeight);
        }
      }

      // === ROCK PLACEMENT (biome-based density) ===

      // Mountains: Keep existing logic (lines 179-184)
      if (tile.terrain === 'stone' && tile.biome === 'mountains' && placementValue < -0.2) {
        if (Math.random() > 0.5) {
          createRock(world, worldX, worldY);
        }
      }

      // Mountain peaks: Keep existing logic (lines 186-194)
      else if (tile.biome === 'mountains' && placementValue > 0.3) {
        if (Math.random() > 0.85) {
          const mountainHeight = 3 + Math.floor((placementValue - 0.3) * 15);
          createMountain(world, worldX, worldY, mountainHeight);
        }
      }

      // Foothills: 20-40% rock density based on elevation
      else if (tile.biome === 'foothills') {
        // Get elevation back from tile (stored as normalized 0-100)
        const elevationNormalized = tile.elevation; // This is the Z elevation, need actual noise elevation
        // We need to recalculate or pass elevation through - use placementValue as proxy
        const rockDensity = 0.2 + Math.max(0, Math.min(0.2, placementValue * 0.3));
        if (Math.random() < rockDensity) {
          createRock(world, worldX, worldY);
        }
      }

      // Scrubland: 15-25% rock density
      else if (tile.biome === 'scrubland' && placementValue < 0.0) {
        if (Math.random() < 0.20) {
          createRock(world, worldX, worldY);
        }
      }

      // Desert: Keep existing detailed geological features (lines 204-308)
      if (tile.biome === 'desert') {
        // [Existing desert rock placement logic remains unchanged]
      }

      // Beach rocks: Keep existing (lines 196-202)
      if (tile.terrain === 'sand' && tile.biome !== 'desert' && placementValue < 0) {
        if (Math.random() > 0.9) {
          createRock(world, worldX, worldY);
        }
      }

      // Spawn area rocks: Keep existing (lines 310-317)
      const distFromOrigin = Math.sqrt(worldX * worldX + worldY * worldY);
      if (distFromOrigin < 30 && tile.terrain === 'grass') {
        if (Math.random() > 0.95) {
          createRock(world, worldX, worldY);
        }
      }

      // === VEGETATION PLACEMENT ===

      // Leaf piles: forest + woodland
      if ((tile.biome === 'forest' || tile.biome === 'woodland') && placementValue < -0.1) {
        const leafDensity = tile.biome === 'forest' ? 0.30 : 0.15;
        if (Math.random() < leafDensity) {
          createLeafPile(world, worldX, worldY);
        }
      }

      // Fiber plants: grasslands (plains, savanna, scrubland)
      if ((tile.biome === 'plains' || tile.biome === 'savanna' || tile.biome === 'scrubland')
          && tile.terrain === 'grass'
          && placementValue < 0.2) {
        const fiberDensity = tile.biome === 'plains' ? 0.15 :
                             tile.biome === 'savanna' ? 0.10 : 0.05;
        if (Math.random() < fiberDensity) {
          createFiberPlant(world, worldX, worldY);
        }
      }

      // Ore deposits: Keep existing logic (lines 335-356)
      if (tile.terrain === 'stone') {
        // [Existing ore placement logic remains unchanged]
      }
    }
  }
}
```

### Step 5: Update Animal Spawning

**File**: `packages/core/src/systems/WildAnimalSpawningSystem.ts`

Add spawn rules for new biome types:

```typescript
// In getAnimalSpeciesForBiome() method, add:
case 'woodland':
  return ['deer', 'squirrel', 'fox', 'rabbit']; // Forest edge species
case 'scrubland':
  return ['coyote', 'lizard', 'snake', 'rabbit']; // Desert edge species
case 'savanna':
  return ['deer', 'coyote', 'snake']; // Grassland species
case 'wetland':
  return ['frog', 'duck', 'beaver']; // Aquatic/semi-aquatic species
case 'foothills':
  return ['goat', 'eagle', 'deer']; // Mountain edge species
```

### Step 6: Update Renderer Color Schemes

**File**: `packages/renderer/src/rendering/TerrainRenderer.ts`

Add colors for new biome types (if renderer uses biome-based coloring):

```typescript
const BIOME_COLORS = {
  plains: '#7da855',
  forest: '#2d5016',
  desert: '#dcc896',
  mountains: '#8b8b8b',
  ocean: '#2a5c8a',
  river: '#4a7c9e',
  // NEW
  woodland: '#5a8c3a',      // Medium green (between forest and plains)
  scrubland: '#b8a672',     // Tan-brown (between desert and plains)
  savanna: '#9db857',       // Yellow-green grassland
  wetland: '#6b9c7d',       // Murky green-blue
  foothills: '#8c9c84',     // Gray-green (between mountains and plains)
};
```

### Step 7: Testing

1. **Visual inspection**: Generate world, verify smooth transitions
   - Forest gradually thins to grassland
   - Deserts have scrubland edges, not abrupt sand boundaries
   - Mountains have foothills with scattered rocks
   - Water edges have wetlands (high moisture) or beaches (low moisture)

2. **Biome distribution**: Check that transition biomes appear at expected moisture/elevation ranges

3. **Entity density**: Verify trees/rocks gradually increase/decrease in transition zones

4. **Fertility values**: Ensure transition biomes have intermediate fertility

5. **Animal spawning**: Verify appropriate species spawn in transition biomes

## Edge Cases and Special Considerations

### 1. Spawn Area Flattening

Current spawn flattening (lines 437-439, 586) may override transition logic. Ensure spawn area:
- Uses plains biome (existing behavior)
- Allows some woodland/grassland variation at edges
- Doesn't create abrupt circular boundary

### 2. Desert Geological Features

Existing desert features (mesas, arroyos, canyons, dunes) are excellent and should be preserved. Transitions:
- Scrubland should use simplified desert features (fewer arroyos, no mesas)
- Rocky desert (high elevation desert) can keep mesa features
- Sandy desert (low elevation desert) emphasizes dunes

### 3. Noise-Based Terrain Blending

For foothills and scrubland, terrain type should use noise to create organic patches:
- Don't create checkerboard patterns
- Use low-frequency noise (same scale as placement noise)
- Blend based on gradients, not random chance per tile

Example:
```typescript
// BAD: Random per-tile (checkerboard)
const terrain = Math.random() < 0.5 ? 'stone' : 'grass';

// GOOD: Noise-based patches
const blendNoise = placementNoise.noise(worldX * 0.05, worldY * 0.05);
const terrain = blendNoise < 0.3 ? 'stone' : 'grass';
```

### 4. Wetland vs Beach Differentiation

Both occur at same elevation range (-0.1 to 0.0). Distinguish by moisture:
- Moisture > 0.3 → Wetland (marsh, swamp)
- Moisture < 0.1 → Beach (sand)
- Moisture 0.1-0.3 → Muddy shore (could be either, prefer wetland)

### 5. Biome Priority Order

When multiple biome rules match, priority matters:
1. Water (hard boundary, trumps everything)
2. Near-water zones (wetland, beach)
3. Elevation-based (mountains, foothills)
4. Temperature + moisture (desert, forest, plains)

This prevents foothills from appearing underwater, etc.

## Success Metrics

1. **Visual smoothness**: No abrupt biome boundaries visible when zoomed out
2. **Ecological realism**: Transitions follow environmental gradients
3. **Biome variety**: 11 distinct biome types create diverse landscapes
4. **Performance**: No significant FPS/TPS impact from additional logic
5. **Backwards compatibility**: Existing saves load correctly (biomes may change on re-generation)

## Future Enhancements

### Phase 4: Noise-Based Transition Irregularity

Add "transition noise" to create organic, irregular boundaries:
- Use separate noise layer for biome boundaries
- Shift thresholds locally by ±0.05 to create natural wavering edges
- Prevents perfectly straight biome boundaries

### Phase 5: Seasonal Biome Variants

Some biomes could have seasonal variants:
- Woodland in winter: bare trees, snow cover
- Wetland in dry season: exposed mud, fewer trees
- Savanna in wet season: greener, more vegetation

### Phase 6: Microbiomes

Introduce tile-level variation within biomes:
- Forest: clearings, groves, thickets
- Desert: oases, rock outcrops, dune seas
- Mountains: valleys, plateaus, ridges

## References

- Current implementation: `packages/world/src/terrain/TerrainGenerator.ts`
- Biome types: `packages/world/src/chunks/Tile.ts`
- Real-world ecology: [Ecological succession](https://en.wikipedia.org/wiki/Ecological_succession)
- Game inspiration: Dwarf Fortress biome transitions, Minecraft biome blending (1.18+)
