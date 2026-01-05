# Tiered LLM Routing and Distributed Inference

**Status**: Draft
**Priority**: High
**Owner**: AI Village Team
**Created**: 2026-01-04

## Overview

Enable cost-optimized LLM inference by routing requests to appropriate model tiers based on task complexity, with support for distributed inference across multiple machines (Raspberry Pis, Orange Pis, local servers).

## Problem Statement

Current LLM usage routes all requests to the same high-tier models (Qwen 32B, Llama 70B), regardless of task complexity. This is expensive and inefficient:

- **Simple tasks** (naming souls, generating alien names) don't need 70B models
- **Conversational tasks** could use fine-tuned smaller models
- **Complex reasoning** (strategic planning, moral judgments) needs larger models
- **Idle local hardware** (Raspberry Pis, Orange Pis) could handle tier 1-2 tasks

### Cost Impact

```
Current: All tasks → Qwen 32B/Llama 70B
- Soul naming: $0.001 per call (overkill)
- Agent conversation: $0.003 per call (overkill)
- Strategic planning: $0.003 per call (appropriate)

Optimized: Tiered routing
- Soul naming: 1.6B model @ $0.0001 per call (10x cheaper)
- Agent conversation: 7B model @ $0.0003 per call (10x cheaper)
- Strategic planning: 70B model @ $0.003 per call (same)

Estimated savings: 60-80% reduction in LLM costs
```

## Model Tier Definitions

### Tier 1: Trivial Tasks (1.6B - 3B models)
**Use cases:**
- Soul name generation
- Alien species names
- Simple item descriptions
- Random flavor text
- NPC greetings

**Recommended models:**
- Qwen 2.5 1.5B (Ollama)
- TinyLlama 1.1B (Ollama)
- Phi-2 2.7B (Ollama)

**Target hardware:**
- Orange Pi Zero 4GB RAM
- Raspberry Pi 4 4GB
- Local CPU inference

**Latency target:** < 500ms
**Cost target:** < $0.0001 per call

### Tier 2: Simple Tasks (7B - 14B models)
**Use cases:**
- Agent casual conversations
- Simple decision making (eat, sleep, wander)
- Crafting descriptions
- Building placement suggestions
- Basic NPC behavior

**Recommended models:**
- Qwen 2.5 7B (Ollama, Groq)
- Llama 3.2 11B (Ollama)
- Mistral 7B (Ollama, Groq)

**Target hardware:**
- Orange Pi 5 16GB RAM
- Raspberry Pi 5 8GB
- Local GPU (if available)
- Groq (fallback)

**Latency target:** < 1s
**Cost target:** < $0.0003 per call

### Tier 3: Moderate Tasks (32B - 40B models)
**Use cases:**
- Agent important decisions
- Complex conversations
- Story generation
- Quest design
- Social dynamics reasoning

**Recommended models:**
- Qwen 2.5 32B (Groq, Cerebras)
- Llama 3.3 70B (quantized to 4-bit)

**Target hardware:**
- Groq (primary)
- Cerebras (fallback)
- High-end local GPU (if available)

**Latency target:** < 2s
**Cost target:** < $0.001 per call

### Tier 4: Complex Tasks (70B+ models)
**Use cases:**
- Strategic planning
- Moral/ethical judgments
- Complex social reasoning
- Long-form narrative generation
- Multi-agent coordination

**Recommended models:**
- Llama 3.3 70B Versatile (Groq)
- Llama 3.3 70B (Cerebras)
- Mixtral 8x22B (if available)

**Target hardware:**
- Groq (primary)
- Cerebras (fallback)
- OpenAI GPT-4 (emergency fallback)

**Latency target:** < 3s
**Cost target:** < $0.003 per call

### Tier 5: Critical Tasks (Frontier models)
**Use cases:**
- God-level decision making
- Divine intervention reasoning
- Multiverse creation logic
- Reality manipulation decisions
- Emergency critical decisions

