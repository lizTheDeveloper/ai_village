import { ComponentBase } from '../ecs/Component.js';

export type SteeringBehavior = 'seek' | 'arrive' | 'obstacle_avoidance' | 'wander' | 'combined' | 'none';

export interface SteeringComponentData {
  behavior: SteeringBehavior;
  maxSpeed?: number;
  maxForce?: number;
  target?: { x: number; y: number };
  wanderAngle?: number;
  slowingRadius?: number;
  arrivalTolerance?: number;
  lookAheadDistance?: number;
  wanderRadius?: number;
  wanderDistance?: number;
  wanderJitter?: number;
  behaviors?: Array<{
    type: SteeringBehavior;
    weight?: number;
    target?: { x: number; y: number };
  }>;
}

/**
 * SteeringComponent controls steering behaviors for navigation
 * Used by SteeringSystem to calculate movement forces
 */
export class SteeringComponent extends ComponentBase {
  public readonly type = 'Steering';
  public behavior: SteeringBehavior;
  public maxSpeed: number;
  public maxForce: number;
  public target?: { x: number; y: number };
  public wanderAngle?: number;
  public slowingRadius: number;
  public arrivalTolerance: number;
  public lookAheadDistance: number;
  public wanderRadius: number;
  public wanderDistance: number;
  public wanderJitter: number;
  public behaviors?: Array<{
    type: SteeringBehavior;
    weight?: number;
    target?: { x: number; y: number };
  }>;

  constructor(data: SteeringComponentData) {
    super();

    // Validate behavior type - NO FALLBACKS per CLAUDE.md
    const validBehaviors: SteeringBehavior[] = ['seek', 'arrive', 'obstacle_avoidance', 'wander', 'combined', 'none'];
    if (!validBehaviors.includes(data.behavior)) {
      throw new Error(`Invalid steering behavior: ${data.behavior}. Valid: ${validBehaviors.join(', ')}`);
    }

    this.behavior = data.behavior;
    this.maxSpeed = data.maxSpeed ?? 5.0;
    this.maxForce = data.maxForce ?? 10.0;
    this.target = data.target;
    this.wanderAngle = data.wanderAngle;
    this.slowingRadius = data.slowingRadius ?? 5.0;
    this.arrivalTolerance = data.arrivalTolerance ?? 1.0;
    this.lookAheadDistance = data.lookAheadDistance ?? 5.0;
    this.wanderRadius = data.wanderRadius ?? 2.0;
    this.wanderDistance = data.wanderDistance ?? 3.0;
    this.wanderJitter = data.wanderJitter ?? 0.5;
    this.behaviors = data.behaviors;
  }
}

/**
 * Create a steering component with default values
 */
export function createSteeringComponent(
  behavior: SteeringBehavior = 'none',
  maxSpeed: number = 5.0,
  maxForce: number = 10.0
): SteeringComponent {
  return new SteeringComponent({
    behavior,
    maxSpeed,
    maxForce,
  });
}
