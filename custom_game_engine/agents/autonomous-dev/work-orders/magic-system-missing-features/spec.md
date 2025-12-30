# Magic System Missing Features - Technical Specification

**Version:** 1.0
**Date:** 2025-12-29
**Author:** Vulnerability Analysis System

---

## Overview

This specification defines the missing implementations and validations required to bring the magic system from "exploitable prototype" to "production-ready system" while preserving intentional power and creativity.

**Key Principle:** Magic should be powerful (economy-breaking combos are features), but the game engine should be robust (state corruption and arithmetic exploits are bugs).

---

## 1. Component Initialization

### 1.1 SpiritualComponent

**Current State:**
```typescript
export function createSpiritualComponent(deityId: string): SpiritualComponent {
  return {
    type: 'spiritual',
    deityId,      // Stores undefined when passed ''
    faith: 0,
    // recentPrayers NOT initialized
    visions: [],
    doubts: [],
    // ...
  };
}
```

**Required State:**
```typescript
export function createSpiritualComponent(deityId: string): SpiritualComponent {
  return {
    type: 'spiritual',
    deityId: deityId || '',  // Ensure empty string, not undefined
    faith: 0,
    recentPrayers: [],       // Initialize as empty array
    visions: [],
    doubts: [],
    crisisOfFaith: false,
  };
}
```

**Validation:**
```typescript
// After creation
const spiritual = createSpiritualComponent('');
assert(spiritual.deityId === '');
assert(Array.isArray(spiritual.recentPrayers));
assert(spiritual.recentPrayers.length === 0);
```

### 1.2 MagicComponent

**Current State:**
```typescript
export function createMagicComponent(): MagicComponent {
  return {
    type: 'magic',
    magicUser: false,
    manaPools: [],
    knownParadigmIds: [],
    knownSpells: [],
    // paradigmSpecificState NOT initialized
  };
}
```

**Required State:**
```typescript
export function createMagicComponent(): MagicComponent {
  return {
    type: 'magic',
    magicUser: false,
    manaPools: [],
    knownParadigmIds: [],
    knownSpells: [],
    paradigmSpecificState: new Map(), // Initialize as Map
    casting: false,
    activeSpellId: undefined,
    corruption: 0,
  };
}
```

**Validation:**
```typescript
// After creation
const magic = createMagicComponent();
assert(magic.paradigmSpecificState instanceof Map);
assert(magic.paradigmSpecificState.size === 0);
```

---

## 2. Stat Capping System

### 2.1 Stat Ranges

Define valid ranges for all magical stats:

```typescript
export const STAT_CAPS = {
  proficiency: { min: 0, max: 100 },
  corruption: { min: 0, max: 1.0 },
  faith: { min: 0, max: 1.0 },
  luck: { min: -100, max: 100 },
  luckDebt: { min: 0, max: 1000 },
  clarity: { min: 0, max: 1.0 },
  severity: { min: 0, max: 1.0 },
  intensity: { min: 0, max: 1.0 },
} as const;
```

### 2.2 Clamping Functions

```typescript
export function clampStat(value: number, statType: keyof typeof STAT_CAPS): number {
  const { min, max } = STAT_CAPS[statType];
  return Math.max(min, Math.min(max, value));
}

export function setProficiency(spell: KnownSpell, value: number): void {
  spell.proficiency = clampStat(value, 'proficiency');
}

export function setCorruption(magic: MagicComponent, value: number): void {
  magic.corruption = clampStat(value, 'corruption');
}

export function setFaith(spiritual: SpiritualComponent, value: number): void {
  spiritual.faith = clampStat(value, 'faith');
}

export function setLuck(luckState: any, value: number): void {
  luckState.currentLuck = clampStat(value, 'luck');
}
```

### 2.3 Validation

