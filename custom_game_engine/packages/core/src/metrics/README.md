# Metrics Subcomponent

Comprehensive metrics collection and telemetry system for gameplay analytics, performance tracking, and emergent behavior detection.

## Overview

The metrics system captures real-time and historical data across nine domains: agent lifecycle, survival needs, economics, social networks, spatial behavior, activities, AI decision-making, performance, and emergent phenomena. Integrates with Admin Dashboard (http://localhost:8766/admin) for live visualization.

## Core Components

**MetricsCollector** - Event-based collection service. Subscribe to 30+ event types (`agent:birth`, `resource:gathered`, `llm:call`, etc.). Maintains time-series data with automatic pruning (10k samples max).

**MetricsStorage** - Tiered retention: hot (in-memory, 1hr), warm (on-disk session), cold (compressed archives). Browser-compatible (in-memory only). Supports time-range queries, aggregation, and export (JSON/CSV).

**MetricsAnalysis** - Anomaly detection, trend analysis, pattern recognition, performance bottleneck identification. Provides actionable insights and optimization suggestions.

**MetricsDashboard** - Real-time visualization with charts (line, bar, heatmap, graph), alerts (warning/critical/info), and custom widgets.

**CanonEventRecorder** - Captures full universe snapshots at critical moments (births, deaths, cultural milestones). Enables time travel, universe forking, and multiverse comparisons.

## Metric Categories

**Agent Lifecycle**: Birth, death, lifespan, cause of death, descendants, legacy tracking
**Needs**: Hunger, thirst, energy, temperature (time-series + crisis events)
**Economic**: Resource gathering/production/consumption rates, stockpiles, wealth distribution (Gini coefficient)
**Social**: Relationships, network density, conversations, conflicts, community cohesion
**Spatial**: Movement trails, heatmaps, pathfinding failures, territory analysis
**Behavioral**: Activity breakdown, task completion rates, efficiency scores, decision latency
**Intelligence**: LLM calls/tokens by model, cost tracking, plan success rates, creativity scores
**Performance**: FPS, tick duration, memory usage, system timing, entity counts
**Emergent**: Pattern detection, anomalies, milestones

## Specialized Analyzers

**NetworkAnalyzer** - Social graph analysis: centrality scores, community detection, network evolution
**SpatialAnalyzer** - Territory mapping, hotspot detection, segregation metrics, movement trails
**InequalityAnalyzer** - Lorenz curves, wealth mobility matrices, stratification analysis
**CulturalDiffusionAnalyzer** - Innovation adoption curves, influence metrics, transmission cascades

## Dashboard Integration

Metrics auto-stream to Admin Dashboard. Access via:
- **UI**: http://localhost:8766/admin → Metrics tab
- **API**: `curl http://localhost:8766/admin/queries/metrics?format=json`
- **Live Stream**: WebSocket at `ws://localhost:8766/metrics/stream`

Configure alerts via `MetricsDashboard.addAlert(metric, threshold, type)`.

## API Access

```typescript
import { MetricsCollector, MetricsStorage, MetricsAPI } from '@ai-village/core';

// Collection
const collector = new MetricsCollector('session-id');
collector.recordEvent('agent:birth', { agentId: 'abc', generation: 1 });
const lifecycle = collector.getAgentLifecycleMetrics();

// Storage & queries
const storage = new MetricsStorage();
storage.store(metrics);
const results = storage.query({ startTime: t1, endTime: t2, type: 'agent:death' });

// REST-like API
const api = new MetricsAPI(collector, storage);
const network = await api.getNetworkMetrics({ startTime: t1, endTime: t2 });
const heatmap = await api.getHeatmap({ resolution: 16, metric: 'density' });
```

## Performance

Throttled collection (1-sample/tick for time-series), automatic pruning (heatmap: 100k entries, samples: 10k), tiered storage. Canon events include full snapshots but use compression for cold storage.

## Browser vs Node.js

**Browser**: In-memory storage only, limited retention
**Node.js**: Full tiered storage with filesystem persistence and compression
