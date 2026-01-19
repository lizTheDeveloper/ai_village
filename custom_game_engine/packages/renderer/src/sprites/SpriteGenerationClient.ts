/**
 * Client-side sprite generation requester
 *
 * Sends requests to the server to generate missing sprites via PixelLab API.
 * The server handles the actual API calls and saves sprites to disk.
 */

import type { SpriteTraits } from './SpriteRegistry.js';
import { markSpriteAvailable, markSpriteMissing } from './SpriteService.js';

// Track map object sprites that have been requested to avoid duplicates
const requestedMapObjects = new Set<string>();

interface GenerationRequest {
  folderId: string;
  traits: SpriteTraits;
  description: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  requestedAt: number;
  completedAt?: number;
}

// Track active generation requests
const activeRequests = new Map<string, GenerationRequest>();

// Server endpoint for sprite generation
const GENERATION_ENDPOINT = '/api/sprites/generate';

/**
 * Request sprite generation from the server
 */
export async function requestSpriteGeneration(
  folderId: string,
  traits: SpriteTraits,
  description: string
): Promise<void> {
  // Check if already requested
  if (activeRequests.has(folderId)) {
    return;
  }

  const request: GenerationRequest = {
    folderId,
    traits,
    description,
    status: 'pending',
    requestedAt: Date.now(),
  };

  activeRequests.set(folderId, request);

  try {
    // Send generation request to server
    const response = await fetch(GENERATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderId,
        traits,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'queued' || result.status === 'generating') {
      request.status = 'generating';
      // Poll for completion
      pollGenerationStatus(folderId);
    } else if (result.status === 'complete') {
      request.status = 'complete';
      request.completedAt = Date.now();
      markSpriteAvailable(folderId);
      activeRequests.delete(folderId);
    }
  } catch (error) {
    request.status = 'failed';
    markSpriteMissing(folderId);
    activeRequests.delete(folderId);
    throw error;
  }
}

/**
 * Poll server for generation completion
 */
async function pollGenerationStatus(folderId: string): Promise<void> {
  const request = activeRequests.get(folderId);
  if (!request) return;

  const maxPolls = 60; // Poll for up to 5 minutes (60 * 5 seconds)
  let polls = 0;

  const poll = async () => {
    if (polls >= maxPolls) {
      request.status = 'failed';
      activeRequests.delete(folderId);
      return;
    }

    polls++;

    try {
      const response = await fetch(`${GENERATION_ENDPOINT}/status/${folderId}`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'complete') {
        request.status = 'complete';
        request.completedAt = Date.now();
        markSpriteAvailable(folderId);
        activeRequests.delete(folderId);
      } else if (result.status === 'failed') {
        request.status = 'failed';
        markSpriteMissing(folderId);
        activeRequests.delete(folderId);
      } else {
        // Still generating, poll again in 5 seconds
        setTimeout(poll, 5000);
      }
    } catch (error) {
      request.status = 'failed';
      activeRequests.delete(folderId);
    }
  };

  // Start polling after 5 seconds
  setTimeout(poll, 5000);
}

/**
 * Get status of all active generation requests
 */
export function getActiveRequests(): GenerationRequest[] {
  return Array.from(activeRequests.values());
}

/**
 * Check if a sprite is currently being generated
 */
export function isGenerating(folderId: string): boolean {
  const request = activeRequests.get(folderId);
  return request?.status === 'generating' || request?.status === 'pending';
}

/**
 * Cancel a generation request
 */
export function cancelGeneration(folderId: string): void {
  activeRequests.delete(folderId);
}

/**
 * Request generation of a map object sprite (plant, item, animal)
 * Automatically generates appropriate description based on sprite ID
 */
export async function requestMapObjectGeneration(spriteId: string): Promise<void> {
  // Avoid duplicate requests
  if (requestedMapObjects.has(spriteId) || activeRequests.has(spriteId)) {
    return;
  }

  requestedMapObjects.add(spriteId);

  // Generate description based on sprite ID
  const description = generateMapObjectDescription(spriteId);

  // Determine sprite type and options
  const options = determineMapObjectOptions(spriteId);

  try {
    const response = await fetch(GENERATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderId: spriteId,
        description,
        // Server expects traits field for metadata
        traits: {
          spriteType: options.type, // 'plant', 'animal', or 'map_object'
          size: options.size,
          view: 'high top-down',
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[SpriteGen] Failed to queue ${spriteId}: ${response.status}`);
      requestedMapObjects.delete(spriteId);
      return;
    }

    console.log(`[SpriteGen] Queued map object sprite: ${spriteId}`);
  } catch (error) {
    console.error(`[SpriteGen] Error queuing ${spriteId}:`, error);
    requestedMapObjects.delete(spriteId);
  }
}

/**
 * Generate a description for map object sprites based on their ID
 */
function generateMapObjectDescription(spriteId: string): string {
  // Plants
  const plantDescriptions: Record<string, string> = {
    'clover': 'White clover plant with three-leaf clusters and small white flowers, pixel art, top-down view, transparent background',
    'moss': 'Soft green moss patch with texture detail, pixel art, top-down view, transparent background',
    'fern': 'Green fern plant with delicate fronds, pixel art, top-down view, transparent background',
    'wild-garlic': 'Wild garlic plant with long green leaves, pixel art, top-down view, transparent background',
    'thistle': 'Purple thistle flower with spiky leaves, pixel art, top-down view, transparent background',
    'wild-onion': 'Wild onion plant with thin green stalks, pixel art, top-down view, transparent background',
    'elderberry': 'Elderberry bush with dark purple berries in clusters, pixel art, top-down view, transparent background',
    'yarrow': 'Yarrow plant with white flower clusters and feathery leaves, pixel art, top-down view, transparent background',
    'blueberry-bush': 'Blueberry bush with dark blue berries, pixel art, top-down view, transparent background',
    'raspberry-bush': 'Raspberry bush with red berries, pixel art, top-down view, transparent background',
  };

  // Animals (for map object rendering)
  const animalDescriptions: Record<string, string> = {
    'rabbit_white': 'White rabbit with fluffy tail, pixel art, game sprite, 48x48',
    'chicken_brown': 'Brown chicken with red comb, pixel art, game sprite, 48x48',
  };

  // Items
  const itemDescriptions: Record<string, string> = {
    'bedroll': 'Rolled up bedroll for camping, brown fabric tied with rope, pixel art, top-down view, 32x32, transparent background',
    'campfire': 'Campfire with burning logs and orange flames, pixel art, top-down view, 32x32, transparent background',
  };

  // Check each category
  if (plantDescriptions[spriteId]) {
    return plantDescriptions[spriteId];
  }
  if (animalDescriptions[spriteId]) {
    return animalDescriptions[spriteId];
  }
  if (itemDescriptions[spriteId]) {
    return itemDescriptions[spriteId];
  }

  // Generic fallback
  const cleanName = spriteId.replace(/-/g, ' ').replace(/_/g, ' ');
  return `${cleanName}, pixel art, top-down view, transparent background`;
}

/**
 * Determine sprite type and size options for map objects
 */
function determineMapObjectOptions(spriteId: string): { type: string; size: number } {
  // Animals
  if (spriteId.includes('rabbit') || spriteId.includes('chicken') || spriteId.includes('bird')) {
    return { type: 'animal', size: 48 };
  }

  // Items
  if (spriteId === 'bedroll' || spriteId === 'campfire') {
    return { type: 'map_object', size: 32 };
  }

  // Default to plant
  return { type: 'plant', size: 32 };
}
