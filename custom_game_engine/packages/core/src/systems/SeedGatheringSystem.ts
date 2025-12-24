import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { PlantSpecies } from '../types/PlantSpecies.js';

/**
 * SeedGatheringSystem handles agent actions for gathering seeds from wild plants
 * and harvesting seeds from cultivated plants.
 *
 * Based on farming-system/spec.md lines 296-343
 */
export class SeedGatheringSystem implements System {
  public readonly id: SystemId = 'seed-gathering';
  public readonly priority: number = 25; // Run after AI decisions, before movement
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['agent', 'position'];

  private plantSpeciesRegistry: Map<string, PlantSpecies> = new Map();

  /**
   * Register plant species for seed gathering
   */
  public registerPlantSpecies(species: PlantSpecies): void {
    this.plantSpeciesRegistry.set(species.id, species);
  }

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // TODO: This system needs to be updated to use ActionQueue instead of agent.currentAction
    // Temporarily disabled to fix build errors
    return;

    /*
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const agent = impl.getComponent<AgentComponent>('agent');

      if (!agent) continue;

      // TODO: Get action from ActionQueue
      const action: any = null;
      if (!action) continue;

      // Handle gather_seeds action
      if (action.type === 'gather_seeds' && 'plantId' in action) {
        this.handleGatherSeeds(impl, action.plantId, world);
      }

      // Handle harvest action (harvests both fruit AND seeds)
      if (action.type === 'harvest' && 'position' in action) {
        this.handleHarvest(impl, action.position, world);
      }
    }
    */
  }

  /**
   * Handle gather_seeds action - agent gathers seeds from a wild or cultivated plant
   * TODO: Re-enable when ActionQueue integration is complete
   */
  /*
  // @ts-ignore - Disabled until ActionQueue integration
  private _handleGatherSeeds(
    agent: EntityImpl,
    plantId: string,
    world: World
  ): void {
    // Find the plant entity
    const plantEntity = world.getEntity(plantId);
    if (!plantEntity) {
      console.warn(`[SeedGatheringSystem] Plant ${plantId} not found`);
      this.clearAgentAction(agent);
      return;
    }

    const plantImpl = plantEntity as EntityImpl;
    const plant = plantImpl.getComponent<PlantComponent>('plant');
    const plantPos = plantImpl.getComponent<PositionComponent>('position');

    if (!plant || !plantPos) {
      console.warn(`[SeedGatheringSystem] Plant ${plantId} missing plant or position component`);
      this.clearAgentAction(agent);
      return;
    }

    // Check if plant is at a valid stage for seed gathering
    const validStages: string[] = ['mature', 'seeding', 'senescence'];
    if (!validStages.includes(plant.stage)) {
      console.log(`[SeedGatheringSystem] Plant at stage '${plant.stage}', cannot gather seeds (need mature/seeding/senescence)`);
      this.clearAgentAction(agent);
      return;
    }

    // Check if plant has seeds available
    if (plant.seedsProduced <= 0) {
      console.log(`[SeedGatheringSystem] Plant has no seeds available (seedsProduced=${plant.seedsProduced})`);
      this.clearAgentAction(agent);
      return;
    }

    // Check if agent is close enough
    const agentPos = agent.getComponent<PositionComponent>('position');
    if (!agentPos) {
      this.clearAgentAction(agent);
      return;
    }

    const distance = Math.sqrt(
      Math.pow(plantPos.x - agentPos.x, 2) +
      Math.pow(plantPos.y - agentPos.y, 2)
    );

    if (distance > 2.0) {
      // Agent needs to move closer first
      return;
    }

    // Get plant species for seed calculation
    const species = this.plantSpeciesRegistry.get(plant.speciesId);
    if (!species) {
      console.warn(`[SeedGatheringSystem] Unknown plant species: ${plant.speciesId}`);
      this.clearAgentAction(agent);
      return;
    }

    // Calculate seed yield based on plant health, stage, and agent skill
    const agentFarmingSkill = (agent as any).skills?.farming ?? 50; // Default farming skill
    const seedYield = calculateSeedYield(plant, species.seedsPerPlant, agentFarmingSkill);

    if (seedYield === 0) {
      console.log(`[SeedGatheringSystem] Seed yield calculation resulted in 0 seeds`);
      this.clearAgentAction(agent);
      return;
    }

    // Determine source type
    const sourceType = plant.stage === 'mature' || plant.stage === 'seeding' ? 'wild' : 'cultivated';

    // Create seeds and add to agent's inventory
    const inventory = agent.getComponent<InventoryComponent>('inventory');
    if (!inventory) {
      console.warn(`[SeedGatheringSystem] Agent has no inventory component`);
      this.clearAgentAction(agent);
      return;
    }

    const seedItemId = createSeedItemId(plant.speciesId);

    try {
      // Add seeds to inventory
      const result = addToInventory(inventory, seedItemId, seedYield);

      // Update agent's inventory
      agent.updateComponent<InventoryComponent>('inventory', () => result.inventory);

      // Reduce plant's remaining seeds
      plantImpl.updateComponent<PlantComponent>('plant', (current) => ({
        ...current,
        seedsProduced: Math.max(0, current.seedsProduced - seedYield)
      }));

      // Emit seed:gathered event
      world.eventBus.emit({
        type: 'seed:gathered',
        source: agent.id,
        data: {
          agentId: agent.id,
          plantId: plantEntity.id,
          speciesId: plant.speciesId,
          seedCount: seedYield,
          sourceType,
          position: plantPos
        }
      });

      console.log(
        `[SeedGatheringSystem] Agent ${agent.id.substring(0, 8)} gathered ${seedYield} ${plant.speciesId} seeds from plant at (${plantPos.x.toFixed(1)}, ${plantPos.y.toFixed(1)})`
      );

    } catch (error) {
      if (error instanceof Error) {
        console.warn(`[SeedGatheringSystem] Failed to add seeds to inventory: ${error.message}`);
      }
    }

    // Clear action - gathering is complete
    this.clearAgentAction(agent);
  }
  */

  /**
   * Handle harvest action - agent harvests fruit AND seeds from a cultivated plant
   * TODO: Re-enable when ActionQueue integration is complete
   */
  /*
  // @ts-ignore - Disabled until ActionQueue integration
  private _handleHarvest(
    agent: EntityImpl,
    targetPosition: { x: number; y: number },
    world: World
  ): void {
    // Find plant at target position
    const plants = world.query().with('plant').with('position').executeEntities();

    let targetPlant: EntityImpl | null = null;
    let targetPlantPos: PositionComponent | null = null;

    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const pos = plantImpl.getComponent<PositionComponent>('position');

      if (!pos) continue;

      if (Math.abs(pos.x - targetPosition.x) < 0.5 && Math.abs(pos.y - targetPosition.y) < 0.5) {
        targetPlant = plantImpl;
        targetPlantPos = pos;
        break;
      }
    }

    if (!targetPlant || !targetPlantPos) {
      console.log(`[SeedGatheringSystem] No plant found at position (${targetPosition.x}, ${targetPosition.y})`);
      this.clearAgentAction(agent);
      return;
    }

    const plant = targetPlant.getComponent<PlantComponent>('plant');
    if (!plant) {
      this.clearAgentAction(agent);
      return;
    }

    // Check if plant is harvestable
    if (plant.stage !== 'mature' && plant.stage !== 'seeding') {
      console.log(`[SeedGatheringSystem] Plant at stage '${plant.stage}', cannot harvest (need mature or seeding)`);
      this.clearAgentAction(agent);
      return;
    }

    // Check if agent is close enough
    const agentPos = agent.getComponent<PositionComponent>('position');
    if (!agentPos) {
      this.clearAgentAction(agent);
      return;
    }

    const distance = Math.sqrt(
      Math.pow(targetPlantPos.x - agentPos.x, 2) +
      Math.pow(targetPlantPos.y - agentPos.y, 2)
    );

    if (distance > 2.0) {
      // Agent needs to move closer first
      return;
    }

    // Get plant species
    const species = this.plantSpeciesRegistry.get(plant.speciesId);
    if (!species) {
      console.warn(`[SeedGatheringSystem] Unknown plant species: ${plant.speciesId}`);
      this.clearAgentAction(agent);
      return;
    }

    const inventory = agent.getComponent<InventoryComponent>('inventory');
    if (!inventory) {
      console.warn(`[SeedGatheringSystem] Agent has no inventory component`);
      this.clearAgentAction(agent);
      return;
    }

    // Harvest fruit (if available)
    if (plant.fruitCount > 0) {
      try {
        const fruitResult = addToInventory(inventory, 'food', plant.fruitCount);
        agent.updateComponent<InventoryComponent>('inventory', () => fruitResult.inventory);

        console.log(
          `[SeedGatheringSystem] Agent ${agent.id.substring(0, 8)} harvested ${plant.fruitCount} fruit from ${plant.speciesId}`
        );

        // Reset fruit count
        targetPlant.updateComponent<PlantComponent>('plant', (current) => ({
          ...current,
          fruitCount: 0
        }));
      } catch (error) {
        if (error instanceof Error) {
          console.warn(`[SeedGatheringSystem] Failed to add fruit to inventory: ${error.message}`);
        }
      }
    }

    // Harvest seeds (if available)
    if (plant.seedsProduced > 0) {
      const agentFarmingSkill = (agent as any).skills?.farming ?? 50;
      const seedYield = calculateSeedYield(plant, species.seedsPerPlant, agentFarmingSkill);

      if (seedYield > 0) {
        const seedItemId = createSeedItemId(plant.speciesId);

        try {
          const seedResult = addToInventory(inventory, seedItemId, seedYield);
          agent.updateComponent<InventoryComponent>('inventory', () => seedResult.inventory);

          // Reduce plant's remaining seeds
          targetPlant.updateComponent<PlantComponent>('plant', (current) => ({
            ...current,
            seedsProduced: Math.max(0, current.seedsProduced - seedYield)
          }));

          // Emit seed:harvested event
          world.eventBus.emit({
            type: 'seed:harvested',
            source: agent.id,
            data: {
              agentId: agent.id,
              plantId: targetPlant.id,
              speciesId: plant.speciesId,
              seedCount: seedYield,
              position: targetPlantPos
            }
          });

          console.log(
            `[SeedGatheringSystem] Agent ${agent.id.substring(0, 8)} harvested ${seedYield} ${plant.speciesId} seeds`
          );
        } catch (error) {
          if (error instanceof Error) {
            console.warn(`[SeedGatheringSystem] Failed to add seeds to inventory: ${error.message}`);
          }
        }
      }
    }

    // Clear action - harvest is complete
    this.clearAgentAction(agent);
  }
  */

  /**
   * Clear agent's current action
   * TODO: Re-enable when ActionQueue integration is complete
   */
  /*
  private clearAgentAction(agent: EntityImpl): void {
    agent.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      currentAction: null
    }));
  }
  */
}
