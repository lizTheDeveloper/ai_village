/**
 * Queue Biosphere Sprites - Adds generated species to PixelLab sprite queue
 *
 * Integrates with the existing PixelLab daemon to generate sprites for
 * all species in a biosphere.
 */

import type { BiosphereData, SizeClass } from './BiosphereTypes.js';
import {
  type PlanetSpriteManifest,
  createPlanetSpriteManifest,
  addSpriteToManifest,
  serializeManifest,
} from '../planet/PlanetSpriteManifest.js';

interface SpriteQueueEntry {
  folderId: string;
  description: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  queuedAt: number;
  options: {
    type: 'animal';
    size: number;
  };
  metadata?: {
    planetId: string;
    planetName: string;
    artStyle: string;
    nicheId: string;
    speciesName: string;
    scientificName: string;
  };
}

interface SpriteQueue {
  sprites: SpriteQueueEntry[];
}

/**
 * Queue all species from a biosphere for sprite generation
 * Also creates a PlanetSpriteManifest for tracking per-planet sprites.
 *
 * @returns The created PlanetSpriteManifest (in browser mode returns a manifest but doesn't write queue)
 */
export async function queueBiosphereSprites(
  biosphere: BiosphereData,
  queuePath?: string
): Promise<PlanetSpriteManifest> {
  // Create the planet sprite manifest regardless of environment
  const manifest = createPlanetSpriteManifest(
    biosphere.planet.id,
    biosphere.planet.name,
    biosphere.artStyle
  );

  console.log(`[queueBiosphereSprites] Processing ${biosphere.species.length} species sprites...`);

  // Build manifest entries for all species
  for (const species of biosphere.species) {
    // Find which niche this species fills
    let nicheId = 'unknown';
    for (const [nId, speciesIds] of Object.entries(biosphere.nicheFilling)) {
      if (speciesIds.includes(species.id)) {
        nicheId = nId;
        break;
      }
    }

    // Get size class from the niche
    const niche = biosphere.niches.find(n => n.id === nicheId);
    const sizeClass = niche?.sizeClass ?? 'medium';
    const size = getSpriteSize(sizeClass);

    // Add to manifest
    addSpriteToManifest(manifest, {
      folderId: species.id,
      name: species.name,
      category: 'species',
      status: 'queued',
      size,
      metadata: {
        nicheId,
        scientificName: species.scientificName,
        description: species.spritePrompt,
      },
    });
  }

  // Browser compatibility: Skip file system operations in browser
  if (typeof window !== 'undefined') {
    console.log('[queueBiosphereSprites] Browser mode - returning manifest without file writes');
    return manifest;
  }

  // Dynamic imports for Node.js modules (only in server environment)
  const fs = await import('fs');
  const path = await import('path');

  // Use default path in Node.js environment
  const finalPath = queuePath || path.join(process.cwd(), 'sprite-generation-queue.json');

  // Load existing queue
  let queue: SpriteQueue;
  try {
    const queueData = fs.readFileSync(finalPath, 'utf8');
    queue = JSON.parse(queueData);
  } catch (error) {
    // Create new queue if doesn't exist
    queue = { sprites: [] };
  }

  const existingIds = new Set(queue.sprites.map(s => s.folderId));
  let addedCount = 0;

  // Add each species to queue
  for (const species of biosphere.species) {
    // Skip if already in queue
    if (existingIds.has(species.id)) {
      console.log(`[queueBiosphereSprites] Skipping ${species.id} (already in queue)`);
      continue;
    }

    // Biosphere species is mapped through nicheFilling, we can look up the niche from there
    let nicheId = 'unknown';
    for (const [nId, speciesIds] of Object.entries(biosphere.nicheFilling)) {
      if (speciesIds.includes(species.id)) {
        nicheId = nId;
        break;
      }
    }

    // Get size class from the niche
    const niche = biosphere.niches.find(n => n.id === nicheId);
    const sizeClass = niche?.sizeClass ?? 'medium';
    const size = getSpriteSize(sizeClass);

    // Create queue entry
    const entry: SpriteQueueEntry = {
      folderId: species.id,
      description: species.spritePrompt,
      status: 'queued',
      queuedAt: Date.now(),
      options: {
        type: 'animal',
        size,
      },
      metadata: {
        planetId: biosphere.planet.id,
        planetName: biosphere.planet.name,
        artStyle: biosphere.artStyle,
        nicheId,
        speciesName: species.name,
        scientificName: species.scientificName,
      },
    };

    queue.sprites.push(entry);
    addedCount++;
  }

  // Save updated queue
  fs.writeFileSync(finalPath, JSON.stringify(queue, null, 2));

  // Save planet sprite manifest alongside queue
  const manifestPath = path.join(path.dirname(finalPath), `planet-sprites-${biosphere.planet.id}.json`);
  fs.writeFileSync(manifestPath, serializeManifest(manifest));

  console.log(`[queueBiosphereSprites] Added ${addedCount} new species to sprite queue`);
  console.log(`[queueBiosphereSprites] Total queue size: ${queue.sprites.length}`);
  console.log(`[queueBiosphereSprites] Manifest saved: ${manifestPath}`);

  return manifest;
}

