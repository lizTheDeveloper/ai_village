# Surreal Materials: System Investigation & Mechanistic Design

**Date**: 2026-01-03
**Status**: ✅ Investigation Complete - Design Ready for Review
**Related Specs**:
- `openspec/specs/items-system/surreal-materials-spec.md`
- `openspec/specs/items-system/quantum-foam-spec.md`

## User Request

> "take a look at the time system and all of the other systems in the game that involve those systems because we've implemented emotions, time, thoughts, and all kinds of stuff. I want a lot of this stuff and I want to make it possible in a mechanistic way. Most of those things have systems behind them that we could use."

**Goal**: Design surreal materials that mechanistically integrate with existing game systems, not abstract concepts.

---

## Discovery: How Time Actually Works

### Critical Insight from User

> "You want to look for Multiverse Coordinator and the Multiverse Save System because that's how time works - saving files. But multiple universes and forks can interfere with each other."

> "So solidified moments or crystallized moments should allow you to travel to that existence or that moment in time and replay it or something, maybe?"

### What I Found

**Time = The Save/Load System** (MultiverseCoordinator.ts + TimelineManager.ts):

1. **TimelineManager** creates automatic periodic snapshots:
   - Early universe (0-10 min): every 1 minute
   - Mid universe (10-60 min): every 5 minutes
   - Mature universe (60+ min): every 10 minutes

2. **Canon events auto-save**:
   - Agent deaths → snapshot
   - Agent births → snapshot
   - Soul creation → snapshot
   - Time milestones (30, 90, 180, 365 days) → snapshot

3. **Each snapshot (TimelineEntry) contains**:
   ```typescript
   {
     id: string,
     universeId: string,
     tick: bigint,              // When this moment occurred
     createdAt: number,         // Real-world timestamp
     entityCount: number,
     label?: string,            // For manual saves
     isAutoSave: boolean,
     canonEventType?: string,   // 'agent:died', 'agent:born', etc.
     snapshot: UniverseSnapshot, // The actual world data
   }
   ```

4. **MultiverseCoordinator.forkUniverse() can fork from snapshots**:
   ```typescript
   await forkUniverse(
     sourceUniverseId,
     newUniverseId,
     label,
     { fromSnapshotId: snapshotId } // KEY: Fork from timeline snapshot!
   );
   ```

   This creates a parallel universe starting from that saved moment.

### Design Implication: Solidified Time = Physical Timeline Snapshots

**Each piece of Solidified Time IS a timeline snapshot**:
- Contains: snapshotId, universeId, tick, label, canonEventType
- **Consuming it** = Call `forkUniverse({ fromSnapshotId })`
- This enables **literal time travel** to saved game states

**Rarity Types**:
- **Common**: Auto-save snapshots (every 1-10 min) → `ecologicalWeight: 0.7` in temporal realm
- **Rare**: Manual save snapshots → `ecologicalWeight: 0.3`
- **Legendary**: Canon event snapshots → `ecologicalWeight: 0.1`
  - "Fragment of First Death"
  - "Crystal of Day 365"
  - "Shard of Birth"

**This UN-DEPRECATES the `temporal_feeding` diet pattern!**

---

## Discovery: Emotions Are Tracked in Detail

### MoodComponent.ts

**EmotionalState types**:
```typescript
'content' | 'joyful' | 'excited' | 'melancholic' | 'anxious' |
'nostalgic' | 'frustrated' | 'lonely' | 'proud' | 'grateful' |
'enraged' | 'despairing' | 'manic' | 'obsessed' | 'terrified'
```

**Trauma tracking**:
```typescript
type TraumaType =
  | 'death_witnessed' | 'death_of_friend' | 'injury_severe'
  | 'starvation' | 'isolation' | 'failure_public' | 'betrayal'
  | 'loss_of_home' | 'attack_survived';

interface Trauma {
  id: string;
  type: TraumaType;
  severity: number; // 0-1
  // ... more fields
}
```

### Design Implication: Crystallized Emotion = Harvestable Emotional Energy

**When agent experiences intense emotion** (intensity >= 0.8):
- Crystallize it into physical item
- Spawn item near entity

