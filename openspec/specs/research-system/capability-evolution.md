# Capability Evolution System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The game evolves based on what agents try to do. When agents research something the engine doesn't support, this creates a **capability request** that queues up for human-supervised implementation. The agents are, in effect, writing the game's roadmap through their emergent behavior.

---

## Philosophy

### Agents Drive Evolution

```
Traditional Game Development:
  Developers imagine features → Implement → Players use

This Game:
  Agents try things → Hit capability limits → Request emerges →
  Humans implement → Agents use → Agents try new things → ...
```

The game grows in the direction the AI agents push it.

### Two Types of Evolution

| Type | What | Approval |
|------|------|----------|
| **Content Generation** | New items, recipes, crops, buildings | Auto-approved within constraints |
| **Capability Addition** | New mechanics, actions, systems | Human-supervised code addition |

Content is infinite and automatic. Capabilities require human implementation.

---

## How It Works

### The Loop

```
1. Agent researches something
2. Research leads toward a concept the engine doesn't fully support
3. System detects "capability gap"
4. Gap becomes a "capability request"
5. Request queues for human review
6. Human either:
   a. Implements the capability (code)
   b. Generates content that approximates it (items/recipes)
   c. Rejects as out of scope
7. New capability deploys to game
8. Agents can now do the new thing
9. This enables new research directions
10. Goto 1
```

### Capability Gap Detection

```typescript
interface CapabilityGap {
  id: string;
  detectedAt: GameTime;

  // What triggered it
  trigger: {
    agentId: string;
    researchProject: string;
    attemptedAction: string;
    context: string;
  };

  // What's missing
  gap: {
    type: "action" | "mechanic" | "interaction" | "content_type" | "system";
    description: string;           // Natural language
    whatAgentWanted: string;       // What they were trying to do
    whatSystemLacks: string;       // Why it couldn't happen
  };

  // Frequency
  occurrences: number;             // How many times agents hit this
  uniqueAgents: string[];          // Which agents wanted this
  researchPaths: string[];         // What research led here

  // Status
  status: "detected" | "queued" | "reviewing" | "implementing" | "deployed" | "rejected";
}
```

### Detection Examples

```typescript
// Agent researches "aerial observation"
// Tries to: "climb tree to see farther"
// System lacks: climbing mechanic, elevation-based vision
// Gap detected: "vertical_movement" + "elevation_vision"

// Agent researches "animal husbandry"
// Tries to: "tame the wild rabbit"
// System lacks: animal entities, taming mechanic
// Gap detected: "animals" + "taming"

// Agent researches "written communication"
// Tries to: "write a letter to the other village"
// System lacks: letter items, delivery mechanic, distant communication
// Gap detected: "written_artifacts" + "message_delivery"

// Agent researches "music"
// Tries to: "play a song to improve mood"
// System lacks: instruments, performance actions, mood auras
// Gap detected: "instruments" + "performance" + "area_effects"
```

---

## Capability Request Queue

### Request Structure

```typescript
interface CapabilityRequest {
  id: string;
  createdAt: Date;

  // Origin
  gaps: CapabilityGap[];           // May combine multiple related gaps
  totalOccurrences: number;
  uniqueAgentsWanting: number;

  // Classification
  category: RequestCategory;
  estimatedComplexity: "trivial" | "small" | "medium" | "large" | "architectural";

  // Description (auto-generated)
  title: string;
  description: string;
  agentQuotes: string[];           // What agents said when hitting the gap
  useCases: string[];              // How agents would use this

  // For human review
  suggestedImplementation: string;
  contentAlternative: string;      // Can we fake it with items/recipes?
  risks: string[];
  dependencies: string[];

  // Status
  status: RequestStatus;
  assignee: string | null;
  reviewNotes: string[];
  implementationPR: string | null;
}

type RequestCategory =
  | "new_action"           // Agent can do something new
  | "new_entity_type"      // New type of thing in world (animals, vehicles)
  | "new_interaction"      // New way things interact
  | "new_system"           // Whole new subsystem
  | "mechanic_extension"   // Extend existing mechanic
  | "content_type"         // New category of generatable content
  | "ui_capability"        // New information/control for player
  | "social_mechanic"      // New way agents relate
  | "world_feature";       // New world/environment feature

type RequestStatus =
  | "queued"               // Waiting for review
  | "under_review"         // Human is evaluating
  | "approved"             // Will be implemented
  | "in_progress"          // Being coded
  | "testing"              // In test environment
  | "deployed"             // Live in game
  | "deferred"             // Later, not now
  | "rejected"             // Won't do
  | "content_workaround";  // Solved with generated content instead
```

