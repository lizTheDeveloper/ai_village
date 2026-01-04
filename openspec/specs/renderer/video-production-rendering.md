# Video Production Rendering System

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-04
**Domain:** Rendering, Media Production, TV System

## Overview

The Video Production Rendering System provides high-quality character and scene rendering for TV shows, movies, gladiator arenas, and inter-dimensional cable content. Unlike real-time gameplay rendering (which prioritizes performance), this system prioritizes visual quality and can render at resolutions far exceeding gameplay sprites.

This is a **post-production** rendering pipeline that runs asynchronously, separate from the game loop.

## Core Principle

**Gameplay renders for performance. Video production renders for quality.**

Real-time gameplay uses optimized sprites (16×16 to 64×64). Video production can render at 128×128, 256×256, or even higher for cinematic sequences.

## Production Quality Levels

### Level 1: Broadcast Quality (128×128)
- Standard TV broadcasts
- Inter-dimensional cable shows
- News broadcasts
- Typical audience: General viewers

### Level 2: Premium Quality (256×256)
- High-budget TV series
- Gladiator arena close-ups
- Character portraits
- Typical audience: Premium subscribers

### Level 3: Cinematic Quality (512×512)
- Movie productions
- Epic cinematics
- Hero moments
- Typical audience: Theater/cinema

### Level 4: Ultra Quality (1024×1024+)
- Promotional materials
- Concept art
- Marketing imagery
- Typical audience: Advertisers, collectors

## Director Interface

Directors (TV directors, movie directors, arena producers) use the `ProductionDirector` interface to request renders:

```typescript
interface ProductionDirector {
  // Director metadata
  directorId: string;
  directorType: 'tv' | 'movie' | 'arena' | 'cable' | 'advertising';
  productionCompany: string;

  // Production request
  requestRender(request: RenderRequest): Promise<RenderJob>;

  // Review concept art before final render
  reviewConceptArt(jobId: string): Promise<ConceptArtReview>;

  // Approve or request changes
  approveRender(jobId: string, approved: boolean, notes?: string): Promise<void>;
}

interface RenderRequest {
  // Subject to render
  entityId: string;              // The agent/creature to render

  // Production specifications
  qualityLevel: 1 | 2 | 3 | 4;   // Production quality (see above)
  format: 'sprite' | 'portrait' | 'action' | 'scene';

  // Costuming & styling (applied before render)
  costume?: CostumeSpec;
  equipment?: EquipmentSpec[];
  makeup?: MakeupSpec;

  // Direction
  pose?: string;                 // 'standing', 'action', 'dramatic', 'portrait'
  expression?: string;           // 'neutral', 'angry', 'joyful', 'determined'
  lighting?: 'natural' | 'dramatic' | 'soft' | 'harsh';

  // Animation (optional)
  animation?: string;            // 'idle', 'walking', 'fighting', 'speaking'
  frameCount?: number;           // For animated sequences

  // Context
  purpose: string;               // 'tv_episode_intro', 'gladiator_profile', 'news_segment'
  deadline?: number;             // Unix timestamp (optional rush request)
  budget?: number;               // Higher budget = better quality/faster turnaround
}

interface CostumeSpec {
  costumeType: 'peasant' | 'common' | 'merchant' | 'noble' | 'royal' | 'gladiator' | 'performer' | 'custom';
  customDescription?: string;    // For custom costumes
  colors?: string[];             // Color scheme
  accessories?: string[];        // 'crown', 'sword', 'shield', 'cape', etc.
}

interface EquipmentSpec {
  itemType: 'weapon' | 'shield' | 'tool' | 'prop';
  itemName: string;
  itemDescription?: string;
  inHand: 'left' | 'right' | 'both' | 'sheathed';
}

interface MakeupSpec {
  style: 'natural' | 'stage' | 'dramatic' | 'fantasy';
  effects?: string[];            // 'war_paint', 'scars', 'tattoos', 'glitter'
}
```

## Rendering Pipeline

