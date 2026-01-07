# Metrics Dashboard - Real-Time Metrics Visualization

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the metrics dashboard to understand its architecture, interfaces, and usage patterns.

## Overview

The **Metrics Dashboard Package** (`@ai-village/metrics-dashboard`) provides a web-based visualization interface for real-time game metrics. It's a React-based frontend that connects to the metrics HTTP server (port 8766) to display network graphs, time series, spatial heatmaps, inequality analysis, and cultural diffusion patterns.

**What it does:**
- Web-based dashboard UI accessible at `http://localhost:8766/dashboard`
- Real-time WebSocket updates for live metrics streaming
- Multiple specialized views: Network, Timeline, Spatial, Inequality, Cultural Diffusion, Time Series
- HTTP REST API client for querying historical metrics
- Zustand-based state management for reactive UI updates
- D3.js and Cytoscape for advanced data visualizations

**Key files:**
- `src/App.tsx` - Main React application with routing
- `src/components/NetworkView.tsx` - Social network graph visualization
- `src/components/TimeSeriesView.tsx` - Time series charts (population, resources, etc.)
- `src/components/SpatialView.tsx` - Spatial heatmap of agent activity
- `src/components/InequalityView.tsx` - Wealth/resource inequality analysis
- `src/components/CulturalDiffusionView.tsx` - Cultural trait spread visualization
- `src/utils/apiClient.ts` - HTTP REST API client
- `src/utils/websocket.ts` - WebSocket client for live updates
- `src/store/metricsStore.ts` - Zustand state management

**Server location:**
- `custom_game_engine/scripts/metrics-server.ts` - HTTP/WebSocket server (runs on port 8766)

---

## Package Structure

```
packages/metrics-dashboard/
├── src/
│   ├── components/                      # React visualization components
│   │   ├── NetworkView.tsx              # Social network graph (Cytoscape)
│   │   ├── TimeSeriesView.tsx           # Time series charts (Recharts)
│   │   ├── SpatialView.tsx              # Spatial heatmap (D3)
│   │   ├── InequalityView.tsx           # Inequality metrics (Recharts)
│   │   ├── CulturalDiffusionView.tsx    # Cultural spread (D3 Sankey)
│   │   ├── TimelineView.tsx             # Event timeline
│   │   └── Layout.tsx                   # Navigation and layout
│   ├── utils/
│   │   ├── apiClient.ts                 # HTTP REST API client
│   │   ├── websocket.ts                 # WebSocket client
│   │   └── dataTransformers.ts          # Data format transformations
│   ├── store/
│   │   └── metricsStore.ts              # Zustand state management
│   ├── __tests__/                       # Vitest and Playwright tests
│   ├── App.tsx                          # Main React app with routing
│   └── main.tsx                         # Vite entry point
├── package.json
└── README.md                            # This file

scripts/
└── metrics-server.ts                    # HTTP/WebSocket server (Node.js)

packages/metrics/src/
├── api/
│   ├── MetricsAPI.ts                    # REST-like API interface
│   └── MetricsLiveStream.ts             # WebSocket streaming interface
├── MetricsCollector.ts                  # Metrics collection service
├── MetricsStorage.ts                    # Metrics persistence
└── MetricsDashboard.ts                  # Dashboard state and alerts
```

---

## Core Concepts

### 1. HTTP Server & REST API

The **metrics server** (`scripts/metrics-server.ts`) is a Node.js HTTP server that runs on port 8766. It provides:

- **Static file serving:** Dashboard UI at `/dashboard`
- **REST API endpoints:** `/api/metrics/*` for querying metrics
- **WebSocket streaming:** `/ws` for real-time updates
- **Live entity API:** `/api/live/*` for querying running game state
- **LLM queue API:** `/api/llm/*` for server-side LLM generation
- **Save/Load API:** `/api/saves`, `/api/load`, `/api/fork` for time manipulation

**Server start:**
```bash
cd custom_game_engine && ./start.sh
# Metrics server starts on port 8766
# Dashboard accessible at http://localhost:8766/dashboard
```

### 2. REST API Endpoints

The dashboard frontend uses these HTTP endpoints (defined in `MetricsAPI.ts`):

