# Self-Documenting Help System

A comprehensive wiki generation system that embeds documentation directly into game objects (items, spells, effects, buildings) to auto-generate both human-readable and LLM-friendly documentation.

## Philosophy

**Documentation lives with the code, not separately.**

Instead of maintaining separate wiki files that quickly become outdated, each game object carries its own documentation. This ensures:

- ✅ Documentation always stays in sync with code
- ✅ Changes to items automatically update the wiki
- ✅ LLMs can query structured game mechanics
- ✅ Players get accurate, detailed help
- ✅ No duplicate information

## Quick Start

### 1. Add Help to an Item

```typescript
import { defineItem } from '../items/ItemDefinition.js';

const ironSword = defineItem('iron_sword', 'Iron Sword', 'equipment', {
  weight: 2.5,
  baseValue: 200,
  traits: {
    weapon: {
      damage: 15,
      damageType: 'physical',
      attackSpeed: 1.0,
    },
  },
  help: {
    id: 'iron_sword',
    summary: 'A sturdy iron blade forged for combat',
    description: 'Crafted from iron ingots at a forge. Effective against unarmored foes.',
    category: 'items',
    subcategory: 'weapons',
    tags: ['melee', 'craftable', 'metal'],
    obtainedBy: ['Craft at Smithy', 'Purchase from blacksmith'],
    usedFor: ['Combat', 'Hunting'],
    crafting: {
      station: 'Smithy',
      ingredients: [
        { item: 'iron_ingot', amount: 2 },
        { item: 'stick', amount: 1 },
      ],
    },
  },
});
```

### 2. Register Help Entries

```typescript
import { helpRegistry } from '@ai-village/core/help';

// Register individual entry
if (ironSword.help) {
  helpRegistry.register({
    ...ironSword.help,
    id: ironSword.id,
    category: 'items',
  });
}

// Or batch register
const allItems = [ironSword, healingPotion, /* ... */];
for (const item of allItems) {
  if (item.help) {
    helpRegistry.register({ ...item.help, id: item.id, category: 'items' });
  }
}
```

### 3. Generate Wiki

```bash
# Generate both markdown and JSON
npm run generate-wiki

# Only markdown
npm run generate-wiki -- --format=md

# Only JSON for LLMs
npm run generate-wiki -- --format=json

# Single category
npm run generate-wiki -- --category=items
```

## Output Formats

### Markdown (Human-Readable)

Generates structured markdown files in `wiki/markdown/`:

```
wiki/markdown/
├── README.md          # Index with statistics
├── items.md           # All items
├── magic.md           # All spells/effects
├── buildings.md       # All buildings
└── ...
```

**Example Output:**

```markdown
### iron_sword

**A sturdy iron blade forged for combat**

Crafted from iron ingots at a forge. Effective against unarmored foes.

*Tags: `melee`, `craftable`, `metal`*

#### How to Obtain
- Craft at Smithy
- Purchase from blacksmith

#### Uses
- Combat
- Hunting

#### Crafting

**Station:** Smithy

**Ingredients:**
- 2x iron_ingot
- 1x stick
```

### JSON (LLM-Friendly)

Generates structured JSON in `wiki/json/`:

```json
{
  "version": "1.0",
  "generatedAt": "2025-01-15T12:00:00.000Z",
  "stats": {
    "totalEntries": 42,
    "categories": {
      "items": 25,
      "magic": 15,
      "buildings": 2
    }
  },
  "categories": {
    "items": {
      "name": "items",
      "count": 25,
      "subcategories": {
        "weapons": {
          "count": 5,
          "entries": [...]
        }
      }
    }
  }
}
```

## Help Entry Types

### ItemHelpEntry (for items)

```typescript
interface ItemHelpEntry {
  id: string;
  summary: string;              // One-line description
  description: string;          // Detailed explanation
  category: 'items';
  subcategory?: string;         // 'tools', 'weapons', 'food', etc.
  tags: string[];

  // Item-specific
  obtainedBy?: string[];        // How to get it
  usedFor?: string[];           // What it's for
  crafting?: {
    station?: string;
    ingredients: { item: string; amount: number }[];
    skill?: string;
    skillLevel?: number;
  };
  qualityInfo?: {
    min: number;
    max: number;
    effects: string;
  };

  // Optional enhancements
  examples?: HelpExample[];     // Usage examples
  tips?: string[];              // Gameplay tips
  warnings?: string[];          // Important caveats
  mechanics?: HelpMechanics;    // Detailed mechanics for LLMs
  lore?: string;                // Flavor text
  relatedTopics?: string[];     // Links to other help entries
}
```

### EffectHelpEntry (for spells/magic)

