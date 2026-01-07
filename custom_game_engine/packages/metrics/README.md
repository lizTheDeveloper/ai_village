# Metrics Package - Performance Tracking & Analytics

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the metrics system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Metrics Package** (`@ai-village/metrics`) implements a comprehensive performance tracking, monitoring, and analytics system for gameplay data. It provides real-time metrics collection, aggregation, visualization, and cost tracking for all game systems.

**What it does:**
- Collects performance metrics (TPS, FPS, memory, system timing)
- Tracks agent lifecycle (births, deaths, lifespans, genealogy)
- Monitors economic activity (resource gathering, consumption, wealth distribution)
- Analyzes social dynamics (relationships, networks, conversations)
- Records LLM usage and costs (tokens, latency, model distribution)
- Detects emergent patterns and anomalies
- Provides REST-like API for metrics queries
- Streams live metrics to external dashboards
- Generates visualization data for charts and heatmaps

**Key files:**
- `src/MetricsCollector.ts` - Core metrics collection and aggregation
- `src/MetricsAPI.ts` - REST-like API for querying metrics
- `src/MetricsDashboard.ts` - Real-time visualization and alerts
- `src/RingBuffer.ts` - Efficient circular buffer for recent events
- `src/types.ts` - Comprehensive type definitions
- `packages/core/src/systems/MetricsCollectionSystem.ts` - ECS system bridge (priority 999)

---

## Package Structure

```
packages/metrics/
├── src/
│   ├── MetricsCollector.ts           # Core collection engine
│   ├── MetricsStorage.ts             # Persistence layer (Node.js)
│   ├── MetricsAnalysis.ts            # Pattern detection & insights
│   ├── MetricsDashboard.ts           # Visualization & alerts
│   ├── RingBuffer.ts                 # Circular buffer utility
│   ├── MetricsStreamClient.ts        # Live streaming client
│   ├── LiveEntityAPI.ts              # Live entity queries
│   ├── CanonEventRecorder.ts         # Narrative event recording
│   ├── types.ts                      # Type definitions
│   ├── api/
│   │   ├── MetricsAPI.ts             # REST-like query API
│   │   └── MetricsLiveStream.ts      # WebSocket live stream
│   ├── events/
│   │   ├── BehaviorEvent.ts          # Behavior change events
│   │   ├── InteractionEvent.ts       # Social interaction events
│   │   ├── SpatialSnapshot.ts        # Spatial data snapshots
│   │   └── MetricEvent.ts            # Generic metric events
│   ├── analyzers/
│   │   ├── NetworkAnalyzer.ts        # Social network analysis
│   │   ├── SpatialAnalyzer.ts        # Spatial pattern analysis
│   │   ├── InequalityAnalyzer.ts     # Wealth inequality analysis
│   │   └── CulturalDiffusionAnalyzer.ts # Cultural spread analysis
│   └── index.ts                      # Package exports
├── package.json
└── README.md                         # This file

packages/core/src/systems/
└── MetricsCollectionSystem.ts        # ECS bridge system (priority 999)
```

---

## Core Concepts

### 1. Metrics Collection Pipeline

The metrics system uses a three-stage pipeline:

```typescript
// Stage 1: Event Recording (via MetricsCollectionSystem)
eventBus.emit('agent:birth', { agentId, generation, parents });
  ↓
// Stage 2: Metric Aggregation (MetricsCollector)
collector.recordEvent({ type: 'agent:birth', timestamp, ... });
  ↓ Aggregates into lifecycle metrics, increments counts
// Stage 3: Querying & Analysis (MetricsAPI, MetricsAnalysis)
const lifespan = collector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 5
});
```

**Key principle:** Events flow one-way through the pipeline. Never modify events retroactively - create new events instead.

### 2. Metric Categories

Metrics are organized into 10 categories:

```typescript
interface AllMetrics {
  agent_lifecycle: Map<string, AgentLifecycleMetrics>;  // Birth, death, legacy
  needs_metrics: Map<string, NeedsMetrics>;             // Hunger, thirst, energy
  economic_metrics: EconomicMetrics;                    // Resources, wealth
  social_metrics: SocialMetrics;                        // Relationships, networks
  spatial_metrics: SpatialMetrics;                      // Movement, territories
  behavioral_metrics: Map<string, BehavioralMetrics>;   // Activities, tasks
  intelligence_metrics: IntelligenceMetrics;            // LLM usage, costs
  performance_metrics: PerformanceMetrics;              // FPS, memory, timing
  emergent_metrics: EmergentMetrics;                    // Patterns, anomalies
  session_metrics: SessionMetrics;                      // Session duration, settings
}
```

**Access pattern:**
```typescript
// Get specific category
const lifecycle = collector.getMetric('agent_lifecycle');

// Get all metrics
const all = collector.getAllMetrics();

// Get aggregated metric
const avgLifespan = collector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 5
});
```

### 3. Time-Series Storage with Bounded Arrays

