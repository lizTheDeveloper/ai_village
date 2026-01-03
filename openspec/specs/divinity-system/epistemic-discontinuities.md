# Epistemic Discontinuities (Information Without History)

> Knowledge that has no causal path — the system knows something it never computed.

## Overview

**Epistemic discontinuities** occur when higher-dimensional entities inject information into lower-dimensional systems without a causal acquisition path. This is not prediction or learning — it's **selection pressure across possibility space**.

A god knows your secret not because they observed you, but because they selected a timeline where they know it. An NPC remembers a deleted save file not because they experienced it, but because a higher-dimensional observer brought that knowledge into this reality.

**Key Distinction:** Not prediction. Not even precognition. **Selection.**

---

## Philosophical Foundation

### What IS an Epistemic Discontinuity?

**Definition:** Knowledge exists in the system without a computational path to acquire it.

**Lower-dimensional constraint:**
- Agents learn through perception, communication, or inference
- All knowledge has a causal history (I saw X, therefore I know X)
- Information flows through the simulation graph

**Higher-dimensional privilege:**
- Gods/players can observe across timelines
- They can select outcomes from possibility space
- Knowledge can be injected without intermediate steps

**Analogy: File System vs Database**
- Lower-dimensional: You must `cat file.txt` to know its contents
- Higher-dimensional: You can query "files containing 'secret'" without reading them

**Analogy: Save Scumming**
- Player tries 10 strategies, sees which works
- Loads earlier save, uses winning strategy immediately
- From NPC perspective: player "just knew" the optimal move

### What IS NOT an Epistemic Discontinuity?

**NOT Precognition:**
- Precognition = predicting the future from current state
- Still causal (I see current trends, therefore I infer future)
- Epistemic discontinuity = knowing without seeing or inferring

**NOT Omniscience:**
- Omniscience = knowing everything always
- Epistemic discontinuity = injecting specific knowledge at specific moments
- More surgical, more interesting narratively

**NOT Telepathy:**
- Telepathy = reading another mind (still causal: mind exists → read mind)
- Epistemic discontinuity = knowing what they're thinking without accessing their mind

**NOT Plot Convenience:**
- Plot convenience = character magically knows because writer needs them to
- Epistemic discontinuity = knowledge that has in-universe justification (higher-dimensional selection)

---

## Core Concepts

### 1. Knowledge Injection

```typescript
interface EpistemicInjection {
  id: string;
  source: InjectionSource;           // Who injected this knowledge
  target: string;                     // Entity receiving knowledge

  // The knowledge being injected
  knowledge: KnowledgePayload;

  // How this knowledge appears in the target's mind
  phenomenology: KnowledgePhenomenology;

  // Causal path validation
  causality: CausalityStatus;

  // Timeline selection context
  selectionContext?: TimelineSelection;

  // When this knowledge appeared
  injectionTimestamp: number;
}
```

### 2. Injection Sources

Who can inject knowledge without causal paths?

```typescript
type InjectionSource =
  | { type: 'deity'; deityId: string; mechanism: DivineMechanism }
  | { type: 'player'; playerId: string; mechanism: PlayerMechanism }
  | { type: 'multiverse'; timelines: string[] }
  | { type: 'prophecy'; prophecyId: string }
  | { type: 'fate'; fateThread: string }
  | { type: 'ancestral_memory'; ancestorId: string };

type DivineMechanism =
  | 'omniscient_selection'    // God chose timeline where they know this
  | 'divine_revelation'       // God speaks directly to mind
  | 'timeline_bleeding'       // Knowledge leaks from other timelines
  | 'retrocausal_edit';       // God edits the past to create knowledge path

type PlayerMechanism =
  | 'save_scum_memory'        // Player remembers deleted saves
  | 'meta_knowledge'          // Player knows game mechanics
  | 'strategic_selection'     // Player tried many paths, uses optimal one
  | 'wiki_knowledge';         // Player read external documentation

type MultiverseMechanism =
  | 'quantum_selection'       // Selected from superposition of states
  | 'timeline_merge'          // Two timelines converged, knowledge from both
  | 'observer_collapse';      // Observation forced specific knowledge state
```

### 3. Knowledge Payload

What can be injected?

