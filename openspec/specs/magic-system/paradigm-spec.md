# Magic Paradigm System - Specification

**Created:** 2025-12-28
**Last Updated:** 2025-12-29
**Status:** Partially Implemented
**Version:** 0.2.0

---

## Overview

Magic works differently across universes. Rather than hardcoding a single magic system, we define a **meta-framework** that can express fundamentally different magical paradigms. Each universe declares its `MagicParadigm`, which defines the sources, costs, channels, laws, and risks of magic within that reality.

This enables:
- **Diverse universes**: A scholarly wizard universe vs a blood-pact demon realm vs a true-name reality
- **Cross-universe drama**: Magic that works in one universe may fail, transform, or be forbidden in another
- **Emergent gameplay**: Mages who've learned multiple paradigms, magic refugees, paradigm researchers

---

## Design Philosophy

### Universal Primitives

Every magic system, regardless of flavor, shares these fundamental concepts:

| Primitive | Question | Examples |
|-----------|----------|----------|
| **Source** | Where does power come from? | Mana pool, patron deity, ley lines, blood, knowledge |
| **Cost** | What is exchanged? | Energy, health, sanity, memories, years of life |
| **Channel** | How is magic shaped? | Words, gestures, glyphs, will, true names |
| **Effect** | What can magic do? | Elements, transformation, divination, summoning |
| **Law** | What rules constrain it? | Conservation, true names, equivalent exchange |
| **Acquisition** | How does one gain magic? | Study, bloodline, pact, awakening |
| **Risk** | What are the dangers? | Mishaps, corruption, patron anger, paradox |

### Paradigm as Configuration

A `MagicParadigm` is essentially a **configuration object** that parameterizes the magic system for a universe. The same underlying engine can simulate wildly different magical traditions by swapping paradigms.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MAGIC ENGINE (Universal)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Spell Resolution │ Cost Calculation │ Effect Application          │
│  Risk Evaluation  │ Proficiency Tracking │ Paradigm Validation     │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ configured by
                                │
┌─────────────────────────────────────────────────────────────────────┐
│                    MAGIC PARADIGM (Per Universe)                    │
├─────────────────────────────────────────────────────────────────────┤
│  Sources: [mana, ley_lines]                                        │
│  Costs: [mana_pool, stamina]                                       │
│  Channels: [verbal, somatic, focus]                                │
│  Laws: [conservation, similarity]                                  │
│  Effects: [fire, water, earth, air, body, mind]                    │
│  Acquisition: [study]                                              │
│  Risks: [mishap, exhaustion]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Types

### Magic Source

Where magical power originates.

```typescript
type MagicSourceType =
  | 'internal'      // Within the caster (mana pool, chi, life force)
  | 'ambient'       // Environmental (ley lines, weather, seasons)
  | 'divine'        // From gods, patrons, or higher powers
  | 'material'      // From reagents, components, sacrifices
  | 'emotional'     // From feelings (passion, rage, love)
  | 'social'        // From believers, worshippers, collective faith
  | 'knowledge'     // From knowing secrets, true names
  | 'temporal'      // From time itself (past/future energy)
  | 'void'          // From emptiness, entropy, anti-reality
  | 'ancestral';    // From spirits of the dead

interface MagicSource {
  id: string;
  name: string;
  type: MagicSourceType;

  /** How power regenerates (if at all) */
  regeneration: 'passive' | 'rest' | 'ritual' | 'consumption' | 'prayer' | 'none';

  /** Base regeneration rate (units per tick, if passive) */
  regenRate?: number;

  /** Can power be stored in vessels/objects? */
  storable: boolean;

  /** Can power be transferred between beings? */
  transferable: boolean;

  /** Can power be stolen/drained? */
  stealable: boolean;

  /** Does using this source attract attention? */
  detectability: 'undetectable' | 'subtle' | 'obvious' | 'beacon';

  /** Flavor description */
  description?: string;
}
```

### Magic Cost

What is exchanged for magical effects.

```typescript
type MagicCostType =
  | 'mana'           // Abstract energy pool
  | 'health'         // Life force, HP
  | 'stamina'        // Physical exhaustion
  | 'lifespan'       // Years of remaining life
  | 'sanity'         // Mental stability
  | 'memory'         // Specific or random memories
  | 'emotion'        // Capacity to feel
  | 'material'       // Physical components consumed
  | 'time'           // Casting duration, ritual time
  | 'favor'          // Relationship with patron/god
  | 'karma'          // Moral standing, cosmic balance
  | 'gold'           // Economic cost
  | 'soul_fragment'  // Piece of one's essence
  | 'corruption'     // Gradual dark transformation
  | 'attention'      // Draws notice of entities
  | 'oath'           // Binding promise
  | 'blood'          // Literal blood (health subset)
  | 'beauty'         // Physical appearance
  | 'luck';          // Fortune/probability

interface MagicCost {
  type: MagicCostType;

  /** Can this cost be fatal or cause permanent loss? */
  canBeTerminal: boolean;

  /** Does this accumulate over time? */
  cumulative: boolean;

  /** Can this cost be recovered? */
  recoverable: boolean;

  /** Recovery method (if recoverable) */
  recoveryMethod?: 'rest' | 'ritual' | 'time' | 'sacrifice' | 'quest';

  /** How visible is this cost to others? */
  visibility: 'hidden' | 'subtle' | 'obvious';
}
```

### Magic Channel

How magical power is shaped and directed.

