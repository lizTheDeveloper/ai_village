# Work Order: Unified Dashboard - Phase 1: Core Infrastructure

## Overview

Implement the foundational types, interfaces, and ViewRegistry for the unified dashboard system. This phase creates the core abstractions that both dashboards will consume, without modifying any existing code.

**Spec Reference:** `custom_game_engine/specs/unified-dashboard-system.md`

**Dependencies:** None (can run in parallel with nothing)

**Blocked By:** Nothing

**Blocks:** Phase 2 (Player UI), Phase 3 (LLM Dashboard)

---

## Deliverables

### 1. Create Dashboard Types (`packages/core/src/dashboard/types.ts`)

Implement the core TypeScript interfaces:

```typescript
// Required interfaces
export interface ViewData {
  timestamp: number;
  available: boolean;
  unavailableReason?: string;
}

export interface ViewContext {
  world: World;
  sessionMetrics?: StoredMetric[];
  selectedEntityId?: string;
  params?: Record<string, unknown>;
}

export interface TextFormatOptions {
  maxWidth?: number;
  useColors?: boolean;
  detail?: 'minimal' | 'normal' | 'verbose';
}

export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardView<TData extends ViewData = ViewData> {
  id: string;
  title: string;
  category: WindowMenuCategory;
  keyboardShortcut?: string;
  description?: string;
  getData(context: ViewContext): TData | Promise<TData>;
  textFormatter?: (data: TData, options?: TextFormatOptions) => string;
  canvasRenderer?: (ctx: CanvasRenderingContext2D, data: TData, bounds: RenderBounds, theme: RenderTheme) => void;
  liveOnly?: boolean;
  historicalOnly?: boolean;
  defaultSize?: { width: number; height: number; minWidth?: number; minHeight?: number; };
  handleScroll?: (deltaY: number, contentHeight: number, state: ViewState) => boolean;
  handleClick?: (x: number, y: number, bounds: RenderBounds, data: TData) => boolean;
  createInitialState?: () => ViewState;
}

export interface ViewState {
  scrollOffset?: number;
  selectedIndex?: number;
  expandedSections?: Set<string>;
  [key: string]: unknown;
}

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

### 2. Create ViewRegistry (`packages/core/src/dashboard/ViewRegistry.ts`)

Implement the singleton registry:

```typescript
export class ViewRegistry {
  private views = new Map<string, DashboardView>();
  private listeners = new Set<() => void>();

  register<TData extends ViewData>(view: DashboardView<TData>): void;
  get<TData extends ViewData = ViewData>(id: string): DashboardView<TData>;
  has(id: string): boolean;
  getAll(): DashboardView[];
  getByCategory(category: string): DashboardView[];
  getTextViews(): DashboardView[];
  getCanvasViews(): DashboardView[];
  subscribe(listener: () => void): () => void;
}

export const viewRegistry = new ViewRegistry();
```

**Requirements:**
- `register()` throws if view ID already exists
- `get()` throws if view not found
- Listener notification on registration
- No silent fallbacks

### 3. Create Default Theme (`packages/core/src/dashboard/theme.ts`)

```typescript
export const defaultTheme: RenderTheme = {
  colors: {
    background: '#1a1a1a',
    text: '#ffffff',
    textMuted: '#888888',
    accent: '#FFD700',
    warning: '#FFA500',
    error: '#FF4444',
    success: '#44FF44',
    border: '#333333',
  },
  fonts: {
    normal: '14px monospace',
    bold: 'bold 14px monospace',
    monospace: '14px monospace',
  },
  spacing: {
    padding: 10,
    lineHeight: 18,
    sectionGap: 10,
  },
};
```

### 4. Create Example Views (`packages/core/src/dashboard/views/`)

Create at least 3 example view definitions to validate the architecture:

**ResourcesView.ts** - Already defined in spec, implement fully

**PopulationView.ts** - Simple population summary:
```typescript
export interface PopulationViewData extends ViewData {
  total: number;
  alive: number;
  dead: number;
  births: number;
  avgAge: number;
}

export const PopulationView: DashboardView<PopulationViewData> = {
  id: 'population',
  title: 'Population Summary',
  category: 'info',
  // ... implementation
};
```

**WeatherView.ts** - Current weather conditions:
```typescript
export interface WeatherViewData extends ViewData {
  temperature: number;
  conditions: string;
  timeOfDay: string;
  season: string;
}

export const WeatherView: DashboardView<WeatherViewData> = {
  id: 'weather',
  title: 'Weather & Time',
  category: 'info',
  // ... implementation
};
```

### 5. Create Index Export (`packages/core/src/dashboard/index.ts`)

```typescript
export * from './types.js';
export * from './ViewRegistry.js';
export * from './theme.js';

// Export all views
export * from './views/index.js';
```

### 6. Add to Core Package Exports

Update `packages/core/src/index.ts` to export dashboard module:

```typescript
export * from './dashboard/index.js';
```

---

## Files to Create

```
packages/core/src/dashboard/
├── index.ts
├── types.ts
├── ViewRegistry.ts
├── theme.ts
└── views/
    ├── index.ts
    ├── ResourcesView.ts
    ├── PopulationView.ts
    └── WeatherView.ts
```

---

## Tests Required

Create `packages/core/src/__tests__/Dashboard.test.ts`:

1. **ViewRegistry Tests**
   - Can register a view
   - Throws on duplicate registration
   - Throws on get non-existent view
   - getAll() returns all views
   - getByCategory() filters correctly
   - getTextViews() returns views with textFormatter
   - getCanvasViews() returns views with canvasRenderer
   - Listeners are notified on registration

2. **View Definition Tests**
   - ResourcesView.getData() returns valid data structure
   - ResourcesView.textFormatter() returns non-empty string
   - PopulationView.getData() returns valid data structure
   - WeatherView.getData() returns valid data structure

3. **Type Validation Tests**
   - ViewData timestamp is always set
   - ViewData available boolean is set
   - unavailableReason is set when available=false

---

## Acceptance Criteria

1. All types compile without errors
2. ViewRegistry is usable from `@ai-village/core`
3. Example views are registered and queryable
4. All tests pass
5. No modifications to existing code
6. Build passes: `npm run build`

---

## Implementation Notes

- Use `import type` for type-only imports to avoid circular dependencies
- The `World` type should be imported from existing ECS
- `WindowMenuCategory` comes from renderer types - may need to extract to core
- Keep views simple - complex rendering logic can be added in Phase 2

---

## Out of Scope

- Integration with WindowManager (Phase 2)
- Integration with metrics-server (Phase 3)
- Migration of existing panels (Phase 4)
- Canvas rendering implementation in views (Phase 2 will handle adapter)
