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
  createNeedsComponent,
  createMemoryComponent,
  createVisionComponent,
  createConversationComponent,
  createRelationshipComponent,
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

  // Needs - hunger and energy
  entity.addComponent(createNeedsComponent(100, 100, 2.0, 1.0));

  // Memory - remember up to 20 things, decay 1 point/sec
  entity.addComponent(createMemoryComponent(20, 1.0));

  // Vision - see 10 tiles around, can see both agents and resources
  entity.addComponent(createVisionComponent(10, 360, true, true));

  // Conversation - can talk to other agents, remember last 10 messages
  entity.addComponent(createConversationComponent(10));

  // Relationships - track familiarity with other agents
  entity.addComponent(createRelationshipComponent());

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}

/**
 * Create an LLM-controlled agent that uses an AI model for decision making.
 */
export function createLLMAgent(
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
  entity.addComponent(createTagsComponent('agent', 'llm_agent'));

  // Agent behavior - LLM-controlled
  entity.addComponent(createAgentComponent('wander', 20, true)); // useLLM = true

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Needs - hunger and energy
  entity.addComponent(createNeedsComponent(100, 100, 2.0, 1.0));

  // Memory - remember up to 20 things, decay 1 point/sec
  entity.addComponent(createMemoryComponent(20, 1.0));

  // Vision - see 10 tiles around, can see both agents and resources
  entity.addComponent(createVisionComponent(10, 360, true, true));

  // Conversation - can talk to other agents, remember last 10 messages
  entity.addComponent(createConversationComponent(10));

  // Relationships - track familiarity with other agents
  entity.addComponent(createRelationshipComponent());

  // Add to world
  (world as any)._addEntity(entity);

  return entity.id;
}
