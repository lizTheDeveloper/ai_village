> **System:** social-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Courtship System Specification

## Overview

The courtship system enables agents to form romantic bonds through species-specific rituals, individual tactics, and compatibility matching. Different species have different courtship paradigms, individuals have preferences for courtship tactics, and conception occurs only when both parties consent and engage in appropriate mating behavior.

## Design Goals

1. **Species Diversity**: Each species has unique courtship rituals (gift-giving, displays, combat, construction, etc.)
2. **Individual Variation**: Within a species, agents have different courtship styles and preferences
3. **Compatibility Matters**: Mutual interests, personality mesh, and relationship history affect success
4. **Meaningful Consent**: Both parties must actively participate in the mating ritual
5. **Observable Behavior**: Courtship creates visible, interesting behaviors in the world
6. **Integration**: Works with existing SexualityComponent, MatingParadigm, and RelationshipComponent

---

## Architecture

### Component: `CourtshipComponent`

Tracks an agent's courtship state, preferences, and current courtship attempts.

```typescript
interface CourtshipComponent extends ComponentBase {
  type: 'courtship';

  // Current courtship state
  state: 'idle' | 'interested' | 'courting' | 'being_courted' | 'consenting' | 'mating';
  currentCourtshipTarget: string | null;  // Entity ID
  currentCourtshipInitiator: string | null;  // Who started courting this agent

  // Courtship paradigm (from species MatingParadigm)
  paradigm: CourtshipParadigm;

  // Individual courtship preferences
  preferredTactics: CourtshipTactic[];  // Tactics this agent likes to receive
  dislikedTactics: CourtshipTactic[];   // Tactics this agent dislikes

  // Courtship style (personality-based)
  style: 'bold' | 'subtle' | 'traditional' | 'creative' | 'pragmatic' | 'romantic';
  romanticInclination: number;  // 0-1, how interested in romance generally

  // Active courtship tracking
  activeCourtships: Array<{
    targetId: string;
    startedAt: number;  // tick
    tacticsAttempted: CourtshipTactic[];
    responses: Array<{tactic: CourtshipTactic, reception: number}>;  // -1 to 1
    compatibilityScore: number;  // Calculated compatibility
    successProbability: number;  // Current chance of success
  }>;

  // Being courted tracking
  receivedCourtships: Array<{
    initiatorId: string;
    startedAt: number;
    tacticsReceived: CourtshipTactic[];
    currentInterest: number;  // 0-1, how interested in this suitor
    willingToConsent: boolean;
  }>;

  // Historical data
  pastCourtships: Array<{
    partnerId: string;
    wasInitiator: boolean;
    succeeded: boolean;
    duration: number;  // How long courtship lasted
    endReason: string;
  }>;

  // Cooldowns
  lastCourtshipAttempt: number;  // tick
  courtshipCooldown: number;  // ticks to wait before next attempt
  rejectionCooldown: Map<string, number>;  // Per-agent cooldown after rejection
}
```

---

## Courtship Paradigms (Species-Level)

Each species' `MatingParadigm` defines the courtship protocol.

### Courtship Paradigm Structure

```typescript
interface CourtshipParadigm {
  type: CourtshipType;

  // Required tactics for this species
  requiredTactics: CourtshipTactic[];

  // Optional but appreciated tactics
  optionalTactics: CourtshipTactic[];

  // Tactics that are forbidden/offensive
  forbiddenTactics: CourtshipTactic[];

  // Minimum number of tactics needed
  minimumTactics: number;

  // Duration range (in ticks)
  typicalDuration: [number, number];

  // Location requirements
  locationRequirement: LocationRequirement | null;

  // Post-consent mating behavior
  matingBehavior: MatingBehavior;
}
```

### Courtship Types

Based on existing `MatingParadigm.courtship_type`:

```typescript
type CourtshipType =
  | 'none'              // No courtship needed (asexual reproduction)
  | 'display'           // Visual/physical displays
  | 'gift_giving'       // Offering resources/items
  | 'combat'            // Competitive combat for mates
  | 'dance'             // Rhythmic movement displays
  | 'pheromone'         // Chemical signals (mostly invisible to others)
  | 'construction'      // Building nests/structures
  | 'song'              // Auditory displays
  | 'pursuit'           // Chase/persistence
  | 'gradual_proximity' // Slow approach over time
  | 'mind_merge'        // Telepathic/psychic bonding
  | 'dream_meeting'     // Meeting in dreams/astral plane
  | 'timeline_search'   // Cross-timeline compatibility
  | 'resonance'         // Magical/soul resonance
  | 'arranged'          // Social arrangement (family/community decides)
  | 'lottery'           // Random/fate-based pairing
```

### Example Paradigms

