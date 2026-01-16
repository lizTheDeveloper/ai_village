# Agent Decision-Making State Diagram

> **Purpose**: This document provides a complete architectural overview of how agents make decisions, select behaviors, and transition between states. Read this before modifying any behavior or decision system.

## Executive Summary

The agent decision system uses a **3-layer hierarchical architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: AUTONOMIC                       │
│         (Survival reflexes - HIGHEST PRIORITY)              │
│   forced_sleep, seek_food, seek_warmth, flee_to_home        │
│                                                             │
│   Priority 80-100: Cannot be interrupted                    │
└─────────────────────────────────────────────────────────────┘
                              ↓ (if no critical needs)
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 2: BEHAVIOR QUEUE                   │
│            (Multi-step task execution)                      │
│   [gather wood] → [deposit_items] → [build campfire]        │
│                                                             │
│   Can be PAUSED by autonomic, RESUMED when satisfied        │
└─────────────────────────────────────────────────────────────┘
                              ↓ (if no queue)
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 3: LLM/SCRIPTED                      │
│              (Intelligent decision-making)                  │
│   TalkerLLM (social) → ExecutorLLM (tasks)                  │
│                                                             │
│   Creates new behaviors or queues                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Decision Flow

```
Every Think Interval (staggered across agents):

  ┌──────────────────────────────────────────────────────────────┐
  │                     1. PERCEPTION                            │
  │                PerceptionProcessor.processAll()              │
  │                                                              │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
  │  │   Vision    │  │   Hearing   │  │ Meeting Detection   │   │
  │  │ (entities,  │  │ (sounds,    │  │ (nearby agents,     │   │
  │  │  terrain)   │  │  speech)    │  │  conversations)     │   │
  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
  └──────────────────────────────────────────────────────────────┘
                                ↓
  ┌──────────────────────────────────────────────────────────────┐
  │                     2. DECISION                              │
  │                                                              │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │              CHECK AUTONOMIC OVERRIDE                 │    │
  │  │                                                       │    │
  │  │  energy ≤ 0? ─────────────→ forced_sleep (P:100)     │    │
  │  │  energy < 15%? ───────────→ seek_sleep (P:85)        │    │
  │  │  dangerously_cold/hot? ───→ seek_warmth/cooling (P:90)│   │
  │  │  health < 30%? ───────────→ flee_to_home (P:85)      │    │
  │  │  hunger < 10%? ───────────→ seek_food (P:80)         │    │
  │  │  moderately_cold/hot? ────→ seek_warmth/cooling (P:35)│   │
  │  │  hunger < 60%? ───────────→ seek_food (P:40)         │    │
  │  └──────────────────────────────────────────────────────┘    │
  │                          ↓                                   │
  │                   autonomic override?                        │
  │                    /            \                            │
  │                  YES             NO                          │
  │                   ↓              ↓                           │
  │           ┌───────────────┐  ┌──────────────────────────┐   │
  │           │ PAUSE QUEUE   │  │  CHECK BEHAVIOR QUEUE    │   │
  │           │ Execute       │  │                          │   │
  │           │ autonomic     │  │  queue active?           │   │
  │           │ behavior      │  │     ↓                    │   │
  │           └───────────────┘  │  YES: execute current    │   │
  │                              │       check completion   │   │
  │                              │       advance if done    │   │
  │                              │                          │   │
  │                              │  NO: → Layer 3           │   │
  │                              └──────────────────────────┘   │
  │                                        ↓                     │
  │                         ┌──────────────────────────────┐     │
  │                         │    LLM / SCRIPTED DECISION   │     │
  │                         │                              │     │
  │                         │  LLM Agent?                  │     │
  │                         │    → TalkerLLMProcessor      │     │
  │                         │    → ExecutorLLMProcessor    │     │
  │                         │                              │     │
  │                         │  Scripted Agent?             │     │
  │                         │    → ScriptedDecisionProcessor│    │
  │                         └──────────────────────────────┘     │
  └──────────────────────────────────────────────────────────────┘
                                ↓
  ┌──────────────────────────────────────────────────────────────┐
  │                     3. EXECUTION                             │
  │                BehaviorRegistry.execute()                    │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  Behavior Handler Called                               │  │
  │  │                                                        │  │
  │  │  1. Read state from AgentComponent.behaviorState       │  │
  │  │  2. Perform actions (movement, resource ops, etc.)     │  │
  │  │  3. Update state in AgentComponent.behaviorState       │  │
  │  │  4. Optionally call complete() to signal done          │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘
```

---

## Autonomic Override State Machine

The autonomic system is a **priority-based state machine** that overrides all other decisions when survival is at stake.

