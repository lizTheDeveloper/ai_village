# Metrics Dashboard Package - Implementation Audit

## Summary

The metrics-dashboard package is **mostly complete** with working React components, state management, and test coverage. However, there are **critical integration issues** that prevent it from functioning as documented:

**Health Score: 6/10**

**Critical Issues:**
- ❌ WebSocket port mismatch (expects 8765, server runs on 8766)
- ❌ Missing backend API implementations (MetricsAPI endpoints)
- ⚠️ Data transformers are pass-through stubs

**Strengths:**
- ✅ All React components are fully implemented
- ✅ Comprehensive test coverage (unit, integration, E2E)
- ✅ State management with Zustand is complete
- ✅ Visualization libraries (D3, Cytoscape, Recharts) properly integrated

## Critical Issues

### 1. WebSocket Port Mismatch (BLOCKING)
- **File:** `src/utils/websocket.ts:1`
- **Issue:** WebSocket connects to `ws://localhost:8765` but README says server runs on port `8766`
- **Impact:** Dashboard cannot receive real-time updates
- **Fix:** Change `WS_URL` to `'ws://localhost:8766'` to match metrics server

### 2. Missing Backend API Endpoints (BLOCKING)
- **Issue:** Dashboard expects HTTP REST API at `/api/metrics/*` but these endpoints don't exist in `metrics-server.ts`
- **Missing Endpoints:**
  - `GET /api/metrics/network` - Social network metrics
  - `GET /api/metrics/timeline` - Timeline/behavior events
  - `GET /api/metrics/spatial` - Spatial heatmap data
  - `GET /api/metrics/inequality` - Inequality/Lorenz curve data
  - `GET /api/metrics/cultural` - Cultural diffusion/Sankey data
  - `GET /api/metrics/timeseries` - Time series metrics
  - `GET /api/agents/:agentId` - Agent details
  - `GET /api/health` - Server health check
- **Evidence:** `scripts/metrics-server.ts` only defines `/dashboard`, `/metrics`, `/api/live/*`, `/api/saves`, etc. but not `/api/metrics/*`
- **Impact:** Dashboard loads but displays "No data available" for all views
- **Fix:** Implement MetricsAPI endpoints in `metrics-server.ts` or route to existing `/metrics` endpoint

### 3. Missing MetricsAPI Implementation
- **Issue:** README references `packages/metrics/src/api/MetricsAPI.ts` as the backend implementation, but dashboard expects it to be wired into `metrics-server.ts`
- **Impact:** Frontend has no data source
- **Fix:** Either:
  - Wire `MetricsAPI` class into HTTP server routes
  - Or modify `apiClient.ts` to use existing `/metrics` endpoint

## Stubs and Placeholders

### Data Transformers (Low Priority - Validation Only)
- `src/utils/dataTransformers.ts:5-45` - All 6 transform functions are pass-through stubs
  - `transformNetworkData()` - Only validates, returns input unchanged
  - `transformTimelineData()` - Only validates, returns input unchanged
  - `transformSpatialData()` - Only validates, returns input unchanged
  - `transformInequalityData()` - Only validates, returns input unchanged
  - `transformCulturalData()` - Only validates, returns input unchanged
  - `transformTimeSeriesData()` - Only validates, returns input unchanged
- **Status:** These work as minimal validators, but could do actual transformation
- **Priority:** Low - current implementation is functional

### Placeholder Comments (Cosmetic)
- `src/components/SpatialView.tsx:168-176` - Pan functionality placeholders (3 empty event handlers)
  - `handleMapMouseDown()` - Empty function with comment "Pan functionality (placeholder)"
  - `handleMapMouseMove()` - Empty function with comment "Pan functionality (placeholder)"
  - `handleMapMouseUp()` - Empty function with comment "Pan functionality (placeholder)"
- **Status:** Not essential - basic viewing works, pan is nice-to-have
- **Priority:** Low - feature enhancement, not a bug

## Missing Integrations

### Backend-to-Frontend Data Flow (CRITICAL)
1. **No HTTP API Implementation**
   - Dashboard expects MetricsAPI HTTP endpoints at `/api/metrics/*`
   - Server only implements `/metrics` (raw JSON dump) and `/dashboard` (text view)
   - Need to implement REST API or redirect dashboard to existing endpoints

2. **WebSocket Message Format Mismatch**
   - Dashboard expects: `{ type: 'metrics_update', data: { network, timeline, spatial, ... } }`
   - Server likely sends different format (need to verify)
   - App.tsx:29-49 subscribes to `metrics_update` messages

3. **MetricsCollector Integration**
   - README claims MetricsCollector feeds data to dashboard via MetricsAPI
   - No evidence of this connection in `metrics-server.ts`
   - Server uses MetricsStorage but doesn't expose it via HTTP endpoints

