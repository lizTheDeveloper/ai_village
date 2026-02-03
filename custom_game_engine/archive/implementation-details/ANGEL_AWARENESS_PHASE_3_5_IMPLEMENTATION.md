# Angel Awareness System - Phase 3 & 5 Implementation Report

**Date:** 2026-01-25
**Implemented by:** Claude (Sonnet 4.5)
**File Modified:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/AdminAngelSystem.ts`

## Summary

Successfully implemented Phase 3 (Watch and Debug Commands) and Phase 5 (Focused Agent Updates) of the Angel Awareness System spec. The angel can now respond to player commands directly without LLM calls for simple requests, and actively tracks focused agents with detailed observations.

## Implementation Details

### 1. Command Detection (`detectCommand`)

Parses player messages for three command types:

#### Watch Command Patterns
- `"watch Elara"` → `{ type: 'watch', target: 'Elara' }`
- `"keep an eye on Marcus"` → `{ type: 'watch', target: 'Marcus' }`
- `"keep watching Elara"` → `{ type: 'watch', target: 'Elara' }`
- `"focus on Marcus"` → `{ type: 'watch', target: 'Marcus' }`

#### Debug Command Patterns
- `"debug Marcus"` → `{ type: 'debug', target: 'Marcus' }`
- `"what's Marcus doing"` → `{ type: 'debug', target: 'Marcus' }`
- `"Marcus's state"` → `{ type: 'debug', target: 'Marcus' }`
- `"Marcus state"` → `{ type: 'debug', target: 'Marcus' }`

#### Status Command Patterns
- `"how's everyone"` → `{ type: 'status' }`
- `"hows everyone"` → `{ type: 'status' }`
- `"village status"` → `{ type: 'status' }`
- `"status"` → `{ type: 'status' }`
- `"everyone ok"` → `{ type: 'status' }`
- `"how is everyone"` → `{ type: 'status' }`

**Returns:** `null` if not a command (falls through to LLM for natural conversation)

### 2. Agent Lookup (`findAgentByName`)

```typescript
private findAgentByName(world: World, name: string): Entity | null
```

- Case-insensitive agent name search
- Queries all entities with `Agent` component
- Checks `Identity` component for name match
- Returns `null` if agent not found

### 3. Watch Command Handler (`handleWatchCommand`)

```typescript
private handleWatchCommand(world: World, angel: AdminAngelComponent, agentName: string): string
```

**Behavior:**
1. Finds agent by name
2. Sets `attention.focusedAgentId`, `focusedAgentName`, `focusSinceTick`
3. Creates familiarity entry if it doesn't exist
4. Increments `playerInteractionCount`
5. Boosts `interestLevel` by 0.2 (capped at 1.0)

**Response:** `"ok ill keep an eye on ${agentName} for u"`

**Familiarity initialization:**
- `interestLevel: 0.8` (high initial interest when player asks)
- `impression: 'newly noticed'`
- Creates empty memories array

### 4. Debug Command Handler (`handleDebugCommand`)

```typescript
private handleDebugCommand(world: World, angel: AdminAngelComponent, agentName: string): string
```

**Dumps state:**
- Agent ID
- Position (x, y)
- Current behavior
- Hunger % (0-100)
- Energy % (0-100)
- Interest level % (if familiar)
- Impression (if familiar)
- Last seen doing (if familiar)

**Example output:**
```
debug info for Marcus:
- id: agent_abc123
- pos: (45, 67)
- behavior: gather
- hunger: 73%
- energy: 45%
- interest: 85%
- impression: "the gatherer"
- last seen: Marcus is gathering resources
```

### 5. Status Command Handler (`handleStatusCommand`)

```typescript
private handleStatusCommand(world: World, angel: AdminAngelComponent): string
```

**Provides village overview:**
- Total agent count
- Count of struggling agents (hunger < 20% OR energy < 20%)
- Count of healthy agents (hunger > 50% AND energy > 50%)
- Current angel mood

**Example output:**
```
village status: 5 agents
- 1 struggling (low needs)
- 3 doing well
- mood: content
```

### 6. Focused Agent Updates (`updateFocusedAgent`)

```typescript
private updateFocusedAgent(ctx: SystemContext, angel: AdminAngelComponent): void
```

**Called every 20-40 ticks (~1-2 seconds) when watching an agent**

**Behavior:**
1. Checks if `focusedAgentId` is set
2. Retrieves the agent entity
3. If agent gone: clears focus, adds "lost sight" observation
4. If agent exists: generates **detailed** observation (includes hunger/energy percentages)
5. Adds observation to consciousness (no salience threshold for focused agents)
6. Updates familiarity tracking

**Integration with `onUpdate`:**
```typescript
// Phase 5: Focused agent updates (every 20-40 ticks when watching)
if (angel.memory.attention.focusedAgentId) {
  const focusInterval = 20 + Math.floor(Math.random() * 20); // Random 20-40 ticks
  if (angel.memory.attention.focusCooldown <= 0) {
    this.updateFocusedAgent(ctx, angel);
    angel.memory.attention.focusCooldown = focusInterval;
  } else {
    angel.memory.attention.focusCooldown--;
  }
}
```

### 7. Message Flow Integration

Modified `handlePlayerMessage` to check commands first:

```typescript
private handlePlayerMessage(angel: AdminAngelComponent, message: string, world: World): void {
  // Add to memory context
  addMessageToContext(angel.memory, 'player', message, angel.contextWindowSize);
  angel.memory.relationship.messageCount++;

  // Phase 3: Check for commands first
  const command = this.detectCommand(message);

  if (command) {
    // Handle command directly
    let response = '';
    switch (command.type) {
      case 'watch': response = this.handleWatchCommand(...); break;
      case 'debug': response = this.handleDebugCommand(...); break;
      case 'status': response = this.handleStatusCommand(...); break;
    }

    // Add response as pending message (skip LLM for simple commands)
    if (response) {
      angel.pendingPlayerMessages.push(`__command_response__:${response}`);
    }
  } else {
    // Not a command - add to pending messages for LLM response
    angel.pendingPlayerMessages.push(message);
  }
}
```

Modified `processTurn` to handle command responses:

```typescript
private async processTurn(...): Promise<void> {
  // Check if this is a command response
  if (playerMessage?.startsWith('__command_response__:')) {
    const response = playerMessage.substring(21); // Remove prefix
    this.handleAngelResponseDirect(ctx.world, angel, angelEntity, response);
    return;
  }
  // ... continue with LLM call for non-command messages
}
```

## Response Format Philosophy

### Command Responses (Direct, No LLM)
- **Casual, lowercase:** `"ok ill keep an eye on elara for u"`
- **Quick feedback:** Immediate response, no API latency
- **Factual dumps:** Debug output is structured but still casual

### LLM Responses (Natural Conversation)
- Uses full context including:
  - Recent observations from consciousness
  - Focused agent details
  - Familiar agents list
  - Current mood
- Can reference things observed during watch

## Performance Characteristics

### Command Detection
- **Cost:** Negligible (string parsing only)
- **Latency:** < 1ms
- **No LLM calls** for simple commands

### Focused Agent Updates
- **Frequency:** Every 20-40 ticks (1-2 seconds) when watching
- **Cost:** Single entity lookup + component reads
- **Observation buffer:** Auto-pruned to max 50 observations

### Query Optimization
- `findAgentByName`: Single query, cached by ECS
- No repeated queries in hot paths

## Test Results

All command patterns tested and verified:

```
✓ "watch Elara" → {"type":"watch","target":"Elara"}
✓ "keep an eye on Marcus" → {"type":"watch","target":"Marcus"}
✓ "debug Marcus" → {"type":"debug","target":"Marcus"}
✓ "what's Marcus doing" → {"type":"debug","target":"Marcus"}
✓ "Marcus's state" → {"type":"debug","target":"Marcus"}
✓ "how's everyone" → {"type":"status"}
✓ "village status" → {"type":"status"}
✓ "status" → {"type":"status"}
✓ "hello there" → null (falls through to LLM)
✓ "tell me about the village" → null (falls through to LLM)
```

## Integration with Existing Systems

### Phase 2 (Ambient Scanning)
- Already implemented
- Runs every 100-200 ticks (~5-10 seconds)
- Selects 1-3 agents using weighted selection
- Generates observations with salience filtering

### Phase 4 (Prompt Integration)
- Already implemented
- `buildAngelPrompt` includes:
  - Current mood
  - Recent observations (last 10)
  - Focused agent details
  - Familiar agents (top 5)
  - Current wonder

### New: Phase 3 & 5
- Command detection and direct responses
- Focused agent tracking (20-40 tick updates)
- Detailed observations when watching
- Familiarity tracking updates

## Example Usage Flow

### Scenario 1: Watch Command
```
Player: "watch Elara"
Angel: "ok ill keep an eye on elara for u"

