# Agent Movement & Intent System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

LLMs don't choose every movement step. Agents decide high-level intents ("go to market for blueberries and mussels"), then pathfinding handles locomotion. The LLM is only consulted on **interrupts** - encountering someone, discovering something, or completing a task.

Critically, agents maintain **working memory** - they remember *why* they're doing something even when interrupted.

---

## Intent Architecture

```typescript
interface AgentIntent {
  // Current high-level goal
  currentIntent: Intent | null;

  // Stack of suspended intents (interrupted but not abandoned)
  intentStack: Intent[];

  // Working memory - active task context
  workingMemory: WorkingMemory;

  // Movement state
  movement: MovementState;
}

interface Intent {
  id: string;
  type: IntentType;
  description: string;

  // What we're trying to do
  goal: Goal;
  subgoals: Goal[];              // Broken down steps

  // Context
  reason: string;                // Why we're doing this
  origin: Position;              // Where we started
  startTime: GameTime;

  // State
  status: IntentStatus;
  progress: number;              // 0-1
  currentSubgoal: number;        // Index

  // Completion
  successCondition: Condition;
  failureCondition?: Condition;
  timeout?: number;              // Abandon after N ticks
}

type IntentType =
  | "go_to"               // Travel to location
  | "acquire"             // Get items
  | "perform_task"        // Do a job
  | "socialize"           // Talk to someone
  | "explore"             // Look around
  | "rest"                // Sleep, relax
  | "flee"                // Get away
  | "follow"              // Follow someone
  | "wait";               // Wait for something

type IntentStatus =
  | "active"              // Currently pursuing
  | "suspended"           // Interrupted, will resume
  | "completed"
  | "failed"
  | "abandoned";

interface Goal {
  description: string;
  type: GoalType;
  target?: Position | AgentId | ItemType;
  quantity?: number;
  completed: boolean;
}
```

---

## Working Memory

The critical piece - agents remember what they're doing:

```typescript
interface WorkingMemory {
  // Active task context
  activeTask: {
    description: string;        // "Shopping for dinner"
    items: ShoppingItem[];      // What we need
    progress: Map<string, boolean>;  // What we've got
    notes: string[];            // "Check the fish stall first"
  } | null;

  // Recent context (last few minutes)
  recentContext: {
    location: string;           // "market"
    arrivedFrom: string;        // "home"
    peopleSeenRecently: AgentId[];
    conversationsJustHad: ConversationId[];
    actionsJustTaken: Action[];
  };

  // Pending actions (things to do before leaving)
  pendingActions: PendingAction[];

  // Attention
  currentFocus: string | null;  // What we're looking at/for
  distractions: Distraction[];  // Things that caught attention
}

interface ShoppingItem {
  item: string;
  quantity: number;
  acquired: boolean;
  preferredSource?: string;     // "Get fish from Marcus"
  notes?: string;               // "Fresh, not smoked"
}

interface PendingAction {
  action: string;
  priority: number;
  addedWhen: GameTime;
  reason: string;
}

interface Distraction {
  type: "person" | "event" | "discovery" | "danger";
  subject: string;
  importance: number;
  handledAt?: GameTime;
}
```

---

## Movement State Machine

Movement is handled by the game engine, not LLM:

```typescript
interface MovementState {
  // Current movement
  status: MovementStatus;
  destination: Position | null;
  path: Position[];
  currentPathIndex: number;

  // Speed
  baseSpeed: number;
  currentSpeed: number;
  speedModifiers: SpeedModifier[];

  // Stuck detection
  stuckTimer: number;
  lastPosition: Position;
}

type MovementStatus =
  | "stationary"
  | "walking"
  | "running"
  | "sneaking"
  | "climbing"
  | "swimming"
  | "stuck"
  | "waiting";

// Movement tick - NO LLM, just pathfinding
function movementTick(agent: Agent): void {
  const state = agent.movement;

  if (state.status === "stationary") return;
  if (!state.destination) return;

  // Move along path
  if (state.currentPathIndex < state.path.length) {
    const nextPos = state.path[state.currentPathIndex];
    const moved = moveToward(agent, nextPos, state.currentSpeed);

    if (moved) {
      state.currentPathIndex++;
    } else {
      // Blocked - recalculate path
      state.path = calculatePath(agent.position, state.destination);
      state.currentPathIndex = 0;
    }
  } else {
    // Arrived
    state.status = "stationary";
    state.destination = null;

    // Trigger arrival interrupt
    triggerInterrupt(agent, {
      type: "arrived",
      destination: state.destination,
    });
  }
}
```

