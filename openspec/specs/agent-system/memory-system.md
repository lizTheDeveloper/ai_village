# Agent Memory System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Memory is how agents become individuals, how culture forms, and how history accumulates. This spec defines when memories form, how they're stored, when agents reflect, how memories influence decisions, and how memories transmit between agents.

---

## Core Principles

### Autonomic, Not Deliberate

Memory formation is **not a choice**. Agents don't decide what to remember - it happens to them.

```typescript
// WRONG: Agent chooses to remember
agent.decideToRemember(event);  // NO

// RIGHT: Memory forms automatically based on event properties
memorySystem.processEvent(event, agent);  // Event triggers memory if significant
```

Just like humans, agents:
- Don't choose what sticks in their mind
- Can't force themselves to forget
- Remember emotional moments whether they want to or not
- Sometimes remember trivial things, forget important ones

### Immutable Record

**Memories cannot be edited.** What happened, happened. What they thought, they thought.

```typescript
interface MemoryImmutability {
  // Once formed, memories are append-only
  memories: ReadonlyArray<EpisodicMemory>;

  // No operations allowed
  forbidden: [
    "editMemory",      // Can't change what happened
    "deleteMemory",    // Can't force forgetting (only natural decay)
    "insertMemory",    // Can't implant memories
    "editThought",     // Can't change what they thought
    "editConversation" // Can't retcon what was said
  ];

  // What IS allowed
  allowed: [
    "naturalDecay",    // Memories fade over time
    "reinterpret",     // New semantic meaning, but original intact
    "addContext",      // Link to new memories
  ];
}
```

### No Player/System Editing

```typescript
interface ProtectedContent {
  // These are sacred - no editing allowed by anyone
  protected: [
    "agent.memory.episodic",     // What happened to them
    "agent.memory.reflections",  // What they concluded
    "conversation.history",       // What was said
    "journal.entries",           // What they wrote
    "agent.beliefs",             // What they believe (can evolve, not edit)
  ];

  // Even the player cannot:
  playerCannotDo: [
    "Edit an agent's memories",
    "Delete a conversation",
    "Change what an agent believes",
    "Retcon history",
    "Make an agent forget something specific",
  ];

  // The system cannot:
  systemCannotDo: [
    "Sanitize uncomfortable memories",
    "Correct 'wrong' beliefs",
    "Remove conflicts",
    "Simplify history",
  ];
}
```

### Consequences Are Real

```typescript
// If an agent says something hurtful, it was said
// If an agent forms a wrong belief, they believe it
// If agents have a conflict, it happened
// If knowledge is lost when an agent dies, it's lost

// The simulation has integrity - history is real
```

---

## Memory Architecture

### Memory Types

```typescript
interface AgentMemory {
  // Episodic: "What happened"
  episodic: EpisodicMemory[];

  // Semantic: "What I know/believe"
  semantic: SemanticMemory[];

  // Procedural: "How to do things" (implicit in skills, not stored as memories)

  // Social: "What I know about others"
  social: SocialMemory[];

  // Reflections: "What I think about what happened"
  reflections: Reflection[];
}
```

### Episodic Memory (Events)

```typescript
interface EpisodicMemory {
  id: string;
  timestamp: GameTime;

  // What happened
  event: EventDescription;
  participants: string[];        // Agent IDs involved
  location: Position;
  locationName?: string;         // If agent has named it

  // Emotional encoding
  emotionalValence: number;      // -1 to 1 (negative to positive)
  emotionalIntensity: number;    // 0 to 1 (mild to intense)
  surprise: number;              // 0 to 1 (expected to shocking)

  // Importance (affects retention)
  importance: number;            // 0 to 1
  importanceFactors: string[];   // Why it matters

  // Retrieval metadata
  timesRecalled: number;
  lastRecalled: GameTime | null;
  linkedMemories: string[];      // Related memory IDs

  // Decay
  clarity: number;               // 1 to 0, degrades over time
  consolidated: boolean;         // Moved to long-term?
}

interface EventDescription {
  type: EventType;
  summary: string;               // Natural language
  details: Record<string, any>;  // Structured data
  rawContext?: string;           // Original LLM context if generated
}

type EventType =
  | "action_completed"    // I did something
  | "action_failed"       // I tried and failed
  | "social_interaction"  // Talked with someone
  | "witnessed_event"     // Saw something happen
  | "discovery"           // Found/learned something new
  | "received_item"       // Got something
  | "gave_item"           // Gave something
  | "trade"               // Exchange
  | "conflict"            // Disagreement
  | "collaboration"       // Worked together
  | "emotion_peak"        // Strong feeling
  | "life_event"          // Birth, death, arrival, departure
  | "world_event"         // Weather, season, disaster
  | "ritual"              // Repeated meaningful action
  | "creation"            // Made something new
  | "teaching"            // Taught or was taught
  | "insight";            // Realized something
```

### Semantic Memory (Knowledge/Beliefs)

```typescript
interface SemanticMemory {
  id: string;
  createdAt: GameTime;
  updatedAt: GameTime;

  // What is believed
  type: SemanticType;
  subject: string;               // What it's about
  belief: string;                // Natural language belief
  confidence: number;            // 0 to 1

  // Source
  sourceMemories: string[];      // Episodic memories that led to this
  learnedFrom?: string;          // Agent who taught this

  // Social validation
  sharedBy: string[];            // Other agents who believe this
  contestedBy: string[];         // Agents who disagree
}

type SemanticType =
  | "fact"                // "The river is to the east"
  | "opinion"             // "Tomatoes are the best crop"
  | "value"               // "Helping others is important"
  | "preference"          // "I like working in the morning"
  | "belief"              // "The forest spirits protect us"
  | "knowledge"           // "Iron comes from ore"
  | "rule"                // "We don't harvest on rest day"
  | "name"                // "That hill is called Sunrise Peak"
  | "story"               // "Long ago, the founders..."
  | "theory";             // "I think portals might exist..."
```

