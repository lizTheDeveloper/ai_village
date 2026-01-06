# Conversation Scheduler - Turn-Based Speech System

## Overview

A conversation scheduling system that:
- **Extends existing ConversationComponent** for multi-party support
- Tracks active conversations and participants
- Calculates speech duration from token count (2 tokens/second)
- **Gives players time to read dialogue** (natural pacing)
- Queues speakers to prevent interruptions
- Pre-fetches LLM responses ~1 second before agent's turn
- Manages joining/leaving based on proximity (15 tile hearing range)
- **Extroversion-based force vectors** (extroverts attracted to crowds, introverts repelled)
- Locks Talker LLM while agent is in conversation

## Core Concept

**Speech takes time.** If an LLM returns 50 tokens, the agent speaks for 25 seconds at 2 tokens/second. Other agents shouldn't interrupt - they wait their turn.

**Predictive LLM calling.** Don't wait until speaker finishes to call next LLM. Call it ~1 second before they finish, so the response is ready when it's their turn.

## Speech Duration Calculation

```typescript
const SPEECH_RATE = 2;  // tokens per second (game time or real time)

function calculateSpeechDuration(tokenCount: number): number {
  return tokenCount / SPEECH_RATE;  // seconds
}

// Example:
// LLM returns: "Hey Luna, want to help me gather some berries?" (10 tokens)
// Speech duration: 10 / 2 = 5 seconds
// Agent speaks from T=0 to T=5
// Next agent can't speak until T=5
```

## Extending Existing ConversationComponent

**Current:** 1:1 conversations (`packages/core/src/components/ConversationComponent.ts`)

```typescript
// Existing (1:1)
interface ConversationComponent {
  type: 'conversation';
  partnerId: EntityId | null;  // Single partner
  messages: ConversationMessage[];
  maxMessages: number;
  startedAt: Tick;
  lastMessageAt: Tick;
  isActive: boolean;
}
```

**Extension:** Multi-party conversations

```typescript
// Extended (multi-party)
interface ConversationComponent {
  type: 'conversation';
  partnerId: EntityId | null;  // Backward compatible (primary partner)
  participants: Set<EntityId>;  // NEW: All participants (including self)
  messages: ConversationMessage[];
  maxMessages: number;
  startedAt: Tick;
  lastMessageAt: Tick;
  isActive: boolean;

  // NEW: Multi-party fields
  conversationId?: string;  // Shared conversation ID
  currentSpeaker?: EntityId;  // Who's speaking now
  speakerEndsAt?: Tick;  // When current speaker finishes
}
```

**Migration:** Backward compatible
- If `participants` undefined → 1:1 conversation (use `partnerId`)
- If `participants` defined → multi-party conversation
- `partnerId` still used as "primary partner" for UI display

## Conversation Data Structure

```typescript
interface ActiveConversation {
  /** Unique conversation ID */
  id: string;

  /** Agent IDs in this conversation */
  participants: Set<string>;

  /** Center point of conversation (average of participant positions) */
  location: { x: number; y: number };

  /** Current speaker (if any) */
  currentSpeaker: {
    agentId: string;
    startedAt: number;      // Game time when they started speaking
    endsAt: number;         // Game time when they finish speaking
    tokenCount: number;     // How many tokens in their speech
  } | null;

  /** Queue of agents waiting to speak */
  speakerQueue: Array<{
    agentId: string;
    joinedAt: number;       // When they joined queue
    prefetchStarted: boolean;  // Have we called their LLM yet?
  }>;

  /** Conversation history (for context) */
  history: Array<{
    agentId: string;
    text: string;
    timestamp: number;
  }>;

  /** Creation time */
  createdAt: number;
}
```

## Conversation Lifecycle

### 1. Starting a Conversation

**Trigger:** Agent speaks aloud (using Talker LLM)

```typescript
// Agent decides to speak
const response = await talkerLLM.generate(prompt);
// Response: { speaking: "Hey Luna, want to help me gather berries?", tokenCount: 10 }

// Create or join conversation
conversationScheduler.onAgentSpeak({
  agentId: agent.id,
  position: agent.position,
  text: response.speaking,
  tokenCount: response.tokenCount,
  world: world,
});
```

**What happens:**
1. Check if agent is near existing conversation (<15 tiles)
2. If yes: Join that conversation, add to speaker queue
3. If no: Create new conversation with this agent as first speaker

