/**
 * DivineWeatherControl - Phase 9: World Impact
 *
 * Allows deities to control and modify weather.
 * Weather powers include:
 * - Summoning rain/storms
 * - Clearing weather
 * - Creating drought
 * - Summoning lightning
 * - Controlling temperature
 * - Creating seasonal changes
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';

// ============================================================================
// Divine Weather Types
// ============================================================================

export interface DivineWeatherEvent {
  id: string;

  /** Deity who created this weather */
  deityId: string;

  /** Weather type */
  type: DivineWeatherType;

  /** Location (center) */
  location: { x: number; y: number };

  /** Radius of effect */
  radius: number;

  /** When started */
  startedAt: number;

  /** Duration in ticks (0 = instant) */
  duration: number;

  /** Intensity (0-1) */
  intensity: number;

  /** Belief cost */
  cost: number;

  /** Purpose */
  purpose?: WeatherPurpose;

  /** Status */
  status: 'active' | 'completed' | 'fading';
}

export type DivineWeatherType =
  | 'gentle_rain'        // Light rain, helps crops
  | 'heavy_rain'         // Heavy rain, flooding risk
  | 'thunderstorm'       // Rain with lightning
  | 'clear_skies'        // Clear all weather
  | 'drought'            // Stop all rain
  | 'snow'               // Snowfall
  | 'hail'               // Hailstorm (destructive)
  | 'fog'                // Thick fog
  | 'wind'               // Strong winds
  | 'tornado'            // Destructive tornado
  | 'aurora'             // Divine light show
  | 'divine_blessing';   // Perfect weather

export type WeatherPurpose =
  | 'blessing'           // Help believers
  | 'punishment'         // Punish sinners
  | 'demonstration'      // Show divine power
  | 'natural_cycle'      // Maintain balance
  | 'war';               // Aid in conflict

// ============================================================================
// Weather Configuration
// ============================================================================

export interface WeatherControlConfig {
  /** How often to update weather events (ticks) */
  updateInterval: number;

  /** Base costs for each weather type */
  weatherCosts: Record<DivineWeatherType, number>;

  /** Minimum belief required */
  minBeliefRequired: number;
}

export const DEFAULT_WEATHER_CONTROL_CONFIG: WeatherControlConfig = {
  updateInterval: 100, // ~5 seconds at 20 TPS
  minBeliefRequired: 500,
  weatherCosts: {
    gentle_rain: 200,
    heavy_rain: 400,
    thunderstorm: 600,
    clear_skies: 300,
    drought: 500,
    snow: 350,
    hail: 700,
    fog: 250,
    wind: 300,
    tornado: 1500,
    aurora: 400,
    divine_blessing: 1000,
  },
};

// ============================================================================
// DivineWeatherControl
// ============================================================================

export class DivineWeatherControl implements System {
  public readonly id = 'DivineWeatherControl';
  public readonly name = 'DivineWeatherControl';
  public readonly priority = 72;
  public readonly requiredComponents = [];

  private config: WeatherControlConfig;
  private weatherEvents: Map<string, DivineWeatherEvent> = new Map();
  private lastUpdate: number = 0;
  private events!: SystemEventManager;

