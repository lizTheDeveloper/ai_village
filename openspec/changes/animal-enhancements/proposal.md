# Proposal: Work Order: Animal System Enhancements

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/animal-enhancements

---

## Original Work Order

# Work Order: Animal System Enhancements

## Overview
Enhance the animal system to 100% spec coverage by adding breeding genetics, working animals (plow/guard/hunt), generated species for alien worlds, individual personalities, pack/herd social structures, and predator-prey ecology. Current coverage is approximately 50%.

## Spec Reference
- **Primary Spec:** `openspec/specs/animal-system/spec.md`
- **Phase:** Enhancement (not core roadmap phase)
- **Priority:** MEDIUM
- **Status:** READY_FOR_IMPLEMENTATION

## Dependencies
- **Animal System Foundation** ✅ (basic animals, taming, ownership already implemented)
- **Related Systems:**
  - Genetics System (for breeding mechanics)
  - AI System (for animal behavior and personality)
  - LLM System (for generated species descriptions)

## Requirements Summary

### Current Implementation (~50% coverage)
**Already Implemented:**
- ✅ Animal entities with basic stats (age, health, hunger, thirst)
- ✅ Life stages (infant, juvenile, adult, elder)
- ✅ Taming system (wild → tamed)
- ✅ Ownership tracking (ownerId, bondLevel, trustLevel)
- ✅ Basic reproduction (male/female, pregnancy)
- ✅ Basic behavior states (idle, eating, sleeping, fleeing)
- ✅ Animal species definitions (realistic animals)

### Missing Features (~50% to implement)

#### 1. Breeding Genetics
Animals inherit traits from parents with genetic variation:

```typescript
interface AnimalGenetics {
  // Physical traits
  size: GeneticTrait;
  strength: GeneticTrait;
  speed: GeneticTrait;
  health: GeneticTrait;
  lifespan: GeneticTrait;

  // Behavioral traits
  temperament: GeneticTrait;
  intelligence: GeneticTrait;
  trainability: GeneticTrait;

  // Cosmetic traits
  furColor: GeneticTrait;
  patterns: GeneticTrait[];

  // Special traits (rare mutations)
  mutations: Mutation[];
}

interface GeneticTrait {
  allele1: number;       // From parent 1 (0-100)
  allele2: number;       // From parent 2 (0-100)
  expression: number;    // Phenotype = (allele1 + allele2) / 2, plus dominance rules
  dominant?: boolean;    // Some traits are dominant
}

interface Mutation {
  traitAffected: string;
  effect: number;        // Modifier to trait
  beneficial: boolean;
  inheritChance: number; // Can pass to offspring
}

// Example: Breeding horses
const parent1 = { size: { allele1: 80, allele2: 75 } };  // Large horse
const parent2 = { size: { allele1: 60, allele2: 65 } };  // Medium horse
const offspring = inheritTrait(parent1.size, parent2.size);
// Result: { allele1: 80, allele2: 65, expression: 72.5 } - Large-medium horse
```

#### 2. Working Animals
Animals can be trained to perform tasks:

```typescript
interface WorkingAnimal {
  role: AnimalRole;
  skills: AnimalSkill[];
  currentTask?: WorkTask;
  efficiency: number;    // 0-100, how well they work
  stamina: number;       // 0-100, depletes while working
}

type AnimalRole =
  | 'plow'         // Farm work, tilling fields
  | 'guard'        // Protect area, alert to threats
  | 'hunt'         // Track and retrieve game
  | 'herd'         // Manage livestock
  | 'mount'        // Riding animal
  | 'pack'         // Carry supplies
  | 'rescue'       // Find lost people
  | 'war';         // Combat support

interface AnimalSkill {
  skillType: string;     // 'tracking', 'guarding', 'hauling'
  level: number;         // 0-100
  experience: number;    // Increases with use
}

interface WorkTask {
  taskType: AnimalRole;
  targetLocation?: Position;
  targetEntity?: string;
  duration: number;      // Ticks remaining
  energyCost: number;    // Stamina per tick
}

// Example: Guard dog
const guardDog = {
  role: 'guard',
  skills: [
    { skillType: 'alertness', level: 75, experience: 2000 },
    { skillType: 'intimidation', level: 60, experience: 1200 }
  ],
  efficiency: 70,
  stamina: 85
};
```

#### 3. Generated Species (for Alien Worlds)
Procedurally generate alien fauna:

