# Dimensional Rendering System Specification

**Version:** 0.1.0 (Draft)
**Status:** Proposal
**Dependencies:** ViewMode.ts, Camera.ts, DimensionalParadigms.ts

## Overview

This spec extends the existing ViewMode/Camera system to support universes with 4 or 5 spatial dimensions. The approach follows HyperRogue's handling of non-Euclidean spaces: render slices of higher dimensions, let the player scroll between slices.

## Key Insight: Existing Infrastructure

The current renderer already supports:
- **Multiple view modes** (TopDown, FaceNorth/South/East/West)
- **Z-axis parallax** in side-view (scroll to change focus depth)
- **Interaction culling** (only entities at focus Z are clickable)
- **Parallax effects** (distant layers faded/scaled)

**This is 90% of what we need for 4D.** The Z-axis in side-view mode behaves exactly like a 4th dimension slice axis would.

## Coordinate Systems by Universe Dimension

### 3D Universe (Current)
```
Position: (x, y, z)
- x, y: Horizontal plane
- z: Height (underground = negative, sky = positive)

TopDown view: Shows x, y plane
Side view: Shows x or y (horizontal) + z (vertical), parallax on depth axis
```

### 4D Universe (New)
```
Position: (x, y, z, w)
- x, y: Horizontal plane
- z: Height (underground → surface → sky)
- w: 4th dimension slice coordinate

TopDown view: Shows x, y plane at current w-slice
Side view: Shows x or y + z, with w as parallax axis

Scroll wheel: Changes w-focus (which 4D slice is visible)
Entities exist at specific w-coordinates
Entities at different w may be partially visible (parallax fade)
```

### 5D Multiverse (New)
```
Position: (x, y, z, w, v)
- x, y, z, w: Position within a 4D universe
- v: Universe index within the multiverse

v-axis is NOT scrollable continuously - it's discrete universe selection
Each v-value is a different universe with potentially different rules
```

## Implementation Approach

### Option A: Reuse Z as W (Recommended for MVP)

For 4D universes, treat the existing Z-axis parallax system as the W-axis:

```typescript
// In a 4D universe:
// - Entity positions have (x, y, z, w)
// - Renderer maps w → parallax depth system
// - True height (z) is handled separately

interface Position4D {
  x: number;
  y: number;
  z: number;  // Height
  w: number;  // 4th dimension (maps to parallax focus)
}

// When rendering in 4D universe:
// - TopDown: Show x,y at current w-slice, ignore z (or color-code by z)
// - SideView: Show x,z or y,z at current w-slice, w controls parallax
```

**Pros:**
- Minimal renderer changes
- Existing parallax system handles W-slice rendering
- Quick to implement

**Cons:**
- Z (height) and W (4th dim) can't both have parallax simultaneously
- May be confusing initially

### Option B: Add Explicit W-Axis (Full Implementation)

Add `w` as a first-class coordinate with its own parallax system:

```typescript
// Camera.ts additions
export class Camera {
  // Existing
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public zoom: number = 1.0;

  // New for 4D
  public w: number = 0;          // Current W-focus
  public targetW: number = 0;
  public wParallaxConfig: ParallaxConfig = DEFAULT_PARALLAX_CONFIG;

  // Methods
  setWFocus(w: number): void;
  adjustWFocus(delta: number): void;
  getWParallaxTransform(entityW: number): ParallaxTransform | null;
}
```

**Pros:**
- Clean separation of concerns
- Z and W can both have parallax if needed
- More intuitive

**Cons:**
- More code changes
- Need to handle 2D (x,y), 3D (x,y,z), and 4D (x,y,z,w) entities

## View Mode Extensions

### New View Modes for 4D

```typescript
export enum ViewMode {
  // Existing
  TopDown = 'top_down',
  FaceNorth = 'face_north',
  FaceSouth = 'face_south',
  FaceEast = 'face_east',
  FaceWest = 'face_west',

  // New for 4D universes
  TopDownW = 'top_down_w',     // Show x,y,w - height as color
  FaceNorthW = 'face_north_w', // Show x,w,z - y as depth
  // ... etc for other directions

  // Cross-section modes
  CrossXW = 'cross_x_w',       // Show x,w plane - like looking at universe from "outside"
  CrossYW = 'cross_y_w',       // Show y,w plane
}
```

### Scroll Behavior by Universe Dimension

