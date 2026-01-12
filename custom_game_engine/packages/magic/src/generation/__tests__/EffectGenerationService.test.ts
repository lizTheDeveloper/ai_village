/**
 * Tests for EffectGenerationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EffectGenerationService } from '../EffectGenerationService.js';
import type { LLMProvider, LLMRequest, LLMResponse } from '@ai-village/llm';
import type { EffectExpression } from '../../EffectExpression.js';

// Mock LLM Provider
class MockLLMProvider implements LLMProvider {
  public lastRequest: LLMRequest | null = null;
  public mockResponse: string = '';
  public mockError: Error | null = null;
  public mockInputTokens: number = 100;
  public mockOutputTokens: number = 50;
  public mockCostUSD: number = 0.001;

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.lastRequest = request;

    if (this.mockError) {
      throw this.mockError;
    }

    return {
      text: this.mockResponse,
      inputTokens: this.mockInputTokens,
      outputTokens: this.mockOutputTokens,
      costUSD: this.mockCostUSD,
      stopReason: 'end_turn',
    };
  }

  getModelName(): string {
    return 'mock-model';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing() {
    return {
      providerId: 'mock',
      providerName: 'Mock Provider',
      inputCostPer1M: 1.0,
      outputCostPer1M: 2.0,
    };
  }

  getProviderId(): string {
    return 'mock';
  }
}

describe('EffectGenerationService', () => {
  let service: EffectGenerationService;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    service = new EffectGenerationService(mockProvider);
  });

  describe('generate', () => {
    it('should generate a simple damage spell', async () => {
      // Mock LLM response with valid JSON
      const validEffect: EffectExpression = {
        name: 'Fireball',
        description: 'Launches a ball of fire',
        target: {
          type: 'area',
          radius: 10,
        },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: 50,
          },
        ],
        timing: {
          type: 'immediate',
        },
      };

      mockProvider.mockResponse = JSON.stringify(validEffect, null, 2);

      const result = await service.generate({
        spellName: 'Fireball',
        description: 'Launch a ball of fire',
        targetType: 'area',
        intendedPowerLevel: 'moderate',
      });

      expect(result.success).toBe(true);
      expect(result.effect).toBeDefined();
      expect(result.effect?.name).toBe('Fireball');
      expect(result.effect?.operations).toHaveLength(1);
      expect(result.tokensUsed).toBe(150);
      expect(result.costUSD).toBe(0.001);
      expect(result.provider).toBe('mock');
    });

    it('should parse JSON from markdown code block', async () => {
      const validEffect: EffectExpression = {
        name: 'Ice Blast',
        description: 'Freezes enemies',
        target: { type: 'single' },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'ice',
            amount: 30,
          },
        ],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = `Here's the effect:

\`\`\`json
${JSON.stringify(validEffect, null, 2)}
\`\`\`

This should work!`;

      const result = await service.generate({
        spellName: 'Ice Blast',
        description: 'Freeze an enemy',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Ice Blast');
    });

    it('should extract JSON from mixed text', async () => {
      const validEffect: EffectExpression = {
        name: 'Heal',
        description: 'Restores health',
        target: { type: 'self' },
        operations: [
          {
            op: 'heal',
            amount: 50,
          },
        ],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = `Sure, here's what you need: ${JSON.stringify(
        validEffect
      )} Let me know if you need changes.`;

      const result = await service.generate({
        spellName: 'Heal',
        description: 'Restore health',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Heal');
    });

    it('should handle parse errors gracefully', async () => {
      mockProvider.mockResponse = 'This is not valid JSON at all!';

      const result = await service.generate({
        spellName: 'Invalid',
        description: 'Should fail to parse',
      });

      expect(result.success).toBe(false);
      expect(result.parseError).toBe('Failed to parse JSON from LLM response');
      expect(result.rawResponse).toBe('This is not valid JSON at all!');
    });

    it('should handle LLM errors gracefully', async () => {
      mockProvider.mockError = new Error('Network timeout');

      const result = await service.generate({
        spellName: 'Timeout',
        description: 'Should fail',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should include paradigm hint in prompt', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Divine Light',
        description: 'Holy spell',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Divine Light',
        description: 'Holy spell',
        paradigm: 'divine',
      });

      expect(mockProvider.lastRequest?.prompt).toContain('PARADIGM: Divine');
    });

    it('should include power level hint in prompt', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Weak Bolt',
        description: 'Small damage',
        target: { type: 'single' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Weak Bolt',
        description: 'Small damage',
        intendedPowerLevel: 'weak',
      });

      expect(mockProvider.lastRequest?.prompt).toContain('POWER LEVEL: Weak');
      expect(mockProvider.lastRequest?.prompt).toContain('damage ~10-30');
    });

    it('should include target type hint in prompt', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Area Blast',
        description: 'Large explosion',
        target: { type: 'area', radius: 15 },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Area Blast',
        description: 'Large explosion',
        targetType: 'area',
      });

      expect(mockProvider.lastRequest?.prompt).toContain('TARGET: Area');
    });

    it('should set default temperature and maxTokens', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(mockProvider.lastRequest?.temperature).toBe(0.7);
      expect(mockProvider.lastRequest?.maxTokens).toBe(2000);
    });

    it('should allow custom temperature and maxTokens', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Test',
        description: 'Test',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockProvider.lastRequest?.temperature).toBe(0.5);
      expect(mockProvider.lastRequest?.maxTokens).toBe(1000);
    });

    it('should handle complex effect with expressions', async () => {
      const complexEffect: EffectExpression = {
        name: 'Scaling Fireball',
        description: 'Damage scales with intelligence',
        target: { type: 'area', radius: 10 },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'fire',
            amount: {
              op: '+',
              left: 20,
              right: {
                op: '*',
                left: 'caster.intelligence',
                right: 2,
              },
            },
          },
        ],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = JSON.stringify(complexEffect, null, 2);

      const result = await service.generate({
        spellName: 'Scaling Fireball',
        description: 'Damage increases with intelligence',
      });

      expect(result.success).toBe(true);
      expect(result.effect).toBeDefined();
      const damageOp = result.effect?.operations[0];
      expect(damageOp?.op).toBe('deal_damage');
      if (damageOp?.op === 'deal_damage') {
        expect(typeof damageOp.amount).toBe('object');
      }
    });

    it('should handle multiple operations', async () => {
      const multiOpEffect: EffectExpression = {
        name: 'Frost Nova',
        description: 'Damage and freeze',
        target: { type: 'area', radius: 15 },
        operations: [
          {
            op: 'deal_damage',
            damageType: 'ice',
            amount: 40,
          },
          {
            op: 'apply_status',
            status: 'frozen',
            duration: 5,
            stacks: 1,
          },
        ],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = JSON.stringify(multiOpEffect, null, 2);

      const result = await service.generate({
        spellName: 'Frost Nova',
        description: 'Freeze and damage enemies',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.operations).toHaveLength(2);
      expect(result.effect?.operations[0].op).toBe('deal_damage');
      expect(result.effect?.operations[1].op).toBe('apply_status');
    });
  });

  describe('prompt building', () => {
    it('should include spell name and description in prompt', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Lightning Bolt',
        description: 'Strike enemies with lightning',
      });

      expect(mockProvider.lastRequest?.prompt).toContain('Lightning Bolt');
      expect(mockProvider.lastRequest?.prompt).toContain('Strike enemies with lightning');
    });

    it('should include schema documentation', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      const prompt = mockProvider.lastRequest?.prompt || '';
      expect(prompt).toContain('EffectExpression');
      expect(prompt).toContain('deal_damage');
      expect(prompt).toContain('heal');
      expect(prompt).toContain('CONSTRAINTS');
    });

    it('should include examples', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      const prompt = mockProvider.lastRequest?.prompt || '';
      expect(prompt).toContain('EXAMPLES:');
      expect(prompt).toContain('Magic Missile');
      expect(prompt).toContain('Frost Nova');
      expect(prompt).toContain('Stone Skin');
    });

    it('should include security constraints', async () => {
      mockProvider.mockResponse = JSON.stringify({
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      });

      await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      const prompt = mockProvider.lastRequest?.prompt || '';
      expect(prompt).toContain('Damage cap: 10000');
      expect(prompt).toContain('Spawn cap: 50');
      expect(prompt).toContain('Maximum 10 operations');
    });
  });

  describe('response parsing', () => {
    it('should parse plain JSON', async () => {
      const effect = {
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = JSON.stringify(effect);

      const result = await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Test');
    });

    it('should parse JSON with extra whitespace', async () => {
      const effect = {
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = `\n\n  ${JSON.stringify(effect)}  \n\n`;

      const result = await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Test');
    });

    it('should parse JSON in markdown code block without language', async () => {
      const effect = {
        name: 'Test',
        description: 'Test',
        target: { type: 'self' },
        operations: [],
        timing: { type: 'immediate' },
      };

      mockProvider.mockResponse = `\`\`\`\n${JSON.stringify(effect, null, 2)}\n\`\`\``;

      const result = await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.effect?.name).toBe('Test');
    });

    it('should fail gracefully on malformed JSON', async () => {
      mockProvider.mockResponse = '{ "name": "Test", "invalid": }';

      const result = await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.parseError).toBeDefined();
    });

    it('should fail gracefully on non-JSON response', async () => {
      mockProvider.mockResponse = 'I cannot generate that spell.';

      const result = await service.generate({
        spellName: 'Test',
        description: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.parseError).toBeDefined();
    });
  });
});
