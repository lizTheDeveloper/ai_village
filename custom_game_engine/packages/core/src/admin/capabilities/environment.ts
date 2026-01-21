/**
 * Environment Admin Capability
 *
 * Comprehensive environment control dashboard for LLM:
 * - Weather systems (type, intensity, transitions)
 * - Time management (day/night, seasons)
 * - Terrain and biomes
 * - Temperature and climate
 */

import { defineCapability, defineQuery, defineAction, capabilityRegistry } from '../capability-registry.js';
import type { AdminContext, QueryResult, ActionResult } from '../types.js';

// ============================================================================
// OPTIONS
// ============================================================================

const WEATHER_TYPE_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'rain', label: 'Rain' },
  { value: 'storm', label: 'Storm' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
] as const;

const SEASON_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
] as const;

const BIOME_OPTIONS = [
  { value: 'plains', label: 'Plains' },
  { value: 'forest', label: 'Forest' },
  { value: 'desert', label: 'Desert' },
  { value: 'tundra', label: 'Tundra' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'jungle', label: 'Jungle' },
] as const;

const TIME_OF_DAY_OPTIONS = [
  { value: 'dawn', label: 'Dawn (5-7)' },
  { value: 'morning', label: 'Morning (7-12)' },
  { value: 'noon', label: 'Noon (12-14)' },
  { value: 'afternoon', label: 'Afternoon (14-18)' },
  { value: 'dusk', label: 'Dusk (18-20)' },
  { value: 'evening', label: 'Evening (20-22)' },
  { value: 'night', label: 'Night (22-5)' },
] as const;

// ============================================================================
// QUERIES
// ============================================================================

const getCurrentWeather = defineQuery({
  id: 'get-current-weather',
  name: 'Get Current Weather',
  description: 'Get current weather conditions',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find weather entity
    const weatherEntities = world.query().with('weather').executeEntities();

    if (weatherEntities.length === 0) {
      return {
        success: true,
        data: { message: 'No weather entity found in world' },
      };
    }

    const weatherEntity = weatherEntities[0];
    const weather = weatherEntity?.getComponent('weather') as any;

    if (!weather) {
      return { success: true, data: { message: 'Weather component not found' } };
    }

    return {
      success: true,
      data: {
        entityId: weatherEntity?.id,
        weatherType: weather.weatherType || 'clear',
        intensity: weather.intensity || 0,
        duration: weather.duration || 0,
        movementModifier: weather.movementModifier || 1.0,
        temperatureModifier: weather.temperatureModifier || 0,
        visibilityModifier: weather.visibilityModifier || 1.0,
      },
    };
  },
});

const getTimeInfo = defineQuery({
  id: 'get-time-info',
  name: 'Get Time Info',
  description: 'Get current time, day/night cycle, and season',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find time entity
    const timeEntities = world.query().with('time').executeEntities();

    if (timeEntities.length === 0) {
      return {
        success: true,
        data: {
          tick: world.tick,
          message: 'No time entity found - using tick count only',
        },
      };
    }

    const timeEntity = timeEntities[0];
    const time = timeEntity?.getComponent('time') as any;

    if (!time) {
      return { success: true, data: { tick: world.tick } };
    }

    // Calculate time of day based on hour
    const hour = time.hour || 0;
    let timeOfDay = 'night';
    if (hour >= 5 && hour < 7) timeOfDay = 'dawn';
    else if (hour >= 7 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 14) timeOfDay = 'noon';
    else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 20) timeOfDay = 'dusk';
    else if (hour >= 20 && hour < 22) timeOfDay = 'evening';

    return {
      success: true,
      data: {
        tick: world.tick,
        hour: time.hour || 0,
        minute: time.minute || 0,
        day: time.day || 1,
        month: time.month || 1,
        year: time.year || 1,
        season: time.season || 'spring',
        timeOfDay,
        isDay: hour >= 6 && hour < 20,
        dayLength: time.dayLength || 24,
        ticksPerHour: time.ticksPerHour || 100,
      },
    };
  },
});

