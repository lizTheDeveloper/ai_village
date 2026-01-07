# Divinity Package - God/Religion/Divine System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the divinity system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Divinity Package** (`@ai-village/divinity`) implements a comprehensive god/religion/divine interaction system with emergent deities, belief-based power, divine interventions, and complex pantheon politics.

**What it does:**
- Emergent deity system where gods form from collective mortal belief
- Belief economy: mortals generate belief through worship, gods spend belief on powers
- Divine powers: miracles, visions, blessings, curses, avatars, angels
- Pantheon dynamics: god relationships, alliances, rivalries, politics
- Religious institutions: temples, priests, rituals, holy texts
- Prophet/avatar system: gods manifesting in the mortal world
- Mythological framework: myths define deity identity and relationships
- Divine servants: angels and custom servant hierarchies

**Key files:**
- `packages/core/src/systems/BeliefGenerationSystem.ts` - Belief accumulation (priority 115)
- `packages/core/src/systems/DeityEmergenceSystem.ts` - God creation from belief
- `packages/core/src/systems/DivinePowerSystem.ts` - Divine action execution (priority 120)
- `packages/core/src/systems/AIGodBehaviorSystem.ts` - AI-controlled deity decisions
- `packages/divinity/src/DeityTypes.ts` - Core deity types and identity
- `packages/divinity/src/BeliefTypes.ts` - Belief economy types
- `packages/divinity/src/DivinePowerTypes.ts` - Power definitions and costs
- `packages/divinity/src/PantheonTypes.ts` - Pantheon structures and politics
- `packages/divinity/src/ReligionTypes.ts` - Temples, priests, rituals

---

## Package Structure

```
packages/divinity/
├── src/
│   ├── BeliefTypes.ts              # Belief economy types
│   ├── DeityTypes.ts               # Core deity entity types
│   ├── DivinePowerTypes.ts         # Divine powers and costs
│   ├── PantheonTypes.ts            # Pantheon structures and politics
│   ├── ReligionTypes.ts            # Temples, priests, rituals
│   ├── MythTypes.ts                # Mythological framework
│   ├── AvatarTypes.ts              # Avatar manifestation
│   ├── AngelTypes.ts               # Angel creation and management
│   ├── DivineServantTypes.ts       # Custom servant hierarchies
│   ├── DivineChatTypes.ts          # God-to-god communication
│   ├── AfterlifePolicy.ts          # Death and afterlife rules
│   ├── UniverseConfig.ts           # Divine system configuration
│   ├── MultiverseCrossing.ts       # Cross-universe divine travel
│   ├── AttributionSystem.ts        # Mortal attribution of events to gods
│   ├── VisionDeliverySystem.ts     # Vision/prophecy delivery
│   ├── LLMVisionGenerator.ts       # LLM-generated divine visions
│   ├── RiddleGenerator.ts          # Riddle generation for wisdom gods
│   ├── SoulNameGenerator.ts        # Soul naming system
│   ├── AIGodPersonality.ts         # AI god personality generation
│   ├── DeityRelations.ts           # God relationship calculations
│   ├── AnimistTypes.ts             # Animist belief systems
│   ├── RaceTemplates.ts            # Divine race templates
│   ├── UnderworldDeity.ts          # Death god archetype
│   ├── GodOfDeathEntity.ts         # Death god factory
│   ├── GoddessOfWisdomEntity.ts    # Wisdom goddess factory
│   ├── WisdomGoddessScrutiny.ts    # Wisdom validation system
│   ├── SoulCreationCeremony.ts     # Soul creation rituals
│   ├── CosmologyInteraction.ts     # Cosmology integration
│   ├── PresenceSpectrum.ts         # Divine presence mechanics
│   ├── MythologicalRealms.ts       # Divine realms
│   └── index.ts                    # Package exports
├── package.json
└── README.md                       # This file

packages/core/src/
├── components/
│   └── DeityComponent.ts           # Deity entity component
│   └── SpiritualComponent.ts       # Agent faith/prayer component
├── systems/
│   ├── BeliefFormationSystem.ts    # Agents form beliefs (priority 110)
│   ├── BeliefGenerationSystem.ts   # Generate belief from worship (priority 115)
│   ├── DeityEmergenceSystem.ts     # Emergent god creation (priority 118)
│   ├── DivinePowerSystem.ts        # Execute divine powers (priority 120)
│   ├── AIGodBehaviorSystem.ts      # AI god decision-making
│   ├── WisdomGoddessSystem.ts      # Wisdom goddess behaviors
│   └── DivineBodyModification.ts   # Divine transformations
└── divinity/                       # Divine subsystem (re-exports from @ai-village/divinity)
```

---

## Core Concepts

### 1. Belief Economy

**Belief is the fundamental resource of divinity.** Mortals generate belief through religious activity, gods accumulate it, and spend it on divine actions.

