# Relationship System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The relationship system tracks and evolves connections between agents. Relationships form through shared experiences, conversations, and interactions. They affect behavior, needs satisfaction, decision-making, and create emergent social dynamics in the village.

---

## Relationship Structure

### Core Interface

```typescript
interface Relationship {
  id: string;
  agents: [string, string];       // Bidirectional but asymmetric
  type: RelationshipType;

  // Dimensions (0-100 each, can be asymmetric)
  dimensions: {
    [agentId: string]: RelationshipDimensions;
  };

  // History
  formed: GameTime;
  lastInteraction: GameTime;
  interactionCount: number;

  // Dynamics
  trajectory: "improving" | "stable" | "declining";
  recentEvents: RelationshipEvent[];

  // Special states
  flags: RelationshipFlag[];
}

interface RelationshipDimensions {
  // Core feelings
  affection: number;        // 0-100: Warmth, liking
  trust: number;            // 0-100: Reliability belief
  respect: number;          // 0-100: Admiration, esteem

  // Interaction patterns
  familiarity: number;      // 0-100: How well they know each other
  comfort: number;          // 0-100: Ease of interaction

  // Sentiment
  positiveMemories: number; // Count of good experiences
  negativeMemories: number; // Count of bad experiences
}

type RelationshipType =
  | "stranger"              // Never interacted
  | "acquaintance"          // Met, minimal interaction
  | "colleague"             // Work together
  | "neighbor"              // Live near each other
  | "friend"                // Positive personal bond
  | "close_friend"          // Strong friendship
  | "best_friend"           // Deepest friendship
  | "rival"                 // Competitive relationship
  | "enemy"                 // Active dislike
  | "mentor"                // Teaching relationship
  | "student"               // Learning relationship
  | "romantic_interest"     // Attraction
  | "partner"               // Committed relationship
  | "family"                // Blood/adopted family
  | "business_partner";     // Economic relationship
```

### Relationship Flags

```typescript
type RelationshipFlag =
  | "has_secret"            // Shared a secret
  | "owes_favor"            // One owes the other
  | "broken_trust"          // Trust was betrayed
  | "saved_life"            // Significant help
  | "shared_trauma"         // Difficult experience together
  | "romantic_history"      // Past romantic involvement
  | "business_conflict"     // Economic dispute
  | "family_feud"           // Inherited tension
  | "mentor_graduated"      // Completed mentorship
  | "reconciled";           // Overcame past conflict
```

---

## Requirements

### REQ-REL-001: Relationship Formation

Relationships SHALL form through interaction:

```typescript
interface RelationshipFormation {
  trigger: FormationTrigger;
  initialType: RelationshipType;
  initialDimensions: Partial<RelationshipDimensions>;
}

type FormationTrigger =
  | "first_meeting"         // Strangers meet
  | "introduced"            // Third party introduction
  | "work_together"         // Assigned same task
  | "neighbor"              // Move near each other
  | "helped"                // One helped the other
  | "witnessed_event";      // Shared experience
```

```
WHEN two agents interact for the first time
THEN the system SHALL:
  1. Create Relationship object
  2. Set type to "acquaintance" (or context-appropriate)
  3. Initialize dimensions based on:
     - First impression (personality compatibility)
     - Circumstances of meeting
     - Mood of both agents
  4. Store in both agents' relationship lists
```

### REQ-REL-002: First Impressions

Initial relationship values SHALL depend on context:

```typescript
function calculateFirstImpression(
  agent1: Agent,
  agent2: Agent,
  context: MeetingContext
): RelationshipDimensions {

  // Personality compatibility
  const compatibility = calculatePersonalityMatch(
    agent1.personality,
    agent2.personality
  );

  // Context modifiers
  const contextMod = {
    positive_event: 1.2,     // Met at celebration
    work_context: 1.0,       // Neutral
    conflict: 0.7,           // Met during dispute
    helped: 1.4,             // One helped other
    random: 1.0,             // Just passed by
  }[context.type];

  // Mood modifiers
  const moodMod = (agent1.mood.happiness + agent2.mood.happiness) / 200;

  const base = 30;  // Neutral starting point

  return {
    affection: base * compatibility * contextMod * moodMod,
    trust: base * contextMod,
    respect: base + (context.impressive ? 20 : 0),
    familiarity: 10,  // Just met
    comfort: base * compatibility,
    positiveMemories: context.positive ? 1 : 0,
    negativeMemories: context.negative ? 1 : 0,
  };
}
```