Metrics use **bounded arrays** to prevent unbounded memory growth:

```typescript
// Time series data structure
interface TimeSeriesDataPoint<T = number> {
  timestamp: number;
  value: T;
}

// Example: FPS tracking
performanceMetrics.fps: TimeSeriesDataPoint[] = [
  { timestamp: 1000, value: 60 },
  { timestamp: 2000, value: 58 },
  { timestamp: 3000, value: 59 },
  // ... max 10,000 entries
];
```

**Automatic pruning:**
- `MAX_SAMPLES = 10,000` - Time series arrays
- `MAX_HEATMAP_ENTRIES = 100,000` - Spatial heatmap
- `MAX_EMERGENT_ENTRIES = 1,000` - Patterns/anomalies

When limits are exceeded, **oldest entries are removed** (shift from array head).

### 4. Hot/Cold Storage Tiering

Metrics use **tiered storage** for performance:

```typescript
class MetricsCollector {
  private hotStorage: Map<string, AgentLifecycleMetrics>;  // Last 1 hour
  private coldStorage: Map<string, AgentLifecycleMetrics>; // Older data

  applyRetentionPolicy(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    // Move old metrics to cold storage
    for (const [agentId, metrics] of this.hotStorage) {
      if (metrics.birthTimestamp < oneHourAgo) {
        this.coldStorage.set(agentId, metrics);
        this.hotStorage.delete(agentId);
      }
    }
  }
}
```

**When to use:**
- **Hot storage:** Recent agents, active queries
- **Cold storage:** Historical analysis, genealogy research

### 5. Event Sampling

High-frequency events can be **sampled** to reduce overhead:

```typescript
const config: MetricsCollectionConfig = {
  samplingRate: 0.1, // Record 10% of events
  snapshotInterval: 100, // Snapshot every 100 ticks
};

const metricsSystem = new MetricsCollectionSystem(world, config);
```

**Sampling strategies:**
- `samplingRate: 1.0` - Record all events (default)
- `samplingRate: 0.5` - Record 50% of events (random sampling)
- `samplingRate: 0.1` - Record 10% of events (heavy throttling)

**When to sample:**
- High agent counts (>100 agents)
- Performance-critical scenarios
- Long-running simulations

### 6. LLM Cost Tracking

The metrics system tracks **LLM usage and estimated costs**:

```typescript
interface IntelligenceMetrics {
  llmCalls: { haiku: number; sonnet: number; opus: number };
  tokensConsumed: { haiku: number; sonnet: number; opus: number; total: number };
  estimatedCost: { haiku: number; sonnet: number; opus: number; total: number };
  avgTokensPerDecision: number;
  avgDecisionLatency: number;
  costPerAgent: number;
  costPerGameHour: number;
}
```

**Cost calculation:**
```typescript
// Event: 'llm:call' → { model: 'haiku', tokensConsumed: 1500 }
const costPerToken = {
  haiku: 0.00001,   // $0.01 per 1k tokens
  sonnet: 0.00003,  // $0.03 per 1k tokens
  opus: 0.00015,    // $0.15 per 1k tokens
};

const cost = tokensConsumed * costPerToken[model];
intelligenceMetrics.estimatedCost[model] += cost;
intelligenceMetrics.estimatedCost.total += cost;
```

**Tracking LLM events:**
- `llm:call` - Basic call tracking
- `llm:request` - Request sent to LLM
- `llm:decision` - Decision made by LLM
- `llm:error` - LLM error occurred
- `agent:llm_context` - Context size tracking

---

## APIs

### MetricsCollector (Core Collection)

Main metrics collection engine. Ingests events and maintains aggregated state.

**Dependencies:** `World` (for initialization)

**Update interval:** Every tick (via `MetricsCollectionSystem`)

**Key methods:**

```typescript
class MetricsCollector {
  // Record a game event
  recordEvent(event: { type: string; timestamp: number; [key: string]: unknown }): void;

  // Sample agent needs (called by MetricsCollectionSystem)
  sampleMetrics(agentId: string, needs: NeedsSample, timestamp: number): void;

  // Sample performance metrics
  samplePerformance(sample: PerformanceSample, timestamp: number): void;

  // Get specific metric category
  getMetric(name: string, timeRange?: TimeRange): any;

  // Get all metrics
  getAllMetrics(): Record<string, any>;

  // Get aggregated metric (avg, sum, min, max, rate)
  getAggregatedMetric(name: string, options: AggregationOptions): any;

  // Export metrics as JSON or CSV
  exportMetrics(format: ExportFormat): Buffer;

  // Detect emergent pattern
  detectPattern(pattern: EmergentPattern): void;

  // Record anomaly
  recordAnomaly(anomaly: Anomaly): void;

  // Record milestone
  recordMilestone(milestone: Milestone): void;

  // Hot/cold storage management
  applyRetentionPolicy(): void;
  getHotStorage(): Map<string, AgentLifecycleMetrics>;
  getColdStorage(): Map<string, AgentLifecycleMetrics>;
}
```

