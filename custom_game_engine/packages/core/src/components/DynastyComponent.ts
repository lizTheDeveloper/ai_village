import type { Component } from '../ecs/Component.js';

/**
 * DynastyComponent - Dynasty membership for soul agents
 *
 * Tracks an agent's position in the imperial dynasty lineage.
 * Used for succession mechanics and legitimacy calculations.
 *
 * Attached to soul agents who are members of ruling dynasties.
 */

export type SuccessionPosition = 'heir' | 'spare' | 'minor' | 'cadet' | 'bastard';

/**
 * Dynasty component for soul agents
 */
export interface DynastyComponent extends Component {
  type: 'dynasty';
  version: 1;

  // Dynasty identity
  dynastyId: string;
  dynastyName: string;

  // Position in succession
  position: SuccessionPosition;
  lineageDistance: number; // 0 = current ruler, 1 = child, 2 = grandchild, etc.

  // Legitimacy factors
  legitimacy: number; // 0-1 calculated score
  legitimacyFactors: {
    bloodlineCloseness: number; // 0-1 (direct descendant = 1.0)
    age: number; // 0-1 (optimal age range = 1.0)
    skills: number; // 0-1 (based on governance/military skills)
    traits: number; // 0-1 (leadership traits)
    publicSupport: number; // 0-1 (popularity)
  };

  // Family relationships
  parentId?: string; // Soul agent ID
  spouseIds: string[]; // Soul agent IDs
  childrenIds: string[]; // Soul agent IDs
  siblingsIds: string[]; // Soul agent IDs

  // Status
  isRuler: boolean; // Currently ruling
  isHeir: boolean; // Designated heir
  reignStart?: number; // Tick when started ruling
  reignEnd?: number; // Tick when stopped ruling

  // Historical
  titles: string[]; // "Emperor Kara I", "Empress Zara the Great"
  achievements: string[];
  failings: string[];

  // Tracking
  lastUpdatedTick: number;
}

/**
 * Create a new DynastyComponent
 */
export function createDynastyComponent(
  dynastyId: string,
  dynastyName: string,
  position: SuccessionPosition,
  lineageDistance: number,
  currentTick: number
): DynastyComponent {
  return {
    type: 'dynasty',
    version: 1,
    dynastyId,
    dynastyName,
    position,
    lineageDistance,
    legitimacy: 0.5,
    legitimacyFactors: {
      bloodlineCloseness: 1.0 / (lineageDistance + 1), // Closer = higher
      age: 0.5,
      skills: 0.5,
      traits: 0.5,
      publicSupport: 0.5,
    },
    spouseIds: [],
    childrenIds: [],
    siblingsIds: [],
    isRuler: false,
    isHeir: false,
    titles: [],
    achievements: [],
    failings: [],
    lastUpdatedTick: currentTick,
  };
}

/**
 * Calculate legitimacy score based on succession type
 */
export function calculateLegitimacy(
  dynasty: DynastyComponent,
  successionType: 'primogeniture' | 'election' | 'meritocracy' | 'divine_right'
): number {
  const factors = dynasty.legitimacyFactors;

  switch (successionType) {
    case 'primogeniture':
      // Bloodline and age matter most
      return (
        factors.bloodlineCloseness * 0.6 +
        factors.age * 0.2 +
        factors.publicSupport * 0.2
      );

    case 'election':
      // Public support and skills matter most
      return (
        factors.publicSupport * 0.4 +
        factors.skills * 0.3 +
        factors.traits * 0.2 +
        factors.bloodlineCloseness * 0.1
      );

    case 'meritocracy':
      // Skills and traits are everything
      return (
        factors.skills * 0.5 +
        factors.traits * 0.3 +
        factors.age * 0.1 +
        factors.publicSupport * 0.1
      );

    case 'divine_right':
      // Bloodline dominates, but public support matters
      return (
        factors.bloodlineCloseness * 0.7 +
        factors.publicSupport * 0.2 +
        factors.traits * 0.1
      );

    default:
      return 0.5;
  }
}

/**
 * Update legitimacy factors based on agent stats
 */
export function updateLegitimacyFactors(
  dynasty: DynastyComponent,
  agentAge: number,
  skills: Map<string, number>,
  traits: string[],
  publicSupport: number
): DynastyComponent {
  // Age factor (optimal 30-50 years)
  const ageFactor = agentAge < 30
    ? agentAge / 30 // Too young
    : agentAge > 50
      ? Math.max(0, 1 - (agentAge - 50) / 30) // Too old
      : 1.0; // Optimal

  // Skills factor (governance, diplomacy, military)
  const governanceSkill = skills.get('governance') ?? 0;
  const diplomacySkill = skills.get('diplomacy') ?? 0;
  const militarySkill = skills.get('military') ?? 0;
  const skillsFactor = (governanceSkill + diplomacySkill + militarySkill) / 30; // 0-1

  // Traits factor (count leadership traits)
  const leadershipTraits = ['charismatic', 'strategic', 'just', 'brave', 'wise'];
  const negativeTraits = ['cruel', 'coward', 'incompetent', 'corrupt'];
  const positiveCount = traits.filter(t => leadershipTraits.includes(t)).length;
  const negativeCount = traits.filter(t => negativeTraits.includes(t)).length;
  const traitsFactor = Math.max(0, Math.min(1, (positiveCount - negativeCount) / 5 + 0.5));

  return {
    ...dynasty,
    legitimacyFactors: {
      ...dynasty.legitimacyFactors,
      age: ageFactor,
      skills: skillsFactor,
      traits: traitsFactor,
      publicSupport,
    },
  };
}

/**
 * Promote to ruler
 */
export function promoteToRuler(
  dynasty: DynastyComponent,
  title: string,
  tick: number
): DynastyComponent {
  return {
    ...dynasty,
    isRuler: true,
    isHeir: false,
    reignStart: tick,
    titles: [...dynasty.titles, title],
    lastUpdatedTick: tick,
  };
}

/**
 * Designate as heir
 */
export function designateAsHeir(
  dynasty: DynastyComponent,
  tick: number
): DynastyComponent {
  return {
    ...dynasty,
    isHeir: true,
    position: 'heir',
    lastUpdatedTick: tick,
  };
}

/**
 * End reign (death, abdication, overthrow)
 */
export function endReign(
  dynasty: DynastyComponent,
  tick: number,
  reason: 'death' | 'abdication' | 'overthrown'
): DynastyComponent {
  const failings = reason === 'overthrown'
    ? [...dynasty.failings, `Overthrown at tick ${tick}`]
    : dynasty.failings;

  return {
    ...dynasty,
    isRuler: false,
    reignEnd: tick,
    failings,
    lastUpdatedTick: tick,
  };
}
