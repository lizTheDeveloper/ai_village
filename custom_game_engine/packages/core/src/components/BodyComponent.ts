/**
 * BodyComponent - Extensible body parts system supporting multiple species
 *
 * Supports:
 * - Humanoids (humans, elves, orcs)
 * - Aliens (insectoids with 4+ arms, avians with wings, aquatics with tentacles)
 * - Magical creatures (angels, demons, fae)
 * - Genetic engineering and cybernetics
 * - Magic transformations (body spells)
 *
 * See: custom_game_engine/specs/body-parts-system.md
 * See: custom_game_engine/BODY_SYSTEM_DESIGN.md
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Body Part Types
// ============================================================================

export type BodyPartType =
  // Humanoid parts
  | 'head' | 'torso' | 'arm' | 'hand' | 'leg' | 'foot'
  // Non-humanoid limbs
  | 'wing' | 'tentacle' | 'tail' | 'tendril' | 'pseudopod'
  // Insectoid
  | 'antenna' | 'mandible' | 'abdomen' | 'thorax'
  // Aquatic
  | 'fin' | 'gill' | 'scale'
  // Special
  | 'eye' | 'ear' | 'organ' | 'gland' | 'heart' | 'lung'
  // Magical/supernatural
  | 'halo' | 'horn' | 'fang' | 'claw' | 'stinger'
  // Custom (for unique species)
  | 'custom';

export type BodyPartFunction =
  | 'manipulation'   // Can grasp, use tools
  | 'locomotion'     // Movement
  | 'flight'         // Flying
  | 'swimming'       // Aquatic movement
  | 'sensory'        // Vision, hearing, etc.
  | 'attack'         // Natural weapon
  | 'defense'        // Natural armor
  | 'vital_organ'    // Heart, brain, etc.
  | 'special_organ'  // Venom gland, silk gland, etc.
  | 'communication'  // Voice, pheromones, etc.
  | 'balance'        // Tail for balance
  | 'none';          // Vestigial

// ============================================================================
// Injury System
// ============================================================================

export type InjuryType =
  | 'cut'           // Bleeding, affects dexterity
  | 'bruise'        // Pain, minimal lasting effect
  | 'burn'          // Pain, slow healing
  | 'fracture'      // Major debuff, needs splint
  | 'sprain'        // Moderate debuff, heals faster
  | 'puncture'      // Deep wound, infection risk
  | 'frostbite'     // From cold exposure
  | 'heatstroke';   // From heat exposure

export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export interface Injury {
  id: string;
  type: InjuryType;
  severity: InjurySeverity;
  bleedRate: number;        // Health loss per second (0 = not bleeding)
  painLevel: number;        // 0-100, contributes to stress
  healingProgress: number;  // 0-100, natural healing over time
  treatedBy?: string;       // Entity ID of healer (if treated)
  timestamp: number;        // Tick when injury occurred
}

// ============================================================================
// Body Part Modifications (Magic, Genetic, Cybernetic)
// ============================================================================

export type ModificationSource = 'magic' | 'genetic' | 'divine' | 'cybernetic' | 'mutation';

export interface BodyPartModification {
  id: string;
  name: string;
  source: ModificationSource;
  effects: {
    healthModifier?: number;              // +50 max health
    functionsAdded?: BodyPartFunction[];  // Hand gains venom delivery
    functionsRemoved?: BodyPartFunction[]; // Wing loses flight
    propertyChange?: Record<string, any>; // Color, texture, etc.
  };
  permanent: boolean;
  duration?: number;        // If temporary (in game ticks)
  createdAt: number;        // Game tick
}

// ============================================================================
// Body Part
// ============================================================================

export interface BodyPart {
  id: string;                    // Unique ID: "left_arm_1", "wing_2", "tentacle_5"
  type: BodyPartType;
  name: string;                  // Display name
  parent?: string;               // Parent part ID (hand attached to arm)
  vital: boolean;                // Death if destroyed

  // Health
  health: number;
  maxHealth: number;

  // Function
  functions: BodyPartFunction[]; // What this part does
  affectsSkills: string[];       // Skills impacted when damaged
  affectsActions: string[];      // Actions prevented when damaged

  // Injuries
  injuries: Injury[];
  bandaged: boolean;
  splinted: boolean;
  infected: boolean;

  // Modifications (magic, genetic, cybernetic)
  modifications: BodyPartModification[];
}

// ============================================================================
// Global Body Modifications
// ============================================================================

export interface GlobalBodyModification {
  id: string;
  name: string;
  source: ModificationSource;
  effects: {
    partTypeAdded?: { type: BodyPartType; count: number };  // Grew wings
    partTypeRemoved?: { type: BodyPartType; count: number }; // Lost tail
    propertyModified?: { property: string; value: any };    // Size changed
    skillModifier?: Record<string, number>;                  // Skill bonuses
  };
  permanent: boolean;
  duration?: number;             // If temporary (in game ticks)
  createdAt: number;             // Game tick
}

// ============================================================================
// Body Component
// ============================================================================

export type SizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';
export type BloodType = 'red' | 'blue' | 'green' | 'ichor' | 'sap' | 'none';
export type SkeletonType = 'internal' | 'exoskeleton' | 'hydrostatic' | 'none';

export interface BodyComponent extends Component {
  type: 'body';

  // Species & Body Plan
  speciesId?: string;            // e.g., 'human', 'thrakeen', 'olympian'
  bodyPlanId: string;            // e.g., 'humanoid_standard', 'insectoid_4arm'

  // Dynamic part list (generated from body plan)
  parts: Record<string, BodyPart>;  // ID -> BodyPart

  // Derived stats
  overallHealth: number;         // 0-100 aggregate
  totalPain: number;             // Sum of all pain
  bloodLoss: number;             // 0-100
  consciousness: boolean;        // Awake or unconscious

  // Physical properties (from species)
  size: SizeCategory;
  bloodType?: BloodType;
  skeletonType?: SkeletonType;

  // Modifications tracking (for magic, genetic engineering, etc.)
  modifications: GlobalBodyModification[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get total pain from all injuries across all body parts.
 */
