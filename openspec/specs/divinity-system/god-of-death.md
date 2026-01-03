> **System:** divinity-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# God of Death Entity & Death Bargaining Conversations

## Overview

The God of Death is a special deity entity that **manifests when the first ensouled agent dies**. This creates a dramatic moment: "The God of Death has entered the chat."

Unlike abstract systems, the God of Death is a **visible, conversational entity** that agents can observe and interact with during death bargaining challenges.

## Core Principles

1. **Physical Manifestation**: The God of Death appears as an entity at the location of death
2. **Memory & Persistence**: Remembers all death bargains, who succeeded, who failed, past riddles
3. **Conversational**: Death bargains happen as observable conversations using ConversationComponent
4. **Spectacle**: Other agents can witness death bargaining happening in real-time
5. **Judgment Mode**: Uses LLM to judge riddle answers (not string matching)

## Entity Structure

### Components

The God of Death entity has:

```typescript
{
  // Identity
  identity: {
    name: "Thanatos" | "Anubis" | "Hel" | generated_name,
    title: "God of Death",
    pronouns: "they/them" // or based on mythology
  },

  // Positioning - manifests at death location
  position: {
    x: death_location.x,
    y: death_location.y
  },

  // Visual appearance
  sprite: {
    sprite: "god_of_death", // Hooded figure, skeletal, etc.
    scale: 2.0, // Larger than mortals
    glow: true, // Divine presence
    opacity: 0.8 // Slightly translucent
  },

  // Memory system - CRITICAL
  episodic_memory: {
    memories: [
      // Every death bargain
      {
        type: "death_bargain",
        entityId: "hero_123",
        entityName: "Aldric the Brave",
        riddle: "What walks on four legs...",
        heroAnswer: "man",
        succeeded: true,
        timestamp: tick
      },
      // Conversations with the living
      {
        type: "conversation",
        partnerId: "curious_sage_42",
        topic: "the nature of death",
        quality: "high"
      }
    ]
  },

  // Relationship tracking
  relationship: {
    // Tracks relationships with mortals
    // Those who cheated death, those who failed, etc.
  },

  // Conversation capability
  conversation: {
    partnerId: null, // Current conversation partner
    messages: [],
    topics: ["death", "destiny", "riddles", "the_afterlife"]
  },

  // Special deity tag
  tags: {
    tags: ["deity", "immortal", "death_god", "psychopomp"]
  },

  // Death bargain state (when active)
  death_bargain: {
    // Added when actively bargaining with someone
  }
}
```

## Manifestation System

### When God of Death Appears

1. **First Ensouled Death**: When `qualifiesForDeathBargain()` returns true for the first time
2. **Subsequent Deaths**: God of Death is already present, just moves to new location
3. **Idle State**: When not bargaining, wanders or stays in a temple/underworld location

### Manifestation Flow

```typescript
// In DeathBargainSystem
onFirstQualifiedDeath(world: World, dyingAgent: Entity, deathLocation: Point) {
  // Check if God of Death exists
  let deathGod = world.query()
    .with(CT.Tags)
    .executeEntities()
    .find(e => {
      const tags = e.getComponent(CT.Tags);
      return tags?.tags.has('death_god');
    });

  if (!deathGod) {
    // FIRST TIME - Create God of Death
    deathGod = createGodOfDeath(world, deathLocation);

    world.eventBus.emit({
      type: 'deity:manifested',
      source: 'death_bargain_system',
      data: {
        deityId: deathGod.id,
        deityName: 'God of Death',
        reason: 'first_ensouled_death',
        location: deathLocation,
        message: 'The God of Death has entered the chat'
      }
    });
  } else {
    // Move existing God of Death to death location
    const pos = deathGod.getComponent(CT.Position);
    if (pos) {
      pos.x = deathLocation.x;
      pos.y = deathLocation.y;
    }
  }

  // Start death bargain conversation
  startDeathBargainConversation(world, deathGod, dyingAgent);
}
```

## Death Bargaining as Conversation

### Conversation Flow

Death bargaining uses **ConversationComponent** so it's observable:

```typescript
interface DeathBargainConversation {
  phase: 'greeting' | 'offer' | 'riddle' | 'answer' | 'judgment' | 'outcome';

  messages: [
    {
      speaker: 'death_god',
      text: 'Mortal, your thread was to be cut this day...',
      timestamp: tick
    },
    {
      speaker: 'hero',
      text: 'I accept your challenge, Lord of Death.',
      timestamp: tick + 1
    },
    {
      speaker: 'death_god',
      text: 'Listen well. What walks on four legs in the morning...',
      timestamp: tick + 2
    },
    {
      speaker: 'hero',
      text: 'Man.',
      timestamp: tick + 5
    },
    {
      speaker: 'death_god',
      text: '... Impressive. You have answered correctly.',
      timestamp: tick + 6
    }
  ]
}
```

