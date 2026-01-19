/**
 * Named Landmarks Component Schema
 *
 * World-level registry of all named landmarks.
 * Tracks terrain features discovered and named by agents.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Named landmarks component type
 */
export interface NamedLandmarksComponent extends Component {
  type: 'named_landmarks';
  version: 1;

  landmarks: Array<{
    id: string;
    x: number;
    y: number;
    featureType: string;
    name: string;
    namedBy: string;
    namedAt: number;
    metadata?: {
      elevation?: number;
      size?: number;
      description?: string;
    };
  }>;
}

/**
 * Named landmarks component schema
 */
export const NamedLandmarksSchema = autoRegister(
  defineComponent<NamedLandmarksComponent>({
    type: 'named_landmarks',
    version: 1,
    category: 'world',

    fields: {
      landmarks: {
        type: 'array',
        required: true,
        default: [],
        description: 'All named landmarks in the world',
        displayName: 'Landmarks',
        visibility: { player: true, llm: 'summarized', agent: true, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'landmarks',
          order: 1,
          icon: '🗺️',
        },
        mutable: true,
        itemType: 'object',
      },
    },

    ui: {
      icon: '🗺️',
      color: '#228B22',
      priority: 12,
    },

    llm: {
      promptSection: 'world',
      priority: 12,
      summarize: (data) => {
        if (data.landmarks.length === 0) {
          return 'No named landmarks';
        }

        const featureTypes = new Set(data.landmarks.map(l => l.featureType));
        const recentLandmark = data.landmarks[data.landmarks.length - 1];

        return `${data.landmarks.length} named ${data.landmarks.length === 1 ? 'landmark' : 'landmarks'} (${featureTypes.size} types). Latest: ${recentLandmark?.name || 'none'}`;
      },
    },

    validate: (data): data is NamedLandmarksComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const nl = data as Record<string, unknown>;

      return (
        nl.type === 'named_landmarks' &&
        Array.isArray(nl.landmarks)
      );
    },

    createDefault: () => ({
      type: 'named_landmarks',
      version: 1,
      landmarks: [],
    }),
  })
);