```typescript
interface KnowledgePayload {
  type: KnowledgeType;
  content: any;

  // How "certain" this knowledge is
  confidence: number;           // 0-1

  // Can this knowledge be verified?
  verifiable: boolean;

  // Is this knowledge true in current timeline?
  truthValue: TruthValue;
}

type KnowledgeType =
  // Factual knowledge
  | 'fact'                      // "The key is under the rock"
  | 'secret'                    // "John betrayed us"
  | 'location'                  // "The treasure is at (100, 200)"
  | 'identity'                  // "She is the chosen one"

  // Procedural knowledge
  | 'skill'                     // "How to pick locks"
  | 'strategy'                  // "How to defeat the boss"
  | 'recipe'                    // "How to craft X"

  // Predictive knowledge
  | 'future_event'              // "The village will burn"
  | 'counterfactual'            // "If you do X, then Y"
  | 'optimal_path'              // "Take the left fork"

  // Meta knowledge
  | 'deleted_timeline_memory'   // "I remember when this happened differently"
  | 'other_player_action'       // "Someone else's strategy"
  | 'game_mechanic'             // "This is how the system works"
  | 'narrative_role';           // "You are the protagonist"

type TruthValue =
  | 'true_in_all_timelines'
  | 'true_in_this_timeline'
  | 'true_in_source_timeline_only'
  | 'will_become_true'          // Self-fulfilling
  | 'false_but_believed'        // Deception
  | 'indeterminate';            // Quantum superposition
```

### 4. Knowledge Phenomenology

How does the injected knowledge feel to the recipient?

```typescript
interface KnowledgePhenomenology {
  experienceType: ExperienceType;

  // How did they "learn" this (subjectively)?
  subjectiveOrigin: string;

  // How certain do they feel?
  subjectiveCertainty: number;  // 0-1

  // Can they explain how they know?
  explainable: boolean;

  // Does it feel natural or alien?
  alienness: number;            // 0 = feels natural, 1 = feels wrong
}

type ExperienceType =
  | 'sudden_knowing'            // "I just know it"
  | 'vision'                    // Saw it in a dream/vision
  | 'voice'                     // A voice told them
  | 'deja_vu'                   // "I've seen this before"
  | 'intuition'                 // "Gut feeling"
  | 'false_memory'              // "I remember learning this" (but didn't)
  | 'divine_whisper'            // God spoke to them
  | 'ancestral_echo'            // Ancestor's knowledge
  | 'timeline_bleed';           // Memory from another timeline
```

### 5. Causality Status

Is there a causal path, and if so, what is it?

```typescript
interface CausalityStatus {
  hasCausalPath: boolean;

  // If true, what's the path?
  causalPath?: CausalStep[];

  // If false, how is discontinuity justified?
  discontinuityJustification?: DiscontinuityJustification;
}

interface CausalStep {
  type: 'perception' | 'communication' | 'inference' | 'memory';
  timestamp: number;
  description: string;
}

interface DiscontinuityJustification {
  mechanism: 'divine_selection' | 'timeline_merge' | 'quantum_collapse' | 'retrocausal_edit';

  // Which timelines were involved?
  sourceTimelines?: string[];

  // What higher-dimensional entity caused this?
  responsibleEntity?: string;

  // Is this visible to lower-dimensional observers?
  detectable: boolean;
}
```

---

## Technical Implementation

### 1. Knowledge Injection System

