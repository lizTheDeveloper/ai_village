import type { ActionType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Action, ActionResult, ActionEffect, ValidationResult } from './Action.js';

/**
 * Handler for a specific action type.
 */
export interface ActionHandler {
  readonly type: ActionType;
  readonly description: string;
  readonly interruptible: boolean;

  /** Calculate action duration in ticks */
  getDuration(action: Action, world: World): number;

  /** Validate that action can be performed */
  validate(action: Action, world: World): ValidationResult;

  /** Execute the action and return effects */
  execute(action: Action, world: World): ActionResult;

  /** Called if action is interrupted */
  onInterrupt?(action: Action, world: World, reason: string): ActionEffect[];
}
