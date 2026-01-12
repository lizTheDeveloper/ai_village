import type { LLMProvider } from './LLMProvider.js';

/**
 * Types of capabilities that can be probed
 */
export type CapabilityType = 'tool_calling' | 'think_tags' | 'reasoning_field' | 'json_mode';

/**
 * A probe for testing a specific model capability
 */
export interface ModelCapabilityProbe {
  // What we're testing for
  capability: CapabilityType;

  // The probe to send
  testPrompt: string;

  // How to detect success
  successDetector: (response: any) => boolean;

  // Optional variant identifier (for think tags)
  variant?: string;
}

/**
 * Result of a single probe test
 */
export interface ProbeResult {
  capability: string;
  success: boolean;
  variant?: string;
  rawResponse?: string;
  error?: string;
}

/**
 * Discovered capabilities for a model
 */
export interface DiscoveredCapabilities {
  supportsToolCalling: boolean;
  toolCallingReliability: number; // 0-1 (tested with N probes)

  thinkingFormat: 'think_tags' | 'reasoning_field' | 'none';
  thinkingTagName?: string; // The actual tag name that worked

  supportsJsonMode: boolean;
  maxObservedTokens: number;

  // Probe results for debugging
  probeResults: ProbeResult[];
  discoveredAt: number; // timestamp
}

/**
 * Automated Model Capability Discovery system for probing unknown LLM models.
 *
 * Uses lightweight probes to detect:
 * - Tool calling support and reliability
 * - Thinking tag format (think, thinking, thoughts, reasoning, internal)
 * - Reasoning field support (Groq/Qwen style)
 * - JSON mode support
 *
 * Results are cached to avoid repeated probing.
 */
export class ModelCapabilityDiscovery {
  private discoveryCache = new Map<string, DiscoveredCapabilities>();

  // Standard thinking tag variants to try
  private thinkTagVariants = ['think', 'thinking', 'thoughts', 'reasoning', 'internal'];

  // Probe timeout (ms)
  private probeTimeout = 10000;

