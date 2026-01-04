# Soul Sprite Progression System

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-04
**Domain:** Soul System, Rendering, Reincarnation

## Overview

The Soul Sprite Progression System creates a visual representation of soul evolution through reincarnation. As souls reincarnate and gain experience across lifetimes, their avatar sprites become progressively more detailed, gaining directional views, animations, and higher resolution.

This system creates immediate visual feedback about a soul's age and wisdom, reinforcing the game's themes of spiritual growth and karmic progression.

## Core Principle

**Visual complexity reflects spiritual complexity.** A soul's sprite detail level directly corresponds to their reincarnation count, creating an at-a-glance indicator of soul maturity.

## Scope: Ensouled Beings Only

**IMPORTANT:** This progression system applies ONLY to ensouled beings (agents with souls).

**Animals are NOT subject to this progression:**
- Animals always render with maximum quality sprites
- **Resolution:** 64×64 pixels
- **Directions:** 8 (full directional support)
- **Animations:** All available animations (walking, running, idle, etc.)
- **Detail Level:** High detail
- **Shading:** Detailed shading

**Why this distinction?**
- Animals don't reincarnate in the soul system - they are biological entities only
- Visual progression represents spiritual growth, which only applies to souls
- Animals need to look polished and detailed regardless of "age"
- Ensouled beings start simple and evolve visually as their souls mature

**Entity Type Detection:**
```typescript
function shouldUseSoulProgression(entity: Entity): boolean {
  // Only entities with soul component use progression
  return entity.hasComponent('soul');
}

function getSpriteQuality(entity: Entity): SpriteConfig {
  if (!shouldUseSoulProgression(entity)) {
    // Animals and non-ensouled entities: maximum quality
    return {
      size: 64,
      directions: 8,
      animations: ['walking-8-frames', 'running-8-frames', 'breathing-idle'],
      detail: 'high detail',
      shading: 'detailed shading'
    };
  }

  // Ensouled beings: progression based on reincarnation count
  const soul = entity.getComponent('soul');
  const tier = calculateSpriteTier(soul.reincarnationCount);
  return getSpriteConfig(tier);
}
```

## Progression Tiers

### Tier 1: Newborn Soul (Incarnation 1)
**Visual Characteristics:**
- **Resolution:** 16×16 pixels
- **Directions:** 1 (south-facing only)
- **Animations:** None (static sprite)
- **Detail Level:** Low detail, simple shapes
- **Outline:** Single color outline
- **Shading:** Flat shading

**Behavior:**
- Entity always rendered facing south regardless of movement direction
- No directional turning
- Simplest possible sprite generation

**Generation Parameters:**
```typescript
{
  size: 16,
  n_directions: 1,  // South only
  detail: "low detail",
  shading: "flat shading",
  outline: "single color outline"
}
```

### Tier 2: Young Soul (Incarnation 2)
**Visual Characteristics:**
- **Resolution:** 24×24 pixels
- **Directions:** 4 (north, south, east, west)
- **Animations:** None (static sprites)
- **Detail Level:** Low-medium detail
- **Outline:** Single color outline
- **Shading:** Basic shading

**Behavior:**
- Entity faces cardinal direction of movement
- No diagonal directions (northeast movement shows as north or east)
- Static pose in all directions

**Generation Parameters:**
```typescript
{
  size: 24,
  n_directions: 4,
  detail: "low detail",
  shading: "basic shading",
  outline: "single color outline"
}
```

### Tier 3: Maturing Soul (Incarnation 3)
**Visual Characteristics:**
- **Resolution:** 32×32 pixels
- **Directions:** 8 (all cardinal + diagonals)
- **Animations:** None (static sprites)
- **Detail Level:** Medium detail
- **Outline:** Single color outline
- **Shading:** Medium shading

**Behavior:**
- Full 8-directional facing
- Accurate direction representation for all movement
- Still no movement animation

**Generation Parameters:**
```typescript
{
  size: 32,
  n_directions: 8,
  detail: "medium detail",
  shading: "medium shading",
  outline: "single color outline"
}
```

### Tier 4: Experienced Soul (Incarnation 4)
**Visual Characteristics:**
- **Resolution:** 40×40 pixels
- **Directions:** 8
- **Animations:** Walking (8-frame, all 8 directions)
- **Detail Level:** Medium detail
- **Shading:** Medium shading

**New Capability:** First animated movement

**Generation Parameters:**
```typescript
{
  size: 40,
  n_directions: 8,
  detail: "medium detail",
  shading: "medium shading",
  animations: ["walking-8-frames"]
}
```

### Tier 5: Seasoned Soul (Incarnation 5)
**Visual Characteristics:**
- **Resolution:** 48×48 pixels
- **Directions:** 8
- **Animations:** Walking, Running
- **Detail Level:** Medium-high detail
- **Shading:** Detailed shading

