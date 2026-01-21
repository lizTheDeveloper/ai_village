/**
 * Environment Capability - Manage environment systems
 *
 * Provides admin interface for:
 * - Weather systems (type, intensity, transitions)
 * - Time management (day/night, seasons)
 * - Temperature and climate
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const WEATHER_TYPE_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'rain', label: 'Rain' },
  { value: 'storm', label: 'Storm' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
];

const SEASON_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

const TIME_OF_DAY_OPTIONS = [
  { value: 'dawn', label: 'Dawn (6:00)' },
  { value: 'morning', label: 'Morning (9:00)' },
  { value: 'noon', label: 'Noon (12:00)' },
  { value: 'afternoon', label: 'Afternoon (15:00)' },
  { value: 'dusk', label: 'Dusk (19:00)' },
  { value: 'evening', label: 'Evening (21:00)' },
  { value: 'night', label: 'Night (0:00)' },
];

const WEATHER_EVENT_OPTIONS = [
  { value: 'thunderstorm', label: 'Thunderstorm' },
  { value: 'blizzard', label: 'Blizzard' },
  { value: 'heatwave', label: 'Heatwave' },
  { value: 'flood', label: 'Flood' },
  { value: 'drought', label: 'Drought' },
  { value: 'tornado', label: 'Tornado' },
];

// ============================================================================
// Environment Capability Definition
// ============================================================================

const environmentCapability = defineCapability({
  id: 'environment',
  name: 'Environment',
  description: 'Manage environment - weather, time, temperature, terrain',
  category: 'world',

  tab: {
    icon: '🌤️',
    priority: 40,
  },

  queries: [
    defineQuery({
      id: 'get-current-weather',
      name: 'Get Current Weather',
      description: 'Get current weather conditions',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/weather' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          weatherType?: string;
          intensity?: number;
          temperature?: number;
          movementModifier?: number;
          visibilityModifier?: number;
        };

        let output = 'CURRENT WEATHER\n\n';
        output += `Type: ${result.weatherType ?? 'Clear'}\n`;
        output += `Intensity: ${result.intensity ?? 0}%\n`;
        output += `Temperature: ${result.temperature ?? 20}°C\n`;
        output += `Movement Mod: ${result.movementModifier ?? 1.0}x\n`;
        output += `Visibility Mod: ${result.visibilityModifier ?? 1.0}x\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-time-info',
      name: 'Get Time Info',
      description: 'Get current game time (day, season, year)',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/time' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          tick?: number;
          hour?: number;
          day?: number;
          season?: string;
          year?: number;
          isDay?: boolean;
        };

        let output = 'TIME INFO\n\n';
        output += `Tick: ${result.tick ?? 0}\n`;
        output += `Time: ${result.hour ?? 12}:00\n`;
        output += `Day: ${result.day ?? 1}\n`;
        output += `Season: ${result.season ?? 'Spring'}\n`;
        output += `Year: ${result.year ?? 1}\n`;
        output += `Period: ${result.isDay ? 'Day' : 'Night'}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-temperature',
      name: 'Get Temperature',
      description: 'Get temperature at a location',
      params: [
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/temperature' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          x?: number;
          y?: number;
          temperature?: number;
          biome?: string;
          elevation?: number;
        };

        let output = 'TEMPERATURE\n\n';
        output += `Location: (${result.x ?? 0}, ${result.y ?? 0})\n`;
        output += `Temperature: ${result.temperature ?? 20}°C\n`;
        output += `Biome: ${result.biome ?? 'Unknown'}\n`;
        output += `Elevation: ${result.elevation ?? 0}m\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-environment-stats',
      name: 'Get Environment Stats',
      description: 'Get global environment statistics',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/environment/stats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          avgTemperature?: number;
          weatherDuration?: number;
          dayLength?: number;
          biomeDistribution?: Record<string, number>;
        };

        let output = 'ENVIRONMENT STATS\n\n';
        output += `Avg Temperature: ${result.avgTemperature ?? 20}°C\n`;
        output += `Weather Duration: ${result.weatherDuration ?? 0} ticks\n`;
        output += `Day Length: ${result.dayLength ?? 1200} ticks\n`;

        if (result.biomeDistribution) {
          output += '\nBiome Distribution:\n';
          Object.entries(result.biomeDistribution).forEach(([k, v]) => {
            output += `  ${k}: ${v}%\n`;
          });
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-weather',
      name: 'Set Weather',
      description: 'Change current weather conditions',
      params: [
        {
          name: 'type', type: 'select', required: true,
          options: WEATHER_TYPE_OPTIONS,
          description: 'Weather type',
        },
        { name: 'intensity', type: 'number', required: false, default: 50, description: 'Intensity (0-100)' },
        { name: 'duration', type: 'number', required: false, default: 1000, description: 'Duration in ticks' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set weather to ${params.type} at ${params.intensity}% intensity` };
      },
    }),

    defineAction({
      id: 'set-time',
      name: 'Set Time',
      description: 'Set game time directly',
      params: [
        { name: 'hour', type: 'number', required: true, description: 'Hour (0-23)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set time to ${params.hour}:00` };
      },
    }),

    defineAction({
      id: 'set-time-of-day',
      name: 'Set Time of Day',
      description: 'Set time to a preset period',
      params: [
        {
          name: 'period', type: 'select', required: true,
          options: TIME_OF_DAY_OPTIONS,
          description: 'Time period',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set time to ${params.period}` };
      },
    }),

    defineAction({
      id: 'trigger-weather-event',
      name: 'Trigger Weather Event',
      description: 'Trigger a special weather event',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        {
          name: 'event', type: 'select', required: true,
          options: WEATHER_EVENT_OPTIONS,
          description: 'Weather event type',
        },
        { name: 'duration', type: 'number', required: false, default: 500, description: 'Duration in ticks' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Triggered ${params.event} event for ${params.duration} ticks` };
      },
    }),

    defineAction({
      id: 'set-season',
      name: 'Set Season',
      description: 'Change the current season',
      params: [
        {
          name: 'season', type: 'select', required: true,
          options: SEASON_OPTIONS,
          description: 'Season',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set season to ${params.season}` };
      },
    }),

    defineAction({
      id: 'advance-time',
      name: 'Advance Time',
      description: 'Fast-forward time by ticks',
      params: [
        { name: 'ticks', type: 'number', required: true, description: 'Ticks to advance' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Advanced time by ${params.ticks} ticks` };
      },
    }),
  ],
});

capabilityRegistry.register(environmentCapability);