**Valid event types:**
```typescript
const VALID_EVENT_TYPES = [
  'agent:birth', 'agent:death', 'agent:moved',
  'resource:gathered', 'resource:consumed', 'resource:produced',
  'stockpile:updated', 'wealth:calculated',
  'relationship:formed', 'conversation:started',
  'tile:visited', 'pathfinding:failed',
  'activity:started', 'activity:ended',
  'task:started', 'task:completed', 'task:abandoned',
  'llm:call', 'llm:request', 'llm:decision', 'llm:error',
  'plan:created', 'plan:completed',
  'system:tick', 'session:started', 'session:ended',
  'player:intervention', 'game:speed_changed',
];
```

**Creating the collector:**

```typescript
import { MetricsCollector } from '@ai-village/metrics';

const collector = new MetricsCollector(world);

// Record events
collector.recordEvent({
  type: 'agent:birth',
  timestamp: Date.now(),
  agentId: 'agent_123',
  generation: 1,
  parents: null,
  initialStats: { health: 100, hunger: 50, thirst: 50, energy: 100 }
});

// Sample agent needs
collector.sampleMetrics('agent_123', {
  hunger: 45,
  thirst: 60,
  energy: 80,
  temperature: 20,
  health: 95
}, Date.now());

// Query metrics
const lifecycle = collector.getMetric('agent_lifecycle');
const avgLifespan = collector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 1
});
```

### MetricsAPI (REST-like Query API)

Provides structured queries for metrics analysis.

**Dependencies:** `MetricsCollector`, `MetricsStorage` (optional)

**Key methods:**

```typescript
class MetricsAPI {
  // Get network metrics (density, clustering, centrality)
  async getNetworkMetrics(params: NetworkQueryParams): Promise<APIResponse<NetworkMetricsResult>>;

  // Get behavior events (with filtering)
  async getBehaviorEvents(params: BehaviorQueryParams): Promise<APIResponse<BehaviorEventResult[]>>;

  // Get interaction events (conversations, relationships)
  async getInteractionEvents(params: InteractionQueryParams): Promise<APIResponse<InteractionEventResult[]>>;

  // Get spatial heatmap
  async getSpatialHeatmap(params: HeatmapQueryParams): Promise<APIResponse<HeatmapResult>>;

  // Get time series data
  async getTimeSeries(params: TimeSeriesQueryParams): Promise<APIResponse<TimeSeriesResult>>;

  // Get simulation summary
  async getSummary(): Promise<APIResponse<SimulationSummary>>;

  // Export data as CSV or JSON
  async exportData(options: ExportOptions): Promise<APIResponse<string>>;
}
```

**Usage:**

```typescript
import { MetricsAPI } from '@ai-village/metrics';

const api = new MetricsAPI(collector, storage);

// Query network metrics
const networkResult = await api.getNetworkMetrics({
  startTime: Date.now() - 3600000, // Last hour
  endTime: Date.now(),
  resolution: 'medium'
});

if (networkResult.success) {
  console.log(`Network density: ${networkResult.data.density}`);
  console.log(`Top 10 central agents:`, networkResult.data.centralAgents);
}

// Query behavior events
const behaviorResult = await api.getBehaviorEvents({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  agentId: 'agent_123',
  behavior: 'gathering',
  limit: 100
});

// Get spatial heatmap
const heatmapResult = await api.getSpatialHeatmap({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  resolution: 10, // 10x10 grid cells
  metric: 'density'
});
```

### MetricsDashboard (Visualization & Alerts)

Real-time dashboard with charts, alerts, and custom widgets.

**Dependencies:** `MetricsCollector`, `MetricsAnalysis`

**Update interval:** Configurable (default: every 100ms, throttled)

**Key methods:**

```typescript
class MetricsDashboard {
  // Get current state
  getState(): DashboardState;

  // Update all components
  update(): void;

  // Generate chart
  generateChart(chartName: string, chartType: ChartType, options?: ChartOptions): ChartData;

  // Alert management
  addAlert(alert: DashboardAlert): void;
  getAlerts(): DashboardAlert[];
  clearOldAlerts(maxAge: number): void;
  dismissAlert(alertId: string): void;

  // Custom widgets
  addWidget(widget: CustomWidget): void;
  removeWidget(widgetId: string): void;

  // Auto-update
  enableAutoUpdate(intervalMs: number): void;
  disableAutoUpdate(): void;

  // Export
  exportState(format: 'json'): Buffer;
  exportChart(chart: ChartData, format: 'png' | 'svg' | 'json'): Buffer;
}
```

**Chart types:**
- `'line'` - Line chart (time series)
- `'bar'` - Bar chart (comparisons)
- `'stacked_area'` - Stacked area chart (composition)
- `'histogram'` - Histogram (distributions)
- `'heatmap'` - Spatial heatmap
- `'graph'` - Network graph