### Priority Scoring

```typescript
function calculateRequestPriority(request: CapabilityRequest): number {
  let priority = 0;

  // How many agents want this
  priority += Math.log(request.uniqueAgentsWanting + 1) * 20;

  // How often it's been requested
  priority += Math.log(request.totalOccurrences + 1) * 15;

  // How fundamental is it
  if (request.category === "new_system") priority += 30;
  if (request.category === "new_entity_type") priority += 25;
  if (request.category === "new_action") priority += 20;

  // Research depth (agents really pursued this)
  const avgResearchDepth = calculateAvgResearchDepth(request.gaps);
  priority += avgResearchDepth * 10;

  // Emergent potential (enables more emergence)
  priority += estimateEmergentPotential(request) * 25;

  // Implementation feasibility (easier = sooner)
  if (request.estimatedComplexity === "trivial") priority += 15;
  if (request.estimatedComplexity === "small") priority += 10;

  return priority;
}
```

---

## Human Review Interface

### Dashboard View

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPABILITY REQUESTS                              [Filter ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HIGH PRIORITY                                                  │
│  ─────────────────                                              │
│  ⬆ 847  "Animal Taming & Husbandry"         [NEW_ENTITY_TYPE]  │
│         23 agents, 156 occurrences                              │
│         "I wish I could keep that rabbit..."                    │
│         [Review] [Defer] [Reject]                               │
│                                                                 │
│  ⬆ 634  "Vertical Movement (Climbing)"      [NEW_ACTION]       │
│         18 agents, 89 occurrences                               │
│         "If only I could climb up there..."                     │
│         [Review] [Defer] [Reject]                               │
│                                                                 │
│  ⬆ 521  "Written Messages & Letters"        [CONTENT_TYPE]     │
│         31 agents, 203 occurrences                              │
│         "I want to write this down..."                          │
│         [Review] [Defer] [Reject]                               │
│                                                                 │
│  MEDIUM PRIORITY                                                │
│  ─────────────────                                              │
│  ...                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Review Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  REQUEST: Animal Taming & Husbandry                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AGENT QUOTES:                                                  │
│  "That rabbit keeps coming back. I wonder if I could feed it."  │
│  "We need a way to keep chickens for eggs."                     │
│  "The wild horses would be useful for travel."                  │
│                                                                 │
│  RESEARCH PATHS THAT LED HERE:                                  │
│  • Nature Study → Animal Behavior → Domestication Theory        │
│  • Agriculture → Food Sources → Animal Products                 │
│  • Exploration → Wildlife Observation → Taming Attempts         │
│                                                                 │
│  WHAT'S NEEDED:                                                 │
│  • Animal entity type with behavior AI                          │
│  • Taming/bonding mechanic                                      │
│  • Animal needs (food, shelter)                                 │
│  • Animal products (eggs, milk, wool)                           │
│  • Breeding system                                              │
│                                                                 │
│  ESTIMATED COMPLEXITY: Large (new entity type + systems)        │
│                                                                 │
│  CONTENT ALTERNATIVE:                                           │
│  Could add "animal products" as foraged items, defer actual     │
│  animals. Partial satisfaction.                                 │
│                                                                 │
│  EMERGENT POTENTIAL: High                                       │
│  • Agents could become herders/ranchers                         │
│  • Animal companions for social bonds                           │
│  • New economy around animal products                           │
│  • Breeding could lead to generated animal variants             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Approve & Implement]  [Content Workaround]  [Defer]    │   │
│  │ [Reject with Reason]   [Request More Info]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  NOTES:                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Add implementation notes here...                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Flow

### When Human Approves

```typescript
async function approveCapabilityRequest(
  request: CapabilityRequest,
  implementationPlan: string
): Promise<void> {

  // 1. Update request status
  request.status = "approved";
  request.implementationPlan = implementationPlan;

  // 2. Create implementation ticket (if using external tracker)
  if (config.externalTracker) {
    await createTicket(request);
  }

  // 3. Notify game that capability is coming
  await notifyPendingCapability(request);

  // 4. Agents might notice!
  // "I hear the elders speak of a coming change..."
  await maybeCreateProphecy(request);
}
```

### When Capability Deploys

