# Divinity-Magic System Integration

> How divine power relates to (and differs from) mortal magic.

## Overview

The divinity system and magic paradigm system are related but distinct. This document defines:

1. How divine power (belief) relates to magic paradigms
2. How gods interact with mortal magic systems
3. How universes can have gods without having mortal magic
4. The relationship between priest magic and direct divine power
5. How emergent gods develop their own "paradigms"

---

## Core Distinction: Divine Power vs Mortal Magic

| Aspect | Mortal Magic | Divine Power |
|--------|--------------|--------------|
| **Source** | Varies by paradigm (mana, blood, names, etc.) | Always belief from worshippers |
| **Who can use it** | Mortals who meet paradigm requirements | Only deities (player or emergent) |
| **Learned how** | Study, pact, awakening, etc. | Accumulated through worship |
| **Costs what** | Mana, health, favor, corruption, etc. | Belief points |
| **Constrained by** | Paradigm laws (conservation, etc.) | Deity's established domains/identity |
| **Risk of** | Mishaps, corruption, burnout | Identity conflict, belief drain |

### The Fundamental Difference

Mortal magic operates within reality's rules. Divine power operates *on* reality's rules—but only through the lens of what believers think the deity can do.

A wizard who learns fire magic can always cast fire magic (if they have mana). A god who believers associate with fire can use fire powers—but if their believers have never associated them with healing, healing costs them more and risks identity conflict.

---

## Belief as a Magic Source

The magic paradigm system already includes `'social'` as a `MagicSourceType`:

```typescript
type MagicSourceType =
  // ... other types ...
  | 'social'        // From believers, worshippers, collective faith
```

This is exactly what powers deities. The Belief resource from the divinity system IS the 'social' source type, manifested at a cosmic scale.

### Divine Source Definition

```typescript
const DIVINE_BELIEF_SOURCE: MagicSource = {
  id: 'belief',
  name: 'Collective Belief',
  type: 'social',

  regeneration: 'prayer',     // Regenerates through worship
  regenRate: 0,               // No passive regen - requires active belief

  storable: true,             // Gods store belief in their essence
  transferable: true,         // Can be given to angels
  stealable: true,            // Can be lost to rival gods

  detectability: 'undetectable',  // Mortals can't see belief flow

  description: 'Power drawn from the accumulated faith of worshippers',
};
```

---

## The Theurgic Paradigm: God Magic

Gods don't use mortal paradigms—they use **Theurgic** power. This is not the same as the mortal Theurgy hybrid (Divine + Academic); this is the paradigm that describes how deities themselves operate.

