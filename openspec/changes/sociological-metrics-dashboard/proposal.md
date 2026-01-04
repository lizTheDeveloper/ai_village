# Proposal: Work Order: Sociological Metrics Visualization Dashboard

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** In Progress
**Complexity:** 5+ systems
**Priority:** TIER 1
**Source:** Migrated from agents/autonomous-dev/work-orders/sociological-metrics-dashboard

---

## Original Work Order

# Work Order: Sociological Metrics Visualization Dashboard

**Phase:** 25 (Sociological Metrics - Visualization)
**Created:** 2026-01-02
**Claimed:** 2026-01-02
**Spec Agent:** spec-agent-001
**Status:** READY_FOR_TESTS
**Priority:** HIGH

---

## Spec Reference

- **Primary Spec:** [custom_game_engine/specs/sociological-metrics-system.md](../../../../custom_game_engine/specs/sociological-metrics-system.md) (Section 7)
- **Dependencies:**
  - ✅ Phase 23 (Storage & API) - Complete
  - ✅ Phase 24 (Analysis Modules) - Complete
  - NetworkAnalyzer, SpatialAnalyzer, InequalityAnalyzer, CulturalDiffusionAnalyzer

---

## Context

Phases 23-24 provide comprehensive metrics collection, storage, and analysis. Phase 25 adds **interactive visualizations** to make this data actionable for researchers, players, and developers.

**Current Status:**
- ✅ MetricsAPI provides REST-like queries
- ✅ MetricsLiveStream provides real-time updates
- ✅ All analyzers implemented (network, spatial, inequality, cultural)
- ❌ No visualization dashboard exists
- ❌ Data is accessible via API but not visually presented

**Use Cases:**
- Researchers studying emergent social behaviors
- Players monitoring their village's social health
- Developers debugging AI interactions
- Content creators showcasing interesting simulations

---

## Requirements Summary

### Feature 1: React Dashboard Application
Modern web dashboard with TypeScript and component architecture:
1. React 18 with TypeScript
2. Zustand for state management
3. React Router for navigation
4. Responsive layout (desktop + tablet)

### Feature 2: Network Visualization
Interactive social network graphs:
1. Force-directed graph layout (D3.js or Cytoscape.js)
2. Community detection highlighting (different colors per community)
3. Node sizing by centrality (bigger = more central)
4. Edge weights show relationship strength
5. Interactive: click node → show agent details
6. Zoom, pan, filter capabilities

### Feature 3: Behavior Timeline
Temporal view of agent behaviors:
1. Stacked area chart showing behavior distribution over time
2. Innovation events marked on timeline
3. Adoption curves (S-curves for behavior spread)
4. Time scrubber for playback
5. Export timeline as image/video

### Feature 4: Spatial Heatmap
Geographic distribution overlays:
1. Density heatmap (agent concentration)
2. Movement trails (agent paths over time)
3. Territory boundaries (detected clusters)
4. Hotspot detection (areas of high activity)
5. Layer toggles (show/hide different data)

### Feature 5: Inequality Dashboard
Economic and social stratification:
1. Lorenz curves (cumulative wealth distribution)
2. Gini coefficient trends over time
3. Quartile analysis (top 25%, bottom 25%)
4. Mobility matrices (movement between classes)
5. Comparison tools (compare villages/time periods)

### Feature 6: Cultural Diffusion Visualization
Innovation spread and influence:
1. Sankey diagrams (behavior flow between agents)
2. Cascade trees (who influenced whom)
3. Adoption curves (S-curves per behavior)
4. Influencer detection (top spreaders highlighted)
5. Transmission rate graphs

### Feature 7: Time Series Explorer
Multi-metric correlation analysis:
1. Line charts for any metric over time
2. Correlation matrices (which metrics move together)
3. Metric comparison (overlay multiple metrics)
4. Export data as CSV
5. Configurable time windows (hour, day, week)

---

## Acceptance Criteria

### Criterion 1: Dashboard Setup
- **WHEN:** The dashboard application is created
- **THEN:** The system SHALL:
  1. Use React 18 with TypeScript
  2. Use Vite for build tooling
  3. Use Zustand for state management
  4. Have modular component structure
  5. Connect to MetricsAPI on http://localhost:8766
- **Verification:**
  - `npm create vite@latest metrics-dashboard -- --template react-ts`
  - Project compiles with zero errors
  - Can fetch data from MetricsAPI
  - State management works with Zustand

### Criterion 2: Network View Component
- **WHEN:** Viewing the network graph
- **THEN:** The system SHALL:
  1. Render force-directed graph with agents as nodes
  2. Color communities differently (community detection from NetworkAnalyzer)
  3. Size nodes by centrality (bigger = more central)
  4. Show relationship strengths as edge weights
  5. Allow click on node → show agent details panel
