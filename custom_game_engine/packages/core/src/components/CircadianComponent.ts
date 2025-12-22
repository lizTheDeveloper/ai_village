import { ComponentBase } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';

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

export interface CircadianComponentData {
  sleepDrive?: number;
  preferredSleepTime?: number;
  isSleeping?: boolean;
  sleepLocation?: Entity | null;
  sleepQuality?: number;
  sleepStartTime?: number | null;
  lastSleepLocation?: Entity | null;
  genetics?: any; // SleepGenetics type (defined separately)
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
  public genetics?: any; // Will be typed as SleepGenetics

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
   * Requires entity to have AgentComponent for temperature check
   */
  public calculateSleepQuality(location: Entity | null, entity?: any): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses
    if (location) {
      if ((location as any).type === 'bed') {
        quality += 0.4;
      } else if ((location as any).type === 'building') {
        quality += 0.2;
      } else if ((location as any).type === 'campfire') {
        quality += 0.1;
      }
    }

    // Environmental penalties
    if (entity && entity.getComponent) {
      const AgentComponent = require('./AgentComponent').AgentComponent;
      const agentComp = entity.getComponent(AgentComponent);
      if (agentComp && agentComp.needs) {
        const temperature = agentComp.needs.temperature;
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
  }

  /**
   * Check if agent should wake up
   * Requires entity parameter to check needs
   */
  public shouldWake(currentTime: number, entity?: any): boolean {
    if (!this.isSleeping) {
      return false;
    }

    // Minimum sleep duration check
    const sleepDuration = this.getSleepDuration(currentTime);

    let criticalNeed = false;
    if (entity && entity.getComponent) {
      const AgentComponent = require('./AgentComponent').AgentComponent;
      const agentComp = entity.getComponent(AgentComponent);
      if (agentComp && agentComp.needs) {
        criticalNeed = agentComp.needs.hunger < 10 || agentComp.needs.thirst < 10;

        if (sleepDuration < 4 && !criticalNeed) {
          return false;
        }

        // Wake conditions
        const energyFull = agentComp.needs.energy >= 100;
        const sleepDriveDepleted = this.sleepDrive < 10;
        const criticalHunger = agentComp.needs.hunger < 10;
        const criticalThirst = agentComp.needs.thirst < 10;

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
