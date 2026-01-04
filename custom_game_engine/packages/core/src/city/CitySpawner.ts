/**
 * CitySpawner - Dev tools for spawning NPC cities
 *
 * Spawns complete cities with buildings, infrastructure, and AI-driven NPCs.
 * Cities can be observed to see emergent behavior, not scripted actions.
 */

import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';

/**
 * Available city templates for spawning
 */
export type CityTemplate =
  | 'medieval_village'    // Small farming village (10-20 NPCs)
  | 'trading_town'        // Market town (20-40 NPCs)
  | 'mining_settlement'   // Mountain mining town (15-30 NPCs)
  | 'coastal_port'        // Fishing and trading port (25-50 NPCs)
  | 'academic_city'       // University town (30-60 NPCs)
  | 'industrial_city'     // Factory and forge city (40-80 NPCs)
  | 'agricultural_hub'    // Farming and food processing (20-40 NPCs)
  | 'military_fortress'   // Fortified military base (30-50 NPCs)
  | 'magical_enclave'     // Wizard/mage city (15-30 NPCs)
  | 'nomadic_camp'        // Temporary tent settlement (10-25 NPCs)
  | 'underground_dwarven' // Dwarven fortress (25-50 NPCs)
  | 'flying_elven'        // Tree-top elven city (20-40 NPCs)
  | 'research_outpost'    // Scientific research station (10-20 NPCs)
  | 'religious_monastery' // Temple/monastery (15-30 NPCs)
  | 'frontier_outpost';   // Remote wilderness outpost (8-15 NPCs)

/**
 * City configuration for spawning
 */
export interface CitySpawnConfig {
  /** City template to use */
  template: CityTemplate;
  /** Center position of city */
  x: number;
  y: number;
  /** City name (auto-generated if not provided) */
  name?: string;
  /** Number of NPCs (overrides template default if provided) */
  agentCount?: number;
  /** Whether NPCs should use LLM (true) or scripted behavior (false) */
  useLLM?: boolean;
  /** Difficulty/complexity level (affects resource availability, challenges) */
  difficulty?: 'easy' | 'normal' | 'hard' | 'extreme';
}

/**
 * Information about a spawned city
 */
export interface SpawnedCityInfo {
  /** Unique city ID */
  cityId: string;
  /** City name */
  name: string;
  /** Template used */
  template: CityTemplate;
  /** Center position */
  position: { x: number; y: number };
  /** Number of buildings spawned */
  buildingCount: number;
  /** Number of NPCs spawned */
  agentCount: number;
  /** List of spawned agent IDs */
  agentIds: string[];
  /** List of spawned building IDs */
  buildingIds: string[];
  /** Districts in the city */
  districts: Array<{
    type: string;
    buildingCount: number;
  }>;
  /** Whether agents use LLM */
  useLLM: boolean;
}

/**
 * City template definitions with building layouts and agent configurations
 */
