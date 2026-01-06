# Lazy Prompt Rendering - Critical Design Pattern

## Problem: Stale Prompts

### Bad: Pre-render at Enqueue Time ❌

```typescript
// T=0: Agent hungry, enqueue request
scheduler.enqueue({
  agentId: 'agent_1',
  prompt: buildPrompt(agent),  // ❌ Captures state at T=0
  // Agent state: hunger=80, position=(10, 20), sees=[apple, enemy]
});

// T=1.5s: Credits available, send batch
// Agent has moved, eaten, and enemy left
// But prompt still says: "You're hungry at (10, 20), you see apple and enemy"
// LLM response will be based on OLD state!
```

### Good: Lazy Render at Send Time ✅

```typescript
// T=0: Enqueue request descriptor (no prompt yet)
scheduler.enqueue({
  agentId: 'agent_1',
  promptBuilder: (agent) => buildPrompt(agent),  // ✅ Function, not value
  // Only metadata stored, no snapshot
});

// T=1.5s: Credits available, build batch NOW
const batch = scheduler.buildBatch();
for (const request of batch.requests) {
  const agent = world.getEntity(request.agentId);
  request.prompt = request.promptBuilder(agent);  // ✅ Fresh state!
  // Agent state: hunger=20, position=(15, 25), sees=[tree, rock]
  // Prompt reflects CURRENT state
}

// Send batch with fresh prompts
```

## Updated Architecture

### Request Interface

```typescript
interface LLMRequest {
  /** Unique request ID */
  id: string;

  /** Game/universe this request belongs to */
  universeId: string;

  /** Agent making the request */
  agentId: string;

  /** Lazy prompt builder (called at send time) */
  promptBuilder: (agent: Agent, world: World) => string;

  /** Actual prompt (built at send time) */
  prompt?: string;

  /** Priority (higher = more urgent) */
  priority: number;

  /** Enqueued timestamp */
  enqueuedAt: number;

  /** Estimated credit cost (rough, for planning) */
  estimatedCost: number;

  /** Callbacks */
  onDelta?: (delta: LLMDelta) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}
```

### Lazy Batch Building

```typescript
class BatchBuilder {
  /**
   * Build batch with lazy prompt rendering.
   * Prompts are rendered RIGHT BEFORE sending, using current state.
   */
  buildBatch(
    queue: LLMRequest[],
    world: World,
    availableCredits: number
  ): LLMBatch | null {
    const batch: LLMRequest[] = [];
    let totalCost = 0;

    for (const request of queue) {
      if (batch.length >= this.maxBatchSize) break;
      if (totalCost + request.estimatedCost > availableCredits) break;

      // RENDER PROMPT NOW (not at enqueue time)
      const agent = world.getEntity(request.agentId);
      if (!agent) {
        console.warn(`Agent ${request.agentId} no longer exists, skipping`);
        continue;
      }

      // Build fresh prompt with current state
      request.prompt = request.promptBuilder(agent, world);

      // Re-calculate actual cost (may differ from estimate)
      const actualCost = this.estimateCost(request.prompt);
      if (totalCost + actualCost > availableCredits) break;

      batch.push(request);
      totalCost += actualCost;
    }

    if (batch.length === 0) return null;

    return {
      id: generateId(),
      requests: batch,
      totalCost,
      createdAt: Date.now(),
      type: 'parallel',
    };
  }
}
```

### Updated Enqueue API

```typescript
// OLD API (bad - captures stale state)
scheduler.enqueue({
  agentId: agent.id,
  prompt: buildPrompt(agent),  // ❌ Stale immediately
});

// NEW API (good - lazy render)
scheduler.enqueue({
  agentId: agent.id,
  promptBuilder: (agent, world) => {
    // This function called AT SEND TIME
    // Agent state is fresh!
    return `
      You are at (${agent.position.x}, ${agent.position.y}).
      Hunger: ${agent.needs.hunger}/100
      You see: ${getVisibleEntities(agent, world).join(', ')}
      What do you do?
    `;
  },
  priority: agent.inCombat ? 10 : 1,
});
```

## Timeline Comparison

### Without Lazy Rendering (Stale Data)

