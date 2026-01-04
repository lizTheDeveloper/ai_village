# Quantum Foam: Three Mechanistic Systems

**Date**: 2026-01-03
**Status**: Specification Phase
**Context**: User requested all three quantum mechanics - scale manipulation, probability chaos, and superposition

## Philosophy

Quantum foam is **unstable space-time at the Planck scale**. Because it's so fundamentally weird, it enables **three different quantum effects**:

1. **Scale Manipulation** - Shrink/enlarge by collapsing spatial dimensions
2. **Probability Chaos** - Unstable outcomes, quantum uncertainty amplified
3. **Superposition** - Exist in multiple states/locations until observed

Each system uses quantum foam differently and enables unique gameplay.

---

## Item Definitions

### Base Material: Quantum Foam

```typescript
defineItem('material:quantum_foam', 'Quantum Foam', 'material', {
  weight: 0.05, // Uncertain weight (fluctuates)
  stackSize: 5,  // Highly unstable, can't stack many
  baseMaterial: 'bubbling_spacetime',
  rarity: 'legendary',
  baseValue: 2000,
  metadata: {
    stabilityLevel: number,    // 0.0-1.0, how stable this foam is
    collapseTimer: number,      // Ticks until it collapses/decays
    quantumState: 'superposed', // State until observed
  },
  help: {
    description: 'Bubbling space-time at the Planck scale. Exists in superposition until observed. Extremely unstable.',
    usage: 'Can be used for scale manipulation, probability chaos, or superposition effects',
  }
});
```

**Properties**:
- **Unstable**: Decays rapidly (collapseTimer decrements each tick)
- **Uncertain**: Weight fluctuates randomly
- **Superposed**: Actual properties unknown until "measured" (used)
- **Dangerous**: Hostility 0.3 (can cause quantum effects on nearby entities)

### Processed Forms

```typescript
// Stabilized for specific uses
defineItem('material:stabilized_quantum_foam', 'Stabilized Quantum Foam', 'material', {
  weight: 0.1,
  stackSize: 20,
  rarity: 'rare',
  baseValue: 800,
  metadata: {
    stabilityLevel: 0.8, // Much more stable
  },
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 3 },
    { itemId: 'material:mana_crystal', amount: 1 },
  ],
  help: {
    description: 'Quantum foam stabilized with magic. Safe to handle and use.',
  }
});
```

---

## System 1: Scale Manipulation

### Core Concept

**Quantum foam collapses spatial dimensions** → entities shrink or enlarge.

At Planck scale, space itself is quantized. Consuming quantum foam "folds" or "unfolds" spatial dimensions around an entity, changing their effective size.

### New Components

```typescript
/**
 * ScaleComponent - Tracks entity scale/size
 */
export interface ScaleComponent {
  type: 'scale';
  version: number;

  /** Current scale multiplier (1.0 = normal, 0.5 = half size, 2.0 = double size) */
  scale: number;

  /** Base size before scaling (for reverting) */
  baseScale: number;

  /** Minimum allowed scale (default 0.01 = 1% original size) */
  minScale: number;

  /** Maximum allowed scale (default 100.0 = 100x original size) */
  maxScale: number;

  /** Scale change rate per tick when actively scaling */
  scaleRate: number;

  /** Target scale (for smooth transitions) */
  targetScale?: number;

  /** Whether scale affects physics (mass, collision, etc.) */
  affectsPhysics: boolean;

  /** Mass scales with volume (scale^3) if true, linearly if false */
  volumetricMass: boolean;
}
```

### New System: ScaleSystem

```typescript
export class ScaleSystem implements System {
  readonly id: SystemId = 'scale_system';
  readonly priority: number = 15; // After physics, before rendering
  readonly requiredComponents = ['scale'] as const;

  execute(world: World): void {
    const entities = world.query()
      .with(CT.Scale)
      .executeEntities();

    for (const entity of entities) {
      const scale = entity.getComponent('scale') as ScaleComponent;

      // Smooth transition to target scale
      if (scale.targetScale !== undefined) {
        const delta = scale.targetScale - scale.scale;
        if (Math.abs(delta) < 0.01) {
          scale.scale = scale.targetScale;
          scale.targetScale = undefined;
        } else {
          scale.scale += Math.sign(delta) * scale.scaleRate;
          scale.scale = Math.max(scale.minScale, Math.min(scale.maxScale, scale.scale));
        }
      }

      // Update physics if affects physics
      if (scale.affectsPhysics) {
        this.updatePhysicsForScale(entity, scale);
      }

      // Update rendering size (handled by renderer)
    }
  }

  private updatePhysicsForScale(entity: Entity, scale: ScaleComponent): void {
    // Mass scales with volume (scale^3) if volumetric
    const massMultiplier = scale.volumetricMass
      ? Math.pow(scale.scale, 3)
      : scale.scale;

    // Update collision bounds based on scale
    // (Integration with physics/collision system)
  }
}
```

