# Sociological Metrics System - Technical Specification

> **Status**: Phase 22 Ready
> **Dependencies**: Phase 3 (Agent Needs), Phase 4 (Memory & Social), Phase 5 (Communication)
> **Estimated Total LOC**: ~7,000
> **Last Updated**: 2025-12-22

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Core Components](#2-core-components)
3. [Data Storage Strategy](#3-data-storage-strategy)
4. [Analysis Modules](#4-analysis-modules)
5. [API Design](#5-api-design)
6. [Performance Considerations](#6-performance-considerations)
7. [Visualization Dashboard](#7-visualization-dashboard)
8. [Configuration Files](#8-configuration-files)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Plan](#10-implementation-plan)

---

## 1. System Architecture

### 1.1 Overview
The metrics system is a modular, event-driven architecture that collects, aggregates, and exposes sociological data from the simulation without impacting performance.

```
┌─────────────────────────────────────────────────────────┐
│                    Game Engine Core                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ AISystem │  │  World   │  │ Renderer │             │
│  └────┬─────┘  └────┬─────┘  └──────────┘             │
│       │             │                                    │
│       │ events      │ events                            │
│       ▼             ▼                                    │
│  ┌─────────────────────────────────┐                   │
│  │    MetricsCollectionSystem      │                   │
│  │  - Event listeners              │                   │
│  │  - Data buffering               │                   │
│  │  - Sampling strategies          │                   │
│  └────────────┬────────────────────┘                   │
└───────────────┼─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Processing Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Aggregators │  │  Analyzers   │  │  Exporters   │ │
│  │  - Network   │  │  - Network   │  │  - JSON      │ │
│  │  - Behavior  │  │  - Culture   │  │  - CSV       │ │
│  │  - Spatial   │  │  - Inequality│  │  - SQLite    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics API & Visualization                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  REST API    │  │  WebSocket   │  │  Dashboard   │ │
│  │  - Queries   │  │  - Live feed │  │  - Graphs    │ │
│  │  - Filters   │  │  - Metrics   │  │  - Networks  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **Minimal Performance Impact**: <1ms overhead per game tick
2. **Sampling Strategies**: Configurable sampling rates for high-frequency events
3. **Lazy Computation**: Expensive metrics computed on-demand or periodically
4. **Modular Architecture**: Each analyzer is independent and can be enabled/disabled
5. **Storage Flexibility**: In-memory buffers for real-time + SQLite for persistence

---

## 2. Core Components

### 2.1 MetricsCollectionSystem (ECS System)

**Location**: `packages/core/src/systems/MetricsCollectionSystem.ts`

**Responsibilities**:
- Listen to game events (agent actions, interactions, state changes)
- Buffer high-frequency data
- Emit to processing layer at configurable intervals
- Minimal performance overhead (<1ms per update)

**Configuration**:
```typescript
interface MetricsConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, what % of events to record
  bufferSize: number; // max events before flush
  flushInterval: number; // ms between auto-flush
  collectSpatial: boolean;
  collectInteractions: boolean;
  collectBehaviors: boolean;
  collectNetwork: boolean;
}
```

**Integration Points**:
```typescript
class MetricsCollectionSystem extends System {
  update(world: World): void {
    // Minimal overhead - just buffer events
    const events = this.eventBus.poll('agent:*');
    for (const event of events) {
      if (this.shouldSample(event)) {
        this.buffer.push(event);
      }
    }

    if (this.shouldFlush()) {
      this.flush();
    }
  }
}
```

### 2.2 Event Schemas

**Base Event**:
```typescript
interface MetricEvent {
  type: string;
  timestamp: number;
  simulationTime: number; // in-game time
  tick: number;
}
```

**Interaction Event**:
```typescript
interface InteractionEvent extends MetricEvent {
  type: 'interaction';
  agent1: string;
  agent2: string;
  distance: number;
  duration: number; // if tracked
  context: {
    agent1Behavior: string;
    agent2Behavior: string;
    agent1Health: number;
    agent2Health: number;
    location: { x: number; y: number };
    weather?: string;
  };
}
```

**Behavior Event**:
```typescript
interface BehaviorEvent extends MetricEvent {
  type: 'behavior';
  agentId: string;
  behavior: string;
  previousBehavior: string;
  location: { x: number; y: number };
  health: number;
  energy: number;
  nearbyAgents: string[];
  isNovel: boolean; // first time this agent does this behavior
}
```

**Spatial Snapshot** (sampled at lower frequency):
```typescript
interface SpatialSnapshot extends MetricEvent {
  type: 'spatial';
  agents: Array<{
    id: string;
    position: { x: number; y: number };
    behavior: string;
    health: number;
  }>;
}
```

**Resource Event**:
```typescript
interface ResourceEvent extends MetricEvent {
  type: 'resource';
  agentId: string;
  action: 'consume' | 'gather' | 'share';
  resourceType: string;
  amount: number;
  location: { x: number; y: number };
  recipientId?: string; // for sharing
}
```

---

## 3. Data Storage Strategy

### 3.1 In-Memory Buffers (During Simulation)

**RingBuffer for Recent Events**:
```typescript
class RingBuffer<T> {
  private buffer: T[];
  private capacity: number;
  private writeIndex: number;

  // Keep last N events for real-time queries
  push(item: T): void;
  getRecent(count: number): T[];
  clear(): void;
}
```

**Time-Series Aggregates** (retained in memory):
```typescript
interface TimeSeriesAggregate {
  windowStart: number;
  windowEnd: number;
  populationSize: number;
  avgHealth: number;
  avgEnergy: number;
  behaviorCounts: Record<string, number>;
  interactionCount: number;
  spatialEntropy: number;
}
```

### 3.2 Persistent Storage (SQLite)

**Location**: `custom_game_engine/data/metrics.db`

**Schema**:

```sql
-- Raw interaction events
CREATE TABLE interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  simulation_time INTEGER NOT NULL,
  tick INTEGER NOT NULL,
  agent1_id TEXT NOT NULL,
  agent2_id TEXT NOT NULL,
  distance REAL,
  location_x REAL,
  location_y REAL,
  context_json TEXT -- JSON blob for flexibility
);
CREATE INDEX idx_interactions_time ON interactions(simulation_time);
CREATE INDEX idx_interactions_agents ON interactions(agent1_id, agent2_id);

-- Behavior transitions
CREATE TABLE behavior_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  simulation_time INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  behavior TEXT NOT NULL,
  previous_behavior TEXT,
  location_x REAL,
  location_y REAL,
  health REAL,
  energy REAL,
  is_novel BOOLEAN
);
CREATE INDEX idx_behavior_agent_time ON behavior_events(agent_id, simulation_time);

-- Periodic snapshots (every N ticks)
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  simulation_time INTEGER NOT NULL,
  tick INTEGER NOT NULL,
  population_size INTEGER,
  avg_health REAL,
  avg_energy REAL,
  behavior_distribution_json TEXT,
  network_metrics_json TEXT,
  spatial_metrics_json TEXT
);
CREATE INDEX idx_snapshots_time ON snapshots(simulation_time);

-- Social network edges (updated periodically)
CREATE TABLE social_network (
  agent1_id TEXT NOT NULL,
  agent2_id TEXT NOT NULL,
  interaction_count INTEGER DEFAULT 1,
  last_interaction INTEGER,
  first_interaction INTEGER,
  total_duration REAL,
  PRIMARY KEY (agent1_id, agent2_id)
);
```

### 3.3 Export Formats

**CSV Export** (for external analysis in R, Python, etc.):
- `interactions.csv`
- `behaviors.csv`
- `snapshots.csv`
- `network_edges.csv`

**JSON Export** (for visualization, archival):
```typescript
interface ExportBundle {
  metadata: {
    exportDate: string;
    simulationDuration: number;
    totalTicks: number;
    configUsed: MetricsConfig;
  };
  timeSeries: TimeSeriesAggregate[];
  networkSnapshots: NetworkSnapshot[];
  spatialHeatmaps: SpatialHeatmap[];
  summary: SimulationSummary;
}
```

---

## 4. Analysis Modules

### 4.1 NetworkAnalyzer

**Location**: `packages/core/src/metrics/analyzers/NetworkAnalyzer.ts`

```typescript
class NetworkAnalyzer {
  /**
   * Compute network metrics from interaction history
   */
  computeMetrics(interactions: InteractionEvent[]): NetworkMetrics {
    const graph = this.buildGraph(interactions);

    return {
      density: this.computeDensity(graph),
      clustering: this.computeClusteringCoefficient(graph),
      centralityScores: this.computeCentrality(graph),
      communities: this.detectCommunities(graph),
      diameter: this.computeDiameter(graph),
      components: this.findConnectedComponents(graph),
    };
  }

  /**
   * Track network evolution over time
   */
  computeTemporalMetrics(
    interactions: InteractionEvent[],
    windowSize: number
  ): TimeSeriesNetworkMetrics[];

  /**
   * Detect significant network events
   */
  detectEvents(metrics: TimeSeriesNetworkMetrics[]): NetworkEvent[] {
    // Returns: community splits, new hub formation, network fragmentation, etc.
  }
}

interface NetworkMetrics {
  density: number;
  clustering: number;
  avgPathLength: number;
  diameter: number;
  components: number;
  modularity: number;
  centralityScores: Map<string, number>;
  communities: string[][]; // agent IDs grouped by community
}
```

**Key Algorithms**:
- **Density**: `edges / (nodes * (nodes - 1) / 2)`
- **Clustering Coefficient**: Watts-Strogatz method
- **Centrality**: Degree, betweenness, closeness centrality
- **Community Detection**: Louvain algorithm or label propagation

### 4.2 CulturalDiffusionAnalyzer

**Location**: `packages/core/src/metrics/analyzers/CulturalDiffusionAnalyzer.ts`

```typescript
class CulturalDiffusionAnalyzer {
  /**
   * Track how behaviors spread through the population
   */
  traceDiffusion(
    behaviors: BehaviorEvent[],
    interactions: InteractionEvent[]
  ): DiffusionCascade[] {
    // Identify innovation events (first occurrence of behavior)
    // Track adoption spread through social network
    // Calculate transmission probability
    // Identify super-spreaders
  }

  /**
   * Measure cultural similarity between agents
   */
  computeCulturalDistance(
    agent1: string,
    agent2: string,
    behaviorHistory: BehaviorEvent[]
  ): number {
    // Behavioral repertoire overlap
    // Sequence similarity (do they do things in same order?)
  }

  /**
   * Detect cultural convergence/divergence
   */
  trackCulturalDynamics(
    behaviors: BehaviorEvent[],
    windowSize: number
  ): CulturalDynamicsTimeSeries;
}

interface DiffusionCascade {
  behaviorId: string;
  innovator: string;
  innovationTime: number;
  adoptionEvents: Array<{
    agentId: string;
    time: number;
    sourceAgent?: string; // who they learned from
  }>;
  finalAdoptionRate: number;
  spreadVelocity: number; // agents per time unit
}
```

### 4.3 SpatialAnalyzer

**Location**: `packages/core/src/metrics/analyzers/SpatialAnalyzer.ts`

```typescript
class SpatialAnalyzer {
  /**
   * Compute spatial distribution metrics
   */
  computeSpatialMetrics(snapshot: SpatialSnapshot): SpatialMetrics {
    return {
      spatialEntropy: this.computeEntropy(snapshot),
      clusteringIndex: this.computeSpatialClustering(snapshot),
      segregationIndex: this.computeSegregation(snapshot),
      convexHullArea: this.computeConvexHull(snapshot),
      nearestNeighborDist: this.computeNearestNeighbor(snapshot),
    };
  }

  /**
   * Detect territory formation
   */
  detectTerritories(
    spatialHistory: SpatialSnapshot[],
    minDuration: number
  ): Territory[];

  /**
   * Identify resource hotspots
   */
  identifyHotspots(events: (BehaviorEvent | InteractionEvent)[]): Hotspot[];

  /**
   * Generate heatmap data
   */
  generateHeatmap(
    events: { location: { x: number; y: number } }[],
    resolution: number
  ): number[][];
}

interface Territory {
  agentIds: string[];
  boundaryPolygon: { x: number; y: number }[];
  startTime: number;
  endTime: number;
  stability: number; // how consistent is occupancy?
}
```

### 4.4 InequalityAnalyzer

**Location**: `packages/core/src/metrics/analyzers/InequalityAnalyzer.ts`

```typescript
class InequalityAnalyzer {
  /**
   * Compute Gini coefficient for resource distribution
   */
  computeGini(values: number[]): number;

  /**
   * Track wealth mobility over time
   */
  computeMobility(
    snapshots: Array<{ agentId: string; resources: number }[]>,
    windowSize: number
  ): MobilityMetrics;

  /**
   * Correlate social position with outcomes
   */
  analyzeStratification(
    networkMetrics: NetworkMetrics,
    agentStates: Map<string, AgentState>
  ): StratificationAnalysis;
}

interface StratificationAnalysis {
  healthByQuartile: number[]; // [Q1, Q2, Q3, Q4]
  centralityHealthCorrelation: number;
  resourceAccessByPosition: Map<string, number>;
  socialMobilityRate: number;
}
```

---

## 5. API Design

### 5.1 REST API

**Base URL**: `http://localhost:3001/api/metrics`

**Endpoints**:

```typescript
// Network metrics
GET /api/metrics/network
  Query params:
    - startTime: number
    - endTime: number
    - resolution: 'high' | 'medium' | 'low'
  Returns: NetworkMetrics

// Behavior events
GET /api/metrics/behaviors
  Query params:
    - agentId?: string
    - behavior?: string
    - startTime: number
    - endTime: number
  Returns: BehaviorEvent[]

// Interaction events
GET /api/metrics/interactions
  Query params:
    - agent1?: string
    - agent2?: string
    - startTime: number
    - endTime: number
    - limit: number
  Returns: InteractionEvent[]

// Spatial heatmap
GET /api/metrics/spatial/heatmap
  Query params:
    - startTime: number
    - endTime: number
    - resolution: number
    - metric: 'density' | 'interactions' | 'behaviors'
  Returns: HeatmapData

// Time series data
GET /api/metrics/timeseries
  Query params:
    - metrics: string[] // ['population', 'avgHealth', 'networkDensity']
    - startTime: number
    - endTime: number
    - interval: number // aggregation window
  Returns: TimeSeriesData

// Summary statistics
GET /api/metrics/summary
  Returns: SimulationSummary

// Export data
POST /api/metrics/export
  Body: { format: 'csv' | 'json', includeRaw: boolean }
  Returns: Download link or file stream

// Complex queries
POST /api/metrics/query
  Body: ComplexQuery (SQL-like queries on metrics)
  Returns: QueryResult
```

### 5.2 WebSocket API

**Connection**: `ws://localhost:3001/metrics/live`

**Messages** (Server → Client):
```typescript
type MetricsMessage =
  | { type: 'snapshot'; data: TimeSeriesAggregate }
  | { type: 'interaction'; data: InteractionEvent }
  | { type: 'behavior'; data: BehaviorEvent }
  | { type: 'network'; data: NetworkMetrics }
  | { type: 'alert'; data: MetricAlert };

interface MetricAlert {
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
}
```

**Messages** (Client → Server):
```typescript
type ControlMessage =
  | { type: 'subscribe'; metrics: string[] }
  | { type: 'unsubscribe'; metrics: string[] }
  | { type: 'setSamplingRate'; rate: number }
  | { type: 'pause' }
  | { type: 'resume' };
```

---

## 6. Performance Considerations

### 6.1 Optimization Strategies

**Event Sampling**:
- High-frequency events (position updates): Sample at 10% (configurable)
- Medium-frequency events (interactions): Sample at 50%
- Low-frequency events (behavior changes): Record 100%

**Lazy Aggregation**:
- Don't compute expensive metrics (centrality, clustering) every tick
- Batch compute every N ticks or on-demand via API

**Incremental Updates**:
```typescript
// Instead of recomputing entire network graph each time:
class IncrementalNetworkMetrics {
  private edgeCount: number = 0;
  private nodeCount: number = 0;

  addInteraction(agent1: string, agent2: string): void {
    // Update metrics incrementally
    this.edgeCount++;
    this.cachedDensity = this.edgeCount / (this.nodeCount * (this.nodeCount - 1) / 2);
  }
}
```

**Database Indexing**:
- Index on `simulation_time` for temporal queries
- Index on `agent_id` for agent-specific queries
- Composite indexes for common query patterns

**Memory Management**:
```typescript
interface MemoryBudget {
  maxBufferSize: number; // max events in memory
  maxCacheSize: number; // max cached aggregates
  flushThreshold: number; // flush when buffer exceeds this
}
```

### 6.2 Performance Targets

- **Data collection overhead**: <1ms per game tick
- **API response time**: <100ms for aggregated queries
- **WebSocket latency**: <50ms for live updates
- **Memory footprint**: <100MB for 1 hour of simulation
- **Database size**: ~10MB per hour of simulation

---

## 7. Visualization Dashboard

### 7.1 Dashboard Components

**Location**: `packages/metrics-dashboard/`

**Views**:

1. **Network View**
   - Force-directed graph of agent interactions
   - Color by behavior, size by centrality
   - Time slider to see evolution
   - Highlight communities

2. **Behavior Timeline**
   - Stacked area chart of behavior frequencies
   - Per-agent behavior sequences
   - Innovation/adoption events marked

3. **Spatial Heatmap**
   - Density heatmap overlay on game world
   - Movement trails
   - Territory boundaries

4. **Inequality Dashboard**
   - Lorenz curve for resource distribution
   - Time series of Gini coefficient
   - Quartile health/energy trends

5. **Cultural Diffusion**
   - Sankey diagram of behavior spread
   - Diffusion cascade visualization
   - Adoption curves

6. **Time Series Explorer**
   - Multi-metric line charts
   - Correlation matrix
   - Anomaly detection highlights

### 7.2 Technology Stack

- **Framework**: React + TypeScript
- **Charting**: D3.js for custom visualizations, Recharts for standard charts
- **Network Viz**: Cytoscape.js or Sigma.js
- **State Management**: Zustand or Redux Toolkit
- **Real-time Updates**: WebSocket client

---

## 8. Configuration Files

### 8.1 Metrics Configuration

**Location**: `custom_game_engine/config/metrics.config.ts`

```typescript
export const metricsConfig: MetricsConfig = {
  enabled: true,

  // Sampling rates
  sampling: {
    spatial: 0.1, // 10% of position updates
    interactions: 0.5, // 50% of interactions
    behaviors: 1.0, // 100% of behavior changes
  },

  // Collection intervals
  intervals: {
    snapshot: 1000, // ms, take full snapshot every second
    networkMetrics: 5000, // compute network metrics every 5s
    spatialMetrics: 2000,
    flush: 10000, // flush to DB every 10s
  },

  // Buffer sizes
  buffers: {
    events: 10000, // max events before forced flush
    timeSeries: 1000, // keep last 1000 aggregate snapshots
  },

  // Storage
  storage: {
    enabled: true,
    dbPath: './data/metrics.db',
    autoExport: false,
    exportInterval: 3600000, // 1 hour
    exportFormat: 'json',
  },

  // API
  api: {
    enabled: true,
    port: 3001,
    cors: true,
    rateLimit: 100, // requests per minute
  },

  // WebSocket
  websocket: {
    enabled: true,
    maxClients: 10,
    updateInterval: 100, // ms between broadcasts
  },
};
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// Test network metrics computation
describe('NetworkAnalyzer', () => {
  it('should compute correct density for complete graph', () => {
    const interactions = createCompleteGraphInteractions(5);
    const metrics = analyzer.computeMetrics(interactions);
    expect(metrics.density).toBe(1.0);
  });

  it('should detect communities correctly', () => {
    const interactions = createTwoClusterInteractions();
    const metrics = analyzer.computeMetrics(interactions);
    expect(metrics.communities).toHaveLength(2);
  });
});

// Test cultural diffusion tracking
describe('CulturalDiffusionAnalyzer', () => {
  it('should identify innovation events', () => {
    const behaviors = createBehaviorSequence();
    const cascades = analyzer.traceDiffusion(behaviors, []);
    expect(cascades[0].innovator).toBe('agent1');
  });
});
```

### 9.2 Integration Tests

```typescript
// Test full metrics pipeline
describe('Metrics Pipeline', () => {
  it('should collect, aggregate, and query metrics', async () => {
    const system = new MetricsCollectionSystem(config);

    // Generate simulation events
    for (let i = 0; i < 1000; i++) {
      system.recordInteraction(generateRandomInteraction());
    }

    // Flush to storage
    await system.flush();

    // Query via API
    const response = await fetch('/api/metrics/network');
    const metrics = await response.json();

    expect(metrics.density).toBeGreaterThan(0);
  });
});
```

### 9.3 Performance Tests

```typescript
describe('Performance', () => {
  it('should handle 10k events with <100ms overhead', () => {
    const system = new MetricsCollectionSystem(config);
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      system.recordInteraction(generateRandomInteraction());
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 10. Implementation Plan

### Phase 22: Foundation (Week 1)
- [x] Create MetricsCollectionSystem
- [x] Define event schemas
- [x] Implement ring buffer and basic storage
- [x] Add event emitters to existing systems (AISystem, World)

### Phase 23: Storage & API (Week 2)
- [ ] Set up SQLite database with schema
- [ ] Implement periodic flush mechanism
- [ ] Build REST API endpoints
- [ ] Add WebSocket server for live updates

### Phase 24: Analysis (Week 3)
- [ ] Implement NetworkAnalyzer
- [ ] Implement SpatialAnalyzer
- [ ] Implement InequalityAnalyzer
- [ ] Add export functionality (CSV, JSON)

### Phase 25: Visualization (Week 4)
- [ ] Build React dashboard app
- [ ] Implement network visualization
- [ ] Implement behavior timeline
- [ ] Implement spatial heatmap

### Phase 26: Advanced Features (Week 5+)
- [ ] CulturalDiffusionAnalyzer
- [ ] Anomaly detection and alerts
- [ ] Custom query language
- [ ] Historical playback mode

---

## Key Sociological Metrics Tracked

### Network Metrics
- **Degree centrality**: Number of interaction partners
- **Betweenness**: Bridge agents between communities
- **Network density**: Connectedness of population
- **Clustering coefficient**: Social cohesion
- **Community structure**: Emergent social groups

### Behavioral Metrics
- **Activity budgets**: Time allocation patterns
- **Behavioral diversity**: Range of behaviors exhibited
- **Innovation rate**: New behaviors per time unit
- **Adoption cascades**: How behaviors spread

### Spatial Metrics
- **Territory formation**: Spatial clustering
- **Home range size**: Area per agent
- **Segregation index**: Spatial separation by type
- **Resource hotspots**: High-traffic locations

### Inequality Metrics
- **Gini coefficient**: Resource inequality
- **Wealth mobility**: Ranking changes over time
- **Social stratification**: Correlation of status with outcomes
- **Access disparity**: Distance to resources by position

### Cultural Metrics
- **Cultural similarity**: Behavioral overlap between agents
- **Diffusion velocity**: Speed of behavior spread
- **Innovation-adoption lag**: Time to widespread use
- **Cultural convergence**: Homogenization over time

---

## Dependencies

**Core**:
- TypeScript 5.x
- Node.js 18+
- SQLite3 (better-sqlite3)

**API**:
- Express 4.x
- ws (WebSocket library)

**Visualization**:
- React 18+
- D3.js 7+
- Cytoscape.js 3+
- Recharts 2+
- Zustand 4+

**Testing**:
- Jest
- Playwright (for integration tests)

---

## Performance Budget

| Metric | Target | Max |
|--------|--------|-----|
| Collection overhead | <0.5ms | 1ms |
| Memory usage | <50MB | 100MB |
| API response | <50ms | 100ms |
| WebSocket latency | <30ms | 50ms |
| DB size per hour | ~5MB | 10MB |

---

## Future Enhancements

- Machine learning for pattern detection
- Real-time anomaly alerts
- Comparative analysis across simulations
- Export to standard social network analysis tools (Gephi, NetworkX)
- Integration with R/Python for statistical analysis
- Predictive modeling of social dynamics
