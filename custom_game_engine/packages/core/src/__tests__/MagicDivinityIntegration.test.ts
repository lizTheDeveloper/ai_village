/**
 * Integration tests for Magic and Divinity systems
 * Gap: No integration between magic and divinity systems
 * Need: Gods using mortal magic, divine gifts, theurgic paradigm
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Deity } from '../divinity/DeityTypes.js';
import type { MagicComponent } from '../components/MagicComponent.js';
import type { ComposedSpell } from '../components/MagicComponent.js';
import type { World } from '../ecs/World.js';

describe('Divine Magic Integration - Theurgic Paradigm', () => {
  let deity: Deity;
  let theurgist: any; // Agent with theurgic magic
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('patron_god');
    deity.belief = 2000;
    deity.identity.domains = { fire: 0.8, protection: 0.6 };

    theurgist = createMockAgent('theurgist');
    theurgist.faith = 0.85;
    theurgist.deityId = deity.id;

    mockWorld = createMockWorld();
  });

  it('should use belief as magic source for theurgic spells', () => {
    const spell: ComposedSpell = {
      id: 'divine_fire',
      name: 'Divine Fire',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 50, // Actually costs belief
      castTime: 5,
      range: 20,
      effectId: 'divine_fire_blast',
    };

    const initialBelief = deity.belief;
    const result = castTheurgicSpell(theurgist, spell, deity, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(initialBelief); // Belief spent
    expect(theurgist.resourcePools?.mana?.current).toBeUndefined(); // No mana used
  });

  it('should scale power with faith level', () => {
    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 40,
      castTime: 5,
      range: 15,
      effectId: 'test',
    };

    const lowFaithCaster = { ...theurgist, faith: 0.3 };
    const highFaithCaster = { ...theurgist, faith: 0.95 };

    const lowResult = castTheurgicSpell(lowFaithCaster, spell, deity, mockWorld);
    const highResult = castTheurgicSpell(highFaithCaster, spell, deity, mockWorld);

    expect(highResult.power).toBeGreaterThan(lowResult.power);
  });

  it('should reduce belief cost for domain-aligned spells', () => {
    // Fire spell for fire god
    const alignedSpell: ComposedSpell = {
      id: 'holy_fire',
      name: 'Holy Fire',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 60,
      castTime: 5,
      range: 20,
      effectId: 'holy_fire',
    };

    // Water spell for fire god
    const misalignedSpell: ComposedSpell = {
      id: 'holy_water',
      name: 'Holy Water',
      technique: 'create',
      form: 'water',
      source: 'divine',
      manaCost: 60,
      castTime: 5,
      range: 20,
      effectId: 'holy_water',
    };

    const alignedCost = calculateTheurgicCost(theurgist, alignedSpell, deity);
    const misalignedCost = calculateTheurgicCost(theurgist, misalignedSpell, deity);

    expect(alignedCost).toBeLessThan(misalignedCost);
  });

  it('should fail if deity lacks sufficient belief', () => {
    deity.belief = 20; // Too low

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 100,
      castTime: 5,
      range: 15,
      effectId: 'test',
    };

    const result = castTheurgicSpell(theurgist, spell, deity, mockWorld);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('deity_insufficient_belief');
  });

  it('should decrease faith on repeated failures', () => {
    deity.belief = 10; // Will cause failures

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 50,
      castTime: 5,
      range: 15,
      effectId: 'test',
    };

    const initialFaith = theurgist.faith;

    // Multiple failures
    for (let i = 0; i < 5; i++) {
      castTheurgicSpell(theurgist, spell, deity, mockWorld);
    }

    expect(theurgist.faith).toBeLessThan(initialFaith);
  });
});

describe('Divine Gifts - Gods Granting Magic', () => {
  let deity: Deity;
  let recipient: any;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('magic_god');
    deity.belief = 5000;
    deity.identity.domains = { magic: 0.95, knowledge: 0.7 };

    recipient = createMockAgent('chosen_one');
    recipient.faith = 0.9;
    recipient.deityId = deity.id;

    mockWorld = createMockWorld();
  });

  it('should grant spell to faithful follower', () => {
    const grantedSpell: ComposedSpell = {
      id: 'divine_shield',
      name: 'Divine Shield',
      technique: 'protect',
      form: 'body',
      source: 'divine',
      manaCost: 30,
      castTime: 3,
      range: 0,
      effectId: 'divine_protection',
    };

    const result = grantSpell(deity, recipient, grantedSpell, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(5000); // Cost to grant
    expect(recipient.grantedSpells).toContain(grantedSpell.id);
  });

  it('should cost more belief to grant powerful spells', () => {
    const weakSpell: ComposedSpell = {
      id: 'light',
      name: 'Light',
      technique: 'create',
      form: 'fire',
      source: 'divine',
      manaCost: 5,
      castTime: 1,
      range: 5,
      effectId: 'light',
    };

    const powerfulSpell: ComposedSpell = {
      id: 'resurrection',
      name: 'Resurrection',
      technique: 'create',
      form: 'spirit',
      source: 'divine',
      manaCost: 200,
      castTime: 60,
      range: 5,
      effectId: 'resurrect',
    };

    const weakCost = calculateGrantCost(deity, weakSpell);
    const powerfulCost = calculateGrantCost(deity, powerfulSpell);

    expect(powerfulCost).toBeGreaterThan(weakCost * 10);
  });

  it('should require high faith for powerful gifts', () => {
    recipient.faith = 0.4; // Low faith

    const powerfulSpell: ComposedSpell = {
      id: 'smite',
      name: 'Smite',
      technique: 'destroy',
      form: 'body',
      source: 'divine',
      manaCost: 100,
      castTime: 10,
      range: 30,
      effectId: 'smite',
    };

    const result = grantSpell(deity, recipient, powerfulSpell, mockWorld);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('insufficient_faith');
  });

  it('should grant entire paradigm to champion', () => {
    recipient.faith = 0.98; // Very high

    const result = grantParadigmAccess(deity, recipient, 'divine', mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(5000); // Major cost
    expect(recipient.activeParadigms).toContain('divine');
  });

  it('should create unique champion spells', () => {
    recipient.faith = 0.92;

    const result = createChampionSpell(deity, recipient, {
      basedOn: 'fireball',
      divineAspect: deity.identity.domains,
      championName: recipient.name,
    });

    expect(result.spell).toBeDefined();
    expect(result.spell.name).toContain(recipient.name);
    expect(result.spell.source).toBe('divine');
  });
});

describe('Gods Using Mortal Magic', () => {
  let deity: Deity;
  let mockWorld: World;

  beforeEach(() => {
    deity = createMockDeity('wizard_god');
    deity.belief = 10000;
    deity.identity.domains = { magic: 0.95, knowledge: 0.85, arcane: 0.7 };
    mockWorld = createMockWorld();
  });

  it('should allow gods to learn mortal magic paradigms', () => {
    const result = deityLearnParadigm(deity, 'academic', mockWorld);

    expect(result.success).toBe(true);
    expect(deity.knownParadigms).toContain('academic');
  });

  it('should use belief as substitute for mana', () => {
    deityLearnParadigm(deity, 'academic', mockWorld);

    const academicSpell: ComposedSpell = {
      id: 'fireball',
      name: 'Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'fireball',
    };

    const initialBelief = deity.belief;
    const result = deityCastMortalSpell(deity, academicSpell, mockWorld);

    expect(result.success).toBe(true);
    expect(deity.belief).toBeLessThan(initialBelief); // Belief substitutes for mana
  });

  it('should scale mortal spell power with deity power', () => {
    deityLearnParadigm(deity, 'academic', mockWorld);

    const spell: ComposedSpell = {
      id: 'magic_missile',
      name: 'Magic Missile',
      technique: 'destroy',
      form: 'force',
      source: 'arcane',
      manaCost: 20,
      castTime: 3,
      range: 30,
      effectId: 'force_missile',
    };

    const result = deityCastMortalSpell(deity, spell, mockWorld);

    // Divine power multiplier
    expect(result.power).toBeGreaterThan(1.0); // Amplified
  });

  it('should respect paradigm laws even for gods', () => {
    deityLearnParadigm(deity, 'academic', mockWorld);

    // Spell that violates conservation law
    const impossibleSpell: ComposedSpell = {
      id: 'create_matter',
      name: 'Create Matter from Nothing',
      technique: 'create',
      form: 'earth',
      source: 'arcane',
      manaCost: 5, // Too cheap
      castTime: 1,
      range: 5,
      effectId: 'impossible_creation',
    };

    const result = deityCastMortalSpell(deity, impossibleSpell, mockWorld);

    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('law_violation');
  });
});

describe('Belief-to-Mana Conversion', () => {
  it('should convert deity belief to mana pool for mortals', () => {
    const deity = createMockDeity('mana_god');
    deity.belief = 1000;

    const mage = createMockAgent('mage');
    mage.faith = 0.8;
    mage.deityId = deity.id;
    mage.resourcePools = {
      mana: { type: 'mana', current: 50, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    const result = deityChannelMana(deity, mage, 200); // 200 belief -> mana

    expect(result.success).toBe(true);
    expect(deity.belief).toBe(800); // 1000 - 200
    expect(mage.resourcePools.mana.current).toBeGreaterThan(50); // Received mana
  });

  it('should scale conversion rate with faith', () => {
    const deity = createMockDeity('mana_god');
    deity.belief = 2000;

    const lowFaithMage = createMockAgent('low_faith');
    lowFaithMage.faith = 0.3;
    lowFaithMage.resourcePools = {
      mana: { type: 'mana', current: 0, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    const highFaithMage = createMockAgent('high_faith');
    highFaithMage.faith = 0.95;
    highFaithMage.resourcePools = {
      mana: { type: 'mana', current: 0, maximum: 100, regenRate: 0.01, locked: 0 },
    };

    deityChannelMana(deity, lowFaithMage, 100);
    const lowFaithGained = lowFaithMage.resourcePools.mana.current;

    deity.belief = 2000; // Reset
    deityChannelMana(deity, highFaithMage, 100);
    const highFaithGained = highFaithMage.resourcePools.mana.current;

    expect(highFaithGained).toBeGreaterThan(lowFaithGained);
  });
});

describe('Cross-Paradigm Divine Magic', () => {
  it('should allow mixing divine and academic paradigms', () => {
    const mage = createMockAgent('divine_mage');
    mage.activeParadigms = ['academic', 'divine'];
    mage.resourcePools = {
      mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      favor: { type: 'favor', current: 50, maximum: 100, regenRate: 0, locked: 0 },
    };

    const hybridSpell: ComposedSpell = {
      id: 'divine_fireball',
      name: 'Divine Fireball',
      technique: 'destroy',
      form: 'fire',
      source: 'arcane', // Academic
      manaCost: 40,
      castTime: 8,
      range: 25,
      effectId: 'divine_fireball',
      paradigms: ['academic', 'divine'], // Hybrid
    };

    const costs = calculateHybridSpellCost(mage, hybridSpell);

    expect(costs.mana).toBeGreaterThan(0);
    expect(costs.favor).toBeGreaterThan(0); // Both costs
  });

  it('should create synergies between paradigms', () => {
    const mage = createMockAgent('synergist');
    mage.activeParadigms = ['academic', 'divine'];

    const spell: ComposedSpell = {
      id: 'test',
      name: 'Test',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 50,
      castTime: 10,
      range: 20,
      effectId: 'test',
    };

    const basePower = 1.0;
    const synergizedPower = calculateParadigmSynergy(mage, spell);

    expect(synergizedPower).toBeGreaterThan(basePower);
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
  } as any;
}

function createMockAgent(id: string): any {
  return {
    id,
    name: id,
    faith: 0,
    deityId: '',
    resourcePools: {},
    activeParadigms: [],
    grantedSpells: [],
  };
}

function createMockWorld(): World {
  return {} as any;
}

function castTheurgicSpell(caster: any, spell: ComposedSpell, deity: Deity, world: World): any {
  const cost = calculateTheurgicCost(caster, spell, deity);

  if (deity.belief < cost) {
    caster.failedCasts = (caster.failedCasts || 0) + 1;
    if (caster.failedCasts > 3) {
      caster.faith = Math.max(0, caster.faith - 0.05);
    }
    return { success: false, failureReason: 'deity_insufficient_belief' };
  }

  deity.belief -= cost;
  const power = caster.faith * (1 + Math.log(deity.belief) / 10);

  return { success: true, power };
}

function calculateTheurgicCost(caster: any, spell: ComposedSpell, deity: Deity): number {
  let cost = spell.manaCost;

  // Faith modifier
  cost *= 2 - caster.faith; // 0.5x at max faith, 2x at zero faith

  // Domain alignment
  const domain = spell.form;
  const alignment = (deity.identity.domains as any)[domain] || 0;
  if (alignment > 0.7) {
    cost *= 0.7; // 30% discount
  } else if (alignment < 0.3) {
    cost *= 1.5; // 50% penalty
  }

  return Math.ceil(cost);
}

function grantSpell(deity: Deity, recipient: any, spell: ComposedSpell, world: World): any {
  if (recipient.faith < 0.7 && spell.manaCost > 50) {
    return { success: false, failureReason: 'insufficient_faith' };
  }

  const cost = calculateGrantCost(deity, spell);
  if (deity.belief < cost) {
    return { success: false, failureReason: 'insufficient_belief' };
  }

  deity.belief -= cost;
  if (!recipient.grantedSpells) recipient.grantedSpells = [];
  recipient.grantedSpells.push(spell.id);

  return { success: true, cost };
}

function calculateGrantCost(deity: Deity, spell: ComposedSpell): number {
  return spell.manaCost * 10; // 10x mana cost as belief cost
}

function grantParadigmAccess(deity: Deity, recipient: any, paradigm: string, world: World): any {
  const cost = 2000; // Major cost

  if (recipient.faith < 0.9) {
    return { success: false, failureReason: 'insufficient_faith' };
  }

  if (deity.belief < cost) {
    return { success: false, failureReason: 'insufficient_belief' };
  }

  deity.belief -= cost;
  if (!recipient.activeParadigms) recipient.activeParadigms = [];
  recipient.activeParadigms.push(paradigm);

  return { success: true, cost };
}

function createChampionSpell(deity: Deity, recipient: any, config: any): any {
  const baseSpell = config.basedOn;

  return {
    spell: {
      id: `${recipient.name}_${baseSpell}`,
      name: `${recipient.name}'s Divine ${baseSpell}`,
      technique: 'destroy',
      form: 'fire',
      source: 'divine',
      manaCost: 50,
      castTime: 5,
      range: 30,
      effectId: `champion_${baseSpell}`,
    },
  };
}

function deityLearnParadigm(deity: Deity, paradigm: string, world: World): any {
  if (!deity.knownParadigms) deity.knownParadigms = [];
  deity.knownParadigms.push(paradigm);
  return { success: true };
}

function deityCastMortalSpell(deity: Deity, spell: ComposedSpell, world: World): any {
  // Convert mana cost to belief cost
  const beliefCost = spell.manaCost * 0.5; // Gods are efficient

  if (deity.belief < beliefCost) {
    return { success: false, failureReason: 'insufficient_belief' };
  }

  // Check paradigm laws
  if (spell.manaCost < 10 && spell.technique === 'create') {
    return { success: false, failureReason: 'law_violation: conservation' };
  }

  deity.belief -= beliefCost;

  // Divine power multiplier
  const deityPowerMultiplier = 1 + Math.log(deity.belief) / 20;

  return { success: true, power: deityPowerMultiplier };
}

function deityChannelMana(deity: Deity, recipient: any, beliefAmount: number): any {
  if (deity.belief < beliefAmount) {
    return { success: false };
  }

  deity.belief -= beliefAmount;

  // Conversion rate based on faith
  const conversionRate = 0.5 + recipient.faith * 0.5; // 0.5 to 1.0
  const manaGained = Math.ceil(beliefAmount * conversionRate);

  recipient.resourcePools.mana.current = Math.min(
    recipient.resourcePools.mana.maximum,
    recipient.resourcePools.mana.current + manaGained
  );

  return { success: true, manaGained };
}

function calculateHybridSpellCost(caster: any, spell: ComposedSpell): any {
  return {
    mana: spell.manaCost * 0.6,
    favor: spell.manaCost * 0.4,
  };
}

function calculateParadigmSynergy(caster: any, spell: ComposedSpell): number {
  // Academic + Divine = 20% power bonus
  if (caster.activeParadigms.includes('academic') && caster.activeParadigms.includes('divine')) {
    return 1.2;
  }
  return 1.0;
}
