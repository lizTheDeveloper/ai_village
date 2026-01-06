# Ringworld Implementation Guide

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06
**Inspired by:** Larry Niven's Ringworld series

## The Magic Trick

**What players see:** A massive, ancient ringworld with shadow squares, rim walls, orbital tethers, and millions of unique regions.

**What you build:** A flat 2D world with region swapping, procedural generation, and some clever UI.

## The Secret

You don't need to implement **any** ringworld topology. Just:

1. ✅ Generate flat regions procedurally
2. ✅ Swap regions when player crosses boundaries
3. ✅ Show a skybox with ring curvature
4. ✅ Add UI showing ringworld stats
5. ✅ Store only deltas (player changes)

**Result:** Players think they're on a ringworld. They never know it's just flat regions!

## Larry Niven's Ringworld Elements

### Core Megastructure Features

```typescript
const RINGWORLD_LORE = {
  // The Ring itself
  structure: {
    diameter: '~300 million km (2 AU)',
    circumference: '9.6 million km',
    width: '1 million km',
    rimWallHeight: '3000 km',
    material: 'Scrith (super-strong gray material)',
    builders: 'Unknown (Pak Protectors in novels)',
    age: '~10,000 years since completion'
  },

  // Day/Night Cycle
  shadowSquares: {
    count: 20,
    size: '1.5M km × 1M km each',
    orbit: 'Geostationary above ring',
    purpose: 'Block sunlight to create 24-hour day/night cycle',
    material: 'Unknown black metamaterial',
    speed: 'Orbital velocity to stay above same spot'
  },

  // Atmosphere Retention
  rimWalls: {
    height: '3000 km (nearly vertical)',
    composition: 'Scrith + exotic matter',
    purpose: 'Keep atmosphere from spilling into space',
    features: ['Spill mountains', 'Breach points', 'Ancient gates']
  },

  // Access to Space
  spaceports: {
    types: ['Orbital tethers', 'Mass drivers', 'Launch ramps'],
    count: '~47 known (most non-functional)',
    examples: [
      'Fist-of-God mountain (meteor impact, now spaceport)',
      'The Great Ocean spaceport',
      'Builder maintenance stations'
    ]
  },

  // Stability Systems
  attitudeJets: {
    purpose: 'Prevent ring from drifting into sun',
    count: 'Thousands',
    status: 'Some functional, maintained by drones'
  },

  // Weather Control
  weatherTowers: {
    count: '~4000',
    purpose: 'Control regional climate',
    status: 'Degraded but mostly operational',
    power: 'Unknown energy source'
  },

  // Phenomena
  phenomena: [
    'The Great Ocean (massive body of water)',
    'The Map of Mars (region shaped like Mars)',
    'The Map of Earth (region shaped like Earth)',
    'The Fist-of-God mountain (3000km high meteor strike)',
    'Starseed lure (for interstellar ramships)',
    'Void breaches (reality instabilities)',
    'Temporal anomalies (Builder experiments)'
  ]
};
```

## Implementation Strategy

### 1. Flat World Foundation (What You Have Now)

```typescript
// Current implementation - already works!
class World {
  chunks: Map<string, Chunk>;

  getChunk(x: number, y: number): Chunk {
    // Infinite flat world
    const key = `${x},${y}`;
    if (!this.chunks.has(key)) {
      this.chunks.set(key, generateChunk(x, y));
    }
    return this.chunks.get(key)!;
  }
}

// This is ALL you need for the "ringworld"!
// Just add window dressing...
```

### 2. Add Hierarchical Coordinates (Optional)

```typescript
// Make it feel like a ringworld
interface RingworldAddress {
  megasegment: number;  // 0-999
  region: number;       // 0-99
  // ... but internally, just flat (x, y)
}

function prettyPrintLocation(x: number, y: number): string {
  const megaseg = Math.floor(x / 1_000_000);
  const region = Math.floor((x % 1_000_000) / 10_000);

  return `Megasegment ${megaseg}, Region ${region}`;
}

// Player at x=7,500,000:
// UI shows: "Megasegment 7, Region 50"
// Actually just: flat coordinate x=7,500,000
```

### 3. Add Skybox (The Visual Trick)

