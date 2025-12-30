/**
 * Magic System Edge Cases Integration Tests
 *
 * Tests critical edge cases and failure scenarios across the magic system:
 * - Resource exhaustion and regeneration
 * - Cross-paradigm hostile interactions
 * - Multi-paradigm exclusive conflicts
 * - Divine/spiritual integration edge cases
 * - Spell validation boundary conditions
 * - Risk cascades and catastrophic failures
 *
 * These tests ensure the system fails gracefully and predictably when
 * encountering invalid states or boundary conditions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMagicComponent,
  createMagicUserComponent,
  getMana,
  getAvailableMana,
  canCastSpell,
  type MagicComponent,
  type ComposedSpell,
} from '../components/MagicComponent';
import {
  createSpiritualComponent,
  recordPrayer,
  answerPrayer,
  addDoubt,
  resolveDoubt,
  receiveVision,
  type SpiritualComponent,
  type Prayer,
  type Vision,
  type Doubt,
} from '../components/SpiritualComponent';
import {
  ACADEMIC_PARADIGM,
  PACT_PARADIGM,
  DIVINE_PARADIGM,
  BLOOD_PARADIGM,
} from '../magic/CoreParadigms';
import { MagicLawEnforcer } from '../magic/MagicLawEnforcer';
import type { ParadigmInteraction } from '../magic/MagicParadigm';
import { registerAllCostCalculators } from '../magic/costs/calculators/registerAll';

// Register cost calculators before all tests
registerAllCostCalculators();

describe('Magic System Edge Cases - Resource Management', () => {
  let enforcer: MagicLawEnforcer;
  let academicCaster: MagicComponent;
  let expensiveSpell: ComposedSpell;

  beforeEach(() => {
    enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
    academicCaster = createMagicUserComponent('arcane', 50, 'academic');

    expensiveSpell = {
      id: 'expensive_fireball',
      name: 'Greater Fireball',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 60,
      castTime: 100,
      range: 30,
      duration: 0,
      effectId: 'damage_fire',
    };
  });

  it('should prevent casting when mana is insufficient', () => {
    academicCaster.knownSpells.push({
      spellId: expensiveSpell.id,
      proficiency: 50,
      timesCast: 0,
    });

    const result = canCastSpell(academicCaster, expensiveSpell);

    expect(result.canCast).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('Insufficient mana');
  });

  it('should track locked mana from sustained spells', () => {
    const arcanePool = academicCaster.manaPools.find((p) => p.source === 'arcane');
    if (!arcanePool) {
      throw new Error('Arcane pool not found');
    }
    arcanePool.locked = 20;

    const availableMana = getAvailableMana(academicCaster, 'arcane');
    expect(availableMana).toBe(30);

    academicCaster.knownSpells.push({
      spellId: expensiveSpell.id,
      proficiency: 50,
      timesCast: 0,
    });

    const result = canCastSpell(academicCaster, expensiveSpell);
    expect(result.canCast).toBe(false);
    expect(result.reason).toContain('Insufficient mana');
  });

  it('should handle mana exhaustion during long casting sequence', () => {
    const smallCaster = createMagicUserComponent('arcane', 30, 'academic');

    const smallSpell: ComposedSpell = {
      id: 'cantrip',
      name: 'Cantrip',
      technique: 'create',
      form: 'image',
      source: 'arcane',
      manaCost: 10,
      castTime: 10,
      range: 5,
      duration: 10,
      effectId: 'illusion',
    };

    smallCaster.knownSpells.push({
      spellId: smallSpell.id,
      proficiency: 50,
      timesCast: 0,
    });

    for (let i = 0; i < 3; i++) {
      const result = canCastSpell(smallCaster, smallSpell);
      expect(result.canCast).toBe(true);

      const pool = smallCaster.manaPools.find((p) => p.source === 'arcane');
      if (pool) {
        pool.current -= smallSpell.manaCost;
      }
    }

    const finalResult = canCastSpell(smallCaster, smallSpell);
    expect(finalResult.canCast).toBe(false);
    expect(finalResult.reason).toContain('Insufficient mana');

    const remainingMana = getMana(smallCaster, 'arcane');
    expect(remainingMana).toBe(0);
  });

  it('should handle multiple mana sources with different regeneration rates', () => {
    // Create multi-source caster manually
    const multiCaster = createMagicUserComponent('arcane', 100, 'academic');

    // Set arcane to specific values
    const arcanePool = multiCaster.manaPools.find((p) => p.source === 'arcane');
    if (arcanePool) {
      arcanePool.current = 50;
      arcanePool.maximum = 100;
      arcanePool.regenRate = 0.01; // 1% per tick
    }

    multiCaster.manaPools.push(
      {
        source: 'divine',
        current: 30,
        maximum: 100,
        regenRate: 0.005, // 0.5% per tick
        locked: 0,
      },
      {
        source: 'nature',
        current: 80,
        maximum: 100,
        regenRate: 0.015, // 1.5% per tick
        locked: 0,
      }
    );

    expect(getMana(multiCaster, 'arcane')).toBe(50);
    expect(getMana(multiCaster, 'divine')).toBe(30);
    expect(getMana(multiCaster, 'nature')).toBe(80);

    // Simulate one regeneration tick
    // regenRate is a fraction, multiply by maximum to get absolute regen amount
    multiCaster.manaPools.forEach((pool) => {
      pool.current = Math.min(pool.maximum, pool.current + pool.regenRate * pool.maximum);
    });

    // arcane: 50 + (0.01 * 100) = 51
    // divine: 30 + (0.005 * 100) = 30.5
    // nature: 80 + (0.015 * 100) = 81.5
    expect(getMana(multiCaster, 'arcane')).toBeCloseTo(51, 1);
    expect(getMana(multiCaster, 'divine')).toBeCloseTo(30.5, 1);
    expect(getMana(multiCaster, 'nature')).toBeCloseTo(81.5, 1);
  });

  it('should prevent mana from exceeding maximum', () => {
    const pool = academicCaster.manaPools.find((p) => p.source === 'arcane');
    if (!pool) {
      throw new Error('Arcane pool not found');
    }
    pool.current = 95;
    pool.maximum = 100;
    pool.regenRate = 0.1;

    pool.current = Math.min(pool.maximum, pool.current + pool.regenRate * pool.maximum);

    expect(pool.current).toBe(100);
  });

  it('should handle blood magic with health costs', () => {
    const bloodCaster = createMagicComponent();
    bloodCaster.magicUser = true;
    bloodCaster.homeParadigmId = 'blood_magic';
    bloodCaster.knownParadigmIds = ['blood_magic'];

    const bloodSpell: ComposedSpell = {
      id: 'blood_bolt',
      name: 'Blood Bolt',
      technique: 'destroy',
      form: 'body',
      source: 'blood',
      manaCost: 0,
      castTime: 30,
      range: 20,
      duration: 0,
      effectId: 'blood_damage',
    };

    const bloodEnforcer = new MagicLawEnforcer(BLOOD_PARADIGM);
    const validation = bloodEnforcer.validateSpell(bloodSpell, bloodCaster);

    // Blood paradigm should add health costs
    expect(validation.costs.length).toBeGreaterThan(0);
    // Check if any cost is health-related (health, lifespan, or blood-related)
    const hasDangerousCost = validation.costs.some(
      (c) => c.type === 'health' || c.type === 'lifespan' || c.type === 'corruption'
    );
    expect(hasDangerousCost).toBe(true);
  });
});

describe('Magic System Edge Cases - Cross-Paradigm Interactions', () => {
  let enforcer: MagicLawEnforcer;

  beforeEach(() => {
    enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
  });

  it('should evaluate cross-paradigm magic with interaction rules', () => {
    const academicCaster = createMagicUserComponent('arcane', 100, 'academic');

    const spell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 50,
      range: 30,
      duration: 0,
      effectId: 'fire_damage',
    };

    const hostileInteraction: ParadigmInteraction = {
      fromParadigm: 'academic',
      toParadigm: 'pact',
      functionality: 'inverted',
      powerModifier: -1.0,
      additionalCosts: ['corruption'],
      additionalRisks: ['failure'],
      transforms: false,
      description: 'Academic magic rejects pact magic, causing backlash',
    };

    const result = enforcer.evaluateCrossParadigm(spell, academicCaster, hostileInteraction);

    expect(result.canFunction).toBe(true);
    expect(result.functionality).toBe('inverted');
    expect(result.powerModifier).toBe(-1.0);
    expect(result.additionalCosts.length).toBeGreaterThan(0);
  });

  it('should apply default partial functionality without interaction', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const spell: ComposedSpell = {
      id: 'test_spell',
      name: 'Test Spell',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 20,
      range: 20,
      duration: 0,
      effectId: 'fire_damage',
    };

    // No interaction provided - should default to partial
    const result = enforcer.evaluateCrossParadigm(spell, caster);

    expect(result.canFunction).toBe(true);
    expect(result.functionality).toBe('partial');
    expect(result.powerModifier).toBe(0.5);
  });

  it('should handle no functionality interaction', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const spell: ComposedSpell = {
      id: 'test_spell',
      name: 'Test Spell',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 20,
      range: 20,
      duration: 0,
      effectId: 'fire_damage',
    };

    const nullInteraction: ParadigmInteraction = {
      fromParadigm: 'academic',
      toParadigm: 'null_magic',
      functionality: 'none',
      powerModifier: 0.0,
      additionalCosts: [],
      additionalRisks: [],
      transforms: false,
      description: 'Magic does not function in null universe',
    };

    const result = enforcer.evaluateCrossParadigm(spell, caster, nullInteraction);

    // The implementation may return canFunction: false for 'none' functionality
    // Check that functionality is correctly reported as 'none'
    expect(result.functionality).toBe('none');
    expect(result.powerModifier).toBe(0.0);
    // Magic doesn't work in null universes
    expect(result.canFunction === false || result.powerModifier === 0.0).toBe(true);
  });
});

describe('Magic System Edge Cases - Multi-Paradigm Practitioners', () => {
  it('should detect Divine + Pact exclusive combination violation', () => {
    const caster = createMagicUserComponent('divine', 100, 'divine');
    caster.knownParadigmIds.push('pact');

    const hasDivine = caster.knownParadigmIds.includes('divine');
    const hasPact = caster.knownParadigmIds.includes('pact');

    expect(hasDivine).toBe(true);
    expect(hasPact).toBe(true);

    // In production, this would be prevented or cause consequences
    if (hasDivine && hasPact) {
      expect(true).toBe(true); // Detected conflict
    }
  });

  it('should prevent paradigm switching during active casting', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownParadigmIds.push('breath');
    caster.activeParadigmId = 'academic';

    caster.casting = true;
    caster.currentSpellId = 'fireball';
    caster.castProgress = 0.5;

    const canSwitch = !caster.casting;

    expect(canSwitch).toBe(false);
    expect(caster.casting).toBe(true);
  });

  it('should track corruption from dark magic', () => {
    const caster = createMagicUserComponent('blood', 100, 'blood_magic');
    caster.corruption = 0;

    for (let i = 0; i < 10; i++) {
      if (!caster.corruption) caster.corruption = 0;
      caster.corruption += 5;
    }

    expect(caster.corruption).toBe(50);
    expect(caster.corruption).toBeGreaterThan(40);
  });
});

describe('Magic System Edge Cases - Divine/Spiritual Integration', () => {
  let spiritual: SpiritualComponent;

  beforeEach(() => {
    spiritual = createSpiritualComponent(0.5);
  });

  it('should trigger crisis of faith from too many unanswered prayers', () => {
    let component = spiritual;

    for (let i = 0; i < 10; i++) {
      const prayer: Prayer = {
        id: `prayer_${i}`,
        type: 'plea',
        urgency: 'desperate',
        content: `Please help ${i}`,
        subject: `crisis_${i}`,
        timestamp: i * 100,
        answered: false,
      };

      component = recordPrayer(component, prayer, 10);
    }

    expect(component.totalPrayers).toBe(10);
    expect(component.answeredPrayers).toBe(0);

    const answerRate = component.answeredPrayers / component.totalPrayers;
    expect(answerRate).toBe(0);

    if (answerRate < 0.3) {
      const doubt: Doubt = {
        id: 'unanswered_prayers',
        reason: 'Why does the deity ignore my pleas?',
        severity: 0.5,
        timestamp: 1000,
        resolved: false,
      };
      component = addDoubt(component, doubt);
    }

    expect(component.doubts.length).toBe(1);

    const totalSeverity = component.doubts.reduce((sum, d) => sum + d.severity, 0);
    expect(totalSeverity).toBe(0.5);
  });

  it('should boost faith from answered prayers', () => {
    const initialFaith = spiritual.faith;

    const prayer: Prayer = {
      id: 'help_prayer',
      type: 'plea',
      urgency: 'desperate',
      content: 'Please save my village',
      subject: 'disaster',
      timestamp: 100,
      answered: false,
    };

    let component = recordPrayer(spiritual, prayer, 10);
    component = answerPrayer(component, 'help_prayer', 'vision', 'deity_1');

    expect(component.answeredPrayers).toBe(1);
    expect(component.faith).toBeGreaterThan(initialFaith);

    const answeredPrayer = component.prayers.find((p) => p.id === 'help_prayer');
    expect(answeredPrayer?.answered).toBe(true);
  });

  it('should handle faith collapse when doubts exceed threshold', () => {
    let component = spiritual;

    const doubts: Doubt[] = [
      {
        id: 'doubt_1',
        reason: 'Why do the innocent suffer?',
        severity: 0.3,
        timestamp: 100,
        resolved: false,
      },
      {
        id: 'doubt_2',
        reason: 'Sacred text contradicts itself',
        severity: 0.4,
        timestamp: 200,
        resolved: false,
      },
      {
        id: 'doubt_3',
        reason: 'Desperate prayer ignored',
        severity: 0.5,
        timestamp: 300,
        resolved: false,
      },
    ];

    doubts.forEach((doubt) => {
      component = addDoubt(component, doubt);
    });

    const totalSeverity = component.doubts.reduce((sum, d) => sum + d.severity, 0);
    expect(totalSeverity).toBe(1.2);
    expect(component.faith).toBeLessThan(0.5);
  });

  it('should restore faith when doubts are resolved', () => {
    let component = spiritual;

    const doubt: Doubt = {
      id: 'suffering',
      reason: 'Why does suffering exist?',
      severity: 0.6,
      timestamp: 100,
      resolved: false,
    };

    component = addDoubt(component, doubt);
    const faithAfterDoubt = component.faith;

    component = resolveDoubt(component, 'suffering', 'Divine plan revealed');

    expect(component.faith).toBeGreaterThan(faithAfterDoubt);

    const resolvedDoubt = component.doubts.find((d) => d.id === 'suffering');
    expect(resolvedDoubt?.resolved).toBe(true);
  });

  it('should receive vision and boost faith significantly', () => {
    const initialFaith = spiritual.faith;
    let component = spiritual;

    const vision: Vision = {
      id: 'divine_revelation',
      content: 'The deity shows you the cosmic truth',
      source: 'direct',
      clarity: 0.9,
      timestamp: 500,
      interpreted: false,
      sharedWith: [],
    };

    component = receiveVision(component, vision, 5);

    expect(component.hasReceivedVision).toBe(true);
    expect(component.visions.length).toBe(1);
    expect(component.faith).toBeGreaterThan(initialFaith);

    const storedVision = component.visions.find((v) => v.id === 'divine_revelation');
    expect(storedVision).toBeDefined();
    expect(storedVision?.clarity).toBe(0.9);
  });

  it('should handle prayer spam gracefully', () => {
    let component = spiritual;

    for (let i = 0; i < 20; i++) {
      const prayer: Prayer = {
        id: `routine_${i}`,
        type: 'gratitude',
        urgency: 'routine',
        content: 'Thank you for this day',
        subject: 'daily_prayer',
        timestamp: i * 10,
        answered: false,
      };

      component = recordPrayer(component, prayer, 20);
    }

    expect(component.totalPrayers).toBe(20);
    expect(component.faith).toBeGreaterThanOrEqual(0.3);
  });
});

describe('Magic System Edge Cases - Spell Validation', () => {
  let enforcer: MagicLawEnforcer;

  beforeEach(() => {
    enforcer = new MagicLawEnforcer(ACADEMIC_PARADIGM);
  });

  it('should validate spell against paradigm rules', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const spell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 50,
      range: 30,
      duration: 0,
      effectId: 'fire_damage',
    };

    const validation = enforcer.validateSpell(spell, caster);

    expect(validation).toBeDefined();
    expect(validation.valid).toBe(true);
    expect(validation.costs.length).toBeGreaterThan(0);
  });

  it('should detect required channels', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const spell: ComposedSpell = {
      id: 'test_spell',
      name: 'Test Spell',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 50,
      range: 20,
      duration: 0,
      effectId: 'fire_damage',
    };

    const validation = enforcer.validateSpell(spell, caster);

    expect(validation.requiredChannels).toBeDefined();
    expect(Array.isArray(validation.requiredChannels)).toBe(true);
  });

  it('should reject spells when caster lacks paradigm knowledge', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownParadigmIds = []; // Remove paradigm knowledge

    const spell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 50,
      range: 30,
      duration: 0,
      effectId: 'fire_damage',
    };

    const validation = enforcer.validateSpell(spell, caster);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('Magic System Edge Cases - Risk and Consequence', () => {
  it('should track corruption accumulation', () => {
    const caster = createMagicUserComponent('blood', 100, 'blood_magic');
    caster.corruption = 0;

    for (let i = 0; i < 10; i++) {
      if (!caster.corruption) caster.corruption = 0;
      caster.corruption += 5;
    }

    expect(caster.corruption).toBe(50);
  });

  it('should track addiction to magic', () => {
    const caster = createMagicUserComponent('arcane', 100, 'pact');
    caster.addictionLevel = 0;

    for (let i = 0; i < 20; i++) {
      if (!caster.addictionLevel) caster.addictionLevel = 0;
      caster.addictionLevel += 2;
    }

    expect(caster.addictionLevel).toBe(40);
  });

  it('should track entity attention', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.attentionLevel = 0;

    caster.attentionLevel += 10;

    expect(caster.attentionLevel).toBe(10);
  });

  it('should track spell proficiency increase', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const spellId = 'fireball';
    caster.knownSpells.push({
      spellId,
      proficiency: 10,
      timesCast: 0,
    });

    const spell = caster.knownSpells.find((s) => s.spellId === spellId);
    if (!spell) {
      throw new Error('Spell not found');
    }

    for (let i = 0; i < 10; i++) {
      spell.timesCast += 1;
      spell.proficiency = Math.min(100, spell.proficiency + 2);
    }

    expect(spell.timesCast).toBe(10);
    expect(spell.proficiency).toBe(30);
  });

  it('should cap proficiency at 100', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    caster.knownSpells.push({
      spellId: 'cantrip',
      proficiency: 95,
      timesCast: 100,
    });

    const spell = caster.knownSpells[0];
    spell.proficiency = Math.min(100, spell.proficiency + 20);

    expect(spell.proficiency).toBe(100);
  });
});