**New Capability:** Running animation for faster movement

**Generation Parameters:**
```typescript
{
  size: 48,
  n_directions: 8,
  detail: "medium detail",
  shading: "detailed shading",
  animations: ["walking-8-frames", "running-8-frames"]
}
```

### Tier 6: Wise Soul (Incarnation 6)
**Visual Characteristics:**
- **Resolution:** 56×56 pixels
- **Directions:** 8
- **Animations:** Walking, Running, Breathing Idle
- **Detail Level:** High detail
- **Shading:** Detailed shading

**New Capability:** Idle breathing animation when stationary

**Generation Parameters:**
```typescript
{
  size: 56,
  n_directions: 8,
  detail: "high detail",
  shading: "detailed shading",
  animations: ["walking-8-frames", "running-8-frames", "breathing-idle"]
}
```

### Tier 7: Ancient Soul (Incarnation 7)
**Visual Characteristics:**
- **Resolution:** 64×64 pixels
- **Directions:** 8
- **Animations:** Walking, Running, Breathing Idle, Attack/Action
- **Detail Level:** High detail
- **Shading:** Detailed shading
- **Outline:** Selective outline (more refined)

**New Capability:** Combat/action animations

**Generation Parameters:**
```typescript
{
  size: 64,
  n_directions: 8,
  detail: "high detail",
  shading: "detailed shading",
  outline: "selective outline",
  animations: ["walking-8-frames", "running-8-frames", "breathing-idle", "cross-punch"]
}
```

### Tier 8+: Transcendent Soul (Incarnation 8+)
**Visual Characteristics:**
- **Resolution:** 64×64 pixels (maximum)
- **Directions:** 8
- **Animations:** Full set (walking, running, idle, multiple attacks)
- **Detail Level:** High detail
- **Shading:** Highly detailed shading
- **Outline:** Selective outline
- **Special Effects:** Possible aura/glow (future enhancement)

**Progression:** Each additional incarnation adds one more animation:
- 8th: Jump animation
- 9th: Defensive animation
- 10th: Special ability animation
- 11th+: Unique flourishes, particle effects, visual distinction

## Technical Implementation

### 1. Soul Component Extension

Add reincarnation tracking to soul component:

```typescript
interface SoulComponent {
  // Existing fields...
  reincarnationCount: number;
  totalLives: number;
  spriteComplexityTier: number;  // Derived from reincarnationCount
  currentSpriteId?: string;      // Reference to generated sprite
}
```

### 2. Sprite Tier Calculation

```typescript
function calculateSpriteTier(reincarnationCount: number): number {
  return Math.min(reincarnationCount, 8);  // Max tier 8
}

function getSpriteConfig(tier: number): SpriteConfig {
  const configs: Record<number, SpriteConfig> = {
    1: { size: 16, directions: 1, animations: [], detail: "low" },
    2: { size: 24, directions: 4, animations: [], detail: "low" },
    3: { size: 32, directions: 8, animations: [], detail: "medium" },
    4: { size: 40, directions: 8, animations: ["walking-8-frames"], detail: "medium" },
    5: { size: 48, directions: 8, animations: ["walking-8-frames", "running-8-frames"], detail: "medium" },
    6: { size: 56, directions: 8, animations: ["walking-8-frames", "running-8-frames", "breathing-idle"], detail: "high" },
    7: { size: 64, directions: 8, animations: ["walking-8-frames", "running-8-frames", "breathing-idle", "cross-punch"], detail: "high" },
    8: { size: 64, directions: 8, animations: ["walking-8-frames", "running-8-frames", "breathing-idle", "cross-punch", "jumping-1"], detail: "high" },
  };
  return configs[tier] || configs[8];
}
```

### 3. Sprite Generation Triggers

Sprites are generated at these events:
1. **Soul Creation** - Generate Tier 1 sprite
2. **Reincarnation** - Generate sprite for new tier if tier increased
3. **Manual Regeneration** - Admin/debug command to regenerate sprite

### 4. Sprite Caching Strategy

```typescript
// Cache key format: `soul_{soulId}_tier_{tier}`
const cacheKey = `soul_${soulId}_tier_${tier}`;

// Storage location: `/assets/sprites/souls/{soulId}/tier_{tier}/`
const spritePath = `/assets/sprites/souls/${soulId}/tier_${tier}/`;
```

**Cache Policy:**
- Generated sprites persist across sessions
- Stored in IndexedDB (browser) or filesystem (server)
- Never regenerate unless explicitly requested
- Link sprite to soul ID + tier, not individual incarnation

### 5. Renderer Integration