```typescript
// Belief activities (from lowest to highest generation)
type BeliefActivity =
  | 'passive_faith'       // 0.01 belief/hour - just being a believer
  | 'prayer'              // 0.1 belief/hour
  | 'meditation'          // 0.15 belief/hour
  | 'ritual'              // 0.3 belief/hour
  | 'sacrifice'           // 0.5 belief/hour (scales with value)
  | 'pilgrimage'          // 1.0 belief (one-time on arrival)
  | 'proselytizing'       // 0.2 belief/hour (+ conversion bonuses)
  | 'creation'            // 0.5 belief/hour (religious art/texts)
  | 'miracle_witness';    // 5.0 belief (one-time, massive boost)

// Belief state for a deity
interface DeityBeliefState {
  currentBelief: number;        // Current reserves
  beliefPerHour: number;        // Generation rate
  totalBeliefEarned: number;    // Lifetime accumulation
  totalBeliefSpent: number;     // Lifetime expenditure
  decayRate: number;            // Loss per hour without activity
  lastActivityTime: number;     // Last worship event
  fadingRisk: boolean;          // At risk of disappearing
}
```

**Belief thresholds unlock divine capabilities:**

```typescript
const BELIEF_THRESHOLDS = {
  minimum: 10,              // Stable existence
  minor_powers: 100,        // Whispers, omens, small signs
  moderate_powers: 500,     // Visions, minor miracles
  angel_creation: 2000,     // Create divine servants
  avatar_creation: 5000,    // Manifest physical form
  world_shaping: 10000,     // Reality-altering powers
};
```

**Belief generation modifiers:**
- **Faith strength:** Agent's faith level (0-1) multiplies base rate
- **Sacred site bonus:** Temples/shrines boost generation (+50% to +200%)
- **Communal bonus:** Group worship multiplies belief (+10% per additional worshipper)
- **Fervor multiplier:** Crises, miracles, religious fervor (2x-10x)

### 2. Emergent Deity Identity

**Gods are not pre-designed.** They emerge from collective mortal belief and are shaped by their believers' perceptions.

```typescript
interface DeityIdentity {
  // Name (given by first believers)
  primaryName: string;          // "The Harvest Lord"
  epithets: string[];           // ["Bringer of Plenty", "Green Father"]

  // Domain (emerges from attribution patterns)
  domain: DivineDomain;         // Primary domain
  secondaryDomains: DivineDomain[]; // Accumulated through myths

  // Personality (perceived, not real)
  perceivedPersonality: {
    benevolence: number;        // -1 (cruel) to 1 (kind)
    interventionism: number;    // -1 (distant) to 1 (involved)
    wrathfulness: number;       // 0 (patient) to 1 (quick to anger)
    mysteriousness: number;     // 0 (clear) to 1 (inscrutable)
    generosity: number;         // 0 (demanding) to 1 (giving)
    consistency: number;        // 0 (capricious) to 1 (reliable)
  };

  // Alignment (emerges from believer expectations)
  perceivedAlignment: 'benevolent' | 'malevolent' | 'neutral' | 'dualistic';

  // Physical form (as imagined by believers)
  describedForm: {
    description: string;        // "A towering figure with golden skin"
    height: 'towering' | 'tall' | 'human' | 'small' | 'varies';
    solidity: 'ghostly' | 'translucent' | 'solid' | 'varies';
    luminosity: 'none' | 'subtle' | 'bright' | 'blinding';
    distinctiveFeatures: string[]; // "Eyes like stars", "Antlers of oak"
    auraColor?: string;
    animalAspects?: string[];   // "Eagle", "Serpent"
  };

  // Iconography
  symbols: string[];            // "Sickle and grain"
  colors: string[];             // "Gold", "Green"
  sacredAnimals: string[];      // "Deer", "Sparrow"
  sacredPlants: string[];       // "Wheat", "Oak"
}
```

**Emergence process:**

1. **Proto-belief:** Scattered superstitions, no coherent entity
   - Agents believe in abstract concepts ("the harvest spirit")
   - Belief accumulates but no deity exists yet

2. **Coalescence:** Beliefs unite around a concept
   - Multiple agents share similar beliefs
   - Threshold reached (e.g., 100 aggregate belief points)

3. **Crystallization:** Entity forms, gets name
   - First deity entity created
   - Name assigned by first believer
   - Domain determined by attribution patterns

4. **Establishment:** Full deity, accumulating power
   - Receiving active worship
   - Building identity through myths
   - Can perform divine actions

### 3. Divine Powers

Gods spend belief to act in the world. Powers are tiered by belief cost and domain affinity.

```typescript
// Power tiers (based on current belief reserves)
type PowerTier =
  | 'dormant'       // < 10 belief, cannot act
  | 'minor'         // 10-99 belief
  | 'moderate'      // 100-499 belief
  | 'major'         // 500-1999 belief
  | 'supreme'       // 2000-4999 belief
  | 'world_shaping'; // 5000+ belief

// Power categories
type PowerCategory =
  | 'miracle'       // Physical world effects
  | 'vision'        // Communication to mortals
  | 'blessing'      // Positive enchantment
  | 'curse'         // Negative enchantment
  | 'manifestation' // Direct appearance
  | 'creation'      // Create entities (angels, artifacts)
  | 'destruction'   // Remove/destroy
  | 'transformation'// Change nature of things
  | 'knowledge'     // Reveal hidden information
  | 'emotion'       // Affect feelings
  | 'weather'       // Control weather
  | 'temporal';     // Time effects
```

**Example powers by tier:**