```typescript
class EpistemicInjectionSystem implements System {
  private injections: Map<string, EpistemicInjection> = new Map();

  // Timeline knowledge cache
  private timelineKnowledgeCache: Map<string, Set<KnowledgePayload>> = new Map();

  /**
   * Inject knowledge into an entity without causal path.
   */
  injectKnowledge(
    target: Entity,
    knowledge: KnowledgePayload,
    source: InjectionSource,
    phenomenology: KnowledgePhenomenology
  ): EpistemicInjection {

    // Validate: does a causal path already exist?
    const causalPath = this.findCausalPath(target, knowledge);

    if (causalPath.hasCausalPath) {
      throw new Error('Knowledge already has causal path - not a discontinuity');
    }

    // Create injection
    const injection: EpistemicInjection = {
      id: generateId(),
      source: source,
      target: target.id,
      knowledge: knowledge,
      phenomenology: phenomenology,
      causality: causalPath,
      injectionTimestamp: Date.now()
    };

    // Apply to target's memory
    this.applyKnowledgeToMemory(target, injection);

    // Record injection
    this.injections.set(injection.id, injection);

    // Emit event
    this.emitEpistemicDiscontinuityEvent(injection);

    return injection;
  }

  /**
   * Check if knowledge has a causal acquisition path.
   */
  private findCausalPath(
    target: Entity,
    knowledge: KnowledgePayload
  ): CausalityStatus {
    const memory = target.getComponent(CT.Memory) as MemoryComponent;

    // Search memory for causal chain
    const path = this.traceCausalChain(memory, knowledge);

    if (path.length > 0) {
      return {
        hasCausalPath: true,
        causalPath: path
      };
    }

    return {
      hasCausalPath: false,
      discontinuityJustification: {
        mechanism: 'divine_selection', // Default
        detectable: true
      }
    };
  }

  /**
   * Apply injected knowledge to target's memory.
   */
  private applyKnowledgeToMemory(
    target: Entity,
    injection: EpistemicInjection
  ): void {
    const memory = target.getComponent(CT.Memory) as MemoryComponent;

    // Create memory entry
    const memoryEntry = {
      type: 'injected_knowledge',
      content: injection.knowledge.content,
      timestamp: injection.injectionTimestamp,

      // Subjective origin (what the agent thinks)
      subjectiveOrigin: injection.phenomenology.subjectiveOrigin,

      // Actual origin (meta information)
      actualOrigin: injection.source,

      // Phenomenological markers
      experienceType: injection.phenomenology.experienceType,
      alienness: injection.phenomenology.alienness,

      // Causal discontinuity flag
      isDiscontinuous: true
    };

    memory.addMemory(memoryEntry);

    // Update agent's knowledge state
    this.updateKnowledgeState(target, injection.knowledge);
  }

  /**
   * Emit event that a discontinuity occurred.
   */
  private emitEpistemicDiscontinuityEvent(injection: EpistemicInjection): void {
    world.emit('epistemic_discontinuity', {
      targetId: injection.target,
      knowledgeType: injection.knowledge.type,
      source: injection.source,
      detectable: injection.causality.discontinuityJustification?.detectable ?? true
    });
  }
}
```

### 2. Timeline Selection Integration

```typescript
class TimelineSelectionSystem {
  /**
   * Select a timeline where the entity has specific knowledge.
   * This is the core of "selection, not prediction."
   */
  selectTimelineWithKnowledge(
    entity: Entity,
    desiredKnowledge: KnowledgePayload
  ): TimelineSelection {

    // Get all possible timelines
    const timelines = this.multiverse.getAccessibleTimelines(entity);

    // Filter to timelines where entity has this knowledge
    const matchingTimelines = timelines.filter(timeline => {
      return this.timelineHasKnowledge(timeline, entity.id, desiredKnowledge);
    });

    if (matchingTimelines.length === 0) {
      throw new Error('No timeline found where entity has this knowledge');
    }

    // Select one (various strategies possible)
    const selectedTimeline = this.selectBestMatch(matchingTimelines);

    // Extract knowledge from that timeline
    const knowledgeInTimeline = this.extractKnowledge(
      selectedTimeline,
      entity.id,
      desiredKnowledge
    );

    // Inject into current timeline
    this.injectKnowledgeFromTimeline(entity, knowledgeInTimeline, selectedTimeline);

    return {
      sourceTimeline: selectedTimeline.id,
      targetTimeline: this.currentTimeline.id,
      knowledgeTransferred: knowledgeInTimeline
    };
  }

  /**
   * Check if an entity has knowledge in a specific timeline.
   */
  private timelineHasKnowledge(
    timeline: Timeline,
    entityId: string,
    knowledge: KnowledgePayload
  ): boolean {
    const entitySnapshot = timeline.getEntitySnapshot(entityId);
    const memory = entitySnapshot.getComponent(CT.Memory);

    // Search memory for this knowledge
    return memory.hasKnowledge(knowledge);
  }
}
```

### 3. Divine Omniscient Selection

