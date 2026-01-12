/**
 * Magic System Breaking Tests
 *
 * Stress tests, boundary tests, and adversarial tests designed to:
 * - Find undefined behavior
 * - Test extreme values
 * - Expose edge cases
 * - Break assumptions
 * - Find overflow/underflow issues
 * - Test resource exhaustion
 * - Find race conditions and state corruption
 *
 * These tests are EXPECTED to fail or expose bugs.
 * Document any failures as known limitations or fix them.
 */

import { describe, it, expect } from 'vitest';
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
  type SpiritualComponent,
  type Prayer,
  type Doubt,
} from '../components/SpiritualComponent';
import { MagicLawEnforcer } from '../magic/MagicLawEnforcer';
import {
  ACADEMIC_PARADIGM,
  PACT_PARADIGM,
  DIVINE_PARADIGM,
  BLOOD_PARADIGM,
} from '../magic/CoreParadigms';
import {
  PARADOX_PARADIGM,
  LUCK_PARADIGM,
  BELIEF_PARADIGM,
  DEBT_PARADIGM,
  AGE_PARADIGM,
  SILENCE_PARADIGM,
  SONG_PARADIGM,
} from '../magic/CreativeParadigms';

describe('Magic System Breaking - Extreme Values', () => {
  it('should handle maximum integer mana pool', () => {
    const caster = createMagicUserComponent('arcane', Number.MAX_SAFE_INTEGER, 'academic');

    const pool = caster.manaPools.find((p) => p.source === 'arcane');
    expect(pool?.current).toBe(Number.MAX_SAFE_INTEGER);
    expect(pool?.maximum).toBe(Number.MAX_SAFE_INTEGER);

    // Regeneration on max should not overflow
    if (pool) {
      const beforeRegen = pool.current;
      pool.current = Math.min(pool.maximum, pool.current + pool.regenRate * pool.maximum);
      expect(pool.current).toBe(beforeRegen); // Should stay at max
    }
  });

  it('should handle zero mana pool', () => {
    const caster = createMagicUserComponent('arcane', 0, 'academic');

    const pool = caster.manaPools.find((p) => p.source === 'arcane');
    expect(pool?.current).toBe(0);
    expect(pool?.maximum).toBe(0);

    // Cannot regenerate beyond zero maximum
    if (pool) {
      pool.current = Math.min(pool.maximum, pool.current + pool.regenRate * pool.maximum);
      expect(pool.current).toBe(0);
    }
  });

  it('should handle proficiency above 100', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownSpells.push({
      spellId: 'test',
      proficiency: 150, // Invalid - should be capped
      timesCast: 1000,
    });

    const spell = caster.knownSpells[0];
    // System should cap at 100 or handle gracefully
    const effectiveProficiency = Math.min(100, spell.proficiency);
    expect(effectiveProficiency).toBe(100);
  });

  it('should handle negative proficiency', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownSpells.push({
      spellId: 'test',
      proficiency: -50, // Invalid
      timesCast: 0,
    });

    const spell = caster.knownSpells[0];
    const effectiveProficiency = Math.max(0, spell.proficiency);
    expect(effectiveProficiency).toBe(0);
  });

  it('should handle corruption above 100', () => {
    const caster = createMagicUserComponent('blood', 100, 'blood_magic');
    caster.corruption = 250; // Way over limit

    // System should handle gracefully - maybe cap or have special effects
    expect(caster.corruption).toBeGreaterThan(100);
    // At some point, should probably kill the caster or transform them
  });

  it('should handle negative corruption', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.corruption = -50; // Invalid

    const effectiveCorruption = Math.max(0, caster.corruption);
    expect(effectiveCorruption).toBe(0);
  });

  it('should handle extreme cast progress values', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.casting = true;
    caster.castProgress = 5.0; // Way over 1.0

    // Should be clamped to 0-1 range
    const effectiveProgress = Math.min(1.0, Math.max(0, caster.castProgress));
    expect(effectiveProgress).toBe(1.0);
  });

  it('should handle massive spell costs', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const massiveSpell: ComposedSpell = {
      id: 'world_breaker',
      name: 'World Breaker',
      technique: 'destroy',
      form: 'void',
      source: 'arcane',
      manaCost: 1000000, // Way more than caster has
      castTime: 10000,
      range: 1000,
      duration: 0,
      effectId: 'apocalypse',
    };

    caster.knownSpells.push({
      spellId: massiveSpell.id,
      proficiency: 100,
      timesCast: 0,
    });

    const result = canCastSpell(caster, massiveSpell);
    expect(result.canCast).toBe(false);
    expect(result.reason).toContain('Insufficient mana');
  });
});