```typescript
describe('Stat Caps', () => {
  it('should clamp proficiency to 0-100', () => {
    expect(clampStat(-10, 'proficiency')).toBe(0);
    expect(clampStat(50, 'proficiency')).toBe(50);
    expect(clampStat(150, 'proficiency')).toBe(100);
  });

  it('should clamp corruption to 0-1', () => {
    expect(clampStat(-0.5, 'corruption')).toBe(0);
    expect(clampStat(0.5, 'corruption')).toBe(0.5);
    expect(clampStat(5.0, 'corruption')).toBe(1.0);
  });

  it('should clamp faith to 0-1', () => {
    expect(clampStat(-1, 'faith')).toBe(0);
    expect(clampStat(0.8, 'faith')).toBe(0.8);
    expect(clampStat(2.5, 'faith')).toBe(1.0);
  });

  it('should clamp luck to -100 to 100', () => {
    expect(clampStat(-500, 'luck')).toBe(-100);
    expect(clampStat(50, 'luck')).toBe(50);
    expect(clampStat(1000, 'luck')).toBe(100);
  });
});
```

---

## 3. Paradigm Conflict System

### 3.1 Conflict Definitions

```typescript
export const PARADIGM_CONFLICTS = {
  // Mutually exclusive paradigms
  exclusive: [
    ['divine', 'pact'],           // Cannot serve deity and demon
    ['academic', 'intuition'],    // Cannot be both rigorous and intuitive
    ['order', 'chaos'],           // Fundamental opposition
  ],

  // Paradigms that reduce each other's effectiveness
  antagonistic: [
    ['silence', 'song'],          // Silence cancels song
    ['dream', 'reality'],         // Dream magic weakens in reality
    ['light', 'shadow'],          // Light dispels shadow
  ],

  // Paradigms that enhance each other
  synergistic: [
    ['sympathy', 'craft'],        // Sympathy amplifies crafting
    ['echo', 'any'],              // Echo amplifies everything
    ['belief', 'social'],         // Belief spreads through social
  ],
} as const;
```

### 3.2 Validation Functions

```typescript
export function canLearnParadigm(
  magic: MagicComponent,
  paradigmId: string
): { allowed: boolean; reason?: string } {
  // Check if already known
  if (magic.knownParadigmIds.includes(paradigmId)) {
    return {
      allowed: false,
      reason: `Already know paradigm: ${paradigmId}`,
    };
  }

  // Check exclusive conflicts
  for (const [a, b] of PARADIGM_CONFLICTS.exclusive) {
    if (paradigmId === a && magic.knownParadigmIds.includes(b)) {
      return {
        allowed: false,
        reason: `Cannot learn ${a}: conflicts with ${b} (exclusive)`,
      };
    }
    if (paradigmId === b && magic.knownParadigmIds.includes(a)) {
      return {
        allowed: false,
        reason: `Cannot learn ${b}: conflicts with ${a} (exclusive)`,
      };
    }
  }

  // Check paradigm exists
  // TODO: Validate against paradigm registry

  return { allowed: true };
}

export function addParadigm(magic: MagicComponent, paradigmId: string): void {
  const check = canLearnParadigm(magic, paradigmId);
  if (!check.allowed) {
    throw new Error(`Cannot add paradigm: ${check.reason}`);
  }
  magic.knownParadigmIds.push(paradigmId);
}
```

### 3.3 Validation

```typescript
describe('Paradigm Conflicts', () => {
  it('should prevent Divine + Pact', () => {
    const magic = createMagicComponent();
    addParadigm(magic, 'divine');

    expect(() => addParadigm(magic, 'pact')).toThrow(
      'Cannot add paradigm: Cannot learn pact: conflicts with divine (exclusive)'
    );
  });

  it('should prevent adding same paradigm twice', () => {
    const magic = createMagicComponent();
    addParadigm(magic, 'academic');

    expect(() => addParadigm(magic, 'academic')).toThrow(
      'Already know paradigm: academic'
    );
  });

  it('should allow non-conflicting paradigms', () => {
    const magic = createMagicComponent();
    addParadigm(magic, 'academic');
    addParadigm(magic, 'craft');

    expect(magic.knownParadigmIds).toEqual(['academic', 'craft']);
  });
});
```

---

## 4. State Transition Validation

### 4.1 Valid States