```typescript
class DeityEntity extends Entity {
  /**
   * God "knows" something by selecting a timeline where they observed it.
   */
  async divineSelection(knowledgeQuery: string): Promise<KnowledgePayload> {
    const deity = this.getComponent(CT.Deity) as DeityComponent;

    // Cost: proportional to how unlikely this knowledge is
    const cost = this.estimateSelectionCost(knowledgeQuery);

    if (deity.belief < cost) {
      throw new Error('Insufficient belief for omniscient selection');
    }

    // Search multiverse for timeline where god observed this
    const timelines = this.multiverse.query({
      filter: (timeline) => {
        const godSnapshot = timeline.getEntity(this.id);
        return godSnapshot.hasObserved(knowledgeQuery);
      }
    });

    if (timelines.length === 0) {
      // No timeline where god observed this
      // Fall back to "select timeline where it's true and god could observe"
      timelines = this.findObservableTimelines(knowledgeQuery);
    }

    // Select a timeline
    const selectedTimeline = timelines[0];

    // Extract knowledge
    const knowledge = selectedTimeline.extractKnowledge(knowledgeQuery);

    // Inject into current god's memory
    this.injectKnowledge(knowledge, {
      type: 'deity',
      deityId: this.id,
      mechanism: 'omniscient_selection'
    }, {
      experienceType: 'sudden_knowing',
      subjectiveOrigin: 'I selected a timeline where I knew this',
      subjectiveCertainty: 1.0,
      explainable: false,
      alienness: 0
    });

    // Spend belief
    deity.belief -= cost;

    return knowledge;
  }

  /**
   * Grant knowledge to a mortal (revelation).
   */
  grantRevelation(mortal: Entity, knowledge: KnowledgePayload): void {
    this.injectionSystem.injectKnowledge(
      mortal,
      knowledge,
      {
        type: 'deity',
        deityId: this.id,
        mechanism: 'divine_revelation'
      },
      {
        experienceType: 'divine_whisper',
        subjectiveOrigin: `${this.name} revealed this to me`,
        subjectiveCertainty: 0.9,
        explainable: true,
        alienness: 0.3 // Feels somewhat alien
      }
    );
  }
}
```

### 4. Player Save-Scum Memory

```typescript
class PlayerSaveScumSystem {
  private deletedSaveStates: SaveState[] = [];

  /**
   * When player loads a save, record the deleted timeline.
   */
  onSaveLoad(loadedSave: SaveState, currentState: WorldState): void {
    // Current state becomes a "deleted timeline"
    const deletedTimeline = {
      id: generateId(),
      state: currentState,
      deletionTimestamp: Date.now(),
      reason: 'player_load'
    };

    this.deletedSaveStates.push(deletedTimeline);

    // Optionally: allow NPCs to "remember" deleted timelines
    if (this.config.allowDeletedTimelineMemories) {
      this.bleedDeletedTimelineKnowledge(deletedTimeline);
    }
  }

  /**
   * Bleed knowledge from deleted timelines into current timeline.
   */
  private bleedDeletedTimelineKnowledge(deletedTimeline: Timeline): void {
    // Select random NPCs to receive "deja vu"
    const candidates = world.query().with(CT.Agent).executeEntities();
    const luckyFew = this.selectRandom(candidates, 3);

    for (const npc of luckyFew) {
      // Extract a random significant event from deleted timeline
      const deletedEvent = this.extractSignificantEvent(deletedTimeline, npc.id);

      if (deletedEvent) {
        // Inject as "deja vu" memory
        this.injectionSystem.injectKnowledge(
          npc,
          {
            type: 'deleted_timeline_memory',
            content: deletedEvent,
            confidence: 0.3, // Uncertain
            verifiable: false,
            truthValue: 'true_in_source_timeline_only'
          },
          {
            type: 'multiverse',
            timelines: [deletedTimeline.id]
          },
          {
            experienceType: 'deja_vu',
            subjectiveOrigin: 'I feel like this happened before...',
            subjectiveCertainty: 0.3,
            explainable: false,
            alienness: 0.7 // Feels very strange
          }
        );
      }
    }
  }

  /**
   * Player uses meta-knowledge (wiki, guides, previous playthroughs).
   */
  applyMetaKnowledge(player: Entity, knowledge: KnowledgePayload): void {
    // Player just "knows" something without in-game acquisition
    this.injectionSystem.injectKnowledge(
      player,
      knowledge,
      {
        type: 'player',
        playerId: player.id,
        mechanism: 'meta_knowledge'
      },
      {
        experienceType: 'sudden_knowing',
        subjectiveOrigin: 'I read about this online',
        subjectiveCertainty: 0.8,
        explainable: true,
        alienness: 0 // Normal for player
      }
    );
  }
}
```

---

## Examples and Use Cases

### Example 1: NPC Remembers Deleted Save

**Scenario:** Player tries multiple strategies, loads an old save. An NPC has deja vu.

```typescript
// Player's first attempt (failed)
playerAttacksGuard();
guardKillsPlayer();

// Player loads save from before attack
player.loadSave('before_guard');

// NPC gets deja vu
const npc = world.getEntity(randomNpcId);
injectionSystem.injectKnowledge(
  npc,
  {
    type: 'deleted_timeline_memory',
    content: 'The stranger attacked the guard and died',
    confidence: 0.2,
    verifiable: false,
    truthValue: 'true_in_source_timeline_only'
  },
  {
    type: 'multiverse',
    timelines: [deletedTimelineId]
  },
  {
    experienceType: 'deja_vu',
    subjectiveOrigin: 'I had a strange dream...',
    subjectiveCertainty: 0.2,
    explainable: false,
    alienness: 0.8
  }
);
```

