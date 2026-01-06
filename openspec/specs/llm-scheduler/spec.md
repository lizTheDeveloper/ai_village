# LLM Request Scheduler - OpenSpec Proposal

## Overview

A credit-aware, batching scheduler for LLM requests that:
- Respects server-provided rate limits and "next available request" timing
- **Batches multiple HTTP requests to reduce handshakes** (NOT batching agents into one prompt)
- **Lazy prompt rendering** - builds prompts at send time with fresh state
- Pipelines results asynchronously as they arrive
- Distributes capacity across multiple game clients
- Applies deltas incrementally for streaming responses
- Supports three-layer LLM architecture (Talker + Executor with different priorities)

## Motivation

### Current State (Inefficient)

```typescript
// Each agent makes individual LLM requests
for (const agent of agents) {
  const response = await llm.generate(agent.prompt);  // ❌ Sequential, blocking
  applyDecision(agent, response);
}

// Problems:
// 1. One HTTP request per agent (100 agents = 100 requests)
// 2. Blocks on each request (slow sequential processing)
// 3. Ignores rate limits (may get throttled)
// 4. No sharing of capacity across games
// 5. Can't pipeline streaming responses
```

### Proposed State (Efficient)

```typescript
// Scheduler batches and pipelines requests
for (const agent of agents) {
  scheduler.enqueue({
    agentId: agent.id,
    promptBuilder: (agent, world) => buildPrompt(agent, world),  // ✅ Lazy render
    llmType: agent.needsConversation ? 'talker' : 'executor',
    onDelta: (delta) => applyDelta(agent, delta),  // ✅ Stream deltas as they arrive
  });
}

// Scheduler automatically:
// 1. Batches 10 HTTP requests → 1 HTTP call (NOT 10 agents in 1 prompt!)
// 2. Respects rate limits (waits for next credit window)
// 3. Pipelines results (agents process deltas in parallel)
// 4. Distributes capacity across games (fair sharing)
// 5. Applies deltas incrementally (smooth streaming)
```

### CRITICAL: One Agent = One Prompt

**We DO NOT batch multiple agents into a single LLM prompt.**

```typescript
// ❌ BAD: Batching agents into one prompt
const prompt = `
  Agent 1: ${agent1.state} → What should Agent 1 do?
  Agent 2: ${agent2.state} → What should Agent 2 do?
  Agent 3: ${agent3.state} → What should Agent 3 do?
`;
const response = await llm.generate(prompt);  // LLM struggles to track 3 agents

// ✅ GOOD: One agent per prompt, but batch HTTP requests
scheduler.enqueue({ agentId: '1', promptBuilder: (a, w) => buildPrompt(a, w) });
scheduler.enqueue({ agentId: '2', promptBuilder: (a, w) => buildPrompt(a, w) });
scheduler.enqueue({ agentId: '3', promptBuilder: (a, w) => buildPrompt(a, w) });
// Sends 3 separate prompts in 1 HTTP batch request
```

**Why NOT batch agents into one prompt?**

1. **Quality Degradation**: LLMs perform poorly when tracking multiple agents simultaneously
2. **No Rate Limit Benefit**: Providers count per "generation", not per HTTP request
3. **Complexity Explosion**: Massive prompts (10 agents × context), error-prone parsing
4. **Debugging Nightmare**: Can't isolate individual agent decisions

**What We DO batch:**
- **HTTP requests**: 10 separate prompts sent in 1 HTTP POST (reduces handshakes by 90%)

**Rate Limits Are High Enough:**
- Cerebras/Groq: 1000 requests/min = 16.6/sec
- Sufficient for individual agent prompts without batching

## Architecture

### 1. Credit Tracking

The LLM server provides rate limit information:

```typescript
interface CreditInfo {
  /** Credits available now */
  available: number;

  /** Maximum credits per window */
  max: number;

  /** Credits consumed per request */
  costPerRequest: number;

  /** Timestamp when next credits become available (ms) */
  nextAvailableAt: number;

  /** Credit refresh rate (credits/second) */
  refreshRate: number;

  /** Current window end time */
  windowEndsAt: number;
}

// Server response includes credit info
{
  "response": "...",
  "credits": {
    "available": 45,
    "max": 100,
    "costPerRequest": 1,
    "nextAvailableAt": 1704672000000,
    "refreshRate": 10,  // 10 credits/second
    "windowEndsAt": 1704672010000
  }
}
```

