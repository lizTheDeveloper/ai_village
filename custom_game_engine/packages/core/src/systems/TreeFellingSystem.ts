/**
 * TreeFellingSystem - Handles physics of trees and other voxel resources falling
 * when their base is cut.
 *
 * Key mechanics:
 * - When stability drops below 30 and base is cut, structure falls
 * - Falling drops all remaining resources at the fall position
 * - Creates falling animation entity for visual feedback
 * - Emits events for sound effects and other systems
 *
 * This creates emergent gameplay: agents must plan harvesting strategy.
 * Cut from top = safe but slow. Cut from base = fast but dangerous.
 */
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { VoxelResourceComponent } from '../components/VoxelResourceComponent.js';
import { isVoxelUnstable, isVoxelDepleted } from '../components/VoxelResourceComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { createResourceComponent } from '../components/ResourceComponent.js';
import { materialRegistry } from '../materials/MaterialRegistry.js';

/**
 * Default hardness values for common materials if not found in registry.
 * Range: 0-100 where higher = harder material.
 */
const DEFAULT_HARDNESS: Record<string, number> = {
  wood: 25,
  oak: 30,
  pine: 20,
  ebony: 50,
  stone: 60,
  granite: 70,
  marble: 60,
  iron_ore: 65,
  copper_ore: 55,
  crystal: 45,
  coral: 35,
};

/**
 * Get material hardness from the registry or use defaults.
 * Returns a value 0-100 where higher = harder.
 */
export function getMaterialHardness(materialId: string): number {
  // Try registry first
  if (materialRegistry.has(materialId)) {
    return materialRegistry.get(materialId).hardness;
  }
  // Fall back to defaults
  if (materialId in DEFAULT_HARDNESS) {
    return DEFAULT_HARDNESS[materialId]!;
  }
  // Unknown material - assume medium hardness
  return 40;
}

/**
 * TreeFellingSystem manages the falling physics of voxel resources
 * when their structural stability is compromised.
 */
export class TreeFellingSystem extends BaseSystem {
  readonly id: SystemId = 'tree_felling';
  readonly priority: number = 45; // After gathering, before cleanup
  readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.VoxelResource, CT.Position];

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const voxel = entity.getComponent<VoxelResourceComponent>(CT.VoxelResource);
      const pos = entity.getComponent<PositionComponent>(CT.Position);

      if (!voxel || !pos) continue;

      // Skip depleted resources
      if (isVoxelDepleted(voxel)) continue;

      // Check if structure should start falling
      if (!voxel.isFalling && isVoxelUnstable(voxel)) {
        this.startFalling(entity, voxel, pos, ctx.world);
      }

      // Process falling structures
      if (voxel.isFalling) {
        this.processFall(entity, voxel, pos, ctx.world);
      }
    }
  }

  /**
   * Initiate the falling sequence for an unstable structure.
   * Falls away from the harvester if known, otherwise random.
   */
  private startFalling(
    entity: EntityImpl,
    voxel: VoxelResourceComponent,
    pos: PositionComponent,
    _world: World
  ): void {
    let fallDirection: { x: number; y: number };

    if (voxel.lastHarvesterPosition) {
      // Calculate direction away from harvester
      const dx = pos.x - voxel.lastHarvesterPosition.x;
      const dy = pos.y - voxel.lastHarvesterPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.01) {
        // Normalize to unit vector - tree falls away from harvester
        fallDirection = {
          x: dx / distance,
          y: dy / distance,
        };
      } else {
        // Harvester is at same position, fall in random direction
        const fallAngle = Math.random() * Math.PI * 2;
        fallDirection = {
          x: Math.cos(fallAngle),
          y: Math.sin(fallAngle),
        };
      }
    } else {
      // No harvester position known, fall in random direction
      const fallAngle = Math.random() * Math.PI * 2;
      fallDirection = {
        x: Math.cos(fallAngle),
        y: Math.sin(fallAngle),
      };
    }

    // Update voxel component to falling state
    entity.updateComponent<VoxelResourceComponent>(CT.VoxelResource, (current) => ({
      ...current,
      isFalling: true,
      fallDirection,
    }));

    // Emit falling started event
    this.events.emit('voxel_resource:falling_started', {
      entityId: entity.id,
      resourceType: voxel.resourceType,
      position: { x: pos.x, y: pos.y },
      height: voxel.height,
      fallDirection,
    }, entity.id);
  }

  /**
   * Process a falling structure - drop resources and remove entity.
   */
  private processFall(
    entity: EntityImpl,
    voxel: VoxelResourceComponent,
    pos: PositionComponent,
    world: World
  ): void {
    // Calculate total resources to drop
    const totalResources = voxel.height * voxel.blocksPerLevel;

    // Calculate fall position (where resources land)
    const fallDistance = voxel.height; // Fall distance based on height
    const fallPos = {
      x: pos.x + (voxel.fallDirection?.x ?? 0) * fallDistance,
      y: pos.y + (voxel.fallDirection?.y ?? 0) * fallDistance,
    };

    // Drop resources at fall position
    this.dropResources(world, fallPos, voxel.material, totalResources, entity.id);

    // Emit fell event before removal
    this.events.emit('voxel_resource:fell', {
      entityId: entity.id,
      resourceType: voxel.resourceType,
      material: voxel.material,
      originalPosition: { x: pos.x, y: pos.y },
      fallPosition: fallPos,
      resourcesDropped: totalResources,
      height: voxel.height,
    }, entity.id);

    // Create visual falling effect (short-lived animation entity)
    this.createFallingAnimation(world, pos, voxel, fallPos, entity.id);

    // Remove the original entity
    (world as WorldMutator).destroyEntity(entity.id, 'voxel_resource_fell');
  }

  /**
   * Drop resources at the fall position.
   * Creates a ground item entity that agents can pick up.
   */
  private dropResources(
    world: World,
    pos: { x: number; y: number },
    material: string,
    amount: number,
    sourceId: string
  ): void {
    const mutator = world as WorldMutator;

    // Create item drop entity
    // Note: This creates a simple ground item. The actual implementation
    // may need to integrate with the existing item/inventory system.
    const itemEntity = mutator.createEntity();

    // Add position (ground level)
    mutator.addComponent(itemEntity.id, createPositionComponent(pos.x, pos.y, 0));

    // Add resource component for pickup
    // Map material to ResourceType - default to 'wood' if not a known type
    const resourceType = (material === 'stone' || material === 'wood') ? material : 'wood';
    mutator.addComponent(itemEntity.id, createResourceComponent(
      resourceType,
      amount,
      0, // no regeneration
      0.5 // easy to pick up
    ));

    // Add tags for identification
    mutator.addComponent(itemEntity.id, createTagsComponent('item', 'dropped', 'pickup', material));

    // Emit item dropped event
    this.events.emit('item:dropped', {
      entityId: itemEntity.id,
      material,
      amount,
      position: pos,
    }, sourceId);
  }

  /**
   * Create a temporary animation entity for the falling visual.
   */
  private createFallingAnimation(
    world: World,
    startPos: PositionComponent,
    voxel: VoxelResourceComponent,
    endPos: { x: number; y: number },
    sourceId: string
  ): void {
    const mutator = world as WorldMutator;
    const animEntity = mutator.createEntity();

    // Position starts at tree location
    mutator.addComponent(animEntity.id, createPositionComponent(startPos.x, startPos.y, voxel.height));

    // Renderable for the falling tree sprite
    const renderable = createRenderableComponent(`${voxel.resourceType}_falling`, 'effect');
    // Add rotation to the renderable
    const renderableWithRotation = {
      ...renderable,
      rotation: Math.atan2(
        endPos.y - startPos.y,
        endPos.x - startPos.x
      ),
    };
    mutator.addComponent(animEntity.id, renderableWithRotation);

    // Tags to identify as temporary animation
    mutator.addComponent(animEntity.id, createTagsComponent('animation', 'falling', 'temporary', 'auto-remove'));

    // The animation will be cleaned up by a separate system
    // or we could schedule removal after a duration
    // For now, emit an event that a cleanup system can handle
    this.events.emit('animation:created', {
      animationType: 'falling_tree',
      duration: 1.0, // 1 second animation
      entityId: animEntity.id,
      startPosition: { x: startPos.x, y: startPos.y },
      endPosition: endPos,
    }, sourceId);
  }
}

