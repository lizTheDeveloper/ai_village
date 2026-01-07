# Deterministic Sprite Generator - Pure Algorithmic Pixel Art

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the sprite generator to understand its architecture, determinism principles, and usage patterns.

## Overview

The **Deterministic Sprite Generator** (`@ai-village/deterministic-sprite-generator`) is a pure algorithmic pixel art generation system with **no machine learning, zero API costs, and complete determinism**. The same seed always produces the same sprite.

**What it does:**
- Generates pixel art sprites from string seeds using hash-based randomization
- Modular composition system (body parts layered with z-index)
- Parametric variation via colors, scale, and template selection
- Client-side only (works in browser and Node.js with zero dependencies)
- Planetary art styles (NES, SNES, PS1, GBA, Game Boy, Neo Geo)
- Interactive sprite wizard for generating consistent part libraries

**Key files:**
- `src/generateSprite.ts` - Main sprite generation function
- `src/DeterministicRandom.ts` - Seeded RNG (Linear Congruential Generator)
- `src/templates.ts` - Body structure definitions (humanoid, quadruped, simple)
- `src/parts.ts` - Procedural drawing functions for body parts
- `src/PixelCanvas.ts` - Low-level pixel drawing utilities
- `src/artStyles.ts` - Planetary art style configurations
- `sprite-set-generator/main.ts` - Interactive wizard for part library generation

**NOT integrated with game:** This is a standalone research/prototype package. It can import game data for demos but runs independently.

---

## Package Structure

```
packages/deterministic-sprite-generator/
├── src/
│   ├── generateSprite.ts           # Main generation function
│   ├── DeterministicRandom.ts      # Seeded RNG (LCG algorithm)
│   ├── templates.ts                # Sprite templates (humanoid, quadruped, etc.)
│   ├── parts.ts                    # Part library (heads, bodies, hair, etc.)
│   ├── PixelCanvas.ts              # Pixel drawing primitives
│   ├── scalePixelData.ts           # Nearest-neighbor scaling
│   ├── artStyles.ts                # Planetary art style configs
│   ├── types.ts                    # TypeScript interfaces
│   └── index.ts                    # Package exports
├── test-screen/
│   ├── main.ts                     # Standalone demo UI
│   └── index.html                  # Test harness
├── sprite-set-generator/
│   ├── main.ts                     # Interactive part wizard
│   └── index.html                  # Wizard UI
├── scripts/
│   ├── generate-pixellab-parts.ts  # PixelLab API integration
│   ├── generate-snes-parts.ts      # SNES-style part generator
│   └── batch-generate-snes-parts.ts # Batch SNES generation
├── package.json
├── QUICKSTART.md                   # Quick reference
└── README.md                       # This file
```

---

## Core Concepts

### 1. Deterministic Randomization

The generator uses a **Linear Congruential Generator (LCG)** seeded with a hash of the input string. This ensures:

- **Same seed = same sprite, always**
- **Reproducible across sessions, platforms, and time**
- **No external dependencies** (no Math.random())

```typescript
class DeterministicRandom {
  private state: number;

  constructor(seed: string) {
    this.state = this.hashString(seed);  // String → number hash
  }

  next(): number {
    // LCG: x_{n+1} = (a * x_n + c) mod m
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;  // [0, 1)
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)]!;
  }

  derive(suffix: string): DeterministicRandom {
    // Create sub-generator for isolated randomization
    return new DeterministicRandom(this.state.toString() + suffix);
  }
}
```

**Why this matters:**
- **Agent sprites**: `seed = "agent_" + agentId` → always generates same appearance
- **Species consistency**: `seed = "species_wolf"` → all wolves look similar (with per-agent variation)
- **Time travel**: Save files can regenerate exact sprites from stored seeds
- **Debugging**: Same seed = same output = reproducible bugs

### 2. Sprite Templates

Templates define the **body structure** and **slot composition** for different entity types:

```typescript
interface SpriteTemplate {
  id: string;                      // 'humanoid', 'quadruped', 'simple'
  name: string;                    // Display name
  baseSize: { width: number; height: number };  // Canvas size (16x24, 20x16, etc.)
  slots: SpriteSlot[];             // Body part slots
}

interface SpriteSlot {
  name: string;                    // 'head', 'body', 'hair', 'tail', etc.
  required: boolean;               // Must have a part?
  zIndex: number;                  // Layering order (lower = behind)
  defaultAnchor: Point;            // Attachment point (for future anchor system)
}
```

**Available templates:**

**Humanoid** (16×24 pixels):
- Slots: `body` (z=0), `head` (z=1), `eyes` (z=2), `hair` (z=3), `clothes` (z=4), `accessory` (z=5)
- Use for: Agents, NPCs, player characters

**Quadruped** (20×16 pixels):
- Slots: `body` (z=0), `head` (z=1), `legs` (z=-1), `tail` (z=-2), `ears` (z=2)
- Use for: Animals, creatures, mounts

**Simple** (16×16 pixels):
- Slots: `base` (z=0), `detail` (z=1)
- Use for: Debugging, testing, placeholder sprites

**Example:**
```typescript
const template = getTemplate('humanoid');
// Returns humanoid template with 6 slots
```

### 3. Part Library

Parts are **procedural drawing functions** that generate pixels algorithmically:

```typescript
interface PartDefinition {
  id: string;                      // 'humanoid_head_round', 'hair_spiky'
  name: string;                    // Display name
  slot: string;                    // 'head', 'hair', 'body', etc.
  tags: string[];                  // ['humanoid', 'round'], ['spiky', 'punk']
  colorZones: string[];            // ['skin', 'hair'] - parametric colors
  draw: (width, height, colors) => PixelData;  // Procedural drawing function
}
```

**Current part library:**
- **Humanoid bodies**: `stocky`, `thin`, `athletic` (3 variations)
- **Humanoid heads**: `round`, `square`, `oval` (3 variations)
- **Eyes**: `dot`, `normal`, `wide`, `narrow` (4 variations)
- **Hair**: `short`, `long`, `spiky`, `curly`, `bald`, `ponytail` (6 variations)
- **Simple shapes**: `square`, `circle` (debug parts)

**Total combinations** (humanoid): 3 bodies × 3 heads × 4 eyes × 6 hair = **216 unique sprites** (before colors)

**Example part:**
```typescript
{
  id: 'humanoid_body_athletic',
  name: 'Athletic Body',
  slot: 'body',
  tags: ['humanoid', 'athletic'],
  colorZones: ['skin'],
  draw: (w, h, colors) => {
    const canvas = new PixelCanvas(w, h);
    const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };
    const muscle = { r: skin.r - 20, g: skin.g - 20, b: skin.b - 20, a: 255 };

    // V-shaped torso
    canvas.fillRect(5, 9, 6, 3, skin);
    canvas.fillRect(6, 12, 4, 5, skin);
    canvas.setPixel(5, 12, muscle);  // Definition

    // ... arms and legs ...

    return canvas.toPixelData();
  }
}
```

### 4. Generation Pipeline

```
1. Hash seed string → Initialize RNG
2. Select template → Get slot definitions
3. For each slot:
   a. Derive sub-RNG (deterministic per slot)
   b. Query part library for slot
   c. Pick random part (deterministic)
   d. Execute part.draw() with colors
4. Sort parts by zIndex
5. Composite layers (alpha blending)
6. Scale to final size (nearest-neighbor)
7. Return PixelData
```

**Example flow:**
```typescript
generateSprite({
  seed: 'agent_12345',
  template: 'humanoid',
  colors: { skin: {...}, hair: {...} },
  scale: 2
});

// Internally:
const rng = new DeterministicRandom('agent_12345');
const template = getTemplate('humanoid');

for (const slot of template.slots) {
  const slotRng = rng.derive(`slot_${slot.name}`);  // Isolated RNG
  const parts = getPartsBySlot(slot.name);
  const part = slotRng.pick(parts);  // Deterministic selection
  selectedParts.push({ ...part, pixelData: part.draw(w, h, colors) });
}

// Composite and scale...
```

