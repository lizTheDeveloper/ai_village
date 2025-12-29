/**
 * StorageContext - Calculates village-wide storage statistics
 *
 * Provides agents with awareness of:
 * - Total storage capacity across all storage buildings
 * - Current usage and free space
 * - Items in storage by type
 * - Whether storage is critically full
 *
 * This context informs building decisions:
 * - If storage is > 80% full, prioritize building more storage
 * - If storage has abundant materials, prioritize production buildings
 * - If storage is empty, prioritize gathering
 */

import type { World } from '../ecs/World.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';

/**
 * Storage statistics for the village
 */
export interface StorageStats {
  // Capacity
  totalCapacity: number;        // Total slots across all storage
  usedSlots: number;            // Occupied slots
  freeSlots: number;            // Available slots
  utilizationPercent: number;   // 0-100

  // Building counts
  storageCount: number;         // Number of storage buildings
  completeStorageCount: number; // Number of completed storage buildings

  // Items in storage
  items: Record<string, number>;
  totalItemCount: number;

  // Derived states
  isFull: boolean;              // > 95% utilized
  isCriticallyFull: boolean;    // > 80% utilized
  isEmpty: boolean;             // 0 items
  needsMoreStorage: boolean;    // Should build more storage

  // Resource availability
  woodInStorage: number;
  stoneInStorage: number;
  foodInStorage: number;

  // Days of supplies (based on agent count)
  daysOfFood: number;
  agentCount: number;
}

/**
 * Building type interface
 */
interface BuildingComp {
  buildingType: string;
  isComplete: boolean;
}

/**
 * Calculate storage statistics for the village.
 * Examines all storage buildings (storage-chest, storage-box, barn).
 */
export function calculateStorageStats(world: World): StorageStats {
  const stats: StorageStats = {
    totalCapacity: 0,
    usedSlots: 0,
    freeSlots: 0,
    utilizationPercent: 0,
    storageCount: 0,
    completeStorageCount: 0,
    items: {},
    totalItemCount: 0,
    isFull: false,
    isCriticallyFull: false,
    isEmpty: true,
    needsMoreStorage: false,
    woodInStorage: 0,
    stoneInStorage: 0,
    foodInStorage: 0,
    daysOfFood: 0,
    agentCount: 0,
  };

  // Find all storage buildings
  const storageBuildings = world.query()
    .with('building')
    .with('inventory')
    .executeEntities();

  const STORAGE_TYPES = ['storage-chest', 'storage-box', 'barn'];

  for (const storage of storageBuildings) {
    const building = storage.components.get('building') as BuildingComp | undefined;
    const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

    if (!building || !inventory) continue;
    if (!STORAGE_TYPES.includes(building.buildingType)) continue;

    stats.storageCount++;

    // Only count complete buildings for capacity
    if (!building.isComplete) continue;

    stats.completeStorageCount++;
    stats.totalCapacity += inventory.slots.length;

    // Count items in this storage
    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        stats.usedSlots++;
        stats.items[slot.itemId] = (stats.items[slot.itemId] || 0) + slot.quantity;
        stats.totalItemCount += slot.quantity;
        stats.isEmpty = false;
      }
    }
  }

  // Calculate free slots and utilization
  stats.freeSlots = stats.totalCapacity - stats.usedSlots;
  stats.utilizationPercent = stats.totalCapacity > 0
    ? Math.round((stats.usedSlots / stats.totalCapacity) * 100)
    : 0;

  // Set derived states
  stats.isFull = stats.utilizationPercent >= 95;
  stats.isCriticallyFull = stats.utilizationPercent >= 80;
  stats.needsMoreStorage = stats.isCriticallyFull || stats.totalCapacity < 10;

  // Extract specific resource counts
  stats.woodInStorage = stats.items['wood'] || 0;
  stats.stoneInStorage = stats.items['stone'] || 0;

  // Count all edible items as food (food, berry, apple, meat, bread, etc.)
  const FOOD_ITEMS = ['food', 'berry', 'apple', 'meat', 'cooked_meat', 'bread', 'fish', 'cooked_fish', 'egg', 'milk', 'carrot', 'wheat', 'corn', 'potato'];
  stats.foodInStorage = FOOD_ITEMS.reduce((total, item) => total + (stats.items[item] || 0), 0);

  // Calculate days of food
  const agents = world.query().with('agent').executeEntities();
  stats.agentCount = agents.length;
  const foodPerAgentPerDay = 2.5;
  stats.daysOfFood = stats.agentCount > 0
    ? stats.foodInStorage / (stats.agentCount * foodPerAgentPerDay)
    : 0;

  return stats;
}

