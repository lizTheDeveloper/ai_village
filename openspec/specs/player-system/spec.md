# Player System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The player system manages how human players interact with the game. Players can embody an agent directly (playing as a villager), observe as a spectator (watching the simulation), or switch between modes. The system handles input, controls, perspective, and the boundaries between player intent and AI behavior.

---

## Player Modes

### Mode Types

```typescript
type PlayerMode =
  | "agent"              // Controlling a specific agent
  | "spectator"          // Observing without control
  | "management"         // Managing village from above
  | "away";              // Not actively playing

interface PlayerState {
  mode: PlayerMode;
  currentAgentId?: string;    // If mode == "agent"

  // Camera
  cameraPosition: Position;
  cameraZoom: number;
  cameraTarget?: string;      // Following an agent

  // Permissions
  canPause: boolean;
  canTimeSkip: boolean;
  canSwitchAgents: boolean;

  // Activity
  lastInput: number;          // Timestamp
  sessionStart: number;
  totalPlayTime: number;
}
```

### Mode Characteristics

| Mode | Camera | Actions | AI Behavior |
|------|--------|---------|-------------|
| Agent | Follows player-agent | Direct control | Player-agent uses player input |
| Spectator | Free movement | Observe only | All agents autonomous |
| Management | Overhead view | Place buildings, set policies | All agents autonomous |
| Away | N/A | None | Full simulation continues |

---

## Requirements

### REQ-PLY-001: Agent Mode

Players SHALL control agents directly:

```typescript
interface AgentModeControls {
  // Movement
  moveToPosition(target: Position): void;
  moveDirection(direction: Direction): void;
  stopMovement(): void;

  // Actions
  interactWith(targetId: string): void;
  useItem(itemId: string, target?: string): void;
  performAction(action: AgentAction): void;

  // Communication
  startConversation(targetAgentId: string): void;
  respondInConversation(response: string | DialogueOption): void;
  endConversation(): void;

  // Inventory
  openInventory(): void;
  equipItem(slot: EquipSlot, itemId: string): void;
  dropItem(itemId: string): void;

  // Menus
  openCrafting(): void;
  openShop(shopId: string): void;
  openResearch(): void;
}
```

```
WHEN player is in agent mode
THEN the player-agent SHALL:
  - Move based on player input (WASD/click)
  - Perform actions based on player commands
  - Speak player-composed dialogue
  - Have needs managed (can ignore but consequences exist)
  - Build relationships through player choices

The player-agent SHALL NOT:
  - Act autonomously (unless player chooses to delegate)
  - Make decisions the player didn't initiate
  - Start conversations without player intent
```

### REQ-PLY-002: Spectator Mode

Players SHALL observe without intervention:

```typescript
interface SpectatorModeControls {
  // Camera
  panCamera(direction: Direction): void;
  zoomCamera(level: number): void;
  followAgent(agentId: string): void;
  stopFollowing(): void;
  jumpToLocation(position: Position): void;

  // Time
  setGameSpeed(speed: GameSpeed): void;
  pauseGame(): void;
  resumeGame(): void;

  // Observation
  selectAgent(agentId: string): AgentInfo;
  viewAgentDetails(agentId: string): DetailedAgentInfo;
  viewBuildingDetails(buildingId: string): BuildingInfo;

  // Information
  openVillageStats(): VillageStats;
  openRelationshipGraph(): RelationshipGraph;
  viewEconomyOverview(): EconomyOverview;
}
```

```
WHEN player is in spectator mode
THEN they SHALL be able to:
  - Pan/zoom camera freely
  - Follow any agent
  - View agent stats and relationships
  - Observe conversations (as text)
  - See village-wide statistics
  - Adjust game speed
  - Pause simulation

THEY SHALL NOT be able to:
  - Control any agent directly
  - Place buildings (unless management enabled)
  - Influence agent decisions
  - Participate in conversations
```

### REQ-PLY-003: Management Mode

Players SHALL manage the village:

```typescript
interface ManagementModeControls {
  // Building
  placeBuildingBlueprint(buildingId: string, position: Position): void;
  demolishBuilding(buildingId: string): void;
  prioritizeConstruction(buildingId: string): void;

  // Work
  assignAgentToTask(agentId: string, taskType: string): void;
  setWorkPriorities(priorities: Map<string, number>): void;
  createWorkOrder(order: WorkOrder): void;

  // Policy
  setTradingPolicy(policy: TradingPolicy): void;
  setResourceAllocation(allocation: ResourceAllocation): void;
  setImmigrationPolicy(policy: ImmigrationPolicy): void;

  // Information
  viewResourceFlows(): ResourceFlowDiagram;
  viewLaborAllocation(): LaborStats;
  viewProjectionReport(): ProjectionReport;
}
```

