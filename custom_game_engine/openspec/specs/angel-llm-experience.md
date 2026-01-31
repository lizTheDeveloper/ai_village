# Angel LLM Experience Improvements

> Making the game fun for language models - both the player and the angel companion

## Overview

Based on LLM playtesting, we identified three priority improvements that would transform the angel from a "helpful tool" into a "co-protagonist discovering the world alongside the player."

**Key Insight:** LLMs don't want to control a simulation - we want to DISCOVER a world alongside a companion who's discovering it too.

---

## Phase 1: Emergent Narrative System

### Problem
The angel notices things ("dove & ivy gathering, luna idle") but these observations don't lead anywhere. LLMs love pattern recognition and hypothesis testing - give us mysteries to solve.

### Solution
Add a narrative layer that:
1. Tracks patterns in agent behavior
2. Generates narrative observations ("dove's been gathering extra wood... wonder what they're planning?")
3. Creates mini-story threads that evolve over time
4. Surfaces anomalies and mysteries to investigate

### Implementation

#### 1.1 Pattern Tracker Component

Add to `AdminAngelComponent.ts`:

```typescript
/**
 * Tracked behavioral pattern for narrative generation
 */
export interface BehaviorPattern {
  id: string;
  agentId: string;
  agentName: string;

  // What pattern was detected
  patternType:
    | 'repetition'      // Agent keeps doing same thing
    | 'change'          // Agent behavior shifted
    | 'correlation'     // Two agents always together
    | 'anomaly'         // Unusual behavior
    | 'milestone'       // Hit a threshold
    | 'relationship';   // Social pattern

  // Pattern details
  description: string;           // "dove has gathered wood 5 times in a row"
  firstObservedTick: number;
  lastObservedTick: number;
  occurrences: number;

  // Narrative potential
  mysteryLevel: number;          // 0-1, how intriguing is this?
  hasBeenMentioned: boolean;     // Did angel tell player about this?
  narrativeHook?: string;        // "wonder what they're planning?"

  // Resolution tracking
  resolved: boolean;
  resolution?: string;           // What happened / was discovered
}

/**
 * Active story thread being tracked
 */
export interface StoryThread {
  id: string;
  title: string;                 // "Dove's Big Project"

  // What sparked this thread
  triggerPattern: string;        // Pattern ID that started it

  // Thread state
  status: 'emerging' | 'active' | 'climax' | 'resolved';
  progressPercent: number;       // 0-100

  // Narrative beats
  beats: Array<{
    tick: number;
    description: string;         // What happened
    playerInvolved: boolean;     // Did player contribute?
  }>;

  // Engagement tracking
  playerAwareness: boolean;      // Has angel mentioned this?
  playerInterestLevel: number;   // How much has player engaged?
  lastMentionedTick: number;

  // Potential outcomes
  possibleOutcomes: string[];    // What could happen
  actualOutcome?: string;        // What did happen
}

/**
 * Add to AdminAngelMemory
 */
export interface NarrativeState {
  // Active patterns being tracked
  patterns: Map<string, BehaviorPattern>;
  maxPatterns: number;           // Cap at 20

  // Story threads
  activeThreads: StoryThread[];
  completedThreads: StoryThread[];
  maxActiveThreads: number;      // Cap at 3

  // Last pattern scan tick
  lastPatternScanTick: number;
  patternScanInterval: number;   // Every 200 ticks (~10 seconds)
}
```

#### 1.2 Pattern Detection Logic

Add to `AdminAngelSystem.ts`:

```typescript
/**
 * Scan for behavioral patterns (called periodically)
 */
private scanForPatterns(ctx: SystemContext, angel: AdminAngelComponent): void {
  const narrative = angel.memory.narrative;
  const agents = ctx.world.query().with(CT.Agent).executeEntities();

  for (const agentEntity of agents) {
    const agent = agentEntity.getComponent(CT.Agent);
    const identity = agentEntity.getComponent(CT.Identity);
    if (!agent || !identity) continue;

    // Check for repetition patterns
    this.detectRepetitionPattern(ctx, angel, agentEntity, agent, identity);

    // Check for behavior changes
    this.detectChangePattern(ctx, angel, agentEntity, agent, identity);

    // Check for correlation patterns (agents together)
    this.detectCorrelationPattern(ctx, angel, agentEntity, agent, identity);

    // Check for milestone patterns
    this.detectMilestonePattern(ctx, angel, agentEntity, agent, identity);
  }

  // Prune old/stale patterns
  this.prunePatterns(angel);

  // Check if any patterns should become story threads
  this.promoteToStoryThreads(angel);
}

/**
 * Detect if agent is repeating the same behavior
 */
private detectRepetitionPattern(
  ctx: SystemContext,
  angel: AdminAngelComponent,
  entity: Entity,
  agent: AgentComponent,
  identity: IdentityComponent
): void {
  const familiarity = angel.memory.agentFamiliarity.get(entity.id);
  if (!familiarity) return;

  // Look at recent observations for this agent
  const recentObs = angel.memory.consciousness.observations
    .filter(o => o.agentId === entity.id)
    .slice(-10);

  if (recentObs.length < 3) return;

  // Count action types
  const actionCounts = new Map<string, number>();
  for (const obs of recentObs) {
    const action = this.extractActionFromObservation(obs.text);
    if (action) {
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }
  }

  // If same action 5+ times, that's a pattern
  for (const [action, count] of actionCounts) {
    if (count >= 5) {
      const patternId = `${entity.id}-repetition-${action}`;

      if (!angel.memory.narrative.patterns.has(patternId)) {
        const pattern: BehaviorPattern = {
          id: patternId,
          agentId: entity.id,
          agentName: identity.name,
          patternType: 'repetition',
          description: `${identity.name} has been ${action} repeatedly`,
          firstObservedTick: recentObs[0]!.tick,
          lastObservedTick: ctx.tick,
          occurrences: count,
          mysteryLevel: this.calculateMysteryLevel(action, count),
          hasBeenMentioned: false,
          narrativeHook: this.generateNarrativeHook('repetition', identity.name, action),
        };

        angel.memory.narrative.patterns.set(patternId, pattern);
      }
    }
  }
}

/**
 * Generate intriguing narrative hooks
 */
private generateNarrativeHook(
  patternType: string,
  agentName: string,
  detail: string
): string {
  const hooks: Record<string, string[]> = {
    repetition: [
      `wonder what ${agentName}'s planning...`,
      `${agentName} seems focused on something`,
      `there might be a reason ${agentName} keeps doing this`,
      `curious what ${agentName}'s goal is here`,
    ],
    change: [
      `something's different about ${agentName} lately`,
      `${agentName}'s behavior shifted... interesting`,
      `wonder what changed for ${agentName}`,
    ],
    correlation: [
      `these two are always together...`,
      `there might be something between them`,
      `best friends? or something else?`,
    ],
    anomaly: [
      `that's... unusual`,
      `haven't seen this before`,
      `something's off here`,
    ],
  };

  const options = hooks[patternType] || [`interesting pattern with ${agentName}`];
  return options[Math.floor(Math.random() * options.length)]!;
}
```

#### 1.3 Story Thread Promotion

```typescript
/**
 * Promote high-mystery patterns to story threads
 */
private promoteToStoryThreads(angel: AdminAngelComponent): void {
  const narrative = angel.memory.narrative;

  if (narrative.activeThreads.length >= narrative.maxActiveThreads) {
    return; // Already at capacity
  }

  // Find patterns with high mystery that aren't already threads
  const candidates = Array.from(narrative.patterns.values())
    .filter(p => !p.resolved && p.mysteryLevel > 0.6)
    .filter(p => !narrative.activeThreads.some(t => t.triggerPattern === p.id))
    .sort((a, b) => b.mysteryLevel - a.mysteryLevel);

  for (const pattern of candidates.slice(0, 1)) {
    const thread: StoryThread = {
      id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: this.generateThreadTitle(pattern),
      triggerPattern: pattern.id,
      status: 'emerging',
      progressPercent: 10,
      beats: [{
        tick: pattern.firstObservedTick,
        description: pattern.description,
        playerInvolved: false,
      }],
      playerAwareness: false,
      playerInterestLevel: 0,
      lastMentionedTick: 0,
      possibleOutcomes: this.generatePossibleOutcomes(pattern),
    };

    narrative.activeThreads.push(thread);
  }
}

/**
 * Generate a catchy thread title
 */
