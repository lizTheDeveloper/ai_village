# Renderers

Auto-generate UI from component schemas for dev and player contexts.

## Overview

Renderers transform component data into visual output (canvas/DOM) based on schema metadata. Fields are filtered by visibility (`dev`, `player`) and rendered using appropriate widgets.

## Renderer Types

### DevRenderer
Canvas-based renderer for dev panels. Shows all `visibility.dev` fields with full editing capabilities.

```typescript
import { DevRenderer } from '@ai-village/introspection';

const renderer = new DevRenderer({ showGroups: true, fieldSpacing: 4 });
renderer.initializeComponent('position', component, onFieldChange);
renderer.render(ctx, 'position', x, y, width);
```

### PlayerRenderer Interface
Base interface for player-facing renderers. Shows only `visibility.player === true` fields.

**Implementations:**
- `PlayerCanvasRenderer` - Compact canvas rendering for tooltips/HUD
- `PlayerDOMRenderer` - Rich DOM rendering for modals/panels

```typescript
const renderer = new PlayerDOMRenderer();
renderer.renderComponent(component, schema, { container: element });
```

## Widget System

Widgets handle individual field rendering and interaction. Auto-selected by `WidgetFactory` based on field type and schema hints.

### Widget Types
- `TextWidget` - String/number input
- `SliderWidget` - Number with range (`fieldSchema.range`)
- `DropdownWidget` - Enum selection (`type: 'enum'`)
- `CheckboxWidget` - Boolean toggle
- `JsonWidget` - Complex types (array/map/object)
- `ReadonlyWidget` - Immutable fields (`mutable: false`)

### Widget Selection
```typescript
// Explicit via schema
{ ui: { widget: 'slider' } }

// Inferred from type
{ type: 'boolean' } // → CheckboxWidget
{ type: 'number', range: [0, 100] } // → SliderWidget
{ type: 'string' } // → TextWidget
{ mutable: false } // → ReadonlyWidget
```

### Widget Interface
```typescript
interface Widget {
  render(ctx: WidgetRenderContext): number;  // Returns height consumed
  handleEvent?(event: WidgetEvent): unknown; // Optional interaction
  getValue(): unknown;
  setValue(value: unknown): void;
}
```

## Rendering Pipeline

1. **Initialize**: Schema → field extraction → widget creation
2. **Render**: Group/order fields → layout calculation → widget rendering
3. **Interact**: Click detection → widget event handling → onChange callback
4. **Update**: Component data changed → `updateComponent()` → widget values refreshed

## Context Objects

### DevRenderer Context
```typescript
{ ctx, x, y, width, height, focused, hovered }
```

### PlayerRenderer Context
```typescript
{
  ctx?,         // Canvas context (canvas renderers)
  container?,   // DOM element (DOM renderers)
  x, y, width, height,
  compact?,     // Compact mode (less spacing)
  showLabels?,  // Field labels
  showIcons?    // Icons if available
}
```

## Grouping & Ordering

Fields grouped by `fieldSchema.ui.group` (default: `'default'`), ordered by `fieldSchema.ui.order` (default: `999`).

```typescript
{ ui: { group: 'stats', order: 10 } }  // First in 'stats' group
{ ui: { group: 'stats', order: 20 } }  // Second in 'stats' group
{ ui: { group: 'details' } }           // Default order in 'details'
```

DevRenderer renders group headers with spacing (`groupSpacing: 12`, `fieldSpacing: 4`).
