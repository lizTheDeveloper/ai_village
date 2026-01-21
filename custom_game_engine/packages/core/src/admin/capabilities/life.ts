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
] as const;

const PLANT_TYPE_OPTIONS = [
  { value: 'crop', label: 'Crop' },
  { value: 'tree', label: 'Tree' },
  { value: 'flower', label: 'Flower' },
  { value: 'herb', label: 'Herb' },
  { value: 'grass', label: 'Grass' },
  { value: 'fungus', label: 'Fungus' },
] as const;

const GROWTH_STAGE_OPTIONS = [
  { value: 'seed', label: 'Seed' },
  { value: 'sprout', label: 'Sprout' },
  { value: 'growing', label: 'Growing' },
  { value: 'mature', label: 'Mature' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting' },
  { value: 'dying', label: 'Dying' },
] as const;

const LIFE_STAGE_OPTIONS = [
  { value: 'infant', label: 'Infant' },
  { value: 'juvenile', label: 'Juvenile' },
  { value: 'adult', label: 'Adult' },
  { value: 'elder', label: 'Elder' },
] as const;

// ============================================================================
// QUERIES
// ============================================================================

const listAnimals = defineQuery({
  id: 'list-animals',
  name: 'List Animals',
  description: 'List all animals/creatures in the world',
  parameters: [
    {
      name: 'creatureType',
      type: 'select',
      description: 'Filter by creature type',
      required: false,
      options: CREATURE_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum results',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const creatureType = params.creatureType as string | undefined;
    const limit = (params.limit as number) || 50;

    // Query entities with animal/creature components
    const animals = world.query().with('animal').executeEntities();

    const results: Array<{
      id: string;
      species: string;
      creatureType: string;
      age: number;
      health: number;
      position: { x: number; y: number } | null;
    }> = [];

    for (const entity of animals) {
      const animal = entity.getComponent('animal') as any;
      const health = entity.getComponent('health') as any;
      const position = entity.getComponent('position') as any;

      if (creatureType && animal?.creatureType !== creatureType) {
        continue;
      }

      results.push({
        id: entity.id,
        species: animal?.species || 'unknown',
        creatureType: animal?.creatureType || 'mammal',
        age: animal?.age || 0,
        health: health?.current || health?.hp || 100,
        position: position ? { x: position.x, y: position.y } : null,
      });

      if (results.length >= limit) break;
    }

    return {
      success: true,
      data: {
        totalAnimals: animals.length,
        count: results.length,
        animals: results,
      },
    };
  },
});

const listPlants = defineQuery({
  id: 'list-plants',
  name: 'List Plants',
  description: 'List all plants in the world',
  parameters: [
    {
      name: 'plantType',
      type: 'select',
      description: 'Filter by plant type',
      required: false,
      options: PLANT_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'growthStage',
      type: 'select',
      description: 'Filter by growth stage',
      required: false,
      options: GROWTH_STAGE_OPTIONS.map(o => o.value),
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum results',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
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
      position: { x: number; y: number } | null;
    }> = [];

    for (const entity of plants) {
      const plant = entity.getComponent('plant') as any;
      const position = entity.getComponent('position') as any;

      if (plantType && plant?.plantType !== plantType) {
        continue;
      }
      if (growthStage && plant?.growthStage !== growthStage) {
        continue;
      }

      results.push({
        id: entity.id,
        species: plant?.species || 'unknown',
        plantType: plant?.plantType || 'crop',
        growthStage: plant?.growthStage || 'seed',
        growthProgress: plant?.growthProgress || 0,
        health: plant?.health || 100,
        position: position ? { x: position.x, y: position.y } : null,
      });

      if (results.length >= limit) break;
    }

    return {
      success: true,
      data: {
        totalPlants: plants.length,
        count: results.length,
        plants: results,
      },
    };
  },
});

const getPopulationStats = defineQuery({
  id: 'get-population-stats',
  name: 'Get Population Stats',
  description: 'Get population statistics for all life forms',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Count different life forms
    const agents = world.query().with('agent').executeEntities();
    const animals = world.query().with('animal').executeEntities();
    const plants = world.query().with('plant').executeEntities();

    // Get age distribution for agents
    const ageGroups = { infant: 0, juvenile: 0, adult: 0, elder: 0 };
    for (const agent of agents) {
      const identity = agent.getComponent('identity') as any;
      const age = identity?.age || 0;
      if (age < 3) ageGroups.infant++;
      else if (age < 18) ageGroups.juvenile++;
      else if (age < 60) ageGroups.adult++;
      else ageGroups.elder++;
    }

    // Get gender distribution
    const genderDist = { male: 0, female: 0, other: 0 };
    for (const agent of agents) {
      const identity = agent.getComponent('identity') as any;
      const gender = identity?.gender || 'other';
      if (gender === 'male') genderDist.male++;
      else if (gender === 'female') genderDist.female++;
      else genderDist.other++;
    }

    return {
      success: true,
      data: {
        agentCount: agents.length,
        animalCount: animals.length,
        plantCount: plants.length,
        totalLifeForms: agents.length + animals.length + plants.length,
        agentAgeDistribution: ageGroups,
        agentGenderDistribution: genderDist,
      },
    };
  },
});

const getReproductionStats = defineQuery({
  id: 'get-reproduction-stats',
  name: 'Get Reproduction Stats',
  description: 'Get reproduction and birth statistics',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find agents with reproductive state
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
      success: true,
      data: {
        reproductiveAgents: reproductiveAgents.length,
        pregnantCount,
        fertileMales,
        fertileFemales,
      },
    };
  },
});