### Missing Features (Mentioned in README but Not Implemented)

1. **Cold Storage** (README line 570)
   - README: "Cold storage: Older metrics written to disk (not yet implemented)"
   - **Status:** Explicitly marked as TODO in README
   - **Priority:** Medium - affects long-term scalability

2. **Export to Disk** (Partial)
   - README mentions "exportData()" in MetricsAPI interface
   - Not visible in `apiClient.ts` implementation
   - Components have local CSV export, but no centralized export
   - **Priority:** Low - local export works

## Dead Code

None found. All exported functions/components are used.

## Port Configuration Issues

### Hardcoded Ports
- `src/utils/apiClient.ts:1` - `API_BASE_URL = 'http://localhost:8766'` (hardcoded)
- `src/utils/websocket.ts:1` - `WS_URL = 'ws://localhost:8765'` (hardcoded, WRONG PORT)
- **Impact:** Cannot configure ports, WS port is incorrect
- **Fix:** Use environment variables or config file

### Port Mismatch Summary
| Component | Expected Port | Actual Port | Status |
|-----------|--------------|-------------|---------|
| HTTP API | 8766 | 8766 | ✅ Correct |
| WebSocket | 8765 | 8766 | ❌ **WRONG** |
| Dashboard UI | 8766 | 8766 | ✅ Correct |

## Priority Fixes

### 1. Fix WebSocket Port (CRITICAL - 5 minutes)
**File:** `src/utils/websocket.ts:1`
```typescript
// BEFORE:
const WS_URL = 'ws://localhost:8765';

// AFTER:
const WS_URL = 'ws://localhost:8766';
```

### 2. Implement HTTP API Endpoints (CRITICAL - 2-4 hours)
**File:** `scripts/metrics-server.ts`

Add routes for `/api/metrics/*` endpoints:
```typescript
// Option A: Wire MetricsAPI class into HTTP server
import { MetricsAPI } from '../packages/metrics/src/api/MetricsAPI.js';
const metricsAPI = new MetricsAPI(metricsCollector);

// Route handlers
if (pathname === '/api/metrics/network') {
  const data = await metricsAPI.getNetworkMetrics({ ... });
  respondJSON(res, data);
}
// ... etc for other endpoints

// Option B: Redirect to existing /metrics endpoint
// Modify apiClient.ts to use /metrics instead of /api/metrics/*
```

### 3. Verify WebSocket Message Format (MEDIUM - 1 hour)
**Files:** `scripts/metrics-server.ts`, `src/App.tsx:28-50`

- Check what format metrics-server sends via WebSocket
- Ensure it matches `{ type: 'metrics_update', data: { network, timeline, ... } }`
- Update either server or App.tsx to align

### 4. Document Backend API Status (LOW - 30 minutes)
**File:** `README.md`

- Add "Implementation Status" section
- Mark which endpoints are implemented vs planned
- Document workarounds (e.g., use `/metrics` instead of `/api/metrics/network`)

### 5. Implement Data Transformers (OPTIONAL - 1-2 hours)
**File:** `src/utils/dataTransformers.ts`

- Currently just validation, could do actual data shaping
- Low priority - existing validation is useful

## Testing Status

**Test Coverage: Excellent** ✅
- Unit tests: `src/__tests__/utils/*.test.ts` - API client, transformers
- Integration tests: `src/__tests__/integration/*.test.ts` - API, WebSocket
- Component tests: `src/__tests__/components/*.test.tsx` - All 5 views
- E2E tests: `src/__tests__/e2e/dashboard.spec.ts` - Playwright

**Note:** Tests use mock data and mock server, so they pass even though real integration is broken.

## Recommended Action Plan

### Phase 1: Quick Fixes (30 minutes)
1. ✅ Fix WebSocket port to 8766
2. ✅ Document current limitations in README

### Phase 2: Backend Integration (4-6 hours)
1. ✅ Implement `/api/metrics/*` endpoints in metrics-server.ts
2. ✅ Wire MetricsCollector/MetricsStorage to HTTP routes
3. ✅ Test with real game data

### Phase 3: Polish (2-3 hours)
1. ✅ Implement data transformers
2. ✅ Add pan functionality to SpatialView
3. ✅ Make ports configurable

### Phase 4: Production Ready (1-2 hours)
1. ✅ Add error handling for missing data
2. ✅ Add retry logic for WebSocket
3. ✅ Add loading states during data fetch

## Conclusion

**The dashboard frontend is well-implemented, but disconnected from the backend.**

**Immediate Action Required:**
1. Fix WebSocket port (5 minutes)
2. Implement `/api/metrics/*` endpoints (4 hours)
3. Test with real metrics server

After these fixes, the dashboard should function as documented.