**Emotion Types Map to Crystals**:
- `joyful` → Joy Crystal (pink, warm, uncommon)
- `melancholic` → Sorrow Stone (blue, cold, uncommon)
- `enraged` → Rage Ruby (red, hot, rare)
- `anxious` → Fear Fragment (black, chilling, uncommon)

**Severe trauma** (severity >= 0.9):
- Creates **legendary** Trauma Shard
- "Shard of witnessed death"
- "Fragment of betrayal"

**Consuming emotion crystals**:
- Sets consumer's mood to that emotion
- Duration based on crystal intensity

**This UN-DEPRECATES the `emotional_vampirism` diet pattern!**

---

## Discovery: Memories Are Rich Data Structures

### EpisodicMemoryComponent.ts

**Each memory contains**:
```typescript
interface EpisodicMemory {
  readonly id: string;
  readonly eventType: string;
  readonly summary: string;
  readonly timestamp: number;
  readonly participants?: string[];
  readonly location?: { x: number; y: number };
  readonly emotionalValence: number;    // -1 to 1
  readonly emotionalIntensity: number;  // 0 to 1
  readonly surprise: number;            // 0 to 1
  readonly importance: number;          // 0 to 1
  readonly clarity: number;             // 0 to 1 (degrades over time)
  readonly consolidated: boolean;       // Becomes permanent
  readonly timesRecalled: number;
}
```

### Design Implication: Fossilized Thoughts = Extractable Memories

**When memory consolidates** (becomes permanent):
- If `importance >= 0.8` → fossilize into item
- Contains: memoryId, eventType, summary, clarity, emotional data

**When memory recalled too many times** (timesRecalled >= 10):
- Becomes unstable, fossilizes on next recall
- Degraded clarity (clarity * 0.5)
- Removed from living memory

**Reading Fossilized Thought**:
- Transfers knowledge to reader
- Consumes the thought (crumbles)

**This ENHANCES the `information_digestion` diet pattern!**

---

## Discovery: Other Systems

### PortalSystem.ts
- Manages realm transitions
- Portals have activation range (2 tiles)
- Validates portal access
- Triggers `transitionToRealm()`

**Implication**: Materials could be realm-specific resources gathered via portals

### TimeSystem.ts
- Tracks `lightLevel` (0-1 based on time of day)
- Phases: dawn, day, dusk, night
- `speedMultiplier` for time scale

**Implication**: Petrified Light harvesting during peak daylight (lightLevel >= 0.9)

### Magic System (98 files)
- DreamSkillTree.ts
- EmotionalSkillTree.ts
- DimensionalParadigms.ts
- Extensive spell cost calculators

**Implication**: Surreal materials can be spell components

---

## Materials Designed (6 Total)

### Phase 1: HIGH PRIORITY - Enable Existing Deprecated Diets

#### 1. Solidified Time
- **System**: TimelineManager + MultiverseCoordinator
- **Harvesting**: Auto-generated when snapshots created (every 1-10 min)
- **Usage**: Consume → fork universe from that moment (time travel!)
- **Rarity**: Common (auto-saves), Rare (manual saves), Legendary (canon events)
- **Ecology**: `temporal_feeding` diet, 0.8 weight in temporal realm
- **Code Integration**: Modify `TimelineManager.createSnapshot()` to spawn items

#### 2. Crystallized Emotion
- **System**: MoodComponent + EmotionalState
- **Harvesting**: Intense emotions (intensity >= 0.8) crystallize
- **Usage**: Consume → change mood to crystal's emotion
- **Types**: Joy Crystal (pink), Sorrow Stone (blue), Rage Ruby (red), Fear Fragment (black)
- **Ecology**: `emotional_vampirism` diet, 0.8 weight in emotional realm
- **Code Integration**: Add hook in MoodSystem when emotions change

#### 3. Fossilized Thoughts
- **System**: EpisodicMemoryComponent
- **Harvesting**: Important memories (importance >= 0.8) fossilize when consolidated
- **Usage**: Read → transfer knowledge, consume thought
- **Rarity**: Rare (consolidated memories are uncommon)
- **Ecology**: `information_digestion` diet, 0.8 weight in library realm
- **Code Integration**: Add hook in EpisodicMemorySystem when memories consolidate