**Recommended models:**
- Claude Sonnet 3.5
- GPT-4 Turbo
- Llama 3.3 70B (fallback)

**Target hardware:**
- Anthropic API
- OpenAI API
- Groq (fallback)

**Latency target:** < 5s
**Cost target:** < $0.01 per call

## Task → Tier Mapping

### Automatic Classification

```typescript
interface TaskClassification {
  taskType: string;
  defaultTier: 1 | 2 | 3 | 4 | 5;
  minTier: 1 | 2 | 3 | 4 | 5;  // Minimum acceptable tier
  maxTier: 1 | 2 | 3 | 4 | 5;  // Maximum tier (for testing)
  description: string;
  benchmarkRequired: boolean;
}

const TASK_TIER_MAP: Record<string, TaskClassification> = {
  // Tier 1: Trivial
  'soul_name_generation': {
    taskType: 'soul_name_generation',
    defaultTier: 1,
    minTier: 1,
    maxTier: 2,
    description: 'Generate a name for a new soul',
    benchmarkRequired: true,
  },
  'alien_species_name': {
    taskType: 'alien_species_name',
    defaultTier: 1,
    minTier: 1,
    maxTier: 2,
    description: 'Generate alien species name',
    benchmarkRequired: true,
  },
  'item_flavor_text': {
    taskType: 'item_flavor_text',
    defaultTier: 1,
    minTier: 1,
    maxTier: 2,
    description: 'Generate item description flavor text',
    benchmarkRequired: true,
  },

  // Tier 2: Simple
  'agent_casual_conversation': {
    taskType: 'agent_casual_conversation',
    defaultTier: 2,
    minTier: 1,
    maxTier: 3,
    description: 'Agent casual conversation',
    benchmarkRequired: true,
  },
  'agent_simple_decision': {
    taskType: 'agent_simple_decision',
    defaultTier: 2,
    minTier: 2,
    maxTier: 3,
    description: 'Simple agent decision (eat, sleep, wander)',
    benchmarkRequired: true,
  },
  'building_placement': {
    taskType: 'building_placement',
    defaultTier: 2,
    minTier: 2,
    maxTier: 3,
    description: 'Building placement suggestion',
    benchmarkRequired: false,
  },

  // Tier 3: Moderate
  'agent_important_decision': {
    taskType: 'agent_important_decision',
    defaultTier: 3,
    minTier: 2,
    maxTier: 4,
    description: 'Important agent decision',
    benchmarkRequired: true,
  },
  'story_generation': {
    taskType: 'story_generation',
    defaultTier: 3,
    minTier: 2,
    maxTier: 4,
    description: 'Story/narrative generation',
    benchmarkRequired: true,
  },
  'social_reasoning': {
    taskType: 'social_reasoning',
    defaultTier: 3,
    minTier: 3,
    maxTier: 4,
    description: 'Social dynamics reasoning',
    benchmarkRequired: true,
  },

  // Tier 4: Complex
  'strategic_planning': {
    taskType: 'strategic_planning',
    defaultTier: 4,
    minTier: 3,
    maxTier: 5,
    description: 'Strategic planning and complex reasoning',
    benchmarkRequired: true,
  },
  'moral_judgment': {
    taskType: 'moral_judgment',
    defaultTier: 4,
    minTier: 3,
    maxTier: 5,
    description: 'Moral and ethical judgments',
    benchmarkRequired: true,
  },
  'multi_agent_coordination': {
    taskType: 'multi_agent_coordination',
    defaultTier: 4,
    minTier: 3,
    maxTier: 5,
    description: 'Multi-agent coordination planning',
    benchmarkRequired: false,
  },

  // Tier 5: Critical
  'divine_decision': {
    taskType: 'divine_decision',
    defaultTier: 5,
    minTier: 4,
    maxTier: 5,
    description: 'Divine/god-level decision making',
    benchmarkRequired: false,
  },
  'reality_manipulation': {
    taskType: 'reality_manipulation',
    defaultTier: 5,
    minTier: 4,
    maxTier: 5,
    description: 'Reality manipulation logic',
    benchmarkRequired: false,
  },
};
```