### Social Memory (Relationships)

```typescript
interface SocialMemory {
  agentId: string;               // Who this is about
  relationship: RelationshipState;

  // Accumulated impressions
  impressions: Impression[];
  overallSentiment: number;      // -1 to 1
  trust: number;                 // 0 to 1

  // Interaction history
  lastInteraction: GameTime;
  interactionCount: number;
  significantMoments: string[];  // Episodic memory IDs

  // Knowledge about them
  knownPreferences: string[];
  knownSkills: string[];
  knownBeliefs: string[];
  predictions: string[];         // "They'll probably..."
}

interface Impression {
  timestamp: GameTime;
  event: string;                 // Brief description
  impactOnSentiment: number;     // How it changed feelings
  memorable: boolean;
}
```

---

## Memory Formation

### Autonomic Encoding

Memory formation is **unconscious**. The system evaluates every event and encodes memories based on properties of the event and agent state - not agent choice.

```typescript
// Every game event passes through this
function onGameEvent(event: GameEvent, witnesses: Agent[]): void {
  for (const agent of witnesses) {
    // Agent doesn't decide - system evaluates
    const shouldEncode = evaluateMemoryFormation(event, agent);

    if (shouldEncode) {
      // Memory forms whether agent "wants" it or not
      const memory = encodeMemoryAutonomically(event, agent);

      // Emotional events encode more strongly - not by choice
      if (isEmotional(event, agent)) {
        memory.clarity = 1.0;
        memory.importance += 0.2;
      }

      // Traumatic events are impossible to forget
      if (isTraumatic(event, agent)) {
        memory.consolidated = true;  // Immediately long-term
        memory.decayRate = 0;        // Won't fade
      }
    }
  }
}
```

### What Triggers Encoding

Memories form based on **event properties**, not agent intention:

```typescript
interface MemoryFormationFactors {
  // High encoding probability
  strongEncoders: {
    emotionalIntensity: "> 0.5",      // Felt something strongly
    novelty: "first time experiencing",
    socialSignificance: "involves close relationship",
    survivalRelevance: "affects survival",
    unexpectedness: "prediction error high",
    personalInvolvement: "agent was participant, not observer",
  };

  // Moderate encoding probability
  moderateEncoders: {
    goalRelevance: "related to current goals",
    consequential: "led to significant outcome",
    effortful: "required significant energy",
    interrupted: "task was interrupted (Zeigarnik effect)",
  };

  // Low but possible encoding
  weakEncoders: {
    routine: "5% chance for mundane events",
    proximity: "happened nearby",
    sensory: "particularly vivid sensory experience",
  };
}
```

### The Agent Has No Say

```typescript
// Agents cannot:
const agentCannotDo = [
  "choose to remember something",
  "choose to forget something",
  "decide what's important to them",
  "filter their own perceptions",
  "edit their reactions",
];

// These happen automatically:
const autonomicProcesses = [
  "emotional response to events",
  "memory encoding strength",
  "what catches their attention",
  "what they find surprising",
  "how they feel about people",
];
```

### Memory Encoding Process

```typescript
async function encodeMemory(
  agent: Agent,
  event: GameEvent,
  context: EventContext
): Promise<EpisodicMemory | null> {

  // 1. Check if this triggers memory formation
  if (!shouldFormMemory(event, agent, context)) {
    return null;
  }

  // 2. Calculate emotional response
  const emotion = await calculateEmotionalResponse(agent, event, context);

  // 3. Calculate importance
  const importance = calculateImportance(event, emotion, agent, context);

  // 4. Generate natural language summary via LLM
  const summary = await generateMemorySummary(agent, event, context);

  // 5. Create memory object
  const memory: EpisodicMemory = {
    id: generateId(),
    timestamp: context.gameTime,
    event: {
      type: event.type,
      summary: summary,
      details: extractDetails(event),
    },
    participants: event.participants,
    location: agent.position,
    locationName: agent.getLocationName(agent.position),
    emotionalValence: emotion.valence,
    emotionalIntensity: emotion.intensity,
    surprise: calculateSurprise(event, agent),
    importance: importance,
    importanceFactors: getImportanceFactors(event, emotion, agent),
    timesRecalled: 0,
    lastRecalled: null,
    linkedMemories: findRelatedMemories(agent, event),
    clarity: 1.0,
    consolidated: false,
  };

  // 6. Store in short-term memory
  agent.memory.episodic.push(memory);

  // 7. Update semantic memory if this changes beliefs
  await updateSemanticFromEpisodic(agent, memory);

  // 8. Update social memory if interaction
  if (event.participants.length > 1) {
    await updateSocialMemory(agent, memory);
  }

  return memory;
}
```

### Importance Calculation

```typescript
function calculateImportance(
  event: GameEvent,
  emotion: EmotionalResponse,
  agent: Agent,
  context: EventContext
): number {
  let importance = 0;

  // Emotional weight
  importance += emotion.intensity * 0.3;

  // Novelty weight
  if (isFirstTime(event, agent)) {
    importance += 0.3;
  }

  // Goal relevance
  if (relatedToCurrentGoal(event, agent)) {
    importance += 0.2;
  }

  // Social significance
  if (involvesCloseRelationship(event, agent)) {
    importance += 0.15;
  }

  // Survival relevance
  if (affectsSurvival(event)) {
    importance += 0.25;
  }

  // Rarity
  importance += calculateRarity(event) * 0.2;

  // Consequences
  if (hasSignificantConsequences(event)) {
    importance += 0.2;
  }

  return Math.min(1, importance);
}
```

