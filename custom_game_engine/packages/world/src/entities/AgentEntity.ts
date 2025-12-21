import {
  EntityImpl,
  createEntityId,
  type WorldMutator,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createAgentComponent,
  createMovementComponent,
} from '@ai-village/core';

export function createWanderingAgent(
  world: WorldMutator,
  x: number,
  y: number,
  speed: number = 2.0
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics - agents are not solid (can pass through each other)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('agent', 'entity'));

  // Tags
  entity.addComponent(createTagsComponent('agent', 'wanderer'));

  // Agent behavior
  entity.addComponent(createAgentComponent('wander', 20)); // Think every second

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