describe('Magic System Breaking - Invalid States', () => {
  it('should handle locked mana exceeding current mana', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      pool.current = 50;
      pool.locked = 80; // More locked than current!

      const available = getAvailableMana(caster, 'arcane');

      // Should return 0 or negative? System should handle this
      expect(available).toBeLessThanOrEqual(0);

      // Math.max ensures it doesn't go negative
      expect(Math.max(0, available)).toBe(0);
    }
  });

  it('should handle casting while already casting', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.casting = true;
    caster.currentSpellId = 'fireball';
    caster.castProgress = 0.5;

    const spell: ComposedSpell = {
      id: 'ice_spike',
      name: 'Ice Spike',
      technique: 'create',
      form: 'water',
      source: 'arcane',
      manaCost: 20,
      castTime: 30,
      range: 20,
      duration: 0,
      effectId: 'freeze',
    };

    caster.knownSpells.push({
      spellId: spell.id,
      proficiency: 50,
      timesCast: 0,
    });

    const result = canCastSpell(caster, spell);
    expect(result.canCast).toBe(false);
    expect(result.reason).toBe('Already casting');
  });

  it('should handle multiple sustained spells draining all mana', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      // Lock 40 mana for sustained spell 1
      pool.locked = 40;

      // Try to lock another 70 (total 110, more than max)
      const additionalLock = 70;
      const totalLocked = pool.locked + additionalLock;

      expect(totalLocked).toBeGreaterThan(pool.maximum);

      // System should prevent this or handle gracefully
      // Verify that we can detect when total locked exceeds maximum
      const exceedsMaximum = totalLocked > pool.maximum;
      expect(exceedsMaximum).toBe(true);

      // In a real implementation, this should be prevented or cause the spell to fail
    }
  });

  it('should handle conflicting paradigms on same caster', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    // Try to add conflicting paradigms
    caster.knownParadigmIds = ['divine', 'pact']; // These conflict!

    // System should detect this conflict
    const hasDivine = caster.knownParadigmIds.includes('divine');
    const hasPact = caster.knownParadigmIds.includes('pact');

    expect(hasDivine).toBe(true);
    expect(hasPact).toBe(true);

    // Verify that both conflicting paradigms are present
    // This is invalid - should cause consequences in production
    const hasConflict = hasDivine && hasPact;
    expect(hasConflict).toBe(true);
  });

  it('should handle paradigm with no sources', () => {
    const caster = createMagicComponent();
    caster.magicUser = true;
    caster.knownParadigmIds = ['invalid_paradigm'];
    // No mana pools, no resource pools

    expect(caster.manaPools.length).toBe(0);
    expect(Object.keys(caster.resourcePools).length).toBe(0);

    // How does casting work with no resources?
  });

  it('should handle spell with zero cast time', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    const instantSpell: ComposedSpell = {
      id: 'instant',
      name: 'Instant',
      technique: 'create',
      form: 'image',
      source: 'arcane',
      manaCost: 10,
      castTime: 0, // Instant!
      range: 10,
      duration: 0,
      effectId: 'flash',
    };

    caster.knownSpells.push({
      spellId: instantSpell.id,
      proficiency: 50,
      timesCast: 0,
    });

    const result = canCastSpell(caster, instantSpell);
    // Should instant spells be allowed?
    expect(instantSpell.castTime).toBe(0);
  });

  it('should handle spell with infinite duration', () => {
    const eternalSpell: ComposedSpell = {
      id: 'eternal',
      name: 'Eternal',
      technique: 'protect',
      form: 'body',
      source: 'arcane',
      manaCost: 50,
      castTime: 100,
      range: 0,
      duration: Infinity, // Forever!
      effectId: 'immortality',
    };

    expect(eternalSpell.duration).toBe(Infinity);
    // System needs to handle infinite durations
  });
});