```typescript
// Minor (10+ belief)
'whisper'           // Send vague feeling to one mortal (cost: 5)
'subtle_sign'       // Small omen (bird flight, cloud shape) (cost: 8)
'dream_hint'        // Vague dream imagery (cost: 10)
'minor_luck'        // Small fortune/misfortune (cost: 15)

// Moderate (100+ belief)
'clear_vision'      // Send clear dream/vision (cost: 50)
'voice_of_god'      // Speak audible words (cost: 75)
'minor_miracle'     // Small physical effect (cost: 100)
'bless_individual'  // Grant minor blessing (cost: 80)
'heal_wound'        // Heal injury (cost: 120)

// Major (500+ belief)
'mass_vision'       // Vision to many people (cost: 300)
'major_miracle'     // Significant effect (cost: 500)
'resurrect_recent'  // Return recently dead (cost: 800)
'smite'             // Strike down individual (cost: 600)
'create_relic'      // Imbue object with power (cost: 700)

// Supreme (2000+ belief)
'create_angel'      // Create divine servant (cost: 1500)
'manifest_avatar'   // Take physical form (cost: 2000)
'terraform_local'   // Reshape local geography (cost: 3000)

// World-Shaping (5000+ belief)
'create_species'    // Birth new creature type (cost: 8000)
'divine_cataclysm'  // Flood, earthquake (cost: 10000)
'ascend_mortal'     // Elevate to divinity (cost: 15000)
```

**Domain affinity:** Powers matching the god's domain cost less:

```typescript
// Death god resurrecting: 50% normal cost
// Fire god summoning flames: 30% normal cost
// Wisdom god revealing truth: 40% normal cost

const domainModifier = getDomainCostModifier(deity.domain, powerType);
const finalCost = baseCost * domainModifier;
```

### 4. Avatars & Angels

**Avatars:** Gods can manifest physically in the mortal world.

```typescript
interface Avatar {
  deityId: string;              // Parent deity
  form: AvatarForm;             // Physical form chosen
  stats: AvatarStats;           // Combat/interaction stats
  state: AvatarState;           // Current activity
  disguised: boolean;           // Hiding divine nature?
  maintenanceCost: number;      // Belief cost per hour
  abilities: AvatarAbility[];   // Special powers
}

interface AvatarForm {
  type: 'mortal' | 'beast' | 'hybrid' | 'ethereal' | 'elemental';
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  appearance: string;           // Description
  movement: 'walk' | 'fly' | 'swim' | 'teleport';
  tells: DivineTell[];          // Subtle giveaways (eyes glow, no shadow)
}

// Creating an avatar
const avatarCost = 2000;        // Base cost
const maintenanceCost = 50;     // Per hour
```

**Angels:** Divine servants created to serve the deity.

```typescript
interface Angel {
  deityId: string;              // Creator deity
  type: AngelType;              // 'messenger' | 'guardian' | 'warrior' | 'scholar'
  rank: AngelRank;              // 'seraph' | 'archangel' | 'angel' | 'cherub'
  personality: AngelPersonality; // Loyal, independent, zealous, etc.
  orders: AngelOrders;          // Current task
  maintenanceCost: number;      // Belief cost per day
}

// Angel creation cost: 1500 belief
// Maintenance: 10-50 belief/day depending on rank
```

### 5. Temples & Religious Institutions

**Temples** are sacred buildings that amplify belief generation:

```typescript
interface Temple {
  id: string;
  buildingId: string;           // Physical building entity
  primaryDeityId: string;       // Deity worshipped
  name: string;                 // "Temple of the Harvest Lord"
  type: TempleType;             // 'shrine' | 'temple' | 'cathedral'
  size: TempleSize;             // 'tiny' | 'small' | 'medium' | 'large'
  sanctity: number;             // How sacred (0-100)
  beliefBonus: number;          // Belief generation multiplier
  headPriestId?: string;        // Leading priest
  priestIds: string[];          // All priests
  regularWorshipperIds: string[]; // Frequent visitors
  holyTextIds: string[];        // Sacred texts stored
  relicIds: string[];           // Divine artifacts
  guardingAngelId?: string;     // Protecting angel
  scheduledRituals: ScheduledRitual[]; // Regular ceremonies
  desecrated: boolean;          // Has been defiled?
}

// Belief bonuses by temple size
'shrine':    +50%
'temple':    +100%
'cathedral': +200%
```

**Priests** perform rituals and manage temples:

```typescript
interface Priest {
  agentId: string;              // Agent serving as priest
  deityId: string;              // Deity served
  templeId: string;             // Home temple
  rank: PriestRank;             // 'novice' | 'priest' | 'high_priest' | 'pontiff'
  role: PriestRole;             // 'ritualist' | 'teacher' | 'healer' | 'oracle'
  devotion: number;             // Faith strength (0-1)
  effectiveness: number;        // How well they perform (0-1)
}
```

### 6. Pantheons & Divine Politics

**Pantheons** are collections of deities with shared mythology and political structures:

```typescript
interface Pantheon {
  id: string;
  name: string;                 // "The Twelve Olympians"
  structure: PantheonStructure; // How organized
  memberDeityIds: string[];     // All gods in pantheon
  rulerDeityId?: string;        // Supreme deity (if hierarchical)
  sharedMythIds: string[];      // Common mythology
  dominantDomains: DivineDomain[]; // Main domains
  politics: PantheonPolitics;   // Internal state
}

type PantheonStructure =
  | 'council'       // Gods meet as equals, vote
  | 'hierarchical'  // Clear rank ordering
  | 'familial'      // Divine family relationships
  | 'adversarial'   // Opposed factions
  | 'loose'         // Informal association
  | 'dualistic'     // Two opposing forces
  | 'henotheistic'  // Many gods, one supreme
  | 'monolatrous';  // Worship one, acknowledge others
```

**Divine relationships:**

```typescript
interface DivineRelationship {
  deityId1: string;
  deityId2: string;
  type: DivineRelationshipType; // 'alliance' | 'rivalry' | 'familial' | 'romantic'
  strength: number;             // -1 (hostile) to 1 (devoted)
  formalStatus: DivineFormalStatus; // Official relationship
  feelings: DivineFeeling[];    // Emotional bonds
  origin: RelationshipOrigin;   // How it started
  events: RelationshipEvent[];  // History
}

// Relationships affect divine politics and mortal conflicts
```

---

## System APIs

### BeliefGenerationSystem (Priority 115)

Generates belief from agents with faith and flows it to deities.

**Dependencies:** `BeliefFormationSystem` (priority 110), `TimeSystem`

**Update interval:** Every 20 ticks (~1 second at 20 TPS)

**Key methods:**

```typescript
class BeliefGenerationSystem {
  // Calculate belief generation for an agent
  private calculateBeliefGeneration(
    agent: Entity,
    activity: BeliefActivity,
    sacredSiteBonus: number,
    fervorMultiplier: number
  ): number;

  // Apply belief to deity
  private applyBeliefToDeity(
    deityEntity: Entity,
    beliefAmount: number
  ): void;

  // Apply decay to deities without active worship
  private applyBeliefDecay(
    deityEntity: Entity,
    timeSinceLastActivity: number
  ): void;
}
```

**Events emitted:**

```typescript
'belief:generated' → { agentId, deityId, amount, activity }
'belief:decayed' → { deityId, amount, fadingRisk }
'deity:fading' → { deityId, currentBelief, daysWithoutWorship }
'deity:vanished' → { deityId, finalBelief }
```

**Creating belief generation:**

```typescript
// Agent gains faith in a deity
const spiritual = agent.getComponent<SpiritualComponent>('spiritual');
spiritual.deityAllocations.set(deityId, {
  strength: 0.8,          // Faith strength (0-1)
  allocation: 100,        // 100% of daily faith to this deity
  activity: 'prayer'      // Current activity
});

// Belief automatically generates each tick
// BeliefGenerationSystem processes all believing agents
```

### DeityEmergenceSystem (Priority 118)

Detects when collective belief patterns should crystallize into a new deity.

**Dependencies:** `BeliefGenerationSystem`

**Update interval:** Every 1200 ticks (~1 minute at 20 TPS)

**Emergence detection:**

```typescript
interface EmergenceConfig {
  minBelievers: number;         // Min agents sharing belief (default: 3)
  minAverageStrength: number;   // Min faith strength (default: 0.6)
  minCohesion: number;          // How similar beliefs are (default: 0.7)
  minBeliefPoints: number;      // Min accumulated belief (default: 100)
}

// Emergence triggers:
// 1. Enough agents believe in the same concept
// 2. Beliefs are cohesive (similar perceptions)
// 3. Total belief reaches threshold
// 4. System creates new deity entity
```

**Events emitted:**

```typescript
'deity:proto_belief' → { concept, contributors, totalBelief }
'deity:coalescence' → { concept, pattern, agentCount }
'deity:emergence' → { deityId, name, domain, believers }
'deity:established' → { deityId, beliefRate, templeCount }
```

**Creating emergent deities:**

```typescript
// Agents develop shared belief in a concept
const agents = [agent1, agent2, agent3];
for (const agent of agents) {
  const spiritual = agent.getComponent<SpiritualComponent>('spiritual');

  // Each agent believes in "harvest spirit"
  spiritual.beliefs.push({
    concept: 'harvest',
    strength: 0.8,
    source: 'observation', // Saw good harvest after rain
    timestamp: world.tick
  });
}

// System detects pattern and creates deity
// Emergence happens automatically when thresholds met
```

### DivinePowerSystem (Priority 120)

Executes divine powers and manages their effects.

**Dependencies:** `BeliefGenerationSystem`, `DeityEmergenceSystem`

**Update interval:** Every tick (processes queued powers)

**Key methods:**

```typescript
class DivinePowerSystem {
  // Queue a divine power for execution
  queuePower(request: DivinePowerRequest): void;

  // Execute a divine power
  private executePower(
    deity: Entity,
    powerType: DivinePowerType,
    target?: Entity,
    params?: Record<string, any>
  ): PowerUseResult;

  // Send vision to mortal
  private sendVision(
    deity: Entity,
    target: Entity,
    content: VisionContent
  ): void;

  // Apply blessing to target
  private applyBlessing(
    deity: Entity,
    target: Entity,
    blessingType: BlessingType,
    duration: number
  ): void;

  // Execute miracle in the world
  private executeMiracle(
    deity: Entity,
    miracleType: string,
    location: { x: number; y: number },
    magnitude: number
  ): void;
}
```

**Events emitted:**

