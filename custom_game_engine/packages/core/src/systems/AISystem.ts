import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';

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

      // Execute behavior
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
}
