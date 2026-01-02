import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';

/**
 * Spatial Memory System - handles decay of spatial/location memories
 * Note: Episodic memories are handled separately by EpisodicMemorySystem
 */
export class MemorySystem implements System {
  public readonly id: SystemId = 'memory';
  public readonly priority: number = 25; // Run after movement
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.SpatialMemory];

  update(_world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const memory = impl.getComponent<SpatialMemoryComponent>(CT.SpatialMemory)!;

      // Per CLAUDE.md: No silent fallbacks - validate required fields
      if (memory.decayRate === undefined) {
        throw new Error(
          `Entity ${entity.id} has spatial_memory component missing required field: decayRate`
        );
      }

      // Decay memories over time and remove forgotten ones in-place
      // Performance: Avoids creating new array every tick with filter()
      const decayAmount = memory.decayRate * deltaTime;
      let writeIndex = 0;
      for (let i = 0; i < memory.memories.length; i++) {
        const m = memory.memories[i]!;
        m.strength = Math.max(0, m.strength - decayAmount);
        if (m.strength > 0) {
          memory.memories[writeIndex] = m;
          writeIndex++;
        }
      }
      // Truncate array to remove forgotten memories
      memory.memories.length = writeIndex;
    }
  }
}