### 2. Joining a Conversation

**Trigger:** Agent speaks nearby OR agent walks into hearing range of active conversation

```typescript
class ConversationScheduler {
  private HEARING_RANGE = 15;  // tiles

  /**
   * Check if any nearby agents should join conversation.
   */
  checkProximityJoin(conversation: ActiveConversation, world: World): void {
    const nearbyAgents = world.query()
      .with('agent')
      .with('position')
      .executeEntities()
      .filter(agent => {
        const distance = distanceTo(agent.position, conversation.location);
        return distance <= this.HEARING_RANGE;
      });

    for (const agent of nearbyAgents) {
      if (!conversation.participants.has(agent.id)) {
        this.joinConversation(conversation, agent.id);
      }
    }
  }

  private joinConversation(conversation: ActiveConversation, agentId: string): void {
    conversation.participants.add(agentId);

    // Mark agent as "in conversation" (Talker locked)
    const agent = world.getEntity(agentId);
    agent.addComponent({
      type: 'in_conversation',
      conversationId: conversation.id,
      joinedAt: world.time,
    });

    console.log(`${agent.name} joined conversation ${conversation.id}`);
  }
}
```

### 3. Turn-Based Speaking

**Current speaker talks, others wait in queue.**

```typescript
update(world: World): void {
  for (const conversation of this.activeConversations.values()) {
    // Check if current speaker finished
    if (conversation.currentSpeaker && world.time >= conversation.currentSpeaker.endsAt) {
      // Speaker finished, move to next in queue
      this.advanceToNextSpeaker(conversation, world);
    }

    // Check if we should prefetch next speaker's response
    if (conversation.currentSpeaker) {
      const timeUntilDone = conversation.currentSpeaker.endsAt - world.time;

      if (timeUntilDone <= 1.0 && conversation.speakerQueue.length > 0) {
        // ~1 second before current speaker finishes, call next speaker's LLM
        this.prefetchNextSpeaker(conversation, world);
      }
    }
  }
}
```

### 4. Predictive LLM Pre-fetching

**Call LLM ~1 second before agent's turn so response is ready.**

```typescript
private prefetchNextSpeaker(conversation: ActiveConversation, world: World): void {
  const nextInQueue = conversation.speakerQueue[0];
  if (!nextInQueue || nextInQueue.prefetchStarted) return;

  const agent = world.getEntity(nextInQueue.agentId);
  if (!agent) return;

  // Mark as prefetched (don't call again)
  nextInQueue.prefetchStarted = true;

  // Call Talker LLM NOW (1 second before their turn)
  scheduler.enqueue({
    universeId: world.id,
    agentId: agent.id,

    promptBuilder: (agent, world) => {
      return buildConversationPrompt(agent, world, {
        conversation: conversation,
        conversationHistory: conversation.history,
        currentSpeaker: conversation.currentSpeaker,
        participants: Array.from(conversation.participants).map(id => world.getEntity(id)),
      });
    },

    llmType: 'talker',
    priority: 8,  // HIGH (active conversation)

    onComplete: (response) => {
      // Store response - will be "spoken" when it's their turn
      agent.addComponent({
        type: 'pending_speech',
        text: response.speaking,
        tokenCount: response.tokenCount,
        conversationId: conversation.id,
      });

      console.log(`${agent.name}'s response ready: "${response.speaking}" (${response.tokenCount} tokens)`);
    },
  });
}
```

### 5. Advancing to Next Speaker

**Current speaker finishes, next speaker starts immediately.**

```typescript
private advanceToNextSpeaker(conversation: ActiveConversation, world: World): void {
  // Add current speaker's text to history
  if (conversation.currentSpeaker) {
    const agent = world.getEntity(conversation.currentSpeaker.agentId);
    const speech = agent?.getComponent('speaking');

    conversation.history.push({
      agentId: conversation.currentSpeaker.agentId,
      text: speech?.text || '',
      timestamp: world.time,
    });

    // Clear "speaking" state
    agent?.removeComponent('speaking');
  }

  // Pop next speaker from queue
  const nextSpeaker = conversation.speakerQueue.shift();
  if (!nextSpeaker) {
    // No one else wants to talk
    conversation.currentSpeaker = null;
    return;
  }

  const agent = world.getEntity(nextSpeaker.agentId);
  if (!agent) return;

  // Check if response is ready
  const pendingSpeech = agent.getComponent('pending_speech');
  if (!pendingSpeech) {
    console.warn(`${agent.name}'s turn but no speech ready! (prefetch failed?)`);
    // Skip this speaker, try next
    this.advanceToNextSpeaker(conversation, world);
    return;
  }

  // Start speaking NOW
  const speechDuration = this.calculateSpeechDuration(pendingSpeech.tokenCount);

  conversation.currentSpeaker = {
    agentId: agent.id,
    startedAt: world.time,
    endsAt: world.time + speechDuration,
    tokenCount: pendingSpeech.tokenCount,
  };

  // Apply speech to agent
  agent.addComponent({
    type: 'speaking',
    text: pendingSpeech.text,
    startedAt: world.time,
    endsAt: world.time + speechDuration,
  });

  // Remove pending speech
  agent.removeComponent('pending_speech');

  console.log(`${agent.name} starts speaking: "${pendingSpeech.text}" (${speechDuration}s)`);
}
```

### 6. Leaving a Conversation

**Trigger:** Agent walks >15 tiles away from conversation center

```typescript
private checkProximityLeave(conversation: ActiveConversation, world: World): void {
  for (const participantId of conversation.participants) {
    const agent = world.getEntity(participantId);
    if (!agent) {
      conversation.participants.delete(participantId);
      continue;
    }

    const position = agent.getComponent('position');
    const distance = Math.sqrt(
      (position.x - conversation.location.x) ** 2 +
      (position.y - conversation.location.y) ** 2
    );

    if (distance > this.HEARING_RANGE) {
      this.leaveConversation(conversation, participantId);
    }
  }
}

