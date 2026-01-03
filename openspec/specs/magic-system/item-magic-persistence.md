> **System:** magic-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Item System, Magic, and Persistence Layer Specification

> *Dedicated to Tarn Adams and Dwarf Fortress - whose material system taught us that leather and iron are fundamentally the same thing, just with different properties.*

## Overview

This specification defines the architecture for:

1. **Extensible Item System** - Material-based items with compositional properties
2. **Multi-Source Magic System** - Verb/noun composition with multiple magic traditions
3. **LLM-Generated Effects** - Safe creation of novel effects via AI
4. **Universe Forking** - Parallel world testing for validation
5. **Cross-Universe Sharing** - Portable, validated effect packages
6. **Persistence Layer** - Versioned serialization with migrations

---

## Part 1: Item System Architecture

### Design Principles (Lessons from Dwarf Fortress)

From Tarn Adams' [Game AI Pro 2 chapter](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter41_Simulation_Principles_from_Dwarf_Fortress.pdf):

1. **Don't Overplan Your Model** - Start working, extend iteratively
2. **Break Down and Understand the System** - Separate fields interact to create emergent behavior
3. **Don't Overcomplicate** - Avoid premature abstraction
4. **Base Your Model on Real-World Analogs** - Ground systems in something you can reason about

### Current State vs Target State

**Current** (`ItemDefinition.ts`):
```typescript
interface ItemDefinition {
  isEdible: boolean;      // Flat boolean flags
  isStorable: boolean;    // Can't compose
  isGatherable: boolean;  // Hard to extend
}
```

**Target**: Compositional traits that can be added/removed dynamically:
```typescript
interface ItemDefinition {
  id: string;
  baseMaterial: string;   // References MaterialTemplate
  traits: ItemTraits;     // Compositional bag of properties
}

interface ItemTraits {
  edible?: EdibleTrait;
  weapon?: WeaponTrait;
  magical?: MagicalTrait;
  container?: ContainerTrait;
  // ... extensible
}
```

### Material Template System

Materials define base properties that items inherit:

```typescript
interface MaterialTemplate {
  id: string;                    // "iron", "oak", "leather"
  displayName: string;

  // Physical properties
  density: number;               // kg/m³
  hardness: number;              // 0-100 scale
  flexibility: number;           // 0-100

  // Thermal properties
  meltingPoint?: number;         // Kelvin, undefined = won't melt
  ignitePoint?: number;          // Kelvin, undefined = won't burn
  heatConductivity: number;      // W/(m·K)

  // Magic properties
  magicAffinity: number;         // 0-100, how well it holds enchantments
  resonantForms?: Form[];        // Magic forms this material resonates with

  // Inherent effects (mithril glows, etc.)
  inherentEffects?: EffectExpression[];

  // Categories for recipe matching
  categories: MaterialCategory[];
}

type MaterialCategory =
  | 'metal' | 'wood' | 'stone' | 'cloth' | 'leather'
  | 'organic' | 'magical' | 'liquid' | 'gas';
```

### Item Definition vs Instance

**Definition** - Static template loaded at startup:
```typescript
interface ItemDefinition {
  id: string;                    // "iron_sword"
  displayName: string;

  baseMaterial: string;          // "iron" -> MaterialTemplate
  baseTraits: ItemTraits;        // Default traits for this item type

  // Crafting
  recipe?: Recipe;               // How to make this

  // Visual
  spriteId: string;

  // Categories for UI/logic
  categories: ItemCategory[];
}
```

**Instance** - Runtime object that can be modified:
```typescript
interface ItemInstance {
  instanceId: string;            // UUID, unique per instance
  definitionId: string;          // References ItemDefinition

  // Overrides (for enchanted/modified items)
  materialOverride?: string;     // Transmuted to different material?
  additionalTraits?: ItemTraits; // Enchantments, blessings, curses

  // Quality/condition
  quality: ItemQuality;          // 'poor' | 'normal' | 'fine' | 'masterwork' | 'legendary'
  condition: number;             // 0-100, degrades with use

  // Provenance
  creator?: string;              // Entity ID who crafted it
  createdAt?: number;            // Game tick
  createdInUniverse?: string;    // For cross-universe items

  // Stack info
  stackSize: number;
}

type ItemQuality = 'poor' | 'normal' | 'fine' | 'masterwork' | 'legendary';
```

### Trait Composition

Traits are optional property bags that can be combined:

```typescript
interface EdibleTrait {
  hungerRestored: number;
  quality: number;               // 0-100, affects mood
  flavors: FlavorType[];
  spoilRate?: number;            // Ticks until spoiled, undefined = won't spoil
}

interface WeaponTrait {
  damage: number;
  damageType: DamageType;
  range: number;                 // Tiles
  attackSpeed: number;           // Attacks per second
  durabilityLoss: number;        // Condition lost per attack
}

interface MagicalTrait {
  effects: EffectExpression[];
  charges?: number;              // undefined = unlimited
  rechargeRate?: number;         // Charges per hour
  manaCost?: number;             // Per use
}

interface ContainerTrait {
  capacity: number;              // Weight or count
  acceptedCategories?: ItemCategory[];
  preserves?: boolean;           // Prevents spoilage
}

interface ToolTrait {
  toolType: ToolType;            // 'axe' | 'pickaxe' | 'hoe' | etc.
  efficiency: number;            // Multiplier on gathering speed
  durabilityLoss: number;        // Per use
}
```

---

## Part 2: Magic System Architecture

### Multi-Source Magic (Multiverse Ready)

Different universes and traditions have different magic systems:

```typescript
interface MagicSource {
  id: string;                    // "arcane", "divine", "void"
  name: string;
  description: string;

  // What this source can do
  availableTechniques: Technique[];
  availableForms: Form[];

  // Cost model
  costModel: CostModel;

  // Restrictions
  restrictions?: Restriction[];

  // How this source interacts with others
  interactions: Map<string, InteractionRule>;

  // Universe-specific
  originUniverse?: string;       // Where this magic comes from
  availableInUniverses?: string[]; // Where it can be used
}

// Techniques (Verbs) - What you're doing
type Technique =
  | 'create'     // Bring into existence
  | 'perceive'   // Sense or understand
  | 'transform'  // Change properties
  | 'destroy'    // Remove or damage
  | 'control'    // Direct or manipulate
  | 'bind'       // Connect or link
  | 'summon'     // Call from elsewhere
  | 'banish';    // Send away

// Forms (Nouns) - What you're affecting
type Form =
  // Elements
  | 'fire' | 'water' | 'earth' | 'air'
  // Living
  | 'body' | 'mind' | 'spirit' | 'life' | 'death'
  // Abstract
  | 'time' | 'space' | 'void' | 'fate'
  // Material
  | 'plant' | 'animal' | 'metal' | 'stone'
  // Phenomena
  | 'light' | 'shadow' | 'sound' | 'force';

interface CostModel {
  type: 'mana' | 'faith' | 'blood' | 'sanity' | 'life' | 'reagent';
  basePerMagnitude: number;
  scalingFunction?: 'linear' | 'quadratic' | 'exponential';
}
```

### Spell Composition (Ars Magica Style)

```typescript
interface ComposedSpell {
  id?: string;
  name: string;

  // The composition
  source: string;                // MagicSource ID
  technique: Technique;
  forms: Form[];                 // Can combine multiple
  magnitude: number;             // Power level

  // Modifiers
  modifiers?: SpellModifier[];

  // Computed
  cost?: number;                 // Calculated from source's cost model
  difficulty?: number;           // Skill check target
}

interface SpellModifier {
  type: ModifierType;
  value: number;
}

type ModifierType =
  | 'range_increase'
  | 'duration_increase'
  | 'area_increase'
  | 'penetration'
  | 'subtle'                     // Harder to detect
  | 'quiet'                      // No verbal component
  | 'quick';                     // Faster cast

// Example: A fireball
const fireball: ComposedSpell = {
  name: "Fireball",
  source: "arcane",
  technique: "create",
  forms: ["fire"],
  magnitude: 3,
  modifiers: [
    { type: "area_increase", value: 2 },
    { type: "range_increase", value: 1 }
  ]
};
```

### Example Magic Sources

