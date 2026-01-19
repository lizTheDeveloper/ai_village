import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { EmotionalSignature } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Crew role aboard a spaceship
 * Determines contribution to ship functions and coherence
 */
export type CrewRole =
  | 'captain'     // Soul agent, commands ship
  | 'navigator'   // Soul agent, β-space pathfinding
  | 'pilot'       // Flies ship
  | 'engineer'    // Maintains coherence
  | 'medic'       // Crew health, stress reduction
  | 'scientist'   // Observation precision
  | 'diplomat'    // Negotiations
  | 'marine'      // Ship-to-ship combat
  | 'passenger';  // No function

// ============================================================================
// Interface
// ============================================================================

/**
 * ShipCrewComponent - Marks an agent as crew member of a ship
 * Defines role and contribution to ship coherence
 */
export interface ShipCrewComponent extends Component {
  type: 'ship_crew';
  version: 1;

  /** Ship this crew member is assigned to */
  shipId: string;

  /** Crew role (affects contribution to ship functions) */
  role: CrewRole;

  /** Rank/hierarchy within crew (1 = captain, higher = subordinate) */
  rank: number;

  /**
   * Individual emotional state contribution to ship coherence
   * Primary emotion and its intensity
   */
  emotionalContribution: {
    primary: string;  // Primary emotion (e.g., 'hope', 'fear')
    intensity: number;  // 0-1
  };

  /**
   * How strongly this crew member is "observing" the same reality
   * High coupling = good for coherence
   * 0-1 range
   */
  quantumCouplingContribution: number;

  /**
   * Morale affects coherence
   * Low morale = decoherence
   * 0-1 range
   */
  morale: number;

  /**
   * Stress from β-space navigation
   * High stress = decoherence
   * 0-1 range
   */
  betaSpaceStress: number;

  /**
   * Time aboard this ship (affects coupling)
   * Measured in ticks
   */
  timeAboard: number;

