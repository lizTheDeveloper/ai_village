# LLM Package - Agent AI Decision Making

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the LLM system to understand its architecture, interfaces, and usage patterns.

## Overview

The **LLM Package** (`@ai-village/llm`) implements the complete LLM integration layer for agent decision-making, providing prompt construction, provider management, rate limiting, and response parsing.

**What it does:**
- Builds structured prompts from agent state and world context
- Manages multiple LLM providers (Ollama, OpenAI-compatible APIs, proxies)
- Handles request queuing, rate limiting, and load balancing
- Parses LLM responses into validated agent actions
- Tracks costs, metrics, and performance across sessions
- Caches prompt components for performance optimization

**Key files:**
- `src/TalkerPromptBuilder.ts` - Conversational/social decision prompts
- `src/StructuredPromptBuilder.ts` - General agent decision prompts
- `src/ResponseParser.ts` - Parses LLM output into agent actions
- `src/LLMDecisionQueue.ts` - Async request queue with rate limiting
- `src/LLMRequestRouter.ts` - Server-side request routing
- `src/ActionDefinitions.ts` - Single source of truth for valid actions
- `src/PromptCacheManager.ts` - Multi-tier caching for performance

---

## Package Structure

```
packages/llm/
├── src/
│   ├── prompt-builders/
│   │   ├── ActionBuilder.ts         # Available actions based on skills
│   │   ├── MemoryBuilder.ts         # Memory formatting for prompts
│   │   ├── WorldContextBuilder.ts   # Environmental/spatial context
│   │   ├── VillageInfoBuilder.ts    # Village-level information
│   │   ├── HarmonyContextBuilder.ts # Harmony system context
│   │   └── SkillProgressionUtils.ts # Skill-based progression hints
│   ├── TalkerPromptBuilder.ts       # Conversational decision prompts
│   ├── StructuredPromptBuilder.ts   # General decision prompts
│   ├── ExecutorPromptBuilder.ts     # Strategic planning prompts
│   ├── ResponseParser.ts            # Parse LLM output to actions
│   ├── ActionDefinitions.ts         # Valid actions & descriptions
│   ├── LLMProvider.ts               # Provider interface
│   ├── OllamaProvider.ts            # Ollama implementation
│   ├── OpenAICompatProvider.ts      # OpenAI-compatible APIs
│   ├── ProxyLLMProvider.ts          # Proxy server provider
│   ├── LLMDecisionQueue.ts          # Async request queue
│   ├── LLMRequestRouter.ts          # Server-side routing
│   ├── RateLimiter.ts               # Token bucket rate limiter
│   ├── PromptCacheManager.ts        # Multi-tier caching
│   ├── GameSessionManager.ts        # Multi-game session tracking
│   ├── CooldownCalculator.ts        # Rate limit cooldowns
│   ├── CostTracker.ts               # Token/cost tracking
│   ├── PromptLogger.ts              # Debug logging
│   ├── PersonalityPromptTemplates.ts # Personality prompt generation
│   ├── SkillContextTemplates.ts     # Skill-aware action filtering
│   └── index.ts                     # Package exports
├── package.json
└── README.md                        # This file
```

---

## Core Concepts

### 1. Three-Layer Agent Architecture

Agents make decisions using three specialized LLM layers:

```typescript
// Layer 1: Autonomic (no LLM - handled by AutonomicSystem)
// Basic needs: wander, rest, seek_sleep, seek_warmth
// Fast fallback behaviors when no high-level decision is needed

// Layer 2: Talker (conversational/social LLM)
type TalkerActions =
  | 'talk'
  | 'follow_agent'
  | 'call_meeting'
  | 'attend_meeting'
  | 'help';

// Layer 3: Executor (strategic planning LLM)
type ExecutorActions =
  | 'pick'
  | 'gather'
  | 'build'
  | 'plan_build'
  | 'farm'
  | 'till'
  | 'plant'
  | 'explore'
  | 'hunt'
  | 'tame_animal'
  // ... etc
```

**TalkerPromptBuilder** focuses on:
- Environmental awareness (vision, weather, needs)
- Social context (conversations, relationships)
- Personality-driven behavior
- Goal-setting

**StructuredPromptBuilder** focuses on:
- Skills and abilities
- Resource management
- Building construction
- Task execution
- Strategic priorities

