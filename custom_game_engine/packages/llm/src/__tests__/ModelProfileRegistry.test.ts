import { describe, it, expect, beforeEach } from 'vitest';
import { ModelProfileRegistry, type ModelProfile } from '../ModelProfileRegistry.js';

describe('ModelProfileRegistry', () => {
  let registry: ModelProfileRegistry;

  beforeEach(() => {
    registry = new ModelProfileRegistry();
  });

  describe('built-in profile matching', () => {
    it('should match Qwen 3 32B with specific pattern', () => {
      const profile = registry.getProfile('qwen/qwen3-32b');
      expect(profile.name).toBe('Qwen 3 32B');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.supportsReasoningField).toBe(true);
      expect(profile.preferredThinkingFormat).toBe('think_tags');
      expect(profile.thinkTagName).toBe('think');
      expect(profile.maxContextTokens).toBe(32768);
      expect(profile.maxOutputTokens).toBe(8192);
      expect(profile.inputCostPer1M).toBe(0.09);
      expect(profile.outputCostPer1M).toBe(0.09);
    });

    it('should match Qwen 3 32B case-insensitively', () => {
      const profile1 = registry.getProfile('QWEN/QWEN3-32B');
      const profile2 = registry.getProfile('Qwen/Qwen3-32B');
      const profile3 = registry.getProfile('qwen3-32b');

      expect(profile1.name).toBe('Qwen 3 32B');
      expect(profile2.name).toBe('Qwen 3 32B');
      expect(profile3.name).toBe('Qwen 3 32B');
    });

    it('should match GPT-5.2', () => {
      const profile = registry.getProfile('gpt-5.2');
      expect(profile.name).toBe('GPT-5.2');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
      expect(profile.preferredThinkingFormat).toBe('none');
      expect(profile.maxContextTokens).toBe(400000);
      expect(profile.inputCostPer1M).toBe(2.5);
    });

    it('should match Claude Sonnet 4.5', () => {
      const profile = registry.getProfile('claude-sonnet-4.5');
      expect(profile.name).toBe('Claude Sonnet 4.5');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.thinkTagName).toBe('thinking');
      expect(profile.systemPromptSuffix).toContain('thinking');
      expect(profile.maxContextTokens).toBe(200000);
    });

    it('should match Gemini 3 Pro', () => {
      const profile = registry.getProfile('gemini-3-pro');
      expect(profile.name).toBe('Gemini 3 Pro');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
      expect(profile.maxContextTokens).toBe(2000000);
    });

    it('should match Kimi K2', () => {
      const profile = registry.getProfile('kimi-k2');
      expect(profile.name).toBe('Kimi K2');
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.thinkTagName).toBe('think');
      expect(profile.maxContextTokens).toBe(128000);
    });

    it('should match Llama 3.3', () => {
      const profile = registry.getProfile('llama-3.3-70b');
      expect(profile.name).toBe('Llama 3.3');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
      expect(profile.maxContextTokens).toBe(128000);
    });

    it('should match DeepSeek V3', () => {
      const profile = registry.getProfile('deepseek-v3');
      expect(profile.name).toBe('DeepSeek V3');
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.supportsReasoningField).toBe(true);
      expect(profile.thinkTagName).toBe('think');
    });

    it('should match Mistral Large', () => {
      const profile = registry.getProfile('mistral-large-2');
      expect(profile.name).toBe('Mistral Large');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
    });
  });

  describe('generic fallback patterns', () => {
    it('should match generic Qwen for unknown Qwen variants', () => {
      const profile = registry.getProfile('qwen2-7b');
      expect(profile.name).toBe('Qwen (generic)');
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.thinkTagName).toBe('think');
    });

    it('should match generic GPT for unknown GPT variants', () => {
      const profile = registry.getProfile('gpt-4o');
      expect(profile.name).toBe('GPT (generic)');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
    });

    it('should match generic Claude for unknown Claude variants', () => {
      const profile = registry.getProfile('claude-3-opus');
      expect(profile.name).toBe('Claude (generic)');
      expect(profile.supportsThinkTags).toBe(true);
      expect(profile.thinkTagName).toBe('thinking');
    });

    it('should match generic Llama for unknown Llama variants', () => {
      const profile = registry.getProfile('llama-2-13b');
      expect(profile.name).toBe('Llama (generic)');
      expect(profile.supportsThinkTags).toBe(false);
    });
  });

  describe('pattern priority', () => {
    it('should match specific Qwen 3 32B pattern before generic Qwen', () => {
      const profile = registry.getProfile('qwen3-32b');
      expect(profile.name).toBe('Qwen 3 32B');
      expect(profile.maxOutputTokens).toBe(8192); // Specific profile
    });

    it('should match generic Qwen for other Qwen models', () => {
      const profile = registry.getProfile('qwen2-7b');
      expect(profile.name).toBe('Qwen (generic)');
      expect(profile.maxOutputTokens).toBe(4096); // Generic profile
    });

    it('should match specific Claude Sonnet 4.5 before generic Claude', () => {
      const profile = registry.getProfile('claude-sonnet-4.5');
      expect(profile.name).toBe('Claude Sonnet 4.5');
      expect(profile.maxOutputTokens).toBe(8192);
    });

    it('should match generic Claude for other Claude models', () => {
      const profile = registry.getProfile('claude-3-opus');
      expect(profile.name).toBe('Claude (generic)');
      expect(profile.maxOutputTokens).toBe(4096);
    });
  });

  describe('default fallback', () => {
    it('should return default profile for unknown models', () => {
      const profile = registry.getProfile('unknown-model-xyz');
      expect(profile.name).toBe('Unknown Model');
      expect(profile.supportsToolCalling).toBe(true);
      expect(profile.supportsThinkTags).toBe(false);
      expect(profile.preferredThinkingFormat).toBe('none');
    });

    it('should return default profile for empty string', () => {
      const profile = registry.getProfile('');
      expect(profile.name).toBe('Unknown Model');
    });

    it('should return default profile for random strings', () => {
      const profile1 = registry.getProfile('random-model-123');
      const profile2 = registry.getProfile('foo-bar-baz');

      expect(profile1.name).toBe('Unknown Model');
      expect(profile2.name).toBe('Unknown Model');
    });
  });

  describe('custom profile registration', () => {
    it('should register custom profile with higher priority', () => {
      const customProfile: ModelProfile = {
        name: 'Custom Model',
        modelPattern: /custom/i,
        supportsToolCalling: true,
        supportsThinkTags: true,
        supportsReasoningField: false,
        preferredThinkingFormat: 'think_tags',
        thinkTagName: 'custom_think',
        maxContextTokens: 50000,
        maxOutputTokens: 10000,
        inputCostPer1M: 0.5,
        outputCostPer1M: 1.0,
      };

      registry.registerProfile(customProfile);

      const profile = registry.getProfile('custom-model');
      expect(profile.name).toBe('Custom Model');
      expect(profile.thinkTagName).toBe('custom_think');
      expect(profile.maxContextTokens).toBe(50000);
    });

    it('should override built-in profiles when custom pattern matches first', () => {
      // Register a custom Qwen profile that matches all Qwen models
      const customQwenProfile: ModelProfile = {
        name: 'Custom Qwen',
        modelPattern: /qwen/i,
        supportsToolCalling: true,
        supportsThinkTags: false,
        supportsReasoningField: false,
        preferredThinkingFormat: 'none',
        maxContextTokens: 99999,
        maxOutputTokens: 9999,
        inputCostPer1M: 0.01,
        outputCostPer1M: 0.01,
      };

      registry.registerProfile(customQwenProfile);

      // Should match custom profile, not built-in Qwen 3 32B
      const profile = registry.getProfile('qwen3-32b');
      expect(profile.name).toBe('Custom Qwen');
      expect(profile.maxContextTokens).toBe(99999);
    });

    it('should throw error when think_tags format lacks thinkTagName', () => {
      const invalidProfile: ModelProfile = {
        name: 'Invalid Model',
        modelPattern: /invalid/i,
        supportsToolCalling: true,
        supportsThinkTags: true,
        supportsReasoningField: false,
        preferredThinkingFormat: 'think_tags',
        // Missing thinkTagName!
        maxContextTokens: 10000,
        maxOutputTokens: 1000,
        inputCostPer1M: 1.0,
        outputCostPer1M: 2.0,
      };

      expect(() => registry.registerProfile(invalidProfile)).toThrow(
        'uses think_tags but thinkTagName is not set'
      );
    });
  });

  describe('capability checks', () => {
    it('should check boolean capabilities correctly', () => {
      expect(registry.hasCapability('qwen3-32b', 'supportsToolCalling')).toBe(true);
      expect(registry.hasCapability('qwen3-32b', 'supportsThinkTags')).toBe(true);
      expect(registry.hasCapability('gpt-5.2', 'supportsThinkTags')).toBe(false);
    });

    it('should check string capabilities as truthy', () => {
      expect(registry.hasCapability('qwen3-32b', 'thinkTagName')).toBe(true);
      expect(registry.hasCapability('claude-sonnet-4.5', 'systemPromptSuffix')).toBe(true);
      expect(registry.hasCapability('gpt-5.2', 'systemPromptPrefix')).toBe(false);
    });

    it('should check number capabilities as truthy', () => {
      expect(registry.hasCapability('qwen3-32b', 'maxContextTokens')).toBe(true);
      expect(registry.hasCapability('unknown-model', 'maxOutputTokens')).toBe(true);
    });
  });

  describe('listProfiles', () => {
    it('should return all registered profiles', () => {
      const profiles = registry.listProfiles();
      expect(profiles.length).toBeGreaterThan(0);

      // Should include built-in profiles
      const profileNames = profiles.map(p => p.name);
      expect(profileNames).toContain('Qwen 3 32B');
      expect(profileNames).toContain('GPT-5.2');
      expect(profileNames).toContain('Claude Sonnet 4.5');
    });

    it('should include custom profiles in the list', () => {
      const customProfile: ModelProfile = {
        name: 'Test Model',
        modelPattern: /test/i,
        supportsToolCalling: true,
        supportsThinkTags: false,
        supportsReasoningField: false,
        preferredThinkingFormat: 'none',
        maxContextTokens: 10000,
        maxOutputTokens: 1000,
        inputCostPer1M: 0.1,
        outputCostPer1M: 0.2,
      };

      registry.registerProfile(customProfile);

      const profiles = registry.listProfiles();
      const profileNames = profiles.map(p => p.name);
      expect(profileNames).toContain('Test Model');
    });

    it('should return a copy of profiles array', () => {
      const profiles1 = registry.listProfiles();
      const profiles2 = registry.listProfiles();

      // Should be different array instances
      expect(profiles1).not.toBe(profiles2);
      // But same content
      expect(profiles1.length).toBe(profiles2.length);
    });
  });

  describe('default profile management', () => {
    it('should return default profile copy', () => {
      const defaultProfile = registry.getDefaultProfile();
      expect(defaultProfile.name).toBe('Unknown Model');

      // Modifying the returned profile should not affect the registry
      defaultProfile.name = 'Modified';
      const freshDefault = registry.getDefaultProfile();
      expect(freshDefault.name).toBe('Unknown Model');
    });

    it('should allow updating default profile', () => {
      const newDefault: ModelProfile = {
        name: 'New Default',
        modelPattern: /.*/,
        supportsToolCalling: false,
        supportsThinkTags: false,
        supportsReasoningField: false,
        preferredThinkingFormat: 'none',
        maxContextTokens: 1000,
        maxOutputTokens: 500,
        inputCostPer1M: 10.0,
        outputCostPer1M: 20.0,
      };

      registry.setDefaultProfile(newDefault);

      const unknownProfile = registry.getProfile('completely-unknown-model');
      expect(unknownProfile.name).toBe('New Default');
      expect(unknownProfile.maxContextTokens).toBe(1000);
    });
  });

  describe('clearProfiles', () => {
    it('should clear all profiles and reload built-ins', () => {
      // Register a custom profile
      const customProfile: ModelProfile = {
        name: 'Custom',
        modelPattern: /custom/i,
        supportsToolCalling: true,
        supportsThinkTags: false,
        supportsReasoningField: false,
        preferredThinkingFormat: 'none',
        maxContextTokens: 10000,
        maxOutputTokens: 1000,
        inputCostPer1M: 0.1,
        outputCostPer1M: 0.2,
      };

      registry.registerProfile(customProfile);

      // Verify custom profile is registered
      let profile = registry.getProfile('custom-model');
      expect(profile.name).toBe('Custom');

      // Clear profiles
      registry.clearProfiles();

      // Custom profile should be gone
      profile = registry.getProfile('custom-model');
      expect(profile.name).toBe('Unknown Model');

      // Built-in profiles should still work
      profile = registry.getProfile('qwen3-32b');
      expect(profile.name).toBe('Qwen 3 32B');
    });
  });

  describe('real-world model name patterns', () => {
    it('should match various Qwen naming conventions', () => {
      const variations = [
        'qwen/qwen3-32b',
        'qwen3-32b-instruct',
        'Qwen/Qwen3-32B',
        'qwen-3-32b',
      ];

      for (const modelName of variations) {
        const profile = registry.getProfile(modelName);
        expect(profile.name).toBe('Qwen 3 32B');
      }
    });

    it('should match various Claude naming conventions', () => {
      const sonnet45 = [
        'claude-sonnet-4.5',
        'anthropic/claude-sonnet-4.5',
        'Claude Sonnet 4.5',
      ];

      for (const modelName of sonnet45) {
        const profile = registry.getProfile(modelName);
        expect(profile.name).toBe('Claude Sonnet 4.5');
      }

      const genericClaude = [
        'claude-3-opus',
        'claude-2',
        'claude-instant',
      ];

      for (const modelName of genericClaude) {
        const profile = registry.getProfile(modelName);
        expect(profile.name).toBe('Claude (generic)');
      }
    });

    it('should match various Llama naming conventions', () => {
      const llama33 = [
        'llama-3.3-70b',
        'meta-llama/llama-3.3-70b',
        'Llama-3.3-8B',
      ];

      for (const modelName of llama33) {
        const profile = registry.getProfile(modelName);
        expect(profile.name).toBe('Llama 3.3');
      }

      const genericLlama = [
        'llama-2-7b',
        'llama-3.1-405b',
      ];

      for (const modelName of genericLlama) {
        const profile = registry.getProfile(modelName);
        expect(profile.name).toBe('Llama (generic)');
      }
    });
  });
});