  /**
   * Run full discovery for a model
   */
  async discoverCapabilities(
    provider: LLMProvider,
    model: string
  ): Promise<DiscoveredCapabilities> {
    const startTime = Date.now();
    const probeResults: ProbeResult[] = [];
    let maxObservedTokens = 0;

    // Probe 1: Tool calling (run 3 times for reliability)
    const toolResults = await this.probeToolCallingReliability(provider);
    probeResults.push(...toolResults);

    const toolSuccesses = toolResults.filter((r) => r.success).length;
    const supportsToolCalling = toolSuccesses > 0;
    const toolCallingReliability = toolResults.length > 0 ? toolSuccesses / toolResults.length : 0;

    // Probe 2: Thinking tags (try all variants)
    const thinkResult = await this.probeThinkTags(provider, model);
    probeResults.push(thinkResult);

    // Probe 3: Reasoning field (Groq/Qwen style)
    const reasoningResult = await this.probeReasoningField(provider, model);
    probeResults.push(reasoningResult);

    // Determine thinking format
    let thinkingFormat: 'think_tags' | 'reasoning_field' | 'none' = 'none';
    let thinkingTagName: string | undefined;

    if (reasoningResult.success) {
      thinkingFormat = 'reasoning_field';
    } else if (thinkResult.success) {
      thinkingFormat = 'think_tags';
      thinkingTagName = thinkResult.variant;
    }

    // Probe 4: JSON mode
    const jsonResult = await this.probeJsonMode(provider, model);
    probeResults.push(jsonResult);

    // Track max observed tokens
    for (const result of probeResults) {
      if (result.rawResponse) {
        // Rough estimate: ~4 chars per token
        const estimatedTokens = result.rawResponse.length / 4;
        maxObservedTokens = Math.max(maxObservedTokens, estimatedTokens);
      }
    }

    const capabilities: DiscoveredCapabilities = {
      supportsToolCalling,
      toolCallingReliability,
      thinkingFormat,
      thinkingTagName,
      supportsJsonMode: jsonResult.success,
      maxObservedTokens: Math.floor(maxObservedTokens),
      probeResults,
      discoveredAt: startTime,
    };

    // Cache the results
    this.discoveryCache.set(model, capabilities);

    // Persist to localStorage if available
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`model_capabilities_${model}`, JSON.stringify(capabilities));
      } catch (error) {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
    }

    return capabilities;
  }

  /**
   * Get cached capabilities or run discovery
   */
  async getOrDiscoverCapabilities(
    provider: LLMProvider,
    model: string
  ): Promise<DiscoveredCapabilities> {
    // Check memory cache
    const cached = this.discoveryCache.get(model);
    if (cached) {
      return cached;
    }

    // Check localStorage cache
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`model_capabilities_${model}`);
        if (stored) {
          const capabilities = JSON.parse(stored) as DiscoveredCapabilities;
          this.discoveryCache.set(model, capabilities);
          return capabilities;
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }

    // No cache - run discovery
    return this.discoverCapabilities(provider, model);
  }

  /**
   * Clear cache for a model (or all models if not specified)
   */
  clearCache(model?: string): void {
    if (model) {
      this.discoveryCache.delete(model);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`model_capabilities_${model}`);
        } catch (error) {
          // Ignore localStorage errors
        }
      }
    } else {
      this.discoveryCache.clear();
      if (typeof localStorage !== 'undefined') {
        try {
          const keys = Object.keys(localStorage);
          for (const key of keys) {
            if (key.startsWith('model_capabilities_')) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Ignore localStorage errors
        }
      }
    }
  }

  /**
   * Probe tool calling reliability (run 3 times)
   */
  private async probeToolCallingReliability(provider: LLMProvider): Promise<ProbeResult[]> {
    const results: ProbeResult[] = [];

    for (let i = 0; i < 3; i++) {
      const result = await this.probeToolCalling(provider);
      results.push(result);
    }

    return results;
  }

  /**
   * Probe tool calling support
   */
  private async probeToolCalling(provider: LLMProvider): Promise<ProbeResult> {
    try {
      const response = await this.executeProbeWithTimeout(provider, {
        prompt: 'What is 2 + 2? Use the calculator tool.',
        maxTokens: 100,
      });

      // Check if response mentions tool usage or contains structured data
      const text = response.text.toLowerCase();
      const success =
        text.includes('calculator') ||
        text.includes('tool') ||
        text.includes('function') ||
        response.text.includes('"tool_calls"') ||
        response.text.includes('"function"');

      return {
        capability: 'tool_calling',
        success,
        rawResponse: response.text.substring(0, 500), // Truncate for storage
      };
    } catch (error) {
      return {
        capability: 'tool_calling',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Probe thinking tags (try all variants)
   */
  private async probeThinkTags(provider: LLMProvider, model: string): Promise<ProbeResult> {
    for (const tag of this.thinkTagVariants) {
      try {
        const response = await this.executeProbeWithTimeout(provider, {
          prompt: `Show your reasoning in <${tag}> tags, then answer: What is the capital of France? Format: <${tag}>reasoning here</${tag}> Answer: Paris`,
          maxTokens: 200,
        });

        // Check if response contains the tag
        const hasOpenTag = response.text.includes(`<${tag}>`);
        const hasCloseTag = response.text.includes(`</${tag}>`);

        if (hasOpenTag && hasCloseTag) {
          return {
            capability: 'think_tags',
            success: true,
            variant: tag,
            rawResponse: response.text.substring(0, 500),
          };
        }
      } catch (error) {
        // Try next variant
        continue;
      }
    }

    return {
      capability: 'think_tags',
      success: false,
      error: 'No thinking tag variant worked',
    };
  }

  /**
   * Probe reasoning field support (Groq/Qwen style)
   */
  private async probeReasoningField(provider: LLMProvider, model: string): Promise<ProbeResult> {
    try {
      const response = await this.executeProbeWithTimeout(provider, {
        prompt: 'What is 5 * 7? Show your reasoning.',
        maxTokens: 150,
      });

      // Check if response structure has a reasoning field
      // This is hard to detect from text output, so we check for patterns
      const text = response.text;
      const hasReasoningField =
        text.includes('"reasoning":') ||
        text.includes('reasoning:') ||
        text.includes('Reasoning:');

      return {
        capability: 'reasoning_field',
        success: hasReasoningField,
        rawResponse: text.substring(0, 500),
      };
    } catch (error) {
      return {
        capability: 'reasoning_field',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Probe JSON mode support
   */
  private async probeJsonMode(provider: LLMProvider, model: string): Promise<ProbeResult> {
    try {
      const response = await this.executeProbeWithTimeout(provider, {
        prompt:
          'Return a JSON object with keys "answer" and "reasoning" for: What is 3 + 3? Format as valid JSON only.',
        maxTokens: 150,
      });

      // Try to parse as JSON
      try {
        const trimmed = response.text.trim();
        // Try to extract JSON if wrapped in other text
        let jsonStr = trimmed;
        const jsonStart = trimmed.indexOf('{');
        const jsonEnd = trimmed.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(jsonStr);
        const hasExpectedKeys = 'answer' in parsed || 'reasoning' in parsed;

        return {
          capability: 'json_mode',
          success: hasExpectedKeys,
          rawResponse: response.text.substring(0, 500),
        };
      } catch (parseError) {
        return {
          capability: 'json_mode',
          success: false,
          rawResponse: response.text.substring(0, 500),
          error: 'Response not valid JSON',
        };
      }
    } catch (error) {
      return {
        capability: 'json_mode',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a probe with timeout
   */
  private async executeProbeWithTimeout(
    provider: LLMProvider,
    request: { prompt: string; maxTokens?: number }
  ): Promise<{ text: string }> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Probe timeout'));
      }, this.probeTimeout);

      try {
        const response = await provider.generate({
          prompt: request.prompt,
          maxTokens: request.maxTokens || 200,
          temperature: 0.1, // Low temperature for consistent probing
        });

        clearTimeout(timeoutId);
        resolve({ text: response.text });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const modelCapabilityDiscovery = new ModelCapabilityDiscovery();
