/**
 * ThreatDetectionComponent
 *
 * Tracks nearby threats and calculates power differentials for auto-response.
 * Supports:
 * - Hostile agents (enemies)
 * - Wild animals
 * - Incoming projectiles (ranged/magic attacks)
 */

import type { Component } from '../ecs/Component.js';
import type { AttackType } from '../types/CombatTypes.js';

export interface DetectedThreat {
  /** Entity ID of the threat */
  threatId: string;

  /** Type of threat */
  type: 'hostile_agent' | 'wild_animal' | 'projectile';

  /** Attack type of this threat */
  attackType: AttackType;

  /** Estimated power level (0-100) */
  powerLevel: number;

  /** Distance in tiles */
  distance: number;

  /** Direction to threat (for fleeing opposite direction) */
  direction: { x: number; y: number };

  /** For projectiles: velocity vector */
  velocity?: { x: number; y: number };

  /** When this threat was detected */
  detectedAt: number;
}

export interface ThreatResponse {
  /** Chosen response */
  action: 'flee' | 'attack' | 'seek_cover' | 'stand_ground';

  /** Target threat ID (for attack) */
  targetId?: string;

  /** Direction to flee (for flee) */
  fleeDirection?: { x: number; y: number };

  /** Cover position (for seek_cover) */
  coverPosition?: { x: number; y: number };

  /** Reasoning for decision */
  reason: string;
}

export interface ThreatDetectionComponent extends Component {
  readonly type: 'threat_detection';
  readonly version: 1;

  /** Currently detected threats */
  threats: DetectedThreat[];

  /** Current threat response (if auto-response triggered) */
  currentResponse?: ThreatResponse;

  /** Agent's estimated combat power (0-100) */
  ownPowerLevel: number;

  /** Last threat scan timestamp */
  lastScanTime: number;

  /** Scan cooldown in ticks (don't scan every tick) */
  scanInterval: number;
}

export function createThreatDetectionComponent(
  ownPowerLevel: number = 50,
  scanInterval: number = 10 // Scan every 10 ticks (~0.5 seconds)
): ThreatDetectionComponent {
  return {
    type: 'threat_detection',
    version: 1,
    threats: [],
    currentResponse: undefined,
    ownPowerLevel,
    lastScanTime: 0,
    scanInterval,
  };
}

/**
 * Calculate power differential
 * Returns: +ve = agent is stronger, -ve = threat is stronger
 */
export function calculatePowerDifferential(
  agentPower: number,
  threatPower: number
): number {
  return agentPower - threatPower;
}

/**
 * Determine if threat is critical (much stronger than agent)
 */
export function isCriticalThreat(differential: number): boolean {
  return differential < -30; // Threat is 30+ power levels higher
}

/**
 * Determine if agent can likely win
 */
export function canLikelyWin(differential: number): boolean {
  return differential > 15; // Agent is 15+ power levels higher
}

/**
 * Determine if fight is evenly matched
 */
export function isEvenMatch(differential: number): boolean {
  return Math.abs(differential) <= 15;
}
