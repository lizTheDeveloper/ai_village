/**
 * SpriteAtlasBuilder - Packs multiple sprites into a single texture atlas
 *
 * Combines multiple individual sprite textures into one large texture,
 * reducing GPU state changes and enabling instanced rendering.
 *
 * Uses a simple shelf-based bin packing algorithm optimized for
 * sprites of similar size (48x48 PixelLab sprites).
 */

import * as THREE from 'three';

/** UV rectangle describing sprite position in atlas */
export interface UVRect {
  u: number;      // Left edge (0-1)
  v: number;      // Bottom edge (0-1) - Note: WebGL UV origin is bottom-left
  width: number;  // Width in UV space (0-1)
  height: number; // Height in UV space (0-1)
}

/** Sprite entry in the atlas */
export interface AtlasEntry {
  key: string;
  uvRect: UVRect;
  pixelRect: { x: number; y: number; width: number; height: number };
}

/** Configuration for the atlas builder */
export interface SpriteAtlasConfig {
  /** Atlas width in pixels (default: 2048) */
  width: number;
  /** Atlas height in pixels (default: 2048) */
  height: number;
  /** Padding between sprites in pixels (default: 1) */
  padding: number;
}

const DEFAULT_CONFIG: SpriteAtlasConfig = {
  width: 2048,
  height: 2048,
  padding: 1,
};

/**
 * Shelf-based bin packer for sprite atlases.
 * Optimized for sprites of similar height (like 48x48 PixelLab sprites).
 */
class ShelfPacker {
  private shelves: Array<{ y: number; height: number; x: number }> = [];
  private width: number;
  private height: number;
  private padding: number;

  constructor(width: number, height: number, padding: number) {
    this.width = width;
    this.height = height;
    this.padding = padding;
  }

  /**
   * Allocate space for a sprite in the atlas.
   * Returns null if there's no room.
   */
  allocate(spriteWidth: number, spriteHeight: number): { x: number; y: number } | null {
    const paddedWidth = spriteWidth + this.padding;
    const paddedHeight = spriteHeight + this.padding;

    // Try to fit in existing shelf
    for (const shelf of this.shelves) {
      if (shelf.height >= paddedHeight && shelf.x + paddedWidth <= this.width) {
        const result = { x: shelf.x, y: shelf.y };
        shelf.x += paddedWidth;
        return result;
      }
    }

    // Create new shelf
    const lastShelf = this.shelves[this.shelves.length - 1];
    const newY = lastShelf ? lastShelf.y + lastShelf.height : 0;

    if (newY + paddedHeight > this.height) {
      return null; // Atlas full
    }

    this.shelves.push({ y: newY, height: paddedHeight, x: paddedWidth });
    return { x: 0, y: newY };
  }

  /**
   * Reset the packer for a fresh atlas.
   */
  reset(): void {
    this.shelves = [];
  }

  /**
   * Get the current used height of the atlas.
   */
  getUsedHeight(): number {
    const lastShelf = this.shelves[this.shelves.length - 1];
    return lastShelf ? lastShelf.y + lastShelf.height : 0;
  }
}

/**
 * SpriteAtlasBuilder manages a texture atlas for sprite batching.
 */
export class SpriteAtlasBuilder {
  private config: SpriteAtlasConfig;
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private packer: ShelfPacker;

  /** Map of sprite key to atlas entry */
  private entries: Map<string, AtlasEntry> = new Map();

  /** THREE.js texture (created lazily) */
  private texture: THREE.CanvasTexture | null = null;
  private textureDirty = true;

  /** Statistics */
  private stats = {
    spriteCount: 0,
    usedPixels: 0,
    totalPixels: 0,
  };

  constructor(config: Partial<SpriteAtlasConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats.totalPixels = this.config.width * this.config.height;

    // Create offscreen canvas for the atlas
    this.canvas = new OffscreenCanvas(this.config.width, this.config.height);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D context for atlas');
    }
    this.ctx = ctx;

    // Initialize packer
    this.packer = new ShelfPacker(this.config.width, this.config.height, this.config.padding);

