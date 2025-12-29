/**
 * Decision Module
 *
 * This module contains processors for agent decision-making:
 * - AutonomicSystem: Fast survival reflexes (hunger, sleep, warmth)
 * - BehaviorPriority: Priority calculations for behaviors
 * - LLMDecisionProcessor: LLM-based decision making
 * - ScriptedDecisionProcessor: Scripted behavior logic
 *
 * Part of Phase 4 of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Autonomic System
export {
  AutonomicSystem,
  checkAutonomicNeeds,
  isCriticalBehavior,
  type AutonomicResult,
} from './AutonomicSystem.js';

// Behavior Priority
export {
  getBehaviorPriority,
  getBehaviorPriorityConfig,
  canInterrupt,
  isCriticalSurvivalBehavior,
  getSortedBehaviors,
  type BehaviorPriorityConfig,
} from './BehaviorPriority.js';

// LLM Decision Processor
export {
  LLMDecisionProcessor,
  initLLMDecisionProcessor,
  getLLMDecisionProcessor,
  type LLMDecisionResult,
  type LLMDecisionQueue,
  type PromptBuilder,
} from './LLMDecisionProcessor.js';

// Scripted Decision Processor
export {
  ScriptedDecisionProcessor,
  processScriptedDecision,
  type ScriptedDecisionResult,
} from './ScriptedDecisionProcessor.js';

// Import classes for DecisionProcessor orchestrator
import { AutonomicSystem as AutonomicSystemClass, type AutonomicResult as AutonomicResultType } from './AutonomicSystem.js';
import { getBehaviorPriority as getBehaviorPriorityFn } from './BehaviorPriority.js';
import { LLMDecisionProcessor as LLMDecisionProcessorClass, type LLMDecisionResult as LLMDecisionResultType, type LLMDecisionQueue, type PromptBuilder } from './LLMDecisionProcessor.js';
import { ScriptedDecisionProcessor as ScriptedDecisionProcessorClass, type ScriptedDecisionResult as ScriptedDecisionResultType } from './ScriptedDecisionProcessor.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent, AgentBehavior } from '../components/AgentComponent.js';

/**
 * Combined decision result
 */
export interface DecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  source: 'autonomic' | 'llm' | 'scripted' | 'queue' | 'fallback' | 'none';
  priority?: number;
  reason?: string;
}

/**
 * DecisionProcessor - Orchestrates all decision processing
 *
 * Runs decision layers in priority order:
 * 1. Autonomic (highest priority - survival)
 * 2. Behavior Queue (player-ordered tasks)
 * 3. LLM or Scripted (agent planning)
 *
 * Usage:
 * ```typescript
 * const decision = new DecisionProcessor(llmQueue, promptBuilder);
 *
 * // In system update loop
 * const result = decision.process(entity, world, agent, getNearbyAgents);
 * if (result.changed) {
 *   // Behavior was updated
 * }
 * ```
 */
export class DecisionProcessor {
  private autonomicSystem: AutonomicSystemClass;
  private llmProcessor: LLMDecisionProcessorClass | null;
  private scriptedProcessor: ScriptedDecisionProcessorClass;

  constructor(llmQueue?: LLMDecisionQueue, promptBuilder?: PromptBuilder) {
    this.autonomicSystem = new AutonomicSystemClass();
    this.llmProcessor = llmQueue && promptBuilder ? new LLMDecisionProcessorClass(llmQueue, promptBuilder) : null;
    this.scriptedProcessor = new ScriptedDecisionProcessorClass();
  }

  /**
   * Process decision for an entity.
   * Runs decision layers in priority order.
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): DecisionResult {
    const currentPriority = getBehaviorPriorityFn(agent.behavior);

    // Layer 1: Autonomic (highest priority)
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
        priority: autonomicResult.priority,
        reason: autonomicResult.reason,
      };
    }

    // Layer 2: LLM (if enabled)
    if (agent.useLLM && this.llmProcessor) {
      const llmResult = this.llmProcessor.process(entity, world, agent, getNearbyAgents);
      if (llmResult.changed) {
        return {
          changed: true,
          behavior: llmResult.behavior,
          behaviorState: llmResult.behaviorState,
          source: llmResult.source === 'fallback' ? 'fallback' : 'llm',
        };
      }
      // LLM agent - don't fall through to scripted
      return { changed: false, source: 'none' };
    }

    // Layer 3: Scripted
    const scriptedResult = this.scriptedProcessor.process(entity, world, getNearbyAgents);
    if (scriptedResult.changed) {
      return {
        changed: true,
        behavior: scriptedResult.behavior,
        behaviorState: scriptedResult.behaviorState,
        source: 'scripted',
      };
    }

    return { changed: false, source: 'none' };
  }

  /**
   * Process only autonomic decisions.
   */
  processAutonomic(entity: EntityImpl): AutonomicResultType | null {
    return this.autonomicSystem.check(entity);
  }

  /**
   * Process only LLM decisions.
   */
  processLLM(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): LLMDecisionResultType | null {
    if (!this.llmProcessor) return null;
    return this.llmProcessor.process(entity, world, agent, getNearbyAgents);
  }

  /**
   * Process only scripted decisions.
   */
  processScripted(
    entity: EntityImpl,
    world: World,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ScriptedDecisionResultType {
    return this.scriptedProcessor.process(entity, world, getNearbyAgents);
  }
}