### 2. Prompt Construction Pipeline

Prompts are built in sections and cached for performance:

```typescript
interface AgentPrompt {
  systemPrompt: string;       // Role, personality (cached)
  schemaPrompt?: string;       // Auto-generated component data
  skills?: string;             // Skill levels
  priorities?: string;         // Strategic priorities
  goals?: string;              // Personal goals
  memories: string;            // Recent relevant memories
  worldContext: string;        // Current situation (vision, environment)
  villageStatus?: string;      // Village-level coordination
  buildings: string;           // Available buildings
  availableActions: string[];  // What they can do (skill-filtered)
  instruction: string;         // What to decide
}
```

**Caching Strategy (4 tiers):**

1. **Static Data (Tier 1):** Building purposes, skill descriptions (never changes)
2. **Village-Level (Tier 2):** Building counts, storage totals (event-driven invalidation)
3. **Frame-Level (Tier 3):** World queries (cleared each tick, shared across agents)
4. **Spatial TTL (Tier 4):** Harmony analysis (5-10 second TTL per sector)

### 3. Provider System

The LLM package supports multiple provider types:

```typescript
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
  getPricing(): ProviderPricing;
  getProviderId(): string;
}

// Built-in providers:
// - OllamaProvider: Local Ollama server
// - OpenAICompatProvider: OpenAI, Groq, Fireworks, etc.
// - ProxyLLMProvider: Proxy server for multi-game coordination
// - LoadBalancingProvider: Round-robin across multiple providers
// - FallbackProvider: Try primary, fallback on failure
```

**Rate Limiting:**
- Token bucket algorithm (configurable requests/minute, burst)
- Per-API-key tracking
- Multi-game cooldown coordination
- Automatic backoff on rate limits

### 4. Response Parsing

LLM responses are parsed into structured agent actions:

```typescript
interface AgentResponse {
  thinking: string;      // Internal thoughts
  speaking: string;      // What the agent says
  action: AgentBehavior; // Validated action type
  actionParams?: Record<string, unknown>; // Parameters (for complex actions)
}

// Example LLM response:
{
  "thinking": "I'm hungry and I see berries nearby",
  "speaking": "Those berries look delicious!",
  "action": "pick",
  "actionParams": { "item": "berries" }
}

// Parsed action is validated against ActionDefinitions
// Throws BehaviorParseError if invalid (no silent fallbacks)
```

**Synonym Support:**
```typescript
// ResponseParser maps synonyms to canonical actions
{
  'chop': 'gather',
  'cut': 'gather',
  'mine': 'gather',
  'construct': 'build',
  'create': 'build'
}
```

### 5. Action Definitions (Single Source of Truth)

All valid agent actions are defined in `ActionDefinitions.ts`:

```typescript
interface ActionDefinition {
  behavior: AgentBehavior;     // Canonical name
  description: string;          // Shown in LLM prompts
  alwaysAvailable: boolean;     // Always shown vs contextual
  category: string;             // Grouping
  skillRequired?: {             // Progressive reveal
    skill: SkillId;
    level: number;
  };
}

// Example:
{
  behavior: 'plan_build',
  description: 'Plan and queue a building project (auto-gathers resources)',
  alwaysAvailable: true,
  category: 'building',
  // No skill requirement - beginner-friendly
}
```

**Progressive Skill Reveal:**
- Actions locked by skill requirements (e.g., `tame_animal` requires `animal_handling: 2`)
- Only available actions shown in prompts
- LLM can't choose unavailable actions

### 6. Queue & Request Routing

**Client-side (LLMDecisionQueue):**
```typescript
const queue = new LLMDecisionQueue(provider, maxConcurrent);
const response = await queue.requestDecision(agentId, prompt, customConfig);
```

**Server-side (LLMRequestRouter):**
```typescript
const router = new LLMRequestRouter(poolManager, sessionManager, cooldownCalc);
const response = await router.routeRequest({
  sessionId: 'game-123',
  agentId: 'agent-456',
  prompt: 'What should I do?',
  model: 'qwen-3-32b'
});
// Returns: LLMResponse + cooldown info + cost tracking
```

**Features:**
- Concurrent request limiting
- Per-agent custom LLM configs
- Model → provider mapping
- Automatic fallback chains
- Cost/metrics tracking

