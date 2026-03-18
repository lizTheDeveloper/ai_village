/**
 * BiomeWeatherEventSystem - Biome-specific extreme weather events
 *
 * Triggers special weather events tied to biome type and season:
 * - Forest: canopy storms (spring/summer), leaf storms (fall)
 * - Desert: sandstorms (summer), dust devils (spring)
 * - Mountains: blizzards (winter), rockslide rain (spring)
 * - Plains: thunderstorms (summer), flash floods (spring)
 * - Ocean/River: coastal storms (fall/winter), gales (spring)
 *
 * When an event fires, it intensifies the WeatherComponent and emits
 * 'biome:weather_event'. Effects persist for the event duration.
 *
 * Priority: 7 (runs after WeatherSystem 5, before TemperatureSystem 14)
 * Throttle: 300 ticks (~15 seconds)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TimeComponent } from './TimeSystem.js';
import type { WeatherComponent } from '../components/WeatherComponent.js';

interface BiomeWeatherEvent {
  eventType: string;
  seasons: string[];           // Which seasons this event can occur in
  probability: number;         // Per-check probability (0-1)
  severity: number;            // 0-1
  duration: number;            // seconds
  movementModifier: number;    // 0-1 (replaces current)
  temperatureOffset: number;   // °C
  weatherType: 'storm' | 'snow' | 'fog' | 'rain'; // Forces weather to this type
}

const BIOME_WEATHER_EVENTS: Record<string, BiomeWeatherEvent[]> = {
  forest: [
    { eventType: 'canopy_storm', seasons: ['spring', 'summer'], probability: 0.02, severity: 0.7, duration: 120, movementModifier: 0.4, temperatureOffset: -3, weatherType: 'storm' },
    { eventType: 'leaf_storm', seasons: ['fall'], probability: 0.03, severity: 0.5, duration: 90, movementModifier: 0.6, temperatureOffset: -2, weatherType: 'storm' },
    { eventType: 'forest_blizzard', seasons: ['winter'], probability: 0.025, severity: 0.8, duration: 180, movementModifier: 0.3, temperatureOffset: -8, weatherType: 'snow' },
  ],
  desert: [
    { eventType: 'sandstorm', seasons: ['summer', 'spring'], probability: 0.03, severity: 0.9, duration: 150, movementModifier: 0.2, temperatureOffset: 5, weatherType: 'fog' },
    { eventType: 'dust_devil', seasons: ['spring', 'fall'], probability: 0.04, severity: 0.4, duration: 45, movementModifier: 0.7, temperatureOffset: 3, weatherType: 'fog' },
    { eventType: 'desert_rain', seasons: ['winter'], probability: 0.015, severity: 0.6, duration: 60, movementModifier: 0.8, temperatureOffset: -2, weatherType: 'rain' },
  ],
  mountains: [
    { eventType: 'blizzard', seasons: ['winter', 'fall'], probability: 0.03, severity: 1.0, duration: 240, movementModifier: 0.2, temperatureOffset: -10, weatherType: 'snow' },
    { eventType: 'rockslide_rain', seasons: ['spring'], probability: 0.025, severity: 0.7, duration: 90, movementModifier: 0.5, temperatureOffset: -1, weatherType: 'storm' },
    { eventType: 'mountain_fog', seasons: ['fall', 'spring'], probability: 0.04, severity: 0.5, duration: 120, movementModifier: 0.6, temperatureOffset: -2, weatherType: 'fog' },
  ],
  plains: [
    { eventType: 'thunderstorm', seasons: ['summer', 'spring'], probability: 0.025, severity: 0.8, duration: 120, movementModifier: 0.4, temperatureOffset: -4, weatherType: 'storm' },
    { eventType: 'flash_flood', seasons: ['spring'], probability: 0.015, severity: 0.9, duration: 90, movementModifier: 0.3, temperatureOffset: -2, weatherType: 'storm' },
    { eventType: 'ice_storm', seasons: ['winter'], probability: 0.02, severity: 0.85, duration: 150, movementModifier: 0.25, temperatureOffset: -7, weatherType: 'snow' },
  ],
  ocean: [
    { eventType: 'coastal_storm', seasons: ['fall', 'winter'], probability: 0.03, severity: 0.9, duration: 180, movementModifier: 0.3, temperatureOffset: -3, weatherType: 'storm' },
    { eventType: 'sea_gale', seasons: ['spring', 'fall'], probability: 0.035, severity: 0.7, duration: 120, movementModifier: 0.4, temperatureOffset: -2, weatherType: 'storm' },
    { eventType: 'dense_sea_fog', seasons: ['summer', 'spring'], probability: 0.04, severity: 0.6, duration: 150, movementModifier: 0.5, temperatureOffset: -1, weatherType: 'fog' },
  ],
  river: [
    { eventType: 'flash_flood', seasons: ['spring', 'summer'], probability: 0.025, severity: 0.8, duration: 90, movementModifier: 0.35, temperatureOffset: -2, weatherType: 'storm' },
    { eventType: 'river_fog', seasons: ['fall', 'spring'], probability: 0.05, severity: 0.5, duration: 120, movementModifier: 0.6, temperatureOffset: -1, weatherType: 'fog' },
    { eventType: 'ice_river', seasons: ['winter'], probability: 0.03, severity: 0.7, duration: 180, movementModifier: 0.4, temperatureOffset: -6, weatherType: 'snow' },
  ],
};

export class BiomeWeatherEventSystem extends BaseSystem {
  public readonly id: SystemId = 'biome_weather_event';
  public readonly priority: number = 7; // After WeatherSystem (5), before TemperatureSystem (14)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Weather];
  public readonly activationComponents = [CT.Weather] as const;
  protected readonly throttleInterval = 300; // ~15 seconds

  public readonly dependsOn = ['time', CT.Weather] as const;

  private timeEntityId: string | null = null;

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const season = this.getCurrentSeason(world);
    const biome = this.getWorldBiome(world);

    // Get candidate events for this biome + season
    const biomeEvents = BIOME_WEATHER_EVENTS[biome] ?? [];
    const candidateEvents = biomeEvents.filter(e => e.seasons.includes(season));

    if (candidateEvents.length === 0) {
      return;
    }

    // Roll probability for each candidate; fire the first one that triggers
    let firedEvent: BiomeWeatherEvent | null = null;
    for (const event of candidateEvents) {
      if (Math.random() < event.probability) {
        firedEvent = event;
        break;
      }
    }

    if (!firedEvent) {
      return;
    }

    const evt = firedEvent;

    // Find the first weather entity from active entities and update it
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const weather = impl.getComponent<WeatherComponent>(CT.Weather);
      if (!weather) {
        continue;
      }

      impl.updateComponent<WeatherComponent>(CT.Weather, (current) => ({
        ...current,
        weatherType: evt.weatherType,
        intensity: evt.severity,
        duration: evt.duration,
        movementModifier: evt.movementModifier,
        tempModifier: evt.temperatureOffset,
      }));

      ctx.emit('biome:weather_event', {
        biome,
        eventType: evt.eventType,
        severity: evt.severity,
        duration: evt.duration,
        movementModifier: evt.movementModifier,
        temperatureOffset: evt.temperatureOffset,
      }, entity.id);

      // Only one event per check, and only update the first weather entity
      break;
    }
  }

  /**
   * Get the current season from the cached TimeComponent singleton.
   */
  private getCurrentSeason(world: World): string {
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

    return 'spring';
  }

  /**
   * Get the world's primary biome by sampling the origin tile.
   */
  private getWorldBiome(world: World): string {
    if (typeof world.getTileAt === 'function') {
      const tile = world.getTileAt(0, 0);
      return tile?.biome ?? 'plains';
    }
    return 'plains';
  }
}