```typescript
GET /api/metrics/network      // Social network metrics (density, centrality)
GET /api/metrics/timeline     // Chronological event timeline
GET /api/metrics/spatial      // Spatial heatmap data
GET /api/metrics/inequality   // Wealth/resource inequality metrics
GET /api/metrics/cultural     // Cultural diffusion patterns
GET /api/metrics/timeseries   // Time series data (population, resources)
GET /api/agents/:agentId      // Detailed agent information
GET /api/health               // Server health check
```

**Example request:**
```typescript
import { apiClient } from '@ai-village/metrics-dashboard';

const networkData = await apiClient.getNetworkMetrics();
// Returns: { density, clustering, nodeCount, edgeCount, centralAgents }
```

### 3. WebSocket Live Streaming

Real-time metrics are streamed via WebSocket (defined in `MetricsLiveStream.ts`):

```typescript
// Message types
type LiveStreamMessage =
  | { type: 'snapshot'; data: SnapshotData }      // Periodic full state
  | { type: 'interaction'; data: InteractionData } // Agent interactions
  | { type: 'behavior'; data: BehaviorData }       // Behavior changes
  | { type: 'network'; data: NetworkData }         // Network updates
  | { type: 'resource'; data: ResourceData }       // Resource events
  | { type: 'agent'; data: AgentData }             // Agent birth/death
  | { type: 'alert'; data: MetricAlert };          // Threshold alerts
```

**Example subscription:**
```typescript
import { getWebSocket } from '@ai-village/metrics-dashboard';

const ws = getWebSocket((connected) => console.log('Connected:', connected));

const unsubscribe = ws.subscribe((data) => {
  if (data.type === 'snapshot') {
    console.log('Population:', data.data.population);
  }
});

ws.connect();
// Later: unsubscribe() and ws.disconnect()
```

### 4. Dashboard Views

The dashboard has 6 specialized views accessible via routing:

**Network View** (`/network`):
- Social network graph visualization using Cytoscape
- Shows agent relationships and centrality
- Interactive node selection and filtering

**Time Series View** (`/timeseries`):
- Line charts of metrics over time using Recharts
- Population, resources, health, energy
- Configurable time ranges

**Spatial View** (`/spatial`):
- Heatmap of agent density and activity using D3
- Grid-based visualization of world space
- Color-coded intensity

**Inequality View** (`/inequality`):
- Gini coefficient and Lorenz curves
- Resource distribution analysis
- Wealth concentration metrics

**Cultural Diffusion View** (`/cultural`):
- Sankey diagram of cultural trait spread using D3
- Flow visualization between agents/groups
- Cultural transmission patterns

**Timeline View** (`/timeline`):
- Chronological event listing
- Agent births, deaths, interactions, behaviors
- Filterable by event type

### 5. State Management (Zustand)

The dashboard uses Zustand for reactive state management:

```typescript
// packages/metrics-dashboard/src/store/metricsStore.ts
interface MetricsStore {
  // Connection state
  connected: boolean;
  setConnected: (connected: boolean) => void;

  // View data
  networkData: NetworkData | null;
  timelineData: TimelineData | null;
  spatialData: SpatialData | null;
  inequalityData: InequalityData | null;
  culturalData: CulturalData | null;
  timeSeriesData: TimeSeriesData | null;

  // Setters
  setNetworkData: (data: NetworkData) => void;
  // ... etc
}
```

**Usage in components:**
```typescript
import { useMetricsStore } from '../store/metricsStore';

function NetworkView() {
  const networkData = useMetricsStore((state) => state.networkData);
  const setNetworkData = useMetricsStore((state) => state.setNetworkData);

  // Data automatically triggers re-render when updated
}
```

---

## HTTP Server APIs

### Starting the Server

```bash
# Via orchestrator (recommended)
cd custom_game_engine && ./start.sh

# Manual start (for development)
npx tsx scripts/metrics-server.ts
```

**Server listens on:**
- **Port 8766** - Main HTTP/WebSocket server
- **WebSocket:** `ws://localhost:8766/ws`
- **Dashboard:** `http://localhost:8766/dashboard`

### REST API Interface (MetricsAPI)

Located in `packages/metrics/src/api/MetricsAPI.ts`:

```typescript
class MetricsAPI {
  // Get network metrics
  async getNetworkMetrics(params: NetworkQueryParams): Promise<APIResponse<NetworkMetricsResult>>;

  // Get behavior events
  async getBehaviorEvents(params: BehaviorQueryParams): Promise<APIResponse<BehaviorEventResult[]>>;

  // Get interaction events
  async getInteractionEvents(params: InteractionQueryParams): Promise<APIResponse<InteractionEventResult[]>>;

  // Get spatial heatmap
  async getSpatialHeatmap(params: HeatmapQueryParams): Promise<APIResponse<HeatmapResult>>;

  // Get time series data
  async getTimeSeries(params: TimeSeriesQueryParams): Promise<APIResponse<TimeSeriesResult>>;

  // Get simulation summary
  async getSummary(): Promise<APIResponse<SimulationSummary>>;

  // Export metrics data
  async exportData(options: ExportOptions): Promise<APIResponse<string>>;
}
```

**Query parameters:**
```typescript
interface NetworkQueryParams {
  startTime: number;   // Unix timestamp (ms)
  endTime: number;
  resolution?: 'high' | 'medium' | 'low';
}

interface TimeSeriesQueryParams {
  startTime: number;
  endTime: number;
  metrics: string[];   // ['population', 'avgHealth', 'avgEnergy']
  interval?: number;   // Sampling interval in ms (default: 60000 = 1 minute)
}
```

### WebSocket Streaming Interface (MetricsLiveStream)

Located in `packages/metrics/src/api/MetricsLiveStream.ts`:

```typescript
class MetricsLiveStream {
  // Start streaming with interval
  start(snapshotIntervalMs: number = 1000): void;

  // Subscribe to specific metric types
  subscribe(
    metrics: MetricType[],
    callback: SubscriptionCallback,
    samplingRate?: number
  ): string;

  // Unsubscribe
  unsubscribe(subscriberId: string): boolean;

  // Emit events (called by game systems)
  emitInteraction(data: InteractionData): void;
  emitBehavior(data: BehaviorData): void;
  emitResource(data: ResourceData): void;
  emitAgent(data: AgentData): void;
  emitNetwork(data: NetworkData): void;

  // Alert thresholds
  addAlertThreshold(threshold: AlertThreshold): void;
  removeAlertThreshold(metric: string): void;
}
```

**Alert configuration:**
```typescript
interface AlertThreshold {
  metric: string;              // 'avgHealth', 'population', etc.
  warningThreshold: number;    // Yellow alert level
  criticalThreshold: number;   // Red alert level
  comparison: 'above' | 'below';
}

// Example: Alert when health drops below 30
liveStream.addAlertThreshold({
  metric: 'avgHealth',
  warningThreshold: 30,
  criticalThreshold: 15,
  comparison: 'below'
});
```

---

## Usage Examples

### Example 1: Accessing the Dashboard

**Browser access:**
```bash
# Start server
cd custom_game_engine && ./start.sh

# Open browser to dashboard
open http://localhost:8766/dashboard
```

**Available routes:**
- `/dashboard` - Dashboard home
- `/dashboard/network` - Network view
- `/dashboard/timeseries` - Time series view
- `/dashboard/spatial` - Spatial heatmap
- `/dashboard/inequality` - Inequality analysis
- `/dashboard/cultural` - Cultural diffusion
- `/dashboard/timeline` - Event timeline

### Example 2: Querying Metrics via HTTP

```typescript
import { MetricsAPIClient } from '@ai-village/metrics-dashboard';

const client = new MetricsAPIClient('http://localhost:8766');

// Get current network metrics
const network = await client.getNetworkMetrics();
console.log(`Network density: ${network.density}`);
console.log(`Node count: ${network.nodeCount}`);
console.log(`Top 3 central agents:`, network.centralAgents.slice(0, 3));

// Get time series for last 5 minutes
const now = Date.now();
const timeSeries = await client.getTimeSeries({
  startTime: now - 5 * 60 * 1000,
  endTime: now,
  metrics: ['population', 'avgHealth', 'avgEnergy'],
  interval: 10000 // 10 second intervals
});

for (const point of timeSeries.points) {
  console.log(`${new Date(point.timestamp).toISOString()}:
    population=${point.values.population},
    health=${point.values.avgHealth}`);
}
```

### Example 3: Subscribing to Live Updates