## Distributed Provider Architecture

### Provider Types

```typescript
interface InferenceProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'distributed';
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';

  // Hardware specs
  hardware: {
    cpu: string;
    ram: number;  // GB
    gpu?: string;
    vram?: number;  // GB
  };

  // Supported models
  supportedModels: {
    modelId: string;
    tier: 1 | 2 | 3 | 4 | 5;
    quantization?: '4bit' | '8bit' | 'fp16';
    contextLength: number;
    tokensPerSecond: number;  // Measured throughput
  }[];

  // Rate limits
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    concurrent: number;
  };

  // Cost (optional for local providers)
  cost?: {
    inputTokenCost: number;   // $ per 1M tokens
    outputTokenCost: number;  // $ per 1M tokens
  };

  // Cooldown tracking
  cooldown: {
    nextAvailableAt: number;
    currentWaitMs: number;
  };
}
```

### Example Provider Configurations

```typescript
const EXAMPLE_PROVIDERS: InferenceProvider[] = [
  // Cloud providers
  {
    id: 'groq-primary',
    name: 'Groq Cloud',
    type: 'cloud',
    endpoint: 'https://api.groq.com/v1',
    status: 'online',
    hardware: { cpu: 'Groq LPU', ram: 0 },
    supportedModels: [
      {
        modelId: 'llama-3.3-70b-versatile',
        tier: 4,
        contextLength: 8192,
        tokensPerSecond: 500,
      },
      {
        modelId: 'qwen/qwen3-32b',
        tier: 3,
        contextLength: 32768,
        tokensPerSecond: 800,
      },
    ],
    rateLimit: {
      requestsPerMinute: 30,
      tokensPerMinute: 30000,
      concurrent: 10,
    },
    cost: {
      inputTokenCost: 0.05,   // $0.05 per 1M tokens
      outputTokenCost: 0.10,  // $0.10 per 1M tokens
    },
    cooldown: { nextAvailableAt: 0, currentWaitMs: 0 },
  },

  // Local high-end provider (Orange Pi 5 16GB)
  {
    id: 'orangepi5-living-room',
    name: 'Orange Pi 5 (Living Room)',
    type: 'local',
    endpoint: 'http://192.168.1.100:11434',
    status: 'online',
    hardware: {
      cpu: 'RK3588S 8-core',
      ram: 16,
      gpu: 'Mali-G610 MP4',
      vram: 4,
    },
    supportedModels: [
      {
        modelId: 'qwen2.5:7b-instruct-q4_K_M',
        tier: 2,
        quantization: '4bit',
        contextLength: 8192,
        tokensPerSecond: 25,  // Measured on device
      },
      {
        modelId: 'llama3.2:11b-q4_K_M',
        tier: 2,
        quantization: '4bit',
        contextLength: 8192,
        tokensPerSecond: 15,
      },
    ],
    rateLimit: {
      requestsPerMinute: 60,   // No external limits
      tokensPerMinute: 100000,
      concurrent: 2,           // Limited by hardware
    },
    cost: {
      inputTokenCost: 0,   // Free (local)
      outputTokenCost: 0,
    },
    cooldown: { nextAvailableAt: 0, currentWaitMs: 0 },
  },

  // Local low-end provider (Orange Pi Zero 4GB)
  {
    id: 'orangepi-zero-bedroom',
    name: 'Orange Pi Zero (Bedroom)',
    type: 'local',
    endpoint: 'http://192.168.1.101:11434',
    status: 'online',
    hardware: {
      cpu: 'RK3566 4-core',
      ram: 4,
    },
    supportedModels: [
      {
        modelId: 'qwen2.5:1.5b-instruct-q4_K_M',
        tier: 1,
        quantization: '4bit',
        contextLength: 4096,
        tokensPerSecond: 12,
      },
      {
        modelId: 'tinyllama:1.1b-q4_K_M',
        tier: 1,
        quantization: '4bit',
        contextLength: 2048,
        tokensPerSecond: 20,
      },
    ],
    rateLimit: {
      requestsPerMinute: 120,
      tokensPerMinute: 50000,
      concurrent: 1,
    },
    cost: {
      inputTokenCost: 0,
      outputTokenCost: 0,
    },
    cooldown: { nextAvailableAt: 0, currentWaitMs: 0 },
  },
];
```

