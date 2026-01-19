import type { SystemId, ComponentType, WeatherComponent, WeatherType } from '@ai-village/core';
import { ComponentType as CT, BaseSystem, type SystemContext, type ComponentAccessor } from '@ai-village/core';
import weatherPatternsData from '../../data/weather-patterns.json';

/**
 * Weather pattern data structure from JSON
 */
interface WeatherPatternData {
  id: WeatherType;
  displayName: string;
  description: string;
  movementModifier: number;
  temperatureModifier: number;
  defaultDuration: {
    min: number;
    max: number;
  };
  weight: number;
  intensityRange: {
    min: number;
    max: number;
  };
  soilMoistureBonus?: number;
}

/**
 * Load and validate weather patterns from JSON
 */
function loadWeatherPatterns(): Map<WeatherType, WeatherPatternData> {
  if (!Array.isArray(weatherPatternsData)) {
    throw new Error('Invalid weather patterns data: expected array');
  }

  const patterns = new Map<WeatherType, WeatherPatternData>();
  for (const pattern of weatherPatternsData) {
    if (!pattern.id || !pattern.movementModifier || pattern.weight === undefined) {
      throw new Error(`Invalid weather pattern data: ${JSON.stringify(pattern)}`);
    }
    patterns.set(pattern.id as WeatherType, pattern as WeatherPatternData);
  }

  return patterns;
}

// Load weather patterns at module initialization
const WEATHER_PATTERNS = loadWeatherPatterns();

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
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides time tracking for weather transitions
   */
  public readonly dependsOn = ['time'] as const;

  private readonly WEATHER_TRANSITION_CHANCE = 0.01; // 1% chance per update to transition
  private previousWeatherType: WeatherType | null = null;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const weather = comps.optional<WeatherComponent>(CT.Weather);
      if (!weather) continue;

      // Tick down duration
      const newDuration = Math.max(0, weather.duration - ctx.deltaTime);

      comps.update(CT.Weather, (current: WeatherComponent) => ({
        ...current,
        duration: newDuration,
      }));

      // Check if weather should transition
      if (newDuration <= 0 || Math.random() < this.WEATHER_TRANSITION_CHANCE * ctx.deltaTime) {
        this.transitionWeather(ctx, entity, comps);
      }
    }
  }

  /**
   * Transition to a new weather type
   */
  private transitionWeather(ctx: SystemContext, entity: any, comps: ComponentAccessor): void {
    const currentWeather = comps.optional<WeatherComponent>(CT.Weather);
    if (!currentWeather) return;
    const newWeatherType = this.selectNewWeatherType(currentWeather.weatherType);

    // Get weather pattern data from JSON
    const pattern = WEATHER_PATTERNS.get(newWeatherType);
    if (!pattern) {
      throw new Error(`Weather pattern not found for type: ${newWeatherType}`);
    }

    const newIntensity = this.selectIntensity(pattern);
    const newDuration = this.selectDuration(pattern);

    comps.update(CT.Weather, (current: WeatherComponent) => ({
      ...current,
      weatherType: newWeatherType,
      intensity: newIntensity,
      duration: newDuration,
      movementModifier: 1.0 - (1.0 - pattern.movementModifier) * newIntensity,
    }));

    // Emit weather change event if type actually changed
    if (this.previousWeatherType !== newWeatherType) {
      ctx.emit('weather:changed', {
        oldWeather: this.previousWeatherType || 'clear',
        weatherType: newWeatherType,
        intensity: newIntensity,
      }, entity.id);
      this.previousWeatherType = newWeatherType;
    }
  }

  /**
   * Select a new weather type (weighted random)
   */
  private selectNewWeatherType(currentType: WeatherType): WeatherType {
    // Build weights from JSON data
    const weights = new Map<WeatherType, number>();
    for (const [type, pattern] of WEATHER_PATTERNS.entries()) {
      weights.set(type, pattern.weight);
    }

    // Reduce chance of same weather type repeating
    const currentWeight = weights.get(currentType) || 0;
    weights.set(currentType, currentWeight * 0.5);

    const total = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;

    for (const [type, weight] of weights.entries()) {
      random -= weight;
      if (random <= 0) {
        return type;
      }
    }

    return 'clear'; // Fallback
  }

  /**
   * Select intensity for weather type based on pattern data
   */
  private selectIntensity(pattern: WeatherPatternData): number {
    const { min, max } = pattern.intensityRange;
    if (min === max) {
      return min; // Clear weather has no intensity
    }

    // Random intensity within the pattern's range
    return min + Math.random() * (max - min);
  }

  /**
   * Select duration for new weather based on pattern data
   */
  private selectDuration(pattern: WeatherPatternData): number {
    const { min, max } = pattern.defaultDuration;
    return min + Math.random() * (max - min);
  }
}
