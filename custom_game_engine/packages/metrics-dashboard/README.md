# Metrics Dashboard Package

> **Purpose:** React-based web dashboard for real-time visualization and analysis of gameplay metrics from the Metrics Server (port 8766).

## Overview

The Metrics Dashboard is a standalone React application that provides interactive visualizations for the game's telemetry data. It connects to the Metrics Server (running on http://localhost:8766) to display social networks, behavior timelines, spatial heatmaps, economic inequality, cultural diffusion, and performance metrics in real-time.

**Key Features:**
- **Real-time Updates**: WebSocket connection (port 8765) for live data streaming
- **Six Visualization Panels**: Network graphs, timelines, spatial maps, inequality charts, cultural diffusion, time series
- **Interactive Controls**: Zoom, pan, filter, time scrubbing, export
- **Responsive Design**: Dark theme optimized for data visualization
- **Standalone Deployment**: Runs on port 5174, independent of game client

**Integration Points:**
- **Metrics Server**: Queries http://localhost:8766/api/metrics/* endpoints
- **WebSocket**: Connects to ws://localhost:8765 for real-time updates
- **Admin Dashboard**: Complements http://localhost:8766/admin (programmatic vs visual)

**Tech Stack:**
- React 18 + TypeScript
- Zustand (state management)
- Recharts (charts), D3 (Sankey diagrams), Cytoscape (network graphs)
- Vite (build tool, port 5174)
- Vitest + Playwright (testing)

## Package Structure

```
packages/metrics-dashboard/
├── src/
│   ├── App.tsx                      # Main router, data loading, WebSocket setup
│   ├── main.tsx                     # React entry point
│   ├── index.css                    # Global styles
│   │
│   ├── components/                  # Visualization panels
│   │   ├── Layout.tsx               # Navigation shell
│   │   ├── NetworkView.tsx          # Social network graph (Cytoscape)
│   │   ├── TimelineView.tsx         # Behavior timeline (Recharts area chart)
│   │   ├── SpatialView.tsx          # Heatmaps, trails, territories (Canvas)
│   │   ├── InequalityView.tsx       # Lorenz curves, Gini trends (Recharts)
│   │   ├── CulturalDiffusionView.tsx # Sankey diagrams, adoption curves (D3)
│   │   └── TimeSeriesView.tsx       # Multi-metric time series (Recharts)
│   │
│   ├── store/
│   │   └── metricsStore.ts          # Zustand state management
│   │
│   └── utils/
│       ├── apiClient.ts             # REST API client for metrics server
│       ├── websocket.ts             # WebSocket client for real-time updates
│       └── dataTransformers.ts      # Data validation utilities
│
├── index.html                       # HTML entry point
├── vite.config.ts                   # Vite configuration (port 5174)
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── README.md                        # This file
```

## Core Concepts

### 1. Dashboard Architecture

**Three-Layer Design:**

```
┌─────────────────────────────────────────────┐
│  React Components (Visualization Layer)    │
│  - NetworkView, TimelineView, etc.         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Zustand Store (State Management Layer)    │
│  - metricsStore: networkData, timelineData │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Data Sources (Integration Layer)          │
│  - MetricsAPIClient (HTTP REST)            │
│  - MetricsWebSocket (WebSocket real-time)  │
└─────────────────────────────────────────────┘
```

### 2. Data Flow

**Initial Load (HTTP):**
1. App.tsx mounts → triggers `loadInitialData()`
2. Parallel API calls to `/api/metrics/{network,timeline,spatial,...}`
3. Responses stored in Zustand → Components re-render

**Real-time Updates (WebSocket):**
1. App.tsx connects to `ws://localhost:8765`
2. Server sends `metrics_update` messages with delta data
3. Zustand store updates → Components re-render incrementally

**User Interactions:**
1. Component triggers state change (e.g., zoom, filter)
2. Local state updates (React hooks) → Component re-renders
3. Optional: trigger new API fetch if filter requires fresh data

