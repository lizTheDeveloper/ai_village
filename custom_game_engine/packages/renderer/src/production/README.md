# Video Production Rendering System

High-quality character rendering for TV shows, movies, gladiator arenas, and inter-dimensional cable content.

## Overview

The Video Production Rendering System provides a separate rendering pipeline from real-time gameplay, optimized for visual quality rather than performance. It supports:

- **Multiple Quality Levels** (128×128 to 1024×1024+)
- **Virtual Dressing Room** (costume and equipment before rendering)
- **Concept Art Workflow** (preview before expensive final render)
- **Director Approval System** (for production quality control)
- **Batch Rendering** (render entire TV episode casts at once)

## Quick Start

### Single Character Render

```bash
# Render a gladiator at premium quality (256×256)
./scripts/render-character.ts \
  --entity-id "gladiator_001" \
  --quality 2 \
  --costume "gladiator" \
  --pose "dramatic" \
  --expression "determined" \
  --output "./assets/productions/arena/fighter_001.png"
```

### Batch Render TV Episode Cast

```bash
# Render entire cast for a TV episode
./scripts/render-batch.ts \
  --cast-file "./examples/arena_champions_s03e05_cast.json" \
  --quality 2 \
  --output-dir "./assets/productions/tv/arena_champions/s03e05/"
```

## Quality Levels

| Level | Name | Resolution | Use Case | Render Time |
|-------|------|------------|----------|-------------|
| 1 | Broadcast | 128×128 | Standard TV, background characters | ~15 sec |
| 2 | Premium | 256×256 | Main cast, gladiator profiles | ~30 sec |
| 3 | Cinematic | 512×512 | Movie heroes, epic moments | ~60 sec |
| 4 | Ultra | 1024×1024+ | Marketing, concept art | ~120 sec |

## Director Interface (Programmatic)

```typescript
import { ProductionRenderer, QualityLevel } from './ProductionRenderer';

// Create renderer
const renderer = new ProductionRenderer(world);

// Register a director
const director = renderer.registerDirector(
  'tv_director_001',
  'tv',
  'Interdimensional Broadcasting Corp'
);

// Request a render
const job = await director.requestRender({
  entityId: 'gladiator_thunderfist_789',
  qualityLevel: QualityLevel.Premium,
  format: 'portrait',

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
  ],

  pose: 'dramatic',
  expression: 'determined',
  lighting: 'dramatic',
  purpose: 'arena_fighter_introduction',
});

// Review concept art
const conceptArt = await director.reviewConceptArt(job.jobId);
if (conceptArt) {
  // Approve for final render
  await director.approveRender(job.jobId, true, 'Looks perfect!');
}

// Wait for completion
const finalJob = await director.getJob(job.jobId);
if (finalJob.status === 'complete' && finalJob.finalRender) {
  console.log('Render complete:', finalJob.finalRender.imageUrl);
}
```

## Custom Costumes

Use the `custom` costume type with a description:

```bash
./scripts/render-character.ts \
  --entity-id "hero_001" \
  --quality 3 \
  --costume-json '{"costumeType":"custom","customDescription":"futuristic space armor with glowing blue energy conduits"}' \
  --pose "action" \
  --output "./renders/hero_space_armor.png"
```

Or in JSON:

```json
{
  "costume": {
    "costumeType": "custom",
    "customDescription": "futuristic space armor with glowing blue energy conduits",
    "colors": ["blue", "silver"],
    "accessories": ["energy_shield_generator", "jetpack"]
  }
}
```

## Equipment Specification

```typescript
{
  "equipment": [
    {
      "itemType": "weapon",
      "itemName": "Plasma Rifle",
      "itemDescription": "sleek rifle crackling with blue plasma energy",
      "inHand": "right"
    },
    {
      "itemType": "shield",
      "itemName": "Energy Buckler",
      "itemDescription": "small circular shield projecting an energy field",
      "inHand": "left"
    }
  ]
}
```

## Batch Cast File Format

Create a JSON file with your production cast:

```json
{
  "productionName": "Arena Champions",
  "episode": "S03E05 - The Thunder Strikes Back",
  "defaultQuality": 2,
  "defaultLighting": "dramatic",
  "cast": [
    {
      "entityId": "gladiator_thunderfist_789",
      "name": "Thunderfist",
      "role": "champion",
      "costume": {
        "costumeType": "gladiator",
        "colors": ["red", "gold"],
        "accessories": ["champion_belt"]
      },
      "equipment": [
        {
          "itemType": "weapon",
          "itemName": "Thunder Hammer",
          "inHand": "right"
        }
      ],
      "pose": "dramatic",
      "expression": "determined"
    },
    {
      "entityId": "announcer_voice_123",
      "name": "Voice of the Arena",
      "role": "announcer",
      "costume": {
        "costumeType": "performer",
        "colors": ["purple", "gold"]
      },
      "pose": "portrait",
      "expression": "enthusiastic"
    }
  ]
}
```

See `examples/arena_champions_s03e05_cast.json` for a complete example.

## CLI Options

