export interface SleepGeneticsData {
  energyDepletionRate: number;  // 0.8-1.2x multiplier
  sleepEfficiency: number;       // 0.8-1.2x recovery rate
  preferredSleepTime: number;    // 19-23 hour preference
  sleepDuration: number;         // 6-9 hours needed
}

export interface SleepEpigenetics {
  chronicFatigue: number;      // Parent's avg energy over life (0-100)
  sleepDeprivation: number;    // How often parent was exhausted (0-1)
}

export type SleepArchetype = 'earlyBird' | 'nightOwl' | 'lightSleeper' | 'heavySleeper';

export class SleepGenetics {
  public readonly energyDepletionRate: number;
  public readonly sleepEfficiency: number;
  public readonly preferredSleepTime: number;
  public readonly sleepDuration: number;

  constructor(data: SleepGeneticsData) {
    // Validate ranges
    if (data.energyDepletionRate < 0.8 || data.energyDepletionRate > 1.2) {
      throw new Error('energyDepletionRate must be between 0.8 and 1.2');
    }
    if (data.sleepEfficiency < 0.8 || data.sleepEfficiency > 1.2) {
      throw new Error('sleepEfficiency must be between 0.8 and 1.2');
    }
    if (data.preferredSleepTime < 19 || data.preferredSleepTime > 23) {
      throw new Error('preferredSleepTime must be between 19 and 23');
    }
    if (data.sleepDuration < 6 || data.sleepDuration > 9) {
      throw new Error('sleepDuration must be between 6 and 9');
    }

    this.energyDepletionRate = data.energyDepletionRate;
    this.sleepEfficiency = data.sleepEfficiency;
    this.preferredSleepTime = data.preferredSleepTime;
    this.sleepDuration = data.sleepDuration;
  }

  /**
   * Generate random sleep genetics within normal ranges
   */
  public static generateRandom(): SleepGenetics {
    return new SleepGenetics({
      energyDepletionRate: 0.8 + Math.random() * 0.4, // 0.8-1.2
      sleepEfficiency: 0.8 + Math.random() * 0.4,      // 0.8-1.2
      preferredSleepTime: 19 + Math.random() * 4,      // 19-23
      sleepDuration: 6 + Math.random() * 3,            // 6-9
    });
  }

  /**
   * Inherit sleep genetics from two parents with variation
   */
  public static inherit(parent1: SleepGenetics, parent2: SleepGenetics): SleepGenetics {
    // Average parents with some random variance (-10% to +10%)
    const variance = () => 0.9 + Math.random() * 0.2;

    const energyDepletionRate = this.clamp(
      ((parent1.energyDepletionRate + parent2.energyDepletionRate) / 2) * variance(),
      0.8,
      1.2
    );

    const sleepEfficiency = this.clamp(
      ((parent1.sleepEfficiency + parent2.sleepEfficiency) / 2) * variance(),
      0.8,
      1.2
    );

    const preferredSleepTime = this.clamp(
      ((parent1.preferredSleepTime + parent2.preferredSleepTime) / 2) + (Math.random() * 2 - 1),
      19,
      23
    );

    const sleepDuration = this.clamp(
      ((parent1.sleepDuration + parent2.sleepDuration) / 2) + (Math.random() * 1 - 0.5),
      6,
      9
    );

    return new SleepGenetics({
      energyDepletionRate,
      sleepEfficiency,
      preferredSleepTime,
      sleepDuration,
    });
  }

  /**
   * Inherit with epigenetic factors (parent's life quality affects child)
   */
  public static inheritWithEpigenetics(
    parent1: SleepGenetics,
    parent2: SleepGenetics,
    epigenetics: [SleepEpigenetics, SleepEpigenetics]
  ): SleepGenetics {
    // Validate epigenetics data
    for (const epi of epigenetics) {
      if (epi.chronicFatigue < 0 || epi.chronicFatigue > 100) {
        throw new Error('chronicFatigue must be between 0 and 100');
      }
    }

    // Start with basic inheritance
    const baseGenetics = this.inherit(parent1, parent2);

    // Calculate average parent fatigue
    const avgFatigue = (epigenetics[0].chronicFatigue + epigenetics[1].chronicFatigue) / 2;

    let sleepDuration = baseGenetics.sleepDuration;
    let sleepEfficiency = baseGenetics.sleepEfficiency;

    // Parents chronically tired (< 40 avg energy) → child needs more sleep
    if (avgFatigue < 40) {
      sleepDuration = this.clamp(sleepDuration * 1.1, 6, 9);
      sleepEfficiency = this.clamp(sleepEfficiency * 0.9, 0.8, 1.2);
    }
    // Parents well-rested (> 70 avg energy) → child more efficient
    else if (avgFatigue > 70) {
      sleepEfficiency = this.clamp(sleepEfficiency * 1.1, 0.8, 1.2);
    }

    return new SleepGenetics({
      energyDepletionRate: baseGenetics.energyDepletionRate,
      sleepEfficiency,
      preferredSleepTime: baseGenetics.preferredSleepTime,
      sleepDuration,
    });
  }

  /**
   * Create genetics for specific sleep archetype
   */
  public static createArchetype(archetype: SleepArchetype): SleepGenetics {
    switch (archetype) {
      case 'earlyBird':
        return new SleepGenetics({
          energyDepletionRate: 1.0,
          sleepEfficiency: 1.1,
          preferredSleepTime: 20,
          sleepDuration: 6.5, // Wakes early
        });

      case 'nightOwl':
        return new SleepGenetics({
          energyDepletionRate: 1.0,
          sleepEfficiency: 0.9,
          preferredSleepTime: 23,
          sleepDuration: 7.5, // Sleeps in
        });

      case 'lightSleeper':
        return new SleepGenetics({
          energyDepletionRate: 1.0,
          sleepEfficiency: 1.15, // High efficiency, needs less
          preferredSleepTime: 21,
          sleepDuration: 6.5,
        });

      case 'heavySleeper':
        return new SleepGenetics({
          energyDepletionRate: 1.0,
          sleepEfficiency: 0.85, // Low efficiency, needs more
          preferredSleepTime: 21,
          sleepDuration: 8.5,
        });

      default:
        throw new Error(`Unknown sleep archetype: ${archetype}`);
    }
  }

  /**
   * Clamp value between min and max
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
