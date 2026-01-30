# AI Agent System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

AI Agents are LLM-controlled villagers that make decisions based on personality, memories, and goals.

## Overview

AI Agents are the villagers inhabiting the forest village. Each agent is controlled by an open-source LLM that makes decisions about what actions to take based on their personality, memories, current situation, and goals. Agents can be configured with different traits, skills, and starting conditions through item-based scenarios.

---

## LLM Backend

### Supported Models

The system SHALL support open-source LLMs via standardized API:

| Model Family | Examples | Use Case |
|--------------|----------|----------|
| **Llama 3** | Llama-3.1-8B, Llama-3.1-70B | Primary agent reasoning |
| **Mistral** | Mistral-7B, Mixtral-8x7B | Fast decision making |
| **Qwen** | Qwen2.5-7B, Qwen2.5-72B | Multilingual support |
| **Phi** | Phi-3-mini | Lightweight/mobile |

### Backend Options

```typescript
interface LLMBackend {
  type: "ollama" | "vllm" | "llamacpp" | "openrouter" | "custom";
  endpoint: string;
  model: string;
  apiKey?: string; // For hosted services
  maxTokens: number;
  temperature: number;
}
```

**Local Options:**
- **Ollama:** Easy local deployment, model management
- **vLLM:** High-throughput serving for multiple agents
- **llama.cpp:** Lightweight, CPU-friendly

**Hosted Options:**
- **OpenRouter:** Access to multiple open-source models
- **Together.ai:** Inference API for open models
- **Self-hosted:** Custom deployment

---

## Agent Architecture

### Agent Definition

```typescript
interface Agent {
  id: string;
  name: string;

  // Visual
  spriteId: string;
  position: Position;

  // Personality (affects LLM prompting)
  personality: PersonalityTraits;

  // Skills (affect action success rates)
  skills: SkillSet;

  // Needs System (see needs.md for full hierarchy)
  // Replaces simple energy/mood with full Maslow-inspired hierarchy
  needs: AgentNeeds;

  // Memory Systems (see sub-specs for details)
  memory: {
    episodic: EpisodicMemory[];    // See memory-system.md
    spatial: SpatialMemory;         // See spatial-memory.md
    working: WorkingMemory;         // See movement-intent.md
  };

  // Intent & Movement (see movement-intent.md)
  intent: AgentIntent;

  // Relationships
  relationships: Relationship[];

  // Inventory
  inventory: Inventory;

  // Role (optional specialization)
  role?: AgentRole;

  // Animal ownership (see animal-system.md)
  ownedAnimals: string[];
}

type AgentRole =
  | "villager"          // Default
  | "leader"            // Village governance
  | "merchant"          // Trade focus
  | "researcher"        // Discovery focus
  | "historian"         // Records history (see chroniclers.md)
  | "journalist"        // Reports news (see chroniclers.md)
  | "herder"            // Animal focus
  | "explorer";         // Navigation focus
```

### Personality Traits

```typescript
interface PersonalityTraits {
  // Big Five inspired
  openness: number;      // 0-100: curious vs cautious
  conscientiousness: number; // 0-100: organized vs spontaneous
  extraversion: number;  // 0-100: social vs solitary
  agreeableness: number; // 0-100: cooperative vs competitive
  neuroticism: number;   // 0-100: sensitive vs resilient

  // Game-specific
  workEthic: number;     // How much they prioritize tasks
  creativity: number;    // Tendency to try new things
  generosity: number;    // Willingness to share/help
}
```

### Skills

