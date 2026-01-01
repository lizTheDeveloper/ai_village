import type { Component } from '../ecs/Component.js';

/**
 * PlayerControlComponent - Tracks player possession state
 *
 * Phase 16: Polish & Player - Player Avatar System
 * Marks which agent (if any) is currently controlled by the player.
 * Used by PossessionSystem to manage jack-in/jack-out mechanics.
 */
export interface PlayerControlComponent extends Component {
  type: 'player_control';

  /**
   * Whether an agent is currently possessed by the player
   */
  isPossessed: boolean;

  /**
   * ID of the agent currently being possessed (if any)
   */
  possessedAgentId: string | null;

  /**
   * Tick when possession started
   */
  possessionStartTick: number;

  /**
   * Belief cost per tick while possessed
   * Base cost increases with agent activity level
   */
  beliefCostPerTick: number;

  /**
   * Total belief spent on current possession session
   */
  totalBeliefSpent: number;

  /**
   * Input mode: which control scheme is active
   * - 'god': Free camera, click to select entities
   * - 'possessed': Camera follows agent, WASD to move
   */
  inputMode: 'god' | 'possessed';

  /**
   * Last tick when player input was received
   * Used to detect idle state and reduce belief drain
   */
  lastInputTick: number;

  /**
   * Movement command from player input
   * null = no movement, direction = move in that direction
   */
  movementCommand: MovementDirection | null;

  /**
   * Queued interaction from player input
   * Used for click-to-interact mechanics
   */
  pendingInteraction: PendingInteraction | null;
}

/**
 * Movement direction from player input
 */
export type MovementDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

/**
 * Pending interaction from player click
 */
export interface PendingInteraction {
  /** Target entity ID (if clicking on entity) */
  targetEntityId?: string;

  /** World coordinates (if clicking on ground) */
  targetX?: number;
  targetY?: number;

  /** Type of interaction */
  type: 'move' | 'interact' | 'attack' | 'use';

  /** Tick when interaction was queued */
  queuedTick: number;
}

/**
 * Create a new PlayerControlComponent with default god-mode state
 */
export function createPlayerControlComponent(): PlayerControlComponent {
  return {
    type: 'player_control',
    version: 1,
    isPossessed: false,
    possessedAgentId: null,
    possessionStartTick: 0,
    beliefCostPerTick: 0.1, // Base cost: 0.1 belief per tick
    totalBeliefSpent: 0,
    inputMode: 'god',
    lastInputTick: 0,
    movementCommand: null,
    pendingInteraction: null,
  };
}

/**
 * Calculate belief cost for possession based on activity
 * Higher activity = higher cost
 */
export function calculatePossessionCost(
  baseRate: number,
  isMoving: boolean,
  isInCombat: boolean,
  isUsingAbility: boolean
): number {
  let cost = baseRate;

  if (isMoving) {
    cost *= 1.2; // 20% increase while moving
  }

  if (isInCombat) {
    cost *= 2.0; // Double cost during combat
  }

  if (isUsingAbility) {
    cost *= 3.0; // Triple cost when using divine abilities
  }

  return cost;
}

/**
 * Check if possession should be forcibly ended
 * Reasons: out of belief, agent died, time limit exceeded
 */
export function shouldEndPossession(
  component: PlayerControlComponent,
  currentTick: number,
  availableBelief: number,
  agentHealth: number,
  maxPossessionTicks: number = 12000 // 10 minutes at 20 TPS
): { shouldEnd: boolean; reason?: string } {
  // Agent died
  if (agentHealth <= 0) {
    return { shouldEnd: true, reason: 'Agent died' };
  }

  // Out of belief
  if (availableBelief < component.beliefCostPerTick) {
    return { shouldEnd: true, reason: 'Insufficient belief' };
  }

  // Time limit exceeded
  const ticksInPossession = currentTick - component.possessionStartTick;
  if (ticksInPossession >= maxPossessionTicks) {
    return { shouldEnd: true, reason: 'Time limit exceeded' };
  }

  return { shouldEnd: false };
}
