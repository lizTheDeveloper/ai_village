# Deterministic Sprite Generator

**Pure algorithmic pixel art generation - no ML, fully deterministic.**

## Features

- **Modular composition**: Layer body parts (head, body, legs, accessories)
- **Hash-based generation**: Same seed = same sprite, always
- **Parametric variation**: Colors, proportions, scale from parameters
- **Zero dependencies**: Pure TypeScript, works in browser/Node
- **No API costs**: Client-side generation only

## Architecture

```
DeterministicRandom (seed) → Select parts → Compose layers → Final sprite
```

## Usage

```typescript
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

const sprite = generateSprite({
  seed: 'agent_12345',           // Deterministic seed
  template: 'humanoid',           // Template type
  colors: {                       // Optional color overrides
    skin: { r: 255, g: 200, b: 180, a: 255 },
    hair: { r: 100, g: 50, b: 20, a: 255 }
  },
  scale: 2                        // Optional scaling
});

// Result is PixelData (Uint8ClampedArray)
// Same seed always produces same sprite
```

## Test Screen

```bash
npm run test-screen
# Opens http://localhost:3010
```

Standalone demo that shows:
- Live sprite generation
- Parameter tweaking
- Seed comparison (determinism proof)
- Game data import (optional)

## Not Integrated with Game

This package is **completely separate** from the main game engine. It's a research/prototype tool that can:
- Use game data (agent genetics, species) for demos
- Generate sprites independently
- Be tested without running the game

If proven useful, integration can happen later. For now, it's isolated.
