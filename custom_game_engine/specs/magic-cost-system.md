# Magic Cost System - Design & Implementation

**Created:** 2025-12-29
**Updated:** 2025-12-29
**Status:** Fully Implemented
**Related:** `openspec/specs/magic-system/paradigm-spec.md`

---

## Implementation Status

### ✅ Core Infrastructure (Complete)
- **CostCalculator interface** (`costs/CostCalculator.ts`) - Base interface and `BaseCostCalculator` abstract class
- **CostCalculatorRegistry** (`costs/CostCalculatorRegistry.ts`) - Singleton registry for paradigm calculators
- **CostRecoveryManager** (`costs/CostRecoveryManager.ts`) - Recovery methods (rest, ritual, prayer, quest, sacrifice)
- **SpellEffect types** (`SpellEffect.ts`) - 17 effect categories with scaling and factory functions
- **SpellEffectRegistry** (`SpellEffectRegistry.ts`) - Central registry with category indexing
- **SpellEffectExecutor** (`SpellEffectExecutor.ts`) - Execution engine with applier registration
- **HealingEffectApplier** (`appliers/HealingEffectApplier.ts`) - Healing effect implementation

### ✅ All Paradigm Cost Calculators (Complete)
- **AcademicCostCalculator** (`costs/calculators/AcademicCostCalculator.ts`) - Mana + stamina costs
- **PactCostCalculator** (`costs/calculators/PactCostCalculator.ts`) - Favor + corruption + soul_fragment costs
- **NameCostCalculator** (`costs/calculators/NameCostCalculator.ts`) - Time + sanity + attention costs
- **BreathCostCalculator** (`costs/calculators/BreathCostCalculator.ts`) - BioChromatic Breath costs
- **DivineCostCalculator** (`costs/calculators/DivineCostCalculator.ts`) - Favor + karma costs
- **BloodCostCalculator** (`costs/calculators/BloodCostCalculator.ts`) - Blood + health + corruption + lifespan
- **EmotionalCostCalculator** (`costs/calculators/EmotionalCostCalculator.ts`) - Emotion + sanity costs
- **DivineCastingCalculator** (`costs/calculators/DivineCastingCalculator.ts`) - God-to-mortal magic conversion

### ✅ Integration Complete
- **MagicLawEnforcer** - Uses CostCalculatorRegistry for validation
- **MagicSystem** - Wired to CostRecoveryManager for passive regeneration
- **TerminalEffectHandler** (`TerminalEffectHandler.ts`) - Handles death, corruption, soul loss, etc.

### ✅ Effect Appliers (Complete)
- **HealingEffectApplier** - Restore health/resources
- **DamageEffectApplier** - Deal damage
- **ProtectionEffectApplier** - Shields/wards
- **ControlEffectApplier** - Stun/root/fear
- **SummonEffectApplier** - Create entities
- **TransformEffectApplier** - Polymorph effects
- **BodyTransformEffectApplier** - Physical transformations
- **BodyHealingEffectApplier** - Body-specific healing

### ✅ Skill Trees (All 14 Complete)
Each paradigm has a fully populated skill tree with unlock conditions:
- `AcademicSkillTree.ts` - Schools, metamagic, spell preparation
- `PactSkillTree.ts` - Patron types, negotiation, breach handling
- `NameSkillTree.ts` - True name categories, speaking power
- `BreathSkillTree.ts` - Heightenings, Awakening types
- `DivineSkillTree.ts` - Domains, clerical ranks, miracles
- `BloodSkillTree.ts` - Bloodlines, sacrifice scales
- `EmotionalSkillTree.ts` - Emotion categories, storage methods
- `AllomancySkillTree.ts` - Metal types, Mistborn abilities
- `ShintoSkillTree.ts` - Kami types, purity states
- `SympathySkillTree.ts` - Links, binding principles
- `DaemonSkillTree.ts` - Forms, Dust interactions
- `DreamSkillTree.ts` - Realms, time dilation
- `SongSkillTree.ts` - Song types, harmony
- `RuneSkillTree.ts` - Carving materials, activation

---

## Overview

Each magic paradigm has unique costs that reflect its nature. This document specifies how costs are calculated, deducted, and recovered for each paradigm.

### Core Architecture
Each paradigm has a dedicated `CostCalculator` that computes costs based on paradigm-specific rules.

---

## Effect System (Implemented)

The spell effect system defines WHAT spells do. Effects are declarative, composable, and paradigm-aware.

### Location
`packages/core/src/magic/SpellEffect.ts`, `SpellEffectRegistry.ts`, `SpellEffectExecutor.ts`