### Observable by Others

Other agents can:
- **See the conversation happening** if they're nearby
- **Move to the location** to watch
- **Gain memories** of witnessing a death bargain
- **Be intimidated/impressed** based on outcome

```typescript
// In observer agent's memory
{
  type: 'witnessed_event',
  event: 'death_bargain',
  participants: ['god_of_death', 'hero_aldric'],
  outcome: 'hero_resurrected',
  emotion: 'awe',
  importance: 10 // Very memorable
}
```

## Memory & Learning

The God of Death **remembers everything**:

### What God of Death Remembers

1. **Every Death Bargain**
   - Who attempted
   - What riddle was posed
   - How they answered
   - Success/failure
   - How many attempts

2. **Patterns**
   - "This mortal has cheated death twice before"
   - "Three heroes from this bloodline have failed my riddles"
   - "No one has solved my riddle about silence in 100 years"

3. **Conversations**
   - Mortals who sought audience
   - Questions asked about death
   - Deals or pacts made

### Using Memories in Riddles

Personalized riddles can reference past events the God remembers:

```typescript
// God of Death recalls hero's past
const memories = deathGod.getComponent(CT.EpisodicMemory);
const priorBargain = memories.memories.find(m =>
  m.type === 'death_bargain' &&
  m.entityId === hero.id
);

if (priorBargain) {
  // Generate riddle referencing their past bargain
  context.notableDeeds.push(
    `Cheated death once before by solving the riddle: "${priorBargain.riddle}"`
  );
}
```

## LLM Integration

### God of Death as LLM Persona

The God of Death uses LLM for:

1. **Riddle Generation**: Creates personalized riddles
2. **Answer Judgment**: Decides if hero's answer is acceptable
3. **Dialogue**: Responds to hero's pleas, questions, bargaining
4. **Memory Synthesis**: Recalls relevant past events

### Judgment Mode (Default)

```typescript
// In DeathBargainSystem
async evaluateAnswer(hero: Entity, answer: string, riddle: GeneratedRiddle) {
  const deathGod = this.getDeathGodEntity(world);

  // God of Death judges using their memories as context
  const memories = deathGod.getComponent(CT.EpisodicMemory);
  const pastBargains = memories.memories.filter(m => m.type === 'death_bargain');

  const judgment = await this.riddleGenerator.judgeAnswer(riddle, answer, {
    godMemories: pastBargains,
    heroName: hero.getComponent(CT.Identity).name
  });

  // God of Death speaks judgment
  addConversationMessage(deathGod, hero,
    judgment.accepted
      ? "... Impressive. You have answered correctly."
      : "Wrong. You have failed, mortal."
  );

  return judgment.accepted;
}
```

## Events & Observability

### Event Types

```typescript
// God manifests
'deity:manifested' -> {
  deityId, deityName, reason, location,
  message: "The God of Death has entered the chat"
}

// Bargain starts (observable)
'death:bargain_started' -> {
  deathGodId, heroId, location, riddle
}

// Answer given (observable)
'death:answer_given' -> {
  heroId, answer, timestamp
}

// Judgment rendered (dramatic!)
'death:judgment' -> {
  heroId, accepted: boolean, reasoning
}

// Outcome (observable)
'death:resurrection' -> { heroId, conditions }
'death:final_death' -> { heroId, fate }
```

### UI/Rendering

When God of Death is conversing:
- **Show conversation bubble** above both entities
- **Highlight location** on map
- **Camera can focus** on the conversation
- **Other agents turn to watch** (behavior system)

## Implementation Phases

### Phase 1: God of Death Entity
- [ ] Create `createGodOfDeath()` factory function
- [ ] Add deity spawn logic to DeathBargainSystem
- [ ] Implement manifestation event
- [ ] Add memory component initialization

### Phase 2: Conversation Integration
- [ ] Convert death bargain to use ConversationComponent
- [ ] Add conversation phases (greeting, riddle, judgment, outcome)
- [ ] Make conversations observable by nearby agents
- [ ] Add event emissions for each phase

### Phase 3: Judgment Mode
- [ ] Add `judgeAnswer()` to RiddleGenerator
- [ ] Update DeathBargainSystem to use judgment instead of string matching
- [ ] Include God of Death's memories in judgment context
- [ ] Test with real LLM (Groq)

### Phase 4: Memory & Learning
- [ ] God remembers every death bargain
- [ ] Track patterns (repeat offenders, family bloodlines, etc.)
- [ ] Use memories to generate personalized riddles
- [ ] God can reference past events in dialogue

### Phase 5: Observer System
- [ ] Nearby agents gain memories of witnessing event
- [ ] Agents can choose to move to watch
- [ ] Emotional reactions to outcomes
- [ ] Reputation/status effects for cheating death

## Example Scenario

