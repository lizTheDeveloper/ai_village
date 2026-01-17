/**
 * PassageSystem - Manages cross-universe passage traversal
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { PassageComponent } from '../components/PassageComponent.js';
import {
  canTraverse,
  getPassageCooldown,
  getTraversalCost,
} from '../components/PassageComponent.js';
import { multiverseCoordinator } from '../multiverse/index.js';

/**
 * Traversal request from an entity.
 */
export interface TraversalRequest {
  entityId: string;
  passageId: string;
  tick: number;
}

/**
 * Result of a traversal attempt.
 */
export interface TraversalResult {
  success: boolean;
  reason?: string;
  targetUniverseId?: string;
  targetPosition?: { x: number; y: number; z: number };
}

/**
 * PassageSystem handles passage activation and entity traversal between universes.
 *
 * NOTE: This is a single-universe system. Cross-universe entity transfer requires
 * coordination at the MultiverseCoordinator level. This system handles the mechanics
 * within a single universe (checking passage state, queueing traversals, etc.)
 */
export class PassageSystem extends BaseSystem {
  public readonly id: SystemId = 'passage';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Passage];

  private traversalQueue: TraversalRequest[] = [];

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Update passage states and cooldowns
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const passage = comps.optional<PassageComponent>(CT.Passage);
      if (!passage) continue;

      // Reduce cooldown
      if (passage.cooldown > 0) {
        comps.update<PassageComponent>(CT.Passage, (current) => ({
          ...current,
          cooldown: Math.max(0, current.cooldown - 1),
        }));
      }

      // Activate dormant passages
      if (passage.state === 'dormant' && passage.active) {
        comps.update<PassageComponent>(CT.Passage, (current) => ({
          ...current,
          state: 'active',
        }));

        ctx.emit('passage:activated', {
          passageId: passage.passageId,
          sourceUniverse: passage.sourceUniverseId,
          targetUniverse: passage.targetUniverseId,
        }, entity.id);
      }

      // Handle collapsing passages
      if (passage.state === 'collapsing') {
        comps.update<PassageComponent>(CT.Passage, (current) => ({
          ...current,
          active: false,
          state: 'dormant',
        }));

        ctx.emit('passage:collapsed', {
          passageId: passage.passageId,
        }, entity.id);
      }
    }

    // Process traversal queue
    this.processTraversalQueue(ctx, tick);
  }

  /**
   * Request passage traversal for an entity.
   */
  requestTraversal(entityId: string, passageId: string, tick: number): void {
    this.traversalQueue.push({ entityId, passageId, tick });
  }

  /**
   * Process all pending traversal requests.
   */
  private processTraversalQueue(
    ctx: SystemContext,
    tick: number
  ): void {
    if (this.traversalQueue.length === 0) return;

    const processed: TraversalRequest[] = [];

    for (const request of this.traversalQueue) {
      const result = this.attemptTraversal(ctx, request, tick);

      if (result.success) {
        processed.push(request);
      } else {
        // Log failure
        ctx.emit('passage:traversal_failed', {
          passageId: request.passageId,
          reason: result.reason ?? 'Unknown error',
        }, request.entityId);
      }
    }

    // Remove processed requests
    this.traversalQueue = this.traversalQueue.filter(
      (req) => !processed.includes(req)
    );
  }

  /**
   * Attempt to traverse a passage.
   */
  private attemptTraversal(
    ctx: SystemContext,
    request: TraversalRequest,
    tick: number
  ): TraversalResult {
    // Find the passage entity
    const passageEntity = ctx.activeEntities.find((e) => {
      const passage = e.getComponent<PassageComponent>(CT.Passage);
      return passage?.passageId === request.passageId;
    });

    if (!passageEntity) {
      return {
        success: false,
        reason: 'Passage not found',
      };
    }

    const passage = passageEntity.getComponent<PassageComponent>(CT.Passage);

    if (!passage) {
      return {
        success: false,
        reason: 'Invalid passage component',
      };
    }

    // Check if passage is traversable
    if (!canTraverse(passage, tick)) {
      return {
        success: false,
        reason: passage.cooldown > 0
          ? 'Passage on cooldown'
          : passage.state !== 'active'
          ? 'Passage not active'
          : 'Passage not available',
      };
    }

    // Verify target universe exists
    const targetUniverse = multiverseCoordinator.getUniverse(
      passage.targetUniverseId
    );

    if (!targetUniverse) {
      return {
        success: false,
        reason: 'Target universe does not exist',
      };
    }

    // Get entity being traversed
    const entity = ctx.world.getEntity(request.entityId);
    if (!entity) {
      return {
        success: false,
        reason: 'Entity not found',
      };
    }

    // Mark entity as in transit
    passageEntity.updateComponent<PassageComponent>(CT.Passage, (current) => {
      const newInTransit = new Set(current.entitiesInTransit);
      newInTransit.add(request.entityId);

      return {
        ...current,
        entitiesInTransit: newInTransit,
        traversalCount: current.traversalCount + 1,
        lastTraversal: tick,
        cooldown: getPassageCooldown(current.passageType),
      };
    });

    // Emit traversal event
    ctx.emit('passage:entity_traversed', {
      passageId: passage.passageId,
      sourceUniverse: passage.sourceUniverseId,
      targetUniverse: passage.targetUniverseId,
      targetPosition: passage.targetPosition,
      cost: getTraversalCost(passage.passageType),
    }, request.entityId);

    // NOTE: Actual entity transfer between universes would happen at the
    // MultiverseCoordinator level. This system just validates and tracks
    // the traversal within the current universe.

    return {
      success: true,
      targetUniverseId: passage.targetUniverseId,
      targetPosition: passage.targetPosition,
    };
  }

  /**
   * Complete a traversal (called after entity is transferred to target universe).
   */
  completeTraversal(passageId: string, entityId: string, world: World): void {
    const passage = world
      .query()
      .with(CT.Passage)
      .executeEntities()
      .find((e) => {
        const impl = e as EntityImpl;
        const p = impl.getComponent<PassageComponent>(CT.Passage);
        return p?.passageId === passageId;
      });

    if (!passage) return;

    const impl = passage as EntityImpl;
    impl.updateComponent<PassageComponent>(CT.Passage, (current) => {
      const newInTransit = new Set(current.entitiesInTransit);
      newInTransit.delete(entityId);

      return {
        ...current,
        entitiesInTransit: newInTransit,
      };
    });
  }

  /**
   * Deactivate a passage.
   */
  deactivatePassage(passageId: string, world: World): void {
    const passage = world
      .query()
      .with(CT.Passage)
      .executeEntities()
      .find((e) => {
        const impl = e as EntityImpl;
        const p = impl.getComponent<PassageComponent>(CT.Passage);
        return p?.passageId === passageId;
      });

    if (!passage) return;

    const impl = passage as EntityImpl;
    impl.updateComponent<PassageComponent>(CT.Passage, (current) => ({
      ...current,
      state: 'collapsing',
      active: false,
    }));
  }
}