#### Human Courtship
```typescript
{
  type: 'gradual_proximity',
  requiredTactics: ['conversation', 'shared_activity', 'physical_proximity'],
  optionalTactics: ['gift_giving', 'compliment', 'humor', 'touch', 'shared_meal'],
  forbiddenTactics: ['aggressive_display', 'dominance_combat'],
  minimumTactics: 5,
  typicalDuration: [10000, 50000],  // ~8-40 minutes at 20 tps
  locationRequirement: null,
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    duration: 600,  // ~30 seconds
    privateSpace: true
  }
}
```

#### Bird-Folk Courtship (Display)
```typescript
{
  type: 'display',
  requiredTactics: ['aerial_dance', 'plumage_display', 'song'],
  optionalTactics: ['gift_giving', 'nest_construction'],
  forbiddenTactics: [],
  minimumTactics: 3,
  typicalDuration: [5000, 15000],
  locationRequirement: {
    type: 'elevated',
    minHeight: 5,
    visibility: 'public'
  },
  matingBehavior: {
    type: 'nest_location',
    requiredLocation: 'nest',
    bothMustBePresent: true,
    duration: 300,
    privateSpace: true
  }
}
```

#### Dwarf Courtship (Craft-Based)
```typescript
{
  type: 'construction',
  requiredTactics: ['craft_gift', 'demonstrate_skill', 'shared_project'],
  optionalTactics: ['share_ale', 'tell_saga', 'show_wealth'],
  forbiddenTactics: ['hasty_approach'],
  minimumTactics: 4,
  typicalDuration: [30000, 100000],  // Very long courtship
  locationRequirement: {
    type: 'workshop',
    requiresQuality: 'high'
  },
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    duration: 600,
    privateSpace: true
  }
}
```

#### Mystif Courtship (Resonance-Based)
```typescript
{
  type: 'resonance',
  requiredTactics: ['mind_touch', 'aura_display', 'magic_sharing'],
  optionalTactics: ['dream_meeting', 'timeline_alignment'],
  forbiddenTactics: ['physical_aggression'],
  minimumTactics: 3,
  typicalDuration: [8000, 20000],
  locationRequirement: {
    type: 'ley_line',
    magicalIntensity: 'high'
  },
  matingBehavior: {
    type: 'ritual_space',
    requiredLocation: 'union_circle',
    bothMustBePresent: true,
    duration: 1200,  // ~1 minute
    privateSpace: false,  // Mystif mating is communal/witnessed
    ritualComponents: ['candles', 'incense', 'union_magic']
  }
}
```

---

## Courtship Tactics (Individual Actions)

Tactics are specific actions an agent can perform while courting.

### Tactic Definition

```typescript
interface CourtshipTactic {
  id: string;
  name: string;
  category: TacticCategory;

  // Requirements to perform
  requirements: {
    items?: string[];          // Required inventory items
    skills?: {[skill: string]: number};  // Required skill levels
    location?: LocationRequirement;
    proximity?: number;        // Required distance to target
    energy?: number;           // Energy cost
    time?: number;             // Ticks required to perform
  };

  // Effects and signals
  visibleToOthers: boolean;
  description: string;

  // Base appeal (modified by compatibility)
  baseAppeal: number;  // -1 to 1

  // Personality modifiers
  appealModifiers: {
    romanticInclination?: number;  // Multiplier for romantic agents
    personality?: {[trait: string]: number};  // Appeal by personality type
  };
}
```

### Tactic Categories

```typescript
type TacticCategory =
  | 'conversation'      // Talking, flirting, compliments
  | 'gift'              // Giving items/resources
  | 'display'           // Physical/visual displays
  | 'proximity'         // Physical closeness behaviors
  | 'activity'          // Shared activities
  | 'dominance'         // Competitive/aggressive displays
  | 'crafting'          // Creating items for partner
  | 'magic'             // Magical/spiritual tactics
  | 'service'           // Helping/doing favors
  | 'ritual';           // Ceremonial actions
```

### Example Tactics

#### Universal Tactics (Most Species)

