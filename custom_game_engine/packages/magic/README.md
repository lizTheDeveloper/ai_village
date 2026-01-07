# Magic Package - Multiverse Magic System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the magic system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Magic Package** (`@ai-village/magic`) implements a comprehensive multi-paradigm magic system where magical traditions vary fundamentally across universes. The system supports 25+ unique magic paradigms (Academic, Divine, Blood, Allomancy, Rune Magic, Shinto, etc.), each with distinct rules, costs, channels, and risks.

**What it does:**
- Defines universe-specific magic paradigms with unique laws and costs
- Spell casting pipeline with cost calculation, mishap handling, and effect execution
- Paradigm-specific skill trees with discovery-based progression
- Cross-universe magic interaction (foreign magic policies)
- Dynamic spell generation via LLM integration
- Enchantment and artifact creation systems
- Magic detection and surveillance (Creator attention mechanics)

**Key files:**
- `src/MagicParadigm.ts` - Core paradigm framework (sources, costs, channels, laws, risks)
- `src/SpellCastingService.ts` - High-level spell casting API
- `src/SpellRegistry.ts` - Spell definition registry with proficiency tracking
- `src/MagicSkillTree.ts` - Paradigm-specific skill progression
- `src/costs/CostCalculatorRegistry.ts` - Paradigm cost calculator registry
- `src/InitializeMagicSystem.ts` - System initialization entry point

---

## Package Structure

```
packages/magic/
├── src/
│   ├── MagicParadigm.ts              # Paradigm framework (sources, costs, laws)
│   ├── SpellRegistry.ts              # Spell definitions and player state
│   ├── SpellCastingService.ts        # Main spell casting API
│   ├── SpellEffect.ts                # Effect type definitions
│   ├── SpellEffectExecutor.ts        # Effect execution engine
│   ├── SpellEffectRegistry.ts        # Effect definition registry
│   ├── MagicSkillTree.ts             # Skill tree framework
│   ├── MagicSkillTreeRegistry.ts     # Skill tree registry
│   ├── MagicSkillTreeEvaluator.ts    # Unlock condition evaluator
│   ├── InitializeMagicSystem.ts      # System bootstrap
│   │
│   ├── costs/
│   │   ├── CostCalculator.ts         # Base cost calculator interface
│   │   ├── CostCalculatorRegistry.ts # Calculator registry
│   │   ├── CostRecoveryManager.ts    # Cost recovery logic
│   │   └── calculators/              # Paradigm-specific calculators
│   │       ├── AcademicCostCalculator.ts
│   │       ├── DivineCostCalculator.ts
│   │       ├── BloodCostCalculator.ts
│   │       ├── AllomancyCostCalculator.ts
│   │       ├── RuneCostCalculator.ts
│   │       ├── ShintoCostCalculator.ts
│   │       ├── DaemonCostCalculator.ts
│   │       ├── DreamCostCalculator.ts
│   │       ├── SympathyCostCalculator.ts
│   │       ├── SongCostCalculator.ts
│   │       └── registerAll.ts        # Register all calculators
│   │
│   ├── skillTrees/                   # Paradigm-specific skill trees
│   │   ├── AcademicSkillTree.ts
│   │   ├── DivineSkillTree.ts
│   │   ├── AllomancySkillTree.ts
│   │   ├── RuneSkillTree.ts
│   │   ├── ShintoSkillTree.ts
│   │   ├── DaemonSkillTree.ts
│   │   └── ... (20+ more paradigms)
│   │
│   ├── appliers/                     # Effect applier implementations
│   │   ├── HealingEffectApplier.ts
│   │   ├── ProtectionEffectApplier.ts
│   │   ├── TransformEffectApplier.ts
│   │   └── ControlEffectApplier.ts
│   │
│   ├── CoreParadigms.ts              # Core paradigm definitions
│   ├── AnimistParadigms.ts           # Animist paradigm definitions
│   ├── CreativeParadigms.ts          # Creative paradigm definitions
│   ├── DimensionalParadigms.ts       # Dimensional paradigm definitions
│   ├── WhimsicalParadigms.ts         # Whimsical paradigm definitions
│   ├── NullParadigms.ts              # Null/anti-magic paradigms
│   │
│   ├── ExpandedSpells.ts             # Extended spell catalog
│   ├── MaterialCreationSpells.ts     # Material creation spells
│   ├── TileConstructionSpells.ts     # Construction spells
│   ├── SummonableEntities.ts         # Summoning system
│   ├── ArtifactCreation.ts           # Enchantment/artifact system
│   ├── MagicAcademy.ts               # Learning/teaching system
│   ├── MagicDetectionSystem.ts       # Detection/surveillance system
│   ├── MagicLawEnforcer.ts           # Law violation enforcement
│   ├── LLMEffectGenerator.ts         # AI spell generation
│   │
│   └── index.ts                      # Package exports
│
├── package.json
└── README.md                         # This file
```

---

## Core Concepts

### 1. Magic Paradigms

A **MagicParadigm** defines how magic works in a universe. The same spell can function completely differently depending on the paradigm's rules.

