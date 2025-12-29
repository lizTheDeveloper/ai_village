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
import type { AgentComponent, AgentBehavior, QueuedBehavior, StrategicPriorities, PlannedBuild } from '../components/AgentComponent.js';
import { PLANNED_BUILD_REACH } from '../components/AgentComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { parseAction, actionToBehavior } from '../actions/AgentAction.js';
import { calculateStorageStats } from '../utils/StorageContext.js';
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
}
/**
 * Convert a parsed action object to behavior + behaviorState
 */
function actionObjectToBehavior(action: ParsedAction): { behavior: AgentBehavior; behaviorState: Record<string, unknown> } {
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
      behaviorState.buildingType = action.building || 'lean-to';
      return { behavior: 'build', behaviorState };
    case 'craft':
      behaviorState.recipeId = action.recipe || action.target || 'wood_plank';
      if (action.amount) {
        behaviorState.quantity = action.amount;
      }
      return { behavior: 'craft', behaviorState };
    case 'talk':
      // TalkBehavior expects partnerId, not targetId
      behaviorState.partnerId = action.target || 'nearest';
      return { behavior: 'talk', behaviorState };
    case 'follow':
      behaviorState.targetId = action.target || 'nearest';
      return { behavior: 'follow_agent', behaviorState };
    case 'plant':
      behaviorState.seedType = action.seed || 'wheat';
      return { behavior: 'plant', behaviorState };
    case 'till':
      return { behavior: 'till', behaviorState };
    case 'water':
      return { behavior: 'water', behaviorState };
    case 'explore':
      return { behavior: 'explore', behaviorState };
    case 'deposit_items':
      return { behavior: 'deposit_items', behaviorState };
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
      return { behavior: 'idle', behaviorState };
    // NOTE: 'rest' removed - sleep is autonomic (triggered by AutonomicSystem)
    case 'wander':
    default:
      return { behavior: 'wander', behaviorState };
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
      return `Craft ${action.recipe || action.target || 'item'}`;
    case 'talk':
      return `Talk to ${action.target || 'someone'}`;
    case 'plant':
      return `Plant ${action.seed || 'seeds'}`;
    case 'till':
      return 'Till soil';
    case 'water':
      return 'Water plants';
    case 'explore':
      return 'Explore area';
    case 'deposit_items':
      return 'Store items';
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
  const categories = ['building', 'gathering', 'farming', 'social', 'exploration', 'rest'] as const;
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
      // Try to find a nearby agent to talk to
      const nearbyAgents = getNearbyAgents(entity, world, 15);
      const availableAgents = nearbyAgents.filter(other => {
        const otherConv = other.components.get('conversation') as { isActive?: boolean } | undefined;
        return !otherConv?.isActive;
      });
      if (availableAgents.length > 0) {
        const targetAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
        if (targetAgent) {
          return { behavior: 'talk', behaviorState: { partnerId: targetAgent.id } };
        }
      }
      // No one nearby, wander to find people
      return { behavior: 'wander', behaviorState: {} };
    }
    case 'gathering': {
      return { behavior: 'gather', behaviorState: { resourceType: 'wood' } };
    }
    case 'building': {
      // Check if agent has a planned build
      const agent = entity.getComponent<AgentComponent>('agent');
      if (agent?.plannedBuilds && agent.plannedBuilds.length > 0) {
        return { behavior: 'build', behaviorState: { buildingType: agent.plannedBuilds[0]?.buildingType || 'storage-chest' } };
      }
      // No planned build, gather resources for building
      return { behavior: 'gather', behaviorState: { resourceType: 'wood', forBuild: true } };
    }
    case 'farming': {
      return { behavior: 'farm', behaviorState: {} };
    }
    case 'exploration': {
      return { behavior: 'explore', behaviorState: {} };
    }
    // NOTE: 'rest' removed - sleep is autonomic (triggered by AutonomicSystem)
    default:
      return { behavior: 'wander', behaviorState: {} };
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
/**
 * Interface for LLM decision queue
 */