/**
 * Reduce stability when harvesting a level from a voxel resource.
 * Call this from GatherBehavior when harvesting.
 *
 * Factors in material hardness:
 * - Softer materials (wood, pine) lose stability faster
 * - Harder materials (stone, granite) are more stable
 *
 * @param voxel - The voxel resource being harvested
 * @param harvestedLevel - Which level was harvested (0 = base, higher = top)
 * @param hardness - Material hardness (0-100), defaults to looking up from voxel.material
 * @returns Updated stability value
 */
export function reduceStabilityFromHarvest(
  voxel: VoxelResourceComponent,
  harvestedLevel: number,
  hardness?: number
): number {
  // Get hardness from parameter or look up from material
  const materialHardness = hardness ?? getMaterialHardness(voxel.material);

  // Harvesting lower levels causes more instability
  // Base (level 0) = -50 stability
  // Each level up = less impact
  const baseStabilityLoss = Math.max(10, 50 - harvestedLevel * 10);

  // Hardness modifier:
  // - Hardness 0: modifier = 1.5 (very soft, loses stability quickly)
  // - Hardness 25 (wood): modifier = 1.25
  // - Hardness 50: modifier = 1.0 (baseline)
  // - Hardness 70 (granite): modifier = 0.8
  // - Hardness 100: modifier = 0.5 (very hard, loses stability slowly)
  const hardnessModifier = 0.5 + (100 - materialHardness) / 100;

  const stabilityLoss = Math.ceil(baseStabilityLoss * hardnessModifier);
  const newStability = Math.max(0, voxel.stability - stabilityLoss);
  return newStability;
}

/**
 * Check if harvesting at a specific level would cause the structure to fall.
 *
 * @param voxel - The voxel resource
 * @param harvestLevel - Level being harvested (0 = base)
 * @returns true if structure would fall after this harvest
 */
export function wouldCauseFall(
  voxel: VoxelResourceComponent,
  harvestLevel: number
): boolean {
  const predictedStability = reduceStabilityFromHarvest(voxel, harvestLevel);
  return predictedStability < 30 && harvestLevel === 0;
}