const CITY_TEMPLATES: Record<CityTemplate, {
  defaultAgentCount: number;
  buildings: Array<{ type: string; count: number }>;
  professions: string[];
  description: string;
}> = {
  'medieval_village': {
    defaultAgentCount: 15,
    buildings: [
      { type: 'house', count: 8 },
      { type: 'farm', count: 3 },
      { type: 'blacksmith', count: 1 },
      { type: 'tavern', count: 1 },
      { type: 'storage-chest', count: 2 },
    ],
    professions: ['farmer', 'blacksmith', 'merchant', 'guard'],
    description: 'A peaceful farming village with basic amenities',
  },
  'trading_town': {
    defaultAgentCount: 30,
    buildings: [
      { type: 'house', count: 12 },
      { type: 'shop', count: 4 },
      { type: 'warehouse', count: 2 },
      { type: 'tavern', count: 2 },
      { type: 'market', count: 1 },
    ],
    professions: ['merchant', 'trader', 'craftsman', 'guard'],
    description: 'A bustling trade hub with markets and shops',
  },
  'mining_settlement': {
    defaultAgentCount: 20,
    buildings: [
      { type: 'house', count: 8 },
      { type: 'mine', count: 2 },
      { type: 'forge', count: 2 },
      { type: 'storage-chest', count: 3 },
    ],
    professions: ['miner', 'blacksmith', 'engineer'],
    description: 'A mountain mining town extracting ore and gems',
  },
  'coastal_port': {
    defaultAgentCount: 35,
    buildings: [
      { type: 'house', count: 14 },
      { type: 'dock', count: 2 },
      { type: 'warehouse', count: 3 },
      { type: 'market', count: 1 },
      { type: 'tavern', count: 2 },
    ],
    professions: ['fisher', 'sailor', 'merchant', 'dockworker'],
    description: 'A busy coastal port for fishing and trade',
  },
  'academic_city': {
    defaultAgentCount: 45,
    buildings: [
      { type: 'house', count: 15 },
      { type: 'university', count: 1 },
      { type: 'library', count: 2 },
      { type: 'laboratory', count: 2 },
      { type: 'dormitory', count: 3 },
    ],
    professions: ['scholar', 'professor', 'student', 'librarian'],
    description: 'A university town focused on research and education',
  },
  'industrial_city': {
    defaultAgentCount: 60,
    buildings: [
      { type: 'house', count: 20 },
      { type: 'factory', count: 3 },
      { type: 'forge', count: 2 },
      { type: 'warehouse', count: 4 },
      { type: 'workshop', count: 3 },
    ],
    professions: ['factory_worker', 'engineer', 'foreman', 'inventor'],
    description: 'A large industrial city with factories and workshops',
  },
  'agricultural_hub': {
    defaultAgentCount: 30,
    buildings: [
      { type: 'house', count: 12 },
      { type: 'farm', count: 6 },
      { type: 'barn', count: 4 },
      { type: 'mill', count: 1 },
      { type: 'granary', count: 2 },
    ],
    professions: ['farmer', 'miller', 'rancher', 'butcher'],
    description: 'A farming community producing food and livestock',
  },
  'military_fortress': {
    defaultAgentCount: 40,
    buildings: [
      { type: 'barracks', count: 4 },
      { type: 'armory', count: 2 },
      { type: 'training_ground', count: 1 },
      { type: 'watchtower', count: 3 },
      { type: 'smithy', count: 2 },
    ],
    professions: ['soldier', 'captain', 'weaponsmith', 'guard'],
    description: 'A fortified military base with trained soldiers',
  },
  'magical_enclave': {
    defaultAgentCount: 22,
    buildings: [
      { type: 'tower', count: 3 },
      { type: 'library', count: 2 },
      { type: 'alchemy_lab', count: 2 },
      { type: 'house', count: 8 },
      { type: 'ritual_circle', count: 1 },
    ],
    professions: ['wizard', 'alchemist', 'enchanter', 'apprentice'],
    description: 'A secluded enclave of magical practitioners',
  },
  'nomadic_camp': {
    defaultAgentCount: 15,
    buildings: [
      { type: 'tent', count: 10 },
      { type: 'campfire', count: 2 },
      { type: 'storage-chest', count: 2 },
    ],
    professions: ['hunter', 'gatherer', 'scout', 'trader'],
    description: 'A temporary nomadic camp that moves seasonally',
  },
  'underground_dwarven': {
    defaultAgentCount: 35,
    buildings: [
      { type: 'hall', count: 6 },
      { type: 'mine', count: 3 },
      { type: 'forge', count: 3 },
      { type: 'brewery', count: 1 },
      { type: 'vault', count: 2 },
    ],
    professions: ['miner', 'smith', 'brewer', 'warrior'],
    description: 'An underground dwarven fortress carved into stone',
  },
  'flying_elven': {
    defaultAgentCount: 28,
    buildings: [
      { type: 'treehouse', count: 12 },
      { type: 'garden', count: 3 },
      { type: 'archery_range', count: 1 },
      { type: 'shrine', count: 2 },
    ],
    professions: ['archer', 'druid', 'scout', 'artisan'],
    description: 'An elven city built among the treetops',
  },
  'research_outpost': {
    defaultAgentCount: 12,
    buildings: [
      { type: 'laboratory', count: 2 },
      { type: 'observatory', count: 1 },
      { type: 'dormitory', count: 2 },
      { type: 'storage-chest', count: 2 },
    ],
    professions: ['scientist', 'researcher', 'technician'],
    description: 'A remote research station for scientific experiments',
  },
  'religious_monastery': {
    defaultAgentCount: 20,
    buildings: [
      { type: 'temple', count: 1 },
      { type: 'dormitory', count: 3 },
      { type: 'library', count: 1 },
      { type: 'garden', count: 2 },
      { type: 'shrine', count: 2 },
    ],
    professions: ['priest', 'monk', 'scribe', 'healer'],
    description: 'A peaceful monastery dedicated to religious practice',
  },
  'frontier_outpost': {
    defaultAgentCount: 10,
    buildings: [
      { type: 'house', count: 4 },
      { type: 'watchtower', count: 1 },
      { type: 'storage-chest', count: 2 },
      { type: 'forge', count: 1 },
    ],
    professions: ['scout', 'guard', 'hunter', 'trader'],
    description: 'A small outpost on the frontier of civilization',
  },
};

