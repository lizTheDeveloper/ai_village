/**
 * CastSpellBehavior - Agent autonomous spell casting
 *
 * Handles:
 * - Spell validation and prerequisites
 * - Target selection and validation
 * - Moving into spell range
 * - Resource cost checking
 * - Executing spell cast via SpellCastingService
 * - Handling mishaps and failures
 *
 * Part of Phase 30: Magic System
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';
import { SpellCastingService } from '../../magic/SpellCastingService.js';
import { SpellRegistry } from '../../magic/SpellRegistry.js';

/** Max distance to search for spell targets */
const MAX_TARGET_SEARCH_DISTANCE = 50;

/**
 * State stored in agent.behaviorState for spell casting
 */
interface CastSpellState {
  /** Spell ID to cast */
  spellId?: string;

  /** Target entity ID (if spell requires a target) */
  targetId?: string;

  /** Target position for ground-targeted spells */
  targetX?: number;
  targetY?: number;

  /** Phase: 'validate' | 'find_target' | 'move_to_range' | 'casting' | 'complete' */
  phase?: 'validate' | 'find_target' | 'move_to_range' | 'casting' | 'complete';

  /** Whether spell was successfully cast */
  castSuccess?: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * CastSpellBehavior - Navigate to range and cast spell
 */
export class CastSpellBehavior extends BaseBehavior {
  readonly name = 'cast_spell' as const;

  private castingService: SpellCastingService;
  private spellRegistry: SpellRegistry;

  constructor() {
    super();
    this.castingService = SpellCastingService.getInstance();
    this.spellRegistry = SpellRegistry.getInstance();
  }

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const magic = entity.getComponent<MagicComponent>(ComponentType.Magic);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    if (!magic || !magic.magicUser) {
      return { complete: true, reason: 'Entity cannot use magic' };
    }

    // Disable steering so behavior controls movement
    this.disableSteering(entity);

    const state = agent.behaviorState as CastSpellState;
    const phase = state.phase ?? 'validate';

    // Execute phase
    switch (phase) {
      case 'validate':
        return this.validateSpell(entity, world, state, magic);

      case 'find_target':
        return this.findTarget(entity, world, state, position);

      case 'move_to_range':
        return this.moveToRange(entity, world, state, position);

      case 'casting':
        return this.castSpell(entity, world, state, magic);

      case 'complete':
        this.switchTo(entity, 'idle', {});
        return { complete: true, reason: state.error ?? 'Spell cast complete' };
    }
  }

  /**
   * Validate spell can be cast
   */
  private validateSpell(
    entity: EntityImpl,
    _world: World,
    state: CastSpellState,
    magic: MagicComponent
  ): BehaviorResult | void {
    const spellId = state.spellId;
    if (!spellId) {
      return { complete: true, reason: 'No spell specified in behaviorState.spellId' };
    }

    // Check spell exists
    const spell = this.spellRegistry.getSpell(spellId);
    if (!spell) {
      return { complete: true, reason: `Spell not found: ${spellId}` };
    }

    // Check spell is unlocked
    const playerState = this.spellRegistry.getPlayerState(spellId);
    if (!playerState?.unlocked) {
      return { complete: true, reason: `Spell not unlocked: ${spell.name}` };
    }

    // Check if agent knows this spell
    const knownSpell = magic.knownSpells.find(s => s.spellId === spellId);
    if (!knownSpell) {
      return { complete: true, reason: `Agent does not know spell: ${spell.name}` };
    }

    // Check if can afford spell (basic check)
    const canCast = this.castingService.canCast(spellId, entity);
    if (!canCast.canCast) {
      return { complete: true, reason: canCast.error ?? 'Cannot afford spell' };
    }

    // Spell validated, move to target finding
    this.updateState(entity, { phase: 'find_target' });
  }

  /**
   * Find or validate spell target
   */
  private findTarget(
    entity: EntityImpl,
    world: World,
    state: CastSpellState,
    position: PositionComponent
  ): BehaviorResult | void {
    const spellId = state.spellId!;
    const spell = this.spellRegistry.getSpell(spellId)!;

    // Self-targeted spells don't need external target
    if (spell.range === 0) {
      this.updateState(entity, {
        targetId: entity.id,
        phase: 'move_to_range'
      });
      return;
    }

    // If target already specified, validate it
    if (state.targetId) {
      const target = world.getEntity(state.targetId);
      if (target) {
        // Target exists, proceed to movement
        this.updateState(entity, { phase: 'move_to_range' });
        return;
      } else {
        // Target no longer exists, need to find new one
        this.updateState(entity, { targetId: undefined });
      }
    }

    // Find suitable target based on spell effect
    const targetEntity = this.findSuitableTarget(entity, world, spell, position);

    if (!targetEntity) {
      return {
        complete: true,
        reason: `No suitable target found for spell: ${spell.name}`
      };
    }

    this.updateState(entity, {
      targetId: targetEntity.id,
      phase: 'move_to_range'
    });
  }

  /**
   * Move into spell range
   */
  private moveToRange(
    entity: EntityImpl,
    world: World,
    state: CastSpellState,
    position: PositionComponent
  ): BehaviorResult | void {
    const spellId = state.spellId!;
    const spell = this.spellRegistry.getSpell(spellId)!;

    // Self-targeted spells are always in range
    if (spell.range === 0) {
      this.stopAllMovement(entity);
      this.updateState(entity, { phase: 'casting' });
      return;
    }

    const targetId = state.targetId;
    if (!targetId) {
      // Lost target, go back to finding
      this.updateState(entity, { phase: 'find_target' });
      return;
    }

    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) {
      // Target disappeared
      this.updateState(entity, { phase: 'find_target', targetId: undefined });
      return;
    }

