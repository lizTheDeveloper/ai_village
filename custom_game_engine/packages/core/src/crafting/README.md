# Crafting System

Agent-based crafting with recipes, stations, and job queues. Supports quality-based output, tool wear, skill progression.

## Core Components

**Recipe**: Definition of inputs, outputs, station requirements, skill gates
**RecipeRegistry**: Global recipe lookup, filtering by category/station
**CraftingJob**: Queue entry tracking progress, status, timestamps
**CraftingSystem**: ECS system processing jobs, consuming ingredients, producing items

## Recipe Structure

```typescript
interface Recipe {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  category: string;                // Tools, Weapons, Food, Materials, etc.
  ingredients: RecipeIngredient[]; // { itemId, quantity }[]
  output: RecipeOutput;            // { itemId, quantity }
  craftingTime: number;            // Base seconds per item
  xpGain: number;                  // XP awarded on completion
  stationRequired: string | null;  // null = hand-craftable
  skillRequirements: SkillRequirement[]; // { skill, level }[]
  researchRequirements: string[];  // Research IDs
  requiredTools?: string[];        // Tool types consumed (durability)
}
```

## Crafting Stations

Recipes require stations for advanced items:
- `null`: Hand-craftable (stone_axe, rope)
- `workbench`: Tools, furniture (iron_axe)
- `forge`: Metals, weapons (iron_sword, steel_ingot)
- `oven`: Baked goods (bread, pie)
- `cauldron`: Stews, potions
- `loom`: Textiles (cloth, clothing)

Station recipes check building availability in world.

## Queue Management

Per-agent FIFO queues (max 10 jobs):

```typescript
craftingSystem.queueJob(agentId, recipe, quantity);
craftingSystem.getCurrentJob(agentId);        // Active job or null
craftingSystem.getQueue(agentId);             // All queued jobs
craftingSystem.reorderQueue(agentId, jobId, newPos);
craftingSystem.cancelJob(agentId, jobId);
craftingSystem.pauseQueue(agentId);           // Halt processing
craftingSystem.resumeQueue(agentId);
```

**Job lifecycle**: `queued` → `in_progress` → `completed` | `cancelled`

Ingredients consumed on start. Output added on completion with quality based on skill level.

## Quality System

Item quality (0-100) determined by:
- Skill level in 'crafting'
- Recipe familiarity (task history)
- Specialization synergy (woodworking, smithing, weaving, leatherworking)

Quality tiers: common, uncommon, rare, epic, legendary
Legendary items get unique ItemInstances, separate inventory slots.

## Integration

```typescript
// Initialize
const craftingSystem = new CraftingSystem();
craftingSystem.setRecipeRegistry(globalRecipeRegistry);
await initializeDefaultRecipes(); // Auto-generates from item definitions

// Check ingredients
const availability = craftingSystem.checkIngredientAvailability(world, agentId, recipe);
const maxCraftable = craftingSystem.calculateMaxCraftable(world, agentId, recipe);

// Queue crafting
craftingSystem.queueJob(agentId, recipe, quantity);
```

System auto-processes queues in `update()`. Emits events: `crafting:job_started`, `crafting:completed`.

## Auto-Generation

`RecipeAutoGenerator` scans `itemRegistry` for items with `craftedFrom` data, auto-creating recipes. Manual recipes override auto-generated. LLM generator creates recipes from natural language.