### REQ-REL-003: Relationship Evolution

Relationships SHALL change over time:

```typescript
interface RelationshipChange {
  relationship: string;
  trigger: ChangeTrigger;
  dimension: keyof RelationshipDimensions;
  delta: number;
  reason: string;
}

type ChangeTrigger =
  | "conversation"
  | "helped"
  | "harmed"
  | "gift"
  | "broken_promise"
  | "shared_experience"
  | "time_apart"
  | "gossip"
  | "observed_behavior";
```

```
WHEN agents interact
THEN dimensions SHALL update:

Positive changes:
  - Conversation (casual): +1-3 affection, +1 familiarity
  - Conversation (deep): +3-8 affection, +2-5 trust
  - Helped with task: +5-15 trust, +3-8 respect
  - Gift giving: +5-20 affection (based on thoughtfulness)
  - Kept promise: +10 trust
  - Shared hardship: +10-20 to all dimensions

Negative changes:
  - Argument: -5-15 affection, -3-10 comfort
  - Broken promise: -20-40 trust
  - Insult: -10-25 respect
  - Theft/harm: -20-50 trust, -15-30 affection
  - Gossip (if discovered): -15 trust
```

### REQ-REL-004: Relationship Decay

Relationships SHALL naturally decay without maintenance:

```
WHEN time passes without interaction
THEN dimensions SHALL decay:
  - familiarity: -1 per week
  - affection: -0.5 per week (slower for stronger bonds)
  - comfort: -1 per week
  - trust: -0.25 per week (very slow)
  - respect: -0.1 per week (very slow)

Decay modifiers:
  - Strong relationships (>70): 0.5x decay rate
  - Very strong (>90): 0.25x decay rate
  - Romantic/family: 0.1x decay rate
  - Recent negative event: 2x decay of positive dimensions
  - Distance (different villages): 1.5x decay rate
```

### REQ-REL-005: Type Transitions

Relationship types SHALL evolve based on dimensions:

```typescript
interface TypeTransition {
  from: RelationshipType;
  to: RelationshipType;
  requirements: TransitionRequirements;
}

interface TransitionRequirements {
  minAffection?: number;
  minTrust?: number;
  minRespect?: number;
  minFamiliarity?: number;
  minInteractions?: number;
  requiredFlags?: RelationshipFlag[];
  excludeFlags?: RelationshipFlag[];
}

const transitions: TypeTransition[] = [
  {
    from: "acquaintance",
    to: "friend",
    requirements: {
      minAffection: 50,
      minTrust: 40,
      minFamiliarity: 40,
      minInteractions: 10,
    },
  },
  {
    from: "friend",
    to: "close_friend",
    requirements: {
      minAffection: 70,
      minTrust: 60,
      minFamiliarity: 70,
      minInteractions: 30,
    },
  },
  {
    from: "close_friend",
    to: "best_friend",
    requirements: {
      minAffection: 90,
      minTrust: 80,
      minFamiliarity: 90,
      requiredFlags: ["has_secret"],
    },
  },
  {
    from: "acquaintance",
    to: "rival",
    requirements: {
      minAffection: -1,  // Any negative
      minRespect: 50,    // But still respect them
    },
  },
  {
    from: "acquaintance",
    to: "enemy",
    requirements: {
      minAffection: -1,
      minTrust: -1,
      excludeFlags: ["reconciled"],
    },
  },
];
```

### REQ-REL-006: Asymmetric Relationships

Relationships MAY be asymmetric:

```
WHEN agent A feels differently than agent B
THEN dimensions SHALL be tracked separately:
  - Each agent has their own dimension values
  - Type may differ (A sees B as friend, B sees A as rival)
  - Interactions affect both but may differ in magnitude

Example:
  Agent A helps Agent B
  - A's trust in B: unchanged
  - B's trust in A: +15
  - A's respect for B: unchanged
  - B's respect for A: +10
  - B now owes_favor to A
```

---

## Social Dynamics

### REQ-REL-007: Relationship Effects on Behavior

Relationships SHALL influence agent decisions:

```typescript
interface RelationshipBehaviorEffect {
  // Interaction preference
  preferredCompanions: string[];     // Who to seek out
  avoidedAgents: string[];           // Who to avoid

  // Information sharing
  secretSharingThreshold: number;    // Trust needed to share
  gossiAboutThreshold: number;       // Below this, may gossip

  // Helping
  helpProbability: Map<string, number>;
  helpQuality: Map<string, number>;

  // Economic
  tradeFairness: Map<string, number>;// Pricing adjustment

  // Mood
  moodBoostFromPresence: Map<string, number>;
}
```