    const targetPos = targetEntity.components.get(ComponentType.Position) as PositionComponent | undefined;
    if (!targetPos) {
      this.updateState(entity, { phase: 'find_target', targetId: undefined });
      return;
    }

    // Calculate distance
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if in range
    if (distance <= spell.range) {
      this.stopAllMovement(entity);
      this.updateState(entity, { phase: 'casting' });
      return;
    }

    // Move toward target
    this.moveToward(entity, { x: targetPos.x, y: targetPos.y }, {
      arrivalDistance: spell.range * 0.9 // Get 90% of the way to max range
    });
  }

  /**
   * Cast the spell
   */
  private castSpell(
    entity: EntityImpl,
    world: World,
    state: CastSpellState,
    _magic: MagicComponent
  ): BehaviorResult | void {
    this.stopAllMovement(entity);

    const spellId = state.spellId!;
    const targetId = state.targetId;

    // Get target entity if specified
    let targetEntity: EntityImpl | undefined;
    if (targetId) {
      targetEntity = world.getEntity(targetId) as EntityImpl | undefined;
      if (!targetEntity && targetId !== entity.id) {
        // Target vanished during cast
        this.updateState(entity, {
          phase: 'complete',
          error: 'Target vanished before cast'
        });
        return { complete: true, reason: 'Target vanished before cast' };
      }
    }

    // Execute spell cast
    const result = this.castingService.castSpell(
      spellId,
      entity,
      world,
      world.tick,
      {
        target: targetEntity ?? entity,
        targetX: state.targetX,
        targetY: state.targetY
      }
    );

    // Emit casting event
    const spell = this.spellRegistry.getSpell(spellId);
    if (spell) {
      world.eventBus.emit({
        type: 'magic:spell_cast',
        source: 'cast-spell-behavior',
        data: {
          spellId,
          spell: spell.name,
          technique: spell.technique,
          form: spell.form,
          manaCost: spell.manaCost,
          casterId: entity.id,
          targetId: result.targetId,
          success: result.success,
          mishap: result.mishap
        }
      });
    }

    // Mark complete
    this.updateState(entity, {
      phase: 'complete',
      castSuccess: result.success,
      error: result.error ?? (result.mishap ? 'Spell mishap occurred' : undefined)
    });

    return {
      complete: true,
      reason: result.success ? 'Spell cast successfully' : (result.error ?? 'Spell cast failed')
    };
  }

  /**
   * Find a suitable target for the spell
   */
  private findSuitableTarget(
    entity: EntityImpl,
    world: World,
    spell: any,
    position: PositionComponent
  ): EntityImpl | null {
    // Get spell effect category to determine target selection
    const effectId = spell.effectId;

    // For now, use simple heuristics based on common spell patterns
    // TODO: Could be made more sophisticated with utility scoring

    // Healing/buff spells: target self or injured allies
    if (effectId.includes('heal') || effectId.includes('buff') || effectId.includes('protect')) {
      // Target self if injured
      const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
      if (needs && needs.health < 0.7) {
        return entity;
      }

      // Find injured ally
      const allies = world
        .query()
        .with(ComponentType.Agent)
        .with(ComponentType.Position)
        .with(ComponentType.Needs)
        .executeEntities();

      let bestTarget: EntityImpl | null = null;
      let lowestHealth = 0.7; // Only help if below 70% health

      for (const ally of allies) {
        const allyImpl = ally as EntityImpl;
        if (allyImpl.id === entity.id) continue;

        const allyPos = allyImpl.getComponent<PositionComponent>(ComponentType.Position);
        const allyNeeds = allyImpl.getComponent<NeedsComponent>(ComponentType.Needs);

        if (!allyPos || !allyNeeds) continue;

        // Check distance
        const dx = allyPos.x - position.x;
        const dy = allyPos.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > MAX_TARGET_SEARCH_DISTANCE) continue;

        // Check health
        if (allyNeeds.health < lowestHealth) {
          lowestHealth = allyNeeds.health;
          bestTarget = allyImpl;
        }
      }

      return bestTarget ?? entity; // Default to self
    }

    // Damage/debuff spells: target nearest enemy or hostile animal
    if (effectId.includes('damage') || effectId.includes('debuff') || effectId.includes('control')) {
      // Find nearest animal (potential hostile)
      const animals = world
        .query()
        .with(ComponentType.Animal)
        .with(ComponentType.Position)
        .executeEntities();

      let nearestAnimal: EntityImpl | null = null;
      let nearestDistance = MAX_TARGET_SEARCH_DISTANCE;

      for (const animal of animals) {
        const animalImpl = animal as EntityImpl;
        const animalPos = animalImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!animalPos) continue;

        const dx = animalPos.x - position.x;
        const dy = animalPos.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestAnimal = animalImpl;
        }
      }

      return nearestAnimal;
    }

    // Default: no suitable target
    return null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function castSpellBehavior(entity: EntityImpl, world: World): void {
  const behavior = new CastSpellBehavior();
  behavior.execute(entity, world);
}
