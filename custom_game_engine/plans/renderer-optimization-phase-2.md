# Renderer Optimization Phase 2 Plan

## Overview

Building on the Phase 1 optimizations (OcclusionCuller BFS, ChunkManager3D rate limiting, entity sorting cache, text measurement cache), this plan addresses the remaining performance bottlenecks in rendering, zooming, scrolling, and 3D sprite display.

## Current Architecture Analysis

### 3D Sprite Rendering (Renderer3D.ts)
- **Problem**: Each entity gets an individual `THREE.Sprite` with its own `CanvasTexture` (lines 887-902)
- **Impact**: 100 entities = 100 draw calls, 100 texture uploads
- **Current flow**:
  1. Create 64x64 canvas per entity
  2. Render sprite to canvas via PixelLabSpriteLoader
  3. Upload as CanvasTexture to GPU
  4. Create THREE.Sprite with SpriteMaterial
  5. Update position every frame

### Animal Rendering (Renderer3D.ts:1133-1248)
- Each animal has separate texture loading and animation state
- 8 directions × 8 frames per species loaded individually
- No batching across animals of same species

### Camera (Camera.ts)
- Smoothing with deadzone already implemented (lines 325-367)
- `worldToScreen()` called per-entity per-frame
- No caching of transform results

---

## Optimization Plan

### 1. Instanced Sprite Rendering (High Impact)

**Goal**: Reduce 100s of draw calls to 1-4 draw calls using GPU instancing

**Approach**: Extend InstancedRenderer pattern to sprites

```typescript
// New: InstancedSpriteRenderer.ts
class InstancedSpriteRenderer {
  // Single InstancedMesh for all sprites of same atlas
  private instancedMesh: THREE.InstancedMesh;

  // Texture atlas combining all sprite frames
  private textureAtlas: THREE.Texture;
  private atlasMapping: Map<string, { u: number, v: number, w: number, h: number }>;

  // Per-instance data
  private matrices: Float32Array;      // Transform matrices
  private uvOffsets: Float32Array;     // Which sprite in atlas

  render(entities: Entity[]): void {
    // Single draw call for all entities
  }
}
```

**Files to modify**:
- Create `packages/renderer/src/3d/InstancedSpriteRenderer.ts`
- Modify `packages/renderer/src/3d/SpriteAtlasBuilder.ts` (new)
- Update `Renderer3D.ts` to use instanced rendering

**Expected improvement**: 10-50x reduction in draw calls

---

### 2. Sprite Texture Atlas (High Impact)

**Goal**: Combine multiple sprites into single texture to reduce GPU state changes

**Approach**: Build texture atlas at startup or on-demand

```typescript
// New: SpriteAtlasBuilder.ts
class SpriteAtlasBuilder {
  private atlas: OffscreenCanvas;
  private allocator: RectangleAllocator;

  // Pack sprites into atlas
  addSprite(key: string, image: ImageBitmap): UVRect {
    const rect = this.allocator.allocate(image.width, image.height);
    this.atlas.getContext('2d')!.drawImage(image, rect.x, rect.y);
    return this.computeUVs(rect);
  }

  getTexture(): THREE.Texture { ... }
}
```

**Implementation notes**:
- Atlas size: 2048x2048 (supports ~1700 48x48 sprites)
- Use bin packing algorithm for efficient space usage
- Rebuild atlas when new sprites load

---

### 3. LOD for Distant Sprites (Medium Impact)

**Goal**: Reduce texture resolution and detail for distant entities

**Approach**: Multi-resolution sprite system

```typescript
// Distance-based LOD levels
const LOD_LEVELS = [
  { maxDistance: 20, scale: 1.0, textureSize: 48 },   // Full detail
  { maxDistance: 50, scale: 0.5, textureSize: 24 },   // Half detail
  { maxDistance: 100, scale: 0.25, textureSize: 12 }, // Quarter detail
];
```

**Implementation**:
- Pre-generate mipmapped atlas
- Select LOD based on camera distance
- Skip animation updates for distant entities

---

### 4. Camera Transform Caching (Medium Impact)

**Goal**: Avoid redundant worldToScreen calculations

**Current problem**: `isPositionVisible()` creates new `THREE.Vector3` per call (line 768)

