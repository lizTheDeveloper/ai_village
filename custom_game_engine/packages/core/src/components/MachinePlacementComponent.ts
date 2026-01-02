import type { Component } from '../ecs/Component.js';

/**
 * Machine placement requirement
 */
export type PlacementRequirement = 'anywhere' | 'indoors' | 'outdoors' | 'on_power';

/**
 * MachinePlacementComponent - Machine placement in voxel buildings
 *
 * Machines can be placed on floor tiles, optionally inside rooms.
 * Integrates with voxel building system for emergent factory composition.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 10)
 */
export interface MachinePlacementComponent extends Component {
  readonly type: 'machine_placement';

  /** Is this machine indoors (inside a room)? */
  isIndoors: boolean;

  /** Room ID if indoors (from RoomDetectionSystem) */
  roomId?: string;

  /** Does this machine require shelter? */
  requiresShelter: boolean;

  /** Does this machine require power connection? */
  requiresPower: boolean;

  /** Placement requirement */
  placementRequirement: PlacementRequirement;

  /** Footprint size (1x1, 2x2, 3x3, etc.) */
  footprint: { width: number; height: number };

  /** Adjacent tiles this machine blocks */
  blockedTiles: Array<{ x: number; y: number }>;

  /** Rotation (0, 90, 180, 270 degrees) */
  rotation: 0 | 90 | 180 | 270;
}

/**
 * Factory function to create MachinePlacementComponent
 */
export function createMachinePlacementComponent(
  params: {
    requiresShelter?: boolean;
    requiresPower?: boolean;
    placementRequirement?: PlacementRequirement;
    footprint?: { width: number; height: number };
    rotation?: 0 | 90 | 180 | 270;
  } = {}
): MachinePlacementComponent {
  const footprint = params.footprint ?? { width: 1, height: 1 };
  const blockedTiles = calculateBlockedTiles(footprint, params.rotation ?? 0);

  return {
    type: 'machine_placement',
    version: 1,
    isIndoors: false,
    requiresShelter: params.requiresShelter ?? false,
    requiresPower: params.requiresPower ?? true,
    placementRequirement: params.placementRequirement ?? 'anywhere',
    footprint,
    blockedTiles,
    rotation: params.rotation ?? 0,
  };
}

/**
 * Calculate which tiles are blocked by machine footprint
 */
function calculateBlockedTiles(
  footprint: { width: number; height: number },
  rotation: 0 | 90 | 180 | 270
): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = [];

  // Apply rotation to footprint
  const { width, height } = rotation === 90 || rotation === 270
    ? { width: footprint.height, height: footprint.width }
    : footprint;

  // Generate blocked tile offsets
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

/**
 * Check if machine placement is valid at position
 */
export function isValidPlacement(
  machine: MachinePlacementComponent,
  position: { x: number; y: number },
  world: any // World interface
): { valid: boolean; reason?: string } {
  // Check if machine requires shelter
  if (machine.requiresShelter && !machine.isIndoors) {
    return { valid: false, reason: 'Machine requires shelter (must be indoors)' };
  }

  // Check if placement requirement is met
  if (machine.placementRequirement === 'indoors' && !machine.isIndoors) {
    return { valid: false, reason: 'Machine must be placed indoors' };
  }

  if (machine.placementRequirement === 'outdoors' && machine.isIndoors) {
    return { valid: false, reason: 'Machine must be placed outdoors' };
  }

  // Check if all footprint tiles are clear
  for (const offset of machine.blockedTiles) {
    const tilePos = { x: position.x + offset.x, y: position.y + offset.y };
    const entitiesAtTile = world.getEntitiesAt(tilePos.x, tilePos.y);

    // Check for obstacles
    const hasObstacle = entitiesAtTile.some((e: any) =>
      e.hasComponent('machine_placement') ||
      e.hasComponent('belt') ||
      e.hasComponent('building')
    );

    if (hasObstacle) {
      return { valid: false, reason: `Tile (${tilePos.x}, ${tilePos.y}) is blocked` };
    }
  }

  return { valid: true };
}

/**
 * Rotate machine placement
 */
export function rotateMachine(machine: MachinePlacementComponent): void {
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  const currentIndex = rotations.indexOf(machine.rotation);
  const nextIndex = (currentIndex + 1) % rotations.length;
  machine.rotation = rotations[nextIndex]!;

  // Recalculate blocked tiles
  machine.blockedTiles = calculateBlockedTiles(machine.footprint, machine.rotation);
}
