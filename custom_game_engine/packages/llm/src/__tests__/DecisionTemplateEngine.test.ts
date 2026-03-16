import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DecisionTemplateEngine,
  extractFeatures,
  BUILTIN_TEMPLATES,
  type DecisionTemplate,
  type TemplateFeatures,
} from '../DecisionTemplateEngine';
import { episodeLogger } from '../EpisodeLogger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake autonomic prompt with explicit need levels. */
function makeAutonomicPrompt(opts: {
  hunger?: number;
  energy?: number;
  thirst?: number;
  social?: number;
  foodNearby?: boolean;
  waterNearby?: boolean;
  isNight?: boolean;
  inConversation?: boolean;
} = {}): string {
  const hunger = opts.hunger ?? 0.2;
  const energy = opts.energy ?? 0.8;
  const thirst = opts.thirst ?? 0.1;
  const social = opts.social ?? 0.3;

  const hungerLabel = hunger > 0.60 ? 'very hungry' : hunger > 0.30 ? 'could eat' : 'satisfied';
  const energyLabel = energy < 0.10 ? 'exhausted' : energy < 0.30 ? 'tired' : 'rested';

  let prompt = `You are Alice, an agent in a village.
Current Situation:
- Hunger: ${Math.round(hunger * 100)}% (${hungerLabel})
- Energy: ${Math.round(energy * 100)}% (${energyLabel})
- Thirst: ${Math.round(thirst * 100)}% (low)
- Social: ${Math.round(social * 100)}% (moderate)
`;

  if (opts.foodNearby) {
    prompt += '- You can see berries and mushrooms nearby.\n';
  }
  if (opts.waterNearby) {
    prompt += '- There is a river to the north.\n';
  }
  if (opts.isNight) {
    prompt += '- It is midnight and the village is quiet.\n';
  }
  if (opts.inConversation) {
    prompt += '\nConversation history:\nBob: Hello there!\nYou: Hi Bob!\n';
  }
  return prompt;
}

// ---------------------------------------------------------------------------
// extractFeatures
// ---------------------------------------------------------------------------

describe('extractFeatures', () => {
  it('extracts hunger from percentage format', () => {
    const prompt = '- Hunger: 85% (very hungry)\n';
    const features = extractFeatures(prompt, 'autonomic');
    expect(features.hunger).toBeCloseTo(0.85, 2);
  });

  it('extracts energy from percentage format', () => {
    const prompt = '- Energy: 25% (tired)\n';
    const features = extractFeatures(prompt, 'autonomic');
    expect(features.energy).toBeCloseTo(0.25, 2);
  });

  it('extracts thirst', () => {
    const prompt = '- Thirst: 78% (very thirsty)\n';
    const features = extractFeatures(prompt, 'autonomic');
    expect(features.thirst).toBeCloseTo(0.78, 2);
  });

  it('detects food nearby from berry/mushroom keywords', () => {
    const features = extractFeatures(makeAutonomicPrompt({ foodNearby: true }), 'autonomic');
    expect(features.foodNearby).toBe(true);
  });

  it('detects water nearby from river keyword', () => {
    const features = extractFeatures(makeAutonomicPrompt({ waterNearby: true }), 'autonomic');
    expect(features.waterNearby).toBe(true);
  });

  it('detects active conversation', () => {
    const features = extractFeatures(makeAutonomicPrompt({ inConversation: true }), 'autonomic');
    expect(features.inConversation).toBe(true);
  });

  it('detects night', () => {
    const features = extractFeatures(makeAutonomicPrompt({ isNight: true }), 'autonomic');
    expect(features.isNight).toBe(true);
  });

  it('defaults missing fields to 0/false', () => {
    const features = extractFeatures('You are Bob.', 'executor');
    expect(features.hunger).toBe(0);
    expect(features.energy).toBe(0);
    expect(features.foodNearby).toBe(false);
    expect(features.inConversation).toBe(false);
    expect(features.nearbyAgentsCount).toBe(0);
  });

  it('passes layer through', () => {
    const features = extractFeatures('Some prompt', 'talker');
    expect(features.layer).toBe('talker');
  });
});

// ---------------------------------------------------------------------------
// BUILTIN_TEMPLATES ordering
// ---------------------------------------------------------------------------