---

## Reflection System

### When Reflection Happens

```typescript
interface ReflectionSchedule {
  // End of day reflection (primary)
  endOfDay: {
    trigger: "time_of_day === 'night' AND agent.state === 'resting'",
    duration: "10-30 minutes game time",
    required: true,
  };

  // Post-event reflection (immediate processing)
  postEvent: {
    trigger: "event.importance > 0.7 OR event.emotionalIntensity > 0.8",
    duration: "brief pause in activity",
    required: false,
  };

  // Idle reflection (when nothing to do)
  idle: {
    trigger: "agent.hasNoTasks AND agent.energy > 0.3",
    duration: "variable",
    probability: 0.3,  // 30% chance when idle
  };

  // Periodic deep reflection
  periodic: {
    trigger: "every 7 days OR season_change",
    duration: "extended",
    required: true,
  };

  // Triggered by conversation
  conversational: {
    trigger: "other_agent asks about past OR topic_relates_to_memory",
    duration: "within conversation",
    required: false,
  };
}
```

### End of Day Reflection

```typescript
async function endOfDayReflection(agent: Agent): Promise<Reflection> {
  // 1. Gather today's memories
  const todaysMemories = agent.memory.episodic.filter(
    m => isSameDay(m.timestamp, getCurrentTime())
  );

  // 2. Prompt LLM for reflection
  const reflectionPrompt = `
    You are ${agent.name}, a villager with these traits:
    ${formatPersonality(agent.personality)}

    Today, these things happened to you:
    ${todaysMemories.map(m => `- ${m.event.summary}`).join('\n')}

    Reflect on your day:
    1. What was the most significant thing that happened? Why?
    2. How do you feel about how the day went?
    3. Did you learn anything new?
    4. Did your opinion of anyone change?
    5. What do you want to do tomorrow?
    6. Is there anything you want to remember long-term?

    Respond as ${agent.name} would think, in first person.
  `;

  const reflectionText = await llm.generate(reflectionPrompt);

  // 3. Parse reflection into structured updates
  const parsed = await parseReflection(reflectionText, agent);

  // 4. Create reflection memory
  const reflection: Reflection = {
    id: generateId(),
    timestamp: getCurrentTime(),
    type: "end_of_day",
    content: reflectionText,
    memoriesConsidered: todaysMemories.map(m => m.id),
    insightsGained: parsed.insights,
    beliefsUpdated: parsed.beliefChanges,
    goalsAffected: parsed.goalChanges,
  };

  // 5. Update semantic memory based on reflection
  for (const insight of parsed.insights) {
    await addOrUpdateSemanticMemory(agent, insight);
  }

  // 6. Mark important memories for consolidation
  for (const memoryId of parsed.importantMemories) {
    markForConsolidation(agent, memoryId);
  }

  // 7. Update goals if reflection suggests changes
  if (parsed.goalChanges.length > 0) {
    await updateGoals(agent, parsed.goalChanges);
  }

  agent.memory.reflections.push(reflection);
  return reflection;
}
```

### Deep Reflection (Weekly/Seasonal)

```typescript
async function deepReflection(agent: Agent): Promise<Reflection> {
  // 1. Gather memories from the period
  const periodStart = getLastDeepReflectionTime(agent);
  const recentMemories = getMemoriesSince(agent, periodStart);
  const recentReflections = getReflectionsSince(agent, periodStart);

  // 2. Also consider long-term patterns
  const recurringThemes = findRecurringThemes(agent);
  const relationshipChanges = assessRelationshipChanges(agent, periodStart);
  const skillProgress = assessSkillProgress(agent, periodStart);

  // 3. Prompt for deep reflection
  const prompt = `
    You are ${agent.name}. It's time to reflect on the past while.

    Summary of what happened:
    ${summarizeMemories(recentMemories)}

    Your daily reflections noted:
    ${summarizeReflections(recentReflections)}

    Patterns you've noticed:
    ${recurringThemes.join('\n')}

    Think deeply:
    1. How have you changed?
    2. What have you accomplished? What have you failed at?
    3. How do you feel about your relationships?
    4. What beliefs have strengthened or weakened?
    5. What do you value most now?
    6. What stories from this time will you tell others?
    7. What do you hope for in the future?

    Reflect deeply as ${agent.name}.
  `;

  const reflectionText = await llm.generate(prompt);

  // 4. Extract life narrative updates
  const narrative = await extractNarrativeUpdates(reflectionText, agent);

  // 5. Consolidate memories
  await consolidateMemories(agent, recentMemories, narrative);

  // 6. Update identity/values
  await updateAgentIdentity(agent, narrative);

  return createDeepReflection(agent, reflectionText, narrative);
}
```

---

## Conversation System

### When Agents Converse

