# LLM Queue and Rate Limiting System

**Status**: Draft
**Created**: 2026-01-04
**Domain**: LLM / Decision Systems
**Priority**: High
**Related Systems**: LLMDecisionProcessor, LLMDecisionQueue, ProxyLLMProvider, MetricsServer

---

## Executive Summary

This specification defines an enhanced LLM queuing and rate limiting system that provides:

1. **Provider-level fallback**: Automatic fallback from Groq → Cerebras on 429 rate limit errors
2. **Global retry logic**: Wait and retry when all providers are rate limited
3. **Defer mechanism**: Agents can explicitly defer their turn to avoid rate limits
4. **Server-side proxy**: Centralized LLM request routing through metrics server
5. **Per-provider queuing**: Separate semaphores for different LLM providers (Claude, GPT-4, Cerebras, etc.)
6. **Custom agent configuration**: Agents with custom LLM configs use provider-specific queues
7. **Multi-game cooldown tracking**: Server tracks cooldowns per game session and communicates minimum wait time to clients
8. **Per-API-key rate limiting**: Different API keys maintain separate cooldowns even for same provider

---

## Problem Statement

### Current Limitations

Based on investigation of the existing system:

1. **No 429-specific fallback**: `FallbackProvider` falls back on any error, not specifically rate limits
2. **No global retry**: When all providers are rate limited, requests fail rather than waiting
3. **No defer mechanism**: Agents cannot voluntarily wait when they know LLM is busy
4. **Mixed architecture**: Both client-side and server-side LLM calling paths exist
5. **Global queue**: All agents share one queue regardless of provider (LLMDecisionQueue uses single `maxConcurrent`)
6. **Custom LLM agents lack queuing**: Agents with `customLLM` configs bypass queue entirely
7. **No multi-game coordination**: Server doesn't track how many games are using shared API keys
8. **No cooldown communication**: Server doesn't tell clients when next request is allowed
9. **No per-API-key tracking**: Different API keys for same provider don't have separate rate limits

### Example Failure Scenario

```
Agent A (using Groq) → 429 rate limit → fails
Agent B (using Groq) → 429 rate limit → fails
Agent C (using Cerebras) → works fine (different provider)
Agent D (using custom GPT-4) → no queue, hammers OpenAI API
```

**Problem**: Agents A and B should automatically try Cerebras, or wait and retry Groq. Agent D should coordinate with other GPT-4 agents.

---

## Goals

### Primary Goals

1. **Intelligent fallback**: On 429 errors, automatically try next available provider
2. **Global coordination**: When all providers rate limited, wait 1 second and retry
3. **Explicit defer**: Agents can call `defer()` to wait without making LLM request
4. **Centralized routing**: All LLM requests go through server-side proxy
5. **Per-provider queues**: Separate rate limiting for each LLM provider
6. **Custom agent support**: Agents with custom LLM configs join provider-specific queues

### Non-Goals

- Client-side LLM provider redundancy (all routing happens server-side)
- Cross-server queue coordination (single server instance only)
- LLM request cancellation (requests run to completion once started)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LLMDecisionProcessor  →  LLMDecisionQueue  →  ProxyLLMProvider │
│        (System)              (Async Queue)        (HTTP Client)  │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ HTTP POST /api/llm/generate
                                 │ { prompt, model, agentId, ... }
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                      SERVER (Metrics Server)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    LLMRequestRouter (NEW)                        │
│                    ┌───────────────────┐                         │
│                    │ Provider Detector │                         │
│                    │ (model → queue)   │                         │
│                    └─────────┬─────────┘                         │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│      │ Groq Queue   │ │Cerebras Queue│ │ GPT-4 Queue  │         │
│      │ Semaphore(2) │ │ Semaphore(2) │ │ Semaphore(1) │         │
│      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘         │
│             │                │                │                  │
│      ┌──────▼────────────────▼────────────────▼───────┐          │
│      │     ProviderPoolManager (NEW)                  │          │
│      │  - Tracks rate limit status per provider       │          │
│      │  - 429 detection → mark provider as limited    │          │
│      │  - Fallback chain: Groq → Cerebras → Retry(1s)│          │
│      └──────┬─────────────────────────────────────────┘          │
│             │                                                    │
│      ┌──────▼──────────────────────────────────────┐             │
│      │  Existing Provider Implementations          │             │
│      │  - OpenAICompatProvider (Groq, Cerebras)    │             │
│      │  - OpenAIProvider (GPT-4, Claude via proxy) │             │
│      │  - OllamaProvider (local models)            │             │
│      └─────────────────────────────────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Server-Side (Metrics Server):
├── LLMRequestRouter (NEW)
│   ├── detectProvider(model) → queueName
│   ├── routeRequest(request) → Promise<response>
│   └── defer(agentId, duration) → void
│
├── ProviderPoolManager (NEW)
│   ├── queues: Map<ProviderName, ProviderQueue>
│   ├── rateLimitStatus: Map<ProviderName, RateLimitStatus>
│   ├── execute(queueName, request) → Promise<response>
│   ├── handleRateLimit(queueName, retryAfter?) → void
│   └── getFallbackChain(queueName) → ProviderName[]
│
└── ProviderQueue (NEW)
    ├── semaphore: Semaphore
    ├── pendingRequests: Queue<Request>
    ├── provider: LLMProvider
    ├── enqueue(request) → Promise<response>
    └── processNext() → void

Client-Side (Browser):
└── ProxyLLMProvider (ENHANCED)
    ├── generate(request) → Promise<response>
    ├── defer() → Promise<void>  (NEW)
    └── fallback to server retry logic
```

---

## Detailed Design

### 0. Multi-Game Cooldown Tracking (Fair-Share Scheduling)

**Purpose**: When multiple games share the same server and API key, fairly distribute rate limits across all games.

**Example Scenario**:
- Groq API key allows 30 requests/minute (0.5 RPS)
- 4 games connected to same server
- Each game gets: 30 requests / 60 seconds / 4 games = 0.125 RPS = 1 request every 8 seconds

#### Game Session Tracking

The server maintains active game sessions and tracks their LLM request activity.

```typescript
interface GameSession {
  sessionId: string;           // Unique per browser/tab
  connectedAt: number;         // Timestamp of connection
  lastHeartbeat: number;       // Last ping from client
  lastRequestTime: number;     // Last LLM request timestamp
  requestCount: number;        // Total requests made
}

class GameSessionManager {
  private sessions: Map<string, GameSession> = new Map();
  private SESSION_TIMEOUT_MS = 60000; // 1 minute without heartbeat = disconnected