**Built-in charts:**
- `'population_over_time'` - Population time series
- `'resource_balance'` - Resource stockpiles over time
- `'intelligence_distribution'` - Intelligence histogram
- `'spatial_heatmap'` - Agent movement heatmap
- `'social_network'` - Social network graph

**Usage:**

```typescript
import { MetricsDashboard, MetricsAnalysis } from '@ai-village/metrics';

const analysis = new MetricsAnalysis(collector);
const dashboard = new MetricsDashboard(collector, analysis);

// Enable auto-update
dashboard.enableAutoUpdate(1000); // Update every second

// Generate charts
const populationChart = dashboard.generateChart('population_over_time', 'line');
const heatmap = dashboard.generateChart('spatial_heatmap', 'heatmap');

// Get alerts
const alerts = dashboard.getAlerts();
for (const alert of alerts) {
  console.log(`[${alert.type}] ${alert.message}`);
}

// Add custom alert
dashboard.addAlert({
  type: 'warning',
  message: 'Population below 10!',
  metric: 'population',
  threshold: 10,
  currentValue: 8,
  timestamp: Date.now()
});
```

### RingBuffer (Circular Buffer Utility)

Efficient fixed-size circular buffer for recent events.

**Key methods:**

```typescript
class RingBuffer<T> {
  constructor(capacity: number);

  push(item: T): void;                      // Add item (overwrites oldest when full)
  getRecent(count: number): T[];            // Get N most recent items
  getAll(): T[];                            // Get all items
  clear(): void;                            // Clear buffer
  size(): number;                           // Current item count
  isEmpty(): boolean;                       // Check if empty
  isFull(): boolean;                        // Check if full
  peek(): T | undefined;                    // Get most recent item
  peekOldest(): T | undefined;              // Get oldest item
  forEach(callback: (item: T) => void): void; // Iterate
  filter(predicate: (item: T) => boolean): T[]; // Filter items
  findRecent(predicate: (item: T) => boolean): T | undefined; // Find newest match
}
```

**Usage:**

```typescript
import { RingBuffer } from '@ai-village/metrics';

// Create buffer for last 100 FPS samples
const fpsBuffer = new RingBuffer<number>(100);

// Record FPS
fpsBuffer.push(60);
fpsBuffer.push(58);
fpsBuffer.push(59);

// Get recent samples
const last10 = fpsBuffer.getRecent(10);
const all = fpsBuffer.getAll();

// Calculate average
const avgFps = all.reduce((sum, fps) => sum + fps, 0) / all.length;

// Find frame drops
const frameDrop = fpsBuffer.findRecent(fps => fps < 30);
if (frameDrop) {
  console.warn(`Frame drop detected: ${frameDrop} FPS`);
}
```

### MetricsCollectionSystem (ECS Bridge)

ECS system that bridges game events to `MetricsCollector`.

**Priority:** 999 (runs last to capture all events)

**Configuration:**

```typescript
interface MetricsCollectionConfig {
  enabled: boolean;            // Enable/disable collection
  samplingRate: number;        // 0-1, % of events to record
  snapshotInterval: number;    // Ticks between population snapshots
  streaming?: boolean;         // Enable live streaming
  streamConfig?: MetricsStreamConfig;
  canonEvents?: CanonEventConfig;
}
```

**Creating the system:**

```typescript
import { MetricsCollectionSystem } from '@ai-village/core';

const metricsSystem = new MetricsCollectionSystem(world, {
  enabled: true,
  samplingRate: 1.0,           // Record all events
  snapshotInterval: 100,       // Snapshot every 100 ticks
  streaming: false,            // Disable live streaming
});

world.addSystem(metricsSystem);
```

**Accessing the collector:**

```typescript
// Get collector from system
const collector = metricsSystem['collector']; // Private field, use carefully

// Or access via world
const metricsSystem = world.getSystem('metrics_collection') as MetricsCollectionSystem;
```

---

## Usage Examples

### Example 1: Basic Metrics Collection

```typescript
import { MetricsCollector } from '@ai-village/metrics';

const collector = new MetricsCollector(world);

// Record agent birth
collector.recordEvent({
  type: 'agent:birth',
  timestamp: Date.now(),
  agentId: 'agent_001',
  generation: 1,
  parents: null,
  initialStats: { health: 100, hunger: 50, thirst: 50, energy: 100 }
});

// Record resource gathering
collector.recordEvent({
  type: 'resource:gathered',
  timestamp: Date.now(),
  agentId: 'agent_001',
  resourceType: 'berries',
  amount: 5,
  gatherTime: 1200
});

// Query lifecycle metrics
const lifecycle = collector.getMetric('agent_lifecycle');
const agentMetrics = lifecycle.get('agent_001');
console.log(`Agent born at: ${agentMetrics.birthTimestamp}`);
console.log(`Resources gathered:`, agentMetrics.resourcesGathered);
```

### Example 2: Performance Monitoring