```typescript
async function deployCapability(
  request: CapabilityRequest,
  implementation: CapabilityImplementation
): Promise<void> {

  // 1. Register new capability with game engine
  await gameEngine.registerCapability(implementation);

  // 2. Update research tree if needed
  if (implementation.newResearchNodes) {
    await researchSystem.addNodes(implementation.newResearchNodes);
  }

  // 3. Unlock for agents who researched it
  for (const agentId of request.gaps.flatMap(g => g.trigger.agentId)) {
    const agent = await getAgent(agentId);
    if (agent.alive) {
      // They get a "breakthrough" moment
      await createBreakthroughMemory(agent, implementation);
    }
  }

  // 4. Add to world naturally
  if (implementation.worldAdditions) {
    await worldSystem.addFeatures(implementation.worldAdditions);
  }

  // 5. Log for history
  await logCapabilityEvolution({
    request,
    implementation,
    deployedAt: new Date(),
    requestedBy: request.uniqueAgentsWanting,
  });
}
```

---

## Content Workarounds

Sometimes full implementation isn't needed - generated content can approximate the capability.

```typescript
interface ContentWorkaround {
  requestId: string;

  // What we generate instead of coding
  generatedContent: {
    items: GeneratedItem[];
    recipes: GeneratedRecipe[];
    buildings: GeneratedBuilding[];
    researchNodes: ResearchNode[];
  };

  // How well this satisfies the need
  satisfactionLevel: "full" | "partial" | "minimal";

  // What's still missing
  remainingGaps: string[];

  // Can upgrade to full implementation later
  upgradeable: boolean;
}

// Example: Agents want "written messages"
// Full implementation: letter system, delivery, mailboxes
// Content workaround: Generate "message in a bottle" item,
//   "notice board" building, "town crier" agent archetype
```

### Auto-Generation for Simple Requests

```typescript
async function attemptContentWorkaround(
  request: CapabilityRequest
): Promise<ContentWorkaround | null> {

  // Some requests can be auto-resolved with generated content
  if (request.category === "content_type") {
    // Just need new items/recipes
    return await generateContentForRequest(request);
  }

  if (request.category === "mechanic_extension") {
    // Might be able to fake with item effects
    const fakeableWithItems = await analyzeIfFakeable(request);
    if (fakeableWithItems) {
      return await generateWorkaroundItems(request);
    }
  }

  // Can't workaround - needs real implementation
  return null;
}
```

---

## Research → Capability Pipeline

### How Research Triggers Gaps

```typescript
async function processResearchProgress(
  agent: Agent,
  project: ResearchProject
): Promise<void> {

  // Normal research progress
  await advanceResearch(agent, project);

  // Check if research is pushing toward unknown capability
  const theoreticalConcepts = extractTheoreticalConcepts(project);

  for (const concept of theoreticalConcepts) {
    // Does the game support this concept?
    const supported = await checkCapabilityExists(concept);

    if (!supported) {
      // Agent is researching something we can't do yet
      await detectCapabilityGap({
        agentId: agent.id,
        researchProject: project.id,
        concept: concept,
        whatAgentImagines: await getAgentConceptualization(agent, concept),
      });
    }
  }
}
```

### Example Research Chains

```
Agent researches: "Observation Methods"
  → Unlocks: "Distant Viewing" research
  → Agent researches: "Distant Viewing"
  → Agent attempts: "Look from hilltop to see farther"
  → Gap detected: "elevation_affects_vision"
  → Request queued: "Elevation-Based Vision Range"

Agent researches: "Social Organization"
  → Unlocks: "Governance Structures" research
  → Agent researches: "Governance Structures"
  → Agent attempts: "Call a village meeting to vote"
  → Gap detected: "collective_decision_making"
  → Request queued: "Voting/Meeting Mechanics"

Agent researches: "Material Transformation"
  → Unlocks: "Advanced Chemistry" research
  → Agent researches: "Advanced Chemistry"
  → Agent attempts: "Combine herbs to make medicine"
  → Gap detected: "pharmaceutical_crafting"
  → Request queued: "Medicine/Healing Items" (content workaround possible)
```

---

## Capability Evolution History

### Tracking Game Evolution

