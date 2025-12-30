# Unified Dashboard System

## Overview

This spec defines a **unified view definition layer** that allows both the Player UI (canvas-based) and LLM Dashboard (HTTP/curl-based) to consume the same view definitions. When a new system is added to the game, defining a single `DashboardView` automatically exposes it to both dashboards.

## Problem Statement

Currently, the codebase maintains two completely separate dashboard systems:

1. **Player UI** (`packages/renderer/`): 26+ canvas-based panels with individual implementations
2. **LLM Dashboard** (`scripts/metrics-server.ts`): ~3700 lines of HTTP endpoints for curl/LLM consumption

Adding a new system requires:
- Creating a panel class
- Creating an adapter config
- Registering in main.ts
- Adding HTTP endpoints in metrics-server.ts
- Adding data formatters

This duplication leads to:
- Maintenance burden
- Inconsistent data between dashboards
- Drift between what player sees and what LLM can query
- Slow iteration on new features

## Goals

1. **Single Source of Truth**: Define views once, render everywhere
2. **Auto-Registration**: New views automatically appear in both dashboards
3. **Type Safety**: Shared data model with TypeScript interfaces
4. **Gradual Migration**: Existing panels can be wrapped incrementally
5. **Flexibility**: Views can opt-out of either dashboard (canvas-only, text-only)

## Non-Goals

- Replacing the existing WindowManager infrastructure
- Changing how panels look or behave
- Real-time synchronization between dashboards (they serve different purposes)
- GraphQL or complex query language

---

## Architecture

### Core Concept: View Definition

A `DashboardView` is a declarative specification of what data to show and how to render it:

```
┌─────────────────────────────────────────────────────────────┐
│                     DashboardView                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Metadata   │  │   Data      │  │    Renderers        │ │
│  │             │  │  Provider   │  │                     │ │
│  │ id, title,  │  │             │  │ textFormatter()     │ │
│  │ category,   │  │ getData()   │  │ canvasRenderer()    │ │
│  │ shortcuts   │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌───────────────┐ ┌───────────┐ ┌────────────────┐
      │  WindowManager │ │  HTTP     │ │  Future:       │
      │  (Canvas UI)   │ │  Server   │ │  Mobile, etc.  │
      └───────────────┘ └───────────┘ └────────────────┘
```

### Data Flow

```
Game World (ECS)
      │
      ▼
┌─────────────────────┐
│   ViewRegistry      │◄──── Registers all DashboardViews
└─────────────────────┘
      │
      ├──── Player UI Request ─────► getData() ──► canvasRenderer()
      │                                   │
      └──── HTTP Request ──────────► getData() ──► textFormatter()
```

---

## Type Definitions

### Core Interfaces

