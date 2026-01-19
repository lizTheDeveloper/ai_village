/**
 * InitiateHuntBehavior - Agent autonomously initiates hunting
 *
 * Used when:
 * - Agent needs food
 * - Agent spots huntable animals nearby
 * - Agent has hunting skill and wants to practice
 *
 * Creates a ConflictComponent with conflictType: 'hunting', initiating the hunting sequence.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { World } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { createConflictComponent } from '../../components/ConflictComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

export interface InitiateHuntState {
  /** Target animal entity to hunt */
  targetId: string;

  /** Reason for hunting */
  reason?: 'food' | 'practice' | 'resources';
}

export class InitiateHuntBehavior extends BaseBehavior {
  public readonly name = 'hunt' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    if (!agent) {
      return {
        complete: true,
        reason: 'No agent component',
      };
    }

    // Read behavior state from agent component
    const state = agent.behaviorState as unknown as InitiateHuntState | undefined;
    if (!state || !state.targetId) {
      return {
        complete: true,
        reason: 'Missing hunt target in behaviorState',
      };
    }

    const { targetId, reason = 'food' } = state;

    // Validate target exists
    const target = world.getEntity(targetId);
    if (!target) {
      return {
        complete: true,
        reason: `Hunt target ${targetId} not found`,
      };
    }

    // Check if target is an animal
    if (!world.hasComponent(targetId, CT.Animal)) {
      return {
        complete: true,
        reason: `Cannot hunt ${targetId} - not an animal`,
      };
    }

    // Check if already in conflict
    if (entity.hasComponent(CT.Conflict)) {
      return {
        complete: true,
        reason: 'Already in conflict',
      };
    }

    // Check if hunter has combat stats (required for hunting)
    if (!world.hasComponent(entity.id, CT.CombatStats)) {
      return {
        complete: true,
        reason: 'Missing combat_stats component - cannot hunt',
      };
    }

    // Create conflict component with hunting type
    const conflict = createConflictComponent({
      conflictType: 'hunting',
      target: targetId,
      state: 'initiated',
      startTime: world.tick,
    });

    // EntityImpl cast required: Entity interface doesn't expose mutation methods
    (entity as EntityImpl).addComponent(conflict);

    // Emit event for narrative/logging
    world.eventBus.emit({
      type: 'hunt:initiated_by_agent',
      source: entity.id,
      data: {
        hunterId: entity.id,
        targetId: targetId,
        reason: reason,
        autonomousDecision: true,
      },
    });

    return {
      complete: true,
      reason: `Initiated hunt for ${targetId} (${reason})`,
    };
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use initiateHuntBehaviorWithContext with BehaviorContext instead
 */
export function initiateHuntBehavior(entity: EntityImpl, world: World): void {
  const behavior = new InitiateHuntBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('hunt', initiateHuntBehaviorWithContext);
 */
export function initiateHuntBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Read behavior state
  const state = ctx.getAllState() as unknown as InitiateHuntState | undefined;
  if (!state || !state.targetId) {
    return ctx.complete('Missing hunt target in behaviorState');
  }

  const { targetId, reason = 'food' } = state;

  // Validate target exists
  const target = ctx.getEntity(targetId);
  if (!target) {
    return ctx.complete(`Hunt target ${targetId} not found`);
  }

  // Check if target is an animal
  if (!ctx.world.hasComponent(targetId, CT.Animal)) {
    return ctx.complete(`Cannot hunt ${targetId} - not an animal`);
  }

  // Check if already in conflict
  if (ctx.hasComponent(CT.Conflict)) {
    return ctx.complete('Already in conflict');
  }

  // Check if hunter has combat stats (required for hunting)
  if (!ctx.hasComponent(CT.CombatStats)) {
    return ctx.complete('Missing combat_stats component - cannot hunt');
  }

  // Create conflict component with hunting type
  const conflict = createConflictComponent({
    conflictType: 'hunting',
    target: targetId,
    state: 'initiated',
    startTime: ctx.tick,
  });

  // EntityImpl cast required: Entity interface doesn't expose mutation methods
  (ctx.entity as EntityImpl).addComponent(conflict);

  // Emit event for narrative/logging
  ctx.emit({
    type: 'hunt:initiated_by_agent',
    data: {
      hunterId: ctx.entity.id,
      targetId: targetId,
      reason: reason,
      autonomousDecision: true,
    },
  });

  return ctx.complete(`Initiated hunt for ${targetId} (${reason})`);
}
