import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType, Position } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SteeringBehavior } from '../components/SteeringComponent.js';

// Using Position from types.ts for all vector operations
type Vector2 = Position;

interface SteeringComponent {
  behavior: SteeringBehavior;
  maxSpeed: number;
  maxForce: number;
  target?: Vector2;
  wanderAngle?: number;
}

interface VelocityComponent {
  vx: number;
  vy: number;
}

/**
 * SteeringSystem implements steering behaviors for navigation
 * Supports: seek, arrive, obstacle avoidance, wander, and combined behaviors
 */
export class SteeringSystem implements System {
  public readonly id: SystemId = 'steering';
  public readonly priority: number = 30; // After AISystem (20), before Movement (40)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get entities with Steering component
    const steeringEntities = entities.filter(e => e.components.has('Steering'));

    for (const entity of steeringEntities) {
      try {
        this._updateSteering(entity, world, deltaTime);
      } catch (error) {
        // Per CLAUDE.md, re-throw with context
        throw new Error(`SteeringSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateSteering(entity: Entity, world: World, deltaTime: number): void {
    const impl = entity as EntityImpl;
    // Validate required components
    if (!impl.hasComponent('Position')) {
      throw new Error('SteeringSystem requires Position component');
    }
    if (!impl.hasComponent('Velocity')) {
      throw new Error('SteeringSystem requires Velocity component');
    }

    const steering = impl.getComponent('Steering') as any as SteeringComponent;
    if (!steering) {
      throw new Error('Steering component missing');
    }
    const position = impl.getComponent('Position') as any as Vector2;
    if (!position) {
      throw new Error('Position component missing');
    }
    const velocity = impl.getComponent('Velocity') as any as VelocityComponent;
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
        steeringForce = this._arrive(position, velocity, steering);
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

    // Apply steering force (clamped to maxForce)
    const force = this._limit(steeringForce, steering.maxForce);

    // Update velocity
    const newVx = velocity.vx + force.x * deltaTime;
    const newVy = velocity.vy + force.y * deltaTime;

    // Limit to max speed
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    if (speed > steering.maxSpeed) {
      const scale = steering.maxSpeed / speed;
      impl.updateComponent('Velocity', (v: any) => ({ ...v, vx: newVx * scale, vy: newVy * scale }));
    } else {
      impl.updateComponent('Velocity', (v: any) => ({ ...v, vx: newVx, vy: newVy }));
    }
  }

  /**
   * Seek behavior - move toward target
   */
  private _seek(position: any, velocity: any, steering: any): Vector2 {
    if (!steering.target) {
      throw new Error('Seek behavior requires target position');
    }

    const desired = {
      x: steering.target.x - position.x,
      y: steering.target.y - position.y,
    };

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
   */
  private _arrive(position: any, velocity: any, steering: any): Vector2 {
    if (!steering.target) {
      throw new Error('Arrive behavior requires target position');
    }

    const desired = {
      x: steering.target.x - position.x,
      y: steering.target.y - position.y,
    };

    const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
    if (distance === 0) return { x: 0, y: 0 };

    // Check if within arrival tolerance
    const arrivalTolerance = steering.arrivalTolerance ?? 1.0;
    if (distance < arrivalTolerance) {
      // Stop
      return { x: -velocity.vx, y: -velocity.vy };
    }

    // Slow down within slowing radius
    const slowingRadius = steering.slowingRadius ?? 5.0;
    let targetSpeed = steering.maxSpeed;

    if (distance < slowingRadius) {
      targetSpeed = steering.maxSpeed * (distance / slowingRadius);
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
   * Obstacle avoidance - ray-cast ahead and steer away
   */
  private _avoidObstacles(entity: Entity, position: any, velocity: any, steering: any, world: World): Vector2 {
    const lookAheadDistance = steering.lookAheadDistance ?? 5.0;

    // Ray-cast ahead
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    if (speed === 0) return { x: 0, y: 0 };

    const ahead = {
      x: position.x + (velocity.vx / speed) * lookAheadDistance,
      y: position.y + (velocity.vy / speed) * lookAheadDistance,
    };

    // Find nearby obstacles
    const obstacles = Array.from(world.entities.values()).filter((e: Entity) => {
      if (e.id === entity.id) return false;
      if (!e.components.has('collision')) return false;

      const obstaclePos = e.components.get('position');
      const collision = e.components.get('collision');
      if (!obstaclePos || !collision) return false;

      // Check if obstacle is in path
      const dist = this._distance(ahead, obstaclePos as any);
      return dist <= (collision as any).radius + 1.0;
    });

    if (obstacles.length === 0) {
      return { x: 0, y: 0 };
    }

    // Find closest obstacle
    const closest = obstacles.reduce((prev: Entity, curr: Entity) => {
      const prevPos = prev.components.get('position');
      const currPos = curr.components.get('position');
      if (!prevPos || !currPos) return prev;
      const prevDist = this._distance(position, prevPos as any);
      const currDist = this._distance(position, currPos as any);
      return currDist < prevDist ? curr : prev;
    });

    const obstaclePos = closest.components.get('position');
    if (!obstaclePos) {
      return { x: 0, y: 0 };
    }

    // Calculate steering force to avoid obstacle
    // Steer perpendicular to current heading to go around obstacle
    const toObstacle = {
      x: (obstaclePos as any).x - position.x,
      y: (obstaclePos as any).y - position.y,
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
   */
  private _wander(position: any, velocity: any, steering: any): Vector2 {
    const wanderRadius = steering.wanderRadius ?? 2.0;
    const wanderDistance = steering.wanderDistance ?? 3.0;
    const wanderJitter = steering.wanderJitter ?? 0.5;

    // Get or initialize wander angle
    if (steering.wanderAngle === undefined) {
      steering.wanderAngle = Math.random() * Math.PI * 2;
    }

    // Jitter the wander angle
    steering.wanderAngle += (Math.random() - 0.5) * wanderJitter;

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

    // Seek to target
    return this._seek(position, velocity, { ...steering, target });
  }

  /**
   * Combined behaviors - blend multiple steering forces
   */
  private _combined(entity: Entity, position: any, velocity: any, steering: any, world: World): Vector2 {
    if (!steering.behaviors || steering.behaviors.length === 0) {
      return { x: 0, y: 0 };
    }

    let combined = { x: 0, y: 0 };

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
   * Calculate distance between two points
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
