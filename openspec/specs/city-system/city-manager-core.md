# City Manager Core Specification

## Overview

The City Manager is a generalized, reusable AI component that manages city-level strategic decisions and coordinates autonomous NPCs through priority broadcasts. It abstracts city management logic from specific game implementations, enabling:

- Headless testing and simulation
- Integration testing of game systems
- Pluggable decision-making backends (rule-based, LLM, hybrid)
- Fast-forward city simulation for testing and time-lapse observation

This spec defines the **core City Manager abstraction** and the **Headless City Simulator** architecture for isolated testing and visualization.

## Version

1.0.0

## Dependencies

- `ecs-system/spec.md` - Entity Component System
- `agent-system/spec.md` - Autonomic NPC behavior
- `building-system/spec.md` - Building placement and functionality
- `resource-system/spec.md` - Resource gathering and storage
- `governance-system/spec.md` - CityDirectorComponent, CityDirectorSystem

## Motivation

**Problem**: The city director logic is currently tightly coupled to:
- Specific game implementations (`CityDirectorSystem`)
- Test scripts (`test-city-director-full.ts`)
- UI layers (`CityManagerPanel`)

**Solution**: Extract a **generalized City Manager** that:
- Works headlessly (no graphics required)
- Runs with real game systems (ECS, agents, resources, buildings)
- Provides clean interfaces for decision-making and monitoring
- Enables fast-forward simulation (batched ticks for time-lapse)
- Can be tested in isolation or integrated into full game

**Use Cases**:
1. **Integration Testing**: Verify systems work together (agents gather food from farms, store in warehouses)
2. **Time-Lapse Observation**: Watch city evolve over months/years at high speed
3. **AI Development**: Test different city management strategies in isolation
4. **Performance Testing**: Run headless simulation to benchmark system performance

---

## Requirements

### REQ-CM-001: City Manager Abstraction
**Priority**: MUST

The City Manager is a standalone class that encapsulates city-level AI decision-making.

```typescript
/**
 * Generalized City Manager AI
 *
 * Analyzes city state, makes strategic decisions, broadcasts priorities to agents.
 * Decoupled from specific ECS implementation details.
 */
class CityManager {
  // Configuration
  private decisionInterval: number;  // Ticks between decisions (default: 1 day = 14400)
  private statsUpdateInterval: number;  // Ticks between stat updates (default: 10 seconds = 200)

  // Decision backend (pluggable)
  private decisionMaker: CityDecisionMaker;

  // Current state
  private stats: CityStats;
  private priorities: StrategicPriorities;
  private reasoning: CityReasoning;

  // Decision history
  private decisions: CityDecision[];
  private maxHistorySize: number;

  constructor(config: CityManagerConfig);

  // Core lifecycle
  tick(world: World): void;
  analyzeCity(world: World): CityStats;
  makeDecision(stats: CityStats): CityDecision;
  broadcastPriorities(world: World, priorities: StrategicPriorities): void;

  // Querying
  getStats(): Readonly<CityStats>;
  getPriorities(): Readonly<StrategicPriorities>;
  getReasoning(): Readonly<CityReasoning>;
  getDecisionHistory(): Readonly<CityDecision[]>;

  // Configuration
  setDecisionMaker(maker: CityDecisionMaker): void;
  setDecisionInterval(ticks: number): void;
}

interface CityManagerConfig {
  decisionInterval?: number;  // Default: 14400 (1 day)
  statsUpdateInterval?: number;  // Default: 200 (10 seconds)
  decisionMaker?: CityDecisionMaker;  // Default: RuleBasedDecisionMaker
  maxHistorySize?: number;  // Default: 100
}

interface CityStats {
  // Population
  population: number;
  autonomicNpcCount: number;
  llmAgentCount: number;

  // Buildings
  totalBuildings: number;
  housingCapacity: number;
  storageCapacity: number;
  productionBuildings: number;

  // Resources (in days of supply)
  foodSupply: number;  // Days until starvation
  woodSupply: number;
  stoneSupply: number;

  // Threats
  nearbyThreats: number;
  recentDeaths: number;
}

interface StrategicPriorities {
  gathering: number;    // 0-1
  building: number;     // 0-1
  farming: number;      // 0-1
  social: number;       // 0-1
  exploration: number;  // 0-1
  rest: number;         // 0-1
  magic: number;        // 0-1
  // Sum must equal 1.0
}

interface CityReasoning {
  focus: CityFocus;  // 'survival' | 'growth' | 'security' | 'prosperity' | 'exploration' | 'balanced'
  reasoning: string;  // Human-readable explanation
  concerns: string[];  // List of current problems
}

interface CityDecision {
  timestamp: number;  // Tick number
  stats: CityStats;
  priorities: StrategicPriorities;
  reasoning: CityReasoning;
}
```

