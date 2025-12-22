import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface TimeComponent {
  type: 'time';
  version: number;
  timeOfDay: number;          // 0-24 hours (continuous)
  dayLength: number;           // Real-time seconds per game day (default: 600 = 10 min/day)
  phase: DayPhase;             // Current phase
  lightLevel: number;          // 0-1 (affects visibility and temperature)
}

export function createTimeComponent(
  timeOfDay: number = 6,        // Start at dawn
  dayLength: number = 600       // 10 minutes per game day
): TimeComponent {
  return {
    type: 'time',
    version: 1,
    timeOfDay,
    dayLength,
    phase: calculatePhase(timeOfDay),
    lightLevel: calculateLightLevel(timeOfDay, calculatePhase(timeOfDay)),
  };
}

/**
 * Calculate the current phase based on time of day
 */
function calculatePhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= 5 && timeOfDay < 7) return 'dawn';
  if (timeOfDay >= 7 && timeOfDay < 17) return 'day';
  if (timeOfDay >= 17 && timeOfDay < 19) return 'dusk';
  return 'night'; // 19:00-5:00
}

/**
 * Calculate light level based on time of day and phase
 */
function calculateLightLevel(timeOfDay: number, phase: DayPhase): number {
  switch (phase) {
    case 'dawn': {
      // 5:00-7:00: 0.3 → 1.0
      const progress = (timeOfDay - 5) / 2; // 0 to 1
      return 0.3 + (0.7 * progress);
    }
    case 'day':
      return 1.0;
    case 'dusk': {
      // 17:00-19:00: 1.0 → 0.1
      const progress = (timeOfDay - 17) / 2; // 0 to 1
      return 1.0 - (0.9 * progress);
    }
    case 'night':
      return 0.1;
  }
}

/**
 * TimeSystem manages the day/night cycle
 * Integrates with WeatherSystem via temperature modifiers
 */
export class TimeSystem implements System {
  public readonly id: SystemId = 'time';
  public readonly priority: number = 3; // Run early, before Weather (priority 5)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['time'];

  private lastPhase: DayPhase | null = null;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const time = impl.getComponent<TimeComponent>('time');
      if (!time) continue;

      // Calculate hours elapsed (deltaTime is in seconds)
      const hoursElapsed = (deltaTime / time.dayLength) * 24;

      // Update time of day (wrap at 24)
      let newTimeOfDay = time.timeOfDay + hoursElapsed;
      if (newTimeOfDay >= 24) {
        newTimeOfDay -= 24;

        // Emit day change event
        world.eventBus.emit({
          type: 'time:day_changed',
          source: entity.id,
          data: { newDay: Math.floor((world.tick * deltaTime) / time.dayLength) + 1 },
        });
      }

      // Calculate new phase and light level
      const newPhase = calculatePhase(newTimeOfDay);
      const newLightLevel = calculateLightLevel(newTimeOfDay, newPhase);

      // Update component
      impl.updateComponent<TimeComponent>('time', (current) => ({
        ...current,
        timeOfDay: newTimeOfDay,
        phase: newPhase,
        lightLevel: newLightLevel,
      }));

      // Emit phase change event if phase changed
      if (this.lastPhase !== null && this.lastPhase !== newPhase) {
        const formattedTime = this.formatTime(newTimeOfDay);
        console.log(`[TimeSystem] Phase changed: ${this.lastPhase} → ${newPhase} at ${formattedTime}`);

        world.eventBus.emit({
          type: 'time:phase_changed',
          source: entity.id,
          data: {
            oldPhase: this.lastPhase,
            newPhase,
            timeOfDay: formattedTime,
            lightLevel: newLightLevel,
          },
        });
      }

      this.lastPhase = newPhase;
    }
  }

  /**
   * Format time of day as HH:MM
   */
  private formatTime(timeOfDay: number): string {
    const hours = Math.floor(timeOfDay);
    const minutes = Math.floor((timeOfDay - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get temperature modifier based on time of day (for integration with TemperatureSystem)
   */
  public static getTemperatureModifier(timeOfDay: number): number {
    const phase = calculatePhase(timeOfDay);

    switch (phase) {
      case 'night':
        return -5; // -5°C at night
      case 'dawn':
      case 'dusk':
        return -2; // -2°C during dawn/dusk
      case 'day':
        return 0;  // No modifier during day
    }
  }
}