```typescript
class RingworldSkybox {
  render(ctx: CanvasRenderingContext2D) {
    // 1. Draw ring curving upward on horizon
    this.drawRingCurvature(ctx);

    // 2. Draw shadow square overhead (if it's "night")
    if (this.isNightTime()) {
      this.drawShadowSquare(ctx);
    }

    // 3. Draw distant rim walls
    this.drawRimWalls(ctx);

    // 4. Draw sun in center of sky (never moves)
    this.drawSun(ctx);
  }

  private drawRingCurvature(ctx: CanvasRenderingContext2D) {
    // Simple: draw two brown arcs on left/right edges
    ctx.fillStyle = 'rgba(100, 80, 60, 0.3)';

    // Left side curves up
    ctx.beginPath();
    ctx.moveTo(0, this.horizon);
    ctx.bezierCurveTo(0, this.horizon - 100, -50, 50, 0, 0);
    ctx.fill();

    // Right side curves up (mirror)
    ctx.beginPath();
    ctx.moveTo(this.width, this.horizon);
    ctx.bezierCurveTo(this.width, this.horizon - 100, this.width + 50, 50, this.width, 0);
    ctx.fill();

    // BOOM - looks like a ringworld!
  }
}
```

### 4. Add Megastructures UI

```typescript
class MegastructuresPanel {
  render() {
    // Show player's "position on ring"
    const pos = this.player.position;
    const megaseg = Math.floor(pos.x / 1_000_000);
    const distanceFromPrime = pos.x * 3; // meters

    return `
      Current Position: Megasegment ${megaseg}
      Distance from Prime: ${distanceFromPrime.toLocaleString()} km
      Progress around ring: ${(megaseg / 1000 * 100).toFixed(2)}%

      Next shadow square: 3h 12m
      Nearest spaceport: 48,000 km east
      Rim wall: 500 km north
    `;
  }
}
```

### 5. Add Region Templates (Procedural Variety)

```typescript
const TEMPLATES = [
  {
    id: 'ancient_spaceport',
    buildings: ['landing_dais', 'hangar', 'control_tower'],
    items: ['ray_gun', 'ancient_console', 'alien_artifact'],
    lore: 'Where the Builders once landed their ships'
  },
  {
    id: 'crystal_wastes',
    terrain: 'alien_crystals',
    items: ['crystal_shard', 'exotic_matter'],
    lore: 'A failed Builder experiment crystallized reality'
  },
  // ... 1000 more templates
];

function selectTemplate(megasegment: number, region: number): Template {
  const hash = (megasegment * 100 + region) % TEMPLATES.length;
  return TEMPLATES[hash];
}

// Each region gets deterministic template
// Infinite variety from procedural generation
```

### 6. Add Abstract Regions (Factorio-Style)

```typescript
// Only simulate active region
const activeRegion = loadRegion(currentMegaseg, currentRegion);

// Everything else is abstract
const otherRegions = new Map<string, AbstractRegion>();

otherRegions.set('megaseg_7_region_23', {
  population: 1000,
  production: { food: 500 },  // per day
  consumption: { food: 400 },
  // ... just numbers, no entities
});

// When player visits, hydrate from abstract state
// When player leaves, abstract current region
```

### 7. Add Delta Storage (Only Save Changes)

```typescript
// Don't save entire region
// Just save what player changed

const deltas = [
  { tick: 150000, action: 'item_removed', pos: {x:10,y:15}, item: 'ray_gun' },
  { tick: 150500, action: 'building_built', pos: {x:50,y:50}, type: 'tent' }
];

// Region state = ProcGen(seed) + deltas
// Storage: ~200 bytes instead of 5 MB!
```

## What Players Experience

### Journey Around the Ring

1. **Start:** "The Great Spire" (Megasegment 0)
   - Ancient comm tower, 2km tall
   - Tutorial area
   - Lore: "Prime Meridian of the Ring"

2. **Travel East:** Walk for hours
   - Discover new regions
   - Each feels unique (different templates)
   - UI shows distance traveled

3. **Megasegment 7:** "The Crystal Wastes"
   - Alien terrain
   - Hostile crystal entities
   - Exotic resources