```
WHEN an agent makes a social decision
THEN relationships SHALL influence:
  - Who to spend time with (seek high affection)
  - Who to help first (prioritize high affection + trust)
  - Who to share information with (require trust threshold)
  - Who to trade fairly with (friends get better deals)
  - Mood in presence (positive/negative based on relationship)
```

### REQ-REL-008: Social Networks

Relationships SHALL form network structures:

```typescript
interface SocialNetwork {
  // Graph structure
  nodes: string[];                   // Agent IDs
  edges: Relationship[];

  // Computed properties
  clusters: string[][];              // Friend groups
  bridges: string[];                 // Agents connecting groups
  influencers: string[];             // High connection count
  isolated: string[];                // Few/no connections

  // Metrics
  density: number;                   // Connection ratio
  averagePathLength: number;         // Degrees of separation
  clusteringCoefficient: number;
}

function analyzeSocialNetwork(village: Village): SocialNetwork {
  // Build graph from all relationships
  // Identify friend groups (high mutual affection clusters)
  // Find bridge agents who connect groups
  // Calculate network metrics
}
```

### REQ-REL-009: Reputation

Agents SHALL have reputations based on relationships:

```typescript
interface Reputation {
  agentId: string;

  // Aggregate scores (based on how others see them)
  overallLikeability: number;        // Average affection from others
  trustworthiness: number;           // Average trust from others
  respect: number;                   // Average respect from others

  // Specific reputations
  tradeReputation: number;           // Fair dealer?
  helpfulness: number;               // Helps others?
  socialability: number;             // Pleasant to be around?
  reliability: number;               // Keeps promises?

  // Known by
  knownTo: string[];                 // Who knows of them
  reputationSource: Map<string, string[]>;  // Who told whom
}
```

```
WHEN gossip spreads about an agent
THEN reputation SHALL:
  - Propagate through social network
  - Decay with each retelling
  - Influence first impressions
  - Create expectations before meeting

WHEN an agent meets someone new
THEN they MAY:
  - Have heard about them (reputation precedes)
  - Start with biased dimensions based on reputation
  - Update reputation after firsthand experience
```

---

## Relationship Events

### REQ-REL-010: Significant Events

Major events SHALL permanently mark relationships:

```typescript
interface RelationshipEvent {
  id: string;
  relationship: string;
  type: EventType;
  description: string;
  timestamp: GameTime;
  impact: RelationshipImpact;

  // Permanence
  memorable: boolean;
  anniversary?: boolean;             // Remembered yearly
}

type EventType =
  | "first_meeting"
  | "became_friends"
  | "major_help"
  | "betrayal"
  | "shared_success"
  | "shared_failure"
  | "confession"
  | "gift_memorable"
  | "argument_serious"
  | "reconciliation"
  | "romantic_beginning"
  | "breakup";

interface RelationshipImpact {
  immediate: Partial<RelationshipDimensions>;
  lasting: RelationshipFlag[];
  storySignificance: number;         // For chroniclers
}
```

### REQ-REL-011: Conflict and Reconciliation

Relationships SHALL handle conflict:

```
WHEN a significant conflict occurs
THEN the system SHALL:
  1. Record the conflict event
  2. Apply negative dimension changes
  3. Add appropriate flags (broken_trust, etc.)
  4. Set relationship trajectory to "declining"
  5. Both agents remember the conflict

WHEN agents reconcile
THEN the system SHALL:
  1. Record reconciliation event
  2. Remove or override negative flags
  3. Add "reconciled" flag
  4. Partially restore dimensions
  5. Relationship may become stronger than before
     (shared_trauma effect)
```

---

## Special Relationships

### REQ-REL-012: Family Relationships

Family bonds SHALL have unique properties:

```typescript
interface FamilyRelationship extends Relationship {
  familyType: FamilyType;
  biological: boolean;

  // Family-specific
  obligations: FamilyObligation[];
  inheritance: InheritanceRights;
}

type FamilyType =
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "aunt_uncle"
  | "niece_nephew"
  | "cousin"
  | "spouse"
  | "adopted";

interface FamilyObligation {
  type: "support" | "respect" | "protect" | "teach";
  from: string;
  to: string;
  strength: number;
}
```

