# Work Order: Unified Dashboard - Phase 4: Panel Migration

## Overview

Migrate existing panel implementations to the unified view system. This is a gradual process that can be done panel-by-panel without breaking existing functionality.

**Spec Reference:** `custom_game_engine/specs/unified-dashboard-system.md`

**Dependencies:** Phase 1, Phase 2, Phase 3 (all must be complete)

**Blocked By:** Phase 2 and Phase 3

**Can Run In Parallel With:** Nothing (this is the final integration phase)

---

## Migration Strategy

### Approach: Wrapper-First

For each panel, we'll:

1. **Create View Definition** - Define the view's data model and getData()
2. **Extract Data Logic** - Move data fetching from render to getData()
3. **Create Canvas Renderer** - Wrap existing render logic
4. **Create Text Formatter** - Create LLM-friendly text output
5. **Register View** - Add to ViewRegistry
6. **Update Registration** - Switch from old adapter to ViewAdapter
7. **Delete Old Code** - Remove redundant panel class and adapter config

### Priority Order

Migrate in this order (simplest to complex):

| Priority | Panel | Complexity | Notes |
|----------|-------|------------|-------|
| 1 | ResourcesPanel | Low | Simple data aggregation |
| 2 | WeatherPanel | Low | Reads single component |
| 3 | PopulationPanel | Low | Simple count queries |
| 4 | TileInspectorPanel | Low | Location-based data |
| 5 | EconomyPanel | Medium | Multiple calculations |
| 6 | MemoryPanel | Medium | Scrollable list |
| 7 | RelationshipsPanel | Medium | Graph visualization |
| 8 | AgentInfoPanel | High | Complex, entity-specific |
| 9 | AnimalInfoPanel | High | Similar to AgentInfo |
| 10 | PlantInfoPanel | Medium | Entity-specific |
| 11 | GovernancePanel | High | Complex multi-section |
| 12 | CraftingPanel | High | Interactive, stateful |
| 13 | InventoryPanel | High | Interactive, modal |
| 14 | ShopPanel | High | Interactive, transactions |
| 15+ | Divine/Magic panels | Varies | New system, lower priority |

---

## Detailed Migration Guide

### Example: ResourcesPanel Migration

**Step 1: Create View Definition**

```typescript
// packages/core/src/dashboard/views/ResourcesView.ts

import type { DashboardView, ViewData, ViewContext, RenderBounds, RenderTheme } from '../types.js';

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

  defaultSize: {
    width: 250,
    height: 200,
    minWidth: 200,
    minHeight: 150,
  },

  getData(context: ViewContext): ResourcesViewData {
    // MOVED from ResourcesPanel.aggregateStorageResources()
    const { world } = context;

    if (!world?.query) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'World not available',
        resources: {},
        storageInfo: null,
      };
    }

    // ... data fetching logic from old panel ...

    return {
      timestamp: Date.now(),
      available: true,
      resources,
      storageInfo,
    };
  },

  textFormatter(data: ResourcesViewData): string {
    // NEW: LLM-friendly text output
    if (!data.available) {
      return `VILLAGE STOCKPILE\n\n${data.unavailableReason}`;
    }

    const lines = ['VILLAGE STOCKPILE', '='.repeat(40), ''];

    for (const [item, qty] of Object.entries(data.resources).sort()) {
      lines.push(`  ${item}: ${qty}`);
    }

    if (data.storageInfo) {
      lines.push('');
      lines.push(`Storage: ${data.storageInfo.buildingCount} building(s)`);
      lines.push(`Capacity: ${data.storageInfo.usedSlots}/${data.storageInfo.totalSlots}`);
    }

    return lines.join('\n');
  },

  canvasRenderer(ctx, data, bounds, theme): void {
    // ADAPTED from ResourcesPanel.render()
    // Uses data instead of querying world directly

    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    for (const [itemId, quantity] of Object.entries(data.resources).sort()) {
      const icon = getResourceIcon(itemId);
      ctx.fillStyle = getResourceColor(itemId, theme);
      ctx.fillText(`${icon} ${itemId}: ${quantity}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // ... rest of rendering ...
  },
};
```

**Step 2: Register View**

```typescript
// packages/core/src/dashboard/views/index.ts

export * from './ResourcesView.js';

// Register on module load
import { viewRegistry } from '../ViewRegistry.js';
import { ResourcesView } from './ResourcesView.js';

viewRegistry.register(ResourcesView);
```

**Step 3: Update main.ts Registration**

```typescript
// demo/src/main.ts

// BEFORE:
const resourcesAdapter = createResourcesPanelAdapter(panels.resourcesPanel);
windowManager.registerWindow('resources', resourcesAdapter, {
  defaultX: logicalWidth - 260,
  defaultY: 10,
  // ... config ...
});

// AFTER:
import { ResourcesView } from '@ai-village/core';
windowManager.registerFromView(ResourcesView, {
  defaultX: logicalWidth - 260,
  defaultY: 10,
});
```

**Step 4: Delete Old Code**

- Delete `packages/renderer/src/ResourcesPanel.ts`
- Remove `RESOURCES_PANEL_CONFIG` from `adapters/index.ts`
- Remove `createResourcesPanelAdapter` function
- Remove import and usage in main.ts

---

## Migration Checklist Template

For each panel migration, complete this checklist:

```markdown
## Panel: [PanelName]

