/**
 * SchismSystem - Phase 8: Advanced Theology
 *
 * Handles religious schisms - when a deity's religion splits into two separate beliefs.
 * Schisms occur when:
 * - Theological disputes among believers
 * - Domain conflicts within the faith
 * - Major disagreements about deity identity
 * - Charismatic leader promotes alternative interpretation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { DivineDomain } from '../components/DeityComponent.js';

// ============================================================================
// Schism Types
// ============================================================================

export interface SchismData {
  id: string;

  /** Original deity that split */
  originalDeityId: string;

  /** New deity created from schism */
  newDeityId: string;

  /** When the schism occurred */
  occurredAt: number;

  /** Cause of the schism */
  cause: SchismCause;

  /** How believers were split */
  believerSplit: {
    remainedWith: string[];     // Stayed with original
    joinedNew: string[];        // Went to new deity
  };

  /** Theological differences */
  theologicalDifferences: string[];

  /** Relationship between the two */
  relationship: 'hostile' | 'rivalrous' | 'cordial' | 'unknown';
}

export type SchismCause =
  | 'theological_dispute'     // Different interpretations of deity
  | 'domain_conflict'         // Believers disagree on deity's domain
  | 'personality_conflict'    // Different views of deity personality
  | 'charismatic_leader'      // Strong believer leads breakaway
  | 'miracle_interpretation'  // Disagreement about meaning of divine act
  | 'geographic_separation'   // Believers isolated from each other
  | 'cultural_divergence';    // Different cultural groups worship differently

// ============================================================================
// Schism Configuration
// ============================================================================

export interface SchismConfig {
  /** How often to check for potential schisms (ticks) */
  checkInterval: number;

  /** Minimum believers for a schism to occur */
  minBelieversForSchism: number;

  /** Minimum belief divergence to trigger schism (0-1) */
  minDivergence: number;
}

export const DEFAULT_SCHISM_CONFIG: SchismConfig = {
  checkInterval: 4800, // ~4 minutes at 20 TPS
  minBelieversForSchism: 10,
  minDivergence: 0.6,
};

// ============================================================================
// SchismSystem
// ============================================================================

export class SchismSystem extends BaseSystem {
  public readonly id = 'SchismSystem';
  public readonly priority = 76;
  public readonly requiredComponents = [];

  private config: SchismConfig;
  private schisms: Map<string, SchismData> = new Map();
  private lastCheck: number = 0;

  constructor(config: Partial<SchismConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SCHISM_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    if (currentTick - this.lastCheck < this.config.checkInterval) {
      return;
    }

    this.lastCheck = currentTick;

    // Check each deity for potential schisms
    this.checkForSchisms(ctx.world, currentTick);
  }

