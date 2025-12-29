# Cooking Research Tree & Recipe Discovery System

## Overview

The cooking research tree transforms food from basic sustenance into a deep gameplay system with:
- Progressive unlocking of techniques and equipment
- Discovery of new recipes through experimentation
- Procedurally generated dishes based on ingredients + technique
- Integration with mood/preference/social systems
- Emergent culinary traditions and signature dishes

## Research Tree Structure

### TIER 1: Cuisine I - "Basic Cooking" (Already exists)

**Prerequisites**: Agriculture I
**Progress Required**: 100
**Required Building**: None

**Unlocks**:
- Building: `oven`
- Recipe: `bread` (3 wheat → 1 bread)
- Recipe: `dried_meat` (2 raw_meat → 1 dried_meat, requires campfire)
- Knowledge: `food_preservation_basics`

**Description**: Learn food preservation and simple recipes. Discover that cooking can make food last longer and taste better.

---

### TIER 2: Cuisine II - "Culinary Foundations"

**Prerequisites**: Cuisine I
**Progress Required**: 200
**Required Building**: oven

**Unlocks**:
- Building: `kitchen` (upgraded cooking station with storage)
- Recipe: `vegetable_soup` (2 carrot + 2 potato + water → 1 soup)
- Recipe: `berry_jam` (5 berries + sugar → 3 jam, preserves)
- Recipe: `roasted_vegetables` (assorted veg → roasted veg)
- Technique: `roasting`
- Technique: `boiling`
- Technique: `preserving`
- Knowledge: `flavor_combinations`
- Ability: `taste_test` (evaluate food quality before serving)

**Description**: Master basic cooking techniques. Learn which ingredients complement each other. Begin to understand flavor.

---

### TIER 3: Cuisine III - "Advanced Techniques"

**Prerequisites**: Cuisine II, Alchemy I (for understanding transformations)
**Progress Required**: 350
**Required Building**: kitchen

**Unlocks**:
- Building: `smokehouse` (for smoking meats/fish)
- Building: `fermentation_cellar` (for cheese, pickles, alcohol)
- Recipe: `smoked_fish` (fish + wood chips → smoked fish)
- Recipe: `cheese` (milk + rennet + time → cheese)
- Recipe: `pickled_vegetables` (veg + vinegar + spices → pickles)
- Recipe: `hearty_stew` (meat + veg + herbs → stew, +quality)
- Recipe: `fruit_pie` (berries + wheat + butter → pie, +quality)
- Technique: `smoking`
- Technique: `fermentation`
- Technique: `sautéing`
- Technique: `baking` (advanced, different from basic bread)
- Knowledge: `temperature_control`
- Knowledge: `timing_precision`
- Ability: `adjust_recipe` (modify quantities/ingredients)

**Description**: Learn complex cooking methods that transform ingredients. Master temperature and timing. Begin experimenting with variations.

---

### TIER 4: Cuisine IV - "Gastronomic Mastery"

**Prerequisites**: Cuisine III, Textiles II (for fine dining presentation)
**Progress Required**: 500
**Required Building**: kitchen, smokehouse

**Unlocks**:
- Building: `master_kitchen` (multi-station setup, allows simultaneous dishes)
- Building: `spice_garden` (grow rare herbs and spices)
- Recipe: `herb_crusted_roast` (meat + rare herbs → gourmet roast)
- Recipe: `layered_torte` (complex pastry with multiple steps)
- Recipe: `reduction_sauce` (stock + wine + herbs → sauce, enhances meals)
- Recipe: `stuffed_poultry` (bird + stuffing + technique → feast-quality)
- Technique: `deglazing`
- Technique: `reduction`
- Technique: `multi-course_preparation`
- Technique: `plating` (presentation affects mood bonus)
- Knowledge: `seasonal_ingredients` (fresh = better quality)
- Knowledge: `pairing_theory` (which flavors enhance each other)
- Ability: `create_recipe` (formalize experimental successes)
- Ability: `teach_recipe` (pass recipes to other agents)