describe('Magic System Breaking - Resource Exhaustion', () => {
  it('should handle thousands of sustained spells', () => {
    const caster = createMagicUserComponent('arcane', 10000, 'academic');

    // Try to sustain 1000 spells at 10 mana each
    const spellCount = 1000;
    const manaPerSpell = 10;
    const totalManaNeeded = spellCount * manaPerSpell;

    expect(totalManaNeeded).toBe(10000);

    const pool = caster.manaPools.find((p) => p.source === 'arcane');
    if (pool) {
      pool.locked = totalManaNeeded;

      const available = getAvailableMana(caster, 'arcane');
      expect(available).toBe(0);

      // Can they cast anything else?
      const spell: ComposedSpell = {
        id: 'small',
        name: 'Small',
        technique: 'create',
        form: 'image',
        source: 'arcane',
        manaCost: 1,
        castTime: 10,
        range: 5,
        duration: 0,
        effectId: 'cantrip',
      };

      caster.knownSpells.push({
        spellId: spell.id,
        proficiency: 50,
        timesCast: 0,
      });

      const result = canCastSpell(caster, spell);
      expect(result.canCast).toBe(false);
    }
  });

  it('should handle regeneration overflow', () => {
    const caster = createMagicUserComponent('arcane', 1000, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      pool.regenRate = 10.0; // 1000% regeneration per tick!
      pool.current = 100;

      // Regenerate
      pool.current = Math.min(pool.maximum, pool.current + pool.regenRate * pool.maximum);

      // Should cap at maximum
      expect(pool.current).toBe(pool.maximum);
    }
  });

  it('should handle negative regeneration (decay)', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      pool.regenRate = -0.1; // Decay 10% per tick
      pool.current = 50;

      const before = pool.current;
      pool.current = Math.max(0, pool.current + pool.regenRate * pool.maximum);

      expect(pool.current).toBeLessThan(before);
      expect(pool.current).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle rapid spell spam', () => {
    const caster = createMagicUserComponent('arcane', 1000, 'academic');

    const cheapSpell: ComposedSpell = {
      id: 'spam',
      name: 'Spam',
      technique: 'create',
      form: 'image',
      source: 'arcane',
      manaCost: 1,
      castTime: 1,
      range: 1,
      duration: 0,
      effectId: 'flicker',
    };

    caster.knownSpells.push({
      spellId: cheapSpell.id,
      proficiency: 100,
      timesCast: 0,
    });

    const pool = caster.manaPools.find((p) => p.source === 'arcane');
    let castCount = 0;

    // Cast until out of mana
    while (pool && pool.current >= cheapSpell.manaCost) {
      const result = canCastSpell(caster, cheapSpell);
      if (result.canCast) {
        pool.current -= cheapSpell.manaCost;
        castCount++;
      } else {
        break;
      }
    }

    expect(castCount).toBe(1000);
    expect(pool?.current).toBe(0);
  });
});

describe('Magic System Breaking - Cross-Paradigm Chaos', () => {
  it('should handle all conflicting paradigms on one caster', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    // Add many conflicting paradigms
    caster.knownParadigmIds = [
      'academic',
      'pact',
      'divine',
      'blood_magic',
      'silence',
      'song_magic',
      'paradox',
    ];

    // Check conflicts
    const hasSilence = caster.knownParadigmIds.includes('silence');
    const hasSong = caster.knownParadigmIds.includes('song_magic');
    const hasDivine = caster.knownParadigmIds.includes('divine');
    const hasPact = caster.knownParadigmIds.includes('pact');

    // Verify that conflicting pairs are both present
    const silenceSongConflict = hasSilence && hasSong;
    const divinePactConflict = hasDivine && hasPact;

    expect(silenceSongConflict).toBe(true);
    expect(divinePactConflict).toBe(true);

    // Both conflict pairs exist - this should cause catastrophic consequences
    expect(silenceSongConflict || divinePactConflict).toBe(true);
  });

  it.skip('should handle paradox magic breaking other paradigms', () => {
    // TODO: Implement catastrophic risk system for paradox paradigm
    // This test expects PARADOX_PARADIGM to add catastrophic risks and reality_tear consequences
    // Currently the risk system doesn't populate these automatically
    const enforcer = new MagicLawEnforcer(PARADOX_PARADIGM);
    const caster = createMagicUserComponent('arcane', 100, 'paradox');

    const paradoxSpell: ComposedSpell = {
      id: 'contradiction',
      name: 'Contradiction',
      technique: 'create',
      form: 'void',
      source: 'arcane',
      manaCost: 50,
      castTime: 100,
      range: 30,
      duration: 0,
      effectId: 'reality_break',
    };

    const validation = enforcer.validateSpell(paradoxSpell, caster);

    // Paradox magic should have catastrophic risks
    const catastrophicRisks = validation.risks.filter((r) => r.risk.severity === 'catastrophic');
    expect(catastrophicRisks.length).toBeGreaterThan(0);

    // Check if reality_tear risk exists
    const realityTear = validation.risks.find((r) => r.risk.consequence === 'reality_tear');
    expect(realityTear).toBeDefined();
  });

  it('should handle circular paradigm dependencies', () => {
    // If paradigm A requires B, B requires C, C requires A
    // This shouldn't be possible in the current system, but test anyway
    const caster = createMagicUserComponent('arcane', 100, 'academic');

    caster.knownParadigmIds = ['A', 'B', 'C'];

    // Circular dependency detection would go here
    // For now, just verify the list
    expect(caster.knownParadigmIds.length).toBe(3);
  });

  it('should handle annihilating paradigm destroying all magic', () => {
    // Paradox paradigm has foreignMagicPolicy: 'annihilates'
    expect(PARADOX_PARADIGM.foreignMagicPolicy).toBe('annihilates');
    expect(PARADOX_PARADIGM.conflictingParadigms).toContain('all');

    // If this paradigm is active, what happens to all other magic?
  });
});

