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

// LLM Decision Processor (original - kept for backward compatibility)
export {
  LLMDecisionProcessor,
  initLLMDecisionProcessor,
  getLLMDecisionProcessor,
  type LLMDecisionResult,
  type LLMDecisionQueue,
  type PromptBuilder,
} from './LLMDecisionProcessor.js';

// Talker LLM Processor (Layer 2: Conversation, goals, social)
export {
  TalkerLLMProcessor,
  type TalkerDecisionResult,
  type TalkerPromptBuilder,
  type TalkerProcessorConfig,
} from './TalkerLLMProcessor.js';

// Executor LLM Processor (Layer 3: Task planning, multi-step actions)
export {
  ExecutorLLMProcessor,
  type ExecutorDecisionResult,
  type ExecutorPromptBuilder,
  type ExecutorProcessorConfig,
} from './ExecutorLLMProcessor.js';

// Scripted Decision Processor
export {
  ScriptedDecisionProcessor,
  processScriptedDecision,
  type ScriptedDecisionResult,
} from './ScriptedDecisionProcessor.js';

// Scheduled Decision Processor (uses LLMScheduler for intelligent layer selection)
export {
  ScheduledDecisionProcessor,
  type ScheduledDecisionResult,
} from './ScheduledDecisionProcessor.js';

// Spell Utility Calculator (Magic System integration)
export {
  SpellUtilityCalculator,
  suggestSpells,
  type SpellSuggestion,
  type SpellUtilityContext,
} from './SpellUtilityCalculator.js';

// Import classes for DecisionProcessor orchestrator
import { AutonomicSystem as AutonomicSystemClass, type AutonomicResult as AutonomicResultType } from './AutonomicSystem.js';
import { getBehaviorPriority as getBehaviorPriorityFn } from './BehaviorPriority.js';
import { LLMDecisionProcessor as LLMDecisionProcessorClass, type LLMDecisionResult as LLMDecisionResultType, type LLMDecisionQueue, type PromptBuilder } from './LLMDecisionProcessor.js';
import { TalkerLLMProcessor as TalkerLLMProcessorClass, type TalkerDecisionResult as TalkerDecisionResultType, type TalkerPromptBuilder } from './TalkerLLMProcessor.js';
import { ExecutorLLMProcessor as ExecutorLLMProcessorClass, type ExecutorDecisionResult as ExecutorDecisionResultType, type ExecutorPromptBuilder } from './ExecutorLLMProcessor.js';
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
  source: 'autonomic' | 'llm' | 'talker' | 'executor' | 'scripted' | 'queue' | 'fallback' | 'none';
  priority?: number;
  reason?: string;
}

/**
 * DecisionProcessor - Orchestrates all decision processing
 *
 * Runs decision layers in priority order:
 * 1. Autonomic (highest priority - survival)
 * 2. Talker LLM (conversation, goals, social)
 * 3. Executor LLM (task planning, multi-step actions)
 * 4. Scripted (fallback behavior)
 *
 * Usage:
 * ```typescript
 * // Three-layer architecture (recommended)
 * const decision = new DecisionProcessor(
 *   llmQueue,
 *   null,  // old promptBuilder (deprecated)
 *   talkerPromptBuilder,
 *   executorPromptBuilder
 * );
 *
 * // Backward compatible (single LLM)
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
  private talkerProcessor: TalkerLLMProcessorClass | null;
  private executorProcessor: ExecutorLLMProcessorClass | null;
  private scriptedProcessor: ScriptedDecisionProcessorClass;
  private useSplitLLM: boolean; // True if using Talker+Executor, false if using single LLM

  constructor(
    llmQueue?: LLMDecisionQueue,
    promptBuilder?: PromptBuilder,
    talkerPromptBuilder?: TalkerPromptBuilder,
    executorPromptBuilder?: ExecutorPromptBuilder
  ) {
    this.autonomicSystem = new AutonomicSystemClass();

    // Check if we're using the new split architecture (Talker + Executor)
    this.useSplitLLM = !!(llmQueue && talkerPromptBuilder && executorPromptBuilder);

    if (this.useSplitLLM) {
      // Three-layer architecture (Autonomic → Talker → Executor)
      this.talkerProcessor = new TalkerLLMProcessorClass(llmQueue!, talkerPromptBuilder!);
      this.executorProcessor = new ExecutorLLMProcessorClass(llmQueue!, executorPromptBuilder!);
      this.llmProcessor = null; // Disable old single LLM
    } else {
      // Backward compatible single LLM
      this.llmProcessor = llmQueue && promptBuilder ? new LLMDecisionProcessorClass(llmQueue, promptBuilder) : null;
      this.talkerProcessor = null;
      this.executorProcessor = null;
    }

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

    // Layer 2 & 3: Split LLM (Talker + Executor)
    if (agent.useLLM && this.useSplitLLM && this.talkerProcessor && this.executorProcessor) {
      // Layer 2a: Talker (conversation, goals, social)
      const talkerResult = this.talkerProcessor.process(entity, world, agent, getNearbyAgents);
      if (talkerResult.changed) {
        // Talker changed something (goals, priorities, or behavior)
        return {
          changed: true,
          behavior: talkerResult.behavior,
          behaviorState: talkerResult.behaviorState,
          source: 'talker',
        };
      }

      // Layer 2b: Executor (task planning, multi-step actions)
      // Executor runs AFTER Talker to read updated goals/priorities
      const executorResult = this.executorProcessor.process(entity, world, agent, getNearbyAgents);
      if (executorResult.changed) {
        return {
          changed: true,
          behavior: executorResult.behavior,
          behaviorState: executorResult.behaviorState,
          source: executorResult.source === 'fallback' ? 'fallback' : 'executor',
        };
      }

      // LLM agent - don't fall through to scripted
      return { changed: false, source: 'none' };
    }

    // Layer 2: Single LLM (backward compatible)
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
