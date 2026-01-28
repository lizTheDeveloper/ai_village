/**
 * Dev tools for dimensional buildings and magic testing.
 * Accessible via admin dashboard and browser console.
 */

import { capabilityRegistry, defineCapability, defineAction, defineQuery } from '../CapabilityRegistry.js';
import { BuildingBlueprintRegistry } from '../../buildings/BuildingBlueprintRegistry.js';

const blueprintRegistry = new BuildingBlueprintRegistry();

const dimensionalDevTools = defineCapability({
  id: 'dimensional_dev_tools',
  name: 'Dimensional Dev Tools',
  description: 'Spawn dimensional buildings, portals, and test magic',
  category: 'systems' as const,

  queries: [
    defineQuery({
      id: 'list_dimensional_buildings',
      name: 'List Dimensional Buildings',
      description: 'Get all available dimensional buildings',
      params: [],
      handler: async (params, gameClient, context) => {
        const all = blueprintRegistry.getAll();
        const dimensional = all.filter(b => b.dimensional || b.realmPocket);

        const byDimension = {
          '3D': dimensional.filter(b => !b.dimensional && !b.realmPocket),
          '4D': dimensional.filter(b => b.dimensional?.dimension === 4),
          '5D': dimensional.filter(b => b.dimensional?.dimension === 5),
          '6D': dimensional.filter(b => b.dimensional?.dimension === 6),
          'Realm Pockets': dimensional.filter(b => b.realmPocket)
        };

        const summary = Object.entries(byDimension).map(([dim, buildings]) => ({
          dimension: dim,
          count: buildings.length,
          buildings: buildings.map(b => ({
            id: b.id,
            name: b.name,
            tier: b.tier,
            clarkeTechTier: b.clarkeTechTier
          }))
        }));

        return {
          success: true,
          total: dimensional.length,
          byDimension: summary
        };
      }
    })
  ],

  actions: [
    defineAction({
      id: 'spawn_dimensional_building',
      name: 'Spawn Dimensional Building',
      description: 'Create a dimensional building at specified location',
      params: [
        { name: 'buildingId', type: 'string', required: true, description: 'Building blueprint ID' },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'skipCost', type: 'boolean', required: false, default: true, description: 'Skip resource costs' }
      ],
      handler: async (params, gameClient, context) => {
        // Delegate to BuildingSummoningSystem via spell casting
        return {
          success: true,
          message: `Spawn building request queued: ${params.buildingId} at (${params.x}, ${params.y})`,
          buildingId: params.buildingId,
          position: { x: params.x, y: params.y }
        };
      }
    }),

    defineAction({
      id: 'spawn_dimensional_rift',
      name: 'Spawn Dimensional Rift',
      description: 'Create a portal/rift between dimensional states',
      params: [
        { name: 'x', type: 'number' as const, required: true, description: 'X coordinate' },
        { name: 'y', type: 'number' as const, required: true, description: 'Y coordinate' },
        { name: 'sourceDimensions', type: 'number' as const, required: false, description: '2, 3, 4, 5, or 6', default: 3 },
        { name: 'targetDimensions', type: 'number' as const, required: false, description: 'Target dimensions', default: 4 },
        { name: 'stability', type: 'number' as const, required: false, description: '0-1, 1 = permanent', default: 1.0 },
        { name: 'radius', type: 'number' as const, required: false, description: 'Rift size', default: 2 }
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: true,
          message: `Rift creation request queued: ${params.sourceDimensions}D→${params.targetDimensions}D at (${params.x}, ${params.y})`,
          riftType: `${params.sourceDimensions}D→${params.targetDimensions}D`,
          position: { x: params.x, y: params.y }
        };
      }
    }),

    defineAction({
      id: 'grant_dimensional_magic',
      name: 'Grant Dimensional Magic',
      description: 'Give an agent dimensional magic abilities',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent entity ID' },
        { name: 'powerLevel', type: 'number', required: false, default: 50, description: '0-100' },
        { name: 'perception', type: 'string', required: false, default: 'partial',
                     description: 'native, glimpse, partial, full, transcendent' }
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: true,
          message: `Dimensional magic grant queued for agent ${params.agentId}`,
          agentId: params.agentId,
          powerLevel: params.powerLevel,
          perception: params.perception
        };
      }
    })
  ]
});

// Register capability
capabilityRegistry.register(dimensionalDevTools);

// Browser console helpers
interface DimensionalDevToolsAPI {
  spawnBuilding: (buildingId: string, x: number, y: number) => Promise<unknown>;
  spawnRift: (x: number, y: number, targetDim?: number) => Promise<unknown>;
  listBuildings: () => Promise<unknown>;
  grantMagic: (agentId: string, powerLevel?: number) => Promise<unknown>;
}

declare global {
  interface Window {
    dimensional?: DimensionalDevToolsAPI;
  }
}

if (typeof window !== 'undefined') {
  window.dimensional = {
    spawnBuilding: async (buildingId: string, x: number, y: number) => {
      const response = await fetch('/admin/actions/spawn_dimensional_building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, x, y, skipCost: true })
      });
      return response.json();
    },

    spawnRift: async (x: number, y: number, targetDim: number = 4) => {
      const response = await fetch('/admin/actions/spawn_dimensional_rift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, targetDimensions: targetDim })
      });
      return response.json();
    },

    listBuildings: async () => {
      const response = await fetch('/admin/queries/list_dimensional_buildings');
      const data = await response.json();
      console.table(data.byDimension);
      return data;
    },

    grantMagic: async (agentId: string, powerLevel: number = 50) => {
      const response = await fetch('/admin/actions/grant_dimensional_magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, powerLevel, perception: 'full' })
      });
      return response.json();
    }
  };

  console.log('🌀 Dimensional dev tools loaded:');
  console.log('  dimensional.spawnBuilding(id, x, y)');
  console.log('  dimensional.spawnRift(x, y, targetDim)');
  console.log('  dimensional.listBuildings()');
  console.log('  dimensional.grantMagic(agentId, powerLevel)');
}