```typescript
const THEURGIC_PARADIGM: MagicParadigm = {
  id: 'theurgic',
  name: 'The Theurgic',
  description: 'Divine power channeled through accumulated belief',
  universeIds: [],  // Available in ALL universes

  lore: `This is not magic that mortals use - it is the power of gods themselves.
         Deities accumulate belief from worshippers and spend it to affect reality.
         What they can do depends on what their believers think they can do.`,

  sources: [DIVINE_BELIEF_SOURCE],

  costs: [{
    type: 'favor',             // Labeled as 'favor' but really belief
    canBeTerminal: false,      // Gods can't die from using power
    cumulative: false,
    recoverable: true,
    recoveryMethod: 'prayer',  // Worship restores it
    visibility: 'hidden',      // Mortals don't see belief costs
  }],

  channels: [
    // Gods can channel power in many ways
    { type: 'will', requirement: 'required', canBeMastered: false, blockEffect: 'no_effect' },
    { type: 'dream', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect' },
    { type: 'prayer', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect' },
    { type: 'touch', requirement: 'optional', canBeMastered: false, blockEffect: 'no_effect' },
  ],

  laws: [{
    id: 'domain_constraint',
    name: 'Domain Constraint',
    type: 'belief',
    strictness: 'strong',
    canBeCircumvented: true,
    circumventionCostMultiplier: 3.0,
    description: 'Acting outside your domains costs more and risks identity conflict',
  }, {
    id: 'belief_requirement',
    name: 'Belief Requirement',
    type: 'sacrifice',
    strictness: 'absolute',
    canBeCircumvented: false,
    description: 'All divine acts require expenditure of accumulated belief',
  }, {
    id: 'narrative_truth',
    name: 'Narrative Truth',
    type: 'narrative',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'What believers think you did becomes what you did',
  }],

  risks: [
    { trigger: 'overuse', consequence: 'silence', severity: 'moderate', probability: 0.1,
      mitigatable: true, description: 'Run out of belief and cannot act' },
    { trigger: 'paradox', consequence: 'corruption_gain', severity: 'moderate', probability: 0.3,
      mitigatable: false, description: 'Acting against your identity causes trait drift' },
  ],

  acquisitionMethods: [{
    method: 'ascension',
    rarity: 'legendary',
    voluntary: false,
    grantsAccess: ['belief'],
    startingProficiency: 100,  // Gods are immediately proficient
    description: 'Become a deity through accumulation of belief',
  }],

  // Gods can do anything - but domain affects cost
  availableTechniques: ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance', 'summon'],
  availableForms: ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image', 'void', 'time', 'space'],

  powerScaling: 'step',         // Power depends on belief thresholds
  powerCeiling: undefined,      // No cap on divine power
  allowsGroupCasting: true,     // Multiple gods can combine power
  groupCastingMultiplier: 2.0,
  allowsEnchantment: true,      // Divine items exist
  persistsAfterDeath: true,     // Divine effects outlast the deity
  allowsTeaching: false,        // Can't teach being a god
  allowsScrolls: false,

  foreignMagicPolicy: 'compatible',  // Divine power works alongside mortal magic
};
```

---

## Domain-Power Mapping

A deity's established domains affect what they can do efficiently. This maps to the magic paradigm's technique/form system:

### Domain → Forms Mapping

| Divine Domain | Primary Forms | Secondary Forms |
|---------------|---------------|-----------------|
| Harvest | plant | water, earth, animal |
| War | body | fire, mind |
| Wisdom | mind | spirit, image |
| Craft | earth | fire, body |
| Nature | plant, animal | water, earth, air |
| Death | spirit, void | body, mind |
| Love | mind, spirit | body |
| Chaos | void | all forms at random |
| Order | all forms | (but must be structured) |
| Fortune | void | all (probability) |
| Protection | body, spirit | earth |
| Healing | body | spirit, plant |
| Mystery | void, spirit | image, mind |
| Time | time | void, spirit |
| Sky | air | fire, water, image |
| Earth | earth | plant, animal |
| Water | water | animal, plant |

### Domain Cost Modifier

```typescript
interface DomainPowerCost {
  inDomain: number;       // 1.0 = normal cost
  adjacentDomain: number; // Forms that relate but aren't primary
  outOfDomain: number;    // Forms with no relation to domain
}

const DOMAIN_COST_MODIFIERS: DomainPowerCost = {
  inDomain: 0.7,          // 30% discount for domain powers
  adjacentDomain: 1.0,    // Normal cost for related powers
  outOfDomain: 2.0,       // Double cost for unrelated powers
};
```

### Identity Risk for Off-Domain Actions

Acting significantly outside established domains risks identity conflict:

```typescript
interface IdentityConflictRisk {
  // How established is your current identity?
  traitConfidence: number;  // 0-1

  // How far off-domain is this action?
  domainDistance: 'in_domain' | 'adjacent' | 'distant' | 'opposite';

  // Calculated risk
  conflictProbability: number;  // 0-1, chance of identity drift

  // What happens if conflict occurs
  possibleOutcomes: [
    'trait_weakening',    // Existing trait loses confidence
    'new_trait_emerges',  // Action creates a new trait
    'believer_confusion', // Some believers doubt
    'schism_trigger',     // Major theological dispute
  ];
}
```