---

## APIs

### TalkerPromptBuilder

Builds prompts for conversational/social decision-making.

```typescript
class TalkerPromptBuilder {
  buildPrompt(agent: Entity, world: World): string;

  // Internal sections
  buildSystemPrompt(name: string, personality: PersonalityComponent, agentId: string): string;
  buildSchemaPrompt(agent: Entity): string;
  buildSocialContext(conversation, relationships, vision, world, agentId): string;
  buildEnvironmentContext(needs, vision, temperature, world, agent): string;
  buildSocialMemories(episodicMemory, world): string;
  getAvailableTalkerActions(conversation, vision, world): string[];
}
```

**Usage:**
```typescript
import { TalkerPromptBuilder } from '@ai-village/llm';

const builder = new TalkerPromptBuilder();
const prompt = builder.buildPrompt(agent, world);
// Returns formatted prompt focusing on social/environmental awareness
```

### StructuredPromptBuilder

Builds prompts for general agent decision-making.

```typescript
class StructuredPromptBuilder {
  buildPrompt(agent: Entity, world: World): string;

  // Internal sections
  buildSystemPrompt(name, personality, agentId): string;
  buildSchemaPrompt(agent): string;
  buildSkillsSection(skills): string;
  buildPrioritiesSection(agent): string;
  buildGoalsSection(goals): string;
  buildMemoriesSection(episodicMemory, legacyMemory, world): string;
  buildJealousySection(jealousy, world): string;
  buildHuntingSection(agent, world, vision, skills): string;
  buildWorldContext(needs, vision, inventory, temperature, conversation, world, agent): string;
  buildVillageStatus(world): string;
  buildBuildingsSection(skills, inventory, world, vision): string;
  getAvailableActions(vision, world, agent): string[];
}
```

**Usage:**
```typescript
import { StructuredPromptBuilder } from '@ai-village/llm';

const builder = new StructuredPromptBuilder();
const prompt = builder.buildPrompt(agent, world);
// Returns formatted prompt with skills, resources, buildings, etc.
```

### ResponseParser

Parses LLM responses into validated agent actions.

```typescript
class ResponseParser {
  parseResponse(responseText: string): AgentResponse;

  // Returns: { thinking, speaking, action, actionParams? }
  // Throws: BehaviorParseError if invalid
}
```

**Usage:**
```typescript
import { ResponseParser } from '@ai-village/llm';

const parser = new ResponseParser();
try {
  const parsed = parser.parseResponse(llmResponseText);
  console.log(`Action: ${parsed.action}`);
  console.log(`Thinking: ${parsed.thinking}`);
  console.log(`Speaking: ${parsed.speaking}`);
} catch (error) {
  if (error instanceof BehaviorParseError) {
    console.error('Invalid LLM response:', error.message);
  }
}
```

### LLMDecisionQueue

Async request queue with rate limiting and concurrency control.

```typescript
class LLMDecisionQueue {
  constructor(provider: LLMProvider, maxConcurrent: number = 2);

  requestDecision(
    agentId: string,
    prompt: string,
    customConfig?: CustomLLMConfig
  ): Promise<string>;

  getDecision(agentId: string): string | null;
  setMaxTokens(maxTokens: number): void;
  getMaxTokens(): number;
}
```

**Usage:**
```typescript
import { LLMDecisionQueue, OllamaProvider } from '@ai-village/llm';

const provider = new OllamaProvider({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:32b'
});

const queue = new LLMDecisionQueue(provider, maxConcurrent: 5);
queue.setMaxTokens(4096);

// Non-blocking request
const response = await queue.requestDecision(agent.id, prompt);
```

### LLMProvider Interface

All providers implement this interface:

```typescript
interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface LLMResponse {
  text: string;
  stopReason?: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
  getPricing(): ProviderPricing;
  getProviderId(): string;
}
```

**Creating a custom provider:**
```typescript
class MyCustomProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    // Call your LLM API
    const response = await fetch('https://api.example.com/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: request.prompt })
    });
    const data = await response.json();

    return {
      text: data.text,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      costUSD: this.calculateCost(data.usage)
    };
  }

  getModelName(): string { return 'my-model-v1'; }
  getProviderId(): string { return 'my-provider'; }
  // ... etc
}
```

### PromptCacheManager