```
                    ┌─────────────────────────────┐
                    │        CHECK NEEDS          │
                    │     (every think tick)      │
                    └─────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ↓                         ↓                         ↓
   ┌─────────┐            ┌──────────────┐           ┌────────────┐
   │ ENERGY  │            │ TEMPERATURE  │           │  HUNGER    │
   └─────────┘            └──────────────┘           └────────────┘
        │                        │                         │
        ↓                        ↓                         ↓
  ┌───────────────┐      ┌───────────────┐        ┌───────────────┐
  │ energy ≤ 0    │      │ dangerously_  │        │ hunger < 0.1  │
  │ FORCED_SLEEP  │      │ cold/hot      │        │ + energy > 0  │
  │ Priority: 100 │      │ Priority: 90  │        │ SEEK_FOOD     │
  │               │      │               │        │ Priority: 80  │
  │ CANNOT BE     │      │ seek_warmth   │        │               │
  │ INTERRUPTED   │      │ seek_cooling  │        │ CAN BE        │
  └───────────────┘      └───────────────┘        │ INTERRUPTED   │
        │                        │                 │ by P > 80     │
        ↓                        ↓                 └───────────────┘
  ┌───────────────┐      ┌───────────────┐               │
  │ energy < 0.15 │      │ moderately_   │               ↓
  │ SEEK_SLEEP    │      │ cold/hot      │        ┌───────────────┐
  │ Priority: 85  │      │ Priority: 35  │        │ hunger < 0.6  │
  │               │      │               │        │ SEEK_FOOD     │
  │ CAN BE        │      │ CAN BE        │        │ Priority: 40  │
  │ INTERRUPTED   │      │ INTERRUPTED   │        │               │
  │ by P > 85     │      │ by P > 35     │        │ CAN BE        │
  └───────────────┘      └───────────────┘        │ INTERRUPTED   │
                                                  │ by P > 40     │
                                                  └───────────────┘
```

### Priority Reference Table

| Priority | Behavior | Trigger | Can Interrupt? |
|----------|----------|---------|----------------|
| 100 | forced_sleep | energy ≤ 0 | Nothing |
| 90 | seek_warmth/cooling | dangerously cold/hot | Only by P > 90 |
| 85 | seek_sleep | energy < 15% | Only by P > 85 |
| 85 | flee_to_home | health < 30% | Only by P > 85 |
| 80 | seek_food | hunger < 10% | Only by P > 80 |
| 70 | seek_sleep | past bedtime | By any P > 70 |
| 40 | seek_food | hunger < 60% | By any P > 40 |
| 35 | seek_warmth/cooling | moderately cold/hot | By any P > 35 |

---

## Behavior Queue State Machine

The behavior queue enables **multi-step task execution** with **pause/resume** support.

```
                         ┌─────────────────────┐
                         │    QUEUE EMPTY      │
                         │   (no active queue) │
                         └─────────────────────┘
                                   │
                                   │ LLM creates queue
                                   │ [behavior1, behavior2, ...]
                                   ↓
                         ┌─────────────────────┐
                         │   QUEUE ACTIVE      │
                         │ currentIndex = 0    │
                         │ queuePaused = false │
                         └─────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ↓                    ↓                    ↓
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ AUTONOMIC NEED   │ │ BEHAVIOR RUNS    │ │ QUEUE TIMEOUT    │
    │                  │ │                  │ │                  │
    │ queuePaused=true │ │ execute()        │ │ Queue cancelled  │
    │ queueInterrupted │ │ update state     │ │ Return to LLM    │
    │ By='seek_food'   │ │                  │ │ decision         │
    └──────────────────┘ └──────────────────┘ └──────────────────┘
              │                    │
              ↓                    ↓
    ┌──────────────────┐ ┌──────────────────┐
    │ QUEUE PAUSED     │ │ BEHAVIOR         │
    │                  │ │ COMPLETED?       │
    │ Execute autonomic│ │                  │
    │ behavior instead │ │ behaviorCompleted│
    └──────────────────┘ │ = true?          │
              │          └──────────────────┘
              │                    │
              ↓                    ↓ YES
    ┌──────────────────┐ ┌──────────────────┐
    │ AUTONOMIC        │ │ ADVANCE QUEUE    │
    │ SATISFIED?       │ │                  │
    │                  │ │ currentIndex++   │
    │ checkNeeds()     │ │ clear completion │
    │ returns null?    │ │ flag             │
    └──────────────────┘ └──────────────────┘
              │                    │
              ↓ YES                ↓
    ┌──────────────────┐ ┌──────────────────┐
    │ RESUME QUEUE     │ │ MORE BEHAVIORS?  │
    │                  │ │                  │
    │ queuePaused=false│ │ index < length?  │
    │ continue from    │ │                  │
    │ paused behavior  │ └──────────────────┘
    └──────────────────┘          │
                                  │ NO
                                  ↓
                         ┌─────────────────────┐
                         │   QUEUE COMPLETE    │
                         │                     │
                         │ Clear queue         │
                         │ Return to LLM       │
                         │ decision            │
                         └─────────────────────┘
```