### 5. Planetary Art Styles

Each planet/universe renders sprites in a different retro console art style:

```typescript
type ArtStyle = 'nes' | 'snes' | 'ps1' | 'gba' | 'gameboy' | 'neogeo';

interface ArtStyleConfig {
  era: string;                     // '16-bit SNES (1991-1996)'
  description: string;             // Reference aesthetics
  baseSizes: { min: number; max: number };  // Sprite sizes
  colorDepth: string;              // '256 colors', '4 shades', etc.
  shadingStyle: 'flat shading' | 'basic shading' | 'medium shading' | 'detailed shading';
  outlineStyle: 'single color outline' | 'selective outline' | 'lineless';
  partsDirectory: string;          // 'assets/parts/snes/'
  referenceImageId?: string;       // PixelLab reference (if any)
}
```

**Available styles:**

| Style | Era | Canvas Size | Colors | Shading | Example Games |
|-------|-----|-------------|--------|---------|---------------|
| `nes` | 8-bit (1985-1990) | 32-48px | 56 colors | Flat | Super Mario Bros |
| `snes` | 16-bit (1991-1996) | 64-96px | 256 colors | Medium | Chrono Trigger |
| `ps1` | 32-bit (1995-2000) | 128-192px | Thousands | Detailed | Final Fantasy Tactics |
| `gba` | GBA (2001-2008) | 64-80px | 32,768 colors | Medium | Golden Sun |
| `gameboy` | GB (1989-1998) | 32-48px | 4 shades | Basic | Pokemon Red/Blue |
| `neogeo` | Arcade (1990-2004) | 128-256px | 65,536 colors | Detailed | Metal Slug |

**Usage:**
```typescript
const sprite = generateSprite({
  seed: 'agent_001',
  template: 'humanoid',
  planetaryArtStyle: 'snes'  // 16-bit pixel art style
});
```

**Planetary integration (future):**
```typescript
// Each planet has an art style
const planetStyle = getArtStyleFromPlanetId('planet_alpha_001');
// Returns: 'snes' (deterministic hash of planet ID)
```

### 6. Color Zones

Parts declare **color zones** that can be parameterized:

```typescript
colorZones: ['skin', 'hair', 'eye', 'clothing']

// Generation with custom colors
const sprite = generateSprite({
  seed: 'agent_123',
  template: 'humanoid',
  colors: {
    skin: { r: 255, g: 200, b: 180, a: 255 },
    hair: { r: 100, g: 50, b: 20, a: 255 },
    eye: { r: 0, g: 100, b: 200, a: 255 }
  }
});
```

**Default colors** apply if not specified. Parts use `colors.zoneName || defaultColor` pattern.

---

## API Reference

### Main Generation Function

```typescript
function generateSprite(params: GenerationParams): GeneratedSprite
```

**Parameters:**

```typescript
interface GenerationParams {
  seed: string;                    // Deterministic seed (e.g., 'agent_12345')
  template: string;                // Template ID ('humanoid', 'quadruped', 'simple')
  colors?: Record<string, Color>;  // Optional color overrides
  scale?: number;                  // Pixel scaling (default: 1)
  variations?: Record<string, any>; // Future: part selection hints
  planetaryArtStyle?: ArtStyle;    // Art style (default: 'snes')
}

interface Color {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a: number;  // 0-255
}
```

**Returns:**

```typescript
interface GeneratedSprite {
  params: GenerationParams;        // Input params (for verification)
  pixelData: PixelData;            // Final sprite
  parts: SpritePart[];             // Selected parts (for inspection)
  metadata: {
    generatedAt: number;           // Timestamp
    deterministic: true;           // Always true
    version: string;               // Generator version
  };
}

interface PixelData {
  width: number;                   // Pixel width
  height: number;                  // Pixel height
  pixels: Uint8ClampedArray;       // RGBA pixel data (width × height × 4)
}
```

### DeterministicRandom API

