import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { RecordingComponent } from '@ai-village/core';

/**
 * RecordingSchema - Introspection schema for RecordingComponent
 *
 * Batch 5: Soul & Realms (Meta/Publishing)
 * Category: System/Media
 */
export const RecordingSchema = autoRegister(
  defineComponent<RecordingComponent>({
    type: 'recording',
    version: 1,
    category: 'system',

    fields: {
      mediaType: {
        type: 'string',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'media',
          order: 1,
        },
      },

      category: {
        type: 'string',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'media',
          order: 2,
        },
      },

      status: {
        type: 'string',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'state',
          order: 3,
        },
      },

      quality: {
        type: 'number',
        required: true,
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'technical',
          order: 4,
        },
      },

      recordedBy: {
        type: 'string',
        required: true,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 5,
        },
      },

      reporterName: {
        type: 'string',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 6,
        },
      },

      durationTicks: {
        type: 'number',
        required: true,
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'technical',
          order: 7,
        },
      },

      subjectNames: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'content',
          order: 8,
        },
      },

      description: {
        type: 'string',
        required: true,
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'content',
          order: 9,
        },
      },

      transcript: {
        type: 'string',
        required: false,
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'content',
          order: 10,
        },
      },

      fileSizeKB: {
        type: 'number',
        required: true,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'technical',
          order: 11,
        },
      },

      location: {
        type: 'object',
        required: true,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 12,
        },
      },

      startedTick: {
        type: 'number',
        required: true,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 13,
        },
      },

      subjectIds: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 14,
        },
      },

      equipmentQuality: {
        type: 'number',
        required: true,
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'technical',
          order: 15,
        },
      },
    },

    ui: {
      icon: '📹',
      color: '#DC143C',
      priority: 5,
      devToolsPanel: false,
    },

    llm: {
      promptSection: 'Recording',
      summarize: (data: RecordingComponent) => {
        const type = data.mediaType;
        const category = data.category;
        const status = data.status;
        const subjects = data.subjectNames.length > 0 ? ` of ${data.subjectNames.join(', ')}` : '';
        return `${type} ${category} by ${data.reporterName} (${status})${subjects}`;
      },
    },

    validate: (data): data is RecordingComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const r = data as any;

      return (
        r.type === 'recording' &&
        typeof r.mediaType === 'string' &&
        typeof r.category === 'string' &&
        typeof r.status === 'string' &&
        typeof r.quality === 'number' &&
        typeof r.location === 'object' &&
        typeof r.recordedBy === 'string' &&
        typeof r.reporterName === 'string' &&
        typeof r.startedTick === 'number' &&
        typeof r.durationTicks === 'number' &&
        Array.isArray(r.subjectIds) &&
        Array.isArray(r.subjectNames) &&
        typeof r.equipmentQuality === 'number' &&
        typeof r.fileSizeKB === 'number'
      );
    },

    createDefault: (): RecordingComponent => ({
      type: 'recording',
      version: 1,
      mediaType: 'video',
      category: 'event_coverage',
      status: 'recording',
      quality: 0.7,
      location: { x: 0, y: 0 },
      recordedBy: '',
      reporterName: 'Unknown Reporter',
      startedTick: 0,
      durationTicks: 0,
      subjectIds: [],
      subjectNames: [],
      description: '',
      equipmentQuality: 1.0,
      fileSizeKB: 0,
    }),
  })
);
