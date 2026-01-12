# Panel Adapter Consolidation

## Overview

There are 14 nearly-identical adapter classes in `packages/renderer/src/adapters/` totaling ~1,000 lines of boilerplate. Each adapter wraps a Panel class to implement the `IWindowPanel` interface for WindowManager compatibility. This work order consolidates them into a single generic solution.

## The Problem

### Current State: 14 Copy-Paste Files

```
packages/renderer/src/adapters/
├── AgentInfoPanelAdapter.ts      (110 lines)
├── AnimalInfoPanelAdapter.ts     (95 lines)
├── CraftingPanelUIAdapter.ts     (72 lines)
├── CraftingStationPanelAdapter.ts (68 lines)
├── EconomyPanelAdapter.ts        (65 lines)
├── GovernanceDashboardPanelAdapter.ts (70 lines)
├── InventoryUIAdapter.ts         (85 lines)
├── MemoryPanelAdapter.ts         (71 lines)
├── PlantInfoPanelAdapter.ts      (72 lines)
├── RelationshipsPanelAdapter.ts  (65 lines)
├── ResourcesPanelAdapter.ts      (64 lines)
├── SettingsPanelAdapter.ts       (68 lines)
├── ShopPanelAdapter.ts           (65 lines)
└── TileInspectorPanelAdapter.ts  (70 lines)
                                  ≈1,040 lines total
```

### The Pattern

Every adapter looks like this:

```typescript
export class XxxPanelAdapter implements IWindowPanel {
  private panel: XxxPanel;
  private visible: boolean = false;  // Sometimes

  constructor(panel: XxxPanel) {
    if (!panel) throw new Error('...');
    this.panel = panel;
  }

  getId(): string { return 'xxx'; }
  getTitle(): string { return 'Xxx Panel'; }
  getDefaultWidth(): number { return 300; }
  getDefaultHeight(): number { return 450; }

  isVisible(): boolean {
    return this.visible;  // OR this.panel.isVisible()
  }

  setVisible(visible: boolean): void {
    this.visible = visible;  // OR toggle logic
  }

  render(ctx, x, y, width, height, world): void {
    if (!this.isVisible() || !world) return;
    this.panel.render(ctx, width, height, world);  // Slight variations
  }

  getPanel(): XxxPanel { return this.panel; }
}
```

### Why This Is Bad

1. **Maintenance burden** - Change to IWindowPanel requires 14 file edits
2. **Inconsistency risk** - Small variations creep in (some use `toggle()`, some use boolean)
3. **Cognitive load** - 14 files that are "basically the same but slightly different"
4. **Violation of DRY** - The same logic repeated 14 times

---

## Solution: Generic Panel Adapter

### Option A: Configuration-Based Factory (Recommended)

```typescript
// packages/renderer/src/adapters/PanelAdapter.ts

export interface PanelConfig<T> {
  id: string;
  title: string;
  defaultWidth: number;
  defaultHeight: number;

  // How to check/set visibility (panels differ here)
  getVisible?: (panel: T) => boolean;
  setVisible?: (panel: T, visible: boolean) => void;

  // How to render (panels have different signatures)
  render: (panel: T, ctx: CanvasRenderingContext2D, width: number, height: number, world: any) => void;
}

export class PanelAdapter<T> implements IWindowPanel {
  private panel: T;
  private config: PanelConfig<T>;
  private _visible: boolean = false;

  constructor(panel: T, config: PanelConfig<T>) {
    if (!panel) {
      throw new Error(`${config.title} panel cannot be null or undefined`);
    }
    this.panel = panel;
    this.config = config;
  }

  getId(): string {
    return this.config.id;
  }

  getTitle(): string {
    return this.config.title;
  }

  getDefaultWidth(): number {
    return this.config.defaultWidth;
  }

  getDefaultHeight(): number {
    return this.config.defaultHeight;
  }

  isVisible(): boolean {
    if (this.config.getVisible) {
      return this.config.getVisible(this.panel);
    }
    return this._visible;
  }

  setVisible(visible: boolean): void {
    if (this.config.setVisible) {
      this.config.setVisible(this.panel, visible);
    }
    this._visible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }
    this.config.render(this.panel, ctx, width, height, world);
  }

  getPanel(): T {
    return this.panel;
  }
}
```

### Usage After Refactor

```typescript
// packages/renderer/src/adapters/index.ts

import { PanelAdapter, PanelConfig } from './PanelAdapter.js';
import { ResourcesPanel } from '../ResourcesPanel.js';
import { MemoryPanel } from '../MemoryPanel.js';
// ... other imports

// Configuration for each panel type
export const PANEL_CONFIGS = {
  resources: {
    id: 'resources',
    title: 'Village Stockpile',
    defaultWidth: 280,
    defaultHeight: 200,
    render: (panel: ResourcesPanel, ctx, width, _height, world) => {
      panel.render(ctx, width, world, false);
    },
  } satisfies PanelConfig<ResourcesPanel>,

  memory: {
    id: 'memory',
    title: 'Memory & Goals',
    defaultWidth: 400,
    defaultHeight: 600,
    getVisible: (panel: MemoryPanel) => panel.isVisible(),
    setVisible: (panel: MemoryPanel, visible: boolean) => {
      if (visible !== panel.isVisible()) panel.toggle();
    },
    render: (panel: MemoryPanel, ctx, width, height, world) => {
      panel.render(ctx, width, height, world);
    },
  } satisfies PanelConfig<MemoryPanel>,

  // ... 12 more configs
};

// Factory functions for convenience
export function createResourcesPanelAdapter(panel: ResourcesPanel): PanelAdapter<ResourcesPanel> {
  return new PanelAdapter(panel, PANEL_CONFIGS.resources);
}

export function createMemoryPanelAdapter(panel: MemoryPanel): PanelAdapter<MemoryPanel> {
  return new PanelAdapter(panel, PANEL_CONFIGS.memory);
}

// ... or just export the generic class and let callers use configs directly
```