const getTemperature = defineQuery({
  id: 'get-temperature',
  name: 'Get Temperature',
  description: 'Get current temperature conditions',
  parameters: [
    {
      name: 'x',
      type: 'number',
      description: 'X coordinate (optional)',
      required: false,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Y coordinate (optional)',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find temperature entity
    const tempEntities = world.query().with('temperature').executeEntities();

    if (tempEntities.length === 0) {
      return {
        success: true,
        data: { message: 'No temperature entity found in world' },
      };
    }

    const tempEntity = tempEntities[0];
    const temp = tempEntity?.getComponent('temperature') as any;

    if (!temp) {
      return { success: true, data: { message: 'Temperature component not found' } };
    }

    return {
      success: true,
      data: {
        baseTemperature: temp.baseTemperature || 20,
        currentTemperature: temp.currentTemperature || 20,
        seasonalModifier: temp.seasonalModifier || 0,
        weatherModifier: temp.weatherModifier || 0,
        timeOfDayModifier: temp.timeOfDayModifier || 0,
        unit: 'Celsius',
      },
    };
  },
});

const getBiomeInfo = defineQuery({
  id: 'get-biome-info',
  name: 'Get Biome Info',
  description: 'Get biome information at a location',
  parameters: [
    {
      name: 'x',
      type: 'number',
      description: 'X coordinate',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Y coordinate',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const x = params.x as number;
    const y = params.y as number;

    // Try to get terrain/biome info from chunk or terrain system
    // This would typically access the terrain generation or chunk data

    return {
      success: true,
      data: {
        x,
        y,
        message: 'Biome query - implementation depends on terrain system',
        // These would be populated from actual terrain data
        biome: 'plains',
        elevation: 0,
        moisture: 0.5,
        fertility: 0.7,
      },
    };
  },
});

const getEnvironmentStats = defineQuery({
  id: 'get-environment-stats',
  name: 'Get Environment Stats',
  description: 'Get overall environment statistics',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Count various environmental entities
    const weatherEntities = world.query().with('weather').executeEntities();
    const plantEntities = world.query().with('plant').executeEntities();
    const waterEntities = world.query().with('water').executeEntities();
    const terrainEntities = world.query().with('terrain').executeEntities();

    return {
      success: true,
      data: {
        tick: world.tick,
        weatherEntityCount: weatherEntities.length,
        plantCount: plantEntities.length,
        waterBodyCount: waterEntities.length,
        terrainEntityCount: terrainEntities.length,
      },
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

const setWeather = defineAction({
  id: 'set-weather',
  name: 'Set Weather',
  description: 'Set weather conditions',
  parameters: [
    {
      name: 'weatherType',
      type: 'select',
      description: 'Weather type',
      required: true,
      options: WEATHER_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'intensity',
      type: 'number',
      description: 'Intensity (0-1)',
      required: false,
    },
    {
      name: 'duration',
      type: 'number',
      description: 'Duration in seconds',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const weatherType = params.weatherType as string;
    const intensity = (params.intensity as number) ?? (weatherType === 'clear' ? 0 : 0.5);
    const duration = (params.duration as number) || 300;

    // Find weather entity
    const weatherEntities = world.query().with('weather').executeEntities();

    if (weatherEntities.length === 0) {
      return { success: false, error: 'No weather entity found in world' };
    }

    const weatherEntity = weatherEntities[0] as any;

    // Weather type defaults
    const movementModifiers: Record<string, number> = {
      clear: 1.0,
      rain: 0.8,
      storm: 0.6,
      snow: 0.7,
      fog: 0.9,
    };

    const oldWeather = weatherEntity.getComponent('weather') as any;
    const oldType = oldWeather?.weatherType || 'clear';

    weatherEntity.updateComponent('weather', (current: any) => ({
      ...current,
      weatherType,
      intensity: Math.max(0, Math.min(1, intensity)),
      duration,
      movementModifier: 1.0 - (1.0 - movementModifiers[weatherType]) * intensity,
    }));

    // Emit weather changed event
    world.eventBus.emit({
      type: 'weather:changed',
      source: weatherEntity.id,
      data: {
        oldWeather: oldType,
        weatherType,
        intensity,
      },
    });

    return {
      success: true,
      message: `Weather set to ${weatherType} (intensity: ${intensity.toFixed(2)}, duration: ${duration}s)`,
    };
  },
});

const setTime = defineAction({
  id: 'set-time',
  name: 'Set Time',
  description: 'Set the current time',
  parameters: [
    {
      name: 'hour',
      type: 'number',
      description: 'Hour (0-23)',
      required: false,
    },
    {
      name: 'day',
      type: 'number',
      description: 'Day of month',
      required: false,
    },
    {
      name: 'season',
      type: 'select',
      description: 'Season',
      required: false,
      options: SEASON_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const hour = params.hour as number | undefined;
    const day = params.day as number | undefined;
    const season = params.season as string | undefined;

    // Find time entity
    const timeEntities = world.query().with('time').executeEntities();

    if (timeEntities.length === 0) {
      return { success: false, error: 'No time entity found in world' };
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

    // Emit time changed event
    if (updates.length > 0) {
      world.eventBus.emit({
        type: 'time:changed',
        source: timeEntity.id,
        data: {
          hour,
          day,
          season,
          tick: world.tick,
        },
      });
    }

    return {
      success: true,
      message: updates.length > 0
        ? `Time updated: ${updates.join(', ')}`
        : 'No time changes specified',
    };
  },
});

const setTimeOfDay = defineAction({
  id: 'set-time-of-day',
  name: 'Set Time of Day',
  description: 'Quick set time to specific part of day',
  parameters: [
    {
      name: 'timeOfDay',
      type: 'select',
      description: 'Time of day',
      required: true,
      options: TIME_OF_DAY_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const timeOfDay = params.timeOfDay as string;

    const hourMap: Record<string, number> = {
      dawn: 6,
      morning: 9,
      noon: 12,
      afternoon: 15,
      dusk: 19,
      evening: 21,
      night: 0,
    };

    const hour = hourMap[timeOfDay] ?? 12;

    // Find time entity
    const timeEntities = world.query().with('time').executeEntities();

    if (timeEntities.length === 0) {
      return { success: false, error: 'No time entity found in world' };
    }

    const timeEntity = timeEntities[0] as any;

    timeEntity.updateComponent('time', (current: any) => ({
      ...current,
      hour,
      minute: 0,
    }));

    // Emit event
    world.eventBus.emit({
      type: 'time:changed',
      source: timeEntity.id,
      data: {
        hour,
        timeOfDay,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Time set to ${timeOfDay} (${hour}:00)`,
    };
  },
});

const triggerWeatherEvent = defineAction({
  id: 'trigger-weather-event',
  name: 'Trigger Weather Event',
  description: 'Trigger a dramatic weather event',
  parameters: [
    {
      name: 'eventType',
      type: 'select',
      description: 'Weather event type',
      required: true,
      options: ['thunderstorm', 'blizzard', 'heatwave', 'flood', 'drought', 'tornado'],
    },
    {
      name: 'severity',
      type: 'number',
      description: 'Severity (0-1)',
      required: false,
    },
    {
      name: 'duration',
      type: 'number',
      description: 'Duration in seconds',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const eventType = params.eventType as string;
    const severity = (params.severity as number) ?? 0.8;
    const duration = (params.duration as number) || 600;

    // Map event types to weather
    const eventWeatherMap: Record<string, { type: string; intensity: number }> = {
      thunderstorm: { type: 'storm', intensity: 0.9 },
      blizzard: { type: 'snow', intensity: 1.0 },
      heatwave: { type: 'clear', intensity: 0 },
      flood: { type: 'rain', intensity: 1.0 },
      drought: { type: 'clear', intensity: 0 },
      tornado: { type: 'storm', intensity: 1.0 },
    };

    const weatherConfig = eventWeatherMap[eventType];

    // Find weather entity
    const weatherEntities = world.query().with('weather').executeEntities();

    if (weatherEntities.length > 0) {
      const weatherEntity = weatherEntities[0] as any;
      weatherEntity.updateComponent('weather', (current: any) => ({
        ...current,
        weatherType: weatherConfig.type,
        intensity: weatherConfig.intensity * severity,
        duration,
      }));
    }

    // Emit weather event
    world.eventBus.emit({
      type: 'weather:event_started',
      source: 'admin',
      data: {
        eventType,
        severity,
        duration,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Weather event triggered: ${eventType} (severity: ${severity.toFixed(2)}, duration: ${duration}s)`,
    };
  },
});

const advanceTime = defineAction({
  id: 'advance-time',
  name: 'Advance Time',
  description: 'Advance time by a specified amount',
  parameters: [
    {
      name: 'hours',
      type: 'number',
      description: 'Hours to advance',
      required: false,
    },
    {
      name: 'days',
      type: 'number',
      description: 'Days to advance',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const hours = (params.hours as number) || 0;
    const days = (params.days as number) || 0;

    const totalHours = hours + days * 24;

    if (totalHours <= 0) {
      return { success: false, error: 'Must specify positive hours or days' };
    }

    // Find time entity
    const timeEntities = world.query().with('time').executeEntities();

    if (timeEntities.length === 0) {
      return { success: false, error: 'No time entity found in world' };
    }

    const timeEntity = timeEntities[0] as any;

    timeEntity.updateComponent('time', (current: any) => {
      let newHour = (current.hour || 0) + totalHours;
      let newDay = current.day || 1;

      while (newHour >= 24) {
        newHour -= 24;
        newDay++;
      }

      return {
        ...current,
        hour: newHour,
        day: newDay,
      };
    });

    return {
      success: true,
      message: `Time advanced by ${hours > 0 ? hours + ' hours' : ''}${hours > 0 && days > 0 ? ' and ' : ''}${days > 0 ? days + ' days' : ''}`,
    };
  },
});

// ============================================================================
// CAPABILITY REGISTRATION
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
    getCurrentWeather,
    getTimeInfo,
    getTemperature,
    getBiomeInfo,
    getEnvironmentStats,
  ],
  actions: [
    setWeather,
    setTime,
    setTimeOfDay,
    triggerWeatherEvent,
    advanceTime,
  ],
});

capabilityRegistry.register(environmentCapability);

export { environmentCapability };