  constructor(config: Partial<WeatherControlConfig> = {}) {
    this.config = {
      ...DEFAULT_WEATHER_CONTROL_CONFIG,
      ...config,
      weatherCosts: { ...DEFAULT_WEATHER_CONTROL_CONFIG.weatherCosts, ...config.weatherCosts },
    };
  }

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);
  }

  cleanup(): void {
    this.events.cleanup();
  }

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Process active weather events
    this.processWeatherEvents(world, currentTick);
  }

  /**
   * Summon divine weather
   */
  summonWeather(
    deityId: string,
    world: World,
    type: DivineWeatherType,
    location: { x: number; y: number },
    radius: number = 20,
    intensity: number = 1.0,
    duration: number = 1200, // ~1 minute default
    purpose?: WeatherPurpose
  ): DivineWeatherEvent | null {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Calculate cost
    const cost = this.calculateWeatherCost(type, radius, intensity, duration);

    // Check belief
    if (!deity.spendBelief(cost)) {
      return null;
    }

    // Create weather event
    const weatherEvent: DivineWeatherEvent = {
      id: `weather_${Date.now()}`,
      deityId,
      type,
      location,
      radius,
      startedAt: world.tick,
      duration,
      intensity,
      cost,
      purpose,
      status: 'active',
    };

    this.weatherEvents.set(weatherEvent.id, weatherEvent);

    // Apply weather effects
    this.applyWeatherEffects(world, weatherEvent);

    // Emit divine weather summoned event
    this.events.emitGeneric('divine_weather_summoned', {
      weatherEventId: weatherEvent.id,
      deityId,
      weatherType: type,
      location,
      radius,
      intensity,
      duration,
      purpose,
    });

    return weatherEvent;
  }

  /**
   * Calculate weather cost
   */
  private calculateWeatherCost(
    type: DivineWeatherType,
    radius: number,
    intensity: number,
    duration: number
  ): number {
    const baseCost = this.config.weatherCosts[type];

    // Scale by radius
    const radiusCost = baseCost * (radius / 20);

    // Scale by intensity
    const intensityCost = radiusCost * intensity;

    // Scale by duration (longer = more expensive)
    const durationMultiplier = 1 + (duration / 1200) * 0.5;

    return Math.floor(intensityCost * durationMultiplier);
  }

  /**
   * Apply weather effects to the world
   */
  private applyWeatherEffects(_world: World, weatherEvent: DivineWeatherEvent): void {
    // In full implementation, would modify weather system
    // For now, just track the event

    // Example of what would happen:
    switch (weatherEvent.type) {
      case 'gentle_rain':
        // Increase soil moisture in radius
        // Boost crop growth
        break;

      case 'thunderstorm':
        // Heavy rain + lightning strikes
        // Possible fire from lightning
        break;

      case 'drought':
        // Decrease soil moisture
        // Slow crop growth
        break;

      case 'tornado':
        // Massive destruction in path
        // Destroy buildings/trees
        break;

      case 'divine_blessing':
        // Perfect weather for crops
        // Happiness boost for believers
        break;

      default:
        break;
    }
  }

  /**
   * Process active weather events
   */
  private processWeatherEvents(_world: World, currentTick: number): void {
    for (const event of this.weatherEvents.values()) {
      if (event.status !== 'active') continue;

      // Check if event should end
      if (event.duration > 0) {
        const elapsed = currentTick - event.startedAt;

        if (elapsed >= event.duration) {
          event.status = 'fading';
          // In full implementation, would fade out the weather
        }
      }
    }
  }

  /**
   * Strike with lightning
   */
  strikeLightning(
    deityId: string,
    world: World,
    location: { x: number; y: number },
    intensity: number = 1.0
  ): boolean {
    // Quick weather event for a single lightning strike
    const weather = this.summonWeather(
      deityId,
      world,
      'thunderstorm',
      location,
      5, // Small radius
      intensity,
      1, // Instant
      'punishment'
    );

    return weather !== null;
  }

  /**
   * Bless crops with rain
   */
  blessCrops(
    deityId: string,
    world: World,
    location: { x: number; y: number },
    radius: number = 30
  ): boolean {
    const weather = this.summonWeather(
      deityId,
      world,
      'gentle_rain',
      location,
      radius,
      0.8,
      2400, // ~2 minutes
      'blessing'
    );

    return weather !== null;
  }

  /**
   * Create divine display
   */
  createDivineDisplay(
    deityId: string,
    world: World,
    location: { x: number; y: number }
  ): boolean {
    const weather = this.summonWeather(
      deityId,
      world,
      'aurora',
      location,
      50, // Large radius
      1.0,
      3600, // ~3 minutes
      'demonstration'
    );

    return weather !== null;
  }

  /**
   * Get weather event
   */
  getWeatherEvent(eventId: string): DivineWeatherEvent | undefined {
    return this.weatherEvents.get(eventId);
  }

  /**
   * Get all weather events by a deity
   */
  getWeatherEventsBy(deityId: string): DivineWeatherEvent[] {
    return Array.from(this.weatherEvents.values())
      .filter(e => e.deityId === deityId);
  }

  /**
   * Get active weather events
   */
  getActiveWeatherEvents(): DivineWeatherEvent[] {
    return Array.from(this.weatherEvents.values())
      .filter(e => e.status === 'active');
  }

  /**
   * Get weather events in area
   */
  getWeatherEventsInArea(
    location: { x: number; y: number },
    radius: number
  ): DivineWeatherEvent[] {
    return Array.from(this.weatherEvents.values()).filter(e => {
      const dx = e.location.x - location.x;
      const dy = e.location.y - location.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= radius + e.radius;
    });
  }
}