Multi-tier caching for prompt components.

```typescript
class PromptCacheManager {
  // Frame-level cache
  startFrame(tick: number): void;
  getCachedQuery<T>(key: string, factory: () => T): T;

  // Village-level cache (invalidated by events)
  getCachedBuildingCounts(world: World): BuildingCounts;
  getCachedStorageSummary(world: World): StorageSummary;
  getCachedAgentSummary(world: World): AgentSummary;

  // Spatial cache with TTL
  getCachedHarmony(world: World, x: number, y: number, ttl: number): AerialHarmonyComponent;

  // Manual invalidation
  invalidateVillageCache(): void;
  invalidateSpatialCache(x: number, y: number): void;
}

// Global instance
export const promptCache: PromptCacheManager;
```

**Usage:**
```typescript
import { promptCache } from '@ai-village/llm';

// Initialize at start of tick
promptCache.startFrame(world.tick);

// Use cached queries (shared across all agents this tick)
const allBuildings = promptCache.getCachedQuery('all_buildings', () =>
  world.query().with('building').executeEntities()
);

// Get village-level data (cached until building event)
const buildingCounts = promptCache.getCachedBuildingCounts(world);

// Get spatial data with TTL (cached for 100 ticks)
const harmony = promptCache.getCachedHarmony(world, x, y, 100);
```

### RateLimiter

Token bucket rate limiter with per-key tracking.

```typescript
class RateLimiter {
  constructor(config: {
    requestsPerMinute?: number;  // Default: 30
    burst?: number;               // Default: 10
  });

  tryAcquire(key: string): boolean;
  getWaitTime(key: string): number;
}
```

**Usage:**
```typescript
import { RateLimiter } from '@ai-village/llm';

const limiter = new RateLimiter({
  requestsPerMinute: 60,
  burst: 20
});

if (limiter.tryAcquire('my-api-key')) {
  // Make request
} else {
  const waitMs = limiter.getWaitTime('my-api-key');
  console.log(`Rate limited. Wait ${waitMs}ms`);
}
```

---

## Usage Examples

### Example 1: Building a Basic Prompt

```typescript
import { StructuredPromptBuilder } from '@ai-village/llm';
import type { Entity, World } from '@ai-village/core';

function generateDecision(agent: Entity, world: World): string {
  const builder = new StructuredPromptBuilder();
  const prompt = builder.buildPrompt(agent, world);

  // Prompt contains:
  // - System: "You are Alice, a cautious explorer..."
  // - Skills: "farming: 2.5, building: 1.2, ..."
  // - Goals: "Build a farm, explore the forest"
  // - Memories: Recent events
  // - World Context: "You see: 3 trees, 2 berry bushes..."
  // - Available Actions: "pick, gather, build, ..."
  // - Instruction: "Choose ONE action..."

  return prompt;
}
```

### Example 2: Making an LLM Request

```typescript
import {
  LLMDecisionQueue,
  OllamaProvider,
  ResponseParser,
  BehaviorParseError
} from '@ai-village/llm';

// Setup provider
const provider = new OllamaProvider({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:32b'
});

// Setup queue
const queue = new LLMDecisionQueue(provider, maxConcurrent: 3);

// Setup parser
const parser = new ResponseParser();

// Build prompt
const prompt = buildPrompt(agent, world);

// Make request
try {
  const responseText = await queue.requestDecision(agent.id, prompt);
  const parsed = parser.parseResponse(responseText);

  console.log(`Agent ${agent.id} chose: ${parsed.action}`);
  console.log(`Thinking: ${parsed.thinking}`);
  console.log(`Speaking: ${parsed.speaking}`);

  // Execute action
  executeAction(agent, parsed.action, parsed.actionParams);
} catch (error) {
  if (error instanceof BehaviorParseError) {
    console.error('Invalid LLM response:', error.message);
    // Fallback to default behavior
    executeAction(agent, 'wander');
  }
}
```

### Example 3: Per-Agent Custom LLM

```typescript
import type { CustomLLMConfig } from '@ai-village/llm';

// Agent component stores custom config
const customLLM: CustomLLMConfig = {
  baseUrl: 'https://api.groq.com/v1',
  model: 'llama-3-70b',
  apiKey: 'gsk_...',
  customHeaders: {
    'X-Custom-Header': 'value'
  }
};

agent.addComponent({
  type: 'custom_llm',
  config: customLLM
});

// Queue uses custom config for this agent
const response = await queue.requestDecision(
  agent.id,
  prompt,
  customLLM  // Override default provider
);
```

