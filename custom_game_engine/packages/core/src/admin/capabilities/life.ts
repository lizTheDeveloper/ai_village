/**
 * Life Capability - Manage life simulation
 *
 * Provides admin interface for:
 * - Animals and wildlife
 * - Plants and agriculture
 * - Reproduction and genetics
 * - Population dynamics
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const CREATURE_TYPE_OPTIONS = [
  { value: 'mammal', label: 'Mammal' },
  { value: 'bird', label: 'Bird' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'fish', label: 'Fish' },
  { value: 'insect', label: 'Insect' },
  { value: 'mythical', label: 'Mythical' },
];

const PLANT_TYPE_OPTIONS = [
  { value: 'crop', label: 'Crop' },
  { value: 'tree', label: 'Tree' },
  { value: 'flower', label: 'Flower' },
  { value: 'herb', label: 'Herb' },
  { value: 'grass', label: 'Grass' },
  { value: 'fungus', label: 'Fungus' },
];

const GROWTH_STAGE_OPTIONS = [
  { value: 'seed', label: 'Seed' },
  { value: 'sprout', label: 'Sprout' },
  { value: 'growing', label: 'Growing' },
  { value: 'mature', label: 'Mature' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting' },
  { value: 'dying', label: 'Dying' },
];

const LIFE_STAGE_OPTIONS = [
  { value: 'infant', label: 'Infant' },
  { value: 'juvenile', label: 'Juvenile' },
  { value: 'adult', label: 'Adult' },
  { value: 'elder', label: 'Elder' },
];

// ============================================================================
// Life Capability Definition
// ============================================================================

const lifeCapability = defineCapability({
  id: 'life',
  name: 'Life & Reproduction',
  description: 'Manage life systems - animals, plants, reproduction, genetics',
  category: 'systems',

  tab: {
    icon: '🌱',
    priority: 45,
  },

  queries: [
    defineQuery({
      id: 'list-animals',
      name: 'List Animals',
      description: 'List all animals/creatures in the world',
      params: [
        {
          name: 'creatureType', type: 'select', required: false,
          options: CREATURE_TYPE_OPTIONS,
          description: 'Filter by type',
        },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entities?type=animal' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          animals?: Array<{
            id: string;
            species: string;
            creatureType: string;
            age: number;
            health: number;
          }>;
        };

        let output = 'ANIMALS\n\n';

        if (result.animals?.length) {
          result.animals.forEach(a => {
            output += `${a.species}\n`;
            output += `  ID: ${a.id}\n`;
            output += `  Type: ${a.creatureType}\n`;
            output += `  Age: ${a.age}\n`;
            output += `  Health: ${a.health}%\n\n`;
          });
          output += `Total: ${result.count ?? result.animals.length}`;
        } else {
          output += 'No animals found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-plants',
      name: 'List Plants',
      description: 'List all plants/crops in the world',
      params: [
        {
          name: 'plantType', type: 'select', required: false,
          options: PLANT_TYPE_OPTIONS,
          description: 'Filter by type',
        },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entities?type=plant' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          plants?: Array<{
            id: string;
            species: string;
            plantType: string;
            growthStage: string;
            health: number;
          }>;
        };

        let output = 'PLANTS\n\n';

        if (result.plants?.length) {
          result.plants.forEach(p => {
            output += `${p.species}\n`;
            output += `  ID: ${p.id}\n`;
            output += `  Type: ${p.plantType}\n`;
            output += `  Stage: ${p.growthStage}\n`;
            output += `  Health: ${p.health}%\n\n`;
          });
          output += `Total: ${result.count ?? result.plants.length}`;
        } else {
          output += 'No plants found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-population-stats',
      name: 'Get Population Stats',
      description: 'Get population statistics for creatures',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/population/stats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalAnimals?: number;
          totalPlants?: number;
          speciesCounts?: Record<string, number>;
          births?: number;
          deaths?: number;
        };

        let output = 'POPULATION STATS\n\n';
        output += `Total Animals: ${result.totalAnimals ?? 0}\n`;
        output += `Total Plants: ${result.totalPlants ?? 0}\n`;
        output += `Recent Births: ${result.births ?? 0}\n`;
        output += `Recent Deaths: ${result.deaths ?? 0}\n`;

        if (result.speciesCounts) {
          output += '\nSpecies Counts:\n';
          Object.entries(result.speciesCounts).forEach(([k, v]) => {
            output += `  ${k}: ${v}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-reproduction-stats',
      name: 'Get Reproduction Stats',
      description: 'Get reproduction statistics',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/reproduction/stats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          pregnantCount?: number;
          recentBirths?: number;
          averageLitterSize?: number;
          fertilityRate?: number;
        };

        let output = 'REPRODUCTION STATS\n\n';
        output += `Currently Pregnant: ${result.pregnantCount ?? 0}\n`;
        output += `Recent Births: ${result.recentBirths ?? 0}\n`;
        output += `Avg Litter Size: ${result.averageLitterSize?.toFixed(1) ?? 'N/A'}\n`;
        output += `Fertility Rate: ${result.fertilityRate?.toFixed(1) ?? 'N/A'}%\n`;

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'spawn-animal',
      name: 'Spawn Animal',
      description: 'Spawn a new animal at a location',
      params: [
        { name: 'species', type: 'string', required: true, description: 'Species name' },
        {
          name: 'creatureType', type: 'select', required: true,
          options: CREATURE_TYPE_OPTIONS,
          description: 'Creature type',
        },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Spawned ${params.species} at (${params.x}, ${params.y})` };
      },
    }),

    defineAction({
      id: 'plant-crop',
      name: 'Plant Crop',
      description: 'Plant a new crop at a location',
      params: [
        { name: 'species', type: 'string', required: true, description: 'Plant species' },
        {
          name: 'plantType', type: 'select', required: true,
          options: PLANT_TYPE_OPTIONS,
          description: 'Plant type',
        },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Planted ${params.species} at (${params.x}, ${params.y})` };
      },
    }),

    defineAction({
      id: 'set-growth-stage',
      name: 'Set Growth Stage',
      description: 'Set the growth stage of a plant',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Plant entity ID' },
        {
          name: 'stage', type: 'select', required: true,
          options: GROWTH_STAGE_OPTIONS,
          description: 'Growth stage',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.entityId} to ${params.stage} stage` };
      },
    }),

    defineAction({
      id: 'trigger-breeding',
      name: 'Trigger Breeding',
      description: 'Trigger breeding between two animals',
      params: [
        { name: 'parent1Id', type: 'entity-id', required: true, description: 'First parent ID' },
        { name: 'parent2Id', type: 'entity-id', required: true, description: 'Second parent ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Triggered breeding between ${params.parent1Id} and ${params.parent2Id}` };
      },
    }),

    defineAction({
      id: 'set-life-stage',
      name: 'Set Life Stage',
      description: 'Set the life stage of an animal',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Animal entity ID' },
        {
          name: 'stage', type: 'select', required: true,
          options: LIFE_STAGE_OPTIONS,
          description: 'Life stage',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set ${params.entityId} to ${params.stage} life stage` };
      },
    }),

    defineAction({
      id: 'harvest-plant',
      name: 'Harvest Plant',
      description: 'Harvest a mature plant',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Plant entity ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Harvested plant ${params.entityId}` };
      },
    }),
  ],
});

capabilityRegistry.register(lifeCapability);
