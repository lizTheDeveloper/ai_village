import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { WeatherComponent } from '@ai-village/core';

/**
 * WeatherSchema - Introspection schema for WeatherComponent
 *
 * Tier 7: World components
 * Complexity: Medium (weather state and modifiers)
 */
export const WeatherSchema = autoRegister(
  defineComponent<WeatherComponent>({
    type: 'weather',
    version: 1,
    category: 'world',

    fields: {
      weatherType: {
        type: 'enum',
        enumValues: ['clear', 'rain', 'snow', 'storm', 'fog'] as const,
        required: true,
        default: 'clear',
        visibility: {
          player: true,
          llm: true,  // Weather affects agent decisions
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'weather',
          order: 1,
          icon: '🌤️',
        },
        mutable: true,  // Dev can change weather
      },

      intensity: {
        type: 'number',
        range: [0, 1],
        required: true,
        default: 0.5,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'weather',
          order: 2,
        },
        mutable: true,
      },

      duration: {
        type: 'number',
        range: [0, 10000],
        required: true,
        default: 1000,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'weather',
          order: 3,
        },
        mutable: true,
      },

      tempModifier: {
        type: 'number',
        range: [-50, 50],
        required: true,
        default: 0,
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'effects',
          order: 4,
        },
        mutable: true,
      },

      movementModifier: {
        type: 'number',
        range: [-1, 1],
        required: true,
        default: 0,
        visibility: {
          player: false,
          llm: true,  // Affects decisions
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'effects',
          order: 5,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌤️',
      color: '#03A9F4',
      priority: 8,
    },

    llm: {
      promptSection: 'Weather',
      summarize: (data: WeatherComponent) => {
        const intensity = data.intensity > 0.7 ? 'heavy' : data.intensity > 0.3 ? 'moderate' : 'light';
        const weather = `${intensity} ${data.weatherType}`;

        const effects: string[] = [];
        if (data.tempModifier !== 0) {
          effects.push(`${data.tempModifier > 0 ? '+' : ''}${data.tempModifier}°`);
        }
        if (data.movementModifier < 0) {
          effects.push('slower movement');
        }

        return effects.length > 0
          ? `${weather} (${effects.join(', ')})`
          : weather;
      },
    },

    validate: (data: unknown): data is WeatherComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as Record<string, unknown>;
      return typeof comp.weatherType === 'string'
        && typeof comp.intensity === 'number'
        && typeof comp.duration === 'number';
    },

    createDefault: () => ({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 1000,
      tempModifier: 0,
      movementModifier: 0,
    }),
  })
);
