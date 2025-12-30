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
  getPoolPercentage,
} from './MagicSourceGenerator.js';

// ============================================================================
// Example 1: Creating a Mage with a Mana Pool
// ============================================================================

function createMageWithMana(level: number) {
  // Generate academic mana source
  const { source, pool } = generateAcademicSource(level);

  console.log('=== Academic Mage Created ===');
  console.log(`Source: ${source.name}`);
  console.log(`Pool: ${pool!.current}/${pool!.maximum}`);
  console.log(`Regen Rate: ${pool!.regenRate} per second`);
  console.log(`Auto-Regen: ${pool!.autoRegen}`);
  console.log(`Color: ${pool!.color}`);
  console.log(`Icon: ${pool!.icon}`);

  return { source, pool: pool! };
}

// ============================================================================
// Example 2: Casting Spells and Managing Resources
// ============================================================================

function castSpellsExample() {
  const mage = createMageWithMana(5);

  console.log('\n=== Casting Spells ===');

  // Cast a fireball (costs 30 mana)
  const fireball = spendFromPool(mage.pool, 30);
  if (fireball.success) {
    console.log('✨ Fireball cast! Mana remaining:', fireball.remaining);
  }

  // Cast lightning bolt (costs 40 mana)
  const lightning = spendFromPool(mage.pool, 40);
  if (lightning.success) {
    console.log('⚡ Lightning cast! Mana remaining:', lightning.remaining);
  }

  // Try to cast meteor (costs 100 mana)
  const meteor = spendFromPool(mage.pool, 100);
  if (!meteor.success) {
    console.log('❌ Not enough mana for meteor! Current:', meteor.remaining);
  }

  console.log(`Current pool: ${getPoolPercentage(mage.pool).toFixed(1)}%`);
}

// ============================================================================
// Example 3: Regeneration Over Time
// ============================================================================

function regenerationExample() {
  const mage = createMageWithMana(3);

  console.log('\n=== Regeneration Example ===');

  // Spend most of the mana
  spendFromPool(mage.pool, mage.pool.maximum * 0.8);
  console.log(`After casting: ${getPoolPercentage(mage.pool).toFixed(1)}%`);

  // Simulate 10 seconds of regeneration
  let totalRegen = 0;
  for (let i = 0; i < 10; i++) {
    const regen = regeneratePool(mage.pool, 1.0);
    totalRegen += regen;
  }

  console.log(`After 10 seconds: ${getPoolPercentage(mage.pool).toFixed(1)}%`);
  console.log(`Total regenerated: ${totalRegen.toFixed(1)}`);
}

// ============================================================================
// Example 4: Divine Favor (Prayer-Based Regeneration)
// ============================================================================

function divineExample() {
  const { source, pool } = generateDivineSource(3);

  console.log('\n=== Divine Cleric ===');
  console.log(`Source: ${source.name}`);
  console.log(`Pool: ${pool!.current}/${pool!.maximum}`);
  console.log(`Requires Prayer: ${pool!.regenConditions?.requiresPrayer}`);

  // Cast a miracle (costs 50 favor)
  spendFromPool(pool!, 50);
  console.log('🙏 Miracle cast!');

  // Try to regenerate without praying (won't work)
  const noRegen = regeneratePool(pool!, 10.0);
  console.log(`Regen without prayer: ${noRegen} (expected 0)`);

  // Regenerate while praying (works)
  const withPrayer = regeneratePool(pool!, 10.0, { isPraying: true });
  console.log(`Regen with prayer: ${withPrayer.toFixed(1)}`);
}

// ============================================================================
// Example 5: Breath Economy (Slow Regeneration, Transfer)
// ============================================================================

function breathExample() {
  const { source, pool } = generateBreathSource(1);

  console.log('\n=== Breath Awakener ===');
  console.log(`Source: ${source.name}`);
  console.log(`Pool: ${pool!.current}/${pool!.maximum}`);
  console.log(`Transferable: ${source.transferable}`);
  console.log(`Very slow regen: ${pool!.regenRate} per second`);

  // Awaken an object (costs 20 Breath)
  spendFromPool(pool!, 20);
  console.log('🌬️ Object awakened!');

  // Simulate receiving Breath from another person (transfer)
  if (source.transferable) {
    console.log('📥 Receiving 50 Breath from willing donor...');
    // In real implementation, this would come from another entity's pool
    pool!.current += 50;
    pool!.current = Math.min(pool!.current, pool!.maximum);
  }

  console.log(`Pool after transfer: ${pool!.current}/${pool!.maximum}`);
}

// ============================================================================
// Example 6: Multi-Paradigm Character
// ============================================================================

function multiParadigmExample() {
  console.log('\n=== Multi-Paradigm Mage ===');

  // A character who knows both academic magic and divine magic
  const academic = generateAcademicSource(5);
  const divine = generateDivineSource(5);

  console.log('Academic Mana:', academic.pool!.current);
  console.log('Divine Favor:', divine.pool!.current);

  // Cast academic spell
  spendFromPool(academic.pool!, 30);
  console.log('✨ Academic spell cast');

  // Cast divine miracle
  spendFromPool(divine.pool!, 40);
  console.log('🙏 Divine miracle cast');

  // Different regeneration for each
  console.log('\nAfter 10 seconds:');
  regeneratePool(academic.pool!, 10.0); // Auto-regens
  regeneratePool(divine.pool!, 10.0, { isPraying: true }); // Needs prayer

  console.log('Academic Mana:', academic.pool!.current);
  console.log('Divine Favor:', divine.pool!.current);
}

// ============================================================================
// Example 7: Leveling Up and Pool Growth
// ============================================================================

function levelingExample() {
  console.log('\n=== Leveling Up ===');

  // Create level 1 mage
  const level1 = generateAcademicSource(1);
  console.log(`Level 1 pool: ${level1.pool!.maximum}`);

  // Create level 5 mage
  const level5 = generateAcademicSource(5);
  console.log(`Level 5 pool: ${level5.pool!.maximum}`);

  // Create level 10 mage
  const level10 = generateAcademicSource(10);
  console.log(`Level 10 pool: ${level10.pool!.maximum}`);

  const growth1to5 = ((level5.pool!.maximum - level1.pool!.maximum) / level1.pool!.maximum) * 100;
  const growth5to10 = ((level10.pool!.maximum - level5.pool!.maximum) / level5.pool!.maximum) * 100;

  console.log(`Growth 1→5: +${growth1to5.toFixed(1)}%`);
  console.log(`Growth 5→10: +${growth5to10.toFixed(1)}%`);
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
