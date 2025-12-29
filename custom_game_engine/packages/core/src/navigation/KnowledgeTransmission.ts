/**
 * KnowledgeTransmission - Ties together speech parsing and hearsay memory
 *
 * This module provides the integration layer that:
 * 1. Processes heard speech through the speech parser
 * 2. Updates hearsay memory with extracted resource info
 * 3. Updates map knowledge when agents verify/discover resources
 *
 * Usage in CommunicationSystem:
 * ```typescript
 * // When an agent hears speech from another agent:
 * processHeardSpeech(
 *   listenerMemory,
 *   speakerAgentId,
 *   speakerAgentName,
 *   speakerPosition,
 *   speechText,
 *   currentTick
 * );
 * ```
 */

import type { HearsayMemoryComponent } from './HearsayMemory.js';
import { addHearsay, getTrustScore } from './HearsayMemory.js';
import { getMapKnowledge, worldToSector, type AreaResourceType } from './MapKnowledge.js';
import { parseResourceMentions, isResourceAnnouncement, vectorToCardinal } from './SpeechParser.js';

/**
 * Process speech heard by an agent and update their hearsay memory.
 * Called by CommunicationSystem when speech is within hearing range.
 */
export function processHeardSpeech(
  listenerMemory: HearsayMemoryComponent,
  speakerAgentId: string,
  speakerAgentName: string,
  speakerPosition: { x: number; y: number },
  speechText: string,
  currentTick: number
): void {
  // Only process if it looks like a resource announcement
  if (!isResourceAnnouncement(speechText)) {
    return;
  }

  // Parse resource mentions from speech
  const mentions = parseResourceMentions(speechText);

  for (const mention of mentions) {
    // Skip low-confidence or negative mentions (depletions handled separately)
    if (mention.confidence < 0.5) continue;

    if (mention.isPositive) {
      // Add positive hearsay: "Alice said food is north"
      addHearsay(
        listenerMemory,
        mention.resourceType,
        mention.direction,
        mention.distance,
        speakerAgentId,
        speakerAgentName,
        speakerPosition,
        currentTick
      );
    }
    // Negative mentions could update trust differently or mark areas as depleted
    // For now, we just don't add them as hearsay (they're warnings, not tips)
  }
}

/**
 * Record a resource discovery by an agent.
 * Updates both MapKnowledge (world-level) and can broadcast to others.
 *
 * Returns a suggested announcement string for the agent to speak.
 */
export function recordResourceDiscovery(
  agentPosition: { x: number; y: number },
  resourceType: AreaResourceType,
  resourcePosition: { x: number; y: number },
  abundance: number,
  currentTick: number
): string {
  // Update map knowledge (world learns)
  const mapKnowledge = getMapKnowledge();
  mapKnowledge.recordResourceSighting(resourcePosition.x, resourcePosition.y, resourceType, abundance, currentTick);

  // Calculate direction from agent to resource
  const dx = resourcePosition.x - agentPosition.x;
  const dy = resourcePosition.y - agentPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const direction = vectorToCardinal(dx, dy);
  const distanceDesc = distance < 30 ? 'close' : distance < 70 ? 'medium' : 'far';

  // Generate announcement for agent to speak
  if (distanceDesc === 'close') {
    return `Found ${resourceType} ${direction === 'nearby' ? 'right here' : `to the ${direction}`}!`;
  } else {
    return `There's ${resourceType} ${distanceDesc === 'far' ? 'far ' : ''}to the ${direction}.`;
  }
}

/**
 * Record resource depletion (agent went to location, found nothing).
 * Updates map knowledge and can broadcast warning.
 */
export function recordResourceDepletion(
  agentPosition: { x: number; y: number },
  resourceType: AreaResourceType,
  currentTick: number
): string {
  // Update map knowledge (world learns area is depleted)
  const mapKnowledge = getMapKnowledge();
  mapKnowledge.recordResourceDepletion(agentPosition.x, agentPosition.y, resourceType, currentTick);

  // Get area description for announcement
  const { sectorX, sectorY } = worldToSector(agentPosition.x, agentPosition.y);
  const sector = mapKnowledge.getSector(sectorX, sectorY);

  const areaName = sector.areaName ?? 'this area';
  return `The ${resourceType} in ${areaName} is gone.`;
}

/**
 * Verify hearsay and update trust.
 * Called when an agent reaches a location and can check if resource is there.
 */
