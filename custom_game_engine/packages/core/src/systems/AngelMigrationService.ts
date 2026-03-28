/**
 * AngelMigrationService - Graduated Norn Import
 *
 * Imports graduated Norns from the Precursors game and creates MVEE angel
 * entities with personality traits derived from their Precursors life history.
 *
 * Design notes:
 * - GraduatedNornExport is duplicated here intentionally: these are separate
 *   codebases with no shared package.
 * - Migrated angels start at tier 1 — they earn promotion through MVEE service
 *   regardless of how far they progressed in Precursors.
 * - autonomousAI is false on creation (supervised autonomy).
 * - beliefCostPerTick is 0 — migrated angels serve out of devotion, not
 *   obligation.
 */

import type { World } from '../ecs/World.js';
import type { AngelData, AngelRank, AngelPurpose } from './AngelTypes.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createAngelEvolutionComponent } from '../components/AngelEvolutionComponent.js';
import { createAngelResourceComponent } from '../components/AngelResourceComponent.js';

// ============================================================================
// Precursors Export Format
// ============================================================================

/**
 * The export payload produced by Precursors when a Norn graduates.
 * Duplicated from the Precursors codebase — these are separate projects with
 * no shared package dependency.
 */
export interface GraduatedNornExport {
  graduationId: string;
  nornName: string;
  species: string;
  generation: number;
  finalTier: number;
  finalIQ: number;
  personality: {
    compassion: number;
    strictness: number;
    proactiveness: number;
    wisdom: number;
  };
  behaviorDrift: Record<string, number>;
  vocabularySize: number;
  recipeCount: number;
  significantMemories: string[];
  graduatedAt: number;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Personality traits used by AngelAIDecisionProcessor.
 * Mirrored here to avoid a circular import — this file must not import from
 * AngelAIDecisionProcessor.
 */
export interface AngelPersonalityTraits {
  /** 0–1: tendency toward mercy and care */
  compassion: number;
  /** 0–1: tendency toward rule enforcement and discipline */
  strictness: number;
  /** 0–1: tendency to act without prompting */
  proactiveness: number;
  /** 0–1: accumulated insight and deliberation */
  wisdom: number;
}

// ============================================================================
// AngelMigrationService
// ============================================================================

export class AngelMigrationService {
  /**
   * Maps a graduated Norn to an angel rank based on dominant personality
   * traits and final tier.
   *
   * Precedence (evaluated top-to-bottom, first match wins):
   *   1. Tier 28+ → seraph (regardless of traits)
   *   2. High wisdom (≥0.6) → scholar
   *   3. High proactiveness (≥0.6) → messenger
   *   4. High compassion + low strictness → guardian
   *   5. High strictness + low compassion → warrior
   *   6. Default → messenger
   */
  mapToAngelRank(nornExport: GraduatedNornExport): AngelRank {
    const { finalTier, personality } = nornExport;
    const { compassion, strictness, proactiveness, wisdom } = personality;

    // Validate trait range
    for (const [key, value] of Object.entries(personality)) {
      if (value < 0 || value > 1) {
        throw new Error(
          `[AngelMigrationService] Personality trait "${key}" out of range 0–1: ${value} ` +
          `(graduationId=${nornExport.graduationId})`
        );
      }
    }

    // Tier 28+ always produces a seraph
    if (finalTier >= 28) {
      return 'seraph';
    }

    // High wisdom → scholar (knowledge archetype)
    if (wisdom >= 0.6) {
      return 'scholar';
    }

    // High proactiveness → messenger (go-getter archetype)
    if (proactiveness >= 0.6) {
      return 'messenger';
    }

    // High compassion + low strictness → guardian (protector archetype)
    if (compassion >= 0.6 && strictness < 0.4) {
      return 'guardian';
    }

    // High strictness + low compassion → warrior (enforcer archetype)
    if (strictness >= 0.6 && compassion < 0.4) {
      return 'warrior';
    }

    // Default: messenger
    return 'messenger';
  }

  /**
   * Maps an angel rank and personality to an angel purpose.
   *
   *   guardian  → protect_believers
   *   warrior   → punish_heretics
   *   scholar   → perform_miracles
   *   messenger → deliver_messages
   *   seraph    → perform_miracles
   */
  mapToAngelPurpose(
    rank: AngelRank,
    _personality: AngelPersonalityTraits
  ): AngelPurpose {
    const rankToPurpose: Record<AngelRank, AngelPurpose> = {
      guardian:  'protect_believers',
      warrior:   'punish_heretics',
      scholar:   'perform_miracles',
      messenger: 'deliver_messages',
      seraph:    'perform_miracles',
    };

    const purpose = rankToPurpose[rank];
    if (purpose === undefined) {
      throw new Error(
        `[AngelMigrationService] Unknown angel rank: "${rank as string}"`
      );
    }

    return purpose;
  }

