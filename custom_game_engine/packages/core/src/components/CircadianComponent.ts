import { ComponentBase } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import type { SleepGenetics } from '../genetics/SleepGenetics';
import type { BuildingComponent } from './BuildingComponent';
import type { NeedsComponent } from './NeedsComponent';

/**
 * Helper interface for entities that have getComponent method
 */
export interface EntityWithComponents extends Entity {
  getComponent<T>(type: string): T | undefined;
  hasComponent(type: string): boolean;
}

/**
 * Create a CircadianComponent with default values
 */
export function createCircadianComponent(
  preferredSleepTime?: number,
  sleepDrive: number = 0
): CircadianComponent {
  return new CircadianComponent({
    sleepDrive,
    preferredSleepTime,
    isSleeping: false,
    sleepLocation: null,
    sleepQuality: 0,
    sleepStartTime: null,
    lastSleepLocation: null,
  });
}

export interface DreamContent {
  memoryElements: string[]; // Snippets from memories that appear in dream
  weirdElement: string; // One surreal/strange element
  dreamNarrative: string; // The full dream description
  interpretation: string; // Agent's interpretation upon waking
}

export interface CircadianComponentData {
  sleepDrive?: number;
  preferredSleepTime?: number;
  isSleeping?: boolean;
  sleepLocation?: Entity | null;
  sleepQuality?: number;
  sleepStartTime?: number | null;
  lastSleepLocation?: Entity | null;
  lastDream?: DreamContent | null;
  hasDreamedThisSleep?: boolean;
  sleepDurationHours?: number; // Accumulated sleep duration in game hours
  genetics?: SleepGenetics;
  energy?: number; // For validation
}

export class CircadianComponent extends ComponentBase {
  public readonly type = 'circadian' as const;
  public sleepDrive: number; // 0-100: urge to sleep
  public preferredSleepTime: number; // Hour of day (19-23 typically)
  public isSleeping: boolean;
  public sleepLocation: Entity | null;
  public sleepQuality: number; // 0-1: affects energy recovery rate
  public sleepStartTime: number | null;
  public lastSleepLocation: Entity | null;
  public lastDream: DreamContent | null; // Last dream experienced
  public hasDreamedThisSleep: boolean; // Track if dreamed during current sleep
  public sleepDurationHours: number; // Accumulated sleep duration in game hours
  public genetics?: SleepGenetics;

  constructor(data: CircadianComponentData) {
    super();

    if (data === undefined || data === null) {
      throw new Error('CircadianComponent requires data object (can be empty {})');
    }

    // Validate energy if provided
    if (data.energy !== undefined) {
      if (data.energy < 0 || data.energy > 100) {
        throw new Error('energy must be between 0 and 100');
      }
    }

    // Generate random preferredSleepTime if not provided
    this.preferredSleepTime = data.preferredSleepTime !== undefined
      ? data.preferredSleepTime
      : 19 + Math.random() * 4; // 19-23

    this.sleepDrive = data.sleepDrive ?? 0;
    this.isSleeping = data.isSleeping ?? false;
    this.sleepLocation = data.sleepLocation ?? null;
    this.sleepQuality = data.sleepQuality ?? 0;
    this.sleepStartTime = data.sleepStartTime ?? null;
    this.lastSleepLocation = data.lastSleepLocation ?? null;
    this.lastDream = data.lastDream ?? null;
    this.hasDreamedThisSleep = data.hasDreamedThisSleep ?? false;
    this.sleepDurationHours = data.sleepDurationHours ?? 0;
    this.genetics = data.genetics;
  }

  /**
   * Update sleep drive based on time awake/asleep and time of day
   */
  public updateSleepDrive(hoursElapsed: number, currentTimeOfDay: number): void {
    if (this.isSleeping) {
      // Decrease while sleeping
      this.sleepDrive = Math.max(0, this.sleepDrive - 15 * hoursElapsed);
    } else {
      // Increase while awake
      let increment = 2 * hoursElapsed; // Base rate

      // Increase faster at night (after preferred sleep time)
      if (currentTimeOfDay >= this.preferredSleepTime || currentTimeOfDay < 5) {
        increment = 5 * hoursElapsed;
      }

      this.sleepDrive = Math.min(100, this.sleepDrive + increment);
    }
  }

