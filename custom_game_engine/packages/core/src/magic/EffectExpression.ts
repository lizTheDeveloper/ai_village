/**
 * EffectExpression - Type definitions for declarative spell effect expressions
 *
 * Effects are described as data structures that can be validated, serialized,
 * and interpreted at runtime. This approach allows effects to be authored
 * by LLMs, players, or modders without direct code access.
 */

import type { DamageType, TargetType } from './SpellEffect.js';

// ============================================================================
// Timing
// ============================================================================

export type TimingType =
  | 'immediate'  // Applied instantly
  | 'delayed'    // Applied after a time delay
  | 'channeled'  // Applied over a channel duration
  | 'triggered'; // Applied when a condition is met

export interface EffectTiming {
  type: TimingType;
  delay?: number;
  duration?: number;
  condition?: string;
}

// ============================================================================
// Target
// ============================================================================

export interface EffectTarget {
  type: TargetType;
  radius?: number;
  count?: number;
  filter?: string;
}

// ============================================================================
// Operations (what the effect does)
// ============================================================================

export interface DealDamageOp {
  op: 'deal_damage';
  damageType: DamageType;
  amount: number | ExpressionNode;
}

export interface ModifyStatOp {
  op: 'modify_stat';
  stat: string;
  amount: number | ExpressionNode;
  duration?: number;
}

export interface HealOp {
  op: 'heal';
  amount: number | ExpressionNode;
}

export interface ApplyStatusOp {
  op: 'apply_status';
  status: string;
  duration: number;
}

export interface SpawnEntityOp {
  op: 'spawn_entity';
  entityType: string;
  count: number;
}

export type EffectOperation =
  | DealDamageOp
  | ModifyStatOp
  | HealOp
  | ApplyStatusOp
  | SpawnEntityOp;

// ============================================================================
// Expression nodes (for computed values)
// ============================================================================

export type ExpressionNode =
  | number
  | string
  | { op: '+' | '-' | '*' | '/'; left: ExpressionNode; right: ExpressionNode };

// ============================================================================
// Effect Expression (root type)
// ============================================================================

export interface EffectExpression {
  name?: string;
  description?: string;
  target: EffectTarget;
  operations: EffectOperation[];
  timing: EffectTiming;
}
