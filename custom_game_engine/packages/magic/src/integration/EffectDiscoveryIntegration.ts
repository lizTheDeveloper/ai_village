/**
 * EffectDiscoveryIntegration - Full pipeline for effect generation and approval
 *
 * Orchestrates the complete effect discovery flow:
 * 1. Generation (LLM)
 * 2. Validation (Security & Schema)
 * 3. Evaluation (Quality Metrics)
 * 4. Blessing (Approval Decision)
 * 5. Registry/Artifact Preservation
 *
 * Architecture: Phase 33 - Safe LLM Effect Generation
 * See: packages/magic/PHASE_33_ARCHITECTURE.md
 */

import type { EffectExpression } from '../EffectExpression.js';
import type { SpellDefinition } from '../SpellRegistry.js';
import type { EffectGenerationService, EffectGenerationRequest } from '../generation/EffectGenerationService.js';
import type { EffectValidationPipeline, ValidationResult } from '../validation/EffectValidationPipeline.js';
import type { EffectEvaluationService, EvaluationReport } from '../evaluation/EffectEvaluationService.js';
import type { EffectBlessingService, BlessingDecision } from '../blessing/EffectBlessingService.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EffectDiscoveryRequest extends EffectGenerationRequest {
  /** Entity ID of requester (god, agent, player, etc.) */
  requesterId?: string;

  /** Requester name (for artifact attribution) */
  requesterName?: string;

  /** Magic paradigm for the effect */
  paradigm?: string;
}

export interface EffectDiscoveryResult {
  /** Overall success of the discovery process */
  success: boolean;

  /** Whether the effect was blessed (approved) */
  blessed: boolean;

  /** Spell ID if registered (only if blessed) */
  spellId?: string;

  /** Generated effect expression */
  effect?: EffectExpression;

  /** Validation result */
  validation?: ValidationResult;

  /** Evaluation report */
  evaluation?: EvaluationReport;

  /** Blessing decision */
  blessing?: BlessingDecision;

  /** Artifact ID if rejected (Conservation of Game Matter) */
  artifactId?: string;

  /** Error message if generation/validation failed */
  error?: string;
}

export interface RejectedEffectArtifact {
  id: string;
  effect: EffectExpression;
  rejectionReason: string;
  scores: any;
  creatorId: string;
  creatorName: string;
  rejectedAt: number;
  rejectionCategory: RejectionCategory;
  dangerLevel: number;
  banishedTo: CorruptionRealm;
  recoverable: boolean;
  recoveryRequirements?: string[];
}

export type RejectionCategory =
  | 'too_powerful'
  | 'too_dangerous'
  | 'incomplete'
  | 'incoherent'
  | 'unbalanced'
  | 'forbidden_knowledge';

export type CorruptionRealm =
  | 'forbidden_library' // Overpowered spells
  | 'limbo' // Incomplete/minor issues
  | 'void' // Dangerous/corrupted magic
  | 'rejected_realm'; // Generic rejected spells

// ============================================================================
// REJECTED ARTIFACT SYSTEM (Stub Interface)
// ============================================================================

/**
 * Stub interface for RejectedArtifactSystem.
 * The full implementation will be created in a separate phase.
 */
export interface RejectedArtifactSystem {
  preserveRejectedEffect(
    effect: EffectExpression,
    decision: BlessingDecision,
    creatorId: string,
    creatorName: string
  ): RejectedEffectArtifact;
}

/**
 * In-memory implementation of RejectedArtifactSystem for testing.
 */
export class InMemoryRejectedArtifactSystem implements RejectedArtifactSystem {
  private artifacts: Map<string, RejectedEffectArtifact> = new Map();