Define legal state combinations for MagicComponent:

```typescript
type MagicState =
  | { casting: false; activeSpellId: undefined }
  | { casting: true; activeSpellId: string };

// Invalid states (should be prevented):
// { casting: false; activeSpellId: 'spell' }  // Not casting but has active spell
// { casting: true; activeSpellId: undefined }  // Casting nothing
```

### 4.2 Validation Functions

```typescript
export function validateMagicState(magic: MagicComponent): void {
  // Must be magic user to have magic state
  if (magic.casting && !magic.magicUser) {
    throw new Error(
      `Invalid state: Entity is casting but magicUser=false`
    );
  }

  // Casting XOR activeSpellId
  if (magic.casting && !magic.activeSpellId) {
    throw new Error(
      `Invalid state: casting=true but activeSpellId is undefined`
    );
  }

  if (!magic.casting && magic.activeSpellId) {
    throw new Error(
      `Invalid state: casting=false but activeSpellId='${magic.activeSpellId}'`
    );
  }

  // Home paradigm must be known
  if (magic.homeParadigmId && !magic.knownParadigmIds.includes(magic.homeParadigmId)) {
    throw new Error(
      `Invalid state: homeParadigmId='${magic.homeParadigmId}' not in knownParadigmIds`
    );
  }
}

export function startCasting(magic: MagicComponent, spellId: string): void {
  validateMagicState(magic); // Check current state is valid

  if (!magic.magicUser) {
    throw new Error('Cannot cast: Not a magic user');
  }

  if (magic.casting) {
    throw new Error(`Already casting: ${magic.activeSpellId}`);
  }

  magic.casting = true;
  magic.activeSpellId = spellId;
}

export function stopCasting(magic: MagicComponent): void {
  magic.casting = false;
  magic.activeSpellId = undefined;
}
```

### 4.3 Validation

```typescript
describe('State Transitions', () => {
  it('should prevent casting without being magic user', () => {
    const magic = createMagicComponent();
    magic.magicUser = false;

    expect(() => startCasting(magic, 'fireball')).toThrow(
      'Cannot cast: Not a magic user'
    );
  });

  it('should prevent double-casting', () => {
    const magic = createMagicUserComponent('arcane', 100, 'academic');
    startCasting(magic, 'spell1');

    expect(() => startCasting(magic, 'spell2')).toThrow(
      'Already casting: spell1'
    );
  });

  it('should allow casting after stopping', () => {
    const magic = createMagicUserComponent('arcane', 100, 'academic');
    startCasting(magic, 'spell1');
    stopCasting(magic);
    startCasting(magic, 'spell2');

    expect(magic.activeSpellId).toBe('spell2');
  });
});
```

---

## 5. Mana Pool Integrity

### 5.1 Invariants

Mana pools must maintain these invariants at all times:

```typescript
// For any ManaPool:
invariant(pool.locked >= 0);
invariant(pool.locked <= pool.current);
invariant(pool.current >= 0);
invariant(pool.current <= pool.maximum);
invariant(pool.maximum > 0);
invariant(pool.regenRate >= 0);
```

### 5.2 Safe Setters

