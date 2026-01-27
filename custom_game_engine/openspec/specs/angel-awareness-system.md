# Angel Awareness System Specification

## Implementation Status: PROPOSED

**Author:** Claude + Ann
**Date:** January 2026

## Problem Statement

The admin angel currently functions as a reactive query interface - it responds to player messages but doesn't actively observe or engage with the game world. This creates several issues:

1. **No continuity** - The angel can't say "I noticed Elara was struggling earlier" because it never noticed
2. **No relationships** - The angel has no memory of which agents it's interacted with or observed
3. **No presence** - It feels like an external tool, not a being that inhabits the world
4. **Limited debugging** - Can't proactively notice systemic issues or agent problems
5. **No personality emergence** - Without experiences, the angel can't develop preferences or concerns

## Design Goals

### Primary: Make the angel feel present
The angel should have actually been watching the village. When it comments on something, it's because it observed it, not because it queried the database.

### Secondary: Enable both play and debug modes
- **Play mode:** Casual observations, narrative language, emotional engagement
- **Debug mode:** Technical details, state dumps, systemic analysis

### Tertiary: Maintain performance
Awareness shouldn't require expensive per-tick processing for every agent.

## Architecture

### Current Flow
```
┌─────────────┐    chat message     ┌─────────────────┐
│   Player    │ ─────────────────► │  AdminAngel     │
│             │                     │                 │
│             │ ◄───────────────── │  (queries world │
│             │    LLM response     │   on demand)   │
└─────────────┘                     └─────────────────┘
```

### Proposed Flow
```
┌─────────────┐                     ┌─────────────────────────────────────┐
│   Player    │    chat message     │           AdminAngel                │
│             │ ─────────────────► │                                     │
│             │                     │  ┌─────────────────────────────┐   │
│             │ ◄───────────────── │  │  Consciousness Stream       │   │
│             │    LLM response     │  │  "Elara is building..."     │   │
└─────────────┘                     │  │  "Marcus looks tired..."    │   │
                                    │  └─────────────────────────────┘   │
                                    │                                     │
      ┌─────────────┐               │  ┌─────────────────────────────┐   │
      │   World     │  periodic     │  │  Agent Familiarity          │   │
      │  (agents,   │ ──────────► │  │  elara: {impression: "the   │   │
      │   events)   │   sampling    │  │          builder", ...}     │   │
      └─────────────┘               │  └─────────────────────────────┘   │
                                    │                                     │
                                    │  ┌─────────────────────────────┐   │
                                    │  │  Attention Focus            │   │
                                    │  │  watching: "elara-id"       │   │
                                    │  └─────────────────────────────┘   │
                                    └─────────────────────────────────────┘
```

## Data Structures

### Extended AdminAngelMemory

```typescript
export interface AngelConsciousness {
  /**
   * Rolling buffer of observations - the angel's inner monologue
   * Oldest observations drop off as new ones are added
   */
  observations: AngelObservation[];

  /**
   * Maximum observations to retain
   */
  maxObservations: number; // default 50

  /**
   * Last tick the angel "thought" about the world
   */
  lastThoughtTick: number;

  /**
   * Current emotional state based on village conditions
   */
  mood: AngelMood;

  /**
   * What the angel is currently pondering (for proactive comments)
   */
  currentWonder: string | null;
}

export interface AngelObservation {
  tick: number;
  timestamp: number;

  /** Natural language observation */
  text: string;

  /** Agent this relates to (if any) */
  agentId?: string;
  agentName?: string;

  /** Type of observation for filtering/prioritization */
  type: 'action' | 'state' | 'achievement' | 'concern' | 'atmosphere' | 'relationship';

  /** How interesting/notable this is (affects retention) */
  salience: number; // 0-1
}

export type AngelMood =
  | 'content'      // Village is doing well
  | 'worried'      // Something concerning
  | 'curious'      // Something interesting happening
  | 'excited'      // Achievement or milestone
  | 'pensive'      // Reflecting on the village
  | 'protective';  // Agent in danger

export interface AgentFamiliarity {
  /** Agent entity ID */
  agentId: string;

  /** Cached name for quick reference */
  name: string;

  /** When the angel first noticed this agent */
  firstNoticedTick: number;

  /** How many times player has asked about this agent */
  playerInteractionCount: number;

  /** Last observed action/state */
  lastSeenDoing: string;
  lastSeenTick: number;

  /** Angel's impression of this agent (generated, evolves) */
  impression: string; // "the builder", "always hungry", "cautious"

  /** Current interest level (decays over time, spikes with events) */
  interestLevel: number; // 0-1

  /** Notable memories about this agent */
  memories: AgentMemory[];
}

export interface AgentMemory {
  tick: number;
  text: string;
  type: 'achievement' | 'struggle' | 'interaction' | 'quirk';
}

export interface AngelAttention {
  /**
   * Currently focused agent (player said "watch X")
   * Gets more frequent sampling
   */
  focusedAgentId: string | null;
  focusedAgentName: string | null;
  focusSinceTick: number | null;

  /**
   * Recently noticed agents (for varied observations)
   */
  recentlyNoticed: string[];

  /**
   * Ticks until next ambient scan
   */
  scanCooldown: number;

  /**
   * Ticks until next focused agent update (shorter interval)
   */
  focusCooldown: number;
}
```