```typescript
class DeterministicRandom {
  constructor(seed: string);

  next(): number;                  // Random [0, 1)
  nextInt(min: number, max: number): number;  // Random integer [min, max)
  pick<T>(array: T[]): T;          // Pick random element
  shuffle<T>(array: T[]): T[];     // Fisher-Yates shuffle
  derive(suffix: string): DeterministicRandom;  // Create sub-generator
}
```

### PixelCanvas API

```typescript
class PixelCanvas {
  constructor(width: number, height: number);

  setPixel(x: number, y: number, color: Color): void;
  getPixel(x: number, y: number): Color;
  fillRect(x: number, y: number, width: number, height: number, color: Color): void;
  drawCircle(cx: number, cy: number, radius: number, color: Color): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color): void;
  compositeOver(other: PixelData, offsetX: number, offsetY: number): void;  // Alpha blend
  toPixelData(): PixelData;
}
```

### Template API

```typescript
function getTemplate(id: string): SpriteTemplate;  // Throws if not found

const TEMPLATES: Record<string, SpriteTemplate>;   // All templates
```

### Part Library API

```typescript
function getPartsBySlot(slot: string): PartDefinition[];  // Filter by slot
function getPartById(id: string): PartDefinition | undefined;  // Lookup by ID

const PARTS: PartDefinition[];  // All parts
```

### Art Style API

```typescript
function getArtStyle(style: ArtStyle): ArtStyleConfig;
function getArtStyleFromPlanetId(planetId: string): ArtStyle;  // Deterministic hash

const ART_STYLES: Record<ArtStyle, ArtStyleConfig>;
```

---

## Usage Examples

### Example 1: Basic Sprite Generation

```typescript
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

// Generate a sprite from a seed
const sprite = generateSprite({
  seed: 'agent_001',
  template: 'humanoid',
  scale: 4  // 4x upscaling for display
});

// Result
console.log(sprite.pixelData.width);   // 64 (16 × 4)
console.log(sprite.pixelData.height);  // 96 (24 × 4)
console.log(sprite.parts.length);      // 4-6 parts (body, head, eyes, hair, etc.)

// Render to canvas
const ctx = canvas.getContext('2d')!;
const imageData = new ImageData(sprite.pixelData.pixels, sprite.pixelData.width, sprite.pixelData.height);
ctx.putImageData(imageData, 0, 0);
```

### Example 2: Custom Colors

```typescript
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

// Generate sprite with custom skin/hair colors
const sprite = generateSprite({
  seed: 'agent_dark_elf',
  template: 'humanoid',
  colors: {
    skin: { r: 80, g: 60, b: 100, a: 255 },   // Dark purple skin
    hair: { r: 255, g: 255, b: 255, a: 255 }, // White hair
    eye: { r: 255, g: 50, b: 50, a: 255 }     // Red eyes
  },
  scale: 2
});
```

### Example 3: Determinism Verification

```typescript
// Generate same sprite 10 times - all should be identical
const seed = 'determinism_test_001';
const sprites = [];

for (let i = 0; i < 10; i++) {
  sprites.push(generateSprite({ seed, template: 'humanoid' }));
}

// Verify all pixel data is identical
for (let i = 1; i < sprites.length; i++) {
  const match = sprites[0]!.pixelData.pixels.every((pixel, idx) =>
    pixel === sprites[i]!.pixelData.pixels[idx]
  );
  console.log(`Sprite ${i} matches sprite 0: ${match}`);  // All true
}
```

### Example 4: Planetary Art Styles

```typescript
// Generate sprites in different art styles
const styles: ArtStyle[] = ['nes', 'snes', 'ps1', 'gba', 'gameboy', 'neogeo'];

for (const style of styles) {
  const sprite = generateSprite({
    seed: 'agent_multiverse',
    template: 'humanoid',
    planetaryArtStyle: style
  });

  console.log(`${style}: ${sprite.pixelData.width}×${sprite.pixelData.height}`);
  // nes: 16×24
  // snes: 16×24 (base size same, part library would differ)
  // ps1: 16×24
  // ... etc.
}

// Future: Art style determines which part library is used
// const config = getArtStyle('snes');
// const parts = loadPartsFromDirectory(config.partsDirectory);
```

