# Sprite System

Multi-layered sprite loading, caching, and rendering system for PixelLab AI-generated characters.

## Architecture

**PixelLabSpriteLoader** - Loads character sprites from PixelLab folders (metadata.json + PNG frames). Supports static rotations (8 directions) and animations. Handles both nested and flat metadata formats. Auto-queues missing animations via API.

**SpriteRegistry** - Maps entity traits (species, gender, hair, skin, clothing) to sprite folder IDs. Returns best match with fallback logic. Priority-based scoring ensures closest visual match. Normalizes trait names (e.g., "blonde"/"blond" → "blonde").

**SpriteCache** - IndexedDB persistence layer. Stores sprite images and metadata across page reloads. Converts images to blobs for storage. Provides cache stats and cleanup utilities (age-based pruning).

**SpriteService** - Orchestrates lookup, availability checking, and generation queueing. Checks filesystem via fetch, maintains status cache (available/missing/generating). Queues missing sprites to PixelLab daemon with auto-generated descriptions.

## PixelLab Integration

**Directory structure**: `/assets/sprites/pixellab/{folderId}/`
- `metadata.json` - Character config (id, size, directions count)
- `{direction}.png` - Static rotation images (south, north, east, etc.)
- `animations/{name}/{direction}/frame_000.png` - Animation frames

**Supported formats**:
- 4 or 8 directional rotations
- Multiple animations per character (idle, walking, running, etc.)
- Horizontal mirroring for missing directions (east ↔ west)

**Auto-generation**: Missing sprites/animations automatically queue to PixelLab daemon with trait-based descriptions (humanoid vs quadruped templates).

## Usage

```typescript
import { getPixelLabSpriteLoader, findSprite, buildTraitsFromEntity } from './sprites';

// Load character
const loader = getPixelLabSpriteLoader();
await loader.loadCharacter('human_male_black');

// Create instance for entity
const instance = loader.createInstance(entityId, 'human_male_black');
loader.setAnimation(entityId, 'walking-8-frames', true);
loader.updateAnimation(entityId, deltaTime);

// Render
loader.render(ctx, entityId, x, y, scale);

// Find sprite from traits
const traits = buildTraitsFromEntity(entity);
const folderId = findSprite(traits); // Returns best match
```

## Performance

- **Cache-first**: IndexedDB lookup before network requests
- **Deduplication**: Tracks loading promises to prevent duplicate fetches
- **Lazy animation loading**: Animations load on-demand, auto-queue if missing
- **Mirror fallback**: Reuses flipped sprites for missing directions

## Files

- `index.ts` - Public exports
- `PixelLabSpriteLoader.ts` - Character loading and rendering (697 lines)
- `SpriteRegistry.ts` - Trait-to-folder mapping (415 lines)
- `SpriteCache.ts` - IndexedDB persistence (415 lines)
- `SpriteService.ts` - Orchestration and generation queue (451 lines)