### Effect Categories (17 types)
| Category | Description | Example |
|----------|-------------|---------|
| `damage` | Deals damage | Fireball |
| `healing` | Restores resources | Cure Wounds |
| `protection` | Shields, wards | Mage Armor |
| `buff` | Improves stats | Haste |
| `debuff` | Reduces stats | Slow |
| `control` | Stun, root, fear | Hold Person |
| `summon` | Creates entities | Summon Familiar |
| `transform` | Changes form | Polymorph |
| `perception` | Detection, scrying | Detect Magic |
| `dispel` | Removes effects | Dispel Magic |
| `teleport` | Spatial movement | Blink |
| `creation` | Creates objects | Fabricate |
| `destruction` | Destroys objects | Shatter |
| `environmental` | Terrain, weather | Wall of Fire |
| `temporal` | Time effects | Time Stop |
| `mental` | Mind effects | Charm |
| `soul` | Spirit effects | Soul Bind |
| `paradigm` | Paradigm-specific | Varies |

### Effect Scaling
```typescript
interface EffectScaling {
  base: number;
  perProficiency?: number;    // Multiplier per spell proficiency
  perTechnique?: number;      // Multiplier per technique mastery
  perForm?: number;           // Multiplier per form mastery
  perLevel?: number;          // Multiplier per caster level
  maximum?: number;           // Hard cap
  minimum?: number;           // Floor
  paradigmScaling?: Record<string, number>;  // Paradigm-specific modifiers
}
```

### Factory Functions
- `createDamageEffect(id, name, damageType, baseDamage, range, options)`
- `createHealingEffect(id, name, baseHealing, range, options)`
- `createProtectionEffect(id, name, absorptionAmount, duration, options)`
- `createBuffEffect(id, name, duration, statModifiers, options)`
- `createDebuffEffect(id, name, duration, options)`

---

## Cost System Architecture

### Core Interface

```typescript
/**
 * ParadigmCostCalculator - Calculates costs for a specific paradigm
 */
interface ParadigmCostCalculator {
  paradigmId: string;

  /**
   * Calculate all costs for casting a spell.
   * @param spell The spell being cast
   * @param caster The caster's MagicComponent
   * @param context Additional context (environment, time, etc.)
   * @returns Array of costs to be deducted
   */
  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[];

  /**
   * Check if the caster can afford all costs.
   * @returns { canAfford: boolean, missing: SpellCost[], terminal: boolean }
   */
  canAfford(
    costs: SpellCost[],
    caster: MagicComponent
  ): AffordabilityResult;

  /**
   * Deduct costs from the caster.
   * @returns Result of deduction including any terminal effects
   */
  deductCosts(
    costs: SpellCost[],
    caster: MagicComponent
  ): DeductionResult;

  /**
   * Initialize resource pools when a caster joins this paradigm.
   */
  initializeResourcePools(caster: MagicComponent): void;
}

interface CastingContext {
  /** Current game tick */
  tick: number;
  /** Time of day (for cycle-based magic) */
  timeOfDay: number;
  /** Nearby ley lines or power sources */
  ambientPower: number;
  /** Is this a group casting? */
  isGroupCast: boolean;
  /** Number of casters if group */
  casterCount: number;
  /** Target entity (if any) */
  targetId?: string;
}

interface AffordabilityResult {
  canAfford: boolean;
  missing: SpellCost[];
  /** Would casting this kill/permanently harm the caster? */
  wouldBeTerminal: boolean;
  /** Warning message if near-terminal */
  warning?: string;
}

interface DeductionResult {
  success: boolean;
  /** Costs actually deducted */
  deducted: SpellCost[];
  /** Did this cause terminal effects? */
  terminal: boolean;
  /** Terminal effect description */
  terminalEffect?: TerminalEffect;
}

type TerminalEffect =
  | { type: 'death'; cause: string }
  | { type: 'corruption_threshold'; newForm: string }
  | { type: 'soul_lost'; fragmentsRemaining: number }
  | { type: 'favor_zero'; patronAction: string }
  | { type: 'sanity_zero'; madnessType: string }
  | { type: 'drab'; breathsRemaining: 0 };
```

### Cost Calculator Registry

```typescript
/**
 * Registry of all paradigm cost calculators.
 */
class CostCalculatorRegistry {
  private calculators: Map<string, ParadigmCostCalculator> = new Map();

  register(calculator: ParadigmCostCalculator): void;
  get(paradigmId: string): ParadigmCostCalculator;
  has(paradigmId: string): boolean;
}

// Singleton instance
export const costCalculatorRegistry = new CostCalculatorRegistry();
```

---

## Per-Paradigm Cost Specifications

### 1. Academic Paradigm

**Costs:** `mana`, `stamina`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| mana | `spell.manaCost` | Linear with spell level | No | Rest (0.01/tick) |
| stamina | `spell.castTime * 0.5` | Linear with cast time | No | Rest (0.02/tick) |

**Special Rules:**
- Ley line proximity reduces mana cost by up to 30%
- Focus items reduce stamina cost by proficiency bonus %
- Group casting splits mana evenly, stamina is individual

