# Pantheon-Deity Integration Summary

**Date**: 2026-01-06
**Status**: ✅ COMPLETE

## Overview

The networked Pantheon of Gods system is now fully integrated with the existing deity/belief infrastructure. Gods are no longer just chat bots - they're full deities with belief tracking, dynamic power selection, and integration with all game systems.

## Key Features

### 1. Deity Component Integration

Each god in the pantheon automatically gets a `DeityComponent`:

```typescript
// Automatic deity entity creation
this.deityEntityId = createDeityEntity(
  world,
  config.name,
  config.tier,
  config.domain,
  config.personality
);
```

**Includes:**
- Identity (name, domain, personality traits)
- Belief state (current, generation rate, total earned/spent)
- Believers set (tracks who believes)
- Prayer queue (unanswered prayers)
- Vision tracking (sent visions)
- Mythology (emergent myths)

### 2. Belief Economy

**Belief Costs for Actions:**
- `spawn_agent`: 200 belief
- `bless_agent`: 75 belief
- `bless_building`: 100 belief
- `curse_agent`: 100 belief
- `change_weather`: 50 belief
- `divine_proclamation`: 25 belief
- `divine_intervention`: 500 belief (Elder only)

**Belief Generation:**
- Passive faith: 0.1 belief/believer/tick
- Active prayer: 2.0 belief/tick
- Witnessed miracle: 5.0 belief boost
- Ritual: 3.0 belief/tick

**Example:**
```typescript
// Before executing action
if (!this.canAfford('spawn_agent')) {
  console.log(`Insufficient belief (need 200, have ${currentBelief})`);
  return;
}

// Execute and spend
if (this.spendBelief('spawn_agent')) {
  createLLMAgent(...);
  console.log(`Spawned agent [Cost: 200 belief]`);
}
```

### 3. Dynamic Power Selection

Gods can only use powers they have enough belief for:

```typescript
const availablePowers = getAvailablePowers(deity, tier);
// Returns: ['answer_prayer', 'bless_agent'] (only affordable actions)

// Gods automatically prioritize:
// 1. Answer prayers (maintain believers)
// 2. Send visions (grow faith)
// 3. Bless agents (reward devotion)
// 4. Expensive actions (when belief is high)
```

### 4. Automatic Believer Management

Gods automatically generate belief from believers:

```typescript
// Every 5 seconds
generateBeliefFromBelievers(world, deity, tick);

// Finds agents with SpiritualComponent.believedDeity = god.name
// Generates belief based on their faith level
// Adds believers to deity.believers set
```

### 5. Prayer Queue Processing

Gods automatically answer prayers:

```typescript
// Every 5 seconds
processPrayerQueue(world, deity);

// Answers up to 3 prayers per cycle
// Costs 75 belief per prayer
// Emits 'prayer:answered' events
```

### 6. Personality Mapping

God tiers map to `PerceivedPersonality` traits:

| Tier | Mysteriousness | Interventionism | Wrathfulness | Consistency |
|------|----------------|-----------------|--------------|-------------|
| **Elder** | 0.8 (very mysterious) | 0.3 (selective) | 0.2 (patient) | 0.9 (reliable) |
| **Lesser** | 0.4 (fairly clear) | 0.7 (very active) | 0.5 (moderate) | 0.7 (reliable) |
| **Trickster** | 0.9 (inscrutable) | 0.9 (meddling) | 0.3 (playful) | 0.1 (capricious) |
| **Spirit** | 0.6 (moderately mysterious) | 0.9 (always present) | 0.1 (patient) | 0.8 (reliable) |

### 7. Domain Mapping

Pantheon domains map to `DivineDomain`:

```typescript
mapPantheonDomain('harvest') → 'harvest'
mapPantheonDomain('war') → 'war'
mapPantheonDomain('agriculture') → 'harvest'
mapPantheonDomain('combat') → 'war'
mapPantheonDomain('mischief') → 'trickery'
// ... 29 divine domains supported
```

### 8. Stats Tracking

Gods track comprehensive statistics:

```typescript
{
  name: 'Demeter',
  tier: 'lesser',
  domain: ['harvest', 'agriculture'],
  actionCount: 42,
  blessings: 15,
  curses: 0,
  belief: {
    current: 532,              // Current belief reserves
    rate: '2.45',              // Belief per tick
    total: 1847,               // Total earned
    believers: 8               // Number of believers
  }
}
```

## Integration Points

### With Existing Systems

