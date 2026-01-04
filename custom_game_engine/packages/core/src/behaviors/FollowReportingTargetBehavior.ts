/**
 * FollowReportingTargetBehavior - Reporter follows a moving target at safe distance
 *
 * Unlike NavigateBehavior (fixed location), this behavior:
 * 1. Tracks a specific entity (alien spaceship, battle, etc.)
 * 2. Maintains safe distance (don't walk into danger!)
 * 3. Updates destination as target moves
 * 4. Switches to search pattern if target is lost
 * 5. Orients camera toward target for recording
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'follow_reporting_target',
 *   behaviorState: {
 *     targetEntityId: 'alien_spaceship_123',
 *     safeDistance: 80,  // Stay 80 units away
 *     purpose: 'covering alien invasion'
 *   }
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

/** Safe distance from dangerous targets (aliens, battles) */
const DEFAULT_SAFE_DISTANCE = 80;

/** Distance at which to start slowing down approach */
const SLOWDOWN_DISTANCE = 150;

/** Minimum distance to maintain (emergency backup) */
const MINIMUM_DISTANCE = 40;

/** Search radius when target is lost */
const SEARCH_RADIUS = 200;

/** How long to search before giving up (in ticks) */
const SEARCH_TIMEOUT = 20 * 60 * 3; // 3 minutes at 20 TPS

/**
 * Handler function for follow_reporting_target behavior
 */
export function followReportingTargetBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>(CT.Agent);
  const position = entity.getComponent<PositionComponent>(CT.Position);
  const movement = entity.getComponent<MovementComponent>(CT.Movement);

  if (!agent || !position || !movement) {
    return;
  }

  // Check if we have a target entity
  if (!agent.behaviorState || !agent.behaviorState.targetEntityId) {
    // No target - switch to idle
    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'idle',
      behaviorState: {},
      lastThought: 'I lost track of what I was supposed to cover',
    }));
    return;
  }

  const targetEntityId = agent.behaviorState.targetEntityId as string;
  const safeDistance = (agent.behaviorState.safeDistance as number) ?? DEFAULT_SAFE_DISTANCE;
  const purpose = (agent.behaviorState.purpose as string) ?? 'covering a story';

  // Try to find target entity
  const target = world.getEntity(targetEntityId) as EntityImpl | null;

  if (!target) {
    // Target lost - initiate search
    handleLostTarget(entity, agent, world.tick, purpose);
    return;
  }

  const targetPos = target.getComponent<PositionComponent>(CT.Position);
  if (!targetPos) {
    // Target has no position - give up
    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'idle',
      behaviorState: {},
      lastThought: 'The subject I was covering disappeared',
    }));
    return;
  }

  // Calculate distance to target
  const dx = targetPos.x - position.x;
  const dy = targetPos.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Clear search state if we found target again
  if (agent.behaviorState.searchStartTick) {
    delete agent.behaviorState.searchStartTick;
  }

  // ============================================================================
  // DISTANCE MANAGEMENT
  // ============================================================================

  if (distance < MINIMUM_DISTANCE) {
    // TOO CLOSE - emergency backup!
    moveAwayFromTarget(position, targetPos, movement, safeDistance);

    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      lastThought: `This is too dangerous, backing away!`,
    }));
    return;
  }

  if (distance > safeDistance + 20) {
    // TOO FAR - move closer
    const approachDistance = Math.max(safeDistance, distance - 50);
    moveTowardTarget(position, targetPos, movement, distance, approachDistance);

    // Orient camera toward target
    orientTowardTarget(entity, position, targetPos);

  } else if (distance < safeDistance - 20) {
    // TOO CLOSE - back up to safe distance
    moveAwayFromTarget(position, targetPos, movement, safeDistance);

  } else {
    // PERFECT DISTANCE - maintain position and orient camera
    maintainPosition(movement);
    orientTowardTarget(entity, position, targetPos);

    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      lastThought: `Perfect vantage point for ${purpose}`,
    }));
  }
}

/**
 * Move toward target (but stop at approach distance)
 */
function moveTowardTarget(
  position: PositionComponent,
  targetPos: PositionComponent,
  movement: MovementComponent,
  currentDistance: number,
  approachDistance: number
): void {
  const dx = targetPos.x - position.x;
  const dy = targetPos.y - position.y;

  // Normalize direction
  const dirX = dx / currentDistance;
  const dirY = dy / currentDistance;

  // Slow down as we approach
  const distanceToApproach = currentDistance - approachDistance;
  const speedFactor = Math.min(1.0, distanceToApproach / SLOWDOWN_DISTANCE);

  // Set velocity toward target
  const speed = movement.speed * speedFactor;
  movement.velocityX = dirX * speed;
  movement.velocityY = dirY * speed;
}

/**
 * Move away from target (to safe distance)
 */
function moveAwayFromTarget(
  position: PositionComponent,
  targetPos: PositionComponent,
  movement: MovementComponent,
  safeDistance: number
): void {
  const dx = position.x - targetPos.x; // Reversed - move AWAY
  const dy = position.y - targetPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    // Exactly on top of target - move in random direction
    const angle = Math.random() * Math.PI * 2;
    movement.velocityX = Math.cos(angle) * movement.speed;
    movement.velocityY = Math.sin(angle) * movement.speed;
    return;
  }

  // Normalize direction (away from target)
  const dirX = dx / distance;
  const dirY = dy / distance;

  // Move away at full speed
  movement.velocityX = dirX * movement.speed;
  movement.velocityY = dirY * movement.speed;
}

