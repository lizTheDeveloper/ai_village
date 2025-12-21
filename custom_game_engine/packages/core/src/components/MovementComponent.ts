import type { Component } from '../ecs/Component.js';

export interface MovementComponent extends Component {
  type: 'movement';
  velocityX: number;
  velocityY: number;
  speed: number; // Base movement speed (tiles per second)
  targetX?: number;
  targetY?: number;
}

export function createMovementComponent(
  speed: number = 2.0,
  velocityX: number = 0,
  velocityY: number = 0
): MovementComponent {
  return {
    type: 'movement',
    version: 1,
    velocityX,
    velocityY,
    speed,
  };
}
