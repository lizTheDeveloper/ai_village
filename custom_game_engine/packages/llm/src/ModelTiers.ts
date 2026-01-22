/**
 * Model Intelligence Tiers
 *
 * Categorizes LLM models by intelligence/capability level.
 * Rate limits are per-model, so using multiple models maximizes bandwidth.
 *
 * Tiers:
 * - "simple": Local models (fast, low intelligence)
 * - "default": 20-32B parameter models (balanced)
 * - "high": 100B+ parameter models (high intelligence)
 * - "agi": Frontier models - Anthropic Sonnet/Opus, OpenAI GPT-5.2 (highest intelligence)
 */

export type IntelligenceTier = 'simple' | 'default' | 'high' | 'agi';

export interface ModelConfig {
  id: string;              // Model ID as used in API
  provider: 'groq' | 'cerebras' | 'ollama' | 'openai' | 'anthropic';
  tier: IntelligenceTier;
  rpm: number;             // Requests per minute limit
  contextWindow?: number;  // Max context tokens
  description?: string;
}

/**
 * Available models organized by tier
 *
 * From Groq (1K RPM each):
 * - qwen/qwen3-32b: default tier
 * - openai/gpt-oss-120b: high tier
 * - openai/gpt-oss-20b: default tier
 *
 * From Cerebras (30 RPM each):
 * - qwen-3-32b: default tier
 * - gpt-oss-120b: high tier
 *
 * Excluded per user request: llama, allam-2-7b, kimi-k2, zai-glm-4.7
 */
export const MODEL_CONFIGS: ModelConfig[] = [
  // === GROQ MODELS (1K RPM each) ===
  {
    id: 'qwen/qwen3-32b',
    provider: 'groq',
    tier: 'default',
    rpm: 1000,
    contextWindow: 32768,
    description: 'Qwen 32B on Groq - balanced intelligence',
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    tier: 'high',
    rpm: 1000,
    contextWindow: 65536,
    description: 'GPT-OSS 120B on Groq - highest intelligence',
  },
  {
    id: 'openai/gpt-oss-20b',
    provider: 'groq',
    tier: 'default',
    rpm: 1000,
    contextWindow: 65536,
    description: 'GPT-OSS 20B on Groq - balanced intelligence',
  },

  // === CEREBRAS MODELS (30 RPM each) - Fallback only ===
  {
    id: 'qwen-3-32b',
    provider: 'cerebras',
    tier: 'default',
    rpm: 30,
    contextWindow: 65536,
    description: 'Qwen 32B on Cerebras - fallback',
  },
  {
    id: 'gpt-oss-120b',
    provider: 'cerebras',
    tier: 'high',
    rpm: 30,
    contextWindow: 65536,
    description: 'GPT-OSS 120B on Cerebras - fallback',
  },

  // === LOCAL MODELS (simple tier) ===
  {
    id: 'qwen3:4b',
    provider: 'ollama',
    tier: 'simple',
    rpm: 120,
    contextWindow: 8192,
    description: 'Qwen 4B local - fast but simple',
  },
  {
    id: 'mlx-community/Qwen3-4B-Instruct-4bit',
    provider: 'ollama', // MLX uses same pattern
    tier: 'simple',
    rpm: 120,
    contextWindow: 8192,
    description: 'Qwen 4B MLX local - fast but simple',
  },
];

/**
 * Get all models for a specific tier
 */
export function getModelsForTier(tier: IntelligenceTier): ModelConfig[] {
  return MODEL_CONFIGS.filter(m => m.tier === tier);
}

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: string): ModelConfig[] {
  return MODEL_CONFIGS.filter(m => m.provider === provider);
}

/**
 * Get the primary model for a tier (highest RPM)
 */
export function getPrimaryModelForTier(tier: IntelligenceTier): ModelConfig | undefined {
  const models = getModelsForTier(tier);
  return models.sort((a, b) => b.rpm - a.rpm)[0];
}

/**
 * Get total RPM capacity for a tier (sum of all models)
 */
export function getTotalRPMForTier(tier: IntelligenceTier): number {
  return getModelsForTier(tier).reduce((sum, m) => sum + m.rpm, 0);
}

/**
 * Default model for each tier
 */
export const DEFAULT_MODELS: Record<IntelligenceTier, string> = {
  simple: 'qwen3:4b',
  default: 'qwen/qwen3-32b',
  high: 'openai/gpt-oss-120b',
  agi: 'claude-3-5-sonnet-20241022', // Not configured - requires Anthropic API key
};

/**
 * Get model config by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find(m => m.id === modelId);
}

/**
 * Infer tier from model ID
 */
export function inferTierFromModel(modelId: string): IntelligenceTier {
  const config = getModelConfig(modelId);
  if (config) return config.tier;

  // Fallback inference by size
  if (modelId.includes('120b') || modelId.includes('100b') || modelId.includes('70b')) {
    return 'high';
  }
  if (modelId.includes('4b') || modelId.includes('7b') || modelId.includes('8b')) {
    return 'simple';
  }
  return 'default';
}
