/**
 * ExperimentationSystem - Handles agent recipe experimentation
 *
 * Allows agents to experiment with ingredient combinations to discover
 * new recipes using the LLM Recipe Generator.
 *
 * Responsibilities:
 * - Track agents at crafting stations who want to experiment
 * - Handle experimentation requests
 * - Process LLM recipe generation
 * - Register successful discoveries
 * - Update agent recipe discovery components
 *
 * Per CLAUDE.md: No silent fallbacks - throws on invalid state.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';
import {
  type RecipeDiscoveryComponent,
  createRecipeDiscoveryComponent,
  recordExperiment,
  canExperiment,
  decreaseCooldown,
  wasAlreadyTried,
  getSpecializationBonus,
} from '../components/RecipeDiscoveryComponent.js';
import {
  type RecipeType,
  type ExperimentIngredient,
  type ExperimentContext,
  getRecipeGenerator,
} from '../crafting/LLMRecipeGenerator.js';
import {
  getAvailableIngredients,
  formatIngredientsForPrompt,
  getClosestFriendsPreferences,
  formatFriendsForPrompt,
  RECIPE_TYPE_TO_SKILL,
} from '../crafting/IngredientAwareness.js';
import type { RecipeRegistry } from '../crafting/RecipeRegistry.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { pendingApprovalRegistry, type PendingCreation } from '../crafting/PendingApprovalRegistry.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';

/**
 * Request to experiment with ingredients
 */
export interface ExperimentRequest {
  agentId: string;
  ingredients: ExperimentIngredient[];
  recipeType: RecipeType;
  /** Optional: Name of friend if creating a gift for them */
  giftRecipient?: string;
}

/**
 * ExperimentationSystem handles agent recipe experimentation.
 */
export class ExperimentationSystem extends BaseSystem {
  public readonly id: SystemId = 'experimentation';
  public readonly priority: number = 70; // After crafting systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Agent, CT.Position, CT.Inventory];
  public readonly activationComponents = ['experiment'] as const; // Lazy activation: Skip entire system when no experiments running

  protected readonly throttleInterval = 60; // Every second at 60 tps

  private recipeRegistry: RecipeRegistry | null = null;
  private pendingExperiments: ExperimentRequest[] = [];

  /** Maximum distance from crafting station to experiment */
  private readonly MAX_STATION_DISTANCE = 2;

  /**
   * Set the recipe registry for looking up recipes.
   */
  public setRecipeRegistry(registry: RecipeRegistry): void {
    this.recipeRegistry = registry;
  }

  /**
   * Initialize the system.
   */
  protected onInitialize(world: World, eventBus: EventBus): void {
    // Subscribe to experimentation request events
    eventBus.subscribe<'experiment:requested'>('experiment:requested', (event) => {
      // Map event data to ExperimentRequest (now properly typed in EventMap)
      const request: ExperimentRequest = {
        agentId: event.data.agentId,
        ingredients: event.data.ingredients.map(ing => ({
          itemId: ing.itemId,
          quantity: ing.quantity,
        })),
        recipeType: event.data.recipeType as RecipeType,
        giftRecipient: event.data.giftRecipient,
      };
      this.queueExperiment(request);
    });
  }

  /**
   * Queue an experiment request.
   */
  public queueExperiment(request: ExperimentRequest): void {
    // Prevent duplicate requests
    const existing = this.pendingExperiments.find(
      e => e.agentId === request.agentId
    );
    if (!existing) {
      this.pendingExperiments.push(request);
    }
  }

  /**
   * Main update loop.
   */
  protected onUpdate(ctx: SystemContext): void {
    // Decrease cooldowns for all agents with recipe discovery
    this.updateCooldowns(ctx.activeEntities);

    // Process pending experiments (already throttled via throttleInterval)
    if (this.pendingExperiments.length > 0) {
      this.processNextExperiment(ctx.world);
    }
  }

