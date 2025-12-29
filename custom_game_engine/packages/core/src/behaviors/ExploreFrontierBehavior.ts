/**
 * ExploreFrontierBehavior - Explore edges of known territory
 *
 * This behavior systematically explores unexplored sectors using:
 * - HearsayMemory's fog-of-war (personal exploration tracking)
 * - MapKnowledge's getBestExplorationDirection for world-level hints
 *
 * The agent moves toward the nearest unexplored sector, preferring:
 * 1. Sectors that haven't been personally explored
 * 2. Directions with worn paths (easier travel)
 * 3. Away from crowded areas
 *
 * Usage:
 * ```typescript
 * agent.updateComponent('agent', current => ({
 *   ...current,
 *   behavior: 'explore_frontier',
 *   behaviorState: { radius: 3 } // Optional: exploration radius in sectors
 * }));
 * ```
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import {
  getMapKnowledge,
  worldToSector,
  sectorToWorld,
  type Direction,
} from '../navigation/MapKnowledge.js';
import {
  type HearsayMemoryComponent,
  getUnexploredInRadius,
  markExplored,
} from '../navigation/HearsayMemory.js';

/** Default exploration radius in sectors */
const DEFAULT_EXPLORATION_RADIUS = 3;

/** How long to explore a sector before moving on (ticks) */
const SECTOR_EXPLORATION_TIME = 50;

/**
 * Handler function for explore_frontier behavior
 */
export function exploreFrontierBehavior(entity: EntityImpl, world: World): void {
  const agent = entity.getComponent<AgentComponent>('agent');
  const position = entity.getComponent<PositionComponent>('position');
  const movement = entity.getComponent<MovementComponent>('movement');

  if (!agent || !position || !movement) {
    return;
  }

  // Get or create exploration state
  const behaviorState = agent.behaviorState || {};
  const explorationRadius = (behaviorState.radius as number) || DEFAULT_EXPLORATION_RADIUS;

  // Get agent's personal exploration memory
  const hearsayMemory = entity.getComponent('hearsay_memory') as HearsayMemoryComponent | null;

  // Get current sector
  const currentSector = worldToSector(position.x, position.y);

  // Check if we have a target sector we're exploring
  const targetSector = behaviorState.targetSector as
    | { sectorX: number; sectorY: number }
    | undefined;
  const explorationStartTick = behaviorState.explorationStartTick as number | undefined;

  // If we have a target and haven't been there long enough, keep moving
  if (targetSector && explorationStartTick !== undefined) {
    const timeInSector = world.tick - explorationStartTick;

    // Check if we've arrived at target sector
    if (
      currentSector.sectorX === targetSector.sectorX &&
      currentSector.sectorY === targetSector.sectorY
    ) {
      // We're in the target sector - explore it
      if (timeInSector < SECTOR_EXPLORATION_TIME) {
        // Still exploring - wander within sector
        wanderWithinSector(entity, position, currentSector, movement);
        return;
      }

      // Done exploring this sector - mark it
      if (hearsayMemory) {
        // Look for resources in this sector
        const foundResources = findResourcesInSector(entity, world, currentSector);
        markExplored(hearsayMemory, currentSector.sectorX, currentSector.sectorY, foundResources, world.tick);
      }

      // Clear target to find next sector
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          targetSector: undefined,
          explorationStartTick: undefined,
        },
      }));
    } else {
      // Still moving to target - navigate there
      navigateToSector(entity, position, targetSector, movement);
      return;
    }
  }

  // Find next sector to explore
  let nextSector: { sectorX: number; sectorY: number } | null = null;

  // First check personal fog-of-war
  if (hearsayMemory) {
    const unexplored = getUnexploredInRadius(
      hearsayMemory,
      currentSector.sectorX,
      currentSector.sectorY,
      explorationRadius
    );

    if (unexplored.length > 0 && unexplored[0]) {
      // Get closest unexplored
      nextSector = unexplored[0];
    }
  }

  // If no personal unexplored, use world-level knowledge
  if (!nextSector) {
    const mapKnowledge = getMapKnowledge();
    const bestDirection = mapKnowledge.getBestExplorationDirection(position.x, position.y);

    if (bestDirection) {
      // Convert direction to target sector
      nextSector = getNeighborSector(currentSector, bestDirection);
    }
  }

  // If still no target, we've explored everything nearby - wander
  if (!nextSector) {
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
      lastThought: "I've explored everything nearby. Time to wander.",
    }));
    return;
  }

  // Set new exploration target
  entity.updateComponent<AgentComponent>('agent', (current) => ({
    ...current,
    behaviorState: {
      ...current.behaviorState,
      targetSector: nextSector,
      explorationStartTick: world.tick,
    },
    lastThought: `Exploring sector (${nextSector!.sectorX}, ${nextSector!.sectorY})`,
  }));

  // Start moving toward target
  navigateToSector(entity, position, nextSector, movement);
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
 * Wander within current sector (random direction within sector bounds)
 */
