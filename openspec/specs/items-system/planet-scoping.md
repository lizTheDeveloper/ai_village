# Item Planet Scoping - Design Document

**Created:** 2025-12-20
**Status:** Draft

---

## Problem

When items are generated in an "infinite game" with multiple themed worlds (planets), we need to:

1. Track which planet an item belongs to
2. Decide if items are planet-exclusive or universal
3. Handle cross-planet scenarios (trading, shared universes)
4. Maintain thematic consistency within a planet
5. Prevent namespace collisions between planets

---

## Proposed Model

### Item Scoping Levels

```typescript
type ItemScope =
  | "universal"      // Exists in all planets (wood, stone, basic tools)
  | "planet"         // Native to one planet, can potentially travel
  | "planet_locked"  // Cannot leave its planet (magical/tech constraints)
  | "exotic";        // From another planet, marked as foreign

interface ItemDefinition {
  id: string;                    // Globally unique ID
  canonicalId: string;           // ID within its scope (e.g., "iron_ore")

  // Planet scoping
  scope: ItemScope;
  originPlanet: string | null;   // null for universal items
  planetVariants?: PlanetVariant[]; // Different forms on different planets

  // ... rest of item definition
}
```

### ID Structure

```typescript
// Naming convention for item IDs
type ItemId = string;

// Universal items: just the name
// "wood", "stone", "iron_ore"

// Planet-specific items: planet prefix
// "forest_village:enchanted_acorn"
// "feudal_grove:sakura_petal"
// "starfall_colony:xenocrystal"

// Generated items: planet + generation marker
// "forest_village:gen:moonpetal_extract"
// "starfall_colony:gen:bioluminescent_fungus"

function parseItemId(id: ItemId): {
  planet: string | null;
  isGenerated: boolean;
  localId: string;
} {
  const parts = id.split(':');
  if (parts.length === 1) {
    return { planet: null, isGenerated: false, localId: parts[0] };
  }
  if (parts.length === 2) {
    return { planet: parts[0], isGenerated: false, localId: parts[1] };
  }
  // parts.length === 3, middle is "gen"
  return { planet: parts[0], isGenerated: true, localId: parts[2] };
}
```

---

## Planet Definition

```typescript
interface Planet {
  id: string;                    // "forest_village"
  name: string;                  // "Forest Village"
  description: string;

  // Content pools
  universalItems: string[];      // IDs of universal items available here
  nativeItems: string[];         // Planet-specific base items
  generatedItems: string[];      // Generated items (grows over time)

  // Generation context
  generationStyle: GenerationStyle;
  thematicKeywords: string[];    // For LLM prompting
  bannedConcepts: string[];      // Things that don't fit this planet

  // Cross-planet rules
  allowsExoticItems: boolean;    // Can items from other planets appear?
  exoticItemSources: string[];   // Which planets can send items here?

  // Persistence
  createdAt: Date;
  lastModified: Date;
  itemCount: number;
}

interface GenerationStyle {
  aesthetic: string;             // "medieval fantasy", "sci-fi", etc.
  materials: string[];           // Common materials in this world
  magicLevel: "none" | "low" | "medium" | "high";
  techLevel: "primitive" | "medieval" | "industrial" | "futuristic";
  nameStyle: NameStyle;          // How to name things
}

interface NameStyle {
  prefixes: string[];            // Common word parts
  suffixes: string[];
  patterns: string[];            // "adjective + noun", etc.
  avoidPatterns: string[];       // Things that don't fit
  exampleNames: string[];        // Few-shot examples for LLM
}
```

---

## Content Categories

### Universal Items (Shared Across All Planets)

These exist everywhere, possibly with visual variants:

```typescript
const universalItems = [
  // Basic materials
  "wood", "stone", "clay", "fiber",

  // Basic tools (concept exists, appearance varies)
  "basic_axe", "basic_hoe", "basic_hammer",

  // Abstract concepts
  "currency",  // Rendered differently per planet
  "container", // Generic storage
];

// Visual variants per planet
interface PlanetVariant {
  planetId: string;
  spriteOverride: string;
  nameOverride?: string;        // "Wood" vs "Timber" vs "Biomass"
  descriptionOverride?: string;
}
```

### Planet-Native Items

Base items unique to a planet:

```typescript
// Forest Village natives
const forestVillageItems = [
  "forest_village:enchanted_wood",
  "forest_village:fairy_dust",
  "forest_village:ancient_amber",
  "forest_village:moonflower",
];

// Starfall Colony natives
const starfallColonyItems = [
  "starfall_colony:xenocrystal",
  "starfall_colony:plasma_ore",
  "starfall_colony:biofilm",
  "starfall_colony:gravity_shard",
];
```

### Generated Items (Planet-Bound)

```typescript
interface GeneratedItem extends ItemDefinition {
  // Always has planet scope
  scope: "planet" | "planet_locked";
  originPlanet: string;          // Required for generated

  // Generation metadata
  generatedAt: GameTime;
  generatedBy: string;           // Agent ID
  generationPrompt: string;      // For debugging
  parentItems: string[];         // What it was made from

  // Thematic validation
  thematicFitScore: number;      // 0-1, how well it fits the planet
  reviewStatus: "auto_approved" | "flagged" | "manually_approved";
}
```

---

## Cross-Planet Mechanics

### Option A: Isolated Planets (Simple)