```typescript
interface GeneratedSpecies extends AnimalSpecies {
  isGenerated: true;
  generatedFrom: GenerationContext;

  // LLM-generated description
  description: string;
  biologicalNiche: string;

  // Procedural traits
  bodyPlan: BodyPlan;
  uniqueAdaptations: Adaptation[];
}

interface GenerationContext {
  planetType: string;     // 'desert', 'ice', 'jungle', 'ocean', 'alien'
  biome: BiomeType;
  dangerLevel: number;    // 0-100, affects predator/prey ratio
  magicLevel: number;     // 0-100, affects magical creatures
  seed: number;           // For reproducibility
}

interface BodyPlan {
  limbs: number;
  locomotion: LocomotionType;
  sensoryOrgans: SensoryOrgan[];
  specialAppendages: Appendage[];
}

type LocomotionType = 'bipedal' | 'quadrupedal' | 'hexapodal' | 'serpentine' | 'winged' | 'tentacled' | 'floating';

interface Adaptation {
  name: string;
  description: string;
  mechanicalEffect: AdaptationEffect;
}

interface AdaptationEffect {
  type: string;          // 'temperature_resistance', 'night_vision', 'venom'
  magnitude: number;
}

// Example: Generate creature for ice planet
const icePlanetCreature = generateSpecies({
  planetType: 'ice',
  biome: 'tundra',
  dangerLevel: 60,
  magicLevel: 20,
  seed: 12345
});
// Result: "Frosthorn Stalker" - quadrupedal predator with thick fur,
// thermal vision, and antifreeze blood
```

#### 4. Individual Personalities
Each animal has unique personality traits:

```typescript
interface AnimalPersonality {
  traits: PersonalityTrait[];
  quirks: Quirk[];
  preferences: Preference[];
  relationships: Map<string, Relationship>;
}

interface PersonalityTrait {
  name: string;          // 'brave', 'curious', 'lazy', 'aggressive'
  intensity: number;     // 0-100, how strong this trait is
}

interface Quirk {
  name: string;          // 'steals_food', 'digs_holes', 'howls_at_moon'
  frequency: number;     // 0-1, how often it happens
  triggerConditions?: Condition[];
}

interface Preference {
  type: PreferenceType;
  target: string;        // Item, location, or entity ID
  strength: number;      // 0-100, how much they like/dislike
}

type PreferenceType = 'favorite_food' | 'favorite_spot' | 'favorite_person' | 'feared_object';

interface Relationship {
  targetId: string;      // Animal or agent ID
  affection: number;     // -100 to 100
  trust: number;         // 0-100
  history: Interaction[];
}

// Example: Individual cat personalities
const catA = {
  traits: [
    { name: 'curious', intensity: 85 },
    { name: 'independent', intensity: 70 }
  ],
  quirks: [
    { name: 'knocks_things_off_tables', frequency: 0.3 }
  ],
  preferences: [
    { type: 'favorite_spot', target: 'sunny_window', strength: 90 },
    { type: 'favorite_food', target: 'fish', strength: 95 }
  ]
};

const catB = {
  traits: [
    { name: 'affectionate', intensity: 90 },
    { name: 'lazy', intensity: 80 }
  ],
  quirks: [
    { name: 'purrs_constantly', frequency: 0.7 }
  ],
  preferences: [
    { type: 'favorite_person', target: 'agent_123', strength: 100 },
    { type: 'favorite_spot', target: 'warm_lap', strength: 95 }
  ]
};
```

#### 5. Pack/Herd Social Structures
Animals organize into social groups:

```typescript
interface AnimalGroup {
  id: string;
  groupType: GroupType;
  species: string;

  // Membership
  members: string[];     // Animal IDs
  leader?: string;
  hierarchy: Map<string, number>;  // Rank: 0 = leader, higher = subordinate

  // Territory
  territory?: Territory;

  // Behavior
  cohesion: number;      // 0-100, how tightly they stay together
  aggression: number;    // 0-100, toward outsiders
  cooperationLevel: number; // 0-100, how well they work together
}

type GroupType = 'pack' | 'herd' | 'flock' | 'pride' | 'colony' | 'pair';

interface Territory {
  center: Position;
  radius: number;
  defendRadius: number;  // Distance at which they become aggressive
  resourceClaims: string[]; // Water sources, food areas
}

interface PackBehavior {
  // Coordinated actions
  huntingStrategy: HuntingStrategy;
  defenseStrategy: DefenseStrategy;
  migrationPattern?: MigrationPattern;

  // Social bonds
  pairBonds: Map<string, string>;  // Mated pairs
  parentOffspring: Map<string, string[]>;
}

type HuntingStrategy = 'ambush' | 'pursuit' | 'surround' | 'relay' | 'solo';
type DefenseStrategy = 'circle_young' | 'scatter' | 'stand_ground' | 'mob_predator';

// Example: Wolf pack
const wolfPack = {
  groupType: 'pack',
  species: 'wolf',
  members: ['wolf_1', 'wolf_2', 'wolf_3', 'wolf_4', 'wolf_5'],
  leader: 'wolf_1',
  hierarchy: new Map([
    ['wolf_1', 0],  // Alpha
    ['wolf_2', 1],  // Beta
    ['wolf_3', 2],  // Adults
    ['wolf_4', 2],
    ['wolf_5', 3]   // Omega
  ]),
  territory: {
    center: { x: 100, y: 100 },
    radius: 50,
    defendRadius: 30
  },
  huntingStrategy: 'relay',  // Take turns chasing prey
  defenseStrategy: 'stand_ground'
};
```

#### 6. Predator-Prey Ecology
Animals interact in food webs:

```typescript
interface PredatorPrey {
  predators: PreyRelationship[];
  prey: PreyRelationship[];

  // Hunting behavior
  huntingBehavior?: HuntingBehavior;

  // Escape behavior
  escapeBehavior?: EscapeBehavior;
}

interface PreyRelationship {
  speciesId: string;
  preferenceLevel: number;  // 0-100, how much they prefer this prey
  successRate: number;      // 0-1, historical success
  dangerLevel: number;      // 0-100, risk to predator
}

interface HuntingBehavior {
  strategy: HuntingStrategy;
  packTactics: boolean;
  ambushLocations?: BiomeType[];  // Where they ambush
  pursuitSpeed: number;    // Tiles per tick
  pursuitStamina: number;  // How long they can chase
  killMethod: KillMethod;
}

type KillMethod = 'bite_neck' | 'suffocate' | 'venom' | 'crush' | 'pack_overwhelm';

interface EscapeBehavior {
  fleeDistance: number;    // Tiles to run when threatened
  fleeSpeed: number;       // Tiles per tick
  hidingStrategy?: HidingStrategy;
  groupDefense: boolean;   // Stand together vs scatter
  bluffBehavior?: BluffBehavior;
}

type HidingStrategy = 'burrow' | 'climb_tree' | 'water' | 'dense_vegetation' | 'play_dead';
type BluffBehavior = 'puff_up' | 'display_spines' | 'rattle' | 'hiss' | 'mock_charge';

// Example: Rabbit (prey)
const rabbit = {
  predators: [
    { speciesId: 'fox', preferenceLevel: 90, successRate: 0.4, dangerLevel: 95 },
    { speciesId: 'hawk', preferenceLevel: 85, successRate: 0.3, dangerLevel: 100 },
    { speciesId: 'wolf', preferenceLevel: 50, successRate: 0.6, dangerLevel: 100 }
  ],
  escapeBehavior: {
    fleeDistance: 30,
    fleeSpeed: 3,
    hidingStrategy: 'burrow',
    groupDefense: false  // Scatter when threatened
  }
};

// Example: Fox (predator)
const fox = {
  prey: [
    { speciesId: 'rabbit', preferenceLevel: 100, successRate: 0.4, dangerLevel: 5 },
    { speciesId: 'mouse', preferenceLevel: 70, successRate: 0.7, dangerLevel: 0 },
    { speciesId: 'chicken', preferenceLevel: 90, successRate: 0.8, dangerLevel: 10 }
  ],
  huntingBehavior: {
    strategy: 'ambush',
    packTactics: false,  // Solitary hunter
    ambushLocations: ['forest', 'grassland'],
    pursuitSpeed: 2.5,
    pursuitStamina: 200,  // Ticks
    killMethod: 'bite_neck'
  }
};
```

## Implementation Checklist

### Phase 1: Breeding Genetics
- [ ] Create `AnimalGenetics` interface and component
  - [ ] Physical traits (size, strength, speed, health, lifespan)
  - [ ] Behavioral traits (temperament, intelligence, trainability)
  - [ ] Cosmetic traits (fur color, patterns)
  - [ ] Mutation system
