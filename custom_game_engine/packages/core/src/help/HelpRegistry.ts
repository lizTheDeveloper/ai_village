/**
 * HelpRegistry - Central registry for all help entries
 *
 * Provides fast lookup, search, and query capabilities for the embedded
 * documentation system.
 */

import type { HelpEntry } from './HelpEntry.js';

/**
 * Search query for help entries
 */
export interface HelpQuery {
  /** Search term (searches in id, summary, description, tags) */
  search?: string;

  /** Filter by category */
  category?: string;

  /** Filter by subcategory */
  subcategory?: string;

  /** Filter by tags (must have ALL tags) */
  tags?: string[];

  /** Filter by ID prefix (e.g., "item:" finds all items) */
  idPrefix?: string;

  /** Maximum results to return */
  limit?: number;
}

/**
 * Central registry for all help documentation
 */
export class HelpRegistry {
  private entries = new Map<string, HelpEntry>();
  private categoryIndex = new Map<string, Set<string>>();
  private subcategoryIndex = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();

  /**
   * Register a help entry
   */
  register(entry: HelpEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Help entry already registered: ${entry.id}`);
    }

    this.entries.set(entry.id, entry);

    // Update category index
    if (!this.categoryIndex.has(entry.category)) {
      this.categoryIndex.set(entry.category, new Set());
    }
    this.categoryIndex.get(entry.category)!.add(entry.id);

    // Update subcategory index
    if (entry.subcategory) {
      const key = `${entry.category}:${entry.subcategory}`;
      if (!this.subcategoryIndex.has(key)) {
        this.subcategoryIndex.set(key, new Set());
      }
      this.subcategoryIndex.get(key)!.add(entry.id);
    }

    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    }
  }

  /**
   * Register multiple help entries
   */
  registerAll(entries: HelpEntry[]): void {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  /**
   * Get a help entry by ID
   */
  get(id: string): HelpEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get a help entry by ID, throwing if not found
   */
  getOrThrow(id: string): HelpEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Help entry not found: ${id}`);
    }
    return entry;
  }

  /**
   * Get all entries in a category
   */
  getByCategory(category: string): HelpEntry[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) {
      return [];
    }
    return Array.from(ids).map(id => this.entries.get(id)!);
  }

  /**
   * Get all entries in a subcategory
   */
  getBySubcategory(category: string, subcategory: string): HelpEntry[] {
    const key = `${category}:${subcategory}`;
    const ids = this.subcategoryIndex.get(key);
    if (!ids) {
      return [];
    }
    return Array.from(ids).map(id => this.entries.get(id)!);
  }

  /**
   * Get all entries with a specific tag
   */
  getByTag(tag: string): HelpEntry[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) {
      return [];
    }
    return Array.from(ids).map(id => this.entries.get(id)!);
  }

  /**
   * Search for help entries
   */
  search(query: HelpQuery): HelpEntry[] {
    let results = Array.from(this.entries.values());

    // Filter by category
    if (query.category) {
      results = results.filter(e => e.category === query.category);
    }

    // Filter by subcategory
    if (query.subcategory) {
      results = results.filter(e => e.subcategory === query.subcategory);
    }

    // Filter by tags (must have ALL specified tags)
    if (query.tags && query.tags.length > 0) {
      results = results.filter(e =>
        query.tags!.every(tag => e.tags.includes(tag))
      );
    }

    // Filter by ID prefix
    if (query.idPrefix) {
      results = results.filter(e => e.id.startsWith(query.idPrefix!));
    }

    // Search text
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(e => {
        return (
          e.id.toLowerCase().includes(searchLower) ||
          e.summary.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          e.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      });
    }

    // Limit results
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categoryIndex.keys()).sort();
  }

  /**
   * Get all subcategories for a category
   */
  getSubcategories(category: string): string[] {
    const subcats = new Set<string>();
    for (const key of Array.from(this.subcategoryIndex.keys())) {
      if (key.startsWith(`${category}:`)) {
        subcats.add(key.substring(category.length + 1));
      }
    }
    return Array.from(subcats).sort();
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    return Array.from(this.tagIndex.keys()).sort();
  }

  /**
   * Get statistics about the help system
   */
  getStats(): {
    totalEntries: number;
    categories: Record<string, number>;
    tags: Record<string, number>;
  } {
    const stats = {
      totalEntries: this.entries.size,
      categories: {} as Record<string, number>,
      tags: {} as Record<string, number>,
    };

    for (const [category, ids] of Array.from(this.categoryIndex.entries())) {
      stats.categories[category] = ids.size;
    }

    for (const [tag, ids] of Array.from(this.tagIndex.entries())) {
      stats.tags[tag] = ids.size;
    }

    return stats;
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.entries.clear();
    this.categoryIndex.clear();
    this.subcategoryIndex.clear();
    this.tagIndex.clear();
  }
}

// Global singleton registry
export const helpRegistry = new HelpRegistry();