```typescript
interface MagicParadigm {
  id: string;                        // 'academic', 'divine', 'blood', etc.
  name: string;
  description: string;
  universeIds: string[];             // Which universes use this paradigm

  // Power sources
  sources: MagicSource[];            // Where power comes from (mana, faith, blood)

  // What it costs
  costs: MagicCost[];                // Resources consumed (mana, health, sanity)

  // How to channel it
  channels: MagicChannel[];          // Verbal, somatic, material, etc.

  // Fundamental laws
  laws: MagicLaw[];                  // Conservation, equivalent exchange, etc.

  // Dangers
  risks: MagicRisk[];                // Mishaps, backlash, corruption

  // How to learn
  acquisitionMethods: AcquisitionDefinition[];

  // What it can do
  availableTechniques: MagicTechnique[];  // create, destroy, transform, etc.
  availableForms: MagicForm[];            // fire, water, body, spirit, etc.

  // Cross-universe behavior
  foreignMagicPolicy: ForeignMagicPolicy;  // How foreign magic is treated
}
```

**Example paradigms:**

```typescript
// Academic Magic - Traditional D&D-style
const academicParadigm: MagicParadigm = {
  id: 'academic',
  sources: [{ type: 'internal', regeneration: 'rest' }],
  costs: [{ type: 'mana', recoverable: true }],
  channels: [{ type: 'verbal' }, { type: 'somatic' }],
  laws: [{ type: 'conservation', strictness: 'strong' }],
  risks: [{ trigger: 'failure', consequence: 'mishap' }],
  foreignMagicPolicy: 'compatible',
};

// Blood Magic - High cost, high power
const bloodParadigm: MagicParadigm = {
  id: 'blood',
  sources: [{ type: 'internal', regeneration: 'none' }],
  costs: [{ type: 'health', canBeTerminal: true }],
  channels: [{ type: 'blood' }],
  laws: [{ type: 'sacrifice', strictness: 'absolute' }],
  risks: [{ trigger: 'overuse', consequence: 'corruption_gain' }],
  foreignMagicPolicy: 'absorbs',
};

// Allomancy (Mistborn) - Metal-burning system
const allomancyParadigm: MagicParadigm = {
  id: 'allomancy',
  sources: [{ type: 'material', regeneration: 'consumption' }],
  costs: [
    { type: 'metal_iron' }, { type: 'metal_steel' },
    { type: 'metal_tin' }, { type: 'metal_pewter' }
  ],
  channels: [{ type: 'consumption' }, { type: 'will' }],
  laws: [{ type: 'material', strictness: 'absolute' }],
  risks: [{ trigger: 'flare', consequence: 'burnout' }],
  foreignMagicPolicy: 'incompatible',
};
```

### 2. Spell Casting Pipeline

Spell casting follows a strict pipeline:

```
1. Validation
   ↓ Check spell unlocked, caster has magic component
2. Target Validation
   ↓ Range check, target type check
3. Cost Calculation (Paradigm-specific)
   ↓ Use CostCalculator for paradigm
4. Affordability Check
   ↓ Does caster have enough resources?
5. Mishap Roll
   ↓ Based on proficiency and spell difficulty
6. Cost Deduction
   ↓ Deduct resources from caster
7. Effect Execution
   ↓ Apply spell effects to target
8. Proficiency Gain
   ↓ Record cast, increase proficiency
9. Result Notification
   ↓ Emit events, notify listeners
```

**Key classes:**

```typescript
// High-level casting API
class SpellCastingService {
  castSpell(spellId: string, caster: Entity, world: World, tick: number, options?: CastOptions): SpellCastResult;
  canCast(spellId: string, caster: Entity, options?: CastOptions): { canCast: boolean; error?: string };
}

// Spell definition registry
class SpellRegistry {
  register(spell: SpellDefinition): void;
  getSpell(spellId: string): SpellDefinition | undefined;
  getPlayerState(spellId: string): PlayerSpellState | undefined;
  recordCast(spellId: string, tick: number): void;  // Gains proficiency
  getMishapChance(spellId: string): number;         // Based on proficiency
}

// Effect execution
class SpellEffectExecutor {
  executeEffect(effectId: string, caster: Entity, target: Entity, spell: SpellDefinition, world: World, tick: number, powerMultiplier?: number): EffectApplicationResult;
}
```

### 3. Cost Calculation System

Each paradigm has a **custom cost calculator** that determines spell costs based on paradigm-specific rules.

```typescript
interface ParadigmCostCalculator {
  paradigmId: string;

  // Calculate costs for a spell
  calculateCosts(spell: ComposedSpell, magic: MagicComponent, ctx: CostContext): CalculatedCost[];

  // Check if caster can afford costs
  canAfford(costs: CalculatedCost[], magic: MagicComponent): AffordabilityResult;

  // Deduct costs from caster
  deductCosts(costs: CalculatedCost[], magic: MagicComponent, paradigm: MagicParadigm): DeductionResult;

  // Recover spent costs
  recoverCosts(magic: MagicComponent, paradigm: MagicParadigm, elapsed: number): void;
}
```

**Example cost calculators:**

```typescript
// Academic Magic - Simple mana cost
class AcademicCostCalculator implements ParadigmCostCalculator {
  calculateCosts(spell: ComposedSpell): CalculatedCost[] {
    return [{ type: 'mana', amount: spell.manaCost }];
  }
}

// Divine Magic - Faith-based cost reduction
class DivineCostCalculator implements ParadigmCostCalculator {
  calculateCosts(spell: ComposedSpell, magic: MagicComponent): CalculatedCost[] {
    const baseCost = spell.manaCost;
    const faithModifier = magic.paradigmState.divine?.deityStanding === 'favored' ? 0.8 : 1.0;
    return [{ type: 'mana', amount: baseCost * faithModifier }];
  }
}

// Blood Magic - Health cost with terminal risk
class BloodCostCalculator implements ParadigmCostCalculator {
  calculateCosts(spell: ComposedSpell): CalculatedCost[] {
    const healthCost = spell.manaCost * 0.1;  // 10% of mana cost as health
    return [
      { type: 'health', amount: healthCost, canBeTerminal: true },
      { type: 'corruption', amount: 1 }  // Corruption accumulates
    ];
  }
}
```

