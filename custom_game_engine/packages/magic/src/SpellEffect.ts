/**
 * SpellEffect - Core types and interfaces for spell effect application
 *
 * This module defines the foundational types for what spell effects DO.
 * Effects are the actual game-mechanical changes that occur when a spell
 * is successfully cast.
 *
 * Design principles:
 * - Effects are declarative: they describe WHAT happens, not HOW
 * - Effects are composable: complex spells combine multiple effects
 * - Effects respect paradigm rules: costs, risks, and laws apply
 * - Effects are reversible where appropriate: for dispel/counter
 * - Effects are self-documenting: embedded help for wiki generation
 */

import type { MagicForm, MagicTechnique } from '@ai-village/core';
import type { EffectHelpEntry } from '@ai-village/core';

// ============================================================================
// Effect Categories
// ============================================================================

/** Primary effect categories (what the effect fundamentally does) */
export type EffectCategory =
  | 'damage'          // Deals damage to target
  | 'healing'         // Restores health/resources
  | 'protection'      // Creates shields, wards, resistances
  | 'buff'            // Improves target's stats/abilities
  | 'debuff'          // Reduces target's stats/abilities
  | 'control'         // Moves, restrains, or commands target
  | 'summon'          // Creates or calls entities
  | 'transform'       // Changes target's form or properties
  | 'perception'      // Grants vision, detection, scrying
  | 'dispel'          // Removes magical effects
  | 'teleport'        // Moves target through space
  | 'creation'        // Creates objects/materials
  | 'destruction'     // Destroys objects/materials
  | 'environmental'   // Changes terrain, weather, area
  | 'temporal'        // Affects time (slow, haste, age)
  | 'mental'          // Affects mind (fear, charm, illusion)
  | 'soul'            // Affects spirit/soul
  | 'paradigm';       // Paradigm-specific effects

/** Damage types for damage effects */
export type DamageType =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'acid'
  | 'poison'
  | 'force'       // Pure magical force
  | 'radiant'     // Divine/light damage
  | 'necrotic'    // Death/undeath damage
  | 'psychic'     // Mental damage
  | 'physical'    // Blunt/slash/pierce
  | 'void'        // Entropy damage
  | 'true';       // Ignores all resistances

/** How an effect targets */
export type TargetType =
  | 'self'            // Affects caster only
  | 'single'          // One target entity
  | 'area'            // Area of effect
  | 'cone'            // Cone from caster
  | 'line'            // Line from caster
  | 'chain'           // Jumps between targets
  | 'aura'            // Centered on caster, moves with them
  | 'global';         // Affects entire zone/world

/** Shape of area effects */
export type AreaShape =
  | 'circle'
  | 'square'
  | 'sphere'
  | 'cube'
  | 'cone'
  | 'line'
  | 'ring'
  | 'wall';

/** What can be targeted */
export type TargetFilter =
  | 'any'             // Anything
  | 'allies'          // Friendly entities
  | 'enemies'         // Hostile entities
  | 'living'          // Living creatures
  | 'undead'          // Undead creatures
  | 'objects'         // Non-living objects
  | 'terrain'         // Ground/environment
  | 'magical'         // Magical effects/entities
  | 'spirits'         // Spirit entities
  | 'animals'         // Animals
  | 'plants';         // Plants

// ============================================================================
// Effect Value Scaling
// ============================================================================

/** How effect values scale with caster power */
export interface EffectScaling {
  /** Base value at minimum proficiency */
  base: number;

  /** Multiplier per proficiency point (0-100) */
  perProficiency?: number;

  /** Multiplier per technique proficiency */
  perTechnique?: number;

  /** Multiplier per form proficiency */
  perForm?: number;

  /** Multiplier per caster level/tier */
  perLevel?: number;

  /** Maximum value cap */
  maximum?: number;

  /** Minimum value floor */
  minimum?: number;

  /** Paradigm-specific scaling factors */
  paradigmScaling?: Record<string, number>;
}

/** Calculated effect value after scaling */
export interface ScaledValue {
  /** Final calculated value */
  value: number;

  /** Base value before scaling */
  baseValue: number;

