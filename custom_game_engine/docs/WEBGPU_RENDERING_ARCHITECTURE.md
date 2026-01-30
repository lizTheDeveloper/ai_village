# WebGPU Rendering Architecture

> **Status:** Proposal
> **Last Updated:** 2026-01-28
> **Purpose:** Upgrade rendering layer from Canvas2D to WebGPU for improved performance

---

## Executive Summary

This document proposes upgrading the rendering layer from HTML5 Canvas2D to WebGPU (via PixiJS v8) while leveraging the existing SharedWorker architecture for simulation/rendering separation.

**Current State:**
- Simulation: SharedWorker with path prediction, delta sync (excellent)
- Rendering: Canvas2D (CPU-bound bottleneck)
- 3D Mode: Three.js WebGL (already GPU-accelerated)

**Proposed State:**
- Simulation: SharedWorker (unchanged)
- 2D Rendering: PixiJS v8 with WebGPU backend
- 3D Mode: Three.js WebGPU renderer (upgrade from WebGL)
- Optional: OffscreenCanvas in worker for headless rendering

**Expected Benefits:**
- 5-10x sprite throughput (100K+ sprites at 60fps)
- GPU-accelerated 2D rendering
- Unified WebGPU across 2D and 3D
- Better batch handling for filters/masks/blend modes

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Technology Selection](#technology-selection)
4. [Migration Strategy](#migration-strategy)
5. [Implementation Plan](#implementation-plan)
6. [Performance Targets](#performance-targets)
7. [Risk Assessment](#risk-assessment)

---

## Current Architecture Analysis

### What We Have (Already Excellent)

```
┌─────────────────────────────────────────────────────────────┐
│               SharedWorker (Simulation)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   ECS World @ 20 TPS                                │    │
│  │   - PathPredictionSystem (priority 50)              │    │
│  │   - DeltaSyncSystem (priority 1000)                 │    │
│  │   - 95-99% bandwidth reduction via path prediction  │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ postMessage (delta updates)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Thread (Window)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   GameBridge (view-only world)                      │    │
│  │   PathInterpolationSystem (smooth rendering)        │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Renderer (Canvas2D) ← BOTTLENECK                  │    │
│  │   - CPU-bound sprite drawing                        │    │
│  │   - No GPU batching                                 │    │
│  │   - Each drawImage() = CPU overhead                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Current Renderer Performance Characteristics

| Metric | Current (Canvas2D) | Target (WebGPU) |
|--------|-------------------|-----------------|
| Max sprites/frame | ~2,000 | 100,000+ |
| Batching | None | Automatic |
| GPU utilization | ~5% | ~60-80% |
| Filter/mask cost | High (composite) | Low (shader) |
| Memory copies | Per-sprite | Per-batch |

### Existing Optimizations (Keep All)

The current renderer has excellent optimizations that should be preserved:

1. **Query Caching** (`Renderer.ts:93-122`)
   - Buildings: 60 frames (3 sec)
   - Renderables: 20 frames (1 sec)
   - Agents: 10 frames (0.5 sec)

2. **Viewport Culling** (`Renderer.ts:470-521`)
   - 99% entity reduction (4000+ → 50)
   - Vision range culling for resources
   - Margin buffer for smooth scrolling

3. **Terrain Chunk Caching** (`TerrainRenderer.ts`)
   - OffscreenCanvas pre-rendering
   - Version-based invalidation
   - LRU eviction (100 chunks max)

4. **Object Pooling** (`Renderer.ts:93-103`)
   - Reusable arrays (no GC pressure)
   - Position cache for sorting
   - Single screenPos object

5. **Position Cache During Sort** (`Renderer.ts:573-621`)
   - Float32Array for positions
   - O(1) lookup during sort

---

## Proposed Architecture

### Phase 1: PixiJS v8 WebGPU Renderer

```
┌─────────────────────────────────────────────────────────────┐
│               SharedWorker (Unchanged)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   ECS World @ 20 TPS                                │    │
│  │   PathPredictionSystem + DeltaSyncSystem            │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ postMessage (delta updates)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Thread (Window)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   GameBridge + PathInterpolationSystem              │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   NEW: PixiJSRenderer                               │    │
│  │   - WebGPU backend (WebGL fallback)                 │    │
│  │   - Automatic sprite batching                       │    │
│  │   - GPU-accelerated filters/masks                   │    │
│  │   - ParticleContainer for 100K+ particles           │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Existing: Renderer3D (Three.js)                   │    │
│  │   - Upgrade to WebGPURenderer                       │    │
│  │   - Keep existing optimizations                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Multi-Universe Background Processing (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│            Dedicated Workers (Background Universes)          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Universe Worker │  │ Universe Worker │  ...              │
│  │ (Headless)      │  │ (Headless)      │                   │
│  │ No rendering    │  │ No rendering    │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
           │ State snapshots (periodic)
           ▼
┌─────────────────────────────────────────────────────────────┐
│               SharedWorker (Active Universe)                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   ECS World + Rendering State                       │    │
│  │   Coordinates background universe state             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │ Delta updates
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Main Thread (Rendering Only)              │
│                    PixiJS v8 + Three.js WebGPU               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Selection

### Primary: PixiJS v8 with WebGPU

**Why PixiJS v8:**
- Fastest 2D WebGPU renderer available
- 100K+ sprites at 60fps (ParticleContainer)
- Native WebGPU with automatic WebGL fallback
- Excellent sprite batching and texture atlasing
- Active development, React integration available

**PixiJS v8 Initialization:**
```typescript
import { Application, Sprite, Container } from 'pixi.js';

const app = new Application();
await app.init({
  preference: 'webgpu',      // WebGPU first, WebGL fallback
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: false,          // Pixel art = no AA
  resolution: 1,             // Or window.devicePixelRatio for retina
  backgroundAlpha: 1,
});

document.body.appendChild(app.canvas);
```

### Secondary: Three.js WebGPU Renderer

**For 3D Mode:**
```typescript
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

const renderer = new WebGPURenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
await renderer.init();  // WebGPU requires async init
```

**Note:** Three.js WebGPU is experimental but functional. Keep WebGLRenderer as fallback.

### Browser Support Strategy

| Browser | WebGPU | WebGL2 | Fallback |
|---------|--------|--------|----------|
| Chrome 113+ | ✅ | ✅ | None needed |
| Edge 113+ | ✅ | ✅ | None needed |
| Firefox 128+ | ✅ | ✅ | None needed |
| Safari 17+ | ✅ | ✅ | None needed |
| Safari 14-16 | ❌ | ✅ | WebGL2 |
| Older browsers | ❌ | Maybe | Canvas2D (current) |

**Detection:**
```typescript
async function selectRenderer(): Promise<'webgpu' | 'webgl' | 'canvas2d'> {
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return 'webgpu';
  }

  const canvas = document.createElement('canvas');
  if (canvas.getContext('webgl2')) return 'webgl';

  return 'canvas2d';  // Ultimate fallback (keep current Renderer.ts)
}
```

---

## Migration Strategy

### Approach: Parallel Implementation with Feature Flag

**Do NOT replace the current renderer.** Instead:

1. Create `PixiJSRenderer.ts` alongside existing `Renderer.ts`
2. Add feature flag to switch between renderers
3. Migrate components incrementally
4. Keep Canvas2D as fallback for unsupported browsers

```typescript
// packages/renderer/src/index.ts
export async function createRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions
): Promise<IRenderer> {
  const preference = options.renderer ?? 'auto';

  if (preference === 'auto') {
    const best = await selectRenderer();
    return createRendererByType(best, canvas, options);
  }

  return createRendererByType(preference, canvas, options);
}

function createRendererByType(
  type: 'webgpu' | 'webgl' | 'canvas2d',
  canvas: HTMLCanvasElement,
  options: RendererOptions
): IRenderer {
  switch (type) {
    case 'webgpu':
    case 'webgl':
      return new PixiJSRenderer(canvas, { ...options, preference: type });
    case 'canvas2d':
      return new Renderer(canvas, options);  // Existing
  }
}
```

### Interface Abstraction

Define common interface that both renderers implement:

```typescript
// packages/renderer/src/IRenderer.ts
export interface IRenderer {
  // Core
  render(world: World): void;
  destroy(): void;

  // Camera
  readonly camera: Camera;
  centerOn(x: number, y: number): void;
  setZoom(zoom: number): void;

  // Entity rendering
  addEntity(entity: Entity): void;
  removeEntity(entityId: string): void;
  updateEntity(entity: Entity): void;

  // Terrain
  invalidateChunk(chunkX: number, chunkY: number): void;

  // Overlays
  showFloatingText(text: string, x: number, y: number, options?: TextOptions): void;
  showSpeechBubble(entityId: string, text: string): void;

  // Particles
  createDustCloud(x: number, y: number): void;
  createSparkEffect(x: number, y: number): void;

  // Selection
  setSelectedEntity(entityId: string | null): void;

  // Performance
  getStats(): RendererStats;
}

export interface RendererStats {
  fps: number;
  drawCalls: number;
  visibleEntities: number;
  culledEntities: number;
  gpuMemoryMB: number;
}
```

---

## Implementation Plan

### Phase 1: PixiJS v8 2D Renderer

**Step 1.1: Package Setup**
```bash
cd custom_game_engine/packages/renderer
npm install pixi.js@^8
```

**Step 1.2: Core PixiJS Renderer**

```typescript
// packages/renderer/src/PixiJSRenderer.ts
import { Application, Container, Sprite, Assets, Texture } from 'pixi.js';
import type { World, Entity } from '@ai-village/core';
import type { IRenderer, RendererStats } from './IRenderer.js';
import { Camera } from './Camera.js';

export class PixiJSRenderer implements IRenderer {
  private app: Application;
  private worldContainer: Container;
  private terrainContainer: Container;
  private entityContainer: Container;
  private overlayContainer: Container;

  private entitySprites: Map<string, Sprite> = new Map();
  private textureCache: Map<string, Texture> = new Map();

  readonly camera: Camera;

  // Reuse existing optimizations
  private _cachedBuildingQuery: Entity[] = [];
  private _cachedRenderableQuery: Entity[] = [];
  private _cachedAgentQuery: Entity[] = [];
  private _lastBuildingRefresh = 0;
  private _lastRenderableRefresh = 0;
  private _lastAgentRefresh = 0;

  constructor(canvas: HTMLCanvasElement, options: PixiJSRendererOptions) {
    this.camera = new Camera(options.width, options.height);
  }

  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      preference: 'webgpu',
      canvas: this.canvas,
      width: this.width,
      height: this.height,
      antialias: false,  // Pixel art
      resolution: 1,
      backgroundAlpha: 1,
      backgroundColor: 0x1a1a2e,
    });

    // Layer hierarchy (back to front)
    this.terrainContainer = new Container();
    this.entityContainer = new Container();
    this.overlayContainer = new Container();

    this.worldContainer = new Container();
    this.worldContainer.addChild(this.terrainContainer);
    this.worldContainer.addChild(this.entityContainer);
    this.worldContainer.addChild(this.overlayContainer);

    this.app.stage.addChild(this.worldContainer);

    // Enable sorting for depth ordering
    this.entityContainer.sortableChildren = true;
  }

  render(world: World): void {
    // 1. Update camera
    this.camera.update();
    this.worldContainer.x = -this.camera.x + this.width / 2;
    this.worldContainer.y = -this.camera.y + this.height / 2;
    this.worldContainer.scale.set(this.camera.zoom);

    // 2. Refresh cached queries (reuse existing intervals)
    this.refreshCachedQueries(world);

    // 3. Get visible bounds
    const bounds = this.camera.getVisibleBounds();

    // 4. Update terrain (only visible chunks)
    this.updateTerrain(world, bounds);

    // 5. Update entities (culled + sorted)
    this.updateEntities(world, bounds);

    // 6. Update overlays
    this.updateOverlays(world);

    // PixiJS handles actual GPU rendering automatically
  }

  private updateEntities(world: World, bounds: VisibleBounds): void {
    const visibleEntities = this.cullEntities(bounds);

    // Sort by Y position (depth)
    visibleEntities.sort((a, b) => {
      const posA = a.getComponent('position');
      const posB = b.getComponent('position');
      return (posA?.y ?? 0) - (posB?.y ?? 0);
    });

    // Track which sprites are still valid
    const activeEntityIds = new Set<string>();

    for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      activeEntityIds.add(entity.id);

      let sprite = this.entitySprites.get(entity.id);

      if (!sprite) {
        sprite = this.createEntitySprite(entity);
        this.entitySprites.set(entity.id, sprite);
        this.entityContainer.addChild(sprite);
      }

      this.updateEntitySprite(entity, sprite);
      sprite.zIndex = i;  // Depth sorting
    }

    // Remove sprites for entities no longer visible
    for (const [entityId, sprite] of this.entitySprites) {
      if (!activeEntityIds.has(entityId)) {
        this.entityContainer.removeChild(sprite);
        sprite.destroy();
        this.entitySprites.delete(entityId);
      }
    }
  }

  private createEntitySprite(entity: Entity): Sprite {
    const appearance = entity.getComponent('appearance');
    const textureName = appearance?.sprite ?? 'default';

    const texture = this.getTexture(textureName);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);  // Bottom-center anchor

    return sprite;
  }

  private updateEntitySprite(entity: Entity, sprite: Sprite): void {
    const position = entity.getComponent('position');
    if (position) {
      sprite.x = position.x * this.tileSize;
      sprite.y = position.y * this.tileSize;
    }

    // Animation frame
    const animation = entity.getComponent('sprite_animation');
    if (animation) {
      // Update texture based on animation frame
      const frameName = `${animation.base}_${animation.frame}`;
      sprite.texture = this.getTexture(frameName);
    }
  }

  private getTexture(name: string): Texture {
    let texture = this.textureCache.get(name);
    if (!texture) {
      // Load texture (Assets API handles caching)
      texture = Assets.get(name) ?? Texture.WHITE;
      this.textureCache.set(name, texture);
    }
    return texture;
  }

  getStats(): RendererStats {
    return {
      fps: this.app.ticker.FPS,
      drawCalls: this.app.renderer.renderPipes?.batch?.['_batchersByInstructionSet']?.size ?? 0,
      visibleEntities: this.entitySprites.size,
      culledEntities: this._cachedRenderableQuery.length - this.entitySprites.size,
      gpuMemoryMB: 0,  // WebGPU doesn't expose this easily
    };
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
    this.entitySprites.clear();
    this.textureCache.clear();
  }
}
```

**Step 1.3: Terrain Tile Rendering with TilingSprite**

```typescript
// packages/renderer/src/terrain/PixiTerrainRenderer.ts
import { Container, TilingSprite, Texture, RenderTexture, Graphics } from 'pixi.js';

export class PixiTerrainRenderer {
  private chunkContainer: Container;
  private chunkCache: Map<string, Container> = new Map();
  private chunkVersions: Map<string, number> = new Map();

  constructor(private app: Application, private tileSize: number) {
    this.chunkContainer = new Container();
  }

  renderVisibleChunks(world: World, bounds: VisibleBounds): void {
    const startChunkX = Math.floor(bounds.left / CHUNK_SIZE);
    const endChunkX = Math.ceil(bounds.right / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / CHUNK_SIZE);
    const endChunkY = Math.ceil(bounds.bottom / CHUNK_SIZE);

    const visibleChunkKeys = new Set<string>();

    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        const key = `${cx},${cy}`;
        visibleChunkKeys.add(key);

        const chunk = world.getChunk(cx, cy);
        if (!chunk) continue;

        // Check if chunk needs re-render
        const cachedVersion = this.chunkVersions.get(key) ?? -1;
        if (chunk.version !== cachedVersion) {
          this.renderChunk(chunk, cx, cy);
          this.chunkVersions.set(key, chunk.version);
        }
      }
    }

    // Remove off-screen chunks from cache (LRU would be better)
    for (const [key, container] of this.chunkCache) {
      if (!visibleChunkKeys.has(key) && this.chunkCache.size > 100) {
        this.chunkContainer.removeChild(container);
        container.destroy({ children: true });
        this.chunkCache.delete(key);
        this.chunkVersions.delete(key);
      }
    }
  }

  private renderChunk(chunk: Chunk, cx: number, cy: number): void {
    const key = `${cx},${cy}`;

    // Remove existing
    let container = this.chunkCache.get(key);
    if (container) {
      this.chunkContainer.removeChild(container);
      container.destroy({ children: true });
    }

    // Create new container for this chunk
    container = new Container();
    container.x = cx * CHUNK_SIZE * this.tileSize;
    container.y = cy * CHUNK_SIZE * this.tileSize;

    // Render tiles
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const tile = chunk.getTile(x, y);
        const texture = this.getTileTexture(tile.type);
        const sprite = new Sprite(texture);
        sprite.x = x * this.tileSize;
        sprite.y = y * this.tileSize;
        container.addChild(sprite);
      }
    }

    this.chunkCache.set(key, container);
    this.chunkContainer.addChild(container);
  }
}
```

**Step 1.4: ParticleContainer for Massive Sprite Counts**

```typescript
// For large numbers of similar sprites (e.g., grass, particles)
import { ParticleContainer, Particle } from 'pixi.js';

class GrassRenderer {
  private particleContainer: ParticleContainer;

  constructor() {
    // ParticleContainer is optimized for 100K+ sprites
    this.particleContainer = new ParticleContainer({
      maxSize: 100000,
      properties: {
        position: true,
        rotation: false,
        scale: false,
        tint: true,  // For seasonal color variation
        alpha: false,
      },
    });
  }

  renderGrass(tiles: GrassTile[]): void {
    this.particleContainer.removeChildren();

    for (const tile of tiles) {
      const particle = new Particle({
        texture: this.grassTexture,
        x: tile.x * TILE_SIZE,
        y: tile.y * TILE_SIZE,
        tint: tile.seasonalTint,
      });
      this.particleContainer.addParticle(particle);
    }
  }
}
```

### Phase 2: Three.js WebGPU Upgrade

```typescript
// packages/renderer/src/Renderer3D.ts - Upgrade WebGL to WebGPU
import * as THREE from 'three';

// Dynamic import for WebGPU renderer
async function createThreeRenderer(canvas: HTMLCanvasElement): Promise<THREE.WebGLRenderer | any> {
  if (navigator.gpu) {
    try {
      const { WebGPURenderer } = await import('three/webgpu');
      const renderer = new WebGPURenderer({ canvas, antialias: false });
      await renderer.init();
      console.log('[Renderer3D] Using WebGPU');
      return renderer;
    } catch (e) {
      console.warn('[Renderer3D] WebGPU init failed, falling back to WebGL:', e);
    }
  }

  // Fallback to WebGL
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  console.log('[Renderer3D] Using WebGL');
  return renderer;
}
```

### Phase 3: Multi-Universe Workers (Future)

```typescript
// packages/core/src/multiverse/UniverseWorkerPool.ts
export class UniverseWorkerPool {
  private workers: Map<string, Worker> = new Map();
  private universeStates: Map<string, UniverseSnapshot> = new Map();

  /**
   * Spawn a background universe that runs without rendering
   */
  async spawnBackgroundUniverse(config: UniverseConfig): Promise<string> {
    const universeId = crypto.randomUUID();

    const worker = new Worker(
      new URL('./background-universe-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.postMessage({ type: 'init', config, universeId });

    // Periodic state sync
    worker.onmessage = (event) => {
      if (event.data.type === 'snapshot') {
        this.universeStates.set(universeId, event.data.snapshot);
      }
    };

    this.workers.set(universeId, worker);
    return universeId;
  }

  /**
   * Get latest snapshot of background universe
   */
  getUniverseSnapshot(universeId: string): UniverseSnapshot | undefined {
    return this.universeStates.get(universeId);
  }

  /**
   * Promote background universe to active (take over SharedWorker)
   */
  async promoteToActive(universeId: string): Promise<void> {
    const snapshot = this.universeStates.get(universeId);
    if (!snapshot) throw new Error(`No snapshot for universe ${universeId}`);

    // Transfer state to SharedWorker
    // ... implementation
  }

  /**
   * Terminate background universe
   */
  terminateUniverse(universeId: string): void {
    const worker = this.workers.get(universeId);
    if (worker) {
      worker.terminate();
      this.workers.delete(universeId);
      this.universeStates.delete(universeId);
    }
  }
}
```

---

## Performance Targets

### Sprite Rendering

| Scenario | Current (Canvas2D) | Target (PixiJS v8 WebGPU) |
|----------|-------------------|---------------------------|
| Idle village (50 entities) | 60 FPS | 60 FPS |
| Medium village (500 entities) | 55-60 FPS | 60 FPS |
| Large village (2,000 entities) | 30-45 FPS | 60 FPS |
| Stress test (10,000 entities) | 5-10 FPS | 50-60 FPS |
| Particle storm (50,000 particles) | <1 FPS | 60 FPS |

### Memory

| Metric | Current | Target |
|--------|---------|--------|
| Texture memory | ~50MB | ~30MB (atlas) |
| Entity sprites | ~100KB/100 ent | ~50KB/100 ent |
| Draw calls per frame | 50-200 | 5-20 |

### Bandwidth (SharedWorker → Window)

Already optimized via path prediction. No change needed.

| Metric | Current | Target |
|--------|---------|--------|
| Messages/sec | 0.5-2 | 0.5-2 (unchanged) |
| Bytes/message | 1-10KB | 1-10KB (unchanged) |
| Bandwidth reduction | 95-99% | 95-99% (unchanged) |

---

## Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| WebGPU browser support (~70%) | Keep Canvas2D fallback |
| PixiJS v8 stability | Pin version, test thoroughly |
| Breaking existing renderer | Parallel implementation, feature flag |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| Texture loading differences | Abstract via Assets API |
| Coordinate system differences | Careful testing |
| Filter/mask behavior changes | Test all visual effects |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Performance regression | Benchmark before/after |
| Memory leaks | Use destroy() properly |

---

## File Structure After Migration

```
packages/renderer/src/
├── IRenderer.ts              # Common interface
├── Renderer.ts               # Existing Canvas2D (KEEP)
├── PixiJSRenderer.ts         # NEW: PixiJS v8 WebGPU
├── Renderer3D.ts             # Existing Three.js (upgrade to WebGPU)
├── Camera.ts                 # Shared (unchanged)
├── terrain/
│   ├── TerrainRenderer.ts    # Existing Canvas2D
│   └── PixiTerrainRenderer.ts # NEW: PixiJS terrain
├── sprites/
│   ├── PixelLabEntityRenderer.ts # Existing
│   └── PixiEntityRenderer.ts     # NEW: PixiJS sprites
├── particles/
│   └── PixiParticleRenderer.ts   # NEW: ParticleContainer
└── index.ts                  # Factory function + feature flag
```

---

## Summary

**What we keep:**
- SharedWorker architecture (excellent simulation/rendering separation)
- Path prediction & delta sync (95-99% bandwidth reduction)
- Viewport culling (99% entity reduction)
- Query caching (minimal ECS overhead)
- Canvas2D renderer (fallback)

**What we add:**
- PixiJS v8 with WebGPU backend (5-10x sprite throughput)
- Three.js WebGPU renderer (for 3D mode)
- Feature flag for renderer selection
- Common IRenderer interface

**Migration path:**
1. Add PixiJS v8 dependency
2. Implement PixiJSRenderer alongside existing
3. Add feature flag and renderer factory
4. Test thoroughly
5. Make WebGPU default when stable
6. Keep Canvas2D for legacy browsers

**Estimated effort:** Medium (the hard part - SharedWorker - is already done)
