/**
 * HolyTextSystem - Phase 5: Religious Institutions
 *
 * Generates holy texts that canonize myths and shape deity identity.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// ============================================================================
// Holy Text Types
// ============================================================================

export interface HolyTextData {
  id: string;
  title: string;
  deityId: string;
  authorAgentId: string;
  content: string;
  writtenAt: number;
  canonicity: number; // 0-1, how accepted is this text
  mythsReferenced: string[];
  teachingsContained: string[];
}

// ============================================================================
// Holy Text Configuration
// ============================================================================

export interface HolyTextConfig {
  /** How often to check for new texts (ticks) */
  checkInterval: number;

  /** Minimum priest rank to write texts */
  minRankForWriting: 'novice' | 'acolyte' | 'priest';
}

export const DEFAULT_HOLY_TEXT_CONFIG: HolyTextConfig = {
  checkInterval: 4800, // ~4 minutes at 20 TPS
  minRankForWriting: 'priest',
};

// ============================================================================
// HolyTextSystem
// ============================================================================

export class HolyTextSystem extends BaseSystem {
  public readonly id = 'HolyTextSystem';
  public readonly priority = 82;
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds at 20 TPS

  private config: HolyTextConfig;
  private holyTexts: Map<string, HolyTextData> = new Map();

  // Performance optimization: deity entity cache
  private deityCache = new Map<string, DeityComponent>();
  private lastCacheUpdate = 0;
  private readonly CACHE_REFRESH_INTERVAL = 100; // Refresh deity cache every 5 seconds

  // Performance optimization: track deities with texts (avoid repeated filtering)
  private deitiesWithTexts = new Set<string>();

  // Performance optimization: precomputed constants
  private readonly MIN_BELIEVERS_FOR_TEXT = 5;

  // Performance optimization: reusable working arrays
  private readonly workingTeachings: string[] = [];

  constructor(config: Partial<HolyTextConfig> = {}) {
    super();
    this.config = { ...DEFAULT_HOLY_TEXT_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Refresh deity cache periodically
    if (currentTick - this.lastCacheUpdate >= this.CACHE_REFRESH_INTERVAL) {
      this.rebuildDeityCache(ctx.world);
      this.lastCacheUpdate = currentTick;
    }

    // Early exit: no deities exist
    if (this.deityCache.size === 0) {
      return;
    }

    // Check if any deity needs canonical texts
    this.checkForTextGeneration(ctx.world, currentTick);
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
   * Check if deities need holy texts (optimized)
   */
  private checkForTextGeneration(world: World, currentTick: number): void {
    // Use cached deity list
    for (const [deityId, deity] of this.deityCache) {
      // Early exit: already has text
      if (this.deitiesWithTexts.has(deityId)) continue;

      // Early exit: not enough believers
      if (deity.believers.size < this.MIN_BELIEVERS_FOR_TEXT) continue;

      // Generate founding text
      this.generateFoundingTextOptimized(deityId, deity, currentTick);

      // Mark as having text (avoid repeated checks)
      this.deitiesWithTexts.add(deityId);
    }
  }

  /**
   * Generate a founding holy text for a deity (optimized)
   */
  private generateFoundingTextOptimized(
    deityId: string,
    deity: DeityComponent,
    currentTick: number
  ): void {
    // Get first believer (zero allocation approach)
    let firstBeliever = 'unknown';
    if (deity.believers && typeof deity.believers[Symbol.iterator] === 'function') {
      for (const believerId of deity.believers) {
        firstBeliever = believerId;
        break;
      }
    }

    // Generate teachings inline (reuse working array)
    this.workingTeachings.length = 0;
    const domain = deity.identity.domain ?? 'mystery';
    const name = deity.identity.primaryName;

    this.workingTeachings.push(`Honor ${name}`);
    this.workingTeachings.push(`Respect the ways of ${domain}`);
    this.workingTeachings.push('Maintain faith in times of trial');
    this.workingTeachings.push('Share blessings with fellow believers');

    // Generate content inline
    const templateIndex = Math.floor(Math.random() * 3);
    let content: string;
    if (templateIndex === 0) {
      content = `In the beginning, ${name} watched over the ${domain}. Through faith, we are blessed.`;
    } else if (templateIndex === 1) {
      content = `${name} is the guardian of ${domain}, protector of the faithful.`;
    } else {
      content = `Let it be known that ${name} guides those who walk the path of ${domain}.`;
    }

    // Create text (single allocation)
    const text: HolyTextData = {
      id: `text_${deityId}_${Date.now()}`,
      title: `The Book of ${name}`,
      deityId,
      authorAgentId: firstBeliever,
      content,
      writtenAt: currentTick,
      canonicity: 0.8,
      mythsReferenced: [],
      teachingsContained: [...this.workingTeachings], // Copy working array
    };

    this.holyTexts.set(text.id, text);
  }

  /**
   * Generate a founding holy text for a deity (deprecated - use generateFoundingTextOptimized)
   */
  private generateFoundingText(
    deityId: string,
    deity: DeityComponent,
    currentTick: number
  ): void {
    this.generateFoundingTextOptimized(deityId, deity, currentTick);
  }

  /**
   * Generate founding text content (deprecated - inlined into generateFoundingTextOptimized)
   */
  private generateFoundingContent(deity: DeityComponent): string {
    const domain = deity.identity.domain ?? 'mystery';
    const name = deity.identity.primaryName;

    const templates = [
      `In the beginning, ${name} watched over the ${domain}. Through faith, we are blessed.`,
      `${name} is the guardian of ${domain}, protector of the faithful.`,
      `Let it be known that ${name} guides those who walk the path of ${domain}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)] || `In the name of ${name}, let all be known.`;
  }

  /**
   * Generate core teachings (deprecated - inlined into generateFoundingTextOptimized)
   */
  private generateTeachings(deity: DeityComponent): string[] {
    const domain = deity.identity.domain ?? 'mystery';

    return [
      `Honor ${deity.identity.primaryName}`,
      `Respect the ways of ${domain}`,
      'Maintain faith in times of trial',
      'Share blessings with fellow believers',
    ];
  }

  /**
   * Get holy text
   */
  getHolyText(textId: string): HolyTextData | undefined {
    return this.holyTexts.get(textId);
  }

  /**
   * Get all texts for a deity
   */
  getTextsForDeity(deityId: string): HolyTextData[] {
    return Array.from(this.holyTexts.values())
      .filter(t => t.deityId === deityId);
  }
}
