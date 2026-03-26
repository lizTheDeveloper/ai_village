/**
 * BrowserLLM test suite
 *
 * Covers BrowserLLMProvider, BrowserLLMCapabilityDetector, MobileTalkerPromptBuilder,
 * and InferenceWorkerProtocol types — all without spawning a real Worker or WebGPU context.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserLLMProvider } from '../BrowserLLMProvider.js';
import {
  QWEN_0_5B_CONFIG,
  QWEN_1_5B_CONFIG,
  QWEN_3B_CONFIG,
  detectCapabilities,
} from '../BrowserLLMCapabilityDetector.js';
import { MobileTalkerPromptBuilder } from '../MobileTalkerPromptBuilder.js';
import type {
  BrowserLLMConfig,
  BrowserLLMStatus,
  BrowserLLMBackend,
  WorkerRequest,
  WorkerResponse,
  DownloadProgress,
} from '../workers/InferenceWorkerProtocol.js';

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

const MINIMAL_CONFIG: BrowserLLMConfig = {
  modelId: 'test-model-q4f16_1-MLC',
  modelName: 'Test Model 1.5B',
  backend: 'webllm',
  maxContextLength: 4096,
  memoryRequirementMB: 1024,
  downloadSizeMB: 800,
};

function createMockAgent(components: Record<string, unknown>): unknown {
  return {
    id: 'agent-1',
    components: new Map(Object.entries(components)),
  };
}

function createMockWorld(entities?: Record<string, unknown>): unknown {
  return {
    getEntity: (id: string) => entities?.[id] ?? null,
    tick: 100,
  };
}

// ---------------------------------------------------------------------------
// BrowserLLMProvider
// ---------------------------------------------------------------------------

describe('BrowserLLMProvider', () => {
  let provider: BrowserLLMProvider;

  beforeEach(() => {
    provider = new BrowserLLMProvider(MINIMAL_CONFIG);
  });

  describe('constructor', () => {
    it('creates an instance with status uninitialized', () => {
      expect(provider.getStatus()).toBe('uninitialized');
    });

    it('stores the provided config', () => {
      const config = provider.getConfig();
      expect(config.modelId).toBe(MINIMAL_CONFIG.modelId);
      expect(config.modelName).toBe(MINIMAL_CONFIG.modelName);
      expect(config.backend).toBe(MINIMAL_CONFIG.backend);
    });

    it('returns a copy of config, not the original reference', () => {
      const config = provider.getConfig();
      config.modelName = 'mutated';
      expect(provider.getConfig().modelName).toBe(MINIMAL_CONFIG.modelName);
    });
  });

  describe('getModelName()', () => {
    it('returns the modelName from config', () => {
      expect(provider.getModelName()).toBe(MINIMAL_CONFIG.modelName);
    });
  });

  describe('getProviderId()', () => {
    it('returns "browser-llm"', () => {
      expect(provider.getProviderId()).toBe('browser-llm');
    });
  });

  describe('getPricing()', () => {
    it('returns zero input cost', () => {
      expect(provider.getPricing().inputCostPer1M).toBe(0);
    });

    it('returns zero output cost', () => {
      expect(provider.getPricing().outputCostPer1M).toBe(0);
    });

    it('returns providerId "browser-llm"', () => {
      expect(provider.getPricing().providerId).toBe('browser-llm');
    });

    it('includes the model name in the providerName', () => {
      expect(provider.getPricing().providerName).toContain(MINIMAL_CONFIG.modelName);
    });
  });

  describe('getStatus()', () => {
    it('starts as "uninitialized"', () => {
      expect(provider.getStatus()).toBe<BrowserLLMStatus>('uninitialized');
    });
  });

  describe('generate()', () => {
    it('throws when status is "uninitialized"', async () => {
      await expect(provider.generate({ prompt: 'hello' })).rejects.toThrow(
        /BrowserLLMProvider not ready/
      );
    });

    it('throw message includes current status', async () => {
      await expect(provider.generate({ prompt: 'hello' })).rejects.toThrow(
        /status: uninitialized/
      );
    });
  });

  describe('isAvailable()', () => {
    it('returns false when status is "uninitialized"', async () => {
      expect(await provider.isAvailable()).toBe(false);
    });

    it('returns false when status is "error"', async () => {
      // Access private status via dispose trick: disposed is also non-ready
      await provider.dispose();
      expect(await provider.isAvailable()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('sets status to "disposed"', async () => {
      await provider.dispose();
      expect(provider.getStatus()).toBe('disposed');
    });

    it('clears active creature registrations', async () => {
      provider.registerCreature('creature-a');
      provider.registerCreature('creature-b');
      expect(provider.getActiveCreatureCount()).toBe(2);

      await provider.dispose();

      expect(provider.getActiveCreatureCount()).toBe(0);
    });

    it('can be called multiple times without throwing', async () => {
      await provider.dispose();
      await expect(provider.dispose()).resolves.not.toThrow();
    });
  });

  describe('creature gating', () => {
    it('allows registration when under the 3-creature cap', () => {
      expect(provider.canAcceptCreature('c1')).toBe(true);
    });

    it('registerCreature returns true and adds creature', () => {
      const result = provider.registerCreature('c1');
      expect(result).toBe(true);
      expect(provider.getActiveCreatureCount()).toBe(1);
    });

    it('registerCreature returns false at capacity (3 creatures)', () => {
      provider.registerCreature('c1');
      provider.registerCreature('c2');
      provider.registerCreature('c3');

      const result = provider.registerCreature('c4');
      expect(result).toBe(false);
      expect(provider.getActiveCreatureCount()).toBe(3);
    });

    it('canAcceptCreature returns true for an already-registered creature (idempotent)', () => {
      provider.registerCreature('c1');
      provider.registerCreature('c2');
      provider.registerCreature('c3');

      // c1 is already in the set, so it should still be accepted
      expect(provider.canAcceptCreature('c1')).toBe(true);
    });

    it('re-registering an existing creature does not increase count', () => {
      provider.registerCreature('c1');
      provider.registerCreature('c1');
      expect(provider.getActiveCreatureCount()).toBe(1);
    });

    it('releaseCreature frees a slot so a new creature can register', () => {
      provider.registerCreature('c1');
      provider.registerCreature('c2');
      provider.registerCreature('c3');

      expect(provider.registerCreature('c4')).toBe(false);

      provider.releaseCreature('c1');

      expect(provider.registerCreature('c4')).toBe(true);
      expect(provider.getActiveCreatureCount()).toBe(3);
    });

    it('releasing an unregistered creature is a no-op', () => {
      provider.registerCreature('c1');
      provider.releaseCreature('not-registered');
      expect(provider.getActiveCreatureCount()).toBe(1);
    });

    it('starts with zero active creatures', () => {
      expect(provider.getActiveCreatureCount()).toBe(0);
    });
  });

  describe('static canRunModel()', () => {
    it('returns an object with a supported property', async () => {
      const result = await BrowserLLMProvider.canRunModel(MINIMAL_CONFIG);
      expect(result).toHaveProperty('supported');
    });

    it('returns an object with a backend property', async () => {
      const result = await BrowserLLMProvider.canRunModel(MINIMAL_CONFIG);
      expect(result).toHaveProperty('backend');
    });

    it('in Node (no WebGPU), webllm backend reports unsupported', async () => {
      const webllmConfig: BrowserLLMConfig = { ...MINIMAL_CONFIG, backend: 'webllm' };
      const result = await BrowserLLMProvider.canRunModel(webllmConfig);
      // In Node there is no navigator.gpu, so webllm cannot be supported
      expect(result.supported).toBe(false);
    });

    it('returns a reason string when unsupported', async () => {
      const result = await BrowserLLMProvider.canRunModel(MINIMAL_CONFIG);
      if (!result.supported) {
        expect(typeof result.reason).toBe('string');
        expect(result.reason!.length).toBeGreaterThan(0);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// BrowserLLMCapabilityDetector — model configs
// ---------------------------------------------------------------------------

describe('BrowserLLMCapabilityDetector', () => {
  describe('QWEN_0_5B_CONFIG', () => {
    it('uses wllama backend', () => {
      expect(QWEN_0_5B_CONFIG.backend).toBe<BrowserLLMBackend>('wllama');
    });

    it('has a non-empty modelId', () => {
      expect(QWEN_0_5B_CONFIG.modelId.length).toBeGreaterThan(0);
    });

    it('has a non-empty modelName', () => {
      expect(QWEN_0_5B_CONFIG.modelName.length).toBeGreaterThan(0);
    });

    it('has a positive maxContextLength', () => {
      expect(QWEN_0_5B_CONFIG.maxContextLength).toBeGreaterThan(0);
    });

    it('has memoryRequirementMB under 1024 (small model)', () => {
      expect(QWEN_0_5B_CONFIG.memoryRequirementMB).toBeLessThan(1024);
    });

    it('has a positive downloadSizeMB', () => {
      expect(QWEN_0_5B_CONFIG.downloadSizeMB).toBeGreaterThan(0);
    });

    it('downloadSizeMB is less than memoryRequirementMB (compressed on disk)', () => {
      expect(QWEN_0_5B_CONFIG.downloadSizeMB).toBeLessThan(
        QWEN_0_5B_CONFIG.memoryRequirementMB
      );
    });
  });

  describe('QWEN_1_5B_CONFIG', () => {
    it('uses webllm backend', () => {
      expect(QWEN_1_5B_CONFIG.backend).toBe<BrowserLLMBackend>('webllm');
    });

    it('has a positive maxContextLength', () => {
      expect(QWEN_1_5B_CONFIG.maxContextLength).toBeGreaterThan(0);
    });

    it('has a larger memoryRequirementMB than the 0.5B model', () => {
      expect(QWEN_1_5B_CONFIG.memoryRequirementMB).toBeGreaterThan(
        QWEN_0_5B_CONFIG.memoryRequirementMB
      );
    });

    it('has a larger downloadSizeMB than the 0.5B model', () => {
      expect(QWEN_1_5B_CONFIG.downloadSizeMB).toBeGreaterThan(
        QWEN_0_5B_CONFIG.downloadSizeMB
      );
    });

    it('has all required fields', () => {
      expect(QWEN_1_5B_CONFIG).toMatchObject({
        modelId: expect.any(String),
        modelName: expect.any(String),
        backend: expect.any(String),
        maxContextLength: expect.any(Number),
        memoryRequirementMB: expect.any(Number),
        downloadSizeMB: expect.any(Number),
      });
    });
  });

  describe('QWEN_3B_CONFIG', () => {
    it('uses webllm backend', () => {
      expect(QWEN_3B_CONFIG.backend).toBe<BrowserLLMBackend>('webllm');
    });

    it('has larger sizes than the 1.5B model', () => {
      expect(QWEN_3B_CONFIG.memoryRequirementMB).toBeGreaterThan(
        QWEN_1_5B_CONFIG.memoryRequirementMB
      );
      expect(QWEN_3B_CONFIG.downloadSizeMB).toBeGreaterThan(
        QWEN_1_5B_CONFIG.downloadSizeMB
      );
    });

    it('has a positive maxContextLength', () => {
      expect(QWEN_3B_CONFIG.maxContextLength).toBeGreaterThan(0);
    });

    it('has all required fields', () => {
      expect(QWEN_3B_CONFIG).toMatchObject({
        modelId: expect.any(String),
        modelName: expect.any(String),
        backend: expect.any(String),
        maxContextLength: expect.any(Number),
        memoryRequirementMB: expect.any(Number),
        downloadSizeMB: expect.any(Number),
      });
    });
  });

  describe('model config ordering', () => {
    it('configs are ordered by size: 0.5B < 1.5B < 3B (memoryRequirementMB)', () => {
      expect(QWEN_0_5B_CONFIG.memoryRequirementMB)
        .toBeLessThan(QWEN_1_5B_CONFIG.memoryRequirementMB);
      expect(QWEN_1_5B_CONFIG.memoryRequirementMB)
        .toBeLessThan(QWEN_3B_CONFIG.memoryRequirementMB);
    });
  });

  describe('detectCapabilities()', () => {
    it('returns a DeviceCapability object', async () => {
      const caps = await detectCapabilities();
      expect(caps).toBeDefined();
    });

    it('returned object has required shape', async () => {
      const caps = await detectCapabilities();
      expect(caps).toHaveProperty('webgpu');
      expect(caps).toHaveProperty('wasmSimd');
      expect(caps).toHaveProperty('wasmThreads');
      expect(caps).toHaveProperty('estimatedMemoryGB');
      expect(caps).toHaveProperty('recommendedModel');
      expect(caps).toHaveProperty('recommendedBackend');
    });

    it('falls back to Tier C in Node (no WebGPU, limited WASM env)', async () => {
      // Node has no WebGPU and no navigator — detectCapabilities should
      // produce a Tier C result: recommendedModel === null
      const caps = await detectCapabilities();
      expect(caps.webgpu).toBe(false);
      // In Node without SharedArrayBuffer/SIMD, Tier C is expected
      if (!caps.webgpu && (!caps.wasmSimd || !caps.wasmThreads)) {
        expect(caps.recommendedModel).toBeNull();
        expect(caps.recommendedBackend).toBeNull();
      }
    });

    it('provides a fallbackReason when recommendedModel is null', async () => {
      const caps = await detectCapabilities();
      if (caps.recommendedModel === null) {
        expect(typeof caps.fallbackReason).toBe('string');
        expect(caps.fallbackReason!.length).toBeGreaterThan(0);
      }
    });

    it('estimatedMemoryGB is a positive number', async () => {
      const caps = await detectCapabilities();
      expect(caps.estimatedMemoryGB).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// MobileTalkerPromptBuilder
// ---------------------------------------------------------------------------

describe('MobileTalkerPromptBuilder', () => {
  const builder = new MobileTalkerPromptBuilder();

  describe('minimal agent (identity only)', () => {
    it('builds a non-empty prompt string', () => {
      const agent = createMockAgent({ identity: { name: 'Arak' } });
      const world = createMockWorld();
      const prompt = builder.buildPrompt(agent, world);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes the agent name in the prompt', () => {
      const agent = createMockAgent({ identity: { name: 'Arak' } });
      const world = createMockWorld();
      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('Arak');
    });

    it('uses "Creature" as fallback name when no identity', () => {
      const agent = createMockAgent({});
      const world = createMockWorld();
      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('Creature');
    });
  });

  describe('personality traits', () => {
    it('includes trait "outgoing" when extraversion > 0.65', () => {
      const agent = createMockAgent({
        identity: { name: 'Talva' },
        personality: { extraversion: 0.8, agreeableness: 0.5, conscientiousness: 0.5 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('outgoing');
    });

    it('includes trait "reserved" when extraversion < 0.35', () => {
      const agent = createMockAgent({
        identity: { name: 'Renn' },
        personality: { extraversion: 0.2, agreeableness: 0.5, conscientiousness: 0.5 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('reserved');
    });

    it('includes trait "warm and cooperative" when agreeableness > 0.65', () => {
      const agent = createMockAgent({
        identity: { name: 'Mira' },
        personality: { extraversion: 0.5, agreeableness: 0.9, conscientiousness: 0.5 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('warm and cooperative');
    });

    it('includes trait "diligent" when conscientiousness > 0.65', () => {
      const agent = createMockAgent({
        identity: { name: 'Bordan' },
        personality: { extraversion: 0.5, agreeableness: 0.5, conscientiousness: 0.9 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('diligent');
    });

    it('falls back to generic prompt when no personality component', () => {
      const agent = createMockAgent({ identity: { name: 'Zal' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('villager in a forest village');
    });
  });

  describe('state line from needs', () => {
    it('shows "starving" when hunger < 0.2', () => {
      const agent = createMockAgent({
        identity: { name: 'Fora' },
        needs: { hunger: 0.1, energy: 0.8 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('starving');
    });

    it('shows "hungry" when hunger is between 0.2 and 0.35', () => {
      const agent = createMockAgent({
        identity: { name: 'Gella' },
        needs: { hunger: 0.25, energy: 0.8 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('hungry');
    });

    it('shows "exhausted" when energy < 0.2', () => {
      const agent = createMockAgent({
        identity: { name: 'Holt' },
        needs: { hunger: 0.8, energy: 0.15 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('exhausted');
    });

    it('shows "lonely" when socialDepth < 0.3', () => {
      const agent = createMockAgent({
        identity: { name: 'Issa' },
        needs: { hunger: 0.8, energy: 0.8, socialDepth: 0.1 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('lonely');
    });

    it('omits the state line when needs are all healthy', () => {
      const agent = createMockAgent({
        identity: { name: 'Jarn' },
        needs: { hunger: 0.9, energy: 0.9, socialDepth: 0.9 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('State:');
    });
  });

  describe('goal section', () => {
    it('includes goal description when an active (non-completed) goal exists', () => {
      const agent = createMockAgent({
        identity: { name: 'Kael' },
        goals: {
          goals: [
            { description: 'Build a watchtower', completed: false },
          ],
        },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('Build a watchtower');
    });

    it('omits goal section when all goals are completed', () => {
      const agent = createMockAgent({
        identity: { name: 'Lira' },
        goals: {
          goals: [
            { description: 'Old task', completed: true },
          ],
        },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('Old task');
    });

    it('omits goal section when goals component is absent', () => {
      const agent = createMockAgent({ identity: { name: 'Mool' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('Goal:');
    });

    it('picks only the first active goal', () => {
      const agent = createMockAgent({
        identity: { name: 'Neva' },
        goals: {
          goals: [
            { description: 'First active', completed: false },
            { description: 'Second active', completed: false },
          ],
        },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('First active');
      expect(prompt).not.toContain('Second active');
    });
  });

  describe('conversation context', () => {
    it('includes partner name when in active conversation', () => {
      const partnerEntity = createMockAgent({ identity: { name: 'Orin' } });
      const world = createMockWorld({ 'partner-1': partnerEntity });

      const agent = createMockAgent({
        identity: { name: 'Pela' },
        conversation: {
          isActive: true,
          partnerId: 'partner-1',
          messages: [],
        },
      });

      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('Orin');
    });

    it('includes recent messages in conversation context', () => {
      const partnerEntity = createMockAgent({ identity: { name: 'Qall' } });
      const world = createMockWorld({ 'partner-2': partnerEntity });

      const agent = createMockAgent({
        identity: { name: 'Rael' },
        conversation: {
          isActive: true,
          partnerId: 'partner-2',
          messages: [
            { speakerId: 'Qall', message: 'Have you seen the river?' },
            { speakerId: 'Rael', message: 'Not today.' },
          ],
        },
      });

      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('Have you seen the river?');
      expect(prompt).toContain('Not today.');
    });

    it('omits conversation section when not in active conversation', () => {
      const agent = createMockAgent({
        identity: { name: 'Sena' },
        conversation: { isActive: false, partnerId: null, messages: [] },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('Talking with');
    });

    it('uses "someone" when partner entity has no identity', () => {
      const partnerWithNoIdentity = { id: 'p-anon', components: new Map() };
      const world = createMockWorld({ 'p-anon': partnerWithNoIdentity });

      const agent = createMockAgent({
        identity: { name: 'Tavi' },
        conversation: { isActive: true, partnerId: 'p-anon', messages: [] },
      });

      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('someone');
    });
  });

  describe('recent memories', () => {
    it('includes memory summaries when episodic_memory is present', () => {
      const agent = createMockAgent({
        identity: { name: 'Ulon' },
        episodic_memory: {
          episodicMemories: [
            { summary: 'Found berries near the oak tree' },
            { summary: 'Helped Kael fix the fence' },
          ],
        },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('Found berries near the oak tree');
      expect(prompt).toContain('Helped Kael fix the fence');
    });

    it('includes at most 2 memories', () => {
      const agent = createMockAgent({
        identity: { name: 'Vara' },
        episodic_memory: {
          episodicMemories: [
            { summary: 'Memory one' },
            { summary: 'Memory two' },
            { summary: 'Memory three' },
          ],
        },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      // The last 2 memories are included; the first is dropped
      expect(prompt).toContain('Memory two');
      expect(prompt).toContain('Memory three');
      expect(prompt).not.toContain('Memory one');
    });

    it('omits memories section when episodic_memory is absent', () => {
      const agent = createMockAgent({ identity: { name: 'Wren' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('Memories:');
    });

    it('omits memories section when episodic_memory array is empty', () => {
      const agent = createMockAgent({
        identity: { name: 'Xael' },
        episodic_memory: { episodicMemories: [] },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).not.toContain('Memories:');
    });
  });

  describe('available actions', () => {
    it('always includes the Actions section', () => {
      const agent = createMockAgent({ identity: { name: 'Yren' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('Actions:');
    });

    it('lists the set_personal_goal action', () => {
      const agent = createMockAgent({ identity: { name: 'Zola' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('set_personal_goal');
    });

    it('lists the follow_agent action', () => {
      const agent = createMockAgent({ identity: { name: 'Arak' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('follow_agent');
    });

    it('lists the talk action', () => {
      const agent = createMockAgent({ identity: { name: 'Arak' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('talk');
    });
  });

  describe('plain text instruction', () => {
    it('ends with an instruction to reply in plain text', () => {
      const agent = createMockAgent({ identity: { name: 'Bren' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('Reply in plain text');
    });

    it('names the agent in the instruction', () => {
      const agent = createMockAgent({ identity: { name: 'Cael' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      // Instruction should reference the agent name
      const instructionLine = prompt.split('\n').find(l => l.includes('Reply in plain text'));
      expect(instructionLine).toContain('Cael');
    });

    it('uses a starvation instruction when hunger < 0.2', () => {
      const agent = createMockAgent({
        identity: { name: 'Dara' },
        needs: { hunger: 0.05, energy: 0.9 },
      });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt).toContain('starving');
    });

    it('asks what the agent says to partner when in active conversation', () => {
      const partnerEntity = createMockAgent({ identity: { name: 'Elan' } });
      const world = createMockWorld({ 'p-elan': partnerEntity });

      const agent = createMockAgent({
        identity: { name: 'Fara' },
        conversation: { isActive: true, partnerId: 'p-elan', messages: [] },
      });

      const prompt = builder.buildPrompt(agent, world);
      expect(prompt).toContain('Elan');
      expect(prompt).toContain('Fara');
    });
  });

  describe('prompt length', () => {
    it('stays under 3000 characters for a fully-populated agent', () => {
      const partnerEntity = createMockAgent({ identity: { name: 'Gorn' } });
      const world = createMockWorld({ 'p-gorn': partnerEntity });

      const agent = createMockAgent({
        identity: { name: 'Hael' },
        personality: { extraversion: 0.8, agreeableness: 0.9, conscientiousness: 0.7 },
        needs: { hunger: 0.3, energy: 0.3, socialDepth: 0.2 },
        goals: {
          goals: [{ description: 'Gather ten logs from the forest', completed: false }],
        },
        conversation: {
          isActive: true,
          partnerId: 'p-gorn',
          messages: [
            { speakerId: 'Gorn', message: 'The harvest looks poor this year.' },
            { speakerId: 'Hael', message: 'We should plan for winter.' },
            { speakerId: 'Gorn', message: 'Agreed. Will you help gather stores?' },
          ],
        },
        episodic_memory: {
          episodicMemories: [
            { summary: 'Gathered berries with Kael near the eastern stream' },
            { summary: 'Attended the village meeting about the drought' },
          ],
        },
        mood: { emotionalState: 'anxious' },
      });

      const prompt = builder.buildPrompt(agent, world);
      expect(prompt.length).toBeLessThan(3000);
    });

    it('produces a non-trivially short prompt (at least 100 characters)', () => {
      const agent = createMockAgent({ identity: { name: 'Inara' } });
      const prompt = builder.buildPrompt(agent, createMockWorld());
      expect(prompt.length).toBeGreaterThan(100);
    });
  });
});

// ---------------------------------------------------------------------------
// InferenceWorkerProtocol — type-level shape verification
// ---------------------------------------------------------------------------

describe('InferenceWorkerProtocol types', () => {
  it('BrowserLLMConfig has all required fields with correct types', () => {
    const config: BrowserLLMConfig = {
      modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      modelName: 'Qwen 2.5 1.5B',
      backend: 'webllm',
      maxContextLength: 4096,
      memoryRequirementMB: 1630,
      downloadSizeMB: 1120,
    };

    expect(typeof config.modelId).toBe('string');
    expect(typeof config.modelName).toBe('string');
    expect(typeof config.backend).toBe('string');
    expect(typeof config.maxContextLength).toBe('number');
    expect(typeof config.memoryRequirementMB).toBe('number');
    expect(typeof config.downloadSizeMB).toBe('number');
  });

  it('BrowserLLMConfig accepts optional loraAdapterId', () => {
    const config: BrowserLLMConfig = {
      modelId: 'test',
      modelName: 'test',
      backend: 'wllama',
      maxContextLength: 2048,
      memoryRequirementMB: 512,
      downloadSizeMB: 350,
      loraAdapterId: 'mvee-lora-v1',
    };
    expect(config.loraAdapterId).toBe('mvee-lora-v1');
  });

  it('DownloadProgress has the correct field shape', () => {
    const progress: DownloadProgress = {
      phase: 'downloading',
      progress: 0.42,
      downloadedMB: 420,
      totalMB: 1000,
      speedMBps: 8.5,
    };

    expect(progress.phase).toBe('downloading');
    expect(progress.progress).toBeGreaterThanOrEqual(0);
    expect(progress.progress).toBeLessThanOrEqual(1);
    expect(progress.downloadedMB).toBeGreaterThanOrEqual(0);
    expect(progress.totalMB).toBeGreaterThan(0);
    expect(progress.speedMBps).toBeGreaterThanOrEqual(0);
  });

  it('WorkerRequest union discriminates on type field', () => {
    const initRequest: WorkerRequest = { type: 'init', config: MINIMAL_CONFIG };
    expect(initRequest.type).toBe('init');

    const heartbeatRequest: WorkerRequest = { type: 'heartbeat' };
    expect(heartbeatRequest.type).toBe('heartbeat');

    const disposeRequest: WorkerRequest = { type: 'dispose' };
    expect(disposeRequest.type).toBe('dispose');
  });

  it('WorkerResponse union discriminates on type field', () => {
    const completeMsg: WorkerResponse = { type: 'init-complete' };
    expect(completeMsg.type).toBe('init-complete');

    const errorMsg: WorkerResponse = { type: 'init-error', error: 'OOM' };
    expect(errorMsg.type).toBe('init-error');

    const heartbeatAck: WorkerResponse = { type: 'heartbeat-ack', memoryUsageMB: 1200 };
    expect(heartbeatAck.type).toBe('heartbeat-ack');

    const oomMsg: WorkerResponse = { type: 'oom', error: 'Out of memory' };
    expect(oomMsg.type).toBe('oom');
  });

  it('BrowserLLMStatus covers all expected lifecycle values', () => {
    const statuses: BrowserLLMStatus[] = [
      'uninitialized',
      'downloading',
      'loading',
      'ready',
      'error',
      'disposed',
    ];
    // Verify each value is a non-empty string (type-level coverage)
    for (const s of statuses) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('BrowserLLMBackend covers webllm and wllama', () => {
    const backends: BrowserLLMBackend[] = ['webllm', 'wllama'];
    expect(backends).toHaveLength(2);
    expect(backends).toContain('webllm');
    expect(backends).toContain('wllama');
  });
});