### Harvesting Quantum Foam (Scale Type)

**Method 1: Quantum Laboratory**:
```typescript
// Building: Quantum Laboratory
// Requires: High energy, particle accelerator
// Generates: 1 quantum foam per 1000 ticks (unstable, random)
function quantumLabProduction(lab: Entity): ItemInstance | null {
  const energy = lab.getComponent('energy_storage') as EnergyStorageComponent;

  if (energy.current >= 1000) {
    energy.current -= 1000;

    // Random chance (10%)
    if (Math.random() < 0.1) {
      return {
        id: generateId(),
        itemId: 'material:quantum_foam',
        quantity: 1,
        metadata: {
          stabilityLevel: Math.random() * 0.5, // Very unstable
          collapseTimer: 200, // 10 seconds at 20 TPS
          quantumState: 'superposed',
        },
      };
    }
  }

  return null;
}
```

**Method 2: Reality Tears**:
```typescript
// Rare environmental hazard: Reality Tear
// Space-time is damaged, quantum foam leaks through
function harvestFromRealityTear(tear: Entity, harvester: Entity): ItemInstance {
  return {
    id: generateId(),
    itemId: 'material:quantum_foam',
    quantity: Math.floor(Math.random() * 3) + 1,
    metadata: {
      stabilityLevel: 0.2, // Extremely unstable
      collapseTimer: 100,
      quantumState: 'superposed',
    },
  };
}
```

**Method 3: Deep Space Anomalies**:
```typescript
// Special realm/location: Deep Space
// Quantum fluctuations common, foam naturally occurs
realmWeights: {
  'deep_space': 0.6,      // Moderate spawn rate
  'quantum_realm': 0.9,    // Very common
  'void_realm': 0.3,       // Some quantum effects
}
```

### Using Quantum Foam for Scale Manipulation

**Shrinking Potion**:
```typescript
defineItem('potion:shrinking', 'Potion of Shrinking', 'consumable', {
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 2 },
    { itemId: 'water', amount: 1 },
    { itemId: 'material:compressed_dimensions', amount: 1 }, // Optional material
  ],
  metadata: {
    scaleMultiplier: 0.1, // Shrink to 10% size
    duration: 600,         // 30 seconds at 20 TPS
  },
});

function consumeShrinkingPotion(potion: ItemInstance, consumer: Entity) {
  const scale = consumer.getComponent('scale') as ScaleComponent;
  const multiplier = potion.metadata.scaleMultiplier as number;
  const duration = potion.metadata.duration as number;

  scale.targetScale = scale.scale * multiplier;

  // Schedule revert after duration
  scheduleEvent(world, duration, () => {
    scale.targetScale = scale.baseScale;
  });

  console.log(`${consumer.name} shrunk to ${(multiplier * 100).toFixed(0)}% size`);
}
```

**Enlarging Potion**:
```typescript
defineItem('potion:enlarging', 'Potion of Enlarging', 'consumable', {
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 2 },
    { itemId: 'water', amount: 1 },
  ],
  metadata: {
    scaleMultiplier: 10.0, // Enlarge to 1000% size
    duration: 600,
  },
});
```

### Gameplay: Micro-Universes

**Shrink to Planck Scale** → Enter micro-universes:

```typescript
// When entity shrinks below threshold (scale < 0.001)
function checkMicroUniverseEntry(entity: Entity, world: World) {
  const scale = entity.getComponent('scale') as ScaleComponent;

  if (scale.scale < 0.001) {
    // Entity is now at quantum scale
    // Transition to micro-universe realm
    const microUniverse = findOrCreateMicroUniverse(world);
    transitionToRealm(entity, microUniverse);

    console.log(`${entity.name} entered micro-universe at Planck scale`);
  }
}

// Micro-universe is a special realm
// - Physics different (quantum effects dominate)
// - Different creatures (quantum entities)
// - Different resources (pure energy, quantum particles)
```

**Enlarge to Titan Scale** → Become giant:

```typescript
// When entity enlarges above threshold (scale > 50.0)
function checkTitanScaleEffects(entity: Entity) {
  const scale = entity.getComponent('scale') as ScaleComponent;

  if (scale.scale > 50.0) {
    // Entity is now titan-sized
    // - Can step over buildings
    // - Massive collision damage
    // - Slow movement (due to mass increase)
    // - Can be seen from far away
  }
}
```