```typescript
class AcademicCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'academic';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];

    // Mana cost (reduced by ley line proximity)
    let manaCost = spell.manaCost;
    if (ctx.ambientPower > 0) {
      manaCost *= (1 - Math.min(0.3, ctx.ambientPower * 0.1));
    }
    costs.push({ type: 'mana', amount: Math.ceil(manaCost), source: 'spell_base' });

    // Stamina cost (based on cast time)
    const staminaCost = Math.ceil(spell.castTime * 0.5);
    costs.push({ type: 'stamina', amount: staminaCost, source: 'casting_effort' });

    return costs;
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.mana = { type: 'mana', current: 100, maximum: 100, regenRate: 0.01, locked: 0 };
    caster.resourcePools.stamina = { type: 'stamina', current: 100, maximum: 100, regenRate: 0.02, locked: 0 };
  }
}
```

---

### 2. Pact Paradigm

**Costs:** `favor`, `corruption`, `soul_fragment`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| favor | `spell.manaCost * 0.2` | Patron relationship | Yes (at 0) | Quests, service |
| corruption | `(power * 0.05)` if using dark techniques | Cumulative | Yes (at 100) | Never |
| soul_fragment | Only for major effects | Rare | Yes (at 0) | Never |

**Special Rules:**
- Favor starts at 100, decreases with use, increases with patron service
- Corruption accumulates only for `destroy` or `void` techniques
- Soul fragments (max 7) are only spent for permanent enchantments or major summons
- At 0 favor: patron may revoke powers or demand immediate service
- At 100 corruption: physical transformation into patron's creature type

```typescript
class PactCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'pact';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.pact;

    // Favor cost (primary resource)
    const favorCost = Math.ceil(spell.manaCost * 0.2);
    costs.push({ type: 'favor', amount: favorCost, source: 'patron_tithe' });

    // Corruption for dark techniques
    if (spell.technique === 'destroy' || spell.form === 'void') {
      const corruptionGain = Math.ceil(spell.manaCost * 0.05);
      costs.push({ type: 'corruption', amount: corruptionGain, source: 'dark_taint' });
    }

    // Soul fragments for major summons
    if (spell.technique === 'summon' && spell.manaCost > 50) {
      costs.push({ type: 'soul_fragment', amount: 1, source: 'major_summon' });
    }

    return costs;
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.favor = { type: 'favor', current: 100, maximum: 100, regenRate: 0, locked: 0 };
    caster.resourcePools.corruption = { type: 'corruption', current: 0, maximum: 100, regenRate: 0, locked: 0 };
    caster.resourcePools.soul_fragment = { type: 'soul_fragment', current: 7, maximum: 7, regenRate: 0, locked: 0 };
    caster.paradigmState.pact = { patronId: undefined, pactTerms: [], serviceOwed: 0 };
  }
}
```

---

### 3. Name Paradigm (True Names)

**Costs:** `time`, `sanity`, `attention`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| time | `nameComplexity * 10` ticks | Name difficulty | No | N/A (non-consumable) |
| sanity | `power * 0.1` | Power level | Yes (at 0) | Rest |
| attention | `1 per cast` cumulative | Constant | No (but triggers risks) | Time (decays 1/hour) |

**Special Rules:**
- No mana pool - costs are different per-cast
- Time cost is actual casting time, not deducted from pool
- Sanity represents mental strain of holding true names
- Attention accumulates and attracts "listeners" at thresholds (10, 25, 50)
- At 0 sanity: caster loses ability to hold names, may speak their own name

```typescript
class NameCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'names';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.names;
    const knownNames = state?.knownNames?.length ?? 0;

    // Time cost (increases cast time, not deducted from pool)
    // This is informational - the actual time is handled by cast mechanics
    const timeCost = Math.ceil(spell.castTime * (1 + knownNames * 0.1));
    costs.push({ type: 'time', amount: timeCost, source: 'name_complexity' });

    // Sanity cost (mental strain)
    const sanityCost = Math.ceil(spell.manaCost * 0.1);
    costs.push({ type: 'sanity', amount: sanityCost, source: 'holding_names' });

    // Attention (always 1 per cast, cumulative)
    costs.push({ type: 'attention', amount: 1, source: 'speaking_names' });

    return costs;
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.sanity = { type: 'sanity', current: 100, maximum: 100, regenRate: 0.005, locked: 0 };
    caster.resourcePools.attention = { type: 'attention', current: 0, maximum: 100, regenRate: -0.001, locked: 0 }; // Negative = decay
    caster.paradigmState.names = { knownNames: [] };
  }
}
```

---

### 4. Breath Paradigm (BioChromatic)

**Costs:** `health` (represents Breaths)

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| health (Breaths) | Varies by Awakening type | Per-effect | Yes (at 0 = Drab) | Receiving from others |

