# Microgenerators

Procedural content generation system enabling external tools and LLM collaboration to create legendary items, spells, riddles, recipes, souls, and other content that persists across the multiverse.

## Architecture

**GodCraftedQueue**: Central repository storing all generated content. Implements Conservation of Game Matter - content never deleted, only marked. Content drifts through universes via discovery system.

**GodCraftedDiscoverySystem**: Spawns content spatially during chunk generation. Uses deterministic randomness based on chunk coordinates, power-level gating, and universe-specific discovery tracking.

**Generators**: LLM-powered content creators that validate input, generate via prompts, and submit to queue.

## Content Types

- `legendary_item` - Unique items with powers, lore, destiny
- `spell` - Magic spells with techniques, forms, reagents, effects
- `recipe` - Crafting recipes with ingredients, stations, output items
- `riddle` - Personalized riddles with answers, difficulty, LLM judgment
- `soul` - Pre-generated souls with backstory, mission, personality
- `quest`, `technology`, `deity`, `religion` - Planned future types

## Generators

**RiddleBookMicrogenerator**: Creates personalized riddles using `RiddleGenerator`. For death bargains, hero challenges.

**SpellLabMicrogenerator**: Generates spells from techniques, forms, reagents. Power-level gated (1-10).

**CulinaryMicrogenerator**: Creates recipes from ingredients. Outputs craftable items with properties.

## Usage

```typescript
import { godCraftedQueue } from './GodCraftedQueue.js';
import { SpellLabMicrogenerator } from './SpellLabMicrogenerator.js';

// Generate spell
const generator = new SpellLabMicrogenerator(llmProvider);
const spell = await generator.generate({
  creator: { id: 'god:1', name: 'Merlin', godOf: 'Magic' },
  tags: ['fire', 'combat'],
  data: {
    intent: 'Launch a fireball',
    techniques: ['evocation'],
    forms: ['projectile'],
    powerLevel: 5
  }
});

// Query content
const undiscovered = godCraftedQueue.pullForUniverse('universe:123');
const byCreator = godCraftedQueue.getByCreator('god:1');

// Discovery system (called by chunk generator)
discoverySystem.spawnContentInChunk(world, { x: 0, y: 0, biome: 'forest', size: 32 });
```

## Discovery Flow

1. Generator validates input, creates content, submits to `GodCraftedQueue`
2. Content persists with `validated: true`, `discoveries: []`
3. `GodCraftedDiscoverySystem` pulls undiscovered content for universe
4. System spawns content during chunk generation (1% of chunks)
5. Entity created with `generated_content` + `god_crafted_artifact` components
6. Discovery marked via `godCraftedQueue.markDiscovered()`
7. Event emitted: `godcrafted:discovered`

## Divine Signature

All content attributed to creator with signature:

```typescript
{
  id: 'god:unique',
  name: 'Creator Name',
  godOf: 'Domain',
  createdAt: timestamp,
  source: 'microgenerator' | 'llm_collab' | 'manual',
  previousCreations: number
}
```

## Power Level Gating

Prevents overpowered content in early-game areas. `GodCraftedDiscoverySystem` filters by `maxPowerLevel` before spawning. Spells use explicit `powerLevel` field (1-10). Items/tech extraction TBD.

## Persistence

Queue serializes to save files via `serialize()`/`deserialize()`. Maintains indexes (type, creator, tags) for fast queries. Discoveries tracked per-universe, enabling multiverse content drift.