### Example 5: Agent Integration (Future)

```typescript
// Hypothetical integration with game agents
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

function generateAgentSprite(agent: AgentEntity): PixelData {
  const identity = agent.getComponent<IdentityComponent>('identity');

  // Seed from agent ID for consistency
  const seed = `agent_${agent.id}`;

  // Future: Extract colors from genetics
  const genetics = agent.getComponent('genetics');
  const colors = {
    skin: geneticsToSkinColor(genetics),
    hair: geneticsToHairColor(genetics),
    eye: geneticsToEyeColor(genetics)
  };

  const sprite = generateSprite({
    seed,
    template: 'humanoid',
    colors,
    scale: 4,
    planetaryArtStyle: getCurrentPlanetStyle()
  });

  return sprite.pixelData;
}
```

### Example 6: Creating Custom Parts

```typescript
// Add a new hair part to parts.ts
import { PixelCanvas } from './PixelCanvas.js';
import type { PartDefinition } from './types.js';

export const PARTS: PartDefinition[] = [
  // ... existing parts ...

  {
    id: 'hair_mohawk',
    name: 'Mohawk',
    slot: 'hair',
    tags: ['punk', 'spiky'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 255, g: 0, b: 0, a: 255 };  // Default red
      const dark = { r: hair.r - 40, g: hair.g, b: hair.b, a: 255 };

      // Central ridge
      canvas.fillRect(7, 0, 2, 6, hair);
      canvas.setPixel(7, 0, dark);  // Spike tip
      canvas.setPixel(8, 1, dark);

      // Shaved sides (optional shading)
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };
      canvas.setPixel(5, 4, skin);
      canvas.setPixel(10, 4, skin);

      return canvas.toPixelData();
    }
  }
];

// Now 'hair_mohawk' is in the pool - deterministic selection will pick it for some seeds
```

### Example 7: Creating Custom Templates

```typescript
// Add a new template to templates.ts
import type { SpriteTemplate } from './types.js';

export const TEMPLATES: Record<string, SpriteTemplate> = {
  // ... existing templates ...

  dragon: {
    id: 'dragon',
    name: 'Dragon',
    baseSize: { width: 32, height: 28 },
    slots: [
      { name: 'body', required: true, zIndex: 0, defaultAnchor: { x: 16, y: 14 } },
      { name: 'wings', required: true, zIndex: -1, defaultAnchor: { x: 16, y: 10 } },
      { name: 'head', required: true, zIndex: 1, defaultAnchor: { x: 24, y: 10 } },
      { name: 'tail', required: false, zIndex: -2, defaultAnchor: { x: 8, y: 16 } },
      { name: 'horns', required: false, zIndex: 2, defaultAnchor: { x: 24, y: 6 } },
      { name: 'fire', required: false, zIndex: 3, defaultAnchor: { x: 28, y: 12 } },
    ],
  },
};

// Then create parts for each slot (dragon_body_*, dragon_wings_*, etc.)
```

---

## Architecture & Data Flow

### Generation Pipeline

```
1. Input: { seed, template, colors, scale, artStyle }
   ↓
2. DeterministicRandom.constructor(seed)
   → Hash seed string to initial state
   ↓
3. getTemplate(templateId)
   → Load slot definitions
   ↓
4. For each slot:
   a. rng.derive(`slot_${slotName}`)  → Isolated RNG
   b. getPartsBySlot(slotName)        → Query part library
   c. slotRng.pick(parts)             → Deterministic selection
   d. part.draw(width, height, colors) → Execute drawing function
   ↓
5. Sort parts by zIndex (ascending)
   ↓
6. PixelCanvas.compositeOver() for each part
   → Alpha blending from bottom to top
   ↓
7. scalePixelData(canvas, scale)
   → Nearest-neighbor upscaling
   ↓
8. Output: { pixelData, parts, metadata }
```

### Determinism Guarantees

