/**
 * Life Admin Capability
 *
 * Comprehensive life simulation dashboard for LLM control:
 * - Animals and wildlife
 * - Plants and agriculture
 * - Reproduction and genetics
 * - Population dynamics
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// OPTIONS
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
  { value: 'infant', label: 'Infant (age 1)' },
  { value: 'juvenile', label: 'Juvenile (age 10)' },
  { value: 'adult', label: 'Adult (age 25)' },
  { value: 'elder', label: 'Elder (age 65)' },
];

// ============================================================================
// CAPABILITY DEFINITION
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
        { name: 'creatureType', type: 'select', required: false, options: CREATURE_TYPE_OPTIONS, description: 'Filter by type' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const creatureType = params.creatureType as string | undefined;
        const limit = (params.limit as number) || 50;

        const animals = world.query().with('animal').executeEntities();

        const results: Array<{
          id: string;
          species: string;
          creatureType: string;
          age: number;
          health: number;
        }> = [];

        for (const entity of animals) {
          const animal = entity.getComponent('animal') as any;
          const health = entity.getComponent('health') as any;

          if (creatureType && animal?.creatureType !== creatureType) {
            continue;
          }

          results.push({
            id: entity.id,
            species: animal?.species || 'unknown',
            creatureType: animal?.creatureType || 'mammal',
            age: animal?.age || 0,
            health: health?.current || health?.hp || 100,
          });

          if (results.length >= limit) break;
        }

        return {
          totalAnimals: animals.length,
          count: results.length,
          animals: results,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'ANIMALS\n\n';
        output += `Total: ${result.totalAnimals} | Showing: ${result.count}\n\n`;

        for (const animal of result.animals) {
          output += `${animal.species} (${animal.creatureType})\n`;
          output += `  ID: ${animal.id}\n`;
          output += `  Age: ${animal.age} | Health: ${animal.health}\n\n`;
        }

        if (result.count === 0) {
          output += 'No animals found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-plants',
      name: 'List Plants',
      description: 'List all plants in the world',
      params: [
        { name: 'plantType', type: 'select', required: false, options: PLANT_TYPE_OPTIONS, description: 'Filter by type' },
        { name: 'growthStage', type: 'select', required: false, options: GROWTH_STAGE_OPTIONS, description: 'Filter by growth stage' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const plantType = params.plantType as string | undefined;
        const growthStage = params.growthStage as string | undefined;
        const limit = (params.limit as number) || 50;

        const plants = world.query().with('plant').executeEntities();

        const results: Array<{
          id: string;
          species: string;
          plantType: string;
          growthStage: string;
          growthProgress: number;
          health: number;
        }> = [];

        for (const entity of plants) {
          const plant = entity.getComponent('plant') as any;

          if (plantType && plant?.plantType !== plantType) continue;
          if (growthStage && plant?.growthStage !== growthStage) continue;

          results.push({
            id: entity.id,
            species: plant?.species || 'unknown',
            plantType: plant?.plantType || 'crop',
            growthStage: plant?.growthStage || 'seed',
            growthProgress: plant?.growthProgress || 0,
            health: plant?.health || 100,
          });

          if (results.length >= limit) break;
        }

        return {
          totalPlants: plants.length,
          count: results.length,
          plants: results,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'PLANTS\n\n';
        output += `Total: ${result.totalPlants} | Showing: ${result.count}\n\n`;

        for (const plant of result.plants) {
          output += `${plant.species} (${plant.plantType})\n`;
          output += `  Stage: ${plant.growthStage} (${plant.growthProgress}%)\n`;
          output += `  Health: ${plant.health}\n\n`;
        }

        if (result.count === 0) {
          output += 'No plants found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-population-stats',
      name: 'Get Population Stats',
      description: 'Get population statistics for all life forms',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agents = world.query().with('agent').executeEntities();
        const animals = world.query().with('animal').executeEntities();
        const plants = world.query().with('plant').executeEntities();

        const ageGroups = { infant: 0, juvenile: 0, adult: 0, elder: 0 };
        const genderDist = { male: 0, female: 0, other: 0 };

        for (const agent of agents) {
          const identity = agent.getComponent('identity') as any;
          const age = identity?.age || 0;

          if (age < 3) ageGroups.infant++;
          else if (age < 18) ageGroups.juvenile++;
          else if (age < 60) ageGroups.adult++;
          else ageGroups.elder++;

          const gender = identity?.gender || 'other';
          if (gender === 'male') genderDist.male++;
          else if (gender === 'female') genderDist.female++;
          else genderDist.other++;
        }

        return {
          agentCount: agents.length,
          animalCount: animals.length,
          plantCount: plants.length,
          totalLifeForms: agents.length + animals.length + plants.length,
          ageDistribution: ageGroups,
          genderDistribution: genderDist,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'POPULATION STATS\n\n';
        output += `Agents: ${result.agentCount}\n`;
        output += `Animals: ${result.animalCount}\n`;
        output += `Plants: ${result.plantCount}\n`;
        output += `Total: ${result.totalLifeForms}\n\n`;
        output += 'Age Distribution:\n';
        output += `  Infant: ${result.ageDistribution.infant}\n`;
        output += `  Juvenile: ${result.ageDistribution.juvenile}\n`;
        output += `  Adult: ${result.ageDistribution.adult}\n`;
        output += `  Elder: ${result.ageDistribution.elder}\n\n`;
        output += 'Gender Distribution:\n';
        output += `  Male: ${result.genderDistribution.male}\n`;
        output += `  Female: ${result.genderDistribution.female}\n`;
        output += `  Other: ${result.genderDistribution.other}\n`;
        return output;
      },
    }),

    defineQuery({
      id: 'get-reproduction-stats',
      name: 'Get Reproduction Stats',
      description: 'Get reproduction and birth statistics',
      params: [],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const reproductiveAgents = world.query().with('reproductive_state').executeEntities();

        let pregnantCount = 0;
        let fertileMales = 0;
        let fertileFemales = 0;

        for (const agent of reproductiveAgents) {
          const repro = agent.getComponent('reproductive_state') as any;
          if (repro?.isPregnant) pregnantCount++;
          if (repro?.isFertile) {
            const identity = agent.getComponent('identity') as any;
            if (identity?.gender === 'male') fertileMales++;
            else if (identity?.gender === 'female') fertileFemales++;
          }
        }

        return {
          reproductiveAgents: reproductiveAgents.length,
          pregnantCount,
          fertileMales,
          fertileFemales,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as any;
        let output = 'REPRODUCTION STATS\n\n';
        output += `Reproductive Agents: ${result.reproductiveAgents}\n`;
        output += `Pregnant: ${result.pregnantCount}\n`;
        output += `Fertile Males: ${result.fertileMales}\n`;
        output += `Fertile Females: ${result.fertileFemales}\n`;
        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'spawn-animal',
      name: 'Spawn Animal',
      description: 'Spawn a new animal entity',
      params: [
        { name: 'species', type: 'string', required: true, description: 'Animal species name' },
        { name: 'creatureType', type: 'select', required: false, options: CREATURE_TYPE_OPTIONS, description: 'Creature type' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
        { name: 'age', type: 'number', required: false, description: 'Age in years' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const species = params.species as string;
        const creatureType = (params.creatureType as string) || 'mammal';
        const x = params.x as number;
        const y = params.y as number;
        const age = (params.age as number) || 1;

        const entity = world.createEntity() as any;

        entity.addComponent({ type: 'animal', species, creatureType, age });
        entity.addComponent({ type: 'position', x, y });
        entity.addComponent({ type: 'health', current: 100, max: 100 });

        world.eventBus.emit({
          type: 'life:animal_spawned',
          source: entity.id,
          data: { entityId: entity.id, species, creatureType, position: { x, y }, tick: world.tick },
        });

        return {
          success: true,
          message: `Spawned ${species} (${creatureType}) at (${x}, ${y})`,
          data: { entityId: entity.id },
        };
      },
    }),

    defineAction({
      id: 'plant-crop',
      name: 'Plant Crop',
      description: 'Plant a new crop or plant',
      params: [
        { name: 'species', type: 'string', required: true, description: 'Plant species name' },
        { name: 'plantType', type: 'select', required: false, options: PLANT_TYPE_OPTIONS, description: 'Plant type' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const species = params.species as string;
        const plantType = (params.plantType as string) || 'crop';
        const x = params.x as number;
        const y = params.y as number;

        const entity = world.createEntity() as any;

        entity.addComponent({
          type: 'plant',
          species,
          plantType,
          growthStage: 'seed',
          growthProgress: 0,
          health: 100,
        });
        entity.addComponent({ type: 'position', x, y });

        world.eventBus.emit({
          type: 'life:plant_planted',
          source: entity.id,
          data: { entityId: entity.id, species, plantType, position: { x, y }, tick: world.tick },
        });

        return {
          success: true,
          message: `Planted ${species} (${plantType}) at (${x}, ${y})`,
          data: { entityId: entity.id },
        };
      },
    }),

    defineAction({
      id: 'set-growth-stage',
      name: 'Set Growth Stage',
      description: 'Set the growth stage of a plant',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Plant entity ID' },
        { name: 'growthStage', type: 'select', required: true, options: GROWTH_STAGE_OPTIONS, description: 'Target growth stage' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const entityId = params.entityId as string;
        const growthStage = params.growthStage as string;

        const entity = world.getEntity(entityId);
        if (!entity) {
          throw new Error(`Entity ${entityId} not found`);
        }

        const plant = entity.getComponent('plant') as any;
        if (!plant) {
          throw new Error(`Entity ${entityId} is not a plant`);
        }

        const oldStage = plant.growthStage;
        (entity as any).updateComponent('plant', (current: any) => ({
          ...current,
          growthStage,
          growthProgress: growthStage === 'mature' || growthStage === 'fruiting' ? 100 : current.growthProgress,
        }));

        return {
          success: true,
          message: `Plant growth stage changed from ${oldStage} to ${growthStage}`,
        };
      },
    }),

    defineAction({
      id: 'trigger-breeding',
      name: 'Trigger Breeding',
      description: 'Trigger breeding between two compatible entities',
      params: [
        { name: 'parent1Id', type: 'entity-id', required: true, description: 'First parent entity ID' },
        { name: 'parent2Id', type: 'entity-id', required: true, description: 'Second parent entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const parent1Id = params.parent1Id as string;
        const parent2Id = params.parent2Id as string;

        const parent1 = world.getEntity(parent1Id);
        const parent2 = world.getEntity(parent2Id);

        if (!parent1) throw new Error(`Parent 1 (${parent1Id}) not found`);
        if (!parent2) throw new Error(`Parent 2 (${parent2Id}) not found`);

        world.eventBus.emit({
          type: 'reproduction:mating_initiated',
          source: parent1Id,
          data: { parent1Id, parent2Id, tick: world.tick },
        });

        return {
          success: true,
          message: `Breeding initiated between ${parent1Id} and ${parent2Id}`,
        };
      },
    }),

    defineAction({
      id: 'set-life-stage',
      name: 'Set Life Stage',
      description: 'Set the life stage of an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent entity ID' },
        { name: 'lifeStage', type: 'select', required: true, options: LIFE_STAGE_OPTIONS, description: 'Target life stage' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const agentId = params.agentId as string;
        const lifeStage = params.lifeStage as string;

        const entity = world.getEntity(agentId);
        if (!entity) {
          throw new Error(`Agent ${agentId} not found`);
        }

        const ageMap: Record<string, number> = { infant: 1, juvenile: 10, adult: 25, elder: 65 };
        const targetAge = ageMap[lifeStage] || 25;

        (entity as any).updateComponent('identity', (current: any) => ({
          ...current,
          age: targetAge,
          lifeStage,
        }));

        return {
          success: true,
          message: `Agent life stage set to ${lifeStage} (age: ${targetAge})`,
        };
      },
    }),

    defineAction({
      id: 'harvest-plant',
      name: 'Harvest Plant',
      description: 'Harvest a mature plant',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Plant entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        const { world } = context;
        if (!world) {
          throw new Error('No active world');
        }

        const entityId = params.entityId as string;

        const entity = world.getEntity(entityId);
        if (!entity) {
          throw new Error(`Entity ${entityId} not found`);
        }

        const plant = entity.getComponent('plant') as any;
        if (!plant) {
          throw new Error(`Entity ${entityId} is not a plant`);
        }

        if (plant.growthStage !== 'mature' && plant.growthStage !== 'fruiting') {
          throw new Error(`Plant is not ready for harvest (current stage: ${plant.growthStage})`);
        }

        world.eventBus.emit({
          type: 'life:plant_harvested',
          source: entityId,
          data: { entityId, species: plant.species, plantType: plant.plantType, tick: world.tick },
        });

        if (plant.plantType === 'tree') {
          (entity as any).updateComponent('plant', (current: any) => ({
            ...current,
            growthStage: 'mature',
            growthProgress: 80,
          }));
        } else {
          world.removeEntity(entityId);
        }

        return {
          success: true,
          message: `Harvested ${plant.species}`,
        };
      },
    }),
  ],
});

capabilityRegistry.register(lifeCapability);

export { lifeCapability };