```typescript
export function setManaLocked(pool: ManaPool, value: number): void {
  // Clamp to valid range
  pool.locked = Math.max(0, Math.min(pool.current, value));
}

export function setManaCurrent(pool: ManaPool, value: number): void {
  pool.current = Math.max(0, Math.min(pool.maximum, value));

  // If locked exceeds new current, reduce locked
  if (pool.locked > pool.current) {
    pool.locked = pool.current;
  }
}

export function setManaMaximum(pool: ManaPool, value: number): void {
  if (value <= 0) {
    throw new Error(`Invalid mana maximum: ${value} (must be > 0)`);
  }

  pool.maximum = value;

  // If current exceeds new maximum, cap it
  if (pool.current > pool.maximum) {
    pool.current = pool.maximum;
  }

  // If locked exceeds new current (after capping), reduce locked
  if (pool.locked > pool.current) {
    pool.locked = pool.current;
  }
}

export function validateManaPool(pool: ManaPool): void {
  if (pool.locked < 0) {
    throw new Error(`Invalid mana pool: locked=${pool.locked} (must be >= 0)`);
  }
  if (pool.locked > pool.current) {
    throw new Error(
      `Invalid mana pool: locked=${pool.locked} > current=${pool.current}`
    );
  }
  if (pool.current < 0) {
    throw new Error(`Invalid mana pool: current=${pool.current} (must be >= 0)`);
  }
  if (pool.current > pool.maximum) {
    throw new Error(
      `Invalid mana pool: current=${pool.current} > maximum=${pool.maximum}`
    );
  }
  if (pool.maximum <= 0) {
    throw new Error(`Invalid mana pool: maximum=${pool.maximum} (must be > 0)`);
  }
  if (pool.regenRate < 0) {
    throw new Error(`Invalid mana pool: regenRate=${pool.regenRate} (must be >= 0)`);
  }
}
```

### 5.3 Validation

```typescript
describe('Mana Pool Integrity', () => {
  it('should clamp locked to current', () => {
    const pool = { source: 'arcane', current: 100, maximum: 100, locked: 0, regenRate: 0.05 };

    setManaLocked(pool, 150);
    expect(pool.locked).toBe(100); // Clamped to current
  });

  it('should prevent negative locked', () => {
    const pool = { source: 'arcane', current: 100, maximum: 100, locked: 0, regenRate: 0.05 };

    setManaLocked(pool, -50);
    expect(pool.locked).toBe(0); // Clamped to 0
  });

  it('should reduce locked when current decreases', () => {
    const pool = { source: 'arcane', current: 100, maximum: 100, locked: 80, regenRate: 0.05 };

    setManaCurrent(pool, 50);
    expect(pool.current).toBe(50);
    expect(pool.locked).toBe(50); // Reduced to match current
  });

  it('should throw on invalid maximum', () => {
    const pool = { source: 'arcane', current: 100, maximum: 100, locked: 0, regenRate: 0.05 };

    expect(() => setManaMaximum(pool, 0)).toThrow(
      'Invalid mana maximum: 0 (must be > 0)'
    );
  });
});
```

---

## 6. Mana Reservation System

### 6.1 Current Problem

```typescript
// Current: Mana check at start, deduction at end
// Race condition: Two spells can both check before either deducts

// Spell A starts
const canCastA = getMana(caster, 'arcane') >= 60; // true (100 >= 60)

// Spell B starts (before A completes)
const canCastB = getMana(caster, 'arcane') >= 60; // true (still 100 >= 60)

// Both spells cast! Used 120 mana with only 100 available
```

### 6.2 Solution: Reserve at Start

```typescript
export function reserveMana(
  magic: MagicComponent,
  source: ManaSource,
  amount: number
): { success: boolean; reason?: string } {
  const pool = magic.manaPools.find(p => p.source === source);

  if (!pool) {
    return {
      success: false,
      reason: `No mana pool for source: ${source}`,
    };
  }

  const available = pool.current - pool.locked;

  if (available < amount) {
    return {
      success: false,
      reason: `Insufficient mana: need ${amount}, have ${available} available`,
    };
  }

  // Reserve by locking
  pool.locked += amount;

  return { success: true };
}

export function releaseMana(
  magic: MagicComponent,
  source: ManaSource,
  amount: number,
  consume: boolean
): void {
  const pool = magic.manaPools.find(p => p.source === source);
  if (!pool) return;

  if (consume) {
    // Deduct from current
    pool.current -= amount;
  }

  // Release lock
  pool.locked -= amount;

  // Ensure bounds
  setManaLocked(pool, pool.locked);
  setManaCurrent(pool, pool.current);
}
```

### 6.3 Updated Cast Flow