Modify rendering logic to respect tier limitations for ensouled beings:

```typescript
function renderEntity(entity: Entity, direction: Direction) {
  // Check if entity has a soul (ensouled being vs animal)
  if (!entity.hasComponent('soul')) {
    // Animals and non-ensouled entities: use full-quality sprite with no limitations
    renderAnimalEntity(entity, direction);
    return;
  }

  // Ensouled beings: use tier-based progression
  const soul = entity.getComponent('soul');
  const tier = calculateSpriteTier(soul.reincarnationCount);
  const config = getSpriteConfig(tier);

  // Limit direction based on tier
  const effectiveDirection = limitDirection(direction, config.directions);

  // Select animation based on tier and state
  const animation = selectAnimation(entity.state, config.animations);

  // Render with tier-appropriate sprite
  renderSprite(soul.currentSpriteId, effectiveDirection, animation);
}

function renderAnimalEntity(entity: Entity, direction: Direction) {
  // Animals always get full 8-direction support and all animations
  // No direction limiting, no animation restrictions
  const spriteId = entity.getComponent('sprite')?.spriteId;
  const animation = selectAnimalAnimation(entity.state);
  renderSprite(spriteId, direction, animation);
}

function limitDirection(direction: Direction, maxDirections: number): Direction {
  if (maxDirections === 1) return Direction.South;
  if (maxDirections === 4) return snapToCardinal(direction);
  return direction;  // 8 directions - no limiting
}
```

### 6. Performance Considerations

**Sprite Generation Queue:**
- Don't block reincarnation waiting for sprite generation
- Queue sprite generation as background task
- Use fallback sprite (previous tier) until new sprite ready
- Show loading indicator on entity if desired

**Memory Management:**
- Unload sprites for souls not currently incarnated
- Keep only active incarnation sprites in memory
- Cache metadata (tier, size, animations) separately from image data

## Integration Points

### With Reincarnation System
- **Event:** `soul_reincarnated`
- **Action:** Check if tier increased, queue sprite generation if needed
- **Data:** Previous tier, new tier, soul appearance traits

### With Soul Creation
- **Event:** `soul_created`
- **Action:** Generate Tier 1 sprite
- **Data:** Soul traits (species, appearance, etc.)

### With Save/Load System
- **Save:** Store soul sprite cache references
- **Load:** Restore sprite cache, regenerate if missing

### With Appearance System
- **Genetics Integration:** Tier 1-3 sprites use basic genetics (species, colors)
- **Evolution:** Higher tiers may show unique features developed over lifetimes
- **Consistency:** Same soul always generates visually similar sprites across tiers

## Visual Design Guidelines

### Consistency Across Tiers
- Same soul should be recognizable across all tiers
- Core color palette remains consistent
- Species/form identity preserved
- Details accumulate, don't replace

### Progressive Enhancement
- Tier 1: Simple silhouette with basic color
- Tier 2-3: Add basic features (eyes, limbs clearly defined)
- Tier 4-5: Add clothing/equipment details
- Tier 6-7: Add textures, patterns, accessories
- Tier 8+: Add special effects, unique flourishes

### Animation Quality Progression
- Early animations (Tier 4-5): Simple, functional
- Mid animations (Tier 6-7): Smoother, more frames
- Late animations (Tier 8+): Polished, personality-driven

## Future Enhancements

### Phase 2: Visual Effects
- Aura colors based on karma alignment
- Particle effects for ancient souls (8+ incarnations)
- Glow intensity based on spiritual power level

### Phase 3: Customization
- Souls can influence their appearance over lifetimes
- Achievements unlock special visual features
- Cultural/regional appearance variations

### Phase 4: Dynamic Details
- Scars/marks persist across reincarnations
- Equipment and clothing evolve with tier
- Environmental adaptation (climate-based variations)

## Success Metrics

1. **Visual Clarity:** Players can instantly distinguish soul tiers at a glance
2. **Performance:** Sprite generation doesn't block gameplay
3. **Consistency:** Same soul recognizable across tiers
4. **Progression Feel:** Clear sense of advancement as tiers increase
5. **Cache Efficiency:** <5% sprite regeneration rate in normal play

## Open Questions

1. Should same soul in different species (via reincarnation) maintain visual similarity?
2. How do we handle soul merging - combine visual features of merged souls?
3. Should negative karma affect sprite appearance (corruption visual)?
4. What happens if a soul is "reset" - do they lose sprite progression?

## References

- [Soul System Overview](./soul-system-spec.md)
- [Reincarnation Mechanics](./reincarnation-spec.md)
- [PixelLab Integration](../../renderer/pixellab-integration.md)
- [Sprite Caching Strategy](../../renderer/sprite-cache.md)