private leaveConversation(conversation: ActiveConversation, agentId: string): void {
  conversation.participants.delete(agentId);

  // Remove from speaker queue
  conversation.speakerQueue = conversation.speakerQueue.filter(s => s.agentId !== agentId);

  // If they were current speaker, advance to next
  if (conversation.currentSpeaker?.agentId === agentId) {
    this.advanceToNextSpeaker(conversation, world);
  }

  // Unlock Talker
  const agent = world.getEntity(agentId);
  agent?.removeComponent('in_conversation');

  console.log(`${agent?.name} left conversation ${conversation.id}`);
}
```

## Talker Locking

**While in conversation, agent's Talker LLM is "locked" - can't be called for other things.**

```typescript
// In AgentBrainSystem.ts

private shouldCallTalker(agent: Entity, world: World): boolean {
  // ⚠️ Check if agent is in conversation
  if (agent.hasComponent('in_conversation')) {
    // Talker is locked - they're in a conversation
    // Only the ConversationScheduler can call their Talker
    return false;
  }

  // Normal Talker calling logic
  const personality = agent.getComponent('personality');
  const needs = agent.getComponent('needs');

  if (personality.extraversion > 0.6 && agent.nearbyAgents.length > 0) {
    return true;
  }

  if (needs.socialDepth < 0.3) {
    return true;
  }

  return false;
}
```

## Conversation Prompt Context

**Include conversation history and participants in prompt.**

```typescript
function buildConversationPrompt(
  agent: Agent,
  world: World,
  context: {
    conversation: ActiveConversation;
    conversationHistory: Array<{ agentId: string; text: string; timestamp: number }>;
    currentSpeaker: { agentId: string; endsAt: number } | null;
    participants: Agent[];
  }
): string {
  const otherParticipants = context.participants
    .filter(p => p.id !== agent.id)
    .map(p => p.name);

  return `
You are ${agent.name}, currently in a conversation with ${otherParticipants.join(', ')}.

UNCONSCIOUS URGES: ${agent.soul.unconsciousUrges.join(', ')}

CONVERSATION HISTORY:
${context.conversationHistory.slice(-5).map(msg => {
  const speaker = world.getEntity(msg.agentId);
  return `${speaker?.name}: "${msg.text}"`;
}).join('\n')}

${context.currentSpeaker ? `
CURRENT SPEAKER: ${world.getEntity(context.currentSpeaker.agentId)?.name} is speaking now. They'll finish in ${context.currentSpeaker.endsAt - world.time} seconds.
` : ''}

It's your turn to speak. What do you say?

Response format:
{
  "speaking": "what you say out loud to the group",
  "action": {"type": "stay_silent"} OR {"type": "leave_conversation"}
}
  `.trim();
}
```

## Example Timeline

### Scenario: Luna and Kai have a conversation

```
T=0.0s: Luna speaks: "Hey Kai, want to help me gather berries?" (10 tokens)
        - Create conversation CONV_001
        - Luna is current speaker
        - Luna speaks until T=5.0s (10 tokens / 2 = 5 seconds)
        - Kai is within 15 tiles, joins conversation