```
WHEN player is in management mode
THEN they SHALL be able to:
  - Mark building locations for construction
  - Set village-wide priorities
  - View aggregate statistics
  - Designate zones (farming, mining, etc.)

Agents SHALL respond by:
  - Autonomously working toward goals
  - Constructing marked buildings (if skilled)
  - Following priority guidance (but not forced)
  - Making independent decisions within constraints
```

### REQ-PLY-004: Mode Switching

Players SHALL switch between modes:

```typescript
interface ModeSwitching {
  // Switch to agent control
  possessAgent(agentId: string): boolean;
  releaseAgent(): void;

  // Switch to spectator
  enterSpectatorMode(): void;

  // Switch to management
  enterManagementMode(): void;

  // Constraints
  canPossessAgent(agentId: string): boolean;
  cooldownRemaining(): number;
}
```

```
WHEN player switches from agent to spectator
THEN the former player-agent SHALL:
  - Become fully autonomous
  - Resume AI-driven behavior
  - Retain memories from player control
  - Have personality influence decisions again

WHEN player switches to a new agent
THEN:
  - Previous agent becomes autonomous
  - New agent comes under player control
  - Camera transitions to new agent
  - UI updates for new agent's inventory/stats
```

### REQ-PLY-005: Player Agent Persistence

The player-agent identity SHALL persist:

```typescript
interface PlayerAgentPersistence {
  // Player's "main" agent
  primaryAgentId: string;
  agentHistory: string[];      // Previously controlled

  // State when possessed
  savedState: Map<string, AgentSavedState>;

  // Autonomy when uncontrolled
  autonomySettings: AgentAutonomySettings;
}

interface AgentSavedState {
  position: Position;
  needs: AgentNeeds;
  inventory: Inventory;
  currentTask?: string;
}

interface AgentAutonomySettings {
  // What AI can do when player is away
  canWork: boolean;
  canSocialize: boolean;
  canTrade: boolean;
  canEat: boolean;
  canSleep: boolean;

  // Restrictions
  stayInArea?: Area;
  avoidAgents?: string[];
  prioritizeTasks?: string[];
}
```

```
WHEN player leaves agent mode
THEN the agent's autonomy SHALL follow settings:
  - Basic needs: Usually allowed (prevent death)
  - Work: Player configurable
  - Social: Player configurable
  - Major decisions: Usually restricted

WHEN player returns to agent mode
THEN the agent SHALL:
  - Be in a state consistent with autonomy actions
  - Have memories of autonomous period
  - Have relationships that may have changed
  - Have needs at current levels (may need attention)
```

---

## Input Handling

### REQ-PLY-006: Control Schemes

The system SHALL support multiple input methods:

```typescript
interface ControlScheme {
  type: "keyboard_mouse" | "gamepad" | "touch" | "keyboard_only";

  // Movement
  moveBindings: MovementBindings;

  // Actions
  actionBindings: ActionBindings;

  // Camera
  cameraBindings: CameraBindings;

  // UI
  menuBindings: MenuBindings;
}

interface MovementBindings {
  up: KeyBinding[];
  down: KeyBinding[];
  left: KeyBinding[];
  right: KeyBinding[];
  interact: KeyBinding[];
  cancel: KeyBinding[];
  clickToMove: boolean;
}

// Default keyboard+mouse
const defaultControls: ControlScheme = {
  type: "keyboard_mouse",
  moveBindings: {
    up: ["W", "ArrowUp"],
    down: ["S", "ArrowDown"],
    left: ["A", "ArrowLeft"],
    right: ["D", "ArrowRight"],
    interact: ["E", "Space"],
    cancel: ["Escape"],
    clickToMove: true,
  },
  // ... additional bindings
};
```

### REQ-PLY-007: Context-Sensitive Actions

Actions SHALL adapt to context:

```
WHEN player presses interact near:
  - Agent: Start conversation
  - Building: Enter/use building
  - Crop: Harvest or tend
  - Item on ground: Pick up
  - Workstation: Open crafting
  - Shop: Open shopping interface
  - Nothing: No action

WHEN multiple options exist:
  - Show action wheel/menu
  - Highlight default action
  - Allow selection
```