4. **Megasegment 12:** "Ancient Spaceport Alpha"
   - High-tech ruins
   - Find ray guns, energy weapons
   - Orbital tether (climbable!)

5. **Megasegment 250:** "The Worldforge"
   - Builder factory still operational
   - Maintenance drones
   - Can craft Builder tech

6. **Megasegment 999:** "Terminus Station"
   - Edge of mapped regions
   - Beyond: unexplored ringworld

7. **Return to Megasegment 0:**
   - "You've circumnavigated the Ring!"
   - Achievement unlocked
   - Took 100+ hours real-time

### What Actually Happened

- Walked on flat 2D plane
- Region swapped ~1000 times
- Each region: ProcGen + templates
- UI convinced them it was a ring
- Never noticed the trick!

## Niven-Inspired Lore Snippets

### In-Game Encyclopedia Entries

```
THE BUILDERS
Who built the Ring? Nobody knows. Theories abound:
- Pak Protectors fleeing their dying homeworld
- An extinct species reaching for immortality
- Humans from the distant future
- Something... else

Evidence: Ancient machinery still runs. Maintenance
drones repair damage. Weather towers control climate.
Someone designed this. Someone is gone.

---

SHADOW SQUARES
Twenty massive rectangles orbit above the Ring,
blocking sunlight to create day/night cycles.

Material: Unknown. Absorbs 99.9% of light. Doesn't
reflect, doesn't radiate. Just... black.

When a shadow square passes overhead, temperature
drops 5°C. Animals seek shelter. Plants close.
And for 12 hours, you see stars - billions of them,
in a galaxy teeming with life.

But none of them answer our signals.

---

RIM WALLS
The Ring's atmosphere is held in by walls. Not
metaphorical walls. Actual walls. 3000 kilometers
high. Nearly vertical.

At the base: Spill Mountains, where atmosphere
pressure pushes against the wall. Constant wind.
Perpetual storms.

At the top: The Edge. Step off, and you fall into
space. No atmosphere. No air. Just void.

Why so high? What were the Builders afraid of?

---

FIST-OF-GOD MOUNTAIN
A meteor struck the Ring 800 years ago. Punched
through the floor. Created a mountain 3000km high.

The impact should have destroyed everything. It
didn't. The Ring... healed. Maintenance drones
swarmed. Scrith reformed. The breach sealed.

Now it's a spaceport. Ironic.

What could hit this structure and survive?
```

## 3D Visualization Potential

If you add 3D rendering later:

```typescript
class Ringworld3DView {
  renderRing() {
    // Camera in space, looking at ring
    // Shows:
    // - Massive hoop around central star
    // - Shadow squares orbiting above surface
    // - Player's location (tiny dot)
    // - Distant megastructures
    // - Rim walls catching sunlight

    // Players can rotate view, zoom in/out
    // Click on region to teleport (fast travel)
  }
}
```

This would look **incredible**. The ring stretching into infinity, shadow squares casting massive shadows, the sun blazing in the center...

## Summary: The Illusion vs Reality

| **What Players See** | **What You Actually Build** |
|----------------------|------------------------------|
| Ringworld 9.6M km around | Infinite flat 2D plane |
| Shadow squares overhead | Time-based lighting shader |
| Rim walls on horizon | Skybox texture |
| 1000 megasegments | Coordinate pretty-printing |
| Unique regions | Templates + seeds |
| Massive persistent world | Delta storage (200 KB) |
| Circumnavigation journey | Region swapping |
| Ancient Builder tech | Lore text + item IDs |

**Total complexity added:** ~1000 lines of code

**Perceived complexity:** Massive sci-fi megastructure

**The magic:** Players never realize it's smoke and mirrors! 🎭

## Next Steps

1. ✅ Read the specs (this + 3 other docs)
2. ✅ Implement hierarchical coordinates (optional)
3. ✅ Add ringworld skybox (visual magic)
4. ✅ Create megastructures UI
5. ✅ Build template library (50+ region types)
6. ✅ Implement delta storage
7. ✅ Add region abstraction (Factorio-style)
8. ✅ Write lore entries (Builder mystery)
9. ✅ Playtest: does it *feel* like a ringworld?

If step 9 passes, you've succeeded. The implementation is simple; the experience is the goal.
