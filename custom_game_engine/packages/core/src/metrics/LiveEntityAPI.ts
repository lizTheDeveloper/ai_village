/**
 * LiveEntityAPI - Handles live entity queries from the metrics dashboard
 *
 * Provides real-time entity data including:
 * - List of all agents with basic info
 * - Detailed entity state (components, inventory, etc.)
 * - Live LLM prompt generation using StructuredPromptBuilder
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { MetricsStreamClient, QueryRequest, QueryResponse, ActionRequest, ActionResponse } from './MetricsStreamClient.js';
import { pendingApprovalRegistry } from '../crafting/PendingApprovalRegistry.js';
import { spawnCity, getCityTemplates, type CitySpawnConfig } from '../city/CitySpawner.js';
import { createLLMAgent, createWanderingAgent } from '@ai-village/world';
import { DeityComponent } from '../components/DeityComponent.js';

/**
 * Interface for the prompt builder (from @ai-village/llm)
 */
export interface PromptBuilder {
  buildPrompt(agent: Entity, world: World): string;
}

/**
 * Entity summary for the entities list
 */
export interface EntitySummary {
  id: string;
  name: string;
  type: 'agent' | 'animal' | 'building' | 'plant' | 'resource' | 'other';
  position?: { x: number; y: number };
  behavior?: string;
}

/**
 * Detailed entity data
 */
export interface EntityDetails {
  id: string;
  name?: string;
  components: Record<string, unknown>;
}

/**
 * LiveEntityAPI connects the game's World to the metrics dashboard
 */
export class LiveEntityAPI {
  private world: World;
  private promptBuilder: PromptBuilder | null = null;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Set the prompt builder for generating LLM prompts
   */
  setPromptBuilder(builder: PromptBuilder): void {
    this.promptBuilder = builder;
  }

  /**
   * Attach to a MetricsStreamClient to handle queries and actions
   */
  attach(client: MetricsStreamClient): void {
    client.setQueryHandler(this.handleQuery.bind(this));
    client.setActionHandler(this.handleAction.bind(this));
  }

  /**
   * Handle incoming queries
   */
  async handleQuery(query: QueryRequest): Promise<QueryResponse> {
    switch (query.queryType) {
      case 'entities':
        return this.handleEntitiesQuery(query);
      case 'entity':
        return this.handleEntityQuery(query);
      case 'entity_prompt':
        return this.handleEntityPromptQuery(query);
      case 'universe':
        return this.handleUniverseQuery(query);
      case 'magic':
        return this.handleMagicQuery(query);
      case 'divinity':
        return this.handleDivinityQuery(query);
      case 'pending_approvals':
        return this.handlePendingApprovalsQuery(query);
      case 'research':
        return this.handleResearchQuery(query);
      case 'plants':
        return this.handlePlantsQuery(query);
      case 'terrain':
        return this.handleTerrainQuery(query);
      default:
        return {
          requestId: query.requestId,
          success: false,
          error: `Unknown query type: ${query.queryType}`,
        };
    }
  }

  /**
   * Handle incoming actions
   */
  async handleAction(action: ActionRequest): Promise<ActionResponse> {
    switch (action.action) {
      case 'set-llm-config':
        return this.handleSetLLMConfig(action);
      case 'approve-creation':
        return this.handleApproveCreation(action);
      case 'reject-creation':
        return this.handleRejectCreation(action);
      case 'set-skill':
        return this.handleSetSkill(action);
      case 'spawn-entity':
        return this.handleSpawnEntity(action);
      case 'spawn-agent':
        return this.handleSpawnAgent(action);
      case 'teleport':
        return this.handleTeleport(action);
      case 'set-need':
        return this.handleSetNeed(action);
      case 'give-item':
        return this.handleGiveItem(action);
      case 'trigger-behavior':
        return this.handleTriggerBehavior(action);
      case 'set-speed':
        return this.handleSetSpeed(action);
      case 'pause':
        return this.handlePause(action);
      case 'grant-spell':
        return this.handleGrantSpell(action);
      case 'add-belief':
        return this.handleAddBelief(action);
      case 'create-deity':
        return this.handleCreateDeity(action);
      case 'spawn-city':
        return await this.handleSpawnCity(action);
      case 'list-city-templates':
        return this.handleListCityTemplates(action);
      default:
        return {
          requestId: action.requestId,
          success: false,
          error: `Unknown action: ${action.action}`,
        };
    }
  }