```typescript
interface SkillSet {
  // Core skills
  farming: number;         // 0-100: crop yield, growth speed
  construction: number;    // 0-100: building speed, quality
  crafting: number;        // 0-100: item quality, variety
  foraging: number;        // 0-100: finding wild resources
  fishing: number;         // 0-100: catch rate, rare fish
  cooking: number;         // 0-100: food quality, recipes
  trading: number;         // 0-100: better prices
  research: number;        // 0-100: discovery speed
  socializing: number;     // 0-100: relationship building

  // Extended skills (see related specs)
  animalHandling: number;  // 0-100: taming, bonding (animal-system.md)
  writing: number;         // 0-100: chronicle quality (chroniclers.md)
  literacy: number;        // 0-100: reading, learning from texts
  leadership: number;      // 0-100: governance, key figure decisions
  navigation: number;      // 0-100: pathfinding, exploration efficiency

  // Conflict skills (see conflict-system.md)
  hunting: number;         // 0-100: tracking, killing wild animals
  combat: number;          // 0-100: fighting effectiveness
  intimidation: number;    // 0-100: dominance displays, threats
  stealth: number;         // 0-100: avoiding detection, ambush
}
```

---

## Requirements

### Requirement: Decision Making

Each agent SHALL make decisions via LLM inference.

#### Scenario: Agent turn arrives
- **WHEN** an agent's turn arrives in the game tick
- **THEN** the AgentSystem SHALL:
  - Gather context (surroundings, inventory, memories)
  - Format prompt with personality and situation
  - Send to LLM backend
  - Parse response into game action
  - Validate action is legal
  - Execute or report failure

### Requirement: Prompt Structure

Agent prompts SHALL follow this structure:

```typescript
interface AgentPrompt {
  systemPrompt: string;  // Role, personality, rules
  worldContext: string;  // Current situation
  memories: string;      // Relevant memories
  availableActions: string[]; // What they can do
  instruction: string;   // What to decide
}
```

**Example System Prompt:**
```
You are {name}, a villager in a forest village.

Personality:
- You are {openness > 70 ? "curious and adventurous" : "cautious and traditional"}
- You are {extraversion > 70 ? "outgoing and social" : "quiet and introspective"}
- You {agreeableness > 70 ? "love helping others" : "prefer to focus on your own goals"}

Skills: Farming ({farming}/100), Crafting ({crafting}/100), ...

Current Goal: {currentGoal.description}

Rules:
- Respond with a single action from the available actions
- Consider your energy level before choosing intensive tasks
- Your personality should influence your choices
```

### Requirement: Action System

Agents SHALL execute structured actions:

```typescript
type AgentAction =
  // Movement
  | { type: "move"; target: Position }
  | { type: "pathfind"; destination: Position }

  // Farming
  | { type: "till"; tile: Position }
  | { type: "plant"; tile: Position; seedId: string }
  | { type: "water"; tile: Position }
  | { type: "harvest"; tile: Position }

  // Construction
  | { type: "build"; buildingType: string; position: Position }
  | { type: "repair"; buildingId: string }
  | { type: "upgrade"; buildingId: string }

  // Items
  | { type: "craft"; recipeId: string }
  | { type: "use"; itemId: string; target?: string }
  | { type: "give"; itemId: string; targetAgentId: string }
  | { type: "drop"; itemId: string }
  | { type: "pickup"; itemId: string }

  // Social
  | { type: "talk"; targetAgentId: string; topic?: string }
  | { type: "trade"; targetAgentId: string; offer: TradeOffer }
  | { type: "help"; targetAgentId: string; taskId: string }

  // Research
  | { type: "research"; techId: string }
  | { type: "experiment"; materials: string[] }

  // Other
  | { type: "rest" }
  | { type: "forage"; area: Position }
  | { type: "fish"; waterTile: Position }
  | { type: "shop"; shopId: string; action: ShopAction };
```

### Requirement: Memory System

Agents SHALL maintain memories. See `agent-system/memory-system.md` for full architecture including episodic memory, reflection, and journaling.

```typescript
// Simplified memory interface - see memory-system.md for full EpisodicMemory
interface Memory {
  id: string;
  timestamp: GameTime;
  type: "observation" | "action" | "social" | "emotion";
  content: string;
  importance: number;  // 0-100
  emotionalValence: number; // -100 to 100
  relatedAgents: string[];
  relatedItems: string[];
  relatedLocations: Position[];
}
```

