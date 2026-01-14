# Metrics Package

> **Purpose:** Real-time gameplay metrics collection, streaming, storage, and analysis for emergent sociological patterns, agent behavior, and system performance.

## Overview

The Metrics package provides a comprehensive telemetry and analytics system for the game engine. It tracks everything from individual agent lifecycle events to macro-level sociological patterns, economic trends, and system performance. The package supports real-time streaming to dashboards, persistent storage with tiered retention, and sophisticated analysis of emergent phenomena.

**Key Features:**
- **Event Streaming**: Real-time metrics broadcast to port 8766 metrics server
- **Low Overhead**: Runs at priority 999 (last), minimal performance impact
- **Agent Snapshots**: Detailed per-agent lifecycle tracking (birth to death)
- **Performance Tracking**: FPS, tick duration, memory usage, system timing
- **Economic Metrics**: Resource flows, wealth distribution, Gini coefficient
- **Social Network Analysis**: Relationship graphs, centrality, clustering
- **Spatial Analytics**: Heatmaps, territory analysis, movement trails
- **Tiered Storage**: Hot (in-memory, 1 hour) → Warm (session) → Cold (compressed archives)

**Integration Points:**
- **MetricsCollectionSystem**: ECS system that subscribes to game events (priority 999)
- **Admin Dashboard**: http://localhost:8766/admin (queries and visualizations)
- **Live Streaming**: WebSocket/SSE for real-time updates
- **Export API**: JSON/CSV data export for external analysis

## Package Structure

```
packages/metrics/src/
├── index.ts                      # Main exports
├── types.ts                      # Core type definitions
├── MetricsCollector.ts           # Core aggregation engine
├── MetricsStorage.ts             # Tiered persistence (hot/warm/cold)
├── MetricsStreamClient.ts        # Client for streaming to server
├── LiveEntityAPI.ts              # Live entity queries and summaries
├── CanonEventRecorder.ts         # Canon event tracking (genealogy, major events)
├── RingBuffer.ts                 # Bounded circular buffer
├── MetricsAnalysis.ts            # Pattern detection, anomalies, insights
├── MetricsDashboard.ts           # Dashboard data aggregation
│
├── api/
│   ├── MetricsAPI.ts             # REST-like query API
│   └── MetricsLiveStream.ts      # Pub/sub live streaming
│
├── events/
│   ├── MetricEvent.ts            # Base event types
│   ├── InteractionEvent.ts       # Agent-agent interactions
│   ├── BehaviorEvent.ts          # Behavior changes
│   ├── SpatialSnapshot.ts        # Position snapshots
│   └── ResourceEvent.ts          # Resource flow events
│
└── analyzers/
    ├── NetworkAnalyzer.ts        # Social network graphs
    ├── SpatialAnalyzer.ts        # Territory, heatmaps, segregation
    ├── InequalityAnalyzer.ts     # Wealth inequality, Gini, mobility
    └── CulturalDiffusionAnalyzer.ts  # Behavior spread, adoption curves
```

## Core Concepts

### 1. Event Streaming

The metrics system operates on an event-driven architecture. Game systems emit events via the `EventBus`, and `MetricsCollectionSystem` routes them to `MetricsCollector` for aggregation.

**Event Flow:**
```
Game System → EventBus → MetricsCollectionSystem → MetricsCollector → Storage
                                  ↓
                          MetricsStreamClient → Metrics Server (8766)
```

**Event Categories:**
- **Lifecycle**: `agent:birth`, `agent:death`, `agent:starved`
- **Resources**: `resource:gathered`, `resource:consumed`, `harvest:completed`
- **Social**: `conversation:started`, `conversation:utterance`, `relationship:formed`
- **Spatial**: `tile:visited`, `navigation:arrived`, `exploration:milestone`
- **Behavior**: `behavior:change`, `activity:started`, `activity:ended`
- **LLM**: `llm:request`, `llm:decision`, `llm:error`, `agent:llm_context`
- **Performance**: `system:tick`, `performance:sampled`
- **Session**: `session:started`, `session:ended`, `player:intervention`

### 2. Metrics Server (Port 8766)

The metrics server runs on http://localhost:8766 and provides:
- **Admin Dashboard**: `/admin` - UI for queries, agents, sprites, LLM queue
- **Query Endpoints**: `/dashboard?session=latest` - JSON data for external tools
- **Live Streaming**: WebSocket/SSE endpoints for real-time updates

**Auto-started** with `./start.sh` (gamehost or server mode).

