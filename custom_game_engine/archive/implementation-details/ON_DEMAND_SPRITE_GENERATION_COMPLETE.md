# On-Demand Sprite Generation System - Complete Implementation

This document describes the complete on-demand sprite generation system that automatically creates missing sprite assets when entities are spawned.

## Architecture Overview

```
Game Entity Created
        |
        v
SpriteService detects missing sprite
        |
        v
SpriteGenerationClient sends HTTP request
        |
        v
Metrics Server queues generation job
        |
        v
sprite-generation-queue.json updated
        |
        v
Manual/Automated Processing (PixelLab MCP)
        |
        v
Sprite downloaded to disk
        |
        v
Client loads sprite on next check
```

## Components

### 1. Client-Side (Browser)

**Files:**
- `packages/renderer/src/sprites/SpriteService.ts` - Detects missing sprites
- `packages/renderer/src/sprites/SpriteGenerationClient.ts` - HTTP client for generation requests

**How it works:**
1. When `SpriteService.getSpriteStatus(folderId)` is called and sprite is missing
2. `queueSpriteGeneration()` is triggered
3. `SpriteGenerationClient.requestSpriteGeneration()` sends POST to `/api/sprites/generate`
4. Client polls `/api/sprites/generate/status/:folderId` every 5 seconds
5. When status becomes 'complete', sprite is loaded

### 2. Server-Side (Metrics Server)

**Files:**
- `scripts/metrics-server.ts` - HTTP API endpoints and job tracking

**Endpoints:**

```bash
# Queue sprite generation
POST http://localhost:8766/api/sprites/generate
Content-Type: application/json

{
  "folderId": "test-alien-radial",
  "traits": {
    "species": "alien"
  },
  "description": "Radially symmetric pentagonal alien creature..."
}

# Check status
GET http://localhost:8766/api/sprites/generate/status/:folderId

# View pending queue
GET http://localhost:8766/api/sprites/queue
```

**Job Tracking:**
- Jobs stored in-memory Map: `spriteGenerationJobs`
- Persisted to `sprite-generation-queue.json` file
- Status: queued → generating → complete/failed

### 3. Generation Queue File

**Location:** `custom_game_engine/sprite-generation-queue.json`

**Format:**
```json
[
  {
    "folderId": "test-alien-radial",
    "characterId": "",
    "status": "queued",
    "queuedAt": 1704240000000,
    "description": "Radially symmetric pentagonal alien creature with five tentacles...",
    "traits": {
      "species": "alien"
    }
  }
]
```

## Usage Flow

### Automatic (On Entity Creation)

When you create an entity that doesn't have a sprite:

1. Entity is created in game
2. `SpriteService` checks for sprite at path like `pixellab/alien-radial`
3. Sprite not found → triggers `queueSpriteGeneration()`
4. Request sent to metrics server at `http://localhost:8766/api/sprites/generate`
5. Job added to `sprite-generation-queue.json`
6. Entity temporarily shows placeholder sprite
7. **Manual step:** You (or Claude) processes the queue using PixelLab MCP tools
8. Sprite appears in `packages/renderer/assets/sprites/pixellab/<folderId>/`
9. Client detects sprite is ready and loads it

### Manual (For Testing)

```bash
# Start metrics server (Terminal 1)
cd custom_game_engine
npm run metrics-server

# Test the API (Terminal 2)
./test-sprite-api.sh

# Check the queue file
cat sprite-generation-queue.json | jq .
```

## Processing Pending Sprites

### Option 1: Manual Processing with Claude

1. Check the queue:
   ```bash
   curl http://localhost:8766/api/sprites/queue | jq .
   ```

2. For each queued sprite, use PixelLab MCP tools:
   ```typescript
   // For bipedal humanoids
   const result = await mcp__pixellab__create_character({
     description: job.description,
     n_directions: 8,
     size: 48,
     view: 'low top-down'
   });

   // For non-humanoid creatures (aliens, animals)
   const result = await mcp__pixellab__create_map_object({
     description: job.description,
     width: 64,
     height: 64,
     view: 'high top-down'
   });
   ```

3. Get the character and download:
   ```typescript
   const character = await mcp__pixellab__get_character({
     character_id: result.characterId,
     include_preview: false
   });

   // Download the ZIP from character.download_url
   // Extract to: packages/renderer/assets/sprites/pixellab/<folderId>/
   ```

### Option 2: Automated Processing (Future)

The server can be extended to automatically process the queue by:

1. Installing `@modelcontextprotocol/sdk` package
2. Connecting to PixelLab MCP server
3. Polling the queue and calling MCP tools automatically
4. Downloading and extracting sprites