```typescript
interface ConversationTriggers {
  // Proximity-based
  proximity: {
    condition: "distance < 2 tiles AND both_idle",
    probability: (agent, other) => {
      const base = 0.1;
      const relationshipBonus = getRelationship(agent, other) * 0.3;
      const extraversionBonus = agent.personality.extraversion * 0.2;
      const timeSinceLastTalk = daysSince(lastConversation(agent, other));
      const timeBonus = Math.min(0.3, timeSinceLastTalk * 0.05);
      return base + relationshipBonus + extraversionBonus + timeBonus;
    },
  };

  // Need-based
  needBased: [
    { need: "information", trigger: "agent needs to know something other knows" },
    { need: "social", trigger: "agent.loneliness > 0.6" },
    { need: "help", trigger: "agent.stuck_on_task" },
    { need: "trade", trigger: "agent wants item other has" },
  ];

  // Event-triggered
  eventTriggered: [
    { event: "shared_experience", trigger: "both witnessed same event" },
    { event: "greeting", trigger: "agent hasn't seen other in > 3 days" },
    { event: "news", trigger: "agent has high-importance recent memory to share" },
    { event: "conflict", trigger: "unresolved disagreement exists" },
  ];

  // Ritual/scheduled
  scheduled: [
    { type: "meal_together", trigger: "mealtime AND at_shared_table" },
    { type: "work_together", trigger: "same_task_location" },
    { type: "evening_gathering", trigger: "evening AND at_gathering_spot" },
  ];
}
```

### Conversation Flow

```typescript
async function conductConversation(
  initiator: Agent,
  responder: Agent,
  context: ConversationContext
): Promise<ConversationResult> {

  const conversation: ConversationTurn[] = [];
  let turnCount = 0;
  const maxTurns = determineConversationLength(initiator, responder, context);

  // Determine initial topic
  let currentTopic = await selectInitialTopic(initiator, responder, context);

  while (turnCount < maxTurns && !conversationEnding(conversation)) {
    // Initiator's turn
    const initiatorTurn = await generateConversationTurn(
      initiator,
      responder,
      currentTopic,
      conversation,
      "speak"
    );
    conversation.push(initiatorTurn);
    turnCount++;

    // Form memory of what they said
    await formConversationMemory(initiator, initiatorTurn, responder);

    // Responder's turn
    const responderTurn = await generateConversationTurn(
      responder,
      initiator,
      currentTopic,
      conversation,
      "respond"
    );
    conversation.push(responderTurn);
    turnCount++;

    // Form memory of what they heard and said
    await formConversationMemory(responder, responderTurn, initiator);
    await formConversationMemory(initiator, responderTurn, responder);

    // Topic might shift
    currentTopic = await maybeShiftTopic(conversation, initiator, responder);
  }

  // Post-conversation processing
  await processConversationOutcome(initiator, responder, conversation);

  return {
    participants: [initiator.id, responder.id],
    turns: conversation,
    memoriesFormed: extractConversationMemories(conversation),
    relationshipImpact: calculateRelationshipChange(conversation),
    knowledgeTransferred: extractKnowledgeTransfer(conversation),
  };
}
```

### Conversation Turn Generation

```typescript
async function generateConversationTurn(
  speaker: Agent,
  listener: Agent,
  topic: ConversationTopic,
  history: ConversationTurn[],
  role: "speak" | "respond"
): Promise<ConversationTurn> {

  // Gather relevant memories for this topic
  const relevantMemories = await retrieveRelevantMemories(speaker, topic, listener);

  // Get relationship context
  const relationship = speaker.memory.social.get(listener.id);

  // Build prompt
  const prompt = `
    You are ${speaker.name}.
    Personality: ${formatPersonality(speaker.personality)}
    Current mood: ${speaker.mood}

    You're talking with ${listener.name}.
    Your relationship: ${formatRelationship(relationship)}
    You know about them: ${relationship?.knownPreferences.join(', ')}

    Current topic: ${topic.description}

    Relevant things you remember:
    ${relevantMemories.map(m => `- ${m.event.summary}`).join('\n')}

    Conversation so far:
    ${formatConversationHistory(history)}

    ${role === "speak" ? "What do you say next?" : "How do you respond?"}

    Consider:
    - Your personality affects how you speak
    - Your relationship affects what you share
    - Your memories inform what you say
    - You might share gossip, opinions, knowledge, or feelings

    Respond with just your dialogue and a brief action/emotion note.
  `;

  const response = await llm.generate(prompt);
  const parsed = parseConversationResponse(response);

  return {
    speaker: speaker.id,
    listener: listener.id,
    dialogue: parsed.dialogue,
    action: parsed.action,
    emotion: parsed.emotion,
    topic: topic.id,
    memoriesReferenced: relevantMemories.map(m => m.id),
    knowledgeShared: parsed.knowledgeShared,
    timestamp: getCurrentTime(),
  };
}
```

---

## Journaling System

### Who Journals

```typescript
interface JournalingBehavior {
  // Personality-driven probability
  probability: (agent: Agent) => {
    let base = 0.1;

    // More introspective agents journal more
    base += (1 - agent.personality.extraversion) * 0.2;  // Introverts journal more
    base += agent.personality.openness * 0.15;           // Creative types
    base += agent.personality.conscientiousness * 0.1;   // Organized types

    // Skill-driven
    if (agent.skills.research > 50) base += 0.1;         // Scholarly types

    // Mood-driven
    if (agent.mood === "contemplative") base += 0.2;
    if (agent.mood === "distressed") base += 0.15;       // Processing emotions

    return Math.min(0.8, base);
  };

  // When journaling happens
  timing: [
    "end_of_day",           // Most common
    "after_significant_event",
    "when_alone_and_idle",
    "during_rest_period",
  ];
}
```

### Journal Entry Creation

