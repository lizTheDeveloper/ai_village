/**
 * ExecutorLLMProcessor - Handles task planning and execution for agents
 *
 * This processor manages the "Executor" layer of the three-layer LLM architecture:
 * - Layer 1: Autonomic (reflexes, no LLM)
 * - Layer 2: Talker (conversation, goals, social)
 * - Layer 3: Executor (task planning, multi-step actions) ← THIS PROCESSOR
 *
 * The Executor is responsible for:
 * - Generating multi-step action plans
 * - Task execution (gather, build, craft, farm, etc.)
 * - Resource management and planning
 * - Infrastructure planning (plan_build)
 * - Slower, less frequent calls (task-driven cadence)
 *
 * Part of the conversation scheduler architecture (work-order: conversation-scheduler)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent, AgentBehavior, QueuedBehavior, PlannedBuild, AgentTier } from '../components/AgentComponent.js';
import { PLANNED_BUILD_REACH, AGENT_TIER_CONFIG, shouldUseLLM, getAssignedLocation } from '../components/AgentComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import { calculateStorageStats } from '../utils/StorageContext.js';
import { ComponentType } from '../types/ComponentType.js';
import { BuildingType } from '../types/BuildingType.js';

/**
 * Building cost lookup.
 * NOTE: These MUST match BuildingBlueprintRegistry resource costs.
 */
const BUILDING_COSTS: Record<string, Record<string, number>> = {
  'storage-chest': { wood: 10 },
  'campfire': { wood: 5, stone: 10 },
  'lean-to': { wood: 10, leaves: 5 },
  'tent': { wood: 5, cloth: 10 },
  'workbench': { wood: 20 },
  'bed': { wood: 10, plant_fiber: 15 },
  'well': { stone: 20, wood: 5 },
  'forge': { stone: 25, wood: 10 },
  'butchering_table': { wood: 25, stone: 10 },
};

/**
 * Condition for completing a goal/action
 */
interface GoalCondition {
  resource?: string;
  amount?: number;
  inStorage?: number;
  inInventory?: number;
}

/**
 * Parsed action from LLM response (single step)
 */
interface ParsedAction {
  type: string;
  target?: string;
  building?: string;
  recipe?: string;
  seed?: string;
  amount?: number;
  until?: GoalCondition;
  cause?: string;
  lethal?: boolean;
  surprise?: boolean;
  reason?: string;
  location?: string; // For go_to action
}

/**
 * Convert a parsed action object to behavior + behaviorState
 * Returns null for unrecognized actions - agent stays in current behavior
 */
function actionObjectToBehavior(action: ParsedAction): { behavior: AgentBehavior; behaviorState: Record<string, unknown> } | null {
  const behaviorState: Record<string, unknown> = {};

  switch (action.type) {
    case 'gather':
    case 'pick':
    case 'harvest':
      behaviorState.resourceType = action.target || 'wood';
      if (action.amount) {
        behaviorState.targetAmount = action.amount;
      }
      return { behavior: 'gather', behaviorState };

    case 'build':
      behaviorState.buildingType = action.building || BuildingType.Campfire;
      return { behavior: 'build', behaviorState };

    case 'craft':
      behaviorState.recipeId = action.recipe || action.target || 'wood_plank';
      if (action.amount) {
        behaviorState.quantity = action.amount;
      }
      return { behavior: 'craft', behaviorState };

    case 'fight':
    case 'attack':
    case 'challenge':
    case 'confront':
      behaviorState.targetId = action.target;
      behaviorState.cause = action.cause || 'challenge';
      behaviorState.lethal = action.lethal ?? false;
      behaviorState.surprise = action.surprise ?? false;
      return { behavior: 'initiate_combat', behaviorState };

    case 'hunt':
      behaviorState.targetId = action.target;
      behaviorState.reason = action.reason || 'food';
      return { behavior: 'hunt', behaviorState };

    case 'butcher':
    case 'slaughter':
      behaviorState.targetId = action.target;
      behaviorState.reason = action.reason || 'food';
      return { behavior: 'butcher', behaviorState };

    case ComponentType.Plant:
      behaviorState.seedType = action.seed || 'wheat';
      return { behavior: ComponentType.Plant, behaviorState };

    case 'till':
      return { behavior: 'till', behaviorState };

    case 'water':
      return { behavior: 'water', behaviorState };

    case 'explore':
      return { behavior: 'explore', behaviorState };

    case 'deposit_items':
      return { behavior: 'deposit_items', behaviorState };

    case 'research':
      if (action.target) {
        behaviorState.researchId = action.target;
      }
      return { behavior: 'research', behaviorState };

    case 'trade':
    case 'buy':
    case 'sell':
      behaviorState.shopId = action.target;
      behaviorState.itemId = action.recipe || action.building || 'wood';
      if (action.amount) {
        behaviorState.quantity = action.amount;
      }
      if (action.type === 'buy') {
        behaviorState.tradeType = 'buy';
      } else if (action.type === 'sell') {
        behaviorState.tradeType = 'sell';
      }
      return { behavior: 'trade', behaviorState };

    case 'go_to':
      // go_to is handled by the action system (GoToActionHandler)
      // It's not a direct behavior, so return null to keep current behavior
      // The action will be queued and executed, which will set navigate behavior
      return null;

    case 'idle':
    case 'wander':
      // NO FALLBACK - idle/wander should not be explicitly set
      // Agent stays in current behavior until LLM explicitly changes it
      return null;

    default:
      // NO FALLBACK - if action type is not recognized, return null
      // Agent will stay in current behavior until LLM explicitly changes it
      return null;
  }
}

