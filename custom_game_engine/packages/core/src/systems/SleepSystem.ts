import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { CircadianComponent } from '../components/CircadianComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { TimeComponent } from './TimeSystem.js';

/**
 * SleepSystem manages agent sleep behavior, energy recovery, and circadian rhythms
 *
 * Responsibilities:
 * - Update sleep drive based on time awake/asleep
 * - Recover energy during sleep
 * - Apply sleep quality modifiers
 * - Handle wake conditions
 */
export class SleepSystem implements System {
  public readonly id: SystemId = 'sleep';
  public readonly priority: number = 12; // After Needs (priority 15), before Memory (100)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['circadian', 'needs'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get time component from world entity (should be only one)
    const timeEntities = world.query().with('time').executeEntities();
    let timeOfDay = 12; // Default noon if no time entity
    let hoursElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent<TimeComponent>('time');
      if (timeComp) {
        timeOfDay = timeComp.timeOfDay;
        // Calculate hours elapsed based on deltaTime and day length
        hoursElapsed = (deltaTime / timeComp.dayLength) * 24;
      }
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const circadian = impl.getComponent<CircadianComponent>('circadian');
      const needs = impl.getComponent<NeedsComponent>('needs');

      if (!circadian || !needs) continue;

      // Update sleep drive based on time and whether sleeping
      let newSleepDrive = circadian.sleepDrive;

      if (circadian.isSleeping) {
        // Decrease while sleeping (-10 per hour, reduced from -15 to allow longer sleep)
        newSleepDrive = Math.max(0, circadian.sleepDrive - 10 * hoursElapsed);
      } else {
        // Increase while awake
        let increment = 2 * hoursElapsed; // Base rate (+2 per hour)

        // Increase faster at night (after preferred sleep time)
        if (timeOfDay >= circadian.preferredSleepTime || timeOfDay < 5) {
          increment = 5 * hoursElapsed; // +5 per hour at night
        }

        // Modified by energy level (low energy = higher sleep drive)
        if (needs.energy < 30) {
          increment *= 1.5; // 50% faster when tired
        }

        newSleepDrive = Math.min(100, circadian.sleepDrive + increment);
      }

      // Apply sleep drive changes directly by mutating the component
      // CircadianComponent has methods, so we can't use spread operator
      (circadian as any).sleepDrive = newSleepDrive;

      // Debug logging every 100 ticks for first few entities
      if ((entity.id < '4' || entity.id.startsWith('0')) && world.tick % 100 === 0) {
        console.log(`[SleepSystem] Entity ${entity.id.substring(0, 8)}: sleepDrive ${circadian.sleepDrive.toFixed(1)} (hours: ${hoursElapsed.toFixed(4)}, sleeping: ${circadian.isSleeping}, time: ${timeOfDay.toFixed(1)})`);
      }