```typescript
interface JournalEntry {
  id: string;
  authorId: string;
  timestamp: GameTime;

  // Content
  content: string;           // Natural language
  topics: string[];          // What it's about
  mood: string;              // Author's mood when writing
  private: boolean;          // Would they share this?

  // References
  memoriesReferenced: string[];
  agentsMentioned: string[];
  locationsMentioned: string[];
  itemsMentioned: string[];

  // Physical artifact
  physicalLocation?: string; // Where the journal is stored
  discoverable: boolean;     // Can others find it?
}

async function writeJournalEntry(agent: Agent): Promise<JournalEntry> {
  // Select what to write about
  const recentMemories = getRecentMemories(agent, 3); // Last 3 days
  const unresolvedThoughts = getUnprocessedReflections(agent);
  const strongEmotions = getStrongEmotionalMemories(agent, 7);

  const prompt = `
    You are ${agent.name}, writing in your journal.

    Recent events:
    ${recentMemories.map(m => `- ${m.event.summary}`).join('\n')}

    Things on your mind:
    ${unresolvedThoughts.join('\n')}

    Strong feelings lately:
    ${strongEmotions.map(m => `- ${m.event.summary} (felt: ${m.emotionalValence > 0 ? 'good' : 'bad'})`).join('\n')}

    Write a journal entry as ${agent.name}. Include:
    - What happened that matters to you
    - How you feel about things
    - Thoughts about other villagers
    - Hopes, worries, or questions
    - Maybe something you wouldn't say out loud

    Write in first person, in ${agent.name}'s voice.
  `;

  const content = await llm.generate(prompt);

  const entry: JournalEntry = {
    id: generateId(),
    authorId: agent.id,
    timestamp: getCurrentTime(),
    content: content,
    topics: extractTopics(content),
    mood: agent.mood,
    private: determinePrivacy(content, agent),
    memoriesReferenced: recentMemories.map(m => m.id),
    agentsMentioned: extractMentionedAgents(content),
    locationsMentioned: extractMentionedLocations(content),
    itemsMentioned: extractMentionedItems(content),
    physicalLocation: agent.home?.id || null,
    discoverable: true,
  };

  // Store journal entry as persistent artifact
  await storeJournalEntry(entry);

  // Also create memory of journaling
  await createMemory(agent, {
    type: "action_completed",
    summary: `Wrote in my journal about ${entry.topics.join(', ')}`,
    importance: 0.2,
  });

  return entry;
}
```

### Journal Discovery

```typescript
// Journals can be found and read by others
async function discoverJournal(
  finder: Agent,
  journalOwner: Agent,
  entry: JournalEntry
): Promise<void> {

  // Only if discoverable and finder has access
  if (!entry.discoverable) return;
  if (!hasAccessTo(finder, entry.physicalLocation)) return;

  // Reading someone's journal is significant
  const memory = await createMemory(finder, {
    type: "discovery",
    summary: `Found and read ${journalOwner.name}'s journal`,
    details: {
      learned: entry.topics,
      journalContent: entry.private ? "private thoughts" : entry.content,
      aboutWhom: entry.agentsMentioned,
    },
    emotionalValence: entry.private ? -0.2 : 0.1,  // Guilt if private
    importance: 0.6,
  });

  // Learn things from the journal
  for (const topic of entry.topics) {
    await considerNewInformation(finder, topic, journalOwner, "journal");
  }

  // Update social knowledge
  await updateSocialKnowledge(finder, journalOwner, entry);
}
```

---

## Memory Retrieval

### Retrieval for Decision Making

```typescript
async function retrieveRelevantMemories(
  agent: Agent,
  context: DecisionContext,
  limit: number = 10
): Promise<EpisodicMemory[]> {

  const candidates = agent.memory.episodic;

  // Score each memory for relevance
  const scored = candidates.map(memory => ({
    memory,
    score: calculateRelevanceScore(memory, context),
  }));

  // Sort by relevance
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  const retrieved = scored.slice(0, limit).map(s => s.memory);

  // Mark as recalled (affects future retrieval)
  for (const memory of retrieved) {
    memory.timesRecalled++;
    memory.lastRecalled = getCurrentTime();
  }

  return retrieved;
}