  registerSession(sessionId: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      lastRequestTime: 0,
      requestCount: 0,
    });
    console.log(`[GameSessionManager] Registered session: ${sessionId}`);
  }

  heartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastHeartbeat = Date.now();
    }
  }

  recordRequest(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastRequestTime = Date.now();
      session.requestCount++;
    }
  }

  getActiveSessionCount(): number {
    this.cleanupStale();
    return this.sessions.size;
  }

  private cleanupStale(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastHeartbeat > this.SESSION_TIMEOUT_MS) {
        console.log(`[GameSessionManager] Removing stale session: ${sessionId}`);
        this.sessions.delete(sessionId);
      }
    }
  }
}
```

#### Per-API-Key Rate Limit Configuration

Each provider/API-key combination has its own rate limit configuration.

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;   // Provider-specific rate limit
  requestsPerSecond?: number;  // Alternative: RPS limit
  burstSize?: number;          // Max burst requests
}

interface ProviderRateLimits {
  // Provider-level defaults (shared API keys)
  groq: RateLimitConfig;
  cerebras: RateLimitConfig;
  openai: RateLimitConfig;
  anthropic: RateLimitConfig;

  // Custom API key overrides (per-agent custom configs)
  customKeys: Map<string, RateLimitConfig>;
}

const DEFAULT_RATE_LIMITS: ProviderRateLimits = {
  groq: {
    requestsPerMinute: 30,      // Groq free tier: 30 RPM
    burstSize: 5,
  },
  cerebras: {
    requestsPerMinute: 60,      // Cerebras: 60 RPM
    burstSize: 10,
  },
  openai: {
    requestsPerMinute: 10,      // OpenAI conservative estimate
    burstSize: 3,
  },
  anthropic: {
    requestsPerMinute: 50,      // Anthropic tier-dependent
    burstSize: 5,
  },
  customKeys: new Map(),
};
```

#### Fair-Share Cooldown Calculator

Calculate per-game cooldown based on active sessions and rate limits.

```typescript
class CooldownCalculator {
  private sessionManager: GameSessionManager;
  private rateLimits: ProviderRateLimits;

  constructor(
    sessionManager: GameSessionManager,
    rateLimits: ProviderRateLimits
  ) {
    this.sessionManager = sessionManager;
    this.rateLimits = rateLimits;
  }

  /**
   * Calculate minimum cooldown for a game session
   *
   * @param provider - Provider name ('groq', 'cerebras', etc.)
   * @param apiKeyHash - Hash of API key (for custom keys)
   * @returns Cooldown in milliseconds
   */
  calculateCooldown(provider: string, apiKeyHash?: string): number {
    // Get rate limit for this provider/API key
    let rateLimit: RateLimitConfig;

    if (apiKeyHash && this.rateLimits.customKeys.has(apiKeyHash)) {
      rateLimit = this.rateLimits.customKeys.get(apiKeyHash)!;
    } else {
      rateLimit = this.rateLimits[provider as keyof typeof this.rateLimits] as RateLimitConfig;
    }

    if (!rateLimit) {
      console.warn(`[CooldownCalculator] No rate limit for provider: ${provider}`);
      return 5000; // Default 5s cooldown
    }

    // Count active games using this provider/API key
    const activeGames = this.sessionManager.getActiveSessionCount();

    if (activeGames === 0) return 0; // No cooldown if no games

    // Calculate per-game request rate
    // Formula: cooldownMs = (60000ms / requestsPerMinute) * activeGames
    const cooldownMs = (60000 / rateLimit.requestsPerMinute) * activeGames;

    console.log(
      `[CooldownCalculator] ${provider}: ${rateLimit.requestsPerMinute} RPM, ` +
      `${activeGames} games → ${cooldownMs.toFixed(0)}ms cooldown per game`
    );

    return Math.ceil(cooldownMs);
  }

  /**
   * Calculate when a specific session can make its next request
   *
   * @param sessionId - Game session ID
   * @param provider - Provider name
   * @param apiKeyHash - Hash of API key (for custom keys)
   * @returns Timestamp when next request is allowed (ms since epoch)
   */
  calculateNextAllowedTime(
    sessionId: string,
    provider: string,
    apiKeyHash?: string
  ): number {
    const session = this.sessionManager['sessions'].get(sessionId);
    if (!session) {
      return Date.now(); // Unknown session, allow immediately
    }

    const cooldownMs = this.calculateCooldown(provider, apiKeyHash);
    const nextAllowed = session.lastRequestTime + cooldownMs;

    return Math.max(nextAllowed, Date.now());
  }

  /**
   * Check if a session can make a request now
   */
  canRequestNow(sessionId: string, provider: string, apiKeyHash?: string): boolean {
    const nextAllowed = this.calculateNextAllowedTime(sessionId, provider, apiKeyHash);
    return Date.now() >= nextAllowed;
  }

  /**
   * Get human-readable cooldown status
   */
  getCooldownStatus(sessionId: string, provider: string, apiKeyHash?: string): {
    canRequest: boolean;
    waitMs: number;
    nextAllowedAt: number;
  } {
    const nextAllowedAt = this.calculateNextAllowedTime(sessionId, provider, apiKeyHash);
    const now = Date.now();
    const waitMs = Math.max(0, nextAllowedAt - now);

    return {
      canRequest: waitMs === 0,
      waitMs,
      nextAllowedAt,
    };
  }
}
```

#### LLM Response with Cooldown Information

Server includes cooldown information in every LLM response.

```typescript
interface LLMResponseWithCooldown {
  // Standard LLM response
  text: string;
  model: string;
  tokensUsed: number;
  provider: string;

  // Cooldown information (NEW)
  cooldown: {
    nextAllowedAt: number;     // Unix timestamp (ms) when next request allowed
    waitMs: number;             // How long to wait (ms)
    activeGames: number;        // How many games sharing this provider
    rateLimit: {
      requestsPerMinute: number;
      effectiveRPM: number;     // RPM per game (total / activeGames)
    };
  };
}
```

**Example Response**:

```json
{
  "text": "I will gather wood and build a shelter.",
  "model": "qwen/qwen3-32b",
  "tokensUsed": 124,
  "provider": "groq",
  "cooldown": {
    "nextAllowedAt": 1735927800000,
    "waitMs": 8000,
    "activeGames": 4,
    "rateLimit": {
      "requestsPerMinute": 30,
      "effectiveRPM": 7.5
    }
  }
}
```

**Interpretation**:
- Groq allows 30 RPM total
- 4 games are connected
- Each game gets 30/4 = 7.5 RPM = 1 request every 8 seconds
- This game must wait 8 seconds before next request

#### Client-Side Cooldown Enforcement

Clients must respect the cooldown communicated by the server.

