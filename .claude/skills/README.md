# Claude Skills for AI Village

This directory contains custom Claude skills for managing the AI Village game development workflow.

## PixelLab Sprite Generation

Unified skill for managing the PixelLab daemon that generates game sprites on-demand.

### The `pixellab` Skill

One unified skill with subcommands for all PixelLab operations.

**Usage:**
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

### Quick Examples

**Check if daemon is running:**
```
pixellab status
```

**Start sprite generation:**
```
pixellab start
```

**See what's in the queue:**
```
pixellab manifest
```

**View recent activity:**
```
pixellab logs
```

**Add a new sprite:**
```
pixellab add
```

**Verify a sprite:**
```
pixellab verify chicken_white
```

**Stop the daemon:**
```
pixellab stop
```

**Generate all animal variants:**
```
pixellab variants
```

---

## How Skills Work

In Claude Code, invoke a skill naturally:

```
Can you check pixellab status?
Run pixellab logs
Show me pixellab manifest
```

Or use the Skill tool directly:
```typescript
skill: "pixellab"
```

The skill will parse your request and execute the appropriate subcommand.

---

## PixelLab Architecture

### Overview

The PixelLab daemon generates pixel art sprites on-demand for the game:
- **Animal variants**: 31 color/pattern variants × 8 directions = 248 sprites
- **Characters**: Humanoids with different species, genders, skin tones, hair colors
- **Map objects**: Trees, rocks, decorations, buildings
- **Tilesets**: Terrain transitions (grass→dirt, ocean→beach, etc.)
- **Items**: Tools, weapons, consumables

### Files

```
custom_game_engine/
├── scripts/
│   ├── pixellab-daemon.ts              # Main daemon process
│   ├── pixellab-batch-manifest.json    # Sprite generation queue
│   ├── pixellab-daemon-state.json      # Progress tracking
│   └── generate-all-variants.ts        # Variant batch generator
├── packages/renderer/assets/sprites/
│   ├── pixellab/                       # Generated sprites
│   │   ├── chicken_white/              # Variant with 8 directions
│   │   │   ├── north.png
│   │   │   ├── south.png
│   │   │   ├── east.png
│   │   │   ├── west.png
│   │   │   ├── northeast.png
│   │   │   ├── northwest.png
│   │   │   ├── southeast.png
│   │   │   ├── southwest.png
│   │   │   └── metadata.json
│   │   └── ...
│   └── animal-variant-registry.json    # Animal color variants
└── .env                                # PIXELLAB_API_KEY
```

### API

- **Endpoint**: `https://api.pixellab.ai/v1/generate-image-pixflux`
- **Method**: Synchronous (returns base64 image immediately)
- **Rate limit**: 5 seconds between requests
- **Auth**: Bearer token from `.env`

### Daemon Workflow

1. Read pending sprites from manifest
2. Generate sprite via PixelLab API (synchronous)
3. Save sprite as PNG + metadata JSON
4. Mark sprite as completed in manifest
5. Wait 5 seconds (rate limiting)
6. Repeat

When idle (no pending sprites), daemon checks every 60 seconds for new manifest entries.

### On-Demand Generation

When agents are born in the game:

1. Game checks if sprite exists for that agent type/variant
2. If missing, adds to manifest `pending` array
3. Daemon picks it up automatically (checks every 60s when idle)
4. Sprite is generated and saved
5. Game can now use the sprite

### Sprite Types

**Animal Variants** (8 directional sprites each):
- chicken: white, brown, black
- cow: black_white, brown, brown_white
- dog: brown, black, white, spotted
- cat: orange_tabby, grey_tabby, black, white
- horse: brown, black, white, chestnut
- sheep: white, black, grey
- rabbit: white, brown, grey
- pig: pink, black
- goat: white, brown, black
- deer: brown, spotted

**Humanoid Characters**:
- Species: humans, elves, dwarves, orcs, thrakeen, celestials, aquatics
- Variations: gender, skin tone, hair color, body type

**Map Objects**:
- Trees, rocks, buildings, decorations
- Single sprite per object

**Tilesets**:
- Terrain transitions (16-23 tiles per tileset)
- Example: ocean water → sandy beach with foam

**Isometric Tiles**:
- Building blocks: walls, floors, roofs
- Single isometric tile per item

---

## Development Notes

### Adding New Sprite Types

To add a new sprite type to the manifest:

1. Edit `scripts/pixellab-batch-manifest.json`
2. Add to appropriate section (humanoids, animals, etc.)
3. Use format:
   ```json
   {
     "id": "unique_identifier",
     "desc": "Detailed description for PixelLab API",
     "size": 48
   }
   ```
4. Daemon will automatically generate when it reaches that item

### Testing Sprite Generation

1. Add test sprite to manifest
2. Start daemon: `pixellab start`
3. Monitor logs: `pixellab logs`
4. Verify sprite: `pixellab verify <sprite_id>`
5. Stop daemon: `pixellab stop`

### Debugging

- **Daemon not starting**: Check `.env` has `PIXELLAB_API_KEY`
- **404 errors**: Verify using `/generate-image-pixflux` endpoint
- **Rate limiting**: Default 5s delay between generations
- **Missing sprites**: Check `pixellab-daemon.log` for errors
- **Incomplete generation**: Check daemon state file for progress

---

## API Cost Tracking

The daemon tracks PixelLab API usage:
- Each sprite generation costs ~$0.01-0.05 (varies by size/complexity)
- Costs saved in metadata.json for each sprite
- Check state file for total cost: `scripts/pixellab-daemon-state.json`

---

## Future Enhancements

Potential improvements to the daemon:
- [ ] Parallel generation (multiple sprites at once)
- [ ] Priority queue (urgent sprites first)
- [ ] Retry logic for failed generations
- [ ] Webhook notifications when sprites complete
- [ ] Web UI for queue management
- [ ] Integration with game spawn system
- [ ] Automatic variant generation when new species added
