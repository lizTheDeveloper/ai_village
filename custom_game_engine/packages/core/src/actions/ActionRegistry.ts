import type { ActionType } from '../types.js';
import type { ActionHandler } from './ActionHandler.js';

/**
 * Registry for action handlers.
 */
export interface IActionRegistry {
  register(handler: ActionHandler): void;
  get(type: ActionType): ActionHandler | undefined;
  has(type: ActionType): boolean;
  getTypes(): ReadonlyArray<ActionType>;
}

/**
 * Implementation of ActionRegistry.
 */
export class ActionRegistry implements IActionRegistry {
  private handlers = new Map<ActionType, ActionHandler>();

  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Action type "${handler.type}" is already registered`);
    }
    this.handlers.set(handler.type, handler);
  }

  get(type: ActionType): ActionHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: ActionType): boolean {
    return this.handlers.has(type);
  }

  getTypes(): ReadonlyArray<ActionType> {
    return Array.from(this.handlers.keys());
  }
}
