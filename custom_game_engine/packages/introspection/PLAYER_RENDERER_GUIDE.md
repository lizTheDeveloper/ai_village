# Player Renderer Quick Start Guide

**Phase 2C: Auto-generate player UI from component schemas**

---

## Installation

```typescript
import {
  PlayerCanvasRenderer,
  PlayerDOMRenderer,
  type RenderContext,
  type RenderResult,
} from '@ai-village/introspection';
```

---

## Canvas Renderer (HUD, Tooltips, Overlays)

### Basic Usage

```typescript
// 1. Create renderer
const canvasRenderer = new PlayerCanvasRenderer();

// 2. Get canvas context
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// 3. Render a component
const result = canvasRenderer.renderComponent(healthComponent, HealthSchema, {
  ctx,
  x: 10,
  y: 10,
  width: 200,
  height: 50,
  showLabels: true,
  showIcons: true,
});

console.log(`Rendered ${result.heightUsed}px`);
```

### Render All Components for Entity

```typescript
// Automatically renders all player-visible components
const result = canvasRenderer.renderEntity(entity, {
  ctx,
  x: 10,
  y: 10,
  width: 300,
  height: 400,
  showLabels: true,
  showIcons: true,
});

console.log(`Total height: ${result.heightUsed}px`);
```

### Compact Mode (Smaller UI)

```typescript
canvasRenderer.renderComponent(component, schema, {
  ctx,
  x: 10,
  y: 10,
  width: 150,
  height: 40,
  compact: true,        // Smaller fonts, tighter spacing
  showLabels: false,    // Hide labels to save space
  showIcons: true,      // Keep icons for visual clarity
});
```

---

## DOM Renderer (Panels, Modals, Detailed Views)

### Basic Usage

```typescript
// 1. Create renderer
const domRenderer = new PlayerDOMRenderer();

// 2. Get container element
const container = document.getElementById('player-info-panel')!;

// 3. Clear previous content
container.innerHTML = '';

// 4. Render a component
const result = domRenderer.renderComponent(inventoryComponent, InventorySchema, {
  container,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  showLabels: true,
  showIcons: true,
});
```

### Render All Components for Entity

```typescript
// Automatically renders all player-visible components
const container = document.getElementById('agent-details')!;
container.innerHTML = '';

const result = domRenderer.renderEntity(selectedAgent, {
  container,
  x: 0,
  y: 0,
  width: 500,
  height: 600,
});

console.log(`Rendered ${result.heightUsed}px of content`);
```

### With Custom Styling

```html
<style>
  /* Component container */
  .player-component {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #444;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
  }

  /* Component title */
  .player-component-title {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid #444;
    padding-bottom: 4px;
  }

  /* Field groups */
  .player-field-group {
    margin-bottom: 8px;
  }

  .player-field-group-label {
    font-weight: bold;
    font-size: 12px;
    margin-bottom: 4px;
    color: #AAA;
  }

  /* Individual fields */
  .player-field {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .player-field-icon {
    width: 16px;
  }

  .player-field-label {
    color: #CCC;
    min-width: 100px;
  }

  .player-field-value {
    color: #FFF;
    font-weight: bold;
  }

  /* Compact mode */
  .player-component.compact {
    padding: 5px;
    font-size: 10px;
  }
</style>
```

---

## Creating Player-Visible Schemas

### Basic Schema

```typescript
import { defineComponent } from '@ai-village/introspection';

const HealthSchema = defineComponent<HealthComponent>({
  type: 'health',
  version: 1,
  category: 'physical',

  fields: {
    // Player-visible field
    current: {
      type: 'number',
      required: true,
      range: [0, 100],
      description: 'Current health points',
      displayName: 'Health',
      visibility: { player: true, llm: true, dev: true },
      ui: {
        widget: 'slider',
        icon: '❤️',
        color: '#FF0000',
        order: 1,
      },
    },

    // Hidden from player (dev-only)
    regenRate: {
      type: 'number',
      required: true,
      description: 'HP regeneration per second',
      displayName: 'Regen Rate',
      visibility: { player: false, dev: true },  // Not shown to player
      ui: {
        widget: 'slider',
        order: 2,
      },
    },
  },

  ui: {
    title: 'Health',
    icon: '❤️',
    color: '#FF0000',
    priority: 1,
  },

  validate: (data) => typeof data?.current === 'number',
  createDefault: () => ({ type: 'health', version: 1, current: 100, regenRate: 0.5 }),
});
```

### With Custom Player Renderer

```typescript
const CustomSchema = defineComponent<CustomComponent>({
  type: 'custom',
  version: 1,
  category: 'core',

  fields: {
    // ... field definitions ...
  },

  // Override default rendering
  renderers: {
    player: (data) => {
      // Option 1: Return formatted string
      return `${data.name} [${data.level}] - ${data.xp}/${data.maxXp} XP`;

      // Option 2: Return CanvasRenderable for canvas
      return {
        draw: (ctx, x, y) => {
          // Custom drawing logic
          ctx.fillStyle = data.health > 50 ? '#00FF00' : '#FF0000';
          ctx.fillRect(x, y, data.health, 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(`${data.health}/100`, x + 5, y + 8);
        }
      };
    }
  },

  // ... other schema properties ...
});
```