---

## Individual Behavior State Machines

### SeekFoodBehavior

**This is the behavior where the current bug manifests.**

```
                         ┌─────────────────────┐
                         │      START          │
                         │  SeekFoodBehavior   │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  CHECK INVENTORY    │
                         │                     │
                         │  hasEdibleFood()?   │
                         └─────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ↓ YES                         ↓ NO
          ┌──────────────────┐          ┌──────────────────┐
          │   EAT FROM       │          │ FIND FOOD SOURCE │
          │   INVENTORY      │          │                  │
          │                  │          │ findNearest      │
          │   consume item   │          │ FoodSource()     │
          │   update needs   │          │ radius: 30 tiles │◄── BUG: Too small!
          │   complete()     │          │                  │
          └──────────────────┘          └──────────────────┘
                                                  │
                                   ┌──────────────┴──────────────┐
                                   ↓ FOUND                       ↓ NOT FOUND
                         ┌──────────────────┐          ┌──────────────────┐
                         │  MOVE TO FOOD    │          │    WANDER        │◄── BUG HERE
                         │                  │          │                  │
                         │  moveToward()    │          │  setVelocity()   │
                         │  ├─ sets target  │          │  ├─ NO target    │
                         │  ├─ PathViz: YES │          │  ├─ PathViz: NO  │
                         │  └─ arrival: 1.5 │          │  └─ random dir   │
                         └──────────────────┘          └──────────────────┘
                                   │                            │
                                   ↓                            │
                         ┌──────────────────┐                   │
                         │  AT FOOD?        │                   │
                         │                  │                   │
                         │  distance < 1.5? │                   │
                         └──────────────────┘                   │
                                   │                            │
                    ┌──────────────┴──────────────┐             │
                    ↓ YES                         ↓ NO          │
          ┌──────────────────┐          ┌──────────────────┐    │
          │   HARVEST/EAT    │          │  KEEP MOVING     │    │
          │                  │          │                  │    │
          │   - plant: pick  │          │  continue        │    │
          │   - storage: get │          │  moveToward()    │    │
          │   - dead animal  │          │                  │    │
          │   update hunger  │          │                  │    │
          │   complete()     │          │                  │    │
          └──────────────────┘          └──────────────────┘    │
                                                                │
                                                                ↓
                                                    ┌──────────────────┐
                                                    │ WANDER CONTINUES │
                                                    │                  │
                                                    │ No target set    │
                                                    │ No spatial memory│
                                                    │ used as fallback │
                                                    │                  │
                                                    │ Agent drifts     │
                                                    │ further from food│
                                                    └──────────────────┘
```

### The Food Finding Bug

**Problem Location**: `SeekFoodBehavior.ts` lines 121-173

```
Current Flow (BROKEN for distant agents):

1. Agent at (70, 150) - far from village
2. findNearestFoodSource(radius=30) → null  (no food within 30 tiles)
3. Falls through to WANDER branch
4. setVelocity(random direction)  ← NO TARGET SET
5. PathViz shows: movementHasTarget: undefined
6. Agent wanders randomly, may drift FURTHER from food
7. Repeat forever

Missing Flow (SHOULD EXIST):

1. Agent at (70, 150) - far from village
2. findNearestFoodSource(radius=30) → null
3. CHECK SPATIAL MEMORY for remembered food locations  ← MISSING!
4. If memory found: moveToward(remembered location)
5. If no memory: EXPAND SEARCH RADIUS or navigate home
```

---

### GatherBehavior

