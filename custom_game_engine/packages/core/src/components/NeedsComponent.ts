import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Forward-Compatibility: Body Part & Injury System
// These interfaces are placeholders for future combat/medical systems.
// Currently unused but defined to avoid breaking changes later.
// ============================================================================

/** Types of injuries that can affect body parts */
export type InjuryType =
  | 'cut'        // Slashing damage
  | 'bruise'     // Blunt damage
  | 'fracture'   // Broken bone
  | 'burn'       // Fire/heat damage
  | 'frostbite'  // Cold damage
  | 'infection'  // Disease/contamination
  | 'puncture'   // Piercing damage
  | 'sprain';    // Joint injury

/** Severity levels for injuries */
export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

/**
 * Represents an injury to a body part.
 * Future: Used by combat and medical systems.
 */
export interface Injury {
  /** Unique identifier for this injury */
  id: string;
  /** Type of injury */
  type: InjuryType;
  /** Severity level */
  severity: InjurySeverity;
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
export interface BodyPart {
  /** Which body part this is */
  id: BodyPartId;
  /** Health of this body part (0-1) */
  health: number;
  /** Whether this part is critical (death if destroyed) */
  isCritical: boolean;
  /** Whether this part is a limb (can be disabled/amputated) */
  isLimb: boolean;
  /** Active injuries on this body part */
  injuries: Injury[];
  /** Whether this limb is functional (can be false due to nerve damage) */
  functional: boolean;
  /** Whether this limb has been amputated */
  amputated: boolean;
}

/**
 * Default body parts configuration for humanoid agents.
 * Call this to initialize body parts for an agent.
 */
export function createDefaultBodyParts(): BodyPart[] {
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

  /** Social need: 0 = lonely, 1 = satisfied */
  public social: number;

  /** Mental stimulation: 0 = bored, 1 = engaged */
  public stimulation: number;

  /** Rate of hunger decay per game tick */
  public hungerDecayRate: number;

  /** Rate of energy decay per game tick */
  public energyDecayRate: number;

  // ============================================================================
  // Forward-Compatibility: Body Parts (optional, for future combat/medical)
  // ============================================================================

  /**
   * Individual body part health tracking.
   * Future: Used by combat system for localized damage.
   * When undefined, use overall `health` value for all checks.
   */
  public bodyParts?: BodyPart[];

  constructor(options?: Partial<NeedsComponent>) {
    super();
    // Set defaults
    this.hunger = 1.0;
    this.energy = 1.0;
    this.health = 1.0;
    this.thirst = 1.0;
    this.temperature = 37; // Normal body temp
    this.social = 0.5;
    this.stimulation = 0.5;
    this.hungerDecayRate = 0.001;
    this.energyDecayRate = 0.0005;
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
    return cloned;
  }
}

/**
 * Check if agent is hungry (below 40%)
 */
export function isHungry(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isHungry: needs parameter is required');
  }
  return needs.hunger < 0.4;
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
 * Check if agent is lonely (below 30%)
 */
export function isLonely(needs: NeedsComponent): boolean {
  if (!needs) {
    throw new Error('isLonely: needs parameter is required');
  }
  return needs.social < 0.3;
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

  if (isLegacy) {
    return new NeedsComponent({
      hunger: (data.hunger ?? 100) / 100,
      energy: (data.energy ?? 100) / 100,
      health: (data.health ?? 100) / 100,
      thirst: (data.thirst ?? 100) / 100,
      temperature: data.temperature ?? 37,
      social: data.social ?? 0.5,
      stimulation: data.stimulation ?? 0.5,
      hungerDecayRate: data.hungerDecayRate ? data.hungerDecayRate / 100 : 0.001,
      energyDecayRate: data.energyDecayRate ? data.energyDecayRate / 100 : 0.0005,
    });
  }

  // Already in new format
  return new NeedsComponent(data);
}
