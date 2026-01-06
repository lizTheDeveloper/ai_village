/**
 * SummonEffectApplier - Handles summoning entities/creatures
 *
 * This applier creates and manages summoned entities, tracking their lifecycle
 * and despawning them when effects expire.
 */

import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  SummonEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import { createPositionComponent } from '@ai-village/core';
import { SpellEffectRegistry } from '../SpellEffectRegistry.js';

/**
 * SummonEffectApplier implementation.
 */
export class SummonEffectApplier implements EffectApplier<SummonEffect> {
  readonly category = 'summon' as const;

  apply(
    effect: SummonEffect,
    caster: Entity,
    target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    const appliedValues: Record<string, number> = {};

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

    // Calculate summon parameters
    const countScaled = context.scaledValues.get('count');
    const levelScaled = context.scaledValues.get('level');

    // Use scaled values if available, otherwise fall back to effect properties
    const summonCount = countScaled
      ? Math.max(1, Math.floor(countScaled.value))
      : (typeof effect.summonCount === 'number' ? effect.summonCount : effect.summonCount?.base ?? 1);

    const summonLevel = levelScaled
      ? Math.max(1, Math.floor(levelScaled.value))
      : (typeof effect.summonLevel === 'number' ? effect.summonLevel : effect.summonLevel?.base ?? 1);

    appliedValues['count'] = summonCount;
    appliedValues['level'] = summonLevel;

    // Track summoned entity IDs for cleanup
    const summonedEntityIds: string[] = [];

    // Create summoned entities
    for (let i = 0; i < summonCount; i++) {
      try {
        // Calculate spawn position based on effect configuration
        const spawnPos = this.calculateSpawnPosition(
          effect,
          casterPos,
          target,
          i,
          summonCount
        );

        // Create summoned entity
        // Note: Since archetype system is not fully implemented, we create a basic entity
        // In a full implementation, this would use the entityArchetype from effect
        const summonedEntity = world.createEntity();

        // Set position - convert position object to PositionComponent
        const positionComponent = createPositionComponent(spawnPos.x, spawnPos.y, spawnPos.z ?? 0);
        (summonedEntity as any).addComponent(positionComponent);

        // Set owner if controllable
        if (effect.controllable) {
          // In a full implementation, add owner component or faction component
          // For now, we'll just track the entity ID
        }

        // Set AI behavior if not controllable
        if (!effect.controllable && effect.behavior) {
          // In a full implementation, add AI behavior component
          // For now, we'll just track the behavior type in appliedValues
          appliedValues[`summon_${i}_behavior`] = this.behaviorToNumber(effect.behavior);
        }

        summonedEntityIds.push(summonedEntity.id);
      } catch (error) {
        // Entity creation failed - continue with remaining summons
        // This gracefully handles cases where entity creation is not fully implemented
        if (error instanceof Error) {
          // Failed to create entity, but don't fail entire effect
          appliedValues[`summon_${i}_failed`] = 1;
        }
      }
    }

    // Store summoned entity IDs in appliedValues as a packed string
    // Format: "entityId1|entityId2|entityId3"
    if (summonedEntityIds.length > 0) {
      appliedValues['summonedEntityIds'] = summonedEntityIds.length;
      // Store the actual IDs in a special key that won't be confused with numeric values
      (appliedValues as unknown as { _summonedEntityIds: string })._summonedEntityIds =
        summonedEntityIds.join('|');
    }

    return {
      success: summonedEntityIds.length > 0,
      effectId: effect.id,
      targetId: target.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      summonedEntities: summonedEntityIds,
    } as EffectApplicationResult & { summonedEntities: string[] };
  }

  tick(
    activeEffect: ActiveEffect,
    _effect: SummonEffect,
    _target: Entity,
    world: World,
    _context: EffectContext
  ): void {
    // For summon effects, we might want to check if summoned entities are still alive
    // and update their behavior based on the effect duration remaining

    // Extract summoned entity IDs
    const summonedIds = this.extractSummonedEntityIds(activeEffect);

    // Check if summons are still alive
    let aliveCount = 0;
    for (const summonId of summonedIds) {
      const entity = world.getEntity(summonId);
      if (entity) {
        aliveCount++;
        // In a full implementation, we might update summon behavior here
      }
    }

    // If all summons died, we could end the effect early
    if (aliveCount === 0 && summonedIds.length > 0) {
      // All summons are dead - effect can expire naturally
    }
  }

