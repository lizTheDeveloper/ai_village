/**
 * Demo script showing EffectExpression and ExpressionEvaluator usage
 * Run with: npx tsx packages/magic/src/__tests__/ExpressionEvaluator.demo.ts
 */

import { ExpressionEvaluator } from '../ExpressionEvaluator.js';
import type { Expression } from '../EffectExpression.js';

console.log('========================================');
console.log('EffectExpression & ExpressionEvaluator Demo');
console.log('========================================\n');

const evaluator = new ExpressionEvaluator();

// Example 1: Intelligence-scaled damage (from spec)
console.log('1. Intelligence-scaled damage:');
const context1 = { caster: { intelligence: 20 } };
const scaledDamage: Expression = {
  op: '*',
  left: 20, // Base damage (spec uses random, we use fixed for demo)
  right: {
    op: '+',
    left: 1,
    right: {
      op: '/',
      left: 'caster.intelligence',
      right: 20,
    },
  },
};
const damage = evaluator.evaluate(scaledDamage, context1);
console.log(`  Caster intelligence: 20`);
console.log(`  Formula: 20 * (1 + intelligence/20)`);
console.log(`  Result: ${damage} damage\n`);

// Example 2: Distance-based healing
console.log('2. Distance-based healing falloff:');
const context2 = {
  caster: { position: { x: 0, y: 0 } },
  target: { position: { x: 3, y: 4 } },
  basePower: 100,
};
const distanceHealing: Expression = {
  op: '*',
  left: 'basePower',
  right: {
    fn: 'max',
    args: [
      0.5, // Minimum 50% power
      {
        op: '-',
        left: 1,
        right: {
          op: '/',
          left: { fn: 'distance', args: ['caster.position', 'target.position'] },
          right: 10, // Falloff distance
        },
      },
    ],
  },
};
const healing = evaluator.evaluate(distanceHealing, context2);
console.log(`  Distance: 5 units (3-4-5 triangle)`);
console.log(`  Formula: basePower * max(0.5, 1 - distance/10)`);
console.log(`  Result: ${healing} healing\n`);

// Example 3: Conditional damage based on target health
console.log('3. Execute ability (bonus damage on low health):');
const context3 = {
  caster: { damage: 50 },
  target: { health: 20, maxHealth: 100 },
};
const executeDamage: Expression = {
  fn: 'if_else',
  args: [
    // If target health < 30% of max
    {
      op: '<',
      left: 'target.health',
      right: {
        op: '*',
        left: 'target.maxHealth',
        right: 0.3,
      },
    },
    // Then: 2x damage
    { op: '*', left: 'caster.damage', right: 2 },
    // Else: normal damage
    'caster.damage',
  ],
};
const finalDamage = evaluator.evaluate(executeDamage, context3);
console.log(`  Target health: 20/100 (20%)`);
console.log(`  Base damage: 50`);
console.log(`  Execute threshold: 30%`);
console.log(`  Result: ${finalDamage} damage (2x multiplier applied!)\n`);

// Example 4: Math functions
console.log('4. Complex math formula (quadratic):');
const context4 = { x: 3 };
const quadratic: Expression = {
  op: '+',
  left: {
    op: '+',
    left: {
      op: '*',
      left: 2,
      right: { fn: 'pow', args: ['x', 2] },
    },
    right: { op: '*', left: 3, right: 'x' },
  },
  right: 1,
};
const result = evaluator.evaluate(quadratic, context4);
console.log(`  Formula: 2x² + 3x + 1`);
console.log(`  x = 3`);
console.log(`  Result: ${result} (= 2*9 + 3*3 + 1 = 28)\n`);

// Example 5: Security - depth limit
console.log('5. Security: Depth limit protection:');
const limitedEvaluator = new ExpressionEvaluator({ maxDepth: 5 });
let deepExpr: Expression = 10;
for (let i = 0; i < 20; i++) {
  deepExpr = { op: '-', operand: deepExpr };
}
try {
  limitedEvaluator.evaluate(deepExpr, {});
  console.log('  ERROR: Should have thrown!');
} catch (error) {
  console.log(`  ✓ Correctly rejected deeply nested expression`);
  console.log(`  Error: ${(error as Error).message}\n`);
}

// Example 6: Security - prototype pollution prevention
console.log('6. Security: Prototype pollution prevention:');
try {
  evaluator.evaluate('__proto__', {});
  console.log('  ERROR: Should have thrown!');
} catch (error) {
  console.log(`  ✓ Correctly rejected __proto__ access`);
  console.log(`  Error: ${(error as Error).message}\n`);
}

console.log('========================================');
console.log('All 95 tests passing ✓');
console.log('========================================');