/**
 * Format storage stats as a human-readable string for prompts.
 */
export function formatStorageStats(stats: StorageStats): string {
  if (stats.completeStorageCount === 0) {
    return '- Village Storage: No storage buildings built yet. Consider building a storage-chest (10 wood)!\n';
  }

  let result = '- Village Storage: ';

  // Items summary
  if (stats.isEmpty) {
    result += 'empty';
  } else {
    const itemList = Object.entries(stats.items)
      .map(([item, qty]) => `${qty} ${item}`)
      .join(', ');
    result += itemList;
  }

  // Capacity info
  result += ` (${stats.usedSlots}/${stats.totalCapacity} slots, ${stats.utilizationPercent}% full)\n`;

  // Capacity warnings
  if (stats.isFull) {
    result += '  ⚠️ STORAGE FULL - Build more storage immediately! Items may be lost.\n';
  } else if (stats.isCriticallyFull) {
    result += '  ⚠️ STORAGE NEARLY FULL - Consider building another storage-chest.\n';
  } else if (stats.totalCapacity < 10) {
    result += '  📦 Limited storage capacity - building more storage would help the village.\n';
  }

  // Food status
  if (stats.foodInStorage === 0) {
    result += '  🍎 NO FOOD in storage - gather food immediately!\n';
  } else if (stats.daysOfFood < 1) {
    result += `  🍎 FOOD CRITICAL - only ${stats.daysOfFood.toFixed(1)} days of food!\n`;
  } else if (stats.daysOfFood < 3) {
    result += `  🍎 Low food - ${stats.daysOfFood.toFixed(1)} days remaining\n`;
  } else if (stats.daysOfFood >= 5) {
    result += `  ✅ Well stocked - ${stats.daysOfFood.toFixed(1)} days of food\n`;
  }

  // Building materials status
  if (stats.woodInStorage >= 20 && stats.stoneInStorage >= 10) {
    result += '  🔨 Abundant building materials - ready for construction!\n';
  } else if (stats.woodInStorage >= 10 || stats.stoneInStorage >= 10) {
    result += '  🪵 Some building materials available\n';
  }

  return result;
}

/**
 * Count existing buildings of a given type in the village.
 */
export function countBuildingsOfType(world: World, buildingType: string): { total: number; complete: number } {
  const buildings = world.query()
    .with('building')
    .executeEntities();

  let total = 0;
  let complete = 0;

  for (const building of buildings) {
    const comp = building.components.get('building') as BuildingComp | undefined;
    if (comp && comp.buildingType === buildingType) {
      total++;
      if (comp.isComplete) {
        complete++;
      }
    }
  }

  return { total, complete };
}

/**
 * Building categories with their requirements
 */