---

## Universes Without Mortal Magic

Not all universes have mortal magic. Some key configurations:

### Configuration 1: No Magic, Active Gods

```typescript
const NO_MORTAL_MAGIC_UNIVERSE: ParadigmLayerConfig = {
  activeParadigms: [],                   // NO mortal paradigms
  primaryParadigm: undefined,

  relationships: {},
  allowsMultiClass: false,
  maxParadigmsPerPractitioner: 0,
  powerCombination: 'highest',
  sharedResources: false,
  allowsSimultaneousCasting: false,

  // Gods still function
  divineActive: true,                    // New field
  divinityParadigm: 'theurgic',          // Gods use theurgic power
};
```

In these universes:
- Mortals have NO magical ability
- Gods can still perform miracles
- Divine intervention is the ONLY supernatural force
- Miracles are unambiguously divine (no mistaking for magic)

### Configuration 2: Limited Divine-Only Magic

```typescript
const DIVINE_ONLY_UNIVERSE: ParadigmLayerConfig = {
  activeParadigms: ['divine'],           // Only priest magic
  primaryParadigm: 'divine',

  // Only way to get magic is through a deity
  acquisitionRestriction: 'divine_gift_only',

  relationships: {},
  allowsMultiClass: false,
  maxParadigmsPerPractitioner: 1,
  powerCombination: 'highest',
  sharedResources: false,
  allowsSimultaneousCasting: false,

  divineActive: true,
  divinityParadigm: 'theurgic',
};
```

In these universes:
- Magic exists but ONLY through divine patronage
- Priests channel deity power, not their own
- No wizards, only clerics
- Magic is always religious in nature

### Configuration 3: Full Magic with Active Gods

```typescript
const FULL_MAGIC_UNIVERSE: ParadigmLayerConfig = {
  activeParadigms: ['academic', 'divine', 'names', 'blood'],
  primaryParadigm: 'academic',

  relationships: PARADIGM_RELATIONSHIPS,
  allowsMultiClass: true,
  maxParadigmsPerPractitioner: 3,
  powerCombination: 'average',
  sharedResources: false,
  allowsSimultaneousCasting: true,

  divineActive: true,
  divinityParadigm: 'theurgic',
};
```

Standard fantasy universe where:
- Multiple magic traditions exist
- Gods are active and can intervene
- Divine and mortal magic coexist
- Theological questions about magic's source

---

## Gods Granting Magic

Deities can grant magical ability to mortals. This maps to the existing `'gift'` acquisition method.

### Divine Gift Process

```typescript
interface DivineGift {
  // Who's granting
  grantingDeity: string;

  // Who's receiving
  recipient: string;       // Agent ID

  // What's being granted
  paradigmId: string;      // Usually 'divine' but could vary
  grantedSources: string[];
  grantedTechniques: MagicTechnique[];
  grantedForms: MagicForm[];

  // Limitations
  restrictions: string[];  // "Only for healing", "Never for harm"
  revocable: boolean;      // Can deity take it back?
  loyaltyRequired: boolean; // Does faith affect power?

  // Costs to deity
  beliefCost: number;      // One-time cost
  maintenanceCost: number; // Ongoing cost

  // Costs to recipient
  recipientObligations: string[];
}
```

### Types of Divine Gifts

1. **Champion's Blessing**: Full divine magic access
   - High belief cost to deity
   - Recipient becomes a powerful priest/paladin
   - Usually requires sustained devotion

2. **Miracle Touch**: Single-use divine powers
   - Low belief cost
   - Recipient can perform one miracle
   - Often given to desperate believers

3. **Prophet's Voice**: Communication powers
   - Medium cost
   - Recipient can receive and share visions
   - Core to religious leaders

4. **Domain Fragment**: Subset of deity's power
   - Variable cost based on scope
   - Recipient gets part of deity's domain
   - e.g., A harvest god grants plant-affecting magic

