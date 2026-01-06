# Soul-Agent Integration Guide

## Overview

The soul system is now architecturally complete with three core components:

1. **SoulIdentityComponent** - Core soul essence (on soul entities)
2. **IncarnationComponent** - Soul-body relationship tracking (on soul entities)
3. **SoulLinkComponent** - Links agent to soul (on agent entities)

## Current Status

✅ **Complete:**
- Soul creation ceremony system (SoulCreationSystem)
- Three Fates LLM conversation (placeholder responses)
- Soul component architecture
- Event types: `soul:ceremony_started`, `soul:fate_speaks`, `soul:ceremony_complete`
- Observable divine ceremonies (disembodied voices)

🚧 **Pending Integration:**
- Linking souls to agents at birth
- Soul persistence across deaths
- Soul-driven behavior in incarnated agents

## How to Use Soul Creation

### Request Soul Creation

```typescript
import type { SoulCreationSystem } from '../systems/SoulCreationSystem.js';
import type { SoulCreationContext } from '../divinity/SoulCreationCeremony.js';

// Get the soul creation system
const soulCreationSystem = world.getSystem('soul_creation') as SoulCreationSystem;

// Define context for soul creation
const context: SoulCreationContext = {
  parentSouls: ['soul-entity-id-1', 'soul-entity-id-2'], // Optional
  culture: 'Forest Village',
  cosmicAlignment: 0.3, // -1 (cursed) to 1 (blessed)
  worldEvents: ['A great festival is underway'], // Optional
  isReforging: false,
  ceremonyRealm: 'tapestry_of_fate',
};

// Request soul creation
soulCreationSystem.requestSoulCreation(
  context,
  (soulEntityId: string) => {
    console.log('Soul created:', soulEntityId);
    // Now link this soul to an agent via SoulLinkComponent
  },
  ['observer-entity-id'] // Optional: entities that can watch ceremony
);
```

### Observe Soul Creation Ceremonies

Listen for events to watch the Fates create souls in real-time:

```typescript
// Listen for ceremony start
world.eventBus.subscribe('soul:ceremony_started', (event) => {
  console.log('🌟 Soul creation ceremony begins');
  console.log('Context:', event.data.context);
});

// Listen for each Fate speaking
world.eventBus.subscribe('soul:fate_speaks', (event) => {
  const speaker = event.data.speaker; // 'weaver' | 'spinner' | 'cutter'
  const symbol = speaker === 'weaver' ? '🧵' : speaker === 'spinner' ? '🌀' : '✂️';
  console.log(`${symbol} ${speaker.toUpperCase()}: "${event.data.text}"`);
});

// Listen for ceremony completion
world.eventBus.subscribe('soul:ceremony_complete', (event) => {
  console.log('✨ Soul created!');
  console.log('Purpose:', event.data.purpose);
  console.log('Interests:', event.data.interests);
  console.log('Destiny:', event.data.destiny);
  console.log('Archetype:', event.data.archetype);
});
```

## Integration with Agent Birth

### Future: Link Souls at Agent Creation

When creating a new agent, you would:

```typescript
import { createSoulLinkComponent } from '../components/SoulLinkComponent.js';

// After requesting soul creation...
soulCreationSystem.requestSoulCreation(context, (soulEntityId) => {
  // Create agent entity
  const agent = new EntityImpl(createEntityId(), world.tick);

  // ... add all agent components ...

  // Link agent to soul
  const soulLink = createSoulLinkComponent(soulEntityId, world.tick, true);
  agent.addComponent(soulLink);

  // Update soul's incarnation status
  const soulEntity = world.getEntity(soulEntityId);
  if (soulEntity) {
    const incarnation = soulEntity.getComponent('incarnation') as IncarnationComponent;
    incarnation.currentBindings.push({
      targetId: agent.id,
      bindingType: 'incarnated',
      bindingStrength: 1.0,
      createdTick: world.tick,
      isPrimary: true,
    });
    incarnation.state = 'incarnated';
    incarnation.primaryBindingId = agent.id;
  }
});
```

## Integration with Death

### Future: Soul Persistence

When an agent dies:

```typescript
// In DeathTransitionSystem
const soulLink = entity.getComponent('soul_link') as SoulLinkComponent | undefined;

if (soulLink) {
  // Soul persists, agent body dies
  const soulEntity = world.getEntity(soulLink.soulEntityId);

  if (soulEntity) {
    // Update incarnation status
    const incarnation = soulEntity.getComponent('incarnation') as IncarnationComponent;

    // Record incarnation in history
    incarnation.incarnationHistory.push({
      bodyId: entity.id,
      incarnationStartTick: soulLink.linkFormedTick,
      incarnationEndTick: world.tick,
      deathCause: this.determineCauseOfDeath(entity),
      bodyType: 'mortal',
      species: (entity.getComponent('species') as SpeciesComponent)?.speciesId,
      bodyName: (entity.getComponent('identity') as IdentityComponent)?.name,
      wasPrimary: soulLink.isPrimaryIncarnation,
    });

    // Clear current binding
    incarnation.currentBindings = incarnation.currentBindings.filter(
      b => b.targetId !== entity.id
    );
    incarnation.state = 'disembodied';
    incarnation.primaryBindingId = undefined;
  }
}
```

