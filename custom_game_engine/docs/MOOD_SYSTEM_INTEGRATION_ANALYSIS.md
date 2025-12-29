# Mood System Integration Analysis

## Current State vs. Spec

### What EXISTS in Codebase

#### 1. **NeedsComponent** ✅ (Implemented)
```typescript
{
  hunger: number;      // 0-100
  energy: number;      // 0-100
  health: number;      // 0-100
  thirst: number;      // 0-100
  temperature: number; // Celsius
}
```
**Integration**: Basic physical needs tracking
**Missing**: No connection to mood/emotional state

#### 2. **EpisodicMemoryComponent** ✅ (Implemented)
```typescript
{
  emotionalValence: number;    // -1 to 1 (negative to positive)
  emotionalIntensity: number;  // 0 to 1 (weak to strong)
}
```
**Integration**: Memories have emotional encoding
**Missing**: These emotions don't affect current mood

#### 3. **PersonalityComponent** ✅ (Implemented)
```typescript
{
  // Big Five
  openness, conscientiousness, extraversion,
  agreeableness, neuroticism

  // Game-specific
  workEthic, creativity, generosity, leadership
}
```
**Integration**: Defines base temperament
**Missing**: No connection to mood modulation

#### 4. **RelationshipComponent** ✅ (Implemented)
```typescript
{
  familiarity: number;      // 0-100
  lastInteraction: number;
  interactionCount: number;
  sharedMemories: number;
}
```
**Integration**: Tracks social connections
**Missing**: No affinity/trust, no mood impact from social interactions

#### 5. **ReflectionComponent** ✅ (Implemented)
```typescript
{
  reflections: Reflection[];
  type: 'daily' | 'deep' | 'post_event' | 'idle';
  insights, themes, narrative
}
```
**Integration**: Agents think about experiences
**Missing**: No emotional processing, no mood impact

---

### What's SPEC'd but NOT Implemented

#### 1. **MoodComponent** ❌ (Only in spec)
From `COOKING_MOOD_PREFERENCE_SYSTEM.md`:
```typescript
{
  currentMood: number;           // -100 to 100
  factors: {
    hunger, foodSatisfaction, foodVariety,
    socialMeals, comfort, sleep, social, etc.
  };
  moodHistory: Array<{timestamp, mood, primaryFactor}>;
  emotionalState: 'content' | 'joyful' | 'melancholic' | etc.
}
```

**Purpose**: Central mood tracking system
**Status**: NOT IMPLEMENTED

#### 2. **Food Preferences** ❌ (Only in spec)
```typescript
{
  flavorPreferences: {[flavor]: number};  // -1 to 1
  foodMemories: Array<{foodId, experience, context}>;
  recentMeals: Array<{foodId, timestamp}>;
  favorites: string[];
  comfortFoods: string[];
}
```

**Purpose**: Personal food tastes that evolve
**Status**: NOT IMPLEMENTED

#### 3. **Cooking Skill** ❌ (Only in spec)
```typescript
{
  level: number;  // 0-100
  specialties: {baking, grilling, etc.};
  knownRecipes: string[];
  recipeExperience: {[recipeId]: {timesMade, qualityBonus}};
}
```

**Purpose**: Skill progression affects food quality
**Status**: NOT IMPLEMENTED

#### 4. **Food Quality System** ❌ (Only in spec)
```typescript
{
  quality: number;      // 0-100
  freshness: number;    // 0-100
  flavors: string[];
  nutrition: {protein, carbs, vitamins, fats};
  preparedBy: string;   // agent ID
}
```

**Purpose**: Multi-dimensional food attributes
**Status**: NOT IMPLEMENTED (food is just `hungerRestored`)

---

## Integration Gaps

### Gap 1: Emotions Don't Affect Behavior ⚠️

**Current**:
- Memories have `emotionalValence` and `emotionalIntensity`
- But these don't influence agent decisions or current state

**Needed**:
- MoodComponent that aggregates emotional experiences
- Recent positive/negative events affect current mood
- Mood influences behavior choices (sad → seek comfort, happy → be social)

**Example Missing Flow**:
```
Agent eats favorite food → Creates positive memory → NO mood boost
Agent lonely for days → NO mood decline
Agent achieves goal → NO joy/pride tracking
```

### Gap 2: Food is One-Dimensional ⚠️

**Current**:
```typescript
// Food just has hungerRestored
{
  id: "bread",
  hungerRestored: 40
}
```

