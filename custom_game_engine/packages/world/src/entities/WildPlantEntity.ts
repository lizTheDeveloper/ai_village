import type { WorldMutator } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createResourceComponent,
  PlantComponent,
} from '@ai-village/core';
import {
  MUSHROOM,
  FERN,
  MOSS,
  WILDFLOWER,
  GRASS,
  SAGE,
  YARROW,
  WILD_GARLIC,
  WILD_ONION,
  CLOVER,
  THISTLE,
} from '../plant-species/wild-plants.js';

/**
 * Create a mushroom entity at the specified position.
 * Mushrooms are food sources that are destroyed when harvested.
 */
export function createMushroom(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('mushroom', 'object'));
  entity.addComponent(createTagsComponent('mushroom', 'harvestable', 'food'));
  entity.addComponent(createResourceComponent('food', 15, 0.1));
  entity.addComponent(new PlantComponent({
    speciesId: MUSHROOM.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 90,
    nutrition: 60,
    harvestDestroysPlant: true,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a fern entity at the specified position.
 * Ferns provide fiber and thrive in moist, shaded environments.
 */
export function createFern(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('fern', 'object'));
  entity.addComponent(createTagsComponent('fern', 'harvestable', 'herb'));
  entity.addComponent(createResourceComponent('fiber', 20, 0.2));
  entity.addComponent(new PlantComponent({
    speciesId: FERN.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 75,
    nutrition: 50,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a moss entity at the specified position.
 * Moss provides small amounts of fiber and grows in wet conditions.
 */
export function createMoss(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('moss', 'object'));
  entity.addComponent(createTagsComponent('moss', 'harvestable'));
  entity.addComponent(createResourceComponent('fiber', 10, 0.15));
  entity.addComponent(new PlantComponent({
    speciesId: MOSS.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 80,
    nutrition: 40,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a wildflower entity at the specified position.
 * Wildflowers provide fiber and brighten open meadows.
 */
export function createWildflower(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('wildflower', 'object'));
  entity.addComponent(createTagsComponent('wildflower', 'harvestable', 'flower'));
  entity.addComponent(createResourceComponent('fiber', 15, 0.2));
  entity.addComponent(new PlantComponent({
    speciesId: WILDFLOWER.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 60,
    nutrition: 50,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a grass entity at the specified position.
 * Grass is a common ground cover providing small amounts of fiber.
 */
export function createGrass(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('grass', 'object'));
  entity.addComponent(createTagsComponent('grass', 'harvestable'));
  entity.addComponent(createResourceComponent('fiber', 10, 0.3));
  entity.addComponent(new PlantComponent({
    speciesId: GRASS.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 50,
    nutrition: 40,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a wild herb entity at the specified position.
 * Randomly picks from sage, yarrow, wild garlic, or wild onion.
 */
export function createWildHerb(world: WorldMutator, x: number, y: number): string {
  const herbSpecies = [SAGE, YARROW, WILD_GARLIC, WILD_ONION];
  const species = herbSpecies[Math.floor(Math.random() * herbSpecies.length)]!; // Non-null assertion - array is never empty

  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent(species.id, 'object'));
  entity.addComponent(createTagsComponent('herb', 'harvestable', 'medicinal'));
  entity.addComponent(createResourceComponent('fiber', 20, 0.1));
  entity.addComponent(new PlantComponent({
    speciesId: species.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 60,
    nutrition: 50,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a clover entity at the specified position.
 * Clover is a forage plant providing small amounts of food.
 */
export function createClover(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('clover', 'object'));
  entity.addComponent(createTagsComponent('clover', 'harvestable', 'forage'));
  entity.addComponent(createResourceComponent('food', 10, 0.2));
  entity.addComponent(new PlantComponent({
    speciesId: CLOVER.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 60,
    nutrition: 55,
  }));

  world.addEntity(entity);
  return entity.id;
}

/**
 * Create a thistle entity at the specified position.
 * Thistles are hardy plants providing fiber in dry and rocky terrain.
 */
export function createThistle(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(false, 1, 1));
  entity.addComponent(createRenderableComponent('thistle', 'object'));
  entity.addComponent(createTagsComponent('thistle', 'harvestable', 'herb'));
  entity.addComponent(createResourceComponent('fiber', 15, 0.1));
  entity.addComponent(new PlantComponent({
    speciesId: THISTLE.id,
    position: { x, y },
    stage: 'mature',
    health: 100,
    hydration: 40,
    nutrition: 35,
  }));

  world.addEntity(entity);
  return entity.id;
}
