/**
 * MagicCostSystem.test.ts - Tests for the magic cost calculation system
 *
 * Tests cover:
 * - Each paradigm calculator
 * - Cost deduction and terminal effects
 * - Cost recovery systems
 * - Divine casting with witness belief mechanics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  costCalculatorRegistry,
  costRecoveryManager,
  registerAllCostCalculators,
  createDefaultContext,
  type CastingContext,
  type SpellCost,
} from '../magic/costs/index.js';
import { AcademicCostCalculator } from '../magic/costs/calculators/AcademicCostCalculator.js';
import { PactCostCalculator } from '../magic/costs/calculators/PactCostCalculator.js';
import { NameCostCalculator } from '../magic/costs/calculators/NameCostCalculator.js';
import { BreathCostCalculator } from '../magic/costs/calculators/BreathCostCalculator.js';
import { DivineCostCalculator } from '../magic/costs/calculators/DivineCostCalculator.js';
import { BloodCostCalculator } from '../magic/costs/calculators/BloodCostCalculator.js';
import { EmotionalCostCalculator } from '../magic/costs/calculators/EmotionalCostCalculator.js';
import {
  DivineCastingCalculator,
  createDivineCastingContext,
} from '../magic/costs/calculators/DivineCastingCalculator.js';
import {
  createMagicComponent,
  createMagicUserComponent,
  type ComposedSpell,
  type MagicComponent,
} from '../components/MagicComponent.js';
import { ACADEMIC_PARADIGM, BLOOD_PARADIGM, PACT_PARADIGM } from '../magic/CoreParadigms.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestSpell(overrides: Partial<ComposedSpell> = {}): ComposedSpell {
  return {
    id: 'test_spell',
    name: 'Test Spell',
    technique: 'create',
    form: 'fire',
    source: 'arcane',
    manaCost: 20,
    castTime: 10,
    range: 10,
    effectId: 'test_effect',
    ...overrides,
  };
}

function createTestCaster(paradigmId: string = 'academic'): MagicComponent {
  const caster = createMagicUserComponent('arcane', 100, paradigmId);
  return caster;
}

function createTestContext(overrides: Partial<CastingContext> = {}): CastingContext {
  return {
    ...createDefaultContext(1000),
    ...overrides,
  };
}

// ============================================================================
// Registry Tests
// ============================================================================

describe('CostCalculatorRegistry', () => {
  beforeEach(() => {
    costCalculatorRegistry.clear();
  });

  afterEach(() => {
    costCalculatorRegistry.clear();
  });

  it('should register calculators', () => {
    const calculator = new AcademicCostCalculator();
    costCalculatorRegistry.register(calculator);
    expect(costCalculatorRegistry.has('academic')).toBe(true);
  });

  it('should throw on duplicate registration', () => {
    const calculator = new AcademicCostCalculator();
    costCalculatorRegistry.register(calculator);
    expect(() => costCalculatorRegistry.register(calculator)).toThrow();
  });

  it('should allow registerOrReplace', () => {
    const calculator1 = new AcademicCostCalculator();
    const calculator2 = new AcademicCostCalculator();
    costCalculatorRegistry.register(calculator1);
    costCalculatorRegistry.registerOrReplace(calculator2);
    expect(costCalculatorRegistry.has('academic')).toBe(true);
  });

  it('should get registered calculator', () => {
    registerAllCostCalculators();
    const calculator = costCalculatorRegistry.get('academic');
    expect(calculator).toBeInstanceOf(AcademicCostCalculator);
  });

  it('should throw for unknown paradigm', () => {
    expect(() => costCalculatorRegistry.get('unknown')).toThrow();
  });

  it('should list registered paradigms', () => {
    registerAllCostCalculators();
    const paradigms = costCalculatorRegistry.getRegisteredParadigms();
    expect(paradigms).toContain('academic');
    expect(paradigms).toContain('pact');
    expect(paradigms).toContain('divine_casting');
  });
});

// ============================================================================
// Academic Paradigm Tests
// ============================================================================

describe('AcademicCostCalculator', () => {
  let calculator: AcademicCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new AcademicCostCalculator();
    caster = createTestCaster('academic');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate mana and stamina costs', () => {
    const spell = createTestSpell({ manaCost: 20, castTime: 10 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    expect(costs).toHaveLength(2);

    const manaCost = costs.find(c => c.type === 'mana');
    const staminaCost = costs.find(c => c.type === 'stamina');

    expect(manaCost).toBeDefined();
    expect(manaCost!.amount).toBe(20);

    expect(staminaCost).toBeDefined();
    expect(staminaCost!.amount).toBeGreaterThan(0);
  });

  it('should reduce mana cost near ley lines', () => {
    const spell = createTestSpell({ manaCost: 100 });
    const context = createTestContext({ ambientPower: 3 }); // 30% reduction

    const costs = calculator.calculateCosts(spell, caster, context);
    const manaCost = costs.find(c => c.type === 'mana')!;

    expect(manaCost.amount).toBe(70); // 30% reduction
  });

  it('should split mana cost for group casting', () => {
    const spell = createTestSpell({ manaCost: 100 });
    const context = createTestContext({ isGroupCast: true, casterCount: 4 });

    const costs = calculator.calculateCosts(spell, caster, context);
    const manaCost = costs.find(c => c.type === 'mana')!;

    expect(manaCost.amount).toBe(25); // Split 4 ways
  });

  it('should initialize resource pools correctly', () => {
    expect(caster.resourcePools.mana).toBeDefined();
    expect(caster.resourcePools.mana!.current).toBe(100);
    expect(caster.resourcePools.mana!.maximum).toBe(100);

    expect(caster.resourcePools.stamina).toBeDefined();
    expect(caster.resourcePools.stamina!.current).toBe(100);
  });

  it('should correctly check affordability', () => {
    const spell = createTestSpell({ manaCost: 50 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const result = calculator.canAfford(costs, caster);
    expect(result.canAfford).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should detect unaffordable costs', () => {
    const spell = createTestSpell({ manaCost: 200 }); // More than available
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    // Set mana to 50
    caster.resourcePools.mana!.current = 50;

    const result = calculator.canAfford(costs, caster);
    expect(result.canAfford).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Pact Paradigm Tests
// ============================================================================

describe('PactCostCalculator', () => {
  let calculator: PactCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new PactCostCalculator();
    caster = createTestCaster('pact');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate favor cost', () => {
    const spell = createTestSpell({ manaCost: 50 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const favorCost = costs.find(c => c.type === 'favor');
    expect(favorCost).toBeDefined();
    expect(favorCost!.amount).toBe(10); // 50 * 0.2 = 10
  });

  it('should add corruption for dark magic', () => {
    const spell = createTestSpell({ technique: 'destroy', form: 'void' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const corruptionCost = costs.find(c => c.type === 'corruption');
    expect(corruptionCost).toBeDefined();
    expect(corruptionCost!.amount).toBeGreaterThan(0);
  });

  it('should not add corruption for non-dark magic', () => {
    const spell = createTestSpell({ technique: 'protect', form: 'body' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const corruptionCost = costs.find(c => c.type === 'corruption');
    expect(corruptionCost).toBeUndefined();
  });

  it('should add soul fragment cost for major summons', () => {
    const spell = createTestSpell({ technique: 'summon', manaCost: 100 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const soulCost = costs.find(c => c.type === 'soul_fragment');
    expect(soulCost).toBeDefined();
    expect(soulCost!.amount).toBe(1);
  });

  it('should initialize with 7 soul fragments', () => {
    expect(caster.resourcePools.soul_fragment).toBeDefined();
    expect(caster.resourcePools.soul_fragment!.current).toBe(7);
    expect(caster.resourcePools.soul_fragment!.maximum).toBe(7);
  });

  it('should detect terminal favor loss', () => {
    caster.resourcePools.favor!.current = 5;

    const spell = createTestSpell({ manaCost: 50 }); // 10 favor cost
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const result = calculator.canAfford(costs, caster);
    expect(result.wouldBeTerminal).toBe(true);
  });
});

// ============================================================================
// Name Paradigm Tests
// ============================================================================

describe('NameCostCalculator', () => {
  let calculator: NameCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new NameCostCalculator();
    caster = createTestCaster('names');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate time, sanity, and attention costs', () => {
    const spell = createTestSpell();
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    expect(costs.find(c => c.type === 'time')).toBeDefined();
    expect(costs.find(c => c.type === 'sanity')).toBeDefined();
    expect(costs.find(c => c.type === 'attention')).toBeDefined();
  });

  it('should always add 1 attention per cast', () => {
    const spell = createTestSpell({ manaCost: 5 }); // Low power
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const attentionCost = costs.find(c => c.type === 'attention')!;
    expect(attentionCost.amount).toBeGreaterThanOrEqual(1);
  });

  it('should increase attention for spirit/void forms', () => {
    const normalSpell = createTestSpell({ form: 'fire' });
    const spiritSpell = createTestSpell({ form: 'spirit' });
    const context = createTestContext();

    const normalCosts = calculator.calculateCosts(normalSpell, caster, context);
    const spiritCosts = calculator.calculateCosts(spiritSpell, caster, context);

    const normalAttention = normalCosts.find(c => c.type === 'attention')!.amount;
    const spiritAttention = spiritCosts.find(c => c.type === 'attention')!.amount;

    expect(spiritAttention).toBeGreaterThan(normalAttention);
  });

  it('should have attention decay (negative regen)', () => {
    expect(caster.resourcePools.attention!.regenRate).toBeLessThan(0);
  });
});

// ============================================================================
// Breath Paradigm Tests
// ============================================================================

describe('BreathCostCalculator', () => {
  let calculator: BreathCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new BreathCostCalculator();
    caster = createTestCaster('breath');
    calculator.initializeResourcePools(caster);
  });

  it('should start with 1 Breath', () => {
    expect(caster.resourcePools.health!.current).toBe(1);
  });

  it('should calculate breath cost for awakening', () => {
    const spell = createTestSpell({ technique: 'create', duration: undefined }); // Permanent
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const breathCost = costs.find(c => c.type === 'health');
    expect(breathCost).toBeDefined();
    expect(breathCost!.amount).toBeGreaterThanOrEqual(50); // Permanent is expensive
  });

  it('should cost 0 breaths for commanding existing awakened', () => {
    const spell = createTestSpell({ technique: 'control', effectId: 'command_awakened' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const breathCost = costs.find(c => c.type === 'health');
    // Either undefined or 0
    expect(breathCost?.amount ?? 0).toBe(0);
  });

  it('should warn about becoming a Drab', () => {
    caster.resourcePools.health!.current = 1; // Only 1 breath

    const spell = createTestSpell({ technique: 'enhance', manaCost: 20 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const result = calculator.canAfford(costs, caster);
    expect(result.wouldBeTerminal).toBe(true);
    expect(result.warning).toContain('Drab');
  });
});

// ============================================================================
// Divine Paradigm Tests
// ============================================================================

describe('DivineCostCalculator', () => {
  let calculator: DivineCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new DivineCostCalculator();
    caster = createTestCaster('divine');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate favor cost', () => {
    // Use a spell that's NOT aligned with default 'life' deity (void is forbidden)
    const spell = createTestSpell({ form: 'void', technique: 'perceive' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const favorCost = costs.find(c => c.type === 'favor');
    expect(favorCost).toBeDefined();
  });

  it('should reduce cost for aligned spells', () => {
    // Life deity favors create+body (healing)
    const alignedSpell = createTestSpell({ technique: 'create', form: 'body' });
    const unalignedSpell = createTestSpell({ technique: 'destroy', form: 'void' });
    const context = createTestContext();

    const alignedCosts = calculator.calculateCosts(alignedSpell, caster, context);
    const unalignedCosts = calculator.calculateCosts(unalignedSpell, caster, context);

    const alignedFavor = alignedCosts.filter(c => c.type === 'favor').reduce((sum, c) => sum + c.amount, 0);
    const unalignedFavor = unalignedCosts.filter(c => c.type === 'favor').reduce((sum, c) => sum + c.amount, 0);

    expect(alignedFavor).toBeLessThan(unalignedFavor);
  });

  it('should add karma for forbidden spells', () => {
    // Life deity forbids destroy
    const forbiddenSpell = createTestSpell({ technique: 'destroy', form: 'body' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(forbiddenSpell, caster, context);

    const karmaCost = costs.find(c => c.type === 'karma');
    expect(karmaCost).toBeDefined();
    expect(karmaCost!.amount).toBe(20);
  });

  it('should start with neutral favor (50)', () => {
    expect(caster.resourcePools.favor!.current).toBe(50);
  });
});

// ============================================================================
// Blood Paradigm Tests
// ============================================================================

describe('BloodCostCalculator', () => {
  let calculator: BloodCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new BloodCostCalculator();
    caster = createTestCaster('blood');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate blood, health, and corruption costs', () => {
    const spell = createTestSpell();
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    expect(costs.find(c => c.type === 'blood')).toBeDefined();
    expect(costs.find(c => c.type === 'health')).toBeDefined();
    expect(costs.find(c => c.type === 'corruption')).toBeDefined();
  });

  it('should always accumulate corruption', () => {
    const spell = createTestSpell({ technique: 'protect', form: 'body' }); // Not dark
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    const corruptionCost = costs.find(c => c.type === 'corruption');
    expect(corruptionCost).toBeDefined();
    expect(corruptionCost!.amount).toBeGreaterThan(0);
  });

  it('should add lifespan cost for soul magic', () => {
    const soulSpell = createTestSpell({ technique: 'create', form: 'spirit' });
    const context = createTestContext();
    const costs = calculator.calculateCosts(soulSpell, caster, context);

    const lifespanCost = costs.find(c => c.type === 'lifespan');
    expect(lifespanCost).toBeDefined();
    expect(lifespanCost!.amount).toBe(5); // 5 years for soul magic
  });

  it('should have lifespan pool with 80 years', () => {
    expect(caster.resourcePools.lifespan!.current).toBe(80);
    expect(caster.resourcePools.lifespan!.regenRate).toBe(0); // Never recovers
  });
});

// ============================================================================
// Emotional Paradigm Tests
// ============================================================================

describe('EmotionalCostCalculator', () => {
  let calculator: EmotionalCostCalculator;
  let caster: MagicComponent;

  beforeEach(() => {
    calculator = new EmotionalCostCalculator();
    caster = createTestCaster('emotional');
    calculator.initializeResourcePools(caster);
  });

  it('should calculate emotion and sanity costs', () => {
    const spell = createTestSpell();
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);

    expect(costs.find(c => c.type === 'emotion')).toBeDefined();
    expect(costs.find(c => c.type === 'sanity')).toBeDefined();
  });

  it('should cost less for joy emotion', () => {
    caster.paradigmState!.emotional = { dominantEmotion: 'joy', emotionalStability: 100 };

    const spell = createTestSpell({ manaCost: 100 });
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, caster, context);
    const joyCost = costs.find(c => c.type === 'emotion')!.amount;

    // Reset to rage
    caster.paradigmState!.emotional = { dominantEmotion: 'rage', emotionalStability: 100 };
    const rageCosts = calculator.calculateCosts(spell, caster, context);
    const rageCost = rageCosts.find(c => c.type === 'emotion')!.amount;

    expect(joyCost).toBeLessThan(rageCost);
  });

  it('should provide power multiplier', () => {
    caster.paradigmState!.emotional = { dominantEmotion: 'fear', emotionalStability: 100 };
    const spell = createTestSpell({ technique: 'protect' }); // Fear favors protect

    const multiplier = calculator.getPowerMultiplier(spell, caster);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it('should start with joy as default emotion', () => {
    expect(caster.paradigmState!.emotional?.dominantEmotion).toBe('joy');
  });
});

// ============================================================================
// Divine Casting (Gods) Tests
// ============================================================================

describe('DivineCastingCalculator', () => {
  let calculator: DivineCastingCalculator;

  beforeEach(() => {
    calculator = new DivineCastingCalculator();
  });

  it('should calculate tiny belief cost', () => {
    const spell = createTestSpell({ manaCost: 1000 }); // Powerful spell
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, {} as MagicComponent, context);

    const beliefCost = costs.find(c => c.type === 'belief');
    expect(beliefCost).toBeDefined();
    // Should be much smaller than mortal cost
    expect(beliefCost!.amount).toBeLessThan(10);
  });

  it('should have minimum belief cost of 1', () => {
    const spell = createTestSpell({ manaCost: 1 }); // Tiny spell
    const context = createTestContext();
    const costs = calculator.calculateCosts(spell, {} as MagicComponent, context);

    const beliefCost = costs.find(c => c.type === 'belief')!;
    expect(beliefCost.amount).toBeGreaterThanOrEqual(1);
  });

  it('should calculate belief gain from witnesses', () => {
    const spell = createTestSpell({ technique: 'summon', form: 'fire' }); // Impressive

    const result = calculator.calculateBeliefGain(
      spell,
      ['witness1', 'witness2', 'witness3'],
      [0.8, 0.5, 0.2] // High, medium, low devotion
    );

    expect(result.totalGain).toBeGreaterThan(0);
    expect(result.contributions).toHaveLength(3);
  });

  it('should return 0 belief gain with no witnesses', () => {
    const spell = createTestSpell();
    const result = calculator.calculateBeliefGain(spell, [], []);

    expect(result.totalGain).toBe(0);
    expect(result.contributions).toHaveLength(0);
  });

  it('should calculate net-positive miracle with witnesses', () => {
    const spell = createTestSpell({ technique: 'summon', manaCost: 50 });
    const context = createDivineCastingContext(
      1000,
      'deity_life',
      ['w1', 'w2', 'w3', 'w4', 'w5'], // 5 witnesses
      [0.8, 0.7, 0.6, 0.5, 0.4] // Various devotion levels
    );

    const result = calculator.calculateMiracleResult(spell, context);

    expect(result.beliefSpent).toBeGreaterThan(0);
    expect(result.beliefGained).toBeGreaterThan(0);
    expect(result.netBelief).toBeGreaterThan(0); // Net positive!
    expect(result.wasWitnessed).toBe(true);
  });

  it('should be net-negative without witnesses', () => {
    const spell = createTestSpell({ manaCost: 50 });
    const context = createDivineCastingContext(
      1000,
      'deity_life',
      [], // No witnesses
      []
    );

    const result = calculator.calculateMiracleResult(spell, context);

    expect(result.beliefSpent).toBeGreaterThan(0);
    expect(result.beliefGained).toBe(0);
    expect(result.netBelief).toBeLessThan(0); // Net negative
    expect(result.wasWitnessed).toBe(false);
  });

  it('should give more belief for more impressive spells', () => {
    const boringSpell = createTestSpell({ technique: 'perceive', form: 'mind' }); // 0.5 * 0.5 = 0.25
    const impressiveSpell = createTestSpell({ technique: 'summon', form: 'void' }); // 2.0 * 2.0 = 4.0

    const boringResult = calculator.calculateBeliefGain(
      boringSpell,
      ['w1'],
      [0.5]
    );

    const impressiveResult = calculator.calculateBeliefGain(
      impressiveSpell,
      ['w1'],
      [0.5]
    );

    expect(impressiveResult.totalGain).toBeGreaterThan(boringResult.totalGain);
  });
});

// ============================================================================
// Cost Deduction Tests
// ============================================================================

describe('Cost Deduction', () => {
  beforeEach(() => {
    registerAllCostCalculators();
  });

  afterEach(() => {
    costCalculatorRegistry.clear();
  });

  it('should deduct normal costs from pools', () => {
    const calculator = new AcademicCostCalculator();
    const caster = createTestCaster('academic');
    calculator.initializeResourcePools(caster);

    const costs: SpellCost[] = [
      { type: 'mana', amount: 20, source: 'test' },
      { type: 'stamina', amount: 10, source: 'test' },
    ];

    const result = calculator.deductCosts(costs, caster, ACADEMIC_PARADIGM);

    expect(result.success).toBe(true);
    expect(result.terminal).toBe(false);
    expect(caster.resourcePools.mana!.current).toBe(80);
    expect(caster.resourcePools.stamina!.current).toBe(90);
  });

  it('should add cumulative costs (corruption)', () => {
    const calculator = new BloodCostCalculator();
    const caster = createTestCaster('blood');
    calculator.initializeResourcePools(caster);

    const initialCorruption = caster.resourcePools.corruption!.current;

    const costs: SpellCost[] = [
      { type: 'corruption', amount: 10, source: 'test' },
    ];

    const result = calculator.deductCosts(costs, caster, BLOOD_PARADIGM);

    expect(result.success).toBe(true);
    expect(caster.resourcePools.corruption!.current).toBe(initialCorruption + 10);
  });

  it('should trigger terminal effect at threshold', () => {
    const calculator = new PactCostCalculator();
    const caster = createTestCaster('pact');
    calculator.initializeResourcePools(caster);

    // Set corruption to 95
    caster.resourcePools.corruption!.current = 95;

    const costs: SpellCost[] = [
      { type: 'corruption', amount: 10, source: 'test' }, // Will push to 105 (capped at 100)
    ];

    const result = calculator.deductCosts(costs, caster, PACT_PARADIGM);

    expect(result.terminal).toBe(true);
    expect(result.terminalEffect).toBeDefined();
    expect(result.terminalEffect!.type).toBe('corruption_threshold');
  });
});

// ============================================================================
// Cost Recovery Tests
// ============================================================================

describe('CostRecoveryManager', () => {
  it('should apply passive regeneration', () => {
    const caster = createTestCaster('academic');
    const calculator = new AcademicCostCalculator();
    calculator.initializeResourcePools(caster);

    // Deplete some mana
    caster.resourcePools.mana!.current = 50;

    // Apply 100 ticks of regeneration (1% per tick = 100%)
    costRecoveryManager.applyPassiveRegeneration(caster, 100);

    expect(caster.resourcePools.mana!.current).toBe(51); // 50 + (0.01 * 100) = 51
  });

  it('should apply rest recovery with multiplier', () => {
    const caster = createTestCaster('academic');
    const calculator = new AcademicCostCalculator();
    calculator.initializeResourcePools(caster);

    caster.resourcePools.mana!.current = 50;

    // Rest for 100 ticks with 5x multiplier
    costRecoveryManager.applyRestRecovery(caster, 100, ACADEMIC_PARADIGM, 5);

    // Should recover 0.01 * 100 * 5 = 5
    expect(caster.resourcePools.mana!.current).toBe(55);
  });

  it('should apply decay for negative regen (attention)', () => {
    const caster = createTestCaster('names');
    const calculator = new NameCostCalculator();
    calculator.initializeResourcePools(caster);

    // Set attention to 50
    caster.resourcePools.attention!.current = 50;

    // Apply 1000 ticks of decay (-0.001 per tick)
    costRecoveryManager.applyPassiveRegeneration(caster, 1000);

    expect(caster.resourcePools.attention!.current).toBe(49); // 50 - 1 = 49
  });

  it('should apply prayer recovery for divine', () => {
    const caster = createTestCaster('divine');
    const calculator = new DivineCostCalculator();
    calculator.initializeResourcePools(caster);

    caster.resourcePools.favor!.current = 30;

    // Pray for 100 ticks at 0.8 devotion
    costRecoveryManager.applyPrayerRecovery(caster, 100, 0.8);

    // Should recover 0.02 * 100 * 0.8 = 1.6
    expect(caster.resourcePools.favor!.current).toBeCloseTo(31.6, 1);
  });

  it('should apply quest recovery', () => {
    const caster = createTestCaster('pact');
    const calculator = new PactCostCalculator();
    calculator.initializeResourcePools(caster);

    caster.resourcePools.favor!.current = 30;

    const rewards: SpellCost[] = [
      { type: 'favor', amount: 25, source: 'quest_reward' },
    ];

    costRecoveryManager.applyQuestRecovery(caster, 'patron_quest_1', rewards);

    expect(caster.resourcePools.favor!.current).toBe(55);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Full Spell Cast Flow', () => {
  beforeEach(() => {
    registerAllCostCalculators();
  });

  afterEach(() => {
    costCalculatorRegistry.clear();
  });

  it('should complete full academic spell cast', () => {
    const calculator = costCalculatorRegistry.get('academic') as AcademicCostCalculator;
    const caster = createTestCaster('academic');
    calculator.initializeResourcePools(caster);

    const spell = createTestSpell({ manaCost: 30, castTime: 15 });
    const context = createTestContext();

    // Step 1: Calculate costs
    const costs = calculator.calculateCosts(spell, caster, context);
    expect(costs.length).toBeGreaterThan(0);

    // Step 2: Check affordability
    const affordability = calculator.canAfford(costs, caster);
    expect(affordability.canAfford).toBe(true);

    // Step 3: Deduct costs
    const result = calculator.deductCosts(costs, caster, ACADEMIC_PARADIGM);
    expect(result.success).toBe(true);
    expect(result.terminal).toBe(false);

    // Step 4: Verify pools updated
    expect(caster.resourcePools.mana!.current).toBeLessThan(100);
    expect(caster.resourcePools.stamina!.current).toBeLessThan(100);
  });

  it('should complete full divine miracle with belief economics', () => {
    const calculator = new DivineCastingCalculator();

    const spell = createTestSpell({ technique: 'create', form: 'body', manaCost: 50 }); // Healing
    const context = createDivineCastingContext(
      1000,
      'deity_life',
      ['villager1', 'villager2', 'villager3'],
      [0.7, 0.5, 0.3]
    );

    // Calculate miracle result
    const result = calculator.calculateMiracleResult(spell, context);

    // Should be net positive with 3 witnesses
    expect(result.wasWitnessed).toBe(true);
    expect(result.netBelief).toBeGreaterThan(0);
    expect(result.witnessContributions).toHaveLength(3);

    // Each witness should have contributed
    for (const contrib of result.witnessContributions) {
      expect(contrib.beliefGained).toBeGreaterThan(0);
    }
  });
});