### 3. Agent Snapshots

Each agent gets a full lifecycle record:

```typescript
interface AgentLifecycleMetrics {
  // Birth
  birthTimestamp: number;
  birthGeneration: number;
  parents: [string, string] | null;
  initialStats: { health, hunger, thirst, energy };

  // Life
  lifespan?: number;
  realTimeAlive?: number;

  // Death
  deathTimestamp?: number;
  causeOfDeath?: 'hunger' | 'thirst' | 'old_age' | 'attacked' | ...;
  ageAtDeath?: number;
  finalStats?: { health, hunger, thirst, energy };

  // Legacy
  childrenCount: number;
  descendantsCount: number;
  skillsLearned: string[];
  buildingsCreated: number;
  resourcesGathered: Record<string, number>;
}
```

### 4. Performance Metrics

Tracks system health and bottlenecks:

```typescript
interface PerformanceMetrics {
  fps: TimeSeriesDataPoint[];
  avgFps: number;
  minFps: number;
  frameDrops: number;
  totalEntities: TimeSeriesDataPoint[];
  tickDuration: TimeSeriesDataPoint[];
  systemTiming: Record<string, number>;  // Per-system execution time
  memoryUsage: TimeSeriesDataPoint[];
  peakMemory: number;
  slowestSystem: string;
  pathfindingCacheHitRate: number;
}
```

### 5. Economic Metrics

Tracks resource flows and wealth distribution:

```typescript
interface EconomicMetrics {
  resourcesGathered: Record<string, {
    totalGathered: number;
    gatherRate: number;
    gathererCount: number;
    avgGatherTime: number;
  }>;
  resourcesConsumed: Record<string, {
    totalConsumed: number;
    consumptionRate: number;
    purposeBreakdown: Record<string, number>;
  }>;
  stockpiles: Record<string, TimeSeriesDataPoint[]>;
  wealthDistribution: {
    giniCoefficient: number;  // 0 = perfect equality, 1 = max inequality
    top10Percent: number;      // % of wealth held by top 10%
    bottom50Percent: number;   // % of wealth held by bottom 50%
  };
}
```

### 6. Social Network Metrics

Tracks relationships and community structure:

```typescript
interface SocialMetrics {
  relationshipsFormed: number;
  socialNetworkDensity: number;  // 0-1, edges / max possible edges
  averageClusterSize: number;
  isolatedAgents: number;
  conversationsPerDay: number;
  communityCohesion: number;
  factionsCount: number;
  conflictsPerDay: number;
  conflictResolutionRate: number;
}
```

### 7. Tiered Storage

**Three storage tiers** with automatic retention:

```typescript
// HOT STORAGE (in-memory, 1 hour)
hotStorage: StoredMetric[];  // Last 10,000 events
timestampIndex: Map<number, StoredMetric[]>;  // Fast time-range queries
agentIndex: Map<string, StoredMetric[]>;      // Fast agent queries
typeIndex: Map<string, StoredMetric[]>;       // Fast event-type queries

// WARM STORAGE (session, on-disk JSON)
sessions/session-123456.json

// COLD STORAGE (compressed archives, forever)
archive/2025-01-Q1.json.gz
```

Retention policies:
- Raw events: 1 hour (hot storage)
- Minute aggregates: 24 hours (warm storage)
- Hourly aggregates: 7 days (cold storage)
- Daily aggregates: Forever (cold storage)

## MetricsCollectionSystem

**ECS System Integration**

```typescript
// Location: packages/core/src/systems/MetricsCollectionSystem.ts
class MetricsCollectionSystem implements System {
  id: 'metrics_collection';
  priority: 999;  // Runs last to capture all tick events
  requiredComponents: [];
}
```

**Configuration:**

```typescript
interface MetricsCollectionConfig {
  enabled: boolean;
  samplingRate: number;      // 0-1, % of high-frequency events to record
  snapshotInterval: number;  // Ticks between population snapshots (default 100)
  streaming?: boolean;       // Enable streaming to metrics server
  streamConfig?: {
    serverUrl: string;       // Default: http://localhost:8766
    sessionId?: string;
    batchSize: number;
    flushInterval: number;
  };
  canonEvents?: {
    enabled: boolean;        // Track major canon events
    persistToDisk: boolean;
  };
}
```

**How it Works:**