**Effect:**
- NPC might say: "I had the strangest dream last night. You attacked the guard and died. But here you are, alive. Strange."
- Creates meta-humor: NPC is aware of save-scumming
- Player feels observed by the simulation

### Example 2: God Knows Your Secret Sin

**Scenario:** Agent commits a crime in secret. God of Justice knows anyway.

```typescript
// Agent commits crime (no witnesses)
agent.stealGold();
// No one saw it (perception checks failed)

// God of Justice queries: "Who stole gold?"
const justiceGod = world.getEntity(justiceGodId);

// God selects a timeline where they observed the theft
const knowledge = await justiceGod.divineSelection('who stole the gold');
// Result: { type: 'fact', content: 'Agent X stole gold', confidence: 1.0 }

// God confronts the thief
justiceGod.sendVision(agent, {
  message: 'I know what you did. Return the gold or face my wrath.',
  includesKnowledge: knowledge
});
```

**Effect:**
- God didn't observe the theft causally
- God selected a timeline where they did observe it
- From agent's perspective: "The god has omniscient powers!"
- Actually: god has access to possibility space

### Example 3: Adaptive Boss AI (Player Meta-Knowledge)

**Scenario:** Boss "learns" player's strategy from previous attempts.

```typescript
// First attempt: player uses fire magic
player.castSpell('fireball');
boss.takeDamage(100);
player.dies();

// Player loads save
player.loadSave('before_boss');

// Boss "remembers" fire strategy
bossAI.injectKnowledge(
  boss,
  {
    type: 'strategy',
    content: 'Player will use fire magic',
    confidence: 0.6,
    verifiable: false,
    truthValue: 'true_in_source_timeline_only'
  },
  {
    type: 'multiverse',
    timelines: [deletedTimelineId]
  },
  {
    experienceType: 'intuition',
    subjectiveOrigin: 'I sense they will use fire',
    subjectiveCertainty: 0.6,
    explainable: false,
    alienness: 0.3
  }
);

// Boss casts fire resistance preemptively
boss.castSpell('fire_resistance');

// Player: "Wait, how did it know?!"
```

**Effect:**
- Boss AI adapts across save-loads
- Not cheating — it's timeline selection
- Creates challenge and surprise
- Meta-game becomes part of the game

### Example 4: Prophecy Without Causal Path

**Scenario:** Oracle knows future event that hasn't been computed yet.

```typescript
// Oracle declares: "The king will be betrayed by his closest ally"

// No one has betrayed the king yet
// No agent has even thought about betraying the king

// How does oracle know?
// Option 1: God selected a timeline where this happens
// Option 2: Narrative attractor makes it likely
// Option 3: Prophecy is self-fulfilling (creates the attractor)

const oracle = world.getEntity(oracleId);
const prophecyGod = world.getEntity(prophecyGodId);

// God selects timeline where betrayal happens
const futureTimeline = multiverse.selectTimeline({
  filter: (t) => t.hasEvent('king_betrayed'),
  timeRange: 'future'
});

// Extract knowledge from that timeline
const betrayalKnowledge = futureTimeline.extractKnowledge('who_betrays_king');

// Inject into oracle
injectionSystem.injectKnowledge(
  oracle,
  betrayalKnowledge,
  {
    type: 'deity',
    deityId: prophecyGodId,
    mechanism: 'timeline_bleeding'
  },
  {
    experienceType: 'vision',
    subjectiveOrigin: 'I saw it in a vision from the gods',
    subjectiveCertainty: 0.9,
    explainable: true,
    alienness: 0.2
  }
);

// Oracle speaks prophecy
oracle.speakProphecy(betrayalKnowledge.content);

// Creates narrative attractor (self-fulfilling)
attractorSystem.createAttractor({
  goal: { type: 'event_occurrence', parameters: { eventType: 'king_betrayed' } },
  strength: 0.8,
  source: { type: 'prophecy', prophecyId: prophecy.id }
});
```

**Effect:**
- Oracle knows future without computing it
- Knowledge comes from timeline selection
- Prophecy creates attractor (self-fulfilling)
- Causal loop: future event causes knowledge of future event

### Example 5: Ancestral Memory