T=1.0s: Kai added to speaker queue
        - Queue: [Kai]

T=4.0s: Pre-fetch Kai's response (1 second before Luna finishes)
        - Call Talker LLM for Kai
        - Prompt includes: "Luna: 'Hey Kai, want to help me gather berries?'"

T=4.5s: Kai's response ready: "Sure! I know a good spot nearby." (7 tokens)
        - Store as pending_speech on Kai
        - Kai will speak for 3.5 seconds (7 / 2)

T=5.0s: Luna finishes speaking
        - Advance to next speaker (Kai)
        - Kai starts speaking immediately
        - Kai speaks until T=8.5s

T=6.0s: Ren walks within 15 tiles, joins conversation
        - Ren added to participants
        - Ren can join speaker queue on next turn

T=7.5s: Pre-fetch Luna's next response (1 second before Kai finishes)
        - Call Talker LLM for Luna
        - Prompt includes conversation history (Luna + Kai)

T=8.5s: Kai finishes speaking
        - Advance to Luna
        - Luna starts speaking immediately

T=10.0s: Kai walks 20 tiles away
         - Kai leaves conversation (out of hearing range)
         - Kai removed from participants
         - Talker unlocked for Kai
```

## Extroversion-Based Force Vectors

**Extroverts are attracted to large conversations (4+ people). Introverts avoid crowds but are fine with small groups.**

**IMPORTANT:** Introverts only avoid LARGE crowds (4+ people). They're fine with 1:1 or small groups (2-3 people).

```typescript
class ConversationForceSystem extends System {
  private readonly LARGE_CONVERSATION_THRESHOLD = 4;  // 4+ people = "crowd"
  private readonly HEARING_RANGE = 15;  // Same as conversation range
  private readonly EXTROVERT_THRESHOLD = 0.6;
  private readonly INTROVERT_THRESHOLD = 0.4;  // Most people > 0.4 (rarely below)
  private readonly FORCE_MAGNITUDE = 0.3;  // Steering force strength

  update(world: World, entities: Entity[]): void {
    // Find all active conversations with 4+ participants
    const largeConversations = this.findLargeConversations(world);

    for (const agent of entities) {
      const personality = agent.getComponent('personality');
      if (!personality) continue;

      const steering = agent.getComponent('steering');
      if (!steering) continue;

      // Check each large conversation
      for (const conversation of largeConversations) {
        const distance = distanceTo(agent.position, conversation.location);

        // Only apply force if within hearing range
        if (distance > this.HEARING_RANGE) continue;

        // Skip if already in this conversation
        if (conversation.participants.has(agent.id)) continue;

        // Calculate force direction
        const direction = normalize({
          x: conversation.location.x - agent.position.x,
          y: conversation.location.y - agent.position.y,
        });

        // Extroverts: attracted to crowds
        if (personality.extraversion > this.EXTROVERT_THRESHOLD) {
          // "What's going on over there? I'm intrigued!"
          const force = {
            x: direction.x * this.FORCE_MAGNITUDE,
            y: direction.y * this.FORCE_MAGNITUDE,
          };

          steering.addForce('conversation_attraction', force);

          // Maybe even trigger Talker to say something
          if (Math.random() < 0.1) {  // 10% chance per frame
            agent.addComponent({
              type: 'social_urge',
              type: 'join_conversation',
              conversationId: conversation.id,
            });
          }
        }

        // Introverts: repelled by crowds
        if (personality.extraversion < this.INTROVERT_THRESHOLD) {
          // "Ugh, there's like 4 people over there. I'm headed away."
          const force = {
            x: -direction.x * this.FORCE_MAGNITUDE,  // Opposite direction
            y: -direction.y * this.FORCE_MAGNITUDE,
          };

          steering.addForce('conversation_avoidance', force);
        }
      }
    }
  }

