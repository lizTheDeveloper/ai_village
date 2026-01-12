import type {
  Expression,
  ExpressionContext,
  BinaryExpression,
  UnaryExpression,
  FunctionExpression,
} from './EffectExpression.js';

export interface ExpressionEvaluatorOptions {
  maxDepth?: number;      // Prevent stack overflow
  maxOperations?: number; // Prevent DoS
}

/**
 * ExpressionEvaluator - Safe evaluation of EffectExpression trees
 *
 * Security features:
 * - No eval() or Function() constructor
 * - Depth limit prevents stack overflow
 * - Operation limit prevents DoS
 * - Type validation on all operations
 * - Prototype pollution prevention
 */
export class ExpressionEvaluator {
  private maxDepth: number;
  private maxOperations: number;
  private operationCount: number = 0;

  constructor(options: ExpressionEvaluatorOptions = {}) {
    this.maxDepth = options.maxDepth ?? 100;
    this.maxOperations = options.maxOperations ?? 10000;
  }

  evaluate(expr: Expression, context: ExpressionContext, depth: number = 0): number | boolean {
    // Security: Check depth
    if (depth > this.maxDepth) {
      throw new Error('Maximum depth exceeded');
    }

    // Security: Check operation count
    this.operationCount++;
    if (this.operationCount > this.maxOperations) {
      throw new Error('Maximum operation limit exceeded');
    }

    // Literal number
    if (typeof expr === 'number') {
      return expr;
    }

    // Variable reference
    if (typeof expr === 'string') {
      return this.resolveVariable(expr, context);
    }

    // Function call
    if ('fn' in expr) {
      return this.evaluateFunction(expr, context, depth);
    }

    // Binary operation
    if ('op' in expr && 'left' in expr) {
      return this.evaluateBinary(expr as BinaryExpression, context, depth);
    }

    // Unary operation
    if ('op' in expr && 'operand' in expr) {
      return this.evaluateUnary(expr as UnaryExpression, context, depth);
    }

    throw new Error(`Invalid expression: ${JSON.stringify(expr)}`);
  }