## Routing Strategy

### Request Flow

```
1. Classify task → determine tier
2. Check user overrides (tier → model mapping)
3. Get available providers for tier
4. Sort providers by:
   - Cost (prefer free local providers)
   - Latency (prefer fast providers)
   - Availability (check cooldown)
5. Route to best provider
6. Record metrics (cost, latency, quality)
7. Update provider health/performance
```

### Routing Algorithm

```typescript
interface RoutingRequest {
  taskType: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  userTierOverride?: 1 | 2 | 3 | 4 | 5;  // User can force a tier
}

interface RoutingDecision {
  provider: InferenceProvider;
  model: string;
  tier: 1 | 2 | 3 | 4 | 5;
  estimatedCost: number;
  estimatedLatency: number;
  reason: string;
}

class TieredLLMRouter {
  private providers: Map<string, InferenceProvider> = new Map();
  private taskTierMap: Map<string, TaskClassification>;
  private userTierOverrides: Map<number, string[]>;  // tier → model IDs

  /**
   * Route a request to the best available provider
   */
  async route(request: RoutingRequest): Promise<RoutingDecision> {
    // 1. Classify task
    const classification = this.taskTierMap.get(request.taskType);
    const tier = request.userTierOverride || classification?.defaultTier || 3;

    // 2. Get available providers for this tier
    const availableProviders = this.getProvidersForTier(tier);

    // 3. Check user tier overrides
    const preferredModels = this.userTierOverrides.get(tier);
    if (preferredModels && preferredModels.length > 0) {
      // Filter to only providers that support preferred models
      const filteredProviders = availableProviders.filter(p =>
        p.supportedModels.some(m => preferredModels.includes(m.modelId))
      );
      if (filteredProviders.length > 0) {
        return this.selectBestProvider(filteredProviders, request);
      }
    }

    // 4. Fallback: select best provider by cost/latency
    return this.selectBestProvider(availableProviders, request);
  }

  private getProvidersForTier(tier: number): InferenceProvider[] {
    const providers: InferenceProvider[] = [];

    for (const provider of this.providers.values()) {
      if (provider.status === 'offline') continue;

      // Check if provider has models for this tier
      const hasMatchingModel = provider.supportedModels.some(m => m.tier === tier);
      if (hasMatchingModel) {
        providers.push(provider);
      }
    }

    return providers;
  }

  private selectBestProvider(
    providers: InferenceProvider[],
    request: RoutingRequest
  ): RoutingDecision {
    // Score each provider
    const scored = providers.map(provider => {
      const model = this.selectModelForProvider(provider, request);
      if (!model) return null;

      // Calculate score (lower is better)
      const costScore = (provider.cost?.inputTokenCost || 0) * 10000;
      const latencyScore = (1000 / model.tokensPerSecond) * request.maxTokens;
      const cooldownPenalty = provider.cooldown.currentWaitMs;

      // Prefer local (free) providers over cloud
      const localBonus = provider.type === 'local' ? -5000 : 0;

      const totalScore = costScore + latencyScore + cooldownPenalty + localBonus;

      return {
        provider,
        model: model.modelId,
        tier: model.tier,
        estimatedCost: this.calculateCost(provider, request.maxTokens),
        estimatedLatency: (request.maxTokens / model.tokensPerSecond) * 1000,
        score: totalScore,
        reason: `Selected ${provider.name} (${model.modelId}) - Cost: $${this.calculateCost(provider, request.maxTokens).toFixed(4)}, Latency: ~${Math.round((request.maxTokens / model.tokensPerSecond) * 1000)}ms`,
      };
    }).filter(x => x !== null);

    // Sort by score (lower is better)
    scored.sort((a, b) => a!.score - b!.score);

    if (scored.length === 0) {
      throw new Error('No available providers for this tier');
    }

    const best = scored[0]!;
    return {
      provider: best.provider,
      model: best.model,
      tier: best.tier,
      estimatedCost: best.estimatedCost,
      estimatedLatency: best.estimatedLatency,
      reason: best.reason,
    };
  }

  private selectModelForProvider(
    provider: InferenceProvider,
    request: RoutingRequest
  ): InferenceProvider['supportedModels'][0] | null {
    // Find the best model on this provider
    const models = provider.supportedModels.filter(m =>
      m.contextLength >= request.prompt.length + request.maxTokens
    );

    if (models.length === 0) return null;

    // Prefer fastest model
    models.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);
    return models[0];
  }

  private calculateCost(provider: InferenceProvider, maxTokens: number): number {
    if (!provider.cost) return 0;  // Local provider

    const inputCost = (provider.cost.inputTokenCost / 1_000_000) * 500;  // Assume 500 input tokens
    const outputCost = (provider.cost.outputTokenCost / 1_000_000) * maxTokens;

    return inputCost + outputCost;
  }
}
```

