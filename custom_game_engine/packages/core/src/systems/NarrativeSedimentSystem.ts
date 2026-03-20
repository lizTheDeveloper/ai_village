/**
 * NarrativeSedimentSystem - Receives NEL reading patterns and translates them
 * into mythological emphasis weights for MVEE's cultural systems.
 *
 * Part of "The Shared Retelling" (MUL-2470): NEL readers deposit "narrative
 * sediment" — aggregated reading patterns (dwell time, choices, pacing) that
 * accumulate into thematic weights. These weights shift how MVEE generates
 * myths, what belief patterns emerge, and which folklore traditions are
 * emphasized.
 *
 * The system does NOT track individual readers. It receives pre-aggregated
 * sentiment data from NEL and maintains a rolling window of thematic emphasis.
 *
 * Cross-game data flow:
 *   NEL reader patterns → aggregate sentiment → crossgame:narrative_sediment event
 *   → NarrativeSedimentSystem → thematic weights → MythGenerationSystem / BeliefGenerationSystem
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { EventBus } from '../events/EventBus.js';
import type { World } from '../ecs/World.js';
import { THROTTLE, STAGGER } from '../ecs/SystemThrottleConfig.js';

// --- Narrative Sediment Types ---

/**
 * Thematic dimensions that NEL reading patterns map to.
 * Each dimension is a spectrum (0.0 to 1.0) representing the aggregate
 * emotional signature of all readers who have passed through the story.
 */
export interface NarrativeTheme {
  /** Defiance vs. acceptance — did readers challenge or submit? */
  defiance: number;
  /** Gentleness vs. severity — did readers comfort or push? */
  gentleness: number;
  /** Curiosity vs. certainty — did readers question or affirm? */
  curiosity: number;
  /** Trust vs. suspicion — did readers trust characters or doubt them? */
  trust: number;
  /** Wonder vs. pragmatism — did readers linger on beauty or rush forward? */
  wonder: number;
  /** Grief vs. resilience — did readers dwell on loss or move past it? */
  grief: number;
}

/** All theme dimension keys */
export type ThemeDimension = keyof NarrativeTheme;

const THEME_DIMENSIONS: readonly ThemeDimension[] = [
  'defiance', 'gentleness', 'curiosity', 'trust', 'wonder', 'grief',
] as const;

/**
 * A single sediment deposit from NEL — pre-aggregated reading patterns
 * from a batch of anonymous reader sessions.
 */
export interface SedimentDeposit {
  /** Which NEL retelling this sediment comes from (1-6) */
  retellingNumber: number;
  /** Number of anonymous sessions aggregated into this deposit */
  sessionCount: number;
  /** Thematic weights derived from reading patterns */
  themes: NarrativeTheme;
  /** Timestamp of the deposit (absolute multiverse time) */
  timestamp: number;
}

/**
 * Mapping from narrative themes to myth generation categories.
 * High values in a theme dimension boost the probability of certain
 * myth categories being generated.
 */
interface ThemeMythMapping {
  dimension: ThemeDimension;
  /** Myth categories boosted when this dimension is high (> 0.6) */
  highBoosts: string[];
  /** Myth categories boosted when this dimension is low (< 0.4) */
  lowBoosts: string[];
}

const THEME_MYTH_MAPPINGS: readonly ThemeMythMapping[] = [
  {
    dimension: 'defiance',
    highBoosts: ['heroic_deed', 'political', 'disaster'],
    lowBoosts: ['moral', 'parable', 'origin'],
  },
  {
    dimension: 'gentleness',
    highBoosts: ['miracle', 'moral', 'parable'],
    lowBoosts: ['heroic_deed', 'disaster', 'cosmic_event'],
  },
  {
    dimension: 'curiosity',
    highBoosts: ['prophecy', 'cosmic_event', 'origin'],
    lowBoosts: ['moral', 'political'],
  },
  {
    dimension: 'trust',
    highBoosts: ['miracle', 'origin', 'moral'],
    lowBoosts: ['prophecy', 'political', 'disaster'],
  },
  {
    dimension: 'wonder',
    highBoosts: ['cosmic_event', 'origin', 'miracle'],
    lowBoosts: ['political', 'heroic_deed'],
  },
  {
    dimension: 'grief',
    highBoosts: ['disaster', 'prophecy', 'parable'],
    lowBoosts: ['heroic_deed', 'miracle', 'origin'],
  },
] as const;

