/**
 * Example: Using Magic Source Generator
 *
 * This example demonstrates how to use the magic source generation system
 * to create resource pools for different magical paradigms.
 */

import {
  generateAcademicSource,
  generateDivineSource,
  generateBreathSource,
  spendFromPool,
  regeneratePool,
} from './MagicSourceGenerator.js';

// ============================================================================
// Example 1: Creating a Mage with a Mana Pool
// ============================================================================

function createMageWithMana(level: number) {
  // Generate academic mana source
  const { pool } = generateAcademicSource(level);

  return { pool: pool! };
}

// ============================================================================
// Example 2: Casting Spells and Managing Resources
// ============================================================================

function castSpellsExample() {
  const mage = createMageWithMana(5);


  // Cast a fireball (costs 30 mana)
  const fireball = spendFromPool(mage.pool, 30);
  if (fireball.success) {
  }

  // Cast lightning bolt (costs 40 mana)
  const lightning = spendFromPool(mage.pool, 40);
  if (lightning.success) {
  }

  // Try to cast meteor (costs 100 mana)
  const meteor = spendFromPool(mage.pool, 100);
  if (!meteor.success) {
  }

}

// ============================================================================
// Example 3: Regeneration Over Time
// ============================================================================

function regenerationExample() {
  const mage = createMageWithMana(3);


  // Spend most of the mana
  spendFromPool(mage.pool, mage.pool.maximum * 0.8);

  // Simulate 10 seconds of regeneration
  let totalRegen = 0;
  for (let i = 0; i < 10; i++) {
    const regen = regeneratePool(mage.pool, 1.0);
    totalRegen += regen;
  }

}

// ============================================================================
// Example 4: Divine Favor (Prayer-Based Regeneration)
// ============================================================================

function divineExample() {
  const { pool } = generateDivineSource(3);

  // Cast a miracle (costs 50 favor)
  spendFromPool(pool!, 50);

  // Try to regenerate without praying (won't work)
  regeneratePool(pool!, 10.0);

  // Regenerate while praying (works)
  regeneratePool(pool!, 10.0, { isPraying: true });
}

// ============================================================================
// Example 5: Breath Economy (Slow Regeneration, Transfer)
// ============================================================================

function breathExample() {
  const { pool } = generateBreathSource(1);

  // Awaken an object (costs 20 Breath)
  spendFromPool(pool!, 20);

  // Simulate receiving Breath from another person (transfer)
  // In real implementation, this would come from another entity's pool
  pool!.current += 50;
  pool!.current = Math.min(pool!.current, pool!.maximum);
}

// ============================================================================
// Example 6: Multi-Paradigm Character
// ============================================================================

function multiParadigmExample() {

  // A character who knows both academic magic and divine magic
  const academic = generateAcademicSource(5);
  const divine = generateDivineSource(5);


  // Cast academic spell
  spendFromPool(academic.pool!, 30);

  // Cast divine miracle
  spendFromPool(divine.pool!, 40);

  // Different regeneration for each
  regeneratePool(academic.pool!, 10.0); // Auto-regens
  regeneratePool(divine.pool!, 10.0, { isPraying: true }); // Needs prayer

}

// ============================================================================
// Example 7: Leveling Up and Pool Growth
// ============================================================================

function levelingExample() {
  // Create level 1 mage
  generateAcademicSource(1);

  // Create level 5 mage
  generateAcademicSource(5);

  // Create level 10 mage
  generateAcademicSource(10);
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  castSpellsExample();
  regenerationExample();
  divineExample();
  breathExample();
  multiParadigmExample();
  levelingExample();
}

// Uncomment to run examples:
// runAllExamples();
