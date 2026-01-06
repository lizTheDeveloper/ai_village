import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Forward-Compatibility: Body Part & Injury System
// These interfaces are placeholders for future combat/medical systems.
// Currently unused but defined to avoid breaking changes later.
// ============================================================================

/** Types of injuries that can affect body parts */
export type NeedsInjuryType =
  | 'cut'        // Slashing damage
  | 'bruise'     // Blunt damage
  | 'fracture'   // Broken bone
  | 'burn'       // Fire/heat damage
  | 'frostbite'  // Cold damage
  | 'infection'  // Disease/contamination
  | 'puncture'   // Piercing damage
  | 'sprain';    // Joint injury

/** Severity levels for injuries */
export type NeedsInjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

/**
 * Represents an injury to a body part.
 * Future: Used by combat and medical systems.
 */
export interface NeedsInjury {
  /** Unique identifier for this injury */
  id: string;
  /** Type of injury */
  type: NeedsInjuryType;
  /** Severity level */
  severity: NeedsInjurySeverity;
  /** Numeric severity (0-1, where 1 is worst) */
  severityValue: number;
  /** Whether the injury is actively bleeding */
  bleeding: boolean;
  /** Whether the injury is infected */
  infected: boolean;
  /** Healing progress (0-1, where 1 is fully healed) */
  healingProgress: number;
  /** Game tick when injury occurred */
  timestamp: number;
  /** What caused the injury (weapon, fall, fire, etc.) */
  cause?: string;
}

/** Body part identifiers */
export type BodyPartId =
  | 'head'
  | 'neck'
  | 'torso'
  | 'left_arm'
  | 'right_arm'
  | 'left_hand'
  | 'right_hand'
  | 'left_leg'
  | 'right_leg'
  | 'left_foot'
  | 'right_foot';

/**
 * Represents a body part with health tracking.
 * Future: Used by combat and medical systems.
 */
export interface NeedsBodyPart {
  /** Which body part this is */
  id: BodyPartId;
  /** Health of this body part (0-1) */
  health: number;
  /** Whether this part is critical (death if destroyed) */
  isCritical: boolean;
  /** Whether this part is a limb (can be disabled/amputated) */
  isLimb: boolean;
  /** Active injuries on this body part */
  injuries: NeedsInjury[];
  /** Whether this limb is functional (can be false due to nerve damage) */
  functional: boolean;
  /** Whether this limb has been amputated */
  amputated: boolean;
}

/**
 * Default body parts configuration for humanoid agents.
 * Call this to initialize body parts for an agent.
 */
