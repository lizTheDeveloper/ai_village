/**
 * ReligiousCompetitionSystem - Phase 8: Advanced Theology
 *
 * Handles ongoing religious competition between deities.
 * Competition manifests as:
 * - Believer acquisition races
 * - Temple building competitions
 * - Miracle displays to impress mortals
 * - Propaganda campaigns
 * - Economic competition for resources
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// ============================================================================
// Competition Types
// ============================================================================

export interface CompetitionData {
  id: string;

  /** Competing deities */
  competitors: [string, string];

  /** Type of competition */
  type: CompetitionType;

  /** Current scores */
  scores: {
    [deityId: string]: number;
  };

  /** Competition start time */
  startedAt: number;

  /** Competition duration (ticks, 0 = ongoing) */
  duration: number;

  /** Competition status */
  status: 'active' | 'completed' | 'abandoned';

  /** Winner (if completed) */
  winnerId?: string;

  /** Prize/stakes */
  stakes?: string;
}

export type CompetitionType =
  | 'believer_count'       // Who gets more believers
  | 'belief_generation'    // Who generates more belief
  | 'temple_building'      // Who builds more temples
  | 'miracle_display'      // Who performs more/better miracles
  | 'domain_supremacy';    // Who dominates a shared domain

// ============================================================================
// Competition Configuration
// ============================================================================

export interface CompetitionConfig {
  /** How often to update competitions (ticks) */
  updateInterval: number;

  /** How often to check for new competitions (ticks) */
  checkInterval: number;

  /** Minimum domain overlap to trigger competition */
  minDomainOverlap: number;
}

export const DEFAULT_COMPETITION_CONFIG: CompetitionConfig = {
  updateInterval: 600, // ~30 seconds at 20 TPS
  checkInterval: 4800, // ~4 minutes at 20 TPS
  minDomainOverlap: 0.5,
};

// ============================================================================
// ReligiousCompetitionSystem
// ============================================================================

export class ReligiousCompetitionSystem extends BaseSystem {
  public readonly id = 'ReligiousCompetitionSystem';
  public readonly priority = 78;
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds at 20 TPS

  private config: CompetitionConfig;
  private competitions: Map<string, CompetitionData> = new Map();
  private lastCheckForNewCompetitions: number = 0;

  // Performance optimization: deity entity cache
  private deityCache = new Map<string, DeityComponent>();
  private lastCacheUpdate = 0;
  private readonly CACHE_REFRESH_INTERVAL = 100; // Refresh deity cache every 5 seconds

  // Performance optimization: precomputed constants
  private readonly MIN_BELIEVERS_TO_COMPETE = 5;
  private readonly COMPETITION_CHANCE = 0.1;
  private readonly MIN_COMPETITION_DURATION = 6000; // ~5 minutes
  private readonly SCORE_LEAD_THRESHOLD = 2.0; // Need 2x score to win

  constructor(config: Partial<CompetitionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_COMPETITION_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Early exit: no active competitions and not time to check for new ones
    if (
      this.competitions.size === 0 &&
      currentTick - this.lastCheckForNewCompetitions < this.config.checkInterval
    ) {
      return;
    }

    // Refresh deity cache periodically
    if (currentTick - this.lastCacheUpdate >= this.CACHE_REFRESH_INTERVAL) {
      this.rebuildDeityCache(ctx.world);
      this.lastCacheUpdate = currentTick;
    }

    // Early exit: no deities exist
    if (this.deityCache.size === 0) {
      return;
    }

    // Update existing competitions every throttle interval (100 ticks)
    if (this.competitions.size > 0) {
      this.updateCompetitions(ctx.world, currentTick);
    }

    // Check for new competitions less frequently (every 4800 ticks)
    if (currentTick - this.lastCheckForNewCompetitions >= this.config.checkInterval) {
      this.lastCheckForNewCompetitions = currentTick;
      this.checkForNewCompetitions(ctx.world, currentTick);
    }
  }

