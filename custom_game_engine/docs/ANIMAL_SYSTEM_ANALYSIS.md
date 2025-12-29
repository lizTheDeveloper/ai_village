# Animal System Analysis & Spec

## Current State: What EXISTS ✅

### AnimalComponent (Fully Implemented)
```typescript
{
  // Identity
  id, speciesId, name, position

  // Life cycle
  age: number;              // Days old
  lifeStage: 'infant' | 'juvenile' | 'adult' | 'elder'

  // Physical state
  health: number;           // 0-100
  size: number;             // Rendering multiplier

  // Needs (like agents!)
  hunger: number;           // 0-100
  thirst: number;           // 0-100
  energy: number;           // 0-100

  // Emotional state
  stress: number;           // 0-100
  mood: number;             // 0-100 (animals HAVE moods!)

  // Taming/bonding
  wild: boolean;
  ownerId?: string;
  bondLevel: number;        // 0-100
  trustLevel: number;       // 0-100

  // Housing
  housingBuildingId?: string;
}
```

**Status**: ✅ Rich, well-designed component

### Animal Species (10 Species Defined)

**Livestock**: chicken, cow, sheep, pig, goat
**Pets**: dog, cat, rabbit
**Working**: horse
**Wild**: deer

Each species has:
- Temperament (docile, skittish, aggressive, friendly, neutral)
- Diet (herbivore, carnivore, omnivore)
- Social structure (solitary, pair, herd, pack, flock)
- Activity pattern (diurnal, nocturnal, crepuscular)
- Life stages with durations
- Temperature comfort range
- Taming difficulty
- Preferred foods
- Spawn biomes

**Status**: ✅ Comprehensive species system

### Animal Products (Implemented)

- **Eggs** (chicken) - periodic, 1/day
- **Milk** (cow, goat) - continuous (player action)
- **Wool** (sheep) - periodic, 90 days
- **Fur** (rabbit) - terminal (on death)

Products have quality based on:
- Health (30-40%)
- Bond level (10-20%)
- Diet quality (30%)
- Genetics (20%)

**Status**: ✅ Product system working

### Systems Implemented

1. **TamingSystem** ✅
   - Taming methods: feeding, patience, rescue, raising
   - Interaction types: feeding, grooming, playing, rescuing, training
   - Success chance based on difficulty, method, trust, items

2. **AnimalProductionSystem** ✅
   - Periodic products (eggs, wool)
   - Continuous products (milking - player initiated)
   - Terminal products (butchering)
   - Quality calculation

3. **AnimalSystem** ✅
   - Life cycle management
   - Needs decay
   - Aging

4. **AnimalHousingSystem** ✅
   - Shelter management
   - Housing capacity
   - Environmental protection

5. **WildAnimalSpawningSystem** ✅
   - Biome-based spawning
   - Population control

**Status**: ✅ Core systems functional

---

## What's MISSING ❌

### 1. Breeding & Reproduction ❌

**Test mentions it**:
```typescript
// From AnimalHusbandryCycle.integration.test.ts:19
// - Breeding produces offspring
```

**But NOT implemented**:
- No mating mechanics
- No pregnancy/gestation
- No offspring generation
- No genetic inheritance
- No breeding selection

### 2. Hunting System ❌

**Current**: No hunting at all
**Needed**:
- Track wild animals
- Hunting skills
- Success/failure mechanics
- Butchering
- Meat/hide harvesting
- Ethical considerations (kill vs tame)

### 3. Deep Animal Bonds ❌

**Current**: Basic bondLevel number
**Missing**:
- Bond affects agent mood
- Animals remember their person
- Emotional attachment
- Grief when animal dies
- Joy when bonding succeeds
- Animals as companions in memories/reflections

### 4. Working Animals ❌

**Current**: `canBeWorking` flag exists
**Missing**:
- Horses for riding/transport
- Dogs for guarding/hunting
- Oxen/cows for plowing
- Pack animals for hauling
- Work fatigue/rest

### 5. Animal Behavior AI ❌