## Benchmarking System

### Purpose

Test different models on game-specific tasks to:
1. Verify quality meets minimum threshold
2. Determine which tier is truly needed
3. Fine-tune tier assignments
4. Collect training data for model fine-tuning

### Benchmark Structure

```typescript
interface Benchmark {
  taskType: string;
  tier: 1 | 2 | 3 | 4 | 5;
  testCases: BenchmarkTestCase[];
}

interface BenchmarkTestCase {
  id: string;
  prompt: string;
  expectedOutput?: string;        // For exact matches
  evaluationCriteria?: {          // For LLM-as-judge evaluation
    coherence: number;    // 0-10
    relevance: number;    // 0-10
    creativity: number;   // 0-10
    accuracy: number;     // 0-10
  };
  goldenResponse?: string;        // Reference response from high-tier model
}

interface BenchmarkResult {
  benchmarkId: string;
  modelId: string;
  tier: number;
  timestamp: number;

  results: {
    testCaseId: string;
    response: string;
    latencyMs: number;

    // Scoring
    exactMatch?: boolean;
    scores?: {
      coherence: number;
      relevance: number;
      creativity: number;
      accuracy: number;
      overall: number;
    };
  }[];

  // Aggregate stats
  avgLatency: number;
  avgScore: number;
  passRate: number;  // % of tests that passed threshold
  recommended: boolean;  // Whether this model is good enough for this task
}
```

### Example Benchmarks

```typescript
const SOUL_NAME_BENCHMARK: Benchmark = {
  taskType: 'soul_name_generation',
  tier: 1,
  testCases: [
    {
      id: 'soul_name_1',
      prompt: 'Generate a unique name for a newly created soul. The name should be mystical and evocative. Output only the name, nothing else.',
      evaluationCriteria: {
        coherence: 8,      // Name should be pronounceable
        relevance: 8,      // Name should fit mystical theme
        creativity: 7,     // Name should be unique
        accuracy: 9,       // Should be just a name, not explanation
      },
      goldenResponse: 'Aerith Lumenshade',
    },
    {
      id: 'soul_name_2',
      prompt: 'Generate a unique name for a newly created soul. The name should evoke the concept of rebirth. Output only the name.',
      goldenResponse: 'Phoenix Renewalis',
    },
    // ... 50+ test cases
  ],
};

const AGENT_DECISION_BENCHMARK: Benchmark = {
  taskType: 'agent_simple_decision',
  tier: 2,
  testCases: [
    {
      id: 'decision_hungry_1',
      prompt: `You are a hungry agent (hunger: 80/100). You see:
- Apple on table (5 meters away)
- River with fish (20 meters away)
- Berry bush (3 meters away)

What do you do? Choose ONE action and explain briefly why.`,
      evaluationCriteria: {
        coherence: 9,
        relevance: 9,
        creativity: 5,
        accuracy: 8,
      },
      goldenResponse: 'Pick berries from the bush - it\'s closest and will satisfy my immediate hunger.',
    },
    // ... more test cases
  ],
};
```

### Benchmark Runner

```typescript
class BenchmarkRunner {
  async runBenchmark(
    benchmark: Benchmark,
    modelId: string,
    provider: InferenceProvider
  ): Promise<BenchmarkResult> {
    const results: BenchmarkResult['results'] = [];

    for (const testCase of benchmark.testCases) {
      const startTime = Date.now();

      // Execute inference
      const response = await this.executeInference(
        provider,
        modelId,
        testCase.prompt
      );

      const latency = Date.now() - startTime;

      // Evaluate response
      const scores = await this.evaluateResponse(
        testCase,
        response,
        benchmark.tier
      );

      results.push({
        testCaseId: testCase.id,
        response,
        latencyMs: latency,
        scores,
      });
    }

    // Calculate aggregate stats
    const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
    const avgScore = results.reduce((sum, r) => sum + (r.scores?.overall || 0), 0) / results.length;
    const passThreshold = 7.0;  // Minimum score of 7/10
    const passRate = results.filter(r => (r.scores?.overall || 0) >= passThreshold).length / results.length;

    return {
      benchmarkId: benchmark.taskType,
      modelId,
      tier: benchmark.tier,
      timestamp: Date.now(),
      results,
      avgLatency,
      avgScore,
      passRate,
      recommended: passRate >= 0.80,  // 80% pass rate required
    };
  }

  private async evaluateResponse(
    testCase: BenchmarkTestCase,
    response: string,
    tier: number
  ): Promise<BenchmarkResult['results'][0]['scores']> {
    if (testCase.expectedOutput) {
      // Exact match check
      const match = response.trim().toLowerCase() === testCase.expectedOutput.toLowerCase();
      return {
        coherence: match ? 10 : 0,
        relevance: match ? 10 : 0,
        creativity: match ? 10 : 0,
        accuracy: match ? 10 : 0,
        overall: match ? 10 : 0,
      };
    }

    if (testCase.evaluationCriteria && testCase.goldenResponse) {
      // LLM-as-judge evaluation
      return await this.llmJudgeEvaluation(
        testCase,
        response,
        tier
      );
    }

    // Default: unable to evaluate
    return {
      coherence: 5,
      relevance: 5,
      creativity: 5,
      accuracy: 5,
      overall: 5,
    };
  }

  private async llmJudgeEvaluation(
    testCase: BenchmarkTestCase,
    response: string,
    tier: number
  ): Promise<BenchmarkResult['results'][0]['scores']> {
    // Use a high-tier model (GPT-4 or Claude) to judge the response
    const judgePrompt = `You are evaluating an LLM response for a game AI task.

Prompt: ${testCase.prompt}

Golden response (reference): ${testCase.goldenResponse}

Test response: ${response}

Rate the test response on the following criteria (0-10):
- Coherence: Is the response well-formed and grammatically correct?
- Relevance: Does it address the prompt appropriately?
- Creativity: Is it creative and engaging?
- Accuracy: Does it match the expected format and content?

Return scores as JSON: {"coherence": X, "relevance": X, "creativity": X, "accuracy": X}`;

    const judgeResponse = await this.callJudgeModel(judgePrompt);
    const scores = JSON.parse(judgeResponse);

    scores.overall = (scores.coherence + scores.relevance + scores.creativity + scores.accuracy) / 4;

    return scores;
  }
}
```

## User Configuration UI