#### Scenario: Agent experiences an event
- **WHEN** an agent experiences an event
- **THEN** the memory system SHALL:
  - Create a Memory object
  - Calculate importance based on:
    - Novelty (first time seeing something)
    - Emotional impact
    - Relevance to goals
    - Social significance
  - Add to short-term memory
  - IF importance > 70, also add to long-term memory
  - IF short-term exceeds 20 entries, summarize oldest

### Requirement: Goal System

Agents SHALL pursue goals hierarchically:

```typescript
interface Goal {
  id: string;
  type: "survival" | "task" | "social" | "personal" | "community";
  description: string;
  priority: number;
  progress: number;      // 0-100
  subgoals: Goal[];
  prerequisites: string[];
  deadline?: GameTime;
}
```

**Goal Examples:**
- Survival: "Eat before energy drops to 0"
- Task: "Harvest the wheat field"
- Social: "Make friends with the new villager"
- Personal: "Master the cooking skill"
- Community: "Help build the town hall"

### Requirement: Agent Configuration via Items

Agents SHALL be configurable through scenario items:

```typescript
// Special items that modify agents when applied
interface AgentConfigItem {
  id: string;
  name: string;
  type: "trait_modifier" | "skill_book" | "memory_crystal" | "goal_scroll";

  // Effects
  traitModifiers?: Partial<PersonalityTraits>;
  skillModifiers?: Partial<SkillSet>;
  implantedMemories?: Memory[];
  assignedGoals?: Goal[];
}
```

**Example Config Items:**
- "Farmer's Almanac" - +20 farming skill
- "Extrovert's Charm" - +30 extraversion
- "Memory Crystal: Village Founding" - Implants shared memory
- "Quest Scroll: Build the Mill" - Assigns community goal

---

## Batching and Performance

### Requirement: Inference Batching

The system SHALL batch LLM requests.

#### Scenario: Multiple agents need decisions
- **WHEN** multiple agents need decisions in the same tick
- **THEN** the AgentSystem SHALL:
  - Collect all pending agent prompts
  - Batch into single API call (if backend supports)
  - Distribute responses to respective agents
  - Fall back to sequential if batch fails

### Requirement: Decision Caching

The system SHALL cache similar decisions.

#### Scenario: Similar situation encountered
- **WHEN** an agent faces a situation similar to a recent decision
- **THEN** the system MAY:
  - Check decision cache for matching context hash
  - IF cache hit with >90% context similarity
  - THEN reuse cached decision (with small random variation)
  - ELSE request new LLM inference

---

## Agent Archetypes

Predefined agent templates for quick setup:

| Archetype | Personality Focus | Primary Skills |
|-----------|-------------------|----------------|
| **Farmer** | High conscientiousness | Farming, Foraging |
| **Builder** | High openness | Construction, Crafting |
| **Merchant** | High extraversion | Trading, Socializing |
| **Scholar** | High openness, low extraversion | Research, Crafting |
| **Chef** | High agreeableness | Cooking, Farming |
| **Explorer** | High openness, low neuroticism | Foraging, Navigation |
| **Mayor** | High extraversion, conscientiousness | Leadership, Socializing |
| **Historian** | High conscientiousness, openness | Writing, Research |
| **Journalist** | High extraversion, openness | Writing, Socializing |
| **Hunter** | Low neuroticism, low agreeableness | Hunting, Stealth, Combat |
| **Guard** | High conscientiousness, low neuroticism | Combat, Intimidation |
| **Herder** | High agreeableness, conscientiousness | AnimalHandling, Farming |
| **Bard** | High extraversion, creativity | Writing, Socializing |

---

## Cybernetics and Augmentation

In sci-fi universes, agents can be augmented with cybernetic implants, neural interfaces, and HUDs. Since agents are LLM-controlled, these augmentations naturally integrate with their decision-making process.

### Augmentation Architecture