```typescript
interface EffectHelpEntry {
  id: string;
  summary: string;
  description: string;
  category: 'magic' | 'effects';
  tags: string[];

  // Effect-specific
  effectCategory: string;       // 'damage', 'healing', 'buff', etc.
  targetType: string;           // 'self', 'single', 'area', etc.
  duration?: string;
  range?: string;
  damageType?: string;
  scaling?: {
    attribute: string;
    formula: string;
    description: string;
  };
  counterplay?: string[];       // How to counter/dispel

  // Optional
  examples?: HelpExample[];
  tips?: string[];
  warnings?: string[];
  mechanics?: HelpMechanics;
  lore?: string;
}
```

### BuildingHelpEntry (for structures)

```typescript
interface BuildingHelpEntry {
  id: string;
  summary: string;
  description: string;
  category: 'buildings';
  tags: string[];

  // Building-specific
  construction?: {
    materials: { item: string; amount: number }[];
    skill?: string;
    skillLevel?: number;
    buildTime?: string;
  };
  craftsItems?: string[];       // What can be crafted here
  features?: string[];          // Special functions
  placement?: string[];         // Placement restrictions

  // Optional
  examples?: HelpExample[];
  tips?: string[];
  warnings?: string[];
  mechanics?: HelpMechanics;
}
```

## Advanced Features

### Mechanical Details for LLMs

The `mechanics` field provides structured data for AI agents:

```typescript
help: {
  mechanics: {
    values: {
      damage: 15,
      attackSpeed: 1.0,
      durability: 500,
    },
    formulas: {
      actualDamage: 'baseDamage * (1 + skill/100)',
      critChance: '0.05 + (luck/200)',
    },
    conditions: {
      'Requires strength 10': 'Cannot wield effectively below strength 10',
    },
    dependencies: ['smithy', 'smithing_skill_2'],
    unlocks: ['advanced_weapons', 'weapon_enchanting'],
    timing: {
      attackInterval: '1.0 seconds',
      durabilityLoss: '1 per hit',
    },
    costs: {
      stamina: 5,
    },
  },
}
```

### Usage Examples

Show concrete scenarios:

```typescript
help: {
  examples: [
    {
      title: 'Combat Emergency',
      description: 'Low on health in boss fight? Drink a healing potion for instant 50 HP over 10 seconds.',
      code: 'useItem("healing_potion"); // Restores 50 HP',
    },
  ],
}
```

### Tips and Warnings

```typescript
help: {
  tips: [
    'Keep at least 3 potions in your hotbar',
    'Higher alchemy skill creates better quality',
  ],
  warnings: [
    'Does not stack - finish one potion before drinking another',
    'Cannot cure poison - use antidotes instead',
  ],
}
```

## Query API

The help registry provides powerful search:

```typescript
import { helpRegistry } from '@ai-village/core/help';

// Get by ID
const entry = helpRegistry.get('iron_sword');

// Search
const results = helpRegistry.search({
  search: 'healing',           // Text search
  category: 'items',           // Filter by category
  subcategory: 'consumables',  // Filter by subcategory
  tags: ['craftable'],         // Must have all tags
  limit: 10,                   // Max results
});

// Get all in category
const allItems = helpRegistry.getByCategory('items');

// Get by tag
const craftables = helpRegistry.getByTag('craftable');

// Statistics
const stats = helpRegistry.getStats();
console.log(`Total: ${stats.totalEntries}`);
console.log(`Categories:`, stats.categories);
console.log(`Tags:`, stats.tags);
```

## Best Practices

### 1. Write for Both Humans and LLMs

- **Summary**: One clear sentence (50-80 chars)
- **Description**: 2-3 paragraphs explaining purpose, usage, and context
- **Mechanics**: Precise formulas and values for AI agents
- **Tags**: Consistent, searchable keywords

### 2. Include Concrete Examples

Show real usage scenarios, not just abstract descriptions:

```typescript
// ❌ Bad
description: 'Restores health'

// ✅ Good
description: 'Restores 50 health over 10 seconds. Use during combat or after battles.'
examples: [{
  title: 'Boss Fight Recovery',
  description: 'At 30% health in a boss fight, drink potion to gain 50 HP while continuing to attack.'
}]
```

### 3. Be Specific About Mechanics

```typescript
// ❌ Vague
description: 'Deals damage'

// ✅ Specific
mechanics: {
  values: { baseDamage: 15 },
  formulas: {
    actualDamage: 'baseDamage * (1 + skill/100) * weaponMultiplier',
  },
  conditions: {
    'Critical Hit': '5% chance to deal 2x damage',
  },
}
```

### 4. Link Related Topics

```typescript
relatedTopics: [
  'iron_ingot',        // Material
  'smithy',            // Crafting station
  'smithing_skill',    // Required skill
  'steel_sword',       // Upgrade path
]
```

### 5. Keep It Updated

Documentation is part of the definition. When you change an item, update its help:

```typescript
// ❌ Don't do this
const item = {...};  // Change properties
// Leave help outdated

// ✅ Do this
const item = {
  damage: 20,  // Changed from 15
  help: {
    description: 'Deals 20 damage...',  // Updated
    mechanics: { values: { damage: 20 } },  // Updated
  },
};
```

