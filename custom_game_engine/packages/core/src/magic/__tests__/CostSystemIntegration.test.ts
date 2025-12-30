/**
 * Cost System Integration Tests
 *
 * Tests that the cost calculator system is properly integrated with:
 * - MagicLawEnforcer
 * - SpellCastingService
 * - InitializeMagicSystem
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MagicLawEnforcer } from '../MagicLawEnforcer.js';
import { SpellCastingService } from '../SpellCastingService.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import { registerAllCostCalculators } from '../costs/calculators/registerAll.js';
import { ACADEMIC_PARADIGM } from '../CoreParadigms.js';
import type { ComposedSpell, MagicComponent } from '../../components/MagicComponent.js';
import type { SpellDefinition } from '../SpellRegistry.js';

describe('Cost System Integration', () => {
  beforeEach(() => {
    // Clear and register cost calculators
    costCalculatorRegistry.clear();
    registerAllCostCalculators();
  });

  afterEach(() => {
    costCalculatorRegistry.clear();
  });

  describe('Initialization', () => {
    it('should register all cost calculators during initialization', () => {
      expect(costCalculatorRegistry.has('academic')).toBe(true);
      expect(costCalculatorRegistry.has('pact')).toBe(true);
      expect(costCalculatorRegistry.has('names')).toBe(true);
      expect(costCalculatorRegistry.has('breath')).toBe(true);
      expect(costCalculatorRegistry.has('divine')).toBe(true);
      expect(costCalculatorRegistry.has('blood')).toBe(true);
      expect(costCalculatorRegistry.has('emotional')).toBe(true);
      expect(costCalculatorRegistry.has('divine_casting')).toBe(true);
    });

    it('should allow getting registered calculators', () => {
      const calculator = costCalculatorRegistry.get('academic');
      expect(calculator).toBeDefined();
      expect(calculator?.paradigmId).toBe('academic');
    });

    it('should return all registered paradigm IDs', () => {
      const paradigms = costCalculatorRegistry.getRegisteredParadigms();
      expect(paradigms).toContain('academic');
      expect(paradigms).toContain('pact');
      expect(paradigms).toContain('names');
      expect(paradigms).toContain('breath');
      expect(paradigms).toContain('divine');
      expect(paradigms).toContain('blood');
      expect(paradigms).toContain('emotional');
      expect(paradigms).toContain('divine_casting');
    });
  });

  describe('MagicLawEnforcer Integration', () => {
    let enforcer: MagicLawEnforcer;
    let caster: MagicComponent;
    let spell: ComposedSpell;

    beforeEach(() => {
      enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);

      // Create a test caster
      caster = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: {
            type: 'mana',
            current: 100,
            maximum: 100,
            regenRate: 0.01,
            locked: 0,
          },
          stamina: {
            type: 'stamina',
            current: 100,
            maximum: 100,
            regenRate: 0.02,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
        techniqueProficiency: {},
        formProficiency: {},
      };

      // Create a simple test spell
      spell = {
        id: 'test_fireball',
        name: 'Test Fireball',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 45,
        castTime: 40,
        range: 20,
        effectId: 'fireball_effect',
      };
    });

    it('should use cost calculator to calculate costs', () => {
      const result = enforcer.validateSpell(spell, caster);

      // Should have calculated costs (mana + stamina for academic paradigm)
      expect(result.costs.length).toBeGreaterThan(0);
      expect(result.costs.some(c => c.type === 'mana')).toBe(true);
      expect(result.costs.some(c => c.type === 'stamina')).toBe(true);
    });

    it('should pass validation when caster has enough resources', () => {
      const result = enforcer.validateSpell(spell, caster);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail validation when caster lacks resources', () => {
      // Set mana to very low
      caster.resourcePools.mana!.current = 1;

      const result = enforcer.validateSpell(spell, caster);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient mana'))).toBe(true);
    });

    it('should warn about terminal effects', () => {
      // Create a spell that would be terminal (drain all health for blood paradigm)
      const bloodEnforcer = new MagicLawEnforcer({
        id: 'blood',
        name: 'Blood Magic',
        description: 'Blood-based magic',
        universeIds: [],
        lore: '',
        sources: [],
        costs: [],
        laws: [],
        risks: [],
        channels: [],
        availableTechniques: ['create', 'destroy', 'enhance'],
        availableForms: ['fire', 'body', 'mind'],
        supportedSpellTypes: [],
        forbiddenCombinations: [],
        resonantCombinations: [],
        interactions: [],
      });

      const bloodCaster: MagicComponent = {
        knownParadigmIds: ['blood'],
        activeParadigmId: 'blood',
        primarySource: 'vitae',
        manaPools: [],
        resourcePools: {
          blood: {
            type: 'blood',
            current: 10,
            maximum: 100,
            regenRate: 0.005,
            locked: 0,
          },
          health: {
            type: 'health',
            current: 10,
            maximum: 100,
            regenRate: 0.01,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const expensiveSpell: ComposedSpell = {
        id: 'blood_ritual',
        name: 'Blood Ritual',
        technique: 'create',
        form: 'body',
        source: 'vitae',
        manaCost: 100, // Will cost blood + health
        castTime: 60,
        range: 1,
        effectId: 'resurrect',
      };

      const result = bloodEnforcer.validateSpell(expensiveSpell, bloodCaster);

      // Should warn about terminal effects or fail due to insufficient resources
      const hasTerminalWarning = result.warnings.some(w =>
        w.includes('terminal') || w.includes('death') || w.includes('kill')
      );
      const hasInsufficientError = result.errors.some(e =>
        e.includes('Insufficient')
      );

      expect(hasTerminalWarning || hasInsufficientError).toBe(true);
    });

    it('should fail with clear error when calculator not registered', () => {
      // Clear the registry
      costCalculatorRegistry.clear();

      const result = enforcer.validateSpell(spell, caster);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No cost calculator registered');
      expect(result.errors[0]).toContain('registerAllCostCalculators()');
    });
  });

  describe('SpellCastingService Integration', () => {
    let service: SpellCastingService;

    beforeEach(() => {
      service = SpellCastingService.getInstance();
    });

    afterEach(() => {
      SpellCastingService.resetInstance();
    });

    it('should throw when checking costs without calculator', () => {
      // Clear registry
      costCalculatorRegistry.clear();

      const spell: SpellDefinition = {
        id: 'test',
        name: 'Test',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test',
        description: 'Test',
      };

      const magic: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      // Access private method
      const checkCosts = (service as any).checkCosts.bind(service);

      expect(() => {
        checkCosts(spell, magic);
      }).toThrow('No cost calculator registered');
    });

    it('should throw when deducting costs without calculator', () => {
      // Clear registry
      costCalculatorRegistry.clear();

      const spell: SpellDefinition = {
        id: 'test',
        name: 'Test',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test',
        description: 'Test',
      };

      const magic: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      const resourcesSpent: Record<string, number> = {};

      // Access private method
      const deductCosts = (service as any).deductCosts.bind(service);

      expect(() => {
        deductCosts(spell, magic, resourcesSpent);
      }).toThrow('No cost calculator registered');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate mana and stamina costs for academic spells', () => {
      const calculator = costCalculatorRegistry.get('academic')!;

      const spell: ComposedSpell = {
        id: 'fireball',
        name: 'Fireball',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 50,
        castTime: 40,
        range: 20,
        effectId: 'fireball_effect',
      };

      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      const costs = calculator.calculateCosts(spell, caster, {
        tick: 0,
        timeOfDay: 0.5,
        ambientPower: 0,
        isGroupCast: false,
        casterCount: 1,
      });

      // Should have both mana and stamina costs
      expect(costs.length).toBeGreaterThanOrEqual(2);

      const manaCost = costs.find(c => c.type === 'mana');
      const staminaCost = costs.find(c => c.type === 'stamina');

      expect(manaCost).toBeDefined();
      expect(staminaCost).toBeDefined();
      expect(manaCost!.amount).toBeGreaterThan(0);
      expect(staminaCost!.amount).toBeGreaterThan(0);
    });

    it('should reduce mana cost with ambient power', () => {
      const calculator = costCalculatorRegistry.get('academic')!;

      const spell: ComposedSpell = {
        id: 'fireball',
        name: 'Fireball',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 100,
        castTime: 40,
        range: 20,
        effectId: 'fireball_effect',
      };

      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      // No ambient power
      const costsNormal = calculator.calculateCosts(spell, caster, {
        tick: 0,
        timeOfDay: 0.5,
        ambientPower: 0,
        isGroupCast: false,
        casterCount: 1,
      });

      // High ambient power (near ley line)
      const costsWithPower = calculator.calculateCosts(spell, caster, {
        tick: 0,
        timeOfDay: 0.5,
        ambientPower: 2.0, // Strong ley line
        isGroupCast: false,
        casterCount: 1,
      });

      const manaNormal = costsNormal.find(c => c.type === 'mana')!.amount;
      const manaWithPower = costsWithPower.find(c => c.type === 'mana')!.amount;

      // Should cost less mana with ambient power
      expect(manaWithPower).toBeLessThan(manaNormal);
    });
  });

  describe('Affordability Checking', () => {
    it('should correctly identify when caster can afford spell', () => {
      const calculator = costCalculatorRegistry.get('academic')!;

      const spell: ComposedSpell = {
        id: 'minor_spell',
        name: 'Minor Spell',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test_effect',
      };

      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: {
            type: 'mana',
            current: 100,
            maximum: 100,
            regenRate: 0.01,
            locked: 0,
          },
          stamina: {
            type: 'stamina',
            current: 100,
            maximum: 100,
            regenRate: 0.02,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const costs = calculator.calculateCosts(spell, caster, {
        tick: 0,
        timeOfDay: 0.5,
        ambientPower: 0,
        isGroupCast: false,
        casterCount: 1,
      });

      const affordability = calculator.canAfford(costs, caster);

      expect(affordability.canAfford).toBe(true);
      expect(affordability.missing.length).toBe(0);
      expect(affordability.wouldBeTerminal).toBe(false);
    });

    it('should correctly identify insufficient resources', () => {
      const calculator = costCalculatorRegistry.get('academic')!;

      const spell: ComposedSpell = {
        id: 'expensive_spell',
        name: 'Expensive Spell',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 100,
        castTime: 60,
        range: 20,
        effectId: 'test_effect',
      };

      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: {
            type: 'mana',
            current: 10, // Not enough
            maximum: 100,
            regenRate: 0.01,
            locked: 0,
          },
          stamina: {
            type: 'stamina',
            current: 100,
            maximum: 100,
            regenRate: 0.02,
            locked: 0,
          },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const costs = calculator.calculateCosts(spell, caster, {
        tick: 0,
        timeOfDay: 0.5,
        ambientPower: 0,
        isGroupCast: false,
        casterCount: 1,
      });

      const affordability = calculator.canAfford(costs, caster);

      expect(affordability.canAfford).toBe(false);
      expect(affordability.missing.length).toBeGreaterThan(0);
      expect(affordability.missing.some(m => m.type === 'mana')).toBe(true);
    });
  });

  describe('Error Messages', () => {
    it('should have actionable error message for missing calculator', () => {
      // Clear registry to trigger error
      costCalculatorRegistry.clear();

      const enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
      const spell: ComposedSpell = {
        id: 'test',
        name: 'Test',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test',
      };
      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      const result = enforcer.validateSpell(spell, caster);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No cost calculator registered');
      expect(result.errors[0]).toContain('academic');
      expect(result.errors[0]).toContain('registerAllCostCalculators()');
    });

    it('should have clear error for missing paradigm', () => {
      const service = SpellCastingService.getInstance();
      // Clear registry after service is created
      costCalculatorRegistry.clear();

      // Access private method for testing
      const checkCosts = (service as any).checkCosts.bind(service);

      expect(() => {
        checkCosts(
          {
            id: 'test',
            paradigmId: 'nonexistent',
            manaCost: 10,
          } as SpellDefinition,
          {
            resourcePools: {},
            manaPools: [],
          } as MagicComponent
        );
      }).toThrow('No cost calculator registered');
    });
  });
});