**Acceptance Criteria**:
- ✅ City Manager can be instantiated without a World
- ✅ City Manager updates stats and makes decisions independently
- ✅ City Manager can broadcast priorities to agent components
- ✅ Decision history is maintained with configurable max size
- ✅ Pluggable decision backends (rule-based, LLM, hybrid)

---

### REQ-CM-002: Decision Maker Interface
**Priority**: MUST

Decision makers are pluggable backends that determine city strategy.

```typescript
/**
 * Decision Maker Interface
 *
 * Pluggable backend for city AI decision-making.
 */
interface CityDecisionMaker {
  name: string;  // 'rule-based' | 'llm' | 'hybrid'

  /**
   * Analyze city stats and determine strategic focus and priorities
   */
  makeDecision(stats: CityStats, history: CityDecision[]): Promise<CityDecision>;
}

/**
 * Rule-Based Decision Maker
 *
 * Fast, deterministic decisions based on thresholds and heuristics.
 */
class RuleBasedDecisionMaker implements CityDecisionMaker {
  name = 'rule-based';

  async makeDecision(stats: CityStats, history: CityDecision[]): Promise<CityDecision> {
    const focus = this.inferFocus(stats);
    const priorities = this.getPrioritiesForFocus(focus);
    const reasoning = this.generateReasoning(stats, focus);

    return {
      timestamp: Date.now(),
      stats,
      priorities,
      reasoning,
    };
  }

  private inferFocus(stats: CityStats): CityFocus {
    // Survival mode: food critically low
    if (stats.foodSupply < 3) return 'survival';

    // Security mode: threats detected
    if (stats.nearbyThreats > 3 || stats.recentDeaths > 0) return 'security';

    // Growth mode: approaching housing capacity
    if (stats.population / stats.housingCapacity > 0.8) return 'growth';

    // Prosperity mode: surplus resources
    if (stats.foodSupply > 10 && stats.woodSupply > 50) return 'prosperity';

    // Exploration mode: early settlement
    if (stats.totalBuildings < 5) return 'exploration';

    return 'balanced';
  }

  private getPrioritiesForFocus(focus: CityFocus): StrategicPriorities {
    // Predefined priority distributions per focus
    // ...
  }
}

/**
 * LLM-Based Decision Maker
 *
 * Uses language model to make nuanced, contextual decisions.
 */
class LLMDecisionMaker implements CityDecisionMaker {
  name = 'llm';

  constructor(private llmProvider: LLMProvider) {}

  async makeDecision(stats: CityStats, history: CityDecision[]): Promise<CityDecision> {
    const prompt = this.buildPrompt(stats, history);
    const response = await this.llmProvider.generate(prompt);
    return this.parseResponse(response, stats);
  }
}
```

**Acceptance Criteria**:
- ✅ Multiple decision makers can be swapped at runtime
- ✅ Rule-based maker is fast and deterministic
- ✅ LLM maker integrates with existing LLM infrastructure
- ✅ Decision makers have access to full history for context

---

### REQ-CM-003: Headless City Simulator
**Priority**: MUST

A headless game simulation that runs real ECS systems without graphics.

