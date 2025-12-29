import type { Component } from '../ecs/Component.js';

/**
 * WeatherStationComponent provides weather monitoring and forecasting.
 * Per work order: Provides current temperature, 24-hour forecast,
 * extreme weather warnings, identifies agents at risk.
 *
 * Must be placed in open area (not surrounded by buildings).
 */

export type WeatherRisk = 'safe' | 'cold' | 'hot' | 'extreme';
export type WarningSeverity = 'moderate' | 'severe' | 'extreme';
export type WarningType = 'heatwave' | 'cold_snap';

export interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  conditions: string;
}

export interface ForecastPoint {
  time: number; // game time timestamp
  temperature: number;
  risk: WeatherRisk;
}

export interface WeatherWarning {
  type: WarningType;
  severity: WarningSeverity;
  startsIn: number; // seconds until warning period starts
  duration: number; // seconds warning will last
}

export interface WeatherStationComponent extends Component {
  type: 'weather_station';
  current: CurrentWeather;
  forecast: ForecastPoint[]; // Next 24 hours
  warnings: WeatherWarning[];
  agentsAtRisk: string[]; // Entity IDs of agents at risk
}

export function createWeatherStationComponent(): WeatherStationComponent {
  return {
    type: 'weather_station',
    version: 1,
    current: {
      temperature: 72, // Default safe temperature
      windSpeed: 0,
      conditions: 'clear',
    },
    forecast: [],
    warnings: [],
    agentsAtRisk: [],
  };
}