**Current**: Basic states (idle, sleeping, eating, drinking, foraging, fleeing)
**Missing**:
- Animal behaviors/AI
- Grazing patterns
- Social interactions (herd behavior)
- Predator/prey relationships
- Territorial behavior
- Mating displays

### 6. Veterinary Care ❌

**Current**: Health number exists
**Missing**:
- Illness/disease
- Injury from predators/accidents
- Healing/treatment
- Medication
- Veterinary skill

### 7. Emotional Impact on Agents ❌

**Current**: Animals have moods, but don't affect agent moods
**Missing**:
- Bonding with pet boosts mood
- Losing animal causes grief
- Pride in successful breeding
- Frustration with difficult animals
- Shared experiences creating memories

---

## Integration Gaps

### Gap 1: Animals Have Moods But Nothing Uses Them ⚠️

```typescript
// AnimalComponent has:
stress: number;  // 0-100
mood: number;    // 0-100

// But nothing reads or updates them meaningfully
// Mood should affect:
// - Product quality (happy chickens lay better eggs)
// - Behavior (stressed animals flee/attack)
// - Bonding success (happy animals easier to tame)
// - Health (chronic stress = health decline)
```

### Gap 2: Bonding Doesn't Affect Agent Emotions ⚠️

```typescript
// Current: bondLevel is just a number
// Should be:
agent.mood += bondIncrease * 5;  // Joy from bonding
agent.createMemory({
  type: 'meaningful',
  content: 'My bond with Bessie grew stronger today',
  emotionalValence: 0.8
});
```

### Gap 3: No Animal Death Impact ⚠️

```typescript
// When tamed animal dies:
// Current: Just despawns
// Should:
if (animal.bondLevel > 50) {
  agent.mood -= 30;  // Grief
  agent.createMemory({
    type: 'traumatic',
    content: `${animal.name} passed away. I'll miss them.`,
    emotionalValence: -0.9
  });
  agent.preferences.comfortFoods.push('stew'); // Seek comfort
}
```

### Gap 4: No Hunting Ethics/Narrative ⚠️

**Needed for depth**:
```typescript
// Agent must decide: hunt or tame?
const decision = await llm.decide({
  context: "You see a rabbit. You're hungry but it looks friendly.",
  options: [
    { action: 'hunt', reason: 'Need food to survive' },
    { action: 'tame', reason: 'Could be a companion' },
    { action: 'leave', reason: 'Not worth the effort' }
  ],
  personality: agent.personality,
  mood: agent.mood,
  hunger: agent.needs.hunger
});

// Creates moral complexity and emergent stories
```

---

## Proposed Additions

### ADDITION 1: Breeding & Reproduction System

```typescript
interface BreedingComponent {
  // Reproductive state
  fertile: boolean;
  gestating: boolean;
  gestationDaysLeft?: number;

  // Genetics (for inheritance)
  genetics: {
    size: number;      // 0-100
    health: number;    // 0-100
    temperament: number; // 0-100
    productivity: number; // 0-100 (egg/milk production)
  };

  // Breeding history
  timesBreed: number;
  offspring: string[]; // IDs of children
  parents: {
    mother?: string;
    father?: string;
  };

  // Breeding preferences
  lastBreedTime: number;
  breedCooldown: number; // Days until can breed again
}

// Breeding mechanics
function attemptBreeding(
  animal1: AnimalComponent,
  animal2: AnimalComponent
): BreedingResult {
  // Check compatibility
  if (animal1.speciesId !== animal2.speciesId) {
    return { success: false, reason: 'Different species' };
  }

  // Check life stage (must be adults)
  if (animal1.lifeStage !== 'adult' || animal2.lifeStage !== 'adult') {
    return { success: false, reason: 'Not mature enough' };
  }

  // Check health
  if (animal1.health < 60 || animal2.health < 60) {
    return { success: false, reason: 'Health too low' };
  }

  // Check mood (happy animals breed better)
  const moodBonus = (animal1.mood + animal2.mood) / 2;
  const baseChance = 30 + moodBonus * 0.5; // 30-80%

  if (Math.random() * 100 < baseChance) {
    // Success! Start gestation
    const mother = animal1; // Assume female
    const species = getAnimalSpecies(mother.speciesId);

    mother.breeding.gestating = true;
    mother.breeding.gestationDaysLeft = species.gestationPeriod;

    return {
      success: true,
      message: `${animal1.name} and ${animal2.name} are expecting!`
    };
  }

  return { success: false, reason: 'Breeding unsuccessful' };
}