  /**
   * Check if agent should seek sleep (> 60 sleep drive)
   */
  public shouldSeekSleep(): boolean {
    return this.sleepDrive > 60;
  }

  /**
   * Check if agent will sleep anywhere (> 80 sleep drive)
   */
  public shouldSleepAnywhere(): boolean {
    return this.sleepDrive > 80;
  }

  /**
   * Check if forced micro-sleep (> 95 sleep drive)
   */
  public isForcedMicroSleep(): boolean {
    return this.sleepDrive > 95;
  }

  /**
   * Calculate sleep quality based on location and conditions
   * Requires entity to have needs component for temperature check
   */
  public calculateSleepQuality(location: Entity | null, entity?: EntityWithComponents): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses - check if location has building component
    if (location && (location as EntityWithComponents).getComponent) {
      const buildingComp = (location as EntityWithComponents).getComponent<BuildingComponent>('building');
      if (buildingComp) {
        // Check building type for sleep quality bonuses
        if (buildingComp.buildingType === 'bed') {
          quality += 0.4;
        } else if (buildingComp.buildingType === 'tent' || buildingComp.buildingType === 'lean-to') {
          quality += 0.2;
        } else if (buildingComp.buildingType === 'campfire') {
          quality += 0.1;
        }
      }
    }

    // Environmental penalties - check entity's needs component
    if (entity) {
      const needsComp = entity.getComponent<NeedsComponent>('needs');
      if (needsComp) {
        const temperature = needsComp.temperature;
        if (temperature < 15) {
          quality -= 0.2; // Too cold
        }
        if (temperature > 28) {
          quality -= 0.2; // Too hot
        }
      }
    }

    // Clamp to valid range
    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Start sleeping session
   */
  public startSleeping(currentTime: number, location: Entity | null): void {
    this.isSleeping = true;
    this.sleepStartTime = currentTime;
    this.sleepLocation = location;
  }

  /**
   * Wake up from sleep
   */
  public wake(): void {
    this.isSleeping = false;
    this.lastSleepLocation = this.sleepLocation;
    this.sleepLocation = null;
    this.sleepStartTime = null;
    this.hasDreamedThisSleep = false; // Reset for next sleep
  }

  /**
   * Check if agent should wake up
   * Requires entity parameter to check needs
   */
  public shouldWake(currentTime: number, entity?: EntityWithComponents): boolean {
    if (!this.isSleeping) {
      return false;
    }

    // Minimum sleep duration check
    const sleepDuration = this.getSleepDuration(currentTime);

    let criticalNeed = false;
    if (entity) {
      const needsComp = entity.getComponent<NeedsComponent>('needs');
      if (needsComp) {
        criticalNeed = needsComp.hunger < 10 || needsComp.thirst < 10;

        if (sleepDuration < 4 && !criticalNeed) {
          return false;
        }

        // Wake conditions (NeedsComponent uses 0-1 scale)
        const energyFull = needsComp.energy >= 1.0;
        const sleepDriveDepleted = this.sleepDrive < 10;
        const criticalHunger = needsComp.hunger < 0.1;
        const criticalThirst = needsComp.thirst < 0.1;

        return energyFull || sleepDriveDepleted || criticalHunger || criticalThirst;
      }
    }

    // Fallback: wake if sleep drive depleted or long enough
    return this.sleepDrive < 10 || sleepDuration >= 8;
  }

  /**
   * Get total sleep duration in hours
   */
  public getSleepDuration(currentTime: number): number {
    if (!this.isSleeping || this.sleepStartTime === null) {
      return 0;
    }
    return currentTime - this.sleepStartTime;
  }
}