  remove(
    activeEffect: ActiveEffect,
    _effect: SummonEffect,
    _target: Entity,
    world: World
  ): void {
    // Despawn summoned entities when effect expires
    const summonedIds = this.extractSummonedEntityIds(activeEffect);

    for (const summonId of summonedIds) {
      try {
        // Check if entity still exists before destroying
        const entity = world.getEntity(summonId);
        if (entity) {
          // Use WorldImpl to destroy entity - World interface doesn't expose this
          (world as any).destroyEntity(summonId, 'summon_expired');
        }
      } catch (error) {
        // Entity might have already been destroyed - that's fine
      }
    }
  }

  // ========== Helper Methods ==========

  private calculateSpawnPosition(
    effect: SummonEffect,
    casterPos: { x: number; y: number; z?: number },
    target: Entity,
    summonIndex: number,
    totalSummons: number
  ) {
    let x: number;
    let y: number;
    const z = casterPos.z ?? 0;

    switch (effect.spawnLocation) {
      case 'adjacent': {
        // Spawn in a circle around caster
        const angle = (summonIndex / totalSummons) * 2 * Math.PI;
        const radius = 1.5;
        x = casterPos.x + Math.cos(angle) * radius;
        y = casterPos.y + Math.sin(angle) * radius;
        break;
      }

      case 'target': {
        // Spawn at target position
        const targetPos = target.components.get('position') as { x: number; y: number; z?: number } | undefined;
        if (targetPos) {
          x = targetPos.x + (summonIndex - totalSummons / 2) * 0.5;
          y = targetPos.y;
        } else {
          // Fallback to caster position
          x = casterPos.x + summonIndex;
          y = casterPos.y;
        }
        break;
      }

      case 'random_nearby': {
        // Spawn randomly within 3 tiles of caster
        const angle = Math.random() * 2 * Math.PI;
        const radius = 1 + Math.random() * 2;
        x = casterPos.x + Math.cos(angle) * radius;
        y = casterPos.y + Math.sin(angle) * radius;
        break;
      }

      default: {
        // Default to adjacent
        const angle = (summonIndex / totalSummons) * 2 * Math.PI;
        x = casterPos.x + Math.cos(angle);
        y = casterPos.y + Math.sin(angle);
        break;
      }
    }

    return { x, y, z };
  }

  private behaviorToNumber(behavior: 'aggressive' | 'defensive' | 'passive'): number {
    switch (behavior) {
      case 'aggressive':
        return 0;
      case 'defensive':
        return 1;
      case 'passive':
        return 2;
      default:
        return 1;
    }
  }

  private extractSummonedEntityIds(activeEffect: ActiveEffect): string[] {
    // Extract the packed entity IDs from appliedValues
    const packed = (activeEffect.appliedValues as unknown as { _summonedEntityIds?: string })
      ._summonedEntityIds;
    if (!packed) return [];
    return packed.split('|').filter(id => id.length > 0);
  }
}

// ============================================================================
// Built-in Summon Effect Definitions
// ============================================================================

/**
 * Summon Fire Elemental - Aggressive fire creature
 */
export const summonFireElementalEffect: SummonEffect = {
  id: 'summon_fire_elemental_effect',
  name: 'Summon Fire Elemental',
  description: 'Summons a fire elemental to fight for the caster',
  category: 'summon',
  targetType: 'self',
  targetFilter: 'any',
  range: 0,
  duration: 600, // 30 seconds at 20 TPS
  dispellable: true,
  stackable: false,
  tags: ['summon', 'fire', 'elemental'],
  form: 'fire',
  technique: 'summon',
  icon: 'fire-elemental',

  entityArchetype: 'fire_elemental',
  summonCount: {
    base: 1,
    perProficiency: 0.01, // Rarely summon more than 1
    maximum: 3,
    minimum: 1,
  },
  summonLevel: {
    base: 5,
    perProficiency: 0.1,
    perForm: 0.2, // Fire form proficiency makes stronger elementals
    maximum: 20,
    minimum: 1,
  },
  controllable: false,
  behavior: 'aggressive',
  spawnLocation: 'adjacent',
};

/**
 * Summon Familiar - Small controllable creature
 */