  /** Breakdown of modifiers applied */
  modifiers: Array<{
    source: string;
    amount: number;
    multiplier?: number;
  }>;
}

// ============================================================================
// Effect Definitions
// ============================================================================

/** Base interface for all effect types */
export interface BaseEffect {
  /** Unique identifier for this effect */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this effect does */
  description: string;

  /** Primary category */
  category: EffectCategory;

  /** Targeting mode */
  targetType: TargetType;

  /** What can be targeted */
  targetFilter: TargetFilter;

  /** Range in tiles (0 = touch/self) */
  range: number;

  /** Duration in ticks (undefined = instant) */
  duration?: number;

  /** Whether the effect can be dispelled */
  dispellable: boolean;

  /** Whether the effect stacks with itself */
  stackable: boolean;

  /** Maximum stacks if stackable */
  maxStacks?: number;

  /** Tags for categorization and interaction */
  tags: string[];

  /** Magic form this effect is associated with */
  form?: MagicForm;

  /** Magic technique this effect uses */
  technique?: MagicTechnique;

  /** Icon identifier for UI */
  icon?: string;

  /** Self-documenting help entry for wiki generation */
  help?: Partial<EffectHelpEntry>;
}

/** Damage effect definition */
export interface DamageEffect extends BaseEffect {
  category: 'damage';

  /** Type of damage dealt */
  damageType: DamageType;

  /** Damage amount scaling */
  damageScaling: EffectScaling;

  /** Whether damage can crit */
  canCrit: boolean;

  /** Crit multiplier (default 2x) */
  critMultiplier?: number;

  /** Whether damage ignores armor */
  ignoresArmor: boolean;

  /** Percentage of damage that ignores resistance */
  penetration?: number;

  /** Secondary effects on hit */
  onHitEffects?: string[];
}

/** Healing effect definition */
export interface HealingEffect extends BaseEffect {
  category: 'healing';

  /** Amount healed scaling */
  healingScaling: EffectScaling;

  /** Resource type restored (health, mana, stamina) */
  resourceType: 'health' | 'mana' | 'stamina' | 'all';

  /** Whether it can heal over time */
  overtime: boolean;

  /** Tick interval for HoT effects */
  tickInterval?: number;

  /** Whether it can overheal */
  canOverheal: boolean;

  /** Conditions that are cured */
  curesConditions?: string[];
}

/** Protection effect definition */
export interface ProtectionEffect extends BaseEffect {
  category: 'protection';

  /** Amount of damage absorbed */
  absorptionScaling?: EffectScaling;

  /** Damage types this protects against */
  protectsAgainst: DamageType[] | 'all';

  /** Percentage of damage reduced (0-100) */
  damageReduction?: number;

  /** Resistance value added */
  resistanceBonus?: number;

  /** Whether it reflects damage back */
  reflectsDamage: boolean;

  /** Percentage reflected if applicable */
  reflectPercentage?: number;

  /** Status effects blocked */
  blocksStatuses?: string[];
}

/** Buff effect definition */
export interface BuffEffect extends BaseEffect {
  category: 'buff';

  /** Stats modified and by how much */
  statModifiers: StatModifier[];

  /** Abilities granted */
  grantsAbilities?: string[];

  /** Movement speed modifier (percentage) */
  movementSpeedModifier?: number;

  /** Attack speed modifier (percentage) */
  attackSpeedModifier?: number;

  /** Cast speed modifier (percentage) */
  castSpeedModifier?: number;
}

/** Debuff effect definition */
export interface DebuffEffect extends BaseEffect {
  category: 'debuff';

  /** Stats modified and by how much */
  statModifiers: StatModifier[];

  /** Abilities disabled */
  disablesAbilities?: string[];

  /** Movement speed modifier (percentage, negative) */
  movementSpeedModifier?: number;

  /** Whether target is slowed */
  slowed: boolean;

  /** Whether target is rooted */
  rooted: boolean;

  /** Whether target is silenced (can't cast) */
  silenced: boolean;

  /** Whether target is blinded */
  blinded: boolean;

