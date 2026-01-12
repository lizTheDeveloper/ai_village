/**
 * Model Profile Registry
 *
 * Captures model-specific behaviors, capabilities, and pricing for different LLM models.
 * Used by LLM providers to adapt prompts, response parsing, and features based on the model.
 */

/**
 * Model profile describing model-specific capabilities and behaviors
 */
export interface ModelProfile {
  // Identification
  name: string;              // Human-readable name (e.g., "Qwen 3 32B")
  modelPattern: RegExp;      // Pattern to match model names (e.g., /qwen.*3.*32b/i)

  // Capabilities
  supportsToolCalling: boolean;
  supportsThinkTags: boolean;      // <think>...</think>
  supportsReasoningField: boolean; // message.reasoning (Groq/Qwen)

  // Response format preferences
  preferredThinkingFormat: 'think_tags' | 'reasoning_field' | 'none';
  thinkTagName?: string;           // The tag name if using think tags (default: 'think')

  // System prompt adjustments
  systemPromptPrefix?: string;
  systemPromptSuffix?: string;

  // Token limits
  maxContextTokens: number;
  maxOutputTokens: number;

  // Pricing (per 1M tokens in USD)
  inputCostPer1M: number;
  outputCostPer1M: number;
}

/**
 * Registry of model profiles for different LLM models.
 * Profiles are matched in order, so more specific patterns should come first.
 */
export class ModelProfileRegistry {
  private profiles: ModelProfile[] = [];
  private defaultProfile: ModelProfile;

  constructor() {
    // Default fallback profile for unknown models
    this.defaultProfile = {
      name: 'Unknown Model',
      modelPattern: /.*/,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 32768,
      maxOutputTokens: 4096,
      inputCostPer1M: 1.0,
      outputCostPer1M: 2.0,
    };

    // Register built-in profiles (order matters - more specific first)
    this.registerBuiltInProfiles();
  }

  /**
   * Register all built-in model profiles.
   * Profiles are registered in reverse order (generic first, specific last)
   * because registerProfile() adds to the front of the array.
   * This ensures specific patterns are checked before generic ones.
   */
  private registerBuiltInProfiles(): void {
    // Register in REVERSE order - generic first, specific last
    // Because registerProfile() adds to front, this ensures specific patterns match first

    // Generic Llama fallback
    this.registerProfile({
      name: 'Llama (generic)',
      modelPattern: /llama/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      inputCostPer1M: 0.06,
      outputCostPer1M: 0.06,
    });

    // Generic Claude fallback
    this.registerProfile({
      name: 'Claude (generic)',
      modelPattern: /claude/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: false,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'thinking',
      maxContextTokens: 200000,
      maxOutputTokens: 4096,
      inputCostPer1M: 3.0,
      outputCostPer1M: 15.0,
    });

    // Generic GPT fallback
    this.registerProfile({
      name: 'GPT (generic)',
      modelPattern: /gpt/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      inputCostPer1M: 1.0,
      outputCostPer1M: 2.0,
    });

    // Generic Qwen fallback (catches any Qwen model not matched above)
    this.registerProfile({
      name: 'Qwen (generic)',
      modelPattern: /qwen/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: true,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'think',
      maxContextTokens: 32768,
      maxOutputTokens: 4096,
      inputCostPer1M: 0.09,
      outputCostPer1M: 0.09,
    });

    // Mistral Large (fast)
    this.registerProfile({
      name: 'Mistral Large',
      modelPattern: /mistral.*large/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 128000,
      maxOutputTokens: 8192,
      inputCostPer1M: 2.0,
      outputCostPer1M: 6.0,
    });

    // DeepSeek V3 (similar to Qwen)
    this.registerProfile({
      name: 'DeepSeek V3',
      modelPattern: /deepseek.*v3/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: true,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'think',
      maxContextTokens: 64000,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.27,
      outputCostPer1M: 1.1,
    });

    // Llama 3.3 (local-friendly) - SPECIFIC before generic Llama
    this.registerProfile({
      name: 'Llama 3.3',
      modelPattern: /llama[-_]?3[._]3/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 128000,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.06,
      outputCostPer1M: 0.06,
    });

    // Kimi K2 (1T MoE)
    this.registerProfile({
      name: 'Kimi K2',
      modelPattern: /kimi.*k2/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: false,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'think',
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      inputCostPer1M: 0.5,
      outputCostPer1M: 2.0,
    });

    // Gemini 3 Pro (multimodal)
    this.registerProfile({
      name: 'Gemini 3 Pro',
      modelPattern: /gemini.*3.*pro/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 2000000,
      maxOutputTokens: 8192,
      inputCostPer1M: 1.25,
      outputCostPer1M: 5.0,
    });

    // Claude Sonnet 4.5 (best coding) - SPECIFIC before generic Claude
    this.registerProfile({
      name: 'Claude Sonnet 4.5',
      modelPattern: /claude[-_\s]?sonnet[-_\s]?4[._\s]5/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: false,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'thinking',
      systemPromptSuffix: '\n\nYou may use <thinking>...</thinking> tags for extended reasoning.',
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      inputCostPer1M: 3.0,
      outputCostPer1M: 15.0,
    });

    // GPT-5.2 (latest OpenAI)
    this.registerProfile({
      name: 'GPT-5.2',
      modelPattern: /gpt-5\.2/i,
      supportsToolCalling: true,
      supportsThinkTags: false,
      supportsReasoningField: false,
      preferredThinkingFormat: 'none',
      maxContextTokens: 400000,
      maxOutputTokens: 16384,
      inputCostPer1M: 2.5,
      outputCostPer1M: 10.0,
    });

    // Qwen 3 32B (default model) - MOST SPECIFIC, registered LAST so it's checked FIRST
    this.registerProfile({
      name: 'Qwen 3 32B',
      modelPattern: /qwen[-_]?3[-_.]?32b/i,
      supportsToolCalling: true,
      supportsThinkTags: true,
      supportsReasoningField: true,
      preferredThinkingFormat: 'think_tags',
      thinkTagName: 'think',
      maxContextTokens: 32768,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.09,
      outputCostPer1M: 0.09,
    });
  }

