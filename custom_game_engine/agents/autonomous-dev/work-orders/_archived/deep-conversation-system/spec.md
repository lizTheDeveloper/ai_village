# Deep Conversation System Specification

> **Goal**: Transform socialization from a simple need into a rich system where agents seek meaningful conversations about topics they care about, find compatible conversation partners, and develop deeper social bonds through shared interests and knowledge exchange.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Design Philosophy](#design-philosophy)
3. [Phase 1: Interests Foundation](#phase-1-interests-foundation)
4. [Phase 2: Conversation Depth Model](#phase-2-conversation-depth-model)
5. [Phase 3: Intelligent Partner Selection](#phase-3-intelligent-partner-selection)
6. [Phase 4: Age-Based Conversation Evolution](#phase-4-age-based-conversation-evolution)
7. [Phase 5: LLM Prompt Integration](#phase-5-llm-prompt-integration)
8. [Phase 6: Emergent Social Dynamics](#phase-6-emergent-social-dynamics)
9. [Implementation Order & Dependencies](#implementation-order--dependencies)

---

## Current State Analysis

### What Exists

#### NeedsComponent (`packages/core/src/components/NeedsComponent.ts`)

```typescript
interface Needs {
  hunger: number;      // 0-1 scale
  energy: number;      // 0-1 scale
  social: number;      // 0-1 scale - EXISTS but underutilized
  comfort: number;     // 0-1 scale
  safety: number;      // 0-1 scale
}
```

**Issues:**
- `social` need exists but **never decays** in NeedsSystem
- `isLonely(needs)` helper checks `social < 0.3` but nothing uses it
- All conversations satisfy social need equally regardless of quality

#### ConversationComponent (`packages/core/src/components/ConversationComponent.ts`)

```typescript
interface ConversationComponent {
  partnerId: EntityId | null;
  messages: ConversationMessage[];
  maxMessages: number;        // Default 20
  startedAt: Tick;
  lastMessageAt: Tick;
  isActive: boolean;
}
```

**Issues:**
- No topic tracking
- No quality/depth metrics
- No satisfaction tracking post-conversation

#### PersonalityComponent (`packages/core/src/components/PersonalityComponent.ts`)

```typescript
interface PersonalityComponent {
  // Big Five
  openness: number;           // 0-1
  conscientiousness: number;  // 0-1
  extraversion: number;       // 0-1
  agreeableness: number;      // 0-1
  neuroticism: number;        // 0-1

  // Game traits
  workEthic: number;
  creativity: number;
  generosity: number;
  leadership: number;
  spirituality: number;
}
```

**Opportunity:** `spirituality` and `openness` are natural drivers for interest in deeper topics.

#### RelationshipComponent (`packages/core/src/components/RelationshipComponent.ts`)

```typescript
interface Relationship {
  targetId: EntityId;
  familiarity: number;        // 0-100
  affinity: number;           // -100 to 100
  trust: number;              // 0-100
  lastInteraction: Tick;
  interactionCount: number;
  sharedMemories: number;
  sharedMeals: number;
  perceivedSkills: PerceivedSkill[];
}
```

**Opportunity:** `sharedMemories` could track topic-specific sharing. `perceivedSkills` already exists for knowing what others are good at.

#### SocialMemoryComponent (`packages/core/src/components/SocialMemoryComponent.ts`)

```typescript
interface SocialMemory {
  agentId: string;
  overallSentiment: number;   // -1 to 1
  trust: number;              // 0 to 1
  impressions: Impression[];
  significantMemories: string[];
  relationshipType: string;   // 'friend', 'rival', 'stranger'
  knownFacts: KnownFact[];
}
```

**Opportunity:** `knownFacts` could include "interested in [topic]" facts learned through conversation.

#### TalkBehavior (`packages/core/src/behavior/behaviors/TalkBehavior.ts`)

```typescript
// Current partner selection
if (behaviorState.partnerId === 'nearest') {
  // Find closest agent with Conversation component not in conversation
}

// Current conversation content
const CASUAL_MESSAGES = [
  'Hello!',
  'How are you?',
  'Nice weather today.',
  'Have you seen any food around?',
  'I was just wandering.'
];
```

**Issues:**
- Partner selection is purely proximity-based
- No topic-driven conversation initiation
- Fixed casual messages are shallow

#### StructuredPromptBuilder (`packages/llm/src/StructuredPromptBuilder.ts`)

Current conversation prompt context:
```typescript
// Active Conversation section includes:
// - Partner name
// - Last 5 messages
// - Instruction: "You're in a conversation with [Name]. Read the conversation history above and respond naturally."
```

**Issues:**
- No partner personality/interests in context
- No shared interest highlighting
- No topic suggestions
- No age-appropriate guidance

#### CommunicationSystem (`packages/core/src/systems/CommunicationSystem.ts`)

- Enforces 15-second conversation limit
- Emits `conversation:ended` event with duration
- No quality metrics captured

#### MoodSystem (`packages/core/src/systems/MoodSystem.ts`)

```typescript
// Conversation impact
case 'conversation:started':
  this.addMoodFactor(entity, 'social', 5, 0.98);
  // +5 mood, same for all conversations
```

**Issue:** All conversations have equal mood impact regardless of depth/quality.

---

## Design Philosophy

### Core Principles

1. **Interests are earned, not assigned**: Interests emerge from skills, experiences, childhood, and personality - not random generation.

2. **Depth hunger accumulates**: The longer you go without a meaningful conversation about something you care about, the more you want it.

3. **Quality over quantity**: A deep conversation with a kindred spirit is worth more than ten shallow greetings.

4. **Age shapes conversation**: Children ask questions, adults share knowledge, elders reflect and tell stories.

5. **Knowledge flows through conversation**: Conversations are how agents learn about each other's interests, creating social knowledge networks.

6. **Emergent friendship**: True friends emerge when agents consistently satisfy each other's conversational needs.

---

## Phase 1: Interests Foundation

### New Component: InterestsComponent

**File:** `packages/core/src/components/InterestsComponent.ts`

```typescript
import { ComponentBase } from './ComponentBase.js';

/**
 * Topics that agents can have interests in.
 * Organized into categories for easier management.
 */
export enum TopicCategory {
  CRAFT = 'craft',           // Skills and making things
  NATURE = 'nature',         // Natural world
  PHILOSOPHY = 'philosophy', // Deep questions
  SOCIAL = 'social',         // People and relationships
  PRACTICAL = 'practical',   // Daily life
  STORY = 'story',           // Narratives and history
}

/**
 * Specific topics within categories.
 * Maps to skills, experiences, and personality traits.
 */
export type TopicId =
  // Craft topics (from skills)
  | 'woodworking'
  | 'stonecraft'
  | 'farming'
  | 'cooking'
  | 'building'
  | 'foraging'
  | 'hunting'
  | 'craftsmanship'  // General making things

  // Nature topics
  | 'trees_and_forests'
  | 'weather'
  | 'animals'
  | 'plants'
  | 'seasons'
  | 'landscape'

  // Philosophy topics (personality-driven)
  | 'afterlife'
  | 'meaning_of_life'
  | 'mortality'
  | 'dreams'
  | 'the_gods'
  | 'fate_and_destiny'
  | 'right_and_wrong'

  // Social topics
  | 'family'
  | 'friendship'
  | 'village_gossip'
  | 'romance'
  | 'conflict'

  // Practical topics
  | 'food'
  | 'shelter'
  | 'work'
  | 'health'

  // Story topics
  | 'myths_and_legends'
  | 'village_history'
  | 'personal_stories'
  | 'adventures';

/**
 * How an interest was acquired.
 */
export type InterestSource =
  | 'innate'           // Born with it (high openness → curiosity topics)
  | 'skill'            // Developed through skill practice
  | 'childhood'        // Childhood experience
  | 'experience'       // Life event (witnessing death → afterlife)
  | 'learned'          // Learned from conversation
  | 'question';        // Child's natural curiosity

/**
 * A single interest an agent has.
 */
export interface Interest {
  topic: TopicId;
  category: TopicCategory;

  /**
   * How intensely they care about this topic.
   * 0.0 = mild interest
   * 0.5 = moderate interest
   * 1.0 = passionate about this
   */
  intensity: number;

  /**
   * How the interest was acquired.
   */
  source: InterestSource;

  /**
   * Last game tick when this topic was discussed satisfactorily.
   * null if never discussed.
   */
  lastDiscussed: number | null;

  /**
   * Accumulated desire to discuss this topic.
   * Grows over time since lastDiscussed, modified by intensity.
   * 0.0 = just discussed, satisfied
   * 1.0 = strongly want to discuss this
   */
  discussionHunger: number;

  /**
   * Who they've had good conversations about this topic with.
   * EntityIds of agents who share or appreciate this interest.
   */
  knownEnthusiasts: string[];

  /**
   * For 'question' type interests (children).
   * The specific question they want answered.
   */
  question?: string;
}

/**
 * Tracks all of an agent's interests and topic-related desires.
 */
export class InterestsComponent extends ComponentBase {
  public readonly type = 'interests';

  /**
   * All interests this agent has.
   * Typically 3-8 interests per agent.
   */
  public interests: Interest[] = [];

  /**
   * Overall desire for deep/meaningful conversation.
   * Accumulates when agent only has shallow interactions.
   * 0.0 = recently had meaningful conversation
   * 1.0 = starving for depth
   */
  public depthHunger: number = 0.0;

  /**
   * Topics this agent actively dislikes discussing.
   * Will lower conversation satisfaction if forced.
   */
  public avoidTopics: TopicId[] = [];

  /**
   * Maximum interests to maintain (prevent bloat).
   */
  public maxInterests: number = 10;
}
```

### Interest Generation Rules

**File:** `packages/core/src/interests/InterestGenerator.ts`

```typescript
/**
 * Rules for generating interests from various sources.
 */

// Skill → Interest mappings
export const SKILL_TO_INTEREST: Record<string, TopicId[]> = {
  'woodcutting': ['woodworking', 'trees_and_forests'],
  'mining': ['stonecraft', 'landscape'],
  'farming': ['farming', 'plants', 'seasons'],
  'cooking': ['cooking', 'food'],
  'building': ['building', 'craftsmanship'],
  'foraging': ['foraging', 'plants', 'nature'],
  'hunting': ['hunting', 'animals'],
  'crafting': ['craftsmanship'],
};

// Personality → Interest tendencies
export const PERSONALITY_INTERESTS = {
  // High spirituality (> 0.7) → philosophy interests
  spirituality: {
    threshold: 0.7,
    topics: ['afterlife', 'the_gods', 'fate_and_destiny', 'meaning_of_life'],
    intensity_modifier: 1.2,
  },

  // High openness (> 0.7) → diverse curiosity
  openness: {
    threshold: 0.7,
    topics: ['myths_and_legends', 'dreams', 'adventures'],
    intensity_modifier: 1.0,
  },

  // High extraversion (> 0.7) → social topics
  extraversion: {
    threshold: 0.7,
    topics: ['village_gossip', 'friendship', 'family'],
    intensity_modifier: 1.1,
  },

  // High neuroticism (> 0.7) → existential concerns
  neuroticism: {
    threshold: 0.7,
    topics: ['mortality', 'meaning_of_life', 'fate_and_destiny'],
    intensity_modifier: 0.9,
  },
};

// Experience → Interest triggers
export const EXPERIENCE_INTERESTS = {
  'witnessed_death': {
    topics: ['afterlife', 'mortality'],
    intensity: 0.8,
    source: 'experience' as InterestSource,
  },
  'lost_family_member': {
    topics: ['afterlife', 'family', 'mortality'],
    intensity: 0.9,
    source: 'experience' as InterestSource,
  },
  'survived_danger': {
    topics: ['fate_and_destiny', 'the_gods'],
    intensity: 0.6,
    source: 'experience' as InterestSource,
  },
  'first_harvest': {
    topics: ['farming', 'seasons'],
    intensity: 0.5,
    source: 'experience' as InterestSource,
  },
};

// Child question generation
export const CHILD_QUESTIONS: Record<TopicId, string[]> = {
  'afterlife': [
    'Where do people go when they die?',
    'Will I see grandma again?',
    'What happens after you die?',
  ],
  'the_gods': [
    'Do the gods watch us?',
    'Why do the gods let bad things happen?',
    'Can the gods hear me?',
  ],
  'weather': [
    'Why does it rain?',
    'Where does the wind come from?',
    'Why is the sky blue?',
  ],
  'animals': [
    'Why do birds sing?',
    'Do animals have feelings?',
    'Can animals talk to each other?',
  ],
  'meaning_of_life': [
    'Why are we here?',
    'What am I supposed to do when I grow up?',
  ],
};
```

### New System: InterestsSystem

**File:** `packages/core/src/systems/InterestsSystem.ts`

```typescript
/**
 * InterestsSystem
 *
 * Responsibilities:
 * 1. Generate initial interests for new agents based on skills/personality
 * 2. Decay discussion satisfaction over time (hunger grows)
 * 3. Add new interests from experiences
 * 4. Generate child questions based on age and curiosity
 * 5. Prune low-intensity interests if at capacity
 */

export class InterestsSystem implements System {
  public readonly name = 'InterestsSystem';

  // Run every 100 ticks (~5 seconds) - interests don't need per-tick updates
  private static readonly UPDATE_INTERVAL = 100;
  private tickCounter = 0;

  // Hunger growth rates (per UPDATE_INTERVAL)
  private static readonly BASE_HUNGER_GROWTH = 0.005;      // Base rate
  private static readonly INTENSITY_MULTIPLIER = 1.5;       // High intensity = faster hunger
  private static readonly DEPTH_HUNGER_GROWTH = 0.002;      // Overall depth hunger

  update(world: World): void {
    this.tickCounter++;
    if (this.tickCounter % InterestsSystem.UPDATE_INTERVAL !== 0) return;

    const entities = world.query()
      .with(CT.Interests)
      .with(CT.Agent)
      .executeEntities();

    for (const entity of entities) {
      const interests = entity.getComponent(CT.Interests)!;

      this.updateDiscussionHunger(interests);
      this.updateDepthHunger(interests);
      this.generateChildQuestions(entity, world);
    }
  }

  private updateDiscussionHunger(interests: InterestsComponent): void {
    for (const interest of interests.interests) {
      // Hunger grows faster for more intense interests
      const growthRate = InterestsSystem.BASE_HUNGER_GROWTH *
        (1 + interest.intensity * InterestsSystem.INTENSITY_MULTIPLIER);

      interest.discussionHunger = Math.min(1.0,
        interest.discussionHunger + growthRate);
    }
  }

  private updateDepthHunger(interests: InterestsComponent): void {
    // If no interests have been satisfied recently, depth hunger grows
    const recentlySatisfied = interests.interests.some(i =>
      i.discussionHunger < 0.3);

    if (!recentlySatisfied) {
      interests.depthHunger = Math.min(1.0,
        interests.depthHunger + InterestsSystem.DEPTH_HUNGER_GROWTH);
    }
  }

  private generateChildQuestions(entity: Entity, world: World): void {
    const agent = entity.getComponent(CT.Agent)!;
    const interests = entity.getComponent(CT.Interests)!;
    const personality = entity.getComponent(CT.Personality);

    // Only children generate questions
    if (agent.ageCategory !== 'child') return;

    // High openness children ask more questions
    const curiosityFactor = personality?.openness ?? 0.5;
    if (Math.random() > curiosityFactor * 0.1) return; // ~5-10% chance per interval

    // Already has enough questions?
    const questionCount = interests.interests.filter(i =>
      i.source === 'question').length;
    if (questionCount >= 3) return;

    // Pick a random topic appropriate for children
    const childTopics: TopicId[] = [
      'afterlife', 'the_gods', 'weather', 'animals',
      'meaning_of_life', 'dreams'
    ];
    const topic = childTopics[Math.floor(Math.random() * childTopics.length)];

    // Don't duplicate topics
    if (interests.interests.some(i => i.topic === topic)) return;

    // Generate the question
    const questions = CHILD_QUESTIONS[topic];
    if (!questions) return;

    const question = questions[Math.floor(Math.random() * questions.length)];

    interests.interests.push({
      topic,
      category: this.getTopicCategory(topic),
      intensity: 0.6 + Math.random() * 0.3, // Children are earnest
      source: 'question',
      lastDiscussed: null,
      discussionHunger: 0.5, // Start with some curiosity
      knownEnthusiasts: [],
      question,
    });
  }
}
```

### Integration: Generate Interests on Agent Creation

**Modify:** `packages/core/src/agents/AgentFactory.ts` (or wherever agents are created)

```typescript
// After creating agent with skills and personality...

function generateInitialInterests(
  skills: SkillsComponent,
  personality: PersonalityComponent,
  age: AgeCategory
): InterestsComponent {
  const interests = new InterestsComponent();

  // 1. Skill-based interests
  for (const [skillName, level] of Object.entries(skills.skills)) {
    if (level > 20) { // Meaningful skill level
      const topics = SKILL_TO_INTEREST[skillName];
      if (topics) {
        for (const topic of topics) {
          addOrEnhanceInterest(interests, {
            topic,
            intensity: Math.min(1.0, level / 100), // Scales with skill
            source: 'skill',
          });
        }
      }
    }
  }

  // 2. Personality-based interests
  for (const [trait, config] of Object.entries(PERSONALITY_INTERESTS)) {
    const traitValue = personality[trait as keyof PersonalityComponent];
    if (typeof traitValue === 'number' && traitValue > config.threshold) {
      // Pick 1-2 topics from this trait's list
      const count = 1 + Math.floor(Math.random() * 2);
      const shuffled = [...config.topics].sort(() => Math.random() - 0.5);

      for (let i = 0; i < count && i < shuffled.length; i++) {
        addOrEnhanceInterest(interests, {
          topic: shuffled[i] as TopicId,
          intensity: (traitValue - config.threshold) * config.intensity_modifier,
          source: 'innate',
        });
      }
    }
  }

  // 3. Age-based adjustments
  if (age === 'child') {
    // Children have lower intensity but more curiosity
    for (const interest of interests.interests) {
      interest.intensity *= 0.7;
    }
    // Add a starting question
    // ... (handled by InterestsSystem over time)
  } else if (age === 'elder') {
    // Elders have stronger opinions
    for (const interest of interests.interests) {
      interest.intensity = Math.min(1.0, interest.intensity * 1.2);
    }
  }

  return interests;
}
```

---

## Phase 2: Conversation Depth Model

### Modify: NeedsComponent

**File:** `packages/core/src/components/NeedsComponent.ts`

```typescript
export interface Needs {
  hunger: number;
  energy: number;
  comfort: number;
  safety: number;

  // REVISED: Split social into components
  social: number;              // Keep for backwards compatibility (average of below)
  socialContact: number;       // "I want to talk to someone" - satisfied by any chat
  socialDepth: number;         // "I want a meaningful conversation" - satisfied by depth
  socialBelonging: number;     // "I feel part of the community" - satisfied by group
}

// Helper functions
export function isLonely(needs: Needs): boolean {
  return needs.socialContact < 0.3;
}

export function cravesDepth(needs: Needs): boolean {
  return needs.socialDepth < 0.4;
}

export function feelsIsolated(needs: Needs): boolean {
  return needs.socialBelonging < 0.3;
}

// Composite social score for backwards compatibility
export function calculateSocialNeed(needs: Needs): number {
  return (needs.socialContact + needs.socialDepth + needs.socialBelonging) / 3;
}
```

### New: Conversation Quality Metrics

**File:** `packages/core/src/conversation/ConversationQuality.ts`

```typescript
/**
 * Metrics for evaluating conversation quality.
 * Calculated during and after conversations.
 */
export interface ConversationQuality {
  /**
   * Was this a meaningful exchange or just pleasantries?
   * 0.0 = pure small talk ("nice weather")
   * 1.0 = deep philosophical discussion
   */
  depth: number;

  /**
   * Did they discuss topics both agents care about?
   * Based on shared interests between participants.
   */
  topicResonance: number;

  /**
   * Was new information exchanged?
   * Facts, knowledge, memories shared.
   */
  informationExchange: number;

  /**
   * Emotional engagement in the conversation.
   * Based on sentiment analysis of messages.
   */
  emotionalConnection: number;

  /**
   * Length factor - longer conversations tend to be better.
   * But normalized to prevent gaming.
   */
  durationFactor: number;

  /**
   * Topics that were discussed.
   */
  topicsDiscussed: TopicId[];

  /**
   * Overall quality score (weighted average).
   */
  overallQuality: number;
}

/**
 * Calculate conversation quality after it ends.
 */
export function calculateConversationQuality(
  messages: ConversationMessage[],
  participant1Interests: Interest[],
  participant2Interests: Interest[],
  durationTicks: number
): ConversationQuality {
  // Analyze messages for depth indicators
  const depth = analyzeDepth(messages);

  // Find shared interests and check if they were discussed
  const sharedTopics = findSharedInterests(participant1Interests, participant2Interests);
  const topicsDiscussed = extractTopicsFromMessages(messages);
  const topicResonance = calculateTopicOverlap(sharedTopics, topicsDiscussed);

  // Check for information sharing patterns
  const informationExchange = analyzeInformationExchange(messages);

  // Sentiment analysis for emotional connection
  const emotionalConnection = analyzeEmotionalContent(messages);

  // Duration factor (diminishing returns after ~10 messages)
  const durationFactor = Math.min(1.0, messages.length / 10);

  // Weighted overall score
  const overallQuality =
    depth * 0.3 +
    topicResonance * 0.25 +
    informationExchange * 0.2 +
    emotionalConnection * 0.15 +
    durationFactor * 0.1;

  return {
    depth,
    topicResonance,
    informationExchange,
    emotionalConnection,
    durationFactor,
    topicsDiscussed,
    overallQuality,
  };
}

/**
 * Depth indicators in conversation messages.
 */
const DEPTH_INDICATORS = {
  shallow: [
    /^hello/i,
    /nice weather/i,
    /how are you/i,
    /^hi$/i,
    /good morning/i,
  ],
  medium: [
    /I think/i,
    /I feel/i,
    /have you noticed/i,
    /remember when/i,
    /I wonder/i,
  ],
  deep: [
    /meaning/i,
    /believe/i,
    /purpose/i,
    /death|die|dying/i,
    /soul/i,
    /god|gods|divine/i,
    /truth/i,
    /why do we/i,
    /what happens when/i,
    /afterlife/i,
  ],
};

function analyzeDepth(messages: ConversationMessage[]): number {
  let score = 0.5; // Start neutral

  for (const msg of messages) {
    const text = msg.message;

    // Check for shallow indicators (decrease depth)
    for (const pattern of DEPTH_INDICATORS.shallow) {
      if (pattern.test(text)) score -= 0.05;
    }

    // Check for medium depth (slight increase)
    for (const pattern of DEPTH_INDICATORS.medium) {
      if (pattern.test(text)) score += 0.08;
    }

    // Check for deep indicators (significant increase)
    for (const pattern of DEPTH_INDICATORS.deep) {
      if (pattern.test(text)) score += 0.15;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Topic keywords for detection in messages.
 */
const TOPIC_KEYWORDS: Record<TopicId, RegExp[]> = {
  'afterlife': [/afterlife/i, /after death/i, /heaven/i, /spirit world/i],
  'mortality': [/death/i, /dying/i, /mortal/i, /life.*short/i],
  'the_gods': [/god/i, /gods/i, /divine/i, /pray/i, /blessing/i],
  'farming': [/farm/i, /crop/i, /harvest/i, /plant/i, /seed/i],
  'woodworking': [/wood/i, /tree/i, /carve/i, /lumber/i, /axe/i],
  'family': [/family/i, /mother/i, /father/i, /child/i, /parent/i],
  'weather': [/weather/i, /rain/i, /sun/i, /storm/i, /cloud/i],
  // ... etc
};

function extractTopicsFromMessages(messages: ConversationMessage[]): TopicId[] {
  const found = new Set<TopicId>();

  for (const msg of messages) {
    for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
      for (const pattern of patterns) {
        if (pattern.test(msg.message)) {
          found.add(topic as TopicId);
        }
      }
    }
  }

  return Array.from(found);
}
```

### Modify: CommunicationSystem

**File:** `packages/core/src/systems/CommunicationSystem.ts`

```typescript
// After conversation ends, calculate and apply quality

private endConversation(
  entity1: Entity,
  entity2: Entity,
  world: World
): void {
  const conv1 = entity1.getComponent(CT.Conversation)!;
  const conv2 = entity2.getComponent(CT.Conversation)!;

  const interests1 = entity1.getComponent(CT.Interests);
  const interests2 = entity2.getComponent(CT.Interests);

  const duration = world.currentTick - conv1.startedAt;

  // Calculate quality
  const quality = calculateConversationQuality(
    conv1.messages,
    interests1?.interests ?? [],
    interests2?.interests ?? [],
    duration
  );

  // Apply satisfaction based on quality
  this.applySatisfaction(entity1, entity2, quality, world);
  this.applySatisfaction(entity2, entity1, quality, world);

  // Update interest hunger for discussed topics
  if (interests1) {
    this.satisfyTopicHunger(interests1, quality.topicsDiscussed, quality.depth);
  }
  if (interests2) {
    this.satisfyTopicHunger(interests2, quality.topicsDiscussed, quality.depth);
  }

  // Emit enhanced event
  world.events.emit('conversation:ended', {
    participant1: entity1.id,
    participant2: entity2.id,
    duration,
    quality,
    topicsDiscussed: quality.topicsDiscussed,
  });

  // Clear conversation state
  conv1.isActive = false;
  conv2.isActive = false;
}

private applySatisfaction(
  entity: Entity,
  partner: Entity,
  quality: ConversationQuality,
  world: World
): void {
  const needs = entity.getComponent(CT.Needs);
  const interests = entity.getComponent(CT.Interests);

  if (needs) {
    // Contact need always satisfied by any conversation
    needs.socialContact = Math.min(1.0, needs.socialContact + 0.3);

    // Depth satisfaction based on conversation quality
    const depthSatisfaction = quality.overallQuality * 0.4;
    needs.socialDepth = Math.min(1.0, needs.socialDepth + depthSatisfaction);

    // Update composite
    needs.social = calculateSocialNeed(needs);
  }

  if (interests) {
    // Reduce depth hunger based on quality
    const hungerReduction = quality.overallQuality * 0.5;
    interests.depthHunger = Math.max(0, interests.depthHunger - hungerReduction);
  }
}

private satisfyTopicHunger(
  interests: InterestsComponent,
  topicsDiscussed: TopicId[],
  depth: number
): void {
  for (const interest of interests.interests) {
    if (topicsDiscussed.includes(interest.topic)) {
      // This topic was discussed - reduce hunger based on depth
      const satisfaction = depth * 0.7; // Deep discussion = more satisfaction
      interest.discussionHunger = Math.max(0,
        interest.discussionHunger - satisfaction);
      interest.lastDiscussed = world.currentTick;
    }
  }
}
```

### Modify: MoodSystem

**File:** `packages/core/src/systems/MoodSystem.ts`

```typescript
// Update conversation impact based on quality

case 'conversation:ended': {
  const { participant1, participant2, quality } = eventData;

  // Base mood boost for any conversation
  const baseMood = 3;

  // Quality bonus (0-7 additional mood)
  const qualityBonus = quality.overallQuality * 7;

  // Topic resonance bonus (talked about shared interests)
  const resonanceBonus = quality.topicResonance * 3;

  const totalMood = baseMood + qualityBonus + resonanceBonus;

  // Apply to both participants
  for (const participantId of [participant1, participant2]) {
    const entity = world.getEntity(participantId);
    if (entity) {
      this.addMoodFactor(entity, 'social', totalMood, 0.95);

      // Extra boost for deep conversations
      if (quality.depth > 0.7) {
        this.addMoodFactor(entity, 'fulfillment', 5, 0.98);
      }
    }
  }
  break;
}
```

---

## Phase 3: Intelligent Partner Selection

### New: PartnerSelector Utility

**File:** `packages/core/src/conversation/PartnerSelector.ts`

```typescript
/**
 * Intelligent conversation partner selection.
 * Considers interests, relationships, and conversation needs.
 */

export interface PartnerScore {
  entityId: EntityId;
  entity: Entity;
  score: number;
  reasons: string[];  // Why this partner was scored highly
}

export interface PartnerSelectionContext {
  seeker: Entity;
  candidates: Entity[];
  world: World;
}

/**
 * Score potential conversation partners for an agent.
 */
export function scorePartners(context: PartnerSelectionContext): PartnerScore[] {
  const { seeker, candidates, world } = context;

  const seekerInterests = seeker.getComponent(CT.Interests);
  const seekerRelationships = seeker.getComponent(CT.Relationship);
  const seekerNeeds = seeker.getComponent(CT.Needs);
  const seekerAgent = seeker.getComponent(CT.Agent)!;
  const seekerPos = seeker.getComponent(CT.Position)!;

  const scores: PartnerScore[] = [];

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === seeker.id) continue;

    // Skip if already in conversation
    const candidateConv = candidate.getComponent(CT.Conversation);
    if (candidateConv?.isActive) continue;

    let score = 0;
    const reasons: string[] = [];

    const candidatePos = candidate.getComponent(CT.Position)!;
    const candidateInterests = candidate.getComponent(CT.Interests);
    const candidateAgent = candidate.getComponent(CT.Agent);

    // 1. Proximity (still matters, but less dominant)
    const distance = Math.sqrt(
      Math.pow(seekerPos.x - candidatePos.x, 2) +
      Math.pow(seekerPos.y - candidatePos.y, 2)
    );
    const proximityScore = Math.max(0, 1 - distance / 20); // Max 20 tiles
    score += proximityScore * 15;
    if (proximityScore > 0.8) reasons.push('nearby');

    // 2. Shared interests
    if (seekerInterests && candidateInterests) {
      const sharedScore = calculateSharedInterestScore(
        seekerInterests,
        candidateInterests
      );
      score += sharedScore * 25;
      if (sharedScore > 0.5) reasons.push('shared interests');
    }

    // 3. Complementary knowledge (they know things I want to know)
    if (seekerInterests && candidateInterests) {
      const complementaryScore = calculateComplementaryScore(
        seekerInterests,
        candidateInterests
      );
      score += complementaryScore * 20;
      if (complementaryScore > 0.5) reasons.push('can teach me');
    }

    // 4. Relationship quality
    if (seekerRelationships) {
      const relationship = seekerRelationships.relationships.get(candidate.id);
      if (relationship) {
        const affinityScore = (relationship.affinity + 100) / 200; // Normalize to 0-1
        score += affinityScore * 20;
        if (affinityScore > 0.7) reasons.push('friend');

        // Familiarity bonus - prefer people we know
        const familiarityScore = relationship.familiarity / 100;
        score += familiarityScore * 10;
      }
    }

    // 5. Age-based preferences
    if (seekerAgent && candidateAgent) {
      const ageScore = calculateAgeCompatibility(
        seekerAgent.ageCategory,
        candidateAgent.ageCategory,
        seekerInterests
      );
      score += ageScore * 15;
      if (ageScore > 0.7) reasons.push('good age match');
    }

    // 6. Known enthusiast bonus (we've had good conversations before)
    if (seekerInterests) {
      const isEnthusiast = seekerInterests.interests.some(i =>
        i.knownEnthusiasts.includes(candidate.id)
      );
      if (isEnthusiast) {
        score += 15;
        reasons.push('known good conversationalist');
      }
    }

    scores.push({
      entityId: candidate.id,
      entity: candidate,
      score,
      reasons,
    });
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Calculate how well two agents' interests overlap.
 */
function calculateSharedInterestScore(
  interests1: InterestsComponent,
  interests2: InterestsComponent
): number {
  let sharedScore = 0;
  let possibleScore = 0;

  for (const interest1 of interests1.interests) {
    possibleScore += interest1.intensity;

    const match = interests2.interests.find(i2 =>
      i2.topic === interest1.topic);

    if (match) {
      // Both care about this topic
      sharedScore += (interest1.intensity + match.intensity) / 2;
    }
  }

  return possibleScore > 0 ? sharedScore / possibleScore : 0;
}

/**
 * Calculate if partner knows things seeker wants to learn.
 */
function calculateComplementaryScore(
  seekerInterests: InterestsComponent,
  partnerInterests: InterestsComponent
): number {
  let score = 0;

  // Find seeker's questions or high-hunger interests
  const seekerWants = seekerInterests.interests.filter(i =>
    i.source === 'question' || i.discussionHunger > 0.6
  );

  for (const want of seekerWants) {
    // Does partner have knowledge about this? (high intensity = knowledge)
    const partnerKnows = partnerInterests.interests.find(i =>
      i.topic === want.topic && i.intensity > 0.6
    );

    if (partnerKnows) {
      score += want.discussionHunger * partnerKnows.intensity;
    }
  }

  return Math.min(1, score);
}

/**
 * Age compatibility for conversation.
 */
function calculateAgeCompatibility(
  seekerAge: AgeCategory,
  partnerAge: AgeCategory,
  seekerInterests?: InterestsComponent
): number {
  // Children with questions prefer adults/elders
  if (seekerAge === 'child') {
    const hasQuestions = seekerInterests?.interests.some(i =>
      i.source === 'question');

    if (hasQuestions && (partnerAge === 'adult' || partnerAge === 'elder')) {
      return 0.9; // Children seek wisdom
    }
  }

  // Elders like sharing with anyone who'll listen
  if (seekerAge === 'elder') {
    return 0.7; // Generally happy to talk
  }

  // Adults prefer other adults for peer conversation
  if (seekerAge === 'adult' && partnerAge === 'adult') {
    return 0.8;
  }

  // Default moderate compatibility
  return 0.5;
}

/**
 * Select best conversation partner with some randomness.
 * Returns null if no suitable partner found.
 */
export function selectPartner(
  context: PartnerSelectionContext,
  randomFactor: number = 0.2
): Entity | null {
  const scores = scorePartners(context);

  if (scores.length === 0) return null;

  // Add randomness to prevent always picking the same partner
  for (const score of scores) {
    score.score += (Math.random() - 0.5) * randomFactor * score.score;
  }

  // Re-sort after randomization
  scores.sort((a, b) => b.score - a.score);

  // Pick from top 3 with weighted random selection
  const topN = scores.slice(0, 3);
  const totalScore = topN.reduce((sum, s) => sum + s.score, 0);

  if (totalScore <= 0) return topN[0]?.entity ?? null;

  let random = Math.random() * totalScore;
  for (const candidate of topN) {
    random -= candidate.score;
    if (random <= 0) return candidate.entity;
  }

  return topN[0]?.entity ?? null;
}
```

### Modify: TalkBehavior

**File:** `packages/core/src/behavior/behaviors/TalkBehavior.ts`

```typescript
// Replace simple nearest-agent logic with intelligent selection

import { selectPartner, PartnerSelectionContext } from '../../conversation/PartnerSelector.js';

// In execute():

if (behaviorState.partnerId === 'nearest' || behaviorState.partnerId === 'best') {
  // Get all agents within conversation range
  const nearbyAgents = world.query()
    .with(CT.Conversation)
    .with(CT.Position)
    .with(CT.Agent)
    .executeEntities()
    .filter(other => {
      if (other.id === entity.id) return false;
      const otherPos = other.getComponent(CT.Position)!;
      const distance = Math.sqrt(
        Math.pow(position.x - otherPos.x, 2) +
        Math.pow(position.y - otherPos.y, 2)
      );
      return distance <= CONVERSATION_RANGE;
    });

  // Use intelligent partner selection
  const context: PartnerSelectionContext = {
    seeker: entity,
    candidates: nearbyAgents,
    world,
  };

  const selectedPartner = selectPartner(context);

  if (!selectedPartner) {
    // No suitable partner found
    return { status: 'failed', reason: 'no_partner_available' };
  }

  targetPartner = selectedPartner;
} else {
  // Specific partner requested
  targetPartner = world.getEntity(behaviorState.partnerId);
}
```

---

## Phase 4: Age-Based Conversation Evolution

### Conversation Style by Age

**File:** `packages/core/src/conversation/ConversationStyle.ts`

```typescript
/**
 * Age-specific conversation behaviors and prompts.
 */

export type AgeCategory = 'child' | 'teen' | 'adult' | 'elder';

export interface ConversationStyle {
  /**
   * How this age group typically initiates conversation.
   */
  initiationStyle: string;

  /**
   * What topics they prefer.
   */
  preferredTopicCategories: TopicCategory[];

  /**
   * How they express curiosity.
   */
  curiosityExpression: 'questions' | 'exploration' | 'debate' | 'reflection';

  /**
   * LLM prompt modifier for this age.
   */
  promptGuidance: string;

  /**
   * Maximum conversation depth they can handle.
   * Children can't sustain deep philosophy; elders excel at it.
   */
  depthCapacity: number;
}

export const CONVERSATION_STYLES: Record<AgeCategory, ConversationStyle> = {
  child: {
    initiationStyle: 'eager and curious',
    preferredTopicCategories: [
      TopicCategory.NATURE,
      TopicCategory.STORY,
      TopicCategory.SOCIAL,
    ],
    curiosityExpression: 'questions',
    promptGuidance: `You are a child - curious, earnest, and full of questions.
You ask "why?" a lot. You're learning about the world and want adults to explain things.
You might share simple observations or ask about things you don't understand.
Keep responses short and childlike. Don't use complex vocabulary.`,
    depthCapacity: 0.4,
  },

  teen: {
    initiationStyle: 'testing boundaries',
    preferredTopicCategories: [
      TopicCategory.SOCIAL,
      TopicCategory.PHILOSOPHY,
      TopicCategory.STORY,
    ],
    curiosityExpression: 'debate',
    promptGuidance: `You are a teenager - forming your identity and questioning things.
You might challenge ideas, express strong opinions, or seem moody.
You're interested in what others think of you and where you fit in.
You can engage with deeper topics but may be dismissive or dramatic.`,
    depthCapacity: 0.6,
  },

  adult: {
    initiationStyle: 'practical and direct',
    preferredTopicCategories: [
      TopicCategory.PRACTICAL,
      TopicCategory.CRAFT,
      TopicCategory.SOCIAL,
      TopicCategory.PHILOSOPHY,
    ],
    curiosityExpression: 'exploration',
    promptGuidance: `You are an adult - capable, busy, but thoughtful.
You balance practical concerns with deeper interests.
You can share knowledge, discuss philosophy, and mentor younger villagers.
Your conversations might touch on work, family, or life's bigger questions.`,
    depthCapacity: 0.85,
  },

  elder: {
    initiationStyle: 'reflective and story-telling',
    preferredTopicCategories: [
      TopicCategory.PHILOSOPHY,
      TopicCategory.STORY,
      TopicCategory.NATURE,
    ],
    curiosityExpression: 'reflection',
    promptGuidance: `You are an elder - wise, reflective, and experienced.
You've seen much of life and think about its meaning.
You enjoy sharing stories, answering questions, and reflecting on the past.
You might discuss mortality, the gods, and what matters in life.
You're patient with children's questions and thoughtful in your answers.`,
    depthCapacity: 1.0,
  },
};

/**
 * Get conversation style for an agent's age.
 */
export function getConversationStyle(age: AgeCategory): ConversationStyle {
  return CONVERSATION_STYLES[age];
}

/**
 * Child question-answer dynamics.
 */
export interface QuestionAnswerDynamic {
  childId: EntityId;
  questionInterest: Interest;
  potentialAnswerers: EntityId[];  // Adults/elders who might know
}

/**
 * Find potential answerers for a child's question.
 */
export function findQuestionAnswerers(
  child: Entity,
  question: Interest,
  candidates: Entity[]
): EntityId[] {
  const answerers: EntityId[] = [];

  for (const candidate of candidates) {
    const candidateAgent = candidate.getComponent(CT.Agent);
    const candidateInterests = candidate.getComponent(CT.Interests);

    // Must be adult or elder
    if (!candidateAgent ||
        (candidateAgent.ageCategory !== 'adult' &&
         candidateAgent.ageCategory !== 'elder')) {
      continue;
    }

    // Must have knowledge about the topic (high intensity interest)
    if (candidateInterests) {
      const hasKnowledge = candidateInterests.interests.some(i =>
        i.topic === question.topic && i.intensity > 0.5
      );
      if (hasKnowledge) {
        answerers.push(candidate.id);
      }
    }
  }

  return answerers;
}
```

### Modify: AgentComponent

**File:** `packages/core/src/components/AgentComponent.ts`

```typescript
// Ensure age category is always available

export interface AgentComponent {
  // ... existing fields ...

  /**
   * Age in days.
   */
  age: number;

  /**
   * Age category for behavior/conversation purposes.
   */
  ageCategory: AgeCategory;
}

/**
 * Calculate age category from days.
 * These thresholds can be adjusted for game balance.
 */
export function getAgeCategory(ageDays: number): AgeCategory {
  if (ageDays < 5000) return 'child';      // ~13 years
  if (ageDays < 7000) return 'teen';       // 13-19 years
  if (ageDays < 20000) return 'adult';     // 19-55 years
  return 'elder';                           // 55+ years
}
```

---

## Phase 5: LLM Prompt Integration

### Modify: StructuredPromptBuilder

**File:** `packages/llm/src/StructuredPromptBuilder.ts`

```typescript
/**
 * Enhanced conversation context for LLM prompts.
 */

// In buildActiveConversationSection():

private buildActiveConversationSection(
  conversation: ConversationComponent,
  partner: Entity,
  self: Entity,
  world: World
): string {
  const sections: string[] = [];

  const partnerAgent = partner.getComponent(CT.Agent);
  const partnerInterests = partner.getComponent(CT.Interests);
  const selfInterests = self.getComponent(CT.Interests);
  const selfAgent = self.getComponent(CT.Agent);
  const relationship = self.getComponent(CT.Relationship)
    ?.relationships.get(partner.id);

  // 1. Basic partner info
  const partnerName = partnerAgent?.name ?? 'Someone';
  sections.push(`## Active Conversation with ${partnerName}`);

  // 2. Age-appropriate guidance
  if (selfAgent) {
    const style = getConversationStyle(selfAgent.ageCategory);
    sections.push(`\n### Your Conversation Style`);
    sections.push(style.promptGuidance);
  }

  // 3. Partner context (who you're talking to)
  sections.push(`\n### About ${partnerName}`);

  if (partnerAgent) {
    sections.push(`- Age: ${partnerAgent.ageCategory}`);
  }

  // Relationship context
  if (relationship) {
    const relationshipDesc = describeRelationship(relationship);
    sections.push(`- Your relationship: ${relationshipDesc}`);
  } else {
    sections.push(`- You don't know them well yet`);
  }

  // Partner's interests (what they like to talk about)
  if (partnerInterests && partnerInterests.interests.length > 0) {
    const topInterests = partnerInterests.interests
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);
    const interestNames = topInterests.map(i =>
      formatTopicName(i.topic)).join(', ');
    sections.push(`- They're interested in: ${interestNames}`);
  }

  // 4. Shared interests (conversation hooks)
  if (selfInterests && partnerInterests) {
    const shared = findSharedTopics(selfInterests, partnerInterests);
    if (shared.length > 0) {
      sections.push(`\n### Shared Interests`);
      sections.push(`You both care about: ${shared.map(formatTopicName).join(', ')}`);
    }
  }

  // 5. Your conversational desires
  if (selfInterests) {
    const hungryTopics = selfInterests.interests
      .filter(i => i.discussionHunger > 0.5)
      .sort((a, b) => b.discussionHunger - a.discussionHunger)
      .slice(0, 2);

    if (hungryTopics.length > 0) {
      sections.push(`\n### What You'd Like to Discuss`);
      for (const topic of hungryTopics) {
        if (topic.source === 'question' && topic.question) {
          sections.push(`- You've been wondering: "${topic.question}"`);
        } else {
          sections.push(`- You'd like to talk about ${formatTopicName(topic.topic)}`);
        }
      }
    }

    // Depth hunger
    if (selfInterests.depthHunger > 0.6) {
      sections.push(`\nYou're craving a meaningful conversation, not just small talk.`);
    }
  }

  // 6. Conversation history
  sections.push(`\n### Conversation So Far`);
  const recentMessages = conversation.messages.slice(-5);
  for (const msg of recentMessages) {
    const speakerName = msg.speakerId === self.id ? 'You' : partnerName;
    sections.push(`${speakerName}: "${msg.message}"`);
  }

  // 7. Response instruction
  sections.push(`\n### What do you say next?`);
  sections.push(`Respond naturally as your character would. Consider your age, ` +
    `interests, and what ${partnerName} has said. Keep your response to 1-2 sentences.`);

  return sections.join('\n');
}

/**
 * Describe a relationship in natural language.
 */
function describeRelationship(relationship: Relationship): string {
  const parts: string[] = [];

  // Familiarity
  if (relationship.familiarity > 80) {
    parts.push('close');
  } else if (relationship.familiarity > 50) {
    parts.push('familiar');
  } else if (relationship.familiarity > 20) {
    parts.push('acquaintance');
  } else {
    parts.push('stranger');
  }

  // Affinity
  if (relationship.affinity > 50) {
    parts.push('friend');
  } else if (relationship.affinity > 20) {
    parts.push('liked');
  } else if (relationship.affinity < -20) {
    parts.push('disliked');
  } else if (relationship.affinity < -50) {
    parts.push('enemy');
  }

  // Trust
  if (relationship.trust > 70) {
    parts.push('trusted');
  } else if (relationship.trust < 30) {
    parts.push('untrusted');
  }

  // Interaction count
  if (relationship.interactionCount > 20) {
    parts.push(`talked many times (${relationship.interactionCount})`);
  } else if (relationship.interactionCount > 5) {
    parts.push(`talked several times`);
  } else if (relationship.interactionCount > 0) {
    parts.push(`talked a few times`);
  }

  return parts.join(', ') || 'neutral';
}

/**
 * Format topic ID to human-readable name.
 */
function formatTopicName(topic: TopicId): string {
  return topic.replace(/_/g, ' ');
}

/**
 * Find topics both agents care about.
 */
function findSharedTopics(
  interests1: InterestsComponent,
  interests2: InterestsComponent
): TopicId[] {
  const topics1 = new Set(interests1.interests.map(i => i.topic));
  return interests2.interests
    .filter(i => topics1.has(i.topic))
    .map(i => i.topic);
}
```

---

## Phase 6: Emergent Social Dynamics

### Relationship Growth Through Conversation

**File:** `packages/core/src/systems/RelationshipConversationSystem.ts`

```typescript
/**
 * Updates relationships based on conversation quality.
 * Handles:
 * - Recording successful conversation partners for topics
 * - Building friendship through quality conversations
 * - Learning about each other's interests
 */

export class RelationshipConversationSystem implements System {
  public readonly name = 'RelationshipConversationSystem';

  init(world: World): void {
    world.events.on('conversation:ended', this.handleConversationEnded.bind(this));
  }

  private handleConversationEnded(event: ConversationEndedEvent): void {
    const { participant1, participant2, quality, topicsDiscussed } = event;

    const entity1 = this.world.getEntity(participant1);
    const entity2 = this.world.getEntity(participant2);

    if (!entity1 || !entity2) return;

    // Update relationships bidirectionally
    this.updateRelationship(entity1, entity2, quality);
    this.updateRelationship(entity2, entity1, quality);

    // Record known enthusiasts for discussed topics
    this.recordEnthusiasts(entity1, entity2, topicsDiscussed, quality);
    this.recordEnthusiasts(entity2, entity1, topicsDiscussed, quality);

    // Learn about partner's interests
    this.learnInterests(entity1, entity2, topicsDiscussed);
    this.learnInterests(entity2, entity1, topicsDiscussed);
  }

  private updateRelationship(
    self: Entity,
    partner: Entity,
    quality: ConversationQuality
  ): void {
    const relationships = self.getComponent(CT.Relationship);
    if (!relationships) return;

    let relationship = relationships.relationships.get(partner.id);

    if (!relationship) {
      // Create new relationship
      relationship = {
        targetId: partner.id,
        familiarity: 0,
        affinity: 0,
        trust: 50,
        lastInteraction: this.world.currentTick,
        interactionCount: 0,
        sharedMemories: 0,
        sharedMeals: 0,
        perceivedSkills: [],
      };
      relationships.relationships.set(partner.id, relationship);
    }

    // Update based on conversation quality
    relationship.lastInteraction = this.world.currentTick;
    relationship.interactionCount++;

    // Familiarity always increases
    relationship.familiarity = Math.min(100,
      relationship.familiarity + 2 + quality.overallQuality * 3);

    // Affinity increases with good conversations
    if (quality.overallQuality > 0.5) {
      const affinityGain = (quality.overallQuality - 0.3) * 5;
      relationship.affinity = Math.min(100,
        Math.max(-100, relationship.affinity + affinityGain));
    }

    // Trust grows with emotional connection
    if (quality.emotionalConnection > 0.5) {
      relationship.trust = Math.min(100,
        relationship.trust + quality.emotionalConnection * 3);
    }

    // Shared information counts as shared memories
    if (quality.informationExchange > 0.3) {
      relationship.sharedMemories++;
    }
  }

  private recordEnthusiasts(
    self: Entity,
    partner: Entity,
    topics: TopicId[],
    quality: ConversationQuality
  ): void {
    const interests = self.getComponent(CT.Interests);
    if (!interests) return;

    // Only record if conversation was good
    if (quality.topicResonance < 0.4) return;

    for (const interest of interests.interests) {
      if (topics.includes(interest.topic)) {
        // This person is good to talk to about this topic
        if (!interest.knownEnthusiasts.includes(partner.id)) {
          interest.knownEnthusiasts.push(partner.id);

          // Limit to prevent unbounded growth
          if (interest.knownEnthusiasts.length > 5) {
            interest.knownEnthusiasts.shift();
          }
        }
      }
    }
  }

  private learnInterests(
    learner: Entity,
    teacher: Entity,
    topicsDiscussed: TopicId[]
  ): void {
    const socialMemory = learner.getComponent(CT.SocialMemory);
    if (!socialMemory) return;

    let memory = socialMemory.memories.get(teacher.id);
    if (!memory) {
      memory = this.createEmptySocialMemory(teacher.id);
      socialMemory.memories.set(teacher.id, memory);
    }

    // Add known facts about partner's interests
    for (const topic of topicsDiscussed) {
      const fact: KnownFact = {
        type: 'interest',
        value: topic,
        learnedAt: this.world.currentTick,
        confidence: 0.7,
      };

      // Don't duplicate facts
      const existing = memory.knownFacts.find(f =>
        f.type === 'interest' && f.value === topic);

      if (!existing) {
        memory.knownFacts.push(fact);
      } else {
        existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      }
    }
  }
}
```

### Friendship Emergence

**File:** `packages/core/src/systems/FriendshipSystem.ts`

```typescript
/**
 * Detects when true friendships emerge from repeated quality interactions.
 * Emits events for narrative/UI purposes.
 */

export class FriendshipSystem implements System {
  public readonly name = 'FriendshipSystem';

  private static readonly UPDATE_INTERVAL = 500; // Check every ~25 seconds
  private tickCounter = 0;

  // Thresholds for friendship detection
  private static readonly FRIENDSHIP_FAMILIARITY = 60;
  private static readonly FRIENDSHIP_AFFINITY = 40;
  private static readonly FRIENDSHIP_INTERACTIONS = 10;

  update(world: World): void {
    this.tickCounter++;
    if (this.tickCounter % FriendshipSystem.UPDATE_INTERVAL !== 0) return;

    const agents = world.query()
      .with(CT.Agent)
      .with(CT.Relationship)
      .executeEntities();

    for (const entity of agents) {
      this.checkForNewFriendships(entity, world);
    }
  }

  private checkForNewFriendships(entity: Entity, world: World): void {
    const relationships = entity.getComponent(CT.Relationship)!;
    const socialMemory = entity.getComponent(CT.SocialMemory);

    for (const [partnerId, relationship] of relationships.relationships) {
      // Already marked as friend?
      if (socialMemory) {
        const memory = socialMemory.memories.get(partnerId);
        if (memory?.relationshipType === 'friend') continue;
      }

      // Check friendship criteria
      if (relationship.familiarity >= FriendshipSystem.FRIENDSHIP_FAMILIARITY &&
          relationship.affinity >= FriendshipSystem.FRIENDSHIP_AFFINITY &&
          relationship.interactionCount >= FriendshipSystem.FRIENDSHIP_INTERACTIONS) {

        // New friendship formed!
        if (socialMemory) {
          let memory = socialMemory.memories.get(partnerId);
          if (!memory) {
            memory = this.createEmptySocialMemory(partnerId);
            socialMemory.memories.set(partnerId, memory);
          }
          memory.relationshipType = 'friend';
        }

        // Emit event
        const partner = world.getEntity(partnerId);
        if (partner) {
          const selfName = entity.getComponent(CT.Agent)?.name ?? 'Unknown';
          const partnerName = partner.getComponent(CT.Agent)?.name ?? 'Unknown';

          world.events.emit('friendship:formed', {
            agent1: entity.id,
            agent2: partnerId,
            agent1Name: selfName,
            agent2Name: partnerName,
          });
        }
      }
    }
  }
}
```

### Slow Build of Philosophical Interest

**File:** `packages/core/src/systems/InterestEvolutionSystem.ts`

```typescript
/**
 * Handles the slow evolution of interests over time.
 * - Agents develop deeper interests as they age
 * - Philosophy interests grow stronger in adults/elders
 * - Children's questions can become lifelong interests
 */

export class InterestEvolutionSystem implements System {
  public readonly name = 'InterestEvolutionSystem';

  // Run rarely - interests evolve slowly
  private static readonly UPDATE_INTERVAL = 2000; // ~100 seconds
  private tickCounter = 0;

  update(world: World): void {
    this.tickCounter++;
    if (this.tickCounter % InterestEvolutionSystem.UPDATE_INTERVAL !== 0) return;

    const agents = world.query()
      .with(CT.Agent)
      .with(CT.Interests)
      .with(CT.Personality)
      .executeEntities();

    for (const entity of agents) {
      this.evolveInterests(entity, world);
    }
  }

  private evolveInterests(entity: Entity, world: World): void {
    const agent = entity.getComponent(CT.Agent)!;
    const interests = entity.getComponent(CT.Interests)!;
    const personality = entity.getComponent(CT.Personality)!;

    // 1. Age-based philosophical awakening
    if (agent.ageCategory === 'adult' || agent.ageCategory === 'elder') {
      this.developPhilosophicalInterests(interests, personality, agent.ageCategory);
    }

    // 2. Convert satisfied child questions to adult interests
    if (agent.ageCategory === 'teen' || agent.ageCategory === 'adult') {
      this.convertQuestionsToInterests(interests);
    }

    // 3. Deepen interests through repeated discussion
    this.deepenActiveInterests(interests);

    // 4. Prune neglected interests
    this.pruneNeglectedInterests(interests);
  }

  private developPhilosophicalInterests(
    interests: InterestsComponent,
    personality: PersonalityComponent,
    age: AgeCategory
  ): void {
    // Chance to develop philosophical interest based on personality
    const philosophicalChance =
      (personality.spirituality + personality.openness) / 2 * 0.05;

    if (Math.random() > philosophicalChance) return;

    // Elders more likely to think about mortality
    const philosophicalTopics: TopicId[] = age === 'elder'
      ? ['mortality', 'meaning_of_life', 'afterlife']
      : ['meaning_of_life', 'fate_and_destiny', 'the_gods'];

    // Pick one that isn't already a strong interest
    const topic = philosophicalTopics.find(t =>
      !interests.interests.some(i => i.topic === t && i.intensity > 0.5)
    );

    if (topic) {
      const existing = interests.interests.find(i => i.topic === topic);

      if (existing) {
        // Strengthen existing
        existing.intensity = Math.min(1.0, existing.intensity + 0.1);
      } else if (interests.interests.length < interests.maxInterests) {
        // Add new
        interests.interests.push({
          topic,
          category: TopicCategory.PHILOSOPHY,
          intensity: 0.3 + Math.random() * 0.2,
          source: 'experience',
          lastDiscussed: null,
          discussionHunger: 0.3,
          knownEnthusiasts: [],
        });
      }
    }
  }

  private convertQuestionsToInterests(interests: InterestsComponent): void {
    for (const interest of interests.interests) {
      // Child questions that were satisfactorily discussed become regular interests
      if (interest.source === 'question' &&
          interest.lastDiscussed !== null &&
          interest.discussionHunger < 0.3) {

        interest.source = 'childhood'; // Remember it came from curiosity
        delete interest.question; // No longer a question
        interest.intensity = Math.min(1.0, interest.intensity + 0.2);
      }
    }
  }

  private deepenActiveInterests(interests: InterestsComponent): void {
    for (const interest of interests.interests) {
      // Interests that are frequently discussed grow stronger
      if (interest.knownEnthusiasts.length >= 2 &&
          interest.lastDiscussed !== null) {
        interest.intensity = Math.min(1.0, interest.intensity + 0.02);
      }
    }
  }

  private pruneNeglectedInterests(interests: InterestsComponent): void {
    if (interests.interests.length <= 3) return; // Keep minimum interests

    // Remove very weak interests that haven't been discussed
    interests.interests = interests.interests.filter(interest => {
      // Keep if:
      // - Reasonably intense
      // - Recently discussed
      // - From meaningful source
      const keepIntensity = interest.intensity >= 0.2;
      const keepRecent = interest.lastDiscussed !== null;
      const keepSource = ['skill', 'childhood', 'question'].includes(interest.source);

      return keepIntensity || keepRecent || keepSource;
    });
  }
}
```

---

## Implementation Order & Dependencies

### Phase Dependencies

```
Phase 1: Interests Foundation
    └── No dependencies (new component/system)

Phase 2: Conversation Depth Model
    └── Depends on Phase 1 (needs interests for topic detection)

Phase 3: Intelligent Partner Selection
    └── Depends on Phase 1 (needs interests for scoring)
    └── Depends on Phase 2 (needs quality metrics concept)

Phase 4: Age-Based Evolution
    └── Depends on Phase 1 (child questions need interests)
    └── Depends on Phase 5 (LLM needs style prompts)

Phase 5: LLM Prompt Integration
    └── Depends on Phase 1 (includes interests in prompt)
    └── Depends on Phase 4 (includes age style)

Phase 6: Emergent Dynamics
    └── Depends on Phase 2 (needs quality events)
    └── Depends on Phase 1 (tracks enthusiasts)
```

### Recommended Implementation Order

1. **Phase 1: InterestsComponent + InterestsSystem + Generation**
   - Can be tested in isolation
   - Foundation for everything else

2. **Phase 2: Conversation Quality Metrics**
   - Depends on interests for topic detection
   - Modifies CommunicationSystem

3. **Phase 5: LLM Prompt Enhancement** (do before Phase 4)
   - Once interests exist, can add them to prompts
   - Most visible impact on conversation quality

4. **Phase 3: Partner Selection**
   - Nice to have once interests work
   - Makes conversations more intentional

5. **Phase 4: Age-Based Styles**
   - Refines conversation behavior
   - Adds child questions mechanic

6. **Phase 6: Emergent Dynamics**
   - Polish layer
   - Friendship detection, interest evolution

### Estimated Scope

| Phase | New Files | Modified Files | Complexity |
|-------|-----------|----------------|------------|
| 1 | 3 | 2 | Medium |
| 2 | 1 | 3 | Medium |
| 3 | 1 | 1 | Medium |
| 4 | 1 | 1 | Low |
| 5 | 0 | 1 | Medium |
| 6 | 3 | 1 | Medium |

### Testing Checkpoints

After each phase, verify:

1. **Phase 1**: Agents spawn with interests based on skills/personality
2. **Phase 2**: Conversations generate quality scores; deep conversations feel different
3. **Phase 3**: Agents prefer partners with shared interests
4. **Phase 4**: Children ask questions; elders discuss philosophy
5. **Phase 5**: LLM responses reference interests and shared topics
6. **Phase 6**: Friendships emerge; philosophical interests develop over time

---

## Appendix: Topic Categories and Keywords

Full mapping for topic detection:

```typescript
export const TOPIC_KEYWORDS: Record<TopicId, RegExp[]> = {
  // Craft topics
  'woodworking': [/wood/i, /lumber/i, /carve/i, /axe/i, /timber/i, /plank/i],
  'stonecraft': [/stone/i, /rock/i, /mine/i, /quarry/i, /chisel/i],
  'farming': [/farm/i, /crop/i, /harvest/i, /plant/i, /seed/i, /field/i, /plow/i],
  'cooking': [/cook/i, /food/i, /recipe/i, /meal/i, /bake/i, /stew/i],
  'building': [/build/i, /construct/i, /house/i, /wall/i, /roof/i],
  'foraging': [/forage/i, /gather/i, /berry/i, /mushroom/i, /herb/i],
  'hunting': [/hunt/i, /prey/i, /track/i, /trap/i, /bow/i, /arrow/i],
  'craftsmanship': [/craft/i, /make/i, /create/i, /tool/i, /skill/i],

  // Nature topics
  'trees_and_forests': [/tree/i, /forest/i, /wood/i, /leaf/i, /branch/i, /grove/i],
  'weather': [/weather/i, /rain/i, /sun/i, /storm/i, /cloud/i, /wind/i, /snow/i],
  'animals': [/animal/i, /creature/i, /beast/i, /bird/i, /deer/i, /wolf/i, /fish/i],
  'plants': [/plant/i, /flower/i, /grow/i, /bloom/i, /root/i, /vine/i],
  'seasons': [/season/i, /spring/i, /summer/i, /autumn/i, /winter/i, /year/i],
  'landscape': [/land/i, /mountain/i, /river/i, /valley/i, /hill/i, /lake/i],

  // Philosophy topics
  'afterlife': [/afterlife/i, /after.*die/i, /heaven/i, /spirit.*world/i, /beyond/i, /next.*life/i],
  'meaning_of_life': [/meaning/i, /purpose/i, /why.*here/i, /exist/i, /matter/i],
  'mortality': [/death/i, /die/i, /dying/i, /mortal/i, /end/i, /life.*short/i],
  'dreams': [/dream/i, /vision/i, /sleep.*see/i, /nightmare/i],
  'the_gods': [/god/i, /gods/i, /divine/i, /pray/i, /blessing/i, /sacred/i, /holy/i],
  'fate_and_destiny': [/fate/i, /destiny/i, /meant.*be/i, /fortune/i, /doom/i],
  'right_and_wrong': [/right/i, /wrong/i, /good/i, /evil/i, /moral/i, /should/i],

  // Social topics
  'family': [/family/i, /mother/i, /father/i, /child/i, /parent/i, /son/i, /daughter/i, /sibling/i],
  'friendship': [/friend/i, /companion/i, /together/i, /bond/i, /trust/i],
  'village_gossip': [/heard/i, /rumor/i, /gossip/i, /they.*say/i, /did.*know/i],
  'romance': [/love/i, /heart/i, /marry/i, /court/i, /beautiful/i, /handsome/i],
  'conflict': [/fight/i, /argue/i, /angry/i, /dispute/i, /enemy/i],

  // Practical topics
  'food': [/food/i, /eat/i, /hungry/i, /meal/i, /taste/i, /delicious/i],
  'shelter': [/shelter/i, /home/i, /house/i, /roof/i, /warm/i, /safe/i],
  'work': [/work/i, /job/i, /task/i, /busy/i, /labor/i, /effort/i],
  'health': [/health/i, /sick/i, /hurt/i, /pain/i, /heal/i, /medicine/i],

  // Story topics
  'myths_and_legends': [/myth/i, /legend/i, /story/i, /tale/i, /ancient/i, /hero/i],
  'village_history': [/history/i, /past/i, /remember.*when/i, /long.*ago/i, /founded/i],
  'personal_stories': [/I.*once/i, /happened.*me/i, /my.*story/i, /I.*remember/i],
  'adventures': [/adventure/i, /journey/i, /explore/i, /discover/i, /travel/i],
};
```

---

## Performance Considerations

### Critical Rules

This game runs at **20 ticks per second**. The conversation system must not introduce frame drops.

#### 1. System Update Intervals

Most conversation systems do NOT need per-tick updates:

| System | Update Interval | Rationale |
|--------|-----------------|-----------|
| InterestsSystem | 100 ticks (~5s) | Hunger grows slowly |
| InterestEvolutionSystem | 2000 ticks (~100s) | Very slow evolution |
| FriendshipSystem | 500 ticks (~25s) | Relationships change slowly |
| RelationshipConversationSystem | Event-driven | Only on conversation end |
| PartnerSelector | On-demand | Only when seeking partner |
| ConversationQuality | On-demand | Only on conversation end |

```typescript
// GOOD: Throttled system
export class InterestsSystem implements System {
  private static readonly UPDATE_INTERVAL = 100;
  private tickCounter = 0;

  update(world: World): void {
    this.tickCounter++;
    if (this.tickCounter % InterestsSystem.UPDATE_INTERVAL !== 0) return;
    // ... actual work
  }
}
```

#### 2. Query Caching

**NEVER query inside loops.** Cache query results before iteration:

```typescript
// BAD: Query in loop
for (const entity of entities) {
  const others = world.query().with(CT.Interests).executeEntities();
  // N queries for N entities = O(N²)
}

// GOOD: Cache before loop
const allWithInterests = world.query().with(CT.Interests).executeEntities();
for (const entity of entities) {
  // Use cached allWithInterests
}
```

For systems that run repeatedly, use the `CachedQuery` utility:

```typescript
import { CachedQuery, SingletonCache } from '../utils/performance.js';

export class InterestsSystem implements System {
  private agentQuery = new CachedQuery('agent', 'interests');

  update(world: World): void {
    const agents = this.agentQuery.get(world); // Cached per tick
  }
}
```

#### 3. Partner Selection Performance

Partner scoring could be expensive with many agents. Mitigations:

```typescript
export function scorePartners(context: PartnerSelectionContext): PartnerScore[] {
  const { seeker, candidates } = context;

  // 1. Pre-filter by distance (cheap) before expensive scoring
  const maxRange = 20;
  const nearbyOnly = candidates.filter(c => {
    const pos = c.getComponent(CT.Position)!;
    const seekerPos = seeker.getComponent(CT.Position)!;
    // Use squared distance - no sqrt
    const dx = pos.x - seekerPos.x;
    const dy = pos.y - seekerPos.y;
    return dx * dx + dy * dy <= maxRange * maxRange;
  });

  // 2. Limit candidates if still too many
  const MAX_CANDIDATES = 10;
  const toScore = nearbyOnly.length > MAX_CANDIDATES
    ? nearbyOnly.slice(0, MAX_CANDIDATES)  // Take nearest N
    : nearbyOnly;

  // 3. Now do expensive interest scoring
  return toScore.map(c => scoreCandidate(seeker, c));
}
```

#### 4. Topic Detection Performance

Regex matching on every message is expensive. Use early-out patterns:

```typescript
// BAD: Check all patterns for all messages
for (const msg of messages) {
  for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(msg.message)) { ... }
    }
  }
}

// GOOD: Pre-compile regex, use word boundary checks, early exit
const TOPIC_QUICK_CHECK: Record<TopicId, string[]> = {
  'afterlife': ['after', 'death', 'heaven', 'spirit'],
  'mortality': ['death', 'die', 'dying', 'mortal'],
  // Simple substring checks first
};

function detectTopics(messages: ConversationMessage[]): TopicId[] {
  const found = new Set<TopicId>();
  const fullText = messages.map(m => m.message.toLowerCase()).join(' ');

  for (const [topic, quickWords] of Object.entries(TOPIC_QUICK_CHECK)) {
    // Quick substring check first
    const hasAny = quickWords.some(word => fullText.includes(word));
    if (!hasAny) continue;

    // Only do regex if quick check passes
    const patterns = TOPIC_KEYWORDS[topic as TopicId];
    if (patterns?.some(p => p.test(fullText))) {
      found.add(topic as TopicId);
    }
  }

  return Array.from(found);
}
```

#### 5. Interest Component Size

Limit interest array size to prevent memory bloat:

```typescript
export class InterestsComponent extends ComponentBase {
  public maxInterests: number = 10;  // Hard cap
  public interests: Interest[] = [];

  addInterest(interest: Interest): void {
    if (this.interests.length >= this.maxInterests) {
      // Remove lowest intensity interest
      this.interests.sort((a, b) => a.intensity - b.intensity);
      this.interests.shift();
    }
    this.interests.push(interest);
  }
}

// Same for knownEnthusiasts per interest
interface Interest {
  knownEnthusiasts: string[];  // Max 5, FIFO
}
```

#### 6. Event-Driven Over Polling

Use events instead of polling where possible:

```typescript
// BAD: Poll for conversation state changes
update(world: World): void {
  for (const entity of entities) {
    const conv = entity.getComponent(CT.Conversation);
    if (conv && !conv.isActive && this.wasActive.get(entity.id)) {
      // Conversation just ended - handle it
    }
    this.wasActive.set(entity.id, conv?.isActive ?? false);
  }
}

// GOOD: Listen for events
init(world: World): void {
  world.events.on('conversation:ended', this.handleConversationEnded.bind(this));
}
```

#### 7. LLM Prompt Building

The enhanced prompt context is only built when an agent actually needs to respond (not every tick):

```typescript
// Prompt is built on-demand, not cached or pre-computed
// This is fine because LLM calls are already expensive and rate-limited
private buildActiveConversationSection(...): string {
  // This runs ~once per conversation turn, not 20x per second
}
```

### Performance Budget

Rough targets for the conversation system:

| Operation | Budget | Frequency |
|-----------|--------|-----------|
| InterestsSystem.update() | <1ms | Every 5s |
| Partner selection | <5ms | On conversation seek |
| Conversation quality calc | <2ms | On conversation end |
| LLM prompt building | <1ms | On LLM call (rare) |

### Benchmarking

Add benchmarks for critical paths:

```typescript
// In packages/core/src/__benchmarks__/ConversationBenchmark.test.ts

describe('Conversation Performance', () => {
  it('scores 50 partners in under 5ms', () => {
    const start = performance.now();
    scorePartners({ seeker, candidates: fiftyAgents, world });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });

  it('detects topics in 100 messages in under 2ms', () => {
    const start = performance.now();
    extractTopicsFromMessages(hundredMessages);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2);
  });
});
```

---

## Future Considerations

### Not in Scope (But Worth Noting)

1. **Conversation Memory Formation**: Important discussions becoming episodic memories
2. **Group Conversations**: More than 2 participants
3. **Conversation Rejection**: Agents choosing not to talk
4. **Topic Taboos**: Cultural/personal topics that are off-limits
5. **Mood Impact on Conversation**: Sad agents discuss different topics
6. **Skill Learning Through Conversation**: Verbal knowledge transfer

These could be Phase 7+ enhancements once the core system is stable.