const getGeneticDiversity = defineQuery({
  id: 'get-genetic-diversity',
  name: 'Get Genetic Diversity',
  description: 'Get genetic diversity information',
  parameters: [],
  execute: async (_params: Record<string, unknown>, ctx: AdminContext): Promise<QueryResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    // Find entities with genetics components
    const geneticEntities = world.query().with('genetics').executeEntities();

    const speciesCount = new Map<string, number>();
    let totalTraits = 0;
    let uniqueTraits = new Set<string>();

    for (const entity of geneticEntities) {
      const genetics = entity.getComponent('genetics') as any;
      const species = genetics?.species || 'unknown';
      speciesCount.set(species, (speciesCount.get(species) || 0) + 1);

      if (genetics?.traits) {
        for (const trait of genetics.traits) {
          totalTraits++;
          uniqueTraits.add(trait);
        }
      }
    }

    return {
      success: true,
      data: {
        entitiesWithGenetics: geneticEntities.length,
        speciesDistribution: Object.fromEntries(speciesCount),
        totalTraits,
        uniqueTraits: uniqueTraits.size,
        diversityIndex: geneticEntities.length > 0 ? uniqueTraits.size / geneticEntities.length : 0,
      },
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

const spawnAnimal = defineAction({
  id: 'spawn-animal',
  name: 'Spawn Animal',
  description: 'Spawn a new animal entity',
  parameters: [
    {
      name: 'species',
      type: 'string',
      description: 'Animal species name',
      required: true,
    },
    {
      name: 'creatureType',
      type: 'select',
      description: 'Creature type',
      required: false,
      options: CREATURE_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'x',
      type: 'number',
      description: 'X position',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Y position',
      required: true,
    },
    {
      name: 'age',
      type: 'number',
      description: 'Age in years',
      required: false,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const species = params.species as string;
    const creatureType = (params.creatureType as string) || 'mammal';
    const x = params.x as number;
    const y = params.y as number;
    const age = (params.age as number) || 1;

    // Create animal entity
    const entity = world.createEntity() as any;

    entity.addComponent({
      type: 'animal',
      species,
      creatureType,
      age,
    });

    entity.addComponent({
      type: 'position',
      x,
      y,
    });

    entity.addComponent({
      type: 'health',
      current: 100,
      max: 100,
    });

    // Emit spawn event
    world.eventBus.emit({
      type: 'life:animal_spawned',
      source: entity.id,
      data: {
        entityId: entity.id,
        species,
        creatureType,
        position: { x, y },
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Spawned ${species} (${creatureType}) at (${x}, ${y})`,
      data: { entityId: entity.id },
    };
  },
});

const plantCrop = defineAction({
  id: 'plant-crop',
  name: 'Plant Crop',
  description: 'Plant a new crop or plant',
  parameters: [
    {
      name: 'species',
      type: 'string',
      description: 'Plant species name',
      required: true,
    },
    {
      name: 'plantType',
      type: 'select',
      description: 'Plant type',
      required: false,
      options: PLANT_TYPE_OPTIONS.map(o => o.value),
    },
    {
      name: 'x',
      type: 'number',
      description: 'X position',
      required: true,
    },
    {
      name: 'y',
      type: 'number',
      description: 'Y position',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const species = params.species as string;
    const plantType = (params.plantType as string) || 'crop';
    const x = params.x as number;
    const y = params.y as number;

    // Create plant entity
    const entity = world.createEntity() as any;

    entity.addComponent({
      type: 'plant',
      species,
      plantType,
      growthStage: 'seed',
      growthProgress: 0,
      health: 100,
    });

    entity.addComponent({
      type: 'position',
      x,
      y,
    });

    // Emit plant event
    world.eventBus.emit({
      type: 'life:plant_planted',
      source: entity.id,
      data: {
        entityId: entity.id,
        species,
        plantType,
        position: { x, y },
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Planted ${species} (${plantType}) at (${x}, ${y})`,
      data: { entityId: entity.id },
    };
  },
});

const setGrowthStage = defineAction({
  id: 'set-growth-stage',
  name: 'Set Growth Stage',
  description: 'Set the growth stage of a plant',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Plant entity ID',
      required: true,
    },
    {
      name: 'growthStage',
      type: 'select',
      description: 'Target growth stage',
      required: true,
      options: GROWTH_STAGE_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;
    const growthStage = params.growthStage as string;

    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const plant = entity.getComponent('plant') as any;
    if (!plant) {
      return { success: false, error: `Entity ${entityId} is not a plant` };
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
});

const triggerBreeding = defineAction({
  id: 'trigger-breeding',
  name: 'Trigger Breeding',
  description: 'Trigger breeding between two compatible entities',
  parameters: [
    {
      name: 'parent1Id',
      type: 'string',
      description: 'First parent entity ID',
      required: true,
    },
    {
      name: 'parent2Id',
      type: 'string',
      description: 'Second parent entity ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const parent1Id = params.parent1Id as string;
    const parent2Id = params.parent2Id as string;

    const parent1 = world.getEntity(parent1Id);
    const parent2 = world.getEntity(parent2Id);

    if (!parent1) {
      return { success: false, error: `Parent 1 (${parent1Id}) not found` };
    }
    if (!parent2) {
      return { success: false, error: `Parent 2 (${parent2Id}) not found` };
    }

    // Emit mating event
    world.eventBus.emit({
      type: 'reproduction:mating_initiated',
      source: parent1Id,
      data: {
        parent1Id,
        parent2Id,
        tick: world.tick,
      },
    });

    return {
      success: true,
      message: `Breeding initiated between ${parent1Id} and ${parent2Id}`,
    };
  },
});

const setLifeStage = defineAction({
  id: 'set-life-stage',
  name: 'Set Life Stage',
  description: 'Set the life stage of an agent',
  parameters: [
    {
      name: 'agentId',
      type: 'string',
      description: 'Agent entity ID',
      required: true,
    },
    {
      name: 'lifeStage',
      type: 'select',
      description: 'Target life stage',
      required: true,
      options: LIFE_STAGE_OPTIONS.map(o => o.value),
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const agentId = params.agentId as string;
    const lifeStage = params.lifeStage as string;

    const entity = world.getEntity(agentId);
    if (!entity) {
      return { success: false, error: `Agent ${agentId} not found` };
    }

    // Map life stage to age
    const ageMap: Record<string, number> = {
      infant: 1,
      juvenile: 10,
      adult: 25,
      elder: 65,
    };

    const targetAge = ageMap[lifeStage] || 25;

    // Update identity component with new age
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
});

const harvestPlant = defineAction({
  id: 'harvest-plant',
  name: 'Harvest Plant',
  description: 'Harvest a mature plant',
  parameters: [
    {
      name: 'entityId',
      type: 'string',
      description: 'Plant entity ID',
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>, ctx: AdminContext): Promise<ActionResult> => {
    const { world } = ctx;
    if (!world) {
      return { success: false, error: 'No active world' };
    }

    const entityId = params.entityId as string;

    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const plant = entity.getComponent('plant') as any;
    if (!plant) {
      return { success: false, error: `Entity ${entityId} is not a plant` };
    }

    if (plant.growthStage !== 'mature' && plant.growthStage !== 'fruiting') {
      return {
        success: false,
        error: `Plant is not ready for harvest (current stage: ${plant.growthStage})`,
      };
    }

    // Emit harvest event
    world.eventBus.emit({
      type: 'life:plant_harvested',
      source: entityId,
      data: {
        entityId,
        species: plant.species,
        plantType: plant.plantType,
        tick: world.tick,
      },
    });

    // Reset plant to seed stage or remove it based on type
    if (plant.plantType === 'tree') {
      (entity as any).updateComponent('plant', (current: any) => ({
        ...current,
        growthStage: 'mature',
        growthProgress: 80,
      }));
    } else {
      // Remove annual plants
      world.removeEntity(entityId);
    }

    return {
      success: true,
      message: `Harvested ${plant.species}`,
    };
  },
});

// ============================================================================
// CAPABILITY REGISTRATION
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
    listAnimals,
    listPlants,
    getPopulationStats,
    getReproductionStats,
    getGeneticDiversity,
  ],
  actions: [
    spawnAnimal,
    plantCrop,
    setGrowthStage,
    triggerBreeding,
    setLifeStage,
    harvestPlant,
  ],
});

capabilityRegistry.register(lifeCapability);

export { lifeCapability };