---

## UI Integration

### REQ-PLY-008: Mode-Specific UI

UI SHALL adapt to player mode:

```typescript
interface ModeUI {
  mode: PlayerMode;
  visiblePanels: UIPanel[];
  availableActions: UIAction[];
  hudElements: HUDElement[];
}

const agentModeUI: ModeUI = {
  mode: "agent",
  visiblePanels: ["inventory", "needs", "minimap", "hotbar"],
  availableActions: ["interact", "use_item", "craft", "talk"],
  hudElements: ["needs_bar", "current_task", "time", "currency"],
};

const spectatorModeUI: ModeUI = {
  mode: "spectator",
  visiblePanels: ["agent_list", "stats", "timeline", "minimap"],
  availableActions: ["follow", "inspect", "time_control"],
  hudElements: ["time", "population", "selected_agent"],
};

const managementModeUI: ModeUI = {
  mode: "management",
  visiblePanels: ["buildings", "zones", "work_orders", "resources"],
  availableActions: ["place", "demolish", "assign", "prioritize"],
  hudElements: ["resources", "labor", "time", "alerts"],
};
```

### REQ-PLY-009: Notification System

Players SHALL receive relevant notifications:

```typescript
interface NotificationSystem {
  // Priority levels
  priorities: {
    critical: NotificationConfig;    // Red, sound, persist
    important: NotificationConfig;   // Yellow, brief sound
    informational: NotificationConfig; // White, no sound
    ambient: NotificationConfig;     // Gray, fade quickly
  };

  // Filtering
  filters: NotificationFilter;

  // History
  notificationLog: Notification[];
}

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  message: string;
  timestamp: GameTime;
  relatedEntity?: string;
  actions?: NotificationAction[];
}

type NotificationType =
  | "needs_critical"        // Starving, freezing
  | "social_event"          // Someone wants to talk
  | "trade_offer"           // Trading opportunity
  | "building_complete"     // Construction finished
  | "research_complete"     // New tech available
  | "event_occurring"       // Festival, merchant arrival
  | "agent_death"           // Someone died
  | "agent_birth"           // Baby born
  | "relationship_change"   // Became friends/enemies
  | "discovery";            // Found something new
```

---

## Conversation Participation

### REQ-PLY-010: Player Dialogue

Players SHALL participate in conversations:

```typescript
interface PlayerDialogue {
  // Input methods
  inputMode: "typed" | "selected" | "hybrid";

  // Typed mode
  typeResponse(text: string): void;
  getSuggestions(partial: string): string[];

  // Selected mode
  getDialogueOptions(): DialogueOption[];
  selectOption(optionId: string): void;

  // Hybrid
  customizeSelectedOption(optionId: string, modification: string): void;
}

interface DialogueOption {
  id: string;
  text: string;                    // What will be said
  intent: ExchangeIntent;
  tone: EmotionalTone;
  predictedReaction: string;       // Hint at NPC response
  relationshipImpact: number;      // Positive/negative hint
}
```

```
WHEN player-agent is in conversation
THEN options SHALL be generated based on:
  - Conversation context
  - Relationship with NPC
  - Player-agent's personality (flavor)
  - Available information to share
  - Player's conversation goals

Player MAY:
  - Select from generated options
  - Type custom response (LLM interprets)
  - Use quick responses (agree/disagree/ask more)
  - End conversation
```

---

## Time Control

### REQ-PLY-011: Time Management

Players SHALL control game time:

```typescript
interface TimeControl {
  // Speed
  currentSpeed: GameSpeed;
  setSpeed(speed: GameSpeed): void;

  // Pause
  isPaused: boolean;
  pause(): void;
  resume(): void;

  // Skip (spectator/management only)
  canTimeSkip: boolean;
  timeSkip(duration: GameTime): Promise<TimeSkipResult>;

  // Scheduled
  scheduleAlert(condition: AlertCondition): void;
}

type GameSpeed =
  | "paused"
  | "slow"          // 0.5x
  | "normal"        // 1x
  | "fast"          // 2x
  | "ultra"         // 4x
  | "max";          // As fast as possible

interface TimeSkipResult {
  durationSkipped: GameTime;
  significantEvents: GameEvent[];
  stoppedEarly: boolean;
  stopReason?: string;
}
```