- [ ] Implement genetic inheritance
  - [ ] Allele selection from parents
  - [ ] Dominance rules
  - [ ] Mutation chance and effects
  - [ ] Trait expression calculation
- [ ] Add genetics to reproduction system
  - [ ] Generate offspring genetics from parents
  - [ ] Apply mutations randomly
  - [ ] Store genetics in offspring

### Phase 2: Working Animals
- [ ] Create `WorkingAnimal` component
  - [ ] Role assignment
  - [ ] Skill tracking
  - [ ] Task management
  - [ ] Efficiency and stamina
- [ ] Implement working animal behaviors
  - [ ] Plow: till fields faster than agents
  - [ ] Guard: detect threats, bark/alert
  - [ ] Hunt: track and retrieve game
  - [ ] Herd: manage livestock movement
  - [ ] Mount: carry agents faster
  - [ ] Pack: carry supplies
- [ ] Add training system
  - [ ] Train command (assign role)
  - [ ] Skill progression with experience
  - [ ] Trainability affects learning speed
- [ ] Create 5-10 working animal templates
  - [ ] Ox (plow)
  - [ ] Dog (guard, hunt)
  - [ ] Horse (mount, pack)
  - [ ] Falcon (hunt)
  - [ ] Sheepdog (herd)

### Phase 3: Generated Species
- [ ] Create species generation system
  - [ ] Input: GenerationContext (planet, biome, danger, magic)
  - [ ] Output: Complete AnimalSpecies definition
- [ ] Implement procedural body plans
  - [ ] Number of limbs
  - [ ] Locomotion type
  - [ ] Sensory organs
  - [ ] Special appendages (wings, tentacles, etc.)
- [ ] Use LLM for descriptions
  - [ ] Generate species name
  - [ ] Generate biological description
  - [ ] Generate ecological niche
  - [ ] Generate unique adaptations
- [ ] Add procedural adaptations
  - [ ] Temperature resistance
  - [ ] Special senses (echolocation, thermal vision)
  - [ ] Defensive mechanisms (venom, armor)
  - [ ] Mobility enhancements (flight, burrowing)
- [ ] Create generation templates by planet type
  - [ ] Earth-like: familiar animals
  - [ ] Desert: heat-adapted creatures
  - [ ] Ice: cold-resistant fauna
  - [ ] Jungle: arboreal and amphibious
  - [ ] Alien: bizarre and unique

### Phase 4: Individual Personalities
- [ ] Create `AnimalPersonality` component
  - [ ] Personality traits with intensity
  - [ ] Quirks with frequency
  - [ ] Preferences (favorites, fears)
  - [ ] Relationship tracking
- [ ] Implement personality generation
  - [ ] Random trait assignment at birth
  - [ ] Species-typical ranges (dogs more loyal than cats)
  - [ ] Genetic influence on temperament
- [ ] Add personality-driven behaviors
  - [ ] Brave animals don't flee easily
  - [ ] Curious animals explore more
  - [ ] Lazy animals rest more often
  - [ ] Aggressive animals attack more readily
- [ ] Implement quirks
  - [ ] Periodic quirk triggers
  - [ ] Condition-based quirks
  - [ ] Visual quirk effects (digging holes, howling)
- [ ] Add relationship system
  - [ ] Track interactions (positive/negative)
  - [ ] Update affection and trust
  - [ ] Relationship affects cooperation

### Phase 5: Pack/Herd Social Structures
- [ ] Create `AnimalGroup` system
  - [ ] Group formation (animals join groups)
  - [ ] Group membership tracking
  - [ ] Leadership and hierarchy
- [ ] Implement group behaviors
  - [ ] Movement cohesion (stay together)
  - [ ] Territory claiming and defense
  - [ ] Coordinated hunting (pack tactics)
  - [ ] Coordinated defense (protect young)
- [ ] Add social interactions
  - [ ] Dominance displays
  - [ ] Grooming/bonding
  - [ ] Play behavior (juveniles)
  - [ ] Mating rituals
- [ ] Implement group types
  - [ ] Packs (wolves, dogs)
  - [ ] Herds (deer, cattle)
  - [ ] Flocks (birds)
  - [ ] Prides (lions)
  - [ ] Colonies (bees, ants)

### Phase 6: Predator-Prey Ecology
- [ ] Add predator-prey relationships to species
  - [ ] Define prey species and preferences
  - [ ] Define predator species and danger levels
