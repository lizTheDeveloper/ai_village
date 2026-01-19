/**
 * Identity Component Schema
 *
 * Test schema for Phase 2A integration
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Identity component type
 */
export interface IdentityComponent extends Component {
  type: 'identity';
  version: 1;
  name: string;
  age: number;
  species: 'human' | 'elf' | 'dwarf' | 'animal';
}

/**
 * Identity component schema
 */
export const IdentitySchema = autoRegister(
  defineComponent<IdentityComponent>({
    type: 'identity',
    version: 1,
    category: 'core',

    fields: {
      name: {
        type: 'string',
        required: true,
        default: 'Unknown',
        description: 'Display name of the entity',
        displayName: 'Name',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'text', group: 'basic', order: 1 },
        mutable: true,
      },

      species: {
        type: 'enum',
        enumValues: ['human', 'elf', 'dwarf', 'animal'] as const,
        required: true,
        default: 'human',
        description: 'Species type',
        displayName: 'Species',
        visibility: { player: true, llm: 'summarized', agent: true, dev: true },
        ui: { widget: 'dropdown', group: 'basic', order: 2 },
        mutable: false, // Can't change species
      },

      age: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 10000] as const,
        description: 'Age in days',
        displayName: 'Age',
        visibility: { player: true, llm: 'summarized', agent: true, dev: true },
        ui: { widget: 'slider', group: 'basic', order: 3 },
        mutable: true,
      },
    },

    ui: {
      icon: 'person',
      color: '#4CAF50',
      priority: 1,
    },

    llm: {
      promptSection: 'identity',
      summarize: (data) => {
        const name = data.name || 'Unknown';
        const species = data.species || 'human';
        const ageYears = typeof data.age === 'number' ? Math.floor(data.age / 365) : 0;
        // For agents with age in years (20-35 range), display directly
        const displayAge = ageYears > 0 ? ageYears : (data.age || 0);
        return `${name} (${species}, ${displayAge} years old)`;
      },
    },

    validate: (data): data is IdentityComponent => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        data.type === 'identity' &&
        'name' in data &&
        typeof data.name === 'string' &&
        'age' in data &&
        typeof data.age === 'number'
      );
    },

    createDefault: () => ({
      type: 'identity',
      version: 1,
      name: 'Unknown',
      species: 'human',
      age: 0,
    }),
  })
);