  /**
   * Get the model profile for a given model name.
   * Returns the first matching profile, or the default if no match.
   *
   * @param modelName - The model name to match (case-insensitive)
   * @returns The matching model profile
   */
  getProfile(modelName: string): ModelProfile {
    // Try to find a matching profile (first match wins)
    for (const profile of this.profiles) {
      if (profile.modelPattern.test(modelName)) {
        return profile;
      }
    }

    // No match - return default
    return this.defaultProfile;
  }

  /**
   * Register a custom model profile.
   * The profile is added to the front of the list (highest priority).
   *
   * @param profile - The model profile to register
   */
  registerProfile(profile: ModelProfile): void {
    // Validate thinkTagName is provided when using think_tags
    if (profile.preferredThinkingFormat === 'think_tags' && !profile.thinkTagName) {
      throw new Error(`Profile "${profile.name}" uses think_tags but thinkTagName is not set`);
    }

    // Add to front of list (higher priority than built-ins)
    this.profiles.unshift(profile);
  }

  /**
   * List all registered profiles (built-in and custom).
   *
   * @returns Array of all registered profiles
   */
  listProfiles(): ModelProfile[] {
    return [...this.profiles];
  }

  /**
   * Check if a model has a specific capability.
   *
   * @param modelName - The model name to check
   * @param capability - The capability to check for
   * @returns True if the model has the capability
   */
  hasCapability(modelName: string, capability: keyof ModelProfile): boolean {
    const profile = this.getProfile(modelName);
    const value = profile[capability];

    // For boolean capabilities, return the value
    if (typeof value === 'boolean') {
      return value;
    }

    // For other types, check if they exist and are truthy
    return !!value;
  }

  /**
   * Get the default profile used for unknown models.
   *
   * @returns The default model profile
   */
  getDefaultProfile(): ModelProfile {
    return { ...this.defaultProfile };
  }

  /**
   * Update the default profile for unknown models.
   *
   * @param profile - The new default profile
   */
  setDefaultProfile(profile: ModelProfile): void {
    this.defaultProfile = profile;
  }

  /**
   * Clear all registered profiles (except default).
   * Useful for testing or resetting to built-in profiles only.
   */
  clearProfiles(): void {
    this.profiles = [];
    this.registerBuiltInProfiles();
  }
}

// Export singleton instance for shared use across the application
export const modelProfileRegistry = new ModelProfileRegistry();
