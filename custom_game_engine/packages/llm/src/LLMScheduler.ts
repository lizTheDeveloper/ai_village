/**
 * LLM Scheduler
 *
 * Coordinates the three-layer LLM decision architecture:
 * - Layer 1 (Autonomic): Reflexive responses, basic needs, immediate decisions
 * - Layer 2 (Talker): Conversations, social interactions, relationships
 * - Layer 3 (Executor): Strategic planning, task execution, resource management
 *
 * Responsibilities:
 * - Decide which layer to invoke based on agent state and context
 * - Route requests to appropriate prompt builder
 * - Manage per-layer cooldowns to prevent excessive LLM calls
 * - Priority queue for urgent decisions
 *
 * Design Principles:
 * - Autonomic runs most frequently (critical needs, immediate threats)
 * - Talker runs when social context demands (conversations, goals)
 * - Executor runs least frequently (strategic planning, task completion)
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  AgentComponent,
  NeedsComponent,
  ConversationComponent,
  VisionComponent,
  CircadianComponent,
  GoalsComponent,
} from '@ai-village/core';
import { StructuredPromptBuilder } from './StructuredPromptBuilder.js';
import { TalkerPromptBuilder } from './TalkerPromptBuilder.js';
import { ExecutorPromptBuilder } from './ExecutorPromptBuilder.js';
import type { LLMDecisionQueue } from './LLMDecisionQueue.js';

/**
 * Decision layer type
 */
export type DecisionLayer = 'autonomic' | 'talker' | 'executor';

/**
 * Layer configuration
 */
export interface LayerConfig {
  /**
   * Minimum cooldown between invocations (ms)
   */
  cooldownMs: number;

  /**
   * Priority (higher = more important, runs more often)
   */
  priority: number;

  /**
   * Whether this layer is enabled
   */
  enabled: boolean;
}

/**
 * Default layer configurations
 */
export const DEFAULT_LAYER_CONFIG: Record<DecisionLayer, LayerConfig> = {
  autonomic: {
    cooldownMs: 1000, // 1 second - fast reflexive decisions
    priority: 10, // Highest priority
    enabled: true,
  },
  talker: {
    cooldownMs: 5000, // 5 seconds - social interactions
    priority: 5, // Medium priority
    enabled: true,
  },
  executor: {
    cooldownMs: 10000, // 10 seconds - strategic planning
    priority: 1, // Lowest priority (but most impactful)
    enabled: true,
  },
};

/**
 * Layer selection result
 */
export interface LayerSelection {
  layer: DecisionLayer;
  reason: string;
  urgency: number; // 0-10, higher = more urgent
}

/**
 * Per-agent layer state
 */
interface AgentLayerState {
  agentId: string;
  lastInvocation: Partial<Record<DecisionLayer, number>>; // Timestamp of last invocation
  pendingLayer: DecisionLayer | null; // Layer waiting to be invoked
}

/**
 * Scheduler metrics for monitoring and optimization
 */
export interface SchedulerMetrics {
  /** Number of times each layer was selected */
  layerSelections: Record<DecisionLayer, number>;
  /** Number of times a decision was blocked by cooldown */
  cooldownHits: Record<DecisionLayer, number>;
  /** Sum of urgency scores for calculating averages */
  totalUrgency: Record<DecisionLayer, number>;
  /** Total decision requests processed */
  totalRequests: number;
  /** Number of successful LLM calls */
  successfulCalls: number;
  /** Number of failed LLM calls */
  failedCalls: number;
  /** Timestamp when metrics were last reset */
  resetAt: number;
}

/**
 * LLM Scheduler
 *
 * Coordinates three-layer LLM decision-making
 */
export class LLMScheduler {
  private autonomicBuilder: StructuredPromptBuilder;
  private talkerBuilder: TalkerPromptBuilder;
  private executorBuilder: ExecutorPromptBuilder;
  private queue: LLMDecisionQueue;

