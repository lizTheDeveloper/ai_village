# Narrative Pressure System (Outcome Attractors)

> The story wants certain things to happen — but it doesn't dictate how they happen.

## Overview

Narrative pressure is a system where **higher-dimensional beings** (gods, players, narrative forces) can create **outcome attractors** — probabilistic fields that bias the simulation toward certain end-states without controlling the path taken. This is not destiny. It's not fate. It's **global optimization leaking downward into the simulation**.

The game knows 10 different paths to "the village burns down", and through subtle probability adjustments, they all accidentally work out. Not because it's scripted, but because the narrative field gently tilts random rolls, encounter tables, and AI decisions toward that basin of attraction.

---

## Philosophical Foundation

### What Narrative Pressure IS

**Narrative pressure is outcome-oriented probability shaping:**
- A goal state is defined ("the village must face a crisis")
- The system identifies paths that could lead there
- Probability distributions are adjusted to favor those paths
- The specific sequence of events remains emergent and unpredictable

**Analogy: Thermodynamics**
- Water wants to flow downhill (attractor = low elevation)
- It doesn't care which cracks it takes (path freedom)
- Different rain patterns produce different rivers (emergence)
- But they all end up in the ocean (convergence)

**Analogy: Machine Learning**
- Loss function defines desired outcome (attractor)
- Gradient descent biases toward that outcome (pressure)
- The optimization path is not predetermined (freedom)
- Multiple local optima exist (alternative outcomes)

### What Narrative Pressure IS NOT

**NOT Determinism:**
- The outcome is not guaranteed, only made more likely
- The path to the outcome is never scripted
- Agents retain free will; their decisions are only gently biased
- Alternative outcomes remain possible (with lower probability)

**NOT Fate:**
- Fate implies inevitability. Pressure implies bias.
- A strong counter-pressure can overcome a narrative attractor
- Multiple attractors can conflict, creating narrative tension
- Agents can resist if they have strong enough motivation

**NOT Plot Armor:**
- Characters don't magically survive because "the story needs them"
- Instead, situations that would kill them become slightly less likely
- If a character dies despite pressure, the narrative adapts

---

## Core Concepts

### 1. Outcome Attractors

An **outcome attractor** is a desired state the simulation should tend toward.

```typescript
interface OutcomeAttractor {
  id: string;
  source: AttractorSource;           // Who/what created this

  // The desired end-state
  goal: OutcomeGoal;

  // How strongly this outcome is desired
  strength: number;                   // 0-1 (can exceed 1 for divine mandates)

  // How aggressively to pursue it
  urgency: number;                    // 0-1 (high urgency = faster convergence)

  // Spatial/temporal scope
  scope: AttractorScope;

  // When this attractor should fade
  decay: DecayCondition;

  // What paths are allowed to reach this outcome
  pathConstraints?: PathConstraints;

  // Current progress toward the goal
  convergence: number;                // 0-1 (how close are we?)

  // Conflicts with other attractors
  conflicts: string[];                // IDs of opposing attractors
}
```

### 2. Attractor Sources

Who/what can create outcome attractors?

```typescript
type AttractorSource =
  | { type: 'deity'; deityId: string }              // A god's will
  | { type: 'player'; playerId: string }            // Player intention
  | { type: 'storyteller'; narrativeForce: string } // Emergent story logic
  | { type: 'prophecy'; prophecyId: string }        // Self-fulfilling prophecy
  | { type: 'curse'; curseId: string }              // Magical compulsion
  | { type: 'karma'; karmaPool: string };           // Cosmic justice
```

**Deity Attractors:**
- Gods can spend belief to create attractors
- Strength proportional to belief invested
- Examples: "My chosen hero must survive", "This village must prosper"

**Player Attractors:**
- Players can mark intentions ("I want this to happen")
- Weaker than divine attractors but more precise
- Examples: "I want these two agents to meet", "I want a festival to occur"

**Storyteller Attractors:**
- The game itself can create attractors for narrative coherence
- Examples: "A crisis should happen soon", "This plot thread needs resolution"

**Prophecy Attractors:**
- Written or spoken prophecies create attractors
- Self-fulfilling: the more believed, the stronger the attractor
- Can be resisted, but resistance creates narrative tension

