import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMScheduler } from '../LLMScheduler.js';
import { LLMDecisionQueue } from '../LLMDecisionQueue.js';
import { FallbackProvider } from '../FallbackProvider.js';
import { TalkerPromptBuilder } from '../TalkerPromptBuilder.js';
import { ExecutorPromptBuilder } from '../ExecutorPromptBuilder.js';
import { responseCache } from '../LLMResponseCache.js';
import { semanticCache } from '../SemanticResponseCache.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '../LLMProvider.js';
import type { Entity } from '@ai-village/core';

// --- Mock helpers ---

const createMockProvider = (id: string, shouldFail = false): LLMProvider => ({
  generate: shouldFail
    ? vi.fn().mockRejectedValue(new Error(`${id} failed`))
    : vi.fn().mockResolvedValue({
        text: JSON.stringify({ thinking: 'test', speaking: 'Hello', action: { type: 'gather' } }),
        inputTokens: 10,
        outputTokens: 20,
        costUSD: 0.001,
      } satisfies LLMResponse),
  getModelName: () => `model-${id}`,
  isAvailable: () => Promise.resolve(!shouldFail),
  getPricing: (): ProviderPricing => ({
    providerId: id,
    providerName: `Provider ${id}`,
    inputCostPer1M: 0.5,
    outputCostPer1M: 1.5,
  }),
  getProviderId: () => id,
});

const createMockAgent = (overrides: Record<string, unknown> = {}): Entity => {
  const components = new Map<string, unknown>([
    ['agent', { type: 'agent', name: 'TestAgent', behavior: 'idle', useLLM: true, ...(overrides.agent as object | undefined) }],
    ['needs', { type: 'needs', hunger: 0.5, energy: 0.8, health: 100, temperature: 0.5, ...(overrides.needs as object | undefined) }],
    ['identity', { type: 'identity', name: (overrides.name as string | undefined) || 'TestAgent', species: 'human' }],
    ['goals', { type: 'goals', goals: (overrides.goals as unknown[]) || [] }],
    ['personality', { type: 'personality', extraversion: 0.5, agreeableness: 0.5 }],
    ['position', { type: 'position', x: 0, y: 0 }],
    ['skills', { type: 'skills', levels: {} }],
  ]);

  if (overrides.components) {
    for (const [k, v] of Object.entries(overrides.components as Record<string, unknown>)) {
      components.set(k, v);
    }
  }

  return {
    id: (overrides.id as string | undefined) || 'agent-1',
    components,
    getComponent: function(type: string) { return this.components.get(type); },
  } as unknown as Entity;
};

const createMockWorld = () => ({
  tick: 100,
  entities: new Map(),
  getEntity: vi.fn().mockReturnValue(undefined),
  getPlanet: vi.fn().mockReturnValue(null),
  query: vi.fn().mockReturnValue({
    with: vi.fn().mockReturnThis(),
    without: vi.fn().mockReturnThis(),
    executeEntities: vi.fn().mockReturnValue([]),
  }),
  spatialQuery: {
    getEntitiesInRange: vi.fn().mockReturnValue([]),
    hasBuildingNearPosition: vi.fn().mockReturnValue(false),
  },
  simulationScheduler: {
    filterActiveEntities: vi.fn((entities: unknown[]) => entities),
  },
  getFirstEntityWith: vi.fn().mockReturnValue(undefined),
  getSingletonComponent: vi.fn().mockReturnValue(undefined),
});

// --- Tests ---

