/**
 * Navigation and Exploration Behaviors
 *
 * These behaviors handle movement to specific locations and exploration patterns.
 * They integrate with the SteeringSystem and ExplorationSystem.
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import { CT } from '../../types.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SteeringComponent } from '../../components/SteeringComponent.js';
import type { SocialGradientComponent } from '../../components/SocialGradientComponent.js';
import type { ResourceType } from '../../components/ResourceComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * Navigate behavior - Move to specific (x, y) coordinates
 * Expects behaviorState.target = { x, y }
 */
export class NavigateBehavior extends BaseBehavior {
  readonly name = 'navigate';

  execute(entity: EntityImpl, _world: World): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;

    // Check if we have a target
    if (!agent.behaviorState || !agent.behaviorState.target) {
      return { complete: true, reason: 'No target specified' };
    }

    const target = agent.behaviorState.target as { x: number; y: number };

    // Use steering system if available
    if (entity.hasComponent(CT.Steering)) {
      entity.updateComponent<SteeringComponent>(ComponentType.Steering, (steering) => ({
        ...steering,
        behavior: 'arrive',
        target: target,
      }));
      return;
    }

    // Fallback: use our moveToward helper
    this.disableSteering(entity);
    const distance = this.moveToward(entity, target, { arrivalDistance: 2.0 });

    if (distance <= 2.0) {
      // Arrived at target
      this.stopAllMovement(entity);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
        behaviorCompleted: true,
      }));
      return { complete: true, reason: 'Arrived at target' };
    }
  }
}

/**
 * Explore frontier behavior - Explore edges of known territory
 * Delegates to ExplorationSystem
 */
export class ExploreFrontierBehavior extends BaseBehavior {
  readonly name = 'explore_frontier';

  execute(entity: EntityImpl, _world: World): BehaviorResult | void {
    // ExplorationSystem handles the heavy lifting based on agent behavior
    // The behavior just indicates we want frontier exploration mode
    if (!entity.hasComponent(CT.ExplorationState)) {
      return { complete: false, reason: 'No exploration component' };
    }
    // ExplorationSystem will pick this up and set steering targets
  }
}

/**
 * Explore spiral behavior - Spiral outward from home base
 * Delegates to ExplorationSystem
 */
export class ExploreSpiralBehavior extends BaseBehavior {
  readonly name = 'explore_spiral';

  execute(entity: EntityImpl, _world: World): BehaviorResult | void {
    // ExplorationSystem handles the heavy lifting based on agent behavior
    if (!entity.hasComponent(CT.ExplorationState)) {
      return { complete: false, reason: 'No exploration component' };
    }
    // ExplorationSystem will pick this up and set steering targets
  }
}

/**
 * Follow gradient behavior - Follow social gradients to resources
 * Uses SocialGradient component to determine direction
 */
export class FollowGradientBehavior extends BaseBehavior {
  readonly name = 'follow_gradient';

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;

    // Check if we have social gradient component
    if (!entity.hasComponent(CT.SocialGradient)) {
      return { complete: false, reason: 'No social gradient component' };
    }

    const socialGradient = entity.getComponent<SocialGradientComponent>(ComponentType.SocialGradient);
    if (!socialGradient) {
      return { complete: false, reason: 'Could not get social gradient' };
    }

    // Get resource type from behaviorState or use default
    const resourceType = (agent.behaviorState?.resourceType || 'wood') as ResourceType;

    // Get gradients for resource type
    const gradients = socialGradient.getGradients(resourceType, world.tick);
    const gradient = gradients.length > 0 ? gradients[0] : null;

    if (!gradient || !gradient.claimPosition) {
      // No gradient available - switch to explore
      this.switchTo(entity, 'explore_frontier', {});
      return { complete: false, reason: 'No gradient available' };
    }

    // Move toward gradient claim position
    this.disableSteering(entity);
    const distance = this.moveToward(entity, gradient.claimPosition);

    if (distance <= 2.0) {
      // Arrived at gradient source - switch to gather
      this.stopAllMovement(entity);
      this.switchTo(entity, 'gather', { resourceType });
      return { complete: true, reason: 'Arrived at gradient source' };
    }
  }
}

// Standalone functions for BehaviorRegistry
export function navigateBehavior(entity: EntityImpl, world: World): void {
  new NavigateBehavior().execute(entity, world);
}

export function exploreFrontierBehavior(entity: EntityImpl, world: World): void {
  new ExploreFrontierBehavior().execute(entity, world);
}

export function exploreSpiralBehavior(entity: EntityImpl, world: World): void {
  new ExploreSpiralBehavior().execute(entity, world);
}

export function followGradientBehavior(entity: EntityImpl, world: World): void {
  new FollowGradientBehavior().execute(entity, world);
}
