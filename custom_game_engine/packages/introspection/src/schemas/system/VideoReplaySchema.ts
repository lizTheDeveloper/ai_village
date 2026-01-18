import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { VideoReplayComponent } from '@ai-village/core';

/**
 * VideoReplaySchema - Introspection schema for VideoReplayComponent
 *
 * Tier 16: Miscellaneous
 * Category: System/Media
 *
 * Stores game state "video" as entity snapshots (not pixels).
 * Enables TV broadcasts and replay functionality with 1000x compression.
 */
export const VideoReplaySchema = autoRegister(
  defineComponent<VideoReplayComponent>({
    type: 'video_replay',
    version: 1,
    category: 'system',

    fields: {
      recordingId: {
        type: 'string',
        required: true,
        description: 'Links to RecordingComponent',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'metadata',
          order: 1,
        },
      },

      recordedBy: {
        type: 'string',
        required: true,
        description: 'Reporter agent ID',
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
          order: 2,
        },
      },

      recordedByName: {
        type: 'string',
        required: true,
        description: 'Reporter agent name',
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
          order: 3,
        },
      },

      startTick: {
        type: 'number',
        required: true,
        description: 'Recording start tick',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'timestamps',
          order: 4,
        },
      },

      status: {
        type: 'string',
        required: true,
        description: 'Recording status (recording, completed, corrupted)',
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
          order: 5,
        },
      },

      frameInterval: {
        type: 'number',
        required: true,
        default: 10,
        description: 'Frame capture rate (ticks per frame)',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'settings',
          order: 6,
        },
      },

      maxFrames: {
        type: 'number',
        required: true,
        default: 360,
        description: 'Maximum frames to store',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'settings',
          order: 7,
        },
      },
    },

    ui: {
      icon: '📹',
      color: '#FF6347',
      priority: 6,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Video Replay',
      summarize: (data: VideoReplayComponent) => {
        const frames = data.frames.length;
        const status = data.status;
        const duration = data.metadata.durationTicks;
        const quality = (data.metadata.quality * 100).toFixed(0);
        return `Video replay (${status}): ${frames} frames, ${duration} ticks, quality ${quality}%`;
      },
    },

    validate: (data): data is VideoReplayComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const v = data as Record<string, unknown>;

      // Check required type field
      if (!('type' in v) || v.type !== 'video_replay') return false;

      // Check required string fields
      if (!('recordingId' in v) || typeof v.recordingId !== 'string') return false;
      if (!('recordedBy' in v) || typeof v.recordedBy !== 'string') return false;
      if (!('recordedByName' in v) || typeof v.recordedByName !== 'string') return false;
      if (!('status' in v) || typeof v.status !== 'string') return false;

      // Check required number fields
      if (!('startTick' in v) || typeof v.startTick !== 'number') return false;
      if (!('frameInterval' in v) || typeof v.frameInterval !== 'number') return false;
      if (!('maxFrames' in v) || typeof v.maxFrames !== 'number') return false;

      // Check frames array
      if (!('frames' in v) || !Array.isArray(v.frames)) return false;

      // Check metadata object and its required fields
      if (!('metadata' in v) || typeof v.metadata !== 'object' || v.metadata === null) return false;
      const metadata = v.metadata as Record<string, unknown>;
      if (!('durationTicks' in metadata) || typeof metadata.durationTicks !== 'number') return false;
      if (!('entityCount' in metadata) || typeof metadata.entityCount !== 'number') return false;
      if (!('quality' in metadata) || typeof metadata.quality !== 'number') return false;

      return true;
    },

    createDefault: (): VideoReplayComponent => ({
      type: 'video_replay',
      version: 1,
      recordingId: 'recording_default',
      recordedBy: 'agent_default',
      recordedByName: 'Default Reporter',
      startTick: 0,
      frames: [],
      frameInterval: 10,
      maxFrames: 360,
      status: 'recording',
      metadata: {
        durationTicks: 0,
        entityCount: 0,
        shotTypes: [],
        quality: 0,
        storageSizeBytes: 0,
      },
    }),
  })
);