/**
 * Generate a human-readable label for a queued behavior
 */
function generateBehaviorLabel(action: ParsedAction): string {
  switch (action.type) {
    case 'gather':
    case 'pick':
    case 'harvest':
      if (action.amount) {
        return `Gather ${action.amount} ${action.target || 'resources'}`;
      }
      return `Gather ${action.target || 'resources'}`;
    case 'build':
      return `Build ${action.building || 'structure'}`;
    case 'craft':
      return `Craft ${action.recipe || action.target || ComponentType.Item}`;
    case ComponentType.Plant:
      return `Plant ${action.seed || 'seeds'}`;
    case 'till':
      return 'Till soil';
    case 'water':
      return 'Water plants';
    case 'explore':
      return 'Explore area';
    case 'deposit_items':
      return 'Store items';
    case 'research':
      return action.target ? `Research ${action.target}` : 'Conduct research';
    case 'trade':
    case 'buy':
      return `Buy ${action.amount || 1} ${action.recipe || action.building || 'items'}`;
    case 'sell':
      return `Sell ${action.amount || 1} ${action.recipe || action.building || 'items'}`;
    case 'go_to':
      return `Go to ${action.location || action.target || 'location'}`;
    default:
      return action.type;
  }
}

/**
 * Executor LLM decision result
 */
export interface ExecutorDecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  speaking?: string;
  thinking?: string;
  source: 'executor' | 'fallback' | 'none';
}

/**
 * Custom LLM configuration for per-agent LLM settings
 */
export interface CustomLLMConfig {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Interface for LLM decision queue
 */
export interface LLMDecisionQueue {
  getDecision(entityId: string, llmType?: 'talker' | 'executor'): string | null;
  requestDecision(entityId: string, prompt: string, customConfig?: CustomLLMConfig, llmType?: 'talker' | 'executor'): Promise<string>;
}

/**
 * Interface for prompt builder (Executor-specific)
 */
export interface ExecutorPromptBuilder {
  buildExecutorPrompt(entity: Entity, world: World): string;
}

/**
 * Configuration for Executor LLM processor
 */
export interface ExecutorProcessorConfig {
  enableExecutor: boolean;          // Master toggle for Executor LLM
  taskCompleteCadenceSec: number;   // Seconds to wait after task complete
  idleThinkDelaySec: number;        // Seconds before calling when idle
  periodicThinkSec: number;         // Seconds between periodic calls
}

const DEFAULT_CONFIG: ExecutorProcessorConfig = {
  enableExecutor: true,
  taskCompleteCadenceSec: 5,   // 5 seconds after task
  idleThinkDelaySec: 10,       // 10 seconds when idle
  periodicThinkSec: 300,       // 5 minutes periodic
};

/**
 * ExecutorLLMProcessor Class
 *
 * Handles task planning and execution for agents.
 * This is the "Executor" layer - responsible for multi-step plans and task execution.
 *
 * Usage:
 * ```typescript
 * const processor = new ExecutorLLMProcessor(llmQueue, promptBuilder);
 *
 * // In update loop for LLM agents
 * const result = processor.process(entity, world, agent);
 * if (result.changed) {
 *   // Executor planned new task
 * }
 * ```
 */
export class ExecutorLLMProcessor {
  private llmDecisionQueue: LLMDecisionQueue;
  private promptBuilder: ExecutorPromptBuilder;
  private lastLLMRequestTime: Map<string, number> = new Map(); // Per-agent wall-clock time (ms)
  private llmRequestCooldownMs: number = 250; // Minimum ms between LLM requests (global rate limit)
  private lastGlobalRequestTime: number = 0;