### Ecological Integration

**DietPattern: quantum_sustenance** (UN-DEPRECATE, SCALE VARIANT):
```typescript
'quantum_sustenance': {
  name: 'Quantum Sustenance',
  primarySource: 'quantum_foam',
  processingMethod: 'Consuming space-time fluctuations',
  efficiency: 'excellent',
  byproducts: ['planck_dust', 'dimensional_fragments'],
  flavorText: 'Feeds on quantum foam and spatial uncertainty',

  relatedItems: ['material:quantum_foam', 'material:stabilized_quantum_foam'],
  ecologicalWeight: 0.05, // Very rare
  realmWeights: {
    'quantum_realm': 0.8,    // Common in quantum realm
    'deep_space': 0.4,        // Some in deep space
    'void_realm': 0.2,        // Rare in void
  },
  deprecated: false, // UN-DEPRECATED!
}
```

**Creatures**:
- **Quantum Mites**: Microscopic creatures, eat quantum foam, shrink/enlarge randomly
- **Planck Worms**: Live at quantum scale, can only be seen when shrunk
- **Dimensional Shifters**: Use scale manipulation to access micro-universes

---

## System 2: Probability Chaos

### Core Concept

**Quantum foam amplifies uncertainty** → random outcomes become chaotic and extreme.

Different from **Condensed Probability** (controlled luck/fate):
- Condensed Probability: Predictable bias (-1 to +1), stable
- Quantum Foam Chaos: Unpredictable, extreme outcomes, unstable

### New Components

```typescript
/**
 * QuantumChaosComponent - Tracks probability chaos effects
 */
export interface QuantumChaosComponent {
  type: 'quantum_chaos';
  version: number;

  /** Chaos level (0.0-1.0) - how chaotic probability is */
  chaosLevel: number;

  /** Affects all random rolls for this entity */
  affectsAllRolls: boolean;

  /** Random event chance multiplier (2.0 = twice as likely) */
  eventMultiplier: number;

  /** Outcome variance (0.0-1.0) - 0 = normal variance, 1.0 = extreme variance */
  outcomeVariance: number;

  /** Duration (ticks remaining) */
  duration: number;

  /** Whether chaos can cause critical failures/successes */
  allowsCriticals: boolean;
}
```

### New System: QuantumChaosSystem

```typescript
export class QuantumChaosSystem implements System {
  readonly id: SystemId = 'quantum_chaos_system';
  readonly priority: number = 5; // Early, before other systems roll dice
  readonly requiredComponents = ['quantum_chaos'] as const;

  execute(world: World): void {
    const entities = world.query()
      .with(CT.QuantumChaos)
      .executeEntities();

    for (const entity of entities) {
      const chaos = entity.getComponent('quantum_chaos') as QuantumChaosComponent;

      // Decrement duration
      chaos.duration--;
      if (chaos.duration <= 0) {
        entity.removeComponent('quantum_chaos');
        continue;
      }

      // Random chaotic events
      if (chaos.eventMultiplier > 1.0) {
        this.triggerRandomEvents(entity, world, chaos);
      }
    }
  }

  private triggerRandomEvents(entity: Entity, world: World, chaos: QuantumChaosComponent): void {
    // Base random event chance: 0.1% per tick
    const baseChance = 0.001;
    const chaoticChance = baseChance * chaos.eventMultiplier;

    if (Math.random() < chaoticChance) {
      // Random chaotic event
      const events = [
        'spontaneous_teleport',
        'duplicate_item',
        'lose_item',
        'mood_swing',
        'health_fluctuation',
        'speed_burst',
        'reverse_gravity',
      ];

      const event = events[Math.floor(Math.random() * events.length)];
      this.applyChaoticEvent(entity, world, event);
    }
  }

  private applyChaoticEvent(entity: Entity, world: World, event: string): void {
    switch (event) {
      case 'spontaneous_teleport':
        // Teleport to random location
        const pos = entity.getComponent('position') as PositionComponent;
        pos.x = Math.floor(Math.random() * 100);
        pos.y = Math.floor(Math.random() * 100);
        break;

      case 'duplicate_item':
        // Random item in inventory duplicates
        const inv = entity.getComponent('inventory') as InventoryComponent;
        if (inv.items.length > 0) {
          const item = inv.items[Math.floor(Math.random() * inv.items.length)];
          item.quantity *= 2;
        }
        break;

      // ... more chaotic events
    }

    console.log(`[Quantum Chaos] ${entity.name} experienced: ${event}`);
  }

  /**
   * Modify random roll with chaos
   * Called by other systems when they roll dice
   */
  static applyChaoticRoll(baseRoll: number, chaos: QuantumChaosComponent): number {
    if (!chaos.affectsAllRolls) return baseRoll;

    // Add extreme variance
    const variance = (Math.random() - 0.5) * 2 * chaos.outcomeVariance;
    let roll = baseRoll + variance;

    // Critical failures/successes
    if (chaos.allowsCriticals) {
      if (Math.random() < 0.05 * chaos.chaosLevel) {
        // Critical failure
        roll = 0.0;
      } else if (Math.random() < 0.05 * chaos.chaosLevel) {
        // Critical success
        roll = 1.0;
      }
    }

    return Math.max(0, Math.min(1, roll));
  }
}
```