export function createDefaultBodyParts(): NeedsBodyPart[] {
  return [
    { id: 'head', health: 1.0, isCritical: true, isLimb: false, injuries: [], functional: true, amputated: false },
    { id: 'neck', health: 1.0, isCritical: true, isLimb: false, injuries: [], functional: true, amputated: false },
    { id: 'torso', health: 1.0, isCritical: true, isLimb: false, injuries: [], functional: true, amputated: false },
    { id: 'left_arm', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'right_arm', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'left_hand', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'right_hand', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'left_leg', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'right_leg', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'left_foot', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
    { id: 'right_foot', health: 1.0, isCritical: false, isLimb: true, injuries: [], functional: true, amputated: false },
  ];
}

/**
 * Tracks an agent's physical needs on a 0.0 to 1.0 scale.
 * 0.0 = critical/empty, 1.0 = full/healthy
 */
export class NeedsComponent extends ComponentBase {
  public readonly type = 'needs';

  /** Hunger level: 0 = starving, 1 = full */
  public hunger: number;

  /** Energy level: 0 = exhausted, 1 = energized */
  public energy: number;

  /** Health level: 0 = dead, 1 = healthy */
  public health: number;

  /** Hydration level: 0 = dehydrated, 1 = hydrated */
  public thirst: number;

  /** Body temperature in Celsius */
  public temperature: number;

  /**
   * Composite social need: 0 = lonely, 1 = satisfied
   * This is the weighted average of socialContact, socialDepth, socialBelonging.
   * Kept for backwards compatibility with existing systems.
   */
  public social: number;

  /**
   * Need for social contact: "I want to talk to someone"
   * Satisfied by any conversation, regardless of quality.
   * 0 = desperate for any interaction
   * 1 = fully satisfied
   */
  public socialContact: number;

  /**
   * Need for meaningful conversation: "I want a meaningful conversation"
   * Satisfied by conversation quality and depth.
   * 0 = starving for depth
   * 1 = fully satisfied
   */
  public socialDepth: number;

  /**
   * Need for belonging: "I feel part of the community"
   * Satisfied by group activities and shared interests.
   * 0 = isolated and disconnected
   * 1 = fully belonging
   */
  public socialBelonging: number;

  /** Mental stimulation: 0 = bored, 1 = engaged */
  public stimulation: number;

  /** Rate of hunger decay per game tick */
  public hungerDecayRate: number;

  /** Rate of energy decay per game tick */
  public energyDecayRate: number;

  /**
   * Tracks how many ticks hunger has been at exactly 0.
   * Used for starvation mechanics:
   * - 1 game day (14,400 ticks) → "I haven't eaten in a day"
   * - 2 game days (28,800 ticks) → "I haven't eaten in two days"
   * - 3 game days (43,200 ticks) → "I haven't eaten in three days"
   * - 4 game days (57,600 ticks) → "It's been four days since I've eaten. I can't take another day of this"
   * - 5 game days (72,000 ticks) → starvation death
   */
  public ticksAtZeroHunger: number;

  /**
   * Tracks which starvation milestone memories have been issued.
   * Prevents duplicate memories at each threshold (1, 2, 3, 4 days).
   */
  public starvationDayMemoriesIssued: Set<number>;

  // ============================================================================
  // Forward-Compatibility: Body Parts (optional, for future combat/medical)
  // ============================================================================

  /**
   * Individual body part health tracking.
   * Future: Used by combat system for localized damage.
   * When undefined, use overall `health` value for all checks.
   */
  public bodyParts?: NeedsBodyPart[];

  constructor(options?: Partial<NeedsComponent>) {
    super();
    // Set defaults
    this.hunger = 1.0;
    this.energy = 1.0;
    this.health = 1.0;
    this.thirst = 1.0;
    this.temperature = 37; // Normal body temp
    this.social = 0.5;
    this.socialContact = 0.5;
    this.socialDepth = 0.5;
    this.socialBelonging = 0.5;
    this.stimulation = 0.5;
    this.hungerDecayRate = 0.001;
    this.energyDecayRate = 0.0005;
    this.ticksAtZeroHunger = 0;
    this.starvationDayMemoriesIssued = new Set<number>();
    // bodyParts is intentionally undefined by default for backward compatibility

    // Apply overrides
    if (options) {
      Object.assign(this, options);
    }
  }

  /**
   * Calculate overall health from body parts if they exist.
   * Critical parts (head, neck, torso) have more weight.
   */
  getOverallHealth(): number {
    if (!this.bodyParts || this.bodyParts.length === 0) {
      return this.health;
    }

    let totalWeight = 0;
    let weightedHealth = 0;

    for (const part of this.bodyParts) {
      const weight = part.isCritical ? 3 : 1;
      totalWeight += weight;
      weightedHealth += part.health * weight;
    }

    return weightedHealth / totalWeight;
  }

  /** Clone this component */
  clone(): NeedsComponent {
    const cloned = new NeedsComponent({ ...this });
    // Deep clone body parts if they exist
    if (this.bodyParts) {
      cloned.bodyParts = this.bodyParts.map(part => ({
        ...part,
        injuries: part.injuries.map(injury => ({ ...injury })),
      }));
    }
    // Deep clone the starvation memories Set
    if (this.starvationDayMemoriesIssued) {
      cloned.starvationDayMemoriesIssued = new Set(this.starvationDayMemoriesIssued);
    }
    return cloned;
  }
}

/**
 * Check if agent is hungry (below 50%)
 */
export function isHungry(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isHungry: needs parameter is required');
  }
  return needs.hunger < 0.5; // Agents start seeking food at 50% hunger
}

/**
 * Check if agent is starving (below 10%)
 */
export function isStarving(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isStarving: needs parameter is required');
  }
  return needs.hunger < 0.1;
}

/**
 * Check if agent is tired (below 30%)
 */
export function isTired(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isTired: needs parameter is required');
  }
  return needs.energy < 0.3;
}

