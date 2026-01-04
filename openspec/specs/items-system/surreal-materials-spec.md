# Surreal Materials: Mechanistic Integration Design

**Date**: 2026-01-03
**Status**: Design Phase - Ready for Implementation
**Context**: User requested surreal materials that tie into existing game systems mechanistically, not abstract concepts.

## Core Philosophy

> **"I want a lot of this stuff and I want to make it possible in a mechanistic way. Most of those things have systems behind them that we could use."** - User

Every surreal material must:
1. **Tie to an existing game system** (TimelineManager, MoodComponent, EpisodicMemory, etc.)
2. **Have concrete harvesting mechanics** (not abstract)
3. **Integrate with the ecology** (creatures eat it, spawns in realms)
4. **Enable new gameplay** (time travel, emotion manipulation, memory reading)

---

## 1. Solidified Time (HIGHEST PRIORITY)

### System Integration: TimelineManager + MultiverseCoordinator

**How Time Actually Works in This Game**:
- Time is **literally the save/load system** (TimelineManager.ts)
- Every save creates a **timeline snapshot** with tick, entityCount, label
- **Canon events** (deaths, births, milestones) auto-create snapshots
- **MultiverseCoordinator.forkUniverse()** can fork from any snapshot
- This creates parallel universes that can diverge

### Solidified Time = Physical Timeline Snapshots

```typescript
// ItemDefinition for Solidified Time
defineItem('material:solidified_time', 'Solidified Time', 'material', {
  weight: 0.5,
  stackSize: 10,
  baseMaterial: 'crystallized_moment',
  rarity: 'rare', // Base rarity
  baseValue: 500,
  metadata: {
    // Each piece contains reference to a specific timeline snapshot
    snapshotId: string,      // TimelineEntry.id
    universeId: string,      // Which universe this moment came from
    tick: bigint,            // When this moment occurred
    label?: string,          // Manual save label
    canonEventType?: string, // If from canon event (death, birth, etc.)
  },
  help: {
    description: 'A crystallized moment in time. Can be shattered to travel back to this exact point and create a parallel timeline.',
    usage: 'Consume to fork universe from this checkpoint',
  }
});
```

### Harvesting Mechanics

**Automatic Generation**:
```typescript
// In TimelineManager.ts, modify createSnapshot():
async createSnapshot(...): Promise<TimelineEntry> {
  // ... existing snapshot creation ...

  // Spawn Solidified Time item in world
  const solidifiedTime = createSolidifiedTimeItem(entry);
  spawnItemInTemporalRealm(solidifiedTime);

  return entry;
}

function createSolidifiedTimeItem(entry: TimelineEntry): ItemInstance {
  // Determine rarity based on snapshot type
  let rarity: ItemRarity;
  if (entry.canonEventType) {
    rarity = 'legendary'; // Death, birth, milestone
  } else if (!entry.isAutoSave) {
    rarity = 'rare'; // Manual save
  } else {
    rarity = 'common'; // Auto-save
  }

  return {
    id: generateId(),
    itemId: 'material:solidified_time',
    quantity: 1,
    metadata: {
      snapshotId: entry.id,
      universeId: entry.universeId,
      tick: entry.tick.toString(),
      label: entry.label,
      canonEventType: entry.canonEventType,
    },
    customDisplayName: entry.canonEventType
      ? `Moment of ${entry.canonEventDescription}`
      : entry.label
        ? `Moment: ${entry.label}`
        : `Moment at Tick ${entry.tick}`,
  };
}
```

**Types of Solidified Time**:
- **Common**: Auto-save snapshots (every 1-10 minutes depending on age)
  - `ecologicalWeight: 0.7` in temporal realms
- **Rare**: Manual save snapshots (player-created checkpoints)
  - `ecologicalWeight: 0.3` in temporal realms
- **Legendary**: Canon event snapshots
  - `ecologicalWeight: 0.1` in temporal realms
  - Examples:
    - "Fragment of First Death" - when first agent died
    - "Crystal of Day 365" - year milestone
    - "Shard of Birth" - when agent was born

### Usage Mechanics