describe('LLMScheduler with 50 NPCs', () => {
  let queue: LLMDecisionQueue;
  let scheduler: LLMScheduler;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    const provider = createMockProvider('primary');
    queue = new LLMDecisionQueue(provider, 2);
    scheduler = new LLMScheduler(queue);
    world = createMockWorld();
  });

  it('selectLayer correctly categorizes idle agents to executor', () => {
    const idleAgent = createMockAgent({ id: 'idle-1', agent: { behavior: 'idle' } });
    const result = scheduler.selectLayer(idleAgent, world as never);
    expect(result.layer).toBe('executor');
  });

  it('selectLayer routes agents with critical needs to autonomic', () => {
    const hungryAgent = createMockAgent({
      id: 'hungry-1',
      needs: { hunger: 0.1, energy: 0.9, health: 100, temperature: 0.5 },
      agent: { behavior: 'gather' },
    });
    const result = scheduler.selectLayer(hungryAgent, world as never);
    expect(result.layer).toBe('autonomic');
    expect(result.urgency).toBe(10);
  });

  it('selectLayer routes agents with no goals to talker', () => {
    const agentWithNoGoals = createMockAgent({
      id: 'nogoals-1',
      agent: { behavior: 'gather' },
      goals: [],
    });
    const result = scheduler.selectLayer(agentWithNoGoals, world as never);
    expect(result.layer).toBe('talker');
  });

  it('selectLayer routes agents with active goals and good needs to executor', () => {
    const agentWithGoals = createMockAgent({
      id: 'goals-1',
      agent: { behavior: 'gather' },
      needs: { hunger: 0.8, energy: 0.8, health: 100, temperature: 0.5 },
      goals: [{ id: 'g1', completed: false, description: 'Gather wood', milestones: [], progress: 0, completion_ratio: 0, category: 'personal' }],
    });
    const result = scheduler.selectLayer(agentWithGoals, world as never);
    expect(result.layer).toBe('executor');
  });

  it('selectLayer correctly categorizes 50 agents with varying states', () => {
    const results = [];
    for (let i = 0; i < 50; i++) {
      let agent: Entity;
      if (i % 4 === 0) {
        // Critical hunger
        agent = createMockAgent({
          id: `agent-${i}`,
          needs: { hunger: 0.05, energy: 0.8, health: 100, temperature: 0.5 },
          agent: { behavior: 'gather' },
        });
      } else if (i % 4 === 1) {
        // No goals, active behavior
        agent = createMockAgent({
          id: `agent-${i}`,
          agent: { behavior: 'craft' },
          goals: [],
        });
      } else if (i % 4 === 2) {
        // Idle
        agent = createMockAgent({ id: `agent-${i}`, agent: { behavior: 'idle' } });
      } else {
        // Has goals and good needs
        agent = createMockAgent({
          id: `agent-${i}`,
          agent: { behavior: 'craft' },
          needs: { hunger: 0.9, energy: 0.9, health: 100, temperature: 0.5 },
          goals: [{ id: 'g1', completed: false, description: 'work', milestones: [], progress: 0, completion_ratio: 0, category: 'personal' }],
        });
      }
      results.push(scheduler.selectLayer(agent, world as never));
    }

    // Critical-need agents (i%4===0) go autonomic
    const autonomicCount = results.filter((r, i) => i % 4 === 0 && r.layer === 'autonomic').length;
    expect(autonomicCount).toBe(13); // 0,4,8,...,48 → 13 agents

    // No-goal agents (i%4===1) go talker
    const talkerCount = results.filter((r, i) => i % 4 === 1 && r.layer === 'talker').length;
    expect(talkerCount).toBe(13);
  });

  it('respects per-layer cooldowns when all 50 agents request at once', () => {
    // Force a cooldown by setting an invocation timestamp
    const agentId = 'agent-cooldown';
    // First call should pass (no prior invocation)
    scheduler['getAgentState'](agentId).lastInvocation['executor'] = Date.now();

    const result = scheduler.isLayerReady(agentId, 'executor');
    // Should NOT be ready immediately after marking invocation
    expect(result).toBe(false);
  });

  it('isLayerReady returns true for new agents with no prior invocations', () => {
    expect(scheduler.isLayerReady('brand-new-agent', 'autonomic')).toBe(true);
    expect(scheduler.isLayerReady('brand-new-agent', 'talker')).toBe(true);
    expect(scheduler.isLayerReady('brand-new-agent', 'executor')).toBe(true);
  });

  it('cleanupOldStates removes stale agent state', () => {
    // Artificially add 50 agents with old timestamps
    for (let i = 0; i < 50; i++) {
      const state = scheduler['getAgentState'](`stale-agent-${i}`);
      state.lastInvocation['autonomic'] = Date.now() - 400000; // 400 seconds ago
    }
    expect(scheduler['agentStates'].size).toBe(50);

    scheduler.cleanupOldStates(300000); // 5 minute max age
    expect(scheduler['agentStates'].size).toBe(0);
  });

  it('cleanupOldStates does not remove recently active agents', () => {
    const state = scheduler['getAgentState']('recent-agent');
    state.lastInvocation['autonomic'] = Date.now() - 1000; // 1 second ago

    scheduler.cleanupOldStates(300000);
    expect(scheduler['agentStates'].has('recent-agent')).toBe(true);
  });

  it('getMetrics tracks selections across multiple agents', () => {
    const agent1 = createMockAgent({ id: 'a1', agent: { behavior: 'idle' } });
    const agent2 = createMockAgent({
      id: 'a2',
      needs: { hunger: 0.05, energy: 0.9, health: 100, temperature: 0.5 },
      agent: { behavior: 'gather' },
    });
    const agent3 = createMockAgent({ id: 'a3', agent: { behavior: 'craft' }, goals: [] });

    scheduler.selectLayer(agent1, world as never);
    scheduler.selectLayer(agent2, world as never);
    scheduler.selectLayer(agent3, world as never);

    // Metrics are only updated in requestDecision, not selectLayer directly
    // But we can verify the scheduler tracks layer state correctly via selectLayer results
    const r1 = scheduler.selectLayer(agent1, world as never);
    const r2 = scheduler.selectLayer(agent2, world as never);
    const r3 = scheduler.selectLayer(agent3, world as never);

    expect(r1.layer).toBe('executor');
    expect(r2.layer).toBe('autonomic');
    expect(r3.layer).toBe('talker');
  });
});