```
Seed → Hash → LCG State → Part Selection → Drawing → Pixels
  ↓       ↓       ↓            ↓             ↓         ↓
Same   Same    Same         Same          Same      Same

Properties:
- Platform-independent (no reliance on Math.random())
- Time-independent (no Date.now() in generation)
- Session-independent (no external state)
- Pure function (no side effects)
```

### Component Relationships

```
generateSprite()
├── DeterministicRandom (seed-based RNG)
│   ├── hashString() → Initial state
│   ├── next() → LCG iteration
│   ├── pick() → Array selection
│   └── derive() → Sub-generators
├── SpriteTemplate (structure)
│   └── SpriteSlot[] → Layering rules
├── PartDefinition[] (library)
│   ├── slot → Filter by slot
│   └── draw() → Procedural generation
├── PixelCanvas (composition)
│   ├── setPixel() → Low-level drawing
│   ├── fillRect() → Primitives
│   ├── drawCircle() → Shapes
│   └── compositeOver() → Alpha blending
└── scalePixelData() → Nearest-neighbor scaling
```

---

## Performance Considerations

**Generation speed:**
- **Humanoid sprite** (~6 parts): ~5-10ms on modern hardware
- **Quadruped sprite** (~5 parts): ~3-8ms
- **Simple sprite** (~2 parts): ~1-3ms

**Optimization strategies:**

1. **No allocations in hot path**: Parts reuse PixelCanvas instances where possible
2. **Typed arrays**: `Uint8ClampedArray` for pixel data (GPU-compatible)
3. **Nearest-neighbor scaling**: O(w×h) scaling, no interpolation overhead
4. **Cached part queries**: `getPartsBySlot()` filters once per slot, not per call
5. **Integer math**: LCG uses bitwise ops, no floating-point except final division

**Query caching (future optimization):**

```typescript
// ❌ BAD: Query parts every generation
for (let i = 0; i < 1000; i++) {
  const parts = getPartsBySlot('head');  // Filter every time!
  const sprite = generateSprite({ seed: `agent_${i}`, template: 'humanoid' });
}

// ✅ GOOD: Cache part queries
const partCache = new Map<string, PartDefinition[]>();
for (const slot of ['head', 'body', 'hair', 'eyes']) {
  partCache.set(slot, getPartsBySlot(slot));
}
// Use partCache in custom generator
```

**Memory usage:**
- **16×24 humanoid**: 1,536 pixels × 4 bytes = 6 KB
- **20×16 quadruped**: 320 pixels × 4 bytes = 1.3 KB
- **Scaled 4× (64×96)**: 6,144 pixels × 4 bytes = 24 KB

**Browser rendering:**
```typescript
// ✅ Efficient: ImageData from Uint8ClampedArray (zero-copy)
const imageData = new ImageData(sprite.pixelData.pixels, sprite.pixelData.width, sprite.pixelData.height);
ctx.putImageData(imageData, 0, 0);

// ❌ Inefficient: Converting to base64 → img.src (extra encoding)
```

---

## Development Tools

### Test Screen

```bash
cd custom_game_engine/packages/deterministic-sprite-generator
npm run test-screen
# Opens http://localhost:3010
```

**Features:**
- Live sprite generation with parameter controls
- Determinism verification (generates same sprite 5× to prove consistency)
- Seed input, template selection, color pickers
- Game data import (upload save files to generate agent sprites)
- Part inspection (see which parts were selected)

### Sprite Wizard

```bash
npm run sprite-wizard
# Opens http://localhost:3011
```

**Features:**
- Interactive part library generator
- PixelLab API integration for generating reference sprites
- Batch generation of consistent part sets
- Style matching (uses reference image for aesthetic consistency)
- Export to TypeScript part definitions

### Scripts

```bash
# Generate SNES-style parts using PixelLab API
node scripts/generate-snes-parts.ts

# Batch generate all parts for a template
node scripts/batch-generate-snes-parts.ts

# Generate PixelLab parts from manifest
node scripts/generate-pixellab-parts.ts
```

---

## Troubleshooting

### Sprites not deterministic