  /** Damage over time if applicable */
  dotDamage?: EffectScaling;
  dotType?: DamageType;
  dotInterval?: number;
}

/** Stat modifier for buff/debuff effects */
export interface StatModifier {
  /** Which stat to modify */
  stat: string;

  /** Flat amount to add/subtract */
  flat?: number;

  /** Percentage modifier */
  percent?: number;

  /** How it stacks with other modifiers */
  stacking: 'additive' | 'multiplicative' | 'highest' | 'lowest';
}

/** Control effect definition */
export interface ControlEffect extends BaseEffect {
  category: 'control';

  /** Type of control */
  controlType: 'stun' | 'root' | 'knockback' | 'pull' | 'levitate' | 'charm' | 'fear' | 'sleep' | 'polymorph';

  /** Force amount for movement controls */
  forceAmount?: number;

  /** Direction for directional controls */
  direction?: 'away' | 'toward' | 'up' | 'down';

  /** Transform target if polymorph */
  polymorphInto?: string;
}

/** Summon effect definition */
export interface SummonEffect extends BaseEffect {
  category: 'summon';

  /** Entity archetype to summon */
  entityArchetype: string;

  /** Number of entities summoned */
  summonCount: EffectScaling;

  /** Summoned entity level/power */
  summonLevel: EffectScaling;

  /** Whether summon is controllable */
  controllable: boolean;

  /** AI behavior if not controllable */
  behavior?: 'aggressive' | 'defensive' | 'passive';

  /** Where summon appears relative to caster */
  spawnLocation: 'adjacent' | 'target' | 'random_nearby';
}

/** Transform effect definition */
export interface TransformEffect extends BaseEffect {
  category: 'transform';

  /** What aspect is transformed */
  transformType: 'form' | 'size' | 'material' | 'alignment' | 'species';

  /** Target state after transformation */
  targetState: string;

  /** Whether transformation is reversible */
  reversible: boolean;

  /** Stat changes during transformation */
  statChanges?: StatModifier[];
}

/** Perception effect definition */
export interface PerceptionEffect extends BaseEffect {
  category: 'perception';

  /** What is detected */
  detects: ('magic' | 'traps' | 'invisible' | 'hidden' | 'thoughts' | 'emotions' | 'lies' | 'spirits' | 'evil' | 'good')[];

  /** Detection radius */
  detectionRadius: number;

  /** Whether it grants true sight */
  trueSight: boolean;

  /** Whether it allows scrying on target */
  scrying: boolean;

  /** Vision range bonus */
  visionBonus?: number;
}

/** Dispel effect definition */
export interface DispelEffect extends BaseEffect {
  category: 'dispel';

  /** Effect categories that can be dispelled */
  dispelCategories: EffectCategory[];

  /** Maximum effect power that can be dispelled */
  maxPowerDispelled?: number;

  /** Whether it removes all effects or just one */
  dispelAll: boolean;

  /** Specific effects that can be dispelled */
  targetEffects?: string[];
}

/** Teleport effect definition */
export interface TeleportEffect extends BaseEffect {
  category: 'teleport';

  /** Type of teleportation */
  teleportType: 'blink' | 'dimension_door' | 'recall' | 'swap';

  /** Maximum distance */
  maxDistance: number;

  /** Whether it requires line of sight */
  requiresLineOfSight: boolean;

  /** Whether it can teleport to marked locations */
  canRecall: boolean;

  /** Whether it swaps positions with target */
  swapsPositions: boolean;
}

/** Creation effect definition */
export interface CreationEffect extends BaseEffect {
  category: 'creation';

  /** What is created */
  createdItem: string;

  /** Number created */
  quantity: EffectScaling;

  /** Quality of created item */
  quality: EffectScaling;

  /** Whether creation is permanent */
  permanent: boolean;
}

/** Environmental effect definition */
export interface EnvironmentalEffect extends BaseEffect {
  category: 'environmental';

  /** Type of environmental change */
  environmentType: 'terrain' | 'weather' | 'light' | 'temperature' | 'zone';

  /** Terrain type if applicable */
  terrainType?: string;

  /** Weather type if applicable */
  weatherType?: string;