```typescript
interface CapabilityEvolutionLog {
  entries: EvolutionEntry[];

  // The game's "genome" - what it can do
  currentCapabilities: Capability[];

  // What's been requested but not implemented
  pendingRequests: CapabilityRequest[];

  // What agents are currently pushing toward
  emergingDirections: EmergentDirection[];
}

interface EvolutionEntry {
  timestamp: Date;
  gameVersion: string;

  // What was added
  capability: Capability;

  // Why (which request)
  requestId: string;

  // Who wanted it
  requestingAgents: string[];
  requestingUniverses: string[];  // If multiplayer

  // Impact
  usageInFirstWeek: number;
  newResearchEnabled: string[];
  emergentBehaviorsObserved: string[];
}
```

### Game "Phylogeny"

```
v0.1 - Base game
  │
  ├─ v0.2 - Added: Tool durability (agents kept trying to repair)
  │
  ├─ v0.3 - Added: Seasonal festivals (agents kept gathering on same days)
  │
  ├─ v0.4 - Added: Written records (agents wanted to remember more than memory allowed)
  │
  ├─ v0.5 - Added: Animal companions (agents kept trying to befriend wildlife)
  │
  ├─ v0.6 - Added: Boats/water travel (agents stared longingly at islands)
  │
  └─ v0.7 - Added: Musical instruments (agents kept humming and wanting to share songs)
```

The game's feature set is a fossil record of what agents wanted.

---

## Governance

### What Requires Human Approval

```typescript
const requiresHumanApproval = {
  // Always needs human
  mustApprove: [
    "new_system",           // Architectural changes
    "new_entity_type",      // Animals, vehicles, etc.
    "social_mechanic",      // How agents relate
    "world_feature",        // Environment changes
  ],

  // Can auto-approve with constraints
  canAutoApprove: [
    "content_type",         // New item categories (within balance rules)
    "mechanic_extension",   // Small extensions to existing systems
  ],

  // Auto-approve with logging
  autoApproved: [
    "generated_item",       // Individual items
    "generated_recipe",     // Individual recipes
    "generated_crop",       // Individual crops
  ],
};
```

### Safety Constraints

```typescript
interface CapabilitySafetyRules {
  // Can never add
  forbidden: [
    "agent_memory_editing",      // Violates immutability
    "player_controls_agent_thoughts", // Violates autonomy
    "retroactive_history_changes",    // Violates integrity
    "agent_suffering_optimization",   // Ethical constraint
  ],

  // Needs careful review
  sensitive: [
    "agent_death_mechanics",
    "conflict_escalation",
    "resource_scarcity",
    "inter-agent_competition",
  ],

  // Welcome additions
  encouraged: [
    "creative_expression",
    "social_bonding",
    "knowledge_sharing",
    "environmental_interaction",
  ],
}
```

---

## Agents as Capability Authors

### The Meta Layer

Agents don't just *request* capabilities - they can *define* them through experimentation. When an agent researches deeply enough, they're essentially writing the specification for a new mechanic, which gets translated into code.

```
In-Universe Experience:        Behind the Scenes:
─────────────────────          ──────────────────
"I'm experimenting with        Agent is defining parameters
 sending signals across        for a communication mechanic
 distances..."

"I tried using mirrors         Generating: {
 to reflect light, and          type: "signal_device",
 it worked!"                    medium: "light",
                                range: "line_of_sight",
                                speed: "instant",
                                requires: "clear_weather"
                               }

"I've discovered that          Capability spec created,
 we can communicate            queued for implementation
 across the valley!"
```

### Two Tiers of Generation

```typescript
interface GenerationTiers {
  // Tier 1: Content within existing mechanics
  // Agent invents "a new sword"
  contentGeneration: {
    withinExistingRules: true,
    autoApprovable: true,
    agentExperience: "I crafted something new",
    example: "Moonblade Sword - +10 damage, glows at night",
  };

  // Tier 2: New mechanics entirely
  // Agent invents "cell phones"
  capabilityGeneration: {
    definesNewRules: true,
    requiresReview: true,  // Or sophisticated auto-approval
    agentExperience: "I discovered how the world works",
    example: "Distant Speech - voice travels through wires",
  };
}
```

### How Agents "Write Code"