## Writing Style Guide

This project uses a blended writing style that combines four distinct voices to create entertaining, informative documentation:

**See [WRITER_GUIDELINES.md](./WRITER_GUIDELINES.md) for detailed style guidance.**

The four voices:
1. **Baroque Encyclopedist** - Playful, detailed, loves footnotes and fake scholarship
2. **Cosmic Pragmatist** - Dry, cheerfully nihilistic, deadpan about cosmic absurdity
3. **Humane Satirist** - Expansive, empathetic, satirizes with kindness
4. **Quiet Mythweaver** - Lyrical, intimate, blurs myth and mundane

These voices blend naturally to create help text that is:
- **Informative** - Players learn mechanics clearly
- **Entertaining** - Reading help is enjoyable
- **Meaningful** - Mechanics connect to themes and emotions

## Documentation Examples

Complete examples demonstrating the blended writing style:

### Magic Systems
- [documentedMagic.example.ts](./documentedMagic.example.ts) - Magic paradigms
  - Academic Magic (scholarly mana manipulation)
  - Blood Magic (power from sacrifice)
  - True Name Magic (reality editing through language)
  - Divine Magic (borrowed power from gods)
  - Pact Magic (contracts with entities)

### Divinity Systems
- [documentedDivinity.example.ts](./documentedDivinity.example.ts) - Gods and belief
  - Belief System (how faith creates deities)
  - Divine Domains (areas of divine influence)
  - Prayer and Miracles (divine-mortal communication)
  - Deity Ascension (becoming a god)

### Magical Items
- [documentedMagicItems.example.ts](./documentedMagicItems.example.ts) - Enchanted items
  - Wizard's Staff (spell focus and amplification)
  - Blood Crystal (blood power storage)
  - Artifact Creation (permanent enchantment)

### Crafting Systems
- [documentedCrafting.example.ts](./documentedCrafting.example.ts) - Crafting and quality systems
  - Crafting System Overview (how crafting works)
  - Quality System (0-100 scale and its effects)
  - Crafting Stations (workshops and their purposes)
  - Skill Progression (levels 0-5 and mastery)
  - Iron Sword Recipe (weapon crafting example)
  - Healing Potion Recipe (alchemy example)
  - Bread Recipe (food crafting example)

### Basic Items
- [documentedItems.example.ts](./documentedItems.example.ts) - Standard items
  - Iron Ingot (materials)
  - Healing Potion (consumables)
  - Iron Pickaxe (tools)
  - Mana Crystal (magical materials)

## See Also

- [WRITER_GUIDELINES.md](./WRITER_GUIDELINES.md) - Writing style guide
- [documentedItems.example.ts](./documentedItems.example.ts) - Basic item examples
- [documentedMagic.example.ts](./documentedMagic.example.ts) - Magic paradigm examples
- [documentedDivinity.example.ts](./documentedDivinity.example.ts) - Divinity system examples
- [documentedMagicItems.example.ts](./documentedMagicItems.example.ts) - Magical item examples
- [documentedCrafting.example.ts](./documentedCrafting.example.ts) - Crafting system examples
- [WikiGenerator.ts](./WikiGenerator.ts) - Output format customization
- [HelpRegistry.ts](./HelpRegistry.ts) - Query API details
- [HelpEntry.ts](./HelpEntry.ts) - Type definitions

## Integration with Game Systems

### In-Game Help UI

```typescript
function showItemHelp(itemId: string) {
  const entry = helpRegistry.get(itemId);
  if (!entry) return;

  displayPanel({
    title: entry.summary,
    content: entry.description,
    obtainedBy: entry.obtainedBy,
    usedFor: entry.usedFor,
  });
}
```

### LLM Agent Integration

```typescript
function getItemContext(itemId: string): string {
  const entry = helpRegistry.get(itemId);
  if (!entry) return '';

  return JSON.stringify({
    summary: entry.summary,
    mechanics: entry.mechanics,
    tips: entry.tips,
  });
}
```

### Autocomplete/Search

```typescript
function searchHelp(query: string) {
  return helpRegistry.search({
    search: query,
    limit: 5,
  }).map(e => ({
    id: e.id,
    label: e.summary,
    category: e.category,
  }));
}
```

## Contributing Documentation

When adding new items, effects, or buildings:

1. **Always add a help entry** - Even basic documentation is better than none
2. **Start with summary + description** - These are required
3. **Add mechanics for complex items** - Help AI agents understand the game
4. **Include examples for non-obvious usage** - Show don't tell
5. **Link related topics** - Build a knowledge graph

Example PR checklist:
- [ ] Added `help` field to item/effect definition
- [ ] Included summary and description
- [ ] Added relevant tags
- [ ] Specified crafting/obtaining methods
- [ ] Added tips for non-obvious behavior
- [ ] Linked to related topics
- [ ] Updated examples file if introducing new patterns