```
                         ┌─────────────────────┐
                         │      START          │
                         │   GatherBehavior    │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  CHECK INVENTORY    │
                         │                     │
                         │  inventory full?    │
                         │  or target reached? │
                         └─────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ↓ YES                         ↓ NO
          ┌──────────────────┐          ┌──────────────────┐
          │  DEPOSIT ITEMS   │          │  FIND RESOURCE   │
          │                  │          │                  │
          │  switchTo(       │          │  ChunkSpatial    │
          │  'deposit_items')│          │  Query.get       │
          │                  │          │  EntitiesIn      │
          │  (preserves      │          │  Radius(50)      │
          │   gather state)  │          │                  │
          └──────────────────┘          └──────────────────┘
                                                  │
                                   ┌──────────────┴──────────────┐
                                   ↓ FOUND                       ↓ NOT FOUND
                         ┌──────────────────┐          ┌──────────────────┐
                         │  MOVE TO TARGET  │          │    COMPLETE      │
                         │                  │          │                  │
                         │  moveToward()    │          │  No resources    │
                         │  ├─ sets target  │          │  nearby          │
                         │  ├─ PathViz: YES │          │                  │
                         │  └─ arrival: 1.5 │          │  complete()      │
                         └──────────────────┘          └──────────────────┘
                                   │
                                   ↓
                         ┌──────────────────┐
                         │  AT RESOURCE?    │
                         │                  │
                         │  distance < 1.5? │
                         └──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ↓ YES                         ↓ NO
          ┌──────────────────┐          ┌──────────────────┐
          │   HARVEST        │          │  KEEP MOVING     │
          │                  │          │                  │
          │   - start timer  │          │  continue        │
          │   - wait ticks   │          │  moveToward()    │
          │   - add to inv   │          │                  │
          │   - update state │          │                  │
          └──────────────────┘          └──────────────────┘
```

---

### WanderBehavior

```
                         ┌─────────────────────┐
                         │      START          │
                         │   WanderBehavior    │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  CHECK HOME BIAS    │
                         │                     │
                         │  Has assigned home? │
                         │  Far from home?     │
                         └─────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ↓ YES (far from home)         ↓ NO
          ┌──────────────────┐          ┌──────────────────┐
          │  BIAS TOWARD     │          │  FRONTIER SEEK   │
          │  HOME            │          │                  │
          │                  │          │  Find unexplored │
          │  Add home        │          │  direction       │
          │  direction to    │          │                  │
          │  wander angle    │          │  Prefer edges    │
          │                  │          │  of known area   │
          └──────────────────┘          └──────────────────┘
                    │                            │
                    └──────────────┬─────────────┘
                                   ↓
                         ┌─────────────────────┐
                         │  SET VELOCITY       │
                         │                     │
                         │  setVelocity(       │
                         │    cos(angle)*speed,│
                         │    sin(angle)*speed │
                         │  )                  │
                         │                     │
                         │  ├─ NO target set   │
                         │  ├─ PathViz: NO     │
                         │  └─ continuous move │
                         └─────────────────────┘
```

---

## Movement Pattern Reference

### Target-Based Movement (PathViz VISIBLE)

Used when agent has a specific destination.

```typescript
// BaseBehavior.moveToward() - lines 167-251
moveToward(entity, targetPos, { arrivalDistance }):
  1. Calculate distance to target
  2. If distance < arrivalDistance: stop movement
  3. Calculate velocity toward target
  4. Apply smooth deceleration near target
  5. setMovementTarget(entity, targetPos)  ← SETS hasTarget=true
  6. setVelocity(entity, vx, vy)
  7. Return distance
```

**Behaviors using moveToward()**:
- GatherBehavior (moving to resource)
- SeekFoodBehavior (moving to food)
- BuildBehavior (moving to construction site)
- DepositItemsBehavior (moving to storage)
- NavigateBehavior (with explicit target)
- FleeToHomeBehavior (moving to bed)

### Velocity-Based Movement (PathViz INVISIBLE)

Used for continuous exploration/wandering.

```typescript
// BaseBehavior.setVelocity() - lines 135-148
setVelocity(entity, vx, vy):
  1. Update MovementComponent.velocityX/Y
  2. Update VelocityComponent.x/y
  3. Does NOT set targetX/Y or hasTarget
```

**Behaviors using setVelocity()**:
- WanderBehavior (random direction)
- SeekFoodBehavior (when no food found - WANDERING)
- NavigateBehavior (fallback when no steering)
- ExploreBehavior (frontier exploration)

### PathViz Visibility Matrix

| Scenario | Movement Method | hasTarget | targetX/Y | PathViz |
|----------|-----------------|-----------|-----------|---------|
| Moving to resource | moveToward() | true | set | VISIBLE |
| Moving to food | moveToward() | true | set | VISIBLE |
| Wandering (no food) | setVelocity() | false/undefined | undefined | INVISIBLE |
| Random wander | setVelocity() | false/undefined | undefined | INVISIBLE |
| Stopped/Idle | disableSteeringAndStop() | false | undefined | N/A |

---

## LLM Decision Flow