**Special Rules:**
- Each person starts with 1 Breath
- Simple commands: 0 Breaths (use existing Awakened object)
- Basic Awakening: 1 Breath
- Complex Awakening: 5-50 Breaths
- Permanent Awakening: 50+ Breaths (permanent consumption)
- Heightening tiers unlock at: 50, 200, 600, 1000, 2000, 10000, 50000 Breaths
- At 0 Breaths: become a Drab (grey, emotionally muted, immune to most magic)

```typescript
class BreathCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'breath';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.breath;

    // Breath cost based on spell type
    let breathCost = 0;

    if (spell.technique === 'control' && spell.effectId === 'command_awakened') {
      // Commanding existing Awakened objects: 0 Breaths
      breathCost = 0;
    } else if (spell.technique === 'enhance') {
      // Lifeless animation or body enhancement: variable
      breathCost = Math.ceil(spell.manaCost / 10);
    } else if (spell.technique === 'create' || spell.technique === 'transform') {
      // Awakening or transformation
      if (spell.duration === undefined) {
        // Permanent: high cost
        breathCost = Math.max(50, spell.manaCost);
      } else {
        // Temporary: lower cost
        breathCost = Math.ceil(spell.manaCost / 5);
      }
    }

    if (breathCost > 0) {
      costs.push({ type: 'health', amount: breathCost, source: 'breath_investment' });
    }

    return costs;
  }

  canAfford(costs: SpellCost[], caster: MagicComponent): AffordabilityResult {
    const breathPool = caster.resourcePools.health;
    const breathCost = costs.find(c => c.type === 'health')?.amount ?? 0;
    const currentBreaths = breathPool?.current ?? 1;

    const wouldBeTerminal = currentBreaths - breathCost <= 0;

    return {
      canAfford: currentBreaths >= breathCost,
      missing: currentBreaths < breathCost ? [{ type: 'health', amount: breathCost - currentBreaths, source: 'insufficient_breaths' }] : [],
      wouldBeTerminal,
      warning: wouldBeTerminal ? 'This will drain all your Breaths and make you a Drab!' : undefined,
    };
  }

  initializeResourcePools(caster: MagicComponent): void {
    // Everyone starts with 1 Breath
    caster.resourcePools.health = { type: 'health', current: 1, maximum: 50000, regenRate: 0, locked: 0 };
    caster.paradigmState.breath = { breathCount: 1, heighteningTier: 0 };
  }
}
```

---

### 5. Divine Paradigm

**Costs:** `favor`, `karma`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| favor | `spell.manaCost * 0.3` | Deity relationship | Yes (at 0 = forsaken) | Prayer, ritual, service |
| karma | `violation_weight` | Only for alignment violations | No | Sacrifice, atonement |

**Special Rules:**
- Favor represents standing with deity (starts at 50, max 100)
- Prayer regenerates favor (0.02/tick while praying)
- Casting aligned spells may GAIN favor
- Casting against deity's nature costs extra karma
- At 0 favor: deity may forsake, cutting off all magic
- Karma only matters when casting spells against alignment

```typescript
class DivineCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'divine';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.divine;

    // Favor cost (primary resource)
    let favorCost = Math.ceil(spell.manaCost * 0.3);

    // Aligned spells cost less or even gain favor
    if (this.isAlignedSpell(spell, state)) {
      favorCost = Math.max(0, favorCost - 10);
    }

    costs.push({ type: 'favor', amount: favorCost, source: 'divine_channel' });

    // Karma cost for misaligned actions
    if (this.isAgainstNature(spell, state)) {
      costs.push({ type: 'karma', amount: 20, source: 'against_deity_nature' });
    }

    return costs;
  }

  private isAlignedSpell(spell: ComposedSpell, state?: ParadigmSpecificState): boolean {
    // Example: healing deity favors create+body
    // This would be configured per-deity
    return spell.technique === 'create' && spell.form === 'body';
  }

  private isAgainstNature(spell: ComposedSpell, state?: ParadigmSpecificState): boolean {
    // Example: life deity hates destroy+body
    return spell.technique === 'destroy';
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.favor = { type: 'favor', current: 50, maximum: 100, regenRate: 0, locked: 0 };
    caster.resourcePools.karma = { type: 'karma', current: 0, maximum: 100, regenRate: 0, locked: 0 };
    caster.paradigmState.divine = { deityId: undefined, deityStanding: 'neutral' };
  }
}
```

---

### 6. Blood Paradigm

**Costs:** `blood`, `health`, `corruption`, `lifespan`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| blood | `spell.manaCost * 0.2` | Power level | Yes (death) | Rest (slow), transfusion |
| health | `spell.manaCost * 0.1` | Power level | Yes (death) | Rest |
| corruption | `power * 0.1` | Always accumulates | Yes (transformation) | Never |
| lifespan | Major rituals only | Rare | Yes (accelerated aging) | Never |