### Example 4: Caching Prompt Components

```typescript
import { promptCache } from '@ai-village/llm';

function buildWorldContext(agent: Entity, world: World): string {
  // Initialize frame cache
  promptCache.startFrame(world.tick);

  // Query once per frame, shared by all agents
  const allBuildings = promptCache.getCachedQuery('all_buildings', () =>
    world.query().with('building').executeEntities()
  );

  // Get village stats (cached until building event)
  const buildingCounts = promptCache.getCachedBuildingCounts(world);
  const storage = promptCache.getCachedStorageSummary(world);

  return `
    Buildings: ${buildingCounts.complete} complete, ${buildingCounts.inProgress} in progress
    Storage: ${storage.usedSlots}/${storage.totalSlots} slots used
    Nearby buildings: ${allBuildings.filter(b => isNearby(b, agent)).length}
  `.trim();
}
```

### Example 5: Server-Side Request Routing

```typescript
import {
  LLMRequestRouter,
  ProviderPoolManager,
  GameSessionManager,
  CooldownCalculator
} from '@ai-village/llm';

// Setup routing infrastructure
const poolManager = new ProviderPoolManager();
const sessionManager = new GameSessionManager();
const cooldownCalc = new CooldownCalculator(baseRPM: 60);

const router = new LLMRequestRouter(poolManager, sessionManager, cooldownCalc);

// Register provider mapping
router.registerProviderMapping('qwen-3-32b', {
  provider: 'groq',
  queue: 'qwen_queue',
  fallbackChain: ['ollama', 'openai']
});

// Handle request
const response = await router.routeRequest({
  sessionId: 'game-abc',
  agentId: 'agent-123',
  prompt: 'What should I do?',
  model: 'qwen-3-32b'
});

console.log(`Response: ${response.text}`);
console.log(`Cost: $${response.costUSD.toFixed(6)}`);
console.log(`Cooldown: ${response.cooldown.waitMs}ms`);
console.log(`Active games: ${response.cooldown.activeGames}`);
```

### Example 6: Adding a New Action

```typescript
// 1. Add to ActionDefinitions.ts
export const ACTION_DEFINITIONS: ActionDefinition[] = [
  // ... existing actions
  {
    behavior: 'fish',
    description: 'Fish in nearby water for food',
    alwaysAvailable: false,  // Only shown near water
    category: 'gathering',
    skillRequired: { skill: 'gathering', level: 2 }
  }
];

// 2. ResponseParser automatically validates 'fish' action

// 3. ActionBuilder conditionally adds to prompts
const hasWaterNearby = vision?.seenTiles.some(tile => tile.type === 'water');
if (hasWaterNearby && (skills?.levels.gathering ?? 0) >= 2) {
  gathering.push('fish - Fish in nearby water for food');
}

// 4. Create action handler in @ai-village/core
class FishActionHandler {
  async execute(agent: Entity, world: World) {
    // Find nearest water
    // Attempt to fish
    // Grant XP
  }
}
```

---

## Architecture & Data Flow

### Prompt Generation Flow

```
1. AISystem decides agent needs decision
   ↓
2. StructuredPromptBuilder.buildPrompt(agent, world)
   ↓
3. promptCache.startFrame(tick)  // Initialize frame cache
   ↓
4. Build sections (each may use cache):
   - systemPrompt (static, cached)
   - schemaPrompt (auto-generated from components)
   - skills (from SkillsComponent)
   - priorities (from agent state)
   - goals (from GoalsComponent)
   - memories (from EpisodicMemoryComponent)
   - worldContext (vision, needs, inventory)
   - villageStatus (cached village-level data)
   - buildings (filtered by skills)
   - availableActions (ActionBuilder.getAvailableActions)
   ↓
5. Combine sections into final prompt string
   ↓
6. Return to AISystem for LLM call
```

### Request/Response Flow

