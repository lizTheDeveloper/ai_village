# Renderer Adapters

Adapters bridge heterogeneous panel implementations to the `IWindowPanel` interface required by WindowManager.

## Core Concepts

**Problem**: Panels have inconsistent signatures (different `render()` parameters, visibility patterns, event handling). WindowManager requires uniform `IWindowPanel` interface.

**Solution**: Adapters translate between panel implementations and WindowManager expectations.

## Key Classes

### `ViewAdapter<TData>`
Wraps `DashboardView` instances from `@ai-village/core` for use with WindowManager.

- **Data Flow**: Calls `view.getData(context)` → caches for 100ms → passes to `view.canvasRenderer()`
- **State Management**: Manages `ViewState` (scroll offset, selections)
- **Event Forwarding**: Delegates `handleScroll` and `handleClick` to underlying view
- **World Injection**: Updates world reference for data queries

### `PanelAdapter<T>`
Generic adapter for legacy panel classes with varying signatures.

- **Configuration**: `PanelConfig<T>` defines how to map panel methods to `IWindowPanel`
- **Visibility Patterns**: Supports custom `getVisible`/`setVisible` or internal `_visible` state
- **Render Delegation**: Custom `renderMethod` handles signature variations
- **Optional Methods**: Conditionally adds `handleScroll`/`handleContentClick` based on config

### `ViewPanelFactory`
Factory functions for creating panels from `DashboardView` registry.

- `createPanelFromView(view)` - Single view → panel adapter
- `createAllViewPanels()` - Auto-generate panels for all canvas-capable, non-historical views
- `mapViewCategoryToMenuCategory()` - Maps `DashboardCategory` → `WindowMenuCategory`
- `getViewPanelsByCategory()` - Groups panels by menu category
- `findPanelForView(viewId)` - Lookup panel by view ID

## Usage Example

```typescript
import { viewRegistry } from '@ai-village/core';
import { createPanelFromView, createWindowConfigForView } from './adapters/ViewPanelFactory';

const resourcesView = viewRegistry.get('resources');
const panel = createPanelFromView(resourcesView);
const config = createWindowConfigForView(resourcesView);

windowManager.registerWindow(panel.getId(), panel, config);
```

## Architecture

**ViewAdapter** is the primary adapter for new panels (uses `DashboardView` + `ViewRegistry` pattern).
**PanelAdapter** handles legacy panels until they migrate to `DashboardView`.
**ViewPanelFactory** automates panel registration from view registry.