```typescript
type MagicChannelType =
  | 'verbal'         // Words, incantations, power words
  | 'somatic'        // Gestures, hand movements, poses
  | 'material'       // Components, reagents, catalysts
  | 'focus'          // Wand, staff, crystal, implement
  | 'glyph'          // Written symbols, runes, circles
  | 'musical'        // Song, instruments, rhythm
  | 'dance'          // Ritual movement, katas
  | 'will'           // Pure mental intention
  | 'true_name'      // Speaking the name of things
  | 'prayer'         // Religious invocation
  | 'blood'          // Self-harm, blood drawing
  | 'emotion'        // Intense feeling
  | 'meditation'     // Focused thought, trance
  | 'dream'          // Dreaming or lucid states
  | 'consumption'    // Eating/drinking magical substances
  | 'touch'          // Physical contact with target
  | 'link'           // Sympathetic connection (hair, photo)
  | 'tattoo'         // Body markings, brands
  | 'breath';        // Breathing patterns, spoken breath

interface MagicChannel {
  type: MagicChannelType;

  /** How required is this channel in the paradigm? */
  requirement: 'required' | 'optional' | 'enhancing' | 'forbidden';

  /** Can masters cast without this channel? */
  canBeMastered: boolean;

  /** Skill bonus when using this channel */
  proficiencyBonus?: number;

  /** What happens if channel is blocked? (hands bound, silenced) */
  blockEffect: 'prevents_casting' | 'reduces_power' | 'increases_cost' | 'no_effect';
}
```

### Magic Law

Fundamental rules that constrain magic in this reality.

```typescript
type MagicLawType =
  | 'conservation'         // Energy in = energy out
  | 'similarity'           // Like affects like
  | 'contagion'            // Once connected, always connected
  | 'true_names'           // Names have power over things
  | 'belief'               // Collective faith makes real
  | 'equivalent_exchange'  // Must give equal value to receive
  | 'sympathy'             // Linked things share fate
  | 'paradox'              // Reality fights impossible changes
  | 'iron_vulnerability'   // Magic weakened by cold iron
  | 'threshold'            // Permission/invitation required
  | 'oath_binding'         // Spoken vows create magical bonds
  | 'balance'              // Universe seeks equilibrium
  | 'entropy'              // Magic accelerates decay
  | 'narrative'            // Story logic has power
  | 'witness'              // Observed magic behaves differently
  | 'cycles'               // Power tied to time/season/moon
  | 'consent'              // Cannot affect the unwilling
  | 'sacrifice'            // Greater effects require greater sacrifice
  | 'resonance'            // Similar magics amplify/interfere
  | 'secrecy';             // Known magic loses power

interface MagicLaw {
  id: string;
  name: string;
  type: MagicLawType;

  /** How strictly is this law enforced? */
  strictness: 'absolute' | 'strong' | 'weak' | 'optional';

  /** What happens when the law is violated? */
  violationConsequence?: string;

  /** Can this law be circumvented with enough power/skill? */
  canBeCircumvented: boolean;

  /** Cost multiplier for attempting to break this law */
  circumventionCostMultiplier?: number;

  /** Flavor description */
  description?: string;
}
```

### Magic Risk

Dangers and consequences of magic use.

```typescript
type MagicRiskTrigger =
  | 'failure'          // Spell fails its roll
  | 'critical_failure' // Catastrophic failure
  | 'overuse'          // Cast too much in short period
  | 'exhaustion'       // Depleted mana/resources
  | 'corruption'       // Used forbidden magic
  | 'paradox'          // Violated laws of magic
  | 'wild_magic'       // Random chance on any casting
  | 'divine_anger'     // Patron/god displeased
  | 'attention'        // Drew notice of entities
  | 'addiction'        // Used power too frequently
  | 'debt'             // Owe something to entity
  | 'overreach'        // Attempted beyond skill level
  | 'emotional'        // Cast while emotionally unstable
  | 'interrupted';     // Casting was disrupted

type MagicRiskConsequence =
  | 'mishap'              // Spell goes wrong in minor way
  | 'backlash'            // Damage to caster
  | 'corruption_gain'     // Physical/mental corruption
  | 'mutation'            // Permanent transformation
  | 'possession'          // Entity takes temporary control
  | 'silence'             // Lose magic temporarily
  | 'burnout'             // Lose magic permanently
  | 'debt_called'         // Must immediately pay what's owed
  | 'attention_gained'    // Powerful entity notices you
  | 'paradox_spirit'      // Reality sends enforcers
  | 'addiction_worsens'   // Dependency deepens
  | 'memory_loss'         // Forget something
  | 'aging'               // Instantly age
  | 'wild_surge'          // Random magical effect
  | 'target_swap'         // Effect hits wrong target
  | 'delayed_effect'      // Spell triggers later randomly
  | 'permanent_mark'      // Visible sign of magic use
  | 'echo'                // Spell repeats uncontrollably
  | 'bleed_through';      // Effect leaks into nearby reality

interface MagicRisk {
  trigger: MagicRiskTrigger;
  consequence: MagicRiskConsequence;
  severity: 'trivial' | 'minor' | 'moderate' | 'severe' | 'catastrophic';

  /** Probability when trigger occurs (0-1) */
  probability: number;

  /** Can this be mitigated with skill/preparation? */
  mitigatable: boolean;

  /** Skill check to avoid (if mitigatable) */
  mitigationSkill?: string;

  /** Description of what happens */
  description?: string;
}
```

### Acquisition Method

How beings gain magical ability.

```typescript
type AcquisitionMethod =
  | 'study'          // Academic learning over time
  | 'apprenticeship' // Learning from a master
  | 'gift'           // Granted by powerful entity
  | 'bloodline'      // Inherited genetic/spiritual trait
  | 'awakening'      // Triggered by trauma/event
  | 'contract'       // Signed pact with entity
  | 'consumption'    // Ate/absorbed magical substance
  | 'infection'      // Magical disease or curse
  | 'artifact'       // Bonded to magical item
  | 'prayer'         // Devotion and faith
  | 'meditation'     // Spiritual practice
  | 'death'          // Died and returned
  | 'stolen'         // Took power from another
  | 'born'           // Natural from birth
  | 'ascension'      // Achieved higher state
  | 'random';        // Spontaneous wild magic

interface AcquisitionDefinition {
  method: AcquisitionMethod;

  /** How common is this path? */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

  /** Can this be chosen or is it fate? */
  voluntary: boolean;

  /** Requirements to begin this path */
  prerequisites?: string[];

  /** What sources become available via this path */
  grantsAccess: string[];  // Source IDs

  /** Starting proficiency level */
  startingProficiency: number;

  /** Flavor description */
  description?: string;
}
```