### Phase 1: Pre-Production
```typescript
interface PreProduction {
  // 1. Load base entity data
  entityTraits: SpriteTraits;

  // 2. Apply costume & equipment (virtual dressing)
  virtualDressing(costume: CostumeSpec, equipment: EquipmentSpec[]): VirtualModel;

  // 3. Generate concept art (low-res preview)
  generateConceptArt(model: VirtualModel, quality: 'draft'): Promise<ConceptArt>;
}
```

**Concept Art Generation:**
- Quick 64×64 or 128×128 preview
- Shows costume, equipment, pose
- Director reviews and approves before expensive final render
- Can request changes without wasting production budget

### Phase 2: Production
```typescript
interface Production {
  // 1. Generate high-quality character description
  buildProductionPrompt(
    model: VirtualModel,
    request: RenderRequest
  ): ProductionPrompt;

  // 2. Render at target quality level
  renderCharacter(
    prompt: ProductionPrompt,
    qualityLevel: number
  ): Promise<RenderedAsset>;

  // 3. Generate animations if requested
  renderAnimation(
    character: RenderedAsset,
    animation: string,
    frameCount: number
  ): Promise<AnimatedAsset>;
}

interface ProductionPrompt {
  // Base character
  species: string;
  gender?: string;
  bodyType: string;

  // Appearance
  hairColor?: string;
  skinTone?: string;
  facialFeatures?: string;

  // Costuming & equipment
  costume: string;               // Full description
  equipment: string[];           // Item descriptions
  accessories: string[];

  // Direction
  pose: string;
  expression: string;
  lighting: string;

  // Quality directives
  detailLevel: 'high detail' | 'highly detailed';
  shading: 'detailed shading' | 'highly detailed shading';
  resolution: number;            // Target size in pixels

  // Style consistency
  styleReference?: string;       // Reference to production's visual style
}
```

### Phase 3: Post-Production
```typescript
interface PostProduction {
  // Optional effects and polish
  applyEffects(asset: RenderedAsset, effects: VisualEffect[]): Promise<RenderedAsset>;

  // Export for media systems
  exportForTV(asset: RenderedAsset, showId: string): Promise<TVAsset>;
  exportForArena(asset: RenderedAsset, gladiatorId: string): Promise<ArenaAsset>;
  exportForCable(asset: RenderedAsset, channelId: string): Promise<CableAsset>;
}

interface VisualEffect {
  type: 'glow' | 'aura' | 'particles' | 'motion_blur' | 'dramatic_lighting';
  intensity: number;             // 0.0 to 1.0
  color?: string;
}
```

## Render Job Queue

Production renders are async and queued:

```typescript
interface RenderJob {
  jobId: string;
  status: 'queued' | 'concept_art' | 'awaiting_approval' | 'rendering' | 'complete' | 'cancelled';

  // Request details
  directorId: string;
  request: RenderRequest;

  // Progress
  conceptArt?: ConceptArt;
  finalRender?: RenderedAsset;

  // Timing
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedCompletion?: number;

  // Quality metrics
  renderQuality: number;         // 0-100
  directorNotes?: string[];
}

interface ConceptArt {
  imageUrl: string;              // Low-res preview
  resolution: string;            // e.g., "64x64" or "128x128"
  approved: boolean;
  directorFeedback?: string;
  revisionCount: number;
}

interface RenderedAsset {
  assetId: string;
  imageUrl: string;              // High-res final render
  resolution: string;            // e.g., "256x256" or "512x512"
  format: 'png' | 'sprite_sheet';

  // Metadata
  characterId: string;
  costume: CostumeSpec;
  equipment: EquipmentSpec[];

  // Animation data (if applicable)
  animationFrames?: string[];    // URLs to frame images
  frameRate?: number;            // FPS

  // Usage rights
  licensedTo: string;            // Production company
  purpose: string;               // What it's for
}
```

## Virtual Dressing Room

Before rendering, entities go through a "virtual dressing room" to apply costumes and equipment:

```typescript
interface VirtualDressingRoom {
  // Load base character
  loadCharacter(entityId: string): Promise<BaseCharacter>;

  // Apply costume
  applyCostume(character: BaseCharacter, costume: CostumeSpec): DressedCharacter;

  // Equip items
  equipItems(character: DressedCharacter, equipment: EquipmentSpec[]): EquippedCharacter;

  // Apply makeup/effects
  applyMakeup(character: EquippedCharacter, makeup: MakeupSpec): StyledCharacter;

  // Generate description for rendering
  generateRenderDescription(character: StyledCharacter): string;
}

interface BaseCharacter {
  entityId: string;
  species: string;
  gender?: string;
  genetics: {
    hairColor?: string;
    skinTone?: string;
    eyeColor?: string;
  };
  bodyType: string;
}

interface DressedCharacter extends BaseCharacter {
  costume: {
    type: string;
    description: string;
    colors: string[];
  };
}

interface EquippedCharacter extends DressedCharacter {
  equipment: {
    leftHand?: string;
    rightHand?: string;
    sheathed?: string[];
  };
}

interface StyledCharacter extends EquippedCharacter {
  makeup?: {
    style: string;
    effects: string[];
  };
  renderDescription: string;     // Full description for AI generation
}
```

## Example: TV Director Workflow

```typescript
// TV director wants to render a character for a new episode
const director: ProductionDirector = {
  directorId: 'tv_director_001',
  directorType: 'tv',
  productionCompany: 'Interdimensional Broadcasting Corp',
};

// Request render of gladiator for arena introduction
const request: RenderRequest = {
  entityId: 'gladiator_thunderfist_789',
  qualityLevel: 2,               // Premium quality (256x256)
  format: 'portrait',

  // Dress them up for the arena
  costume: {
    costumeType: 'gladiator',
    colors: ['red', 'gold'],
    accessories: ['champion_belt', 'arena_tattoos'],
  },

  equipment: [
    {
      itemType: 'weapon',
      itemName: 'Thunder Hammer',
      itemDescription: 'massive warhammer crackling with lightning',
      inHand: 'right',
    },
    {
      itemType: 'shield',
      itemName: 'Iron Bulwark',
      itemDescription: 'battle-scarred tower shield',
      inHand: 'left',
    },
  ],

  makeup: {
    style: 'dramatic',
    effects: ['war_paint', 'scars'],
  },

  // Direction
  pose: 'dramatic',
  expression: 'determined',
  lighting: 'dramatic',

  purpose: 'arena_fighter_introduction',
  budget: 1000,                  // High priority
};

// Submit render request
const job = await director.requestRender(request);

// System generates concept art first
// ... concept art rendered at 128x128 ...

// Director reviews concept art
const review = await director.reviewConceptArt(job.jobId);
if (review.conceptArt.imageUrl) {
  // Looks good! Approve for final render
  await director.approveRender(job.jobId, true, 'Perfect! Proceed with final render.');
}

// System renders final 256x256 portrait
// ... high-quality render complete ...

// Export for TV system
const tvAsset = await postProduction.exportForTV(job.finalRender, 'arena_champions_s03e05');
```

## Integration Points

### With TV System
- **Event:** `tv_episode_needs_character`
- **Action:** Director requests render for episode
- **Data:** Character ID, episode context, quality requirements

### With Gladiator Arena
- **Event:** `gladiator_match_scheduled`
- **Action:** Render fighter portraits for announcements
- **Data:** Gladiator IDs, arena context, dramatic poses

### With Inter-Dimensional Cable
- **Event:** `cable_show_production_started`
- **Action:** Queue batch renders for show cast
- **Data:** Cast list, show style guide, budget

### With Advertising System
- **Event:** `advertisement_needs_character`
- **Action:** Ultra-high quality render for billboards
- **Data:** Product context, target audience, quality level 4

## Storage & Caching

