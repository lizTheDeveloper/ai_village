import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { WeatherComponent } from '../components/WeatherComponent.js';
import type { WeatherType } from '../components/WeatherComponent.js';
import type { Season, TimeComponent } from './TimeSystem.js';
import { STAGGER } from '../ecs/SystemThrottleConfig.js';

type WeatherWeights = Record<WeatherType, number>;

/**
 * Biome × Season weather probability weights.
 *
 * Scientific basis: Hadley cell atmospheric circulation determines moisture by latitude
 * (Trenberth et al. 2009). Biome type is a proxy for Hadley-cell position.
 * Seasonal variation follows insolation changes (Milanković 1941):
 * - Equatorial biomes: high rain year-round (ITCZ convergence)
 * - Subtropical: dry year-round (Hadley subsidence)
 * - Savanna: pronounced dry/wet monsoon character
 * - Temperate: four distinct seasons
 * - Polar/boreal: cold-dominated, mostly snow
 */
const BIOME_SEASON_WEATHER_WEIGHTS: Record<string, Record<Season, WeatherWeights>> = {
  // --- Equatorial: hot, wet year-round ---
  jungle: {
    spring: { clear: 10, rain: 55, storm: 25, snow: 0,  fog: 10 },
    summer: { clear: 15, rain: 45, storm: 30, snow: 0,  fog: 10 },
    fall:   { clear: 10, rain: 55, storm: 25, snow: 0,  fog: 10 },
    winter: { clear: 20, rain: 50, storm: 20, snow: 0,  fog: 10 },
  },
  wetland: {
    spring: { clear: 15, rain: 50, storm: 20, snow: 0,  fog: 15 },
    summer: { clear: 25, rain: 45, storm: 20, snow: 0,  fog: 10 },
    fall:   { clear: 15, rain: 50, storm: 20, snow: 0,  fog: 15 },
    winter: { clear: 20, rain: 45, storm: 15, snow: 0,  fog: 20 },
  },
  // --- Subtropical: hot and dry, small seasonal variation ---
  desert: {
    spring: { clear: 80, rain: 10, storm: 5,  snow: 0,  fog: 5  },
    summer: { clear: 85, rain: 5,  storm: 5,  snow: 0,  fog: 5  },
    fall:   { clear: 80, rain: 10, storm: 5,  snow: 0,  fog: 5  },
    winter: { clear: 75, rain: 15, storm: 5,  snow: 0,  fog: 5  },
  },
  scrubland: {
    spring: { clear: 55, rain: 25, storm: 10, snow: 0,  fog: 10 },
    summer: { clear: 65, rain: 15, storm: 10, snow: 0,  fog: 10 },
    fall:   { clear: 55, rain: 25, storm: 10, snow: 0,  fog: 10 },
    winter: { clear: 50, rain: 30, storm: 8,  snow: 2,  fog: 10 },
  },
  // --- Savanna: dramatic dry/wet seasons (monsoon character) ---
  savanna: {
    spring: { clear: 30, rain: 45, storm: 15, snow: 0,  fog: 10 },
    summer: { clear: 20, rain: 50, storm: 20, snow: 0,  fog: 10 },
    fall:   { clear: 45, rain: 30, storm: 10, snow: 0,  fog: 15 },
    winter: { clear: 70, rain: 15, storm: 5,  snow: 0,  fog: 10 },
  },
  // --- Temperate: four distinct seasons ---
  plains: {
    spring: { clear: 35, rain: 35, storm: 15, snow: 5,  fog: 10 },
    summer: { clear: 45, rain: 30, storm: 15, snow: 0,  fog: 10 },
    fall:   { clear: 35, rain: 30, storm: 10, snow: 10, fog: 15 },
    winter: { clear: 30, rain: 15, storm: 10, snow: 35, fog: 10 },
  },
  forest: {
    spring: { clear: 30, rain: 40, storm: 10, snow: 5,  fog: 15 },
    summer: { clear: 40, rain: 35, storm: 10, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 30, storm: 10, snow: 10, fog: 20 },
    winter: { clear: 25, rain: 20, storm: 10, snow: 30, fog: 15 },
  },
  woodland: {
    spring: { clear: 35, rain: 35, storm: 10, snow: 5,  fog: 15 },
    summer: { clear: 45, rain: 30, storm: 10, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 30, storm: 10, snow: 15, fog: 15 },
    winter: { clear: 25, rain: 20, storm: 10, snow: 30, fog: 15 },
  },
  foothills: {
    spring: { clear: 30, rain: 35, storm: 15, snow: 10, fog: 10 },
    summer: { clear: 40, rain: 30, storm: 15, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 25, storm: 10, snow: 20, fog: 15 },
    winter: { clear: 25, rain: 15, storm: 10, snow: 40, fog: 10 },
  },
  mountains: {
    spring: { clear: 25, rain: 20, storm: 20, snow: 25, fog: 10 },
    summer: { clear: 35, rain: 25, storm: 20, snow: 5,  fog: 15 },
    fall:   { clear: 25, rain: 15, storm: 15, snow: 35, fog: 10 },
    winter: { clear: 20, rain: 10, storm: 15, snow: 50, fog: 5  },
  },
  // --- Polar/boreal: cold-dominated ---
  taiga: {
    spring: { clear: 30, rain: 20, storm: 10, snow: 30, fog: 10 },
    summer: { clear: 45, rain: 30, storm: 10, snow: 5,  fog: 10 },
    fall:   { clear: 25, rain: 15, storm: 10, snow: 40, fog: 10 },
    winter: { clear: 25, rain: 5,  storm: 10, snow: 55, fog: 5  },
  },
  tundra: {
    spring: { clear: 35, rain: 15, storm: 10, snow: 35, fog: 5  },
    summer: { clear: 50, rain: 25, storm: 10, snow: 5,  fog: 10 },
    fall:   { clear: 25, rain: 10, storm: 10, snow: 50, fog: 5  },
    winter: { clear: 25, rain: 2,  storm: 8,  snow: 62, fog: 3  },
  },
  glacier: {
    spring: { clear: 30, rain: 5,  storm: 10, snow: 50, fog: 5  },
    summer: { clear: 40, rain: 10, storm: 10, snow: 35, fog: 5  },
    fall:   { clear: 25, rain: 5,  storm: 10, snow: 55, fog: 5  },
    winter: { clear: 20, rain: 0,  storm: 10, snow: 65, fog: 5  },
  },
};

