import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';

export class MemorySystem implements System {
  public readonly id: SystemId = 'memory';
  public readonly priority: number = 25; // Run after movement
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['memory'];

  update(_world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const memory = impl.getComponent<MemoryComponent>('memory')!;

      // Per CLAUDE.md: No silent fallbacks - validate required fields
      if (memory.decayRate === undefined) {
        throw new Error(`Entity ${entity.id} has memory component missing required field: decayRate`);
      }

      // Decay and filter memories
      const decayAmount = memory.decayRate * deltaTime;
      const updatedMemories = memory.memories
        .map((m) => ({
          ...m,
          strength: Math.max(0, m.strength - decayAmount),
        }))
        .filter((m) => m.strength > 0); // Remove fully forgotten memories

      // Update component
      impl.updateComponent<MemoryComponent>('memory', (current) => ({
        ...current,
        memories: updatedMemories,
      }));
    }
  }
}
