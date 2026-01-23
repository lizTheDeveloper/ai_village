/**
 * Weather & Seasons Capability - Divine control over weather and climate
 *
 * SERIOUS DIVINE POWER: The angel controls fundamental forces of nature.
 * This is god-like power over the elements.
 *
 * Framing:
 * - Weather control = manipulating natural forces
 * - Season extension = tampering with the natural order
 * - Microclimate = creating protected zones (blessing the land)
 * - Storms = unleashing divine wrath
 *
 * This capability should feel powerful and consequential. Weather is not
 * just a cosmetic effect - it affects crops, movement, temperature, mood.
 * Messing with seasons disrupts agriculture and natural cycles.
 *
 * Provides admin interface for:
 * - Viewing current weather and climate
 * - Forecasting future weather
 * - Summoning weather phenomena (rain, storms, clear skies)
 * - Manipulating seasons
 * - Creating microclimates
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const WEATHER_TYPE_OPTIONS = [
  { value: 'clear', label: 'Clear Skies' },
  { value: 'rain', label: 'Rain' },
  { value: 'storm', label: 'Storm (Dangerous)' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
];

const SEASON_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall/Autumn' },
  { value: 'winter', label: 'Winter' },
];

const CLIMATE_ZONE_OPTIONS = [
  { value: 'temperate', label: 'Temperate' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'arid', label: 'Arid/Desert' },
  { value: 'polar', label: 'Polar/Arctic' },
  { value: 'mediterranean', label: 'Mediterranean' },
];

// ============================================================================
// Weather & Seasons Capability Definition
// ============================================================================

const weatherSeasonsCapability = defineCapability({
  id: 'weather-seasons',
  name: 'Weather & Seasons',
  description: 'Divine control over weather, climate, and the passage of seasons',
  category: 'world',

  tab: {
    icon: '🌦️',
    priority: 6,
  },

  queries: [
    defineQuery({
      id: 'view-current-weather',
      name: 'View Current Weather',
      description: 'See current weather conditions across the world',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/current' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          weatherType?: string;
          intensity?: number;
          duration?: number;
          tempModifier?: number;
          movementModifier?: number;
          affectedEntities?: number;
        };

        let output = 'CURRENT WEATHER CONDITIONS\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Weather Type: ${result.weatherType ?? 'Clear'}\n`;
        output += `Intensity: ${((result.intensity ?? 0) * 100).toFixed(0)}%\n`;
        output += `Duration Remaining: ${result.duration ?? 0} seconds\n`;
        output += `Temperature Modifier: ${result.tempModifier ?? 0}°C\n`;
        output += `Movement Modifier: ${((result.movementModifier ?? 1.0) * 100).toFixed(0)}%\n\n`;

        if (result.affectedEntities !== undefined) {
          output += `Affected Entities: ${result.affectedEntities}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-forecast',
      name: 'View Weather Forecast',
      description: 'See predicted weather patterns for the next several days',
      params: [
        { name: 'days', type: 'number', required: false, default: 3, description: 'Days to forecast (1-7)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/forecast' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          forecast?: Array<{
            day: number;
            weatherType: string;
            expectedIntensity: number;
            tempRange: { min: number; max: number };
          }>;
        };

        let output = 'WEATHER FORECAST\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.forecast?.length) {
          result.forecast.forEach(f => {
            output += `Day ${f.day}: ${f.weatherType}\n`;
            output += `  Intensity: ${(f.expectedIntensity * 100).toFixed(0)}%\n`;
            output += `  Temp: ${f.tempRange.min}°C - ${f.tempRange.max}°C\n\n`;
          });
        } else {
          output += 'No forecast data available.\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-season',
      name: 'View Current Season',
      description: 'See current season and when it will change',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/time/season' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          currentSeason?: string;
          day?: number;
          daysUntilChange?: number;
          nextSeason?: string;
          year?: number;
        };

        let output = 'SEASONAL INFORMATION\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Current Season: ${result.currentSeason ?? 'Unknown'}\n`;
        output += `Year: ${result.year ?? 1}\n`;
        output += `Day: ${result.day ?? 1}\n\n`;

        if (result.daysUntilChange !== undefined) {
          output += `Days Until ${result.nextSeason ?? 'Next Season'}: ${result.daysUntilChange}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-climate-zones',
      name: 'View Climate Zones',
      description: 'See different climate zones in the world',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/world/climate-zones' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          zones?: Array<{
            type: string;
            coverage: number;
            avgTemp: number;
            biomes: string[];
          }>;
          totalArea?: number;
        };

        let output = 'CLIMATE ZONES\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.zones?.length) {
          result.zones.forEach(z => {
            output += `${z.type}:\n`;
            output += `  Coverage: ${(z.coverage * 100).toFixed(1)}%\n`;
            output += `  Avg Temp: ${z.avgTemp}°C\n`;
            output += `  Biomes: ${z.biomes.join(', ')}\n\n`;
          });
        } else {
          output += 'No climate zone data available.\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-weather-affected',
      name: 'Find Weather-Affected Entities',
      description: 'Find agents, crops, and other entities currently affected by weather',
      params: [
        { name: 'weatherType', type: 'select', required: false, options: WEATHER_TYPE_OPTIONS, description: 'Filter by weather type' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/affected-entities' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          affected?: Array<{
            id: string;
            name: string;
            type: string;
            impact: string;
          }>;
          totalCount?: number;
        };

        let output = 'WEATHER-AFFECTED ENTITIES\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Total Affected: ${result.totalCount ?? 0}\n\n`;

        if (result.affected?.length) {
          result.affected.forEach(e => {
            output += `${e.name} (${e.type})\n`;
            output += `  Impact: ${e.impact}\n\n`;
          });
        } else {
          output += 'No entities currently affected by weather.\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-weather-history',
      name: 'View Weather History',
      description: 'See past weather patterns and events',
      params: [
        { name: 'days', type: 'number', required: false, default: 7, description: 'Days of history (1-30)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          history?: Array<{
            day: number;
            weatherType: string;
            avgIntensity: number;
            duration: number;
          }>;
          summary?: {
            mostCommon: string;
            avgIntensity: number;
            extremeEvents: number;
          };
        };

        let output = 'WEATHER HISTORY\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.summary) {
          output += `Most Common: ${result.summary.mostCommon}\n`;
          output += `Avg Intensity: ${(result.summary.avgIntensity * 100).toFixed(0)}%\n`;
          output += `Extreme Events: ${result.summary.extremeEvents}\n\n`;
        }

        if (result.history?.length) {
          output += 'RECENT WEATHER:\n';
          result.history.slice(0, 10).forEach(h => {
            output += `  Day ${h.day}: ${h.weatherType} (${(h.avgIntensity * 100).toFixed(0)}%)\n`;
          });
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'summon-rain',
      name: 'Summon Rain',
      description: 'Bring rain to the land. Helps crops but slows movement.',
      params: [
        { name: 'intensity', type: 'number', required: false, default: 0.6, description: 'Intensity (0.0-1.0)' },
        { name: 'duration', type: 'number', required: false, default: 300, description: 'Duration in seconds' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/set', success: true };
      },
    }),

    defineAction({
      id: 'clear-skies',
      name: 'Clear Skies',
      description: 'Stop all precipitation and clear the weather',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/clear', success: true };
      },
    }),

    defineAction({
      id: 'summon-storm',
      name: 'Summon Storm',
      description: 'Unleash a dangerous storm. Divine wrath made manifest. Can harm entities.',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'intensity', type: 'number', required: false, default: 0.8, description: 'Intensity (0.5-1.0)' },
        { name: 'duration', type: 'number', required: false, default: 200, description: 'Duration in seconds' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/storm', success: true };
      },
    }),

    defineAction({
      id: 'change-temperature',
      name: 'Change Temperature',
      description: 'Warm or cool an area temporarily',
      params: [
        { name: 'modifier', type: 'number', required: true, description: 'Temperature change in °C (-20 to +20)' },
        { name: 'duration', type: 'number', required: false, default: 300, description: 'Duration in seconds' },
        { name: 'x', type: 'number', required: false, description: 'X coordinate (optional, defaults to global)' },
        { name: 'y', type: 'number', required: false, description: 'Y coordinate (optional, defaults to global)' },
        { name: 'radius', type: 'number', required: false, default: 50, description: 'Effect radius' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/temperature', success: true };
      },
    }),

    defineAction({
      id: 'extend-season',
      name: 'Extend Season',
      description: 'Extend the current season, disrupting the natural order',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'days', type: 'number', required: true, description: 'Days to extend (1-30)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/time/extend-season', success: true };
      },
    }),

    defineAction({
      id: 'create-microclimate',
      name: 'Create Microclimate',
      description: 'Create a small protected climate zone with custom conditions',
      params: [
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'radius', type: 'number', required: false, default: 20, description: 'Effect radius' },
        { name: 'weatherType', type: 'select', required: true, options: WEATHER_TYPE_OPTIONS, description: 'Protected weather type' },
        { name: 'tempModifier', type: 'number', required: false, default: 0, description: 'Temperature modifier (°C)' },
        { name: 'duration', type: 'number', required: false, default: 600, description: 'Duration in seconds (0 = permanent)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/weather/microclimate', success: true };
      },
    }),
  ],
});

capabilityRegistry.register(weatherSeasonsCapability);
