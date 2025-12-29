/**
 * HearsayMemory - Agent-level social knowledge
 *
 * This is what agents personally know from:
 * 1. Direct observation (fog-of-war)
 * 2. Information told by others (hearsay)
 *
 * Unlike MapKnowledge (world-level), this is PER-AGENT and lightweight.
 * Agents don't store precise coordinates - they store:
 * - "Alice said berries are north" (direction, not position)
 * - Trust scores for each source
 * - Personal verification history
 *
 * This enables the "berries up north" communication pattern with
 * trust/reliability mechanics.
 */

import type { Component } from '../ecs/Component.js';
import type { AreaResourceType } from './MapKnowledge.js';

/**
 * Cardinal directions for area-level knowledge
 */
export type CardinalDirection = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest' | 'nearby';

/**
 * A piece of information received from another agent
 */
export interface Hearsay {
  /** What resource was mentioned */
  resourceType: AreaResourceType;

  /** Direction from speaker's position (when they told us) */
  direction: CardinalDirection;

  /** Rough distance ("close", "medium", "far") */
  distance: 'close' | 'medium' | 'far';

  /** Who told us this */
  sourceAgentId: string;

  /** Source agent's name (for LLM context) */
  sourceAgentName: string;

  /** When we heard this (game tick) */
  heardAt: number;

  /** Speaker's position when they told us (for relative direction) */
  speakerPosition: { x: number; y: number };

  /** Has this been verified? */
  verified: boolean;

  /** Was verification successful? (null = not yet verified) */
  verificationResult: boolean | null;
}

/**
 * Trust rating for an information source
 */
export interface TrustRating {
  /** Agent ID */
  agentId: string;

  /** Agent name */
  agentName: string;

  /** Trust score 0-1 (0.5 = neutral, 0 = never trust, 1 = always trust) */
  score: number;

  /** Number of successful verifications */
  successCount: number;

  /** Number of failed verifications */
  failureCount: number;

  /** Last interaction tick */
  lastUpdated: number;
}

/**
 * Personal exploration record (fog-of-war)
 */
export interface ExploredSector {
  /** Sector coordinates */
  sectorX: number;
  sectorY: number;

  /** When personally explored */
  exploredAt: number;

  /** What was found there */
  foundResources: AreaResourceType[];
}

/**
 * HearsayMemoryComponent - Lightweight agent knowledge
 *
 * Stores:
 * - Hearsay from other agents (limited to recent, ~20 entries)
 * - Trust ratings for known agents
 * - Personal exploration history (fog-of-war)
 */
export interface HearsayMemoryComponent extends Component {
  type: 'hearsay_memory';
  version: 1;

  /** Information heard from others (FIFO, capped at 20) */
  hearsay: Hearsay[];

  /** Trust ratings for other agents */
  trustRatings: Map<string, TrustRating>;

  /** Personally explored sectors (fog-of-war) */
  exploredSectors: Map<string, ExploredSector>;

  /** Default trust for unknown agents */
  defaultTrust: number;
}

/**
 * Create a new HearsayMemoryComponent
 */
export function createHearsayMemoryComponent(): HearsayMemoryComponent {
  return {
    type: 'hearsay_memory',
    version: 1,
    hearsay: [],
    trustRatings: new Map(),
    exploredSectors: new Map(),
    defaultTrust: 0.5, // Neutral trust for strangers
  };
}

// ============================================================================
// Hearsay Management Functions
// ============================================================================

const MAX_HEARSAY = 20;

/**
 * Add hearsay from another agent.
 * "Alice told me there's wood to the north"
 */