function calculateRelevanceScore(
  memory: EpisodicMemory,
  context: DecisionContext
): number {
  let score = 0;

  // Recency
  const age = daysSince(memory.timestamp);
  score += Math.exp(-age / 30) * 0.2;  // Decay over ~month

  // Importance
  score += memory.importance * 0.25;

  // Emotional intensity (emotional memories more accessible)
  score += memory.emotionalIntensity * 0.15;

  // Contextual similarity
  score += calculateContextSimilarity(memory, context) * 0.3;

  // Participant overlap
  if (context.involves?.some(id => memory.participants.includes(id))) {
    score += 0.2;
  }

  // Location similarity
  if (isNearLocation(memory.location, context.location)) {
    score += 0.1;
  }

  // Retrieval history (frequently recalled = easier to recall)
  score += Math.min(0.1, memory.timesRecalled * 0.02);

  // Clarity (degraded memories harder to retrieve)
  score *= memory.clarity;

  return score;
}
```

### Retrieval for Conversation

```typescript
async function retrieveForConversation(
  speaker: Agent,
  topic: ConversationTopic,
  otherAgent: Agent
): Promise<RetrievedMemories> {

  return {
    // Direct topic memories
    topicMemories: await searchMemoriesByTopic(speaker, topic),

    // Memories involving the other agent
    sharedMemories: await getSharedMemories(speaker, otherAgent),

    // Gossip: memories about third parties
    gossipMemories: await getGossipableMemories(speaker, otherAgent, topic),

    // Teaching: procedural knowledge to share
    teachableKnowledge: await getTeachableKnowledge(speaker, topic),

    // Opinions/beliefs about the topic
    relevantBeliefs: await getRelevantBeliefs(speaker, topic),
  };
}
```

---

## Memory Consolidation & Decay

### Consolidation (Short-term to Long-term)

```typescript
async function consolidateMemories(agent: Agent): Promise<void> {
  // Run during deep reflection or sleep

  const unconsolidated = agent.memory.episodic.filter(m => !m.consolidated);

  for (const memory of unconsolidated) {
    // High importance = consolidate
    if (memory.importance > 0.5) {
      memory.consolidated = true;
      memory.clarity = Math.min(1, memory.clarity + 0.1);  // Boost clarity
      continue;
    }

    // Frequently recalled = consolidate
    if (memory.timesRecalled > 3) {
      memory.consolidated = true;
      continue;
    }

    // Old and unimportant = decay or forget
    const age = daysSince(memory.timestamp);
    if (age > 14 && memory.importance < 0.3) {
      if (Math.random() < 0.3) {
        // Forget completely
        removeMemory(agent, memory);
      } else {
        // Just decay
        memory.clarity *= 0.8;
      }
    }
  }
}
```

### Memory Decay

```typescript
function applyMemoryDecay(agent: Agent): void {
  // Run periodically (daily)

  for (const memory of agent.memory.episodic) {
    if (memory.consolidated) {
      // Consolidated memories decay slowly
      memory.clarity *= 0.995;
    } else {
      // Unconsolidated decay faster
      memory.clarity *= 0.95;
    }

    // Emotional memories decay slower
    if (memory.emotionalIntensity > 0.6) {
      memory.clarity = Math.min(1, memory.clarity * 1.02);
    }

    // Very low clarity = forget
    if (memory.clarity < 0.1) {
      removeMemory(agent, memory);
    }
  }
}
```

### Forgetting

```typescript
function removeMemory(agent: Agent, memory: EpisodicMemory): void {
  // Don't just delete - leave traces

  // Add to "forgotten" index (for archaeology)
  agent.memory.forgottenIndex.push({
    id: memory.id,
    summary: memory.event.summary,
    forgottenAt: getCurrentTime(),
    wasAbout: memory.participants,
  });

  // Remove from active memory
  agent.memory.episodic = agent.memory.episodic.filter(m => m.id !== memory.id);

  // Semantic memories derived from this might remain
  // (You forget the event but keep the lesson)
}
```

---

## Collective Memory & Transmission

### Memory Sharing

```typescript
async function shareMemory(
  teller: Agent,
  listener: Agent,
  memory: EpisodicMemory
): Promise<void> {

  // Teller recounts the memory
  const recounting = await generateRecounting(teller, memory);

  // Listener forms their own memory of being told
  const listenerMemory = await createMemory(listener, {
    type: "teaching",  // or "social_interaction"
    summary: `${teller.name} told me about: ${memory.event.summary}`,
    details: {
      originalEvent: memory.event,
      toldBy: teller.id,
      howTold: recounting.style,
      theirPerspective: recounting.perspective,
    },
    // Importance affected by relationship and story quality
    importance: calculateStoryImportance(memory, teller, listener),
    // Secondhand memories are less clear
    clarity: 0.7,
  });

  // Listener might update semantic memory
  await considerInformationFromStory(listener, memory, teller);

  // This becomes part of shared cultural memory if told often
  if (memory.timesRecalled > 10) {
    markAsCollectiveMemory(memory);
  }
}
```

### Generational Memory

```typescript
interface CollectiveMemory {
  id: string;
  originalEvent: EventDescription;
  originalParticipants: string[];  // May be dead
  currentKnowers: string[];        // Who knows this story now
  tellingCount: number;            // How often shared
  firstTold: GameTime;
  lastTold: GameTime;

  // Evolution
  versions: StoryVersion[];        // How it's changed over time
  currentVersion: string;          // The "accepted" version
  contested: boolean;              // Multiple versions disagree

  // Status
  type: "legend" | "history" | "myth" | "gossip" | "tradition";
  importance: number;
}

// When an agent with unique memories dies
async function handleAgentDeath(agent: Agent): Promise<void> {
  // Their memories might be lost...
  const uniqueMemories = agent.memory.episodic.filter(
    m => !isKnownByOthers(m)
  );

  // ...unless they were shared
  for (const memory of uniqueMemories) {
    if (memory.timesRecalled === 0) {
      // Never shared = lost forever
      recordLostKnowledge(memory);
    }
  }

  // Memories about them become more significant
  for (const otherAgent of getAllAgents()) {
    const memoriesAboutDeceased = otherAgent.memory.episodic.filter(
      m => m.participants.includes(agent.id)
    );
    for (const memory of memoriesAboutDeceased) {
      memory.importance = Math.min(1, memory.importance + 0.2);
      memory.emotionalIntensity = Math.min(1, memory.emotionalIntensity + 0.3);
    }
  }
}
```

---

## Alien Memory Architectures

Different species have fundamentally different memory structures. Some share memories; some inherit memories; some have collective memory.

### Pack Mind Memory

Pack minds share memory across bodies:

```typescript
interface PackMindMemory {
  packId: string;
  bodies: string[];

  // ONE memory store for the whole pack
  sharedMemory: {
    episodic: EpisodicMemory[];
    semantic: SemanticMemory[];
    reflections: Reflection[];
  };

  // Per-body perception buffers
  bodyPerceptions: Map<string, PerceptionBuffer>;

  // Memory coherence
  coherenceLevel: number;              // How synchronized
  conflictingPerceptions: PerceptionConflict[];
}