**Description**: Achieve mastery of cooking arts. Create multi-course meals. Understand the science and art of flavor. Your dishes become legendary.

---

### TIER 5: Cuisine V - "Culinary Innovation"

**Prerequisites**: Cuisine IV, Experimental Research
**Progress Required**: 800
**Required Building**: master_kitchen, inventors_hall

**Unlocks**:
- Building: `culinary_academy` (research kitchen for experimentation)
- Building: `tasting_room` (evaluate and refine recipes)
- Technique: `molecular_gastronomy` (if setting allows)
- Technique: `fusion_cooking` (combine cultural traditions)
- Ability: `culinary_experiment` (procedural recipe generation!)
- Ability: `signature_dish` (create permanent unique recipe)
- Ability: `flavor_innovation` (discover new flavor combinations)
- Knowledge: `ingredient_chemistry`
- Generated: `procedural_recipes` (see below)

**Description**: Push the boundaries of cooking. Invent entirely new dishes through experimentation. Develop signature recipes that define your culinary legacy.

---

## Procedural Recipe Generation System

### Recipe Experimentation Mechanic

When an agent with Cuisine V uses `culinary_experiment`:

```typescript
interface CulinaryExperiment {
  // Inputs
  ingredients: Array<{
    itemId: string;
    amount: number;
    freshness: number; // affects success chance
  }>;

  technique: CookingTechnique;
  equipment: string; // 'oven', 'master_kitchen', etc.

  // Agent factors
  cookingSkill: number; // 0-100
  knownRecipes: string[]; // influences creativity
  recentExperiments: ExperimentResult[]; // learn from failures

  // Intent (optional, from LLM)
  goal?: string; // "something sweet", "comfort food", "impressive feast"
  inspiration?: string; // "reminds me of home", "for the festival"
}

interface ExperimentResult {
  success: boolean;
  discovery?: GeneratedRecipe;
  insight?: CulinaryInsight;
  outcome: 'masterpiece' | 'success' | 'edible' | 'failure' | 'disaster';
  resultingFood: FoodItem; // what you actually made
  materialsConsumed: Array<{itemId: string, amount: number}>;
  description: string; // LLM-generated narrative
}
```

### Success Calculation

```typescript
function calculateExperimentSuccess(experiment: CulinaryExperiment): number {
  let baseChance = 0.3; // 30% base

  // Skill bonus (up to +40%)
  baseChance += (experiment.cookingSkill / 100) * 0.4;

  // Ingredient quality (+0 to +20%)
  const avgFreshness = experiment.ingredients.reduce(
    (sum, ing) => sum + ing.freshness, 0
  ) / experiment.ingredients.length;
  baseChance += (avgFreshness / 100) * 0.2;

  // Equipment bonus
  const equipmentBonus = {
    'campfire': 0,
    'oven': 0.05,
    'kitchen': 0.1,
    'master_kitchen': 0.15,
    'culinary_academy': 0.2
  };
  baseChance += equipmentBonus[experiment.equipment] || 0;

  // Familiarity penalty (experimental combinations are risky)
  const uncommonPairing = calculateIngredientNovelty(experiment.ingredients);
  baseChance -= uncommonPairing * 0.2; // -0 to -20% for weird combos

  // Insights from previous failures
  const relevantInsights = experiment.recentExperiments.filter(
    exp => sharesSomeIngredients(exp, experiment)
  );
  baseChance += Math.min(0.15, relevantInsights.length * 0.03);

  return Math.max(0.1, Math.min(0.95, baseChance)); // 10-95% range
}
```

### Procedural Recipe Generation

When experiment succeeds, generate a new recipe:

```typescript
interface GeneratedRecipe {
  id: string; // generated hash
  name: string; // LLM-generated
  displayName: string;
  category: 'Food';
  description: string; // LLM-generated

  // Recipe definition
  ingredients: RecipeIngredient[];
  output: RecipeOutput;
  technique: CookingTechnique;
  craftingTime: number; // based on complexity

  // Quality attributes
  baseQuality: number; // 50-90 based on experiment roll
  complexity: number; // affects crafting time, skill requirement

  // Food attributes (from cooking mood spec)
  foodAttributes: {
    hungerRestored: number;
    flavors: FlavorProfile[];
    nutrition: NutritionProfile;
    servingSize: 'snack' | 'meal' | 'feast';
  };

  // Discovery context
  discoveredBy: string; // agent ID
  discoveredAt: number; // timestamp
  generationContext: {
    experimentId: string;
    roll: number; // success roll
    inspiration: string;
    storyContext: string; // "Created during the harvest festival"
  };

  // Metadata
  type: 'generated';
  tier: number; // based on ingredient tier + technique
  stationRequired: string;
  skillRequirement: number; // minimum cooking skill
  researchRequirements: ['cuisine_v'];
}
```

### Recipe Naming (LLM Integration)

```typescript
async function generateRecipeName(
  ingredients: string[],
  technique: string,
  context: GenerationContext
): Promise<string> {
  const prompt = `
You are a creative chef naming a new dish.

Ingredients: ${ingredients.join(', ')}
Cooking technique: ${technique}
Context: ${context.inspiration || 'general experimentation'}

Generate a creative, appetizing name for this dish. The name should:
- Evoke the key ingredients or flavors
- Sound delicious and memorable
- Be 2-5 words
- Fit the technique and context

Examples:
- "Ember-Roasted Root Medley"
- "Honeyed Berry Compote"
- "Autumn Harvest Stew"
- "Crispy Herb-Crusted Fish"

Dish name:`;

  const response = await llm.generate(prompt);
  return response.trim();
}
```

### Recipe Description Generation

```typescript
async function generateRecipeDescription(
  recipe: GeneratedRecipe,
  agent: Agent,
  context: GenerationContext
): Promise<string> {
  const prompt = `
You are documenting a newly discovered recipe.

Recipe: ${recipe.name}
Ingredients: ${recipe.ingredients.map(i => i.itemId).join(', ')}
Technique: ${recipe.technique}
Discovered by: ${agent.name}
Context: ${context.storyContext}

Write a flavorful 1-2 sentence description that captures:
- How it tastes or smells
- What makes it special
- When it might be served

Examples:
- "A hearty stew that fills the room with the aroma of roasted herbs. Perfect for cold evenings by the fire."
- "Delicate layers of flaky pastry filled with sweet berry compote. A celebration dessert."
- "Smoky, tender fish with a crispy herb crust. The pride of coastal villages."

Description:`;

  const response = await llm.generate(prompt);
  return response.trim();
}
```

## Culinary Insights System

Failed experiments aren't wasted - they generate insights:

```typescript
interface CulinaryInsight {
  id: string;
  content: string; // "Berries and meat don't mix well"

  // What was learned
  avoidCombinations?: string[][]; // [['berry', 'raw_meat']]
  favorableCombinations?: string[][]; // [['carrot', 'potato']]
  techniqueNotes?: string; // "Roasting brings out sweetness"

  // Mechanical effects
  breakthroughBonus: number; // +progress to related experiments
  relatedIngredients: string[];
  relatedTechniques: string[];

  // Context
  discoveredBy: string;
  timestamp: number;
  experimentContext: string;
}
```

### Insight Generation

```typescript
function generateInsightFromFailure(
  experiment: CulinaryExperiment,
  outcome: 'edible' | 'failure' | 'disaster'
): CulinaryInsight {
  const insights: string[] = [];

  // Analyze what went wrong
  if (outcome === 'disaster') {
    insights.push(`${experiment.ingredients[0].itemId} and ${experiment.ingredients[1].itemId} create an unpleasant combination`);
  } else if (outcome === 'failure') {
    insights.push(`${experiment.technique} may not be the right technique for these ingredients`);
  } else { // edible but not success
    insights.push(`This combination works, but needs refinement`);
  }

  return {
    id: generateId(),
    content: insights[0],
    avoidCombinations: outcome === 'disaster'
      ? [[experiment.ingredients[0].itemId, experiment.ingredients[1].itemId]]
      : undefined,
    breakthroughBonus: outcome === 'edible' ? 20 : 10,
    relatedIngredients: experiment.ingredients.map(i => i.itemId),
    relatedTechniques: [experiment.technique],
    discoveredBy: experiment.agentId,
    timestamp: Date.now(),
    experimentContext: `Failed attempt at ${experiment.goal || 'new recipe'}`
  };
}
```