```typescript
const UNIVERSAL_TACTICS: CourtshipTactic[] = [
  {
    id: 'conversation',
    name: 'Conversation',
    category: 'conversation',
    requirements: {proximity: 3, time: 200},
    visibleToOthers: true,
    description: 'Talk and get to know each other',
    baseAppeal: 0.3,
    appealModifiers: {
      personality: {
        extroverted: 0.5,
        introverted: -0.1
      }
    }
  },
  {
    id: 'compliment',
    name: 'Compliment',
    category: 'conversation',
    requirements: {proximity: 3, time: 50},
    visibleToOthers: false,
    description: 'Give a sincere compliment',
    baseAppeal: 0.4,
    appealModifiers: {
      romanticInclination: 0.3,
      personality: {
        confident: -0.2,  // Confident agents less swayed by compliments
        insecure: 0.3
      }
    }
  },
  {
    id: 'shared_meal',
    name: 'Share a Meal',
    category: 'activity',
    requirements: {
      items: ['food'],
      proximity: 2,
      time: 400
    },
    visibleToOthers: true,
    description: 'Eat together and bond',
    baseAppeal: 0.5,
    appealModifiers: {
      personality: {
        social: 0.4
      }
    }
  },
  {
    id: 'gift_giving',
    name: 'Give Gift',
    category: 'gift',
    requirements: {
      items: ['gift_item'],
      proximity: 2,
      time: 100
    },
    visibleToOthers: true,
    description: 'Offer a meaningful gift',
    baseAppeal: 0.6,
    appealModifiers: {
      romanticInclination: 0.4,
      personality: {
        materialistic: 0.5,
        ascetic: -0.3
      }
    }
  },
  {
    id: 'physical_proximity',
    name: 'Be Close',
    category: 'proximity',
    requirements: {proximity: 1.5, time: 300},
    visibleToOthers: true,
    description: 'Stand close and share space',
    baseAppeal: 0.2,
    appealModifiers: {
      romanticInclination: 0.3
    }
  },
  {
    id: 'touch',
    name: 'Gentle Touch',
    category: 'proximity',
    requirements: {proximity: 1, time: 50},
    visibleToOthers: true,
    description: 'Light physical contact',
    baseAppeal: 0.5,
    appealModifiers: {
      romanticInclination: 0.5,
      personality: {
        touch_averse: -1.0,
        affectionate: 0.6
      }
    }
  }
];
```

#### Species-Specific Tactics

```typescript
// Dwarf tactics
const DWARF_TACTICS: CourtshipTactic[] = [
  {
    id: 'craft_gift',
    name: 'Craft Masterwork Gift',
    category: 'crafting',
    requirements: {
      skills: {crafting: 5},
      items: ['metal', 'gems'],
      time: 2000
    },
    visibleToOthers: true,
    description: 'Create a masterwork item for beloved',
    baseAppeal: 0.9,
    appealModifiers: {
      personality: {
        appreciates_quality: 0.8
      }
    }
  },
  {
    id: 'share_ale',
    name: 'Share Fine Ale',
    category: 'activity',
    requirements: {
      items: ['ale'],
      proximity: 2,
      time: 600
    },
    visibleToOthers: true,
    description: 'Drink together and share stories',
    baseAppeal: 0.6,
    appealModifiers: {
      personality: {
        social: 0.5,
        traditional: 0.4
      }
    }
  },
  {
    id: 'demonstrate_skill',
    name: 'Demonstrate Skill',
    category: 'display',
    requirements: {
      skills: {crafting: 3},
      proximity: 5,
      time: 400
    },
    visibleToOthers: true,
    description: 'Show off crafting or mining prowess',
    baseAppeal: 0.7,
    appealModifiers: {
      personality: {
        values_competence: 0.6
      }
    }
  }
];

// Bird-folk tactics
const BIRD_FOLK_TACTICS: CourtshipTactic[] = [
  {
    id: 'aerial_dance',
    name: 'Aerial Dance',
    category: 'display',
    requirements: {
      skills: {flying: 4},
      location: {type: 'elevated', minHeight: 5},
      time: 800,
      energy: 20
    },
    visibleToOthers: true,
    description: 'Perform elaborate flight patterns',
    baseAppeal: 0.85,
    appealModifiers: {
      romanticInclination: 0.6,
      personality: {
        artistic: 0.5
      }
    }
  },
  {
    id: 'plumage_display',
    name: 'Plumage Display',
    category: 'display',
    requirements: {
      proximity: 3,
      time: 200
    },
    visibleToOthers: true,
    description: 'Show off colorful feathers',
    baseAppeal: 0.6,
    appealModifiers: {
      personality: {
        values_beauty: 0.7
      }
    }
  },
  {
    id: 'song',
    name: 'Courtship Song',
    category: 'display',
    requirements: {
      skills: {music: 3},
      proximity: 10,
      time: 400
    },
    visibleToOthers: true,
    description: 'Sing elaborate courtship melody',
    baseAppeal: 0.8,
    appealModifiers: {
      romanticInclination: 0.7,
      personality: {
        musical: 0.6
      }
    }
  },
  {
    id: 'nest_construction',
    name: 'Build Nest Together',
    category: 'activity',
    requirements: {
      items: ['twigs', 'grass'],
      time: 3000,
      location: {type: 'elevated', minHeight: 3}
    },
    visibleToOthers: true,
    description: 'Build a nest together',
    baseAppeal: 0.9,
    appealModifiers: {
      personality: {
        pragmatic: 0.6,
        homemaker: 0.8
      }
    }
  }
];

// Mystif tactics
const MYSTIF_TACTICS: CourtshipTactic[] = [
  {
    id: 'mind_touch',
    name: 'Mind Touch',
    category: 'magic',
    requirements: {
      skills: {psionics: 4},
      proximity: 5,
      time: 200,
      energy: 15
    },
    visibleToOthers: false,
    description: 'Share thoughts and emotions telepathically',
    baseAppeal: 0.85,
    appealModifiers: {
      romanticInclination: 0.8,
      personality: {
        empathic: 0.7
      }
    }
  },
  {
    id: 'aura_display',
    name: 'Aura Display',
    category: 'magic',
    requirements: {
      skills: {magic: 3},
      proximity: 4,
      time: 300,
      energy: 10
    },
    visibleToOthers: true,
    description: 'Display magical aura in beautiful patterns',
    baseAppeal: 0.7,
    appealModifiers: {
      personality: {
        magical: 0.6,
        artistic: 0.5
      }
    }
  },
  {
    id: 'dream_meeting',
    name: 'Dream Meeting',
    category: 'magic',
    requirements: {
      skills: {dreaming: 5},
      time: 1000,
      energy: 25
    },
    visibleToOthers: false,
    description: 'Meet in the dream realm',
    baseAppeal: 0.95,
    appealModifiers: {
      romanticInclination: 0.9,
      personality: {
        mystical: 0.8
      }
    }
  }
];
```

