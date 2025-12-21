import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { isHungry } from '../components/NeedsComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';

interface BehaviorHandler {
  (entity: EntityImpl, world: World): void;
}

export class AISystem implements System {
  public readonly id: SystemId = 'ai';
  public readonly priority: number = 10; // Run before movement (priority 20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'agent',
    'position',
    'movement',
  ];

  private behaviors: Map<string, BehaviorHandler> = new Map();

  constructor() {
    this.registerBehavior('wander', this.wanderBehavior.bind(this));
    this.registerBehavior('idle', this.idleBehavior.bind(this));
    this.registerBehavior('seek_food', this.seekFoodBehavior.bind(this));
  }

  registerBehavior(name: string, handler: BehaviorHandler): void {
    this.behaviors.set(name, handler);
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const agent = impl.getComponent<AgentComponent>('agent')!;

      // Check if it's time to think
      const ticksSinceLastThink = world.tick - agent.lastThinkTick;
      if (ticksSinceLastThink < agent.thinkInterval) {
        continue;
      }

      // Update last think time
      impl.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        lastThinkTick: world.tick,
      }));

      // Check needs and switch behavior if necessary
      const needs = impl.getComponent<NeedsComponent>('needs');
      if (needs && isHungry(needs)) {
        // Switch to seeking food if hungry
        if (agent.behavior !== 'seek_food') {
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'seek_food',
            behaviorState: {},
          }));
        }
      } else if (agent.behavior === 'seek_food' && needs && !isHungry(needs)) {
        // Switch back to wandering when no longer hungry
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'wander',
          behaviorState: {},
        }));
      }

      // Execute current behavior
      const handler = this.behaviors.get(agent.behavior);
      if (handler) {
        handler(impl, world);
      }
    }
  }

  private wanderBehavior(entity: EntityImpl): void {
    const movement = entity.getComponent<MovementComponent>('movement')!;

    // Choose a random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = movement.speed;

    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    // Update movement velocity
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX,
      velocityY,
    }));
  }

  private idleBehavior(entity: EntityImpl): void {
    // Do nothing - just stop moving
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));
  }

  private seekFoodBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;

    // Find nearest food resource
    const foodResources = world
      .query()
      .with('resource')
      .with('position')
      .executeEntities();

    let nearestFood: Entity | null = null;
    let nearestDistance = Infinity;

    for (const resource of foodResources) {
      const resourceImpl = resource as EntityImpl;
      const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
      const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

      // Only consider food resources that have amount available
      if (resourceComp.resourceType === 'food' && resourceComp.amount > 0) {
        const distance = Math.sqrt(
          Math.pow(resourcePos.x - position.x, 2) +
            Math.pow(resourcePos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestFood = resource;
        }
      }
    }

    if (!nearestFood) {
      // No food found, wander
      this.wanderBehavior(entity);
      return;
    }

    const nearestFoodImpl = nearestFood as EntityImpl;
    const targetPos = nearestFoodImpl.getComponent<PositionComponent>('position')!;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5) {
      // Harvest the food
      const resourceComp = nearestFoodImpl.getComponent<ResourceComponent>('resource')!;
      const harvestAmount = Math.min(20, resourceComp.amount); // Harvest 20 food

      // Update resource
      nearestFoodImpl.updateComponent<ResourceComponent>('resource', (current) => ({
        ...current,
        amount: Math.max(0, current.amount - harvestAmount),
      }));

      // Update agent's hunger
      const needs = entity.getComponent<NeedsComponent>('needs');
      if (needs) {
        entity.updateComponent<NeedsComponent>('needs', (current) => ({
          ...current,
          hunger: Math.min(100, current.hunger + harvestAmount),
        }));
      }

      // Stop moving while harvesting
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));

      // Emit harvest event
      world.eventBus.emit({
        type: 'agent:harvested',
        source: entity.id,
        data: {
          agentId: entity.id,
          resourceId: nearestFood.id,
          amount: harvestAmount,
        },
      });
    } else {
      // Move towards the food
      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normalize and apply speed
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }
}
