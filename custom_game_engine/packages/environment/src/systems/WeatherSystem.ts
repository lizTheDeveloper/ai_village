import type { SystemId, ComponentType, WeatherComponent, WeatherType } from '@ai-village/core';
import { ComponentType as CT, BaseSystem, type SystemContext, type ComponentAccessor } from '@ai-village/core';

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
  private readonly MIN_WEATHER_DURATION = 60; // Minimum 60 seconds per weather state
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

    // Weather type defaults from WeatherComponent spec
    const weatherDefaults: Record<WeatherType, { movementModifier: number }> = {
      clear: { movementModifier: 1.0 },
      rain: { movementModifier: 0.8 },
      storm: { movementModifier: 0.6 },
      snow: { movementModifier: 0.7 },
      fog: { movementModifier: 0.9 },
    };

    const defaults = weatherDefaults[newWeatherType];
    const newIntensity = this.selectIntensity(newWeatherType);
    const newDuration = this.selectDuration();

    comps.update(CT.Weather, (current: WeatherComponent) => ({
      ...current,
      weatherType: newWeatherType,
      intensity: newIntensity,
      duration: newDuration,
      movementModifier: 1.0 - (1.0 - defaults.movementModifier) * newIntensity,
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
    // Weight towards clear weather, with some randomness
    const weights: Record<WeatherType, number> = {
      clear: 50,
      rain: 25,
      snow: 15,
      storm: 10,
      fog: 10,
    };

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
