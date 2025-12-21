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
import type { MemoryComponent } from '../components/MemoryComponent.js';
import { addMemory, getMemoriesByType } from '../components/MemoryComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';

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
    this.registerBehavior('follow_agent', this.followAgentBehavior.bind(this));
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

      // Detect nearby agents and resources (if has vision)
      this.processVision(impl, world);

      // Decide behavior based on needs
      const needs = impl.getComponent<NeedsComponent>('needs');
      const currentBehavior = agent.behavior;

      if (needs && isHungry(needs) && currentBehavior !== 'seek_food') {
        // Switch to seeking food when hungry
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'seek_food',
          behaviorState: {},
        }));
      } else if (needs && !isHungry(needs) && currentBehavior === 'seek_food') {
        // Switch back to wandering when satisfied
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'wander',
          behaviorState: {},
        }));
      } else if (currentBehavior === 'wander' && Math.random() < 0.1) {
        // 10% chance to switch to following another agent (social behavior)
        const nearbyAgents = this.getNearbyAgents(impl, world, 15);
        if (nearbyAgents.length > 0) {
          const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'follow_agent',
            behaviorState: { targetId: targetAgent!.id },
          }));
        }
      } else if (currentBehavior === 'follow_agent' && Math.random() < 0.05) {
        // 5% chance to stop following and wander
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

  private processVision(entity: EntityImpl, world: World): void {
    const vision = entity.getComponent<VisionComponent>('vision');
    const memory = entity.getComponent<MemoryComponent>('memory');
    if (!vision || !memory) return;

    const position = entity.getComponent<PositionComponent>('position')!;

    // Detect nearby resources
    if (vision.canSeeResources) {
      const resources = world.query().with('resource').with('position').executeEntities();

      for (const resource of resources) {
        const resourceImpl = resource as EntityImpl;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;

        const distance = Math.sqrt(
          Math.pow(resourcePos.x - position.x, 2) +
          Math.pow(resourcePos.y - position.y, 2)
        );

        if (distance <= vision.range && resourceComp.amount > 0) {
          // Remember this resource location
          const updatedMemory = addMemory(
            memory,
            {
              type: 'resource_location',
              x: resourcePos.x,
              y: resourcePos.y,
              entityId: resource.id,
              metadata: { resourceType: resourceComp.resourceType },
            },
            world.tick,
            80
          );

          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }
      }
    }

    // Detect nearby agents
    if (vision.canSeeAgents) {
      const agents = world.query().with('agent').with('position').executeEntities();

      for (const otherAgent of agents) {
        if (otherAgent.id === entity.id) continue;

        const otherPos = (otherAgent as EntityImpl).getComponent<PositionComponent>('position')!;
        const distance = Math.sqrt(
          Math.pow(otherPos.x - position.x, 2) +
          Math.pow(otherPos.y - position.y, 2)
        );

        if (distance <= vision.range) {
          const updatedMemory = addMemory(
            memory,
            {
              type: 'agent_seen',
              x: otherPos.x,
              y: otherPos.y,
              entityId: otherAgent.id,
            },
            world.tick,
            60
          );

          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }
      }
    }
  }

  private getNearbyAgents(entity: EntityImpl, world: World, range: number): Entity[] {
    const position = entity.getComponent<PositionComponent>('position')!;
    const agents = world.query().with('agent').with('position').executeEntities();

    return agents.filter((other) => {
      if (other.id === entity.id) return false;

      const otherPos = (other as EntityImpl).getComponent<PositionComponent>('position')!;
      const distance = Math.sqrt(
        Math.pow(otherPos.x - position.x, 2) +
        Math.pow(otherPos.y - position.y, 2)
      );

      return distance <= range;
    });
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
    const memory = entity.getComponent<MemoryComponent>('memory');

    let targetFood: Entity | null = null;
    let targetPos: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    // First, check memories for known food locations
    if (memory) {
      const foodMemories = getMemoriesByType(memory, 'resource_location');
      for (const mem of foodMemories) {
        if (mem.metadata?.resourceType !== 'food') continue;

        const distance = Math.sqrt(
          Math.pow(mem.x - position.x, 2) +
          Math.pow(mem.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          // Try to get the actual entity
          if (mem.entityId) {
            const resource = world.getEntity(mem.entityId);
            if (resource) {
              const resourceImpl = resource as EntityImpl;
              const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource');
              if (resourceComp && resourceComp.amount > 0) {
                targetFood = resource;
                nearestDistance = distance;
              }
            }
          } else {
            // Just use memory position
            targetPos = { x: mem.x, y: mem.y };
            nearestDistance = distance;
          }
        }
      }
    }

    // If no memory or memory is stale, search for food
    if (!targetFood && !targetPos) {
      const foodResources = world
        .query()
        .with('resource')
        .with('position')
        .executeEntities();

      for (const resource of foodResources) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

        if (resourceComp.resourceType === 'food' && resourceComp.amount > 0) {
          const distance = Math.sqrt(
            Math.pow(resourcePos.x - position.x, 2) +
            Math.pow(resourcePos.y - position.y, 2)
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            targetFood = resource;
          }
        }
      }
    }

    if (!targetFood && !targetPos) {
      // No food found, wander
      this.wanderBehavior(entity);
      return;
    }

    // Get target position
    if (targetFood) {
      const targetFoodImpl = targetFood as EntityImpl;
      const pos = targetFoodImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    }

    if (!targetPos) return;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5 && targetFood) {
      // Harvest the food
      const targetFoodImpl = targetFood as EntityImpl;
      const resourceComp = targetFoodImpl.getComponent<ResourceComponent>('resource')!;
      const harvestAmount = Math.min(20, resourceComp.amount);

      // Update resource
      targetFoodImpl.updateComponent<ResourceComponent>('resource', (current) => ({
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

      // Reinforce memory of this food location
      if (memory) {
        const updatedMemory = addMemory(
          memory,
          {
            type: 'resource_location',
            x: targetPos.x,
            y: targetPos.y,
            entityId: targetFood.id,
            metadata: { resourceType: 'food' },
          },
          world.tick,
          100
        );
        entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
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
          resourceId: targetFood.id,
          amount: harvestAmount,
        },
      });
    } else {
      // Move towards the target
      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  private followAgentBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const agent = entity.getComponent<AgentComponent>('agent')!;

    const targetId = agent.behaviorState?.targetId as string | undefined;
    if (!targetId) {
      // No target, switch to wandering
      this.wanderBehavior(entity);
      return;
    }

    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) {
      // Target no longer exists, switch to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const targetImpl = targetEntity as EntityImpl;
    const targetPos = targetImpl.getComponent<PositionComponent>('position');
    if (!targetPos) return;

    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Keep some distance (3-5 tiles)
    if (distance < 3) {
      // Too close, slow down or stop
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else if (distance > 5) {
      // Too far, speed up to catch up
      const velocityX = (dx / distance) * movement.speed * 1.2;
      const velocityY = (dy / distance) * movement.speed * 1.2;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    } else {
      // Just right, match speed and follow
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