  private findLargeConversations(world: World): Array<{
    id: string;
    location: { x: number; y: number };
    participants: Set<string>;
  }> {
    const conversations: Map<string, any> = new Map();

    // Group agents by conversation ID
    const agents = world.query().with('conversation').with('position').executeEntities();

    for (const agent of agents) {
      const conv = agent.getComponent('conversation');
      if (!conv.isActive || !conv.conversationId) continue;

      if (!conversations.has(conv.conversationId)) {
        conversations.set(conv.conversationId, {
          id: conv.conversationId,
          participants: new Set(),
          positions: [],
        });
      }

      const data = conversations.get(conv.conversationId);
      data.participants.add(agent.id);
      data.positions.push(agent.getComponent('position'));
    }

    // Filter to large conversations (4+ participants)
    const largeConversations = [];
    for (const [id, data] of conversations) {
      if (data.participants.size >= this.LARGE_CONVERSATION_THRESHOLD) {
        // Calculate center of conversation
        const avgX = data.positions.reduce((sum, p) => sum + p.x, 0) / data.positions.length;
        const avgY = data.positions.reduce((sum, p) => sum + p.y, 0) / data.positions.length;

        largeConversations.push({
          id,
          location: { x: avgX, y: avgY },
          participants: data.participants,
        });
      }
    }

    return largeConversations;
  }
}
```

### Example: Extrovert Behavior

```
T=0s: Luna (extraversion: 0.8) is gathering berries alone
T=5s: Luna hears conversation 50 tiles away (Kai, Ren, Mia, Zara - 4 people)
      - Too far, no force applied

T=20s: Luna walks closer (now 10 tiles away)
       - Force vector applied TOWARD conversation
       - Luna drifts toward the group while gathering
       - "What's going on over there? I'm intrigued!"

T=45s: Luna enters hearing range (within 15 tiles)
       - Automatically added to conversation participants
       - Joins speaker queue

T=50s: Luna's turn to speak
       - "Hey everyone, what are you all talking about?"
```

### Example: Introvert Behavior

```
T=0s: Zara (extraversion: 0.2) is crafting alone
T=5s: Large conversation starts nearby (Kai, Ren, Mia, Nova - 4 people)
      - Within 15 tiles
      - Force vector applied AWAY from conversation
      - Zara drifts away while crafting
      - "Ugh, there's like 4 people over there. I'm headed away."

T=20s: Zara now 18 tiles away
       - Out of hearing range
       - Force vector no longer applied
       - Continues crafting in peace
```

### Emergent Dynamics

**Extroverts form crowds:**
- Extroverts attracted to large conversations (4+ people)
- Large conversations attract more extroverts
- Creates "social hotspots" where extroverts congregate

**Introverts prefer small groups:**
- Introverts repelled by LARGE conversations (4+ people)
- **Fine with 1:1 or small groups (2-3 people)** - no avoidance
- Tend to work alone or in pairs
- Find quiet corners when crowds form
- **Very low extraversion (<0.2) is rare** - most agents 0.2-0.8

**Mixed groups:**
- Moderate extraversion (0.4-0.6) → no force applied
- Creates natural mix of personality types

**Dynamic conversation size:**
- Conversations grow as extroverts join
- Conversations shrink as introverts leave
- Reaches equilibrium based on personality distribution

## Integration with LLM Scheduler

```typescript
class ConversationScheduler {
  private scheduler: LLMRequestScheduler;

