# Work Order: Unified Dashboard - Phase 2: Player UI Integration

## Overview

Integrate the ViewRegistry with the existing WindowManager to enable automatic registration of dashboard views as canvas panels. This phase creates the `ViewAdapter` that bridges view definitions to the existing window system.

**Spec Reference:** `custom_game_engine/specs/unified-dashboard-system.md`

**Dependencies:** Phase 1 (Core Infrastructure)

**Blocked By:** Phase 1

**Blocks:** Phase 4 (Migration - partially, can start while this runs)

---

## Deliverables

### 1. Create ViewAdapter (`packages/renderer/src/adapters/ViewAdapter.ts`)

Bridge between `DashboardView` and `IWindowPanel`:

```typescript
import type { DashboardView, ViewData, ViewContext, ViewState, RenderBounds } from '@ai-village/core';
import type { IWindowPanel } from '../types/WindowTypes.js';
import type { World } from '@ai-village/core';
import { defaultTheme } from '@ai-village/core';

/**
 * Adapts a DashboardView to the IWindowPanel interface for WindowManager.
 */
export class ViewAdapter<TData extends ViewData> implements IWindowPanel {
  private view: DashboardView<TData>;
  private visible: boolean = false;
  private state: ViewState;
  private cachedData: TData | null = null;
  private lastDataFetch: number = 0;
  private readonly CACHE_TTL_MS = 100; // Refresh data every 100ms max

  constructor(view: DashboardView<TData>) {
    if (!view) {
      throw new Error('ViewAdapter requires a view');
    }
    if (!view.id) {
      throw new Error('View must have an id');
    }
    if (!view.title) {
      throw new Error('View must have a title');
    }

    this.view = view;
    this.state = view.createInitialState?.() ?? {};
  }

  getId(): string {
    return this.view.id;
  }

  getTitle(): string {
    return this.view.title;
  }

  getDefaultWidth(): number {
    return this.view.defaultSize?.width ?? 300;
  }

  getDefaultHeight(): number {
    return this.view.defaultSize?.height ?? 200;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      // Clear cache when hidden
      this.cachedData = null;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: World
  ): void {
    if (!this.visible || !world) {
      return;
    }

    // Check if we have a canvas renderer
    if (!this.view.canvasRenderer) {
      // Render text fallback
      this.renderTextFallback(ctx, x, y, width, height, world);
      return;
    }

    // Fetch data (with caching)
    const data = this.getDataSync(world);
    if (!data) {
      this.renderLoading(ctx, x, y, width, height);
      return;
    }

    // Render using view's canvas renderer
    const bounds: RenderBounds = { x, y, width, height };
    this.view.canvasRenderer(ctx, data, bounds, defaultTheme);
  }

  handleScroll?(deltaY: number, contentHeight: number): boolean {
    if (this.view.handleScroll && this.state) {
      return this.view.handleScroll(deltaY, contentHeight, this.state);
    }
    return false;
  }

  handleContentClick?(x: number, y: number, width: number, height: number): boolean {
    if (this.view.handleClick && this.cachedData) {
      const bounds: RenderBounds = { x: 0, y: 0, width, height };
      return this.view.handleClick(x, y, bounds, this.cachedData);
    }
    return false;
  }

  /**
   * Get the underlying view definition
   */
  getView(): DashboardView<TData> {
    return this.view;
  }

  /**
   * Get the current view state
   */
  getState(): ViewState {
    return this.state;
  }

  /**
   * Set context for entity-specific views
   */
  setSelectedEntity(entityId: string | undefined): void {
    this.state.selectedEntityId = entityId;
    this.cachedData = null; // Invalidate cache
  }

  private getDataSync(world: World): TData | null {
    const now = Date.now();

    // Return cached data if fresh
    if (this.cachedData && (now - this.lastDataFetch) < this.CACHE_TTL_MS) {
      return this.cachedData;
    }

    // Build context
    const context: ViewContext = {
      world,
      selectedEntityId: this.state.selectedEntityId as string | undefined,
      params: {},
    };

    // Get data (handle both sync and async)
    const result = this.view.getData(context);

    if (result instanceof Promise) {
      // For async, use cached data until promise resolves
      result.then(data => {
        this.cachedData = data;
        this.lastDataFetch = Date.now();
      });
      return this.cachedData;
    }

    // Sync result
    this.cachedData = result;
    this.lastDataFetch = now;
    return result;
  }

  private renderTextFallback(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world: World
  ): void {
    // If view has textFormatter but no canvasRenderer, render text
    if (!this.view.textFormatter) {
      this.renderUnavailable(ctx, x, y, width, height, 'View has no renderer');
      return;
    }

    const data = this.getDataSync(world);
    if (!data) {
      this.renderLoading(ctx, x, y, width, height);
      return;
    }

    const text = this.view.textFormatter(data);
    const lines = text.split('\n');

    ctx.font = defaultTheme.fonts.normal;
    ctx.fillStyle = defaultTheme.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padding = defaultTheme.spacing.padding;
    const lineHeight = defaultTheme.spacing.lineHeight;
    let currentY = y + padding;

    for (const line of lines) {
      if (currentY + lineHeight > y + height - padding) break;
      ctx.fillText(line, x + padding, currentY);
      currentY += lineHeight;
    }
  }

  private renderLoading(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.font = defaultTheme.fonts.normal;
    ctx.fillStyle = defaultTheme.colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', x + width / 2, y + height / 2);
  }

  private renderUnavailable(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    reason: string
  ): void {
    ctx.font = defaultTheme.fonts.normal;
    ctx.fillStyle = defaultTheme.colors.error;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(reason, x + width / 2, y + height / 2);
  }
}

/**
 * Factory function to create ViewAdapter
 */
export function createViewAdapter<TData extends ViewData>(
  view: DashboardView<TData>
): ViewAdapter<TData> {
  return new ViewAdapter(view);
}
```