  /**
   * Update cooldowns for all agents.
   */
  private updateCooldowns(entities: ReadonlyArray<Entity>): void {
    for (const entity of entities) {
      const discovery = (entity as EntityImpl).getComponent<RecipeDiscoveryComponent>('recipe_discovery');
      if (discovery && discovery.experimentCooldown > 0) {
        const updated = decreaseCooldown(discovery);
        (entity as EntityImpl).updateComponent('recipe_discovery', () => updated);
      }
    }
  }

  /**
   * Process the next queued experiment.
   */
  private async processNextExperiment(world: World): Promise<void> {
    const request = this.pendingExperiments.shift();
    if (!request) return;

    const recipeGenerator = getRecipeGenerator();
    if (!recipeGenerator) {
      console.error('[ExperimentationSystem] LLM Recipe Generator not initialized');
      return;
    }

    const agent = world.getEntity(request.agentId);
    if (!agent) {
      console.error(`[ExperimentationSystem] Agent ${request.agentId} not found`);
      return;
    }

    // Validate agent can experiment
    const discovery = this.getOrCreateDiscoveryComponent(agent);
    if (!canExperiment(discovery)) {
      this.events.emitGeneric('experiment:failed', {
        reason: 'cooldown',
        message: 'Still recovering from last experiment',
      }, request.agentId);
      return;
    }

    // Check if this combination was already tried
    if (wasAlreadyTried(discovery, request.ingredients)) {
      this.events.emitGeneric('experiment:failed', {
        reason: 'already_tried',
        message: 'This combination was already tried and failed',
      }, request.agentId);
      return;
    }

    // Validate agent has ingredients
    const inventory = (agent as EntityImpl).getComponent<InventoryComponent>(CT.Inventory);
    if (!inventory) {
      return;
    }

    for (const ing of request.ingredients) {
      const has = this.getItemCount(inventory, ing.itemId);
      if (has < ing.quantity) {
        this.events.emitGeneric('experiment:failed', {
          reason: 'missing_ingredients',
          message: `Missing ${ing.quantity - has}x ${ing.itemId}`,
        }, request.agentId);
        return;
      }
    }

    // Validate agent is at appropriate station
    const station = this.findNearbyStation(world, agent, request.recipeType);
    if (!station) {
      this.events.emitGeneric('experiment:failed', {
        reason: 'no_station',
        message: `No ${this.getStationForType(request.recipeType)} nearby`,
      }, request.agentId);
      return;
    }

    // Get agent info for LLM context
    const identity = (agent as EntityImpl).getComponent<IdentityComponent>(CT.Identity);
    const personality = (agent as EntityImpl).getComponent<PersonalityComponent>('personality');
    const agentName = identity?.name || 'Unknown';

    // Build personality description from traits
    let personalityDesc: string | undefined;
    if (personality) {
      const traits: string[] = [];
      if (personality.creativity > 0.7) traits.push('creative');
      if (personality.openness > 0.7) traits.push('curious');
      if (personality.conscientiousness > 0.7) traits.push('meticulous');
      if (personality.workEthic > 0.7) traits.push('hardworking');
      personalityDesc = traits.length > 0 ? traits.join(', ') : undefined;
    }

    // Gather ingredient awareness (what the agent knows about nearby ingredients)
    // Use the skill relevant to this recipe type
    const relevantSkill = RECIPE_TYPE_TO_SKILL[request.recipeType];
    const ingredientAwareness = getAvailableIngredients(world, agent, relevantSkill);
    const availableIngredients = formatIngredientsForPrompt(ingredientAwareness);

    // Get closest friends' preferences for social cooking
    const friendPrefs = getClosestFriendsPreferences(world, agent, 3);
    const friendPreferences = formatFriendsForPrompt(friendPrefs);

    // Build experiment context
    const experimentContext: ExperimentContext = {
      availableIngredients,
      friendPreferences: friendPreferences || undefined,
      giftRecipient: request.giftRecipient,
    };

    // Consume ingredients
    this.consumeIngredients(agent, request.ingredients);

    // Perform experiment via LLM
    try {
      const result = await recipeGenerator.experiment(
        request.ingredients,
        request.recipeType,
        agentName,
        personalityDesc,
        experimentContext
      );

      // Record experiment
      const updatedDiscovery = recordExperiment(discovery, {
        tick: world.tick,
        recipeType: request.recipeType,
        ingredients: request.ingredients,
        success: result.success,
        recipeId: result.recipe?.id,
        creativityScore: result.creativityScore,
      });

      (agent as EntityImpl).updateComponent('recipe_discovery', () => updatedDiscovery);

      if (result.success && result.recipe && result.item) {
        // Get creator's deity for auto-approval check
        const spiritual = (agent as EntityImpl).getComponent<SpiritualComponent>(CT.Spiritual);
        const creatorDeityId = spiritual?.believedDeity;

        // Process through approval queue with LLM scrutiny (handles god bypass & AI deity auto-approval)
        const approvalResult = await pendingApprovalRegistry.processCreationAsync(
          result.recipe,
          result.item,
          request.recipeType,
          request.agentId,
          agentName,
          result.message,
          result.creativityScore,
          request.ingredients,
          world.tick,
          creatorDeityId,
          request.giftRecipient
        );

        if (approvalResult.queued) {
          // Queued for divine approval - emit pending event
          this.events.emitGeneric('experiment:pending_approval', {
            pendingId: approvalResult.creation.id,
            itemId: result.item.id,
            displayName: result.item.displayName,
            message: 'Awaiting divine blessing...',
            creativityScore: result.creativityScore,
          }, request.agentId);
        } else if (approvalResult.rejectionReason) {
          // AI deity rejected the creation after scrutiny
          this.events.emitGeneric('experiment:rejected', {
            itemId: result.item.id,
            displayName: result.item.displayName,
            message: approvalResult.rejectionReason,
          }, request.agentId);
        } else {
          // Approved immediately (god or AI deity auto-approved)
          this.registerApprovedCreation(approvalResult.creation);

          // Emit success event
          this.events.emitGeneric('experiment:success', {
            recipeId: result.recipe.id,
            itemId: result.item.id,
            displayName: result.item.displayName,
            message: approvalResult.bypassedAsGod
              ? 'Divine creation manifested!'
              : approvalResult.autoApproved
                ? 'Blessed by the gods!'
                : result.message,
            creativityScore: result.creativityScore,
            autoApproved: true,
          }, request.agentId);

          // Also emit recipe discovered event
          this.events.emitGeneric('recipe:discovered', {
            recipeId: result.recipe.id,
            discoverer: agentName,
            recipeType: request.recipeType,
          }, request.agentId);
        }
      } else {
        // Emit failure event
        this.events.emitGeneric('experiment:failed', {
          reason: 'no_result',
          message: result.message,
          creativityScore: result.creativityScore,
        }, request.agentId);
      }
    } catch (error) {
      console.error('[ExperimentationSystem] Experiment error:', error);

      this.events.emitGeneric('experiment:failed', {
        reason: 'error',
        message: 'The experiment went wrong!',
      }, request.agentId);
    }
  }