```typescript
import { MetricsCollector } from '@ai-village/metrics';

const collector = new MetricsCollector(world);

// Sample performance every frame
function onFrame() {
  const fps = calculateFPS();
  const memory = performance.memory.usedJSHeapSize;

  collector.samplePerformance({
    fps,
    tickDuration: lastTickDuration,
    entityCount: world.getEntityCount(),
    memoryUsage: memory
  }, Date.now());
}

// Check performance metrics
const perfMetrics = collector.getMetric('performance_metrics');
console.log(`Average FPS: ${perfMetrics.avgFps}`);
console.log(`Min FPS: ${perfMetrics.minFps}`);
console.log(`Frame drops: ${perfMetrics.frameDrops}`);
console.log(`Peak memory: ${perfMetrics.peakMemory}`);
```

### Example 3: LLM Cost Tracking

```typescript
import { MetricsCollector } from '@ai-village/metrics';

const collector = new MetricsCollector(world);

// Record LLM call
collector.recordEvent({
  type: 'llm:call',
  timestamp: Date.now(),
  model: 'haiku',
  tokensConsumed: 1500,
  purpose: 'decision'
});

// Query intelligence metrics
const intelligence = collector.getMetric('intelligence_metrics');
console.log(`Total LLM calls: ${intelligence.llmCalls.haiku + intelligence.llmCalls.sonnet + intelligence.llmCalls.opus}`);
console.log(`Total tokens: ${intelligence.tokensConsumed.total}`);
console.log(`Estimated cost: $${intelligence.estimatedCost.total.toFixed(4)}`);
console.log(`Cost per agent: $${intelligence.costPerAgent.toFixed(4)}`);
console.log(`Avg tokens/decision: ${intelligence.avgTokensPerDecision}`);
```

### Example 4: Dashboard with Alerts

```typescript
import { MetricsCollector, MetricsAnalysis, MetricsDashboard } from '@ai-village/metrics';

const collector = new MetricsCollector(world);
const analysis = new MetricsAnalysis(collector);
const dashboard = new MetricsDashboard(collector, analysis);

// Enable auto-update
dashboard.enableAutoUpdate(1000);

// Check alerts every frame
function onFrame() {
  const alerts = dashboard.getAlerts();

  for (const alert of alerts) {
    if (alert.type === 'critical') {
      console.error(`[CRITICAL] ${alert.message}`);
    } else if (alert.type === 'warning') {
      console.warn(`[WARNING] ${alert.message}`);
    } else {
      console.info(`[INFO] ${alert.message}`);
    }
  }

  // Clear old alerts (older than 10 seconds)
  dashboard.clearOldAlerts(10000);
}
```

### Example 5: Querying Metrics via API

```typescript
import { MetricsCollector, MetricsAPI } from '@ai-village/metrics';

const collector = new MetricsCollector(world);
const api = new MetricsAPI(collector);

// Get simulation summary
const summaryResult = await api.getSummary();
if (summaryResult.success) {
  const summary = summaryResult.data;
  console.log(`Session ID: ${summary.sessionId}`);
  console.log(`Duration: ${summary.duration}ms`);
  console.log(`Peak population: ${summary.peakPopulation}`);
  console.log(`Current population: ${summary.currentPopulation}`);
  console.log(`Total births: ${summary.totalBirths}`);
  console.log(`Total deaths: ${summary.totalDeaths}`);
}

// Get network metrics
const networkResult = await api.getNetworkMetrics({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  resolution: 'high'
});

if (networkResult.success) {
  console.log(`Network density: ${networkResult.data.density}`);
  console.log(`Average clustering: ${networkResult.data.clustering}`);
  console.log(`Top 3 central agents:`);
  for (const agent of networkResult.data.centralAgents.slice(0, 3)) {
    console.log(`  ${agent.agentId}: ${agent.centrality}`);
  }
}
```

### Example 6: Aggregated Metrics

```typescript
import { MetricsCollector } from '@ai-village/metrics';

const collector = new MetricsCollector(world);

// Average lifespan for generation 5
const avgLifespan = collector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 5
});
console.log(`Generation 5 avg lifespan: ${avgLifespan}`);

// Most common cause of death
const deathCauses = collector.getAggregatedMetric('death_causes', {
  aggregation: 'most_common'
});
console.log(`Most common death: ${deathCauses.mostCommon} (${deathCauses.count} times)`);

// Average hunger across all agents
const avgHunger = collector.getAggregatedMetric('hunger', {
  aggregation: 'avg'
});
console.log(`Average hunger: ${avgHunger}`);

// Total berries gathered
const berriesGathered = collector.getAggregatedMetric('resources_gathered', {
  aggregation: 'sum',
  resourceType: 'berries'
});
console.log(`Total berries gathered: ${berriesGathered}`);

// Resource balance (gathered - consumed)
const berryBalance = collector.getAggregatedMetric('resource_balance', {
  aggregation: 'net',
  resourceType: 'berries'
});
console.log(`Berry balance: ${berryBalance}`);
```

---

## Architecture & Data Flow

### System Execution Order

