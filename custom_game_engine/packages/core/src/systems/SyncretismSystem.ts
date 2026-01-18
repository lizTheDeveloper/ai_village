/**
 * SyncretismSystem - Phase 8: Advanced Theology
 *
 * Handles syncretism - when two deities or their religions merge.
 * Syncretism occurs when:
 * - Two deities have overlapping domains
 * - Believers worship multiple gods and see connections
 * - Cultural exchange between two religious groups
 * - Political alliances between deities
 * - Natural domain synergy
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';

// ============================================================================
// Syncretism Types
// ============================================================================

export interface SyncretismData {
  id: string;

  /** Deities involved in the syncretism */
  deityIds: [string, string];

  /** Type of syncretism */
  type: SyncretismType;

  /** When it occurred */
  occurredAt: number;

  /** Result of the merger */
  result: SyncretismResult;

  /** Shared mythology generated */
  sharedMyths: string[];

  /** Combined domains */
  combinedDomains: string[];
}

export type SyncretismType =
  | 'full_merger'          // Two gods become one
  | 'aspect_merger'        // Gods remain separate but seen as aspects of each other
  | 'pantheon_merger'      // Believers worship both equally as partners
  | 'subordination'        // One god becomes servant/child of another
  | 'syncretic_identity';  // New shared identity while maintaining separation

export interface SyncretismResult {
  /** What happened */
  outcome: 'merged_deity' | 'dual_aspect' | 'allied_pantheon' | 'hierarchical';

  /** New deity created (if full merger) */
  newDeityId?: string;

  /** How believers were combined */
  believerIntegration: 'full_sharing' | 'partial_overlap' | 'kept_separate';

  /** Belief pool handling */
  beliefPooling: 'combined' | 'shared' | 'separate';
}

// ============================================================================
// Syncretism Configuration
// ============================================================================

export interface SyncretismConfig {
  /** How often to check for syncretism opportunities (ticks) */
  checkInterval: number;

  /** Minimum domain overlap for natural syncretism (0-1) */
  minDomainOverlap: number;

  /** Minimum shared believers for syncretism */
  minSharedBelievers: number;
}

export const DEFAULT_SYNCRETISM_CONFIG: SyncretismConfig = {
  checkInterval: 6000, // ~5 minutes at 20 TPS
  minDomainOverlap: 0.4,
  minSharedBelievers: 3,
};

// ============================================================================
// SyncretismSystem
// ============================================================================

export class SyncretismSystem extends BaseSystem {
  public readonly id = 'SyncretismSystem';
  public readonly priority = 77;
  public readonly requiredComponents = [];

  private config: SyncretismConfig;
  private syncretisms: Map<string, SyncretismData> = new Map();
  private lastCheck: number = 0;

  constructor(config: Partial<SyncretismConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SYNCRETISM_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    if (currentTick - this.lastCheck < this.config.checkInterval) {
      return;
    }

    this.lastCheck = currentTick;

    // Check for syncretism opportunities
    this.checkForSyncretism(ctx.world, currentTick);
  }

  /**
   * Check for potential syncretism between deities
   */
  private checkForSyncretism(world: World, currentTick: number): void {
    const deities = Array.from(world.entities.values())
      .filter(e => e.components.has(CT.Deity));

    // Check each pair of deities
    for (let i = 0; i < deities.length; i++) {
      for (let j = i + 1; j < deities.length; j++) {
        const deity1Entity = deities[i];
        const deity2Entity = deities[j];

        if (!deity1Entity || !deity2Entity) continue;

        const deity1 = deity1Entity.components.get(CT.Deity) as DeityComponent | undefined;
        const deity2 = deity2Entity.components.get(CT.Deity) as DeityComponent | undefined;

        if (!deity1 || !deity2) continue;

        // Check if syncretism should occur
        if (this.shouldSyncretize(world, deity1Entity.id, deity2Entity.id, deity1, deity2)) {
          this.performSyncretism(
            world,
            deity1Entity.id,
            deity2Entity.id,
            deity1,
            deity2,
            currentTick
          );
        }
      }
    }
  }

  /**
   * Determine if two deities should syncretize
   */
  private shouldSyncretize(
    world: World,
    deity1Id: string,
    deity2Id: string,
    deity1: DeityComponent,
    deity2: DeityComponent
  ): boolean {
    // Check domain overlap
    const domainOverlap = this.calculateDomainOverlap(deity1, deity2);
    if (domainOverlap < this.config.minDomainOverlap) {
      return false;
    }

    // Check shared believers
    const sharedBelievers = this.findSharedBelievers(world, deity1Id, deity2Id);
    if (sharedBelievers.length < this.config.minSharedBelievers) {
      return false;
    }

    // Random chance (5% per check if conditions met)
    return Math.random() < 0.05;
  }