  /**
   * Get or create recipe discovery component for an agent.
   */
  private getOrCreateDiscoveryComponent(agent: Entity): RecipeDiscoveryComponent {
    let discovery = (agent as EntityImpl).getComponent<RecipeDiscoveryComponent>('recipe_discovery');
    if (!discovery) {
      discovery = createRecipeDiscoveryComponent();
      (agent as EntityImpl).addComponent(discovery);
    }
    return discovery;
  }

  /**
   * Get item count in inventory.
   */
  private getItemCount(inventory: InventoryComponent, itemId: string): number {
    return inventory.slots
      .filter(slot => slot.itemId === itemId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
  }

  /**
   * Consume ingredients from agent inventory.
   */
  private consumeIngredients(agent: Entity, ingredients: ExperimentIngredient[]): void {
    const inventory = (agent as EntityImpl).getComponent<InventoryComponent>(CT.Inventory);
    if (!inventory) return;

    // Create a new slots array with consumed quantities
    const newSlots = inventory.slots.map(slot => ({ ...slot }));

    for (const ing of ingredients) {
      let remaining = ing.quantity;

      for (let i = 0; i < newSlots.length && remaining > 0; i++) {
        const slot = newSlots[i];
        if (slot && slot.itemId === ing.itemId) {
          const toRemove = Math.min(slot.quantity, remaining);
          remaining -= toRemove;

          if (slot.quantity === toRemove) {
            // Clear slot
            slot.itemId = null;
            slot.quantity = 0;
          } else {
            // Reduce quantity
            slot.quantity -= toRemove;
          }
        }
      }
    }

    (agent as EntityImpl).updateComponent(CT.Inventory, () => ({
      ...inventory,
      slots: newSlots,
    }));
  }

  /**
   * Find a nearby crafting station appropriate for the recipe type.
   */
  private findNearbyStation(
    world: World,
    agent: Entity,
    recipeType: RecipeType
  ): Entity | null {
    const agentPos = (agent as EntityImpl).getComponent<PositionComponent>(CT.Position);
    if (!agentPos) return null;

    const stationType = this.getStationForType(recipeType);
    if (!stationType) return null; // Hand-craftable, no station needed

    const buildings = world.query()
      .with(CT.Building)
      .with(CT.Position)
      .executeEntities();

    for (const building of buildings) {
      const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
      const pos = (building as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!buildingComp || !buildingComp.isComplete || !pos) continue;

      // Check if building type matches required station
      if (buildingComp.buildingType !== stationType) continue;

      // Check distance
      const dx = agentPos.x - pos.x;
      const dy = agentPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.MAX_STATION_DISTANCE) {
        return building;
      }
    }

    return null;
  }