**Consuming Solidified Time = Time Travel**:
```typescript
// When player consumes/shatters Solidified Time
async function useSolidifiedTime(item: ItemInstance, player: Entity, world: World) {
  const snapshotId = item.metadata.snapshotId as string;
  const currentUniverseId = getCurrentUniverseId(world);

  // Fork universe from this snapshot
  const fork = await multiverseCoordinator.forkUniverse(
    currentUniverseId,
    generateForkId(),
    `Fork from ${item.customDisplayName}`,
    {
      fromSnapshotId: snapshotId, // KEY INTEGRATION POINT
      timeScale: 1.0,
    }
  );

  // Transfer player to forked universe
  transferEntityToUniverse(player, fork.world);

  console.log(
    `[Solidified Time] Player traveled to tick ${fork.universeTick} ` +
    `via snapshot ${snapshotId}`
  );
}
```

**Portal Creation**:
```typescript
// Crafting recipe: Create time portal
craftedFrom: [
  { itemId: 'material:solidified_time', amount: 5 },
  { itemId: 'material:mana_crystal', amount: 3 },
  { itemId: 'material:resonant_crystal', amount: 1 },
]

// Creates a permanent portal to that timeline
// Multiple players can travel through it
```

### Ecological Integration

**DietPattern: temporal_feeding** (UN-DEPRECATE):
```typescript
'temporal_feeding': {
  name: 'Temporal Feeding',
  primarySource: 'solidified_time',
  processingMethod: 'Absorbing temporal energy from crystallized moments',
  efficiency: 'good',
  byproducts: ['timeline_fragments', 'chrono_waste'],
  flavorText: 'Feeds on crystallized time itself',

  // ECOLOGICAL METADATA
  relatedItems: ['material:solidified_time'],
  ecologicalWeight: 0.05, // Very rare normally
  realmWeights: {
    'temporal_realm': 0.8,  // Common in temporal realm!
    'celestial': 0.15,       // Some time in celestial
  },
  deprecated: false, // UN-DEPRECATED!
}
```

**Realm Spawning**:
- **Temporal Realm** (NEW): Where time snapshots manifest as physical crystals
- **Celestial Realm**: Rare time crystals
- **Dream Realm**: Time behaves strangely, occasional spawns

**Creatures**:
- **Time Eaters**: Aliens with `temporal_feeding` diet, common in temporal realm
- **Chrono Scavengers**: Feed on timeline fragments

### Magic Integration

**DreamSkillTree.ts** could have temporal magic branch:
```typescript
{
  id: 'time_travel',
  name: 'Temporal Shift',
  paradigm: 'dream',
  tier: 3,
  cost: {
    mana: 100,
    items: [{ itemId: 'material:solidified_time', amount: 1 }],
  },
  effect: 'Fork universe from consumed Solidified Time',
}
```

---

## 2. Crystallized Emotion

### System Integration: MoodComponent + EmotionalState

**How Emotions Work**:
- **MoodComponent.ts** tracks EmotionalState: `joyful`, `anxious`, `melancholic`, `enraged`, `despairing`, etc.
- Each emotion has intensity and duration
- **Trauma tracking** for severe emotional events

### Crystallized Emotion = Harvestable Emotional Energy

```typescript
// Base material
defineItem('material:crystallized_emotion', 'Crystallized Emotion', 'material', {
  weight: 0.3,
  stackSize: 50,
  baseMaterial: 'emotional_crystal',
  rarity: 'uncommon',
  baseValue: 80,
  metadata: {
    emotionType: EmotionalState, // 'joyful', 'anxious', etc.
    intensity: number,            // 0.0-1.0
    source?: string,              // Entity ID that felt this emotion
  },
});

// Specific emotion types
defineItem('material:joy_crystal', 'Joy Crystal', 'material', {
  // Pink glowing crystal, warm to touch
  metadata: { emotionType: 'joyful' },
  rarity: 'uncommon',
});

defineItem('material:sorrow_stone', 'Sorrow Stone', 'material', {
  // Blue heavy stone, cold
  metadata: { emotionType: 'melancholic' },
  rarity: 'uncommon',
});

defineItem('material:rage_ruby', 'Rage Ruby', 'material', {
  // Red pulsing gem, hot
  metadata: { emotionType: 'enraged' },
  rarity: 'rare', // Rage is less common than joy/sadness
});
```

### Harvesting Mechanics

