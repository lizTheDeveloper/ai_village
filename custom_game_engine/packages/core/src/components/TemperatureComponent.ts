import type { Component } from '../ecs/Component.js';

export type TemperatureState = 'comfortable' | 'cold' | 'hot' | 'dangerously_cold' | 'dangerously_hot';

export interface TemperatureComponent extends Component {
  type: 'temperature';
  currentTemp: number;
  comfortMin: number;
  comfortMax: number;
  toleranceMin: number;
  toleranceMax: number;
  state: TemperatureState;
}

/**
 * Create a TemperatureComponent with validation
 */
export function createTemperatureComponent(
  currentTemp: number,
  comfortMin: number,
  comfortMax: number,
  toleranceMin: number,
  toleranceMax: number,
  state?: TemperatureState
): TemperatureComponent {
  // Validate all required fields per CLAUDE.md - no silent fallbacks
  if (currentTemp === undefined || currentTemp === null) {
    throw new Error('TemperatureComponent requires currentTemp field');
  }
  if (comfortMin === undefined || comfortMin === null) {
    throw new Error('TemperatureComponent requires comfortMin field');
  }
  if (comfortMax === undefined || comfortMax === null) {
    throw new Error('TemperatureComponent requires comfortMax field');
  }
  if (toleranceMin === undefined || toleranceMin === null) {
    throw new Error('TemperatureComponent requires toleranceMin field');
  }
  if (toleranceMax === undefined || toleranceMax === null) {
    throw new Error('TemperatureComponent requires toleranceMax field');
  }

  // Validate logical ranges
  if (toleranceMin > comfortMin) {
    throw new Error(`toleranceMin (${toleranceMin}) must be <= comfortMin (${comfortMin})`);
  }
  if (comfortMax > toleranceMax) {
    throw new Error(`comfortMax (${comfortMax}) must be <= toleranceMax (${toleranceMax})`);
  }

  // Calculate state if not provided
  const calculatedState = state || calculateTemperatureState(currentTemp, comfortMin, comfortMax, toleranceMin, toleranceMax);

  return {
    type: 'temperature',
    version: 1,
    currentTemp,
    comfortMin,
    comfortMax,
    toleranceMin,
    toleranceMax,
    state: calculatedState,
  };
}

/**
 * Calculate temperature state based on current temperature and ranges
 */
export function calculateTemperatureState(
  currentTemp: number,
  comfortMin: number,
  comfortMax: number,
  toleranceMin: number,
  toleranceMax: number
): TemperatureState {
  if (currentTemp < toleranceMin) {
    return 'dangerously_cold';
  }
  if (currentTemp > toleranceMax) {
    return 'dangerously_hot';
  }
  if (currentTemp < comfortMin) {
    return 'cold';
  }
  if (currentTemp > comfortMax) {
    return 'hot';
  }
  return 'comfortable';
}

/**
 * Check if agent is in danger from temperature
 */
export function isInDanger(tempComp: TemperatureComponent): boolean {
  return tempComp.state === 'dangerously_cold' || tempComp.state === 'dangerously_hot';
}

/**
 * Check if agent is uncomfortable but not in danger
 */
export function isUncomfortable(tempComp: TemperatureComponent): boolean {
  return tempComp.state === 'cold' || tempComp.state === 'hot';
}