export const summonFamiliarEffect: SummonEffect = {
  id: 'summon_familiar_effect',
  name: 'Summon Familiar',
  description: 'Summons a small magical familiar under your control',
  category: 'summon',
  targetType: 'self',
  targetFilter: 'any',
  range: 0,
  duration: 1200, // 60 seconds at 20 TPS
  dispellable: true,
  stackable: false,
  tags: ['summon', 'familiar', 'companion'],
  form: 'animal',
  technique: 'summon',
  icon: 'familiar',

  entityArchetype: 'familiar',
  summonCount: {
    base: 1,
    maximum: 1,
    minimum: 1,
  },
  summonLevel: {
    base: 3,
    perProficiency: 0.05,
    maximum: 10,
    minimum: 1,
  },
  controllable: true,
  spawnLocation: 'adjacent',
};

/**
 * Summon Skeleton - Undead minion
 */
export const summonSkeletonEffect: SummonEffect = {
  id: 'summon_skeleton_effect',
  name: 'Summon Skeleton',
  description: 'Raises a skeleton from the earth to serve you',
  category: 'summon',
  targetType: 'self',
  targetFilter: 'any',
  range: 0,
  duration: 800, // 40 seconds at 20 TPS
  dispellable: true,
  stackable: true,
  maxStacks: 5,
  tags: ['summon', 'undead', 'skeleton', 'necromancy'],
  form: 'body',
  technique: 'summon',
  icon: 'skeleton',

  entityArchetype: 'skeleton',
  summonCount: {
    base: 1,
    perProficiency: 0.02,
    maximum: 3,
    minimum: 1,
  },
  summonLevel: {
    base: 4,
    perProficiency: 0.08,
    maximum: 15,
    minimum: 1,
  },
  controllable: true,
  behavior: 'defensive',
  spawnLocation: 'adjacent',
};

/**
 * Summon Spirit Wolf - Wolf companion
 */
export const summonSpiritWolfEffect: SummonEffect = {
  id: 'summon_spirit_wolf_effect',
  name: 'Summon Spirit Wolf',
  description: 'Calls forth a spirit wolf to aid you in battle',
  category: 'summon',
  targetType: 'self',
  targetFilter: 'any',
  range: 0,
  duration: 1000, // 50 seconds at 20 TPS
  dispellable: true,
  stackable: false,
  tags: ['summon', 'spirit', 'animal', 'wolf'],
  form: 'animal',
  technique: 'summon',
  icon: 'spirit-wolf',

  entityArchetype: 'spirit_wolf',
  summonCount: {
    base: 1,
    perProficiency: 0.015,
    maximum: 2,
    minimum: 1,
  },
  summonLevel: {
    base: 6,
    perProficiency: 0.12,
    perForm: 0.15, // Animal form proficiency
    maximum: 18,
    minimum: 1,
  },
  controllable: true,
  behavior: 'aggressive',
  spawnLocation: 'adjacent',
};

/**
 * Summon Illusion - Creates illusory copy of caster
 */
export const summonIllusionEffect: SummonEffect = {
  id: 'summon_illusion_effect',
  name: 'Mirror Image',
  description: 'Creates illusory duplicates of yourself',
  category: 'summon',
  targetType: 'self',
  targetFilter: 'any',
  range: 0,
  duration: 400, // 20 seconds at 20 TPS
  dispellable: true,
  stackable: true,
  maxStacks: 3,
  tags: ['summon', 'illusion', 'image', 'mirror'],
  form: 'image',
  technique: 'create',
  icon: 'mirror-image',

  entityArchetype: 'illusion_copy',
  summonCount: {
    base: 2,
    perProficiency: 0.03,
    maximum: 8,
    minimum: 1,
  },
  summonLevel: {
    base: 1, // Illusions are fragile
    perProficiency: 0.02,
    maximum: 5,
    minimum: 1,
  },
  controllable: false,
  behavior: 'passive',
  spawnLocation: 'adjacent',
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register the SummonEffectApplier and built-in summon effects.
 */
export function registerSummonEffectApplier(): void {
  // Import executor to avoid circular dependency
  const { SpellEffectExecutor } = require('../SpellEffectExecutor.js');
  const executor = SpellEffectExecutor.getInstance();

  // Register applier
  executor.registerApplier(new SummonEffectApplier());

  // Register built-in effects
  const registry = SpellEffectRegistry.getInstance();
  registry.register(summonFireElementalEffect);
  registry.register(summonFamiliarEffect);
  registry.register(summonSkeletonEffect);
  registry.register(summonSpiritWolfEffect);
  registry.register(summonIllusionEffect);
}

// ============================================================================
// Exports
// ============================================================================

export const summonEffectApplier = new SummonEffectApplier();
