# Progressive Skill Reveal - Prompt Templates

This document provides concrete prompt examples and implementation templates for the skill-gated prompt system. Use these templates to implement skill-based context filtering in `StructuredPromptBuilder.ts`.

---

## Table of Contents

1. [Agent Profiles](#1-agent-profiles)
2. [Complete Prompt Examples](#2-complete-prompt-examples)
3. [Implementation Templates](#3-implementation-templates)
4. [Section-by-Section Templates](#4-section-by-section-templates)
5. [Action Filtering Templates](#5-action-filtering-templates)
6. [Relationship Affordance Templates](#6-relationship-affordance-templates)

---

## 1. Agent Profiles

### Profile A: Unskilled Newcomer (Pine)
```typescript
{
  name: "Pine",
  skills: {
    building: 0,
    farming: 0,
    gathering: 1,
    cooking: 0,
    crafting: 0,
    social: 0,
    exploration: 0,
    combat: 0,
    animal_handling: 0,
    medicine: 0
  },
  personality: {
    extraversion: 45,
    agreeableness: 60,
    openness: 50,
    workEthic: 55,
    leadership: 20
  }
}
```

### Profile B: Skilled Builder (Oak)
```typescript
{
  name: "Oak",
  skills: {
    building: 3,
    farming: 0,
    gathering: 2,
    cooking: 0,
    crafting: 1,
    social: 1,
    exploration: 0,
    combat: 0,
    animal_handling: 0,
    medicine: 0
  },
  personality: {
    extraversion: 55,
    agreeableness: 65,
    openness: 40,
    workEthic: 80,
    leadership: 45
  }
}
```

### Profile C: Skilled Cook/Farmer (River)
```typescript
{
  name: "River",
  skills: {
    building: 0,
    farming: 2,
    gathering: 1,
    cooking: 3,
    crafting: 0,
    social: 1,
    exploration: 0,
    combat: 0,
    animal_handling: 0,
    medicine: 1
  },
  personality: {
    extraversion: 70,
    agreeableness: 75,
    openness: 65,
    workEthic: 60,
    leadership: 30
  }
}
```

### Profile D: Social Specialist (Wren)
```typescript
{
  name: "Wren",
  skills: {
    building: 0,
    farming: 0,
    gathering: 0,
    cooking: 1,
    crafting: 0,
    social: 3,
    exploration: 2,
    combat: 0,
    animal_handling: 1,
    medicine: 0
  },
  personality: {
    extraversion: 85,
    agreeableness: 80,
    openness: 75,
    workEthic: 45,
    leadership: 70
  }
}
```

### Profile E: Generalist (Birch)
```typescript
{
  name: "Birch",
  skills: {
    building: 1,
    farming: 1,
    gathering: 2,
    cooking: 1,
    crafting: 1,
    social: 1,
    exploration: 1,
    combat: 0,
    animal_handling: 0,
    medicine: 0
  },
  personality: {
    extraversion: 55,
    agreeableness: 55,
    openness: 60,
    workEthic: 65,
    leadership: 35
  }
}
```

### Profile F: Master Craftsman (Ash)
```typescript
{
  name: "Ash",
  skills: {
    building: 3,
    farming: 0,
    gathering: 2,
    cooking: 0,
    crafting: 4,
    social: 2,
    exploration: 0,
    combat: 0,
    animal_handling: 0,
    medicine: 0
  },
  personality: {
    extraversion: 40,
    agreeableness: 50,
    openness: 70,
    workEthic: 90,
    leadership: 55
  }
}
```

---

## 2. Complete Prompt Examples

### Example A: Pine (Unskilled Newcomer)

```
You are Pine, a villager in a forest village.

Personality:
- You prefer to follow others and take direction

You notice some buildings in the village and people going about their tasks.

Current Situation:
- Hunger: 65% (could eat)
- Energy: 70% (rested)
- Temperature: 18C (comfortable)
- Inventory: 3 wood, 2 berries (8/50 weight, 16% full)

You notice some structures nearby. There seems to be food stored somewhere.

- Nearby: Oak (doing something), River (doing something) | 4 trees | some berry bushes

Village has some buildings. Others seem to know what they're doing.

What You Remember:
- Found berries by the river yesterday
- Oak helped you carry wood

You can:
- wander - Walk around and see what's happening
- rest - Take a break and recover energy
- gather - Pick up things you find (berries, sticks, loose stones)
- talk - Say something to nearby villagers
- follow - Follow someone who seems to know what they're doing
- eat - Eat something from your inventory
- help - Try to help with whatever someone else is doing

You feel a bit lost. Maybe follow someone who knows the area, or look for food and useful things to gather.

Your response (JSON only):
{
  "thinking": "what you're considering",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "wander" } or { "type": "follow", "target": "Oak" }
}
```

**Key characteristics of unskilled prompt:**
- No strategic information (food days, material counts, infrastructure gaps)
- Vague awareness of buildings ("some structures")
- Sees agents but not their skills or detailed activities
- Limited action vocabulary (no build, farm, craft, cook)
- Guidance focuses on immediate survival and following others
- No village-wide coordination suggestions

---

### Example B: Oak (Skilled Builder)

```
You are Oak, a villager in a forest village.

Personality:
- You are hardworking and dedicated

Your Expertise:
[BUILDING - Journeyman]
Your building expertise includes:
- Material efficiency calculations
- Structural load distribution
- Climate-appropriate designs
- Tool selection for different tasks
You can identify suboptimal construction and suggest improvements.

[GATHERING - Apprentice]
You know gathering basics:
- Tool selection affects efficiency
- Resource quality varies
- Some sources regenerate over time

[CRAFTING - Novice]
You can make simple items. Basic tools require wood and stone.

Current Situation:
- Hunger: 55% (could eat)
- Energy: 60% (tired)
- Temperature: 18C (comfortable)
- Inventory: 12 wood, 8 stone, 2 plant_fiber (35/50 weight, 70% full)
  (getting heavy - will need to deposit soon)

Village Infrastructure:
- Built: campfire, storage-chest
- Being Built: workbench (River building)
- Missing: farm-shed (unlocks sustainable food), well (water for crops)

As a builder, you assess the village needs:
- The workbench is 60% complete, needs 8 more wood
- After workbench: farm-shed would solve the food problem
- Stone foundation would improve the storage-chest durability

Storage Resources:
- Wood: 45 (good supply)
- Stone: 23 (adequate)
- Food: 18 items

Nearby Resources (your trained eye spots):
- Stone deposit 30 tiles northeast (quality: good, ~40 stone)
- Clay patch near the river (useful for advanced structures)
- 6 trees suitable for lumber

Nearby Villagers:
- River (friend, working on workbench)
- Pine (acquaintance, wandering around)
- Wren (stranger, talking to someone)

What You Remember:
- Built the campfire yesterday
- River mentioned needing help with the workbench
- Found good stone deposit to the northeast

You can:
- build - Construct: lean-to, workbench, storage-chest, wooden-cabin, well, farm-shed, forge
- plan_build - Plan a construction project (materials gathered from village storage)
- gather - Collect wood, stone, or other materials
- deposit_items - Store items in village storage
- craft - Make basic items: wooden_hammer, stone_axe
- talk - Speak with nearby villagers
- help - Assist with the workbench construction
- rest - Take a break

The workbench is almost done. You could help River finish it, or start planning the farm-shed.

Your response (JSON only):
{
  "thinking": "The workbench needs finishing, but I should deposit these materials first...",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "help", "target": "River" }
         or { "type": "plan_build", "building": "farm-shed" }
         or { "type": "deposit_items" }
}
```

**Key characteristics of builder prompt:**
- Full village infrastructure status with progress percentages
- Material requirements for in-progress buildings
- Sees resource deposits at extended range (skill extends perception)
- Strategic building suggestions based on village needs
- Knows about other agents' building activities (coordination)
- Action list includes full building options with skill-unlocked buildings

---

### Example C: River (Skilled Cook/Farmer)

```
You are River, a villager in a forest village.

Personality:
- You are outgoing and social
- You love helping others

Your Expertise:
[COOKING - Journeyman]
Your cooking knowledge includes:
- Recipe modification techniques
- Flavor balancing principles
- Preservation methods
- Nutrition optimization

[FARMING - Apprentice]
You understand farming fundamentals:
- Soil preparation improves yields
- Different crops have different needs
- Watering timing matters

[MEDICINE - Novice]
You know basic first aid. Rest and clean water help healing.

Current Situation:
- Hunger: 40% (hungry)
- Energy: 55% (tired)
- Temperature: 18C (comfortable)
- Inventory: 8 berries, 4 wheat, 2 meat (18/50 weight, 36% full)

Food Assessment:
Your expertise tells you the village food situation:
- Raw ingredients: 12 berries, 6 meat, 8 wheat
- Prepared meals: 2 cooked_meat, 1 bread
- Daily consumption: ~12 food (6 villagers)
- Days remaining: 2.4 days
- Priority: Cook raw meat before it spoils (3 pieces at risk)

The soil near the farm-shed looks good for wheat. The well would improve crop yields.

Crops You're Tending:
- Wheat patch (northeast): 8 plants, 3 ready to harvest
- Carrot row (south): 5 plants, seedling stage, need water

Recipes You Know:
- cooked_meat (meat + fire) - +50% nutrition, lasts longer
- bread (wheat + oven) - filling, stores well
- simple_stew (meat + vegetables + water) - very nutritious
- dried_meat (meat + smoke) - preserves indefinitely
- berry_mash (berries) - quick energy

Nearby Food Sources (your trained eye spots):
- Wild onion patch 25 tiles west (would make great stew)
- Herb patch near river (mint - aids digestion)
- 3 berry bushes with ripe berries

Nearby Villagers:
- Oak (friend, building something)
- Pine (acquaintance, seems lost)
- Wren (friend, chatting nearby)

What You Remember:
- Wheat harvest should be ready tomorrow
- Oak mentioned being hungry earlier
- Found wild onions to the west

You can:
- cook - Prepare: cooked_meat, bread, simple_stew, dried_meat, berry_mash
- farm - Tend crops: water, weed, harvest
- plant - Plant seeds you have
- harvest - Gather mature crops
- gather - Collect berries, herbs, wild foods
- deposit_items - Store food in village storage
- talk - Speak with nearby villagers
- help - Share food or assist others

Food is getting low. You should cook the meat before it spoils and check on the wheat.

Your response (JSON only):
{
  "thinking": "The meat will spoil soon, I should cook it. Then harvest the wheat...",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "cook", "recipe": "cooked_meat" }
         or { "type": "harvest", "target": "wheat" }
         or [
              { "type": "cook", "recipe": "cooked_meat" },
              { "type": "harvest", "target": "wheat" }
            ]
}
```

**Key characteristics of cook/farmer prompt:**
- Detailed food analytics (days remaining, spoilage risk)
- Knows recipes by skill level
- Sees food-relevant entities at extended range (herbs, wild onions)
- Crop status with growth stage and needs
- Strategic food suggestions (cook before spoilage)
- No building infrastructure details (not their domain)

---

### Example D: Wren (Social Specialist)

```
You are Wren, a villager in a forest village.

Personality:
- You are outgoing and social
- You love helping others
- You are a natural leader who takes initiative and organizes others
- You feel responsible for coordinating the village and helping everyone work together

Your Expertise:
[SOCIAL - Journeyman]
Your social skills include:
- Conflict resolution basics
- Negotiation techniques
- Reading emotional cues
- Building trust over time

[EXPLORATION - Apprentice]
You understand exploration basics:
- Landmarks help navigation
- Different biomes have different resources
- Danger signs to watch for

[ANIMAL HANDLING - Novice]
You know animals can be tamed. Approach them carefully and offer food.

Current Situation:
- Hunger: 60% (could eat)
- Energy: 65% (rested)
- Temperature: 18C (comfortable)
- Inventory: 4 berries, 1 rope (6/50 weight, 12% full)

Village Social Landscape:
Your social awareness reveals:
- Village morale: 68% (decent, but could be better)
- Active conversations: 1 (Oak and Pine discussing something)
- Potential tensions: River seemed frustrated earlier (maybe needs help?)
- Coordination opportunity: No one is working on food gathering right now

Your Relationships:
- Oak: Close friend (+45 affinity, 12 interactions)
  Skilled builder. You've shared many meals together.
  You could ask Oak to build something for you.

- River: Friend (+30 affinity, 8 interactions)
  Skilled cook and farmer. Recently taught you about herbs.
  River might appreciate help with the crops.

- Pine: Acquaintance (+10 affinity, 3 interactions)
  New to the village, seems unsure. Could use guidance.

- Ash: Stranger (0 affinity, 0 interactions)
  You've seen them crafting. Haven't spoken yet.

What Others Need (based on your observations):
- Pine seems lost - could use someone to show them around
- River looked tired earlier - maybe offer to help with something
- The village could use better coordination on gathering

Nearby (your awareness extends to the whole village):
- Oak and Pine (northeast, near the workbench)
- River (south, by the farm plots)
- Ash (west, at the crafting area)
- Wild chickens spotted near the eastern clearing

Mental Map:
- North: Dense forest, good wood
- East: Clearing with berry bushes, wild chickens
- South: River, farm plots, herb patches
- West: Rocky area, stone deposits

What You Remember:
- River mentioned the crops need water
- Oak is working on the workbench
- You promised to check on Pine

You can:
- talk - Have a conversation, share information, coordinate
- suggest_task - Recommend someone do something they're skilled at
- comfort - Help someone who seems stressed or upset
- call_meeting - Gather villagers to discuss something
- follow - Accompany someone
- explore - Scout new areas, find resources
- observe_animal - Watch and learn about nearby animals
- gather - Collect basic resources

The village could use better coordination. Maybe check on Pine, or help River with something.

Your response (JSON only):
{
  "thinking": "Pine seems lost, I should help them get oriented. River looked tired too...",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "talk", "target": "Pine", "intent": "help_orient" }
         or { "type": "suggest_task", "target": "Pine", "task": "help River with crops" }
         or { "type": "call_meeting", "topic": "coordinate gathering" }
}
```

**Key characteristics of social specialist prompt:**
- Detailed relationship information with affordances
- Village morale and social dynamics
- Sees what others might need (emotional awareness)
- Extended map awareness (exploration skill)
- Coordination-focused actions (suggest_task, call_meeting)
- Knows about others' skills through relationships
- Animal awareness from animal_handling skill

---

### Example E: Birch (Generalist)

```
You are Birch, a villager in a forest village.

Personality:
- You are curious and adventurous

Your Expertise:
[GATHERING - Apprentice]
You know gathering basics:
- Tool selection affects efficiency
- Resource quality varies
- Some sources regenerate over time

[BUILDING - Novice]
You have basic construction knowledge. Buildings need foundations and materials.

[FARMING - Novice]
You know the basics of farming. Plants need water and sunlight to grow.

[COOKING - Novice]
You can prepare basic food. Cooking makes food safer and more nutritious.

[CRAFTING - Novice]
You can make simple items. Basic tools require wood and stone.

[EXPLORATION - Novice]
You know to look around carefully. New areas may have resources.

Current Situation:
- Hunger: 50% (could eat)
- Energy: 70% (rested)
- Temperature: 18C (comfortable)
- Inventory: 6 wood, 4 stone, 3 berries (20/50 weight, 40% full)

Village Overview:
- Buildings: campfire, storage-chest, workbench (being built)
- Storage has some resources (wood, stone, food)
- A few farms are being tended

You notice around you:
- 5 trees nearby (good for wood)
- Stone deposit to the east
- Berry bushes to the south
- Wheat plants (someone's farming)

Nearby Villagers:
- Oak (seems skilled at building)
- River (working with plants)
- Wren (talking to someone)

What You Remember:
- The workbench is being built
- Found berries to the south yesterday
- River knows about cooking

You can:
- gather - Collect wood, stone, berries, or other resources
- build - Construct simple structures: lean-to, campfire, storage-chest
- farm - Basic farming: till soil, plant seeds, water
- cook - Simple cooking: cooked_meat, berry_mash
- craft - Basic items: wooden_hammer, stone_axe
- explore - Look around for new areas
- talk - Speak with nearby villagers
- rest - Take a break

You're capable at many things but master of none. Help where you can.

Your response (JSON only):
{
  "thinking": "I can do a bit of everything. Maybe gather resources or help with the workbench...",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "gather", "target": "wood" }
         or { "type": "help", "target": "Oak" }
}
```

**Key characteristics of generalist prompt:**
- Brief expertise sections for multiple skills
- Moderate detail on village state
- Sees various entity types but not at expert level
- Basic actions available across domains
- No deep strategic insights in any domain
- Flexibility-focused guidance

---

### Example F: Ash (Master Craftsman)

```
You are Ash, a villager in a forest village.

Personality:
- You are hardworking and dedicated
- You are curious and adventurous

Your Expertise:
[CRAFTING - Expert]
As an expert crafter, you know:
- Advanced material combinations
- Precision techniques
- Complex multi-step crafts
- Quality optimization
You can create items of exceptional quality.

[BUILDING - Journeyman]
Your building expertise includes:
- Material efficiency calculations
- Structural load distribution
- Climate-appropriate designs
- Tool selection for different tasks

[GATHERING - Apprentice]
You know gathering basics:
- Tool selection affects efficiency
- Resource quality varies
- Some sources regenerate over time

[SOCIAL - Apprentice]
You understand social dynamics:
- Listening improves relationships
- Different people have different needs
- Cooperation benefits everyone

Current Situation:
- Hunger: 55% (could eat)
- Energy: 50% (tired)
- Temperature: 18C (comfortable)
- Inventory: 8 iron_ore, 6 leather, 4 plant_fiber, 3 wood (38/50 weight, 76% full)
  (heavy load - should deposit or use materials soon)

Crafting Assessment:
Your expert eye evaluates the village crafting situation:
- Forge: Available (can smelt iron)
- Workbench: Available (basic crafting)
- Current tool quality: Mostly stone tools (inefficient)
- Priority: Village needs iron tools for faster gathering

Material Quality Analysis:
- Iron ore in inventory: Good quality (85% purity), will yield strong tools
- Leather: Well-cured, suitable for armor or tool grips
- Plant fiber: Fresh, good for rope or cloth

Advanced Recipes You Know:
Tier 1 (Basic):
- stone_axe, stone_pickaxe, wooden_hammer, rope, cloth

Tier 2 (Intermediate):
- iron_axe (iron_ingot + wood + leather) - 2x gathering speed
- iron_pickaxe (iron_ingot + wood) - mines ore faster
- leather_armor (leather + plant_fiber) - protection
- iron_hammer (iron_ingot + wood) - faster building

Tier 3 (Advanced):
- steel_tools (iron + coal at high heat) - best durability
- reinforced_armor (leather + iron_plates) - excellent protection
- precision_tools (iron + fine materials) - bonus crafting quality

Tier 4 (Expert - your specialty):
- master_toolkit - +20% crafting speed for entire village
- enchantable_blank - base for magical items
- teaching_manual - helps train apprentice crafters

Infrastructure for Crafting:
- Forge: Complete (can smelt ore)
- Workbench: Complete (basic crafting)
- Missing: Workshop (would enable master crafts)

Nearby Materials (your trained eye spots):
- Copper ore vein 45 tiles northwest (for bronze alloys)
- Quality leather source (deer spotted nearby)
- Coal deposit 50 tiles east (needed for steel)

Village Tool Inventory:
- 2 stone_axe (worn)
- 1 stone_pickaxe (good condition)
- 1 wooden_hammer
- 0 iron tools

Nearby Villagers:
- Oak: Friend, skilled builder. Could use iron tools.
- Birch: Acquaintance, interested in learning crafting.
- River: Friend, might need cooking tools.

What You Remember:
- Promised Oak some iron tools
- Found copper ore to the northwest
- Birch asked about learning to craft

You can:
- craft - Create any item up to Expert tier
- smelt - Process ore into ingots at the forge
- plan_build - Plan workshop construction (unlocks master crafts)
- build - Construct buildings (journeyman level)
- gather - Collect materials
- teach - Share crafting knowledge with interested villagers
- deposit_items - Store items in village storage
- talk - Speak with nearby villagers

You have quality materials. Consider smelting iron and making tools for the village.

Your response (JSON only):
{
  "thinking": "I have good iron ore. Should smelt it and make tools for Oak and the village...",
  "speaking": "what you say out loud (optional)",
  "action": { "type": "smelt", "material": "iron_ore" }
         or { "type": "craft", "recipe": "iron_axe" }
         or [
              { "type": "smelt", "material": "iron_ore" },
              { "type": "craft", "recipe": "iron_axe" },
              { "type": "craft", "recipe": "iron_pickaxe" }
            ]
}
```

**Key characteristics of master craftsman prompt:**
- Full recipe knowledge with quality tiers
- Material quality analysis
- Sees rare material sources at long range
- Village-wide tool inventory assessment
- Teaching ability as an action
- Strategic crafting suggestions
- Building knowledge at journeyman level

---

## 3. Implementation Templates

### 3.1 Skill Level Constants

```typescript
// In SkillConstants.ts or similar

export const SKILL_PERCEPTION_RADIUS: Record<SkillLevel, number> = {
  0: 5,    // Adjacent only
  1: 15,   // Nearby
  2: 30,   // Local area
  3: 50,   // Extended area
  4: 100,  // Region-wide
  5: 200,  // Map-wide
};

export const RELATIONSHIP_TIERS = {
  STRANGER: { minFamiliarity: 0, maxFamiliarity: 10 },
  ACQUAINTANCE: { minFamiliarity: 11, maxFamiliarity: 30 },
  FRIEND: { minFamiliarity: 31, maxFamiliarity: 60 },
  CLOSE_FRIEND: { minFamiliarity: 61, maxFamiliarity: 85 },
  FAMILY: { minFamiliarity: 86, maxFamiliarity: 100 },
} as const;

export function getRelationshipTier(familiarity: number): string {
  if (familiarity >= 86) return 'family';
  if (familiarity >= 61) return 'close_friend';
  if (familiarity >= 31) return 'friend';
  if (familiarity >= 11) return 'acquaintance';
  return 'stranger';
}
```

### 3.2 Main Skill-Gated Prompt Builder

```typescript
// In StructuredPromptBuilder.ts

interface SkillGatedPromptConfig {
  agent: Entity;
  world: WorldLike;
  skills: Record<SkillId, SkillLevel>;
}

/**
 * Build complete prompt with skill-gated sections.
 */
buildSkillGatedPrompt(config: SkillGatedPromptConfig): string {
  const { agent, world, skills } = config;

  const sections: string[] = [];

  // 1. Identity and personality (always included)
  sections.push(this.buildIdentitySection(agent));

  // 2. Skill expertise (only for skills >= 1)
  const expertiseSection = this.buildExpertiseSection(skills);
  if (expertiseSection) sections.push(expertiseSection);

  // 3. Current situation (needs, inventory - always included)
  sections.push(this.buildSituationSection(agent));

  // 4. Skill-gated world context
  sections.push(this.buildSkillGatedWorldContext(agent, world, skills));

  // 5. Skill-gated nearby entities
  sections.push(this.buildSkillGatedNearbySection(agent, world, skills));

  // 6. Relationship-based affordances (gated by social skill)
  const relationshipSection = this.buildRelationshipAffordances(agent, world, skills);
  if (relationshipSection) sections.push(relationshipSection);

  // 7. Memories
  const memories = this.buildMemories(agent.getComponent('memory'));
  if (memories) sections.push(memories);

  // 8. Skill-gated actions
  sections.push(this.buildSkillGatedActions(agent, world, skills));

  // 9. Skill-appropriate instruction
  sections.push(this.buildSkillGatedInstruction(agent, world, skills));

  return sections.filter(s => s.trim()).join('\n\n');
}
```

---

## 4. Section-by-Section Templates

### 4.1 Food Section (Cooking Skill)

```typescript
/**
 * Build food information section gated by cooking skill.
 */
buildFoodSection(
  storage: StorageData,
  population: number,
  cookingSkill: SkillLevel
): string {
  const totalFood = storage.getFoodCount();
  const consumptionRate = population * 2; // 2 food per agent per day
  const daysRemaining = totalFood / consumptionRate;
  const spoilageRisk = this.calculateSpoilageRisk(storage);

  switch (cookingSkill) {
    case 0:
      // Untrained: Minimal awareness
      return totalFood > 10
        ? "There seems to be food stored in the village."
        : totalFood > 0
        ? "You've seen some food around."
        : "You're not sure if there's any food stored.";

    case 1:
      // Novice: Basic counts
      const foodTypes = storage.getFoodByType();
      const typeList = Object.entries(foodTypes)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      return `Food you've noticed: ${typeList || 'none'}`;

    case 2:
      // Apprentice: Categorized + consumption awareness
      return `Food in storage:
${this.formatFoodByType(storage)}
The village eats food daily. Current supply seems ${
        daysRemaining > 5 ? 'adequate' : daysRemaining > 2 ? 'limited' : 'low'
      }.`;

    case 3:
      // Journeyman: Full analytics
      return `Food Assessment:
${this.formatFoodByType(storage)}
- Daily consumption: ~${consumptionRate} food (${population} villagers)
- Days remaining: ${daysRemaining.toFixed(1)}
${spoilageRisk.count > 0 ? `- Spoilage risk: ${spoilageRisk.count} items need cooking soon` : ''}`;

    case 4:
      // Expert: Analytics + strategic recommendations
      const strategy = this.generateFoodStrategy(storage, daysRemaining, spoilageRisk);
      return `Food Assessment:
${this.formatFoodByType(storage)}
- Daily consumption: ~${consumptionRate} food
- Days remaining: ${daysRemaining.toFixed(1)}
- Spoilage risk: ${spoilageRisk.count > 0 ? `${spoilageRisk.count} items at risk` : 'none'}
- Recommendation: ${strategy}`;

    case 5:
      // Master: Full strategic overview
      return `[FOOD STRATEGIC OVERVIEW]
Current Inventory:
${this.formatFoodByType(storage)}

Analytics:
- Burn rate: ${consumptionRate}/day
- Runway: ${daysRemaining.toFixed(1)} days
- Spoilage forecast: ${spoilageRisk.forecast}
- Nutrition balance: ${this.analyzeNutritionBalance(storage)}

Strategic Recommendation:
${this.generateMasterFoodStrategy(storage, daysRemaining)}`;

    default:
      return '';
  }
}
```

### 4.2 Building Section (Building Skill)

```typescript
/**
 * Build infrastructure section gated by building skill.
 */
buildInfrastructureSection(
  world: WorldLike,
  buildingSkill: SkillLevel
): string {
  const buildings = world.query().with('building').executeEntities();
  const builtTypes = new Map<string, number>();
  const inProgress: Array<{type: string, progress: number, builders: string[]}> = [];

  for (const b of buildings) {
    const bc = b.getComponent('building');
    if (bc.isComplete) {
      builtTypes.set(bc.buildingType, (builtTypes.get(bc.buildingType) || 0) + 1);
    } else {
      const builderNames = this.getBuilderNames(bc.builderIds, world);
      inProgress.push({
        type: bc.buildingType,
        progress: bc.buildProgress,
        builders: builderNames
      });
    }
  }

  switch (buildingSkill) {
    case 0:
      // Untrained: Vague awareness
      return builtTypes.size > 0
        ? "There are some structures in the village."
        : "The area is mostly undeveloped.";

    case 1:
      // Novice: Building names only
      const typeList = Array.from(builtTypes.keys()).join(', ');
      return `Village buildings: ${typeList || 'none yet'}`;

    case 2:
      // Apprentice: Buildings + purposes + construction status
      let section = 'Village Infrastructure:\n';
      section += `- Built: ${this.formatBuildingList(builtTypes)}\n`;
      if (inProgress.length > 0) {
        const inProgressList = inProgress
          .map(b => `${b.type} (${Math.round(b.progress * 100)}%)`)
          .join(', ');
        section += `- Under construction: ${inProgressList}`;
      }
      return section;

    case 3:
      // Journeyman: Material requirements + builder info
      let jSection = 'Village Infrastructure:\n';
      jSection += `- Built: ${this.formatBuildingList(builtTypes)}\n`;
      if (inProgress.length > 0) {
        for (const b of inProgress) {
          const remaining = this.getRemainingMaterials(b.type, b.progress);
          jSection += `- ${b.type}: ${Math.round(b.progress * 100)}% (needs ${remaining})\n`;
          if (b.builders.length > 0) {
            jSection += `  Builders: ${b.builders.join(', ')}\n`;
          }
        }
      }
      return jSection;

    case 4:
      // Expert: Infrastructure gaps + optimization
      const gaps = this.analyzeInfrastructureGaps(world, builtTypes);
      let eSection = 'Village Infrastructure:\n';
      eSection += `Built: ${this.formatBuildingList(builtTypes)}\n`;
      if (inProgress.length > 0) {
        eSection += '\nIn Progress:\n';
        for (const b of inProgress) {
          const remaining = this.getRemainingMaterials(b.type, b.progress);
          eSection += `- ${b.type}: ${Math.round(b.progress * 100)}% (needs ${remaining})\n`;
        }
      }
      if (gaps.length > 0) {
        eSection += '\nInfrastructure Gaps:\n';
        for (const gap of gaps) {
          eSection += `- ${gap}\n`;
        }
      }
      return eSection;

    case 5:
      // Master: Full planning view
      const optimalOrder = this.calculateOptimalBuildOrder(world, builtTypes);
      return `[INFRASTRUCTURE STRATEGIC VIEW]
Current Buildings:
${this.formatDetailedBuildingList(builtTypes)}

Construction Status:
${this.formatDetailedConstructionStatus(inProgress)}

Infrastructure Analysis:
${this.analyzeInfrastructureEfficiency(world)}

Recommended Build Order:
${optimalOrder.map((b, i) => `${i + 1}. ${b.type} - ${b.reason}`).join('\n')}`;

    default:
      return '';
  }
}
```

### 4.3 Nearby Agents Section (Social Skill)

```typescript
/**
 * Build nearby agents section gated by social skill.
 */
buildNearbyAgentsSection(
  agent: Entity,
  seenAgentIds: string[],
  world: WorldLike,
  socialSkill: SkillLevel
): string {
  if (!seenAgentIds || seenAgentIds.length === 0) {
    return '';
  }

  const relationships = agent.getComponent('relationship');
  const agentDescriptions: string[] = [];

  for (const agentId of seenAgentIds) {
    const other = world.getEntity(agentId);
    if (!other) continue;

    const identity = other.getComponent('identity');
    const relationship = relationships?.relationships.get(agentId);
    const otherSkills = other.getComponent('skills');
    const otherNeeds = other.getComponent('needs');
    const otherAgent = other.getComponent('agent');

    const name = identity?.name || 'someone';
    const tier = getRelationshipTier(relationship?.familiarity || 0);

    let description: string;

    switch (socialSkill) {
      case 0:
        // Untrained: Just notice presence
        description = name;
        break;

      case 1:
        // Novice: Name + vague mood
        const mood = this.getVagueMood(otherNeeds);
        description = mood ? `${name} (${mood})` : name;
        break;

      case 2:
        // Apprentice: Name + relationship + activity
        const activity = this.getCurrentActivity(otherAgent);
        const relLabel = tier === 'stranger' ? '' : `, ${tier.replace('_', ' ')}`;
        description = `${name}${relLabel}${activity ? ` - ${activity}` : ''}`;
        break;

      case 3:
        // Journeyman: Full profile with skills
        const skills = this.getPrimarySkills(otherSkills);
        const needs = this.getUrgentNeeds(otherNeeds);
        description = `${name} (${tier.replace('_', ' ')})`;
        if (skills) description += `\n  Skills: ${skills}`;
        if (needs) description += `\n  Needs: ${needs}`;
        break;

      case 4:
        // Expert: Relationship affordances
        const affordances = this.getRelationshipAffordances(relationship, otherSkills, tier);
        description = `${name} (${tier.replace('_', ' ')}, ${relationship?.affinity || 0} affinity)`;
        description += `\n  ${this.getPrimarySkills(otherSkills) || 'No notable skills'}`;
        if (affordances.length > 0) {
          description += `\n  You could: ${affordances.join(', ')}`;
        }
        break;

      case 5:
        // Master: Full social graph + influence
        const influence = this.analyzeInfluence(agentId, world);
        const tensions = this.detectTensions(agent, other, world);
        description = `${name}`;
        description += `\n  Relationship: ${tier.replace('_', ' ')} (${relationship?.affinity || 0} affinity, ${relationship?.trust || 0} trust)`;
        description += `\n  Skills: ${this.getPrimarySkills(otherSkills) || 'None notable'}`;
        description += `\n  Influence: ${influence}`;
        if (tensions) description += `\n  Note: ${tensions}`;
        break;

      default:
        description = name;
    }

    agentDescriptions.push(description);
  }

  if (socialSkill >= 3) {
    return `Nearby Villagers:\n${agentDescriptions.map(d => `- ${d}`).join('\n')}`;
  } else {
    return `Nearby: ${agentDescriptions.join(', ')}`;
  }
}
```

### 4.4 Resource/Gathering Section

```typescript
/**
 * Build resource section gated by gathering skill.
 */
buildResourceSection(
  storage: StorageData,
  gatheringSkill: SkillLevel
): string {
  switch (gatheringSkill) {
    case 0:
      // Untrained: Minimal awareness
      return "There are things stored in the village.";

    case 1:
      // Novice: Resource types only
      const types = storage.getResourceTypes();
      return `Storage has: ${types.join(', ') || 'nothing'}`;

    case 2:
      // Apprentice: Types + counts
      const counts = storage.getResourceCounts();
      const list = Object.entries(counts)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      return `Village storage: ${list}`;

    case 3:
      // Journeyman: Counts + consumption rate
      const fullCounts = storage.getResourceCounts();
      const consumption = this.calculateResourceConsumption(storage);
      let section = 'Village Resources:\n';
      for (const [type, count] of Object.entries(fullCounts)) {
        const rate = consumption[type] || 0;
        section += `- ${type}: ${count}${rate > 0 ? ` (~${rate}/day used)` : ''}\n`;
      }
      return section;

    case 4:
      // Expert: Days of supply + forecasting
      const detailedCounts = storage.getResourceCounts();
      const detailedConsumption = this.calculateResourceConsumption(storage);
      let eSection = 'Village Resources:\n';
      for (const [type, count] of Object.entries(detailedCounts)) {
        const rate = detailedConsumption[type] || 0;
        const days = rate > 0 ? (count / rate).toFixed(1) : 'unlimited';
        eSection += `- ${type}: ${count} (${days} days at current rate)\n`;
      }
      return eSection;

    case 5:
      // Master: Full resource forecasting
      return `[RESOURCE STRATEGIC VIEW]
${this.formatDetailedResourceInventory(storage)}

Consumption Analysis:
${this.formatConsumptionAnalysis(storage)}

Forecast:
${this.generateResourceForecast(storage)}

Recommendations:
${this.generateGatheringPriorities(storage)}`;

    default:
      return '';
  }
}
```

---

## 5. Action Filtering Templates

### 5.1 Universal Actions

```typescript
const UNIVERSAL_ACTIONS = [
  { id: 'wander', desc: 'Walk around and see what\'s happening' },
  { id: 'rest', desc: 'Take a break and recover energy' },
  { id: 'sleep', desc: 'Sleep to restore energy' },
  { id: 'eat', desc: 'Eat food from inventory' },
  { id: 'drink', desc: 'Drink water' },
  { id: 'talk', desc: 'Speak with nearby villagers' },
  { id: 'follow', desc: 'Follow someone' },
  { id: 'gather', desc: 'Pick up basic items (berries, sticks, loose stones)' },
  { id: 'help', desc: 'Try to assist with someone else\'s task' },
];
```

### 5.2 Skill-Gated Actions

```typescript
interface SkillGatedAction {
  id: string;
  desc: string;
  skill: SkillId;
  minLevel: SkillLevel;
  levelDescriptions?: Record<SkillLevel, string>; // Different descriptions by level
}

const SKILL_GATED_ACTIONS: SkillGatedAction[] = [
  // Building
  {
    id: 'build',
    desc: 'Construct buildings',
    skill: 'building',
    minLevel: 0,
    levelDescriptions: {
      0: 'Build simple structures: lean-to, campfire',
      1: 'Build: lean-to, campfire, storage-chest, workbench',
      2: 'Build: wooden-cabin, well, farm-shed, and simpler structures',
      3: 'Build: workshop, barn, forge, and all simpler structures',
      4: 'Build: warehouse, monument, and all structures',
      5: 'Build: grand_hall, any structure with master efficiency',
    }
  },
  {
    id: 'plan_build',
    desc: 'Plan construction (materials gathered from storage)',
    skill: 'building',
    minLevel: 2,
  },

  // Farming
  {
    id: 'till',
    desc: 'Prepare soil for planting',
    skill: 'farming',
    minLevel: 1,
  },
  {
    id: 'plant',
    desc: 'Plant seeds in tilled soil',
    skill: 'farming',
    minLevel: 1,
  },
  {
    id: 'water',
    desc: 'Water crops',
    skill: 'farming',
    minLevel: 2,
  },
  {
    id: 'harvest',
    desc: 'Harvest mature crops',
    skill: 'farming',
    minLevel: 0,
  },
  {
    id: 'selective_harvest',
    desc: 'Harvest while preserving seed stock',
    skill: 'farming',
    minLevel: 4,
  },

  // Cooking
  {
    id: 'cook',
    desc: 'Prepare meals',
    skill: 'cooking',
    minLevel: 1,
    levelDescriptions: {
      1: 'Cook: cooked_meat, berry_mash',
      2: 'Cook: bread, dried_meat, simple_stew',
      3: 'Cook: meat_pie, vegetable_soup, preserved_food',
      4: 'Cook: feast_dishes, healing_foods',
      5: 'Cook: any recipe, create new recipes',
    }
  },

  // Crafting
  {
    id: 'craft',
    desc: 'Create items',
    skill: 'crafting',
    minLevel: 1,
    levelDescriptions: {
      1: 'Craft: stone_axe, stone_pickaxe, wooden_hammer',
      2: 'Craft: rope, cloth, plank, fishing_rod',
      3: 'Craft: iron_tools, leather_armor, furniture',
      4: 'Craft: steel_items, fine_clothing, machinery',
      5: 'Craft: master items, enchanted gear',
    }
  },
  {
    id: 'smelt',
    desc: 'Process ore into ingots',
    skill: 'crafting',
    minLevel: 2,
  },

  // Social
  {
    id: 'suggest_task',
    desc: 'Recommend someone do something they\'re skilled at',
    skill: 'social',
    minLevel: 3,
  },
  {
    id: 'delegate',
    desc: 'Assign a task to a skilled agent',
    skill: 'social',
    minLevel: 4,
  },
  {
    id: 'call_meeting',
    desc: 'Gather villagers to discuss something',
    skill: 'social',
    minLevel: 3,
  },
  {
    id: 'mediate',
    desc: 'Resolve conflict between others',
    skill: 'social',
    minLevel: 4,
  },

  // Exploration
  {
    id: 'explore',
    desc: 'Scout new areas',
    skill: 'exploration',
    minLevel: 1,
  },
  {
    id: 'map',
    desc: 'Create mental map of area',
    skill: 'exploration',
    minLevel: 3,
  },

  // Animal Handling
  {
    id: 'observe_animal',
    desc: 'Watch and learn about animal behavior',
    skill: 'animal_handling',
    minLevel: 0,
  },
  {
    id: 'feed_animal',
    desc: 'Feed an animal',
    skill: 'animal_handling',
    minLevel: 1,
  },
  {
    id: 'tame',
    desc: 'Attempt to tame a wild animal',
    skill: 'animal_handling',
    minLevel: 2,
  },
  {
    id: 'breed',
    desc: 'Breed animals',
    skill: 'animal_handling',
    minLevel: 3,
  },

  // Medicine
  {
    id: 'diagnose',
    desc: 'Assess someone\'s health',
    skill: 'medicine',
    minLevel: 2,
  },
  {
    id: 'heal',
    desc: 'Treat injuries or illness',
    skill: 'medicine',
    minLevel: 2,
  },
  {
    id: 'create_remedy',
    desc: 'Create medicinal items',
    skill: 'medicine',
    minLevel: 3,
  },
];
```

### 5.3 Action Filtering Function

```typescript
/**
 * Get available actions filtered by skill level.
 */
function getSkillGatedActions(
  skills: Record<SkillId, SkillLevel>,
  context: WorldContext
): ActionDefinition[] {
  const actions: ActionDefinition[] = [];

  // Always add universal actions
  for (const action of UNIVERSAL_ACTIONS) {
    actions.push({ id: action.id, description: action.desc });
  }

  // Add skill-gated actions the agent qualifies for
  for (const action of SKILL_GATED_ACTIONS) {
    const agentLevel = skills[action.skill] ?? 0;

    if (agentLevel >= action.minLevel) {
      // Use level-specific description if available
      let description = action.desc;
      if (action.levelDescriptions && action.levelDescriptions[agentLevel]) {
        description = action.levelDescriptions[agentLevel];
      }

      actions.push({ id: action.id, description });
    }
  }

  return actions;
}
```

---

## 6. Relationship Affordance Templates

### 6.1 What Relationships Unlock

```typescript
const RELATIONSHIP_AFFORDANCES = {
  stranger: {
    canObserve: true,
    canTalk: true,
    canAskHelp: false,
    canBorrowTools: false,
    canDelegateTasks: false,
    canLearnSkills: false,
    canShareStorage: false,
    description: 'You don\'t know them yet'
  },
  acquaintance: {
    canObserve: true,
    canTalk: true,
    canAskHelp: false,
    canBorrowTools: false,
    canDelegateTasks: false,
    canLearnSkills: true, // Can observe their primary skill
    canShareStorage: false,
    description: 'You\'ve met before'
  },
  friend: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: false,
    canLearnSkills: true,
    canShareStorage: false,
    description: 'A friend who helps when asked'
  },
  close_friend: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: true,
    canLearnSkills: true,
    canShareStorage: true,
    description: 'A close friend who shares resources'
  },
  family: {
    canObserve: true,
    canTalk: true,
    canAskHelp: true,
    canBorrowTools: true,
    canDelegateTasks: true,
    canLearnSkills: true,
    canShareStorage: true,
    skillBonus: 0.1, // +10% effectiveness when working together
    description: 'Family - automatic cooperation'
  }
};
```

### 6.2 Building Relationship Affordance Section

```typescript
/**
 * Build relationship affordances section.
 * Shows what capabilities the agent can access through relationships.
 */
buildRelationshipAffordances(
  agent: Entity,
  world: WorldLike,
  skills: Record<SkillId, SkillLevel>
): string | null {
  const socialSkill = skills.social ?? 0;

  // Need at least social level 2 to perceive affordances
  if (socialSkill < 2) {
    return null;
  }

  const relationships = agent.getComponent('relationship');
  if (!relationships || relationships.relationships.size === 0) {
    return null;
  }

  const agentSkills = skills;
  const affordancesBySkill: Record<string, string[]> = {};

  for (const [targetId, rel] of relationships.relationships) {
    const target = world.getEntity(targetId);
    if (!target) continue;

    const targetIdentity = target.getComponent('identity');
    const targetSkills = target.getComponent('skills');
    if (!targetIdentity || !targetSkills) continue;

    const tier = getRelationshipTier(rel.familiarity);
    const tierAffordances = RELATIONSHIP_AFFORDANCES[tier];

    if (!tierAffordances.canAskHelp) continue;

    // Find skills this person has that the agent lacks
    for (const [skillId, level] of Object.entries(targetSkills.levels)) {
      if (level >= 2 && (agentSkills[skillId as SkillId] ?? 0) < level) {
        const skillName = skillId.replace(/_/g, ' ');
        if (!affordancesBySkill[skillName]) {
          affordancesBySkill[skillName] = [];
        }

        const actionHint = tierAffordances.canDelegateTasks
          ? 'can ask them to do it'
          : 'could ask for help';

        affordancesBySkill[skillName].push(
          `${targetIdentity.name} (${actionHint})`
        );
      }
    }
  }

  if (Object.keys(affordancesBySkill).length === 0) {
    return null;
  }

  let section = 'Available Through Relationships:\n';
  for (const [skill, sources] of Object.entries(affordancesBySkill)) {
    section += `- ${skill}: ${sources.join(', ')}\n`;
  }

  return section;
}
```

### 6.3 Example Relationship Affordance Output

**For Social Level 2 (Apprentice):**
```
Nearby Villagers:
- Oak (friend) - building something
- River (acquaintance) - tending crops

Available Through Relationships:
- building: Oak (could ask for help)
```

**For Social Level 4 (Expert):**
```
Nearby Villagers:
- Oak (close friend, +45 affinity)
  Expert builder, decent gatherer
  You could: ask to build, borrow tools, learn building

- River (friend, +30 affinity)
  Journeyman cook, apprentice farmer
  You could: ask for food help, learn cooking basics

Available Through Relationships:
- building: Oak (can ask them to do it)
- cooking: River (could ask for help)
- farming: River (could ask for help)

Your friend Oak could build a forge if you need metalworking.
```

---

## 7. Entity Visibility by Skill

### 7.1 Entity Type to Skill Mapping

```typescript
const ENTITY_SKILL_VISIBILITY: Record<string, {
  skill: SkillId;
  levels: Record<SkillLevel, string[]>; // What entity types visible at each level
}> = {
  resources: {
    skill: 'gathering',
    levels: {
      0: ['berry_bush', 'fallen_branch', 'loose_stone'],
      1: ['tree', 'rock_deposit', 'fiber_plant'],
      2: ['hidden_berry_patch', 'clay_deposit', 'driftwood'],
      3: ['mushroom_spot', 'quality_wood_tree'],
      4: ['underground_root', 'seasonal_spawn'],
      5: ['resource_regeneration_zone', 'optimal_harvest_spot'],
    }
  },

  plants: {
    skill: 'farming',
    levels: {
      0: ['berry_bush', 'apple_tree'],
      1: ['wheat', 'carrot', 'basic_vegetable'],
      2: ['potato', 'herb_patch'],
      3: ['medicinal_plant', 'flax'],
      4: ['rare_herb', 'exotic_vegetable'],
      5: ['wild_crop_ancestor', 'optimal_planting_zone'],
    }
  },

  buildings: {
    skill: 'building',
    levels: {
      0: ['any'], // Everyone sees buildings
      1: ['any'],
      2: ['construction_site'], // See detailed construction
      3: ['structural_weakness'],
      4: ['infrastructure_gap'],
      5: ['optimal_building_location'],
    }
  },

  food: {
    skill: 'cooking',
    levels: {
      0: ['berry_bush', 'obvious_food'],
      1: ['edible_mushroom', 'herb_patch', 'egg_nest'],
      2: ['wild_onion', 'edible_flower', 'honey_source'],
      3: ['medicinal_root', 'spice_plant'],
      4: ['rare_ingredient', 'fermentation_item'],
      5: ['poison_plant', 'ingredient_synergy'],
    }
  },

  materials: {
    skill: 'crafting',
    levels: {
      0: ['wood', 'stone'],
      1: ['fiber_plant', 'leather_source'],
      2: ['ore_deposit'],
      3: ['rare_material', 'quality_indicator'],
      4: ['enchantable_material', 'alloy_component'],
      5: ['legendary_material'],
    }
  },

  ores: {
    skill: 'building', // Builders spot ore for construction
    levels: {
      0: ['surface_stone'],
      1: ['stone_deposit', 'clay_patch'],
      2: ['iron_ore', 'sand_deposit'],
      3: ['copper_ore', 'tin_deposit', 'quality_stone'],
      4: ['gold_vein', 'gem_deposit'],
      5: ['hidden_vein', 'optimal_quarry'],
    }
  },

  animals: {
    skill: 'animal_handling',
    levels: {
      0: ['large_animal'], // cow, horse (obvious)
      1: ['chicken', 'pig', 'sheep', 'goat'],
      2: ['wild_tameable', 'nest'],
      3: ['animal_mood_indicator'],
      4: ['breeding_compatibility'],
      5: ['rare_creature', 'hidden_den'],
    }
  },

  medical: {
    skill: 'medicine',
    levels: {
      0: [], // Nothing specific
      1: ['aloe', 'obvious_herb'],
      2: ['medicinal_mushroom', 'healing_flower'],
      3: ['rare_remedy', 'antidote_source'],
      4: ['disease_vector', 'contamination_source'],
      5: ['epidemic_pattern', 'preventive_source'],
    }
  },

  terrain: {
    skill: 'exploration',
    levels: {
      0: ['obvious_landmark'],
      1: ['path', 'clearing', 'water_source'],
      2: ['hidden_path', 'shelter_spot', 'danger_zone'],
      3: ['resource_rich_area', 'seasonal_change'],
      4: ['ancient_ruin', 'rare_biome'],
      5: ['secret_location', 'optimal_route'],
    }
  },
};
```

### 7.2 Entity Filtering Function

```typescript
/**
 * Filter visible entities based on skill levels and perception radius.
 */
function filterVisibleEntities(
  entities: Entity[],
  observerPosition: Position,
  skills: Record<SkillId, SkillLevel>
): Entity[] {
  const visible: Entity[] = [];

  for (const entity of entities) {
    const entityPos = entity.getComponent('position');
    if (!entityPos) continue;

    const distance = calculateDistance(observerPosition, entityPos);
    const entityType = getEntityCategory(entity);
    const visibilityConfig = ENTITY_SKILL_VISIBILITY[entityType];

    if (!visibilityConfig) {
      // Unknown entity type - use default visibility
      if (distance <= SKILL_PERCEPTION_RADIUS[0]) {
        visible.push(entity);
      }
      continue;
    }

    const skillLevel = skills[visibilityConfig.skill] ?? 0;
    const perceptionRadius = SKILL_PERCEPTION_RADIUS[skillLevel];

    // Check if within perception radius for this skill
    if (distance > perceptionRadius) {
      continue;
    }

    // Check if this specific entity type is visible at this skill level
    const specificType = getSpecificEntityType(entity);
    const visibleAtLevel = getVisibleTypesAtLevel(visibilityConfig.levels, skillLevel);

    if (visibleAtLevel.includes('any') || visibleAtLevel.includes(specificType)) {
      visible.push(entity);
    }
  }

  return visible;
}

function getVisibleTypesAtLevel(
  levels: Record<SkillLevel, string[]>,
  level: SkillLevel
): string[] {
  // Accumulate all visible types from level 0 up to current level
  const visible: string[] = [];
  for (let l = 0; l <= level; l++) {
    if (levels[l as SkillLevel]) {
      visible.push(...levels[l as SkillLevel]);
    }
  }
  return visible;
}
```

---

## 8. Instruction Generation by Skill Profile

### 8.1 Skill-Appropriate Instruction Generator

```typescript
/**
 * Generate instruction text appropriate for agent's skill profile.
 */
function generateSkillGatedInstruction(
  agent: Entity,
  world: WorldLike,
  skills: Record<SkillId, SkillLevel>
): string {
  const needs = agent.getComponent('needs');
  const inventory = agent.getComponent('inventory');

  // Priority 1: Urgent survival needs (everyone understands these)
  if (needs) {
    if (needs.hunger < 25) {
      return "You're very hungry! Find food immediately.";
    }
    if (needs.energy < 20) {
      return "You're exhausted. You need to rest.";
    }
  }

  // Priority 2: Skill-specific strategic suggestions
  const suggestions: string[] = [];

  // Building suggestions (building skill >= 2)
  if (skills.building >= 2) {
    const gaps = analyzeInfrastructureGaps(world);
    if (gaps.length > 0) {
      suggestions.push(`As a builder, you notice: ${gaps[0]}`);
    }
  }

  // Food suggestions (cooking >= 2 or farming >= 2)
  if (skills.cooking >= 2 || skills.farming >= 2) {
    const foodStatus = analyzeFoodStatus(world);
    if (foodStatus.daysRemaining < 3) {
      const action = skills.cooking >= 2
        ? "Cook what's available to make it last longer"
        : "The crops need attention";
      suggestions.push(`Your food expertise tells you: supplies are getting low. ${action}.`);
    }
  }

  // Gathering suggestions (gathering >= 1)
  if (skills.gathering >= 1) {
    const resourceNeeds = analyzeResourceNeeds(world);
    if (resourceNeeds.needed.length > 0) {
      suggestions.push(`The village could use more ${resourceNeeds.needed[0]}.`);
    }
  }

  // Social suggestions (social >= 2)
  if (skills.social >= 2) {
    const socialState = analyzeSocialState(world, agent);
    if (socialState.uncoordinated) {
      suggestions.push("No one seems to be coordinating. You could help organize efforts.");
    }
    if (socialState.lonelyAgent) {
      suggestions.push(`${socialState.lonelyAgent} looks like they could use company.`);
    }
  }

  // Crafting suggestions (crafting >= 2)
  if (skills.crafting >= 2) {
    const craftingNeeds = analyzeCraftingNeeds(world);
    if (craftingNeeds.toolsNeeded) {
      suggestions.push(`The village needs better tools. You could craft some.`);
    }
  }

  // If we have skill-based suggestions, use them
  if (suggestions.length > 0) {
    return suggestions.join('\n');
  }

  // Default for low-skill agents: focus on basics
  return generateBasicInstruction(needs, inventory);
}

function generateBasicInstruction(
  needs: NeedsComponent | undefined,
  inventory: InventoryComponent | undefined
): string {
  if (needs) {
    if (needs.hunger < 50) return "You're getting hungry. Look for food.";
    if (needs.energy < 50) return "You're tired. Consider resting.";
  }

  if (inventory) {
    const hasItems = inventory.slots.some(s => s.quantity > 0);
    if (hasItems && inventory.currentWeight > inventory.maxWeight * 0.8) {
      return "You're carrying a lot. Maybe store some items.";
    }
  }

  return "Look around and see what needs doing. Maybe follow someone who seems to know what they're doing.";
}
```

---

## 9. Implementation Checklist

When implementing skill-gated prompts in `StructuredPromptBuilder.ts`:

1. **Add skill parameter extraction** at the start of `buildPrompt()`
2. **Replace each section** with its skill-gated version:
   - [ ] Food section (cooking skill)
   - [ ] Building/infrastructure section (building skill)
   - [ ] Resource section (gathering skill)
   - [ ] Nearby agents section (social skill)
   - [ ] Nearby entities section (all relevant skills)
3. **Update action filtering** to use skill requirements
4. **Add relationship affordances** section (social skill >= 2)
5. **Update instruction generation** to be skill-appropriate
6. **Add entity visibility filtering** based on skill + perception radius

### Testing Recommendations

1. Create test agents with each profile from Section 1
2. Generate prompts for identical world states
3. Verify:
   - Unskilled agents see minimal strategic info
   - Skilled agents see domain-specific details
   - Actions are appropriately filtered
   - Entity visibility respects skill + distance
   - Relationship affordances appear for social skill >= 2

---

## 10. Example JSON Response Formats by Skill

### Unskilled Agent Response
```json
{
  "thinking": "I'm not sure what to do. Oak seems to know what they're doing.",
  "action": { "type": "follow", "target": "Oak" }
}
```

### Skilled Builder Response
```json
{
  "thinking": "The workbench needs 8 more wood. I have materials, should help finish it.",
  "speaking": "I'll help finish the workbench!",
  "action": { "type": "help", "target": "workbench_construction" }
}
```

### Skilled Cook Response
```json
{
  "thinking": "Meat will spoil in a day. Should cook it now to preserve nutrition.",
  "speaking": "Let me cook this meat before it goes bad.",
  "action": [
    { "type": "cook", "recipe": "cooked_meat" },
    { "type": "cook", "recipe": "cooked_meat" }
  ]
}
```

### Social Specialist Response
```json
{
  "thinking": "Pine seems lost. River looks tired. I should help coordinate.",
  "speaking": "Pine, come with me - I'll show you around. River, take a break!",
  "action": { "type": "suggest_task", "target": "Pine", "task": "follow me" }
}
```

### Master Craftsman Response
```json
{
  "thinking": "Iron ore quality is good. Village needs tools. I'll smelt and forge.",
  "speaking": "Time to make some proper tools for everyone.",
  "action": [
    { "type": "smelt", "material": "iron_ore" },
    { "type": "craft", "recipe": "iron_axe" },
    { "type": "craft", "recipe": "iron_pickaxe" }
  ]
}
```
