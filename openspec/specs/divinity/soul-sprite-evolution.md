# Soul Sprite Evolution Across Incarnations

**Status**: Design/Planning
**Version**: 1.0
**Last Updated**: 2026-01-04

## Overview

Souls maintain a stable visual identity (sprite set) across all incarnations, but their sprite complexity evolves based on reincarnation count. This creates a visual progression system where older, wiser souls have more sophisticated sprites.

## Core Principle

**A soul's sprite is part of its immutable identity**, just like its name, archetype, and purpose. The sprite evolves in complexity with each reincarnation, but the base appearance (colors, features) remains consistent.

## Sprite Evolution Stages

### First Incarnation (Reincarnation Count: 0)

**Sprite Complexity**: 1 direction (south only)

- **Visual**: Flat sprite, always faces the player
- **Directions**: South only (1 PNG)
- **Behavior**: Never rotates, no directional sprites
- **Appearance**: Simple, frontal view
- **Technical**: Single `south.png` file

**Example**:
```
soul-sprites/cedar-builder/
└── rotations/
    └── south.png          # Only sprite available
```

**Gameplay**:
- Soul appears as a simple, flat character
- Always faces "toward the camera"
- Limited visual feedback for movement
- Represents a "new" soul with minimal experience

### Second Incarnation (Reincarnation Count: 1)

**Sprite Complexity**: 4 directions (N, E, S, W)

- **Visual**: Can turn to face cardinal directions
- **Directions**: North, East, South, West (4 PNGs)
- **Behavior**: Rotates to face movement direction
- **Appearance**: Same colors/features as first incarnation, now with side/back views
- **Technical**: 4 sprite files

**Example**:
```
soul-sprites/cedar-builder/
└── rotations/
    ├── south.png          # Original sprite
    ├── north.png          # Back view (new)
    ├── east.png           # Right side view (new)
    └── west.png           # Left side view (new)
```

**Gameplay**:
- Soul can now turn to face different directions
- Improved spatial awareness
- Better visual feedback for movement
- Represents a soul that has "learned" directionality from first life

### Third-Ninth Incarnation (Reincarnation Count: 2-9)

**Sprite Complexity**: 8 directions (full rotational sprite set)

- **Visual**: Full 360° rotation with smooth transitions
- **Directions**: S, SW, W, NW, N, NE, E, SE (8 PNGs)
- **Behavior**: Smooth rotation in all directions
- **Appearance**: Same colors/features, now with diagonal views
- **Technical**: 8 static sprite files (no animation)

**Example**:
```
soul-sprites/cedar-builder/
└── rotations/
    ├── south.png          # Original
    ├── south-west.png     # New diagonal
    ├── west.png           # From second incarnation
    ├── north-west.png     # New diagonal
    ├── north.png          # From second incarnation
    ├── north-east.png     # New diagonal
    ├── east.png           # From second incarnation
    └── south-east.png     # New diagonal
```

**Gameplay**:
- Full directional control
- Smooth, professional-looking movement
- Represents an "ancient" soul with many lifetimes of experience
- Visual indicator of soul wisdom/age

### Tenth+ Incarnation (Reincarnation Count: 10+) - Progressive Animation System

**Animation Complexity**: Progressive animation unlocks

Starting at the 10th incarnation, souls unlock **animations** progressively. **Each incarnation unlocks either a new animation type OR a new direction for an existing animation type.**

#### Animation Types

**Available Animations** (unlock order is flexible based on soul actions/archetype):
- **Walking**: Movement animation (8 directions possible)
- **Idle**: Breathing, subtle movement when standing still (8 directions)
- **Attack**: Combat strike animation (8 directions)
- **Crafting**: Hammering, sawing, building animation (typically south-facing)
- **Harvesting**: Gathering resources, farming (8 directions)
- **Casting**: Magic spell casting gesture (8 directions)
- **Mining**: Pickaxe swing (8 directions)
- **Fishing**: Casting rod animation (typically south-facing)
- **Cooking**: Stirring pot, preparing food (typically south-facing)
- **Death**: Falling/collapse animation (1 direction)
- **Celebration**: Victory/joy animation (typically south-facing)

#### Progressive Unlock System