### Using Quantum Foam for Probability Chaos

**Chaos Potion**:
```typescript
defineItem('potion:chaos', 'Potion of Quantum Chaos', 'consumable', {
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 3 },
    { itemId: 'material:condensed_probability', amount: 1 },
  ],
  metadata: {
    chaosLevel: 0.8,
    duration: 1200, // 60 seconds
  },
});

function consumeChaosPotion(potion: ItemInstance, consumer: Entity) {
  const chaosLevel = potion.metadata.chaosLevel as number;
  const duration = potion.metadata.duration as number;

  consumer.addComponent({
    type: 'quantum_chaos',
    version: 1,
    chaosLevel,
    affectsAllRolls: true,
    eventMultiplier: 3.0, // 3x random event chance
    outcomeVariance: chaosLevel,
    duration,
    allowsCriticals: true,
  });

  console.log(`${consumer.name} is now affected by quantum chaos!`);
}
```

**Chaos Weapon**:
```typescript
// Weapon that causes chaotic damage (random between 0 and 2x normal)
defineItem('weapon:chaos_blade', 'Chaos Blade', 'equipment', {
  craftedFrom: [
    { itemId: 'material:forged_steel', amount: 2 },
    { itemId: 'material:quantum_foam', amount: 5 },
  ],
  traits: {
    weapon: {
      baseDamage: 50,
      damageType: 'chaotic',
      // Damage rolls with extreme variance
    },
  },
  metadata: {
    chaoticDamage: true,
    varianceMultiplier: 2.0,
  },
});
```

### Harvesting Quantum Foam (Chaos Type)

**Method 1: Probability Storms**:
```typescript
// Environmental event: Probability Storm
// RNG goes wild, quantum foam materializes from chaotic outcomes
function harvestFromProbabilityStorm(storm: Entity): ItemInstance {
  return {
    id: generateId(),
    itemId: 'material:quantum_foam',
    quantity: Math.floor(Math.random() * 5) + 1,
    metadata: {
      stabilityLevel: 0.1, // Very chaotic
      collapseTimer: 150,
      quantumState: 'chaotic',
    },
  };
}
```

**Method 2: Chaos Generators**:
```typescript
// Building: Chaos Generator
// Uses RNG to create quantum uncertainty
function chaosGeneratorProduction(generator: Entity): ItemInstance | null {
  // Chaotic production - random yield
  if (Math.random() < 0.05) {
    const yield = Math.floor(Math.random() * 10); // 0-9 foam

    return {
      id: generateId(),
      itemId: 'material:quantum_foam',
      quantity: yield,
      metadata: {
        stabilityLevel: 0.3,
        collapseTimer: 300,
        quantumState: 'chaotic',
      },
    };
  }

  return null;
}
```

### Ecological Integration

**Realm: Probability Realm**:
- Quantum foam spawns from chaotic outcomes
- Reality constantly shifting
- RNG-based creatures thrive

**Creatures**:
- **Chaos Elementals**: Feed on quantum chaos, cause random events
- **Luck Parasites**: Absorb probability, emit quantum foam
- **Uncertainty Beasts**: Damage varies wildly, unpredictable

---

## System 3: Superposition

### Core Concept

**Quantum foam enables superposition** → entities exist in multiple states/locations until observed.

Inspired by Schrödinger's cat: entity is in **superposition** of multiple states until "measured" (observed, interacted with).

### New Components