```
Agent needs decision
  ↓
AISystem builds prompt
  ↓
LLMDecisionQueue.requestDecision(agentId, prompt)
  ↓
Queue checks rate limiter
  ↓ (if allowed)
Provider.generate(request)
  ↓ (HTTP request to LLM API)
LLM generates response
  ↓
Provider.generate returns LLMResponse
  ↓
Queue returns response text
  ↓
AISystem: ResponseParser.parseResponse(text)
  ↓ (validates action)
Returns: AgentResponse { thinking, speaking, action, actionParams }
  ↓
AISystem executes action via behavior handlers
```

### Caching Hierarchy

```
Tier 1: Static Data (never invalidated)
  └─ BUILDING_PURPOSES, SKILL_DESCRIPTIONS, etc.

Tier 2: Village-Level (event-driven invalidation)
  └─ BuildingCounts, StorageSummary, AgentSummary
     ↓ Invalidated by:
       - building:complete
       - building:destroyed
       - inventory:changed

Tier 3: Frame-Level (cleared each tick)
  └─ World query results (all buildings, all agents)
     ↓ Shared across all agent prompts in same tick
     ↓ Cleared at startFrame(tick)

Tier 4: Spatial TTL (time-based expiration)
  └─ Aerial harmony, building harmony
     ↓ TTL: 100-200 ticks (5-10 seconds)
     ↓ Cleared per-sector
```

### Provider Selection Flow

```
LLMRequestRouter receives request with model
  ↓
Look up provider mapping for model
  ↓ (e.g., 'qwen-3-32b' → groq)
Check if provider available
  ↓ (if unavailable)
Try fallback chain (groq → ollama → openai)
  ↓
Select available provider
  ↓
Route to provider queue
  ↓
Apply rate limiting (per-game cooldown)
  ↓
Execute request via provider.generate()
  ↓
Track cost & metrics
  ↓
Return response + cooldown info
```

---

## Performance Considerations

**Critical optimizations:**

1. **Prompt caching reduces redundant queries:**
   - Frame-level cache eliminates duplicate world queries (6+ per agent → 1 per tick)
   - Village-level cache eliminates repeated counting (invalidated by events)
   - Spatial cache reduces expensive harmony calculations (5-10 second TTL)

2. **Rate limiting prevents API throttling:**
   - Token bucket algorithm allows bursts while respecting sustained rate
   - Per-API-key tracking prevents shared key exhaustion
   - Multi-game cooldown coordination distributes load

3. **Concurrent request limiting:**
   - `maxConcurrent` prevents overwhelming LLM providers
   - Queue processes requests in order with backpressure
   - Custom per-agent LLM configs allow mixing fast/slow models

4. **Action filtering reduces prompt size:**
   - Progressive skill reveal hides unavailable actions
   - Contextual availability (e.g., 'talk' only if someone nearby)
   - Reduces token usage and improves LLM focus

**Query optimization patterns:**

```typescript
// ❌ BAD: Query in loop (N queries per tick)
for (const agent of agents) {
  const buildings = world.query().with('building').executeEntities();
  // Process buildings for agent
}

// ✅ GOOD: Query once, cache in frame
promptCache.startFrame(world.tick);
const buildings = promptCache.getCachedQuery('all_buildings', () =>
  world.query().with('building').executeEntities()
);
for (const agent of agents) {
  // Use cached buildings
}
```

**Token budget management:**

```typescript
// Auto-sizing: max tokens = max(configuredMaxTokens, promptSize * 3)
const queue = new LLMDecisionQueue(provider);
queue.setMaxTokens(4096);  // Minimum, but grows if prompt is large

// Result: Prevents truncated responses for long prompts
```

**Cost tracking:**

```typescript
// Track costs across all requests
router.costTracker.trackRequest(response, sessionId, agentId);

// Get session costs
const sessionCost = router.costTracker.getSessionCost(sessionId);
console.log(`Total cost: $${sessionCost.totalCostUSD.toFixed(6)}`);
console.log(`Requests: ${sessionCost.requestCount}`);
console.log(`Input tokens: ${sessionCost.inputTokens}`);
console.log(`Output tokens: ${sessionCost.outputTokens}`);
```

---

## Troubleshooting

### LLM responses not parsed correctly

**Check:**
1. Response contains JSON with `thinking`, `speaking`, `action` fields?
2. Action is in `VALID_BEHAVIORS` set? (see `ActionDefinitions.ts`)
3. Action is a synonym? (check `BEHAVIOR_SYNONYMS`)
4. Response is plain text instead of JSON?

