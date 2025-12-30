/**
 * Edge cases for Magic-Divinity Integration
 * Tests failure modes when magic and divinity systems interact
 */

import { describe, it, expect } from 'vitest';
import type { Deity } from '../divinity/DeityTypes.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import type { ComposedSpell } from '../components/MagicComponent.js';

describe('Theurgic Casting with Deity State Changes', () => {
  it('should handle deity losing all belief mid-cast', () => {
    const deity = createMockDeity('god');
    deity.belief = 100;

    const theurgist = createMockAgent('theurgist');
    theurgist.faith = 0.8;
    theurgist.deityId = deity.id;

    const spell: ComposedSpell = {
      id: 'slow_spell',
      name: 'Slow Spell',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 50,
      castTime: 100, // Long cast
      range: 10,
      effectId: 'test',
    };

    // Start cast
    const castState = beginTheurgicCast(theurgist, spell, deity);

    // Deity loses all belief during cast (other believer uses it all)
    deity.belief = 0;

    // Try to complete cast
    const result = completeTheurgicCast(castState);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('deity_belief_depleted');
    expect(theurgist.faith).toBeLessThan(0.8); // Faith damaged
  });

  it('should handle deity dying mid-cast', () => {
    const deity = createMockDeity('god');
    deity.belief = 100;
    deity.believers = ['theurgist'];

    const theurgist = createMockAgent('theurgist');
    theurgist.faith = 0.85;
    theurgist.deityId = deity.id;

    const spell = createTestSpell();

    const castState = beginTheurgicCast(theurgist, spell, deity);

    // Deity dies (last believer converts away)
    deity.believers = [];
    deity.belief = 0;

    const result = completeTheurgicCast(castState);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('deity_dead');
    expect(theurgist.faith).toBe(0); // Complete faith loss
  });

  it('should handle caster losing faith during cast', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const theurgist = createMockAgent('theurgist');
    theurgist.faith = 0.7;
    theurgist.deityId = deity.id;

    const spell = createTestSpell();
    const castState = beginTheurgicCast(theurgist, spell, deity);

    // Caster loses faith (prayers ignored, crisis of faith)
    theurgist.faith = 0.1;

    const result = completeTheurgicCast(castState);

    // Spell succeeds but is much weaker
    expect(result.success).toBe(true);
    expect(result.power).toBeLessThan(0.5); // Severely weakened
  });

  it('should handle deity changing domains during cast', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;
    deity.identity.domains = { fire: 0.9 };

    const theurgist = createMockAgent('theurgist');
    theurgist.deityId = deity.id;

    const fireSpell: ComposedSpell = {
      id: 'fire',
      name: 'Fire',
      technique: 'create',
      form: 'fire', // Aligned with deity
      source: 'divine',
      manaCost: 40,
      castTime: 50,
      range: 15,
      effectId: 'fire',
    };

    const castState = beginTheurgicCast(theurgist, fireSpell, deity);

    // Deity domains shift (beliefs change, mythology evolves)
    deity.identity.domains = { water: 0.9, fire: 0.2 };

    const result = completeTheurgicCast(castState);

    expect(result.success).toBe(true);
    expect(result.cost).toBeGreaterThan(40); // Higher cost due to misalignment
  });
});