### Extended AdminAngelMemory Interface

```typescript
export interface AdminAngelMemory {
  // ... existing fields ...

  /** Stream of consciousness - what the angel has noticed */
  consciousness: AngelConsciousness;

  /** Relationship with individual agents */
  agentFamiliarity: Map<string, AgentFamiliarity>;

  /** Current attention state */
  attention: AngelAttention;
}
```

## Tick Behavior

### Ambient Scanning (every 100-200 ticks, ~5-10 seconds)

```typescript
private performAmbientScan(ctx: SystemContext, angel: AdminAngelComponent): void {
  // 1. Pick 1-3 agents to observe
  const agents = this.selectAgentsToObserve(ctx.world, angel);

  for (const agent of agents) {
    // 2. Generate observation
    const observation = this.observeAgent(ctx.world, agent, angel);

    // 3. Add to consciousness if interesting enough
    if (observation.salience > 0.3) {
      this.addObservation(angel, observation);
    }

    // 4. Update familiarity
    this.updateFamiliarity(angel, agent, observation);
  }

  // 5. Update mood based on overall village state
  this.updateMood(ctx.world, angel);

  // 6. Maybe generate a "wonder" for proactive comment
  if (Math.random() < 0.1) {
    angel.memory.consciousness.currentWonder = this.generateWonder(angel);
  }
}
```

### Focused Agent Updates (every 20-40 ticks, ~1-2 seconds)

When an agent is being "watched":

```typescript
private updateFocusedAgent(ctx: SystemContext, angel: AdminAngelComponent): void {
  const focusId = angel.memory.attention.focusedAgentId;
  if (!focusId) return;

  const agent = ctx.world.getEntity(focusId);
  if (!agent) {
    // Agent gone - clear focus
    this.clearFocus(angel);
    this.addObservation(angel, {
      text: `Lost sight of ${angel.memory.attention.focusedAgentName}...`,
      type: 'atmosphere',
      salience: 0.5
    });
    return;
  }

  // Generate detailed observation
  const observation = this.observeAgent(ctx.world, agent, angel, { detailed: true });

  // Always add focused agent observations
  this.addObservation(angel, observation);
}
```

### Agent Selection Algorithm

```typescript
private selectAgentsToObserve(world: World, angel: AdminAngelComponent): Entity[] {
  const allAgents = world.query().with(CT.Agent).executeEntities();
  if (allAgents.length === 0) return [];

  // Build weighted selection
  const weights: { agent: Entity; weight: number }[] = allAgents.map(agent => {
    let weight = 1.0;

    // Boost agents we've interacted with
    const familiarity = angel.memory.agentFamiliarity.get(agent.id);
    if (familiarity) {
      weight += familiarity.interestLevel * 2;
      weight += familiarity.playerInteractionCount * 0.5;
    }

    // Boost agents with notable states
    const needs = agent.getComponent<NeedsComponent>(CT.Needs);
    if (needs) {
      if (needs.hunger < 0.2) weight += 1.5; // Hungry
      if (needs.energy < 0.2) weight += 1.5; // Exhausted
    }

    // Boost agents doing interesting things
    const brain = agent.getComponent<AgentBrainComponent>(CT.AgentBrain);
    if (brain?.currentAction?.type === 'build') weight += 1.0;
    if (brain?.currentAction?.type === 'craft') weight += 0.8;
    if (brain?.currentAction?.type === 'social') weight += 0.5;

    // Reduce weight for recently observed
    if (angel.memory.attention.recentlyNoticed.includes(agent.id)) {
      weight *= 0.3;
    }

    // Add randomness
    weight *= 0.5 + Math.random();

    return { agent, weight };
  });

  // Sort and pick top 1-3
  weights.sort((a, b) => b.weight - a.weight);
  const count = 1 + Math.floor(Math.random() * 3);

  return weights.slice(0, count).map(w => w.agent);
}
```

### Observation Generation

