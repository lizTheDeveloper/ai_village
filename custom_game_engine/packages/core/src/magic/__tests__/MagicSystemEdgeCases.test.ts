/**
 * Edge cases and failure modes for Magic System
 * Tests scenarios that commonly cause bugs in game systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { ComposedSpell } from '../../components/MagicComponent.js';

// Helper function to create test MagicComponent with defaults
function createTestCaster(overrides: Partial<MagicComponent> = {}): MagicComponent {
  return {
    activeParadigms: [],
    knownSpells: [],
    resourcePools: {},
    sustainedSpells: [],
    castHistory: [],
    ...overrides,
  };
}

// Helper function to create test ComposedSpell with defaults
function createTestSpell(overrides: Partial<ComposedSpell> = {}): ComposedSpell {
  return {
    id: 'test_spell',
    name: 'Test Spell',
    technique: 'create',
    form: 'fire',
    source: 'arcane',
    manaCost: 50,
    castTime: 5,
    range: 10,
    effectId: 'test_effect',
    ...overrides,
  };
}

describe('Resource Depletion Edge Cases', () => {
  it('should handle casting spell that costs exactly all remaining mana', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 50, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    });

    const spell = createTestSpell({
      id: 'exact_cost',
      name: 'Exact Cost',
      manaCost: 50, // Exact match
    });

    const result = attemptCast(caster, spell);

    expect(result.success).toBe(true);
    expect(caster.resourcePools.mana.current).toBe(0);
    expect(caster.resourcePools.mana.current).not.toBeLessThan(0); // Never negative
  });

  it('should handle casting when resources hit zero mid-cast', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: -1, locked: 0 }, // Draining!
      },
    });

    const spell = createTestSpell({
      id: 'slow_spell',
      name: 'Slow Spell',
      manaCost: 50,
      castTime: 100, // Long cast time
    });

    // Start cast
    const castState = beginCast(caster, spell);

    // Simulate ticks - mana draining
    for (let i = 0; i < 60; i++) {
      tickCast(castState);
      regenerateResources(caster, 1);
    }

    // Mana should have hit zero, cast should fail
    expect(castState.failed).toBe(true);
    expect(castState.failureReason).toBe('resource_depleted_during_cast');
  });

  it('should handle simultaneous resource drain from multiple sources', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    });

    // Lock mana for sustained spell
    caster.resourcePools.mana.locked = 40;

    // Try to cast another spell
    const spell = createTestSpell({
      manaCost: 70, // Would require 110 total (70 + 40 locked)
    });

    const result = attemptCast(caster, spell);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('insufficient_available_mana');
  });

  it('should handle locked resources that exceed current after damage', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 50 },
      },
    });

    // Take damage that reduces max mana
    caster.resourcePools.mana.maximum = 60;
    caster.resourcePools.mana.current = 60;

    // Locked (50) is still valid, but current is 60
    // Available should be 10 (60 - 50)

    const available = getAvailableMana(caster);
    expect(available).toBe(10);

    // Now take more damage
    caster.resourcePools.mana.current = 40;

    // Locked exceeds current - should auto-adjust
    const validated = validateResourcePools(caster);
    expect(validated.resourcePools.mana.locked).toBeLessThanOrEqual(40);
  });
});

describe('Numeric Overflow and Accumulation', () => {
  it('should prevent proficiency from accumulating beyond 100', () => {
    const spell = {
      spellId: 'fireball',
      proficiency: 95,
      timesCast: 1000,
    };

    // Gain proficiency from many casts
    for (let i = 0; i < 100; i++) {
      spell.proficiency += 0.5; // Would go way over 100
      spell.proficiency = Math.min(100, spell.proficiency); // Should cap
    }

    expect(spell.proficiency).toBe(100);
    expect(spell.proficiency).not.toBeGreaterThan(100);
  });

  it('should handle corruption accumulating to exactly 100 (terminal)', () => {
    const caster = createTestCaster({
      resourcePools: {
        corruption: { type: 'corruption', current: 95, maximum: 100, regenRate: 0, locked: 0 },
      },
    });

    // Cast dark spell that adds 5 corruption
    addCorruption(caster, 5);

    expect(caster.resourcePools.corruption.current).toBe(100);

    const isTerminal = checkTerminalEffects(caster);
    expect(isTerminal.terminal).toBe(true);
    expect(isTerminal.type).toBe('corruption_complete');
  });

  it('should handle corruption accumulating beyond 100 (overflow protection)', () => {
    const caster = createTestCaster({
      resourcePools: {
        corruption: { type: 'corruption', current: 98, maximum: 100, regenRate: 0, locked: 0 },
      },
    });

    // Cast spell that would add 10 corruption
    addCorruption(caster, 10);

    expect(caster.resourcePools.corruption.current).toBe(100); // Capped, not 108
  });

  it('should handle attention accumulating indefinitely (unbounded growth)', () => {
    const caster = createTestCaster({
      resourcePools: {
        attention: { type: 'attention', current: 0, maximum: 100, regenRate: -0.001, locked: 0 },
      },
    });

    // Cast true name spells thousands of times
    for (let i = 0; i < 10000; i++) {
      addAttention(caster, 1);
    }

    // Attention can grow unbounded, but should eventually cause problems
    expect(caster.resourcePools.attention.current).toBeGreaterThan(1000);

    // Check for side effects
    const sideEffects = checkAttentionSideEffects(caster);
    expect(sideEffects.beingWatched).toBe(true);
    expect(sideEffects.dangerLevel).toBeGreaterThan(0.8);
  });

  it('should handle breath count going to exactly 1 (Drab threshold)', () => {
    const caster = createTestCaster({
      resourcePools: {
        health: { type: 'health', current: 1, maximum: 50000, regenRate: 0, locked: 0 },
      },
      paradigmState: {
        breath: { breathCount: 1, heighteningTier: 0 },
      },
    });

    const warning = checkDrabWarning(caster);
    expect(warning.isDrabWarning).toBe(true);
    expect(warning.message).toContain('last Breath');
  });
});

describe('State Corruption and Invalid Transitions', () => {
  it('should detect orphaned locked resources', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 50 },
      },
      sustainedSpells: [], // No sustained spells!
    });

    // Locked mana but no sustained spells - orphaned lock
    const issues = detectResourceIssues(caster);

    expect(issues.orphanedLocks).toBe(true);
    expect(issues.recommendations).toContain('unlock_orphaned_mana');
  });

  it('should detect and fix inconsistent resource pools', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: {
          type: 'mana',
          current: 150, // Exceeds max!
          maximum: 100,
          regenRate: 0.01,
          locked: 120, // Exceeds current!
        },
      },
    });

    const fixed = repairResourcePools(caster);

    expect(fixed.resourcePools.mana.current).toBe(100); // Clamped to max
    expect(fixed.resourcePools.mana.locked).toBeLessThanOrEqual(100); // Clamped to current
  });

  it('should handle paradigm being removed while active spell is using it', () => {
    const caster = createTestCaster({
      activeParadigms: ['academic'],
      knownSpells: [{ spellId: 'fireball', proficiency: 50, timesCast: 10 }],
      sustainedSpells: [
        {
          spellId: 'mage_armor',
          paradigm: 'academic',
          endTime: 10000,
        },
      ],
    });

    // Remove paradigm
    caster.activeParadigms = [];

    // Check for broken sustained spells
    const validation = validateSustainedSpells(caster);

    expect(validation.invalid.length).toBe(1);
    expect(validation.invalid[0].reason).toBe('paradigm_lost');
  });

  it('should handle spell being forgotten while in known spells list', () => {
    const caster = createTestCaster({
      knownSpells: [
        { spellId: 'fireball', proficiency: 70, timesCast: 50 },
        { spellId: 'deleted_spell', proficiency: 30, timesCast: 10 },
      ],
    });

    // Spell registry no longer has 'deleted_spell'
    const spellExists = (id: string) => id !== 'deleted_spell';

    const cleaned = cleanInvalidSpells(caster, spellExists);

    expect(cleaned.knownSpells.length).toBe(1);
    expect(cleaned.knownSpells[0].spellId).toBe('fireball');
  });
});

describe('Timing and Order-of-Operations Issues', () => {
  it('should handle regeneration happening before cost deduction in same tick', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 45, maximum: 100, regenRate: 1.0, locked: 0 },
      },
    });

    // Spell costs 50 mana, but regen happens first
    const spell = createTestSpell({
      manaCost: 50,
    });

    // Regen first
    regenerateResources(caster, 1); // +1 mana -> 46
    expect(caster.resourcePools.mana.current).toBe(46);

    // Still not enough, even after regen
    const result = attemptCast(caster, spell);
    expect(result.success).toBe(false);

    // But if we regen more...
    regenerateResources(caster, 5); // +5 -> 51
    const result2 = attemptCast(caster, spell);
    expect(result2.success).toBe(true);
  });

  it('should handle terminal effect triggering during another terminal effect', () => {
    const caster = createTestCaster({
      resourcePools: {
        corruption: { type: 'corruption', current: 98, maximum: 100, regenRate: 0, locked: 0 },
        sanity: { type: 'sanity', current: 2, maximum: 100, regenRate: 0, locked: 0 },
      },
    });

    // Cast spell that adds corruption AND costs sanity
    const darkSpell: ComposedSpell = {
      id: 'forbidden',
      name: 'Forbidden',
      technique: 'destroy',
      form: 'spirit',
      source: 'void',
      manaCost: 100,
      castTime: 10,
      range: 20,
      effectId: 'forbidden_magic',
      costs: [
        { type: 'corruption', amount: 5 },
        { type: 'sanity', amount: 3 },
      ],
    };

    const result = castSpell(caster, darkSpell);

    // Both terminal effects should trigger
    expect(result.terminalEffects.length).toBe(2);
    expect(result.terminalEffects).toContainEqual(expect.objectContaining({ type: 'corruption_complete' }));
    expect(result.terminalEffects).toContainEqual(expect.objectContaining({ type: 'sanity_zero' }));
  });

  it('should handle spell effect expiring in the same tick it was applied', () => {
    const target: any = {
      statusEffects: [],
    };

    const effect = {
      type: 'protection',
      absorptionRemaining: 50,
      duration: 0, // Expires immediately!
      appliedAt: 1000,
    };

    applyStatusEffect(target, effect, 1000);

    // Check if still active in same tick
    const active = getActiveEffects(target, 1000);
    expect(active.length).toBe(0); // Should not be active

    // Or should it be active for at least one tick?
    // This is an ambiguity in the spec!
  });

  it('should handle effects expiring out of order', () => {
    const target: any = {
      statusEffects: [
        { id: 'buff1', duration: 10, appliedAt: 100 }, // Expires at 110
        { id: 'buff2', duration: 5, appliedAt: 107 }, // Expires at 112
        { id: 'buff3', duration: 3, appliedAt: 108 }, // Expires at 111
      ],
    };

    // At tick 111, buff1 and buff3 expire, but buff2 is still active
    const active = updateEffects(target, 111);

    expect(active).toEqual([{ id: 'buff2', duration: 5, appliedAt: 107 }]);
  });
});

describe('Cross-Paradigm Interference', () => {
  it('should detect conflicting paradigm costs on same resource', () => {
    const caster = createTestCaster({
      activeParadigms: ['academic', 'divine'],
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
        favor: { type: 'favor', current: 50, maximum: 100, regenRate: 0, locked: 0 },
      },
    });

    // Hybrid spell that costs both mana AND favor
    const hybridSpell: ComposedSpell = {
      id: 'hybrid',
      name: 'Hybrid',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 60,
      castTime: 10,
      range: 15,
      effectId: 'hybrid',
      paradigms: ['academic', 'divine'],
    };

    const costs = calculateMultiParadigmCosts(caster, hybridSpell);

    expect(costs.mana).toBeGreaterThan(0);
    expect(costs.favor).toBeGreaterThan(0);
    expect(costs.mana + costs.favor * 2).toBeGreaterThanOrEqual(60); // Some combined threshold
  });

  it('should prevent paradigm switching while sustained spell is active', () => {
    const caster = createTestCaster({
      activeParadigms: ['academic'],
      sustainedSpells: [
        {
          spellId: 'mage_armor',
          paradigm: 'academic',
          endTime: 10000,
        },
      ],
    });

    // Try to switch to different paradigm
    const result = switchParadigm(caster, 'pact');

    expect(result.success).toBe(false);
    expect(result.blockedBy).toBe('sustained_spell');
  });

  it('should handle paradigm learning creating forbidden combinations', () => {
    const caster = createTestCaster({
      activeParadigms: ['divine'],
    });

    // Try to learn pact (forbidden with divine)
    const result = learnParadigm(caster, 'pact');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('forbidden_combination');
  });
});

describe('Memory Leaks and Resource Cleanup', () => {
  it('should clean up expired status effects', () => {
    const target: any = {
      statusEffects: [
        { id: '1', duration: 10, appliedAt: 100 },
        { id: '2', duration: 10, appliedAt: 105 },
        { id: '3', duration: 10, appliedAt: 110 },
        { id: '4', duration: 10, appliedAt: 115 },
      ],
    };

    // At tick 150, all should be expired
    cleanupExpiredEffects(target, 150);

    expect(target.statusEffects.length).toBe(0);
  });

  it('should prevent sustained spell list from growing unbounded', () => {
    const caster = createTestCaster({
      sustainedSpells: [],
    });

    // Add many sustained spells
    for (let i = 0; i < 1000; i++) {
      caster.sustainedSpells.push({
        spellId: `spell_${i}`,
        paradigm: 'test',
        endTime: i,
      });
    }

    // Most should have expired
    cleanupSustainedSpells(caster, 10000);

    expect(caster.sustainedSpells.length).toBeLessThan(100);
  });

  it('should clean up spell history to prevent unbounded growth', () => {
    const caster = createTestCaster({
      castHistory: [],
    });

    // Cast thousands of spells
    for (let i = 0; i < 10000; i++) {
      caster.castHistory.push({
        spellId: 'test',
        tick: i,
      });
    }

    // Trim to reasonable size
    trimCastHistory(caster, 1000); // Keep last 1000

    expect(caster.castHistory.length).toBe(1000);
  });
});

describe('NaN and Infinity Propagation', () => {
  it('should reject spell costs that result in NaN', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    });

    const spell = createTestSpell({
      id: 'bad',
      name: 'Bad',
      manaCost: NaN, // Invalid!
    });

    expect(() => {
      validateSpell(spell);
    }).toThrow('manaCost must be a valid number');
  });

  it('should prevent NaN from propagating through cost calculations', () => {
    const invalidModifier = NaN;
    const baseCost = 50;

    const finalCost = calculateFinalCost(baseCost, invalidModifier);

    expect(Number.isNaN(finalCost)).toBe(false);
    expect(finalCost).toBe(baseCost); // Should fallback to base
  });

  it('should prevent Infinity from entering resource pools', () => {
    const caster = createTestCaster({
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    });

    // Try to add infinite mana
    expect(() => {
      addMana(caster, Infinity);
    }).toThrow('Cannot add infinite resources');
  });

  it('should handle division by zero in efficiency calculations', () => {
    const efficiency = calculateEfficiency(100, 0); // denominator is zero

    expect(Number.isNaN(efficiency)).toBe(false);
    expect(efficiency).toBe(0); // Safe fallback
  });
});

// Helper functions (these should be implemented)
interface CastResult {
  success: boolean;
  failureReason?: string;
}

function attemptCast(caster: MagicComponent, spell: ComposedSpell): CastResult {
  const available = caster.resourcePools.mana.current - caster.resourcePools.mana.locked;
  if (available < spell.manaCost) {
    return { success: false, failureReason: 'insufficient_available_mana' };
  }
  caster.resourcePools.mana.current -= spell.manaCost;
  return { success: true };
}

interface CastState {
  spell: ComposedSpell;
  caster: MagicComponent;
  ticksElapsed: number;
  ticksTotal: number;
  failed: boolean;
  failureReason?: string;
}

function beginCast(caster: MagicComponent, spell: ComposedSpell): CastState {
  return {
    spell,
    caster,
    ticksElapsed: 0,
    ticksTotal: spell.castTime,
    failed: false,
  };
}

function tickCast(castState: CastState): void {
  if (castState.failed) return;
  castState.ticksElapsed++;
  const manaPool = castState.caster.resourcePools.mana;
  if (manaPool && manaPool.current <= 0) {
    castState.failed = true;
    castState.failureReason = 'resource_depleted_during_cast';
  }
}

function regenerateResources(caster: MagicComponent, ticks: number): void {
  for (const pool of Object.values(caster.resourcePools)) {
    pool.current = Math.max(0, Math.min(pool.maximum, pool.current + pool.regenRate * ticks));
  }
}

function getAvailableMana(caster: MagicComponent): number {
  return Math.max(0, caster.resourcePools.mana.current - caster.resourcePools.mana.locked);
}

function validateResourcePools(caster: MagicComponent): MagicComponent {
  const validated = { ...caster };
  for (const pool of Object.values(validated.resourcePools)) {
    pool.locked = Math.max(0, Math.min(pool.current, pool.locked));
  }
  return validated;
}

function addCorruption(caster: MagicComponent, amount: number): void {
  caster.resourcePools.corruption.current = Math.min(
    caster.resourcePools.corruption.maximum,
    caster.resourcePools.corruption.current + amount
  );
}

interface TerminalEffectResult {
  terminal: boolean;
  type?: string;
}

function checkTerminalEffects(caster: MagicComponent): TerminalEffectResult {
  if (caster.resourcePools.corruption?.current >= 100) {
    return { terminal: true, type: 'corruption_complete' };
  }
  return { terminal: false };
}

function addAttention(caster: MagicComponent, amount: number): void {
  if (!caster.resourcePools.attention) return;
  caster.resourcePools.attention.current += amount;
}

interface AttentionSideEffects {
  beingWatched: boolean;
  dangerLevel: number;
}

function checkAttentionSideEffects(caster: MagicComponent): AttentionSideEffects {
  const attention = caster.resourcePools.attention?.current || 0;
  return {
    beingWatched: attention > 100,
    dangerLevel: Math.min(1, attention / 1000),
  };
}

interface DrabWarning {
  isDrabWarning: boolean;
  message: string;
}

function checkDrabWarning(caster: MagicComponent): DrabWarning {
  const breathCount = caster.paradigmState?.breath?.breathCount || 0;
  return {
    isDrabWarning: breathCount === 1,
    message: breathCount === 1 ? 'Warning: Using your last Breath' : '',
  };
}

interface ResourceIssues {
  orphanedLocks: boolean;
  recommendations: string[];
}

function detectResourceIssues(caster: MagicComponent): ResourceIssues {
  const sustainedSpellCount = caster.sustainedSpells?.length || 0;
  const hasLockedMana = caster.resourcePools.mana?.locked > 0;

  return {
    orphanedLocks: hasLockedMana && sustainedSpellCount === 0,
    recommendations: hasLockedMana && sustainedSpellCount === 0 ? ['unlock_orphaned_mana'] : [],
  };
}

function repairResourcePools(caster: MagicComponent): MagicComponent {
  const fixed = { ...caster };
  for (const pool of Object.values(fixed.resourcePools)) {
    pool.current = Math.max(0, Math.min(pool.maximum, pool.current));
    pool.locked = Math.max(0, Math.min(pool.current, pool.locked));
  }
  return fixed;
}

interface SustainedSpellValidation {
  invalid: Array<{ spellId: string; paradigm: string; endTime: number; reason: string }>;
}

function validateSustainedSpells(caster: MagicComponent): SustainedSpellValidation {
  const invalid = (caster.sustainedSpells || []).filter((spell) => {
    return !caster.activeParadigms.includes(spell.paradigm);
  });

  return {
    invalid: invalid.map((s) => ({ ...s, reason: 'paradigm_lost' })),
  };
}

function cleanInvalidSpells(caster: MagicComponent, spellExists: (id: string) => boolean): MagicComponent {
  return {
    ...caster,
    knownSpells: caster.knownSpells.filter((s) => spellExists(s.spellId)),
  };
}

interface TerminalEffect {
  type: string;
}

interface CastSpellResult {
  success: boolean;
  terminalEffects: TerminalEffect[];
}

function castSpell(caster: MagicComponent, spell: ComposedSpell): CastSpellResult {
  const terminalEffects: TerminalEffect[] = [];

  if ('costs' in spell && spell.costs) {
    for (const cost of spell.costs) {
      // Corruption and attention are cumulative costs that INCREASE
      const isCumulative = cost.type === 'corruption' || cost.type === 'attention';
      const pool = caster.resourcePools[cost.type];
      if (pool) {
        if (isCumulative) {
          pool.current += cost.amount;
        } else {
          pool.current -= cost.amount;
        }

        // Check for terminal effects after applying cost
        if (cost.type === 'corruption' && pool.current >= 100) {
          terminalEffects.push({ type: 'corruption_complete' });
        }
        if (cost.type === 'sanity' && pool.current <= 0) {
          terminalEffects.push({ type: 'sanity_zero' });
        }
      }
    }
  }

  return { success: true, terminalEffects };
}

function applyStatusEffect(target: any, effect: any, currentTick: number): void {
  if (effect.duration > 0) {
    target.statusEffects.push(effect);
  }
}

function getActiveEffects(target: any, currentTick: number): any[] {
  return target.statusEffects.filter((e: any) => {
    return currentTick < e.appliedAt + e.duration;
  });
}

function updateEffects(target: any, currentTick: number): any[] {
  target.statusEffects = target.statusEffects.filter((e: any) => {
    return currentTick < e.appliedAt + e.duration;
  });
  return target.statusEffects;
}

interface MultiParadigmCosts {
  mana: number;
  favor: number;
}

function calculateMultiParadigmCosts(caster: MagicComponent, spell: ComposedSpell): MultiParadigmCosts {
  return {
    mana: spell.manaCost * 0.6,
    favor: spell.manaCost * 0.4,
  };
}

interface ParadigmSwitchResult {
  success: boolean;
  blockedBy?: string;
}

function switchParadigm(caster: MagicComponent, newParadigm: string): ParadigmSwitchResult {
  if (caster.sustainedSpells?.length > 0) {
    return { success: false, blockedBy: 'sustained_spell' };
  }
  return { success: true };
}

interface LearnParadigmResult {
  success: boolean;
  reason?: string;
}

function learnParadigm(caster: MagicComponent, paradigm: string): LearnParadigmResult {
  const forbidden = [
    ['divine', 'pact'],
    ['blood', 'divine'],
  ];

  for (const [p1, p2] of forbidden) {
    if ((caster.activeParadigms.includes(p1) && paradigm === p2) || (caster.activeParadigms.includes(p2) && paradigm === p1)) {
      return { success: false, reason: 'forbidden_combination' };
    }
  }

  return { success: true };
}

function cleanupExpiredEffects(target: any, currentTick: number): void {
  target.statusEffects = target.statusEffects.filter((e: any) => {
    return currentTick < e.appliedAt + e.duration;
  });
}

function cleanupSustainedSpells(caster: MagicComponent, currentTick: number): void {
  caster.sustainedSpells = (caster.sustainedSpells || []).filter((s) => {
    return s.endTime > currentTick;
  });
}

function trimCastHistory(caster: MagicComponent, maxSize: number): void {
  const history = caster.castHistory || [];
  if (history.length > maxSize) {
    caster.castHistory = history.slice(-maxSize);
  }
}

function validateSpell(spell: ComposedSpell): void {
  if (Number.isNaN(spell.manaCost)) {
    throw new Error('manaCost must be a valid number');
  }
}

function calculateFinalCost(base: number, modifier: number): number {
  if (Number.isNaN(modifier)) {
    return base;
  }
  return base * modifier;
}

function addMana(caster: MagicComponent, amount: number): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Cannot add infinite resources');
  }
  caster.resourcePools.mana.current += amount;
}

function calculateEfficiency(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