### Settings Panel

```
┌─────────────────────────────────────────────────────────┐
│ LLM Tier Configuration                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Tier 1: Trivial Tasks (1.6B-3B models)                │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [x] orangepi-zero-bedroom/qwen2.5:1.5b          │   │
│ │ [ ] orangepi-zero-bedroom/tinyllama:1.1b        │   │
│ │ [ ] groq/llama-3.2-3b                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tier 2: Simple Tasks (7B-14B models)                  │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [x] orangepi5-living-room/qwen2.5:7b            │   │
│ │ [ ] orangepi5-living-room/llama3.2:11b          │   │
│ │ [x] groq/qwen3:7b (fallback)                    │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tier 3: Moderate Tasks (32B models)                   │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [x] groq/qwen3-32b                              │   │
│ │ [x] cerebras/llama-3.3-70b (fallback)           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tier 4: Complex Tasks (70B models)                    │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [x] groq/llama-3.3-70b-versatile                │   │
│ │ [x] cerebras/llama-3.3-70b (fallback)           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tier 5: Critical Tasks (Frontier models)              │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [x] anthropic/claude-3.5-sonnet                 │   │
│ │ [ ] openai/gpt-4-turbo                          │   │
│ │ [x] groq/llama-3.3-70b (fallback)               │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [Run Benchmarks]  [Save Configuration]                │
└─────────────────────────────────────────────────────────┘
```

### Provider Discovery UI

```
┌─────────────────────────────────────────────────────────┐
│ Inference Providers                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Cloud Providers:                                        │
│ ✓ Groq (30 RPM)                  Status: Online        │
│ ✓ Cerebras (60 RPM)              Status: Online        │
│ ✗ OpenAI (GPT-4)                 Status: No API Key    │
│                                                         │
│ Local Providers:                                        │
│ ✓ 192.168.1.100:11434           Orange Pi 5 (16GB)    │
│   Models: qwen2.5:7b, llama3.2:11b                     │
│   Tier 2 | 25 tok/s | Free                             │
│                                                         │
│ ✓ 192.168.1.101:11434           Orange Pi Zero (4GB)  │
│   Models: qwen2.5:1.5b, tinyllama:1.1b                 │
│   Tier 1 | 15 tok/s | Free                             │
│                                                         │
│ [+ Add Provider]  [Auto-Discover]  [Refresh]           │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Files to create:**
```
packages/llm/src/tiered-routing/
├── TieredLLMRouter.ts          # Main routing logic
├── ProviderRegistry.ts         # Provider management
├── TaskClassifier.ts           # Task → tier mapping
├── RoutingStrategy.ts          # Provider selection algorithm
└── types.ts                    # Type definitions

packages/llm/src/benchmarking/
├── BenchmarkRunner.ts          # Benchmark execution
├── BenchmarkRegistry.ts        # Benchmark storage
├── LLMJudge.ts                # LLM-as-judge evaluation
└── benchmarks/
    ├── soul-name.ts
    ├── agent-decision.ts
    └── conversation.ts
