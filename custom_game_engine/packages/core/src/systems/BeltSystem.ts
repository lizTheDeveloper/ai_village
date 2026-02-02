import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BeltComponent, BeltDirection } from '../components/BeltComponent.js';
import { canAcceptItems, removeItemsFromBelt, addItemsToBelt } from '../components/BeltComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MachineConnectionComponent } from '../components/MachineConnectionComponent.js';
import { BELT_SPEEDS } from '../components/BeltComponent.js';
import { itemInstanceRegistry } from '../items/ItemInstanceRegistry.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * BeltSystem - Moves items along conveyor belts
 *
 * Simplified count-based approach for performance:
 * - Belts track item COUNT, not individual positions
 * - Each belt holds a single resource type
 * - Items propagate to adjacent belts when transfer progress reaches 1.0
 * - Much faster than tracking individual item entities
 *
 * This is "factorio-ish not full factorio" - abstracted for performance.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 3)
 */
export class BeltSystem extends BaseSystem {
  public readonly id: SystemId = 'belt';
  public readonly priority: number = 53; // After PowerGridSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Belt, CT.Position];
  // Only run when belt components exist (O(1) activation check)
  public readonly activationComponents = [CT.Belt] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  // PERFORMANCE: Cache position-to-entity map to avoid O(n) queries per belt transfer
  private positionCache: Map<string, Entity> = new Map();
  private positionCacheTick: number = -1;

  /**
   * Build position cache for O(1) entity lookups
   * Only rebuilds if tick has changed
   *
   * PERFORMANCE: Only caches entities with Belt or MachineConnection components,
   * since those are the only entities belts can transfer to. This reduces the
   * cache from potentially 200k+ entities to just automation-relevant ones.
   */
  private buildPositionCache(world: World): void {
    if (this.positionCacheTick === world.tick) return;

    this.positionCache.clear();

    // Cache belts (entities that can receive items from other belts)
    const belts = world.query().with(CT.Belt, CT.Position).executeEntities();
    for (const entity of belts) {
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (pos) {
        const key = `${Math.floor(pos.x)},${Math.floor(pos.y)}`;
        if (!this.positionCache.has(key)) {
          this.positionCache.set(key, entity);
        }
      }
    }

    // Cache machines with connections (entities that can receive items from belts)
    const machines = world.query().with(CT.MachineConnection, CT.Position).executeEntities();
    for (const entity of machines) {
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (pos) {
        const key = `${Math.floor(pos.x)},${Math.floor(pos.y)}`;
        if (!this.positionCache.has(key)) {
          this.positionCache.set(key, entity);
        }
      }
    }

    this.positionCacheTick = world.tick;
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Step 1: Accumulate transfer progress
    for (const entity of ctx.activeEntities) {
      const belt = (entity as EntityImpl).getComponent<BeltComponent>(CT.Belt);

      if (!belt || belt.count === 0) continue;

      const speed = BELT_SPEEDS[belt.tier] * ctx.deltaTime;
      belt.transferProgress += speed;
    }

    // Step 2: Build position cache once for all transfer lookups (O(n) once vs O(n) per belt)
    this.buildPositionCache(world);

    // Step 3: Transfer items to adjacent belts/machines
    for (const entity of ctx.activeEntities) {
      const belt = (entity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!belt || !pos) continue;
      if (belt.count === 0 || belt.transferProgress < 1.0) continue;

      this.transferItems(belt, pos, world);
    }
  }

  /**
   * Transfer items to next belt/machine when progress >= 1.0
   */
  private transferItems(
    belt: BeltComponent,
    pos: PositionComponent,
    world: World
  ): void {
    if (!belt.itemId) return;

    // Find next belt/machine in direction
    const nextPos = this.getNextPosition(pos, belt.direction);
    const nextEntity = this.getEntityAt(world, nextPos);

    if (!nextEntity) {
      // No output - belt backs up (progress stays at 1.0)
      return;
    }

    // Try to transfer to next belt
    const nextBelt = (nextEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
    if (nextBelt) {
      this.transferToBelt(belt, nextBelt);
      return;
    }

    // Try to transfer to machine input
    const machineConnection = (nextEntity as EntityImpl).getComponent<MachineConnectionComponent>(CT.MachineConnection);
    if (machineConnection) {
      this.transferToMachine(belt, machineConnection, pos, nextPos);
    }
  }

  /**
   * Transfer items to next belt (count-based)
   */
  private transferToBelt(
    sourceBelt: BeltComponent,
    targetBelt: BeltComponent
  ): void {
    if (!sourceBelt.itemId) return;

    // Calculate how many items to transfer (transfer 1 per tick when progress >= 1.0)
    const itemsToTransfer = 1;

    // Check if target can accept items
    if (!canAcceptItems(targetBelt, sourceBelt.itemId, itemsToTransfer)) {
      // Target full or wrong resource type - belt backs up
      return;
    }

    // Transfer items
    const transferred = removeItemsFromBelt(sourceBelt, itemsToTransfer);
    addItemsToBelt(targetBelt, sourceBelt.itemId, transferred);

    // Reset transfer progress
    sourceBelt.transferProgress = 0.0;
  }

  /**
   * Transfer items to machine input (count-based)
   */
  private transferToMachine(
    belt: BeltComponent,
    connection: MachineConnectionComponent,
    beltPos: PositionComponent,
    machinePos: { x: number; y: number }
  ): void {
    if (!belt.itemId) return;

    // Find matching input slot
    for (const input of connection.inputs) {
      // Check if input faces the belt
      const inputWorldPos = {
        x: machinePos.x + input.offset.x,
        y: machinePos.y + input.offset.y,
      };

      if (inputWorldPos.x !== beltPos.x || inputWorldPos.y !== beltPos.y) {
        continue;
      }

      // Check filter
      if (input.filter && !input.filter.includes(belt.itemId)) {
        continue;
      }

      // Check capacity
      if (input.items.length >= input.capacity) {
        continue;
      }

      // Transfer item - create proper ItemInstance via registry
      const itemInstance = itemInstanceRegistry.createInstance({
        definitionId: belt.itemId,
        quality: 50, // Normal quality
        condition: 100,
      });

      input.items.push(itemInstance);
      removeItemsFromBelt(belt, 1);
      belt.transferProgress = 0.0;
      return;
    }

    // No matching input - belt backs up
  }

  /**
   * Get next position in direction
   */
  private getNextPosition(pos: PositionComponent, dir: BeltDirection): { x: number; y: number } {
    switch (dir) {
      case 'north': return { x: pos.x, y: pos.y - 1 };
      case 'south': return { x: pos.x, y: pos.y + 1 };
      case 'east':  return { x: pos.x + 1, y: pos.y };
      case 'west':  return { x: pos.x - 1, y: pos.y };
    }
  }

  /**
   * Get entity at position using cached position map
   * PERFORMANCE: O(1) lookup instead of O(n) query
   */
  private getEntityAt(_world: World, pos: { x: number; y: number }): Entity | null {
    const key = `${Math.floor(pos.x)},${Math.floor(pos.y)}`;
    return this.positionCache.get(key) ?? null;
  }
}