**Registering calculators:**

```typescript
import { costCalculatorRegistry } from '@ai-village/magic';
import { AcademicCostCalculator } from './costs/calculators/AcademicCostCalculator.js';

costCalculatorRegistry.register(new AcademicCostCalculator());
costCalculatorRegistry.register(new DivineCostCalculator());
costCalculatorRegistry.register(new BloodCostCalculator());

// Or register all at once
import { registerAllCostCalculators } from './costs/calculators/registerAll.js';
registerAllCostCalculators();
```

### 4. Magic Skill Trees

Each paradigm has a **unique skill tree** with discovery-based progression.

```typescript
interface MagicSkillTree {
  id: string;
  paradigmId: string;
  nodes: MagicSkillNode[];           // All skill nodes
  entryNodes: string[];              // Starting nodes
  xpSources: MagicXPSource[];        // How XP is earned
  rules: MagicTreeRules;             // Progression rules
}

interface MagicSkillNode {
  id: string;
  name: string;
  category: MagicSkillCategory;      // foundation, technique, form, discovery, etc.
  unlockConditions: UnlockCondition[]; // What's required to unlock
  xpCost: number;                    // XP to purchase
  maxLevel: number;                  // Can be leveled up
  effects: MagicSkillEffect[];       // What you gain
}

type UnlockConditionType =
  | 'bloodline'       // Must have specific lineage
  | 'snapping'        // Must have experienced awakening trauma
  | 'metal_consumed'  // Must have consumed the metal (Allomancy)
  | 'rune_discovered' // Must have discovered the rune
  | 'kami_met'        // Must have met a kami (Shinto)
  | 'skill_level'     // Must have mundane skill at level X
  | 'node_unlocked'   // Must have unlocked prerequisite node
  | 'purity_level'    // Must maintain purity (Shinto)
  // ... 30+ more condition types
```

**Example skill tree (Allomancy):**

```typescript
const allomancyTree: MagicSkillTree = {
  id: 'allomancy_tree',
  paradigmId: 'allomancy',
  nodes: [
    {
      id: 'mistborn_bloodline',
      category: 'foundation',
      unlockConditions: [
        { type: 'bloodline', params: { bloodlineId: 'mistborn' } },
        { type: 'snapping', params: { traumaType: 'awakening' } }
      ],
      xpCost: 0,  // Granted at birth
      effects: [
        { type: 'unlock_ability', baseValue: 1, target: { abilityId: 'allomancy' } }
      ]
    },
    {
      id: 'burn_iron',
      category: 'discovery',
      unlockConditions: [
        { type: 'metal_consumed', params: { metalId: 'iron' } }
      ],
      xpCost: 10,
      effects: [
        { type: 'unlock_metal', baseValue: 1, target: { metalId: 'iron' } }
      ]
    },
    {
      id: 'iron_mastery',
      category: 'mastery',
      unlockConditions: [
        { type: 'node_unlocked', params: { nodeId: 'burn_iron' } }
      ],
      xpCost: 50,
      maxLevel: 5,
      effects: [
        { type: 'reserve_efficiency', baseValue: 10, perLevelValue: 5 }  // Metal lasts 10-30% longer
      ]
    }
  ],
  xpSources: [
    { eventType: 'metal_burned', xpAmount: 1, description: 'Burn a metal' },
    { eventType: 'combat_won', xpAmount: 10, description: 'Win combat using Allomancy' }
  ],
  rules: {
    allowRespec: false,
    permanentProgress: true,
    requiresInnateAbility: true,
    innateCondition: { type: 'bloodline', params: { bloodlineId: 'allomancy' } }
  }
};
```

### 5. Spell Effects

Effects are the actual game-changing outcomes of spells.

```typescript
interface SpellEffect {
  id: string;
  name: string;
  category: 'damage' | 'healing' | 'buff' | 'debuff' | 'control' | 'utility' | 'perception' | 'transformation';
  targetType: 'self' | 'single' | 'area' | 'cone' | 'line';

  // Effect parameters
  damage?: number;
  damageType?: string;
  healing?: number;
  duration?: number;

  // Applier
  applier?: string;  // ID of effect applier to use
}

// Effect appliers implement the actual logic
interface EffectApplier {
  id: string;
  apply(effect: SpellEffect, caster: Entity, target: Entity, world: World, powerMultiplier: number): EffectApplicationResult;
}
```

**Example effects:**

```typescript
// Damage effect
const fireballEffect: SpellEffect = {
  id: 'fireball_effect',
  category: 'damage',
  targetType: 'area',
  damage: 50,
  damageType: 'fire',
  aoeRadius: 5,
  applier: 'damage_applier'
};

// Healing effect
const healEffect: SpellEffect = {
  id: 'heal_effect',
  category: 'healing',
  targetType: 'single',
  healing: 30,
  applier: 'healing_applier'
};

// Protection effect (buff)
const wardEffect: SpellEffect = {
  id: 'ward_effect',
  category: 'buff',
  targetType: 'self',
  duration: 6000,  // 5 minutes at 20 TPS
  damageReduction: 50,
  applier: 'protection_applier'
};
```

### 6. Cross-Universe Magic

Magic from one paradigm can behave differently in another universe.