**System Hook in MoodComponent**:
```typescript
// In MoodSystem.ts or EmotionalStateSystem.ts
function updateEmotionalState(entity: Entity, newEmotion: EmotionalState, intensity: number) {
  const mood = entity.getComponent('mood') as MoodComponent;

  // ... existing mood update logic ...

  // If emotion is intense, crystallize it
  if (intensity >= 0.8) {
    const emotionCrystal = crystallizeEmotion(entity, newEmotion, intensity);
    spawnItemNearEntity(emotionCrystal, entity);

    console.log(
      `[Emotion] ${entity.name} experienced intense ${newEmotion} (${intensity}), ` +
      `crystallized into ${emotionCrystal.itemId}`
    );
  }
}

function crystallizeEmotion(
  entity: Entity,
  emotion: EmotionalState,
  intensity: number
): ItemInstance {
  // Map emotion to crystal type
  const crystalType = {
    'joyful': 'material:joy_crystal',
    'melancholic': 'material:sorrow_stone',
    'enraged': 'material:rage_ruby',
    'anxious': 'material:fear_fragment',
    // ... more mappings
  }[emotion] ?? 'material:crystallized_emotion';

  return {
    id: generateId(),
    itemId: crystalType,
    quantity: 1,
    metadata: {
      emotionType: emotion,
      intensity,
      source: entity.id,
    },
  };
}
```

**Trauma Crystallization**:
```typescript
// When agent experiences trauma
function addTrauma(entity: Entity, traumaType: TraumaType, severity: number) {
  // ... existing trauma logic ...

  // Severe trauma creates legendary emotion crystals
  if (severity >= 0.9) {
    const traumaCrystal = {
      id: generateId(),
      itemId: 'material:trauma_shard',
      quantity: 1,
      metadata: {
        traumaType,
        severity,
        source: entity.id,
      },
      customDisplayName: `Shard of ${traumaType.replace('_', ' ')}`,
    };
    spawnItemNearEntity(traumaCrystal, entity);
  }
}
```

### Usage Mechanics

**Emotion Manipulation**:
```typescript
// Consuming emotion crystals affects mood
function consumeEmotionCrystal(crystal: ItemInstance, consumer: Entity) {
  const emotionType = crystal.metadata.emotionType as EmotionalState;
  const intensity = crystal.metadata.intensity as number;

  const mood = consumer.getComponent('mood') as MoodComponent;
  setEmotionalState(mood, emotionType, intensity * 0.5);

  console.log(`${consumer.name} consumed ${crystal.itemId}, now feeling ${emotionType}`);
}
```

**Crafting with Emotions**:
```typescript
// Joy potions, rage weapons, sorrow armor
defineItem('potion:joy', 'Potion of Joy', 'consumable', {
  craftedFrom: [
    { itemId: 'material:joy_crystal', amount: 3 },
    { itemId: 'water', amount: 1 },
  ],
  // Drinking sets mood to 'joyful' for 1 hour
});
```

### Ecological Integration

**DietPattern: emotional_vampirism** (UN-DEPRECATE):
```typescript
'emotional_vampirism': {
  name: 'Emotional Vampirism',
  primarySource: 'crystallized_emotions',
  processingMethod: 'Absorbing emotional energy from crystallized feelings',
  efficiency: 'excellent',
  byproducts: ['emotional_residue'],
  flavorText: 'Feeds on the emotions of others',

  // ECOLOGICAL METADATA
  relatedItems: [
    'material:joy_crystal',
    'material:sorrow_stone',
    'material:rage_ruby',
    'material:crystallized_emotion',
  ],
  ecologicalWeight: 0.1, // Rare normally
  realmWeights: {
    'emotional_realm': 0.8,  // NEW: Emotional realm
    'populated_areas': 0.4,  // Common near settlements (high emotion)
    'dream_realm': 0.3,      // Emotions in dreams
  },
  deprecated: false, // UN-DEPRECATED!
}
```

**Realm Spawning**:
- **Emotional Realm** (NEW): Pure emotion made manifest
- **Populated Areas**: High emotion density → more crystals
- **Dream Realm**: Emotional dreams crystallize

---

## 3. Fossilized Thoughts

### System Integration: EpisodicMemoryComponent

**How Memories Work**:
- **EpisodicMemoryComponent.ts** stores event memories
- Each memory has: `timestamp`, `emotionalValence`, `emotionalIntensity`, `clarity`, `timesRecalled`
- Memories degrade over time (clarity decreases)
- Consolidated memories become permanent

### Fossilized Thoughts = Extractable Memories

```typescript
defineItem('material:fossilized_thought', 'Fossilized Thought', 'material', {
  weight: 0.4,
  stackSize: 20,
  baseMaterial: 'petrified_idea',
  rarity: 'rare',
  baseValue: 200,
  metadata: {
    memoryId: string,           // EpisodicMemory.id
    eventType: string,          // Memory event type
    summary: string,            // Memory summary
    clarity: number,            // Memory clarity (0-1)
    emotionalValence: number,   // -1 to 1
    importance: number,         // 0 to 1
  },
  help: {
    description: 'A preserved thought or memory, fossilized into physical form. Telepaths can read it.',
  }
});
```

