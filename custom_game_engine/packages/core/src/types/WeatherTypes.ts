/**
 * Centralized weather and temperature type definitions
 */

export type WeatherType = 'clear' | 'rain' | 'snow' | 'storm' | 'fog';

export type TemperatureState = 'comfortable' | 'cold' | 'hot' | 'dangerously_cold' | 'dangerously_hot';

export type WeatherRisk = 'safe' | 'cold' | 'hot' | 'extreme';

export type WarningSeverity = 'moderate' | 'severe' | 'extreme';

export type WarningType = 'heatwave' | 'cold_snap';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
