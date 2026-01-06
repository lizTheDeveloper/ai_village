import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { AnimalComponent, type AnimalLifeStage } from '../components/AnimalComponent.js';
import { getAnimalSpecies } from '../data/animalSpecies.js';

/**
 * AnimalSystem handles animal lifecycle, needs, and state management
 * Priority: 15 (same as NeedsSystem, runs after AI, before Movement)
 *
 * @dependencies None - Core lifecycle system that manages animal needs, aging, and state
 */
export class AnimalSystem implements System {
  public readonly id: SystemId = CT.Animal;
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal];
  public readonly dependsOn = [] as const;

  constructor(_eventBus?: EventBus) {
    // EventBus passed for consistency but not used directly (world.eventBus is used instead)
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Update agent positions in scheduler
    world.simulationScheduler.updateAgentPositions(world);

    // Filter to only visible entities
    const activeEntities = world.simulationScheduler.filterActiveEntities(
      entities as Entity[],
      world.tick
    );

    for (const entity of activeEntities) {
      const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
      if (!animal) {
        continue;
      }

      // Validate required fields (per CLAUDE.md - crash if missing)
      if (animal.health === undefined || animal.health === null) {
        throw new Error(`Animal ${animal.id} missing required CT.Health field`);
      }
      if (animal.hunger === undefined || animal.hunger === null) {
        throw new Error(`Animal ${animal.id} missing required 'hunger' field`);
      }
      if (animal.thirst === undefined || animal.thirst === null) {
        throw new Error(`Animal ${animal.id} missing required 'thirst' field`);
      }
      if (animal.energy === undefined || animal.energy === null) {
        throw new Error(`Animal ${animal.id} missing required 'energy' field`);
      }

      // Get species data
      const species = getAnimalSpecies(animal.speciesId);

      // Update needs based on species rates
      // deltaTime is in seconds (1 tick = 0.05 seconds at 20 TPS)
      const hungerIncrease = species.hungerRate * deltaTime;
      const thirstIncrease = species.thirstRate * deltaTime;
      const energyDecrease = animal.state === 'sleeping' ? -species.energyRate * deltaTime * 2 : species.energyRate * deltaTime;

      animal.hunger = Math.min(100, animal.hunger + hungerIncrease);
      animal.thirst = Math.min(100, animal.thirst + thirstIncrease);
      animal.energy = Math.max(0, Math.min(100, animal.energy - energyDecrease));

      // Apply health damage from critical hunger/thirst
      if (animal.hunger > 90) {
        const starvationDamage = 0.5 * deltaTime; // 0.5 health per second
        animal.health = Math.max(0, animal.health - starvationDamage);
      }
      if (animal.thirst > 90) {
        const dehydrationDamage = 0.6 * deltaTime; // 0.6 health per second (slightly faster than hunger)
        animal.health = Math.max(0, animal.health - dehydrationDamage);
      }

      // Update age (deltaTime is in seconds, convert to days)
      // At 20 TPS, 1 tick = 0.05 seconds
      // 1 day = 86400 seconds
      const daysPassed = deltaTime / 86400;
      animal.age += daysPassed;

      // Check for life stage progression
      const newLifeStage = this.calculateLifeStage(animal.age, species);
      if (newLifeStage !== animal.lifeStage) {
        const oldStage = animal.lifeStage;
        animal.lifeStage = newLifeStage;

        // Emit life stage changed event
        world.eventBus.emit({
          type: 'life_stage_changed',
          source: entity.id,
          data: {
            animalId: animal.id,
            from: oldStage,
            to: newLifeStage,
          },
        });

        // Update size based on life stage
        animal.size = this.calculateSize(newLifeStage, species.baseSize);
      }

      // Determine animal behavior state based on needs
      const newState = this.determineState(animal);
      if (newState !== animal.state) {
        const oldState = animal.state;
        animal.state = newState;

        // Emit state changed event
        world.eventBus.emit({
          type: 'animal_state_changed',
          source: entity.id,
          data: {
            animalId: animal.id,
            from: oldState,
            to: newState,
          },
        });
      }

      // Perform actions based on current state
      if (animal.state === 'eating') {
        // Reduce hunger when eating (10 points per second)
        animal.hunger = Math.max(0, animal.hunger - 10 * deltaTime);
      } else if (animal.state === 'drinking') {
        // Reduce thirst when drinking (15 points per second)
        animal.thirst = Math.max(0, animal.thirst - 15 * deltaTime);
      } else if (animal.state === 'sleeping') {
        // Already handled above in energy calculation (energy recovers 2x faster when sleeping)
      } else if (animal.state === 'foraging') {
        // Reduce hunger slowly when foraging (5 points per second)
        animal.hunger = Math.max(0, animal.hunger - 5 * deltaTime);
      }

      // Update mood based on needs and stress
      animal.mood = this.calculateMood(animal);

      // Health effects from critical needs
      if (animal.hunger >= 95 || animal.thirst >= 95) {
        // Starving/dehydrating - lose health
        animal.health = Math.max(0, animal.health - 0.1 * deltaTime);
      }

      // Check for death
      if (animal.health <= 0 || animal.age >= species.maxAge) {
        world.eventBus.emit({
          type: 'animal_died',
          source: entity.id,
          data: {
            animalId: animal.id,
            speciesId: animal.speciesId,
            cause: animal.health <= 0 ? CT.Health : 'old_age',
          },
        });

        // Note: Actual entity removal should be handled by a death handler system
      }

      // Decay stress over time (animals naturally calm down)
      if (animal.stress > 0) {
        animal.stress = Math.max(0, animal.stress - 0.5 * deltaTime);
      }
    }
  }

  /**
   * Calculate life stage based on age
   */
  private calculateLifeStage(age: number, species: any): AnimalLifeStage {
    if (age < species.infantDuration) {
      return 'infant';
    } else if (age < species.infantDuration + species.juvenileDuration) {
      return 'juvenile';
    } else if (age < species.infantDuration + species.juvenileDuration + species.adultDuration) {
      return 'adult';
    } else {
      return 'elder';
    }
  }

  /**
   * Calculate size based on life stage
   */
  private calculateSize(lifeStage: AnimalLifeStage, baseSize: number): number {
    switch (lifeStage) {
      case 'infant':
        return baseSize * 0.3;
      case 'juvenile':
        return baseSize * 0.6;
      case 'adult':
        return baseSize;
      case 'elder':
        return baseSize * 0.95;
    }
  }

  /**
   * Determine animal state based on needs and conditions
   */
  private determineState(animal: AnimalComponent): 'idle' | 'sleeping' | 'eating' | 'drinking' | 'foraging' | 'fleeing' {
    // Highest priority: flee if very stressed (matches FleeBehavior.canStart threshold)
    if (animal.stress > 70) {
      return 'fleeing';
    }

    // Second priority: critical needs
    if (animal.thirst > 75) {
      return 'drinking';
    }

    if (animal.hunger > 75) {
      return 'eating';
    }

    // Third priority: sleep if tired
    if (animal.energy < 25) {
      return 'sleeping';
    }

    // Fourth priority: moderate needs
    if (animal.hunger > 50) {
      return 'foraging';
    }

    // Default: idle
    return 'idle';
  }

  /**
   * Calculate mood based on needs, health, and stress
   */
  private calculateMood(animal: AnimalComponent): number {
    let mood = 50; // Base mood

    // Positive factors
    if (animal.hunger < 30) mood += 10; // Well fed
    if (animal.thirst < 30) mood += 10; // Hydrated
    if (animal.energy > 70) mood += 10; // Well rested
    if (animal.health > 80) mood += 10; // Healthy

    // Negative factors
    if (animal.hunger > 70) mood -= 20; // Hungry
    if (animal.thirst > 70) mood -= 20; // Thirsty
    if (animal.energy < 30) mood -= 10; // Tired
    if (animal.health < 40) mood -= 20; // Sick
    mood -= animal.stress * 0.3; // Stress reduces mood

    return Math.max(0, Math.min(100, mood));
  }
}
