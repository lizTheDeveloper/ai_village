/**
 * InitiateCombatBehavior - Agent autonomously initiates combat
 *
 * Used when:
 * - Jealousy-driven confrontation (crimes of passion)
 * - Honor duels
 * - Territory disputes
 * - Revenge attacks
 * - Self-defense escalation
 *
 * Creates a ConflictComponent with the target, initiating the combat sequence.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { World } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { createConflictComponent } from '../../components/ConflictComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

export interface InitiateCombatState {
  /** Target entity to fight */
  targetId: string;

  /** Reason for combat (for narrative/social consequences) */
  cause: 'jealousy_rival' | 'jealousy_infidelity' | 'jealousy_ex' |
         'honor_duel' | 'territory_dispute' | 'revenge' | 'defense' |
         'courtship_display' | 'robbery';

  /** Is this lethal combat? */
  lethal?: boolean;

  /** Surprise attack? */
  surprise?: boolean;
}

/** Valid cause values for type guard validation */
const VALID_COMBAT_CAUSES = [
  'jealousy_rival', 'jealousy_infidelity', 'jealousy_ex',
  'honor_duel', 'territory_dispute', 'revenge', 'defense',
  'courtship_display', 'robbery'
] as const;

/**
 * Type guard for InitiateCombatState.
 * Validates the behavior state has required fields at runtime.
 */
function isInitiateCombatState(state: unknown): state is InitiateCombatState {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  const obj = state as Record<string, unknown>;
  if (typeof obj.targetId !== 'string') {
    return false;
  }
  // cause is required and must be a valid value
  if (typeof obj.cause !== 'string' || !VALID_COMBAT_CAUSES.includes(obj.cause as typeof VALID_COMBAT_CAUSES[number])) {
    return false;
  }
  // Optional boolean fields
  if (obj.lethal !== undefined && typeof obj.lethal !== 'boolean') {
    return false;
  }
  if (obj.surprise !== undefined && typeof obj.surprise !== 'boolean') {
    return false;
  }
  return true;
}

/**
 * Partial type guard for InitiateCombatState that allows missing cause.
 * Used when 'challenge' default is acceptable.
 */
function hasRequiredCombatFields(state: unknown): state is { targetId: string; cause?: string; lethal?: boolean; surprise?: boolean } {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  const obj = state as Record<string, unknown>;
  return typeof obj.targetId === 'string';
}

export class InitiateCombatBehavior extends BaseBehavior {
  public readonly name = 'initiate_combat' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    if (!agent) {
      return {
        complete: true,
        reason: 'No agent component',
      };
    }

    // Read behavior state from agent component with runtime validation
    if (!hasRequiredCombatFields(agent.behaviorState)) {
      return {
        complete: true,
        reason: 'Missing combat target in behaviorState',
      };
    }

    // After type guard, behaviorState is narrowed to have required fields
    const { targetId, cause = 'challenge', lethal = false, surprise = false } = agent.behaviorState;

    // Validate target exists
    const target = world.getEntity(targetId);
    if (!target) {
      return {
        complete: true,
        reason: `Combat target ${targetId} not found`,
      };
    }

    // Check if target is an agent (can't fight buildings, plants, etc.)
    if (!world.hasComponent(targetId, CT.Agent)) {
      return {
        complete: true,
        reason: `Cannot fight ${targetId} - not an agent`,
      };
    }

    // Check if already in combat
    if (entity.hasComponent(CT.Conflict)) {
      return {
        complete: true,
        reason: 'Already in combat',
      };
    }

    // Check if target has combat stats (required for combat)
    if (!world.hasComponent(entity.id, CT.CombatStats)) {
      return {
        complete: true,
        reason: 'Missing combat_stats component - cannot fight',
      };
    }

    if (!world.hasComponent(targetId, CT.CombatStats)) {
      return {
        complete: true,
        reason: `Target ${targetId} cannot fight (no combat_stats)`,
      };
    }