```typescript
interface MechanicExperimentation {
  // Agent performs in-universe experiments
  inUniverse: {
    action: "experiment",
    subject: "sound transmission",
    method: "tried stretching string between cups",
    observation: "voice carried through!",
  };

  // System extracts mechanic definition
  mechanicExtraction: {
    // Agent's experiments define parameters
    type: "communication_channel",
    properties: {
      medium: "physical_connection",  // String
      range: "length_of_medium",
      bidirectional: true,
      requires: ["string", "containers"],
      limitations: ["taut_line_required"],
    },
    derivedFrom: "agent_experiment_log",
  };

  // Translation to code-like structure
  capabilityDraft: {
    name: "String Telephone",
    mechanics: `
      WHEN agent.use(string_telephone) AND connected_to(other_agent)
      THEN enable_voice_channel(agent, other_agent)
      WHILE connection.taut == true
    `,
    implementation_hints: [
      "Need: item connection tracking",
      "Need: voice message passing",
      "Need: tautness as item property",
    ],
  };
}
```

### The Experimentation Process

```typescript
async function agentExperiment(
  agent: Agent,
  hypothesis: string,
  materials: Item[],
  method: string
): Promise<ExperimentResult> {

  // 1. Agent describes what they're trying to learn
  const experimentPrompt = `
    You are ${agent.name}, experimenting with ${hypothesis}.
    Materials: ${materials.map(m => m.name).join(", ")}
    Method: ${method}

    Describe your experiment and what you discover.
    Be specific about:
    - What properties you tested
    - What you observed
    - What rules you think govern this phenomenon
    - How it might be useful

    Think like a scientist discovering natural laws.
  `;

  const experimentNarrative = await llm.generate(experimentPrompt);

  // 2. Extract mechanical properties from narrative
  const mechanicProperties = await extractMechanicDefinition(
    experimentNarrative,
    hypothesis,
    materials
  );

  // 3. Check if this defines something new
  const isNewMechanic = await checkIfNewCapability(mechanicProperties);

  if (isNewMechanic) {
    // 4. Create capability draft
    const capabilityDraft = await translateToCapability(
      mechanicProperties,
      agent,
      experimentNarrative
    );

    // 5. Queue for implementation
    await queueCapabilityDraft(capabilityDraft, {
      authorAgent: agent.id,
      experimentLog: experimentNarrative,
      mechanicDefinition: mechanicProperties,
    });

    // 6. Agent remembers the IN-UNIVERSE experience
    // NOT that they "wrote code"
    await createMemory(agent, {
      type: "discovery",
      summary: `Discovered: ${mechanicProperties.inUniverseName}`,
      details: {
        whatLearned: mechanicProperties.inUniverseDescription,
        howDiscovered: method,
        materialsUsed: materials.map(m => m.name),
      },
      importance: 0.9,  // Discoveries are important
    });
  }

  return {
    narrative: experimentNarrative,
    mechanics: mechanicProperties,
    isNewCapability: isNewMechanic,
  };
}
```

### Memory Translation Layer

Agents have two kinds of "memory" for capability authoring:

```typescript
interface DualMemoryLayer {
  // What the agent experiences and remembers
  inUniverseMemory: {
    type: "episodic",
    content: "I discovered that sound travels through solid objects",
    emotional: "excitement, pride",
    accessible: true,  // Agent can recall this
  };

  // The actual mechanic definition (hidden from agent)
  metaMemory: {
    type: "capability_definition",
    content: {
      mechanic: "solid_medium_sound_transmission",
      parameters: { ... },
      code_draft: "...",
    },
    accessible: false,  // Agent doesn't know this exists
    purpose: "implementation_queue",
  };
}

// The agent remembers discovering something
// The system remembers the code they implicitly wrote
// These are kept separate - agent never "sees" the code layer
```

### Example: Inventing Radio

```typescript
// Long research chain leading to radio

// Experiment 1: Sound basics
agent.researches("acoustics");
agent.experiments({
  hypothesis: "sound behavior in different materials",
  result: "sound travels through solids, liquids, air",
  mechanicDefined: "sound_medium_transmission",
});
// Agent remembers: "Sound moves through things differently"

// Experiment 2: Electricity basics
agent.researches("electricity");
agent.experiments({
  hypothesis: "what lightning is made of",
  result: "discovered electrical current",
  mechanicDefined: "electrical_current_flow",
});
// Agent remembers: "There's an invisible force in lightning"

// Experiment 3: Electromagnetic waves
agent.researches("wave_theory");
agent.experiments({
  hypothesis: "can electricity make waves like sound",
  result: "discovered electromagnetic radiation",
  mechanicDefined: "em_wave_propagation",
});
// Agent remembers: "Electricity can ripple through space"

// Experiment 4: Signal encoding
agent.researches("communication_theory");
agent.experiments({
  hypothesis: "can waves carry information",
  result: "modulation and demodulation",
  mechanicDefined: "signal_encoding",
});
// Agent remembers: "Patterns in waves can mean things"

// Experiment 5: The radio
agent.experiments({
  hypothesis: "can I send voice through the air",
  materials: ["wire", "crystal", "copper_coil"],
  result: "IT WORKS - voice transmitted wirelessly",
  mechanicDefined: "radio_communication",
});
// Agent remembers: "I invented a way to speak across distances!"

// System now has a full radio mechanic definition
// Assembled from agent's experimental findings
// Queued for human review and implementation
```