**Each incarnation unlocks ONE new animation slot:**

**Example Progression** (actual order varies by soul actions):
- **Incarnation 10**: Walk-South (4 frames)
- **Incarnation 11**: Walk-North (4 frames)
- **Incarnation 12**: Walk-East (4 frames)
- **Incarnation 13**: Walk-West (4 frames)
- **Incarnation 14**: Idle-South (2 frames, breathing effect)
- **Incarnation 15**: Attack-South (3 frames)
- **Incarnation 16**: Walk-SW (4 frames, first diagonal walk)
- **Incarnation 17**: Crafting-South (4 frames)
- **Incarnation 18**: Walk-NW (4 frames)
- **Incarnation 19**: Harvesting-South (3 frames)
- **Incarnation 20**: Walk-NE (4 frames)
- ...and so on

**Legendary Souls** (50+ incarnations) might have:
- Full 8-direction walk cycle
- Full 8-direction attack cycle
- Idle animations in all 8 directions
- Specialized animations (crafting, harvesting, casting, mining)
- Death animation
- Celebration animation

**Technical**:
```
soul-sprites/cedar-builder/
├── rotations/          # Static sprites (from incarnations 0-9)
│   ├── south.png
│   ├── north.png
│   └── ... (all 8 directions)
└── animations/
    ├── walk/
    │   ├── south/      # Incarnation 10
    │   │   ├── frame-1.png
    │   │   ├── frame-2.png
    │   │   ├── frame-3.png
    │   │   └── frame-4.png
    │   ├── north/      # Incarnation 11
    │   ├── east/       # Incarnation 12
    │   ├── west/       # Incarnation 13
    │   ├── south-west/ # Incarnation 16
    │   └── ... (more directions unlock over time)
    ├── idle/
    │   ├── south/      # Incarnation 14
    │   │   ├── frame-1.png
    │   │   └── frame-2.png
    │   └── ... (more directions unlock)
    ├── attack/
    │   ├── south/      # Incarnation 15
    │   │   ├── frame-1.png
    │   │   ├── frame-2.png
    │   │   └── frame-3.png
    │   └── ... (more directions unlock)
    ├── crafting/
    │   └── south/      # Incarnation 17
    ├── harvesting/
    │   └── south/      # Incarnation 19
    ├── casting/
    │   └── south/      # Later incarnations
    └── ... (more animation types unlock)
```

**Unlock Strategy**:
- **Priority 1**: Core actions first (walk, idle, attack in primary directions)
- **Priority 2**: Archetype-specific animations (builders get crafting early, farmers get harvesting early)
- **Priority 3**: Diagonal directions for existing animations
- **Priority 4**: Rare/special animations (celebration, death, unique archetype actions)

**Gameplay**:
- Souls with 10+ incarnations start showing animated movement
- Souls with 20+ incarnations have rich animation sets matching their archetype
- Souls with 50+ incarnations are **legendary** - full animation suites in all directions
- Players can instantly recognize ancient souls by their animation richness
- Each soul's animation progression tells a story of their lived experiences

## Sprite Stability Across Incarnations

### What Stays the Same

- **Base appearance**: Colors, proportions, facial features
- **Archetype visual theme**: Builder souls look like builders, healers look like healers
- **Sprite style**: Outline, shading, detail level

### What Changes

- **Number of directional sprites**: 1 → 4 → 8 based on reincarnation count (incarnations 0-9)
- **Walking animations**: Progressive unlock starting at incarnation 10, one direction per incarnation (10-17)
- **Animation quality**: Souls with 17+ incarnations have full 8-direction animated walk cycles
- **Visual effects** (optional): Subtle aura/glow for legendary souls

## PixelLab API Implementation Tiers

### Tier 1: Static Directional Sprites (Incarnations 0-9) - **FULLY SUPPORTED**

Uses `create_character` API with `n_directions` parameter.

**Incarnation 0**: `n_directions: 1` (south only)
**Incarnation 1**: `n_directions: 4` (N, E, S, W)
**Incarnations 2-9**: `n_directions: 8` (full rotation)

**PixelLab API Call**:
```typescript
const character = await pixellab.create_character({
  description: "stocky builder with brown overalls",
  n_directions: 8,  // 1, 4, or 8
  size: 48,
  view: "low top-down"
});
```