---

## Interrupt System

LLM is ONLY called on meaningful events:

```typescript
type InterruptType =
  | "arrived"             // Reached destination
  | "encountered_agent"   // Ran into someone
  | "discovered"          // Found something notable
  | "danger"              // Threat detected
  | "called_by"           // Someone calling out
  | "task_complete"       // Finished a subtask
  | "task_blocked"        // Can't continue
  | "time_passed"         // Periodic check (hourly)
  | "needs_critical";     // Hunger/thirst/energy critical

interface Interrupt {
  type: InterruptType;
  priority: number;           // 0-1
  data: any;                  // Context

  // Response options
  requiresDecision: boolean;
  suggestedActions?: string[];
}

// Interrupt handling
async function handleInterrupt(
  agent: Agent,
  interrupt: Interrupt
): Promise<void> {

  // Low priority interrupts might be ignored
  if (interrupt.priority < 0.3 && agent.intent.currentIntent) {
    // Note the distraction but continue
    agent.workingMemory.distractions.push({
      type: interrupt.type,
      subject: describeInterrupt(interrupt),
      importance: interrupt.priority,
    });
    return;
  }

  // High priority - suspend current intent and respond
  if (interrupt.priority > 0.7) {
    suspendCurrentIntent(agent);
  }

  // Consult LLM for decision
  const decision = await decideOnInterrupt(agent, interrupt);

  // Apply decision
  await applyDecision(agent, decision);
}

// Example interrupt: meeting someone while walking
async function handleEncounter(
  agent: Agent,
  otherAgent: Agent
): Promise<void> {

  const interrupt: Interrupt = {
    type: "encountered_agent",
    priority: calculateEncounterPriority(agent, otherAgent),
    data: {
      agent: otherAgent.id,
      name: otherAgent.name,
      relationship: getRelationship(agent, otherAgent),
      location: agent.position,
    },
    requiresDecision: true,
    suggestedActions: [
      "greet_and_chat",
      "nod_and_continue",
      "ignore",
      "ask_for_help",
      "avoid",
    ],
  };

  await handleInterrupt(agent, interrupt);
}
```

---

## LLM Decision Points

Only these situations invoke the LLM:

```typescript
const LLM_DECISION_POINTS = [
  // Starting new activities
  "choose_next_intent",       // What to do next
  "plan_task",                // How to do something complex

  // Interrupts
  "respond_to_encounter",     // Someone approached
  "react_to_discovery",       // Found something
  "handle_danger",            // Threat response
  "respond_to_call",          // Someone calling

  // Completion
  "task_complete_next",       // What to do after finishing
  "handle_failure",           // Task failed, now what
  "resume_or_abandon",        // Resume suspended intent?

  // Social
  "conversation_response",    // During active conversation
  "decide_to_share",          // Share information?
  "accept_or_decline",        // Someone asked something

  // Periodic
  "reflection",               // End of day review
  "reassess",                 // Hourly check-in
];

// NOT called for:
const NO_LLM_NEEDED = [
  "movement_step",            // Pathfinding handles this
  "animation",                // Game engine
  "resource_consumption",     // Automatic
  "production_progress",      // Timer-based
  "waiting",                  // Just wait
  "sleeping",                 // Just sleep
];
```

---

## LLM Prompt for Decisions

When LLM is consulted, include working memory:

```typescript
async function decideOnInterrupt(
  agent: Agent,
  interrupt: Interrupt
): Promise<Decision> {

  const prompt = `
You are ${agent.name}, ${agent.personality.summary}.

CURRENT TASK:
${agent.workingMemory.activeTask ?
  `You are ${agent.workingMemory.activeTask.description}.
   Still need: ${formatRemainingItems(agent.workingMemory.activeTask)}
   Notes: ${agent.workingMemory.activeTask.notes.join(", ")}` :
  "No specific task."}

LOCATION: ${agent.workingMemory.recentContext.location}
CAME FROM: ${agent.workingMemory.recentContext.arrivedFrom}

PENDING: ${formatPendingActions(agent.workingMemory.pendingActions)}