```typescript
// packages/core/src/dashboard/types.ts

import type { World } from '../ecs/World.js';
import type { WindowMenuCategory } from '../../renderer/src/types/WindowTypes.js';

/**
 * Base data returned by all view data providers.
 * Views extend this with their specific data shape.
 */
export interface ViewData {
  /** Timestamp when data was collected */
  timestamp: number;
  /** Whether the data source is currently available */
  available: boolean;
  /** Optional message if data is unavailable */
  unavailableReason?: string;
}

/**
 * Context passed to data providers
 */
export interface ViewContext {
  /** Current game world (for live queries) */
  world: World;
  /** Session metrics (for historical data) */
  sessionMetrics?: StoredMetric[];
  /** Selected entity ID (if applicable) */
  selectedEntityId?: string;
  /** Additional context parameters */
  params?: Record<string, unknown>;
}

/**
 * Options for text formatting
 */
export interface TextFormatOptions {
  /** Maximum width in characters (for wrapping) */
  maxWidth?: number;
  /** Whether to include ANSI colors */
  useColors?: boolean;
  /** Detail level */
  detail?: 'minimal' | 'normal' | 'verbose';
}

/**
 * Render bounds for canvas rendering
 */
export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Core view definition interface
 */
export interface DashboardView<TData extends ViewData = ViewData> {
  /** Unique identifier for the view */
  id: string;

  /** Display title shown in UI */
  title: string;

  /** Menu category for organization */
  category: WindowMenuCategory;

  /** Optional keyboard shortcut (e.g., 'R' for resources) */
  keyboardShortcut?: string;

  /** Description shown in help/tooltips */
  description?: string;

  /**
   * Fetch data for this view.
   * Called by both dashboards before rendering.
   */
  getData(context: ViewContext): TData | Promise<TData>;

  /**
   * Format data as text for LLM/curl dashboard.
   * If not provided, view is canvas-only.
   */
  textFormatter?: (data: TData, options?: TextFormatOptions) => string;

  /**
   * Render data to canvas for player UI.
   * If not provided, view is text-only.
   */
  canvasRenderer?: (
    ctx: CanvasRenderingContext2D,
    data: TData,
    bounds: RenderBounds,
    theme: RenderTheme
  ) => void;

  /**
   * Whether this view requires a live game connection.
   * If true, won't appear in historical session analysis.
   */
  liveOnly?: boolean;

  /**
   * Whether this view is for historical analysis only.
   * If true, won't appear in player UI.
   */
  historicalOnly?: boolean;

  /**
   * Default window dimensions for canvas rendering
   */
  defaultSize?: {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
  };

  /**
   * Optional scroll handler for canvas rendering
   */
  handleScroll?: (deltaY: number, contentHeight: number, state: ViewState) => boolean;

  /**
   * Optional click handler for canvas rendering
   */
  handleClick?: (x: number, y: number, bounds: RenderBounds, data: TData) => boolean;

  /**
   * Optional state for interactive views (scroll position, selections, etc.)
   */
  createInitialState?: () => ViewState;
}

/**
 * Mutable state for interactive views
 */
export interface ViewState {
  scrollOffset?: number;
  selectedIndex?: number;
  expandedSections?: Set<string>;
  [key: string]: unknown;
}

/**
 * Theme for canvas rendering (colors, fonts, etc.)
 */
export interface RenderTheme {
  colors: {
    background: string;
    text: string;
    textMuted: string;
    accent: string;
    warning: string;
    error: string;
    success: string;
    border: string;
  };
  fonts: {
    normal: string;
    bold: string;
    monospace: string;
  };
  spacing: {
    padding: number;
    lineHeight: number;
    sectionGap: number;
  };
}
```

### View Registry

```typescript
// packages/core/src/dashboard/ViewRegistry.ts

import type { DashboardView, ViewData } from './types.js';

/**
 * Central registry for all dashboard views.
 * Both dashboards consume views from this registry.
 */
export class ViewRegistry {
  private views = new Map<string, DashboardView>();
  private listeners = new Set<() => void>();

  /**
   * Register a view definition.
   * @throws Error if view with same ID already exists
   */
  register<TData extends ViewData>(view: DashboardView<TData>): void {
    if (this.views.has(view.id)) {
      throw new Error(`View with id '${view.id}' already registered`);
    }
    this.views.set(view.id, view as DashboardView);
    this.notifyListeners();
  }

  /**
   * Get a view by ID.
   * @throws Error if view not found
   */
  get<TData extends ViewData = ViewData>(id: string): DashboardView<TData> {
    const view = this.views.get(id);
    if (!view) {
      throw new Error(`View '${id}' not found in registry`);
    }
    return view as DashboardView<TData>;
  }

  /**
   * Check if a view exists
   */
  has(id: string): boolean {
    return this.views.has(id);
  }

  /**
   * Get all registered views
   */
  getAll(): DashboardView[] {
    return Array.from(this.views.values());
  }

  /**
   * Get views by category
   */
  getByCategory(category: string): DashboardView[] {
    return this.getAll().filter(v => v.category === category);
  }

  /**
   * Get views that have text formatters (for LLM dashboard)
   */
  getTextViews(): DashboardView[] {
    return this.getAll().filter(v => v.textFormatter !== undefined);
  }

  /**
   * Get views that have canvas renderers (for player UI)
   */
  getCanvasViews(): DashboardView[] {
    return this.getAll().filter(v => v.canvasRenderer !== undefined);
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Global singleton registry */
export const viewRegistry = new ViewRegistry();
```

---

## Example View Definitions

### Resources View

