/**
 * ExploreSpiralBehavior - Spiral outward exploration from home base
 *
 * This behavior systematically explores in a spiral pattern:
 * - Starts from home/starting position
 * - Moves outward in increasingly large circles
 * - Marks sectors as explored using HearsayMemory
 *
 * The spiral pattern ensures comprehensive coverage of area without
 * revisiting sectors.
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'explore_spiral',
 *   behaviorState: {
 *     homeX: 100,  // Optional: spiral center (defaults to current position)
 *     homeY: 100
 *   }
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import { worldToSector, sectorToWorld } from '../navigation/MapKnowledge.js';
import { type HearsayMemoryComponent, markExplored } from '../navigation/HearsayMemory.js';

/** Time to spend in each sector exploring (ticks) */
const SECTOR_EXPLORATION_TIME = 40;

/** Maximum spiral radius (in sectors) before restarting */
const MAX_SPIRAL_RADIUS = 10;

/**
 * Spiral direction state for clockwise spiral
 */
type SpiralDirection = 'right' | 'down' | 'left' | 'up';

/**
 * Handler function for explore_spiral behavior
 */
export function exploreSpiralBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>('agent');
  const position = entity.getComponent<PositionComponent>('position');
  const movement = entity.getComponent<MovementComponent>('movement');

  if (!agent || !position || !movement) {
    return;
  }

  const behaviorState = agent.behaviorState || {};

  // Initialize spiral state if not present
  if (!behaviorState.spiralInitialized) {
    // Use current position as home if not specified
    const homeX = (behaviorState.homeX as number) ?? position.x;
    const homeY = (behaviorState.homeY as number) ?? position.y;
    const homeSector = worldToSector(homeX, homeY);

    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        spiralInitialized: true,
        homeX,
        homeY,
        homeSectorX: homeSector.sectorX,
        homeSectorY: homeSector.sectorY,
        spiralX: 0, // Offset from home sector
        spiralY: 0,
        spiralDirection: 'right' as SpiralDirection,
        spiralSteps: 1, // Steps to take in current direction
        spiralStepsRemaining: 1,
        spiralPhase: 0, // 0-1, increments by 0.5 after each direction change
      },
    }));
    return;
  }

  // Get spiral state
  const homeSectorX = behaviorState.homeSectorX as number;
  const homeSectorY = behaviorState.homeSectorY as number;
  const spiralX = behaviorState.spiralX as number;
  const spiralY = behaviorState.spiralY as number;
  const spiralDirection = behaviorState.spiralDirection as SpiralDirection;
  const spiralSteps = behaviorState.spiralSteps as number;
  const spiralStepsRemaining = behaviorState.spiralStepsRemaining as number;
  const spiralPhase = behaviorState.spiralPhase as number;

  // Current target sector
  const targetSectorX = homeSectorX + spiralX;
  const targetSectorY = homeSectorY + spiralY;
  const targetSector = { sectorX: targetSectorX, sectorY: targetSectorY };

  // Check current sector
  const currentSector = worldToSector(position.x, position.y);
  const explorationStartTick = behaviorState.explorationStartTick as number | undefined;

  // If at target sector, explore it
  if (currentSector.sectorX === targetSectorX && currentSector.sectorY === targetSectorY) {
    if (explorationStartTick === undefined) {
      // Just arrived - start exploring
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          explorationStartTick: world.tick,
        },
      }));
      return;
    }

    const timeInSector = world.tick - explorationStartTick;
    if (timeInSector < SECTOR_EXPLORATION_TIME) {
      // Still exploring - wander within sector
      wanderWithinSector(entity, movement);
      return;
    }

    // Done exploring - mark sector and advance spiral
    const hearsayMemory = entity.getComponent('hearsay_memory') as HearsayMemoryComponent | null;
    if (hearsayMemory) {
      markExplored(hearsayMemory, targetSectorX, targetSectorY, [], world.tick);
    }

    // Advance spiral position
    advanceSpiralPosition(entity, spiralX, spiralY, spiralDirection, spiralSteps, spiralStepsRemaining, spiralPhase);
    return;
  }

  // Not at target - navigate there
  navigateToSector(entity, position, targetSector, movement);
}

/**
 * Advance spiral position to next sector
 */
function advanceSpiralPosition(
  entity: EntityImpl,
  spiralX: number,
  spiralY: number,
  direction: SpiralDirection,
  steps: number,
  stepsRemaining: number,
  phase: number
): void {
  // Move in current direction
  let newX = spiralX;
  let newY = spiralY;

  switch (direction) {
    case 'right':
      newX++;
      break;
    case 'down':
      newY++;
      break;
    case 'left':
      newX--;
      break;
    case 'up':
      newY--;
      break;
  }

  let newStepsRemaining = stepsRemaining - 1;
  let newDirection = direction;
  let newSteps = steps;
  let newPhase = phase;

  // Check if we need to change direction
  if (newStepsRemaining <= 0) {
    // Rotate clockwise
    const nextDirection: Record<SpiralDirection, SpiralDirection> = {
      right: 'down',
      down: 'left',
      left: 'up',
      up: 'right',
    };
    newDirection = nextDirection[direction];
    newPhase += 0.5;

    // Every full rotation (phase increments by 1), increase step count
    if (newPhase % 1 === 0) {
      newSteps++;
    }

    newStepsRemaining = newSteps;

    // Check for max radius
    if (newSteps > MAX_SPIRAL_RADIUS * 2) {
      // Reset spiral to center
      newX = 0;
      newY = 0;
      newSteps = 1;
      newStepsRemaining = 1;
      newPhase = 0;
      newDirection = 'right';
    }
  }

  entity.updateComponent<AgentComponent>('agent', (current) => ({
    ...current,
    behaviorState: {
      ...current.behaviorState,
      spiralX: newX,
      spiralY: newY,
      spiralDirection: newDirection,
      spiralSteps: newSteps,
      spiralStepsRemaining: newStepsRemaining,
      spiralPhase: newPhase,
      explorationStartTick: undefined, // Clear for next sector
    },
    lastThought: `Spiraling outward to explore more territory`,
  }));
}

/**
 * Navigate toward a target sector
 */
function navigateToSector(
  entity: EntityImpl,
  position: PositionComponent,
  targetSector: { sectorX: number; sectorY: number },
  movement: MovementComponent
): void {
  const target = sectorToWorld(targetSector.sectorX, targetSector.sectorY);

  const dx = target.worldX - position.x;
  const dy = target.worldY - position.y;
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
 * Wander within current sector
 */
function wanderWithinSector(entity: EntityImpl, movement: MovementComponent): void {
  const angle = Math.random() * 2 * Math.PI;
  const velocityX = Math.cos(angle) * movement.speed * 0.5;
  const velocityY = Math.sin(angle) * movement.speed * 0.5;

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX,
    velocityY,
  }));
}