### render-character.ts

```
--entity-id <id>         Entity ID to render (required)
--quality <1-4>          Quality level (required)
--output <path>          Output file path (required)
--format <type>          Render format (sprite|portrait|action|scene)
--costume <type>         Costume type (peasant|gladiator|royal|custom)
--costume-json <json>    Custom costume spec as JSON
--equipment <items>      Comma-separated equipment items
--equipment-json <json>  Equipment spec as JSON array
--pose <pose>            Character pose (standing|action|dramatic|portrait)
--expression <expr>      Facial expression (neutral|angry|joyful|determined)
--lighting <type>        Lighting (natural|dramatic|soft|harsh)
--animation <name>       Animation name (for animated renders)
--frames <count>         Frame count for animations
--purpose <desc>         Purpose/context for render
--concept-only           Generate concept art only
--skip-approval          Auto-approve concept art
```

### render-batch.ts

```
--cast-file <path>       JSON file with cast information (required)
--output-dir <path>      Output directory (required)
--quality <1-4>          Quality level (overrides cast file default)
--format <type>          Render format
--lighting <type>        Lighting type
--parallel               Render all characters in parallel
--concept-only           Generate concept art only
--skip-approval          Auto-approve all concept art
```

## Render Pipeline

1. **Concept Art Phase**
   - Generates low-res preview (64×64 or 128×128)
   - Director reviews and approves
   - Quick and cheap (~15 seconds, low cost)

2. **Approval Gate**
   - Director can approve or reject
   - Prevents wasting resources on bad renders
   - Can request revisions

3. **Final Render**
   - Generates high-quality asset at target resolution
   - Applies all costume, equipment, and direction specs
   - Longer render time, higher cost

4. **Export**
   - Saves to production asset directory
   - Organizes by production/episode
   - Links to character/costume metadata

## Integration with TV System

```typescript
// TV system requests character render for episode intro
const tvDirector = productionRenderer.registerDirector(
  'tv_director_arena_champions',
  'tv',
  'Arena TV Network'
);

const renderJob = await tvDirector.requestRender({
  entityId: fighterEntityId,
  qualityLevel: QualityLevel.Premium,
  format: 'portrait',
  costume: { costumeType: 'gladiator' },
  pose: 'dramatic',
  purpose: `tv_episode_${episodeId}_fighter_intro`,
});

// Export for TV system
const tvAsset = {
  episodeId,
  characterId: fighterEntityId,
  assetUrl: renderJob.finalRender.imageUrl,
  renderMetadata: renderJob.finalRender,
};
```

## Storage Organization

```
assets/productions/
├── tv/
│   ├── arena_champions/
│   │   ├── s03e05/
│   │   │   ├── thunderfist_champion.png
│   │   │   ├── stormblade_challenger.png
│   │   │   └── voice_of_the_arena_announcer.png
│   └── news_tonight/
│       └── 2026-01-04/
│           └── reporter_avatar.png
├── movies/
│   └── quest_for_the_artifact/
│       ├── hero_cinematic.png
│       └── villain_cinematic.png
└── arena/
    ├── season_3/
    │   ├── thunderfist_profile.png
    │   └── stormblade_profile.png
    └── promotional/
        └── champion_poster.png
```

## Performance Tips

1. **Use Concept Art First**: Always review 128×128 concept art before expensive final renders
2. **Batch When Possible**: Render multiple characters together for efficiency
3. **Parallel Rendering**: Use `--parallel` for faster batch jobs (if resources allow)
4. **Reuse Assets**: Store renders in organized directories for cross-episode reuse
5. **Quality Optimization**: Use lowest quality that meets your needs (broadcast for background characters, premium for main cast)

## Cost vs Quality Trade-offs

- **Concept Art** (128×128): ~10% cost of final render
- **Broadcast** (128×128): Low cost, fast turnaround
- **Premium** (256×256): Medium cost, suitable for most TV content
- **Cinematic** (512×512): High cost, use for hero moments only
- **Ultra** (1024×1024+): Very high cost, reserve for marketing/concept art

## Combat Animation System

The Combat Animator generates pixel art animations from combat recordings using the PixelLab API directly.

### Quick Start

```bash
# Set your API token
export PIXELLAB_API_TOKEN=your_token_here

# Dry run to preview what will be generated
./scripts/animate-combat.ts \
  --combat-log "./examples/gladiator_match_001.json" \
  --output-dir "./assets/combat_replays/match_001/" \
  --dry-run

# Generate animations
./scripts/animate-combat.ts \
  --combat-log "./examples/gladiator_match_001.json" \
  --output-dir "./assets/combat_replays/match_001/"
```

### Combat Log Format

Combat recordings include `renderableOperation` for each event:

```json
{
  "recordingId": "match_001",
  "combatName": "Red vs Blue",
  "participants": ["Gladiator Red", "Gladiator Blue"],
  "events": [
    {
      "tick": 5,
      "actor": "Gladiator Red",
      "action": "thrusts",
      "weapon": "scarlet spear",
      "target": "Gladiator Blue's left leg",
      "damage": 12,
      "renderableOperation": {
        "actor": "Gladiator Red",
        "action": "thrusts",
        "weapon": "scarlet spear",
        "target": "Gladiator Blue's left leg",
        "spritePrompt": "gladiator in red armor thrusts with scarlet spear, attacking motion"
      }
    }
  ]
}
```

