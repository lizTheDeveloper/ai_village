/**
 * Buildings & Construction Capability - Divine oversight of construction and architecture
 *
 * Provides admin interface for:
 * - Building management (view status, occupancy, harmony)
 * - Construction queue monitoring
 * - Divine blessings and curses on structures
 * - Sacred ground designation
 * - Building harmony/feng shui systems
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const BUILDING_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'farm', label: 'Farm' },
  { value: 'mine', label: 'Mine' },
  { value: 'storehouse', label: 'Storehouse' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'market', label: 'Market' },
  { value: 'tavern', label: 'Tavern' },
  { value: 'temple', label: 'Temple' },
  { value: 'shrine', label: 'Shrine' },
  { value: 'barracks', label: 'Barracks' },
  { value: 'wall', label: 'Wall' },
  { value: 'tower', label: 'Tower' },
  { value: 'shipyard', label: 'Shipyard' },
  { value: 'observatory', label: 'Observatory' },
  { value: 'library', label: 'Library' },
  { value: 'school', label: 'School' },
  { value: 'hospital', label: 'Hospital' },
];

const BUILDING_STATUS_OPTIONS = [
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'operational', label: 'Operational' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'consecrated', label: 'Consecrated (Blessed)' },
  { value: 'cursed', label: 'Cursed' },
];

const HARMONY_ASPECT_OPTIONS = [
  { value: 'all', label: 'All Aspects' },
  { value: 'structural', label: 'Structural Harmony' },
  { value: 'elemental', label: 'Elemental Balance' },
  { value: 'spiritual', label: 'Spiritual Alignment' },
  { value: 'community', label: 'Community Energy' },
  { value: 'environmental', label: 'Environmental Flow' },
];

const BLESSING_TYPE_OPTIONS = [
  { value: 'prosperity', label: 'Prosperity (Production +25%)' },
  { value: 'protection', label: 'Protection (Decay -50%)' },
  { value: 'harmony', label: 'Harmony (Happiness +20%)' },
  { value: 'wisdom', label: 'Wisdom (Learning +30%)' },
  { value: 'healing', label: 'Healing (Recovery +40%)' },
  { value: 'fertility', label: 'Fertility (Growth +35%)' },
];

const CURSE_TYPE_OPTIONS = [
  { value: 'decay', label: 'Decay (Health -2%/day)' },
  { value: 'haunting', label: 'Haunting (Fear events)' },
  { value: 'inefficiency', label: 'Inefficiency (Output -30%)' },
  { value: 'accidents', label: 'Accidents (Injury chance +10%)' },
  { value: 'discord', label: 'Discord (Arguments +50%)' },
];

const SACRED_GROUND_TYPE_OPTIONS = [
  { value: 'blessed', label: 'Blessed Land (All buildings +10% harmony)' },
  { value: 'holy_site', label: 'Holy Site (Religious buildings +30%)' },
  { value: 'ancient_power', label: 'Ancient Power (Mysterious effects)' },
  { value: 'memorial', label: 'Memorial Ground (Ancestor blessings)' },
  { value: 'forbidden', label: 'Forbidden Zone (Construction blocked)' },
];

// ============================================================================
// Buildings & Construction Capability Definition
// ============================================================================

const buildingsConstructionCapability = defineCapability({
  id: 'buildings-construction',
  name: 'Buildings & Construction',
  description: 'Divine oversight of architecture, construction, and building harmony',
  category: 'entities',

  tab: {
    icon: '🏛️',
    priority: 25,
  },

  queries: [
    // ========================================================================
    // Building Status Queries
    // ========================================================================
    defineQuery({
      id: 'view-buildings',
      name: 'View Buildings',
      description: 'List all buildings with their current status',
      params: [
        { name: 'type', type: 'select', required: false, options: BUILDING_TYPE_OPTIONS, description: 'Filter by building type' },
        { name: 'status', type: 'select', required: false, options: BUILDING_STATUS_OPTIONS, description: 'Filter by status' },
        { name: 'minHarmony', type: 'number', required: false, description: 'Minimum harmony level (0-100)' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/buildings with filters' };
      },
      renderResult: (data: unknown) => {
        const buildings = (data as {
          buildings?: Array<{
            id: string;
            name: string;
            type: string;
            status: string;
            harmony?: number;
            workers: number;
            x: number;
            y: number;
            consecrated?: boolean;
            cursed?: boolean;
          }>;
        })?.buildings || [];

        let output = 'BUILDINGS\n\n';
        if (buildings.length === 0) {
          output += 'No buildings found';
        } else {
          for (const b of buildings) {
            const statusIndicator = b.consecrated ? '✨' : b.cursed ? '💀' : '';
            output += `${statusIndicator} ${b.name} (${b.type})\n`;
            output += `  ID: ${b.id}\n`;
            output += `  Status: ${b.status}\n`;
            if (b.harmony !== undefined) {
              output += `  Harmony: ${b.harmony.toFixed(0)}%\n`;
            }
            output += `  Workers: ${b.workers}\n`;
            output += `  Location: (${b.x}, ${b.y})\n\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-building-details',
      name: 'Get Building Details',
      description: 'Get comprehensive information about a specific building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entity with full building data' };
      },
      renderResult: (data: unknown) => {
        const building = data as {
          name?: string;
          type?: string;
          status?: string;
          health?: number;
          harmony?: {
            overall: number;
            structural: number;
            elemental: number;
            spiritual: number;
            community: number;
            environmental: number;
          };
          workers?: Array<{ id: string; name: string; role: string }>;
          occupants?: Array<{ id: string; name: string; relationship: string }>;
          production?: { outputType: string; rate: number; efficiency: number };
          blessings?: Array<{ type: string; strength: number; expiry: number }>;
          curses?: Array<{ type: string; severity: number; source: string }>;
          secretRooms?: number;
        };

        let output = `BUILDING: ${building.name ?? 'Unknown'}\n\n`;
        output += `Type: ${building.type ?? 'N/A'}\n`;
        output += `Status: ${building.status ?? 'Unknown'}\n`;
        output += `Health: ${((building.health ?? 1) * 100).toFixed(0)}%\n\n`;

        if (building.harmony) {
          output += 'HARMONY:\n';
          output += `  Overall: ${building.harmony.overall.toFixed(0)}%\n`;
          output += `  Structural: ${building.harmony.structural.toFixed(0)}%\n`;
          output += `  Elemental: ${building.harmony.elemental.toFixed(0)}%\n`;
          output += `  Spiritual: ${building.harmony.spiritual.toFixed(0)}%\n`;
          output += `  Community: ${building.harmony.community.toFixed(0)}%\n`;
          output += `  Environmental: ${building.harmony.environmental.toFixed(0)}%\n\n`;
        }

        if (building.workers?.length) {
          output += `WORKERS (${building.workers.length}):\n`;
          for (const w of building.workers) {
            output += `  ${w.name} - ${w.role}\n`;
          }
          output += '\n';
        }

        if (building.occupants?.length) {
          output += `OCCUPANTS (${building.occupants.length}):\n`;
          for (const o of building.occupants) {
            output += `  ${o.name} (${o.relationship})\n`;
          }
          output += '\n';
        }

        if (building.production) {
          output += 'PRODUCTION:\n';
          output += `  Output: ${building.production.outputType}\n`;
          output += `  Rate: ${building.production.rate}/tick\n`;
          output += `  Efficiency: ${(building.production.efficiency * 100).toFixed(0)}%\n\n`;
        }

        if (building.blessings?.length) {
          output += 'BLESSINGS:\n';
          for (const b of building.blessings) {
            output += `  ✨ ${b.type} (${b.strength}%) - expires tick ${b.expiry}\n`;
          }
          output += '\n';
        }

        if (building.curses?.length) {
          output += 'CURSES:\n';
          for (const c of building.curses) {
            output += `  💀 ${c.type} (${c.severity}%) - source: ${c.source}\n`;
          }
          output += '\n';
        }

        if (building.secretRooms) {
          output += `SECRET ROOMS: ${building.secretRooms} hidden chambers detected\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-building-occupants',
      name: 'View Building Occupants',
      description: 'See all entities currently inside or using a building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/building-occupants' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          building?: string;
          occupants?: Array<{
            id: string;
            name: string;
            type: string;
            relationship: string;
            currentActivity: string;
            satisfaction: number;
          }>;
        };

        let output = `OCCUPANTS OF ${result.building ?? 'Unknown Building'}\n\n`;

        if (!result.occupants?.length) {
          output += 'No occupants (building is empty)';
        } else {
          for (const o of result.occupants) {
            output += `${o.name} (${o.type})\n`;
            output += `  Relationship: ${o.relationship}\n`;
            output += `  Activity: ${o.currentActivity}\n`;
            output += `  Satisfaction: ${(o.satisfaction * 100).toFixed(0)}%\n\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-abandoned-buildings',
      name: 'Find Abandoned Buildings',
      description: 'Locate unused or abandoned structures',
      params: [
        { name: 'minDaysAbandoned', type: 'number', required: false, default: 3, description: 'Minimum days without activity' },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/abandoned-buildings' };
      },
      renderResult: (data: unknown) => {
        const buildings = (data as {
          buildings?: Array<{
            id: string;
            name: string;
            type: string;
            daysAbandoned: number;
            lastActivity: string;
            decay: number;
            x: number;
            y: number;
          }>;
        })?.buildings || [];

        let output = 'ABANDONED BUILDINGS\n\n';
        if (buildings.length === 0) {
          output += 'No abandoned buildings found (healthy civilization!)';
        } else {
          for (const b of buildings) {
            output += `${b.name} (${b.type})\n`;
            output += `  ID: ${b.id}\n`;
            output += `  Abandoned: ${b.daysAbandoned.toFixed(1)} days\n`;
            output += `  Last Activity: ${b.lastActivity}\n`;
            output += `  Decay: ${(b.decay * 100).toFixed(0)}%\n`;
            output += `  Location: (${b.x}, ${b.y})\n\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-building-harmony',
      name: 'View Building Harmony',
      description: 'Analyze feng shui and harmony levels of buildings',
      params: [
        { name: 'aspect', type: 'select', required: false, options: HARMONY_ASPECT_OPTIONS, description: 'Harmony aspect to analyze' },
        { name: 'minHarmony', type: 'number', required: false, default: 0, description: 'Minimum harmony level' },
        { name: 'maxHarmony', type: 'number', required: false, default: 100, description: 'Maximum harmony level' },
        { name: 'limit', type: 'number', required: false, default: 30, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/building-harmony' };
      },
      renderResult: (data: unknown) => {
        const buildings = (data as {
          aspect?: string;
          buildings?: Array<{
            id: string;
            name: string;
            type: string;
            harmony: number;
            factors: {
              positive: string[];
              negative: string[];
            };
            x: number;
            y: number;
          }>;
        })?.buildings || [];

        let output = `BUILDING HARMONY ANALYSIS\n`;
        if (data && typeof data === 'object' && 'aspect' in data) {
          output += `Aspect: ${(data as { aspect?: string }).aspect ?? 'Overall'}\n`;
        }
        output += '\n';

        if (buildings.length === 0) {
          output += 'No buildings match criteria';
        } else {
          for (const b of buildings) {
            const indicator = b.harmony >= 80 ? '✨' : b.harmony >= 50 ? '⚖️' : '⚠️';
            output += `${indicator} ${b.name} (${b.type}) - ${b.harmony.toFixed(0)}%\n`;
            output += `  Location: (${b.x}, ${b.y})\n`;

            if (b.factors.positive.length > 0) {
              output += `  Positive: ${b.factors.positive.join(', ')}\n`;
            }
            if (b.factors.negative.length > 0) {
              output += `  Negative: ${b.factors.negative.join(', ')}\n`;
            }
            output += '\n';
          }
        }

        return output;
      },
    }),

    // ========================================================================
    // Construction Queue Queries
    // ========================================================================
    defineQuery({
      id: 'view-construction-queue',
      name: 'View Construction Queue',
      description: 'See all buildings currently under construction',
      params: [
        { name: 'orderBy', type: 'select', required: false, options: [
          { value: 'progress', label: 'By Progress' },
          { value: 'eta', label: 'By Completion Time' },
          { value: 'type', label: 'By Building Type' },
        ], description: 'Sort order' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/construction-queue' };
      },
      renderResult: (data: unknown) => {
        const projects = (data as {
          projects?: Array<{
            id: string;
            name: string;
            type: string;
            progress: number;
            workersAssigned: number;
            workersNeeded: number;
            eta: number;
            x: number;
            y: number;
          }>;
        })?.projects || [];

        let output = 'CONSTRUCTION QUEUE\n\n';
        if (projects.length === 0) {
          output += 'No active construction projects';
        } else {
          for (const p of projects) {
            output += `${p.name} (${p.type})\n`;
            output += `  ID: ${p.id}\n`;
            output += `  Progress: ${(p.progress * 100).toFixed(0)}%\n`;
            output += `  Workers: ${p.workersAssigned}/${p.workersNeeded}\n`;
            output += `  ETA: ${p.eta} ticks\n`;
            output += `  Location: (${p.x}, ${p.y})\n\n`;
          }
        }

        return output;
      },
    }),
  ],

  actions: [
    // ========================================================================
    // Divine Building Actions
    // ========================================================================
    defineAction({
      id: 'consecrate-building',
      name: 'Consecrate Building',
      description: 'Bless a building with divine favor (improved harmony and efficiency)',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to consecrate' },
        { name: 'blessing', type: 'select', required: true, options: BLESSING_TYPE_OPTIONS, description: 'Type of blessing' },
        { name: 'duration', type: 'number', required: false, default: 12000, description: 'Duration in ticks (default: 10 minutes)' },
        { name: 'strength', type: 'number', required: false, default: 100, description: 'Blessing strength (0-100)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Consecrated building with ${params.blessing} blessing` };
      },
    }),

    defineAction({
      id: 'curse-structure',
      name: 'Curse Structure',
      description: 'Mark a building as cursed (dangerous effects)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to curse' },
        { name: 'curse', type: 'select', required: true, options: CURSE_TYPE_OPTIONS, description: 'Type of curse' },
        { name: 'severity', type: 'number', required: false, default: 50, description: 'Curse severity (0-100)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for curse (lore)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Cursed building with ${params.curse}` };
      },
    }),

    defineAction({
      id: 'hasten-construction',
      name: 'Hasten Construction',
      description: 'Divinely accelerate construction progress',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Construction project ID' },
        { name: 'percentage', type: 'number', required: false, default: 50, description: 'Progress to add (0-100%)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Advanced construction by ${params.percentage}%` };
      },
    }),

    defineAction({
      id: 'repair-building',
      name: 'Divine Repair',
      description: 'Instantly repair building damage through divine intervention',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to repair' },
        { name: 'repairAmount', type: 'number', required: false, default: 100, description: 'Health to restore (0-100%)' },
        { name: 'removeDecay', type: 'boolean', required: false, default: true, description: 'Also remove decay effects' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Building repaired through divine power' };
      },
    }),

    defineAction({
      id: 'reveal-hidden-room',
      name: 'Reveal Hidden Room',
      description: 'Divine sight reveals a secret room within a building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to reveal secrets in' },
        { name: 'roomType', type: 'select', required: false, options: [
          { value: 'vault', label: 'Hidden Vault (treasure)' },
          { value: 'library', label: 'Secret Library (knowledge)' },
          { value: 'shrine', label: 'Hidden Shrine (spiritual)' },
          { value: 'laboratory', label: 'Secret Lab (experiments)' },
          { value: 'passage', label: 'Hidden Passage (escape route)' },
        ], description: 'Type of hidden room to create' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Divine sight reveals a hidden chamber!' };
      },
    }),

    defineAction({
      id: 'designate-sacred-ground',
      name: 'Designate Sacred Ground',
      description: 'Mark land as sacred, affecting all buildings in the area',
      params: [
        { name: 'x', type: 'number', required: true, description: 'Center X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Center Y coordinate' },
        { name: 'radius', type: 'number', required: false, default: 10, description: 'Radius of sacred area' },
        { name: 'type', type: 'select', required: true, options: SACRED_GROUND_TYPE_OPTIONS, description: 'Type of sacred ground' },
        { name: 'permanent', type: 'boolean', required: false, default: false, description: 'Make permanent (requires confirmation)' },
      ],
      requiresConfirmation: true,
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Designated ${params.radius}-tile radius as ${params.type} sacred ground` };
      },
    }),

    defineAction({
      id: 'improve-harmony',
      name: 'Improve Building Harmony',
      description: 'Directly improve feng shui/harmony of a building',
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to harmonize' },
        { name: 'aspect', type: 'select', required: false, options: HARMONY_ASPECT_OPTIONS, description: 'Aspect to improve (default: all)' },
        { name: 'amount', type: 'number', required: false, default: 25, description: 'Harmony points to add' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Improved building harmony by ${params.amount} points` };
      },
    }),

    defineAction({
      id: 'demolish-building',
      name: 'Divine Demolition',
      description: 'Instantly remove a building from existence',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to demolish' },
        { name: 'returnResources', type: 'boolean', required: false, default: true, description: 'Return 50% of materials' },
        { name: 'relocateOccupants', type: 'boolean', required: false, default: true, description: 'Safely relocate occupants' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Building removed from existence' };
      },
    }),

    defineAction({
      id: 'transmute-building',
      name: 'Transmute Building',
      description: 'Change a building into a different type (advanced divine power)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'buildingId', type: 'entity-id', required: true, description: 'Building to transmute' },
        { name: 'newType', type: 'select', required: true, options: BUILDING_TYPE_OPTIONS, description: 'New building type' },
        { name: 'preserveOccupants', type: 'boolean', required: false, default: true, description: 'Keep current occupants' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: `Transmuted building to ${params.newType}` };
      },
    }),
  ],
});

capabilityRegistry.register(buildingsConstructionCapability);