      // Process sleep (energy recovery) if sleeping
      if (circadian.isSleeping) {
        this.processSleep(impl, circadian, needs, hoursElapsed, world);
      }
    }
  }

  /**
   * Process sleep: recover energy based on sleep quality
   */
  private processSleep(
    entity: EntityImpl,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    hoursElapsed: number,
    world: World
  ): void {
    // Get sleep quality from circadian component (set by AISystem when sleep started)
    const sleepQuality = circadian.sleepQuality || 0.5;

    // Base energy recovery: +10 energy per game hour
    const baseRecovery = 10 * hoursElapsed;

    // Apply quality modifier
    const recoveryAmount = baseRecovery * sleepQuality;

    // Recover energy
    const newEnergy = Math.min(100, needs.energy + recoveryAmount);

    // Update needs component
    entity.updateComponent<NeedsComponent>('needs', (current) => ({
      ...current,
      energy: newEnergy,
    }));

    // Track accumulated sleep duration in game hours
    const currentSleepDuration = (circadian as any).sleepDurationHours || 0;
    (circadian as any).sleepDurationHours = currentSleepDuration + hoursElapsed;

    // Update circadian sleepQuality dynamically based on conditions
    const updatedQuality = this.calculateSleepQuality(entity, circadian);
    if (Math.abs(updatedQuality - sleepQuality) > 0.05) {
      // Only update if significant change
      entity.updateComponent('circadian', (current: any) => ({
        ...current,
        sleepQuality: updatedQuality,
      }));
    }

    // Check wake conditions
    if (this.shouldWake(entity, circadian, needs, world.tick)) {
      this.wakeAgent(entity, circadian, world);
    }
  }

  /**
   * Calculate sleep quality based on location and environmental conditions
   */
  private calculateSleepQuality(
    entity: EntityImpl,
    circadian: CircadianComponent
  ): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses
    if (circadian.sleepLocation) {
      const location = circadian.sleepLocation as any;

      // Check if sleeping in a bed
      const buildingComp = location.getComponent?.('building');
      if (buildingComp) {
        if (buildingComp.buildingType === 'bed') {
          quality += 0.4; // Bed: 0.9 total
        } else if (buildingComp.buildingType === 'bedroll') {
          quality += 0.2; // Bedroll: 0.7 total
        } else {
          quality += 0.1; // Other building: 0.6 total
        }
      }
    }

    // Environmental penalties
    const needs = entity.getComponent<NeedsComponent>('needs');
    if (needs) {
      // Temperature penalties (if we had temperature on needs)
      // Note: Current NeedsComponent doesn't have temperature field
      // This would need to be integrated with TemperatureSystem
    }

    // Clamp to valid range (0.1 to 1.0)
    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Check if agent should wake up
   * NOTE: Sleep duration is tracked in GAME HOURS by SleepSystem.processSleep via hoursElapsed accumulation,
   * not in real-time ticks. We use circadian.sleepDuration if available, otherwise estimate from ticks.
   */
  private shouldWake(
    _entity: EntityImpl,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    _currentTick: number
  ): boolean {
    if (!circadian.isSleeping || circadian.sleepStartTime === null) {
      return false;
    }

    // Get accumulated sleep duration from circadian component (in game hours)
    // This is updated by processSleep each frame
    const hoursAsleep = (circadian as any).sleepDurationHours || 0;

    // Minimum sleep duration: 4 game hours
    if (hoursAsleep < 4) {
      // Only wake for critical hunger (not energy - agent needs to recover!)
      if (needs.hunger < 10) {
        return true; // Critical hunger overrides minimum sleep
      }
      return false;
    }

    // Wake conditions (prioritize energy recovery):
    // 1. Energy fully restored (100)
    const energyFull = needs.energy >= 100;

    // 2. Urgent hunger (< 10)
    const urgentNeed = needs.hunger < 10;

    // 3. Energy sufficiently recovered (>= 70) AND sleep drive depleted (< 10)
    // This prevents premature waking when sleep drive depletes before energy recovers
    const wellRestedAndSatisfied = needs.energy >= 70 && circadian.sleepDrive < 10;

    // 4. Maximum sleep duration reached (12 hours - prevent oversleeping)
    const maxSleepReached = hoursAsleep >= 12;

    return energyFull || urgentNeed || wellRestedAndSatisfied || maxSleepReached;
  }

  /**
   * Wake agent from sleep
   */
  private wakeAgent(
    entity: EntityImpl,
    circadian: CircadianComponent,
    world: World
  ): void {
    // Get accumulated sleep duration for logging
    const hoursAsleep = (circadian as any).sleepDurationHours || 0;

    // Update circadian component (immutable)
    entity.updateComponent('circadian', (current: any) => ({
      ...current,
      isSleeping: false,
      lastSleepLocation: current.sleepLocation,
      sleepLocation: null,
      sleepStartTime: null,
      sleepDurationHours: 0, // Reset sleep duration counter
    }));

    // Update agent behavior (switch from sleeping to wandering)
    const agent = entity.getComponent<AgentComponent>('agent');
    if (agent && (agent.behavior === 'seek_sleep' || agent.behavior === 'forced_sleep')) {
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }

    console.log(`[SleepSystem] Agent ${entity.id} woke up after ${hoursAsleep.toFixed(1)} game hours of sleep`);

    // Emit wake event
    world.eventBus.emit({
      type: 'agent:woke',
      source: entity.id,
      data: {
        entityId: entity.id,
        sleepDuration: hoursAsleep,
      },
    });
  }
}
