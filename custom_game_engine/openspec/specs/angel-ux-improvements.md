# Angel UX Improvements Specification

## Implementation Status: PROPOSED

**Author:** Claude + Ann (post-playtest)
**Date:** January 2026
**Related:** angel-awareness-system.md (Phase 1-5 already implemented)

---

## Executive Summary

Playtest of the angel chat companion revealed three categories of issues:

| Issue | Severity | Impact |
|-------|----------|--------|
| **Commands execute silently** | HIGH | Player can't verify actions worked |
| **No proactive observations** | MEDIUM | Angel feels reactive, under-utilized |
| **No structured query responses** | MEDIUM | Hard to make informed decisions |

The angel *has* the awareness system (Phases 1-5 from angel-awareness-system.md) but doesn't surface it effectively to players or LLMs interacting with the game.

---

## Problem 1: Silent Command Execution

### Current Behavior

When player says "can you make it rain?", angel responds:
```
sure thing [weather rain]
```

But:
1. The `[weather rain]` may or may not be visible (inconsistent)
2. No confirmation the command executed
3. No feedback on what changed in the world

### Desired Behavior

```
sure thing [weather rain]

[System]: Weather changed to rain
```

Or better:
```
done! [weather rain] it should start raining soon, u might see agents head for shelter
```

### Root Cause

`executeCommandDirect()` in `AdminAngelSystem.ts` emits events but there's no feedback loop:
```typescript
private executeCommandDirect(world: World, cmd: { type: string; args: string[] }): void {
  const emit = (type: string, data: Record<string, unknown>) => {
    world.eventBus.emit({ type, data, source: 'admin_angel' });
  };
  // ... emits event but never confirms
}
```

### Proposed Fix

#### Option A: Echo + System Feedback (Recommended)

1. **Always include command in response** - Update prompt to emphasize:
   ```
   IMPORTANT: when executing commands, always show them inline like:
   "on it [spawn agent]" or "done [weather rain]"
   never just describe what you did without the brackets
   ```

2. **Add command result events** - New event type `admin_angel:command_result`:
   ```typescript
   interface CommandResultEvent {
     command: string;        // "weather rain"
     success: boolean;
     result?: string;        // "Weather changed to rain"
     error?: string;         // "Unknown weather type: blizzard"
   }
   ```

3. **Subscribe to results in headless mode** - Print feedback:
   ```typescript
   world.eventBus.on('admin_angel:command_result', (event) => {
     const { command, success, result, error } = event.data;
     if (success) {
       console.log(`[System]: ${result}`);
     } else {
       console.log(`[System]: Command failed - ${error}`);
     }
   });
   ```

#### Option B: Command Execution Confirmation (Simpler)

Just have the handler emit a confirmation message back to chat:

```typescript
case 'weather':
  const weatherType = cmd.args[0] || 'clear';
  emit('admin_angel:weather_control', { weather: weatherType });

  // NEW: Emit confirmation to chat
  emit('chat:send_message', {
    roomId: 'divine_chat',
    senderId: '__system__',
    senderName: 'System',
    message: `Weather changing to ${weatherType}...`,
    type: 'system',
  });
  break;
```

### Implementation Details

**Files to modify:**
- `packages/core/src/systems/AdminAngelSystem.ts`
  - Add command result tracking
  - Update `executeCommandDirect()` to emit confirmations
- `demo/headless.ts`
  - Subscribe to `admin_angel:command_result` events

**New event types:**
```typescript
// Add to EventMap.ts
'admin_angel:command_result': {
  command: string;
  success: boolean;
  result?: string;
  error?: string;
};
```

---

## Problem 2: No Proactive Observations

### Current Behavior

The angel has a rich observation system (implemented in Phases 2-5):
- `AngelConsciousness.observations[]` - rolling buffer of things noticed
- `AngelConsciousness.mood` - worried, curious, protective, etc.
- `AgentFamiliarity` map - impressions of each agent
- `AngelAttention.focusedAgentId` - who it's watching

But **none of this is surfaced proactively**. The angel only speaks when spoken to.

### Desired Behavior

When something interesting happens (salience > 0.7), angel should speak:
```
[Angel weri]: hey btw sage looks really hungry, might wanna help them out
```

Or when mood changes to `worried`:
```
[Angel weri]: uh some of ur agents are struggling rn
```

### Root Cause

In `onUpdate()`, the proactive turn check is too restrictive:

```typescript
// Current code (line 1650-1660)
const ticksSinceLastProactive = Number(ctx.tick) - angel.memory.conversation.lastProactiveTick;
if (ticksSinceLastProactive >= angel.proactiveInterval && !angel.awaitingResponse) {
  // Check if there's something to say
  const pending = angel.memory.conversation.pendingObservations.length > 0;

  if (pending) {
    angel.memory.conversation.lastProactiveTick = Number(ctx.tick);
    this.processTurn(ctx, angel, angelEntity);
  }
}
```

Issues:
1. `pendingObservations` is only populated by game events (death, building complete), not by ambient scans
2. High-salience observations from `consciousness.observations` are ignored
3. Mood changes don't trigger proactive messages

### Proposed Fix

#### Add Proactive Triggers

```typescript
private shouldSpeakProactively(angel: AdminAngelComponent): { speak: boolean; reason?: string } {
  const consciousness = angel.memory.consciousness;

  // 1. High-salience observation (concern about an agent)
  const recentObs = consciousness.observations.slice(-5);
  const highSalience = recentObs.find(o => o.salience > 0.7 && o.type === 'concern');
  if (highSalience) {
    return { speak: true, reason: highSalience.text };
  }

  // 2. Mood changed to worried/protective
  if ((consciousness.mood === 'worried' || consciousness.mood === 'protective')
      && !consciousness.lastMoodReported) {
    return { speak: true, reason: `feeling ${consciousness.mood}` };
  }

  // 3. Something interesting with focused agent
  const focus = angel.memory.attention.focusedAgentId;
  if (focus) {
    const familiarity = angel.memory.agentFamiliarity.get(focus);
    const lastObs = consciousness.observations.findLast(o => o.agentId === focus);
    if (lastObs && lastObs.salience > 0.5) {
      return { speak: true, reason: lastObs.text };
    }
  }

  // 4. Current wonder (low probability proactive)
  if (consciousness.currentWonder && Math.random() < 0.05) {
    return { speak: true, reason: consciousness.currentWonder };
  }

  return { speak: false };
}
```

#### Update Proactive Turn Logic

```typescript
// In onUpdate()
const ticksSinceLastProactive = Number(ctx.tick) - angel.memory.conversation.lastProactiveTick;
const minProactiveInterval = 200; // At least 10 seconds between proactive messages
const maxProactiveInterval = 1200; // Don't go more than 60 seconds silent if interesting

if (ticksSinceLastProactive >= minProactiveInterval && !angel.awaitingResponse) {
  const { speak, reason } = this.shouldSpeakProactively(angel);

  if (speak || ticksSinceLastProactive >= maxProactiveInterval) {
    // Add reason to prompt context
    if (reason) {
      angel.memory.consciousness.proactiveTrigger = reason;
    }
    angel.memory.conversation.lastProactiveTick = Number(ctx.tick);
    this.processTurn(ctx, angel, angelEntity);
  }
}
```

#### Update Prompt for Proactive Turns

```typescript
// In buildAngelPrompt()
if (!playerMessage) {
  // Proactive turn
  const trigger = angel.memory.consciousness.proactiveTrigger;
  if (trigger) {
    prompt += `[proactive - something caught ur attention]: ${trigger}\n`;
    prompt += `share this observation naturally, dont be pushy. short msg.\n`;
  } else {
    prompt += `[proactive turn - only speak if something interesting happened]\n`;
  }
}
```

### Implementation Details

**Files to modify:**
- `packages/core/src/systems/AdminAngelSystem.ts`
  - Add `shouldSpeakProactively()` method
  - Update proactive turn logic in `onUpdate()`
  - Add `proactiveTrigger` to consciousness state
  - Track `lastMoodReported` to avoid spamming

**New fields in AdminAngelComponent:**
```typescript
interface AngelConsciousness {
  // ... existing fields ...
  proactiveTrigger?: string;    // What triggered this proactive turn
  lastMoodReported?: AngelMood; // Avoid duplicate mood messages
}
```

### Tuning Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `minProactiveInterval` | 200 ticks (10s) | Don't spam |
| `maxProactiveInterval` | 1200 ticks (60s) | Stay engaged |
| `concernSalienceThreshold` | 0.7 | Only important concerns |
| `focusSalienceThreshold` | 0.5 | Lower bar for watched agents |
| `wonderProbability` | 0.05 | Rare "thinking out loud" |

---

## Problem 3: No Structured Query Responses

### Current Behavior

