import type { World } from '../ecs/World.js';
import { System } from '../ecs/System.js';
import type { CraftingJob } from './CraftingJob.js';
import { createCraftingJob } from './CraftingJob.js';
import type { Recipe } from './Recipe.js';
import type { RecipeRegistry } from './RecipeRegistry.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import {
  getItemCount,
  hasItem,
  removeFromInventory,
  addToInventoryWithQuality,
  addLegendaryItemToInventory,
} from '../components/InventoryComponent.js';
import { itemInstanceRegistry } from '../items/ItemInstanceRegistry.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { getQualityTier } from '../items/ItemInstance.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import {
  recordTaskCompletion,
  addSpecializationXP,
} from '../components/SkillsComponent.js';
import { calculateCraftingQuality } from '../items/ItemQuality.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { EntityId } from '../types.js';

/**
 * Ingredient availability status.
 */
export type IngredientStatus = 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'IN_STORAGE';

/**
 * Ingredient availability information.
 */
export interface IngredientAvailability {
  itemId: string;
  required: number;
  available: number;
  status: IngredientStatus;
}

/**
 * Agent crafting queue state.
 */
interface AgentCraftingQueue {
  agentId: EntityId;
  queue: CraftingJob[];
  paused: boolean;
}

/**
 * System for managing crafting queues and job execution.
 * Follows CLAUDE.md: No silent fallbacks, throws on errors.
 */
export class CraftingSystem implements System {
  public readonly id = 'crafting' as const;
  public readonly priority = 55; // After BuildingSystem (50), before MemorySystem (100)
  public readonly requiredComponents = [] as const; // Process queues manually, not entity-based

  private queues: Map<EntityId, AgentCraftingQueue> = new Map();
  private readonly MAX_QUEUE_SIZE = 10;
  private recipeRegistry: RecipeRegistry | null = null;
  private durabilitySystem: any | null = null; // DurabilitySystem reference (optional dependency)

  /**
   * Set the recipe registry for looking up recipes.
   */
  setRecipeRegistry(registry: RecipeRegistry): void {
    this.recipeRegistry = registry;
  }

  /**
   * Get the recipe registry.
   * @throws If registry is not set
   */
  getRecipeRegistry(): RecipeRegistry {
    if (!this.recipeRegistry) {
      throw new Error('Recipe registry not set. Call setRecipeRegistry() first.');
    }
    return this.recipeRegistry;
  }

  /**
   * Set the durability system for tool wear tracking.
   * Optional - if not set, tools won't lose durability.
   */
  setDurabilitySystem(durabilitySystem: any): void {
    this.durabilitySystem = durabilitySystem;
  }

  /**
   * Queue a new crafting job for an agent.
   * @throws If quantity is invalid
   * @throws If agent entity not found
   * @throws If queue is full
   */
  queueJob(agentId: EntityId, recipe: Recipe, quantity: number): CraftingJob {
    if (quantity <= 0) {
      throw new Error('Job quantity must be positive');
    }

    // Get or create queue for agent
    let queueState = this.queues.get(agentId);
    if (!queueState) {
      queueState = {
        agentId,
        queue: [],
        paused: false
      };
      this.queues.set(agentId, queueState);
    }

    // Check queue size limit
    if (queueState.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error('Queue is full (max 10 jobs)');
    }

    // Create job
    const job = createCraftingJob(agentId, recipe.id, quantity, recipe.craftingTime);
    queueState.queue.push(job);

    return job;
  }

  /**
   * Get the crafting queue for an agent.
   */
  getQueue(agentId: EntityId): CraftingJob[] {
    const queueState = this.queues.get(agentId);
    return queueState ? [...queueState.queue] : [];
  }

  /**
   * Get the currently active job for an agent.
   */
  getCurrentJob(agentId: EntityId): CraftingJob | null {
    const queue = this.getQueue(agentId);
    if (queue.length === 0) {
      return null;
    }
    const currentJob = queue[0];
    if (!currentJob) {
      return null;
    }
    return currentJob.status === 'in_progress' || currentJob.status === 'queued' ? currentJob : null;
  }

  /**
   * Reorder a job in the queue.
   * @throws If position is invalid
   */
  reorderQueue(agentId: EntityId, jobId: string, newPosition: number): void {
    const queueState = this.queues.get(agentId);
    if (!queueState) {
      throw new Error('Agent has no crafting queue');
    }

    const jobIndex = queueState.queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (newPosition < 0 || newPosition >= queueState.queue.length) {
      throw new Error(`Invalid position: ${newPosition}`);
    }

    const job = queueState.queue[jobIndex];
    if (!job) {
      throw new Error(`Job not found at index: ${jobIndex}`);
    }

    // Don't allow reordering the currently in-progress job
    if (job.status === 'in_progress') {
      throw new Error('Cannot reorder job that is in progress');
    }

    // Remove and insert at new position
    queueState.queue.splice(jobIndex, 1);
    queueState.queue.splice(newPosition, 0, job);
  }