```typescript
// packages/core/src/dashboard/views/ResourcesView.ts

import type { DashboardView, ViewData, ViewContext, RenderBounds, RenderTheme } from '../types.js';
import type { BuildingComponent, InventoryComponent } from '../../components/index.js';

export interface ResourcesViewData extends ViewData {
  resources: Record<string, number>;
  storageInfo: {
    buildingCount: number;
    usedSlots: number;
    totalSlots: number;
  } | null;
}

export const ResourcesView: DashboardView<ResourcesViewData> = {
  id: 'resources',
  title: 'Village Stockpile',
  category: 'economy',
  keyboardShortcut: 'R',
  description: 'Shows resources stored in village storage buildings',

  defaultSize: {
    width: 250,
    height: 200,
    minWidth: 200,
    minHeight: 150,
  },

  getData(context: ViewContext): ResourcesViewData {
    const { world } = context;

    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'World not available',
        resources: {},
        storageInfo: null,
      };
    }

    const resources: Record<string, number> = {};
    let buildingCount = 0;
    let usedSlots = 0;
    let totalSlots = 0;

    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .executeEntities();

    for (const storage of storageBuildings) {
      const building = storage.components.get('building') as BuildingComponent | undefined;
      const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      buildingCount++;

      if (inventory?.slots) {
        totalSlots += inventory.maxSlots || inventory.slots.length;
        for (const slot of inventory.slots) {
          if (slot.itemId && slot.quantity > 0) {
            resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
            usedSlots++;
          }
        }
      }
    }

    return {
      timestamp: Date.now(),
      available: true,
      resources,
      storageInfo: buildingCount > 0 ? { buildingCount, usedSlots, totalSlots } : null,
    };
  },

  textFormatter(data: ResourcesViewData): string {
    if (!data.available) {
      return `VILLAGE STOCKPILE\n${'='.repeat(40)}\n\n${data.unavailableReason}`;
    }

    const lines = [
      'VILLAGE STOCKPILE',
      '='.repeat(40),
      '',
    ];

    if (Object.keys(data.resources).length === 0) {
      lines.push('No resources stored.');
      lines.push('Build storage buildings to store resources.');
    } else {
      const sorted = Object.entries(data.resources).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [item, qty] of sorted) {
        lines.push(`  ${item}: ${qty}`);
      }
    }

    if (data.storageInfo) {
      lines.push('');
      lines.push(`Storage: ${data.storageInfo.buildingCount} building(s)`);
      lines.push(`Capacity: ${data.storageInfo.usedSlots}/${data.storageInfo.totalSlots} slots`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: ResourcesViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (Object.keys(data.resources).length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No storage or empty stockpile', x + padding, currentY);
      return;
    }

    const sorted = Object.entries(data.resources).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [itemId, quantity] of sorted) {
      const icon = getResourceIcon(itemId);
      const color = getResourceColor(itemId, theme);

      ctx.fillStyle = color;
      ctx.fillText(`${icon} ${itemId}: ${quantity}`, x + padding, currentY);
      currentY += lineHeight;
    }

    if (data.storageInfo) {
      currentY += 5;
      ctx.fillStyle = theme.colors.textMuted;
      ctx.font = '12px monospace';
      ctx.fillText(
        `${data.storageInfo.buildingCount} storage(s) - ${data.storageInfo.usedSlots}/${data.storageInfo.totalSlots} slots`,
        x + padding,
        currentY
      );
    }
  },
};

function getResourceIcon(itemId: string): string {
  if (itemId === 'wood') return '🪵';
  if (itemId === 'stone') return '🪨';
  if (itemId === 'food') return '🍎';
  if (itemId === 'water') return '💧';
  if (itemId.includes('seed')) return '🌰';
  return '📦';
}

function getResourceColor(itemId: string, theme: RenderTheme): string {
  if (itemId === 'wood') return '#8B4513';
  if (itemId === 'stone') return '#808080';
  if (itemId === 'food') return '#90EE90';
  if (itemId === 'water') return '#4169E1';
  return theme.colors.text;
}
```

### Agent Info View (Entity-Specific)

