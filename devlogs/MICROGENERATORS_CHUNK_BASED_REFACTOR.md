# Microgenerators - Chunk-Based Discovery Refactor

**Date:** 2026-01-05
**Session:** Spatial Discovery System
**Status:** ✅ Complete - Ready for TerrainGenerator Integration

---

## Overview

Refactored the `GodCraftedDiscoverySystem` from **time-based discovery** to **chunk-based spatial spawning**. Content now appears during chunk generation, similar to how ore veins or dungeons spawn in Minecraft.

---

## The Problem

The original implementation used time-based discovery:
- Checked every 5 minutes (time-based)
- 1% chance per check
- Content spawned randomly in the world
- **Wrong**: Ancient artifacts could spawn underground or in inaccessible areas

---

## The Solution

**Spatial, chunk-based spawning:**
- Content spawns during chunk generation (lazy initialization)
- Deterministic based on chunk coordinates + seed
- Surface-level placement (no underground artifacts)
- Power level gating prevents overpowered content in early areas
- Like Minecraft's ore generation or dungeon placement

---

## Architecture Changes

### Before (Time-Based)
```typescript
class GodCraftedDiscoverySystem {
  private checkInterval = 20 * 60 * 5; // 5 minutes
  private discoveryRate = 0.01; // 1% chance per check

  update(world: World): void {
    this.ticksSinceLastCheck++;
    if (this.ticksSinceLastCheck >= this.checkInterval) {
      this.checkForDiscoveries(world); // Random spawn
    }
  }
}
```

### After (Chunk-Based)
```typescript
class GodCraftedDiscoverySystem {
  private spawnRate = 0.01; // 1% of chunks contain content
  private maxPowerLevel = 10; // Power level gating

  update(world: World): void {
    // No per-tick logic - content spawns during chunk generation
  }

  spawnContentInChunk(world: World, chunkInfo: ChunkSpawnInfo): void {
    // Deterministic chunk-based spawning
    const chunkHash = this.hashChunk(chunkInfo.x, chunkInfo.y);
    const shouldSpawn = this.seededRandom(chunkHash) <= this.spawnRate;

    if (shouldSpawn) {
      // Filter by power level, select content, place at surface
    }
  }
}
```

---

## Key Features

### 1. Deterministic Spawning
```typescript
private hashChunk(chunkX: number, chunkY: number): number {
  return (chunkX * 73856093) ^ (chunkY * 19349663) ^ this.seed;
}

private seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
```

Same chunk coordinates always produce the same content (given the same seed).

### 2. Power Level Gating
```typescript
private getContentPowerLevel(content: GodCraftedContent): number {
  switch (content.type) {
    case 'spell':
      return (content.data as SpellData).powerLevel ?? 5;
    case 'legendary_item':
    case 'technology':
      return 5; // TODO: Extract from data
    default:
      return 0; // Riddles, recipes have no power level
  }
}
```

Prevents ancient alien artifacts or overpowered spells in early-game chunks.

### 3. Surface Placement
```typescript
// Calculate spawn position within chunk (on surface, not underground!)
const localX = Math.floor(this.seededRandom(chunkHash + 2) * chunkInfo.size);
const localY = Math.floor(this.seededRandom(chunkHash + 3) * chunkInfo.size);
const worldX = chunkInfo.x * chunkInfo.size + localX;
const worldY = chunkInfo.y * chunkInfo.size + localY;

// Add position component
entity.addComponent({
  type: 'position',
  x: worldX,
  y: worldY,
});
```

Content appears on the surface where players can find it.

---

## Integration with TerrainGenerator

**TODO: Add to `TerrainGenerator.generateChunk()`**

The TerrainGenerator already spawns wild animals using:
```typescript
this.animalSpawner.spawnAnimalsInChunk(world, {
  x: chunk.x,
  y: chunk.y,
  biome: chunkBiome,
  size: CHUNK_SIZE,
});
```

We need to add god-crafted content spawning right after:
```typescript
// Spawn god-crafted content in chunk
this.godCraftedSpawner.spawnContentInChunk(world, {
  x: chunk.x,
  y: chunk.y,
  biome: chunkBiome,
  size: CHUNK_SIZE,
});
```

**Steps:**
1. Add `godCraftedSpawner: GodCraftedDiscoverySystem` to TerrainGenerator constructor
2. Call `spawnContentInChunk()` after animal spawning
3. Pass the `godCraftedDiscoverySystem` instance from main.ts

---

## Configuration

### In main.ts:
```typescript
const godCraftedDiscoverySystem = new GodCraftedDiscoverySystem({
  universeId: 'universe:main',
  spawnRate: 0.01,      // 1% of chunks contain content
  maxPowerLevel: 10,    // Maximum power level for spawned content
  seed: Date.now(),     // Seed for deterministic spawning
});
```

