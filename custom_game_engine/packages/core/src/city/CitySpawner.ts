/**
 * CitySpawner - Dev tools for spawning NPC cities
 *
 * Spawns complete cities with buildings, infrastructure, and AI-driven NPCs.
 * Cities can be observed to see emergent behavior, not scripted actions.
 */

import type { World } from '../ecs/World.js';
import { ComponentType as _CT } from '../types/ComponentType.js';
import { createCityDirectorComponent } from '../components/CityDirectorComponent.js';
import { createInventoryComponent, type InventorySlot } from '../components/InventoryComponent.js';
import { EntityImpl } from '../ecs/Entity.js';

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
 * Helper to create an inventory slot with an item
 */
function createItemSlot(itemId: string, quantity: number): InventorySlot {
  return { itemId, quantity };
}

/**
 * Get starting items for a building based on its type
 */
function getBuildingStartingItems(buildingType: string): InventorySlot[] {
  const items: InventorySlot[] = [];

  switch (buildingType) {
    case 'farm':
      items.push(
        createItemSlot('wheat', 20),
        createItemSlot('carrot', 15),
        createItemSlot('hoe', 2),
        createItemSlot('watering_can', 1),
        createItemSlot('fertilizer', 5)
      );
      break;

    case 'blacksmith':
    case 'smithy':
    case 'forge':
      items.push(
        createItemSlot('iron_ingot', 15),
        createItemSlot('coal', 20),
        createItemSlot('hammer', 2),
        createItemSlot('axe', 3),
        createItemSlot('pickaxe', 3),
        createItemSlot('iron_axe', 1),
        createItemSlot('iron_pickaxe', 1)
      );
      break;

    case 'shop':
    case 'market':
      items.push(
        createItemSlot('bread', 10),
        createItemSlot('apple', 15),
        createItemSlot('simple_clothing', 5),
        createItemSlot('rope', 10),
        createItemSlot('cloth', 15),
        createItemSlot('healing_potion', 3)
      );
      break;

    case 'warehouse':
    case 'granary':
      items.push(
        createItemSlot('wood', 40),
        createItemSlot('stone', 30),
        createItemSlot('wheat', 50),
        createItemSlot('iron_ore', 20),
        createItemSlot('coal', 25)
      );
      break;

    case 'storage-chest':
      items.push(
        createItemSlot('wood', 20),
        createItemSlot('stone', 15),
        createItemSlot('fiber', 25),
        createItemSlot('food', 10)
      );
      break;

    case 'tavern':
      items.push(
        createItemSlot('bread', 15),
        createItemSlot('cooked_meat', 10),
        createItemSlot('milk', 8),
        createItemSlot('berry', 12)
      );
      break;

    case 'house':
      items.push(
        createItemSlot('bread', 5),
        createItemSlot('simple_clothing', 2),
        createItemSlot('wood', 10),
        createItemSlot('food', 5)
      );
      break;

    case 'mine':
      items.push(
        createItemSlot('pickaxe', 5),
        createItemSlot('iron_ore', 15),
        createItemSlot('coal', 20),
        createItemSlot('copper_ore', 10),
        createItemSlot('stone', 30)
      );
      break;

    case 'library':
      items.push(
        createItemSlot('cloth', 10),
        createItemSlot('fiber', 15)
      );
      break;

    case 'university':
    case 'laboratory':
      items.push(
        createItemSlot('healing_potion', 5),
        createItemSlot('energy_potion', 5),
        createItemSlot('cloth', 8)
      );
      break;

    case 'armory':
    case 'barracks':
      items.push(
        createItemSlot('leather_armor', 5),
        createItemSlot('copper_dagger', 10),
        createItemSlot('bread', 15),
        createItemSlot('dried_meat', 10)
      );
      break;

    case 'barn':
      items.push(
        createItemSlot('wheat', 30),
        createItemSlot('milk', 10),
        createItemSlot('egg', 15),
        createItemSlot('raw_meat', 5)
      );
      break;

    case 'alchemy_lab':
      items.push(
        createItemSlot('healing_potion', 10),
        createItemSlot('energy_potion', 8),
        createItemSlot('berry', 20),
        createItemSlot('water', 15)
      );
      break;

    case 'dock':
      items.push(
        createItemSlot('fish', 25),
        createItemSlot('fishing_rod', 5),
        createItemSlot('rope', 15)
      );
      break;

    case 'mill':
      items.push(
        createItemSlot('wheat', 50),
        createItemSlot('bread', 20)
      );
      break;

    case 'factory':
    case 'workshop':
      items.push(
        createItemSlot('iron_ingot', 20),
        createItemSlot('copper_ingot', 15),
        createItemSlot('plank', 30),
        createItemSlot('hammer', 3),
        createItemSlot('rope', 10)
      );
      break;

    default:
      // Generic supplies for unknown building types
      items.push(
        createItemSlot('wood', 10),
        createItemSlot('stone', 5),
        createItemSlot('food', 5)
      );
      break;
  }

  return items;
}

/**
 * Get starting items for an agent based on their profession
 */