| Modifier | 3D Universe | 4D Universe | 5D+ Universe |
|----------|-------------|-------------|--------------|
| Scroll | Zoom (topdown) / Z-focus (side) | Zoom | Zoom |
| Shift+Scroll | Y-depth slice | Z-focus (height) | Z-focus |
| Cmd+Shift+Scroll | - | W-focus (4th dim) | W-focus |
| Alt+Shift+Scroll | - | - | V-focus (5th dim) |
| Ctrl+Shift+Scroll | - | - | Reserved for 6th dim |

This keybinding scheme scales to arbitrary dimensions while keeping the most common navigation (zoom, height) accessible.

## Entity Rendering in 4D

### Visibility Rules

```typescript
function shouldRenderEntity(
  entity: Entity,
  camera: Camera,
  universeDimensions: DimensionCount
): RenderDecision {
  const pos = entity.getComponent('position');

  if (universeDimensions === 3) {
    // Standard 3D: render if in view bounds
    return { visible: true, parallax: null };
  }

  if (universeDimensions === 4) {
    const wDistance = Math.abs(pos.w - camera.w);

    if (wDistance > camera.wParallaxConfig.maxWDistance) {
      return { visible: false };
    }

    if (wDistance < camera.wParallaxConfig.focusWTolerance) {
      // In focus W-slice: fully visible, interactable
      return { visible: true, parallax: null, interactable: true };
    }

    // Nearby W-slice: visible with parallax, not interactable
    const parallax = calculateWParallax(wDistance, camera.wParallaxConfig);
    return { visible: true, parallax, interactable: false };
  }
}
```

### Visual Indicators for W-Position

```typescript
// Entities at different W-slices should be visually distinct
interface WSliceVisuals {
  // Entities behind current W-focus
  behind: {
    opacity: 0.3,
    scale: 0.8,
    tint: 'blue',      // Cool colors = "deeper" in W
    blur: true,
  },

  // Entities at current W-focus
  focus: {
    opacity: 1.0,
    scale: 1.0,
    tint: null,
    blur: false,
  },

  // Entities ahead of current W-focus
  ahead: {
    opacity: 0.3,
    scale: 1.1,
    tint: 'yellow',    // Warm colors = "closer" in W
    blur: true,
  },
}
```

## Portal Rendering

Portals in 4D can connect non-adjacent W-slices:

```typescript
interface DimensionalPortal {
  id: string;

  // Entry point
  entryPosition: Position4D;
  entryWRange: [number, number];  // W-range where portal is visible

  // Exit point
  exitPosition: Position4D;
  exitWRange: [number, number];

  // Visual properties
  portalColor: string;
  showDestinationPreview: boolean;  // Render destination through portal?
  bidirectional: boolean;
}

// Render portals as "windows" into other W-slices
function renderPortal(ctx: CanvasRenderingContext2D, portal: Portal, camera: Camera) {
  // Draw portal frame at entry position
  // If showDestinationPreview, clip and render destination slice inside
}
```

## Universe Configuration

Each universe declares its dimension count:

```typescript
interface UniverseConfig {
  id: string;
  name: string;
  dimensions: DimensionCount;  // 2, 3, 4, or 5

  // Dimension-specific config
  wRange?: [number, number];    // Valid W-coordinate range (4D+)
  wWrapping?: boolean;          // Does W wrap around? (torus topology)

  // Multiverse config (5D)
  connectedUniverses?: string[];
  vPosition?: number;           // Position in multiverse
}
```

## UI Elements

### W-Axis Indicator (4D Universes)

```
+-------------------+
|  W: -2  -1  [0]  1  2  |  <- Current W-slice highlighted
+-------------------+
```

Or as a vertical slider on the side of the screen.

### Multiverse Selector (5D)

```
+-------------------+
| Universe: [Gravity Falls ▼]
|   - Dark Forest
|   - Flatland
|   - Normal Reality
+-------------------+
```

## LMI Integration

When an agent is in a 4D universe, the LMI injects dimensional context:

```typescript
// From DimensionalParadigms.ts
const context = generateDimensionalContext(
  universe.dimensions,      // 4
  agent.nativeDimensions,   // 3
  agent.dimensionalPerception,  // 'partial'
  agent.isFlattened         // false
);

// Injected into agent prompt:
// "You are in a 4D universe. You can perceive with effort the extra dimensions.
//  You can sense directions that others cannot. Hidden paths reveal themselves."
```

## Migration Path

### Phase 1: Configuration Only
- Add `dimensions` field to UniverseConfig
- Default all existing universes to 3D
- No renderer changes yet

