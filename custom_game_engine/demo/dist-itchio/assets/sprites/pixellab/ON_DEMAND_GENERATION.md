# On-Demand Sprite Generation System

Automatically generates missing character sprites via PixelLab AI when entities are created.

## How It Works

### 1. Entity Creation
When a new entity is created in the game (e.g., a villager with red hair and dark skin):

```typescript
const entity = createVillager(world, {
  species: 'human',
  gender: 'male',
  hairColor: 'red',
  skinTone: 'dark'
});
```

### 2. Sprite Lookup
The `SpriteService` looks up the sprite based on entity traits:

```typescript
import { lookupSprite } from './sprites/SpriteService.js';

const spriteInfo = lookupSprite({
  species: 'human',
  gender: 'male',
  hairColor: 'red',
  skinTone: 'dark'
});
```

### 3. Automatic Generation Request
If sprite is missing and PixelLab is available:

```typescript
{
  folderId: 'human_male_red_dark',
  status: 'generating'
}
```

The system automatically:
1. Builds a description: "Human male with red hair, dark skin tone, wearing simple medieval peasant clothing"
2. Sends request to server: `POST /api/sprites/generate`
3. Shows placeholder sprite while generating
4. Polls for completion every 5 seconds
5. Loads sprite when ready

### 4. Server Handles API Calls
Server receives request and:
1. Calls PixelLab MCP API with `.env` credentials
2. Waits for generation to complete
3. Downloads sprite ZIP
4. Extracts to `/assets/sprites/pixellab/{folderId}/`
5. Responds with completion status

### 5. Client Loads Sprite
Once server confirms completion:
1. Client marks sprite as available
2. `PixelLabSpriteLoader` loads sprite files
3. Entity renders with proper sprite

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Entity Created                                               │
│       ↓                                                       │
│  SpriteService.lookupSprite(traits)                          │
│       ↓                                                       │
│  Sprite Missing? → SpriteGenerationClient.request()          │
│       ↓                                                       │
│  POST /api/sprites/generate                                  │
│       ↓                                                       │
│  Poll /api/sprites/generate/status                           │
│       ↓                                                       │
│  Sprite Ready? → PixelLabSpriteLoader.load()                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                      Server (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  POST /api/sprites/generate                                  │
│       ↓                                                       │
│  Call PixelLab MCP create_character()                        │
│       ↓                                                       │
│  Poll PixelLab for completion                                │
│       ↓                                                       │
│  Download sprite ZIP                                          │
│       ↓                                                       │
│  Extract to /assets/sprites/pixellab/{folderId}/             │
│       ↓                                                       │
│  Respond to status checks                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      PixelLab API                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  create_character() → Queue generation                       │
│  get_character() → Check status                              │
│  Download → Return sprite ZIP                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Files Involved

### Client-Side
- `packages/renderer/src/sprites/SpriteRegistry.ts` - Maps traits to folder IDs
- `packages/renderer/src/sprites/SpriteService.ts` - Detects missing sprites
- `packages/renderer/src/sprites/SpriteGenerationClient.ts` - Requests from server
- `packages/renderer/src/sprites/PixelLabSpriteLoader.ts` - Loads sprite files

### Server-Side (To Implement)
- `server/api/sprites/generate.ts` - POST endpoint for generation
- `server/api/sprites/status.ts` - GET endpoint for status
- `server/services/pixellab.ts` - PixelLab MCP client wrapper
- `.env` - Contains `PIXELLAB_API_KEY`

## Configuration

### Enable On-Demand Generation

In your game initialization:

```typescript
import { initializeSpriteService } from './sprites/SpriteService.js';

// Initialize with PixelLab enabled
initializeSpriteService({
  assetsPath: '/assets/sprites/pixellab',
  pixelLabApiKey: 'enabled', // Just marks as available, server has real key
});
```

### Server Environment

Add to `.env`:
```bash
PIXELLAB_API_KEY=your_actual_api_key_here
```

## Placeholder Sprites

While sprites are generating, show a placeholder:

```typescript
// In your render loop
if (spriteInfo.status === 'generating') {
  // Show loading indicator
  ctx.fillStyle = '#888';
  ctx.fillText('⏳', x, y);
} else if (spriteInfo.status === 'available') {
  // Render actual sprite
  pixelLabLoader.render(ctx, spriteInfo.folderId, x, y);
}
```

## Benefits

1. **Zero Pre-Generation**: Don't need to pre-generate all possible sprite combinations
2. **Automatic**: Developers never manually call PixelLab API
3. **Async**: Game doesn't freeze while waiting for sprites
4. **Cached**: Once generated, sprites are saved to disk and reused
5. **Fallback**: Can still use placeholder sprites if generation fails

## Limitations

1. **First Appearance Delay**: First time an entity appears with new traits, there's a 2-5 minute wait
2. **Server Required**: Needs server with PixelLab API access
3. **Network Dependent**: Requires active internet connection
4. **Rate Limits**: PixelLab has rate limits (30-60 seconds between generations)

## Future Enhancements

1. **Pre-Generation Scripts**: Generate common combinations during build time
2. **CDN Caching**: Upload generated sprites to CDN for sharing across servers
3. **Bulk Generation**: Queue multiple sprites and space them out automatically
4. **Priority Queue**: Generate visible on-screen sprites first
5. **Fallback Variations**: Use similar existing sprites while waiting (e.g., use blonde sprite for red-haired character temporarily)

## See Also

- `SERVER_SPRITE_API.md` - Server implementation details
- `LPC_PIXELLAB_INTEGRATION.md` - Choosing between LPC and PixelLab
- `GENERATION_NOTES.md` - PixelLab API best practices