Each planet is a completely separate game world:
- No items cross between planets
- No shared universe
- Each planet has its own save
- Simplest implementation

### Option B: Exotic Trade (Medium)

Items can travel between planets as "exotic goods":

```typescript
interface ExoticItem {
  originalItem: ItemDefinition;
  originPlanet: string;
  currentPlanet: string;

  // Exotic status effects
  exoticPriceMultiplier: number;  // Usually 2-5x value
  exoticRarity: Rarity;           // Often bumped up
  culturalMystery: boolean;       // Agents don't fully understand it

  // Restrictions
  canBeCrafted: boolean;          // Usually false
  canBeResearched: boolean;       // Can unlock understanding
  degradesOverTime: boolean;      // Some items don't last outside home
}
```

### Option C: Multiverse (Complex)

Full universe simulation:
- Portals/trade routes between planets
- Agents can travel between planets
- Technology/magic transfer
- Cross-planet quests
- Most complex, most interesting

---

## Database Schema

```typescript
// Items table
interface ItemRecord {
  id: string;                    // Primary key, globally unique
  canonical_id: string;          // Local name
  planet_id: string | null;      // FK to planets, null = universal
  scope: ItemScope;
  definition: ItemDefinition;    // JSON blob

  // Generation tracking
  is_generated: boolean;
  generated_at: Date | null;
  generated_by: string | null;
  generation_context: object | null;

  // Indexing
  category: ItemCategory;
  tier: number;
  tags: string[];
}

// Planets table
interface PlanetRecord {
  id: string;                    // Primary key
  name: string;
  config: Planet;                // JSON blob
  created_at: Date;
  item_count: number;
  generated_item_count: number;
}

// Cross-planet items (if Option B or C)
interface ExoticItemInstance {
  id: string;
  original_item_id: string;      // FK to items
  origin_planet_id: string;      // FK to planets
  current_planet_id: string;     // FK to planets
  arrived_at: Date;
  exotic_properties: ExoticItem; // JSON blob
}
```

---

## Generation Pipeline with Planet Context

```typescript
async function generateItem(
  trigger: GenerationTrigger,
  context: GenerationContext,
  planet: Planet
): Promise<GeneratedItem> {

  // 1. Build planet-aware prompt
  const prompt = buildPrompt({
    ...context,
    planetStyle: planet.generationStyle,
    thematicKeywords: planet.thematicKeywords,
    bannedConcepts: planet.bannedConcepts,
    existingItems: await getItemsForPlanet(planet.id),
    nameStyle: planet.generationStyle.nameStyle,
  });

  // 2. Generate via LLM
  const rawItem = await llm.generate(prompt);

  // 3. Validate thematic fit
  const fitScore = await validateThematicFit(rawItem, planet);
  if (fitScore < 0.6) {
    // Regenerate with stronger constraints
    return generateItem(trigger, context, planet, { stricter: true });
  }

  // 4. Assign planet-scoped ID
  const itemId = `${planet.id}:gen:${slugify(rawItem.name)}`;

  // 5. Check for collisions
  if (await itemExists(itemId)) {
    itemId = `${itemId}_${generateShortHash()}`;
  }

  // 6. Create and persist
  const item: GeneratedItem = {
    id: itemId,
    canonicalId: slugify(rawItem.name),
    scope: "planet",
    originPlanet: planet.id,
    ...rawItem,
    thematicFitScore: fitScore,
  };

  await persistItem(item);
  await updatePlanetItemCount(planet.id);

  return item;
}
```

---

## Thematic Validation

```typescript
async function validateThematicFit(
  item: RawGeneratedItem,
  planet: Planet
): Promise<number> {

  // Check against banned concepts
  for (const banned of planet.bannedConcepts) {
    if (
      item.name.toLowerCase().includes(banned) ||
      item.description.toLowerCase().includes(banned)
    ) {
      return 0; // Immediate rejection
    }
  }

  // LLM-based thematic scoring
  const scorePrompt = `
    Planet: ${planet.name}
    Aesthetic: ${planet.generationStyle.aesthetic}
    Tech Level: ${planet.generationStyle.techLevel}
    Magic Level: ${planet.generationStyle.magicLevel}
    Keywords: ${planet.thematicKeywords.join(", ")}

    Item: ${item.name}
    Description: ${item.description}

    Rate 0-100 how well this item fits the planet's theme.
    Consider: naming style, materials, concept appropriateness.
    Return only a number.
  `;

  const score = await llm.generate(scorePrompt);
  return parseInt(score) / 100;
}
```

---

## Open Questions

1. **Universal item visuals:** Same sprite everywhere, or planet variants?
2. **Generated item portability:** Can generated items ever become universal?
3. **Planet creation:** Can players create new planets/themes?
4. **Merging planets:** What happens if two planets are combined?
5. **Item archaeology:** Can you find items from "extinct" planets?

---

## Recommendation

Start with **Option A (Isolated Planets)** for simplicity:
- Each planet is a separate game save
- No cross-planet complexity
- Clean namespace: `{planet}:{item}` or `{planet}:gen:{item}`
- Design the data model to support Options B/C later

Then expand to **Option B (Exotic Trade)** if there's demand:
- Add exotic item wrapper
- Create trade route mechanics
- Keep planets mostly separate but connected

---

## Related Specs

- `items-system/spec.md` - Core item system
- `research-system/spec.md` - Discovery persistence
- `rendering-system/spec.md` - Sprite variants