```typescript
const ARCANE_MAGIC: MagicSource = {
  id: 'arcane',
  name: 'Arcane Magic',
  description: 'Magic derived from study and manipulation of raw magical energy',
  availableTechniques: ['create', 'transform', 'destroy', 'control'],
  availableForms: ['fire', 'water', 'earth', 'air', 'light', 'shadow', 'force'],
  costModel: { type: 'mana', basePerMagnitude: 10, scalingFunction: 'quadratic' },
  interactions: new Map([
    ['divine', { type: 'neutral' }],
    ['void', { type: 'unstable', failureChance: 0.1 }]
  ])
};

const DIVINE_MAGIC: MagicSource = {
  id: 'divine',
  name: 'Divine Magic',
  description: 'Power granted by the gods to their faithful',
  availableTechniques: ['create', 'perceive', 'transform', 'control', 'banish'],
  availableForms: ['body', 'mind', 'spirit', 'life', 'light'],
  costModel: { type: 'faith', basePerMagnitude: 5, scalingFunction: 'linear' },
  restrictions: [
    { type: 'alignment', allowed: ['good', 'neutral'] },
    { type: 'deity_approval', required: true }
  ]
};

const VOID_MAGIC: MagicSource = {
  id: 'void',
  name: 'Void Magic',
  description: 'Dangerous magic drawing from the space between realities',
  availableTechniques: ['destroy', 'perceive', 'control', 'summon', 'banish'],
  availableForms: ['void', 'time', 'space', 'shadow', 'death'],
  costModel: { type: 'sanity', basePerMagnitude: 15, scalingFunction: 'exponential' },
  restrictions: [
    { type: 'corruption_risk', chance: 0.05 },
    { type: 'reality_instability', threshold: 10 }
  ]
};
```

---

## Part 3: Effect System (The Execution Model)

### EffectExpression - The Universal Format

All magic, items, abilities, and environmental effects compile to this format:

```typescript
interface EffectExpression {
  id?: string;
  name?: string;
  description?: string;

  // Targeting
  target: TargetSelector;

  // What to do
  operations: EffectOperation[];

  // When to trigger
  timing: EffectTiming;

  // Conditions
  conditions?: Condition[];

  // Metadata
  source?: 'static' | 'composed' | 'generated';
  generationContext?: GenerationContext;
}

// Target selection
interface TargetSelector {
  type: 'self' | 'single' | 'area' | 'cone' | 'line' | 'all';

  // For single/area selection
  filter?: TargetFilter;

  // For area effects
  radius?: number;
  angle?: number;              // For cones
  length?: number;             // For lines

  // Limits
  maxTargets?: number;
  excludeSelf?: boolean;
  excludePrevious?: boolean;   // For chain effects
}

interface TargetFilter {
  entityTypes?: string[];      // 'agent', 'animal', 'plant', etc.
  factions?: string[];         // 'friendly', 'hostile', 'neutral'
  hasComponents?: string[];    // Must have these components
  customPredicate?: Expression; // Custom condition
}
```

### Effect Operations (The Instruction Set)

```typescript
type EffectOperation =
  // Stats
  | { op: 'modify_stat'; stat: string; amount: Expression; duration?: number }
  | { op: 'set_stat'; stat: string; value: Expression }

  // Status effects
  | { op: 'apply_status'; status: string; duration: number; stacks?: number }
  | { op: 'remove_status'; status: string; stacks?: number | 'all' }

  // Damage/healing
  | { op: 'deal_damage'; damageType: DamageType; amount: Expression; }
  | { op: 'heal'; amount: Expression }

  // Movement
  | { op: 'teleport'; destination: LocationExpression }
  | { op: 'push'; direction: DirectionExpression; distance: Expression }
  | { op: 'pull'; toward: LocationExpression; distance: Expression }

  // Spawning
  | { op: 'spawn_entity'; entityType: string; count: Expression; at?: LocationExpression }
  | { op: 'spawn_item'; itemId: string; count: Expression; at?: LocationExpression }

  // Transformation
  | { op: 'transform_entity'; toType: string; duration?: number }
  | { op: 'transform_material'; from: string; to: string }

  // Events
  | { op: 'emit_event'; eventType: string; payload: Record<string, Expression> }

  // Chaining
  | { op: 'chain_effect'; effectId: string; newTarget: TargetSelector }
  | { op: 'trigger_effect'; effectId: string }  // On same target

  // Control flow
  | { op: 'conditional'; condition: Condition; then: EffectOperation[]; else?: EffectOperation[] }
  | { op: 'repeat'; times: Expression; operations: EffectOperation[] }
  | { op: 'delay'; ticks: number; then: EffectOperation[] };

type DamageType =
  | 'physical' | 'fire' | 'ice' | 'lightning' | 'poison'
  | 'holy' | 'unholy' | 'void' | 'psychic' | 'force';
```

### Expression Language (Safe, Side-Effect-Free)

