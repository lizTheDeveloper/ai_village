/**
 * LLMDecisionProcessor - Handles LLM-based decision making for agents
 *
 * This processor manages the LLM decision queue, parses responses (both structured
 * JSON and legacy text), and applies decisions to agents.
 *
 * Part of Phase 4 of the AISystem decomposition (work-order: ai-system-refactor)
 */
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent, AgentBehavior, QueuedBehavior, StrategicPriorities, PlannedBuild, AgentTier } from '../components/AgentComponent.js';
import { PLANNED_BUILD_REACH, AGENT_TIER_CONFIG, shouldUseLLM, disableInteractionLLM } from '../components/AgentComponent.js';

/**
 * Duration (in ticks) that interaction-triggered LLM remains active.
 * After this, autonomic NPCs return to scripted behavior.
 * 60 seconds at 20 TPS = 1200 ticks
 */
const INTERACTION_LLM_TIMEOUT_TICKS = 1200;
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import { parseAction, actionToBehavior } from '../actions/AgentAction.js';
import { calculateStorageStats } from '../utils/StorageContext.js';
import { ComponentType } from '../types/ComponentType.js';
import { BuildingType } from '../types/BuildingType.js';
/**
 * Building cost lookup.
 * NOTE: These MUST match BuildingBlueprintRegistry resource costs.
 * When in doubt, check BuildingBlueprintRegistry.ts for authoritative values.
 */
const BUILDING_COSTS: Record<string, Record<string, number>> = {
  'storage-chest': { wood: 10 },
  'campfire': { wood: 5, stone: 10 },
  'lean-to': { wood: 10, leaves: 5 },
  'tent': { wood: 5, cloth: 10 },
  'workbench': { wood: 20 }, // Match BuildingBlueprintRegistry (20 wood, no stone)
  'bed': { wood: 10, plant_fiber: 15 },
  'well': { stone: 20, wood: 5 },
  'forge': { stone: 25, wood: 10 },
  'butchering_table': { wood: 25, stone: 10 }, // Match BuildingBlueprintRegistry
};
/**
 * Condition for completing a goal/action
 */
interface GoalCondition {
  resource?: string;      // Resource type to check
  amount?: number;        // Amount needed (in inventory + storage)
  inStorage?: number;     // Amount specifically in storage
  inInventory?: number;   // Amount specifically in inventory
}
/**
 * Parsed action from LLM response (single step)
 */
interface ParsedAction {
  type: string;
  target?: string;
  building?: string;
  recipe?: string;    // For craft actions
  seed?: string;
  amount?: number;
  until?: GoalCondition;  // Condition to complete this action
  cause?: string;     // For combat actions - reason for combat
  lethal?: boolean;   // For combat actions - lethal combat?
  surprise?: boolean; // For combat actions - surprise attack?
  reason?: string;    // For hunt/butcher actions - reason for action
}
/**
 * Convert a parsed action object to behavior + behaviorState
 * Returns null if the action type is not recognized (no fallback - agent stays in current behavior)
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
    case 'talk':
      // NOTE: Talk does NOT change behavior - talking happens alongside current activity
      // Speech is set via recentSpeech component, not by switching to 'talk' behavior
      // Return null so agent stays in current behavior
      return null;
    case 'follow':
      behaviorState.targetId = action.target || 'nearest';
      return { behavior: 'follow_agent', behaviorState };
    case 'fight':
    case 'attack':
    case 'challenge':
    case 'confront':
      // Combat actions - target is required
      behaviorState.targetId = action.target;
      behaviorState.cause = action.cause || 'challenge';
      behaviorState.lethal = action.lethal ?? false;
      behaviorState.surprise = action.surprise ?? false;
      return { behavior: 'initiate_combat', behaviorState };
    case 'hunt':
      // Hunting actions - target animal is required
      behaviorState.targetId = action.target;
      behaviorState.reason = action.reason || 'food';
      return { behavior: 'hunt', behaviorState };
    case 'butcher':
    case 'slaughter':
      // Butchering actions - target tame animal is required
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
      // Optional: specify research ID if the action includes it
      if (action.target) {
        behaviorState.researchId = action.target;
      }
      return { behavior: 'research', behaviorState };
    case 'trade':
    case 'buy':
    case 'sell':
      // Map 'buy' or 'sell' to 'trade' behavior
      behaviorState.shopId = action.target; // Shop entity ID
      behaviorState.itemId = action.recipe || action.building || 'wood'; // Item to trade
      if (action.amount) {
        behaviorState.quantity = action.amount;
      }
      // Determine trade type from action.type
      if (action.type === 'buy') {
        behaviorState.tradeType = 'buy';
      } else if (action.type === 'sell') {
        behaviorState.tradeType = 'sell';
      }
      // If action.type is 'trade', it should have a subtype or tradeType parameter
      return { behavior: 'trade', behaviorState };
    case 'idle':
    case 'wander':
      // NO FALLBACK - idle/wander should not be explicitly set
      // Agent stays in current behavior until LLM explicitly changes it
      return null;
    // NOTE: 'rest' removed - sleep is autonomic (triggered by AutonomicSystem)
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
    case 'talk':
      return `Talk to ${action.target || 'someone'}`;
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
    default:
      return action.type;
  }
}

/**
 * Select a behavior based on strategic priorities.
 * This is called after set_priorities to immediately start acting on those priorities.
 */
