import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { getAnimalSpecies } from '../data/animalSpecies.js';

/**
 * Taming method types
 */
export type TamingMethod = 'feeding' | 'patience' | 'rescue' | 'raising';

/**
 * Interaction types for bond building
 */
export type InteractionType = 'feeding' | 'grooming' | 'playing' | 'rescuing' | 'training';

/**
 * TamingSystem handles taming attempts and bond building
 * Priority: 70 (runs late in the update cycle)
 */
export class TamingSystem implements System {
  public readonly id: SystemId = 'taming';
  public readonly priority: number = 70;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['animal'];

  private world: World | null = null;

  // This system doesn't update every tick, it responds to taming attempts
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.world = world;
    // No per-tick updates needed
    // All taming logic is handled via attemptTaming() method
  }

  /**
   * Attempt to tame a wild animal
   */
  public attemptTaming(
    world: World,
    animal: AnimalComponent,
    agentId: string,
    method: TamingMethod,
    itemOffered?: string
  ): { success: boolean; reason: string; trustGain?: number } {
    // Check if animal is already tamed
    if (!animal.wild) {
      return { success: false, reason: 'Animal is already tamed' };
    }

    // Get species data
    const species = getAnimalSpecies(animal.speciesId);

    // Check if species can be tamed
    if (!species.canBeTamed) {
      return { success: false, reason: 'This species cannot be tamed' };
    }

    // Calculate base taming chance
    let baseChance = 100 - species.tameDifficulty;

    // Apply method effectiveness
    let methodBonus = 0;
    switch (method) {
      case 'feeding':
        methodBonus = 20;
        // Check if item is preferred food
        if (itemOffered && species.preferredFood.includes(itemOffered)) {
          methodBonus += 20; // Preferred food gives bonus
        }
        break;
      case 'patience':
        methodBonus = 10;
        break;
      case 'rescue':
        methodBonus = 40; // Rescuing is very effective
        break;
      case 'raising':
        methodBonus = 60; // Raising from birth is most effective
        break;
    }

    // Apply trust level modifier
    const trustBonus = animal.trustLevel * 0.5; // Max +50% from high trust

    // Calculate final taming chance
    const tamingChance = Math.min(95, baseChance + methodBonus + trustBonus);

    // Roll for taming success
    const roll = Math.random() * 100;
    const success = roll <= tamingChance;

    if (success) {
      // Tame the animal
      animal.wild = false;
      animal.ownerId = agentId;
      animal.bondLevel = 20; // Start with basic bond
      animal.trustLevel = Math.min(100, animal.trustLevel + 20);
      animal.stress = Math.max(0, animal.stress - 30); // Reduce stress

      // Emit tamed event
      world.eventBus.emit({
        type: 'animal_tamed',
        source: agentId,
        data: {
          animalId: animal.id,
          tamerId: agentId,
          agentId,
          method,
        },
      });

      return {
        success: true,
        reason: 'Taming successful',
        trustGain: 20,
      };
    } else {
      // Taming failed, but still gain some trust
      const trustGain = Math.floor(methodBonus * 0.3);
      animal.trustLevel = Math.min(100, animal.trustLevel + trustGain);

      // Increase stress from failed attempt
      animal.stress = Math.min(100, animal.stress + 10);

      return {
        success: false,
        reason: 'Taming failed, but gained some trust',
        trustGain,
      };
    }
  }

  /**
   * Interact with a tamed animal to build bond
   */
  public interact(
    world: World,
    animal: AnimalComponent,
    agentId: string,
    interactionType: InteractionType
  ): { success: boolean; bondGain: number; reason?: string } {
    // Check if animal is tamed
    if (animal.wild) {
      return { success: false, bondGain: 0, reason: 'Animal is wild, cannot interact' };
    }

    // Check if agent is the owner
    if (animal.ownerId !== agentId) {
      return { success: false, bondGain: 0, reason: 'You are not the owner of this animal' };
    }

    // Calculate bond gain based on interaction type
    let bondGain = 0;
    switch (interactionType) {
      case 'feeding':
        bondGain = 2;
        break;
      case 'grooming':
        bondGain = 3;
        break;
      case 'playing':
        bondGain = 4;
        break;
      case 'rescuing':
        bondGain = 10;
        break;
      case 'training':
        bondGain = 3;
        break;
    }

    // Apply bond gain
    const oldBond = animal.bondLevel;
    animal.bondLevel = Math.min(100, animal.bondLevel + bondGain);

    // Reduce stress from positive interaction
    animal.stress = Math.max(0, animal.stress - 5);

    // Improve mood
    animal.mood = Math.min(100, animal.mood + 5);

    // Check if bond level crossed threshold
    const bondLevels = [
      { name: 'wary', min: 0, max: 20 },
      { name: 'accepting', min: 21, max: 40 },
      { name: 'friendly', min: 41, max: 60 },
      { name: 'loyal', min: 61, max: 80 },
      { name: 'bonded', min: 81, max: 100 },
    ];

    const oldLevel = bondLevels.find(l => oldBond >= l.min && oldBond <= l.max);
    const newLevel = bondLevels.find(l => animal.bondLevel >= l.min && animal.bondLevel <= l.max);

    if (oldLevel && newLevel && oldLevel.name !== newLevel.name) {
      // Emit bond level changed event
      world.eventBus.emit({
        type: 'bond_level_changed',
        source: agentId,
        data: {
          animalId: animal.id,
          agentId,
          oldLevel: oldLevel.name,
          newLevel: newLevel.name,
          bondLevel: animal.bondLevel,
        },
      });
    }

    return {
      success: true,
      bondGain,
    };
  }

  /**
   * Get bond level category
   */
  public getBondLevel(bondValue: number): string {
    if (bondValue >= 0 && bondValue <= 20) return 'wary';
    if (bondValue >= 21 && bondValue <= 40) return 'accepting';
    if (bondValue >= 41 && bondValue <= 60) return 'friendly';
    if (bondValue >= 61 && bondValue <= 80) return 'loyal';
    if (bondValue >= 81 && bondValue <= 100) return 'bonded';
    return 'unknown';
  }

  /**
   * Set world reference (for tests that don't call update())
   */
  public setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Calculate taming chance (wrapper method for tests that use entityId)
   */
  public calculateTameChance(
    entityId: string,
    _agentId: string,
    method: TamingMethod,
    itemOffered?: string
  ): number {
    if (!this.world) {
      throw new Error('TamingSystem not initialized - call setWorld() or update() first');
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const animal = entity.components.get('animal') as AnimalComponent | undefined;
    if (!animal) {
      throw new Error(`Entity ${entityId} does not have animal component`);
    }

    // Get species data
    const species = getAnimalSpecies(animal.speciesId);

    // Check if species can be tamed
    if (!species.canBeTamed) {
      return 0;
    }

    // Calculate base taming chance
    let baseChance = 100 - species.tameDifficulty;

    // Apply method effectiveness
    let methodBonus = 0;
    switch (method) {
      case 'feeding':
        methodBonus = 20;
        // Check if item is preferred food
        if (itemOffered && species.preferredFood.includes(itemOffered)) {
          methodBonus += 20; // Preferred food gives bonus
        }
        break;
      case 'patience':
        methodBonus = 10;
        break;
      case 'rescue':
        methodBonus = 40; // Rescuing is very effective
        break;
      case 'raising':
        methodBonus = 60; // Raising from birth is most effective
        break;
    }

    // Apply trust level modifier
    const trustBonus = animal.trustLevel * 0.5; // Max +50% from high trust

    // Calculate final taming chance
    const tamingChance = Math.min(95, baseChance + methodBonus + trustBonus);

    return tamingChance;
  }

  /**
   * Attempt to tame a wild animal (wrapper method for tests that use entityId)
   */
  public attemptTame(
    entityId: string,
    agentId: string,
    method: TamingMethod,
    itemOffered?: string
  ): { success: boolean; reason: string; trustGain?: number } {
    if (!this.world) {
      throw new Error('TamingSystem not initialized - call update() first');
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const animal = entity.components.get('animal') as AnimalComponent | undefined;
    if (!animal) {
      throw new Error(`Entity ${entityId} does not have animal component`);
    }

    return this.attemptTaming(this.world, animal, agentId, method, itemOffered);
  }

  /**
   * Perform interaction with tamed animal (wrapper method for tests that use entityId)
   */
  public performInteraction(
    entityId: string,
    agentId: string,
    interactionType: InteractionType
  ): { success: boolean; bondGain: number; reason?: string } {
    if (!this.world) {
      throw new Error('TamingSystem not initialized - call update() first');
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const animal = entity.components.get('animal') as AnimalComponent | undefined;
    if (!animal) {
      throw new Error(`Entity ${entityId} does not have animal component`);
    }

    return this.interact(this.world, animal, agentId, interactionType);
  }

  /**
   * Get bond category for entity (wrapper method for tests that use entityId)
   */
  public getBondCategory(entityId: string): string {
    if (!this.world) {
      throw new Error('TamingSystem not initialized - call update() first');
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const animal = entity.components.get('animal') as AnimalComponent | undefined;
    if (!animal) {
      throw new Error(`Entity ${entityId} does not have animal component`);
    }

    return this.getBondLevel(animal.bondLevel);
  }
}
