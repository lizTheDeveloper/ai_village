# Items and Inventory System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The items system manages all objects in the game with procedural generation capabilities, maintaining game balance through scaling laws, deduplication, and power distribution.

## Overview

The items system manages all objects in the game: tools, materials, produce, artifacts, and crafted goods. A key feature is the ability to generate new item types procedurally while maintaining game balance through scaling laws, deduplication, and power distribution.

---

## Item Architecture

### Item Definition

```typescript
interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  subcategory: string;

  // Core properties
  tier: number;              // 1-10 power level
  rarity: Rarity;
  stackable: boolean;
  maxStack: number;
  baseValue: number;         // Economy value

  // Physical
  weight: number;
  durability?: number;       // For tools/equipment

  // Effects
  effects: ItemEffect[];
  useActions: UseAction[];

  // Crafting
  craftingIngredient: boolean;
  craftingTags: string[];    // "metal", "organic", "magical"

  // Generation metadata
  isGenerated: boolean;
  generationSource?: GenerationSource;
  parentItems?: string[];    // If derived from other items

  // Visual
  spriteId: string;
  paletteHints: string[];    // For procedural sprites
}
```

### Item Categories

```typescript
type ItemCategory =
  | "material"      // Raw resources
  | "tool"          // Farming, construction, crafting tools
  | "seed"          // Plantable items
  | "produce"       // Harvested crops
  | "food"          // Consumable, restores hunger/energy
  | "drink"         // Consumable, restores thirst
  | "crafted_good"  // Made items for sale/use
  | "equipment"     // Wearable/holdable
  | "furniture"     // Placeable decorations
  | "written_work"  // Books, scrolls, newspapers (see chroniclers.md)
  | "animal_product"// Eggs, milk, wool, etc. (see animal-system/spec.md)
  | "artifact"      // Unique generated items
  | "currency"      // Money, trade tokens
  | "special";      // Quest items, config items
```

### Rarity Tiers

| Rarity | Drop Rate | Power Budget | Color |
|--------|-----------|--------------|-------|
| Common | 60% | 1.0x | White |
| Uncommon | 25% | 1.3x | Green |
| Rare | 10% | 1.6x | Blue |
| Epic | 4% | 2.0x | Purple |
| Legendary | 1% | 2.5x | Orange |
| Mythic | 0.1% | 3.0x | Red |

---

## Requirements

### Requirement: Inventory Management

Agents and containers SHALL maintain inventories:

```typescript
interface Inventory {
  ownerId: string;           // Agent or building ID
  ownerType: "agent" | "building" | "ground";
  slots: InventorySlot[];
  maxSlots: number;
  maxWeight: number;
}

interface InventorySlot {
  itemId: string | null;
  quantity: number;
  durabilityRemaining?: number;
  quality?: number;          // 0-100 for variable quality items
  customData?: Record<string, unknown>; // Generated item specifics
}
```

### Requirement: Item Usage

Items SHALL have defined use actions:

```typescript
type UseAction =
  | { type: "consume"; effects: ConsumableEffect[] }
  | { type: "equip"; slot: EquipmentSlot }
  | { type: "place"; placeable: PlaceableConfig }
  | { type: "apply"; target: TargetType; effect: ApplyEffect }
  | { type: "craft_with"; opens: "crafting_menu" }
  | { type: "read"; content: string; requiredLiteracy: number }  // 0-1, see chroniclers.md
  | { type: "gift"; socialBonus: number };
```

### Requirement: Item Effects

Items SHALL provide effects when used/equipped:

```typescript
type ItemEffect =
  // Stat modifiers
  | { type: "skill_bonus"; skill: SkillType; amount: number }
  | { type: "speed_bonus"; percent: number }

  // Needs restoration (aligned with needs.md)
  | { type: "hunger_restore"; amount: number }
  | { type: "thirst_restore"; amount: number }
  | { type: "energy_restore"; amount: number }
  | { type: "warmth_restore"; amount: number }
  | { type: "health_restore"; amount: number }
  | { type: "mood_bonus"; amount: number }
  | { type: "stress_reduce"; amount: number }

  // Action modifiers
  | { type: "harvest_bonus"; percent: number }
  | { type: "craft_speed"; percent: number }
  | { type: "craft_quality"; percent: number }
  | { type: "build_speed"; percent: number }
  | { type: "research_speed"; percent: number }

  // Special
  | { type: "unlock_recipe"; recipeId: string }
  | { type: "reveal_area"; radius: number }
  | { type: "attract_wildlife"; types: string[] }
  | { type: "custom"; effectId: string; params: unknown };
```

---

## Crafting System

### Requirement: Recipe Structure

Items SHALL be craftable via recipes:

```typescript
interface Recipe {
  id: string;
  name: string;
  category: CraftingCategory;

  // Requirements
  ingredients: ItemStack[];
  tools: string[];           // Tool IDs required
  station: string | null;    // Building required
  skillRequired: { skill: SkillType; level: number };
  researchRequired: string[];

  // Output
  outputs: ItemStack[];
  craftTime: number;         // Ticks
  energyCost: number;

  // Quality
  qualityFactors: QualityFactor[];

  // Generation
  isGenerated: boolean;
  discoveredBy?: string;
}

interface ItemStack {
  itemId: string;
  quantity: number;
  minQuality?: number;
}
```

### Requirement: Crafting Execution

Crafting SHALL follow this process:

#### Scenario: Agent attempts to craft
- **WHEN** an agent attempts to craft
- **THEN** the system SHALL:
  1. Verify all ingredients available
  2. Verify required tools present
  3. Verify at correct station (if required)
  4. Verify skill meets minimum
  5. Consume ingredients
  6. Start crafting timer
  7. On completion:
     - Calculate output quality based on:
       - Agent skill level
       - Tool quality
       - Ingredient quality
       - Random variance
     - Create output items
     - Grant skill XP
     - IF exceptional roll, chance for bonus output

---

## Generative Item System

### Requirement: Item Generation Framework

The system SHALL generate new items via LLM:

```typescript
interface ItemGenerationRequest {
  trigger: GenerationTrigger;
  context: {
    parentItems?: string[];      // Combining items
    discoveryLocation?: string;  // Where found
    researchField?: string;      // What research unlocked
    agentPersonality?: PersonalityTraits;
    existingItems: string[];     // For deduplication
  };
  constraints: GenerationConstraints;
}

type GenerationTrigger =
  | "crafting_experiment"   // Combining unusual items
  | "research_discovery"    // Research system output
  | "rare_harvest"          // Exceptional crop/forage
  | "artifact_discovery"    // Found in world
  | "trade_request"         // Agent invents for demand
  | "building_output";      // Special building creates
```

### Requirement: Generation Constraints (Balance)

Generated items SHALL respect power constraints:

```typescript
interface GenerationConstraints {
  // Tier limits
  maxTier: number;           // Based on game progress
  tierSource: "parent_avg" | "parent_max" | "research_level";

  // Power budget
  powerBudget: number;       // Total effect strength
  budgetDistribution: "focused" | "spread"; // Few strong or many weak

  // Effect constraints
  allowedEffectTypes: string[];
  bannedEffectTypes: string[];
  maxEffectCount: number;

  // Rarity
  maxRarity: Rarity;
  rarityInfluence: number;   // How much rarity affects power

  // Similarity
  minNoveltyScore: number;   // 0-1, how different from existing
}
```

### Requirement: Scaling Laws

Generated items SHALL follow scaling laws:

```typescript
interface ScalingLaws {
  // Power per tier
  // Each tier grants a power budget multiplier
  tierPowerCurve: number[];  // e.g., [1, 1.5, 2, 2.8, 3.8, 5, 6.5, 8.5, 11, 15]

  // Diminishing returns
  // Stacking similar effects has reduced benefit
  stackingPenalty: (count: number) => number;

  // Rarity scaling
  // Higher rarity = higher cost, not necessarily higher power
  rarityCostMultiplier: Map<Rarity, number>;
  rarityBonusPowerPercent: Map<Rarity, number>; // Small bonus, not linear

  // Combination scaling
  // Combining powerful items doesn't multiply power
  combinationDiminishing: (tier1: number, tier2: number) => number;

  // Discovery fatigue
  // Repeated generation in same category yields diminishing novelty
  categoryFatigue: Map<string, number>;
}

// Example scaling law implementation
const scalingLaws: ScalingLaws = {
  tierPowerCurve: [1, 1.5, 2, 2.8, 3.8, 5, 6.5, 8.5, 11, 15],

  stackingPenalty: (count) => 1 / Math.sqrt(count), // 1, 0.71, 0.58, 0.5...

  rarityCostMultiplier: new Map([
    ["common", 1],
    ["uncommon", 2],
    ["rare", 5],
    ["epic", 15],
    ["legendary", 50],
    ["mythic", 200],
  ]),

  rarityBonusPowerPercent: new Map([
    ["common", 0],
    ["uncommon", 10],
    ["rare", 20],
    ["epic", 35],
    ["legendary", 50],
    ["mythic", 70],
  ]),

  combinationDiminishing: (t1, t2) => {
    const max = Math.max(t1, t2);
    const min = Math.min(t1, t2);
    return max + (min * 0.3); // Main tier + 30% of secondary
  },

  categoryFatigue: new Map(), // Populated at runtime
};
```

### Requirement: Deduplication System

Generated items SHALL be checked for uniqueness:

```typescript
interface DeduplicationSystem {
  // Semantic similarity check
  checkSimilarity(newItem: ItemDefinition, existing: ItemDefinition[]): number;

  // Effect fingerprinting
  getEffectFingerprint(effects: ItemEffect[]): string;

  // Name/concept similarity
  getConceptEmbedding(name: string, description: string): number[];

  // Thresholds
  rejectionThreshold: number;     // 0.85 - too similar, reject
  variationThreshold: number;     // 0.70 - similar, force variation
  acceptanceThreshold: number;    // 0.50 - different enough
}
```

#### Scenario: Deduplication process
- **WHEN** generating a new item
- **THEN** the system SHALL:
  1. Generate initial item concept via LLM
  2. Calculate similarity scores against all items in category
  3. IF maxSimilarity > rejectionThreshold
     - Reject and regenerate with "must be different from X" constraint
  4. ELSE IF maxSimilarity > variationThreshold
     - Request LLM to emphasize unique aspects
  5. Calculate effect fingerprint
  6. IF effect fingerprint exists
     - Modify effects to create unique combination
  7. Register new item in deduplication index

### Requirement: Power Distribution

The system SHALL maintain balanced power distribution:

```typescript
interface PowerDistribution {
  // Track power by category
  categoryPowerBudgets: Map<ItemCategory, {
    allocated: number;
    maximum: number;
  }>;

  // Track power by effect type
  effectTypeCounts: Map<string, number>;

  // Bias toward underrepresented
  getGenerationBias(): {
    preferredCategories: ItemCategory[];
    preferredEffects: string[];
    discouragedCategories: ItemCategory[];
    discouragedEffects: string[];
  };
}
```

#### Scenario: Distribution rules
- **WHEN** generating a new item
- **THEN** the system SHALL:
  1. Check current power distribution
  2. Calculate category saturation percentages
  3. Bias generation toward categories < 70% saturation
  4. Penalize categories > 90% saturation
  5. Ensure no single effect type exceeds 20% of all effects
  6. Prefer effects with < 5% representation

---

## Item Persistence

### Requirement: Generated Item Storage

Generated items SHALL be permanently stored:

```typescript
interface GeneratedItemRecord {
  // Core definition
  definition: ItemDefinition;

  // Generation context
  generatedAt: GameTime;
  generatedBy: string;        // Agent ID
  generationTrigger: GenerationTrigger;
  parentItems: string[];
  llmPrompt: string;          // For debugging/analysis
  llmResponse: string;

  // Visual assets
  spriteData: GeneratedSprite;
  iconData: GeneratedIcon;

  // Usage statistics
  timesCreated: number;
  timesUsed: number;
  averageValue: number;

  // Balance metadata
  actualPowerLevel: number;   // Calculated post-hoc
  balanceFlags: string[];     // Any balance concerns
}
```

---

## Base Item Examples

### Materials (Tier 1-3)

| Item | Tier | Source | Tags |
|------|------|--------|------|
| Wood | 1 | Trees | organic, construction |
| Stone | 1 | Rocks | mineral, construction |
| Iron Ore | 2 | Mining | metal, ore |
| Cloth | 2 | Crafted | organic, textile |
| Glass | 3 | Crafted | mineral, refined |
| Steel | 3 | Crafted | metal, refined |

### Tools (Tier 1-5)

| Item | Tier | Effects | Durability |
|------|------|---------|------------|
| Wooden Hoe | 1 | Farming +10% | 50 |
| Iron Axe | 2 | Woodcutting +20% | 100 |
| Steel Hammer | 3 | Construction +30% | 150 |
| Master's Chisel | 4 | Craft Quality +40% | 200 |
| Legendary Scythe | 5 | Harvest +50%, Speed +25% | 300 |

### Artifacts (Generated Examples)

| Item | Tier | Rarity | Origin | Effects |
|------|------|--------|--------|---------|
| Whispering Seed | 3 | Rare | Hybrid breeding | Reveals hidden crops nearby |
| Forgemaster's Ember | 4 | Epic | Research | Metalwork +35%, Fire resistance |
| Moonpetal Extract | 3 | Rare | Night foraging | Night vision, Mood +20 |
| Village Founder's Compass | 5 | Legendary | Quest | Shows optimal building spots |

### Written Works (See chroniclers.md)

| Item | Tier | Rarity | Literacy Required | Value Factors |
|------|------|--------|-------------------|---------------|
| Scroll | 1 | Common | 0.3 | Content length, author reputation |
| Pamphlet | 1 | Common | 0.2 | Distribution reach, timeliness |
| Book | 2 | Uncommon | 0.5 | Length, research depth, rarity |
| Newspaper | 1 | Common | 0.3 | Freshness, circulation |
| Encyclopedia | 3 | Rare | 0.7 | Completeness, accuracy |
| Ancient Tome | 4 | Epic | 0.9 | Historical significance, secrets |

Written works are generated by chronicler agents and have value based on:
- Author reputation
- Content significance (events covered, discoveries documented)
- Accuracy and bias
- Rarity (number of copies)
- Age (historical documents appreciate)

### Animal Products (See animal-system/spec.md)

| Item | Tier | Source | Effects | Tags |
|------|------|--------|---------|------|
| Egg | 1 | Chickens | hunger_restore: 15 | organic, food |
| Milk | 1 | Cows/Goats | hunger_restore: 10, thirst_restore: 20 | organic, drink |
| Wool | 1 | Sheep | - | organic, textile |
| Honey | 2 | Bees | hunger_restore: 20, mood_bonus: 5 | organic, food |
| Leather | 2 | Cows | - | organic, material |
| Feather | 1 | Birds | - | organic, crafting |

Quality affected by: animal health, bond level, diet, genetics.

---

## Open Questions

1. Item degradation and repair systems?
2. Soulbound/untradeable items?
3. Item upgrade/enhancement system?
4. Negative effects on items (curses)?
5. Item sets with bonuses?

---

## Related Specs

- `research-system/spec.md` - Research unlocks items
- `economy-system/spec.md` - Item values, trading
- `rendering-system/spec.md` - Item sprites
- `animal-system/spec.md` - Animal products (eggs, milk, wool)
- `agent-system/chroniclers.md` - Written works (books, scrolls, newspapers)
- `agent-system/needs.md` - Needs restoration effects (hunger, thirst, energy)
