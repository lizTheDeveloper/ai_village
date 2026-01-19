/**
 * Queue Biosphere Sprites - Adds generated species to PixelLab sprite queue
 *
 * Integrates with the existing PixelLab daemon to generate sprites for
 * all species in a biosphere.
 */

import type { BiosphereData, SizeClass } from './BiosphereTypes.js';
import fs from 'fs';
import path from 'path';

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
 */
export async function queueBiosphereSprites(
  biosphere: BiosphereData,
  queuePath: string = path.join(process.cwd(), 'sprite-generation-queue.json')
): Promise<void> {
  console.log(`[queueBiosphereSprites] Queuing ${biosphere.species.length} species sprites...`);

  // Load existing queue
  let queue: SpriteQueue;
  try {
    const queueData = fs.readFileSync(queuePath, 'utf8');
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

    // Determine sprite size from size class
    const size = getSpriteSize((species as any).sizeClass);

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
        nicheId: (species as any).nicheId || 'unknown',
        speciesName: species.name,
        scientificName: species.scientificName,
      },
    };

    queue.sprites.push(entry);
    addedCount++;
  }

  // Save updated queue
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

  console.log(`[queueBiosphereSprites] Added ${addedCount} new species to sprite queue`);
  console.log(`[queueBiosphereSprites] Total queue size: ${queue.sprites.length}`);
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
 * Get queue statistics
 */
export function getQueueStats(
  queuePath: string = path.join(process.cwd(), 'sprite-generation-queue.json')
): {
  total: number;
  queued: number;
  processing: number;
  complete: number;
  failed: number;
  byPlanet: Record<string, number>;
} {
  try {
    const queueData = fs.readFileSync(queuePath, 'utf8');
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