- **Verification:**
  - Load network data from `/api/metrics/network`
  - Graph renders with 100+ agents
  - Communities visually distinct (colors)
  - Click agent node → details panel appears with name, connections, centrality
  - Zoom/pan works smoothly

### Criterion 3: Behavior Timeline Component
- **WHEN:** Viewing behavior over time
- **THEN:** The system SHALL:
  1. Render stacked area chart (D3.js or Recharts)
  2. Show behavior distribution (gather, craft, socialize, etc.)
  3. Mark innovation events (first agent to do X)
  4. Display adoption curves (S-curves)
  5. Time scrubber allows playback
- **Verification:**
  - Load timeline data from `/api/metrics/timeline`
  - Chart shows 10+ behaviors stacked
  - Innovation markers visible (dots on timeline)
  - Scrubber updates chart as dragged
  - Export button downloads PNG

### Criterion 4: Spatial Heatmap Component
- **WHEN:** Viewing spatial distribution
- **THEN:** The system SHALL:
  1. Overlay heatmap on world map
  2. Show density (red = high concentration)
  3. Show movement trails (agent paths)
  4. Show territory boundaries (detected clusters)
  5. Layer toggles (density, trails, territories)
- **Verification:**
  - Load spatial data from `/api/metrics/spatial`
  - Heatmap renders on canvas/SVG
  - Density hotspots visible (red zones)
  - Toggle trails → see agent movements
  - Toggle territories → see cluster boundaries

### Criterion 5: Inequality Dashboard Component
- **WHEN:** Viewing inequality metrics
- **THEN:** The system SHALL:
  1. Render Lorenz curve (cumulative wealth vs population)
  2. Display Gini coefficient trend (line chart)
  3. Show quartile breakdown (bar chart)
  4. Display mobility matrix (heatmap: class transitions)
  5. Allow comparison between time periods
- **Verification:**
  - Load inequality data from `/api/metrics/inequality`
  - Lorenz curve renders correctly (diagonal = equality)
  - Gini trend shows over time (0 = perfect equality, 1 = perfect inequality)
  - Quartiles show wealth distribution (top 25%, 50-75%, 25-50%, bottom 25%)
  - Mobility matrix shows transitions

### Criterion 6: Cultural Diffusion Component
- **WHEN:** Viewing cultural spread
- **THEN:** The system SHALL:
  1. Render Sankey diagram (behavior flow)
  2. Show cascade trees (who influenced whom)
  3. Display adoption curves (S-curves per behavior)
  4. Highlight top influencers (biggest spreaders)
  5. Show transmission rates (speed of spread)
- **Verification:**
  - Load diffusion data from `/api/metrics/cultural`
  - Sankey shows behavior flowing from agent to agent
  - Cascade tree shows influence hierarchy
  - Adoption curves show S-shape (slow start, rapid middle, plateau)
  - Influencers highlighted (larger nodes or badges)

### Criterion 7: Time Series Explorer Component
- **WHEN:** Exploring custom metrics
- **THEN:** The system SHALL:
  1. Allow selecting any metric from dropdown
  2. Render line chart for metric over time
  3. Allow overlaying multiple metrics
  4. Show correlation matrix (which metrics correlate)
  5. Export data as CSV
- **Verification:**
  - Select "average_mood" metric → line chart appears
  - Add "resource_inequality" → both lines shown
  - Correlation matrix shows r-value between metrics
  - Export button downloads CSV with data

### Criterion 8: Real-Time Updates
- **WHEN:** The game is running
- **THEN:** The system SHALL:
  1. Connect to MetricsLiveStream WebSocket
  2. Update visualizations in real-time (< 1 second lag)
  3. Handle connection loss gracefully
  4. Auto-reconnect on disconnect
- **Verification:**
  - Dashboard connects to ws://localhost:8765
  - Network graph updates as agents form relationships
  - Timeline extends as new behaviors occur
  - Connection lost → "Reconnecting..." message shown
  - Connection restored → data syncs

---

## Implementation Steps

1. **Project Setup** (2-3 hours)
   - Create React + TypeScript project with Vite
   - Install dependencies: D3.js, Cytoscape.js, Recharts, Zustand
   - Set up routing (React Router)
   - Create base layout (navbar, sidebar, main content)
   - Configure API client (fetch wrapper)

2. **Network View** (6-8 hours)
   - Create NetworkView component
   - Integrate Cytoscape.js or D3 force simulation
   - Fetch data from `/api/metrics/network`
   - Implement community coloring
   - Add node click → details panel
   - Add zoom/pan controls