### Phase 2: MEDIUM PRIORITY - New Ecologies

#### 4. Petrified Light
- **System**: TimeSystem lightLevel
- **Harvesting**: Capture sunlight during peak daylight (lightLevel >= 0.9)
- **Usage**: Building material for light bridges, hard-light constructs
- **Properties**: Nearly weightless (0.1), decays rapidly in darkness
- **Ecology**: NEW diet `light_consumption`, 0.8 weight in solar plains
- **Code Integration**: Add light capture mechanic, decay logic

#### 5. Condensed Probability
- **System**: RNG / Random systems
- **Harvesting**: From chaos storms, probability realms
- **Usage**: Carrying affects random outcomes (bias parameter)
- **Properties**: Dice-shaped crystals, unstable
- **Ecology**: NEW diet `probability_metabolizer`, 0.8 weight in probability realm
- **Code Integration**: Modify RNG functions to check for probability crystals

### Phase 3: MEDIUM-HIGH PRIORITY - Quantum Mechanics (FULLY SPECCED)

#### 6. Quantum Foam ⚛️
- **User Decision**: "Let's do scale manipulation and also probability chaos and also superposition."
- **System**: THREE QUANTUM SYSTEMS (see `QUANTUM_FOAM_SYSTEMS_SPEC.md`)
  1. **Scale Manipulation** (ScaleComponent + ScaleSystem)
     - Shrink/enlarge entities by collapsing spatial dimensions
     - Micro-universes at scale < 0.001
     - Titan mode at scale > 50.0
     - Mass scales with volume (scale³)
  2. **Probability Chaos** (QuantumChaosComponent + QuantumChaosSystem)
     - Extreme variance in random rolls
     - Random chaotic events (teleport, duplicate items, mood swings)
     - Different from Condensed Probability (chaos is unpredictable)
     - Critical failures/successes enabled
  3. **Superposition** (SuperpositionComponent + SuperpositionSystem)
     - Exist in multiple states/locations simultaneously
     - Ghost copies until observed
     - Wavefunction collapses when observed
     - Schrodinger's cat mechanics
- **Harvesting**: Quantum labs, reality tears, quantum realm (0.9 spawn)
- **Usage**: Shrinking potions, chaos potions, superposition potions
- **Ecology**: UN-DEPRECATES `quantum_sustenance` diet (0.8 in quantum realm)
- **Creatures**: Quantum Mites, Chaos Elementals, Quantum Cats, Observer Wraiths
- **Status**: ✅ FULLY SPECIFIED

### Phase 4: LOW PRIORITY - Requires New Systems

#### 7. Liquid Gravity
- **System**: None - needs GravitySystem first
- **Status**: Keep deprecated until gravity mechanics exist

---

## New Realms Needed

Based on surreal materials ecology:

1. **Temporal Realm**:
   - Solidified Time common (0.8)
   - Time flows at variable rates
   - Temporal creatures with `temporal_feeding` diet

2. **Emotional Realm**:
   - Crystallized Emotion common (0.8)
   - Pure emotion manifested as landscape
   - Emotion vampires abundant

3. **Library Realm** / **Knowledge Realm**:
   - Fossilized Thoughts common (0.8)
   - Ancient libraries, universities
   - Information digesters

4. **Probability Realm** / **Chaos Realm**:
   - Condensed Probability common (0.8)
   - Reality unstable, RNG wild
   - Fate-shifters live here

5. **Solar Plains** / **Light Realm**:
   - Petrified Light common (0.8)
   - Perpetual daylight
   - Photonic feeders

6. **Quantum Realm**:
   - Quantum Foam very common (0.9)
   - All three quantum systems active: Scale manipulation, Probability chaos, Superposition
   - Entities auto-scale randomly (±50% variance)
   - All random rolls have chaos applied (0.6 base chaos factor)
   - All entities naturally superposed (2 states default)
   - Quantum creatures: Quantum Mites, Chaos Elementals, Quantum Cats, Observer Wraiths

---

## Diet Pattern Updates

