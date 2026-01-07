# Spatial Culling Implementation

**Date**: 2026-01-06
**Status**: ✅ Complete and Ready for Testing
**Phase**: Optimization 1 of 2 (Spatial Culling → Path Prediction)

## Summary

Implemented viewport-based spatial culling for SharedWorker state synchronization. Windows now only receive entities within their viewport, dramatically reducing network transfer.

## What Was Implemented

### 1. Viewport Type Definition

Added `Viewport` type to `types.ts`:

```typescript
export interface Viewport {
  x: number;         // Center X coordinate
  y: number;         // Center Y coordinate
  width: number;     // Viewport width
  height: number;    // Viewport height
  margin?: number;   // Extra margin for smooth scrolling
}
```

### 2. Worker-Side Changes

**ConnectionInfo updated** (`types.ts:185`):
- Added optional `viewport?: Viewport` field to track each window's view

**Message handling** (`shared-universe-worker.ts:376-381`):
- Added `set-viewport` message handler
- Stores viewport in connection info

**Spatial culling** (`shared-universe-worker.ts:461-475`):
- Added `isInViewport()` helper function
- Checks if entity position is within viewport bounds
- Uses margin for smooth scrolling (default: 50px)

**Viewport-specific serialization** (`shared-universe-worker.ts:219-240`):
- Modified `serializeWorld()` to accept optional viewport parameter
- Skips entities outside viewport during serialization
- Per-connection broadcast with different viewports

**Broadcasting** (`shared-universe-worker.ts:137-161`):
- Each connection receives custom state based on its viewport
- Full spatial culling - only visible entities transferred

### 3. Client-Side Changes

**UniverseClient** (`universe-client.ts:209-218`):
- Added `setViewport(viewport: Viewport)` method
- Sends viewport to worker via `set-viewport` message

**Demo integration** (`demo-shared-worker.ts:32-40`):
- Demo sets viewport to 800x600 centered at (400, 300)
- 100px margin for smooth scrolling

### 4. Type Exports

**Package exports** (`index.ts:49`):
- Exported `Viewport` type for public use

## How It Works

```typescript
// Window sets its viewport
universeClient.setViewport({
  x: 400,      // Center at x=400
  y: 300,      // Center at y=300
  width: 800,  // 800px wide
  height: 600, // 600px tall
  margin: 100, // +100px margin on all sides
});

// Worker only serializes entities in this viewport:
// X range: [400 - 400 - 100, 400 + 400 + 100] = [-100, 900]
// Y range: [300 - 300 - 100, 300 + 300 + 100] = [-100, 700]

// Entity at (50, 50) → SENT (in viewport)
// Entity at (1000, 500) → SKIPPED (outside viewport)
```

## Performance Impact

### Bandwidth Savings

**Scenario**: 1000 entities in world, viewport shows 100

**Without spatial culling**:
- 1000 entities × 20 TPS = 20,000 entity updates/sec
- ~50 bytes per entity = 1 MB/sec = **60 MB/min**

**With spatial culling**:
- 100 visible entities × 20 TPS = 2,000 entity updates/sec
- ~50 bytes per entity = 100 KB/sec = **6 MB/min**

**Savings**: 90% bandwidth reduction for 10% viewport coverage!

### Computational Overhead

**Worker**:
- Position check per entity: `O(n)` where n = total entities
- Very cheap operation (4 comparisons)
- Skip serialization for invisible entities (saves CPU)

**Window**:
- No additional overhead
- Same rendering logic

**Net**: Slight worker CPU increase, significant network decrease - excellent trade-off!

## Testing

**Manual Testing**:
1. Open `http://localhost:3000/shared-worker.html`
2. Spawn agents with 'S' key
3. Open browser dev tools Network tab
4. Observe reduced payload size

**Expected Behavior**:
- Only entities within (x: [-100, 900], y: [-100, 700]) are synchronized
- Entities outside viewport don't appear in messages
- When viewport changes, different entities become visible

**Debug logs** (in worker console with `debug: true`):
```
[UniverseWorker] Connection abc123 viewport: 800x600 @ (400, 300)
```