export function calculateTotalPain(body: BodyComponent): number {
  let totalPain = 0;

  for (const part of Object.values(body.parts)) {
    for (const injury of part.injuries) {
      totalPain += injury.painLevel;
    }

    // Infection adds pain
    if (part.infected) {
      totalPain += 20;
    }
  }

  // Blood loss adds pain/discomfort
  totalPain += body.bloodLoss * 0.3;

  return Math.min(100, totalPain);
}

/**
 * Calculate overall health as weighted average of all parts.
 */
export function calculateOverallHealth(body: BodyComponent): number {
  if (Object.keys(body.parts).length === 0) return 100;

  let totalHealth = 0;
  let totalMaxHealth = 0;

  for (const part of Object.values(body.parts)) {
    totalHealth += part.health;
    totalMaxHealth += part.maxHealth;
  }

  return totalMaxHealth > 0 ? (totalHealth / totalMaxHealth) * 100 : 0;
}

/**
 * Get skill debuff from body part damage.
 * Accounts for part redundancy (4 arms = each less critical than 2 arms).
 */
export function getSkillDebuff(body: BodyComponent, skillId: string): number {
  let debuff = 0;

  for (const part of Object.values(body.parts)) {
    if (part.affectsSkills.includes(skillId)) {
      const damagePercent = 1 - (part.health / part.maxHealth);
      const partWeight = getPartWeight(part, body);
      debuff += damagePercent * partWeight;
    }
  }

  // Cap at 90% (always some chance of success)
  return Math.min(0.9, debuff);
}

/**
 * Get part weight for skill debuff calculation.
 * Accounts for redundancy - 4 arms means each arm contributes less.
 */