```typescript
interface AgentAugmentations {
  implants: CyberneticImplant[];
  interfaces: NeuralInterface[];
  externalDevices: ExternalDevice[];

  // Integration
  totalProcessingLoad: number;      // 0-1, how taxed the agent is
  incompatibilities: string[];       // Conflicting augmentations
  maintenanceNeeded: boolean;
}

interface CyberneticImplant {
  id: string;
  name: string;
  type: ImplantType;
  location: BodyLocation;

  // Effects
  capabilities: ImplantCapability[];
  skillModifiers: Map<string, number>;
  senseEnhancements: SenseEnhancement[];

  // Costs
  installationDifficulty: number;
  maintenanceInterval: number;       // Game days
  powerConsumption: number;
  rejection_risk: number;            // 0-1

  // Social
  visible: boolean;
  socialStigma: number;              // 0-1, culture-dependent
}

type ImplantType =
  | "neural"              // Brain augmentation
  | "sensory"             // Enhanced senses
  | "muscular"            // Strength/speed
  | "skeletal"            // Durability
  | "organic"             // Synthetic organs
  | "communication"       // Radio, network
  | "memory"              // Storage, recall
  | "interface"           // HUD, device control
  | "medical";            // Auto-healing, monitoring

type ImplantCapability =
  | { type: "skill_boost"; skill: string; amount: number }
  | { type: "new_ability"; ability: string }
  | { type: "sense_extension"; sense: string; range: number }
  | { type: "data_access"; dataType: string }
  | { type: "communication"; method: string; range: number }
  | { type: "memory_boost"; capacity: number; recall: number }
  | { type: "processing"; speedMultiplier: number }
  | { type: "hud_overlay"; features: string[] };
```

### HUD Systems

Heads-Up Displays provide agents with real-time information overlays.

```typescript
interface HUDSystem {
  id: string;
  type: HUDType;
  features: HUDFeature[];

  // Display
  alwaysOn: boolean;
  attentionCost: number;             // 0-1, cognitive load
  customizable: boolean;

  // Integration
  dataFeeds: DataFeed[];
  alerts: AlertConfiguration[];
}

type HUDType =
  | "implanted"           // Neural implant, always available
  | "glasses"             // External eyewear
  | "contact_lens"        // Augmented contacts
  | "holographic"         // Projected display
  | "gestalt";            // Shared with pack/hive

interface HUDFeature {
  id: string;
  name: string;
  description: string;

  // What it shows
  displayType: "overlay" | "sidebar" | "alert" | "ambient";
  dataSource: string;
  updateFrequency: "realtime" | "periodic" | "on_demand";

  // Agent behavior impact
  providesInformation: string[];
  enablesActions: string[];
  decisionInfluence: number;         // 0-1, how much it affects choices
}

// Standard HUD features
const standardHUDFeatures: HUDFeature[] = [
  {
    id: "health_monitor",
    name: "Health Monitor",
    description: "Real-time vitals and injury status",
    displayType: "sidebar",
    dataSource: "body_sensors",
    updateFrequency: "realtime",
    providesInformation: ["current_health", "injuries", "fatigue", "needs"],
    enablesActions: ["self_diagnose"],
    decisionInfluence: 0.3,
  },
  {
    id: "navigation",
    name: "Navigation Overlay",
    description: "Pathfinding, waypoints, and maps",
    displayType: "overlay",
    dataSource: "spatial_memory",
    updateFrequency: "realtime",
    providesInformation: ["current_location", "paths", "destinations", "hazards"],
    enablesActions: ["set_waypoint", "optimize_route"],
    decisionInfluence: 0.4,
  },
  {
    id: "social_tags",
    name: "Social Recognition",
    description: "Displays names, relationship status, faction",
    displayType: "overlay",
    dataSource: "relationship_memory",
    updateFrequency: "on_demand",
    providesInformation: ["agent_identity", "relationship_level", "faction", "mood_estimate"],
    enablesActions: ["lookup_history"],
    decisionInfluence: 0.5,
  },
  {
    id: "task_tracker",
    name: "Task Tracker",
    description: "Current goals and to-do items",
    displayType: "sidebar",
    dataSource: "goal_system",
    updateFrequency: "periodic",
    providesInformation: ["current_goals", "subtasks", "deadlines", "progress"],
    enablesActions: ["reprioritize", "delegate"],
    decisionInfluence: 0.6,
  },
  {
    id: "threat_detection",
    name: "Threat Detection",
    description: "Highlights dangers and hostile entities",
    displayType: "alert",
    dataSource: "sensors",
    updateFrequency: "realtime",
    providesInformation: ["threats", "threat_level", "escape_routes"],
    enablesActions: ["threat_assessment", "alert_allies"],
    decisionInfluence: 0.8,
  },
  {
    id: "resource_scanner",
    name: "Resource Scanner",
    description: "Detects materials, items, valuables",
    displayType: "overlay",
    dataSource: "sensors",
    updateFrequency: "on_demand",
    providesInformation: ["nearby_resources", "quality", "quantity"],
    enablesActions: ["tag_for_collection", "analyze_composition"],
    decisionInfluence: 0.3,
  },
  {
    id: "communication",
    name: "Comm Channel",
    description: "Network communication with other augmented agents",
    displayType: "sidebar",
    dataSource: "network",
    updateFrequency: "realtime",
    providesInformation: ["messages", "ally_locations", "broadcasts"],
    enablesActions: ["send_message", "request_assistance", "share_data"],
    decisionInfluence: 0.4,
  },
];

// How HUD affects LLM prompts
interface HUDPromptIntegration {
  // HUD data appears in agent's world context
  contextSection: "augmented_awareness";

  // Example prompt addition:
  // "Your HUD displays:
  //  - Health: 85% (minor fatigue)
  //  - Navigation: Workshop 50m NE, Home 200m S
  //  - Social: Nearby: Farmer_Bob (friend, mood: happy), Guard_Sara (neutral)
  //  - Tasks: [!] Deliver tools to smithy (overdue)
  //  - Alert: Unknown entity approaching from forest"

  // Agent can reference HUD in reasoning
  canReference: true;
  decisionWeight: number;            // How much agents trust HUD data
}
```