```typescript
type ForeignMagicPolicy =
  | 'compatible'    // Works with other paradigms
  | 'incompatible'  // Does not mix
  | 'hostile'       // Actively opposes
  | 'absorbs'       // Incorporates foreign magic
  | 'transforms'    // Changes foreign magic to local type
  | 'isolated';     // No interaction

// Example: Academic mage travels to Blood magic universe
const interaction: ParadigmInteraction = {
  fromParadigm: 'academic',
  toParadigm: 'blood',
  functionality: 'partial',        // Spells partially work
  powerModifier: 0.5,              // 50% power
  additionalCosts: ['corruption'], // Gain corruption when casting
  transforms: true                 // Spells convert to blood magic type
};
```

---

## System APIs

### SpellCastingService

High-level API for casting spells.

**Dependencies:** `SpellRegistry`, `SpellEffectExecutor`, `CostCalculatorRegistry`

**Key methods:**

```typescript
class SpellCastingService {
  // Cast a spell
  castSpell(
    spellId: string,
    caster: Entity,
    world: World,
    tick: number,
    options?: CastOptions
  ): SpellCastResult;

  // Check if can cast (without casting)
  canCast(
    spellId: string,
    caster: Entity,
    options?: CastOptions
  ): { canCast: boolean; error?: string };

  // Dev casting (skip all checks)
  devCast(
    spellId: string,
    caster: Entity,
    target: Entity,
    world: World,
    tick: number
  ): SpellCastResult;

  // Listen to cast events
  addCastListener(listener: (result: SpellCastResult) => void): void;
}
```

**Usage:**

```typescript
import { getCastingService } from '@ai-village/magic';

const castingService = getCastingService();

// Cast a spell
const result = castingService.castSpell(
  'academic_fireball',
  casterEntity,
  world,
  world.tick,
  {
    target: targetEntity,
    powerMultiplier: 1.5  // 50% bonus from conditions
  }
);

if (result.success) {
  console.log(`Cast successful! Resources spent:`, result.resourcesSpent);
} else {
  console.error(`Cast failed: ${result.error}`);
}

// Check if can cast
const check = castingService.canCast('academic_fireball', casterEntity);
if (!check.canCast) {
  console.log(`Cannot cast: ${check.error}`);
}
```

### SpellRegistry

Central registry for spell definitions and player state.

**Key methods:**

```typescript
class SpellRegistry {
  // Registration
  register(spell: SpellDefinition): void;
  registerAll(spells: SpellDefinition[]): void;
  unregister(spellId: string): boolean;

  // Lookup
  getSpell(spellId: string): SpellDefinition | undefined;
  getAllSpells(): SpellDefinition[];
  getSpellsByParadigm(paradigmId: string): SpellDefinition[];
  getSpellsBySchool(school: string): SpellDefinition[];

  // Player state
  getPlayerState(spellId: string): PlayerSpellState | undefined;
  setUnlocked(spellId: string, unlocked: boolean): void;
  setProficiency(spellId: string, proficiency: number): void;
  recordCast(spellId: string, tick: number): void;  // Auto-gains proficiency
  getMishapChance(spellId: string): number;

  // Hotkeys
  assignHotkey(spellId: string, key: number): void;  // 1-9
  getSpellByHotkey(key: number): SpellDefinition | undefined;

  // Dev utilities
  unlockAllSpells(): void;
  maxAllProficiencies(): void;
}
```

**Usage:**

```typescript
import { getSpellRegistry } from '@ai-village/magic';

const registry = getSpellRegistry();

// Register a spell
registry.register({
  id: 'custom_heal',
  name: 'Custom Heal',
  paradigmId: 'divine',
  technique: 'enhance',
  form: 'body',
  source: 'divine',
  manaCost: 25,
  castTime: 40,
  range: 1,
  effectId: 'heal_effect',
  description: 'Heal a target.',
  school: 'restoration',
  baseMishapChance: 0.05,
  hotkeyable: true
});

// Unlock for player
registry.setUnlocked('custom_heal', true);

// Assign hotkey
registry.assignHotkey('custom_heal', 1);  // Press 1 to cast

// Check proficiency
const state = registry.getPlayerState('custom_heal');
console.log(`Proficiency: ${state?.proficiency ?? 0}`);
console.log(`Times cast: ${state?.timesCast ?? 0}`);
console.log(`Mishap chance: ${registry.getMishapChance('custom_heal')}`);
```

### CostCalculatorRegistry

Registry for paradigm-specific cost calculators.

**Key methods:**

```typescript
class CostCalculatorRegistry {
  register(calculator: ParadigmCostCalculator): void;
  get(paradigmId: string): ParadigmCostCalculator;
  has(paradigmId: string): boolean;
  getRegisteredParadigms(): string[];
}
```

**Usage:**

```typescript
import { costCalculatorRegistry } from '@ai-village/magic';

// Check if calculator exists
if (costCalculatorRegistry.has('academic')) {
  const calculator = costCalculatorRegistry.get('academic');
  // Use calculator...
}

// See all registered paradigms
const paradigms = costCalculatorRegistry.getRegisteredParadigms();
console.log('Available paradigms:', paradigms);
```

### MagicSkillTreeEvaluator

Evaluates unlock conditions and manages skill tree progression.

**Key methods:**