**Optimization**:
```typescript
class Camera {
  // Reusable vector for frustum checks
  private _tempVector = new THREE.Vector3();

  // Cache transform matrix
  private _viewProjectionMatrix: THREE.Matrix4;
  private _viewProjectionDirty = true;

  isPositionVisible(x: number, y: number, z: number): boolean {
    this._tempVector.set(x, z, y); // Reuse vector
    return this.frustum.containsPoint(this._tempVector);
  }
}
```

**Files to modify**:
- `packages/renderer/src/Renderer3D.ts` - reusable Vector3
- `packages/renderer/src/Camera.ts` - cache view matrix

---

### 5. Batch Animation Updates (Medium Impact)

**Goal**: Reduce per-entity animation overhead

**Current problem**: Each entity checks animation state independently

**Optimization**:
```typescript
class AnimationBatcher {
  // Group entities by animation state
  private walkingEntities: Set<string> = new Set();
  private idleEntities: Set<string> = new Set();

  // Update all animations in batch
  update(deltaTime: number): void {
    // Single frame calculation for all walking entities
    const walkFrame = Math.floor(this.walkTimer / FRAME_DURATION) % WALK_FRAMES;

    // Apply to all walking entities at once
    for (const id of this.walkingEntities) {
      this.setFrame(id, walkFrame);
    }
  }
}
```

---

### 6. Deferred Texture Upload (Low Impact)

**Goal**: Spread texture uploads across frames to avoid stutter

**Current problem**: Loading new entity creates immediate texture upload

**Optimization**:
```typescript
class TextureUploadQueue {
  private pending: Array<{ texture: THREE.CanvasTexture, priority: number }> = [];
  private readonly MAX_UPLOADS_PER_FRAME = 2;

  queue(texture: THREE.CanvasTexture, priority: number): void {
    this.pending.push({ texture, priority });
    this.pending.sort((a, b) => b.priority - a.priority);
  }

  processFrame(): void {
    for (let i = 0; i < this.MAX_UPLOADS_PER_FRAME && this.pending.length > 0; i++) {
      const { texture } = this.pending.shift()!;
      texture.needsUpdate = true;
    }
  }
}
```

---

## Implementation Order

1. **Phase 2a: Quick Wins** (1-2 hours)
   - [ ] Reusable Vector3 in Renderer3D.isPositionVisible
   - [ ] Cache view projection matrix
   - [ ] Batch animation frame calculation

2. **Phase 2b: Texture Atlas** (2-3 hours)
   - [ ] Create SpriteAtlasBuilder
   - [ ] Integrate with PixelLabSpriteLoader
   - [ ] Update UV coordinates in shaders

3. **Phase 2c: Instanced Sprites** (3-4 hours)
   - [ ] Create InstancedSpriteRenderer
   - [ ] Custom shader for atlas UV lookup
   - [ ] Integrate with Renderer3D

4. **Phase 2d: LOD System** (2-3 hours)
   - [ ] Distance-based LOD selection
   - [ ] Mipmap generation for atlas
   - [ ] Skip distant entity updates

---

## Expected Results

| Optimization | Draw Calls | GPU Memory | CPU Time |
|--------------|-----------|------------|----------|
| Current | 100+ | ~400MB | ~8ms |
| After Phase 2a | 100+ | ~400MB | ~5ms |
| After Phase 2b | 100+ | ~50MB | ~4ms |
| After Phase 2c | 4-8 | ~50MB | ~2ms |
| After Phase 2d | 4-8 | ~30MB | ~1ms |

---

## Risks and Mitigations

1. **Texture atlas rebuilding**: Could cause stutter
   - Mitigation: Build in background, swap atomically

2. **Instanced rendering complexity**: Custom shaders needed
   - Mitigation: Start with simple shader, iterate

3. **LOD popping**: Visible quality changes at distance thresholds
   - Mitigation: Smooth blending between LOD levels

---

## Files Summary

**New files**:
- `packages/renderer/src/3d/InstancedSpriteRenderer.ts`
- `packages/renderer/src/3d/SpriteAtlasBuilder.ts`
- `packages/renderer/src/3d/AnimationBatcher.ts`

**Modified files**:
- `packages/renderer/src/Renderer3D.ts`
- `packages/renderer/src/Camera.ts`
- `packages/renderer/src/sprites/PixelLabSpriteLoader.ts`