**Special Rules:**
- Blood is the primary cost (physical blood drawn)
- Health damage is secondary (from blood loss strain)
- Can use OTHER creatures' blood (reduces personal cost)
- Sacrificial magic multiplies power but increases all costs
- At 100 corruption: physical transformation begins
- Lifespan only costs for major rituals (resurrection, permanent enchantments)

```typescript
class BloodCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'blood';

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.blood;

    // Blood cost (primary)
    const bloodCost = Math.ceil(spell.manaCost * 0.2);
    costs.push({ type: 'blood', amount: bloodCost, source: 'blood_sacrifice' });

    // Health cost (secondary, from strain)
    const healthCost = Math.ceil(spell.manaCost * 0.1);
    costs.push({ type: 'health', amount: healthCost, source: 'blood_loss_strain' });

    // Corruption (always accumulates)
    const corruptionGain = Math.ceil(spell.manaCost * 0.1);
    costs.push({ type: 'corruption', amount: corruptionGain, source: 'crimson_taint' });

    // Lifespan only for major rituals
    if (spell.technique === 'create' && spell.form === 'spirit') {
      // Resurrection or soul magic
      costs.push({ type: 'lifespan', amount: 5, source: 'soul_commerce' }); // 5 years
    }

    return costs;
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.blood = { type: 'blood', current: 100, maximum: 100, regenRate: 0.005, locked: 0 };
    caster.resourcePools.health = { type: 'health', current: 100, maximum: 100, regenRate: 0.01, locked: 0 };
    caster.resourcePools.corruption = { type: 'corruption', current: 0, maximum: 100, regenRate: 0, locked: 0 };
    caster.resourcePools.lifespan = { type: 'lifespan', current: 80, maximum: 80, regenRate: 0, locked: 0 }; // Years remaining
    caster.paradigmState.blood = { bloodDebt: 0 };
  }
}
```

---

### 7. Emotional Paradigm

**Costs:** `emotion`, `sanity`

| Cost | Base Formula | Scaling | Terminal | Recovery |
|------|--------------|---------|----------|----------|
| emotion | `spell.manaCost * emotionIntensity` | Emotion type | Yes (emotional burnout) | Time, experiences |
| sanity | `spell.manaCost * 0.05` | Cumulative | Yes (madness) | Rest |

**Special Rules:**
- Different emotions have different costs:
  - Rage: 1.5x power, 1.5x emotion cost
  - Love: 1.2x power to healing, 0.8x emotion cost
  - Fear: 2x to protection, 1.0x emotion cost
  - Grief: 1.3x to ice/water, 1.2x emotion cost
  - Joy: 1.0x general, 0.5x emotion cost
- Must genuinely FEEL the emotion (tracked in paradigmState)
- At 0 emotion: emotional burnout, cannot cast
- At 0 sanity: dominated by most-used emotion

```typescript
class EmotionalCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'emotional';

  private emotionMultipliers: Record<string, { power: number; cost: number }> = {
    rage: { power: 1.5, cost: 1.5 },
    love: { power: 1.2, cost: 0.8 },
    fear: { power: 2.0, cost: 1.0 },
    grief: { power: 1.3, cost: 1.2 },
    joy: { power: 1.0, cost: 0.5 },
  };

  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState.emotional;
    const emotion = state?.dominantEmotion ?? 'joy';
    const multiplier = this.emotionMultipliers[emotion] ?? { power: 1.0, cost: 1.0 };

    // Emotion cost (primary, varies by emotion)
    const emotionCost = Math.ceil(spell.manaCost * multiplier.cost);
    costs.push({ type: 'emotion', amount: emotionCost, source: `${emotion}_channel` });

    // Sanity cost (cumulative strain)
    const sanityCost = Math.ceil(spell.manaCost * 0.05);
    costs.push({ type: 'sanity', amount: sanityCost, source: 'emotional_strain' });

    return costs;
  }

  initializeResourcePools(caster: MagicComponent): void {
    caster.resourcePools.emotion = { type: 'emotion', current: 100, maximum: 100, regenRate: 0.01, locked: 0 };
    caster.resourcePools.sanity = { type: 'sanity', current: 100, maximum: 100, regenRate: 0.005, locked: 0 };
    caster.paradigmState.emotional = { dominantEmotion: 'joy', emotionalStability: 100 };
  }
}
```

---

## Cost Deduction System

### DeductionManager