3. **Behavior Timeline** (5-6 hours)
   - Create TimelineView component
   - Use Recharts for stacked area chart
   - Fetch data from `/api/metrics/timeline`
   - Add innovation event markers
   - Implement time scrubber
   - Add export functionality

4. **Spatial Heatmap** (6-8 hours)
   - Create SpatialView component
   - Implement canvas-based heatmap
   - Fetch data from `/api/metrics/spatial`
   - Add movement trail rendering
   - Add territory boundary overlay
   - Implement layer toggles

5. **Inequality Dashboard** (5-6 hours)
   - Create InequalityView component
   - Render Lorenz curve with D3
   - Add Gini trend line chart
   - Add quartile bar chart
   - Add mobility matrix heatmap
   - Implement time period comparison

6. **Cultural Diffusion** (6-8 hours)
   - Create DiffusionView component
   - Implement Sankey diagram (D3-sankey)
   - Add cascade tree visualization
   - Render adoption curves
   - Highlight influencers
   - Add transmission rate graphs

7. **Time Series Explorer** (4-5 hours)
   - Create TimeSeriesView component
   - Add metric selector dropdown
   - Implement multi-line chart
   - Add correlation matrix
   - Implement CSV export

8. **Real-Time Integration** (3-4 hours)
   - Implement WebSocket client
   - Connect to MetricsLiveStream
   - Add auto-update logic
   - Handle reconnection
   - Add connection status indicator

9. **Polish & Testing** (4-5 hours)
   - Responsive design (tablet support)
   - Loading states
   - Error handling
   - Performance optimization (virtualization for large datasets)
   - E2E tests (Playwright)

---

## Technology Stack

### Core
- React 18
- TypeScript 5.x
- Vite (build tool)

### State Management
- Zustand (lightweight, no boilerplate)

### Visualization Libraries
- **D3.js** - General purpose, Lorenz curves, Sankey diagrams
- **Cytoscape.js** - Network graphs (alternative: react-force-graph)
- **Recharts** - Line/area charts (alternative: Victory)
- **D3-sankey** - Sankey diagrams
- **Canvas API** - Heatmaps (performance)

### Utilities
- date-fns - Date formatting
- lodash-es - Data manipulation
- papaparse - CSV export

---

## Testing Plan

### Unit Tests (Vitest)
- Test data transformations (API → component format)
- Test metric calculations
- Test state management

### Integration Tests
- Test API connection
- Test data fetching
- Test WebSocket connection

### E2E Tests (Playwright)
- Test network graph interaction
- Test timeline scrubber
- Test export functionality
- Test real-time updates

---

## Performance Requirements

- **Initial Load:** < 2 seconds
- **Graph Rendering:** < 500ms for 1000 nodes
- **Chart Updates:** < 100ms per update
- **WebSocket Latency:** < 50ms from event to visual update
- **Memory:** < 200MB for dashboard app

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ Real-time updates work smoothly (< 1s lag)
3. ✅ Performance within budget (< 2s initial load)
4. ✅ All visualizations render correctly
5. ✅ Export functionality works (CSV, PNG)
6. ✅ Responsive on desktop and tablet

---

## Dependencies

- ✅ MetricsAPI running on http://localhost:8766
- ✅ MetricsLiveStream on ws://localhost:8765
- ✅ NetworkAnalyzer data available
- ✅ SpatialAnalyzer data available
- ✅ InequalityAnalyzer data available
- ✅ CulturalDiffusionAnalyzer data available

---

## Deployment

### Development
```bash
cd packages/metrics-dashboard
npm install
npm run dev
# Dashboard available at http://localhost:5174
```

### Production Build
```bash
npm run build
# Static files in dist/
# Deploy to any static host (Vercel, Netlify, S3)
```

### Integration with Game
- Dashboard runs separately from game
- Game provides metrics via API
- Can be embedded in game UI (future work)

---

## Future Enhancements (Not in This Work Order)

- 3D network visualization (force-graph-3d)
- Agent journey replay (animate agent paths)
- Comparative analysis (multiple villages side-by-side)
- Historical playback (scrub through entire simulation)
- Custom query builder (SQL-like interface)
- Alert system (notify when metrics exceed thresholds)

---

## Notes

