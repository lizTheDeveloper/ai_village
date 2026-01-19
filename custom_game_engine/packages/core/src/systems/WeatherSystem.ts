import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { WeatherComponent } from '../components/WeatherComponent.js';
import type { WeatherType } from '../components/WeatherComponent.js';

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
   * Transition to a new weather type
   */
  private transitionWeather(world: World, entity: Entity, impl: EntityImpl): void {
    const currentWeather = impl.getComponent<WeatherComponent>(CT.Weather)!;
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

    impl.updateComponent<WeatherComponent>(CT.Weather, (current) => ({
      ...current,
      weatherType: newWeatherType,
      intensity: newIntensity,
      duration: newDuration,
      movementModifier: 1.0 - (1.0 - defaults.movementModifier) * newIntensity,
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
