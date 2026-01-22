import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { AnimalComponent, type AnimalLifeStage } from '../components/AnimalComponent.js';
import { getAnimalSpecies } from '../data/animalSpecies.js';
import { setMutationRate, clearMutationRate, MUTATION_PATHS } from '../components/MutationVectorComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

/**
 * AnimalSystem handles animal lifecycle, needs, and state management
 * Priority: 15 (same as NeedsSystem, runs after AI, before Movement)
 *
 * PERFORMANCE: Uses StateMutatorSystem with MutationVectorComponent for per-tick updates
 * Instead of updating needs/age every tick, this system:
 * 1. Runs once per game minute to update mutation rates based on state (sleeping, eating, etc.)
 * 2. StateMutatorSystem handles the actual per-tick mutations
 * 3. Event emission and state determination handled here
 *
 * @dependencies StateMutatorSystem - Handles per-tick mutations via MutationVectorComponent
 */
export class AnimalSystem extends BaseSystem {
  public readonly id: SystemId = CT.Animal;
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal, CT.Position];
  // Only run when animal components exist (O(1) activation check)
  public readonly activationComponents = [CT.Animal] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second for animal updates

  /**
   * Systems that must run before this one.
   * @see StateMutatorSystem - handles per-tick mutations
   */
  public readonly dependsOn = ['state_mutator'] as const;

  // Performance: Update mutation rates once per game minute (1200 ticks)
  private deltaLastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute at 20 TPS

  // Track cleanup functions for registered deltas
  private deltaCleanups = new Map<string, {
    hunger: () => void;
    thirst: () => void;
    energy: () => void;
    age: () => void;
    stress: () => void;
  }>();

  // Reference to StateMutatorSystem (set via setStateMutatorSystem)
  private stateMutator: StateMutatorSystem | null = null;

  /**
   * Set the StateMutatorSystem reference.
   * Called by registerAllSystems during initialization.
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Performance: Only update mutation rates once per game minute
    const currentTick = ctx.tick;
    const shouldUpdateRates = currentTick - this.deltaLastUpdateTick >= this.UPDATE_INTERVAL;

    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const animal = comps.optional<AnimalComponent>(CT.Animal);
      if (!animal) continue;

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

      // Update mutation rates based on current state (once per game minute)
      if (shouldUpdateRates) {
        // Calculate rates per SECOND (new API uses per-second rates)
        // Species rates are per second, so use them directly
        const hungerIncreasePerSecond = species.hungerRate;
        const thirstIncreasePerSecond = species.thirstRate;

        // Energy: sleeping recovers 2x faster, awake drains normally
        // When eating/drinking, energy still drains (but slower than working/fleeing)
        let energyChangePerSecond: number;
        if (animal.state === 'sleeping') {
          energyChangePerSecond = species.energyRate * 2; // Recover 2x faster
        } else if (animal.state === 'eating' || animal.state === 'drinking') {
          energyChangePerSecond = -species.energyRate * 0.5; // Drain 50% slower when resting/eating
        } else if (animal.state === 'fleeing') {
          energyChangePerSecond = -species.energyRate * 1.5; // Drain 50% faster when fleeing
        } else {
          energyChangePerSecond = -species.energyRate; // Normal drain
        }

        // Age: Convert from seconds to days, then to per-second rate
        // 1 game second = 1/86400 game days
        const ageIncreasePerSecond = 1 / 86400; // ~0.0000116 days per game second

        // Stress: Decays over time (0.5 per second)
        const stressDecayPerSecond = -0.5;

        // Set mutation rates using new API (no cleanup needed)
        setMutationRate(entity, MUTATION_PATHS.ANIMAL_HUNGER, hungerIncreasePerSecond, {
          min: 0,
          max: 100,
          source: 'animal_hunger',
        });

        setMutationRate(entity, MUTATION_PATHS.ANIMAL_THIRST, thirstIncreasePerSecond, {
          min: 0,
          max: 100,
          source: 'animal_thirst',
        });

        setMutationRate(entity, MUTATION_PATHS.ANIMAL_ENERGY, energyChangePerSecond, {
          min: 0,
          max: 100,
          source: 'animal_energy',
        });

        setMutationRate(entity, MUTATION_PATHS.ANIMAL_AGE, ageIncreasePerSecond, {
          min: 0,
          source: 'animal_age',
        });

        setMutationRate(entity, MUTATION_PATHS.ANIMAL_STRESS, stressDecayPerSecond, {
          min: 0,
          max: 100,
          source: 'animal_stress',
        });
      }

      // Always check for critical states and apply instant effects (every tick)
      // Note: Starvation/dehydration damage is now handled via mutation rates below

      // Set health damage mutation rates if in critical state
      // These are checked every minute, so damage accumulates appropriately
      if (shouldUpdateRates) {
        // Starvation damage: 0.5 health per second
        if (animal.hunger > 90) {
          setMutationRate(entity, 'animal.health', -0.5, {
            min: 0,
            source: 'animal_starvation',
          });
        } else {
          // Clear starvation damage if hunger drops below threshold
          clearMutationRate(entity, 'animal.health');
        }

        // Dehydration damage: 0.6 health per second
        if (animal.thirst > 90) {
          setMutationRate(entity, 'animal.health', -0.6, {
            min: 0,
            source: 'animal_dehydration',
          });
        } else if (animal.hunger <= 90) {
          // Only clear if both hunger and thirst are below threshold
          clearMutationRate(entity, 'animal.health');
        }
      }

      // Check for life stage progression
      const newLifeStage = this.calculateLifeStage(animal.age, species);
      if (newLifeStage !== animal.lifeStage) {
        const oldStage = animal.lifeStage;
        animal.lifeStage = newLifeStage;

        // Emit life stage changed event
        ctx.world.eventBus.emit({
          type: 'animal:life_stage_change',
          source: entity.id,
          data: {
            animalId: animal.id,
            oldStage: oldStage,
            newStage: newLifeStage,
            ageDays: animal.age,
          },
        });

        // Update size based on life stage
        animal.size = this.calculateSize(newLifeStage, species.baseSize);
      }

      // Determine animal behavior state based on needs (always runs every tick)
      const newState = this.determineState(animal);
      if (newState !== animal.state) {
        const oldState = animal.state;
        animal.state = newState;

        // Emit state changed event
        ctx.world.eventBus.emit({
          type: 'animal_state_changed',
          source: entity.id,
          data: {
            animalId: animal.id,
            from: oldState,
            to: newState,
          },
        });

        // State changed - need to update energy mutation rates on next update
        // (e.g., sleeping recovers 2x faster, fleeing drains 1.5x faster)
        // Force rate update by resetting deltaLastUpdateTick to trigger update
        if (!shouldUpdateRates) {
          this.deltaLastUpdateTick = 0; // Force update next tick
        }
      }

      // Update mood based on needs and stress (always runs every tick)
      animal.mood = this.calculateMood(animal);

      // Check for death (always runs every tick)
      if (animal.health <= 0 || animal.age >= species.maxAge) {
        ctx.world.eventBus.emit({
          type: 'animal_died',
          source: entity.id,
          data: {
            animalId: animal.id,
            speciesId: animal.speciesId,
            cause: animal.health <= 0 ? CT.Health : 'old_age',
          },
        });

        // Note: Mutation rates are entity-local, so they're automatically cleaned up
        // when the entity is removed. No manual cleanup needed.

        // Note: Actual entity removal should be handled by a death handler system
      }
    }

    // Mark rates as updated
    if (shouldUpdateRates) {
      this.deltaLastUpdateTick = currentTick;
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