```typescript
interface ProductionAssetCache {
  // Store rendered assets by purpose
  basePath: string;              // `/assets/productions/`

  // Organization
  byProduction: Map<string, RenderedAsset[]>;     // TV show, movie, etc.
  byCharacter: Map<string, RenderedAsset[]>;      // All renders of this character
  byCostume: Map<string, RenderedAsset[]>;        // Reusable costume renders

  // Retrieval
  getAsset(assetId: string): Promise<RenderedAsset>;
  getCharacterAssets(characterId: string): Promise<RenderedAsset[]>;
  getProductionAssets(productionId: string): Promise<RenderedAsset[]>;

  // Cleanup (old/unused assets)
  purgeOldAssets(olderThan: number): Promise<number>;
}
```

**Storage Paths:**
```
/assets/productions/
  ├── tv/
  │   ├── arena_champions/
  │   │   ├── s03e05/
  │   │   │   ├── gladiator_thunderfist_portrait_256.png
  │   │   │   └── gladiator_stormblade_portrait_256.png
  │   └── news_tonight/
  │       └── 2026-01-04/
  │           └── reporter_avatar_128.png
  ├── movies/
  │   └── quest_for_the_artifact/
  │       ├── hero_512.png
  │       └── villain_512.png
  ├── cable/
  │   └── cooking_with_chaos/
  │       └── chef_portrait_128.png
  └── advertising/
      └── weapon_shop_promo/
          └── warrior_1024.png
```

## Render Script Interface

For batch processing and automation:

```bash
# Render single character
./scripts/render-character.ts \
  --entity-id "gladiator_001" \
  --quality 2 \
  --costume "gladiator" \
  --pose "dramatic" \
  --output "./assets/productions/arena/fighter_001.png"

# Batch render TV episode cast
./scripts/render-batch.ts \
  --cast-file "./productions/tv/episode_cast.json" \
  --quality 2 \
  --output-dir "./assets/productions/tv/arena_champions/s03e05/"

# Render with custom costume
./scripts/render-character.ts \
  --entity-id "hero_001" \
  --quality 3 \
  --costume-json '{"costumeType":"custom","customDescription":"futuristic space armor with glowing blue energy conduits"}' \
  --equipment-json '[{"itemType":"weapon","itemName":"Plasma Rifle","inHand":"right"}]' \
  --pose "action" \
  --output "./assets/productions/movies/space_opera/hero_cinematic.png"
```

## Quality vs Cost Trade-offs

| Quality Level | Resolution | Render Time | Token Cost | Use Case |
|--------------|------------|-------------|------------|----------|
| 1 (Broadcast) | 128×128 | ~15 sec | Low | Standard TV, background characters |
| 2 (Premium) | 256×256 | ~30 sec | Medium | Main cast, gladiator profiles |
| 3 (Cinematic) | 512×512 | ~60 sec | High | Movie heroes, epic moments |
| 4 (Ultra) | 1024×1024+ | ~120 sec | Very High | Marketing, concept art, collectors |

**Budget Optimization:**
- Concept art (64×64) costs ~10% of final render
- Always generate concept art first
- Director approval prevents wasted renders
- Reuse assets across episodes when possible
- Batch render cast together for efficiency

## Future Enhancements

### Phase 2: Motion Capture
- Record gameplay actions for animation reference
- Apply character rigs to rendered sprites
- Generate full animated sequences

### Phase 3: Scene Rendering
- Render characters in environments
- Multi-character scenes
- Camera angles and framing

### Phase 4: Real-time Preview
- Live preview in virtual dressing room
- Instant costume/equipment swaps
- Interactive pose adjustment

## Success Metrics

1. **Render Quality:** Directors rate renders 8+/10
2. **Approval Rate:** >80% of concept art approved on first submission
3. **Turnaround Time:** <5 minutes for broadcast quality, <15 minutes for cinematic
4. **Asset Reuse:** 40%+ of renders reused across multiple productions
5. **Budget Efficiency:** <30% waste from rejected renders

## References

- [Soul Sprite Progression](../soul-system/soul-sprite-progression.md)
- [TV System](../media/tv-system-spec.md)
- [Gladiator Arena](../gameplay/gladiator-arena-spec.md)
- [Inter-Dimensional Cable](../media/cable-system-spec.md)