```typescript
'divine_power:used' → { deityId, powerType, target, cost }
'divine_power:failed' → { deityId, powerType, reason }
'vision:sent' → { deityId, targetId, content, clarity }
'blessing:applied' → { deityId, targetId, blessingType, duration }
'curse:applied' → { deityId, targetId, curseType, severity }
'miracle:executed' → { deityId, miracleType, location, witnesses }
```

**Using divine powers:**

```typescript
// God sends vision to believer
eventBus.emit('divine_power:request', {
  deityId: 'harvest_god_001',
  powerType: 'clear_vision',
  targetId: 'agent_123',
  params: {
    content: {
      type: 'prophetic',
      message: 'Plant wheat when the moon is full',
      clarity: 0.9,
      emotional_weight: 0.7
    }
  }
});

// God performs miracle
eventBus.emit('divine_power:request', {
  deityId: 'storm_god_002',
  powerType: 'storm_calling',
  params: {
    location: { x: 100, y: 100 },
    intensity: 'heavy',
    duration: 3600 // Game seconds
  }
});

// God blesses agent
eventBus.emit('divine_power:request', {
  deityId: 'fortune_god_003',
  powerType: 'bless_individual',
  targetId: 'agent_456',
  params: {
    blessingType: 'luck',
    duration: 86400, // 1 day
    magnitude: 1.5   // 50% luck boost
  }
});
```

### AIGodBehaviorSystem

AI-controlled deity decision-making system.

**Update interval:** Every 100 ticks (~5 seconds)

**Key behaviors:**

```typescript
// AI gods decide:
// 1. Which prayers to answer
// 2. When to perform miracles
// 3. How to interact with other gods
// 4. When to manifest avatars
// 5. How to respond to worship/heresy

// Personality affects decisions:
// - Benevolent gods answer more prayers
// - Wrathful gods smite more often
// - Mysterious gods send cryptic visions
// - Interventionist gods manifest more
```

---

## Usage Examples

### Example 1: Creating an Emergent Deity

```typescript
import { SpiritualComponent } from '@ai-village/core';

// Step 1: Agents develop shared belief
const farmers = world.query()
  .with('agent')
  .with('farming')
  .executeEntities();

for (const farmer of farmers) {
  const spiritual = farmer.getComponent<SpiritualComponent>('spiritual');

  // Each farmer believes in harvest spirit
  spiritual.beliefs.push({
    concept: 'harvest',
    strength: 0.85,
    source: 'tradition', // Learned from elders
    timestamp: world.tick
  });
}

// Step 2: Emergence happens automatically
// DeityEmergenceSystem detects pattern (3+ believers, cohesion > 0.7)
// System creates deity entity with:
// - Name: Chosen by first believer
// - Domain: 'harvest'
// - Identity: Formed from collective perceptions
```

### Example 2: God Sending a Vision

```typescript
import { eventBus } from '@ai-village/core';

// Find a deity
const deities = world.query().with('deity').executeEntities();
const harvestGod = deities.find(d =>
  d.getComponent('deity').identity.domain === 'harvest'
);

// Find a believer
const deity = harvestGod.getComponent('deity');
const believerId = [...deity.believers][0];

// Send prophetic vision
eventBus.emit('divine_power:request', {
  deityId: harvestGod.id,
  powerType: 'clear_vision',
  targetId: believerId,
  params: {
    content: {
      type: 'prophetic',
      message: 'A great drought comes. Store grain now.',
      imagery: 'You see withered fields and empty granaries',
      clarity: 0.9,
      emotional_weight: 0.8,
      prophetic_hint: 'drought_in_30_days'
    }
  }
});

// Cost: 50 belief (harvest domain, on-domain = normal cost)
// Believer receives vision in dreams
// Vision stored in spiritual.visions array
```

### Example 3: Creating a Temple

```typescript
import { createShrine } from '@ai-village/divinity';

// Build temple building first (via BuildingSystem)
const templeBuilding = world.createEntity();
templeBuilding.addComponent({
  type: 'building',
  buildingType: 'temple',
  position: { x: 100, y: 100 }
});

// Create temple entity
const temple = createShrine({
  buildingId: templeBuilding.id,
  primaryDeityId: harvestGod.id,
  name: 'Shrine of the Green Father',
  size: 'small',
  founderAgentId: 'priest_001'
});

// Add to deity's sacred sites
const deity = harvestGod.getComponent('deity');
deity.sacredSites.add(temple.id);

// Temple provides +50% belief generation to worshippers
// Agents who pray at temple generate 1.5x normal belief
```

### Example 4: Performing a Miracle

```typescript
// God of storms summons rain to end drought
eventBus.emit('divine_power:request', {
  deityId: 'storm_god_001',
  powerType: 'minor_miracle',
  params: {
    miracleType: 'summon_rain',
    location: { x: 100, y: 100 },
    radius: 20,
    intensity: 'moderate',
    duration: 7200 // 2 hours
  }
});

// Cost calculation:
// - Base cost: 100 belief
// - Storm domain: -30% (70 belief)
// - Visible to 15 agents
// - Each witness generates 5.0 belief (miracle_witness activity)
// - Net gain: (15 * 5.0) - 70 = +5 belief

// Weather system receives event
// Rain begins falling in radius
// Crops receive water
// Agents witness miracle, generate massive belief
```

