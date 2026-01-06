/**
 * Machine Placement Component Schema
 *
 * Machine placement in voxel buildings.
 * Machines can be placed on floor tiles, optionally inside rooms.
 *
 * Phase 4+, Tier 12 - Buildings/Infrastructure Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Machine placement component type
 */
export interface MachinePlacementComponent extends Component {
  type: 'machine_placement';
  version: 1;

  isIndoors: boolean;
  roomId?: string;
  requiresShelter: boolean;
  requiresPower: boolean;
  placementRequirement: 'anywhere' | 'indoors' | 'outdoors' | 'on_power';
  footprint: { width: number; height: number };
  blockedTiles: Array<{ x: number; y: number }>;
  rotation: 0 | 90 | 180 | 270;
}

/**
 * Machine placement component schema
 */
export const MachinePlacementSchema = autoRegister(
  defineComponent<MachinePlacementComponent>({
    type: 'machine_placement',
    version: 1,
    category: 'world',

    fields: {
      isIndoors: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is this machine indoors (inside a room)?',
        displayName: 'Indoors',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'placement',
          order: 1,
        },
        mutable: true,
      },

      roomId: {
        type: 'string',
        required: false,
        default: undefined,
        description: 'Room ID if indoors',
        displayName: 'Room ID',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'placement',
          order: 2,
        },
        mutable: true,
      },

      requiresShelter: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Does this machine require shelter?',
        displayName: 'Requires Shelter',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'requirements',
          order: 1,
        },
        mutable: false,
      },

      requiresPower: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Does this machine require power connection?',
        displayName: 'Requires Power',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'requirements',
          order: 2,
        },
        mutable: false,
      },

      placementRequirement: {
        type: 'string',
        required: true,
        default: 'anywhere',
        description: 'Placement requirement',
        displayName: 'Placement',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'requirements',
          order: 3,
        },
        mutable: false,
        enumValues: ['anywhere', 'indoors', 'outdoors', 'on_power'],
      },

      footprint: {
        type: 'object',
        required: true,
        default: { width: 1, height: 1 },
        description: 'Footprint size (1x1, 2x2, 3x3, etc.)',
        displayName: 'Footprint',
        visibility: { player: true, llm: true, agent: false, user: true, dev: true },
        ui: {
          widget: 'json',
          group: 'size',
          order: 1,
        },
        mutable: false,
      },

      blockedTiles: {
        type: 'array',
        required: true,
        default: [],
        description: 'Adjacent tiles this machine blocks',
        displayName: 'Blocked Tiles',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'size',
          order: 2,
        },
        mutable: true,
        itemType: 'object',
      },

      rotation: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Rotation (0, 90, 180, 270 degrees)',
        displayName: 'Rotation',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'placement',
          order: 3,
        },
        mutable: true,
        enumValues: [0, 90, 180, 270],
      },
    },

    ui: {
      icon: '⚙️',
      color: '#708090',
      priority: 12,
    },

    llm: {
      promptSection: 'machines',
      priority: 12,
      summarize: (data) => {
        const location = data.isIndoors ? 'indoors' : 'outdoors';
        const size = `${data.footprint.width}x${data.footprint.height}`;

        return `${size} machine ${location}${data.requiresPower ? ', powered' : ''}${data.rotation !== 0 ? `, rotated ${data.rotation}°` : ''}`;
      },
    },

    validate: (data): data is MachinePlacementComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const mp = data as any;

      return (
        mp.type === 'machine_placement' &&
        typeof mp.isIndoors === 'boolean' &&
        typeof mp.requiresShelter === 'boolean' &&
        typeof mp.requiresPower === 'boolean' &&
        typeof mp.placementRequirement === 'string' &&
        typeof mp.footprint === 'object' &&
        Array.isArray(mp.blockedTiles) &&
        typeof mp.rotation === 'number'
      );
    },

    createDefault: () => ({
      type: 'machine_placement',
      version: 1,
      isIndoors: false,
      requiresShelter: false,
      requiresPower: true,
      placementRequirement: 'anywhere',
      footprint: { width: 1, height: 1 },
      blockedTiles: [],
      rotation: 0,
    }),
  })
);
