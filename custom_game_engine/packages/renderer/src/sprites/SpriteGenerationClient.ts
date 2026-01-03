/**
 * Client-side sprite generation requester
 *
 * Sends requests to the server to generate missing sprites via PixelLab API.
 * The server handles the actual API calls and saves sprites to disk.
 */

import type { SpriteTraits } from './SpriteRegistry.js';
import { markSpriteAvailable, markSpriteMissing } from './SpriteService.js';

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