### Example 5: Creating an Angel

```typescript
import { eventBus } from '@ai-village/core';

// God creates guardian angel for temple
eventBus.emit('divine_power:request', {
  deityId: 'wisdom_god_001',
  powerType: 'create_angel',
  params: {
    angelType: 'guardian',
    rank: 'angel',
    assignment: {
      type: 'guard_temple',
      templeId: 'temple_005'
    },
    personality: {
      loyalty: 1.0,
      independence: 0.3,
      zeal: 0.8
    }
  }
});

// Cost: 1500 belief (one-time)
// Maintenance: 20 belief/day
// Angel entity created with:
// - Guardian abilities (divine protection aura)
// - Orders: Protect temple from desecration
// - Will attack hostile agents who enter
// - Can deliver messages for deity
```

### Example 6: Pantheon Formation

```typescript
import { createPantheon } from '@ai-village/divinity';

// Multiple deities exist in same civilization
const deities = world.query().with('deity').executeEntities();

// Create pantheon
const pantheon = createPantheon({
  name: 'The Twelve Pillars',
  structure: 'council',
  founderDeityId: deities[0].id,
  memberDeityIds: deities.slice(0, 12).map(d => d.id),
  dominantDomains: ['harvest', 'war', 'wisdom', 'craft']
});

// Pantheon automatically tracks:
// - Divine relationships (alliances, rivalries)
// - Shared mythology
// - Political stability
// - Total believer count across all members
```

---

## Architecture & Data Flow

### System Execution Order

```
1. TimeSystem (priority 10)
   ↓ Updates game time
2. BeliefFormationSystem (priority 110)
   ↓ Agents form beliefs from observations
3. BeliefGenerationSystem (priority 115)
   ↓ Generate belief from worship activities
4. DeityEmergenceSystem (priority 118)
   ↓ Detect patterns, create new deities
5. DivinePowerSystem (priority 120)
   ↓ Execute queued divine powers
6. AIGodBehaviorSystem (priority 125)
   ↓ AI gods decide actions
7. Agent systems (priority 200+)
   ↓ Agents react to divine visions, blessings
```

### Event Flow

```
Agent observes miracle
  ↓ Forms belief
BeliefFormationSystem
  ↓ 'belief:formed' event
BeliefGenerationSystem
  ↓ Generates belief points
  ↓ 'belief:generated' event
DeityComponent
  ↓ Accumulates belief
  ↓ Crosses power threshold
DivinePowerSystem
  ↓ God can perform higher-tier powers
  ↓ 'divine_power:used' event
Agents witness power
  ↓ 'miracle_witness' activity
  ↓ Massive belief boost (5.0/witness)

Player UI requests divine action
  ↓ 'divine_power:request' event
DivinePowerSystem
  ↓ Validates cost, executes power
  ↓ Deducts belief
  ↓ Applies effects
  ↓ 'divine_power:used' event
RendererSystem
  ↓ Shows visual effects
  ↓ Displays vision to agent
```

### Component Relationships

```
Deity Entity
├── DeityComponent (required)
│   ├── identity → DeityIdentity
│   │   ├── primaryName: string
│   │   ├── domain: DivineDomain
│   │   └── perceivedPersonality: PerceivedPersonality
│   ├── belief → DeityBeliefState
│   │   ├── currentBelief: number
│   │   ├── beliefPerHour: number
│   │   └── decayRate: number
│   ├── believers: Set<string> → Agent IDs
│   ├── sacredSites: Set<string> → Temple IDs
│   └── prayerQueue: Prayer[]
└── Position (optional, for manifested gods)

Agent Entity
├── SpiritualComponent (optional)
│   ├── deityAllocations: Map<deityId, { strength, allocation, activity }>
│   ├── visions: Vision[] → Divine visions received
│   ├── blessings: ActiveBlessing[]
│   └── prayers: Prayer[] → Unanswered prayers
└── Agent (required)

Temple Entity
├── Temple (required)
│   ├── primaryDeityId → Deity
│   ├── priestIds → Agent IDs
│   └── beliefBonus: number
└── Building (required)
```

---

## Performance Considerations

**Optimization strategies:**

1. **Throttled updates:** BeliefGenerationSystem runs every 20 ticks (1 second)
2. **Emergence checks:** DeityEmergenceSystem only checks every 1200 ticks (1 minute)
3. **Cached deity queries:** Systems cache deity entity lists, refresh only when deity created/destroyed
4. **Lazy myth generation:** Myths generated on-demand via LLM, not pre-computed
5. **Prayer queue batching:** Process N prayers per tick, not all at once
6. **Belief calculation caching:** Cache per-agent belief rates, only recalculate on faith changes

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const agent of agents) {
  const deities = world.query().with('deity').executeEntities(); // Query every iteration!
  // Find deity for this agent
}

// ✅ GOOD: Query once, cache results
const deities = world.query().with('deity').executeEntities(); // Query once
const deityMap = new Map(deities.map(d => [d.id, d]));
for (const agent of agents) {
  const deity = deityMap.get(agent.deityId); // O(1) lookup
}
```

**Belief set serialization fix:**

```typescript
// DeityComponent.believers is a Set, which doesn't serialize to JSON properly
// BeliefGenerationSystem auto-fixes on load:

if (!(deityComp.believers instanceof Set)) {
  if (Array.isArray(deityComp.believers)) {
    deityComp.believers = new Set(deityComp.believers);
  } else {
    deityComp.believers = new Set(); // Will repopulate from agent allocations
  }
}
```

**Avoid repeated singleton queries:**

```typescript
// ❌ BAD: Query time system every tick
const timeEntity = world.query().with('time').executeEntities()[0];

// ✅ GOOD: Cache time entity ID once
private timeEntityId: string | null = null;

if (!this.timeEntityId) {
  this.timeEntityId = world.query().with('time').executeEntities()[0]?.id;
}
const timeEntity = world.getEntity(this.timeEntityId);
```

---

## Troubleshooting

### Deity not receiving belief

**Check:**
1. Believers exist? (`deity.believers.size > 0`)
2. Agents have spiritual component? (`agent.hasComponent('spiritual')`)
3. Faith strength > 0? (`spiritual.deityAllocations.get(deityId).strength`)
4. Allocation > 0? (`spiritual.deityAllocations.get(deityId).allocation`)
5. BeliefGenerationSystem running? (Check priority 115 in systems list)

**Debug:**
```typescript
const deity = deityEntity.getComponent('deity');
console.log(`Believers: ${deity.believers.size}`);
console.log(`Belief/hour: ${deity.belief.beliefPerHour}`);
console.log(`Current belief: ${deity.belief.currentBelief}`);

// Check agent allocations
for (const believerId of deity.believers) {
  const agent = world.getEntity(believerId);
  const spiritual = agent.getComponent('spiritual');
  const allocation = spiritual.deityAllocations.get(deityEntity.id);
  console.log(`Agent ${believerId}: strength ${allocation.strength}, allocation ${allocation.allocation}%`);
}
```

### Deity emergence not triggering

**Check:**
1. Enough believers? (Default: 3 minimum)
2. Belief cohesion high enough? (Default: 0.7)
3. Total belief accumulated? (Default: 100 points)
4. Beliefs share same concept/domain?
5. DeityEmergenceSystem enabled? (Priority 118)

**Debug:**
```typescript
// Check proto-deity belief tracking
const emergenceSystem = world.getSystem('deity_emergence');
const protoBeliefs = emergenceSystem.protoBeliefTracker; // Internal state

for (const [concept, data] of protoBeliefs) {
  console.log(`Concept: ${concept}`);
  console.log(`Total belief: ${data.totalBelief}`);
  console.log(`Contributors: ${data.contributors.size}`);
  console.log(`Last contribution: ${data.lastContribution}`);
}
```

### Divine power failing

**Check:**
1. Enough belief? (`deity.belief.currentBelief >= powerCost`)
2. Power available in config? (`isPowerAvailable(powerType, universeConfig)`)
3. Target valid? (Target entity exists, in range)
4. Domain affinity calculated? (Check cost modifiers)
5. Event properly formatted? (DivinePowerRequest structure)

**Debug:**
```typescript
const deity = deityEntity.getComponent('deity');
const powerCost = calculateEffectivePowerCost(
  powerType,
  deity.identity.domain,
  universeConfig
);

console.log(`Power: ${powerType}`);
console.log(`Base cost: ${baseCost}`);
console.log(`Domain modifier: ${domainModifier}`);
console.log(`Final cost: ${powerCost}`);
console.log(`Current belief: ${deity.belief.currentBelief}`);
console.log(`Can afford: ${deity.belief.currentBelief >= powerCost}`);
```

### Belief decay too fast

**Check:**
1. Decay rate configured? (`deity.belief.decayRate`)
2. Time since last activity? (`currentTick - deity.belief.lastActivityTick`)
3. Accelerated decay active? (No prayers for > 24 hours)
4. Decay config in universe settings? (`universeConfig.beliefEconomy.decay`)

**Debug:**
```typescript
const deity = deityEntity.getComponent('deity');
const timeSinceActivity = currentTick - deity.belief.lastActivityTick;
const ticksPerDay = 20 * 60 * 60 * 24; // 20 TPS * seconds per day

console.log(`Decay rate: ${deity.belief.decayRate}/hour`);
console.log(`Time since activity: ${timeSinceActivity} ticks`);
console.log(`Days since activity: ${timeSinceActivity / ticksPerDay}`);
console.log(`Fading risk: ${deity.belief.fadingRisk}`);

// Check decay config
const beliefConfig = world.divineConfig?.beliefEconomy;
console.log(`Normal decay: ${beliefConfig.decay.normalDecayRate}`);
console.log(`No activity decay: ${beliefConfig.decay.noActivityDecayRate}`);
console.log(`Threshold hours: ${beliefConfig.decay.noActivityThresholdHours}`);
```

### Believers Set corrupted after save/load

**Error:** `TypeError: deity.believers.forEach is not a function`

**Fix:** BeliefGenerationSystem auto-fixes this on load:

```typescript
// Serialization converts Set to array/object
// System detects and reconstructs Set:
if (!(deityComp.believers instanceof Set)) {
  if (Array.isArray(deityComp.believers)) {
    deityComp.believers = new Set(deityComp.believers);
  } else {
    deityComp.believers = new Set();
  }
}
```

---

## Integration with Other Systems

### Consciousness System

Deities have consciousness traits that affect their behavior:

```typescript
// AI gods have personality that influences decisions
const aiGod = deity.getComponent('ai_god');
const personality = aiGod.personality;

