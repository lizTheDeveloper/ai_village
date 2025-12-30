# Realm Species & Divine Creation System

## Current State & Implementation Path

### What Exists Now

The game currently has:
- **One world** - A single map with agents, buildings, resources
- **Agents** - Villagers with needs, memory, behaviors, skills
- **No realms** - `MythologicalRealms.ts` has types/interfaces but no runtime system
- **No multiverse** - `MultiverseCrossing.ts` has types but no runtime
- **No divinity simulation** - Specs exist for divine communication, angels, but not implemented
- **No faith/spirituality** - Agents don't have prayer/faith components yet

### Implementation Dependency Chain

```
CURRENT STATE (Village Sim)
        │
        ▼
┌─────────────────────────────────┐
│ LAYER 1: Divine Foundation      │  ← Build this first
│ - Faith/Spirituality Component  │
│ - Prayer System                 │
│ - Divine Communication          │
│ - Presence Spectrum (basic)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ LAYER 2: Realm System           │  ← Then this
│ - Realm as "alternate map"      │
│ - Portal entities in world      │
│ - Realm transition mechanics    │
│ - Time dilation effects         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ LAYER 3: Realm Inhabitants      │  ← Then this
│ - Species/Race templates        │
│ - Realm-bound entities          │
│ - Native vs visitor distinction │
│ - Known mythological races      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ LAYER 4: Divine Creation        │  ← Late game
│ - Race creation by presences    │
│ - Realm creation by presences   │
│ - Species modification          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ LAYER 5: Cosmic Creation        │  ← Hyper-endgame
│ - Planet creation               │
│ - Universe seeding              │
│ - Multiverse mechanics          │
└─────────────────────────────────┘
```

---

## Part 1: Known Mythological Races (Data Layer)

Even without runtime realms, we can define the **data** for known races. This becomes useful when realms are implemented.

### Why Define Races Now?

1. **Templates for agents** - Race traits can influence agent generation
2. **Lore foundation** - Establishes the mythological vocabulary
3. **Ready for realms** - When realms exist, races are ready to populate them
4. **Player expectations** - Known mythology creates familiar touchpoints

### Race Data Structure

```typescript
interface RaceTemplate {
  id: string;
  name: string;
  description: string;

  // Which realm preset is this race native to?
  nativeRealm: RealmPreset | 'mortal_world';

  // Classification
  type: 'mortal' | 'spirit' | 'fae' | 'divine' | 'construct' | 'undead' | 'elemental';
  category: 'humanoid' | 'beast' | 'elemental' | 'abstract' | 'insectoid' |
            'serpentine' | 'aquatic' | 'amorphous' | 'crystalline' | 'gaseous' |
            'plant' | 'machine';

  // Lifespan
  lifespan: 'mortal' | 'long_lived' | 'ageless' | 'immortal';
  lifespanYears?: number;  // If mortal or long_lived

  // Traits that affect gameplay
  innateTraits: RacialTrait[];

  // Body plan - defines physical form (see Body Plan section)
  bodyPlan?: BodyPlan;

  // Can this race interbreed with others?
  canHybridize: boolean;
  hybridCompatible: string[];  // Other race IDs

  // Realm dependency
  realmBound: boolean;          // Must stay in native realm?
  canSurviveMortalWorld: boolean;
  mortalWorldWeakness?: string; // What happens outside realm

  // Social defaults
  typicalAlignment?: 'lawful' | 'neutral' | 'chaotic';
  societyType?: string;
}
```

### Body Plan System

The body plan defines the physical form of a race. This extends the existing body-parts-system.md spec to support non-humanoid forms.