  // Configurable settings
  private config: ExecutorProcessorConfig = { ...DEFAULT_CONFIG };

  constructor(llmDecisionQueue: LLMDecisionQueue, promptBuilder: ExecutorPromptBuilder) {
    this.llmDecisionQueue = llmDecisionQueue;
    this.promptBuilder = promptBuilder;
  }

  /**
   * Update configuration (called when settings change)
   */
  updateConfig(config: Partial<ExecutorProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExecutorProcessorConfig {
    return { ...this.config };
  }

  /**
   * Check if agent has active work (doesn't need Executor guidance).
   */
  private hasActiveWork(agent: AgentComponent): boolean {
    // Has planned builds to work on
    if (agent.plannedBuilds && agent.plannedBuilds.length > 0) {
      return true;
    }

    // Has behavior queue to execute
    if (agent.behaviorQueue && agent.behaviorQueue.length > 0) {
      return true;
    }

    // Currently doing productive work (not idle/wander)
    const productiveBehaviors = [
      'gather', 'build', 'farm', 'till', ComponentType.Plant, 'water', 'harvest',
      'deposit_items', 'navigate', 'explore', 'seek_food'
    ];
    if (productiveBehaviors.includes(agent.behavior)) {
      return true;
    }

    return false;
  }

  /**
   * Check if agent should call Executor LLM (task-driven).
   *
   * Executor calls are based on:
   * - Task just completed (high priority)
   * - Goals changed by Talker (medium priority)
   * - Idle with no plan (low priority)
   * - Periodic thinking
   */
  shouldCallExecutor(agent: AgentComponent, entityId: string): boolean {
    // Master toggle - if Executor disabled, never call
    if (!this.config.enableExecutor) {
      return false;
    }

    // Check if this agent should use LLM based on tier
    if (!shouldUseLLM(agent)) {
      return false;
    }

    const now = Date.now();
    const lastCallTime = this.lastLLMRequestTime.get(entityId) || 0;
    const secondsSinceLastCall = (now - lastCallTime) / 1000;

    // Get tier configuration
    const tier: AgentTier = agent.tier ?? (agent.useLLM ? 'full' : 'autonomic');
    const tierConfig = AGENT_TIER_CONFIG[tier];

    // 1. Task completion trigger (if tier supports it)
    if (agent.behaviorCompleted && tierConfig.thinkOnTaskComplete) {
      return secondsSinceLastCall >= this.config.taskCompleteCadenceSec;
    }

    // 2. Idle thinking (if tier supports it)
    if (tierConfig.idleThinkDelaySec !== null) {
      if (!this.hasActiveWork(agent) && ['idle', 'wander'].includes(agent.behavior)) {
        return secondsSinceLastCall >= this.config.idleThinkDelaySec;
      }
    }

    // 3. Periodic thinking (if tier supports it)
    if (tierConfig.periodicThinkSec !== null) {
      return secondsSinceLastCall >= this.config.periodicThinkSec;
    }

    return false;
  }

  /**
   * Process Executor LLM decision for an entity.
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): ExecutorDecisionResult {
    // PLANNED BUILD SYSTEM - Execute planned builds autonomously
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const interruptibleBehaviors = ['wander', 'idle', 'talk', 'follow_agent', 'explore'];

    if (
      agent.plannedBuilds &&
      agent.plannedBuilds.length > 0 &&
      inventory &&
      interruptibleBehaviors.includes(agent.behavior)
    ) {
      const buildResult = this.processPlannedBuilds(entity, world, agent.plannedBuilds, inventory);
      if (buildResult) {
        return buildResult;
      }
    }

    // Check for ready decision
    const decision = this.llmDecisionQueue.getDecision(entity.id, 'executor');
    if (decision) {
      // Clear behaviorCompleted flag when processing new decision
      if (agent.behaviorCompleted) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behaviorCompleted: false,
        }));
      }
      return this.processDecision(entity, world, decision);
    }

    // Check if we should call Executor LLM
    if (this.shouldCallExecutor(agent, entity.id)) {
      const now = Date.now();

      // Check global rate limiting
      const msSinceGlobalRequest = now - this.lastGlobalRequestTime;
      if (msSinceGlobalRequest >= this.llmRequestCooldownMs) {
        // Request new decision using Executor-specific prompt
        const prompt = this.promptBuilder.buildExecutorPrompt(entity, world);

        // Determine the reason for this LLM call
        const reason = agent.behaviorCompleted
          ? 'task_complete'
          : !this.hasActiveWork(agent)
            ? 'idle'
            : 'periodic';

        // Emit comprehensive agent state snapshot for dashboard (agent:llm_context)
        // This allows the metrics dashboard to pair prompts with decisions
        const identity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
        const position = entity.getComponent<PositionComponent>(ComponentType.Position);
        const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
        const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
        const skillsComp = entity.getComponent<SkillsComponent>(ComponentType.Skills);

        // Build skills snapshot (only include non-zero skills)
        let skills: Record<string, number> | undefined;
        if (skillsComp?.levels) {
          const nonZeroSkills: Record<string, number> = {};
          for (const [skillId, level] of Object.entries(skillsComp.levels)) {
            if (level > 0) {
              nonZeroSkills[skillId] = level;
            }
          }
          if (Object.keys(nonZeroSkills).length > 0) {
            skills = nonZeroSkills;
          }
        }

        world.eventBus.emit({
          type: 'agent:llm_context',
          source: entity.id,
          data: {
            agentId: entity.id,
            agentName: identity?.name || 'Unknown',
            context: prompt,
            tick: world.tick,
            // Current state
            behavior: agent.behavior,
            behaviorState: agent.behaviorState,
            priorities: agent.priorities as Record<string, number> | undefined,
            plannedBuilds: agent.plannedBuilds,
            // Position
            position: position ? { x: Math.round(position.x), y: Math.round(position.y) } : undefined,
            // Needs
            needs: needs ? {
              hunger: needs.hunger !== undefined ? Math.round(needs.hunger) : undefined,
              energy: needs.energy !== undefined ? Math.round(needs.energy) : undefined,
              social: needs.social !== undefined ? Math.round(needs.social) : undefined,
            } : undefined,
            // Inventory summary
            inventory: inventory?.slots
              .filter(s => s.quantity > 0 && s.itemId)
              .map(s => ({ item: s.itemId!, qty: s.quantity })),
            // Skills
            skills,
            // Goals
            personalGoal: agent.personalGoal,
            mediumTermGoal: agent.mediumTermGoal,
            groupGoal: agent.groupGoal,
            // Recent thoughts
            lastThought: agent.lastThought,
            recentSpeech: agent.recentSpeech,
            // Mark as executor layer
            llmLayer: 'executor',
          },
        });

        // Emit LLM request event
        world.eventBus.emit({
          type: 'llm:request',
          source: entity.id,
          data: {
            agentId: entity.id,
            promptLength: prompt.length,
            reason,
            llmType: 'executor',
          },
        });

        // Request decision with 'executor' type
        this.llmDecisionQueue.requestDecision(entity.id, prompt, agent.customLLM, 'executor').catch((err: Error) => {
          console.error(`[ExecutorLLMProcessor] Executor LLM failed for ${entity.id}:`, err);

          // Emit llm:error event
          world.eventBus.emit({
            type: 'llm:error',
            source: entity.id,
            data: {
              agentId: entity.id,
              error: err.message.slice(0, 200),
              errorType: 'executor_error',
            },
          });
        });

        // Update timestamps
        this.lastLLMRequestTime.set(entity.id, now);
        this.lastGlobalRequestTime = now;
      }
    }

    // Check for fallback behavior when stuck
    const fallback = this.checkFallbackBehavior(entity, agent);
    if (fallback) {
      return fallback;
    }

    return { changed: false, source: 'none' };
  }

  /**
   * Process an Executor LLM decision response.
   *
   * Executor handles:
   * - plan_build actions
   * - Multi-step action arrays
   * - Single task actions (gather, build, craft, etc.)
   */
  private processDecision(
    entity: EntityImpl,
    world: World,
    decision: string
  ): ExecutorDecisionResult {
    // Parse JSON response
    let parsedResponse: {
      action?: unknown;
      speaking?: string;
      thinking?: string;
    } | null = null;

    try {
      parsedResponse = JSON.parse(decision);
    } catch {
      // Not JSON - ignore (Executor expects structured responses)
      return { changed: false, source: 'executor' };
    }

    if (!parsedResponse || !parsedResponse.action) {
      return { changed: false, source: 'executor' };
    }

    const action = parsedResponse.action;
    const speaking = parsedResponse.speaking || undefined;
    const thinking = parsedResponse.thinking || undefined;

    let behavior: AgentBehavior | null = null;
    let behaviorState: Record<string, unknown> = {};
    let behaviorQueue: QueuedBehavior[] | undefined;

    // Handle plan_build action
    if (typeof action === 'object' && action !== null && !Array.isArray(action) && 'type' in action) {
      const typedAction = action as { type: string; building?: string };

      if (typedAction.type === 'plan_build') {
        const buildResult = this.handlePlanBuild(entity, world, typedAction, speaking, thinking);
        if (buildResult) {
          return buildResult;
        }
      }

      // Handle cancel_current_task action
      if (typedAction.type === 'cancel_current_task') {
        return this.handleCancelCurrentTask(entity, world, speaking, thinking);
      }

      // Handle cancel_planned_build action
      if (typedAction.type === 'cancel_planned_build') {
        return this.handleCancelPlannedBuild(entity, world, typedAction.building, speaking, thinking);
      }

      // Handle go_to action (navigate to named location)
      if (typedAction.type === 'go_to') {
        const goToAction = typedAction as { type: string; location?: string; target?: string };
        const locationName = goToAction.location || goToAction.target;
        if (locationName) {
          const goToResult = this.handleGoTo(entity, world, locationName, speaking, thinking);
          if (goToResult) {
            return goToResult;
          }
        }
      }
    }

    // Check if action is a plan array (multi-step)
    if (Array.isArray(action) && action.length > 0) {
      behaviorQueue = this.convertPlanToQueue(action as ParsedAction[]);
      if (behaviorQueue.length > 0) {
        const firstStep = behaviorQueue[0]!;
        behavior = firstStep.behavior;
        behaviorState = firstStep.behaviorState || {};
      }
    }
    // Single action object
    else if (typeof action === 'object' && action !== null && 'type' in action) {
      const converted = actionObjectToBehavior(action as ParsedAction);
      if (converted) {
        behavior = converted.behavior;
        behaviorState = converted.behaviorState;
      }
      // If converted is null, behavior stays undefined and agent stays in current behavior
    }
    // Simple string action
    else if (typeof action === 'string') {
      behavior = action as AgentBehavior;
      // Set default behaviorState for behaviors that require parameters
      if (behavior === 'gather' || behavior === 'pick') {
        behaviorState.resourceType = 'wood';
      }
    }

    if (behavior) {
      // Apply the decision with optional behavior queue
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior,
        behaviorState,
        behaviorQueue,
        currentQueueIndex: behaviorQueue ? 0 : undefined,
        recentSpeech: speaking,
        lastThought: thinking,
      }));

