/**
 * Integration tests for MagicLawEnforcer with real cost calculators
 * Gap: MagicLawEnforcer currently uses placeholder cost logic
 * Need: Integration with costCalculatorRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MagicLawEnforcer } from '../MagicLawEnforcer.js';
import { ACADEMIC_PARADIGM } from '../CoreParadigms.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import type { ComposedSpell } from '../../components/MagicComponent.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { CastingContext } from '../costs/CostCalculator.js';
import { registerAllCostCalculators } from '../costs/calculators/registerAll.js';

// Register cost calculators before all tests
registerAllCostCalculators();

describe('MagicLawEnforcer - Cost Calculator Integration', () => {
  let enforcer: MagicLawEnforcer;
  let mockCaster: MagicComponent;
  let mockContext: CastingContext;
  let testSpell: ComposedSpell;

  beforeEach(() => {
    enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);

    mockCaster = {
      knownParadigmIds: ['academic'],
      activeParadigms: ['academic'], // For backwards compatibility with tests
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        stamina: { type: 'stamina', current: 100, maximum: 100, regenRate: 0.02, locked: 0 },
      },
      knownSpells: [],
      paradigmState: {},
    } as any;

    mockContext = {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    };

    testSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'damage_fire',
    };
  });

  it('should use cost calculator to validate spell', () => {
    const result = enforcer.validateSpell(testSpell, mockCaster, mockContext);

    expect(result.valid).toBe(true);
    expect(result.costs).toBeDefined();
    expect(result.costs.length).toBeGreaterThan(0);

    // Should have costs from calculator
    const manaCost = result.costs.find((c) => c.type === 'mana');
    expect(manaCost).toBeDefined();
  });

  it('should reject spell if caster cannot afford costs', () => {
    mockCaster.resourcePools.mana.current = 20; // Insufficient

    const result = enforcer.validateSpell(testSpell, mockCaster, mockContext);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('Insufficient mana'));
  });

  it('should warn about terminal effects', () => {
    // Set up for terminal scenario
    mockCaster.activeParadigms = ['blood'];
    mockCaster.resourcePools = {
      blood: { type: 'blood', current: 10, maximum: 100, regenRate: 0.005, locked: 0 },
      health: { type: 'health', current: 10, maximum: 100, regenRate: 0.01, locked: 0 },
      corruption: { type: 'corruption', current: 0, maximum: 100, regenRate: 0, locked: 0 },
      lifespan: { type: 'lifespan', current: 80, maximum: 80, regenRate: 0, locked: 0 },
    };

    const bloodEnforcer = new MagicLawEnforcer(getCoreParadigm('blood'));
    const expensiveSpell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'destroy',
      form: 'body',
      source: 'blood',
      manaCost: 100, // High cost
      castTime: 10,
      range: 20,
      effectId: 'test',
    };

    const result = bloodEnforcer.validateSpell(expensiveSpell, mockCaster, mockContext);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('terminal'))).toBe(true);
  });

  it('should integrate ley line bonus from context', () => {
    mockContext.ambientPower = 3.0; // Strong ley line

    const result = enforcer.validateSpell(testSpell, mockCaster, mockContext);

    const manaCost = result.costs.find((c) => c.type === 'mana');
    // Should be reduced from base 50
    expect(manaCost?.amount).toBeLessThan(50);
  });

  it('should handle group casting cost distribution', () => {
    mockContext.isGroupCast = true;
    mockContext.casterCount = 3;

    const result = enforcer.validateSpell(testSpell, mockCaster, mockContext);

    // Costs should be divided or modified for group casting
    expect(result.valid).toBe(true);
  });

  it('should enforce paradigm laws', () => {
    const result = enforcer.validateSpell(testSpell, mockCaster, mockContext);

    expect(result.lawChecks).toBeDefined();
    expect(result.lawChecks.length).toBeGreaterThan(0);

    // Should check conservation law for academic paradigm
    const conservationCheck = result.lawChecks.find((c) => c.lawId === 'conservation');
    expect(conservationCheck).toBeDefined();
  });

  it('should detect law violations', () => {
    // Spell that violates paradigm laws
    const violatingSpell: ComposedSpell = {
      id: 'create_matter',
      name: 'Create Matter from Nothing',
      technique: 'create',
      form: 'earth',
      source: 'arcane',
      manaCost: 10, // Too cheap for creation
      castTime: 1,
      range: 5,
      effectId: 'create_mass',
    };

    const result = enforcer.validateSpell(violatingSpell, mockCaster, mockContext);

    // Should have warnings or errors about law violations
    const hasViolations = result.errors.length > 0 || result.warnings.length > 0;
    expect(hasViolations).toBe(true);
  });
});

describe('MagicLawEnforcer - Cross-Paradigm Validation', () => {
  it('should validate multi-paradigm casters', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['academic', 'names'],
      activeParadigms: ['academic', 'names'], // For backwards compatibility
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        sanity: { type: 'sanity', current: 100, maximum: 100, regenRate: 0.005, locked: 0 },
      },
      knownSpells: [],
      paradigmState: {
        names: { knownNames: ['fire', 'wind'] },
      },
    } as any;

    const nameSpell: ComposedSpell = {
      id: 'true_name_fire',
      name: 'Command Fire by True Name',
      technique: 'control',
      form: 'fire',
      source: 'arcane',
      manaCost: 40,
      castTime: 8,
      range: 15,
      effectId: 'control_fire',
    };

    const nameEnforcer = new MagicLawEnforcer(getCoreParadigm('names'));
    const result = nameEnforcer.validateSpell(nameSpell, mockCaster, {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    });

    expect(result.valid).toBe(true);
    // Should have costs from name paradigm (sanity + attention)
    const sanityCost = result.costs.find((c) => c.type === 'sanity');
    expect(sanityCost).toBeDefined();
  });

  it('should detect forbidden paradigm combinations', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['divine', 'pact'], // Forbidden combo
      activeParadigms: ['divine', 'pact'],
      resourcePools: {},
      knownSpells: [],
      paradigmState: {},
    } as any;

    expect(() => {
      const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
      enforcer.validateCasterParadigms(mockCaster);
    }).toThrow();
  });
});

describe('MagicLawEnforcer - Risk Assessment', () => {
  it('should assess mishap risks based on proficiency', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['academic'],
      activeParadigms: ['academic'],
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
      knownSpells: [
        {
          spellId: 'fireball',
          proficiency: 20, // Low proficiency = high risk
          timesCast: 5,
        },
      ],
      paradigmState: {},
    } as any;

    const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
    const spell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'damage_fire',
    };

    const result = enforcer.validateSpell(spell, mockCaster, {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    });

    expect(result.risks).toBeDefined();
    expect(result.risks.length).toBeGreaterThan(0);

    // Should have mishap risk
    const mishapRisk = result.risks.find((r) => r.trigger === 'low_proficiency');
    expect(mishapRisk).toBeDefined();
    expect(mishapRisk?.probability).toBeGreaterThan(0);
  });

  it('should assess corruption risks for dark magic', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['pact'],
      activeParadigms: ['pact'],
      resourcePools: {
        favor: { type: 'favor', current: 100, maximum: 100, regenRate: 0, locked: 0 },
        corruption: { type: 'corruption', current: 80, maximum: 100, regenRate: 0, locked: 0 },
      },
      knownSpells: [],
      paradigmState: { pact: { patronId: 'demon', pactTerms: [], serviceOwed: 0 } },
    } as any;

    const pactEnforcer = new MagicLawEnforcer(getCoreParadigm('pact'));
    const darkSpell: ComposedSpell = {
      id: 'drain_soul',
      name: 'Drain Soul',
      technique: 'destroy',
      form: 'spirit',
      source: 'void',
      manaCost: 60,
      castTime: 15,
      range: 10,
      effectId: 'soul_drain',
    };

    const result = pactEnforcer.validateSpell(darkSpell, mockCaster, {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    });

    // Should warn about corruption threshold
    const corruptionWarning = result.warnings.find((w) => w.includes('corruption'));
    expect(corruptionWarning).toBeDefined();
  });
});

describe('MagicLawEnforcer - Spell Modification', () => {
  it('should calculate bonuses from favorable conditions', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['academic'],
      activeParadigms: ['academic'],
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
      knownSpells: [],
      paradigmState: {},
    } as any;

    const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
    const spell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'damage_fire',
    };

    const result = enforcer.validateSpell(spell, mockCaster, {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 5.0, // Very favorable
      isGroupCast: false,
      casterCount: 1,
    });

    expect(result.bonuses).toBeDefined();
    expect(result.bonuses.length).toBeGreaterThan(0);
  });

  it('should calculate penalties from unfavorable conditions', () => {
    const mockCaster: MagicComponent = {
      knownParadigmIds: ['divine'],
      activeParadigms: ['divine'],
      resourcePools: {
        favor: { type: 'favor', current: 10, maximum: 100, regenRate: 0, locked: 0 }, // Low favor
      },
      knownSpells: [],
      paradigmState: { divine: { deityId: 'healing_god', deityStanding: 'disfavored' } },
    } as any;

    const divineEnforcer = new MagicLawEnforcer(getCoreParadigm('divine'));
    const spell: ComposedSpell = {
      id: 'smite',
      name: 'Smite',
      technique: 'destroy',
      form: 'body',
      source: 'divine',
      manaCost: 40,
      castTime: 5,
      range: 15,
      effectId: 'smite',
    };

    const result = divineEnforcer.validateSpell(spell, mockCaster, {
      tick: 1000,
      timeOfDay: 0.5,
      ambientPower: 0,
      isGroupCast: false,
      casterCount: 1,
    });

    // Should have penalties from low favor
    expect(result.warnings.some((w) => w.includes('favor') || w.includes('disfavored'))).toBe(true);
  });
});

// Helper function
function getCoreParadigm(id: string): any {
  const paradigms: any = {
    blood: {
      id: 'blood',
      name: 'Blood Magic',
      costs: [
        { type: 'blood', canBeTerminal: true },
        { type: 'health', canBeTerminal: true },
        { type: 'corruption', canBeTerminal: true, cumulative: true },
      ],
      laws: [],
      sources: [],
      channels: [],
      risks: [],
      acquisitionMethods: [],
    },
    names: {
      id: 'names',
      name: 'True Names',
      costs: [
        { type: 'sanity', canBeTerminal: true },
        { type: 'attention', cumulative: true },
      ],
      laws: [],
      sources: [],
      channels: [],
      risks: [],
      acquisitionMethods: [],
    },
    pact: {
      id: 'pact',
      name: 'Pact Magic',
      costs: [
        { type: 'favor', canBeTerminal: true },
        { type: 'corruption', canBeTerminal: true, cumulative: true },
        { type: 'soul_fragment', canBeTerminal: true },
      ],
      laws: [],
      sources: [],
      channels: [],
      risks: [],
      acquisitionMethods: [],
    },
    divine: {
      id: 'divine',
      name: 'Divine Magic',
      costs: [
        { type: 'favor', canBeTerminal: true },
        { type: 'karma' },
      ],
      laws: [],
      sources: [],
      channels: [],
      risks: [],
      acquisitionMethods: [],
    },
  };
  return paradigms[id];
}