## Integration Points

### For Main Game

To enable spatial culling in main game:

```typescript
import { universeClient } from '@ai-village/shared-worker';

// Track camera position
function updateViewport(camera: Camera) {
  universeClient.setViewport({
    x: camera.x,
    y: camera.y,
    width: camera.viewportWidth,
    height: camera.viewportHeight,
    margin: 100,  // Entities just outside view
  });
}

// Call on camera movement
camera.on('move', updateViewport);
```

### For Dynamic Viewports

```typescript
// Pan camera - update viewport
function panCamera(dx: number, dy: number) {
  cameraX += dx;
  cameraY += dy;

  universeClient.setViewport({
    x: cameraX,
    y: cameraY,
    width: 1920,
    height: 1080,
    margin: 200,  // Larger margin for fast panning
  });
}

// Zoom - update viewport size
function zoom(scale: number) {
  universeClient.setViewport({
    x: cameraX,
    y: cameraY,
    width: 1920 / scale,
    height: 1080 / scale,
    margin: 200 / scale,
  });
}
```

## Future Enhancements

### 1. Automatic Viewport Tracking

```typescript
// Auto-detect viewport from canvas/renderer
class AutoViewportTracker {
  private renderer: Renderer;
  private lastUpdate: number = 0;
  private updateInterval = 100; // Update every 100ms

  track() {
    setInterval(() => {
      const viewport = this.renderer.getViewport();
      universeClient.setViewport(viewport);
    }, this.updateInterval);
  }
}
```

### 2. Viewport Prediction

```typescript
// Predict viewport based on camera velocity
function predictViewport(camera: Camera) {
  const predictedX = camera.x + camera.vx * 10; // 10 ticks ahead
  const predictedY = camera.y + camera.vy * 10;

  universeClient.setViewport({
    x: predictedX,
    y: predictedY,
    width: camera.width,
    height: camera.height,
    margin: 300,  // Larger margin for predicted movement
  });
}
```

### 3. Priority Zones

```typescript
// Different margins for different entity types
const viewport: Viewport = {
  x: cameraX,
  y: cameraY,
  width: 1920,
  height: 1080,
  margin: 100,  // Default for most entities

  // Future extension:
  agentMargin: 500,  // Track agents further out
  animalMargin: 200, // Animals medium distance
  plantMargin: 50,   // Plants only when very close
};
```

## Files Changed

### New Code
- `types.ts:160-173` - Viewport type definition
- `types.ts:185` - viewport field in ConnectionInfo
- `types.ts:128-131` - set-viewport message type
- `shared-universe-worker.ts:376-381` - viewport message handler
- `shared-universe-worker.ts:461-475` - isInViewport helper
- `shared-universe-worker.ts:137-161` - per-connection broadcast
- `shared-universe-worker.ts:200-212` - viewport parameter to serializeState
- `shared-universe-worker.ts:219-240` - spatial culling in serializeWorld
- `universe-client.ts:209-218` - setViewport method
- `demo-shared-worker.ts:32-40` - viewport initialization

### Exports
- `index.ts:49` - Added Viewport to exports

## Next Steps

**Phase 2: Path Prediction**

Now that spatial culling is complete, implement path prediction to reduce updates even further:

1. **Infrastructure** - Add PathPrediction components
2. **Linear paths** - Simplest prediction type
3. **Wander paths** - For animals
4. **Steering paths** - For agents with targets
5. **Delta protocol** - Only send corrections

Combined with spatial culling, this will provide:
- **Spatial filtering**: Only sync visible entities (spatial culling)
- **Temporal filtering**: Only sync when entities change path (path prediction)

**Expected total savings**: 95-99% bandwidth reduction for typical gameplay!

## Conclusion

Spatial culling is **complete and ready** for testing. The implementation:

✅ Viewport tracking per connection
✅ Spatial filtering in worker
✅ Client-side viewport API
✅ Demo integration
✅ Type-safe with proper exports

**Benefit**: Up to 90% bandwidth reduction for scenes with sparse viewport coverage.

**Next**: Begin path prediction (Phase 1 infrastructure).