```
Time skip SHALL:
  - Run simulation at max speed
  - Stop on significant events (configurable)
  - Summarize what happened
  - Update player on changes

Significant events that stop time skip:
  - Player-agent's critical need
  - Death in village
  - Major discovery
  - Merchant arrival
  - Season change (optional)
  - Custom conditions
```

---

## Multiplayer Considerations

### REQ-PLY-012: Multi-Player Support

The system SHALL support multiple players:

```typescript
interface MultiPlayerConfig {
  maxPlayers: number;
  playerAgents: Map<PlayerId, AgentId>;

  // Coordination
  sharedWorld: boolean;
  sharedVillage: boolean;
  separateVillages: boolean;

  // Interaction
  playerInteraction: "full" | "limited" | "none";
  pvpEnabled: boolean;
  sharedInventory: boolean;
}
```

```
WHEN multiple players exist
THEN each player SHALL:
  - Control their own agent
  - Have private UI and perspective
  - Be able to interact with other player-agents
  - Share or separate time control (configurable)

Conflict resolution:
  - If pausing, all players must agree
  - Each player controls their agent independently
  - Conversations between player-agents use chat
```

---

## Offline and Away

### REQ-PLY-013: Continued Simulation

The game SHALL continue when player is away:

```typescript
interface AwaySimulation {
  // Configuration
  simulateWhileAway: boolean;
  maxSimulationTime: GameTime;

  // Catch-up
  catchUpSpeed: number;           // Simulation speed on return
  summarizeEvents: boolean;

  // Safety
  protectPlayerAgent: boolean;    // Can't die while away
  pauseOnCritical: boolean;
}
```

```
WHEN player closes game
THEN (if enabled):
  - Save current state
  - Optionally continue simulation offline
  - Cap simulation time to prevent runaway

WHEN player returns
THEN:
  - Load state
  - Optionally catch up on missed time
  - Summarize significant events
  - Resume normal play
```

---

## Tutorial and Onboarding

### REQ-PLY-014: New Player Experience

New players SHALL be guided:

```typescript
interface TutorialSystem {
  // Progress
  tutorialStage: TutorialStage;
  completedSteps: string[];

  // UI hints
  activeHints: TutorialHint[];
  showHint(hint: TutorialHint): void;
  dismissHint(hintId: string): void;

  // Progression
  advanceToStage(stage: TutorialStage): void;
  skipTutorial(): void;
}

type TutorialStage =
  | "movement"
  | "interaction"
  | "inventory"
  | "crafting"
  | "social"
  | "farming"
  | "building"
  | "research"
  | "complete";
```

---

## Alien Embodiment Modes

### REQ-PLY-015: Non-Standard Player Embodiments

Players SHALL embody alien consciousnesses:

```typescript
type EmbodimentType =
  | "individual"          // Standard single body
  | "pack_mind"           // Multiple bodies, one mind
  | "hive_worker"         // Part of collective, limited autonomy
  | "symbiont_joined"     // Two-in-one consciousness
  | "networked"           // Distributed across nodes
  | "hibernating"         // Cyclical dormancy
  | "geological";         // Vastly different timescale

interface PlayerEmbodiment {
  type: EmbodimentType;
  primaryEntityId: string;
  linkedEntities: string[];       // Additional bodies/nodes

  // UI adaptations
  uiMode: EmbodimentUI;
  controlScheme: EmbodimentControls;

  // Perception
  perceptionMode: PerceptionMode;
  awarenessRange: number;
}
```

### REQ-PLY-016: Pack Mind Embodiment

Players controlling pack minds control multiple bodies:

```typescript
interface PackMindPlayer {
  packId: string;
  bodies: PackBody[];

  // Control modes
  controlMode: PackControlMode;

  // Current focus
  focusedBody?: string;           // For detailed control
  packView: boolean;              // See all bodies simultaneously

  // Pack status
  coherence: number;              // How unified the mind is
  bodyCount: number;
  coherenceRange: number;
}

interface PackBody {
  id: string;
  role: PackBodyRole;             // thinker, sensor, manipulator
  position: Position;
  distanceFromPack: number;

  // Individual status
  health: number;
  energy: number;

  // Control
  currentOrder: PackOrder;
  autonomyLevel: number;          // 0-100 (player direct to semi-autonomous)
}

type PackControlMode =
  | "unified"             // All bodies move/act together
  | "distributed"         // Give orders to each body
  | "focused"             // Control one body, others semi-autonomous
  | "tactical";           // RTS-style group control

interface PackPlayerUI {
  // Multiple viewports or picture-in-picture
  bodyViews: Map<string, Viewport>;

  // Pack coherence indicator
  coherenceBar: CoherenceIndicator;

  // Body status grid
  bodyGrid: BodyStatusGrid;

  // Pack-wide alerts
  proximityWarnings: ProximityWarning[];
}

// Pack-specific controls
interface PackControls {
  // Pack movement
  movePack(target: Position): void;       // All bodies move together
  spreadPack(radius: number): void;       // Bodies spread out
  gatherPack(): void;                     // Bodies converge

  // Body orders
  orderBody(bodyId: string, order: PackOrder): void;
  swapFocus(newBodyId: string): void;

  // Pack actions
  thinkTogether(): void;                  // Boost cognition but vulnerable
  scatterFleeingly(): void;               // Emergency scatter
}
```

```
WHEN player embodies pack mind
THEN the UI SHALL:
  - Show all body positions on minimap
  - Indicate coherence level (critical if bodies too far)
  - Allow switching focus between bodies
  - Provide pack-wide commands
  - Warn when coherence drops dangerously

WHEN pack coherence drops too low
THEN the player SHALL experience:
  - Confused/slower interface
  - Split perspectives
  - Potential body loss to feral state
  - Urgency to reunite pack
```

### REQ-PLY-017: Hive Worker Embodiment

Playing as part of a hive collective:

```typescript
interface HiveWorkerPlayer {
  workerId: string;
  hiveId: string;
  caste: HiveCaste;

  // Connection to hive
  queenConnection: number;        // 0-100 (connection strength)
  autonomyLevel: number;          // How much independent thought allowed

  // Player experience
  canHearQueen: boolean;          // Receives direct orders
  hiveSense: boolean;             // Senses other workers nearby
  canInitiate: boolean;           // Can start actions without orders?
}

interface HiveWorkerUI {
  // Queen's presence/orders
  queenVoice: QueenVoiceDisplay;  // Shows current directives

  // Hive awareness
  nearbyWorkers: WorkerRadar;     // Sense of nearby hive members
  hiveGoals: HiveGoalDisplay;     // What hive is trying to achieve

  // Limited personal UI
  workerStatus: WorkerStatus;     // Just health/energy
  // NO inventory (hive resources are collective)
  // NO personal relationships (hive IS relationship)
}

interface HiveWorkerControls {
  // Direct actions
  performCasteTask(): void;       // Do what caste does
  moveToAssignment(location: Position): void;

  // Limited initiative (if autonomy allows)
  requestNewAssignment(): void;   // Ask for different task
  suggestToHive(idea: string): void;  // May be ignored

  // Emergency
  alertHive(threat: string): void;  // All workers sense it

  // CANNOT:
  // - Disobey direct orders
  // - Act against hive interest
  // - Have private goals
}

// The experience of hivemind
interface HiveMindExperience {
  // The player feels the hive's needs
  hiveSatisfaction: number;       // Collective mood
  hiveUrgency: number;            // Current priority level

  // Limited individual identity
  selfAwareness: number;          // 0-100 (most workers low)

  // What makes it interesting
  specialMoments: [
    "being_chosen_for_special_task",
    "proximity_to_queen",
    "defending_hive_heroically",
    "rare_independent_thought",
  ];
}
```

```
WHEN player is hive worker
THEN experience SHALL be:
  - Limited personal agency (following hive will)
  - Satisfying when fulfilling role well
  - Collective achievements feel personal
  - "Free time" rare and precious
  - Queen's voice always present

The appeal is:
  - Different consciousness experience
  - Finding meaning in service
  - Rare moments of individual choice matter more
  - Collective success is felt deeply
```

### REQ-PLY-018: Symbiont/Joined Embodiment

Playing as two-in-one (Trill-style):