**Check:**
1. Same seed string? (case-sensitive, whitespace matters)
2. Same template ID?
3. Same color overrides? (colors must match exactly)
4. Same scale?
5. Using `Math.random()` anywhere? (should only use `DeterministicRandom`)

**Debug:**
```typescript
const sprite1 = generateSprite({ seed: 'test', template: 'humanoid' });
const sprite2 = generateSprite({ seed: 'test', template: 'humanoid' });

// Compare pixel data
const match = sprite1.pixelData.pixels.every((pixel, idx) =>
  pixel === sprite2.pixelData.pixels[idx]
);
console.log(`Deterministic: ${match}`);  // Should be true

// Inspect selected parts
console.log(sprite1.parts.map(p => p.id));
console.log(sprite2.parts.map(p => p.id));
// Should be identical
```

### Parts not appearing

**Check:**
1. Slot exists in template? (`template.slots.find(s => s.name === 'slotName')`)
2. Parts exist for slot? (`getPartsBySlot('slotName').length > 0`)
3. Part required but library empty? (throws error)
4. zIndex order correct? (negative zIndex renders behind)

**Debug:**
```typescript
const template = getTemplate('humanoid');
console.log('Slots:', template.slots.map(s => s.name));

for (const slot of template.slots) {
  const parts = getPartsBySlot(slot.name);
  console.log(`${slot.name}: ${parts.length} parts available`);
}
```

### Colors not applying

**Check:**
1. Part declares color zone? (`part.colorZones.includes('skin')`)
2. Color object has all fields? (`{ r, g, b, a }`)
3. RGB values in range 0-255? (clamped to 0-255 internally)
4. Alpha > 0? (alpha=0 is transparent)

**Debug:**
```typescript
const sprite = generateSprite({
  seed: 'color_test',
  template: 'humanoid',
  colors: {
    skin: { r: 255, g: 0, b: 0, a: 255 },  // Bright red
    hair: { r: 0, g: 0, b: 255, a: 255 }   // Bright blue
  }
});

// Inspect parts to see which used colors
for (const part of sprite.parts) {
  const partDef = getPartById(part.id);
  console.log(`${part.id}: colorZones = ${partDef?.colorZones.join(', ')}`);
}
```

### Template not found

**Error:** `Template not found: dragon`

**Fix:** Template ID doesn't exist in `TEMPLATES` object.

```typescript
// Check available templates
import { TEMPLATES } from '@ai-village/deterministic-sprite-generator';
console.log('Available:', Object.keys(TEMPLATES));
// ['humanoid', 'quadruped', 'simple']

// Add new template to src/templates.ts
export const TEMPLATES: Record<string, SpriteTemplate> = {
  // ... existing ...
  dragon: { /* definition */ }
};
```

### Part library empty

**Error:** `No parts available for required slot: body`

**Fix:** Part library has no parts for the required slot.

```typescript
// Check parts for slot
import { getPartsBySlot } from '@ai-village/deterministic-sprite-generator';
console.log('Body parts:', getPartsBySlot('body').map(p => p.id));

// Add parts to src/parts.ts
export const PARTS: PartDefinition[] = [
  // ... existing ...
  {
    id: 'my_new_body',
    slot: 'body',
    // ...
  }
];
```

---

## Integration Patterns

### Game Engine Integration (Future)

```typescript
// Hypothetical: Agent sprite generation
import { generateSprite } from '@ai-village/deterministic-sprite-generator';

class AgentSpriteSystem extends System {
  priority = 100;

  update(world: World): void {
    const agents = world.query().with('agent').without('sprite_data').executeEntities();

    for (const agent of agents) {
      const seed = `agent_${agent.id}`;
      const sprite = generateSprite({
        seed,
        template: 'humanoid',
        colors: this.extractColors(agent),
        scale: 4
      });

      agent.addComponent({
        type: 'sprite_data',
        pixelData: sprite.pixelData,
        seed,  // Store for regeneration
        generatedAt: Date.now()
      });
    }
  }

  extractColors(agent: Entity): Record<string, Color> {
    // Future: Map genetics to colors
    const genetics = agent.getComponent('genetics');
    return {
      skin: this.geneticToColor(genetics.skinTone),
      hair: this.geneticToColor(genetics.hairColor),
      eye: this.geneticToColor(genetics.eyeColor)
    };
  }
}
```

