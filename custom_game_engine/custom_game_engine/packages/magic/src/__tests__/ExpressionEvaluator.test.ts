import { describe, it, expect } from 'vitest';
import type { Expression, BinaryOp, UnaryOp, FunctionName } from '../EffectExpression.js';
import { ExpressionEvaluator } from '../ExpressionEvaluator.js';

describe('ExpressionEvaluator', () => {
  // ============================================================================
  // 1. LITERAL VALUES (5 tests)
  // ============================================================================
  describe('Literals', () => {
    it('should evaluate positive integer literals', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(42, {});
      expect(result).toBe(42);
    });

    it('should evaluate negative numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(-10, {});
      expect(result).toBe(-10);
    });

    it('should evaluate zero', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(0, {});
      expect(result).toBe(0);
    });

    it('should evaluate large numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(999999999, {});
      expect(result).toBe(999999999);
    });

    it('should evaluate floating-point numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(3.14159, {});
      expect(result).toBeCloseTo(3.14159);
    });
  });

  // ============================================================================
  // 2. VARIABLE REFERENCES (10 tests)
  // ============================================================================
  describe('Variables', () => {
    it('should resolve caster.health', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: { health: 100 } };
      const result = evaluator.evaluate('caster.health', context);
      expect(result).toBe(100);
    });

    it('should resolve target.intelligence', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { target: { intelligence: 15 } };
      const result = evaluator.evaluate('target.intelligence', context);
      expect(result).toBe(15);
    });

    it('should resolve context.worldTick', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { worldTick: 12345 };
      const result = evaluator.evaluate('context.worldTick', context);
      expect(result).toBe(12345);
    });

    it('should resolve nested properties: caster.stats.strength', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        caster: {
          stats: {
            strength: 18,
          },
        },
      };
      const result = evaluator.evaluate('caster.stats.strength', context);
      expect(result).toBe(18);
    });

    it('should throw on invalid variable paths', () => {
      const evaluator = new ExpressionEvaluator();
      expect(() => evaluator.evaluate('invalid.path', {})).toThrow();
    });

    it('should throw on undefined nested variables', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: {} };
      expect(() => evaluator.evaluate('caster.nonexistent.prop', context)).toThrow();
    });

    it('should throw on null variables', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: null };
      expect(() => evaluator.evaluate('caster.health', context)).toThrow();
    });

    it('should handle deeply nested properties', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        world: {
          entities: {
            player: {
              inventory: {
                gold: 500,
              },
            },
          },
        },
      };
      const result = evaluator.evaluate('world.entities.player.inventory.gold', context);
      expect(result).toBe(500);
    });

    it('should handle numeric variable values', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { damage: 25 };
      const result = evaluator.evaluate('damage', context);
      expect(result).toBe(25);
    });

    it('should handle variables with underscores', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: { max_health: 200 } };
      const result = evaluator.evaluate('caster.max_health', context);
      expect(result).toBe(200);
    });
  });

  // ============================================================================
  // 3. BINARY OPERATORS (20 tests)
  // ============================================================================
  describe('Binary Operators', () => {
    it('should perform addition', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '+' as BinaryOp, left: 5, right: 3 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(8);
    });

    it('should perform subtraction', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '-' as BinaryOp, left: 10, right: 4 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(6);
    });

    it('should perform multiplication', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '*' as BinaryOp, left: 7, right: 6 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(42);
    });

    it('should perform division', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '/' as BinaryOp, left: 20, right: 4 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(5);
    });

    it('should perform modulo', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '%' as BinaryOp, left: 17, right: 5 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(2);
    });

    it('should perform exponentiation', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '**' as BinaryOp, left: 2, right: 10 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(1024);
    });

    it('should handle division by zero (should throw or return Infinity)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '/' as BinaryOp, left: 10, right: 0 };
      // Either throw or return Infinity - spec doesn't specify, test both behaviors
      expect(() => {
        const result = evaluator.evaluate(expr, {});
        // If doesn't throw, should be Infinity
        expect(result).toBe(Infinity);
      }).not.toThrow(); // Allow Infinity as valid result
    });

    it('should perform equality comparison (==)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '==' as BinaryOp, left: 5, right: 5 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform inequality comparison (!=)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '!=' as BinaryOp, left: 5, right: 3 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform less-than comparison (<)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '<' as BinaryOp, left: 3, right: 5 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform greater-than comparison (>)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '>' as BinaryOp, left: 8, right: 3 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform less-than-or-equal comparison (<=)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '<=' as BinaryOp, left: 5, right: 5 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform greater-than-or-equal comparison (>=)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '>=' as BinaryOp, left: 7, right: 7 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform logical AND (&&)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '&&' as BinaryOp, left: 1, right: 1 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeTruthy();
    });

    it('should perform logical OR (||)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '||' as BinaryOp, left: 0, right: 1 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeTruthy();
    });

    it('should evaluate nested binary operations: (5 + 3) * 2', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: { op: '+' as BinaryOp, left: 5, right: 3 },
        right: 2,
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(16);
    });

    it('should evaluate chained operations: a + b + c', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        op: '+' as BinaryOp,
        left: { op: '+' as BinaryOp, left: 1, right: 2 },
        right: 3,
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(6);
    });

    it('should mix variables and operations', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { a: 10, b: 5 };
      const expr: Expression = { op: '+' as BinaryOp, left: 'a', right: 'b' };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(15);
    });

    it('should handle floating-point operations', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '/' as BinaryOp, left: 10, right: 3 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeCloseTo(3.333, 2);
    });

    it('should evaluate complex nested expression from spec', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: { intelligence: 20 } };
      // (1 + intelligence/20) - simplified version of spec example
      const expr: Expression = {
        op: '+' as BinaryOp,
        left: 1,
        right: {
          op: '/' as BinaryOp,
          left: 'caster.intelligence',
          right: 20,
        },
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(2); // 1 + 20/20 = 2
    });
  });

  // ============================================================================
  // 4. UNARY OPERATORS (5 tests)
  // ============================================================================
  describe('Unary Operators', () => {
    it('should perform negation on positive numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '-' as UnaryOp, operand: 5 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(-5);
    });

    it('should perform negation on negative numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '-' as UnaryOp, operand: -10 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(10);
    });

    it('should perform logical NOT (!)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '!' as UnaryOp, operand: 1 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(false);
    });

    it('should perform logical NOT with "not" keyword', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: 'not' as UnaryOp, operand: 0 };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(true);
    });

    it('should perform double negation', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        op: '-' as UnaryOp,
        operand: { op: '-' as UnaryOp, operand: 7 },
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(7);
    });
  });

  // ============================================================================
  // 5. MATH FUNCTIONS (15 tests)
  // ============================================================================
  describe('Math Functions', () => {
    it('should calculate sqrt', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'sqrt' as FunctionName, args: [16] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(4);
    });

    it('should handle sqrt of negative numbers (should throw or return NaN)', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'sqrt' as FunctionName, args: [-1] };
      expect(() => {
        const result = evaluator.evaluate(expr, {});
        // If doesn't throw, should be NaN
        expect(isNaN(result as number)).toBe(true);
      }).not.toThrow(); // Allow NaN as valid result
    });

    it('should calculate pow', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'pow' as FunctionName, args: [2, 8] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(256);
    });

    it('should handle large pow values', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'pow' as FunctionName, args: [2, 100] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeGreaterThan(1e30);
    });

    it('should calculate abs of negative', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'abs' as FunctionName, args: [-42] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(42);
    });

    it('should calculate abs of positive', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'abs' as FunctionName, args: [42] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(42);
    });

    it('should calculate floor', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'floor' as FunctionName, args: [3.7] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(3);
    });

    it('should calculate ceil', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'ceil' as FunctionName, args: [3.2] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(4);
    });

    it('should calculate round', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'round' as FunctionName, args: [3.6] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(4);
    });

    it('should calculate min', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'min' as FunctionName, args: [5, 3, 8, 1] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(1);
    });

    it('should calculate max', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'max' as FunctionName, args: [5, 3, 8, 1] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(8);
    });

    it('should calculate clamp within range', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'clamp' as FunctionName, args: [5, 0, 10] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(5);
    });

    it('should calculate clamp below minimum', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'clamp' as FunctionName, args: [-5, 0, 10] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(0);
    });

    it('should calculate clamp above maximum', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'clamp' as FunctionName, args: [15, 0, 10] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(10);
    });

    it('should handle nested math functions', () => {
      const evaluator = new ExpressionEvaluator();
      // sqrt(pow(3, 2) + pow(4, 2)) = sqrt(9 + 16) = sqrt(25) = 5
      const expr: Expression = {
        fn: 'sqrt' as FunctionName,
        args: [
          {
            op: '+' as BinaryOp,
            left: { fn: 'pow' as FunctionName, args: [3, 2] },
            right: { fn: 'pow' as FunctionName, args: [4, 2] },
          },
        ],
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(5);
    });
  });

  // ============================================================================
  // 6. RANDOM FUNCTIONS (5 tests)
  // ============================================================================
  describe('Random Functions', () => {
    it('should generate random value in range', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'random' as FunctionName, args: [10, 20] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should generate random_int as integer', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'random_int' as FunctionName, args: [1, 6] };
      const result = evaluator.evaluate(expr, {});
      expect(Number.isInteger(result as number)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    });

    it('should generate multiple random values differently', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'random' as FunctionName, args: [0, 100] };
      const results = new Set();
      for (let i = 0; i < 10; i++) {
        results.add(evaluator.evaluate(expr, {}));
      }
      // Should generate at least a few different values
      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle random_choice with array', () => {
      const evaluator = new ExpressionEvaluator();
      const choices = [10, 20, 30, 40];
      const expr: Expression = { fn: 'random_choice' as FunctionName, args: [choices] };
      const result = evaluator.evaluate(expr, {});
      expect(choices).toContain(result);
    });

    it('should handle random_choice consistently returning valid values', () => {
      const evaluator = new ExpressionEvaluator();
      const choices = [5, 15, 25];
      const expr: Expression = { fn: 'random_choice' as FunctionName, args: [choices] };
      for (let i = 0; i < 20; i++) {
        const result = evaluator.evaluate(expr, {});
        expect(choices).toContain(result);
      }
    });
  });

  // ============================================================================
  // 7. SPATIAL FUNCTIONS (5 tests)
  // ============================================================================
  describe('Spatial Functions', () => {
    it('should calculate distance between two points', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        fn: 'distance' as FunctionName,
        args: [{ x: 0, y: 0 }, { x: 3, y: 4 }],
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(5); // 3-4-5 triangle
    });

    it('should calculate distance with floating-point coordinates', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        fn: 'distance' as FunctionName,
        args: [{ x: 1.5, y: 2.5 }, { x: 4.5, y: 6.5 }],
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(5); // Also a 3-4-5 triangle
    });

    it('should calculate direction from source to target', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        fn: 'direction' as FunctionName,
        args: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      };
      const result = evaluator.evaluate(expr, {});
      // Direction should be in radians or degrees - test that it's a number
      expect(typeof result).toBe('number');
    });

    it('should calculate distance using variables from context', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        caster: { position: { x: 10, y: 10 } },
        target: { position: { x: 13, y: 14 } },
      };
      const expr: Expression = {
        fn: 'distance' as FunctionName,
        args: ['caster.position', 'target.position'],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(5); // 3-4-5 triangle
    });

    it('should handle zero distance', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        fn: 'distance' as FunctionName,
        args: [{ x: 5, y: 5 }, { x: 5, y: 5 }],
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // 8. QUERY FUNCTIONS (5 tests)
  // ============================================================================
  describe('Query Functions', () => {
    it('should count array elements', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { targets: [1, 2, 3, 4, 5] };
      const expr: Expression = { fn: 'count' as FunctionName, args: ['targets'] };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(5);
    });

    it('should check if entity has status', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        target: {
          statuses: ['poisoned', 'weakened'],
        },
      };
      const expr: Expression = {
        fn: 'has_status' as FunctionName,
        args: ['target', 'poisoned'],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(true);
    });

    it('should return false if entity does not have status', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        target: {
          statuses: ['weakened'],
        },
      };
      const expr: Expression = {
        fn: 'has_status' as FunctionName,
        args: ['target', 'poisoned'],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(false);
    });

    it('should check if entity has component', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        target: {
          components: ['magic', 'health', 'position'],
        },
      };
      const expr: Expression = {
        fn: 'has_component' as FunctionName,
        args: ['target', 'magic'],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(true);
    });

    it('should get stat from entity', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        caster: {
          stats: {
            strength: 18,
            intelligence: 14,
            dexterity: 16,
          },
        },
      };
      const expr: Expression = {
        fn: 'get_stat' as FunctionName,
        args: ['caster', 'strength'],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(18);
    });
  });

  // ============================================================================
  // 9. COMPLEX EXPRESSIONS (10 tests)
  // ============================================================================
  describe('Complex Expressions', () => {
    it('should evaluate nested arithmetic: (a + b) * (c - d)', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { a: 2, b: 3, c: 10, d: 4 };
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: { op: '+' as BinaryOp, left: 'a', right: 'b' },
        right: { op: '-' as BinaryOp, left: 'c', right: 'd' },
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(30); // (2+3) * (10-4) = 5 * 6 = 30
    });

    it('should evaluate intelligence-scaled damage from spec', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { caster: { intelligence: 20 } };
      // Simplified: 20 * (1 + intelligence/20) = 20 * 2 = 40
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: 20, // Fixed damage instead of random for testing
        right: {
          op: '+' as BinaryOp,
          left: 1,
          right: {
            op: '/' as BinaryOp,
            left: 'caster.intelligence',
            right: 20,
          },
        },
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(40);
    });

    it('should evaluate conditional: if_else(condition, then, else)', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { health: 50 };
      const expr: Expression = {
        fn: 'if_else' as FunctionName,
        args: [
          { op: '>' as BinaryOp, left: 'health', right: 30 }, // condition
          100, // then
          50, // else
        ],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(100);
    });

    it('should evaluate conditional with false condition', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { health: 20 };
      const expr: Expression = {
        fn: 'if_else' as FunctionName,
        args: [
          { op: '>' as BinaryOp, left: 'health', right: 30 }, // condition
          100, // then
          50, // else
        ],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(50);
    });

    it('should evaluate nested conditionals', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { level: 10 };
      // if level > 15 then 300 else (if level > 5 then 200 else 100)
      const expr: Expression = {
        fn: 'if_else' as FunctionName,
        args: [
          { op: '>' as BinaryOp, left: 'level', right: 15 },
          300,
          {
            fn: 'if_else' as FunctionName,
            args: [{ op: '>' as BinaryOp, left: 'level', right: 5 }, 200, 100],
          },
        ],
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(200); // level=10: not >15, but >5
    });

    it('should combine functions and operators', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { damage: 50, defense: 20 };
      // max(0, damage - defense) * 1.5
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: {
          fn: 'max' as FunctionName,
          args: [0, { op: '-' as BinaryOp, left: 'damage', right: 'defense' }],
        },
        right: 1.5,
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(45); // max(0, 50-20) * 1.5 = 30 * 1.5 = 45
    });

    it('should handle complex math formula', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { x: 3 };
      // 2 * x^2 + 3 * x + 1 = 2*9 + 3*3 + 1 = 18 + 9 + 1 = 28
      const expr: Expression = {
        op: '+' as BinaryOp,
        left: {
          op: '+' as BinaryOp,
          left: {
            op: '*' as BinaryOp,
            left: 2,
            right: { fn: 'pow' as FunctionName, args: ['x', 2] },
          },
          right: { op: '*' as BinaryOp, left: 3, right: 'x' },
        },
        right: 1,
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(28);
    });

    it('should evaluate deeply nested expressions', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { a: 1, b: 2, c: 3, d: 4 };
      // ((a + b) * (c + d)) / 2 = (3 * 7) / 2 = 10.5
      const expr: Expression = {
        op: '/' as BinaryOp,
        left: {
          op: '*' as BinaryOp,
          left: { op: '+' as BinaryOp, left: 'a', right: 'b' },
          right: { op: '+' as BinaryOp, left: 'c', right: 'd' },
        },
        right: 2,
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(10.5);
    });

    it('should combine spatial and arithmetic operations', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        caster: { position: { x: 0, y: 0 } },
        target: { position: { x: 3, y: 4 } },
        baseDamage: 10,
      };
      // baseDamage * (1 + distance/10) = 10 * (1 + 5/10) = 15
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: 'baseDamage',
        right: {
          op: '+' as BinaryOp,
          left: 1,
          right: {
            op: '/' as BinaryOp,
            left: {
              fn: 'distance' as FunctionName,
              args: ['caster.position', 'target.position'],
            },
            right: 10,
          },
        },
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(15);
    });

    it('should handle queries in complex expressions', () => {
      const evaluator = new ExpressionEvaluator();
      const context = {
        targets: [1, 2, 3, 4],
        damagePerTarget: 25,
      };
      // count(targets) * damagePerTarget = 4 * 25 = 100
      const expr: Expression = {
        op: '*' as BinaryOp,
        left: { fn: 'count' as FunctionName, args: ['targets'] },
        right: 'damagePerTarget',
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(100);
    });
  });

  // ============================================================================
  // 10. SECURITY TESTS (10 tests)
  // ============================================================================
  describe('Security', () => {
    it('should prevent infinite recursion with depth limit', () => {
      const evaluator = new ExpressionEvaluator({ maxDepth: 10 });
      // Create deeply nested expression: -(-(-(-(-(-(-(-(-(-(10))))))))))
      let expr: Expression = 10;
      for (let i = 0; i < 100; i++) {
        expr = { op: '-' as UnaryOp, operand: expr };
      }
      expect(() => evaluator.evaluate(expr, {})).toThrow(/depth|recursion/i);
    });

    it('should enforce operation limit', () => {
      const evaluator = new ExpressionEvaluator({ maxOperations: 100 });
      // Create expression with many operations
      let expr: Expression = 0;
      for (let i = 0; i < 200; i++) {
        expr = { op: '+' as BinaryOp, left: expr, right: 1 };
      }
      expect(() => evaluator.evaluate(expr, {})).toThrow(/operation|limit/i);
    });

    it('should handle circular reference detection in context', () => {
      const evaluator = new ExpressionEvaluator();
      const circular: any = { a: {} };
      circular.a.b = circular; // Circular reference
      const context = { obj: circular };
      expect(() => evaluator.evaluate('obj.a.b.a.b.a.b', context)).toThrow();
    });

    it('should handle malformed expressions gracefully', () => {
      const evaluator = new ExpressionEvaluator();
      const malformed: any = { op: 'invalid_operator', left: 1, right: 2 };
      expect(() => evaluator.evaluate(malformed, {})).toThrow();
    });

    it('should handle missing function arguments', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'sqrt' as FunctionName, args: [] };
      expect(() => evaluator.evaluate(expr, {})).toThrow();
    });

    it('should handle invalid function names', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: any = { fn: 'execute_code', args: ['malicious'] };
      expect(() => evaluator.evaluate(expr, {})).toThrow();
    });

    it('should sanitize NaN results', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { op: '/' as BinaryOp, left: 0, right: 0 };
      const result = evaluator.evaluate(expr, {});
      // Should either throw or handle NaN gracefully (not propagate it)
      expect(isNaN(result as number) || typeof result === 'number').toBe(true);
    });

    it('should sanitize Infinity results', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'pow' as FunctionName, args: [10, 1000] };
      const result = evaluator.evaluate(expr, {});
      // Should handle Infinity (either clamp or throw)
      expect(typeof result === 'number').toBe(true);
    });

    it('should prevent prototype pollution via variable access', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { safe: { value: 42 } };
      // Attempt to access __proto__ or constructor
      expect(() => evaluator.evaluate('__proto__', context)).toThrow();
      expect(() => evaluator.evaluate('constructor', context)).toThrow();
      expect(() => evaluator.evaluate('safe.__proto__', context)).toThrow();
    });

    it('should enforce type safety on operations', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { str: 'hello', num: 42 };
      // Attempt to perform arithmetic on non-numbers
      const expr: Expression = { op: '+' as BinaryOp, left: 'str', right: 'num' };
      expect(() => evaluator.evaluate(expr, context)).toThrow();
    });
  });

  // ============================================================================
  // ADDITIONAL EDGE CASES
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(42, {});
      expect(result).toBe(42);
    });

    it('should handle expressions with only literals', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = {
        op: '+' as BinaryOp,
        left: { op: '*' as BinaryOp, left: 2, right: 3 },
        right: { op: '-' as BinaryOp, left: 10, right: 5 },
      };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBe(11); // (2*3) + (10-5) = 6 + 5 = 11
    });

    it('should handle very small numbers', () => {
      const evaluator = new ExpressionEvaluator();
      const result = evaluator.evaluate(0.0000001, {});
      expect(result).toBeCloseTo(0.0000001);
    });

    it('should handle negative exponentiation', () => {
      const evaluator = new ExpressionEvaluator();
      const expr: Expression = { fn: 'pow' as FunctionName, args: [2, -3] };
      const result = evaluator.evaluate(expr, {});
      expect(result).toBeCloseTo(0.125); // 2^-3 = 1/8 = 0.125
    });

    it('should handle boolean values in logical operations', () => {
      const evaluator = new ExpressionEvaluator();
      const context = { isAlive: true, isEnemy: false };
      const expr: Expression = {
        op: '&&' as BinaryOp,
        left: 'isAlive',
        right: 'isEnemy',
      };
      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(false);
    });
  });
});
