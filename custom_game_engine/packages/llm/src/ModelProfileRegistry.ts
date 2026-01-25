/**
 * Model Profile Registry
 *
 * Captures model-specific behaviors, capabilities, and pricing for different LLM models.
 * Used by LLM providers to adapt prompts, response parsing, and features based on the model.
 */

import modelProfilesData from '../data/model-profiles.json';

/**
 * Raw model profile data from JSON (before RegExp conversion)
 */
interface ModelProfileData {
  name: string;
  modelPattern: string;
  patternFlags?: string;
  supportsToolCalling: boolean;
  supportsThinkTags: boolean;
  supportsReasoningField: boolean;
  preferredThinkingFormat: 'think_tags' | 'reasoning_field' | 'none';
  thinkTagName?: string;
  systemPromptPrefix?: string;
  systemPromptSuffix?: string;
  maxContextTokens: number;
  maxOutputTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

/**
 * Type definition for the model-profiles.json structure
 */
interface ModelProfilesData {
  defaultProfile: ModelProfileData;
  profiles: ModelProfileData[];
}

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
    // Load default profile from JSON
    const defaultData = modelProfilesData.defaultProfile as any;
    this.defaultProfile = {
      ...defaultData,
      modelPattern: new RegExp(defaultData.modelPattern, 'i')
    };

    // Register built-in profiles from JSON
    this.registerBuiltInProfiles();
  }

  /**
   * Register all built-in model profiles from JSON data.
   */
  private registerBuiltInProfiles(): void {
    const profiles = modelProfilesData.profiles as any[];

    // Profiles are already in the correct order in JSON (most specific first)
    for (const profileData of profiles) {
      const profile: ModelProfile = {
        name: profileData.name,
        modelPattern: new RegExp(profileData.modelPattern, profileData.patternFlags || 'i'),
        supportsToolCalling: profileData.supportsToolCalling,
        supportsThinkTags: profileData.supportsThinkTags,
        supportsReasoningField: profileData.supportsReasoningField,
        preferredThinkingFormat: profileData.preferredThinkingFormat,
        thinkTagName: profileData.thinkTagName,
        systemPromptPrefix: profileData.systemPromptPrefix,
        systemPromptSuffix: profileData.systemPromptSuffix,
        maxContextTokens: profileData.maxContextTokens,
        maxOutputTokens: profileData.maxOutputTokens,
        inputCostPer1M: profileData.inputCostPer1M,
        outputCostPer1M: profileData.outputCostPer1M
      };
      this.profiles.push(profile);
    }
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
