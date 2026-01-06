import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import {
  DAWN_START_HOUR,
  DAY_START_HOUR,
  DUSK_START_HOUR,
  NIGHT_START_HOUR,
  GAME_DAY_SECONDS,
} from '../constants/index.js';
import { multiverseCoordinator } from '../multiverse/index.js';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface TimeComponent {
  type: 'time';
  version: number;
  timeOfDay: number;          // 0-24 hours (continuous)
  dayLength: number;           // Real-time seconds per game day at 1x speed (default: 48s)
  speedMultiplier: number;     // Time speed: 1 (48s/day), 2 (24s/day), 4 (12s/day), 8 (6s/day dev speed)
  phase: DayPhase;             // Current phase
  lightLevel: number;          // 0-1 (affects visibility and temperature)
  day: number;                 // Current day number (starts at 1)
}

export function createTimeComponent(
  timeOfDay: number = 6,        // Start at dawn
  dayLength: number = GAME_DAY_SECONDS,       // 48 seconds per game day at 1x speed (20 year generation in 96 hours)
  speedMultiplier: number = 1   // Default 1x speed
): TimeComponent {
  return {
    type: 'time',
    version: 1,
    timeOfDay,
    dayLength,
    speedMultiplier,
    phase: calculatePhase(timeOfDay),
    lightLevel: calculateLightLevel(timeOfDay, calculatePhase(timeOfDay)),
    day: 1, // Start at day 1
  };
}

/**
 * Calculate the current phase based on time of day
 */
function calculatePhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= DAWN_START_HOUR && timeOfDay < DAY_START_HOUR) return 'dawn';
  if (timeOfDay >= DAY_START_HOUR && timeOfDay < DUSK_START_HOUR) return 'day';
  if (timeOfDay >= DUSK_START_HOUR && timeOfDay < NIGHT_START_HOUR) return 'dusk';
  return 'night'; // 19:00-5:00
}

/**
 * Calculate light level based on time of day and phase
 */
function calculateLightLevel(timeOfDay: number, phase: DayPhase): number {
  switch (phase) {
    case 'dawn': {
      // 5:00-7:00: 0.3 → 1.0
      const progress = (timeOfDay - DAWN_START_HOUR) / (DAY_START_HOUR - DAWN_START_HOUR); // 0 to 1
      return 0.3 + (0.7 * progress);
    }
    case 'day':
      return 1.0;
    case 'dusk': {
      // 17:00-19:00: 1.0 → 0.1
      const progress = (timeOfDay - DUSK_START_HOUR) / (NIGHT_START_HOUR - DUSK_START_HOUR); // 0 to 1
      return 1.0 - (0.9 * progress);
    }
    case 'night':
      return 0.1;
  }
}

/**
 * TimeSystem manages the day/night cycle
 * Integrates with WeatherSystem via temperature modifiers
 * Integrates with MultiverseCoordinator for time scale management
 */
/**
 * TimeSystem - Core time advancement system
 *
 * Dependencies: None (runs first)
 *
 * This system must run before all other systems as it provides the fundamental
 * time tracking that other systems depend on for their calculations.
 */
export class TimeSystem implements System {
  public readonly id: SystemId = 'time';
  public readonly priority: number = 3; // Run early, before Weather (priority 5)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Time];

  /**
   * Systems that must run before this one.
   * None - TimeSystem runs first to establish time tracking.
   */
  public readonly dependsOn = [] as const;

  private lastPhase: DayPhase | null = null;
  private lastDay: number = 1; // Track previous day to detect week changes
  private universeId: string = 'universe:main'; // Default universe ID

  /**
   * Set the universe ID for this time system.
   * Used to get time scale from MultiverseCoordinator.
   */
  setUniverseId(universeId: string): void {
    this.universeId = universeId;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get time scale from MultiverseCoordinator if registered
    const universe = multiverseCoordinator.getUniverse(this.universeId);
    const timeScale = universe?.config.timeScale ?? 1.0;
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const time = impl.getComponent<TimeComponent>(CT.Time);
      if (!time) continue;

      // Calculate effective day length based on time scale from MultiverseCoordinator
      // timeScale 1.0 = 48s/day, 2.0 = 24s/day, 4.0 = 12s/day
      // Note: speedMultiplier in component is now deprecated, use MultiverseCoordinator
      const effectiveTimeScale = timeScale * time.speedMultiplier;
      const effectiveDayLength = time.dayLength / effectiveTimeScale;

      // Calculate hours elapsed (deltaTime is in seconds)
      const hoursElapsed = (deltaTime / effectiveDayLength) * 24;

      // Update time of day (wrap at 24)
      let newTimeOfDay = time.timeOfDay + hoursElapsed;
      let newDay = time.day;
      if (newTimeOfDay >= 24) {
        newTimeOfDay -= 24;
        newDay = time.day + 1; // Increment day counter

        // Check if new week started (every 7 days)
        const previousWeek = Math.floor((this.lastDay - 1) / 7);
        const currentWeek = Math.floor((newDay - 1) / 7);

        // Emit day change event
        world.eventBus.emit({
          type: 'time:day_changed',
          source: entity.id,
          data: {
            day: newDay,
            newDay,
          },
        });

        // Emit week change event if week changed
        if (currentWeek > previousWeek) {
          world.eventBus.emit({
            type: 'time:new_week',
            source: entity.id,
            data: {
              week: currentWeek,
            },
          });
        }

        this.lastDay = newDay;
      }

      // Calculate new phase and light level
      const newPhase = calculatePhase(newTimeOfDay);
      // Light level calculated but not stored in component currently
      void calculateLightLevel(newTimeOfDay, newPhase);

      // Update component
      impl.updateComponent<TimeComponent>(CT.Time, (current) => ({
        ...current,
        timeOfDay: newTimeOfDay,
        phase: newPhase,
        day: newDay,
        }));

      // Emit phase change event if phase changed
      if (this.lastPhase !== null && this.lastPhase !== newPhase) {
        world.eventBus.emit({
          type: 'time:phase_changed',
          source: entity.id,
          data: {
            phase: newPhase,
            oldPhase: this.lastPhase,
            newPhase,
          },
        });
      }

      this.lastPhase = newPhase;
    }
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