1. **Event Listeners**: Subscribes to ~30 event types on `EventBus`
2. **Event Routing**: Converts events to `StoredMetric` format
3. **Aggregation**: Updates `MetricsCollector` state (counters, time-series, indexes)
4. **Streaming**: Batches events and sends to metrics server (if enabled)
5. **Snapshots**: Every 100 ticks, samples population metrics (needs, behavior, performance)

**Sampled Metrics** (every 100 ticks):
- Agent needs (hunger, thirst, energy, temperature, health)
- Performance (FPS, tick duration, entity count, memory)
- Population size, births, deaths
- Network density, behavior distribution

## API

### Emitting Metrics

**From Game Systems:**

```typescript
// Emit via EventBus - MetricsCollectionSystem auto-subscribes
world.eventBus.emit({
  type: 'resource:gathered',
  data: {
    agentId: 'agent-123',
    resourceType: 'wheat',
    amount: 5,
  }
});
```

**Direct to Collector** (rare, for custom metrics):

```typescript
import { metricsCollector } from '@ai-village/metrics';

metricsCollector.recordEvent({
  type: 'custom:event',
  timestamp: Date.now(),
  agentId: 'agent-123',
  customData: { foo: 'bar' },
});
```

### Querying Metrics

**MetricsAPI** (programmatic queries):

```typescript
import { MetricsAPI } from '@ai-village/metrics';

const api = new MetricsAPI(metricsCollector, metricsStorage);

// Get network metrics
const network = await api.getNetworkMetrics({
  startTime: Date.now() - 3600000,  // Last hour
  endTime: Date.now(),
  resolution: 'high',
});
// Result: { density, clustering, centralAgents, nodeCount, edgeCount }

// Get behavior events
const behaviors = await api.getBehaviorEvents({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  agentId: 'agent-123',  // Optional filter
  behavior: 'gathering',  // Optional filter
  limit: 100,
});

// Get spatial heatmap
const heatmap = await api.getSpatialHeatmap({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  resolution: 10,  // Grid cell size
  metric: 'density',  // or 'interactions', 'behaviors'
});

// Get time series
const timeSeries = await api.getTimeSeries({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  metrics: ['avgHealth', 'avgEnergy', 'population'],
  interval: 60000,  // 1 minute buckets
});

// Get simulation summary
const summary = await api.getSummary();
// Result: sessionId, duration, peakPopulation, totalBirths, totalDeaths, dominantBehaviors
```

**Direct Collector Access:**

```typescript
// Get all metrics
const allMetrics = metricsCollector.getAllMetrics();
// Returns: { agent_lifecycle, needs_metrics, economic_metrics, social_metrics, ... }

// Get specific metric
const lifecycle = metricsCollector.getMetric('agent_lifecycle');
const economic = metricsCollector.getMetric('economic_metrics');

// Get aggregated metric
const avgLifespan = metricsCollector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 3,
});

const mostCommonDeath = metricsCollector.getAggregatedMetric('death_causes', {
  aggregation: 'most_common',
});
```

## Usage Examples

### 1. Track Agent Lifecycle

```typescript
// Birth event automatically recorded by MetricsCollectionSystem
world.eventBus.emit({
  type: 'agent:birth',
  data: {
    agentId: 'agent-123',
    name: 'Alice',
    generation: 2,
    parents: ['agent-001', 'agent-002'],
    initialStats: { health: 100, hunger: 50, thirst: 50, energy: 100 },
  }
});

// Death event
world.eventBus.emit({
  type: 'agent:death',
  data: {
    agentId: 'agent-123',
    causeOfDeath: 'old_age',
    ageAtDeath: 15000,  // Game ticks
    finalStats: { health: 0, hunger: 10, thirst: 20, energy: 5 },
  }
});

// Query lifecycle
const lifecycle = metricsCollector.getMetric('agent_lifecycle');
const agentData = lifecycle['agent-123'];
console.log(`Lifespan: ${agentData.lifespan} ticks`);
console.log(`Children: ${agentData.childrenCount}`);
console.log(`Cause of death: ${agentData.causeOfDeath}`);
```

### 2. Monitor Resource Economy

```typescript
// Gather event
world.eventBus.emit({
  type: 'resource:gathered',
  data: {
    agentId: 'agent-123',
    resourceType: 'wheat',
    amount: 5,
  }
});

// Consume event
world.eventBus.emit({
  type: 'resource:consumed',
  data: {
    agentId: 'agent-123',
    resourceType: 'wheat',
    amount: 2,
    purpose: 'food',
  }
});

// Query resource metrics
const economic = metricsCollector.getMetric('economic_metrics');
const wheatGathered = economic.resourcesGathered['wheat'].totalGathered;
const wheatConsumed = economic.resourcesConsumed['wheat'].totalConsumed;
const netWheat = metricsCollector.getAggregatedMetric('resource_balance', {
  aggregation: 'net',
  resourceType: 'wheat',
});
console.log(`Net wheat: ${netWheat} (gathered: ${wheatGathered}, consumed: ${wheatConsumed})`);
```