### PixelLab API Integration

The combat animator uses the PixelLab REST API directly:

**API Endpoints Used:**
- `POST /v1/generate-image-bitforge` - Generate character base sprites
- `POST /v1/animate-with-text` - Generate animation frames from reference image

**Generate Character Sprite:**
```typescript
const response = await api.generateImageBitforge({
  description: "gladiator in red armor",
  image_size: { width: 64, height: 64 },
  view: "high top-down",
  direction: "south",
  detail: "high detail",
  shading: "detailed shading",
  outline: "single color outline",
  no_background: true
});
// Returns: { image: "base64..." }
```

**Generate Animation Frames:**
```typescript
const response = await api.animateWithText({
  description: "gladiator in red armor",
  action: "thrusting forward with spear, piercing attack",
  image_size: { width: 64, height: 64 },
  reference_image: characterSprite.imageBase64,
  n_frames: 8,
  view: "high top-down",
  direction: "south"
});
// Returns: { images: ["base64...", "base64...", ...] }
```

### CLI Options

```
--combat-log <path>     Path to combat recording JSON (required)
--output-dir <path>     Output directory for replay assets (required)
--api-token <token>     PixelLab API token (or set PIXELLAB_API_TOKEN)
--sprite-size <size>    Character sprite size in pixels (default: 64)
--frame-count <count>   Animation frames (2-20, default: 8)
--dry-run               Preview without API calls
```

### Animation Workflow

The script executes this pipeline:

1. **Load Recording** - Parse combat log JSON
2. **Generate Character Sprites** - Create base sprite for each participant using Bitforge
3. **Extract Unique Operations** - Deduplicate (actor + action + weapon) combinations
4. **Generate Animations** - Use `animate-with-text` with character reference
5. **Build Timeline** - Map events to animations with frame indices
6. **Save Assets** - Write PNGs and replay.json to output directory

### Action Description Mapping

Combat actions are mapped to animation-friendly descriptions:

| Combat Action | Animation Description |
|--------------|----------------------|
| thrust, stab | "thrusting forward with {weapon}, piercing attack" |
| slash, swing | "slashing with {weapon}, sweeping horizontal attack" |
| bash, smash | "bashing with {weapon}, heavy overhead strike" |
| block, defend | "blocking with {weapon}, defensive stance" |
| dodge, evade | "dodging to the side, evasive movement" |

### Animation Caching

Animations are cached by operation hash:
- Hash = `{actor}_{action}_{weapon}` (e.g., `gladiator_red_thrusts_scarlet_spear`)
- Same action+weapon combos reuse cached sprites
- Reduces API calls and generation costs

### Output Structure

```
output-dir/
├── sprites/
│   ├── gladiator_red.png      # 64x64 character sprite
│   └── gladiator_blue.png
├── animations/
│   ├── gladiator_red_thrusts_scarlet_spear/
│   │   ├── frame_000.png
│   │   ├── frame_001.png
│   │   └── ... (8 frames)
│   └── gladiator_blue_bashes_azure_mace/
│       └── ...
└── replay.json                 # Timeline and metadata
```

### Programmatic Usage

```typescript
import { CombatAnimator, loadCombatRecording } from './CombatAnimator';

// Load recording
const recording = await loadCombatRecording('./combat.json');

// Create animator with API token
const animator = new CombatAnimator(process.env.PIXELLAB_API_TOKEN, {
  spriteSize: 64,
  frameCount: 8,
  view: 'high top-down',
});

// Generate replay
const replay = await animator.generateReplay(recording);

// Save to disk
await animator.saveReplay(replay, './output');
```

### Benefits

1. **Direct API** - No MCP dependency, works anywhere with HTTP
2. **Isolated Operations** - Each combat action is independent and renderable
3. **Weapon-Specific** - Different weapons create visually distinct animations
4. **Cacheable** - Same action+weapon combos reuse sprites
5. **Automated** - Combat log automatically generates all needed sprite prompts
6. **Dry Run** - Preview what will be generated before spending credits

## Future Enhancements

- **Scene Rendering**: Characters in environments
- **Real-time Preview**: Interactive virtual dressing room
- **Motion Capture**: Record gameplay actions for animation reference
- **Multi-Character Scenes**: Render full combat scenes with both fighters

## References

- [Full Specification](../../../../openspec/specs/renderer/video-production-rendering.md)
- [Soul Sprite Progression](../../../../openspec/specs/soul-system/soul-sprite-progression.md)
- [PixelLab API Client](./PixelLabAPI.ts)
- [Combat Animator](./CombatAnimator.ts)
- [Example Combat Log](../../../../examples/gladiator_match_001.json)
- [PixelLab API Docs](https://api.pixellab.ai/v1/docs)
