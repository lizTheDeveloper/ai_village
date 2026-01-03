> **System:** persistence-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# ChunkManager Integration with Off-Screen Production

## Overview

This guide explains how to integrate the OffScreenProductionSystem with ChunkManager to automatically optimize factory chunks based on viewport visibility.

## Architecture

```
┌─────────────────┐
│  ChunkManager   │
│                 │
│  - tracks all   │
│    chunks       │
│  - knows which  │
│    are visible  │
└────────┬────────┘
         │
         │ calls setChunkVisibility()
         │
         v
┌─────────────────┐
│ OffScreenProd   │
│  System         │
│                 │
│  - runs at      │
│    priority 49  │
│  - fast-forward │
│    off-screen   │
│  - full sim     │
│    on-screen    │
└─────────────────┘
```

## Implementation Steps

### 1. Add OffScreenProductionSystem Reference to ChunkManager

**File**: `packages/core/src/world/ChunkManager.ts` (or wherever ChunkManager lives)

```typescript
import { OffScreenProductionSystem } from '../systems/OffScreenProductionSystem.js';

export class ChunkManager {
  private offScreenSystem: OffScreenProductionSystem | null = null;
  private chunkVisibility = new Map<string, boolean>();

  /**
   * Set the off-screen production system
   * Should be called during world initialization
   */
  setOffScreenSystem(system: OffScreenProductionSystem): void {
    this.offScreenSystem = system;
  }

  /**
   * Get all entities in a chunk
   */
  private getChunkEntities(chunkId: string): Entity[] {
    // Implementation depends on how chunks are stored
    // Return all entities in this chunk
    return this.chunks.get(chunkId)?.entities || [];
  }
}
```

### 2. Register Chunks with OffScreenSystem

When chunks are loaded (either from disk or newly generated):

```typescript
export class ChunkManager {
  loadChunk(chunkId: string): void {
    // ... load chunk data ...

    // Register with off-screen system
    if (this.offScreenSystem) {
      const entities = this.getChunkEntities(chunkId);
      this.offScreenSystem.registerChunk(chunkId, entities);

      // Set initial visibility
      const isVisible = this.isChunkVisible(chunkId);
      this.offScreenSystem.setChunkVisibility(chunkId, isVisible);
      this.chunkVisibility.set(chunkId, isVisible);
    }
  }
}
```

### 3. Update Visibility Based on Viewport

**Option A: Update every frame** (simple but potentially expensive)

```typescript
export class ChunkManager {
  updateVisibility(viewportBounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
    for (const [chunkId, chunk] of this.chunks) {
      const wasVisible = this.chunkVisibility.get(chunkId) ?? true;
      const isVisible = this.isChunkInViewport(chunk, viewportBounds);

      if (wasVisible !== isVisible) {
        // Visibility changed
        if (this.offScreenSystem) {
          this.offScreenSystem.setChunkVisibility(chunkId, isVisible);
        }
        this.chunkVisibility.set(chunkId, isVisible);

        if (isVisible) {
          console.log(`[ChunkManager] Chunk ${chunkId} entered viewport - resuming full simulation`);
        } else {
          console.log(`[ChunkManager] Chunk ${chunkId} left viewport - switching to fast-forward mode`);
        }
      }
    }
  }

  private isChunkInViewport(
    chunk: Chunk,
    viewport: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    // Check if chunk bounds overlap viewport
    return !(
      chunk.maxX < viewport.minX ||
      chunk.minX > viewport.maxX ||
      chunk.maxY < viewport.minY ||
      chunk.minY > viewport.maxY
    );
  }
}
```

**Option B: Update with margin** (better performance, smoother transitions)

Add a margin around the viewport so chunks don't constantly flip between visible/invisible:

```typescript
export class ChunkManager {
  private readonly VISIBILITY_MARGIN = 2; // Chunks within 2 chunks of viewport

  updateVisibility(viewportBounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
    // Expand viewport with margin
    const chunkSize = 32; // Example: 32 tiles per chunk
    const margin = this.VISIBILITY_MARGIN * chunkSize;

    const expandedBounds = {
      minX: viewportBounds.minX - margin,
      minY: viewportBounds.minY - margin,
      maxX: viewportBounds.maxX + margin,
      maxY: viewportBounds.maxY + margin,
    };

    for (const [chunkId, chunk] of this.chunks) {
      const wasVisible = this.chunkVisibility.get(chunkId) ?? true;
      const isVisible = this.isChunkInViewport(chunk, expandedBounds);

      if (wasVisible !== isVisible) {
        if (this.offScreenSystem) {
          this.offScreenSystem.setChunkVisibility(chunkId, isVisible);
        }
        this.chunkVisibility.set(chunkId, isVisible);
      }
    }
  }
}
```

### 4. Wire It Up in Game Initialization

**File**: `demo/src/main.ts` or wherever the game is initialized

