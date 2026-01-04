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

    (entity as any).addComponent(conflict);

    // TODO: Add hunting event types to EventMap
    // Emit event for narrative/logging
    // world.eventBus.emit({
    //   type: 'hunt:initiated_by_agent',
    //   source: entity.id,
    //   data: {
    //     hunterId: entity.id,
    //     targetId: targetId,
    //     reason: reason,
    //     autonomousDecision: true,
    //   },
    // });

    return {
      complete: true,
      reason: `Initiated hunt for ${targetId} (${reason})`,
    };
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function initiateHuntBehavior(entity: EntityImpl, world: World): void {
  const behavior = new InitiateHuntBehavior();
  behavior.execute(entity, world);
}