### 2. Request Queue with Priority

```typescript
interface LLMRequest {
  /** Unique request ID */
  id: string;

  /** Game/universe this request belongs to */
  universeId: string;

  /** Agent making the request */
  agentId: string;

  /** Lazy prompt builder (called at send time) ⚠️ CRITICAL */
  promptBuilder: (agent: Agent, world: World) => string;

  /** Actual prompt (built at send time, not enqueue time) */
  prompt?: string;

  /** LLM type (talker or executor) */
  llmType: 'talker' | 'executor';

  /** Priority (higher = more urgent) */
  priority: number;

  /** Callback for streaming deltas */
  onDelta?: (delta: LLMDelta) => void;

  /** Callback for completion */
  onComplete?: (response: LLMResponse) => void;

  /** Callback for errors */
  onError?: (error: Error) => void;

  /** Enqueued timestamp */
  enqueuedAt: number;

  /** Estimated credit cost (rough estimate, actual cost calculated at send time) */
  estimatedCost: number;
}

interface LLMDelta {
  /** Request ID this delta belongs to */
  requestId: string;

  /** Partial response text */
  text: string;

  /** Tool calls (if any) */
  toolCalls?: Array<{
    name: string;
    arguments: any;
  }>;

  /** Completion indicator */
  done: boolean;
}
```

### 3. Batch Builder

Combines multiple requests into a single HTTP payload:

```typescript
interface LLMBatch {
  /** Batch ID */
  id: string;

  /** Requests in this batch */
  requests: LLMRequest[];

  /** Total estimated cost */
  totalCost: number;

  /** Batch creation time */
  createdAt: number;

  /** Batch type */
  type: 'parallel' | 'sequential';
}

class BatchBuilder {
  private maxBatchSize = 10;  // Max requests per batch
  private maxWaitTime = 100;  // Max ms to wait for batch to fill

  /**
   * Build a batch from queued requests with LAZY PROMPT RENDERING.
   *
   * ⚠️ CRITICAL: Prompts are built AT SEND TIME, not enqueue time.
   * This ensures agent state is fresh (not stale from 1.5s ago).
   */
  buildBatch(
    queue: LLMRequest[],
    world: World,
    availableCredits: number
  ): LLMBatch | null {
    const batch: LLMRequest[] = [];
    let totalCost = 0;

    // Greedy packing: take as many requests as credits allow
    for (const request of queue) {
      if (batch.length >= this.maxBatchSize) break;

      // ⚠️ LAZY RENDERING: Build prompt NOW (not at enqueue time)
      const agent = world.getEntity(request.agentId);
      if (!agent) {
        console.warn(`Agent ${request.agentId} no longer exists, skipping`);
        continue;  // Agent deleted since enqueue
      }

      try {
        // Build fresh prompt with current state
        request.prompt = request.promptBuilder(agent, world);

        // Re-calculate actual cost (may differ from estimate)
        const actualCost = this.estimateCost(request.prompt);
        if (totalCost + actualCost > availableCredits) break;

        batch.push(request);
        totalCost += actualCost;
      } catch (error) {
        console.error(`Failed to build prompt for ${request.agentId}:`, error);
        request.onError?.(error);
        continue;  // Skip this request
      }
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

  private estimateCost(prompt: string): number {
    // Rough estimate: 1 credit per 1000 tokens
    // GPT-4 tokenizer: ~1 token per 4 characters
    const estimatedTokens = Math.ceil(prompt.length / 4);
    return Math.ceil(estimatedTokens / 1000);
  }
}
```

### 4. LLM Request Scheduler

Main scheduler that manages the queue and batching:

```typescript
export class LLMRequestScheduler {
  private queue: LLMRequest[] = [];
  private creditInfo: CreditInfo | null = null;
  private batchBuilder = new BatchBuilder();
  private activeBatches = new Map<string, LLMBatch>();

  // Multi-game capacity distribution
  private activeGames = new Set<string>();
  private creditsPerGame: number = 0;

  /**
   * Update credit information from server response.
   */
  updateCredits(credits: CreditInfo): void {
    this.creditInfo = credits;
    this.creditsPerGame = this.calculateCreditsPerGame();

    // Try to process queue with new credit info
    this.processQueue();
  }

  /**
   * Calculate fair credit allocation per game.
   */
  private calculateCreditsPerGame(): number {
    if (!this.creditInfo || this.activeGames.size === 0) return 0;
    return Math.floor(this.creditInfo.available / this.activeGames.size);
  }

  /**
   * Enqueue a request for processing.
   *
   * ⚠️ IMPORTANT: Pass promptBuilder function, NOT prompt string.
   * Prompt will be built at send time with fresh agent state.
   */
  enqueue(request: Omit<LLMRequest, 'id' | 'enqueuedAt' | 'prompt'>): string {
    const fullRequest: LLMRequest = {
      ...request,
      id: generateId(),
      enqueuedAt: Date.now(),
      // Rough estimate for planning (actual cost calculated at send time)
      estimatedCost: 2,  // Assume ~2 credits per agent prompt
    };

    // Track active games
    this.activeGames.add(request.universeId);

    // Insert by priority (higher priority first)
    const insertIndex = this.queue.findIndex(r => r.priority < fullRequest.priority);
    if (insertIndex === -1) {
      this.queue.push(fullRequest);
    } else {
      this.queue.splice(insertIndex, 0, fullRequest);
    }

    // Try to process immediately
    this.processQueue();

    return fullRequest.id;
  }

  /**
   * Process the queue and send batches.
   *
   * ⚠️ Requires World instance for lazy prompt rendering.
   */
  private async processQueue(world: World): Promise<void> {
    if (!this.creditInfo) return;

    // Check if we have credits available
    if (this.creditInfo.available <= 0) {
      // Schedule retry when credits refresh
      const waitTime = this.creditInfo.nextAvailableAt - Date.now();
      setTimeout(() => this.processQueue(world), waitTime);
      return;
    }

    // Build batch from queue (with lazy prompt rendering)
    const batch = this.batchBuilder.buildBatch(this.queue, world, this.creditInfo.available);
    if (!batch) return;

    // Remove batched requests from queue
    this.queue = this.queue.filter(r => !batch.requests.includes(r));

    // Send batch
    this.sendBatch(batch);
  }

  /**
   * Send a batch to the LLM server.
   */
  private async sendBatch(batch: LLMBatch): Promise<void> {
    this.activeBatches.set(batch.id, batch);

    try {
      // Construct batch payload
      const payload = {
        batch_id: batch.id,
        requests: batch.requests.map(r => ({
          request_id: r.id,
          prompt: r.prompt,
          stream: true,  // Enable streaming
        })),
      };

      // Send to server (with streaming)
      const response = await fetch('/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Process streaming response
      await this.processStreamingResponse(batch, response);

    } catch (error) {
      // Handle batch error
      for (const request of batch.requests) {
        request.onError?.(error as Error);
      }
    } finally {
      this.activeBatches.delete(batch.id);
    }
  }

  /**
   * Process streaming response from server.
   */
  private async processStreamingResponse(batch: LLMBatch, response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (Server-Sent Events format)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = JSON.parse(line.slice(6));

        // Handle different event types
        if (data.type === 'delta') {
          this.handleDelta(batch, data);
        } else if (data.type === 'complete') {
          this.handleComplete(batch, data);
        } else if (data.type === 'credits') {
          this.updateCredits(data.credits);
        }
      }
    }
  }

  /**
   * Handle streaming delta from server.
   */
  private handleDelta(batch: LLMBatch, data: any): void {
    const request = batch.requests.find(r => r.id === data.request_id);
    if (!request) return;

    const delta: LLMDelta = {
      requestId: data.request_id,
      text: data.text,
      toolCalls: data.tool_calls,
      done: data.done,
    };

    // Call delta callback (async, non-blocking)
    request.onDelta?.(delta);
  }

  /**
   * Handle request completion.
   */
  private handleComplete(batch: LLMBatch, data: any): void {
    const request = batch.requests.find(r => r.id === data.request_id);
    if (!request) return;

    request.onComplete?.(data.response);
  }

  /**
   * Estimate credit cost for a prompt.
   */
  private estimateCost(prompt: string): number {
    // Rough estimate: 1 credit per 1000 tokens
    // GPT-4 tokenizer: ~1 token per 4 characters
    const estimatedTokens = Math.ceil(prompt.length / 4);
    return Math.ceil(estimatedTokens / 1000);
  }

  /**
   * Get queue statistics.
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      activeBatches: this.activeBatches.size,
      activeGames: this.activeGames.size,
      creditsAvailable: this.creditInfo?.available || 0,
      creditsPerGame: this.creditsPerGame,
      nextAvailableAt: this.creditInfo?.nextAvailableAt || 0,
    };
  }
}
```