function selectBehaviorFromPriorities(
  priorities: StrategicPriorities,
  entity: EntityImpl,
  world: World,
  getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
): { behavior: AgentBehavior; behaviorState: Record<string, unknown> } | null {
  // Find the highest priority category
  const categories = [ComponentType.Building, 'gathering', 'farming', 'social', 'exploration', 'rest'] as const;
  let highestPriority = 0;
  let highestCategory: string | null = null;

  for (const cat of categories) {
    const val = priorities[cat] ?? 0;
    if (val > highestPriority) {
      highestPriority = val;
      highestCategory = cat;
    }
  }

  if (!highestCategory || highestPriority <= 0) {
    return null;
  }

  // Select appropriate behavior for the highest priority category
  switch (highestCategory) {
    case 'social': {
      // Social priority does NOT change behavior
      // Talking happens alongside current activity via recentSpeech
      // Agent can chat while gathering, working, etc.
      return null;
    }
    case 'gathering': {
      return { behavior: 'gather', behaviorState: { resourceType: 'wood' } };
    }
    case ComponentType.Building: {
      // Check if agent has a planned build
      const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
      if (agent?.plannedBuilds && agent.plannedBuilds.length > 0) {
        return { behavior: 'build', behaviorState: { buildingType: agent.plannedBuilds[0]?.buildingType || BuildingType.StorageChest } };
      }
      // No planned build, gather resources for building
      return { behavior: 'gather', behaviorState: { resourceType: 'wood', forBuild: true } };
    }
    case 'farming': {
      return { behavior: 'farm', behaviorState: {} };
    }
    case 'exploration': {
      // Exploration priority does NOT automatically trigger explore behavior
      // Exploration should be an LLM decision, not an automatic fallback
      // This prevents agents from wandering 320+ tiles away due to high exploration skill
      return null;
    }
    // NOTE: 'rest' removed - sleep is autonomic (triggered by AutonomicSystem)
    default:
      // NO FALLBACK - return null to keep current behavior
      return null;
  }
}

/**
 * LLM decision result
 */
export interface LLMDecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  speaking?: string;
  thinking?: string;
  source: 'llm' | 'fallback';
}
// Import canonical LLM types
import type { CustomLLMConfig, LLMDecisionQueue } from '../types/LLMTypes.js';

// Re-export for backward compatibility with existing code
export type { CustomLLMConfig, LLMDecisionQueue };
/**
 * Interface for prompt builder
 */