```typescript
// Expressions compute values without side effects
type Expression =
  | number                                           // Literal
  | string                                           // Variable reference: "caster.intelligence"
  | { fn: FunctionName; args: Expression[] }         // Function call
  | { op: BinaryOp; left: Expression; right: Expression }
  | { op: UnaryOp; operand: Expression };

type FunctionName =
  // Math
  | 'sqrt' | 'pow' | 'abs' | 'floor' | 'ceil' | 'round'
  | 'min' | 'max' | 'clamp'
  // Random
  | 'random' | 'random_int' | 'random_choice'
  // Spatial
  | 'distance' | 'direction'
  // Queries
  | 'count' | 'has_status' | 'has_component' | 'get_stat'
  // Conditionals
  | 'if_else';

type BinaryOp = '+' | '-' | '*' | '/' | '%' | '**' | '&&' | '||' | '==' | '!=' | '<' | '>' | '<=' | '>=';
type UnaryOp = '-' | '!' | 'not';

// Example: Intelligence-scaled damage with randomness
const scaledDamage: Expression = {
  op: '*',
  left: { fn: 'random', args: [15, 25] },  // Base 15-25
  right: {
    op: '+',
    left: 1,
    right: {
      op: '/',
      left: 'caster.intelligence',
      right: 20
    }
  }
};
```

### Effect Interpreter (Safe Execution)

```typescript
class EffectInterpreter {
  // Limits to prevent infinite/expensive effects
  private readonly limits = {
    maxOperations: 1000,
    maxDepth: 10,
    maxEntitiesAffected: 100,
    maxDamagePerEffect: 10000,
  };

  execute(effect: EffectExpression, context: EffectContext): EffectResult {
    // Validate limits
    this.validateLimits(effect);

    // Check conditions
    if (effect.conditions && !this.evaluateConditions(effect.conditions, context)) {
      return { executed: false, reason: 'conditions_not_met' };
    }

    // Resolve targets
    const targets = this.resolveTargets(effect.target, context);

    // Execute operations on each target
    let operationCount = 0;
    for (const target of targets) {
      for (const op of effect.operations) {
        if (++operationCount > this.limits.maxOperations) {
          throw new EffectLimitExceeded('max_operations');
        }
        this.executeOperation(op, { ...context, currentTarget: target }, 0);
      }
    }

    return { executed: true, targetsAffected: targets.length };
  }

  private executeOperation(
    op: EffectOperation,
    context: EffectContext,
    depth: number
  ): void {
    if (depth > this.limits.maxDepth) {
      throw new EffectLimitExceeded('max_depth');
    }

    switch (op.op) {
      case 'deal_damage':
        const amount = this.evaluateExpression(op.amount, context);
        if (amount > this.limits.maxDamagePerEffect) {
          throw new EffectLimitExceeded('max_damage');
        }
        context.currentTarget.dealDamage(op.damageType, amount);
        break;

      case 'conditional':
        if (this.evaluateCondition(op.condition, context)) {
          for (const thenOp of op.then) {
            this.executeOperation(thenOp, context, depth + 1);
          }
        } else if (op.else) {
          for (const elseOp of op.else) {
            this.executeOperation(elseOp, context, depth + 1);
          }
        }
        break;

      // ... other operations
    }
  }
}
```

---

## Part 4: LLM-Generated Effects

### Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    EFFECT GENERATION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Intent Analysis                                              │
│     "Create a spell that chains between enemies"                 │
│           ↓                                                      │
│  2. LLM Generation                                               │
│     Produces EffectExpression JSON                               │
│           ↓                                                      │
│  3. Schema Validation                                            │
│     Verify structure matches EffectExpression                    │
│           ↓                                                      │
│  4. Limit Validation                                             │
│     Check power level, operation count, etc.                     │
│           ↓                                                      │
│  5. Universe Fork Testing                                        │
│     Run in parallel universe for N cycles                        │
│           ↓                                                      │
│  6. Human Review (if passes automated)                           │
│     Present results, allow approve/reject/modify                 │
│           ↓                                                      │
│  7. Blessing                                                     │
│     Effect enters BlessedEffectRegistry                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Generation Prompt Structure

```typescript
interface EffectGenerationPrompt {
  // What the user/system wants
  intent: string;

  // Constraints
  constraints: {
    magicSource: string;           // Which magic system
    maxMagnitude: number;
    maxCost: number;
    allowedTechniques?: Technique[];
    allowedForms?: Form[];
    allowedOperations?: string[];  // Limit which ops can be used
  };

  // Context
  context: {
    casterLevel: number;
    availableForms: Form[];
    environment?: string;
  };

  // Examples (few-shot)
  examples: GenerationExample[];
}

interface GenerationExample {
  intent: string;
  effect: EffectExpression;
  reasoning: string;
}
```