```
Family relationships SHALL:
  - Start with high baseline dimensions
  - Decay very slowly
  - Have obligations that affect behavior
  - Influence inheritance and living arrangements
  - Pass on traits and knowledge
  - Be harder to sever completely
```

### REQ-REL-013: Romantic Relationships

Romantic bonds SHALL have progression:

```typescript
interface RomanticRelationship extends Relationship {
  stage: RomanticStage;
  exclusivity: boolean;
  cohabiting: boolean;
  children: string[];

  // Romantic-specific
  romanticInterest: Map<string, number>;  // Attraction level
  romanticHistory: RomanticEvent[];
}

type RomanticStage =
  | "attraction"        // Interested but not together
  | "courting"          // Actively pursuing
  | "dating"            // Together, early stage
  | "committed"         // Serious relationship
  | "partnered"         // Long-term commitment
  | "complicated"       // Issues, uncertain
  | "separated"         // Taking a break
  | "ended";            // No longer romantic
```

---

## Player Relationships

### REQ-REL-014: Player-Agent Relationships

The player-agent SHALL have normal relationships:

```
WHEN the player is controlling an agent
THEN relationship rules SHALL apply normally:
  - Other agents treat player-agent based on relationship
  - Player actions affect relationships
  - Player sees relationship status in UI

Player-specific features:
  - Relationship UI shows all known agents
  - Can view relationship history
  - See other agents' disposition (not exact numbers)
  - Receive hints about how to improve relationships
```

---

## Alien Relationship Structures

### REQ-REL-015: Non-Friendship Bonds

Some species have bond types that don't map to friendship:

```typescript
// Species can define their primary bonding type
interface SpeciesBondingProfile {
  species: string;
  primaryBondType: BondType;
  supportsBonds: BondType[];
  cannotComprehend: BondType[];    // Psychologically impossible
}

type BondType =
  // Human-compatible
  | "friendship"          // Equal-status positive bond
  | "romance"             // Pair-bond attraction
  | "family"              // Kinship bonds
  | "respect"             // Admiration without affection

  // Hierarchical
  | "manchi"              // Instinctive loyalty TO leader (Atevi-style)
  | "dominance"           // Pack hierarchy position
  | "fealty"              // Oath-bound service
  | "discipleship"        // Student-master bond

  // Collective
  | "hive_belonging"      // Connection to collective
  | "pack_unity"          // Part of pack mind
  | "network_link"        // Node in shared consciousness

  // Other
  | "symbiosis"           // Host-symbiont bond
  | "utility"             // Purely transactional
  | "territorial";        // Shared territory = bond

// Man'chi-style association bond
interface ManchiRelationship extends Relationship {
  bondType: "manchi";

  // Hierarchy
  direction: "upward" | "downward";   // Loyalty goes UP, not mutual
  associationId: string;               // The group/clan/faction

  // Dimensions (different from friendship)
  dimensions: {
    [agentId: string]: ManchiDimensions;
  };
}

interface ManchiDimensions {
  loyalty: number;           // 0-100: Strength of man'chi
  position: number;          // Hierarchy level (0 = top)
  propriety: number;         // How correctly they behave
  reliability: number;       // Track record

  // NOT present (psychologically impossible)
  // affection: undefined - not a concept
  // friendship: undefined - not a concept
}
```

```
WHEN an agent with man'chi psychology forms a bond
THEN the system SHALL:
  1. Determine hierarchy (who is above whom)
  2. Set loyalty direction (always upward)
  3. Leader does NOT feel man'chi back (feels obligation instead)
  4. Track propriety of interactions
  5. Never create "equal" bonds (impossible for this species)

Man'chi-specific behaviors:
  - Will die for those above in hierarchy
  - Cannot understand "just friends"
  - Sees human friendliness as either fealty or challenge
  - Unattached state is deeply distressing
  - May transfer to new leader after old leader's death
```

### REQ-REL-016: Pack Mind Relationships

Pack minds form relationships as single entities:

```typescript
interface PackMindRelationship extends Relationship {
  // The pack is one agent
  packId: string;
  otherEntity: string;              // Individual or another pack

  // Special tracking
  bodiesInteracted: string[];       // Which pack bodies met other
  coherentDuringInteraction: boolean;
}

// Pack-to-pack relationships
interface PackToPackRelationship extends Relationship {
  pack1: string;
  pack2: string;

  // Complications
  memberExchangeHistory: MemberExchange[];  // Bodies traded between packs
  sharedPuppyRearing?: boolean;
  territoryOverlap: boolean;
}

interface MemberExchange {
  body: string;
  fromPack: string;
  toPack: string;
  circumstance: "mating" | "exile" | "adoption" | "split";
  resultingPersonalityChange: string;  // Packs change when members change
}
```