```typescript
interface BodyPlan {
  // Base body type (determines default parts)
  baseType: RaceCategory;

  // Symmetry: bilateral (like humans), radial (like starfish), etc.
  symmetry: 'bilateral' | 'radial' | 'asymmetric' | 'none';

  // Limb counts (overrides baseType defaults)
  limbs?: {
    arms?: number;      // 0-8+
    legs?: number;      // 0-8+
    wings?: number;     // 0-4+
    tentacles?: number; // 0-many
    tails?: number;     // 0-many
  };

  // Special organs beyond the standard set
  specialOrgans?: SpecialOrgan[];

  // Natural weapons (tusks, claws, horns, fangs, stingers)
  naturalWeapons?: NaturalWeapon[];

  // Natural armor (scales, chitin, shell, hide)
  naturalArmor?: {
    type: 'scales' | 'chitin' | 'shell' | 'hide' | 'fur' | 'feathers' | 'bark' | 'crystal' | 'none';
    value: number;     // Damage reduction
    coverage: number;  // 0-1 coverage percentage
  };

  // Sensory organs
  senses?: {
    eyes?: { count: number; type: 'simple' | 'compound' | 'infrared' | 'ultraviolet' };
    ears?: { count: number; type: 'standard' | 'echolocation' | 'infrasound' };
    antennae?: number;
    heatPits?: boolean;  // Snake-like heat sensing
    electroreception?: boolean;  // Shark-like electrical sensing
  };

  // Movement capabilities
  movement?: {
    walk?: boolean;
    run?: boolean;
    swim?: boolean;
    fly?: boolean;
    burrow?: boolean;
    slither?: boolean;
    teleport?: boolean;
  };

  // Size category
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';

  // Blood type (affects bleeding, medical treatment)
  blood?: 'red' | 'blue' | 'green' | 'ichor' | 'sap' | 'none';

  // Skeleton type (affects injuries, armor)
  skeleton?: 'internal' | 'exoskeleton' | 'hydrostatic' | 'none';
}

interface SpecialOrgan {
  id: string;
  name: string;
  function: 'circulation' | 'respiration' | 'digestion' | 'venom' |
            'silk' | 'electricity' | 'photosynthesis' | 'bioluminescence' |
            'sonar' | 'magic_focus';
  effects?: {
    redundancy?: number;       // Two hearts = harder to kill
    produces?: string;         // Venom glands produce 'venom'
    enablesAbility?: string;   // Enables 'echolocation'
    needsModifier?: Record<string, number>;  // Affects hunger, etc.
  };
}

interface NaturalWeapon {
  name: string;  // "Tusks", "Claws", "Horns"
  type: 'piercing' | 'slashing' | 'bludgeoning' | 'acid' | 'fire' | 'cold' | 'psychic';
  damage: number;
  reach?: number;
}
```

### Example: Alien Race with Custom Body Plan

```typescript
const THRAKEEN_RACE: RaceTemplate = {
  id: 'thrakeen',
  name: 'Thrakeen',
  description: 'Four-armed insectoid traders from the Crystal Spires',
  nativeRealm: 'mortal_world',
  type: 'mortal',
  category: 'insectoid',
  lifespan: 'long_lived',
  lifespanYears: 200,

  bodyPlan: {
    baseType: 'insectoid',
    symmetry: 'bilateral',
    limbs: {
      arms: 4,       // Four arms for tool use
      legs: 2,       // Bipedal
    },
    specialOrgans: [
      {
        id: 'dual_hearts',
        name: 'Dual Hearts',
        function: 'circulation',
        effects: { redundancy: 2 },  // Can survive losing one heart
      },
      {
        id: 'chromatophores',
        name: 'Chromatophores',
        function: 'bioluminescence',
        effects: { enablesAbility: 'color_communication' },
      },
    ],
    naturalArmor: {
      type: 'chitin',
      value: 5,
      coverage: 0.8,
    },
    senses: {
      eyes: { count: 4, type: 'compound' },
      antennae: 2,
    },
    movement: { walk: true, run: true, climb: true },
    size: 'medium',
    blood: 'blue',
    skeleton: 'exoskeleton',
  },

  innateTraits: [
    {
      id: 'extra_arms',
      name: 'Extra Arms',
      category: 'physical',
      description: 'Four arms enable simultaneous tool use',
      effects: {
        skillAffinityBonus: { crafting: 0.3, building: 0.2 },
      },
    },
    {
      id: 'compound_eyes',
      name: 'Compound Eyes',
      category: 'sensory',
      description: 'Wide field of vision, motion detection',
      effects: {
        abilitiesGranted: ['360_vision', 'motion_detection'],
      },
    },
  ],

  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
};
```

