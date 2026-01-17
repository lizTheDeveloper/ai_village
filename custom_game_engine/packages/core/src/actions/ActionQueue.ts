import type { EntityId, Tick } from '../types.js';
import type { WorldMutator } from '../ecs/World.js';
import type { Action, ActionEffect } from './Action.js';
import type { IActionRegistry } from './ActionRegistry.js';
import type { TimeComponent } from '../systems/TimeSystem.js';
import { v4 as uuidv4 } from 'uuid';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Queue and process actions.
 */
export interface IActionQueue {
  /** Submit a new action, returns action ID */
  submit(action: Omit<Action, 'id' | 'status' | 'createdAt'>): string;

  /** Get pending actions for an entity */
  getPending(entityId: EntityId): ReadonlyArray<Action>;

  /** Get currently executing action for an entity */
  getExecuting(entityId: EntityId): Action | undefined;

  /** Cancel an action */
  cancel(actionId: string, reason: string): boolean;

  /** Process all actions (called each tick) */
  process(world: WorldMutator): void;

  /** Get action history */
  getHistory(since?: Tick): ReadonlyArray<Action>;
}

/**
 * Implementation of ActionQueue.
 */
export class ActionQueue implements IActionQueue {
  private actions = new Map<string, Action>();
  private actionHistory: Action[] = [];

  /** Maximum action history entries to retain (prevents memory leak) */
  private static readonly MAX_ACTION_HISTORY = 500;

  // Indices
  private pendingByEntity = new Map<EntityId, string[]>();
  private executingByEntity = new Map<EntityId, string>();
  private executingActions = new Map<
    string,
    { remainingTicks: number }
  >();

  // Performance: Cache time entity to avoid querying every tick
  private timeEntityId: string | null = null;

  constructor(
    private registry: IActionRegistry,
    private getCurrentTick: () => Tick
  ) {}

  submit(action: Omit<Action, 'id' | 'status' | 'createdAt'>): string {
    const id = uuidv4();
    const fullAction: Action = {
      ...action,
      id,
      status: 'pending',
      createdAt: this.getCurrentTick(),
    };

    this.actions.set(id, fullAction);

    // Add to pending queue for this entity
    if (!this.pendingByEntity.has(action.actorId)) {
      this.pendingByEntity.set(action.actorId, []);
    }
    this.pendingByEntity.get(action.actorId)!.push(id);

    return id;
  }

  getPending(entityId: EntityId): ReadonlyArray<Action> {
    const ids = this.pendingByEntity.get(entityId) ?? [];
    return ids
      .map((id) => this.actions.get(id))
      .filter((a): a is Action => a !== undefined && a.status === 'pending');
  }

  getExecuting(entityId: EntityId): Action | undefined {
    const id = this.executingByEntity.get(entityId);
    return id ? this.actions.get(id) : undefined;
  }

