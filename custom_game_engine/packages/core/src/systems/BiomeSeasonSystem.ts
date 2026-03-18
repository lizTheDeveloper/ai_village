/**
 * BiomeSeasonSystem - Seasonal condition variation per biome
 *
 * Makes biomes feel alive by shifting resource availability, animal activity,
 * and temperature with the seasons. Forest winters are lean; desert summers brutal.
 *
 * Emits 'biome:season_conditions_changed' when season changes.
 * Other systems subscribe to adjust behavior (plant growth, animal activity, etc.)
 *
 * Priority: 16 (after WeatherSystem 5, TemperatureSystem 14)
 * Throttle: 200 ticks (~10 seconds) - only meaningful on season change
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TimeComponent } from './TimeSystem.js';
import { STAGGER } from '../ecs/SystemThrottleConfig.js';

type BiomeSeasonConditions = {
  foodMultiplier: number;
  waterMultiplier: number;
  temperatureOffset: number;
  animalActivityModifier: number;
};

const BIOME_SEASON_CONDITIONS: Record<string, Record<string, BiomeSeasonConditions>> = {
  forest: {
    spring: { foodMultiplier: 1.2, waterMultiplier: 1.3, temperatureOffset: 0, animalActivityModifier: 1.3 },
    summer: { foodMultiplier: 1.5, waterMultiplier: 1.0, temperatureOffset: 2, animalActivityModifier: 1.2 },
    fall:   { foodMultiplier: 1.3, waterMultiplier: 1.1, temperatureOffset: -2, animalActivityModifier: 1.1 },
    winter: { foodMultiplier: 0.3, waterMultiplier: 0.8, temperatureOffset: -5, animalActivityModifier: 0.5 },
  },
  desert: {
    spring: { foodMultiplier: 0.8, waterMultiplier: 0.4, temperatureOffset: 5, animalActivityModifier: 0.9 },
    summer: { foodMultiplier: 0.4, waterMultiplier: 0.2, temperatureOffset: 12, animalActivityModifier: 0.6 },
    fall:   { foodMultiplier: 0.7, waterMultiplier: 0.4, temperatureOffset: 3, animalActivityModifier: 0.8 },
    winter: { foodMultiplier: 0.6, waterMultiplier: 0.5, temperatureOffset: -2, animalActivityModifier: 0.7 },
  },
  mountains: {
    spring: { foodMultiplier: 0.9, waterMultiplier: 1.5, temperatureOffset: -3, animalActivityModifier: 1.0 },
    summer: { foodMultiplier: 1.2, waterMultiplier: 1.0, temperatureOffset: 0, animalActivityModifier: 1.2 },
    fall:   { foodMultiplier: 0.8, waterMultiplier: 0.8, temperatureOffset: -4, animalActivityModifier: 0.8 },
    winter: { foodMultiplier: 0.2, waterMultiplier: 0.5, temperatureOffset: -8, animalActivityModifier: 0.3 },
  },
  plains: {
    spring: { foodMultiplier: 1.3, waterMultiplier: 1.2, temperatureOffset: 0, animalActivityModifier: 1.2 },
    summer: { foodMultiplier: 1.1, waterMultiplier: 0.7, temperatureOffset: 3, animalActivityModifier: 1.0 },
    fall:   { foodMultiplier: 1.0, waterMultiplier: 0.9, temperatureOffset: -1, animalActivityModifier: 1.0 },
    winter: { foodMultiplier: 0.5, waterMultiplier: 0.8, temperatureOffset: -4, animalActivityModifier: 0.7 },
  },
  ocean: {
    spring: { foodMultiplier: 1.2, waterMultiplier: 2.0, temperatureOffset: 0, animalActivityModifier: 1.1 },
    summer: { foodMultiplier: 1.4, waterMultiplier: 2.0, temperatureOffset: 2, animalActivityModifier: 1.3 },
    fall:   { foodMultiplier: 1.1, waterMultiplier: 2.0, temperatureOffset: 0, animalActivityModifier: 1.0 },
    winter: { foodMultiplier: 0.7, waterMultiplier: 2.0, temperatureOffset: -1, animalActivityModifier: 0.8 },
  },
  river: {
    spring: { foodMultiplier: 1.4, waterMultiplier: 2.0, temperatureOffset: 0, animalActivityModifier: 1.2 },
    summer: { foodMultiplier: 1.3, waterMultiplier: 1.8, temperatureOffset: 1, animalActivityModifier: 1.1 },
    fall:   { foodMultiplier: 1.1, waterMultiplier: 1.5, temperatureOffset: -1, animalActivityModifier: 1.0 },
    winter: { foodMultiplier: 0.6, waterMultiplier: 1.2, temperatureOffset: -3, animalActivityModifier: 0.6 },
  },
};

/** Default fallback for unknown biomes */
const DEFAULT_SEASON_CONDITIONS: Record<string, BiomeSeasonConditions> = {
  spring: { foodMultiplier: 1.1, waterMultiplier: 1.1, temperatureOffset: 0, animalActivityModifier: 1.1 },
  summer: { foodMultiplier: 1.2, waterMultiplier: 0.9, temperatureOffset: 2, animalActivityModifier: 1.0 },
  fall:   { foodMultiplier: 1.0, waterMultiplier: 1.0, temperatureOffset: -1, animalActivityModifier: 0.9 },
  winter: { foodMultiplier: 0.5, waterMultiplier: 0.8, temperatureOffset: -3, animalActivityModifier: 0.6 },
};

