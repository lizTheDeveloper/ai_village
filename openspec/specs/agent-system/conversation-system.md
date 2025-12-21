# Conversation System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The conversation system enables agents to communicate with each other, sharing information, building relationships, negotiating trades, and creating emergent social dynamics. Conversations are driven by LLM when agents have something meaningful to discuss, and may be summarized or abstracted when less relevant to gameplay.

---

## Conversation Types

### Categories

```typescript
type ConversationType =
  | "greeting"          // Brief acknowledgment
  | "smalltalk"         // Casual chat, relationship building
  | "information"       // Sharing knowledge (locations, news)
  | "gossip"            // Discussing other agents
  | "negotiation"       // Trade, work requests
  | "teaching"          // Skill/knowledge transfer
  | "storytelling"      // Chroniclers, entertainers
  | "argument"          // Conflict, disagreement
  | "confession"        // Sharing secrets, deep feelings
  | "request"           // Asking for help
  | "celebration";      // Shared joy, events
```

### Conversation Structure

```typescript
interface Conversation {
  id: string;
  participants: string[];          // Agent IDs
  type: ConversationType;
  location: Position;

  // State
  startTime: GameTime;
  endTime?: GameTime;
  status: "active" | "paused" | "ended";

  // Content
  exchanges: ConversationExchange[];
  topic: string;                   // Main subject
  subtopics: string[];             // Things that came up

  // Outcomes
  informationShared: SharedInfo[];
  relationshipChanges: RelationshipDelta[];
  agreementsReached: Agreement[];

  // Memory
  memorableQuotes: string[];       // For chroniclers
  emotionalPeaks: EmotionalMoment[];
}

interface ConversationExchange {
  speaker: string;                 // Agent ID
  content: string;                 // What was said
  intent: ExchangeIntent;
  emotion: EmotionalState;
  timestamp: GameTime;

  // Reactions
  reactions: Map<string, Reaction>;
}

type ExchangeIntent =
  | "inform"
  | "ask"
  | "agree"
  | "disagree"
  | "joke"
  | "comfort"
  | "persuade"
  | "threaten"
  | "apologize"
  | "thank"
  | "invite"
  | "decline";
```

---

## Requirements

### REQ-CONV-001: Initiating Conversations

Agents SHALL initiate conversations based on needs and context:

```typescript
interface ConversationTrigger {
  type: TriggerType;
  priority: number;
  conditions: TriggerConditions;
}

type TriggerType =
  | "proximity"         // Passed by someone
  | "scheduled"         // Planned meeting
  | "need_driven"       // Need to share/ask something
  | "event_response"    // Reacting to event
  | "relationship"      // Missing a friend
  | "work_related";     // Task coordination

interface TriggerConditions {
  // Agent state
  socialNeedThreshold?: number;    // Min social need to trigger
  hasInfoToShare?: boolean;
  needsHelp?: boolean;

  // Target
  relationshipMinimum?: number;    // Don't talk to strangers
  targetAvailable?: boolean;

  // Context
  appropriateLocation?: boolean;
  appropriateTime?: boolean;
}
```

```
WHEN an agent encounters another agent
THEN the system SHALL evaluate:
  1. Relationship strength between agents
  2. Both agents' social need levels
  3. Whether either has information to share
  4. Current activities (can they stop?)
  5. Time since last conversation
  6. Location appropriateness

IF conversation should occur
THEN:
  1. Interrupt both agents' current activities
  2. Create Conversation object
  3. Generate opening based on relationship and context
  4. Process exchanges until natural end
```

### REQ-CONV-002: Conversation Flow

Conversations SHALL flow naturally:

```typescript
interface ConversationFlowController {
  // Turn management
  determineNextSpeaker(conversation: Conversation): string;
  generateResponse(speaker: Agent, context: ConversationContext): string;

  // Topic management
  shouldChangeTopic(conversation: Conversation): boolean;
  selectNewTopic(participants: Agent[]): string;

  // Duration
  shouldEndConversation(conversation: Conversation): boolean;
  generateClosing(conversation: Conversation): string;
}

interface ConversationContext {
  history: ConversationExchange[];
  topic: string;
  participants: Agent[];
  location: Position;
  timeOfDay: TimeOfDay;
  recentEvents: GameEvent[];
  sharedMemories: Memory[];
}
```