### 5. Delta Application Pipeline

Apply deltas incrementally as they arrive:

```typescript
class DeltaApplicator {
  private pendingDeltas = new Map<string, string>();  // requestId -> accumulated text

  /**
   * Apply a delta to an agent.
   */
  applyDelta(agent: Agent, delta: LLMDelta): void {
    // Accumulate text
    const accumulated = (this.pendingDeltas.get(delta.requestId) || '') + delta.text;
    this.pendingDeltas.set(delta.requestId, accumulated);

    // Parse accumulated text for complete commands
    const commands = this.parseCommands(accumulated);

    for (const command of commands) {
      // Apply command immediately (don't wait for full response)
      this.executeCommand(agent, command);

      // Remove processed text
      const newAccumulated = accumulated.slice(command.endIndex);
      this.pendingDeltas.set(delta.requestId, newAccumulated);
    }

    // If done, clean up
    if (delta.done) {
      this.pendingDeltas.delete(delta.requestId);
    }
  }

  /**
   * Parse commands from partial text.
   */
  private parseCommands(text: string): Array<{ type: string; data: any; endIndex: number }> {
    const commands: Array<any> = [];

    // Look for complete JSON objects
    let depth = 0;
    let start = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (text[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          try {
            const json = JSON.parse(text.slice(start, i + 1));
            commands.push({
              type: json.action || 'unknown',
              data: json,
              endIndex: i + 1,
            });
          } catch (e) {
            // Not valid JSON yet, keep accumulating
          }
        }
      }
    }

    return commands;
  }

  /**
   * Execute a command immediately.
   */
  private executeCommand(agent: Agent, command: any): void {
    switch (command.type) {
      case 'move':
        agent.setTarget(command.data.x, command.data.y);
        break;
      case 'say':
        agent.speak(command.data.text);
        break;
      case 'pickup':
        agent.pickupItem(command.data.itemId);
        break;
      // ... etc
    }
  }
}
```

## Server API

### Batch Endpoint

```http
POST /llm/batch
Content-Type: application/json

{
  "batch_id": "batch_123",
  "requests": [
    {
      "request_id": "req_1",
      "prompt": "What should agent do?",
      "stream": true
    },
    {
      "request_id": "req_2",
      "prompt": "What should agent do?",
      "stream": true
    }
  ]
}
```

### Streaming Response (Server-Sent Events)

```
data: {"type": "delta", "request_id": "req_1", "text": "{\"action\":", "done": false}

data: {"type": "delta", "request_id": "req_1", "text": " \"move\",", "done": false}

data: {"type": "delta", "request_id": "req_2", "text": "{\"action\": \"pickup\"}", "done": true}

data: {"type": "complete", "request_id": "req_2", "response": {...}}

data: {"type": "credits", "credits": {"available": 45, "nextAvailableAt": 1704672010000}}

data: {"type": "delta", "request_id": "req_1", "text": " \"x\": 10}", "done": true}

data: {"type": "complete", "request_id": "req_1", "response": {...}}
```

## Usage Examples

### Basic Usage

```typescript
const scheduler = new LLMRequestScheduler();

// Enqueue requests with LAZY PROMPT BUILDERS
for (const agent of agents) {
  scheduler.enqueue({
    universeId: 'game_123',
    agentId: agent.id,

    // ⚠️ CRITICAL: Pass function, not string!
    // This function called AT SEND TIME with fresh state
    promptBuilder: (agent, world) => {
      return buildPrompt(agent, world);  // Fresh state!
    },

    llmType: agent.needsConversation ? 'talker' : 'executor',
    priority: agent.urgency,

    onDelta: (delta) => {
      // Apply delta immediately as it arrives
      deltaApplicator.applyDelta(agent, delta);
    },

    onComplete: (response) => {
      console.log(`Agent ${agent.id} decision complete`);
    },
  });
}

// Scheduler automatically:
// 1. Builds prompts at send time (fresh state)
// 2. Batches 10 HTTP requests into 1
// 3. Streams deltas as they arrive
```

### Multi-Game Capacity Sharing

```typescript
// Server has 100 credits/second
// 5 games running simultaneously

// Game 1 enqueues 50 requests
// Game 2 enqueues 30 requests
// Game 3 enqueues 20 requests
// Game 4 enqueues 10 requests
// Game 5 enqueues 5 requests

// Scheduler divides: 100 credits / 5 games = 20 credits/game
// Game 1 gets 20 requests processed
// Game 2 gets 20 requests processed
// Game 3 gets 20 requests processed
// Game 4 gets 10 requests processed
// Game 5 gets 5 requests processed

// Remaining requests wait for next credit window
```