  /** Area radius */
  areaRadius: number;

  /** Area shape */
  areaShape: AreaShape;

  /** Effects on entities in area */
  areaEffects?: string[];
}

/** Temporal effect definition */
export interface TemporalEffect extends BaseEffect {
  category: 'temporal';

  /** Type of temporal manipulation */
  temporalType: 'slow' | 'haste' | 'stop' | 'rewind' | 'age';

  /** Time factor (1.0 = normal, 0.5 = half speed, 2.0 = double) */
  timeFactor?: number;

  /** Age change in years if aging */
  ageChange?: number;

  /** Whether affects action speed only or all time */
  actionSpeedOnly: boolean;
}

/** Mental effect definition */
export interface MentalEffect extends BaseEffect {
  category: 'mental';

  /** Type of mental effect */
  mentalType: 'fear' | 'charm' | 'confuse' | 'dominate' | 'memory' | 'illusion' | 'telepathy';

  /** Strength of mental influence (for saves) */
  mentalStrength: EffectScaling;

  /** Whether target is aware they're affected */
  subtle: boolean;

  /** What illusion shows if applicable */
  illusionContent?: string;
}

/** Soul effect definition */
export interface SoulEffect extends BaseEffect {
  category: 'soul';

  /** Type of soul manipulation */
  soulType: 'bind' | 'free' | 'transfer' | 'damage' | 'heal' | 'detect' | 'resurrect';

  /** Whether it affects undead */
  affectsUndead: boolean;

  /** Whether it can resurrect */
  canResurrect: boolean;

  /** Soul damage amount */
  soulDamage?: EffectScaling;
}

/** Paradigm-specific effect definition */
export interface ParadigmEffect extends BaseEffect {
  category: 'paradigm';

  /** Which paradigm this effect belongs to */
  paradigmId: string;

  /** Paradigm-specific effect type */
  paradigmEffectType: string;

  /** Custom parameters for this paradigm's mechanics */
  parameters: Record<string, unknown>;
}

// ============================================================================
// Union Type for All Effects
// ============================================================================

export type SpellEffect =
  | DamageEffect
  | HealingEffect
  | ProtectionEffect
  | BuffEffect
  | DebuffEffect
  | ControlEffect
  | SummonEffect
  | TransformEffect
  | PerceptionEffect
  | DispelEffect
  | TeleportEffect
  | CreationEffect
  | EnvironmentalEffect
  | TemporalEffect
  | MentalEffect
  | SoulEffect
  | ParadigmEffect;

// ============================================================================
// Effect Result Types
// ============================================================================

/** Result of applying a single effect */
export interface EffectApplicationResult {
  /** Whether the effect was successfully applied */
  success: boolean;

  /** Effect that was applied */
  effectId: string;

  /** Target entity ID */
  targetId: string;

  /** Actual values applied (after scaling, resistances, etc.) */
  appliedValues: Record<string, number>;

  /** Duration remaining (if applicable) */
  remainingDuration?: number;

  /** Whether target resisted/saved */
  resisted: boolean;

  /** Resistance amount if partial */
  resistanceApplied?: number;

  /** Error message if failed */
  error?: string;

  /** Timestamp when applied */
  appliedAt: number;

  /** Caster entity ID */
  casterId: string;

  /** Spell that caused this effect */
  spellId: string;
}

/** Active effect instance on an entity */
export interface ActiveEffect {
  /** Unique instance ID */
  instanceId: string;

  /** Effect definition ID */
  effectId: string;

  /** Spell that created this effect */
  spellId: string;

  /** Caster entity ID */
  casterId: string;

  /** When the effect was applied */
  appliedAt: number;

  /** When the effect expires (undefined = permanent) */
  expiresAt?: number;

  /** Current stack count */
  stacks: number;

  /** Actual values being applied */
  appliedValues: Record<string, number>;

  /** Whether this effect is paused */
  paused: boolean;

  /** Paradigm that cast this (for dispel matching) */
  paradigmId?: string;

  /** Power level of the effect (used for dispel resistance) */
  power?: number;
}

// ============================================================================
// Effect Event Types
// ============================================================================