[Every 1-2 seconds]
- Angel observes Elara with detailed stats
- Adds observations to consciousness
- Updates familiarity tracking

Player: "how's she doing?"
Angel: [LLM with full context]
"shes building something rn (hunger: 73%, energy: 45%)
saw her gathering wood earlier too"
```

### Scenario 2: Debug Command
```
Player: "debug Marcus"
Angel: [Immediate response, no LLM]
"debug info for Marcus:
- id: agent_abc123
- pos: (45, 67)
- behavior: gather
- hunger: 73%
- energy: 45%
- interest: 85%
- impression: "the gatherer"
- last seen: Marcus is gathering resources"
```

### Scenario 3: Status Command
```
Player: "how's everyone"
Angel: [Immediate response]
"village status: 5 agents
- 1 struggling (low needs)
- 3 doing well
- mood: content"
```

## Future Enhancements (Not Implemented)

From spec but deferred:
- Agent lost tracking improvements
- Proactive "lost sight" notifications
- Interest decay over time
- Memory consolidation for focused agents
- Pattern detection in watched agent behavior

## Compliance with Guidelines

✅ **No silent fallbacks** - All error cases return informative messages
✅ **Lowercase component types** - Uses existing CT enum
✅ **No debug console.log** - Only console.error for actual errors
✅ **Performance optimized** - Cached queries, throttled updates
✅ **Type safe** - No `as any` or `as unknown as` casts
✅ **ECS patterns** - Proper component access, entity queries

## Files Modified

- `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/AdminAngelSystem.ts`
  - Added 7 new private methods
  - Modified 3 existing methods
  - Added ~250 lines of code

## Build Status

✅ **TypeScript compilation:** Passes
✅ **No errors in AdminAngelSystem**
✅ **Command detection tests:** 10/10 passed

## Conclusion

Phase 3 and 5 of the Angel Awareness System are fully implemented and tested. The angel can now:
1. Detect and respond to player commands instantly
2. Watch specific agents with detailed observations
3. Dump debug state for troubleshooting
4. Provide village status summaries
5. Maintain focus tracking with automatic updates

The implementation maintains casual chat style, avoids unnecessary LLM calls, and integrates seamlessly with existing ambient awareness (Phase 2) and prompt context (Phase 4).