    // Create conflict component
    const conflict = createConflictComponent({
      conflictType: 'agent_combat',
      target: targetId,
      state: 'initiated',
      startTime: world.tick,
      cause,
      lethal,
      surprise,
    });

    // Cast to EntityImpl required: Entity interface is readonly by design,
    // but behaviors need mutation capabilities for adding components
    (entity as EntityImpl).addComponent(conflict);

    // Emit event for narrative/logging
    world.eventBus.emit({
      type: 'combat:initiated_by_agent',
      source: entity.id,
      data: {
        attackerId: entity.id,
        defenderId: targetId,
        cause,
        lethal,
        surprise,
        autonomousDecision: true,
      },
    });

    // Emit specific jealousy combat event if applicable
    if (cause.startsWith('jealousy_')) {
      world.eventBus.emit({
        type: 'combat:crime_of_passion',
        source: entity.id,
        data: {
          attackerId: entity.id,
          defenderId: targetId,
          jealousyType: cause.replace('jealousy_', ''),
        },
      });
    }

    return {
      complete: true,
      reason: `Initiated combat with ${targetId} (${cause})`,
    };
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use initiateCombatBehaviorWithContext with BehaviorContext instead
 */
export function initiateCombatBehavior(entity: EntityImpl, world: World): void {
  const behavior = new InitiateCombatBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('initiate_combat', initiateCombatBehaviorWithContext);
 */
export function initiateCombatBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Read behavior state with runtime type validation
  const state = ctx.getAllState();
  if (!hasRequiredCombatFields(state)) {
    return ctx.complete('Missing combat target in behaviorState');
  }

  // After type guard, state is narrowed to have required fields
  const { targetId, cause = 'challenge', lethal = false, surprise = false } = state;

  // Validate target exists and is an agent
  const target = ctx.getEntity(targetId);
  if (!target) {
    return ctx.complete(`Combat target ${targetId} not found`);
  }

  // Cast to EntityImpl required: ctx.getEntity returns Entity but we need
  // to call hasComponent which is on the implementation
  const targetEntity = target as EntityImpl;

  // Check if target is an agent (can't fight buildings, plants, etc.)
  if (!targetEntity.hasComponent(CT.Agent)) {
    return ctx.complete(`Cannot fight ${targetId} - not an agent`);
  }

  // Check if already in combat
  if (ctx.hasComponent(CT.Conflict)) {
    return ctx.complete('Already in combat');
  }

  // Check if has combat stats (required for combat)
  if (!ctx.hasComponent(CT.CombatStats)) {
    return ctx.complete('Missing combat_stats component - cannot fight');
  }

  // Check target has combat stats
  if (!targetEntity.hasComponent(CT.CombatStats)) {
    return ctx.complete(`Target ${targetId} cannot fight (no combat_stats)`);
  }

  // Create conflict component
  const conflict = createConflictComponent({
    conflictType: 'agent_combat',
    target: targetId,
    state: 'initiated',
    startTime: ctx.tick,
    cause,
    lethal,
    surprise,
  });

  // Cast to EntityImpl required: Entity interface is readonly by design,
  // but behaviors need mutation capabilities for adding components
  (ctx.entity as EntityImpl).addComponent(conflict);

  // Emit event for narrative/logging
  ctx.emit({
    type: 'combat:initiated_by_agent',
    data: {
      attackerId: ctx.entity.id,
      defenderId: targetId,
      cause,
      lethal,
      surprise,
      autonomousDecision: true,
    },
  });

  // Emit specific jealousy combat event if applicable
  if (cause.startsWith('jealousy_')) {
    ctx.emit({
      type: 'combat:crime_of_passion',
      data: {
        attackerId: ctx.entity.id,
        defenderId: targetId,
        jealousyType: cause.replace('jealousy_', ''),
      },
    });
  }

  return ctx.complete(`Initiated combat with ${targetId} (${cause})`);
}