```
T=0.0s  Agent state: hunger=80, pos=(10,20), sees=[apple, enemy]
T=0.0s  Enqueue with prompt: "You're hungry, see apple and enemy"
        ↓ (waiting for credits...)
T=0.5s  Agent eats apple → hunger=20
T=1.0s  Enemy leaves → sees=[tree]
T=1.2s  Agent moves → pos=(15,25)
T=1.5s  Credits available, send prompt
        ↓
        Sent: "You're hungry, see apple and enemy" ❌ STALE!
        ↓
T=2.0s  LLM: "Pick up the apple and flee from enemy"
        ↓
        ❌ Apple already eaten!
        ❌ Enemy already gone!
        ❌ Agent not at (10,20) anymore!
```

### With Lazy Rendering (Fresh Data)

```
T=0.0s  Agent state: hunger=80, pos=(10,20), sees=[apple, enemy]
T=0.0s  Enqueue with promptBuilder (function, not value)
        ↓ (waiting for credits...)
T=0.5s  Agent eats apple → hunger=20
T=1.0s  Enemy leaves → sees=[tree]
T=1.2s  Agent moves → pos=(15,25)
T=1.5s  Credits available, BUILD PROMPT NOW
        ↓
        Current state: hunger=20, pos=(15,25), sees=[tree]
        Built: "You're well-fed at (15,25), see tree nearby"
        ↓
        Sent: "You're well-fed at (15,25), see tree nearby" ✅ FRESH!
        ↓
T=2.0s  LLM: "Explore around the tree, maybe find resources"
        ↓
        ✅ Accurate state!
        ✅ Relevant decision!
```

## Prompt Builder Patterns

### Basic Builder

```typescript
function buildAgentPrompt(agent: Agent, world: World): string {
  const vision = getVisibleEntities(agent, world);
  const inventory = agent.inventory.items.map(i => i.name);

  return `
You are ${agent.identity.name}.
Position: (${agent.position.x}, ${agent.position.y})
Health: ${agent.health}/${agent.maxHealth}
Hunger: ${agent.needs.hunger}/100
Inventory: ${inventory.join(', ') || 'empty'}
You see: ${vision.join(', ') || 'nothing nearby'}

What do you do?
  `.trim();
}

// Enqueue
scheduler.enqueue({
  agentId: agent.id,
  promptBuilder: buildAgentPrompt,  // Pass function reference
  priority: 5,
});
```

### Contextual Builder (Combat vs Idle)

```typescript
function buildContextualPrompt(agent: Agent, world: World): string {
  const vision = getVisibleEntities(agent, world);
  const enemies = vision.filter(e => e.hasComponent('enemy'));

  if (enemies.length > 0) {
    // Combat context - detailed tactical info
    return `
COMBAT SITUATION!
You: ${agent.identity.name} | HP: ${agent.health}/${agent.maxHealth}
Enemies: ${enemies.map(e => `${e.name} (${e.distance}m)`).join(', ')}
Weapons: ${agent.inventory.weapons.join(', ')}
Cover nearby: ${findCover(agent, world).join(', ')}

Choose action: [attack, flee, take_cover, use_item]
    `.trim();
  } else {
    // Idle context - exploration and planning
    return `
You're ${agent.identity.name} at (${agent.position.x}, ${agent.position.y}).
Nearby: ${vision.join(', ')}
Current goal: ${agent.goals.current}

What's your next move?
    `.trim();
  }
}
```

### Cached Builder (for expensive operations)

```typescript
// Some prompt data is expensive to compute (pathfinding, etc.)
// Cache it at agent level, invalidate when state changes

class CachedPromptBuilder {
  private cache = new Map<string, { prompt: string; validUntil: number }>();

  build(agent: Agent, world: World): string {
    const cached = this.cache.get(agent.id);
    const now = Date.now();

    // Cache valid for 100ms (multiple requests can share)
    if (cached && now < cached.validUntil) {
      return cached.prompt;
    }

    // Expensive computation
    const nearbyPoints = findInterestingLocations(agent, world);  // Pathfinding
    const socialContext = analyzeSocialSituation(agent, world);    // Graph queries

    const prompt = `
Position: (${agent.position.x}, ${agent.position.y})
Points of interest: ${nearbyPoints.join(', ')}
Social context: ${socialContext}

What do you do?
    `.trim();

    this.cache.set(agent.id, {
      prompt,
      validUntil: now + 100,  // Valid for 100ms
    });

    return prompt;
  }
}

const builder = new CachedPromptBuilder();
scheduler.enqueue({
  agentId: agent.id,
  promptBuilder: (agent, world) => builder.build(agent, world),
  priority: 5,
});
```