  /**
   * The main entry point: creates an MVEE angel entity from a graduated Norn.
   *
   * Follows the same entity setup pattern as AngelSystem.createAngel():
   * adds AngelEvolutionComponent + AngelResourceComponent, then returns
   * the populated AngelData for the caller to register with a deity.
   *
   * Returns null only if world.createEntity() fails to produce a valid entity
   * (which should not happen under normal operation — callers should treat
   * null as a fatal configuration error).
   */
  createMigratedAngel(
    world: World,
    deityId: string,
    nornExport: GraduatedNornExport
  ): AngelData | null {
    if (!deityId) {
      throw new Error(
        '[AngelMigrationService] deityId must be a non-empty string'
      );
    }

    const rank = this.mapToAngelRank(nornExport);
    const purpose = this.mapToAngelPurpose(rank, nornExport.personality);

    const angelEntity = world.createEntity();
    if (!angelEntity) {
      console.error(
        '[AngelMigrationService] world.createEntity() returned null; ' +
        `cannot migrate Norn "${nornExport.nornName}" (graduationId=${nornExport.graduationId})`
      );
      return null;
    }

    const name = `${nornExport.nornName} the Ascended`;
    const tier = 1; // Must earn promotion through MVEE service

    // Add evolution component (same pattern as AngelSystem.createAngel)
    const evolutionComponent = createAngelEvolutionComponent({
      tier,
      tierName: 'Ascended',
      level: 1,
      currentDescription: `${name} — a ${nornExport.species} who transcended mortal existence in Precursors`,
    });
    (angelEntity as EntityImpl).addComponent(evolutionComponent);

    // Add resource component (independent mana pool)
    const resourceComponent = createAngelResourceComponent({
      tier,
      currentTick: world.tick,
    });
    (angelEntity as EntityImpl).addComponent(resourceComponent);

    const angelData: AngelData = {
      id:               angelEntity.id,
      deityId,
      entityId:         angelEntity.id,
      rank,
      purpose,
      createdAt:        world.tick,
      beliefCostPerTick: 0,   // Migrated angels serve out of devotion
      active:           true,
      autonomousAI:     false, // Supervised autonomy on arrival
      tier,
      name,
    };

    return angelData;
  }

  /**
   * Generates a lore string describing the angel's origin in Precursors.
   * Intended to be stored on the angel entity as backstory.
   */
  generateMigrationLore(nornExport: GraduatedNornExport): string {
    const {
      nornName,
      species,
      generation,
      finalTier,
      finalIQ,
      vocabularySize,
      recipeCount,
      significantMemories,
      graduatedAt,
    } = nornExport;

    const graduationDate = new Date(graduatedAt).toISOString().split('T')[0] ?? 'unknown date';

    const memorySummary =
      significantMemories.length === 0
        ? 'They carry no significant memories of that life into the divine realm.'
        : significantMemories.length === 1
          ? `One memory endures above all others: "${significantMemories[0]}".`
          : `${significantMemories.length} memories endure above all others: ` +
            significantMemories
              .slice(0, 3)
              .map(m => `"${m}"`)
              .join(', ') +
            (significantMemories.length > 3 ? `, and ${significantMemories.length - 3} more.` : '.');

    const knowledgeLine =
      (vocabularySize > 0 || recipeCount > 0)
        ? ` In life, ${nornName} spoke ${vocabularySize.toLocaleString()} words and mastered ${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}.`
        : '';

    return (
      `${nornName} the Ascended was born a ${species} in the world of Precursors, ` +
      `${generation === 1 ? 'the first of their line' : `generation ${generation} of their lineage`}. ` +
      `They lived to tier ${finalTier} with an intellect measured at ${finalIQ}, ` +
      `graduating on ${graduationDate}.` +
      knowledgeLine +
      ` ${memorySummary}` +
      ` Having transcended mortal existence, ${nornName} now serves as a divine messenger ` +
      `in the eternal realm, their earthly wisdom transmuted into heavenly purpose.`
    );
  }
}
