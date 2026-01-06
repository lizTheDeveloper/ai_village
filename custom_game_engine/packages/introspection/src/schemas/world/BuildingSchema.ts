/**
 * Building Component Schema
 *
 * Structures and buildings in the game world.
 * Phase 4, Tier 2 - World Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Building component type
 * Matches: packages/core/src/components/BuildingComponent.ts
 */
export interface BuildingComponent extends Component {
  type: 'building';
  version: 1;
  buildingType: string;
  tier: number;
  progress: number;
  isComplete: boolean;
  blocksMovement: boolean;
  storageCapacity: number;
  providesHeat: boolean;
  heatRadius: number;
  heatAmount: number;
  providesShade: boolean;
  shadeRadius: number;
  insulation: number;
  baseTemperature: number;
  weatherProtection: number;
  interior: boolean;
  interiorRadius: number;
  fuelRequired: boolean;
  currentFuel: number;
  maxFuel: number;
  fuelConsumptionRate: number;
  activeRecipe: string | null;
  animalCapacity: number;
  allowedSpecies: string[];
  currentOccupants: string[];
  cleanliness: number;
  isGovernanceBuilding: boolean;
  condition: number;
  requiredStaff: number;
  currentStaff: string[];
  governanceType?: string;
  resourceType?: string;
  requiresOpenArea?: boolean;
  ownerId?: string;
  ownerName?: string;
  accessType: 'communal' | 'personal' | 'shared';
  sharedWith: string[];
}

/**
 * Building component schema
 */
export const BuildingSchema = autoRegister(
  defineComponent<BuildingComponent>({
    type: 'building',
    version: 1,
    category: 'world',

    fields: {
      buildingType: {
        type: 'string',
        required: true,
        displayName: 'Building Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'building',
          order: 1,
          icon: '🏗️',
        },
        mutable: false,
      },

      tier: {
        type: 'number',
        required: true,
        default: 1,
        range: [1, 3] as const,
        displayName: 'Tier',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'building',
          order: 2,
        },
        mutable: true,
      },

      progress: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        displayName: 'Progress',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'construction',
          order: 3,
          icon: '🔨',
        },
        mutable: true,
      },

      isComplete: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Complete',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'construction',
          order: 4,
          icon: '✅',
        },
        mutable: true,
      },

      storageCapacity: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        displayName: 'Storage Capacity',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'storage',
          order: 5,
          icon: '📦',
        },
        mutable: true,
      },

      providesHeat: {
        type: 'boolean',
        required: true,
        default: false,
        displayName: 'Provides Heat',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'temperature',
          order: 10,
          icon: '🔥',
        },
        mutable: false,
      },

      heatRadius: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 20] as const,
        displayName: 'Heat Radius',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'temperature',
          order: 11,
        },
        mutable: true,
      },

      animalCapacity: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        displayName: 'Animal Capacity',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'animals',
          order: 20,
          icon: '🐄',
        },
        mutable: true,
      },

      currentOccupants: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        maxLength: 100,
        displayName: 'Current Occupants',
        visibility: {
          player: false,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'animals',
          order: 21,
        },
        mutable: true,
      },

      accessType: {
        type: 'enum',
        enumValues: ['communal', 'personal', 'shared'] as const,
        required: true,
        default: 'communal',
        displayName: 'Access Type',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'ownership',
          order: 30,
          icon: '🔐',
        },
        mutable: true,
      },

      ownerId: {
        type: 'string',
        required: false,
        displayName: 'Owner ID',
        visibility: {
          player: false,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'ownership',
          order: 31,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🏗️',
      color: '#795548',
      priority: 4,
    },

    llm: {
      promptSection: 'buildings',
      summarize: (data) => {
        const status = data.isComplete ? 'complete' : `${data.progress}% built`;
        const tier = data.tier > 1 ? ` tier ${data.tier}` : '';
        const access = data.accessType !== 'communal' ? ` (${data.accessType})` : '';
        const storage = data.storageCapacity > 0 ? `, stores ${data.storageCapacity} items` : '';
        const heat = data.providesHeat ? `, provides heat (${data.heatRadius} tiles)` : '';
        const animals = data.animalCapacity > 0 ? `, houses ${data.currentOccupants.length}/${data.animalCapacity} animals` : '';

        return `${data.buildingType}${tier} (${status})${access}${storage}${heat}${animals}`;
      },
      priority: 5,
    },

    validate: (data): data is BuildingComponent => {
      const d = data as any;

      if (!d || d.type !== 'building') return false;
      if (typeof d.buildingType !== 'string') return false;
      if (typeof d.tier !== 'number' || d.tier < 1 || d.tier > 3) {
        throw new RangeError(`Invalid tier: ${d.tier} (must be 1-3)`);
      }
      if (typeof d.progress !== 'number' || d.progress < 0 || d.progress > 100) {
        throw new RangeError(`Invalid progress: ${d.progress} (must be 0-100)`);
      }
      if (typeof d.isComplete !== 'boolean') return false;
      if (typeof d.blocksMovement !== 'boolean') return false;
      if (typeof d.storageCapacity !== 'number' || d.storageCapacity < 0) return false;
      if (!Array.isArray(d.currentOccupants)) return false;
      if (!['communal', 'personal', 'shared'].includes(d.accessType)) return false;

      return true;
    },

    createDefault: () => ({
      type: 'building',
      version: 1,
      buildingType: 'tent',
      tier: 1,
      progress: 0,
      isComplete: false,
      blocksMovement: true,
      storageCapacity: 0,
      providesHeat: false,
      heatRadius: 0,
      heatAmount: 0,
      providesShade: false,
      shadeRadius: 0,
      insulation: 0,
      baseTemperature: 0,
      weatherProtection: 0,
      interior: false,
      interiorRadius: 0,
      fuelRequired: false,
      currentFuel: 0,
      maxFuel: 0,
      fuelConsumptionRate: 0,
      activeRecipe: null,
      animalCapacity: 0,
      allowedSpecies: [],
      currentOccupants: [],
      cleanliness: 100,
      isGovernanceBuilding: false,
      condition: 100,
      requiredStaff: 0,
      currentStaff: [],
      accessType: 'communal',
      sharedWith: [],
    }),
  })
);