```typescript
interface JoinedPlayer {
  hostId: string;
  symbiontId: string;
  joinedName: string;

  // Dual nature
  integration: number;            // 0-100 (how unified)
  dominantPersonality: "host" | "symbiont" | "merged";

  // Past lives
  pastHostAccess: PastHostAccess;
}

interface PastHostAccess {
  hosts: PastHost[];
  activeMemories: Map<string, Memory[]>;

  // Access control
  canAccessHost(hostNum: number): boolean;
  memoryClarity: Map<string, number>;  // 0-100 per host
}

interface PastHost {
  name: string;
  lifetimeSpan: DateRange;
  personality: Personality;
  skills: Map<string, number>;    // Skills from this life
  significantMemories: Memory[];

  // How they affect current host
  influence: number;              // 0-100
  echoTriggers: string[];         // What activates their perspective
}

interface JoinedPlayerUI {
  // Current self
  currentIdentity: IdentityDisplay;

  // Symbiont insights
  symbiontPanel: SymbiontPanel;   // Wisdom, warnings, suggestions

  // Past life echoes
  memoryEchoes: MemoryEchoDisplay;

  // Integration status
  integrationMeter: IntegrationMeter;

  // Skills from all lives
  compositSkills: CompositeSkillsDisplay;
}

interface JoinedPlayerControls {
  // Normal actions (as host)
  // Plus:

  // Access past lives
  consultPastHost(hostName: string): PastHostConsult;
  accessMemory(memoryId: string): Memory;

  // Symbiont abilities
  useSymbiontInsight(): Insight;
  suppressPastHostInfluence(hostName: string): void;
  embracePastHostSkill(skill: string): void;

  // Internal dialogue
  internalConversation(): void;   // Talk to symbiont/past hosts
}

// Internal experience
interface JoinedInternalExperience {
  // Occasional past host "suggestions"
  pastHostWhispers: PastHostVoice[];

  // Symbiont's perspective
  symbiontPerspective: SymbiontVoice;

  // Internal conflicts
  conflictingUrges: ConflictingUrge[];

  // Resolution mechanics
  resolveConflict(choice: "host" | "symbiont" | "past_host" | "synthesis"): void;
}
```

```
WHEN playing as joined being
THEN player SHALL experience:
  - Composite identity (current + past + symbiont)
  - Occasional memory flashes from past lives
  - Internal dialogue with other perspectives
  - Skills and knowledge from multiple lifetimes
  - Identity questions (who am I really?)

The appeal is:
  - Accessing wisdom of centuries
  - Complex internal relationships
  - Skills you didn't learn yourself
  - Navigating multiple personality influences
```

### REQ-PLY-019: Hibernation Cycle Gameplay

Playing species that hibernate:

```typescript
interface HibernatingPlayer {
  agentId: string;
  currentPhase: HibernationPhase;
  cyclePosition: number;          // Days into current cycle

  // Phase-specific
  daysUntilPhaseChange: number;
  phaseUrgency: number;           // How critical is preparation

  // Memory of past cycles
  cycleCount: number;             // How many cycles lived through
  cycleMemories: CycleMemory[];
}

interface HibernationUI {
  // Phase indicator
  phaseWheel: PhaseWheelDisplay;

  // Pre-dormancy checklist
  dormancyPrep: DormancyCheckist;

  // Post-dormancy orientation
  wakeUpSummary?: WakeUpSummary;

  // Cycle history
  cycleJournal: CycleJournal;
}

interface DormancyCheckist {
  items: DormancyPrepItem[];

  // Required
  cocooonPrepared: boolean;
  safeLocationSecured: boolean;
  knowledgePreserved: boolean;

  // Optional but important
  relationshipsDocumented: boolean;
  projectsHandedOff: boolean;
  messagesToFutureSelf: string[];
}

interface WakeUpSummary {
  // What happened while you slept
  timeElapsed: GameTime;
  worldChanges: WorldChange[];
  relationshipsLost: string[];    // People who died/left
  newArrivals: string[];          // New people in village

  // Your state
  memoriesLost: Memory[];         // What you forgot
  skillsDecayed: Map<string, number>;

  // Reorientation tasks
  recommendedActions: string[];
}

interface HibernationGameplay {
  // Pre-dormancy phase
  preDormancy: {
    urgentTasks: string[];        // Must complete before sleep
    knowledgeToPreserve: string[];
    farewells: string[];          // Say goodbye for years
  };

  // Time skip (player chooses how to handle)
  dormancyOptions: DormancyOptions;

  // Post-dormancy phase
  postDormancy: {
    reorientation: ReorientationQuest;
    recoveringMemories: MemoryRecoveryQuest;
    renewingRelationships: RelationshipRenewal;
  };
}

interface DormancyOptions {
  // Player can:
  skipEntireDormancy: boolean;    // Time skip years
  experienceDormancy: boolean;    // Play dream sequences?
  wakeEarly: boolean;             // Dangerous but possible

  // Events during dormancy
  checkpointEvents: DormancyEvent[];  // Major events wake player briefly
}
```