  preserveRejectedEffect(
    effect: EffectExpression,
    decision: BlessingDecision,
    creatorId: string,
    creatorName: string
  ): RejectedEffectArtifact {
    const category = this.categorizeRejection(decision);
    const id = `rejected_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const artifact: RejectedEffectArtifact = {
      id,
      effect,
      rejectionReason: decision.reason,
      scores: decision.scores,
      creatorId,
      creatorName,
      rejectedAt: decision.timestamp,
      rejectionCategory: category.category,
      dangerLevel: category.danger,
      banishedTo: category.realm,
      recoverable: true,
      recoveryRequirements: this.getRecoveryRequirements(category.realm),
    };

    this.artifacts.set(id, artifact);
    return artifact;
  }

  private categorizeRejection(decision: BlessingDecision): {
    category: RejectionCategory;
    realm: CorruptionRealm;
    danger: number;
  } {
    const scores = decision.scores;

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

    // Unbalanced
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

  private getRecoveryRequirements(realm: CorruptionRealm): string[] {
    const requirements: Record<CorruptionRealm, string[]> = {
      forbidden_library: ['shard_of_forbidden_knowledge', 'decree_of_the_magisters'],
      limbo: ['minor_restoration_scroll'],
      void: ['void_anchor', 'shard_of_reality', 'blessing_of_supreme_creator'],
      rejected_realm: ['petition_to_the_arcane_council'],
    };

    return requirements[realm] || [];
  }

  getAllRejected(): RejectedEffectArtifact[] {
    return Array.from(this.artifacts.values());
  }

  getByCreator(creatorId: string): RejectedEffectArtifact[] {
    return this.getAllRejected().filter((a) => a.creatorId === creatorId);
  }

  getByRealm(realm: CorruptionRealm): RejectedEffectArtifact[] {
    return this.getAllRejected().filter((a) => a.banishedTo === realm);
  }
}

// ============================================================================
// SPELL REGISTRY (Stub Interface)
// ============================================================================

/**
 * Stub interface for SpellRegistry interaction.
 * Uses the real SpellRegistry in production.
 */
export interface SpellRegistry {
  register(spell: SpellDefinition): void;
}

// ============================================================================
// EFFECT DISCOVERY INTEGRATION
// ============================================================================

export class EffectDiscoveryIntegration {
  constructor(
    private generationService: EffectGenerationService,
    private validationPipeline: EffectValidationPipeline,
    private evaluationService: EffectEvaluationService,
    private blessingService: EffectBlessingService,
    private artifactSystem: RejectedArtifactSystem,
    private spellRegistry: SpellRegistry
  ) {}

  /**
   * Full discovery pipeline: Generation → Validation → Evaluation → Blessing → Registry
   *
   * This is the main entry point for effect discovery.
   *
   * @param request - Discovery request with spell details
   * @returns Result with effect, validation, evaluation, and blessing info
   */
  async discoverEffect(request: EffectDiscoveryRequest): Promise<EffectDiscoveryResult> {
    try {
      // Step 1: Generate effect from LLM
      const generation = await this.generationService.generate(request);

      if (!generation.success || !generation.effect) {
        return {
          success: false,
          blessed: false,
          error: generation.error || generation.parseError || 'Failed to generate effect',
        };
      }

      const effect = generation.effect;

      // Step 2: Validate effect (schema, security, interpreter)
      const validation = this.validationPipeline.validate(effect);

      if (!validation.valid) {
        // Validation failed - create rejected artifact
        const mockDecision: BlessingDecision = {
          blessed: false,
          reason: `Validation failed: ${validation.issues[0]?.message || 'Unknown error'}`,
          scores: { safety: 0, balance: 0, completeness: 0, creativity: 0, overall: 0 },
          timestamp: Date.now(),
        };

        const artifact = this.preserveRejectedEffect(
          effect,
          mockDecision,
          request.requesterId || 'unknown',
          request.requesterName || 'Unknown'
        );

        return {
          success: true,
          blessed: false,
          effect,
          validation,
          artifactId: artifact.id,
          error: `Validation failed: ${validation.stage}`,
        };
      }

      // Step 3: Evaluate effect quality
      const evaluation = this.evaluationService.evaluateEffect(effect);

      // Step 4: Blessing decision
      const blessing = this.blessingService.bless(evaluation, request.paradigm);

      if (!blessing.blessed) {
        // Rejected by blessing - preserve as artifact
        const artifact = this.preserveRejectedEffect(
          effect,
          blessing,
          request.requesterId || 'unknown',
          request.requesterName || 'Unknown'
        );

        return {
          success: true,
          blessed: false,
          effect,
          validation,
          evaluation,
          blessing,
          artifactId: artifact.id,
        };
      }

      // Step 5: Blessed - register as spell
      const spell = this.createSpellDefinition(
        effect,
        request.paradigm || 'academic',
        request.requesterId || 'unknown'
      );

      this.spellRegistry.register(spell);

      return {
        success: true,
        blessed: true,
        spellId: spell.id,
        effect,
        validation,
        evaluation,
        blessing,
      };
    } catch (error) {
      return {
        success: false,
        blessed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Convert EffectExpression to SpellDefinition for registry.
   *
   * Uses information from the effect and generation request to create
   * a complete spell definition.
   */
  private createSpellDefinition(
    effect: EffectExpression,
    paradigmId: string,
    creatorId: string
  ): SpellDefinition {
    // Generate unique spell ID
    const spellId = `spell_${paradigmId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Extract basic info from effect
    const name = effect.name || 'Unnamed Spell';
    const description = effect.description || 'No description';

    // Infer technique and form from operations (simplified)
    const technique = this.inferTechnique(effect);
    const form = this.inferForm(effect);

    // Estimate mana cost based on complexity
    const manaCost = this.estimateManaCost(effect);

    // Estimate cast time based on operations
    const castTime = this.estimateCastTime(effect);

    // Estimate range from target type
    const range = this.estimateRange(effect);

    const spell: SpellDefinition = {
      id: spellId,
      name,
      paradigmId,
      technique,
      form,
      source: 'arcane', // Default source
      manaCost,
      castTime,
      range,
      effectId: `effect_${spellId}`, // Placeholder
      description,
      baseMishapChance: 0.1,
      hotkeyable: true,
      tags: ['llm_generated', 'discovered'],
    };

    return spell;
  }

  private inferTechnique(effect: EffectExpression): any {
    // Simplified technique inference
    const ops = effect.operations || [];
    const hasSpawn = ops.some((op: any) => op.op === 'spawn_entity' || op.op === 'spawn_item');
    const hasDamage = ops.some((op: any) => op.op === 'deal_damage');
    const hasHeal = ops.some((op: any) => op.op === 'heal');
    const hasBuff = ops.some((op: any) => op.op === 'modify_stat');

    if (hasSpawn) return 'create';
    if (hasDamage) return 'destroy';
    if (hasHeal) return 'enhance';
    if (hasBuff) return 'enhance';
    return 'transform';
  }

  private inferForm(effect: EffectExpression): any {
    // Simplified form inference from operations
    const ops = effect.operations || [];
    const hasFire = ops.some((op: any) => op.damageType === 'fire');
    const hasIce = ops.some((op: any) => op.damageType === 'ice');
    const hasLightning = ops.some((op: any) => op.damageType === 'lightning');

    if (hasFire) return 'fire';
    if (hasIce) return 'water';
    if (hasLightning) return 'air';
    return 'spirit';
  }

  private estimateManaCost(effect: EffectExpression): number {
    // Base cost + operation count + complexity
    let cost = 10; // Base
    cost += (effect.operations?.length || 0) * 5;

    // Higher cost for area effects
    if (effect.target?.type === 'area') {
      cost += 20;
    }

    return Math.min(cost, 200); // Cap at 200
  }

  private estimateCastTime(effect: EffectExpression): number {
    // 20 ticks base + 10 per operation
    let time = 20;
    time += (effect.operations?.length || 0) * 10;
    return Math.min(time, 200); // Cap at 200 ticks (10 seconds)
  }

  private estimateRange(effect: EffectExpression): number {
    if (effect.target?.type === 'self') return 0;
    if (effect.target?.type === 'area') return effect.target.radius || 10;
    if (effect.target?.type === 'cone') return effect.target.radius || 10;
    if (effect.target?.type === 'line') return effect.target.length || 10;
    return 10; // Default single target range
  }

  /**
   * Preserve rejected effect per Conservation of Game Matter principle.
   *
   * Nothing is ever deleted - rejected effects become artifacts.
   */
  private preserveRejectedEffect(
    effect: EffectExpression,
    decision: BlessingDecision,
    creatorId: string,
    creatorName: string
  ): RejectedEffectArtifact {
    return this.artifactSystem.preserveRejectedEffect(
      effect,
      decision,
      creatorId,
      creatorName
    );
  }
}