### Example: Race with Natural Weapons

```typescript
const ORC_RACE: RaceTemplate = {
  id: 'orc',
  name: 'Orc',
  description: 'Tusked warriors of the steppes',
  nativeRealm: 'mortal_world',
  type: 'mortal',
  category: 'humanoid',
  lifespan: 'mortal',
  lifespanYears: 60,

  bodyPlan: {
    baseType: 'humanoid',
    symmetry: 'bilateral',
    naturalWeapons: [
      {
        name: 'Tusks',
        type: 'piercing',
        damage: 8,
      },
    ],
    naturalArmor: {
      type: 'hide',
      value: 2,
      coverage: 0.6,
    },
    senses: {
      eyes: { count: 2, type: 'simple' },
    },
    movement: { walk: true, run: true },
    size: 'large',
    blood: 'red',
    skeleton: 'internal',
  },

  innateTraits: [
    {
      id: 'tusked',
      name: 'Tusked',
      category: 'physical',
      description: 'Natural piercing weapons',
      effects: {
        abilitiesGranted: ['tusk_attack'],
        skillAffinityBonus: { combat: 0.2 },
      },
    },
    {
      id: 'tough_hide',
      name: 'Tough Hide',
      category: 'physical',
      description: 'Naturally thick skin',
      effects: {
        abilitiesGranted: ['natural_armor'],
      },
    },
  ],

  canHybridize: true,
  hybridCompatible: ['human'],
  realmBound: false,
  canSurviveMortalWorld: true,
};

interface RacialTrait {
  id: string;
  name: string;
  category: 'physical' | 'sensory' | 'magical' | 'spiritual' | 'social';
  description: string;

  // How this affects gameplay
  effects?: {
    needsModifier?: Record<string, number>;     // e.g., { hunger: 0.5 }
    skillBonus?: Record<string, number>;        // e.g., { crafting: 0.2 }
    abilityGrant?: string[];                    // e.g., ['flight', 'darkvision']
    vulnerabilities?: string[];                 // e.g., ['iron', 'sunlight']
  };
}
```

### Known Races by Realm

#### Olympus (Greek Celestial)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Olympian** | divine | Shapeshifting, Domain Powers, Manifestation | immortal |
| **Demigod** | spirit | Enhanced Strength, Single Domain Affinity, Heroic Destiny | long_lived (500y) |
| **Nymph** | spirit | Location-Bound, Nature Magic, Eternal Youth | ageless (while location exists) |
| **Satyr** | fae | Wild Nature, Musical Magic, Revelry | long_lived (300y) |
| **Centaur** | beast | Wisdom, Archery, Dual Nature | long_lived (200y) |

```typescript
const OLYMPIAN_RACE: RaceTemplate = {
  id: 'olympian',
  name: 'Olympian',
  description: 'The gods of Mount Olympus, beings of immense divine power',
  nativeRealm: 'olympus',
  type: 'divine',
  category: 'humanoid',
  lifespan: 'immortal',
  innateTraits: [
    { id: 'shapeshifting', name: 'Shapeshifting', category: 'magical',
      description: 'Can assume any form', effects: { abilityGrant: ['shapeshift'] }},
    { id: 'domain_power', name: 'Domain Power', category: 'spiritual',
      description: 'Commands a fundamental aspect of reality' },
    { id: 'divine_beauty', name: 'Divine Beauty', category: 'social',
      description: 'Inspires awe in mortals', effects: { skillBonus: { persuasion: 0.5 }}},
    { id: 'ichor_blood', name: 'Ichor Blood', category: 'physical',
      description: 'Divine blood, not mortal blood' },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'nymph'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'neutral',
  societyType: 'divine_court',
};
```

#### Faerie (Wild Realm)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Sidhe** | fae | Glamour, Oath-Bound, Cold Iron Weakness | ageless |
| **Pixie** | fae | Tiny, Flight, Mischief Magic | long_lived (500y) |
| **Redcap** | fae | Violence, Blood Requirement, Enhanced Strength | ageless |
| **Changeling** | fae | Shapeshifting, Split Identity | varies |
| **Dryad** | fae | Tree-Bound, Nature Magic, Rooted | ageless (while tree lives) |