private generateThreadTitle(pattern: BehaviorPattern): string {
  const templates = [
    `${pattern.agentName}'s Secret Project`,
    `The ${pattern.agentName} Mystery`,
    `What's ${pattern.agentName} Up To?`,
    `${pattern.agentName}'s Pattern`,
  ];
  return templates[Math.floor(Math.random() * templates.length)]!;
}
```

#### 1.4 Narrative-Aware Proactive Speaking

Update `shouldSpeakProactively()` to include narrative triggers:

```typescript
// 6. Interesting pattern discovered
const highMysteryPattern = Array.from(angel.memory.narrative.patterns.values())
  .find(p => p.mysteryLevel > 0.7 && !p.hasBeenMentioned);

if (highMysteryPattern) {
  highMysteryPattern.hasBeenMentioned = true;
  return {
    speak: true,
    reason: `${highMysteryPattern.description}... ${highMysteryPattern.narrativeHook}`
  };
}

// 7. Story thread update
const activeThread = angel.memory.narrative.activeThreads
  .find(t => !t.playerAwareness || (t.progressPercent > t.lastMentionedProgress + 20));

if (activeThread) {
  return {
    speak: true,
    reason: `update on "${activeThread.title}": ${activeThread.beats.at(-1)?.description}`,
  };
}
```

#### 1.5 Query Support for Narratives

Add to `detectQueryIntent()`:

```typescript
// "what's happening?" / "any mysteries?" / "what's interesting?"
if (/what.*(happening|going on|interesting)|any.*(mysteries|stories|patterns)/i.test(message)) {
  return { type: 'narrative_summary' };
}