```
WHEN a pack mind forms a relationship
THEN the system SHALL:
  1. Track the pack as single entity
  2. Other beings may be confused about pack identity
  3. Relationship persists through body changes
  4. Pack split creates relationship complications

Pack relationship edge cases:
  - Pack A meets person X with bodies 1,2,3
  - Later, bodies 4,5 of Pack A meet X
  - X may not realize it's the same being
  - Pack's relationship to X is consistent
  - X's relationship to "Pack A" may be fragmented
```

### REQ-REL-017: Hive Mind Relationships

Hive minds have special relationship patterns:

```typescript
interface HiveRelationship {
  hiveId: string;
  otherEntity: string;              // Another hive or individual

  // Hive doesn't have individual relationships
  // The HIVE has relationships, workers are extensions

  // Only queen/cerebrates can form relationships
  representativeId: string;          // Who speaks for hive

  // Dimensions
  hiveOpinion: {
    utility: number;                 // How useful is this entity
    threat: number;                  // How dangerous
    integration: number;             // Can they be absorbed/allied
  };
}

// Individual meeting hive
interface IndividualHiveRelationship {
  individual: string;
  hive: string;

  // Individual's perspective
  individualDimensions: {
    fear: number;
    respect: number;
    understanding: number;           // Do they grasp hive nature?
  };

  // Hive's "perspective" (not individual, collective assessment)
  hiveAssessment: {
    category: "resource" | "threat" | "ally" | "neutral" | "absorbable";
    priority: number;
  };
}
```

```
WHEN an individual forms relationship with hive
THEN the system SHALL:
  1. Individual has normal relationship structure
  2. Hive has categorical assessment (not emotional)
  3. Interacting with different workers doesn't change hive opinion
  4. Hive can coordinate responses across all workers
  5. Individual may feel differently about different workers
     (but they're all extensions of one mind)
```

### REQ-REL-018: Cross-Psychology Relationships

Beings with incompatible psychology SHALL handle differences:

```typescript
interface CrossPsychologyRelationship extends Relationship {
  species1: string;
  species2: string;
  psychologyCompatibility: "full" | "partial" | "none";

  // What each side thinks is happening
  species1Perceives: BondType;       // "This is friendship"
  species2Perceives: BondType;       // "This is fealty"

  // Misunderstandings
  misunderstandings: PsychologyMisunderstanding[];

  // Adaptation over time
  adaptationProgress: number;         // 0-1
  learnedBehaviors: string[];
}

interface PsychologyMisunderstanding {
  action: string;                     // What happened
  species1Interpretation: string;     // How sp1 read it
  species2Interpretation: string;     // How sp2 read it
  consequence: string;                // What resulted
  resolved: boolean;
}

// Learning to bridge psychology gap
interface PsychologicalAdaptation {
  learner: string;
  learning: string;                   // Other species psychology

  // What they've learned
  understoodConcepts: string[];       // Can now grasp
  canFakeBehavior: string[];          // Can act appropriately
  stillMisunderstands: string[];      // Persistent gaps

  // Never learnable (biology)
  biologicallyImpossible: string[];
}
```

```
WHEN beings with incompatible psychology interact
THEN the system SHALL:
  1. Track each being's perception of relationship type
  2. Log misunderstandings
  3. Allow learning over time (behavioral, not emotional)
  4. Some gaps can never be bridged (biology)
  5. Successful cross-psychology relationships are noteworthy

Example: Human befriends Kethrani
  - Human thinks: "We're good friends"
  - Kethrani thinks: "They have submitted to my association"
  - Human acts casually → Kethrani sees impropriety
  - Over time, human learns formal behavior
  - Human never truly "gets" man'chi
  - Kethrani never truly "gets" friendship
  - But they can work together with learned behaviors
```

### REQ-REL-019: Symbiont Relationships

Joined beings have complex relationships:

```typescript
interface SymbiontRelationship {
  hostId: string;
  symbiontId: string;
  joinedId: string;                   // The merged identity

  // Internal relationship (host ↔ symbiont)
  internalDynamics: {
    dominance: "host" | "symbiont" | "equal" | "fluctuating";
    cooperation: number;              // 0-1
    conflictHistory: InternalConflict[];
  };

  // External relationships (the pair as one)
  externalRelationships: Relationship[];

  // Complications
  hostPriorRelationships: RelationshipTransition[];
  symbiontPriorRelationships: RelationshipTransition[];
}

interface RelationshipTransition {
  priorRelationship: Relationship;
  postJoiningState: "maintained" | "transferred" | "complicated" | "ended";
  reason: string;
}

// Previous hosts' relationships
interface InheritedRelationship {
  originalHost: string;
  relationship: Relationship;

  // Current host's relationship to inherited connection
  currentHostFeels: "confused" | "accepting" | "resentful" | "grateful";
  inheritedMemoriesOf: boolean;
  behavioralBleed: boolean;          // Acts like old host sometimes
}
```

```
WHEN a symbiont joins a new host
THEN relationships SHALL:
  1. Host's existing relationships continue (may be confused by changes)
  2. Symbiont's prior host relationships become complicated
  3. People who knew prior hosts may recognize behaviors
  4. New personality blend affects all relationship dynamics
  5. Some relationships may not survive the transition

Symbiont relationship complications:
  - Prior host's spouse: Now relationship with different person
  - Prior host's enemies: May recognize symbiont
  - New host's friends: Notice personality changes
  - Symbiont's centuries of connections: Burden on new host
```

### REQ-REL-020: Temporal-Mismatch Relationships

Relationships between beings with different time scales:

```typescript
interface TemporalRelationship extends Relationship {
  // Time experience difference
  participant1Tempo: TemporalType;
  participant2Tempo: TemporalType;
  temporalRatio: number;              // How different

  // Relationship structure
  relationType: TemporalRelationType;

  // Generational tracking (if applicable)
  generationalHistory?: GenerationalBond[];
}

type TemporalRelationType =
  | "individual"           // Same tempo, normal relationship
  | "generational"         // Relationship with lineage, not individual
  | "civilizational"       // Between peoples, not persons
  | "written"              // Correspondence across time
  | "monitored";           // One watches other's lifespan

interface GenerationalBond {
  generation: number;
  representative: string;             // Who held bond this generation
  bondStrength: number;
  memoriesPassedDown: boolean;
  degredation: number;                // How much lost from original
}

// Geological being's view of human relationship
interface GeologicalView {
  humanLineage: string;               // Family/village they know
  timeKnownHumanYears: number;
  generationsWitnessed: number;

  // They don't track individuals
  currentRepresentative?: string;     // Current human contact
  lineageOpinion: number;             // Opinion of the bloodline

  // They may not notice individual deaths
  awareOfIndividualMortality: boolean;
}
```

```
WHEN a geological-scale being forms relationship
THEN the system SHALL:
  1. Track relationship with lineage, not individual
  2. Human death may not register for years (their time)
  3. Relationship passes through generations
  4. Written records maintain continuity
  5. Stone Eater may confuse great-grandchild for original contact

Long-term relationship example:
  - Stone Eater meets human explorer Year 0
  - Explorer dies Year 70 (Stone Eater: "moments ago")
  - Explorer's grandchild continues correspondence
  - Stone Eater replies Year 150 (thinks: "quick response")
  - By Year 300, relationship with "that family" is strong
  - Stone Eater thinks it's been a pleasant short acquaintance
```

---

## Open Questions

1. Marriage/partnership ceremonies?
2. Adoption mechanics?
3. Relationship counseling by other agents?
4. Inherited feuds across generations?
5. Relationship goals/aspirations for agents?
6. How do pack minds handle romance? (bodies can't all be present for intimacy)
7. Can hive minds form friendships or only alliances?
8. Do geological beings mourn short-lived friends?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent personality compatibility
- `agent-system/needs.md` - Social needs from relationships
- `agent-system/memory-system.md` - Relationship memories

**Species and Culture:**
- `agent-system/species-system.md` - Pair bonding tendency, reproduction strategy
- `agent-system/culture-system.md` - Relationship norms, courtship rules, marriage customs

**Social Systems:**
- `agent-system/conversation-system.md` - Relationship-building conversations
- `agent-system/lifecycle-system.md` - Family formation, birth, generations
- `agent-system/chroniclers.md` - Documenting romances, marriages, feuds

**Economy:**
- `economy-system/spec.md` - Trade relationship effects

**Simulation:**
- `world-system/abstraction-layers.md` - Key figure relationships at scale
