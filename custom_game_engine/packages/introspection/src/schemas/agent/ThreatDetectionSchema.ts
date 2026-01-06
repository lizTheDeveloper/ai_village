import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { ThreatDetectionComponent } from '@ai-village/core';

export const ThreatDetectionSchema = autoRegister(
  defineComponent<ThreatDetectionComponent>({
    type: 'threat_detection',
    version: 1,
    category: 'agent',
    description: 'Tracks nearby threats and calculates power differentials for auto-response (hostile agents, wild animals, projectiles)',

    fields: {
      threats: {
        type: 'array',
        required: true,
        default: [],
        description: 'Currently detected threats',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Threats',
          order: 1,
        },
      },
      currentResponse: {
        type: 'object',
        required: false,
        description: 'Current threat response (if auto-response triggered)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'Response',
          order: 1,
        },
      },
      ownPowerLevel: {
        type: 'number',
        required: true,
        default: 50,
        description: "Agent's estimated combat power (0-100)",
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Combat',
          order: 1,
        },
      },
      lastScanTime: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Last threat scan timestamp',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'Timestamps',
          order: 1,
        },
      },
      scanInterval: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Scan cooldown in ticks (default: 10 ticks = ~0.5 seconds)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'Configuration',
          order: 1,
        },
      },
    },

    ui: {
      icon: '👁️',
      color: '#E67E22',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Threat Awareness',
      summarize: (data: ThreatDetectionComponent) => {
        const threatCount = data.threats.length;
        if (threatCount === 0) return `No threats detected (power: ${data.ownPowerLevel})`;
        const response = data.currentResponse?.action || 'evaluating';
        return `${threatCount} threat${threatCount > 1 ? 's' : ''} detected, responding: ${response}`;
      },
    },

    createDefault: (): ThreatDetectionComponent => ({
      type: 'threat_detection',
      version: 1,
      threats: [],
      ownPowerLevel: 50,
      lastScanTime: 0,
      scanInterval: 10,
    }),
  })
);