---

## The Magic Paradigm

The complete definition of magic for a universe.

```typescript
interface MagicParadigm {
  id: string;
  name: string;
  description: string;

  /** Which universes use this paradigm */
  universeIds: string[];

  /** Flavor/lore about this magical tradition */
  lore?: string;

  // =========================================================================
  // Core Definitions
  // =========================================================================

  /** Available power sources in this paradigm */
  sources: MagicSource[];

  /** What magic costs */
  costs: MagicCost[];

  /** How magic is channeled */
  channels: MagicChannel[];

  /** Fundamental laws */
  laws: MagicLaw[];

  /** Risks of magic use */
  risks: MagicRisk[];

  /** How one becomes a magic user */
  acquisitionMethods: AcquisitionDefinition[];

  // =========================================================================
  // Effect Space (What magic CAN do)
  // =========================================================================

  /** Available techniques (verbs) */
  availableTechniques: MagicTechnique[];

  /** Available forms (nouns) */
  availableForms: MagicForm[];

  /** Combinations that don't work in this paradigm */
  forbiddenCombinations?: ForbiddenCombination[];

  /** Combinations with special synergy */
  resonantCombinations?: ResonantCombination[];

  // =========================================================================
  // Scaling & Limits
  // =========================================================================

  /** How power scales with skill */
  powerScaling: 'linear' | 'exponential' | 'logarithmic' | 'step' | 'threshold';

  /** Maximum power level achievable by mortals */
  powerCeiling?: number;

  /** Whether multiple casters can combine power */
  allowsGroupCasting: boolean;

  /** Group casting bonus multiplier */
  groupCastingMultiplier?: number;

  /** Whether magic can be permanently bound to objects */
  allowsEnchantment: boolean;

  /** Whether spells persist after caster dies */
  persistsAfterDeath: boolean;

  /** Whether magic can be taught/shared */
  allowsTeaching: boolean;

  /** Whether spells can be written down and used by others */
  allowsScrolls: boolean;

  // =========================================================================
  // Interaction with Other Paradigms
  // =========================================================================

  /** How this paradigm treats foreign magic */
  foreignMagicPolicy: 'compatible' | 'incompatible' | 'hostile' | 'absorbs' | 'transforms';

  /** Paradigms this one can coexist with */
  compatibleParadigms?: string[];

  /** Paradigms that conflict with this one */
  conflictingParadigms?: string[];

  /** What happens to foreign magic entering this paradigm's universe */
  foreignMagicEffect?: {
    effect: 'works_normally' | 'weakened' | 'fails' | 'transforms' | 'backfires';
    powerModifier?: number;
    transformsInto?: string;  // Paradigm ID
  };
}

interface ForbiddenCombination {
  technique: MagicTechnique;
  form: MagicForm;
  reason: string;
  consequence?: string;  // What happens if attempted anyway
}

interface ResonantCombination {
  technique: MagicTechnique;
  form: MagicForm;
  bonusEffect: string;
  powerMultiplier?: number;
}
```

---

## Example Paradigms

### 1. The Academies (Classic Wizard Magic)

Scholarly, mana-based magic learned through years of study. Safe and reliable but requires investment.

```typescript
const academicMagic: MagicParadigm = {
  id: 'academic',
  name: 'The Academies',
  description: 'Traditional scholarly magic based on mana manipulation',
  universeIds: ['arcane_realms'],

  lore: `Magic is a science in these realms. The great academies have spent
         millennia cataloging the laws of thaumaturgy, developing safe practices,
         and training generations of wizards. Power comes slowly but surely.`,

  sources: [{
    id: 'mana',
    name: 'Mana',
    type: 'internal',
    regeneration: 'rest',
    regenRate: 0.01,
    storable: true,
    transferable: true,
    stealable: false,
    detectability: 'subtle',
  }, {
    id: 'ley_lines',
    name: 'Ley Lines',
    type: 'ambient',
    regeneration: 'none',
    storable: false,
    transferable: false,
    stealable: false,
    detectability: 'obvious',
  }],

  costs: [{
    type: 'mana',
    canBeTerminal: false,
    cumulative: false,
    recoverable: true,
    recoveryMethod: 'rest',
    visibility: 'hidden',
  }, {
    type: 'stamina',
    canBeTerminal: false,
    cumulative: true,
    recoverable: true,
    recoveryMethod: 'rest',
    visibility: 'obvious',
  }],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
    { type: 'somatic', requirement: 'required', canBeMastered: true, blockEffect: 'reduces_power' },
    { type: 'focus', requirement: 'enhancing', canBeMastered: false, blockEffect: 'reduces_power', proficiencyBonus: 10 },
    { type: 'material', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect' },
  ],

  laws: [{
    id: 'conservation',
    name: 'Conservation of Thaumic Energy',
    type: 'conservation',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Energy cannot be created or destroyed, only transformed',
  }, {
    id: 'similarity',
    name: 'Law of Similarity',
    type: 'similarity',
    strictness: 'weak',
    canBeCircumvented: true,
    circumventionCostMultiplier: 2.0,
    description: 'Like affects like - a model aids affecting the real',
  }],

  risks: [
    { trigger: 'failure', consequence: 'mishap', severity: 'minor', probability: 0.3, mitigatable: true },
    { trigger: 'exhaustion', consequence: 'backlash', severity: 'moderate', probability: 0.5, mitigatable: false },
    { trigger: 'overuse', consequence: 'silence', severity: 'moderate', probability: 0.1, mitigatable: true },
  ],

  acquisitionMethods: [{
    method: 'study',
    rarity: 'common',
    voluntary: true,
    prerequisites: ['literacy', 'academy_admission'],
    grantsAccess: ['mana'],
    startingProficiency: 5,
  }, {
    method: 'apprenticeship',
    rarity: 'uncommon',
    voluntary: true,
    prerequisites: ['find_master'],
    grantsAccess: ['mana', 'ley_lines'],
    startingProficiency: 10,
  }],

  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance', 'summon'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image'],

  forbiddenCombinations: [
    { technique: 'create', form: 'spirit', reason: 'Souls cannot be created by mortal magic' },
    { technique: 'destroy', form: 'time', reason: 'Time destruction would unravel reality' },
  ],

  resonantCombinations: [
    { technique: 'perceive', form: 'mind', bonusEffect: 'Telepathy range doubled', powerMultiplier: 1.5 },
    { technique: 'control', form: 'fire', bonusEffect: 'Fire becomes semi-sentient ally', powerMultiplier: 1.2 },
  ],

  powerScaling: 'logarithmic',
  powerCeiling: 100,
  allowsGroupCasting: true,
  groupCastingMultiplier: 1.5,
  allowsEnchantment: true,
  persistsAfterDeath: true,
  allowsTeaching: true,
  allowsScrolls: true,

  foreignMagicPolicy: 'compatible',
};
```