### 3. Outcome Goals

What states can be targeted?

```typescript
interface OutcomeGoal {
  type: GoalType;

  // Specific goal parameters
  parameters: GoalParameters;

  // How to measure convergence
  convergenceMetric: ConvergenceMetric;

  // Success condition
  successCondition: SuccessCondition;
}

type GoalType =
  // Entity states
  | 'entity_death'          // Specific entity must die
  | 'entity_survival'       // Specific entity must survive
  | 'entity_ascension'      // Entity becomes god/hero
  | 'entity_transformation' // Entity changes significantly

  // Relationship goals
  | 'relationship_formed'   // Two entities must connect
  | 'relationship_broken'   // Two entities must separate
  | 'love'                  // Romantic relationship forms
  | 'betrayal'              // Trust is violated

  // Village/collective goals
  | 'village_crisis'        // Village faces disaster
  | 'village_prosperity'    // Village thrives
  | 'village_destruction'   // Village is destroyed
  | 'village_founding'      // New village established

  // Event goals
  | 'event_occurrence'      // Specific event must happen
  | 'event_prevention'      // Specific event must not happen
  | 'discovery'             // Knowledge/item must be found
  | 'invention'             // Technology/magic must be created

  // Abstract goals
  | 'conflict_escalation'   // Tensions must rise
  | 'conflict_resolution'   // Peace must be achieved
  | 'mystery_revelation'    // Secret must be revealed
  | 'justice'               // Wrong must be righted
  | 'corruption';           // Virtue must decay
```

### 4. Probability Biasing Mechanisms

How does pressure actually affect the simulation?

```typescript
interface PressureEffect {
  // What aspect of the simulation is affected
  target: PressureTarget;

  // How strongly to bias probabilities
  bias: number;                       // -1 to +1 (negative = suppress, positive = encourage)

  // Confidence interval
  confidence: number;                 // 0-1 (how sure are we this helps?)
}

type PressureTarget =
  // Random event tables
  | { type: 'event_spawn'; eventType: string }
  | { type: 'encounter_chance'; encounterType: string }

  // AI decisions
  | { type: 'behavior_selection'; agentId: string; behavior: string }
  | { type: 'conversation_topic'; agentId: string; topic: string }
  | { type: 'decision_weight'; agentId: string; decision: string }

  // Environmental factors
  | { type: 'weather_modifier'; weatherType: string }
  | { type: 'resource_availability'; resourceType: string }

  // Social dynamics
  | { type: 'relationship_change'; relationshipId: string }
  | { type: 'opinion_shift'; agentId: string; opinion: string }

  // Combat/danger
  | { type: 'damage_modifier'; targetId: string }
  | { type: 'critical_chance'; targetId: string }
  | { type: 'escape_chance'; targetId: string };
```

---

## Technical Implementation

### 1. Attractor Field Simulation

The **NarrativePressureSystem** maintains a field of active attractors and evaluates their influence each tick.

```typescript
class NarrativePressureSystem implements System {
  private attractors: Map<string, OutcomeAttractor> = new Map();

  // Spatial grid for localized attractors
  private attractorGrid: SpatialGrid<OutcomeAttractor[]>;

  // Cache of current pressure effects
  private activePressures: Map<string, PressureEffect[]> = new Map();

  update(world: World): void {
    // 1. Evaluate convergence for each attractor
    this.evaluateConvergence(world);

    // 2. Compute pressure effects
    this.computePressureEffects(world);

    // 3. Apply decay to old attractors
    this.applyDecay(world);

    // 4. Resolve attractor conflicts
    this.resolveConflicts(world);
  }

  private evaluateConvergence(world: World): void {
    for (const attractor of this.attractors.values()) {
      const currentState = this.measureState(world, attractor.goal);
      const goalState = attractor.goal.successCondition;

      // How close are we? (0 = no progress, 1 = achieved)
      attractor.convergence = this.computeConvergence(currentState, goalState);

      if (attractor.convergence >= 1.0) {
        // Goal achieved! Trigger success event
        this.onAttractorAchieved(world, attractor);
        this.removeAttractor(attractor.id);
      }
    }
  }

  private computePressureEffects(world: World): void {
    this.activePressures.clear();

    for (const attractor of this.attractors.values()) {
      // Find paths that lead toward the goal
      const paths = this.identifyConvergentPaths(world, attractor);

      // Create pressure effects for each path
      for (const path of paths) {
        const effects = this.createPressureEffects(attractor, path);

        for (const effect of effects) {
          const key = this.getPressureKey(effect.target);
          if (!this.activePressures.has(key)) {
            this.activePressures.set(key, []);
          }
          this.activePressures.get(key)!.push(effect);
        }
      }
    }
  }

  // Public API for querying pressure
  getPressureBias(target: PressureTarget): number {
    const key = this.getPressureKey(target);
    const effects = this.activePressures.get(key) || [];

    if (effects.length === 0) return 0;

    // Combine multiple pressures (weighted by strength × confidence)
    let totalBias = 0;
    let totalWeight = 0;

    for (const effect of effects) {
      const weight = effect.confidence;
      totalBias += effect.bias * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalBias / totalWeight : 0;
  }
}
```