    // Clear to transparent
    this.ctx.clearRect(0, 0, this.config.width, this.config.height);
  }

  /**
   * Add a sprite to the atlas from an ImageBitmap.
   * Returns the UV rect, or null if atlas is full.
   */
  addSprite(key: string, image: ImageBitmap): UVRect | null {
    // Check if already in atlas
    const existing = this.entries.get(key);
    if (existing) {
      return existing.uvRect;
    }

    // Allocate space
    const pos = this.packer.allocate(image.width, image.height);
    if (!pos) {
      console.warn(`[SpriteAtlasBuilder] Atlas full, cannot add sprite: ${key}`);
      return null;
    }

    // Draw to atlas
    this.ctx.drawImage(image, pos.x, pos.y);

    // Compute UV rect (WebGL UV origin is bottom-left, but we'll handle flip in shader)
    const uvRect: UVRect = {
      u: pos.x / this.config.width,
      v: pos.y / this.config.height,
      width: image.width / this.config.width,
      height: image.height / this.config.height,
    };

    // Store entry
    const entry: AtlasEntry = {
      key,
      uvRect,
      pixelRect: { x: pos.x, y: pos.y, width: image.width, height: image.height },
    };
    this.entries.set(key, entry);

    // Update stats
    this.stats.spriteCount++;
    this.stats.usedPixels += image.width * image.height;

    // Mark texture as needing update
    this.textureDirty = true;

    return uvRect;
  }

  /**
   * Add a sprite from an HTMLImageElement.
   */
  async addSpriteFromImage(key: string, image: HTMLImageElement): Promise<UVRect | null> {
    const bitmap = await createImageBitmap(image);
    return this.addSprite(key, bitmap);
  }

  /**
   * Add a sprite from a URL.
   */
  async addSpriteFromURL(key: string, url: string): Promise<UVRect | null> {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    return this.addSprite(key, bitmap);
  }

  /**
   * Get UV rect for a sprite key.
   */
  getUVRect(key: string): UVRect | null {
    return this.entries.get(key)?.uvRect ?? null;
  }

  /**
   * Check if a sprite is in the atlas.
   */
  hasSprite(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Get the THREE.js texture for this atlas.
   * Creates the texture on first call.
   */
  getTexture(): THREE.CanvasTexture {
    if (!this.texture) {
      // Create texture from offscreen canvas
      // Note: CanvasTexture expects HTMLCanvasElement, so we need to convert
      const regularCanvas = document.createElement('canvas');
      regularCanvas.width = this.config.width;
      regularCanvas.height = this.config.height;
      const ctx = regularCanvas.getContext('2d')!;
      ctx.drawImage(this.canvas, 0, 0);

      this.texture = new THREE.CanvasTexture(regularCanvas);
      this.texture.magFilter = THREE.NearestFilter;
      this.texture.minFilter = THREE.NearestFilter;
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.textureDirty = false;
    } else if (this.textureDirty) {
      // Update existing texture
      const regularCanvas = this.texture.image as HTMLCanvasElement;
      const ctx = regularCanvas.getContext('2d')!;
      ctx.drawImage(this.canvas, 0, 0);
      this.texture.needsUpdate = true;
      this.textureDirty = false;
    }

    return this.texture;
  }

  /**
   * Get statistics about the atlas.
   */
  getStats(): Readonly<typeof this.stats & { fillPercent: number }> {
    return {
      ...this.stats,
      fillPercent: (this.stats.usedPixels / this.stats.totalPixels) * 100,
    };
  }

  /**
   * Get all entries in the atlas.
   */
  getEntries(): ReadonlyMap<string, AtlasEntry> {
    return this.entries;
  }

  /**
   * Clear the atlas and start fresh.
   */
  clear(): void {
    this.entries.clear();
    this.packer.reset();
    this.ctx.clearRect(0, 0, this.config.width, this.config.height);
    this.stats.spriteCount = 0;
    this.stats.usedPixels = 0;
    this.textureDirty = true;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.entries.clear();
  }
}