```
WHEN generating a conversation exchange
THEN the LLM SHALL receive:
  - Speaking agent's personality and current state
  - Relationship with other participant(s)
  - Conversation history (last 5-10 exchanges)
  - Relevant memories about topic/participants
  - Current needs that might affect mood
  - Any information they want to share

The response SHALL include:
  - The spoken content
  - Emotional tone
  - Intent classification
  - Whether they want to continue
```

### REQ-CONV-003: Information Exchange

Conversations SHALL transfer knowledge:

```typescript
interface SharedInfo {
  type: InfoType;
  content: any;
  sharedBy: string;
  sharedTo: string[];
  confidence: number;          // How certain the source is
  firsthand: boolean;          // Witnessed vs heard
}

type InfoType =
  | "location"                 // Where something is
  | "event"                    // Something that happened
  | "gossip"                   // About another agent
  | "skill"                    // How to do something
  | "news"                     // Village happenings
  | "rumor"                    // Unverified info
  | "secret";                  // Private information
```

```
WHEN an agent shares information
THEN the receiving agent SHALL:
  1. Evaluate source trustworthiness
  2. Compare with existing knowledge
  3. Add to memory with:
     - Source attribution
     - Confidence level (source's confidence * trust)
     - Timestamp
  4. Mark as "heard" not "witnessed"

WHEN an agent hears gossip about someone they know
THEN their memory SHALL update:
  - Relationship knowledge about third party
  - Opinion may shift based on content + trust
  - May want to verify or spread further
```

### REQ-CONV-004: Spatial Knowledge Sharing

Agents SHALL share location information:

```typescript
interface LocationShareEvent {
  // What was shared
  location: Position;
  locationType: LocationType;
  description: string;

  // Context
  sharedDuring: string;        // Conversation ID
  sharedBy: string;
  receivedBy: string[];

  // Quality
  accuracy: number;            // How precise the description
  recency: number;             // How recently witnessed
  importance: number;
}
```

```
WHEN an agent shares a location
THEN the listener's spatial memory SHALL update:
  - Add LocationMemory with source = "told"
  - Set confidence based on speaker reliability
  - Set recency based on when speaker visited
  - May override or conflict with existing knowledge

Example:
  Agent A: "I found wild blueberries by the old oak near the river"
  Agent B's spatial memory adds:
    {
      type: "resource",
      content: { resource: "blueberries" },
      position: [estimated from description],
      confidence: 0.7,
      source: "told",
      sharedBy: "Agent A"
    }
```

### REQ-CONV-005: Conversation Memory

Conversations SHALL create memories:

```
WHEN a conversation ends
THEN participating agents SHALL:
  1. Create EpisodicMemory of conversation
  2. Extract key information learned
  3. Update relationship with participant(s)
  4. Note emotional high/low points
  5. Record any agreements made

Memory importance based on:
  - Relationship strength (closer = more important)
  - Information novelty (new info = more important)
  - Emotional intensity
  - Life impact (agreements, revelations)
```

---

## Conversation Modes

### REQ-CONV-006: Depth Levels

Conversations SHALL vary in depth based on context:

```typescript
type ConversationDepth =
  | "minimal"          // Wave, nod, brief greeting
  | "casual"           // Small talk, weather, simple updates
  | "normal"           // Full exchange, some info sharing
  | "deep"             // Emotional, detailed, significant
  | "abstracted";      // Summarized for background agents

interface DepthFactors {
  relationship: number;        // Closer = deeper
  availableTime: number;       // Both free = deeper
  socialNeed: number;          // Higher need = deeper
  informationRelevance: number;// Important info = deeper
  emotionalState: number;      // Strong feelings = deeper
}
```

### REQ-CONV-007: Abstracted Conversations

Background conversations SHALL be summarized:

```
WHEN agents at "background" simulation layer converse
THEN the system SHALL:
  1. Determine conversation type probabilistically
  2. Calculate likely outcomes based on:
     - Relationship strength
     - Personality compatibility
     - Available information to share
  3. Apply outcomes without full LLM exchange
  4. Store summary for later detail if needed

Abstracted conversation produces:
  - Relationship delta (positive/negative)
  - Information transfer (probabilistic)
  - Social need satisfaction
  - Brief summary string for memory
```

---

## Group Conversations

### REQ-CONV-008: Multi-Party Discussions

Agents SHALL converse in groups:

```typescript
interface GroupConversation extends Conversation {
  // Additional group dynamics
  dominantSpeaker?: string;    // Who's talking most
  sideConversations: Conversation[];
  groupDynamics: GroupDynamics;
}

interface GroupDynamics {
  leaderEmergence: string | null;
  factions: string[][];        // Agents agreeing with each other
  tensions: [string, string][];// Agents in conflict
  consensus: string | null;    // If group reached agreement
}
```

```
WHEN more than 2 agents converse
THEN the system SHALL:
  1. Manage turn-taking based on personality
     - Extroverts speak more
     - Leaders guide discussion
     - Shy agents may not speak unless addressed
  2. Track agreement/disagreement
  3. Allow side conversations to form
  4. End when group disperses or topic exhausts
```

---

## Special Conversations

### REQ-CONV-009: Teaching Conversations

Skill/knowledge transfer through conversation:

```typescript
interface TeachingConversation extends Conversation {
  teacher: string;
  student: string;
  subject: string;

  // Progress
  lessonsCompleted: number;
  skillTransferred: number;    // 0-1 of teacher's skill level

  // Requirements
  teacherMinSkill: number;
  studentCurrentSkill: number;
  difficultyLevel: number;
}
```

```
WHEN a teaching conversation occurs
THEN the student MAY gain:
  - Skill points (based on teacher skill, time, aptitude)
  - Knowledge (specific techniques, recipes)
  - Memories of lessons

Teaching effectiveness affected by:
  - Teacher's skill level
  - Teacher's teaching ability (socializing skill)
  - Student's aptitude (learning rate)
  - Relationship quality
  - Time invested
```

### REQ-CONV-010: Negotiation Conversations

Trade and work negotiations:

```typescript
interface NegotiationConversation extends Conversation {
  negotiationType: "trade" | "employment" | "favor" | "dispute";

  // Positions
  initialOffers: Map<string, Offer>;
  currentOffers: Map<string, Offer>;

  // Progress
  rounds: number;
  concessions: Concession[];

  // Outcome
  agreement?: Agreement;
  breakdown?: BreakdownReason;
}

interface Agreement {
  type: string;
  parties: string[];
  terms: AgreementTerm[];
  duration?: GameTime;
  consequences: string[];
}
```

---

## Player Conversations

### REQ-CONV-011: Player Dialogue

The player-agent SHALL converse like other agents:

```typescript
interface PlayerConversation extends Conversation {
  // Player input method
  inputMode: "typed" | "selected" | "voice";

  // Response options (if selected mode)
  availableResponses?: DialogueOption[];

  // Timing
  waitingForPlayer: boolean;
  playerResponseTimeout?: number;
}

interface DialogueOption {
  id: string;
  text: string;
  intent: ExchangeIntent;
  tone: EmotionalTone;
  expectedOutcome: string;
}
```

```
WHEN the player-agent is in conversation
THEN the UI SHALL:
  1. Display conversation history
  2. Show NPC's response
  3. Present response options OR free text input
  4. Indicate NPC's emotional state
  5. Show relationship status

Player response modes:
  - Free text: Player types, LLM interprets intent
  - Selection: Curated options based on context
  - Quick: Preset responses (agree, disagree, ask more)
```

---

## Conversation Effects

### REQ-CONV-012: Relationship Updates

Conversations SHALL affect relationships:

```typescript
interface ConversationRelationshipEffect {
  participants: [string, string];
  conversationId: string;

  // Changes
  friendshipDelta: number;     // -10 to +10 typical
  trustDelta: number;
  respectDelta: number;

  // Causes
  positiveFactors: string[];   // What improved things
  negativeFactors: string[];   // What hurt things

  // New knowledge
  learnedTraits: string[];     // Discovered about other
  sharedExperiences: string[]; // What they did together
}
```

```
AFTER a conversation ends
THEN relationships SHALL update based on:
  - Conversation type (deep > casual > minimal)
  - Emotional content (positive vs negative)
  - Information shared (secrets increase trust if kept)
  - Agreements kept/broken (from past)
  - Time spent (longer = bigger effect)
  - Quality (interesting > boring)
```

### REQ-CONV-013: Social Need Satisfaction

Conversations SHALL satisfy social needs:

```
WHEN an agent participates in conversation
THEN their social needs SHALL change:
  - belonging: increases with group inclusion
  - friendship: increases with friends
  - respect: increases with positive feedback
  - intimacy: increases with deep personal sharing

Satisfaction based on:
  - Conversation depth
  - Relationship quality with participants
  - Conversation outcome (positive vs negative)
  - Personal engagement (active vs passive)
```

---

## Performance Optimization

### REQ-CONV-014: Conversation Batching

The system SHALL manage LLM usage:

```typescript
interface ConversationBatching {
  // Priorities
  playerConversations: "immediate";
  activeAgentConversations: "high";
  backgroundConversations: "abstracted";

  // Limits
  maxConcurrentFullConversations: number;  // 2-3
  maxExchangesPerTick: number;             // 5-10

  // Caching
  responseCache: Map<string, CachedResponse>;
  personalityPromptCache: Map<string, string>;
}
```

```
WHEN many conversations would occur simultaneously
THEN the system SHALL:
  1. Prioritize player-involved conversations
  2. Process key agent conversations fully
  3. Abstract background conversations
  4. Queue non-urgent conversations for later
  5. Combine similar exchanges where possible
```

---

## Alien Communication Modes

### REQ-CONV-015: Non-Verbal Communication

Agents with non-verbal primary communication SHALL converse differently:

```typescript
interface NonVerbalConversation extends Conversation {
  communicationMode: CommunicationMode;

  // Mode-specific properties
  chromaticData?: ChromaticExchange;
  pheromoneData?: PheromoneExchange;
  telepathicData?: TelepathicExchange;

  // Cross-mode translation
  translator?: string;             // Agent ID if translation needed
  translationAccuracy: number;     // 0-1 how accurate
}

interface ChromaticExchange {
  patterns: ColorPattern[];
  emotionLeakage: boolean;         // Involuntary emotion display
  visibilityRadius: number;        // Who can see
  darknessImpaired: boolean;       // Cannot communicate in dark
}

interface PheromoneExchange {
  scents: PheromoneSignal[];
  persistence: number;             // How long signals linger
  windAffected: boolean;           // Dispersal by wind
  speciesSpecific: boolean;        // Only same species can read
}

interface TelepathicExchange {
  range: number;                   // Mental range
  depth: "surface" | "full";       // Thoughts vs complete sharing
  privacyPossible: boolean;        // Can shield thoughts
  emotionalBleed: boolean;         // Emotions transfer involuntarily
}
```

```
WHEN agents with different primary communication modes interact
THEN the system SHALL:
  1. Determine compatibility (see species-system.md)
  2. If compatible: proceed with mutual mode
  3. If incompatible: check for translator
  4. If translator: route through intermediary with accuracy loss
  5. If no translator: limited communication (gestures, pointing)

Communication compatibility table:
  | Mode 1      | Mode 2      | Compatible? |
  |-------------|-------------|-------------|
  | verbal      | verbal      | Yes         |
  | verbal      | chromatic   | Learnable   |
  | verbal      | pheromone   | No          |
  | chromatic   | chromatic   | Yes         |
  | telepathic  | any         | One-way     |
  | polyphonic  | individual  | No          |
```

### REQ-CONV-016: Multi-Body Conversations

Pack minds and multi-body entities SHALL converse as single agents:

```typescript
interface PackMindConversation extends Conversation {
  // The pack counts as ONE participant
  packParticipant: {
    packId: string;
    bodiesPresent: string[];       // Which bodies are here
    speakerBodies: string[];       // Which are actively speaking
    coherence: number;             // How unified the pack currently is
  };

  // Multi-body effects
  parallelStatements: boolean;     // Can say multiple things at once
  surroundingEffect: boolean;      // Bodies can surround listener
  intimidationBonus: number;       // Multiple bodies = intimidating
}

// How pack minds communicate
interface PackSpeech {
  type: "unified" | "chorus" | "sequential" | "debate";

  // Unified: All bodies speak as one
  // Chorus: Bodies harmonize/reinforce message
  // Sequential: Each body adds to message
  // Debate: Bodies disagree (internal conflict visible)
}
```

```
WHEN a pack mind converses
THEN the system SHALL:
  1. Treat the entire pack as ONE conversant
  2. Allow parallel speech (multiple statements per turn)
  3. Display internal agreement/disagreement
  4. Adjust intimidation/persuasion based on body count
  5. Handle partial pack (some bodies absent)

IF pack loses coherence during conversation
THEN:
  - Speech becomes confused/contradictory
  - Other participants may be alarmed
  - Pack may need to pause to re-cohere
```

### REQ-CONV-017: Polyphonic Communication

Dual-voice species SHALL require special handling:

```typescript
interface PolyphonicConversation extends Conversation {
  // Speaker requirements
  speakerVoiceCount: number;       // 2 for Ariekei-style

  // Who can participate
  validSpeakers: PolyphonicSpeaker[];

  // Truth binding (if applicable)
  truthBound: boolean;
  hypotheticalPossible: boolean;
}

type PolyphonicSpeaker =
  | { type: "native"; id: string }           // Native speaker
  | { type: "symbiont"; hostId: string }     // Trill-like joined being
  | { type: "pack_mind"; packId: string }    // Pack using two bodies
  | { type: "bonded_pair"; agents: [string, string] }  // Trained pair
  | { type: "ai_mediated"; deviceId: string };  // Tech solution

// Bonded pair communication
interface BondedPairSpeech {
  agent1: string;
  agent2: string;
  synchronization: number;         // How well-practiced (0-1)

  // Desync effects
  desyncThreshold: number;         // When speech fails
  desyncConsequences: string[];    // What happens on failure
}
```

```
WHEN communicating with polyphonic species
THEN the system SHALL:
  1. Verify speaker is valid (can produce required voices)
  2. If bonded pair: check synchronization level
  3. If desync occurs: communication fails or distorts
  4. If truth-bound: prevent false statements

Failure modes:
  - Single voice: Produces noise, not language
  - Desynchronized: Garbled meaning
  - Lying attempt (truth-bound): Speaker cannot produce sound
```

### REQ-CONV-018: Incomprehensible Entity Communication

Communication with incomprehensible aliens SHALL require intermediaries:

```typescript
interface IncomprehensibleConversation {
  alienEntity: string;             // The incomprehensible being
  translator: string;              // Modified being that can interface
  normalParticipant: string;       // Regular agent

  // Translation layers
  translationChain: TranslationStep[];
  meaningLoss: number;             // Cumulative accuracy loss
  sanityRisk: number;              // Risk to translator
}

interface TranslationStep {
  from: string;
  to: string;
  accuracy: number;
  delay: number;                   // Time to translate
  sideEffects: string[];           // What might go wrong
}

// Translator strain
interface TranslatorStrain {
  currentSanity: number;
  sanityLossPerExchange: number;
  breakdownEffects: string[];
  recoveryMethod: string;
}
```

```
WHEN a normal agent needs to communicate with an incomprehensible entity
THEN the system SHALL:
  1. Require valid translator present
  2. Apply translation chain with accuracy loss
  3. Add delay per translation step
  4. Track translator sanity
  5. Generate responses that may be partially incomprehensible

Translator failure modes:
  - Mild: Vague or metaphorical translation
  - Moderate: Important details lost
  - Severe: Translator incapacitated
  - Critical: Translator permanently altered
```

### REQ-CONV-019: Temporal Mismatch Conversations