```typescript
export function startSpellCast(
  magic: MagicComponent,
  spell: ComposedSpell
): { success: boolean; reason?: string } {
  // 1. Validate state
  validateMagicState(magic);

  // 2. Reserve mana FIRST
  const reservation = reserveMana(magic, spell.source, spell.manaCost);
  if (!reservation.success) {
    return reservation;
  }

  // 3. Start casting
  magic.casting = true;
  magic.activeSpellId = spell.id;

  return { success: true };
}

export function completeSpellCast(
  magic: MagicComponent,
  spell: ComposedSpell,
  success: boolean
): void {
  // 4. Release reservation
  releaseMana(magic, spell.source, spell.manaCost, success);

  // 5. Stop casting
  stopCasting(magic);
}
```

### 6.4 Validation

```typescript
describe('Mana Reservation', () => {
  it('should prevent double-casting via reservation', () => {
    const magic = createMagicUserComponent('arcane', 100, 'academic');

    const spell = {
      source: 'arcane',
      manaCost: 60,
      // ...
    };

    // Cast 1: succeeds
    const cast1 = startSpellCast(magic, spell);
    expect(cast1.success).toBe(true);

    // Mana is now locked
    const pool = magic.manaPools[0];
    expect(pool.locked).toBe(60);
    expect(pool.current - pool.locked).toBe(40); // Only 40 available

    // Cast 2: fails (insufficient available mana)
    const cast2 = startSpellCast(magic, spell);
    expect(cast2.success).toBe(false);
    expect(cast2.reason).toContain('Insufficient mana');
  });

  it('should release mana on completion', () => {
    const magic = createMagicUserComponent('arcane', 100, 'academic');

    const spell = { source: 'arcane', manaCost: 60 };

    startSpellCast(magic, spell);
    completeSpellCast(magic, spell, true);

    const pool = magic.manaPools[0];
    expect(pool.locked).toBe(0);
    expect(pool.current).toBe(40); // Consumed
  });

  it('should refund mana on cancel', () => {
    const magic = createMagicUserComponent('arcane', 100, 'academic');

    const spell = { source: 'arcane', manaCost: 60 };

    startSpellCast(magic, spell);
    completeSpellCast(magic, spell, false); // Cancel

    const pool = magic.manaPools[0];
    expect(pool.locked).toBe(0);
    expect(pool.current).toBe(100); // Refunded
  });
});
```

---

## 7. Cooldown Floor

### 7.1 Problem

```typescript
// Base cooldown: 10 ticks
let cooldown = 10;

// Reduction from items: -15 ticks
cooldown -= 15;

// Result: -5 ticks (instant + 5 free casts!)
```

### 7.2 Solution

```typescript
export const MINIMUM_COOLDOWN = 1; // Ticks

export function calculateEffectiveCooldown(
  baseCooldown: number,
  reductions: number[]
): number {
  let cooldown = baseCooldown;

  // Apply multiplicative reductions (items with -20% etc.)
  for (const reduction of reductions) {
    if (reduction < 1) {
      // Multiplicative (0.8 = -20%)
      cooldown *= reduction;
    } else {
      // Additive (-5 ticks)
      cooldown -= reduction;
    }
  }

  // Enforce minimum
  return Math.max(MINIMUM_COOLDOWN, cooldown);
}
```

### 7.3 Validation

```typescript
describe('Cooldown Floor', () => {
  it('should enforce minimum cooldown of 1', () => {
    const base = 10;
    const reductions = [15]; // More than base

    const effective = calculateEffectiveCooldown(base, reductions);
    expect(effective).toBe(1);
  });

  it('should allow stacking without going negative', () => {
    const base = 100;
    const reductions = [0.8, 0.8, 0.8, 0.8, 0.8]; // 5x -20%

    const effective = calculateEffectiveCooldown(base, reductions);
    // 100 * (0.8^5) = 32.768
    expect(effective).toBeGreaterThan(30);
    expect(effective).toBeLessThan(35);
  });
});
```

---

## 8. Price Manipulation Caps

### 8.1 Problem

```typescript
// Commerce magic: reduce price by 50% per cast
let price = 100;
for (let i = 0; i < 30; i++) {
  price *= 0.5;
}
// Result: 0.00009 gold (effectively free)
```

### 8.2 Solution