  cancel(actionId: string, reason: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;

    if (action.status === 'executing') {
      // TODO: Call interrupt handler when world reference is available
      // Currently cancel() doesn't receive a world parameter, but handler.onInterrupt() requires it.
      // This is a known limitation - interrupt cleanup effects are not applied during cancellation.
      // To fix: Either (1) add world param to cancel(), or (2) store world ref in ActionQueue.

      this.executingByEntity.delete(action.actorId);
      this.executingActions.delete(actionId);
    } else if (action.status === 'pending') {
      // Remove from pending queue
      const queue = this.pendingByEntity.get(action.actorId);
      if (queue) {
        const index = queue.indexOf(actionId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }
    }

    action.status = 'cancelled';
    action.completedAt = this.getCurrentTick();
    this.addToHistory(action);
    this.actions.delete(actionId);

    return true;
  }

  process(world: WorldMutator): void {
    // 1. Start new actions for entities without active actions
    for (const [entityId, queue] of this.pendingByEntity) {
      if (this.executingByEntity.has(entityId)) continue;
      if (queue.length === 0) continue;

      const actionId = queue.shift()!;
      const action = this.actions.get(actionId);
      if (!action) continue;

      this.startAction(action, world);
    }

    // 2. Get speed multiplier from time component
    const speedMultiplier = this.getSpeedMultiplier(world);

    // 3. Progress executing actions
    for (const [actionId, state] of this.executingActions) {
      state.remainingTicks -= speedMultiplier;

      if (state.remainingTicks <= 0) {
        const action = this.actions.get(actionId);
        if (action) {
          this.completeAction(action, world);
        }
      }
    }
  }

  getHistory(since?: Tick): ReadonlyArray<Action> {
    if (since === undefined) {
      return this.actionHistory;
    }
    return this.actionHistory.filter((a) => a.createdAt >= since);
  }

  /**
   * Add action to history with bounds enforcement.
   * @internal
   */
  private addToHistory(action: Action): void {
    this.actionHistory.push(action);
    // Prune oldest entries if over limit
    if (this.actionHistory.length > ActionQueue.MAX_ACTION_HISTORY) {
      this.actionHistory.shift();
    }
  }

  /**
   * Get the handler for a specific action type.
   * Useful for accessing handler methods like getDuration() from UI code.
   */
  getHandler(actionType: string) {
    return this.registry.get(actionType);
  }

  private startAction(action: Action, world: WorldMutator): void {
    const handler = this.registry.get(action.type);
    if (!handler) {
      action.status = 'failed';
      action.result = {
        success: false,
        reason: `No handler for action type "${action.type}"`,
        effects: [],
        events: [],
      };
      action.completedAt = this.getCurrentTick();
      this.addToHistory(action);
      this.actions.delete(action.id);
      return;
    }

    // Validate
    const validation = handler.validate(action, world);
    if (!validation.valid) {
      console.error(`[ActionQueue] Action ${action.type} (${action.id}) failed validation: ${validation.reason}`);
      action.status = 'failed';
      action.result = {
        success: false,
        reason: validation.reason,
        effects: [],
        events: [],
      };
      action.completedAt = this.getCurrentTick();
      this.addToHistory(action);
      this.actions.delete(action.id);

      // Emit failure event so UI can show feedback
      world.eventBus.emit({
        type: 'agent:action:failed',
        source: action.actorId,
        data: {
          actionId: action.id,
          actionType: action.type,
          reason: validation.reason || 'Validation failed',
        },
      });
      return;
    }

    // Start execution
    action.status = 'executing';
    action.startedAt = this.getCurrentTick();

    const duration = handler.getDuration(action, world);

    this.executingByEntity.set(action.actorId, action.id);
    this.executingActions.set(action.id, { remainingTicks: duration });

    // Emit event
    world.eventBus.emit({
      type: 'agent:action:started',
      source: action.actorId,
      data: { actionId: action.id, actionType: action.type },
    });
  }

  private completeAction(action: Action, world: WorldMutator): void {
    const handler = this.registry.get(action.type);
    if (!handler) return;

    // Execute
    const result = handler.execute(action, world);

    action.status = result.success ? 'completed' : 'failed';
    action.result = result;
    action.completedAt = this.getCurrentTick();

    // Apply effects
    if (result.success) {
      this.applyEffects(result.effects, world);

      // Emit result events
      for (const event of result.events) {
        world.eventBus.emit(event);
      }
    }

    // Emit completion event
    world.eventBus.emit({
      type: 'agent:action:completed',
      source: action.actorId,
      data: {
        actionId: action.id,
        actionType: action.type,
        success: result.success,
        ...(result.reason && { reason: result.reason }),
      },
    });

    // Cleanup
    this.executingByEntity.delete(action.actorId);
    this.executingActions.delete(action.id);
    this.addToHistory(action);
    this.actions.delete(action.id);
  }

  private applyEffects(_effects: ReadonlyArray<ActionEffect>, _world: WorldMutator): void {
    // This will be implemented properly when we have full effect system
    // For now, just a placeholder
  }

  /**
   * Get the current speed multiplier from the world's time component.
   * Returns 1 (normal speed) if no time component exists.
   * Performance: Caches time entity to avoid querying every tick.
   */
  private getSpeedMultiplier(world: WorldMutator): number {
    if (!this.timeEntityId) {
      const timeEntities = world.query().with(ComponentType.Time).executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0]!.id;
      }
    }

    if (this.timeEntityId) {
      const timeEntity = world.getEntity(this.timeEntityId);
      if (timeEntity) {
        const timeComponent = timeEntity.components.get(ComponentType.Time) as TimeComponent | undefined;
        return timeComponent?.speedMultiplier ?? 1;
      } else {
        this.timeEntityId = null;
      }
    }

    return 1;
  }
}