### 2. Integration Points

#### A. Random Event Spawning

```typescript
class RandomEventSystem implements System {
  constructor(private pressureSystem: NarrativePressureSystem) {}

  update(world: World): void {
    // Standard random event logic
    if (Math.random() < this.eventSpawnRate) {
      const eventType = this.selectEventType(world);

      // Apply narrative pressure bias
      const pressure = this.pressureSystem.getPressureBias({
        type: 'event_spawn',
        eventType: eventType
      });

      // Adjust spawn probability
      const adjustedProbability = this.applyPressureBias(
        this.baseSpawnProbability,
        pressure
      );

      if (Math.random() < adjustedProbability) {
        this.spawnEvent(world, eventType);
      }
    }
  }

  private applyPressureBias(baseProbability: number, bias: number): number {
    // bias is in [-1, 1]
    // -1 = suppress to near-zero
    // 0 = no change
    // +1 = boost significantly

    if (bias > 0) {
      // Positive bias: increase probability
      // p' = p + (1 - p) * bias
      return baseProbability + (1 - baseProbability) * bias;
    } else {
      // Negative bias: decrease probability
      // p' = p * (1 + bias)
      return baseProbability * (1 + bias);
    }
  }
}
```

#### B. AI Behavior Selection

```typescript
class AIDirector {
  constructor(private pressureSystem: NarrativePressureSystem) {}

  selectBehavior(agent: Entity, options: BehaviorOption[]): BehaviorOption {
    // Standard behavior scoring
    const scores = options.map(opt => ({
      option: opt,
      score: this.scoreBehavior(agent, opt)
    }));

    // Apply narrative pressure to scores
    for (const scored of scores) {
      const pressure = this.pressureSystem.getPressureBias({
        type: 'behavior_selection',
        agentId: agent.id,
        behavior: scored.option.behaviorType
      });

      // Adjust score by pressure
      scored.score *= (1 + pressure * 0.3); // Gentle bias (30% max adjustment)
    }

    // Softmax selection (pressure-adjusted)
    return this.softmaxSelect(scores);
  }
}
```

#### C. Divine Intervention

```typescript
class DeityEntity extends Entity {
  createNarrativeAttractor(
    goal: OutcomeGoal,
    beliefCost: number
  ): OutcomeAttractor {
    const deity = this.getComponent(CT.Deity) as DeityComponent;

    if (deity.belief < beliefCost) {
      throw new Error('Insufficient belief to create attractor');
    }

    // Spend belief
    deity.belief -= beliefCost;

    // Create attractor
    const attractor: OutcomeAttractor = {
      id: generateId(),
      source: { type: 'deity', deityId: this.id },
      goal: goal,
      strength: Math.sqrt(beliefCost / 1000), // Diminishing returns
      urgency: 0.5,
      scope: { type: 'global' },
      decay: { type: 'on_achievement' },
      convergence: 0,
      conflicts: []
    };

    // Register with pressure system
    world.getSystem(NarrativePressureSystem).addAttractor(attractor);

    return attractor;
  }
}
```

