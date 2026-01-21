/**
 * Environment Admin Capability
 *
 * Comprehensive environment control dashboard for LLM:
 * - Weather systems (type, intensity, transitions)
 * - Time management (day/night, seasons)
 * - Terrain and biomes
 * - Temperature and climate
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// OPTIONS
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
// CAPABILITY DEFINITION
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
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const weatherEntities = world.query().with('weather').executeEntities();
        if (weatherEntities.length === 0) {
          return { message: 'No weather entity found in world' };
        }

        const weatherEntity = weatherEntities[0];
        const weather = weatherEntity?.getComponent('weather') as any;

        if (!weather) {
          return { message: 'Weather component not found' };
        }

        return {
          entityId: weatherEntity?.id,
          weatherType: weather.weatherType || 'clear',
          intensity: weather.intensity || 0,
          duration: weather.duration || 0,
          movementModifier: weather.movementModifier || 1.0,
          temperatureModifier: weather.temperatureModifier || 0,
          visibilityModifier: weather.visibilityModifier || 1.0,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'CURRENT WEATHER\n\n';

        if (result.message) {
          output += result.message;
          return output;
        }

        output += `Type: ${result.weatherType}\n`;
        output += `Intensity: ${(result.intensity * 100).toFixed(0)}%\n`;
        output += `Duration: ${result.duration}s remaining\n`;
        output += `Movement Modifier: ${(result.movementModifier * 100).toFixed(0)}%\n`;
        return output;
      },
    }),

    defineQuery({
      id: 'get-time-info',
      name: 'Get Time Info',
      description: 'Get current time, day/night cycle, and season',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const timeEntities = world.query().with('time').executeEntities();
        if (timeEntities.length === 0) {
          return { tick: world.tick, message: 'No time entity found - using tick count only' };
        }

        const timeEntity = timeEntities[0];
        const time = timeEntity?.getComponent('time') as any;

        if (!time) {
          return { tick: world.tick };
        }

        const hour = time.hour || 0;
        let timeOfDay = 'night';
        if (hour >= 5 && hour < 7) timeOfDay = 'dawn';
        else if (hour >= 7 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 14) timeOfDay = 'noon';
        else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 20) timeOfDay = 'dusk';
        else if (hour >= 20 && hour < 22) timeOfDay = 'evening';

        return {
          tick: world.tick,
          hour: time.hour || 0,
          minute: time.minute || 0,
          day: time.day || 1,
          month: time.month || 1,
          year: time.year || 1,
          season: time.season || 'spring',
          timeOfDay,
          isDay: hour >= 6 && hour < 20,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'TIME INFO\n\n';

        if (result.message) {
          output += result.message + '\n';
        }

        output += `Tick: ${result.tick}\n`;
        if (result.hour !== undefined) {
          output += `Time: ${result.hour}:${String(result.minute || 0).padStart(2, '0')}\n`;
          output += `Day ${result.day}, Month ${result.month}, Year ${result.year}\n`;
          output += `Season: ${result.season}\n`;
          output += `Time of Day: ${result.timeOfDay}\n`;
          output += `Is Day: ${result.isDay ? 'Yes' : 'No'}\n`;
        }
        return output;
      },
    }),

    defineQuery({
      id: 'get-temperature',
      name: 'Get Temperature',
      description: 'Get current temperature conditions',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const tempEntities = world.query().with('temperature').executeEntities();
        if (tempEntities.length === 0) {
          return { message: 'No temperature entity found in world' };
        }

        const tempEntity = tempEntities[0];
        const temp = tempEntity?.getComponent('temperature') as any;

        if (!temp) {
          return { message: 'Temperature component not found' };
        }

        return {
          baseTemperature: temp.baseTemperature || 20,
          currentTemperature: temp.currentTemperature || 20,
          seasonalModifier: temp.seasonalModifier || 0,
          weatherModifier: temp.weatherModifier || 0,
          unit: 'Celsius',
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'TEMPERATURE\n\n';

        if (result.message) {
          output += result.message;
          return output;
        }

        output += `Current: ${result.currentTemperature}°C\n`;
        output += `Base: ${result.baseTemperature}°C\n`;
        output += `Seasonal Modifier: ${result.seasonalModifier >= 0 ? '+' : ''}${result.seasonalModifier}°C\n`;
        output += `Weather Modifier: ${result.weatherModifier >= 0 ? '+' : ''}${result.weatherModifier}°C\n`;
        return output;
      },
    }),

    defineQuery({
      id: 'get-environment-stats',
      name: 'Get Environment Stats',
      description: 'Get overall environment statistics',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const weatherEntities = world.query().with('weather').executeEntities();
        const plantEntities = world.query().with('plant').executeEntities();
        const waterEntities = world.query().with('water').executeEntities();
        const terrainEntities = world.query().with('terrain').executeEntities();

        return {
          tick: world.tick,
          weatherEntityCount: weatherEntities.length,
          plantCount: plantEntities.length,
          waterBodyCount: waterEntities.length,
          terrainEntityCount: terrainEntities.length,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'ENVIRONMENT STATS\n\n';
        output += `Tick: ${result.tick}\n`;
        output += `Weather Entities: ${result.weatherEntityCount}\n`;
        output += `Plants: ${result.plantCount}\n`;
        output += `Water Bodies: ${result.waterBodyCount}\n`;
        output += `Terrain Entities: ${result.terrainEntityCount}\n`;
        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-weather',
      name: 'Set Weather',
      description: 'Set weather conditions',
      params: [
        { name: 'weatherType', type: 'select', required: true, options: WEATHER_TYPE_OPTIONS, description: 'Weather type' },
        { name: 'intensity', type: 'number', required: false, description: 'Intensity (0-1)' },
        { name: 'duration', type: 'number', required: false, description: 'Duration in seconds' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const weatherType = params.weatherType as string;
        const intensity = (params.intensity as number) ?? (weatherType === 'clear' ? 0 : 0.5);
        const duration = (params.duration as number) || 300;

        const weatherEntities = world.query().with('weather').executeEntities();
        if (weatherEntities.length === 0) {
          throw new Error('No weather entity found in world');
        }

        const weatherEntity = weatherEntities[0] as any;

        const movementModifiers: Record<string, number> = {
          clear: 1.0, rain: 0.8, storm: 0.6, snow: 0.7, fog: 0.9,
        };

        const oldWeather = weatherEntity.getComponent('weather') as any;
        const oldType = oldWeather?.weatherType || 'clear';

        weatherEntity.updateComponent('weather', (current: any) => ({
          ...current,
          weatherType,
          intensity: Math.max(0, Math.min(1, intensity)),
          duration,
          movementModifier: 1.0 - (1.0 - (movementModifiers[weatherType] || 1.0)) * intensity,
        }));

        world.eventBus.emit({
          type: 'weather:changed',
          source: weatherEntity.id,
          data: { oldWeather: oldType, weatherType, intensity },
        });

        return {
          success: true,
          message: `Weather set to ${weatherType} (intensity: ${(intensity * 100).toFixed(0)}%, duration: ${duration}s)`,
        };
      },
    }),

    defineAction({
      id: 'set-time',
      name: 'Set Time',
      description: 'Set the current time',
      params: [
        { name: 'hour', type: 'number', required: false, description: 'Hour (0-23)' },
        { name: 'day', type: 'number', required: false, description: 'Day of month' },
        { name: 'season', type: 'select', required: false, options: SEASON_OPTIONS, description: 'Season' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const hour = params.hour as number | undefined;
        const day = params.day as number | undefined;
        const season = params.season as string | undefined;

        const timeEntities = world.query().with('time').executeEntities();
        if (timeEntities.length === 0) {
          throw new Error('No time entity found in world');
        }

        const timeEntity = timeEntities[0] as any;
        const updates: string[] = [];

        timeEntity.updateComponent('time', (current: any) => {
          const updated = { ...current };
          if (hour !== undefined) {
            updated.hour = Math.max(0, Math.min(23, hour));
            updates.push(`hour=${updated.hour}`);
          }
          if (day !== undefined) {
            updated.day = Math.max(1, day);
            updates.push(`day=${updated.day}`);
          }
          if (season !== undefined) {
            updated.season = season;
            updates.push(`season=${season}`);
          }
          return updated;
        });

        if (updates.length > 0) {
          world.eventBus.emit({
            type: 'time:changed',
            source: timeEntity.id,
            data: { hour, day, season, tick: world.tick },
          });
        }

        return {
          success: true,
          message: updates.length > 0 ? `Time updated: ${updates.join(', ')}` : 'No time changes specified',
        };
      },
    }),

    defineAction({
      id: 'set-time-of-day',
      name: 'Set Time of Day',
      description: 'Quick set time to specific part of day',
      params: [
        { name: 'timeOfDay', type: 'select', required: true, options: TIME_OF_DAY_OPTIONS, description: 'Time of day' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const timeOfDay = params.timeOfDay as string;
        const hourMap: Record<string, number> = {
          dawn: 6, morning: 9, noon: 12, afternoon: 15, dusk: 19, evening: 21, night: 0,
        };

        const hour = hourMap[timeOfDay] ?? 12;

        const timeEntities = world.query().with('time').executeEntities();
        if (timeEntities.length === 0) {
          throw new Error('No time entity found in world');
        }

        const timeEntity = timeEntities[0] as any;

        timeEntity.updateComponent('time', (current: any) => ({
          ...current,
          hour,
          minute: 0,
        }));

        world.eventBus.emit({
          type: 'time:changed',
          source: timeEntity.id,
          data: { hour, timeOfDay, tick: world.tick },
        });

        return {
          success: true,
          message: `Time set to ${timeOfDay} (${hour}:00)`,
        };
      },
    }),

    defineAction({
      id: 'trigger-weather-event',
      name: 'Trigger Weather Event',
      description: 'Trigger a dramatic weather event',
      params: [
        { name: 'eventType', type: 'select', required: true, options: WEATHER_EVENT_OPTIONS, description: 'Event type' },
        { name: 'severity', type: 'number', required: false, description: 'Severity (0-1)' },
        { name: 'duration', type: 'number', required: false, description: 'Duration in seconds' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const eventType = params.eventType as string;
        const severity = (params.severity as number) ?? 0.8;
        const duration = (params.duration as number) || 600;

        const eventWeatherMap: Record<string, { type: string; intensity: number }> = {
          thunderstorm: { type: 'storm', intensity: 0.9 },
          blizzard: { type: 'snow', intensity: 1.0 },
          heatwave: { type: 'clear', intensity: 0 },
          flood: { type: 'rain', intensity: 1.0 },
          drought: { type: 'clear', intensity: 0 },
          tornado: { type: 'storm', intensity: 1.0 },
        };

        const weatherConfig = eventWeatherMap[eventType];

        const weatherEntities = world.query().with('weather').executeEntities();
        if (weatherEntities.length > 0 && weatherConfig) {
          const weatherEntity = weatherEntities[0] as any;
          weatherEntity.updateComponent('weather', (current: any) => ({
            ...current,
            weatherType: weatherConfig.type,
            intensity: weatherConfig.intensity * severity,
            duration,
          }));
        }

        world.eventBus.emit({
          type: 'weather:event_started',
          source: 'admin',
          data: { eventType, severity, duration, tick: world.tick },
        });

        return {
          success: true,
          message: `Weather event triggered: ${eventType} (severity: ${(severity * 100).toFixed(0)}%, duration: ${duration}s)`,
        };
      },
    }),

    defineAction({
      id: 'advance-time',
      name: 'Advance Time',
      description: 'Advance time by a specified amount',
      params: [
        { name: 'hours', type: 'number', required: false, description: 'Hours to advance' },
        { name: 'days', type: 'number', required: false, description: 'Days to advance' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const hours = (params.hours as number) || 0;
        const days = (params.days as number) || 0;
        const totalHours = hours + days * 24;

        if (totalHours <= 0) {
          throw new Error('Must specify positive hours or days');
        }

        const timeEntities = world.query().with('time').executeEntities();
        if (timeEntities.length === 0) {
          throw new Error('No time entity found in world');
        }

        const timeEntity = timeEntities[0] as any;

        timeEntity.updateComponent('time', (current: any) => {
          let newHour = (current.hour || 0) + totalHours;
          let newDay = current.day || 1;

          while (newHour >= 24) {
            newHour -= 24;
            newDay++;
          }

          return { ...current, hour: newHour, day: newDay };
        });

        return {
          success: true,
          message: `Time advanced by ${hours > 0 ? hours + ' hours' : ''}${hours > 0 && days > 0 ? ' and ' : ''}${days > 0 ? days + ' days' : ''}`,
        };
      },
    }),
  ],
});

capabilityRegistry.register(environmentCapability);

export { environmentCapability };
