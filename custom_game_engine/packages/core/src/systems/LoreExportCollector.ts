/**
 * LoreExportCollector - Aggregates cross-game lore events into portable wiki entries.
 *
 * Listens to all lore:* events emitted by folklore systems (MythGenerationSystem,
 * SchismSystem, SyncretismSystem, HolyTextSystem, BeliefGenerationSystem, RitualSystem)
 * and assembles them into structured, queryable entries for the Living Folklore Wiki
 * (Layer 5 of the Leaky Game ARG).
 *
 * Each wiki entry is a self-contained lore record that can be consumed by external
 * systems without knowledge of MVEE internals.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { EventBus } from '../events/EventBus.js';
import type { World } from '../ecs/World.js';
import { STAGGER } from '../ecs/SystemThrottleConfig.js';

// --- Portable Wiki Entry Types ---

export interface WikiLoreEntry {
  id: string;
  sourceGame: string;
  category: WikiLoreCategory;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  canonicityScore: number;
  createdAtTick: number;
  updatedAtTick: number;
  relatedEntries: string[];
}

export type WikiLoreCategory =
  | 'myth'
  | 'schism'
  | 'syncretism'
  | 'holy_text'
  | 'belief'
  | 'ritual'
  | 'narrative_sediment';

export interface LoreExportSnapshot {
  timestamp: number;
  entryCount: number;
  entries: WikiLoreEntry[];
  categoryCounts: Record<WikiLoreCategory, number>;
}

// --- System ---

export class LoreExportCollector extends BaseSystem {
  public readonly id: SystemId = 'lore_export_collector';
  public readonly priority: number = 998; // Run late, after all lore-producing systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = 200; // Every 10 seconds at 20 TPS
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_B;

  private entries = new Map<string, WikiLoreEntry>();
  private pendingEvents: Array<{ type: string; data: Record<string, unknown> }> = [];
  private nextEntryIndex = 0;

  // Retention policy
  private static readonly MAX_AGE_TICKS = 72000; // 1 hour at 20 TPS
  private static readonly MAX_PER_CATEGORY = 100;
  private static readonly PRUNE_INTERVAL = 1200; // Prune every 60 seconds at 20 TPS
  private lastPruneTick = 0;

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Subscribe to all lore export events
    this.events.onGeneric('lore:myth_created', (data) => this.queueEvent('myth_created', data));
    this.events.onGeneric('lore:myth_canonized', (data) => this.queueEvent('myth_canonized', data));
    this.events.onGeneric('lore:schism_occurred', (data) => this.queueEvent('schism_occurred', data));
    this.events.onGeneric('lore:syncretism_occurred', (data) => this.queueEvent('syncretism_occurred', data));
    this.events.onGeneric('lore:holy_text_written', (data) => this.queueEvent('holy_text_written', data));
    this.events.onGeneric('lore:belief_emerged', (data) => this.queueEvent('belief_emerged', data));
    this.events.onGeneric('lore:ritual_performed', (data) => this.queueEvent('ritual_performed', data));
    this.events.onGeneric('lore:narrative_sediment_received', (data) => this.queueEvent('narrative_sediment_received', data));
  }

  private queueEvent(type: string, data: unknown): void {
    this.pendingEvents.push({ type, data: data as Record<string, unknown> });
  }

  protected onUpdate(ctx: SystemContext): void {
    if (this.pendingEvents.length > 0) {
      for (const event of this.pendingEvents) {
        this.processLoreEvent(event.type, event.data);
      }
      this.pendingEvents.length = 0;
    }

    // Periodic retention pruning
    if (ctx.tick - this.lastPruneTick >= LoreExportCollector.PRUNE_INTERVAL) {
      this.lastPruneTick = ctx.tick;
      this._pruneEntries(ctx.tick);
    }
  }

  private processLoreEvent(type: string, data: Record<string, unknown>): void {
    switch (type) {
      case 'myth_created':
        this.upsertEntry({
          id: `myth-${data.mythId}`,
          sourceGame: data.sourceGame as string,
          category: 'myth',
          title: data.title as string,
          summary: data.summary as string,
          details: {
            fullText: data.fullText,
            mythCategory: data.category,
            deityName: data.deityName,
            deityDomains: data.deityDomains,
            deityPersonality: data.deityPersonality,
            believerCount: data.believerCount,
            tellingCount: data.tellingCount,
            status: data.status,
          },
          canonicityScore: (data.canonicityScore as number) ?? 0,
          createdAtTick: data.timestamp as number,
          updatedAtTick: data.timestamp as number,
          relatedEntries: [],
        });
        break;

      case 'myth_canonized': {
        const mythId = `myth-${data.mythId}`;
        const existing = this.entries.get(mythId);
        if (existing) {
          existing.canonicityScore = (data.canonicityScore as number) ?? existing.canonicityScore;
          existing.updatedAtTick = data.timestamp as number;
          existing.details.heroName = data.heroName;
          existing.details.achievement = data.achievement;
          existing.details.difficulty = data.difficulty;
          existing.details.witnessCount = data.witnessCount;
        } else {
          this.upsertEntry({
            id: mythId,
            sourceGame: data.sourceGame as string,
            category: 'myth',
            title: `Legend of ${data.heroName}`,
            summary: `${data.heroName} achieved ${data.achievement} (${data.difficulty})`,
            details: {
              heroName: data.heroName,
              achievement: data.achievement,
              difficulty: data.difficulty,
              witnessCount: data.witnessCount,
            },
            canonicityScore: (data.canonicityScore as number) ?? 0.5,
            createdAtTick: data.timestamp as number,
            updatedAtTick: data.timestamp as number,
            relatedEntries: [],
          });
        }
        break;
      }

      case 'schism_occurred':
        this.upsertEntry({
          id: `schism-${data.schismId}`,
          sourceGame: data.sourceGame as string,
          category: 'schism',
          title: `Schism: ${data.originalDeityName} → ${data.newDeityName}`,
          summary: `${data.cause} split ${data.originalDeityName}'s followers. ${(data.believersSplit as Record<string, number>)?.joined ?? '?'} joined ${data.newDeityName}.`,
          details: {
            originalDeityName: data.originalDeityName,
            originalDeityDomain: data.originalDeityDomain,
            newDeityName: data.newDeityName,
            cause: data.cause,
            theologicalDifferences: data.theologicalDifferences,
            relationship: data.relationship,
            believersSplit: data.believersSplit,
          },
          canonicityScore: 0.7,
          createdAtTick: data.timestamp as number ?? this.nextEntryIndex,
          updatedAtTick: data.timestamp as number ?? this.nextEntryIndex,
          relatedEntries: [],
        });
        break;

      case 'syncretism_occurred':
        this.upsertEntry({
          id: `syncretism-${data.syncretismId}`,
          sourceGame: data.sourceGame as string,
          category: 'syncretism',
          title: `Syncretism: ${data.deity1Name} + ${data.deity2Name}`,
          summary: `${data.deity1Name} and ${data.deity2Name} merged traditions.`,
          details: {
            deity1Name: data.deity1Name,
            deity2Name: data.deity2Name,
            mergedDeityName: data.mergedDeityName,
            sharedDomains: data.sharedDomains,
            mergedBelieverCount: data.mergedBelieverCount,
          },
          canonicityScore: 0.6,
          createdAtTick: data.timestamp as number ?? this.nextEntryIndex,
          updatedAtTick: data.timestamp as number ?? this.nextEntryIndex,
          relatedEntries: [],
        });
        break;

      case 'holy_text_written':
        this.upsertEntry({
          id: `text-${data.textId}`,
          sourceGame: data.sourceGame as string,
          category: 'holy_text',
          title: data.title as string,
          summary: `Sacred text of ${data.deityName} (${data.deityDomain}): ${data.teachingsSummary}`,
          details: {
            deityName: data.deityName,
            deityDomain: data.deityDomain,
            teachingsSummary: data.teachingsSummary,
            believerCount: data.believerCount,
          },
          canonicityScore: (data.canonicity as number) ?? 0.8,
          createdAtTick: data.timestamp as number ?? this.nextEntryIndex,
          updatedAtTick: data.timestamp as number ?? this.nextEntryIndex,
          relatedEntries: [],
        });
        break;

      case 'belief_emerged': {
        const beliefId = `belief-${data.deityId}`;
        const existing = this.entries.get(beliefId);
        if (existing) {
          // Update existing belief entry with latest data
          existing.updatedAtTick = data.timestamp as number;
          existing.details.beliefAmount = data.beliefAmount;
          existing.details.believerCount = data.believerCount;
          existing.details.currentBeliefTotal = data.currentBeliefTotal;
          existing.details.peakBeliefRate = data.peakBeliefRate;
          // Canonicity rises with believer count
          const believers = data.believerCount as number;
          existing.canonicityScore = Math.min(1.0, 0.1 + believers * 0.05);
        } else {
          const believers = data.believerCount as number;
          this.upsertEntry({
            id: beliefId,
            sourceGame: data.sourceGame as string,
            category: 'belief',
            title: `Faith of ${data.deityName}`,
            summary: `${data.deityName} (${data.domain ?? 'unknown domain'}) has ${believers} believer${believers !== 1 ? 's' : ''}.`,
            details: {
              deityName: data.deityName,
              epithets: data.epithets,
              domain: data.domain,
              beliefAmount: data.beliefAmount,
              believerCount: data.believerCount,
              currentBeliefTotal: data.currentBeliefTotal,
              peakBeliefRate: data.peakBeliefRate,
            },
            canonicityScore: Math.min(1.0, 0.1 + believers * 0.05),
            createdAtTick: data.timestamp as number,
            updatedAtTick: data.timestamp as number,
            relatedEntries: [],
          });
        }
        break;
      }

      case 'ritual_performed':
        this.upsertEntry({
          id: `ritual-${data.ritualId}`,
          sourceGame: data.sourceGame as string,
          category: 'ritual',
          title: data.name as string,
          summary: `${data.type} ritual for deity ${data.deityId}, generating ${data.beliefGenerated} belief.`,
          details: {
            deityId: data.deityId,
            type: data.type,
            beliefGenerated: data.beliefGenerated,
            requiredParticipants: data.requiredParticipants,
            duration: data.duration,
          },
          canonicityScore: 0.3,
          createdAtTick: data.timestamp as number,
          updatedAtTick: data.timestamp as number,
          relatedEntries: [],
        });
        break;

      case 'narrative_sediment_received': {
        const themes = data.themes as Record<string, number>;
        const themeKeys = Object.keys(themes);
        const dominantTheme = themeKeys.reduce(
          (best, key) => {
            const dist = Math.abs((themes[key] ?? 0.5) - 0.5);
            return dist > best.dist ? { key, dist } : best;
          },
          { key: 'balanced', dist: 0 }
        );
        this.upsertEntry({
          id: 'sediment-nel-aggregate',
          sourceGame: data.sourceGame as string,
          category: 'narrative_sediment',
          title: 'The Weathering — Collective Reader Imprint',
          summary: `NEL narrative sediment from ${data.totalSessionCount} reader sessions. Dominant theme: ${dominantTheme.key}. ${data.depositCount} active deposits shaping MVEE mythology.`,
          details: {
            themes: data.themes,
            depositCount: data.depositCount,
            totalSessionCount: data.totalSessionCount,
            mythCategoryBoosts: data.mythCategoryBoosts,
            targetGame: data.targetGame,
          },
          canonicityScore: 0.9, // Collective reader voice is highly canonical
          createdAtTick: data.timestamp as number,
          updatedAtTick: data.timestamp as number,
          relatedEntries: [],
        });
        break;
      }
    }
  }

  /**
   * Prune old entries and enforce per-category limits
   */
  private _pruneEntries(currentTick: number): void {
    // Pass 1: Remove entries older than MAX_AGE_TICKS
    for (const [id, entry] of this.entries) {
      if (currentTick - entry.updatedAtTick > LoreExportCollector.MAX_AGE_TICKS) {
        this.entries.delete(id);
      }
    }

    // Pass 2: Enforce per-category limit (keep most recent by updatedAtTick)
    const byCategory = new Map<string, WikiLoreEntry[]>();
    for (const entry of this.entries.values()) {
      let arr = byCategory.get(entry.category);
      if (!arr) {
        arr = [];
        byCategory.set(entry.category, arr);
      }
      arr.push(entry);
    }

    for (const [, entries] of byCategory) {
      if (entries.length > LoreExportCollector.MAX_PER_CATEGORY) {
        // Sort by updatedAtTick descending, remove oldest
        entries.sort((a, b) => b.updatedAtTick - a.updatedAtTick);
        for (let i = LoreExportCollector.MAX_PER_CATEGORY; i < entries.length; i++) {
          this.entries.delete(entries[i]!.id);
        }
      }
    }
  }

  private upsertEntry(entry: WikiLoreEntry): void {
    this.entries.set(entry.id, entry);
    this.nextEntryIndex++;
  }

  // --- Public API for external consumers ---

  /** Get all collected lore entries */
  getEntries(): ReadonlyMap<string, WikiLoreEntry> {
    return this.entries;
  }

  /** Get entries by category */
  getEntriesByCategory(category: WikiLoreCategory): WikiLoreEntry[] {
    return Array.from(this.entries.values()).filter(e => e.category === category);
  }

  /** Get a full export snapshot for the wiki */
  getSnapshot(currentTick: number): LoreExportSnapshot {
    const entries = Array.from(this.entries.values());
    const categoryCounts = {} as Record<WikiLoreCategory, number>;
    for (const cat of ['myth', 'schism', 'syncretism', 'holy_text', 'belief', 'ritual', 'narrative_sediment'] as WikiLoreCategory[]) {
      categoryCounts[cat] = 0;
    }
    for (const entry of entries) {
      categoryCounts[entry.category]++;
    }
    return {
      timestamp: currentTick,
      entryCount: entries.length,
      entries,
      categoryCounts,
    };
  }

  /** Get entries above a canonicity threshold (for wiki front page) */
  getCanonicalEntries(minCanonicityScore = 0.5): WikiLoreEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.canonicityScore >= minCanonicityScore)
      .sort((a, b) => b.canonicityScore - a.canonicityScore);
  }

  /** Get the most recent entries (for wiki "recent changes") */
  getRecentEntries(count = 10): WikiLoreEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.updatedAtTick - a.updatedAtTick)
      .slice(0, count);
  }
}