### Gift Integration with MagicComponent

```typescript
// Extended MagicComponent for divine gifts
interface DivinelyGiftedMagic {
  // Source of power
  grantingDeityId: string;

  // Current standing
  deityStanding: 'favored' | 'neutral' | 'disfavored' | 'forsaken';

  // What was granted
  grantedAt: number;              // Game tick
  grantType: 'champion' | 'miracle' | 'prophet' | 'fragment';

  // Limitations
  domainLimitations?: DivineDomain[];
  useRestrictions?: string[];

  // Revocation risk
  loyaltyCheckFrequency: number;  // How often deity evaluates
  revocationThreshold: number;    // Faith level below which revoked
}
```

---

## Emergent Gods and Paradigm Development

When a new god emerges, they develop their own relationship with power based on how they formed.

### Emergence → Paradigm Flavor

```typescript
interface EmergentDeityMagicProfile {
  // How did they emerge?
  emergenceTrigger: EmergenceTrigger;

  // What paradigm flavor do they have?
  paradigmFlavor: ParadigmFlavor;

  // Natural affinities
  naturalDomains: DivineDomain[];
  naturalForms: MagicForm[];
  naturalTechniques: MagicTechnique[];

  // Resistance/weakness
  resistantToParadigms: string[];  // Magic they shrug off
  vulnerableToParadigms: string[]; // Magic that hurts them more
}

type ParadigmFlavor =
  | 'pure_theurgic'      // Standard belief-based power
  | 'elemental_theurgic' // Strong ties to elemental forms
  | 'blood_theurgic'     // Emerged from trauma, blood magic resonance
  | 'name_theurgic'      // Emerged from stories, true names matter
  | 'emotional_theurgic' // Emerged from passion, emotion-driven
  | 'ancestral_theurgic' // Elevated ancestor, ancestral magic resonance
  | 'void_theurgic';     // Emerged from fear/absence, void magic resonance
```

### Example: Fear-Born Storm God

A god who emerged from collective fear of storms would have:

```typescript
const STORM_CALLER_MAGIC_PROFILE: EmergentDeityMagicProfile = {
  emergenceTrigger: 'fear_manifestation',

  paradigmFlavor: 'emotional_theurgic',

  naturalDomains: ['nature', 'chaos', 'fear'],
  naturalForms: ['air', 'water', 'fire', 'void'],  // Storm elements + void for fear
  naturalTechniques: ['destroy', 'control', 'summon'],

  resistantToParadigms: ['academic'],    // Learned magic feels weak against primal fear
  vulnerableToParadigms: ['divine'],     // Other gods can challenge it
};
```

### Cross-Paradigm Deity Interactions

When deities conflict, their paradigm flavors matter:

```typescript
interface DeityMagicConflict {
  attacker: {
    deityId: string;
    paradigmFlavor: ParadigmFlavor;
    actionType: MagicTechnique;
    actionForm: MagicForm;
  };

  defender: {
    deityId: string;
    paradigmFlavor: ParadigmFlavor;
    naturalResistances: MagicForm[];
  };

  // Resolution
  effectivenessModifier: number;  // Based on flavor interaction
  narrativeConsequence: string;   // What story emerges
}
```

---

## Divine Artifacts vs Magical Artifacts

Both gods and mortal mages can create enchanted items, but they work differently.

### Divine Artifacts (Holy Relics)

```typescript
interface DivineArtifact {
  itemId: string;

  // Divine source
  creatorDeity: string;
  createdAt: number;
  beliefInvested: number;

  // Divine properties
  domains: DivineDomain[];
  divinePowers: DivinePower[];

  // Faith-dependency
  requiresFaith: boolean;        // Does user need to believe?
  faithThreshold?: number;       // Minimum faith to use
  faithScaling?: number;         // How much faith improves it

  // Divine connection
  channelsDeity: boolean;        // Can deity see through it?
  canBeDesecrated: boolean;      // Can rival gods corrupt it?
  holySiteBonus: boolean;        // Stronger at sacred sites?
}
```

