/**
 * SpriteService - Manages sprite lookup, availability checking, and generation
 *
 * This service:
 * 1. Looks up sprites from SpriteRegistry based on entity traits
 * 2. Checks if sprite files exist on disk
 * 3. Queues missing sprites for PixelLab generation if API key is available
 * 4. Tracks sprite status (available, missing, generating)
 */

import { findSprite, type SpriteTraits } from './SpriteRegistry.js';

export type SpriteStatus = 'available' | 'missing' | 'generating' | 'unknown';

export interface SpriteInfo {
  folderId: string;
  status: SpriteStatus;
  path?: string;
}

export interface GenerationRequest {
  folderId: string;
  traits: SpriteTraits;
  description: string;
  queuedAt: number;
}

// In-memory queue of sprites pending generation
const generationQueue: GenerationRequest[] = [];

// Known sprite statuses (cached)
const spriteStatusCache = new Map<string, SpriteStatus>();

// Track which sprites are currently being generated
const generatingSprites = new Set<string>();

// Base path for sprite assets (will be set during initialization)
let assetsBasePath = '/assets/sprites/pixellab';

// Whether PixelLab API is available
let pixelLabAvailable = false;

/**
 * Initialize the sprite service
 */
export function initializeSpriteService(options: {
  assetsPath?: string;
  pixelLabApiKey?: string;
}): void {
  if (options.assetsPath) {
    assetsBasePath = options.assetsPath;
  }
  if (options.pixelLabApiKey) {
    pixelLabAvailable = true;
  }
}

/**
 * Check if PixelLab generation is available
 */
export function isPixelLabAvailable(): boolean {
  return pixelLabAvailable;
}

/**
 * Look up sprite for entity traits
 */
export function lookupSprite(traits: SpriteTraits): SpriteInfo {
  const folderId = findSprite(traits);

  // Check cache first
  let status = spriteStatusCache.get(folderId);

  if (!status) {
    // Check if sprite files exist
    status = checkSpriteExists(folderId) ? 'available' : 'missing';
    spriteStatusCache.set(folderId, status);
  }

  // If missing and PixelLab is available, queue for generation
  if (status === 'missing' && pixelLabAvailable && !generatingSprites.has(folderId)) {
    queueSpriteGeneration(folderId, traits);
    status = 'generating';
    spriteStatusCache.set(folderId, status);
  }

  return {
    folderId,
    status,
    path: status === 'available' ? `${assetsBasePath}/${folderId}` : undefined,
  };
}

/**
 * Check if sprite folder exists with required files
 * Note: In browser context, we can't directly check filesystem
 * This uses a pre-populated manifest or tries to load metadata
 */
function checkSpriteExists(folderId: string): boolean {
  // Check against known available sprites
  // This will be populated by scanning the assets directory at build time
  // or by successful loads at runtime
  return KNOWN_AVAILABLE_SPRITES.has(folderId);
}

/**
 * Register a sprite as available (called when sprite loads successfully)
 */
export function markSpriteAvailable(folderId: string): void {
  KNOWN_AVAILABLE_SPRITES.add(folderId);
  spriteStatusCache.set(folderId, 'available');
  generatingSprites.delete(folderId);
}

/**
 * Register a sprite as missing (called when sprite fails to load)
 */
export function markSpriteMissing(folderId: string): void {
  spriteStatusCache.set(folderId, 'missing');
}

/**
 * Queue a sprite for generation via PixelLab
 */
function queueSpriteGeneration(folderId: string, traits: SpriteTraits): void {
  if (generatingSprites.has(folderId)) return;

  generatingSprites.add(folderId);

  const description = buildSpriteDescription(folderId, traits);

  generationQueue.push({
    folderId,
    traits,
    description,
    queuedAt: Date.now(),
  });

  // Emit event for daemon to pick up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pixellab:queue-sprite', {
      detail: { folderId, traits, description },
    }));
  }
}

/**
 * Get the generation queue
 */
export function getGenerationQueue(): readonly GenerationRequest[] {
  return generationQueue;
}

/**
 * Remove item from generation queue
 */
export function removeFromQueue(folderId: string): void {
  const index = generationQueue.findIndex(r => r.folderId === folderId);
  if (index >= 0) {
    generationQueue.splice(index, 1);
  }
  generatingSprites.delete(folderId);
}

/**
 * Build a description for PixelLab sprite generation
 */
function buildSpriteDescription(_folderId: string, traits: SpriteTraits): string {
  const parts: string[] = [];

  // Species
  const speciesDescriptions: Record<string, string> = {
    human: 'Human',
    elf: 'Elegant elf with pointed ears',
    dwarf: 'Short stocky dwarf',
    orc: 'Large muscular orc with tusks',
    thrakeen: 'Insectoid humanoid with four arms and compound eyes',
    celestial: 'Angelic celestial being with wings and halo',
    aquatic: 'Aquatic merfolk humanoid with scales and webbed hands',
  };

  parts.push(speciesDescriptions[traits.species] || traits.species);

  // Gender
  if (traits.gender) {
    parts.push(traits.gender);
  }

  // Hair color
  if (traits.hairColor) {
    parts.push(`with ${traits.hairColor} hair`);
  }

  // Skin tone
  if (traits.skinTone) {
    parts.push(`${traits.skinTone} skin tone`);
  }

  // Common styling
  parts.push('wearing simple medieval peasant clothing');

  return parts.join(', ');
}

/**
 * Get sprite status for display
 */
export function getSpriteStatus(folderId: string): SpriteStatus {
  return spriteStatusCache.get(folderId) || 'unknown';
}

/**
 * Get all sprites currently being generated
 */
export function getGeneratingSprites(): string[] {
  return Array.from(generatingSprites);
}

/**
 * Clear status cache (useful for testing)
 */
export function clearCache(): void {
  spriteStatusCache.clear();
}

// ============================================================================
// Known Available Sprites
// ============================================================================

/**
 * Pre-populated set of known available sprites
 * This is populated at build time by scanning the assets directory
 * and updated at runtime when sprites load successfully
 */
const KNOWN_AVAILABLE_SPRITES = new Set<string>([
  // Human sprites (downloaded from PixelLab)
  'human_male_black',
  'human_male_brown',
  'human_male_blonde',
  'human_male_black_light',
  'human_male_black_medium',
  'human_male_black_dark',
  'human_male_blonde_light',
  'human_female_black_light',
  'human_female_black_medium',
  'human_female_black_dark',
  'human_nonbinary_black',
  'villager',
]);

/**
 * Scan available sprites from filesystem
 * This should be called during initialization when running in Node.js context
 */
export async function scanAvailableSprites(_basePath: string): Promise<string[]> {
  // This function is a placeholder - actual implementation depends on runtime
  // In browser: use fetch to check for metadata.json files
  // In Node.js: use fs.readdirSync

  // For now, return the pre-populated list
  return Array.from(KNOWN_AVAILABLE_SPRITES);
}

/**
 * Add sprites to known available set
 */
export function addKnownSprites(spriteIds: string[]): void {
  for (const id of spriteIds) {
    KNOWN_AVAILABLE_SPRITES.add(id);
    spriteStatusCache.set(id, 'available');
  }
}
