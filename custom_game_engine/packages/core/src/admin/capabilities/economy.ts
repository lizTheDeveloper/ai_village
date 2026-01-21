/**
 * Economy Capability - Manage economic systems
 *
 * Provides admin interface for:
 * - ResourceGatheringSystem (resources, gathering, regeneration)
 * - InventoryComponent (items, storage, transfer)
 * - BuildingSystem (construction, workers, maintenance)
 * - ProfessionWorkSimulationSystem (jobs, outputs, quotas)
 * - CityDirectorComponent (city-wide economics)
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const RESOURCE_TYPE_OPTIONS = [
  { value: 'wood', label: 'Wood' },
  { value: 'stone', label: 'Stone' },
  { value: 'iron', label: 'Iron Ore' },
  { value: 'gold', label: 'Gold Ore' },
  { value: 'coal', label: 'Coal' },
  { value: 'clay', label: 'Clay' },
  { value: 'fiber', label: 'Fiber' },
  { value: 'food', label: 'Food' },
  { value: 'water', label: 'Water' },
  { value: 'crystal', label: 'Crystal' },
];

const ITEM_CATEGORY_OPTIONS = [
  { value: 'weapon', label: 'Weapon' },
  { value: 'armor', label: 'Armor' },
  { value: 'tool', label: 'Tool' },
  { value: 'food', label: 'Food' },
  { value: 'material', label: 'Material' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'crafting', label: 'Crafting Component' },
  { value: 'misc', label: 'Miscellaneous' },
];

const PROFESSION_OPTIONS = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'miner', label: 'Miner' },
  { value: 'lumberjack', label: 'Lumberjack' },
  { value: 'blacksmith', label: 'Blacksmith' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'cook', label: 'Cook' },
  { value: 'tailor', label: 'Tailor' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'guard', label: 'Guard' },
  { value: 'healer', label: 'Healer' },
  { value: 'scholar', label: 'Scholar' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'reporter', label: 'Reporter' },
  { value: 'broadcaster', label: 'Broadcaster' },
];

const BUILDING_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'farm', label: 'Farm' },
  { value: 'mine', label: 'Mine' },
  { value: 'storehouse', label: 'Storehouse' },
  { value: 'market', label: 'Market' },
  { value: 'tavern', label: 'Tavern' },
  { value: 'temple', label: 'Temple' },
  { value: 'barracks', label: 'Barracks' },
  { value: 'wall', label: 'Wall' },
  { value: 'tower', label: 'Tower' },
];

// ============================================================================
// Economy Capability Definition
// ============================================================================

const economyCapability = defineCapability({
  id: 'economy',
  name: 'Economy',
  description: 'Manage resources, inventory, buildings, and professions',
  category: 'systems',

  tab: {
    icon: '💰',
    priority: 40,
  },

  queries: [
    // ========================================================================
    // Resource Queries
    // ========================================================================
    defineQuery({
      id: 'list-resources',
      name: 'List Resources',
      description: 'List all resource entities in the world',
      params: [
        { name: 'type', type: 'select', required: false, options: RESOURCE_TYPE_OPTIONS, description: 'Filter by resource type' },
        { name: 'minAmount', type: 'number', required: false, default: 1, description: 'Minimum resource amount' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resources' };
      },
      renderResult: (data: unknown) => {
        const resources = (data as { resources?: Array<{ id: string; type: string; amount: number; maxAmount: number; x: number; y: number }> })?.resources || [];

        let output = 'RESOURCES\n\n';
        if (resources.length === 0) {
          output += 'No resources found';
        } else {
          for (const r of resources) {
            output += `${r.type} (${r.id})\n`;
            output += `  Amount: ${r.amount}/${r.maxAmount} at (${r.x}, ${r.y})\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-resource-stats',
      name: 'Get Resource Statistics',
      description: 'Get aggregate resource statistics for the world',
      params: [],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resource-stats' };
      },
      renderResult: (data: unknown) => {
        const stats = data as {
          totalResources?: number;
          byType?: Record<string, { count: number; totalAmount: number }>;
          regenerationRate?: number;
        };

        let output = 'RESOURCE STATISTICS\n\n';
        output += `Total Resources: ${stats.totalResources ?? 0}\n`;
        output += `World Regen Rate: ${stats.regenerationRate ?? 0}/sec\n\n`;

        if (stats.byType) {
          output += 'By Type:\n';
          for (const [type, data] of Object.entries(stats.byType)) {
            output += `  ${type}: ${data.count} nodes, ${data.totalAmount} total\n`;
          }
        }

        return output;
      },
    }),

    // ========================================================================
    // Inventory Queries
    // ========================================================================
    defineQuery({
      id: 'get-inventory',
      name: 'Get Inventory',
      description: 'Get inventory contents for an entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity with inventory' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with inventory component' };
      },
      renderResult: (data: unknown) => {
        const inventory = data as {
          items?: Array<{ itemId: string; name: string; amount: number; category: string }>;
          capacity?: number;
          used?: number;
        };

        let output = 'INVENTORY\n\n';
        output += `Capacity: ${inventory.used ?? 0}/${inventory.capacity ?? 0}\n\n`;

        if (inventory.items?.length) {
          output += 'Items:\n';
          for (const item of inventory.items) {
            output += `  ${item.name} x${item.amount} (${item.category})\n`;
          }
        } else {
          output += 'Empty inventory';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'search-items',
      name: 'Search Items',
      description: 'Search for items across all inventories',
      params: [
        { name: 'itemId', type: 'string', required: false, description: 'Item ID to search for' },
        { name: 'category', type: 'select', required: false, options: ITEM_CATEGORY_OPTIONS, description: 'Filter by category' },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/search-items' };
      },
      renderResult: (data: unknown) => {
        const results = (data as { results?: Array<{ entityId: string; entityName: string; itemId: string; itemName: string; amount: number }> })?.results || [];

        let output = 'ITEM SEARCH RESULTS\n\n';
        if (results.length === 0) {
          output += 'No items found';
        } else {
          for (const r of results) {
            output += `${r.itemName} x${r.amount}\n`;
            output += `  In: ${r.entityName} (${r.entityId})\n`;
          }
        }

        return output;
      },
    }),

    // ========================================================================
    // Building Queries
    // ========================================================================
    defineQuery({
      id: 'list-buildings',
      name: 'List Buildings',
      description: 'List all buildings in the world',
      params: [
        { name: 'type', type: 'select', required: false, options: BUILDING_TYPE_OPTIONS, description: 'Filter by building type' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/buildings' };
      },
      renderResult: (data: unknown) => {
        const buildings = (data as { buildings?: Array<{ id: string; type: string; name: string; workers: number; x: number; y: number }> })?.buildings || [];

        let output = 'BUILDINGS\n\n';
        if (buildings.length === 0) {
          output += 'No buildings found';
        } else {
          for (const b of buildings) {
            output += `${b.name} (${b.type})\n`;
            output += `  ID: ${b.id}, Workers: ${b.workers}, at (${b.x}, ${b.y})\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-building-status',
      name: 'Get Building Status',
      description: 'Get detailed status for a specific building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with building component' };
      },
      renderResult: (data: unknown) => {
        const building = data as {
          name?: string;
          type?: string;
          workers?: Array<{ id: string; name: string; role: string }>;
          production?: { outputType: string; rate: number; lastOutput: number };
          storage?: { used: number; capacity: number };
          maintenance?: { health: number; needsRepair: boolean };
        };

        let output = `BUILDING: ${building.name ?? 'Unknown'}\n\n`;
        output += `Type: ${building.type ?? 'N/A'}\n\n`;

        if (building.workers?.length) {
          output += `Workers (${building.workers.length}):\n`;
          for (const w of building.workers) {
            output += `  ${w.name} - ${w.role}\n`;
          }
        }

        if (building.production) {
          output += `\nProduction:\n`;
          output += `  Output: ${building.production.outputType}\n`;
          output += `  Rate: ${building.production.rate}/tick\n`;
        }

        if (building.storage) {
          output += `\nStorage: ${building.storage.used}/${building.storage.capacity}\n`;
        }

        if (building.maintenance) {
          output += `\nHealth: ${(building.maintenance.health * 100).toFixed(0)}%\n`;
          if (building.maintenance.needsRepair) {
            output += `  NEEDS REPAIR\n`;
          }
        }

        return output;
      },
    }),

    // ========================================================================
    // Profession Queries
    // ========================================================================
    defineQuery({
      id: 'list-professions',
      name: 'List Profession Workers',
      description: 'List all agents with professions',
      params: [
        { name: 'profession', type: 'select', required: false, options: PROFESSION_OPTIONS, description: 'Filter by profession' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/professions' };
      },
      renderResult: (data: unknown) => {
        const workers = (data as { workers?: Array<{ id: string; name: string; profession: string; workProgress: number }> })?.workers || [];

        let output = 'PROFESSION WORKERS\n\n';
        if (workers.length === 0) {
          output += 'No profession workers found';
        } else {
          for (const w of workers) {
            output += `${w.name} (${w.profession})\n`;
            output += `  ID: ${w.id}, Progress: ${(w.workProgress * 100).toFixed(0)}%\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-city-economy',
      name: 'Get City Economy',
      description: 'Get city-wide economic overview from CityDirector',
      params: [],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/city-economy' };
      },
      renderResult: (data: unknown) => {
        const economy = data as {
          totalPopulation?: number;
          employmentRate?: number;
          professionQuotas?: Record<string, { needed: number; filled: number }>;
          recentOutputs?: number;
        };

        let output = 'CITY ECONOMY\n\n';
        output += `Population: ${economy.totalPopulation ?? 0}\n`;
        output += `Employment: ${((economy.employmentRate ?? 0) * 100).toFixed(1)}%\n`;
        output += `Recent Outputs: ${economy.recentOutputs ?? 0}\n\n`;

        if (economy.professionQuotas) {
          output += 'Profession Quotas:\n';
          for (const [prof, quota] of Object.entries(economy.professionQuotas)) {
            output += `  ${prof}: ${quota.filled}/${quota.needed}\n`;
          }
        }

        return output;
      },
    }),
  ],

  actions: [
    // ========================================================================
    // Resource Actions
    // ========================================================================
    defineAction({
      id: 'spawn-resource',
      name: 'Spawn Resource',
      description: 'Create a new resource node at a location',
      params: [
        { name: 'type', type: 'select', required: true, options: RESOURCE_TYPE_OPTIONS, description: 'Resource type' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
        { name: 'amount', type: 'number', required: false, default: 100, description: 'Initial amount' },
        { name: 'maxAmount', type: 'number', required: false, default: 100, description: 'Maximum amount' },
        { name: 'regenRate', type: 'number', required: false, default: 0.1, description: 'Regeneration rate per second' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/spawn-resource' };
      },
    }),

    defineAction({
      id: 'set-resource-amount',
      name: 'Set Resource Amount',
      description: 'Set the amount of a resource node',
      params: [
        { name: 'resourceId', type: 'entity-id', required: true, description: 'Resource entity ID' },
        { name: 'amount', type: 'number', required: true, description: 'New amount' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-resource-amount' };
      },
    }),

    defineAction({
      id: 'deplete-resource',
      name: 'Deplete Resource',
      description: 'Remove a resource node from the world',
      dangerous: true,
      params: [
        { name: 'resourceId', type: 'entity-id', required: true, description: 'Resource entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/deplete-resource' };
      },
    }),

    // ========================================================================
    // Inventory Actions
    // ========================================================================
    defineAction({
      id: 'give-item',
      name: 'Give Item',
      description: 'Add an item to an entity\'s inventory',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Target entity' },
        { name: 'itemId', type: 'string', required: true, description: 'Item ID from registry' },
        { name: 'amount', type: 'number', required: false, default: 1, description: 'Quantity to give' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/give-item' };
      },
    }),

    defineAction({
      id: 'remove-item',
      name: 'Remove Item',
      description: 'Remove an item from an entity\'s inventory',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Target entity' },
        { name: 'itemId', type: 'string', required: true, description: 'Item ID to remove' },
        { name: 'amount', type: 'number', required: false, default: 1, description: 'Quantity to remove' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/remove-item' };
      },
    }),

    defineAction({
      id: 'transfer-item',
      name: 'Transfer Item',
      description: 'Transfer an item between two entities',
      params: [
        { name: 'fromEntityId', type: 'entity-id', required: true, description: 'Source entity' },
        { name: 'toEntityId', type: 'entity-id', required: true, description: 'Target entity' },
        { name: 'itemId', type: 'string', required: true, description: 'Item ID to transfer' },
        { name: 'amount', type: 'number', required: false, default: 1, description: 'Quantity to transfer' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/transfer-item' };
      },
    }),

    defineAction({
      id: 'clear-inventory',
      name: 'Clear Inventory',
      description: 'Remove all items from an entity\'s inventory',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to clear' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/clear-inventory' };
      },
    }),

    // ========================================================================
    // Building Actions
    // ========================================================================
    defineAction({
      id: 'spawn-building',
      name: 'Spawn Building',
      description: 'Create a new building at a location',
      params: [
        { name: 'type', type: 'select', required: true, options: BUILDING_TYPE_OPTIONS, description: 'Building type' },
        { name: 'x', type: 'number', required: true, description: 'X position' },
        { name: 'y', type: 'number', required: true, description: 'Y position' },
        { name: 'name', type: 'string', required: false, description: 'Building name (auto-generated if empty)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/spawn-building' };
      },
    }),

    defineAction({
      id: 'assign-worker',
      name: 'Assign Worker',
      description: 'Assign an agent to work at a building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building entity ID' },
        { name: 'workerId', type: 'entity-id', required: true, entityType: 'agent', description: 'Worker to assign' },
        { name: 'role', type: 'string', required: false, default: 'general', description: 'Worker role' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/assign-worker' };
      },
    }),

    defineAction({
      id: 'remove-worker',
      name: 'Remove Worker',
      description: 'Remove a worker from a building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building entity ID' },
        { name: 'workerId', type: 'entity-id', required: true, entityType: 'agent', description: 'Worker to remove' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/remove-worker' };
      },
    }),

    defineAction({
      id: 'repair-building',
      name: 'Repair Building',
      description: 'Repair a building to full health',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to repair' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/repair-building' };
      },
    }),

    defineAction({
      id: 'destroy-building',
      name: 'Destroy Building',
      description: 'Remove a building from the world',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to destroy' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/destroy-building' };
      },
    }),

    // ========================================================================
    // Profession Actions
    // ========================================================================
    defineAction({
      id: 'assign-profession',
      name: 'Assign Profession',
      description: 'Assign a profession to an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to assign' },
        { name: 'profession', type: 'select', required: true, options: PROFESSION_OPTIONS, description: 'Profession to assign' },
        { name: 'workplaceId', type: 'entity-id', required: false, description: 'Workplace building (optional)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/assign-profession' };
      },
    }),

    defineAction({
      id: 'remove-profession',
      name: 'Remove Profession',
      description: 'Remove an agent\'s profession',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to modify' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/remove-profession' };
      },
    }),

    defineAction({
      id: 'set-profession-quota',
      name: 'Set Profession Quota',
      description: 'Set the city\'s quota for a profession type',
      params: [
        { name: 'profession', type: 'select', required: true, options: PROFESSION_OPTIONS, description: 'Profession type' },
        { name: 'quota', type: 'number', required: true, description: 'Number of workers needed' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-profession-quota' };
      },
    }),

    defineAction({
      id: 'complete-work',
      name: 'Complete Work',
      description: 'Instantly complete an agent\'s current work task',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent with profession' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/complete-work' };
      },
    }),
  ],
});

capabilityRegistry.register(economyCapability);
