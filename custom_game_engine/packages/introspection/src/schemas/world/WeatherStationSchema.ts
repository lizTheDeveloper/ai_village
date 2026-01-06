/**
 * Weather Station Component Schema
 *
 * Weather monitoring and forecasting facility
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { WeatherStationComponent } from '@ai-village/core';

export const WeatherStationSchema = autoRegister(
  defineComponent<WeatherStationComponent>({
    type: 'weather_station',
    version: 1,
    category: 'world',

    fields: {
      current: {
        type: 'object',
        required: true,
        default: {
          temperature: 72,
          windSpeed: 0,
          conditions: 'clear',
        },
        displayName: 'Current Weather',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'weather',
          order: 1,
          icon: '☀️',
        },
        mutable: true,
      },

      forecast: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        maxLength: 24,
        displayName: 'Forecast',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'forecast',
          order: 10,
        },
        mutable: true,
      },

      warnings: {
        type: 'array',
        itemType: 'object',
        required: true,
        default: [],
        displayName: 'Warnings',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'alerts',
          order: 20,
          icon: '⚠️',
        },
        mutable: true,
      },

      agentsAtRisk: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        displayName: 'Agents at Risk',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'alerts',
          order: 21,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🌤️',
      color: '#03A9F4',
      priority: 5,
    },

    llm: {
      promptSection: 'Environment',
      summarize: (data: WeatherStationComponent) => {
        const temp = data.current.temperature;
        const conditions = data.current.conditions;
        const warnings = data.warnings.length;
        const atRisk = data.agentsAtRisk.length;
        const warningText = warnings > 0 ? ` (${warnings} warnings, ${atRisk} at risk!)` : '';
        return `Weather: ${temp}°F, ${conditions}${warningText}`;
      },
    },

    createDefault: (): WeatherStationComponent => ({
      type: 'weather_station',
      version: 1,
      current: {
        temperature: 72,
        windSpeed: 0,
        conditions: 'clear',
      },
      forecast: [],
      warnings: [],
      agentsAtRisk: [],
    }),
  })
);