```typescript
// packages/core/src/dashboard/views/AgentInfoView.ts

import type { DashboardView, ViewData, ViewContext } from '../types.js';

export interface AgentInfoViewData extends ViewData {
  agent: {
    id: string;
    name: string;
    age: number;
    generation: number;
    behavior: string;
    health: number;
    hunger: number;
    energy: number;
    position: { x: number; y: number };
    inventory: { itemId: string; quantity: number }[];
  } | null;
}

export const AgentInfoView: DashboardView<AgentInfoViewData> = {
  id: 'agent-info',
  title: 'Agent Details',
  category: 'info',
  keyboardShortcut: 'A',
  description: 'Shows detailed information about the selected agent',
  liveOnly: true, // Requires running game

  defaultSize: {
    width: 360,
    height: 530,
    minWidth: 300,
    minHeight: 400,
  },

  getData(context: ViewContext): AgentInfoViewData {
    const { world, selectedEntityId } = context;

    if (!selectedEntityId || !world) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'No agent selected',
        agent: null,
      };
    }

    const entity = world.getEntity(selectedEntityId);
    if (!entity) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Agent ${selectedEntityId} not found`,
        agent: null,
      };
    }

    const agent = entity.getComponent('agent');
    const position = entity.getComponent('position');
    const needs = entity.getComponent('needs');
    const inventory = entity.getComponent('inventory');

    if (!agent) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Entity is not an agent',
        agent: null,
      };
    }

    return {
      timestamp: Date.now(),
      available: true,
      agent: {
        id: entity.id,
        name: agent.name || 'Unknown',
        age: agent.age || 0,
        generation: agent.generation || 0,
        behavior: agent.currentBehavior || 'idle',
        health: needs?.health ?? 100,
        hunger: needs?.hunger ?? 100,
        energy: needs?.energy ?? 100,
        position: position ? { x: position.x, y: position.y } : { x: 0, y: 0 },
        inventory: inventory?.slots?.filter(s => s.itemId && s.quantity > 0) || [],
      },
    };
  },

  textFormatter(data: AgentInfoViewData): string {
    if (!data.available || !data.agent) {
      return `AGENT INFO\n${'='.repeat(40)}\n\n${data.unavailableReason}`;
    }

    const { agent } = data;
    const lines = [
      'AGENT INFO',
      '='.repeat(40),
      '',
      `Name: ${agent.name}`,
      `ID: ${agent.id}`,
      `Age: ${agent.age} | Generation: ${agent.generation}`,
      '',
      `Current Behavior: ${agent.behavior}`,
      `Position: (${agent.position.x.toFixed(1)}, ${agent.position.y.toFixed(1)})`,
      '',
      'NEEDS:',
      `  Health: ${agent.health.toFixed(0)}%`,
      `  Hunger: ${agent.hunger.toFixed(0)}%`,
      `  Energy: ${agent.energy.toFixed(0)}%`,
    ];

    if (agent.inventory.length > 0) {
      lines.push('');
      lines.push('INVENTORY:');
      for (const slot of agent.inventory) {
        lines.push(`  ${slot.itemId}: ${slot.quantity}`);
      }
    }

    return lines.join('\n');
  },

  // Canvas renderer would be more complex - omitted for brevity
  // In practice, this would delegate to existing AgentInfoPanel rendering
};
```

---

## Integration Points

### Player UI Integration

The WindowManager will accept `DashboardView` definitions and auto-generate adapters:

```typescript
// packages/renderer/src/WindowManager.ts (additions)

import { viewRegistry, type DashboardView } from '@ai-village/core';