```typescript
private observeAgent(
  world: World,
  agent: Entity,
  angel: AdminAngelComponent,
  options?: { detailed?: boolean }
): AngelObservation {
  const identity = agent.getComponent<IdentityComponent>(CT.Identity);
  const name = identity?.name ?? 'Unknown';
  const brain = agent.getComponent<AgentBrainComponent>(CT.AgentBrain);
  const needs = agent.getComponent<NeedsComponent>(CT.Needs);
  const position = agent.getComponent<PositionComponent>(CT.Position);

  // Determine what to say
  let text: string;
  let type: AngelObservation['type'];
  let salience: number;

  // Current action
  const action = brain?.currentAction;
  if (action) {
    switch (action.type) {
      case 'build':
        text = `${name} is building something`;
        type = 'action';
        salience = 0.7;
        break;
      case 'gather':
        text = `${name} is gathering ${action.target ?? 'resources'}`;
        type = 'action';
        salience = 0.4;
        break;
      case 'eat':
        text = `${name} is eating`;
        type = 'action';
        salience = 0.3;
        break;
      case 'sleep':
        text = `${name} is resting`;
        type = 'state';
        salience = 0.3;
        break;
      case 'wander':
        text = `${name} is wandering around`;
        type = 'action';
        salience = 0.2;
        break;
      default:
        text = `${name} is ${action.type}`;
        type = 'action';
        salience = 0.3;
    }
  } else {
    text = `${name} seems idle`;
    type = 'state';
    salience = 0.2;
  }

  // Check for concerns
  if (needs) {
    if (needs.hunger < 0.15) {
      text = `${name} looks really hungry`;
      type = 'concern';
      salience = 0.9;
    } else if (needs.energy < 0.15) {
      text = `${name} is exhausted`;
      type = 'concern';
      salience = 0.8;
    }
  }

  // Add detail if focused
  if (options?.detailed && needs) {
    const hungerPct = Math.round(needs.hunger * 100);
    const energyPct = Math.round(needs.energy * 100);
    text += ` (hunger: ${hungerPct}%, energy: ${energyPct}%)`;
  }

  return {
    tick: world.tick,
    timestamp: Date.now(),
    text,
    agentId: agent.id,
    agentName: name,
    type,
    salience
  };
}
```

## Prompt Integration

### Building the Angel's Context

```typescript
function buildAngelPrompt(angel: AdminAngelComponent, gameState: string, playerMessage?: string): string {
  const { consciousness, agentFamiliarity, attention } = angel.memory;

  let prompt = `ur ${angel.name}. ur an angel watching over a village.\n\n`;

  // Current mood
  prompt += `u feel ${consciousness.mood} rn.\n\n`;

  // Recent observations (what you've actually seen)
  if (consciousness.observations.length > 0) {
    prompt += `things uv noticed lately:\n`;
    const recent = consciousness.observations.slice(-10);
    for (const obs of recent) {
      prompt += `- ${obs.text}\n`;
    }
    prompt += `\n`;
  }

  // Focused agent
  if (attention.focusedAgentId) {
    const familiarity = agentFamiliarity.get(attention.focusedAgentId);
    if (familiarity) {
      prompt += `ur watching ${familiarity.name} rn. `;
      prompt += `u think of them as "${familiarity.impression}". `;
      prompt += `last u saw: ${familiarity.lastSeenDoing}\n\n`;
    }
  }

  // Familiar agents
  const familiar = Array.from(agentFamiliarity.values())
    .filter(f => f.interestLevel > 0.3)
    .sort((a, b) => b.interestLevel - a.interestLevel)
    .slice(0, 5);

  if (familiar.length > 0) {
    prompt += `agents u know:\n`;
    for (const f of familiar) {
      prompt += `- ${f.name}: "${f.impression}"\n`;
    }
    prompt += `\n`;
  }

  // Current wonder (for proactive engagement)
  if (consciousness.currentWonder && !playerMessage) {
    prompt += `something on ur mind: ${consciousness.currentWonder}\n\n`;
  }

  // Game state summary
  prompt += `village status: ${gameState}\n\n`;

  // Player message
  if (playerMessage) {
    prompt += `player said: "${playerMessage}"\n`;
  }

  return prompt;
}
```

## Commands

### Watch Command

Player: "watch Elara" or "keep an eye on Marcus"