// Wrathful gods smite more
if (personality.wrathfulness > 0.7) {
  // Higher chance of smiting offenders
}

// Benevolent gods answer more prayers
if (personality.benevolence > 0.6) {
  // Answer 80% of prayers vs 40% for cruel gods
}
```

### Magic System

Divine spell casting uses belief instead of mana:

```typescript
// Divine spells cost belief
const divineCost = DivineCastingCalculator.calculateCost(
  spell,
  caster,
  context
);

// Domain affinity reduces cost
if (spell.school === deity.identity.domain) {
  divineCost *= 0.5; // 50% discount
}

// Cast spell using belief
deity.belief.currentBelief -= divineCost;
```

### Death/Afterlife System

Deities define afterlife policies:

```typescript
import { createJudgmentPolicy } from '@ai-village/divinity';

// Death god judges souls
const policy = createJudgmentPolicy({
  policyId: 'underworld_judgment',
  deityId: deathGod.id,
  criteria: {
    judgmentType: 'deeds',
    tiers: [
      { name: 'Elysium', minScore: 80 },
      { name: 'Fields of Asphodel', minScore: 40 },
      { name: 'Tartarus', minScore: 0 }
    ]
  }
});

// When agent dies, death god applies policy
// Soul sent to appropriate afterlife realm
```

### Multiverse System

Gods can cross between universes:

```typescript
import { calculateCrossingCost, executeCrossing } from '@ai-village/divinity';

// God extends presence to another universe
const crossingCost = calculateCrossingCost({
  entityType: 'deity',
  method: 'divine_projection',
  compatibility: calculateCompatibilityScore(universe1, universe2)
});

// Cost scales with universe distance and compatibility
// Low compatibility = high cost
```

---

## Testing

Run divinity system tests:

```bash
npm test -- BeliefTypes.test.ts
npm test -- DeityTypes.test.ts
npm test -- DivinePowers.test.ts
npm test -- DeityEmergence.test.ts
npm test -- Divinity.integration.test.ts
```

**Key test files:**
- `packages/divinity/src/__tests__/BeliefTypes.test.ts`
- `packages/divinity/src/__tests__/DeityTypes.test.ts`
- `packages/divinity/src/__tests__/DivinePowers.test.ts`
- `packages/divinity/src/__tests__/DeityEmergence.test.ts`
- `packages/divinity/src/__tests__/Divinity.integration.test.ts`
- `packages/core/src/systems/__tests__/DeityEmergence.integration.test.ts`

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference (see Divinity Systems section)
- **COMPONENTS_REFERENCE.md** - All component types (DeityComponent, SpiritualComponent)
- **METASYSTEMS_GUIDE.md** - Deep dive into Divinity Metasystem
- **PERFORMANCE.md** - Performance optimization guide
- **packages/divinity/src/** - Type definitions and factories

---

## Summary for Language Models

**Before working with divinity system:**
1. Understand belief economy (mortals generate, gods spend)
2. Know emergence process (proto-belief → coalescence → crystallization → establishment)
3. Understand power tiers and domain affinity
4. Know deity identity is emergent, not pre-designed
5. Understand believers Set serialization fix for save/load

**Common tasks:**
- **Create emergent deity:** Agents develop shared beliefs, system detects pattern, deity emerges automatically
- **Generate belief:** Add deity allocation to agent's spiritual component, BeliefGenerationSystem handles rest
- **Perform divine power:** Emit 'divine_power:request' event with deity, power type, target, params
- **Build temple:** Create building entity, then Temple entity linking to deity
- **Create angel:** Use 'create_angel' divine power, costs 1500 belief + maintenance
- **Send vision:** Use 'clear_vision' power with content params (message, imagery, clarity)
- **Check belief state:** Read deity.belief.currentBelief, beliefPerHour, decayRate

**Critical rules:**
- Never delete deity entities (mark as dormant/fading instead)
- Always validate belief cost before executing powers
- Respect domain affinity (on-domain powers cost less)
- Fix believers Set after load (`new Set(array)` if needed)
- Cache deity queries (don't query in loops)
- Event-driven architecture: emit events, don't call systems directly

**Event-driven architecture:**
- Listen to `belief:generated`, `deity:emergence`, `divine_power:used` events
- Emit `divine_power:request` to queue divine actions
- Never bypass DivinePowerSystem for divine actions
- BeliefGenerationSystem runs automatically every 20 ticks
- DeityEmergenceSystem checks every 1200 ticks

**Belief economy flow:**
```
Agent faith → Religious activity → Belief generation → Deity accumulation →
Divine power execution → Mortal witnesses → Miracle witness activity →
Massive belief boost (5.0 per witness) → Net positive if many witnesses
```

**Power tier progression:**
```
10 belief → Minor powers (whispers, omens)
100 belief → Moderate powers (visions, minor miracles)
500 belief → Major powers (mass visions, resurrections, smiting)
2000 belief → Supreme powers (angels, avatars, terraforming)
5000 belief → World-shaping (create species, cataclysms, ascension)
```
