/**
 * ManaRegenerationManager - Manages mana and resource regeneration
 *
 * Handles:
 * - Passive mana regeneration
 * - Faith/favor synchronization for divine magic
 * - Resource pool regeneration
 * - Manual mana grants
 *
 * Extracted from MagicSystem to reduce god object complexity.
 */

import type { EntityImpl } from '@ai-village/core/ecs/Entity.js';
import { ComponentType as CT } from '@ai-village/core/types/ComponentType.js';
import type { MagicComponent, MagicSourceId } from '@ai-village/core/components/MagicComponent.js';
import type { SpiritualComponent } from '@ai-village/core/components/SpiritualComponent.js';
import { costRecoveryManager } from '../costs/CostRecoveryManager.js';

/**
 * Manages regeneration of magic resources (mana, favor, etc.).
 *
 * Different paradigms regenerate differently:
 * - Academic: Passive mana regen
 * - Divine: Faith influences favor regen
 * - Allomancy: Burn metals for power
 * - Blood: Regenerate with life force
 */
export class ManaRegenerationManager {
  // =========================================================================
  // Passive Regeneration
  // =========================================================================

  /**
   * Apply passive regeneration using CostRecoveryManager.
   * Handles both mana pools and paradigm-specific resource pools.
   *
   * @param entity The entity to regenerate resources for
   * @param magic The entity's magic component
   * @param deltaTime Time since last update (ms)
   */
  applyMagicRegeneration(entity: EntityImpl, magic: MagicComponent, deltaTime: number): void {
    // Clone the magic component to apply changes
    const updatedMagic = { ...magic };

    // Deep clone mana pools and resource pools for mutation
    updatedMagic.manaPools = magic.manaPools.map(pool => ({ ...pool }));
    updatedMagic.resourcePools = { ...magic.resourcePools };
    for (const key of Object.keys(updatedMagic.resourcePools)) {
      const pool = updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools];
      if (pool) {
        updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools] = { ...pool };
      }
    }

    // Apply passive regeneration via CostRecoveryManager
    costRecoveryManager.applyPassiveRegeneration(updatedMagic, deltaTime);

    // Check if anything changed
    const manaChanged = magic.manaPools.some((pool, i) =>
      pool.current !== updatedMagic.manaPools[i]?.current
    );

    const resourceChanged = Object.keys(magic.resourcePools).some(key => {
      const oldPool = magic.resourcePools[key as keyof typeof magic.resourcePools];
      const newPool = updatedMagic.resourcePools[key as keyof typeof updatedMagic.resourcePools];
      return oldPool?.current !== newPool?.current;
    });

    if (manaChanged || resourceChanged) {
      entity.updateComponent<MagicComponent>(CT.Magic, () => updatedMagic);
    }
  }

  // =========================================================================
  // Faith/Favor Synchronization (Divine Magic)
  // =========================================================================

  /**
   * Synchronize faith (SpiritualComponent) with divine favor (MagicComponent).
   * This ensures bidirectional consistency:
   * - Changes to divine favor affect agent's faith
   * - Changes to faith affect divine magic costs
   *
   * @param entity The entity to synchronize
   * @param magic The entity's magic component
   */
  syncFaithAndFavor(entity: EntityImpl, magic: MagicComponent): void {
    // Only sync for divine paradigm users
    if (magic.activeParadigmId !== 'divine' && !magic.knownParadigmIds.includes('divine')) {
      return;
    }

    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    const favorPool = magic.resourcePools.favor;
    if (!favorPool) return;

    // Calculate normalized favor (0-1)
    const normalizedFavor = favorPool.maximum > 0 ? favorPool.current / favorPool.maximum : 0;

    // Calculate expected faith based on favor (with some tolerance)
    // High favor = high faith, but not 1:1 (favor can be higher with more experience)
    const expectedFaith = Math.min(1.0, normalizedFavor * 0.8 + 0.1);

    // If faith and favor are significantly different, sync them
    const faithDiff = Math.abs(spiritual.faith - expectedFaith);
    const favorDiff = Math.abs(normalizedFavor - spiritual.faith);

    if (faithDiff > 0.1 || favorDiff > 0.1) {
      // Average the two to create smooth sync (neither dominates)
      const syncedValue = (spiritual.faith + expectedFaith) / 2;

      // Update spiritual component if faith changed
      if (Math.abs(spiritual.faith - syncedValue) > 0.01) {
        entity.updateComponent<SpiritualComponent>(CT.Spiritual, (current) => ({
          ...current,
          faith: Math.max(0, Math.min(1.0, syncedValue)),
        }));
      }

      // Update magic component if favor needs adjustment
      const targetFavor = syncedValue * favorPool.maximum;
      if (Math.abs(favorPool.current - targetFavor) > 1) {
        entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
          const updatedPools = { ...current.resourcePools };
          if (updatedPools.favor) {
            updatedPools.favor = {
              ...updatedPools.favor,
              current: targetFavor,
            };
          }
          return {
            ...current,
            resourcePools: updatedPools,
          };
        });
      }
    }
  }

  // =========================================================================
  // Manual Grants
  // =========================================================================

  /**
   * Grant mana to an entity (for testing, or divine intervention).
   *
   * @param entity The entity to grant mana to
   * @param source The mana source to grant to
   * @param amount The amount to grant
   */
  grantMana(entity: EntityImpl, source: MagicSourceId, amount: number): void {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return;

    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updatedPools = current.manaPools.map((pool) => {
        if (pool.source === source) {
          return {
            ...pool,
            current: Math.min(pool.maximum, pool.current + amount),
          };
        }
        return pool;
      });

      return {
        ...current,
        manaPools: updatedPools,
      };
    });
  }

  /**
   * Deduct mana from a specific pool.
   *
   * @param entity The entity to deduct from
   * @param source The mana source to deduct from
   * @param amount The amount to deduct
   */
  deductMana(entity: EntityImpl, source: MagicSourceId, amount: number): void {
    entity.updateComponent<MagicComponent>(CT.Magic, (current) => {
      const updatedPools = current.manaPools.map((pool) => {
        if (pool.source === source) {
          return {
            ...pool,
            current: Math.max(0, pool.current - amount),
          };
        }
        return pool;
      });

      return {
        ...current,
        manaPools: updatedPools,
      };
    });
  }
}