```typescript
class MagicSkillTreeEvaluator {
  // Evaluate unlock conditions
  evaluateConditions(
    conditions: UnlockCondition[],
    mode: 'all' | 'any',
    caster: Entity,
    progress: MagicSkillProgress,
    world: World
  ): { met: boolean; failedConditions: string[] };

  // Check if node can be unlocked
  canUnlockNode(
    node: MagicSkillNode,
    progress: MagicSkillProgress,
    caster: Entity,
    world: World
  ): { canUnlock: boolean; reason?: string };

  // Purchase node
  purchaseNode(
    nodeId: string,
    tree: MagicSkillTree,
    progress: MagicSkillProgress
  ): { success: boolean; error?: string };

  // Apply node effects
  applyNodeEffects(
    node: MagicSkillNode,
    level: number,
    magic: MagicComponent
  ): void;
}
```

---

## Usage Examples

### Example 1: Casting a Spell

```typescript
import { getCastingService, getSpellRegistry } from '@ai-village/magic';

// Get services
const castingService = getCastingService();
const registry = getSpellRegistry();

// Ensure spell is unlocked
registry.setUnlocked('academic_fireball', true);

// Find target
const targets = world.query().with('position').executeEntities();
const target = targets[0];

// Cast spell
const result = castingService.castSpell(
  'academic_fireball',
  casterEntity,
  world,
  world.tick,
  { target }
);

if (result.success) {
  console.log('Fireball hit!');
  console.log('Resources spent:', result.resourcesSpent);
  console.log('Effects applied:', result.effectResults);
} else if (result.mishap) {
  console.log('Spell misfired!');
  console.log('Consequences:', result.mishapConsequences);
} else {
  console.error('Cast failed:', result.error);
}
```

### Example 2: Creating a Custom Paradigm

```typescript
import { createEmptyParadigm, createManaSource, createManaCost } from '@ai-village/magic';

// Create paradigm
const customParadigm = createEmptyParadigm('elemental', 'Elemental Magic');

customParadigm.description = 'Magic drawn from the four elements';
customParadigm.sources = [
  {
    id: 'elemental_fire',
    name: 'Fire Essence',
    type: 'ambient',
    regeneration: 'passive',
    regenRate: 0.05,
    storable: true,
    transferable: false,
    stealable: false,
    detectability: 'obvious'
  }
];

customParadigm.costs = [
  {
    type: 'mana',
    canBeTerminal: false,
    cumulative: false,
    recoverable: true,
    recoveryMethod: 'time',
    visibility: 'subtle'
  }
];

customParadigm.channels = [
  { type: 'somatic', requirement: 'required', canBeMastered: true, blockEffect: 'prevents_casting' }
];

customParadigm.laws = [
  {
    id: 'elemental_balance',
    name: 'Elemental Balance',
    type: 'balance',
    strictness: 'strong',
    canBeCircumvented: false,
    description: 'Elements must remain in balance'
  }
];

customParadigm.availableTechniques = ['create', 'control', 'enhance'];
customParadigm.availableForms = ['fire', 'water', 'earth', 'air'];
customParadigm.foreignMagicPolicy = 'compatible';
```

### Example 3: Implementing a Cost Calculator

```typescript
import type { ParadigmCostCalculator } from '@ai-village/magic';

class ElementalCostCalculator implements ParadigmCostCalculator {
  paradigmId = 'elemental';

  calculateCosts(spell: ComposedSpell, magic: MagicComponent): CalculatedCost[] {
    const baseCost = spell.manaCost;

    // Reduce cost if aligned with caster's element
    const casterElement = magic.paradigmState.elemental?.primaryElement;
    const spellElement = spell.form;
    const elementalBonus = casterElement === spellElement ? 0.8 : 1.0;

    return [
      {
        type: 'mana',
        amount: baseCost * elementalBonus,
        canBeTerminal: false
      }
    ];
  }

  canAfford(costs: CalculatedCost[], magic: MagicComponent): AffordabilityResult {
    const manaCost = costs.find(c => c.type === 'mana');
    if (!manaCost) return { canAfford: true };

    const pool = magic.manaPools[0];
    if (!pool || pool.current < manaCost.amount) {
      return {
        canAfford: false,
        missing: [{ type: 'mana', amount: manaCost.amount - (pool?.current ?? 0) }]
      };
    }

    return { canAfford: true };
  }

  deductCosts(costs: CalculatedCost[], magic: MagicComponent): DeductionResult {
    const manaCost = costs.find(c => c.type === 'mana');
    if (!manaCost) return { success: true, deducted: [] };

    const pool = magic.manaPools[0];
    if (!pool) return { success: false };

    pool.current -= manaCost.amount;

    return {
      success: true,
      deducted: [{ type: 'mana', amount: manaCost.amount }]
    };
  }

  recoverCosts(magic: MagicComponent, elapsed: number): void {
    const pool = magic.manaPools[0];
    if (!pool) return;

    const regenRate = 0.05;  // 5% per tick
    pool.current = Math.min(pool.maximum, pool.current + regenRate * elapsed);
  }
}

// Register
import { costCalculatorRegistry } from '@ai-village/magic';
costCalculatorRegistry.register(new ElementalCostCalculator());
```

### Example 4: Building a Skill Tree