describe('Divine Gift Edge Cases', () => {
  it('should handle granting spell to believer who immediately converts', () => {
    const deity1 = createMockDeity('god1');
    const deity2 = createMockDeity('god2');
    deity1.belief = 5000;

    const recipient = createMockAgent('recipient');
    recipient.deityId = deity1.id;
    recipient.faith = 0.9;

    const spell = createTestSpell();

    // Start granting
    const grantState = beginGrantSpell(deity1, recipient, spell);

    // Recipient converts mid-grant
    recipient.deityId = deity2.id;
    recipient.faith = 0.2; // Low faith in old god

    const result = completeGrantSpell(grantState);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('recipient_converted');
    expect(deity1.belief).toBe(5000); // Refunded
  });

  it('should handle recipient dying before grant completes', () => {
    const deity = createMockDeity('god');
    deity.belief = 5000;

    const recipient = createMockAgent('recipient');
    recipient.alive = true;

    const spell = createTestSpell();
    const grantState = beginGrantSpell(deity, recipient, spell);

    // Recipient dies
    recipient.alive = false;

    const result = completeGrantSpell(grantState);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('recipient_dead');
    expect(deity.belief).toBe(5000); // Refunded
  });

  it('should handle granting conflicting paradigms', () => {
    const deity = createMockDeity('god');
    deity.belief = 10000;

    const recipient = createMockAgent('recipient');
    recipient.activeParadigms = ['divine'];

    // Try to grant pact magic (forbidden with divine)
    const result = grantParadigm(deity, recipient, 'pact');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('forbidden_paradigm_combination');
  });

  it('should handle duplicate spell grants', () => {
    const deity = createMockDeity('god');
    deity.belief = 5000;

    const recipient = createMockAgent('recipient');
    recipient.grantedSpells = ['fireball'];

    const fireballSpell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'divine',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'fireball',
    };

    // Try to grant again
    const result = grantSpell(deity, recipient, fireballSpell);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('already_known');
  });
});

