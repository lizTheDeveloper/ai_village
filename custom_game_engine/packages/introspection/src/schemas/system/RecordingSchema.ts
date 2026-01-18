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
      const r = data as Record<string, unknown>;

      // Required: type field
      if (!('type' in r) || r.type !== 'recording') return false;

      // Required: mediaType
      if (!('mediaType' in r) || typeof r.mediaType !== 'string') return false;

      // Required: category
      if (!('category' in r) || typeof r.category !== 'string') return false;

      // Required: status
      if (!('status' in r) || typeof r.status !== 'string') return false;

      // Required: quality
      if (!('quality' in r) || typeof r.quality !== 'number') return false;

      // Required: location (object)
      if (!('location' in r) || typeof r.location !== 'object' || r.location === null) return false;

      // Required: recordedBy
      if (!('recordedBy' in r) || typeof r.recordedBy !== 'string') return false;

      // Required: reporterName
      if (!('reporterName' in r) || typeof r.reporterName !== 'string') return false;

      // Required: startedTick
      if (!('startedTick' in r) || typeof r.startedTick !== 'number') return false;

      // Required: durationTicks
      if (!('durationTicks' in r) || typeof r.durationTicks !== 'number') return false;

      // Required: subjectIds (array)
      if (!('subjectIds' in r) || !Array.isArray(r.subjectIds)) return false;

      // Required: subjectNames (array)
      if (!('subjectNames' in r) || !Array.isArray(r.subjectNames)) return false;

      // Required: equipmentQuality
      if (!('equipmentQuality' in r) || typeof r.equipmentQuality !== 'number') return false;

      // Required: fileSizeKB
      if (!('fileSizeKB' in r) || typeof r.fileSizeKB !== 'number') return false;

      // Optional: description (string)
      if ('description' in r && r.description !== undefined && typeof r.description !== 'string') return false;

      // Optional: transcript (string)
      if ('transcript' in r && r.transcript !== undefined && typeof r.transcript !== 'string') return false;

      return true;
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