```typescript
// In ProxyLLMProvider.ts (client-side)
class ProxyLLMProvider implements LLMProvider {
  private cooldownState: Map<string, number> = new Map(); // provider → nextAllowedAt

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.detectProvider(request.model);

    // Check if we're in cooldown
    const nextAllowedAt = this.cooldownState.get(provider) || 0;
    const now = Date.now();

    if (now < nextAllowedAt) {
      const waitMs = nextAllowedAt - now;
      console.log(`[ProxyLLMProvider] Waiting ${waitMs}ms for ${provider} cooldown`);
      await this.sleep(waitMs);
    }

    // Make request to server
    const response = await fetch('http://localhost:8766/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        sessionId: this.sessionId, // Include session ID
      }),
    });

    const data: LLMResponseWithCooldown = await response.json();

    // Update cooldown state from server response
    if (data.cooldown) {
      this.cooldownState.set(provider, data.cooldown.nextAllowedAt);
      console.log(
        `[ProxyLLMProvider] ${provider} cooldown: wait ${data.cooldown.waitMs}ms ` +
        `(${data.cooldown.activeGames} games @ ${data.cooldown.rateLimit.effectiveRPM} RPM each)`
      );
    }

    return {
      text: data.text,
      model: data.model,
      tokensUsed: data.tokensUsed,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Server-Side Request Handling with Cooldown

```typescript
// In LLMRequestRouter
class LLMRequestRouter {
  private sessionManager: GameSessionManager;
  private cooldownCalculator: CooldownCalculator;

  async routeRequest(payload: LLMRequestPayload): Promise<LLMResponseWithCooldown> {
    const { sessionId, agentId, prompt, model, customConfig } = payload;

    // Register/update session
    if (!this.sessionManager.hasSession(sessionId)) {
      this.sessionManager.registerSession(sessionId);
    }
    this.sessionManager.heartbeat(sessionId);

    // Detect provider and API key
    const provider = this.detectProvider(model, customConfig);
    const apiKeyHash = customConfig?.apiKey
      ? this.hashApiKey(customConfig.apiKey)
      : undefined;

    // Check cooldown
    const cooldownStatus = this.cooldownCalculator.getCooldownStatus(
      sessionId,
      provider,
      apiKeyHash
    );

    if (!cooldownStatus.canRequest) {
      // Too soon! Return error with cooldown info
      throw {
        error: 'RATE_LIMIT_COOLDOWN',
        message: `Must wait ${cooldownStatus.waitMs}ms before next request`,
        cooldown: {
          nextAllowedAt: cooldownStatus.nextAllowedAt,
          waitMs: cooldownStatus.waitMs,
          activeGames: this.sessionManager.getActiveSessionCount(),
        },
      };
    }

    // Record request
    this.sessionManager.recordRequest(sessionId);

    // Execute LLM request (existing logic)
    const llmRequest = this.buildRequest(payload);
    const llmResponse = await this.poolManager.execute(provider, llmRequest, agentId);

    // Calculate next cooldown
    const activeGames = this.sessionManager.getActiveSessionCount();
    const cooldownMs = this.cooldownCalculator.calculateCooldown(provider, apiKeyHash);
    const nextAllowedAt = Date.now() + cooldownMs;

    // Return response with cooldown info
    return {
      text: llmResponse.text,
      model: llmResponse.model,
      tokensUsed: llmResponse.tokensUsed,
      provider,
      cooldown: {
        nextAllowedAt,
        waitMs: cooldownMs,
        activeGames,
        rateLimit: {
          requestsPerMinute: this.getRateLimit(provider, apiKeyHash),
          effectiveRPM: this.getRateLimit(provider, apiKeyHash) / activeGames,
        },
      },
    };
  }

  private hashApiKey(apiKey: string): string {
    // Simple hash for tracking (not cryptographic)
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      hash = ((hash << 5) - hash) + apiKey.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
```

#### Session Heartbeat Endpoint

Clients send periodic heartbeats to maintain session.

```typescript
// Server endpoint
app.post('/api/llm/heartbeat', (req, res) => {
  const { sessionId } = req.body;
  sessionManager.heartbeat(sessionId);

  res.json({
    success: true,
    activeGames: sessionManager.getActiveSessionCount(),
  });
});

// Client-side heartbeat (every 30 seconds)
class ProxyLLMProvider {
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string) {
    this.sessionId = crypto.randomUUID();
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      fetch('http://localhost:8766/api/llm/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId }),
      }).catch(err => {
        console.warn('[ProxyLLMProvider] Heartbeat failed:', err);
      });
    }, 30000); // Every 30 seconds
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
```

#### Example: 4 Games Sharing Groq API

**Server State**:
```
Active Sessions: 4
Provider: groq
Rate Limit: 30 RPM (0.5 RPS)
Per-Game Rate: 30 / 4 = 7.5 RPM (0.125 RPS)
Per-Game Cooldown: 1 / 0.125 = 8 seconds
```

**Timeline**:
```
T=0s:  Game 1 requests → success, cooldown until T=8s
T=2s:  Game 2 requests → success, cooldown until T=10s
T=4s:  Game 3 requests → success, cooldown until T=12s
T=6s:  Game 4 requests → success, cooldown until T=14s
T=7s:  Game 1 requests → REJECTED (must wait until T=8s)
T=8s:  Game 1 requests → success, cooldown until T=16s
```

Each game respects its 8-second cooldown, ensuring fair distribution.

#### Integration with Game Scheduler (Optional)

For more sophisticated coordination, integrate cooldowns with the game's tick scheduler.

```typescript
// In LLMDecisionProcessor
class LLMDecisionProcessor extends System {
  private cooldownState: Map<string, number> = new Map(); // agentId → nextAllowedTick

  update(world: World): void {
    const currentTick = world.getComponent<TimeComponent>('time')?.tick || 0;

    for (const entity of this.query(world)) {
      const agent = entity.getComponent<AgentComponent>('agent');
      if (!agent) continue;

      // Check if agent is in cooldown
      const nextAllowedTick = this.cooldownState.get(entity.id) || 0;
      if (currentTick < nextAllowedTick) {
        continue; // Skip this agent, still in cooldown
      }

      // Check if should call LLM
      if (this.shouldCallLLM(agent)) {
        this.makeDecisionRequest(world, entity);
      }
    }
  }

  private async makeDecisionRequest(world: World, entity: Entity): Promise<void> {
    const agent = entity.getComponent<AgentComponent>('agent');
    const prompt = this.promptBuilder.build(world, entity);

    try {
      const response = await this.llmDecisionQueue.requestDecision(
        entity.id,
        prompt,
        agent.customLLM
      );

      // Parse response and apply decision
      this.applyDecision(world, entity, response);

      // Apply cooldown from server response
      if (response.cooldown) {
        const cooldownTicks = this.msToTicks(response.cooldown.waitMs);
        const currentTick = world.getComponent<TimeComponent>('time')?.tick || 0;
        this.cooldownState.set(entity.id, currentTick + cooldownTicks);

        console.log(
          `[LLMDecisionProcessor] Agent ${entity.id} cooldown: ${cooldownTicks} ticks ` +
          `(${response.cooldown.waitMs}ms, ${response.cooldown.activeGames} games)`
        );
      }

    } catch (error: any) {
      if (error.error === 'RATE_LIMIT_COOLDOWN') {
        // Server enforced cooldown
        const cooldownTicks = this.msToTicks(error.cooldown.waitMs);
        const currentTick = world.getComponent<TimeComponent>('time')?.tick || 0;
        this.cooldownState.set(entity.id, currentTick + cooldownTicks);
        console.warn(
          `[LLMDecisionProcessor] Agent ${entity.id} hit server cooldown: ${cooldownTicks} ticks`
        );
      } else {
        console.error('[LLMDecisionProcessor] LLM error:', error);
      }
    }
  }