### Harvesting Mechanics

**Memory Consolidation**:
```typescript
// In EpisodicMemorySystem.ts
function consolidateMemory(entity: Entity, memory: EpisodicMemory) {
  // ... existing consolidation logic ...

  // Important consolidated memories fossilize
  if (memory.importance >= 0.8 && memory.consolidated) {
    const fossilizedThought = {
      id: generateId(),
      itemId: 'material:fossilized_thought',
      quantity: 1,
      metadata: {
        memoryId: memory.id,
        eventType: memory.eventType,
        summary: memory.summary,
        clarity: memory.clarity,
        emotionalValence: memory.emotionalValence,
        importance: memory.importance,
      },
      customDisplayName: `Memory: ${memory.summary.substring(0, 30)}...`,
    };

    spawnItemNearEntity(fossilizedThought, entity);
  }
}
```

**Memory Recall Limit**:
```typescript
// Memories recalled too many times become unstable, fossilize on recall
if (memory.timesRecalled >= 10) {
  const degradedThought = createFossilizedThought(memory);
  degradedThought.metadata.clarity = memory.clarity * 0.5; // Degraded
  spawnItemNearEntity(degradedThought, entity);

  // Remove from living memory
  removeMemory(entity, memory.id);
}
```

### Usage Mechanics

**Reading Fossilized Thoughts**:
```typescript
// Telepaths or magic users can extract knowledge
function readFossilizedThought(thought: ItemInstance, reader: Entity): Knowledge {
  const summary = thought.metadata.summary as string;
  const eventType = thought.metadata.eventType as string;
  const clarity = thought.metadata.clarity as number;

  // Transfer knowledge to reader
  const knowledge = {
    type: eventType,
    content: summary,
    confidence: clarity,
  };

  addKnowledge(reader, knowledge);

  // Reading consumes the thought (it crumbles)
  return knowledge;
}
```

**Knowledge Transfer**:
```typescript
// Educational magic: Learn from fossilized thoughts
defineItem('scroll:knowledge_transfer', 'Scroll of Knowledge Transfer', 'consumable', {
  craftedFrom: [
    { itemId: 'material:fossilized_thought', amount: 5 },
    { itemId: 'material:folded_parchment', amount: 1 },
  ],
  // Using scroll transfers all knowledge from thoughts to reader
});
```

### Ecological Integration

**DietPattern: information_digestion** (ENHANCED):
```typescript
'information_digestion': {
  name: 'Information Digestion',
  primarySource: 'written_knowledge',
  processingMethod: 'Absorbing information from text, memories, and data',
  efficiency: 'good',
  byproducts: ['blank_pages', 'forgotten_facts'],
  flavorText: 'Feeds on knowledge and information',

  // ECOLOGICAL METADATA
  relatedItems: [
    'material:fossilized_thought',
    'material:folded_parchment',
    'book', // If books exist
  ],
  ecologicalWeight: 0.2,
  realmWeights: {
    'library_realm': 0.8,     // NEW: Knowledge realm
    'university_areas': 0.6,  // Educational zones
    'ancient_ruins': 0.4,     // Lost knowledge
  },
}
```

---

## 4. Quantum Foam ⚛️

### System Integration: THREE SYSTEMS - Scale Manipulation + Probability Chaos + Superposition

**User Decision**: "Let's do scale manipulation and also probability chaos and also superposition. I think they should all be possible."

**See**: `QUANTUM_FOAM_SYSTEMS_SPEC.md` for complete specification

### Core Concept

Quantum foam is **unstable space-time at the Planck scale**. Because it's fundamentally weird, it enables **three different quantum effects**:

1. **Scale Manipulation** (ScaleComponent + ScaleSystem)
   - Shrink/enlarge entities by collapsing spatial dimensions
   - Micro-universes at extreme shrinking (scale < 0.001)
   - Titan mode at extreme enlarging (scale > 50.0)
   - Mass scales with volume (scale³)

2. **Probability Chaos** (QuantumChaosComponent + QuantumChaosSystem)
   - Unstable outcomes, extreme variance in random rolls
   - Random chaotic events (teleportation, item duplication, mood swings)
   - Different from Condensed Probability (chaos is unpredictable, probability is controlled)
   - Critical failures/successes enabled