      // Emit llm:decision event
      world.eventBus.emit({
        type: 'llm:decision',
        source: entity.id,
        data: {
          agentId: entity.id,
          decision: behavior,
          behavior,
          reasoning: thinking,
          source: 'executor',
        },
      });

      return {
        changed: true,
        behavior,
        behaviorState,
        speaking,
        thinking,
        source: 'executor',
      };
    }

    return { changed: false, source: 'executor' };
  }

  /**
   * Handle plan_build action
   */
  private handlePlanBuild(
    entity: EntityImpl,
    world: World,
    buildAction: { type: string; building?: string; position?: { x: number; y: number }; priority?: 'low' | 'normal' | 'high'; reason?: string },
    speaking?: string,
    thinking?: string
  ): ExecutorDecisionResult | null {
    const buildingType = buildAction.building || BuildingType.StorageChest;

    // CHECK FOR DUPLICATES
    const existingBuildings = world.query().with(ComponentType.Building).executeEntities();
    let completeCount = 0;
    let inProgressCount = 0;
    for (const b of existingBuildings) {
      const bc = b.components.get(ComponentType.Building) as { buildingType?: string; isComplete?: boolean } | undefined;
      if (bc?.buildingType === buildingType) {
        if (bc.isComplete) completeCount++;
        else inProgressCount++;
      }
    }

    // Building limits - dynamically scaled based on agent count
    const agentCount = world.query().with(ComponentType.Agent).executeEntities().length;
    const getBuildingLimit = (type: string): number => {
      switch (type) {
        case 'storage-chest':
        case 'storage-box':
          // 1 storage per 2 agents, max 10 (matches StructuredPromptBuilder threshold)
          return Math.min(Math.ceil(agentCount / 2), 10);
        case 'bed':
        case 'bedroll':
          // 1 bed per agent, max 20
          return Math.min(agentCount, 20);
        case 'tent':
        case 'lean-to':
          // 1 shelter per 2 agents, max 10
          return Math.min(Math.ceil(agentCount / 2), 10);
        case 'campfire':
          // 1 campfire per 3 agents, max 5
          return Math.min(Math.ceil(agentCount / 3), 5);
        default:
          // Default: 2 per village for utility buildings
          return 2;
      }
    };
    const limit = getBuildingLimit(buildingType);

    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const alreadyPlannedBySelf = agent?.plannedBuilds?.some(p => p.buildingType === buildingType) ?? false;

    const allAgents = world.query().with(ComponentType.Agent).executeEntities();
    let plannedByOthers = 0;
    for (const otherAgent of allAgents) {
      if (otherAgent.id === entity.id) continue;
      const otherAgentComp = otherAgent.components.get(ComponentType.Agent) as AgentComponent | undefined;
      if (otherAgentComp?.plannedBuilds?.some(p => p.buildingType === buildingType)) {
        plannedByOthers++;
      }
    }

    const totalPlannedOrBuilding = completeCount + inProgressCount + plannedByOthers;
    if (totalPlannedOrBuilding >= limit || alreadyPlannedBySelf || inProgressCount > 0) {
      return { changed: false, source: 'executor' };
    }

    const plannedBuild: PlannedBuild = {
      buildingType,
      position: buildAction.position || { x: 0, y: 0 },
      priority: buildAction.priority || 'normal',
      createdAt: world.tick,
      reason: buildAction.reason,
    };

    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
      const existingPlans = current.plannedBuilds || [];
      return {
        ...current,
        plannedBuilds: [...existingPlans, plannedBuild],
        recentSpeech: speaking,
        lastThought: thinking,
      };
    });

    world.eventBus.emit({
      type: 'llm:decision',
      source: entity.id,
      data: {
        agentId: entity.id,
        decision: 'plan_build',
        behavior: 'plan_build',
        reasoning: thinking,
        source: 'executor',
      },
    });

    // IMMEDIATELY start working on the build
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (inventory) {
      const updatedAgent = entity.getComponent<AgentComponent>(ComponentType.Agent);
      if (updatedAgent?.plannedBuilds) {
        const buildResult = this.processPlannedBuilds(entity, world, updatedAgent.plannedBuilds, inventory);
        if (buildResult) {
          return {
            ...buildResult,
            speaking,
            thinking,
            source: 'executor',
          };
        }
      }
    }

    return {
      changed: true,
      speaking,
      thinking,
      source: 'executor',
    };
  }

  /**
   * Handle cancel_current_task action.
   * Clears the current task and behavior queue, returning to idle.
   */
  private handleCancelCurrentTask(
    entity: EntityImpl,
    world: World,
    speaking?: string,
    thinking?: string
  ): ExecutorDecisionResult {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'idle',
      behaviorState: {},
      behaviorQueue: undefined,
      currentQueueIndex: undefined,
      queuePaused: undefined,
      queueInterruptedBy: undefined,
      recentSpeech: speaking,
      lastThought: thinking,
    }));

    world.eventBus.emit({
      type: 'llm:decision',
      source: entity.id,
      data: {
        agentId: entity.id,
        decision: 'cancel_current_task',
        behavior: 'cancel_current_task',
        reasoning: thinking,
        source: 'executor',
      },
    });

    return {
      changed: true,
      behavior: 'idle',
      behaviorState: {},
      speaking,
      thinking,
      source: 'executor',
    };
  }

  /**
   * Handle cancel_planned_build action.
   * Removes a specific planned build by building type.
   */
  private handleCancelPlannedBuild(
    entity: EntityImpl,
    world: World,
    buildingType: string | undefined,
    speaking?: string,
    thinking?: string
  ): ExecutorDecisionResult {
    if (!buildingType) {
      // No building type specified - can't cancel
      return { changed: false, source: 'executor' };
    }

    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    if (!agent?.plannedBuilds || agent.plannedBuilds.length === 0) {
      // No planned builds to cancel
      return { changed: false, source: 'executor' };
    }

    // Remove the planned build
    const updatedBuilds = agent.plannedBuilds.filter(
      (build) => build.buildingType !== buildingType
    );

    // Check if anything was actually removed
    const wasRemoved = updatedBuilds.length < agent.plannedBuilds.length;

    if (!wasRemoved) {
      // Building type wasn't found in planned builds
      return { changed: false, source: 'executor' };
    }

    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      plannedBuilds: updatedBuilds.length > 0 ? updatedBuilds : undefined,
      recentSpeech: speaking,
      lastThought: thinking,
    }));

    world.eventBus.emit({
      type: 'llm:decision',
      source: entity.id,
      data: {
        agentId: entity.id,
        decision: 'cancel_planned_build',
        behavior: 'cancel_planned_build',
        reasoning: thinking,
        source: 'executor',
      },
    });

    return {
      changed: true,
      speaking,
      thinking,
      source: 'executor',
    };
  }

  /**
   * Handle go_to action (navigate to named location).
   * Looks up location and sets navigate behavior.
   */
  private handleGoTo(
    entity: EntityImpl,
    world: World,
    locationName: string,
    speaking?: string,
    thinking?: string
  ): ExecutorDecisionResult | null {
    const agentComp = entity.getComponent<AgentComponent>(ComponentType.Agent);
    if (!agentComp) {
      return null;
    }

    // Find location using same logic as GoToActionHandler
    const location = this.findLocation(entity, world, locationName);

    if (!location) {
      // Location not found - agent doesn't know this place
      // Don't change behavior, just record the thought
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        recentSpeech: speaking,
        lastThought: thinking || `I don't know where "${locationName}" is`,
      }));
      return {
        changed: false,
        speaking,
        thinking,
        source: 'executor',
      };
    }

    // Set navigate behavior to location
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'navigate',
      behaviorState: {
        target: { x: location.x, y: location.y },
        locationName,
      },
      recentSpeech: speaking,
      lastThought: thinking,
    }));

    world.eventBus.emit({
      type: 'llm:decision',
      source: entity.id,
      data: {
        agentId: entity.id,
        decision: `go_to:${locationName}`,
        behavior: 'navigate',
        reasoning: thinking,
        source: 'executor',
      },
    });

    return {
      changed: true,
      speaking,
      thinking,
      source: 'executor',
    };
  }

  /**
   * Find a location by name (same logic as GoToActionHandler).
   */
  private findLocation(
    actor: import('../ecs/Entity.js').Entity,
    world: World,
    locationName: string
  ): { x: number; y: number } | undefined {
    const searchName = locationName.toLowerCase().trim();

    // 1. Check agent's assigned locations (home, work, etc.)
    const agentComp = actor.components.get(ComponentType.Agent) as AgentComponent | undefined;
    if (agentComp) {
      const assigned = getAssignedLocation(agentComp, searchName);
      if (assigned) {
        return { x: assigned.x, y: assigned.y };
      }
    }

    // 2. Check agent's spatial memory (personal chunk names)
    const spatialMem = actor.components.get(ComponentType.SpatialMemory) as import('../components/SpatialMemoryComponent.js').SpatialMemoryComponent | undefined;
    if (spatialMem) {
      const { findChunkByName } = require('../components/SpatialMemoryComponent.js');
      const chunk = findChunkByName(spatialMem, searchName);
      if (chunk) {
        const { CHUNK_SIZE } = require('@ai-village/world');
        const centerX = (chunk.chunkX * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        const centerY = (chunk.chunkY * CHUNK_SIZE) + (CHUNK_SIZE / 2);
        return { x: centerX, y: centerY };
      }
    }

    // 3. Check world chunk name registry (shared names)
    const chunkRegistry = world.getChunkNameRegistry();
    const worldChunk = chunkRegistry.findByName(searchName);
    if (worldChunk) {
      const { CHUNK_SIZE } = require('@ai-village/world');
      const centerX = (worldChunk.chunkX * CHUNK_SIZE) + (CHUNK_SIZE / 2);
      const centerY = (worldChunk.chunkY * CHUNK_SIZE) + (CHUNK_SIZE / 2);
      return { x: centerX, y: centerY };
    }

    return undefined;
  }

  /**
   * Convert a plan array to a behavior queue.
   */
  private convertPlanToQueue(actions: ParsedAction[]): QueuedBehavior[] {
    const queue: QueuedBehavior[] = [];

    for (const action of actions) {
      if (!action.type) continue;

      // Handle go_to specially - it needs special conversion
      if (action.type === 'go_to') {
        const locationName = action.location || action.target;
        if (locationName) {
          // go_to becomes a navigate behavior with location metadata
          // The actual location lookup will happen during queue processing
          queue.push({
            behavior: 'navigate',
            behaviorState: {
              namedLocation: locationName, // Marker for location lookup
            },
            priority: 'normal',
            label: `Go to ${locationName}`,
          });
        }
        continue;
      }

      const converted = actionObjectToBehavior(action);
      // Skip unrecognized actions - don't add them to queue
      if (!converted) continue;

      const { behavior, behaviorState } = converted;
      const label = generateBehaviorLabel(action);

      // For gather with amount, set up repeats based on typical gather rate
      let repeats: number | undefined;
      if ((action.type === 'gather' || action.type === 'pick') && action.amount) {
        repeats = Math.ceil(action.amount / 10);
      }

      queue.push({
        behavior,
        behaviorState,
        priority: 'normal',
        label,
        repeats,
      });
    }

    return queue;
  }

  /**
   * Check if Executor agent is stuck and needs fallback behavior.
   */
  private checkFallbackBehavior(
    entity: EntityImpl,
    agent: AgentComponent
  ): ExecutorDecisionResult | null {
    // If agent is idle/wander, occasionally suggest gathering
    if (agent.behavior === 'wander' || agent.behavior === 'idle') {
      const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
      if (inventory && Math.random() < 0.2) {
        const hasWood = inventory.slots.some((s) => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some((s) => s.itemId === 'stone' && s.quantity >= 10);
        if (!hasWood || !hasStone) {
          const preferredType = !hasWood ? 'wood' : 'stone';
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            behavior: 'gather',
            behaviorState: { resourceType: preferredType },
          }));
          return {
            changed: true,
            behavior: 'gather',
            behaviorState: { resourceType: preferredType },
            source: 'fallback',
          };
        }
      }
    }

    return null;
  }

  /**
   * Process planned builds - gather resources or execute build when ready.
   */
  private processPlannedBuilds(
    entity: EntityImpl,
    world: World,
    plannedBuilds: PlannedBuild[],
    inventory: InventoryComponent
  ): ExecutorDecisionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;

    // Sort by priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const sortedBuilds = [...plannedBuilds].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    const build = sortedBuilds[0];
    if (!build) return null;

    const costs = BUILDING_COSTS[build.buildingType];
    if (!costs) {
      console.warn(`[ExecutorLLMProcessor] Unknown building type: ${build.buildingType}`);
      this.removePlannedBuild(entity, build);
      return null;
    }

    // Get village storage stats
    const storageStats = calculateStorageStats(world);

    // Calculate missing resources (check inventory + storage)
    const missing: Record<string, number> = {};
    for (const [resource, needed] of Object.entries(costs)) {
      const inInventory = inventory.slots
        .filter((s) => s.itemId === resource)
        .reduce((sum, s) => sum + s.quantity, 0);
      const inStorage = storageStats.items[resource] || 0;
      const have = inInventory + inStorage;
      if (have < needed) {
        missing[resource] = needed - have;
      }
    }

    // If we have all resources, check if near build location
    if (Object.keys(missing).length === 0) {
      const buildPos = build.position.x === 0 && build.position.y === 0
        ? { x: position.x, y: position.y }
        : build.position;
      const distToBuild = Math.sqrt(
        (position.x - buildPos.x) ** 2 + (position.y - buildPos.y) ** 2
      );

      if (distToBuild <= PLANNED_BUILD_REACH || (build.position.x === 0 && build.position.y === 0)) {
        // Start building
        this.removePlannedBuild(entity, build);
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'build',
          behaviorState: {
            buildingType: build.buildingType,
            targetPosition: buildPos,
          },
        }));
        return {
          changed: true,
          behavior: 'build',
          behaviorState: {
            buildingType: build.buildingType,
            targetPosition: buildPos,
          },
          source: 'executor',
        };
      } else {
        // Move toward build location
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'navigate',
          behaviorState: {
            targetPosition: buildPos,
            reason: `Moving to build ${build.buildingType}`,
          },
        }));
        return {
          changed: true,
          behavior: 'navigate',
          behaviorState: { targetPosition: buildPos },
          source: 'executor',
        };
      }
    }

    // Missing resources - gather the most needed one
    const mostNeeded = Object.entries(missing).sort((a, b) => b[1] - a[1])[0];
    if (mostNeeded) {
      const [resourceType, amountNeeded] = mostNeeded;
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType,
          targetAmount: amountNeeded,
          forBuild: build.buildingType,
        },
      }));
      return {
        changed: true,
        behavior: 'gather',
        behaviorState: { resourceType, forBuild: build.buildingType },
        source: 'executor',
      };
    }

    return null;
  }

  /**
   * Remove a completed/invalid planned build from the agent.
   */
  private removePlannedBuild(entity: EntityImpl, build: PlannedBuild): void {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      plannedBuilds: (current.plannedBuilds || []).filter(
        (b) =>
          b.buildingType !== build.buildingType ||
          b.position.x !== build.position.x ||
          b.position.y !== build.position.y
      ),
    }));
  }
}
