# TESTS WRITTEN: context-menu-ui

**Timestamp:** 2025-12-31
**Work Order:** [custom_game_engine/agents/autonomous-dev/work-orders/context-menu-ui/work-order.md](../../work-orders/context-menu-ui/work-order.md)
**Test Agent:** test-agent
**Phase:** TDD Red Phase (Pre-Implementation)

---

## Test Files Created

1. `packages/renderer/src/__tests__/ContextMenuManager.test.ts`
2. `packages/renderer/src/__tests__/MenuContext.test.ts`
3. `packages/renderer/src/__tests__/ContextActionRegistry.test.ts`
4. `packages/renderer/src/__tests__/ContextMenuRenderer.test.ts`
5. `packages/renderer/src/__tests__/ContextMenuIntegration.test.ts`

**Total Test Count:** 197 tests

---

## Test Coverage by Acceptance Criteria

### ✅ Criterion 1: Radial Menu Display
- Display menu at click position
- Calculate arc angles for items
- Show items with icons, labels, shortcuts
- Configure inner/outer radius
- Update hover state on mouse movement
- Close on outside click, Escape, or action execution
- Emit events on open/close

### ✅ Criterion 2: Context Detection
- Detect empty tile, agent, building, resource contexts
- Prioritize entity types correctly
- Include selection state
- Filter actions by applicability

### ✅ Criterion 3: Agent Context Actions
- Move Here (with selection)
- Follow action
- Talk To action
- Inspect action
- Disabled state handling

### ✅ Criterion 4: Building Context Actions
- Enter (with canEnter/locked checks)
- Repair (health < 100%)
- Demolish (with confirmation)
- Inspect

### ✅ Criterion 5: Selection Context Menu
- Move All Here
- Create Group
- Scatter
- Formation submenu (Line, Column, Circle, Spread)
- Apply to all selected entities

### ✅ Criterion 6: Empty Tile Actions
- Move Here (requires selection + walkable)
- Build submenu
- Place Waypoint
- Focus Camera
- Tile Info

### ✅ Criterion 7: Resource/Harvestable Actions
- Harvest (amount > 0)
- Assign Worker (requires selection)
- Prioritize submenu (High/Normal/Low/Forbid)
- Info

### ✅ Criterion 8: Keyboard Shortcuts
- Display shortcuts on items
- Execute action on keypress
- Context-aware shortcuts without menu

### ✅ Criterion 9: Submenu Navigation
- Submenu indicators
- Open on hover
- Navigate back
- Multiple levels
- Menu stack/breadcrumb

### ✅ Criterion 10: Action Confirmation
- Show confirmation dialog
- List consequences
- Confirm/cancel handling

### ✅ Criterion 11: Visual Feedback
- Hover effects (scale, brightness)
- Selection animation
- Disabled state opacity
- Cursor changes
- Connector line to target

### ✅ Criterion 12: Menu Lifecycle
- Open/close animations
- Event listener cleanup
- Prevent camera drag
- Single menu at a time

---

## Error Handling Tests

Per CLAUDE.md requirements, all tests include error path validation:

- ❌ Missing required parameters throw exceptions
- ❌ Invalid coordinates throw
- ❌ Non-existent actions throw
- ❌ Null/undefined dependencies throw
- ❌ Invalid radius configurations throw
- ❌ Empty items arrays throw

**No silent fallbacks** - all error conditions explicitly tested.

---

## Integration Tests

Full workflow tests covering:

1. **Agent Interaction:** Follow, Talk, Inspect
2. **Building Interaction:** Enter, Repair, Demolish (with confirmation)
3. **Resource Harvesting:** Harvest, Assign Worker, Prioritize
4. **Multi-Agent Selection:** Move All, Create Group, Formations
5. **Empty Tile Actions:** Build, Waypoint, Focus Camera
6. **InputHandler Integration:** Right-click events, camera drag prevention
7. **Keyboard Shortcuts:** Menu and context-aware execution
8. **Error Recovery:** Failed actions, animation interruption

---

## Test Status

**Status:** All tests FAILING (expected - TDD red phase)

**Sample Error Output:**
```
Error: Failed to resolve import "../ContextMenuManager" from "packages/renderer/src/__tests__/ContextMenuManager.test.ts". Does the file exist?
Error: Failed to resolve import "../context-menu/MenuContext" from "packages/renderer/src/__tests__/MenuContext.test.ts". Does the file exist?
Error: Failed to resolve import "../context-menu/ContextActionRegistry" from "packages/renderer/src/__tests__/ContextActionRegistry.test.ts". Does the file exist?
Error: Failed to resolve import "../ContextMenuRenderer" from "packages/renderer/src/__tests__/ContextMenuRenderer.test.ts". Does the file exist?
Error: Failed to resolve import "../ContextMenuManager" from "packages/renderer/src/__tests__/ContextMenuIntegration.test.ts". Does the file exist?
```

This is **correct** and expected behavior. The implementation files do not exist yet.

---

## Implementation Files Expected

Based on test imports, Implementation Agent should create:

### Main Files
- `packages/renderer/src/ContextMenuManager.ts`
- `packages/renderer/src/ContextMenuRenderer.ts`

### Context Menu Subdirectory
- `packages/renderer/src/context-menu/MenuContext.ts`
- `packages/renderer/src/context-menu/ContextActionRegistry.ts`
- `packages/renderer/src/context-menu/types.ts`

### Action Definitions
- `packages/renderer/src/context-menu/actions/AgentActions.ts`
- `packages/renderer/src/context-menu/actions/BuildingActions.ts`
- `packages/renderer/src/context-menu/actions/ResourceActions.ts`
- `packages/renderer/src/context-menu/actions/TileActions.ts`

### Modifications
- `packages/renderer/src/InputHandler.ts` - Add right-click handler
- `packages/renderer/src/Renderer.ts` - Integrate ContextMenuManager
- `packages/renderer/src/index.ts` - Export types
- `demo/src/main.ts` - Initialize context menu

---

## Next Steps

1. **Implementation Agent** should implement all files to make tests pass
2. After implementation, run: `npm test -- ContextMenu`
3. All 197 tests should PASS
4. **Playtest Agent** should verify UI behaviors manually

---

## Ready for Implementation Agent

Tests are complete and verified to fail correctly. Implementation can begin.

**Handoff:** Implementation Agent, please proceed with implementation.