### 2. Extend WindowManager

Add methods to WindowManager for view registration:

```typescript
// Add to packages/renderer/src/WindowManager.ts

import { viewRegistry, type DashboardView } from '@ai-village/core';
import { ViewAdapter, createViewAdapter } from './adapters/ViewAdapter.js';

// Add these methods to WindowManager class:

/**
 * Register a view from the ViewRegistry.
 * Automatically creates adapter and configures window.
 */
registerFromView(view: DashboardView, configOverrides?: Partial<WindowConfig>): void {
  // Skip views that are historical-only or have no canvas support
  if (view.historicalOnly) {
    return;
  }

  // Check if already registered
  if (this.windows.has(view.id)) {
    throw new Error(`Window '${view.id}' already registered`);
  }

  // Create adapter
  const adapter = createViewAdapter(view);

  // Build config
  const config: WindowConfig = {
    defaultX: 10,
    defaultY: 10,
    defaultWidth: view.defaultSize?.width ?? 300,
    defaultHeight: view.defaultSize?.height ?? 200,
    minWidth: view.defaultSize?.minWidth,
    minHeight: view.defaultSize?.minHeight,
    isDraggable: true,
    isResizable: true,
    showInWindowList: true,
    keyboardShortcut: view.keyboardShortcut,
    menuCategory: view.category,
    ...configOverrides,
  };

  this.registerWindow(view.id, adapter, config);
}

/**
 * Register all views from the global registry that have canvas support.
 * Skips views that are already registered.
 */
registerAllViews(configMap?: Record<string, Partial<WindowConfig>>): void {
  for (const view of viewRegistry.getCanvasViews()) {
    if (this.windows.has(view.id)) {
      continue; // Skip already registered
    }

    if (view.historicalOnly) {
      continue; // Skip historical-only views
    }

    const overrides = configMap?.[view.id];
    this.registerFromView(view, overrides);
  }
}

/**
 * Check if a view is registered
 */
hasView(viewId: string): boolean {
  return this.windows.has(viewId);
}
```

### 3. Update Adapters Index

Add ViewAdapter export to `packages/renderer/src/adapters/index.ts`:

```typescript
// Add to existing exports
export { ViewAdapter, createViewAdapter } from './ViewAdapter.js';
```

### 4. Create Integration Example

Create a demonstration file showing how to use the new system alongside existing panels:

```typescript
// packages/renderer/src/__tests__/ViewIntegration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { viewRegistry, ResourcesView, PopulationView } from '@ai-village/core';
import { WindowManager } from '../WindowManager.js';
import { createViewAdapter } from '../adapters/ViewAdapter.js';

describe('View Integration', () => {
  beforeEach(() => {
    // Clear registry between tests
    // (You may need to add a clear() method to ViewRegistry for testing)
  });

  it('should create adapter from view definition', () => {
    const adapter = createViewAdapter(ResourcesView);

    expect(adapter.getId()).toBe('resources');
    expect(adapter.getTitle()).toBe('Village Stockpile');
    expect(adapter.getDefaultWidth()).toBe(250);
  });

  it('should register view with WindowManager', () => {
    const canvas = document.createElement('canvas');
    const windowManager = new WindowManager(canvas);

    windowManager.registerFromView(ResourcesView);

    expect(windowManager.hasView('resources')).toBe(true);
  });

  it('should register all views from registry', () => {
    // Register views
    viewRegistry.register(ResourcesView);
    viewRegistry.register(PopulationView);

    const canvas = document.createElement('canvas');
    const windowManager = new WindowManager(canvas);

    windowManager.registerAllViews();

    expect(windowManager.hasView('resources')).toBe(true);
    expect(windowManager.hasView('population')).toBe(true);
  });

  it('should not register historical-only views', () => {
    const historicalView = {
      id: 'session-analysis',
      title: 'Session Analysis',
      category: 'dev' as const,
      historicalOnly: true,
      getData: () => ({ timestamp: Date.now(), available: true }),
      textFormatter: (data) => 'text',
    };

    viewRegistry.register(historicalView);

    const canvas = document.createElement('canvas');
    const windowManager = new WindowManager(canvas);

    windowManager.registerAllViews();

    expect(windowManager.hasView('session-analysis')).toBe(false);
  });
});
```

---

## Files to Create/Modify

**Create:**
- `packages/renderer/src/adapters/ViewAdapter.ts`
- `packages/renderer/src/__tests__/ViewIntegration.test.ts`

**Modify:**
- `packages/renderer/src/WindowManager.ts` - Add registration methods
- `packages/renderer/src/adapters/index.ts` - Export ViewAdapter

---

## Tests Required

1. **ViewAdapter Tests**
   - Constructor validates view has id and title
   - getId() returns view id
   - getTitle() returns view title
   - getDefaultWidth/Height() returns view defaults
   - isVisible/setVisible work correctly
   - render() calls view's canvasRenderer if available
   - render() falls back to textFormatter if no canvasRenderer
   - handleScroll delegates to view if available
   - handleContentClick delegates to view if available

2. **WindowManager Integration Tests**
   - registerFromView() creates and registers adapter
   - registerFromView() throws on duplicate id
   - registerFromView() skips historicalOnly views
   - registerAllViews() registers all canvas views
   - registerAllViews() respects config overrides
   - hasView() returns correct boolean

3. **Rendering Tests**
   - ViewAdapter renders data correctly
   - ViewAdapter shows loading state while fetching
   - ViewAdapter shows unavailable message when appropriate
   - Data is cached and refreshed appropriately

---

## Acceptance Criteria

1. ViewAdapter fully implements IWindowPanel interface
2. WindowManager can register views from ViewRegistry
3. Views render correctly in the game window
4. Existing panels continue to work unchanged
5. All tests pass
6. Build passes: `npm run build`

---

## Implementation Notes

- ViewAdapter must handle both sync and async getData()
- Data caching prevents re-fetching every frame (100ms TTL recommended)
- Entity-specific views need selectedEntityId in state
- The theme should be imported from core, not duplicated
- Fallback to text rendering if no canvasRenderer is simpler than requiring one

---

## Demo Integration (Optional)

If time permits, update `demo/src/main.ts` to demonstrate hybrid registration:

```typescript
// Register example views from ViewRegistry
windowManager.registerAllViews({
  'resources': {
    defaultX: logicalWidth - 260,
    defaultY: 10,
  },
});

// Continue registering existing panels the old way
windowManager.registerWindow('agent-info', agentInfoAdapter, { ... });
```

This shows backward compatibility and gradual migration path.

---

## Out of Scope

- Migrating existing panels to view definitions (Phase 4)
- LLM dashboard integration (Phase 3)
- Advanced canvas rendering in views (panels can use existing renderers)
