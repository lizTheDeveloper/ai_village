# Progressive Skill Reveal Specification

## Overview

This spec extends the existing skill system to implement **skill-gated prompt context** - agents only receive strategic information, action suggestions, and village analytics relevant to their skill levels. This creates natural role differentiation where builders think about construction, cooks think about food, and unskilled agents focus on basic survival.

## Core Principle: You Don't Know What You Don't Know

An agent with no cooking skill doesn't think "the village has 2.3 days of food remaining." They think "there's some food in storage." The strategic framing, analytics, and urgency signals are all gated by skill level.

## Core Principle: Entity Visibility is Skill-Gated

Beyond information depth, **which entities an agent can even perceive** is skill-dependent:
- Everyone sees berry bushes (common knowledge)
- Only agents with cooking/farming skill recognize medicinal herbs
- Only agents with building skill see ore deposits as meaningful
- Only agents with high cooking skill know about exotic ingredients

## Core Principle: Actions Abstract Away Infrastructure

**Agents don't need to know about crafting stations to craft.** They see their available recipes based on skill, and if they choose to craft something, the behavior system handles:
- Finding the appropriate workstation
- Gathering required materials
- Traveling to the station
- Performing the craft

This means:
- Cooking skill unlocks *recipes*, not awareness of ovens
- Building skill unlocks *blueprints*, not knowledge of workbenches
- The LLM prompt shows "You can craft: bread, dried_meat" not "You need an oven to cook"

Village infrastructure (buildings, storage, stations) is always implicitly available to agents who have the skill to use them. The prompt focuses on **what they can do**, not **how the game mechanics work**.

## Core Principle: Skill Extends Perception Radius

Higher skill levels extend how far an agent can "sense" skill-relevant entities:

| Skill Level | Perception Radius for Relevant Entities |
|-------------|----------------------------------------|
| 0 | Adjacent only (~5 tiles) |
| 1 | Nearby (~15 tiles) |
| 2 | Local area (~30 tiles) |
| 3 | Extended area (~50 tiles) |
| 4 | Region-wide (~100 tiles) |
| 5 | Map-wide (knows about rare things across the world) |

**Examples:**
- A Level 0 gatherer only notices berry bushes they walk past
- A Level 3 gatherer remembers "there's a good stone deposit 40 tiles northwest"
- A Level 5 cook knows "there's a rare herb patch on the far side of the forest"
- A Level 2 builder notices the partially-built cabin across the village
- A Level 5 explorer has mental awareness of the entire mapped area

This is implemented by filtering the `nearby_entities` list based on skill level before presenting it to the LLM.

## 1. Random Starting Skills

### Problem
Currently all agents start with level 0 in all skills, leading to homogeneous behavior where everyone tries to do everything.

### Solution
Generate 1-3 starting skills at level 1-2 based on personality affinities.

```typescript
// In SkillsComponent.ts
export function generateRandomStartingSkills(
  personality: PersonalityComponent
): SkillsComponent {
  const affinities = createSkillsComponentFromPersonality(personality).affinities;

  // Sort skills by affinity (natural talent)
  const sortedSkills = Object.entries(affinities)
    .sort(([, a], [, b]) => b - a);

  // Top 1-3 skills start with some level
  const numStartingSkills = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3

  const levels = createDefaultLevels(); // All zeros

  for (let i = 0; i < numStartingSkills; i++) {
    const [skillId] = sortedSkills[i];
    // High affinity (>1.5) = level 2, otherwise level 1
    levels[skillId as SkillId] = affinities[skillId as SkillId] > 1.5 ? 2 : 1;
  }

  return {
    type: 'skills',
    levels,
    experience: createDefaultExperience(),
    totalExperience: createDefaultExperience(),
    affinities,
    taskFamiliarity: {},
    synergiesActive: [],
  };
}
```

### Agent Creation Update
```typescript
// In AgentEntity.ts
// Replace:
entity.addComponent(createSkillsComponent());

// With:
const personality = entity.getComponent('personality');
entity.addComponent(generateRandomStartingSkills(personality));
```

---

## 2. Comprehensive Skill-by-Skill Breakdown

This section details EXACTLY what each skill level reveals for all 10 skills.

---

### 2.1 BUILDING Skill

**Entities Visible:**
| Level | Entities Shown |
|-------|----------------|
| 0 | Trees (for wood), rock piles |
| 1 | Stone deposits, clay patches |
| 2 | Iron ore deposits, sand deposits |
| 3 | Copper/tin deposits, quality stone |
| 4 | Rare ore veins (gold, gems) |
| 5 | Hidden structural weaknesses, optimal quarry locations |

**Buildings Available:**
| Level | Buildings |
|-------|-----------|
| 0 | lean-to, campfire, storage-chest, storage-box |
| 1 | workbench, tent, bedroll, well, garden_fence |
| 2 | bed, forge, farm_shed, market_stall, windmill, town_hall |
| 3 | workshop, barn, library, loom, oven, granary |
| 4 | warehouse, monument, trading_post, health_clinic |
| 5 | grand_hall, arcane_tower, inventors_hall, archive |

**Information Shown:**
| Level | Village Building Info |
|-------|----------------------|
| 0 | "There are some structures nearby" |
| 1 | List of building names: "campfire, lean-to, storage-chest" |
| 2 | Building purposes + construction status: "wooden-cabin (60% complete)" |
| 3 | Material requirements: "wooden-cabin needs 4 more logs to finish" |
| 4 | Infrastructure gaps + optimization: "Village needs a well near the farms" |
| 5 | Village-wide planning: "Place granary between fields and market for efficiency" |

