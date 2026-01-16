/**
 * ExploreBehavior - Explore unvisited and ungenerated chunks
 *
 * This behavior targets unexplored territory by:
 * 1. Finding the closest ungenerated chunk (highest priority)
 * 2. Or finding the closest unvisited chunk from agent's spatial memory
 * 3. Navigating to that chunk
 * 4. After discovering enough new chunks, returning home
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'explore',
 *   behaviorState: {
 *     explorationThreshold: 5,  // Return home after 5 new chunks
 *     startChunk: { x: 10, y: 10 }  // Where exploration started (for return)
 *   }
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { getChunkVisit, recordChunkVisit } from '../components/SpatialMemoryComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import { CHUNK_SIZE } from '@ai-village/world';
import { getAssignedLocation } from '../components/AgentComponent.js';

/** How many new chunks to discover before returning home */
const DEFAULT_EXPLORATION_THRESHOLD = 5;

/** Maximum search radius for finding unexplored chunks (in chunks) */
// Reduced from 10 to 5 - prevents agents from setting targets 320+ tiles away
const MAX_SEARCH_RADIUS = 5;

/**
 * Handler function for explore behavior
 */
export function exploreBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
  const position = entity.getComponent<PositionComponent>(ComponentType.Position);
  const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

  if (!agent || !position) {
    return;
  }

  // Get or initialize exploration state
  const behaviorState = agent.behaviorState || {};
  const explorationThreshold = (behaviorState.explorationThreshold as number) || DEFAULT_EXPLORATION_THRESHOLD;
  const newChunksDiscovered = (behaviorState.newChunksDiscovered as number) || 0;
  const startChunk = behaviorState.startChunk as { x: number; y: number } | undefined;

  // Initialize start chunk if not set (where we began exploring from)
  if (!startChunk) {
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        startChunk: { x: position.chunkX, y: position.chunkY },
        newChunksDiscovered: 0,
      },
    }));
    return;
  }

  // Check if we've discovered enough chunks - time to return home
  if (newChunksDiscovered >= explorationThreshold) {
    // Find home location
    const homeLocation = getAssignedLocation(agent, 'home');

    if (homeLocation) {
      // Navigate home
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'navigate',
        behaviorState: {
          target: { x: homeLocation.x, y: homeLocation.y },
          locationName: 'home',
        },
        lastThought: `I've explored ${newChunksDiscovered} new areas. Time to head home.`,
      }));
    } else {
      // No home - just idle
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'idle',
        behaviorState: {},
        lastThought: `I've explored ${newChunksDiscovered} new areas.`,
      }));
    }
    return;
  }

  // Track if current chunk is new
  const currentChunkX = position.chunkX;
  const currentChunkY = position.chunkY;

  if (spatialMemory) {
    const chunkVisit = getChunkVisit(spatialMemory, currentChunkX, currentChunkY);

    // If this is a new chunk (first visit), increment counter
    if (!chunkVisit || chunkVisit.visitCount === 1) {
      const isNewDiscovery = !chunkVisit;
      if (isNewDiscovery) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behaviorState: {
            ...current.behaviorState,
            newChunksDiscovered: newChunksDiscovered + 1,
          },
          lastThought: `New area discovered! (${newChunksDiscovered + 1}/${explorationThreshold})`,
        }));
      }
    }
  }

  // Find target chunk to explore
  const targetChunk = findNextExplorationTarget(entity, world, position, spatialMemory);

  if (!targetChunk) {
    // No unexplored chunks found - switch to wander or return home
    const homeLocation = getAssignedLocation(agent, 'home');

    if (homeLocation) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'navigate',
        behaviorState: {
          target: { x: homeLocation.x, y: homeLocation.y },
          locationName: 'home',
        },
        lastThought: "I've explored everything nearby. Heading home.",
      }));
    } else {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
        lastThought: "I've explored everything nearby.",
      }));
    }
    return;
  }

  // Navigate to target chunk (center)
  const targetX = (targetChunk.chunkX * CHUNK_SIZE) + (CHUNK_SIZE / 2);
  const targetY = (targetChunk.chunkY * CHUNK_SIZE) + (CHUNK_SIZE / 2);

  // Set navigate behavior to target
  entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
    ...current,
    behavior: 'navigate',
    behaviorState: {
      target: { x: targetX, y: targetY },
      explorationTarget: true,
      explorationThreshold,
      newChunksDiscovered,
      startChunk,
    },
    lastThought: `Exploring chunk (${targetChunk.chunkX}, ${targetChunk.chunkY})`,
  }));
}

/**
 * Find the next chunk to explore
 * Priority:
 * 1. Closest ungenerated chunk
 * 2. Closest unvisited chunk (not in agent's spatial memory)
 */
function findNextExplorationTarget(
  entity: EntityImpl,
  world: World,
  position: PositionComponent,
  spatialMemory: SpatialMemoryComponent | undefined
): { chunkX: number; chunkY: number } | null {
  const currentChunkX = position.chunkX;
  const currentChunkY = position.chunkY;

  const chunkManager = world.getChunkManager();
  if (!chunkManager) {
    return null; // No chunk manager - can't find chunks
  }

  let closestUngenerated: { chunkX: number; chunkY: number; distance: number } | null = null;
  let closestUnvisited: { chunkX: number; chunkY: number; distance: number } | null = null;

  // Search in expanding spiral
  for (let radius = 1; radius <= MAX_SEARCH_RADIUS; radius++) {
    // Search perimeter of current radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check perimeter (not interior)
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }

        const chunkX = currentChunkX + dx;
        const chunkY = currentChunkY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if chunk is generated
        const hasChunk = chunkManager.hasChunk(chunkX, chunkY);

        if (!hasChunk) {
          // Ungenerated chunk - highest priority
          if (!closestUngenerated || distance < closestUngenerated.distance) {
            closestUngenerated = { chunkX, chunkY, distance };
          }
        } else if (spatialMemory) {
          // Check if agent has visited this chunk
          const chunkVisit = getChunkVisit(spatialMemory, chunkX, chunkY);

          if (!chunkVisit) {
            // Unvisited chunk
            if (!closestUnvisited || distance < closestUnvisited.distance) {
              closestUnvisited = { chunkX, chunkY, distance };
            }
          }
        }
      }
    }

    // If we found an ungenerated chunk at this radius, return it immediately
    // (prioritize ungenerated over unvisited)
    if (closestUngenerated) {
      const result: { chunkX: number; chunkY: number; distance: number } = closestUngenerated;
      return {
        chunkX: result.chunkX,
        chunkY: result.chunkY,
      };
    }

    // If we found an unvisited chunk at this radius, return it
    if (closestUnvisited) {
      const result: { chunkX: number; chunkY: number; distance: number } = closestUnvisited;
      return {
        chunkX: result.chunkX,
        chunkY: result.chunkY,
      };
    }
  }

  // No unexplored chunks found within search radius
  return null;
}