function getAgentStartingItems(profession: string): InventorySlot[] {
  const items: InventorySlot[] = [];

  switch (profession) {
    case 'farmer':
      items.push(
        createItemSlot('hoe', 1),
        createItemSlot('bread', 3),
        createItemSlot('wheat', 5)
      );
      break;

    case 'blacksmith':
      items.push(
        createItemSlot('hammer', 1),
        createItemSlot('iron_ingot', 5),
        createItemSlot('bread', 3)
      );
      break;

    case 'miner':
      items.push(
        createItemSlot('pickaxe', 1),
        createItemSlot('iron_ore', 3),
        createItemSlot('bread', 3)
      );
      break;

    case 'merchant':
    case 'trader':
      items.push(
        createItemSlot('bread', 5),
        createItemSlot('simple_clothing', 2),
        createItemSlot('gold_ingot', 2)
      );
      break;

    case 'guard':
    case 'soldier':
      items.push(
        createItemSlot('copper_dagger', 1),
        createItemSlot('leather_armor', 1),
        createItemSlot('bread', 3)
      );
      break;

    case 'fisher':
    case 'sailor':
      items.push(
        createItemSlot('fishing_rod', 1),
        createItemSlot('fish', 5),
        createItemSlot('bread', 3)
      );
      break;

    case 'scholar':
    case 'professor':
    case 'researcher':
      items.push(
        createItemSlot('bread', 3),
        createItemSlot('fine_clothing', 1)
      );
      break;

    case 'wizard':
    case 'alchemist':
      items.push(
        createItemSlot('healing_potion', 2),
        createItemSlot('energy_potion', 2),
        createItemSlot('fine_clothing', 1)
      );
      break;

    case 'hunter':
    case 'scout':
      items.push(
        createItemSlot('raw_meat', 5),
        createItemSlot('leather', 3),
        createItemSlot('bread', 3)
      );
      break;

    case 'priest':
    case 'monk':
      items.push(
        createItemSlot('bread', 5),
        createItemSlot('simple_clothing', 1),
        createItemSlot('healing_potion', 1)
      );
      break;

    default:
      // Basic supplies for unknown professions
      items.push(
        createItemSlot('bread', 3),
        createItemSlot('simple_clothing', 1)
      );
      break;
  }

  return items;
}

/**
 * Generate a random city name based on template
 */
function generateCityName(_template: CityTemplate): string {
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
  const cityEntity = world.createEntity();
  const cityId = cityEntity.id;

  // Calculate city bounds (estimate based on grid size)
  const gridSize = Math.ceil(Math.sqrt(template.buildings.reduce((sum: number, b: any) => sum + b.count, 0)));
  const spacing = 12;
  const radius = gridSize * spacing / 2;
  const bounds = {
    minX: config.x - radius,
    maxX: config.x + radius,
    minY: config.y - radius,
    maxY: config.y + radius,
  };

  // Add CityDirector component using helper
  const cityDirector = createCityDirectorComponent(cityId, cityName, bounds, useLLM);
  (cityEntity as any).addComponent(cityDirector);

  const spawnedBuildingIds: string[] = [];
  const spawnedAgentIds: string[] = [];

  // Spawn buildings in a grid pattern around center
  let buildingIndex = 0;

  for (const buildingSpec of template.buildings) {
    for (let i = 0; i < buildingSpec.count; i++) {
      // TODO: Implement proper building spawning with buildingSpec.type and position
      // Position would be calculated based on grid: row/col from buildingIndex
      // For now, create basic entity - this needs to integrate with building system
      const buildingEntity = world.createEntity();
      spawnedBuildingIds.push(buildingEntity.id);

      // Add inventory with starting items
      const startingItems = getBuildingStartingItems(buildingSpec.type);
      const inventory = createInventoryComponent(24, 1000); // Large capacity for buildings

      // Fill inventory slots with starting items
      for (let slotIdx = 0; slotIdx < startingItems.length && slotIdx < inventory.maxSlots; slotIdx++) {
        const item = startingItems[slotIdx];
        if (item) {
          inventory.slots[slotIdx] = item;
        }
      }

      // Add inventory to building
      (buildingEntity as EntityImpl).addComponent(inventory);

      buildingIndex++;
    }
  }

  // Spawn agents distributed around the city
  const professions = template.professions;
  for (let i = 0; i < agentCount; i++) {
    // Assign profession based on template
    const profession = professions[i % professions.length] || 'villager';

    // TODO: Implement proper agent spawning with profession, position, and LLM settings
    // Position would be distributed in circle: angle/radius calculated from i
    // For now, create basic entity - this needs to integrate with agent spawner system
    const agentEntity = world.createEntity();
    spawnedAgentIds.push(agentEntity.id);

    // Add inventory with profession-appropriate starting items
    const startingItems = getAgentStartingItems(profession);
    const inventory = createInventoryComponent(24, 100); // Standard agent capacity

    // Fill inventory slots with starting items
    for (let slotIdx = 0; slotIdx < startingItems.length && slotIdx < inventory.maxSlots; slotIdx++) {
      const item = startingItems[slotIdx];
      if (item) {
        inventory.slots[slotIdx] = item;
      }
    }

    // Add inventory to agent
    (agentEntity as EntityImpl).addComponent(inventory);

    // Set agent's profession if they have a profession component
    const professionComponent = agentEntity.components.get('profession');
    if (professionComponent && typeof professionComponent === 'object') {
      (professionComponent as any).currentProfession = profession;
    }

    // Mark agent as belonging to this city
    const identity = agentEntity.components.get('identity');
    if (identity && typeof identity === 'object') {
      (identity as any).cityId = cityId;
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