### Neural Interfaces

Direct brain-computer connections for advanced capabilities.

```typescript
interface NeuralInterface {
  id: string;
  type: NeuralInterfaceType;
  capabilities: NeuralCapability[];

  // Bandwidth
  dataRate: number;                  // Bits per second equivalent
  latency: number;                   // Processing delay
  multiChannel: boolean;             // Multiple simultaneous connections

  // Risks
  hacking_vulnerability: number;     // 0-1
  overload_risk: number;             // 0-1
  personality_drift: number;         // 0-1, identity effects
}

type NeuralInterfaceType =
  | "readonly"            // Can receive, not send
  | "readwrite"           // Full interface
  | "direct_control"      // Can control other devices
  | "mesh"                // Connect to network of minds
  | "backup";             // Memory/personality backup

type NeuralCapability =
  | "skill_download"      // Instantly learn skills (temporary)
  | "memory_share"        // Share memories with others
  | "machine_control"     // Control drones, vehicles
  | "network_access"      // Access information networks
  | "gestalt_link"        // Temporary mind-merge
  | "personality_backup"; // Save/restore personality

// Skill downloading (temporary expertise)
interface SkillDownload {
  skill: string;
  level: number;                     // Temporary skill level
  duration: number;                  // Game time before fade
  sideEffects: string[];             // Headache, confusion, etc.
  permanentRetention: number;        // 0-1, how much stays after
}

// Example: Combat skill download
const combatDownload: SkillDownload = {
  skill: "combat",
  level: 80,
  duration: 60,                      // 60 game minutes
  sideEffects: ["headache_after", "temporary_aggression", "memory_gaps"],
  permanentRetention: 0.05,          // Keep 5% permanently
};
```

### Augmentation in Different Cultures