## Integration with Render Cache

The pattern is the same as render caching:
- **Render cache:** Cache UI rendering until component updates
- **Prompt builder:** Lazy-build prompts until request sends

Both defer work until the last possible moment to ensure fresh data.

```typescript
// Analogous patterns

// Render Cache: Lazy render
if (cached) {
  return cached;  // Use cached render
} else {
  return render(component);  // Render NOW with fresh data
}

// Prompt Builder: Lazy build
if (sendNow) {
  const prompt = promptBuilder(agent, world);  // Build NOW with fresh data
  send(prompt);
}
```

## Edge Cases

### Agent Deleted Between Enqueue and Send

```typescript
// Enqueue
scheduler.enqueue({
  agentId: 'agent_123',
  promptBuilder: buildPrompt,
});

// ... later, agent dies/deleted

// Build batch (send time)
const agent = world.getEntity('agent_123');
if (!agent) {
  console.warn('Agent no longer exists, skipping request');
  continue;  // Skip this request
}
```

### State Changed Dramatically

```typescript
// Enqueue: Agent exploring peacefully
scheduler.enqueue({
  agentId: 'agent_1',
  promptBuilder: buildPrompt,
  priority: 1,  // Low priority
});

// Before send: Agent enters combat!
// Agent now has priority 10 requests enqueued

// Solution: Re-prioritize or cancel old requests
scheduler.cancelRequest('old_request_id');
scheduler.enqueue({
  agentId: 'agent_1',
  promptBuilder: buildCombatPrompt,
  priority: 10,  // High priority
});
```

### Prompt Builder Throws

```typescript
try {
  request.prompt = request.promptBuilder(agent, world);
} catch (error) {
  console.error(`Failed to build prompt for ${request.agentId}:`, error);
  request.onError?.(error);
  continue;  // Skip this request
}
```

## Performance Considerations

### Cost Estimation

Since we can't know the exact prompt until send time, use rough estimates for planning:

```typescript
// Enqueue time: Rough estimate
estimatedCost: 2,  // Assume ~2 credits

// Send time: Accurate cost
const prompt = promptBuilder(agent, world);
const actualCost = estimateCost(prompt);  // May be 1.8 or 2.3

// Re-check if batch fits
if (totalCost + actualCost > availableCredits) {
  // Remove from batch, try next request
}
```

### Prompt Builder Performance

Prompt builders should be fast (<10ms):

```typescript
// ✅ GOOD: Fast operations
function fastPrompt(agent: Agent, world: World): string {
  return `
    Position: ${agent.position}
    Health: ${agent.health}
    Nearby: ${agent.vision.visible.length} entities
  `;
}

// ❌ BAD: Slow operations (pathfinding, complex queries)
function slowPrompt(agent: Agent, world: World): string {
  const path = findPath(agent.position, goal);  // 50ms pathfinding!
  const allAgents = world.query().with('agent').execute();  // 20ms query!

  return `Path: ${path}, Agents: ${allAgents.length}`;
}

// ✅ SOLUTION: Cache expensive operations
const pathCache = new Map();
function cachedPrompt(agent: Agent, world: World): string {
  const cached = pathCache.get(agent.id);
  if (cached && cached.validUntil > Date.now()) {
    return cached.prompt;
  }

  // Compute once, cache for 1 second
  const path = findPath(agent.position, goal);
  const prompt = `Path: ${path}`;
  pathCache.set(agent.id, { prompt, validUntil: Date.now() + 1000 });
  return prompt;
}
```

## Summary

### Key Principle

**Always render prompts at send time, not enqueue time.**

This ensures:
1. ✅ Prompts reflect current state
2. ✅ No stale data sent to LLM
3. ✅ Decisions based on accurate information
4. ✅ Deleted/invalid agents automatically skipped

### Updated Flow

```
Enqueue: Store promptBuilder function (not prompt string)
  ↓
Queue: Requests wait for credits (state can change)
  ↓
Send: Call promptBuilder(agent, world) → get fresh prompt
  ↓
Batch: Send fresh prompts to LLM
  ↓
Response: Agent acts on current state
```

This pattern mirrors the render cache philosophy: **defer work until the last moment to ensure freshness**.