interface BuildingNeed {
  buildingType: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Crafting stations - only need 1 of each type
 */
const CRAFTING_STATIONS = ['workbench', 'forge'];

/**
 * Capacity buildings - need based on population
 * Each entry: [buildingType, capacityPerBuilding, entityType]
 */
const CAPACITY_BUILDINGS: Array<{ type: string; capacity: number; for: string; costWood: number; costStone: number }> = [
  { type: 'bed', capacity: 1, for: 'agents', costWood: 10, costStone: 0 },
  { type: 'lean-to', capacity: 2, for: 'agents', costWood: 10, costStone: 0 },
  { type: 'tent', capacity: 2, for: 'agents', costWood: 5, costStone: 0 },
  { type: 'chicken-coop', capacity: 8, for: 'chickens', costWood: 25, costStone: 0 },
  { type: 'stable', capacity: 4, for: 'horses', costWood: 40, costStone: 20 },
  { type: 'kennel', capacity: 6, for: 'dogs', costWood: 20, costStone: 10 },
];

/**
 * Utility buildings - need 1 of each
 */
const UTILITY_BUILDINGS = [
  { type: 'campfire', costWood: 5, costStone: 10, reason: 'warmth and cooking' },
  { type: 'well', costWood: 0, costStone: 30, reason: 'water for farming' },
  { type: 'farm-shed', costWood: 30, costStone: 0, reason: 'sustainable food storage' },
];

/**
 * Determine what building type the village needs based on current state.
 * Returns a suggested building type and reason based on village STATE, not agent inventory.
 *
 * Logic:
 * - Crafting stations (workbench, forge): Only need 1 of each
 * - Capacity buildings (beds, shelters, animal housing): Based on population
 * - Storage: Based on utilization percentage
 * - Utility buildings (campfire, well): Only need 1 of each
 */
export function suggestBuildingFromStorage(
  stats: StorageStats,
  world?: World
): { buildingType: string; reason: string; priority: 'high' | 'medium' | 'low' } | null {
  if (!world) return null;

  const needs: BuildingNeed[] = [];

  // === HIGH PRIORITY: Critical storage ===
  if (stats.isCriticallyFull) {
    needs.push({
      buildingType: 'storage-chest',
      reason: 'Storage critically full (>80%)',
      priority: 'high',
    });
  }

  if (stats.completeStorageCount === 0) {
    needs.push({
      buildingType: 'storage-chest',
      reason: 'No storage exists',
      priority: 'high',
    });
  }

  // === MEDIUM PRIORITY: Crafting stations (1 of each) ===
  for (const stationType of CRAFTING_STATIONS) {
    const count = countBuildingsOfType(world, stationType);
    if (count.total === 0) {
      const costWood = stationType === 'workbench' ? 20 : 40;
      const costStone = stationType === 'forge' ? 40 : 0;

      // Only suggest if we have materials
      if (stats.woodInStorage >= costWood && stats.stoneInStorage >= costStone) {
        needs.push({
          buildingType: stationType,
          reason: `No ${stationType} - needed for crafting`,
          priority: 'medium',
        });
      }
    }
  }

  // === MEDIUM PRIORITY: Utility buildings (1 of each) ===
  for (const utility of UTILITY_BUILDINGS) {
    const count = countBuildingsOfType(world, utility.type);
    if (count.total === 0) {
      if (stats.woodInStorage >= utility.costWood && stats.stoneInStorage >= utility.costStone) {
        needs.push({
          buildingType: utility.type,
          reason: `No ${utility.type} - needed for ${utility.reason}`,
          priority: 'medium',
        });
      }
    }
  }

  // === LOW PRIORITY: Capacity buildings based on population ===
  // Only suggest shelter/beds if we have enough food stability
  if (stats.daysOfFood >= 2) {
    // Calculate shelter needs for agents
    const agentShelterBuildings = CAPACITY_BUILDINGS.filter(b => b.for === 'agents');
    let totalAgentCapacity = 0;

    for (const building of agentShelterBuildings) {
      const count = countBuildingsOfType(world, building.type);
      totalAgentCapacity += count.complete * building.capacity;
    }

    const agentShelterDeficit = stats.agentCount - totalAgentCapacity;

    if (agentShelterDeficit > 0) {
      // Suggest cheapest shelter we can afford
      for (const building of agentShelterBuildings) {
        if (stats.woodInStorage >= building.costWood && stats.stoneInStorage >= building.costStone) {
          needs.push({
            buildingType: building.type,
            reason: `Shelter needed: ${totalAgentCapacity}/${stats.agentCount} agents housed`,
            priority: 'low',
          });
          break; // Only suggest one shelter type
        }
      }
    }
  }

  // === LOW PRIORITY: More storage if getting full ===
  if (stats.utilizationPercent >= 60 && stats.utilizationPercent < 80) {
    needs.push({
      buildingType: 'storage-chest',
      reason: `Storage ${stats.utilizationPercent}% full`,
      priority: 'low',
    });
  }

  // Return highest priority need
  const highPriority = needs.find(n => n.priority === 'high');
  if (highPriority) return highPriority;

  const mediumPriority = needs.find(n => n.priority === 'medium');
  if (mediumPriority) return mediumPriority;

  const lowPriority = needs.find(n => n.priority === 'low');
  if (lowPriority) return lowPriority;

  return null;
}
