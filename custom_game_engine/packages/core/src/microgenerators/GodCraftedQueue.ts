/**
 * GodCraftedQueue - Persistent queue of externally-created content
 *
 * This is the central repository where all microgenerator content lives.
 * Content persists forever (Conservation of Game Matter) and can drift
 * through any universe in the multiverse.
 *
 * Based on: openspec/specs/microgenerators/spec.md
 */

import type {
  GodCraftedContent,
  QueueEntry,
  ContentFilter,
  ContentQuery,
  Discovery,
  GodCraftedContentType,
  SpawnResult,
} from './types.js';

/**
 * God-Crafted Queue
 *
 * Central repository for all externally-created content.
 */
export class GodCraftedQueue {
  /** All queue entries (never deleted, only marked) */
  private entries: Map<string, QueueEntry> = new Map();

  /** Index by content type for fast filtering */
  private typeIndex: Map<GodCraftedContentType, Set<string>> = new Map();

  /** Index by creator for fast filtering */
  private creatorIndex: Map<string, Set<string>> = new Map();

  /** Index by tags */
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor() {
    // Initialize type index
    const types: GodCraftedContentType[] = [
      'legendary_item',
      'soul',
      'quest',
      'alien_species',
      'magic_paradigm',
      'building',
      'spell',
      'recipe',
      'technology',
      'riddle',
      'deity',
      'religion',
    ];

    for (const type of types) {
      this.typeIndex.set(type, new Set());
    }
  }

  /**
   * Submit new content to the queue
   */
  submit(content: GodCraftedContent): QueueEntry {
    const entryId = `queue:${content.type}:${content.id}`;

    const entry: QueueEntry = {
      entryId,
      content,
      queuedAt: Date.now(),
      discoveryStatus: {},
    };

    // Add to main entries
    this.entries.set(entryId, entry);

    // Update indexes
    this.typeIndex.get(content.type)?.add(entryId);

    if (!this.creatorIndex.has(content.creator.id)) {
      this.creatorIndex.set(content.creator.id, new Set());
    }
    this.creatorIndex.get(content.creator.id)!.add(entryId);

    for (const tag of content.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entryId);
    }

    // Silent submission - no console spam

