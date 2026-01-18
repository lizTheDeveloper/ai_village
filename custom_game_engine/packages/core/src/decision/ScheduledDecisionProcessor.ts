/**
 * ScheduledDecisionProcessor - Context-aware decision routing using LLMScheduler
 *
 * This processor uses the LLMScheduler for intelligent layer selection based on agent context:
 * - Critical needs → Autonomic layer (survival)
 * - Active conversation → Talker layer (social)
 * - Task completion/idle → Executor layer (strategic planning)
 *
 * Compared to the standard DecisionProcessor which runs layers sequentially,
 * this processor intelligently selects the right layer based on agent state,
 * reducing unnecessary LLM calls and improving cost efficiency.
 *
 * Part of the three-layer LLM scheduler architecture (work-order: llm-scheduler-integration)
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent, AgentBehavior } from '../components/AgentComponent.js';
import { AutonomicSystem, type AutonomicResult } from './AutonomicSystem.js';
import { getBehaviorPriority } from './BehaviorPriority.js';
import { parseAction, actionToBehavior } from '../actions/AgentAction.js';
import { LLMHistoryComponent, createLLMHistoryComponent, type LLMInteraction } from '../components/LLMHistoryComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import type { GoalsComponent, PersonalGoal, GoalCategory } from '../components/GoalsComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';

// Import LLM types from local types file to avoid circular dependency with @ai-village/llm
import type { LLMScheduler, DecisionLayer, LLMDecisionQueue } from '../types/LLMTypes.js';

/**
 * Decision result from ScheduledDecisionProcessor
 */
export interface ScheduledDecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  source: 'autonomic' | 'talker' | 'executor' | 'none';
  layer?: DecisionLayer;
  reason?: string;
  priority?: number;
}

/**
 * ScheduledDecisionProcessor - Uses LLMScheduler for intelligent layer selection
 *
 * This processor provides an alternative to DecisionProcessor that uses the
 * LLMScheduler for context-aware layer selection and cooldown management.
 *
 * Benefits:
 * - Intelligent layer selection based on agent state (not just sequential)
 * - Unified cooldown management across all layers
 * - Cost optimization by avoiding unnecessary expensive LLM calls
 * - Clearer separation of concerns (scheduler vs. response parsing)
 *
 * Usage:
 * ```typescript
 * import { LLMScheduler } from '@ai-village/llm';
 * import { ScheduledDecisionProcessor } from '@ai-village/core';
 *
 * const scheduler = new LLMScheduler(llmQueue);
 * const processor = new ScheduledDecisionProcessor(scheduler);
 *
 * // In system update loop
 * const result = await processor.processAsync(entity, world, agent);
 * if (result.changed) {
 *   console.log(`Decision via ${result.layer}: ${result.reason}`);
 * }
 * ```
 */
export class ScheduledDecisionProcessor {
  private scheduler: LLMScheduler;
  private autonomicSystem: AutonomicSystem;
  private llmDecisionQueue: LLMDecisionQueue;
  private pendingLayerSelection: Map<string, DecisionLayer> = new Map();
  private pendingPrompts: Map<string, string> = new Map(); // Track prompts by entity ID

  constructor(scheduler: LLMScheduler, llmDecisionQueue: LLMDecisionQueue) {
    this.scheduler = scheduler;
    this.autonomicSystem = new AutonomicSystem();
    this.llmDecisionQueue = llmDecisionQueue;
  }