### 2. The Pacts (Warlock/Patron Magic)

Power borrowed from otherworldly entities in exchange for service, souls, or other prices.

```typescript
const pactMagic: MagicParadigm = {
  id: 'pact',
  name: 'The Pacts',
  description: 'Power granted by patron entities in exchange for service',
  universeIds: ['shadow_realms', 'demon_courts'],

  lore: `Why spend decades studying when you can have power NOW? The entities
         beyond reality offer shortcuts - for a price. Some prices are bearable.
         Others... you don't find out until it's too late.`,

  sources: [{
    id: 'patron',
    name: 'Patron Grant',
    type: 'divine',
    regeneration: 'passive',
    regenRate: 0.02,
    storable: false,
    transferable: false,
    stealable: false,
    detectability: 'subtle',
    description: 'Power flows from your patron as long as they favor you',
  }],

  costs: [{
    type: 'favor',
    canBeTerminal: true,
    cumulative: true,
    recoverable: true,
    recoveryMethod: 'quest',
    visibility: 'hidden',
  }, {
    type: 'corruption',
    canBeTerminal: true,
    cumulative: true,
    recoverable: false,
    visibility: 'subtle',
  }, {
    type: 'soul_fragment',
    canBeTerminal: true,
    cumulative: true,
    recoverable: false,
    visibility: 'hidden',
  }],

  channels: [
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'no_effect' },
    { type: 'prayer', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect', proficiencyBonus: 5 },
    { type: 'blood', requirement: 'enhancing', canBeMastered: false, blockEffect: 'no_effect', proficiencyBonus: 15 },
  ],

  laws: [{
    id: 'oath_binding',
    name: 'The Contract is Sacred',
    type: 'oath_binding',
    strictness: 'absolute',
    canBeCircumvented: false,
    violationConsequence: 'Power stripped, patron may claim soul',
    description: 'Pact terms are magically enforced - there is no escape',
  }, {
    id: 'patron_authority',
    name: 'The Patron Decides',
    type: 'consent',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Patrons can revoke or modify granted powers at will',
  }],

  risks: [
    { trigger: 'divine_anger', consequence: 'silence', severity: 'severe', probability: 0.8, mitigatable: false },
    { trigger: 'overuse', consequence: 'corruption_gain', severity: 'moderate', probability: 0.3, mitigatable: false },
    { trigger: 'debt', consequence: 'debt_called', severity: 'catastrophic', probability: 1.0, mitigatable: false },
    { trigger: 'failure', consequence: 'attention_gained', severity: 'minor', probability: 0.2, mitigatable: true },
  ],

  acquisitionMethods: [{
    method: 'contract',
    rarity: 'uncommon',
    voluntary: true,
    prerequisites: ['contact_patron', 'something_to_offer'],
    grantsAccess: ['patron'],
    startingProficiency: 30,
    description: 'Negotiate terms with an otherworldly entity',
  }, {
    method: 'gift',
    rarity: 'rare',
    voluntary: false,
    prerequisites: [],
    grantsAccess: ['patron'],
    startingProficiency: 50,
    description: 'Chosen by a patron for their own reasons',
  }],

  availableTechniques: ['destroy', 'control', 'summon', 'perceive'],
  availableForms: ['mind', 'spirit', 'void', 'body'],

  forbiddenCombinations: [
    { technique: 'create', form: 'spirit', reason: 'Only patrons may create souls' },
    { technique: 'protect', form: 'void', reason: 'Void cannot be warded, only embraced' },
  ],

  powerScaling: 'step',  // Power comes in discrete grants from patron
  powerCeiling: 150,     // Can exceed academic mages
  allowsGroupCasting: false,
  allowsEnchantment: false,
  persistsAfterDeath: false,  // Dies with the pact
  allowsTeaching: false,
  allowsScrolls: false,

  foreignMagicPolicy: 'hostile',  // Patrons don't like competition
};
```

### 3. The Deep Grammar (True Name Magic)

Power through knowing the true names of things. Safe once known, but names are hard to discover.