Conversations between beings with different time perception:

```typescript
interface TemporalMismatchConversation {
  fastBeing: string;               // Thinks quickly
  slowBeing: string;               // Thinks slowly
  temporalRatio: number;           // How different

  // Bridging method
  method: TemporalBridge;
}

type TemporalBridge =
  | "patience"                     // Fast being waits (generations)
  | "time_compression"             // Tech speeds up slow being
  | "time_dilation"                // Tech slows fast being
  | "written_correspondence"       // Exchange written messages
  | "generational_relay"           // Passed down through generations
  | "intermediary";                // Being with middle tempo

interface GenerationalConversation {
  originalSpeaker: string;
  originalStatement: string;

  // Message passing
  relays: GenerationalRelay[];
  currentHolder: string;
  messageAge: number;              // How many generations old

  // Degradation
  originalAccuracy: number;
  currentAccuracy: number;         // Degrades over time
}

interface GenerationalRelay {
  from: string;
  to: string;
  relationship: string;            // "child", "apprentice", etc.
  accuracyLoss: number;
}
```

```
WHEN a geological-timescale being wishes to converse with humans
THEN the system SHALL:
  1. Determine if direct conversation is possible
  2. If ratio > 1000: require generational relay
  3. Track message through generations
  4. Apply accuracy degradation per relay
  5. Allow response to take in-game years

Example: Stone Eater to Human
  - Stone Eater speaks (takes 1 year human time)
  - Human records message
  - Human dies, passes to child
  - Child's grandchild finally formulates response
  - Response carved in stone
  - Stone Eater perceives response (1 minute to them)
```

### REQ-CONV-020: Pheromone Semantics

Pheromone communication has unique properties:

```typescript
interface PheromoneSemantics {
  species: string;

  // Scent vocabulary
  vocabulary: PheromoneVocabulary;

  // Physical properties
  physics: PheromonePhysics;

  // Social effects
  socialEffects: PheromoneSocialEffects;
}

interface PheromoneVocabulary {
  // Types of messages possible
  messageTypes: PheromoneMessageType[];

  // What CANNOT be communicated
  impossibleConcepts: string[];

  // Automatic/involuntary signals
  involuntarySignals: InvoluntaryPheromone[];
}

type PheromoneMessageType =
  | "alarm"                    // Danger! All can smell
  | "trail"                    // Follow this path
  | "territory"                // This space claimed
  | "mating"                   // Reproductive signals
  | "caste"                    // Identity/role marker
  | "command"                  // Queen orders (hive)
  | "food_source"              // Resource location
  | "friend_foe"               // Group membership
  | "emotional_state";         // Current mood

interface InvoluntaryPheromone {
  trigger: string;             // What causes it
  signal: string;              // What it communicates
  controllable: boolean;       // Can it be suppressed?
  consequences: string[];      // What happens if detected

  // Examples:
  // Fear pheromone: triggers on threat, signals weakness
  // Deception: if trying to lie, stress pheromone released
  // Arousal: completely involuntary, socially complicated
}

interface PheromonePhysics {
  // Environmental factors
  dispersion: {
    stillAir: number;          // Meters radius
    windAffected: boolean;     // Wind carries scent
    waterSoluble: boolean;     // Rain washes away
  };

  persistence: {
    duration: number;          // How long signal lasts
    markingBehavior: boolean;  // Can deliberately mark
    territoryDuration: number; // How long marks last
  };

  // Limitations
  crowdConfusion: boolean;     // Many scents = unreadable
  distanceLimit: number;       // Max range
  darkCompatible: true;        // Works in darkness (advantage)
}

interface PheromoneSocialEffects {
  // What pheromones reveal
  revealsEmotions: boolean;    // Can't hide feelings
  revealsCaste: boolean;       // Social position obvious
  revealsHealth: boolean;      // Illness detectable
  revealsLies: boolean;        // Stress of deception

  // Queen command pheromones (hive species)
  commandPheromones?: {
    obeyCompulsion: number;    // 0-1, how strong
    resistanceCheck: string;   // What allows resistance
    rangeLimit: number;        // How far commands reach
  };

  // Mating complications
  matingPheromones: {
    seasonalOnly: boolean;
    crossSpeciesEffect: string; // How affects other species
    sociallyComplex: string;   // Cultural taboos around
  };
}
```