---

## Compatibility Calculation

Courtship success depends on multiple compatibility factors.

### Compatibility Score Formula

```typescript
function calculateCompatibility(agent1: Entity, agent2: Entity, world: World): number {
  let score = 0;
  let maxScore = 0;

  // 1. Sexual compatibility (30% weight)
  const sexualityScore = calculateSexualCompatibility(agent1, agent2);
  score += sexualityScore * 0.3;
  maxScore += 0.3;

  // 2. Personality compatibility (25% weight)
  const personalityScore = calculatePersonalityMesh(agent1, agent2);
  score += personalityScore * 0.25;
  maxScore += 0.25;

  // 3. Mutual interests (20% weight)
  const interestsScore = calculateSharedInterests(agent1, agent2);
  score += interestsScore * 0.2;
  maxScore += 0.2;

  // 4. Existing relationship (15% weight)
  const relationshipScore = calculateRelationshipStrength(agent1, agent2);
  score += relationshipScore * 0.15;
  maxScore += 0.15;

  // 5. Social factors (10% weight)
  const socialScore = calculateSocialFactors(agent1, agent2, world);
  score += socialScore * 0.1;
  maxScore += 0.1;

  return score / maxScore;  // Normalize to 0-1
}
```

### Sexual Compatibility

```typescript
function calculateSexualCompatibility(agent1: Entity, agent2: Entity): number {
  const sex1 = agent1.getComponent<SexualityComponent>('sexuality');
  const sex2 = agent2.getComponent<SexualityComponent>('sexuality');

  if (!sex1 || !sex2) return 0;

  // Check if both are attracted to each other's gender/morph
  const agent1ToAgent2 = checkAttraction(sex1, agent2);
  const agent2ToAgent1 = checkAttraction(sex2, agent1);

  // Both must be attracted for compatibility
  if (!agent1ToAgent2 || !agent2ToAgent1) return 0;

  // Check relationship style compatibility
  const styleCompatibility = checkRelationshipStyleCompatibility(sex1, sex2);

  // Check if attraction conditions are met
  const conditions1Met = checkAttractionConditions(sex1, agent1, agent2);
  const conditions2Met = checkAttractionConditions(sex2, agent2, agent1);

  if (!conditions1Met || !conditions2Met) return 0.3;  // Potential but not active

  return styleCompatibility;  // 0-1
}
```

### Personality Mesh

```typescript
function calculatePersonalityMesh(agent1: Entity, agent2: Entity): number {
  const personality1 = agent1.getComponent<PersonalityComponent>('personality');
  const personality2 = agent2.getComponent<PersonalityComponent>('personality');

  if (!personality1 || !personality2) return 0.5;  // Neutral

  let meshScore = 0;

  // Complementary traits (extrovert + introvert can work)
  const complementaryPairs = [
    ['extroverted', 'introverted'],
    ['impulsive', 'cautious'],
    ['creative', 'pragmatic'],
    ['emotional', 'logical']
  ];

  for (const [trait1, trait2] of complementaryPairs) {
    if (personality1.traits[trait1] && personality2.traits[trait2]) {
      meshScore += 0.3;
    }
    if (personality1.traits[trait2] && personality2.traits[trait1]) {
      meshScore += 0.3;
    }
  }

  // Shared values (both value same things = good)
  const sharedValues = [
    'values_loyalty',
    'values_honesty',
    'values_creativity',
    'values_competence',
    'values_beauty'
  ];

  for (const value of sharedValues) {
    if (personality1.traits[value] && personality2.traits[value]) {
      meshScore += 0.4;
    }
  }

  // Conflicting traits (both aggressive = bad)
  const conflictingTraits = [
    'aggressive',
    'stubborn',
    'jealous',
    'domineering'
  ];

  for (const trait of conflictingTraits) {
    if (personality1.traits[trait] && personality2.traits[trait]) {
      meshScore -= 0.4;
    }
  }

  // Calculate final mesh score (starts at 0.5 neutral)
  const finalMesh = 0.5 + meshScore;

  // Explicit saturation at [0, 1] - extreme incompatibility/compatibility
  if (finalMesh > 1.0) {
    return 1.0;  // Perfect mesh (rare)
  } else if (finalMesh < 0) {
    return 0;  // Incompatible personalities
  }
  return finalMesh;
}
```

