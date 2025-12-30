/**
 * WeatherView - Weather and time display
 *
 * Shows current weather conditions, temperature, and time of day.
 * Available in both player UI (canvas) and LLM dashboard (curl).
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { getStatusColor } from '../theme.js';

/**
 * Data returned by the Weather view
 */
export interface WeatherViewData extends ViewData {
  /** Current weather type */
  weatherType: string;
  /** Weather intensity (0-1) */
  intensity: number;
  /** Remaining duration in game hours */
  durationRemaining: number;
  /** Current ambient temperature */
  temperature: number;
  /** Time of day (0-24) */
  timeOfDay: number;
  /** Current day phase */
  phase: string;
  /** Current day number */
  day: number;
  /** Light level (0-1) */
  lightLevel: number;
  /** Current season (if available) */
  season?: string;
}

/**
 * Weather icons for different weather types
 */
const weatherIcons: Record<string, string> = {
  clear: '☀️',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
  cloudy: '☁️',
  default: '🌤️',
};

/**
 * Phase icons for different times of day
 */
const phaseIcons: Record<string, string> = {
  dawn: '🌅',
  day: '☀️',
  dusk: '🌇',
  night: '🌙',
  default: '⏰',
};

/**
 * Get weather icon
 */
function getWeatherIcon(weatherType: string): string {
  return weatherIcons[weatherType] || weatherIcons['default']!;
}

/**
 * Get phase icon
 */
function getPhaseIcon(phase: string): string {
  return phaseIcons[phase] || phaseIcons['default']!;
}

/**
 * Format time as HH:MM
 */
function formatTime(timeOfDay: number): string {
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Weather View Definition
 */
export const WeatherView: DashboardView<WeatherViewData> = {
  id: 'weather',
  title: 'Weather & Time',
  category: 'info',
  keyboardShortcut: 'W',
  description: 'Shows current weather conditions, temperature, and time',

  defaultSize: {
    width: 220,
    height: 180,
    minWidth: 180,
    minHeight: 140,
  },

  getData(context: ViewContext): WeatherViewData {
    const { world } = context;

    // Handle missing world
    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Game world not available',
        weatherType: 'unknown',
        intensity: 0,
        durationRemaining: 0,
        temperature: 0,
        timeOfDay: 12,
        phase: 'day',
        day: 1,
        lightLevel: 1,
      };
    }

    try {
      // Find weather entity (usually a singleton)
      const weatherEntities = world.query()
        .with('weather')
        .executeEntities();

      // Find time entity (usually a singleton)
      const timeEntities = world.query()
        .with('time')
        .executeEntities();

      // Get weather data
      let weatherType = 'clear';
      let intensity = 0;
      let durationRemaining = 0;
      let temperature = 20; // Default 20°C

      if (weatherEntities.length > 0) {
        const weather = weatherEntities[0]?.components.get('weather');
        if (weather) {
          const weatherData = weather as unknown as { weatherType?: string; intensity?: number; duration?: number };
          weatherType = weatherData.weatherType || 'clear';
          intensity = weatherData.intensity || 0;
          durationRemaining = weatherData.duration || 0;
        }
      }

      // Get time data
      let timeOfDay = 12;
      let phase = 'day';
      let day = 1;
      let lightLevel = 1;

      if (timeEntities.length > 0) {
        const time = timeEntities[0]?.components.get('time');
        if (time) {
          const timeData = time as unknown as { timeOfDay?: number; phase?: string; day?: number; lightLevel?: number };
          timeOfDay = timeData.timeOfDay ?? 12;
          phase = timeData.phase || 'day';
          day = timeData.day || 1;
          lightLevel = timeData.lightLevel ?? 1;
        }
      }

      // Get temperature from temperature entity if exists
      const tempEntities = world.query()
        .with('temperature')
        .executeEntities();

      if (tempEntities.length > 0) {
        const temp = tempEntities[0]?.components.get('temperature');
        if (temp) {
          const tempData = temp as unknown as { ambient?: number };
          if (tempData.ambient !== undefined) {
            temperature = tempData.ambient;
          }
        }
      }

      return {
        timestamp: Date.now(),
        available: true,
        weatherType,
        intensity,
        durationRemaining,
        temperature,
        timeOfDay,
        phase,
        day,
        lightLevel,
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        weatherType: 'unknown',
        intensity: 0,
        durationRemaining: 0,
        temperature: 0,
        timeOfDay: 12,
        phase: 'day',
        day: 1,
        lightLevel: 1,
      };
    }
  },

  textFormatter(data: WeatherViewData): string {
    const lines: string[] = [
      'WEATHER & TIME',
      '═'.repeat(40),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Data unavailable');
      return lines.join('\n');
    }

    // Time info
    const timeIcon = getPhaseIcon(data.phase);
    lines.push(`${timeIcon} Time: ${formatTime(data.timeOfDay)} (${data.phase})`);
    lines.push(`   Day ${data.day}`);
    lines.push(`   Light Level: ${Math.round(data.lightLevel * 100)}%`);
    lines.push('');

    // Weather info
    const weatherIcon = getWeatherIcon(data.weatherType);
    lines.push(`${weatherIcon} Weather: ${data.weatherType}`);
    if (data.intensity > 0) {
      lines.push(`   Intensity: ${Math.round(data.intensity * 100)}%`);
    }
    if (data.durationRemaining > 0) {
      lines.push(`   Duration: ${data.durationRemaining.toFixed(1)} hrs remaining`);
    }
    lines.push('');

    // Temperature
    const tempIcon = data.temperature < 10 ? '🥶' : data.temperature > 30 ? '🥵' : '🌡️';
    lines.push(`${tempIcon} Temperature: ${data.temperature.toFixed(1)}°C`);

    // Warning if extreme
    if (data.temperature < 0) {
      lines.push('   ⚠️ Freezing conditions!');
    } else if (data.temperature > 35) {
      lines.push('   ⚠️ Extreme heat!');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: WeatherViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Data unavailable', x + padding, currentY);
      return;
    }

    // Time display
    const timeIcon = getPhaseIcon(data.phase);
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`${timeIcon} Day ${data.day} - ${formatTime(data.timeOfDay)}`, x + padding, currentY);
    currentY += lineHeight;

    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`${data.phase} (${Math.round(data.lightLevel * 100)}% light)`, x + padding, currentY);
    currentY += lineHeight + 8;

    // Weather display
    const weatherIcon = getWeatherIcon(data.weatherType);
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`${weatherIcon} ${data.weatherType}`, x + padding, currentY);
    currentY += lineHeight;

    if (data.intensity > 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`   Intensity: ${Math.round(data.intensity * 100)}%`, x + padding, currentY);
      currentY += lineHeight;
    }
    currentY += 8;

    // Temperature display
    const tempColor = getStatusColor(
      // Map temperature to 0-100 scale for color (comfortable range 15-25°C)
      Math.max(0, Math.min(100, (data.temperature - 15) * 10 + 50)),
      30, // critical below 30 (= 12°C)
      70  // warning below 70 (= 22°C)
    );

    ctx.fillStyle = tempColor;
    const tempIcon = data.temperature < 10 ? '🥶' : data.temperature > 30 ? '🥵' : '🌡️';
    ctx.fillText(`${tempIcon} ${data.temperature.toFixed(1)}°C`, x + padding, currentY);
    currentY += lineHeight;

    // Warning
    if (data.temperature < 0 || data.temperature > 35) {
      ctx.fillStyle = theme.colors.error;
      ctx.fillText(data.temperature < 0 ? '⚠️ Freezing!' : '⚠️ Extreme heat!', x + padding, currentY);
    }
  },
};