```

**Tasks:**
1. Implement `TieredLLMRouter` with basic routing logic
2. Create `ProviderRegistry` to manage providers
3. Define task → tier mapping in `TaskClassifier`
4. Implement routing strategy (cost + latency optimization)
5. Add provider health monitoring
6. Write unit tests for routing logic

### Phase 2: Provider Discovery (Week 2)

**Files to modify/create:**
```
scripts/metrics-server.ts       # Add provider discovery endpoints
packages/llm/src/tiered-routing/
├── ProviderDiscovery.ts        # Auto-discover local Ollama instances
└── ProviderHealthCheck.ts      # Periodic health checks
```

**Tasks:**
1. Implement network scan for Ollama instances (mDNS/scan 192.168.x.x:11434)
2. Add `/api/llm/providers` endpoint to list providers
3. Add `/api/llm/providers/:id/health` for health checks
4. Implement periodic provider health monitoring
5. Add provider add/remove UI

### Phase 3: Benchmarking System (Week 3)

**Tasks:**
1. Create benchmark definitions for each task type
2. Implement `BenchmarkRunner` with parallel execution
3. Add LLM-as-judge evaluation using GPT-4/Claude
4. Create `/api/llm/benchmarks` endpoint
5. Build benchmark results dashboard
6. Run initial benchmarks on all available models

### Phase 4: UI Integration (Week 4)

**Files to modify:**
```
packages/renderer/src/LLMTierConfigPanel.ts  # NEW
packages/renderer/src/ProviderManagementPanel.ts  # NEW
packages/renderer/src/index.ts               # Register panels
```

**Tasks:**
1. Create `LLMTierConfigPanel` for tier → model mapping
2. Create `ProviderManagementPanel` for provider discovery/management
3. Add benchmark results visualization
4. Integrate with existing Settings panel
5. Add cost savings display (compare actual vs baseline)

### Phase 5: Fine-tuning Support (Future)

**Tasks:**
1. Collect high-quality responses from tier 4/5 models
2. Create fine-tuning datasets for specific tasks
3. Fine-tune Qwen 7B for agent conversations
4. Fine-tune Qwen 1.5B for soul names
5. Deploy fine-tuned models to local providers

## Testing Strategy

### Unit Tests
- Router selects correct tier for task type
- Provider selection algorithm prefers free > cheap > expensive
- Cooldown enforcement works correctly
- Provider health monitoring detects offline providers

### Integration Tests
- End-to-end routing from task to provider
- Fallback chain works when primary provider offline
- User overrides respected
- Cost tracking accurate

### Benchmark Tests
- Run benchmarks on all tiers
- Verify tier 1 models pass tier 1 benchmarks (>80%)
- Verify latency targets met
- Compare quality vs cost tradeoffs

## Success Metrics

### Cost Savings
- **Target:** 60-80% reduction in LLM costs
- **Measure:** Compare total cost before/after tiered routing
- **Baseline:** $X per 1000 agent decisions (tier 3/4 models)
- **Goal:** $Y per 1000 agent decisions (mix of tiers 1-4)

### Latency
- **Tier 1:** < 500ms (95th percentile)
- **Tier 2:** < 1s (95th percentile)
- **Tier 3:** < 2s (95th percentile)
- **Tier 4:** < 3s (95th percentile)

### Quality
- **All tiers:** >80% benchmark pass rate
- **User satisfaction:** Players don't notice quality degradation
- **Monitoring:** Track benchmark scores over time

### Hardware Utilization
- **Local providers:** >50% utilization (not idle)
- **Cost per inference:** $0 for tier 1/2 (all local)
- **Cloud fallback rate:** <10% (mostly use local)

## Security Considerations

### Network Security
- Local providers behind firewall
- API keys encrypted at rest
- No external access to local providers

### Rate Limiting
- Respect provider rate limits
- Implement per-user rate limiting
- Prevent DoS on local hardware

### Data Privacy
- Prompts/responses stay local when using local providers
- Option to disable cloud providers entirely
- User data not sent to cloud without consent

## Open Questions

1. **Auto-tier adjustment:** Should the system automatically adjust tier assignments based on benchmark results?
2. **Dynamic model loading:** Should local providers dynamically load/unload models based on demand?
3. **Distributed coordination:** If multiple game servers use same local providers, how to coordinate?
4. **Fine-tuning automation:** Should we automatically fine-tune models based on collected data?
5. **Cost budget:** Should users set a daily/monthly LLM budget and system optimizes to stay under it?

## References

- Groq models: https://console.groq.com/docs/models
- Cerebras models: https://inference-docs.cerebras.ai/introduction
- Ollama model library: https://ollama.ai/library
- Orange Pi 5 specs: https://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/details/Orange-Pi-5.html
- Raspberry Pi inference benchmarks: https://qengineering.eu/
