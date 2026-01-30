/**
 * PlanetSpriteManifest - Per-planet sprite organization and tracking
 *
 * Manages the association between planets and their sprite sets, including:
 * - Biosphere species sprites (generated aliens)
 * - Custom imported sprites
 * - Art style configuration
 * - Sprite status tracking
 */

export interface SpriteEntry {
  /** Unique sprite folder ID */
  folderId: string;
  /** Display name */
  name: string;
  /** Category (species, item, building, custom) */
  category: 'species' | 'item' | 'building' | 'custom';
  /** Generation status */
  status: 'available' | 'generating' | 'queued' | 'failed' | 'missing';
  /** Sprite size in pixels */
  size: number;
  /** Additional metadata */
  metadata?: {
    nicheId?: string;
    scientificName?: string;
    description?: string;
    importedAt?: number;
    importSource?: string;
  };
}

export interface PlanetSpriteManifest {
  /** Schema version for migrations */
  $schema: 'https://aivillage.dev/schemas/planet-sprite-manifest/v1';
  /** Planet ID this manifest belongs to */
  planetId: string;
  /** Planet name */
  planetName: string;
  /** Console-era art style for this planet */
  artStyle: string;
  /** All sprites associated with this planet */
  sprites: SpriteEntry[];
  /** Statistics */
  stats: {
    total: number;
    available: number;
    generating: number;
    failed: number;
    byCategory: Record<string, number>;
  };
  /** Timestamps */
  createdAt: number;
  updatedAt: number;
}

/**
 * Create an empty manifest for a new planet
 */
export function createPlanetSpriteManifest(
  planetId: string,
  planetName: string,
  artStyle: string
): PlanetSpriteManifest {
  return {
    $schema: 'https://aivillage.dev/schemas/planet-sprite-manifest/v1',
    planetId,
    planetName,
    artStyle,
    sprites: [],
    stats: {
      total: 0,
      available: 0,
      generating: 0,
      failed: 0,
      byCategory: {},
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Add a sprite entry to the manifest
 */
export function addSpriteToManifest(
  manifest: PlanetSpriteManifest,
  entry: Omit<SpriteEntry, 'status'> & { status?: SpriteEntry['status'] }
): PlanetSpriteManifest {
  const fullEntry: SpriteEntry = {
    ...entry,
    status: entry.status ?? 'queued',
  };

  // Check if sprite already exists
  const existingIndex = manifest.sprites.findIndex(s => s.folderId === entry.folderId);
  if (existingIndex >= 0) {
    // Update existing entry
    manifest.sprites[existingIndex] = fullEntry;
  } else {
    // Add new entry
    manifest.sprites.push(fullEntry);
  }

  // Update stats
  manifest.stats = calculateManifestStats(manifest.sprites);
  manifest.updatedAt = Date.now();

  return manifest;
}

/**
 * Update sprite status in manifest
 */
export function updateSpriteStatus(
  manifest: PlanetSpriteManifest,
  folderId: string,
  status: SpriteEntry['status']
): PlanetSpriteManifest {
  const sprite = manifest.sprites.find(s => s.folderId === folderId);
  if (sprite) {
    sprite.status = status;
    manifest.stats = calculateManifestStats(manifest.sprites);
    manifest.updatedAt = Date.now();
  }
  return manifest;
}

/**
 * Remove a sprite from the manifest
 */
export function removeSpriteFromManifest(
  manifest: PlanetSpriteManifest,
  folderId: string
): PlanetSpriteManifest {
  manifest.sprites = manifest.sprites.filter(s => s.folderId !== folderId);
  manifest.stats = calculateManifestStats(manifest.sprites);
  manifest.updatedAt = Date.now();
  return manifest;
}

/**
 * Get sprites by category
 */
export function getSpritesByCategory(
  manifest: PlanetSpriteManifest,
  category: SpriteEntry['category']
): SpriteEntry[] {
  return manifest.sprites.filter(s => s.category === category);
}

/**
 * Get sprites by status
 */
export function getSpritesByStatus(
  manifest: PlanetSpriteManifest,
  status: SpriteEntry['status']
): SpriteEntry[] {
  return manifest.sprites.filter(s => s.status === status);
}

/**
 * Calculate manifest statistics
 */
function calculateManifestStats(sprites: SpriteEntry[]): PlanetSpriteManifest['stats'] {
  const stats: PlanetSpriteManifest['stats'] = {
    total: sprites.length,
    available: 0,
    generating: 0,
    failed: 0,
    byCategory: {},
  };

  for (const sprite of sprites) {
    // Count by status
    if (sprite.status === 'available') stats.available++;
    if (sprite.status === 'generating' || sprite.status === 'queued') stats.generating++;
    if (sprite.status === 'failed') stats.failed++;

    // Count by category
    stats.byCategory[sprite.category] = (stats.byCategory[sprite.category] || 0) + 1;
  }

  return stats;
}

/**
 * Build manifest from biosphere data
 */
export function buildManifestFromBiosphere(
  planetId: string,
  planetName: string,
  artStyle: string,
  biosphereSpecies: Array<{
    id: string;
    name: string;
    scientificName: string;
    spritePrompt?: string;
  }>,
  nicheFilling: Record<string, string[]>
): PlanetSpriteManifest {
  const manifest = createPlanetSpriteManifest(planetId, planetName, artStyle);

  for (const species of biosphereSpecies) {
    // Find which niche this species fills
    let nicheId: string | undefined;
    for (const [nId, speciesIds] of Object.entries(nicheFilling)) {
      if (speciesIds.includes(species.id)) {
        nicheId = nId;
        break;
      }
    }

    addSpriteToManifest(manifest, {
      folderId: species.id,
      name: species.name,
      category: 'species',
      size: 48, // Default size, can be overridden
      metadata: {
        nicheId,
        scientificName: species.scientificName,
        description: species.spritePrompt,
      },
    });
  }

  return manifest;
}

/**
 * Merge two manifests (for importing sprites from another planet)
 */
export function mergeManifests(
  target: PlanetSpriteManifest,
  source: PlanetSpriteManifest,
  options: { overwriteExisting?: boolean; categoryFilter?: SpriteEntry['category'][] } = {}
): PlanetSpriteManifest {
  const { overwriteExisting = false, categoryFilter } = options;

  for (const sourceSprite of source.sprites) {
    // Apply category filter if specified
    if (categoryFilter && !categoryFilter.includes(sourceSprite.category)) {
      continue;
    }

    const existingIndex = target.sprites.findIndex(s => s.folderId === sourceSprite.folderId);

    if (existingIndex >= 0) {
      if (overwriteExisting) {
        target.sprites[existingIndex] = { ...sourceSprite };
      }
      // Skip if not overwriting
    } else {
      target.sprites.push({ ...sourceSprite });
    }
  }

  target.stats = calculateManifestStats(target.sprites);
  target.updatedAt = Date.now();

  return target;
}

/**
 * Serialize manifest to JSON string
 */
export function serializeManifest(manifest: PlanetSpriteManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Deserialize manifest from JSON string
 */
export function deserializeManifest(json: string): PlanetSpriteManifest {
  const data = JSON.parse(json);

  // Validate schema
  if (data.$schema !== 'https://aivillage.dev/schemas/planet-sprite-manifest/v1') {
    console.warn('[PlanetSpriteManifest] Unknown schema version, attempting to parse anyway');
  }

  return data as PlanetSpriteManifest;
}