```typescript
interface CultureAugmentationNorms {
  acceptance: AugmentationAcceptance;
  commonAugmentations: string[];
  forbiddenAugmentations: string[];
  socialEffects: Map<string, number>;  // Augmentation -> social modifier
}

type AugmentationAcceptance =
  | "mandatory"           // Required (hive, networked species)
  | "encouraged"          // Status symbol
  | "neutral"             // Personal choice
  | "stigmatized"         // Looked down upon
  | "forbidden";          // Illegal/taboo

const cultureAugmentations: CultureAugmentationNorms = {
  acceptance: "encouraged",
  commonAugmentations: ["basic_hud", "health_monitor", "comm_implant"],
  forbiddenAugmentations: [],        // None - full body autonomy
  socialEffects: new Map([
    ["none", -0.1],                  // Slight oddity for no augments
    ["basic", 0],                    // Normal
    ["extensive", 0.1],              // Slightly interesting
  ]),
};

const traditionalCultureAugmentations: CultureAugmentationNorms = {
  acceptance: "forbidden",
  commonAugmentations: [],
  forbiddenAugmentations: ["all_cybernetic"],
  socialEffects: new Map([
    ["none", 0],                     // Normal
    ["any", -0.8],                   // Severe stigma
  ]),
};

const hivemindAugmentations: CultureAugmentationNorms = {
  acceptance: "mandatory",
  commonAugmentations: ["hive_link", "pheromone_sensor", "role_identifier"],
  forbiddenAugmentations: ["individuality_enhancement"],
  socialEffects: new Map([
    ["none", -1.0],                  // Non-functional, rejected
    ["standard", 0],                 // Normal
  ]),
};
```

### Requirements

#### Requirement: Augmentation Integration

#### Scenario: Agent has augmentations installed
- **WHEN** an agent has augmentations installed
- **THEN** the AgentSystem SHALL:
  - Add augmentation capabilities to available actions
  - Include HUD data in world context for LLM
  - Apply skill modifiers from implants
  - Track maintenance schedules
  - Handle augmentation failures/malfunctions
  - Apply social modifiers based on culture

#### Requirement: HUD Information Flow

#### Scenario: Generating agent decision prompt with HUD
- **WHEN** generating an agent's decision prompt
- **AND** the agent has a HUD system
- **THEN** the prompt SHALL include:
  - All active HUD feature data
  - Current alerts and warnings
  - Communication channel status
  - Navigation/spatial data
  - Social recognition data for nearby agents

---

## Open Questions

1. How to handle LLM latency during gameplay? (async queuing?)
2. Should agents have private "thoughts" visible to player?
3. How deep should agent-to-agent conversations go?
4. Fallback behavior when LLM is unavailable?

---

## Related Specs

**Core Integration:**
- `game-engine/spec.md` - Game loop integration
- `items-system/spec.md` - Agent config items
- `economy-system/spec.md` - Trading behavior

**Embodiment & Transit:**
- `avatar-system/spec.md` - Physical embodiment, jack-in/jack-out
- `nexus-system/spec.md` - Multi-game transit, skill transfer, meta-goals

**Agent Sub-Systems:**
- `agent-system/needs.md` - Full needs hierarchy (replaces energy/mood)
- `agent-system/memory-system.md` - Episodic memory, reflection, journaling
- `agent-system/spatial-memory.md` - Location knowledge, fog of war
- `agent-system/movement-intent.md` - Working memory, interrupts, pathfinding
- `agent-system/chroniclers.md` - Historian, journalist, bard agents

**Social Systems:**
- `agent-system/conversation-system.md` - How agents talk to each other
- `agent-system/relationship-system.md` - How bonds form and change
- `agent-system/lifecycle-system.md` - Birth, death, aging, generations

**Related Systems:**
- `animal-system/spec.md` - Animal taming, handling skill
- `world-system/abstraction-layers.md` - Key figure simulation at scale
- `research-system/capability-evolution.md` - Agent-driven research
- `governance-system/spec.md` - Leadership, councils, laws
- `player-system/spec.md` - Player as agent, spectator modes