// Birth mechanics
function giveBirth(
  mother: AnimalComponent,
  father: AnimalComponent
): AnimalComponent {
  // Generate offspring genetics (inheritance)
  const offspring = createOffspring({
    mother: mother.breeding.genetics,
    father: father.breeding.genetics,
    species: mother.speciesId
  });

  // Create memory for owner
  if (mother.ownerId) {
    createAgentMemory(mother.ownerId, {
      type: 'joyful',
      content: `${mother.name} gave birth to ${offspring.name}!`,
      emotionalValence: 0.9,
      emotionalIntensity: 0.8
    });
  }

  return offspring;
}

// Genetic inheritance
function createOffspring(params: {
  mother: Genetics;
  father: Genetics;
  species: string;
}): AnimalComponent {
  // Blend genetics with some randomness
  const genetics = {
    size: blend(params.mother.size, params.father.size, 0.1),
    health: blend(params.mother.health, params.father.health, 0.1),
    temperament: blend(params.mother.temperament, params.father.temperament, 0.15),
    productivity: blend(params.mother.productivity, params.father.productivity, 0.1)
  };

  // Rare mutations
  if (Math.random() < 0.05) {
    genetics.productivity += 20; // Exceptional producer!
  }

  return createAnimal({
    speciesId: params.species,
    lifeStage: 'infant',
    genetics
  });
}

// Helper for genetic blending
function blend(a: number, b: number, variance: number): number {
  const average = (a + b) / 2;
  const mutation = (Math.random() - 0.5) * variance * 100;
  return Math.max(0, Math.min(100, average + mutation));
}
```

**Story Impact**:
- Agents become breeders, selectively breeding for traits
- "My best milk cow came from Bessie and Bruno"
- Generational lineages and pedigrees
- Pride in breeding accomplishments
- Selling/trading breeding stock

---

### ADDITION 2: Hunting System

```typescript
interface HuntingAction {
  hunter: Entity;
  target: AnimalComponent;
  weapon?: string;
  skill: number; // 0-100
}

function attemptHunt(hunt: HuntingAction): HuntResult {
  const target = hunt.target;
  const species = getAnimalSpecies(target.speciesId);

  // Base difficulty
  let difficulty = 50;

  // Temperament affects difficulty
  if (species.temperament === 'aggressive') difficulty += 30;
  if (species.temperament === 'skittish') difficulty += 20;

  // Speed affects difficulty
  difficulty += species.baseSpeed * 5;

  // Skill reduces difficulty
  const finalDifficulty = Math.max(10, difficulty - hunt.skill);

  // Success roll
  const success = Math.random() * 100 < (100 - finalDifficulty);

  if (success) {
    // Kill animal, harvest products
    const loot = harvestAnimal(target);

    // Emotional impact
    if (hunt.hunter.personality.empathy > 70) {
      // Empathetic hunters feel bad
      hunt.hunter.mood -= 15;
      hunt.hunter.createMemory({
        type: 'conflicted',
        content: `I had to hunt ${target.name}. Survival isn't easy.`,
        emotionalValence: -0.3
      });
    } else {
      // Successful hunt = pride
      hunt.hunter.mood += 5;
    }

    return { success: true, loot };
  }

  // Failed hunt
  target.stress = 100; // Animal panics
  target.state = 'fleeing';

  return { success: false, reason: 'Target escaped' };
}