---

INTERRUPT: ${describeInterrupt(interrupt)}

What do you do?

Options:
${interrupt.suggestedActions?.map((a, i) => `${i + 1}. ${a}`).join("\n")}
${agent.workingMemory.activeTask ? `\nRemember: You still need to ${formatRemainingItems(agent.workingMemory.activeTask)}` : ""}

Respond with your choice and brief reasoning.
`;

  const response = await llm.complete(prompt);
  return parseDecision(response, interrupt.suggestedActions);
}
```

---

## Intent Stack (Suspending & Resuming)

When interrupted, don't lose track of what you were doing:

```typescript
function suspendCurrentIntent(agent: Agent): void {
  if (!agent.intent.currentIntent) return;

  // Save current state
  const suspended = {
    ...agent.intent.currentIntent,
    status: "suspended" as IntentStatus,
    suspendedAt: gameTime.now(),
    workingMemorySnapshot: { ...agent.workingMemory.activeTask },
  };

  // Push to stack
  agent.intent.intentStack.push(suspended);

  // Clear current
  agent.intent.currentIntent = null;
}

function resumeIntent(agent: Agent): boolean {
  if (agent.intent.intentStack.length === 0) return false;

  // Pop most recent suspended intent
  const resumed = agent.intent.intentStack.pop()!;

  // Check if still valid
  if (isIntentStillValid(agent, resumed)) {
    // Resume
    resumed.status = "active";
    agent.intent.currentIntent = resumed;

    // Restore working memory
    if (resumed.workingMemorySnapshot) {
      agent.workingMemory.activeTask = resumed.workingMemorySnapshot;
    }

    // Continue where we left off
    const remainingGoal = resumed.subgoals[resumed.currentSubgoal];
    if (remainingGoal?.target) {
      setDestination(agent, remainingGoal.target as Position);
    }

    return true;
  }

  // Intent no longer valid - try next
  return resumeIntent(agent);
}

// Check if suspended intent is still worth doing
function isIntentStillValid(agent: Agent, intent: Intent): boolean {
  // Check timeout
  if (intent.timeout) {
    const elapsed = gameTime.ticksSince(intent.startTime);
    if (elapsed > intent.timeout) return false;
  }

  // Check if goal still makes sense
  if (intent.type === "acquire") {
    const items = intent.goal.target as ItemType[];
    // Already have the items?
    for (const item of items) {
      if (agent.inventory.has(item)) {
        return false;  // Already done
      }
    }
  }

  // Check if conditions changed
  if (intent.failureCondition) {
    if (evaluateCondition(agent, intent.failureCondition)) {
      return false;
    }
  }

  return true;
}
```

---

## Example: Shopping Trip

```typescript
// Agent decides to go shopping
async function createShoppingIntent(
  agent: Agent,
  items: string[]
): Promise<void> {

  // Create the intent
  const intent: Intent = {
    id: generateId(),
    type: "acquire",
    description: "Shopping for dinner supplies",
    goal: {
      description: `Get ${items.join(", ")}`,
      type: "acquire_items",
      completed: false,
    },
    subgoals: [
      { description: "Go to market", type: "travel", target: marketPosition },
      ...items.map(item => ({
        description: `Buy ${item}`,
        type: "acquire_item",
        target: item,
        completed: false,
      })),
      { description: "Return home", type: "travel", target: agent.home },
    ],
    reason: "Need ingredients for dinner",
    origin: agent.position,
    startTime: gameTime.now(),
    status: "active",
    progress: 0,
    currentSubgoal: 0,
    successCondition: { type: "has_items", items },
  };

  agent.intent.currentIntent = intent;

  // Set up working memory
  agent.workingMemory.activeTask = {
    description: "Shopping for dinner",
    items: items.map(item => ({
      item,
      quantity: 1,
      acquired: false,
    })),
    progress: new Map(),
    notes: [],
  };

  // Start moving to market
  setDestination(agent, marketPosition);
}

// Scenario: Agent is walking to market, meets friend
async function scenarioMeetFriend(agent: Agent): Promise<void> {

  // Agent is walking...
  // [movement ticks happen, no LLM]
  // ...
  // Friend appears in path

  const friend = getAgent("friend_id");

  // Interrupt triggered
  const interrupt: Interrupt = {
    type: "encountered_agent",
    priority: 0.5,  // Medium - friend, but busy
    data: { agent: friend },
    requiresDecision: true,
    suggestedActions: [
      "stop_and_chat",
      "wave_and_continue",
      "quick_greeting",
      "ask_if_they_know_where_to_find_mussels",
    ],
  };

  // LLM decides based on FULL working memory context
  // Prompt includes: "You're shopping for blueberries and mussels"
  // LLM might respond: "Quick greeting, still need to get mussels"

  const decision = await handleInterrupt(agent, interrupt);

  if (decision.action === "stop_and_chat") {
    // Suspend shopping intent
    suspendCurrentIntent(agent);

    // Have conversation
    await startConversation(agent, friend);

    // After conversation ends...
    // Resume shopping intent automatically
    resumeIntent(agent);

    // Agent remembers: "Still need mussels and blueberries"
    // Continues to market
  } else {
    // Brief interaction, continue walking
    await quickGreeting(agent, friend);
    // Movement continues, no intent change
  }
}
```