### 3. Path Analysis and Convergence

```typescript
class PathAnalyzer {
  /**
   * Identify paths that lead toward the goal.
   * This is the "brain" of the narrative pressure system.
   */
  identifyConvergentPaths(
    world: World,
    attractor: OutcomeAttractor
  ): ConvergentPath[] {
    const currentState = this.measureState(world, attractor.goal);
    const goalState = attractor.goal.successCondition;

    // Use a simple heuristic to find promising paths
    const paths: ConvergentPath[] = [];

    switch (attractor.goal.type) {
      case 'entity_death': {
        const targetId = attractor.goal.parameters.entityId;
        paths.push(...this.findDeathPaths(world, targetId));
        break;
      }

      case 'village_crisis': {
        paths.push(...this.findCrisisPaths(world));
        break;
      }

      case 'relationship_formed': {
        const { entity1, entity2 } = attractor.goal.parameters;
        paths.push(...this.findMeetingPaths(world, entity1, entity2));
        break;
      }

      // ... other goal types
    }

    // Filter by path constraints
    if (attractor.pathConstraints) {
      return paths.filter(p => this.satisfiesConstraints(p, attractor.pathConstraints!));
    }

    return paths;
  }

  private findDeathPaths(world: World, targetId: string): ConvergentPath[] {
    const paths: ConvergentPath[] = [];

    // Path 1: Combat encounter
    paths.push({
      type: 'combat_death',
      steps: [
        { type: 'event_spawn', eventType: 'hostile_encounter', bias: 0.3 },
        { type: 'damage_modifier', targetId: targetId, bias: 0.2 }
      ],
      confidence: 0.7
    });

    // Path 2: Environmental hazard
    paths.push({
      type: 'environmental_death',
      steps: [
        { type: 'event_spawn', eventType: 'natural_disaster', bias: 0.2 },
        { type: 'escape_chance', targetId: targetId, bias: -0.3 }
      ],
      confidence: 0.5
    });

    // Path 3: Starvation
    paths.push({
      type: 'starvation_death',
      steps: [
        { type: 'resource_availability', resourceType: 'food', bias: -0.4 },
        { type: 'behavior_selection', agentId: targetId, behavior: 'gather', bias: -0.2 }
      ],
      confidence: 0.6
    });

    return paths;
  }

  private findCrisisPaths(world: World): ConvergentPath[] {
    return [
      {
        type: 'famine',
        steps: [
          { type: 'weather_modifier', weatherType: 'drought', bias: 0.5 },
          { type: 'resource_availability', resourceType: 'food', bias: -0.6 }
        ],
        confidence: 0.8
      },
      {
        type: 'plague',
        steps: [
          { type: 'event_spawn', eventType: 'disease_outbreak', bias: 0.6 }
        ],
        confidence: 0.7
      },
      {
        type: 'war',
        steps: [
          { type: 'event_spawn', eventType: 'raid', bias: 0.4 },
          { type: 'opinion_shift', opinion: 'aggression', bias: 0.3 }
        ],
        confidence: 0.6
      }
    ];
  }
}
```

---

## Examples and Use Cases

### Example 1: Divine Protection

**Scenario:** A deity wants their chosen hero to survive.

```typescript
const hero = world.getEntity(heroId);
const deity = world.getEntity(deityId);

// Create survival attractor
const attractor = deity.createNarrativeAttractor({
  type: 'entity_survival',
  parameters: { entityId: heroId },
  successCondition: {
    type: 'time_elapsed',
    duration: 7 * 24 * 60 * 60 // 1 week
  },
  convergenceMetric: {
    type: 'boolean',
    measure: (world) => world.getEntity(heroId).isAlive
  }
}, beliefCost: 500);
```

**Effects:**
- Combat encounters near the hero become 20% less likely
- Damage to the hero is reduced by 15%
- Healing opportunities (finding food, medicine) increase by 25%
- The hero's AI is biased toward cautious behaviors (flee, hide) by 10%

**Result:** The hero doesn't have plot armor, but the world gently conspires to keep them alive. They can still die if they're reckless or unlucky, but the odds are in their favor.

