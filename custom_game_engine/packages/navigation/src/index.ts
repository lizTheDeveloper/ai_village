/**
 * @ai-village/navigation - Navigation and movement systems
 *
 * This package provides core navigation systems for:
 * - Movement (position updates, collision detection, velocity application)
 * - Steering (seek, arrive, wander, obstacle avoidance behaviors)
 * - Exploration (frontier and spiral exploration algorithms)
 *
 * These systems work together to provide smooth, intelligent movement
 * for agents and other entities in the game world.
 */

// Systems
export { MovementSystem } from './systems/MovementSystem.js';
export { SteeringSystem } from './systems/SteeringSystem.js';
export { ExplorationSystem } from './systems/ExplorationSystem.js';

// Re-export core types for convenience
export type {
  System,
  SystemId,
  ComponentType,
  World,
  Entity,
  MovementComponent,
  PositionComponent,
  VelocityComponent,
  SteeringComponent,
  SteeringBehavior,
  ExplorationStateComponent,
} from '@ai-village/core';