```typescript
const nameMagic: MagicParadigm = {
  id: 'names',
  name: 'The Deep Grammar',
  description: 'Magic through knowing and speaking the true names of things',
  universeIds: ['naming_realms', 'earthsea'],

  lore: `In the beginning was the Word, and the Word was power. Everything that
         exists has a true name in the Deep Grammar - the language reality itself
         is written in. To know something's name is to have power over it. To know
         your own name is to know yourself truly.`,

  sources: [{
    id: 'knowledge',
    name: 'Name-Knowledge',
    type: 'knowledge',
    regeneration: 'none',
    storable: true,
    transferable: true,
    stealable: true,
    detectability: 'undetectable',
    description: 'Power comes from knowing names, not from any pool',
  }],

  costs: [{
    type: 'time',
    canBeTerminal: false,
    cumulative: false,
    recoverable: false,
    visibility: 'obvious',
  }, {
    type: 'sanity',
    canBeTerminal: true,
    cumulative: true,
    recoverable: true,
    recoveryMethod: 'rest',
    visibility: 'subtle',
  }, {
    type: 'attention',
    canBeTerminal: false,
    cumulative: true,
    recoverable: true,
    recoveryMethod: 'time',
    visibility: 'hidden',
  }],

  channels: [
    { type: 'true_name', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'verbal', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
  ],

  laws: [{
    id: 'true_names',
    name: 'The Deep Grammar',
    type: 'true_names',
    strictness: 'absolute',
    canBeCircumvented: false,
    description: 'To know the true name is to have absolute power over the named',
  }, {
    id: 'secrecy',
    name: 'The Hidden Name',
    type: 'secrecy',
    strictness: 'strong',
    canBeCircumvented: true,
    description: 'If others know your name, they have power over you',
  }, {
    id: 'balance',
    name: 'The Balance',
    type: 'balance',
    strictness: 'strong',
    canBeCircumvented: false,
    violationConsequence: 'Using names recklessly destabilizes reality nearby',
    description: 'Names bind the world together; overuse frays the binding',
  }],

  risks: [
    { trigger: 'failure', consequence: 'backlash', severity: 'severe', probability: 0.6, mitigatable: false,
      description: 'Mispronouncing a name turns its power against you' },
    { trigger: 'overuse', consequence: 'echo', severity: 'moderate', probability: 0.2, mitigatable: true,
      description: 'The name keeps resonating, affecting similar things' },
    { trigger: 'attention', consequence: 'attention_gained', severity: 'moderate', probability: 0.4, mitigatable: true,
      description: 'Speaking names loudly draws the attention of things that listen' },
  ],

  acquisitionMethods: [{
    method: 'study',
    rarity: 'rare',
    voluntary: true,
    prerequisites: ['find_naming_school', 'years_of_silence'],
    grantsAccess: ['knowledge'],
    startingProficiency: 20,
    description: 'The Schools of Naming teach the basics of the Deep Grammar',
  }, {
    method: 'meditation',
    rarity: 'uncommon',
    voluntary: true,
    prerequisites: ['perfect_listening'],
    grantsAccess: ['knowledge'],
    startingProficiency: 10,
    description: 'In deep meditation, the names of things whisper themselves',
  }],

  availableTechniques: ['control', 'perceive', 'transform', 'summon'],
  availableForms: ['fire', 'water', 'earth', 'air', 'plant', 'animal'],

  forbiddenCombinations: [
    { technique: 'create', form: 'mind', reason: 'Cannot name the unborn thought' },
    { technique: 'destroy', form: 'spirit', reason: 'Names persist beyond death' },
  ],

  resonantCombinations: [
    { technique: 'control', form: 'air', bonusEffect: 'Wind speaks secrets back', powerMultiplier: 1.3 },
  ],

  powerScaling: 'exponential',  // Each name compounds with others
  allowsGroupCasting: true,     // Names can be shared
  allowsEnchantment: true,      // Write names on objects
  persistsAfterDeath: true,     // Knowledge passes to heirs
  allowsTeaching: true,         // Names can be taught
  allowsScrolls: true,          // Names can be written

  foreignMagicPolicy: 'absorbs',  // Names can be learned for foreign magic too
};
```

### 4. The Breath (Life-Force Magic)

Each breath contains a fragment of life force. Magic consumes breaths, which can be stored or stolen.

```typescript
const breathMagic: MagicParadigm = {
  id: 'breath',
  name: 'The Breath',
  description: 'Magic fueled by stored life-force, measured in Breaths',
  universeIds: ['nalthis', 'color_realms'],

  lore: `Every person is born with one Breath - a fragment of divine essence.
         Breaths can be given away, stored in objects, or used to fuel magic.
         Those with many Breaths gain superhuman abilities. Those with none
         become Drabs - grey, passionless, diminished.`,

  sources: [{
    id: 'breath',
    name: 'BioChromatic Breath',
    type: 'internal',
    regeneration: 'none',  // Breaths don't regenerate
    storable: true,        // Can be stored in objects
    transferable: true,    // Can be given/taken
    stealable: true,       // Can be stolen
    detectability: 'obvious',  // High-Breath beings glow with life
    description: 'Fragments of divine life essence, one per birth',
  }],

  costs: [{
    type: 'health',  // Consuming Breaths permanently
    canBeTerminal: true,
    cumulative: true,
    recoverable: false,  // Breaths don't come back
    visibility: 'obvious',  // Becoming a Drab is visible
  }],

  channels: [
    { type: 'verbal', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'prevents_casting' },
    { type: 'touch', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' },
  ],

  laws: [{
    id: 'awakening_cost',
    name: 'Awakening Costs',
    type: 'sacrifice',
    strictness: 'absolute',
    canBeCircumvented: false,
    description: 'Giving sentience to objects permanently consumes Breaths',
  }, {
    id: 'color_drain',
    name: 'Color Consumption',
    type: 'conservation',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Magic drains color from nearby objects, leaving grey',
  }],

  risks: [
    { trigger: 'exhaustion', consequence: 'corruption_gain', severity: 'severe', probability: 0.7, mitigatable: false,
      description: 'Running out of Breaths while Awakening leaves you a Drab' },
    { trigger: 'overuse', consequence: 'addiction_worsens', severity: 'moderate', probability: 0.3, mitigatable: true,
      description: 'The power becomes intoxicating; you crave more Breaths' },
  ],

  acquisitionMethods: [{
    method: 'born',
    rarity: 'common',
    voluntary: false,
    grantsAccess: ['breath'],
    startingProficiency: 0,
    description: 'Everyone is born with one Breath',
  }, {
    method: 'consumption',
    rarity: 'uncommon',
    voluntary: true,
    prerequisites: ['willing_donor'],
    grantsAccess: ['breath'],
    startingProficiency: 5,
    description: 'Receive Breaths from others',
  }],

  availableTechniques: ['create', 'control', 'enhance', 'transform'],
  availableForms: ['body', 'image'],  // Limited forms - color and motion

  powerScaling: 'threshold',  // Breaths unlock discrete ability tiers
  powerCeiling: undefined,    // No theoretical limit to Breaths
  allowsGroupCasting: false,
  allowsEnchantment: true,    // Core mechanic - Awakening objects
  persistsAfterDeath: true,   // Awakened objects outlive creator
  allowsTeaching: true,
  allowsScrolls: false,

  foreignMagicPolicy: 'incompatible',
};
```