### 3. State Management

**Zustand Store** (`metricsStore.ts`):

```typescript
interface MetricsState {
  // Data
  networkData: NetworkData | null;
  timelineData: TimelineData | null;
  spatialData: SpatialData | null;
  inequalityData: InequalityData | null;
  culturalData: CulturalData | null;
  timeSeriesData: TimeSeriesData | null;
  selectedAgent: AgentDetails | null;

  // Status
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNetworkData: (data: NetworkData | null) => void;
  setConnected: (connected: boolean) => void;
  // ... other setters
}
```

**Why Zustand?**
- Minimal boilerplate (no providers, no context)
- Type-safe selectors
- DevTools integration
- Performance (only re-renders components that use changed state)

### 4. API Integration

**MetricsAPIClient** (`apiClient.ts`):

```typescript
class MetricsAPIClient {
  baseURL = 'http://localhost:8766';

  async getNetworkMetrics(): Promise<NetworkData>;
  async getTimelineMetrics(): Promise<TimelineData>;
  async getSpatialMetrics(): Promise<SpatialData>;
  async getInequalityMetrics(): Promise<InequalityData>;
  async getCulturalMetrics(): Promise<CulturalData>;
  async getTimeSeriesMetrics(): Promise<TimeSeriesData>;
  async getAgentDetails(agentId: string): Promise<AgentDetails>;
}
```

**Error Handling:**
- Throws `APIError` with status code on HTTP failures
- Connection errors: "Failed to connect to metrics API"
- Empty responses: "API returned empty response"

**MetricsWebSocket** (`websocket.ts`):

```typescript
class MetricsWebSocket {
  connect(): void;                      // Establish connection
  disconnect(): void;                   // Close connection
  subscribe(handler): () => void;       // Add listener, returns unsubscribe
  isConnected(): boolean;               // Check connection state

  // Auto-reconnection: 3s delay, max 10 attempts
}
```

**Message Format:**
```typescript
{
  type: 'metrics_update',
  data: {
    network?: NetworkData,
    timeline?: TimelineData,
    spatial?: SpatialData,
    // ... partial updates
  }
}
```

## Panels

### 1. NetworkView - Social Network Graph

**Purpose:** Visualize agent relationships and community structure.

**Technology:** Cytoscape.js with cose-bilkent layout algorithm.

**Features:**
- **Node Size**: Proportional to centrality (influence in network)
- **Node Color**: Community/faction membership
- **Edge Width**: Relationship strength
- **Interactive**: Click nodes for agent details, zoom/pan
- **Filters**: Filter by community, minimum centrality

**Data Structure:**
```typescript
interface NetworkData {
  nodes: Array<{
    id: string;
    name: string;
    centrality: number;      // 0-1, PageRank-like metric
    community: number;       // Community ID
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;          // Interaction frequency
  }>;
  communities: Array<{
    id: number;
    size: number;
    density: number;         // Internal connection density
  }>;
}
```

**Usage:**
```typescript
<NetworkView
  data={networkData}
  filterCommunity={2}        // Show only community 2
  minCentrality={0.1}        // Hide low-influence agents
  onNodeClick={(id) => ...}
/>
```

### 2. TimelineView - Behavior Timeline

**Purpose:** Track behavior adoption over time with innovation events.

**Technology:** Recharts area chart with stacked behaviors.

**Features:**
- **Stacked Area Chart**: Multiple behaviors visualized simultaneously
- **Innovation Markers**: Yellow dots marking first adoption
- **Time Scrubber**: Drag to replay history
- **Export**: Download CSV of timeline data
- **Adoption Curves**: Show S-curve adoption patterns (optional)

