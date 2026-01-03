# Metrics Dashboard Test Suite

**Status:** TDD Red Phase - All tests should FAIL (no implementation yet)

This test suite was written BEFORE implementation following Test-Driven Development (TDD).

## Test Coverage

### Unit Tests (Vitest)

#### Data Transformers (`utils/dataTransformers.test.ts`)
- ✓ Network data transformation (nodes, edges, communities)
- ✓ Timeline data transformation (behaviors, innovations, adoption curves)
- ✓ Spatial data transformation (heatmap, trails, territories)
- ✓ Inequality data transformation (Lorenz curve, Gini, quartiles, mobility)
- ✓ Cultural data transformation (Sankey, cascades, influencers)
- ✓ Correlation calculations (Pearson coefficient)
- ✓ Error handling (missing fields, invalid data)

#### API Client (`utils/apiClient.test.ts`)
- ✓ API connection to http://localhost:8766
- ✓ Fetching all data types (network, timeline, spatial, inequality, cultural, time series)
- ✓ Query parameters (time ranges, metric selection)
- ✓ Caching behavior (TTL, force refresh, cache clearing)
- ✓ Error handling (404, 500, network errors)
- ✓ Retry logic with exponential backoff
- ✓ Timeout handling

### Component Tests (React Testing Library)

#### NetworkView (`components/NetworkView.test.tsx`)
- ✓ Force-directed graph rendering
- ✓ Community coloring
- ✓ Node sizing by centrality
- ✓ Edge weights visualization
- ✓ Agent details panel on click
- ✓ Zoom and pan controls
- ✓ Filtering by community and centrality

#### TimelineView (`components/TimelineView.test.tsx`)
- ✓ Stacked area chart rendering
- ✓ Behavior distribution over time
- ✓ Innovation markers
- ✓ Adoption curves (S-curves)
- ✓ Time scrubber functionality
- ✓ Export to PNG
- ✓ Behavior filtering

#### SpatialView (`components/SpatialView.test.tsx`)
- ✓ Heatmap rendering on canvas
- ✓ Density visualization (red = high concentration)
- ✓ Movement trails
- ✓ Territory boundaries
- ✓ Hotspot detection
- ✓ Layer toggles (density, trails, territories, hotspots)
- ✓ Zoom and pan

#### InequalityView (`components/InequalityView.test.tsx`)
- ✓ Lorenz curve rendering
- ✓ Perfect equality line
- ✓ Gini coefficient display and trends
- ✓ Quartile breakdown (top 25%, bottom 25%, etc.)
- ✓ Mobility matrix heatmap
- ✓ Time period comparison
- ✓ Matrix validation (square, row sums to 1)

#### CulturalDiffusionView (`components/CulturalDiffusionView.test.tsx`)
- ✓ Sankey diagram (behavior flow)
- ✓ Cascade trees (influence hierarchy)
- ✓ Adoption curves with S-shape
- ✓ Top influencer highlighting
- ✓ Transmission rates display
- ✓ Behavior filtering
- ✓ Interactive elements (hover, expand/collapse)

#### TimeSeriesView (`components/TimeSeriesView.test.tsx`)
- ✓ Metric selection dropdown
- ✓ Multi-line chart with overlay
- ✓ Correlation matrix
- ✓ CSV export functionality
- ✓ Time window configuration (hour, day, week)
- ✓ Correlation color coding
- ✓ Chart interaction (zoom, tooltip)

### Integration Tests

#### WebSocket Client (`integration/websocket.test.ts`)
- ✓ Connection to ws://localhost:8765
- ✓ Real-time updates (< 1s lag)
- ✓ Graceful connection loss handling
- ✓ Auto-reconnect with exponential backoff
- ✓ Data sync after reconnection
- ✓ Message parsing and routing
- ✓ Error event handling

#### API Integration (`integration/api.test.ts`)
- ✓ Full API connection workflow
- ✓ All endpoint testing (network, timeline, spatial, inequality, cultural, timeseries)
- ✓ Data validation at boundaries
- ✓ Query parameter encoding
- ✓ Concurrent request handling
- ✓ Cache management
- ✓ Retry strategies

### E2E Tests (Playwright)