/** Default weights for biomes not in the table (temperate character). */
const DEFAULT_WEATHER_WEIGHTS: Record<Season, WeatherWeights> = {
  spring: { clear: 35, rain: 35, storm: 10, snow: 5,  fog: 15 },
  summer: { clear: 50, rain: 30, storm: 10, snow: 0,  fog: 10 },
  fall:   { clear: 35, rain: 25, storm: 10, snow: 15, fog: 15 },
  winter: { clear: 30, rain: 15, storm: 10, snow: 35, fog: 10 },
};

/**
 * Season-aware weather temperature modifiers (°C).
 *
 * Clear skies in summer = more solar insolation (+2°C); snow in winter = albedo feedback
 * strongly suppresses warming (Budyko 1969: fresh snow albedo ~0.8).
 */
const WEATHER_TEMP_MODIFIERS: Record<WeatherType, Record<Season, number>> = {
  clear:  { spring: +1, summer: +2, fall:  0,  winter: -1 },
  rain:   { spring: -1, summer: -2, fall: -2,  winter: -1 },
  storm:  { spring: -2, summer: -3, fall: -3,  winter: -2 },
  snow:   { spring: -3, summer: -4, fall: -4,  winter: -5 },
  fog:    { spring: -1, summer: -1, fall: -2,  winter: -1 },
};

/**
 * WeatherSystem - Weather pattern simulation
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides time tracking for weather duration and transitions
 */