Player: "who's the hungriest?"
Angel: "sage and flint are out gathering, autumn's building something"

This is prose, not an answer to the question.

### Desired Behavior

Player: "who's the hungriest?"
Angel: "sage is at 40% hunger, pretty low. u want me to help them find food?"

Or even better (structured):
```
hungriest right now:
- Sage: 40% hunger (gathering)
- Flint: 65% hunger (resting)
- Autumn: 80% hunger (building)

sage could use some help
```

### Root Cause

The LLM doesn't have structured data in its prompt - it only sees prose observations. When asked a specific question, it can't query the game state, only recall what it "noticed."

### Proposed Fix

#### Add Query Intent Detection

Before sending to LLM, detect if the message is a query:

```typescript
private detectQueryIntent(message: string): QueryIntent | null {
  const lower = message.toLowerCase();

  // Agent state queries
  if (lower.includes('hungriest') || lower.includes('who needs food')) {
    return { type: 'agent_needs', need: 'hunger', sort: 'asc' };
  }
  if (lower.includes('tired') || lower.includes('who needs sleep')) {
    return { type: 'agent_needs', need: 'energy', sort: 'asc' };
  }
  if (lower.includes('healthiest') || lower.includes('who\'s doing well')) {
    return { type: 'agent_needs', need: 'overall', sort: 'desc' };
  }

  // Resource queries
  if (lower.includes('do we have') || lower.includes('how much')) {
    const resource = this.extractResource(lower);
    if (resource) {
      return { type: 'resource_check', resource };
    }
  }

  // Agent activity queries
  if (lower.includes('what\'s everyone doing') || lower.includes('who\'s doing what')) {
    return { type: 'activity_summary' };
  }

  return null;
}

interface QueryIntent {
  type: 'agent_needs' | 'resource_check' | 'activity_summary';
  need?: string;
  sort?: 'asc' | 'desc';
  resource?: string;
}
```

#### Execute Query and Format Response

```typescript
private executeQuery(world: World, intent: QueryIntent): string {
  switch (intent.type) {
    case 'agent_needs': {
      const agents = world.query().with(CT.Agent).with(CT.Needs).executeEntities();
      const sorted = agents
        .map(a => ({
          name: a.getComponent(CT.Identity)?.name ?? 'Unknown',
          value: a.getComponent(CT.Needs)?.[intent.need!] ?? 1,
          behavior: a.getComponent(CT.Agent)?.behavior ?? 'idle'
        }))
        .sort((a, b) => intent.sort === 'asc' ? a.value - b.value : b.value - a.value);

      let result = `${intent.need} levels:\n`;
      for (const a of sorted.slice(0, 5)) {
        const pct = Math.round(a.value * 100);
        result += `- ${a.name}: ${pct}% (${a.behavior})\n`;
      }
      return result;
    }

    case 'resource_check': {
      const storage = world.query().with(CT.Building).with(CT.Inventory).executeEntities();
      let total = 0;
      for (const s of storage) {
        const inv = s.getComponent(CT.Inventory);
        const slot = inv?.slots.find(sl => sl?.itemId === intent.resource);
        total += slot?.quantity ?? 0;
      }
      return `${intent.resource}: ${total} total in storage`;
    }

    case 'activity_summary': {
      const agents = world.query().with(CT.Agent).executeEntities();
      const activities: Record<string, string[]> = {};

      for (const a of agents) {
        const name = a.getComponent(CT.Identity)?.name ?? 'Unknown';
        const behavior = a.getComponent(CT.Agent)?.behavior ?? 'idle';
        if (!activities[behavior]) activities[behavior] = [];
        activities[behavior].push(name);
      }

      let result = 'everyone rn:\n';
      for (const [behavior, names] of Object.entries(activities)) {
        result += `- ${behavior}: ${names.join(', ')}\n`;
      }
      return result;
    }

    default:
      return '';
  }
}
```

#### Inject Query Result into Prompt

```typescript
private handlePlayerMessage(angel: AdminAngelComponent, message: string, world: World): void {
  // Check for query intent first
  const queryIntent = this.detectQueryIntent(message);
  if (queryIntent) {
    const queryResult = this.executeQuery(world, queryIntent);
    // Inject result into the message context
    angel.memory.conversation.queryContext = queryResult;
  }

  // ... rest of existing logic
}
```

Then in `buildAngelPrompt()`:

```typescript
// If there's query context, include it
if (conv.queryContext) {
  prompt += `\n[query result - use this data to answer]:\n${conv.queryContext}\n`;
  conv.queryContext = null; // Clear after use
}
```

### Implementation Details

**Files to modify:**
- `packages/core/src/systems/AdminAngelSystem.ts`
  - Add `detectQueryIntent()` method
  - Add `executeQuery()` method
  - Update `handlePlayerMessage()` to check for queries
  - Update `buildAngelPrompt()` to include query context

**New fields:**
```typescript
interface ConversationState {
  // ... existing fields ...
  queryContext?: string; // Structured data for answering queries
}
```

### Query Types to Support

| Query Pattern | Intent Type | Response Format |
|---------------|-------------|-----------------|
| "who's hungriest?" | `agent_needs` | Sorted list with percentages |
| "do we have wood?" | `resource_check` | Total count + locations |
| "what's everyone doing?" | `activity_summary` | Grouped by activity |
| "how's sage?" | `agent_detail` | Full status for one agent |
| "any problems?" | `concerns` | Critical needs/issues |

---

## Implementation Phases

### Phase 1: Command Feedback (HIGH priority)
**Effort:** 2-3 hours
**Files:** AdminAngelSystem.ts, EventMap.ts, headless.ts

1. Add `admin_angel:command_result` event type
2. Update each command case to emit result
3. Subscribe to results in headless mode
4. Update prompt to emphasize showing `[commands]`

### Phase 2: Proactive Observations (MEDIUM priority)
**Effort:** 3-4 hours
**Files:** AdminAngelSystem.ts, AdminAngelComponent.ts

1. Add `shouldSpeakProactively()` method
2. Update proactive turn logic in `onUpdate()`
3. Add `proactiveTrigger` field
4. Update prompt for proactive context
5. Tune thresholds via playtesting

### Phase 3: Structured Queries (MEDIUM priority)
**Effort:** 4-5 hours
**Files:** AdminAngelSystem.ts

1. Add `detectQueryIntent()` with pattern matching
2. Add `executeQuery()` for each intent type
3. Add query context to prompt building
4. Test with common query patterns
5. Add more query types based on usage

---

## Success Criteria

### Phase 1 Success
- [ ] When angel executes a command, player sees feedback
- [ ] Failed commands show error messages
- [ ] Commands always visible as `[command]` in response

### Phase 2 Success
- [ ] Angel speaks unprompted when agent needs are critical
- [ ] Angel mentions mood-relevant observations
- [ ] Proactive messages feel natural, not spammy (1 per 30-60s max)

### Phase 3 Success
- [ ] "Who's hungriest?" returns sorted list
- [ ] "Do we have wood?" returns count
- [ ] "What's everyone doing?" returns activity summary
- [ ] Angel uses structured data to give accurate answers

---

## Testing Plan

### Manual Testing

1. **Command feedback**: Run headless, ask angel to pause/spawn/weather
   - Verify `[command]` appears in response
   - Verify system feedback printed

2. **Proactive observations**: Run headless for 2-3 minutes
   - Verify angel speaks when agent needs drop below 20%
   - Verify spacing between proactive messages

3. **Structured queries**: Run headless, ask various questions
   - "Who's hungriest?" → should see sorted list
   - "Do we have wood?" → should see count
   - "What's Sage doing?" → should see detailed status

### Automated Testing

Add to `AdminAngelSystem.test.ts`:

```typescript
describe('command feedback', () => {
  it('emits command_result on weather change', async () => {
    // Setup, trigger weather command, verify event emitted
  });
});

describe('proactive observations', () => {
  it('speaks when agent hunger drops below 15%', async () => {
    // Setup agent with low hunger, run ticks, verify chat message
  });
});

describe('structured queries', () => {
  it('detects "who is hungriest" as agent_needs query', () => {
    const intent = system.detectQueryIntent('who is the hungriest?');
    expect(intent).toEqual({ type: 'agent_needs', need: 'hunger', sort: 'asc' });
  });
});
```

---

## Future Enhancements

### Multi-modal Responses
- Include ASCII art for complex state
- Generate mini-reports for status queries

### Learning Query Patterns
- Track which queries players ask most
- Suggest queries: "btw u can ask me 'whos hungriest'"

### Command Suggestions
- When player describes goal, suggest command
- "sounds like u want [spawn agent]?"

### Personalized Thresholds
- Track player's response to proactive messages
- Reduce frequency if they seem annoyed
- Increase if they engage with observations