```typescript
class CostDeductionManager {
  /**
   * Deduct costs from caster's resource pools.
   * Returns result including any terminal effects.
   */
  deductCosts(
    costs: SpellCost[],
    caster: MagicComponent,
    paradigm: MagicParadigm
  ): DeductionResult {
    const deducted: SpellCost[] = [];

    for (const cost of costs) {
      const pool = caster.resourcePools[cost.type];
      if (!pool) {
        throw new Error(`No resource pool for cost type: ${cost.type}`);
      }

      // Special handling for cumulative costs (corruption, attention)
      const costDef = paradigm.costs.find(c => c.type === cost.type);
      if (costDef?.cumulative) {
        // Add to pool instead of subtract
        pool.current = Math.min(pool.maximum, pool.current + cost.amount);
      } else {
        // Normal subtraction
        pool.current = Math.max(0, pool.current - cost.amount);
      }

      deducted.push(cost);

      // Check for terminal effects
      const terminalEffect = this.checkTerminal(cost.type, pool, costDef, caster);
      if (terminalEffect) {
        return { success: true, deducted, terminal: true, terminalEffect };
      }
    }

    return { success: true, deducted, terminal: false };
  }

  private checkTerminal(
    costType: MagicCostType,
    pool: ResourcePool,
    costDef: MagicCost | undefined,
    caster: MagicComponent
  ): TerminalEffect | undefined {
    if (!costDef?.canBeTerminal) return undefined;

    // For cumulative costs, terminal at maximum
    if (costDef.cumulative && pool.current >= pool.maximum) {
      return this.getTerminalEffect(costType, 'max', caster);
    }

    // For regular costs, terminal at zero
    if (!costDef.cumulative && pool.current <= 0) {
      return this.getTerminalEffect(costType, 'zero', caster);
    }

    return undefined;
  }

  private getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    switch (costType) {
      case 'health':
      case 'blood':
        return { type: 'death', cause: `Died from ${costType} loss` };
      case 'corruption':
        return { type: 'corruption_threshold', newForm: 'twisted_creature' };
      case 'soul_fragment':
        return { type: 'soul_lost', fragmentsRemaining: 0 };
      case 'favor':
        return { type: 'favor_zero', patronAction: 'powers_revoked' };
      case 'sanity':
        return { type: 'sanity_zero', madnessType: 'emotional_dominance' };
      default:
        return { type: 'death', cause: `Terminal ${costType} effect` };
    }
  }
}
```

---

## Cost Recovery System

### RecoveryManager

```typescript
type RecoveryMethod = 'rest' | 'ritual' | 'time' | 'sacrifice' | 'quest' | 'prayer';

class CostRecoveryManager {
  /**
   * Apply passive regeneration to all resource pools.
   * Called each tick.
   */
  applyPassiveRegeneration(caster: MagicComponent, deltaTime: number): void {
    for (const [costType, pool] of Object.entries(caster.resourcePools)) {
      if (pool && pool.regenRate !== 0) {
        const regen = pool.regenRate * deltaTime;
        if (regen > 0) {
          // Positive regen: recover
          pool.current = Math.min(pool.maximum, pool.current + regen);
        } else {
          // Negative regen: decay (e.g., attention)
          pool.current = Math.max(0, pool.current + regen);
        }
      }
    }
  }

  /**
   * Apply rest recovery (sleeping, meditating).
   * Multiplies regen rates while resting.
   */
  applyRestRecovery(caster: MagicComponent, restDuration: number): void {
    const restMultiplier = 5; // 5x recovery while resting

    for (const [costType, pool] of Object.entries(caster.resourcePools)) {
      if (pool && pool.regenRate > 0) {
        const costDef = this.getCostDefinition(caster, costType as MagicCostType);
        if (costDef?.recoveryMethod === 'rest') {
          const recovery = pool.regenRate * restDuration * restMultiplier;
          pool.current = Math.min(pool.maximum, pool.current + recovery);
        }
      }
    }
  }

  /**
   * Apply ritual recovery (specific actions).
   */
  applyRitualRecovery(
    caster: MagicComponent,
    ritualType: string,
    costType: MagicCostType,
    amount: number
  ): void {
    const pool = caster.resourcePools[costType];
    if (pool) {
      pool.current = Math.min(pool.maximum, pool.current + amount);
    }
  }

  /**
   * Apply quest completion recovery (for favor, etc.).
   */
  applyQuestRecovery(caster: MagicComponent, questId: string, rewards: SpellCost[]): void {
    for (const reward of rewards) {
      const pool = caster.resourcePools[reward.type];
      if (pool) {
        pool.current = Math.min(pool.maximum, pool.current + reward.amount);
      }
    }
  }
}
```

---

## Integration Points

### 1. MagicLawEnforcer Integration

Replace the placeholder in `validateSpell`:

```typescript
// In MagicLawEnforcer.validateSpell()
// REPLACE lines 178-197 with:

const calculator = costCalculatorRegistry.get(this.paradigm.id);
const costs = calculator.calculateCosts(spell, caster, ctx);
const affordability = calculator.canAfford(costs, caster);

if (!affordability.canAfford) {
  for (const missing of affordability.missing) {
    errors.push(`Insufficient ${missing.type}: need ${missing.amount} more`);
  }
}

if (affordability.wouldBeTerminal) {
  warnings.push(affordability.warning ?? 'This cast would have terminal effects');
}
```