interface PerceptionBuffer {
  bodyId: string;
  unintegratedPerceptions: Perception[];
  integrationDelay: number;            // Milliseconds to share
}

interface PerceptionConflict {
  body1: string;
  body2: string;
  perception1: Perception;
  perception2: Perception;
  resolution: "average" | "dominant" | "unresolved";
}
```

```
WHEN a pack body perceives something
THEN the memory system SHALL:
  1. Add to body's perception buffer
  2. After coherence delay, integrate into shared memory
  3. If bodies too far apart, delay increases
  4. If coherence < 50%, may create conflicting memories

Pack memory special properties:
  - All bodies remember what any body experienced
  - "I" in memories means the whole pack
  - Losing a body doesn't lose memories (but may lose skill)
  - New body integrated = memories shared to it

Memory during pack split:
  - Both new packs get copy of all memories
  - From split point, memories diverge
  - Meeting again = recognizing each other but different
```

### Hive Mind Memory

Hives have collective, not individual, memory:

```typescript
interface HiveMemory {
  hiveId: string;

  // Hive-level memory (the real memory)
  collectiveMemory: {
    strategicKnowledge: StrategicMemory[];   // What hive knows
    workerExperiences: AggregatedExperience[]; // Summarized worker data
    threats: ThreatMemory[];
    resources: ResourceMemory[];
  };

  // Individual workers have NO episodic memory
  // Only short-term task memory
  workerMemory: Map<string, WorkerTaskMemory>;
}

interface AggregatedExperience {
  category: string;
  summary: string;
  confidence: number;
  contributingWorkers: number;         // How many reported this
  lastUpdated: GameTime;
}

interface WorkerTaskMemory {
  currentTask: string;
  taskSteps: string[];
  temporaryKnowledge: string[];        // Forgotten after task

  // No long-term memory
  // No reflection
  // No personal history
}
```

```
WHEN a hive worker experiences something
THEN:
  1. Worker does NOT form episodic memory
  2. Experience reported to hive via network
  3. Hive integrates into aggregate knowledge
  4. Individual experience discarded

Hive memory properties:
  - Workers are interchangeable
  - Death of worker = no memory loss (already shared)
  - Worker cannot "remember" personal history
  - All workers access same knowledge pool

Queen/cerebrate memory:
  - Queens DO have individual memory
  - But heavily integrated with hive knowledge
  - Queen death = catastrophic memory loss
  - Must have succession planning for knowledge transfer
```

### Symbiont Inherited Memory

Symbionts carry memories across hosts:

```typescript
interface SymbiontMemory {
  symbiontId: string;
  currentHostId: string;

  // All past hosts' memories accessible
  inheritedMemories: InheritedMemoryBank;

  // Current host's memories
  currentHostMemories: EpisodicMemory[];

  // Integration status
  memoryIntegration: MemoryIntegration;
}

interface InheritedMemoryBank {
  hosts: HostMemorySet[];
  totalSpan: number;                   // Years of accumulated memory
  accessDifficulty: number;            // 0-1, how hard to access old memories
}

interface HostMemorySet {
  hostId: string;
  hostName: string;
  hostLifespan: { start: GameTime; end: GameTime };
  relationship: "beloved" | "tolerated" | "traumatic";

  // Their memories, now ours
  memories: EpisodicMemory[];
  skills: string[];
  relationships: RelationshipLegacy[];

  // Access properties
  clarity: number;                     // Degrades over hosts
  emotionalResonance: number;          // How vivid the feelings remain
}

interface RelationshipLegacy {
  otherAgentId: string;
  originalRelationship: string;
  currentStatus: "alive" | "dead" | "unknown";
  currentHostFeels: string;            // May be confused
}
```

```
WHEN symbiont joins new host
THEN memory system SHALL:
  1. Copy all current host memories to inherited bank
  2. Previous host marked as "past"
  3. New host can access all inherited memories
  4. But clarity degrades with "distance" (hosts ago)

Inherited memory access:
  - Recent hosts: Clear, easy to access
  - Old hosts: Fuzzy, requires effort
  - Very old hosts: Fragments, may be unreliable
  - Personality bleed: May have urges from past hosts

New host experiences past host memories as:
  - Dreams
  - Sudden recognitions
  - Unexplained emotional responses
  - "Knowing" things they never learned

Past host relationships:
  - May meet people who knew past host
  - Symbiont recognizes them; host confused
  - Complex situation: "You knew my past self"
  - Enemies of past hosts are... still enemies?
```

### Cyclical Being Memory

Species with long dormancy must preserve memory across sleep:

```typescript
interface CyclicalMemory {
  agentId: string;

  // Active phase memory (normal)
  activeMemory: AgentMemory;

  // Dormancy preservation
  preservedKnowledge: PreservedKnowledge;

  // Cross-cycle continuity
  cycleHistory: CycleMemorySet[];
}

interface PreservedKnowledge {
  method: "written" | "architectural" | "ritual" | "biological";
  reliability: number;                 // How much survives
  accessOnWaking: "immediate" | "gradual" | "requires_study";
}

interface CycleMemorySet {
  cycleNumber: number;
  activeStart: GameTime;
  dormancyStart: GameTime;

  // What was remembered from this cycle
  preservedMemories: string[];         // Summary only
  lostMemories: string[];              // What was forgotten
  skillsRetained: string[];
  skillsLost: string[];
  relationshipsAcrossDormancy: DormancyRelationship[];
}

