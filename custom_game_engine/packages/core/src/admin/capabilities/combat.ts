/**
 * Combat Capability - Manage all combat systems
 *
 * Provides admin interface for:
 * - AgentCombatSystem (agent vs agent ground combat)
 * - ShipCombatSystem (ship-to-ship combat with phases)
 * - FleetCombatSystem (fleet battles using Lanchester's Laws)
 * - SquadronCombatSystem (tactical formations)
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const COMBAT_CAUSE_OPTIONS = [
  { value: 'honor_duel', label: 'Honor Duel' },
  { value: 'defense', label: 'Self Defense' },
  { value: 'jealousy_rival', label: 'Jealousy - Rival' },
  { value: 'territory_dispute', label: 'Territory Dispute' },
  { value: 'revenge', label: 'Revenge' },
  { value: 'theft', label: 'Theft' },
  { value: 'murder', label: 'Murder' },
  { value: 'insult', label: 'Insult' },
];

const SHIP_COMBAT_PHASE_OPTIONS = [
  { value: 'range', label: 'Range Phase (long-range weapons)' },
  { value: 'close', label: 'Close Phase (short-range + coherence attacks)' },
  { value: 'boarding', label: 'Boarding Phase (marine capture attempt)' },
];

const SQUADRON_FORMATION_OPTIONS = [
  { value: 'line_ahead', label: 'Line Ahead (coordinated broadside)' },
  { value: 'line_abreast', label: 'Line Abreast (wide front)' },
  { value: 'wedge', label: 'Wedge (focus fire)' },
  { value: 'sphere', label: 'Sphere (360 defense)' },
  { value: 'echelon', label: 'Echelon (flanking)' },
  { value: 'scattered', label: 'Scattered (chaos)' },
];

const INJURY_SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor (scratches, bruises)' },
  { value: 'major', label: 'Major (broken bones, deep cuts)' },
  { value: 'critical', label: 'Critical (life-threatening)' },
];

const INJURY_LOCATION_OPTIONS = [
  { value: 'head', label: 'Head' },
  { value: 'torso', label: 'Torso' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
];

const INJURY_TYPE_OPTIONS = [
  { value: 'laceration', label: 'Laceration (cutting)' },
  { value: 'puncture', label: 'Puncture (stabbing)' },
  { value: 'blunt', label: 'Blunt (impact)' },
  { value: 'burn', label: 'Burn' },
  { value: 'frostbite', label: 'Frostbite' },
];

// ============================================================================
// Combat Capability Definition
// ============================================================================

const combatCapability = defineCapability({
  id: 'combat',
  name: 'Combat',
  description: 'Manage combat systems - agent battles, ship combat, fleet warfare',
  category: 'systems',

  tab: {
    icon: '⚔️',
    priority: 30,
  },

  queries: [
    // ========================================================================
    // Agent Combat Queries
    // ========================================================================
    defineQuery({
      id: 'list-active-combats',
      name: 'List Active Combats',
      description: 'List all ongoing combat encounters (agent, ship, fleet)',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: active)' },
        {
          name: 'type', type: 'select', required: false,
          options: [
            { value: 'all', label: 'All Types' },
            { value: 'agent', label: 'Agent Combat' },
            { value: 'ship', label: 'Ship Combat' },
            { value: 'fleet', label: 'Fleet Battle' },
          ],
          description: 'Filter by combat type'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/combats' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentCombats?: Array<{ attackerId: string; defenderId: string; state: string }>;
          shipCombats?: Array<{ attackerId: string; defenderId: string; phase: string }>;
          fleetBattles?: Array<{ fleet1Id: string; fleet2Id: string; status: string }>;
        };

        let output = 'ACTIVE COMBATS\n\n';

        if (result.agentCombats?.length) {
          output += 'Agent Combats:\n';
          result.agentCombats.forEach(c => {
            output += `  ${c.attackerId} vs ${c.defenderId} [${c.state}]\n`;
          });
        }

        if (result.shipCombats?.length) {
          output += '\nShip Combats:\n';
          result.shipCombats.forEach(c => {
            output += `  ${c.attackerId} vs ${c.defenderId} [Phase: ${c.phase}]\n`;
          });
        }

        if (result.fleetBattles?.length) {
          output += '\nFleet Battles:\n';
          result.fleetBattles.forEach(c => {
            output += `  ${c.fleet1Id} vs ${c.fleet2Id} [${c.status}]\n`;
          });
        }

        if (!result.agentCombats?.length && !result.shipCombats?.length && !result.fleetBattles?.length) {
          output += 'No active combats';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-combat-stats',
      name: 'Get Combat Stats',
      description: 'Get combat statistics for an agent (skill, equipment, power)',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to query' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/entity with combat_stats component' };
      },
      renderResult: (data: unknown) => {
        const stats = data as {
          combatSkill?: number;
          weapon?: string;
          armor?: string;
          effectivePower?: number;
          injuries?: Array<{ type: string; severity: string; location: string }>;
        };

        let output = 'COMBAT STATS\n\n';
        output += `Skill: ${stats.combatSkill ?? 'N/A'}\n`;
        output += `Weapon: ${stats.weapon ?? 'None'}\n`;
        output += `Armor: ${stats.armor ?? 'None'}\n`;
        output += `Effective Power: ${stats.effectivePower ?? 'N/A'}\n`;

        if (stats.injuries?.length) {
          output += '\nActive Injuries:\n';
          stats.injuries.forEach(i => {
            output += `  - ${i.severity} ${i.type} (${i.location})\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'simulate-combat',
      name: 'Simulate Combat Outcome',
      description: 'Predict combat outcome without executing it (dry run)',
      params: [
        { name: 'attacker', type: 'entity-id', required: true, entityType: 'agent', description: 'Attacker ID' },
        { name: 'defender', type: 'entity-id', required: true, entityType: 'agent', description: 'Defender ID' },
        { name: 'lethal', type: 'boolean', required: false, default: false, description: 'Simulate lethal combat?' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/combat/simulate' };
      },
      renderResult: (data: unknown) => {
        const sim = data as {
          attackerPower?: number;
          defenderPower?: number;
          attackerWinChance?: number;
          likelyOutcome?: string;
          modifiers?: Array<{ type: string; value: number }>;
        };

        let output = 'COMBAT SIMULATION\n\n';
        output += `Attacker Power: ${sim.attackerPower ?? 'N/A'}\n`;
        output += `Defender Power: ${sim.defenderPower ?? 'N/A'}\n`;
        output += `Attacker Win Chance: ${((sim.attackerWinChance ?? 0) * 100).toFixed(1)}%\n`;
        output += `Likely Outcome: ${sim.likelyOutcome ?? 'Unknown'}\n`;

        if (sim.modifiers?.length) {
          output += '\nModifiers:\n';
          sim.modifiers.forEach(m => {
            output += `  ${m.type}: ${m.value > 0 ? '+' : ''}${m.value}\n`;
          });
        }

        return output;
      },
    }),

    // ========================================================================
    // Ship Combat Queries
    // ========================================================================
    defineQuery({
      id: 'get-ship-combat-status',
      name: 'Get Ship Combat Status',
      description: 'Get detailed status of a ship-to-ship combat encounter',
      params: [
        { name: 'attackerId', type: 'entity-id', required: true, description: 'Attacking ship ID' },
        { name: 'defenderId', type: 'entity-id', required: true, description: 'Defending ship ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/combat/ship-status' };
      },
      renderResult: (data: unknown) => {
        const enc = data as {
          phase?: string;
          attackerHull?: number;
          defenderHull?: number;
          attackerCoherence?: number;
          defenderCoherence?: number;
          boardingMarines?: number;
          victor?: string;
        };

        let output = 'SHIP COMBAT STATUS\n\n';
        output += `Phase: ${enc.phase ?? 'N/A'}\n\n`;
        output += `Attacker:\n`;
        output += `  Hull: ${((enc.attackerHull ?? 0) * 100).toFixed(1)}%\n`;
        output += `  Coherence: ${((enc.attackerCoherence ?? 0) * 100).toFixed(1)}%\n\n`;
        output += `Defender:\n`;
        output += `  Hull: ${((enc.defenderHull ?? 0) * 100).toFixed(1)}%\n`;
        output += `  Coherence: ${((enc.defenderCoherence ?? 0) * 100).toFixed(1)}%\n`;

        if (enc.boardingMarines) {
          output += `\nBoarding Marines: ${enc.boardingMarines}\n`;
        }

        if (enc.victor) {
          output += `\nVictor: ${enc.victor}\n`;
        }

        return output;
      },
    }),

    // ========================================================================
    // Fleet Combat Queries
    // ========================================================================
    defineQuery({
      id: 'get-fleet-combat-power',
      name: 'Get Fleet Combat Power',
      description: 'Calculate fleet combat power including coherence modifiers',
      params: [
        { name: 'fleetId', type: 'entity-id', required: true, description: 'Fleet entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/combat/fleet-power' };
      },
      renderResult: (data: unknown) => {
        const fleet = data as {
          fleetId?: string;
          fleetName?: string;
          totalShips?: number;
          offensiveRating?: number;
          defensiveRating?: number;
          coherence?: number;
          coherenceModifier?: number;
          effectivePower?: number;
        };

        let output = 'FLEET COMBAT POWER\n\n';
        output += `Fleet: ${fleet.fleetName ?? fleet.fleetId ?? 'Unknown'}\n`;
        output += `Ships: ${fleet.totalShips ?? 0}\n`;
        output += `Offensive Rating: ${fleet.offensiveRating ?? 0}\n`;
        output += `Defensive Rating: ${fleet.defensiveRating ?? 0}\n`;
        output += `Coherence: ${((fleet.coherence ?? 0) * 100).toFixed(1)}%\n`;
        output += `Coherence Modifier: ${((fleet.coherenceModifier ?? 1) * 100).toFixed(0)}%\n`;
        output += `Effective Power: ${fleet.effectivePower ?? 0}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'simulate-fleet-battle',
      name: 'Simulate Fleet Battle',
      description: 'Predict fleet battle outcome using Lanchester\'s Laws',
      params: [
        { name: 'fleet1Id', type: 'entity-id', required: true, description: 'First fleet ID' },
        { name: 'fleet2Id', type: 'entity-id', required: true, description: 'Second fleet ID' },
        { name: 'duration', type: 'number', required: false, default: 100, description: 'Battle duration (ticks)' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/combat/simulate-fleet' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          fleet1Remaining?: number;
          fleet2Remaining?: number;
          victor?: string;
          shipsLost1?: number;
          shipsLost2?: number;
        };

        let output = 'FLEET BATTLE SIMULATION\n\n';
        output += `Fleet 1 Remaining: ${result.fleet1Remaining ?? 0} ships\n`;
        output += `Fleet 2 Remaining: ${result.fleet2Remaining ?? 0} ships\n`;
        output += `Ships Lost (Fleet 1): ${result.shipsLost1 ?? 0}\n`;
        output += `Ships Lost (Fleet 2): ${result.shipsLost2 ?? 0}\n`;
        output += `Predicted Victor: ${result.victor ?? 'Unknown'}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-formation-advantage',
      name: 'Get Formation Advantage',
      description: 'Calculate tactical formation advantages between two squadrons',
      params: [
        {
          name: 'formation1', type: 'select', required: true,
          options: SQUADRON_FORMATION_OPTIONS,
          description: 'First squadron formation'
        },
        {
          name: 'formation2', type: 'select', required: true,
          options: SQUADRON_FORMATION_OPTIONS,
          description: 'Second squadron formation'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/combat/formation-advantage' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          formation1?: string;
          formation2?: string;
          bonus1?: number;
          bonus2?: number;
          explanation?: string;
        };

        let output = 'FORMATION ADVANTAGE\n\n';
        output += `${result.formation1 ?? 'F1'}: ${((result.bonus1 ?? 0) * 100).toFixed(0)}% bonus\n`;
        output += `${result.formation2 ?? 'F2'}: ${((result.bonus2 ?? 0) * 100).toFixed(0)}% bonus\n`;

        if (result.explanation) {
          output += `\n${result.explanation}\n`;
        }

        return output;
      },
    }),
  ],

  actions: [
    // ========================================================================
    // Agent Combat Actions
    // ========================================================================
    defineAction({
      id: 'initiate-agent-combat',
      name: 'Initiate Agent Combat',
      description: 'Start combat between two agents',
      params: [
        { name: 'attackerId', type: 'entity-id', required: true, entityType: 'agent', description: 'Attacking agent' },
        { name: 'defenderId', type: 'entity-id', required: true, entityType: 'agent', description: 'Defending agent' },
        { name: 'cause', type: 'select', required: true, options: COMBAT_CAUSE_OPTIONS, description: 'Combat cause' },
        { name: 'lethal', type: 'boolean', required: false, default: false, description: 'Is combat lethal?' },
        { name: 'surprise', type: 'boolean', required: false, default: false, description: 'Attacker has surprise?' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/initiate-combat' };
      },
    }),

    defineAction({
      id: 'resolve-agent-combat',
      name: 'Resolve Agent Combat',
      description: 'Immediately resolve ongoing agent combat (skip duration)',
      params: [
        { name: 'attackerId', type: 'entity-id', required: true, entityType: 'agent', description: 'Attacker ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/resolve-combat' };
      },
    }),

    defineAction({
      id: 'apply-injury',
      name: 'Apply Injury',
      description: 'Apply an injury to an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to injure' },
        { name: 'severity', type: 'select', required: true, options: INJURY_SEVERITY_OPTIONS, description: 'Injury severity' },
        { name: 'location', type: 'select', required: true, options: INJURY_LOCATION_OPTIONS, description: 'Injury location' },
        { name: 'injuryType', type: 'select', required: true, options: INJURY_TYPE_OPTIONS, description: 'Injury type' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/apply-injury' };
      },
    }),

    defineAction({
      id: 'heal-injuries',
      name: 'Heal Injuries',
      description: 'Remove all injuries from an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to heal' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/heal-injuries' };
      },
    }),

    defineAction({
      id: 'set-combat-skill',
      name: 'Set Combat Skill',
      description: 'Set an agent\'s combat skill level',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Target agent' },
        { name: 'skill', type: 'number', required: true, description: 'Combat skill level (0-10)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-combat-skill' };
      },
    }),

    // ========================================================================
    // Ship Combat Actions
    // ========================================================================
    defineAction({
      id: 'initiate-ship-combat',
      name: 'Initiate Ship Combat',
      description: 'Start combat between two ships',
      params: [
        { name: 'attackerId', type: 'entity-id', required: true, description: 'Attacking ship entity ID' },
        { name: 'defenderId', type: 'entity-id', required: true, description: 'Defending ship entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/initiate-ship-combat' };
      },
    }),

    defineAction({
      id: 'advance-ship-combat-phase',
      name: 'Advance Ship Combat Phase',
      description: 'Advance ship combat to the next phase (range → close → boarding)',
      params: [
        { name: 'attackerId', type: 'entity-id', required: true, description: 'Attacker ship ID' },
        { name: 'defenderId', type: 'entity-id', required: true, description: 'Defender ship ID' },
        { name: 'targetPhase', type: 'select', required: false, options: SHIP_COMBAT_PHASE_OPTIONS, description: 'Target phase (or auto-advance)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/advance-ship-combat' };
      },
    }),

    defineAction({
      id: 'apply-ship-damage',
      name: 'Apply Ship Damage',
      description: 'Apply hull damage to a ship',
      params: [
        { name: 'shipId', type: 'entity-id', required: true, description: 'Ship to damage' },
        { name: 'hullDamage', type: 'number', required: true, description: 'Hull damage (0.0-1.0)' },
        { name: 'coherenceLoss', type: 'number', required: false, default: 0, description: 'Coherence loss (0.0-1.0)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/apply-ship-damage' };
      },
    }),

    defineAction({
      id: 'repair-ship',
      name: 'Repair Ship',
      description: 'Repair ship hull and restore crew coherence',
      params: [
        { name: 'shipId', type: 'entity-id', required: true, description: 'Ship to repair' },
        { name: 'hullRepair', type: 'number', required: false, default: 1.0, description: 'Hull repair (0.0-1.0)' },
        { name: 'coherenceRestore', type: 'number', required: false, default: 1.0, description: 'Coherence restore (0.0-1.0)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/repair-ship' };
      },
    }),

    // ========================================================================
    // Fleet Combat Actions
    // ========================================================================
    defineAction({
      id: 'initiate-fleet-battle',
      name: 'Initiate Fleet Battle',
      description: 'Start a fleet-scale battle using Lanchester\'s Laws',
      params: [
        { name: 'fleet1Id', type: 'entity-id', required: true, description: 'First fleet entity ID' },
        { name: 'fleet2Id', type: 'entity-id', required: true, description: 'Second fleet entity ID' },
        { name: 'duration', type: 'number', required: false, default: 100, description: 'Battle duration (ticks)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/initiate-fleet-battle' };
      },
    }),

    defineAction({
      id: 'initiate-squadron-battle',
      name: 'Initiate Squadron Battle',
      description: 'Start a tactical squadron engagement',
      params: [
        { name: 'squadron1Id', type: 'entity-id', required: true, description: 'First squadron entity ID' },
        { name: 'squadron2Id', type: 'entity-id', required: true, description: 'Second squadron entity ID' },
        { name: 'duration', type: 'number', required: false, default: 50, description: 'Battle duration (ticks)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/initiate-squadron-battle' };
      },
    }),

    defineAction({
      id: 'set-squadron-formation',
      name: 'Set Squadron Formation',
      description: 'Change a squadron\'s tactical formation',
      params: [
        { name: 'squadronId', type: 'entity-id', required: true, description: 'Squadron entity ID' },
        { name: 'formation', type: 'select', required: true, options: SQUADRON_FORMATION_OPTIONS, description: 'New formation' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-squadron-formation' };
      },
    }),

    defineAction({
      id: 'reinforce-fleet',
      name: 'Reinforce Fleet',
      description: 'Add ships to a fleet during battle',
      params: [
        { name: 'fleetId', type: 'entity-id', required: true, description: 'Fleet to reinforce' },
        { name: 'shipCount', type: 'number', required: true, description: 'Number of ships to add' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/reinforce-fleet' };
      },
    }),

    // ========================================================================
    // Armada Actions
    // ========================================================================
    defineAction({
      id: 'initiate-armada-campaign',
      name: 'Initiate Armada Campaign',
      description: 'Start an armada campaign for contested star systems',
      params: [
        { name: 'armada1Id', type: 'entity-id', required: true, description: 'First armada entity ID' },
        { name: 'armada2Id', type: 'entity-id', required: true, description: 'Second armada entity ID' },
        { name: 'contestedSystems', type: 'string', required: true, description: 'Comma-separated system IDs' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/initiate-armada-campaign' };
      },
    }),

    // ========================================================================
    // Dangerous Actions
    // ========================================================================
    defineAction({
      id: 'instant-kill',
      name: 'Instant Kill',
      description: 'Immediately kill an agent (dev testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to kill' },
        { name: 'causeOfDeath', type: 'string', required: false, default: 'admin_action', description: 'Cause of death' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/instant-kill' };
      },
    }),

    defineAction({
      id: 'destroy-ship',
      name: 'Destroy Ship',
      description: 'Immediately destroy a ship (dev testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'shipId', type: 'entity-id', required: true, description: 'Ship to destroy' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/destroy-ship' };
      },
    }),

    defineAction({
      id: 'wipe-fleet',
      name: 'Wipe Fleet',
      description: 'Destroy all ships in a fleet (dev testing)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'fleetId', type: 'entity-id', required: true, description: 'Fleet to wipe' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/wipe-fleet' };
      },
    }),
  ],
});

capabilityRegistry.register(combatCapability);