```typescript
/**
 * Headless City Simulator
 *
 * Runs a full game simulation (ECS, agents, resources, buildings) without rendering.
 * Used for fast-forward testing, integration testing, and time-lapse observation.
 */
class HeadlessCitySimulator {
  private gameLoop: GameLoop;
  private cityManager: CityManager;
  private config: SimulatorConfig;

  // Performance tracking
  private ticksRun: number;
  private startTime: number;

  constructor(config: SimulatorConfig);

  // Lifecycle
  initialize(): Promise<void>;
  runTicks(count: number): Promise<void>;
  runDays(count: number): Promise<void>;
  runMonths(count: number): Promise<void>;
  stop(): void;
  reset(): void;

  // State access
  getWorld(): Readonly<World>;
  getCityManager(): Readonly<CityManager>;
  getStats(): SimulatorStats;

  // Event subscription
  on(event: 'tick' | 'day' | 'month' | 'decision', callback: Function): void;
  off(event: string, callback: Function): void;
}

interface SimulatorConfig {
  // World setup
  worldSize: { width: number; height: number };

  // Initial conditions
  initialPopulation: number;
  initialBuildings: BuildingPlacement[];
  initialResources: ResourcePlacement[];

  // City manager
  cityManager?: CityManager;

  // Simulation speed
  ticksPerBatch?: number;  // Default: 2000 (fast-forward batches)
  autoRun?: boolean;  // Auto-run or manual tick control

  // Systems to enable
  enabledSystems?: string[];  // Default: all core systems
}

interface SimulatorStats {
  ticksRun: number;
  daysElapsed: number;
  monthsElapsed: number;
  ticksPerSecond: number;  // Real-time performance
  cityStats: CityStats;
  cityPriorities: StrategicPriorities;
}

interface BuildingPlacement {
  blueprintId: string;
  position: { x: number; y: number };
  inventory?: InventoryItems;
}

interface ResourcePlacement {
  type: 'wood' | 'stone' | 'food';
  position: { x: number; y: number };
  amount: number;
}
```

**Example Usage**:
```typescript
const simulator = new HeadlessCitySimulator({
  worldSize: { width: 200, height: 200 },
  initialPopulation: 50,
  initialBuildings: [
    { blueprintId: 'campfire', position: { x: 100, y: 100 } },
    { blueprintId: 'storage-chest', position: { x: 103, y: 100 }, inventory: { wood: 30, stone: 20, food: 50 } },
    { blueprintId: 'tent', position: { x: 97, y: 100 } },
  ],
  initialResources: [
    { type: 'wood', position: { x: 50, y: 50 }, amount: 30 },
    { type: 'food', position: { x: 150, y: 150 }, amount: 25 },
  ],
  ticksPerBatch: 2000,
});

await simulator.initialize();

// Listen for major events
simulator.on('month', (stats) => {
  console.log(`Month ${stats.monthsElapsed}: Population ${stats.cityStats.population}`);
});

// Run 6 months
await simulator.runMonths(6);

console.log(simulator.getStats());
```

**Acceptance Criteria**:
- ✅ Simulator runs all core game systems (movement, needs, gathering, building, etc.)
- ✅ No rendering/graphics dependencies (headless)
- ✅ Can run in batches for fast-forward simulation
- ✅ Emits events for monitoring (tick, day, month, decision)
- ✅ Performance: >1000 ticks/second on typical hardware

---

### REQ-CM-004: City Simulator Web Dashboard
**Priority**: SHOULD

A web-based dashboard for observing headless city simulation in real-time.

```typescript
/**
 * City Simulator Web Dashboard
 *
 * Web UI that connects to HeadlessCitySimulator and displays:
 * - City statistics
 * - Strategic priorities
 * - Director decisions
 * - Resource trends
 * - Population graph
 *
 * Runs simulation in background, updates UI periodically.
 */
interface CitySimulatorDashboard {
  // Simulation control
  start(): void;
  pause(): void;
  reset(): void;
  setSpeed(ticksPerSecond: number): void;

  // Time control
  stepDay(): void;
  stepMonth(): void;

  // Display
  showStats(): void;
  showPriorities(): void;
  showDecisions(): void;
  showResourceGraph(): void;
}
```