### Shared Interests

```typescript
function calculateSharedInterests(agent1: Entity, agent2: Entity): number {
  const priorities1 = agent1.getComponent<StrategicPriorities>('strategic_priorities');
  const priorities2 = agent2.getComponent<StrategicPriorities>('strategic_priorities');

  if (!priorities1 || !priorities2) return 0.5;

  let sharedCount = 0;
  let totalPriorities = 0;

  const priorityKeys = ['gathering', 'building', 'farming', 'social', 'exploration', 'magic', 'combat'];

  for (const key of priorityKeys) {
    const val1 = priorities1[key] || 0;
    const val2 = priorities2[key] || 0;

    // Both highly prioritize this activity
    if (val1 > 0.6 && val2 > 0.6) {
      sharedCount += 1;
    }

    totalPriorities++;
  }

  return sharedCount / priorityKeys.length;
}
```

### Relationship Strength

```typescript
function calculateRelationshipStrength(agent1: Entity, agent2: Entity): number {
  const relationship1 = agent1.getComponent<RelationshipComponent>('relationship');

  if (!relationship1) return 0;

  const rel = relationship1.relationships.get(agent2.id);
  if (!rel) return 0;

  // Combine familiarity, affinity, trust
  const familiarityScore = rel.familiarity / 100;

  // Convert affinity from [-100, 100] to [0, 1] scale
  // Validate range - affinity should never be < -100
  let affinityScore: number;
  if (rel.affinity < -100) {
    console.warn(`[Courtship] Affinity ${rel.affinity} below minimum -100, clamping`);
    affinityScore = 0;
  } else if (rel.affinity > 100) {
    console.warn(`[Courtship] Affinity ${rel.affinity} above maximum 100, clamping`);
    affinityScore = 1;
  } else {
    affinityScore = (rel.affinity + 100) / 200;
  }

  const trustScore = rel.trust / 100;

  // Weight affinity highest
  return (familiarityScore * 0.2) + (affinityScore * 0.6) + (trustScore * 0.2);
}
```

---

## Courtship Behavior State Machine

### States

1. **Idle**: Not currently courting or being courted
2. **Interested**: Identified potential partner, evaluating
3. **Courting**: Actively performing courtship tactics
4. **Being Courted**: Receiving courtship from another agent
5. **Consenting**: Both agents agree, moving to mating location
6. **Mating**: Performing species-specific mating ritual
7. **Bonded**: Post-mating, now in relationship

### State Transitions