  /**
   * Rebuild deity cache from world entities
   */
  private rebuildDeityCache(world: World): void {
    this.deityCache.clear();

    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Deity)) continue;

      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deity) {
        this.deityCache.set(entity.id, deity);
      }
    }
  }

  /**
   * Check for new competition opportunities
   */
  private checkForNewCompetitions(world: World, currentTick: number): void {
    // Use cached deity list
    const deityIds = Array.from(this.deityCache.keys());

    // Early exit: need at least 2 deities
    if (deityIds.length < 2) {
      return;
    }

    // Check each pair of deities
    for (let i = 0; i < deityIds.length; i++) {
      for (let j = i + 1; j < deityIds.length; j++) {
        const deity1Id = deityIds[i];
        const deity2Id = deityIds[j];

        if (!deity1Id || !deity2Id) continue;

        const deity1 = this.deityCache.get(deity1Id);
        const deity2 = this.deityCache.get(deity2Id);

        if (!deity1 || !deity2) continue;

        // Check if they're already competing (inline for performance)
        let alreadyCompeting = false;
        for (const competition of this.competitions.values()) {
          if (
            competition.status === 'active' &&
            ((competition.competitors[0] === deity1Id && competition.competitors[1] === deity2Id) ||
             (competition.competitors[0] === deity2Id && competition.competitors[1] === deity1Id))
          ) {
            alreadyCompeting = true;
            break;
          }
        }

        if (alreadyCompeting) continue;

        // Check if they should compete (optimized inline)
        if (this.shouldCompeteOptimized(deity1, deity2)) {
          this.startCompetition(deity1Id, deity2Id, deity1, deity2, currentTick);
        }
      }
    }
  }

  /**
   * Determine if two deities should compete
   */
  private shouldCompete(deity1: DeityComponent, deity2: DeityComponent): boolean {
    // Check domain overlap
    const overlap = this.calculateDomainOverlap(deity1, deity2);
    if (overlap < this.config.minDomainOverlap) {
      return false;
    }

    // Both need minimum believers to compete
    if (deity1.believers.size < 5 || deity2.believers.size < 5) {
      return false;
    }

    // Random chance
    return Math.random() < 0.1; // 10% chance per check
  }

  /**
   * Calculate domain overlap
   */
  private calculateDomainOverlap(deity1: DeityComponent, deity2: DeityComponent): number {
    if (deity1.identity.domain === deity2.identity.domain) {
      return 1.0;
    }

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

    return 0;
  }

  /**
   * Start a new competition
   */
  private startCompetition(
    deity1Id: string,
    deity2Id: string,
    deity1: DeityComponent,
    deity2: DeityComponent,
    currentTick: number
  ): void {
    // Determine competition type
    const type = this.selectCompetitionType();

    // Calculate initial scores
    const scores: { [deityId: string]: number } = {
      [deity1Id]: this.calculateScore(deity1, type),
      [deity2Id]: this.calculateScore(deity2, type),
    };

    const competition: CompetitionData = {
      id: `competition_${Date.now()}`,
      competitors: [deity1Id, deity2Id],
      type,
      scores,
      startedAt: currentTick,
      duration: 0, // Ongoing
      status: 'active',
    };

    this.competitions.set(competition.id, competition);

    // Emit competition started event
    this.events.emitGeneric('competition_started', {
      competitionId: competition.id,
      deity1Id,
      deity2Id,
      competitionType: type,
      scores,
    });
  }

  /**
   * Select competition type
   */
  private selectCompetitionType(): CompetitionType {
    const types: CompetitionType[] = [
      'believer_count',
      'belief_generation',
      'miracle_display',
      'domain_supremacy',
    ];

    return types[Math.floor(Math.random() * types.length)] ?? 'believer_count';
  }

  /**
   * Calculate score for a deity in a competition
   */
  private calculateScore(deity: DeityComponent, type: CompetitionType): number {
    switch (type) {
      case 'believer_count':
        return deity.believers.size;

      case 'belief_generation':
        return deity.belief.beliefPerTick;

      case 'temple_building':
        return deity.sacredSites.size;

      case 'miracle_display':
        // In full implementation, would track miracles performed
        return 0;

      case 'domain_supremacy':
        // In full implementation, would calculate domain influence
        return deity.belief.currentBelief;
    }
  }

  /**
   * Update all active competitions
   */
  private updateCompetitions(world: World, currentTick: number): void {
    for (const competition of this.competitions.values()) {
      if (competition.status !== 'active') continue;

      // Update scores
      const deity1 = world.getEntity(competition.competitors[0])?.components.get(CT.Deity) as DeityComponent | undefined;
      const deity2 = world.getEntity(competition.competitors[1])?.components.get(CT.Deity) as DeityComponent | undefined;

      if (!deity1 || !deity2) {
        competition.status = 'abandoned';
        continue;
      }

      competition.scores[competition.competitors[0]] = this.calculateScore(deity1, competition.type);
      competition.scores[competition.competitors[1]] = this.calculateScore(deity2, competition.type);

      // Check for winner (if significant lead)
      this.checkForWinner(competition, currentTick);
    }
  }

  /**
   * Check if competition has a clear winner
   */
  private checkForWinner(competition: CompetitionData, currentTick: number): void {
    const [deity1Id, deity2Id] = competition.competitors;
    const score1 = competition.scores[deity1Id] ?? 0;
    const score2 = competition.scores[deity2Id] ?? 0;

    // Need significant lead (2x score) and minimum duration (5 minutes)
    const duration = currentTick - competition.startedAt;
    const minDuration = 6000; // ~5 minutes

    if (duration < minDuration) return;

    if (score1 > score2 * 2) {
      competition.status = 'completed';
      competition.winnerId = deity1Id;
      // Emit competition won event
      this.events.emitGeneric('competition_won', {
        competitionId: competition.id,
        winnerId: deity1Id,
        loserId: deity2Id,
        competitionType: competition.type,
        finalScores: competition.scores,
      });
    } else if (score2 > score1 * 2) {
      competition.status = 'completed';
      competition.winnerId = deity2Id;
      // Emit competition won event
      this.events.emitGeneric('competition_won', {
        competitionId: competition.id,
        winnerId: deity2Id,
        loserId: deity1Id,
        competitionType: competition.type,
        finalScores: competition.scores,
      });
    }
  }

  /**
   * Find competition between two deities
   */
  private findCompetitionBetween(deity1Id: string, deity2Id: string): CompetitionData | undefined {
    return Array.from(this.competitions.values()).find(
      c =>
        c.status === 'active' &&
        ((c.competitors[0] === deity1Id && c.competitors[1] === deity2Id) ||
          (c.competitors[0] === deity2Id && c.competitors[1] === deity1Id))
    );
  }

  /**
   * Get competition data
   */
  getCompetition(competitionId: string): CompetitionData | undefined {
    return this.competitions.get(competitionId);
  }

  /**
   * Get all competitions involving a deity
   */
  getCompetitionsForDeity(deityId: string): CompetitionData[] {
    return Array.from(this.competitions.values())
      .filter(c => c.competitors.includes(deityId));
  }

  /**
   * Get active competitions
   */
  getActiveCompetitions(): CompetitionData[] {
    return Array.from(this.competitions.values())
      .filter(c => c.status === 'active');
  }
}
