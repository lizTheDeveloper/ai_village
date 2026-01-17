import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

/**
 * NeedsSystem - Manages agent physical needs (hunger, energy, thirst)
 *
 * PERFORMANCE: Uses StateMutatorSystem for batched vector updates (60× improvement)
 * Instead of updating needs every tick, this system:
 * 1. Runs once per game minute to update delta rates based on activity
 * 2. StateMutatorSystem handles the actual batched decay
 * 3. Event emission and starvation tracking handled here
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides game time for calculating needs decay rates
 * @see StateMutatorSystem (priority 5) - Batched vector updates for hunger/energy decay
 */
export class NeedsSystem implements System {
  public readonly id: SystemId = 'needs';
  public readonly priority: number = 15; // Run after AI (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Needs];

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides game time for converting real-time to game minutes for needs decay
   * @see StateMutatorSystem - handles batched decay updates
   */
  public readonly dependsOn = ['time', 'state_mutator'] as const;

  // Performance: Cache time entity to avoid querying every tick
  private timeEntityId: string | null = null;

  // Performance: Update delta rates once per game minute (1200 ticks)
  private lastUpdateTick = 0;
  private readonly UPDATE_INTERVAL = 1200; // 1 game minute at 20 TPS

  // Track cleanup functions for registered deltas
  private deltaCleanups = new Map<string, { hunger: () => void; energy: () => void }>();

  // Track previous critical state for each entity to detect threshold crossings
  private wasEnergyCritical = new Map<string, boolean>();

  // Reference to StateMutatorSystem (set via setStateMutatorSystem)
  private stateMutator: StateMutatorSystem | null = null;