/** Events emitted by the effect system */
export type EffectEvent =
  | { type: 'effect_applied'; result: EffectApplicationResult }
  | { type: 'effect_expired'; instanceId: string; targetId: string }
  | { type: 'effect_dispelled'; instanceId: string; targetId: string; dispellerId: string }
  | { type: 'effect_resisted'; effectId: string; targetId: string; resistanceAmount: number }
  | { type: 'effect_stacked'; instanceId: string; targetId: string; newStacks: number }
  | { type: 'effect_tick'; instanceId: string; targetId: string; tickValues: Record<string, number> };

export type EffectEventListener = (event: EffectEvent) => void;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a basic damage effect definition.
 */
export function createDamageEffect(
  id: string,
  name: string,
  damageType: DamageType,
  baseDamage: number,
  range: number = 10,
  options: Partial<DamageEffect> = {}
): DamageEffect {
  return {
    id,
    name,
    description: options.description ?? `Deals ${damageType} damage.`,
    category: 'damage',
    targetType: options.targetType ?? 'single',
    targetFilter: options.targetFilter ?? 'enemies',
    range,
    dispellable: false,
    stackable: false,
    tags: [damageType, 'damage', ...(options.tags ?? [])],
    damageType,
    damageScaling: {
      base: baseDamage,
      perProficiency: 0.5,
      maximum: baseDamage * 3,
      ...options.damageScaling,
    },
    canCrit: options.canCrit ?? true,
    critMultiplier: options.critMultiplier ?? 2,
    ignoresArmor: options.ignoresArmor ?? false,
    penetration: options.penetration,
    onHitEffects: options.onHitEffects,
    form: options.form,
    technique: options.technique ?? 'destroy',
  };
}

/**
 * Create a basic healing effect definition.
 */
export function createHealingEffect(
  id: string,
  name: string,
  baseHealing: number,
  range: number = 1,
  options: Partial<HealingEffect> = {}
): HealingEffect {
  return {
    id,
    name,
    description: options.description ?? `Restores health.`,
    category: 'healing',
    targetType: options.targetType ?? 'single',
    targetFilter: options.targetFilter ?? 'allies',
    range,
    dispellable: false,
    stackable: options.overtime ?? false,
    tags: ['healing', ...(options.tags ?? [])],
    healingScaling: {
      base: baseHealing,
      perProficiency: 0.3,
      maximum: baseHealing * 3,
      ...options.healingScaling,
    },
    resourceType: options.resourceType ?? 'health',
    overtime: options.overtime ?? false,
    tickInterval: options.tickInterval,
    canOverheal: options.canOverheal ?? false,
    curesConditions: options.curesConditions,
    form: options.form ?? 'body',
    technique: options.technique ?? 'enhance',
  };
}

/**
 * Create a basic protection effect definition.
 */
export function createProtectionEffect(
  id: string,
  name: string,
  absorptionAmount: number,
  duration: number,
  options: Partial<ProtectionEffect> = {}
): ProtectionEffect {
  return {
    id,
    name,
    description: options.description ?? `Creates a protective barrier.`,
    category: 'protection',
    targetType: options.targetType ?? 'self',
    targetFilter: options.targetFilter ?? 'allies',
    range: options.range ?? 0,
    duration,
    dispellable: options.dispellable ?? true,
    stackable: options.stackable ?? false,
    tags: ['protection', 'shield', ...(options.tags ?? [])],
    absorptionScaling: {
      base: absorptionAmount,
      perProficiency: 0.4,
      maximum: absorptionAmount * 3,
      ...options.absorptionScaling,
    },
    protectsAgainst: options.protectsAgainst ?? 'all',
    damageReduction: options.damageReduction,
    resistanceBonus: options.resistanceBonus,
    reflectsDamage: options.reflectsDamage ?? false,
    reflectPercentage: options.reflectPercentage,
    blocksStatuses: options.blocksStatuses,
    form: options.form ?? 'body',
    technique: options.technique ?? 'protect',
  };
}

/**
 * Create a basic buff effect definition.
 */
