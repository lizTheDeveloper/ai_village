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
 *
 * Dependencies:
 * - TimeSystem (priority 10): Must run after time tick is updated
 *   - Uses world.tick for think intervals and timing
 *   - Checks ticksSinceLastThink for agent processing
 *
 * - NeedsSystem: Must run before or at same priority
 *   - Reads needs (hunger, thirst, energy) for autonomic behavior priorities
 *   - Used by AutonomicSystem to determine urgent needs (seek_food, seek_sleep)
 *
 * - TemperatureSystem (priority 20): Should run before brain decisions
 *   - Reads temperature comfort for autonomic behavior priorities
 *   - Used to trigger seek_warmth/seek_cooling behaviors
 *
 * Related Systems:
 * - SteeringSystem (priority 95): Executes movement decisions from behaviors
 * - MovementSystem (priority 20): Applies velocity to position after steering
 * - BehaviorRegistry: Executes chosen behaviors (gather, build, wander, etc.)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import {
  hasBehaviorQueue,
  getCurrentQueuedBehavior,
  advanceBehaviorQueue,
  hasQueuedBehaviorTimedOut,
} from '../components/AgentComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

// Perception module
import { PerceptionProcessor } from '../perception/index.js';

// Decision module
import { DecisionProcessor, ScheduledDecisionProcessor, getBehaviorPriority } from '../decision/index.js';

// Behavior module
import { BehaviorRegistry, type BehaviorHandler } from '../behavior/BehaviorRegistry.js';

// Extracted behaviors
import {
  wanderBehavior,
  idleBehavior,
  seekSleepBehavior,
  forcedSleepBehavior,
  fleeToHomeBehavior,
  gatherBehavior,
  depositItemsBehavior,
  seekFoodBehavior,
  followAgentBehavior,
  talkBehavior,
  callMeetingBehavior,
  attendMeetingBehavior,
  initiateCombatBehavior,
  initiateHuntBehavior,
  butcherBehavior,
  farmBehavior,
  tillBehavior,
  plantBehavior,
  waterBehavior,
  buildBehavior,
  craftBehavior,
  researchBehavior,
  tradeBehavior,
  castSpellBehavior,
  seekWarmthBehavior,
  seekCoolingBehavior,
  navigateBehavior,
  exploreFrontierBehavior,
  exploreSpiralBehavior,
  followGradientBehavior,
  materialTransportBehavior,
  tileBuildBehavior,
  tameAnimalBehavior,
  houseAnimalBehavior,
  prayBehavior,
} from '../behavior/behaviors/index.js';

// Reporter-specific behaviors
import { followReportingTargetBehavior } from '../behaviors/FollowReportingTargetBehavior.js';