### Adjustable Parameters:
- **spawnRate** (0-1): Probability that a chunk contains content
  - 0.01 = 1% of chunks (rare)
  - 0.05 = 5% of chunks (common)
  - 0.001 = 0.1% of chunks (very rare)

- **maxPowerLevel** (0-10+): Maximum power level for spawned content
  - Early game: maxPowerLevel = 3 (only weak items)
  - Mid game: maxPowerLevel = 7 (moderate items)
  - Late game: maxPowerLevel = 10+ (all items)

- **seed**: Random seed for deterministic generation
  - Same seed = same content in same chunks
  - Different seed = different content distribution

---

## Example Flow

1. **Player explores** → Moves to new area
2. **Chunk loads** → `World.getTile()` triggers chunk generation
3. **TerrainGenerator runs** → Generates tiles, places entities
4. **Animals spawn** → `WildAnimalSpawningSystem.spawnAnimalsInChunk()`
5. **God-crafted content spawns** → `GodCraftedDiscoverySystem.spawnContentInChunk()`
   - Roll deterministic random based on chunk coords
   - 1% chance: This chunk contains content
   - Filter by power level (max 10)
   - Select random content from queue
   - Place at surface coordinates
   - Add position component
6. **Discovery event emitted** → News story generated
7. **Player finds content** → Visible on the map as an entity

---

## Power Level Examples

### Low Power (0-3)
- Simple riddles
- Basic recipes (bread, simple tools)
- Weak spells (light, minor healing)

### Medium Power (4-7)
- Complex riddles with multiple solutions
- Advanced recipes (steel weapons, potions)
- Useful spells (fireball, teleport short distance)

### High Power (8-10)
- Epic riddles from ancient gods
- Legendary recipes (enchanted armor, mythic items)
- Powerful spells (summon creatures, reality manipulation)

### Overpowered (11+)
- Reality-breaking content
- Ancient alien technology
- God-tier spells
- **Should not spawn in early-game chunks!**

---

## Benefits

✅ **Spatial**: Content tied to world location, not time
✅ **Deterministic**: Same chunks always have same content
✅ **Balanced**: Power level gating prevents early-game OP items
✅ **Discoverable**: Surface placement ensures players can find it
✅ **Scalable**: Works with infinite world generation
✅ **Performant**: Only checks during chunk generation (lazy)

---

## Files Modified

```
packages/core/src/microgenerators/GodCraftedDiscoverySystem.ts
  - Removed time-based check logic
  - Added chunk-based spawning
  - Added deterministic random helpers
  - Added power level gating
  - Added position component support
  - Added ChunkSpawnInfo interface

packages/core/src/index.ts
  - Exported ChunkSpawnInfo type

demo/src/main.ts
  - Updated initialization to use spawnRate instead of checkInterval
  - Added maxPowerLevel and seed parameters
```

---

## Next Steps

### Immediate (Required for functionality)
1. **Integrate into TerrainGenerator**:
   - Add `godCraftedSpawner` to constructor
   - Call `spawnContentInChunk()` after animal spawning
   - Pass instance from main.ts

2. **Test end-to-end**:
   - Create content via microgenerators UI
   - Explore new chunks in game
   - Verify content spawns at surface
   - Check power level filtering works

### Future Enhancements
1. **Biome-based spawning**: Different content in forests vs deserts
2. **Rarity tiers**: Common, uncommon, rare, legendary spawn rates
3. **Quest integration**: Some content only spawns after completing quests
4. **Discovery radius**: Content only spawns far from spawn point
5. **Visual indicators**: Glowing effects or markers for god-crafted content

---

## Testing

### Manual Testing
1. Set `spawnRate` to 1.0 (100%) for testing
2. Explore chunks and verify content spawns
3. Check console for spawn messages
4. Verify position components are correct
5. Confirm power level filtering works

### Expected Behavior
```
[GodCraftedDiscovery] Spawned spell in chunk (5, 3) at (165, 102)
[GodCraftedDiscovery] Spawned riddle in chunk (7, 4) at (230, 145)
```

### Power Level Test
```typescript
// Set max power level to 3
godCraftedDiscoverySystem.setMaxPowerLevel(3);

// Only weak spells (power <= 3) should spawn
// High-power spells (power > 3) should be filtered out
```

---

## Conclusion

The discovery system is now **spatial and chunk-based** instead of **temporal and time-based**. Content spawns naturally during world generation, similar to how ore veins or dungeons appear in Minecraft.

**Status: ✅ Code complete, pending TerrainGenerator integration**