### Phase 2: W as Parallax (Option A)
- In 4D universes, map entity W-coordinate to existing Z-parallax
- Add UI indicator for current W-slice
- Add scroll behavior for W-navigation

### Phase 3: Full W-Axis (Option B)
- Add explicit W-coordinate to Camera
- Separate W-parallax from Z-parallax
- Add new view modes for 4D cross-sections

### Phase 4: Multiverse (5D)
- Add universe selector UI
- Implement universe-crossing transitions
- Handle different magic paradigms per universe

## Hyperbolic Geometry for Higher Dimensions

Higher-dimensional universes (4D, 5D) use **hyperbolic geometry** rather than Euclidean. This is physically motivated: hyperbolic space allows finite-mass planets to exist (unlike Euclidean 4D+ where gravity behaves strangely).

### Why Hyperbolic?

In Euclidean space:
- 3D: Gravity falls off as 1/r² - planets work
- 4D+: Gravity falls off faster - orbits are unstable, planets collapse or fly apart

In hyperbolic space:
- Space itself curves away, providing natural "boundaries"
- Finite-seeming worlds can exist
- Distance works non-intuitively (more space "fits" at edges)

### Hyperbolic Distance Calculation

```typescript
/**
 * Calculate hyperbolic distance in the Poincaré disk model.
 * Points are in the unit disk (||p|| < 1).
 */
function hyperbolicDistance(a: Point, b: Point): number {
  const diffSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.w - b.w) ** 2;
  const aNormSquared = a.x ** 2 + a.y ** 2 + a.w ** 2;
  const bNormSquared = b.x ** 2 + b.y ** 2 + b.w ** 2;

  // Hyperbolic distance formula (Poincaré disk)
  const delta = 2 * diffSquared / ((1 - aNormSquared) * (1 - bNormSquared));
  return Math.acosh(1 + delta);
}
```

### Rendering Implications

- Objects near the "edge" of hyperbolic space appear compressed
- Straight lines appear curved (geodesics)
- HyperRogue handles this by rendering in a disk with edge distortion
- We can use similar techniques for W-axis visualization

## Multi-W-Slice Entities

Entities CAN span multiple W-slices. A 4D creature has "W-thickness" - you see different cross-sections as you scroll through W.

### Entity W-Extent

```typescript
interface Position4D {
  x: number;
  y: number;
  z: number;
  w: number;          // Center W-coordinate

  // Optional: entity spans multiple W-slices
  wExtent?: number;   // Half-width in W dimension
                      // Entity visible from w - wExtent to w + wExtent
}

// A 4D creature with wExtent: 2 centered at w: 5
// is visible in W-slices 3, 4, 5, 6, 7
// At w=5: full cross-section
// At w=3 or w=7: edge cross-section (smaller)
```

### Cross-Section Rendering

```typescript
function getEntityCrossSection(
  entity: Entity,
  cameraW: number
): CrossSection {
  const pos = entity.position as Position4D;
  const wDistance = Math.abs(cameraW - pos.w);
  const wExtent = pos.wExtent ?? 0;

  if (wDistance > wExtent) {
    return { visible: false };
  }

  // Entity is visible - calculate cross-section size
  // At center (wDistance=0): full size
  // At edge (wDistance=wExtent): minimal cross-section
  const crossSectionRatio = Math.sqrt(1 - (wDistance / wExtent) ** 2);

  return {
    visible: true,
    scale: crossSectionRatio,  // 1.0 at center, 0.0 at edge
    isEdge: wDistance > wExtent * 0.8,
  };
}
```

### Visual Example: 4D Creature Scrolling Through W

```
W-slice 3: (edge)     W-slice 5: (center)   W-slice 7: (edge)
    ○                      ●●●                    ○
   tiny                   full                   tiny
cross-section          cross-section         cross-section
```

## Vision Directionality (Future Feature)

Currently not implemented, but the design should accommodate it.

### 3D Vision
- Eyes face directions in X, Y, Z
- Field of view is a cone in 3D space

### 4D Vision
- Eyes can face W-ward directions too
- A 4D creature might have eyes pointing in +W and -W directions
- They can see "across" W-slices natively

### Flattening Effects on Vision
When a 4D creature is flattened to 3D:
- W-facing eyes become vestigial/compressed
- They lose the ability to see in W-directions
- Visually: extra eyes might appear as strange marks or closed slits
- Mechanically: perception in W-dimension is lost