  private layerConfig: Record<DecisionLayer, LayerConfig>;
  private agentStates: Map<string, AgentLayerState> = new Map();
  private metrics: SchedulerMetrics;

  constructor(
    queue: LLMDecisionQueue,
    config?: Partial<Record<DecisionLayer, Partial<LayerConfig>>>
  ) {
    this.queue = queue;
    this.autonomicBuilder = new StructuredPromptBuilder();
    this.talkerBuilder = new TalkerPromptBuilder();
    this.executorBuilder = new ExecutorPromptBuilder();

    // Merge custom config with defaults
    this.layerConfig = {
      autonomic: { ...DEFAULT_LAYER_CONFIG.autonomic, ...config?.autonomic },
      talker: { ...DEFAULT_LAYER_CONFIG.talker, ...config?.talker },
      executor: { ...DEFAULT_LAYER_CONFIG.executor, ...config?.executor },
    };

    // Initialize metrics
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): SchedulerMetrics {
    return {
      layerSelections: { autonomic: 0, talker: 0, executor: 0 },
      cooldownHits: { autonomic: 0, talker: 0, executor: 0 },
      totalUrgency: { autonomic: 0, talker: 0, executor: 0 },
      totalRequests: 0,
      successfulCalls: 0,
      failedCalls: 0,
      resetAt: Date.now(),
    };
  }

  /**
   * Select which layer should handle this agent's decision.
   *
   * Priority order:
   * 1. Critical needs → Autonomic (survival)
   * 2. Active conversation → Talker (social)
   * 3. Nearby agents → Talker (potential social interaction)
   * 4. No goals set → Talker (goal-setting)
   * 5. Task completion/idle → Executor (planning)
   * 6. Default → Autonomic (safety fallback)
   */
  selectLayer(agent: Entity, world: World): LayerSelection {
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const agentComp = agent.components.get('agent') as AgentComponent | undefined;
    const conversation = agent.components.get('conversation') as ConversationComponent | undefined;
    const vision = agent.components.get('vision') as VisionComponent | undefined;
    const goals = agent.components.get('goals') as GoalsComponent | undefined;

    // PRIORITY 1: Critical needs (survival)
    if (needs) {
      const hunger = needs.hunger ?? 1;
      const energy = needs.energy ?? 1;
      const temperature = needs.temperature ?? 1;

      if (hunger < 0.2 || energy < 0.2 || temperature < 0.2) {
        return {
          layer: 'autonomic',
          reason: 'Critical needs (hunger/energy/temperature)',
          urgency: 10,
        };
      }
    }

    // PRIORITY 2: Active conversation (social engagement)
    if (conversation?.isActive || (vision?.heardSpeech && vision.heardSpeech.length > 0)) {
      return {
        layer: 'talker',
        reason: 'Active conversation or heard speech',
        urgency: 8,
      };
    }

    // PRIORITY 3: Nearby agents (potential social interaction)
    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      return {
        layer: 'talker',
        reason: 'Nearby agents (potential social interaction)',
        urgency: 6,
      };
    }

    // PRIORITY 4: No goals set (needs goal-setting via Talker)
    // Check if agent has NO active goals - Talker is responsible for setting goals
    if (!goals || !goals.goals || goals.goals.length === 0 || goals.getActiveGoalCount() === 0) {
      return {
        layer: 'talker',
        reason: 'No goals set, needs goal-setting',
        urgency: 5,
      };
    }

    // PRIORITY 5: Task completion (strategic planning needed)
    if (agentComp?.behaviorCompleted) {
      return {
        layer: 'executor',
        reason: 'Task completed, needs new strategic decision',
        urgency: 7,
      };
    }

    // PRIORITY 6: Idle or wandering (planning needed)
    if (!agentComp?.behavior || agentComp.behavior === 'idle' || agentComp.behavior === 'wander') {
      return {
        layer: 'executor',
        reason: 'Idle/wandering, needs strategic planning',
        urgency: 5,
      };
    }

