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

import type { EntityImpl } from '../../ecs/index.js';
import type { ManaPoolsComponent } from '../../components/ManaPoolsComponent.js';
import type { ParadigmStateComponent } from '../../components/ParadigmStateComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';
import type { MagicSourceId } from '../../components/MagicComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
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
   * @param manaPools The entity's mana pools component
   * @param deltaTime Time since last update (ms)
   */
  applyMagicRegeneration(entity: EntityImpl, manaPools: ManaPoolsComponent, deltaTime: number): void {
    // Clone the mana pools component to apply changes
    const updatedPools = { ...manaPools };

    // Deep clone mana pools and resource pools for mutation
    updatedPools.manaPools = manaPools.manaPools.map(pool => ({ ...pool }));
    updatedPools.resourcePools = { ...manaPools.resourcePools };
    for (const key of Object.keys(updatedPools.resourcePools)) {
      const pool = updatedPools.resourcePools[key as keyof typeof updatedPools.resourcePools];
      if (pool) {
        updatedPools.resourcePools[key as keyof typeof updatedPools.resourcePools] = { ...pool };
      }
    }

    // Build a temporary magic-like object for CostRecoveryManager compatibility
    const tempMagic = {
      manaPools: updatedPools.manaPools,
      resourcePools: updatedPools.resourcePools,
    };

    // Apply passive regeneration via CostRecoveryManager
    // Cast to any here because tempMagic is a partial MagicComponent-like object
    // that only contains the fields needed for passive regeneration
    costRecoveryManager.applyPassiveRegeneration(tempMagic as any, deltaTime);

    // Copy back the regenerated values
    updatedPools.manaPools = tempMagic.manaPools;
    updatedPools.resourcePools = tempMagic.resourcePools;

    // Check if anything changed
    const manaChanged = manaPools.manaPools.some((pool, i) =>
      pool.current !== updatedPools.manaPools[i]?.current
    );

    const resourceChanged = Object.keys(manaPools.resourcePools).some(key => {
      const oldPool = manaPools.resourcePools[key as keyof typeof manaPools.resourcePools];
      const newPool = updatedPools.resourcePools[key as keyof typeof updatedPools.resourcePools];
      return oldPool?.current !== newPool?.current;
    });

    if (manaChanged || resourceChanged) {
      entity.updateComponent<ManaPoolsComponent>(CT.ManaPoolsComponent, () => updatedPools);
    }
  }

  // =========================================================================
  // Faith/Favor Synchronization (Divine Magic)
  // =========================================================================

  // Track last favor check to avoid spam
  private lastFavorCheckTick = new Map<string, number>();
  private eventBus: any = null;

  /**
   * Initialize with event bus for exotic event emissions.
   */
  initialize(eventBus: any): void {
    this.eventBus = eventBus;
  }

  /**
   * Synchronize faith (SpiritualComponent) with divine favor (ManaPoolsComponent).
   * This ensures bidirectional consistency:
   * - Changes to divine favor affect agent's faith
   * - Changes to faith affect divine magic costs
   *
   * @param entity The entity to synchronize
   * @param manaPools The entity's mana pools component
   * @param paradigmState The entity's paradigm state component
   */
  syncFaithAndFavor(entity: EntityImpl, manaPools: ManaPoolsComponent, paradigmState: ParadigmStateComponent): void {
    // Only sync for divine paradigm users
    const spellKnowledge = entity.getComponent(CT.SpellKnowledgeComponent);
    const knownParadigmIds = (spellKnowledge && 'knownParadigmIds' in spellKnowledge && Array.isArray(spellKnowledge.knownParadigmIds)) ? spellKnowledge.knownParadigmIds : [];
    if (paradigmState.activeParadigmId !== 'divine' && !knownParadigmIds.includes('divine')) {
      return;
    }

    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    const favorPool = manaPools.resourcePools.favor;
    if (!favorPool) return;

    // Calculate normalized favor (-100 to 100 range, typical deity favor)
    // We'll treat current/maximum as 0-1 and convert to -100 to 100
    const normalizedFavor = favorPool.maximum > 0 ? (favorPool.current / favorPool.maximum) * 200 - 100 : 0;

    // EXOTIC PLOT EVENT: deity_relationship_critical
    // Check if favor has reached critical levels (|favor| > 80)
    // Only emit once per 10 minutes (12000 ticks) per agent to avoid spam
    const lastCheck = this.lastFavorCheckTick.get(entity.id) || 0;
    // EntityImpl doesn't have world property - we need to pass tick from outside or skip tick-based checks
    const currentTick = 0; // TODO: Pass current tick as parameter to syncFaithAndFavor
    if (this.eventBus && Math.abs(normalizedFavor) > 80 && currentTick - lastCheck > 12000) {
      const deityId = spiritual.believedDeity;

      if (deityId) {
        // Determine relationship type and trigger reason
        const relationshipType: 'favor' | 'disfavor' | 'obsession' =
          normalizedFavor > 80 ? 'favor' :
          normalizedFavor < -80 ? 'disfavor' :
          'obsession';

        const triggerReason: 'sacrilege' | 'heresy' | 'divine_champion' | 'prayer_answered' | 'miracle_witnessed' =
          normalizedFavor > 90 ? 'divine_champion' :
          normalizedFavor > 80 ? 'prayer_answered' :
          normalizedFavor < -90 ? 'sacrilege' :
          'heresy';

        this.eventBus.emit('divinity:deity_relationship_critical', {
          agentId: entity.id,
          soulId: entity.id, // Using entity ID as soul ID for now
          deityId,
          deityName: 'Unknown Deity', // Would need to look up deity entity
          relationshipValue: Math.round(normalizedFavor),
          relationshipType,
          triggerReason,
          tick: currentTick,
        });

        this.lastFavorCheckTick.set(entity.id, currentTick);
      }
    }

    // Convert normalized favor back to 0-1 for faith calculation
    const normalizedFavorZeroToOne = (normalizedFavor + 100) / 200;

    // Calculate expected faith based on favor (with some tolerance)
    // High favor = high faith, but not 1:1 (favor can be higher with more experience)
    const expectedFaith = Math.min(1.0, normalizedFavorZeroToOne * 0.8 + 0.1);

    // If faith and favor are significantly different, sync them
    const faithDiff = Math.abs(spiritual.faith - expectedFaith);
    const favorDiff = Math.abs(normalizedFavorZeroToOne - spiritual.faith);

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

      // Update mana pools component if favor needs adjustment
      const targetFavor = syncedValue * favorPool.maximum;
      if (Math.abs(favorPool.current - targetFavor) > 1) {
        entity.updateComponent<ManaPoolsComponent>(CT.ManaPoolsComponent, (current) => {
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
    const manaPools = entity.getComponent<ManaPoolsComponent>(CT.ManaPoolsComponent);
    if (!manaPools) return;

    entity.updateComponent<ManaPoolsComponent>(CT.ManaPoolsComponent, (current) => {
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
    entity.updateComponent<ManaPoolsComponent>(CT.ManaPoolsComponent, (current) => {
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