  /**
   * Permanent bond (brainship only)
   * For ship-brain symbiosis
   */
  permanentBond?: boolean;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new ShipCrewComponent
 * @param shipId - Ship entity ID
 * @param role - Crew role
 * @param rank - Hierarchy rank (1 = captain, higher = subordinate)
 * @returns New ShipCrewComponent
 */
export function createShipCrewComponent(
  shipId: string,
  role: CrewRole,
  rank: number
): ShipCrewComponent {
  // Initial emotional state based on role
  const initialEmotion = getInitialEmotionForRole(role);

  // Initial quantum coupling based on role
  const initialCoupling = getInitialCouplingForRole(role);

  return {
    type: 'ship_crew',
    version: 1,
    shipId,
    role,
    rank,
    emotionalContribution: initialEmotion,
    quantumCouplingContribution: initialCoupling,
    morale: 0.7,  // Start with decent morale
    betaSpaceStress: 0,  // No stress initially
    timeAboard: 0,  // Just joined
    permanentBond: role === 'captain' && rank === 1 ? false : undefined,
  };
}

/**
 * Get initial emotion for crew role
 */
function getInitialEmotionForRole(role: CrewRole): { primary: string; intensity: number } {
  switch (role) {
    case 'captain':
      return { primary: 'determination', intensity: 0.8 };
    case 'navigator':
      return { primary: 'focus', intensity: 0.7 };
    case 'pilot':
      return { primary: 'excitement', intensity: 0.6 };
    case 'engineer':
      return { primary: 'calm', intensity: 0.7 };
    case 'medic':
      return { primary: 'compassion', intensity: 0.6 };
    case 'scientist':
      return { primary: 'curiosity', intensity: 0.7 };
    case 'diplomat':
      return { primary: 'confidence', intensity: 0.6 };
    case 'marine':
      return { primary: 'readiness', intensity: 0.7 };
    case 'passenger':
      return { primary: 'hope', intensity: 0.5 };
    default:
      return { primary: 'neutral', intensity: 0.5 };
  }
}

/**
 * Get initial quantum coupling for crew role
 */
function getInitialCouplingForRole(role: CrewRole): number {
  switch (role) {
    case 'captain':
      return 0.9;  // Captain sets the tone
    case 'navigator':
      return 0.9;  // Navigator must be highly coupled
    case 'pilot':
      return 0.7;
    case 'engineer':
      return 0.8;  // Engineers maintain coherence
    case 'medic':
      return 0.6;
    case 'scientist':
      return 0.7;
    case 'diplomat':
      return 0.6;
    case 'marine':
      return 0.7;
    case 'passenger':
      return 0.5;  // Passengers don't contribute much
    default:
      return 0.5;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update crew member's morale
 * @param crew - ShipCrewComponent to modify
 * @param delta - Change in morale (-1 to +1)
 * @returns Updated morale value
 */
export function updateMorale(crew: ShipCrewComponent, delta: number): number {
  crew.morale = Math.max(0, Math.min(1, crew.morale + delta));
  return crew.morale;
}

/**
 * Accumulate β-space stress during navigation
 * @param crew - ShipCrewComponent to modify
 * @param navigationDuration - Duration of navigation in ticks
 * @returns Updated stress value
 */
export function accumulateStress(
  crew: ShipCrewComponent,
  navigationDuration: number
): number {
  const stressRate = 0.001;  // Per tick
  crew.betaSpaceStress += stressRate * navigationDuration;
  crew.betaSpaceStress = Math.min(1, crew.betaSpaceStress);

  // Stress affects quantum coupling
  crew.quantumCouplingContribution *= (1 - crew.betaSpaceStress * 0.5);

  // High stress decreases morale
  if (crew.betaSpaceStress > 0.5) {
    updateMorale(crew, -0.01 * navigationDuration);
  }

  return crew.betaSpaceStress;
}

/**
 * Reduce stress (medic intervention, meditation, shore leave)
 * @param crew - ShipCrewComponent to modify
 * @param amount - Amount of stress to reduce (0-1)
 * @returns Updated stress value
 */
export function reduceStress(crew: ShipCrewComponent, amount: number): number {
  crew.betaSpaceStress = Math.max(0, crew.betaSpaceStress - amount);

  // Restore quantum coupling as stress reduces
  const baselineCoupling = getInitialCouplingForRole(crew.role);
  const stressPenalty = crew.betaSpaceStress * 0.5;
  crew.quantumCouplingContribution = baselineCoupling * (1 - stressPenalty);

  return crew.betaSpaceStress;
}

/**
 * Calculate crew member's contribution to ship coherence
 * @param crew - ShipCrewComponent
 * @returns Coherence contribution (0-1)
 */
export function calculateCoherenceContribution(crew: ShipCrewComponent): number {
  // Base contribution from quantum coupling
  const couplingContribution = crew.quantumCouplingContribution;

  // Morale modifier
  const moraleModifier = crew.morale;

  // Stress penalty
  const stressPenalty = crew.betaSpaceStress;

  // Combined contribution
  const contribution = couplingContribution * moraleModifier * (1 - stressPenalty);

  return Math.max(0, Math.min(1, contribution));
}

// ============================================================================
// Coherence Calculation
// ============================================================================

/**
 * Calculate ship coherence from crew emotional states
 * @param crewMembers - Array of ShipCrewComponent
 * @returns Ship coherence value (0-1)
 */
export function calculateShipCoherence(crewMembers: ShipCrewComponent[]): number {
  if (crewMembers.length === 0) return 0;

  // Base coherence from quantum coupling
  const avgCoupling = crewMembers.reduce((sum, c) =>
    sum + c.quantumCouplingContribution * (1 - c.betaSpaceStress), 0
  ) / crewMembers.length;

  // Morale modifier (low morale = less coherence)
  const avgMorale = crewMembers.reduce((sum, c) => sum + c.morale, 0) / crewMembers.length;

  // Emotional diversity penalty (more diverse emotions = harder to sync)
  const emotionalDiversity = calculateEmotionalDiversity(crewMembers);

  // Combined coherence
  const coherence = avgCoupling * avgMorale * (1 - emotionalDiversity * 0.3);

  return Math.max(0, Math.min(1, coherence));
}

/**
 * Calculate emotional diversity across crew
 * Low diversity (all feel same) = easier coherence
 * High diversity (different emotions) = harder coherence
 * @param crewMembers - Array of ShipCrewComponent
 * @returns Diversity value (0-1)
 */
export function calculateEmotionalDiversity(crewMembers: ShipCrewComponent[]): number {
  if (crewMembers.length <= 1) return 0;

  // Count unique primary emotions
  const emotionCounts = new Map<string, number>();
  for (const crew of crewMembers) {
    const emotion = crew.emotionalContribution.primary;
    emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
  }

  // Calculate diversity as normalized unique emotion count
  // 1 emotion = 0 diversity, N emotions = 1 diversity
  const uniqueEmotions = emotionCounts.size;
  const maxDiversity = Math.min(crewMembers.length, 10);  // Cap at 10 distinct emotions
  const diversity = (uniqueEmotions - 1) / (maxDiversity - 1);

  return Math.max(0, Math.min(1, diversity));
}

/**
 * Convert crew emotional contributions to full EmotionalSignature
 * Used for ship's collective_emotional_state
 * @param crewMembers - Array of ShipCrewComponent
 * @returns EmotionalSignature aggregated from crew
 */
export function aggregateCrewEmotions(crewMembers: ShipCrewComponent[]): EmotionalSignature {
  const emotions: Record<string, number> = {};

  for (const crew of crewMembers) {
    const emotion = crew.emotionalContribution.primary;
    const intensity = crew.emotionalContribution.intensity;

    // Weight by quantum coupling (more coupled = more influence)
    const weight = crew.quantumCouplingContribution;

    if (!emotions[emotion]) {
      emotions[emotion] = 0;
    }
    emotions[emotion] += intensity * weight;
  }

  // Normalize to 0-1 range
  const maxIntensity = Math.max(...Object.values(emotions), 1);
  for (const emotion in emotions) {
    const currentValue = emotions[emotion];
    if (currentValue !== undefined) {
      emotions[emotion] = currentValue / maxIntensity;
    }
  }

  return { emotions };
}

// ============================================================================
// Schema
// ============================================================================

export const ShipCrewComponentSchema: ComponentSchema<ShipCrewComponent> = {
  type: 'ship_crew',
  version: 1,
  fields: [
    { name: 'shipId', type: 'entityId', required: true },
    { name: 'role', type: 'string', required: true },
    { name: 'rank', type: 'number', required: true },
    { name: 'emotionalContribution', type: 'object', required: true },
    { name: 'quantumCouplingContribution', type: 'number', required: true },
    { name: 'morale', type: 'number', required: true },
    { name: 'betaSpaceStress', type: 'number', required: true },
    { name: 'timeAboard', type: 'number', required: true },
    { name: 'permanentBond', type: 'boolean', required: false },
  ],
  validate: (data: unknown): data is ShipCrewComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'ship_crew') return false;
    if (!('shipId' in data) || typeof data.shipId !== 'string') return false;
    if (!('role' in data) || typeof data.role !== 'string') return false;
    if (!('rank' in data) || typeof data.rank !== 'number') return false;
    if (!('morale' in data) || typeof data.morale !== 'number') return false;
    if (!('betaSpaceStress' in data) || typeof data.betaSpaceStress !== 'number') return false;
    if (!('timeAboard' in data) || typeof data.timeAboard !== 'number') return false;
    return true;
  },
  createDefault: () => createShipCrewComponent('unknown_ship', 'passenger', 10),
};
