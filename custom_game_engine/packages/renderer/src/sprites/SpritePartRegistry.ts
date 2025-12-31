/**
 * SpritePartRegistry - Loads and manages sprite part images
 *
 * Handles async loading of sprite sheet images and provides access to loaded parts.
 */

import { LPCPartDef, LPC_BUILTIN_PARTS } from './LPCSpriteDefs';

/** Loaded sprite part with its image */
export interface LoadedSpritePart {
  def: LPCPartDef;
  image: HTMLImageElement;
  loaded: boolean;
}

/**
 * Registry for managing sprite part definitions and loaded images
 */
export class SpritePartRegistry {
  private parts: Map<string, LPCPartDef> = new Map();
  private loadedParts: Map<string, LoadedSpritePart> = new Map();
  private loadPromises: Map<string, Promise<LoadedSpritePart>> = new Map();
  private basePath: string;

  constructor(basePath: string = '/assets/sprites/') {
    this.basePath = basePath;

    // Register built-in parts
    for (const [_id, def] of Object.entries(LPC_BUILTIN_PARTS)) {
      this.registerPart(def);
    }
  }

  /**
   * Register a new sprite part definition
   */
  registerPart(def: LPCPartDef): void {
    this.parts.set(def.id, def);
  }

  /**
   * Get a part definition by ID
   */
  getPartDef(id: string): LPCPartDef | undefined {
    return this.parts.get(id);
  }

  /**
   * Get all registered part IDs
   */
  getAllPartIds(): string[] {
    return Array.from(this.parts.keys());
  }

  /**
   * Load a sprite part image asynchronously
   */
  async loadPart(id: string): Promise<LoadedSpritePart> {
    // Check if already loaded
    const existing = this.loadedParts.get(id);
    if (existing?.loaded) {
      return existing;
    }

    // Check if loading in progress
    const existingPromise = this.loadPromises.get(id);
    if (existingPromise) {
      return existingPromise;
    }

    // Get definition
    const def = this.parts.get(id);
    if (!def) {
      throw new Error(`Sprite part not found: ${id}`);
    }

    // Create load promise
    const loadPromise = this.loadImage(def);
    this.loadPromises.set(id, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedParts.set(id, result);
      return result;
    } finally {
      this.loadPromises.delete(id);
    }
  }

  /**
   * Load multiple parts at once
   */
  async loadParts(ids: string[]): Promise<Map<string, LoadedSpritePart>> {
    const results = new Map<string, LoadedSpritePart>();

    await Promise.all(
      ids.map(async (id) => {
        try {
          const part = await this.loadPart(id);
          results.set(id, part);
        } catch (error) {
          console.error(`Failed to load sprite part ${id}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Check if a part is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedParts.get(id)?.loaded ?? false;
  }

  /**
   * Get a loaded part (returns undefined if not loaded)
   */
  getLoadedPart(id: string): LoadedSpritePart | undefined {
    const part = this.loadedParts.get(id);
    return part?.loaded ? part : undefined;
  }

  /**
   * Preload all registered parts
   */
  async preloadAll(): Promise<void> {
    const ids = this.getAllPartIds();
    await this.loadParts(ids);
  }

  /**
   * Internal: Load an image for a part definition
   */
  private loadImage(def: LPCPartDef): Promise<LoadedSpritePart> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          def,
          image,
          loaded: true,
        });
      };

      image.onerror = () => {
        reject(new Error(`Failed to load image: ${def.imagePath}`));
      };

      // Set source to trigger load
      image.src = this.basePath + def.imagePath;
    });
  }

  /**
   * Clear all loaded images (free memory)
   */
  clearLoaded(): void {
    this.loadedParts.clear();
    this.loadPromises.clear();
  }

  /**
   * Get loading statistics
   */
  getStats(): { total: number; loaded: number; loading: number } {
    return {
      total: this.parts.size,
      loaded: Array.from(this.loadedParts.values()).filter((p) => p.loaded).length,
      loading: this.loadPromises.size,
    };
  }
}

/** Singleton instance for global access */
let globalRegistry: SpritePartRegistry | null = null;

/**
 * Get the global sprite part registry
 */
export function getSpritePartRegistry(basePath?: string): SpritePartRegistry {
  if (!globalRegistry) {
    globalRegistry = new SpritePartRegistry(basePath);
  }
  return globalRegistry;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetSpritePartRegistry(): void {
  globalRegistry?.clearLoaded();
  globalRegistry = null;
}