```typescript
export const PRICE_CAPS = {
  minMultiplierPerCast: 0.5,  // Can't reduce by more than 50% per cast
  maxMultiplierPerCast: 2.0,  // Can't increase by more than 2x per cast
  absoluteMinimum: 0.01,      // Can never be cheaper than 1 copper
  absoluteMaximum: 1_000_000, // Can never exceed 1 million gold
} as const;

export function applyPriceMultiplier(
  currentPrice: number,
  multiplier: number
): number {
  // Clamp multiplier
  const clampedMultiplier = Math.max(
    PRICE_CAPS.minMultiplierPerCast,
    Math.min(PRICE_CAPS.maxMultiplierPerCast, multiplier)
  );

  // Apply
  let newPrice = currentPrice * clampedMultiplier;

  // Enforce absolute bounds
  newPrice = Math.max(PRICE_CAPS.absoluteMinimum, newPrice);
  newPrice = Math.min(PRICE_CAPS.absoluteMaximum, newPrice);

  return newPrice;
}
```

### 8.3 Validation

```typescript
describe('Price Manipulation Caps', () => {
  it('should prevent reducing price to zero', () => {
    let price = 100;

    // Try to reduce 30 times
    for (let i = 0; i < 30; i++) {
      price = applyPriceMultiplier(price, 0.5);
    }

    // Should be clamped to minimum
    expect(price).toBeGreaterThanOrEqual(0.01);
  });

  it('should cap single-cast reduction', () => {
    const price = 100;

    // Try to reduce by 99%
    const newPrice = applyPriceMultiplier(price, 0.01);

    // Should be clamped to 50% reduction max
    expect(newPrice).toBe(50);
  });

  it('should prevent infinite price inflation', () => {
    let price = 1;

    // Try to inflate 30 times
    for (let i = 0; i < 30; i++) {
      price = applyPriceMultiplier(price, 2.0);
    }

    // Should be clamped to maximum
    expect(price).toBe(1_000_000);
  });
});
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

Each validation function gets comprehensive unit tests:

```typescript
// MagicValidator.test.ts
describe('MagicValidator', () => {
  describe('Stat Caps', () => { /* ... */ });
  describe('Paradigm Conflicts', () => { /* ... */ });
  describe('State Transitions', () => { /* ... */ });
  describe('Mana Pool Integrity', () => { /* ... */ });
});
```

### 9.2 Integration Tests

Test validation in realistic scenarios:

```typescript
// MagicSystemValidation.integration.test.ts
describe('Magic System Validation Integration', () => {
  it('should prevent exploit: over-corruption power bonus', () => {
    const mage = createMagicUserComponent('blood', 100, 'blood_magic');

    // Try to set corruption to 5.0
    setCorruption(mage, 5.0);

    // Should be clamped to 1.0
    expect(mage.corruption).toBe(1.0);
  });

  it('should prevent exploit: simultaneous double-cast', () => {
    const mage = createMagicUserComponent('arcane', 100, 'academic');

    const spell = {
      id: 'fireball',
      source: 'arcane',
      manaCost: 60,
      // ...
    };

    // Start first cast
    const cast1 = startSpellCast(mage, spell);
    expect(cast1.success).toBe(true);

    // Try second cast (should fail)
    const cast2 = startSpellCast(mage, spell);
    expect(cast2.success).toBe(false);
  });
});
```

### 9.3 Exploit Regression Tests

Update existing exploit tests to expect validation errors:

```typescript
// MagicSystemAdversarial.test.ts (updated)
describe('Adversarial Tests (Should Now Fail)', () => {
  it('FIXED: Negative locked mana exploit', () => {
    const mage = createMagicUserComponent('arcane', 100, 'academic');
    const pool = mage.manaPools[0];

    // Try to set negative locked
    setManaLocked(pool, -50);

    // Should be clamped to 0
    expect(pool.locked).toBe(0);
  });

  it('FIXED: Divine + Pact exploit', () => {
    const mage = createMagicComponent();

    addParadigm(mage, 'divine');

    // Should throw on conflict
    expect(() => addParadigm(mage, 'pact')).toThrow();
  });
});
```

---

## 10. Migration & Backward Compatibility

### 10.1 Save File Migration

Existing save files may have invalid states. Sanitize on load:

```typescript
export function sanitizeMagicComponent(magic: MagicComponent): void {
  // Initialize missing fields
  if (!magic.paradigmSpecificState) {
    magic.paradigmSpecificState = new Map();
  }

  // Clamp stats
  if (magic.corruption !== undefined) {
    magic.corruption = clampStat(magic.corruption, 'corruption');
  }

  // Fix state inconsistencies
  if (!magic.casting && magic.activeSpellId) {
    console.warn(`Sanitizing: clearing activeSpellId without casting`);
    magic.activeSpellId = undefined;
  }

  // Validate mana pools
  for (const pool of magic.manaPools) {
    try {
      validateManaPool(pool);
    } catch (e) {
      console.warn(`Sanitizing mana pool: ${e.message}`);
      pool.locked = Math.max(0, Math.min(pool.current, pool.locked));
      pool.current = Math.max(0, Math.min(pool.maximum, pool.current));
    }
  }

  // Validate paradigms
  const invalid = [];
  for (const paradigmId of magic.knownParadigmIds) {
    const check = canLearnParadigm(magic, paradigmId);
    if (!check.allowed) {
      invalid.push(paradigmId);
    }
  }

  if (invalid.length > 0) {
    console.warn(`Removing conflicting paradigms: ${invalid.join(', ')}`);
    magic.knownParadigmIds = magic.knownParadigmIds.filter(
      p => !invalid.includes(p)
    );
  }
}
```

### 10.2 Gradual Rollout

1. **Phase 1:** Add validation functions (opt-in)
2. **Phase 2:** Log warnings when validation would fail
3. **Phase 3:** Throw errors in strict mode
4. **Phase 4:** Always enforce validation

---

## 11. Performance Considerations

### 11.1 Validation Overhead

Validation adds overhead. Optimize hot paths:

```typescript
// Hot path: Called every frame
export function getMana(magic: MagicComponent, source: ManaSource): number {
  const pool = magic.manaPools.find(p => p.source === source);
  if (!pool) return 0;

  // NO validation here (too expensive)
  return pool.current - pool.locked;
}