### 2. SpellCasting System Integration

```typescript
// When actually casting a spell:
function executeSpellCast(
  spell: ComposedSpell,
  caster: MagicComponent,
  validation: SpellValidationResult
): CastResult {
  // Deduct costs
  const calculator = costCalculatorRegistry.get(caster.activeParadigmId!);
  const deductionManager = new CostDeductionManager();
  const result = deductionManager.deductCosts(validation.costs, caster, paradigm);

  if (result.terminal) {
    // Handle terminal effect (death, transformation, etc.)
    return { success: false, terminalEffect: result.terminalEffect };
  }

  // Continue with effect application...
}
```

### 3. Game Loop Integration

```typescript
// In the main game loop or MagicSystem.update():
function updateMagicResources(world: World, deltaTime: number): void {
  const recoveryManager = new CostRecoveryManager();

  for (const entity of world.query(['magic'])) {
    const magic = entity.getComponent('magic') as MagicComponent;
    recoveryManager.applyPassiveRegeneration(magic, deltaTime);
  }
}
```

---

## File Structure

```
packages/core/src/magic/
├── costs/
│   ├── index.ts                    # Exports all
│   ├── CostCalculator.ts           # Base interface
│   ├── CostCalculatorRegistry.ts   # Registry singleton
│   ├── CostDeductionManager.ts     # Deduction logic
│   ├── CostRecoveryManager.ts      # Recovery logic
│   └── calculators/
│       ├── AcademicCostCalculator.ts
│       ├── PactCostCalculator.ts
│       ├── NameCostCalculator.ts
│       ├── BreathCostCalculator.ts
│       ├── DivineCostCalculator.ts
│       ├── BloodCostCalculator.ts
│       └── EmotionalCostCalculator.ts
```

---

## Test Cases

### Unit Tests
1. Each calculator correctly computes costs for sample spells
2. Affordability check correctly identifies insufficient resources
3. Terminal effect detection works at boundaries
4. Cumulative costs (corruption) add instead of subtract
5. Recovery rates apply correctly

### Integration Tests
1. Full spell cast flow from validation through deduction
2. Terminal effects trigger appropriate game events
3. Rest recovery restores resources over time
4. Cross-paradigm casting applies both paradigm costs

### Edge Cases
1. Zero-cost spells
2. Casting at exactly terminal threshold
3. Negative regen rates (attention decay)
4. Group casting cost splitting
5. Overflow protection on cumulative costs

---

---

## Divine Casting (Gods Using Mortal Magic)

Gods can use ANY mortal magic paradigm, but pay with **belief** instead of normal costs.

### Design Principles

1. **Universal Access**: Gods can cast any spell from any paradigm
2. **Belief Cost**: All costs convert to a tiny belief expenditure
3. **Net Positive**: Witnessed divine magic usually GAINS more belief than spent
4. **Trivial Effort**: Mortal magic is trivially easy for gods

### God Casting Calculator

