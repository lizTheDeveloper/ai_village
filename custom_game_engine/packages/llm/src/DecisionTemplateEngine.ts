/**
 * DecisionTemplateEngine - Rule-based templates for common MVEE LLM decision patterns.
 *
 * Phase 3 of the LLM cost savings initiative. Replaces full LLM calls for
 * common, well-understood decision patterns (e.g. routine movement, basic
 * social greetings, resource gathering when needs are critical).
 *
 * Integration: Called by LLMDecisionQueue before the LLM provider call.
 * Fall-through: If confidence < threshold or no match, the normal LLM path is used.
 *
 * A/B validation: A configurable sample rate causes template hits to also fire
 * an async shadow LLM call. The two responses are compared and drift is logged.
 */

import { episodeLogger } from './EpisodeLogger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateFeatureKey =
  | 'layer'
  | 'hunger'
  | 'energy'
  | 'thirst'
  | 'social'
  | 'nearbyAgentsCount'
  | 'inConversation'
  | 'foodNearby'
  | 'waterNearby'
  | 'isNight';

/** Structured features extracted from a raw prompt string. */
export interface TemplateFeatures {
  layer: string;
  /** Hunger level 0–1 (1 = starving). Extracted from "Hunger: XX%" lines. */
  hunger: number;
  /** Energy level 0–1 (1 = fully rested). Extracted from "Energy: XX%" lines. */
  energy: number;
  /** Thirst level 0–1 (1 = parched). Extracted from "Thirst: XX%" lines. */
  thirst: number;
  /** Social need level 0–1. Extracted from "Social: XX%" lines. */
  social: number;
  /** Number of visible nearby agents. */
  nearbyAgentsCount: number;
  /** Whether a conversation is currently active (conversation block in prompt). */
  inConversation: boolean;
  /** Whether food resources are visible. */
  foodNearby: boolean;
  /** Whether water resources are visible. */
  waterNearby: boolean;
  /** Whether it appears to be night (low light / circadian cues). */
  isNight: boolean;
}

/** A single predicate condition on a template feature. */
export interface TemplateCondition {
  feature: TemplateFeatureKey;
  op: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'truthy';
  value?: number | boolean | string;
  /** Weight [0–1]: contribution to confidence when this condition is satisfied. */
  weight: number;
}

/** A complete decision template. */
export interface DecisionTemplate {
  id: string;
  name: string;
  /** Layers this template applies to. */
  layers: string[];
  /** Conditions evaluated against extracted features. */
  conditions: TemplateCondition[];
  /** Builds a valid LLM response JSON string for the matched decision. */
  responseFactory: (features: TemplateFeatures) => string;
  /** The actionType produced — used for metrics and episode logging. */
  actionType: string;
  /** Higher priority templates are evaluated first. */
  priority: number;
}

/** Result of attempting a template match. */
export interface TemplateMatchResult {
  matched: boolean;
  templateId?: string;
  confidence?: number;
  response?: string;
  actionType?: string;
}

/** Accumulated metrics for the template engine. */
export interface TemplateMetrics {
  templateHits: number;
  templateMisses: number;
  abComparisons: number;
  /** Number of A/B comparisons where template action ≠ LLM action. */
  qualityDriftCount: number;
  hitRate: number;
  /** Percentage of LLM calls saved by template interception. */
  llmCallReductionPct: number;
  /** Fraction of A/B comparisons that showed quality drift. */
  averageQualityDrift: number;
  hitsPerTemplate: Record<string, number>;
}

export interface DecisionTemplateConfig {
  enabled: boolean;
  /**
   * Minimum confidence score [0–1] required to use a template.
   * Keyed by layer ('autonomic', 'talker', 'executor', 'default').
   */
  confidenceThreshold: Record<string, number>;
  /**
   * Fraction of template hits that trigger an async shadow LLM call
   * for A/B quality comparison [0–1]. 0 = no A/B testing.
   */
  abSampleRate: number;
}