```
1. Game systems (priority 0-500)
   ↓ Generate gameplay events
2. Agent systems (priority 100-300)
   ↓ Emit agent:*, resource:* events
3. Economic systems (priority 200-400)
   ↓ Emit stockpile:*, wealth:* events
4. Social systems (priority 150-350)
   ↓ Emit conversation:*, relationship:* events
5. MetricsCollectionSystem (priority 999)
   ↓ Captures ALL events from all systems
   → Routes to MetricsCollector
   → Aggregates into metric categories
```

**Why priority 999?**
- Metrics must run **after all gameplay systems** to capture their events
- Running last ensures complete event coverage
- Doesn't block gameplay logic

### Event Flow

```
GameSystem
  ↓ eventBus.emit('agent:birth', data)
MetricsCollectionSystem
  ↓ setupEventListeners() → eventBus.subscribe('agent:birth', handler)
  ↓ handler() → collector.recordEvent({ type: 'agent:birth', ... })
MetricsCollector
  ↓ handleAgentBirth(event)
  → agentLifecycle.set(agentId, metrics)
  → hotStorage.set(agentId, metrics)
  → sessionMetrics.totalBirths++

QuerySystem
  ↓ collector.getMetric('agent_lifecycle')
  ← Returns Map<agentId, AgentLifecycleMetrics>
```

### Metric Storage Architecture

```
MetricsCollector
├── agent_lifecycle: Map<agentId, AgentLifecycleMetrics>
│   ├── hotStorage: Map<agentId, metrics>   # Last 1 hour
│   └── coldStorage: Map<agentId, metrics>  # Older data
├── needs_metrics: Map<agentId, NeedsMetrics>
│   └── hunger: TimeSeriesDataPoint[]       # Max 10k samples
├── economic_metrics: EconomicMetrics
│   ├── resourcesGathered: Map<type, ResourceMetrics>
│   └── stockpiles: Map<type, TimeSeriesDataPoint[]>
├── spatial_metrics: SpatialMetrics
│   ├── agents: Map<agentId, AgentSpatialMetrics>
│   └── heatmap: Map<x, Map<y, count>>      # Max 100k entries
├── performance_metrics: PerformanceMetrics
│   ├── fps: TimeSeriesDataPoint[]          # Max 10k samples
│   └── systemTiming: Map<system, duration>
└── emergent_metrics: EmergentMetrics
    ├── detectedPatterns: EmergentPattern[]  # Max 1k entries
    └── anomalies: Anomaly[]                 # Max 1k entries
```

### Component Relationships

```
World
└── MetricsCollectionSystem (priority 999)
    └── MetricsCollector
        ├── agent_lifecycle: Map<agentId, metrics>
        ├── needs_metrics: Map<agentId, metrics>
        ├── behavioral_metrics: Map<agentId, metrics>
        └── [other metric categories]

External Access
├── MetricsAPI(collector) → REST-like queries
├── MetricsDashboard(collector, analysis) → Visualization
└── MetricsStreamClient(config) → Live streaming
```

---

## Performance Considerations

**Optimization strategies:**

1. **Event sampling:** Use `samplingRate < 1.0` for high-frequency events
2. **Bounded arrays:** Automatic pruning at MAX_SAMPLES (10k entries)
3. **Hot/cold storage:** Tiered storage for recent vs historical data
4. **Throttled updates:** Dashboard updates throttled to 100ms minimum
5. **Lazy aggregation:** Metrics aggregated on-demand, not pre-computed
6. **Memory cleanup:** Dead agents removed from tracking maps

**Memory footprint:**

```typescript
// Per-agent overhead
AgentLifecycleMetrics: ~500 bytes
NeedsMetrics: ~10kb (5 time series × 2kb each)
BehavioralMetrics: ~2kb
SpatialMetrics: ~200 bytes

// Total per agent: ~13kb
// 100 agents: ~1.3 MB
// 1000 agents: ~13 MB
```

**Performance metrics overhead:**

```typescript
const perfMetrics = dashboard.getPerformanceMetrics();
console.log(`Last render: ${perfMetrics.lastRenderTime}ms`);
console.log(`Avg render: ${perfMetrics.avgRenderTime}ms`);
console.log(`Render count: ${perfMetrics.renderCount}`);
```

**Query caching:**

```typescript
// ❌ BAD: Query in loop
for (const agent of agents) {
  const lifecycle = collector.getMetric('agent_lifecycle'); // Query every iteration!
  const metrics = lifecycle.get(agent.id);
}

// ✅ GOOD: Cache query result
const lifecycle = collector.getMetric('agent_lifecycle'); // Query once
for (const agent of agents) {
  const metrics = lifecycle.get(agent.id);
}
```

**Bounded array management:**

