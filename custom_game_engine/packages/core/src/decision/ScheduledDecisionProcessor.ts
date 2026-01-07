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

// Import LLMScheduler from llm package
// Note: This creates a dependency from @ai-village/core → @ai-village/llm
// which is acceptable since LLM integration is optional
import type { LLMScheduler, DecisionLayer } from '@ai-village/llm';

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

  constructor(scheduler: LLMScheduler) {
    this.scheduler = scheduler;
    this.autonomicSystem = new AutonomicSystem();
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
      // Cast world to any to handle World interface vs test helper class mismatch
      const decision = await this.scheduler.requestDecision(entity, world as any);

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

      // Apply decision to agent
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: parsed.behavior,
        behaviorState: parsed.behaviorState || {},
      }));

      return {
        changed: true,
        behavior: parsed.behavior,
        behaviorState: parsed.behaviorState || {},
        source: decision.layer as any, // Cast DecisionLayer to source type
        layer: decision.layer,
        reason: decision.reason,
      };
    } catch (error) {
      console.error(`[ScheduledDecisionProcessor] Error processing decision for ${entity.id}:`, error);
      return { changed: false, source: 'none' };
    }
  }

  /**
   * Process decision for an entity (synchronous version).
   *
   * This is a compatibility method for systems that can't use async.
   * It only checks autonomic layer and returns immediately if no autonomic override.
   *
   * For full scheduler functionality, use processAsync instead.
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent
  ): ScheduledDecisionResult {
    const currentPriority = getBehaviorPriority(agent.behavior);

    // Only autonomic layer in sync mode
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

    return { changed: false, source: 'none' };
  }

  /**
   * Parse LLM response (JSON or legacy text format).
   */
  private parseLLMResponse(response: string): { behavior: AgentBehavior; behaviorState?: Record<string, unknown> } | null {
    // Try JSON parse first (structured format)
    try {
      const parsed = JSON.parse(response);

      // New structured format with action object
      if (parsed.action && typeof parsed.action === 'object') {
        const action = parsed.action;
        const behavior = actionToBehavior(action);
        return { behavior, behaviorState: {} };
      }

      // Legacy format with action string - parse it
      if (parsed.action && typeof parsed.action === 'string') {
        const action = parseAction(parsed.action);
        if (action) {
          const behavior = actionToBehavior(action);
          return { behavior, behaviorState: {} };
        }
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
}