export function addHearsay(
  memory: HearsayMemoryComponent,
  resourceType: AreaResourceType,
  direction: CardinalDirection,
  distance: 'close' | 'medium' | 'far',
  sourceAgentId: string,
  sourceAgentName: string,
  speakerPosition: { x: number; y: number },
  currentTick: number
): void {
  const hearsay: Hearsay = {
    resourceType,
    direction,
    distance,
    sourceAgentId,
    sourceAgentName,
    heardAt: currentTick,
    speakerPosition,
    verified: false,
    verificationResult: null,
  };

  // Add to front (most recent first)
  memory.hearsay.unshift(hearsay);

  // Cap at MAX_HEARSAY (FIFO eviction)
  if (memory.hearsay.length > MAX_HEARSAY) {
    memory.hearsay.pop();
  }
}

/**
 * Get hearsay for a specific resource type, weighted by trust.
 * Returns most trusted + recent information.
 */
export function getHearsayForResource(
  memory: HearsayMemoryComponent,
  resourceType: AreaResourceType,
  currentTick: number,
  maxAge: number = 500
): Array<Hearsay & { trustScore: number }> {
  const results: Array<Hearsay & { trustScore: number }> = [];

  for (const h of memory.hearsay) {
    if (h.resourceType !== resourceType) continue;

    // Skip old hearsay
    const age = currentTick - h.heardAt;
    if (age > maxAge) continue;

    // Get trust score for source
    const trust = memory.trustRatings.get(h.sourceAgentId);
    const trustScore = trust?.score ?? memory.defaultTrust;

    // Skip already-verified-false hearsay
    if (h.verified && !h.verificationResult) continue;

    results.push({ ...h, trustScore });
  }

  // Sort by trust × recency
  results.sort((a, b) => {
    const ageA = currentTick - a.heardAt;
    const ageB = currentTick - b.heardAt;
    const recencyA = 1 - ageA / maxAge;
    const recencyB = 1 - ageB / maxAge;

    const scoreA = a.trustScore * 0.7 + recencyA * 0.3;
    const scoreB = b.trustScore * 0.7 + recencyB * 0.3;

    return scoreB - scoreA;
  });

  return results;
}

/**
 * Mark hearsay as verified (agent checked and found/didn't find resource)
 */
export function verifyHearsay(
  memory: HearsayMemoryComponent,
  hearsayIndex: number,
  success: boolean,
  currentTick: number
): void {
  const h = memory.hearsay[hearsayIndex];
  if (!h) return;

  h.verified = true;
  h.verificationResult = success;

  // Update trust rating for source
  updateHearsayTrust(memory, h.sourceAgentId, h.sourceAgentName, success, currentTick);
}

// ============================================================================
// Trust Management Functions
// ============================================================================

/**
 * Update trust rating based on verification result
 */
export function updateHearsayTrust(
  memory: HearsayMemoryComponent,
  agentId: string,
  agentName: string,
  success: boolean,
  currentTick: number
): void {
  let trust = memory.trustRatings.get(agentId);

  if (!trust) {
    trust = {
      agentId,
      agentName,
      score: memory.defaultTrust,
      successCount: 0,
      failureCount: 0,
      lastUpdated: currentTick,
    };
    memory.trustRatings.set(agentId, trust);
  }

  if (success) {
    trust.successCount++;
    // Increase trust (diminishing returns)
    const boost = 0.1 * (1 - trust.score); // Smaller boost when already high
    trust.score = Math.min(1.0, trust.score + boost);
  } else {
    trust.failureCount++;
    // Decrease trust (larger penalty for lies)
    const penalty = 0.15 * trust.score; // Bigger penalty when trusted
    trust.score = Math.max(0.1, trust.score - penalty); // Never fully zero
  }

  trust.lastUpdated = currentTick;
}

/**
 * Get trust score for an agent
 */
export function getTrustScore(memory: HearsayMemoryComponent, agentId: string): number {
  return memory.trustRatings.get(agentId)?.score ?? memory.defaultTrust;
}

/**
 * Get all agents sorted by trust
 */
export function getTrustedAgents(memory: HearsayMemoryComponent): TrustRating[] {
  return Array.from(memory.trustRatings.values()).sort((a, b) => b.score - a.score);
}