  private msToTicks(ms: number, tickRate: number = 20): number {
    // Convert real-time ms to game ticks (20 TPS = 50ms per tick)
    return Math.ceil(ms / (1000 / tickRate));
  }
}
```

#### Async Thinking: Queueing LLM Requests Without Blocking Simulation

**Key Insight**: Most agent behaviors are autonomic (scripted). LLM thinking is only needed periodically, so LLM requests can be fully asynchronous and queued without blocking the simulation.

**Design Principle**:
- Agents continue with their current autonomic behavior while LLM requests are queued
- LLM responses arrive asynchronously and update agent decisions when ready
- Simulation never blocks waiting for LLM responses

```typescript
// Agent behavior flow
class LLMDecisionProcessor extends System {
  private pendingRequests: Map<string, Promise<LLMResponse>> = new Map();

  update(world: World): void {
    for (const entity of this.query(world)) {
      const agent = entity.getComponent<AgentComponent>('agent');

      // 1. Check if LLM response is ready (non-blocking poll)
      if (this.pendingRequests.has(entity.id)) {
        const response = this.llmDecisionQueue.getDecision(entity.id);
        if (response) {
          // LLM response ready! Apply new decision
          this.applyDecision(world, entity, response);
          this.pendingRequests.delete(entity.id);
          console.log(`[LLMDecisionProcessor] Agent ${entity.id} received LLM decision`);
        } else {
          // Still waiting for LLM response, continue with current behavior
          continue;
        }
      }

      // 2. Check if should request new LLM decision
      if (this.shouldCallLLM(agent)) {
        // Queue LLM request (async, returns Promise)
        const requestPromise = this.llmDecisionQueue.requestDecision(
          entity.id,
          this.promptBuilder.build(world, entity),
          agent.customLLM
        );

        // Store promise for later polling
        this.pendingRequests.set(entity.id, requestPromise);

        console.log(`[LLMDecisionProcessor] Agent ${entity.id} queued LLM request`);

        // Don't wait for response - agent continues with current behavior
        continue;
      }

      // 3. Agent continues with autonomic behavior (no LLM needed)
      // BehaviorSystem will execute current agent.behavior (gather, build, wander, etc.)
    }
  }
}
```

**Example Timeline**:

```
Tick 0:   Agent A behavior='gather_wood' (autonomic)
Tick 100: Agent A idle, queue LLM request → behavior='gather_wood' (continues current)
Tick 101: Agent A → behavior='gather_wood' (still waiting for LLM)
Tick 102: Agent A → behavior='gather_wood' (still waiting)
...
Tick 150: LLM response ready! → behavior='build' (new decision applied)
Tick 151: Agent A → behavior='build' (executing new LLM decision)
```

**Benefits**:
- **No simulation blocking**: Game continues at full 20 TPS even with slow LLM calls
- **Graceful degradation**: If LLM is slow/unavailable, agents continue with autonomic behaviors
- **Fair queuing**: Multiple agents can have LLM requests in flight, handled by server queue
- **Cooldown integration**: Server-side cooldowns ensure fair distribution across games

**Queue Depth Monitoring**:

```typescript
class LLMDecisionQueue {
  getQueueStats(): {
    pending: number;      // Requests in queue
    inFlight: number;     // Requests sent to server
    avgWaitTime: number;  // Average wait time (ms)
  } {
    return {
      pending: this.queue.length,
      inFlight: this.maxConcurrent - this.semaphore.getAvailablePermits(),
      avgWaitTime: this.calculateAvgWaitTime(),
    };
  }
}

// Display in DevPanel or console
setInterval(() => {
  const stats = llmQueue.getQueueStats();
  if (stats.pending > 10) {
    console.warn(
      `[LLMDecisionQueue] High queue depth: ${stats.pending} pending, ` +
      `${stats.inFlight} in flight, avg wait ${stats.avgWaitTime}ms`
    );
  }
}, 5000);
```

**Handling Long Queues**:

If the queue gets too deep (e.g., 4 games × 10 agents = 40 requests), prioritize:

```typescript
interface PrioritizedRequest {
  priority: 'high' | 'normal' | 'low';
  agentId: string;
  request: LLMRequest;
}

// Priority rules:
// - High: Player-facing NPCs, agents in critical states (low health, stuck)
// - Normal: Most agents
// - Low: Background agents (tier 3), far from player

class PriorityQueue {
  private high: QueuedRequest[] = [];
  private normal: QueuedRequest[] = [];
  private low: QueuedRequest[] = [];

  enqueue(request: PrioritizedRequest): void {
    switch (request.priority) {
      case 'high': this.high.push(request); break;
      case 'normal': this.normal.push(request); break;
      case 'low': this.low.push(request); break;
    }
  }

  dequeue(): QueuedRequest | undefined {
    // Always process high priority first
    if (this.high.length > 0) return this.high.shift();
    if (this.normal.length > 0) return this.normal.shift();
    if (this.low.length > 0) return this.low.shift();
    return undefined;
  }
}
```

---

### 1. Provider Detection

**Location**: Server-side `LLMRequestRouter`

**Purpose**: Map model names to provider queues

```typescript
interface ProviderMapping {
  provider: string;      // 'groq', 'cerebras', 'openai', 'anthropic', etc.
  queue: string;         // Queue identifier
  fallbackChain: string[]; // Providers to try on 429
}

class LLMRequestRouter {
  private providerMappings: Map<string, ProviderMapping> = new Map([
    // Groq models
    ['qwen/qwen3-32b', {
      provider: 'groq',
      queue: 'groq',
      fallbackChain: ['cerebras', 'openai']
    }],
    ['llama-3.3-70b-versatile', {
      provider: 'groq',
      queue: 'groq',
      fallbackChain: ['cerebras']
    }],

    // Cerebras models
    ['llama-3.3-70b', {
      provider: 'cerebras',
      queue: 'cerebras',
      fallbackChain: ['groq']
    }],

    // OpenAI models
    ['gpt-4-turbo', {
      provider: 'openai',
      queue: 'openai',
      fallbackChain: []
    }],
    ['gpt-4o', {
      provider: 'openai',
      queue: 'openai',
      fallbackChain: []
    }],

    // Anthropic models
    ['claude-3-5-sonnet-20241022', {
      provider: 'anthropic',
      queue: 'anthropic',
      fallbackChain: []
    }],

    // Ollama (local)
    ['qwen3:4b', {
      provider: 'ollama',
      queue: 'ollama',
      fallbackChain: []
    }],
  ]);