export class WeatherSystem extends BaseSystem {
  public readonly id: SystemId = CT.Weather;
  public readonly priority: number = 5; // Run early, before temperature system
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Weather];
  // Only run when weather components exist (O(1) activation check)
  public readonly activationComponents = [CT.Weather] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_A; // Stagger group A (tick 0, 100, 200...)

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time tracking for weather transitions
   */
  public readonly dependsOn = ['time'] as const;

  private readonly WEATHER_TRANSITION_CHANCE = 0.01; // 1% chance per update to transition
  private readonly MIN_WEATHER_DURATION = 60; // Minimum 60 seconds per weather state
  private previousWeatherType: WeatherType | null = null;
  private timeEntityId: string | null = null; // Cache singleton for performance

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const weather = impl.getComponent<WeatherComponent>(CT.Weather);

      // Skip entities without weather component
      if (!weather) {
        continue;
      }

      // Tick down duration
      const newDuration = Math.max(0, weather.duration - ctx.deltaTime);

      impl.updateComponent<WeatherComponent>(CT.Weather, (current) => ({
        ...current,
        duration: newDuration,
      }));

      // Check if weather should transition
      if (newDuration <= 0 || Math.random() < this.WEATHER_TRANSITION_CHANCE * ctx.deltaTime) {
        this.transitionWeather(ctx.world, entity, impl);
      }
    }
  }

  /**
   * Transition to a new weather type using biome × season weights.
   */
  private transitionWeather(world: World, entity: Entity, impl: EntityImpl): void {
    const currentWeather = impl.getComponent<WeatherComponent>(CT.Weather)!;
    const season = this.getCurrentSeason(world);
    const biome = this.getWorldBiome(world);
    const newWeatherType = this.selectNewWeatherType(currentWeather.weatherType, season, biome);

    const weatherMovement: Record<WeatherType, number> = {
      clear: 1.0,
      rain: 0.8,
      storm: 0.6,
      snow: 0.7,
      fog: 0.9,
    };

    const newIntensity = this.selectIntensity(newWeatherType);
    const newDuration = this.selectDuration();
    const newTempModifier = WEATHER_TEMP_MODIFIERS[newWeatherType][season];

    impl.updateComponent<WeatherComponent>(CT.Weather, (current) => ({
      ...current,
      weatherType: newWeatherType,
      intensity: newIntensity,
      duration: newDuration,
      tempModifier: newTempModifier,
      movementModifier: 1.0 - (1.0 - weatherMovement[newWeatherType]) * newIntensity,
    }));

    // Emit weather change event if type actually changed
    if (this.previousWeatherType !== newWeatherType) {
      world.eventBus.emit({
        type: 'weather:changed',
        source: entity.id,
        data: {
          oldWeather: this.previousWeatherType || 'clear',
          weatherType: newWeatherType,
          intensity: newIntensity,
        },
      });
      this.previousWeatherType = newWeatherType;
    }
  }

  /**
   * Select a new weather type using biome × season probability weights.
   * Reduces the chance of the same type repeating.
   */
  private selectNewWeatherType(currentType: WeatherType, season: Season, biome: string | undefined): WeatherType {
    const biomeWeights = biome ? BIOME_SEASON_WEATHER_WEIGHTS[biome] : undefined;
    const baseWeights = biomeWeights ? biomeWeights[season] : DEFAULT_WEATHER_WEIGHTS[season];

    // Copy weights so we can mutate (reduce repeat chance)
    const weights: Record<WeatherType, number> = { ...baseWeights };

    // Reduce chance of same weather type repeating
    weights[currentType] *= 0.5;

    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return type as WeatherType;
      }
    }

    return 'clear'; // Fallback
  }

  /**
   * Get the current season from the cached TimeComponent singleton.
   */
  private getCurrentSeason(world: World): Season {
    if (!this.timeEntityId) {
      const timeEntities = world.query().with(CT.Time).executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0]!.id;
      }
    }

    if (this.timeEntityId) {
      const timeEntity = world.getEntity(this.timeEntityId);
      if (timeEntity) {
        const timeComp = (timeEntity as EntityImpl).getComponent<TimeComponent>(CT.Time);
        if (timeComp?.season) {
          return timeComp.season;
        }
      } else {
        this.timeEntityId = null;
      }
    }

    return 'spring'; // Fallback
  }

  /**
   * Get the world's primary biome by sampling the origin tile.
   */
  private getWorldBiome(world: World): string | undefined {
    if (typeof world.getTileAt === 'function') {
      const tile = world.getTileAt(0, 0);
      return tile?.biome ?? undefined;
    }
    return undefined;
  }

  /**
   * Select intensity for weather type
   */
  private selectIntensity(weatherType: WeatherType): number {
    if (weatherType === 'clear') {
      return 0; // Clear weather has no intensity
    }

    // Random intensity between 0.3 and 1.0
    return 0.3 + Math.random() * 0.7;
  }

  /**
   * Select duration for new weather
   */
  private selectDuration(): number {
    // Random duration between 60 and 300 seconds (1-5 minutes)
    return this.MIN_WEATHER_DURATION + Math.random() * 240;
  }
}