3. **Superposition** (SuperpositionComponent + SuperpositionSystem)
   - Exist in multiple states/locations simultaneously
   - "Ghost" copies until observed
   - Wavefunction collapses when observed → entity appears at one state
   - Schrodinger's mechanics (alive AND dead until measured)

### Item Definition

```typescript
defineItem('material:quantum_foam', 'Quantum Foam', 'material', {
  weight: 0.05, // Uncertain weight (fluctuates)
  stackSize: 5,  // Highly unstable
  baseMaterial: 'bubbling_spacetime',
  rarity: 'legendary',
  baseValue: 2000,
  metadata: {
    stabilityLevel: number,    // 0.0-1.0
    collapseTimer: number,      // Ticks until decay
    quantumState: 'superposed', // State until observed
  },
  help: {
    description: 'Bubbling space-time at the Planck scale. Exists in superposition until observed.',
    usage: 'Enables scale manipulation, probability chaos, or superposition effects',
  }
});

defineItem('material:stabilized_quantum_foam', 'Stabilized Quantum Foam', 'material', {
  weight: 0.1,
  stackSize: 20,
  rarity: 'rare',
  baseValue: 800,
  craftedFrom: [
    { itemId: 'material:quantum_foam', amount: 3 },
    { itemId: 'material:mana_crystal', amount: 1 },
  ],
});
```

### Harvesting Mechanics

**Method 1: Quantum Laboratory**:
- Requires high energy + particle accelerator
- 10% chance per 1000 energy consumed
- Produces very unstable foam (stabilityLevel < 0.5)

**Method 2: Reality Tears**:
- Environmental hazard where space-time is damaged
- Quantum foam leaks through tears
- Yields 1-3 foam per harvest

**Method 3: Realm Spawning**:
```typescript
realmWeights: {
  'quantum_realm': 0.9,    // Very common
  'deep_space': 0.6,        // Moderate
  'void_realm': 0.3,        // Rare
  'probability_realm': 0.5, // Moderate (chaos generates foam)
}
```

### Usage Examples

**Shrinking Potion**:
```typescript
craftedFrom: [
  { itemId: 'material:quantum_foam', amount: 2 },
  { itemId: 'water', amount: 1 },
]
// Shrinks to 10% size for 30 seconds
```

**Chaos Potion**:
```typescript
craftedFrom: [
  { itemId: 'material:quantum_foam', amount: 3 },
  { itemId: 'material:condensed_probability', amount: 1 },
]
// 3x random event chance, extreme variance, critical hits enabled
```

**Superposition Potion**:
```typescript
craftedFrom: [
  { itemId: 'material:quantum_foam', amount: 5 },
  { itemId: 'material:mana_crystal', amount: 2 },
]
// Split into 3 quantum states until observed
```

### Ecological Integration

**DietPattern: quantum_sustenance** (UN-DEPRECATE):
```typescript
'quantum_sustenance': {
  name: 'Quantum Sustenance',
  primarySource: 'quantum_foam',
  processingMethod: 'Consuming space-time fluctuations',
  efficiency: 'excellent',
  byproducts: ['planck_dust', 'dimensional_fragments'],
  flavorText: 'Feeds on reality itself at quantum level',

  relatedItems: ['material:quantum_foam', 'material:stabilized_quantum_foam'],
  ecologicalWeight: 0.05,
  realmWeights: {
    'quantum_realm': 0.8,
    'deep_space': 0.4,
    'void_realm': 0.2,
    'probability_realm': 0.5,
  },
  deprecated: false, // UN-DEPRECATED!
}
```

**Creatures**:
- **Quantum Mites**: Shrink/enlarge randomly, microscopic feeders
- **Chaos Elementals**: Cause random events, feed on uncertainty
- **Quantum Cats**: Schrodinger's cat as creature, permanently superposed
- **Observer Wraiths**: Collapse other entities by observing them

### Quantum Realm

**All three quantum systems active**:
- Entities auto-scale randomly (±50% variance)
- All random rolls have chaos applied (0.6 base chaos)
- All entities naturally superposed (2 states default)
- Quantum foam spawns naturally (9% spawn rate)

---

## 5. Liquid Gravity (LOW PRIORITY)

### System Integration: Needs Gravity System

**Problem**: No gravitational resources exist in game currently.

**Potential Future**:
- If GravityComponent/GravitySystem added later
- Liquid Gravity could manipulate gravity direction
- Enable floating buildings, reversed gravity zones

