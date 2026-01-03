/**
 * SpriteService - Manages sprite lookup, availability checking, and generation
 *
 * This service:
 * 1. Looks up sprites from SpriteRegistry based on entity traits
 * 2. Checks if sprite files exist on disk
 * 3. Queues missing sprites for PixelLab generation if API key is available
 * 4. Tracks sprite status (available, missing, generating)
 */

import { findSpriteWithFallback, type SpriteTraits } from './SpriteRegistry.js';

export type SpriteStatus = 'available' | 'missing' | 'generating' | 'unknown';

export interface SpriteInfo {
  folderId: string;
  status: SpriteStatus;
  path?: string;
  isFallback: boolean;            // True if this is a fallback sprite (not exact match)
  idealFolderId?: string;         // The ideal sprite ID being generated (if any)
  missingTraits?: string[];       // Traits that didn't match
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
 * Look up sprite for entity traits with fallback logic
 *
 * If no exact match exists (including clothing), returns the best available
 * fallback sprite while queuing the ideal sprite for generation.
 */
export function lookupSprite(traits: SpriteTraits): SpriteInfo {
  const result = findSpriteWithFallback(traits);
  const { folderId, exactMatch, idealFolderId, missingTraits } = result;

  // Check cache first for the fallback sprite
  let status = spriteStatusCache.get(folderId);

  if (!status) {
    // Check if sprite files exist
    status = checkSpriteExists(folderId) ? 'available' : 'missing';
    spriteStatusCache.set(folderId, status);
  }

  // If fallback sprite is missing, queue IT for generation
  if (status === 'missing' && pixelLabAvailable && !generatingSprites.has(folderId)) {
    queueSpriteGeneration(folderId, traits);
    status = 'generating';
    spriteStatusCache.set(folderId, status);
  }

  // If not an exact match, also queue the ideal sprite for generation
  // This is the key feature: use fallback now, generate ideal for later
  let idealGenerating = false;
  if (!exactMatch && idealFolderId && pixelLabAvailable) {
    // Check if ideal sprite is now available (may have been generated)
    if (checkSpriteExists(idealFolderId)) {
      // Ideal sprite is now available! Use it instead
      spriteStatusCache.set(idealFolderId, 'available');
      return {
        folderId: idealFolderId,
        status: 'available',
        path: `${assetsBasePath}/${idealFolderId}`,
        isFallback: false,
        missingTraits: [],
      };
    }

    // Queue ideal sprite for generation if not already generating
    if (!generatingSprites.has(idealFolderId)) {
      queueSpriteGeneration(idealFolderId, traits);
      spriteStatusCache.set(idealFolderId, 'generating');
      idealGenerating = true;
    } else {
      idealGenerating = true;
    }
  }

  return {
    folderId,
    status,
    path: status === 'available' ? `${assetsBasePath}/${folderId}` : undefined,
    isFallback: !exactMatch,
    idealFolderId: idealGenerating ? idealFolderId : undefined,
    missingTraits,
  };
}

/**
 * Check if sprite folder exists with required files
 * Note: In browser context, we can't directly check filesystem
 * This attempts to fetch metadata.json to verify sprite exists
 */
function checkSpriteExists(folderId: string): boolean {
  // First check the known available set (fast path)
  if (KNOWN_AVAILABLE_SPRITES.has(folderId)) {
    return true;
  }

  // If not in the known set, attempt to verify by fetching metadata
  // This is async, so we'll return false and queue a verification
  if (typeof window !== 'undefined') {
    verifySpriteExists(folderId);
  }

  return false;
}

/**
 * Asynchronously verify if a sprite exists by fetching its metadata
 */
async function verifySpriteExists(folderId: string): Promise<boolean> {
  try {
    const metadataUrl = `${assetsBasePath}/${folderId}/metadata.json`;
    const response = await fetch(metadataUrl, { method: 'HEAD' });

    if (response.ok) {
      // Sprite exists! Add to known available set
      KNOWN_AVAILABLE_SPRITES.add(folderId);
      markSpriteAvailable(folderId);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
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

  // Request generation from server (async, non-blocking)
  if (typeof window !== 'undefined') {
    import('./SpriteGenerationClient.js').then(({ requestSpriteGeneration }) => {
      requestSpriteGeneration(folderId, traits, description).catch((error) => {
        console.error(`Failed to request sprite generation for ${folderId}:`, error);
        generatingSprites.delete(folderId);
        spriteStatusCache.set(folderId, 'missing');
      });
    });
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
  // Handle quadruped creatures differently - use proven animal body templates
  if (traits.bodyType === 'quadruped') {
    return buildQuadrupedDescription(traits);
  }

  // Handle other non-humanoid body types
  if (traits.bodyType && traits.bodyType !== 'humanoid') {
    return buildCreatureDescription(traits);
  }

  // Default humanoid description
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

  // Clothing type - detailed descriptions for each social class
  const clothingDescriptions = {
    peasant: 'wearing simple medieval peasant clothing with rough linen tunic',
    common: 'wearing common villager clothing with wool tunic and leather belt',
    merchant: 'wearing merchant attire with fine wool doublet and leather vest',
    noble: 'wearing elegant noble attire with silk embroidery and gold trim',
    royal: 'wearing regal royal garments with velvet cloak and jeweled accessories',
  };

  const clothingType = traits.clothingType || 'peasant';
  parts.push(clothingDescriptions[clothingType as keyof typeof clothingDescriptions]);

  return parts.join(', ');
}

/**
 * Build description for quadruped creatures using lion/bear body template
 */
function buildQuadrupedDescription(traits: SpriteTraits): string {
  const parts: string[] = [];

  // Base quadruped body structure
  const bodyTemplates: Record<string, string> = {
    alien: 'Quadruped alien creature with powerful four-legged stance similar to a large predator',
    beast: 'Four-legged beast with muscular build and strong limbs',
    monster: 'Monstrous quadruped with bear-like body structure and imposing presence',
    dragon: 'Quadruped dragon-like creature with lizard body on four powerful legs',
    wolf: 'Wolf-like quadruped with sleek muscular body',
    cat: 'Large feline quadruped with agile predator build',
  };

  const baseBody = bodyTemplates[traits.species] ||
    `Quadruped ${traits.species} with powerful four-legged build similar to a lion or bear`;

  parts.push(baseBody);

  // Add distinctive features
  if (traits.features) {
    parts.push(traits.features);
  } else {
    // Default alien features for quadrupeds
    const defaultFeatures = [
      'thick scaled hide',
      'bioluminescent markings along spine',
      'powerful clawed feet',
      'distinctive ridge along back',
    ];
    parts.push(defaultFeatures.join(', '));
  }

  return parts.join('. ');
}

/**
 * Build description for other non-humanoid creatures
 */
function buildCreatureDescription(traits: SpriteTraits): string {
  const parts: string[] = [];

  // Body type templates
  const bodyTypeTemplates: Record<string, string> = {
    avian: 'Bird-like creature with wings and talons',
    serpentine: 'Serpentine creature with elongated snake-like body',
    insectoid: 'Insectoid creature with segmented body and multiple limbs',
  };

  parts.push(bodyTypeTemplates[traits.bodyType!] || `${traits.bodyType} creature`);
  parts.push(traits.species);

  if (traits.features) {
    parts.push(traits.features);
  }

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

  // Death Gods (AI-generated dynamic character portraits)
  'death-gods/plague-doctor',
  'death-gods/day-of-dead-goddess',
  'death-gods/valraven-goddess',
  'death-gods/clockwork-reaper',
  'death-gods/mushroom-druid',
  'death-gods/cosmic-void-entity',

  // Mythological deities
  'anubis',
  'athena',
  'hel',
  'odin',
  'thanatos',
  'zeus',
  'punisher-angel',

  // Fantasy creatures
  'high-elf',
  'pixie',
  'forest-sprite',

  // Alien species
  'blob-alien',
  'crystalline-alien',
  'mantis-alien',
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