## Signature Dishes

Master chefs can formalize successful experiments as signature dishes:

```typescript
interface SignatureDish extends GeneratedRecipe {
  isSignature: true;
  creator: string; // agent ID
  creatorName: string;

  // Legacy
  timesCooked: number;
  taughtTo: string[]; // agent IDs
  reputation: number; // 0-100, grows with popularity

  // Story
  origin: string; // "Created for the Summer Solstice feast"
  perfectionsHistory: Array<{
    timestamp: number;
    improvement: string; // "Adjusted spice ratios"
  }>;

  // Cultural impact
  associatedEvents: string[]; // festivals, celebrations where it's served
  communityFavorite: boolean;
}
```

When a signature dish is created:
1. Becomes part of agent's identity ("Known for their legendary stew")
2. Can be taught to apprentices
3. Becomes part of community culture
4. Gets remembered in agent memories
5. Can become festival tradition

## Integration with Cooking Mood Preference System

Discovered recipes integrate with the mood system:

```typescript
// When eating a discovered dish
function evaluateDiscoveredDish(
  agent: Agent,
  dish: GeneratedRecipe | SignatureDish
): MoodImpact {
  let moodBonus = 0;
  let factors: string[] = [];

  // Novel food excitement
  if (!agent.preferences.recentMeals.some(m => m.foodId === dish.id)) {
    moodBonus += 10;
    factors.push("Trying something new and exciting!");
  }

  // Created by friend
  if (dish.discoveredBy === agent.id) {
    moodBonus += 15;
    factors.push("I created this recipe!");
  } else if (agent.relationships[dish.discoveredBy]?.affinity > 60) {
    moodBonus += 12;
    const creatorName = getAgentName(dish.discoveredBy);
    factors.push(`${creatorName} invented this recipe`);
  }

  // Signature dish prestige
  if ('isSignature' in dish && dish.reputation > 70) {
    moodBonus += 8;
    factors.push("This is a renowned signature dish!");
  }

  // Cultural connection
  if ('associatedEvents' in dish && dish.communityFavorite) {
    moodBonus += 10;
    factors.push("A beloved community recipe");
  }

  // Quality from skill
  const qualityBonus = (dish.baseQuality - 50) / 5;
  moodBonus += qualityBonus;

  return { moodBonus, factors };
}
```

## Example Progression Narrative

### Act 1: Learning the Basics
- Agent researches Cuisine I
- Makes bread, learns preservation
- "This bread I made isn't great, but it fills the belly"

### Act 2: Finding Their Style
- Unlocks Cuisine II, builds kitchen
- Experiments with soups, discovers they love savory flavors
- "I think I'm getting the hang of this!"

### Act 3: Mastery
- Achieves Cuisine III
- Specializes in smoking fish
- Teaches others their technique
- "My smoked fish has become popular in the village"

### Act 4: Innovation
- Reaches Cuisine V
- Experiments: smoked fish + herb crust + citrus reduction
- **SUCCESS!** Discovers "Ember-Kissed Citrus Bass"
- Becomes signature dish
- Served at festivals
- "People come from other villages to try my Bass"

### Act 5: Legacy
- Teaches recipe to apprentice
- Apprentice makes variations
- Recipe becomes part of community culture
- "This recipe reminds me of [chef's name]. They taught me everything."

## Technical Implementation

### Recipe Storage