function harvestAnimal(animal: AnimalComponent): Item[] {
  const species = getAnimalSpecies(animal.speciesId);
  const loot: Item[] = [];

  // Meat (amount based on size and health)
  const meatAmount = Math.floor(
    animal.size * (animal.health / 100) * 3
  );
  loot.push({ id: 'raw_meat', amount: meatAmount });

  // Hide/fur (quality based on health)
  const hideQuality = animal.health;
  loot.push({ id: `${species.id}_hide`, amount: 1, quality: hideQuality });

  // Terminal products (fur, feathers, etc.)
  const terminalProducts = getProductsForSpecies(animal.speciesId)
    .filter(p => p.productionType === 'terminal');

  for (const product of terminalProducts) {
    loot.push({ id: product.itemId, amount: 1 });
  }

  return loot;
}
```

**Moral Complexity**:
```typescript
// LLM decision for hunting
const decision = await llm.decide({
  situation: `
You see a deer in the forest. You're hungry (hunger: ${agent.hunger}/100).
You could hunt it for meat, but you also have some berries.
The deer looks peaceful and unafraid.

Your personality: ${getPersonalityDescription(agent.personality)}
Your recent experience: ${agent.hadRecentTrauma ? 'Still affected by loss' : 'Stable'}
  `,
  options: [
    'Hunt the deer for meat',
    'Leave it in peace, eat berries instead',
    'Try to tame it as a companion'
  ]
});

// Creates emergent narratives:
// - Pacifist who never hunts
// - Pragmatist who hunts only when needed
// - Hunter who sees it as sport/duty
// - Someone who regrets their first kill
```

---

### ADDITION 3: Deep Animal Bonds & Emotional Impact

```typescript
// Extend RelationshipComponent for animals
interface AnimalBondMemory {
  animalId: string;
  animalName: string;
  speciesId: string;
  bondLevel: number;
  sharedExperiences: string[];
  firstMet: number;
  bondMilestones: Array<{
    level: number;
    timestamp: number;
    event: string;
  }>;
}

// Bond milestones
const BOND_MILESTONES = [
  { level: 20, event: 'trust_established', mood: 5 },
  { level: 40, event: 'companionship_formed', mood: 10 },
  { level: 60, event: 'deep_bond', mood: 15 },
  { level: 80, event: 'inseparable', mood: 20 },
  { level: 100, event: 'life_partner', mood: 30 }
];

// When bond increases
function onBondIncrease(
  agent: Agent,
  animal: AnimalComponent,
  oldBond: number,
  newBond: number
) {
  // Check for milestone crossed
  const milestone = BOND_MILESTONES.find(
    m => oldBond < m.level && newBond >= m.level
  );

  if (milestone) {
    agent.mood += milestone.mood;

    agent.createMemory({
      type: 'meaningful',
      content: `My bond with ${animal.name} has grown so strong. ${getMilestoneText(milestone.event)}`,
      emotionalValence: 0.8,
      emotionalIntensity: 0.7,
      associatedEntities: [animal.id]
    });

    // Reflection
    agent.queueReflection({
      type: 'post_event',
      prompt: `Reflect on your growing bond with ${animal.name}, a ${animal.speciesId}.`
    });
  }
}

// Daily mood bonus from bonded animals
function calculateAnimalMoodBonus(agent: Agent): number {
  let bonus = 0;

  const bondedAnimals = world.getAnimals().filter(
    a => a.ownerId === agent.id && a.bondLevel > 40
  );

  for (const animal of bondedAnimals) {
    // Each bonded animal provides mood boost
    const bondBonus = (animal.bondLevel / 100) * 10; // Up to +10 per animal

    // Healthier, happier animals provide more mood boost
    const healthMod = (animal.health / 100) * 0.5;
    const moodMod = (animal.mood / 100) * 0.5;

    bonus += bondBonus * (healthMod + moodMod);
  }

  return Math.min(30, bonus); // Cap at +30 total
}