### Pre-Migration
- [ ] Read and understand existing panel implementation
- [ ] Identify all data sources (world queries, components)
- [ ] Identify all state (scroll position, selections)
- [ ] Identify all interactions (click handlers, scroll)

### View Definition
- [ ] Create ViewData interface with all required fields
- [ ] Implement getData() with data fetching logic
- [ ] Implement textFormatter() for LLM output
- [ ] Implement canvasRenderer() adapting render logic
- [ ] Add defaultSize with appropriate dimensions
- [ ] Add keyboardShortcut if applicable
- [ ] Add handleScroll if panel is scrollable
- [ ] Add handleClick if panel is interactive
- [ ] Add createInitialState if panel has state

### Integration
- [ ] Export view from views/index.ts
- [ ] Register view in ViewRegistry
- [ ] Update main.ts to use registerFromView()
- [ ] Test canvas rendering matches old panel
- [ ] Test curl endpoint returns correct data

### Cleanup
- [ ] Delete old panel class file
- [ ] Remove old adapter config
- [ ] Remove old factory function
- [ ] Update adapters/index.ts exports
- [ ] Remove unused imports in main.ts

### Verification
- [ ] npm run build passes
- [ ] npm run test passes
- [ ] Manual test: panel displays correctly
- [ ] Manual test: curl endpoint works
- [ ] No console errors
```

---

## Handling Complex Cases

### Entity-Specific Panels (AgentInfo, AnimalInfo, PlantInfo)

These panels need a selected entity. Handle with:

```typescript
getData(context: ViewContext): AgentInfoViewData {
  const { world, selectedEntityId } = context;

  if (!selectedEntityId) {
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

  // ... fetch agent data ...
}
```

For WindowManager, update the adapter when selection changes:

```typescript
// In the selection handler
const adapter = windowManager.getAdapter('agent-info') as ViewAdapter;
adapter.setSelectedEntity(selectedEntityId);
```

### Scrollable Panels (Memory, Relationships)

Add scroll state and handler:

```typescript
export const MemoryView: DashboardView<MemoryViewData> = {
  // ...

  createInitialState(): ViewState {
    return {
      scrollOffset: 0,
      selectedMemoryIndex: -1,
    };
  },

  handleScroll(deltaY, contentHeight, state): boolean {
    const newOffset = Math.max(0, Math.min(
      contentHeight - 200, // visible height
      (state.scrollOffset || 0) + deltaY
    ));
    state.scrollOffset = newOffset;
    return true;
  },

  canvasRenderer(ctx, data, bounds, theme): void {
    const scrollOffset = data.state?.scrollOffset || 0;
    // Apply scroll offset to rendering...
  },
};
```

### Interactive Panels (Crafting, Shop, Inventory)

These panels have complex interactions. Options:

1. **Keep as separate panels** - Not everything needs to be a view
2. **Hybrid approach** - View for display, panel handles interaction
3. **Full migration** - Move all logic to view handlers

Recommendation: Start with option 2, migrate fully later if needed.

### Modal Panels (Settings, Inventory)

Modal panels work the same way, but with config:

```typescript
windowManager.registerFromView(InventoryView, {
  isModal: true,
  isDraggable: false,
});
```

---

## Backward Compatibility Notes

During migration:

1. **Old and new can coexist** - Some panels migrated, others not
2. **Same window ID** - Use same ID so shortcuts/persistence work
3. **Same visual appearance** - Canvas output should match
4. **New LLM endpoints** - Added benefit of migration

After migration:

1. **Remove dead code** - Delete old panel files
2. **Simplify main.ts** - Use registerAllViews()
3. **Update docs** - Document new curl endpoints

---

## Files to Modify/Delete Per Panel

For each panel migration:

**Create:**
- `packages/core/src/dashboard/views/{PanelName}View.ts`

**Modify:**
- `packages/core/src/dashboard/views/index.ts` - Add export
- `demo/src/main.ts` - Update registration

**Delete:**
- `packages/renderer/src/{PanelName}Panel.ts`
- Config entry in `packages/renderer/src/adapters/index.ts`

---

## Testing Strategy

### Per-Panel Tests

1. **Visual comparison** - Panel looks the same
2. **Data accuracy** - Same numbers/text shown
3. **Interaction** - Scroll, click still work
4. **Keyboard shortcuts** - Still toggle panel
5. **Curl endpoint** - Returns valid text

### Regression Tests

After each panel migration:

```bash
npm run build
npm run test
npm run dev  # Manual visual check
```

---

## Rollback Plan

If a migration causes issues:

1. **Revert the PR** - Git makes this easy
2. **Keep old panel** - Don't delete until verified
3. **Flag for later** - Document what went wrong

---

## Success Metrics

- [ ] All 15+ panels migrated to views
- [ ] All panels accessible via curl
- [ ] main.ts registration simplified
- [ ] Old panel files deleted
- [ ] No visual regressions
- [ ] No functionality loss
- [ ] Build and tests pass

---

## Out of Scope

- Adding new views (separate work orders)
- Redesigning panel layouts
- Adding new features to panels
- Mobile/responsive layouts