export function createBuffEffect(
  id: string,
  name: string,
  duration: number,
  statModifiers: StatModifier[],
  options: Partial<BuffEffect> = {}
): BuffEffect {
  return {
    id,
    name,
    description: options.description ?? `Enhances abilities.`,
    category: 'buff',
    targetType: options.targetType ?? 'single',
    targetFilter: options.targetFilter ?? 'allies',
    range: options.range ?? 1,
    duration,
    dispellable: options.dispellable ?? true,
    stackable: options.stackable ?? false,
    tags: ['buff', 'enhancement', ...(options.tags ?? [])],
    statModifiers,
    grantsAbilities: options.grantsAbilities,
    movementSpeedModifier: options.movementSpeedModifier,
    attackSpeedModifier: options.attackSpeedModifier,
    castSpeedModifier: options.castSpeedModifier,
    form: options.form,
    technique: options.technique ?? 'enhance',
  };
}

/**
 * Create a basic debuff effect definition.
 */
export function createDebuffEffect(
  id: string,
  name: string,
  duration: number,
  options: Partial<DebuffEffect> = {}
): DebuffEffect {
  return {
    id,
    name,
    description: options.description ?? `Weakens the target.`,
    category: 'debuff',
    targetType: options.targetType ?? 'single',
    targetFilter: options.targetFilter ?? 'enemies',
    range: options.range ?? 10,
    duration,
    dispellable: options.dispellable ?? true,
    stackable: options.stackable ?? false,
    tags: ['debuff', ...(options.tags ?? [])],
    statModifiers: options.statModifiers ?? [],
    disablesAbilities: options.disablesAbilities,
    movementSpeedModifier: options.movementSpeedModifier,
    slowed: options.slowed ?? false,
    rooted: options.rooted ?? false,
    silenced: options.silenced ?? false,
    blinded: options.blinded ?? false,
    dotDamage: options.dotDamage,
    dotType: options.dotType,
    dotInterval: options.dotInterval,
    form: options.form,
    technique: options.technique ?? 'destroy',
  };
}

/**
 * Calculate scaled value based on scaling parameters and context.
 */
export function calculateScaledValue(
  scaling: EffectScaling,
  context: {
    proficiency?: number;
    techniqueProficiency?: number;
    formProficiency?: number;
    level?: number;
    paradigmId?: string;
  }
): ScaledValue {
  let value = scaling.base;
  const modifiers: ScaledValue['modifiers'] = [];

  // Proficiency scaling
  if (scaling.perProficiency && context.proficiency !== undefined) {
    const bonus = scaling.perProficiency * context.proficiency;
    value += bonus;
    modifiers.push({ source: 'proficiency', amount: bonus });
  }

  // Technique proficiency scaling
  if (scaling.perTechnique && context.techniqueProficiency !== undefined) {
    const bonus = scaling.perTechnique * context.techniqueProficiency;
    value += bonus;
    modifiers.push({ source: 'technique', amount: bonus });
  }

  // Form proficiency scaling
  if (scaling.perForm && context.formProficiency !== undefined) {
    const bonus = scaling.perForm * context.formProficiency;
    value += bonus;
    modifiers.push({ source: 'form', amount: bonus });
  }

  // Level scaling
  if (scaling.perLevel && context.level !== undefined) {
    const bonus = scaling.perLevel * context.level;
    value += bonus;
    modifiers.push({ source: 'level', amount: bonus });
  }

  // Paradigm-specific scaling
  if (scaling.paradigmScaling && context.paradigmId) {
    const multiplier = scaling.paradigmScaling[context.paradigmId];
    if (multiplier !== undefined) {
      const bonus = value * (multiplier - 1);
      value *= multiplier;
      modifiers.push({ source: 'paradigm', amount: bonus, multiplier });
    }
  }

  // Apply caps
  if (scaling.maximum !== undefined) {
    value = Math.min(value, scaling.maximum);
  }
  if (scaling.minimum !== undefined) {
    value = Math.max(value, scaling.minimum);
  }

  return {
    value: Math.round(value * 10) / 10, // Round to 1 decimal
    baseValue: scaling.base,
    modifiers,
  };
}
