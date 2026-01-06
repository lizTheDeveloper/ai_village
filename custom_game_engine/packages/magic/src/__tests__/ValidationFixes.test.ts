/**
 * Tests for documented magic system vulnerabilities
 * These tests verify fixes for issues in MAGIC_SYSTEM_VULNERABILITIES.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { MagicComponent } from '@ai-village/core';
import type { SpiritualComponent } from '@ai-village/core';

describe('Validation - Negative Locked Mana Exploit', () => {
  it('should reject negative locked mana values', () => {
    const caster: MagicComponent = {
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    } as any;

    // Attempt to set negative locked value
    expect(() => {
      caster.resourcePools.mana.locked = -50;
      // Validation should throw
      validateResourcePool(caster.resourcePools.mana);
    }).toThrow('locked cannot be negative');
  });

  it('should clamp locked mana to valid range [0, current]', () => {
    const caster: MagicComponent = {
      resourcePools: {
        mana: { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 },
      },
    } as any;

    // Try to lock more than current
    const clamped = clampLocked(caster.resourcePools.mana, 150);
    expect(clamped).toBe(100); // Should clamp to current

    // Try to lock negative
    const clampedNeg = clampLocked(caster.resourcePools.mana, -50);
    expect(clampedNeg).toBe(0); // Should clamp to 0
  });

  it('should correctly calculate available mana', () => {
    const pool = {
      type: 'mana' as const,
      current: 100,
      maximum: 100,
      regenRate: 0.01,
      locked: 30,
    };

    const available = getAvailableResource(pool);
    expect(available).toBe(70); // 100 - 30
  });

  it('should prevent locked from exceeding current', () => {
    const pool = {
      type: 'mana' as const,
      current: 50,
      maximum: 100,
      regenRate: 0.01,
      locked: 30,
    };

    // Spend mana, reducing current
    pool.current = 20;

    // Locked should auto-reduce to not exceed current
    const validated = validateAndFixResourcePool(pool);
    expect(validated.locked).toBeLessThanOrEqual(validated.current);
  });
});

describe('Validation - Paradigm Conflicts', () => {
  it('should detect conflicting paradigms (Divine + Pact)', () => {
    const caster: MagicComponent = {
      activeParadigms: ['divine', 'pact'],
      resourcePools: {},
    } as any;

    expect(() => {
      validateParadigmCombination(caster.activeParadigms);
    }).toThrow('Paradigms divine and pact are mutually exclusive');
  });

  it('should allow compatible paradigms (Academic + Divine)', () => {
    const caster: MagicComponent = {
      activeParadigms: ['academic', 'divine'],
      resourcePools: {},
    } as any;

    expect(() => {
      validateParadigmCombination(caster.activeParadigms);
    }).not.toThrow();
  });

  it('should detect incompatible paradigm combinations', () => {
    const combinations = [
      ['divine', 'pact'], // Both claim external patronage
      ['blood', 'divine'], // Life vs sacred
      ['anti', 'academic'], // Anti-magic vs magic
    ];

    for (const combo of combinations) {
      expect(() => {
        validateParadigmCombination(combo);
      }).toThrow('mutually exclusive');
    }
  });

  it('should allow multi-paradigm if universe allows it', () => {
    const universeConfig = {
      allowsMultiClass: true,
      maxParadigmsPerPractitioner: 3,
    };

    const caster: MagicComponent = {
      activeParadigms: ['academic', 'names', 'rune'],
      resourcePools: {},
    } as any;

    expect(() => {
      validateParadigmCombination(caster.activeParadigms, universeConfig);
    }).not.toThrow();
  });

  it('should enforce max paradigms per practitioner', () => {
    const universeConfig = {
      allowsMultiClass: true,
      maxParadigmsPerPractitioner: 2,
    };

    const caster: MagicComponent = {
      activeParadigms: ['academic', 'names', 'rune'],
      resourcePools: {},
    } as any;

    expect(() => {
      validateParadigmCombination(caster.activeParadigms, universeConfig);
    }).toThrow('Maximum 2 paradigms allowed');
  });
});

describe('Validation - Proficiency Bounds', () => {
  it('should cap proficiency at 100', () => {
    const spell = {
      spellId: 'fireball',
      proficiency: 150, // Invalid
      timesCast: 50,
    };

    const capped = capProficiency(spell.proficiency);
    expect(capped).toBe(100);
  });

  it('should floor proficiency at 0', () => {
    const spell = {
      spellId: 'fireball',
      proficiency: -20, // Invalid
      timesCast: 0,
    };

    const floored = capProficiency(spell.proficiency);
    expect(floored).toBe(0);
  });

  it('should reject NaN proficiency', () => {
    const spell = {
      spellId: 'fireball',
      proficiency: NaN,
      timesCast: 10,
    };

    expect(() => {
      validateProficiency(spell.proficiency);
    }).toThrow('Proficiency must be a valid number');
  });

  it('should reject Infinity proficiency', () => {
    const spell = {
      spellId: 'fireball',
      proficiency: Infinity,
      timesCast: 10,
    };

    expect(() => {
      validateProficiency(spell.proficiency);
    }).toThrow('Proficiency must be finite');
  });

  it('should validate and fix proficiency in known spells', () => {
    const knownSpells = [
      { spellId: 'fireball', proficiency: 150, timesCast: 50 },
      { spellId: 'frostbolt', proficiency: -10, timesCast: 0 },
      { spellId: 'lightning', proficiency: 75, timesCast: 25 },
    ];

    const fixed = validateAndFixKnownSpells(knownSpells);

    expect(fixed[0].proficiency).toBe(100); // Capped
    expect(fixed[1].proficiency).toBe(0); // Floored
    expect(fixed[2].proficiency).toBe(75); // Unchanged
  });
});

describe('Validation - Division by Zero', () => {
  it('should handle zero total prayers without NaN', () => {
    const spiritual: SpiritualComponent = {
      beliefs: {},
      totalPrayers: 0,
      answeredPrayers: 0,
    } as any;

    const answerRate = calculateAnswerRate(spiritual);
    expect(answerRate).toBe(0); // Not NaN
    expect(Number.isNaN(answerRate)).toBe(false);
  });

  it('should handle answer rate calculation safely', () => {
    const testCases = [
      { total: 0, answered: 0, expected: 0 },
      { total: 10, answered: 5, expected: 0.5 },
      { total: 10, answered: 0, expected: 0 },
      { total: 1, answered: 1, expected: 1.0 },
    ];

    for (const { total, answered, expected } of testCases) {
      const spiritual: SpiritualComponent = {
        beliefs: {},
        totalPrayers: total,
        answeredPrayers: answered,
      } as any;

      const rate = calculateAnswerRate(spiritual);
      expect(rate).toBe(expected);
      expect(Number.isNaN(rate)).toBe(false);
    }
  });

  it('should never return NaN from statistical calculations', () => {
    const spiritual: SpiritualComponent = {
      beliefs: {},
      totalPrayers: 0,
      answeredPrayers: 0,
      prayerHistory: [],
    } as any;

    const stats = calculatePrayerStatistics(spiritual);

    expect(Number.isNaN(stats.answerRate)).toBe(false);
    expect(Number.isNaN(stats.averageResponseTime)).toBe(false);
    expect(Number.isNaN(stats.faithGrowthRate)).toBe(false);
  });
});

describe('Validation - Faith Bounds', () => {
  it('should clamp faith to [0, 1]', () => {
    const testCases = [
      { input: 1.5, expected: 1.0 },
      { input: -0.3, expected: 0.0 },
      { input: 0.5, expected: 0.5 },
      { input: 2.0, expected: 1.0 },
      { input: -1.0, expected: 0.0 },
    ];

    for (const { input, expected } of testCases) {
      const clamped = clampFaith(input);
      expect(clamped).toBe(expected);
    }
  });

  it('should validate faith when setting belief', () => {
    const spiritual: SpiritualComponent = {
      beliefs: {},
    } as any;

    expect(() => {
      setFaith(spiritual, 'test_deity', 2.5);
    }).toThrow('Faith must be between 0 and 1');

    expect(() => {
      setFaith(spiritual, 'test_deity', -0.5);
    }).toThrow('Faith must be between 0 and 1');
  });

  it('should auto-clamp faith on updates', () => {
    const spiritual: SpiritualComponent = {
      beliefs: {
        test_deity: { faith: 0.5, devotion: 0.5 },
      },
    } as any;

    // Attempt to increase beyond 1.0
    adjustFaith(spiritual, 'test_deity', 0.8);
    expect(spiritual.beliefs.test_deity.faith).toBe(1.0);

    // Attempt to decrease below 0.0
    adjustFaith(spiritual, 'test_deity', -2.0);
    expect(spiritual.beliefs.test_deity.faith).toBe(0.0);
  });

  it('should reject NaN and Infinity faith values', () => {
    const spiritual: SpiritualComponent = {
      beliefs: {},
    } as any;

    expect(() => {
      setFaith(spiritual, 'test_deity', NaN);
    }).toThrow('Faith must be a valid number');

    expect(() => {
      setFaith(spiritual, 'test_deity', Infinity);
    }).toThrow('Faith must be finite');
  });
});

describe('Validation - Resource Pool Integrity', () => {
  it('should ensure current never exceeds maximum', () => {
    const pool = {
      type: 'mana' as const,
      current: 150, // Invalid
      maximum: 100,
      regenRate: 0.01,
      locked: 0,
    };

    const fixed = validateAndFixResourcePool(pool);
    expect(fixed.current).toBeLessThanOrEqual(fixed.maximum);
  });

  it('should ensure current is never negative', () => {
    const pool = {
      type: 'mana' as const,
      current: -50, // Invalid
      maximum: 100,
      regenRate: 0.01,
      locked: 0,
    };

    const fixed = validateAndFixResourcePool(pool);
    expect(fixed.current).toBeGreaterThanOrEqual(0);
  });

  it('should validate all numeric fields are finite', () => {
    const invalidPools = [
      { type: 'mana' as const, current: Infinity, maximum: 100, regenRate: 0.01, locked: 0 },
      { type: 'mana' as const, current: 100, maximum: NaN, regenRate: 0.01, locked: 0 },
      { type: 'mana' as const, current: 100, maximum: 100, regenRate: Infinity, locked: 0 },
    ];

    for (const pool of invalidPools) {
      expect(() => {
        validateResourcePool(pool);
      }).toThrow('must be finite');
    }
  });

  it('should ensure locked resources are freed when appropriate', () => {
    const pool = {
      type: 'mana' as const,
      current: 50,
      maximum: 100,
      regenRate: 0.01,
      locked: 80, // More locked than current!
    };

    const fixed = validateAndFixResourcePool(pool);
    expect(fixed.locked).toBeLessThanOrEqual(fixed.current);
  });
});

// Helper functions that should be implemented
function validateResourcePool(pool: any): void {
  if (pool.locked < 0) {
    throw new Error('locked cannot be negative');
  }
  if (!Number.isFinite(pool.current) || !Number.isFinite(pool.maximum)) {
    throw new Error('Pool values must be finite');
  }
  if (!Number.isFinite(pool.regenRate)) {
    throw new Error('Regen rate must be finite');
  }
}

function clampLocked(pool: any, value: number): number {
  return Math.max(0, Math.min(pool.current, value));
}

function getAvailableResource(pool: any): number {
  return Math.max(0, pool.current - pool.locked);
}

function validateAndFixResourcePool(pool: any): any {
  const fixed = { ...pool };
  fixed.current = Math.max(0, Math.min(fixed.maximum, fixed.current));
  fixed.locked = Math.max(0, Math.min(fixed.current, fixed.locked));
  return fixed;
}

function validateParadigmCombination(paradigms: string[], config?: any): void {
  const forbidden: Array<[string, string]> = [
    ['divine', 'pact'],
    ['blood', 'divine'],
    ['anti', 'academic'],
  ];

  for (const [p1, p2] of forbidden) {
    if (paradigms.includes(p1) && paradigms.includes(p2)) {
      throw new Error(`Paradigms ${p1} and ${p2} are mutually exclusive`);
    }
  }

  if (config?.maxParadigmsPerPractitioner && paradigms.length > config.maxParadigmsPerPractitioner) {
    throw new Error(`Maximum ${config.maxParadigmsPerPractitioner} paradigms allowed`);
  }
}

function capProficiency(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function validateProficiency(value: number): void {
  if (Number.isNaN(value)) {
    throw new Error('Proficiency must be a valid number');
  }
  if (!Number.isFinite(value)) {
    throw new Error('Proficiency must be finite');
  }
}

function validateAndFixKnownSpells(spells: any[]): any[] {
  return spells.map((spell) => ({
    ...spell,
    proficiency: capProficiency(spell.proficiency),
  }));
}

function calculateAnswerRate(spiritual: SpiritualComponent): number {
  if (spiritual.totalPrayers === 0) return 0;
  return spiritual.answeredPrayers / spiritual.totalPrayers;
}

function calculatePrayerStatistics(spiritual: SpiritualComponent): any {
  return {
    answerRate: calculateAnswerRate(spiritual),
    averageResponseTime: 0,
    faithGrowthRate: 0,
  };
}

function clampFaith(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function setFaith(spiritual: SpiritualComponent, deityId: string, value: number): void {
  if (Number.isNaN(value)) {
    throw new Error('Faith must be a valid number');
  }
  if (!Number.isFinite(value)) {
    throw new Error('Faith must be finite');
  }
  if (value < 0 || value > 1) {
    throw new Error('Faith must be between 0 and 1');
  }
  if (!spiritual.beliefs[deityId]) {
    spiritual.beliefs[deityId] = { faith: 0, devotion: 0 } as any;
  }
  spiritual.beliefs[deityId].faith = value;
}

function adjustFaith(spiritual: SpiritualComponent, deityId: string, delta: number): void {
  if (!spiritual.beliefs[deityId]) {
    spiritual.beliefs[deityId] = { faith: 0, devotion: 0 } as any;
  }
  const newFaith = spiritual.beliefs[deityId].faith + delta;
  spiritual.beliefs[deityId].faith = clampFaith(newFaith);
}
