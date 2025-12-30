/**
 * Cost System No Fallbacks Tests
 *
 * Verifies that the cost system follows the "No Silent Fallbacks" policy.
 * All errors should be loud, clear, and actionable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MagicLawEnforcer } from '../MagicLawEnforcer.js';
import { SpellCastingService } from '../SpellCastingService.js';
import { costCalculatorRegistry } from '../costs/CostCalculatorRegistry.js';
import { registerAllCostCalculators } from '../costs/calculators/registerAll.js';
import { getCoreParadigm } from '../CoreParadigms.js';
import type { ComposedSpell, MagicComponent } from '../../components/MagicComponent.js';
import type { SpellDefinition } from '../SpellRegistry.js';

describe('Cost System: No Fallbacks Policy', () => {
  beforeEach(() => {
    // Start with NO calculators registered
    costCalculatorRegistry.clear();
  });

  afterEach(() => {
    costCalculatorRegistry.clear();
  });

  describe('MagicLawEnforcer: No Fallbacks', () => {
    it('should FAIL validation when calculator not registered', () => {
      const paradigm = getCoreParadigm('academic');
      const enforcer = new MagicLawEnforcer(paradigm);

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
        resourcePools: {
          mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const result = enforcer.validateSpell(spell, caster);

      // Should FAIL validation, not succeed with fallback
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should NOT use basic mana cost as fallback', () => {
      const paradigm = getCoreParadigm('academic');
      const enforcer = new MagicLawEnforcer(paradigm);

      const spell: ComposedSpell = {
        id: 'test',
        name: 'Test',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 45,
        castTime: 10,
        range: 10,
        effectId: 'test',
      };

      const caster: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const result = enforcer.validateSpell(spell, caster);

      // Should NOT have calculated a simple mana cost
      // Instead should have error about missing calculator
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No cost calculator'))).toBe(true);

      // Should NOT have ANY costs calculated
      expect(result.costs.length).toBe(0);
    });

    it('should return early when calculator missing', () => {
      const paradigm = getCoreParadigm('academic');
      const enforcer = new MagicLawEnforcer(paradigm);

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

      // Should return immediately with error
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('No cost calculator registered');

      // Should not have continued to check laws or other validation
      // (costs array should be empty)
      expect(result.costs).toEqual([]);
    });
  });

  describe('SpellCastingService: No Fallbacks', () => {
    it('should THROW when checking costs without calculator', () => {
      registerAllCostCalculators();
      const service = SpellCastingService.getInstance();

      // Clear registry AFTER service is created
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

      // Access private method for testing
      const checkCosts = (service as any).checkCosts.bind(service);

      expect(() => {
        checkCosts(spell, magic);
      }).toThrow('No cost calculator registered');
    });

    it('should THROW when deducting costs without calculator', () => {
      registerAllCostCalculators();
      const service = SpellCastingService.getInstance();

      // Clear registry AFTER service is created
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

      // Access private method for testing
      const deductCosts = (service as any).deductCosts.bind(service);

      expect(() => {
        deductCosts(spell, magic, resourcesSpent);
      }).toThrow('No cost calculator registered');
    });

    it('should THROW when paradigm not found', () => {
      // Register calculators but use invalid paradigm
      registerAllCostCalculators();
      const service = SpellCastingService.getInstance();

      const spell: SpellDefinition = {
        id: 'test',
        name: 'Test',
        paradigmId: 'nonexistent_paradigm',
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
        knownParadigmIds: ['nonexistent_paradigm'],
        activeParadigmId: 'nonexistent_paradigm',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      const resourcesSpent: Record<string, number> = {};

      // Access private method for testing
      const checkCosts = (service as any).checkCosts.bind(service);

      expect(() => {
        checkCosts(spell, magic);
      }).toThrow('No cost calculator registered for paradigm');
    });

    it('should NOT silently use basic mana pools', () => {
      const service = SpellCastingService.getInstance();

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
        manaPools: [
          {
            source: 'arcane',
            current: 100,
            maximum: 100,
            regenRate: 0.01,
            locked: 0,
            color: '#0000FF',
          },
        ],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      // Access private method for testing
      const checkCosts = (service as any).checkCosts.bind(service);

      // Should THROW, not fall back to checking manaPools
      expect(() => {
        checkCosts(spell, magic);
      }).toThrow();
    });
  });

  describe('Error Message Quality', () => {
    it('should include paradigm ID in error message', () => {
      const paradigm = getCoreParadigm('academic');
      const enforcer = new MagicLawEnforcer(paradigm);

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
        techniqueProficiency: {},
        formProficiency: {},
      };

      const result = enforcer.validateSpell(spell, caster);

      expect(result.errors[0]).toContain('academic');
    });

    it('should tell user how to fix the problem', () => {
      const paradigm = getCoreParadigm('academic');
      const enforcer = new MagicLawEnforcer(paradigm);

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

      // Should tell user to call registerAllCostCalculators()
      expect(result.errors[0]).toContain('registerAllCostCalculators()');
    });

    it('should have different error for each failure type', () => {
      const service = SpellCastingService.getInstance();

      // Test 1: Missing calculator
      const spell1: SpellDefinition = {
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

      const magic1: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      const checkCosts = (service as any).checkCosts.bind(service);
      const deductCosts = (service as any).deductCosts.bind(service);

      let error1 = '';
      try {
        checkCosts(spell1, magic1);
      } catch (e: any) {
        error1 = e.message;
      }

      // Re-register for next test
      registerAllCostCalculators();

      // Test 2: Paradigm not found
      const spell2: SpellDefinition = {
        id: 'test',
        name: 'Test',
        paradigmId: 'fake_paradigm',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test',
        description: 'Test',
      };

      const magic2: MagicComponent = {
        knownParadigmIds: ['fake_paradigm'],
        activeParadigmId: 'fake_paradigm',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {},
        knownSpells: [],
        activeEffects: [],
      };

      let error2 = '';
      try {
        deductCosts(spell2, magic2, {});
      } catch (e: any) {
        error2 = e.message;
      }

      // Errors should be different and specific
      expect(error1).toBeTruthy();
      expect(error2).toBeTruthy();
      expect(error1).toContain('calculator');
      expect(error2).toContain('calculator'); // Both mention calculator but for different reasons
      expect(error1).not.toEqual(error2);
    });
  });

  describe('Behavior After Error', () => {
    it('should not modify caster state when throwing', () => {
      registerAllCostCalculators();
      const service = SpellCastingService.getInstance();

      const magic: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: { type: 'mana', current: 50, maximum: 100, regenRate: 0.01, locked: 0 },
        },
        knownSpells: [],
        activeEffects: [],
      };

      const originalMana = magic.resourcePools.mana!.current;

      const spell: SpellDefinition = {
        id: 'test',
        name: 'Test',
        paradigmId: 'nonexistent',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 10,
        effectId: 'test',
        description: 'Test',
      };

      const deductCosts = (service as any).deductCosts.bind(service);

      try {
        deductCosts(spell, magic, {});
      } catch (e) {
        // Expected
      }

      // Mana should not have changed
      expect(magic.resourcePools.mana!.current).toBe(originalMana);
    });

    it('should allow retrying after registering calculators', () => {
      const service = SpellCastingService.getInstance();

      const magic: MagicComponent = {
        knownParadigmIds: ['academic'],
        activeParadigmId: 'academic',
        primarySource: 'arcane',
        manaPools: [],
        resourcePools: {
          mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
          stamina: { type: 'stamina', current: 100, maximum: 100, regenRate: 0.02, locked: 0 },
        },
        knownSpells: [],
        activeEffects: [],
      };

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

      const checkCosts = (service as any).checkCosts.bind(service);

      // First attempt: should fail
      expect(() => checkCosts(spell, magic)).toThrow();

      // Register calculators
      registerAllCostCalculators();

      // Second attempt: should succeed
      expect(() => checkCosts(spell, magic)).not.toThrow();
    });
  });
});