**Status**: ✅ Implemented (see `scripts/pixellab-daemon.ts`)

---

### Tier 2: Walking Animations (Incarnations 10-17) - **FULLY SUPPORTED**

Uses `animate_character` API with walking template animations.

**Available PixelLab Walking Templates**:
- `walking-4-frames` (recommended - compact)
- `walking-6-frames` (medium)
- `walking-8-frames` (smooth)
- `walking` (variant)
- `walk-1`, `walk-2` (additional variants)
- `running-4-frames`, `running-6-frames`, `running-8-frames` (faster movement)

**PixelLab API Call**:
```typescript
const animation = await pixellab.animate_character({
  character_id: soulCharacterId,
  template_animation_id: "walking-8-frames",
  action_description: "walking steadily forward"
});
```

**Generates**: All 8 directions automatically (N, NE, E, SE, S, SW, W, NW)

**Progressive Unlock**:
- Incarnation 10: Generate walking animation (unlocks all 8 directions at once)
- Note: PixelLab generates all directions simultaneously, so we display them progressively:
  - Incarnation 10: Show only South walk
  - Incarnation 11: Show South + North
  - Incarnation 12: Show South + North + East
  - Incarnation 13: Show South + North + East + West
  - Incarnations 14-17: Show diagonal directions

**Status**: ✅ API supported, needs renderer integration

---

### Tier 3: Idle Animations (Incarnations 18-25) - **FULLY SUPPORTED**

**Available PixelLab Idle Templates**:
- `breathing-idle` (subtle breathing effect)
- `fight-stance-idle-8-frames` (combat-ready pose)

**PixelLab API Call**:
```typescript
const idleAnim = await pixellab.animate_character({
  character_id: soulCharacterId,
  template_animation_id: "breathing-idle",
  action_description: "standing calmly, breathing gently"
});
```

**Progressive Unlock**: Same as walking - generate once, reveal directions progressively over 8 incarnations.

**Status**: ✅ API supported, needs renderer integration

---

### Tier 4: Combat Animations (Incarnations 26-50) - **FULLY SUPPORTED**

**Available PixelLab Combat Templates**:
- `cross-punch`, `lead-jab`, `surprise-uppercut` (punching)
- `high-kick`, `roundhouse-kick`, `flying-kick`, `hurricane-kick`, `leg-sweep` (kicking)
- `taking-punch`, `falling-back-death` (reactions)

**Example**:
```typescript
const attackAnim = await pixellab.animate_character({
  character_id: soulCharacterId,
  template_animation_id: "cross-punch",
  action_description: "throwing a quick cross punch"
});
```

**Progressive Unlock**:
- Incarnation 26: Cross-punch (south)
- Incarnation 27: Cross-punch (north)
- ...
- Incarnation 34: Roundhouse-kick (south)
- etc.

**Status**: ✅ API supported, needs renderer integration

---

### Tier 5: Action Animations (Incarnations 50-100) - **FULLY SUPPORTED**

**Available PixelLab Action Templates**:
- `picking-up` (gathering items)
- `pushing`, `pull-heavy-object` (moving objects)
- `drinking` (consuming items)
- `throwing-object` (ranged actions)
- `crouching`, `crouched-walking` (stealth)
- `jumping-1`, `jumping-2`, `two-footed-jump` (vertical movement)

**Example**:
```typescript
const harvestAnim = await pixellab.animate_character({
  character_id: soulCharacterId,
  template_animation_id: "picking-up",
  action_description: "bending down to gather berries"
});
```

**Status**: ✅ API supported, needs renderer integration

---

### Tier 6: Special/Emotional Animations (Incarnations 100+) - **FULLY SUPPORTED**

**Available PixelLab Special Templates**:
- `sad-walk`, `scary-walk` (emotional movement)
- `backflip`, `front-flip` (acrobatic)
- `fireball` (magic casting)
- `running-jump`, `running-slide` (advanced movement)
- `getting-up` (recovery)

**Status**: ✅ API supported, needs renderer integration

---

### Recommended Implementation Order