  /**
   * Cancel a queued job.
   * @throws If job not found
   */
  cancelJob(agentId: EntityId, jobId: string): void {
    const queueState = this.queues.get(agentId);
    if (!queueState) {
      throw new Error('Agent has no crafting queue');
    }

    const jobIndex = queueState.queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Mark as cancelled and remove
    const job = queueState.queue[jobIndex];
    if (!job) {
      throw new Error(`Job not found at index: ${jobIndex}`);
    }
    job.status = 'cancelled';
    queueState.queue.splice(jobIndex, 1);
  }

  /**
   * Clear all jobs in the queue.
   */
  clearQueue(agentId: EntityId): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.queue = [];
    }
  }

  /**
   * Pause the crafting queue.
   */
  pauseQueue(agentId: EntityId): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.paused = true;
    }
  }

  /**
   * Resume the crafting queue.
   */
  resumeQueue(agentId: EntityId): void {
    const queueState = this.queues.get(agentId);
    if (queueState) {
      queueState.paused = false;
    }
  }

  /**
   * Check if queue is paused.
   */
  isQueuePaused(agentId: EntityId): boolean {
    const queueState = this.queues.get(agentId);
    return queueState ? queueState.paused : false;
  }

  /**
   * Check ingredient availability for a recipe.
   * @param world - The game world to look up the agent entity
   * @param agentId - The agent's entity ID
   * @param recipe - The recipe to check ingredients for
   */
  checkIngredientAvailability(world: World, agentId: EntityId, recipe: Recipe): IngredientAvailability[] {
    const entity = world.getEntity(agentId);
    if (!entity) {
      throw new Error(`Agent entity ${agentId} not found`);
    }

    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) {
      // No inventory means all ingredients are missing
      return recipe.ingredients.map(ing => ({
        itemId: ing.itemId,
        required: ing.quantity,
        available: 0,
        status: 'MISSING' as IngredientStatus
      }));
    }

    return recipe.ingredients.map(ing => {
      const available = getItemCount(inventory, ing.itemId);
      let status: IngredientStatus;

      if (available >= ing.quantity) {
        status = 'AVAILABLE';
      } else if (available > 0) {
        status = 'PARTIAL';
      } else {
        status = 'MISSING';
      }

      return {
        itemId: ing.itemId,
        required: ing.quantity,
        available,
        status
      };
    });
  }

  /**
   * Calculate maximum craftable quantity based on ingredients.
   * @param world - The game world to look up the agent entity
   * @param agentId - The agent's entity ID
   * @param recipe - The recipe to check
   */
  calculateMaxCraftable(world: World, agentId: EntityId, recipe: Recipe): number {
    const entity = world.getEntity(agentId);
    if (!entity) {
      throw new Error(`Agent entity ${agentId} not found`);
    }

    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) {
      return 0;
    }

    // Calculate how many times we can craft based on available ingredients
    let maxCraftable = Infinity;

    for (const ing of recipe.ingredients) {
      const available = getItemCount(inventory, ing.itemId);
      const craftableFromThis = Math.floor(available / ing.quantity);
      maxCraftable = Math.min(maxCraftable, craftableFromThis);
    }

    return maxCraftable === Infinity ? 0 : maxCraftable;
  }

  /**
   * System update - process all active crafting jobs.
   */
  update(world: World, _entities: ReadonlyArray<import('../ecs/Entity.js').Entity>, deltaTime: number): void {
    // Process each agent's queue
    for (const queueState of this.queues.values()) {
      if (queueState.paused || queueState.queue.length === 0) {
        continue;
      }

      const job = queueState.queue[0];

      // Add null check per CLAUDE.md
      if (!job) {
        throw new Error('Queue has length > 0 but first item is undefined');
      }

      // Start job if queued
      if (job.status === 'queued') {
        this.startJob(world, job);
      }

      // Update progress if in progress
      if (job.status === 'in_progress') {
        this.updateJob(world, job, deltaTime);
      }
    }
  }

  /**
   * Start a crafting job.
   * Consumes ingredients from the agent's inventory.
   * @throws If agent not found, no inventory, or insufficient ingredients
   */
  private startJob(world: World, job: CraftingJob): void {
    // Get the recipe to know what ingredients to consume
    if (!this.recipeRegistry) {
      throw new Error('Recipe registry not set. Cannot start crafting job.');
    }

    const recipe = this.recipeRegistry.getRecipe(job.recipeId);
    const entity = world.getEntity(job.agentId);
    if (!entity) {
      throw new Error(`Agent entity ${job.agentId} not found`);
    }

    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) {
      throw new Error(`Agent ${job.agentId} has no inventory. Cannot craft.`);
    }

    // Check if we have all ingredients (fail early per CLAUDE.md)
    for (const ing of recipe.ingredients) {
      const required = ing.quantity * job.quantity;
      if (!hasItem(inventory, ing.itemId, required)) {
        const available = getItemCount(inventory, ing.itemId);
        throw new Error(
          `Insufficient ${ing.itemId}: need ${required}, have ${available}`
        );
      }
    }

    // Consume all ingredients
    let currentInventory = inventory;
    for (const ing of recipe.ingredients) {
      const required = ing.quantity * job.quantity;
      const result = removeFromInventory(currentInventory, ing.itemId, required);
      currentInventory = result.inventory;
    }

    // Update the entity's inventory
    (entity as EntityImpl).updateComponent<InventoryComponent>('inventory', () => currentInventory);

    job.status = 'in_progress';
    job.startedAt = Date.now();

    // Emit event
    world.eventBus.emit({
      type: 'crafting:job_started',
      source: 'crafting-system',
      data: {
        jobId: String(job.id),
        agentId: String(job.agentId),
        recipeId: job.recipeId
      }
    });
  }

  /**
   * Update job progress.
   */
  private updateJob(world: World, job: CraftingJob, deltaTime: number): void {
    job.elapsedTime += deltaTime;
    job.progress = Math.min(1.0, job.elapsedTime / job.totalTime);

    // Check if completed
    if (job.progress >= 1.0) {
      this.completeJob(world, job);
    }
  }

  /**
   * Complete a crafting job.
   * Adds crafted items to the agent's inventory with quality based on skill level.
   */
  private completeJob(world: World, job: CraftingJob): void {
    // Get the recipe to know what to produce
    if (!this.recipeRegistry) {
      throw new Error('Recipe registry not set. Cannot complete crafting job.');
    }

    const recipe = this.recipeRegistry.getRecipe(job.recipeId);
    const entity = world.getEntity(job.agentId);
    if (!entity) {
      throw new Error(`Agent entity ${job.agentId} not found`);
    }

    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) {
      throw new Error(`Agent ${job.agentId} has no inventory. Cannot receive crafted items.`);
    }

    // Calculate quality based on crafting skill level + familiarity + synergy bonuses
    let skillsComp = entity.components.get('skills') as SkillsComponent | undefined;

    // Use the centralized quality calculation function from ItemQuality
    const quality = skillsComp
      ? calculateCraftingQuality(skillsComp, 'crafting', job.recipeId)
      : 50; // Default quality if no skills component

    // Add crafted items to inventory with quality
    const outputQuantity = recipe.output.quantity * job.quantity;
    let currentInventory = inventory;
    const isLegendary = getQualityTier(quality) === 'legendary';

    try {
      if (isLegendary) {
        // Legendary items are unique - each gets its own ItemInstance
        const identity = entity.components.get('identity') as IdentityComponent | undefined;
        const creatorName = identity?.name;

        for (let i = 0; i < outputQuantity; i++) {
          // Create unique instance in registry
          const instance = itemInstanceRegistry.createInstance({
            definitionId: recipe.output.itemId,
            quality,
            condition: 100, // New items are pristine
            creator: job.agentId,
            createdAt: world.tick,
            customName: creatorName ? `${creatorName}'s ${recipe.output.itemId}` : undefined,
          });

          // Add to inventory with instanceId
          const result = addLegendaryItemToInventory(
            currentInventory,
            recipe.output.itemId,
            quality,
            instance.instanceId
          );
          currentInventory = result.inventory;
        }
      } else {
        // Normal items stack by quality tier
        const result = addToInventoryWithQuality(currentInventory, recipe.output.itemId, outputQuantity, quality);
        currentInventory = result.inventory;
      }
      job.completedCount = job.quantity;
    } catch (error) {
      // Inventory full - throw per CLAUDE.md guidelines
      throw new Error(
        `Cannot add crafted ${recipe.output.itemId} to inventory: ${(error as Error).message}`
      );
    }

    // Update the entity's inventory
    (entity as EntityImpl).updateComponent<InventoryComponent>('inventory', () => currentInventory);

    // Record task completion for familiarity bonus (if skills component exists)
    if (skillsComp) {
      // Quality is already 0-100 range from calculateCraftingQuality
      skillsComp = recordTaskCompletion(skillsComp, 'crafting', job.recipeId, quality, world.tick);

      // Add specialization XP based on recipe station/category
      const specName = this.getSpecializationForRecipe(recipe);
      if (specName) {
        skillsComp = addSpecializationXP(skillsComp, 'crafting', specName, 5);
      }

      (entity as EntityImpl).updateComponent<SkillsComponent>('skills', () => skillsComp!);
    }

    job.status = 'completed';
    job.completedAt = Date.now();

    // Remove from queue
    const queueState = this.queues.get(job.agentId);
    if (queueState) {
      const index = queueState.queue.findIndex(j => j.id === job.id);
      if (index !== -1) {
        queueState.queue.splice(index, 1);
      }
    }

    // Emit completion event with actual output including quality
    world.eventBus.emit({
      type: 'crafting:completed',
      source: 'crafting-system',
      data: {
        jobId: String(job.id),
        agentId: String(job.agentId),
        recipeId: job.recipeId,
        produced: [{ itemId: recipe.output.itemId, amount: outputQuantity, quality }]
      }
    });

    // Apply tool wear if recipe requires tools
    this.applyToolWear(world, recipe, inventory, job.agentId);

    // Note: XP granting is handled by SkillSystem listening to crafting:completed
  }

  /**
   * Apply durability loss to tools used in crafting.
   * Called after successful job completion.
   */
  private applyToolWear(
    world: World,
    recipe: Recipe,
    inventory: InventoryComponent,
    agentId: EntityId
  ): void {
    // Skip if no durability system or no tools required
    if (!this.durabilitySystem || !recipe.requiredTools || recipe.requiredTools.length === 0) {
      return;
    }

    // For each required tool type, find a working tool instance and apply wear
    for (const toolType of recipe.requiredTools) {
      // Find a working tool of this type in inventory
      const toolSlot = inventory.slots.find(slot => {
        if (!slot.itemId || !slot.instanceId) return false;

        // Get item definition to check if it's the right tool type
        const definition = itemRegistry.get(slot.itemId);
        if (!definition || !definition.traits?.tool) return false;

        // Check if tool type matches and tool is not broken
        const toolTrait = definition.traits.tool;
        if (toolTrait.toolType !== toolType) return false;

        // Check if tool is broken
        try {
          const isBroken = this.durabilitySystem.isToolBroken(slot.instanceId);
          return !isBroken;
        } catch {
          // If instance doesn't exist, skip this slot
          return false;
        }
      });

      if (!toolSlot || !toolSlot.instanceId) {
        throw new Error(
          `No working ${toolType} found in inventory. Recipe '${recipe.id}' requires ${toolType}. ` +
          `All ${toolType} tools may be broken (0 condition). Repair or craft new tools.`
        );
      }

      // Apply wear to the tool
      try {
        this.durabilitySystem.applyToolWear(toolSlot.instanceId, 'crafting', agentId);
      } catch (error) {
        // If tool breaks or other error occurs, log and continue
        // (job has already completed successfully)
        world.eventBus.emit({
          type: 'notification:show',
          source: 'crafting-system',
          data: {
            message: `Tool wear error: ${(error as Error).message}`,
            type: 'warning',
          }
        });
      }
    }
  }

  /**
   * Get crafting specialization based on recipe station or category.
   * Maps to woodworking, smithing, leatherworking, or weaving.
   */
  private getSpecializationForRecipe(recipe: Recipe): string | null {
    // Station-based specialization
    if (recipe.stationRequired) {
      const stationSpecs: Record<string, string> = {
        'workbench': 'woodworking',
        'forge': 'smithing',
        'anvil': 'smithing',
        'loom': 'weaving',
        'tanning_rack': 'leatherworking',
      };
      if (stationSpecs[recipe.stationRequired]) {
        return stationSpecs[recipe.stationRequired] ?? null;
      }
    }

    // Category-based fallback
    const categorySpecs: Record<string, string> = {
      'Tools': 'woodworking',
      'Weapons': 'smithing',
      'Armor': 'smithing',
      'Clothing': 'weaving',
      'Furniture': 'woodworking',
    };
    if (recipe.category && categorySpecs[recipe.category]) {
      return categorySpecs[recipe.category] ?? null;
    }

    return null;
  }
}
