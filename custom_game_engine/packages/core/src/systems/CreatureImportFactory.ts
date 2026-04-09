/**
 * CreatureImportFactory
 *
 * Implements the 7-step creature import pipeline for cross-game genome migration
 * via the Folkfork bridge (genome_migration_v1 schema).
 *
 * This is NOT a per-tick system — it is invoked on-demand when a creature
 * migration payload arrives from another Multiverse game.
 *
 * Per CLAUDE.md:
 *   - NO silent fallbacks — throw on invalid data
 *   - NO `as any` / `as unknown as Type` escape hatches
 *   - NO console.log debug output
 *   - Component types: lowercase_with_underscores
 *   - Use .js extensions in all imports
 */

import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { GenomeMigrationV1, DccProfile } from '@multiverse-studios/folkfork-bridge';
import { validateGenome } from '@multiverse-studios/folkfork-bridge';
import { AnimalComponent, type AnimalGenetics, type AnimalPersonality, type AnimalPersonalityType } from '../components/AnimalComponent.js';
import { MigrationProvenanceComponent, type MigrationProvenanceData, type MigrationLossDeclaration, type MigrationType, type SourceGame } from '../components/MigrationProvenanceComponent.js';
import { QuarantineStatusComponent, createQuarantineStatus } from '../components/QuarantineStatusComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { mapCoreTraitsToGenetics, mapDrivesToNeeds, mapDrivesToPersonality, computeGDI } from '../genetics/MigrationGenetics.js';
import { getSpeciesTemplate, type SpeciesBehaviorProfile, type SpeciesTemplate } from '../species/SpeciesRegistry.js';

// ============================================================================
// Public Interfaces
// ============================================================================

export interface MigrationContext {
  migrationType: MigrationType;
  capsuleId: string | null;
  federatedIdentityHash: string | null;
}

export interface CreatureImportWarning {
  code: string;
  message: string;
  traitId?: string;
}

export interface CreatureImportResult {
  success: boolean;
  entityId: string | null;
  warnings: CreatureImportWarning[];
  geneticDistanceIndex: number;
  lossDeclaration: MigrationLossDeclaration | null;
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class CreatureImportError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'CreatureImportError';
  }
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function resolveSpeciesTemplate(speciesId: string | null | undefined): SpeciesTemplate | undefined {
  if (!speciesId) return undefined;
  const direct = getSpeciesTemplate(speciesId);
  if (direct) return direct;

  if (speciesId.startsWith('folkfork_')) {
    return getSpeciesTemplate(speciesId.slice('folkfork_'.length));
  }

  return getSpeciesTemplate(`folkfork_${speciesId}`);
}

function enforceCognitiveCeiling(genetics: AnimalGenetics, profile: SpeciesBehaviorProfile): number | null {
  const cap = Math.round(clamp01(profile.cognitiveCeiling) * 100);
  const trait = genetics.intelligence;

  const nextAllele1 = Math.min(trait.allele1, cap);
  const nextAllele2 = Math.min(trait.allele2, cap);
  const nextExpression = Math.min(trait.expression, cap);
  const nextMeanExpression = (nextAllele1 + nextAllele2) / 2;

  const applied =
    nextAllele1 !== trait.allele1 ||
    nextAllele2 !== trait.allele2 ||
    nextExpression !== trait.expression;

  trait.allele1 = nextAllele1;
  trait.allele2 = nextAllele2;
  trait.expression = Math.min(nextExpression, nextMeanExpression, cap);

  return applied ? cap : null;
}

function seedPersonalityFromBaseline(
  personality: AnimalPersonality,
  profile: SpeciesBehaviorProfile,
  rng: () => number = Math.random,
): { personality: AnimalPersonality; applied: boolean } {
  const baseline = profile.personalityBaseline;
  if (!baseline) {
    return { personality, applied: false };
  }

  const map: Record<keyof AnimalPersonality, number | undefined> = {
    curiosity: baseline.curiosity,
    aggressiveness: baseline.aggression,
    sociability: baseline.sociability,
    fearfulness: baseline.fearfulness,
  };

  let applied = false;
  const next: AnimalPersonality = { ...personality };
  const variance = 0.16;

  (Object.keys(map) as Array<keyof AnimalPersonality>).forEach((key) => {
    const center = map[key];
    if (typeof center !== 'number') return;

    const sample = clamp01(center + (rng() - 0.5) * variance);
    const blended = clamp01((personality[key] + sample) / 2);
    next[key] = blended;
    applied = true;
  });

  return { personality: next, applied };
}

