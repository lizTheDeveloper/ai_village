# PixelLab Sprite Generation Manager

Unified skill for managing the PixelLab sprite generation daemon and workflows.

## Usage

Invoke this skill with a subcommand:

```
pixellab status          - Check daemon status and progress
pixellab start           - Start the daemon in background
pixellab stop            - Stop the daemon gracefully
pixellab logs            - View recent activity logs
pixellab manifest        - Show sprite generation queue
pixellab add             - Add a new sprite to queue
pixellab verify <id>     - Verify a sprite was generated
pixellab variants        - Generate all animal variants
```

---

## Subcommands

### `status` - Check Daemon Status

Check if daemon is running and show progress.

**Actions:**
1. Check for background bash process with "pixellab-daemon.ts"
2. Read last 30 lines of `custom_game_engine/pixellab-daemon.log`
3. Read daemon state from `custom_game_engine/scripts/pixellab-daemon-state.json`
4. Show:
   - Running status (PID if active)
   - Total sprites generated
   - Last activity timestamp
   - Current sprite being generated
   - Recent errors

**Example output:**
```
PixelLab Daemon Status:
✓ Running (PID: 48add8)
Progress: 15/52 sprites generated
Last activity: 2 minutes ago
Currently: horse_white
No errors
```

---

### `start` - Start Daemon

Start the PixelLab sprite generation daemon.

**Actions:**
1. Check if already running (use status check)
2. If not running, start with:
   ```bash
   cd custom_game_engine && npx ts-node scripts/pixellab-daemon.ts 2>&1 | tee -a pixellab-daemon.log
   ```
3. Run in background with `run_in_background: true`
4. Wait 3 seconds and verify startup successful
5. Report background process ID

**Notes:**
- Uses PixelLab API key from `.env`
- Rate limit: 5 seconds between generations
- Logs to `pixellab-daemon.log`

---

### `stop` - Stop Daemon

Gracefully stop the running daemon.

**Actions:**
1. Find daemon's background process ID (from status check)
2. If running, use KillShell tool to stop it
3. Wait 2 seconds for graceful shutdown
4. Verify stopped
5. Show final statistics from state file

**Notes:**
- Daemon saves progress on shutdown (SIGINT handler)
- Pending sprites remain in manifest

---

### `logs` - View Activity Logs

View recent daemon activity and any errors.

**Actions:**
1. Read last 50 lines of `custom_game_engine/pixellab-daemon.log`
2. Parse and summarize:
   - Recently generated sprites (✓ Saved: ...)
   - Errors (✗ Error: ...)
   - Progress reports (--- Progress: ...)
3. If daemon running, also check live output via BashOutput
4. Format with timestamps

**Example output:**
```
Recent Activity (last 50 lines):
[21:23:15] ✓ chicken
[21:23:20] ✓ cow
[21:23:25] ✓ horse_white
Progress: 3/52 sprites

Status: Running, no errors
```

---

### `manifest` - View Generation Queue

Show the entire sprite generation manifest with pending and completed counts.

**Actions:**
1. Read `custom_game_engine/scripts/pixellab-batch-manifest.json`
2. Parse sections:
   - **Humanoids**: humans, elves, dwarves, orcs, thrakeen, celestials, aquatics
   - **Animals**: livestock, pets, wildlife, mythical
   - **Building Tiles**: walls, floors, roofs (isometric)
   - **Tilesets**: terrain transitions
   - **Map Objects**: trees, rocks, decorations
   - **Items**: tools, weapons, consumables

3. For each section count:
   - Completed sprites
   - Pending sprites
   - Show examples from pending queue

4. Calculate overall statistics

**Example output:**
```
PixelLab Sprite Manifest:

Humanoids:
  ✓ 11 completed (humans)
  ⏳ 0 pending

Animals:
  ✓ 2 completed
  ⏳ 50 pending
  Next: horse_white, sheep, pig, goat, deer...

Tilesets:
  ✓ 0 completed
  ⏳ 15 pending

Total: 13 completed, 65 pending
```

---

### `add` - Add Sprite to Queue

Add a new sprite to the generation manifest.

**Actions:**
1. Ask user for details if not provided:
   - **Type**: character, animal, map_object, isometric_tile
   - **ID**: unique identifier (e.g., "dragon_red")
   - **Description**: detailed description for PixelLab
   - **Category**: manifest section (e.g., "animals.mythical")
   - **Size** (optional): dimensions in pixels (default: 48)

