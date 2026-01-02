/**
 * TVArchiveSystem - Manages historical preservation of television content
 *
 * Implements tiered storage for TV content:
 * - Hot tier: Currently broadcasting or recent content (in-memory)
 * - Warm tier: Recent episodes, quick retrieval (cached)
 * - Cold tier: Historical archives, compressed (long-term storage)
 *
 * Features:
 * - Content preservation based on cultural significance
 * - Rerun scheduling from archives
 * - Historical clip retrieval
 * - Anniversary/retrospective shows
 * - Cultural heritage preservation
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { ComponentType } from '../../types/ComponentType.js';

// =============================================================================
// TYPES
// =============================================================================

export type StorageTier = 'hot' | 'warm' | 'cold';

export interface ArchivedContent {
  contentId: string;
  showId: string;
  episodeNumber: number;
  title: string;
  originalAirDate: number;
  storageTier: StorageTier;
  qualityScore: number;
  culturalSignificance: number;
  viewershipPeak: number;
  preservationPriority: number;
  retrievalCount: number;
  lastRetrieved: number | null;
  archiveDate: number;
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  genre: string;
  cast: string[];
  director?: string;
  writers?: string[];
  runtime: number;
  keywords: string[];
  awards?: string[];
  notableScenes?: string[];
  culturalReferences?: string[];
}

export interface HotContent {
  content: ArchivedContent;
  lastBroadcast: number;
  currentViewers: number;
  cacheExpiry: number;
}

export interface WarmContent {
  contentId: string;
  showId: string;
  episodeNumber: number;
  qualityScore: number;
  cachedAt: number;
  accessCount: number;
}

export interface ColdContent {
  contentId: string;
  archiveDate: number;
  culturalSignificance: number;
  retrievalCost: number;
  compressionRatio: number;
}

export interface RetrospectiveShow {
  id: string;
  title: string;
  showId: string;
  type: 'anniversary' | 'tribute' | 'best_of' | 'memorial';
  featuredClips: string[];
  scheduledDate: number;
  narratorId?: string;
}

export interface ArchiveCollection {
  id: string;
  name: string;
  description: string;
  contentIds: string[];
  curator: string;
  createdAt: number;
  theme: string;
  featured: boolean;
}

export interface PreservationRequest {
  contentId: string;
  requesterId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: number;
  status: 'pending' | 'approved' | 'denied' | 'completed';
}

// =============================================================================
// ARCHIVE MANAGER
// =============================================================================

export class ArchiveManager {
  private hotStorage: Map<string, HotContent> = new Map();
  private warmStorage: Map<string, WarmContent> = new Map();
  private coldStorage: Map<string, ColdContent> = new Map();
  private allContent: Map<string, ArchivedContent> = new Map();
  private collections: Map<string, ArchiveCollection> = new Map();
  private retrospectives: Map<string, RetrospectiveShow> = new Map();
  private preservationRequests: Map<string, PreservationRequest> = new Map();
  private eventBus: EventBus | null = null;

  // Storage thresholds
  private readonly HOT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly WARM_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MIN_CULTURAL_SIGNIFICANCE_FOR_COLD = 0.3;
  private readonly RETRIEVAL_COST_BASE = 10;

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // ---------------------------------------------------------------------------
  // Content Archiving
  // ---------------------------------------------------------------------------

  archiveContent(content: Omit<ArchivedContent, 'archiveDate' | 'retrievalCount' | 'lastRetrieved' | 'preservationPriority'>): ArchivedContent {
    const now = Date.now();
    const preservationPriority = this.calculatePreservationPriority(content);

    const archived: ArchivedContent = {
      ...content,
      archiveDate: now,
      retrievalCount: 0,
      lastRetrieved: null,
      preservationPriority,
    };

    this.allContent.set(archived.contentId, archived);

    // Determine initial storage tier
    if (now - content.originalAirDate < this.HOT_CACHE_DURATION) {
      this.moveToHot(archived);
    } else if (now - content.originalAirDate < this.WARM_CACHE_DURATION) {
      this.moveToWarm(archived);
    } else {
      this.moveToCold(archived);
    }

    this.eventBus?.emit({
      type: 'tv:content_archived' as any,
      source: archived.showId,
      data: {
        contentId: archived.contentId,
        showId: archived.showId,
        tier: archived.storageTier,
        culturalSignificance: archived.culturalSignificance,
      },
    });

    return archived;
  }

  private calculatePreservationPriority(content: Partial<ArchivedContent>): number {
    let priority = 0;

    // Cultural significance is primary factor
    priority += (content.culturalSignificance ?? 0) * 0.4;

    // Quality score matters
    priority += (content.qualityScore ?? 0) * 0.25;

    // Historical viewership
    const viewershipNormalized = Math.min((content.viewershipPeak ?? 0) / 1000000, 1);
    priority += viewershipNormalized * 0.2;

    // Awards boost preservation priority
    if (content.metadata?.awards && content.metadata.awards.length > 0) {
      priority += Math.min(content.metadata.awards.length * 0.05, 0.15);
    }

    return Math.min(priority, 1);
  }

  // ---------------------------------------------------------------------------
  // Storage Tier Management
  // ---------------------------------------------------------------------------

  private moveToHot(content: ArchivedContent): void {
    content.storageTier = 'hot';
    this.warmStorage.delete(content.contentId);
    this.coldStorage.delete(content.contentId);

    this.hotStorage.set(content.contentId, {
      content,
      lastBroadcast: Date.now(),
      currentViewers: 0,
      cacheExpiry: Date.now() + this.HOT_CACHE_DURATION,
    });
  }

  private moveToWarm(content: ArchivedContent): void {
    content.storageTier = 'warm';
    this.hotStorage.delete(content.contentId);
    this.coldStorage.delete(content.contentId);

    this.warmStorage.set(content.contentId, {
      contentId: content.contentId,
      showId: content.showId,
      episodeNumber: content.episodeNumber,
      qualityScore: content.qualityScore,
      cachedAt: Date.now(),
      accessCount: 0,
    });
  }

  private moveToCold(content: ArchivedContent): void {
    if (content.culturalSignificance < this.MIN_CULTURAL_SIGNIFICANCE_FOR_COLD) {
      // Content not significant enough for cold storage - may be purged
      this.eventBus?.emit({
        type: 'tv:content_low_significance' as any,
        source: content.showId,
        data: {
          contentId: content.contentId,
          significance: content.culturalSignificance,
        },
      });
    }

    content.storageTier = 'cold';
    this.hotStorage.delete(content.contentId);
    this.warmStorage.delete(content.contentId);

    this.coldStorage.set(content.contentId, {
      contentId: content.contentId,
      archiveDate: content.archiveDate,
      culturalSignificance: content.culturalSignificance,
      retrievalCost: this.calculateRetrievalCost(content),
      compressionRatio: 0.3 + Math.random() * 0.2, // 30-50% compression
    });
  }

  private calculateRetrievalCost(content: ArchivedContent): number {
    // Older content costs more to retrieve
    const ageYears = (Date.now() - content.originalAirDate) / (365 * 24 * 60 * 60 * 1000);
    const ageFactor = 1 + Math.log10(1 + ageYears);

    // Lower quality requires more processing
    const qualityFactor = 2 - content.qualityScore;

    return this.RETRIEVAL_COST_BASE * ageFactor * qualityFactor;
  }

  // ---------------------------------------------------------------------------
  // Content Retrieval
  // ---------------------------------------------------------------------------

  retrieveContent(contentId: string): ArchivedContent | null {
    const content = this.allContent.get(contentId);
    if (!content) {
      return null;
    }

    content.retrievalCount++;
    content.lastRetrieved = Date.now();

    // Promote content based on access patterns
    if (content.storageTier === 'cold' && content.retrievalCount > 3) {
      this.moveToWarm(content);
    } else if (content.storageTier === 'warm') {
      const warmData = this.warmStorage.get(contentId);
      if (warmData) {
        warmData.accessCount++;
        if (warmData.accessCount > 5) {
          this.moveToHot(content);
        }
      }
    }

    this.eventBus?.emit({
      type: 'tv:content_retrieved' as any,
      source: content.showId,
      data: {
        contentId,
        tier: content.storageTier,
        retrievalCount: content.retrievalCount,
      },
    });

    return content;
  }

  searchArchive(query: {
    showId?: string;
    genre?: string;
    minQuality?: number;
    minSignificance?: number;
    keywords?: string[];
    dateRange?: { start: number; end: number };
  }): ArchivedContent[] {
    const results: ArchivedContent[] = [];

    for (const content of this.allContent.values()) {
      if (query.showId && content.showId !== query.showId) continue;
      if (query.genre && content.metadata.genre !== query.genre) continue;
      if (query.minQuality && content.qualityScore < query.minQuality) continue;
      if (query.minSignificance && content.culturalSignificance < query.minSignificance) continue;

      if (query.dateRange) {
        if (content.originalAirDate < query.dateRange.start) continue;
        if (content.originalAirDate > query.dateRange.end) continue;
      }

      if (query.keywords && query.keywords.length > 0) {
        const hasKeyword = query.keywords.some((kw) =>
          content.metadata.keywords.includes(kw.toLowerCase())
        );
        if (!hasKeyword) continue;
      }

      results.push(content);
    }

    // Sort by cultural significance
    results.sort((a, b) => b.culturalSignificance - a.culturalSignificance);

    return results;
  }

  // ---------------------------------------------------------------------------
  // Collections
  // ---------------------------------------------------------------------------

  createCollection(
    name: string,
    description: string,
    contentIds: string[],
    curator: string,
    theme: string
  ): ArchiveCollection {
    const collection: ArchiveCollection = {
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      contentIds: contentIds.filter((id) => this.allContent.has(id)),
      curator,
      createdAt: Date.now(),
      theme,
      featured: false,
    };

    this.collections.set(collection.id, collection);

    this.eventBus?.emit({
      type: 'tv:collection_created' as any,
      source: collection.id,
      data: {
        collectionId: collection.id,
        name,
        contentCount: collection.contentIds.length,
      },
    });

    return collection;
  }

  getCollection(collectionId: string): ArchiveCollection | null {
    return this.collections.get(collectionId) ?? null;
  }

  getFeaturedCollections(): ArchiveCollection[] {
    return Array.from(this.collections.values()).filter((c) => c.featured);
  }

  featureCollection(collectionId: string, featured: boolean): void {
    const collection = this.collections.get(collectionId);
    if (collection) {
      collection.featured = featured;
    }
  }

  // ---------------------------------------------------------------------------
  // Retrospective Shows
  // ---------------------------------------------------------------------------

  scheduleRetrospective(
    title: string,
    showId: string,
    type: RetrospectiveShow['type'],
    scheduledDate: number,
    narratorId?: string
  ): RetrospectiveShow {
    // Find best clips from the show
    const showContent = this.searchArchive({ showId, minSignificance: 0.5 });
    const featuredClips = showContent.slice(0, 10).map((c) => c.contentId);

    const retrospective: RetrospectiveShow = {
      id: `retro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      showId,
      type,
      featuredClips,
      scheduledDate,
      narratorId,
    };

    this.retrospectives.set(retrospective.id, retrospective);

    this.eventBus?.emit({
      type: 'tv:retrospective_scheduled' as any,
      source: showId,
      data: {
        id: retrospective.id,
        title,
        type,
        clipCount: featuredClips.length,
      },
    });

    return retrospective;
  }

  getUpcomingRetrospectives(): RetrospectiveShow[] {
    const now = Date.now();
    return Array.from(this.retrospectives.values())
      .filter((r) => r.scheduledDate > now)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
  }

  // ---------------------------------------------------------------------------
  // Preservation Management
  // ---------------------------------------------------------------------------

  requestPreservation(contentId: string, requesterId: string, reason: string): PreservationRequest | null {
    if (!this.allContent.has(contentId)) {
      return null;
    }

    const content = this.allContent.get(contentId)!;

    // Auto-approve high significance content
    const priority = content.culturalSignificance > 0.8 ? 'critical' :
                    content.culturalSignificance > 0.6 ? 'high' :
                    content.culturalSignificance > 0.4 ? 'medium' : 'low';

    const request: PreservationRequest = {
      contentId,
      requesterId,
      reason,
      priority,
      requestedAt: Date.now(),
      status: priority === 'critical' ? 'approved' : 'pending',
    };

    this.preservationRequests.set(`${contentId}_${requesterId}`, request);

    if (request.status === 'approved') {
      // Boost preservation priority
      content.preservationPriority = Math.min(content.preservationPriority + 0.2, 1);
    }

    return request;
  }

  processPreservationRequests(): void {
    for (const request of this.preservationRequests.values()) {
      if (request.status !== 'pending') continue;

      const content = this.allContent.get(request.contentId);
      if (!content) {
        request.status = 'denied';
        continue;
      }

      // Auto-approve based on priority after 24 hours
      const hoursWaiting = (Date.now() - request.requestedAt) / (60 * 60 * 1000);
      if (hoursWaiting > 24 && request.priority !== 'low') {
        request.status = 'approved';
        content.preservationPriority = Math.min(content.preservationPriority + 0.1, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Storage Maintenance
  // ---------------------------------------------------------------------------

  performMaintenance(): {
    promoted: number;
    demoted: number;
    purged: number;
  } {
    const now = Date.now();
    let promoted = 0;
    let demoted = 0;
    let purged = 0;

    // Demote expired hot content to warm
    for (const [contentId, hotData] of this.hotStorage) {
      if (now > hotData.cacheExpiry) {
        const content = this.allContent.get(contentId);
        if (content) {
          this.moveToWarm(content);
          demoted++;
        }
      }
    }

    // Demote old warm content to cold
    for (const [contentId, warmData] of this.warmStorage) {
      const ageMs = now - warmData.cachedAt;
      if (ageMs > this.WARM_CACHE_DURATION && warmData.accessCount < 3) {
        const content = this.allContent.get(contentId);
        if (content) {
          this.moveToCold(content);
          demoted++;
        }
      }
    }

    // Purge low-significance cold content older than 1 year
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    for (const [contentId] of this.coldStorage) {
      const content = this.allContent.get(contentId);
      if (content && content.archiveDate < oneYearAgo) {
        if (content.culturalSignificance < 0.2 && content.preservationPriority < 0.3) {
          this.coldStorage.delete(contentId);
          this.allContent.delete(contentId);
          purged++;
        }
      }
    }

    // Promote frequently accessed cold content
    for (const content of this.allContent.values()) {
      if (content.storageTier === 'cold' && content.retrievalCount > 5) {
        this.moveToWarm(content);
        promoted++;
      }
    }

    this.eventBus?.emit({
      type: 'tv:archive_maintenance' as any,
      source: 'archive_system',
      data: {
        promoted,
        demoted,
        purged,
        totalContent: this.allContent.size,
      },
    });

    return { promoted, demoted, purged };
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getArchiveStats(): {
    totalContent: number;
    hotCount: number;
    warmCount: number;
    coldCount: number;
    totalRetrievals: number;
    averageSignificance: number;
    collectionsCount: number;
    pendingPreservations: number;
  } {
    let totalRetrievals = 0;
    let totalSignificance = 0;

    for (const content of this.allContent.values()) {
      totalRetrievals += content.retrievalCount;
      totalSignificance += content.culturalSignificance;
    }

    const pendingPreservations = Array.from(this.preservationRequests.values())
      .filter((r) => r.status === 'pending').length;

    return {
      totalContent: this.allContent.size,
      hotCount: this.hotStorage.size,
      warmCount: this.warmStorage.size,
      coldCount: this.coldStorage.size,
      totalRetrievals,
      averageSignificance: this.allContent.size > 0 ? totalSignificance / this.allContent.size : 0,
      collectionsCount: this.collections.size,
      pendingPreservations,
    };
  }

  getContentByTier(tier: StorageTier): ArchivedContent[] {
    return Array.from(this.allContent.values())
      .filter((c) => c.storageTier === tier);
  }

  getMostSignificantContent(limit: number = 10): ArchivedContent[] {
    return Array.from(this.allContent.values())
      .sort((a, b) => b.culturalSignificance - a.culturalSignificance)
      .slice(0, limit);
  }

  reset(): void {
    this.hotStorage.clear();
    this.warmStorage.clear();
    this.coldStorage.clear();
    this.allContent.clear();
    this.collections.clear();
    this.retrospectives.clear();
    this.preservationRequests.clear();
    this.eventBus = null;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let archiveManagerInstance: ArchiveManager | null = null;

export function getArchiveManager(): ArchiveManager {
  if (!archiveManagerInstance) {
    archiveManagerInstance = new ArchiveManager();
  }
  return archiveManagerInstance;
}

export function resetArchiveManager(): void {
  if (archiveManagerInstance) {
    archiveManagerInstance.reset();
    archiveManagerInstance = null;
  }
}

// =============================================================================
// SYSTEM
// =============================================================================

export class TVArchiveSystem implements System {
  readonly id = 'TVArchiveSystem';
  readonly priority = 76;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = getArchiveManager();
  private lastMaintenanceTick = 0;
  private readonly MAINTENANCE_INTERVAL = 1000; // Every 1000 ticks

  initialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.lastMaintenanceTick++;

    // Periodic maintenance
    if (this.lastMaintenanceTick >= this.MAINTENANCE_INTERVAL) {
      this.manager.performMaintenance();
      this.manager.processPreservationRequests();
      this.lastMaintenanceTick = 0;
    }
  }

  cleanup(): void {
    resetArchiveManager();
  }
}