    // PRIORITY 7: Low needs (opportunity for strategic planning)
    if (needs) {
      const hunger = needs.hunger ?? 1;
      const energy = needs.energy ?? 1;

      if (hunger > 0.7 && energy > 0.7) {
        return {
          layer: 'executor',
          reason: 'Needs satisfied, can focus on strategic goals',
          urgency: 4,
        };
      }
    }

    // DEFAULT: Autonomic (safety fallback)
    return {
      layer: 'autonomic',
      reason: 'Default reflexive decision-making',
      urgency: 3,
    };
  }

  /**
   * Check if a layer is ready to run for this agent (cooldown elapsed)
   * Adjusts cooldowns based on conversation state for more natural engagement
   */
  isLayerReady(agentId: string, layer: DecisionLayer, agent?: Entity): boolean {
    const config = this.layerConfig[layer];
    if (!config.enabled) return false;

    const state = this.getAgentState(agentId);
    const lastInvocation = state.lastInvocation[layer] ?? 0;
    const elapsed = Date.now() - lastInvocation;

    // Get adjusted cooldown based on conversation state
    let adjustedCooldown = config.cooldownMs;

    if (agent && layer === 'talker') {
      const conversationComp = agent.components.get('conversation') as ConversationComponent | undefined;
      const isInConversation = conversationComp?.isActive && (conversationComp.partnerId !== null || conversationComp.participantIds.length > 0);

      if (isInConversation) {
        // In conversation: Talker runs FREQUENTLY to manage turn-taking and conversation flow
        adjustedCooldown = 2000; // 2s (was 5s) - high engagement during conversation
      } else {
        // NOT in conversation: Talker runs RARELY, only to check if should start conversation
        adjustedCooldown = 20000; // 20s (was 5s) - low engagement when not conversing (1:10 ratio)
      }
    }
    // Executor uses default cooldown regardless of conversation state (configurable at settings level)

    return elapsed >= adjustedCooldown;
  }

  /**
   * Get time until layer is ready (ms)
   */
  getTimeUntilReady(agentId: string, layer: DecisionLayer): number {
    const config = this.layerConfig[layer];
    const state = this.getAgentState(agentId);
    const lastInvocation = state.lastInvocation[layer] ?? 0;
    const elapsed = Date.now() - lastInvocation;

    return Math.max(0, config.cooldownMs - elapsed);
  }

  /**
   * Request a decision for an agent.
   * Automatically selects appropriate layer and builds prompt.
   *
   * @returns Promise<{layer: DecisionLayer, response: string}> or null if on cooldown
   */
  async requestDecision(
    agent: Entity,
    world: World
  ): Promise<{ layer: DecisionLayer; response: string; reason: string } | null> {
    // Skip LLM for sleeping agents - dreams are handled by a separate system
    const circadian = agent.components.get('circadian') as CircadianComponent | undefined;
    if (circadian?.isSleeping) {
      return null;
    }

    const selection = this.selectLayer(agent, world);

    // Track metrics: layer selection and urgency
    this.metrics.totalRequests++;
    this.metrics.layerSelections[selection.layer]++;
    this.metrics.totalUrgency[selection.layer] += selection.urgency;

    // Check if selected layer is ready (pass agent for conversation-aware cooldowns)
    if (!this.isLayerReady(agent.id, selection.layer, agent)) {
      const waitMs = this.getTimeUntilReady(agent.id, selection.layer);

      // Track metrics: cooldown hit
      this.metrics.cooldownHits[selection.layer]++;

      console.log(
        `[LLMScheduler] ${agent.id} layer ${selection.layer} on cooldown (${waitMs}ms remaining)`
      );
      return null;
    }

    // Build prompt using selected layer's builder
    const prompt = this.buildPrompt(selection.layer, agent, world);

    // Record invocation time
    const state = this.getAgentState(agent.id);
    state.lastInvocation[selection.layer] = Date.now();

    // Queue decision
    try {
      const response = await this.queue.requestDecision(agent.id, prompt);

      // Track metrics: successful call
      this.metrics.successfulCalls++;

      console.log(
        `[LLMScheduler] ${agent.id} → ${selection.layer} (${selection.reason})`
      );

      return {
        layer: selection.layer,
        response,
        reason: selection.reason,
      };
    } catch (error) {
      // Track metrics: failed call
      this.metrics.failedCalls++;

      console.error(`[LLMScheduler] Decision failed for ${agent.id}:`, error);
      return null;
    }
  }

  /**
   * Build prompt for specific layer
   */
  buildPrompt(layer: DecisionLayer, agent: Entity, world: World): string {
    switch (layer) {
      case 'autonomic':
        return this.autonomicBuilder.buildPrompt(agent, world);
      case 'talker':
        return this.talkerBuilder.buildPrompt(agent, world);
      case 'executor':
        return this.executorBuilder.buildPrompt(agent, world);
      default:
        console.warn(`[LLMScheduler] Unknown layer: ${layer}, falling back to autonomic`);
        return this.autonomicBuilder.buildPrompt(agent, world);
    }
  }

  /**
   * Get or create agent state
   */
  private getAgentState(agentId: string): AgentLayerState {
    if (!this.agentStates.has(agentId)) {
      this.agentStates.set(agentId, {
        agentId,
        lastInvocation: {},
        pendingLayer: null,
      });
    }
    return this.agentStates.get(agentId)!;
  }

  /**
   * Reset cooldowns for an agent (useful for testing or special events)
   */
  resetCooldowns(agentId: string, layer?: DecisionLayer): void {
    const state = this.getAgentState(agentId);

    if (layer) {
      state.lastInvocation[layer] = 0;
    } else {
      state.lastInvocation = {};
    }
  }

  /**
   * Update layer configuration
   */
  setLayerConfig(layer: DecisionLayer, config: Partial<LayerConfig>): void {
    this.layerConfig[layer] = {
      ...this.layerConfig[layer],
      ...config,
    };
  }

  /**
   * Get layer configuration
   */
  getLayerConfig(layer: DecisionLayer): LayerConfig {
    return { ...this.layerConfig[layer] };
  }

  /**
   * Get all prompt builders (for inspection/testing)
   */
  getBuilders() {
    return {
      autonomic: this.autonomicBuilder,
      talker: this.talkerBuilder,
      executor: this.executorBuilder,
    };
  }

  /**
   * Clean up old agent states (call periodically to prevent memory leaks)
   */
  cleanupOldStates(maxAgeMs: number = 300000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [agentId, state] of this.agentStates.entries()) {
      // Get most recent invocation time across all layers
      const lastActivity = Math.max(
        state.lastInvocation.autonomic ?? 0,
        state.lastInvocation.talker ?? 0,
        state.lastInvocation.executor ?? 0
      );

      if (now - lastActivity > maxAgeMs) {
        toDelete.push(agentId);
      }
    }

    for (const agentId of toDelete) {
      this.agentStates.delete(agentId);
    }

    if (toDelete.length > 0) {
      console.log(`[LLMScheduler] Cleaned up ${toDelete.length} old agent states`);
    }
  }

  /**
   * Get current scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset scheduler metrics
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Get metrics with calculated averages
   */
  getMetricsWithAverages() {
    const avgUrgency: Record<DecisionLayer, number> = {
      autonomic:
        this.metrics.layerSelections.autonomic > 0
          ? this.metrics.totalUrgency.autonomic / this.metrics.layerSelections.autonomic
          : 0,
      talker:
        this.metrics.layerSelections.talker > 0
          ? this.metrics.totalUrgency.talker / this.metrics.layerSelections.talker
          : 0,
      executor:
        this.metrics.layerSelections.executor > 0
          ? this.metrics.totalUrgency.executor / this.metrics.layerSelections.executor
          : 0,
    };

    return {
      ...this.metrics,
      averageUrgency: avgUrgency,
      uptime: Date.now() - this.metrics.resetAt,
    };
  }
}