---

## Automatic Resumption

After interrupts resolve, automatically check for resumption:

```typescript
async function onInterruptResolved(agent: Agent): Promise<void> {
  // No current intent = check stack
  if (!agent.intent.currentIntent) {
    if (agent.intent.intentStack.length > 0) {
      // Try to resume
      const resumed = resumeIntent(agent);

      if (resumed) {
        // Inform agent what they're doing
        const current = agent.intent.currentIntent!;
        console.log(`${agent.name} resumes: ${current.description}`);

        // Working memory already restored
        // Continue from where we left off
      } else {
        // All suspended intents invalid
        // LLM decides what to do next
        await decideNextAction(agent);
      }
    } else {
      // Nothing suspended, decide freely
      await decideNextAction(agent);
    }
  }
}
```

---

## Alien Movement & Intent

Different consciousness types have fundamentally different movement and intent systems.

### Pack Mind Multi-Body Movement

Pack minds coordinate multiple bodies with one intent:

```typescript
interface PackMovementState {
  packId: string;
  bodies: PackBodyMovement[];

  // Pack-wide intent (one mind, multiple bodies)
  packIntent: Intent;

  // Movement coordination
  formation: PackFormation;
  coherenceTarget: number;           // Must stay within range

  // Multi-body working memory
  packWorkingMemory: PackWorkingMemory;
}

interface PackBodyMovement {
  bodyId: string;
  position: Position;
  destination: Position | null;
  role: PackBodyRole;

  // Body-specific movement
  path: Position[];
  currentPathIndex: number;

  // Coordination status
  inFormation: boolean;
  distanceFromPackCenter: number;
  coherenceContribution: number;
}

type PackFormation =
  | "cluster"              // Tight group
  | "line"                 // Single file
  | "surround"             // Circle around point
  | "scattered"            // Spread for coverage
  | "wedge"                // V formation
  | "protect";             // Some bodies guard others

interface PackWorkingMemory extends WorkingMemory {
  // Additional pack-specific tracking
  bodyAssignments: Map<string, string>;  // Body ID → specific task
  coordinatedAction: boolean;             // All bodies same task?

  // Spatial awareness from all bodies
  combinedVisibility: Position[];

  // Role-specific tasks
  thinkerFocus: string;                   // What the thinker is pondering
  sensorAlerts: SensorAlert[];            // What sensors have detected
  manipulatorTasks: string[];             // What manipulators are handling
}

// Pack movement tick - coordinates all bodies
function packMovementTick(pack: PackMind): void {
  // Check coherence first
  const coherence = calculatePackCoherence(pack);

  if (coherence < pack.coherenceTarget) {
    // EMERGENCY: bodies too far apart
    // Override individual tasks to reunite
    for (const body of pack.bodies) {
      if (body.distanceFromPackCenter > pack.coherenceRange) {
        body.destination = pack.centerOfMass;
        body.path = calculatePath(body.position, pack.centerOfMass);
        body.inFormation = false;
      }
    }
    return;
  }

  // Normal coordinated movement
  switch (pack.formation) {
    case "cluster":
      moveAsCluster(pack);
      break;
    case "scattered":
      moveSpreading(pack);
      break;
    case "surround":
      moveSurrounding(pack, pack.packIntent.goal.target as Position);
      break;
    default:
      moveAsCluster(pack);
  }
}

// Pack intent is shared - one LLM call for entire pack
async function packDecideOnInterrupt(
  pack: PackMind,
  interrupt: Interrupt
): Promise<Decision> {

  // The pack thinks as one
  const prompt = `