```typescript
class CourtshipStateMachine {
  // Idle -> Interested
  // Triggered by: proximity + attraction + compatibility check
  considerCourtship(agent: Entity, target: Entity, world: World): boolean {
    const courtship = agent.getComponent<CourtshipComponent>('courtship');
    const sexuality = agent.getComponent<SexualityComponent>('sexuality');

    // Check cooldowns
    if (this.isOnCooldown(courtship, target.id)) return false;

    // Check if actively seeking
    if (!sexuality?.activelySeeking) return false;

    // Calculate compatibility
    const compatibility = calculateCompatibility(agent, target, world);

    // Random chance based on romantic inclination and compatibility
    const threshold = 0.5 - (courtship.romanticInclination * 0.3);

    if (compatibility > threshold) {
      courtship.state = 'interested';
      courtship.currentCourtshipTarget = target.id;
      return true;
    }

    return false;
  }

  // Interested -> Courting
  // Triggered by: agent decision to initiate
  initiateCourtship(agent: Entity, target: Entity, world: World): void {
    const courtship = agent.getComponent<CourtshipComponent>('courtship');

    courtship.state = 'courting';
    courtship.activeCourtships.push({
      targetId: target.id,
      startedAt: world.tick,
      tacticsAttempted: [],
      responses: [],
      compatibilityScore: calculateCompatibility(agent, target, world),
      successProbability: 0
    });

    // Notify target
    const targetCourtship = target.getComponent<CourtshipComponent>('courtship');
    if (targetCourtship) {
      targetCourtship.state = 'being_courted';
      targetCourtship.currentCourtshipInitiator = agent.id;
      targetCourtship.receivedCourtships.push({
        initiatorId: agent.id,
        startedAt: world.tick,
        tacticsReceived: [],
        currentInterest: 0.3,  // Start with mild interest
        willingToConsent: false
      });
    }
  }

  // Courting -> Select and perform tactics
  performCourtshipTactic(
    agent: Entity,
    target: Entity,
    tactic: CourtshipTactic,
    world: World
  ): void {
    const courtship = agent.getComponent<CourtshipComponent>('courtship');
    const activeCourtship = courtship.activeCourtships.find(c => c.targetId === target.id);

    if (!activeCourtship) return;

    // Record tactic
    activeCourtship.tacticsAttempted.push(tactic);

    // Calculate reception
    const reception = this.calculateTacticReception(agent, target, tactic, world);
    activeCourtship.responses.push({tactic, reception});

    // Update target's interest
    const targetCourtship = target.getComponent<CourtshipComponent>('courtship');
    const receivedCourtship = targetCourtship?.receivedCourtships.find(
      c => c.initiatorId === agent.id
    );

    if (receivedCourtship) {
      receivedCourtship.tacticsReceived.push(tactic);
      receivedCourtship.currentInterest += reception * 0.2;  // Adjust interest

      // Explicit bounds at [0, 1] for interest level
      if (receivedCourtship.currentInterest > 1.0) {
        receivedCourtship.currentInterest = 1.0;  // Maximum interest
      } else if (receivedCourtship.currentInterest < 0) {
        receivedCourtship.currentInterest = 0;  // No interest
      }

      // Update relationship affinity
      const relationship = target.getComponent<RelationshipComponent>('relationship');
      if (relationship) {
        relationship.updateAffinity(agent.id, reception * 10);  // -10 to +10
        relationship.updateFamiliarity(agent.id, 5);  // Courtship increases familiarity
      }
    }

    // Update success probability
    this.updateSuccessProbability(activeCourtship, agent, target, world);
  }

  // Being Courted -> Evaluate and decide
  evaluateCourtship(agent: Entity, initiator: Entity, world: World): 'accept' | 'reject' | 'continue' {
    const courtship = agent.getComponent<CourtshipComponent>('courtship');
    const receivedCourtship = courtship.receivedCourtships.find(
      c => c.initiatorId === initiator.id
    );

    if (!receivedCourtship) return 'reject';

    // Check paradigm requirements
    const paradigm = courtship.paradigm;
    const tacticsMet = this.checkParadigmRequirements(
      paradigm,
      receivedCourtship.tacticsReceived
    );

    // If requirements not met, continue
    if (!tacticsMet) {
      return receivedCourtship.currentInterest < 0.2 ? 'reject' : 'continue';
    }

    // Calculate final decision
    const compatibility = calculateCompatibility(agent, initiator, world);
    const interest = receivedCourtship.currentInterest;
    const decisionScore = (compatibility * 0.6) + (interest * 0.4);

    // Romantic inclination affects threshold
    const threshold = 0.6 - (courtship.romanticInclination * 0.2);

    if (decisionScore > threshold) {
      receivedCourtship.willingToConsent = true;
      return 'accept';
    } else if (interest < 0.2) {
      return 'reject';
    }

    return 'continue';
  }

  // Both Consenting -> Mating
  transitionToMating(agent1: Entity, agent2: Entity, world: World): void {
    const courtship1 = agent1.getComponent<CourtshipComponent>('courtship');
    const courtship2 = agent2.getComponent<CourtshipComponent>('courtship');

    courtship1.state = 'consenting';
    courtship2.state = 'consenting';

    // Emit event to trigger mating behavior
    world.emit('courtship:consent', {
      agent1Id: agent1.id,
      agent2Id: agent2.id,
      matingBehavior: courtship1.paradigm.matingBehavior
    });

    // Agents will now move to appropriate location
    // and perform mating behavior
  }
}
```

---

## Mating Behaviors (Post-Consent)

Once both agents consent, they perform species-specific mating behavior.

### Mating Behavior Structure

```typescript
interface MatingBehavior {
  type: 'private_location' | 'nest_location' | 'ritual_space' | 'underwater' | 'in_flight' | 'anywhere';

  // Location requirements
  requiredLocation?: 'bed' | 'nest' | 'union_circle' | 'water' | 'sky' | string;
  bothMustBePresent: boolean;
  privateSpace: boolean;  // Requires no other agents nearby

  // Duration
  duration: number;  // ticks

  // Optional ritual components
  ritualComponents?: string[];  // Items/effects needed

  // Post-mating effects
  postMatingEffects?: {
    moodBoost?: number;
    energyCost?: number;
    bondStrength?: number;
  };
}
```

### Example Mating Behaviors

#### Human Mating
```typescript
{
  type: 'private_location',
  requiredLocation: 'bed',
  bothMustBePresent: true,
  privateSpace: true,
  duration: 600,  // ~30 seconds
  postMatingEffects: {
    moodBoost: 20,
    energyCost: 15,
    bondStrength: 0.8
  }
}
```

#### Bird-Folk Mating
```typescript
{
  type: 'nest_location',
  requiredLocation: 'nest',
  bothMustBePresent: true,
  privateSpace: true,
  duration: 300,
  postMatingEffects: {
    moodBoost: 25,
    energyCost: 10,
    bondStrength: 0.9
  }
}
```

#### Mystif Union Magic
```typescript
{
  type: 'ritual_space',
  requiredLocation: 'union_circle',
  bothMustBePresent: true,
  privateSpace: false,  // Witnessed by community
  duration: 1200,
  ritualComponents: ['union_candles', 'incense', 'union_chalk'],
  postMatingEffects: {
    moodBoost: 30,
    energyCost: 25,
    bondStrength: 1.0
  }
}
```