export function verifyHearsayAtLocation(
  listenerMemory: HearsayMemoryComponent,
  _listenerPosition: { x: number; y: number }, // Reserved for future distance-based trust
  hearsayIndex: number,
  foundResource: boolean,
  currentTick: number
): void {
  const hearsay = listenerMemory.hearsay[hearsayIndex];
  if (!hearsay) return;

  // Mark as verified
  hearsay.verified = true;
  hearsay.verificationResult = foundResource;

  // Update trust based on result
  const trustChange = foundResource ? 0.1 : -0.15;
  const currentTrust = getTrustScore(listenerMemory, hearsay.sourceAgentId);
  const newTrust = Math.max(0.1, Math.min(1.0, currentTrust + trustChange));

  // Update trust rating
  let rating = listenerMemory.trustRatings.get(hearsay.sourceAgentId);
  if (!rating) {
    rating = {
      agentId: hearsay.sourceAgentId,
      agentName: hearsay.sourceAgentName,
      score: listenerMemory.defaultTrust,
      successCount: 0,
      failureCount: 0,
      lastUpdated: currentTick,
    };
    listenerMemory.trustRatings.set(hearsay.sourceAgentId, rating);
  }

  rating.score = newTrust;
  rating.lastUpdated = currentTick;

  if (foundResource) {
    rating.successCount++;
  } else {
    rating.failureCount++;
  }
}

/**
 * Record agent movement between sectors (for worn paths).
 * Called by MovementSystem when an agent moves.
 */
export function recordMovement(
  previousPosition: { x: number; y: number },
  newPosition: { x: number; y: number },
  currentTick: number
): void {
  const mapKnowledge = getMapKnowledge();
  mapKnowledge.recordTraversal(previousPosition.x, previousPosition.y, newPosition.x, newPosition.y, currentTick);
}

/**
 * Get best resource location for an agent based on:
 * 1. Their personal hearsay (trust-weighted)
 * 2. Map-level knowledge (shared world knowledge)
 *
 * Returns null if no known locations.
 */
export function getBestResourceLocation(
  agentPosition: { x: number; y: number },
  agentMemory: HearsayMemoryComponent,
  resourceType: AreaResourceType,
  currentTick: number
): { direction: string; distance: 'close' | 'medium' | 'far'; confidence: number; source: 'hearsay' | 'map' } | null {
  // First, check hearsay (social knowledge)
  const hearsayResults = agentMemory.hearsay
    .filter(
      (h) =>
        h.resourceType === resourceType &&
        !h.verified && // Not yet verified
        currentTick - h.heardAt < 500 // Not too old
    )
    .map((h) => ({
      direction: h.direction,
      distance: h.distance,
      confidence: getTrustScore(agentMemory, h.sourceAgentId) * (1 - (currentTick - h.heardAt) / 500),
      source: 'hearsay' as const,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const topHearsay = hearsayResults[0];
  if (topHearsay && topHearsay.confidence > 0.4) {
    return topHearsay;
  }

  // Fall back to map knowledge (world knowledge)
  const mapKnowledge = getMapKnowledge();
  const mapResults = mapKnowledge.findResourceAreas(resourceType, agentPosition.x, agentPosition.y, 3);

  const best = mapResults[0];
  if (best) {
    const distanceDesc: 'close' | 'medium' | 'far' = best.distance < 2 ? 'close' : best.distance < 5 ? 'medium' : 'far';

    return {
      direction: best.direction,
      distance: distanceDesc,
      confidence: best.abundance / 100,
      source: 'map',
    };
  }

  return null;
}

/**
 * Generate a context string for LLM about what the agent knows regarding resources.
 * For inclusion in agent prompts.
 */
export function generateResourceKnowledgeContext(
  agentPosition: { x: number; y: number },
  agentMemory: HearsayMemoryComponent,
  currentTick: number
): string {
  const lines: string[] = ['What you know about resource locations:'];

  const resourceTypes: AreaResourceType[] = ['food', 'wood', 'stone', 'water'];

  for (const resourceType of resourceTypes) {
    const best = getBestResourceLocation(agentPosition, agentMemory, resourceType, currentTick);

    if (best) {
      const sourceDesc = best.source === 'hearsay' ? '(someone told you)' : '(known area)';
      const confidenceDesc = best.confidence > 0.7 ? 'likely' : best.confidence > 0.4 ? 'possibly' : 'maybe';
      lines.push(`- ${resourceType}: ${confidenceDesc} ${best.distance} to the ${best.direction} ${sourceDesc}`);
    } else {
      lines.push(`- ${resourceType}: unknown (need to explore or ask others)`);
    }
  }

  return lines.join('\n');
}
