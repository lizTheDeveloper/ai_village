# Work Order: Unified Dashboard - Phase 3: LLM Dashboard Integration

## Overview

Integrate the ViewRegistry with the metrics-server to automatically generate HTTP endpoints for all text-capable views. This enables curl/LLM access to any registered view.

**Spec Reference:** `custom_game_engine/specs/unified-dashboard-system.md`

**Dependencies:** Phase 1 (Core Infrastructure)

**Blocked By:** Phase 1

**Can Run In Parallel With:** Phase 2 (Player UI Integration)

---

## Deliverables

### 1. Create View Endpoint Handler

Add a module to metrics-server that handles view-based endpoints:

```typescript
// scripts/view-endpoints.ts (or add to metrics-server.ts)

import { viewRegistry, type DashboardView, type ViewContext, type TextFormatOptions } from '../packages/core/src/dashboard/index.js';
import type { World } from '../packages/core/src/ecs/World.js';
import type { IncomingMessage, ServerResponse } from 'http';
import type { StoredMetric } from '../packages/core/src/metrics/MetricsStorage.js';

interface ViewEndpointConfig {
  /** Function to get the live game world (or null if not connected) */
  getWorld: () => World | null;
  /** Function to get session metrics by ID */
  getSessionMetrics: (sessionId: string) => StoredMetric[];
  /** Function to get the current/latest session ID */
  getLatestSessionId: () => string | null;
}

/**
 * Handle a view endpoint request
 */
export async function handleViewEndpoint(
  viewId: string,
  query: URLSearchParams,
  config: ViewEndpointConfig,
  res: ServerResponse
): Promise<void> {
  // Check if view exists
  if (!viewRegistry.has(viewId)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`View '${viewId}' not found.\n\nAvailable views:\n${listAvailableViews()}`);
    return;
  }

  const view = viewRegistry.get(viewId);

  // Check if view has text formatter
  if (!view.textFormatter) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`View '${viewId}' does not support text output (canvas-only).`);
    return;
  }

  // Check live-only constraint
  if (view.liveOnly && !config.getWorld()) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end(`View '${viewId}' requires a running game connection.\n\nStart the game and try again.`);
    return;
  }

  // Build context
  const context = buildViewContext(query, config);

  // Check if we have required context
  if (!context.world && !context.sessionMetrics) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('No game connected and no session specified.\n\nProvide ?session=<id> or start the game.');
    return;
  }

  try {
    // Get data
    const data = await view.getData(context);

    // Format options
    const options: TextFormatOptions = {
      maxWidth: parseInt(query.get('width') || '80', 10),
      useColors: query.get('colors') === 'true',
      detail: (query.get('detail') as 'minimal' | 'normal' | 'verbose') || 'normal',
    };

    // Format and return
    const text = view.textFormatter(data, options);

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Error fetching view data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build ViewContext from URL query parameters
 */
function buildViewContext(
  query: URLSearchParams,
  config: ViewEndpointConfig
): ViewContext {
  const sessionId = query.get('session');
  const entityId = query.get('entity') || query.get('id');

  // Get session metrics if session specified
  let sessionMetrics: StoredMetric[] | undefined;
  if (sessionId) {
    const resolvedId = sessionId === 'latest'
      ? config.getLatestSessionId() || sessionId
      : sessionId;
    sessionMetrics = config.getSessionMetrics(resolvedId);
  }

  // Get world (may be null if no game connected)
  const world = config.getWorld();

  return {
    world: world!, // May be null, views should handle
    sessionMetrics,
    selectedEntityId: entityId || undefined,
    params: Object.fromEntries(query.entries()),
  };
}

/**
 * Generate list of available views for help text
 */
function listAvailableViews(): string {
  const views = viewRegistry.getTextViews();

  if (views.length === 0) {
    return '  (no views registered)';
  }

  return views
    .map(v => {
      const flags = [];
      if (v.liveOnly) flags.push('live-only');
      if (v.historicalOnly) flags.push('historical-only');
      const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      return `  ${v.id} - ${v.title}${flagStr}`;
    })
    .join('\n');
}

/**
 * Generate the views index page
 */
export function generateViewsIndex(): string {
  const views = viewRegistry.getTextViews();
  const lines = [
    'DASHBOARD VIEWS',
    '═'.repeat(60),
    '',
    'The unified dashboard system provides consistent data across',
    'both the player UI (canvas) and this LLM dashboard (curl).',
    '',
    'AVAILABLE VIEWS:',
    '',
  ];

  if (views.length === 0) {
    lines.push('  No views registered yet.');
    lines.push('  Views are registered when the core package loads.');
  } else {
    for (const view of views) {
      lines.push(`  GET /dashboard/view/${view.id}`);
      lines.push(`      ${view.title}`);
      if (view.description) {
        lines.push(`      ${view.description}`);
      }

      const flags = [];
      if (view.liveOnly) flags.push('requires running game');
      if (view.historicalOnly) flags.push('historical analysis only');
      if (view.keyboardShortcut) flags.push(`shortcut: ${view.keyboardShortcut}`);

      if (flags.length > 0) {
        lines.push(`      [${flags.join(', ')}]`);
      }
      lines.push('');
    }
  }

  lines.push('QUERY PARAMETERS:');
  lines.push('  ?session=<id>    - Use session data (or "latest")');
  lines.push('  ?entity=<id>     - Select specific entity');
  lines.push('  ?detail=minimal|normal|verbose');
  lines.push('  ?width=<n>       - Max line width');
  lines.push('');
  lines.push('EXAMPLES:');
  lines.push('  curl http://localhost:8766/dashboard/view/resources');
  lines.push('  curl "http://localhost:8766/dashboard/view/population?session=latest"');
  lines.push('  curl "http://localhost:8766/dashboard/view/agent-info?entity=abc123"');

  return lines.join('\n');
}

/**
 * Check if a path matches a view endpoint
 */
export function isViewEndpoint(path: string): boolean {
  return path.startsWith('/dashboard/view/');
}

/**
 * Extract view ID from endpoint path
 */
export function extractViewId(path: string): string {
  return path.replace('/dashboard/view/', '').split('?')[0];
}
```