  /**
   * Set the StateMutatorSystem reference.
   * Called by registerAllSystems during initialization.
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Use SimulationScheduler to only process active entities
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    // Performance: Only update delta rates once per game minute
    const currentTick = world.tick;
    const shouldUpdateRates = currentTick - this.lastUpdateTick >= this.UPDATE_INTERVAL;

    // Check if StateMutatorSystem has been set
    if (!this.stateMutator) {
      throw new Error('[NeedsSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    for (const entity of activeEntities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>(CT.Needs)!;

      if (!needs) {
        throw new Error(`Entity ${entity.id} missing required needs component`);
      }

      // Dead entities don't have physical needs - skip decay entirely
      const realmLocation = impl.getComponent<RealmLocationComponent>('realm_location');
      if (realmLocation?.transformations.includes('dead')) {
        // Clean up any existing deltas for dead entities
        if (this.deltaCleanups.has(entity.id)) {
          const cleanups = this.deltaCleanups.get(entity.id)!;
          cleanups.hunger();
          cleanups.energy();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Update delta rates based on current activity (once per game minute)
      if (shouldUpdateRates) {
        // Check if agent is sleeping
        const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
        const isSleeping = circadian?.isSleeping || false;

        // Hunger decay rate (per GAME minute)
        // Per CLAUDE.md: Don't let hunger wake agents during minimum sleep period
        const hungerDecayPerGameMinute = isSleeping ? 0 : -0.0008; // Negative = decay

        // Energy decay based on activity level (per GAME minute)
        let energyDecayPerGameMinute = -0.0003; // Base rate: idle/walking

        if (!isSleeping) {
          const agent = impl.getComponent<AgentComponent>(CT.Agent);
          const movement = impl.getComponent<MovementComponent>(CT.Movement);

          if (agent) {
            const behavior = agent.behavior;
            const isMoving = movement && (Math.abs(movement.velocityX) > 0.01 || Math.abs(movement.velocityY) > 0.01);

            if (behavior === 'gather' || behavior === 'build') {
              energyDecayPerGameMinute = -0.0008; // Working
            } else if (isMoving && movement.speed > 3.0) {
              energyDecayPerGameMinute = -0.0012; // Running
            } else if (isMoving) {
              energyDecayPerGameMinute = -0.0003; // Walking
            } else {
              energyDecayPerGameMinute = -0.0003; // Idle
            }
          }

          // Add temperature penalties
          const temperature = impl.getComponent<TemperatureComponent>(CT.Temperature);
          if (temperature) {
            if (temperature.currentTemp < 10) {
              energyDecayPerGameMinute -= 0.0002; // Cold exposure
            } else if (temperature.currentTemp > 30) {
              energyDecayPerGameMinute -= 0.0002; // Hot exposure
            }
          }
        } else {
          energyDecayPerGameMinute = 0; // No energy decay while sleeping
        }

        // Clean up old deltas if they exist
        if (this.deltaCleanups.has(entity.id)) {
          const cleanups = this.deltaCleanups.get(entity.id)!;
          cleanups.hunger();
          cleanups.energy();
        }

        // Register new deltas with StateMutatorSystem
        const hungerCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Needs,
          field: 'hunger',
          deltaPerMinute: hungerDecayPerGameMinute,
          min: 0,
          max: 1,
          source: 'needs_hunger_decay',
        });

        const energyCleanup = this.stateMutator.registerDelta({
          entityId: entity.id,
          componentType: CT.Needs,
          field: 'energy',
          deltaPerMinute: energyDecayPerGameMinute,
          min: 0,
          max: 1,
          source: 'needs_energy_decay',
        });

        // Store cleanup functions
        this.deltaCleanups.set(entity.id, {
          hunger: hungerCleanup,
          energy: energyCleanup,
        });
      }

      // Always check for critical states and starvation (every tick)
      // Track time at zero hunger for starvation mechanics
      const TICKS_PER_GAME_DAY = 14400;
      const STARVATION_DEATH_DAYS = 5;

      let ticksAtZeroHunger = needs.ticksAtZeroHunger || 0;
      let starvationDayMemoriesIssued = new Set<number>(
        Array.isArray(needs.starvationDayMemoriesIssued)
          ? needs.starvationDayMemoriesIssued
          : []
      );

      if (needs.hunger === 0) {
        ticksAtZeroHunger += 1;
      } else {
        // Reset counter if hunger is above 0
        ticksAtZeroHunger = 0;
        starvationDayMemoriesIssued = new Set<number>();
      }

      // Calculate which day of starvation we're on
      const daysAtZeroHunger = Math.floor(ticksAtZeroHunger / TICKS_PER_GAME_DAY);

      // Check for energy critical (lowered from 20% to 10% to reduce spam)
      // Use tracked state to detect threshold crossings between ticks
      const wasEnergyCritical = this.wasEnergyCritical.get(entity.id) ?? false;
      const isEnergyCritical = needs.energy < 0.1;

      // Emit progressive starvation memories (days 1, 2, 3, 4)
      if (daysAtZeroHunger >= 1 && daysAtZeroHunger <= 4) {
        if (!starvationDayMemoriesIssued.has(daysAtZeroHunger)) {
          world.eventBus.emit({
            type: 'need:starvation_day',
            source: entity.id,
            data: {
              agentId: entity.id,
              dayNumber: daysAtZeroHunger,
              survivalRelevance: 0.7 + (daysAtZeroHunger * 0.1),
            },
          });

          starvationDayMemoriesIssued.add(daysAtZeroHunger);
        }
      }

      // Update starvation tracking (if changed)
      if (ticksAtZeroHunger !== needs.ticksAtZeroHunger ||
          starvationDayMemoriesIssued.size !== needs.starvationDayMemoriesIssued.size) {
        impl.updateComponent<NeedsComponent>(CT.Needs, (current) => {
          const updated = new NeedsComponent({
            ...current,
            ticksAtZeroHunger,
          });
          updated.starvationDayMemoriesIssued = new Set(starvationDayMemoriesIssued);
          return updated;
        });
      }

      // Emit energy critical event (once when crossing threshold)
      if (!wasEnergyCritical && isEnergyCritical) {
        world.eventBus.emit({
          type: 'need:critical',
          source: entity.id,
          data: {
            agentId: entity.id,
            needType: 'energy',
            value: needs.energy,
            survivalRelevance: 0.7,
          },
        });
      }

      // Track current critical state for next tick
      this.wasEnergyCritical.set(entity.id, isEnergyCritical);

      // Check for death (starvation after 5 game days at 0% hunger)
      if (ticksAtZeroHunger >= STARVATION_DEATH_DAYS * TICKS_PER_GAME_DAY) {
        world.eventBus.emit({
          type: 'agent:starved',
          source: entity.id,
          data: {
            agentId: entity.id,
            survivalRelevance: 1.0,
          },
        });
      }
    }

    // Mark rates as updated
    if (shouldUpdateRates) {
      this.lastUpdateTick = currentTick;
    }
  }

  /**
   * Get interpolated value for UI display
   * Provides smooth visual updates between batch updates
   */
  getInterpolatedValue(
    world: World,
    entityId: string,
    field: 'hunger' | 'energy',
    currentValue: number
  ): number {
    if (!this.stateMutator) {
      return currentValue; // Fallback to current value if not initialized
    }

    return this.stateMutator.getInterpolatedValue(
      entityId,
      CT.Needs,
      field,
      currentValue,
      world.tick
    );
  }
}
