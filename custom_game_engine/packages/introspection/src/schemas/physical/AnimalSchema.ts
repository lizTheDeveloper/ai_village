/**
 * Animal Component Schema
 *
 * Animal entities (wild and tamed animals)
 * Phase 4, Tier 2 - Physical Components
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

/**
 * Animal life stage enum
 */
export type AnimalLifeStage = 'baby' | 'juvenile' | 'adult' | 'elder';

/**
 * Animal state enum
 */
export type AnimalState = 'idle' | 'grazing' | 'drinking' | 'sleeping' | 'fleeing' | 'following';

/**
 * Animal component type
 * Matches: packages/core/src/components/AnimalComponent.ts
 */
export interface AnimalComponent extends Component {
  type: 'animal';
  version: 1;
  id: string;
  speciesId: string;
  name: string;
  position: { x: number; y: number };
  age: number;
  lifeStage: AnimalLifeStage;
  health: number;
  size: number;
  state: AnimalState;
  hunger: number;
  thirst: number;
  energy: number;
  stress: number;
  mood: number;
  wild: boolean;
  ownerId?: string;
  bondLevel: number;
  trustLevel: number;
  housingBuildingId?: string;
}

/**
 * Animal component schema
 */
export const AnimalSchema = autoRegister(
  defineComponent<AnimalComponent>({
    type: 'animal',
    version: 1,
    category: 'physical',

    fields: {
      speciesId: {
        type: 'string',
        required: true,
        description: 'Species identifier (sheep, cow, chicken, etc.)',
        displayName: 'Species',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 1,
          icon: '🐾',
        },
        mutable: false,
      },

      name: {
        type: 'string',
        required: true,
        description: 'Animal name',
        displayName: 'Name',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'identity',
          order: 2,
        },
        mutable: true,
      },

      age: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1000] as const,
        description: 'Age in days',
        displayName: 'Age',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'lifecycle',
          order: 10,
          icon: '📅',
        },
        mutable: true,
      },

      lifeStage: {
        type: 'enum',
        enumValues: ['baby', 'juvenile', 'adult', 'elder'] as const,
        required: true,
        default: 'adult',
        description: 'Current life stage',
        displayName: 'Life Stage',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'lifecycle',
          order: 11,
        },
        mutable: true,
      },

      health: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 100] as const,
        description: 'Health points (0 = dead, 100 = full health)',
        displayName: 'Health',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 20,
          icon: '❤️',
        },
        mutable: true,
      },

      hunger: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Hunger level (0 = full, 100 = starving)',
        displayName: 'Hunger',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 21,
          icon: '🍖',
        },
        mutable: true,
      },

      thirst: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Thirst level (0 = hydrated, 100 = dehydrated)',
        displayName: 'Thirst',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 22,
          icon: '💧',
        },
        mutable: true,
      },

      energy: {
        type: 'number',
        required: true,
        default: 100,
        range: [0, 100] as const,
        description: 'Energy level (0 = exhausted, 100 = energized)',
        displayName: 'Energy',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'vitals',
          order: 23,
          icon: '⚡',
        },
        mutable: true,
      },

      stress: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Stress level (0 = calm, 100 = panicked)',
        displayName: 'Stress',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'mood',
          order: 30,
          icon: '😰',
        },
        mutable: true,
      },

      mood: {
        type: 'number',
        required: true,
        default: 50,
        range: [0, 100] as const,
        description: 'Mood level (0 = miserable, 100 = happy)',
        displayName: 'Mood',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'mood',
          order: 31,
          icon: '😊',
        },
        mutable: true,
      },

      wild: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Whether animal is wild or tamed',
        displayName: 'Wild',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'taming',
          order: 40,
          icon: '🌿',
        },
        mutable: true,
      },

      bondLevel: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Bond with owner (0 = no bond, 100 = devoted)',
        displayName: 'Bond Level',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'taming',
          order: 41,
          icon: '💕',
        },
        mutable: true,
      },

      trustLevel: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 100] as const,
        description: 'Trust in humans (0 = fearful, 100 = trusting)',
        displayName: 'Trust Level',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'taming',
          order: 42,
          icon: '🤝',
        },
        mutable: true,
      },

      state: {
        type: 'enum',
        enumValues: ['idle', 'grazing', 'drinking', 'sleeping', 'fleeing', 'following'] as const,
        required: true,
        default: 'idle',
        description: 'Current behavior state',
        displayName: 'State',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'behavior',
          order: 50,
          icon: '🐾',
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🐾',
      color: '#8BC34A',
      priority: 3,
    },

    llm: {
      promptSection: 'animals',
      summarize: (data) => {
        const status = data.wild ? 'wild' : 'tamed';
        const vitals = `HP:${data.health} H:${data.hunger} T:${data.thirst} E:${data.energy}`;
        const bond = !data.wild && data.bondLevel > 0 ? ` bond:${data.bondLevel}` : '';

        return `${data.name} (${data.speciesId}, ${data.lifeStage} ${status}) [${vitals}]${bond}`;
      },
      priority: 6,
    },

    validate: (data): data is AnimalComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;

      // Required Component base fields
      if (!('type' in d) || d.type !== 'animal') return false;
      if (!('version' in d) || d.version !== 1) return false;
      if (!('id' in d) || typeof d.id !== 'string') return false;

      // Required AnimalComponent fields
      if (!('speciesId' in d) || typeof d.speciesId !== 'string') return false;
      if (!('name' in d) || typeof d.name !== 'string') return false;
      if (!('position' in d) || typeof d.position !== 'object' || d.position === null) return false;
      if (!('age' in d) || typeof d.age !== 'number' || d.age < 0) return false;
      if (!('lifeStage' in d) || !['baby', 'juvenile', 'adult', 'elder'].includes(d.lifeStage as string)) return false;
      if (!('health' in d) || typeof d.health !== 'number' || d.health < 0 || d.health > 100) {
        throw new RangeError(`Invalid health: ${('health' in d) ? d.health : 'undefined'} (must be 0-100)`);
      }
      if (!('size' in d) || typeof d.size !== 'number') return false;
      if (!('state' in d) || !['idle', 'grazing', 'drinking', 'sleeping', 'fleeing', 'following'].includes(d.state as string)) return false;
      if (!('hunger' in d) || typeof d.hunger !== 'number' || d.hunger < 0 || d.hunger > 100) {
        throw new RangeError(`Invalid hunger: ${('hunger' in d) ? d.hunger : 'undefined'} (must be 0-100)`);
      }
      if (!('thirst' in d) || typeof d.thirst !== 'number' || d.thirst < 0 || d.thirst > 100) return false;
      if (!('energy' in d) || typeof d.energy !== 'number' || d.energy < 0 || d.energy > 100) return false;
      if (!('stress' in d) || typeof d.stress !== 'number' || d.stress < 0 || d.stress > 100) return false;
      if (!('mood' in d) || typeof d.mood !== 'number' || d.mood < 0 || d.mood > 100) return false;
      if (!('wild' in d) || typeof d.wild !== 'boolean') return false;
      if (!('bondLevel' in d) || typeof d.bondLevel !== 'number' || d.bondLevel < 0 || d.bondLevel > 100) {
        throw new RangeError(`Invalid bondLevel: ${('bondLevel' in d) ? d.bondLevel : 'undefined'} (must be 0-100)`);
      }
      if (!('trustLevel' in d) || typeof d.trustLevel !== 'number' || d.trustLevel < 0 || d.trustLevel > 100) return false;

      // Optional fields
      if ('ownerId' in d && d.ownerId !== undefined && typeof d.ownerId !== 'string') return false;
      if ('housingBuildingId' in d && d.housingBuildingId !== undefined && typeof d.housingBuildingId !== 'string') return false;

      return true;
    },

    createDefault: () => ({
      type: 'animal',
      version: 1,
      id: '',
      speciesId: 'sheep',
      name: 'Unnamed Animal',
      position: { x: 0, y: 0 },
      age: 0,
      lifeStage: 'adult',
      health: 100,
      size: 1.0,
      state: 'idle',
      hunger: 0,
      thirst: 0,
      energy: 100,
      stress: 0,
      mood: 50,
      wild: true,
      bondLevel: 0,
      trustLevel: 0,
    }),
  })
);