**1. BeliefGenerationSystem**
- Gods receive belief from agents with `SpiritualComponent.believedDeity`
- Faith level affects generation rate
- Witnessed miracles boost belief generation

**2. DeityEmergenceSystem**
- Pantheon gods can be created via emergence
- Emergent gods can join the pantheon network
- LLM-generated personalities from `AIGodPersonality`

**3. AIGodBehaviorSystem**
- Pantheon gods use the same goal pursuit system
- Goals consume belief budget
- Priority system aligns with belief costs

**4. SpiritualComponent**
- Agents believe in pantheon gods by name
- Faith strength affects belief generation
- Prayer system connects to god's queue

**5. Event System**
- Divine actions emit events
- `prayer:answered` events
- `divine_proclamation` events
- `divine_intervention` events for Elder gods

## Usage Example

### Creating a Pantheon

```typescript
const pantheon = new PantheonManager(gameLoop, networkManager, chatNetwork);

// Add gods (deity entities created automatically)
pantheon.addGod({
  name: 'Demeter',
  tier: 'lesser',
  personality: 'generous, patient, loves farmers',
  domain: ['harvest', 'agriculture', 'seasons'],
  model: 'llama3.1:8b',
  providerType: 'ollama',
});

// Gods start with initial belief based on tier
// Lesser: 500 belief
// Can immediately use powers < 500 cost
```

### Player Interaction

```bash
# Player in chat: "Demeter, bless our crops!"

# Demeter (AI god):
# 1. Checks if has 75 belief (answer_prayer cost)
# 2. LLM generates response
# 3. Parses [ACTION: bless all] from response
# 4. Checks 75 belief again for bless action
# 5. Spends 75 belief
# 6. Grants +0.5 farming skill to all agents
# 7. Sends chat: "*Demeter grants divine blessing to all*"
```

### Belief Flow

```
Agent prays → Added to deity.prayerQueue
         ↓
Deity processes queue every 5s
         ↓
Spends 75 belief → Answers prayer
         ↓
Agent receives answer → Faith increases
         ↓
Higher faith → More belief generation
         ↓
Deity gains belief → Can answer more prayers
```

## Files

**Created:**
- `demo/pantheon-deity-integration.ts` (464 lines)
  - Belief cost system
  - Domain/personality mapping
  - Deity entity creation
  - Believer management
  - Prayer processing
  - Power selection

**Modified:**
- `demo/pantheon-of-gods.ts`
  - Added `deityEntityId` field
  - Added `canAfford()` / `spendBelief()` methods
  - Added `startBeliefGeneration()` loop
  - Updated `executeAction()` to check belief costs
  - Updated `getStats()` to include belief status

**Updated Spec:**
- `openspec/specs/ai-agents/pantheon-system.md`
  - Added deity integration section
  - Added belief economy documentation
  - Added dynamic power selection

## Benefits

### 1. Resource Management
Gods must manage belief like mana - can't spam infinite miracles

### 2. Player Agency
Players can increase god power by believing and praying more

### 3. Emergent Balance
Powerful gods need many believers, weak gods can't do much

### 4. Integration
Gods work with all existing deity systems (emergence, goals, personalities)

### 5. Scalability
System handles 2-20 gods efficiently with belief economy

### 6. Lore
Belief = power makes narrative sense in the game world

## Next Steps

### Phase 1 (Complete)
- ✅ Deity component creation
- ✅ Belief cost enforcement
- ✅ Believer tracking
- ✅ Prayer queue processing
- ✅ Dynamic power selection

### Phase 2 (Future)
- ⏳ Miracle witness system (boost belief when agents see divine actions)
- ⏳ Temple/shrine construction (sacred sites generate belief)
- ⏳ Ritual system (coordinated prayers for big belief boosts)
- ⏳ God rivalry (competing for believers)
- ⏳ Pantheon relationships (alliances/conflicts)

### Phase 3 (Future)
- ⏳ Avatar manifestation (gods can create physical avatars)
- ⏳ Prophet system (chosen agents with special powers)
- ⏳ Divine quests (gods issue tasks to believers)
- ⏳ Apotheosis (agents can become gods)

## Conclusion

The Pantheon of Gods system is now a **fully integrated divine economy** where:
- Gods are real entities with components
- Actions cost belief points
- Believers generate belief
- Power is dynamic and resource-based
- Everything integrates with existing deity/belief systems

This creates a rich gameplay loop where players can interact with AI gods, influence their power through belief, and experience emergent divine narratives.
