# Panel Interface Fix - January 3, 2026

## Problem

The WindowManager was throwing errors when trying to call `setVisible()` on panels:

```
TypeError: window.panel.setVisible is not a function
at WindowManager.loadLayout (WindowManager.ts:886:22)
```

Many panels in `/packages/renderer/src/` were missing required `IWindowPanel` interface methods.

## Solution

Systematically added the full `IWindowPanel` interface implementation to 29 panel files:

### Panels Fixed

#### Group 1: Had `isVisible()` but missing other methods (9 panels)
- DivineChatPanel
- DivinePowersPanel
- EconomyPanel
- MagicSystemsPanel
- PendingApprovalsPanel
- RelationshipsPanel
- ShopPanel
- SpellbookPanel
- VisionComposerPanel

#### Group 2: Had no IWindowPanel methods (18 panels)
- AgentInfoPanel
- AgentRosterPanel
- AnimalInfoPanel
- CombatHUDPanel
- CombatLogPanel
- CombatUnitPanel
- CraftingStationPanel
- FarmManagementPanel
- GovernanceDashboardPanel
- IngredientPanel
- LLMConfigPanel
- NotificationsPanel
- PlantInfoPanel
- ResourcesPanel
- SettingsPanel
- TileInspectorPanel
- TimelinePanel
- UnifiedHoverInfoPanel

#### Already Fixed (3 panels)
- DevPanel (fixed manually)
- MemoryPanel (fixed manually)
- AgentSelectionPanel (already had all methods)

### Changes Made to Each Panel

1. **Added import**: `import type { IWindowPanel } from './types/WindowTypes.js';`

2. **Added interface declaration**: `export class XxxPanel implements IWindowPanel`

3. **Added visibility field** (if missing): `private visible: boolean = false;`

4. **Added required methods**:
   ```typescript
   getId(): string {
     return 'panel-id';
   }

   getTitle(): string {
     return 'Panel Title';
   }

   getDefaultWidth(): number {
     return 400;
   }

   getDefaultHeight(): number {
     return 500;
   }

   isVisible(): boolean {
     return this.visible;
   }

   setVisible(visible: boolean): void {
     this.visible = visible;
   }
   ```

5. **Fixed duplicate fields**: Removed duplicate `isVisible` fields in:
   - CombatHUDPanel (had both `visible` and `isVisible` fields)
   - CraftingStationPanel (had both `visible` and `isVisible` fields)
   - SettingsPanel (had both `visible` and `isVisible` fields)

## Remaining Issues

### Render Method Signature Mismatches

Many panels have `render()` methods with signatures that don't match `IWindowPanel`:

**Expected by IWindowPanel:**
```typescript
render(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  world?: any
): void
```

**Current signatures in many panels:**
- `render(ctx, canvasWidth, canvasHeight, world)` - AnimalInfoPanel, MemoryPanel, etc.
- `render(ctx, width, height, world)` - DivineChatPanel, DevPanel, etc.
- `render(ctx, world)` - ShopPanel

These panels calculate their own positioning instead of using the x/y parameters provided by WindowManager.

### Panels with Private Render

- **AgentRosterPanel**: Has `private render()` - needs to be public
- **TimelinePanel**: Has `private render()` - needs to be public

### Build Errors Remaining

TypeScript compilation currently shows ~40 errors related to:
1. Render method signature mismatches (most errors)
2. HandleScroll signature mismatches in a few panels
3. RenderHeader signature mismatch in CraftingStationPanel

## Files Modified

### Core Panel Files (29 files)
```
/Users/annhoward/src/ai_village/custom_game_engine/packages/renderer/src/
├── AgentInfoPanel.ts
├── AgentRosterPanel.ts
├── AgentSelectionPanel.ts
├── AnimalInfoPanel.ts
├── CombatHUDPanel.ts
├── CombatLogPanel.ts
├── CombatUnitPanel.ts
├── CraftingStationPanel.ts
├── DevPanel.ts
├── DivineChatPanel.ts
├── DivinePowersPanel.ts
├── EconomyPanel.ts
├── FarmManagementPanel.ts
├── GovernanceDashboardPanel.ts
├── IngredientPanel.ts
├── LLMConfigPanel.ts
├── MagicSystemsPanel.ts
├── MemoryPanel.ts
├── NotificationsPanel.ts
├── PendingApprovalsPanel.ts
├── PlantInfoPanel.ts
├── RelationshipsPanel.ts
├── ResourcesPanel.ts
├── SettingsPanel.ts
├── ShopPanel.ts
├── SpellbookPanel.ts
├── TileInspectorPanel.ts
├── TimelinePanel.ts
├── UnifiedHoverInfoPanel.ts
└── VisionComposerPanel.ts
```

## Next Steps

To fully resolve the WindowManager integration, the following work is needed:

1. **Update render() signatures**: All panels need to accept (x, y, width, height) parameters and use them for positioning instead of calculating their own positions

2. **Make render() public**: AgentRosterPanel and TimelinePanel need their render methods made public

3. **Fix handleScroll signatures**: A few panels have `handleScroll(deltaY)` but the interface expects `handleScroll(deltaY, contentHeight): boolean`

4. **Fix renderHeader signature**: CraftingStationPanel's renderHeader has wrong parameters

## Automation Script

Created `/tmp/fix_all_panels.py` to automate adding the basic IWindowPanel methods. This script:
- Adds IWindowPanel import
- Adds `implements IWindowPanel` to class declaration
- Adds `private visible: boolean = false;` field if missing
- Adds all 6 required methods (getId, getTitle, getDefaultWidth, getDefaultHeight, isVisible, setVisible)

Script successfully processed all 26 panels that needed updates.
