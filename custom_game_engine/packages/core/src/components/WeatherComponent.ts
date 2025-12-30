import type { Component } from '../ecs/Component.js';
import type { WeatherType } from '../types/WeatherTypes.js';

// Re-export for backwards compatibility
export type { WeatherType };

export interface WeatherComponent extends Component {
  type: 'weather';
  weatherType: WeatherType;
  intensity: number;
  duration: number;
  tempModifier: number;
  movementModifier: number;
}

/**
 * Create a WeatherComponent with validation
 */
export function createWeatherComponent(
  weatherType: WeatherType,
  intensity: number,
  duration: number,
  tempModifier?: number,
  movementModifier?: number
): WeatherComponent {
  // Validate all required fields per CLAUDE.md - no silent fallbacks
  if (!weatherType) {
    throw new Error('WeatherComponent requires weatherType field');
  }
  if (intensity === undefined || intensity === null) {
    throw new Error('WeatherComponent requires intensity field');
  }
  if (duration === undefined || duration === null) {
    throw new Error('WeatherComponent requires duration field');
  }

  // Validate ranges
  if (intensity < 0 || intensity > 1) {
    throw new Error(`intensity must be between 0 and 1, got: ${intensity}`);
  }
  if (duration < 0) {
    throw new Error(`duration must be >= 0, got: ${duration}`);
  }

  // Validate weather type
  const validTypes: WeatherType[] = ['clear', 'rain', 'snow', 'storm', 'fog'];
  if (!validTypes.includes(weatherType)) {
    throw new Error(`Invalid weather type: ${weatherType}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Weather type defaults from spec (if not provided)
  const weatherDefaults: Record<WeatherType, { tempModifier: number; movementModifier: number }> = {
    clear: { tempModifier: 0, movementModifier: 1.0 },
    rain: { tempModifier: -3, movementModifier: 0.8 },
    snow: { tempModifier: -8, movementModifier: 0.7 },
    storm: { tempModifier: -5, movementModifier: 0.5 },
    fog: { tempModifier: -2, movementModifier: 0.9 },
  };

  const defaults = weatherDefaults[weatherType];
  const finalTempModifier = tempModifier !== undefined ? tempModifier : defaults.tempModifier;
  const finalMovementModifier = movementModifier !== undefined ? movementModifier : defaults.movementModifier;

  // Validate movement modifier
  if (finalMovementModifier < 0 || finalMovementModifier > 1) {
    throw new Error(`movementModifier must be between 0 and 1, got: ${finalMovementModifier}`);
  }

  return {
    type: 'weather',
    version: 1,
    weatherType,
    intensity,
    duration,
    tempModifier: finalTempModifier,
    movementModifier: finalMovementModifier,
  };
}

/**
 * Check if weather has expired
 */
export function hasExpired(weather: WeatherComponent): boolean {
  return weather.duration <= 0;
}