/** Maximum number of sediment deposits to retain in the rolling window */
const MAX_DEPOSITS = 100;

/** Decay factor per system tick — older deposits contribute less */
const DEPOSIT_DECAY_RATE = 0.9995;

/** Minimum weight a deposit can have before being pruned */
const MIN_DEPOSIT_WEIGHT = 0.01;

// --- System ---

export class NarrativeSedimentSystem extends BaseSystem {
  public readonly id: SystemId = 'narrative_sediment';
  public readonly priority: number = 110; // Before MythGeneration (118) and BeliefGeneration (115)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = THROTTLE.VERY_SLOW; // Every 10 seconds
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_B + 10; // Stagger within slow group

  /** Rolling window of sediment deposits with time-decayed weights */
  private deposits: Array<{ deposit: SedimentDeposit; weight: number }> = [];

  /** Current aggregated thematic weights (recomputed each tick) */
  private currentThemes: NarrativeTheme = this.neutralThemes();

  /** Current myth category boosts derived from themes */
  private mythCategoryBoosts = new Map<string, number>();

  /** Total sessions that have contributed to the sediment */
  private totalSessionCount = 0;

  /** Pending deposits received since last update */
  private pendingDeposits: SedimentDeposit[] = [];

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Listen for cross-game sediment deposits from NEL
    this.events.onGeneric('crossgame:narrative_sediment', (data) => {
      this.onSedimentReceived(data as unknown as SedimentDeposit);
    });
  }

  private onSedimentReceived(deposit: SedimentDeposit): void {
    // Validate deposit
    if (!deposit.themes || deposit.sessionCount <= 0) return;
    if (deposit.retellingNumber < 1 || deposit.retellingNumber > 6) return;

    this.pendingDeposits.push(deposit);
  }

  protected onUpdate(_ctx: SystemContext): void {
    let changed = false;

    // Ingest pending deposits
    if (this.pendingDeposits.length > 0) {
      for (const deposit of this.pendingDeposits) {
        this.deposits.push({ deposit, weight: 1.0 });
        this.totalSessionCount += deposit.sessionCount;
        changed = true;
      }
      this.pendingDeposits.length = 0;
    }

    // Apply time decay to all deposits
    for (let i = this.deposits.length - 1; i >= 0; i--) {
      const entry = this.deposits[i];
      if (!entry) continue;
      entry.weight *= DEPOSIT_DECAY_RATE;
      if (entry.weight < MIN_DEPOSIT_WEIGHT) {
        this.deposits.splice(i, 1);
        changed = true;
      }
    }

    // Prune to max window size (keep most recent/heaviest)
    if (this.deposits.length > MAX_DEPOSITS) {
      this.deposits.sort((a, b) => b.weight - a.weight);
      this.deposits.length = MAX_DEPOSITS;
      changed = true;
    }

    // Recompute aggregated themes
    if (changed || this.deposits.length > 0) {
      this.recomputeThemes();
      this.recomputeMythBoosts();
    }

    // Emit lore event when new deposits arrive
    if (changed && this.deposits.length > 0) {
      this.events.emitGeneric('lore:narrative_sediment_received', {
        sourceGame: 'nel',
        targetGame: 'mvee',
        themes: { ...this.currentThemes },
        depositCount: this.deposits.length,
        totalSessionCount: this.totalSessionCount,
        mythCategoryBoosts: Object.fromEntries(this.mythCategoryBoosts),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Recompute aggregated themes as a weighted average of all deposits.
   * Later retellings carry more weight (the story deepens with each retelling).
   */
  private recomputeThemes(): void {
    if (this.deposits.length === 0) {
      this.currentThemes = this.neutralThemes();
      return;
    }

    const totals = this.neutralThemes();
    let totalWeight = 0;

    for (const { deposit, weight } of this.deposits) {
      // Later retellings have more narrative authority
      const retellingMultiplier = 1.0 + (deposit.retellingNumber - 1) * 0.2;
      // Weight by session count — more readers = stronger signal
      const sessionMultiplier = Math.log2(1 + deposit.sessionCount);
      const effectiveWeight = weight * retellingMultiplier * sessionMultiplier;

      for (const dim of THEME_DIMENSIONS) {
        totals[dim] += deposit.themes[dim] * effectiveWeight;
      }
      totalWeight += effectiveWeight;
    }

    if (totalWeight > 0) {
      for (const dim of THEME_DIMENSIONS) {
        this.currentThemes[dim] = Math.max(0, Math.min(1, totals[dim] / totalWeight));
      }
    }
  }

  /**
   * Translate current thematic weights into myth category probability boosts.
   * These boosts are additive multipliers: 1.0 = no change, >1.0 = more likely.
   */
  private recomputeMythBoosts(): void {
    this.mythCategoryBoosts.clear();

    for (const mapping of THEME_MYTH_MAPPINGS) {
      const value = this.currentThemes[mapping.dimension];

      if (value > 0.6) {
        const boost = 1.0 + (value - 0.6) * 2.5; // Up to 2.0x at value=1.0
        for (const category of mapping.highBoosts) {
          const current = this.mythCategoryBoosts.get(category) ?? 1.0;
          this.mythCategoryBoosts.set(category, current * boost);
        }
      } else if (value < 0.4) {
        const boost = 1.0 + (0.4 - value) * 2.5; // Up to 2.0x at value=0.0
        for (const category of mapping.lowBoosts) {
          const current = this.mythCategoryBoosts.get(category) ?? 1.0;
          this.mythCategoryBoosts.set(category, current * boost);
        }
      }
    }
  }

  private neutralThemes(): NarrativeTheme {
    return { defiance: 0.5, gentleness: 0.5, curiosity: 0.5, trust: 0.5, wonder: 0.5, grief: 0.5 };
  }

  // --- Public API ---

  /** Get current aggregated thematic weights from NEL reader sediment */
  getThemes(): Readonly<NarrativeTheme> {
    return this.currentThemes;
  }

  /** Get myth category probability boosts derived from narrative sediment */
  getMythCategoryBoosts(): ReadonlyMap<string, number> {
    return this.mythCategoryBoosts;
  }

  /**
   * Get the boost multiplier for a specific myth category.
   * Returns 1.0 if no sediment data affects this category.
   */
  getMythCategoryBoost(category: string): number {
    return this.mythCategoryBoosts.get(category) ?? 1.0;
  }

  /** Get the total number of anonymous reader sessions that have deposited sediment */
  getTotalSessionCount(): number {
    return this.totalSessionCount;
  }

  /** Get the number of active sediment deposits in the rolling window */
  getActiveDepositCount(): number {
    return this.deposits.length;
  }

  /** Whether any narrative sediment has been received from NEL */
  hasSediment(): boolean {
    return this.deposits.length > 0;
  }

  /**
   * Get a narrative description of the current "weathering" — the emotional
   * texture that NEL readers have collectively imprinted on the mythology.
   * Used by MythGenerationSystem to flavor LLM prompts.
   */
  getWeatheringDescription(): string {
    if (!this.hasSediment()) return '';

    const parts: string[] = [];
    const t = this.currentThemes;

    if (t.defiance > 0.65) parts.push('the stories crackle with defiance');
    else if (t.defiance < 0.35) parts.push('the stories speak of acceptance and surrender');

    if (t.gentleness > 0.65) parts.push('tenderness suffuses the telling');
    else if (t.gentleness < 0.35) parts.push('the myths carry a harsh, unyielding tone');

    if (t.curiosity > 0.65) parts.push('questions outnumber answers in the old tales');
    else if (t.curiosity < 0.35) parts.push('the myths speak with certainty and conviction');

    if (t.trust > 0.65) parts.push('faith runs deep in the mythic tradition');
    else if (t.trust < 0.35) parts.push('suspicion threads through every legend');

    if (t.wonder > 0.65) parts.push('awe saturates the sacred narratives');
    else if (t.wonder < 0.35) parts.push('the myths are practical, grounded in the earth');

    if (t.grief > 0.65) parts.push('loss echoes through every retelling');
    else if (t.grief < 0.35) parts.push('resilience is the heart of the mythic cycle');

    if (parts.length === 0) return 'the mythological substrate is balanced, shaped by many voices';
    return parts.join('; ');
  }
}