- Keep it simple initially - complexity can be added iteratively
- Focus on core visualizations first
- Ensure real-time performance (don't block UI thread)
- Consider web workers for heavy computations
- Mobile support is NOT required (desktop/tablet only)

---

## Implementation Checklist

### Phase 1: Project Setup (2-3 hours)
- [ ] Create React + TypeScript project with Vite: `npm create vite@latest metrics-dashboard -- --template react-ts`
- [ ] Install dependencies: D3.js, Cytoscape.js, Recharts, Zustand, React Router
- [ ] Set up routing (React Router)
- [ ] Create base layout (navbar, sidebar, main content)
- [ ] Configure API client (fetch wrapper to http://localhost:8766)
- [ ] Test build: `npm run build`

### Phase 2: Network View (6-8 hours)
- [ ] Create NetworkView component in `src/components/NetworkView.tsx`
- [ ] Integrate Cytoscape.js for force-directed graph
- [ ] Fetch data from `/api/metrics/network`
- [ ] Implement community coloring (community detection from NetworkAnalyzer)
- [ ] Size nodes by centrality
- [ ] Add node click → details panel
- [ ] Add zoom/pan controls
- [ ] Test with 100+ agents

### Phase 3: Behavior Timeline (5-6 hours)
- [ ] Create TimelineView component in `src/components/TimelineView.tsx`
- [ ] Use Recharts for stacked area chart
- [ ] Fetch data from `/api/metrics/timeline`
- [ ] Add innovation event markers
- [ ] Implement time scrubber
- [ ] Add export functionality (PNG)
- [ ] Test timeline updates

### Phase 4: Spatial Heatmap (6-8 hours)
- [ ] Create SpatialView component in `src/components/SpatialView.tsx`
- [ ] Implement canvas-based heatmap
- [ ] Fetch data from `/api/metrics/spatial`
- [ ] Add movement trail rendering
- [ ] Add territory boundary overlay
- [ ] Implement layer toggles (density, trails, territories)
- [ ] Test heatmap rendering

### Phase 5: Inequality Dashboard (5-6 hours)
- [ ] Create InequalityView component in `src/components/InequalityView.tsx`
- [ ] Render Lorenz curve with D3
- [ ] Add Gini trend line chart
- [ ] Add quartile bar chart
- [ ] Add mobility matrix heatmap
- [ ] Implement time period comparison
- [ ] Test inequality metrics

### Phase 6: Cultural Diffusion (6-8 hours)
- [ ] Create DiffusionView component in `src/components/DiffusionView.tsx`
- [ ] Implement Sankey diagram (D3-sankey)
- [ ] Add cascade tree visualization
- [ ] Render adoption curves
- [ ] Highlight influencers
- [ ] Add transmission rate graphs
- [ ] Test diffusion visualization

### Phase 7: Time Series Explorer (4-5 hours)
- [ ] Create TimeSeriesView component in `src/components/TimeSeriesView.tsx`
- [ ] Add metric selector dropdown
- [ ] Implement multi-line chart
- [ ] Add correlation matrix
- [ ] Implement CSV export
- [ ] Test multi-metric overlay

### Phase 8: Real-Time Integration (3-4 hours)
- [ ] Implement WebSocket client
- [ ] Connect to ws://localhost:8765 (MetricsLiveStream)
- [ ] Add auto-update logic
- [ ] Handle reconnection
- [ ] Add connection status indicator
- [ ] Test real-time updates

### Phase 9: Polish & Testing (4-5 hours)
- [ ] Responsive design (desktop + tablet)
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization (virtualization)
- [ ] E2E tests (Playwright)
- [ ] Test all visualizations

---

## Test Requirements

### Unit Tests (Vitest)
- [ ] Test data transformations (API → component format)
- [ ] Test metric calculations
- [ ] Test state management (Zustand stores)

### Integration Tests
- [ ] Test API connection
- [ ] Test data fetching
- [ ] Test WebSocket connection

### E2E Tests (Playwright)
- [ ] Test network graph interaction (click node → details)
- [ ] Test timeline scrubber (drag → chart updates)
- [ ] Test export functionality (download CSV/PNG)
- [ ] Test real-time updates (data changes → visual updates)

---

## Definition of Done

- [ ] All 8 visualization components complete
- [ ] Real-time updates work (< 1s lag)
- [ ] Performance validated (< 2s initial load, < 500ms graph rendering)
- [ ] All visualizations render correctly
- [ ] Export functionality works (CSV, PNG)
- [ ] Responsive on desktop and tablet
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Dashboard connects to MetricsAPI and MetricsLiveStream
- [ ] Documentation updated

---

## Pre-Test Checklist

**Since status is READY_FOR_TESTS, verify before testing:**

- [ ] MetricsAPI running on http://localhost:8766
- [ ] MetricsLiveStream running on ws://localhost:8765
- [ ] NetworkAnalyzer, SpatialAnalyzer, InequalityAnalyzer, CulturalDiffusionAnalyzer all implemented and generating data
- [ ] Test data available from all API endpoints
- [ ] Dashboard project created and builds successfully
- [ ] All dependencies installed
- [ ] Base layout renders without errors



---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
