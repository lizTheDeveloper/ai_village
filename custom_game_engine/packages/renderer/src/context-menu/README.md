# Context Menu System

Radial context menu for right-click entity/tile interactions. Detects click targets, filters applicable actions, and emits EventBus actions for execution.

## Core Concepts

**Action Registration**: Actions registered with `ContextActionRegistry` define when they're applicable (`isApplicable`) and what they do (`execute`). Registry filters actions based on `MenuContext`.

**Context Detection**: `MenuContext.fromClick()` converts screen coordinates to world position, detects entity type (agent > building > resource priority), checks tile properties (walkable, buildable), and captures selection state.

**Event-Driven**: Actions emit events on `EventBus` rather than directly manipulating game state. Systems listen for events like `action:move`, `action:harvest`, `ui:panel:open`.

## Key Classes

**`ContextActionRegistry`**: Manages action definitions. Methods: `register(action)`, `getApplicableActions(context)`, `execute(actionId, context)`. Includes default actions for agents, buildings, resources, construction.

**`MenuContext`**: Immutable context snapshot. Fields: `targetType`, `targetEntity`, `selectedEntities`, `worldPosition`, `isWalkable`, `isBuildable`. Methods: `hasSelection()`, `getTargetEntity(world)`, `isActionApplicable(actionId)`.

**`ContextAction`**: Action definition interface. Required: `id`, `label`, `icon`, `isApplicable`, `execute`. Optional: `submenu`, `requiresConfirmation`, `category`, `shortcut`.

## Types

**`ContextType`**: `'empty_tile' | 'agent' | 'building' | 'resource' | 'terrain'`

**`RadialMenuItem`**: Extends `MenuItemBase` with rendering data (`startAngle`, `endAngle`, `innerRadius`, `outerRadius`, `hovered`).

**`RadialMenuConfig`**: Appearance settings (radii, colors, animations, fonts). See `DEFAULT_RADIAL_MENU_CONFIG`.

**`MenuState`**: Runtime state (`isOpen`, `position`, `context`, `hoveredItemId`, `menuLevel`, `animationProgress`).

## Usage Example

```typescript
// Register custom action
registry.register({
  id: 'plant_seed',
  label: 'Plant Seed',
  icon: 'seed',
  category: 'farming',
  isApplicable: (ctx) => ctx.targetType === 'empty_tile' && ctx.isBuildable,
  execute: (ctx, world, eventBus) => {
    eventBus.emit({
      type: 'action:plant_seed',
      source: 'world',
      data: { position: ctx.worldPosition }
    });
  }
});

// Create context from click
const context = MenuContext.fromClick(world, camera, screenX, screenY);

// Get applicable actions
const actions = registry.getApplicableActions(context);

// Execute action
registry.execute('plant_seed', context);
```

## Architecture Notes

**Coordinate Systems**: Screen coords → Camera.screenToWorld() → Tile coords (÷16). Entity positions stored in tiles. Click detection uses 1.5-tile radius.

**Submenu Support**: Actions with `hasSubmenu: true` define `submenu: ContextAction[]`. Registry handles nested execution.

**Confirmation Flow**: Actions with `requiresConfirmation: true` display `confirmationMessage` and `consequences` before execution.

**Default Actions**: Registry auto-registers 20+ actions in categories: movement, social, info, building, gathering, construction, navigation, selection.
