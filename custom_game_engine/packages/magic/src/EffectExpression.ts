/**
 * EffectExpression - Universal format for all magic effects
 *
 * This is the "bytecode" that LLM-generated effects compile to.
 * Designed to be safe, inspectable, and portable across universes.
 *
 * Security:
 * - No eval() or Function() constructor
 * - No side effects during evaluation
 * - Depth and operation limits enforced
 * - Type-safe operations only
 */

// Expression evaluation (side-effect-free)
export type Expression =
  | number                                           // Literal
  | string                                           // Variable reference: "caster.intelligence"
  | FunctionExpression
  | BinaryExpression
  | UnaryExpression;

export interface FunctionExpression {
  fn: FunctionName;
  args: Expression[];
}

export interface BinaryExpression {
  op: BinaryOp;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  op: UnaryOp;
  operand: Expression;
}

export type FunctionName =
  // Math
  | 'sqrt' | 'pow' | 'abs' | 'floor' | 'ceil' | 'round'
  | 'min' | 'max' | 'clamp'
  // Random
  | 'random' | 'random_int' | 'random_choice'
  // Spatial
  | 'distance' | 'direction'
  // Queries
  | 'count' | 'has_status' | 'has_component' | 'get_stat'
  // Conditionals
  | 'if_else';

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '&&' | '||'
  | '==' | '!=' | '<' | '>' | '<=' | '>=';

export type UnaryOp = '-' | '!' | 'not';

// Entity context for expression evaluation
export interface EntityContext {
  id: string;
  health: number;
  maxHealth: number;
  intelligence: number;
  strength: number;
  level: number;
  statuses: string[];
  components: string[];
  stats: {
    health: number;
    maxHealth: number;
    intelligence: number;
    strength: number;
    [key: string]: number;
  };
  needs?: unknown;
  identity?: unknown;
  position?: unknown;
}

// Context for expression evaluation
export interface ExpressionContext {
  caster: EntityContext;
  target: EntityContext;
  world: unknown;
  tick: number;
  [key: string]: unknown;
}

// ============================================================================
// EFFECT INTERPRETER TYPES
// ============================================================================

// TargetSelector
export interface TargetSelector {
  type: 'self' | 'single' | 'area' | 'cone' | 'line' | 'all';
  filter?: TargetFilter;
  radius?: number;
  angle?: number;
  length?: number;
  maxTargets?: number;
  excludeSelf?: boolean;
  excludePrevious?: boolean;
}

export interface TargetFilter {
  entityTypes?: string[];
  factions?: string[];
  hasComponents?: string[];
  customPredicate?: Expression;
}

// Effect operations (the instruction set)
export type EffectOperation =
  // Stats
  | { op: 'modify_stat'; stat: string; amount: Expression; duration?: number }
  | { op: 'set_stat'; stat: string; value: Expression }
  // Status effects
  | { op: 'apply_status'; status: string; duration: number; stacks?: number }
  | { op: 'remove_status'; status: string; stacks?: number | 'all' }
  // Damage/healing
  | { op: 'deal_damage'; damageType: DamageType; amount: Expression }
  | { op: 'heal'; amount: Expression }
  // Movement
  | { op: 'teleport'; destination: LocationExpression }
  | { op: 'push'; direction: DirectionExpression; distance: Expression }
  | { op: 'pull'; toward: LocationExpression; distance: Expression }
  // Spawning
  | { op: 'spawn_entity'; entityType: string; count: Expression; at?: LocationExpression }
  | { op: 'spawn_item'; itemId: string; count: Expression; at?: LocationExpression }
  // Transformation
  | { op: 'transform_entity'; toType: string; duration?: number }
  | { op: 'transform_material'; from: string; to: string }
  // Events
  | { op: 'emit_event'; eventType: string; payload: Record<string, Expression> }
  // Chaining
  | { op: 'chain_effect'; effectId: string; newTarget: TargetSelector }
  | { op: 'trigger_effect'; effectId: string }
  // Control flow
  | { op: 'conditional'; condition: Condition; then: EffectOperation[]; else?: EffectOperation[] }
  | { op: 'repeat'; times: Expression; operations: EffectOperation[] }
  | { op: 'delay'; ticks: number; then: EffectOperation[] };

export type DamageType =
  | 'physical' | 'fire' | 'ice' | 'lightning' | 'poison'
  | 'holy' | 'unholy' | 'void' | 'psychic' | 'force';

export type LocationExpression = Expression | { x: Expression; y: Expression } | { relative?: boolean; x: number; y: number };
export type DirectionExpression = Expression | { dx: Expression; dy: Expression } | { angle?: number; fromCaster?: boolean };

export interface Condition {
  predicate?: Expression;
  op?: BinaryOp;
  left?: Expression;
  right?: Expression;
  fn?: FunctionName;
  args?: Expression[];
}

// Effect timing
export interface EffectTiming {
  type: 'immediate' | 'delayed' | 'periodic';
  delay?: number;
  ticks?: number;
  interval?: number;
  duration?: number;
}

// Complete EffectExpression
export interface EffectExpression {
  id?: string;
  name?: string;
  description?: string;
  target: TargetSelector;
  operations: EffectOperation[];
  timing: EffectTiming;
  conditions?: Condition[];
  source?: 'static' | 'composed' | 'generated';
}