```typescript
/**
 * SuperpositionComponent - Entity exists in multiple states simultaneously
 */
export interface SuperpositionComponent {
  type: 'superposition';
  version: number;

  /** Array of possible states (positions, health values, etc.) */
  states: QuantumState[];

  /** Whether entity is currently superposed (true) or collapsed (false) */
  isSuperposed: boolean;

  /** Observers who have "measured" this entity */
  observers: Set<string>; // Entity IDs

  /** Collapse probability when observed (0.0-1.0) */
  collapseChance: number;

  /** Duration of superposition (ticks) - 0 means permanent until observed */
  duration: number;

  /** Whether to show "ghost" copies visually */
  showGhosts: boolean;

  /** Maximum number of simultaneous states */
  maxStates: number;
}

export interface QuantumState {
  /** State ID */
  id: string;

  /** Probability of this state (0.0-1.0, all states sum to 1.0) */
  probability: number;

  /** Position in this state */
  position?: { x: number; y: number };

  /** Health in this state */
  health?: number;

  /** Inventory in this state */
  inventory?: ItemInstance[];

  /** Any other component states */
  componentStates?: Map<string, any>;
}
```

### New System: SuperpositionSystem

```typescript
export class SuperpositionSystem implements System {
  readonly id: SystemId = 'superposition_system';
  readonly priority: number = 10;
  readonly requiredComponents = ['superposition'] as const;

  execute(world: World): void {
    const entities = world.query()
      .with(CT.Superposition)
      .executeEntities();

    for (const entity of entities) {
      const superpos = entity.getComponent('superposition') as SuperpositionComponent;

      // Decrement duration
      if (superpos.duration > 0) {
        superpos.duration--;
        if (superpos.duration === 0) {
          // Force collapse
          this.collapseWavefunction(entity, superpos, world);
        }
      }

      // Check for observers
      if (superpos.isSuperposed) {
        this.checkForObservers(entity, superpos, world);
      }
    }
  }

  private checkForObservers(entity: Entity, superpos: SuperpositionComponent, world: World): void {
    const pos = entity.getComponent('position') as PositionComponent;

    // Find nearby entities with vision
    const nearbyEntities = world.query()
      .with(CT.Position)
      .with(CT.Vision) // Assuming vision component exists
      .executeEntities();

    for (const observer of nearbyEntities) {
      if (observer.id === entity.id) continue;

      const observerPos = observer.getComponent('position') as PositionComponent;
      const distance = Math.sqrt(
        Math.pow(pos.x - observerPos.x, 2) + Math.pow(pos.y - observerPos.y, 2)
      );

      // If observer can see entity
      const vision = observer.getComponent('vision') as VisionComponent;
      if (distance <= vision.range) {
        // Observer is measuring the entity
        superpos.observers.add(observer.id);

        // Chance to collapse wavefunction
        if (Math.random() < superpos.collapseChance) {
          this.collapseWavefunction(entity, superpos, world);
          console.log(`[Superposition] ${entity.name} observed by ${observer.name}, collapsed!`);
          break;
        }
      }
    }
  }

  private collapseWavefunction(entity: Entity, superpos: SuperpositionComponent, world: World): void {
    if (!superpos.isSuperposed) return;

    // Choose one state based on probabilities
    const roll = Math.random();
    let cumulativeProbability = 0;
    let chosenState: QuantumState | null = null;

    for (const state of superpos.states) {
      cumulativeProbability += state.probability;
      if (roll <= cumulativeProbability) {
        chosenState = state;
        break;
      }
    }

    if (!chosenState) {
      chosenState = superpos.states[superpos.states.length - 1]!;
    }

    // Apply chosen state to entity
    if (chosenState.position) {
      const pos = entity.getComponent('position') as PositionComponent;
      pos.x = chosenState.position.x;
      pos.y = chosenState.position.y;
    }

    if (chosenState.health !== undefined) {
      const health = entity.getComponent('health') as HealthComponent;
      health.current = chosenState.health;
    }

    // ... apply other component states

    superpos.isSuperposed = false;
    superpos.states = [chosenState]; // Only one state remains

    console.log(`[Superposition] Wavefunction collapsed to state ${chosenState.id}`);
  }

  /**
   * Create superposition - entity splits into multiple quantum states
   */
  static createSuperposition(entity: Entity, numStates: number): void {
    const currentPos = entity.getComponent('position') as PositionComponent;
    const currentHealth = entity.getComponent('health') as HealthComponent;

    const states: QuantumState[] = [];

    for (let i = 0; i < numStates; i++) {
      states.push({
        id: `state_${i}`,
        probability: 1.0 / numStates, // Equal probability
        position: {
          x: currentPos.x + (Math.random() - 0.5) * 10, // Random offset
          y: currentPos.y + (Math.random() - 0.5) * 10,
        },
        health: currentHealth.current + (Math.random() - 0.5) * 20,
      });
    }

    entity.addComponent({
      type: 'superposition',
      version: 1,
      states,
      isSuperposed: true,
      observers: new Set(),
      collapseChance: 0.5, // 50% chance to collapse when observed
      duration: 0, // Permanent until observed
      showGhosts: true,
      maxStates: numStates,
    });
  }
}
```

