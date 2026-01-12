# Magic Costs System

Paradigm-specific spell cost calculation, deduction, and resource recovery.

## Overview

Each magic paradigm has unique resource costs that reflect its nature. The costs system handles:
- **Calculation**: Determine spell costs based on paradigm, context, and caster state
- **Affordability**: Check if caster has sufficient resources
- **Deduction**: Apply costs and track terminal effects (death, corruption, etc.)
- **Recovery**: Regenerate resources via rest, prayer, rituals, or sacrifice

## Cost Types

Costs fall into three categories:

**Standard** (subtract from pool):
- `mana` - Academic/Wizard magic energy
- `stamina` - Physical exertion from casting
- `health` - Life force or vitality
- `blood` - Literal blood drawn (Blood magic)
- `favor` - Divine standing with deity
- `soul_fragment` - Pieces of soul (Name magic)
- `breath` - Life essence (Breath magic)
- `sanity` - Mental stability

**Cumulative** (add to pool, terminal at max):
- `corruption` - Taint from dark magic (Blood, Pact)
- `attention` - Eldritch notice (Pact magic)
- `karma` - Cosmic debt

**Permanent**:
- `lifespan` - Years of life (Blood rituals, never recovers)

## Architecture

### Components

**`BaseCostCalculator`**: Abstract base class providing default affordability checks, deduction logic, and terminal effect handling. Paradigm calculators extend this.

**`ParadigmCostCalculator`**: Interface defining `calculateCosts()`, `canAfford()`, `deductCosts()`, and `initializeResourcePools()`.

**`CostCalculatorRegistry`**: Singleton registry mapping paradigm IDs to calculators. Use `costCalculatorRegistry.get('academic')` to retrieve.

**`CostRecoveryManager`**: Handles resource regeneration via passive ticks, rest, prayer, rituals, quests, or sacrifice.

### Paradigm Calculators

Located in `/calculators/`:
- `AcademicCostCalculator` - Mana + stamina, ley line bonuses
- `BloodCostCalculator` - Blood + health + corruption, applies injuries to BodyComponent
- `DivineCostCalculator` - Favor + karma, deity alignment checks
- `PactCostCalculator` - Favor + attention + corruption, patron demands
- `NameCostCalculator` - Soul fragments, true name power
- `BreathCostCalculator` - Breath (life essence), Drab at zero
- `EmotionalCostCalculator` - Emotions as fuel, burnout risk
- Plus 8 more (Shinto, Dream, Song, Rune, Sympathy, Allomancy, Daemon)

Each calculator implements paradigm-specific logic for cost scaling, context modifiers (time of day, moon phase), and terminal effects.

## Usage

```typescript
import { costCalculatorRegistry, costRecoveryManager } from '@ai-village/magic/costs';

// Calculate costs
const calculator = costCalculatorRegistry.get('academic');
const costs = calculator.calculateCosts(spell, caster, context);

// Check affordability
const { canAfford, missing, wouldBeTerminal } = calculator.canAfford(costs, caster);

// Deduct costs
const result = calculator.deductCosts(costs, caster, paradigm);
if (result.terminal) {
  // Handle terminal effect (death, corruption, etc.)
}

// Apply passive regen each tick
costRecoveryManager.applyPassiveRegeneration(caster, deltaTime);

// Rest recovery
costRecoveryManager.applyRestRecovery(caster, restDuration, paradigm, 5); // 5x multiplier
```

## Terminal Effects

When costs reach zero (standard) or max (cumulative), terminal effects trigger:
- **Death**: Health, blood, or lifespan depleted
- **Corruption**: Transform into twisted creature at 100 corruption
- **Soul Lost**: Final soul fragment spent
- **Forsaken**: Deity revokes powers (favor = 0)
- **Madness**: Sanity = 0
- **Drab**: Breath depleted, loses color/emotion
- **Burnout**: Emotional reserves exhausted

## Recovery Methods

Defined per cost type in `MagicParadigm.costs`:
- `rest` - Sleep/meditation (mana, stamina, health)
- `time` - Passive decay (attention, some debuffs)
- `ritual` - Specific ceremonies (corruption cleansing)
- `sacrifice` - Offering blood/gold/time
- `quest` - Task completion rewards
- `prayer` - Devotion to deity (favor)

**Never recover**: Corruption, lifespan, karma (permanent consequences).

## Context

`CastingContext` provides environmental modifiers:
- `timeOfDay` (0-1) - Lunar/solar magic scaling
- `moonPhase` (0-1) - Full moon bonuses
- `ambientPower` - Ley line proximity
- `weather`, `season` - Elemental affinities
- `isGroupCast`, `casterCount` - Cost splitting
- `bodyComponent`, `spiritualComponent` - For injury/faith mechanics
