/**
 * AgentBrainSystem - Thin orchestrator for agent AI
 *
 * This system coordinates perception, decision-making, and behavior execution
 * using the modular components extracted from the original AISystem.
 *
 * Architecture:
 * 1. Perception (VisionProcessor, HearingProcessor, MeetingDetector)
 * 2. Decision (AutonomicSystem, LLM/Scripted processors)
 * 3. Execution (BehaviorRegistry)
 *
 * Part of Phase 6 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import {
  hasBehaviorQueue,
  getCurrentQueuedBehavior,
  advanceBehaviorQueue,
  hasQueuedBehaviorTimedOut,
} from '../components/AgentComponent.js';

// Perception module
import { PerceptionProcessor } from '../perception/index.js';

// Decision module
import { DecisionProcessor, getBehaviorPriority } from '../decision/index.js';

// Behavior module
import { BehaviorRegistry, type BehaviorHandler } from '../behavior/BehaviorRegistry.js';

// Extracted behaviors
import {
  wanderBehavior,
  idleBehavior,
  seekSleepBehavior,
  forcedSleepBehavior,
  gatherBehavior,
  depositItemsBehavior,
  seekFoodBehavior,
  followAgentBehavior,
  talkBehavior,
  callMeetingBehavior,
  attendMeetingBehavior,
  farmBehavior,
  tillBehavior,
  buildBehavior,
  seekWarmthBehavior,
  navigateBehavior,
  exploreFrontierBehavior,
  exploreSpiralBehavior,
  followGradientBehavior,
} from '../behavior/behaviors/index.js';

// LLM types
import type { LLMDecisionQueue, PromptBuilder } from '../decision/LLMDecisionProcessor.js';

/**
 * AgentBrainSystem - The thin orchestrator (~300 lines as per design)
 *
 * Uses composition to delegate to specialized processors:
 * - PerceptionProcessor for sensory processing
 * - DecisionProcessor for behavior selection
 * - BehaviorRegistry for behavior execution
 *
 * Priority: 10 (same as AISystem, runs before movement at 20)
 */
