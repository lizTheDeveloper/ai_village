# Research and Invention System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The research system enables agents to discover new technologies, recipes, buildings, and item types. It supports both a predefined tech tree and procedural invention, creating an infinite progression system where agents can invent genuinely new things that persist across the game.

---

## Research Architecture

### Research Structure

```typescript
interface ResearchProject {
  id: string;
  name: string;
  description: string;
  field: ResearchField;

  // Progress
  progressRequired: number;    // Research points needed
  currentProgress: number;

  // Requirements
  prerequisites: string[];     // Other research IDs
  requiredItems: ItemStack[];  // Consumed on start
  requiredBuilding: string;    // Lab type needed

  // Rewards
  unlocks: ResearchUnlock[];

  // Type
  type: "predefined" | "generated" | "experimental";
  tier: number;                // 1-10 complexity

  // Generation metadata (for generated research)
  generationContext?: GenerationContext;
}

type ResearchField =
  | "agriculture"      // Crops, farming
  | "construction"     // Buildings, materials
  | "crafting"         // Recipes, tools
  | "metallurgy"       // Metals, forging
  | "alchemy"          // Potions, transformations
  | "textiles"         // Cloth, clothing
  | "cuisine"          // Cooking, food
  | "machinery"        // Automation
  | "nature"           // Foraging, wildlife
  | "society"          // Trading, organization
  | "arcane"           // Magical (if fantasy)
  | "experimental";    // Generated discoveries
```

### Research Unlocks

```typescript
type ResearchUnlock =
  | { type: "recipe"; recipeId: string }
  | { type: "building"; buildingId: string }
  | { type: "crop"; cropId: string }
  | { type: "item"; itemId: string }
  | { type: "upgrade"; upgradeId: string }
  | { type: "ability"; abilityId: string }
  | { type: "research"; researchId: string }  // Unlocks more research
  | { type: "knowledge"; knowledgeId: string } // Lore, hints
  | { type: "generated"; generationType: string }; // Triggers generation
```

---

## Requirements

### REQ-RES-001: Research Execution

Agents SHALL conduct research at research buildings:

```
WHEN an agent researches at a valid building
THEN the system SHALL:
  1. Verify research prerequisites met
  2. Verify required items consumed (if any)
  3. Calculate research points per tick:
     baseRate * buildingBonus * agentSkill * toolBonus
  4. Add points to currentProgress
  5. IF currentProgress >= progressRequired
     - Mark research complete
     - Apply all unlocks
     - Emit "research:complete" event
     - Grant skill XP
     - IF experimental type, trigger generation
```

### REQ-RES-002: Research Point Calculation

Research progress SHALL be calculated:

```typescript
function calculateResearchPoints(
  agent: Agent,
  building: Building,
  project: ResearchProject
): number {
  const baseRate = 1;
  const buildingBonus = building.functionality.researchBonus || 1;
  const skillBonus = 1 + (agent.skills.research / 100);
  const toolBonus = getResearchToolBonus(agent.inventory);
  const fieldBonus = getFieldSpecializationBonus(agent, project.field);

  // Tier scaling - higher tier = slower
  const tierPenalty = 1 / Math.pow(project.tier, 0.5);

  return baseRate * buildingBonus * skillBonus * toolBonus * fieldBonus * tierPenalty;
}
```

---

## Predefined Tech Tree

### Tier 1 - Fundamentals

```
Agriculture I ─────► Farming basics, basic seeds
Construction I ────► Basic buildings, workbench
Crafting I ────────► Basic recipes, tools
```

### Tier 2 - Expansion

```
Agriculture II ────► Sprinklers, fertilizers
Construction II ───► Stone buildings, storage
Crafting II ───────► Metal tools, containers
Metallurgy I ──────► Forge, iron working
Textiles I ────────► Cloth, basic clothing
Cuisine I ─────────► Cooking, food preservation
```

### Tier 3 - Advancement

```
Agriculture III ───► Greenhouse, hybrids
Construction III ──► Large buildings, automation
Crafting III ──────► Quality crafting, masterwork
Metallurgy II ─────► Steel, advanced alloys
Alchemy I ─────────► Potions, transformations
Machinery I ───────► Windmills, water wheels
```

### Tier 4 - Mastery

```
Agriculture IV ────► Legendary crops, self-watering
Construction IV ───► Monuments, magical structures
Crafting IV ───────► Artifact crafting
Metallurgy III ────► Legendary metals
Alchemy II ────────► Transmutation, enhancement
Machinery II ──────► Complex automation
Society I ─────────► Advanced trading, contracts
```

### Tier 5 - Transcendence

```
Experimental Research ─► Unlocks procedural invention
Arcane Studies ────────► Magical items, effects
Master Architecture ───► Unique buildings
Grand Alchemy ─────────► Major transformations
Infinite Knowledge ────► Meta-research bonuses
```