**Data Structure:**
```typescript
interface TimelineData {
  behaviors: Array<{
    name: string;
    data: Array<{
      timestamp: number;
      count: number;           // Agents performing behavior
    }>;
  }>;
  innovations: Array<{
    timestamp: number;
    behavior: string;
    agent: string;             // First adopter
  }>;
  adoptionCurves: Record<string, Array<{
    timestamp: number;
    adopters: number;
  }>>;
}
```

**Usage:**
```typescript
<TimelineView
  data={timelineData}
  showAdoption={true}          // Show adoption curves panel
  onTimeChange={(ts) => ...}   // Time scrubber callback
/>
```

### 3. SpatialView - Spatial Distribution

**Purpose:** Visualize agent movement, density, and territory.

**Technology:** HTML5 Canvas with custom rendering.

**Features:**
- **Density Heatmap**: Orange gradient showing agent concentration
- **Movement Trails**: Agent paths over time
- **Territories**: Community boundary polygons
- **Hotspots**: High-activity areas with radius indicators
- **Layer Toggles**: Show/hide each layer independently
- **Zoom Controls**: In/out buttons

**Data Structure:**
```typescript
interface SpatialData {
  density: Array<{
    x: number;
    y: number;
    value: number;             // 0-1 density
  }>;
  trails: Array<{
    agentId: string;
    path: Array<{
      x: number;
      y: number;
      timestamp: number;
    }>;
  }>;
  territories: Array<{
    communityId: number;
    boundary: Array<{ x, y }>;
  }>;
  hotspots: Array<{
    x: number;
    y: number;
    activity: number;
    radius: number;
  }>;
}
```

**Usage:**
```typescript
<SpatialView
  data={spatialData}
  showTrails={true}
  showTerritories={true}
  showHotspots={false}
  onTrailClick={(agentId) => ...}
/>
```

### 4. InequalityView - Economic Inequality

**Purpose:** Analyze wealth distribution and social mobility.

**Technology:** Recharts line/bar charts with custom mobility matrix.

**Features:**
- **Lorenz Curve**: Visual representation of wealth inequality
- **Gini Trend**: Gini coefficient over time (0 = equality, 1 = max inequality)
- **Quartile Breakdown**: Wealth distribution by population segment
- **Mobility Matrix**: 4x4 heatmap showing class transitions
- **Comparison Mode**: Compare two time periods

**Data Structure:**
```typescript
interface InequalityData {
  lorenzCurve: Array<{
    population: number;        // 0-1, cumulative population %
    wealth: number;            // 0-1, cumulative wealth %
  }>;
  giniTrend: Array<{
    timestamp: number;
    gini: number;              // 0-1
  }>;
  quartiles: {
    top25: { wealth: number; count: number };
    upper50: { wealth: number; count: number };
    lower50: { wealth: number; count: number };
    bottom25: { wealth: number; count: number };
  };
  mobilityMatrix: number[][];  // 4x4 matrix (from Q1-Q4 to Q1-Q4)
}
```

**Usage:**
```typescript
<InequalityView
  data={inequalityData}
  comparisonEnabled={true}     // Show period comparison
  onExport={(format) => ...}
/>
```

### 5. CulturalDiffusionView - Behavior Spread

**Purpose:** Track how behaviors spread through social networks.

**Technology:** D3 Sankey diagrams + Recharts adoption curves.

**Features:**
- **Sankey Diagram**: Flow of behaviors between agents
- **Adoption Curves**: S-curve showing adoption rate over time
- **Cascade Trees**: Expandable tree showing transmission chains
- **Influencers List**: Top behavior spreaders
- **Transmission Rates**: Success rate of behavior transmission

**Data Structure:**
```typescript
interface CulturalData {
  sankeyData: {
    nodes: Array<{ id: string; name: string }>;
    links: Array<{
      source: string;
      target: string;
      value: number;
      behavior: string;
    }>;
  };
  cascadeTrees: Array<{
    behavior: string;
    root: string;
    children: Array<CascadeNode>;  // Recursive tree
  }>;
  adoptionCurves: Record<string, Array<{
    timestamp: number;
    adopters: number;
    rate: number;
  }>>;
  influencers: Array<{
    agentId: string;
    name: string;
    spreadCount: number;
    behaviors: string[];
  }>;
  transmissionRates: Record<string, number>;  // 0-1 success rate
}
```