---

## Cross-Universe Magic Interaction

When magic crosses universe boundaries, the paradigms must interact.

### Compatibility Matrix

```typescript
interface ParadigmInteraction {
  fromParadigm: string;
  toParadigm: string;

  /** Does magic still work? */
  functionality: 'full' | 'partial' | 'none' | 'inverted';

  /** Power level modification */
  powerModifier: number;  // 0.0 to 2.0

  /** Additional costs in the new paradigm */
  additionalCosts?: MagicCostType[];

  /** New risks that apply */
  additionalRisks?: MagicRiskTrigger[];

  /** Does the magic transform into the new paradigm's type? */
  transforms: boolean;

  /** Description of what happens */
  description: string;
}

// Example interactions
const paradigmInteractions: ParadigmInteraction[] = [
  {
    fromParadigm: 'academic',
    toParadigm: 'pact',
    functionality: 'partial',
    powerModifier: 0.5,
    additionalCosts: ['attention'],
    additionalRisks: ['attention'],
    transforms: false,
    description: 'Mana-based magic functions weakly and draws patron attention',
  },
  {
    fromParadigm: 'pact',
    toParadigm: 'names',
    functionality: 'none',
    powerModifier: 0,
    transforms: false,
    description: 'Patrons have no reach in the naming realms',
  },
  {
    fromParadigm: 'names',
    toParadigm: 'breath',
    functionality: 'partial',
    powerModifier: 0.7,
    additionalCosts: ['health'],
    transforms: true,
    description: 'Names still work but cost Breaths to speak',
  },
  {
    fromParadigm: 'academic',
    toParadigm: 'names',
    functionality: 'full',
    powerModifier: 1.0,
    additionalRisks: ['attention'],
    transforms: false,
    description: 'Mana magic works, but speaking spells draws listeners',
  },
];
```

### Magic User Cross-Universe Experience

```typescript
interface CrossUniverseMage {
  /** Primary paradigm they learned */
  homeParadigm: string;

  /** Paradigms they've learned to use */
  learnedParadigms: string[];

  /** Current universe paradigm */
  currentParadigm: string;

  /** Active adaptations */
  adaptations: ParadigmAdaptation[];
}

interface ParadigmAdaptation {
  /** Which of their abilities */
  spell: string;

  /** How it's been adapted */
  adaptationType: 'translated' | 'hybrid' | 'suppressed' | 'enhanced';

  /** New costs/channels/risks in this paradigm */
  modifications: {
    costModifier?: number;
    additionalChannels?: MagicChannelType[];
    additionalRisks?: MagicRisk[];
  };
}
```

---

## Integration with MagicComponent

The existing `MagicComponent` tracks an individual's magical state. It should reference the paradigm:

```typescript
interface MagicComponent extends Component {
  type: 'magic';

  /** Paradigm this entity learned magic under */
  homeParadigmId: string;

  /** Paradigms this entity has learned to use */
  knownParadigms: string[];

  /** Current paradigm context (based on universe) */
  activeParadigmId: string;

  // ... existing fields (manaPools, knownSpells, etc.)

  /** Cross-paradigm adaptations */
  adaptations?: ParadigmAdaptation[];

  /** Paradigm-specific state (corruption, breath count, patron favor, etc.) */
  paradigmState: Record<string, unknown>;
}
```

---

## Implementation Phases

### Phase 1: Core Types
- Define all type interfaces in `MagicParadigm.ts`
- Create factory functions for common paradigms
- Add paradigm reference to `MagicComponent`

### Phase 2: Paradigm Registry
- Create `ParadigmRegistry` to store/query paradigms
- Link paradigms to universes via `UniverseIdentity`
- Add paradigm lookup to World

### Phase 3: Spell Resolution
- Create `MagicEngine` that consults paradigm for resolution
- Implement cost calculation based on paradigm
- Implement channel requirements

### Phase 4: Law Enforcement
- Create `MagicLawEnforcer` system
- Validate spells against paradigm laws
- Apply consequences for violations

### Phase 5: Cross-Universe
- Implement `ParadigmInteraction` resolution
- Handle magic translation on universe travel
- Add adaptation mechanics

---

## Related Specs

- `universe-system/spec.md` - Universe definitions
- `agent-system/spec.md` - Agent capabilities
- `items-system/spec.md` - Enchanted items
- `research-system/spec.md` - Discovering magic

---

## Implementation Status

**Last Updated:** 2025-12-29 14:00

### 🆕 Recently Added (Last 2 Hours)

#### Spell Effect System (NEW - 85%)
- ✅ **SpellEffect.ts** (918 lines) - Complete type system for all effect categories
- ✅ **17 Effect Types Defined**:
  - DamageEffect, HealingEffect, ProtectionEffect
  - BuffEffect, DebuffEffect, ControlEffect
  - SummonEffect, TransformEffect, PerceptionEffect
  - DispelEffect, TeleportEffect, CreationEffect
  - EnvironmentalEffect, TemporalEffect, MentalEffect
  - SoulEffect, ParadigmEffect
- ✅ **Effect Scaling System** - proficiency-based value calculation
- ✅ **Target Types** - self, single, area, cone, line, chain, aura, global
- ✅ **Area Shapes** - circle, square, sphere, cube, cone, line, ring, wall
- ✅ **Target Filters** - any, allies, enemies, living, undead, objects, etc.
- ✅ **Damage Types** - 12 types (fire, ice, lightning, poison, psychic, void, etc.)
- ✅ **SpellEffectExecutor.ts** (647 lines) - Effect application engine
- ✅ **SpellEffectRegistry.ts** (384 lines) - Effect library management
- ✅ **EffectApplier Interface** - Pluggable applier architecture
- ✅ **HealingEffectApplier** (491 lines) - First working applier
  - Instant healing
  - Heal over time (HoT)
  - Multi-resource restoration (health, mana, stamina)
  - Condition curing
  - Overheal mechanics