You are ${pack.name}, a pack mind with ${pack.bodies.length} bodies.

YOUR BODIES:
${pack.bodies.map(b => `- ${b.id}: ${b.role} at ${b.position}`).join("\n")}

CURRENT TASK: ${pack.packIntent.description}

BODY ASSIGNMENTS:
${formatBodyAssignments(pack.workingMemory.bodyAssignments)}

INTERRUPT: ${describeInterrupt(interrupt)}
${interrupt.affectsBody ? `Affects body: ${interrupt.affectedBody}` : "Affects whole pack"}

What do you do? You can:
- Respond with whole pack
- Assign specific bodies to respond
- Continue with some bodies, respond with others

Remember: You are ONE mind in many bodies.
`;

  return await llm.complete(prompt);
}

// Pack can split attention across bodies
interface PackMultiTask {
  // Different bodies can do different subtasks
  // But they're all part of ONE intent

  primaryTask: Intent;
  bodySubtasks: Map<string, SubTask>;

  // Example: Shopping with pack
  // - Sensor body watches for friends
  // - Manipulator body carries items
  // - Thinker body negotiates prices
  // - All are "shopping" together
}
```

### Hive Swarm Coordination

Hive workers move according to hive will:

```typescript
interface HiveMovementState {
  hiveId: string;
  workerMovements: Map<string, WorkerMovement>;

  // Queen's coordination
  queenDirectives: QueenDirective[];

  // Swarm behavior
  swarmMode: SwarmMode;
  swarmTarget?: Position;
}

interface WorkerMovement {
  workerId: string;
  position: Position;
  destination: Position | null;

  // Current directive
  activeDirective: QueenDirective | null;

  // Autonomy level
  autonomy: number;                      // 0 = pure extension, 100 = some initiative

  // Intent (if any)
  // Workers have minimal intent - mostly follow orders
  currentTask: string | null;
}

interface QueenDirective {
  id: string;
  type: DirectiveType;
  priority: number;
  targetWorkers: string[] | "all" | "caste";

  // What to do
  task: string;
  destination?: Position;

  // Coordination
  requiresCoordination: boolean;
  coordinationMethod?: "swarm" | "relay" | "independent";
}

type DirectiveType =
  | "gather"               // Collect resources
  | "build"                // Construct
  | "defend"               // Protect area
  | "attack"               // Assault target
  | "explore"              // Scout area
  | "return"               // Come back to hive
  | "swarm";               // Mass movement

type SwarmMode =
  | "dispersed"            // Workers spread out
  | "gathering"            // Converging on point
  | "flowing"              // Moving as mass
  | "stationary";          // No swarm movement

// Workers don't have individual LLM calls
// Queen coordinates via directives
function workerMovementTick(hive: Hive, worker: Agent): void {
  const movement = hive.workerMovements.get(worker.id);
  if (!movement) return;

  // Check for new directives
  const directive = getActiveDirective(hive, worker);

  if (directive) {
    // Follow directive
    if (directive.destination && worker.position !== directive.destination) {
      movement.destination = directive.destination;
      movement.path = calculatePath(worker.position, directive.destination);
    }

    if (directive.task) {
      movement.currentTask = directive.task;
    }
  }

  // Move toward destination
  if (movement.destination) {
    moveAlongPath(worker, movement);
  }

  // NO LLM call for individual workers
  // Queen decides, workers execute
}

// Swarm movement - coordinated mass movement
function swarmMovement(hive: Hive, target: Position): void {
  hive.swarmMode = "flowing";
  hive.swarmTarget = target;

  // All workers move toward target
  // But they don't all path individually
  // They flow as a mass

  for (const [workerId, movement] of hive.workerMovements) {
    // Each worker moves toward target
    // But influenced by nearby workers (flocking)
    const localDirection = calculateSwarmDirection(
      hive,
      workerId,
      target
    );

    movement.destination = addDirection(movement.position, localDirection);
  }
}

// Flocking behavior for swarm
function calculateSwarmDirection(
  hive: Hive,
  workerId: string,
  globalTarget: Position
): Direction {
  const worker = hive.workerMovements.get(workerId)!;
  const nearbyWorkers = getNearbyWorkers(hive, workerId, 3);

  // Flocking rules
  const separation = calculateSeparation(worker, nearbyWorkers);
  const alignment = calculateAlignment(worker, nearbyWorkers);
  const cohesion = calculateCohesion(worker, nearbyWorkers);
  const target = directionTo(worker.position, globalTarget);

  // Combine influences
  return combineDirections([
    { dir: separation, weight: 0.3 },
    { dir: alignment, weight: 0.2 },
    { dir: cohesion, weight: 0.2 },
    { dir: target, weight: 0.3 },
  ]);
}
```

