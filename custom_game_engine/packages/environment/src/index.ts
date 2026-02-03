/**
 * @ai-village/environment - Environment simulation systems
 *
 * @deprecated The canonical implementations of these systems now live in @ai-village/core.
 * These re-exports exist for backwards compatibility. Prefer importing directly from @ai-village/core.
 *
 * This package previously provided core environment systems for simulating:
 * - Time (day/night cycles, time progression)
 * - Weather (rain, snow, storms, fog)
 * - Temperature (ambient temperature, building insulation, heat sources)
 * - Soil (farming fertility, moisture, nutrients)
 */

// Systems - re-exported from @ai-village/core for backwards compatibility
export { TimeSystem, createTimeComponent } from './systems/TimeSystem.js';
export type { TimeComponent, DayPhase } from './systems/TimeSystem.js';

export { WeatherSystem } from './systems/WeatherSystem.js';

export { TemperatureSystem } from './systems/TemperatureSystem.js';

export { SoilSystem, FERTILIZERS } from './systems/SoilSystem.js';
export type { Tile, FertilizerType } from './systems/SoilSystem.js';

// Re-export core types for convenience
export type {
  System,
  SystemId,
  ComponentType,
  World,
  Entity,
  WeatherComponent,
  WeatherType,
  TemperatureComponent,
  PositionComponent,
  BiomeType,
} from '@ai-village/core';