```
WHEN pheromone-based species communicates
THEN the system SHALL:
  1. Check environmental conditions (wind, rain)
  2. Calculate effective range
  3. Apply involuntary signals (can't hide emotions)
  4. Determine who can perceive (species-specific?)
  5. Track persistence (old scents still present)

Pheromone conversation implications:
  - Cannot lie effectively (stress pheromone detected)
  - Cannot hide attraction/fear/anger
  - Caste/rank always visible
  - Group membership always known
  - Privacy essentially doesn't exist

Cross-species pheromone issues:
  - Humans can't perceive → communication gap
  - Humans' smell perceived as information
  - Human hygiene products may be "offensive"
  - Perfume = "shouting randomly" to them
```

### REQ-CONV-021: Telepathic Mechanics

Telepathic communication has distinct rules:

```typescript
interface TelepathicMechanics {
  species: string;
  telepathyType: TelepathyType;

  // Range and power
  capabilities: TelepathicCapabilities;

  // Privacy and ethics
  privacyRules: TelepathicPrivacy;

  // Dangers
  risks: TelepathicRisks;
}

type TelepathyType =
  | "broadcast"               // Everyone hears (can't target)
  | "directed"                // Can target individuals
  | "network"                 // Connected to specific minds
  | "touch"                   // Requires physical contact
  | "emotional"               // Feelings only, not thoughts
  | "full";                   // Complete thought sharing

interface TelepathicCapabilities {
  range: {
    minimum: number;          // 0 = touch required
    maximum: number;          // Meters, or "planetary"
    degradation: string;      // How quality drops with distance
  };

  depth: {
    surface: boolean;         // Can read surface thoughts
    deep: boolean;            // Can read memories
    emotional: boolean;       // Can sense feelings
    motor: boolean;           // Can control actions (rare, dangerous)
  };

  bandwidth: {
    simultaneousConnections: number;  // How many at once
    informationRate: string;          // Fast/slow transfer
    fatigue: number;                  // Cost of extended use
  };
}

interface TelepathicPrivacy {
  // Natural defenses
  shielding: {
    possible: boolean;        // Can minds be shielded?
    innate: boolean;          // Born with shields?
    trainable: boolean;       // Can learn to shield?
    breakable: boolean;       // Can shields be forced?
  };

  // Cultural norms
  ethics: {
    consentRequired: boolean; // Cultural expectation
    depthLimits: string;      // How deep is acceptable
    privateSpheres: string[]; // Topics not to probe
  };

  // Involuntary leakage
  bleed: {
    emotionalBleed: boolean;  // Emotions leak
    thoughtBleed: boolean;    // Stray thoughts leak
    dreamBleed: boolean;      // During sleep
  };
}

interface TelepathicRisks {
  // Overload
  tooMany: {
    crowdNoise: boolean;      // Many minds = overwhelming
    threshold: number;        // How many causes problems
    symptoms: string[];       // Headaches, madness
  };

  // Deep contact
  intimacy: {
    personalityBleed: boolean;  // Prolonged contact = merging
    memoryCrossover: boolean;   // Shared memories
    addictive: boolean;         // Deep contact craved
  };

  // Death contact
  deathLink: {
    feelDeath: boolean;       // Sense connected mind dying
    traumatic: boolean;       // How damaging
    recoveryTime: number;     // How long to recover
  };

  // Hostile use
  attack: {
    mentalAttackPossible: boolean;
    defenseMethod: string;
    damagePermanent: boolean;
  };
}
```