**Debug:**
```typescript
import { PromptLogger } from '@ai-village/llm';

PromptLogger.setEnabled(true);
// Logs full prompts and responses to console

// Or check response manually:
try {
  const parsed = parser.parseResponse(responseText);
} catch (error) {
  console.log('Raw response:', responseText);
  console.log('Error:', error.message);
  console.log('Valid behaviors:', Array.from(VALID_BEHAVIORS));
}
```

### Rate limiting too aggressive

**Check:**
1. How many games are active? (affects cooldown)
2. What's the configured RPM? (`requestsPerMinute` in RateLimiter)
3. Is burst size too small? (`burst` in RateLimiter)

**Debug:**
```typescript
const waitMs = limiter.getWaitTime('api-key');
console.log(`Wait time: ${waitMs}ms`);

// Adjust limits:
const limiter = new RateLimiter({
  requestsPerMinute: 120,  // Increase sustained rate
  burst: 30                // Increase burst capacity
});
```

### Prompts too long (token limit exceeded)

**Check:**
1. How many memories are included? (limit with `memories.slice(-10)`)
2. Is vision including too many entities? (filter by distance/relevance)
3. Are available actions list too long? (progressive skill reveal)

**Debug:**
```typescript
import { PromptLogger } from '@ai-village/llm';

PromptLogger.setEnabled(true);
// Check prompt size in console

// Reduce prompt components:
const memories = episodicMemory.memories
  .slice(-5)  // Last 5 memories only
  .filter(m => m.importance > 0.5);  // High importance only
```

### Provider connection failures

**Error:** `Provider not available`

**Fix:**
```typescript
// Check provider status
const available = await provider.isAvailable();
if (!available) {
  console.error('Provider unavailable. Check:');
  console.error('- Ollama running? (http://localhost:11434)');
  console.error('- API key valid? (for OpenAI-compatible providers)');
  console.error('- Network connectivity?');
}

// Use fallback provider
import { FallbackProvider } from '@ai-village/llm';

const fallback = new FallbackProvider(
  primaryProvider,
  [backupProvider1, backupProvider2]
);
```

### Actions not appearing in prompts

**Error:** LLM chooses unavailable action or doesn't see expected action

**Fix:**
```typescript
// Check skill requirements in ActionDefinitions
const action = ACTION_DEFINITIONS.find(a => a.behavior === 'tame_animal');
console.log('Skill required:', action.skillRequired);
// Output: { skill: 'animal_handling', level: 2 }

// Check agent's skills
const skills = agent.getComponent('skills');
console.log('Agent skills:', skills.levels);
// Output: { animal_handling: 1.5 }  // Too low!

// Solution: Grant XP or lower skill requirement
skills.levels.animal_handling = 2.0;
```

### Cache not invalidating

**Error:** Prompt shows stale data after building constructed

**Fix:**
```typescript
import { promptCache } from '@ai-village/llm';

// Manual invalidation
promptCache.invalidateVillageCache();

// Or ensure EventBus events are firing:
world.eventBus.emit('building:complete', { entityId, type });
// This should auto-invalidate village cache

// Check cache state:
console.log('Cache invalidated:', promptCache.villageCache === null);
```

---

## Integration with Other Systems

### AISystem (Decision Making)

AISystem uses LLM package to generate agent decisions:

```typescript
// From packages/core/src/systems/AISystem.ts
import {
  StructuredPromptBuilder,
  TalkerPromptBuilder,
  LLMDecisionQueue,
  ResponseParser
} from '@ai-village/llm';

class AISystem {
  private promptBuilder = new StructuredPromptBuilder();
  private parser = new ResponseParser();

  async update(tick: number): Promise<void> {
    for (const agent of this.agentsNeedingDecisions) {
      const prompt = this.promptBuilder.buildPrompt(agent, this.world);
      const responseText = await this.queue.requestDecision(agent.id, prompt);

      try {
        const parsed = this.parser.parseResponse(responseText);
        this.executeAction(agent, parsed.action, parsed.actionParams);
      } catch (error) {
        // Fallback to wander
        this.executeAction(agent, 'wander');
      }
    }
  }
}
```

### Introspection (Schema-Driven Prompts)