// ---------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------

/** Extract numeric need level from prompt text. Returns 0 if not found. */
function extractNeedLevel(prompt: string, needName: string): number {
  // Matches patterns like "- Hunger: 85% (" or "Hunger: 0.85"
  const pctRegex = new RegExp(`${needName}:\\s*(\\d+)%`, 'i');
  const pctMatch = pctRegex.exec(prompt);
  if (pctMatch?.[1]) return Math.min(1, parseInt(pctMatch[1], 10) / 100);

  const fracRegex = new RegExp(`${needName}:\\s*(\\d*\\.\\d+|\\d+)`, 'i');
  const fracMatch = fracRegex.exec(prompt);
  if (fracMatch?.[1]) {
    const val = parseFloat(fracMatch[1]);
    return val > 1 ? val / 100 : val;
  }
  return 0;
}

/**
 * Parse a raw prompt string into structured TemplateFeatures.
 * All extractions are best-effort regex; missing values fall back to defaults.
 */
export function extractFeatures(prompt: string, layer: string): TemplateFeatures {
  // Energy stored as "satisfied" side of the need: 100% energy = well rested
  const energyRaw = extractNeedLevel(prompt, 'Energy');
  // Energy text says "exhausted" at < 10%, "tired" at < 30%, "rested" otherwise
  // The stored value is the satisfaction level (high = rested, low = tired)
  const energy = energyRaw;

  // Hunger is the deficit level: 0% = "satisfied", 100% = "very hungry"
  // But in the prompt "Hunger: 85% (very hungry)" means 85% HUNGRY
  const hungerRaw = extractNeedLevel(prompt, 'Hunger');
  const hunger = hungerRaw;

  const thirst = extractNeedLevel(prompt, 'Thirst');
  const social = extractNeedLevel(prompt, 'Social');

  // Count nearby agents by counting "agent" or character names in vision section
  const agentVisionMatches = prompt.match(/\b(agent|villager|npc)\b/gi) ?? [];
  // Also match "You can see X (Agent)" style
  const agentNameMatches = prompt.match(/\([Aa]gent\)/g) ?? [];
  const nearbyAgentsCount = agentVisionMatches.length + agentNameMatches.length;

  // Conversation is active if the prompt has a "Conversation:" or "Active conversation" block
  const inConversation = /conversation\s*history|active conversation|recent messages/i.test(prompt);

  // Food nearby: resource names in vision
  const foodNearby = /\b(food|berry|berries|apple|mushroom|fish|meat|corn|wheat|fruit|harvest)\b/i.test(prompt);

  // Water nearby
  const waterNearby = /\b(water|river|stream|well|lake|pond|spring)\b/i.test(prompt);

  // Night: energy exhausted label or "night" mention
  const isNight = /\bnight\b|\bmidnight\b|\bdawn\b/i.test(prompt) ||
    /energy.*exhausted/i.test(prompt);

  return {
    layer,
    hunger,
    energy,
    thirst,
    social,
    nearbyAgentsCount,
    inConversation,
    foodNearby,
    waterNearby,
    isNight,
  };
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

/**
 * Evaluate a set of conditions against features.
 * Returns a confidence score [0–1] based on weighted conditions satisfied.
 */
function evaluateConditions(conditions: TemplateCondition[], features: TemplateFeatures): number {
  if (conditions.length === 0) return 0;

  let totalWeight = 0;
  let satisfiedWeight = 0;

  for (const cond of conditions) {
    totalWeight += cond.weight;
    const featureValue = features[cond.feature as keyof TemplateFeatures];

    let satisfied = false;
    switch (cond.op) {
      case 'gt':
        satisfied = typeof featureValue === 'number' && featureValue > (cond.value as number);
        break;
      case 'gte':
        satisfied = typeof featureValue === 'number' && featureValue >= (cond.value as number);
        break;
      case 'lt':
        satisfied = typeof featureValue === 'number' && featureValue < (cond.value as number);
        break;
      case 'lte':
        satisfied = typeof featureValue === 'number' && featureValue <= (cond.value as number);
        break;
      case 'eq':
        satisfied = featureValue === cond.value;
        break;
      case 'truthy':
        satisfied = Boolean(featureValue);
        break;
    }

    if (satisfied) satisfiedWeight += cond.weight;
  }

  return totalWeight > 0 ? satisfiedWeight / totalWeight : 0;
}

/** Helper to build a valid agent response JSON string. */
function makeResponse(action: string, thinking: string, speaking: string = ''): string {
  return JSON.stringify({ action, thinking, speaking });
}

/**
 * The built-in template library derived from common MVEE decision patterns.
 * Templates are sorted descending by priority at init time.
 */
export const BUILTIN_TEMPLATES: DecisionTemplate[] = [
  // -------------------------------------------------------------------------
  // Autonomic: Critical hunger with food nearby
  // -------------------------------------------------------------------------
  {
    id: 'autonomic_critical_hunger_food_nearby',
    name: 'Critical Hunger (food visible)',
    layers: ['autonomic'],
    priority: 100,
    actionType: 'gather',
    conditions: [
      { feature: 'hunger', op: 'gte', value: 0.75, weight: 0.6 },
      { feature: 'foodNearby', op: 'truthy', weight: 0.4 },
    ],
    responseFactory: () => makeResponse(
      'gather',
      'I am very hungry and can see food nearby. I should gather it immediately.',
    ),
  },

  // -------------------------------------------------------------------------
  // Autonomic: Critical hunger without food visible
  // -------------------------------------------------------------------------
  {
    id: 'autonomic_critical_hunger_no_food',
    name: 'Critical Hunger (seek food)',
    layers: ['autonomic'],
    priority: 95,
    actionType: 'pick',
    conditions: [
      { feature: 'hunger', op: 'gte', value: 0.80, weight: 0.7 },
      { feature: 'foodNearby', op: 'eq', value: false, weight: 0.3 },
    ],
    responseFactory: () => makeResponse(
      'pick',
      'I am critically hungry and need to find food to survive.',
    ),
  },

  // -------------------------------------------------------------------------
  // Autonomic: Exhaustion — rest immediately
  // -------------------------------------------------------------------------
  {
    id: 'autonomic_exhaustion_rest',
    name: 'Exhaustion (rest)',
    layers: ['autonomic'],
    priority: 90,
    actionType: 'pick',
    conditions: [
      { feature: 'energy', op: 'lte', value: 0.10, weight: 0.8 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.2 },
    ],
    responseFactory: () => makeResponse(
      'pick',
      'I am exhausted and can barely function. I need to rest immediately.',
    ),
  },

  // -------------------------------------------------------------------------
  // Autonomic: Thirst critical with water nearby
  // -------------------------------------------------------------------------
  {
    id: 'autonomic_critical_thirst_water_nearby',
    name: 'Critical Thirst (water visible)',
    layers: ['autonomic'],
    priority: 88,
    actionType: 'gather',
    conditions: [
      { feature: 'thirst', op: 'gte', value: 0.75, weight: 0.6 },
      { feature: 'waterNearby', op: 'truthy', weight: 0.4 },
    ],
    responseFactory: () => makeResponse(
      'gather',
      'I am very thirsty and water is nearby. I need to drink immediately.',
    ),
  },

  // -------------------------------------------------------------------------
  // Autonomic: Moderate tiredness at night — sleep
  // -------------------------------------------------------------------------
  {
    id: 'autonomic_tired_night_sleep',
    name: 'Tired at Night (sleep)',
    layers: ['autonomic'],
    priority: 80,
    actionType: 'pick',
    conditions: [
      { feature: 'energy', op: 'lte', value: 0.30, weight: 0.5 },
      { feature: 'isNight', op: 'truthy', weight: 0.3 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.2 },
    ],
    responseFactory: () => makeResponse(
      'pick',
      'It is night and I am tired. I should rest and recover my energy.',
    ),
  },

  // -------------------------------------------------------------------------
  // Talker: Active conversation — continue engaging
  // -------------------------------------------------------------------------
  {
    id: 'talker_active_conversation',
    name: 'Active Conversation (engage)',
    layers: ['talker'],
    priority: 100,
    actionType: 'follow_agent',
    conditions: [
      { feature: 'inConversation', op: 'truthy', weight: 0.7 },
      { feature: 'hunger', op: 'lt', value: 0.70, weight: 0.15 },
      { feature: 'energy', op: 'gt', value: 0.15, weight: 0.15 },
    ],
    responseFactory: () => makeResponse(
      'follow_agent',
      'I am in an active conversation and should stay engaged with this person.',
    ),
  },

  // -------------------------------------------------------------------------
  // Talker: Nearby agent, no active task — social greeting
  // -------------------------------------------------------------------------
  {
    id: 'talker_nearby_agent_greet',
    name: 'Nearby Agent (greet)',
    layers: ['talker'],
    priority: 70,
    actionType: 'follow_agent',
    conditions: [
      { feature: 'nearbyAgentsCount', op: 'gte', value: 1, weight: 0.5 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.2 },
      { feature: 'hunger', op: 'lt', value: 0.60, weight: 0.2 },
      { feature: 'energy', op: 'gt', value: 0.20, weight: 0.1 },
    ],
    responseFactory: () => makeResponse(
      'follow_agent',
      'There is someone nearby and I have the opportunity to interact with them.',
    ),
  },

  // -------------------------------------------------------------------------
  // Executor: Routine resource gathering (needs moderate, nothing urgent)
  // -------------------------------------------------------------------------
  {
    id: 'executor_routine_gather',
    name: 'Routine Gathering (no urgency)',
    layers: ['executor'],
    priority: 60,
    actionType: 'gather',
    conditions: [
      { feature: 'hunger', op: 'gte', value: 0.35, weight: 0.35 },
      { feature: 'hunger', op: 'lt', value: 0.75, weight: 0.25 },
      { feature: 'foodNearby', op: 'truthy', weight: 0.25 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.15 },
    ],
    responseFactory: () => makeResponse(
      'gather',
      'My supplies are getting low. While nothing is urgent, I should gather resources to prepare.',
    ),
  },

  // -------------------------------------------------------------------------
  // Executor: Plan to build when energy is sufficient
  // -------------------------------------------------------------------------
  {
    id: 'executor_plan_build_rested',
    name: 'Plan Build (rested, no urgency)',
    layers: ['executor'],
    priority: 50,
    actionType: 'plan_build',
    conditions: [
      { feature: 'energy', op: 'gte', value: 0.60, weight: 0.5 },
      { feature: 'hunger', op: 'lt', value: 0.50, weight: 0.3 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.2 },
    ],
    responseFactory: () => makeResponse(
      'plan_build',
      'I have sufficient energy and no pressing needs. This is a good time to work on building.',
    ),
  },

  // -------------------------------------------------------------------------
  // Executor: Idle exploration when all needs met
  // -------------------------------------------------------------------------
  {
    id: 'executor_idle_explore',
    name: 'Idle Exploration (all needs met)',
    layers: ['executor', 'autonomic'],
    priority: 30,
    actionType: 'pick',
    conditions: [
      { feature: 'hunger', op: 'lt', value: 0.40, weight: 0.3 },
      { feature: 'energy', op: 'gte', value: 0.50, weight: 0.3 },
      { feature: 'thirst', op: 'lt', value: 0.40, weight: 0.2 },
      { feature: 'inConversation', op: 'eq', value: false, weight: 0.2 },
    ],
    responseFactory: () => makeResponse(
      'pick',
      'All my needs are currently met. I should explore and look for opportunities.',
    ),
  },
];

// Sort built-ins by descending priority once at module load time.
BUILTIN_TEMPLATES.sort((a, b) => b.priority - a.priority);

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: DecisionTemplateConfig = {
  enabled: true,
  confidenceThreshold: {
    autonomic: 0.70,
    talker: 0.75,
    executor: 0.80,
    default: 0.75,
  },
  abSampleRate: 0.05, // 5% of template hits trigger a shadow LLM call
};

// ---------------------------------------------------------------------------
// DecisionTemplateEngine
// ---------------------------------------------------------------------------

export class DecisionTemplateEngine {
  private static instance: DecisionTemplateEngine | null = null;

  private templates: DecisionTemplate[] = [...BUILTIN_TEMPLATES];
  private config: DecisionTemplateConfig;

  // Metrics
  private templateHits: number = 0;
  private templateMisses: number = 0;
  private abComparisons: number = 0;
  private qualityDriftCount: number = 0;
  private hitsPerTemplate: Record<string, number> = {};

  /**
   * Optional async LLM call function injected for A/B shadow testing.
   * Called with the prompt; returns the raw LLM response string.
   * Not called if abSampleRate is 0.
   */
  private shadowLLMCall: ((prompt: string, layer: string) => Promise<string>) | null = null;

  private constructor(config: DecisionTemplateConfig = DEFAULT_CONFIG) {
    this.config = {
      ...config,
      confidenceThreshold: { ...config.confidenceThreshold },
    };
  }

  static getInstance(): DecisionTemplateEngine {
    if (!DecisionTemplateEngine.instance) {
      DecisionTemplateEngine.instance = new DecisionTemplateEngine();
    }
    return DecisionTemplateEngine.instance;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setConfidenceThreshold(layer: string, threshold: number): void {
    this.config.confidenceThreshold[layer] = threshold;
  }

  setABSampleRate(rate: number): void {
    this.config.abSampleRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Provide an async function that makes an LLM call for A/B shadow testing.
   * Set to null to disable A/B comparison entirely.
   */
  setShadowLLMCall(fn: ((prompt: string, layer: string) => Promise<string>) | null): void {
    this.shadowLLMCall = fn;
  }

  // ---------------------------------------------------------------------------
  // Template management
  // ---------------------------------------------------------------------------

  /** Add or replace a custom template. Templates are re-sorted by priority. */
  addTemplate(template: DecisionTemplate): void {
    const idx = this.templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
    this.templates.sort((a, b) => b.priority - a.priority);
  }

  removeTemplate(id: string): void {
    this.templates = this.templates.filter(t => t.id !== id);
  }

  getTemplates(): DecisionTemplate[] {
    return [...this.templates];
  }

  // ---------------------------------------------------------------------------
  // Core matching
  // ---------------------------------------------------------------------------

  /**
   * Attempt to match a prompt to a template (synchronous).
   *
   * 1. Extracts features from the prompt text.
   * 2. Evaluates each template's conditions (filtered by layer) in priority order.
   * 3. Returns the first template whose confidence score meets the threshold.
   * 4. If A/B sampling triggers, fires an async shadow LLM call in the background
   *    without blocking the caller.
   *
   * Intentionally synchronous so that no additional microtask ticks are introduced
   * into the LLMDecisionQueue processing path.
   */
  match(prompt: string, layer: string): TemplateMatchResult {
    if (!this.config.enabled) {
      return { matched: false };
    }

    const features = extractFeatures(prompt, layer);
    const threshold =
      this.config.confidenceThreshold[layer] ??
      this.config.confidenceThreshold['default'] ??
      0.75;

    for (const template of this.templates) {
      if (!template.layers.includes(layer)) continue;

      const confidence = evaluateConditions(template.conditions, features);
      if (confidence >= threshold) {
        const response = template.responseFactory(features);
        this.templateHits++;
        this.hitsPerTemplate[template.id] = (this.hitsPerTemplate[template.id] ?? 0) + 1;

        // Async A/B shadow call (non-blocking)
        if (
          this.shadowLLMCall &&
          this.config.abSampleRate > 0 &&
          Math.random() < this.config.abSampleRate
        ) {
          this.runABComparison(prompt, layer, template, response).catch(() => {
            // Silently ignore A/B errors — they must never affect the main path
          });
        }

        return {
          matched: true,
          templateId: template.id,
          confidence,
          response,
          actionType: template.actionType,
        };
      }
    }

    this.templateMisses++;
    return { matched: false };
  }

  /**
   * Fire a background LLM call and compare its result to the template response.
   * Updates quality drift metrics. Never throws — errors are swallowed.
   */
  private async runABComparison(
    prompt: string,
    layer: string,
    template: DecisionTemplate,
    templateResponse: string,
  ): Promise<void> {
    if (!this.shadowLLMCall) return;

    try {
      const llmResponse = await this.shadowLLMCall(prompt, layer);
      this.abComparisons++;

      // Compare action types
      const templateAction = this.extractActionType(templateResponse);
      const llmAction = this.extractActionType(llmResponse);
      const isDrift = templateAction !== llmAction;

      if (isDrift) this.qualityDriftCount++;

      // Log as an episode so the drift is observable in episode metrics
      episodeLogger.log({
        agentId: `ab_comparison_${template.id}`,
        layer,
        promptHash: `ab_${template.id}_${Date.now()}`,
        promptLength: Math.ceil(prompt.length / 4),
        actionType: `ab:${templateAction}→${llmAction}`,
        action: { templateAction, llmAction, isDrift },
        durationMs: 0,
        cacheHit: false,
        thinking: isDrift ? `Quality drift: template=${templateAction}, llm=${llmAction}` : undefined,
      });
    } catch {
      // Graceful degradation — A/B errors must never surface
    }
  }

  /** Extract action type from a JSON response string. Returns 'unknown' on parse failure. */
  private extractActionType(response: string): string {
    try {
      const parsed = JSON.parse(response);
      if (typeof parsed.action === 'string') return parsed.action;
      if (typeof parsed.action?.type === 'string') return parsed.action.type;
    } catch { /* not JSON */ }
    return 'unknown';
  }

  // ---------------------------------------------------------------------------
  // Episode analysis
  // ---------------------------------------------------------------------------

  /**
   * Analyze buffered episode logs to identify the top-N most frequent
   * decision categories. Use this to discover which templates to build next.
   *
   * @param topN - Number of top categories to return (default: 10)
   */
  analyzeTopDecisionPatterns(topN: number = 10): Array<{ actionType: string; count: number; pct: number }> {
    const metrics = episodeLogger.getMetrics();
    const dist = metrics.actionDistribution;
    const total = Object.values(dist).reduce((s, v) => s + v, 0);

    return Object.entries(dist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([actionType, count]) => ({
        actionType,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }));
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getMetrics(): TemplateMetrics {
    const total = this.templateHits + this.templateMisses;
    return {
      templateHits: this.templateHits,
      templateMisses: this.templateMisses,
      abComparisons: this.abComparisons,
      qualityDriftCount: this.qualityDriftCount,
      hitRate: total > 0 ? this.templateHits / total : 0,
      llmCallReductionPct: total > 0 ? Math.round((this.templateHits / total) * 1000) / 10 : 0,
      averageQualityDrift: this.abComparisons > 0 ? this.qualityDriftCount / this.abComparisons : 0,
      hitsPerTemplate: { ...this.hitsPerTemplate },
    };
  }

  resetMetrics(): void {
    this.templateHits = 0;
    this.templateMisses = 0;
    this.abComparisons = 0;
    this.qualityDriftCount = 0;
    this.hitsPerTemplate = {};
  }

  clear(): void {
    this.resetMetrics();
  }
}

/** Singleton instance for use throughout the engine. */
export const decisionTemplateEngine = DecisionTemplateEngine.getInstance();