```typescript
import { OffScreenProductionSystem } from '@ai-village/core';

// Create world and game loop
const world = new WorldImpl(eventBus, chunkManager);
const gameLoop = new GameLoop(world);

// Create off-screen system
const offScreenSystem = new OffScreenProductionSystem();

// Register systems (use registerAllSystems or manual)
gameLoop.systemRegistry.register(offScreenSystem);
gameLoop.systemRegistry.register(new PowerGridSystem());
gameLoop.systemRegistry.register(new BeltSystem());
gameLoop.systemRegistry.register(new AssemblyMachineSystem());

// Connect chunk manager to off-screen system
chunkManager.setOffScreenSystem(offScreenSystem);

// In render loop, update chunk visibility
function render() {
  const viewportBounds = camera.getViewportBounds();
  chunkManager.updateVisibility(viewportBounds);

  // ... rest of render code ...
}
```

## Testing

### Manual Test

1. Create a factory in a chunk
2. Pan camera away from the factory (chunk goes off-screen)
3. Wait for some time
4. Pan camera back to the factory
5. Verify production continued (output buffers have items)

### Automated Test

Use the test script:

```bash
npx tsx scripts/test-offscreen-optimization.ts
```

Expected output:
```
✓ Test PASSED

Off-screen optimization works correctly:
  ✓ Production matches expected output
  ✓ Resource consumption accurate
  ✓ 10000x performance improvement
  ✓ Seamless transition between on/off screen
```

## Performance Monitoring

Track performance with metrics:

```typescript
export class ChunkManager {
  getStats(): {
    totalChunks: number;
    visibleChunks: number;
    offScreenChunks: number;
    estimatedCPUSavings: number;
  } {
    const totalChunks = this.chunks.size;
    let visibleChunks = 0;

    for (const isVisible of this.chunkVisibility.values()) {
      if (isVisible) visibleChunks++;
    }

    const offScreenChunks = totalChunks - visibleChunks;

    // Estimate CPU savings (off-screen chunks use ~0.001ms vs 10ms)
    const savedMs = offScreenChunks * (10 - 0.001);
    const estimatedCPUSavings = (savedMs / (totalChunks * 10)) * 100;

    return {
      totalChunks,
      visibleChunks,
      offScreenChunks,
      estimatedCPUSavings,
    };
  }
}
```

Display in debug UI:

```typescript
// In renderer/debug overlay
const chunkStats = chunkManager.getStats();
console.log(`Chunks: ${chunkStats.visibleChunks}/${chunkStats.totalChunks} visible`);
console.log(`CPU savings: ${chunkStats.estimatedCPUSavings.toFixed(1)}%`);
```

## Edge Cases

### 1. Chunk Loaded While Off-Screen

```typescript
export class ChunkManager {
  loadChunk(chunkId: string): void {
    // ... load chunk ...

    // Register with off-screen system
    if (this.offScreenSystem) {
      const entities = this.getChunkEntities(chunkId);
      this.offScreenSystem.registerChunk(chunkId, entities);

      // Start as off-screen if not in viewport
      const isVisible = this.isChunkInViewport(chunk, this.lastViewportBounds);
      this.offScreenSystem.setChunkVisibility(chunkId, isVisible);
      this.chunkVisibility.set(chunkId, isVisible);
    }
  }
}
```

### 2. Chunk Unloaded

```typescript
export class ChunkManager {
  unloadChunk(chunkId: string): void {
    // ... save chunk data ...

    // Unregister from off-screen system
    if (this.offScreenSystem) {
      // Note: OffScreenProductionSystem should have an unregister method
      // this.offScreenSystem.unregisterChunk(chunkId);
    }

    this.chunkVisibility.delete(chunkId);
  }
}
```

### 3. Entity Added to Off-Screen Chunk

If entities are added to chunks (e.g., new factory built), update the off-screen system:

```typescript
export class ChunkManager {
  addEntityToChunk(chunkId: string, entity: Entity): void {
    // ... add entity to chunk ...

    // Re-register chunk to update production rates
    if (this.offScreenSystem && !this.chunkVisibility.get(chunkId)) {
      const entities = this.getChunkEntities(chunkId);
      this.offScreenSystem.registerChunk(chunkId, entities);
    }
  }
}
```

## Configuration

Make the system configurable:

```typescript
export class ChunkManager {
  private config = {
    visibilityMargin: 2, // Chunks within N chunks of viewport
    updateFrequency: 60, // Update visibility every N frames
    enableOffScreenOptimization: true,
  };

  setConfig(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);
  }
}
```

## Debugging

Add debug visualization:

```typescript
export class ChunkManager {
  debugRender(ctx: CanvasRenderingContext2D): void {
    for (const [chunkId, chunk] of this.chunks) {
      const isVisible = this.chunkVisibility.get(chunkId) ?? true;

      // Draw chunk bounds
      ctx.strokeStyle = isVisible ? 'green' : 'red';
      ctx.strokeRect(chunk.minX, chunk.minY, chunk.maxX - chunk.minX, chunk.maxY - chunk.minY);

      // Draw label
      ctx.fillStyle = isVisible ? 'green' : 'red';
      ctx.fillText(
        isVisible ? 'ON' : 'OFF',
        (chunk.minX + chunk.maxX) / 2,
        (chunk.minY + chunk.maxY) / 2
      );
    }
  }
}
```

## See Also

- **OFF_SCREEN_OPTIMIZATION.md** - Detailed design documentation
- **OffScreenProductionSystem.ts** - System implementation
- **ChunkProductionStateComponent.ts** - State component
- **test-offscreen-optimization.ts** - Integration test