  /**
   * Calculate domain overlap between two deities
   */
  private calculateDomainOverlap(deity1: DeityComponent, deity2: DeityComponent): number {
    // Check if primary domains match
    if (deity1.identity.domain === deity2.identity.domain) {
      return 1.0;
    }

    // Check if one's primary is other's secondary
    if (
      deity1.identity.domain &&
      deity2.identity.secondaryDomains.includes(deity1.identity.domain)
    ) {
      return 0.7;
    }

    if (
      deity2.identity.domain &&
      deity1.identity.secondaryDomains.includes(deity2.identity.domain)
    ) {
      return 0.7;
    }

    // Check secondary overlap
    const overlappingSecondary = deity1.identity.secondaryDomains.filter(d =>
      deity2.identity.secondaryDomains.includes(d)
    );

    if (overlappingSecondary.length > 0) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Find believers who worship both deities
   */
  private findSharedBelievers(world: World, deity1Id: string, deity2Id: string): string[] {
    const shared: string[] = [];

    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Spiritual)) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // In full implementation, agents could worship multiple gods
      // For now, just check if they've switched between these two
      if (spiritual.believedDeity === deity1Id || spiritual.believedDeity === deity2Id) {
        shared.push(entity.id);
      }
    }

    return shared;
  }

  /**
   * Perform syncretism between two deities
   */
  private performSyncretism(
    world: World,
    deity1Id: string,
    deity2Id: string,
    deity1: DeityComponent,
    deity2: DeityComponent,
    currentTick: number
  ): void {
    // Determine syncretism type
    const type = this.determineSyncretismType(deity1, deity2);

    let result: SyncretismResult;

    if (type === 'full_merger') {
      result = this.performFullMerger(world, deity1Id, deity2Id, deity1, deity2, currentTick);
    } else if (type === 'aspect_merger') {
      result = this.performAspectMerger(deity1, deity2);
    } else {
      result = this.performPantheonMerger(deity1, deity2);
    }

    // Create syncretism record
    const syncretism: SyncretismData = {
      id: `syncretism_${Date.now()}`,
      deityIds: [deity1Id, deity2Id],
      type,
      occurredAt: currentTick,
      result,
      sharedMyths: this.generateSharedMyths(deity1, deity2),
      combinedDomains: this.combineDomains(deity1, deity2),
    };

    this.syncretisms.set(syncretism.id, syncretism);

    // Emit syncretism event
    this.events.emitGeneric('syncretism_occurred', {
      syncretismId: syncretism.id,
      deity1Id,
      deity2Id,
      syncretismType: type,
      outcome: result.outcome,
      newDeityId: result.newDeityId,
    });
  }

  /**
   * Determine what type of syncretism should occur
   */
  private determineSyncretismType(deity1: DeityComponent, deity2: DeityComponent): SyncretismType {
    // If one is much more powerful, subordination
    const beliefRatio = deity1.belief.currentBelief / (deity2.belief.currentBelief + 1);

    if (beliefRatio > 5 || beliefRatio < 0.2) {
      return 'subordination';
    }

    // If very similar domains, full merger
    if (deity1.identity.domain === deity2.identity.domain) {
      return 'full_merger';
    }

    // Otherwise, aspect merger
    return 'aspect_merger';
  }

  /**
   * Perform full merger - create new deity from both
   */
  private performFullMerger(
    world: World,
    _deity1Id: string,
    _deity2Id: string,
    deity1: DeityComponent,
    deity2: DeityComponent,
    _currentTick: number
  ): SyncretismResult {
    // Create new merged deity
    const newDeityEntity = world.createEntity();

    const mergedName = this.generateMergedName(deity1, deity2);
    const newDeity = new DeityComponent(mergedName, 'ai');

    // Combine traits
    newDeity.identity.domain = deity1.identity.domain ?? deity2.identity.domain;
    newDeity.identity.secondaryDomains = [
      ...deity1.identity.secondaryDomains,
      ...deity2.identity.secondaryDomains,
    ];

    // Average personality traits
    newDeity.identity.perceivedPersonality = {
      benevolence: (deity1.identity.perceivedPersonality.benevolence + deity2.identity.perceivedPersonality.benevolence) / 2,
      interventionism: (deity1.identity.perceivedPersonality.interventionism + deity2.identity.perceivedPersonality.interventionism) / 2,
      wrathfulness: (deity1.identity.perceivedPersonality.wrathfulness + deity2.identity.perceivedPersonality.wrathfulness) / 2,
      mysteriousness: (deity1.identity.perceivedPersonality.mysteriousness + deity2.identity.perceivedPersonality.mysteriousness) / 2,
      generosity: (deity1.identity.perceivedPersonality.generosity + deity2.identity.perceivedPersonality.generosity) / 2,
      consistency: (deity1.identity.perceivedPersonality.consistency + deity2.identity.perceivedPersonality.consistency) / 2,
    };

    // Combine belief
    const combinedBelief = deity1.belief.currentBelief + deity2.belief.currentBelief;
    newDeity.belief.currentBelief = combinedBelief;

    // Transfer all believers
    for (const believerId of deity1.believers) {
      newDeity.addBeliever(believerId);
      this.updateBelieverDeity(world, believerId, newDeityEntity.id);
    }

    for (const believerId of deity2.believers) {
      if (!newDeity.believers.has(believerId)) {
        newDeity.addBeliever(believerId);
        this.updateBelieverDeity(world, believerId, newDeityEntity.id);
      }
    }

    // Add deity component to the new entity
    (newDeityEntity.components as Map<string, any>).set(CT.Deity, newDeity);

    // Deactivate old deities (in full implementation, would remove them)
    deity1.believers.clear();
    deity2.believers.clear();

    return {
      outcome: 'merged_deity',
      newDeityId: newDeityEntity.id,
      believerIntegration: 'full_sharing',
      beliefPooling: 'combined',
    };
  }

  /**
   * Perform aspect merger - gods remain separate but linked
   */
  private performAspectMerger(_deity1: DeityComponent, _deity2: DeityComponent): SyncretismResult {
    // In full implementation, would create bidirectional links
    // For now, just record the relationship

    return {
      outcome: 'dual_aspect',
      believerIntegration: 'partial_overlap',
      beliefPooling: 'shared',
    };
  }

  /**
   * Perform pantheon merger - create allied relationship
   */
  private performPantheonMerger(_deity1: DeityComponent, _deity2: DeityComponent): SyncretismResult {
    // In full implementation, would update pantheon structure

    return {
      outcome: 'allied_pantheon',
      believerIntegration: 'kept_separate',
      beliefPooling: 'separate',
    };
  }

  /**
   * Generate merged deity name
   */
  private generateMergedName(deity1: DeityComponent, deity2: DeityComponent): string {
    const name1 = deity1.identity.primaryName;
    const name2 = deity2.identity.primaryName;

    const templates = [
      `${name1}-${name2}`,
      `The Unified ${name1}`,
      `${name1} and ${name2}`,
    ];

    return templates[Math.floor(Math.random() * templates.length)] ?? `${name1}-${name2}`;
  }

  /**
   * Update a believer's deity reference
   */
  private updateBelieverDeity(world: World, believerId: string, newDeityId: string): void {
    const entity = world.getEntity(believerId);
    if (!entity) return;

    const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) return;

    spiritual.believedDeity = newDeityId;
  }

  /**
   * Generate shared myths for syncretized deities
   */
  private generateSharedMyths(deity1: DeityComponent, deity2: DeityComponent): string[] {
    return [
      `The Union of ${deity1.identity.primaryName} and ${deity2.identity.primaryName}`,
      'The Merging of Domains',
    ];
  }

  /**
   * Combine domains from both deities
   */
  private combineDomains(deity1: DeityComponent, deity2: DeityComponent): string[] {
    const domains: string[] = [];

    if (deity1.identity.domain) {
      domains.push(deity1.identity.domain as string);
    }

    if (deity2.identity.domain && !domains.includes(deity2.identity.domain)) {
      domains.push(deity2.identity.domain as string);
    }

    return domains;
  }

  /**
   * Get syncretism data
   */
  getSyncretism(syncretismId: string): SyncretismData | undefined {
    return this.syncretisms.get(syncretismId);
  }

  /**
   * Get all syncretisms involving a deity
   */
  getSyncretismsForDeity(deityId: string): SyncretismData[] {
    return Array.from(this.syncretisms.values())
      .filter(s => s.deityIds.includes(deityId));
  }
}
