/**
 * BlockadeComponent - Military blockade of trade chokepoint
 *
 * Represents a fleet blockading a strategic trade node to disrupt enemy supply lines.
 * Part of Tier 3 Trade Network strategic gameplay.
 *
 * Key features:
 * - Fleet-based blockade of chokepoints
 * - Effectiveness based on fleet strength
 * - Cascade effects on dependent nodes
 * - Combat tracking for blockade breaking attempts
 *
 * CLAUDE.md Compliance:
 * - Component type follows lowercase_with_underscores convention
 * - No silent fallbacks - all required fields must be present
 */

import type { EntityId } from '../types.js';

/**
 * Blockade Component - Military blockade of trade node
 */
export interface BlockadeComponent {
  readonly type: 'blockade';
  readonly version: number;

  // ============================================================================
  // Identity
  // ============================================================================

  /** Unique blockade identifier */
  blockadeId: string;

  /** Target node being blockaded (settlement/hub entity ID) */
  targetNodeId: EntityId;

  /** Trade network this blockade affects */
  networkId: string;

  // ============================================================================
  // Military Forces
  // ============================================================================

  /** Blockading fleet entity ID */
  blockadingFleetId: EntityId;

  /** Faction conducting the blockade */
  blockadingFaction: EntityId;

  /** Fleet strength (number of ships or combat power) */
  fleetStrength: number;

  // ============================================================================
  // Effectiveness
  // ============================================================================

  /**
   * Blockade effectiveness (0-1)
   * - 0 = no effect (blockade broken)
   * - 0.5 = 50% reduction in flow rates
   * - 1.0 = complete blockade
   *
   * Calculated from: fleetStrength, defenderStrength, chokepoint characteristics
   */
  effectiveness: number;

  /** Flow rate reduction multiplier (1 - effectiveness) */
  flowReductionMultiplier: number;

  // ============================================================================
  // Defense & Combat
  // ============================================================================

  /** Defending fleet entity IDs (if any) */
  defendingFleetIds: EntityId[];

  /** Combined defender strength */
  defenderStrength: number;

  /** Combat casualties */
  casualties: {
    attacker: {
      shipsLost: number;
      personnelLost: number;
    };
    defender: {
      shipsLost: number;
      personnelLost: number;
    };
  };

  /** Combat events (for history/UI) */
  combatLog: Array<BlockadeCombatEvent>;

  // ============================================================================
  // Economic Impact
  // ============================================================================

  /** Nodes affected by this blockade (downstream dependencies) */
  affectedNodes: EntityId[];

  /** Edges affected (shipping lanes blocked) */
  affectedEdges: string[];

  /** Estimated economic damage per tick (lost trade value) */
  economicDamagePerTick: number;

  /** Total economic damage inflicted */
  totalEconomicDamage: number;

  // ============================================================================
  // Status
  // ============================================================================

  /** Blockade status */
  status: 'active' | 'contested' | 'broken' | 'lifted';

  /** When blockade was established */
  startedTick: number;

  /** When blockade ended (undefined if still active) */
  endedTick?: number;

  /** Reason for ending (if ended) */
  endReason?: 'combat_loss' | 'voluntary_withdrawal' | 'diplomatic' | 'target_destroyed';

  /** Last tick when effectiveness was calculated */
  lastUpdateTick: number;
}

/**
 * Combat event during blockade
 */
export interface BlockadeCombatEvent {
  /** Event type */
  type: 'engagement' | 'reinforcement' | 'breakthrough' | 'retreat';

  /** When event occurred */
  tick: number;

  /** Fleets involved */
  attackingFleetId?: EntityId;
  defendingFleetId?: EntityId;

  /** Outcome */
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate' | 'retreat';

  /** Casualties in this event */
  casualties: {
    attackerShipsLost: number;
    defenderShipsLost: number;
  };

  /** Description */
  description: string;
}

/**
 * Create a new BlockadeComponent with defaults
 */
export function createBlockadeComponent(
  blockadeId: string,
  targetNodeId: EntityId,
  networkId: string,
  blockadingFleetId: EntityId,
  blockadingFaction: EntityId,
  fleetStrength: number,
  currentTick: number
): BlockadeComponent {
  return {
    type: 'blockade',
    version: 1,
    blockadeId,
    targetNodeId,
    networkId,
    blockadingFleetId,
    blockadingFaction,
    fleetStrength,
    effectiveness: 0, // Calculated by system
    flowReductionMultiplier: 1.0,
    defendingFleetIds: [],
    defenderStrength: 0,
    casualties: {
      attacker: {
        shipsLost: 0,
        personnelLost: 0,
      },
      defender: {
        shipsLost: 0,
        personnelLost: 0,
      },
    },
    combatLog: [],
    affectedNodes: [],
    affectedEdges: [],
    economicDamagePerTick: 0,
    totalEconomicDamage: 0,
    status: 'active',
    startedTick: currentTick,
    lastUpdateTick: currentTick,
  };
}