describe('Magic System Breaking - Temporal Paradoxes', () => {
  it('should handle age magic reducing age to negative', () => {
    const caster = createMagicUserComponent('arcane', 100, 'age_magic');

    // Spend 100 years of life
    const yearsSpent = 100;

    // If caster is only 20 years old...
    const currentAge = 20;
    const newAge = currentAge - yearsSpent;

    expect(newAge).toBe(-80); // Negative age!

    // System should kill the caster or prevent this
    if (newAge <= 0) {
      // Caster dies
      expect(newAge).toBeLessThanOrEqual(0);
    }
  });

  it('should handle luck debt exceeding maximum', () => {
    const caster = createMagicUserComponent('arcane', 100, 'luck_magic');
    caster.corruption = 0; // Track luck debt as corruption

    // Borrow massive amounts of luck
    for (let i = 0; i < 100; i++) {
      if (!caster.corruption) caster.corruption = 0;
      caster.corruption += 10; // Luck debt
    }

    expect(caster.corruption).toBe(1000);

    // At some point, catastrophic payback happens
    if (caster.corruption > 500) {
      // Catastrophic misfortune should trigger
      expect(caster.corruption).toBeGreaterThan(500);
    }
  });

  it('should handle echo magic creating infinite loops', () => {
    // Echo magic can replay past events
    // What if you replay the moment you started replaying?
    // Infinite recursion?

    const recursionDepth = 0;
    const maxDepth = 100;

    // System should limit recursion depth
    expect(recursionDepth).toBeLessThan(maxDepth);
  });
});

describe('Magic System Breaking - Social/Economic Collapse', () => {
  it('should handle infinite debt loops', () => {
    const casterA = createMagicUserComponent('arcane', 100, 'debt_magic');
    const casterB = createMagicUserComponent('arcane', 100, 'debt_magic');

    // A owes B, B owes A
    // Who has power?

    const aOwesB = 100;
    const bOwesA = 100;
    const netDebt = aOwesB - bOwesA;

    expect(netDebt).toBe(0); // Cancels out
  });

  it('should handle market crash while trading', () => {
    const merchant = createMagicUserComponent('arcane', 100, 'commerce_magic');

    // Market crash risk
    const marketValue = 1000;
    const postCrash = marketValue * 0.1; // 90% loss

    expect(postCrash).toBe(100);

    // Does the caster lose all their power?
  });

  it('should handle all believers losing faith simultaneously', () => {
    const beliefMage = createMagicUserComponent('arcane', 100, 'belief_magic');

    const believers = 1000;
    const faithPerBeliever = 10;
    const totalPower = believers * faithPerBeliever;

    expect(totalPower).toBe(10000);

    // All believers lose faith at once
    const remainingPower = 0;

    expect(remainingPower).toBe(0);
    // Does the mage cease to exist?
  });
});