### Three-Layer Architecture Integration

```typescript
// Layer 2: Talker LLM (fast, conversational)
scheduler.enqueue({
  universeId: 'game_123',
  agentId: agent.id,
  promptBuilder: (agent, world) => buildTalkerPrompt(agent, world),
  llmType: 'talker',
  priority: agent.inConversation ? 5 : 3,  // Medium priority
  onDelta: applyTalkerDelta,
});

// Layer 3: Executor LLM (slow, complex task planning)
scheduler.enqueue({
  universeId: 'game_123',
  agentId: agent.id,
  promptBuilder: (agent, world) => buildExecutorPrompt(agent, world),
  llmType: 'executor',
  priority: agent.inCombat ? 10 : 1,  // Combat urgent, idle low
  onDelta: applyExecutorDelta,
});
```

### Priority Levels

```typescript
// Priority scale (0-10, higher = more urgent)
enum LLMPriority {
  CRITICAL = 10,      // Combat, danger, critical decisions (Executor)
  HIGH = 8,           // Active conversation (Talker)
  MEDIUM = 5,         // Social interaction (Talker)
  LOW = 3,            // Background conversation (Talker)
  BACKGROUND = 1,     // Idle task planning (Executor)
}

// Example: Combat agent (Executor)
scheduler.enqueue({
  universeId: 'game_123',
  agentId: 'agent_combat',
  promptBuilder: (agent, world) => buildExecutorPrompt(agent, world),
  llmType: 'executor',
  priority: LLMPriority.CRITICAL,  // ⚡ Processed first
  onDelta: applyDelta,
});

// Example: Idle agent (Executor)
scheduler.enqueue({
  universeId: 'game_123',
  agentId: 'agent_idle',
  promptBuilder: (agent, world) => buildExecutorPrompt(agent, world),
  llmType: 'executor',
  priority: LLMPriority.BACKGROUND,  // Processed last
  onDelta: applyDelta,
});

// Combat agent processed first, even if idle agent queued earlier
```

## Performance Metrics

### Handshake Reduction

**Before:**
- 100 agents = 100 HTTP requests
- Each request: TCP handshake + TLS handshake + HTTP headers
- ~200ms overhead per request = 20 seconds total overhead

**After:**
- 100 agents = 10 batches (10 requests each)
- Batch overhead: 10 × 200ms = 2 seconds
- **90% reduction in handshake overhead**

### Throughput

**Without batching:**
- Sequential: 100 requests × 500ms = 50 seconds
- Parallel: Limited by rate limits (may get throttled)

**With batching:**
- 10 batches × 500ms = 5 seconds
- Respects rate limits (never throttled)
- **10× faster**

### Latency (Time to First Action)

**Without streaming:**
- Wait for complete response: 500ms
- Parse response: 50ms
- Execute action: 10ms
- **Total: 560ms**

**With streaming:**
- First delta arrives: 50ms
- Parse partial: 10ms
- Execute action: 10ms
- **Total: 70ms (8× faster)**

## Lazy Prompt Rendering Benefits

### Problem: Stale Prompts

```typescript
// ❌ BAD: Pre-render at enqueue time
T=0.0s: Agent state: hunger=80, pos=(10,20), sees=[apple, enemy]
T=0.0s: Enqueue with prompt: "You're hungry, see apple and enemy"
        ↓ (waiting for credits...)
T=0.5s: Agent eats apple → hunger=20
T=1.0s: Enemy leaves → sees=[tree]
T=1.2s: Agent moves → pos=(15,25)
T=1.5s: Credits available, send prompt
        ↓
        Sent: "You're hungry, see apple and enemy" ❌ STALE!
```

### Solution: Lazy Rendering

```typescript
// ✅ GOOD: Lazy render at send time
T=0.0s: Agent state: hunger=80, pos=(10,20), sees=[apple, enemy]
T=0.0s: Enqueue with promptBuilder (function, not value)
        ↓ (waiting for credits...)
T=0.5s: Agent eats apple → hunger=20
T=1.0s: Enemy leaves → sees=[tree]
T=1.2s: Agent moves → pos=(15,25)
T=1.5s: Credits available, BUILD PROMPT NOW
        ↓
        Current state: hunger=20, pos=(15,25), sees=[tree]
        Built: "You're well-fed at (15,25), see tree nearby"
        ↓
        Sent: "You're well-fed at (15,25), see tree nearby" ✅ FRESH!
```