/**
 * Get sprite pixel size from size class
 */
function getSpriteSize(sizeClass: SizeClass): number {
  const sizeMap: Record<SizeClass, number> = {
    'microscopic': 16,
    'tiny': 24,
    'small': 32,
    'medium': 48,
    'large': 64,
    'megafauna': 96,
  };

  return sizeMap[sizeClass] ?? 48;
}

/**
 * Load a planet sprite manifest from file
 */
export async function loadPlanetSpriteManifest(
  planetId: string,
  basePath?: string
): Promise<PlanetSpriteManifest | null> {
  // Browser compatibility: Return null in browser
  if (typeof window !== 'undefined') {
    console.log('[loadPlanetSpriteManifest] Not available in browser mode');
    return null;
  }

  const fs = await import('fs');
  const path = await import('path');

  const finalBasePath = basePath || process.cwd();
  const manifestPath = path.join(finalBasePath, `planet-sprites-${planetId}.json`);

  try {
    const data = fs.readFileSync(manifestPath, 'utf8');
    const { deserializeManifest } = await import('../planet/PlanetSpriteManifest.js');
    return deserializeManifest(data);
  } catch (error) {
    console.log(`[loadPlanetSpriteManifest] No manifest found for planet ${planetId}`);
    return null;
  }
}

/**
 * List all planet sprite manifests
 */
export async function listPlanetSpriteManifests(
  basePath?: string
): Promise<Array<{ planetId: string; path: string }>> {
  // Browser compatibility: Return empty array in browser
  if (typeof window !== 'undefined') {
    return [];
  }

  const fs = await import('fs');
  const path = await import('path');

  const finalBasePath = basePath || process.cwd();

  try {
    const files = fs.readdirSync(finalBasePath);
    const manifests: Array<{ planetId: string; path: string }> = [];

    for (const file of files) {
      const match = file.match(/^planet-sprites-(.+)\.json$/);
      if (match) {
        manifests.push({
          planetId: match[1]!,
          path: path.join(finalBasePath, file),
        });
      }
    }

    return manifests;
  } catch (error) {
    return [];
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats(
  queuePath?: string
): {
  total: number;
  queued: number;
  processing: number;
  complete: number;
  failed: number;
  byPlanet: Record<string, number>;
} {
  // Browser compatibility: Return empty stats in browser
  if (typeof window !== 'undefined') {
    return {
      total: 0,
      queued: 0,
      processing: 0,
      complete: 0,
      failed: 0,
      byPlanet: {},
    };
  }

  // Dynamic imports for Node.js modules (only in server environment)
  // Note: This is a sync function, so we can't use await here
  // We'll use require instead for synchronous loading
  const fs = require('fs');
  const path = require('path');

  // Use default path in Node.js environment
  const finalPath = queuePath || path.join(process.cwd(), 'sprite-generation-queue.json');

  try {
    const queueData = fs.readFileSync(finalPath, 'utf8');
    const queue: SpriteQueue = JSON.parse(queueData);

    const stats = {
      total: queue.sprites.length,
      queued: 0,
      processing: 0,
      complete: 0,
      failed: 0,
      byPlanet: {} as Record<string, number>,
    };

    for (const sprite of queue.sprites) {
      // Count by status
      if (sprite.status === 'queued') stats.queued++;
      if (sprite.status === 'processing') stats.processing++;
      if (sprite.status === 'complete') stats.complete++;
      if (sprite.status === 'failed') stats.failed++;

      // Count by planet
      const planetId = sprite.metadata?.planetId || 'unknown';
      stats.byPlanet[planetId] = (stats.byPlanet[planetId] || 0) + 1;
    }

    return stats;
  } catch (error) {
    return {
      total: 0,
      queued: 0,
      processing: 0,
      complete: 0,
      failed: 0,
      byPlanet: {},
    };
  }
}