```typescript
import { getWebSocket } from '@ai-village/metrics-dashboard';

const ws = getWebSocket((connected) => {
  console.log(`WebSocket ${connected ? 'connected' : 'disconnected'}`);
});

// Subscribe to snapshots and alerts
const unsubscribe = ws.subscribe((message) => {
  if (message.type === 'snapshot') {
    const data = message.data as SnapshotData;
    console.log(`Population: ${data.population}`);
    console.log(`Avg Health: ${data.avgHealth}`);
    console.log(`Network Density: ${data.networkDensity}`);
  }

  if (message.type === 'alert') {
    const alert = message.data as MetricAlert;
    console.log(`⚠️ ALERT: ${alert.severity} - ${alert.message}`);
  }
});

ws.connect();

// Later: cleanup
unsubscribe();
ws.disconnect();
```

### Example 4: Creating a Custom View

```typescript
import { useMetricsStore } from '@ai-village/metrics-dashboard';
import { useEffect } from 'react';
import { apiClient } from '@ai-village/metrics-dashboard';

function MyCustomView() {
  const networkData = useMetricsStore((state) => state.networkData);
  const setNetworkData = useMetricsStore((state) => state.setNetworkData);

  useEffect(() => {
    async function fetchData() {
      const data = await apiClient.getNetworkMetrics();
      setNetworkData(data);
    }
    fetchData();
  }, [setNetworkData]);

  if (!networkData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Network Metrics</h1>
      <p>Density: {networkData.density.toFixed(3)}</p>
      <p>Nodes: {networkData.nodeCount}</p>
      <p>Edges: {networkData.edgeCount}</p>
    </div>
  );
}
```

### Example 5: Querying Live Entity State

```bash
# Get all agents in the running game
curl http://localhost:8766/api/live/entities

# Get specific agent state
curl http://localhost:8766/api/live/entity?id=agent_123

# Get agent's current LLM prompt
curl http://localhost:8766/api/live/prompt/talker?id=agent_123

# Get universe configuration
curl http://localhost:8766/api/live/universe

# Get divinity info (gods, belief, pantheons)
curl http://localhost:8766/api/live/divinity
```

---

## Architecture & Data Flow

### Client-Server Architecture

```
Browser Client (React)
  ↓ HTTP REST API
Metrics Server (Node.js - port 8766)
  ↓ WebSocket
Metrics Collector (Game Process)
  ↓ Events
ECS World (Game Logic)
```

### Data Flow

```
1. Game World (ECS)
   ↓ Event emissions ('agent:born', 'resource:gathered', etc.)
2. MetricsCollector
   ↓ Aggregates and buffers metrics
3. MetricsStorage
   ↓ Persists to hot/cold storage
4. MetricsAPI / MetricsLiveStream
   ↓ HTTP/WebSocket endpoints
5. Dashboard Frontend
   ↓ React components + Zustand state
6. User Browser
   → Interactive visualization
```

### WebSocket Message Flow

```
Game Process
  ↓ MetricsCollector.recordEvent()
MetricsLiveStream
  ↓ emitSnapshot() / emitInteraction() / etc.
WebSocket Server (metrics-server.ts)
  ↓ ws.send(JSON.stringify(message))
Browser WebSocket Client (websocket.ts)
  ↓ Parses message
Zustand Store (metricsStore.ts)
  ↓ Updates state
React Components
  → Re-render with new data
```

### HTTP Request Flow

```
Browser
  ↓ fetch('http://localhost:8766/api/metrics/network')
Metrics Server (metrics-server.ts)
  ↓ Routes to MetricsAPI
MetricsAPI
  ↓ Queries MetricsCollector / MetricsStorage
Storage Layer
  ↓ Returns aggregated data
MetricsAPI
  ↓ Wraps in APIResponse<T>
Metrics Server
  ↓ JSON response
Browser
  → Displays in dashboard
```

---

## Performance Considerations

**Dashboard overhead:**
- WebSocket updates: ~1KB/second for snapshots (1 second interval)
- HTTP API queries: <100ms for most endpoints
- React rendering: Optimized with Zustand selective subscriptions
- D3 visualizations: Throttled to 30 FPS max

**Optimization strategies:**

1. **Selective WebSocket subscriptions:** Only subscribe to needed metric types
2. **Sampling rate control:** Set `samplingRate < 1.0` to reduce message frequency
3. **HTTP query caching:** Dashboard caches initial data, only fetches on user interaction
4. **Component lazy loading:** Views load only when navigated to
5. **Data transformation caching:** Expensive D3/Cytoscape transforms cached in Zustand

