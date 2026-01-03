# Death Gods Integration Complete

The death god sprites are now fully integrated into the game's death/afterlife systems.

## What Was Done

### 1. Created Death God Sprite Registry
**File**: `/packages/core/src/divinity/DeathGodSpriteRegistry.ts`

Maps death god names to their PixelLab sprite folders:
- Thanatos → plague-doctor
- Catrina → day-of-dead-goddess
- Valraven → valraven-goddess
- Chronos → clockwork-reaper
- Mycelian → mushroom-druid
- Void → cosmic-void-entity

### 2. Updated God Of Death Entity Factory
**File**: `/packages/core/src/divinity/GodOfDeathEntity.ts`

- Imports death god registry
- Uses PixelLab sprites instead of placeholder '?'
- Creates renderable component with sprite type 'pixellab'
- Tracks cultural origin in entity tags

### 3. Registered Sprites as Available
**File**: `/packages/renderer/src/sprites/SpriteService.ts`

Added all 6 death god sprite paths to `KNOWN_AVAILABLE_SPRITES`:
```typescript
'death-gods/plague-doctor',
'death-gods/day-of-dead-goddess',
'death-gods/valraven-goddess',
'death-gods/clockwork-reaper',
'death-gods/mushroom-druid',
'death-gods/cosmic-void-entity',
```

## How It Works

### On-Demand Loading
1. When first ensouled agent dies, `DeathJudgmentSystem` creates a God of Death entity
2. Entity is created with next death god from registry (cycles through 6 available gods)
3. Renderable component points to PixelLab sprite folder (e.g., `death-gods/plague-doctor`)
4. When entity is first rendered, `PixelLabSpriteLoader` loads sprite on-demand
5. Sprite metadata and 8-directional PNGs are fetched asynchronously
6. Once loaded, sprite renders at entity position with correct direction

### Integration Points
- **DeathJudgmentSystem.ts** - Creates God of Death when first soul needs judgment
- **DeathBargainSystem.ts** - Handles bargaining with death gods
- **SoulCreationSystem.ts** - Soul creation ceremonies involving death gods
- **RiddleGenerator.ts** - Death god riddle challenges

## Usage Example

```typescript
import { createGodOfDeath } from './divinity/GodOfDeathEntity.js';
import { getRandomDeathGod } from './divinity/DeathGodSpriteRegistry.js';

// Create death god at spawn location
const deathGod = createGodOfDeath(world, { x: 100, y: 50 });
// Uses cycling index: first death -> Thanatos, second -> Catrina, etc.

// Or create specific death god
const config = getRandomDeathGod();
const specificGod = createGodOfDeath(world, { x: 100, y: 50 }, config);
```

## Sprite Details

All death god sprites are:
- **Format**: 48×48px PNG with transparency
- **Directions**: 8 (south, west, east, north, south-east, north-east, north-west, south-west)
- **Style**: AI-generated with detailed shading and varied outline styles
- **Cultural themes**: Greco-Victorian, Mexican, Nordic, Steampunk, Ancient Forest, Cosmic Horror

## Benefits

1. **Visual Variety**: 6 distinct death gods with unique cultural identities
2. **Dynamic Appearance**: Each manifestation can cycle through different gods
3. **8-Directional**: More fluid movement than 4-direction LPC sprites
4. **On-Demand Loading**: Sprites only load when death god first appears
5. **Extensible**: Easy to add more death gods by adding to registry + sprite folder

## Next Steps

To add more death gods:
1. Generate new PixelLab character with `create_character` API
2. Download to `/death-gods/new-character-name/` folder
3. Add entry to `DEATH_GOD_REGISTRY` in `DeathGodSpriteRegistry.ts`
4. Add sprite path to `KNOWN_AVAILABLE_SPRITES` in `SpriteService.ts`
