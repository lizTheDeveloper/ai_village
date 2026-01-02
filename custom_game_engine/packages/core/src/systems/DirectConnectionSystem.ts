import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { MachineConnectionComponent, MachineSlot } from '../components/MachineConnectionComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

/**
 * DirectConnectionSystem - Transfers items between adjacent machines
 *
 * Machines can connect directly without belts. Output slots push items
 * to adjacent input slots automatically.
 *
 * Higher priority than BeltSystem to prefer direct transfers.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 3)
 */
export class DirectConnectionSystem implements System {
  public readonly id: SystemId = 'direct_connection';
  public readonly priority: number = 52; // Before BeltSystem
  public readonly requiredComponents = [CT.MachineConnection, CT.Position] as const;

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const connection = (entity as EntityImpl).getComponent<MachineConnectionComponent>(CT.MachineConnection);
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!connection || !pos) continue;

      // Try to output items to adjacent machines
      for (const output of connection.outputs) {
        this.tryTransferOutput(entity, output, pos, world);
      }
    }
  }

  /**
   * Try to transfer items from output slot to adjacent machine
   */
  private tryTransferOutput(
    _source: Entity,
    output: MachineSlot,
    sourcePos: PositionComponent,
    world: World
  ): void {
    if (output.items.length === 0) return;

    // Find adjacent machine at output position
    const targetPos = {
      x: sourcePos.x + output.offset.x,
      y: sourcePos.y + output.offset.y,
    };

    const target = this.getEntityAt(world, targetPos);
    if (!target) return;

    const targetConnection = (target as EntityImpl).getComponent<MachineConnectionComponent>(CT.MachineConnection);
    if (!targetConnection) return;

    // Try to transfer first item in output to matching input
    const itemToTransfer = output.items[0];
    if (!itemToTransfer) return;

    // Find matching input slot on target
    for (const input of targetConnection.inputs) {
      // Check if this input faces our output
      const targetEntityPos = (target as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!targetEntityPos) continue;

      const inputWorldPos = {
        x: targetEntityPos.x + input.offset.x,
        y: targetEntityPos.y + input.offset.y,
      };

      if (inputWorldPos.x !== sourcePos.x || inputWorldPos.y !== sourcePos.y) {
        continue;
      }

      // Check filter
      if (input.filter && !input.filter.includes(itemToTransfer.definitionId)) {
        continue;
      }

      // Check capacity
      if (input.items.length >= input.capacity) {
        continue;
      }

      // Transfer item
      input.items.push(output.items.shift()!);
      return;
    }
  }

  /**
   * Get entity at position
   */
  private getEntityAt(world: World, pos: { x: number; y: number }): Entity | null {
    const entities = world.query().with(CT.Position).executeEntities();
    return entities.find(e => {
      const p = (e as EntityImpl).getComponent<PositionComponent>(CT.Position);
      return p && Math.floor(p.x) === Math.floor(pos.x) && Math.floor(p.y) === Math.floor(pos.y);
    }) ?? null;
  }
}