```typescript
import {
  createSkillTree,
  createSkillNode,
  createSkillEffect,
  createUnlockCondition
} from '@ai-village/magic';

// Create nodes
const nodes = [
  // Foundation node
  createSkillNode(
    'elemental_attunement',
    'Elemental Attunement',
    'elemental',
    'foundation',
    0,  // tier
    0,  // XP cost (free)
    [
      createSkillEffect('paradigm_proficiency', 10)
    ],
    {
      description: 'Attune to elemental forces',
      unlockConditions: [
        createUnlockCondition(
          'ritual_performed',
          { ritualId: 'elemental_awakening' },
          'Complete the Elemental Awakening ritual'
        )
      ]
    }
  ),

  // Technique node
  createSkillNode(
    'flame_creation',
    'Flame Creation',
    'elemental',
    'technique',
    1,  // tier
    10, // XP cost
    [
      createSkillEffect('unlock_technique', 1, { target: { techniqueId: 'create' } }),
      createSkillEffect('unlock_form', 1, { target: { formId: 'fire' } })
    ],
    {
      description: 'Learn to create flames',
      prerequisites: ['elemental_attunement']
    }
  ),

  // Mastery node
  createSkillNode(
    'pyromancy_mastery',
    'Pyromancy Mastery',
    'elemental',
    'mastery',
    2,  // tier
    50, // XP cost
    [
      createSkillEffect('cost_reduction', 10, {
        perLevelValue: 5,
        target: { formId: 'fire' }
      })
    ],
    {
      description: 'Master fire magic, reducing costs',
      maxLevel: 5,
      levelCostMultiplier: 1.5,
      prerequisites: ['flame_creation']
    }
  )
];

// Create tree
const elementalTree = createSkillTree(
  'elemental_tree',
  'elemental',
  'Elemental Magic',
  'Master the four elements',
  nodes,
  [
    { eventType: 'element_channeled', xpAmount: 1, description: 'Channel an element' },
    { eventType: 'spell_cast', xpAmount: 2, description: 'Cast an elemental spell' }
  ],
  {
    rules: {
      allowRespec: false,
      permanentProgress: true,
      requiresInnateAbility: false
    }
  }
);

// Register tree
import { getMagicSkillTreeRegistry } from '@ai-village/magic';
const treeRegistry = getMagicSkillTreeRegistry();
treeRegistry.register(elementalTree);
```

### Example 5: Evaluating Unlock Conditions

```typescript
import { getMagicSkillTreeEvaluator } from '@ai-village/magic';

const evaluator = getMagicSkillTreeEvaluator();

// Get agent's magic progress
const magic = casterEntity.getComponent<MagicComponent>('magic');
const progress = magic.paradigmProgress.elemental;

// Get tree and node
const tree = treeRegistry.getTree('elemental_tree');
const node = tree.nodes.find(n => n.id === 'pyromancy_mastery');

// Check if can unlock
const check = evaluator.canUnlockNode(node, progress, casterEntity, world);

if (check.canUnlock) {
  // Purchase node
  const purchase = evaluator.purchaseNode('pyromancy_mastery', tree, progress);

  if (purchase.success) {
    console.log('Node unlocked!');

    // Apply effects to magic component
    evaluator.applyNodeEffects(node, 1, magic);
  }
} else {
  console.log(`Cannot unlock: ${check.reason}`);
}
```

---

## Architecture & Data Flow

### System Execution Order

```
Magic systems don't run in the main ECS loop.
They're invoked on-demand via:

1. Agent actions (agent decides to cast spell)
   ↓ Calls SpellCastingService.castSpell()
2. UI input (player presses hotkey)
   ↓ Calls SpellCastingService.castSpell()
3. Script/quest triggers
   ↓ Calls SpellCastingService.castSpell()
```

### Spell Casting Flow

```
Player/Agent
  ↓ castSpell(spellId, caster, target)
SpellCastingService
  ↓ Validate spell unlocked
  ↓ Validate target (range, type)
  ↓ Get paradigm cost calculator
  ↓ calculateCosts()
CostCalculator (paradigm-specific)
  ↓ Calculate mana/health/resource costs
  ↓ canAfford()
  ↓ Check caster has enough resources
  ↓ deductCosts()
SpellCastingService
  ↓ Roll for mishap (based on proficiency)
  ↓ If mishap: apply consequences
  ↓ If success: execute effects
SpellEffectExecutor
  ↓ Get effect definition
  ↓ Get effect applier
EffectApplier (category-specific)
  ↓ Apply damage/healing/buff/etc.
  ↓ Emit effect events
SpellCastingService
  ↓ Record cast for proficiency gain
  ↓ Emit spell cast events
  ↓ Return SpellCastResult
```

### Event Flow

```
SpellCastingService
  ↓ 'spell:cast' → { spellId, casterId, targetId, result }
  ↓ 'spell:mishap' → { spellId, casterId, consequences }
  ↓ 'spell:success' → { spellId, casterId, targetId, effects }

EffectApplier
  ↓ 'effect:applied' → { effectId, targetId, amount }
  ↓ 'entity:damaged' → { targetId, damage, damageType }
  ↓ 'entity:healed' → { targetId, healing }
  ↓ 'buff:added' → { targetId, buffId, duration }

MagicSkillTreeEvaluator
  ↓ 'magic:xp_gained' → { paradigmId, amount }
  ↓ 'magic:node_unlocked' → { paradigmId, nodeId }
  ↓ 'magic:discovery' → { paradigmId, discoveryType, discoveryId }
```

### Component Relationships

```
Entity (Caster)
├── MagicComponent (required for magic users)
│   ├── homeParadigmId → string (primary paradigm)
│   ├── learnedParadigms → string[] (other paradigms known)
│   ├── manaPools → ManaPool[]
│   ├── paradigmState → ParadigmState (paradigm-specific data)
│   │   ├── academic?: { /* academic state */ }
│   │   ├── divine?: { deityId, deityStanding }
│   │   ├── blood?: { corruption }
│   │   ├── allomancy?: { metals: Record<string, MetalReserve> }
│   │   └── ... (25+ paradigms)
│   ├── paradigmProgress → Record<string, MagicSkillProgress>
│   ├── corruption?: number
│   ├── favorLevel?: number
│   └── totalMishaps: number
└── SpiritualComponent (optional, for divine casters)
    ├── believedDeity?: string
    └── faith: number

Entity (Target)
├── Needs (for damage/healing)
│   ├── health: number
│   └── maxHealth: number
└── ActiveEffects (for buffs/debuffs)
    └── effects: ActiveEffect[]
```

