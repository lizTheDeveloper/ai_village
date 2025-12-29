# Cooking, Mood & Preference System - Deep Design

## Philosophy

Food shouldn't just be "fuel". It should be:
- **Social** - Meals are when communities bond
- **Personal** - Everyone has preferences and memories tied to food
- **Skill-based** - Good cooking is an art that improves with practice
- **Mood-affecting** - What you eat and who you eat with matters
- **Story-generating** - Food creates memorable moments

## Core Systems Integration

### 1. Food Quality & Attributes

Every food item has multiple dimensions beyond "hunger restored":

```typescript
interface FoodAttributes {
  // Basic
  hungerRestored: number;

  // Quality (0-100, affects mood bonus)
  quality: number;

  // Flavor profile (for preferences)
  flavors: ('sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami')[];

  // Nutritional balance (affects long-term health/mood)
  nutrition: {
    protein: number;
    carbs: number;
    vitamins: number;
    fats: number;
  };

  // Freshness (degrades over time)
  freshness: number; // 0-100, affects quality
  preparedAt?: number; // timestamp

  // Social value
  complexity: number; // Simple snack vs elaborate feast
  servingSize: 'snack' | 'meal' | 'feast';

  // Who made it (for social bonding)
  preparedBy?: string; // agent ID
}
```

### 2. Agent Food Preferences

Each agent has a dynamic preference system that evolves:

```typescript
interface AgentPreferences {
  // Innate preferences (personality-based)
  flavorPreferences: {
    [flavor: string]: number; // -1 to 1 (love to hate)
  };

  // Learned preferences (change based on experience)
  foodMemories: Array<{
    foodId: string;
    experience: 'positive' | 'neutral' | 'negative';
    context: string; // "Ate with friends", "First time trying", etc.
    emotionalImpact: number;
    timestamp: number;
  }>;

  // Variety tracking (eating same thing gets boring)
  recentMeals: Array<{
    foodId: string;
    timestamp: number;
  }>;

  // Favorite foods (emergent from positive experiences)
  favorites: string[]; // food IDs

  // Cultural/community foods
  comfortFoods: string[]; // Foods that remind of home/community

  // Dietary restrictions/choices (can develop over time)
  avoids?: string[]; // food IDs or categories
}
```

### 3. Mood System Enhancements

Expand the mood system to track:

```typescript
interface MoodComponent {
  // Current mood (-100 to 100)
  currentMood: number;

  // Mood factors (what's contributing to current mood)
  factors: {
    hunger: number;
    foodSatisfaction: number; // Recent meals quality
    foodVariety: number; // Eating diverse foods
    socialMeals: number; // Eating with others
    comfort: number; // Eating favorite/comfort foods
    // ... other factors (sleep, social, etc.)
  };

  // Mood history (for patterns)
  moodHistory: Array<{
    timestamp: number;
    mood: number;
    primaryFactor: string;
  }>;

  // Emotional state
  emotionalState: 'content' | 'joyful' | 'melancholic' | 'anxious' | 'excited' | 'nostalgic';
}
```

### 4. Cooking Skill System

Cooking improves with practice and affects food quality:

```typescript
interface CookingSkill {
  level: number; // 0-100

  // Experience by recipe complexity
  experience: {
    simple: number;
    intermediate: number;
    advanced: number;
    masterwork: number;
  };

  // Specializations (develop through practice)
  specialties: {
    baking: number;
    grilling: number;
    stewing: number;
    preservation: number;
  };

  // Known recipes (can discover new ones)
  knownRecipes: string[];

  // Recipe quality modifiers (based on skill + practice)
  recipeExperience: {
    [recipeId: string]: {
      timesMade: number;
      qualityBonus: number; // Increases with practice
    };
  };
}
```

## Key Mechanics

### Cooking Quality Calculation

When an agent cooks:

```typescript
function calculateFoodQuality(
  recipe: Recipe,
  cook: Agent,
  ingredients: Item[]
): number {
  let baseQuality = 50;

  // Cook's skill bonus (0-30 points)
  const skillBonus = (cook.cookingSkill.level / 100) * 30;

  // Recipe familiarity (0-20 points)
  const familiarity = Math.min(
    cook.cookingSkill.recipeExperience[recipe.id]?.timesMade || 0,
    20
  );

  // Ingredient freshness average (0-20 points)
  const freshnessBonus = ingredients.reduce(
    (sum, ing) => sum + (ing.freshness || 100),
    0
  ) / ingredients.length / 5;

  // Mood bonus (happy cooks make better food) (-10 to +10)
  const moodBonus = (cook.mood.currentMood / 100) * 10;

  // Random variance (-10 to +10)
  const variance = (Math.random() - 0.5) * 20;

  return Math.max(0, Math.min(100,
    baseQuality + skillBonus + familiarity + freshnessBonus + moodBonus + variance
  ));
}
```

