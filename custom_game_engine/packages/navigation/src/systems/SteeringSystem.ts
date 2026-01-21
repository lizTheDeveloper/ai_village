import type {
  SystemId,
  ComponentType,
  World,
  Position,
  SteeringBehavior,
  SteeringComponent,
  VelocityComponent,
  PositionComponent,
  PhysicsComponent,
  BuildingComponent,
  Entity,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType as CT,
  EntityImpl,
  getSteering,
  getVelocity,
  getPosition,
  setComponentProperties,
} from '@ai-village/core';
import steeringConfig from '../../data/steering-config.json';

// Using Position from types.ts for all vector operations
type Vector2 = Position;

/**
 * SteeringSystem implements steering behaviors for navigation
 * Supports: seek, arrive, obstacle avoidance, wander, and combined behaviors
 *
 * Dependencies:
 * - AgentBrainSystem (priority 10): Must run after brain sets steering targets
 *   - Reads steering.target set by behaviors
 *   - Executes steering behaviors chosen by decision system
 *
 * - MovementSystem (priority 20): Must run before movement applies velocity
 *   - Modifies velocity components based on steering forces
 *   - MovementSystem then applies velocity to position
 *
 * Related Systems:
 * - CollisionSystem: Provides collision components for obstacle avoidance
 * - ChunkSystem: Uses spatial chunks for efficient nearby entity queries
 * - PathfindingSystem: Fallback for stuck detection (future integration)
 */
