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

  protected onUpdate(ctx: SystemContext): void {
    // Check if StateMutatorSystem has been set
    if (!this.stateMutator) {
      throw new Error('[AnimalSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    // Performance: Only update delta rates once per game minute
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

      // Update delta rates based on current state (once per game minute)
      if (shouldUpdateRates) {
        // Calculate rates per GAME minute (not real-time)
        // Species rates are per second, so convert: ratePerSecond * 60 seconds = ratePerMinute
        const hungerIncreasePerMinute = species.hungerRate * 60;
        const thirstIncreasePerMinute = species.thirstRate * 60;

        // Energy: sleeping recovers 2x faster, awake drains normally
        // When eating/drinking, energy still drains (but slower than working/fleeing)
        let energyChangePerMinute: number;
        if (animal.state === 'sleeping') {
          energyChangePerMinute = species.energyRate * 60 * 2; // Recover 2x faster
        } else if (animal.state === 'eating' || animal.state === 'drinking') {
          energyChangePerMinute = -species.energyRate * 60 * 0.5; // Drain 50% slower when resting/eating
        } else if (animal.state === 'fleeing') {
          energyChangePerMinute = -species.energyRate * 60 * 1.5; // Drain 50% faster when fleeing
        } else {
          energyChangePerMinute = -species.energyRate * 60; // Normal drain
        }

        // Age: Convert from seconds to days, then to per-minute rate
        // 1 game minute = 60 game seconds = 60/86400 game days
        const ageIncreasePerMinute = 60 / 86400; // ~0.000694 days per game minute

        // Stress: Decays over time (0.5 per second = 30 per minute)
        const stressDecayPerMinute = -30;

        // Clean up old deltas if they exist
        if (this.deltaCleanups.has(entity.id)) {
          const cleanups = this.deltaCleanups.get(entity.id)!;
          cleanups.hunger();
          cleanups.thirst();
          cleanups.energy();
          cleanups.age();
          cleanups.stress();
        }

        // Register new deltas with StateMutatorSystem
        const hungerCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Animal,
          field: 'hunger',
          deltaPerMinute: hungerIncreasePerMinute,
          min: 0,
          max: 100,
          source: 'animal_hunger',
        });

        const thirstCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Animal,
          field: 'thirst',
          deltaPerMinute: thirstIncreasePerMinute,
          min: 0,
          max: 100,
          source: 'animal_thirst',
        });

        const energyCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Animal,
          field: 'energy',
          deltaPerMinute: energyChangePerMinute,
          min: 0,
          max: 100,
          source: 'animal_energy',
        });

        const ageCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Animal,
          field: 'age',
          deltaPerMinute: ageIncreasePerMinute,
          min: 0,
          source: 'animal_age',
        });

        const stressCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Animal,
          field: 'stress',
          deltaPerMinute: stressDecayPerMinute,
          min: 0,
          max: 100,
          source: 'animal_stress',
        });

        // Store cleanup functions
        this.deltaCleanups.set(entity.id, {
          hunger: hungerCleanup,
          thirst: thirstCleanup,
          energy: energyCleanup,
          age: ageCleanup,
          stress: stressCleanup,
        });
      }

      // Always check for critical states and apply instant effects (every tick)
      // Note: Starvation/dehydration damage is now handled via delta registration below

      // Register health damage deltas if in critical state
      // These are checked every minute, so damage accumulates appropriately
      if (shouldUpdateRates) {
        // Starvation damage: 0.5 health per second = 30 per minute
        if (animal.hunger > 90) {
          this.stateMutator.registerDelta({
            entityId: entity.id,
            componentType: CT.Animal,
            field: 'health',
            deltaPerMinute: -30, // 0.5 * 60
            min: 0,
            source: 'animal_starvation',
          });
        }

        // Dehydration damage: 0.6 health per second = 36 per minute
        if (animal.thirst > 90) {
          this.stateMutator.registerDelta({
            entityId: entity.id,
            componentType: CT.Animal,
            field: 'health',
            deltaPerMinute: -36, // 0.6 * 60
            min: 0,
            source: 'animal_dehydration',
          });
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

        // State changed - need to update energy delta rates on next update
        // (e.g., sleeping recovers 2x faster, fleeing drains 1.5x faster)
        // Force rate update by setting deltaLastUpdateTick to trigger update
        if (shouldUpdateRates) {
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

        // Clean up deltas for dead animals
        if (this.deltaCleanups.has(entity.id)) {
          const cleanups = this.deltaCleanups.get(entity.id)!;
          cleanups.hunger();
          cleanups.thirst();
          cleanups.energy();
          cleanups.age();
          cleanups.stress();
          this.deltaCleanups.delete(entity.id);
        }

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

  /**
   * Get interpolated value for UI display
   * Provides smooth visual updates between batch updates
   */
  getInterpolatedValue(
    entityId: string,
    field: 'hunger' | 'thirst' | 'energy' | 'age' | 'stress' | 'health',
    currentValue: number
  ): number {
    if (!this.stateMutator) {
      return currentValue; // Fallback to current value if not initialized
    }

    return this.stateMutator.getInterpolatedValue(
      entityId,
      CT.Animal,
      field,
      currentValue,
      this.world.tick
    );
  }
}