  private prefetchNextSpeaker(conversation: ActiveConversation, world: World): void {
    const nextInQueue = conversation.speakerQueue[0];
    if (!nextInQueue || nextInQueue.prefetchStarted) return;

    nextInQueue.prefetchStarted = true;

    // Use LLM scheduler for predictive calling
    this.scheduler.enqueue({
      universeId: world.id,
      agentId: nextInQueue.agentId,

      // ⚠️ Lazy prompt builder (conversation state fresh at send time)
      promptBuilder: (agent, world) => {
        // Get latest conversation state
        const conversation = this.activeConversations.get(conversationId);
        return buildConversationPrompt(agent, world, {
          conversation,
          conversationHistory: conversation.history,
          currentSpeaker: conversation.currentSpeaker,
          participants: Array.from(conversation.participants).map(id => world.getEntity(id)),
        });
      },

      llmType: 'talker',
      priority: 8,  // HIGH (active conversation - higher than background chat)

      onComplete: (response) => {
        agent.addComponent({
          type: 'pending_speech',
          text: response.speaking,
          tokenCount: response.tokenCount,
          conversationId: conversation.id,
        });
      },
    });
  }
}
```

## Conversation Center Calculation

**Conversation center = average position of all participants.**

```typescript
private updateConversationLocation(conversation: ActiveConversation, world: World): void {
  let totalX = 0;
  let totalY = 0;
  let count = 0;

  for (const participantId of conversation.participants) {
    const agent = world.getEntity(participantId);
    if (!agent) continue;

    const position = agent.getComponent('position');
    totalX += position.x;
    totalY += position.y;
    count++;
  }

  if (count > 0) {
    conversation.location = {
      x: totalX / count,
      y: totalY / count,
    };
  }
}
```

## Edge Cases

### 1. Agent Wants to Join Mid-Conversation

```typescript
// Agent walks into hearing range while conversation active
// → Automatically added to participants
// → Can join speaker queue on next opportunity
// → Receives conversation history in prompt when it's their turn
```

### 2. All Agents Leave Conversation

```typescript
private update(world: World): void {
  for (const [convId, conversation] of this.activeConversations) {
    // Remove empty conversations
    if (conversation.participants.size === 0) {
      console.log(`Conversation ${convId} ended (no participants)`);
      this.activeConversations.delete(convId);
    }
  }
}
```

### 3. Agent's Response Not Ready When It's Their Turn

```typescript
// Pre-fetch failed (LLM too slow, credits exhausted, etc.)
// → Skip this speaker, advance to next
// → Log warning
// → Agent can try again next round

if (!agent.hasComponent('pending_speech')) {
  console.warn(`${agent.name}'s turn but no speech ready!`);
  this.advanceToNextSpeaker(conversation, world);  // Skip
}
```

### 4. Agent Decides to Leave Conversation Voluntarily

```typescript
// Agent's LLM returns: {"action": {"type": "leave_conversation"}}
// → Remove from participants
// → Remove from speaker queue
// → Unlock Talker
// → If they were current speaker, advance to next

if (response.action?.type === 'leave_conversation') {
  this.leaveConversation(conversation, agent.id);
}
```

### 5. Two Agents Start Speaking Simultaneously

```typescript
// If two agents both call Talker at same time and both create conversations:
// → Merge into one conversation (first one wins)
// → Second speaker joins first conversation
// → Added to speaker queue instead of creating duplicate

private onAgentSpeak(agentId: string, position: Position, ...): void {
  // Check for nearby conversations first
  const nearby = this.findNearbyConversation(position);

  if (nearby) {
    // Join existing conversation instead of creating new one
    this.joinConversation(nearby, agentId);
    this.addToSpeakerQueue(nearby, agentId);
  } else {
    // Create new conversation
    this.createConversation(agentId, position);
  }
}
```

## Component Definitions

### ConversationParticipantComponent

```typescript
interface ConversationParticipantComponent extends Component {
  type: 'in_conversation';
  conversationId: string;
  joinedAt: number;  // Game time when joined
  role: 'speaker' | 'listener';  // Current role
}
```

### PendingSpeechComponent

```typescript
interface PendingSpeechComponent extends Component {
  type: 'pending_speech';
  text: string;
  tokenCount: number;
  conversationId: string;
  generatedAt: number;  // When LLM response received
}
```

### SpeakingComponent

```typescript
interface SpeakingComponent extends Component {
  type: 'speaking';
  text: string;
  startedAt: number;   // When agent started speaking
  endsAt: number;      // When they'll finish
  conversationId?: string;  // If part of conversation
}
```

## Benefits

1. ✅ **No interruptions** - Agents wait their turn to speak
2. ✅ **Natural pacing** - Speech duration matches token count
3. ✅ **Smooth transitions** - Next response ready before current speaker finishes
4. ✅ **Proximity-based** - Agents join/leave based on hearing range
5. ✅ **Talker locking** - Agents in conversation don't get distracted
6. ✅ **Multi-party support** - Any number of agents can join
7. ✅ **Context-aware** - Each speaker gets full conversation history

## Next Steps

1. Implement `ConversationScheduler` class (`packages/core/src/conversation/ConversationScheduler.ts`)
2. Add conversation components to component registry
3. Integrate with `AgentBrainSystem` (Talker locking)
4. Update `buildConversationPrompt()` to include history
5. Add conversation visualization to renderer (speech bubbles with timers)
6. Test multi-party conversations (3+ agents)
7. Test proximity join/leave mechanics