```typescript
interface VisionComponent {
  // Current eyes and their facing directions
  eyes: Eye[];

  // After flattening, W-facing eyes are marked
  flattenedEyes?: {
    originalDirection: Vector4D;
    vestigialAppearance: 'scar' | 'closed_slit' | 'mark' | 'none';
  }[];
}

interface Eye {
  position: Vector4D;        // Relative to entity center
  facing: Vector4D;          // Direction it looks
  fieldOfView: number;       // Cone angle in radians
  range: number;             // How far it can see
  dimensions: DimensionCount; // Which dimensions it perceives
}
```

## Pathfinding in Hyperbolic 4D

Pathfinding in hyperbolic 4D space requires modifications to standard A*.

### Approach: Hyperbolic A*

```typescript
interface PathNode4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

function findPath4D(
  start: PathNode4D,
  goal: PathNode4D,
  isHyperbolic: boolean
): PathNode4D[] {

  const heuristic = isHyperbolic
    ? hyperbolicDistance
    : euclideanDistance4D;

  // Standard A* with 4D neighbors
  const getNeighbors = (node: PathNode4D): PathNode4D[] => {
    const neighbors: PathNode4D[] = [];
    const deltas = [-1, 0, 1];

    // 4D has 80 neighbors (3^4 - 1), but we typically use 8 cardinal directions
    // For hyperbolic, we might use fewer due to space curvature
    for (const dx of deltas) {
      for (const dy of deltas) {
        for (const dz of deltas) {
          for (const dw of deltas) {
            if (dx === 0 && dy === 0 && dz === 0 && dw === 0) continue;

            const neighbor = {
              x: node.x + dx,
              y: node.y + dy,
              z: node.z + dz,
              w: node.w + dw,
            };

            // In hyperbolic space, check if this neighbor is valid
            // (may be beyond the disk boundary)
            if (!isHyperbolic || isValidHyperbolicPosition(neighbor)) {
              neighbors.push(neighbor);
            }
          }
        }
      }
    }

    return neighbors;
  };

  return aStar(start, goal, getNeighbors, heuristic);
}

function euclideanDistance4D(a: PathNode4D, b: PathNode4D): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2 +
    (a.w - b.w) ** 2
  );
}
```

### Performance Considerations

4D pathfinding is expensive:
- 3D: ~26 neighbors per node (3³ - 1)
- 4D: ~80 neighbors per node (3⁴ - 1)

Optimizations:
1. **Hierarchical pathfinding** - Coarse path in 4D, fine path in 3D slices
2. **W-slice caching** - Pre-compute paths within W-slices
3. **Lazy W-exploration** - Only explore W-neighbors when 3D path blocked
4. **Jump Point Search 4D** - Extend JPS algorithm to 4D

### Agent W-Navigation Behavior

Agents should prefer staying in their current W-slice unless:
- Goal is in a different W-slice
- 3D path is blocked but W-detour exists
- Agent has dimensional perception skill (can see W-paths)

```typescript
function shouldExploreWDimension(
  agent: Entity,
  goal: Position4D,
  currentW: number
): boolean {
  // Always explore if goal is in different W-slice
  if (Math.abs(goal.w - currentW) > 0.5) return true;

  // Explore if agent has dimensional perception
  const perception = agent.getComponent('dimensional_perception');
  if (perception && perception.level >= 'partial') return true;

  // Otherwise, only explore W if stuck in current slice
  return agent.isStuckIn3D();
}
```

## Resolved Design Decisions

1. ✅ **Hyperbolic geometry** for 4D+ universes (physically motivated)
2. ✅ **Entities span multiple W-slices** with wExtent property
3. ✅ **Vision directionality** planned for future, design accommodates it
4. ✅ **Pathfinding** uses hyperbolic A* with W-dimension neighbors
5. ✅ **Keybindings** scale with Shift/Cmd/Alt/Ctrl modifiers

## Remaining Open Questions

1. **W-axis boundaries:** Hard edge vs soft falloff vs wrap?
2. **Performance budget:** Max W-slices to render simultaneously?
3. **Hyperbolic rendering:** Poincaré disk vs half-plane model?
4. **Cross-universe pathfinding:** Can agents path through 5D multiverse?

## References

- HyperRogue (hyperbolic space handling)
- Miegakure (4D puzzle game)
- Flatland (dimensional perception concepts)
- Existing ViewMode.ts, Camera.ts implementation
- DimensionalParadigms.ts (magic system integration)