export interface LLMDecisionQueue {
  getDecision(entityId: string): string | null;
  requestDecision(entityId: string, prompt: string): Promise<void>;
}
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
 *   entity.updateComponent('agent', c => ({
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
      'gather', 'build', 'farm', 'till', 'plant', 'water', 'harvest',
      'deposit_items', 'navigate', 'explore', 'seek_food', 'talk'
    ];
    if (productiveBehaviors.includes(agent.behavior)) {
      return true;
    }
    return false;
  }
  /**
   * Check if agent should call LLM (smart calling).
   */
  private shouldCallLLM(agent: AgentComponent): boolean {
    // Master toggle - if LLM agents disabled, never call
    if (!this.config.enableLLMAgents) {
      return false;
    }
    const now = Date.now();
    // Always call if task just completed
    if (agent.behaviorCompleted) {
      return true;
    }
    // Call if no work and idle (with short delay)
    if (!this.hasActiveWork(agent) && ['idle', 'wander', 'rest'].includes(agent.behavior)) {
      const secondsSinceLastCall = (now - this.lastLLMRequestTime) / 1000;
      if (secondsSinceLastCall >= this.config.idleThinkDelaySeconds) {
        return true;
      }
    }
    // Minimum cadence - call even if busy, but much less frequently (real time)
    const secondsSinceLastCall = (now - this.lastLLMRequestTime) / 1000;
    if (secondsSinceLastCall >= this.config.minThinkCadenceSeconds) {
      return true;
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
    // Decrement cooldown
    if (agent.llmCooldown > 0) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        llmCooldown: Math.max(0, current.llmCooldown - 1),
      }));
    }
    // PLANNED BUILD SYSTEM - Execute planned builds autonomously
    // If agent has planned builds and is in an interruptible behavior, drive them to gather resources and build
    const inventory = entity.getComponent<InventoryComponent>('inventory');
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
        entity.updateComponent<AgentComponent>('agent', (current) => ({
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
        const identity = entity.components.get('identity') as { name?: string } | undefined;
        const position = entity.getComponent<PositionComponent>('position');
        const inventory = entity.getComponent<InventoryComponent>('inventory');
        const needs = entity.components.get('needs') as { hunger?: number; energy?: number; social?: number } | undefined;
        const skillsComp = entity.components.get('skills') as { levels?: Record<string, number> } | undefined;

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

        this.llmDecisionQueue.requestDecision(entity.id, prompt).catch((err: Error) => {
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
          entity.updateComponent<AgentComponent>('agent', (current) => ({
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
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            personalGoal: typedAction.goal,
          }));
          return { changed: false, source: 'llm' };
        } else if (typedAction.type === 'set_medium_term_goal' && typedAction.goal) {
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            mediumTermGoal: typedAction.goal,
          }));
          return { changed: false, source: 'llm' };
        } else if (typedAction.type === 'set_group_goal' && typedAction.goal) {
          entity.updateComponent<AgentComponent>('agent', (current) => ({
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
            entity.updateComponent<AgentComponent>('agent', (current) => ({
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
          entity.updateComponent<AgentComponent>('agent', (current) => ({
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
          const buildingType = buildAction.building || 'storage-chest';

          // CHECK FOR DUPLICATES: Don't build if this building type is already in progress or planned
          // 1. Check world for existing/in-progress buildings of this type
          const existingBuildings = world.query().with('building').executeEntities();
          let completeCount = 0;
          let inProgressCount = 0;
          for (const b of existingBuildings) {
            const bc = b.components.get('building') as { buildingType?: string; isComplete?: boolean } | undefined;
            if (bc?.buildingType === buildingType) {
              if (bc.isComplete) completeCount++;
              else inProgressCount++;
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
          const agent = entity.getComponent<AgentComponent>('agent');
          const alreadyPlannedBySelf = agent?.plannedBuilds?.some(p => p.buildingType === buildingType) ?? false;

          // 3. Check if ANY other agent has this building type planned
          const allAgents = world.query().with('agent').executeEntities();
          let plannedByOthers = 0;
          for (const otherAgent of allAgents) {
            if (otherAgent.id === entity.id) continue;
            const otherAgentComp = otherAgent.components.get('agent') as AgentComponent | undefined;
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
          entity.updateComponent<AgentComponent>('agent', (current) => {
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
          const inventory = entity.getComponent<InventoryComponent>('inventory');
          if (inventory) {
            const updatedAgent = entity.getComponent<AgentComponent>('agent');
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
        behavior = converted.behavior;
        behaviorState = converted.behaviorState;
      }
      // Simple string action - apply default behaviorState for behaviors that need it
      else if (typeof action === 'string') {
        behavior = action as AgentBehavior;
        // Set default behaviorState for behaviors that require parameters
        if (behavior === 'talk') {
          behaviorState.partnerId = 'nearest';
        } else if (behavior === 'gather' || behavior === 'pick') {
          behaviorState.resourceType = 'wood';
        }
      }
    } else {
      // Legacy text parsing
      const action = parseAction(decision);
      if (action) {
        behavior = actionToBehavior(action);
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
              // No nearby agents, don't set follow behavior
              behavior = 'wander';
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
      entity.updateComponent<AgentComponent>('agent', (current) => ({
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
      const { behavior, behaviorState } = actionObjectToBehavior(action);
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
      const inventory = entity.getComponent<InventoryComponent>('inventory');
      // Check if agent should gather resources
      if (inventory && Math.random() < 0.2) {
        const hasWood = inventory.slots.some((s) => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some((s) => s.itemId === 'stone' && s.quantity >= 10);
        if (!hasWood || !hasStone) {
          const preferredType = !hasWood ? 'wood' : 'stone';
          entity.updateComponent<AgentComponent>('agent', (current) => ({
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
    const position = entity.getComponent<PositionComponent>('position');
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
      const distToBuild = Math.sqrt(
        (position.x - buildPos.x) ** 2 + (position.y - buildPos.y) ** 2
      );
      if (distToBuild <= PLANNED_BUILD_REACH || (build.position.x === 0 && build.position.y === 0)) {
        // Near enough OR no specific position - start building!
        this.removePlannedBuild(entity, build);
        entity.updateComponent<AgentComponent>('agent', (current) => ({
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
        entity.updateComponent<AgentComponent>('agent', (current) => ({
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
      entity.updateComponent<AgentComponent>('agent', (current) => ({
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
    entity.updateComponent<AgentComponent>('agent', (current) => ({
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