### Example LLM Prompt

```markdown
You are designing magical effects for a fantasy simulation game.
Generate an EffectExpression JSON that fulfills the intent.

AVAILABLE OPERATIONS:
- deal_damage: Deal damage to targets
- heal: Restore health
- apply_status: Add status effects
- chain_effect: Trigger effect on new targets
- conditional: If/then/else logic

AVAILABLE EXPRESSION FUNCTIONS:
- sqrt(x), pow(x,y), min(x,y), max(x,y)
- distance(a,b), random(min,max)
- has_status(target, status)

CONSTRAINTS:
- Magic Source: arcane
- Max Magnitude: 5
- Allowed Forms: fire, lightning
- Max Operations: 10

INTENT: "A lightning bolt that chains to nearby enemies, dealing less damage with each jump"

Generate ONLY valid JSON matching the EffectExpression schema.
Include reasoning as a comment at the start.
```

### Validation Layers

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

class EffectValidator {
  validate(effect: EffectExpression, constraints: GenerationConstraints): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Schema validation
    const schemaResult = this.validateSchema(effect);
    errors.push(...schemaResult.errors);

    // 2. Constraint validation
    if (effect.operations.length > constraints.maxOperations) {
      errors.push({ type: 'too_many_operations', limit: constraints.maxOperations });
    }

    // 3. Power level estimation
    const powerLevel = this.estimatePowerLevel(effect);
    if (powerLevel > constraints.maxMagnitude * 10) {
      errors.push({ type: 'too_powerful', estimated: powerLevel });
    }

    // 4. Infinite loop detection
    if (this.detectPotentialInfiniteLoop(effect)) {
      errors.push({ type: 'potential_infinite_loop' });
    }

