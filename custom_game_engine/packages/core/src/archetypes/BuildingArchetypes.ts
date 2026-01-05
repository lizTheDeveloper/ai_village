import type { Archetype } from '../ecs/Archetype.js';
import { createBuildingComponent, BuildingType } from '../components/BuildingComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';
import { createInventoryComponent } from '../components/InventoryComponent.js';

/**
 * NOTE: Most building archetypes have been deprecated in favor of the
 * TileBasedBlueprintRegistry system (see TileConstructionSystem).
 *
 * This file now only contains single-tile furniture/workstations that don't
 * use the voxel/tile blueprint system. For multi-tile buildings, use
 * TileBasedBlueprintRegistry instead.
 */

/**
 * Campfire building archetype.
 * Provides warmth but doesn't block movement.
 * Note: Position component must be added separately when spawning.
 */
export const campfireArchetype: Archetype = {
  name: 'campfire',
  description: 'A warming fire that doesn\'t block movement',
  create: () => {
    const building = createBuildingComponent(BuildingType.Campfire, 1, 100);

    const renderable: RenderableComponent = {
      type: 'renderable',
      version: 1,
      spriteId: 'campfire',
      tint: '#FF6600', // Orange-red
      layer: 'object',
      visible: true,
    };

    return [building, renderable];
  },
};

/**
 * Storage box building archetype (legacy).
 * Can store items for later use.
 * Note: Position component must be added separately when spawning.
 */
export const storageBoxArchetype: Archetype = {
  name: 'storage-box',
  description: 'A box for storing items',
  create: () => {
    const building = createBuildingComponent(BuildingType.StorageBox, 1, 100);

    const renderable: RenderableComponent = {
      type: 'renderable',
      version: 1,
      spriteId: 'storage-box',
      tint: '#654321', // Dark brown
      layer: 'object',
      visible: true,
    };

    // Storage box has smaller capacity: 10 slots, 200 weight
    const inventory = createInventoryComponent(10, 200);

    return [building, renderable, inventory];
  },
};

/**
 * Workbench building archetype.
 * Provides basic crafting functionality.
 * Note: Position component must be added separately when spawning.
 */
export const workbenchArchetype: Archetype = {
  name: 'workbench',
  description: 'A basic crafting station for simple tools and items',
  create: () => {
    const building = createBuildingComponent(BuildingType.Workbench, 1, 100);

    const renderable: RenderableComponent = {
      type: 'renderable',
      version: 1,
      spriteId: 'workbench',
      tint: '#A0826D', // Light brown
      layer: 'object',
      visible: true,
    };

    return [building, renderable];
  },
};

/**
 * Storage chest building archetype.
 * Can store 20 items.
 * Note: Position component must be added separately when spawning.
 */
export const storageChestArchetype: Archetype = {
  name: 'storage-chest',
  description: 'A wooden chest for storing items',
  create: () => {
    const building = createBuildingComponent(BuildingType.StorageChest, 1, 100);

    const renderable: RenderableComponent = {
      type: 'renderable',
      version: 1,
      spriteId: 'storage-chest',
      tint: '#8B4513', // Brown
      layer: 'object',
      visible: true,
    };

    // Storage chest has larger capacity: 20 slots, 500 weight
    const inventory = createInventoryComponent(20, 500);

    return [building, renderable, inventory];
  },
};

/**
 * Well building archetype.
 * Provides fresh water source.
 * Note: Position component must be added separately when spawning.
 */
export const wellArchetype: Archetype = {
  name: 'well',
  description: 'A stone well providing fresh water',
  create: () => {
    const building = createBuildingComponent(BuildingType.Well, 1, 100);

    const renderable: RenderableComponent = {
      type: 'renderable',
      version: 1,
      spriteId: 'well',
      tint: '#808080', // Gray stone
      layer: 'object',
      visible: true,
    };

    return [building, renderable];
  },
};