```typescript
/**
 * Gods pay belief for mortal magic. The cost is trivial, and
 * witnessing divine magic typically generates more belief than spent.
 */
class DivineCastingCalculator implements ParadigmCostCalculator {
  paradigmId = 'divine_casting'; // Special paradigm for god-cast mortal spells

  /**
   * Convert any mortal spell's costs to a tiny belief cost.
   * Base formula: total_mortal_cost * 0.001 = belief_cost
   */
  calculateCosts(spell: ComposedSpell, caster: MagicComponent, ctx: CastingContext): SpellCost[] {
    // Sum up what a mortal would pay
    const mortalCosts = this.calculateMortalCosts(spell, ctx);
    const totalMortalCost = mortalCosts.reduce((sum, c) => sum + c.amount, 0);

    // Gods pay a tiny fraction in belief
    const beliefCost = Math.max(1, Math.ceil(totalMortalCost * 0.001));

    return [{
      type: 'belief' as MagicCostType,
      amount: beliefCost,
      source: 'divine_channeling',
    }];
  }

  /**
   * Calculate belief gained from witnesses seeing the miracle.
   * Usually exceeds the cost, making divine magic net-positive.
   */
  calculateBeliefGain(
    spell: ComposedSpell,
    witnessCount: number,
    witnessDevotionLevels: number[]
  ): number {
    const basePower = spell.manaCost;
    const spectacleMultiplier = this.getSpectacleMultiplier(spell);

    // Each witness generates belief based on their devotion and spell impressiveness
    let totalGain = 0;
    for (const devotion of witnessDevotionLevels) {
      // Base gain: 1-5 per witness
      // Multiplied by devotion (0-1) and spectacle
      const witnessGain = Math.ceil((1 + basePower * 0.1) * devotion * spectacleMultiplier);
      totalGain += witnessGain;
    }

    return totalGain;
  }

  private getSpectacleMultiplier(spell: ComposedSpell): number {
    // More dramatic effects generate more belief
    const techniqueMultipliers: Record<string, number> = {
      create: 1.5,   // Creation is impressive
      destroy: 1.2,  // Destruction is dramatic
      transform: 1.3,
      protect: 0.8,  // Subtle, less impressive
      enhance: 0.9,
      summon: 2.0,   // Summoning is very impressive
      perceive: 0.5, // Not visually impressive
      control: 1.0,
    };

    const formMultipliers: Record<string, number> = {
      fire: 1.5,
      water: 1.2,
      earth: 1.0,
      air: 1.1,
      body: 1.3,   // Healing is impressive
      mind: 0.5,   // Invisible
      spirit: 1.8, // Very impressive
      plant: 0.9,
      animal: 1.2,
      image: 1.4,  // Illusions are impressive
      void: 2.0,   // Terrifying and impressive
      time: 2.5,   // Extremely impressive
      space: 2.5,
      metal: 1.1,
    };

    return (techniqueMultipliers[spell.technique] ?? 1.0) *
           (formMultipliers[spell.form] ?? 1.0);
  }

  private calculateMortalCosts(spell: ComposedSpell, ctx: CastingContext): SpellCost[] {
    // Estimate what a mortal would pay (rough calculation)
    return [{ type: 'mana', amount: spell.manaCost, source: 'mortal_equivalent' }];
  }

  initializeResourcePools(caster: MagicComponent): void {
    // Gods don't use standard pools - their belief is tracked elsewhere
    // This is a stub for the interface
  }

  canAfford(costs: SpellCost[], caster: MagicComponent): AffordabilityResult {
    // Gods can always afford trivial costs (belief checked at deity level)
    return { canAfford: true, missing: [], wouldBeTerminal: false };
  }

  deductCosts(costs: SpellCost[], caster: MagicComponent): DeductionResult {
    // Actual belief deduction happens at deity system level
    return { success: true, deducted: costs, terminal: false };
  }
}
```

### Integration with Deity System

```typescript
interface DeityMagicCast {
  deityId: string;
  spell: ComposedSpell;
  targetLocation: { x: number; y: number };
  witnesses: string[]; // Entity IDs who saw the miracle
}

/**
 * Process a god casting mortal magic.
 * Deducts belief cost, then adds belief gained from witnesses.
 */
function processDeityMagicCast(
  cast: DeityMagicCast,
  deityComponent: DeityComponent,
  world: World
): { beliefSpent: number; beliefGained: number; netBelief: number } {
  const calculator = new DivineCastingCalculator();

  // Calculate tiny belief cost
  const costs = calculator.calculateCosts(cast.spell, null as any, {} as any);
  const beliefSpent = costs.find(c => c.type === 'belief')?.amount ?? 1;

  // Gather witness data
  const witnessDevotions: number[] = [];
  for (const witnessId of cast.witnesses) {
    const entity = world.getEntity(witnessId);
    const belief = entity?.getComponent('belief') as BeliefComponent | undefined;
    const devotion = belief?.deities?.[cast.deityId]?.devotion ?? 0.1;
    witnessDevotions.push(devotion);
  }

  // Calculate belief gained from witnessing the miracle
  const beliefGained = calculator.calculateBeliefGain(
    cast.spell,
    cast.witnesses.length,
    witnessDevotions
  );

  // Apply to deity
  deityComponent.belief -= beliefSpent;
  deityComponent.belief += beliefGained;

  return {
    beliefSpent,
    beliefGained,
    netBelief: beliefGained - beliefSpent,
  };
}
```

### Divine Magic Events

When a god casts mortal magic, emit events for:
1. The miracle itself (effect application)
2. Witness belief changes (increase devotion for witnesses)
3. Narrative generation (chronicle entry about divine intervention)

```typescript
interface DivineMiracleEvent {
  type: 'divine_miracle';
  deityId: string;
  spellId: string;
  location: { x: number; y: number };
  witnessIds: string[];
  beliefNet: number;
  description: string;
}
```

---

## Implementation Order

1. **Core Framework** - Interfaces, registry, base classes
2. **Academic Calculator** - Simplest (mana + stamina)
3. **Integration** - Replace placeholder in MagicLawEnforcer
4. **Deduction Manager** - Cost application logic
5. **Recovery Manager** - Regeneration logic
6. **Remaining Calculators** - One by one, with tests
7. **Divine Casting Calculator** - God-to-mortal magic conversion
8. **Terminal Effects** - Death, transformation handlers
9. **Game Loop Integration** - Passive regen in update cycle
