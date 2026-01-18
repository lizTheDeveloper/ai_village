/**
 * RejectedArtifactSystem - Preserves rejected LLM-generated effects per Conservation of Game Matter
 *
 * This system implements the "nothing is ever deleted" principle from CLAUDE.md.
 * All rejected effects become entities in the game world, banished to corruption realms
 * and potentially recoverable via quests.
 *
 * See: PHASE_33_ARCHITECTURE.md for full specification
 */

import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { Component } from '@ai-village/core';

// Component types for rejected artifacts

/**
 * Corruption realms where rejected content is banished.
 * Each realm has different danger levels and recovery requirements.
 */
export type CorruptionRealm =
  | 'forbidden_library'  // Overpowered/too dangerous (danger 8-10)
  | 'limbo'              // Incomplete/minor issues (danger 1-4)
  | 'void'               // Severely broken/corrupted (danger 7-9)
  | 'rejected_realm';    // Generic rejections (danger 4-6)

/**
 * Rejection categories for artifacts.
 * Determines why the artifact was rejected and how to handle it.
 */
export type RejectionCategory =
  | 'too_powerful'
  | 'too_dangerous'
  | 'incomplete'
  | 'incoherent'
  | 'unbalanced'
  | 'forbidden_knowledge';

/**
 * Component attached to entities representing rejected LLM-generated effects.
 * These entities persist forever per Conservation of Game Matter.
 */
export interface RejectedArtifactComponent extends Component {
  type: 'rejected_artifact';

  /** The rejected effect expression */
  effectExpression: any; // EffectExpression type (avoiding circular dependency)

  /** Original generation request for context */
  originalRequest: EffectGenerationRequest;

  /** Why it was rejected (thematic message) */
  rejectionReason: string;

  /** Which service/metric rejected it */
  rejectedBy: string;

  /** When it was rejected (timestamp) */
  rejectedAt: number;

  /** Where it's banished */
  banishedTo: CorruptionRealm;

  /** Danger level (1-10) */
  dangerLevel: number;

  /** Can it be recovered via quests */
  retrievable: boolean;

  /** Items/conditions required to recover */
  recoveryRequirements: string[];

  /** Rejection category */
  rejectionCategory: RejectionCategory;
}

/**
 * Component for effects that failed validation (corrupted/malformed).
 * Different from rejected artifacts - these have validation errors.
 */
export interface CorruptedEffectComponent extends Component {
  type: 'corrupted_effect';

  /** Original effect data (may be invalid) */
  effectExpression: any;

  /** Original generation request */
  originalRequest: EffectGenerationRequest;

  /** Why it's corrupted */
  corruptionReason: string;

  /** Validation errors encountered */
  validationErrors: ValidationIssue[];

  /** Original data for forensics */
  originalData: any;

  /** Can it be fixed */
  recoverable: boolean;

  /** When it was corrupted */
  corruptedAt: number;
}

/**
 * Effect generation request (from Phase 33 architecture).
 * Stored with rejected artifacts for context.
 */
export interface EffectGenerationRequest {
  description: string;
  paradigmId?: string;
  casterStats?: {
    intelligence: number;
    level: number;
    primarySource: string;
  };
  technique?: string;
  form?: string;
  targetComplexity?: 'simple' | 'moderate' | 'complex';
  examples?: any[];
}

/**
 * Validation issue (from validation pipeline).
 */
export interface ValidationIssue {
  stage: string;
  code: string;
  message: string;
  severity: 'critical' | 'error' | 'minor';
}

/**
 * Evaluation scores (from EffectEvaluationService).
 */
export interface EvaluationScores {
  safety: number;
  balance: number;
  completeness: number;
  creativity: number;
  overall: number;
}

/**
 * RejectedArtifactSystem preserves rejected effects as entities.
 *
 * Never deletes rejected content - all rejections become discoverable
 * artifacts in corruption realms that players can quest to recover.
 */
export class RejectedArtifactSystem {
  constructor(private world: World) {}