```typescript
const SIDHE_RACE: RaceTemplate = {
  id: 'sidhe',
  name: 'Sidhe',
  description: 'The noble fae, ageless beings of glamour bound by oaths',
  nativeRealm: 'faerie',
  type: 'fae',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    { id: 'glamour', name: 'Glamour', category: 'magical',
      description: 'Illusion magic comes naturally',
      effects: { abilityGrant: ['illusion'], skillBonus: { deception: 0.3 }}},
    { id: 'oath_bound', name: 'Oath-Bound', category: 'spiritual',
      description: 'Cannot break sworn oaths - physically prevented' },
    { id: 'iron_weakness', name: 'Cold Iron Weakness', category: 'physical',
      description: 'Cold iron burns and disrupts magic',
      effects: { vulnerabilities: ['cold_iron'] }},
    { id: 'true_name', name: 'True Name Vulnerable', category: 'spiritual',
      description: 'Knowing their true name grants power over them' },
    { id: 'time_unaware', name: 'Time Unaware', category: 'spiritual',
      description: 'Poor sense of mortal time passing' },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'elf'],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'Powers diminished, iron more common',
  typicalAlignment: 'chaotic',
  societyType: 'feudal_courts',
};
```

#### Hades (Greek Underworld)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Chthonic God** | divine | Death Domain, Underworld Authority | immortal |
| **Shade** | undead | Insubstantial, Memory-Faded, Bound | eternal |
| **Fury** | divine | Vengeance Incarnate, Pursuit, Justice | immortal |
| **Cerberus-kin** | beast | Multi-Headed, Guardian, Death-Sense | ageless |

#### Asgard (Norse Celestial)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Aesir** | divine | Warrior Gods, Fate-Bound, Ragnarok-Doomed | pseudo-immortal |
| **Vanir** | divine | Nature/Fertility, Seiðr Magic | pseudo-immortal |
| **Valkyrie** | spirit | Soul-Collector, Battle-Chooser, Flight | ageless |
| **Einherjar** | undead | Revive Daily, Eternal Warrior | eternal (until Ragnarok) |

#### Heaven (Monotheistic Paradise)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Seraph** | divine | Six Wings, Burning Presence, Pure Worship | immortal |
| **Cherub** | divine | Four Faces, Guardian, Knowledge | immortal |
| **Angel** | spirit | Messenger, Wings, Holy Light | immortal |
| **Saint** | spirit | Blessed Mortal, Intercession, Miracles | eternal |

#### The Dreaming (Dream Realm)

| Race | Type | Key Traits | Lifespan |
|------|------|------------|----------|
| **Oneiroi** | spirit | Dream-Shaping, Mind-Walking | ageless |
| **Nightmare** | spirit | Fear Incarnate, Terror-Feeding | ageless |
| **Morphling** | construct | Shapeshifting, Unstable, Dream-Stuff | varies |

#### Elemental Planes

| Realm | Race | Key Traits |
|-------|------|------------|
| Fire | **Efreet** | Fire Immunity, Heat Generation, Proud |
| Fire | **Salamander** | Fire Body, Passion, Volatile |
| Water | **Marid** | Water Mastery, Pressure Immunity, Wish-Granting |
| Earth | **Dao** | Earth-Shaping, Gem Affinity, Patient |
| Air | **Djinn** | Flight, Wind Control, Trickster |

---

## Part 2: Race Integration with Existing Systems

### How Races Affect Agents

When races are implemented, they modify agent components:

```typescript
// In AgentComponent or as separate RaceComponent
interface RaceComponent {
  raceId: string;
  raceTemplate: RaceTemplate;

  // Active racial traits
  activeTraits: RacialTrait[];

  // Hybrid info
  isHybrid: boolean;
  parentRaces?: [string, string];

  // Realm connection
  nativeRealmId?: string;
  outsideNativeRealm: boolean;
  realmSicknessLevel: number;  // 0-1, for realm-bound races outside realm
}

// How race modifies NeedsComponent
function applyRaceToNeeds(needs: NeedsComponent, race: RaceTemplate): void {
  for (const trait of race.innateTraits) {
    if (trait.effects?.needsModifier) {
      for (const [need, modifier] of Object.entries(trait.effects.needsModifier)) {
        // e.g., Fae need less food: hunger decay *= 0.5
        needs.decayRates[need] *= modifier;
      }
    }
  }
}

// How race modifies SkillComponent
function applyRaceToSkills(skills: SkillComponent, race: RaceTemplate): void {
  for (const trait of race.innateTraits) {
    if (trait.effects?.skillBonus) {
      for (const [skill, bonus] of Object.entries(trait.effects.skillBonus)) {
        skills.baseBonus[skill] = (skills.baseBonus[skill] ?? 0) + bonus;
      }
    }
  }
}
```