### Symbiont Dual-Consciousness Intent

Joined beings may have conflicting intents:

```typescript
interface SymbiontMovementState {
  hostId: string;
  symbiontId: string;
  joinedId: string;

  // Two consciousness, one body
  hostIntent: Intent | null;
  symbiontIntent: Intent | null;

  // Which is dominant right now
  currentDominance: "host" | "symbiont" | "merged";

  // Conflict resolution
  intentConflict: IntentConflict | null;

  // Combined working memory
  combinedWorkingMemory: CombinedWorkingMemory;
}

interface IntentConflict {
  hostWants: Intent;
  symbiontWants: Intent;
  conflictType: "destination" | "goal" | "priority" | "approach";
  resolution: ConflictResolution | null;
}

type ConflictResolution =
  | "host_wins"            // Host's intent prevails
  | "symbiont_wins"        // Symbiont's intent prevails
  | "compromise"           // Modified intent
  | "sequential"           // Do both, one then other
  | "deadlock";            // Can't move until resolved

interface CombinedWorkingMemory extends WorkingMemory {
  // Host's current thinking
  hostThoughts: string[];

  // Symbiont's current thinking
  symbiontThoughts: string[];

  // Past host influences
  pastHostSuggestions: PastHostSuggestion[];

  // Integration level affects memory sharing
  integrationLevel: number;
}

interface PastHostSuggestion {
  hostName: string;
  suggestion: string;
  relevance: number;
  accepted: boolean;
}

// Joined being decision - more complex
async function joinedDecideOnInterrupt(
  joined: JoinedBeing,
  interrupt: Interrupt
): Promise<Decision> {

  // Both consciousnesses weigh in

  // Host perspective
  const hostDecision = await getHostPerspective(joined, interrupt);

  // Symbiont perspective (includes past host wisdom)
  const symbiontDecision = await getSymbiontPerspective(joined, interrupt);

  if (hostDecision.action === symbiontDecision.action) {
    // Agreement - proceed
    return hostDecision;
  }

  // Conflict - must resolve
  const conflict: IntentConflict = {
    hostWants: hostDecision.asIntent,
    symbiontWants: symbiontDecision.asIntent,
    conflictType: determineConflictType(hostDecision, symbiontDecision),
    resolution: null,
  };

  // Resolution based on integration and urgency
  const resolution = resolveInternalConflict(joined, conflict);

  switch (resolution) {
    case "host_wins":
      // Symbiont notes disagreement but defers
      joined.symbiont.internalNotes.push(
        `Disagreed about ${interrupt.type}, deferred to host`
      );
      return hostDecision;

    case "symbiont_wins":
      // Host feels the symbiont's urgency
      joined.host.internalNotes.push(
        `Symbiont insisted on ${symbiontDecision.action}`
      );
      return symbiontDecision;

    case "compromise":
      // Create merged response
      return createCompromiseDecision(hostDecision, symbiontDecision);

    case "deadlock":
      // Can't decide - visible hesitation
      return {
        action: "hesitate",
        reasoning: "Internal conflict unresolved",
        visible: true,  // Others can see confusion
      };
  }
}

// Past hosts occasionally "speak up"
function checkPastHostInput(
  joined: JoinedBeing,
  situation: Situation
): PastHostSuggestion[] {

  const suggestions: PastHostSuggestion[] = [];

  for (const pastHost of joined.symbiont.pastHosts) {
    // Check if this situation is relevant to past host
    const relevance = calculateRelevance(pastHost, situation);

    if (relevance > 0.7) {
      // Past host has something to say
      suggestions.push({
        hostName: pastHost.name,
        suggestion: generatePastHostSuggestion(pastHost, situation),
        relevance,
        accepted: false,
      });
    }
  }

  return suggestions;
}

// Example: Past host was an expert in this situation
function pastHostExpertise(joined: JoinedBeing, domain: string): number {
  let maxExpertise = 0;

  for (const pastHost of joined.symbiont.pastHosts) {
    const expertise = pastHost.skills.get(domain) || 0;
    if (expertise > maxExpertise) {
      maxExpertise = expertise;
    }
  }

  // Current host can access this expertise
  // But it feels like "someone else's knowledge"
  return maxExpertise * joined.integrationLevel;
}
```