export class SteeringSystem extends BaseSystem {
  public readonly id: SystemId = CT.Steering;
  public readonly priority: number = 15; // After AISystem (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Steering,
    CT.Position,
    CT.Velocity,
  ];
  protected readonly throttleInterval = 0; // EVERY_TICK - critical responsiveness

  // Track stuck agents for pathfinding fallback
  private stuckTracker: Map<string, { lastPos: Vector2; stuckTime: number; target: Vector2 }> = new Map();

  // Configuration constants from JSON
  private readonly CHUNK_SIZE = 32; // From collision config
  private readonly STUCK_DETECTION_TIME = steeringConfig.arrive.stuckDetectionTime;
  private readonly STUCK_DISTANCE_THRESHOLD = steeringConfig.arrive.stuckDistanceThreshold;
  private readonly JITTER_RANGE = steeringConfig.arrive.jitterRange;

  protected onUpdate(ctx: SystemContext): void {
    // Update agent positions in scheduler
    ctx.world.simulationScheduler.updateAgentPositions(ctx.world);

    // Get entities with steering component
    // NOTE: We don't filter steering entities themselves (agents always need to steer)
    // but obstacle filtering happens in _avoidObstacles using spatial queries
    // activeEntities parameter is already filtered by requiredComponents

    for (const entity of ctx.activeEntities) {
      try {
        this._updateSteering(entity, ctx.world, ctx.deltaTime);
      } catch (error) {
        // Per CLAUDE.md, re-throw with context
        throw new Error(`SteeringSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateSteering(entity: Entity, world: World, deltaTime: number): void {
    const impl = entity as EntityImpl;

    // Get typed components using helpers
    const steering = getSteering(entity);
    if (!steering) {
      throw new Error('Steering component missing');
    }
    const position = getPosition(entity);
    if (!position) {
      throw new Error('Position component missing');
    }
    const velocity = getVelocity(entity);
    if (!velocity) {
      throw new Error('Velocity component missing');
    }

    // Validate behavior type
    const validBehaviors: SteeringBehavior[] = ['seek', 'arrive', 'obstacle_avoidance', 'wander', 'combined', 'none'];
    if (!validBehaviors.includes(steering.behavior)) {
      throw new Error(`Invalid steering behavior: ${steering.behavior}. Valid: ${validBehaviors.join(', ')}`);
    }

    if (steering.behavior === 'none') {
      return; // No steering applied
    }

    // Calculate steering force
    let steeringForce: Vector2 = { x: 0, y: 0 };

    switch (steering.behavior) {
      case 'seek':
        steeringForce = this._seek(position, velocity, steering);
        break;

      case 'arrive':
        steeringForce = this._arrive(position, velocity, steering, entity.id);
        break;

      case 'obstacle_avoidance':
        steeringForce = this._avoidObstacles(entity, position, velocity, steering, world);
        break;

      case 'wander':
        steeringForce = this._wander(position, velocity, steering);
        break;

      case 'combined':
        steeringForce = this._combined(entity, position, velocity, steering, world);
        break;
    }

    // Add containment force if bounds are set (applies to ALL behaviors)
    if (steering.containmentBounds) {
      const containmentForce = this._containment(position, velocity, steering);
      steeringForce = {
        x: steeringForce.x + containmentForce.x,
        y: steeringForce.y + containmentForce.y,
      };
    }

    // Apply steering force (clamped to maxForce)
    const force = this._limit(steeringForce, steering.maxForce);

    // Update velocity
    const newVx = velocity.vx + force.x * deltaTime;
    const newVy = velocity.vy + force.y * deltaTime;

    // Limit to max speed (use squared comparison to avoid sqrt when possible)
    const speedSquared = newVx * newVx + newVy * newVy;
    const maxSpeedSquared = steering.maxSpeed * steering.maxSpeed;

    if (speedSquared > maxSpeedSquared) {
      const speed = Math.sqrt(speedSquared); // Only compute sqrt when needed
      const scale = steering.maxSpeed / speed;
      setComponentProperties<VelocityComponent>(impl, CT.Velocity, {
        vx: newVx * scale,
        vy: newVy * scale,
      });
    } else {
      setComponentProperties<VelocityComponent>(impl, CT.Velocity, {
        vx: newVx,
        vy: newVy,
      });
    }
  }

  /**
   * Seek behavior - move toward target
   */
  private _seek(position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent): Vector2 {
    if (!steering.target) {
      throw new Error('Seek behavior requires target position');
    }

    const desired = {
      x: steering.target.x - position.x,
      y: steering.target.y - position.y,
    };

    // PERFORMANCE: sqrt required for normalization to create unit vector
    // Normalize and scale to max speed
    const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
    if (distance === 0) return { x: 0, y: 0 };

    desired.x = (desired.x / distance) * steering.maxSpeed;
    desired.y = (desired.y / distance) * steering.maxSpeed;

    // Steering = desired - current
    return {
      x: desired.x - velocity.vx,
      y: desired.y - velocity.vy,
    };
  }

  /**
   * Arrive behavior - slow down when approaching target
   * Fixed to prevent jittering/oscillation when reaching target
   * Includes stuck detection for dead-end scenarios
   */
  private _arrive(position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent, entityId?: string): Vector2 {
    if (!steering.target) {
      throw new Error('Arrive behavior requires target position');
    }

    const desired = {
      x: steering.target.x - position.x,
      y: steering.target.y - position.y,
    };

    const distanceSquared = desired.x * desired.x + desired.y * desired.y;
    if (distanceSquared === 0) return { x: 0, y: 0 };

    // Stuck detection: Check if agent is making progress toward target
    if (entityId) {
      const tracker = this.stuckTracker.get(entityId);
      const now = Date.now();

      if (!tracker) {
        // Initialize tracker
        this.stuckTracker.set(entityId, {
          lastPos: { x: position.x, y: position.y },
          stuckTime: now,
          target: { x: steering.target.x, y: steering.target.y }
        });
      } else {
        // Check if position changed significantly
        const dx = position.x - tracker.lastPos.x;
        const dy = position.y - tracker.lastPos.y;
        const movedSquared = dx * dx + dy * dy;
        const thresholdSquared = this.STUCK_DISTANCE_THRESHOLD * this.STUCK_DISTANCE_THRESHOLD;

        if (movedSquared > thresholdSquared) {
          // Made progress, reset stuck timer
          tracker.lastPos = { x: position.x, y: position.y };
          tracker.stuckTime = now;
        } else if (now - tracker.stuckTime > this.STUCK_DETECTION_TIME) {
          // Stuck for too long - need pathfinding!
          // For now, just add random jitter to try different angles
          desired.x += (Math.random() - 0.5) * this.JITTER_RANGE;
          desired.y += (Math.random() - 0.5) * this.JITTER_RANGE;
          tracker.stuckTime = now; // Reset to prevent spam
        }
      }
    }

    // Dead zone - prevent micro-adjustments when very close (use squared comparison)
    const deadZone = steering.deadZone ?? steeringConfig.arrive.deadZone;
    const deadZoneSquared = deadZone * deadZone;
    if (distanceSquared < deadZoneSquared) {
      // Within dead zone - apply proportional braking that decays velocity smoothly
      // Using velocity dampening instead of hard negative force to prevent oscillation
      // This returns a force that will zero velocity over ~2-3 frames
      return { x: -velocity.vx * 2, y: -velocity.vy * 2 };
    }

    // Check if already stopped and within tolerance (use squared comparison)
    const speedSquared = velocity.vx * velocity.vx + velocity.vy * velocity.vy;
    const arrivalTolerance = steering.arrivalTolerance ?? steeringConfig.arrive.arrivalTolerance;
    const arrivalToleranceSquared = arrivalTolerance * arrivalTolerance;

    if (distanceSquared < arrivalToleranceSquared && speedSquared < 0.01) { // 0.1 * 0.1 = 0.01
      // Already stopped and close enough - apply gentle brake
      return { x: -velocity.vx, y: -velocity.vy };
    }

    // PERFORMANCE: sqrt required for normalization to create unit vector
    // Compute actual distance only when needed for normalization
    const distance = Math.sqrt(distanceSquared);

    // Slow down within slowing radius
    const slowingRadius = steering.slowingRadius ?? steeringConfig.arrive.slowingRadius;
    let targetSpeed = steering.maxSpeed;

    if (distance < slowingRadius) {
      // Quadratic slow-down for smoother deceleration
      const slowFactor = distance / slowingRadius;
      targetSpeed = steering.maxSpeed * slowFactor * slowFactor;

      // Extra damping when very close to prevent oscillation
      if (distance < arrivalTolerance * 2) {
        targetSpeed *= 0.5;
      }
    }

    // Normalize and scale
    desired.x = (desired.x / distance) * targetSpeed;
    desired.y = (desired.y / distance) * targetSpeed;

    return {
      x: desired.x - velocity.vx,
      y: desired.y - velocity.vy,
    };
  }

  /**
   * Obstacle avoidance - check only immediate nearby tiles (simplified for performance)
   * Performance: Uses chunk-based spatial lookup instead of scanning all entities.
   */
  private _avoidObstacles(entity: Entity, position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent, world: World): Vector2 {
    const lookAheadDistance = steering.lookAheadDistance ?? steeringConfig.obstacleAvoidance.lookAheadDistance;

    // PERFORMANCE: sqrt required for normalization to create unit direction vector
    // Ray-cast ahead
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    if (speed === 0) return { x: 0, y: 0 };

    const ahead = {
      x: position.x + (velocity.vx / speed) * lookAheadDistance,
      y: position.y + (velocity.vy / speed) * lookAheadDistance,
    };

    // OPTIMIZATION: Use chunk-based spatial index for nearby entity lookup
    const checkRadius = steeringConfig.obstacleAvoidance.checkRadius;
    const chunkX = Math.floor(position.x / this.CHUNK_SIZE);
    const chunkY = Math.floor(position.y / this.CHUNK_SIZE);

    // Collect obstacles from nearby chunks
    // Check for: PhysicsComponent (solid=true), BuildingComponent (blocksMovement=true)
    const obstacles: Array<{ entity: Entity; radius: number }> = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nearbyEntityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);
        for (const nearbyId of nearbyEntityIds) {
          if (nearbyId === entity.id) continue;

          const e = world.entities.get(nearbyId);
          if (!e) continue;

          const obstaclePos = getPosition(e);
          if (!obstaclePos) continue;

          // Check if entity is a solid obstacle (physics or building)
          let obstacleRadius = 0;
          const impl = e as EntityImpl;

          // Check PhysicsComponent first (trees, rocks, solid objects)
          const physics = impl.getComponent<PhysicsComponent>(CT.Physics);
          if (physics && physics.solid) {
            // Use average of width/height as radius, minimum from config
            obstacleRadius = Math.max(
              steeringConfig.obstacleAvoidance.minObstacleRadius,
              (physics.width + physics.height) / 4
            );
          }

          // Check BuildingComponent (chests, beds, furniture)
          const building = impl.getComponent<BuildingComponent>(CT.Building);
          if (building && building.blocksMovement) {
            // Buildings are typically 1x1 tiles
            obstacleRadius = Math.max(
              obstacleRadius,
              steeringConfig.obstacleAvoidance.minObstacleRadius
            );
          }

          // Skip if not a solid obstacle
          if (obstacleRadius === 0) continue;

          // Quick distance check to filter out far obstacles BEFORE detailed checks
          const quickDist = Math.abs(obstaclePos.x - position.x) + Math.abs(obstaclePos.y - position.y);
          if (quickDist > checkRadius * 2) continue; // Manhattan distance early exit

          // Check if obstacle is in path (use squared distance for performance)
          const distSquared = this._distanceSquared(ahead, obstaclePos);
          const thresholdSquared = (obstacleRadius + 1.0) * (obstacleRadius + 1.0);
          if (distSquared <= thresholdSquared) {
            obstacles.push({ entity: e, radius: obstacleRadius });
          }
        }
      }
    }

    if (obstacles.length === 0) {
      return { x: 0, y: 0 };
    }

    // Find closest obstacle (use squared distance for performance - no sqrt needed for comparison)
    const closest = obstacles.reduce((prev, curr) => {
      const prevPos = getPosition(prev.entity);
      const currPos = getPosition(curr.entity);
      if (!prevPos || !currPos) return prev;
      const prevDistSq = this._distanceSquared(position, prevPos);
      const currDistSq = this._distanceSquared(position, currPos);
      return currDistSq < prevDistSq ? curr : prev;
    });

    const obstaclePos = getPosition(closest.entity);
    if (!obstaclePos) {
      return { x: 0, y: 0 };
    }

    // Calculate steering force to avoid obstacle
    // Steer perpendicular to current heading to go around obstacle
    const toObstacle = {
      x: obstaclePos.x - position.x,
      y: obstaclePos.y - position.y,
    };

    // Normalize velocity to get heading
    const heading = {
      x: velocity.vx / speed,
      y: velocity.vy / speed,
    };

    // Calculate perpendicular directions (left and right of heading)
    const perpLeft = { x: -heading.y, y: heading.x };
    const perpRight = { x: heading.y, y: -heading.x };

    // Choose direction that moves away from obstacle
    // Dot product tells us which side the obstacle is on
    const dotLeft = toObstacle.x * perpLeft.x + toObstacle.y * perpLeft.y;
    const dotRight = toObstacle.x * perpRight.x + toObstacle.y * perpRight.y;

    // Steer in the direction opposite to the obstacle
    const steerDir = dotLeft < dotRight ? perpLeft : perpRight;

    return {
      x: steerDir.x * steering.maxForce,
      y: steerDir.y * steering.maxForce,
    };
  }

  /**
   * Wander behavior - random but coherent movement
   * Note: Containment is now applied globally after all steering behaviors
   */
  private _wander(position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent): Vector2 {
    const wanderRadius = steering.wanderRadius ?? steeringConfig.wander.defaultRadius;
    const wanderDistance = steering.wanderDistance ?? steeringConfig.wander.defaultDistance;
    const wanderJitter = steering.wanderJitter ?? steeringConfig.wander.defaultJitter;

    // Get or initialize wander angle
    if (steering.wanderAngle === undefined) {
      steering.wanderAngle = Math.random() * Math.PI * 2;
    }

    // Jitter the wander angle
    steering.wanderAngle += (Math.random() - 0.5) * wanderJitter;

    // PERFORMANCE: sqrt required for normalization to create unit direction vector
    // Calculate circle center (ahead of agent)
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    let circleCenter = { x: 0, y: 0 };

    if (speed > 0) {
      circleCenter = {
        x: position.x + (velocity.vx / speed) * wanderDistance,
        y: position.y + (velocity.vy / speed) * wanderDistance,
      };
    } else {
      circleCenter = { x: position.x, y: position.y + wanderDistance };
    }

    // Calculate target on circle
    const target = {
      x: circleCenter.x + Math.cos(steering.wanderAngle) * wanderRadius,
      y: circleCenter.y + Math.sin(steering.wanderAngle) * wanderRadius,
    };

    return this._seek(position, velocity, { ...steering, target });
  }

  /**
   * Containment behavior - steer back toward bounds center when near edges
   */
  private _containment(position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent): Vector2 {
    const bounds = steering.containmentBounds;
    if (!bounds) return { x: 0, y: 0 };

    const margin = steering.containmentMargin;
    let forceX = 0;
    let forceY = 0;

    // Calculate distance to each boundary
    const distToMinX = position.x - bounds.minX;
    const distToMaxX = bounds.maxX - position.x;
    const distToMinY = position.y - bounds.minY;
    const distToMaxY = bounds.maxY - position.y;

    // Calculate center of bounds
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Apply force proportional to how close agent is to boundary
    // Force increases as agent gets closer to edge
    if (distToMinX < margin) {
      // Near left edge - steer right (toward center)
      const urgency = 1 - (distToMinX / margin);
      forceX += steering.maxForce * urgency;
    }
    if (distToMaxX < margin) {
      // Near right edge - steer left (toward center)
      const urgency = 1 - (distToMaxX / margin);
      forceX -= steering.maxForce * urgency;
    }
    if (distToMinY < margin) {
      // Near bottom edge - steer up (toward center)
      const urgency = 1 - (distToMinY / margin);
      forceY += steering.maxForce * urgency;
    }
    if (distToMaxY < margin) {
      // Near top edge - steer down (toward center)
      const urgency = 1 - (distToMaxY / margin);
      forceY -= steering.maxForce * urgency;
    }

    // If completely outside bounds, seek center strongly
    if (position.x < bounds.minX || position.x > bounds.maxX ||
        position.y < bounds.minY || position.y > bounds.maxY) {
      const seekTarget = { x: centerX, y: centerY };
      return this._seek(position, velocity, { ...steering, target: seekTarget });
    }

    return { x: forceX, y: forceY };
  }

  /**
   * Combined behaviors - blend multiple steering forces
   */
  private _combined(entity: Entity, position: PositionComponent, velocity: VelocityComponent, steering: SteeringComponent, world: World): Vector2 {
    if (!steering.behaviors || steering.behaviors.length === 0) {
      return { x: 0, y: 0 };
    }

    const combined = { x: 0, y: 0 };

    for (const behavior of steering.behaviors) {
      const weight = behavior.weight ?? 1.0;
      let force: Vector2 = { x: 0, y: 0 };

      switch (behavior.type) {
        case 'seek':
          force = this._seek(position, velocity, { ...steering, target: behavior.target });
          break;

        case 'obstacle_avoidance':
          force = this._avoidObstacles(entity, position, velocity, steering, world);
          break;

        case 'wander':
          force = this._wander(position, velocity, steering);
          break;
      }

      combined.x += force.x * weight;
      combined.y += force.y * weight;
    }

    return combined;
  }

  /**
   * Limit vector magnitude
   */
  private _limit(vector: Vector2, max: number): Vector2 {
    // PERFORMANCE: sqrt required for normalization when clamping vector to max length
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (magnitude > max) {
      return {
        x: (vector.x / magnitude) * max,
        y: (vector.y / magnitude) * max,
      };
    }
    return vector;
  }

  /**
   * Calculate squared distance between two points (faster - no sqrt)
   * Use this for distance comparisons to avoid expensive sqrt operations
   */
  private _distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculate distance between two points
   * PERFORMANCE: sqrt required for actual distance value - prefer _distanceSquared for comparisons
   * Only use when you need the actual distance value (not for comparisons)
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