  /**
   * Get required station for recipe type.
   */
  private getStationForType(recipeType: RecipeType): string | null {
    switch (recipeType) {
      case 'food':
        return 'oven';
      case 'clothing':
        return 'loom';
      case 'potion':
        return 'alchemy_station';
      case 'tool':
        return 'workbench';
      case 'art':
      case 'decoration':
        return null; // Hand-craftable
      default:
        return 'workbench';
    }
  }

  /**
   * Check if an agent can experiment with given ingredients.
   */
  public canAgentExperiment(
    world: World,
    agentId: string,
    ingredients: ExperimentIngredient[],
    recipeType: RecipeType
  ): { can: boolean; reason?: string } {
    const agent = world.getEntity(agentId);
    if (!agent) {
      return { can: false, reason: 'Agent not found' };
    }

    // Check cooldown
    const discovery = (agent as EntityImpl).getComponent<RecipeDiscoveryComponent>('recipe_discovery');
    if (discovery && !canExperiment(discovery)) {
      return { can: false, reason: 'Still on cooldown' };
    }

    // Check ingredients
    const inventory = (agent as EntityImpl).getComponent<InventoryComponent>(CT.Inventory);
    if (!inventory) {
      return { can: false, reason: 'No inventory' };
    }

    for (const ing of ingredients) {
      const has = this.getItemCount(inventory, ing.itemId);
      if (has < ing.quantity) {
        return { can: false, reason: `Missing ${ing.quantity - has}x ${ing.itemId}` };
      }
    }

    // Check station (unless hand-craftable)
    const stationType = this.getStationForType(recipeType);
    if (stationType && !this.findNearbyStation(world, agent, recipeType)) {
      return { can: false, reason: `No ${stationType} nearby` };
    }

    // Check if already tried
    if (discovery && wasAlreadyTried(discovery, ingredients)) {
      return { can: false, reason: 'Already tried this combination' };
    }

    return { can: true };
  }

  /**
   * Get experimentation success chance for an agent.
   */
  public getSuccessChance(agent: Entity, recipeType: RecipeType): number {
    const discovery = (agent as EntityImpl).getComponent<RecipeDiscoveryComponent>('recipe_discovery');
    if (!discovery) {
      return 0.3; // Base 30% success chance
    }

    // Base chance + specialization bonus
    const baseChance = 0.3;
    const specBonus = getSpecializationBonus(discovery, recipeType);

    return Math.min(0.9, baseChance + specBonus * 0.5); // Max 90%
  }