// Exploration behaviors
import { exploreBehavior } from '../behaviors/ExploreBehavior.js';

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
export class AgentBrainSystem extends BaseSystem {
  public readonly id: SystemId = 'agent-brain';
  public readonly priority: number = 10;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Agent,
    CT.Position,
    CT.Movement,
  ];
  // Only run when agent components exist (O(1) activation check)
  public readonly activationComponents = [CT.Agent] as const;
  protected readonly throttleInterval = 10; // FAST - 0.5 seconds

  private perception: PerceptionProcessor;
  private decision: DecisionProcessor | ScheduledDecisionProcessor;
  private behaviors: BehaviorRegistry;
  private useScheduler: boolean = false;

  // ========== PERFORMANCE OPTIMIZATION: Entity Caching ==========
  // Cache agents query to avoid O(N²) in shouldThink()
  private allAgentsCache: ReadonlyArray<Entity> = [];
  private allAgentsCacheTick: number = -1;
  private agentIndexMap: Map<string, number> = new Map();

  // ========== PERFORMANCE OPTIMIZATION: Precomputed Constants ==========
  private readonly SOCIAL_BEHAVIOR_RANGE = 15;
  private readonly SOCIAL_BEHAVIOR_RANGE_SQ = 15 * 15;
  private readonly HEARING_RANGE = 20;
  private readonly HEARING_RANGE_SQ = 20 * 20;

  constructor(
    llmQueue?: LLMDecisionQueue,
    promptBuilder?: PromptBuilder,
    behaviorRegistry?: BehaviorRegistry,
    scheduledProcessor?: ScheduledDecisionProcessor
  ) {
    super();
    this.perception = new PerceptionProcessor();

    // Use ScheduledDecisionProcessor if provided (new scheduler-based approach)
    if (scheduledProcessor) {
      this.decision = scheduledProcessor;
      this.useScheduler = true;
    } else {
      // Backward compatible: use DecisionProcessor
      this.decision = new DecisionProcessor(llmQueue, promptBuilder);
      this.useScheduler = false;
    }

    this.behaviors = behaviorRegistry ?? new BehaviorRegistry();

    // Register default behaviors if using a fresh registry
    if (!behaviorRegistry) {
      this.registerDefaultBehaviors();
    }
  }

  /**
   * Initialize system with event bus subscriptions
   */
  protected onInitialize(_world: World, eventBus: import('../events/EventBus.js').EventBus): void {
    // Subscribe to inventory:full event to auto-switch to deposit_items behavior
    eventBus.subscribe('inventory:full', (event) => {
      const { entityId } = event.data as { entityId: string; agentId: string };
      const agent = _world.getEntity(entityId);

      if (!agent || !agent.hasComponent(CT.Agent)) {
        return;
      }

      const agentComp = agent.getComponent<AgentComponent>(CT.Agent);
      if (!agentComp) {
        return;
      }

      // Don't interrupt if already depositing items
      if (agentComp.behavior === 'deposit_items') {
        return;
      }

      // Save current behavior and switch to deposit_items
      (agent as EntityImpl).updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        previousBehavior: current.behavior,
        behavior: 'deposit_items',
        behaviorState: {
          previousBehavior: current.behavior,
        },
      }));
    });
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
    this.behaviors.register('flee_to_home', fleeToHomeBehavior, { description: 'Return to assigned bed when hurt or frightened' });

    // Resource behaviors
    this.behaviors.register('gather', gatherBehavior, { description: 'Gather resources or seeds' });
    this.behaviors.register('deposit_items', depositItemsBehavior, { description: 'Deposit items to storage' });

    // Social behaviors
    this.behaviors.register('follow_agent', followAgentBehavior, { description: 'Follow another agent' });
    this.behaviors.register('talk', talkBehavior, { description: 'Engage in conversation' });
    this.behaviors.register('call_meeting', callMeetingBehavior, { description: 'Call a meeting' });
    this.behaviors.register('attend_meeting', attendMeetingBehavior, { description: 'Attend a meeting' });

    // Combat behaviors
    this.behaviors.register('initiate_combat', initiateCombatBehavior, { description: 'Initiate combat with target' });

    // Hunting behaviors
    this.behaviors.register('hunt', initiateHuntBehavior, { description: 'Hunt wild animals for food and resources' });
    this.behaviors.register('butcher', butcherBehavior, { description: 'Butcher tame animals for meat and resources' });

    // Animal husbandry behaviors
    this.behaviors.register('tame_animal', tameAnimalBehavior, { description: 'Approach and tame a wild animal' });
    this.behaviors.register('house_animal', houseAnimalBehavior, { description: 'Lead a tamed animal to its housing' });

    // Farm behaviors
    this.behaviors.register('farm', farmBehavior, { description: 'Farm action state' });
    this.behaviors.register('till', tillBehavior, { description: 'Till soil for farming' });
    this.behaviors.register(CT.Plant, plantBehavior, { description: 'Plant seeds in tilled soil' });
    this.behaviors.register('water', waterBehavior, { description: 'Water dry plants' });

    // Build behaviors
    this.behaviors.register('build', buildBehavior, { description: 'Construct a building' });
    this.behaviors.register('material_transport', materialTransportBehavior, { description: 'Transport materials to construction site' });
    this.behaviors.register('tile_build', tileBuildBehavior, { description: 'Place tiles at construction site' });

    // Crafting behaviors
    this.behaviors.register('craft', craftBehavior, { description: 'Craft items at stations' });

    // Research behaviors
    this.behaviors.register('research', researchBehavior, { description: 'Conduct research at research buildings' });

    // Trade behaviors
    this.behaviors.register('trade', tradeBehavior, { description: 'Buy or sell items at shops' });

    // Magic behaviors
    this.behaviors.register('cast_spell', castSpellBehavior, { description: 'Cast a spell' });

    // Survival behaviors
    this.behaviors.register('seek_warmth', seekWarmthBehavior, { description: 'Find heat source' });
    this.behaviors.register('seek_cooling', seekCoolingBehavior, { description: 'Find cooling/shade' });

    // Spiritual behaviors
    this.behaviors.register('pray', prayBehavior, { description: 'Pray to deity' });

    // Navigation & Exploration behaviors
    this.behaviors.register('navigate', navigateBehavior, { description: 'Navigate to coordinates' });
    this.behaviors.register('follow_reporting_target', followReportingTargetBehavior, { description: 'Follow entity at safe distance (reporters)' });
    this.behaviors.register('explore', exploreBehavior, { description: 'Explore unvisited/ungenerated chunks' });
    this.behaviors.register('explore_frontier', exploreFrontierBehavior, { description: 'Explore frontier areas' });
    this.behaviors.register('explore_spiral', exploreSpiralBehavior, { description: 'Spiral exploration pattern' });
    this.behaviors.register('follow_gradient', followGradientBehavior, { description: 'Follow social gradients' });

    // Food/hunger behavior
    this.behaviors.register('seek_food', seekFoodBehavior, { description: 'Find and eat food' });

    // Aliases for backward compatibility
    this.behaviors.register('pick', gatherBehavior, { description: 'Alias for gather' });
    this.behaviors.register('harvest', gatherBehavior, { description: 'Alias for gather' });
    this.behaviors.register('gather_seeds', gatherBehavior, { description: 'Alias for gather' });
    this.behaviors.register('rest', idleBehavior, { description: 'Alias for idle (rest is recovery-focused idle)' });
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
   *
   * PERFORMANCE OPTIMIZATIONS (2026-01-18):
   * - Early exits for player-controlled/dead agents
   * - Staggered think intervals to distribute load
   * - Performance timing only on slow frames (>10ms)
   */
  protected onUpdate(ctx: SystemContext): void {
    const startTime = performance.now();
    let perceptionTime = 0;
    let decisionTime = 0;
    let executionTime = 0;
    let thinkingAgents = 0;

    // ========== EARLY EXIT: No agents ==========
    if (ctx.activeEntities.length === 0) {
      return;
    }

    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      let agent = impl.getComponent<AgentComponent>(CT.Agent);

      // ========== EARLY EXIT: No agent component ==========
      if (!agent) continue;

      // ========== EARLY EXIT: Player-controlled (Phase 16: Player Avatar System) ==========
      if (agent.behavior === 'player_controlled') continue;

      // ========== EARLY EXIT: Dead agents (health <= 0) - unless in afterlife ==========
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);
      if (needs && needs.health <= 0) {
        // Check if they're in the afterlife - souls can still think
        const afterlife = impl.getComponent<AfterlifeComponent>('afterlife' as CT);
        if (!afterlife) continue; // Not yet transitioned - skip
        if (afterlife.isShade) continue; // Lost identity - can't think
        if (afterlife.hasPassedOn) continue; // Gone - no more thinking
        // Otherwise, afterlife soul can think
      }

      // ========== EARLY EXIT: Not time to think (dynamic staggering) ==========
      const shouldThink = this.shouldThink(impl, agent, ctx.world);
      if (!shouldThink) continue;

      thinkingAgents++;

      // Update last think time
      this.updateThinkTime(impl, ctx.tick);

      // Re-fetch agent component after updating think time
      agent = impl.getComponent<AgentComponent>(CT.Agent)!;

      // Phase 1: Perception
      const p1 = performance.now();
      this.perception.processAll(impl, ctx.world);
      perceptionTime += performance.now() - p1;

      // Phase 2: Decision
      const p2 = performance.now();
      const decisionResult = this.processDecision(impl, ctx.world, agent);
      decisionTime += performance.now() - p2;

      // Phase 3: Execution
      if (decisionResult.execute) {
        const p3 = performance.now();
        this.behaviors.execute(decisionResult.behavior, impl, ctx.world);
        executionTime += performance.now() - p3;
      }
    }

    // Only log performance on slow frames (>10ms) to reduce console spam
    const totalTime = performance.now() - startTime;
    if (totalTime > 10 && thinkingAgents > 0) {
      console.log(`[AgentBrainSystem] ${totalTime.toFixed(1)}ms total | ${thinkingAgents} agents | perception:${perceptionTime.toFixed(1)}ms decision:${decisionTime.toFixed(1)}ms execution:${executionTime.toFixed(1)}ms`);
    }
  }

  /**
   * Check if agent should think this tick with dynamic staggering.
   *
   * Agents are staggered based on their position in the agent list to distribute
   * LLM requests evenly across time. With 5 agents and thinkInterval=20:
   * - Agent 0: thinks at ticks 0, 20, 40... (offset 0)
   * - Agent 1: thinks at ticks 4, 24, 44... (offset 4)
   * - Agent 2: thinks at ticks 8, 28, 48... (offset 8)
   * - Agent 3: thinks at ticks 12, 32, 52... (offset 12)
   * - Agent 4: thinks at ticks 16, 36, 56... (offset 16)
   */
  private shouldThink(entity: EntityImpl, agent: AgentComponent, world: World): boolean {
    const currentTick = world.tick;
    const ticksSinceLastThink = currentTick - agent.lastThinkTick;

    // Handle save/load case where lastThinkTick is in the future (world tick reset to 0)
    // If negative, agent should think immediately
    if (ticksSinceLastThink < 0) {
      return true;
    }

    // Dynamic staggering: distribute agents evenly across think interval
    // This prevents all agents from thinking simultaneously
    // Cache agents list once per tick to avoid O(N²) query-in-loop
    if (world.tick !== this.allAgentsCacheTick) {
      this.allAgentsCache = world.query().with(CT.Agent).executeEntities();
      this.allAgentsCacheTick = world.tick;

      // Build index map for O(1) lookups instead of O(N) findIndex
      this.agentIndexMap.clear();
      for (let i = 0; i < this.allAgentsCache.length; i++) {
        this.agentIndexMap.set(this.allAgentsCache[i]!.id, i);
      }
    }
    const allAgents = this.allAgentsCache;
    const agentCount = allAgents.length;

    if (agentCount <= 1) {
      // No staggering needed for single agent
      return ticksSinceLastThink >= agent.thinkInterval;
    }

    // Find this agent's index in the list (stable ordering) - O(1) lookup via Map
    const agentIndex = this.agentIndexMap.get(entity.id);
    if (agentIndex === undefined) {
      // Agent not found (shouldn't happen), think immediately
      return true;
    }

    // Calculate stagger offset: spread agents evenly across think interval
    const staggerOffset = Math.floor((agentIndex * agent.thinkInterval) / agentCount);

    // Check if enough time has passed since last think, accounting for stagger
    // Agent should think when: (currentTick - staggerOffset) >= (lastThinkTick + thinkInterval)
    const adjustedTick = currentTick - staggerOffset;
    const nextThinkTick = agent.lastThinkTick + agent.thinkInterval;

    return adjustedTick >= nextThinkTick;
  }

  /**
   * Update agent's last think timestamp.
   */
  private updateThinkTime(entity: EntityImpl, tick: number): void {
    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
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
    // console.log(`[AgentBrainSystem] processDecision for ${entity.id.substring(0, 8)}: autonomicResult=${JSON.stringify(autonomicResult)}`);

    if (autonomicResult) {
      const temperature = entity.getComponent(CT.Temperature) as TemperatureComponent | undefined;
      const needs = entity.getComponent(CT.Needs) as NeedsComponent | undefined;
      const currentPriority = getBehaviorPriority(agent.behavior, temperature, needs);

      // Execute autonomic behavior if:
      // 1. It has higher priority than current behavior, OR
      // 2. Agent is already in the autonomic-required behavior (continue executing it)
      const shouldExecuteAutonomic = autonomicResult.priority > currentPriority ||
        agent.behavior === autonomicResult.behavior;

      if (shouldExecuteAutonomic) {
        const fromBehavior = agent.behavior;
        const toBehavior = autonomicResult.behavior;
        const isChangingBehavior = fromBehavior !== toBehavior;

        // Only update agent component if actually changing behavior
        // (avoids resetting behaviorState when continuing same behavior)
        if (isChangingBehavior) {
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

            entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
              ...current,
              behavior: autonomicResult.behavior,
              behaviorState: {},
              queuePaused: true,
              queueInterruptedBy: autonomicResult.behavior,
            }));
          } else {
            entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
              ...current,
              behavior: autonomicResult.behavior,
              behaviorState: {},
            }));
          }

          // Emit behavior:change event for metrics
          world.eventBus.emit({
            type: 'behavior:change',
            source: entity.id,
            data: {
              agentId: entity.id,
              from: fromBehavior,
              to: toBehavior,
              reason: 'autonomic',
            },
          });
        }

        return { behavior: autonomicResult.behavior, execute: true };
      }
    }

    // Resume paused queue if autonomic needs are satisfied
    if (agent.queuePaused && !autonomicResult) {
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
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

    // Layer 2.5: Non-queued behavior completion check
    // When a productive behavior completes (sets behaviorCompleted: true) outside of a queue,
    // we need to reset to idle so the LLM can choose a new behavior
    if (agent.behaviorCompleted && !hasBehaviorQueue(agent)) {
      const identity = entity.getComponent<IdentityComponent>(CT.Identity);
      const agentName = identity?.name || entity.id.slice(0, 8);
      console.log(`[AgentBrainSystem] ${agentName}: behavior '${agent.behavior}' completed, requesting new decision`);

      // Clear the flag and reset to idle - this will trigger a new LLM decision
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behavior: 'idle',
        behaviorCompleted: false,
        behaviorState: {},
        behaviorChangedAt: world.tick,
        previousBehavior: current.behavior,
      }));

      // Emit behavior change event
      world.eventBus.emit({
        type: 'behavior:change',
        source: entity.id,
        data: {
          agentId: entity.id,
          from: agent.behavior,
          to: 'idle',
          reason: 'behavior_completed',
        },
      });

      // Return idle but don't execute - let LLM decide next action
      return { behavior: 'idle', execute: false };
    }

    // Layer 3: LLM or Scripted (both use sync queue+poll pattern now)
    const decisionResult = this.decision.process(
      entity,
      world,
      agent,
      this.getNearbyAgents.bind(this)
    );

    if (decisionResult.changed && decisionResult.behavior) {
      const fromBehavior = agent.behavior;
      const toBehavior = decisionResult.behavior;

      const currentTick = world.tick;
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behavior: decisionResult.behavior!,
        behaviorState: decisionResult.behaviorState ?? {},
        // Timing instrumentation
        behaviorChangedAt: currentTick,
        previousBehavior: current.behavior,
      }));

      // Emit behavior:change event for metrics with timing
      if (fromBehavior !== toBehavior) {
        const previousChangedAt = agent.behaviorChangedAt;
        const durationTicks = previousChangedAt ? currentTick - previousChangedAt : 0;
        const durationSeconds = durationTicks / 20; // 20 TPS

        // Get agent name for readable logging
        const identity = entity.getComponent<IdentityComponent>(CT.Identity);
        const agentName = identity?.name || entity.id.slice(0, 8);

        // Log behavior transitions for validation
        console.log(
          `[BehaviorTiming] ${agentName}: ${fromBehavior} → ${toBehavior} ` +
          `(held ${fromBehavior} for ${Math.round(durationSeconds * 10) / 10}s / ${durationTicks} ticks)`
        );

        world.eventBus.emit({
          type: 'behavior:change',
          source: entity.id,
          data: {
            agentId: entity.id,
            from: fromBehavior,
            to: toBehavior,
            reason: 'decision',
            layer: ('layer' in decisionResult ? decisionResult.layer : 'unknown') as string,
          },
        });
      }

      return { behavior: decisionResult.behavior, execute: true };
    }

    // Don't execute default/fallback behaviors UNLESS the LLM explicitly requested them
    // This allows agents to stand still while waiting for LLM decisions
    // but still execute wander/rest/explore if the LLM specifically chose them
    const defaultBehaviors = ['idle', 'wander', 'explore', 'explore_frontier', 'explore_spiral', 'rest'];
    if (defaultBehaviors.includes(agent.behavior) && !decisionResult.changed) {
      return { behavior: agent.behavior, execute: false };
    }

    // Continue current productive behavior
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
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
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
      entity.updateComponent<AgentComponent>(CT.Agent, () => updatedAgent);

      if (!hasBehaviorQueue(updatedAgent)) {
        // Clear executor sleep flag when queue completes
        entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
          ...current,
          executorSleepUntilQueueComplete: undefined,
        }));
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
        entity.updateComponent<AgentComponent>(CT.Agent, () => updatedAgent);
        // Clear executor sleep flag when queue completes
        entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
          ...current,
          executorSleepUntilQueueComplete: undefined,
        }));
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
        const fromBehavior = agent.behavior;
        const toBehavior = nextQueued.behavior;

        entity.updateComponent<AgentComponent>(CT.Agent, () => ({
          ...updatedAgent,
          behavior: nextQueued.behavior,
          behaviorState: nextQueued.behaviorState ?? {},
        }));

        // Emit behavior:change event for metrics
        if (fromBehavior !== toBehavior) {
          world.eventBus.emit({
            type: 'behavior:change',
            source: entity.id,
            data: {
              agentId: entity.id,
              from: fromBehavior,
              to: toBehavior,
              reason: 'queue_advance',
            },
          });
        }

        return { behavior: nextQueued.behavior, execute: true };
      }
    }

    // Ensure agent is executing the current queued behavior
    if (agent.behavior !== currentQueued.behavior) {
      const fromBehavior = agent.behavior;
      const toBehavior = currentQueued.behavior;

      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behavior: currentQueued.behavior,
        behaviorState: currentQueued.behaviorState ?? {},
      }));

      // Emit behavior:change event for metrics
      world.eventBus.emit({
        type: 'behavior:change',
        source: entity.id,
        data: {
          agentId: entity.id,
          from: fromBehavior,
          to: toBehavior,
          reason: 'queue_sync',
        },
      });
    }

    // Continue current queued behavior
    return { behavior: currentQueued.behavior, execute: true };
  }

  /**
   * Get nearby agents for social behaviors.
   *
   * Performance: Uses chunk-based spatial lookup instead of querying all agents.
   * Only checks entities in nearby chunks based on range.
   */
  private getNearbyAgents(
    entity: EntityImpl,
    world: World,
    range: number
  ): Entity[] {
    const startTime = performance.now();
    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) return [];

    // Use world.spatialQuery for efficient nearby agent lookups
    if (world.spatialQuery) {
      const agentsInRadius = world.spatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        range,
        [CT.Agent],
        {
          excludeIds: new Set([entity.id]), // Exclude self
        }
      );

      const elapsed = performance.now() - startTime;
      if (elapsed > 5) {
        console.log(`[AgentBrainSystem] getNearbyAgents took ${elapsed.toFixed(1)}ms (chunk query, ${agentsInRadius.length} agents found)`);
      }

      return agentsInRadius.map(({ entity }: any) => entity);
    }

    // Fallback to manual chunk iteration (tests or when world.spatialQuery unavailable)
    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(position.x / CHUNK_SIZE);
    const chunkY = Math.floor(position.y / CHUNK_SIZE);

    // Calculate how many chunks we need to check based on range
    const chunkRange = Math.ceil(range / CHUNK_SIZE);

    const result: Entity[] = [];

    // Check chunks within range
    for (let dx = -chunkRange; dx <= chunkRange; dx++) {
      for (let dy = -chunkRange; dy <= chunkRange; dy++) {
        const nearbyEntityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

        for (const nearbyId of nearbyEntityIds) {
          if (nearbyId === entity.id) continue;

          const nearbyEntity = world.entities.get(nearbyId);
          if (!nearbyEntity) continue;

          const impl = nearbyEntity as EntityImpl;

          // Must have Agent component
          if (!impl.components.has(CT.Agent)) continue;

          const otherPos = impl.getComponent<PositionComponent>(CT.Position);
          if (!otherPos) continue;

          // Manhattan distance early exit
          const manhattanDist = Math.abs(otherPos.x - position.x) + Math.abs(otherPos.y - position.y);
          if (manhattanDist > range * 1.5) continue;

          // Euclidean distance check (squared to avoid sqrt)
          const dx2 = otherPos.x - position.x;
          const dy2 = otherPos.y - position.y;
          const distSquared = dx2 * dx2 + dy2 * dy2;

          if (distSquared <= range * range) {
            result.push(nearbyEntity);
          }
        }
      }
    }

    return result;
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
