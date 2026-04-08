import type { WorldMutator } from '@ai-village/core';
import type { ItemCategory } from '@ai-village/core';
import {
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createContainerComponent,
  createInventoryComponent,
} from '@ai-village/core';

// Container type definitions
const CONTAINER_TYPES = {
  stone_shelf: { capacity: 6, preserves: false, acceptedCategories: undefined as ItemCategory[] | undefined },
  crystal_chest: { capacity: 8, preserves: false, acceptedCategories: undefined as ItemCategory[] | undefined },
  frost_cache: { capacity: 4, preserves: true, acceptedCategories: ['food'] as ItemCategory[] },
  ettin_hoard_pile: { capacity: 12, preserves: false, acceptedCategories: undefined as ItemCategory[] | undefined },
  dvergar_vault: { capacity: 10, preserves: true, acceptedCategories: ['tool', 'consumable'] as ItemCategory[] },
  shee_archive: { capacity: 6, preserves: true, acceptedCategories: ['misc'] as ItemCategory[] },
};

export type ContainerTypeId = keyof typeof CONTAINER_TYPES;

export function createContainer(
  world: WorldMutator,
  x: number,
  y: number,
  containerType: ContainerTypeId
): string {
  const config = CONTAINER_TYPES[containerType];
  const entity = new EntityImpl(createEntityId(), world.tick);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(true, 1, 1));
  entity.addComponent(createRenderableComponent(containerType, 'object'));
  entity.addComponent(createTagsComponent('container', containerType, 'interactable'));
  entity.addComponent(createContainerComponent(
    containerType,
    config.capacity,
    config.preserves,
    config.acceptedCategories
  ));
  // Also give it an inventory so the existing storage deposit system can work with it
  entity.addComponent(createInventoryComponent(config.capacity, config.capacity * 20));

  world.addEntity(entity);
  return entity.id;
}