---

## Performance Considerations

**Optimization strategies:**

1. **Lazy initialization**: Paradigms and skill trees are only loaded when first accessed
2. **Calculator registry**: Cost calculators are singletons, created once per paradigm
3. **Effect applier pooling**: Effect appliers are reused across all spell casts
4. **Proficiency caching**: Mishap chances cached until proficiency changes
5. **Condition evaluation batching**: Unlock conditions evaluated in batch for entire tree

**Query caching:**

```typescript
// ❌ BAD: Query in loop for each target
for (const target of possibleTargets) {
  const enemies = world.query().with('enemy').executeEntities();  // Query every iteration!
  if (enemies.includes(target)) { /* ... */ }
}

// ✅ GOOD: Query once, cache results
const enemies = new Set(world.query().with('enemy').executeEntities().map(e => e.id));
for (const target of possibleTargets) {
  if (enemies.has(target.id)) { /* ... */ }
}
```

**Cost calculation optimization:**

```typescript
// ❌ BAD: Recalculate costs every frame
function canCast(spell: SpellDefinition, magic: MagicComponent): boolean {
  const costs = calculator.calculateCosts(spell, magic, ctx);  // Expensive!
  return calculator.canAfford(costs, magic).canAfford;
}

// ✅ GOOD: Cache costs, invalidate on state change
class CachedCostCalculator {
  private cache = new Map<string, CalculatedCost[]>();

  calculateCosts(spell: SpellDefinition, magic: MagicComponent): CalculatedCost[] {
    const cacheKey = `${spell.id}_${magic.manaPools[0]?.current}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const costs = this.baseCalculator.calculateCosts(spell, magic, ctx);
    this.cache.set(cacheKey, costs);
    return costs;
  }
}
```

---

## Troubleshooting

### Spell fails with "No cost calculator registered"

**Check:**
1. Is `registerAllCostCalculators()` called during initialization?
2. Is the paradigm ID spelled correctly in the spell definition?
3. Does the paradigm have a cost calculator implemented?

**Debug:**
```typescript
import { costCalculatorRegistry } from '@ai-village/magic';

console.log('Registered paradigms:', costCalculatorRegistry.getRegisteredParadigms());

// If missing, register manually
import { AcademicCostCalculator } from './costs/calculators/AcademicCostCalculator.js';
costCalculatorRegistry.register(new AcademicCostCalculator());
```

### Spell costs are incorrect

**Check:**
1. Is the cost calculator using the correct paradigm state?
2. Are modifiers (faith, corruption, etc.) being applied correctly?
3. Is the spell definition using the correct paradigmId?

**Debug:**
```typescript
const calculator = costCalculatorRegistry.get('academic');
const costs = calculator.calculateCosts(spell, magic, ctx);
console.log('Calculated costs:', costs);

// Check magic component state
console.log('Mana pools:', magic.manaPools);
console.log('Paradigm state:', magic.paradigmState);
```

### Unlock conditions not evaluating correctly

**Check:**
1. Does the agent have the required discoveries/relationships?
2. Is the magic progress component initialized for this paradigm?
3. Are condition parameters spelled correctly?

**Debug:**
```typescript
const evaluator = getMagicSkillTreeEvaluator();
const result = evaluator.evaluateConditions(
  node.unlockConditions,
  node.conditionMode,
  casterEntity,
  progress,
  world
);

console.log('Conditions met:', result.met);
console.log('Failed conditions:', result.failedConditions);

// Check agent's magic progress
console.log('Discoveries:', progress.discoveries);
console.log('Unlocked nodes:', progress.unlockedNodes);
```

### Spell not appearing in registry

**Error:** `Spell 'my_spell_id' not found`

**Fix:** Ensure spell is registered during initialization:

```typescript
import { getSpellRegistry } from '@ai-village/magic';

const registry = getSpellRegistry();

registry.register({
  id: 'my_spell_id',
  name: 'My Spell',
  paradigmId: 'academic',
  technique: 'create',
  form: 'fire',
  source: 'arcane',
  manaCost: 10,
  castTime: 20,
  range: 10,
  effectId: 'my_effect_id',
  description: 'My custom spell'
});

// Or batch register
registry.registerAll([spell1, spell2, spell3]);
```

### Mishap rate too high/low

**Check:**
1. Is proficiency being recorded correctly? (`registry.recordCast()`)
2. Is `baseMishapChance` set correctly on spell definition?
3. Is proficiency system initialized for this spell?

**Debug:**
```typescript
const state = registry.getPlayerState('my_spell_id');
console.log('Proficiency:', state?.proficiency);
console.log('Times cast:', state?.timesCast);

const mishapChance = registry.getMishapChance('my_spell_id');
console.log('Current mishap chance:', mishapChance);

// Manually adjust proficiency for testing
registry.setProficiency('my_spell_id', 100);  // Max proficiency
```

---

## Integration with Other Systems

### Agent Actions System

Agents cast spells via action handlers:

```typescript
// From AgentMagicActionHandler
action = {
  type: 'cast_spell',
  params: {
    spellId: 'academic_fireball',
    targetEntityId: 'enemy_123'
  }
};