// ============================================================================
// Fog-of-War Functions
// ============================================================================

/**
 * Mark a sector as personally explored
 */
export function markExplored(
  memory: HearsayMemoryComponent,
  sectorX: number,
  sectorY: number,
  foundResources: AreaResourceType[],
  currentTick: number
): void {
  const key = `${sectorX},${sectorY}`;
  memory.exploredSectors.set(key, {
    sectorX,
    sectorY,
    exploredAt: currentTick,
    foundResources,
  });
}

/**
 * Check if sector has been personally explored
 */
export function hasExplored(memory: HearsayMemoryComponent, sectorX: number, sectorY: number): boolean {
  return memory.exploredSectors.has(`${sectorX},${sectorY}`);
}

/**
 * Get unexplored sectors in a radius (for exploration priority)
 */
export function getUnexploredInRadius(
  memory: HearsayMemoryComponent,
  centerSectorX: number,
  centerSectorY: number,
  radius: number
): Array<{ sectorX: number; sectorY: number }> {
  const unexplored: Array<{ sectorX: number; sectorY: number }> = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const sectorX = centerSectorX + dx;
      const sectorY = centerSectorY + dy;

      if (!hasExplored(memory, sectorX, sectorY)) {
        unexplored.push({ sectorX, sectorY });
      }
    }
  }

  // Sort by distance from center
  unexplored.sort((a, b) => {
    const distA = Math.abs(a.sectorX - centerSectorX) + Math.abs(a.sectorY - centerSectorY);
    const distB = Math.abs(b.sectorX - centerSectorX) + Math.abs(b.sectorY - centerSectorY);
    return distA - distB;
  });

  return unexplored;
}

// ============================================================================
// LLM Context Helpers
// ============================================================================

/**
 * Generate human-readable summary of what agent knows about a resource.
 * For LLM context.
 */
export function describeKnownResources(
  memory: HearsayMemoryComponent,
  resourceType: AreaResourceType,
  currentTick: number
): string {
  const hearsay = getHearsayForResource(memory, resourceType, currentTick);

  if (hearsay.length === 0) {
    return `You don't know where to find ${resourceType}.`;
  }

  const parts: string[] = [];

  for (const h of hearsay.slice(0, 3)) {
    // Top 3 most trusted/recent
    const trustDesc = h.trustScore >= 0.7 ? 'reliable' : h.trustScore >= 0.4 ? '' : 'unreliable';
    const ageDesc = currentTick - h.heardAt < 100 ? 'recently' : 'a while ago';

    if (h.verified && h.verificationResult) {
      parts.push(`${h.sourceAgentName} correctly said ${resourceType} is ${h.direction} (verified)`);
    } else if (h.verified && !h.verificationResult) {
      // Skip - already filtered out
    } else {
      parts.push(`${trustDesc} ${h.sourceAgentName} said ${ageDesc}: ${resourceType} is ${h.distance} to the ${h.direction}`);
    }
  }

  return parts.join('. ') + '.';
}

/**
 * Generate trust summary for LLM context
 */
export function describeTrustRelationships(memory: HearsayMemoryComponent): string {
  const trusted = getTrustedAgents(memory);

  if (trusted.length === 0) {
    return "You haven't formed opinions about anyone's reliability yet.";
  }

  const parts: string[] = [];

  for (const t of trusted.slice(0, 5)) {
    if (t.score >= 0.8) {
      parts.push(`${t.agentName} is very trustworthy (${t.successCount} accurate, ${t.failureCount} wrong)`);
    } else if (t.score >= 0.6) {
      parts.push(`${t.agentName} is somewhat reliable`);
    } else if (t.score <= 0.3) {
      parts.push(`${t.agentName} is unreliable - take their info with a grain of salt`);
    }
  }

  if (parts.length === 0) {
    return "You haven't formed strong opinions about anyone yet.";
  }

  return parts.join('. ') + '.';
}
