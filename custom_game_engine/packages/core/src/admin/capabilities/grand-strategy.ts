/**
 * Grand Strategy Capability - Manage interstellar-scale entities
 *
 * Provides admin tools for:
 * - Political Hierarchy: Empires, Federations, Galactic Councils
 * - Naval Hierarchy: Navies, Armadas, Fleets, Squadrons
 * - Megastructures: Dyson Spheres, Orbital Rings, etc.
 * - Trade Networks
 *
 * GAMEPLAY ACTIONS: Allows LLM to control the game via metrics server:
 * - Diplomatic actions between empires
 * - Fleet movement commands
 * - Megastructure task assignments
 * - Entity inspection and state queries
 */

import {
  capabilityRegistry,
  defineCapability,
  defineQuery,
  defineAction,
  defineLink,
} from '../CapabilityRegistry.js';

const grandStrategyCapability = defineCapability({
  id: 'grand-strategy',
  name: 'Grand Strategy',
  description: 'Manage interstellar empires, fleets, megastructures, and galactic politics',
  category: 'systems', // Use existing category

  tab: {
    icon: '🏛️',
    priority: 15,
  },

  queries: [
    // =========================================================================
    // OVERVIEW
    // =========================================================================
    defineQuery({
      id: 'grand-strategy-overview',
      name: 'Grand Strategy Overview',
      description: 'Get counts of all Grand Strategy entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: latest)' },
      ],
      handler: async (params, gameClient, context) => {
        try {
          const session = params.session || 'latest';
          const response = await fetch(`${context.baseUrl}/dashboard/grand-strategy?session=${session}&format=json`);
          if (!response.ok) {
            // Return static info if endpoint not available
            return {
              message: 'Grand Strategy dashboard endpoint not available. Use game DevPanel or GrandStrategySimulator.',
              entityTypes: [
                'empire - Political rulers of star systems',
                'federation_governance - Alliances of empires',
                'galactic_council - Multi-federation governance',
                'navy - Empire-level military structure',
                'armada - Multi-fleet formations',
                'fleet - Groups of squadrons',
                'squadron - Groups of ships',
                'megastructure - Dyson spheres, orbital rings, etc.',
                'trade_network - Economic routes',
              ],
            };
          }
          return await response.json();
        } catch (err) {
          return {
            error: `Failed to query: ${err instanceof Error ? err.message : 'unknown'}`,
            hint: 'Use the GrandStrategySimulator or DevPanel in the browser for direct entity inspection',
          };
        }
      },
    }),

    // =========================================================================
    // POLITICAL HIERARCHY
    // =========================================================================
    defineQuery({
      id: 'list-empires',
      name: 'List Empires',
      description: 'List all Empire entities in the current universe',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query empires via game client',
          endpoint: '/api/live/entities?type=empire',
          hint: 'Use DevPanel Grand Strategy tab or run: curl http://localhost:8766/dashboard/entities?type=empire',
        };
      },
    }),

    defineQuery({
      id: 'list-federations',
      name: 'List Federations',
      description: 'List all Federation entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query federations via game client',
          endpoint: '/api/live/entities?type=federation_governance',
          hint: 'Use DevPanel Grand Strategy tab',
        };
      },
    }),

    defineQuery({
      id: 'list-galactic-councils',
      name: 'List Galactic Councils',
      description: 'List all Galactic Council entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query galactic councils via game client',
          endpoint: '/api/live/entities?type=galactic_council',
        };
      },
    }),

    // =========================================================================
    // NAVAL HIERARCHY
    // =========================================================================
    defineQuery({
      id: 'list-navies',
      name: 'List Navies',
      description: 'List all Navy entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query navies via game client',
          endpoint: '/api/live/entities?type=navy',
        };
      },
    }),

    defineQuery({
      id: 'list-fleets',
      name: 'List Fleets',
      description: 'List all Fleet entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query fleets via game client',
          endpoint: '/api/live/entities?type=fleet',
          hierarchy: 'Navy → Armada → Fleet → Squadron → Ships',
        };
      },
    }),

    defineQuery({
      id: 'list-megastructures',
      name: 'List Megastructures',
      description: 'List all Megastructure entities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          message: 'Query megastructures via game client',
          endpoint: '/api/live/entities?type=megastructure',
          types: ['dyson_swarm', 'orbital_ring', 'wormhole_network', 'stellar_engine'],
        };
      },
    }),
  ],

  actions: [
    // =========================================================================
    // SPAWN ACTIONS
    // =========================================================================
    defineAction({
      id: 'spawn-empire',
      name: 'Spawn Empire',
      description: 'Create a new Empire entity',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Empire name' },
        {
          name: 'governmentType',
          type: 'select',
          required: false,
          default: 'imperial',
          description: 'Government type',
          options: [
            { value: 'imperial', label: 'Imperial' },
            { value: 'federation', label: 'Federation' },
            { value: 'hegemony', label: 'Hegemony' },
            { value: 'consortium', label: 'Consortium' },
          ],
        },
      ],
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetch(`${context.baseUrl}/api/actions/spawn-entity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'empire',
              name: params.name,
              governmentType: params.governmentType || 'imperial',
            }),
          });
          if (!response.ok) {
            return {
              success: false,
              error: 'Spawn endpoint not available. Use GrandStrategySimulator or DevPanel.',
              hint: 'npx tsx packages/city-simulator/src/test-grand-strategy.ts',
            };
          }
          return await response.json();
        } catch {
          return {
            success: false,
            message: 'Use GrandStrategySimulator to spawn empires programmatically',
            code: `
const simulator = new GrandStrategySimulator({ empireCount: 3 });
await simulator.initialize();
// Or spawn individually:
simulator.spawnEmpire(world, 'My Empire');
`,
          };
        }
      },
    }),

    defineAction({
      id: 'spawn-federation',
      name: 'Spawn Federation',
      description: 'Create a new Federation entity',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Federation name' },
        {
          name: 'governanceModel',
          type: 'select',
          required: false,
          default: 'federal',
          description: 'Governance model',
          options: [
            { value: 'federal', label: 'Federal' },
            { value: 'confederal', label: 'Confederal' },
            { value: 'supranational', label: 'Supranational' },
          ],
        },
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: false,
          message: 'Use GrandStrategySimulator to spawn federations',
          code: `simulator.spawnFederation(world, '${params.name}', empireIds);`,
        };
      },
    }),

    defineAction({
      id: 'spawn-navy',
      name: 'Spawn Navy',
      description: 'Create a new Navy entity for an empire',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Navy name' },
        { name: 'empireId', type: 'entity-id', required: false, entityType: 'empire', description: 'Parent Empire ID' },
        { name: 'budget', type: 'number', required: false, default: 1000000, description: 'Initial budget' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: false,
          message: 'Use GrandStrategySimulator to spawn navies',
          code: `simulator.spawnNavy(world, empireId, '${params.name}');`,
        };
      },
    }),

    defineAction({
      id: 'spawn-megastructure',
      name: 'Spawn Megastructure',
      description: 'Create a new Megastructure entity',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Megastructure name' },
        {
          name: 'category',
          type: 'select',
          required: false,
          default: 'stellar',
          description: 'Category',
          options: [
            { value: 'stellar', label: 'Stellar (Dyson spheres, stellar engines)' },
            { value: 'orbital', label: 'Orbital (Rings, habitats)' },
            { value: 'galactic', label: 'Galactic (Wormhole networks)' },
          ],
        },
        {
          name: 'structureType',
          type: 'select',
          required: false,
          default: 'dyson_swarm',
          description: 'Structure type',
          options: [
            { value: 'dyson_swarm', label: 'Dyson Swarm' },
            { value: 'dyson_sphere', label: 'Dyson Sphere' },
            { value: 'orbital_ring', label: 'Orbital Ring' },
            { value: 'wormhole_network', label: 'Wormhole Network' },
            { value: 'stellar_engine', label: 'Stellar Engine' },
          ],
        },
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: false,
          message: 'Use GrandStrategySimulator to spawn megastructures',
          code: `simulator.spawnMegastructure(world, { name: '${params.name}', category: '${params.category}', ... });`,
        };
      },
    }),

    defineAction({
      id: 'spawn-full-empire',
      name: 'Spawn Full Empire (with hierarchy)',
      description: 'Spawn an Empire with a complete naval hierarchy',
      params: [
        { name: 'empireName', type: 'string', required: true, description: 'Empire name' },
        { name: 'naviesCount', type: 'number', required: false, default: 1, description: 'Number of navies' },
      ],
      handler: async (params, gameClient, context) => {
        return {
          success: false,
          message: 'Use GrandStrategySimulator for full empire spawning',
          code: `
const simulator = new GrandStrategySimulator({
  empireCount: 1,
  naviesPerEmpire: ${params.naviesCount || 1},
  federationCount: 0,
  createGalacticCouncil: false,
});
await simulator.initialize();
`,
          note: 'Each empire gets: Navy → Armada → Fleet → Squadron → Ships with crews',
        };
      },
    }),

    // =========================================================================
    // GAMEPLAY ACTIONS - Direct game control via metrics server
    // =========================================================================
    defineAction({
      id: 'diplomatic-action',
      name: 'Diplomatic Action',
      description: 'Issue a diplomatic action between two empires (ally, trade, war)',
      params: [
        { name: 'empireId', type: 'entity-id', required: true, entityType: 'empire', description: 'Source Empire ID' },
        { name: 'targetEmpireId', type: 'entity-id', required: true, entityType: 'empire', description: 'Target Empire ID' },
        {
          name: 'action',
          type: 'select',
          required: true,
          description: 'Diplomatic action to take',
          options: [
            { value: 'ally', label: 'Form Alliance' },
            { value: 'trade_agreement', label: 'Trade Agreement' },
            { value: 'non_aggression', label: 'Non-Aggression Pact' },
            { value: 'declare_war', label: 'Declare War' },
          ],
        },
      ],
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetch(`${context.baseUrl}/api/grand-strategy/diplomatic-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empireId: params.empireId,
              targetEmpireId: params.targetEmpireId,
              action: params.action,
            }),
          });
          if (response.ok) {
            return await response.json();
          }
          return {
            success: false,
            message: `Diplomatic action: ${params.empireId} → ${params.action} → ${params.targetEmpireId}`,
            hint: 'Use GrandStrategySimulator.diplomaticAction() for programmatic control',
            code: `simulator.diplomaticAction('${params.empireId}', '${params.targetEmpireId}', '${params.action}');`,
          };
        } catch {
          return {
            success: false,
            message: 'Metrics server not running. Use GrandStrategySimulator directly.',
            code: `simulator.diplomaticAction('${params.empireId}', '${params.targetEmpireId}', '${params.action}');`,
          };
        }
      },
    }),

    defineAction({
      id: 'move-fleet',
      name: 'Move Fleet',
      description: 'Order a fleet to move to target coordinates',
      params: [
        { name: 'fleetId', type: 'entity-id', required: true, entityType: 'fleet', description: 'Fleet ID to move' },
        { name: 'targetX', type: 'number', required: true, description: 'Target X coordinate' },
        { name: 'targetY', type: 'number', required: true, description: 'Target Y coordinate' },
      ],
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetch(`${context.baseUrl}/api/grand-strategy/move-fleet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fleetId: params.fleetId,
              targetX: params.targetX,
              targetY: params.targetY,
            }),
          });
          if (response.ok) {
            return await response.json();
          }
          return {
            success: false,
            message: `Fleet ${params.fleetId} movement order to (${params.targetX}, ${params.targetY})`,
            hint: 'Use GrandStrategySimulator.moveFleet() for programmatic control',
            code: `simulator.moveFleet('${params.fleetId}', ${params.targetX}, ${params.targetY});`,
          };
        } catch {
          return {
            success: false,
            message: 'Metrics server not running. Use GrandStrategySimulator directly.',
            code: `simulator.moveFleet('${params.fleetId}', ${params.targetX}, ${params.targetY});`,
          };
        }
      },
    }),

    defineAction({
      id: 'assign-megastructure-task',
      name: 'Assign Megastructure Task',
      description: 'Assign workers to a specific task on a megastructure',
      params: [
        { name: 'megastructureId', type: 'entity-id', required: true, entityType: 'megastructure', description: 'Megastructure ID' },
        {
          name: 'task',
          type: 'select',
          required: true,
          description: 'Task to assign',
          options: [
            { value: 'maintenance', label: 'Maintenance (keep operational)' },
            { value: 'expansion', label: 'Expansion (increase capacity)' },
            { value: 'research', label: 'Research (generate science)' },
            { value: 'production', label: 'Production (generate resources)' },
          ],
        },
      ],
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetch(`${context.baseUrl}/api/grand-strategy/megastructure-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              megastructureId: params.megastructureId,
              task: params.task,
            }),
          });
          if (response.ok) {
            return await response.json();
          }
          return {
            success: false,
            message: `Megastructure ${params.megastructureId} assigned task: ${params.task}`,
            hint: 'Use GrandStrategySimulator.assignMegastructureTask() for programmatic control',
            code: `simulator.assignMegastructureTask('${params.megastructureId}', '${params.task}');`,
          };
        } catch {
          return {
            success: false,
            message: 'Metrics server not running. Use GrandStrategySimulator directly.',
            code: `simulator.assignMegastructureTask('${params.megastructureId}', '${params.task}');`,
          };
        }
      },
    }),
  ],

  links: [
    defineLink({
      id: 'grand-strategy-preset',
      name: 'Launch Grand Strategy Game',
      description: 'Open game with grand-strategy preset (Empires, Fleets, Megastructures)',
      url: 'http://localhost:3000/?preset=grand-strategy',
      icon: '🏛️',
      embeddable: false,
    }),
    defineLink({
      id: 'city-simulator',
      name: 'City Simulator Dashboard',
      description: 'Open the city simulator web dashboard',
      url: 'http://localhost:3000/?preset=basic',
      icon: '🏙️',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(grandStrategyCapability);