// Handler calls SpellCastingService
const result = castingService.castSpell(
  action.params.spellId,
  agent,
  world,
  world.tick,
  { target: targetEntity }
);
```

### LLM Integration (Consciousness System)

Agents can generate custom spells via LLM:

```typescript
import { LLMEffectGenerator } from '@ai-village/magic';

const generator = new LLMEffectGenerator(llmClient);

// Generate custom spell based on narrative context
const customSpell = await generator.generateSpellEffect(
  'Create a spell to put out a fire',
  'academic',
  casterEntity,
  world
);

// Register and cast
registry.register(customSpell);
registry.setUnlocked(customSpell.id, true);
castingService.castSpell(customSpell.id, casterEntity, world, world.tick);
```

### Divinity System

Divine magic integrates with deity worship:

```typescript
// Divine casters sync faith from SpiritualComponent
const spiritual = caster.getComponent<SpiritualComponent>('spiritual');
const magic = caster.getComponent<MagicComponent>('magic');

// Faith affects divine magic costs
if (spiritual.faith >= 0.8) {
  magic.paradigmState.divine.deityStanding = 'favored';
  // 20% cost reduction for divine spells
}

// Deities can grant unique spells
if (spiritual.believedDeity === 'god_of_fire') {
  registry.setUnlocked('divine_flame_pillar', true);
}
```

### Combat System

Spells deal damage via combat system:

```typescript
// Damage effect applier emits combat events
world.eventBus.emit('entity:damaged', {
  targetId: target.id,
  damage: effectDamage,
  damageType: 'fire',
  source: 'spell',
  spellId: 'academic_fireball'
});

// CombatSystem listens and applies damage
CombatSystem.onEntityDamaged(event => {
  const needs = target.getComponent<NeedsComponent>('needs');
  needs.health -= event.damage;

  if (needs.health <= 0) {
    world.eventBus.emit('entity:died', { entityId: target.id });
  }
});
```

---

## Testing

Run magic system tests:

```bash
# All magic tests
npm test -- magic/

# Specific test files
npm test -- MagicParadigm.test.ts
npm test -- SpellCastingService.test.ts
npm test -- CostSystemIntegration.test.ts
npm test -- MagicSkillTree.test.ts
```

**Key test files:**
- `src/__tests__/MagicParadigm.test.ts` - Paradigm validation
- `src/__tests__/CoreParadigms.test.ts` - Core paradigm definitions
- `src/__tests__/CostSystemIntegration.test.ts` - Cost calculator integration
- `src/__tests__/CostSystemNoFallbacks.test.ts` - No silent fallbacks
- `src/__tests__/MagicSkillTree.test.ts` - Skill tree mechanics
- `src/__tests__/ParadigmSkillTrees.test.ts` - Paradigm skill tree validation

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Magic metasystem deep dive
- **PERFORMANCE.md** - Performance optimization guide
- **openspec/specs/magic-system/** - Magic system specifications

---

## Summary for Language Models

**Before working with the magic system:**
1. Read this README completely to understand paradigms, costs, and spell casting
2. Understand that magic paradigms vary fundamentally across universes
3. Know the spell casting pipeline: validation → costs → mishap → effects → proficiency
4. Understand the cost calculator registry pattern (paradigm-specific calculators)
5. Know how skill trees work (unlock conditions, XP, effects)

**Common tasks:**
- **Cast spell:** Use `SpellCastingService.castSpell(spellId, caster, world, tick, options)`
- **Register spell:** Use `SpellRegistry.register(spellDefinition)`
- **Check if can cast:** Use `SpellCastingService.canCast(spellId, caster, options)`
- **Create paradigm:** Use `createEmptyParadigm()` and fill in sources/costs/laws
- **Implement cost calculator:** Implement `ParadigmCostCalculator`, register with `costCalculatorRegistry`
- **Build skill tree:** Use `createSkillTree()` with `createSkillNode()` nodes
- **Unlock spell:** Use `SpellRegistry.setUnlocked(spellId, true)`

**Critical rules:**
- ALWAYS call `registerAllCostCalculators()` during initialization before casting spells
- NEVER bypass the spell casting service (use `castSpell()`, not direct effect application)
- NEVER modify mana/resources directly (use cost calculators)
- ALWAYS validate paradigm IDs match between spell, calculator, and magic component
- ALWAYS emit events when spells are cast (done automatically by `SpellCastingService`)
- Cost calculators MUST throw errors on invalid input (no silent fallbacks)
- Unlock conditions MUST be evaluated correctly (use `MagicSkillTreeEvaluator`)

**Event-driven architecture:**
- Listen to `spell:cast`, `spell:mishap`, `spell:success` for spell results
- Listen to `effect:applied`, `entity:damaged`, `entity:healed` for effect outcomes
- Listen to `magic:xp_gained`, `magic:node_unlocked` for progression
- Emit events when creating custom paradigms/spells (for other systems to react)
- Never bypass SpellCastingService for spell execution

**Paradigm-specific notes:**
- **Academic**: Simple mana cost, standard mishaps
- **Divine**: Faith-based cost reduction, favor system
- **Blood**: Health costs, corruption accumulation, can be terminal
- **Allomancy**: Metal consumption, bloodline requirement, flaring
- **Rune**: Inscription time, material costs, precision requirements
- **Shinto**: Purity requirements, kami favor, pollution mechanics
- **Daemon**: Separation distance, dust affinity, settling mechanics
- **Dream**: Lucidity requirements, realm access, nightmare risks
- **Sympathy**: Alar strength, slippage, link quality
- **Song**: Voice capacity, harmony bonuses, discord risks
