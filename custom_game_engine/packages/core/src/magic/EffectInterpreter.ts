/**
 * EffectInterpreter - Validates and interprets EffectExpression structures
 *
 * Performs semantic validation of effect operations to ensure they reference
 * valid game concepts (stat names, status names, etc.).
 */

import type { EffectExpression, EffectOperation } from './EffectExpression.js';

/** Stats that can be modified via modify_stat operations */
const VALID_STATS = new Set([
  'health',
  'max_health',
  'mana',
  'max_mana',
  'stamina',
  'max_stamina',
  'strength',
  'dexterity',
  'intelligence',
  'wisdom',
  'constitution',
  'charisma',
  'speed',
  'defense',
  'attack',
  'magic_power',
  'magic_defense',
  'fire_resistance',
  'ice_resistance',
  'lightning_resistance',
  'poison_resistance',
]);

/** Status effects that can be applied via apply_status operations */
const VALID_STATUSES = new Set([
  'burning',
  'frozen',
  'stunned',
  'poisoned',
  'bleeding',
  'slowed',
  'hasted',
  'invisible',
  'silenced',
  'charmed',
  'feared',
  'confused',
  'paralyzed',
  'regenerating',
  'shielded',
  'blessed',
  'cursed',
  'weakened',
  'empowered',
  'protected',
]);

export interface InterpreterIssue {
  message: string;
  operationIndex?: number;
}

/**
 * Interprets and validates effect expressions against game semantics.
 *
 * Checks that operations reference valid stats, statuses, and other
 * game concepts defined in the data model.
 */
export class EffectInterpreter {
  /**
   * Validate and interpret an effect expression.
   * Throws an InterpreterError if the effect uses invalid game concepts.
   *
   * @param effect The effect to interpret
   * @returns Array of issues found; empty array means effect is valid
   */
  interpret(effect: EffectExpression): InterpreterIssue[] {
    const issues: InterpreterIssue[] = [];

    for (let i = 0; i < effect.operations.length; i++) {
      const op = effect.operations[i]!;
      const opIssues = this.validateOperation(op, i);
      issues.push(...opIssues);
    }

    return issues;
  }

  private validateOperation(op: EffectOperation, index: number): InterpreterIssue[] {
    const issues: InterpreterIssue[] = [];

    switch (op.op) {
      case 'modify_stat': {
        if (!VALID_STATS.has(op.stat)) {
          issues.push({
            message: `Invalid stat name: "${op.stat}". Must be one of: ${[...VALID_STATS].join(', ')}`,
            operationIndex: index,
          });
        }
        break;
      }
      case 'apply_status': {
        if (!VALID_STATUSES.has(op.status)) {
          issues.push({
            message: `Invalid status name: "${op.status}". Must be one of: ${[...VALID_STATUSES].join(', ')}`,
            operationIndex: index,
          });
        }
        break;
      }
      // deal_damage, heal, spawn_entity: no semantic validation needed here
    }

    return issues;
  }
}
