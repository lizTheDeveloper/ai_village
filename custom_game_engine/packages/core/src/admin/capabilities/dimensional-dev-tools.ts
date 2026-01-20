/**
 * Dev tools for dimensional buildings and magic testing.
 * Accessible via admin dashboard and browser console.
 */

import { defineCapability, defineAction, defineQuery } from '../CapabilityRegistry.js';
import type { World } from '../../ecs/World.js';
import { CT } from '../../components/ComponentTypes.js';
import { buildingBlueprintRegistry } from '../../buildings/BuildingBlueprintRegistry.js';

export const DIMENSIONAL_DEV_TOOLS = defineCapability({
  id: 'dimensional_dev_tools',
  name: 'Dimensional Dev Tools',
  description: 'Spawn dimensional buildings, portals, and test magic',
  category: 'development',

  queries: [
    defineQuery({
      id: 'list_dimensional_buildings',
      name: 'List Dimensional Buildings',
      description: 'Get all available dimensional buildings',
      async execute(world: World) {
        const all = buildingBlueprintRegistry.getAll();
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
      parameters: {
        buildingId: { type: 'string', required: true, description: 'Building blueprint ID' },
        x: { type: 'number', required: true, description: 'X coordinate' },
        y: { type: 'number', required: true, description: 'Y coordinate' },
        skipCost: { type: 'boolean', required: false, default: true, description: 'Skip resource costs' }
      },
      async execute(world: World, params: any) {
        const blueprint = buildingBlueprintRegistry.tryGet(params.buildingId);
        if (!blueprint) {
          return { success: false, message: `Blueprint "${params.buildingId}" not found` };
        }

        // Create building entity
        const building = world.createEntity();
        building.addComponent({
          type: CT.Position,
          x: params.x,
          y: params.y
        });

        building.addComponent({
          type: CT.Building,
          buildingType: params.buildingId,
          constructionProgress: params.skipCost ? 100 : 0,
          built: params.skipCost
        });

        // Add sprite if available
        building.addComponent({
          type: CT.Sprite,
          spriteId: `building_${params.buildingId}`,
          width: blueprint.width,
          height: blueprint.height
        });

        // Add dimensional marker if dimensional building
        if (blueprint.dimensional || blueprint.realmPocket) {
          building.addComponent({
            type: 'magical_construct',
            constructType: 'summoned_building',
            dimension: blueprint.dimensional?.dimension || 3,
            summoner: 'dev_tools',
            duration: 0, // Permanent
            dispellable: true
          });
        }

        return {
          success: true,
          message: `Spawned ${blueprint.name} (${blueprint.dimensional?.dimension || 3}D) at (${params.x}, ${params.y})`,
          entityId: building.id,
          dimension: blueprint.dimensional?.dimension,
          clarkeTechTier: blueprint.clarkeTechTier
        };
      }
    }),

    defineAction({
      id: 'spawn_dimensional_rift',
      name: 'Spawn Dimensional Rift',
      description: 'Create a portal/rift between dimensional states',
      parameters: {
        x: { type: 'number', required: true },
        y: { type: 'number', required: true },
        sourceDimensions: { type: 'number', required: false, default: 3, description: '2, 3, 4, 5, or 6' },
        targetDimensions: { type: 'number', required: false, default: 4 },
        stability: { type: 'number', required: false, default: 1.0, description: '0-1, 1 = permanent' },
        radius: { type: 'number', required: false, default: 2, description: 'Rift size' }
      },
      async execute(world: World, params: any) {
        const rift = world.createEntity();

        rift.addComponent({
          type: CT.Position,
          x: params.x,
          y: params.y
        });

        rift.addComponent({
          type: 'dimensional_rift',
          sourceDimensions: params.sourceDimensions,
          targetDimensions: params.targetDimensions,
          stability: params.stability,
          radius: params.radius,
          visible: true,
          magnetic: params.stability < 0.5,
          throughput: [],
          createdAt: world.tick
        });

        // Visual effect
        rift.addComponent({
          type: CT.Sprite,
          spriteId: 'dimensional_rift',
          width: params.radius * 2,
          height: params.radius * 2
        });

        // Add particle effect
        rift.addComponent({
          type: 'particle_emitter',
          particleType: 'dimensional_shimmer',
          rate: 5,
          color: params.targetDimensions === 4 ? '#00FFFF' :
                 params.targetDimensions === 5 ? '#FF00FF' : '#FFFF00'
        });

        return {
          success: true,
          message: `Created ${params.sourceDimensions}D→${params.targetDimensions}D rift at (${params.x}, ${params.y})`,
          entityId: rift.id,
          riftType: `${params.sourceDimensions}D→${params.targetDimensions}D`
        };
      }
    }),

    defineAction({
      id: 'grant_dimensional_magic',
      name: 'Grant Dimensional Magic',
      description: 'Give an agent dimensional magic abilities',
      parameters: {
        agentId: { type: 'string', required: true, description: 'Agent entity ID' },
        powerLevel: { type: 'number', required: false, default: 50, description: '0-100' },
        perception: { type: 'string', required: false, default: 'partial',
                     description: 'native, glimpse, partial, full, transcendent' }
      },
      async execute(world: World, params: any) {
        const agent = world.getEntityById(params.agentId);
        if (!agent) {
          return { success: false, message: `Agent ${params.agentId} not found` };
        }

        // Add dimensional magic component
        agent.addComponent({
          type: 'dimensional_magic',
          paradigm: 'dimension',
          powerLevel: params.powerLevel,
          perception: params.perception,
          mana: 100,
          sanity: 100,
          knownPowers: ['dimensional_sight', 'phase_shift', 'fold_step'],
          corruption: 0
        });

        // Update agent's dimensional perception
        const consciousness = agent.tryGetComponent('consciousness');
        if (consciousness) {
          consciousness.dimensionalPerception = params.perception;
        }

        return {
          success: true,
          message: `Granted dimensional magic to ${agent.id}`,
          powerLevel: params.powerLevel,
          perception: params.perception,
          powers: ['dimensional_sight', 'phase_shift', 'fold_step']
        };
      }
    })
  ]
});

// Browser console helpers
if (typeof window !== 'undefined') {
  (window as any).dimensional = {
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
