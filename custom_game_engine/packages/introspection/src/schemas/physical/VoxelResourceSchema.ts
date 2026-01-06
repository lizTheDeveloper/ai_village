/**
 * VoxelResource Component Schema
 *
 * Height-based resource system for voxel buildings
 * Phase 4, Batch 4 - Core Gameplay Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { VoxelResourceComponent } from '@ai-village/core';

/**
 * VoxelResource component schema
 */
export const VoxelResourceSchema = autoRegister(
  defineComponent<VoxelResourceComponent>({
    type: 'voxel_resource',
    version: 1,
    category: 'physical',
    description: 'Height-based resource with harvesting mechanics',

    fields: {
      resourceType: {
        type: 'enum',
        enumValues: ['tree', 'rock', 'ore_vein', 'crystal', 'coral'] as const,
        required: true,
        description: 'Type of voxel resource',
        displayName: 'Resource Type',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'resource',
          order: 1,
          icon: '⛏️',
        },
        mutable: false,
      },

      material: {
        type: 'string',
        required: true,
        description: 'Material dropped when harvested',
        displayName: 'Material',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'resource',
          order: 2,
        },
        mutable: false,
      },

      height: {
        type: 'number',
        required: true,
        default: 4,
        range: [0, 100] as const,
        description: 'Current height in levels',
        displayName: 'Height',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'dimensions',
          order: 10,
          icon: '📏',
        },
        mutable: true,
      },

      maxHeight: {
        type: 'number',
        required: true,
        default: 4,
        range: [0, 100] as const,
        description: 'Original/maximum height',
        displayName: 'Max Height',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'dimensions',
          order: 11,
        },
        mutable: false,
      },

      blocksPerLevel: {
        type: 'number',
        required: true,
        default: 4,
        range: [1, 100] as const,
        description: 'Resources dropped per level harvested',
        displayName: 'Blocks/Level',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'dimensions',
          order: 12,
        },
        mutable: false,
      },

      stability: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 100] as const,
        description: 'Structural stability (< 30 and base cut = falls)',
        displayName: 'Stability',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'physics',
          order: 20,
          icon: '⚠️',
        },
        mutable: true,
      },

      isFalling: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether structure is currently falling',
        displayName: 'Falling',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'physics',
          order: 21,
          icon: '⬇️',
        },
        mutable: true,
      },

      regenerationRate: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 10] as const,
        description: 'Levels per game hour (0 = no regen)',
        displayName: 'Regen Rate',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'regeneration',
          order: 30,
        },
        mutable: false,
      },

      lastHarvestTick: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Game tick when last harvested',
        displayName: 'Last Harvest',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'regeneration',
          order: 31,
        },
        mutable: true,
      },

      harvestable: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether this resource can be harvested',
        displayName: 'Harvestable',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'resource',
          order: 3,
        },
        mutable: true,
      },

      gatherDifficulty: {
        type: 'number',
        required: true,
        default: 1.0,
        range: [0.1, 10] as const,
        description: 'Harvest time multiplier',
        displayName: 'Difficulty',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'resource',
          order: 4,
        },
        mutable: false,
      },
    },

    ui: {
      icon: '⛏️',
      color: '#795548',
      priority: 5,
    },

    llm: {
      promptSection: 'resources',
      summarize: (data: VoxelResourceComponent) => {
        const total = data.height * data.blocksPerLevel;
        const stability = data.stability < 30 ? ' [UNSTABLE]' : data.stability < 60 ? ' [weakened]' : '';
        const falling = data.isFalling ? ' [FALLING]' : '';
        return `${data.material} ${data.resourceType} (${data.height}/${data.maxHeight} levels, ${total} blocks)${stability}${falling}`;
      },
      priority: 6,
    },

    createDefault: (): VoxelResourceComponent => ({
      type: 'voxel_resource',
      version: 1,
      resourceType: 'tree',
      material: 'wood',
      height: 4,
      maxHeight: 4,
      blocksPerLevel: 4,
      stability: 100,
      isFalling: false,
      regenerationRate: 0,
      lastHarvestTick: 0,
      harvestable: true,
      gatherDifficulty: 1.0,
    }),
  })
);