**Usage:**
```typescript
<CulturalDiffusionView
  data={culturalData}
  showCascades={true}
  showAdoption={true}
  showTransmissionRates={true}
  filterBehavior="craft"       // Show only craft behavior
/>
```

### 6. TimeSeriesView - Multi-Metric Explorer

**Purpose:** Compare multiple metrics over time with correlation analysis.

**Technology:** Recharts line chart with multi-axis support.

**Features:**
- **Metric Selector**: Dropdown to add metrics to chart
- **Multi-Line Chart**: Up to 6 metrics simultaneously
- **Correlation Matrix**: Pearson correlation between selected metrics
- **Time Window**: Filter by hour/day/week
- **Export CSV**: Download data for external analysis
- **Zoom Controls**: Focus on specific time ranges

**Data Structure:**
```typescript
interface TimeSeriesData {
  metrics: Array<{
    name: string;
    data: Array<{
      timestamp: number;
      value: number;
    }>;
  }>;
  correlations: Array<[string, string, number]>;  // [metric1, metric2, correlation]
  availableMetrics: string[];  // All metric names
}
```

**Usage:**
```typescript
<TimeSeriesView
  data={timeSeriesData}
  selectedMetrics={['population', 'avgHealth', 'avgEnergy']}
  showCorrelation={true}
  timeWindow="day"
  onExport={(format, csv) => ...}
/>
```

## API

### Starting the Dashboard

**Development Mode:**
```bash
cd custom_game_engine/packages/metrics-dashboard
npm install
npm run dev
# Opens http://localhost:5174
```

**With Game Server:**
```bash
cd custom_game_engine && ./start.sh
# Automatically starts:
# - Metrics server (8766)
# - Game (3000)
# - Dashboard (5174)
```

### Using MetricsAPIClient

**Standalone Usage:**
```typescript
import { MetricsAPIClient } from './utils/apiClient';

const client = new MetricsAPIClient('http://localhost:8766');

// Fetch network data
const network = await client.getNetworkMetrics();
console.log(`${network.nodes.length} agents, ${network.edges.length} relationships`);

// Fetch agent details
const agent = await client.getAgentDetails('agent-123');
console.log(`${agent.name}: centrality=${agent.centrality}`);

// Error handling
try {
  const data = await client.getTimelineMetrics();
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API error ${error.statusCode}: ${error.message}`);
  }
}
```

**With Time Ranges:**
```typescript
// Timeline supports start/end filters
const timeline = await client.fetchTimelineData({
  start: Date.now() - 3600000,  // Last hour
  end: Date.now()
});

// Time series supports metric filtering
const timeseries = await client.fetchTimeSeriesData(['population', 'avgHealth']);
```

### Using MetricsWebSocket

**Subscribe to Real-time Updates:**
```typescript
import { getWebSocket } from './utils/websocket';

const ws = getWebSocket((connected) => {
  console.log(`WebSocket ${connected ? 'connected' : 'disconnected'}`);
});

// Subscribe to updates
const unsubscribe = ws.subscribe((message) => {
  if (message.type === 'metrics_update') {
    console.log('Network update:', message.data.network);
    console.log('Timeline update:', message.data.timeline);
  }
});

ws.connect();

// Cleanup
unsubscribe();
ws.disconnect();
```

**Auto-reconnection:**
- Reconnects after 3 seconds on disconnect
- Max 10 reconnection attempts
- Connection status exposed via `isConnected()`

### Using Zustand Store

**Read State:**
```typescript
import { useMetricsStore } from './store/metricsStore';