### 2. Integrate with metrics-server.ts

Add view endpoint handling to the HTTP router:

```typescript
// Add to scripts/metrics-server.ts

import {
  handleViewEndpoint,
  generateViewsIndex,
  isViewEndpoint,
  extractViewId,
} from './view-endpoints.js';

// In the HTTP request handler, add these routes:

// View index endpoint
if (pathname === '/dashboard/views' || pathname === '/dashboard/view') {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(generateViewsIndex());
  return;
}

// Individual view endpoints
if (isViewEndpoint(pathname)) {
  const viewId = extractViewId(pathname);

  await handleViewEndpoint(viewId, query, {
    getWorld: () => getActiveGameWorld(),
    getSessionMetrics: (id) => getSessionMetrics(id),
    getLatestSessionId: () => getLatestSession()?.id || null,
  }, res);
  return;
}

// Update the main dashboard to include link to views
// (in the existing dashboard text output)
```

### 3. Update Main Dashboard Output

Add views section to the main dashboard endpoint:

```typescript
// In the dashboard rendering, add a section:

function addViewsSection(lines: string[]): void {
  const views = viewRegistry.getTextViews();

  if (views.length === 0) return;

  lines.push('');
  lines.push('UNIFIED VIEWS');
  lines.push('─'.repeat(40));
  lines.push('');
  lines.push('Access any of these views via:');
  lines.push('  curl http://localhost:8766/dashboard/view/<id>');
  lines.push('');

  for (const view of views.slice(0, 5)) { // Show first 5
    lines.push(`  • ${view.id}: ${view.title}`);
  }

  if (views.length > 5) {
    lines.push(`  ... and ${views.length - 5} more`);
  }

  lines.push('');
  lines.push('See all views: curl http://localhost:8766/dashboard/views');
}
```