### Race-Specific Behaviors

```typescript
// Some behaviors only available to certain races
const RACE_BEHAVIORS: Record<string, string[]> = {
  sidhe: ['glamour_illusion', 'fae_bargain', 'wild_hunt'],
  olympian: ['divine_manifestation', 'domain_miracle', 'mortal_seduction'],
  angel: ['divine_message', 'holy_smite', 'blessing'],
  einherjar: ['glorious_combat', 'mead_feast', 'battle_resurrection'],
};

// Racial vulnerabilities affect behavior
function checkVulnerabilities(agent: Entity, context: BehaviorContext): void {
  const race = agent.getComponent(RaceComponent);

  for (const trait of race.activeTraits) {
    if (trait.effects?.vulnerabilities?.includes('cold_iron')) {
      // Fae avoid iron tools/weapons
      if (context.nearbyItems.some(i => i.material === 'iron')) {
        agent.avoidLocation(context.position, 'iron_present');
      }
    }

    if (trait.effects?.vulnerabilities?.includes('sunlight')) {
      // Vampires avoid daylight
      const time = world.getSystem(TimeSystem);
      if (time.isDaytime()) {
        agent.seekShelter('sunlight');
      }
    }
  }
}
```

---

## Part 3: Implementation Phases

### Phase A: Race Data (Can Do Now)

**No dependencies** - Just data definitions.

1. Create `RaceTemplates.ts` with known race definitions
2. Create `RacialTraits.ts` with trait definitions
3. Export as data for future use

### Phase B: Race Component (After Agent Refactor)

**Depends on**: Agent system stability

1. Add `RaceComponent` to entity system
2. Implement race → needs/skills modifiers
3. Add race-specific behaviors
4. Handle hybrid logic

### Phase C: Realm Population (After Realms Work)

**Depends on**: Realms being actual runnable maps

1. Populate realm presets with native races
2. Handle realm-bound entities
3. Implement realm sickness for displaced beings
4. Portal transitions include race checks

### Phase D: Divine Creation (After Presence System)

**Depends on**: Presence spectrum, attention economy

1. Creation interface for new races
2. Cost calculations based on traits
3. Population seeding mechanics
4. Creator-creation relationships

### Phase E: Cosmic Creation (Far Future)

**Depends on**: Everything above, plus multiverse mechanics

1. Planet creation system
2. Universe seeding
3. Cosmic-scale entity management

---

## Part 4: Near-Term Actionable Work

### What Can Be Built Now

1. **Race template data files** - Define all the races in code
2. **Trait effect system** - How traits modify components
3. **Race selection for agents** - Agents can have a race (default: human)
4. **UI display** - Show agent race in info panel

### What Needs Realms First

1. Native race populations
2. Realm-bound mechanics
3. Portal restrictions by race
4. Time dilation effects on different races

### What Needs Divine Systems First

1. Race creation by presences
2. Worship-based race bonuses
3. Divine races producing presences
4. Afterlife destinations by race

---

## Summary

This spec defines:

1. **Known mythological races** - Data ready for when realms exist
2. **Race/agent integration** - How races affect existing components
3. **Implementation phases** - Realistic path from current state
4. **Hyper-endgame vision** - Where this leads (planets, universes)

The key insight: **Races are data we can define now, but the systems that use them depend on realms and divinity being implemented first.** The dependency chain is:

```
Races (data) → Agents with races → Realms with populations → Divine creation
```

We can front-load the data work while acknowledging that the full system requires infrastructure that doesn't exist yet.