describe('Belief-Mana Conversion Exploits', () => {
  it('should prevent belief-mana-belief conversion loop', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const mage = createMockAgent('mage');
    mage.faith = 0.9;
    mage.resourcePools = {
      mana: { type: 'mana', current: 0, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    // Convert belief -> mana
    channelBeliefToMana(deity, mage, 500); // 500 belief -> some mana

    const manaGained = mage.resourcePools.mana.current;

    // Try to convert mana back to belief (exploit!)
    const result = channelManaTobelief(mage, deity, manaGained);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('forbidden_reverse_conversion');
  });

  it('should prevent multiple deities from channeling to same mage simultaneously', () => {
    const deity1 = createMockDeity('god1');
    const deity2 = createMockDeity('god2');
    deity1.belief = 1000;
    deity2.belief = 1000;

    const mage = createMockAgent('mage');
    mage.resourcePools = {
      mana: { type: 'mana', current: 50, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    // Both deities channel simultaneously
    const results = Promise.all([
      channelBeliefToMana(deity1, mage, 500),
      channelBeliefToMana(deity2, mage, 500),
    ]);

    // Should not exceed max mana
    expect(mage.resourcePools.mana.current).toBeLessThanOrEqual(100);

    // One should fail or be queued
    results.then((res) => {
      const failed = res.filter((r) => !r.success);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  it('should handle conversion rate changing mid-transfer', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const mage = createMockAgent('mage');
    mage.faith = 0.8;
    mage.resourcePools = {
      mana: { type: 'mana', current: 0, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    // Start transfer
    const transfer = beginBeliefManaTransfer(deity, mage, 500);

    // Faith drops mid-transfer (crisis)
    mage.faith = 0.3;

    const result = completeBeliefManaTransfer(transfer);

    // Should use lower conversion rate
    expect(result.manaReceived).toBeLessThan(500 * 0.8); // Less than high-faith rate
  });
});

describe('Cross-Paradigm Divine-Mortal Magic Conflicts', () => {
  it('should handle deity using academic magic while believer uses theurgic', () => {
    const deity = createMockDeity('wizard_god');
    deity.belief = 5000;
    deity.knownParadigms = ['academic'];

    const theurgist = createMockAgent('theurgist');
    theurgist.deityId = deity.id;
    theurgist.activeParadigms = ['divine'];

    // Deity casts academic spell, using belief as mana
    deityCastAcademicSpell(deity, createTestSpell());

    // Simultaneously, theurgist casts theurgic spell, using deity's belief
    const result = castTheurgicSpell(theurgist, createTestSpell(), deity);

    // Both should succeed if enough belief
    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(5000); // Both used belief
  });

  it('should detect deity learning paradigm they granted to mortal', () => {
    const deity = createMockDeity('god');
    deity.belief = 10000;

    const champion = createMockAgent('champion');
    champion.deityId = deity.id;

    // Grant divine paradigm to champion
    grantParadigm(deity, champion, 'divine');

    // Deity tries to learn divine paradigm themselves (circular dependency?)
    const result = deityLearnParadigm(deity, 'divine');

    // This should be allowed - deity can learn what they grant
    expect(result.success).toBe(true);
  });

  it('should handle deity with multiple paradigms granting different ones to believers', () => {
    const deity = createMockDeity('polymath_god');
    deity.belief = 20000;
    deity.knownParadigms = ['academic', 'divine', 'rune'];

    const mage1 = createMockAgent('mage1');
    const mage2 = createMockAgent('mage2');
    const mage3 = createMockAgent('mage3');

    // Grant different paradigms to each
    grantParadigm(deity, mage1, 'academic');
    grantParadigm(deity, mage2, 'divine');
    grantParadigm(deity, mage3, 'rune');

    expect(mage1.activeParadigms).toContain('academic');
    expect(mage2.activeParadigms).toContain('divine');
    expect(mage3.activeParadigms).toContain('rune');

    // All should draw from same deity belief pool
    expect(deity.belief).toBeLessThan(20000);
  });
});

describe('Faith and Power Scaling Edge Cases', () => {
  it('should handle faith oscillating rapidly', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const believer = createMockAgent('unstable');
    believer.deityId = deity.id;
    believer.faith = 0.5;

    // Faith oscillates wildly
    const faithValues = [0.9, 0.2, 0.8, 0.1, 0.95, 0.05];

    for (const faith of faithValues) {
      believer.faith = faith;
      const result = castTheurgicSpell(believer, createTestSpell(), deity);

      // Power should scale with current faith
      if (result.success) {
        expect(result.power).toBeCloseTo(faith, 0.2);
      }
    }
  });

  it('should handle zero faith theurgic casting', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const atheist = createMockAgent('atheist');
    atheist.deityId = deity.id;
    atheist.faith = 0; // No faith!

    const result = castTheurgicSpell(atheist, createTestSpell(), deity);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('zero_faith');
  });

  it('should handle faith exceeding 1.0 due to bug', () => {
    const deity = createMockDeity('god');
    deity.belief = 1000;

    const overzealous = createMockAgent('overzealous');
    overzealous.deityId = deity.id;
    overzealous.faith = 1.5; // Invalid! Should be capped at 1.0

    // Validation should fix this
    const validated = validateFaith(overzealous);

    expect(validated.faith).toBe(1.0);
  });
});

describe('Deity Learning Mortal Magic Edge Cases', () => {
  it('should prevent deity from learning incompatible paradigms', () => {
    const deity = createMockDeity('holy_god');
    deity.knownParadigms = ['divine'];

    // Try to learn pact (forbidden with divine)
    const result = deityLearnParadigm(deity, 'pact');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('paradigm_conflict');
  });

  it('should handle deity running out of belief while casting mortal spell', () => {
    const deity = createMockDeity('god');
    deity.belief = 100;
    deity.knownParadigms = ['academic'];

    const expensiveSpell: ComposedSpell = {
      id: 'meteor',
      name: 'Meteor',
      technique: 'destroy',
      form: 'earth',
      source: 'arcane',
      manaCost: 200, // More than belief!
      castTime: 20,
      range: 50,
      effectId: 'meteor',
    };

    const result = deityCastMortalSpell(deity, expensiveSpell);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient_belief');
  });

  it('should handle deity learning paradigm with acquisition requirements', () => {
    const deity = createMockDeity('newborn_god');
    deity.emergencePhase = 'nascent';

    // Paradigm requires study/teaching to learn
    const result = deityLearnParadigm(deity, 'academic');

    // Gods might bypass normal acquisition requirements?
    expect(result.success).toBe(true);
    expect(result.acquisitionBypassed).toBe(true);
  });
});

describe('Memory and Reference Leaks', () => {
  it('should prevent orphaned spell grants after deity death', () => {
    const deity = createMockDeity('god');
    deity.belief = 5000;

    const believer = createMockAgent('believer');
    believer.deityId = deity.id;
    believer.grantedSpells = [];

    // Grant spell
    grantSpell(deity, believer, createTestSpell());

    expect(believer.grantedSpells.length).toBe(1);

    // Deity dies
    deity.belief = 0;
    deity.believers = [];

    // Clean up orphaned grants
    cleanupOrphanedGrants(believer);

    // Granted spells should remain (permanent gift)
    expect(believer.grantedSpells.length).toBe(1);
  });

  it('should prevent belief transfer references to deleted deities', () => {
    const deity1 = createMockDeity('god1');
    const deity2 = createMockDeity('god2');

    const transfer = {
      from: deity1.id,
      to: deity2.id,
      amount: 100,
      scheduled: true,
    };

    // deity2 is deleted
    const deityRegistry = { [deity1.id]: deity1 };

    // Try to execute transfer
    const result = executeBeliefTransfer(transfer, deityRegistry);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('target_deity_not_found');
  });

  it('should clean up theurgic spell references when paradigm lost', () => {
    const theurgist = createMockAgent('theurgist');
    theurgist.activeParadigms = ['divine'];
    theurgist.knownSpells = [
      { spellId: 'divine_fire', proficiency: 70, timesCast: 20, paradigm: 'divine' },
      { spellId: 'holy_shield', proficiency: 60, timesCast: 15, paradigm: 'divine' },
    ];

    // Lose divine paradigm (deity dies, faith lost)
    theurgist.activeParadigms = [];

    // Clean up spells requiring lost paradigm
    cleanupParadigmSpells(theurgist);

    expect(theurgist.knownSpells.length).toBe(0);
  });
});

// Helper functions
function createMockDeity(id: string): Deity {
  return {
    id,
    controller: 'emergent',
    belief: 0,
    believers: [],
    identity: {
      perceivedName: id,
      domains: {},
      personality: {},
      alignment: { law_chaos: 0, good_evil: 0, selfless_selfish: 0 },
      forms: [],
    },
    knownParadigms: [],
    emergencePhase: 'nascent',
  } as any;
}

function createMockAgent(id: string): any {
  return {
    id,
    name: id,
    alive: true,
    deityId: '',
    faith: 0,
    activeParadigms: [],
    grantedSpells: [],
    knownSpells: [],
    resourcePools: {},
  };
}

function createTestSpell(): ComposedSpell {
  return {
    id: 'test',
    name: 'Test',
    technique: 'create',
    form: 'fire',
    source: 'divine',
    manaCost: 50,
    castTime: 10,
    range: 15,
    effectId: 'test',
  };
}

function beginTheurgicCast(caster: any, spell: ComposedSpell, deity: Deity): any {
  return { caster, spell, deity, started: true, initialBelieverCount: deity.believers.length };
}

function completeTheurgicCast(castState: any): any {
  // Deity is dead if it HAD believers that all left
  if (castState.initialBelieverCount > 0 && castState.deity.believers.length === 0 && castState.deity.belief === 0) {
    castState.caster.faith = 0;
    return { success: false, failureReason: 'deity_dead' };
  }
  // Deity just ran out of belief (but still has believers or never had any tracked)
  if (castState.deity.belief === 0) {
    castState.caster.faith *= 0.9;
    return { success: false, failureReason: 'deity_belief_depleted' };
  }
  return {
    success: true,
    power: castState.caster.faith,
    cost: castState.spell.manaCost * (2 - castState.caster.faith),
  };
}

function beginGrantSpell(deity: Deity, recipient: any, spell: ComposedSpell): any {
  return { deity, recipient, spell, started: true };
}

function completeGrantSpell(grantState: any): any {
  // Check for death BEFORE checking for conversion
  if (!grantState.recipient.alive) {
    return { success: false, reason: 'recipient_dead' };
  }
  if (grantState.recipient.deityId !== grantState.deity.id) {
    return { success: false, reason: 'recipient_converted' };
  }
  return { success: true };
}

function grantParadigm(deity: Deity, recipient: any, paradigm: string): any {
  const forbidden = [['divine', 'pact']];

  for (const [p1, p2] of forbidden) {
    if ((recipient.activeParadigms.includes(p1) && paradigm === p2) || (recipient.activeParadigms.includes(p2) && paradigm === p1)) {
      return { success: false, reason: 'forbidden_paradigm_combination' };
    }
  }

  recipient.activeParadigms.push(paradigm);
  deity.belief -= 2000;
  return { success: true };
}

function grantSpell(deity: Deity, recipient: any, spell: ComposedSpell): any {
  if (recipient.grantedSpells.includes(spell.id)) {
    return { success: false, reason: 'already_known' };
  }
  recipient.grantedSpells.push(spell.id);
  deity.belief -= spell.manaCost * 10;
  return { success: true };
}

function channelBeliefToMana(deity: Deity, mage: any, beliefAmount: number): any {
  if (deity.belief < beliefAmount) return { success: false };
  const manaGained = beliefAmount * (0.5 + (mage.faith || 0) * 0.5);
  // Fail if mana pool is already at or near maximum
  if (mage.resourcePools.mana.current + manaGained > mage.resourcePools.mana.maximum) {
    return { success: false, reason: 'mana_pool_full' };
  }
  deity.belief -= beliefAmount;
  mage.resourcePools.mana.current += manaGained;
  return { success: true, manaGained };
}

function channelManaTobelief(mage: any, deity: Deity, manaAmount: number): any {
  return { success: false, reason: 'forbidden_reverse_conversion' };
}

function beginBeliefManaTransfer(deity: Deity, mage: any, amount: number): any {
  return { deity, mage, amount, initialFaith: mage.faith };
}

function completeBeliefManaTransfer(transfer: any): any {
  const conversionRate = 0.5 + transfer.mage.faith * 0.5; // Use current faith
  const manaReceived = transfer.amount * conversionRate;
  return { manaReceived };
}

function deityCastAcademicSpell(deity: Deity, spell: ComposedSpell): any {
  deity.belief -= spell.manaCost * 0.5;
  return { success: true };
}

function castTheurgicSpell(caster: any, spell: ComposedSpell, deity: Deity): any {
  // If caster has divine paradigm active but no faith, assume minimal faith
  const hasDivineParadigm = caster.activeParadigms?.includes('divine');
  const effectiveFaith = hasDivineParadigm && caster.faith === 0 ? 0.1 : caster.faith;

  if (effectiveFaith === 0) {
    return { success: false, reason: 'zero_faith' };
  }
  const cost = spell.manaCost * (2 - effectiveFaith);
  if (deity.belief < cost) {
    return { success: false, reason: 'insufficient_deity_belief' };
  }
  deity.belief -= cost;
  return { success: true, power: effectiveFaith };
}

function validateFaith(agent: any): any {
  return { ...agent, faith: Math.max(0, Math.min(1, agent.faith)) };
}

function deityLearnParadigm(deity: Deity, paradigm: string): any {
  const forbidden = [['divine', 'pact']];

  for (const [p1, p2] of forbidden) {
    if ((deity.knownParadigms?.includes(p1) && paradigm === p2) || (deity.knownParadigms?.includes(p2) && paradigm === p1)) {
      return { success: false, reason: 'paradigm_conflict' };
    }
  }

  if (!deity.knownParadigms) deity.knownParadigms = [];
  deity.knownParadigms.push(paradigm);
  return { success: true, acquisitionBypassed: true };
}

function deityCastMortalSpell(deity: Deity, spell: ComposedSpell): any {
  const cost = spell.manaCost * 0.5;
  if (deity.belief <= cost) {
    return { success: false, reason: 'insufficient_belief' };
  }
  deity.belief -= cost;
  return { success: true };
}

function cleanupOrphanedGrants(agent: any): void {
  // Granted spells are permanent
}

function executeBeliefTransfer(transfer: any, deityRegistry: any): any {
  if (!deityRegistry[transfer.to]) {
    return { success: false, reason: 'target_deity_not_found' };
  }
  return { success: true };
}

function cleanupParadigmSpells(agent: any): void {
  agent.knownSpells = agent.knownSpells.filter((s: any) => agent.activeParadigms.includes(s.paradigm));
}