### Using Quantum Foam for Superposition

**Superposition Potion**:
```typescript
defineItem('potion:superposition', 'Potion of Superposition', 'consumable', {
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 5 },
    { itemId: 'material:mana_crystal', amount: 2 },
  ],
  metadata: {
    numStates: 3, // Split into 3 quantum states
    duration: 600, // 30 seconds
  },
});

function consumeSuperpositionPotion(potion: ItemInstance, consumer: Entity) {
  const numStates = potion.metadata.numStates as number;
  const duration = potion.metadata.duration as number;

  SuperpositionSystem.createSuperposition(consumer, numStates);

  const superpos = consumer.getComponent('superposition') as SuperpositionComponent;
  superpos.duration = duration;

  console.log(`${consumer.name} entered superposition with ${numStates} states!`);
}
```

**Superposition Teleport**:
```typescript
// Travel through multiple locations simultaneously, collapse at destination
function superpositionTeleport(entity: Entity, destinations: Position[]) {
  const states: QuantumState[] = destinations.map((pos, i) => ({
    id: `destination_${i}`,
    probability: 1.0 / destinations.length,
    position: pos,
  }));

  entity.addComponent({
    type: 'superposition',
    version: 1,
    states,
    isSuperposed: true,
    observers: new Set(),
    collapseChance: 0.8, // High chance to collapse when observed
    duration: 100, // Collapses after 5 seconds if not observed
    showGhosts: true,
    maxStates: destinations.length,
  });

  // When collapsed, entity appears at one destination
}
```

### Harvesting Quantum Foam (Superposition Type)

**Method 1: Wavefunction Collapse**:
```typescript
// When superposed entity collapses, quantum foam is released
function onWavefunctionCollapse(entity: Entity): ItemInstance {
  const superpos = entity.getComponent('superposition') as SuperpositionComponent;
  const numStates = superpos.states.length;

  // More states = more quantum foam
  return {
    id: generateId(),
    itemId: 'material:quantum_foam',
    quantity: numStates - 1, // Extra states become foam
    metadata: {
      stabilityLevel: 0.4,
      collapseTimer: 200,
      quantumState: 'collapsed',
    },
  };
}
```

**Method 2: Schrodinger Boxes**:
```typescript
// Building: Schrodinger Box
// Contains entity in superposition, generates quantum foam when opened
defineItem('building:schrodinger_box', 'Schrodinger Box', 'misc', {
  metadata: {
    containedEntity?: string, // Entity ID
    statesPossible: number,   // How many states
  },
});

function openSchrodingerBox(box: ItemInstance): ItemInstance {
  // Collapse entity inside, release quantum foam
  return {
    id: generateId(),
    itemId: 'material:quantum_foam',
    quantity: (box.metadata.statesPossible as number) ?? 2,
    metadata: {
      stabilityLevel: 0.5,
      collapseTimer: 300,
      quantumState: 'superposed',
    },
  };
}
```

### Ecological Integration

**Realm: Quantum Realm**:
- All entities naturally superposed
- Observation is difficult (high collapse resistance)
- Quantum foam abundant from constant collapse/superposition

**Creatures**:
- **Quantum Cats**: Schrodinger's cat as a creature, always superposed
- **Observer Wraiths**: Collapse other entities by observing them
- **Probability Ghosts**: Exist in superposition permanently

---

## Integration: Three Systems Working Together

### Unified Quantum Mechanics

All three systems use **quantum foam** but in different ways:

```typescript
// When consuming raw quantum foam, random effect occurs
function consumeQuantumFoam(foam: ItemInstance, consumer: Entity) {
  const stabilityLevel = foam.metadata.stabilityLevel as number;

  // Unstable foam → random quantum effect
  if (stabilityLevel < 0.5) {
    const effects = [
      'scale_random',      // Random shrink/enlarge
      'chaos_burst',       // Apply quantum chaos
      'superpose_self',    // Enter superposition
    ];

    const effect = effects[Math.floor(Math.random() * effects.length)];
    applyQuantumEffect(consumer, effect);
  } else {
    // Stable foam → choose effect
    // Crafted into specific potions/items
  }
}

function applyQuantumEffect(entity: Entity, effect: string) {
  switch (effect) {
    case 'scale_random':
      const scale = entity.getComponent('scale') as ScaleComponent;
      scale.targetScale = Math.random() * 10; // 0-10x size
      break;

    case 'chaos_burst':
      entity.addComponent({
        type: 'quantum_chaos',
        version: 1,
        chaosLevel: 0.9,
        affectsAllRolls: true,
        eventMultiplier: 5.0,
        outcomeVariance: 0.9,
        duration: 200,
        allowsCriticals: true,
      });
      break;

    case 'superpose_self':
      SuperpositionSystem.createSuperposition(entity, 2);
      break;
  }
}
```

### Realm: Quantum Realm

**The Quantum Realm** enables all three mechanics:

```typescript
const QUANTUM_REALM: RealmDefinition = {
  id: 'quantum_realm',
  name: 'Quantum Realm',
  description: 'Space-time at the Planck scale. Reality is uncertain, entities superposed, scale fluctuates.',

  // Environmental properties
  properties: {
    // All entities auto-scale randomly
    autoScaleVariance: 0.5, // Scale randomly varies +/- 50%

    // All random rolls have chaos applied
    baseChaosFactor: 0.6,

    // All entities naturally superposed
    defaultSuperpositionStates: 2,

    // Quantum foam spawns naturally
    quantumFoamSpawnRate: 0.05, // 5% per tick per chunk
  },

  // Material spawn rates
  materials: {
    'material:quantum_foam': 0.9,              // Very common
    'material:stabilized_quantum_foam': 0.3,   // Uncommon
    'material:condensed_probability': 0.6,     // Common (chaos generates probability)
  },

  // Creatures
  ecology: {
    'quantum_sustenance': 0.8,     // Common diet
    'probability_metabolizer': 0.6, // Common diet
  },
};
```

### Crafting Synergies

**Quantum Amplifier**:
```typescript
// Enhances all quantum effects
defineItem('device:quantum_amplifier', 'Quantum Amplifier', 'misc', {
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 10 },
    { itemId: 'material:mana_crystal', amount: 5 },
    { itemId: 'material:resonant_crystal', amount: 3 },
  ],
  metadata: {
    scaleAmplification: 2.0,        // Scale changes 2x as much
    chaosAmplification: 1.5,         // Chaos 1.5x stronger
    superpositionStatesBonus: 2,     // +2 extra states
  },
});
```

**Quantum Stabilizer**:
```typescript
// Prevents unwanted quantum effects
defineItem('device:quantum_stabilizer', 'Quantum Stabilizer', 'misc', {
  craftedFrom: [
    { itemId: 'material:stabilized_quantum_foam', amount: 5 },
    { itemId: 'material:mana_crystal', amount: 3 },
  ],
  metadata: {
    preventScale: true,              // Prevents scale changes
    reduceChaos: 0.5,                 // Halves chaos effects
    preventSuperposition: true,       // Prevents superposition
  },
});
```

---

## Diet Pattern: quantum_sustenance (UN-DEPRECATED)

```typescript
'quantum_sustenance': {
  name: 'Quantum Sustenance',
  primarySource: 'quantum_foam',
  processingMethod: 'Consuming space-time fluctuations and quantum uncertainty',
  efficiency: 'excellent',
  byproducts: ['planck_dust', 'dimensional_fragments', 'probability_residue'],
  flavorText: 'Feeds on the fabric of reality itself at the quantum level',

  relatedItems: [
    'material:quantum_foam',
    'material:stabilized_quantum_foam',
  ],

  ecologicalWeight: 0.05, // Very rare normally
  realmWeights: {
    'quantum_realm': 0.8,     // Common in quantum realm
    'deep_space': 0.4,         // Some in deep space anomalies
    'void_realm': 0.2,         // Rare in void
    'probability_realm': 0.5,  // Moderate in probability realm
  },

  deprecated: false, // UN-DEPRECATED!
}
```

---

## Summary: Three Quantum Systems

### 1. Scale Manipulation
- **Effect**: Shrink/enlarge entities
- **Component**: ScaleComponent
- **System**: ScaleSystem
- **Gameplay**: Micro-universes, titan mode, shrink through cracks
- **Harvesting**: Quantum labs, reality tears, deep space

### 2. Probability Chaos
- **Effect**: Random outcomes become extreme and unpredictable
- **Component**: QuantumChaosComponent
- **System**: QuantumChaosSystem
- **Gameplay**: Chaotic combat, random events, extreme variance
- **Harvesting**: Probability storms, chaos generators

