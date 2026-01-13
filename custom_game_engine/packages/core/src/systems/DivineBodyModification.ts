/**
 * DivineBodyModification - Divine powers for healing and transforming bodies
 *
 * Allows deities to:
 * - Heal specific body parts and cure injuries
 * - Grant body transformations (wings, extra limbs, enhancements)
 * - Answer healing and transformation prayers
 * - Perform miracles on believers
 *
 * Integrates with:
 * - BodyHealingEffectApplier for healing effects
 * - BodyTransformEffectApplier for transformation effects
 * - PrayerAnsweringSystem for answering prayers
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { BodyComponent } from '../components/BodyComponent.js';
import {
  bodyHealingEffectApplier,
  type BodyHealingEffect,
  mendWoundsEffect,
  cureInfectionEffect,
  mendBoneEffect,
  restoreLimbEffect,
  healArmEffect,
  healLegEffect,
} from '../magic/appliers/BodyHealingEffectApplier.js';
import {
  bodyTransformEffectApplier,
  type BodyTransformEffect,
  growWingsEffect,
  extraArmsEffect,
  enhanceArmsEffect,
  enlargeEffect,
  reduceEffect,
  polymorphEffect,
} from '../magic/appliers/BodyTransformEffectApplier.js';
import type { EffectContext } from '../magic/SpellEffectExecutor.js';
import type { SpellDefinition } from '../magic/SpellRegistry.js';

// ============================================================================
// Divine Body Powers
// ============================================================================

export type DivineHealingPower =
  | 'mend_wounds'         // Heal injuries and stop bleeding
  | 'cure_infection'      // Remove infections
  | 'mend_bone'           // Mend fractures
  | 'restore_limb'        // Regenerate lost limbs (very powerful)
  | 'heal_arm'            // Heal arm injuries
  | 'heal_leg'            // Heal leg injuries
  | 'full_restoration';   // Complete body restoration (most powerful)

export type DivineTransformPower =
  | 'grow_wings'          // Grant wings for flight
  | 'extra_arms'          // Grant extra arms
  | 'enhance_arms'        // Enhance arm strength
  | 'enlarge'             // Increase body size
  | 'reduce'              // Decrease body size
  | 'polymorph'           // Full body transformation
  | 'divine_form';        // Transform into divine/celestial form

export type DivineBodyPower = DivineHealingPower | DivineTransformPower;

// ============================================================================
// Divine Body Modification Event
// ============================================================================

export interface DivineBodyModificationRecord {
  id: string;
  deityId: string;
  targetId: string;
  powerType: DivineBodyPower;
  category: 'healing' | 'transformation';
  appliedAt: number;
  cost: number;
  purpose?: BodyModificationPurpose;
  result: 'success' | 'failed' | 'partial';
  error?: string;
}

export type BodyModificationPurpose =
  | 'prayer_answer'      // Answering a prayer
  | 'blessing'           // Divine blessing
  | 'reward'             // Reward for devotion
  | 'punishment'         // Curse or punishment
  | 'miracle'            // Public demonstration
  | 'champion_creation'; // Creating a divine champion

// ============================================================================
// Configuration
// ============================================================================

export interface DivineBodyModificationConfig {
  /** How often to check for modifications (ticks) */
  updateInterval: number;

  /** Belief costs for healing powers */
  healingCosts: Record<DivineHealingPower, number>;

  /** Belief costs for transformation powers */
  transformCosts: Record<DivineTransformPower, number>;

  /** Minimum belief required to use any power */
  minBeliefRequired: number;

  /** Can only use powers on believers? */
  believersOnly: boolean;
}