/**
 * Check if agent is exhausted (below 10%)
 */
export function isExhausted(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isExhausted: needs parameter is required');
  }
  return needs.energy < 0.1;
}

/**
 * Check if agent's health is critical (below 20%)
 */
export function isHealthCritical(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isHealthCritical: needs parameter is required');
  }
  return needs.health < 0.2;
}

/**
 * Check if agent is dying (below 5%)
 */
export function isDying(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isDying: needs parameter is required');
  }
  return needs.health < 0.05;
}

/**
 * Check if agent is lonely (below 30% social contact)
 */
export function isLonely(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isLonely: needs parameter is required');
  }
  // Use socialContact if available, fallback to social for backwards compatibility
  return (needs.socialContact ?? needs.social) < 0.3;
}

/**
 * Check if agent craves deep conversation (below 40% social depth)
 */
export function cravesDepth(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('cravesDepth: needs parameter is required');
  }
  return (needs.socialDepth ?? needs.social) < 0.4;
}

/**
 * Check if agent feels isolated from community (below 30% social belonging)
 */
export function feelsIsolated(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('feelsIsolated: needs parameter is required');
  }
  return (needs.socialBelonging ?? needs.social) < 0.3;
}

/**
 * Calculate composite social need from sub-needs.
 * Used for backwards compatibility and overall social assessment.
 */
export function calculateSocialNeed(needs: NeedsComponent): number {
  if (!needs) {
    throw new Error('calculateSocialNeed: needs parameter is required');
  }
  // If sub-needs exist, calculate weighted average
  if (needs.socialContact !== undefined && needs.socialDepth !== undefined && needs.socialBelonging !== undefined) {
    return (needs.socialContact + needs.socialDepth + needs.socialBelonging) / 3;
  }
  // Fallback to existing social value
  return needs.social;
}

/**
 * Update composite social need from sub-needs.
 * Call this after modifying any social sub-need to keep .social in sync.
 */
export function updateCompositeSocial(needs: NeedsComponent): void {
  if (!needs) {
    throw new Error('updateCompositeSocial: needs parameter is required');
  }
  needs.social = calculateSocialNeed(needs);
}

/**
 * Check if agent is bored (below 30%)
 */
export function isBored(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isBored: needs parameter is required');
  }
  return needs.stimulation < 0.3;
}

/**
 * Migrate legacy NeedsComponent data (0-100 scale) to new format (0-1 scale)
 */
export function migrateNeedsComponent(data: any): NeedsComponent {
  if (!data) {
    throw new Error('migrateNeedsComponent: data parameter is required');
  }

  // Detect legacy format by scale (values > 1.0 indicate 0-100 scale)
  const isLegacy =
    (data.hunger !== undefined && data.hunger > 1.0) ||
    (data.energy !== undefined && data.energy > 1.0) ||
    (data.health !== undefined && data.health > 1.0);

  // Get social value (either existing or default)
  const socialValue = data.social ?? 0.5;

  if (isLegacy) {
    return new NeedsComponent({
      hunger: (data.hunger ?? 100) / 100,
      energy: (data.energy ?? 100) / 100,
      health: (data.health ?? 100) / 100,
      thirst: (data.thirst ?? 100) / 100,
      temperature: data.temperature ?? 37,
      social: socialValue,
      // Initialize sub-needs from social if not present
      socialContact: data.socialContact ?? socialValue,
      socialDepth: data.socialDepth ?? socialValue,
      socialBelonging: data.socialBelonging ?? socialValue,
      stimulation: data.stimulation ?? 0.5,
      hungerDecayRate: data.hungerDecayRate ? data.hungerDecayRate / 100 : 0.001,
      energyDecayRate: data.energyDecayRate ? data.energyDecayRate / 100 : 0.0005,
    });
  }

  // New format - ensure social sub-needs exist
  const needs = new NeedsComponent(data);

  // If sub-needs not present, initialize from composite social
  if (data.socialContact === undefined) {
    needs.socialContact = needs.social;
  }
  if (data.socialDepth === undefined) {
    needs.socialDepth = needs.social;
  }
  if (data.socialBelonging === undefined) {
    needs.socialBelonging = needs.social;
  }

  return needs;
}