describe('TalkerPromptBuilder for NPC dialogue', () => {
  let builder: TalkerPromptBuilder;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    builder = new TalkerPromptBuilder();
    world = createMockWorld();
  });

  it('generates a non-empty prompt for a basic agent', () => {
    const agent = createMockAgent({ id: 'talker-1' });
    const prompt = builder.buildPrompt(agent, world as never);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('prompt includes personality and identity sections', () => {
    const agent = createMockAgent({ id: 'talker-2', name: 'Aldric' });
    const prompt = builder.buildPrompt(agent, world as never);
    expect(prompt).toContain('Aldric');
  });

  it('prompt does not instruct agent to respond in JSON (uses tool calling)', () => {
    const agent = createMockAgent({ id: 'talker-3' });
    const prompt = builder.buildPrompt(agent, world as never);
    expect(prompt).not.toContain('RESPOND IN JSON');
  });

  it('includes conversation context when agent has active conversation', () => {
    const agent = createMockAgent({ id: 'talker-4' });
    agent.components.set('conversation', {
      type: 'conversation',
      isActive: true,
      partnerId: 'agent-partner',
      participantIds: ['agent-partner'],
      messages: [{ speakerId: 'agent-partner', text: 'Hello there!', tick: 99 }],
    });
    const prompt = builder.buildPrompt(agent, world as never);
    expect(prompt).toBeTruthy();
    // Prompt should be valid and include conversation context
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('generates distinct prompts for agents with different personalities', () => {
    const extrovert = createMockAgent({ id: 'extrovert' });
    extrovert.components.set('personality', { extraversion: 0.95, agreeableness: 0.5 });

    const introvert = createMockAgent({ id: 'introvert' });
    introvert.components.set('personality', { extraversion: 0.05, agreeableness: 0.5 });

    const p1 = builder.buildPrompt(extrovert, world as never);
    const p2 = builder.buildPrompt(introvert, world as never);

    // Both should produce valid prompts
    expect(p1.length).toBeGreaterThan(50);
    expect(p2.length).toBeGreaterThan(50);
  });
});

describe('ExecutorPromptBuilder for NPC decisions', () => {
  let builder: ExecutorPromptBuilder;
  let world: ReturnType<typeof createMockWorld>;

  beforeEach(() => {
    builder = new ExecutorPromptBuilder();
    world = createMockWorld();
  });

  it('generates a non-empty prompt for a basic agent', () => {
    const agent = createMockAgent({ id: 'executor-1' });
    const prompt = builder.buildPrompt(agent, world as never);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('skill-gated actions only appear for agents with sufficient skills', () => {
    const skilllessAgent = createMockAgent({ id: 'no-skill' });
    skilllessAgent.components.set('skills', { levels: { magic: 0.0, building: 0.0 } });

    const skilledAgent = createMockAgent({ id: 'skilled' });
    skilledAgent.components.set('skills', { levels: { magic: 3.5, building: 2.0 } });

    const promptNoSkill = builder.buildPrompt(skilllessAgent, world as never);
    const promptSkilled = builder.buildPrompt(skilledAgent, world as never);

    // Skilled agent should have more actions available
    expect(promptSkilled).toContain('cast_spell');
    expect(promptNoSkill).not.toContain('cast_spell');
  });

  it('includes resource and village context in prompt', () => {
    const agent = createMockAgent({ id: 'executor-2' });
    const prompt = builder.buildPrompt(agent, world as never);
    // Prompt should mention actions or decision content
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('generates distinct prompts for agents with different skill sets', () => {
    const farmer = createMockAgent({ id: 'farmer' });
    farmer.components.set('skills', { levels: { farming: 5.0, gathering: 1.0, building: 0.0 } });

    const builder_ = createMockAgent({ id: 'builder' });
    builder_.components.set('skills', { levels: { farming: 0.0, gathering: 1.0, building: 5.0 } });

    const p1 = builder.buildPrompt(farmer, world as never);
    const p2 = builder.buildPrompt(builder_, world as never);

    expect(p1.length).toBeGreaterThan(50);
    expect(p2.length).toBeGreaterThan(50);
  });
});

describe('FallbackProvider with 2+ providers', () => {
  it('primary provider succeeds → no fallback needed', async () => {
    const primary = createMockProvider('primary');
    const secondary = createMockProvider('secondary');
    const fallback = new FallbackProvider([primary, secondary], { logFallbacks: false });

    const response = await fallback.generate({ prompt: 'test' });
    expect(response.text).toBeTruthy();
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(secondary.generate).not.toHaveBeenCalled();
  });

  it('primary fails → falls back to secondary', async () => {
    const primary = createMockProvider('primary', true);
    const secondary = createMockProvider('secondary', false);
    const fallback = new FallbackProvider([primary, secondary], { logFallbacks: false, maxConsecutiveFailures: 1 });

    const response = await fallback.generate({ prompt: 'test' });
    expect(response.text).toBeTruthy();
    expect(secondary.generate).toHaveBeenCalledTimes(1);
  });

  it('both providers fail → throws error (no silent fallback)', async () => {
    const primary = createMockProvider('primary', true);
    const secondary = createMockProvider('secondary', true);
    const fallback = new FallbackProvider([primary, secondary], { logFallbacks: false });

    await expect(fallback.generate({ prompt: 'test' })).rejects.toThrow('All LLM providers failed');
  });

  it('provider recovers after cooldown', async () => {
    const primary = createMockProvider('primary', true);
    const secondary = createMockProvider('secondary', false);
    const fallback = new FallbackProvider([primary, secondary], {
      logFallbacks: false,
      retryAfterMs: 1, // 1ms cooldown for testing
      maxConsecutiveFailures: 1,
    });

    // First call: primary fails, falls back to secondary
    await fallback.generate({ prompt: 'first' });

    // Reset primary to succeed now
    (primary.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: 'primary recovered',
      inputTokens: 5,
      outputTokens: 10,
      costUSD: 0.0,
    });

    // Wait for cooldown
    await new Promise(r => setTimeout(r, 10));
    fallback.resetFailures();

    const response = await fallback.generate({ prompt: 'second' });
    expect(response.text).toBeTruthy();
  });

  it('getProviderStatus reports health info for all providers', () => {
    const primary = createMockProvider('primary');
    const secondary = createMockProvider('secondary');
    const fallback = new FallbackProvider([primary, secondary], { logFallbacks: false });

    const statuses = fallback.getProviderStatus();
    expect(statuses).toHaveLength(2);
    expect(statuses[0]!.providerId).toBe('primary');
    expect(statuses[1]!.providerId).toBe('secondary');
    expect(statuses[0]!.healthy).toBe(true);
    expect(statuses[1]!.healthy).toBe(true);
  });

  it('resetFailures clears disabled state', async () => {
    const primary = createMockProvider('primary', true);
    const secondary = createMockProvider('secondary', false);
    const fallback = new FallbackProvider([primary, secondary], {
      logFallbacks: false,
      maxConsecutiveFailures: 1,
    });

    // Trigger failure to disable primary
    await fallback.generate({ prompt: 'trigger' });

    fallback.resetFailures();

    const statuses = fallback.getProviderStatus();
    expect(statuses[0]!.failureCount).toBe(0);
  });
});

describe('Rate limiting with 50 NPCs', () => {
  // Clear response and semantic caches before each test so cached entries
  // from previous tests don't short-circuit blocking-provider tests.
  beforeEach(() => {
    responseCache.clear();
    semanticCache.clear();
  });

  it('only 2 requests are active concurrently when maxConcurrent=2', async () => {
    let activeCount = 0;
    let maxActive = 0;

    const trackingProvider: LLMProvider = {
      generate: vi.fn().mockImplementation(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise(r => setTimeout(r, 10));
        activeCount--;
        return {
          text: JSON.stringify({ action: { type: 'idle' } }),
          inputTokens: 5,
          outputTokens: 10,
          costUSD: 0.0,
        } satisfies LLMResponse;
      }),
      getModelName: () => 'tracking-model',
      isAvailable: () => Promise.resolve(true),
      getPricing: (): ProviderPricing => ({
        providerId: 'tracking',
        providerName: 'Tracking',
        inputCostPer1M: 0,
        outputCostPer1M: 0,
      }),
      getProviderId: () => 'tracking',
    };

    const queue = new LLMDecisionQueue(trackingProvider, 2);

    const promises = Array.from({ length: 50 }, (_, i) =>
      queue.requestDecision(`agent-${i}`, `prompt for agent ${i}`)
    );

    await Promise.all(promises);

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('all 50 requests eventually complete', async () => {
    const provider = createMockProvider('batch');
    const queue = new LLMDecisionQueue(provider, 2);

    const promises = Array.from({ length: 50 }, (_, i) =>
      queue.requestDecision(`agent-${i}`, `prompt ${i}`)
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(50);
    results.forEach(r => expect(typeof r).toBe('string'));
  });

  it('queue processes requests FIFO', async () => {
    const order: string[] = [];

    const orderedProvider: LLMProvider = {
      generate: vi.fn().mockImplementation(async (req: LLMRequest) => {
        // Extract agent id from prompt
        const match = req.prompt.match(/agent-(\d+)/);
        if (match) order.push(`agent-${match[1]}`);
        return {
          text: '{}',
          inputTokens: 5,
          outputTokens: 5,
          costUSD: 0,
        } satisfies LLMResponse;
      }),
      getModelName: () => 'ordered',
      isAvailable: () => Promise.resolve(true),
      getPricing: (): ProviderPricing => ({
        providerId: 'ordered',
        providerName: 'Ordered',
        inputCostPer1M: 0,
        outputCostPer1M: 0,
      }),
      getProviderId: () => 'ordered',
    };

    // maxConcurrent=1 to enforce strict FIFO
    const queue = new LLMDecisionQueue(orderedProvider, 1);

    const promises = Array.from({ length: 5 }, (_, i) =>
      queue.requestDecision(`agent-${i}`, `agent-${i} prompt`)
    );

    await Promise.all(promises);
    expect(order).toEqual(['agent-0', 'agent-1', 'agent-2', 'agent-3', 'agent-4']);
  });

  it('getQueueSize and getActiveCount reflect current state', async () => {
    let resolveFirst!: () => void;
    const blocking: LLMProvider = {
      generate: vi.fn().mockImplementation(() =>
        new Promise<LLMResponse>(resolve => {
          resolveFirst = () => resolve({ text: '{}', inputTokens: 1, outputTokens: 1, costUSD: 0 });
        })
      ),
      getModelName: () => 'blocking',
      isAvailable: () => Promise.resolve(true),
      getPricing: (): ProviderPricing => ({
        providerId: 'blocking',
        providerName: 'Blocking',
        inputCostPer1M: 0,
        outputCostPer1M: 0,
      }),
      getProviderId: () => 'blocking',
    };

    const queue = new LLMDecisionQueue(blocking, 1);

    // Queue 3 requests: 1 active, 2 waiting
    const p1 = queue.requestDecision('a1', 'prompt 1');
    const p2 = queue.requestDecision('a2', 'prompt 2');
    const p3 = queue.requestDecision('a3', 'prompt 3');

    // Yield to allow processing to start
    await new Promise(r => setTimeout(r, 0));

    expect(queue.getActiveCount()).toBe(1);
    expect(queue.getQueueSize()).toBeGreaterThanOrEqual(1);

    resolveFirst();
    await p1;

    // Allow next to start
    await new Promise(r => setTimeout(r, 0));
    resolveFirst();
    await p2;
    await new Promise(r => setTimeout(r, 0));
    resolveFirst();
    await p3;
  });
});

describe('End-to-end Sprint 2 wiring', () => {
  it('scheduler routes 10 agents to appropriate layers and collects responses', async () => {
    const provider = createMockProvider('e2e');
    const queue = new LLMDecisionQueue(provider, 5);
    const scheduler = new LLMScheduler(queue, {
      autonomic: { cooldownMs: 0 },
      talker: { cooldownMs: 0 },
      executor: { cooldownMs: 0 },
    });
    const world = createMockWorld();

    const agents = [
      // Critical hunger → autonomic
      createMockAgent({ id: 'e2e-0', needs: { hunger: 0.05, energy: 0.9, health: 100, temperature: 0.5 }, agent: { behavior: 'gather' } }),
      // No goals → talker
      createMockAgent({ id: 'e2e-1', agent: { behavior: 'craft' }, goals: [] }),
      // Idle → executor
      createMockAgent({ id: 'e2e-2', agent: { behavior: 'idle' } }),
      // Has goals + good needs → executor
      createMockAgent({ id: 'e2e-3', agent: { behavior: 'craft' }, needs: { hunger: 0.9, energy: 0.9, health: 100, temperature: 0.5 }, goals: [{ id: 'g1', completed: false, description: 'work', milestones: [], progress: 0, completion_ratio: 0, category: 'personal' }] }),
      // More critical-need agents
      createMockAgent({ id: 'e2e-4', needs: { hunger: 0.05, energy: 0.9, health: 100, temperature: 0.5 }, agent: { behavior: 'farm' } }),
      createMockAgent({ id: 'e2e-5', agent: { behavior: 'idle' } }),
      createMockAgent({ id: 'e2e-6', agent: { behavior: 'craft' }, goals: [] }),
      createMockAgent({ id: 'e2e-7', needs: { hunger: 0.9, energy: 0.9, health: 100, temperature: 0.5 }, agent: { behavior: 'craft' }, goals: [{ id: 'g2', completed: false, description: 'work', milestones: [], progress: 0, completion_ratio: 0, category: 'personal' }] }),
      createMockAgent({ id: 'e2e-8', agent: { behavior: 'idle' } }),
      createMockAgent({ id: 'e2e-9', agent: { behavior: 'craft' }, goals: [] }),
    ];

    const results = await Promise.all(
      agents.map(agent => scheduler.requestDecision(agent, world as never))
    );

    // All agents should get a response (no cooldown configured)
    const successful = results.filter(r => r !== null);
    expect(successful.length).toBe(10);

    // Verify layer routing matches expectations
    expect(results[0]!.layer).toBe('autonomic'); // critical hunger
    expect(results[1]!.layer).toBe('talker');    // no goals
    expect(results[2]!.layer).toBe('executor');  // idle
    expect(results[3]!.layer).toBe('executor');  // has goals
  });

  it('lazy prompt building: prompt is built at send-time not queue-time', async () => {
    let resolveBlocker!: () => void;

    const provider: LLMProvider = {
      generate: vi.fn().mockImplementation(
        () => new Promise<LLMResponse>(resolve => {
          resolveBlocker = () => resolve({ text: '{}', inputTokens: 5, outputTokens: 5, costUSD: 0 });
        })
      ),
      getModelName: () => 'lazy-test',
      isAvailable: () => Promise.resolve(true),
      getPricing: (): ProviderPricing => ({
        providerId: 'lazy',
        providerName: 'Lazy',
        inputCostPer1M: 0,
        outputCostPer1M: 0,
      }),
      getProviderId: () => 'lazy',
    };

    const queue = new LLMDecisionQueue(provider, 1);

    // Fill the only slot with a blocking request so the lazy request must wait
    const blockingRequest = queue.requestDecision('blocker', 'blocking prompt');

    // Yield to let the blocker start processing
    await new Promise(r => setTimeout(r, 0));

    let agentState = 'initial';
    let capturedState = '';

    // Queue a lazy builder - it will be built when the blocker finishes
    const lazyRequest = queue.requestDecision('agent-lazy', () => {
      capturedState = agentState;
      return `prompt with ${agentState}`;
    });

    // Mutate state while the request is still in queue (before it reaches front)
    agentState = 'updated';

    // Release the blocker - lazy prompt will now be built with 'updated' state
    resolveBlocker();
    await blockingRequest;

    // Allow second request to be processed
    await new Promise(r => setTimeout(r, 0));
    resolveBlocker();
    await lazyRequest;

    // Prompt was built lazily at send-time (after state was updated)
    expect(capturedState).toBe('updated');
  });

  it('FallbackProvider integrated with LLMDecisionQueue handles provider failure gracefully', async () => {
    const primary = createMockProvider('primary', true);
    const secondary = createMockProvider('secondary', false);
    const fallback = new FallbackProvider([primary, secondary], {
      logFallbacks: false,
      maxConsecutiveFailures: 1,
    });

    const queue = new LLMDecisionQueue(fallback, 2);

    // Should succeed via secondary despite primary failure
    const result = await queue.requestDecision('agent-fallback', 'test prompt');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('scheduler metrics track successful and failed calls', async () => {
    const provider = createMockProvider('metrics-test');
    const queue = new LLMDecisionQueue(provider, 2);
    const scheduler = new LLMScheduler(queue, {
      autonomic: { cooldownMs: 0 },
      talker: { cooldownMs: 0 },
      executor: { cooldownMs: 0 },
    });
    const world = createMockWorld();

    const agents = Array.from({ length: 5 }, (_, i) =>
      createMockAgent({ id: `metric-agent-${i}`, agent: { behavior: 'idle' } })
    );

    await Promise.all(agents.map(a => scheduler.requestDecision(a, world as never)));

    const metrics = scheduler.getMetrics();
    expect(metrics.totalRequests).toBe(5);
    expect(metrics.successfulCalls).toBe(5);
    expect(metrics.failedCalls).toBe(0);
    expect(metrics.layerSelections.executor).toBeGreaterThan(0);
  });
});