### Example 2: Tragic Prophecy

**Scenario:** A prophet declares "The firstborn child of the king will bring ruin to the kingdom."

```typescript
const prophecy = createProphecy({
  text: "The firstborn child of the king will bring ruin to the kingdom",
  beliefStrength: 0.3 // Initially weak, grows as people believe
});

// Creates two attractors:
// 1. King's child should survive to adulthood
const childSurvivalAttractor = {
  goal: { type: 'entity_survival', parameters: { entityId: kingChildId } },
  strength: prophecy.beliefStrength,
  urgency: 0.2 // Long-term
};

// 2. Kingdom should face a crisis
const kingdomCrisisAttractor = {
  goal: { type: 'village_crisis', parameters: { villageId: capitalId } },
  strength: prophecy.beliefStrength,
  urgency: 0.1, // Very long-term
  pathConstraints: {
    // Crisis must somehow involve the king's child
    requiredActors: [kingChildId]
  }
};
```

**Effects:**
- The child survives childhood (narrative pressure protects them)
- As the child grows, small misfortunes accumulate around the kingdom
- The child's AI is biased toward making unwise decisions (not forced, just nudged)
- Events that could connect the child to a crisis become more likely

**Possible Outcomes:**
- The child accidentally starts a war
- The child is manipulated by enemies
- The child's good intentions backfire catastrophically
- The child actively tries to prevent the prophecy and causes it by doing so (Greek tragedy)
- The child succeeds in avoiding the prophecy (low probability, but possible)

### Example 3: Emergent Romeo and Juliet

**Scenario:** Two agents from rival factions keep almost meeting.

```typescript
// The storyteller subsystem notices narrative potential
const storyteller = world.getSystem(StorytellerSystem);

storyteller.createAttractor({
  goal: {
    type: 'relationship_formed',
    parameters: {
      entity1: agentA.id,
      entity2: agentB.id,
      relationshipType: 'romantic'
    }
  },
  strength: 0.4,
  urgency: 0.6,
  pathConstraints: {
    // Must overcome faction rivalry
    requiredObstacles: ['faction_conflict']
  }
});
```

**Effects:**
- AgentA and AgentB's paths cross more often (30% increase in proximity events)
- When they're near each other, conversation topics lean toward personal (20% bias)
- Positive opinion modifiers are amplified (10% boost)
- Events that force them to work together become more likely (25% increase)

**Possible Outcomes:**
- They fall in love (most likely path)
- They become rivals instead (alternative attractor basin)
- They become friends but not romantic (partial convergence)
- They never meet at all (attractor fails to converge)

### Example 4: Conflicting Attractors

**Scenario:** Two gods want opposite outcomes.

```typescript
// God of War wants the village to burn
const warAttractor = warGod.createNarrativeAttractor({
  goal: { type: 'village_destruction', parameters: { villageId } },
  strength: 0.7,
  urgency: 0.8
}, beliefCost: 1000);

// God of Peace wants the village to thrive
const peaceAttractor = peaceGod.createNarrativeAttractor({
  goal: { type: 'village_prosperity', parameters: { villageId } },
  strength: 0.6,
  urgency: 0.7
}, beliefCost: 800);
```

**Resolution:**
- The stronger attractor (War: 0.7) dominates, but not completely
- Peace attractor creates counter-pressure
- Net effect: War events are more likely, but Peace events still occur
- The village experiences a **turbulent period** — neither pure destruction nor pure prosperity
- Whichever god gains more belief can tip the balance

**Meta-Effect:**
- This conflict becomes a story element itself
- Agents might notice "the gods are at war over us"
- Believers of each god might take opposing actions
- The narrative pressure creates dramatic tension

---

## Advanced Features

### 1. Attractor Cascades

One attractor achieving its goal can spawn new attractors:

```typescript
interface AttractorCascade {
  parentAttractor: string;
  onAchievement: OutcomeAttractor[];
  onFailure?: OutcomeAttractor[];
}

// Example: Hero's death spawns revenge quest
const heroDeathAttractor = {
  goal: { type: 'entity_death', parameters: { entityId: heroId } },
  cascade: {
    onAchievement: [
      {
        goal: {
          type: 'justice',
          parameters: {
            victim: heroId,
            mustBePunished: killerId
          }
        },
        strength: 0.8 // Strong revenge narrative
      }
    ]
  }
};
```