---

## Visibility Filtering

Only fields with `visibility.player === true` are shown to players.

```typescript
fields: {
  // ✅ Player sees this
  name: {
    visibility: { player: true, llm: true, dev: true },
    // ...
  },

  // ❌ Player does NOT see this (dev-only)
  debugFlag: {
    visibility: { player: false, dev: true },
    // ...
  },

  // ✅ Player sees this (summarized for LLM)
  personality: {
    visibility: { player: true, llm: 'summarized', dev: true },
    // ...
  },
}
```

**Result:** When rendering for player, only `name` and `personality` appear.

---

## Field Type Auto-Formatting

Renderers automatically format values based on field type:

| Field Type | Example Input | Rendered Output |
|------------|---------------|-----------------|
| `boolean` | `true` | `✓` |
| `boolean` | `false` | `✗` |
| `number` (0-1 range) | `0.75` | `75%` |
| `number` (decimal) | `3.14159` | `3.14` |
| `number` (integer) | `42` | `42` |
| `string` | `"Long string..."` | `"Long stri..."` (truncated) |
| `array` | `[1, 2, 3]` | `[3 items]` |
| `map` | `Map { ... }` | `{5 entries}` |
| `enum` | `"happy"` | `Happy` (capitalized) |
| `entityId` | `"abc123def456..."` | `abc123de...` |

---

## Common Patterns

### Tooltip on Hover (Canvas)

```typescript
canvas.addEventListener('mousemove', (e) => {
  const entity = getEntityAtPosition(e.clientX, e.clientY);
  if (!entity) return;

  // Clear tooltip area
  ctx.clearRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // Render entity info as tooltip
  canvasRenderer.renderEntity(entity, {
    ctx,
    x: e.clientX + 10,
    y: e.clientY + 10,
    width: 200,
    height: 150,
    compact: true,
  });
});
```

### Agent Info Panel (DOM)

```typescript
function showAgentInfo(agent: Entity) {
  const panel = document.getElementById('agent-info')!;
  panel.innerHTML = '';
  panel.style.display = 'block';

  domRenderer.renderEntity(agent, {
    container: panel,
    x: 0,
    y: 0,
    width: 400,
    height: 600,
  });
}

// Hide panel on close button
closeButton.addEventListener('click', () => {
  panel.style.display = 'none';
});
```

### Character Selection Screen (DOM)

```typescript
const characters = getPlayerCharacters();

characters.forEach(char => {
  const charDiv = document.createElement('div');
  charDiv.className = 'character-option';

  domRenderer.renderEntity(char, {
    container: charDiv,
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    compact: true,
  });

  charDiv.addEventListener('click', () => selectCharacter(char));
  characterList.appendChild(charDiv);
});
```

---

## Error Handling

```typescript
const result = renderer.renderComponent(component, schema, context);

if (!result.success) {
  console.error('Render failed:', result.error);
  // Fallback rendering or error display
}
```

---

## Performance Tips

### Canvas Renderer
- **Don't render every frame** - Only on hover, select, or significant changes
- **Use compact mode** for small tooltips
- **Disable labels** for icon-only HUD elements
- **Cache rendered output** if component data doesn't change

### DOM Renderer
- **Reuse containers** - Update innerHTML instead of creating new elements
- **Use compact mode** for list views
- **Lazy render** - Only render visible panels
- **Throttle updates** - Don't re-render on every state change

---

## Example: Complete Integration

```typescript
import { PlayerCanvasRenderer, PlayerDOMRenderer } from '@ai-village/introspection';

class GameUI {
  private canvasRenderer = new PlayerCanvasRenderer();
  private domRenderer = new PlayerDOMRenderer();

  // Render tooltip on canvas
  renderTooltip(entity: Entity, x: number, y: number) {
    this.canvasRenderer.renderEntity(entity, {
      ctx: this.tooltipCtx,
      x,
      y,
      width: 250,
      height: 200,
      compact: true,
      showLabels: true,
      showIcons: true,
    });
  }

  // Render detailed panel in DOM
  showEntityDetails(entity: Entity) {
    const panel = document.getElementById('details-panel')!;
    panel.innerHTML = '';

    this.domRenderer.renderEntity(entity, {
      container: panel,
      x: 0,
      y: 0,
      width: 500,
      height: 700,
      showLabels: true,
      showIcons: true,
    });

    panel.style.display = 'block';
  }
}
```

---

## Next Steps

1. **Style the generated DOM** with CSS (see classes above)
2. **Create schemas** for your components with `visibility.player = true`
3. **Integrate into your game UI** (tooltips, panels, HUD)
4. **Test rendering** with the example test file

See `PHASE_2C_SUMMARY.md` for full implementation details.