### UN-DEPRECATE (3 patterns)

1. **temporal_feeding**:
   ```typescript
   relatedItems: ['material:solidified_time'],
   ecologicalWeight: 0.05, // Very rare normally
   realmWeights: {
     'temporal_realm': 0.8,  // Common in temporal realm
     'celestial': 0.15,
   },
   deprecated: false, // UN-DEPRECATED!
   ```

2. **emotional_vampirism**:
   ```typescript
   relatedItems: [
     'material:joy_crystal',
     'material:sorrow_stone',
     'material:rage_ruby',
     'material:crystallized_emotion',
   ],
   ecologicalWeight: 0.1,
   realmWeights: {
     'emotional_realm': 0.8,
     'populated_areas': 0.4, // High emotion near settlements
     'dream_realm': 0.3,
   },
   deprecated: false, // UN-DEPRECATED!
   ```

3. **quantum_sustenance**:
   ```typescript
   relatedItems: ['material:quantum_foam', 'material:stabilized_quantum_foam'],
   ecologicalWeight: 0.05,
   realmWeights: {
     'quantum_realm': 0.8,
     'deep_space': 0.4,
     'void_realm': 0.2,
     'probability_realm': 0.5,
   },
   deprecated: false, // UN-DEPRECATED!
   ```

### ENHANCED (1 pattern)

**information_digestion**:
```typescript
relatedItems: [
  'material:fossilized_thought', // NEW
  'material:folded_parchment',
],
ecologicalWeight: 0.2,
realmWeights: {
  'library_realm': 0.8,
  'university_areas': 0.6,
  'ancient_ruins': 0.4,
},
```

### ADD NEW (2 patterns)

4. **light_consumption**:
   ```typescript
   name: 'Photonic Feeding',
   primarySource: 'petrified_light',
   relatedItems: ['material:petrified_light'],
   ecologicalWeight: 0.15,
   realmWeights: {
     'solar_plains': 0.8,
     'celestial': 0.6,
   },
   ```

5. **probability_metabolizer**:
   ```typescript
   name: 'Probability Metabolization',
   primarySource: 'condensed_probability',
   relatedItems: ['material:condensed_probability'],
   ecologicalWeight: 0.1,
   realmWeights: {
     'probability_realm': 0.8,
     'casinos': 0.6,
   },
   ```

---

## Code Integration Summary

### Files to Create/Modify

#### New Files
1. `custom_game_engine/packages/core/src/items/SURREAL_MATERIALS_MECHANISTIC_DESIGN.md` ✅ Created
   - Complete design specification

#### Files to Modify (Phase 1 Implementation)

1. **packages/core/src/items/surrealMaterials.ts**
   - Add: Solidified Time item definitions
   - Add: Crystallized Emotion item definitions (Joy, Sorrow, Rage, Fear)
   - Add: Fossilized Thought item definitions

2. **packages/core/src/multiverse/TimelineManager.ts**
   - Modify: `createSnapshot()` to spawn Solidified Time items
   - Add: `createSolidifiedTimeItem(entry: TimelineEntry): ItemInstance`
   - Add: `spawnItemInTemporalRealm(item: ItemInstance)`

3. **packages/core/src/systems/MoodSystem.ts** (or equivalent)
   - Add: Emotion crystallization on intense emotions (intensity >= 0.8)
   - Add: `crystallizeEmotion(entity, emotion, intensity): ItemInstance`
   - Add: Trauma crystallization on severe trauma (severity >= 0.9)

4. **packages/core/src/systems/EpisodicMemorySystem.ts** (or equivalent)
   - Add: Memory fossilization on consolidation (importance >= 0.8)
   - Add: `fossilizeMemory(entity, memory): ItemInstance`
   - Add: Memory fossilization on excessive recall (timesRecalled >= 10)

5. **packages/world/src/alien-generation/creatures/DietPatterns.ts**
   - UN-DEPRECATE: `temporal_feeding`, `emotional_vampirism`
   - UPDATE: `information_digestion` with `material:fossilized_thought`
   - ADD: `light_consumption`, `probability_metabolizer`

