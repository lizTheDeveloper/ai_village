import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EpisodicMemoryComponent, EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import {
  type AfterlifeMemoryComponent,
  calculateMemoryClarity,
} from '../components/AfterlifeMemoryComponent.js';

/**
 * AfterlifeMemoryFadingSystem - Fades afterlife memories over time during childhood
 *
 * When agents reincarnate with memories from the afterlife, those memories are
 * extremely rare and fade as they age:
 * - 99% of agents lose all afterlife memories by age 10
 * - 1% of agents (rare) retain tiny fragments into adulthood (~5% clarity)
 *
 * Fading is more rapid in early childhood and slows as they age.
 *
 * Priority: 17 (after NeedsSystem at 15, MemoryConsolidation, etc.)
 */
export class AfterlifeMemoryFadingSystem extends BaseSystem {
  readonly id: SystemId = 'afterlife_memory_fading';
  readonly priority: number = 17;
  readonly requiredComponents = ['afterlife_memory', 'episodic_memory'] as const;

  protected readonly throttleInterval = 1000; // Update every 1000 ticks (~game day)

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const afterlifeMemory = entity.components.get('afterlife_memory') as AfterlifeMemoryComponent | undefined;
      const episodicMemory = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;

      if (!afterlifeMemory || !episodicMemory) continue;

      // Skip if fading is already complete
      if (afterlifeMemory.fadingComplete) {
        // Remove component once fading is complete to save processing
        entity.removeComponent('afterlife_memory');
        continue;
      }

      // Calculate current age based on how long ago they were reincarnated
      // Store birth tick in component for tracking
      // For now, use a simplified age calculation based on component creation
      // In a full implementation, this would use an AgeComponent
      const currentAge = 0; // Simplified - will be enhanced when AgeComponent exists

      // Calculate new clarity based on age
      const newClarity = calculateMemoryClarity(
        currentAge,
        afterlifeMemory.retainsIntoAdulthood,
        afterlifeMemory.fadingStartAge
      );

      // Update clarity multiplier
      entity.updateComponent<AfterlifeMemoryComponent>('afterlife_memory', (current) => {
        const updated = { ...current };
        updated.clarityMultiplier = newClarity;

        // Mark as complete if fully faded
        if (newClarity <= 0.0) {
          updated.fadingComplete = true;
        }

        return updated;
      });

      // Apply clarity reduction to afterlife memories
      this.applyMemoryFading(afterlifeMemory, episodicMemory, newClarity);

      // TODO: Emit event if memories just completed fading
      // (need to add event type to EventMap first)
    }
  }

  /**
   * Apply fading to afterlife memories in episodic memory component
   * When memories fade completely, they are SUPPRESSED (not deleted).
   * Suppressed memories accumulate across reincarnations, contributing to soul wisdom.
   * The God of Death can see all suppressed memories when judging souls.
   */
  private applyMemoryFading(
    afterlifeMemory: AfterlifeMemoryComponent,
    episodicMemory: EpisodicMemoryComponent,
    newClarity: number
  ): void {
    if (!episodicMemory.episodicMemories) return;

    const toSuppress: string[] = [];

    for (const memory of episodicMemory.episodicMemories) {
      if (afterlifeMemory.afterlifeMemoryIds.has(memory.id)) {
        const adjustedClarity = Math.max(0, memory.clarity * newClarity);

        // If clarity drops to near zero, suppress (move to unconscious)
        if (adjustedClarity < 0.01) {
          toSuppress.push(memory.id);
        } else {
          // Update clarity using the proper API
          episodicMemory.updateMemory(memory.id, {
            clarity: adjustedClarity,
          });
        }
      }
    }

    // Suppress faded memories (they remain in the soul's unconscious)
    // These contribute to wisdom and can be seen by the God of Death
    if (toSuppress.length > 0) {
      episodicMemory.suppressMemories(toSuppress);
    }

    // Remove suppressed memories from active tracking
    toSuppress.forEach(id => afterlifeMemory.afterlifeMemoryIds.delete(id));
  }

  /**
   * Force complete fading for an agent (e.g., for testing)
   * Suppresses all afterlife memories instead of deleting them.
   */
  forceCompleteFading(world: World, entityId: string): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const afterlifeMemory = entity.components.get('afterlife_memory') as AfterlifeMemoryComponent | undefined;

    if (afterlifeMemory) {
      // EntityImpl cast is necessary for updateComponent (internal mutable interface)
      // Entity interface is readonly, only EntityImpl exposes updateComponent
      const entityImpl = entity as EntityImpl;
      entityImpl.updateComponent<AfterlifeMemoryComponent>('afterlife_memory', (current) => {
        const updated = { ...current };
        updated.clarityMultiplier = 0.0;
        updated.fadingComplete = true;
        return updated;
      });

      // Suppress all afterlife memories (don't delete - they contribute to soul wisdom)
      const episodicMemory = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      if (episodicMemory?.episodicMemories) {
        const toSuppress: string[] = [];
        for (const memory of episodicMemory.episodicMemories) {
          if (afterlifeMemory.afterlifeMemoryIds.has(memory.id)) {
            toSuppress.push(memory.id);
          }
        }

        // Suppress memories (they remain in unconscious, visible to God of Death)
        if (toSuppress.length > 0) {
          episodicMemory.suppressMemories(toSuppress);
        }

        // Clear afterlife memory tracking
        afterlifeMemory.afterlifeMemoryIds.clear();
      }

      // TODO: Emit event when event type is added to EventMap
    }
  }
}
