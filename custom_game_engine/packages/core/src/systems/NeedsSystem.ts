import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
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
export class NeedsSystem extends BaseSystem {
  public readonly id: SystemId = 'needs';
  public readonly priority: number = 15; // Run after AI (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Needs];
  // Only run when needs components exist (O(1) activation check)
  public readonly activationComponents = [CT.Needs] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides game time for converting real-time to game minutes for needs decay
   * @see StateMutatorSystem - handles batched decay updates
   */
  public readonly dependsOn = ['time', 'state_mutator'] as const;

  // Performance: Cache time entity to avoid querying every tick
  private timeEntityId: string | null = null;

  // Performance: Update delta rates once per game minute (1200 ticks)
  private lastDeltaUpdateTick = 0;
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

  protected onUpdate(ctx: SystemContext): void {
    // Performance: Only update delta rates once per game minute
    const currentTick = ctx.tick;
    const shouldUpdateRates = currentTick - this.lastDeltaUpdateTick >= this.UPDATE_INTERVAL;

    // Check if StateMutatorSystem has been set
    if (!this.stateMutator) {
      throw new Error('[NeedsSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const comps = ctx.components(entity);
      const { needs } = comps.require(CT.Needs);

      // Dead entities don't have physical needs - skip decay entirely
      const realmLocation = comps.optional<RealmLocationComponent>('realm_location');
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
        const circadian = comps.optional<CircadianComponent>(CT.Circadian);
        const isSleeping = circadian?.isSleeping || false;

        // Hunger decay rate (per GAME minute)
        // Per CLAUDE.md: Don't let hunger wake agents during minimum sleep period
        const hungerDecayPerGameMinute = isSleeping ? 0 : -0.0008; // Negative = decay

        // Energy decay based on activity level (per GAME minute)
        let energyDecayPerGameMinute = -0.0003; // Base rate: idle/walking

        if (!isSleeping) {
          const agent = comps.optional<AgentComponent>(CT.Agent);
          const movement = comps.optional<MovementComponent>(CT.Movement);

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
          const temperature = comps.optional<TemperatureComponent>(CT.Temperature);
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

      const needsComp = needs as NeedsComponent;
      let ticksAtZeroHunger = needsComp.ticksAtZeroHunger || 0;
      let starvationDayMemoriesIssued = new Set<number>(
        Array.isArray(needsComp.starvationDayMemoriesIssued)
          ? needsComp.starvationDayMemoriesIssued
          : []
      );

      if (needsComp.hunger === 0) {
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
      const isEnergyCritical = needsComp.energy < 0.1;

      // Emit progressive starvation memories (days 1, 2, 3, 4)
      if (daysAtZeroHunger >= 1 && daysAtZeroHunger <= 4) {
        if (!starvationDayMemoriesIssued.has(daysAtZeroHunger)) {
          // Type-safe emission - compile error if data shape is wrong
          ctx.emit('need:starvation_day', {
            agentId: entity.id,
            dayNumber: daysAtZeroHunger,
            survivalRelevance: 0.7 + (daysAtZeroHunger * 0.1),
          }, entity.id);

          starvationDayMemoriesIssued.add(daysAtZeroHunger);
        }
      }

      // Update starvation tracking (if changed)
      if (ticksAtZeroHunger !== needsComp.ticksAtZeroHunger ||
          starvationDayMemoriesIssued.size !== needsComp.starvationDayMemoriesIssued.size) {
        comps.update<NeedsComponent>(CT.Needs, (current) => {
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
        // Type-safe emission - compile error if data shape is wrong
        ctx.emit('need:critical', {
          agentId: entity.id,
          needType: 'energy',
          value: needsComp.energy,
          survivalRelevance: 0.7,
        }, entity.id);
      }

      // Track current critical state for next tick
      this.wasEnergyCritical.set(entity.id, isEnergyCritical);

      // Check for death (starvation after 5 game days at 0% hunger)
      if (ticksAtZeroHunger >= STARVATION_DEATH_DAYS * TICKS_PER_GAME_DAY) {
        // Type-safe emission - compile error if data shape is wrong
        ctx.emit('agent:starved', {
          agentId: entity.id,
          survivalRelevance: 1.0,
        }, entity.id);
      }
    }

    // Mark rates as updated
    if (shouldUpdateRates) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  /**
   * Get interpolated value for UI display
   * Provides smooth visual updates between batch updates
   */
  getInterpolatedValue(
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
      this.world.tick
    );
  }
}