### 2. Attractor Interference Patterns

Multiple attractors in proximity can create emergent patterns:

```typescript
class AttractorInterference {
  /**
   * Detect when multiple attractors create interesting interference.
   */
  detectInterference(attractors: OutcomeAttractor[]): InterferencePattern | null {
    // Constructive interference: attractors align
    if (this.areAligned(attractors)) {
      return {
        type: 'constructive',
        strength: this.sumStrengths(attractors),
        description: 'Multiple forces push toward similar outcomes'
      };
    }

    // Destructive interference: attractors oppose
    if (this.areOpposed(attractors)) {
      return {
        type: 'destructive',
        strength: this.differenceMagnitude(attractors),
        description: 'Opposing forces create dramatic tension'
      };
    }

    // Resonance: attractors amplify each other
    if (this.resonanceDetected(attractors)) {
      return {
        type: 'resonance',
        strength: this.resonanceAmplitude(attractors),
        description: 'Forces harmonize to create powerful effect'
      };
    }

    return null;
  }
}
```

### 3. Player Visibility and Control

Players should be aware of narrative forces:

```typescript
interface NarrativeUI {
  // View active attractors
  viewAttractors(): AttractorSummary[];

  // See which forces are influencing events
  explainEvent(eventId: string): {
    naturalProbability: number;
    pressuredProbability: number;
    influences: AttractorInfluence[];
  };

  // Create player-defined attractors
  createPlayerAttractor(goal: OutcomeGoal): OutcomeAttractor;

  // Oppose an attractor
  createCounterAttractor(opposingId: string): OutcomeAttractor;

  // Accept or resist narrative pressure
  setNarrativeStance(stance: 'embrace' | 'neutral' | 'resist'): void;
}
```

**Narrative Transparency:**
- Players can see "The story wants X to happen" notifications
- They can choose to go along with it or fight against it
- Fighting narrative pressure is harder but possible (heroic defiance)

### 4. Attractor Decay

Attractors don't last forever:

```typescript
interface DecayCondition {
  type: DecayType;
  parameters?: any;
}

type DecayType =
  | 'on_achievement'      // Remove when goal is achieved
  | 'on_failure'          // Remove when goal becomes impossible
  | 'time_limit'          // Remove after X ticks
  | 'belief_decay'        // Weaken as belief fades
  | 'narrative_fatigue'   // Weaken if story becomes stale
  | 'counter_narrative';  // Weakened by opposing attractors

// Example: Prophecy that fades if not fulfilled in time
const prophecyAttractor = {
  goal: { type: 'event_occurrence', parameters: { eventType: 'chosen_one_revealed' } },
  decay: {
    type: 'time_limit',
    parameters: { ticksRemaining: 10000 }
  }
};
```

---

## Integration with Existing Systems

### Divinity System Integration

```typescript
// DeityComponent extension
interface DeityComponent {
  // ... existing fields ...

  // Narrative influence
  narrativeAttractors: string[];      // Active attractors created by this god
  narrativeBudget: number;            // Belief available for attractors

  // Divine will
  desiredOutcomes: OutcomeGoal[];     // Long-term goals
  narrativeStyle: NarrativeStyle;     // How this god uses pressure
}

type NarrativeStyle =
  | 'subtle'      // Gentle nudges, hard to detect
  | 'overt'       // Clear divine intervention
  | 'chaotic'     // Random, unpredictable influence
  | 'strategic';  // Calculated, efficient influence
```

### Event System Integration

```typescript
class EventSystem {
  spawnEvent(eventType: string): void {
    // Check for narrative pressure
    const pressure = this.narrativePressure.getPressureBias({
      type: 'event_spawn',
      eventType: eventType
    });

    // Apply pressure to spawn probability
    const adjustedProbability = this.applyPressure(
      this.baseEventProbability[eventType],
      pressure
    );

    // Roll with adjusted probability
    if (Math.random() < adjustedProbability) {
      this.doSpawnEvent(eventType);

      // Log narrative influence
      this.logNarrativeInfluence(eventType, pressure);
    }
  }
}
```