#### Critical User Flows (`e2e/dashboard.spec.ts`)
- ✓ Dashboard loads within 2 seconds
- ✓ Navigation between all views
- ✓ Network graph interaction (click, zoom, filter)
- ✓ Timeline scrubbing and export
- ✓ Spatial layer toggling
- ✓ Real-time WebSocket updates
- ✓ Performance requirements (1000 nodes < 500ms, chart updates < 100ms)
- ✓ Error handling and recovery
- ✓ Export functionality (CSV, PNG)
- ✓ Responsive design (tablet viewport)

## Running Tests

### All Tests
```bash
cd packages/metrics-dashboard
npm install
npm run test:all
```

### Unit + Component Tests Only
```bash
npm test
```

### Unit Tests with UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### E2E Tests
```bash
npm run test:e2e
```

### E2E Tests with UI
```bash
npm run test:e2e:ui
```

## Expected Results (TDD Red Phase)

**All tests should FAIL** because:
1. No components exist yet (`NetworkView`, `TimelineView`, etc.)
2. No utility functions exist (`dataTransformers`, `apiClient`)
3. No services exist (`MetricsWebSocketClient`)
4. No React app scaffolding exists

This is **correct and expected** for TDD red phase.

## Test File Structure

```
src/__tests__/
├── setup.ts                           # Test setup (mocks, matchers)
├── mockData.ts                        # Shared mock data
├── utils/
│   ├── dataTransformers.test.ts      # Data transformation tests
│   └── apiClient.test.ts              # API client tests
├── components/
│   ├── NetworkView.test.tsx           # Network visualization tests
│   ├── TimelineView.test.tsx          # Timeline tests
│   ├── SpatialView.test.tsx           # Spatial heatmap tests
│   ├── InequalityView.test.tsx        # Inequality dashboard tests
│   ├── CulturalDiffusionView.test.tsx # Cultural diffusion tests
│   └── TimeSeriesView.test.tsx        # Time series explorer tests
├── integration/
│   ├── websocket.test.ts              # WebSocket integration tests
│   └── api.test.ts                    # API integration tests
└── e2e/
    └── dashboard.spec.ts              # E2E user flow tests
```

## Test Metrics

- **Total Test Files:** 11
- **Estimated Test Count:** ~250 tests
- **Coverage Target:** 80%+

## Acceptance Criteria Coverage

### Criterion 1: Dashboard Setup
- ✓ Tests verify React 18, TypeScript, Vite, Zustand
- ✓ Tests verify MetricsAPI connection

### Criterion 2: Network View
- ✓ Force-directed graph
- ✓ Community colors
- ✓ Node sizing by centrality
- ✓ Edge weights
- ✓ Agent details on click

### Criterion 3: Behavior Timeline
- ✓ Stacked area chart
- ✓ Innovation markers
- ✓ Adoption curves
- ✓ Time scrubber
- ✓ Export functionality

### Criterion 4: Spatial Heatmap
- ✓ Density overlay
- ✓ Movement trails
- ✓ Territory boundaries
- ✓ Hotspot detection
- ✓ Layer toggles

### Criterion 5: Inequality Dashboard
- ✓ Lorenz curve
- ✓ Gini coefficient
- ✓ Quartile analysis
- ✓ Mobility matrix
- ✓ Time comparison

### Criterion 6: Cultural Diffusion
- ✓ Sankey diagram
- ✓ Cascade trees
- ✓ Adoption curves
- ✓ Influencer highlighting
- ✓ Transmission rates

### Criterion 7: Time Series Explorer
- ✓ Metric selection
- ✓ Multi-line charts
- ✓ Correlation matrix
- ✓ CSV export
- ✓ Time windows

### Criterion 8: Real-Time Updates
- ✓ WebSocket connection
- ✓ < 1s lag requirement
- ✓ Reconnection handling
- ✓ Data sync

## Next Steps

1. **Implementation Agent:** Implement features to make tests pass (TDD green phase)
2. **Refactor:** Clean up code while keeping tests green (TDD refactor phase)
3. **Playtest Agent:** Verify features work in actual dashboard

## Notes

- Tests follow CLAUDE.md guidelines:
  - No silent fallbacks (throw on missing data)
  - No clamping (use proper normalization)
  - Validate at system boundaries
  - Clear error messages
- Tests use descriptive names explaining behavior
- Error paths are thoroughly tested
- Performance requirements are validated