- [ ] Implement hunting behavior
  - [ ] Detect prey in range
  - [ ] Choose hunting strategy (ambush, pursuit, etc.)
  - [ ] Execute hunt (chase, attack, kill)
  - [ ] Pack coordination for group hunts
- [ ] Implement escape behavior
  - [ ] Detect predators (sight, sound, smell)
  - [ ] Flee to safety
  - [ ] Use hiding strategies
  - [ ] Group defense tactics
- [ ] Add population dynamics
  - [ ] Predators reduce prey population
  - [ ] Prey availability affects predator reproduction
  - [ ] Balance predator/prey ratios naturally
- [ ] Create food web for each biome
  - [ ] Primary producers (plants)
  - [ ] Herbivores (prey)
  - [ ] Predators (carnivores)
  - [ ] Apex predators

### Phase 7: Integration & Balance
- [ ] Integrate with existing systems
  - [ ] Taming system (check trainability)
  - [ ] Reproduction system (genetics inheritance)
  - [ ] AI system (personality affects decisions)
  - [ ] Combat system (predator attacks)
- [ ] Balance tuning
  - [ ] Working animal efficiency (useful but not overpowered)
  - [ ] Predator danger (challenging but survivable)
  - [ ] Breeding times and rates
  - [ ] Group sizes and territories

### Phase 8: Persistence
- [ ] Add serialization for new components
  - [ ] AnimalGenetics
  - [ ] WorkingAnimal
  - [ ] AnimalPersonality
  - [ ] AnimalGroup
- [ ] Handle migration for existing saves
  - [ ] Generate genetics for existing animals
  - [ ] Assign personalities
  - [ ] Form groups for social animals

### Phase 9: UI Enhancements
- [ ] Add genetics display to animal inspector
  - [ ] Show trait values
  - [ ] Show inherited alleles
  - [ ] Show mutations
- [ ] Add personality display
  - [ ] Show traits and quirks
  - [ ] Show preferences
  - [ ] Show relationships
- [ ] Add working animal controls
  - [ ] Assign role button
  - [ ] Task assignment
  - [ ] Skill progression display
- [ ] Add group visualization
  - [ ] Show pack/herd membership
  - [ ] Show hierarchy
  - [ ] Show territory boundaries

## Test Requirements

### Unit Tests
- [ ] Genetic inheritance calculations
- [ ] Personality trait generation
- [ ] Working animal skill progression
- [ ] Group formation and membership
- [ ] Predator-prey interaction logic

### Integration Tests
- [ ] Breed animals → offspring inherits traits
- [ ] Train animal → skills improve with use
- [ ] Generate species → complete valid definition
- [ ] Form pack → coordinated behavior
- [ ] Predator hunts prey → population dynamics

### Manual Tests
- [ ] Breed horses → fast parents produce fast offspring
- [ ] Train dog to guard → alerts to threats
- [ ] Generate creatures for ice planet → cold-adapted fauna
- [ ] Observe wolf pack → coordinated hunting
- [ ] Release rabbits and foxes → predator-prey balance

## Acceptance Criteria

1. **Animals inherit traits** from parents with genetic variation
2. **Working animals** can be trained to perform useful tasks
3. **Generated species** are unique and appropriate to planet/biome
4. **Personalities make animals feel individual** and memorable
5. **Social structures** (packs, herds) exhibit coordinated behavior
6. **Predator-prey dynamics** create realistic ecosystems
7. **Integration with existing systems** seamless
8. **UI displays genetics, personality, and roles** clearly
9. **Balance is fun** - animals are useful/challenging but not overpowered
10. **Persistence works** - all new data saves/loads correctly

## Definition of Done

- [ ] All implementation checklist items completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Spec coverage increased to ~100%
- [ ] Documentation updated
- [ ] No performance regression
- [ ] Committed to version control

## Estimated Effort
- **Lines of Code:** ~2,000 LOC
- **Time Estimate:** 20-25 hours
- **Complexity:** Medium-High (genetics, AI behavior, LLM generation)

## Notes
- **Genetics is foundation** - implement first to support breeding
- **Working animals provide utility** - high player value
- **Generated species enable alien worlds** - multiverse readiness
- **Personalities make animals memorable** - emotional attachment
- **Predator-prey creates living world** - emergent ecosystem
- Future enhancements: Animal diseases, domestication (wild → domestic over generations), animal companions (bonds with specific agents)


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