// Cold path: Called on mutation
export function setManaCurrent(pool: ManaPool, value: number): void {
  // DO validate here (only when changing)
  pool.current = Math.max(0, Math.min(pool.maximum, value));
  if (pool.locked > pool.current) {
    pool.locked = pool.current;
  }
}
```

### 11.2 Validation Budget

Add validation only where state can be corrupted:
- ✅ External mutations (setters, actions)
- ✅ Load from save file
- ✅ Network sync
- ❌ Internal calculations
- ❌ Every frame updates

---

## 12. Documentation

### 12.1 API Documentation

All validation functions must be documented:

```typescript
/**
 * Clamps a magical stat to its valid range.
 *
 * @param value - The value to clamp
 * @param statType - The type of stat (determines range)
 * @returns The clamped value within valid range
 *
 * @example
 * ```typescript
 * clampStat(150, 'proficiency'); // Returns 100 (max proficiency)
 * clampStat(-10, 'corruption');   // Returns 0 (min corruption)
 * ```
 */
export function clampStat(value: number, statType: keyof typeof STAT_CAPS): number;
```

### 12.2 Error Messages

Errors should be actionable:

```typescript
// Bad
throw new Error('Invalid state');

// Good
throw new Error(
  `Invalid magic state: casting=${magic.casting} but activeSpellId=undefined. ` +
  `Either set casting=false or provide a spell ID.`
);
```

---

## 13. Success Metrics

Track these metrics post-implementation:

1. **Zero TypeErrors** from undefined properties
2. **Zero arithmetic exploits** (negative cooldowns, overflow stats)
3. **Zero state corruption** (impossible state combinations)
4. **All 289 tests execute** (no initialization failures)
5. **Performance overhead <5%** (validation should be cheap)

---

**End of Specification**