function MyComponent() {
  // Subscribe to specific state
  const networkData = useMetricsStore((state) => state.networkData);
  const isLoading = useMetricsStore((state) => state.isLoading);
  const error = useMetricsStore((state) => state.error);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!networkData) return <div>No data</div>;

  return <div>{networkData.nodes.length} agents</div>;
}
```

**Update State:**
```typescript
function DataLoader() {
  const setNetworkData = useMetricsStore((state) => state.setNetworkData);
  const setLoading = useMetricsStore((state) => state.setLoading);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await apiClient.getNetworkMetrics();
      setNetworkData(data);
      setLoading(false);
    }
    load();
  }, [setNetworkData, setLoading]);

  return null;
}
```

## Usage Examples

### 1. Basic Dashboard Setup

```typescript
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// App.tsx handles:
// - Initial data loading
// - WebSocket connection
// - Routing between panels

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### 2. Custom Panel with Filters

```typescript
import { NetworkView } from './components/NetworkView';
import { useMetricsStore } from './store/metricsStore';

function CustomNetworkPanel() {
  const [selectedCommunity, setSelectedCommunity] = useState<number | undefined>();
  const networkData = useMetricsStore((state) => state.networkData);

  return (
    <div>
      <select onChange={(e) => setSelectedCommunity(Number(e.target.value))}>
        <option value="">All communities</option>
        {networkData?.communities.map((c) => (
          <option key={c.id} value={c.id}>Community {c.id}</option>
        ))}
      </select>

      <NetworkView
        data={networkData}
        filterCommunity={selectedCommunity}
        onNodeClick={(agentId) => {
          console.log('Selected agent:', agentId);
        }}
      />
    </div>
  );
}
```

### 3. Export Data

```typescript
import { useMetricsStore } from './store/metricsStore';
import Papa from 'papaparse';

function ExportButton() {
  const timelineData = useMetricsStore((state) => state.timelineData);

  const exportCSV = () => {
    if (!timelineData) return;

    // Flatten timeline data for CSV
    const rows = timelineData.behaviors.flatMap((behavior) =>
      behavior.data.map((point) => ({
        timestamp: new Date(point.timestamp).toISOString(),
        behavior: behavior.name,
        count: point.count,
      }))
    );

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return <button onClick={exportCSV}>Export Timeline</button>;
}
```

### 4. Live Metric Monitor

```typescript
function LiveMonitor() {
  const [metrics, setMetrics] = useState({ population: 0, avgHealth: 0 });

  useEffect(() => {
    const ws = getWebSocket();
    const unsubscribe = ws.subscribe((message) => {
      if (message.type === 'metrics_update' && message.data.timeseries) {
        const latest = message.data.timeseries.metrics;
        setMetrics({
          population: latest.find((m) => m.name === 'population')?.data.slice(-1)[0]?.value || 0,
          avgHealth: latest.find((m) => m.name === 'avgHealth')?.data.slice(-1)[0]?.value || 0,
        });
      }
    });

    ws.connect();
    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, []);

  return (
    <div>
      <div>Population: {metrics.population}</div>
      <div>Avg Health: {metrics.avgHealth.toFixed(1)}</div>
    </div>
  );
}
```

### 5. Agent Detail Viewer

```typescript
function AgentDetailPanel({ agentId }: { agentId: string }) {
  const [details, setDetails] = useState<AgentDetails | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      const data = await apiClient.getAgentDetails(agentId);
      setDetails(data);
    }
    fetchDetails();
  }, [agentId]);

  if (!details) return <div>Loading agent...</div>;

  return (
    <div>
      <h3>{details.name}</h3>
      <div>Centrality: {details.centrality.toFixed(2)}</div>
      <div>Community: {details.community}</div>
      <div>Wealth: {details.wealth}</div>
      <div>Position: ({details.position.x}, {details.position.y})</div>
      <div>Behaviors: {details.behaviors.join(', ')}</div>
      <div>Innovations: {details.innovationCount}</div>
    </div>
  );
}
```