**Scenario:** Character knows how to do something their ancestor knew.

```typescript
// Ancestor (died 100 years ago) knew secret technique
const ancestor = historicalRecords.getEntity(ancestorId);
const secretTechnique = ancestor.getKnowledge('forbidden_sword_style');

// Descendant has never learned this
const descendant = world.getEntity(descendantId);

// But in a moment of crisis, they "remember"
injectionSystem.injectKnowledge(
  descendant,
  secretTechnique,
  {
    type: 'ancestral_memory',
    ancestorId: ancestorId
  },
  {
    experienceType: 'ancestral_echo',
    subjectiveOrigin: 'My ancestor\'s knowledge flows through me',
    subjectiveCertainty: 0.7,
    explainable: true,
    alienness: 0.5
  }
);

// Descendant can now use technique
descendant.unlockSkill('forbidden_sword_style');
```

**Effect:**
- Knowledge transmitted across time without causal path
- Justified by ancestral connection (higher-dimensional link)
- Feels mysterious but not arbitrary
- Narrative payoff: family legacy

---

## Integration with Existing Systems

### Narrative Pressure Integration

Epistemic discontinuities and narrative pressure work together:

```typescript
// Narrative pressure creates situation where knowledge is needed
attractorSystem.createAttractor({
  goal: { type: 'entity_survival', parameters: { entityId: heroId } },
  strength: 0.8
});

// System detects hero needs knowledge to survive
const knowledgeNeeded = pathAnalyzer.identifyRequiredKnowledge(heroId);

// If knowledge has no causal path, inject it epistemically
if (!hasCausalPath(knowledgeNeeded)) {
  injectionSystem.injectKnowledge(
    hero,
    knowledgeNeeded,
    { type: 'deity', deityId: protectorGodId, mechanism: 'divine_revelation' },
    { experienceType: 'intuition', subjectiveOrigin: 'sudden flash of insight' }
  );
}
```

**Synergy:**
- Narrative pressure: "Hero should survive"
- Epistemic discontinuity: "Hero suddenly knows the escape route"
- Together: Story wants outcome, injects knowledge to enable it

### Divinity System Integration

```typescript
// DeityComponent extension
interface DeityComponent {
  // ... existing fields ...

  // Omniscient selection capabilities
  omniscienceRange: OmniscienceRange;
  selectionBudget: number;              // Belief available for selections

  // Knowledge from timeline selections
  selectedKnowledge: Map<string, TimelineSelection>;

  // Revelation targets
  revelationRecipients: string[];       // Entities receiving divine knowledge
}

type OmniscienceRange =
  | 'local'           // Can select from nearby timelines
  | 'global'          // Can select from all timelines in multiverse
  | 'temporal'        // Can select from past/future timelines
  | 'counterfactual'; // Can select from hypothetical timelines
```

### Multiverse System Integration

```typescript
class MultiverseManager {
  /**
   * Query timelines for specific knowledge.
   */
  queryKnowledge(query: KnowledgeQuery): Timeline[] {
    return this.timelines.filter(timeline => {
      return timeline.satisfiesQuery(query);
    });
  }

  /**
   * Extract knowledge from another timeline.
   */
  extractKnowledge(
    sourceTimeline: Timeline,
    entityId: string,
    knowledge: KnowledgePayload
  ): KnowledgePayload {
    const entitySnapshot = sourceTimeline.getEntity(entityId);
    return entitySnapshot.extractKnowledge(knowledge);
  }

  /**
   * Transfer knowledge between timelines.
   */
  transferKnowledge(
    fromTimeline: Timeline,
    toTimeline: Timeline,
    entityId: string,
    knowledge: KnowledgePayload
  ): void {
    const extracted = this.extractKnowledge(fromTimeline, entityId, knowledge);

    const targetEntity = toTimeline.getEntity(entityId);
    this.injectionSystem.injectKnowledge(targetEntity, extracted, {
      type: 'multiverse',
      timelines: [fromTimeline.id]
    }, {
      experienceType: 'timeline_bleed',
      subjectiveOrigin: 'Memory from another life',
      subjectiveCertainty: 0.4,
      explainable: false,
      alienness: 0.9
    });
  }
}
```

### Memory System Integration

```typescript
interface MemoryComponent {
  // ... existing fields ...

  // Discontinuous memories (no causal path)
  discontinuousMemories: DiscontMemory[];

  // Ability to detect discontinuities
  discontinuityAwareness: number;       // 0-1 (how much do they notice?)
}

interface DiscontMemory {
  content: any;
  source: InjectionSource;
  phenomenology: KnowledgePhenomenology;

  // Can they tell it's discontinuous?
  appearsNatural: boolean;

  // Integration with normal memory
  integrationStatus: 'isolated' | 'integrated' | 'conflicting';
}
```