**Needed** (from spec):
```typescript
{
  id: "bread",
  hungerRestored: 40,
  quality: 75,           // How well-made
  freshness: 90,         // How fresh
  flavors: ['savory'],   // Taste profile
  preparedBy: "agent_5", // Social connection
  complexity: 'simple'   // Snack vs feast
}
```

**Missing**:
- No quality variation (all bread is the same)
- No freshness decay
- No social bonding from shared meals
- No preference learning

### Gap 3: Social Interactions Lack Depth ⚠️

**Current**:
- Relationships track familiarity and interaction count
- No emotional bonds (affinity, trust, rivalry)
- No mood impact from social experiences

**Needed**:
```typescript
// From spec
{
  affinity: number;      // Do they like each other?
  trust: number;         // Do they trust each other?
  moodImpact: number;    // How much they affect each other's mood
}
```

**Missing Scenarios**:
- Eating with friends → Should boost mood
- Argument with someone → Should lower mood
- Making new friend → Should create joy
- Rejection/betrayal → Should create sadness

### Gap 4: No Preference Learning ⚠️

**Current**:
- Agents eat whatever is available
- No memory of what they like/dislike
- No variety seeking

**Needed**:
- Track recent meals (eating same thing = boring)
- Learn flavor preferences (loves sweet, hates bitter)
- Develop favorites through positive experiences
- Comfort foods tied to memories

**Missing**:
```
Agent eats berries 10 times → Should get bored
Agent always chooses fish → Should become known preference
Agent eats mom's stew → Should become comfort food
```

### Gap 5: Cooking is Generic Crafting ⚠️

**Current**:
- Cooking uses generic CraftingSystem
- All bread made at oven is identical
- No skill progression
- No experimentation

**Needed** (from cooking spec):
- CookingSkillComponent
- Quality based on skill + freshness + mood
- Recipe experimentation and discovery
- Signature dishes

**Missing Flow**:
```
Novice cook makes bread → quality 40
Master cook makes bread → quality 85
Same recipe, different quality based on skill
```

### Gap 6: Reflection Doesn't Process Emotions ⚠️

**Current**:
- Reflections are text summaries
- No emotional integration
- No mood updates from insights

**Needed**:
- Reflections should identify mood patterns
- "I've been eating alone a lot, feeling isolated"
- "The harvest festival made me so happy"
- Insights should influence future behavior

---

## Integration Opportunities

### Quick Wins (Low Effort, High Impact)

#### 1. **Add Affinity to Relationships** ⭐
**Change**: Add `affinity: number` to RelationshipComponent
**Impact**:
- Track who likes whom
- Foundation for mood from social interactions
- Enables friend/rival dynamics

**Code**:
```typescript
interface Relationship {
  targetId: EntityId;
  familiarity: number;
  affinity: number;        // NEW: -100 to 100
  lastInteraction: Tick;
  interactionCount: number;
  sharedMemories: number;
}
```

#### 2. **Track Recent Meals** ⭐
**Change**: Add simple meal history to agent
**Impact**:
- Detect variety/monotony
- Foundation for preferences
- Enable LLM context ("I've been eating berries for 3 days")

**Code**:
```typescript
// Add to AgentComponent or create simple PreferenceComponent
recentMeals: Array<{foodId: string, timestamp: number}>;
```

#### 3. **Food Quality Modifier** ⭐
**Change**: Add optional `quality` field to food items
**Impact**:
- Better food = more satisfying
- Creates progression (novice vs master cook)
- Minimal breaking changes

**Code**:
```typescript
// Extend FoodAttributes in defaultItems.ts
interface FoodItem {
  hungerRestored: number;
  quality?: number;  // NEW: 0-100, defaults to 50
}
```

### Medium Effort Features

#### 4. **Basic MoodComponent**
**Components**:
- Current mood value (-100 to 100)
- Simple factor tracking (hunger, energy, social)
- Mood decay toward neutral

**Integration**:
- Update from NeedsComponent (hungry = bad mood)
- Update from social interactions
- Show in UI

**Systems Affected**:
- New MoodSystem
- NeedsSystem (affects mood)
- Behavior system (mood influences choices)

#### 5. **Cooking Skill Progression**
**Components**:
- CookingSkillComponent
- Track recipes made
- Quality calculation

**Integration**:
- CraftingSystem checks cooking skill
- Better skill = better food quality
- Skill increases with practice

**New Behaviors**:
- Agents seek to improve skills
- Master cooks get reputation
- Teaching/learning recipes

### Large Features (Full Integration)