**Status**: Keep deprecated until gravity system exists.

---

## 6. Petrified Light

### System Integration: Light/Illumination System

**How Light Works**:
- TimeSystem has `lightLevel` (0-1 based on time of day)
- Buildings/entities may have illumination properties

### Petrified Light = Solid Light Constructs

```typescript
defineItem('material:petrified_light', 'Petrified Light', 'material', {
  weight: 0.1, // Nearly weightless
  stackSize: 100,
  baseMaterial: 'frozen_light',
  rarity: 'rare',
  baseValue: 150,
  metadata: {
    brightness: number,     // 0-1, how much light it emits
    wavelength: number,     // Color (380-750nm visible spectrum)
  },
  help: {
    description: 'Solid light beams captured and frozen. Warm to touch, glows perpetually.',
    usage: 'Building material for light bridges and hard-light constructs',
  }
});
```

### Harvesting Mechanics

**Capturing Sunlight**:
```typescript
// During peak daylight (TimeComponent.lightLevel >= 0.9)
// Special mirror arrays or magic can capture light
function captureSunlight(captureDevice: Entity, world: World): ItemInstance | null {
  const time = world.getSingleton('time') as TimeComponent;

  if (time.lightLevel >= 0.9 && time.phase === 'day') {
    return {
      id: generateId(),
      itemId: 'material:petrified_light',
      quantity: 1,
      metadata: {
        brightness: time.lightLevel,
        wavelength: 550, // Yellow sunlight
      },
    };
  }

  return null; // Can only capture during bright daylight
}
```

**Rapid Decay in Darkness**:
```typescript
// In item update system
function updatePetrifiedLight(item: ItemInstance, world: World) {
  const time = world.getSingleton('time') as TimeComponent;

  // Light decays rapidly in darkness
  if (time.lightLevel < 0.2) {
    item.metadata.brightness = (item.metadata.brightness as number) * 0.95;

    if (item.metadata.brightness < 0.1) {
      // Light has faded, item crumbles
      destroyItem(item);
    }
  }
}
```

### Ecological Integration

**DietPattern**: Photosynthesis variant:
```typescript
'light_consumption': {
  name: 'Photonic Feeding',
  primarySource: 'petrified_light',
  processingMethod: 'Absorbing solidified photons',
  efficiency: 'perfect',
  byproducts: ['shadow_fragments'],
  flavorText: 'Feeds on pure light energy',

  relatedItems: ['material:petrified_light'],
  ecologicalWeight: 0.15,
  realmWeights: {
    'solar_plains': 0.8,      // NEW: Light realm
    'celestial': 0.6,          // Heaven is bright
  },
}
```

---

## 7. Condensed Probability

### System Integration: Random Number Generation / Fate System

**Condensed Probability = RNG Manipulation**:

```typescript
defineItem('material:condensed_probability', 'Condensed Probability', 'material', {
  weight: 0.2,
  stackSize: 30,
  baseMaterial: 'probability_crystal',
  rarity: 'rare',
  baseValue: 300,
  metadata: {
    bias: number,         // -1 to 1 (negative = bad luck, positive = good luck)
    volatility: number,   // 0-1, how unstable the probability is
  },
  help: {
    description: 'Dice-shaped crystals that shift outcomes. Makes unlikely things likely.',
  }
});
```

### Harvesting Mechanics

**Chaos Storms**:
```typescript
// During chaotic events or in probability realms
function harvestFromChaosStorm(storm: Entity): ItemInstance {
  const volatility = Math.random(); // How chaotic the storm is

  return {
    id: generateId(),
    itemId: 'material:condensed_probability',
    quantity: 1,
    metadata: {
      bias: (Math.random() * 2) - 1, // Random bias
      volatility,
    },
  };
}
```

### Usage Mechanics

**Probability Manipulation**:
```typescript
// Carrying probability crystals affects random outcomes
function rollWithProbabilityBias(baseChance: number, entity: Entity): boolean {
  const inventory = entity.getComponent('inventory') as InventoryComponent;

  // Find probability crystals in inventory
  let totalBias = 0;
  for (const item of inventory.items) {
    if (item.itemId === 'material:condensed_probability') {
      totalBias += (item.metadata.bias as number) * item.quantity;
    }
  }

  // Apply bias to chance (clamped to 0-1)
  const modifiedChance = Math.max(0, Math.min(1, baseChance + (totalBias * 0.1)));

  return Math.random() < modifiedChance;
}
```

### Ecological Integration