export const DEFAULT_DIVINE_BODY_CONFIG: DivineBodyModificationConfig = {
  updateInterval: 100, // ~5 seconds at 20 TPS
  minBeliefRequired: 200,
  believersOnly: true,

  healingCosts: {
    mend_wounds: 150,
    cure_infection: 100,
    mend_bone: 120,
    restore_limb: 500,  // Very expensive
    heal_arm: 80,
    heal_leg: 80,
    full_restoration: 800, // Most expensive healing
  },

  transformCosts: {
    grow_wings: 600,      // Permanent transformation
    extra_arms: 500,
    enhance_arms: 200,    // Temporary enhancement
    enlarge: 300,
    reduce: 300,
    polymorph: 700,
    divine_form: 1200,    // Transform into celestial/divine being
  },
};

// ============================================================================
// DivineBodyModification System
// ============================================================================

export class DivineBodyModification implements System {
  public readonly id = 'DivineBodyModification';
  public readonly name = 'DivineBodyModification';
  public readonly priority = 73;
  public readonly requiredComponents = [];

  private config: DivineBodyModificationConfig;
  private modifications: Map<string, DivineBodyModificationRecord> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<DivineBodyModificationConfig> = {}) {
    this.config = {
      ...DEFAULT_DIVINE_BODY_CONFIG,
      ...config,
      healingCosts: { ...DEFAULT_DIVINE_BODY_CONFIG.healingCosts, ...config.healingCosts },
      transformCosts: { ...DEFAULT_DIVINE_BODY_CONFIG.transformCosts, ...config.transformCosts },
    };
  }

  update(world: World): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // System primarily provides API for divine powers
    // Actual usage happens through direct invocation or prayer answering
  }

  // ==========================================================================
  // Healing Powers
  // ==========================================================================

  /**
   * Heal a target's body using divine power
   */
  healBody(
    deityId: string,
    targetId: string,
    world: World,
    powerType: DivineHealingPower,
    purpose?: BodyModificationPurpose
  ): DivineBodyModificationRecord | null {
    // Validate deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Validate target
    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) return null;

    const body = targetEntity.components.get(CT.Body) as BodyComponent | undefined;
    if (!body) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'healing',
        world.tick,
        'Target has no body'
      );
    }

    // Check if target is a believer (if required)
    if (this.config.believersOnly && !deity.hasBeliever(targetId)) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'healing',
        world.tick,
        'Target is not a believer'
      );
    }

    // Calculate cost
    const cost = this.config.healingCosts[powerType];

    // Check and spend belief
    if (!deity.spendBelief(cost)) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'healing',
        world.tick,
        'Insufficient belief'
      );
    }

    // Get the appropriate healing effect
    const healingEffect = this.getHealingEffect(powerType);
    if (!healingEffect) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'healing',
        world.tick,
        'Unknown healing power'
      );
    }

    // Create effect context
    const context = this.createEffectContext(deityEntity, world);

    // Apply healing effect
    try {
      const result = bodyHealingEffectApplier.apply(
        healingEffect,
        deityEntity,
        targetEntity,
        world,
        context
      );

      // Create modification record
      const modification: DivineBodyModificationRecord = {
        id: `divine_heal_${Date.now()}`,
        deityId,
        targetId,
        powerType,
        category: 'healing',
        appliedAt: world.tick,
        cost,
        purpose,
        result: result.success ? 'success' : 'failed',
        error: result.error,
      };

      this.modifications.set(modification.id, modification);

      return modification;
    } catch (error) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'healing',
        world.tick,
        `Healing failed: ${error}`
      );
    }
  }

  /**
   * Transform a target's body using divine power
   */
  transformBody(
    deityId: string,
    targetId: string,
    world: World,
    powerType: DivineTransformPower,
    purpose?: BodyModificationPurpose,
    customBodyPlan?: string
  ): DivineBodyModificationRecord | null {
    // Validate deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Validate target
    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) return null;

    const body = targetEntity.components.get(CT.Body) as BodyComponent | undefined;
    if (!body) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'transformation',
        world.tick,
        'Target has no body'
      );
    }

    // Check if target is a believer (if required)
    if (this.config.believersOnly && !deity.hasBeliever(targetId)) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'transformation',
        world.tick,
        'Target is not a believer'
      );
    }

    // Calculate cost
    const cost = this.config.transformCosts[powerType];

    // Check and spend belief
    if (!deity.spendBelief(cost)) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'transformation',
        world.tick,
        'Insufficient belief'
      );
    }

    // Get the appropriate transformation effect
    let transformEffect = this.getTransformEffect(powerType);
    if (!transformEffect) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'transformation',
        world.tick,
        'Unknown transformation power'
      );
    }

    // For polymorph/divine_form, use custom body plan if provided
    if ((powerType === 'polymorph' || powerType === 'divine_form') && customBodyPlan) {
      transformEffect = {
        ...transformEffect,
        newBodyPlan: customBodyPlan,
      };
    } else if (powerType === 'divine_form') {
      // Default divine form is celestial winged
      transformEffect = {
        ...transformEffect,
        newBodyPlan: 'celestial_winged',
      };
    }

    // Mark as divine modification
    transformEffect = {
      ...transformEffect,
      modificationSource: 'divine',
    };

    // Create effect context
    const context = this.createEffectContext(deityEntity, world);

    // Apply transformation effect
    try {
      const result = bodyTransformEffectApplier.apply(
        transformEffect,
        deityEntity,
        targetEntity,
        world,
        context
      );

      // Create modification record
      const modification: DivineBodyModificationRecord = {
        id: `divine_transform_${Date.now()}`,
        deityId,
        targetId,
        powerType,
        category: 'transformation',
        appliedAt: world.tick,
        cost,
        purpose,
        result: result.success ? 'success' : 'failed',
        error: result.error,
      };

      this.modifications.set(modification.id, modification);

      return modification;
    } catch (error) {
      return this.createFailedModification(
        deityId,
        targetId,
        powerType,
        'transformation',
        world.tick,
        `Transformation failed: ${error}`
      );
    }
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Heal all wounds on a believer
   */
  mendAllWounds(
    deityId: string,
    targetId: string,
    world: World,
    purpose: BodyModificationPurpose = 'blessing'
  ): DivineBodyModificationRecord | null {
    return this.healBody(deityId, targetId, world, 'mend_wounds', purpose);
  }

  /**
   * Restore a lost limb
   */
  restoreLostLimb(
    deityId: string,
    targetId: string,
    world: World,
    purpose: BodyModificationPurpose = 'miracle'
  ): DivineBodyModificationRecord | null {
    return this.healBody(deityId, targetId, world, 'restore_limb', purpose);
  }

  /**
   * Grant wings to a champion
   */
  grantWings(
    deityId: string,
    targetId: string,
    world: World,
    purpose: BodyModificationPurpose = 'champion_creation'
  ): DivineBodyModificationRecord | null {
    return this.transformBody(deityId, targetId, world, 'grow_wings', purpose);
  }

  /**
   * Transform believer into divine form
   */
  ascendBeliever(
    deityId: string,
    targetId: string,
    world: World,
    purpose: BodyModificationPurpose = 'reward'
  ): DivineBodyModificationRecord | null {
    return this.transformBody(deityId, targetId, world, 'divine_form', purpose);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getHealingEffect(powerType: DivineHealingPower): BodyHealingEffect | null {
    switch (powerType) {
      case 'mend_wounds':
        return mendWoundsEffect;
      case 'cure_infection':
        return cureInfectionEffect;
      case 'mend_bone':
        return mendBoneEffect;
      case 'restore_limb':
        return restoreLimbEffect;
      case 'heal_arm':
        return healArmEffect;
      case 'heal_leg':
        return healLegEffect;
      case 'full_restoration':
        // Combine all healing effects
        return {
          ...mendWoundsEffect,
          bodyPartHealing: 200,
          stopsBleeding: true,
          curesInfections: true,
          mendsFractures: true,
          regeneratesLimbs: true,
        };
      default:
        return null;
    }
  }

  private getTransformEffect(powerType: DivineTransformPower): BodyTransformEffect | null {
    switch (powerType) {
      case 'grow_wings':
        return growWingsEffect;
      case 'extra_arms':
        return extraArmsEffect;
      case 'enhance_arms':
        return enhanceArmsEffect;
      case 'enlarge':
        return enlargeEffect;
      case 'reduce':
        return reduceEffect;
      case 'polymorph':
        return polymorphEffect;
      case 'divine_form':
        // Use polymorph with celestial form
        return {
          ...polymorphEffect,
          newBodyPlan: 'celestial_winged',
          duration: undefined, // Permanent
        };
      default:
        return null;
    }
  }

  private createEffectContext(caster: Entity, world: World): EffectContext {
    // Create a minimal spell context for divine powers
    const dummySpell: SpellDefinition = {
      id: 'divine_power',
      name: 'Divine Power',
      form: 'body',
      technique: 'create',
      source: 'divine',
      manaCost: 0,
      castTime: 0,
      range: 100, // Divine powers work at distance
      effectId: 'divine_heal_transform',
      paradigmId: 'divine',
      description: 'Divine power channeled for healing and transformation',
    };

    // Get or create a minimal magic component for the deity
    const casterMagic = caster.components.get('magic') as any || {
      type: 'magic',
      sources: [],
      knownSpells: [],
      paradigmProficiencies: new Map([['divine', 100]]),
      activeParadigmId: 'divine',
    };

    return {
      tick: world.tick,
      spell: dummySpell,
      casterMagic,
      isCrit: false,
      powerMultiplier: 1.5, // Divine powers are stronger
      paradigmId: 'divine',
      scaledValues: new Map([
        ['healing', { value: 100, baseValue: 100, modifiers: [] }],
        ['damage', { value: 0, baseValue: 0, modifiers: [] }],
      ]),
      stateMutatorSystem: null,
      fireSpreadSystem: null,
    };
  }

  private createFailedModification(
    deityId: string,
    targetId: string,
    powerType: DivineBodyPower,
    category: 'healing' | 'transformation',
    tick: number,
    error: string
  ): DivineBodyModificationRecord {
    const modification: DivineBodyModificationRecord = {
      id: `divine_fail_${Date.now()}`,
      deityId,
      targetId,
      powerType,
      category,
      appliedAt: tick,
      cost: 0,
      result: 'failed',
      error,
    };

    this.modifications.set(modification.id, modification);
    return modification;
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get modification by ID
   */
  getModification(modificationId: string): DivineBodyModificationRecord | undefined {
    return this.modifications.get(modificationId);
  }

  /**
   * Get all modifications by a deity
   */
  getModificationsByDeity(deityId: string): DivineBodyModificationRecord[] {
    return Array.from(this.modifications.values())
      .filter(m => m.deityId === deityId);
  }

  /**
   * Get all modifications on a target
   */
  getModificationsOnTarget(targetId: string): DivineBodyModificationRecord[] {
    return Array.from(this.modifications.values())
      .filter(m => m.targetId === targetId);
  }

  /**
   * Get successful modifications
   */
  getSuccessfulModifications(): DivineBodyModificationRecord[] {
    return Array.from(this.modifications.values())
      .filter(m => m.result === 'success');
  }

  /**
   * Get healing modifications
   */
  getHealingModifications(): DivineBodyModificationRecord[] {
    return Array.from(this.modifications.values())
      .filter(m => m.category === 'healing');
  }

  /**
   * Get transformation modifications
   */
  getTransformationModifications(): DivineBodyModificationRecord[] {
    return Array.from(this.modifications.values())
      .filter(m => m.category === 'transformation');
  }

  /**
   * Get total belief spent on body modifications
   */
  getTotalBeliefSpent(deityId?: string): number {
    const modifications = deityId
      ? this.getModificationsByDeity(deityId)
      : Array.from(this.modifications.values());

    return modifications
      .filter(m => m.result === 'success')
      .reduce((total, m) => total + m.cost, 0);
  }
}
