import { ComponentBase } from '../ecs/Component.js';

export interface VelocityComponentData {
  vx: number;
  vy: number;
}

/**
 * VelocityComponent stores velocity (used by SteeringSystem)
 * Distinct from MovementComponent which stores speed/direction for basic movement
 */
export class VelocityComponent extends ComponentBase {
  public readonly type = 'Velocity';
  public vx: number;
  public vy: number;

  constructor(data: VelocityComponentData) {
    super();
    this.vx = data.vx;
    this.vy = data.vy;
  }
}

/**
 * Create a velocity component with default values (stationary)
 */
export function createVelocityComponent(vx: number = 0, vy: number = 0): VelocityComponent {
  return new VelocityComponent({ vx, vy });
}