export interface PromptBuilder {
  buildPrompt(entity: Entity, world: World): string;
}
/**
 * LLMDecisionProcessor Class
 *
 * Handles LLM-based decision making for agents that have useLLM=true.
 *
 * Usage:
 * ```typescript
 * const processor = new LLMDecisionProcessor(llmQueue, promptBuilder);
 *
 * // In update loop for LLM agents
 * const result = processor.process(entity, world, agent);
 * if (result.changed) {
 *   entity.updateComponent(ComponentType.Agent, c => ({
 *     ...c,
 *     behavior: result.behavior,
 *     behaviorState: result.behaviorState
 *   }));
 * }
 * ```
 */
/**
 * Configuration for LLM decision processor behavior
 */
export interface LLMProcessorConfig {
  minThinkCadenceSeconds: number;  // Min seconds between LLM calls when busy
  idleThinkDelaySeconds: number;   // Delay before LLM call when idle
  enableLLMAgents: boolean;        // Master toggle for LLM agents
}
const DEFAULT_CONFIG: LLMProcessorConfig = {
  minThinkCadenceSeconds: 300,  // 5 minutes
  idleThinkDelaySeconds: 5,     // 5 seconds
  enableLLMAgents: true,
};
export class LLMDecisionProcessor {
  private llmDecisionQueue: LLMDecisionQueue;
  private promptBuilder: PromptBuilder;
  private lastLLMRequestTime: number = 0; // Wall-clock time (ms)
  private llmRequestCooldownMs: number = 250; // Minimum ms between LLM requests (rate limit)
  // Configurable settings
  private config: LLMProcessorConfig = { ...DEFAULT_CONFIG };
  constructor(llmDecisionQueue: LLMDecisionQueue, promptBuilder: PromptBuilder) {
    this.llmDecisionQueue = llmDecisionQueue;
    this.promptBuilder = promptBuilder;
  }
  /**
   * Update configuration (called when settings change)
   */
  updateConfig(config: Partial<LLMProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  /**
   * Get current configuration
   */
  getConfig(): LLMProcessorConfig {
    return { ...this.config };
  }
  /**
   * Check if agent has active work (doesn't need LLM guidance).
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
      'deposit_items', 'navigate', 'explore', 'seek_food', 'talk'
    ];
    if (productiveBehaviors.includes(agent.behavior)) {
      return true;
    }
    return false;
  }
  /**
   * Check if agent should call LLM (smart calling).
   * Respects agent tier configuration for different LLM usage patterns.
   */
  private shouldCallLLM(agent: AgentComponent): boolean {
    // Master toggle - if LLM agents disabled, never call
    if (!this.config.enableLLMAgents) {
      return false;
    }

    // Check if this agent should use LLM based on tier and interaction state
    if (!shouldUseLLM(agent)) {
      return false;
    }

    // Get tier configuration
    const tier: AgentTier = agent.tier ?? (agent.useLLM ? 'full' : 'autonomic');
    const tierConfig = AGENT_TIER_CONFIG[tier];

    const now = Date.now();

    // Task completion trigger (if tier supports it)
    if (agent.behaviorCompleted && tierConfig.thinkOnTaskComplete) {
      return true;
    }

    // Idle thinking (if tier supports it)
    if (tierConfig.idleThinkDelaySec !== null) {
      if (!this.hasActiveWork(agent) && ['idle', 'wander', 'rest'].includes(agent.behavior)) {
        const secondsSinceLastCall = (now - this.lastLLMRequestTime) / 1000;
        if (secondsSinceLastCall >= tierConfig.idleThinkDelaySec) {
          return true;
        }
      }
    }

    // Periodic thinking (if tier supports it)
    if (tierConfig.periodicThinkSec !== null) {
      const secondsSinceLastCall = (now - this.lastLLMRequestTime) / 1000;
      if (secondsSinceLastCall >= tierConfig.periodicThinkSec) {
        return true;
      }
    }

    return false;
  }
  /**
   * Process LLM decision for an entity.
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): LLMDecisionResult {
    // Check for interaction-triggered LLM timeout (for autonomic agents)
    if (agent.tier === 'autonomic' && agent.interactionTriggeredLLM && agent.interactionLLMStartTick !== undefined) {
      const ticksElapsed = world.tick - agent.interactionLLMStartTick;
      if (ticksElapsed >= INTERACTION_LLM_TIMEOUT_TICKS) {
        // Interaction window expired - disable LLM and return to scripted behavior
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) =>
          disableInteractionLLM(current)
        );
        return { changed: false, source: 'llm' };
      }
    }

    // Decrement cooldown
    if (agent.llmCooldown > 0) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        llmCooldown: Math.max(0, current.llmCooldown - 1),
      }));
    }
    // PLANNED BUILD SYSTEM - Execute planned builds autonomously
    // If agent has planned builds and is in an interruptible behavior, drive them to gather resources and build
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    // Behaviors that can be interrupted to work on planned builds
    const interruptibleBehaviors = ['wander', 'idle', 'rest', 'talk', 'follow_agent', 'explore'];
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
    // Check if we have a ready decision
    const decision = this.llmDecisionQueue.getDecision(entity.id);
    if (decision) {
      // Clear behaviorCompleted flag when processing new decision
      if (agent.behaviorCompleted) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behaviorCompleted: false,
        }));
      }
      return this.processDecision(entity, world, decision, getNearbyAgents);
    }
    // Smart LLM calling - only call when needed
    if (agent.llmCooldown === 0 && this.shouldCallLLM(agent)) {
      const now = Date.now();
      // Check rate limiting to prevent thundering herd (real time)
      const msSinceLastRequest = now - this.lastLLMRequestTime;
      if (msSinceLastRequest >= this.llmRequestCooldownMs) {
        // Request new decision using structured prompt
        const prompt = this.promptBuilder.buildPrompt(entity, world);

        // Determine the reason for this LLM call
        const reason = agent.behaviorCompleted
          ? 'task_complete'
          : !this.hasActiveWork(agent)
            ? 'idle'
            : 'periodic';

        // Emit LLM request event
        world.eventBus.emit({
          type: 'llm:request',
          source: entity.id,
          data: {
            agentId: entity.id,
            promptLength: prompt.length,
            reason,
          },
        });

        // Emit comprehensive agent state snapshot for dashboard
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
          },
        });

        // Pass custom LLM config if agent has it configured
        this.llmDecisionQueue.requestDecision(entity.id, prompt, agent.customLLM).catch((err: Error) => {
          console.error(`[LLMDecisionProcessor] LLM decision failed for ${entity.id}:`, err);

          // Categorize the error type
          const errorMessage = err.message || String(err);
          let errorType: 'timeout' | 'connection' | 'parse' | 'unknown' = 'unknown';
          if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
            errorType = 'timeout';
          } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
            errorType = 'connection';
          } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
            errorType = 'parse';
          }

          // Emit llm:error event for metrics tracking
          world.eventBus.emit({
            type: 'llm:error',
            source: entity.id,
            data: {
              agentId: entity.id,
              error: errorMessage.slice(0, 200), // Truncate long errors
              errorType,
            },
          });

          // On LLM failure, temporarily fall back to scripted behavior
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            llmCooldown: 60, // 3 second cooldown before retry (at 20 TPS)
          }));
        });
        // Update rate limiting timestamp (real time)
        this.lastLLMRequestTime = now;
      }
    }
    // Check for fallback behavior when stuck
    const fallback = this.checkFallbackBehavior(entity, agent);
    if (fallback) {
      return fallback;
    }
    return { changed: false, source: 'llm' };
  }
  /**
   * Process an LLM decision response.
   */
  private processDecision(
    entity: EntityImpl,
    world: World,
    decision: string,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): LLMDecisionResult {
    // Try to parse as JSON first (structured response with thinking/speaking/action)
    let parsedResponse: {
      action?: unknown;
      speaking?: string;
      thinking?: string;
    } | null = null;
    try {
      parsedResponse = JSON.parse(decision);
    } catch {
      // Not JSON, use legacy parsing
    }
    let behavior: AgentBehavior | null = null;
    let speaking: string | undefined;
    let thinking: string | undefined;
    let behaviorState: Record<string, unknown> = {};
    let behaviorQueue: QueuedBehavior[] | undefined;
    if (parsedResponse && parsedResponse.action) {
      // Structured response
      const action = parsedResponse.action;
      speaking = parsedResponse.speaking || undefined;
      thinking = parsedResponse.thinking || undefined;
      // Handle goal-setting and priority-setting actions (don't change behavior, just update state)
      if (typeof action === 'object' && action !== null && !Array.isArray(action) && 'type' in action) {
        const typedAction = action as { type: string; goal?: string; priorities?: StrategicPriorities };
        if (typedAction.type === 'set_personal_goal' && typedAction.goal) {
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            personalGoal: typedAction.goal,
          }));
          return { changed: false, source: 'llm' };
        } else if (typedAction.type === 'set_medium_term_goal' && typedAction.goal) {
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            mediumTermGoal: typedAction.goal,
          }));
          return { changed: false, source: 'llm' };
        } else if (typedAction.type === 'set_group_goal' && typedAction.goal) {
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            groupGoal: typedAction.goal,
          }));
          return { changed: false, source: 'llm' };
        } else if (typedAction.type === 'set_priorities' && typedAction.priorities) {
          // Set strategic priorities for automated behavior selection
          const priorities = typedAction.priorities as StrategicPriorities;

          // IMMEDIATELY select a behavior based on these priorities
          // This fixes the issue where LLM agents set priorities but never act on them
          const selectedBehavior = selectBehaviorFromPriorities(priorities, entity, world, getNearbyAgents);

          if (selectedBehavior) {
            entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
              ...current,
              priorities,
              behavior: selectedBehavior.behavior,
              behaviorState: selectedBehavior.behaviorState,
              recentSpeech: speaking,
              lastThought: thinking,
            }));

            // Emit llm:decision event for metrics tracking
            world.eventBus.emit({
              type: 'llm:decision',
              source: entity.id,
              data: {
                agentId: entity.id,
                decision: 'set_priorities',
                behavior: selectedBehavior.behavior,
                reasoning: thinking,
                source: 'llm',
              },
            });

            return {
              changed: true,
              behavior: selectedBehavior.behavior,
              behaviorState: selectedBehavior.behaviorState,
              speaking,
              thinking,
              source: 'llm',
            };
          }

          // Fallback: just set priorities without changing behavior
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            priorities,
            recentSpeech: speaking,
            lastThought: thinking,
          }));

          // Emit llm:decision event for metrics tracking
          world.eventBus.emit({
            type: 'llm:decision',
            source: entity.id,
            data: {
              agentId: entity.id,
              decision: 'set_priorities',
              behavior: 'set_priorities',
              reasoning: thinking,
              source: 'llm',
            },
          });

          return {
            changed: true,
            speaking,
            thinking,
            source: 'llm',
          };
        } else if (typedAction.type === 'plan_build') {
          // Plan a build and IMMEDIATELY start working on it
          const buildAction = typedAction as {
            type: string;
            building: string;
            position?: { x: number; y: number };
            priority?: 'low' | 'normal' | 'high';
            reason?: string;
          };
          const buildingType = buildAction.building || BuildingType.StorageChest;

          // CHECK FOR DUPLICATES: Don't build if this building type is already in progress or planned
          // 1. Check world for existing/in-progress buildings of this type
          const existingBuildings = world.query().with(ComponentType.Building).executeEntities();
          let completeCount = 0;
          let inProgressCount = 0;
          for (const b of existingBuildings) {
            const bc = b.getComponent<BuildingComponent>(ComponentType.Building);
            if (bc?.buildingType === buildingType) {
              if (bc.isComplete) completeCount++;
              else inProgressCount++;
            }
          }

          // PROXIMITY CHECK: For campfires specifically, check if there's one within reasonable distance
          // This prevents agents from building campfires when they can just walk to an existing one
          // Check BOTH complete and in-progress campfires to prevent simultaneous building
          if (buildingType === 'campfire') {
            const agentPosition = entity.getComponent<PositionComponent>(ComponentType.Position);
            if (agentPosition) {
              const CAMPFIRE_PROXIMITY_THRESHOLD = 200; // tiles

              // Check existing/in-progress campfires
              for (const building of existingBuildings) {
                const buildingImpl = building as EntityImpl;
                const bc = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
                const bp = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

                // Check for ANY campfire (complete OR in-progress) within range
                if (bc?.buildingType === 'campfire' && bp) {
                  const distanceSquared = (agentPosition.x - bp.x) ** 2 + (agentPosition.y - bp.y) ** 2;
                  if (distanceSquared <= CAMPFIRE_PROXIMITY_THRESHOLD * CAMPFIRE_PROXIMITY_THRESHOLD) {
                    // There's already a campfire (or one being built) within 200 tiles - don't build another
                    return { changed: false, source: 'llm' };
                  }
                }
              }

              // ALSO check if any other agent has a campfire PLANNED nearby
              const allAgents = world.query().with(ComponentType.Agent).executeEntities();
              for (const otherAgent of allAgents) {
                if (otherAgent.id === entity.id) continue;
                const otherAgentComp = otherAgent.getComponent<AgentComponent>(ComponentType.Agent);
                const otherAgentPos = otherAgent.getComponent<PositionComponent>(ComponentType.Position);

                if (otherAgentComp?.plannedBuilds && otherAgentPos) {
                  const hasCampfirePlanned = otherAgentComp.plannedBuilds.some(p => p.buildingType === 'campfire');
                  if (hasCampfirePlanned) {
                    // Check if the planned location would be within our threshold
                    // Use the other agent's position as proxy for where they'll build
                    const distanceSquared = (agentPosition.x - otherAgentPos.x) ** 2 + (agentPosition.y - otherAgentPos.y) ** 2;
                    if (distanceSquared <= CAMPFIRE_PROXIMITY_THRESHOLD * CAMPFIRE_PROXIMITY_THRESHOLD) {
                      // Another agent nearby is already planning a campfire - don't duplicate
                      return { changed: false, source: 'llm' };
                    }
                  }
                }
              }
            }
          }

          // Define building limits (how many of each type before blocking)
          const BUILDING_LIMITS: Record<string, number> = {
            'workbench': 1,
            'forge': 1,
            'campfire': 2,
            'well': 1,
            'farm-shed': 1,
            'storage-chest': 2, // Limit storage chests to prevent duplicate spam
            'bed': 3,
            'tent': 2,
            'lean-to': 2,
          };
          const limit = BUILDING_LIMITS[buildingType] ?? 1; // Default to 1 for unlisted buildings

          // 2. Check if this agent already has this building type planned
          const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
          const alreadyPlannedBySelf = agent?.plannedBuilds?.some(p => p.buildingType === buildingType) ?? false;

          // 3. Check if ANY other agent has this building type planned
          const allAgents = world.query().with(ComponentType.Agent).executeEntities();
          let plannedByOthers = 0;
          for (const otherAgent of allAgents) {
            if (otherAgent.id === entity.id) continue;
            const otherAgentComp = otherAgent.getComponent<AgentComponent>(ComponentType.Agent);
            if (otherAgentComp?.plannedBuilds?.some(p => p.buildingType === buildingType)) {
              plannedByOthers++;
            }
          }

          // Skip if at limit, already planned by self, already in progress, or planned by others
          const totalPlannedOrBuilding = completeCount + inProgressCount + plannedByOthers;
          if (totalPlannedOrBuilding >= limit || alreadyPlannedBySelf || inProgressCount > 0) {
            // Don't add duplicate - just continue with current behavior
            return { changed: false, source: 'llm' };
          }

          const plannedBuild: PlannedBuild = {
            buildingType,
            position: buildAction.position || { x: 0, y: 0 },
            priority: buildAction.priority || 'normal',
            createdAt: world.tick,
            reason: buildAction.reason,
          };
          // Add to planned builds for persistence
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
            const existingPlans = current.plannedBuilds || [];
            return {
              ...current,
              plannedBuilds: [...existingPlans, plannedBuild],
              recentSpeech: speaking,
              lastThought: thinking,
            };
          });

          // Emit llm:decision event for metrics tracking
          world.eventBus.emit({
            type: 'llm:decision',
            source: entity.id,
            data: {
              agentId: entity.id,
              decision: 'plan_build',
              behavior: 'plan_build',
              reasoning: thinking,
              source: 'llm',
            },
          });

          // IMMEDIATELY start working on the build (don't wait for idle state)
          const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
          if (inventory) {
            const updatedAgent = entity.getComponent<AgentComponent>(ComponentType.Agent);
            if (updatedAgent?.plannedBuilds) {
              const buildResult = this.processPlannedBuilds(entity, world, updatedAgent.plannedBuilds, inventory);
              if (buildResult) {
                // Successfully started gathering or building
                return {
                  ...buildResult,
                  speaking,
                  thinking,
                  source: 'llm',
                };
              }
            }
          }
          // Fallback if we couldn't immediately process
          return {
            changed: true,
            speaking,
            thinking,
            source: 'llm',
          };
        }
      }
      // Check if action is a plan array (multi-step)
      if (Array.isArray(action) && action.length > 0) {
        // Multi-step plan - convert to behavior queue
        behaviorQueue = this.convertPlanToQueue(action as ParsedAction[], speaking);
        if (behaviorQueue.length > 0) {
          // First behavior becomes the active one
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
        // If converted is null, behavior stays as current (no fallback)
      }
      // Simple string action - apply default behaviorState for behaviors that need it
      else if (typeof action === 'string') {
        // Skip autonomic-only behaviors - these should not be set via LLM action
        // 'talk' happens via recentSpeech, not behavior switch
        // 'wander', 'rest', 'idle', 'explore' are fallback behaviors
        const autonomicBehaviors = ['talk', 'wander', 'rest', 'idle', 'explore', 'explore_frontier', 'explore_spiral'];
        if (autonomicBehaviors.includes(action)) {
          // Don't change behavior - stay in current behavior
          behavior = null;
        } else {
          behavior = action as AgentBehavior;
          // Set default behaviorState for behaviors that require parameters
          if (behavior === 'gather' || behavior === 'pick') {
            behaviorState.resourceType = 'wood';
          }
        }
      }
    } else {
      // Legacy text parsing
      const action = parseAction(decision);
      if (action) {
        behavior = actionToBehavior(action) ?? null;
        // Build behaviorState based on action type
        if (action.type === 'chop') {
          behaviorState.resourceType = 'wood';
        } else if (action.type === 'mine') {
          behaviorState.resourceType = 'stone';
        } else if (action.type === 'build' && 'buildingType' in action) {
          behaviorState.buildingType = action.buildingType;
        } else if (action.type === 'craft' && 'recipeId' in action) {
          behaviorState.recipeId = action.recipeId;
          if ('quantity' in action && action.quantity) {
            behaviorState.quantity = action.quantity;
          }
        } else if (action.type === 'follow' && 'targetId' in action) {
          const targetId = (action as { targetId: string }).targetId;
          // Resolve 'nearest' to actual agent ID
          if (targetId === 'nearest') {
            const nearbyAgents = getNearbyAgents(entity, world, 10);
            if (nearbyAgents.length > 0) {
              behaviorState.targetId = nearbyAgents[0]!.id;
            } else {
              // No nearby agents - cannot follow, return null to keep current behavior
              // NO FALLBACK - if LLM requested follow but nobody is nearby, that's an error
              behavior = null;
            }
          } else {
            behaviorState.targetId = targetId;
          }
        }
        // Log legacy build decisions
        if (action.type === 'build' || behavior === 'build') {
        }
        // Log craft decisions
        if (action.type === 'craft' || behavior === 'craft') {
        }
      }
    }
    if (behavior) {
      // Apply the decision with optional behavior queue
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior,
        behaviorState,
        behaviorQueue: behaviorQueue, // Will be undefined for single actions
        currentQueueIndex: behaviorQueue ? 0 : undefined,
        llmCooldown: 1200, // 1 minute cooldown at 20 TPS
        recentSpeech: speaking, // Store speech for nearby agents to hear
        lastThought: thinking, // Store thinking for UI display
      }));

      // Emit llm:decision event for metrics tracking
      world.eventBus.emit({
        type: 'llm:decision',
        source: entity.id,
        data: {
          agentId: entity.id,
          decision: behavior,
          behavior,
          reasoning: thinking,
          source: 'llm',
        },
      });

      return {
        changed: true,
        behavior,
        behaviorState,
        speaking,
        thinking,
        source: 'llm',
      };
    }
    return { changed: false, source: 'llm' };
  }
  /**
   * Convert a plan array to a behavior queue.
   */
  private convertPlanToQueue(actions: ParsedAction[], speaking?: string): QueuedBehavior[] {
    const queue: QueuedBehavior[] = [];
    for (const action of actions) {
      if (!action.type) continue;
      const converted = actionObjectToBehavior(action);
      // Skip actions that couldn't be converted (unrecognized action types)
      if (!converted) continue;
      const { behavior, behaviorState } = converted;
      const label = generateBehaviorLabel(action);
      // For gather with amount, set up repeats based on typical gather rate
      // Each gather typically yields ~10 resources, so amount/10 = repeats
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
    // Log the plan summary if speaking (agent announced the plan)
    if (speaking && queue.length > 1) {
    }
    return queue;
  }
  /**
   * Check if LLM agent is stuck and needs fallback behavior.
   */
  private checkFallbackBehavior(
    entity: EntityImpl,
    agent: AgentComponent
  ): LLMDecisionResult | null {
    // If LLM agent is stuck in wander/idle/rest due to LLM failures, apply basic scripted logic
    if (
      agent.llmCooldown > 0 &&
      (agent.behavior === 'wander' || agent.behavior === 'idle' || agent.behavior === 'rest')
    ) {
      const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
      // Check if agent should gather resources
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
   * This drives autonomous behavior for LLM agents who have planned builds.
   */
  private processPlannedBuilds(
    entity: EntityImpl,
    world: World,
    plannedBuilds: PlannedBuild[],
    inventory: InventoryComponent
  ): LLMDecisionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;
    // Sort by priority (high > normal > low)
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const sortedBuilds = [...plannedBuilds].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    // Process highest priority build
    const build = sortedBuilds[0];
    if (!build) return null;
    const costs = BUILDING_COSTS[build.buildingType];
    if (!costs) {
      // Unknown building type - remove from queue
      console.warn(`[LLMDecisionProcessor] Unknown building type: ${build.buildingType}`);
      this.removePlannedBuild(entity, build);
      return null;
    }
    // Get village storage stats (agents may have deposited resources there)
    const storageStats = calculateStorageStats(world);
    // Calculate what resources we're missing (check BOTH inventory AND storage)
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
    // If we have all resources, check if we're near the build location
    if (Object.keys(missing).length === 0) {
      // Use agent's current position if no build position specified
      const buildPos = build.position.x === 0 && build.position.y === 0
        ? { x: position.x, y: position.y }
        : build.position;
      const distToBuildSquared = (position.x - buildPos.x) ** 2 + (position.y - buildPos.y) ** 2;
      if (distToBuildSquared <= PLANNED_BUILD_REACH * PLANNED_BUILD_REACH || (build.position.x === 0 && build.position.y === 0)) {
        // Near enough OR no specific position - start building!
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
          source: 'llm',
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
          source: 'llm',
        };
      }
    }
    // Missing resources - gather the most needed one
    // Prioritize by how much we're missing (gather what we need most)
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
        source: 'llm',
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
// ============================================================================
// Standalone functions for simpler usage
// ============================================================================
let processorInstance: LLMDecisionProcessor | null = null;
/**
 * Initialize the LLM decision processor with required dependencies.
 */
export function initLLMDecisionProcessor(
  llmDecisionQueue: LLMDecisionQueue,
  promptBuilder: PromptBuilder
): LLMDecisionProcessor {
  processorInstance = new LLMDecisionProcessor(llmDecisionQueue, promptBuilder);
  return processorInstance;
}
/**
 * Get the LLM decision processor instance.
 */
export function getLLMDecisionProcessor(): LLMDecisionProcessor | null {
  return processorInstance;
}