---

## Conception Trigger

After successful mating, conception may occur based on various factors.

### Conception Probability

```typescript
function calculateConceptionProbability(agent1: Entity, agent2: Entity): number {
  let baseProbability = 0.3;  // 30% base chance

  // Fertility factors
  const age1 = calculateAge(agent1);
  const age2 = calculateAge(agent2);

  // Peak fertility ages (species-specific)
  const fertilityModifier1 = calculateFertilityByAge(age1, agent1);
  const fertilityModifier2 = calculateFertilityByAge(age2, agent2);

  // Health factors
  const health1 = agent1.getComponent<HealthComponent>('health');
  const health2 = agent2.getComponent<HealthComponent>('health');

  const healthModifier = ((health1?.health || 100) + (health2?.health || 100)) / 200;

  // Relationship bond strength
  const bondStrength = calculateBondStrength(agent1, agent2);

  // Mystical/magical factors (for species with union magic)
  const magicModifier = calculateUnionMagicModifier(agent1, agent2);

  const finalProbability = baseProbability
    * fertilityModifier1
    * fertilityModifier2
    * healthModifier
    * (0.8 + bondStrength * 0.4)  // 0.8-1.2 multiplier
    * magicModifier;

  // Explicit bounds for probability [0, 1]
  if (finalProbability > 1.0) {
    console.warn(`[Courtship] Conception probability ${finalProbability} > 1.0, capping at 100%`);
    return 1.0;
  } else if (finalProbability < 0) {
    console.warn(`[Courtship] Conception probability ${finalProbability} < 0, setting to 0%`);
    return 0;
  }
  return finalProbability;
}

function attemptConception(agent1: Entity, agent2: Entity, world: World): void {
  // Determine who can become pregnant
  const canAgent1BePregnant = canBecomePregnant(agent1);
  const canAgent2BePregnant = canBecomePregnant(agent2);

  if (!canAgent1BePregnant && !canAgent2BePregnant) {
    // Neither can become pregnant (same-sex couple, asexual reproduction needed, etc.)
    return;
  }

  const probability = calculateConceptionProbability(agent1, agent2);

  if (Math.random() < probability) {
    // Determine who becomes pregnant
    let pregnantAgent: Entity;
    let otherParent: Entity;

    if (canAgent1BePregnant && canAgent2BePregnant) {
      // Both can become pregnant, choose randomly or by species rules
      [pregnantAgent, otherParent] = Math.random() < 0.5
        ? [agent1, agent2]
        : [agent2, agent1];
    } else {
      pregnantAgent = canAgent1BePregnant ? agent1 : agent2;
      otherParent = canAgent1BePregnant ? agent2 : agent1;
    }

    // Emit conception event
    world.emit('conception', {
      pregnantAgentId: pregnantAgent.id,
      otherParentId: otherParent.id,
      conceptionTick: world.tick
    });
  }
}
```

---

## Integration with Existing Systems

### CourtshipSystem (New)

```typescript
export class CourtshipSystem implements System {
  private stateMachine = new CourtshipStateMachine();

  update(world: World): void {
    const courting = world.query()
      .with(CT.Courtship)
      .with(CT.Sexuality)
      .with(CT.Position)
      .executeEntities();

    for (const agent of courting) {
      const courtship = agent.getComponent<CourtshipComponent>('courtship');

      switch (courtship.state) {
        case 'idle':
          this.checkForPotentialPartners(agent, world);
          break;

        case 'interested':
          this.decideToInitiate(agent, world);
          break;

        case 'courting':
          this.performCourtshipTactics(agent, world);
          break;

        case 'being_courted':
          this.evaluateCourtship(agent, world);
          break;

        case 'consenting':
          this.moveToMatingLocation(agent, world);
          break;

        case 'mating':
          this.performMating(agent, world);
          break;
      }
    }
  }

  private checkForPotentialPartners(agent: Entity, world: World): void {
    const pos = agent.getComponent<PositionComponent>('position');
    const courtship = agent.getComponent<CourtshipComponent>('courtship');

    if (!pos || !courtship.romanticInclination) return;

    // Find nearby agents
    const nearby = this.getNearbyAgents(agent, world, 10);

    for (const target of nearby) {
      if (this.stateMachine.considerCourtship(agent, target, world)) {
        break;  // Only court one at a time
      }
    }
  }

  private performCourtshipTactics(agent: Entity, world: World): void {
    const courtship = agent.getComponent<CourtshipComponent>('courtship');
    const activeCourtship = courtship.activeCourtships[0];

    if (!activeCourtship) return;

    const target = world.getEntity(activeCourtship.targetId);
    if (!target) return;

    // Select appropriate tactic based on paradigm and compatibility
    const tactic = this.selectBestTactic(agent, target, courtship.paradigm, world);

    if (tactic) {
      // Queue behavior to perform this tactic
      const behavior = agent.getComponent<BehaviorComponent>('behavior');
      if (behavior) {
        behavior.currentBehavior = `courtship:${tactic.id}`;
        behavior.state = {targetId: target.id, tactic: tactic.id};
      }
    }
  }
}
```