### Magical Artifacts (Enchanted Items)

Standard magic enchantment per `ArtifactCreation.ts`:
- Created through paradigm-specific processes
- Powered by mana/blood/breath/etc. invested during creation
- Works for anyone (usually)
- No faith requirement

### Hybrid: Blessed Magical Items

When a deity blesses an already-magical item:

```typescript
interface BlessedMagicalItem {
  // Base enchantment
  baseEnchantment: ArtifactEnchantment;

  // Divine overlay
  blessing: {
    grantingDeity: string;
    blessingType: 'enhancement' | 'protection' | 'alignment' | 'sentience';
    beliefInvested: number;
    faithDependency: number;  // 0 = works for all, 1 = only faithful
  };

  // Interaction
  enchantmentBlessingInteraction: 'synergistic' | 'independent' | 'conflicting';
}
```

---

## Integration with MagicLawEnforcer

The existing `MagicLawEnforcer` system should recognize divine actions:

```typescript
// Extended law enforcement for divine actions
interface DivineActionValidation {
  actor: Deity;
  action: DivineAction;

  // Law checks
  domainCompliance: {
    inDomain: boolean;
    costModifier: number;
    identityRisk: number;
  };

  beliefSufficiency: {
    hasEnoughBelief: boolean;
    beliefRequired: number;
    beliefAvailable: number;
  };

  narrativeConsistency: {
    consistentWithIdentity: boolean;
    conflictingTraits: string[];
    storyImplications: TraitImplication[];
  };

  // Final ruling
  permitted: boolean;
  modifiedCost?: number;
  warnings: string[];
}
```

---

## Example: Complete Divine Action Resolution

When the player god wants to perform a healing miracle:

```
1. ACTION REQUESTED
   Player: "Heal Farmer Holt's sick child"
   Type: Miracle
   Technique: enhance
   Form: body
   Base Cost: 400 belief

2. DOMAIN CHECK
   Player's domains: Nature (67%), Harvest (45%), Mystery (32%)
   Healing is adjacent to Nature (life/growth)
   Cost modifier: 1.0 (normal - adjacent domain)

3. IDENTITY CHECK
   Player's perceived personality:
   - Benevolent: 78% → healing fits
   - Mysterious: 89% → direct intervention slightly off-brand
   Cost modifier: 1.1 (slight tension with mystery)

4. BELIEF CHECK
   Current belief: 2,847
   Required (400 × 1.0 × 1.1): 440
   Sufficient: YES

5. VISIBILITY CHECK
   Witnesses: 4 agents nearby
   Miracle visibility: High
   Myth generation probability: 80%

6. RESOLUTION
   - Deduct 440 belief
   - Apply healing effect
   - Generate witness memories
   - Trigger myth formation:
     "The Watcher's Mercy" begins forming
   - Trait implications:
     - Healing domain: +0.12 confidence
     - Benevolent: +0.05 confidence
     - Mysterious: -0.02 confidence (too direct)

7. POST-ACTION
   Player's healing domain: 0% → 12%
   Identity slightly less mysterious, more merciful
   New story spreading through village
```

---

## Summary: Key Integration Points

1. **Belief IS the 'social' source type** at cosmic scale
2. **Gods use the Theurgic paradigm**, not mortal paradigms
3. **Domains map to magic forms** with cost modifiers
4. **Universes configure** whether mortal magic exists independently of divinity
5. **Divine gifts** use the existing 'gift' acquisition method
6. **Emergent gods** develop paradigm flavors based on their origin
7. **MagicLawEnforcer** extends to validate divine actions
8. **Divine artifacts** work differently from magical artifacts

The systems are parallel, not hierarchical. A god's power comes from belief, not from learning magic. A mage's power comes from their paradigm, not from worship. But they can interact—gods can grant magic, magic can affect gods, and divine artifacts can blend both systems.