**DietPattern: probability_metabolizer** (NEW):
```typescript
'probability_metabolizer': {
  name: 'Probability Metabolization',
  primarySource: 'condensed_probability',
  processingMethod: 'Consuming probability crystals to shift fate',
  efficiency: 'good',
  byproducts: ['entropy_dust', 'chaos_residue'],
  flavorText: 'Feeds on probability itself',

  relatedItems: ['material:condensed_probability'],
  ecologicalWeight: 0.1,
  realmWeights: {
    'probability_realm': 0.8,  // NEW: Chaos realm
    'casinos': 0.6,             // Gambling zones
  },
}
```

---

## Implementation Priority

### Phase 1: HIGH PRIORITY - Enable Existing Deprecated Diets

1. **Solidified Time** → Enables `temporal_feeding`
   - Most mechanistic (directly ties to TimelineManager)
   - Enables time travel gameplay
   - Clear integration points

2. **Crystallized Emotion** → Enables `emotional_vampirism`
   - Ties to MoodComponent (already exists)
   - Straightforward harvesting (intense emotions → crystals)
   - Enables emotion manipulation gameplay

3. **Fossilized Thoughts** → Enables `information_digestion`
   - Ties to EpisodicMemoryComponent (already exists)
   - Knowledge transfer mechanics
   - Educational gameplay

### Phase 2: MEDIUM PRIORITY - New Ecologies

4. **Petrified Light** → New diet: `light_consumption`
   - Ties to TimeSystem lightLevel
   - Creates light-based ecology

5. **Condensed Probability** → New diet: `probability_metabolizer`
   - RNG manipulation
   - Luck/fate mechanics

### Phase 3: MEDIUM-HIGH PRIORITY - Quantum Mechanics (Fully Specced)

6. **Quantum Foam** → THREE SYSTEMS (all specced in `QUANTUM_FOAM_SYSTEMS_SPEC.md`)
   - Scale Manipulation (ScaleComponent + ScaleSystem)
   - Probability Chaos (QuantumChaosComponent + QuantumChaosSystem)
   - Superposition (SuperpositionComponent + SuperpositionSystem)
   - UN-DEPRECATES: `quantum_sustenance` diet
   - Enables: Micro-universes, chaotic combat, Schrodinger mechanics

### Phase 4: LOW PRIORITY - Requires New Systems

7. **Liquid Gravity** → Needs GravitySystem
   - Defer until gravity mechanics exist

---

## Realm System Integration

### New Realms Needed

Based on surreal materials, we need:

1. **Temporal Realm**:
   - Solidified Time spawns here (common: 0.8)
   - Time flows differently (speedMultiplier varies)
   - Temporal creatures with `temporal_feeding` diet

2. **Emotional Realm**:
   - Crystallized Emotion spawns here (common: 0.8)
   - Pure emotion made manifest
   - Emotion vampires common

3. **Library Realm** / **Knowledge Realm**:
   - Fossilized Thoughts common
   - Information digesters abundant
   - Ancient libraries, universities

4. **Probability Realm** / **Chaos Realm**:
   - Condensed Probability common
   - Reality unstable, RNG wild
   - Fate-shifters live here

5. **Solar Plains** / **Light Realm**:
   - Petrified Light common
   - Perpetual daylight
   - Photonic feeders

### Existing Realm Updates

**Dream Realm**:
- Add: Crystallized Emotion (dreams are emotional)
- Add: Fossilized Thoughts (dream memories)
- Keep: Dream crystals (existing)

**Celestial Realm**:
- Add: Petrified Light (heaven is bright)
- Add: Solidified Time (time is important in heaven)

**Underworld**:
- Add: Crystallized Emotion (trauma, suffering)
- Add: Shadow essence (already exists)

---

## Magic System Integration

### DreamSkillTree Extensions

```typescript
// In DreamSkillTree.ts
{
  id: 'temporal_magic',
  name: 'Temporal Magic',
  skills: [
    {
      id: 'time_travel',
      name: 'Temporal Shift',
      cost: { mana: 100, items: [{ itemId: 'material:solidified_time', amount: 1 }] },
      effect: 'Fork universe from consumed Solidified Time',
    },
    {
      id: 'freeze_moment',
      name: 'Freeze Moment',
      cost: { mana: 50 },
      effect: 'Create manual timeline snapshot → spawn Solidified Time',
    },
  ],
},
{
  id: 'emotional_magic',
  name: 'Emotional Magic',
  skills: [
    {
      id: 'harvest_emotion',
      name: 'Crystallize Feeling',
      cost: { mana: 30 },
      effect: 'Force emotion crystallization from nearby entities',
    },
    {
      id: 'induce_emotion',
      name: 'Empathic Projection',
      cost: { items: [{ itemId: 'material:joy_crystal', amount: 1 }] },
      effect: 'Make target feel the emotion from crystal',
    },
  ],
}
```