**Phase 1** (MVP):
1. Static directional sprites (Tier 1) - ✅ Already implemented
2. Walking animations (Tier 2) - Next priority
3. Idle animations (Tier 3) - Low-hanging fruit

**Phase 2** (Combat Update):
4. Combat animations (Tier 4) - Punches, kicks, deaths

**Phase 3** (Actions Update):
5. Action animations (Tier 5) - Picking up, crafting, harvesting

**Phase 4** (Polish):
6. Special/Emotional animations (Tier 6) - Fireball, flips, emotional walks

---

## Implementation Details

### Sprite Generation

**First Incarnation**:
```typescript
// Generate 1-direction sprite set
const sprite = await pixelLab.createCharacter({
  description: soulData.appearance,
  n_directions: 1,  // Only south
  // ... other params
});
```

**Second Incarnation** (reuse + expand):
```typescript
// Reuse south.png from first incarnation
// Generate additional 3 directions (N, E, W)
const expandedSprite = await pixelLab.expandCharacterDirections({
  existingSouthSprite: soul.spriteData.south,
  targetDirections: 4,
  // Ensures same appearance/style
});
```

**Third+ Incarnation** (reuse + expand):
```typescript
// Reuse N, E, S, W from second incarnation
// Generate additional 4 diagonal directions
const fullSprite = await pixelLab.expandCharacterDirections({
  existingSprites: soul.spriteData,  // N, E, S, W
  targetDirections: 8,
  // Ensures same appearance/style
});
```

### Soul Record Storage

```json
{
  "soulId": "uuid",
  "name": "Cedar",
  "archetype": "builder",
  "spriteFolder": "cedar-builder",
  "spriteEvolution": {
    "currentDirections": 4,
    "baseAppearance": {
      "description": "Stocky humanoid with brown overalls and tool belt",
      "primaryColor": "#8B4513",
      "secondaryColor": "#DEB887",
      "features": ["square jaw", "calloused hands", "measuring tape"]
    },
    "generatedSprites": {
      "south": "sprites/cedar-builder/rotations/south.png",
      "north": "sprites/cedar-builder/rotations/north.png",
      "east": "sprites/cedar-builder/rotations/east.png",
      "west": "sprites/cedar-builder/rotations/west.png"
    }
  },
  "reincarnationCount": 1,
  "purpose": "To construct shelters and bring order to chaos",
  "interests": ["crafting", "building", "architecture"]
}
```

### Sprite Evolution Trigger

**When a soul reincarnates**:

1. Check current `reincarnationCount`
2. Determine required sprite directions:
   - Count 0 → 1 direction
   - Count 1 → 4 directions
   - Count 2+ → 8 directions
3. If current sprites < required:
   - Generate missing directions
   - Update soul record
   - Save to repository
4. Assign sprites to new incarnation

### Visual Progression Example

```
Cedar the Builder's Journey:

Life 1 (Medieval Kingdom):
  └─ Flat sprite, always faces south
  └─ Static sprite, no rotation
  └─ Dies at age 45

Life 2 (Space Colony):
  └─ Now has N, E, S, W sprites
  └─ Can turn to face direction of movement
  └─ Static sprites, no animation
  └─ Dies at age 62

Life 3 (Underwater City):
  └─ Full 8-direction sprite set
  └─ Smooth rotation in all directions
  └─ Static sprites, professional appearance
  └─ Dies at age 71

Life 4-10 (Various Worlds):
  └─ Continues with 8-direction static sprites
  └─ Soul grows wiser, but visual remains stable
  └─ Dies in each life, reincarnates 6 more times

Life 11 (Crystal Caverns):
  └─ Walking animation UNLOCKED for South direction!
  └─ First animated movement - legs move when walking south
  └─ Still static sprites for other 7 directions
  └─ Dies at age 89

Life 12-17 (Across the Multiverse):
  └─ Each life unlocks one more animated direction
  └─ Life 12: +North animation
  └─ Life 13: +East animation
  └─ Life 14: +West animation (all 4 cardinals animated)
  └─ Life 15-18: Diagonal animations unlock

Life 18+ (Legendary Soul):
  └─ Full 8-direction animated walk cycles
  └─ Smooth animated movement in any direction
  └─ Ultimate visual marker of an ancient, legendary soul
  └─ Players recognize Cedar instantly by animated walk
```