- ✅ **Active Effect Tracking** - Duration, stacking, expiration
- ✅ **Effect Events** - Event system for UI/logging
- ⚠️ **16 Appliers Remaining** - Only healing implemented so far

#### Magic Source Generator (NEW - 100%)
- ✅ **MagicSourceGenerator.ts** (1069 lines) - Source creation system
- ✅ **MagicResourcePool Interface** - Resource pool definitions
- ✅ **Source Templates** - Pre-configured templates for 10 source types
- ✅ **Auto-generation** - Generate sources from paradigm definitions
- ✅ **Regeneration System** - Conditions and rates for resource recovery
- ✅ **UI Integration** - Color and icon support for resource display
- ✅ **Pool Management** - Current/max tracking, regen rates, conditions

#### Core Paradigms Consolidation (NEW - 100%)
- ✅ **CoreParadigms.ts** (created today) - Consolidated core paradigms
- ✅ Moved 7 core paradigms from ExampleParadigms
- ✅ Unified API with CORE_PARADIGM_REGISTRY
- ✅ Better organization for fundamental paradigms

**Total New Code: ~3,500 lines (last 2 hours)**

---

### ✅ Completed Features

#### Core Types & Infrastructure (100%)
- ✅ All base types defined (MagicSource, MagicCost, MagicChannel, MagicLaw, MagicRisk)
- ✅ MagicParadigm interface complete with all fields
- ✅ MagicComponent with paradigm integration
- ✅ Factory functions for creating paradigm elements
- ✅ ParadigmAdaptation for cross-universe magic
- ✅ Validation functions for paradigm integrity

#### Example Paradigms (100%)
- ✅ ACADEMIC_PARADIGM (scholarly wizard magic)
- ✅ PACT_PARADIGM (warlock/patron magic)
- ✅ NAME_PARADIGM (true name magic, Earthsea-style)
- ✅ BREATH_PARADIGM (life-force magic, Warbreaker-style)
- ✅ DIVINE_PARADIGM (prayer and divine favor)
- ✅ BLOOD_PARADIGM (hemomancy, life-force sacrifice)
- ✅ EMOTIONAL_PARADIGM (feeling-based magic)

#### Extended Paradigms (100%)
- ✅ **Animist Paradigms** (7 paradigms):
  - SHINTO_PARADIGM (Kami worship)
  - SYMPATHY_PARADIGM (Name of the Wind style)
  - ALLOMANCY_PARADIGM (Mistborn metal-burning)
  - DREAM_PARADIGM (lucid dreaming, oneiromancy)
  - SONG_PARADIGM (musical/bardic magic)
  - RUNE_PARADIGM (written symbol magic)
  - DAEMON_PARADIGM (His Dark Materials style)

- ✅ **Creative Paradigms** (10 paradigms):
  - COMMERCE_PARADIGM (buying/selling magic)
  - CRAFT_PARADIGM (artisan magic)
  - LUCK_PARADIGM (probability manipulation)
  - BELIEF_PARADIGM (collective faith)
  - COOKING_PARADIGM (culinary magic)
  - GARDENING_PARADIGM (plant cultivation)
  - STORYTELLING_PARADIGM (narrative power)
  - GAMBLING_PARADIGM (risk and chance)
  - ART_PARADIGM (creative expression)
  - DANCE_PARADIGM (movement magic)

- ✅ **Dimensional Paradigms** (3 paradigms):
  - DIMENSION_PARADIGM (4D+ perception)
  - ESCALATION_PARADIGM (Dark Forest cascading danger)
  - CORRUPTION_PARADIGM (Adventure Time-style)

- ✅ **Whimsical Paradigms** (4 paradigms):
  - TALENT_PARADIGM (innate unique powers)
  - NARRATIVE_PARADIGM (story logic)
  - PUN_PARADIGM (wordplay magic)
  - WILD_PARADIGM (chaos/randomness)

- ✅ **Null Paradigms** (9 paradigms):
  - NULL_PARADIGM (no magic exists)
  - DEAD_PARADIGM (magic once existed, now gone)
  - ANTI_PARADIGM (magic actively suppressed)
  - INVERTED_PARADIGM (magic backfires)
  - TECH_SUPREMACY_PARADIGM (technology > magic)
  - RATIONAL_PARADIGM (scientific explanation only)
  - SEALED_PARADIGM (magic locked away)
  - DIVINE_PROHIBITION_PARADIGM (gods forbid magic)
  - DIVINE_MONOPOLY_PARADIGM (only gods have magic)

**Total Paradigms Implemented: 40+**

#### Law Enforcement System (100%)
- ✅ MagicLawEnforcer class
- ✅ Spell validation against paradigm laws
- ✅ Cost calculation based on paradigm rules
- ✅ Risk evaluation with proficiency modifiers
- ✅ Channel requirement checking
- ✅ Cross-paradigm spell resolution
- ✅ Law violation consequence system

#### Multi-Paradigm System (100%)
- ✅ ParadigmComposition module
- ✅ Paradigm relationship mapping (compatible/conflicting/synergistic)
- ✅ Hybrid paradigm creation (e.g., Theurgy = Academic + Divine)
- ✅ Multi-paradigm caster support
- ✅ Paradigm instability tracking
- ✅ Emergent property system for hybrid paradigms
- ✅ Multi-paradigm artifact enchantment

#### Artifact/Enchantment System (100%)
- ✅ EnchantmentSystem definitions per paradigm
- ✅ 7 paradigm-specific enchantment systems
- ✅ Sentience creation mechanics (e.g., Breath Awakening)
- ✅ Permanence levels (temporary, sustained, permanent)
- ✅ Material requirements
- ✅ Enchantment risks and failure modes
- ✅ Multi-paradigm artifact support