### Geological-Scale Movement

Beings that move on timescales incomprehensible to mortals:

```typescript
interface GeologicalMovement {
  beingId: string;

  // Movement measured in decades
  currentPosition: Position;
  targetPosition: Position | null;
  movementStarted: GameTime;
  expectedArrival: GameTime;          // Years from now

  // Speed relative to mortals
  speedInTilesPerYear: number;        // Very slow

  // Intent on geological timescale
  geologicalIntent: GeologicalIntent;
}

interface GeologicalIntent {
  description: string;
  timescale: "century" | "millennium" | "eon";

  // Goals that make sense on this scale
  goal: GeologicalGoal;

  // Progress is imperceptible to mortals
  progress: number;                   // Over centuries
}

type GeologicalGoal =
  | { type: "observe_area"; region: BoundingBox; duration: number }
  | { type: "shape_landscape"; area: Position; change: string }
  | { type: "guide_civilization"; target: string; guidance: string }
  | { type: "rendezvous"; otherBeing: string; location: Position };

// Geological movement tick runs YEARLY, not per-frame
function geologicalMovementTick(being: GeologicalBeing): void {
  // Only check once per game year
  if (!isNewGameYear()) return;

  if (being.targetPosition) {
    const distance = calculateDistance(being.currentPosition, being.targetPosition);
    const yearlyprogress = being.speedInTilesPerYear;

    if (distance <= yearlyprogress) {
      // Arrived (after decades)
      being.currentPosition = being.targetPosition;
      being.targetPosition = null;

      // Trigger geological "interrupt"
      triggerGeologicalInterrupt(being, {
        type: "arrived_at_destination",
        after: "decades of travel",
      });
    } else {
      // Move tiny amount
      being.currentPosition = moveToward(
        being.currentPosition,
        being.targetPosition,
        yearlyprogress
      );
    }
  }
}

// Geological LLM calls are very rare
// Once per century, not per interaction
async function geologicalDecision(
  being: GeologicalBeing
): Promise<GeologicalIntent> {

  // Only consulted on vast timescales
  // Last decision: 300 years ago
  // Next decision: maybe in 200 years

  const prompt = `
You are ${being.name}, a being who thinks in millennia.

CURRENT EPOCH: ${currentEpoch.name}
TIME SINCE LAST THOUGHT: ${being.yearsSinceLastDecision} years

WHAT YOU'VE OBSERVED:
${formatCenturiesOfObservation(being.observations)}

CIVILIZATIONS IN YOUR AWARENESS:
${formatCivilizationSummaries(being.knownCivilizations)}

PREVIOUS INTENT (${being.geologicalIntent.timescale}):
${being.geologicalIntent.description}
Progress: ${being.geologicalIntent.progress}%

Consider: What is worth doing on a timescale of centuries?

Respond with your intent for the next few centuries.
`;

  const response = await llm.complete(prompt);
  return parseGeologicalIntent(response);
}
```

---

## Summary

| Component | Handled By |
|-----------|------------|
| **Movement steps** | Game engine (pathfinding) |
| **High-level intent** | LLM (infrequently) |
| **Interrupts** | LLM (when triggered) |
| **Task context** | Working memory (always available) |
| **Resumption** | Automatic from intent stack |

Key principles:
- **LLM is expensive** - only call for meaningful decisions
- **Working memory persists** - agents remember what they're doing
- **Interrupts don't erase** - suspended intents can be resumed
- **Movement is cheap** - pathfinding runs every tick without LLM

---

## Related Specs

- `agent-system/spec.md` - Agent architecture
- `agent-system/memory-system.md` - Long-term episodic memory
- `agent-system/spatial-memory.md` - Location knowledge