```typescript
// Automatic pruning
private addBoundedSample<T>(array: T[], sample: T): void {
  array.push(sample);
  if (array.length > MetricsCollector.MAX_SAMPLES) {
    array.shift(); // Remove oldest entry
  }
}

// Manual pruning (spatial heatmap)
private pruneHeatmapIfNeeded(): void {
  let entryCount = 0;
  for (const x in this.spatialMetrics.heatmap) {
    entryCount += Object.keys(this.spatialMetrics.heatmap[x]).length;
  }

  if (entryCount > MetricsCollector.MAX_HEATMAP_ENTRIES) {
    this.spatialMetrics.heatmap = {}; // Reset heatmap
  }
}
```

---

## Troubleshooting

### No metrics data available

**Check:**
1. Is `MetricsCollectionSystem` added to world? (`world.addSystem(metricsSystem)`)
2. Is metrics collection enabled? (`config.enabled = true`)
3. Are events being emitted? (Check `eventBus.emit()` calls)
4. Is sampling rate too low? (`config.samplingRate >= 0.1`)

**Debug:**
```typescript
const metricsSystem = world.getSystem('metrics_collection') as MetricsCollectionSystem;
if (!metricsSystem) {
  console.error('MetricsCollectionSystem not added to world!');
}

const all = collector.getAllMetrics();
if (Object.keys(all).length === 0) {
  console.warn('No metrics data - check event emissions');
}
```

### Memory leak from unbounded growth

**Check:**
1. Are bounded arrays being used? (Check `addBoundedSample()` calls)
2. Is hot/cold storage being applied? (`applyRetentionPolicy()`)
3. Are dead agents being cleaned up? (Check `handleAgentDeath()`)

**Debug:**
```typescript
const hotSize = collector.getHotStorage().size;
const coldSize = collector.getColdStorage().size;
console.log(`Hot storage: ${hotSize} agents, Cold storage: ${coldSize} agents`);

// Check for unbounded growth
const perfMetrics = collector.getMetric('performance_metrics');
if (perfMetrics.fps.length > 10000) {
  console.error('FPS array exceeded MAX_SAMPLES!');
}
```

### LLM cost tracking incorrect

**Check:**
1. Are `llm:call` events being emitted? (Check LLM integration)
2. Are token counts accurate? (Verify LLM response parsing)
3. Are cost rates up-to-date? (Update `costPerToken` values)

**Debug:**
```typescript
const intelligence = collector.getMetric('intelligence_metrics');
console.log(`Haiku calls: ${intelligence.llmCalls.haiku}`);
console.log(`Haiku tokens: ${intelligence.tokensConsumed.haiku}`);
console.log(`Haiku cost: $${intelligence.estimatedCost.haiku}`);

// Manual verification
const expectedCost = intelligence.tokensConsumed.haiku * 0.00001;
if (Math.abs(intelligence.estimatedCost.haiku - expectedCost) > 0.01) {
  console.error('Cost calculation mismatch!');
}
```

### Dashboard alerts not appearing

**Check:**
1. Is `updateAlerts()` being called? (Called by `dashboard.update()`)
2. Are alert thresholds correct? (Check `threshold` values)
3. Are alerts being dismissed too quickly? (`clearOldAlerts()` max age)
4. Is auto-update enabled? (`enableAutoUpdate()`)

**Debug:**
```typescript
// Force alert update
dashboard.updateAlerts();

// Check alert count
const alerts = dashboard.getAlerts();
console.log(`Active alerts: ${alerts.length}`);

// Check alert types
for (const alert of alerts) {
  console.log(`[${alert.type}] ${alert.metric}: ${alert.message}`);
}

// Add test alert
dashboard.addAlert({
  type: 'info',
  message: 'Test alert',
  metric: 'test',
  threshold: 0,
  timestamp: Date.now()
});
```

### "Unknown event type" error

**Error:** `Error: Unknown event type: custom:event`

**Fix:** Event types are validated against `VALID_EVENT_TYPES`. Either:

1. Add your event type to the whitelist:
```typescript
// In MetricsCollector.ts
const VALID_EVENT_TYPES = new Set([
  // ... existing types
  'custom:event', // Add your type
]);
```

2. Or use a generic event type:
```typescript
// Use existing type that fits
collector.recordEvent({
  type: 'player:intervention', // Generic player action
  timestamp: Date.now(),
  customData: { ... }
});
```

### Chart generation fails

**Error:** `Error: Unsupported chart type: pie`

**Fix:** Only specific chart types are supported. Use one of:
```typescript
const validChartTypes: ChartType[] = [
  'line', 'bar', 'stacked_area', 'histogram', 'heatmap', 'graph'
];

// Correct usage
const chart = dashboard.generateChart('population_over_time', 'line');
```

---

## Integration with Other Systems

### GameLoop Integration

Metrics are collected automatically via `MetricsCollectionSystem`:

```typescript
import { MetricsCollectionSystem } from '@ai-village/core';

class GameLoop {
  constructor() {
    const metricsSystem = new MetricsCollectionSystem(this.world, {
      enabled: true,
      samplingRate: 1.0,
      snapshotInterval: 100
    });

    this.world.addSystem(metricsSystem);
  }

  tick() {
    // All systems emit events
    this.world.update();

    // MetricsCollectionSystem (priority 999) captures events
    // Metrics automatically aggregated
  }
}
```