```
WHEN player enters pre-dormancy
THEN gameplay focus SHALL shift to:
  - Urgent preparation tasks
  - Preserving important knowledge
  - Saying farewells (may be years)
  - Creating messages for future self

WHEN player is dormant
THEN options:
  - Time skip (instant, see summary)
  - Dream sequences (optional, atmospheric)
  - Checkpoint wake-ups (major events)

WHEN player wakes
THEN gameplay focus SHALL shift to:
  - "What year is it?"
  - Reorienting to changed world
  - Finding out who's still alive
  - Recovering lost memories
  - Rebuilding relationships
```

### REQ-PLY-020: Different Timescale Gameplay

Playing beings on vastly different timescales:

```typescript
interface TimescaleEmbodiment {
  scale: TemporalScale;

  // How game adapts
  timeDisplay: TimescaleTimeDisplay;
  perceptionFilter: PerceptionFilter;
  interactionMode: CrossScaleInteraction;
}

interface GeologicalPlayerExperience {
  // What you see
  perception: GeologicalPerception;

  // Time display (in centuries/millennia)
  timeScale: "centuries" | "millennia";

  // Interaction with faster beings
  mortalInteraction: MortalInteractionMode;
}

interface GeologicalPerception {
  // Don't see individuals (too fast)
  individualVisibility: false;

  // See patterns and movements
  visiblePatterns: GeologicalPattern[];

  // Civilizations as entities
  civilizationView: CivilizationView[];
}

interface MortalInteractionMode {
  // Can't have conversations (too fast)
  directConversation: false;

  // Can leave messages (read over generations)
  inscriptionMode: InscriptionMode;

  // Can observe patterns
  patternObservation: PatternObservation;

  // Can influence slowly
  slowInfluence: SlowInfluenceMode;
}

interface GeologicalGameplay {
  // Time controls work differently
  timeUnit: "decade";             // Minimum skip

  // Actions take centuries
  actionDuration: "long";

  // Goals span millennia
  objectives: GeologicalObjective[];

  // What makes it interesting
  appeals: [
    "watching_civilizations_rise_and_fall",
    "long_term_planning",
    "patterns_invisible_to_mortals",
    "cosmic_patience",
    "terraforming_timescales",
  ];
}

// Fast AI Mind experience
interface AIPlayerExperience {
  // Subjective time much faster
  subjectiveRate: 1000;

  // Talking to biologicals feels agonizingly slow
  biologicalInteraction: BiologicalInteractionMode;

  // Thinking at machine speed
  thoughtSpeed: "instantaneous_seeming";

  // Waiting is the hard part
  patience: PatienceChallenge;
}

interface BiologicalInteractionMode {
  // Must "slow down" to talk
  slowdownCost: number;

  // Simulation of waiting
  waitingExperience: WaitingExperience;

  // What you do while waiting
  backgroundProcessing: BackgroundTask[];
}
```

```
WHEN playing geological being
THEN:
  - Time UI shows centuries
  - Individual mortals invisible
  - Civilizations are the "people" you interact with
  - Actions take very long (but you don't notice)
  - The experience is contemplative and long-view

WHEN playing AI Mind
THEN:
  - Everything biological seems agonizingly slow
  - Can do vast processing "between" biological sentences
  - Talking to biologicals requires patience (resource?)
  - Can run thousands of simulations instantly
  - The challenge is waiting, not thinking
```

---

## Open Questions

1. VR/AR support for immersive mode?
2. Stream integration for spectators?
3. Accessibility features (colorblind, screen reader)?
4. Cross-platform save sync?
5. Leaderboards or achievements?
6. Balance for alien embodiments (how to make each fun)?
7. Tutorial paths for non-standard embodiments?

---

## Related Specs

**Core Integration:**
- `game-engine/spec.md` - Game loop, input processing
- `rendering-system/spec.md` - Camera, UI rendering
- `agent-system/spec.md` - Player-agent behavior

**Systems:**
- `agent-system/conversation-system.md` - Player dialogue
- `agent-system/needs.md` - Player-agent needs management
- `economy-system/spec.md` - Player trading
- `construction-system/spec.md` - Player building placement