  /**
   * Process decision for an entity (async version using LLMScheduler).
   *
   * This is the recommended method when using the scheduler, as it properly
   * handles the async nature of LLM calls.
   *
   * Flow:
   * 1. Check autonomic layer first (synchronous, fast)
   * 2. If no autonomic override, request decision from scheduler
   * 3. Scheduler selects layer based on agent context
   * 4. Parse and apply LLM response
   */
  async processAsync(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent
  ): Promise<ScheduledDecisionResult> {
    const currentPriority = getBehaviorPriority(agent.behavior);

    // Layer 1: Autonomic (highest priority, synchronous)
    const autonomicResult = this.autonomicSystem.check(entity);
    if (autonomicResult && autonomicResult.priority > currentPriority) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: autonomicResult.behavior,
        behaviorState: {},
      }));

      return {
        changed: true,
        behavior: autonomicResult.behavior,
        behaviorState: {},
        source: 'autonomic',
        layer: 'autonomic',
        priority: autonomicResult.priority,
        reason: autonomicResult.reason,
      };
    }

    // Layer 2 & 3: Scheduler-based LLM decision
    if (!agent.useLLM) {
      return { changed: false, source: 'none' };
    }

    try {
      // RequestDecision expects EntityImpl and World from the scheduler's perspective
      const decision = await this.scheduler.requestDecision(entity, world);

      if (!decision) {
        // On cooldown or scheduler unavailable
        return { changed: false, source: 'none' };
      }

      // Parse LLM response
      const parsed = this.parseLLMResponse(decision.response);

      if (!parsed) {
        console.warn(`[ScheduledDecisionProcessor] Failed to parse LLM response for ${entity.id}`);
        return { changed: false, source: 'none' };
      }

      // Apply goal if present (from Talker layer)
      if (parsed.goal && parsed.goal.description) {
        this.applyGoalToEntity(entity, parsed.goal);
      }

      // If no behavior change, just apply speech/goal updates without changing behavior
      if (!parsed.behavior) {
        // Only update speech if present
        if (parsed.speaking) {
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            recentSpeech: parsed.speaking,
          }));
        }
        // Return unchanged - agent stays in current behavior
        return { changed: false, source: 'none' };
      }

      // Apply decision to agent (with behavior change)
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: parsed.behavior!,
        behaviorState: parsed.behaviorState || {},
        recentSpeech: parsed.speaking, // Set speech for bubble renderer
      }));

      return {
        changed: true,
        behavior: parsed.behavior,
        behaviorState: parsed.behaviorState || {},
        source: decision.layer as 'talker' | 'executor',
        layer: decision.layer,
        reason: decision.reason,
      };
    } catch (error) {
      console.error(`[ScheduledDecisionProcessor] Error processing decision for ${entity.id}:`, error);
      return { changed: false, source: 'none' };
    }
  }

  /**
   * Process decision for an entity (synchronous queue+poll pattern).
   *
   * Uses the queue+poll pattern like LLMDecisionProcessor:
   * 1. Check autonomic layer first (synchronous, fast)
   * 2. Poll for ready LLM decision from queue
   * 3. If no ready decision, select layer and request new one (fire-and-forget)
   * 4. Next tick will poll and get the result
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent
  ): ScheduledDecisionResult {
    // Skip LLM for sleeping agents - dreams are handled by a separate system
    const circadian = entity.getComponent('circadian') as CircadianComponent | undefined;
    if (circadian?.isSleeping) {
      return { changed: false, source: 'none' };
    }

    const currentPriority = getBehaviorPriority(agent.behavior);

    // Layer 1: Autonomic (highest priority, synchronous)
    const autonomicResult = this.autonomicSystem.check(entity);
    if (autonomicResult && autonomicResult.priority > currentPriority) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: autonomicResult.behavior,
        behaviorState: {},
      }));

      return {
        changed: true,
        behavior: autonomicResult.behavior,
        behaviorState: {},
        source: 'autonomic',
        layer: 'autonomic',
        priority: autonomicResult.priority,
        reason: autonomicResult.reason,
      };
    }

    // Layer 2 & 3: Poll for ready LLM decision
    if (!agent.useLLM) {
      return { changed: false, source: 'none' };
    }

    // Check if we have a ready decision (queue+poll pattern)
    const decision = this.llmDecisionQueue.getDecision(entity.id);
    if (decision) {
      // Get the layer that made this decision (stored when we requested it)
      const layer = this.pendingLayerSelection.get(entity.id) || 'executor';
      this.pendingLayerSelection.delete(entity.id);

      // Get the prompt that was sent
      const prompt = this.pendingPrompts.get(entity.id) || '';
      this.pendingPrompts.delete(entity.id);

      // Parse LLM response
      const parsed = this.parseLLMResponse(decision);

      if (!parsed) {
        console.warn(`[ScheduledDecisionProcessor] Failed to parse LLM response for ${entity.id}`);
        // Record failed interaction
        if (prompt) {
          this.recordLLMInteraction(entity, layer, prompt, decision, false, 'Failed to parse response');
        }
        return { changed: false, source: 'none' };
      }

      // Record successful interaction
      if (prompt) {
        this.recordLLMInteraction(entity, layer, prompt, decision, true);
      }

      // Apply goal if present (from Talker layer)
      if (parsed.goal && parsed.goal.description) {
        this.applyGoalToEntity(entity, parsed.goal);
      }

      // Handle sleep_until_queue_complete action (Executor layer meta-action)
      // This is a meta-action that sets the executor sleep flag WITHOUT changing behavior
      if (parsed.behavior && parsed.behavior === 'sleep_until_queue_complete') {
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          executorSleepUntilQueueComplete: true,
        }));
        // Clear parsed.behavior so agent stays in current behavior
        parsed.behavior = undefined;
      }

      // Handle goal-setting actions - these should NOT change behavior
      // Agent continues current task while goal is set
      if (parsed.behavior && (
        parsed.behavior === 'set_personal_goal' ||
        parsed.behavior === 'set_medium_term_goal' ||
        parsed.behavior === 'set_group_goal' ||
        parsed.behavior === 'set_priorities'
      )) {
        // Goal was already applied above, just clear behavior so agent stays in current task
        parsed.behavior = undefined;
      }

      // If no behavior change, just apply speech/goal updates without changing behavior
      if (!parsed.behavior) {
        // Only update speech if present
        if (parsed.speaking) {
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            recentSpeech: parsed.speaking,
          }));
        }
        // Return unchanged - agent stays in current behavior
        return { changed: false, source: 'none' };
      }

      // Apply decision to agent (with behavior change)
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: parsed.behavior!,
        behaviorState: parsed.behaviorState || {},
        recentSpeech: parsed.speaking, // Set speech for bubble renderer
      }));

      return {
        changed: true,
        behavior: parsed.behavior,
        behaviorState: parsed.behaviorState || {},
        source: layer as 'talker' | 'executor',
        layer: layer,
        reason: `Decision from ${layer} layer`,
      };
    }

    // No ready decision - request a new one if needed (fire-and-forget)
    // Select which layer should handle this decision
    const layerSelection = this.scheduler.selectLayer(entity, world);

    // Check if layer is ready (cooldown)
    if (!this.scheduler.isLayerReady(entity.id, layerSelection.layer)) {
      return { changed: false, source: 'none' };
    }

    // Build prompt for selected layer
    const prompt = this.scheduler.buildPrompt(layerSelection.layer, entity, world);

    // Store which layer we're requesting (so we can label it when the response comes back)
    this.pendingLayerSelection.set(entity.id, layerSelection.layer);

    // Store the prompt so we can record it with the response later
    this.pendingPrompts.set(entity.id, prompt);

    // Request decision from queue (fire-and-forget, will be ready next tick)
    this.llmDecisionQueue.requestDecision(entity.id, prompt, agent.customLLM).catch((error: Error) => {
      console.error(`[ScheduledDecisionProcessor] LLM decision failed for ${entity.id}:`, error);
      this.pendingLayerSelection.delete(entity.id);
      this.pendingPrompts.delete(entity.id);
    });

    // Mark that we've invoked this layer (for cooldown tracking)
    // Access internal getAgentState method (scheduler should expose this or we track cooldown differently)
    interface SchedulerWithState extends LLMScheduler {
      getAgentState(entityId: string): { lastInvocation: Record<DecisionLayer, number> };
    }
    const state = (this.scheduler as SchedulerWithState).getAgentState(entity.id);
    state.lastInvocation[layerSelection.layer] = Date.now();

    return { changed: false, source: 'none' };
  }

  /**
   * Parse LLM response (JSON or legacy text format).
   * Also extracts goal from Talker responses.
   * Returns null if parsing fails. Behavior is optional - if omitted, agent stays in current behavior.
   */
  private parseLLMResponse(response: string): { behavior?: AgentBehavior; behaviorState?: Record<string, unknown>; speaking?: string; goal?: { type: string; description: string } } | null {
    // Try JSON parse first (structured format)
    try {
      const parsed = JSON.parse(response);

      // Extract goal if present (from Talker responses)
      let goal: { type: string; description: string } | undefined;
      if (parsed.goal && typeof parsed.goal === 'object') {
        goal = {
          type: parsed.goal.type || 'personal',
          description: parsed.goal.description || '',
        };
      }

      // New structured format with action object
      if (parsed.action && typeof parsed.action === 'object') {
        const action = parsed.action;
        const behavior = actionToBehavior(action);
        return {
          behavior,
          behaviorState: {},
          speaking: parsed.speaking,
          goal,
        };
      }

      // Legacy format with action string - parse it
      if (parsed.action && typeof parsed.action === 'string') {
        const action = parseAction(parsed.action);
        if (action) {
          const behavior = actionToBehavior(action);
          return {
            behavior,
            behaviorState: {},
            speaking: parsed.speaking,
            goal,
          };
        }
      }

      // If we have a goal but no action, apply goal but DON'T change behavior
      // Agent stays in current behavior - LLM will decide action when ready
      if (goal && goal.description) {
        return {
          // NO behavior change - let agent stay in current behavior
          behaviorState: {},
          speaking: parsed.speaking,
          goal,
        };
      }

      return null;
    } catch {
      // Not JSON, try legacy text parsing
      const action = parseAction(response);
      if (action) {
        const behavior = actionToBehavior(action);
        return { behavior, behaviorState: {} };
      }

      return null;
    }
  }

  /**
   * Apply a goal to the entity's GoalsComponent.
   * Creates the component if it doesn't exist.
   */
  private applyGoalToEntity(
    entity: EntityImpl,
    goal: { type: string; description: string }
  ): void {
    if (!goal.description) return;

    // Get or create goals component
    let goalsComp = entity.getComponent(ComponentType.Goals) as GoalsComponent | undefined;

    if (!goalsComp) {
      goalsComp = {
        type: 'goals',
        goals: [],
        MAX_GOALS: 5,
      } as unknown as GoalsComponent;
      entity.addComponent(goalsComp);
    }

    // Map goal type to category
    let category: GoalCategory;
    switch (goal.type) {
      case 'personal':
        category = 'mastery';
        break;
      case 'medium_term':
        category = 'creative';
        break;
      case 'group':
        category = 'social';
        break;
      default:
        category = 'mastery';
    }

    // Create the goal
    const newGoal: PersonalGoal = {
      id: `goal_${goal.type}_${Date.now()}`,
      category,
      description: goal.description,
      motivation: `Set during ${goal.type} goal-setting`,
      progress: 0,
      milestones: [],
      createdAt: Date.now(),
      targetCompletionDays: goal.type === 'personal' ? 7 : goal.type === 'medium_term' ? 14 : 30,
      completed: false,
    };

    // Add the goal (raw data check since it might not be a class instance)
    const goalsArray = goalsComp.goals;
    if (goalsArray.length < 5) {
      goalsArray.push(newGoal);
    }
  }

  /**
   * Get the LLMScheduler instance.
   * Useful for inspecting scheduler state or adjusting configuration.
   */
  getScheduler(): LLMScheduler {
    return this.scheduler;
  }

  /**
   * Process only autonomic decisions (synchronous).
   */
  processAutonomic(entity: EntityImpl): AutonomicResult | null {
    return this.autonomicSystem.check(entity);
  }

  /**
   * Record an LLM interaction to the entity's history component
   */
  private recordLLMInteraction(
    entity: EntityImpl,
    layer: DecisionLayer,
    prompt: string,
    response: string,
    success: boolean,
    error?: string
  ): void {
    // Get or create llm_history component
    let history = entity.getComponent('llm_history') as LLMHistoryComponent | undefined;
    if (!history) {
      history = createLLMHistoryComponent(entity.id);
      entity.addComponent(history);
    }

    // Parse response to extract fields
    let thinking: string | undefined;
    let action: any;
    let speaking: string | undefined;
    let rawResponse: any;

    try {
      const parsed = JSON.parse(response);
      rawResponse = parsed;
      thinking = parsed.thinking;
      action = parsed.action;
      speaking = parsed.speaking;
    } catch {
      // Not JSON, store as raw
      rawResponse = response;
    }

    // Create interaction record
    const interaction: LLMInteraction = {
      timestamp: Date.now(),
      layer: layer === 'talker' || layer === 'executor' ? layer : 'executor', // Default to executor if not talker
      prompt,
      response: {
        thinking,
        action,
        speaking,
        rawResponse,
      },
      success,
      error,
    };

    // Record the interaction by updating the component
    // Check if component has methods (is a class instance) or is a plain object
    if (!history || typeof history.getLastAnyInteraction !== 'function') {
      // Component is missing or broken (plain object without methods)
      // Recreate as proper class instance
      const newHistory = createLLMHistoryComponent(entity.id);

      // Preserve existing data if component exists
      if (history) {
        newHistory.lastTalkerInteraction = history.lastTalkerInteraction || null;
        newHistory.lastExecutorInteraction = history.lastExecutorInteraction || null;
      }

      // Add new interaction
      if (interaction.layer === 'talker') {
        newHistory.lastTalkerInteraction = interaction;
      } else {
        newHistory.lastExecutorInteraction = interaction;
      }

      // Replace component with fixed version
      if (history) {
        entity.removeComponent('llm_history');
      }
      entity.addComponent(newHistory);
    } else {
      // Component is a proper class instance - mutate it directly
      entity.updateComponent('llm_history', (current: any) => {
        if (interaction.layer === 'talker') {
          current.lastTalkerInteraction = interaction;
        } else {
          current.lastExecutorInteraction = interaction;
        }
        return current;  // Return the same instance, not a new object
      });
    }
  }
}
