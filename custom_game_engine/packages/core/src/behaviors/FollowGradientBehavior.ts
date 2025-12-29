/**
 * FollowGradientBehavior - Follow social gradients to resources
 *
 * This behavior uses knowledge from hearsay ("Alice said food is north")
 * to navigate toward resources. It:
 *
 * 1. Queries HearsayMemory for resource hints
 * 2. Weights by trust (trusted agents' info matters more)
 * 3. Falls back to MapKnowledge for world-level resource areas
 * 4. Explores if no information is available
 *
 * The "berries up north" transmission pattern in action.
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'follow_gradient',
 *   behaviorState: { resourceType: 'food' }
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import { type HearsayMemoryComponent } from '../navigation/HearsayMemory.js';
import {
  getBestResourceLocation,
  verifyHearsayAtLocation,
  recordResourceDiscovery,
} from '../navigation/KnowledgeTransmission.js';
import { cardinalToVector, distanceToTiles } from '../navigation/SpeechParser.js';
import { type AreaResourceType } from '../navigation/MapKnowledge.js';

/** Distance at which we consider ourselves "at" the location */
const ARRIVAL_THRESHOLD = 15;

/** How long to search an area before giving up (ticks) */
const SEARCH_TIMEOUT = 100;

/**
 * Handler function for follow_gradient behavior
 */
export function followGradientBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>('agent');
  const position = entity.getComponent<PositionComponent>('position');
  const movement = entity.getComponent<MovementComponent>('movement');

  if (!agent || !position || !movement) {
    return;
  }

  const behaviorState = agent.behaviorState || {};
  const resourceType = (behaviorState.resourceType as AreaResourceType) || 'food';

  // Get hearsay memory
  const hearsayMemory = entity.getComponent('hearsay_memory') as HearsayMemoryComponent | null;

  if (!hearsayMemory) {
    // No hearsay memory - just explore
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'explore_frontier',
      behaviorState: {},
      lastThought: `I don't know where to find ${resourceType}. I'll explore.`,
    }));
    return;
  }

  // Check if we're already following a direction
  const currentTarget = behaviorState.targetPosition as { x: number; y: number } | undefined;
  const followStartTick = behaviorState.followStartTick as number | undefined;
  const followingHearsayIndex = behaviorState.followingHearsayIndex as number | undefined;

  if (currentTarget && followStartTick !== undefined) {
    const dx = currentTarget.x - position.x;
    const dy = currentTarget.y - position.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

    // Check if we've arrived at the target area
    if (distanceToTarget < ARRIVAL_THRESHOLD) {
      // We're in the target area - look for the resource
      const foundResource = checkForResource(entity, world, resourceType);

      if (foundResource) {
        // Found it! Verify the hearsay and announce discovery
        if (followingHearsayIndex !== undefined) {
          verifyHearsayAtLocation(hearsayMemory, position, followingHearsayIndex, true, world.tick);
        }

        // Announce the discovery
        const announcement = recordResourceDiscovery(
          position,
          resourceType,
          foundResource.position,
          foundResource.abundance,
          world.tick
        );

        // Set agent speech
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          recentSpeech: announcement,
          behavior: 'gather',
          behaviorState: { targetId: foundResource.entityId },
          lastThought: `I found the ${resourceType}!`,
        }));
        return;
      }

      // Check for timeout
      const searchTime = world.tick - followStartTick;
      if (searchTime > SEARCH_TIMEOUT) {
        // Didn't find it - verify as false if following hearsay
        if (followingHearsayIndex !== undefined) {
          verifyHearsayAtLocation(hearsayMemory, position, followingHearsayIndex, false, world.tick);
        }

        // Clear target and try again
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behaviorState: {
            ...current.behaviorState,
            targetPosition: undefined,
            followStartTick: undefined,
            followingHearsayIndex: undefined,
          },
          lastThought: `I couldn't find ${resourceType} here. I'll look elsewhere.`,
        }));
        return;
      }

      // Still searching - wander in the area
      wanderLocally(entity, movement);
      return;
    }

    // Still moving toward target
    moveToward(entity, position, currentTarget, movement);
    return;
  }

  // No current target - find one from social knowledge
  const resourceLocation = getBestResourceLocation(position, hearsayMemory, resourceType, world.tick);

  if (!resourceLocation) {
    // No gradient information - explore instead
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'explore_frontier',
      behaviorState: {},
      lastThought: `I don't know where to find ${resourceType}. I'll explore.`,
    }));
    return;
  }

  // Calculate target position from direction and distance
  const vector = cardinalToVector(resourceLocation.direction as any);
  const distance = distanceToTiles(resourceLocation.distance);

  const targetX = position.x + vector.dx * distance;
  const targetY = position.y + vector.dy * distance;

  // Find hearsay index if from hearsay source
  let hearsayIndex: number | undefined;
  if (resourceLocation.source === 'hearsay') {
    // Find the matching hearsay entry
    for (let i = 0; i < hearsayMemory.hearsay.length; i++) {
      const h = hearsayMemory.hearsay[i];
      if (!h) continue;
      if (
        h.resourceType === resourceType &&
        h.direction === resourceLocation.direction &&
        !h.verified
      ) {
        hearsayIndex = i;
        break;
      }
    }
  }

  // Set target and start following
  entity.updateComponent<AgentComponent>('agent', (current) => ({
    ...current,
    behaviorState: {
      ...current.behaviorState,
      targetPosition: { x: targetX, y: targetY },
      followStartTick: world.tick,
      followingHearsayIndex: hearsayIndex,
    },
    lastThought:
      resourceLocation.source === 'hearsay'
        ? `Someone told me ${resourceType} is ${resourceLocation.distance} to the ${resourceLocation.direction}`
        : `I remember ${resourceType} is ${resourceLocation.distance} to the ${resourceLocation.direction}`,
  }));

  // Start moving
  moveToward(entity, position, { x: targetX, y: targetY }, movement);
}