### AI System Integration

```typescript
class LLMAgent {
  async selectAction(): Promise<Action> {
    // Get standard action scores
    const actions = this.evaluateActions();

    // Apply narrative pressure to decision weights
    for (const action of actions) {
      const pressure = this.narrativePressure.getPressureBias({
        type: 'behavior_selection',
        agentId: this.agentId,
        behavior: action.type
      });

      // Gentle bias (max 20% adjustment)
      action.weight *= (1 + pressure * 0.2);
    }

    // Select action with pressure-adjusted weights
    return this.weightedSelect(actions);
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (8-12 hours)
1. Create OutcomeAttractor, PressureEffect types
2. Implement NarrativePressureSystem skeleton
3. Add basic pressure query API
4. Create simple path analyzer (hardcoded paths)
5. Add attractor creation API for deities
6. Basic convergence measurement

**Deliverable:** Deities can create attractors; system tracks them but doesn't affect simulation yet

### Phase 2: Pressure Application (10-15 hours)
1. Integrate with RandomEventSystem
2. Integrate with AI behavior selection
3. Integrate with combat/damage systems
4. Add pressure bias calculation
5. Implement softmax-based probability adjustment
6. Add logging/debugging tools

**Deliverable:** Attractors actually influence the simulation

### Phase 3: Path Analysis (15-20 hours)
1. Implement path finding for common goals (death, survival, relationships)
2. Add confidence scoring for paths
3. Implement path constraint system
4. Add convergence measurement for each goal type
5. Create heuristics for identifying promising paths

**Deliverable:** System intelligently finds multiple paths to goals

### Phase 4: Advanced Features (12-18 hours)
1. Attractor conflicts and interference
2. Attractor cascades
3. Decay conditions
4. Player-created attractors
5. Narrative transparency UI
6. Divine narrative budgets

**Deliverable:** Full narrative pressure ecology with competing forces

### Phase 5: Storyteller AI (20-30 hours)
1. Emergent attractor creation (system detects narrative potential)
2. Story arc recognition
3. Dramatic timing (when to intensify pressure)
4. Narrative fatigue detection
5. Story closure mechanics
6. Integration with myth generation

**Deliverable:** Self-regulating narrative system that creates compelling stories

---

## Success Metrics

1. **Attractor Achievement Rate:** 60-80% of attractors should converge (not guaranteed, but likely)
2. **Path Diversity:** Multiple different paths should lead to same outcome
3. **Player Perception:** Players should feel like "the story is alive" without feeling railroaded
4. **Emergent Stories:** Surprising narratives should emerge from attractor interactions
5. **Divine Conflict:** Competing gods should create dramatic tension
6. **Performance:** < 5ms overhead per tick for 100 active attractors

---

## Design Principles

1. **Outcome, Not Path:** Bias the destination, never the journey
2. **Gentle, Not Forceful:** Adjust probabilities, don't override decisions
3. **Visible, Not Hidden:** Players should know when narrative pressure exists
4. **Resistible, Not Inevitable:** Counter-pressure and free will can overcome attractors
5. **Emergent, Not Scripted:** Paths should arise from simulation, not be predetermined
6. **Meaningful, Not Random:** Attractors should create stories, not just chaos

---

## Narrative Pressure is NOT Plot

**Plot** = predetermined sequence of events

**Narrative Pressure** = probabilistic field that makes certain outcomes more likely

The difference:
- Plot: "The hero will meet the princess on day 10 at the fountain"
- Pressure: "The hero and princess should probably meet soon, somehow"

Plot dictates. Pressure suggests.

This is **story structure**, not **story script**.

---

## Conclusion

Narrative pressure allows higher-dimensional beings (gods, players, the universe itself) to shape stories without destroying emergence. It's global optimization that leaks downward into the simulation, creating the feeling that "the story wants this to happen" while preserving agent autonomy and path freedom.

The village can burn down in a thousand different ways. The narrative attractor doesn't care which one happens — it just tilts the probability space so that, somehow, it does.

This is not destiny. It's narrative gravity.
