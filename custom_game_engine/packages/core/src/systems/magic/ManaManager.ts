/**
 * ManaManager - Manages mana pools and resource regeneration
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { MagicComponent, MagicSourceId } from '../../components/MagicComponent.js';
import { getAvailableMana } from '../../components/MagicComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { costRecoveryManager } from '../../magic/costs/CostRecoveryManager.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';

/**
 * Manages mana pools and resource regeneration for magic users.
 */
export class ManaManager {
  /**
   * Apply passive regeneration to mana and resource pools.
   * Uses CostRecoveryManager for all resource regeneration.
   */
  applyRegeneration(entity: EntityImpl, magic: MagicComponent, deltaTime: number): void {
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

  /**
   * Deduct mana from a specific pool.
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

  /**
   * Grant mana to an entity (for testing, divine intervention, etc.).
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
   * Get available mana for a specific source.
   */
  getAvailableMana(entity: EntityImpl, source: MagicSourceId): number {
    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    if (!magic) return 0;
    return getAvailableMana(magic, source);
  }

  /**
   * Synchronize faith (SpiritualComponent) with divine favor (MagicComponent).
   * This ensures bidirectional consistency:
   * - Changes to divine favor affect agent's faith
   * - Changes to faith affect divine magic costs
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
}