### Option B: Decorator/Mixin Pattern

If panels could implement `IWindowPanel` directly with a mixin:

```typescript
// Add IWindowPanel methods to any panel class
function withWindowPanel<T extends new (...args: any[]) => any>(
  Base: T,
  config: { id: string; title: string; width: number; height: number }
) {
  return class extends Base implements IWindowPanel {
    getId() { return config.id; }
    getTitle() { return config.title; }
    getDefaultWidth() { return config.width; }
    getDefaultHeight() { return config.height; }
    // ... etc
  };
}

// Usage
const WindowedResourcesPanel = withWindowPanel(ResourcesPanel, {
  id: 'resources',
  title: 'Village Stockpile',
  width: 280,
  height: 200,
});
```

**Downside:** Requires modifying how panels are instantiated everywhere.

---

## Implementation Plan

### Phase 1: Create Generic Adapter (1 hour)

1. Create `packages/renderer/src/adapters/PanelAdapter.ts`
2. Define `PanelConfig<T>` interface
3. Implement generic `PanelAdapter<T>` class
4. Add tests for the generic adapter

### Phase 2: Migrate One Adapter (30 min)

1. Pick simplest adapter (ResourcesPanelAdapter)
2. Create config in new system
3. Update imports in consuming code
4. Delete old adapter file
5. Verify tests pass

### Phase 3: Migrate Remaining Adapters (2 hours)

Migrate in order of complexity:
1. Simple (just delegation): Resources, Settings, Economy, Shop, Relationships
2. Medium (toggle logic): Memory, Agent, Plant, Animal, TileInspector
3. Complex (extra state): Crafting, CraftingStation, Inventory, Governance

### Phase 4: Cleanup (30 min)

1. Delete all old adapter files
2. Update barrel exports in `adapters/index.ts`
3. Search codebase for any remaining imports of old adapters
4. Final test run

---

## Variations to Handle

### Visibility Patterns

**Pattern 1: Own boolean state**
```typescript
// ResourcesPanelAdapter, SettingsPanelAdapter, etc.
private visible: boolean = false;
isVisible() { return this.visible; }
setVisible(v) { this.visible = v; }
```

**Pattern 2: Delegate to panel**
```typescript
// MemoryPanelAdapter, AgentInfoPanelAdapter
isVisible() { return this.panel.isVisible(); }
setVisible(v) { if (v !== this.panel.isVisible()) this.panel.toggle(); }
```

**Pattern 3: Conditional on selection**
```typescript
// PlantInfoPanelAdapter, AnimalInfoPanelAdapter
isVisible() { return this.visible && this.panel.getSelectedEntityId() !== null; }
```

The config-based approach handles all three with `getVisible`/`setVisible` functions.

### Render Signature Variations

```typescript
// Some panels: render(ctx, width, world, showTitle)
panel.render(ctx, width, world, false);

// Some panels: render(ctx, width, height, world)
panel.render(ctx, width, height, world);

// Some panels: render(ctx, x, y, width, height, world)
panel.render(ctx, 0, 0, width, height, world);
```

The config's `render` function handles each panel's specific signature.

---

## Files to Delete After Migration

```
packages/renderer/src/adapters/
├── AgentInfoPanelAdapter.ts      DELETE
├── AnimalInfoPanelAdapter.ts     DELETE
├── CraftingPanelUIAdapter.ts     DELETE
├── CraftingStationPanelAdapter.ts DELETE
├── EconomyPanelAdapter.ts        DELETE
├── GovernanceDashboardPanelAdapter.ts DELETE
├── InventoryUIAdapter.ts         DELETE
├── MemoryPanelAdapter.ts         DELETE
├── PlantInfoPanelAdapter.ts      DELETE
├── RelationshipsPanelAdapter.ts  DELETE
├── ResourcesPanelAdapter.ts      DELETE
├── SettingsPanelAdapter.ts       DELETE
├── ShopPanelAdapter.ts           DELETE
├── TileInspectorPanelAdapter.ts  DELETE
├── PanelAdapter.ts               NEW (generic)
└── index.ts                      KEEP (update exports)
```

---

## Verification Checklist

- [ ] Generic `PanelAdapter<T>` class created
- [ ] All 14 panel configs defined
- [ ] All old adapter files deleted
- [ ] No imports of old adapters remain (grep check)
- [ ] All panels render correctly in game
- [ ] Visibility toggle works for each panel
- [ ] WindowManager tests pass
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Adapter files | 14 | 1 |
| Lines of code | ~1,040 | ~150 |
| Maintenance points | 14 | 1 |

---

**End of Specification**