function getPartWeight(part: BodyPart, body: BodyComponent): number {
  // Vital organs have high weight
  if (part.vital) return 0.5;

  // Count similar functional parts (redundancy)
  const similarParts = Object.values(body.parts).filter(p =>
    p.type === part.type &&
    p.functions.some(f => part.functions.includes(f))
  );

  // More redundancy = lower individual weight
  // 4 arms? Each arm contributes 0.5 / 4 = 0.125
  // 2 arms? Each arm contributes 0.5 / 2 = 0.25
  return 0.5 / similarParts.length;
}

/**
 * Get movement speed multiplier based on leg/foot damage.
 */
export function getMovementSpeedMultiplier(body: BodyComponent): number {
  const locomotionParts = Object.values(body.parts).filter(p =>
    p.functions.includes('locomotion')
  );

  if (locomotionParts.length === 0) return 1.0; // No legs (maybe flies?)

  let totalHealth = 0;
  let totalMaxHealth = 0;

  for (const part of locomotionParts) {
    totalHealth += part.health;
    totalMaxHealth += part.maxHealth;
  }

  const legFunction = totalMaxHealth > 0 ? totalHealth / totalMaxHealth : 1.0;

  // Minimum 20% speed even with severe injuries (crawling)
  return Math.max(0.2, legFunction);
}

/**
 * Check if entity can perform an action based on body parts.
 */
export function canPerformAction(body: BodyComponent, action: string): boolean {
  for (const part of Object.values(body.parts)) {
    if (part.affectsActions.includes(action)) {
      // Check if part is functional (>25% health)
      if (part.health < part.maxHealth * 0.25) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Get body part by ID.
 */
export function getBodyPart(body: BodyComponent, partId: string): BodyPart | undefined {
  return body.parts[partId];
}

/**
 * Get all parts of a specific type.
 */
export function getPartsByType(body: BodyComponent, type: BodyPartType): BodyPart[] {
  return Object.values(body.parts).filter(p => p.type === type);
}

/**
 * Get all parts with a specific function.
 */
export function getPartsByFunction(body: BodyComponent, func: BodyPartFunction): BodyPart[] {
  return Object.values(body.parts).filter(p => p.functions.includes(func));
}

/**
 * Check if any vital parts are destroyed.
 */
export function hasDestroyedVitalParts(body: BodyComponent): boolean {
  return Object.values(body.parts).some(p => p.vital && p.health <= 0);
}

/**
 * Infer skills affected by a set of functions.
 */
export function inferSkillsFromFunctions(functions: BodyPartFunction[]): string[] {
  const skillMap: Record<BodyPartFunction, string[]> = {
    manipulation: ['crafting', 'building', 'cooking'],
    locomotion: ['exploration'],
    flight: ['exploration'],
    swimming: ['exploration'],
    sensory: ['exploration', 'foraging'],
    attack: ['combat'],
    defense: [],
    vital_organ: [],
    special_organ: [],
    communication: ['social'],
    balance: ['exploration'],
    none: [],
  };

  const skills = new Set<string>();
  for (const func of functions) {
    skillMap[func]?.forEach(s => skills.add(s));
  }
  return Array.from(skills);
}

/**
 * Infer actions affected by a set of functions.
 */
export function inferActionsFromFunctions(functions: BodyPartFunction[]): string[] {
  const actionMap: Record<BodyPartFunction, string[]> = {
    manipulation: ['craft', 'build', 'cook', 'gather', 'plant'],
    locomotion: ['walk', 'run'],
    flight: ['fly'],
    swimming: ['swim'],
    sensory: ['observe'],
    attack: ['attack'],
    defense: [],
    vital_organ: [],
    special_organ: [],
    communication: ['talk'],
    balance: [],
    none: [],
  };

  const actions = new Set<string>();
  for (const func of functions) {
    actionMap[func]?.forEach(a => actions.add(a));
  }
  return Array.from(actions);
}