### Eating Experience & Mood Impact

When an agent eats:

```typescript
function calculateEatingExperience(
  agent: Agent,
  food: FoodItem,
  context: EatingContext
): MoodImpact {
  let moodDelta = 0;
  let factors: string[] = [];

  // 1. Basic satisfaction (hunger relief)
  if (agent.needs.hunger > 70) {
    moodDelta += 10;
    factors.push("Very hungry, food is satisfying");
  }

  // 2. Quality bonus
  const qualityBonus = (food.quality - 50) / 5; // -10 to +10
  moodDelta += qualityBonus;
  if (qualityBonus > 5) factors.push("Delicious food!");
  if (qualityBonus < -5) factors.push("Food quality is poor");

  // 3. Preference matching
  const preferenceMatch = calculateFlavorPreference(agent, food);
  moodDelta += preferenceMatch * 15; // -15 to +15
  if (preferenceMatch > 0.5) factors.push("One of my favorites!");
  if (preferenceMatch < -0.5) factors.push("Not a fan of this taste");

  // 4. Variety bonus/penalty
  const varietyScore = calculateVariety(agent.preferences.recentMeals);
  if (varietyScore < 0.3) {
    moodDelta -= 10;
    factors.push("Eating the same thing again...");
  } else if (varietyScore > 0.7) {
    moodDelta += 5;
    factors.push("Nice to try something different");
  }

  // 5. Social bonus (eating with others)
  if (context.socialMeal && context.companions.length > 0) {
    moodDelta += 10 + (context.companions.length * 2);
    factors.push(`Sharing a meal with ${context.companions.length} friends`);
  }

  // 6. Comfort food bonus
  if (agent.preferences.comfortFoods.includes(food.id)) {
    moodDelta += 15;
    factors.push("This brings back good memories");
  }

  // 7. Special meal bonus (feasts)
  if (food.servingSize === 'feast' && context.socialMeal) {
    moodDelta += 20;
    factors.push("What a wonderful feast!");
  }

  // 8. Prepared by friend bonus
  if (food.preparedBy && agent.relationships[food.preparedBy]?.affinity > 50) {
    moodDelta += 8;
    const cookName = getAgentName(food.preparedBy);
    factors.push(`${cookName} made this for me`);
  }

  return {
    moodDelta,
    factors,
    emotionalImpact: categorizeExperience(moodDelta)
  };
}
```

### Social Meal Events

When agents eat together, create bonding moments:

```typescript
function handleSocialMeal(participants: Agent[], food: FoodItem[]) {
  // Strengthen relationships
  for (const agent1 of participants) {
    for (const agent2 of participants) {
      if (agent1.id === agent2.id) continue;

      // Shared meals build bonds
      increaseAffinity(agent1, agent2, 5);

      // Create shared memory
      createSharedMemory(agent1, agent2, {
        type: 'shared_meal',
        description: `Had a meal together`,
        foods: food.map(f => f.displayName),
        mood: calculateMealMood(agent1, food),
        timestamp: Date.now()
      });

      // Chance for conversation
      if (Math.random() > 0.5) {
        triggerMealConversation(agent1, agent2, food);
      }
    }
  }

  // Community building
  emitEvent('community_meal', {
    participants: participants.map(a => a.id),
    foods: food,
    moodBoost: 'high'
  });
}
```

### Preference Learning & Evolution

Agents develop preferences based on experiences:

```typescript
function updateFoodPreferences(
  agent: Agent,
  food: FoodItem,
  experience: 'positive' | 'neutral' | 'negative',
  context: string
) {
  // Add to memory
  agent.preferences.foodMemories.push({
    foodId: food.id,
    experience,
    context,
    emotionalImpact: experience === 'positive' ? 1 : (experience === 'negative' ? -1 : 0),
    timestamp: Date.now()
  });

  // Update flavor preferences gradually
  for (const flavor of food.flavors) {
    const adjustment = experience === 'positive' ? 0.05 : (experience === 'negative' ? -0.05 : 0);
    agent.preferences.flavorPreferences[flavor] = Math.max(-1, Math.min(1,
      (agent.preferences.flavorPreferences[flavor] || 0) + adjustment
    ));
  }

  // Update favorites list
  const positiveExperiences = agent.preferences.foodMemories.filter(
    m => m.foodId === food.id && m.experience === 'positive'
  ).length;

  if (positiveExperiences >= 3 && !agent.preferences.favorites.includes(food.id)) {
    agent.preferences.favorites.push(food.id);
    createReflection(agent, `I think ${food.displayName} has become one of my favorites`);
  }

  // Develop comfort foods from repeated positive experiences
  if (positiveExperiences >= 5 && !agent.preferences.comfortFoods.includes(food.id)) {
    agent.preferences.comfortFoods.push(food.id);
    createMemory(agent, {
      type: 'meaningful',
      content: `${food.displayName} always makes me feel better`
    });
  }
}
```