### 3. Analyze Social Networks

```typescript
// Conversation automatically creates relationship
world.eventBus.emit({
  type: 'conversation:started',
  data: {
    participants: ['agent-123', 'agent-456'],
    initiator: 'agent-123',
  }
});

// Query social metrics
const social = metricsCollector.getMetric('social_metrics');
console.log(`Network density: ${social.socialNetworkDensity}`);
console.log(`Isolated agents: ${social.isolatedAgents}`);
console.log(`Relationships formed: ${social.relationshipsFormed}`);

// Advanced network analysis
import { NetworkAnalyzer } from '@ai-village/metrics';
const analyzer = new NetworkAnalyzer();
const metrics = analyzer.analyzeNetwork(interactions);
console.log(`Central agents:`, metrics.centralityScores);
console.log(`Communities:`, metrics.communities);
```

### 4. Detect Performance Bottlenecks

```typescript
// Sample performance every tick (automatic in MetricsCollectionSystem)
metricsCollector.samplePerformance({
  fps: 60,
  tickDuration: 8.5,
  entityCount: 4260,
  memoryUsage: 150000000,
}, Date.now());

// Query performance
const perf = metricsCollector.getMetric('performance_metrics');
console.log(`Avg FPS: ${perf.avgFps}`);
console.log(`Frame drops: ${perf.frameDrops}`);
console.log(`Slowest system: ${perf.slowestSystem}`);
console.log(`Peak memory: ${perf.peakMemory / 1024 / 1024} MB`);
```

### 5. Live Streaming to Dashboard

```typescript
import { MetricsLiveStream } from '@ai-village/metrics';

const stream = new MetricsLiveStream(metricsCollector);

// Subscribe to events
stream.subscribe(['snapshot', 'agent', 'interaction'], (message) => {
  if (message.type === 'snapshot') {
    console.log(`Population: ${message.data.population}`);
    console.log(`Avg health: ${message.data.avgHealth}`);
  } else if (message.type === 'agent') {
    console.log(`Agent event: ${message.data.event}`);
  }
});

// Start streaming
stream.start(1000);  // Snapshot every 1 second

// Set alert thresholds
stream.setAlertThresholds([
  { metric: 'avgHealth', warningThreshold: 30, criticalThreshold: 15, comparison: 'below' },
  { metric: 'population', warningThreshold: 5, criticalThreshold: 1, comparison: 'below' },
]);
```

### 6. Export Data for Analysis

```typescript
// Export to JSON
const jsonData = metricsCollector.exportMetrics('json');
fs.writeFileSync('metrics-export.json', jsonData);

// Export to CSV
const csvData = metricsCollector.exportMetrics('csv');
fs.writeFileSync('metrics-export.csv', csvData);

// Via API
const api = new MetricsAPI(metricsCollector, metricsStorage);
const exportResult = await api.exportData({
  format: 'json',
  includeRaw: true,
  timeRange: {
    startTime: Date.now() - 3600000,
    endTime: Date.now(),
  }
});
```

## Integration

### Dashboard Queries

**Via curl (recommended for programmatic access):**

```bash
# Get latest session summary
curl http://localhost:8766/dashboard?session=latest

# Get agent list for session
curl http://localhost:8766/dashboard/agents?session=session-123456

# Get specific agent details
curl http://localhost:8766/dashboard/agent?id=agent-123
```

**Via Playwright MCP** (for screenshots, UI interaction):

```typescript
// Only use for visual inspection, prefer curl for data queries
await navigate('http://localhost:8766/admin');
await screenshot('admin-dashboard.png');
```

### Admin Panel Integration

The Admin Dashboard (`http://localhost:8766/admin`) uses metrics via **capabilities**:

```typescript
// Location: packages/core/src/admin/capabilities/
import { defineCapability, defineQuery, defineAction } from '../registry.js';

const metricsCapability = defineCapability({
  id: 'metrics',
  name: 'Metrics',

  queries: {
    getAgentMetrics: defineQuery({
      id: 'agent-metrics',
      execute: (context, params) => {
        const { agentId } = params;
        const lifecycle = metricsCollector.getMetric('agent_lifecycle');
        return lifecycle[agentId];
      }
    }),
  },

  actions: {
    exportMetrics: defineAction({
      id: 'export',
      execute: (context, params) => {
        return metricsCollector.exportMetrics(params.format);
      }
    }),
  }
});
```

## Configuration

### Optional Metrics

Metrics collection is **enabled by default** but can be configured:

```typescript
// In game setup
const metricsSystem = new MetricsCollectionSystem(world, {
  enabled: true,              // Enable/disable entire system
  samplingRate: 0.5,          // Sample 50% of high-frequency events
  snapshotInterval: 200,      // Snapshot every 200 ticks instead of 100
  streaming: true,            // Enable streaming to server
  streamConfig: {
    serverUrl: 'http://localhost:8766',
    batchSize: 100,
    flushInterval: 1000,
  },
  canonEvents: {
    enabled: true,
    persistToDisk: true,
  }
});

world.gameLoop.systemRegistry.register(metricsSystem);
```

### What's Tracked

**Automatically tracked** (no configuration needed):
- Agent births, deaths, lifecycle
- Resource gathering, consumption, production
- Social interactions, conversations, relationships
- Spatial movement, tile visits, territory
- Behavior changes, activities, tasks
- LLM calls, tokens, costs, latency
- Performance (FPS, tick duration, memory, system timing)
- Session metadata (start, end, duration, player interventions)

**Opt-in tracking** (enable via config):
- Canon events (major story milestones, genealogy)
- Live streaming (real-time dashboard updates)
- High-frequency spatial snapshots (every agent movement)

**NOT tracked** (respects privacy):
- No individual LLM prompts/responses (only metadata: tokens, latency, model)
- No sensitive player data
- No external network calls (except to localhost:8766 if streaming enabled)

## Performance

### Low Overhead Design

**Minimal Performance Impact:**
- Priority 999: Runs last, after all game systems
- Bounded memory: Ring buffers (10,000 entries), heatmap pruning (100,000 cells)
- Indexed queries: O(1) lookups by agent, type, timestamp
- Event batching: Streams send 100 events per batch
- Lazy aggregation: Only compute metrics when queried

**Benchmarks** (at 20 TPS with 100 agents):
- Event recording: <0.1ms per event
- Snapshot sampling: ~2ms per 100 agents
- Hot storage queries: <1ms for 10,000 events
- Memory usage: ~50MB for 1 hour of data
- Streaming overhead: <5% of tick budget

**Memory Management:**
- Hot storage: Auto-prunes after 10,000 events
- Heatmap: Resets after 100,000 cells
- Time-series: Bounded to 10,000 samples per metric
- Dead agent cleanup: Removes from tracking maps on death

**Optimization Tips:**
1. Reduce `samplingRate` for high-frequency events (0.1 = 10% sampling)
2. Increase `snapshotInterval` for less frequent population snapshots
3. Disable streaming if not using dashboard
4. Use aggregated queries instead of raw event iteration
5. Prune hot storage regularly (`metricsStorage.pruneHotStorage()`)

## Troubleshooting

### Metrics Not Appearing

**Check if system is enabled:**
```typescript
const metricsSystem = world.gameLoop.systemRegistry.getSystem('metrics_collection');
console.log('Metrics enabled:', metricsSystem !== null);
```

**Check event emission:**
```typescript
// Add logging to event handlers
world.eventBus.subscribe('agent:birth', (event) => {
  console.log('Birth event:', event);
});
```

**Check hot storage:**
```typescript
const hotStorage = metricsStorage.getHotStorage();
console.log(`Hot storage size: ${hotStorage.length}`);
console.log('Recent events:', hotStorage.slice(-10));
```

### High Memory Usage

**Problem:** Hot storage growing unbounded.

**Solution:**
```typescript
// Manual pruning
metricsStorage.pruneHotStorage();

// Reduce sampling rate
metricsSystem.config.samplingRate = 0.1;  // 10% sampling

// Archive to cold storage
await metricsStorage.archiveMetrics(
  hotStorage.slice(0, 5000),
  `archive-${Date.now()}`
);
```

### Slow Queries

**Problem:** Time-range queries taking >100ms.

**Solution:**
```typescript
// Use indexed queries instead of filtering all events
const byAgent = metricsStorage.agentIndex.get('agent-123');
const byType = metricsStorage.typeIndex.get('resource:gathered');

// Use aggregated metrics instead of raw events
const avgLifespan = metricsCollector.getAggregatedMetric('lifespan_by_generation', {
  aggregation: 'avg',
  generation: 3,
});
```