2. Read manifest: `custom_game_engine/scripts/pixellab-batch-manifest.json`
3. Navigate to appropriate section
4. Add to `pending` array
5. Save updated manifest
6. Confirm daemon will pick it up automatically

**Example:**
```
Added to queue:
  ID: dragon_red
  Type: animal
  Category: animals.mythical
  Description: Large red dragon, scales gleaming, wings spread
  Size: 64x64

Daemon will generate automatically.
```

---

### `verify <sprite_id>` - Verify Sprite

Check if a sprite was generated correctly.

**Actions:**
1. Determine sprite directory: `packages/renderer/assets/sprites/pixellab/{sprite_id}/`
2. Check for expected files:
   - For variants: 8 directional PNGs (north, south, east, west, NE, NW, SE, SW)
   - For generic: sprite.png
   - metadata.json (always)

3. Verify file sizes and timestamps
4. Read and display metadata
5. Report status

**Example output:**
```
Sprite: chicken_white

✓ Directory exists
✓ 9 files found

Directional sprites:
✓ north.png (1.2KB)
✓ northeast.png (1.5KB)
✓ east.png (1.7KB)
✓ southeast.png (1.5KB)
✓ south.png (1.1KB)
✓ southwest.png (1.5KB)
✓ west.png (1.6KB)
✓ northwest.png (1.8KB)
✓ metadata.json (234B)

Metadata:
  Variant: white feathered chicken
  Size: 48×48
  Generated: 2026-01-03T15:20:00Z

Status: ✓ Complete
```

---

### `variants` - Generate Animal Variants

Batch generate all animal color/pattern variants (8 directions each).

**Actions:**
1. Run variant generator:
   ```bash
   cd custom_game_engine && npx ts-node scripts/generate-all-variants.ts
   ```
2. This is a batch process (runs once and exits, not a daemon)
3. Show progress in real-time
4. Report completion

**Details:**
- 31 variants total (chicken_white, dog_brown, cow_black_white, etc.)
- 8 directional sprites per variant
- 248 total sprites (31 × 8)
- Takes ~20 minutes with 5-second rate limiting
- Saves to: `packages/renderer/assets/sprites/pixellab/{variant_id}/`

**Example output:**
```
🎨 Generating Animal Variants

Total: 31 variants × 8 directions = 248 sprites
Estimated time: ~20 minutes

[Progress updates...]

✅ Complete! Generated 248 variant sprites
```

---

## Files Reference

- `custom_game_engine/scripts/pixellab-daemon.ts` - Main daemon
- `custom_game_engine/scripts/pixellab-batch-manifest.json` - Generation queue
- `custom_game_engine/scripts/pixellab-daemon-state.json` - Progress tracking
- `custom_game_engine/scripts/generate-all-variants.ts` - Variant batch generator
- `custom_game_engine/packages/renderer/assets/sprites/animal-variant-registry.json` - Animal variants
- `custom_game_engine/.env` - Contains PIXELLAB_API_KEY

## API Details

- Endpoint: `https://api.pixellab.ai/v1/generate-image-pixflux`
- Method: Synchronous (returns base64 immediately)
- Rate limit: 5 seconds between requests
- Auth: Bearer token from .env

## Workflow

1. Daemon reads pending sprites from manifest
2. Generates via PixelLab API (synchronous)
3. Saves sprite as PNG + metadata JSON
4. Marks completed in manifest
5. Waits 5 seconds (rate limit)
6. Repeats

When idle (no pending), daemon checks every 60 seconds for new manifest entries.

## On-Demand Generation

As agents are born:
1. Game checks if sprite exists
2. If missing, adds to manifest pending array
3. Daemon picks it up automatically
4. Sprite generated and saved
5. Game uses the sprite

---

## Examples

Check status:
```
pixellab status
```

Start daemon:
```
pixellab start
```

View queue:
```
pixellab manifest
```

Add new sprite:
```
pixellab add
> dragon_red, mythical creature, 64x64
```

Check logs:
```
pixellab logs
```

Verify sprite:
```
pixellab verify chicken_white
```

Stop daemon:
```
pixellab stop
```

Generate all variants:
```
pixellab variants
```
