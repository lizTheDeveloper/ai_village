/**
 * @ai-village/environment - Environment simulation systems
 *
 * This package provides core environment systems for simulating:
 * - Time (day/night cycles, time progression)
 * - Weather (rain, snow, storms, fog)
 * - Temperature (ambient temperature, building insulation, heat sources)
 * - Soil (farming fertility, moisture, nutrients)
 *
 * These systems form the foundation layer with minimal dependencies,
 * making them reusable across different game projects.
 */

// Systems
export { TimeSystem, createTimeComponent } from './systems/TimeSystem.js';
export type { TimeComponent, DayPhase } from './systems/TimeSystem.js';

export { WeatherSystem } from './systems/WeatherSystem.js';

export { TemperatureSystem, injectChunkSpatialQueryToTemperature } from './systems/TemperatureSystem.js';

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