describe('BUILTIN_TEMPLATES', () => {
  it('are sorted by descending priority', () => {
    for (let i = 1; i < BUILTIN_TEMPLATES.length; i++) {
      expect(BUILTIN_TEMPLATES[i - 1]!.priority).toBeGreaterThanOrEqual(BUILTIN_TEMPLATES[i]!.priority);
    }
  });

  it('all have unique ids', () => {
    const ids = BUILTIN_TEMPLATES.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all responseFactories return valid JSON', () => {
    const dummyFeatures: TemplateFeatures = {
      layer: 'autonomic', hunger: 0.5, energy: 0.5, thirst: 0.1, social: 0.2,
      nearbyAgentsCount: 0, inConversation: false, foodNearby: false,
      waterNearby: false, isNight: false,
    };
    for (const t of BUILTIN_TEMPLATES) {
      expect(() => JSON.parse(t.responseFactory(dummyFeatures))).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// DecisionTemplateEngine.match
// ---------------------------------------------------------------------------

describe('DecisionTemplateEngine', () => {
  let engine: DecisionTemplateEngine;

  beforeEach(() => {
    engine = DecisionTemplateEngine.getInstance();
    engine.clear();
    engine.setEnabled(true);
    engine.setABSampleRate(0); // Disable A/B by default in tests
    engine.setShadowLLMCall(null);
    episodeLogger.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('disabled state', () => {
    it('returns no match when disabled', async () => {
      engine.setEnabled(false);
      const prompt = makeAutonomicPrompt({ hunger: 0.95, foodNearby: true });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(false);
    });
  });

  describe('autonomic templates', () => {
    it('matches critical hunger + food nearby', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('autonomic_critical_hunger_food_nearby');
      expect(result.actionType).toBe('gather');
      const parsed = JSON.parse(result.response!);
      expect(parsed.action).toBe('gather');
    });

    it('does not match critical hunger template when hunger is moderate', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ hunger: 0.40, foodNearby: true });
      const result = engine.match(prompt, 'autonomic');
      // Should not match critical hunger template (hunger < 0.75 threshold)
      if (result.matched) {
        expect(result.templateId).not.toBe('autonomic_critical_hunger_food_nearby');
      }
    });

    it('matches exhaustion template when energy is very low', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ energy: 0.05, inConversation: false });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('autonomic_exhaustion_rest');
    });

    it('does not match autonomic templates for wrong layer', async () => {
      engine.setConfidenceThreshold('talker', 0.70);
      const prompt = makeAutonomicPrompt({ hunger: 0.90, foodNearby: true });
      // The critical hunger template only applies to 'autonomic' layer
      const result = engine.match(prompt, 'talker');
      if (result.matched) {
        expect(['talker_active_conversation', 'talker_nearby_agent_greet']).toContain(result.templateId);
      }
    });

    it('critical thirst + water matches', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ thirst: 0.80, waterNearby: true, hunger: 0.1 });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('autonomic_critical_thirst_water_nearby');
      expect(result.actionType).toBe('gather');
    });

    it('night + tired matches sleep template', async () => {
      engine.setConfidenceThreshold('autonomic', 0.60);
      const prompt = makeAutonomicPrompt({ energy: 0.20, isNight: true, inConversation: false });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('autonomic_tired_night_sleep');
    });
  });

  describe('talker templates', () => {
    it('matches active conversation', async () => {
      engine.setConfidenceThreshold('talker', 0.70);
      const prompt = makeAutonomicPrompt({ inConversation: true, hunger: 0.3, energy: 0.6 });
      const result = engine.match(prompt, 'talker');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('talker_active_conversation');
    });

    it('does not match active conversation if hunger is critical', async () => {
      engine.setConfidenceThreshold('talker', 0.70);
      const prompt = makeAutonomicPrompt({ inConversation: true, hunger: 0.90, energy: 0.6 });
      const result = engine.match(prompt, 'talker');
      if (result.matched) {
        // confidence should be low because high hunger fails the condition
        expect(result.confidence).toBeLessThan(1.0);
      }
    });
  });

  describe('confidence threshold', () => {
    it('returns no match when confidence below threshold', async () => {
      // Use a "moderate" scenario: hunger=0.60 is below the critical threshold (0.75)
      // so no template reaches full confidence. executor_idle_explore would score ~0.70
      // (hunger<0.40 fails), which is below 0.99.
      engine.setConfidenceThreshold('autonomic', 0.99);
      const prompt = makeAutonomicPrompt({ hunger: 0.60, energy: 0.60, thirst: 0.2 });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(false);
    });

    it('returns match when threshold lowered', async () => {
      engine.setConfidenceThreshold('autonomic', 0.40);
      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
    });
  });

  describe('custom templates', () => {
    it('can add and use a custom template', async () => {
      const custom: DecisionTemplate = {
        id: 'test_custom',
        name: 'Test Custom',
        layers: ['autonomic'],
        priority: 200, // Higher than all builtins
        actionType: 'research',
        conditions: [
          { feature: 'hunger', op: 'lt', value: 0.10, weight: 1.0 },
        ],
        responseFactory: () => JSON.stringify({ action: 'research', thinking: 'I am curious.' }),
      };
      engine.addTemplate(custom);

      engine.setConfidenceThreshold('autonomic', 0.90);
      const prompt = makeAutonomicPrompt({ hunger: 0.05 });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);
      expect(result.templateId).toBe('test_custom');
      expect(result.actionType).toBe('research');

      // Cleanup
      engine.removeTemplate('test_custom');
    });

    it('replaces existing template when same id added', () => {
      const original = engine.getTemplates().find(t => t.id === 'executor_idle_explore');
      const replacement: DecisionTemplate = {
        ...original!,
        name: 'Updated idle explore',
        priority: 1,
      };
      engine.addTemplate(replacement);
      const found = engine.getTemplates().find(t => t.id === 'executor_idle_explore');
      expect(found?.name).toBe('Updated idle explore');
    });

    it('removes templates by id', () => {
      engine.addTemplate({
        id: 'temp_remove_me',
        name: 'Temp',
        layers: ['autonomic'],
        priority: 1,
        actionType: 'pick',
        conditions: [],
        responseFactory: () => JSON.stringify({ action: 'pick' }),
      });
      expect(engine.getTemplates().some(t => t.id === 'temp_remove_me')).toBe(true);
      engine.removeTemplate('temp_remove_me');
      expect(engine.getTemplates().some(t => t.id === 'temp_remove_me')).toBe(false);
    });
  });

  describe('metrics', () => {
    it('tracks hits and misses', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);

      // Hit: all conditions for critical hunger met → confidence 1.0
      const hitPrompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(hitPrompt, 'autonomic');

      // Miss: moderate needs — hunger=0.60 fails critical threshold (0.75)
      // and partial idle-explore confidence (~0.70) is < 0.99 threshold
      engine.setConfidenceThreshold('autonomic', 0.99);
      const missPrompt = makeAutonomicPrompt({ hunger: 0.60, energy: 0.60, thirst: 0.2 });
      engine.match(missPrompt, 'autonomic');

      const metrics = engine.getMetrics();
      expect(metrics.templateHits).toBeGreaterThanOrEqual(1);
      expect(metrics.templateMisses).toBeGreaterThanOrEqual(1);
    });

    it('tracks hitsPerTemplate', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(prompt, 'autonomic');
      engine.match(prompt, 'autonomic');

      const metrics = engine.getMetrics();
      expect(metrics.hitsPerTemplate['autonomic_critical_hunger_food_nearby']).toBeGreaterThanOrEqual(2);
    });

    it('reports hitRate correctly', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const hitPrompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(hitPrompt, 'autonomic'); // hit
      engine.match(hitPrompt, 'autonomic'); // hit

      // Miss: moderate needs produce partial confidence (~0.70) which is below
      // the raised threshold of 0.99.
      engine.setConfidenceThreshold('autonomic', 0.99);
      const missPrompt = makeAutonomicPrompt({ hunger: 0.60, energy: 0.60, thirst: 0.2 });
      engine.match(missPrompt, 'autonomic'); // miss

      const metrics = engine.getMetrics();
      // 2 hits out of 3 total = ~0.667
      expect(metrics.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it('resets metrics on clear', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(prompt, 'autonomic');
      engine.clear();
      const metrics = engine.getMetrics();
      expect(metrics.templateHits).toBe(0);
      expect(metrics.templateMisses).toBe(0);
    });
  });

  describe('A/B shadow comparison', () => {
    it('calls shadow LLM when sample rate triggers', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      engine.setABSampleRate(1.0); // Always trigger A/B

      const shadowFn = vi.fn().mockResolvedValue(
        JSON.stringify({ action: 'gather', thinking: 'I need food.' })
      );
      engine.setShadowLLMCall(shadowFn);

      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      const result = engine.match(prompt, 'autonomic');
      expect(result.matched).toBe(true);

      // Wait for async shadow call
      await new Promise(r => setTimeout(r, 50));
      expect(shadowFn).toHaveBeenCalledTimes(1);
    });

    it('does not call shadow LLM when sample rate is 0', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      engine.setABSampleRate(0);

      const shadowFn = vi.fn().mockResolvedValue(
        JSON.stringify({ action: 'gather' })
      );
      engine.setShadowLLMCall(shadowFn);

      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(prompt, 'autonomic');

      await new Promise(r => setTimeout(r, 50));
      expect(shadowFn).not.toHaveBeenCalled();
    });

    it('counts quality drift when template and LLM disagree', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      engine.setABSampleRate(1.0);

      // Shadow LLM says 'build' — different from template's 'gather'
      engine.setShadowLLMCall(vi.fn().mockResolvedValue(
        JSON.stringify({ action: 'build', thinking: 'Different opinion.' })
      ));

      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(prompt, 'autonomic');
      await new Promise(r => setTimeout(r, 50));

      const metrics = engine.getMetrics();
      expect(metrics.abComparisons).toBe(1);
      expect(metrics.qualityDriftCount).toBe(1);
      expect(metrics.averageQualityDrift).toBe(1);
    });

    it('counts no drift when template and LLM agree', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      engine.setABSampleRate(1.0);

      // Shadow LLM agrees
      engine.setShadowLLMCall(vi.fn().mockResolvedValue(
        JSON.stringify({ action: 'gather', thinking: 'Same decision.' })
      ));

      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      engine.match(prompt, 'autonomic');
      await new Promise(r => setTimeout(r, 50));

      const metrics = engine.getMetrics();
      expect(metrics.abComparisons).toBe(1);
      expect(metrics.qualityDriftCount).toBe(0);
      expect(metrics.averageQualityDrift).toBe(0);
    });

    it('silently ignores shadow LLM errors', async () => {
      engine.setConfidenceThreshold('autonomic', 0.70);
      engine.setABSampleRate(1.0);
      engine.setShadowLLMCall(vi.fn().mockRejectedValue(new Error('LLM unavailable')));

      const prompt = makeAutonomicPrompt({ hunger: 0.85, foodNearby: true });
      // Should not throw — match() is synchronous, shadow error is swallowed async
      expect(() => engine.match(prompt, 'autonomic')).not.toThrow();
      await new Promise(r => setTimeout(r, 50));
    });
  });

  describe('analyzeTopDecisionPatterns', () => {
    it('returns top N action types from episode logger', () => {
      episodeLogger.log({ agentId: 'a1', layer: 'autonomic', promptHash: 'h1', promptLength: 10, actionType: 'gather', action: 'gather', durationMs: 50, cacheHit: false });
      episodeLogger.log({ agentId: 'a1', layer: 'autonomic', promptHash: 'h2', promptLength: 10, actionType: 'gather', action: 'gather', durationMs: 50, cacheHit: false });
      episodeLogger.log({ agentId: 'a1', layer: 'executor', promptHash: 'h3', promptLength: 10, actionType: 'build', action: 'build', durationMs: 100, cacheHit: false });

      const patterns = engine.analyzeTopDecisionPatterns(5);
      expect(patterns.length).toBeLessThanOrEqual(5);
      expect(patterns[0]?.actionType).toBe('gather');
      expect(patterns[0]?.count).toBe(2);
      expect(patterns[0]?.pct).toBeCloseTo(66.7, 0);
    });

    it('returns empty array when no episodes', () => {
      const patterns = engine.analyzeTopDecisionPatterns(10);
      expect(patterns).toEqual([]);
    });
  });
});