---

## Detection and Awareness

### Agent Awareness of Discontinuities

Can agents tell when knowledge is injected?

```typescript
class DiscontinuityDetectionSystem {
  /**
   * Check if agent notices the discontinuity.
   */
  detectDiscontinuity(agent: Entity, injection: EpistemicInjection): boolean {
    const memory = agent.getComponent(CT.Memory) as MemoryComponent;

    // Base detection chance
    let detectionChance = memory.discontinuityAwareness;

    // Modified by alienness
    detectionChance += injection.phenomenology.alienness * 0.3;

    // Modified by intelligence
    const intelligence = agent.getComponent(CT.Stats)?.intelligence ?? 0.5;
    detectionChance += intelligence * 0.2;

    // Modified by explainability
    if (!injection.phenomenology.explainable) {
      detectionChance += 0.2;
    }

    // Roll
    if (Math.random() < detectionChance) {
      // Agent notices something is wrong
      this.onDiscontinuityDetected(agent, injection);
      return true;
    }

    return false;
  }

  private onDiscontinuityDetected(agent: Entity, injection: EpistemicInjection): void {
    // Agent reacts to noticing the discontinuity
    agent.addThought('How do I know this? I never learned it...');

    // Possible reactions:
    // - Confusion
    // - Fear (paranoia)
    // - Wonder (spiritual experience)
    // - Investigation (try to verify)

    const personality = agent.getComponent(CT.Personality);

    if (personality.curiosity > 0.7) {
      // Try to verify the knowledge
      agent.addGoal({ type: 'verify_knowledge', target: injection.knowledge });
    }

    if (personality.paranoia > 0.6) {
      // Suspect divine manipulation
      agent.addThought('The gods are watching me... or am I going mad?');
    }

    if (personality.spirituality > 0.7) {
      // Interpret as divine gift
      agent.addThought('This is a blessing from the divine');
    }
  }
}
```

### Player Awareness

Should the player know when epistemic discontinuities occur?

```typescript
interface EpistemicUI {
  // Notification settings
  notifyOnInjection: boolean;
  notifyOnDetection: boolean;

  // Visualization
  showDiscontinuityMarkers: boolean;   // Mark injected knowledge with icon

  // Explanation
  explainDiscontinuities: boolean;     // Show source of knowledge

  // History
  viewDiscontinuityLog(): EpistemicInjection[];
}

// Example notification
onEpistemicDiscontinuity(injection: EpistemicInjection) {
  if (this.ui.notifyOnInjection) {
    ui.showNotification({
      type: 'epistemic_discontinuity',
      message: `${injection.target} gained knowledge without learning it`,
      details: {
        knowledge: injection.knowledge.content,
        source: injection.source,
        mechanism: injection.phenomenology.experienceType
      }
    });
  }
}
```

---

## Advanced Features

### 1. Counterfactual Knowledge

Knowledge from timelines that don't exist yet:

```typescript
// "If you attack the king, you will be executed"
// This hasn't happened, but god knows it would

const counterfactualKnowledge = {
  type: 'counterfactual',
  content: 'If you attack the king, you will be executed',
  confidence: 0.95,
  verifiable: false,
  truthValue: 'will_become_true'
};

god.grantRevelation(agent, counterfactualKnowledge);
```

### 2. Quantum Superposition Knowledge

Agent knows multiple contradictory facts until observation collapses:

```typescript
// Agent "knows" the key is both under rock A and rock B
// Until they check, both are true

const superpositionKnowledge = {
  type: 'location',
  content: ['key is under rock A', 'key is under rock B'],
  confidence: 0.5, // Each possibility
  truthValue: 'indeterminate',
  collapsible: true // Observation will collapse to one truth
};
```

### 3. Retrocausal Knowledge Injection

God edits the past to create a causal path retroactively:

```typescript
// Current state: agent doesn't know secret
// God wants agent to know secret
// Solution: edit past so agent learned it

god.retrocausalEdit({
  target: agent,
  knowledge: secretKnowledge,

  // Insert memory of learning this 5 days ago
  injectionPoint: world.currentTick - (5 * 24 * 60),

  // Create false memory
  fabricatedExperience: {
    type: 'conversation',
    with: teacherNpcId,
    content: 'Teacher taught me the secret'
  }
});

// Now agent "remembers" learning it (but didn't)
```