/**
 * Move toward a target position
 */
function moveToward(
  entity: EntityImpl,
  position: PositionComponent,
  target: { x: number; y: number },
  movement: MovementComponent
): void {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1) {
    return;
  }

  const velocityX = (dx / distance) * movement.speed;
  const velocityY = (dy / distance) * movement.speed;

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX,
    velocityY,
  }));
}

/**
 * Wander locally while searching for resource
 */
function wanderLocally(entity: EntityImpl, movement: MovementComponent): void {
  const angle = Math.random() * 2 * Math.PI;
  const velocityX = Math.cos(angle) * movement.speed * 0.3;
  const velocityY = Math.sin(angle) * movement.speed * 0.3;

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX,
    velocityY,
  }));
}

/**
 * Check if the resource is visible nearby
 */
function checkForResource(
  entity: EntityImpl,
  world: World,
  resourceType: AreaResourceType
): { entityId: string; position: { x: number; y: number }; abundance: number } | null {
  const vision = entity.getComponent('vision') as any;
  if (!vision) {
    return null;
  }

  // Check seen resources
  const seenResources = vision.seenResources as string[] | undefined;
  if (!seenResources || seenResources.length === 0) {
    return null;
  }

  // Map area resource types to specific resource types
  const matchingTypes: Record<AreaResourceType, string[]> = {
    food: ['berry', 'berries', 'fruit', 'apple', 'wheat', 'carrot', 'food'],
    wood: ['wood', 'log', 'timber', 'tree'],
    stone: ['stone', 'rock', 'boulder'],
    water: ['water'],
    minerals: ['iron', 'copper', 'gold', 'ore'],
  };

  const validTypes = matchingTypes[resourceType] || [];

  for (const resourceId of seenResources) {
    const resource = world.getEntity(resourceId);
    if (!resource) continue;

    const resourceImpl = resource as EntityImpl;
    const resourceComp = resourceImpl.getComponent('resource') as any;
    const resourcePos = resourceImpl.getComponent('position') as PositionComponent;

    if (!resourceComp || !resourcePos) continue;

    // Check if resource type matches
    const type = (resourceComp.resourceType || '').toLowerCase();
    if (validTypes.some((t) => type.includes(t))) {
      return {
        entityId: resourceId,
        position: { x: resourcePos.x, y: resourcePos.y },
        abundance: resourceComp.amount || 100,
      };
    }
  }

  // Also check seen plants for food
  if (resourceType === 'food') {
    const seenPlants = vision.seenPlants as string[] | undefined;
    if (seenPlants) {
      for (const plantId of seenPlants) {
        const plant = world.getEntity(plantId);
        if (!plant) continue;

        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent('plant') as any;
        const plantPos = plantImpl.getComponent('position') as PositionComponent;

        if (!plantComp || !plantPos) continue;

        // Check if plant has harvestable fruit
        if (plantComp.fruitCount && plantComp.fruitCount > 0) {
          return {
            entityId: plantId,
            position: { x: plantPos.x, y: plantPos.y },
            abundance: plantComp.fruitCount * 20,
          };
        }
      }
    }
  }

  return null;
}
