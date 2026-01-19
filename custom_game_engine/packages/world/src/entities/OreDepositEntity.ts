import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
} from '@ai-village/core';

/**
 * Create an iron ore deposit entity at the specified position.
 * Iron is common and provides moderate amounts of ore.
 */
export function createIronDeposit(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (deposits are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('iron_deposit', 'object'));

  // Tags - must match gatherSources in defaultItems.ts
  entity.addComponent(createTagsComponent('iron_deposit', 'obstacle', 'minable'));

  // Resource - iron ore, finite (no regeneration)
  const amount = 50 + Math.floor(Math.random() * 51); // 50-100
  entity.addComponent(createResourceComponent('iron_ore', amount, 0));

  // Add to world
  world.addEntity(entity);

  return entity.id;
}

/**
 * Create a coal deposit entity at the specified position.
 * Coal is common and used as fuel for forges.
 */
export function createCoalDeposit(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (deposits are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('coal_deposit', 'object'));

  // Tags - must match gatherSources in defaultItems.ts
  entity.addComponent(createTagsComponent('coal_deposit', 'obstacle', 'minable'));

  // Resource - coal, finite (no regeneration)
  const amount = 40 + Math.floor(Math.random() * 41); // 40-80
  entity.addComponent(createResourceComponent('coal', amount, 0));

  // Add to world
  world.addEntity(entity);

  return entity.id;
}

/**
 * Create a copper ore deposit entity at the specified position.
 * Copper is uncommon and provides moderate amounts of ore.
 */
export function createCopperDeposit(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (deposits are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('copper_deposit', 'object'));

  // Tags - must match gatherSources in defaultItems.ts
  entity.addComponent(createTagsComponent('copper_deposit', 'obstacle', 'minable'));

  // Resource - copper ore, finite (no regeneration)
  const amount = 30 + Math.floor(Math.random() * 31); // 30-60
  entity.addComponent(createResourceComponent('copper_ore', amount, 0));

  // Add to world
  world.addEntity(entity);

  return entity.id;
}

/**
 * Create a gold ore deposit entity at the specified position.
 * Gold is rare and provides smaller amounts of ore.
 */
export function createGoldDeposit(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics (deposits are solid obstacles)
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('gold_deposit', 'object'));

  // Tags - must match gatherSources in defaultItems.ts
  entity.addComponent(createTagsComponent('gold_deposit', 'obstacle', 'minable'));

  // Resource - gold ore, finite (no regeneration)
  const amount = 15 + Math.floor(Math.random() * 16); // 15-30
  entity.addComponent(createResourceComponent('gold_ore', amount, 0));

  // Add to world
  world.addEntity(entity);

  return entity.id;
}