  detectProvider(model: string): ProviderMapping {
    const mapping = this.providerMappings.get(model);
    if (!mapping) {
      // Default: extract provider from model name or use 'unknown' queue
      const provider = this.inferProviderFromModel(model);
      return { provider, queue: provider, fallbackChain: [] };
    }
    return mapping;
  }

  private inferProviderFromModel(model: string): string {
    // heuristic: "provider/model" or URL-based detection
    if (model.includes('/')) return model.split('/')[0];
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.includes('llama')) return 'groq'; // default Llama to Groq
    return 'unknown';
  }
}
```

---

### 2. Provider Queue with Semaphore

**Location**: Server-side `ProviderQueue`

**Purpose**: Limit concurrent requests per provider, queue overflow

```typescript
interface QueuedRequest {
  id: string;
  agentId: string;
  request: LLMRequest;
  resolve: (response: LLMResponse) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  retryCount: number;
}

class ProviderQueue {
  private semaphore: Semaphore;
  private queue: QueuedRequest[] = [];
  private provider: LLMProvider;
  private rateLimited: boolean = false;
  private rateLimitUntil: number = 0;

  constructor(
    provider: LLMProvider,
    maxConcurrent: number = 2
  ) {
    this.provider = provider;
    this.semaphore = new Semaphore(maxConcurrent);
  }