// When animal dies
function onAnimalDeath(agent: Agent, animal: AnimalComponent) {
  if (!animal.ownerId || animal.ownerId !== agent.id) return;

  const bondStrength = animal.bondLevel;

  if (bondStrength < 20) {
    // Barely knew them
    agent.mood -= 5;
  } else if (bondStrength < 50) {
    // Sad but manageable
    agent.mood -= 15;
    agent.createMemory({
      type: 'sad',
      content: `${animal.name} passed away. I'll miss them.`,
      emotionalValence: -0.6,
      emotionalIntensity: 0.5
    });
  } else {
    // Deep bond - real grief
    agent.mood -= 40;
    agent.stress += 30;

    agent.createMemory({
      type: 'traumatic',
      content: `${animal.name} died today. We were together for ${calculateYears(animal.age)}. I don't know how to go on without them.`,
      emotionalValence: -0.9,
      emotionalIntensity: 0.9,
      associatedEntities: [animal.id]
    });

    // Trigger grief behavior
    agent.behaviorQueue.addUrgent({
      type: 'grieve',
      target: animal.id,
      duration: 3 // days
    });

    // Seek comfort
    agent.preferences.seekingComfort = true;

    // Reflection on loss
    agent.queueReflection({
      type: 'deep',
      prompt: `Reflect on the loss of ${animal.name}, your companion of ${calculateYears(animal.age)}.`
    });
  }
}
```

**Story Impact**:
- "My dog Rufus has been with me for 5 years. He's family."
- "I lost Bessie today. She was my first cow. I'm heartbroken."
- "Shadow is getting old. I dread the day..."
- Agents form real attachments
- Animals become characters in their own right

---

### ADDITION 4: Working Animals

```typescript
interface WorkingAnimalComponent extends Component {
  type: 'working_animal';

  workType: 'riding' | 'plowing' | 'hauling' | 'guarding' | 'hunting';
  workSkill: number; // 0-100, improves with training
  workFatigue: number; // 0-100, increases with work

  // Riding specific
  ridingComfort: number; // Affects rider fatigue
  ridingSpeed: number; // Multiplier on base speed

  // Work specific
  plowEfficiency: number; // How fast they plow
  haulCapacity: number; // How much they can carry
  guardVigilance: number; // Detection range
  huntingAbility: number; // Success chance

  // Training
  trainedCommands: string[];
  trainingProgress: Map<string, number>;

  // Bonding affects work
  worksWillingly: boolean; // Based on bond
}

// Working creates bonding
function performWork(
  agent: Agent,
  animal: WorkingAnimalComponent,
  workType: string
): WorkResult {
  // Fatigued animals resist
  if (animal.workFatigue > 80) {
    if (animal.bondLevel < 50) {
      return { success: false, reason: 'Animal refused, too tired' };
    }
  }

  // Low bond = poor cooperation
  const cooperationMod = animal.bondLevel / 100;
  const efficiency = animal.workSkill * cooperationMod;

  // Work increases fatigue
  animal.workFatigue += 20;

  // Work increases bond (working together)
  if (animal.worksWillingly) {
    animal.bondLevel += 2;

    // Positive memory
    agent.createMemory({
      type: 'satisfying',
      content: `${animal.name} and I worked well together today.`,
      emotionalValence: 0.4
    });
  }

  // Skill improves with practice
  animal.workSkill = Math.min(100, animal.workSkill + 0.5);

  return {
    success: true,
    efficiency,
    message: `${animal.name} worked ${efficiency > 70 ? 'excellently' : 'adequately'}`
  };
}