**Query optimization:**

```typescript
// ✅ GOOD: Selective subscription with sampling
ws.subscribe(['snapshot', 'alert'], callback, 0.5); // 50% sampling rate

// ❌ BAD: Subscribe to everything
ws.subscribe(['snapshot', 'interaction', 'behavior', 'network', 'resource', 'agent'], callback);
```

**Server performance:**

The metrics server (`scripts/metrics-server.ts`) is designed for minimal overhead:
- **Hot storage:** Recent 10,000 metrics in memory
- **Cold storage:** Older metrics written to disk (not yet implemented)
- **WebSocket broadcasting:** Throttled to prevent overwhelming clients
- **HTTP responses:** Gzipped for large datasets

---

## Troubleshooting

### Dashboard won't load

**Check:**
1. Server running? `curl http://localhost:8766/api/health`
2. Port 8766 available? `lsof -i :8766`
3. Firewall blocking? Try `http://127.0.0.1:8766/dashboard`
4. Check browser console for errors (F12)

**Debug:**
```bash
# Check server status
./start.sh status

# Kill and restart
./start.sh kill
./start.sh

# Check server logs
tail -f custom_game_engine/.metrics-server.log
```

### WebSocket won't connect

**Check:**
1. Server running? WebSocket endpoint is `ws://localhost:8766/ws`
2. CORS issues? WebSocket should auto-connect from dashboard
3. Browser console shows connection errors?

**Debug:**
```typescript
// Enable verbose logging in websocket.ts
const ws = getWebSocket((connected) => {
  console.log(`[WebSocket] Connected: ${connected}`);
});
```

**Fix:**
- Server must be started before dashboard loads
- If server restarts, refresh browser to reconnect
- Check for firewall blocking WebSocket connections

### No data showing in views

**Check:**
1. Game running? Dashboard shows data from active game
2. Metrics being collected? Check `MetricsCollector` is initialized
3. Storage enabled? Check `MetricsStorage` is configured
4. Time range correct? Views query last 5 minutes by default

**Debug:**
```bash
# Check if metrics are being collected
curl http://localhost:8766/api/metrics/summary

# Check live entity count
curl http://localhost:8766/api/live/entities | jq '.data | length'

# Check WebSocket is streaming
# Open browser console and look for WebSocket messages
```

### API endpoint returns 404

**Error:** `GET /api/metrics/network → 404 Not Found`

**Check:**
1. Correct URL? `http://localhost:8766/api/metrics/network` (not `/dashboard/api/...`)
2. Server version up-to-date? Endpoints may have changed
3. Typo in endpoint name?

**Fix:**
```typescript
// ✅ GOOD: Correct endpoint
await apiClient.getNetworkMetrics();

// ❌ BAD: Wrong endpoint
await fetch('http://localhost:8766/dashboard/metrics/network'); // Wrong path
```

### Dashboard performance is slow

**Symptoms:**
- Laggy UI when zooming/panning network graph
- Freezes during data updates
- High CPU usage in browser

**Fix:**
1. **Reduce sampling rate:**
   ```typescript
   ws.subscribe(['snapshot'], callback, 0.25); // 25% sampling
   ```

2. **Disable unneeded views:** Don't load all views at once, use routing

3. **Limit time range:**
   ```typescript
   await client.getTimeSeries({
     startTime: Date.now() - 60000, // Last 1 minute only
     endTime: Date.now(),
     metrics: ['population'], // Query fewer metrics
     interval: 10000
   });
   ```

4. **Clear browser cache:** Old cached data may cause issues

---

## Integration with Other Systems

### Metrics Collection (MetricsCollector)

The dashboard visualizes data collected by `MetricsCollector`:

```typescript
// In game systems
import { metricsCollector } from '@ai-village/metrics';

// Record events
metricsCollector.recordEvent('agent:born', {
  agentId: agent.id,
  timestamp: Date.now(),
  initialStats: { health: 100, energy: 100 }
});

// Dashboard automatically shows this data in views
```

### Live Entity API

The dashboard can query running game state via Live Entity API:

```typescript
// Get current agent state (bypasses metrics, queries World directly)
const response = await fetch('http://localhost:8766/api/live/entity?id=agent_123');
const agentState = await response.json();

// Response includes full entity components
console.log(agentState.components.position);
console.log(agentState.components.needs);
console.log(agentState.components.inventory);
```

### Save/Load API (Time Manipulation)

Dashboard can trigger save/load operations:

```bash
# List saves
curl "http://localhost:8766/api/saves?session=SESSION_ID"

# Load a save (rewind time)
curl -X POST "http://localhost:8766/api/load" \
  -H "Content-Type: application/json" \
  -d '{"session": "SESSION_ID", "save": "checkpoint_001"}'

# Fork a new universe from a save
curl -X POST "http://localhost:8766/api/fork" \
  -H "Content-Type: application/json" \
  -d '{"session": "SESSION_ID", "save": "checkpoint_001"}'
```

---

## Testing

Run dashboard tests:

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E with browser visible
npm run test:e2e:headed

# E2E interactive UI
npm run test:e2e:ui

# All tests
npm run test:all
```

**Key test files:**
- `src/__tests__/utils/apiClient.test.ts` - API client unit tests
- `src/__tests__/utils/dataTransformers.test.ts` - Data transformation tests
- `src/__tests__/integration/api.test.ts` - API integration tests
- `src/__tests__/integration/websocket.test.ts` - WebSocket tests
- `src/__tests__/components/*.test.tsx` - React component tests
- `src/__tests__/e2e/dashboard.spec.ts` - End-to-end tests

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Deep dive into metrics collection
- **PERFORMANCE.md** - Performance optimization guide
- **Metrics Server** - `custom_game_engine/scripts/metrics-server.ts` - Server implementation
- **MetricsAPI** - `packages/metrics/src/api/MetricsAPI.ts` - API interface
- **MetricsLiveStream** - `packages/metrics/src/api/MetricsLiveStream.ts` - WebSocket streaming

---

## Summary for Language Models

**Before working with the metrics dashboard:**
1. Understand the client-server architecture (React frontend, Node.js backend)
2. Know the HTTP REST API endpoints (`/api/metrics/*`)
3. Understand WebSocket streaming for real-time updates
4. Familiarize with Zustand state management
5. Know the specialized views (Network, Time Series, Spatial, etc.)

**Common tasks:**
- **Access dashboard:** Start server with `./start.sh`, open `http://localhost:8766/dashboard`
- **Query metrics:** Use `MetricsAPIClient` with HTTP endpoints
- **Subscribe to live updates:** Use WebSocket client with `getWebSocket()`
- **Create custom view:** Use Zustand store with `useMetricsStore()`
- **Debug connection issues:** Check server status, browser console, WebSocket connection

**Critical rules:**
- Dashboard is read-only (queries metrics, doesn't modify game state)
- Server must run on port 8766 (hardcoded in apiClient.ts)
- WebSocket auto-reconnects on disconnect
- HTTP API returns `APIResponse<T>` wrapper with `success`, `data`, `error` fields
- All timestamps are Unix milliseconds (not seconds)

**Event-driven architecture:**
- Game systems emit events → MetricsCollector buffers → MetricsStorage persists
- HTTP API queries storage → Returns aggregated data
- WebSocket streams live updates → React components re-render
- Never bypass MetricsAPI for queries (use standard endpoints)

**Performance:**
- WebSocket sampling rate controls message frequency (0.0-1.0)
- HTTP responses are gzipped for large datasets
- React components use selective Zustand subscriptions
- D3/Cytoscape visualizations are throttled to 30 FPS

**Development workflow:**
1. Start server: `./start.sh`
2. Access dashboard: `http://localhost:8766/dashboard`
3. Check server health: `curl http://localhost:8766/api/health`
4. Query metrics: Use `apiClient.getNetworkMetrics()` etc.
5. Test WebSocket: Open browser console, watch for messages
6. Debug: Check server logs, browser console, network tab

**Key endpoints:**
- `GET /api/health` - Server health check
- `GET /api/metrics/network` - Social network metrics
- `GET /api/metrics/timeseries` - Time series data
- `GET /api/metrics/spatial` - Spatial heatmap
- `GET /api/live/entities` - Live agent list
- `GET /api/live/entity?id=<id>` - Live agent state
- `WS /ws` - WebSocket streaming endpoint