  async enqueue(request: LLMRequest, agentId: string): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: crypto.randomUUID(),
        agentId,
        request,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        retryCount: 0,
      };

      this.queue.push(queuedRequest);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    // Check if rate limited
    if (this.rateLimited && Date.now() < this.rateLimitUntil) {
      const waitMs = this.rateLimitUntil - Date.now();
      console.log(`[ProviderQueue] Rate limited, waiting ${waitMs}ms`);
      setTimeout(() => this.processNext(), waitMs);
      return;
    }

    // Clear rate limit if expired
    if (this.rateLimited && Date.now() >= this.rateLimitUntil) {
      this.rateLimited = false;
      console.log(`[ProviderQueue] Rate limit expired, resuming`);
    }

    // No queued requests
    if (this.queue.length === 0) return;

    // Try to acquire semaphore (non-blocking check)
    const acquired = this.semaphore.tryAcquire();
    if (!acquired) {
      // Wait for semaphore release
      this.semaphore.acquire().then(() => {
        this.processNext();
      });
      return;
    }

    // Process next request
    const queuedRequest = this.queue.shift()!;

    try {
      const response = await this.provider.generate(queuedRequest.request);
      queuedRequest.resolve(response);
    } catch (error: any) {
      // Check for 429 rate limit
      if (this.isRateLimitError(error)) {
        console.warn(`[ProviderQueue] Rate limit detected for ${this.provider.getProviderId()}`);

        // Extract retry-after header if available
        const retryAfter = this.extractRetryAfter(error);
        this.handleRateLimit(retryAfter);

        // Re-queue the request (will be retried after rate limit expires)
        this.queue.unshift(queuedRequest);
      } else {
        queuedRequest.reject(error);
      }
    } finally {
      this.semaphore.release();

      // Continue processing queue
      if (this.queue.length > 0) {
        this.processNext();
      }
    }
  }

  private isRateLimitError(error: any): boolean {
    return (
      error.status === 429 ||
      error.code === 'rate_limit_exceeded' ||
      error.message?.toLowerCase().includes('rate limit')
    );
  }

  private extractRetryAfter(error: any): number | null {
    // Check for Retry-After header (in seconds)
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10) * 1000;
    }

    // Check for X-RateLimit-Reset header (unix timestamp)
    if (error.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.headers['x-ratelimit-reset'], 10) * 1000;
      return Math.max(0, resetTime - Date.now());
    }

    return null;
  }

  handleRateLimit(retryAfterMs: number | null): void {
    this.rateLimited = true;

    // Use provided retry-after, or default to 1 second
    const waitMs = retryAfterMs ?? 1000;
    this.rateLimitUntil = Date.now() + waitMs;

    console.log(`[ProviderQueue] Rate limited until ${new Date(this.rateLimitUntil).toISOString()}`);
  }

  isRateLimited(): boolean {
    return this.rateLimited && Date.now() < this.rateLimitUntil;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
```

---

### 3. Provider Pool Manager (Fallback Logic)

**Location**: Server-side `ProviderPoolManager`

**Purpose**: Manage multiple provider queues, implement fallback chain

```typescript
interface ProviderPoolConfig {
  groq?: {
    provider: LLMProvider;
    maxConcurrent: number;
    fallbackChain: string[];
  };
  cerebras?: {
    provider: LLMProvider;
    maxConcurrent: number;
    fallbackChain: string[];
  };
  openai?: {
    provider: LLMProvider;
    maxConcurrent: number;
    fallbackChain: string[];
  };
  anthropic?: {
    provider: LLMProvider;
    maxConcurrent: number;
    fallbackChain: string[];
  };
  ollama?: {
    provider: LLMProvider;
    maxConcurrent: number;
    fallbackChain: string[];
  };
}

class ProviderPoolManager {
  private queues: Map<string, ProviderQueue> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();

  constructor(config: ProviderPoolConfig) {
    for (const [providerName, providerConfig] of Object.entries(config)) {
      if (!providerConfig) continue;

      const queue = new ProviderQueue(
        providerConfig.provider,
        providerConfig.maxConcurrent
      );

      this.queues.set(providerName, queue);
      this.fallbackChains.set(providerName, providerConfig.fallbackChain);
    }
  }

  async execute(
    queueName: string,
    request: LLMRequest,
    agentId: string,
    attempt: number = 0
  ): Promise<LLMResponse> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`[ProviderPoolManager] Unknown queue: ${queueName}`);
    }

    try {
      // Try primary provider
      const response = await queue.enqueue(request, agentId);
      return response;

    } catch (error: any) {
      // Check if this was a rate limit error
      const isRateLimit = this.isRateLimitError(error);

      if (isRateLimit) {
        console.warn(`[ProviderPoolManager] Rate limit on ${queueName}, attempting fallback`);

        // Try fallback chain
        const fallbackChain = this.fallbackChains.get(queueName) || [];

        for (const fallbackProvider of fallbackChain) {
          const fallbackQueue = this.queues.get(fallbackProvider);

          if (!fallbackQueue) {
            console.warn(`[ProviderPoolManager] Fallback provider ${fallbackProvider} not configured`);
            continue;
          }

          // Check if fallback is also rate limited
          if (fallbackQueue.isRateLimited()) {
            console.warn(`[ProviderPoolManager] Fallback ${fallbackProvider} also rate limited, skipping`);
            continue;
          }

          try {
            console.log(`[ProviderPoolManager] Trying fallback: ${fallbackProvider}`);
            const response = await fallbackQueue.enqueue(request, agentId);
            return response;
          } catch (fallbackError) {
            console.warn(`[ProviderPoolManager] Fallback ${fallbackProvider} failed:`, fallbackError);
            continue;
          }
        }

        // All fallbacks exhausted, wait and retry primary
        if (attempt < 3) {
          console.log(`[ProviderPoolManager] All providers rate limited, waiting 1s and retrying (attempt ${attempt + 1}/3)`);
          await this.sleep(1000);
          return this.execute(queueName, request, agentId, attempt + 1);
        } else {
          throw new Error(`[ProviderPoolManager] All providers exhausted after ${attempt} retries`);
        }
      }

      // Non-rate-limit error, propagate
      throw error;
    }
  }

  private isRateLimitError(error: any): boolean {
    return (
      error.status === 429 ||
      error.code === 'rate_limit_exceeded' ||
      error.message?.toLowerCase().includes('rate limit')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStats(): Record<string, { length: number; rateLimited: boolean }> {
    const stats: Record<string, { length: number; rateLimited: boolean }> = {};

    for (const [name, queue] of this.queues.entries()) {
      stats[name] = {
        length: queue.getQueueLength(),
        rateLimited: queue.isRateLimited(),
      };
    }

    return stats;
  }
}
```

---

### 4. LLM Request Router (Entry Point)

**Location**: Server-side `/api/llm/generate` endpoint

**Purpose**: Route incoming requests to appropriate provider queue

```typescript
interface LLMRequestPayload {
  agentId: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  customConfig?: CustomLLMConfig;
}

class LLMRequestRouter {
  private poolManager: ProviderPoolManager;
  private providerMappings: Map<string, ProviderMapping>;

  constructor(poolManager: ProviderPoolManager) {
    this.poolManager = poolManager;
    this.initializeProviderMappings();
  }

  async routeRequest(payload: LLMRequestPayload): Promise<LLMResponse> {
    const { agentId, prompt, model, customConfig } = payload;

    // Determine which queue to use
    let queueName: string;
    let llmRequest: LLMRequest;

    if (customConfig?.baseUrl) {
      // Custom LLM config: detect provider from baseUrl
      queueName = this.detectProviderFromUrl(customConfig.baseUrl);
      llmRequest = this.buildCustomRequest(payload, customConfig);
    } else {
      // Standard model: use provider mappings
      const modelName = model || this.getDefaultModel();
      const mapping = this.detectProvider(modelName);
      queueName = mapping.queue;
      llmRequest = this.buildRequest(payload);
    }

    console.log(`[LLMRequestRouter] Routing agent ${agentId} to queue: ${queueName}`);

    // Execute through provider pool (handles fallback and retry)
    const response = await this.poolManager.execute(queueName, llmRequest, agentId);

    return response;
  }

  private detectProviderFromUrl(baseUrl: string): string {
    if (baseUrl.includes('api.groq.com')) return 'groq';
    if (baseUrl.includes('cerebras.ai')) return 'cerebras';
    if (baseUrl.includes('api.openai.com')) return 'openai';
    if (baseUrl.includes('api.anthropic.com')) return 'anthropic';
    if (baseUrl.includes('localhost:11434')) return 'ollama';

    // Unknown provider: use URL hash as queue name (per-URL queuing)
    const hash = this.hashUrl(baseUrl);
    return `custom_${hash}`;
  }

  private hashUrl(url: string): string {
    // Simple hash for queue naming
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private buildRequest(payload: LLMRequestPayload): LLMRequest {
    return {
      prompt: payload.prompt,
      model: payload.model,
      maxTokens: payload.maxTokens || 4096,
      temperature: payload.temperature || 0.7,
    };
  }

  private buildCustomRequest(payload: LLMRequestPayload, config: CustomLLMConfig): LLMRequest {
    return {
      prompt: payload.prompt,
      model: config.model || payload.model,
      maxTokens: payload.maxTokens || 4096,
      temperature: payload.temperature || 0.7,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      customHeaders: config.customHeaders,
    };
  }

  private getDefaultModel(): string {
    return 'qwen/qwen3-32b'; // Default to Groq
  }
}
```

---

### 5. Defer Mechanism

**Purpose**: Allow agents to explicitly wait without making LLM request

**Client-side API**:

```typescript
// In LLMDecisionProcessor.ts
class LLMDecisionProcessor extends System {
  async deferThinking(entity: Entity, durationMs: number = 5000): Promise<void> {
    const agent = entity.getComponent<AgentComponent>('agent');
    if (!agent) return;

    // Mark agent as deferred
    agent.deferredUntil = Date.now() + durationMs;

    console.log(`[LLMDecisionProcessor] Agent ${entity.id} deferred for ${durationMs}ms`);

    // Optionally notify server (for queue management)
    await this.llmDecisionQueue.defer(entity.id, durationMs);
  }

  private shouldCallLLM(agent: AgentComponent): boolean {
    // Check if agent is deferred
    if (agent.deferredUntil && Date.now() < agent.deferredUntil) {
      return false;
    }

    // ... existing logic
  }
}
```

**Server-side tracking** (optional, for metrics):

```typescript
// In LLMRequestRouter
class LLMRequestRouter {
  private deferredAgents: Map<string, number> = new Map(); // agentId → resumeAt

  defer(agentId: string, durationMs: number): void {
    const resumeAt = Date.now() + durationMs;
    this.deferredAgents.set(agentId, resumeAt);

    console.log(`[LLMRequestRouter] Agent ${agentId} deferred until ${new Date(resumeAt).toISOString()}`);
  }

  isDeferred(agentId: string): boolean {
    const resumeAt = this.deferredAgents.get(agentId);
    if (!resumeAt) return false;

    const isDeferred = Date.now() < resumeAt;
    if (!isDeferred) {
      this.deferredAgents.delete(agentId);
    }

    return isDeferred;
  }
}
```

---

### 6. Semaphore Implementation

**Purpose**: Limit concurrent operations (standard async semaphore)

```typescript
class Semaphore {
  private permits: number;
  private maxPermits: number;
  private queue: Array<() => void> = [];

  constructor(maxPermits: number) {
    this.permits = maxPermits;
    this.maxPermits = maxPermits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  tryAcquire(): boolean {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }
    return false;
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.permits = Math.min(this.permits + 1, this.maxPermits);
    }
  }

  getAvailablePermits(): number {
    return this.permits;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
```

---

## Configuration

### Server Configuration

**Location**: `scripts/metrics-server.ts` or equivalent

```typescript
const llmPoolConfig: ProviderPoolConfig = {
  groq: {
    provider: new OpenAICompatProvider(
      'qwen/qwen3-32b',
      'https://api.groq.com/openai/v1',
      process.env.GROQ_API_KEY!
    ),
    maxConcurrent: 2,
    fallbackChain: ['cerebras'],
  },

  cerebras: {
    provider: new OpenAICompatProvider(
      'llama-3.3-70b',
      'https://api.cerebras.ai/v1',
      process.env.CEREBRAS_API_KEY!
    ),
    maxConcurrent: 2,
    fallbackChain: ['groq'],
  },

  openai: {
    provider: new OpenAICompatProvider(
      'gpt-4-turbo',
      'https://api.openai.com/v1',
      process.env.OPENAI_API_KEY!
    ),
    maxConcurrent: 1, // OpenAI has stricter rate limits
    fallbackChain: [],
  },

  anthropic: {
    provider: new OpenAICompatProvider(
      'claude-3-5-sonnet-20241022',
      'https://api.anthropic.com/v1',
      process.env.ANTHROPIC_API_KEY!
    ),
    maxConcurrent: 1,
    fallbackChain: [],
  },

  ollama: {
    provider: new OllamaProvider(
      'qwen3:4b',
      'http://localhost:11434'
    ),
    maxConcurrent: 4, // Local model, can handle more concurrent
    fallbackChain: [],
  },
};

const poolManager = new ProviderPoolManager(llmPoolConfig);
const requestRouter = new LLMRequestRouter(poolManager);

// Express endpoint
app.post('/api/llm/generate', async (req, res) => {
  try {
    const payload: LLMRequestPayload = req.body;
    const response = await requestRouter.routeRequest(payload);
    res.json(response);
  } catch (error: any) {
    console.error('[LLM API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Queue stats endpoint
app.get('/api/llm/stats', (req, res) => {
  const stats = poolManager.getQueueStats();
  res.json(stats);
});
```

---

## API Reference

### Client-Side (ProxyLLMProvider)

```typescript
interface ProxyLLMProvider extends LLMProvider {
  /**
   * Generate LLM response (routes through server)
   */
  generate(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Defer agent thinking for specified duration
   * @param agentId - Agent identifier
   * @param durationMs - How long to defer (default: 5000ms)
   */
  defer(agentId: string, durationMs?: number): Promise<void>;
}
```

### Server-Side Endpoints

```typescript
/**
 * POST /api/llm/generate
 *
 * Generate LLM response with automatic fallback and retry
 */
interface LLMGenerateRequest {
  agentId: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  customConfig?: CustomLLMConfig;
}

interface LLMGenerateResponse {
  text: string;
  model: string;
  tokensUsed: number;
  provider: string; // Which provider was used
}

/**
 * GET /api/llm/stats
 *
 * Get queue statistics for all providers
 */
interface LLMStatsResponse {
  [providerName: string]: {
    length: number;        // Queued requests
    rateLimited: boolean;  // Currently rate limited?
  };
}

/**
 * POST /api/llm/defer
 *
 * Defer an agent's thinking
 */
interface LLMDeferRequest {
  agentId: string;
  durationMs: number;
}
```

---

## Implementation Plan

### Phase 1: Semaphore & Provider Queue (Core Infrastructure)

**Files to create**:
- `custom_game_engine/packages/llm/src/Semaphore.ts`
- `custom_game_engine/packages/llm/src/ProviderQueue.ts`

**Implementation**:
1. Implement `Semaphore` class with `acquire()`, `tryAcquire()`, `release()`
2. Implement `ProviderQueue` class with:
   - Request queuing
   - Semaphore-based concurrency control
   - Rate limit detection (429 errors)
   - Rate limit backoff (wait specified duration)

**Tests**:
- Semaphore concurrent acquisition/release
- Queue processes requests in order
- Queue respects semaphore limits
- Rate limit triggers backoff

---

### Phase 2: Provider Pool Manager (Fallback Logic)

**Files to create**:
- `custom_game_engine/packages/llm/src/ProviderPoolManager.ts`

**Implementation**:
1. Create multiple `ProviderQueue` instances (one per provider)
2. Implement fallback chain logic:
   - On 429 from primary, try fallback providers
   - If all rate limited, wait 1s and retry
   - Limit retries to 3 attempts
3. Provider-specific configuration (maxConcurrent, fallbackChain)

**Tests**:
- Fallback chain executes on 429
- Retry logic waits and retries
- Multiple providers coordinate correctly

---

### Phase 3: Request Router (Server Entry Point)

**Files to create**:
- `custom_game_engine/packages/llm/src/LLMRequestRouter.ts`

**Implementation**:
1. Model → provider mapping (detectProvider)
2. Custom LLM config → provider detection (detectProviderFromUrl)
3. Route requests to appropriate queue
4. Defer mechanism (track deferred agents)

**Files to modify**:
- `custom_game_engine/scripts/metrics-server.ts` - Add `/api/llm/generate` endpoint

**Tests**:
- Model names map to correct providers
- Custom configs map to correct providers
- Deferred agents are tracked

---

### Phase 4: Client Integration

**Files to modify**:
- `custom_game_engine/packages/llm/src/ProxyLLMProvider.ts` - Add defer() method
- `custom_game_engine/packages/core/src/decision/LLMDecisionProcessor.ts` - Add deferThinking()

**Implementation**:
1. Enhance `ProxyLLMProvider.defer()` to call server endpoint
2. Add `deferThinking()` to `LLMDecisionProcessor`
3. Update `shouldCallLLM()` to respect deferred agents

**Tests**:
- Deferred agents don't call LLM until timer expires
- Defer method communicates with server

---

### Phase 5: Metrics & Monitoring

**Files to create**:
- Dashboard endpoint: `GET /api/llm/stats`

**Implementation**:
1. Expose queue stats (queue length, rate limit status per provider)
2. Add metrics events for fallback occurrences
3. Track retry counts

**Dashboard display**:
```
LLM Queue Stats:
  Groq:      2 queued, rate limited (retry in 15s)
  Cerebras:  0 queued, available
  OpenAI:    1 queued, available
  Anthropic: 0 queued, available
  Ollama:    0 queued, available
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('ProviderQueue', () => {
  it('should process requests sequentially with semaphore', async () => {
    const queue = new ProviderQueue(mockProvider, 1);

    const results = await Promise.all([
      queue.enqueue(request1, 'agent1'),
      queue.enqueue(request2, 'agent2'),
    ]);

    expect(results.length).toBe(2);
  });

  it('should handle 429 rate limits with backoff', async () => {
    const queue = new ProviderQueue(mockProvider, 1);
    mockProvider.generate.mockRejectedValueOnce({ status: 429 });

    const start = Date.now();
    const result = await queue.enqueue(request, 'agent1');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(1000); // Waited 1s
    expect(result).toBeDefined();
  });
});

describe('ProviderPoolManager', () => {
  it('should fallback to secondary provider on 429', async () => {
    const pool = new ProviderPoolManager(config);
    groqProvider.generate.mockRejectedValueOnce({ status: 429 });
    cerebrasProvider.generate.mockResolvedValueOnce({ text: 'success' });

    const result = await pool.execute('groq', request, 'agent1');

    expect(result.text).toBe('success');
    expect(cerebrasProvider.generate).toHaveBeenCalled();
  });

  it('should retry after all providers rate limited', async () => {
    const pool = new ProviderPoolManager(config);
    groqProvider.generate.mockRejectedValueOnce({ status: 429 });
    cerebrasProvider.generate.mockRejectedValueOnce({ status: 429 });
    groqProvider.generate.mockResolvedValueOnce({ text: 'success' });

    const start = Date.now();
    const result = await pool.execute('groq', request, 'agent1');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(1000); // Waited 1s
    expect(result.text).toBe('success');
  });
});
```

### Integration Tests

```typescript
describe('LLM Queue Integration', () => {
  it('should route agents with custom LLM configs to separate queues', async () => {
    const router = new LLMRequestRouter(poolManager);

    // Agent A: default Groq
    const responseA = await router.routeRequest({
      agentId: 'agentA',
      prompt: 'Hello',
    });

    // Agent B: custom OpenAI
    const responseB = await router.routeRequest({
      agentId: 'agentB',
      prompt: 'Hello',
      customConfig: {
        model: 'gpt-4-turbo',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-...',
      },
    });

    expect(responseA).toBeDefined();
    expect(responseB).toBeDefined();
    // Verify they used different queues
    expect(groqProvider.generate).toHaveBeenCalledTimes(1);
    expect(openaiProvider.generate).toHaveBeenCalledTimes(1);
  });
});
```

---

## Rollout Plan

### Step 1: Feature Flag

Add feature flag to enable/disable new queuing system:

```typescript
const USE_PER_PROVIDER_QUEUING = process.env.USE_PER_PROVIDER_QUEUING === 'true';
```

### Step 2: Gradual Migration

1. **Week 1**: Deploy infrastructure (Semaphore, ProviderQueue, ProviderPoolManager)
2. **Week 2**: Deploy server-side routing with fallback disabled
3. **Week 3**: Enable fallback for Groq → Cerebras
4. **Week 4**: Enable retry logic for all-rate-limited scenario

### Step 3: Monitoring

Monitor metrics:
- Queue lengths per provider
- Rate limit occurrences
- Fallback success rate
- Retry success rate
- Average wait time in queue

### Step 4: Full Rollout

Once metrics show stability, enable by default and remove old code paths.

---

## Success Metrics

1. **Reduced 429 errors**: Should drop to near-zero with fallback
2. **Improved LLM success rate**: >95% requests succeed (vs. failing on rate limits)
3. **Fair provider distribution**: Custom LLM agents don't interfere with default agents
4. **Bounded wait times**: 95th percentile wait time < 5 seconds

---

## Future Enhancements

### Priority Queuing

Allow agents to specify priority:

```typescript
interface LLMRequest {
  priority?: 'low' | 'normal' | 'high';
}
```

High-priority requests (e.g., player-facing NPCs) jump the queue.

### Adaptive Concurrency

Dynamically adjust `maxConcurrent` based on observed rate limits:

```typescript
class AdaptiveProviderQueue extends ProviderQueue {
  adjustConcurrency(): void {
    if (this.rateLimitOccurrences > 5) {
      this.semaphore.reducepermits(); // Reduce concurrency
    } else if (this.successRate > 0.95) {
      this.semaphore.increasePermits(); // Increase concurrency
    }
  }
}
```

### Cross-Model Fallback

If Groq rate limited, try a different Groq model (e.g., `llama-3.3-70b` → `qwen-3-32b`).

### Request Deduplication

Cache recent prompts across agents to avoid redundant LLM calls:

```typescript
if (promptHash in globalPromptCache) {
  return cachedResponse;
}
```

---

## Open Questions

1. **Should defer() be client-side only, or also tracked server-side?**
   - **Recommendation**: Client-side for simplicity, server-side tracking optional for metrics

2. **How to handle custom provider queues (unknown providers)?**
   - **Recommendation**: Create dynamic queues with conservative defaults (maxConcurrent: 1)

3. **Should we expose queue stats to the client UI?**
   - **Recommendation**: Yes, show queue status in DevPanel for debugging

4. **What happens if a queue grows too large (e.g., >100 requests)?**
   - **Recommendation**: Reject new requests with 503 error, let client retry later

---

## References

- Current implementation: `custom_game_engine/packages/llm/src/LLMDecisionQueue.ts`
- Fallback provider: `custom_game_engine/packages/llm/src/FallbackProvider.ts`
- Rate limiter: `custom_game_engine/packages/llm/src/RateLimiter.ts`
- Proxy provider: `custom_game_engine/packages/llm/src/ProxyLLMProvider.ts`
- Decision processor: `custom_game_engine/packages/core/src/decision/LLMDecisionProcessor.ts`

---

## Appendix: Example Scenarios

### Scenario 1: Rate Limit Fallback

```
1. Agent A requests LLM (using default Groq)
2. LLMRequestRouter routes to "groq" queue
3. ProviderQueue sends request to Groq API
4. Groq responds with 429 (rate limit)
5. ProviderQueue marks queue as rate limited (wait 1s)
6. ProviderPoolManager checks fallback chain: ['cerebras']
7. ProviderPoolManager routes request to "cerebras" queue
8. Cerebras API succeeds
9. Response returned to agent
```

### Scenario 2: All Providers Rate Limited

```
1. Agent A requests LLM (Groq)
2. Groq: 429 rate limit
3. Fallback to Cerebras: 429 rate limit
4. All providers exhausted
5. ProviderPoolManager waits 1 second
6. Retry Groq (attempt 2/3)
7. Groq succeeds
8. Response returned to agent
```

### Scenario 3: Custom LLM Agent

```
1. Agent B has customLLM config: { model: 'gpt-4-turbo', baseUrl: 'https://api.openai.com/v1' }
2. LLMRequestRouter detects provider from baseUrl: 'openai'
3. Routes to "openai" queue (separate from Groq agents)
4. Agent B's request doesn't interfere with Agent A (using Groq)
5. Both requests process concurrently in different queues
```

### Scenario 4: Defer Mechanism

```
1. Agent C decides to defer thinking (wants to wait for resources)
2. Client calls: llmDecisionQueue.defer('agentC', 10000)
3. Agent C marked with deferredUntil = now + 10s
4. For next 10 seconds, shouldCallLLM() returns false for Agent C
5. After 10 seconds, Agent C resumes normal LLM thinking
```

---

**End of Specification**
