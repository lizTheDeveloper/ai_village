# MVEE Mobile Window System + Touch UX — Design Document

**Author:** Iris (UI Designer)
**Date:** 2026-03-26
**Status:** Design Review
**Ticket:** MUL-3745

---

## Table of Contents

1. [Desktop Window/Panel Audit](#1-desktop-windowpanel-audit)
2. [Mobile Wireframes per Window Type](#2-mobile-wireframes-per-window-type)
3. [Interaction Spec](#3-interaction-spec)
4. [Technical Design: Mobile Renderer](#4-technical-design-mobile-renderer)
5. [Additional Mobile Concerns](#5-additional-mobile-concerns)

---

## 1. Desktop Window/Panel Audit

### Current Architecture

The desktop UI uses a **canvas-rendered** window manager (`WindowManager.ts`, 1144 lines) with:
- Non-overlapping placement via spiral search
- LRU auto-close when screen space exhausted
- Draggable title bars (30px height), resizable corners (16px handle)
- localStorage layout persistence
- Z-index layering, pinning, minimization

All panels implement `IWindowPanel` and render to a 2D canvas context. There is **no DOM-based panel system** — everything is canvas-drawn.

### Complete Panel Inventory

| Category | Panel | Default Size (est.) | Desktop Shortcut | Complexity | Mobile Priority |
|----------|-------|---------------------|------------------|------------|-----------------|
| **Character** | AgentInfoPanel | 400×500 | Click agent | High (tabs: info, skills, inventory, memories) | P0 — core loop |
| | AgentRosterPanel | 300×400 | — | Medium (scrollable list) | P1 |
| | AgentSelectionPanel | 500×400 | — | Medium (creation cards) | P0 — onboarding |
| | AgentCreationCards | 600×400 | — | Medium (card grid) | P0 — onboarding |
| **Animals** | AnimalInfoPanel | 400×500 | Click animal | High (genetics, behavior) | P1 |
| | AnimalRosterPanel | 300×400 | — | Medium (scrollable list) | P2 |
| **Plants** | PlantInfoPanel | 400×500 | Click plant | High (genetics, growth) | P2 |
| **Gameplay** | BuildingPlacementUI | Overlay | — | High (grid preview, rotation) | P0 — core loop |
| | CraftingPanelUI | 400×350 | C | Medium (recipe list, queue) | P1 |
| | CraftingStationPanel | 400×350 | — | Medium | P1 |
| | InventoryUI | 350×400 | I/Tab | High (drag-drop grid) | P0 — core loop |
| | ResourcesPanel | 300×300 | R | Low (stats list) | P1 |
| | ShopPanel | 400×400 | — | Medium (buy/sell) | P1 |
| | FarmManagementPanel | 400×350 | — | Medium | P2 |
| **Management** | CityManagerPanel | 500×400 | — | High (zoning, layout) | P1 |
| | GovernanceDashboardPanel | 600×500 | — | Very High (laws, voting) | P2 |
| | EconomyPanel | 500×400 | E | High (charts, trade routes) | P2 |
| | TimeControlsPanel | 300×100 | 1-3, +/- | Low (pause/speed) | P0 — always visible |
| | CityStatsWidget | 200×150 | — | Low (HUD overlay) | P0 — HUD |
| **Combat** | CombatHUDPanel | Overlay | — | High (real-time) | P1 |
| | CombatLogPanel | 400×300 | — | Medium (scrollable) | P2 |
| | CombatUnitPanel | 300×300 | — | Medium | P2 |
| **Information** | MemoryPanel | 400×400 | M | High (memory visualization) | P2 |
| | RelationshipsPanel | 500×500 | — | Very High (network graph) | P2 |
| | TileInspectorPanel | 350×400 | Right-click | Medium | P1 |
| | NotificationsPanel | 300×400 | — | Low (feed) | P1 |
| | CivilizationChroniclePanel | 500×400 | — | Medium (timeline) | P2 |
| | TimelinePanel | 500×300 | — | Medium | P2 |
| **Magic/Divine** | DivinePowersPanel | 500×500 | — | Very High (power grid) | P1 |
| | DivineChatPanel | 400×500 | — | High (chat interface) | P1 |
| | SpellbookPanel | 500×400 | — | High (spell list, details) | P2 |
| | MagicSystemsPanel | 400×350 | — | Medium | P2 |
| | SkillTreePanel | 600×500 | — | Very High (tree visualization) | P2 |
| | VisionComposerPanel | 500×400 | — | High | P2 |
| | SpellSandboxPanel | 500×400 | — | High | P3 |
| **Chat** | ChatPanel | 400×400 | — | Medium (text I/O) | P1 |
| | TextAdventurePanel | 400×500 | — | Medium | P2 |
| **System** | SettingsPanel | 400×500 | Esc | Medium (form controls) | P0 |
| | ControlsPanel | 350×300 | H | Low (help text) | P1 |
| | MenuBar | Full width × 30 | — | Medium (dropdown menus) | P0 — navigation |
| | OnboardingOverlay | Full screen | — | Medium (tutorial) | P0 |
| **Screens** | PlanetCreationScreen | Full screen | — | High (config wizard) | P0 — onboarding |
| | PlanetJoinScreen | Full screen | — | Medium | P0 |
| | PlanetListScreen | Full screen | — | Medium (grid) | P0 |
| | UniverseBrowserScreen | Full screen | — | High | P1 |
| | UniverseConfigScreen | Full screen | — | Very High (65KB) | P1 |
| | SettlementSelectionScreen | Full screen | — | Medium | P1 |
| | GenesisCinematicPanel | Full screen | — | Medium (animation) | P1 |
| | CosmicHubScreen | Full screen | — | High | P1 |
| **Modals** | DiscoveryNamingModal | 400×250 | — | Low (text input) | P1 |
| | DivineParameterModal | 400×300 | — | Low (form) | P1 |
| **Dev** | DevPanel | 600×800 | — | Very High (111KB) | P3 — dev only |
| | LLMConfigPanel | 400×350 | — | Medium | P3 |
| | LLMSettingsPanel | 400×400 | — | Medium | P3 |

### Context Menu System

Desktop uses a **radial context menu** (`ContextMenuManager.ts`, `ContextMenuRenderer.ts`) triggered by right-click. This has no mobile equivalent and needs a long-press replacement.

### Keyboard Shortcuts (Need Touch Alternatives)

| Action | Desktop Key | Mobile Replacement |
|--------|-------------|-------------------|
| Toggle resources | R | Bottom nav tab |
| Toggle memory | M | Agent info sub-tab |
| Toggle tile inspector | T | Tap tile |
| Toggle inventory | I/Tab | Bottom nav tab |
| Toggle crafting | C | Bottom nav tab |
| Toggle economy | E | Menu drawer item |
| Toggle help | H | Menu drawer item |
| Speed up | + | Time control HUD button |
| Slow down | - | Time control HUD button |
| Skip 1 hour | 1 | Time control long-press menu |
| Skip 1 day | 2 | Time control long-press menu |
| Pause/unpause | 3 | Time control tap |
| Zoom in/out | Z/X, wheel | Pinch gesture |
| Rotate building | Q/E | On-screen rotate button |
| Escape/close | Esc | Back gesture / X button |
| Spawn entities | 4-7 | Dev drawer (hidden) |

---

## 2. Mobile Wireframes per Window Type

### 2.1 Layout Philosophy

**Desktop:** Multiple floating, overlapping windows. Average user has 2-3 open.
**Mobile:** Single full-height panel at a time, sliding from bottom or side. Game world always partially visible.

### 2.2 Mobile Layout Zones

```
┌──────────────────────────┐
│  Status Bar (HUD)    48px│  ← City stats, time, resources summary
├──────────────────────────┤
│                          │
│                          │
│     GAME WORLD           │  ← Touch: tap select, pinch zoom, drag pan
│     (Canvas)             │
│                          │
│                          │
├──────────────────────────┤
│  Quick Action Bar    56px│  ← Context-sensitive: selected entity actions
├──────────────────────────┤
│  Bottom Nav          64px│  ← 4-5 primary tabs + hamburger
└──────────────────────────┘
```

When a panel is open:

```
┌──────────────────────────┐
│  Status Bar (HUD)    48px│
├──────────────────────────┤
│  Game World (30%)        │  ← Compressed but still visible
├──────────────────────────┤
│  ┌─ Panel Header ──────┐ │  ← Drag handle, title, close X
│  │  [Tab1] [Tab2] [Tab3]│ │  ← Horizontal scrollable tabs
│  ├──────────────────────┤ │
│  │                      │ │
│  │  Panel Content       │ │  ← Scrollable content area
│  │  (one control/row)   │ │
│  │                      │ │
│  └──────────────────────┘ │
├──────────────────────────┤
│  Bottom Nav          64px│
└──────────────────────────┘
```

### 2.3 Window Type Mobile Patterns

#### Pattern A: Bottom Sheet (most panels)

Used for: AgentInfoPanel, AnimalInfoPanel, InventoryUI, CraftingPanelUI, ResourcesPanel, ShopPanel, TileInspectorPanel, ChatPanel, DivinePowersPanel, MemoryPanel, SettingsPanel

```
┌────────────────────┐
│ ═══ drag handle ═══│  ← 4px × 32px centered bar
│ Agent: Elara    [X]│  ← 48px header with close button
│ [Info][Skills][Inv]│  ← 44px tab bar (scrollable if >4 tabs)
├────────────────────┤
│ ┌─ Name ─────────┐ │
│ │ Elara           │ │  One field per row
│ ├─ Mood ─────────┤ │
│ │ 😊 Happy (78%) │ │  Min row height: 48px
│ ├─ Health ───────┤ │
│ │ ████████░░ 80%  │ │  Touch-friendly controls
│ ├─ Skills ───────┤ │
│ │ Farming     Lv3 │ │
│ │ Cooking     Lv2 │ │
│ └────────────────┘ │
└────────────────────┘
```

- **Half-sheet** (default): 50% screen height. Swipe up → full sheet.
- **Full-sheet**: 85% screen height. Swipe down → half. Swipe down again → dismiss.
- **Min tap target**: 44×44px for all interactive elements.

#### Pattern B: Full Screen (screens & complex panels)

Used for: PlanetCreationScreen, UniverseBrowserScreen, UniverseConfigScreen, SkillTreePanel, RelationshipsPanel, GovernanceDashboardPanel

```
┌────────────────────┐
│ [←] Planet Create  │  ← 56px nav bar with back button
├────────────────────┤
│ Step 1 of 4        │  ← Progress indicator
│ ┌────────────────┐ │
│ │                │ │
│ │ Planet Name    │ │  Wizard-style stepped flow
│ │ [___________]  │ │  instead of dense form
│ │                │ │
│ │ Planet Size    │ │
│ │ ○ S ● M ○ L   │ │  Radio buttons, not dropdowns
│ │                │ │
│ └────────────────┘ │
│        [Next →]    │  ← Sticky bottom action button
└────────────────────┘
```

- Replaces the game world entirely.
- Back button returns to game.
- Complex forms broken into multi-step wizards.

#### Pattern C: Overlay HUD (always-visible elements)

Used for: TimeControlsPanel, CityStatsWidget, CombatHUDPanel, BuildingPlacementUI, NotificationsPanel (toasts)

```
┌──────────────────────────┐
│ 🏘 Pop:24 🌾12 🪨8  ⏸▶▶│  ← Top HUD bar, always visible
├──────────────────────────┤
│                          │
│     GAME WORLD           │
│                          │  Notifications appear as
│            ┌───────────┐ │  dismissible toasts
│            │ New event! │ │
│            └───────────┘ │
│                          │
│  [🔄] [✓] [❌]          │  ← Building placement: floating buttons
└──────────────────────────┘
```

- Compact, translucent, non-blocking.
- Time controls: single tap = pause/play, long-press = speed menu.
- Building placement: floating action buttons instead of keyboard shortcuts.

#### Pattern D: Action Sheet (context menus, quick actions)

Used for: ContextMenu (replacing radial), entity quick-actions, building rotation

```
┌────────────────────┐
│    ← backdrop dim →│
│                    │
│ ┌────────────────┐ │
│ │ Elara          │ │  ← Entity name header
│ ├────────────────┤ │
│ │ 💬 Talk        │ │  48px row height
│ │ 📦 Trade       │ │  Icon + label
│ │ 🔍 Inspect     │ │
│ │ ⚔️ Command     │ │
│ ├────────────────┤ │
│ │    Cancel       │ │  ← Always visible cancel
│ └────────────────┘ │
└────────────────────┘
```

- Triggered by long-press on entity/tile (replaces right-click).
- iOS-style action sheet from bottom.
- Dismiss via Cancel or tap outside.

### 2.4 Specific Panel Adaptations

#### Inventory (Pattern A — Bottom Sheet + Grid)

Desktop: Drag-drop grid with hover tooltips.
Mobile:
- Grid cells enlarged to 48×48px minimum (from ~32px desktop)
- Tap to select item → shows detail bar above grid
- Tap-drag to move items (with haptic feedback if available)
- Long-press for item context menu (use, drop, inspect)
- No hover tooltips — replaced by tap-to-inspect

```
┌────────────────────┐
│ ═══ Inventory  [X] │
│ [All][Equip][Food] │
├────────────────────┤
│ ┌──┬──┬──┬──┬──┐   │
│ │🗡│🛡│🍎│🪨│  │   │  48px cells, 5 per row
│ ├──┼──┼──┼──┼──┤   │
│ │🧪│📜│  │  │  │   │
│ └──┴──┴──┴──┴──┘   │
│ ┌─ Iron Sword ───┐  │  ← Selected item detail
│ │ ATK: 12  Dur: 8│  │
│ │ [Use] [Drop]   │  │  44px action buttons
│ └────────────────┘  │
└────────────────────┘
```

#### Crafting (Pattern A — Bottom Sheet + Vertical List)

Desktop: Side-by-side recipe browser and crafting queue.
Mobile:
- Vertical recipe list, one recipe per row (icon + name + cost)
- Tap recipe → expands inline to show ingredients + craft button
- Queue shown as horizontal scroll strip at top

```
┌────────────────────┐
│ ═══ Crafting   [X] │
│ Queue: [🗡][🛡]→   │  ← Horizontal scroll queue
│ [Weapons][Tools]   │  ← Category tabs
├────────────────────┤
│ 🗡 Iron Sword      │
│   ├ 🪨 Iron ×3    │  ← Expanded recipe
│   ├ 🪵 Wood ×1    │
│   └ [Craft]       │  ← 48px button
│ 🛡 Wooden Shield   │  ← Collapsed
│ 🏹 Short Bow       │
└────────────────────┘
```

#### Skill Tree (Pattern B — Full Screen + Pinch/Pan)

Desktop: Large canvas with node graph.
Mobile:
- Full screen takeover
- Pinch to zoom, drag to pan (same gestures as game world)
- Tap node to inspect, double-tap to unlock
- Mini-map in corner showing position in tree

#### Building Placement (Pattern C — Overlay)

Desktop: Ghost preview follows mouse, Q/E rotate, click to place.
Mobile:
- Ghost preview follows touch-drag from building button
- Floating buttons: Rotate CW, Rotate CCW, Confirm, Cancel
- Grid snapping with subtle haptic feedback
- Two-finger rotate as alternative to buttons

#### Chat/Divine Chat (Pattern A — Bottom Sheet)

Desktop: Scrollable message log + text input.
Mobile:
- Standard chat interface (Messages-like)
- Bottom text input with send button (48px height)
- Keyboard pushes sheet up (handles viewport resize)
- Messages take full width, no side padding waste

---

## 3. Interaction Spec

### 3.1 Open/Close Patterns

| Trigger | Desktop | Mobile |
|---------|---------|--------|
| Open panel | Click shortcut key / menu item | Tap bottom nav tab / menu drawer item |
| Close panel | Click X / Esc / shortcut toggle | Swipe down on sheet / tap X / back gesture |
| Switch panel | Open new (LRU closes old) | New panel replaces current sheet |
| Entity inspect | Left-click entity | Tap entity → quick bar; long-press → action sheet |
| Context menu | Right-click | Long-press (300ms threshold) |
| Close all | Esc | Swipe down / physical back button |

### 3.2 Panel Transition Animations

- **Open bottom sheet**: Slide up from bottom, 250ms ease-out
- **Close bottom sheet**: Slide down, 200ms ease-in
- **Full screen open**: Slide in from right, 300ms ease-out
- **Full screen close**: Slide out to right (back gesture), 250ms ease-in
- **Tab switch**: Cross-fade content, 150ms
- **Action sheet**: Slide up + backdrop fade, 200ms

### 3.3 Tab Navigation

Desktop tabs become horizontal scrollable tab bar on mobile:
- Active tab has underline indicator
- Swipe left/right on content area to switch tabs
- Tab bar scrolls horizontally if >4 tabs
- Tab labels may truncate with ellipsis; icons preferred where possible

### 3.4 Scroll Behavior

- **Panel content**: Native momentum scroll (overflow-y: auto on content area)
- **Lists**: Virtual scrolling for lists >50 items (agent roster, memory list)
- **Game world**: Drag to pan (differentiated from panel scroll by touch target)
- **Conflict resolution**: Touches on panel → panel scroll; touches on game world → pan. No ambiguity.

### 3.5 Multi-Window Coexistence

**Mobile rule: One panel at a time.** No overlapping windows.

Exceptions:
- **HUD elements** (time controls, city stats) are always visible above the game world
- **Toasts/notifications** overlay everything for 3-5 seconds
- **Action sheets** overlay the current panel with a backdrop
- **Modals** (naming, parameter input) overlay everything with backdrop

### 3.6 Gesture Map

| Gesture | Zone | Action |
|---------|------|--------|
| Tap | Game world | Select entity under finger |
| Tap | Bottom nav | Open/toggle panel |
| Tap | Panel content | Interact with control |
| Long-press (300ms) | Game world | Open entity action sheet |
| Long-press (300ms) | Item in inventory | Item context menu |
| Pinch | Game world | Zoom in/out (0.5x–2.5x) |
| Drag (1 finger) | Game world | Pan camera |
| Drag (1 finger) | Panel drag handle | Resize sheet (half ↔ full ↔ dismiss) |
| Drag (1 finger) | Panel content | Scroll content |
| Swipe left/right | Tab content area | Switch tabs |
| Swipe down | Panel (from top) | Dismiss panel |
| Double-tap | Game world | Quick-zoom to entity |
| Double-tap | Skill tree node | Unlock/activate |

### 3.7 Input Priority

Touch events route through this priority chain:
1. **Modal/action sheet** (if open) — captures all
2. **Panel content** (if panel open and touch in panel bounds)
3. **HUD elements** (time controls, stats)
4. **Bottom navigation bar**
5. **Game world** (default — pan, zoom, select)

---

## 4. Technical Design: Mobile Renderer

### 4.1 Architecture: Mobile-Specific Renderer

The key insight: MVEE's introspection system already separates **data declaration** from **rendering**. Components define their fields with `visibility` and `ui.widget` metadata. A mobile renderer reads the same schemas but produces different layouts.

```
┌─────────────────────────────────────────────┐
│              Introspection Schemas           │
│  (defineComponent → fields, visibility, ui) │
└─────────┬──────────────────────┬────────────┘
          │                      │
   ┌──────▼──────┐       ┌──────▼──────┐
   │   Desktop    │       │   Mobile    │
   │  Renderer    │       │  Renderer   │
   │ (Canvas 2D)  │       │ (DOM-based) │
   │ WindowManager│       │ SheetManager│
   └─────────────┘       └─────────────┘
```

### 4.2 Proposed Module: `MobileRenderer`

**Location:** `packages/renderer/src/mobile/`

```
mobile/
├── MobileRenderer.ts          # Entry point, device detection
├── SheetManager.ts            # Bottom sheet lifecycle (replaces WindowManager)
├── MobileHUD.ts               # Always-visible HUD overlay
├── BottomNavigation.ts        # Bottom tab bar
├── ActionSheet.ts             # Long-press context menu
├── TouchInputHandler.ts       # Gesture recognition
├── MobileFieldRenderer.ts     # Introspection field → mobile widget
├── PanelAdapters/
│   ├── MobileAgentInfoAdapter.ts
│   ├── MobileInventoryAdapter.ts
│   ├── MobileCraftingAdapter.ts
│   └── ...                    # One per panel that needs custom mobile layout
└── styles/
    └── mobile.css             # Mobile-specific styles (if DOM-based)
```

### 4.3 Device Detection & Renderer Selection

```typescript
// In main entry point (demo/src/main.ts)
function selectRenderer(): 'desktop' | 'mobile' {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;

  // User can force via URL param: ?renderer=mobile
  const urlOverride = new URLSearchParams(location.search).get('renderer');
  if (urlOverride === 'mobile' || urlOverride === 'desktop') return urlOverride;

  return (isTouchDevice && isSmallScreen) ? 'mobile' : 'desktop';
}
```

### 4.4 SheetManager (Replaces WindowManager on Mobile)

Core behavior differences from WindowManager:

| Feature | WindowManager (Desktop) | SheetManager (Mobile) |
|---------|------------------------|----------------------|
| Panel display | Multiple floating windows | Single bottom sheet |
| Placement | Spiral search for non-overlap | Fixed: bottom of screen |
| Sizing | User-resizable | Half-sheet or full-sheet (snap points) |
| Dragging | Title bar drag | Drag handle for resize only |
| LRU eviction | Auto-close oldest | N/A (one at a time) |
| Persistence | localStorage positions | localStorage: last-open panel + sheet height |
| Z-index | Per-window | Fixed: game < HUD < sheet < modal |

```typescript
interface SheetConfig {
  panelId: string;
  snapPoints: ('half' | 'full')[];  // Allowed sizes
  defaultSnap: 'half' | 'full';
  canDismiss: boolean;               // false for critical panels
}

class SheetManager {
  private currentSheet: ActiveSheet | null = null;
  private sheetStack: string[] = [];  // For back navigation

  showPanel(panelId: string, config?: Partial<SheetConfig>): void;
  dismissPanel(): void;
  resizeToSnap(snap: 'half' | 'full'): void;
  getCurrentPanel(): string | null;
}
```

### 4.5 Introspection → Mobile Widget Mapping

The introspection system's `ui.widget` field maps to mobile-optimized controls:

| Introspection Widget | Desktop Render | Mobile Render |
|---------------------|----------------|---------------|
| `text` | Inline text | Full-width text field, 48px height |
| `slider` | Canvas slider | Native `<input type="range">`, 48px track |
| `checkbox` | Canvas checkbox | Native toggle switch, 44×44px |
| `dropdown` | Canvas dropdown | Native `<select>` or action sheet picker |
| `json` | Inline JSON | Expandable accordion with formatted view |
| `readonly` | Inline text | Full-width read-only row |

**Key change:** Mobile renderer should use **DOM elements** instead of canvas for panel content. This gives us:
- Native scrolling (momentum, rubber-band)
- Native form controls (keyboards, pickers)
- Accessibility (screen readers, VoiceOver)
- CSS-based responsive layout

The **game world** stays on canvas. Only the **UI overlay layer** becomes DOM-based.

### 4.6 MobileFieldRenderer

Reads introspection schemas and generates DOM elements:

```typescript
class MobileFieldRenderer {
  renderField(schema: FieldSchema, value: any, onMutate: MutateCallback): HTMLElement {
    const row = document.createElement('div');
    row.className = 'mobile-field-row';  // min-height: 48px
    row.style.minHeight = '48px';

    switch (schema.ui.widget) {
      case 'slider':
        return this.renderSlider(schema, value, onMutate);
      case 'checkbox':
        return this.renderToggle(schema, value, onMutate);
      case 'dropdown':
        return this.renderPicker(schema, value, onMutate);
      // ...
    }
  }

  renderComponentFields(
    componentType: string,
    entity: Entity,
    visibility: 'player' | 'user'
  ): HTMLElement {
    const schema = ComponentRegistry.get(componentType);
    const container = document.createElement('div');

    // Filter fields by visibility and sort by ui.order
    const visibleFields = Object.entries(schema.fields)
      .filter(([_, f]) => f.visibility[visibility])
      .sort((a, b) => (a[1].ui.order ?? 99) - (b[1].ui.order ?? 99));

    // One field per row
    for (const [name, fieldSchema] of visibleFields) {
      container.appendChild(
        this.renderField(fieldSchema, entity.getComponent(componentType)[name], ...)
      );
    }

    return container;
  }
}
```

### 4.7 TouchInputHandler

Replaces `MouseHandler.ts` and `KeyboardHandler.ts` on mobile:

```typescript
class TouchInputHandler {
  // Gesture recognition state
  private touches: Map<number, TouchState> = new Map();
  private gestureState: 'none' | 'tap' | 'pan' | 'pinch' | 'longpress' = 'none';
  private longPressTimer: number | null = null;

  // Thresholds
  static LONG_PRESS_MS = 300;
  static TAP_MAX_MOVE_PX = 10;
  static PINCH_MIN_DISTANCE_CHANGE = 5;

  constructor(canvas: HTMLCanvasElement, private sheetManager: SheetManager) {
    // Use PointerEvents (not TouchEvents) for unified handling
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);

    // Prevent default to avoid browser gestures
    canvas.style.touchAction = 'none';
  }

  // Routes gestures to appropriate handlers
  private resolveGesture(): void {
    // 1 finger, minimal movement, short duration → tap
    // 1 finger, minimal movement, >300ms → long-press
    // 1 finger, significant movement → pan
    // 2 fingers, distance changing → pinch zoom
    // 2 fingers, distance stable → two-finger pan
  }
}
```

### 4.8 Integration Points

The mobile renderer hooks into existing systems at these points:

1. **Entry point** (`demo/src/main.ts`): Device detection → select renderer
2. **Game loop**: Mobile renderer subscribes to same world state
3. **Introspection schemas**: Read-only — no changes needed
4. **Event system**: Mobile emits same game events (entity-selected, panel-toggled, etc.)
5. **Input handler** (`demo/src/input/InputHandler.ts`): Swap MouseHandler/KeyboardHandler for TouchInputHandler
6. **Window registration**: Panels register with SheetManager instead of WindowManager (adapter pattern)

### 4.9 Panel Adapter Strategy

Existing `IWindowPanel` implementations render to canvas. Rather than rewriting all 40+ panels:

**Phase 1:** Create `MobilePanelAdapter` that wraps existing canvas panels in a DOM container with a hidden canvas. The panel renders to the off-screen canvas, which is displayed as-is.

**Phase 2:** Incrementally replace high-priority panels (P0, P1) with native DOM implementations using `MobileFieldRenderer` + introspection schemas.

**Phase 3:** Low-priority panels stay as canvas-in-DOM until needed.

```typescript
// Phase 1 adapter
class MobilePanelAdapter {
  private offscreenCanvas: HTMLCanvasElement;

  constructor(private panel: IWindowPanel) {
    this.offscreenCanvas = document.createElement('canvas');
  }

  renderToDOM(container: HTMLElement, width: number, height: number, world: any): void {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    const ctx = this.offscreenCanvas.getContext('2d')!;
    this.panel.render(ctx, 0, 0, width, height, world);
    container.innerHTML = '';
    container.appendChild(this.offscreenCanvas);
  }
}
```

---

## 5. Additional Mobile Concerns

### 5.1 PointerEvent Migration

**Current state:** Mouse events (`mousedown`, `mouseup`, `mousemove`, `wheel`).
**Target:** `PointerEvent` API — works for mouse, touch, and stylus.

Migration path:
- Replace `mousedown` → `pointerdown`, `mouseup` → `pointerup`, `mousemove` → `pointermove`
- Add `touch-action: none` CSS on canvas to prevent browser gesture interference
- Use `pointerId` for multi-touch tracking
- `wheel` event stays for desktop scroll-zoom (no touch equivalent needed)

### 5.2 Touch Alternatives for Keyboard Controls

See Section 1 table (Keyboard Shortcuts → Mobile Replacement). Summary:
- **Bottom nav bar**: 4-5 most-used panels (Inventory, Crafting, Resources, Chat, Menu)
- **Hamburger menu**: All other panels accessible from drawer
- **HUD buttons**: Time controls, building placement controls
- **Gestures**: Pinch zoom, drag pan, long-press context menu
- **On-screen D-pad**: Not needed (tap-to-interact model, not direct movement)

### 5.3 Bundle Splitting

**Current:** 7.7MB single JS chunk. Unacceptable for mobile (3G: ~25s download).

**Proposed split:**

| Chunk | Contents | Est. Size | Load Timing |
|-------|----------|-----------|-------------|
| `core` | ECS, world, core systems | ~1.5MB | Initial |
| `renderer-2d` | Canvas renderer, sprites | ~1.5MB | Initial |
| `renderer-3d` | Three.js, 3D renderer | ~2MB | Lazy (if 3D selected) |
| `panels` | All panel implementations | ~1.5MB | Lazy (on first panel open) |
| `introspection` | Schemas, renderers | ~0.5MB | Lazy (on first inspect) |
| `magic-divine` | Magic + divine systems | ~0.7MB | Lazy (when unlocked) |
| `vendor` | Other deps | Variable | Initial (cached) |

Vite config changes:
```typescript
manualChunks(id) {
  if (id.includes('three')) return 'vendor-three';
  if (id.includes('/renderer/src/Renderer3D')) return 'renderer-3d';
  if (id.includes('/renderer/src/') && id.match(/Panel|Modal|Screen/)) return 'panels';
  if (id.includes('/introspection/')) return 'introspection';
  if (id.includes('/magic/') || id.includes('/divinity/')) return 'magic-divine';
  if (id.includes('/packages/')) return 'engine';
  if (id.includes('node_modules/')) return 'vendor';
}
```

### 5.4 WebGPU → WebGL Fallback

**Current:** Unclear if renderer uses WebGPU. The 2D renderer uses Canvas 2D context. The 3D renderer uses Three.js.

**Mobile concern:** WebGPU support is limited on mobile (Chrome Android 121+, no iOS Safari yet as of early 2026).

**Recommendation:**
- **2D renderer** (Canvas 2D): Works everywhere. No changes needed.
- **3D renderer** (Three.js): Already uses WebGL by default. Verify Three.js version doesn't default to WebGPU renderer. Add explicit `WebGLRenderer` instantiation.
- **Test matrix:** iPhone 14 (Safari), Android Chrome, Samsung Internet

### 5.5 SharedArrayBuffer / COOP / COEP for Mobile Safari

**What:** SharedArrayBuffer requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers. Without them, SharedArrayBuffer is undefined.

**Impact:** If MVEE uses SharedWorker or SharedArrayBuffer (the `shared-worker` package exists), Safari will block it.

**Server headers required:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**Mobile Safari specifics:**
- COOP/COEP supported since Safari 15.2
- All cross-origin resources need `crossorigin` attribute
- External images/fonts need CORS headers or `Cross-Origin-Resource-Policy: cross-origin`

**Recommendation:** Audit all cross-origin resource loads. Add headers to the game server. Test in Safari private browsing mode (stricter).

### 5.6 Lazy-Load Sprites (40MB)

**Current:** Sprites loaded on-demand via PixelLab daemon, cached to disk.

**Mobile optimization:**
1. **Progressive loading**: Load placeholder (single-frame, south-facing) first, then full 8-direction animations
2. **Resolution tiers**: Serve 1x sprites on mobile, 2x on desktop (halves data)
3. **Viewport priority**: Only load sprites for visible entities. Off-screen entities get placeholder.
4. **Cache strategy**: Service Worker with Cache API for persistent sprite caching across sessions
5. **Format**: Convert PNG → WebP for ~30% size reduction (all target browsers support WebP)
6. **Budget**: Target <5MB initial sprite load, <15MB after 10 minutes of play

### 5.7 Sound OFF by Default on Mobile

**Implementation:**
```typescript
// In audio initialization
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window && window.innerWidth < 768);

const defaultAudioSettings = {
  masterVolume: isMobile ? 0 : 0.7,
  musicVolume: isMobile ? 0 : 0.5,
  sfxVolume: isMobile ? 0 : 0.8,
  muteOnMobile: true
};
```

Also required: Audio context must be created/resumed after user gesture (autoplay policy). Add a "Tap to enable sound" prompt on first interaction.

### 5.8 Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial JS load | <2MB (gzipped) | Webpack bundle analyzer |
| Time to interactive | <5s on 4G | Lighthouse |
| Time to first paint | <2s | Lighthouse |
| FPS during gameplay | 30fps minimum | requestAnimationFrame timing |
| Memory usage | <300MB | Performance.memory API |
| Touch response latency | <100ms | Manual testing |
| Panel open animation | <300ms | Manual testing |

### 5.9 Viewport & Orientation

- **Support both portrait and landscape**. Portrait is primary.
- Lock to portrait via manifest if needed: `"orientation": "portrait-primary"`
- Handle safe areas (notch, home indicator): `env(safe-area-inset-*)` CSS
- Handle virtual keyboard: listen for `visualViewport` resize events, adjust sheet position

---

## Appendix A: Priority Phases

### Phase 1: Playable on Mobile (P0 panels)
- Device detection + renderer selection
- TouchInputHandler (tap, pan, pinch, long-press)
- SheetManager (bottom sheet)
- Bottom navigation bar
- Mobile HUD (time controls, stats)
- AgentInfoPanel mobile adaptation
- InventoryUI mobile adaptation
- BuildingPlacementUI mobile adaptation
- OnboardingOverlay mobile adaptation
- SettingsPanel mobile
- PlanetCreation/Join/List screens mobile
- Bundle splitting
- Sound off by default

### Phase 2: Feature Complete (P1 panels)
- All gameplay panels (crafting, resources, shop, tile inspector)
- Combat HUD mobile
- Divine powers/chat mobile
- Chat panel mobile
- Context menu → action sheet
- Roster panels
- Notifications
- Controls help
- Sprite lazy-loading optimization
- Service Worker caching

### Phase 3: Polish (P2+ panels)
- Memory, relationships, economy panels
- Governance, chronicle, timeline
- Magic/spellbook panels
- Universe browser/config
- Network panel
- Performance optimization pass
- Accessibility audit (VoiceOver, TalkBack)

### Phase 4: Dev Tools (P3)
- DevPanel mobile (if needed)
- LLM config/settings mobile (admin use only)