## Design Rationale

### Why Link Sprites to Reincarnation?

1. **Visual Progression**: Players can see soul age at a glance
2. **Reward for Longevity**: Souls that live many lives get better sprites
3. **Performance Trade-off**: New souls use fewer sprite resources (1 direction vs 8)
4. **Narrative Significance**: Sprite complexity reflects soul wisdom
5. **Technical Simplicity**: Gradual sprite generation spreads API costs over time

### Why These Specific Thresholds?

- **1 direction (first life)**: Minimal viable sprite, lowest cost/complexity
- **4 directions (second life)**: Major improvement, enables basic rotation
- **8 directions (third+ life)**: Professional quality, full movement freedom
- **No further evolution**: 8 directions is the maximum, maintains consistency

## Integration with Soul Repository

### Sprite Persistence

Sprites are stored **with the soul** in the repository:

```
soul-repository/
├── by-date/2026-01-04/{soul-id}.json     # Soul record with sprite paths
└── sprites/
    └── cedar-builder/
        └── rotations/
            ├── south.png      # Always present
            ├── north.png      # Added after reincarnation 1
            ├── east.png       # Added after reincarnation 1
            ├── west.png       # Added after reincarnation 1
            ├── south-west.png # Added after reincarnation 2
            ├── north-west.png # Added after reincarnation 2
            ├── north-east.png # Added after reincarnation 2
            └── south-east.png # Added after reincarnation 2
```

### Cross-Universe Sprite Sharing

When a soul appears in multiple universes:
- **Same sprite folder** used in all universes
- **Same appearance** across all incarnations
- **Sprite evolution** persists globally (if Cedar has 8 directions in Universe A, also has 8 in Universe B)

## Player Experience

### What Players See

**New Player (Universe 1, Day 1)**:
- Creates 5 agents → 5 new souls with 1-direction sprites
- All agents appear flat, always facing south
- Visually simple, but functional

**Same Player (Universe 1, Year 2)**:
- Original 5 agents die and reincarnate
- Now have 4-direction sprites, can turn N/E/S/W
- Visual upgrade shows progression

**Different Player (Universe 2, Day 1)**:
- Gets Cedar from repository (reincarnation count: 2)
- Cedar arrives with full 8-direction sprite set
- Immediately has smooth rotation
- Recognizable as an "ancient" soul

## Future Enhancements

### Optional Advanced Features

1. **Animation Frames**: More idle/walk frames with higher incarnations
2. **Visual Effects**: Subtle glow/aura for souls with many incarnations
3. **Sprite Quality**: Higher resolution sprites for ancient souls
4. **Accessories**: Souls "collect" visual accessories across lives
5. **Aging**: Subtle aging effects that persist across incarnations

## Related Systems

- **SoulRepositorySystem**: Stores sprite paths and evolution state
- **ReincarnationSystem**: Triggers sprite evolution checks
- **PixelLab Integration**: Generates new directional sprites
- **Renderer**: Displays appropriate sprite based on movement direction

## Testing Scenarios

### Scenario 1: First Incarnation

1. Create new soul "Maple"
2. Verify only `south.png` exists
3. Verify sprite doesn't rotate, always faces player
4. Agent dies

### Scenario 2: Second Incarnation

1. Maple reincarnates (reincarnation count: 1)
2. System checks: needs 4 directions, currently has 1
3. Generates N, E, W sprites (matching south appearance)
4. Verify Maple can now turn in 4 directions

### Scenario 3: Cross-Universe Consistency

1. Maple dies in Universe A (reincarnation count: 2, has 8 directions)
2. New game starts in Universe B
3. Maple gets reused from repository
4. Verify Maple arrives in Universe B with 8-direction sprite set
5. Verify appearance matches Universe A

## Conclusion

Soul sprite evolution creates a **visual progression system** that:
- Rewards soul longevity with better sprites
- Provides visual feedback for soul age/wisdom
- Maintains sprite consistency across universes
- Gradually generates sprite assets over time
- Creates meaningful visual differentiation between new and ancient souls

This system reinforces the core principle: **souls are persistent, evolving entities** that transcend individual games and grow more sophisticated with each lifetime.
