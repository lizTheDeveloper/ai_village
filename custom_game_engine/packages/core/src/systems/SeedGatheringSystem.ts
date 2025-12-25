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

  /**
   * System temporarily disabled pending ActionQueue migration.
   *
   * This system previously handled:
   * - gather_seeds: Collecting seeds from wild/cultivated plants
   * - harvest: Harvesting both fruit and seeds from mature plants
   *
   * Migration needed:
   * 1. Replace agent.currentAction with ActionQueue pattern
   * 2. Update event emission to use typed EventBus
   * 3. Add proper error handling (throw instead of console.warn)
   * 4. Remove 'any' types and add proper component interfaces
   *
   * See: farming-system/spec.md lines 296-343
   */
  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Disabled until ActionQueue migration is complete
    return;
  }
}