### 4. Register Core Views on Server Start

Ensure views are registered when the metrics server starts:

```typescript
// At the top of metrics-server.ts after imports

import { viewRegistry } from '../packages/core/src/dashboard/index.js';
import {
  ResourcesView,
  PopulationView,
  WeatherView
} from '../packages/core/src/dashboard/views/index.js';

// Register all views (if not already registered)
function registerCoreViews(): void {
  const views = [ResourcesView, PopulationView, WeatherView];

  for (const view of views) {
    if (!viewRegistry.has(view.id)) {
      viewRegistry.register(view);
    }
  }

  console.log(`[${new Date().toISOString()}] Registered ${views.length} dashboard views`);
}

// Call on startup
registerCoreViews();
```

---

## Files to Create/Modify

**Create:**
- `scripts/view-endpoints.ts` (or inline in metrics-server.ts)

**Modify:**
- `scripts/metrics-server.ts` - Add view endpoint handling

---

## Tests Required

### Manual Testing (curl)

After implementation, verify with curl:

```bash
# List all views
curl http://localhost:8766/dashboard/views

# Access resources view (requires running game)
curl http://localhost:8766/dashboard/view/resources

# Access population with session
curl "http://localhost:8766/dashboard/view/population?session=latest"

# Access with detail level
curl "http://localhost:8766/dashboard/view/resources?detail=verbose"

# Try non-existent view (should show help)
curl http://localhost:8766/dashboard/view/nonexistent

# Try canvas-only view (should show error)
# (if any exist)
```

### Unit Tests

Create `scripts/__tests__/view-endpoints.test.ts`:

1. **View Context Building**
   - buildViewContext extracts session ID correctly
   - buildViewContext extracts entity ID correctly
   - buildViewContext handles "latest" session
   - buildViewContext includes all query params

2. **View Index Generation**
   - generateViewsIndex shows all text views
   - generateViewsIndex marks liveOnly views
   - generateViewsIndex marks historicalOnly views
   - generateViewsIndex shows keyboard shortcuts

3. **Endpoint Matching**
   - isViewEndpoint matches /dashboard/view/xxx
   - isViewEndpoint doesn't match /dashboard/xxx
   - extractViewId extracts ID correctly
   - extractViewId handles query strings

---

## Acceptance Criteria

1. `curl http://localhost:8766/dashboard/views` shows all registered views
2. `curl http://localhost:8766/dashboard/view/{id}` returns view data
3. Views respect liveOnly constraint (503 if no game)
4. Views respect historicalOnly (work with session data)
5. Error messages are helpful and include available options
6. Main dashboard links to view system
7. Build passes: `npm run build`

---

## Endpoint Documentation

After implementation, the following endpoints are available:

| Endpoint | Description |
|----------|-------------|
| `GET /dashboard/views` | List all available views with descriptions |
| `GET /dashboard/view/{id}` | Get data for specific view |
| `GET /dashboard/view/{id}?session=latest` | Use latest session data |
| `GET /dashboard/view/{id}?session={id}` | Use specific session data |
| `GET /dashboard/view/{id}?entity={id}` | Select specific entity |
| `GET /dashboard/view/{id}?detail=verbose` | Verbose output |

---

## Implementation Notes

- Views may need both world AND session metrics (for historical comparison)
- Handle async getData gracefully - await the promise
- Error messages should guide users to correct usage
- Consider rate limiting for expensive views
- The getWorld() function should return null if no game connected, not throw

---

## Backward Compatibility

Existing endpoints (`/dashboard`, `/dashboard/agents`, etc.) remain unchanged.
The new view system runs alongside existing endpoints.
Old endpoints can gradually delegate to views in Phase 4.

---

## Out of Scope

- Migrating existing endpoints to use views (Phase 4)
- Player UI integration (Phase 2)
- WebSocket-based real-time view updates
- Authentication/authorization