## Emergent Behaviors & Stories

This system enables rich emergent narratives:

### Example Scenarios

1. **The Community Cook**
   - Agent discovers they're good at cooking
   - Others compliment their food
   - Mood boost from making others happy
   - Becomes the village cook, specializes in feasts
   - Forms strong bonds through shared meals

2. **The Picky Eater**
   - Agent develops strong flavor preferences
   - Refuses certain foods, seeks out favorites
   - Creates social friction at communal meals
   - Eventually tries new food at friend's request
   - Discovers new favorite, preference evolves

3. **Comfort Food Memories**
   - Agent eats bread during tough times
   - Associates bread with comfort
   - Later, when stressed, specifically seeks bread
   - Shares bread with friend in need
   - Memory: "Bread always reminds me of hard times we survived together"

4. **The Feast**
   - Community saves up ingredients
   - Best cook prepares elaborate meal
   - Everyone eats together, huge mood boost
   - Strengthens all relationships
   - Becomes recurring tradition
   - Agents remember "the great autumn feast"

5. **Food Monotony**
   - Agent eats same food repeatedly (berries)
   - Mood slowly degrades despite full hunger
   - Reflects: "I'm so tired of berries"
   - Actively seeks variety
   - Celebrates when finding new food source

## LLM Integration

Food experiences should inform agent decision-making:

### Context for LLM

```typescript
function getFoodContext(agent: Agent): string {
  const recentMeals = agent.preferences.recentMeals.slice(-5);
  const favorites = agent.preferences.favorites.map(id => getItemName(id));
  const moodFactors = agent.mood.factors;

  return `
Food Situation:
- Recent meals: ${recentMeals.map(m => getItemName(m.foodId)).join(', ')}
- Favorite foods: ${favorites.join(', ') || 'still discovering'}
- Food satisfaction: ${moodFactors.foodSatisfaction > 0 ? 'satisfied' : 'could be better'}
- Variety: ${moodFactors.foodVariety > 0 ? 'eating diverse foods' : 'eating same things'}
- Social meals: ${moodFactors.socialMeals > 0 ? 'recently ate with others' : 'eating alone lately'}
  `.trim();
}
```

### Decision Prompts

When choosing what to cook:
```
You're about to cook a meal. Consider:
- Your cooking skill level (${cookingSkill.level}/100)
- Available ingredients: ${ingredients}
- Your mood: ${mood}
- Who might share this meal: ${nearbyAgents}
- Recent meals: ${recentMeals}

What would you like to make? Consider:
- Making something special for friends
- Trying a new recipe to improve skills
- Making comfort food if feeling down
- Creating a feast for the community
```

When eating together:
```
You're sharing a meal with ${companions}. The food is ${quality}.
This is a moment to bond, share stories, or discuss plans.
What do you talk about over the meal?
```

## Implementation Priority

### Phase 1: Foundation
- [ ] Add FoodAttributes to items
- [ ] Add PreferenceComponent to agents
- [ ] Add MoodComponent with food factors
- [ ] Implement basic quality calculation
- [ ] Implement preference matching

### Phase 2: Cooking Skill
- [ ] Add CookingSkillComponent
- [ ] Implement skill progression
- [ ] Add quality variation based on skill
- [ ] Add recipe experience tracking

### Phase 3: Social Meals
- [ ] Detect when agents eat together
- [ ] Implement social meal bonding
- [ ] Add meal conversations
- [ ] Create shared memories

### Phase 4: Depth
- [ ] Preference learning and evolution
- [ ] Comfort food mechanics
- [ ] Variety tracking and penalties
- [ ] Recipe discovery
- [ ] Food freshness system

### Phase 5: Integration
- [ ] LLM context integration
- [ ] Reflection system hooks
- [ ] Memory system integration
- [ ] Behavior system (cook for others, request specific foods)

## Technical Considerations

### Performance
- Cache food quality calculations
- Update preferences batch-wise
- Use efficient data structures for recent meals (circular buffer)
- Limit memory storage (top N most impactful)

### Balance
- Tune mood impact numbers through playtesting
- Ensure variety penalty isn't too harsh
- Make cooking skill progression feel rewarding
- Balance social meal frequency

### UX
- Visual indicators for food quality (stars, color-coding)
- Show agent preferences in UI
- Display cooking skill levels
- Highlight special meals/feasts
- Show relationship changes from shared meals

## Conclusion

This system transforms food from a simple resource into a rich gameplay mechanic that:
- Creates meaningful agent personalities (picky eaters, master cooks, comfort food seekers)
- Generates emergent stories (the feast, the discovery, the tradition)
- Encourages social gameplay (cooking for others, meals together)
- Adds depth to decision-making (what to cook, when to share)
- Integrates with existing systems (mood, memory, relationships, reflection)

The key is that **every meal has the potential to be memorable**, not just fuel.