function wanderWithinSector(
  entity: EntityImpl,
  _position: PositionComponent, // Reserved for future sector-bounded wandering
  _currentSector: { sectorX: number; sectorY: number },
  movement: MovementComponent
): void {
  // Simple random walk within sector
  const angle = Math.random() * 2 * Math.PI;
  const velocityX = Math.cos(angle) * movement.speed * 0.5;
  const velocityY = Math.sin(angle) * movement.speed * 0.5;

  entity.updateComponent<MovementComponent>('movement', (current) => ({
    ...current,
    velocityX,
    velocityY,
  }));
}

/**
 * Find resources visible in current sector
 */
function findResourcesInSector(
  entity: EntityImpl,
  world: World,
  _currentSector: { sectorX: number; sectorY: number }
): ('food' | 'wood' | 'stone' | 'water' | 'minerals')[] {
  void _currentSector; // Reserved for future sector-specific logic

  const vision = entity.getComponent('vision') as any;
  if (!vision) {
    return [];
  }

  const foundTypes: Set<'food' | 'wood' | 'stone' | 'water' | 'minerals'> = new Set();

  // Check seen resources
  if (vision.seenResources && Array.isArray(vision.seenResources)) {
    for (const resourceId of vision.seenResources) {
      const resource = world.getEntity(resourceId);
      if (resource) {
        const resourceComp = (resource as EntityImpl).getComponent('resource') as any;
        if (resourceComp?.resourceType) {
          // Map resource types to area resource types
          const areaType = mapResourceType(resourceComp.resourceType);
          if (areaType) {
            foundTypes.add(areaType);
          }
        }
      }
    }
  }

  return Array.from(foundTypes);
}

/**
 * Map specific resource types to area-level types
 */
function mapResourceType(resourceType: string): 'food' | 'wood' | 'stone' | 'water' | 'minerals' | null {
  const mapping: Record<string, 'food' | 'wood' | 'stone' | 'water' | 'minerals'> = {
    berry: 'food',
    berries: 'food',
    fruit: 'food',
    apple: 'food',
    wheat: 'food',
    carrot: 'food',
    wood: 'wood',
    log: 'wood',
    timber: 'wood',
    stone: 'stone',
    rock: 'stone',
    boulder: 'stone',
    water: 'water',
    iron: 'minerals',
    copper: 'minerals',
    gold: 'minerals',
  };

  return mapping[resourceType.toLowerCase()] || null;
}

/**
 * Get neighbor sector in a direction
 */
function getNeighborSector(
  current: { sectorX: number; sectorY: number },
  direction: Direction
): { sectorX: number; sectorY: number } {
  const offsets: Record<Direction, { dx: number; dy: number }> = {
    n: { dx: 0, dy: -1 },
    ne: { dx: 1, dy: -1 },
    e: { dx: 1, dy: 0 },
    se: { dx: 1, dy: 1 },
    s: { dx: 0, dy: 1 },
    sw: { dx: -1, dy: 1 },
    w: { dx: -1, dy: 0 },
    nw: { dx: -1, dy: -1 },
  };

  const offset = offsets[direction];
  return {
    sectorX: current.sectorX + offset.dx,
    sectorY: current.sectorY + offset.dy,
  };
}