  /**
   * Handle set-llm-config action
   */
  private handleSetLLMConfig(action: ActionRequest): ActionResponse {
    const { agentId, config } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const agent = entity.components.get('agent') as { customLLM?: unknown } | undefined;
    if (!agent) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} is not an agent`,
      };
    }

    // Set or clear the custom LLM config
    if (config === null || config === undefined) {
      agent.customLLM = undefined;
    } else {
      agent.customLLM = config;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, config: agent.customLLM },
    };
  }

  /**
   * Handle set-skill action
   */
  private handleSetSkill(action: ActionRequest): ActionResponse {
    const { agentId, skill, level } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (!skill || typeof skill !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid skill parameter',
      };
    }

    if (typeof level !== 'number' || level < 0 || level > 5 || !Number.isInteger(level)) {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Level must be an integer between 0 and 5',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const skills = entity.components.get('skills') as { levels?: Record<string, number> } | undefined;
    if (!skills) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} does not have skills component`,
      };
    }

    if (!skills.levels) {
      skills.levels = {};
    }

    // Set the skill level
    skills.levels[skill] = level;

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, skill, level },
    };
  }

  /**
   * Spawn an entity (building, animal, etc.) at the specified location
   */
  private handleSpawnEntity(action: ActionRequest): ActionResponse {
    const { type, x, y } = action.params;

    if (!type || typeof type !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid type parameter',
      };
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid x, y parameters',
      };
    }

    // Create the entity
    const entity = this.world.createEntity();
    const entityId = entity.id;

    // Set position via component (assuming PositionComponent exists)
    // TODO: Add proper position component initialization

    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Failed to spawn entity of type: ${type}`,
      };
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { entityId, type, x, y },
    };
  }

  /**
   * Spawn an NPC city with buildings and AI-driven agents
   */
  private async handleSpawnCity(action: ActionRequest): Promise<ActionResponse> {
    const { template, x, y, name, agentCount, useLLM } = action.params;

    if (!template || typeof template !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid template parameter',
      };
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid x, y parameters',
      };
    }

    const config: CitySpawnConfig = {
      template: template as any,
      x,
      y,
      name: typeof name === 'string' ? name : undefined,
      agentCount: typeof agentCount === 'number' ? agentCount : undefined,
      useLLM: typeof useLLM === 'boolean' ? useLLM : true,
    };

    try {
      const cityInfo = await spawnCity(this.world, config);

      return {
        requestId: action.requestId,
        success: true,
        data: cityInfo,
      };
    } catch (error) {
      return {
        requestId: action.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to spawn city',
      };
    }
  }

  /**
   * List available city templates
   */
  private handleListCityTemplates(action: ActionRequest): ActionResponse {
    const templates = getCityTemplates();

    return {
      requestId: action.requestId,
      success: true,
      data: { templates },
    };
  }

  /**
   * Spawn an agent at the specified location
   */
  private handleSpawnAgent(action: ActionRequest): ActionResponse {
    const { name, x, y, useLLM, speed, believedDeity } = action.params;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid x, y parameters',
      };
    }

    const agentSpeed = typeof speed === 'number' ? speed : 2.0;
    const shouldUseLLM = typeof useLLM === 'boolean' ? useLLM : false;
    const options = believedDeity && typeof believedDeity === 'string' ? { believedDeity } : undefined;

    try {
      const agentId = shouldUseLLM
        ? createLLMAgent(this.world as any, x, y, agentSpeed, undefined, options)
        : createWanderingAgent(this.world as any, x, y, agentSpeed, options);

      // Optionally set the agent's name if provided
      if (name && typeof name === 'string') {
        const entity = this.world.getEntity(agentId);
        if (entity) {
          const identity = entity.components.get('identity') as { name?: string } | undefined;
          if (identity) {
            identity.name = name;
          }
        }
      }

      return {
        requestId: action.requestId,
        success: true,
        data: { agentId, x, y, useLLM: shouldUseLLM },
      };
    } catch (error) {
      return {
        requestId: action.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to spawn agent',
      };
    }
  }

  /**
   * Teleport an agent to a new location
   */
  private handleTeleport(action: ActionRequest): ActionResponse {
    const { agentId, x, y } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid x, y parameters',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
    if (!position) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} does not have a position component`,
      };
    }

    // Update position
    position.x = x;
    position.y = y;

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, x, y },
    };
  }

  /**
   * Set an agent's need value
   */
  private handleSetNeed(action: ActionRequest): ActionResponse {
    const { agentId, need, value } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (!need || typeof need !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid need parameter',
      };
    }

    if (typeof value !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid value parameter',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const needs = entity.components.get('needs') as Record<string, any> | undefined;
    if (!needs) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} does not have needs component`,
      };
    }

    // Validate need type
    const validNeeds = ['hunger', 'energy', 'health', 'thirst'];
    if (!validNeeds.includes(need)) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Invalid need type. Must be one of: ${validNeeds.join(', ')}`,
      };
    }

    // Clamp value to 0-1 range (needs are 0-1 scale)
    const clampedValue = Math.max(0, Math.min(1, value));

    // Set the need value
    needs[need] = clampedValue;

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, need, value: clampedValue },
    };
  }

  /**
   * Give an item to an agent's inventory
   */
  private handleGiveItem(action: ActionRequest): ActionResponse {
    const { agentId, itemType, amount } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (!itemType || typeof itemType !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid itemType parameter',
      };
    }

    const itemAmount = typeof amount === 'number' ? amount : 1;

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const inventory = entity.components.get('inventory') as {
      slots: Array<{ itemId: string; quantity: number } | null>;
      maxSlots: number;
    } | undefined;

    if (!inventory) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} does not have inventory component`,
      };
    }

    // Find existing stack or empty slot
    let slotIndex = -1;
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId === itemType) {
        // Found existing stack
        slotIndex = i;
        break;
      } else if (!slot && slotIndex === -1) {
        // Found empty slot
        slotIndex = i;
      }
    }

    if (slotIndex === -1) {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Inventory is full',
      };
    }

    // Add to inventory
    if (inventory.slots[slotIndex]) {
      inventory.slots[slotIndex]!.quantity += itemAmount;
    } else {
      inventory.slots[slotIndex] = { itemId: itemType, quantity: itemAmount };
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, itemType, amount: itemAmount },
    };
  }

  /**
   * Trigger a specific behavior on an agent
   */
  private handleTriggerBehavior(action: ActionRequest): ActionResponse {
    const { agentId, behavior } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (!behavior || typeof behavior !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid behavior parameter',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const agent = entity.components.get('agent') as { currentBehavior?: string } | undefined;
    if (!agent) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} is not an agent`,
      };
    }

    // Set the behavior
    agent.currentBehavior = behavior;

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, behavior },
    };
  }

  /**
   * Set game speed multiplier
   */
  private handleSetSpeed(action: ActionRequest): ActionResponse {
    const { speed } = action.params;

    if (typeof speed !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid speed parameter',
      };
    }

    if (speed < 0.1 || speed > 10) {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Speed must be between 0.1 and 10.0',
      };
    }

    // Access speed multiplier on world (if exists)
    const worldAny = this.world as any;
    if (worldAny.speedMultiplier !== undefined) {
      worldAny.speedMultiplier = speed;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { speed },
    };
  }

  /**
   * Pause or resume the game
   */
  private handlePause(action: ActionRequest): ActionResponse {
    const { paused } = action.params;

    if (typeof paused !== 'boolean') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid paused parameter (must be boolean)',
      };
    }

    // Access paused state on world (if exists)
    const worldAny = this.world as any;
    if (worldAny.paused !== undefined) {
      worldAny.paused = paused;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { paused },
    };
  }

  /**
   * Grant a spell to an agent
   */
  private handleGrantSpell(action: ActionRequest): ActionResponse {
    const { agentId, spellId } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    if (!spellId || typeof spellId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid spellId parameter',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const magic = entity.components.get('magic') as {
      knownSpells?: Array<{ spellId: string }>;
    } | undefined;

    if (!magic) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} does not have magic component`,
      };
    }

    if (!magic.knownSpells) {
      magic.knownSpells = [];
    }

    // Check if already known
    if (magic.knownSpells.some((s) => s.spellId === spellId)) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Agent already knows spell: ${spellId}`,
      };
    }

    // Add spell
    magic.knownSpells.push({ spellId });

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, spellId },
    };
  }

  /**
   * Add belief points to a deity
   */
  private handleAddBelief(action: ActionRequest): ActionResponse {
    const { deityId, amount } = action.params;

    if (!deityId || typeof deityId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid deityId parameter',
      };
    }

    if (typeof amount !== 'number') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid amount parameter',
      };
    }

    const entity = this.world.getEntity(deityId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${deityId}`,
      };
    }

    const deity = entity.components.get('deity') as {
      belief?: { currentBelief?: number; totalBeliefEarned?: number };
    } | undefined;

    if (!deity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${deityId} is not a deity`,
      };
    }

    if (!deity.belief) {
      deity.belief = { currentBelief: 0, totalBeliefEarned: 0 };
    }

    // Add belief
    const currentBefore = deity.belief.currentBelief || 0;
    deity.belief.currentBelief = currentBefore + amount;
    deity.belief.totalBeliefEarned = (deity.belief.totalBeliefEarned || 0) + amount;

    return {
      requestId: action.requestId,
      success: true,
      data: {
        deityId,
        amount,
        newTotal: deity.belief.currentBelief,
      },
    };
  }

  /**
   * Create a new deity entity
   */
  private handleCreateDeity(action: ActionRequest): ActionResponse {
    const { name, controller } = action.params;

    if (!name || typeof name !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid name parameter',
      };
    }

    const deityController = (controller === 'player' || controller === 'ai' || controller === 'dormant')
      ? controller
      : 'dormant';

    try {
      // Create deity entity
      const deityEntity = this.world.createEntity();
      const deityComponent = new DeityComponent(name, deityController);
      // Use WorldMutator's addComponent since Entity interface is read-only
      (this.world as any).addComponent(deityEntity.id, deityComponent);

      return {
        requestId: action.requestId,
        success: true,
        data: {
          deityId: deityEntity.id,
          name,
          controller: deityController,
        },
      };
    } catch (error) {
      return {
        requestId: action.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deity',
      };
    }
  }

  /**
   * Get list of all agents
   */
  private handleEntitiesQuery(query: QueryRequest): QueryResponse {
    const entities: EntitySummary[] = [];

    for (const entity of this.world.entities.values()) {
      const summary = this.getEntitySummary(entity);
      if (summary.type === 'agent') {
        entities.push(summary);
      }
    }

    return {
      requestId: query.requestId,
      success: true,
      data: { entities },
    };
  }

  /**
   * Get list of all plants with their visual metadata for 3D rendering
   */
  private handlePlantsQuery(query: QueryRequest): QueryResponse {
    const plants: Array<{
      id: string;
      plantType: string;
      stage: string;
      position: { x: number; y: number };
      spriteId: string;
      sizeMultiplier: number;
      alpha: number;
    }> = [];

    for (const entity of this.world.entities.values()) {
      if (!entity.components.has('plant')) continue;

      const plant = entity.components.get('plant') as {
        plantType?: string;
        stage?: string;
      } | undefined;

      const position = entity.components.get('position') as {
        x?: number;
        y?: number;
      } | undefined;

      const renderable = entity.components.get('renderable') as {
        spriteId?: string;
        sizeMultiplier?: number;
        alpha?: number;
      } | undefined;

      // Skip plants without position or renderable
      if (!position || !renderable) continue;

      plants.push({
        id: entity.id,
        plantType: plant?.plantType || 'unknown',
        stage: plant?.stage || 'mature',
        position: {
          x: position.x ?? 0,
          y: position.y ?? 0,
        },
        spriteId: renderable.spriteId || 'plant_default',
        sizeMultiplier: renderable.sizeMultiplier ?? 1.0,
        alpha: renderable.alpha ?? 1.0,
      });
    }

    return {
      requestId: query.requestId,
      success: true,
      data: { plants, count: plants.length },
    };
  }

  /**
   * Get detailed entity state
   */
  private handleEntityQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    const entity = this.world.getEntity(query.entityId);
    if (!entity) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity not found: ${query.entityId}`,
      };
    }

    const details = this.getEntityDetails(entity);
    return {
      requestId: query.requestId,
      success: true,
      data: details,
    };
  }

  /**
   * Get live LLM prompt for an entity
   */
  private handleEntityPromptQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    if (!this.promptBuilder) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'PromptBuilder not configured',
      };
    }

    const entity = this.world.getEntity(query.entityId);
    if (!entity) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity not found: ${query.entityId}`,
      };
    }

    // Check if this is an agent
    if (!entity.components.has('agent')) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity ${query.entityId} is not an agent`,
      };
    }

    try {
      const prompt = this.promptBuilder.buildPrompt(entity, this.world);
      return {
        requestId: query.requestId,
        success: true,
        data: { prompt },
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to build prompt',
      };
    }
  }

  /**
   * Get a summary of an entity
   */
  private getEntitySummary(entity: Entity): EntitySummary {
    const id = entity.id;

    // Get name from identity component
    const identity = entity.components.get('identity') as { name?: string } | undefined;
    const name = identity?.name || id;

    // Determine type
    let type: EntitySummary['type'] = 'other';
    if (entity.components.has('agent')) {
      type = 'agent';
    } else if (entity.components.has('animal')) {
      type = 'animal';
    } else if (entity.components.has('building')) {
      type = 'building';
    } else if (entity.components.has('plant')) {
      type = 'plant';
    } else if (entity.components.has('resource')) {
      type = 'resource';
    }

    // Get position
    const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
    const pos = position ? { x: position.x ?? 0, y: position.y ?? 0 } : undefined;

    // Get current behavior
    const agent = entity.components.get('agent') as { currentBehavior?: string } | undefined;
    const behavior = agent?.currentBehavior;

    return { id, name, type, position: pos, behavior };
  }

  /**
   * Get detailed entity data
   */
  private getEntityDetails(entity: Entity): EntityDetails {
    const id = entity.id;
    const identity = entity.components.get('identity') as { name?: string } | undefined;
    const name = identity?.name;

    // Serialize all components
    const components: Record<string, unknown> = {};
    for (const [key, value] of entity.components.entries()) {
      components[key] = this.serializeComponent(value);
    }

    return { id, name, components };
  }

  /**
   * Serialize a component for JSON transport
   */
  private serializeComponent(component: unknown): unknown {
    if (component === null || component === undefined) {
      return component;
    }

    if (typeof component !== 'object') {
      return component;
    }

    // Handle arrays
    if (Array.isArray(component)) {
      return component.map(item => this.serializeComponent(item));
    }

    // Handle Maps
    if (component instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of component.entries()) {
        obj[String(k)] = this.serializeComponent(v);
      }
      return obj;
    }

    // Handle Sets
    if (component instanceof Set) {
      return Array.from(component).map(item => this.serializeComponent(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component as Record<string, unknown>)) {
      // Skip functions
      if (typeof value === 'function') continue;
      result[key] = this.serializeComponent(value);
    }
    return result;
  }

  /**
   * Get universe information (dimensions, physical laws, etc.)
   */
  private handleUniverseQuery(query: QueryRequest): QueryResponse {
    try {
      // Check if universe config is available (Phase 27+)
      const worldAny = this.world as unknown as {
        universeId?: { id: string; name: string; createdAt: number };
        divineConfig?: {
          name?: string;
          description?: string;
          coreParams?: {
            divinePresence?: number;
            divineReliability?: number;
            mortalSignificance?: number;
            maxActiveDeities?: number;
          };
        };
      };

      const universeId = worldAny.universeId;
      const divineConfig = worldAny.divineConfig;

      // Count active magic paradigms
      const magicSystemAny = worldAny as unknown as { getMagicSystemState?: () => {
        getAllParadigms?: () => unknown[];
      }};
      const magicManager = magicSystemAny.getMagicSystemState?.();
      const paradigmCount = magicManager?.getAllParadigms?.()?.length || 0;

      // Count deities
      let deityCount = 0;
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('deity')) {
          deityCount++;
        }
      }

      const universeInfo = {
        // Basic universe properties
        spatialDimensions: 2, // Current 2D implementation
        hasTime: true,
        temporalFlow: 'linear',

        // Identity (if configured)
        id: universeId?.id || 'default',
        name: universeId?.name || 'Unnamed Universe',
        createdAt: universeId?.createdAt,

        // Magic & Divinity presence
        magicSystemsAvailable: paradigmCount,
        hasMagic: paradigmCount > 0,
        hasDivinity: deityCount > 0,
        activeDeities: deityCount,

        // Divine configuration (if Phase I/II implemented)
        divineProfile: divineConfig ? {
          name: divineConfig.name || 'Default',
          description: divineConfig.description || 'Standard divine mechanics',
          divinePresence: divineConfig.coreParams?.divinePresence,
          divineReliability: divineConfig.coreParams?.divineReliability,
          mortalSignificance: divineConfig.coreParams?.mortalSignificance,
          maxActiveDeities: divineConfig.coreParams?.maxActiveDeities,
        } : undefined,

        // Physical laws
        physics: {
          dimensions: 2,
          euclidean: true,
          causality: 'deterministic',
        },
      };

      return {
        requestId: query.requestId,
        success: true,
        data: universeInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query universe info',
      };
    }
  }

  /**
   * Get magic system information (enabled paradigms, active systems, etc.)
   */
  private handleMagicQuery(query: QueryRequest): QueryResponse {
    try {
      // Count magic users and collect statistics
      const magicUsers: Array<{
        id: string;
        name: string;
        paradigms: string[];
        activeParadigm?: string;
        primarySource?: string;
        spellsKnown: number;
        totalSpellsCast: number;
        manaInfo: Array<{
          source: string;
          current: number;
          max: number;
          locked: number;
          regenRate: number;
          available: number;
        }>;
        resourcePools: Array<{
          type: string;
          current: number;
          max: number;
          locked: number;
        }>;
        casting: boolean;
        activeEffects: string[];
        sustainedEffectCount: number;
        topTechniques: Array<{ technique: string; proficiency: number }>;
        topForms: Array<{ form: string; proficiency: number }>;
        paradigmState: Record<string, unknown>;
        corruption?: number;
        attentionLevel?: number;
        favorLevel?: number;
        addictionLevel?: number;
      }> = [];

      const paradigmUsage = new Map<string, number>();
      let totalMagicUsers = 0;
      let totalSpellsCast = 0;
      let totalSpellsKnown = 0;
      let totalMishaps = 0;
      let currentlyCasting = 0;
      let totalSustainedEffects = 0;
      let totalCorruption = 0;
      let corruptedCount = 0;
      let totalAttention = 0;
      let attentionCount = 0;
      let totalAddiction = 0;
      let addictedCount = 0;

      // Scan all entities for magic components
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('magic')) {
          const magic = entity.components.get('magic') as unknown as {
            magicUser?: boolean;
            homeParadigmId?: string;
            knownParadigmIds?: string[];
            activeParadigmId?: string;
            knownSpells?: unknown[];
            totalSpellsCast?: number;
            totalMishaps?: number;
            manaPools?: Array<{ source: string; current: number; maximum: number; locked: number; regenRate: number }>;
            resourcePools?: Record<string, { type: string; current: number; maximum: number; locked: number }>;
            casting?: boolean;
            activeEffects?: string[];
            techniqueProficiency?: Record<string, number>;
            formProficiency?: Record<string, number>;
            paradigmState?: Record<string, unknown>;
            corruption?: number;
            attentionLevel?: number;
            favorLevel?: number;
            addictionLevel?: number;
            primarySource?: string;
          };

          if (!magic.magicUser) continue;

          totalMagicUsers++;
          totalSpellsCast += magic.totalSpellsCast || 0;
          totalMishaps += magic.totalMishaps || 0;
          const spellsKnown = magic.knownSpells?.length || 0;
          totalSpellsKnown += spellsKnown;

          if (magic.casting) {
            currentlyCasting++;
          }

          // Track sustained effects
          const sustainedCount = magic.activeEffects?.length || 0;
          totalSustainedEffects += sustainedCount;

          // Track corruption
          if (magic.corruption !== undefined && magic.corruption > 0) {
            totalCorruption += magic.corruption;
            corruptedCount++;
          }

          // Track attention
          if (magic.attentionLevel !== undefined && magic.attentionLevel > 0) {
            totalAttention += magic.attentionLevel;
            attentionCount++;
          }

          // Track addiction
          if (magic.addictionLevel !== undefined && magic.addictionLevel > 0) {
            totalAddiction += magic.addictionLevel;
            addictedCount++;
          }

          // Track paradigm usage
          const paradigms = magic.knownParadigmIds || [];
          for (const paradigmId of paradigms) {
            paradigmUsage.set(paradigmId, (paradigmUsage.get(paradigmId) || 0) + 1);
          }

          // Get entity name
          const identity = entity.components.get('identity') as { name?: string } | undefined;
          const name = identity?.name || entity.id;

          // Collect mana pool info
          const manaInfo = (magic.manaPools || []).map(pool => ({
            source: pool.source,
            current: pool.current,
            max: pool.maximum,
            locked: pool.locked,
            regenRate: pool.regenRate,
            available: Math.max(0, pool.current - pool.locked),
          }));

          // Collect resource pools (non-mana)
          const resourcePools: Array<{
            type: string;
            current: number;
            max: number;
            locked: number;
          }> = [];

          if (magic.resourcePools) {
            for (const [type, pool] of Object.entries(magic.resourcePools)) {
              resourcePools.push({
                type,
                current: pool.current,
                max: pool.maximum,
                locked: pool.locked,
              });
            }
          }

          // Extract paradigm-specific state
          const paradigmSpecificState: Record<string, unknown> = {};
          if (magic.paradigmState) {
            for (const [paradigmId, state] of Object.entries(magic.paradigmState)) {
              paradigmSpecificState[paradigmId] = state;
            }
          }

          // Build proficiency summaries
          const techniques = magic.techniqueProficiency || {};
          const forms = magic.formProficiency || {};

          // Top techniques (>0 proficiency)
          const topTechniques = Object.entries(techniques)
            .filter(([_, prof]) => prof > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tech, prof]) => ({ technique: tech, proficiency: prof }));

          // Top forms (>0 proficiency)
          const topForms = Object.entries(forms)
            .filter(([_, prof]) => prof > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([form, prof]) => ({ form, proficiency: prof }));

          magicUsers.push({
            id: entity.id,
            name,
            paradigms,
            activeParadigm: magic.activeParadigmId,
            primarySource: magic.primarySource,
            spellsKnown,
            totalSpellsCast: magic.totalSpellsCast || 0,
            manaInfo,
            resourcePools,
            casting: magic.casting || false,
            activeEffects: magic.activeEffects || [],
            sustainedEffectCount: magic.activeEffects?.length || 0,
            topTechniques,
            topForms,
            paradigmState: paradigmSpecificState,
            // Consequence tracking
            corruption: magic.corruption,
            attentionLevel: magic.attentionLevel,
            favorLevel: magic.favorLevel,
            addictionLevel: magic.addictionLevel,
          });
        }
      }

      // Build paradigm summary
      const paradigms: Array<{
        id: string;
        userCount: number;
      }> = [];

      for (const [paradigmId, count] of paradigmUsage.entries()) {
        paradigms.push({
          id: paradigmId,
          userCount: count,
        });
      }

      // Sort by user count descending
      paradigms.sort((a, b) => b.userCount - a.userCount);

      const magicInfo = {
        // Overall statistics
        totalMagicUsers,
        totalSpellsCast,
        totalSpellsKnown,
        totalMishaps,
        currentlyCasting,
        mishapRate: totalSpellsCast > 0 ? totalMishaps / totalSpellsCast : 0,

        // Sustained effects
        totalSustainedEffects,
        averageSustainedEffects: totalMagicUsers > 0 ? totalSustainedEffects / totalMagicUsers : 0,

        // Consequence tracking
        corruptionStats: {
          corruptedUsers: corruptedCount,
          averageCorruption: corruptedCount > 0 ? totalCorruption / corruptedCount : 0,
          totalCorruption,
        },
        attentionStats: {
          usersWithAttention: attentionCount,
          averageAttention: attentionCount > 0 ? totalAttention / attentionCount : 0,
          totalAttention,
        },
        addictionStats: {
          addictedUsers: addictedCount,
          averageAddiction: addictedCount > 0 ? totalAddiction / addictedCount : 0,
          totalAddiction,
        },

        // Paradigm usage (only show paradigms with users)
        paradigms,
        paradigmCount: paradigms.length,

        // Individual magic users (for debugging)
        magicUsers: magicUsers.slice(0, 10), // Limit to top 10 for performance
      };

      return {
        requestId: query.requestId,
        success: true,
        data: magicInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query magic info',
      };
    }
  }

  /**
   * Get divinity information (gods, belief, pantheons, etc.)
   */
  private handleDivinityQuery(query: QueryRequest): QueryResponse {
    try {
      const deities: Array<{
        id: string;
        name: string;
        domain?: string;
        currentBelief: number;
        beliefPerTick: number;
        totalBeliefEarned: number;
        totalBeliefSpent: number;
        believerCount: number;
        sacredSites: number;
        controller: string;
        unansweredPrayers: number;
      }> = [];

      let totalBeliefGenerated = 0;
      let totalBelieverCount = 0;
      let totalPrayers = 0;
      let totalAnsweredPrayers = 0;

      // Find all deity entities
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('deity')) {
          const deityComp = entity.components.get('deity') as unknown as {
            identity?: { primaryName?: string; domain?: string };
            belief?: {
              currentBelief?: number;
              beliefPerTick?: number;
              totalBeliefEarned?: number;
              totalBeliefSpent?: number;
            };
            believers?: Set<string> | { size?: number };
            sacredSites?: Set<string> | { size?: number };
            controller?: string;
            prayerQueue?: unknown[];
          };

          const identity = deityComp.identity || {};
          const belief = deityComp.belief || {};
          const believersSet = deityComp.believers;
          const sacredSitesSet = deityComp.sacredSites;

          const believerCount = believersSet instanceof Set ? believersSet.size : (believersSet?.size || 0);
          const sacredSiteCount = sacredSitesSet instanceof Set ? sacredSitesSet.size : (sacredSitesSet?.size || 0);
          const prayerQueueLength = Array.isArray(deityComp.prayerQueue) ? deityComp.prayerQueue.length : 0;

          const currentBelief = belief.currentBelief || 0;
          const totalEarned = belief.totalBeliefEarned || 0;

          totalBeliefGenerated += totalEarned;
          totalBelieverCount += believerCount;

          deities.push({
            id: entity.id,
            name: identity.primaryName || 'The Nameless',
            domain: identity.domain,
            currentBelief,
            beliefPerTick: belief.beliefPerTick || 0,
            totalBeliefEarned: totalEarned,
            totalBeliefSpent: belief.totalBeliefSpent || 0,
            believerCount,
            sacredSites: sacredSiteCount,
            controller: deityComp.controller || 'dormant',
            unansweredPrayers: prayerQueueLength,
          });
        }
      }

      // Count believers with spiritual component
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('spiritual')) {
          const spiritual = entity.components.get('spiritual') as unknown as {
            totalPrayers?: number;
            answeredPrayers?: number;
            believedDeity?: string;
          };

          if (spiritual.believedDeity) {
            totalPrayers += spiritual.totalPrayers || 0;
            totalAnsweredPrayers += spiritual.answeredPrayers || 0;
          }
        }
      }

      const divinityInfo = {
        deities,
        totalDeities: deities.length,
        totalBeliefGenerated,
        totalBelieverCount,
        totalPrayers,
        totalAnsweredPrayers,
        prayerAnswerRate: totalPrayers > 0 ? (totalAnsweredPrayers / totalPrayers) : 0,
      };

      return {
        requestId: query.requestId,
        success: true,
        data: divinityInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query divinity info',
      };
    }
  }

  /**
   * Get research information (discovered papers, in-progress, completed)
   */
  private handleResearchQuery(query: QueryRequest): QueryResponse {
    try {
      // Get world entity with research state
      const worldEntity = this.world.query().with('time').executeEntities()[0];
      if (!worldEntity) {
        return {
          requestId: query.requestId,
          success: false,
          error: 'World entity not found',
        };
      }

      const researchState = worldEntity.components.get('research_state') as unknown as {
        completed?: Set<string>;
        inProgress?: Map<string, {
          researchId: string;
          totalRequired: number;
          currentProgress: number;
          assignedAgents: string[];
          startedAt: number;
          researchers?: string[];
          insights?: Array<{ agentId: string; contribution: number }>;
        }>;
      } | undefined;

      if (!researchState) {
        return {
          requestId: query.requestId,
          success: true,
          data: {
            totalDiscovered: 0,
            completed: [],
            inProgress: [],
          },
        };
      }

      // Get completed papers
      const completedPapers = Array.from(researchState.completed || []);

      // Get in-progress papers
      const inProgressPapers = Array.from(researchState.inProgress || []).map(([paperId, progress]) => ({
        paperId,
        progress: Math.round(progress.currentProgress * 100), // Convert to percentage
        totalRequired: progress.totalRequired,
        assignedAgents: progress.assignedAgents || [],
        researchers: progress.researchers || [],
        insights: progress.insights || [],
        startedAt: progress.startedAt,
      }));

      const researchInfo = {
        totalDiscovered: completedPapers.length + inProgressPapers.length,
        completed: completedPapers,
        completedCount: completedPapers.length,
        inProgress: inProgressPapers,
        inProgressCount: inProgressPapers.length,
      };

      return {
        requestId: query.requestId,
        success: true,
        data: researchInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query research info',
      };
    }
  }

  /**
   * Get pending creations awaiting divine approval
   */
  private handlePendingApprovalsQuery(query: QueryRequest): QueryResponse {
    try {
      const pending = pendingApprovalRegistry.getAll();

      const creations = pending.map(creation => ({
        id: creation.id,
        creationType: creation.creationType,
        // Recipe-specific
        itemName: creation.item?.displayName,
        itemCategory: creation.item?.category,
        recipeType: creation.recipeType,
        // Technology-specific
        technologyName: creation.technology?.name,
        researchField: creation.researchField,
        // Effect-specific
        spellName: creation.spell?.name,
        paradigmId: creation.paradigmId,
        discoveryType: creation.discoveryType,
        // Common
        creatorId: creation.creatorId,
        creatorName: creation.creatorName,
        creationMessage: creation.creationMessage,
        creativityScore: creation.creativityScore,
        ingredients: creation.ingredients.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
        createdAt: creation.createdAt,
        giftRecipient: creation.giftRecipient,
      }));

      return {
        requestId: query.requestId,
        success: true,
        data: {
          count: creations.length,
          creations,
        },
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query pending approvals',
      };
    }
  }

  /**
   * Approve a pending creation
   */
  private handleApproveCreation(action: ActionRequest): ActionResponse {
    const { creationId } = action.params;

    if (!creationId || typeof creationId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid creationId parameter',
      };
    }

    const result = pendingApprovalRegistry.approve(creationId);

    if (!result.success) {
      return {
        requestId: action.requestId,
        success: false,
        error: result.error || 'Failed to approve creation',
      };
    }

    // Build response data based on creation type
    const creation = result.creation;
    const responseData: Record<string, unknown> = {
      approved: true,
      creationType: creation?.creationType,
    };

    if (creation?.creationType === 'recipe') {
      responseData.itemName = creation.item?.displayName;
      responseData.recipeId = creation.recipe?.id;
    } else if (creation?.creationType === 'technology') {
      responseData.technologyName = creation.technology?.name;
      responseData.researchField = creation.researchField;
    } else if (creation?.creationType === 'effect') {
      responseData.spellName = creation.spell?.name;
      responseData.paradigmId = creation.paradigmId;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: responseData,
    };
  }

  /**
   * Reject a pending creation
   */
  private handleRejectCreation(action: ActionRequest): ActionResponse {
    const { creationId } = action.params;

    if (!creationId || typeof creationId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid creationId parameter',
      };
    }

    const result = pendingApprovalRegistry.reject(creationId);

    if (!result.success) {
      return {
        requestId: action.requestId,
        success: false,
        error: result.error || 'Failed to reject creation',
      };
    }

    // Build response data based on creation type
    const creation = result.creation;
    const responseData: Record<string, unknown> = {
      rejected: true,
      creationType: creation?.creationType,
    };

    if (creation?.creationType === 'recipe') {
      responseData.itemName = creation.item?.displayName;
    } else if (creation?.creationType === 'technology') {
      responseData.technologyName = creation.technology?.name;
    } else if (creation?.creationType === 'effect') {
      responseData.spellName = creation.spell?.name;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: responseData,
    };
  }

  /**
   * Get terrain data for 3D visualization
   * Returns tile data for a rectangular area around given coordinates
   */
  private handleTerrainQuery(query: QueryRequest): QueryResponse {
    try {
      // Parse query params - default to getting terrain around entity positions
      const params = query.entityId ? JSON.parse(query.entityId) : {};
      const centerX = typeof params.x === 'number' ? params.x : 0;
      const centerY = typeof params.y === 'number' ? params.y : 0;
      const radius = typeof params.radius === 'number' ? Math.min(params.radius, 100) : 50;

      // Access chunk manager via world
      const worldAny = this.world as unknown as {
        getTileAt?: (x: number, y: number) => unknown;
        getChunkManager?: () => unknown;
      };

      if (!worldAny.getTileAt) {
        return {
          requestId: query.requestId,
          success: false,
          error: 'World does not support tile access',
        };
      }

      // Collect terrain data for the area
      const tiles: Array<{
        x: number;
        y: number;
        terrain: string;
        elevation: number;
        biome?: string;
        wall?: { material: string };
      }> = [];

      const minX = Math.floor(centerX - radius);
      const maxX = Math.ceil(centerX + radius);
      const minY = Math.floor(centerY - radius);
      const maxY = Math.ceil(centerY + radius);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const tile = worldAny.getTileAt(x, y) as {
            terrain?: string;
            elevation?: number;
            biome?: string;
            wall?: { material?: string };
          } | undefined;

          if (tile) {
            tiles.push({
              x,
              y,
              terrain: tile.terrain || 'grass',
              elevation: tile.elevation || 0,
              biome: tile.biome,
              wall: tile.wall ? { material: tile.wall.material || 'stone' } : undefined,
            });
          }
        }
      }

      return {
        requestId: query.requestId,
        success: true,
        data: {
          centerX,
          centerY,
          radius,
          tileCount: tiles.length,
          tiles,
        },
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query terrain',
      };
    }
  }
}