  /**
   * Check for potential schisms
   */
  private checkForSchisms(world: World, currentTick: number): void {
    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Deity)) continue;

      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deity) continue;

      // Need minimum believers for schism
      if (deity.believers.size < this.config.minBelieversForSchism) {
        continue;
      }

      // Analyze belief divergence among believers
      const divergence = this.analyzeBeliefDivergence(world, entity.id, deity);

      if (divergence.score >= this.config.minDivergence) {
        this.triggerSchism(world, entity.id, deity, divergence, currentTick);
      }
    }
  }

  /**
   * Analyze how much believers diverge in their understanding of the deity
   */
  private analyzeBeliefDivergence(
    world: World,
    deityId: string,
    _deity: DeityComponent
  ): { score: number; cause: SchismCause; faction1: string[]; faction2: string[] } {
    const believers = Array.from(world.entities.values())
      .filter(e => {
        if (!e.components.has(CT.Spiritual)) return false;
        const spiritual = e.components.get(CT.Spiritual) as SpiritualComponent | undefined;
        return spiritual && spiritual.believedDeity === deityId;
      });

    // For now, simple random split simulation
    // In full implementation, would analyze:
    // - Geographic distribution
    // - Personality differences
    // - Recent events interpretation
    // - Leadership emergence

    if (believers.length < this.config.minBelieversForSchism) {
      return { score: 0, cause: 'theological_dispute', faction1: [], faction2: [] };
    }

    // Random schism chance - in reality would be based on actual divergence
    const shouldSchism = Math.random() < 0.05; // 5% chance per check

    if (!shouldSchism) {
      return { score: 0, cause: 'theological_dispute', faction1: [], faction2: [] };
    }

    // Split believers into two factions
    const mid = Math.floor(believers.length / 2);
    const faction1 = believers.slice(0, mid).map(e => e.id);
    const faction2 = believers.slice(mid).map(e => e.id);

    const causes: SchismCause[] = [
      'theological_dispute',
      'domain_conflict',
      'personality_conflict',
      'charismatic_leader',
    ];

    const cause = causes[Math.floor(Math.random() * causes.length)] ?? 'theological_dispute';

    return {
      score: 0.7,
      cause,
      faction1,
      faction2,
    };
  }

  /**
   * Trigger a schism - create new deity from split
   */
  private triggerSchism(
    world: World,
    originalDeityId: string,
    originalDeity: DeityComponent,
    divergence: { score: number; cause: SchismCause; faction1: string[]; faction2: string[] },
    currentTick: number
  ): void {
    // Create new deity entity
    const newDeityEntity = world.createEntity();

    // Create new deity component with modified identity
    const newDeity = new DeityComponent(
      this.generateSchismName(originalDeity),
      'ai'
    );

    // Copy some traits from original, but modify others
    newDeity.identity.domain = this.selectAlternativeDomain(originalDeity);
    newDeity.identity.perceivedPersonality = {
      ...originalDeity.identity.perceivedPersonality,
      // Emphasize different aspects
      interventionism: originalDeity.identity.perceivedPersonality.interventionism * 0.8,
      wrathfulness: Math.max(0, originalDeity.identity.perceivedPersonality.wrathfulness - 0.2),
    };

    // Add deity component to the new entity
    // Note: Direct component assignment since components is readonly Map
    // In full implementation, would use world.setEntityComponent if available
    (newDeityEntity.components as Map<string, any>).set(CT.Deity, newDeity);

    // Split believers
    const remainedWith: string[] = divergence.faction1;
    const joinedNew: string[] = divergence.faction2;

    // Update believer allegiances
    for (const believerId of joinedNew) {
      const believerEntity = world.getEntity(believerId);
      if (!believerEntity) continue;

      const spiritual = believerEntity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Remove from original
      originalDeity.removeBeliever(believerId);

      // Add to new
      newDeity.addBeliever(believerId);
      spiritual.believedDeity = newDeityEntity.id;
    }

    // Create schism record
    const schism: SchismData = {
      id: `schism_${Date.now()}`,
      originalDeityId,
      newDeityId: newDeityEntity.id,
      occurredAt: currentTick,
      cause: divergence.cause,
      believerSplit: {
        remainedWith,
        joinedNew,
      },
      theologicalDifferences: this.generateTheologicalDifferences(divergence.cause),
      relationship: this.determinePostSchismRelationship(divergence.cause),
    };

    this.schisms.set(schism.id, schism);

    // Emit schism event
    this.events.emitGeneric('schism_occurred', {
      schismId: schism.id,
      originalDeityId,
      newDeityId: newDeityEntity.id,
      cause: divergence.cause,
      believersAffected: remainedWith.length + joinedNew.length,
    });
  }

  /**
   * Generate name for schismatic deity
   */
  private generateSchismName(originalDeity: DeityComponent): string {
    const prefixes = ['The True', 'The Reformed', 'The New', 'The Elder'];
    const original = originalDeity.identity.primaryName;

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix} ${original}`;
  }

  /**
   * Select an alternative domain for the schismatic deity
   */
  private selectAlternativeDomain(originalDeity: DeityComponent): DivineDomain | undefined {
    // If has secondary domains, promote one
    if (originalDeity.identity.secondaryDomains.length > 0) {
      return originalDeity.identity.secondaryDomains[0];
    }

    // Otherwise keep same domain
    return originalDeity.identity.domain;
  }

  /**
   * Generate theological differences that caused the schism
   */
  private generateTheologicalDifferences(cause: SchismCause): string[] {
    const differences: Record<SchismCause, string[]> = {
      theological_dispute: [
        'Different interpretation of deity\'s intentions',
        'Disagreement about proper worship practices',
      ],
      domain_conflict: [
        'Dispute over deity\'s true domain',
        'Conflicting views on divine responsibilities',
      ],
      personality_conflict: [
        'Different understanding of deity\'s nature',
        'Debate over deity\'s benevolence vs wrath',
      ],
      charismatic_leader: [
        'New prophet claims different revelation',
        'Alternative vision of deity\'s will',
      ],
      miracle_interpretation: [
        'Conflicting meanings of divine acts',
        'Debate over miracle authenticity',
      ],
      geographic_separation: [
        'Regional variations in worship',
        'Isolated groups developed different traditions',
      ],
      cultural_divergence: [
        'Cultural differences in religious expression',
        'Different cultural values projected onto deity',
      ],
    };

    return differences[cause] || ['Unknown theological differences'];
  }

  /**
   * Determine relationship between original and schism deity
   */
  private determinePostSchismRelationship(cause: SchismCause): 'hostile' | 'rivalrous' | 'cordial' | 'unknown' {
    // More bitter causes lead to more hostile relationships
    const hostileCauses: SchismCause[] = ['charismatic_leader', 'theological_dispute'];
    const rivalrousCauses: SchismCause[] = ['domain_conflict', 'personality_conflict'];

    if (hostileCauses.includes(cause)) {
      return 'hostile';
    } else if (rivalrousCauses.includes(cause)) {
      return 'rivalrous';
    } else {
      return 'cordial';
    }
  }

  /**
   * Get schism data
   */
  getSchism(schismId: string): SchismData | undefined {
    return this.schisms.get(schismId);
  }

  /**
   * Get all schisms involving a deity
   */
  getSchismsForDeity(deityId: string): SchismData[] {
    return Array.from(this.schisms.values())
      .filter(s => s.originalDeityId === deityId || s.newDeityId === deityId);
  }
}