## LLM Integration

### Replace Placeholder Responses

Currently, `SoulCreationSystem.getPlaceholderResponse()` returns static text. To enable true LLM-powered soul creation:

1. Import the LLM provider in SoulCreationSystem
2. Use `generateFatePrompt()` from SoulCreationCeremony to create prompts
3. Call LLM API with the prompt
4. Parse the response and add to transcript

```typescript
import { generateFatePrompt } from '../divinity/SoulCreationCeremony.js';

private async conductCeremonyTurn(world: World, ceremony: ActiveCeremony): Promise<void> {
  // Generate prompt for current speaker
  const prompt = generateFatePrompt(
    ceremony.currentSpeaker,
    ceremony.request.context,
    ceremony.transcript
  );

  // TODO: Call LLM API
  const response = await callLLM(prompt);

  // Add to transcript
  const exchange: ConversationExchange = {
    speaker: ceremony.currentSpeaker,
    text: response,
    tick: world.tick,
    topic: this.determineTopic(ceremony.turnCount),
  };

  ceremony.transcript.push(exchange);
  // ... rest of ceremony logic
}
```

## Soul-Driven Behavior

### Future: Soul Influence on Decisions

When making decisions, agents should consider their soul's purpose and interests:

```typescript
// In AgentBrainSystem or decision-making code
const soulLink = entity.getComponent('soul_link') as SoulLinkComponent | undefined;

if (soulLink) {
  const soulEntity = world.getEntity(soulLink.soulEntityId);
  const soulIdentity = soulEntity?.getComponent('soul_identity') as SoulIdentityComponent;

  if (soulIdentity) {
    // Include soul's purpose in decision context
    const decisionContext = {
      // ... other context ...
      soulPurpose: soulIdentity.purpose,
      soulInterests: soulIdentity.coreInterests,
      soulDestiny: soulIdentity.destiny,
      soulInfluence: soulLink.soulInfluence, // 0-1, how much soul guides decisions
    };

    // Use in LLM prompt or decision weights
  }
}
```

## Dream Communication

### Future: Soul Talks to Conscious Mind

During sleep, the soul can communicate with the agent:

```typescript
// In SleepSystem or DreamSystem
const soulLink = entity.getComponent('soul_link') as SoulLinkComponent | undefined;

if (soulLink && Math.random() < 0.3) { // 30% chance of soul dream
  const soulEntity = world.getEntity(soulLink.soulEntityId);
  const soulIdentity = soulEntity?.getComponent('soul_identity') as SoulIdentityComponent;

  if (soulIdentity) {
    // Generate dream based on soul's purpose/destiny
    const dream = `Your soul whispers: "${soulIdentity.purpose}"`;

    // Add to episodic memory as a dream
    const episodic = entity.getComponent('episodic_memory') as EpisodicMemoryComponent;
    episodic.formMemory({
      eventType: 'dream:soul_communication',
      summary: dream,
      timestamp: world.tick,
      emotionalIntensity: 0.7,
      importance: 0.8,
    });
  }
}
```

## Next Steps

1. **Integrate with ReproductionSystem**: Create souls for newborn agents
2. **Update DeathTransitionSystem**: Persist souls when agents die
3. **Modify ReincarnationSystem**: Link existing souls to new bodies
4. **LLM Integration**: Replace placeholder Fate responses with actual LLM calls
5. **Soul-Driven Behavior**: Use soul purpose/interests in agent decision-making
6. **Dream System**: Implement soul-conscious mind communication

## Testing Soul Creation

To test the soul creation system without full integration:

```typescript
// In a test or temporary system
const testContext: SoulCreationContext = {
  culture: 'Test Village',
  cosmicAlignment: 0.5,
};

const soulSystem = world.getSystem('soul_creation') as SoulCreationSystem;
soulSystem.requestSoulCreation(testContext, (soulId) => {
  const soul = world.getEntity(soulId);
  console.log('Test soul created:', soul);

  const identity = soul?.getComponent('soul_identity') as SoulIdentityComponent;
  console.log('Purpose:', identity?.purpose);
  console.log('Interests:', identity?.coreInterests);
});
```