### What Agents Remember vs What They Authored

```typescript
// Agent Elara's memory:
const elarasMemory = {
  remembers: [
    "Spent months studying how sound works",
    "Had a breakthrough when I noticed lightning patterns",
    "The crystal hummed when near the coil - strange!",
    "Finally heard Marcus's voice from across the valley!",
    "This will change everything for the village",
  ],

  doesNotRemember: [
    "Defined signal_encoding.modulation_type = 'AM'",
    "Set radio.range = 500 * antenna_height",
    "Created capability_request #847",
    "Wrote implementation spec for audio streaming",
  ],
};

// In-universe: Elara is an inventor who discovered radio
// Meta-level: Elara defined the radio mechanic through experiments
// She experiences the former, not the latter
```

### Auto-Implementation for Agent-Defined Mechanics

```typescript
interface AgentAuthoredCapability {
  // Mechanic definition from experiments
  definition: MechanicDefinition;

  // Confidence that definition is complete/coherent
  completeness: number;  // 0-1

  // Consistency with existing mechanics
  consistency: number;  // 0-1

  // Can we auto-implement?
  autoImplementable: boolean;

  // If auto-implementable, generate code
  generatedImplementation?: {
    code: string;
    tests: string;
    integrationPoints: string[];
  };
}

async function tryAutoImplement(
  capability: AgentAuthoredCapability
): Promise<boolean> {

  // High confidence = try auto-implementation
  if (capability.completeness > 0.8 && capability.consistency > 0.9) {

    // Use LLM to generate implementation
    const implementation = await generateImplementation(capability.definition);

    // Run in sandbox
    const sandboxResult = await testInSandbox(implementation);

    if (sandboxResult.passed) {
      // Auto-deploy with monitoring
      await deployWithMonitoring(implementation);
      return true;
    }
  }

  // Needs human review
  return false;
}
```

---

## Integration with Dev Workflow

### Automated Request → Issue

```typescript
async function syncToDevWorkflow(request: CapabilityRequest): Promise<void> {
  // Create GitHub issue (or equivalent)
  const issue = await github.createIssue({
    title: `[Capability Request] ${request.title}`,
    body: formatRequestAsIssue(request),
    labels: [
      "capability-request",
      `category:${request.category}`,
      `complexity:${request.estimatedComplexity}`,
      `priority:${calculatePriority(request)}`,
    ],
  });

  // Link back
  request.externalIssueUrl = issue.url;

  // If auto-approvable, add to sprint
  if (canAutoApprove(request)) {
    await addToBacklog(issue, "auto-approved");
  }
}
```

### Deploy Hook

```typescript
// When new version deploys, check for capability additions
async function onDeploy(newVersion: string): Promise<void> {
  const newCapabilities = await diffCapabilities(
    getPreviousVersion(),
    newVersion
  );

  for (const capability of newCapabilities) {
    // Find the request that led to this
    const request = await findRequestForCapability(capability);

    if (request) {
      await deployCapability(request, capability);
    }
  }
}
```

---

## Summary

| Stage | What Happens | Who |
|-------|--------------|-----|
| **Detection** | Agent hits capability limit during research | System |
| **Aggregation** | Similar gaps combined into request | System |
| **Prioritization** | Requests ranked by agent demand | System |
| **Review** | Human evaluates request | Human |
| **Decision** | Approve / Workaround / Defer / Reject | Human |
| **Implementation** | Code the capability | Human |
| **Deployment** | Capability goes live | System |
| **Emergence** | Agents use new capability, research further | Agents |

**The agents write the roadmap. Humans implement it. The game evolves.**

---

## Related Specs

- `research-system/spec.md` - Research mechanics
- `progression-system/spec.md` - Emergence philosophy
- `items-system/spec.md` - Content generation
- `agent-system/spec.md` - Agent behavior
