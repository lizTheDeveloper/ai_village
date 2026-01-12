/**
 * CreationEffectApplier - Handles creating items and objects
 *
 * This applier creates physical items in the game world, handling both
 * permanent and temporary creations with quality/quantity scaling.
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  CreationEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { createPositionComponent } from '@ai-village/core';

/**
 * List of items that cannot be created through magic.
 * These represent legendary/impossible artifacts.
 */
const IMPOSSIBLE_ITEMS = [
  'philosopher_stone',
  'philosophers_stone',
  'wish_ring',
  'soul',
  'divine_spark',
  'infinity_stone',
];

/**
 * CreationEffectApplier implementation.
 */
export class CreationEffectApplier implements EffectApplier<CreationEffect> {
  readonly category = 'creation' as const;

  apply(
    effect: CreationEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, number> = {};

    // Validate that item can be created (not impossible)
    if (IMPOSSIBLE_ITEMS.includes(effect.createdItem.toLowerCase())) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: `Cannot create impossible item: ${effect.createdItem}`,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get caster position for spawn location
    const casterPosComp = caster.components.get('position');
    if (!casterPosComp) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Caster has no position component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Extract position values from component
    const casterPos = {
      x: (casterPosComp as any).x ?? 0,
      y: (casterPosComp as any).y ?? 0,
      z: (casterPosComp as any).z ?? 0,
    };

    // Calculate creation parameters from scaled values or effect properties
    const quantityScaled = context.scaledValues.get('quantity');
    const qualityScaled = context.scaledValues.get('quality');

    // Use scaled values if available, otherwise fall back to effect properties
    const quantity = quantityScaled
      ? Math.max(0, Math.floor(quantityScaled.value))
      : (typeof effect.quantity === 'number' ? effect.quantity : effect.quantity?.base ?? 1);

    const quality = qualityScaled
      ? Math.max(0, qualityScaled.value)
      : (typeof effect.quality === 'number' ? effect.quality : effect.quality?.base ?? 1.0);

    appliedValues['quantity'] = quantity;
    appliedValues['quality'] = quality;

    // Handle zero quantity gracefully
    if (quantity === 0) {
      return {
        success: true,
        effectId: effect.id,
        targetId: target.id,
        appliedValues,
        resisted: false,
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
        remainingDuration: effect.permanent ? undefined : (context.spell.duration ?? effect.duration),
      };
    }

    // Track created entity IDs for cleanup
    const createdEntityIds: string[] = [];

    // Create items
    for (let i = 0; i < quantity; i++) {
      try {
        // Calculate spawn position with slight offset for multiple items
        const angle = (i / Math.max(1, quantity - 1)) * Math.PI * 2;
        const radius = Math.min(0.5 + i * 0.2, 2.0); // Spread items in a circle
        const spawnPos = {
          x: casterPos.x + Math.cos(angle) * radius,
          y: casterPos.y + Math.sin(angle) * radius,
          z: casterPos.z ?? 0,
        };

        // Create item entity
        const itemEntity = world.createEntity();

        // Set position
        const positionComponent = createPositionComponent(spawnPos.x, spawnPos.y, spawnPos.z);
        (itemEntity as any).addComponent(positionComponent);

        // Add item component with quality metadata
        const itemComponent = {
          type: 'item' as const,
          itemType: effect.createdItem,
          quality: quality,
          createdBy: caster.id,
          createdAt: context.tick,
          spellId: context.spell.id,
          permanent: effect.permanent,
        };
        (itemEntity as any).addComponent(itemComponent);

        // Add identity component for the item
        const identityComponent = {
          type: 'identity' as const,
          name: effect.createdItem,
          description: `A ${effect.createdItem} created by magic`,
        };
        (itemEntity as any).addComponent(identityComponent);

        // If temporary, add expiration data
        if (!effect.permanent && (effect.duration || context.spell.duration)) {
          const duration = effect.duration ?? context.spell.duration ?? 0;
          const expirationComponent = {
            type: 'expiration' as const,
            expiresAt: context.tick + duration,
            creatorId: caster.id,
            reason: 'temporary_creation',
          };
          (itemEntity as any).addComponent(expirationComponent);
        }

        createdEntityIds.push(itemEntity.id);
      } catch (error) {
        // Entity creation failed - track but continue
        if (error instanceof Error) {
          appliedValues[`creation_${i}_failed`] = 1;
        }
      }
    }

    // Store created entity IDs in appliedValues
    if (createdEntityIds.length > 0) {
      appliedValues['createdEntityCount'] = createdEntityIds.length;
      // Store the actual IDs in a special key
      (appliedValues as unknown as { _createdEntityIds: string })._createdEntityIds =
        createdEntityIds.join('|');
    }

    return {
      success: createdEntityIds.length > 0,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      remainingDuration: effect.permanent ? undefined : (context.spell.duration ?? effect.duration),
      createdEntities: createdEntityIds,
    } as EffectApplicationResult & { createdEntities: string[] };
  }

  tick(
    activeEffect: ActiveEffect,
    effect: CreationEffect,
    _target: Entity,
    world: World,
    context: EffectContext
  ): void {
    // For creation effects, check if items are still valid
    // If temporary, they should have expiration components that handle cleanup

    const createdIds = this.extractCreatedEntityIds(activeEffect);

    // Count how many created items still exist
    let existingCount = 0;
    for (const itemId of createdIds) {
      const entity = world.getEntity(itemId);
      if (entity) {
        existingCount++;

        // Check if item should expire
        if (!effect.permanent) {
          const expiration = entity.components.get('expiration') as any;
          if (expiration && context.tick >= expiration.expiresAt) {
            // Item has expired - mark for destruction
            try {
              (world as any).destroyEntity(itemId, 'creation_expired');
            } catch (error) {
              // Entity might have already been destroyed
            }
          }
        }
      }
    }

    // If all items are gone, effect can end early
    if (existingCount === 0 && createdIds.length > 0) {
      // All created items are gone - effect can expire naturally
    }
  }

  remove(
    activeEffect: ActiveEffect,
    effect: CreationEffect,
    _target: Entity,
    world: World
  ): void {
    // When effect expires, destroy temporary items
    if (!effect.permanent) {
      const createdIds = this.extractCreatedEntityIds(activeEffect);

      for (const itemId of createdIds) {
        try {
          const entity = world.getEntity(itemId);
          if (entity) {
            (world as any).destroyEntity(itemId, 'creation_effect_expired');
          }
        } catch (error) {
          // Entity might have already been destroyed - that's fine
        }
      }
    }
  }

  // ========== Helper Methods ==========

  private extractCreatedEntityIds(activeEffect: ActiveEffect): string[] {
    // Extract the packed entity IDs from appliedValues
    const packed = (activeEffect.appliedValues as unknown as { _createdEntityIds?: string })
      ._createdEntityIds;
    if (!packed) return [];
    return packed.split('|').filter(id => id.length > 0);
  }
}

export const creationEffectApplier = new CreationEffectApplier();