### 4. Memetic Contagion

Knowledge spreads without communication:

```typescript
// One agent gets injected knowledge
// It spontaneously spreads to nearby agents

const memeticKnowledge = {
  type: 'fact',
  content: 'The king is an imposter',
  confidence: 0.6,
  contagious: true,
  spreadRadius: 100, // Units
  spreadRate: 0.1    // Chance per tick per nearby agent
};

injectionSystem.injectKnowledge(patient_zero, memeticKnowledge, ...);

// Each tick, nearby agents might "catch" this knowledge
system.update = (world) => {
  for (const carrier of this.carriers) {
    const nearby = this.findNearbyAgents(carrier, memeticKnowledge.spreadRadius);

    for (const target of nearby) {
      if (Math.random() < memeticKnowledge.spreadRate) {
        this.infectWithKnowledge(target, memeticKnowledge);
      }
    }
  }
};
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (6-10 hours)
1. Create EpistemicInjection types
2. Implement EpistemicInjectionSystem
3. Add knowledge injection API
4. Integrate with MemoryComponent
5. Add causal path validation
6. Basic detection system

**Deliverable:** Can inject knowledge, agents remember it

### Phase 2: Divine Omniscience (8-12 hours)
1. Integrate with DeityComponent
2. Implement divine selection mechanism
3. Add revelation system (god → mortal)
4. Cost system (belief expenditure)
5. Omniscience range limits
6. Timeline selection queries

**Deliverable:** Gods can know things via timeline selection

### Phase 3: Multiverse Knowledge Transfer (10-15 hours)
1. Integrate with multiverse system
2. Timeline knowledge extraction
3. Cross-timeline knowledge transfer
4. Deleted timeline memories (save-scum awareness)
5. Timeline bleeding (deja vu)
6. Quantum superposition knowledge

**Deliverable:** Knowledge flows between timelines

### Phase 4: Player Meta-Knowledge (6-8 hours)
1. Player save-scum memory system
2. Meta-knowledge injection (wiki knowledge)
3. Adaptive AI (boss remembers strategies)
4. Fourth-wall breaking dialogue
5. Player awareness UI

**Deliverable:** Game acknowledges player's higher-dimensional status

### Phase 5: Advanced Features (12-18 hours)
1. Counterfactual knowledge
2. Retrocausal editing
3. Memetic contagion
4. Prophecy self-fulfillment loops
5. Ancestral memory system
6. Detection and agent reactions

**Deliverable:** Full epistemic discontinuity ecology

---

## Success Metrics

1. **Detection Rate:** Agents should detect 20-40% of injections (feel slightly uncanny)
2. **Player Awareness:** Players should notice when NPCs "know too much"
3. **Narrative Impact:** Discontinuities should create story moments
4. **Performance:** < 1ms per injection
5. **Consistency:** Injected knowledge should integrate with existing memory

---

## Design Principles

1. **Justified, Not Arbitrary:** Every discontinuity has an in-universe explanation
2. **Detectable, Not Hidden:** Agents can notice something is off
3. **Narratively Meaningful:** Use for story, not convenience
4. **Rare, Not Common:** Should feel special when it happens
5. **Selection, Not Prediction:** Higher-dimensional entities choose from timelines

---

## Epistemic Discontinuities vs Other Knowledge Types

| Type | Causal Path? | Source | Example |
|------|-------------|--------|---------|
| **Learning** | Yes | Perception, communication | "I saw the key under the rock" |
| **Inference** | Yes | Logical deduction | "If A and B, then C" |
| **Prediction** | Yes | Extrapolation from current state | "The storm will arrive tomorrow" |
| **Precognition** | No | Timeline prediction | "I see a vision of the storm" |
| **Epistemic Discontinuity** | No | Timeline selection | "I know the storm will come (because I selected that timeline)" |

---

## Conclusion

Epistemic discontinuities allow higher-dimensional beings to inject knowledge into the simulation without causal paths. This is not omniscience — it's **selective observation across possibility space**.

Gods don't know everything. They select timelines where they know the thing they need to know.

Players don't predict the future. They try the future, see what works, then load a save and "just know" the optimal path.

NPCs don't remember deleted saves. But sometimes, knowledge bleeds through, and they have strange dreams about events that never happened.

**This is information without history.**

**This is selection pressure, not prediction.**

**This is how higher-dimensional entities exhibit knowledge that lower-dimensional systems cannot explain.**