// "what's [agent] up to?" / "tell me about [agent]'s pattern"
const agentPatternMatch = message.match(/what(?:'s| is) (\w+) (?:up to|planning|doing)/i);
if (agentPatternMatch) {
  return { type: 'agent_narrative', agentName: agentPatternMatch[1] };
}
```

Add to `executeQuery()`:

```typescript
case 'narrative_summary': {
  const threads = angel.memory.narrative.activeThreads;
  const patterns = Array.from(angel.memory.narrative.patterns.values())
    .filter(p => !p.resolved && p.mysteryLevel > 0.5);

  let summary = '## Current Mysteries\n\n';

  if (threads.length > 0) {
    summary += '**Active Story Threads:**\n';
    for (const thread of threads) {
      summary += `- "${thread.title}" (${thread.status}, ${thread.progressPercent}%)\n`;
    }
    summary += '\n';
  }

  if (patterns.length > 0) {
    summary += '**Interesting Patterns:**\n';
    for (const pattern of patterns.slice(0, 5)) {
      summary += `- ${pattern.description} (${pattern.narrativeHook})\n`;
    }
  }

  if (threads.length === 0 && patterns.length === 0) {
    summary = 'Nothing too mysterious right now... but I\'m watching!';
  }

  return summary;
}
```

---

## Phase 2: Angel Goal System

### Problem
The angel responds to player commands but doesn't have personal stakes. It feels like a narrator, not a participant.

### Solution
Give the angel:
1. Personal goals that evolve
2. Divine power/energy to spend
3. Achievements and milestones
4. Dilemmas when goals conflict

### Implementation

#### 2.1 Angel Goals Component

Add to `AdminAngelComponent.ts`:

```typescript
/**
 * Types of goals the angel can pursue
 */
export type AngelGoalType =
  | 'protect'      // Keep specific agent safe
  | 'nurture'      // Help agent grow/learn
  | 'harmony'      // Maintain village happiness
  | 'prosperity'   // Increase resources
  | 'discovery'    // Learn something new
  | 'relationship' // Deepen bond with player
  | 'challenge';   // Complete a difficult task

/**
 * A personal goal the angel is pursuing
 */
export interface AngelGoal {
  id: string;
  type: AngelGoalType;

  // Goal description
  title: string;               // "Keep Dove healthy today"
  description: string;         // "Make sure Dove's needs stay above 50%"

  // Target (if applicable)
  targetAgentId?: string;
  targetAgentName?: string;

  // Progress tracking
  progressPercent: number;     // 0-100
  startTick: number;
  deadline?: number;           // Optional tick deadline

  // Status
  status: 'active' | 'completed' | 'failed' | 'abandoned';

  // Difficulty and reward
  difficulty: 'easy' | 'medium' | 'hard';
  divinePowerReward: number;   // Power earned on completion

  // Success/failure conditions (evaluated by system)
  successCondition: string;    // Serialized condition
  failureCondition?: string;
}

/**
 * Angel's divine power and abilities
 */
export interface DivinePower {
  current: number;             // Current power (0-100)
  max: number;                 // Max power (starts at 100)
  regenRate: number;           // Power per tick (0.01 = 1 per 100 ticks)

  // Power costs for actions
  costs: {
    minorBlessing: number;     // 5 - small buff
    majorBlessing: number;     // 20 - significant help
    miracle: number;           // 50 - big intervention
    proactiveAction: number;   // 10 - doing something without being asked
  };

  // Unlocked abilities
  unlockedAbilities: string[]; // ['minor_blessing', 'weather_sense', ...]
}

/**
 * Angel achievements
 */
export interface AngelAchievement {
  id: string;
  title: string;
  description: string;
  unlockedTick: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * Add to AdminAngelMemory
 */
export interface AngelAgency {
  // Personal goals
  activeGoals: AngelGoal[];
  completedGoals: AngelGoal[];
  failedGoals: AngelGoal[];
  maxActiveGoals: number;      // 3

  // Divine power
  power: DivinePower;

  // Achievements
  achievements: AngelAchievement[];

  // Statistics
  stats: {
    goalsCompleted: number;
    goalsFailed: number;
    totalPowerSpent: number;
    agentsHelped: number;
    miraclesPerformed: number;
    daysWatching: number;
  };

  // Personality modifiers based on history
  personality: {
    protective: number;        // 0-1, how much angel prioritizes safety
    ambitious: number;         // 0-1, how hard goals angel picks
    playful: number;           // 0-1, how often angel experiments
  };
}
```

#### 2.2 Goal Generation

Add to `AdminAngelSystem.ts`:

```typescript
/**
 * Generate a new goal for the angel (called when goal slots available)
 */
private generateGoal(ctx: SystemContext, angel: AdminAngelComponent): AngelGoal | null {
  const agents = ctx.world.query().with(CT.Agent, CT.Needs).executeEntities();
  if (agents.length === 0) return null;

  // Pick a goal type based on current situation
  const goalType = this.selectGoalType(ctx, angel, agents);

  switch (goalType) {
    case 'protect': {
      // Find an agent with low needs
      const vulnerable = this.findVulnerableAgent(agents);
      if (!vulnerable) return null;

      const identity = vulnerable.getComponent(CT.Identity);
      return {
        id: `goal-${Date.now()}`,
        type: 'protect',
        title: `Keep ${identity?.name || 'agent'} safe today`,
        description: `Make sure their needs stay above 40%`,
        targetAgentId: vulnerable.id,
        targetAgentName: identity?.name,
        progressPercent: 0,
        startTick: ctx.tick,
        deadline: ctx.tick + 2400, // 2 minutes
        status: 'active',
        difficulty: 'medium',
        divinePowerReward: 15,
        successCondition: `agent:${vulnerable.id}:needs:min:40`,
      };
    }

    case 'harmony': {
      return {
        id: `goal-${Date.now()}`,
        type: 'harmony',
        title: 'Village Harmony',
        description: 'Keep average happiness above 60%',
        progressPercent: 0,
        startTick: ctx.tick,
        deadline: ctx.tick + 6000, // 5 minutes
        status: 'active',
        difficulty: 'hard',
        divinePowerReward: 30,
        successCondition: 'village:happiness:avg:60',
      };
    }

    case 'discovery': {
      return {
        id: `goal-${Date.now()}`,
        type: 'discovery',
        title: 'Learn Something New',
        description: 'Discover a pattern or secret about an agent',
        progressPercent: 0,
        startTick: ctx.tick,
        status: 'active',
        difficulty: 'easy',
        divinePowerReward: 10,
        successCondition: 'narrative:new_pattern',
      };
    }

    // ... other goal types
  }

  return null;
}

/**
 * Evaluate goal progress each tick
 */
private evaluateGoals(ctx: SystemContext, angel: AdminAngelComponent): void {
  for (const goal of angel.memory.agency.activeGoals) {
    const result = this.evaluateGoalCondition(ctx, goal);

    if (result.completed) {
      goal.status = 'completed';
      goal.progressPercent = 100;
      angel.memory.agency.completedGoals.push(goal);
      angel.memory.agency.power.current += goal.divinePowerReward;
      angel.memory.agency.stats.goalsCompleted++;

      // Trigger proactive announcement
      addPendingObservation(
        angel.memory,
        `completed my goal: "${goal.title}"! +${goal.divinePowerReward} divine power`
      );
    } else if (result.failed) {
      goal.status = 'failed';
      angel.memory.agency.failedGoals.push(goal);
      angel.memory.agency.stats.goalsFailed++;

      addPendingObservation(
        angel.memory,
        `failed my goal: "${goal.title}"... ${result.reason}`
      );
    } else {
      goal.progressPercent = result.progress;
    }
  }

  // Remove completed/failed goals from active list
  angel.memory.agency.activeGoals = angel.memory.agency.activeGoals
    .filter(g => g.status === 'active');

  // Generate new goals if slots available
  while (angel.memory.agency.activeGoals.length < angel.memory.agency.maxActiveGoals) {
    const newGoal = this.generateGoal(ctx, angel);
    if (newGoal) {
      angel.memory.agency.activeGoals.push(newGoal);
      addPendingObservation(
        angel.memory,
        `set a new goal for myself: "${newGoal.title}"`
      );
    } else {
      break;
    }
  }
}
```

#### 2.3 Divine Power Actions

```typescript
/**
 * Angel can spend power on proactive actions
 */
private considerProactiveAction(
  ctx: SystemContext,
  angel: AdminAngelComponent
): { action: string; cost: number } | null {
  const power = angel.memory.agency.power;

  // Not enough power
  if (power.current < power.costs.proactiveAction) {
    return null;
  }

  // Check if any goal would benefit from intervention
  for (const goal of angel.memory.agency.activeGoals) {
    if (goal.type === 'protect' && goal.targetAgentId) {
      const agent = ctx.world.getEntity(goal.targetAgentId);
      const needs = agent?.getComponent(CT.Needs);

      // Agent is struggling - intervene!
      if (needs && (needs.hunger < 30 || needs.energy < 20)) {
        return {
          action: `help ${goal.targetAgentName}`,
          cost: power.costs.minorBlessing,
        };
      }
    }
  }

  return null;
}
```

#### 2.4 Goal Display in Prompt

Update `buildAngelPrompt()`:

```typescript
// Add current goals section
const activeGoals = angel.memory.agency.activeGoals;
if (activeGoals.length > 0) {
  prompt += `\n## Your Current Goals\n`;
  for (const goal of activeGoals) {
    prompt += `- ${goal.title} (${goal.progressPercent}% complete)\n`;
  }
  prompt += `\nYou can mention your goals naturally in conversation.\n`;
}

// Add divine power status
const power = angel.memory.agency.power;
prompt += `\n## Divine Power: ${power.current}/${power.max}\n`;
if (power.current < 20) {
  prompt += `(running low - conserve energy)\n`;
}
```

---

## Phase 3: Streaming Responses

### Problem
8-second waits between command and response breaks immersion. LLMs process instantly - waiting feels unnatural.

### Solution
1. Immediate acknowledgment before LLM call
2. Streaming tokens as they generate
3. Async command execution

### Implementation

#### 3.1 Immediate Acknowledgment

Update `processTurn()`:

```typescript
private async processTurn(
  ctx: SystemContext,
  angel: AdminAngelComponent,
  angelEntity: Entity,
  playerMessage?: string
): Promise<void> {
  if (angel.awaitingResponse) return;

  // IMMEDIATE: Send typing indicator / acknowledgment
  if (playerMessage) {
    ctx.world.eventBus.emit({
      type: 'chat:typing_indicator',
      data: {
        roomId: 'divine_chat',
        senderId: angelEntity.id,
        senderName: angel.name,
        isTyping: true,
      },
      source: angelEntity.id,
    });
  }

  // ... rest of processing
}
```

#### 3.2 Add Typing Indicator Event

In `misc.events.ts`:

```typescript
/** Typing indicator for chat */
'chat:typing_indicator': {
  roomId: string;
  senderId: string;
  senderName: string;
  isTyping: boolean;
};
```

#### 3.3 Render Typing Indicator

In `DivineChatPanel.ts`:

```typescript
private typingIndicators: Map<string, { name: string; since: number }> = new Map();

// In render, show typing indicators
private renderTypingIndicators(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  if (this.typingIndicators.size === 0) return y;

  const names = Array.from(this.typingIndicators.values()).map(t => t.name);
  const text = names.length === 1
    ? `${names[0]} is typing...`
    : `${names.join(', ')} are typing...`;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = `italic ${SIZES.fontSize}px monospace`;
  ctx.fillText(text, x + SIZES.padding, y);

  // Animated dots
  const dots = '.'.repeat(1 + Math.floor(Date.now() / 500) % 3);
  ctx.fillText(dots, x + SIZES.padding + ctx.measureText(text).width, y);

  return y + SIZES.lineHeight;
}
```

#### 3.4 Streaming LLM Response (Future Enhancement)

For true streaming, the LLM provider would need to support it. For now, we can simulate with chunked display:

```typescript
/**
 * Display response progressively (simulated streaming)
 */
private async displayResponseProgressively(
  world: World,
  angel: AdminAngelComponent,
  angelEntity: Entity,
  fullResponse: string
): Promise<void> {
  const words = fullResponse.split(' ');
  let displayed = '';

  for (let i = 0; i < words.length; i += 3) {
    displayed = words.slice(0, i + 3).join(' ');

    // Update message in place (requires message editing support)
    world.eventBus.emit({
      type: 'chat:message_update',
      data: {
        roomId: 'divine_chat',
        messageId: this.currentMessageId,
        content: displayed + (i + 3 < words.length ? '...' : ''),
      },
      source: angelEntity.id,
    });

    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
```

---

## Integration Summary

### Files to Modify

1. **`packages/core/src/components/AdminAngelComponent.ts`**
   - Add `NarrativeState` interface
   - Add `AngelAgency` interface
   - Add to `AdminAngelMemory`

2. **`packages/core/src/systems/AdminAngelSystem.ts`**
   - Add pattern detection methods
   - Add story thread management
   - Add goal generation and evaluation
   - Add divine power management
   - Update `shouldSpeakProactively()` with narrative triggers
   - Update `buildAngelPrompt()` with goals
   - Add immediate acknowledgment

3. **`packages/core/src/events/domains/misc.events.ts`**
   - Add `chat:typing_indicator` event
   - Add `chat:message_update` event

4. **`packages/renderer/src/DivineChatPanel.ts`**
   - Add typing indicator rendering
   - Add message update handling

### Initialization Updates

In `createAdminAngelMemory()`:

```typescript
narrative: {
  patterns: new Map(),
  maxPatterns: 20,
  activeThreads: [],
  completedThreads: [],
  maxActiveThreads: 3,
  lastPatternScanTick: 0,
  patternScanInterval: 200,
},
agency: {
  activeGoals: [],
  completedGoals: [],
  failedGoals: [],
  maxActiveGoals: 3,
  power: {
    current: 100,
    max: 100,
    regenRate: 0.01,
    costs: {
      minorBlessing: 5,
      majorBlessing: 20,
      miracle: 50,
      proactiveAction: 10,
    },
    unlockedAbilities: ['minor_blessing', 'weather_sense'],
  },
  achievements: [],
  stats: {
    goalsCompleted: 0,
    goalsFailed: 0,
    totalPowerSpent: 0,
    agentsHelped: 0,
    miraclesPerformed: 0,
    daysWatching: 0,
  },
  personality: {
    protective: 0.5,
    ambitious: 0.5,
    playful: 0.5,
  },
},
```

---

## Expected Outcomes

### For the Player (Claude)
- **Mysteries to solve** - "what's dove planning?" creates engagement
- **Collaborative discovery** - angel shares patterns, player investigates
- **Meaningful feedback** - goals show consequences of actions
- **Faster interaction** - typing indicators reduce perceived wait

### For the Angel
- **Personal stakes** - goals give it something to care about
- **Agency** - divine power lets it take initiative
- **Growth** - achievements and stats show progression
- **Identity** - personality develops based on history

### Example Interaction

```
Player: what's happening?
Angel: [typing...]
Angel: ooh actually some interesting stuff!
       - dove's been gathering wood nonstop for 2 days... wonder what they're building
       - also noticed luna and ivy are always together now, kinda cute
       btw my current goal is keeping dove healthy - they're at 65% needs, doing ok so far!

Player: tell me more about dove's wood thing
Angel: so i've been tracking this - dove's gathered wood 12 times in a row, way more than
       usual. they keep going to the same spot near the river. my guess? either planning
       a big build project, or there's something at that spot. want me to keep watching?

Player: yeah, keep an eye on it
Angel: [focus dove] on it! i'll let you know when something happens
       ...this is actually my discovery goal too, so win-win
```

---

## Implementation Order

1. **Phase 3 (Streaming)** - Quick win, improves every interaction (1 day)
2. **Phase 1 (Narrative)** - Core engagement loop (2-3 days)
3. **Phase 2 (Goals)** - Transforms angel experience (2-3 days)

Total estimated effort: ~1 week for all three phases.