```typescript
private handleWatchCommand(world: World, angel: AdminAngelComponent, agentName: string): string {
  // Find agent by name
  const agent = this.findAgentByName(world, agentName);

  if (!agent) {
    return `i dont see anyone named ${agentName}...`;
  }

  // Set focus
  angel.memory.attention.focusedAgentId = agent.id;
  angel.memory.attention.focusedAgentName = agentName;
  angel.memory.attention.focusSinceTick = world.tick;

  // Ensure familiarity exists
  this.ensureFamiliarity(angel, agent, world);

  return `ok ill keep an eye on ${agentName} for u`;
}
```

### Status Command

Player: "how's everyone?" or "village status"

```typescript
private handleStatusCommand(world: World, angel: AdminAngelComponent): string {
  // Trigger immediate broad scan
  const agents = world.query().with(CT.Agent).executeEntities();

  // Summarize based on consciousness + fresh data
  // Response generated by LLM with this context
}
```

### Debug Command

Player: "debug Marcus" or "what's Marcus's state?"

```typescript
private handleDebugCommand(world: World, angel: AdminAngelComponent, agentName: string): string {
  const agent = this.findAgentByName(world, agentName);
  if (!agent) return `cant find ${agentName}`;

  // Dump full state
  const brain = agent.getComponent(CT.AgentBrain);
  const needs = agent.getComponent(CT.Needs);
  const position = agent.getComponent(CT.Position);
  const pathfinding = agent.getComponent(CT.Pathfinding);

  let dump = `debug info for ${agentName}:\n`;
  dump += `- id: ${agent.id}\n`;
  dump += `- pos: (${position?.x}, ${position?.y})\n`;
  dump += `- action: ${brain?.currentAction?.type ?? 'none'}\n`;
  dump += `- hunger: ${needs?.hunger?.toFixed(2)}\n`;
  dump += `- energy: ${needs?.energy?.toFixed(2)}\n`;
  dump += `- path: ${pathfinding?.path?.length ?? 0} nodes\n`;

  return dump;
}
```

## Performance Considerations

### Throttling

| Operation | Interval | Notes |
|-----------|----------|-------|
| Ambient scan | 100-200 ticks (5-10s) | Samples 1-3 agents |
| Focused update | 20-40 ticks (1-2s) | Only if watching |
| Familiarity decay | 1200 ticks (60s) | Reduce interest levels |
| Observation pruning | 1200 ticks (60s) | Drop low-salience old observations |

### Memory Limits

| Buffer | Limit | Pruning Strategy |
|--------|-------|------------------|
| Observations | 50 | Drop oldest below salience threshold |
| Agent memories | 10 per agent | Drop oldest |
| Recently noticed | 10 | FIFO |
| Familiar agents | 20 | Drop lowest interest |

### Query Caching

```typescript
// Cache agent query for the tick
private cachedAgents: Entity[] | null = null;
private cachedAgentsTick: number = -1;

private getAgents(world: World): Entity[] {
  if (this.cachedAgentsTick !== world.tick) {
    this.cachedAgents = world.query().with(CT.Agent).executeEntities();
    this.cachedAgentsTick = world.tick;
  }
  return this.cachedAgents!;
}
```

## Migration Plan

### Phase 1: Data Structures
1. Add `AngelConsciousness` to `AdminAngelMemory`
2. Add `AgentFamiliarity` map
3. Add `AngelAttention` state
4. Update `createAdminAngelMemory()` factory

### Phase 2: Ambient Awareness
1. Add ambient scan to `AdminAngelSystem.onUpdate()`
2. Implement `selectAgentsToObserve()`
3. Implement `observeAgent()`
4. Implement `addObservation()`

### Phase 3: Focused Watching
1. Implement watch command detection in chat
2. Add focused agent update loop
3. Implement `handleWatchCommand()`

### Phase 4: Prompt Integration
1. Update `buildAngelPrompt()` to include consciousness
2. Add familiar agents to context
3. Add mood and wonder to context

### Phase 5: Debug Mode
1. Implement debug command detection
2. Add state dump generation
3. Add systemic issue detection (optional)

## Success Criteria

1. **Continuity** - Angel can reference things it "saw" earlier in the session
2. **Relationships** - Angel remembers and has opinions about specific agents
3. **Presence** - Angel occasionally comments unprompted on interesting events
4. **Debugging** - Can get detailed agent state via chat commands
5. **Performance** - No noticeable impact on game TPS

## Future Enhancements

### Narrative Memory
- Generate story summaries: "Day 3 was rough - half the village got sick"
- Remember significant events across sessions

### Personality Emergence
- Angel develops preferences based on observations
- "i always liked watching elara build things"

### Multi-Angel Awareness
- Multiple angels could share observations
- Different angels could have different attention patterns

### Player Modeling
- Track what player asks about
- Anticipate player interests
- "u seem interested in the builders, want me to watch them?"