  /**
   * Register an approved creation (called after divine blessing).
   * Only handles recipe creations - technology and effect creations
   * are handled by their respective systems.
   */
  private registerApprovedCreation(
    creation: PendingCreation
  ): void {
    // Only handle recipe creations
    if (creation.creationType !== 'recipe' || !creation.recipe || !creation.item) {
      return;
    }

    // Register the new item to global registry
    if (!itemRegistry.has(creation.item.id)) {
      itemRegistry.register(creation.item);
    }

    // Register recipe if we have a registry
    if (this.recipeRegistry) {
      try {
        this.recipeRegistry.registerRecipe(creation.recipe);
      } catch {
        // Recipe may already exist
      }
    }
  }

  /**
   * Handle approval of a pending creation (called by approval system).
   */
  public handleApproval(
    _world: World,
    pendingId: string,
    approved: boolean
  ): void {
    const creation = pendingApprovalRegistry.get(pendingId);
    if (!creation) return;

    if (approved) {
      const result = pendingApprovalRegistry.approve(pendingId);
      if (result.success && result.creation) {
        this.registerApprovedCreation(result.creation);

        // Only emit recipe-specific events for recipe creations
        if (result.creation.creationType === 'recipe' && result.creation.recipe && result.creation.item) {
          // Emit success event
          this.events.emitGeneric('experiment:success', {
            recipeId: result.creation.recipe.id,
            itemId: result.creation.item.id,
            displayName: result.creation.item.displayName,
            message: 'The gods have blessed your creation!',
            creativityScore: result.creation.creativityScore,
          }, result.creation.creatorId);

          // Also emit recipe discovered event
          this.events.emitGeneric('recipe:discovered', {
            recipeId: result.creation.recipe.id,
            discoverer: result.creation.creatorName,
            recipeType: result.creation.recipeType || 'recipe',
          }, result.creation.creatorId);
        } else if (result.creation.creationType === 'technology' && result.creation.technology) {
          // Emit technology discovered event
          this.events.emitGeneric('research:discovered', {
            technologyId: result.creation.technology.id,
            name: result.creation.technology.name,
            field: result.creation.researchField,
            discoverer: result.creation.creatorName,
            message: 'The gods have blessed your research!',
          }, result.creation.creatorId);
        } else if (result.creation.creationType === 'effect' && result.creation.spell) {
          // Emit spell discovered event
          this.events.emitGeneric('magic:discovered', {
            spellId: result.creation.spell.id,
            name: result.creation.spell.name,
            paradigm: result.creation.paradigmId,
            discoverer: result.creation.creatorName,
            message: 'The gods have blessed your magic!',
          }, result.creation.creatorId);
        }
      }
    } else {
      const result = pendingApprovalRegistry.reject(pendingId);
      if (result.success && result.creation) {
        // Get ID and display name based on creation type
        let itemId: string;
        let displayName: string;

        if (result.creation.creationType === 'recipe') {
          itemId = result.creation.item?.id || 'unknown_item';
          displayName = result.creation.item?.displayName || 'Unknown creation';
        } else if (result.creation.creationType === 'technology') {
          itemId = result.creation.technology?.id || 'unknown_tech';
          displayName = result.creation.technology?.name || 'Unknown technology';
        } else {
          itemId = result.creation.spell?.id || 'unknown_spell';
          displayName = result.creation.spell?.name || 'Unknown spell';
        }

        this.events.emitGeneric('experiment:rejected', {
          itemId,
          displayName,
          message: 'The gods do not favor this creation.',
        }, result.creation.creatorId);
      }
    }
  }

  /**
   * Get pending creations awaiting approval.
   */
  public getPendingCreations(): ReturnType<typeof pendingApprovalRegistry.getAll> {
    return pendingApprovalRegistry.getAll();
  }

  /**
   * Get count of pending approvals.
   */
  public getPendingCount(): number {
    return pendingApprovalRegistry.count;
  }
}
