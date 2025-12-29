/**
 * NavigateBehavior - Move agent to specific (x, y) coordinates
 *
 * This behavior handles purposeful navigation to a target location.
 * It uses:
 * - MapKnowledge for worn path preferences (if available)
 * - SteeringComponent for smooth movement (if available)
 * - Basic velocity-based fallback otherwise
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'navigate',
 *   behaviorState: { target: { x: 100, y: 50 } }
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import { getMapKnowledge, worldToSector, type Direction } from '../navigation/MapKnowledge.js';
import { recordMovement } from '../navigation/KnowledgeTransmission.js';

/** Arrival threshold - agent is "there" when within this distance */
const ARRIVAL_THRESHOLD = 2.0;

/** Slowdown radius for smooth arrival */
const SLOWDOWN_RADIUS = 5.0;

/**
 * Handler function for navigate behavior
 */
export function navigateBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>('agent');
  const position = entity.getComponent<PositionComponent>('position');

  if (!agent || !position) {
    return;
  }

  // Check if we have a target
  if (!agent.behaviorState || !agent.behaviorState.target) {
    // No target - switch to wander
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
      lastThought: 'I have no destination in mind',
    }));
    return;
  }

  const target = agent.behaviorState.target as { x: number; y: number };

  // Calculate distance and direction to target
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check if arrived
  if (distance < ARRIVAL_THRESHOLD) {
    // Record this movement in map knowledge (for worn paths)
    const previousPos = agent.behaviorState.previousPosition as
      | { x: number; y: number }
      | undefined;
    if (previousPos) {
      recordMovement(previousPos, position, world.tick);
    }

    // Emit arrival event
    world.eventBus?.emit({
      type: 'navigation:arrived',
      source: 'ai',
      data: {
        agentId: entity.id,
        entityId: entity.id,
        destination: target,
      },
    });

    // Switch to idle
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'idle',
      behaviorState: {},
      lastThought: `I arrived at my destination (${Math.floor(target.x)}, ${Math.floor(target.y)})`,
    }));
    return;
  }

  // Track position for worn path recording
  const movement = entity.getComponent<MovementComponent>('movement');
  if (!movement) {
    return;
  }

  // Check if using steering component
  if (entity.hasComponent('steering')) {
    // SteeringSystem will handle smooth movement
    entity.updateComponent('steering', (steering: any) => ({
      ...steering,
      behavior: 'arrive',
      target: target,
    }));

    // Store previous position for worn path tracking
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        previousPosition: { x: position.x, y: position.y },
      },
    }));
    return;
  }

  // Fallback: simple velocity-based movement with arrive behavior
  // Normalize direction
  const dirX = dx / distance;
  const dirY = dy / distance;

  // Calculate speed with slowdown near target
  let speed = movement.speed;
  if (distance < SLOWDOWN_RADIUS) {
    // Linear slowdown as we approach
    speed = movement.speed * (distance / SLOWDOWN_RADIUS);
    // Minimum speed to avoid getting stuck
    speed = Math.max(speed, 0.5);
  }

  // Apply worn path preference if crossing sector boundaries
  const currentSector = worldToSector(position.x, position.y);
  const targetSector = worldToSector(target.x, target.y);

  if (currentSector.sectorX !== targetSector.sectorX || currentSector.sectorY !== targetSector.sectorY) {
    // Crossing sectors - check if worn path exists
    const mapKnowledge = getMapKnowledge();
    const direction = getDirectionToSector(currentSector, targetSector);

    if (direction) {
      const pathWeight = mapKnowledge.getPathWeight(currentSector.sectorX, currentSector.sectorY, direction);
      // Worn paths (pathWeight < 1.0) give small speed bonus
      if (pathWeight < 1.0) {
        speed *= 1 + (1 - pathWeight) * 0.2; // Up to 10% speed bonus on worn paths
      }
    }
  }

  // Apply velocity
  const velocityX = dirX * speed;
  const velocityY = dirY * speed;

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX,
    velocityY,
  }));

  // Store previous position for worn path tracking
  entity.updateComponent<AgentComponent>('agent', (current) => ({
    ...current,
    behaviorState: {
      ...current.behaviorState,
      previousPosition: { x: position.x, y: position.y },
    },
  }));
}

/**
 * Get the direction from one sector to an adjacent sector
 */
function getDirectionToSector(
  from: { sectorX: number; sectorY: number },
  to: { sectorX: number; sectorY: number }
): Direction | null {
  const dx = to.sectorX - from.sectorX;
  const dy = to.sectorY - from.sectorY;

  // Clamp to adjacent (-1, 0, 1)
  const clampedDx = Math.max(-1, Math.min(1, dx));
  const clampedDy = Math.max(-1, Math.min(1, dy));

  if (clampedDx === 0 && clampedDy === -1) return 'n';
  if (clampedDx === 1 && clampedDy === -1) return 'ne';
  if (clampedDx === 1 && clampedDy === 0) return 'e';
  if (clampedDx === 1 && clampedDy === 1) return 'se';
  if (clampedDx === 0 && clampedDy === 1) return 's';
  if (clampedDx === -1 && clampedDy === 1) return 'sw';
  if (clampedDx === -1 && clampedDy === 0) return 'w';
  if (clampedDx === -1 && clampedDy === -1) return 'nw';

  return null;
}
