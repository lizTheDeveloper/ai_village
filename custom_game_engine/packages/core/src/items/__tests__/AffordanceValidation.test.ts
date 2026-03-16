import { describe, it, expect } from 'vitest';
import { ItemRegistry } from '../ItemRegistry.js';
import { defineItem } from '../ItemDefinition.js';
import { AffordanceNetwork } from '../AffordanceNetwork.js';
import { validateAffordanceNetwork, formatValidationReport } from '../AffordanceValidation.js';

// ─── Fixture registry with diverse item categories ─────────────────────────

function makeRichRegistry(): ItemRegistry {
  const r = new ItemRegistry();

  // food
  r.register(defineItem('berry',  'Berry',  'food', { isEdible: true, isGatherable: true, weight: 0.1, stackSize: 100, baseValue: 1, rarity: 'common', traits: { edible: { hungerRestored: 20, quality: 40, flavors: ['sweet'], hydrating: true } } }));
  r.register(defineItem('bread',  'Bread',  'food', { isEdible: true, isStorable: true,   weight: 0.5, stackSize: 50,  baseValue: 5, rarity: 'common', traits: { edible: { hungerRestored: 50, quality: 70, flavors: ['savory'], hydrating: false } } }));
  r.register(defineItem('mushroom', 'Mushroom', 'food', { isEdible: true, isGatherable: true, weight: 0.2, stackSize: 50, baseValue: 3, rarity: 'common', traits: { edible: { hungerRestored: 30, quality: 55, flavors: ['earthy'], hydrating: false } } }));

  // tool
  r.register(defineItem('axe',     'Axe',     'tool', { isStorable: true, weight: 3.0, stackSize: 1, baseValue: 15, rarity: 'common',   traits: { tool: { toolType: 'axe',     efficiency: 1.5, durabilityLoss: 0.02 } } }));
  r.register(defineItem('pickaxe', 'Pickaxe', 'tool', { isStorable: true, weight: 4.0, stackSize: 1, baseValue: 20, rarity: 'common',   traits: { tool: { toolType: 'pickaxe', efficiency: 1.5, durabilityLoss: 0.02 } } }));
  r.register(defineItem('hammer',  'Hammer',  'tool', { isStorable: true, weight: 2.0, stackSize: 1, baseValue: 12, rarity: 'common',   traits: { tool: { toolType: 'hammer',  efficiency: 1.2, durabilityLoss: 0.01 } } }));

  // material / resource
  r.register(defineItem('wood',  'Wood',  'material', { isStorable: true, isGatherable: true, weight: 2.0, stackSize: 50, baseValue: 2, rarity: 'common', traits: { material: { isLiving: false, isEdible: false, isTransient: false, isSolid: true } } }));
  r.register(defineItem('stone', 'Stone', 'material', { isStorable: true, isGatherable: true, weight: 5.0, stackSize: 50, baseValue: 1, rarity: 'common', traits: { material: { isLiving: false, isEdible: false, isTransient: false, isSolid: true } } }));
  r.register(defineItem('iron',  'Iron',  'resource', { isStorable: true, isGatherable: true, weight: 3.0, stackSize: 50, baseValue: 8, rarity: 'uncommon', traits: { material: { isLiving: false, isEdible: false, isTransient: false, isSolid: true } } }));

  // equipment
  r.register(defineItem('iron_sword', 'Iron Sword', 'equipment', { isStorable: true, weight: 4.0, stackSize: 1, baseValue: 50, rarity: 'uncommon', traits: { weapon: { damage: 25, damageType: 'slashing', range: 1, attackSpeed: 1.2, durabilityLoss: 0.01, twoHanded: false, category: 'sword', attackType: 'melee' } } }));

  return r;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('validateAffordanceNetwork', () => {
  it('returns a report with the correct item count', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    expect(report.itemCount).toBe(registry.size);
  });

  it('category rankings are sorted descending by mean score', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    for (let i = 1; i < report.categoryRankings.length; i++) {
      expect(report.categoryRankings[i]!.meanScore).toBeLessThanOrEqual(
        report.categoryRankings[i - 1]!.meanScore,
      );
    }
  });

  it('novel combinations are sorted descending by score', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    for (let i = 1; i < report.novelCombinations.length; i++) {
      expect(report.novelCombinations[i]!.score).toBeLessThanOrEqual(
        report.novelCombinations[i - 1]!.score,
      );
    }
  });

  it('novel combinations respect the known-recipe filter', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    // Artificially mark axe+wood as a known recipe
    const knownRecipes = new Set(['axe::wood', 'wood::axe']);
    const report = validateAffordanceNetwork(network, registry, knownRecipes);
    for (const nc of report.novelCombinations) {
      const key1 = `${nc.itemIdA}::${nc.itemIdB}`;
      const key2 = `${nc.itemIdB}::${nc.itemIdA}`;
      expect(knownRecipes.has(key1) || knownRecipes.has(key2)).toBe(false);
    }
  });

  it('learning convergence passes after targeted training', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    // After 60 steps on the convergence pair, score should have improved
    expect(report.learningConvergence.passed).toBe(true);
  });

  it('overall passed = coherence AND convergence', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    expect(report.passed).toBe(report.semanticCoherence.passed && report.learningConvergence.passed);
  });
});

describe('formatValidationReport', () => {
  it('includes status header', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    const text     = formatValidationReport(report);
    expect(text).toMatch(/=== Affordance Network Validation Report ===/);
    expect(text).toMatch(/Status:/);
  });

  it('includes category rankings section', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    const text     = formatValidationReport(report);
    expect(text).toMatch(/Category Pair Rankings/);
  });

  it('includes novel combinations section', () => {
    const registry = makeRichRegistry();
    const network  = new AffordanceNetwork(registry);
    const report   = validateAffordanceNetwork(network, registry);
    const text     = formatValidationReport(report);
    expect(text).toMatch(/Novel Combination Candidates/);
  });
});