```
                         ┌─────────────────────┐
                         │   LLM AGENT TICK    │
                         │   (think interval)  │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  BUILD PROMPT       │
                         │                     │
                         │  - Agent state      │
                         │  - World context    │
                         │  - Nearby entities  │
                         │  - Available actions│
                         │  - Skill levels     │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  LAYER 2A: TALKER   │
                         │                     │
                         │  Social decisions:  │
                         │  - Conversations    │
                         │  - Goals            │
                         │  - Personality      │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  LAYER 2B: EXECUTOR │
                         │                     │
                         │  Task decisions:    │
                         │  - gather X         │
                         │  - build Y          │
                         │  - craft Z          │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  PARSE RESPONSE     │
                         │                     │
                         │  ResponseParser:    │
                         │  { type, target,    │
                         │    building, etc }  │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  CONVERT TO         │
                         │  BEHAVIOR           │
                         │                     │
                         │  actionObjectTo     │
                         │  Behavior():        │
                         │                     │
                         │  { type: 'gather',  │
                         │    target: 'wood' } │
                         │        ↓            │
                         │  { behavior: 'gather'│
                         │    behaviorState:   │
                         │    {resourceType:   │
                         │     'wood'} }       │
                         └─────────────────────┘
                                   │
                                   ↓
                         ┌─────────────────────┐
                         │  UPDATE AGENT       │
                         │                     │
                         │  agent.behavior =   │
                         │    'gather'         │
                         │  agent.behaviorState│
                         │    = { ... }        │
                         └─────────────────────┘
```

---

## Behavior Registration

All behaviors are registered in `AgentBrainSystem.registerBehaviors()` (lines 179-253):

```typescript
// Survival behaviors
registry.register('idle', idleBehavior);
registry.register('wander', wanderBehavior);
registry.register('seek_sleep', seekSleepBehavior);
registry.register('forced_sleep', forcedSleepBehavior);
registry.register('flee_to_home', fleeToHomeBehavior);

// Resource behaviors
registry.register('gather', gatherBehavior);
registry.register('deposit_items', depositItemsBehavior);
registry.register('seek_food', seekFoodBehavior);

// Production behaviors
registry.register('build', buildBehavior);
registry.register('craft', craftBehavior);
registry.register('farm', farmBehavior);
// ... etc

// Social behaviors
registry.register('talk', talkBehavior);
registry.register('follow_agent', followAgentBehavior);
// ... etc
```

---

## Key Files Reference

| Component | File | Key Functions |
|-----------|------|---------------|
| AgentBrainSystem | `packages/core/src/systems/AgentBrainSystem.ts` | `update()`, `processDecision()`, `shouldThink()` |
| BehaviorRegistry | `packages/core/src/behavior/BehaviorRegistry.ts` | `register()`, `execute()` |
| AutonomicSystem | `packages/core/src/decision/AutonomicSystem.ts` | `check()`, `checkNeeds()` |
| BaseBehavior | `packages/core/src/behavior/behaviors/BaseBehavior.ts` | `moveToward()`, `setVelocity()`, `complete()` |
| SeekFoodBehavior | `packages/core/src/behavior/behaviors/SeekFoodBehavior.ts` | `execute()`, `findNearestFoodSource()` |
| GatherBehavior | `packages/core/src/behavior/behaviors/GatherBehavior.ts` | `execute()` |
| WanderBehavior | `packages/core/src/behavior/behaviors/WanderBehavior.ts` | `execute()` |
| BehaviorPriority | `packages/core/src/decision/BehaviorPriority.ts` | `getBehaviorPriority()`, `canInterrupt()` |

---

## Architectural Invariants

1. **Autonomic Always Wins**: Layer 1 can always interrupt Layers 2-3
2. **Queue Pauses, Never Destroys**: Autonomic needs pause queues, resuming when satisfied
3. **Behaviors Are Stateless Classes**: All state in `AgentComponent.behaviorState`
4. **Single Source of Truth**: `AgentComponent.behavior` is THE current behavior
5. **Movement Target = PathViz**: Only `setMovementTarget()` makes targets visible
6. **Think Interval Staggering**: Agents think on different ticks to distribute LLM load

---

## Known Issues and Future Work

### Current Bug: Agents Not Finding Food When Far From Village

**Root Cause**: `SeekFoodBehavior.FOOD_SEARCH_RADIUS = 30` is too small for agents who have wandered far.

**Missing Fallbacks**:
1. No spatial memory consultation when local search fails
2. No search radius expansion
3. No "return to village" behavior when truly lost

**Proposed Fix**: See implementation plan in separate document.

### Potential Improvements

1. **Expanding Search**: Progressively larger search radii
2. **Spatial Memory Integration**: Check remembered food locations
3. **Home Navigation**: Return to village when resources exhausted
4. **Gradient Following**: Follow social/resource gradients toward populated areas