export class BiomeSeasonSystem extends BaseSystem {
  public readonly id: SystemId = 'biome_season';
  public readonly priority: number = 16; // After WeatherSystem (5), TemperatureSystem (14)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Time];
  public readonly activationComponents = [CT.Time] as const;
  protected readonly throttleInterval = 200; // ~10 seconds
  protected readonly throttleOffset = STAGGER.VERY_SLOW_GROUP_B; // Spread load

  public readonly dependsOn = ['time', CT.Weather] as const;

  private timeEntityId: string | null = null;
  private lastSeason: string | null = null;

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Find the time entity from active entities (requiredComponents = [CT.Time])
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const timeComp = impl.getComponent<TimeComponent>(CT.Time);
      if (!timeComp) {
        continue;
      }

      // Cache the time entity ID
      if (!this.timeEntityId) {
        this.timeEntityId = entity.id;
      }

      const season = timeComp.season ?? 'spring';

      // Only emit when season has actually changed
      if (season === this.lastSeason) {
        return;
      }

      // Get world biome from origin tile
      const biome = this.getWorldBiome(world);

      // Look up conditions for this biome + season
      const biomeConditions = BIOME_SEASON_CONDITIONS[biome];
      const conditions = biomeConditions
        ? (biomeConditions[season] ?? DEFAULT_SEASON_CONDITIONS[season] ?? DEFAULT_SEASON_CONDITIONS['spring']!)
        : (DEFAULT_SEASON_CONDITIONS[season] ?? DEFAULT_SEASON_CONDITIONS['spring']!);

      if (!conditions) {
        throw new Error(`[biome_season] No conditions found for season: ${season}`);
      }

      ctx.emit('biome:season_conditions_changed', {
        biome,
        season,
        foodMultiplier: conditions.foodMultiplier,
        waterMultiplier: conditions.waterMultiplier,
        temperatureOffset: conditions.temperatureOffset,
        animalActivityModifier: conditions.animalActivityModifier,
      }, entity.id);

      this.lastSeason = season;

      // Only process one time entity (it's a singleton)
      break;
    }
  }

  /**
   * Get the world's primary biome by sampling the origin tile.
   */
  private getWorldBiome(world: World): string {
    if (typeof world.getTileAt === 'function') {
      const tile = world.getTileAt(0, 0);
      if (tile?.biome) {
        return tile.biome;
      }
    }
    return 'plains';
  }
}