    return entry;
  }

  /**
   * Retrieve content for universe discovery
   */
  pullForUniverse(universeId: string, filter?: ContentFilter): GodCraftedContent[] {
    const candidates: QueueEntry[] = [];

    // Get all entries matching filter
    for (const entry of this.entries.values()) {
      if (!this.matchesFilter(entry, filter)) {
        continue;
      }

      // Check if already discovered in this universe
      const status = entry.discoveryStatus[universeId];
      if (status?.discovered) {
        continue;
      }

      candidates.push(entry);
    }

    return candidates.map(e => e.content);
  }

  /**
   * Mark content as discovered
   */
  markDiscovered(
    contentId: string,
    universeId: string,
    discoveredBy: string,
    method: Discovery['method'] = 'random_encounter'
  ): void {
    const entry = this.getEntryByContentId(contentId);
    if (!entry) {
      console.warn(`[GodCraftedQueue] Cannot mark discovered: content ${contentId} not found`);
      return;
    }

    const discovery: Discovery = {
      universeId,
      discoveredBy,
      discoveredAt: Date.now(),
      method,
    };

    // Add to content's discovery list
    entry.content.discoveries.push(discovery);

    // Update discovery status
    entry.discoveryStatus[universeId] = {
      discovered: true,
      discoveredAt: discovery.discoveredAt,
      discoveredBy,
    };

    console.log(
      `[GodCraftedQueue] Discovered: ${entry.content.type} by ${discoveredBy} in universe ${universeId}`
    );
  }

  /**
   * Query content
   */
  query(query: ContentQuery): GodCraftedContent[] {
    let entries = Array.from(this.entries.values());

    // Apply filter
    if (query.filter) {
      entries = entries.filter(e => this.matchesFilter(e, query.filter!));
    }

    // Sort
    if (query.sortBy) {
      entries.sort((a, b) => {
        let aVal: number;
        let bVal: number;

        switch (query.sortBy) {
          case 'createdAt':
            aVal = a.content.createdAt;
            bVal = b.content.createdAt;
            break;
          case 'discoveryCount':
            aVal = a.content.discoveries.length;
            bVal = b.content.discoveries.length;
            break;
          case 'creatorPopularity':
            aVal = a.content.creator.previousCreations;
            bVal = b.content.creator.previousCreations;
            break;
          default:
            aVal = a.queuedAt;
            bVal = b.queuedAt;
        }

        return query.sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    // Paginate
    const start = query.offset ?? 0;
    const end = query.limit ? start + query.limit : undefined;
    entries = entries.slice(start, end);

    return entries.map(e => e.content);
  }

  /**
   * Get content by ID
   */
  getContent(contentId: string): GodCraftedContent | null {
    const entry = this.getEntryByContentId(contentId);
    return entry?.content ?? null;
  }

  /**
   * Get all content by creator
   */
  getByCreator(creatorId: string): GodCraftedContent[] {
    const entryIds = this.creatorIndex.get(creatorId);
    if (!entryIds) return [];

    return Array.from(entryIds)
      .map(id => this.entries.get(id))
      .filter((e): e is QueueEntry => e !== undefined)
      .map(e => e.content);
  }

  /**
   * Get all content by type
   */
  getByType(type: GodCraftedContentType): GodCraftedContent[] {
    const entryIds = this.typeIndex.get(type);
    if (!entryIds) return [];

    return Array.from(entryIds)
      .map(id => this.entries.get(id))
      .filter((e): e is QueueEntry => e !== undefined)
      .map(e => e.content);
  }

  /**
   * Get stats
   */
  getStats(): {
    totalEntries: number;
    byType: Record<GodCraftedContentType, number>;
    totalCreators: number;
    totalDiscoveries: number;
  } {
    const byType: Record<string, number> = {};
    let totalDiscoveries = 0;

    for (const [type, ids] of this.typeIndex) {
      byType[type] = ids.size;
    }

    for (const entry of this.entries.values()) {
      totalDiscoveries += entry.content.discoveries.length;
    }

    return {
      totalEntries: this.entries.size,
      byType: byType as Record<GodCraftedContentType, number>,
      totalCreators: this.creatorIndex.size,
      totalDiscoveries,
    };
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    version: number;
    entries: QueueEntry[];
  } {
    return {
      version: 1,
      entries: Array.from(this.entries.values()),
    };
  }

  /**
   * Deserialize from persistence
   */
  deserialize(data: { version: number; entries: QueueEntry[] }): void {
    this.entries.clear();
    this.typeIndex.forEach(set => set.clear());
    this.creatorIndex.clear();
    this.tagIndex.clear();

    for (const entry of data.entries) {
      this.entries.set(entry.entryId, entry);

      // Rebuild indexes
      this.typeIndex.get(entry.content.type)?.add(entry.entryId);

      if (!this.creatorIndex.has(entry.content.creator.id)) {
        this.creatorIndex.set(entry.content.creator.id, new Set());
      }
      this.creatorIndex.get(entry.content.creator.id)!.add(entry.entryId);

      for (const tag of entry.content.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(entry.entryId);
      }
    }

    console.log(`[GodCraftedQueue] Deserialized ${data.entries.length} entries`);
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private matchesFilter(entry: QueueEntry, filter?: ContentFilter): boolean {
    if (!filter) return true;

    if (filter.types && !filter.types.includes(entry.content.type)) {
      return false;
    }

    if (filter.creatorId && entry.content.creator.id !== filter.creatorId) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const hasAnyTag = filter.tags.some(tag => entry.content.tags.includes(tag));
      if (!hasAnyTag) return false;
    }

    if (filter.validated !== undefined && entry.content.validated !== filter.validated) {
      return false;
    }

    if (filter.undiscoveredInUniverse) {
      const status = entry.discoveryStatus[filter.undiscoveredInUniverse];
      if (status?.discovered) return false;
    }

    return true;
  }

  private getEntryByContentId(contentId: string): QueueEntry | null {
    for (const entry of this.entries.values()) {
      if (entry.content.id === contentId) {
        return entry;
      }
    }
    return null;
  }
}

/**
 * Global god-crafted queue singleton
 */
export const godCraftedQueue = new GodCraftedQueue();