## Development

### Adding a New Panel

**1. Create Component:**
```typescript
// src/components/MyNewView.tsx
import { useMetricsStore, MyNewData } from '../store/metricsStore';

interface MyNewViewProps {
  data?: MyNewData | null;
  loading?: boolean;
}

export function MyNewView({ data: propData, loading: propLoading }: MyNewViewProps) {
  const storeData = useMetricsStore((state) => state.myNewData);
  const storeLoading = useMetricsStore((state) => state.isLoading);

  const data = propData !== undefined ? propData : storeData;
  const loading = propLoading !== undefined ? propLoading : storeLoading;

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="view-container my-new-view">
      <h2>My New View</h2>
      {/* Visualization logic */}
    </div>
  );
}
```

**2. Add to Store:**
```typescript
// src/store/metricsStore.ts
export interface MyNewData {
  // Define data structure
}

interface MetricsState {
  // ... existing state
  myNewData: MyNewData | null;
  setMyNewData: (data: MyNewData | null) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  // ... existing state
  myNewData: null,
  setMyNewData: (data) => set({ myNewData: data }),
}));
```

**3. Add API Endpoint:**
```typescript
// src/utils/apiClient.ts
async getMyNewMetrics() {
  return this.fetchJSON('/api/metrics/mynew');
}
```

**4. Add to Router:**
```typescript
// src/App.tsx
import MyNewView from './components/MyNewView';

// In loadInitialData():
const myNew = await apiClient.getMyNewMetrics();
setMyNewData(myNew);

// In Routes:
<Route path="mynew" element={<MyNewView />} />
```

**5. Add to Layout:**
```typescript
// src/components/Layout.tsx
<NavLink to="/mynew">My New View</NavLink>
```

### Styling Guidelines

**Dark Theme Variables:**
```css
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #242424;
  --text-primary: #fff;
  --text-secondary: #888;
  --border: #333;
  --accent: #646cff;
}
```

**Component CSS Pattern:**
```css
.my-new-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.my-new-view .chart-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
}
```

### Testing

**Unit Tests (Vitest):**
```bash
npm test                    # Run all tests
npm run test:ui             # Interactive UI
npm run test:coverage       # Coverage report
```

**E2E Tests (Playwright):**
```bash
npm run test:e2e            # Headless
npm run test:e2e:headed     # With browser
npm run test:e2e:ui         # Interactive UI
```

**Example Test:**
```typescript
import { render, screen } from '@testing-library/react';
import { NetworkView } from './NetworkView';

test('renders network graph', () => {
  const mockData = {
    nodes: [{ id: '1', name: 'Alice', centrality: 0.5, community: 1 }],
    edges: [],
    communities: [{ id: 1, size: 1, density: 0 }],
  };

  render(<NetworkView data={mockData} />);
  expect(screen.getByTestId('network-graph')).toBeInTheDocument();
});
```

## Configuration

### Vite Config

**Port Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5174,              // Dashboard port
  }
});
```

### API Base URL

**Override for production:**
```typescript
// src/utils/apiClient.ts
const API_BASE_URL = import.meta.env.VITE_METRICS_API_URL || 'http://localhost:8766';
```

**Environment Variables:**
```bash
# .env.local
VITE_METRICS_API_URL=http://my-server.com:8766
VITE_WS_URL=ws://my-server.com:8765
```

### WebSocket Configuration

**Retry Settings:**
```typescript
// src/utils/websocket.ts
const RECONNECT_DELAY = 3000;        // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
```

## Troubleshooting

### Dashboard Won't Load

**Problem:** White screen or "Failed to connect to metrics API".

**Check metrics server is running:**
```bash
curl http://localhost:8766/api/health
# Should return: { "status": "ok" }
```

**Check port availability:**
```bash
lsof -i :5174
# Dashboard should be running on 5174
```

**Restart dashboard:**
```bash
cd custom_game_engine/packages/metrics-dashboard
npm run dev
```

### WebSocket Connection Failed

**Problem:** "WebSocket connection failed" or no real-time updates.

**Check WebSocket port:**
```bash
lsof -i :8765
# Metrics server WebSocket should be listening
```

**Check browser console:**
```javascript
// In DevTools console
const ws = new WebSocket('ws://localhost:8765');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