---

## Procedural Invention System

### REQ-RES-003: Experimental Research

The system SHALL support open-ended invention:

```typescript
interface ExperimentalResearch {
  id: string;
  researcher: string;           // Agent ID
  field: ResearchField;
  hypothesis: string;           // LLM-generated goal
  materials: ItemStack[];       // Items to experiment with
  approach: ExperimentApproach;

  // Progress
  experimentsRun: number;
  insightsGained: Insight[];
  breakthroughChance: number;   // Increases with experiments

  // Results
  discoveries: GeneratedDiscovery[];
}

type ExperimentApproach =
  | "combination"      // Combine items in new ways
  | "refinement"       // Improve existing item
  | "analysis"         // Study item properties
  | "synthesis"        // Create from raw materials
  | "observation"      // Study natural phenomena
  | "collaboration";   // Multi-agent research
```

### REQ-RES-004: Invention Process

New inventions SHALL be generated through experimentation:

```
WHEN an agent conducts experimental research
THEN the system SHALL:
  1. Gather experiment context:
     - Materials provided
     - Agent's skills and personality
     - Field of study
     - Previous insights
     - Existing discoveries (for deduplication)

  2. Request LLM to generate hypothesis:
     "Given these materials and context, what might be discovered?"

  3. Run experiment simulation:
     - Calculate success probability based on:
       - Material compatibility
       - Agent research skill
       - Building quality
       - Random factor
     - Track experiment in history

  4. IF successful (probability check passes):
     - Request LLM to generate discovery details
     - Apply generation constraints (from items-system)
     - Validate against scaling laws
     - Check deduplication
     - Create new item/recipe/building definition
     - Persist to game database

  5. Grant insight even on failure:
     - "This combination doesn't work because..."
     - Narrows future experiments
     - Contributes to breakthrough chance
```

### REQ-RES-005: Discovery Generation

Generated discoveries SHALL follow constraints:

```typescript
interface DiscoveryGenerationPrompt {
  // Context
  researcher: {
    name: string;
    personality: PersonalityTraits;
    skills: SkillSet;
    specialization: ResearchField;
  };

  materials: {
    items: ItemDefinition[];
    quantities: number[];
    totalTier: number;
  };

  // Constraints (critical for balance)
  constraints: {
    maxTier: number;              // materials.maxTier + 1
    allowedOutputTypes: string[];
    powerBudget: number;
    requiredDifferentiation: string[]; // Must differ from these
    fieldFocus: ResearchField;
    balanceGuidelines: string;
  };

  // Style
  villageContext: {
    era: string;                  // Rustic, medieval, etc.
    existingTechnology: string[];
    culturalNotes: string;
  };
}
```

### REQ-RES-006: Crafting Tree Generation

New recipes SHALL be generated with crafting chains:

```typescript
interface GeneratedRecipe {
  id: string;
  name: string;
  description: string;

  // Structure
  ingredients: ItemStack[];
  outputs: ItemStack[];
  intermediateSteps: CraftingStep[];  // Sub-recipes if complex

  // Requirements
  tools: string[];
  station: string;
  skillRequired: { skill: SkillType; level: number };

  // Balance
  tier: number;
  complexity: number;            // Number of steps
  totalInputValue: number;       // Sum of ingredient values
  outputValue: number;           // Must be > totalInputValue

  // Generation
  generatedBy: string;
  generatedFrom: string[];       // Parent items/recipes
}

interface CraftingStep {
  order: number;
  description: string;
  inputs: ItemStack[];
  output: ItemStack;
  duration: number;
}
```

### REQ-RES-007: Recipe Tree Balancing

Generated recipes SHALL maintain economic balance:

```
WHEN generating a new recipe
THEN the system SHALL ensure:
  1. Output value >= Sum(input values) * 1.2
     - Crafting should be profitable
  2. Complexity adds value:
     - Each step adds 10% value bonus
  3. Skill gates value:
     - Higher skill requirements = higher value output
  4. No circular dependencies:
     - Recipe A cannot require output of recipe that requires A
  5. Reachability:
     - All ingredients must be obtainable somehow
  6. Tier consistency:
     - Output tier <= max(input tiers) + 1
```

---

## Knowledge System

### REQ-RES-008: Research Knowledge

Research SHALL unlock knowledge and hints:

```typescript
interface Knowledge {
  id: string;
  title: string;
  content: string;              // Lore, instructions, hints
  type: "lore" | "technique" | "hint" | "secret";
  unlockedBy: string;           // Research ID

  // Effects
  providesHints: string[];      // Item/recipe IDs
  revealsLocations: Position[];
  enablesActions: string[];
}
```

### REQ-RES-009: Insight Accumulation

Failed experiments SHALL provide insights:

```typescript
interface Insight {
  id: string;
  timestamp: GameTime;
  type: "negative" | "partial" | "clue";

  content: string;              // What was learned
  relatedMaterials: string[];
  suggestedDirection: string;   // What to try next

  // Mechanical effect
  breakthroughBonus: number;    // Adds to chance
  narrowsSearch: string[];      // Rules out combinations
}
```

---

## Discovery Propagation

### REQ-RES-010: Chronicler Documentation

Discoveries SHALL be documented and spread via chroniclers (see `agent-system/chroniclers.md`):

```typescript
interface DiscoveryDocumentation {
  discoveryId: string;
  documentedBy: ChroniclerType[];  // historian, journalist, scholar

  // Documentation creates written works
  worksCreated: WrittenWork[];

  // Spread mechanics
  spreadVia: {
    localChronicle: true;          // Local historian writes about it
    newspaper: boolean;            // If journalist present
    traderGossip: boolean;         // Merchants spread word
    scholarlyExchange: boolean;    // Academics share
  };

  // Knowledge transfer
  enablesReplication: boolean;     // Can others replicate?
  replicationRequirements: {
    requiresWork: boolean;         // Must read the document
    requiresSkill: number;         // Min research skill to understand
    requiresMaterials: boolean;    // Must have same materials
  };
}
```

### REQ-RES-011: Discovery Events

When a discovery is made, chroniclers MAY document it:

```
WHEN a research project completes successfully
THEN the system SHALL:
  1. Emit "discovery:complete" event with details
  2. Notify nearby chroniclers (if any)
  3. IF chronicler is interested in topic:
     - Chronicler decides to document (based on personality)
     - Creates written work about discovery
     - Work enters distribution system (see chroniclers.md)
  4. Other villages learn about discovery via:
     - Written works arriving
     - Merchant gossip
     - Traveling scholars
  5. Remote researchers MAY attempt replication if:
     - They have read documentation
     - They meet skill requirements
     - They have necessary materials
```

---

## Research Buildings

| Building | Tier | Fields | Bonus |
|----------|------|--------|-------|
| Study Desk | 1 | All | +10% |
| Library | 2 | All | +25%, stores knowledge |
| Alchemy Lab | 2 | Alchemy, Cuisine | +30% |
| Workshop Lab | 2 | Crafting, Metallurgy | +30% |
| Greenhouse Lab | 2 | Agriculture, Nature | +30% |
| Research Tower | 3 | All | +50% |
| Grand Laboratory | 4 | All | +75%, enables experimental |
| Arcane Sanctum | 4 | Arcane, Alchemy | +100% |
| Inventor's Hall | 5 | Experimental | +100%, collaboration |

---

## Collaborative Research

### REQ-RES-010: Multi-Agent Research

Multiple agents SHALL collaborate on research:

```
WHEN multiple agents research the same project
THEN the system SHALL:
  1. Combine research points (diminishing returns):
     total = agent1 + (agent2 * 0.7) + (agent3 * 0.5) + ...
  2. Track individual contributions
  3. Combine personality influences on generation
  4. Share discovery credit
  5. Enable "collaboration" experiment approach
```

---

## Balance Safeguards

### REQ-RES-011: Discovery Rate Limits

The system SHALL limit discovery frequency:

```typescript
interface DiscoveryRateLimits {
  // Per-agent limits
  maxDiscoveriesPerAgentPerDay: number;    // 1
  maxDiscoveriesPerAgentPerSeason: number; // 5

  // Global limits
  maxDiscoveriesPerDay: number;            // 3
  maxDiscoveriesPerSeason: number;         // 20

  // Quality limits
  maxEpicPerSeason: number;                // 2
  maxLegendaryPerYear: number;             // 1

  // Cooldowns
  fieldCooldownAfterDiscovery: number;     // Days before same field
  agentCooldownAfterDiscovery: number;     // Days before same agent
}
```

### REQ-RES-012: Power Creep Prevention

The system SHALL prevent power creep:

```
WHEN a discovery would exceed power limits
THEN the system SHALL:
  1. Cap effect magnitudes to tier-appropriate levels
  2. Add drawbacks to overpowered items
  3. Increase costs/requirements proportionally
  4. Flag for manual review if significantly outlying
  5. Track power trend over time
  6. Apply global dampening if trend is upward
```

---

## Open Questions

1. Should research be lost if researcher dies/leaves?
2. How to handle research espionage/sharing between villages?
3. Research failures that create "cursed" items?
4. Meta-research to improve research itself?

---

## Related Specs

- `items-system/spec.md` - Generated items, balance
- `agent-system/spec.md` - Research skill, personality
- `construction-system/spec.md` - Research buildings
- `economy-system/spec.md` - Discovery value
- `research-system/capability-evolution.md` - Tech capability progression
- `agent-system/chroniclers.md` - How discoveries spread via written works