### 3. Superposition
- **Effect**: Exist in multiple states/locations until observed
- **Component**: SuperpositionComponent
- **System**: SuperpositionSystem
- **Gameplay**: Quantum teleport, Schrodinger's entities, observer mechanics
- **Harvesting**: Wavefunction collapse, Schrodinger boxes

### All Three Share
- **Material**: Quantum Foam (legendary rarity, unstable)
- **Realm**: Quantum Realm (all three mechanics active)
- **Diet**: quantum_sustenance (0.8 weight in quantum realm)
- **Philosophy**: Reality is uncertain at Planck scale

---

## Implementation Priority

### Phase 1: Core Components
1. Create ScaleComponent, QuantumChaosComponent, SuperpositionComponent
2. Create ScaleSystem, QuantumChaosSystem, SuperpositionSystem
3. Add quantum foam item definitions

### Phase 2: Basic Mechanics
4. Implement scale manipulation (shrink/enlarge)
5. Implement probability chaos (random events, variance)
6. Implement superposition (multiple states, collapse)

### Phase 3: Advanced Features
7. Micro-universe realm (for extreme shrinking)
8. Quantum realm (all three mechanics active)
9. Crafting recipes (potions, amplifiers, stabilizers)

### Phase 4: Ecology & Integration
10. UN-DEPRECATE quantum_sustenance diet
11. Create quantum creatures
12. Magic system integration (quantum spells)

---

## Code Integration Points

### New Files to Create
1. `packages/core/src/components/ScaleComponent.ts`
2. `packages/core/src/components/QuantumChaosComponent.ts`
3. `packages/core/src/components/SuperpositionComponent.ts`
4. `packages/core/src/systems/ScaleSystem.ts`
5. `packages/core/src/systems/QuantumChaosSystem.ts`
6. `packages/core/src/systems/SuperpositionSystem.ts`

### Files to Modify
1. **packages/core/src/items/surrealMaterials.ts**
   - Add: Quantum Foam item definitions
   - Add: Stabilized Quantum Foam

2. **packages/core/src/types/ComponentTypes.ts**
   - Add: `'scale' | 'quantum_chaos' | 'superposition'`

3. **packages/world/src/alien-generation/creatures/DietPatterns.ts**
   - UN-DEPRECATE: `quantum_sustenance`

4. **packages/core/src/realms/** (if exists)
   - Add: Quantum Realm definition

5. **packages/core/src/systems/** (various)
   - Modify: Combat, movement, etc. to check for quantum components

---

## Testing & Validation

### Scale Manipulation Tests
1. Consume shrinking potion → scale decreases to 0.1
2. Shrink below 0.001 → enter micro-universe
3. Consume enlarging potion → scale increases to 10.0
4. Mass scales with volume (scale^3)

### Probability Chaos Tests
1. Consume chaos potion → random events increase
2. Chaotic weapon → damage varies 0-200% of base
3. Probability storm → quantum foam spawns
4. Chaos effects expire after duration

### Superposition Tests
1. Consume superposition potion → entity splits into 3 states
2. Observer sees entity → wavefunction collapses
3. Collapse → entity appears at one position
4. Unobserved superposition → remains in multiple states

### Ecological Tests
1. Quantum realm → 80% creatures have quantum_sustenance diet
2. Quantum foam spawns in quantum realm (0.9 rate)
3. Creatures can eat quantum foam
4. Diet patterns ecologically balanced

---

## Future Expansions

### Quantum Entanglement
- Pair of entities entangled via quantum foam
- Observing one collapses both
- Damage to one affects the other

### Quantum Tunneling
- Superposed entities can pass through walls
- Scale manipulation enables tunneling through matter

### Time Dilation
- Extreme scale affects time flow
- Tiny entities experience faster time
- Giant entities experience slower time

### Quantum Computing
- Buildings that use quantum superposition for computation
- Solve problems by exploring all possibilities simultaneously

---

## Conclusion

Quantum foam enables **three distinct quantum mechanics**:
1. **Scale**: Shrink/enlarge, micro-universes, titan mode
2. **Chaos**: Extreme RNG, random events, unpredictable outcomes
3. **Superposition**: Multiple states, observer mechanics, Schrodinger gameplay

Each system:
- ✅ Has clear game mechanics
- ✅ Uses quantum foam in different ways
- ✅ Has unique components and systems
- ✅ Integrates with ecology (quantum_sustenance diet)
- ✅ Enables unique gameplay

**All three can coexist** and create a rich quantum mechanics layer on top of the base game.