**Disable auto-reconnect for debugging:**
```typescript
// src/utils/websocket.ts
private attemptReconnect(): void {
  console.log(`Reconnect attempt ${this.reconnectAttempts}`);
  // Add logging to debug reconnection issues
}
```

### Empty Data / No Metrics

**Problem:** Panels show "No data available".

**Check API responses:**
```bash
curl http://localhost:8766/api/metrics/network
curl http://localhost:8766/api/metrics/timeline
curl http://localhost:8766/api/metrics/spatial
```

**Check game is running:**
```bash
# Game must be running to generate metrics
curl http://localhost:3000
```

**Check MetricsCollectionSystem:**
```javascript
// In game console (http://localhost:3000)
game.world.gameLoop.systemRegistry.getSystem('metrics_collection')
// Should return system instance, not null
```

### Performance Issues / Slow Rendering

**Problem:** Dashboard is laggy or unresponsive.

**Solution 1: Reduce network graph size**
```typescript
<NetworkView
  minCentrality={0.2}  // Filter out low-influence nodes
  filterCommunity={1}   // Show only one community
/>
```

**Solution 2: Disable WebSocket**
```typescript
// src/App.tsx
// Comment out WebSocket setup for debugging
// const ws = getWebSocket((connected) => setConnected(connected));
```

**Solution 3: Increase sampling interval**
```bash
# In metrics server config
snapshotInterval: 200  # Sample every 200 ticks instead of 100
```

**Solution 4: Profile with React DevTools**
```bash
npm install -D @welldone-software/why-did-you-render
```

### Type Errors

**Problem:** TypeScript errors after updating data structures.

**Solution 1: Regenerate types**
```bash
cd custom_game_engine/packages/metrics-dashboard
npm run type-check
```

**Solution 2: Check store interfaces**
```typescript
// src/store/metricsStore.ts
// Ensure interfaces match API responses
export interface NetworkData { ... }
```

**Solution 3: Clear node_modules**
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

**Problem:** "Access-Control-Allow-Origin" errors in console.

**Solution:** Metrics server already includes CORS headers. If using proxy:
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8766',
      changeOrigin: true,
    }
  }
}
```

### Data Not Updating

**Problem:** Dashboard shows stale data, doesn't reflect game changes.

**Check WebSocket messages:**
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8765');
ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
```

**Force refresh:**
```typescript
// src/App.tsx
// Add manual refresh button
const refresh = async () => {
  const data = await apiClient.getNetworkMetrics();
  setNetworkData(data);
};
```

**Check metrics streaming enabled:**
```typescript
// In game config
metricsSystem = new MetricsCollectionSystem(world, {
  streaming: true,  // Must be enabled
  streamConfig: {
    serverUrl: 'http://localhost:8766',
  }
});
```

---

## Related Documentation

- **[Metrics Package README](../metrics/README.md)** - Backend metrics collection and storage
- **[ARCHITECTURE_OVERVIEW.md](../../ARCHITECTURE_OVERVIEW.md)** - Overall system architecture
- **[METASYSTEMS_GUIDE.md](../../METASYSTEMS_GUIDE.md)** - Integration with game metasystems
- **[DEBUG_API.md](../../DEBUG_API.md)** - `window.game` API for querying metrics

## Examples in Codebase

- **`src/components/`** - All visualization panel implementations
- **`src/__tests__/`** - Unit tests and usage examples
- **`src/store/metricsStore.ts`** - State management patterns
- **`src/utils/apiClient.ts`** - API integration example