### Streaming Connection Failed

**Problem:** Can't connect to metrics server.

**Check server is running:**
```bash
curl http://localhost:8766/health
# Should return: { "status": "ok" }
```

**Check port conflicts:**
```bash
lsof -i :8766
# Should show metrics server process
```

**Restart metrics server:**
```bash
cd custom_game_engine && ./start.sh kill && ./start.sh server
```

### Missing Event Types

**Problem:** Custom events not being recorded.

**Solution:**
```typescript
// Add to VALID_EVENT_TYPES in MetricsCollector.ts
const VALID_EVENT_TYPES = new Set([
  // ... existing types
  'custom:my_event',
]);

// Add handler in MetricsCollectionSystem.setupEventListeners()
eventBus.subscribe('custom:my_event', (event) => {
  this.recordEvent({
    type: 'custom:my_event',
    timestamp: Date.now(),
    data: event.data,
  });
});
```

### Analyzer Errors

**Problem:** NetworkAnalyzer throws "No interactions found".

**Solution:**
```typescript
// Check if relationship events are being emitted
const relationships = metricsStorage.queryHotStorage({
  type: 'relationship:formed',
});
console.log(`Relationship events: ${relationships.length}`);

// Ensure conversations emit relationship events
world.eventBus.emit({
  type: 'relationship:formed',
  data: { agent1: 'agent-123', agent2: 'agent-456' }
});
```

---

## Architecture

### Data Flow

```
1. Game Systems emit events → EventBus
2. MetricsCollectionSystem subscribes to events
3. Events converted to StoredMetric format
4. MetricsCollector aggregates into typed metrics
5. MetricsStorage maintains hot/warm/cold tiers
6. MetricsStreamClient batches and sends to server
7. MetricsAPI provides query interface
8. MetricsLiveStream broadcasts to subscribers
```

### Component Responsibilities

**MetricsCollector:**
- Event aggregation and in-memory storage
- Bounded ring buffers for time-series
- Indexed data structures for fast queries
- Metric computation (averages, Gini, etc.)

**MetricsStorage:**
- Tiered persistence (hot/warm/cold)
- Index management (timestamp, agent, type)
- Session save/load
- Archive compression

**MetricsStreamClient:**
- Batched event streaming to server
- Connection management and reconnection
- Queue management during disconnects

**MetricsCollectionSystem:**
- EventBus integration
- Periodic sampling (every 100 ticks)
- Event filtering and sampling rate

**MetricsAPI:**
- REST-like query interface
- Time-range filtering
- Aggregation and summarization
- Export to JSON/CSV

**MetricsLiveStream:**
- Pub/sub for real-time updates
- Alert threshold monitoring
- Subscriber management
- Periodic snapshots

### Analyzers

**NetworkAnalyzer:**
- Social network graph construction
- Centrality metrics (degree, betweenness, closeness)
- Community detection (modularity)
- Network evolution tracking

**SpatialAnalyzer:**
- Heatmap generation
- Hotspot detection
- Territory analysis
- Movement trail tracking
- Segregation metrics

**InequalityAnalyzer:**
- Lorenz curve calculation
- Gini coefficient
- Wealth mobility matrices
- Social stratification
- Concentration metrics (HHI, CR4)

**CulturalDiffusionAnalyzer:**
- Innovation adoption curves
- Diffusion cascade detection
- Influencer identification
- Transmission event tracking

## Related Documentation

- **[SYSTEMS_CATALOG.md](../../SYSTEMS_CATALOG.md)** - MetricsCollectionSystem details (priority 999)
- **[ARCHITECTURE_OVERVIEW.md](../../ARCHITECTURE_OVERVIEW.md)** - ECS architecture, event bus
- **[DEBUG_API.md](../../DEBUG_API.md)** - `window.game` API for querying metrics in browser
- **[METASYSTEMS_GUIDE.md](../../METASYSTEMS_GUIDE.md)** - Integration with other metasystems

## Examples in Codebase

- **`packages/core/src/systems/MetricsCollectionSystem.ts`** - Full system implementation
- **`packages/metrics/src/__tests__/`** - Unit tests and usage examples
- **`packages/metrics-dashboard/src/`** - Dashboard implementation
- **`packages/core/src/admin/capabilities/llm.ts`** - Admin panel integration example
