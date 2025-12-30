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

      // Decay memories over time
      const decayAmount = memory.decayRate * deltaTime;
      for (const m of memory.memories) {
        m.strength = Math.max(0, m.strength - decayAmount);
      }

      // Remove fully forgotten memories (strength reached 0)
      memory.memories = memory.memories.filter((m) => m.strength > 0);
    }
  }
}