### Event System Integration

Metrics subscribe to **all gameplay events**:

```typescript
// Example: Agent system emits events
eventBus.emit('agent:birth', {
  agentId: 'agent_001',
  generation: 1,
  parents: null,
  initialStats: { ... }
});

// MetricsCollectionSystem automatically captures it
// No additional integration needed
```

### Dashboard Integration

Metrics power real-time dashboards:

```typescript
import { MetricsDashboard } from '@ai-village/metrics';

const dashboard = new MetricsDashboard(collector, analysis);

// Enable auto-update in game loop
class GameLoop {
  constructor() {
    dashboard.enableAutoUpdate(1000); // Update every second
  }

  render() {
    // Get live metrics
    const state = dashboard.getState();

    // Render population counter
    renderText(`Population: ${state.liveMetrics.population}`);

    // Render alerts
    for (const alert of dashboard.getAlerts()) {
      renderAlert(alert);
    }
  }
}
```

### Web Dashboard Integration

Expose metrics via HTTP API:

```typescript
import express from 'express';
import { MetricsAPI } from '@ai-village/metrics';

const app = express();
const api = new MetricsAPI(collector, storage);

// Network metrics endpoint
app.get('/api/metrics/network', async (req, res) => {
  const result = await api.getNetworkMetrics({
    startTime: Number(req.query.startTime),
    endTime: Number(req.query.endTime),
    resolution: req.query.resolution as 'high' | 'medium' | 'low'
  });
  res.json(result);
});

// Summary endpoint
app.get('/api/metrics/summary', async (req, res) => {
  const result = await api.getSummary();
  res.json(result);
});

app.listen(8766, () => {
  console.log('Metrics API running on http://localhost:8766');
});
```

---

## Testing

Run metrics tests:

```bash
npm test -- MetricsCollector.test.ts
npm test -- MetricsDashboard.test.ts
npm test -- MetricsCollection.integration.test.ts
```

**Key test files:**
- `packages/core/src/__tests__/MetricsCollector.test.ts` - Core collection tests
- `packages/core/src/__tests__/MetricsDashboard.integration.test.ts` - Dashboard tests
- `packages/core/src/systems/__tests__/MetricsCollection.integration.test.ts` - Integration tests
- `packages/metrics/src/__tests__/RingBuffer.test.ts` - RingBuffer tests

**Test coverage:**
- Event recording and validation
- Metric aggregation (avg, sum, min, max)
- Hot/cold storage tiering
- Dashboard alerts and charts
- API query methods
- Performance overhead

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference (MetricsCollectionSystem priority 999)
- **COMPONENTS_REFERENCE.md** - All component types
- **PERFORMANCE.md** - Performance optimization guide
- **custom_game_engine/packages/metrics/src/types.ts** - Full type definitions
- **Dashboard API Spec** - `/dashboard` endpoint documentation

---

## Summary for Language Models

**Before working with metrics:**
1. Understand the three-stage pipeline: Events → Collection → Aggregation
2. Know the 10 metric categories (lifecycle, needs, economic, social, etc.)
3. Understand bounded arrays and memory limits (MAX_SAMPLES, MAX_HEATMAP_ENTRIES)
4. Know event types must be in `VALID_EVENT_TYPES` whitelist
5. Understand hot/cold storage tiering for performance

**Common tasks:**
- **Record event:** `collector.recordEvent({ type, timestamp, ... })`
- **Query metrics:** `collector.getMetric('agent_lifecycle')`
- **Aggregate metrics:** `collector.getAggregatedMetric('lifespan_by_generation', { aggregation: 'avg', generation: 5 })`
- **Generate chart:** `dashboard.generateChart('population_over_time', 'line')`
- **Check alerts:** `dashboard.getAlerts()`
- **Export data:** `collector.exportMetrics('json')`

**Critical rules:**
- Never modify metrics retroactively - create new events instead
- Always validate event types against `VALID_EVENT_TYPES`
- Use bounded arrays (`addBoundedSample()`) to prevent memory leaks
- Apply retention policy (`applyRetentionPolicy()`) for long-running sims
- Clean up dead agents from tracking maps
- Don't query in loops - cache query results
- Use sampling (`samplingRate < 1.0`) for high-frequency events

**Event-driven architecture:**
- Listen to **all game events** via `MetricsCollectionSystem` (priority 999)
- Emit standard event types (agent:*, resource:*, llm:*, etc.)
- Never bypass `MetricsCollector` for metric updates
- Events flow one-way: GameSystem → EventBus → MetricsCollectionSystem → MetricsCollector

**Performance:**
- Metrics overhead: ~13kb per agent
- Dashboard updates throttled to 100ms minimum
- Time series capped at 10k samples per metric
- Spatial heatmap capped at 100k entries
- Use sampling for >100 agents or long-running sims
