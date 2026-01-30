/**
 * SpriteImporter - Import custom sprites for planets
 *
 * Handles uploading, validating, and registering custom sprites
 * that users want to add to their planet's sprite set.
 */

import type { PlanetSpriteManifest, SpriteEntry } from '@ai-village/world';
import { addSpriteToManifest } from '@ai-village/world';

export interface ImportedSpriteMetadata {
  /** Unique folder ID for this sprite */
  folderId: string;
  /** Display name */
  name: string;
  /** Category of sprite */
  category: SpriteEntry['category'];
  /** Sprite size in pixels */
  size: number;
  /** Optional description */
  description?: string;
  /** Source of import (file path, URL, etc.) */
  importSource: string;
}

export interface SpriteValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Detected sprite dimensions */
  detectedSize?: { width: number; height: number };
  /** Detected direction count */
  detectedDirections?: number;
  /** Whether sprite has transparency */
  hasTransparency?: boolean;
}

export interface ImportOptions {
  /** Validate sprite before importing */
  validate?: boolean;
  /** Overwrite existing sprite with same ID */
  overwrite?: boolean;
  /** Auto-generate folder ID from name */
  autoGenerateId?: boolean;
}

/**
 * Validate a sprite image
 */
export async function validateSprite(
  imageData: Blob | ArrayBuffer | HTMLImageElement,
  expectedSize?: number
): Promise<SpriteValidationResult> {
  const result: SpriteValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Convert to ImageBitmap for analysis
    let bitmap: ImageBitmap;

    if (imageData instanceof Blob) {
      bitmap = await createImageBitmap(imageData);
    } else if (imageData instanceof ArrayBuffer) {
      const blob = new Blob([imageData], { type: 'image/png' });
      bitmap = await createImageBitmap(blob);
    } else if (imageData instanceof HTMLImageElement) {
      bitmap = await createImageBitmap(imageData);
    } else {
      result.valid = false;
      result.errors.push('Invalid image data type');
      return result;
    }

    result.detectedSize = { width: bitmap.width, height: bitmap.height };

    // Check if square (single direction) or strip (multiple directions)
    if (bitmap.width === bitmap.height) {
      result.detectedDirections = 1;
    } else if (bitmap.width % bitmap.height === 0) {
      // Horizontal strip of equal-sized frames
      result.detectedDirections = bitmap.width / bitmap.height;
    } else if (bitmap.height % bitmap.width === 0) {
      // Vertical strip of equal-sized frames
      result.detectedDirections = bitmap.height / bitmap.width;
    } else {
      result.warnings.push('Non-standard dimensions - sprite may not display correctly');
      result.detectedDirections = 1;
    }

    // Check expected size if provided
    if (expectedSize) {
      const frameSize = result.detectedDirections === 1
        ? bitmap.width
        : Math.min(bitmap.width, bitmap.height);

      if (frameSize !== expectedSize) {
        result.warnings.push(
          `Sprite size ${frameSize}px doesn't match expected ${expectedSize}px`
        );
      }
    }

    // Common size validations
    const frameSize = result.detectedDirections === 1
      ? bitmap.width
      : Math.min(bitmap.width, bitmap.height);

    if (frameSize < 16) {
      result.errors.push('Sprite too small (minimum 16x16)');
      result.valid = false;
    }

    if (frameSize > 256) {
      result.warnings.push('Large sprite size may impact performance');
    }

    // Power of 2 check (optional but recommended)
    const isPowerOf2 = (n: number) => (n & (n - 1)) === 0;
    if (!isPowerOf2(frameSize)) {
      result.warnings.push('Non-power-of-2 size may cause rendering issues on some devices');
    }

    bitmap.close();

  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to process image: ${error}`);
  }

  return result;
}

/**
 * Generate a folder ID from a name
 */
export function generateFolderId(name: string, prefix: string = 'custom'): string {
  // Sanitize name: lowercase, replace spaces with underscores, remove special chars
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 32);

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);

  return `${prefix}_${sanitized}_${timestamp}`;
}

/**
 * Import a custom sprite into a planet's manifest
 */
export function importSpriteToManifest(
  manifest: PlanetSpriteManifest,
  metadata: ImportedSpriteMetadata,
  options: ImportOptions = {}
): { success: boolean; manifest: PlanetSpriteManifest; error?: string } {
  const { overwrite = false, autoGenerateId = false } = options;

  // Check for existing sprite
  const existing = manifest.sprites.find(s => s.folderId === metadata.folderId);
  if (existing && !overwrite) {
    return {
      success: false,
      manifest,
      error: `Sprite with ID "${metadata.folderId}" already exists. Use overwrite option to replace.`,
    };
  }

  // Generate ID if requested
  let folderId = metadata.folderId;
  if (autoGenerateId || !folderId) {
    folderId = generateFolderId(metadata.name);
  }

  // Create sprite entry
  const entry: Omit<SpriteEntry, 'status'> & { status?: SpriteEntry['status'] } = {
    folderId,
    name: metadata.name,
    category: metadata.category,
    status: 'available', // Custom imports are immediately available
    size: metadata.size,
    metadata: {
      description: metadata.description,
      importedAt: Date.now(),
      importSource: metadata.importSource,
    },
  };

  // Add to manifest
  const updatedManifest = addSpriteToManifest(manifest, entry);

  return {
    success: true,
    manifest: updatedManifest,
  };
}

/**
 * Import multiple sprites as a batch
 */
export function importSpriteBatch(
  manifest: PlanetSpriteManifest,
  sprites: ImportedSpriteMetadata[],
  options: ImportOptions = {}
): {
  manifest: PlanetSpriteManifest;
  results: Array<{ folderId: string; success: boolean; error?: string }>;
} {
  let currentManifest = manifest;
  const results: Array<{ folderId: string; success: boolean; error?: string }> = [];

  for (const sprite of sprites) {
    const result = importSpriteToManifest(currentManifest, sprite, options);
    results.push({
      folderId: sprite.folderId,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      currentManifest = result.manifest;
    }
  }

  return { manifest: currentManifest, results };
}

/**
 * Create metadata structure for sprite files
 * This matches the format expected by PixelLabSpriteLoader
 */
export function createSpriteMetadataJson(
  folderId: string,
  name: string,
  options: {
    size: number;
    directions?: number;
    category?: string;
    description?: string;
    artStyle?: string;
  }
): object {
  const {
    size,
    directions = 1,
    category = 'custom',
    description = '',
    artStyle,
  } = options;

  const directionNames = directions === 8
    ? ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast']
    : directions === 4
    ? ['south', 'west', 'north', 'east']
    : ['south'];

  return {
    id: folderId,
    name,
    size,
    directions: directionNames,
    category,
    description,
    artStyle,
    type: 'custom_import',
    generated_at: new Date().toISOString(),
    import_metadata: {
      importedAt: Date.now(),
      version: '1.0',
    },
  };
}

/**
 * Export type for external use
 */
export type { SpriteEntry, PlanetSpriteManifest };