---

## Code Integration Points

### Files to Modify

1. **packages/core/src/items/surrealMaterials.ts**
   - Add new material definitions for Solidified Time, Crystallized Emotion, etc.

2. **packages/core/src/multiverse/TimelineManager.ts**
   - Modify `createSnapshot()` to spawn Solidified Time items
   - Add `createSolidifiedTimeItem()` helper

3. **packages/core/src/systems/MoodSystem.ts** (or wherever mood is updated)
   - Add emotion crystallization on intense emotions
   - Add `crystallizeEmotion()` helper

4. **packages/core/src/systems/EpisodicMemorySystem.ts**
   - Add memory fossilization on consolidation
   - Add `fossilizeMemory()` helper

5. **packages/world/src/alien-generation/creatures/DietPatterns.ts**
   - UN-DEPRECATE: `temporal_feeding`, `emotional_vampirism`
   - UPDATE: `information_digestion` with fossilized_thought items
   - ADD: `light_consumption`, `probability_metabolizer`

6. **packages/core/src/realms/** (if realm definitions exist)
   - Add new realm definitions for Temporal, Emotional, Library, Probability, Solar realms

7. **packages/core/src/magic/** (various skill trees)
   - Add temporal magic, emotional magic skills that consume surreal materials

---

## Testing & Validation

### Ecological Coherence Tests

1. **Spawn Rate Balance**:
   - Temporal realm → 80% temporal_feeding diets
   - Emotional realm → 80% emotional_vampirism diets
   - Verify predator/prey balance maintained

2. **Item Availability**:
   - Auto-saves create common Solidified Time every 1-10 minutes
   - Intense emotions create Crystallized Emotion in populated areas
   - Consolidated memories create Fossilized Thoughts

3. **Rarity Distribution**:
   - Common items (auto-saves, basic emotions) → common creatures
   - Legendary items (canon events, trauma) → rare creatures

### Mechanical Integration Tests

1. **Time Travel**:
   - Consume Solidified Time → Fork universe successfully
   - Verify player transfers to forked timeline
   - Original universe unchanged

2. **Emotion Manipulation**:
   - Intense emotion → Crystallized Emotion spawns
   - Consume crystal → Mood changes to crystal's emotion
   - Verify MoodComponent updated correctly

3. **Memory Reading**:
   - Consolidated memory → Fossilized Thought spawns
   - Read thought → Knowledge transferred
   - Verify thought consumed after reading

---

## Summary

This design creates **6 mechanistically-integrated surreal materials** that tie directly into existing game systems:

1. **Solidified Time** = TimelineManager snapshots → Time travel via MultiverseCoordinator
2. **Crystallized Emotion** = MoodComponent intense emotions → Emotion manipulation
3. **Fossilized Thoughts** = EpisodicMemory consolidation → Knowledge transfer
4. **Quantum Foam** = THREE SYSTEMS → Scale manipulation + Probability chaos + Superposition
5. **Petrified Light** = TimeSystem lightLevel capture → Light constructs
6. **Condensed Probability** = RNG manipulation → Luck/fate shifting

Each material:
- ✅ Ties to existing system (or creates new system for quantum foam)
- ✅ Has concrete harvesting mechanics
- ✅ Integrates with ecology (creatures eat it)
- ✅ Enables new gameplay
- ✅ Spawns in specific realms

**Diet Patterns Updated**:
- ✅ UN-DEPRECATED: `temporal_feeding`, `emotional_vampirism`, `quantum_sustenance`
- ✅ ENHANCED: `information_digestion`
- ✅ NEW: `light_consumption`, `probability_metabolizer`

**Total: 6 diet patterns enabled/updated**

**Next Steps**:
1. User review & approval of designs
2. Implement Phase 1 materials (Solidified Time, Crystallized Emotion, Fossilized Thoughts)
3. Implement Phase 3 quantum systems (Scale, Chaos, Superposition)
4. Create new realm definitions (Temporal, Emotional, Library, Quantum, Probability, Solar)
5. Update alien diet patterns in DietPatterns.ts
6. Create quantum creatures and ecology