interface DormancyRelationship {
  otherAgentId: string;
  statusAtDormancy: string;
  statusAtWaking: "alive" | "dead" | "also_dormant" | "unknown";
  relationshipChange: string;
}
```

```
WHEN cyclical being enters dormancy
THEN memory system SHALL:
  1. Evaluate which memories are "preserved"
  2. Apply degradation to non-preserved
  3. Store preservation record
  4. On waking, load preserved + degraded

Dormancy memory loss:
  - 30% clarity loss for non-preserved memories
  - Skills degrade 10-20%
  - Relationships with non-dormant beings may end
  - If other being dies during dormancy, may not know

Preservation methods affect survival:
  - Written: High reliability, requires literacy
  - Architectural: Moderate, monuments as memory
  - Ritual: Generational if others survived
  - Biological: Low reliability, dreams and instincts only

Waking confusion:
  - "Where is [person who died 30 years ago]?"
  - "Why is this building here?" (built during dormancy)
  - "Who are all these new people?"
  - Generation gap with non-dormant species
```

### Geological-Timescale Memory

Beings that think in millennia have different memory properties:

```typescript
interface GeologicalMemory {
  agentId: string;

  // Extremely long-term, extremely sparse
  memory: {
    epochs: EpochMemory[];             // Major time periods
    civilizations: CivilizationMemory[]; // Peoples they've known
    events: GeologicalEventMemory[];   // Things that mattered to them
  };

  // What they DON'T remember
  ignoredTimescale: {
    individualLives: true;             // Too fast to notice
    seasons: true;                     // Imperceptible
    decades: "barely noticeable";
    centuries: "short-term memory";
  };
}

interface EpochMemory {
  name: string;
  duration: { start: GameTime; end: GameTime };  // Thousands of years
  summary: string;
  significance: string;

  // Detailed memories from this epoch
  notableEvents: string[];             // A few per millennium
  civilizationsKnown: string[];
}

interface CivilizationMemory {
  civilizationId: string;
  firstContact: GameTime;
  lastContact: GameTime;
  opinion: string;

  // They don't remember individuals
  // Just "that people"
  currentStatus: "thriving" | "declining" | "extinct" | "unknown";
  interactionHistory: string[];        // Very sparse
}
```

```
WHEN geological being perceives event
THEN memory system SHALL:
  1. Evaluate if event persists > 1 year
  2. If not, do NOT form memory (invisible to them)
  3. If yes, add to pending observations
  4. After centuries, integrate into epoch memory

Geological memory properties:
  - Cannot remember individual mortals
  - CAN remember lineages, peoples, places
  - "That family" spans 10 generations for them
  - Time estimates wildly inaccurate for fast beings

Communication with mortal memory:
  - Stone Eater: "We spoke recently"
  - Human historian: "That was 200 years ago"
  - Stone Eater: "Yes, recently"

Meeting across timescales:
  - Mortal makes impression on geological being
  - Geological being responds... eventually
  - Mortal is long dead
  - Descendant receives response, confused
  - Geological being doesn't understand why different person
```

### Incomprehensible Entity Memory

Some beings have memory structures we cannot understand:

```typescript
interface IncomprehensibleMemory {
  entityId: string;

  // We cannot model their actual memory
  // Only observable effects

  observable: {
    // They seem to remember things
    recognizes: string[];              // Entities/places they respond to
    reactsTo: string[];                // Triggers that cause response
    patterns: string[];                // Behavioral patterns observed
  };

  // We don't know
  unknown: {
    internalState: "unknowable";
    howTheyStore: "unknowable";
    whatTheyValue: "unknowable";
    timePerception: "unknowable";
  };

  // Only known through Translators
  translatorReports: TranslatorReport[];
}

interface TranslatorReport {
  translatorId: string;
  timestamp: GameTime;
  content: string;                     // What translator understood
  confidence: number;                  // How sure they are
  sanityLoss: number;                  // Cost of learning this
}
```

```
WHEN attempting to understand incomprehensible entity memory
THEN the system SHALL:
  1. NOT model their internal state
  2. Only track observable behaviors
  3. Translators may provide insight (unreliable)
  4. Accept that understanding is impossible

Implications:
  - Cannot predict what they'll remember
  - Cannot be sure they "forgot" anything
  - May respond to things from millions of years ago
  - May not respond to things we think important
  - Their "memory" may not be temporal at all
```

---

## Summary

| Aspect | When/How |
|--------|----------|
| **Memory Formation** | After significant events, all social interactions, discoveries, firsts |
| **End-of-Day Reflection** | Every night when resting - process the day |
| **Deep Reflection** | Weekly/seasonally - consolidate and find meaning |
| **Conversation** | Proximity + relationship + need triggers; forms memories for both |
| **Journaling** | Personality-driven; creates discoverable artifacts |
| **Retrieval** | Relevance-scored; recency + importance + context |
| **Decay** | Gradual clarity loss; unconsolidated fade faster |
| **Transmission** | Storytelling, teaching; creates secondhand memories |
| **Death** | Unique memories lost; memories of them gain importance |

---

## Related Specs

**Core Integration:**
- `agent-system/spec.md` - Agent architecture
- `agent-system/species-system.md` - Species-specific memory architectures
- `agent-system/needs.md` - Memories of needs being met/unmet
- `agent-system/spatial-memory.md` - Location-based memories

**Memory Applications:**
- `agent-system/chroniclers.md` - Journals may become chronicles, shared memories
- `progression-system/spec.md` - Emergence through memory
- `research-system/spec.md` - Knowledge accumulation
- `agent-system/relationship-system.md` - Symbiont relationship inheritance

**Simulation Scale:**
- `world-system/abstraction-layers.md` - Catch-up memories when upgrading village detail