**Time/Difficulty Estimates (Experience-Based):**

Time estimates are LEARNED, not innate. An agent only knows how long something takes AFTER they've built it at least once. The prompt shows their last build time for that structure.

| Level | What They Know About Build Time |
|-------|--------------------------------|
| 0 | Nothing - no concept of how long things take |
| 1 | For structures built before: "last time this took [X]" |
| 2 | Same, plus vague sense of relative difficulty for new structures |
| 3 | Same, plus can estimate similar structures: "probably like building a lean-to" |
| 4 | Same, plus can estimate efficiency: "I'm getting faster at this" |
| 5 | Full time awareness including multi-builder coordination |

**Implementation Note:** Track `lastBuildTime` per building type in agent's task familiarity. Only show time estimates for buildings the agent has completed at least once. New building types show no time estimate.

**IMPORTANT: Building is a solo activity by default.** Simple structures like workbenches, lean-tos, and campfires do NOT require collaboration. Agents should NOT believe they need help for basic builds. Only large/complex structures (town-hall, fortress) might benefit from multiple builders, and even then it's optional for efficiency, not required.

**Collaboration Knowledge (Skill-Gated):**
| Level | What They Know About Collaboration |
|-------|-----------------------------------|
| 0-1 | Nothing - doesn't think about whether help is needed |
| 2 | Knows they can build alone; doesn't think about getting help |
| 3 | Understands that help speeds up large projects but isn't required |
| 4 | Can estimate: "with Oak's help, we'd finish in half the time" |
| 5 | Can coordinate multi-builder projects efficiently |