// Riding mechanics
function rideAnimal(
  rider: Agent,
  mount: WorkingAnimalComponent
): RideEffect {
  // Bond required
  if (mount.bondLevel < 40) {
    return { success: false, reason: 'Animal not bonded enough to ride' };
  }

  // Apply speed boost
  rider.movementSpeed *= mount.ridingSpeed;

  // Reduce rider fatigue (comfortable ride)
  const comfortMod = mount.ridingComfort / 100;
  rider.energyDecayRate *= (1 - comfortMod * 0.5); // Up to 50% less fatigue

  // Increase mount fatigue
  mount.workFatigue += 10 / hour;

  // Bonding experience
  mount.bondLevel += 1 / hour; // Slow but steady

  return { success: true, speedBonus: mount.ridingSpeed };
}
```

**Story Impact**:
- "My horse Shadowmere is the fastest in the village"
- "Rex helped me guard the chickens from foxes"
- "Old Bess pulled the plow for 10 years. Time to let her rest."
- Work creates partnership, not just utility

---

## Emergent Narrative Examples

### Example 1: The Breeder
```
Agent starts with wild chickens
→ Tames several
→ Breeds best egg layers
→ After 3 generations, has exceptional chickens
→ Reputation: "Best eggs in the village"
→ Teaches others breeding techniques
→ Community benefits from their work
```

### Example 2: The Hunter's Regret
```
Agent hunts deer for survival
→ Successful kill, gets meat
→ But feels guilty (high empathy personality)
→ Reflects: "I had to, but I didn't enjoy it"
→ Tries to tame next deer instead
→ Becomes known for protecting wildlife
→ Eventually refuses to hunt
```

### Example 3: The Companion
```
Agent tames stray dog as puppy
→ Bond grows over years
→ Dog guards their home
→ Dog helps hunt
→ Agent creates memories: "Adventures with Rex"
→ Dog gets old, sick
→ Agent cares for elderly dog despite low productivity
→ Dog dies
→ Agent grieves deeply
→ Eventually gets new puppy, names it after Rex
→ "Rex II will never replace Rex, but honor him"
```

### Example 4: The Pragmatist
```
Agent breeds rabbits for meat
→ No emotional attachment
→ Efficient operation
→ Sells meat to village
→ Other agents judge: "How can you eat them?"
→ Agent defends: "It's practical, they're livestock"
→ Creates tension in community
→ Some agree, some disagree
→ Emergent ethical debate
```

---

## Implementation Recommendations

### Phase 1: Emotional Integration (Week 1)
1. ✅ Animal mood affects behavior
2. ✅ Animal bond affects agent mood
3. ✅ Death creates grief
4. ✅ LLM context includes animal bonds

### Phase 2: Breeding System (Week 2)
5. ⬜ Breeding mechanics
6. ⬜ Gestation/birth
7. ⬜ Genetic inheritance
8. ⬜ Selective breeding

### Phase 3: Hunting (Week 3)
9. ⬜ Basic hunting mechanics
10. ⬜ Success/failure calculation
11. ⬜ Harvesting products
12. ⬜ Moral/emotional impact

### Phase 4: Working Animals (Week 4)
13. ⬜ Riding mechanics
14. ⬜ Plow/hauling
15. ⬜ Guard/hunting assistance
16. ⬜ Training progression

### Phase 5: Advanced (Ongoing)
17. ⬜ Animal behavior AI (grazing, herding)
18. ⬜ Veterinary care/illness
19. ⬜ Predator/prey ecology
20. ⬜ Animal shows/competitions

---

## Integration Score: 6/10

**What Works**:
- ✅ Comprehensive species system
- ✅ Taming mechanics
- ✅ Product generation
- ✅ Housing system
- ✅ Animals have moods/stress

**What's Missing**:
- ❌ No breeding/reproduction
- ❌ No hunting
- ❌ Bonds don't affect agent emotions
- ❌ Animals don't impact agent mood
- ❌ No working animal mechanics
- ❌ Death has no emotional impact

**Potential Score**: 9/10 with full integration

---

## Conclusion

The animal system has **excellent bones** but lacks **emotional depth and gameplay loops**.

**Key Missing Piece**: Like the mood system, the animal system exists in isolation. Animals have moods, bonds, and life cycles, but these don't integrate with agent emotions, memories, or narratives.

**The Fix**:
1. Make bonds matter emotionally (joy, grief, pride)
2. Add breeding for progression and legacy
3. Add hunting for survival and moral complexity
4. Make working animals valuable partners
5. Integrate with mood/memory/reflection systems

**The Payoff**: Transform animals from "resource generators" into **characters** - companions, partners, sources of joy and grief, subjects of memories and reflections. Every animal becomes a potential story.