/**
 * Maintain current position (stop moving)
 */
function maintainPosition(movement: MovementComponent): void {
  movement.velocityX *= 0.8; // Gradual slow down
  movement.velocityY *= 0.8;
}

/**
 * Orient agent to face target (for camera direction)
 */
function orientTowardTarget(
  entity: EntityImpl,
  position: PositionComponent,
  targetPos: PositionComponent
): void {
  const dx = targetPos.x - position.x;
  const dy = targetPos.y - position.y;

  // Calculate angle to target (radians)
  const angle = Math.atan2(dy, dx);

  // Store facing direction in agent state for recording system
  entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
    ...current,
    behaviorState: {
      ...current.behaviorState,
      facingAngle: angle,
      facingTarget: true,
    },
  }));

  // Also update renderable facing if it exists
  const renderable = entity.getComponent(CT.Renderable) as any;
  if (renderable) {
    // Calculate cardinal direction for sprite rendering
    const cardinalDirection = getCardinalDirection(angle);
    entity.updateComponent(CT.Renderable, (current: any) => ({
      ...current,
      direction: cardinalDirection,
    }));
  }
}

/**
 * Convert angle to cardinal direction for sprite rendering
 */
function getCardinalDirection(angle: number): string {
  // Normalize angle to 0-2π
  const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // Convert to degrees for easier reasoning
  const degrees = (normalizedAngle * 180) / Math.PI;

  // 8-directional
  if (degrees < 22.5 || degrees >= 337.5) return 'east';
  if (degrees < 67.5) return 'south-east';
  if (degrees < 112.5) return 'south';
  if (degrees < 157.5) return 'south-west';
  if (degrees < 202.5) return 'west';
  if (degrees < 247.5) return 'north-west';
  if (degrees < 292.5) return 'north';
  return 'north-east';
}

/**
 * Handle lost target - initiate search pattern
 */
function handleLostTarget(
  entity: EntityImpl,
  agent: AgentComponent,
  currentTick: number,
  purpose: string
): void {
  const searchStartTick = (agent.behaviorState?.searchStartTick as number) ?? currentTick;

  // Check if search timeout exceeded
  if (currentTick - searchStartTick > SEARCH_TIMEOUT) {
    // Give up search
    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'idle',
      behaviorState: {},
      lastThought: `I couldn't find the subject for ${purpose}. Heading back to the newsroom.`,
    }));

    // Emit event that reporter gave up
    entity.world?.eventBus?.emit({
      type: 'reporter:search_failed' as any,
      source: 'ai',
      data: {
        reporterId: entity.id,
        purpose,
      },
    });
    return;
  }

  // Continue searching - spiral outward from last known position
  const position = entity.getComponent<PositionComponent>(CT.Position);
  if (!position) return;

  // Use spiral search pattern (could also use random walk)
  const lastKnownPos = agent.behaviorState?.lastKnownTargetPos as
    | { x: number; y: number }
    | undefined;

  if (lastKnownPos) {
    // Search in expanding circle
    const searchPhase = ((currentTick - searchStartTick) / 100) % 8; // Change direction every 5 seconds
    const angle = (searchPhase / 8) * Math.PI * 2;
    const searchDistance = 50 + ((currentTick - searchStartTick) / 200) * 10; // Expand search radius

    const searchX = lastKnownPos.x + Math.cos(angle) * searchDistance;
    const searchY = lastKnownPos.y + Math.sin(angle) * searchDistance;

    // Navigate to search point
    entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'navigate',
      behaviorState: {
        ...current.behaviorState,
        target: { x: searchX, y: searchY },
        searchStartTick,
        lastKnownTargetPos: lastKnownPos,
        purpose: `searching for subject: ${purpose}`,
      },
      lastThought: `Looking for the subject... it was around here somewhere`,
    }));
  }
}

/**
 * Get the field of view as a cone from reporter's position and facing
 */
export function getReporterFieldOfView(
  reporterPos: PositionComponent,
  facingAngle: number,
  viewDistance: number = 150,
  viewAngle: number = Math.PI / 3 // 60 degrees
): {
  startAngle: number;
  endAngle: number;
  centerX: number;
  centerY: number;
  distance: number;
} {
  return {
    startAngle: facingAngle - viewAngle / 2,
    endAngle: facingAngle + viewAngle / 2,
    centerX: reporterPos.x,
    centerY: reporterPos.y,
    distance: viewDistance,
  };
}

/**
 * Check if a point is within the reporter's field of view
 */
export function isInFieldOfView(
  targetX: number,
  targetY: number,
  reporterPos: PositionComponent,
  facingAngle: number,
  viewDistance: number = 150,
  viewAngle: number = Math.PI / 3
): boolean {
  const dx = targetX - reporterPos.x;
  const dy = targetY - reporterPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > viewDistance) {
    return false; // Too far
  }

  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = Math.abs(((angleToTarget - facingAngle + Math.PI) % (Math.PI * 2)) - Math.PI);

  return angleDiff <= viewAngle / 2;
}