class WindowManager {
  /**
   * Register a view from the ViewRegistry.
   * Automatically creates adapter and configures window.
   */
  registerFromView(view: DashboardView, configOverrides?: Partial<WindowConfig>): void {
    if (!view.canvasRenderer) {
      // View is text-only, skip canvas registration
      return;
    }

    // Create adapter from view definition
    const adapter = new ViewAdapter(view);

    // Merge default config with view defaults and overrides
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
   * Auto-register all views from registry that have canvas renderers
   */
  registerAllViews(): void {
    for (const view of viewRegistry.getCanvasViews()) {
      if (!this.windows.has(view.id)) {
        this.registerFromView(view);
      }
    }
  }
}
```

### LLM Dashboard Integration

The metrics server will auto-generate HTTP endpoints from view definitions:

```typescript
// scripts/metrics-server.ts (additions)

import { viewRegistry, type DashboardView, type ViewContext } from '../packages/core/src/dashboard/index.js';

/**
 * Register HTTP endpoints for all text-capable views
 */
function registerViewEndpoints(): void {
  for (const view of viewRegistry.getTextViews()) {
    // Register endpoint: GET /dashboard/{view.id}
    httpRoutes.set(`/dashboard/${view.id}`, async (req, res, query) => {
      const context = buildViewContext(query);
      const data = await view.getData(context);
      const text = view.textFormatter!(data);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(text);
    });
  }
}

/**
 * Generate index of all available view endpoints
 */
function generateViewIndex(): string {
  const lines = [
    'DASHBOARD VIEWS',
    '='.repeat(40),
    '',
    'Available endpoints:',
    '',
  ];

  for (const view of viewRegistry.getTextViews()) {
    lines.push(`  GET /dashboard/${view.id}`);
    lines.push(`      ${view.title}`);
    if (view.description) {
      lines.push(`      ${view.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildViewContext(query: URLSearchParams): ViewContext {
  const sessionId = query.get('session');
  const entityId = query.get('entity') || query.get('id');

  return {
    world: getActiveGameWorld(), // From live connection
    sessionMetrics: sessionId ? getSessionMetrics(sessionId) : undefined,
    selectedEntityId: entityId || undefined,
    params: Object.fromEntries(query.entries()),
  };
}
```

---

## Migration Strategy

### Phase 1: Foundation (No Breaking Changes)
1. Create `packages/core/src/dashboard/` directory
2. Implement `ViewRegistry` and types
3. Create 2-3 example view definitions (Resources, Agent Info, Population)
4. Export from `@ai-village/core`

### Phase 2: Player UI Integration
1. Create `ViewAdapter` that wraps `DashboardView` as `IWindowPanel`
2. Add `registerFromView()` to WindowManager
3. Register example views alongside existing panels
4. Verify rendering matches

### Phase 3: LLM Dashboard Integration
1. Add view endpoint auto-generation to metrics-server
2. Create `/dashboard/views` index endpoint
3. Test curl access to view endpoints
4. Ensure data consistency with existing endpoints

### Phase 4: Panel Migration
1. Convert existing panels to view definitions one-by-one
2. Delete old panel classes as they're migrated
3. Update main.ts registration
4. Remove redundant code from metrics-server

### Phase 5: Polish
1. Add view hot-reloading for development
2. Implement view state persistence
3. Add view documentation generation
4. Performance optimization

---

## File Structure

```
packages/core/src/dashboard/
├── index.ts                    # Public exports
├── types.ts                    # Core interfaces
├── ViewRegistry.ts             # Singleton registry
├── ViewAdapter.ts              # Wraps view for WindowManager
├── theme.ts                    # Default render theme
└── views/
    ├── index.ts                # All view exports
    ├── ResourcesView.ts
    ├── AgentInfoView.ts
    ├── PopulationView.ts
    ├── EconomyView.ts
    ├── SocialView.ts
    └── ... (one file per view)
```

---

## Testing Strategy

### Unit Tests
- ViewRegistry add/get/query operations
- Each view's getData() with mock world
- Each view's textFormatter() output format
- ViewAdapter implementation of IWindowPanel

### Integration Tests
- Views render correctly in WindowManager
- HTTP endpoints return correct format
- Live data queries work with real world
- Session data queries work with stored metrics

### Visual Tests
- Canvas rendering matches existing panels
- Text output is curl-friendly and readable

---

## Success Criteria

1. **Adding a new view takes < 5 minutes**: Single file, register, done
2. **Both dashboards show same data**: Consistency guaranteed by shared getData()
3. **No regression in existing panels**: Migration is gradual and safe
4. **LLM can discover views**: `/dashboard/views` lists all available
5. **Type safety throughout**: TypeScript catches data shape mismatches

---

## Open Questions

1. **State Management**: Should view state (scroll, selections) be managed by view or adapter?
   - Recommendation: Views create initial state, adapter manages mutations

2. **Async Data**: Should getData() be sync or async?
   - Recommendation: Support both (return Promise or value)

3. **Caching**: Should views cache their data?
   - Recommendation: No caching in views; let consumers cache if needed

4. **Entity-Specific Views**: How to handle views that need a selected entity?
   - Recommendation: Pass `selectedEntityId` in ViewContext; view returns unavailable if missing

5. **Historical vs Live**: Some views need live world, others analyze stored metrics
   - Recommendation: `liveOnly` and `historicalOnly` flags; views declare their requirements
