# Deterministic Sprite Generator - Quick Start

## What is this?

A **pure algorithmic pixel art generator** - no machine learning, fully deterministic, zero API costs.

Same seed = same sprite, every time. Client-side generation only.

## Running the Test Screen

```bash
cd custom_game_engine/packages/deterministic-sprite-generator
npm run test-screen
```

Opens **http://localhost:3010/** - standalone demo with:
- Live sprite generation
- Parameter tweaking (seed, colors, template)
- Determinism proof (generates same sprite 5x to verify)
- Game data integration (upload save files to see what agents would look like)

## How it Works

```typescript
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

const sprite = generateSprite({
  seed: 'agent_12345',           // Deterministic seed (hash-based)
  template: 'humanoid',           // Body structure
  colors: {
    skin: { r: 255, g: 200, b: 180, a: 255 },
    hair: { r: 100, g: 50, b: 20, a: 255 }
  },
  scale: 4                        // Pixel scaling
});

// Returns PixelData (Uint8ClampedArray)
// Same seed ALWAYS produces same sprite
```

## Architecture

1. **DeterministicRandom** - Hash string seed → reproducible RNG
2. **SpriteTemplate** - Define body structure (slots, zIndex)
3. **PartLibrary** - Procedural drawing functions for each body part
4. **SpriteComposer** - Layer parts in correct order → final sprite

## Templates

- **simple** - Basic shapes (for debugging)
- **humanoid** - Head, body, eyes, hair, clothes, accessories
- **quadruped** - Body, head, legs, tail, ears

## Adding New Parts

Edit `src/parts.ts`:

```typescript
{
  id: 'hair_spiky',
  name: 'Spiky Hair',
  slot: 'hair',
  tags: ['spiky', 'punk'],
  colorZones: ['hair'],
  draw: (w, h, colors) => {
    const canvas = new PixelCanvas(w, h);
    const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

    // Draw procedurally
    canvas.fillRect(5, 2, 6, 4, hair);
    // ... spiky points ...

    return canvas.toPixelData();
  },
}
```

Parts are selected **randomly but deterministically** based on seed.

## Adding New Templates

Edit `src/templates.ts`:

```typescript
dragon: {
  id: 'dragon',
  name: 'Dragon',
  baseSize: { width: 32, height: 24 },
  slots: [
    { name: 'body', required: true, zIndex: 0, defaultAnchor: { x: 16, y: 12 } },
    { name: 'wings', required: true, zIndex: -1, defaultAnchor: { x: 16, y: 8 } },
    { name: 'head', required: true, zIndex: 1, defaultAnchor: { x: 24, y: 8 } },
    { name: 'horns', required: false, zIndex: 2, defaultAnchor: { x: 24, y: 4 } },
  ],
}
```

## Not Integrated with Game

This package is **completely isolated** from the game engine:
- Zero dependencies on game code
- Test screen runs standalone
- Can import game data for demos (optional)
- If proven useful, can integrate later

## Key Differences vs PixelLab (ML)

| Feature | Deterministic Generator | PixelLab (ML) |
|---------|------------------------|---------------|
| Method | Pure algorithms | Neural network |
| Determinism | 100% reproducible | Stochastic |
| Cost | Free | API credits |
| Speed | Instant | 10-30s per sprite |
| Quality | Procedural/geometric | High artistic quality |
| Variation | Template + parts | Infinite via prompts |
| Client-side | Yes | No (requires API) |
| Offline | Yes | No |

## Use Cases

- **Multiplayer sync**: Same seed = same sprite on all clients
- **Procedural NPCs**: Generate infinite unique sprites from IDs
- **Offline mode**: No API required
- **Debugging**: Faster iteration than waiting for ML
- **Prototyping**: Test sprite variations quickly
- **Hybrid**: Use PixelLab for heroes, deterministic for NPCs

## Next Steps

1. Add more body part variations
2. Implement animation templates
3. Add color palette generation from genetics
4. Support for equipment/accessories layering
5. Export to spritesheet format
6. Integration with game's GeneticComponent

## Files

```
src/
├── types.ts              - Core type definitions
├── DeterministicRandom.ts - Hash-based RNG
├── PixelCanvas.ts        - Pixel drawing utilities
├── templates.ts          - Body structure definitions
├── parts.ts              - Procedural drawing library
├── generateSprite.ts     - Main API
└── index.ts              - Exports

test-screen/
├── index.html            - UI
├── style.css             - Styling
├── main.ts               - Demo logic
└── vite.config.ts        - Dev server config
```

## Philosophy

**Conservation of tokens, conservation of cost, conservation of simplicity.**

ML is powerful but not always necessary. Sometimes pure algorithms + good randomness is enough.

This generator proves you can create infinite sprite variations with:
- Zero ML
- Zero API calls
- Zero cost
- 100% determinism
- Full client-side control

If you need artistic quality, use PixelLab. If you need speed, cost efficiency, and determinism, use this.

**Both can coexist.** 🎨