**Strategic Suggestions:**
| Level | Suggestion Type |
|-------|-----------------|
| 0 | None (doesn't think about building) |
| 1 | "You could make a simple shelter" |
| 2 | "The village needs more storage" |
| 3 | "A forge would enable metalworking" |
| 4 | "Infrastructure bottleneck: no water source near farms" |
| 5 | "Optimal build order: well → granary → workshop → forge" |

---

### 2.2 FARMING Skill

**Entities Visible:**
| Level | Plants/Entities Shown |
|-------|----------------------|
| 0 | Berry bushes, apple trees (obvious food) |
| 1 | Wheat stalks, carrot plants, basic vegetables |
| 2 | Potato plants, herb patches (mint, basil) |
| 3 | Medicinal plants (chamomile, echinacea), flax |
| 4 | Rare herbs, exotic vegetables, soil quality indicators |
| 5 | Wild crop ancestors, optimal planting zones, pest nests |

**Soil/Plot Information:**
| Level | What They Perceive About Farmland |
|-------|----------------------------------|
| 0 | "There's dirt here" |
| 1 | "This soil could be tilled" |
| 2 | "The soil looks [dry/moist/waterlogged]" |
| 3 | "Soil nutrients: [low/medium/high], pH: [acidic/neutral]" |
| 4 | "This plot yields +20% for root vegetables" |
| 5 | "Crop rotation needed: plant legumes to restore nitrogen" |

**Crop Status Information:**
| Level | What They Know About Growing Crops |
|-------|-----------------------------------|
| 0 | "Plants are growing" |
| 1 | "Wheat is [seedling/growing/mature]" |
| 2 | "Carrots will be ready in ~2 days" |
| 3 | "Crop health: 80%, hydration optimal, expect 12 carrots" |
| 4 | "Yield forecast: 15 carrots (quality: good), pest risk: low" |
| 5 | "This strain shows drought resistance; save seeds for breeding" |

**Actions Available:**
| Level | Farming Actions |
|-------|-----------------|
| 0 | gather (berries only) |
| 1 | till, plant (basic seeds), harvest |
| 2 | water, fertilize |
| 3 | weed, pest_control |
| 4 | selective_harvest, save_seeds |
| 5 | crossbreed, soil_amendment |

---

### 2.3 GATHERING Skill

**Entities Visible:**
| Level | Resources Shown |
|-------|-----------------|
| 0 | Berry bushes, fallen branches, loose stones |
| 1 | Trees (choppable), rock deposits, fiber plants |
| 2 | Hidden berry patches, clay deposits, driftwood |
| 3 | Mushroom spots, rare fiber sources, quality wood trees |
| 4 | Underground roots, seasonal spawns, animal trails to resources |
| 5 | Resource regeneration patterns, optimal harvest timing |

**Resource Information:**
| Level | What They Know |
|-------|----------------|
| 0 | "There are berries on that bush" |
| 1 | "That tree has ~20 wood" |
| 2 | "The berry bush has 8 berries, will regrow in 2 days" |
| 3 | "Stone deposit: 45 stone, quality: good, tool needed: pickaxe" |
| 4 | "This area regenerates resources every 3 days" |
| 5 | "Sustainable harvest: take 60% now, full regeneration in 1 day" |

**Village Resource Info:**
| Level | Storage/Resource Knowledge |
|-------|---------------------------|
| 0 | "There are things in storage" |
| 1 | "Storage has wood, stone, berries" |
| 2 | "Storage: 45 wood, 23 stone, 15 berries" |
| 3 | "Resource consumption: ~8 wood/day for fires" |
| 4 | "Wood stockpile: 45 (5.6 days at current rate)" |
| 5 | "Resource forecast: wood shortage in 3 days unless 2 agents gather" |

---

### 2.4 COOKING Skill

**Entities Visible:**
| Level | Food Sources Shown |
|-------|-------------------|
| 0 | Berry bushes, obvious food in storage |
| 1 | Edible mushrooms, herb patches, egg nests |
| 2 | Wild onions, edible flowers, honey sources |
| 3 | Medicinal roots, spice plants, quality meat indicators |
| 4 | Rare ingredients (truffles, saffron), fermentation-ready items |
| 5 | Poison plants (to avoid), ingredient synergies in the wild |

**Food Information:**
| Level | What They Know About Food |
|-------|---------------------------|
| 0 | "There's food stored" or "There's no food" |
| 1 | "Storage has 15 berries, 8 meat" |
| 2 | "Village consumes ~10 food/day" |
| 3 | "2.3 days of food remaining at current consumption" |
| 4 | "Cooked meals last 3x longer; prioritize cooking raw meat" |
| 5 | "Menu plan: cook meat today, preserve berries, ration through cold snap" |

**Recipes Known:**
| Level | Available Recipes |
|-------|------------------|
| 0 | None (can only eat raw food) |
| 1 | cooked_meat, berry_mash |
| 2 | bread, dried_meat, simple_stew |
| 3 | meat_pie, vegetable_soup, preserved_food |
| 4 | feast_dishes, healing_foods, luxury_meals |
| 5 | experimental_recipes, food_as_medicine, teaching_recipes |

**Buildings Visible:**
| Level | Cooking/Food Buildings |
|-------|------------------------|
| 0 | None specifically |
| 1 | campfire (for cooking) |
| 2 | oven, smokehouse |
| 3 | kitchen, bakery, brewery |
| 4 | restaurant, feast_hall |
| 5 | culinary_academy |

---

### 2.5 CRAFTING Skill

**Entities/Items Visible:**
| Level | Craftable Materials Shown |
|-------|--------------------------|
| 0 | Basic materials (wood, stone) |
| 1 | Fiber plants, leather sources |
| 2 | Ore deposits (after processing knowledge) |
| 3 | Rare materials, component quality indicators |
| 4 | Enchantable materials, alloy possibilities |
| 5 | Legendary material sources, artifact components |

**Recipe Knowledge:**
| Level | Known Recipes |
|-------|---------------|
| 0 | None |
| 1 | axe, pickaxe, hoe, simple_tools |
| 2 | rope, cloth, plank, fishing_rod |
| 3 | iron_tools, leather_armor, furniture |
| 4 | steel_items, fine_clothing, machinery |
| 5 | mithril_items, enchanted_gear, master_crafts |

**Buildings Visible:**
| Level | Crafting Buildings |
|-------|-------------------|
| 0 | None specifically |
| 1 | workbench |
| 2 | forge, loom |
| 3 | workshop, alchemy_lab |
| 4 | armory, jeweler_bench |
| 5 | master_workshop, enchanting_table location |

**Quality Understanding:**
| Level | What They Know About Quality |
|-------|------------------------------|
| 0 | Items are items |
| 1 | "This axe looks sturdy" |
| 2 | "Quality: common/uncommon/rare" |
| 3 | "This iron is 85% pure, will make good tools" |
| 4 | "Master-quality materials will yield legendary items" |
| 5 | "Combine these three materials for synergy bonus" |

**Time/Difficulty Estimates (Experience-Based):**

Time estimates are LEARNED, not innate. An agent only knows how long something takes AFTER they've done it at least once. The prompt shows their last crafting time for that item.

| Level | What They Know About Craft Time |
|-------|--------------------------------|
| 0 | Nothing |
| 1 | For items crafted before: "last time this took [X]" |
| 2 | Same, plus vague sense of relative difficulty for new items |
| 3 | Same, plus can estimate similar items: "probably like making an axe" |
| 4 | Same, plus can estimate efficiency: "I'm getting faster at this" |
| 5 | Full time awareness including batch planning and teaching time |

**Implementation Note:** Track `lastCraftTime` per recipe in agent's task familiarity. Only show time estimates for recipes the agent has completed at least once. New recipes show no time estimate.

**IMPORTANT: Crafting is a solo activity.** Agents do NOT need collaboration to craft items. The crafting system handles finding the appropriate workstation automatically. Agents should focus on WHAT they can craft, not on needing help or specific stations.

---

### 2.6 SOCIAL Skill

**Entities Visible:**
| Level | Social Information |
|-------|-------------------|
| 0 | Other agents exist |
| 1 | Agent names, basic mood (happy/sad/neutral) |
| 2 | Relationship status (friend/stranger/rival) |
| 3 | Agent skills, needs, current activity |
| 4 | Social network, influence patterns, group dynamics |
| 5 | Hidden tensions, optimal mediation strategies |

**Relationship Information:**
| Level | What They Perceive |
|-------|-------------------|
| 0 | "Other villagers are around" |
| 1 | "Oak is nearby. You've talked before." |
| 2 | "Oak is a friend (+30 relationship). River seems upset." |
| 3 | "Oak: friend, builder, currently gathering. Needs: hungry." |
| 4 | "Oak influences Pine and Wren. Conflicts with River over..." |
| 5 | "Village morale: 72%. Key influencers: Oak, Ada. Tension source: food scarcity." |

**Actions Available:**
| Level | Social Actions |
|-------|----------------|
| 0 | talk (basic greeting) |
| 1 | compliment, ask_question |
| 2 | share_food, offer_help, gossip |
| 3 | negotiate, persuade, comfort |
| 4 | mediate, inspire, lead_group |
| 5 | orate, establish_tradition, resolve_conflict |

---

### 2.7 EXPLORATION Skill

**Entities Visible:**
| Level | What They Notice |
|-------|------------------|
| 0 | Obvious landmarks (big trees, rivers) |
| 1 | Paths, clearings, water sources |
| 2 | Hidden paths, shelter spots, danger zones |
| 3 | Resource-rich areas, seasonal changes |
| 4 | Ancient ruins, rare biomes, migration patterns |
| 5 | Secret locations, optimal routes, weather patterns |

**Map Knowledge:**
| Level | Spatial Awareness |
|-------|------------------|
| 0 | "You're in a forest" |
| 1 | "North: more trees. East: a river." |
| 2 | "The berry grove is 50m northwest" |
| 3 | "Mental map: village center, north forest, east river, south plains" |
| 4 | "Efficient patrol route: village → forest → river → back (45 min)" |
| 5 | "Unexplored zone detected 200m west. Probability of resources: high." |

**Danger Awareness:**
| Level | Threat Detection |
|-------|-----------------|
| 0 | Obvious dangers only (fire, cliff) |
| 1 | Predator sounds, storm clouds |
| 2 | Animal tracks, weather changes |
| 3 | Predator territories, flood risks |
| 4 | Seasonal threat patterns, escape routes |
| 5 | Early warning signs, optimal shelter timing |

---

### 2.8 COMBAT Skill

**Entities Visible:**
| Level | Combat-Relevant Info |
|-------|---------------------|
| 0 | Large predators (wolves, bears) |
| 1 | Smaller threats (snakes, boars) |
| 2 | Threat assessment (weak/strong) |
| 3 | Attack patterns, weak points |
| 4 | Hidden ambush spots, defensive positions |
| 5 | Enemy tactics, optimal engagement strategies |

**Threat Information:**
| Level | What They Perceive |
|-------|-------------------|
| 0 | "There's a wolf!" |
| 1 | "Wolf spotted. It looks aggressive." |
| 2 | "Wolf: medium threat. We could fight or flee." |
| 3 | "Wolf pack (3): high threat. Attack from north. Weakness: loud noises." |
| 4 | "Engagement plan: one distracts, two flank. Retreat point: village wall." |
| 5 | "Wolf behavior indicates hunger. Offering food may avoid combat." |

**Weapons/Armor Knowledge:**
| Level | Equipment Awareness |
|-------|-------------------|
| 0 | "Sticks can be weapons" |
| 1 | Knows about axes, basic weapons |
| 2 | Weapon effectiveness ratings |
| 3 | Armor ratings, damage calculations |
| 4 | Optimal loadouts, weapon synergies |
| 5 | Combat style mastery, teaching ability |

---

### 2.9 ANIMAL_HANDLING Skill

**Entities Visible:**
| Level | Animals Shown |
|-------|---------------|
| 0 | Large obvious animals (cows, horses) |
| 1 | Chickens, pigs, sheep, goats |
| 2 | Wild tameable animals, nests |
| 3 | Animal mood/health indicators |
| 4 | Breeding compatibility, genetic traits |
| 5 | Rare/legendary creatures, hidden dens |

**Animal Information:**
| Level | What They Perceive |
|-------|-------------------|
| 0 | "There's a chicken" |
| 1 | "Chicken. Can be caught for eggs." |
| 2 | "Chicken: hungry, produces eggs daily, prefers grain" |
| 3 | "Chicken health: 90%, mood: content, egg output: 1.2/day" |
| 4 | "This chicken has high egg-yield genetics. Breed with rooster B." |
| 5 | "Chicken lineage optimization: 3 generations to double yield" |

**Actions Available:**
| Level | Animal Actions |
|-------|----------------|
| 0 | observe |
| 1 | feed_animal, collect_eggs |
| 2 | tame (small animals), pen_animal |
| 3 | tame (medium animals), breed |
| 4 | tame (large animals), selective_breed |
| 5 | tame (rare animals), train_for_work |

---

### 2.10 MEDICINE Skill

**Entities Visible:**
| Level | Medical Resources |
|-------|------------------|
| 0 | None specifically |
| 1 | Aloe plants, obvious herbs |
| 2 | Medicinal mushrooms, healing flowers |
| 3 | Rare remedies, poison antidote sources |
| 4 | Disease vectors, contamination sources |
| 5 | Epidemic patterns, preventive medicine sources |

**Health Information:**
| Level | What They Perceive |
|-------|-------------------|
| 0 | "Someone looks sick" |
| 1 | "Oak is injured" |
| 2 | "Oak has a wound on their arm" |
| 3 | "Oak: infected wound, needs cleaning and bandage" |
| 4 | "Oak's infection is spreading. Needs honey poultice + bed rest." |
| 5 | "Village health trends: 3 cases of fever this week. Likely water source." |

**Remedies Known:**
| Level | Available Treatments |
|-------|---------------------|
| 0 | None |
| 1 | rest, basic_wound_care |
| 2 | herbal_tea, bandage |
| 3 | poultice, fever_reducer, pain_reliever |
| 4 | antidote, surgery_prep, disease_isolation |
| 5 | epidemic_prevention, experimental_treatment, medical_research |

**Village Health Info:**
| Level | Population Health Knowledge |
|-------|----------------------------|
| 0 | Nothing |
| 1 | "Some villagers seem unwell" |
| 2 | "2 villagers are sick" |
| 3 | "2 sick (Oak: infection, River: exhaustion). Average health: 85%." |
| 4 | "Health trend: declining. Cause: poor nutrition. Fix: varied diet." |
| 5 | "Preventive measures needed: clean water, rest schedules, vitamin foods" |

---

## 3. Cross-Skill Entity Visibility

Some entities require multiple skills to fully understand:

| Entity | Skill 1 | Skill 2 | Combined Knowledge |
|--------|---------|---------|-------------------|
| Medicinal herb | farming (2) | medicine (1) | "This chamomile can treat fevers" |
| Ore deposit | gathering (2) | building (2) | "Iron ore, yields ~30 ingots" |
| Cooking ingredient | gathering (1) | cooking (2) | "Wild garlic, great for stews" |
| Animal tracks | exploration (2) | animal_handling (1) | "Deer path, leads to watering hole" |
| Ruined building | exploration (3) | building (2) | "Salvageable stone, collapsed roof" |

---

## 4. Implementation Details

### 4.1 StructuredPromptBuilder Changes

```typescript
interface SkillGatedSection {
  skillId: SkillId;
  levelThresholds: {
    0: string | null;  // What untrained agents see
    1: string | null;  // What novices see
    2: string | null;  // What apprentices see
    3: string | null;  // What journeymen see
    4: string | null;  // What experts see
    5: string | null;  // What masters see
  };
}

function buildFoodSection(
  storage: StorageData,
  population: number,
  cookingSkill: SkillLevel
): string {
  const totalFood = storage.getFoodCount();
  const consumptionRate = population * 2; // 2 food per agent per day
  const daysRemaining = totalFood / consumptionRate;

  switch (cookingSkill) {
    case 0:
      // Untrained: No food analytics
      return totalFood > 0
        ? "There is food in village storage."
        : "You don't see any food stored.";

    case 1:
      // Novice: Raw counts only
      return `Food in storage: ${totalFood} items`;

    case 2:
      // Apprentice: Categorized + rough consumption
      return `Food inventory: ${formatFoodByType(storage)}
The village consumes food daily.`;

    case 3:
      // Journeyman: Full analytics
      return `Food inventory: ${formatFoodByType(storage)}
Daily consumption: ~${consumptionRate} food
Days remaining: ${daysRemaining.toFixed(1)}`;

    case 4:
      // Expert: Analytics + suggestions
      return `Food inventory: ${formatFoodByType(storage)}
Daily consumption: ~${consumptionRate} food
Days remaining: ${daysRemaining.toFixed(1)}
${daysRemaining < 3 ? "CRITICAL: Food shortage imminent. Prioritize gathering or farming." : ""}`;

    case 5:
      // Master: Full strategic view
      return `[FOOD STRATEGIC OVERVIEW]
Current stock: ${formatFoodByType(storage)}
Burn rate: ${consumptionRate}/day (${daysRemaining.toFixed(1)} days)
Spoilage risk: ${calculateSpoilageRisk(storage)}
Recommendation: ${generateFoodStrategy(storage, daysRemaining)}`;
  }
}
```

### Building Knowledge Gradient

| Skill Level | Information Type | Example |
|-------------|------------------|---------|
| 0 (Untrained) | Can see buildings exist | "There are some buildings in the village" |
| 1 (Novice) | Basic building list | "Village has: campfire, lean-to, storage chest" |
| 2 (Apprentice) | Building purposes | "The workbench allows crafting tools" |
| 3 (Journeyman) | Construction progress | "Cabin is 60% complete, needs 4 more logs" |
| 4 (Expert) | Village infrastructure gaps | "Village needs a well for water access" |
| 5 (Master) | Optimal placement + planning | "Build the granary near farms for efficiency" |

---

## 5. Skill-Gated Action Availability

### Universal Actions (No Skill Required)
These actions are available to ALL agents regardless of skill:

```typescript
const UNIVERSAL_ACTIONS: ActionId[] = [
  'wander',
  'idle',
  'rest',
  'sleep',
  'eat',
  'drink',
  'talk',
  'follow',
  'gather',  // Basic resource gathering
];
```

### Skill-Gated Actions

```typescript
interface ActionSkillRequirement {
  actionId: ActionId;
  skillId: SkillId;
  minLevel: SkillLevel;
  description: string;
}

const SKILL_GATED_ACTIONS: ActionSkillRequirement[] = [
  // Building actions
  { actionId: 'build', skillId: 'building', minLevel: 0, description: 'Build basic structures' },
  { actionId: 'plan_building', skillId: 'building', minLevel: 2, description: 'Plan complex structures' },

  // Farming actions
  { actionId: 'plant', skillId: 'farming', minLevel: 1, description: 'Plant seeds' },
  { actionId: 'till', skillId: 'farming', minLevel: 1, description: 'Prepare soil' },
  { actionId: 'harvest', skillId: 'farming', minLevel: 0, description: 'Harvest crops' },

  // Crafting actions
  { actionId: 'craft', skillId: 'crafting', minLevel: 1, description: 'Craft items' },

  // Cooking actions
  { actionId: 'cook', skillId: 'cooking', minLevel: 1, description: 'Prepare meals' },

  // Animal handling
  { actionId: 'tame', skillId: 'animal_handling', minLevel: 2, description: 'Tame wild animals' },
  { actionId: 'feed_animal', skillId: 'animal_handling', minLevel: 1, description: 'Feed animals' },

  // Medicine
  { actionId: 'heal', skillId: 'medicine', minLevel: 2, description: 'Heal injuries' },
];
```

### Action Filtering in PromptBuilder

```typescript
function getAvailableActions(
  agent: Entity,
  context: WorldContext
): ActionDefinition[] {
  const skills = agent.getComponent('skills');

  return ALL_ACTIONS.filter(action => {
    // Universal actions always available
    if (UNIVERSAL_ACTIONS.includes(action.id)) return true;

    // Check skill requirement
    const requirement = SKILL_GATED_ACTIONS.find(r => r.actionId === action.id);
    if (!requirement) return true; // No requirement = available

    const agentLevel = skills?.levels[requirement.skillId] ?? 0;
    return agentLevel >= requirement.minLevel;
  });
}
```

---

## 6. Tiered Building System

### Basic Buildings (No Skill Required)
Any agent can attempt these with level 0 building skill:

| Building | Materials | Purpose |
|----------|-----------|---------|
| `lean-to` | 5 wood, 10 leaves | Basic shelter |
| `campfire` | 8 stone, 4 wood | Warmth, cooking |
| `storage-chest` | 8 wood | Item storage |
| `workbench` | 12 wood, 4 stone | Basic crafting |

### Apprentice Buildings (Level 1+)

| Building | Materials | Purpose |
|----------|-----------|---------|
| `wooden-cabin` | 30 wood, 10 stone | Better shelter |
| `well` | 20 stone, 5 wood | Water source |
| `farm-plot` | 5 wood | Farming |

### Journeyman Buildings (Level 2+)

| Building | Materials | Purpose |
|----------|-----------|---------|
| `granary` | 25 wood, 15 stone | Large food storage |
| `workshop` | 30 wood, 20 stone | Advanced crafting |
| `animal-pen` | 20 wood, 10 rope | Animal housing |

### Expert Buildings (Level 3+)

| Building | Materials | Purpose |
|----------|-----------|---------|
| `stone-house` | 50 stone, 20 wood | Durable shelter |
| `smithy` | 30 stone, 20 iron | Metalworking |
| `barn` | 50 wood, 30 stone | Large animal housing |

### Master Buildings (Level 4+)

| Building | Materials | Purpose |
|----------|-----------|---------|
| `town-hall` | 100 stone, 50 wood | Governance |
| `temple` | 80 stone, 40 wood | Spiritual center |
| `fortress` | 200 stone, 100 wood | Defense |

### Blueprint Registry Update

```typescript
// In BuildingBlueprintRegistry.ts
interface BuildingBlueprint {
  // ... existing fields

  // NEW: Skill requirement to build
  skillRequired?: {
    skill: SkillId;
    level: SkillLevel;
  };
}

// Example registrations
registry.register({
  type: 'lean-to',
  // ... materials, etc
  skillRequired: undefined, // Anyone can build
});

registry.register({
  type: 'wooden-cabin',
  // ... materials, etc
  skillRequired: { skill: 'building', level: 1 },
});

registry.register({
  type: 'smithy',
  // ... materials, etc
  skillRequired: { skill: 'building', level: 3 },
});
```

---

## 7. Skill-Gated Strategic Suggestions

### Current Problem
All agents receive the same strategic advice:
> "The village needs more storage. Consider building a storage-chest."

### Solution
Only agents with relevant skills receive strategic suggestions in their domain.

```typescript
function generateStrategicInstruction(
  agent: Entity,
  villageState: VillageState
): string {
  const skills = agent.getComponent('skills');
  const instructions: string[] = [];

  // Building suggestions - only for builders
  if (skills.levels.building >= 2) {
    const buildingGaps = analyzeInfrastructureGaps(villageState);
    if (buildingGaps.length > 0) {
      instructions.push(`As a skilled builder, you notice: ${buildingGaps[0]}`);
    }
  }

  // Food suggestions - only for cooks/farmers
  if (skills.levels.cooking >= 2 || skills.levels.farming >= 2) {
    const foodStatus = analyzeFoodStatus(villageState);
    if (foodStatus.daysRemaining < 3) {
      instructions.push(`Your food expertise tells you: supplies are critically low.`);
    }
  }

  // Gathering suggestions - for gatherers
  if (skills.levels.gathering >= 1) {
    const resources = analyzeResourceNeeds(villageState);
    if (resources.needed.length > 0) {
      instructions.push(`The village could use more ${resources.needed[0]}.`);
    }
  }

  // Default for unskilled: focus on immediate needs
  if (instructions.length === 0) {
    instructions.push(generateBasicSurvivalInstruction(agent));
  }

  return instructions.join('\n');
}

function generateBasicSurvivalInstruction(agent: Entity): string {
  const needs = agent.getComponent('needs');

  if (needs.hunger > 70) return "You feel hungry. Find something to eat.";
  if (needs.energy < 30) return "You are tired. Consider resting.";
  if (needs.cold > 60) return "You feel cold. Seek warmth.";

  return "Look around and see what needs doing.";
}
```

---

## 8. Emergent Role Specialization

With random starting skills and skill-gated prompts, agents will naturally specialize:

```
AGENT: Oak
Starting Skills: building (2), gathering (1)
Prompt Focus: Building infrastructure, construction progress, material needs
Likely Behavior: Constructs buildings, gathers wood/stone

AGENT: River
Starting Skills: cooking (2), farming (1)
Prompt Focus: Food inventory, crop status, meal preparation
Likely Behavior: Farms, cooks, manages food supply

AGENT: Wren
Starting Skills: social (2), exploration (1)
Prompt Focus: Relationship status, conversation opportunities, new areas
Likely Behavior: Talks to others, explores, builds relationships

AGENT: Pine
Starting Skills: gathering (1)
Prompt Focus: Basic resources, immediate needs
Likely Behavior: Gathers resources, helps with basic tasks
```

---

## 9. Preventing Duplicate Efforts

### Current Problem
Multiple agents all receive "village needs storage" and all start building storage chests.

### Solution: Skill-Based Task Awareness

Only skilled agents see village-wide task status:

```typescript
function buildTaskAwarenessSection(
  agent: Entity,
  inProgressBuildings: Building[],
  plannedBuildings: Building[]
): string | null {
  const buildingSkill = agent.getComponent('skills')?.levels.building ?? 0;

  // Untrained agents don't track village-wide construction
  if (buildingSkill < 2) return null;

  // Apprentice+ builders see what's in progress
  const inProgress = inProgressBuildings.map(b => b.type).join(', ');
  const planned = plannedBuildings.map(b => b.type).join(', ');

  let section = '';
  if (inProgress) section += `Currently being built: ${inProgress}\n`;
  if (planned) section += `Planned: ${planned}\n`;
  if (section) section += `(No need to duplicate these efforts)`;

  return section || null;
}
```

---

## 10. Implementation Phases

### Phase 1: Random Starting Skills (Foundation)
- [ ] Add `generateRandomStartingSkills()` to SkillsComponent.ts
- [ ] Update AgentEntity.ts to use personality-based skill generation
- [ ] Test: Verify agents spawn with varied skill distributions

### Phase 2: Skill-Gated Information (Prompt Context)
- [ ] Implement `buildFoodSection()` with cooking skill gradients
- [ ] Implement `buildBuildingSection()` with building skill gradients
- [ ] Implement `buildResourceSection()` with gathering skill gradients
- [ ] Update StructuredPromptBuilder to use skill-gated sections
- [ ] Test: Verify low-skill agents see less strategic information

### Phase 3: Skill-Gated Actions (Action Filtering)
- [ ] Add `skillRequired` field to ActionDefinition interface
- [ ] Define skill requirements for all non-universal actions
- [ ] Update `getAvailableActions()` to filter by skill
- [ ] Test: Verify unskilled agents don't see "build smithy" options

### Phase 4: Tiered Buildings (Building Requirements)
- [ ] Add `skillRequired` field to BuildingBlueprint interface
- [ ] Categorize all buildings by skill tier
- [ ] Update building affordance section to filter by skill
- [ ] Add skill requirement display in UI
- [ ] Test: Verify only skilled builders see complex buildings

### Phase 5: Strategic Suggestions (Instruction Generation)
- [ ] Implement `generateStrategicInstruction()` with skill checks
- [ ] Remove village-wide strategic advice for unskilled agents
- [ ] Add skill-appropriate suggestions for each domain
- [ ] Test: Verify agents receive role-appropriate guidance

### Phase 6: Task Coordination (Duplicate Prevention)
- [ ] Implement `buildTaskAwarenessSection()` with skill gating
- [ ] Only show "in progress" buildings to skilled builders
- [ ] Test: Verify reduced duplicate building attempts

---

## 11. Agents as Affordances

Just like buildings provide capabilities ("the forge lets you smelt iron"), **skilled agents are affordances** that other agents can perceive and utilize.

### Skill Visibility in Relationships

When an agent perceives another agent, their skill information is included based on the observer's social skill:

| Observer Social Skill | What They Know About Others' Skills |
|----------------------|-------------------------------------|
| 0 | Nothing about skills |
| 1 | "Oak seems handy with tools" (vague impressions) |
| 2 | "Oak is good at building" (primary skill identified) |
| 3 | "Oak: skilled builder (level 3), decent gatherer" (skill levels) |
| 4 | "Oak: expert builder, teaches construction" (expertise + capabilities) |
| 5 | "Oak: master builder, could design the town hall" (strategic value) |

### Agent Affordances in Prompts

Skilled agents appear in the prompt as resources, similar to buildings:

```
VILLAGE RESOURCES:
- Campfire (cooking, warmth)
- Storage Chest (20 slots)
- Oak (skilled builder - can construct complex buildings)
- River (skilled cook - can prepare preserved food)
```

### Delegation Actions

High social skill unlocks delegation:

| Social Skill | Delegation Actions |
|--------------|-------------------|
| 0-1 | None |
| 2 | `ask_for_help` - Request assistance with current task |
| 3 | `suggest_task` - Recommend an agent do something they're skilled at |
| 4 | `delegate` - Assign a task to a skilled agent |
| 5 | `coordinate_team` - Organize multiple agents for complex projects |

### Relationships Unlock Affordances

The **relationship level** determines what affordances you can access through another agent:

| Relationship | Affordances Unlocked |
|--------------|---------------------|
| Stranger | None - can only observe |
| Acquaintance | Can ask questions, learn their primary skill |
| Friend | Can request help, borrow tools, share recipes |
| Close Friend | Can delegate tasks, teach/learn from each other |
| Family/Partner | Share skill bonuses, automatic cooperation |

**Example: Accessing a Forge through Friendship**

If you don't have crafting skill to use a forge, but your friend Oak does:
- As a **stranger** to Oak: "There's a forge, but you don't know how to use it"
- As an **acquaintance**: "Oak knows how to use the forge"
- As a **friend**: "You could ask Oak to smelt ore for you"
- As a **close friend**: "Oak would help you at the forge (shared crafting access)"

This means **social investment is a path to capability** - an agent with high social skill but low crafting skill can still get things crafted through their relationships.

### Example Prompt with Relationship Affordances

```
NEARBY AGENTS:
- Oak (close friend): Expert builder. You can ask them to build things for you.
- River (acquaintance): Skilled cook. You've seen them cooking.
- Pine (stranger): You don't know them yet.

AVAILABLE THROUGH RELATIONSHIPS:
- Building (via Oak): forge, workshop, cabin - just ask!
- Cooking (via River): Could ask about recipes if you get to know them better

You need a forge built. You could:
1. Ask Oak to build it (they'd probably agree)
2. Try building it yourself (slower, but you'd learn)
```

### Learning About Others' Skills

Agents learn about each other's skills through:
1. **Observation** - Seeing them perform skilled actions
2. **Conversation** - Asking "what are you good at?"
3. **Reputation** - Hearing from other agents ("Oak built that cabin")
4. **Results** - Noticing quality of their work

This information is stored in the RelationshipComponent:

```typescript
interface RelationshipData {
  // ... existing fields

  // Perceived skills (may be inaccurate until verified)
  perceivedSkills: Partial<Record<SkillId, {
    level: SkillLevel;        // What we think their level is
    confidence: number;       // 0-1, how sure we are
    lastObserved: number;     // Game tick when we last saw them use this skill
  }>>;
}
```

---

## 12. Building Ownership and Designation

Skilled builders can designate buildings as communal or personal:

### Ownership Types

| Type | Who Can Use | Examples |
|------|-------------|----------|
| **Communal** | Anyone in the village | Well, campfire, storage chest |
| **Personal** | Only the designated owner | "Oak's Cabin", private storage |
| **Shared** | Owner + friends | Workshop shared between crafters |
| **Restricted** | Specific roles/skills | Forge (crafting skill required) |

### Builder Designation Actions

| Building Skill | Ownership Options |
|----------------|-------------------|
| 0-1 | Cannot designate (builds are communal by default) |
| 2 | Can mark as "personal" or "communal" |
| 3 | Can assign to specific agents, set access lists |
| 4 | Can create "guild" buildings (shared by skill group) |
| 5 | Can establish building inheritance, village zones |

### Prompt Integration

When building, skilled builders see ownership options:

```
BUILD: Cabin
Materials: 30 wood, 10 stone ✓ Available

Designation options:
1. Communal (anyone can sleep here)
2. For yourself (your private home)
3. For Oak (gift to a friend)
4. Shared (you + close friends)

Who should this cabin be for?
```

### Ownership in World Context

Buildings show ownership in prompts:

```
VILLAGE BUILDINGS:
- Campfire (communal) - warmth, cooking
- Storage Chest (communal) - 12/20 slots
- Oak's Cabin (Oak's) - sleeping, private storage
- Crafter's Workshop (shared: Oak, River) - advanced crafting
- Your Lean-to (yours) - basic shelter
```

### Access Enforcement

When an agent tries to use a restricted building:
- **Has access**: Normal use
- **Friend of owner**: "You could ask Oak if you can use their cabin"
- **Stranger**: "This cabin belongs to Oak" (no use option shown)

---

## 13. Open Questions

1. **Should skills affect action success rate?** Currently this spec only gates access. Could also add failure chance for low-skill attempts.

2. **Teaching priority?** Should agents naturally teach their skills to others, creating skill propagation?

3. **Crisis override?** If food is at 0 days, should ALL agents see the crisis regardless of skill?

4. **Mining and Smithing skills?** Currently mining falls under `gathering` and smithing under `crafting`. As the mining-metalworking system is implemented (see `work-orders/mining-metalworking/`), we should consider:
   - Adding `mining` as a sub-skill of gathering (ore-specific visibility, deeper vein detection)
   - Adding `smithing` as a sub-skill of crafting (metalwork recipes, alloy knowledge)
   - Or keeping them as specializations within existing skills

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Skill diversity at spawn | 80% of agents have at least one skill >0 | Check SkillsComponent on agent creation |
| Role specialization | Agents with building skill >1 do 60%+ of construction | Track building completion by skill level |
| Reduced duplicates | <10% of buildings have overlapping construction starts | Track concurrent same-type building starts |
| Appropriate suggestions | 90% of strategic suggestions go to skilled agents | Log skill level when generating suggestions |

---

## 15. Example Prompt Comparison

### Before (All Agents See This)
```
VILLAGE STATUS:
- Food: 47 items (2.3 days remaining)
- Storage: 67% full
- Buildings: campfire, lean-to, storage-chest
- Under construction: wooden-cabin (60%)

STRATEGIC PRIORITIES:
1. Food supplies are low - consider farming or gathering
2. Village needs a well for water access
3. Consider building a granary for food storage

AVAILABLE ACTIONS:
- build: Construct any building
- farm: Plant and tend crops
- cook: Prepare meals
- craft: Create items
...
```

### After (Untrained Agent - Pine, gathering level 1)
```
You notice some buildings nearby and food stored in the village.

Your gathering experience tells you the village could use more wood.

AVAILABLE ACTIONS:
- gather: Collect resources from the environment
- wander: Explore the area
- rest: Take a break
- talk: Speak with nearby villagers
```

### After (Skilled Builder - Oak, building level 2, gathering level 1)
```
VILLAGE INFRASTRUCTURE:
Buildings: campfire, lean-to, storage-chest
Under construction: wooden-cabin (60%, needs 4 more logs)

As a skilled builder, you notice the village would benefit from a well.

Currently being built: wooden-cabin
(No need to duplicate this effort)

AVAILABLE ACTIONS:
- build: Construct structures (lean-to, workbench, wooden-cabin, well...)
- gather: Collect resources
- wander: Explore the area
...
```

### After (Skilled Cook - River, cooking level 2, farming level 1)
```
FOOD INVENTORY:
- Berries: 23
- Meat: 14
- Bread: 10
Daily consumption: ~20 food
Days remaining: 2.3

Your food expertise tells you: supplies are getting low.

AVAILABLE ACTIONS:
- cook: Prepare meals from ingredients
- farm: Plant and harvest crops
- gather: Collect food from the wild
...
```