/**
 * Generate a random city name based on template
 */
function generateCityName(template: CityTemplate): string {
  const prefixes = ['New', 'Old', 'Upper', 'Lower', 'Great', 'Little'];
  const roots = ['Haven', 'Port', 'Vale', 'Ridge', 'Dale', 'Ford', 'Burg', 'Ton'];
  const suffixes = ['shire', 'field', 'wood', 'ford', 'bridge', 'stone'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const root = roots[Math.floor(Math.random() * roots.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  // 50% chance to use prefix
  const usePrefix = Math.random() > 0.5;
  return usePrefix ? `${prefix}${root}` : `${root}${suffix}`;
}

/**
 * Spawn an NPC city in the world
 */
export async function spawnCity(
  world: World,
  config: CitySpawnConfig
): Promise<SpawnedCityInfo> {
  const template = CITY_TEMPLATES[config.template];
  if (!template) {
    throw new Error(`Unknown city template: ${config.template}`);
  }

  const cityName = config.name || generateCityName(config.template);
  const agentCount = config.agentCount || template.defaultAgentCount;
  const useLLM = config.useLLM ?? true;

  // Create city director entity
  const cityId = world.createEntity('city_director', {});
  const cityEntity = world.getEntity(cityId);

  if (!cityEntity) {
    throw new Error('Failed to create city entity');
  }

  // Add CityDirector component
  const cityDirector: CityDirectorComponent = {
    type: 'city_director',
    cityName,
    population: agentCount,
    foundedTick: world.currentTick,
    buildingQueue: [],
    researchQueue: [],
    resources: {},
    policies: [],
  };
  cityEntity.components.set('city_director', cityDirector);

  const spawnedBuildingIds: string[] = [];
  const spawnedAgentIds: string[] = [];

  // Spawn buildings in a grid pattern around center
  let buildingIndex = 0;
  const gridSize = Math.ceil(Math.sqrt(template.buildings.reduce((sum, b) => sum + b.count, 0)));
  const spacing = 12; // tiles between buildings

  for (const buildingSpec of template.buildings) {
    for (let i = 0; i < buildingSpec.count; i++) {
      const row = Math.floor(buildingIndex / gridSize);
      const col = buildingIndex % gridSize;

      const buildingX = config.x + (col - gridSize / 2) * spacing;
      const buildingY = config.y + (row - gridSize / 2) * spacing;

      const buildingId = world.createEntity(buildingSpec.type as any, {
        x: buildingX,
        y: buildingY,
      });

      if (buildingId) {
        spawnedBuildingIds.push(buildingId);
      }

      buildingIndex++;
    }
  }

  // Spawn agents distributed around the city
  const professions = template.professions;
  for (let i = 0; i < agentCount; i++) {
    // Random position within city bounds
    const angle = (i / agentCount) * Math.PI * 2;
    const radius = Math.random() * gridSize * spacing / 2;
    const agentX = config.x + Math.cos(angle) * radius;
    const agentY = config.y + Math.sin(angle) * radius;

    // Assign profession based on template
    const profession = professions[i % professions.length];

    const agentId = world.createEntity('agent', {
      x: agentX,
      y: agentY,
      useLLM,
      name: `${profession}_${i + 1}`,
    });

    if (agentId) {
      spawnedAgentIds.push(agentId);

      // Set agent's profession if they have a profession component
      const agent = world.getEntity(agentId);
      if (agent) {
        const professionComponent = agent.components.get('profession');
        if (professionComponent && typeof professionComponent === 'object') {
          (professionComponent as any).currentProfession = profession;
        }

        // Mark agent as belonging to this city
        const identity = agent.components.get('identity');
        if (identity && typeof identity === 'object') {
          (identity as any).cityId = cityId;
        }
      }
    }
  }

  // Count buildings by district type
  const districts: Array<{ type: string; buildingCount: number }> = template.buildings.map(b => ({
    type: b.type,
    buildingCount: b.count,
  }));

  return {
    cityId,
    name: cityName,
    template: config.template,
    position: { x: config.x, y: config.y },
    buildingCount: spawnedBuildingIds.length,
    agentCount: spawnedAgentIds.length,
    agentIds: spawnedAgentIds,
    buildingIds: spawnedBuildingIds,
    districts,
    useLLM,
  };
}

/**
 * Get list of available city templates with descriptions
 */
export function getCityTemplates(): Array<{
  template: CityTemplate;
  description: string;
  defaultAgentCount: number;
}> {
  return Object.entries(CITY_TEMPLATES).map(([template, config]) => ({
    template: template as CityTemplate,
    description: config.description,
    defaultAgentCount: config.defaultAgentCount,
  }));
}