// ============================================================================
// CreatureImportFactory
// ============================================================================

export class CreatureImportFactory {
  /**
   * Import a creature from another game into the MVEE world.
   *
   * Executes the 7-step pipeline:
   *   1. Schema validation
   *   2. Integrity verification
   *   3. Provenance chain validation
   *   4. Genome translation
   *   5. Biome conflict resolution
   *   6. Entity construction
   *   7. Event emission + result assembly
   *
   * Throws `CreatureImportError` on any fatal validation failure.
   */
  importCreature(
    world: World,
    payload: GenomeMigrationV1,
    targetPosition: { x: number; y: number },
    migrationContext: MigrationContext,
  ): CreatureImportResult {
    const warnings: CreatureImportWarning[] = [];

    // -----------------------------------------------------------------------
    // Step 1: Schema Validation
    // -----------------------------------------------------------------------
    const validation = validateGenome(payload);
    if (!validation.valid) {
      throw new CreatureImportError(
        'schema_invalid',
        `Schema validation failed: ${validation.findings.map((f) => f.message).join('; ')}`,
      );
    }

    // -----------------------------------------------------------------------
    // Step 2: Integrity Verification
    // -----------------------------------------------------------------------

    // Validate provenance exists before accessing checksum.
    if (!payload.provenance) {
      throw new CreatureImportError(
        'schema_invalid',
        'Payload missing provenance section; cannot verify integrity',
      );
    }

    // Validate checksum field exists and is a non-empty string.
    // Full SHA-256 verification is deferred — field presence is enforced here.
    const checksum = payload.provenance.checksum;
    if (typeof checksum !== 'string' || checksum.length === 0) {
      throw new CreatureImportError(
        'integrity_hash_mismatch',
        'Provenance checksum field is missing or empty; integrity cannot be verified',
      );
    }

    // Validate schema version major == 1.
    const schemaVersion: string = payload.schema_version;
    const majorVersion = parseInt(schemaVersion.split('.')[0] ?? '', 10);
    if (isNaN(majorVersion) || majorVersion !== 1) {
      throw new CreatureImportError(
        'schema_version_unsupported',
        `Unsupported schema version "${schemaVersion}"; only major version 1 is supported`,
      );
    }

    // -----------------------------------------------------------------------
    // Step 3: Provenance Chain Validation
    // -----------------------------------------------------------------------

    const sourceGame = payload.provenance.source_game;
    if (sourceGame !== 'precursors' && sourceGame !== 'mvee') {
      throw new CreatureImportError(
        'provenance_chain_broken',
        `Provenance source_game "${sourceGame}" is not a recognised Multiverse game; expected "precursors" or "mvee"`,
      );
    }

    const creatureId = payload.identity.creature_id;
    if (typeof creatureId !== 'string' || creatureId.length === 0) {
      throw new CreatureImportError(
        'provenance_chain_broken',
        'Provenance chain broken: identity.creature_id is missing or empty',
      );
    }

    // Check for duplicate creature_id across all entities that carry a migration_provenance component.
    for (const entity of world.entities.values()) {
      const provenance = entity.getComponent<MigrationProvenanceComponent>('migration_provenance');
      if (provenance !== undefined && provenance.sourceCreatureId === creatureId) {
        throw new CreatureImportError(
          'duplicate_creature_id',
          `Creature with id "${creatureId}" already exists in this world (entity ${entity.id})`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // Step 4: Genome Translation
    // -----------------------------------------------------------------------

    // Translate core traits + visual tokens to MVEE genetics.
    const { genetics, lossDeclaration } = mapCoreTraitsToGenetics(
      payload.core_traits,
      payload.visual_tokens,
    );

    // Translate drives to MVEE NeedsComponent values.
    const needsResult = mapDrivesToNeeds(payload.drive_mapping);

    // Translate drives + D_cc profile to MVEE personality.
    let personality: AnimalPersonality = mapDrivesToPersonality(
      payload.drive_mapping,
      payload.dcc_profile,
    );

    const speciesTemplate = resolveSpeciesTemplate(payload.identity.species_id);
    const speciesBehaviorProfile = speciesTemplate?.speciesBehaviorProfile;
    if (speciesBehaviorProfile) {
      const cappedAt = enforceCognitiveCeiling(genetics, speciesBehaviorProfile);
      if (cappedAt !== null) {
        warnings.push({
          code: 'cognitive_ceiling_enforced',
          message: `Species cognitive ceiling enforced at ${cappedAt} for ${speciesTemplate?.speciesId ?? payload.identity.species_id}`,
        });
      }

      const seeded = seedPersonalityFromBaseline(personality, speciesBehaviorProfile);
      personality = seeded.personality;
      if (seeded.applied) {
        warnings.push({
          code: 'personality_baseline_seeded',
          message: `Species personality baseline seeded with variance for ${speciesTemplate?.speciesId ?? payload.identity.species_id}`,
        });
      }
    }

    // Compute Genetic Distance Index.
    const gdi = computeGDI(payload.core_traits, genetics);

    // --- Collect warnings from genome translation ---

    // Synthesized traits.
    for (const traitId of lossDeclaration.synthesized) {
      warnings.push({
        code: 'trait_fallback_generated',
        message: `Trait "${traitId}" had no Folkfork source and was synthesised from species defaults`,
        traitId,
      });
    }

    // Lossy traits — warn for each entry that had value clamping (informationLoss > 0).
    for (const entry of lossDeclaration.lossy) {
      if (entry.informationLoss > 0) {
        warnings.push({
          code: 'trait_value_out_of_range',
          message: `Trait "${entry.traitId}" value was clamped during transfer (loss: ${entry.informationLoss.toFixed(3)}); reason: ${entry.reason}`,
          traitId: entry.traitId,
        });
      }
    }

    // Drives with no MVEE analog.
    for (const drive of payload.drive_mapping) {
      if (drive.mapping_type === 'no_analog') {
        warnings.push({
          code: 'drive_no_analog',
          message: `Drive "${drive.source_drive}" has no MVEE equivalent and was discarded`,
        });
      }
    }

    // Personality derived from drives.
    warnings.push({
      code: 'personality_synthesized',
      message: 'Personality was derived from Folkfork drive mapping and D_cc profile rather than direct personality transfer',
    });

    // colorVariant derived from visual_tokens.base_hue.
    warnings.push({
      code: 'color_coarse_mapping',
      message: `colorVariant was derived from visual_tokens.base_hue (${payload.visual_tokens.base_hue}°); fine-grained colour data was not transferred`,
    });

    // LLM portability warning.
    if (payload.living_llm.portability !== 'portable') {
      warnings.push({
        code: 'living_llm_incompatible',
        message: `Living LLM portability is "${payload.living_llm.portability}"; the creature's learned behaviours may not transfer correctly`,
      });
    }

    // Unrecognised species family.
    if (payload.identity.species_id === undefined || payload.identity.species_id === null) {
      warnings.push({
        code: 'species_family_unknown',
        message: 'species_id is absent; creature will be registered as "imported_unknown"',
      });
    }

    // -----------------------------------------------------------------------
    // Step 5: Biome Conflict Resolution (placeholder)
    // -----------------------------------------------------------------------

    // Full biome conflict checking is future work; always emit a placeholder warning.
    warnings.push({
      code: 'biome_conflict_resolved',
      message: 'Biome conflict resolution is not yet implemented; creature placed without biome compatibility check',
    });

    // -----------------------------------------------------------------------
    // Step 6: Entity Construction
    // -----------------------------------------------------------------------

    // Check quarantine capacity: max 10 non-complete quarantine entities.
    let activeQuarantineCount = 0;
    for (const entity of world.entities.values()) {
      const quarantine = entity.getComponent<QuarantineStatusComponent>('quarantine_status');
      if (quarantine !== undefined && quarantine.phase !== 'complete') {
        activeQuarantineCount += 1;
      }
    }
    if (activeQuarantineCount >= 10) {
      throw new CreatureImportError(
        'quarantine_capacity_exceeded',
        `Quarantine capacity exceeded: ${activeQuarantineCount} creatures are already in active quarantine (limit: 10)`,
      );
    }

    // Create entity.
    const entity = world.createEntity();
    const entityImpl = entity as EntityImpl;

    // Add AnimalComponent.
    const animalData = {
      id: payload.identity.creature_id,
      speciesId: payload.identity.species_id ?? 'imported_unknown',
      name: payload.identity.name,
      position: targetPosition,
      age: 0,
      lifeStage: 'adult' as const,
      hunger: 50,
      thirst: 50,
      energy: 75,
      stress: 70,
      mood: 40,
      wild: true,
      bondLevel: 0,
      trustLevel: 20,
      state: 'idle' as const,
      health: Math.round(needsResult.health * 100),
      size: genetics.size.expression / 50, // normalise to size multiplier (expression 0–100 → 0–2 multiplier)
      personality,
    };
    entityImpl.addComponent(new AnimalComponent(animalData));

    // Add PositionComponent.
    entityImpl.addComponent(createPositionComponent(targetPosition.x, targetPosition.y));

    // Add QuarantineStatusComponent.
    entityImpl.addComponent(createQuarantineStatus(world.tick));

    // Add MigrationProvenanceComponent.
    const provenanceData: MigrationProvenanceData = {
      sourceGame: payload.provenance.source_game as SourceGame,
      sourceCreatureId: payload.identity.creature_id,
      sourcePlayerId: null,
      migrationType: migrationContext.migrationType,
      importedAt: new Date().toISOString(),
      schemaVersion: payload.schema_version,
      genomicIntegrityHash: payload.provenance.checksum,
      geneticDistanceIndex: gdi,
      lossDeclaration,
      migrationChain: payload.provenance.migration_history.map((h) => ({
        fromGame: h.from_game,
        toGame: h.to_game,
        crossedAt: h.crossed_at,
        gdiAtCrossing: h.gdi_at_crossing,
        schemaVersionUsed: h.schema_version_used,
      })),
      federatedIdentityHash: migrationContext.federatedIdentityHash,
      capsuleId: migrationContext.capsuleId,
      loreNotes: [],
    };
    entityImpl.addComponent(new MigrationProvenanceComponent(provenanceData));

    // -----------------------------------------------------------------------
    // Step 7: Emit event and return result
    // -----------------------------------------------------------------------

    world.eventBus.emit({
      type: 'creature:imported',
      source: entity.id,
      data: {
        entityId: entity.id,
        sourceGame: payload.provenance.source_game,
        migrationType: migrationContext.migrationType,
        speciesId: payload.identity.species_id,
        intelligenceExpression: genetics.intelligence.expression,
        cognitiveCeiling: speciesBehaviorProfile?.cognitiveCeiling,
      },
    });

    if (speciesBehaviorProfile) {
      for (const uniqueBehavior of speciesBehaviorProfile.uniqueBehaviors) {
        world.eventBus.emit({
          type: 'species:unique_behavior_registered',
          source: entity.id,
          data: {
            entityId: entity.id,
            speciesId: payload.identity.species_id,
            behaviorId: uniqueBehavior.behaviorId,
            triggerHint: uniqueBehavior.triggerHint,
            description: uniqueBehavior.description,
          },
        });
      }

      for (const relation of speciesBehaviorProfile.interspeciesRelations) {
        world.eventBus.emit({
          type: 'species:interspecies_relation_registered',
          source: entity.id,
          data: {
            entityId: entity.id,
            sourceSpeciesId: payload.identity.species_id,
            targetSpeciesId: relation.targetSpeciesId,
            disposition: relation.disposition,
            description: relation.description ?? '',
          },
        });
      }
    }

    return {
      success: true,
      entityId: entity.id,
      warnings,
      geneticDistanceIndex: gdi,
      lossDeclaration,
    };
  }
}