```typescript
interface RecipeDatabase {
  predefined: Map<string, Recipe>; // vanilla recipes
  discovered: Map<string, GeneratedRecipe>; // procedurally found
  signatures: Map<string, SignatureDish>; // formalized creations

  // Query methods
  getRecipesByTechnique(tech: string): Recipe[];
  getRecipesByIngredient(itemId: string): Recipe[];
  getRecipesByCreator(agentId: string): GeneratedRecipe[];
  getSignatureDishes(): SignatureDish[];
  getCommunityFavorites(): SignatureDish[];
}
```

### Experiment Log

```typescript
interface ExperimentLog {
  experiments: Map<string, ExperimentResult>;
  insights: Map<string, CulinaryInsight>;

  // Analytics
  getSuccessRate(agentId: string): number;
  getCommonFailures(): string[][]; // ingredient pairs that don't work
  getTrendingIngredients(): string[]; // what people are experimenting with
}
```

### Cultural Recipe Tracking

```typescript
interface CulinaryTradition {
  recipeId: string;
  origin: {
    creator: string;
    timestamp: number;
    context: string;
  };

  // Spread
  knownBy: Set<string>; // agent IDs
  popularityScore: number;

  // Events
  servedAt: Array<{
    event: string;
    timestamp: number;
    reception: 'loved' | 'liked' | 'neutral';
  }>;

  // Evolution
  variations: Array<{
    recipeId: string;
    creator: string;
    innovation: string;
  }>;
}
```

## LLM Integration Points

### Experiment Intent
```
Agent decides to experiment:

"You have access to a culinary academy and are a master chef (skill 85/100).
Available ingredients: carrots, potatoes, fresh fish, rare herbs, citrus
You know ${knownRecipes.length} recipes.

What would you like to try creating? Consider:
- A feast for the upcoming festival
- A comfort food for winter
- Something to impress visitors
- Experimentation for its own sake

Your recent experiments: ${recentExperiments}
Community needs: ${communityContext}

What do you want to create and why?"
```

### Experiment Outcome Narrative
```
Experiment rolled ${roll} (needed ${threshold}):
Result: ${outcome}

Ingredients: ${ingredients}
Technique: ${technique}
Intent: ${goal}

Describe what happened in the kitchen. How did it smell?
What was the texture? Did it meet your expectations?

If success: What makes this dish special?
If failure: What went wrong? What did you learn?

2-3 sentences, from your perspective as the chef:
```

### Teaching Recipe
```
You're teaching ${studentName} how to make ${recipeName}.

Recipe: ${recipe}
Your skill: ${teacherSkill}
Their skill: ${studentSkill}
Your relationship: ${relationship}

How do you explain the recipe? Include:
- Key techniques
- What to watch out for
- Why you're proud of this dish
- Personal tips

2-3 sentences as dialogue:
```

## Balance Considerations

### Experiment Costs
- Materials consumed (high tier ingredients = expensive experiments)
- Time investment (complex experiments take longer)
- Failure risk (low skill = high material waste)

### Progression Pacing
- Cuisine I-II: Learning fundamentals (hours)
- Cuisine III-IV: Mastering techniques (days)
- Cuisine V: Innovation phase (ongoing)

### Recipe Power Budget
Generated recipes should be balanced:
- Tier 2 dishes: 30-40 hunger, simple buffs
- Tier 3 dishes: 40-60 hunger, mood bonus
- Tier 4 dishes: 60-80 hunger, significant mood + minor stats
- Tier 5 dishes: 80-100 hunger, major mood + buffs, feast-quality

### Discovery Rate
- Limit experiments per day (requires mental energy)
- Success rate improves with skill (novice ~30%, master ~70%)
- Insights from failures reduce repeat mistakes
- Community knowledge sharing (recipes spread)

## Conclusion

This system transforms cooking from crafting into **culinary storytelling**:

- **Personal Growth**: Novice → Master Chef
- **Creative Expression**: Invent unique signature dishes
- **Community Building**: Recipes become traditions
- **Emergent Culture**: Different villages develop different cuisines
- **Legacy**: Famous chefs remembered for their innovations
- **Dynamic Content**: Infinite recipe possibilities

The key: **Every successful experiment is a story moment**, and even failures create meaningful progression through insights.