See `SERVER_SPRITE_API.md` for implementation details.

## File Structure

```
custom_game_engine/
├── packages/
│   └── renderer/
│       ├── assets/
│       │   └── sprites/
│       │       └── pixellab/
│       │           ├── death-gods/
│       │           │   ├── plague-doctor/
│       │           │   ├── day-of-dead-goddess/
│       │           │   └── ...
│       │           ├── map-objects/
│       │           │   ├── radial-pentagonal-alien.png
│       │           │   ├── crystalline-silicon-alien.png
│       │           │   └── ...
│       │           └── <folderId>/  ← On-demand sprites go here
│       │               ├── south.png
│       │               ├── west.png
│       │               ├── metadata.json
│       │               └── ...
│       └── src/
│           └── sprites/
│               ├── SpriteService.ts          - Sprite detection & queueing
│               └── SpriteGenerationClient.ts - HTTP client
├── scripts/
│   └── metrics-server.ts                     - HTTP API & job tracking
├── sprite-generation-queue.json              - Pending jobs (auto-created)
├── test-sprite-api.sh                        - Test script
├── SERVER_SPRITE_API.md                      - Server implementation spec
└── ON_DEMAND_SPRITE_GENERATION_COMPLETE.md   - This file
```

## Testing

```bash
# 1. Start metrics server
npm run metrics-server

# 2. Run test script
./test-sprite-api.sh

# 3. Check queue
curl http://localhost:8766/api/sprites/queue | jq .

# 4. Manually process one sprite using PixelLab MCP tools (via Claude)
# (See "Processing Pending Sprites" section above)

# 5. Verify sprite was created
ls packages/renderer/assets/sprites/pixellab/test-alien-radial/

# 6. Check status returns 'complete'
curl http://localhost:8766/api/sprites/generate/status/test-alien-radial | jq .
```

## Integration with Existing Death Gods

The death god sprites have already been integrated:

**File:** `packages/core/src/divinity/DeathGodSpriteRegistry.ts`
- Maps death god names to PixelLab sprite folders
- Cycling through 6 different death gods when they manifest

**File:** `packages/core/src/divinity/GodOfDeathEntity.ts`
- Uses `getDeathGodSpritePath()` to get sprite paths
- Changed from placeholder '?' to actual PixelLab sprites

**File:** `packages/renderer/src/sprites/SpriteService.ts`
- Added death god sprite paths to `KNOWN_AVAILABLE_SPRITES`

## API Reference

### POST /api/sprites/generate

Queue sprite generation for a missing sprite.

**Request:**
```json
{
  "folderId": "string (required)",
  "traits": {
    "species": "string (optional)",
    "gender": "string (optional)",
    "hairColor": "string (optional)",
    "skinTone": "string (optional)"
  },
  "description": "string (required)"
}
```

**Response:**
```json
{
  "status": "queued",
  "folderId": "test-alien-radial",
  "message": "Sprite generation queued. Check sprite-generation-queue.json..."
}
```

### GET /api/sprites/generate/status/:folderId

Check generation status for a sprite.

**Response:**
```json
{
  "status": "queued|generating|complete|failed",
  "folderId": "test-alien-radial",
  "queuedAt": 1704240000000,
  "error": "string (if failed)"
}
```

### GET /api/sprites/queue

List all pending sprite generation jobs.

**Response:**
```json
{
  "pending": 1,
  "jobs": [
    {
      "folderId": "test-alien-radial",
      "status": "queued",
      "description": "Radially symmetric pentagonal alien creature...",
      "queuedAt": 1704240000000
    }
  ]
}
```

## Next Steps

1. **Restart metrics server** to load new endpoints:
   ```bash
   # Stop old server (Ctrl+C)
   npm run metrics-server
   ```

2. **Test the endpoints** using `test-sprite-api.sh`

3. **Monitor the queue** and process sprites as they're requested

4. **Future enhancement:** Implement automatic processing using MCP client SDK

## Troubleshooting

**Q: Sprite request returns 404**
A: Metrics server needs to be restarted to load the new endpoints.

**Q: Sprite stays "queued" forever**
A: The queue must be manually processed using PixelLab MCP tools. Check `sprite-generation-queue.json` for pending jobs.

**Q: How do I know which API to use (create_character vs create_map_object)?**
A:
- Use `create_character` for bipedal humanoids (humans, death gods, etc.)
- Use `create_map_object` for non-humanoid creatures (aliens, animals, objects)

**Q: Client keeps requesting the same sprite**
A: Make sure the sprite folder name matches exactly `folderId` and contains the required PNG files (south.png, west.png, etc. for 8-directional).
