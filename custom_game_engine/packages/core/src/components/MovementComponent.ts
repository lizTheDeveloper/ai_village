import type { Component } from '../ecs/Component.js';
import { MOVEMENT_CONFIG } from '../constants/GameBalance.js';

/**
 * Movement component for entities that can move.
 *
 * Scale: 1 tile = 1 meter, humans are 2 tiles tall
 * Time: 1 game hour = 60 real seconds
 *
 * Default walking speed of 83 tiles/sec = ~5 km/game-hour
 */
export interface MovementComponent extends Component {
  type: 'movement';
  velocityX: number;
  velocityY: number;
  speed: number; // Base movement speed (tiles per second)
  targetX?: number;
  targetY?: number;
}

export function createMovementComponent(
  speed: number = MOVEMENT_CONFIG.DEFAULT_MOVE_SPEED,
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
