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

    // Read behavior state from agent component
    const state = agent.behaviorState as unknown as InitiateCombatState | undefined;
    if (!state || !state.targetId) {
      return {
        complete: true,
        reason: 'Missing combat target in behaviorState',
      };
    }

    const { targetId, cause = 'challenge', lethal = false, surprise = false } = state;

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

    (entity as any).addComponent(conflict);

    // TODO: Add combat event types to EventMap
    // Emit event for narrative/logging
    // world.eventBus.emit({
    //   type: 'combat:initiated_by_agent',
    //   source: entity.id,
    //   data: {
    //     attackerId: entity.id,
    //     defenderId: targetId,
    //     cause,
    //     lethal,
    //     surprise,
    //     autonomousDecision: true,
    //   },
    //});

    // Emit specific jealousy combat event if applicable
    // if (cause.startsWith('jealousy_')) {
    //   world.eventBus.emit({
    //     type: 'combat:crime_of_passion',
    //     source: entity.id,
    //     data: {
    //       attackerId: entity.id,
    //       defenderId: targetId,
    //       jealousyType: cause.replace('jealousy_', ''),
    //     },
    //   });
    // }

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
  // Read behavior state
  const state = ctx.getAllState() as unknown as InitiateCombatState | undefined;
  if (!state || !state.targetId) {
    return ctx.complete('Missing combat target in behaviorState');
  }

  const { targetId, cause = 'challenge', lethal = false, surprise = false } = state;

  // Validate target exists and is an agent
  const target = ctx.getEntity(targetId);
  if (!target) {
    return ctx.complete(`Combat target ${targetId} not found`);
  }

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

  (ctx.entity as any).addComponent(conflict);

  // TODO: Add combat event types to EventMap
  // Emit event for narrative/logging
  // ctx.emit({
  //   type: 'combat:initiated_by_agent',
  //   data: {
  //     attackerId: ctx.entity.id,
  //     defenderId: targetId,
  //     cause,
  //     lethal,
  //     surprise,
  //     autonomousDecision: true,
  //   },
  // });

  // Emit specific jealousy combat event if applicable
  // if (cause.startsWith('jealousy_')) {
  //   ctx.emit({
  //     type: 'combat:crime_of_passion',
  //     data: {
  //       attackerId: ctx.entity.id,
  //       defenderId: targetId,
  //       jealousyType: cause.replace('jealousy_', ''),
  //     },
  //   });
  // }

  return ctx.complete(`Initiated combat with ${targetId} (${cause})`);
}