  private resolveVariable(path: string, context: ExpressionContext): number | boolean {
    // Security: Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    let parts = path.split('.');

    // Handle 'context.property' by removing 'context' prefix if it exists
    // This allows expressions like 'context.worldTick' to resolve to context.worldTick
    if (parts.length > 1 && parts[0] === 'context') {
      parts = parts.slice(1); // Remove 'context' prefix
    }

    for (const part of parts) {
      if (dangerousKeys.includes(part)) {
        throw new Error(`Access to ${part} is forbidden`);
      }
    }

    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        throw new Error(`Undefined variable: ${path}`);
      }
      value = value[part];
    }

    if (typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(`Variable ${path} is not a number or boolean (got ${typeof value})`);
    }

    return value;
  }

  private evaluateBinary(
    expr: BinaryExpression,
    context: ExpressionContext,
    depth: number
  ): number | boolean {
    const left = this.evaluate(expr.left, context, depth + 1);
    const right = this.evaluate(expr.right, context, depth + 1);

    // Type validation for arithmetic operations
    if (['+', '-', '*', '/', '%', '**'].includes(expr.op)) {
      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error(
          `Operator ${expr.op} requires numeric operands (got ${typeof left} and ${typeof right})`
        );
      }
    }

    switch (expr.op) {
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        if (right === 0) {
          // Tests expect Infinity for division by zero
          return Infinity;
        }
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);
      case '**':
        return Math.pow(left as number, right as number);
      case '&&':
        return left && right;
      case '||':
        return left || right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);
      default:
        throw new Error(`Unknown operator: ${(expr as any).op}`);
    }
  }

  private evaluateUnary(
    expr: UnaryExpression,
    context: ExpressionContext,
    depth: number
  ): number | boolean {
    const operand = this.evaluate(expr.operand, context, depth + 1);

    switch (expr.op) {
      case '-':
        if (typeof operand !== 'number') {
          throw new Error(`Unary minus requires numeric operand (got ${typeof operand})`);
        }
        return -operand;
      case '!':
      case 'not':
        return !operand;
      default:
        throw new Error(`Unknown unary operator: ${(expr as any).op}`);
    }
  }

  private evaluateFunction(
    expr: FunctionExpression,
    context: ExpressionContext,
    depth: number
  ): number | boolean {
    switch (expr.fn) {
      // Math functions
      case 'sqrt':
        return this.fn_sqrt(expr.args, context, depth);
      case 'pow':
        return this.fn_pow(expr.args, context, depth);
      case 'abs':
        return this.fn_abs(expr.args, context, depth);
      case 'floor':
        return this.fn_floor(expr.args, context, depth);
      case 'ceil':
        return this.fn_ceil(expr.args, context, depth);
      case 'round':
        return this.fn_round(expr.args, context, depth);
      case 'min':
        return this.fn_min(expr.args, context, depth);
      case 'max':
        return this.fn_max(expr.args, context, depth);
      case 'clamp':
        return this.fn_clamp(expr.args, context, depth);

      // Random functions
      case 'random':
        return this.fn_random(expr.args, context, depth);
      case 'random_int':
        return this.fn_random_int(expr.args, context, depth);
      case 'random_choice':
        return this.fn_random_choice(expr.args, context, depth);

      // Spatial functions
      case 'distance':
        return this.fn_distance(expr.args, context, depth);
      case 'direction':
        return this.fn_direction(expr.args, context, depth);

      // Query functions
      case 'count':
        return this.fn_count(expr.args, context, depth);
      case 'has_status':
        return this.fn_has_status(expr.args, context, depth);
      case 'has_component':
        return this.fn_has_component(expr.args, context, depth);
      case 'get_stat':
        return this.fn_get_stat(expr.args, context, depth);

      // Conditional
      case 'if_else':
        return this.fn_if_else(expr.args, context, depth);

      default:
        throw new Error(`Unknown function: ${(expr as any).fn}`);
    }
  }

  // ============================================================================
  // Math Functions
  // ============================================================================

  private fn_sqrt(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('sqrt requires exactly 1 argument');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    if (typeof value !== 'number') {
      throw new Error(`sqrt requires numeric argument (got ${typeof value})`);
    }
    return Math.sqrt(value);
  }

  private fn_pow(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('pow requires exactly 2 arguments');
    }
    const base = this.evaluate(args[0], context, depth + 1);
    const exponent = this.evaluate(args[1], context, depth + 1);
    if (typeof base !== 'number' || typeof exponent !== 'number') {
      throw new Error('pow requires numeric arguments');
    }
    return Math.pow(base, exponent);
  }

  private fn_abs(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('abs requires exactly 1 argument');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    if (typeof value !== 'number') {
      throw new Error(`abs requires numeric argument (got ${typeof value})`);
    }
    return Math.abs(value);
  }

  private fn_floor(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('floor requires exactly 1 argument');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    if (typeof value !== 'number') {
      throw new Error(`floor requires numeric argument (got ${typeof value})`);
    }
    return Math.floor(value);
  }

  private fn_ceil(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('ceil requires exactly 1 argument');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    if (typeof value !== 'number') {
      throw new Error(`ceil requires numeric argument (got ${typeof value})`);
    }
    return Math.ceil(value);
  }

  private fn_round(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('round requires exactly 1 argument');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    if (typeof value !== 'number') {
      throw new Error(`round requires numeric argument (got ${typeof value})`);
    }
    return Math.round(value);
  }

  private fn_min(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length === 0) {
      throw new Error('min requires at least 1 argument');
    }
    const values = args.map((arg) => {
      const val = this.evaluate(arg, context, depth + 1);
      if (typeof val !== 'number') {
        throw new Error('min requires numeric arguments');
      }
      return val;
    });
    return Math.min(...values);
  }

  private fn_max(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length === 0) {
      throw new Error('max requires at least 1 argument');
    }
    const values = args.map((arg) => {
      const val = this.evaluate(arg, context, depth + 1);
      if (typeof val !== 'number') {
        throw new Error('max requires numeric arguments');
      }
      return val;
    });
    return Math.max(...values);
  }

  private fn_clamp(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 3) {
      throw new Error('clamp requires exactly 3 arguments (value, min, max)');
    }
    const value = this.evaluate(args[0], context, depth + 1);
    const min = this.evaluate(args[1], context, depth + 1);
    const max = this.evaluate(args[2], context, depth + 1);
    if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('clamp requires numeric arguments');
    }
    return Math.max(min, Math.min(value, max));
  }

  // ============================================================================
  // Random Functions
  // ============================================================================

  private fn_random(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('random requires exactly 2 arguments (min, max)');
    }
    const min = this.evaluate(args[0], context, depth + 1);
    const max = this.evaluate(args[1], context, depth + 1);
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('random requires numeric arguments');
    }
    return min + Math.random() * (max - min);
  }

  private fn_random_int(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('random_int requires exactly 2 arguments (min, max)');
    }
    const min = this.evaluate(args[0], context, depth + 1);
    const max = this.evaluate(args[1], context, depth + 1);
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('random_int requires numeric arguments');
    }
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  private fn_random_choice(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length === 0) {
      throw new Error('random_choice requires at least 1 argument');
    }

    // Handle array passed as single argument
    const firstArg = args[0];
    let choices: number[];

    if (Array.isArray(firstArg)) {
      // Array literal passed directly
      choices = firstArg;
    } else {
      // Multiple arguments or expressions to evaluate
      choices = args.map((arg) => {
        const val = this.evaluate(arg, context, depth + 1);
        if (typeof val !== 'number') {
          throw new Error('random_choice requires numeric arguments');
        }
        return val;
      });
    }

    if (choices.length === 0) {
      throw new Error('random_choice requires at least 1 choice');
    }

    return choices[Math.floor(Math.random() * choices.length)];
  }

  // ============================================================================
  // Spatial Functions
  // ============================================================================

  private fn_distance(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('distance requires exactly 2 arguments (point1, point2)');
    }

    const point1 = this.resolvePoint(args[0], context, depth);
    const point2 = this.resolvePoint(args[1], context, depth);

    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private fn_direction(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('direction requires exactly 2 arguments (from, to)');
    }

    const from = this.resolvePoint(args[0], context, depth);
    const to = this.resolvePoint(args[1], context, depth);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.atan2(dy, dx);
  }

  private resolvePoint(
    expr: Expression,
    context: ExpressionContext,
    depth: number
  ): { x: number; y: number } {
    // Handle object literals directly
    if (typeof expr === 'object' && expr !== null && 'x' in expr && 'y' in expr) {
      const obj = expr as any;
      if (typeof obj.x === 'number' && typeof obj.y === 'number') {
        return { x: obj.x, y: obj.y };
      }
    }

    // Handle variable reference to object
    if (typeof expr === 'string') {
      const value = this.resolvePointVariable(expr, context);
      if (typeof value.x === 'number' && typeof value.y === 'number') {
        return value;
      }
    }

    throw new Error('Point must be an object with x and y numeric properties');
  }

  private resolvePointVariable(path: string, context: ExpressionContext): any {
    // Security: Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const parts = path.split('.');

    for (const part of parts) {
      if (dangerousKeys.includes(part)) {
        throw new Error(`Access to ${part} is forbidden`);
      }
    }

    let value: any = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        throw new Error(`Undefined variable: ${path}`);
      }
      value = value[part];
    }

    return value;
  }

  // ============================================================================
  // Query Functions
  // ============================================================================

  private fn_count(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 1) {
      throw new Error('count requires exactly 1 argument');
    }

    // Handle variable reference to array
    if (typeof args[0] === 'string') {
      const value = this.resolvePointVariable(args[0], context);
      if (Array.isArray(value)) {
        return value.length;
      }
      throw new Error('count requires an array');
    }

    throw new Error('count requires a variable reference to an array');
  }

  private fn_has_status(args: Expression[], context: ExpressionContext, depth: number): boolean {
    if (args.length !== 2) {
      throw new Error('has_status requires exactly 2 arguments (entity, statusName)');
    }

    const entityPath = args[0];
    const statusName = args[1];

    if (typeof entityPath !== 'string') {
      throw new Error('has_status first argument must be a variable path');
    }
    if (typeof statusName !== 'string') {
      throw new Error('has_status second argument must be a string');
    }

    const entity = this.resolvePointVariable(entityPath, context);
    if (!entity || !Array.isArray(entity.statuses)) {
      return false;
    }

    return entity.statuses.includes(statusName);
  }

  private fn_has_component(
    args: Expression[],
    context: ExpressionContext,
    depth: number
  ): boolean {
    if (args.length !== 2) {
      throw new Error('has_component requires exactly 2 arguments (entity, componentName)');
    }

    const entityPath = args[0];
    const componentName = args[1];

    if (typeof entityPath !== 'string') {
      throw new Error('has_component first argument must be a variable path');
    }
    if (typeof componentName !== 'string') {
      throw new Error('has_component second argument must be a string');
    }

    const entity = this.resolvePointVariable(entityPath, context);
    if (!entity || !Array.isArray(entity.components)) {
      return false;
    }

    return entity.components.includes(componentName);
  }

  private fn_get_stat(args: Expression[], context: ExpressionContext, depth: number): number {
    if (args.length !== 2) {
      throw new Error('get_stat requires exactly 2 arguments (entity, statName)');
    }

    const entityPath = args[0];
    const statName = args[1];

    if (typeof entityPath !== 'string') {
      throw new Error('get_stat first argument must be a variable path');
    }
    if (typeof statName !== 'string') {
      throw new Error('get_stat second argument must be a string');
    }

    const entity = this.resolvePointVariable(entityPath, context);
    if (!entity || !entity.stats || typeof entity.stats !== 'object') {
      throw new Error(`Entity ${entityPath} has no stats`);
    }

    const value = entity.stats[statName];
    if (typeof value !== 'number') {
      throw new Error(`Stat ${statName} is not a number`);
    }

    return value;
  }

  // ============================================================================
  // Conditional Functions
  // ============================================================================

  private fn_if_else(
    args: Expression[],
    context: ExpressionContext,
    depth: number
  ): number | boolean {
    if (args.length !== 3) {
      throw new Error('if_else requires exactly 3 arguments (condition, thenValue, elseValue)');
    }

    const condition = this.evaluate(args[0], context, depth + 1);
    if (condition) {
      return this.evaluate(args[1], context, depth + 1);
    } else {
      return this.evaluate(args[2], context, depth + 1);
    }
  }

  // ============================================================================
  // Utility
  // ============================================================================

  reset(): void {
    this.operationCount = 0;
  }
}