```
Tick 12043: Hero Aldric dies in combat with dragon

EVENT: deity:manifested
MESSAGE: "The God of Death has entered the chat"
- God of Death appears at coordinates (142, 89)
- All nearby agents see a hooded figure materialize
- Camera pans to show the manifestation

CONVERSATION STARTS:
God: "Mortal, your thread was to be cut this day..."
God: "But I see in you a grand destiny yet unfulfilled..."
God: "I will offer you a chance - solve my riddle."

Aldric: "I accept your challenge, Lord of Death."

God: "In realms of fire and shadow, where scales once claimed the sky..."
God: "What bond, forged in valor and deceit, did your final breath deny?"

Aldric: "Trust."

God: "... You speak truth. Your destiny is not yet complete."
God: "Return to the world above - but know that you owe me a debt."

EVENT: death:resurrection
- Aldric gains 'death_sight' blessing
- 20% max health penalty for 7 days
- Debt to God of Death logged in memories
- Nearby agents remember witnessing this miracle

Sage Lyra (nearby): *Gains memory: "Witnessed Aldric cheat death through wit"*
Warrior Theron (nearby): *Gains memory: "The God of Death can be bargained with"*
```

## God of Death Personality

The God of Death should have:
- **Gravitas**: Speaks in formal, archaic language
- **Fairness**: Judges riddles by spirit, not letter
- **Memory**: References past events and patterns
- **Mystery**: Cryptic and philosophical
- **Consistency**: Same personality across all interactions

## Integration with Existing Systems

### Death Transition
- DeathTransitionSystem checks `qualifiesForDeathBargain()`
- If true, spawns/moves God of Death
- Starts conversation instead of immediate death

### Communication System
- Death bargain conversations use ConversationComponent
- Special flag: `isDeathBargain: true`
- Not ended by normal timeout
- Ends when judgment is rendered

### Reincarnation System
- If resurrection succeeds, skip reincarnation
- If fails, proceed to normal afterlife/reincarnation
- God of Death's judgment affects karma/next life

### Event Bus
- Rich events for UI to display dramatic moments
- "God of Death has entered the chat" notification
- Real-time conversation display

## Player Favor System

The player can petition the God of Death via divine chat to spare specific agents, if they have a good relationship.

### How It Works

```typescript
// In divine chat
Player: "Please spare Aldric - he still has work to do"

God of Death: "You dare petition me, mortal deity?"
// Checks relationship with player
// - relationship > 50: "Very well. I shall offer him a chance."
// - relationship 20-50: "Perhaps... but he must still prove himself."
// - relationship < 20: "You have no favor with me. He faces death alone."
```

### Relationship Building

- **Positive**: Player accepts God of Death into pantheon (+10)
- **Positive**: God of Death resurrects heroes successfully (+5 per success)
- **Positive**: Player sends offerings/sacrifices (+2 per offering)
- **Positive**: Player builds death temples (+15)
- **Negative**: Player attempts to cheat death mechanics (-20)
- **Negative**: Player insults God of Death in chat (-10)
- **Negative**: Player ignores death bargains (-5 per ignore)

### Favor Effects

When player has high favor (relationship > 50):
- **Easier riddles**: God chooses 'easy' difficulty instead of 'hard'
- **More attempts**: maxAttempts increases from 3 to 5
- **Lenient judgment**: God is more forgiving with judgment mode
- **Second chances**: Failed heroes get one more chance if player asks

When player has low favor (relationship < 20):
- **Harder riddles**: God chooses 'hard' difficulty
- **Fewer attempts**: maxAttempts decreases to 1
- **Strict judgment**: No leniency in answer evaluation
- **No bargains**: God refuses to offer bargain at all

### Divine Chat Integration

```typescript
// Player sends chat message
{
  type: 'divine_chat_message',
  sender: 'player',
  recipient: 'god_of_death',
  message: 'Please spare Aldric the Brave',
  entityId: 'aldric_123', // Optional - references specific agent
}

// God of Death responds based on relationship
{
  type: 'divine_chat_message',
  sender: 'god_of_death',
  recipient: 'player',
  message: '...',
  mood: 'favorable' | 'neutral' | 'hostile'
}
```

### Implementation Notes

- Add RelationshipComponent to God of Death entity
- Track player-deity relationships
- Check relationship value when player sends petition
- Modify riddle difficulty and attempts based on favor
- Add favor_requested flag to DeathBargainComponent

## Future Enhancements

- **Multiple Death Gods**: Different cultures, different gods
- **Varying Challenges**: Not just riddles - combat, games, oratory
- **God's Wrath**: Repeated failures haunt future incarnations
- **Death Temples**: Locations where God of Death dwells when idle
- **Mortal Audiences**: Agents can seek audience to ask about deceased loved ones
- **Death Pacts**: Player can make deals with God of Death for future favors