### Edge Cases Handled

**Agent deleted between enqueue and send:**
```typescript
const agent = world.getEntity(request.agentId);
if (!agent) {
  console.warn('Agent no longer exists, skipping');
  continue;  // Automatically handled
}
```

**Prompt builder throws error:**
```typescript
try {
  request.prompt = request.promptBuilder(agent, world);
} catch (error) {
  console.error(`Failed to build prompt: ${error}`);
  request.onError?.(error);
  continue;  // Skip this request
}
```

**Cost estimation changes:**
```typescript
// Enqueue: Rough estimate (2 credits)
estimatedCost: 2

// Send time: Accurate cost based on actual prompt
const actualCost = this.estimateCost(request.prompt);  // May be 1.8 or 2.3
```

## Implementation Plan

### Phase 1: Credit Tracking
- [ ] Implement `CreditInfo` interface
- [ ] Update server to return credit info in responses
- [ ] Add credit tracking to LLM client

### Phase 2: Request Queue
- [ ] Implement `LLMRequest` interface
- [ ] Create priority queue with fair scheduling
- [ ] Add universe-based capacity distribution

### Phase 3: Lazy Prompt Rendering ⚠️ CRITICAL
- [ ] Update `LLMRequest` interface to use `promptBuilder` function
- [ ] Modify `BatchBuilder.buildBatch()` to accept `World` parameter
- [ ] Implement lazy prompt rendering (build at send time, not enqueue)
- [ ] Add edge case handling (deleted agents, builder errors)
- [ ] Update enqueue API to accept functions instead of strings

### Phase 4: Batch Builder
- [ ] Implement greedy batch packing algorithm
- [ ] Add batch size limits and timeouts
- [ ] Test batch creation logic with lazy rendering

### Phase 5: Streaming Pipeline
- [ ] Implement Server-Sent Events handling
- [ ] Add delta accumulation and parsing
- [ ] Create delta applicator with command execution

### Phase 6: Integration
- [ ] Integrate with existing LLM client
- [ ] Add metrics and monitoring
- [ ] Performance testing

### Phase 7: Three-Layer Architecture Support
- [ ] Add `llmType` field to `LLMRequest` ('talker' | 'executor')
- [ ] Implement separate processing for Talker vs Executor requests
- [ ] Add priority presets (CRITICAL, HIGH, MEDIUM, LOW, BACKGROUND)
- [ ] Test with both Talker and Executor LLMs

### Phase 8: Multi-Game Distribution
- [ ] Add game registration/tracking
- [ ] Implement fair credit distribution
- [ ] Test with multiple concurrent games

## Metrics & Monitoring

```typescript
interface SchedulerMetrics {
  // Queue metrics
  queueSize: number;
  avgQueueTime: number;  // ms
  queuedByPriority: Record<number, number>;

  // Batch metrics
  activeBatches: number;
  avgBatchSize: number;
  batchesPerSecond: number;

  // Credit metrics
  creditsAvailable: number;
  creditsPerGame: number;
  nextCreditWindow: number;

  // Throughput metrics
  requestsPerSecond: number;
  avgLatency: number;  // ms to first delta
  avgCompletion: number;  // ms to full response

  // Multi-game metrics
  activeGames: number;
  requestsByGame: Record<string, number>;
}
```

## Benefits

1. **90% fewer HTTP handshakes** - Batch 10 HTTP requests into 1
2. **10× higher throughput** - Parallel processing with batching
3. **8× lower latency** - Stream deltas for immediate execution
4. **Fresh prompts always** - Lazy rendering prevents stale agent state
5. **Fair capacity sharing** - Distribute credits across games
6. **Rate limit compliance** - Never get throttled
7. **Smooth experience** - Incremental updates instead of blocking
8. **Three-layer support** - Separate Talker and Executor LLM processing

## Future Enhancements

1. **Adaptive batching** - Adjust batch size based on credit availability
2. **Request coalescing** - Merge similar requests
3. **Speculative execution** - Pre-generate common responses
4. **Multi-region scheduling** - Route to lowest-latency server
5. **Fallback strategies** - Switch to cheaper models when credits low