  /**
   * Preserve a rejected effect as an entity in the world.
   * Creates entity with rejected_artifact component and banishes to appropriate realm.
   *
   * @param effect - The rejected effect expression
   * @param request - Original generation request
   * @param rejectionReason - Thematic rejection message
   * @param rejectedBy - Service that rejected it (e.g., 'blessing_service', 'validation_pipeline')
   * @param scores - Evaluation scores (if available)
   * @returns Entity representing the rejected artifact
   */
  preserveRejectedEffect(
    effect: any,
    request: EffectGenerationRequest,
    rejectionReason: string,
    rejectedBy: string,
    scores?: EvaluationScores
  ): Entity {
    // Categorize rejection based on scores
    const { category, realm, danger } = this.categorizeRejection(scores);

    // Determine if recoverable
    const retrievable = this.isRetrievable(effect, danger);

    // Generate recovery requirements
    const recoveryRequirements = this.generateRecoveryRequirements(realm, danger);

    // Create entity for rejected artifact
    const entity = this.world.createEntity();

    // Add rejected artifact component
    const component: RejectedArtifactComponent = {
      type: 'rejected_artifact',
      version: 1,
      effectExpression: effect,
      originalRequest: request,
      rejectionReason,
      rejectedBy,
      rejectedAt: Date.now(),
      banishedTo: realm,
      dangerLevel: danger,
      retrievable,
      recoveryRequirements,
      rejectionCategory: category,
    };

    this.world.addComponent(entity.id, component);

    return entity;
  }

  /**
   * Preserve a corrupted effect (failed validation).
   * Different from rejection - these have validation errors.
   *
   * @param effect - The corrupted effect
   * @param request - Original generation request
   * @param validationErrors - Validation issues encountered
   * @param corruptionReason - Why it's corrupted
   * @returns Entity representing the corrupted effect
   */
  preserveCorruptedEffect(
    effect: any,
    request: EffectGenerationRequest,
    validationErrors: ValidationIssue[],
    corruptionReason: string
  ): Entity {
    const entity = this.world.createEntity();

    const component: CorruptedEffectComponent = {
      type: 'corrupted_effect',
      version: 1,
      effectExpression: effect,
      originalRequest: request,
      corruptionReason,
      validationErrors,
      originalData: effect,
      recoverable: validationErrors.every(e => e.severity !== 'critical'),
      corruptedAt: Date.now(),
    };

    this.world.addComponent(entity.id, component);

    return entity;
  }

  /**
   * Calculate danger level for an effect based on evaluation scores.
   *
   * @param effect - The effect expression
   * @returns Danger level 1-10
   */
  private calculateDangerLevel(effect: any): number {
    let danger = 5; // Base danger

    // Check for high-risk operations
    const operations = effect.operations || [];

    for (const op of operations) {
      // Damage operations increase danger
      if (op.op === 'deal_damage') {
        const damageValue = op.value || 0;
        if (damageValue > 100) danger += 2;
        if (damageValue > 500) danger += 3;
      }

      // Spawning increases danger
      if (op.op === 'spawn_entity') {
        danger += 1;
      }

      // Chain effects increase danger
      if (op.op === 'chain_effect') {
        danger += 2;
      }

      // Permanent transformations increase danger
      if (op.op === 'transform' && op.permanent) {
        danger += 2;
      }
    }

    // Area effects are more dangerous
    if (effect.target?.type === 'area') {
      const radius = effect.target.radius || 0;
      if (radius > 10) danger += 1;
      if (radius > 20) danger += 2;
    }

    return Math.max(1, Math.min(10, danger));
  }

  /**
   * Categorize rejection based on evaluation scores.
   *
   * @param scores - Evaluation scores (if available)
   * @returns Category, realm, and danger level
   */
  private categorizeRejection(
    scores?: EvaluationScores
  ): { category: RejectionCategory; realm: CorruptionRealm; danger: number } {
    if (!scores) {
      // No scores = validation failed
      return {
        category: 'forbidden_knowledge',
        realm: 'rejected_realm',
        danger: 5,
      };
    }

    // Too powerful (low balance + low safety)
    if (scores.balance < 0.3 && scores.safety < 0.5) {
      return {
        category: 'too_powerful',
        realm: 'forbidden_library',
        danger: 9,
      };
    }

    // Too dangerous (low safety)
    if (scores.safety < 0.4) {
      return {
        category: 'too_dangerous',
        realm: 'void',
        danger: 8,
      };
    }

    // Incomplete (low completeness)
    if (scores.completeness < 0.5) {
      return {
        category: 'incomplete',
        realm: 'limbo',
        danger: 3,
      };
    }

    // Incoherent (low completeness + low creativity)
    if (scores.completeness < 0.7 && scores.creativity < 0.3) {
      return {
        category: 'incoherent',
        realm: 'limbo',
        danger: 2,
      };
    }

    // Unbalanced (low balance)
    if (scores.balance < 0.5) {
      return {
        category: 'unbalanced',
        realm: 'rejected_realm',
        danger: 5,
      };
    }

    // Generic rejection
    return {
      category: 'forbidden_knowledge',
      realm: 'rejected_realm',
      danger: 4,
    };
  }

