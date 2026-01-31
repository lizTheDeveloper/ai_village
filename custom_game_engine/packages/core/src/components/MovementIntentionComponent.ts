/**
 * MovementIntentionComponent - Factorio-style movement optimization
 *
 * Instead of updating entity positions every tick, store the movement INTENTION:
 * - Where the entity is going (destination)
 * - How fast it's moving (speed)
 * - When it will arrive (arrivalTick)
 *
 * Benefits:
 * 1. Reduce brain updates: Agent brain only runs every 0.5s, but movement looks smooth
 * 2. Predictable arrival: Renderer can interpolate without per-tick position updates
 * 3. Collision avoidance: Check intention overlap before committing to paths
 * 4. Network sync: Only send intentions, not per-tick positions
 *
 * How it works:
 * 1. AgentBrainSystem decides destination → sets MovementIntention
 * 2. MovementIntentionSystem calculates path, sets arrivalTick
 * 3. Renderer interpolates: currentPos + (destPos - currentPos) * progress
 * 4. On arrivalTick: position snaps to destination, intention clears
 *
 * Inspired by Factorio's robot "limbo" system where robots store their
 * destination and arrival time, updating actual position only occasionally.
 */

export interface MovementIntentionComponent {
  type: 'movement_intention';
  version: number;

  // ============================================================================
  // DESTINATION
  // ============================================================================

  /** Target position X coordinate */
  destinationX: number;

  /** Target position Y coordinate */
  destinationY: number;

  /** Target position Z coordinate (optional, for 3D movement) */
  destinationZ?: number;

  // ============================================================================
  // TIMING
  // ============================================================================

  /** Tick when entity started moving toward this destination */
  startTick: number;

  /** Tick when entity will arrive at destination */
  arrivalTick: number;

  /** Speed in tiles per tick (derived from movement component) */
  speed: number;

  // ============================================================================
  // STATE
  // ============================================================================

  /** Whether the entity is actively moving toward destination */
  isMoving: boolean;

  /** Whether arrival has been acknowledged (prevents re-triggering) */
  arrived: boolean;

  /** Path waypoints if following a complex path (optional) */
  waypoints?: Array<{ x: number; y: number; z?: number }>;

  /** Current waypoint index if following a path */
  waypointIndex?: number;

  // ============================================================================
  // METADATA
  // ============================================================================

  /** Why is the entity moving? (for debugging/AI) */
  reason?: string;

  /** Entity ID of target if chasing something */
  targetEntityId?: string;
}

/**
 * Create a new movement intention
 */
export function createMovementIntention(
  destinationX: number,
  destinationY: number,
  startTick: number,
  speed: number,
  currentX: number,
  currentY: number,
  destinationZ?: number,
  currentZ?: number
): MovementIntentionComponent {
  // Calculate distance
  const dx = destinationX - currentX;
  const dy = destinationY - currentY;
  const dz = destinationZ !== undefined && currentZ !== undefined
    ? destinationZ - currentZ
    : 0;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Calculate arrival tick (distance / speed)
  const ticksToArrive = speed > 0 ? Math.ceil(distance / speed) : 0;
  const arrivalTick = startTick + ticksToArrive;

  return {
    type: 'movement_intention',
    version: 1,
    destinationX,
    destinationY,
    destinationZ,
    startTick,
    arrivalTick,
    speed,
    isMoving: distance > 0.01,
    arrived: false,
  };
}

/**
 * Calculate interpolated position based on current tick
 */
export function interpolatePosition(
  intention: MovementIntentionComponent,
  currentTick: number,
  startX: number,
  startY: number,
  startZ?: number
): { x: number; y: number; z?: number; progress: number } {
  // If arrived or not moving, return destination
  if (intention.arrived || !intention.isMoving) {
    return {
      x: intention.destinationX,
      y: intention.destinationY,
      z: intention.destinationZ,
      progress: 1,
    };
  }

  // Calculate progress (0 to 1)
  const totalTicks = intention.arrivalTick - intention.startTick;
  const elapsedTicks = currentTick - intention.startTick;

  if (totalTicks <= 0) {
    return {
      x: intention.destinationX,
      y: intention.destinationY,
      z: intention.destinationZ,
      progress: 1,
    };
  }

  const progress = Math.min(1, Math.max(0, elapsedTicks / totalTicks));

  // Linear interpolation
  const x = startX + (intention.destinationX - startX) * progress;
  const y = startY + (intention.destinationY - startY) * progress;
  const z = startZ !== undefined && intention.destinationZ !== undefined
    ? startZ + (intention.destinationZ - startZ) * progress
    : intention.destinationZ;

  return { x, y, z, progress };
}

/**
 * Check if an intention has arrived
 */
export function hasArrived(
  intention: MovementIntentionComponent,
  currentTick: number
): boolean {
  return currentTick >= intention.arrivalTick || intention.arrived;
}

/**
 * Calculate remaining ticks until arrival
 */
export function ticksUntilArrival(
  intention: MovementIntentionComponent,
  currentTick: number
): number {
  return Math.max(0, intention.arrivalTick - currentTick);
}

/**
 * Check if two movement intentions might collide
 */
export function mightCollide(
  intentionA: MovementIntentionComponent,
  intentionB: MovementIntentionComponent,
  collisionRadius: number = 1
): boolean {
  // Simple check: do destinations overlap?
  const dx = intentionA.destinationX - intentionB.destinationX;
  const dy = intentionA.destinationY - intentionB.destinationY;
  const distSq = dx * dx + dy * dy;

  return distSq < collisionRadius * collisionRadius;
}