Introspection package provides auto-generated component prompts:

```typescript
// From packages/introspection/src/PromptRenderer.ts
import { ComponentRegistry } from '@ai-village/introspection';

const schemaPrompt = PromptRenderer.renderComponents(agent, registry);
// Auto-generates prompts for all components with @prompt_field decorators
```

### Metrics Dashboard

Metrics package tracks LLM usage:

```typescript
// Cost tracking
router.costTracker.trackRequest(response, sessionId, agentId);

// Queue metrics
router.metricsCollector.recordRequest(agentId, latencyMs, tokens);

// Dashboard queries
curl "http://localhost:8766/llm/costs?session=latest"
curl "http://localhost:8766/llm/metrics?session=latest"
```

---

## Testing

Run LLM tests:

```bash
npm test -- ResponseParser.test.ts
npm test -- PromptCacheManager.test.ts
npm test -- RateLimiter.test.ts
```

**Key test files:**
- `src/__tests__/ResponseParser.test.ts` - Response parsing validation
- `src/__tests__/ActionDefinitions.test.ts` - Action definition validation

**Manual testing:**

```typescript
// Test prompt builder
import { StructuredPromptBuilder } from '@ai-village/llm';
const builder = new StructuredPromptBuilder();
const prompt = builder.buildPrompt(agent, world);
console.log(prompt);

// Test response parser
import { ResponseParser } from '@ai-village/llm';
const parser = new ResponseParser();
const testResponse = JSON.stringify({
  thinking: "I need food",
  speaking: "Time to gather berries!",
  action: "pick"
});
const parsed = parser.parseResponse(testResponse);
console.log(parsed);

// Test provider
import { OllamaProvider } from '@ai-village/llm';
const provider = new OllamaProvider({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:32b'
});
const available = await provider.isAvailable();
console.log('Provider available:', available);
```

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference (see AISystem)
- **COMPONENTS_REFERENCE.md** - All component types used in prompts
- **ARCHITECTURE_OVERVIEW.md** - ECS architecture and data flow
- **PERFORMANCE.md** - Performance optimization guide
- **packages/introspection/README.md** - Schema-driven prompt generation

---

## Summary for Language Models

**Before working with LLM integration:**
1. Read this README completely
2. Understand the three-layer agent architecture (Autonomic/Talker/Executor)
3. Know the prompt construction pipeline and caching tiers
4. Understand ActionDefinitions as single source of truth
5. Know how to parse responses and handle errors

**Common tasks:**
- **Build prompt:** Use `StructuredPromptBuilder.buildPrompt(agent, world)`
- **Make request:** Use `LLMDecisionQueue.requestDecision(agentId, prompt)`
- **Parse response:** Use `ResponseParser.parseResponse(responseText)`
- **Add action:** Add to `ACTION_DEFINITIONS`, update `ActionBuilder`, create handler
- **Cache data:** Use `promptCache.getCachedQuery()` for frame-level sharing
- **Track costs:** Use `router.costTracker.trackRequest()`

**Critical rules:**
- Never bypass ResponseParser (always validate actions)
- Never silent fallback on parse errors (throw BehaviorParseError)
- Always use promptCache for world queries (eliminates redundant queries)
- Never modify ACTION_DEFINITIONS without updating all three: definitions, builder, handlers
- Always check provider availability before requests
- Use rate limiting to prevent API throttling

**Event-driven architecture:**
- Listen to `building:complete`, `building:destroyed` for cache invalidation
- Emit cost/metrics events for dashboard tracking
- Never bypass LLMDecisionQueue for direct provider calls
- Use EventBus for village-level cache coordination

**Performance tips:**
- Initialize frame cache once per tick: `promptCache.startFrame(tick)`
- Cache world queries: `promptCache.getCachedQuery('key', factory)`
- Use village-level cache for global stats (building counts, storage)
- Filter actions by skills (progressive reveal reduces prompt size)
- Set appropriate `maxConcurrent` based on provider limits

**Debugging:**
- Enable PromptLogger: `PromptLogger.setEnabled(true)`
- Check raw responses on parse errors
- Verify provider availability: `await provider.isAvailable()`
- Check rate limiter wait times: `limiter.getWaitTime(key)`
- Inspect cache state: `promptCache.villageCache`, `promptCache.frameCache`
