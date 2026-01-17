import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';

/**
 * Spatial Memory System - handles decay of spatial/location memories
 * Note: Episodic memories are handled separately by EpisodicMemorySystem
 */
export class MemorySystem extends BaseSystem {
  public readonly id: SystemId = 'memory';
  public readonly priority: number = 25; // Run after movement
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.SpatialMemory];

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const memory = entity.getComponent<SpatialMemoryComponent>(CT.SpatialMemory)!;

      // Per CLAUDE.md: No silent fallbacks - validate required fields
      if (memory.decayRate === undefined) {
        throw new Error(
          `Entity ${entity.id} has spatial_memory component missing required field: decayRate`
        );
      }

      // Decay memories over time and remove forgotten ones in-place
      // Performance: Avoids creating new array every tick with filter()
      const decayAmount = memory.decayRate * ctx.deltaTime;
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
