/**
 * Path Prediction Types
 *
 * Used for dead reckoning / client-side prediction in SharedWorker architecture.
 * Instead of sending position updates every tick, we send predicted paths once
 * and let windows interpolate positions locally.
 */

/**
 * Base path prediction interface
 */
export type PathPrediction =
  | LinearPath
  | WanderPath
  | SteeringPath
  | StationaryPath;

/**
 * Linear movement with constant velocity
 *
 * Simplest prediction - entity moves in straight line at constant speed.
 * Use for: entities with constant velocity, projectiles, basic movement
 */
export interface LinearPath {
  type: 'linear';
  /** Velocity vector (pixels per tick) */
  velocity: { x: number; y: number };
  /** How long this path is expected to last (ticks) */
  duration: number;
}

/**
 * Wandering movement (random walk)
 *
 * For entities with WanderBehavior - windows can simulate wander locally.
 * Use for: animals wandering, NPCs exploring, ambient movement
 */
export interface WanderPath {
  type: 'wander';
  /** Current velocity at time of prediction */
  currentVelocity: { x: number; y: number };
  /** Wander circle radius */
  wanderRadius: number;
  /** Distance of wander circle from entity */
  wanderDistance: number;
  /** How much to perturb wander angle each tick */
  wanderJitter: number;
  /** RNG seed for deterministic wander (use entity ID) */
  seed?: number;
}

/**
 * Steering toward a target with arrival
 *
 * For entities moving toward a specific point with arrival behavior.
 * Use for: agents walking to target, animals approaching food, pathfinding
 */
export interface SteeringPath {
  type: 'steering';
  /** Target position */
  target: { x: number; y: number };
  /** Maximum speed (pixels per tick) */
  maxSpeed: number;
  /** Radius to start slowing down */
  arrivalRadius: number;
  /** Current velocity (for smooth interpolation) */
  currentVelocity?: { x: number; y: number };
}

/**
 * Entity not moving
 *
 * For stationary entities - no position updates needed.
 * Use for: buildings, trees, sleeping entities, idle NPCs
 */
export interface StationaryPath {
  type: 'stationary';
  /** Optional: how long entity will remain stationary */
  duration?: number;
}

/**
 * Component for tracking path predictions on worker side
 *
 * Worker uses this to detect when entity movement deviates from prediction,
 * triggering a correction update to windows.
 */
export interface PathPredictionComponent {
  type: 'path_prediction';
  /** Current predicted path */
  prediction: PathPrediction;
  /** Position when prediction was last sent */
  lastSentPosition: { x: number; y: number };
  /** Tick when prediction was last sent */
  lastSentTick: number;
  /** Deviation threshold to trigger update (pixels) */
  deviationThreshold: number;
}

/**
 * Component for interpolating paths on window side
 *
 * Windows use this to calculate entity position between worker updates
 * by interpolating based on the predicted path.
 */
export interface PathInterpolatorComponent {
  type: 'path_interpolator';
  /** Prediction to interpolate */
  prediction: PathPrediction;
  /** Base position when prediction was received */
  basePosition: { x: number; y: number };
  /** Tick when prediction was received */
  baseTick: number;
}

/**
 * Delta update message (only changed entities)
 *
 * Instead of sending full state, send only entities that changed.
 * Combined with path prediction, this dramatically reduces bandwidth.
 */
export interface DeltaUpdate {
  /** Current tick */
  tick: number;
  /** Only entities that changed */
  updates: Array<{
    entityId: string;
    /** Current position (correction) */
    position: { x: number; y: number };
    /** New predicted path (if changed) */
    prediction: PathPrediction | null;
    /** Full component data (if entity is new or significantly changed) */
    components?: Record<string, any>;
  }>;
  /** Entities that were removed */
  removed?: string[];
}

/**
 * Helper: Calculate deviation between actual and predicted position
 *
 * @param actual Current actual position
 * @param predicted Position predicted by path
 * @returns Distance in pixels
 */
export function calculateDeviation(
  actual: { x: number; y: number },
  predicted: { x: number; y: number }
): number {
  const dx = actual.x - predicted.x;
  const dy = actual.y - predicted.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Helper: Predict position based on path type
 *
 * @param prediction Path prediction
 * @param basePosition Starting position
 * @param ticksElapsed Ticks since base position
 * @returns Predicted position
 */
export function predictPosition(
  prediction: PathPrediction,
  basePosition: { x: number; y: number },
  ticksElapsed: number
): { x: number; y: number } {
  switch (prediction.type) {
    case 'linear':
      return {
        x: basePosition.x + prediction.velocity.x * ticksElapsed,
        y: basePosition.y + prediction.velocity.y * ticksElapsed,
      };

    case 'stationary':
      return { ...basePosition };

    case 'steering': {
      // Simplified steering - move toward target at max speed
      const dx = prediction.target.x - basePosition.x;
      const dy = prediction.target.y - basePosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.1) return basePosition;

      const speed = Math.min(prediction.maxSpeed, distance / Math.max(1, ticksElapsed));
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      return {
        x: basePosition.x + vx * ticksElapsed,
        y: basePosition.y + vy * ticksElapsed,
      };
    }

    case 'wander': {
      // For wander, just use linear velocity
      // Full wander simulation would require matching the behavior exactly
      return {
        x: basePosition.x + prediction.currentVelocity.x * ticksElapsed,
        y: basePosition.y + prediction.currentVelocity.y * ticksElapsed,
      };
    }

    default:
      return { ...basePosition };
  }
}