**Dashboard Layout**:
```
┌──────────────────────────────────────────────────────┐
│ 🏙️ City Simulator          [Start] [Pause] [Reset]  │
├──────────────────────────────────────────────────────┤
│ Day 45 | Month 2 | Ticks: 648,000 | Speed: 1000 TPS │
├───────────────────┬──────────────────────────────────┤
│ City Statistics   │ Strategic Priorities             │
│                   │                                  │
│ Population: 50    │ Gathering   ████████░░ 35%       │
│ Buildings:  18    │ Farming     ██████░░░░ 30%       │
│ Food:    25 days  │ Building    ███░░░░░░░ 15%       │
│ Wood:       150   │ Social      ██░░░░░░░░ 10%       │
│ Stone:       80   │ Exploration ██░░░░░░░░  5%       │
│ Threats:      0   │ Rest        ██░░░░░░░░  5%       │
│                   │ Magic       ░░░░░░░░░░  0%       │
├───────────────────┴──────────────────────────────────┤
│ Director Decisions                                   │
│                                                      │
│ Month 2: SURVIVAL                                    │
│ ├─ Food supply critically low (25 days)             │
│ ├─ Prioritizing immediate gathering and farming     │
│ └─ Concerns: Low food reserves                      │
│                                                      │
│ Month 1: BALANCED                                    │
│ └─ All metrics stable                               │
└──────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Dashboard runs in browser (Vite dev server)
- ✅ Connects to HeadlessCitySimulator instance
- ✅ Updates in real-time (every 100ms)
- ✅ Shows city stats, priorities, decisions
- ✅ Simulation controls (start/pause/reset/speed)

---

## Implementation Phases

### Phase 1: City Manager Abstraction
**Duration**: 2-3 hours

1. Create `packages/core/src/city/CityManager.ts`
2. Extract decision logic from `CityDirectorSystem`
3. Implement `RuleBasedDecisionMaker`
4. Write unit tests for CityManager

**Deliverables**:
- ✅ `CityManager` class
- ✅ `CityDecisionMaker` interface
- ✅ `RuleBasedDecisionMaker` implementation
- ✅ Unit tests

---

### Phase 2: Headless Simulator
**Duration**: 3-4 hours

1. Create `packages/city-simulator/src/HeadlessCitySimulator.ts`
2. Extract world setup from `test-city-director-full.ts`
3. Implement event system (tick, day, month)
4. Add batched execution for fast-forward

**Deliverables**:
- ✅ `HeadlessCitySimulator` class
- ✅ World initialization helpers
- ✅ Event subscription system
- ✅ Integration tests

---

### Phase 3: Web Dashboard
**Duration**: 2-3 hours

1. Update `packages/city-simulator/src/main.ts` to use `HeadlessCitySimulator`
2. Remove fake simulation logic
3. Connect UI to real simulator events
4. Add real-time stat updates

**Deliverables**:
- ✅ Dashboard connected to headless simulator
- ✅ Real city stats from game systems
- ✅ Working simulation controls

---

### Phase 4: Integration with CityDirectorSystem
**Duration**: 1-2 hours

1. Refactor `CityDirectorSystem` to use `CityManager`
2. Ensure backward compatibility
3. Update existing tests

**Deliverables**:
- ✅ `CityDirectorSystem` uses `CityManager` internally
- ✅ All existing tests pass
- ✅ No breaking changes to public API

---

## Testing Strategy

### Unit Tests
- `CityManager.test.ts` - Decision logic, priority distribution
- `RuleBasedDecisionMaker.test.ts` - Focus inference, priority mapping

### Integration Tests
- `HeadlessCitySimulator.test.ts` - Full simulation run (1 year)
- Verify agents gather resources, build buildings, respond to priorities
- Verify food supply stays positive (farms work)
- Verify population grows when housing available

### Performance Tests
- Benchmark: 1000+ ticks/second
- Memory: No leaks over 1 year simulation
- Fast-forward: 1 year in <60 seconds

---

## Non-Goals

- ❌ **Visual rendering** - This is a headless simulator
- ❌ **Player interaction** - No building placement, no manual control
- ❌ **Save/load** - Simulation state is ephemeral (can be added later)
- ❌ **Multiplayer** - Single-player simulation only

---

## Open Questions

1. **LLM Integration**: Should LLMDecisionMaker be part of Phase 1 or added later?
2. **Event Granularity**: What events should the simulator emit? (tick, day, month, decision, death, building-completed, etc.)
3. **Dashboard Deployment**: Should dashboard be accessible via orchestrator, or standalone on port 3032?
4. **Snapshot Export**: Should simulator support exporting snapshots to JSON for analysis?

---

## Related Specs

- `governance-system/spec.md` - CityDirectorComponent, CityDirectorSystem
- `ui-system/city-manager.md` - City Manager UI panels (in-game)
- `agent-system/spec.md` - Autonomic agent behavior
- `resource-system/spec.md` - Resource gathering and storage