  /**
   * Determine banishment realm based on danger level.
   *
   * @param dangerLevel - Danger level 1-10
   * @returns Corruption realm
   */
  private determineBanishmentRealm(dangerLevel: number): CorruptionRealm {
    if (dangerLevel >= 8) {
      return 'forbidden_library'; // Most dangerous
    } else if (dangerLevel >= 7) {
      return 'void'; // Very dangerous
    } else if (dangerLevel <= 4) {
      return 'limbo'; // Low danger
    } else {
      return 'rejected_realm'; // Medium danger
    }
  }

  /**
   * Check if effect is retrievable via quests.
   * Very dangerous effects may be permanently banished.
   *
   * @param effect - The effect expression
   * @param dangerLevel - Danger level 1-10
   * @returns True if recoverable
   */
  private isRetrievable(effect: any, dangerLevel: number): boolean {
    // Extremely dangerous effects (10) are permanently banished
    if (dangerLevel >= 10) {
      return false;
    }

    // Most effects are recoverable with effort
    return true;
  }

  /**
   * Generate recovery requirements based on realm and danger.
   * Higher danger = more/rarer items required.
   *
   * @param realm - Corruption realm
   * @param dangerLevel - Danger level 1-10
   * @returns Array of required item IDs
   */
  private generateRecoveryRequirements(
    realm: CorruptionRealm,
    dangerLevel: number
  ): string[] {
    const requirements: string[] = [];

    switch (realm) {
      case 'forbidden_library':
        requirements.push('shard_of_forbidden_knowledge');
        if (dangerLevel >= 9) {
          requirements.push('decree_of_the_magisters');
        }
        break;

      case 'limbo':
        requirements.push('minor_restoration_scroll');
        break;

      case 'void':
        requirements.push('void_anchor', 'shard_of_reality');
        if (dangerLevel >= 9) {
          requirements.push('blessing_of_supreme_creator');
        }
        break;

      case 'rejected_realm':
        requirements.push('petition_to_the_arcane_council');
        if (dangerLevel >= 6) {
          requirements.push('writ_of_reconsideration');
        }
        break;
    }

    return requirements;
  }

  /**
   * Get all rejected artifacts in the world.
   *
   * @returns Array of entities with rejected_artifact component
   */
  getAllRejectedArtifacts(): Entity[] {
    return this.world.query()
      .with('rejected_artifact')
      .executeEntities() as Entity[];
  }

  /**
   * Get rejected artifacts by creator (if we add creator tracking).
   *
   * @param creatorId - Entity ID of creator
   * @returns Rejected artifacts created by this entity
   */
  getArtifactsByCreator(creatorId: string): Entity[] {
    // TODO: Add creator field to RejectedArtifactComponent
    // For now, return all artifacts
    return this.getAllRejectedArtifacts();
  }

  /**
   * Get rejected artifacts by corruption realm.
   *
   * @param realm - Corruption realm to filter by
   * @returns Artifacts in specified realm
   */
  getArtifactsByRealm(realm: CorruptionRealm): Entity[] {
    return this.getAllRejectedArtifacts().filter(entity => {
      const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
      return component?.banishedTo === realm;
    });
  }

  /**
   * Get all corrupted effects in the world.
   *
   * @returns Array of entities with corrupted_effect component
   */
  getAllCorruptedEffects(): Entity[] {
    return this.world.query()
      .with('corrupted_effect')
      .executeEntities() as Entity[];
  }

  /**
   * Attempt to recover a rejected artifact.
   * Requires player to have recovery items in inventory.
   *
   * @param artifactId - Entity ID of rejected artifact
   * @param recoveryItems - Items player has for recovery
   * @returns Success status and recovered effect (if successful)
   */
  attemptRecovery(
    artifactId: string,
    recoveryItems: string[]
  ): { success: boolean; effect?: any; missingItems?: string[] } {
    const entity = this.world.getEntity(artifactId);
    if (!entity) {
      return { success: false };
    }

    const component = entity.getComponent<RejectedArtifactComponent>('rejected_artifact');
    if (!component) {
      return { success: false };
    }

    // Check if retrievable
    if (!component.retrievable) {
      return { success: false };
    }

    // Check if player has all required items
    const missingItems = component.recoveryRequirements.filter(
      reqItem => !recoveryItems.includes(reqItem)
    );

    if (missingItems.length > 0) {
      return { success: false, missingItems };
    }

    // Recovery successful!
    const effect = component.effectExpression;

    // Remove rejected artifact component (it's been recovered)
    this.world.removeComponent(entity.id, 'rejected_artifact');

    // Add recovered artifact component for tracking
    this.world.addComponent(entity.id, {
      type: 'recovered_artifact',
      version: 1,
      recoveredAt: Date.now(),
      originalRejectionReason: component.rejectionReason,
      dangerLevel: component.dangerLevel,
    } as Component);

    return { success: true, effect };
  }
}