#### Skill Tree System (100%)
- ✅ MagicSkillTree type definitions
- ✅ Unlock condition system (13 condition types)
- ✅ Skill node categories (offensive, defensive, utility, mastery)
- ✅ Proficiency tracking and XP systems
- ✅ Tier-based progression
- ✅ MagicSkillTreeEvaluator for condition checking
- ✅ MagicSkillTreeRegistry for centralized management
- ✅ **Paradigm-specific skill trees** (6 trees):
  - ALLOMANCY_SKILL_TREE (metal burning progression)
  - SHINTO_SKILL_TREE (Kami relationship building)
  - SYMPATHY_SKILL_TREE (binding and slippage mastery)
  - DAEMON_SKILL_TREE (daemon form settling)
  - DREAM_SKILL_TREE (dream realm navigation)
  - SONG_SKILL_TREE (musical mastery and choir coordination)

#### Spell System (100%)
- ✅ ComposedSpell interface (Technique + Form)
- ✅ SpellRegistry for managing known spells
- ✅ Player spell state tracking
- ✅ Example spells library
- ✅ Spell proficiency system
- ✅ Cast history tracking

#### Combo Detection (100%)
- ✅ ComboDetector for resonant spell combinations
- ✅ Forbidden combination checking
- ✅ Synergy detection across paradigms
- ✅ Combo history tracking
- ✅ Power multiplier calculations

#### State Management (100%)
- ✅ MagicSystemStateManager
- ✅ Paradigm runtime state tracking
- ✅ State change event system
- ✅ Serialization support
- ✅ Per-paradigm state isolation

#### LLM Integration (100%)
- ✅ Procedural spell generation prompts
- ✅ Procedural paradigm generation prompts
- ✅ Generated spell parsing
- ✅ Dimensional context for LMI prompts
- ✅ High-dimensional navigation hints

#### Testing Coverage (100%)
- ✅ **190 passing tests** across 6 test files
- ✅ Adversarial/exploit tests (timing, state, cross-system)
- ✅ Edge case coverage
- ✅ Breaking test coverage
- ✅ All type errors resolved

**Total Lines of Code: ~18,500 lines** (including recent additions)

---

### ⚠️ Partially Complete Features

#### Spell Execution System (85%)
- ✅ Spell validation infrastructure
- ✅ Cost deduction framework
- ✅ **NEW:** SpellEffectExecutor - Complete effect application engine (647 lines)
- ✅ **NEW:** Effect applier architecture - Pluggable effect handlers
- ✅ **NEW:** HealingEffectApplier - First complete applier (491 lines)
- ✅ **NEW:** Active effect tracking - Duration, stacking, expiration
- ✅ **NEW:** Effect events - System for UI/logging integration
- ✅ Spell targeting system - 9 target types, 8 area shapes, 13 target filters
- ✅ Area of effect calculations
- ✅ Duration/sustained spell tracking
- ⚠️ **Partial:** 16 of 17 effect appliers still need implementation
- ⚠️ **Missing:** Integration with game world damage/transform systems
- **Status:** Core engine complete, most appliers pending

#### Cross-Universe Magic (60%)
- ✅ ParadigmInteraction type definitions
- ✅ Adaptation system framework
- ✅ Power modifier calculations
- ❌ **Missing:** Runtime universe-crossing detection
- ❌ **Missing:** Automatic spell transformation on universe entry
- ❌ **Missing:** Integration with universe travel system
- **Status:** Framework complete, runtime integration pending

#### Paradigm Discovery (0%)
- ❌ **Not Started:** Research/discovery mechanics
- ❌ **Not Started:** How agents learn new paradigms
- ❌ **Not Started:** Integration with research system
- **Status:** Designed but not implemented

---

### ❌ Not Implemented

#### Active Systems
1. **MagicSystem (execution)**: No ECS system for actually casting spells during gameplay
2. ~~**ManaRegenerationSystem**~~: ✅ **COMPLETED** - MagicSourceGenerator handles regeneration (1069 lines)
3. **EnchantmentSystem (runtime)**: Enchantment creation not integrated into crafting
4. **ParadigmDiscoverySystem**: No way for agents to learn new paradigms
5. **RiskResolutionSystem**: Risks defined but no system to trigger consequences
6. ~~**SpellPersistenceSystem**~~: ✅ **COMPLETED** - Active effect tracking in SpellEffectExecutor

#### UI Integration
1. **Spell selection UI**: No player interface for choosing spells
2. **Skill tree visualization**: Trees defined but no UI to view/purchase skills
3. **Paradigm discovery UI**: No interface for exploring available paradigms
4. **Enchantment crafting UI**: No interface for creating artifacts

#### Agent Integration
1. **Agent spellcasting behavior**: Agents don't autonomously use magic
2. **LLM decision integration**: Magic not exposed to LLM decision-making
3. **Memory of magical events**: No integration with agent memory system
4. **Social reactions to magic**: No social gradient for magic use

#### Balance & Tuning
1. **Power level balancing**: No gameplay testing for paradigm balance
2. **Cost tuning**: Mana costs and other costs not gameplay-tested
3. **Risk probability tuning**: Risk probabilities not calibrated
4. **XP curve balancing**: Skill tree progression not tuned

---

## Open Questions

1. **Paradigm discovery**: Can agents research/discover new paradigms?
   - **Status:** Framework exists, not implemented
2. **Hybrid paradigms**: Can two paradigms merge into a new one?
   - **Status:** ✅ IMPLEMENTED - ParadigmComposition module
3. **Paradigm evolution**: Do paradigms change over cosmic time?
   - **Status:** Not designed
4. **Anti-magic**: How do null-magic zones interact with paradigms?
   - **Status:** ✅ IMPLEMENTED - Null paradigms with suppression
5. **Divine paradigms**: Do gods have their own meta-paradigm?
   - **Status:** Not designed
6. **Effect application**: How do spell effects integrate with game mechanics?
   - **Status:** Not implemented
7. **Agent autonomy**: How do agents decide when to use magic?
   - **Status:** Not implemented