6. **packages/core/src/realms/** (if realm system exists)
   - Add: Temporal realm definition
   - Add: Emotional realm definition
   - Add: Library/Knowledge realm definition
   - Add: Probability/Chaos realm definition
   - Add: Solar Plains/Light realm definition

7. **packages/core/src/magic/** (spell integrations)
   - DreamSkillTree.ts: Add temporal magic (time travel spells)
   - EmotionalSkillTree.ts: Add emotion crystallization/projection spells

---

## Ecological Coherence Validation

### Before
- **quantum_sustenance**: DEPRECATED - No quantum items exist
- **temporal_feeding**: DEPRECATED - No time-based resources
- **emotional_vampirism**: DEPRECATED - No emotion resources
- **information_digestion**: Limited - Only paper items

### After
- **temporal_feeding**: UN-DEPRECATED ✅
  - Solidified Time spawns every 1-10 min (auto-saves)
  - Common in temporal realm (0.8)
  - Rare in most realms (0.05)

- **emotional_vampirism**: UN-DEPRECATED ✅
  - Crystallized Emotion spawns on intense feelings
  - Common in emotional realm (0.8)
  - Moderate in populated areas (0.4)
  - Some in dream realm (0.3)

- **information_digestion**: ENHANCED ✅
  - Fossilized Thoughts from consolidated memories
  - Common in library realm (0.8)
  - Moderate in educational areas (0.6)

- **light_consumption**: NEW ✅
  - Petrified Light from sunlight capture
  - Common in solar plains (0.8)
  - Moderate in celestial realm (0.6)

- **probability_metabolizer**: NEW ✅
  - Condensed Probability from chaos storms
  - Common in probability realm (0.8)
  - Moderate in gambling zones (0.6)

---

## Example: Solidified Time Integration

### Code Flow

1. **Timeline snapshot created** (TimelineManager.ts:292-356):
   ```typescript
   async createSnapshot(...): Promise<TimelineEntry> {
     // ... existing snapshot creation ...

     // NEW: Spawn Solidified Time item
     const solidifiedTime = createSolidifiedTimeItem(entry);
     spawnItemInTemporalRealm(solidifiedTime);

     return entry;
   }
   ```

2. **Solidified Time item created**:
   ```typescript
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

3. **Player consumes Solidified Time**:
   ```typescript
   async function useSolidifiedTime(item: ItemInstance, player: Entity, world: World) {
     const snapshotId = item.metadata.snapshotId as string;
     const currentUniverseId = getCurrentUniverseId(world);

     // Fork universe from this snapshot (MultiverseCoordinator.ts:139-222)
     const fork = await multiverseCoordinator.forkUniverse(
       currentUniverseId,
       generateForkId(),
       `Fork from ${item.customDisplayName}`,
       {
         fromSnapshotId: snapshotId, // TIME TRAVEL HAPPENS HERE
         timeScale: 1.0,
       }
     );

     // Transfer player to forked universe
     transferEntityToUniverse(player, fork.world);

     console.log(`[Time Travel] Player traveled to tick ${fork.universeTick}`);
   }
   ```

4. **Alien creatures eat Solidified Time**:
   - Alien from temporal realm has `temporal_feeding` diet
   - Diet filter weights it 0.8 in temporal realm (AlienSpeciesGenerator.ts:filterEcologicalDiets)
   - Temporal creatures spawn commonly in temporal realm
   - Ecological balance maintained

---

## Open Questions for User

### 1. Quantum Foam Design Direction

**User's note**: "I'm not sure about quantum foam; I have no idea. That might need to be like a shrinking thing or something like that, shrinking or enlarging."

**Which approach should Quantum Foam take?**

**Option A: Scale Manipulation**
- Consuming Quantum Foam shrinks/enlarges entities
- Planck scale physics → enter micro-universes
- Requires: New ScaleComponent, ScaleSystem
- Gameplay: Explore tiny worlds, shrink through cracks, enlarge to titan size

**Option B: Probability Manipulation**
- Quantum Foam makes outcomes uncertain (RNG manipulation)
- Different from Condensed Probability (more chaotic, less controlled)
- Gameplay: Random events increase, chaos effects

**Option C: Superposition State**
- Entities exist in multiple locations simultaneously
- "Ghost" copies collapse when observed
- Requires: New QuantumStateComponent
- Gameplay: Be in two places at once, quantum tunneling

**Recommendation**: Option A (Scale Manipulation) seems most distinct and interesting. Option B overlaps with Condensed Probability. Option C is complex to implement.

### 2. Realm System Architecture

**Do realm definitions already exist?**
- If yes: Where are they defined? What's the structure?
- If no: Should I design a realm system?

**Realm properties needed**:
- Realm ID, name, description
- Material spawn rates (Map<itemId, spawnWeight>)
- Creature diet weights (Map<dietId, ecologicalWeight>)
- Environmental properties (lightLevel, timeScale, etc.)

### 3. Item Spawning System

**How should items spawn in the world?**
- Automatic spawning based on realm material rates?
- Manual placement by world generator?
- Event-triggered spawning (as designed for Solidified Time)?

**For Solidified Time**:
- Should it spawn physically in world, or go directly to player inventory?
- Should there be a "temporal vortex" entity that stores Solidified Time?

---

## Next Steps

### User Review & Decisions

1. Review `SURREAL_MATERIALS_MECHANISTIC_DESIGN.md`
2. Answer Quantum Foam design question (scale? probability? superposition?)
3. Clarify realm system architecture
4. Approve Phase 1 implementation plan

### Phase 1 Implementation (If Approved)

1. **Add item definitions** (surrealMaterials.ts):
   - Solidified Time
   - Crystallized Emotion (Joy, Sorrow, Rage, Fear)
   - Fossilized Thought

2. **Add harvesting hooks**:
   - TimelineManager.createSnapshot() → spawn Solidified Time
   - MoodSystem emotion update → crystallize intense emotions
   - EpisodicMemorySystem consolidation → fossilize important memories

3. **Update diet patterns** (DietPatterns.ts):
   - UN-DEPRECATE: temporal_feeding, emotional_vampirism
   - UPDATE: information_digestion

4. **Update alien generator** (AlienSpeciesGenerator.ts):
   - No changes needed - already uses ecological filtering!
   - Automatically picks up new diet weights

5. **Add usage mechanics**:
   - Consume Solidified Time → fork universe
   - Consume Crystallized Emotion → change mood
   - Read Fossilized Thought → gain knowledge

6. **Create realm definitions** (if realm system exists):
   - Temporal realm
   - Emotional realm
   - Library realm

---

## Files Created

1. **openspec/specs/items-system/surreal-materials-spec.md** ✅
   - Complete design specification with code examples
   - Covers: Solidified Time, Crystallized Emotion, Fossilized Thoughts, Quantum Foam, Petrified Light, Condensed Probability

2. **openspec/specs/items-system/quantum-foam-spec.md** ✅
   - Detailed specification for three quantum systems
   - Scale Manipulation, Probability Chaos, Superposition

3. **devlogs/SURREAL_MATERIALS_INVESTIGATION_2026-01-03.md** ✅ (This file)
   - Investigation summary and findings

---

## Conclusion

Successfully investigated all major game systems to understand how to mechanistically integrate surreal materials:

**Key Discoveries**:
1. **Time = Save/Load system** → Solidified Time is literal timeline snapshots
2. **Emotions are tracked in detail** → Crystallized Emotion from intense feelings
3. **Memories are rich data** → Fossilized Thoughts from consolidated memories
4. **Everything has mechanical integration** → No abstract concepts

**Materials Designed**: 7 total (6 mechanistic + fully specced, 1 deferred)

**Diet Patterns Updated**:
- UN-DEPRECATED: 3 patterns (temporal_feeding, emotional_vampirism, quantum_sustenance)
- ENHANCED: 1 pattern (information_digestion)
- NEW: 2 patterns (light_consumption, probability_metabolizer)
- **Total: 6 diet patterns enabled/updated**

**Realms Needed**: 6 new realms (Temporal, Emotional, Library, Probability, Solar, Quantum)

**Ecological Coherence**: ✅ All materials tie to actual game items with proper spawn rates and realm weighting

**Ready for**: User review and implementation approval.