#### 6. **Complete Mood System**
From specs, full implementation of:
- MoodComponent with all factors
- Emotional state tracking
- History and patterns
- Integration with all systems

**Touches**:
- All components (needs, social, memory, reflection)
- All systems (behavior, decision-making)
- LLM prompts (include mood context)
- UI (show emotional state)

#### 7. **Food Preference System**
- PreferenceComponent
- Flavor profiles
- Learning from experiences
- Comfort foods

**Touches**:
- Food item definitions
- Eating behavior
- Memory formation
- Reflection system

#### 8. **Recipe Discovery System**
Full cooking research tree:
- Cuisine research tiers
- Culinary experiments
- Procedural recipe generation
- Signature dishes

**Touches**:
- Research system
- Crafting system
- Recipe registry
- LLM integration

---

## Recommended Implementation Order

### Phase 1: Foundation (Immediate)
1. ✅ Add `affinity` to RelationshipComponent
2. ✅ Add `recentMeals` tracking
3. ✅ Add optional `quality` to food items
4. ✅ Update eating to track meal history

**Deliverable**: Basic preference and quality groundwork

### Phase 2: Core Mood (Week 1)
5. ⬜ Create basic MoodComponent
6. ⬜ Create MoodSystem
7. ⬜ Integrate with NeedsSystem
8. ⬜ Integrate with social interactions
9. ⬜ Update LLM prompts to include mood

**Deliverable**: Agents have moods that change

### Phase 3: Food Depth (Week 2)
10. ⬜ Create PreferenceComponent
11. ⬜ Implement flavor preferences
12. ⬜ Detect variety/monotony
13. ⬜ Mood bonuses for good food
14. ⬜ Social meal detection

**Deliverable**: Food affects mood meaningfully

### Phase 4: Cooking Skill (Week 3)
15. ⬜ Create CookingSkillComponent
16. ⬜ Quality calculation system
17. ⬜ Skill progression
18. ⬜ Recipe familiarity bonuses

**Deliverable**: Cooking improves with practice

### Phase 5: Advanced Features (Week 4+)
19. ⬜ Cooking research tree (Cuisine I-V)
20. ⬜ Recipe experimentation
21. ⬜ Procedural recipe generation
22. ⬜ Signature dishes
23. ⬜ Cultural food traditions

**Deliverable**: Full cooking/mood/preference integration

---

## Breaking Changes Assessment

### Low Risk
- Adding fields to existing components (affinity, quality)
- New optional components (PreferenceComponent)
- New systems that don't modify existing ones

### Medium Risk
- Modifying food item definitions (need migration)
- Changing crafting behavior for cooking
- Adding mood to decision-making

### High Risk
- Fundamental behavior changes
- LLM prompt format changes
- Save/load compatibility

---

## Testing Strategy

### Unit Tests
- MoodComponent calculations
- Preference learning logic
- Quality calculation
- Skill progression

### Integration Tests
- Eating → mood change
- Social meal → relationship boost
- Cooking practice → skill increase
- Food variety → preference formation

### Playtest Scenarios
1. **The Picky Eater**: Agent develops strong preferences
2. **The Master Chef**: Agent specializes in cooking
3. **The Social Butterfly**: Mood boosted by shared meals
4. **The Lonely One**: Mood declines from isolation
5. **The Comfort Seeker**: Agent seeks favorite foods when sad

---

## Current Integration Score: 3/10

**What Works Well**:
- ✅ Needs system tracks physical state
- ✅ Memories have emotional encoding
- ✅ Personality affects base behavior
- ✅ Reflection creates narrative depth

**What's Missing**:
- ❌ No mood tracking or emotional state
- ❌ Emotions don't affect behavior
- ❌ Food is one-dimensional
- ❌ No social emotional bonds
- ❌ No preference learning
- ❌ No cooking depth

**Potential Score with Full Implementation**: 9/10
- Dynamic moods that evolve
- Meaningful food choices
- Deep social bonds
- Emergent culinary culture
- Rich emotional narratives

---

## Conclusion

The groundwork exists (needs, memory, personality, relationships), but **the connections are missing**. The specs add:

1. **MoodComponent** - Central emotional state
2. **Integration** - Systems talk to each other
3. **Depth** - Food/cooking/social become meaningful
4. **Emergence** - Stories arise naturally

**Key Insight**: You have the pieces, but they're islands. The mood system is the **bridge** that connects physical needs, social bonds, memories, and preferences into a cohesive emotional experience.

**Next Step**: Start with Phase 1 (foundation) - add the small pieces that enable bigger integration later.