### Integration with ScriptedDecisionProcessor

Add courtship to behavior selection:

```typescript
// In ScriptedDecisionProcessor.ts, add to priority-based selection

// ROMANCE: Check courtship state
const courtship = entity.getComponent<CourtshipComponent>('courtship');
if (courtship && priorities.social && courtship.romanticInclination > 0.3) {
  if (courtship.state === 'courting' || courtship.state === 'being_courted') {
    // Courtship in progress - high priority
    const tactic = this.selectCourtshipTactic(entity, world);
    if (tactic) {
      candidates.push({
        behavior: `courtship:${tactic.id}`,
        behaviorState: {targetId: courtship.currentCourtshipTarget, tactic: tactic.id},
        category: 'romance',
        baseWeight: 0.95,  // Very high priority
      });
    }
  } else if (courtship.state === 'idle' && Math.random() < courtship.romanticInclination * 0.1) {
    // Chance to look for romance
    const potentialPartners = this.findPotentialPartners(entity, world);
    if (potentialPartners.length > 0) {
      const target = potentialPartners[0];
      candidates.push({
        behavior: 'consider_courtship',
        behaviorState: {targetId: target.id},
        category: 'romance',
        baseWeight: 0.7,
      });
    }
  }
}
```

---

## Observable Behaviors

Courtship creates visible, interesting behaviors:

### Visual Indicators

1. **Proximity**: Courting agents stay close to target
2. **Following**: Agent follows potential mate
3. **Gift-giving animations**: Agent hands item to target
4. **Display animations**: Special animations for displays (dance, song, combat)
5. **Emotional indicators**: Hearts, musical notes, or other particles
6. **Location-based**: Agents move to specific locations (workshops, nests, ritual circles)

### Behavior Names

Behaviors visible in the game UI:

- `courtship:conversation` - "Having a romantic conversation"
- `courtship:gift_giving` - "Giving a gift to [Name]"
- `courtship:aerial_dance` - "Performing aerial courtship dance"
- `courtship:craft_gift` - "Crafting a masterwork gift for [Name]"
- `courtship:shared_meal` - "Sharing a meal with [Name]"
- `courtship:mind_touch` - "Sharing thoughts with [Name]"
- `seeking_bed` - "Looking for privacy with [Name]"
- `mating` - "In private with [Name]"

---

## Configuration Examples

### Default Human Configuration

```typescript
function createHumanCourtshipComponent(): CourtshipComponent {
  return {
    type: 'courtship',
    state: 'idle',
    currentCourtshipTarget: null,
    currentCourtshipInitiator: null,
    paradigm: HUMAN_COURTSHIP_PARADIGM,
    preferredTactics: [
      'conversation',
      'compliment',
      'shared_meal',
      'gift_giving',
      'humor'
    ],
    dislikedTactics: [
      'aggressive_display',
      'dominance_combat'
    ],
    style: 'subtle',  // Random or personality-based
    romanticInclination: 0.6,  // Random 0.3-0.9
    activeCourtships: [],
    receivedCourtships: [],
    pastCourtships: [],
    lastCourtshipAttempt: 0,
    courtshipCooldown: 5000,  // ~4 minutes
    rejectionCooldown: new Map()
  };
}
```

### Dwarf Configuration

```typescript
function createDwarfCourtshipComponent(): CourtshipComponent {
  return {
    type: 'courtship',
    state: 'idle',
    currentCourtshipTarget: null,
    currentCourtshipInitiator: null,
    paradigm: DWARF_COURTSHIP_PARADIGM,
    preferredTactics: [
      'craft_gift',
      'demonstrate_skill',
      'share_ale',
      'shared_project',
      'show_wealth'
    ],
    dislikedTactics: [
      'hasty_approach',
      'empty_flattery'
    ],
    style: 'traditional',
    romanticInclination: 0.5,  // Dwarves are pragmatic
    activeCourtships: [],
    receivedCourtships: [],
    pastCourtships: [],
    lastCourtshipAttempt: 0,
    courtshipCooldown: 10000,  // ~8 minutes (slow and steady)
    rejectionCooldown: new Map()
  };
}
```

---

## Summary

This courtship system provides:

1. **Species-specific courtship rituals** via `CourtshipParadigm`
2. **Individual courtship tactics** that agents can perform
3. **Preference-based reception** - targets like or dislike specific tactics
4. **Multi-factor compatibility** - personality, interests, relationship, sexuality
5. **Meaningful consent** - both agents must agree before mating
6. **Observable behaviors** - courtship creates visible, interesting actions
7. **Integration** - Works with existing relationship, sexuality, and reproduction systems
8. **Variation** - Some agents more romantically inclined, different styles

The system creates emergent romantic storylines while respecting individual agency and species diversity.