export class AgentBrainSystem implements System {
  public readonly id: SystemId = 'agent-brain';
  public readonly priority: number = 10;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'agent',
    'position',
    'movement',
  ];

  private perception: PerceptionProcessor;
  private decision: DecisionProcessor;
  private behaviors: BehaviorRegistry;

  constructor(
    llmQueue?: LLMDecisionQueue,
    promptBuilder?: PromptBuilder,
    behaviorRegistry?: BehaviorRegistry
  ) {
    this.perception = new PerceptionProcessor();
    this.decision = new DecisionProcessor(llmQueue, promptBuilder);
    this.behaviors = behaviorRegistry ?? new BehaviorRegistry();

    // Register default behaviors if using a fresh registry
    if (!behaviorRegistry) {
      this.registerDefaultBehaviors();
    }
  }

  /**
   * Register all default extracted behaviors.
   */
  private registerDefaultBehaviors(): void {
    // Simple behaviors
    this.behaviors.register('wander', wanderBehavior, { description: 'Random wandering with home bias' });
    this.behaviors.register('idle', idleBehavior, { description: 'Stand still' });

    // Sleep behaviors
    this.behaviors.register('seek_sleep', seekSleepBehavior, { description: 'Find bed and sleep' });
    this.behaviors.register('forced_sleep', forcedSleepBehavior, { description: 'Collapse from exhaustion' });

    // Resource behaviors
    this.behaviors.register('gather', gatherBehavior, { description: 'Gather resources or seeds' });
    this.behaviors.register('deposit_items', depositItemsBehavior, { description: 'Deposit items to storage' });

    // Social behaviors
    this.behaviors.register('follow_agent', followAgentBehavior, { description: 'Follow another agent' });
    this.behaviors.register('talk', talkBehavior, { description: 'Engage in conversation' });
    this.behaviors.register('call_meeting', callMeetingBehavior, { description: 'Call a meeting' });
    this.behaviors.register('attend_meeting', attendMeetingBehavior, { description: 'Attend a meeting' });

    // Farm behaviors
    this.behaviors.register('farm', farmBehavior, { description: 'Farm action state' });
    this.behaviors.register('till', tillBehavior, { description: 'Till soil for farming' });

    // Build behaviors
    this.behaviors.register('build', buildBehavior, { description: 'Construct a building' });

    // Survival behaviors
    this.behaviors.register('seek_warmth', seekWarmthBehavior, { description: 'Find heat source' });

    // Navigation & Exploration behaviors
    this.behaviors.register('navigate', navigateBehavior, { description: 'Navigate to coordinates' });
    this.behaviors.register('explore_frontier', exploreFrontierBehavior, { description: 'Explore frontier areas' });
    this.behaviors.register('explore_spiral', exploreSpiralBehavior, { description: 'Spiral exploration pattern' });
    this.behaviors.register('follow_gradient', followGradientBehavior, { description: 'Follow social gradients' });

    // Food/hunger behavior
    this.behaviors.register('seek_food', seekFoodBehavior, { description: 'Find and eat food' });

    // Aliases for backward compatibility
    this.behaviors.register('pick', gatherBehavior, { description: 'Alias for gather' });
    this.behaviors.register('harvest', gatherBehavior, { description: 'Alias for gather' });
    this.behaviors.register('gather_seeds', gatherBehavior, { description: 'Alias for gather' });
  }

  /**
   * Register a behavior handler.
   */
  registerBehavior(
    name: string,
    handler: BehaviorHandler,
    options?: { description?: string; priority?: number }
  ): void {
    this.behaviors.register(name, handler, options);
  }

  /**
   * Get the behavior registry.
   */
  getBehaviorRegistry(): BehaviorRegistry {
    return this.behaviors;
  }

  /**
   * Main update loop.
   */
  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      let agent = impl.getComponent<AgentComponent>('agent');

      if (!agent) continue;

      // Check think interval
      if (!this.shouldThink(agent, world.tick)) continue;

      // Update last think time
      this.updateThinkTime(impl, world.tick);

      // Re-fetch agent component after updating think time
      agent = impl.getComponent<AgentComponent>('agent')!;

      // Phase 1: Perception
      this.perception.processAll(impl, world);

      // Phase 2: Decision
      const decisionResult = this.processDecision(impl, world, agent);

      // Phase 3: Execution
      if (decisionResult.execute) {
        this.behaviors.execute(decisionResult.behavior, impl, world);
      }
    }
  }

  /**
   * Check if agent should think this tick.
   */
  private shouldThink(agent: AgentComponent, currentTick: number): boolean {
    const ticksSinceLastThink = currentTick - agent.lastThinkTick;
    return ticksSinceLastThink >= agent.thinkInterval;
  }

  /**
   * Update agent's last think timestamp.
   */
  private updateThinkTime(entity: EntityImpl, tick: number): void {
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      lastThinkTick: tick,
    }));
  }

  /**
   * Process decision making for an agent.
   * Returns the behavior to execute.
   */
  private processDecision(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent
  ): { behavior: string; execute: boolean } {
    // Layer 1: Autonomic check
    const autonomicResult = this.decision.processAutonomic(entity);

    if (autonomicResult) {
      const currentPriority = getBehaviorPriority(agent.behavior);

      if (autonomicResult.priority > currentPriority) {
        // Handle queue interruption
        if (hasBehaviorQueue(agent) && !agent.queuePaused) {
          world.eventBus.emit({
            type: 'agent:queue:interrupted',
            source: entity.id,
            data: {
              agentId: entity.id,
              reason: 'autonomic_override',
              interruptedBy: autonomicResult.behavior,
            },
          });

          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: autonomicResult.behavior,
            behaviorState: {},
            queuePaused: true,
            queueInterruptedBy: autonomicResult.behavior,
          }));
        } else {
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: autonomicResult.behavior,
            behaviorState: {},
          }));
        }

        return { behavior: autonomicResult.behavior, execute: true };
      }
    }

    // Resume paused queue if autonomic needs are satisfied
    if (agent.queuePaused && !autonomicResult) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        queuePaused: false,
        queueInterruptedBy: undefined,
      }));

      world.eventBus.emit({
        type: 'agent:queue:resumed',
        source: entity.id,
        data: {
          agentId: entity.id,
          resumedAt: agent.currentQueueIndex,
        },
      });
    }

    // Layer 2: Behavior Queue
    if (hasBehaviorQueue(agent) && !agent.queuePaused) {
      const queueResult = this.processQueue(entity, world, agent);
      if (queueResult) {
        return queueResult;
      }
    }

    // Layer 3: LLM or Scripted
    const decisionResult = this.decision.process(
      entity,
      world,
      agent,
      this.getNearbyAgents.bind(this)
    );

    if (decisionResult.changed && decisionResult.behavior) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: decisionResult.behavior!,
        behaviorState: decisionResult.behaviorState ?? {},
      }));

      return { behavior: decisionResult.behavior, execute: true };
    }

    // Continue current behavior
    return { behavior: agent.behavior, execute: true };
  }

  /**
   * Process behavior queue.
   */
  private processQueue(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent
  ): { behavior: string; execute: boolean } | null {
    const currentQueued = getCurrentQueuedBehavior(agent);

    if (!currentQueued) {
      // Clear invalid queue
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorQueue: undefined,
        currentQueueIndex: undefined,
        queuePaused: undefined,
      }));
      return null;
    }

    // Check for timeout
    if (hasQueuedBehaviorTimedOut(agent, world.tick)) {
      const updatedAgent = advanceBehaviorQueue(agent, world.tick);
      entity.updateComponent<AgentComponent>('agent', () => updatedAgent);

      if (!hasBehaviorQueue(updatedAgent)) {
        world.eventBus.emit({
          type: 'agent:queue:completed',
          source: entity.id,
          data: { agentId: entity.id },
        });
        return null;
      }
    }

    // Check if current behavior completed
    if (agent.behaviorCompleted) {
      const updatedAgent = advanceBehaviorQueue(agent, world.tick);

      if (!hasBehaviorQueue(updatedAgent)) {
        // Queue is complete, clear it and emit event
        entity.updateComponent<AgentComponent>('agent', () => updatedAgent);
        world.eventBus.emit({
          type: 'agent:queue:completed',
          source: entity.id,
          data: { agentId: entity.id },
        });
        return null;
      }

      // Get next behavior and update agent state in a single update
      const nextQueued = getCurrentQueuedBehavior(updatedAgent);
      if (nextQueued) {
        entity.updateComponent<AgentComponent>('agent', () => ({
          ...updatedAgent,
          behavior: nextQueued.behavior,
          behaviorState: nextQueued.behaviorState ?? {},
        }));
        return { behavior: nextQueued.behavior, execute: true };
      }
    }

    // Ensure agent is executing the current queued behavior
    if (agent.behavior !== currentQueued.behavior) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: currentQueued.behavior,
        behaviorState: currentQueued.behaviorState ?? {},
      }));
    }

    // Continue current queued behavior
    return { behavior: currentQueued.behavior, execute: true };
  }

  /**
   * Get nearby agents for social behaviors.
   */
  private getNearbyAgents(
    entity: EntityImpl,
    world: World,
    range: number
  ): Entity[] {
    const position = entity.getComponent('position') as any;
    if (!position) return [];

    const agents = world.query().with('agent').with('position').executeEntities();

    return agents.filter((other) => {
      if (other.id === entity.id) return false;

      const otherPos = (other as EntityImpl).getComponent('position') as any;
      if (!otherPos) return false;

      const dx = otherPos.x - position.x;
      const dy = otherPos.y - position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      return dist <= range;
    });
  }
}

/**
 * Factory function for creating AgentBrainSystem with optional dependencies.
 */
export function createAgentBrainSystem(options?: {
  llmQueue?: LLMDecisionQueue;
  promptBuilder?: PromptBuilder;
  behaviorRegistry?: BehaviorRegistry;
}): AgentBrainSystem {
  return new AgentBrainSystem(
    options?.llmQueue,
    options?.promptBuilder,
    options?.behaviorRegistry
  );
}