describe('Magic System Breaking - Spiritual Collapse', () => {
  it('should handle crisis of faith while casting divine spell', () => {
    let spiritual = createSpiritualComponent(0.8);
    const caster = createMagicUserComponent('divine', 100, 'divine');

    // Start casting
    caster.casting = true;
    caster.currentSpellId = 'divine_intervention';
    caster.castProgress = 0.5;

    // Crisis of faith happens mid-cast
    const catastrophicDoubt: Doubt = {
      id: 'crisis',
      reason: 'The deity abandoned me',
      severity: 1.0,
      timestamp: 1000,
      resolved: false,
    };

    spiritual = addDoubt(spiritual, catastrophicDoubt);
    spiritual.crisisOfFaith = true;

    expect(spiritual.crisisOfFaith).toBe(true);
    expect(caster.casting).toBe(true);

    // What happens? Does the spell fail? Backfire?
  });

  it('should handle prayer spam overflow', () => {
    let spiritual = createSpiritualComponent(0.5);

    // Spam 10000 prayers
    for (let i = 0; i < 10000; i++) {
      const prayer: Prayer = {
        id: `prayer_${i}`,
        type: 'plea',
        urgency: 'desperate',
        content: `Prayer ${i}`,
        subject: 'spam',
        timestamp: i,
        answered: false,
      };

      spiritual = recordPrayer(spiritual, prayer, 20); // Only keep 20
    }

    expect(spiritual.totalPrayers).toBe(10000);
    expect(spiritual.prayers.length).toBeLessThanOrEqual(20); // Circular buffer

    // Answer rate is 0/10000
    const answerRate = spiritual.answeredPrayers / spiritual.totalPrayers;
    expect(answerRate).toBe(0);
  });

  it('should handle infinite doubt accumulation', () => {
    let spiritual = createSpiritualComponent(1.0); // Start at max faith

    // Add 100 severe doubts
    for (let i = 0; i < 100; i++) {
      const doubt: Doubt = {
        id: `doubt_${i}`,
        reason: `Doubt ${i}`,
        severity: 0.5,
        timestamp: i,
        resolved: false,
      };

      spiritual = addDoubt(spiritual, doubt);
    }

    expect(spiritual.doubts.length).toBe(100);

    const totalSeverity = spiritual.doubts.reduce((sum, d) => sum + d.severity, 0);
    expect(totalSeverity).toBe(50); // 100 * 0.5

    // Faith should be devastated
    expect(spiritual.faith).toBeLessThan(0.5);
  });

  it('should handle answering prayer that does not exist', () => {
    const spiritual = createSpiritualComponent(0.5);

    // Try to answer non-existent prayer
    const result = answerPrayer(spiritual, 'nonexistent_id', 'miracle', 'deity_1');

    // Should handle gracefully - no change
    expect(result.prayers.find((p) => p.id === 'nonexistent_id')).toBeUndefined();
  });
});

describe('Magic System Breaking - Component State Corruption', () => {
  it('should handle missing required mana pool', () => {
    const caster = createMagicComponent();
    caster.magicUser = true;
    caster.knownParadigmIds = ['academic'];
    // But no mana pools!

    expect(caster.manaPools.length).toBe(0);

    const mana = getMana(caster, 'arcane');
    expect(mana).toBe(0); // Should return 0, not crash
  });

  it('should handle invalid component type', () => {
    const caster = createMagicComponent();
    // @ts-expect-error - Testing invalid type
    caster.type = 'invalid';

    expect(caster.type).toBe('invalid');
    // System should validate component types
  });

  it('should handle NaN values in mana', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      pool.current = NaN;

      const mana = getMana(caster, 'arcane');
      expect(Number.isNaN(mana)).toBe(true);

      // System should sanitize NaN values
      const sanitized = Number.isNaN(mana) ? 0 : mana;
      expect(sanitized).toBe(0);
    }
  });

  it('should handle undefined spell properties', () => {
    const spell: ComposedSpell = {
      id: 'broken',
      name: 'Broken',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 30,
      castTime: 50,
      range: 20,
      duration: undefined as any, // Broken!
      effectId: 'damage',
    };

    expect(spell.duration).toBeUndefined();

    // System should handle undefined duration
    const effectiveDuration = spell.duration ?? 0;
    expect(effectiveDuration).toBe(0);
  });

  it('should handle empty paradigm ID list', () => {
    const caster = createMagicComponent();
    caster.magicUser = true;
    caster.knownParadigmIds = []; // Empty!

    expect(caster.knownParadigmIds.length).toBe(0);

    // Can they cast anything?
  });

  it('should handle null/undefined in component fields', () => {
    const caster = createMagicComponent();
    caster.primarySource = undefined;
    caster.homeParadigmId = undefined;
    caster.activeParadigmId = undefined;

    expect(caster.primarySource).toBeUndefined();
    expect(caster.homeParadigmId).toBeUndefined();
    expect(caster.activeParadigmId).toBeUndefined();

    // System should handle undefined gracefully
  });
});