```
WHEN telepathic communication occurs
THEN the system SHALL:
  1. Verify range and connection
  2. Apply consent checks (cultural)
  3. Calculate bandwidth (what can transfer)
  4. Apply bleed effects (involuntary sharing)
  5. Track fatigue cost
  6. Check for overload (too many connections)

Telepathic conversation properties:
  - Faster than speech
  - Emotions accompany thoughts (unavoidably)
  - Lying is very difficult (thought vs words visible)
  - Intimacy develops faster
  - Privacy is different (shields, not doors)

Telepathic vs non-telepathic species:
  - Telepath perceives non-telepath as "loud" (unshielded)
  - Non-telepath vulnerable (can't shield)
  - Non-telepath can't "hear" telepathic speech
  - Trust issues (telepath could read without consent)
  - Diplomatic complications (secrets not safe)
```

### REQ-CONV-022: Hive Communication

Hive mind internal communication is not conversation:

```typescript
interface HiveCommunication {
  hiveId: string;

  // Internal communication (not conversation)
  internal: {
    type: "instant_knowledge_sharing";
    // Workers don't "talk" - they know what hive knows
    // Queen doesn't "order" - she thinks and they act

    latency: number;          // Delay across distance
    bandwidth: "unlimited";   // Within hive, perfect sharing
    privacy: "none";          // All thoughts shared
  };

  // External communication
  external: {
    // Hive can only talk through designated speakers
    speakers: string[];       // Which workers can speak externally

    // Speaker limitations
    speakerAutonomy: number;  // How much they can improvise
    speakerPurpose: string;   // Mouthpiece only? Or negotiator?

    // Queen direct communication
    queenSpeaks: boolean;     // Does queen ever communicate directly?
    queenProtocol: string;    // If so, what's required?
  };

  // Cross-hive communication
  interHive: {
    possible: boolean;        // Can hives communicate?
    method: string;           // How (border workers, queen meeting)
    frequency: string;        // How often
    trustLevel: number;       // Inter-hive relations
  };
}
```

```
WHEN a hive mind communicates externally
THEN the system SHALL:
  1. Route through designated speaker
  2. Speaker has limited autonomy (follows hive will)
  3. Responses require queen approval (delay)
  4. "Private" conversation not possible
  5. What one worker hears, hive knows

Hive communication peculiarities:
  - "I" = the entire hive
  - Individual worker's opinions don't matter
  - Negotiation is with the hive mind, not the body present
  - Killing the speaker doesn't stop the conversation
  - The hive never "forgets" anything said to it
```

### REQ-CONV-023: Cross-Species Social Signals

Non-human social cues SHALL be tracked:

```typescript
interface CrossSpeciesSocialSignals {
  species: string;

  // What this species reads
  recognizedSignals: string[];

  // What might be misinterpreted
  misinterpretedSignals: SignalMisinterpretation[];

  // What they cannot perceive
  invisibleSignals: string[];
}

interface SignalMisinterpretation {
  humanSignal: string;
  alienInterpretation: string;
  consequence: string;

  // Examples:
  // Smile → Baring teeth → Aggression
  // Eye contact → Dominance challenge → Insult
  // Handshake → Weapon check → Distrust
}
```

```
WHEN agents from different species converse
THEN the system SHALL:
  1. Check for signal misinterpretations
  2. Apply relationship penalty for unintended insults
  3. Allow learning over time (repeated contact)
  4. Track cultural adaptation progress

Cultural learning:
  - First contact: High misinterpretation rate
  - Extended contact: Gradual understanding
  - Cultural training: Accelerated learning
  - Some signals: Never learnable (biology-based)
```

---

## Open Questions

1. Voice/audio representation of conversations?
2. Language barriers between villages?
3. Written communication (letters, notes)?
4. Eavesdropping mechanics?
5. Conversation logs for player review?
6. How to visually represent non-verbal communication to player?
7. Can player use bonded-pair speech with an NPC partner?

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent personalities, social skills
- `agent-system/needs.md` - Social needs satisfaction
- `agent-system/memory-system.md` - Conversation memories
- `agent-system/species-system.md` - Communication modes, alien psychology

**Knowledge Systems:**
- `agent-system/spatial-memory.md` - Location sharing
- `agent-system/chroniclers.md` - Story gathering, news spreading

**Social Systems:**
- `agent-system/relationship-system.md` - Relationship effects
- `economy-system/spec.md` - Trade negotiations