### Save/Load Integration

```typescript
// Save sprite seed instead of pixel data (saves ~24 KB per agent)
interface SavedAgent {
  id: string;
  spriteSeed: string;      // 'agent_12345'
  spriteTemplate: string;  // 'humanoid'
  spriteColors?: Record<string, Color>;
  // ... other data ...
}

// Regenerate on load
function loadAgent(saved: SavedAgent): Entity {
  const agent = world.createEntity();
  // ... restore components ...

  const sprite = generateSprite({
    seed: saved.spriteSeed,
    template: saved.spriteTemplate,
    colors: saved.spriteColors
  });

  agent.addComponent({ type: 'sprite_data', pixelData: sprite.pixelData });
  return agent;
}
```

### Renderer Integration

```typescript
// Hypothetical: Render sprites in game world
class SpriteRenderer {
  renderAgent(agent: Entity, ctx: CanvasRenderingContext2D): void {
    const position = agent.getComponent('position');
    const spriteData = agent.getComponent('sprite_data');

    if (!spriteData) return;

    const imageData = new ImageData(
      spriteData.pixelData.pixels,
      spriteData.pixelData.width,
      spriteData.pixelData.height
    );

    // Render at world position
    ctx.putImageData(imageData, position.x, position.y);
  }
}
```

---

## Testing

No formal test suite yet (research/prototype package). Test via:

```bash
# Manual testing
npm run test-screen

# Visual comparison (determinism verification built into test screen)
```

**Future test structure:**
```bash
npm test -- DeterministicRandom.test.ts
npm test -- generateSprite.test.ts
npm test -- templates.test.ts
```

---

## Further Reading

- **QUICKSTART.md** - Quick reference guide
- **ARCHITECTURE_OVERVIEW.md** - Main engine architecture (not integrated)
- **SYSTEMS_CATALOG.md** - All game systems (not integrated)
- **PixelLab API Docs** - For sprite wizard integration

---

## Summary for Language Models

**Before working with deterministic sprites:**
1. Understand **determinism**: Same seed = same sprite, always
2. Know the **generation pipeline**: Seed → RNG → Template → Parts → Composite → Scale
3. Understand **templates** (structure) vs **parts** (content)
4. Know **color zones** for parametric variation
5. Understand this is **standalone** (not integrated with game)

**Common tasks:**
- **Generate sprite:** `generateSprite({ seed, template, colors?, scale? })`
- **Add new part:** Add to `PARTS` array in `src/parts.ts`
- **Add new template:** Add to `TEMPLATES` object in `src/templates.ts`
- **Verify determinism:** Generate same sprite multiple times, compare pixel data
- **Custom colors:** Pass `colors` object with zone names → Color values
- **Test changes:** `npm run test-screen` for live preview

**Critical rules:**
- Never use `Math.random()` (breaks determinism)
- Never use `Date.now()` in generation logic (breaks determinism)
- Always use `DeterministicRandom` for randomization
- Part `draw()` functions must be pure (no side effects)
- Color overrides must exactly match (including alpha channel)
- Seeds are case-sensitive and whitespace-sensitive
- Same seed + different template = different sprite (expected)

**Determinism properties:**
- Platform-independent (works same on all systems)
- Time-independent (same result now and later)
- Session-independent (same result across restarts)
- Pure functional (no external state)

**Event-driven architecture:**
- NOT event-driven (this is a pure function library)
- No system integration (standalone package)
- No save/load hooks (consumer handles persistence)
- No rendering (consumer handles display)

**Performance:**
- Generation is fast (5-10ms for humanoid)
- Use `ImageData` constructor for zero-copy rendering
- Cache part queries if generating thousands of sprites
- Scale parameter affects memory (4× scale = 16× pixels)