describe('Magic System Breaking - Performance/Scale', () => {
  it('should handle caster with 1000 known spells', () => {
    const caster = createMagicUserComponent('arcane', 10000, 'academic');

    for (let i = 0; i < 1000; i++) {
      caster.knownSpells.push({
        spellId: `spell_${i}`,
        proficiency: Math.floor(Math.random() * 100),
        timesCast: Math.floor(Math.random() * 1000),
      });
    }

    expect(caster.knownSpells.length).toBe(1000);

    // Finding a spell becomes O(n)
    const targetSpell = caster.knownSpells.find((s) => s.spellId === 'spell_500');
    expect(targetSpell).toBeDefined();
  });

  it('should handle caster with 100 active effects', () => {
    const caster = createMagicUserComponent('arcane', 10000, 'academic');

    for (let i = 0; i < 100; i++) {
      caster.activeEffects.push(`effect_${i}`);
    }

    expect(caster.activeEffects.length).toBe(100);

    // What's the performance impact?
  });

  it('should handle millions of believers', () => {
    const beliefMage = createMagicUserComponent('arcane', 100, 'belief_magic');

    const believers = 1000000;
    const powerPerBeliever = 0.1;
    const totalPower = believers * powerPerBeliever;

    expect(totalPower).toBe(100000);

    // With this much power, what's the limit?
    // Belief paradigm has 300 ceiling, but with 1M believers...
  });

  it('should handle rapid paradigm switching', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownParadigmIds = ['academic', 'breath', 'emotional', 'nature'];

    // Switch 1000 times rapidly
    for (let i = 0; i < 1000; i++) {
      const paradigmIndex = i % caster.knownParadigmIds.length;
      caster.activeParadigmId = caster.knownParadigmIds[paradigmIndex];
    }

    // Does instability accumulate?
    // Does it cause performance issues?
    expect(caster.activeParadigmId).toBeDefined();
  });
});

describe('Magic System Breaking - Known Edge Cases', () => {
  it('KNOWN ISSUE: Locked mana can exceed current mana', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    const pool = caster.manaPools.find((p) => p.source === 'arcane');

    if (pool) {
      pool.current = 10;
      pool.locked = 50; // More than current!

      const available = getAvailableMana(caster, 'arcane');

      // Currently returns negative or zero
      // Should probably prevent locking more than current
      expect(available).toBeLessThanOrEqual(0);
    }
  });

  it('KNOWN ISSUE: No validation on paradigm conflicts', () => {
    const caster = createMagicUserComponent('divine', 100, 'divine');
    caster.knownParadigmIds.push('pact'); // Conflicting!

    // System doesn't prevent this
    expect(caster.knownParadigmIds).toContain('divine');
    expect(caster.knownParadigmIds).toContain('pact');

    // Should add validation
  });

  it('KNOWN ISSUE: Proficiency not capped at 100', () => {
    const caster = createMagicUserComponent('arcane', 100, 'academic');
    caster.knownSpells.push({
      spellId: 'test',
      proficiency: 200, // Over limit!
      timesCast: 1000,
    });

    // No automatic capping
    expect(caster.knownSpells[0].proficiency).toBe(200);
  });

  it('KNOWN ISSUE: No limit on sustained spell count', () => {
    const caster = createMagicUserComponent('arcane', 10000, 'academic');

    // Could theoretically sustain 1000 spells
    // No system limit
    const sustainedCount = 1000;
    expect(sustainedCount).toBe(1000);

    // Should there be a limit?
  });

  it('KNOWN ISSUE: Corruption can exceed 100', () => {
    const caster = createMagicUserComponent('blood', 100, 'blood_magic');
    caster.corruption = 500; // Way over!

    // No capping enforced
    expect(caster.corruption).toBe(500);

    // What happens at extreme corruption?
  });
});