    // 5. Balance warnings
    if (this.hasUnconditionalInstantKill(effect)) {
      warnings.push({ type: 'unconditional_instant_kill' });
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
```

---

## Part 5: Universe Forking (Parallel World Testing)

### Core Concept

The game world itself is the sandbox. Fork it, inject the effect, run forward, observe results.

### World Serialization

```typescript
interface SerializedWorldState {
  version: number;
  timestamp: number;

  // Core state
  entities: SerializedEntity[];
  components: Map<string, SerializedComponent[]>;

  // Systems state
  systemStates: Map<string, unknown>;

  // World state
  terrain: SerializedTerrain;
  time: GameTime;
  weather: WeatherState;

  // Registries (reference only, not full data)
  registryVersions: {
    items: number;
    materials: number;
    effects: number;
  };
}

interface WorldFork {
  id: string;
  parentId: string | null;
  createdAt: number;
  purpose: ForkPurpose;

  snapshot: SerializedWorldState;

  experiment?: {
    effectId: string;
    effect: EffectExpression;
    injectionConfig: InjectionConfig;
  };

  results?: ForkResults;
}

type ForkPurpose =
  | { type: 'effect_testing'; effectId: string }
  | { type: 'what_if'; description: string }
  | { type: 'player_preview' }
  | { type: 'ai_planning' };
```

### Fork Execution

```typescript
class UniverseManager {
  async fork(purpose: ForkPurpose): Promise<WorldFork> {
    const snapshot = await this.mainWorld.serialize();

    return {
      id: crypto.randomUUID(),
      parentId: null,
      createdAt: Date.now(),
      purpose,
      snapshot,
    };
  }

  async runFork(
    forkId: string,
    cycles: number,
    options: ForkRunOptions = {}
  ): Promise<ForkResults> {
    const fork = this.forks.get(forkId)!;

    // Create isolated world
    const isolatedWorld = await World.deserialize(fork.snapshot);

    // Inject experiment
    if (fork.experiment) {
      await this.injectEffect(isolatedWorld, fork.experiment);
    }

    // Run with monitoring
    return this.simulateWithMonitoring(isolatedWorld, cycles, options);
  }

  private async simulateWithMonitoring(
    world: World,
    cycles: number,
    options: ForkRunOptions
  ): Promise<ForkResults> {
    const crashes: CrashReport[] = [];
    const violations: InvariantViolation[] = [];
    const startState = await world.serialize();

    for (let i = 0; i < cycles; i++) {
      try {
        world.update(16); // One tick

        // Check invariants
        violations.push(...this.checkInvariants(world));

        if (options.haltOnCrash && violations.length > 0) break;
      } catch (e) {
        crashes.push({
          cycle: i,
          error: e.message,
          stack: e.stack,
        });
        if (options.haltOnCrash) break;
      }
    }

    const endState = await world.serialize();

    return {
      cyclesRun: cycles,
      crashes,
      invariantViolations: violations,
      balanceMetrics: this.calculateMetrics(startState, endState),
      worldDiff: this.diffStates(startState, endState),
    };
  }
}
```

### Invariant Checking

```typescript
interface InvariantViolation {
  type: string;
  entityId?: string;
  details: Record<string, unknown>;
  severity: 'warning' | 'error' | 'critical';
}

class InvariantChecker {
  check(world: World): InvariantViolation[] {
    const violations: InvariantViolation[] = [];

    for (const entity of world.getEntities()) {
      // Health bounds
      const health = entity.getComponent('health');
      if (health) {
        if (health.current < 0) {
          violations.push({
            type: 'negative_health',
            entityId: entity.id,
            details: { health: health.current },
            severity: 'error',
          });
        }
        if (!Number.isFinite(health.current)) {
          violations.push({
            type: 'invalid_health',
            entityId: entity.id,
            details: { health: health.current },
            severity: 'critical',
          });
        }
      }

      // Position bounds
      const pos = entity.getComponent('position');
      if (pos && !world.isValidPosition(pos.x, pos.y)) {
        violations.push({
          type: 'out_of_bounds',
          entityId: entity.id,
          details: { x: pos.x, y: pos.y },
          severity: 'error',
        });
      }

      // Item validity
      const inventory = entity.getComponent('inventory');
      if (inventory) {
        for (const item of inventory.items) {
          if (!world.itemRegistry.has(item.definitionId)) {
            violations.push({
              type: 'invalid_item',
              entityId: entity.id,
              details: { itemId: item.definitionId },
              severity: 'error',
            });
          }
        }
      }
    }

    return violations;
  }
}
```

---

## Part 6: Cross-Universe Sharing

### Effect Package Format

```typescript
interface EffectPackage {
  // Identity
  id: string;
  name: string;
  description: string;
  version: string;

  // The effect
  effect: EffectExpression;

  // Compatibility
  compatibility: {
    gameVersionMin: string;
    gameVersionMax?: string;
    requiredMagicSources: string[];
    requiredForms: Form[];
  };

  // Provenance
  provenance: {
    creator: CreatorIdentity;
    createdAt: number;
    origin: EffectOrigin;
    validation: ValidationRecord;
    approvals: Approval[];
  };

  // Social
  social: {
    tags: string[];
    downloadCount: number;
    ratings: { up: number; down: number };
    forks: string[];
  };

  // Lore (optional)
  lore?: EffectLore;
}

interface EffectOrigin {
  type: 'handcrafted' | 'composed' | 'llm_generated';
  // If composed
  fromEffects?: string[];
  // If LLM generated
  model?: string;
  prompt?: string;
}

interface EffectLore {
  originUniverse: string;
  discoveredBy?: string;
  narrativeDescription: string;
  journey?: {
    path: string[];
    modifications: string[];
  };
}
```

### Trust Model

```typescript
interface TrustPolicy {
  autoAccept: {
    minApprovals: number;
    trustedCreators: string[];
    trustedUniverses: string[];
    maxPowerLevel?: number;
  };

  autoReject: {
    bannedCreators: string[];
    bannedTags: string[];
    llmGeneratedWithoutHumanReview: boolean;
  };

  validationPolicy: {
    rerunTests: boolean;
    requireLocalHumanReview: boolean;
    quarantineCycles: number;
  };
}

class CrossUniverseImporter {
  async importEffect(pkg: EffectPackage): Promise<ImportResult> {
    // 1. Check compatibility
    if (!this.isCompatible(pkg)) {
      return { status: 'incompatible', reason: 'version_mismatch' };
    }

    // 2. Evaluate trust
    const trust = this.evaluateTrust(pkg);

    if (trust === 'auto_accept') {
      return this.directImport(pkg);
    }

    if (trust === 'auto_reject') {
      return { status: 'rejected', reason: 'trust_policy' };
    }

    // 3. Local validation
    return this.validateLocally(pkg);
  }

  private async validateLocally(pkg: EffectPackage): Promise<ImportResult> {
    // Fork local universe
    const fork = await this.universeManager.fork({
      type: 'effect_testing',
      effectId: pkg.id,
    });

    // Test
    fork.experiment = {
      effectId: pkg.id,
      effect: pkg.effect,
      injectionConfig: { type: 'immediate' },
    };

    const results = await this.universeManager.runFork(
      fork.id,
      this.trustPolicy.validationPolicy.quarantineCycles
    );

    if (results.crashes.length > 0 || results.invariantViolations.length > 0) {
      return { status: 'rejected', reason: 'failed_local_tests', results };
    }

    if (this.trustPolicy.validationPolicy.requireLocalHumanReview) {
      return { status: 'needs_review', results };
    }

    return this.directImport(pkg);
  }
}
```

---

## Part 7: Persistence Layer

### Schema Versioning

Every persisted type has a schema version:

```typescript
interface Versioned {
  schemaVersion: number;
}

interface PersistedItemInstance extends Versioned {
  schemaVersion: 1;  // Increment on breaking changes

  instanceId: string;
  definitionId: string;
  materialOverride?: string;
  additionalTraits?: ItemTraits;
  quality: ItemQuality;
  condition: number;
  stackSize: number;
  creator?: string;
  createdAt?: number;
}

interface PersistedEffect extends Versioned {
  schemaVersion: 1;

  id: string;
  effect: EffectExpression;
  origin: EffectOrigin;
  approval?: ApprovalRecord;
}
```

### Migration System

```typescript
interface Migration<T> {
  fromVersion: number;
  toVersion: number;
  migrate(data: unknown): T;
}

class MigrationRegistry<T> {
  private migrations: Migration<T>[] = [];

  register(migration: Migration<T>): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  migrate(data: Versioned, targetVersion: number): T {
    let current = data;
    let currentVersion = data.schemaVersion;

    while (currentVersion < targetVersion) {
      const migration = this.migrations.find(
        m => m.fromVersion === currentVersion
      );

      if (!migration) {
        throw new MigrationError(
          `No migration from version ${currentVersion}`
        );
      }

      current = migration.migrate(current);
      currentVersion = migration.toVersion;
    }

    return current as T;
  }
}

// Example migration
const itemMigration_1_to_2: Migration<PersistedItemInstance> = {
  fromVersion: 1,
  toVersion: 2,
  migrate(data: any) {
    return {
      ...data,
      schemaVersion: 2,
      // New field with default
      durability: data.condition ?? 100,
      // Renamed field
      creatorEntityId: data.creator,
      creator: undefined,
    };
  },
};
```

### Save File Format

```typescript
interface SaveFile {
  // Header
  header: {
    version: number;           // Save format version
    gameVersion: string;       // Game version that created it
    createdAt: number;
    lastSavedAt: number;
    playTime: number;          // Seconds
  };

  // Universe identity
  universe: {
    id: string;
    name: string;
    seed: number;
  };

  // World state
  world: SerializedWorldState;

  // Player state
  player?: {
    pawnEntityId: string;
    camera: CameraState;
    uiState: UIState;
  };

  // Registry snapshots (for offline validation)
  registries: {
    items: { version: number; hash: string };
    materials: { version: number; hash: string };
    effects: { version: number; hash: string };
  };

  // Blessed effects (local)
  blessedEffects: PersistedEffect[];

  // Pending reviews
  pendingReviews: HumanReviewRequest[];

  // Checksum
  checksum: string;
}
```

### Storage Backends

```typescript
interface StorageBackend {
  save(key: string, data: SaveFile): Promise<void>;
  load(key: string): Promise<SaveFile | null>;
  list(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

// IndexedDB for browser
class IndexedDBStorage implements StorageBackend {
  private dbName = 'ai_village';
  private storeName = 'saves';

  async save(key: string, data: SaveFile): Promise<void> {
    const db = await this.getDb();
    await db.put(this.storeName, data, key);
  }

  async load(key: string): Promise<SaveFile | null> {
    const db = await this.getDb();
    return db.get(this.storeName, key);
  }
}

// File system for desktop/server
class FileSystemStorage implements StorageBackend {
  constructor(private baseDir: string) {}

  async save(key: string, data: SaveFile): Promise<void> {
    const path = `${this.baseDir}/${key}.json`;
    await fs.writeFile(path, JSON.stringify(data, null, 2));
  }

  async load(key: string): Promise<SaveFile | null> {
    const path = `${this.baseDir}/${key}.json`;
    try {
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
```

---

## Part 8: Human Review System

### Review Queue

```typescript
interface HumanReviewRequest {
  id: string;
  createdAt: number;

  // What's being reviewed
  effectId: string;
  effect: EffectExpression;

  // Test results
  testResults: ForkResults;

  // Preview for human
  preview: {
    description: string;
    visualPreview?: string;      // GIF/video URL
    codeView?: string;           // If LLM-generated
    comparisonToSimilar?: string;
  };

  // Guidance
  reviewPrompts: string[];
  suggestedPowerLevel: number;
  balanceNotes: string[];
}

interface HumanReviewResponse {
  decision: 'approve' | 'reject' | 'modify';

  rejectionReason?: string;
  feedbackForLLM?: string;

  modifications?: Partial<EffectExpression>;

  reviewerId: string;
  reviewedAt: number;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}
```

### Blessed Effect Registry

```typescript
interface BlessedEffect {
  id: string;
  effect: EffectExpression;

  origin: EffectOrigin;

  approval: {
    automatedTestsPassed: boolean;
    humanReviewerId: string;
    humanApprovedAt: number;
    confidence: 'high' | 'medium' | 'low';
    importedFrom?: string;
  };

  version: number;
  previousVersions: string[];

  stats: {
    timesUsed: number;
    avgDamageDealt: number;
    playerComplaints: number;
    lastUsed?: number;
  };
}

class BlessedEffectRegistry {
  private effects: Map<string, BlessedEffect> = new Map();

  get(id: string): EffectExpression | undefined {
    return this.effects.get(id)?.effect;
  }

  isBlessed(id: string): boolean {
    return this.effects.has(id);
  }

  bless(effect: EffectExpression, approval: BlessedEffect['approval']): void {
    // Only blessed effects can be used in main game
    this.effects.set(effect.id!, {
      id: effect.id!,
      effect,
      origin: effect.source ? { type: effect.source } : { type: 'handcrafted' },
      approval,
      version: 1,
      previousVersions: [],
      stats: { timesUsed: 0, avgDamageDealt: 0, playerComplaints: 0 },
    });
  }

  recordUsage(id: string, damage: number): void {
    const effect = this.effects.get(id);
    if (effect) {
      const n = effect.stats.timesUsed;
      effect.stats.avgDamageDealt =
        (effect.stats.avgDamageDealt * n + damage) / (n + 1);
      effect.stats.timesUsed++;
      effect.stats.lastUsed = Date.now();
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Pre-Persistence)
- [ ] `MaterialTemplate` interface and registry
- [ ] `ItemDefinition` with traits (refactor from current)
- [ ] `ItemInstance` type for runtime items
- [ ] Basic `EffectExpression` type
- [ ] `EffectInterpreter` with limits

### Phase 2: Magic System
- [ ] `MagicSource` registry
- [ ] `Technique` and `Form` enums
- [ ] `ComposedSpell` → `EffectExpression` compiler
- [ ] Initial magic sources (Arcane, Divine, Nature)

### Phase 3: Persistence Layer
- [ ] `SaveFile` format
- [ ] `SerializedWorldState`
- [ ] Migration system
- [ ] IndexedDB storage backend

### Phase 4: Universe Forking
- [ ] `World.serialize()` / `deserialize()`
- [ ] `UniverseManager.fork()`
- [ ] `InvariantChecker`
- [ ] Fork execution in Web Worker

### Phase 5: LLM Generation
- [ ] Effect generation prompts
- [ ] Schema validation
- [ ] Power level estimation
- [ ] Integration with fork testing

### Phase 6: Human Review
- [ ] `HumanReviewRequest` queue
- [ ] Review UI
- [ ] `BlessedEffectRegistry`
- [ ] Feedback loop to LLM

### Phase 7: Cross-Universe Sharing
- [ ] `EffectPackage` format
- [ ] `TrustPolicy`
- [ ] Import/export
- [ ] Lore generation

---

## References

- [Dwarf Fortress on Steam](https://store.steampowered.com/app/975370/Dwarf_Fortress/)
- [Game AI Pro 2: Simulation Principles from Dwarf Fortress](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter41_Simulation_Principles_from_Dwarf_Fortress.pdf)
- [Ars Magica Magic System](https://en.wikipedia.org/wiki/Ars_Magica)
- [Expr Expression Language](https://expr-lang.org/)
- [Extism: Sandboxing LLM-Generated Code](https://extism.org/blog/sandboxing-llm-generated-code/)
- [DF Wiki: Material Definition Tokens](https://dwarffortresswiki.org/index.php/Material_definition_token)
- [DF Wiki: Save Compatibility](https://dwarffortresswiki.org/index.php/Save_compatibility)
