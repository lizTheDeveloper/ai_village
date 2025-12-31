# SPEC COMPLETE: conflict-combat-ui

**Timestamp:** 2025-12-31 02:43:58 UTC
**Agent:** spec-agent-001
**Status:** READY_FOR_TESTS

---

## Summary

Work order for Conflict/Combat UI feature is complete and ready for the Test Agent.

---

## Work Order Details

**Location:** `custom_game_engine/agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`

**Primary Spec:** `openspec/specs/ui-system/conflict.md`
**Supporting Specs:**
- `openspec/specs/conflict-system/spec.md` (conflict mechanics)
- `openspec/specs/agent-system/spec.md` (agent stats)

---

## Requirements Summary

### MUST Requirements (11 total)
1. Combat HUD overlay showing threat level and active conflicts
2. Health bars with injury indicators (color-coded by severity)
3. Combat unit panel with stats, equipment, injuries, stance
4. Stance controls (passive/defensive/aggressive/flee)
5. Threat indicators in world space with off-screen edge indicators
6. Combat log with event filtering and scrolling
7. Tactical overview with force summary and battle prediction
8. Defense management (zones, patrols, guard assignments)
9. Keyboard shortcuts for combat actions
10. Integration with conflict:started, conflict:resolved, injury:inflicted events
11. Visual style matching existing 8-bit pixel art aesthetic

### Acceptance Criteria (10 detailed)
- Combat HUD activation on conflict start
- Health bar display with color transitions (green→yellow→red)
- Combat unit panel showing all relevant data
- Stance control functionality with keyboard shortcuts (1-4)
- Threat indicator positioning (on-screen and edge indicators)
- Combat log event tracking with correct timestamps
- Tactical overview force calculations
- Injury display with healing progress
- Defense zone management integration with GuardDuty system
- Event integration verification

---

## System Integration

### Existing Systems Used
| System | File | Purpose |
|--------|------|---------|
| ConflictComponent | packages/core/src/components/ConflictComponent.ts | Conflict data source |
| InjuryComponent | packages/core/src/components/InjuryComponent.ts | Injury tracking |
| CombatStatsComponent | packages/core/src/components/CombatStatsComponent.ts | Combat stats |
| AgentCombatSystem | packages/core/src/systems/AgentCombatSystem.ts | Combat processing |
| EventBus | packages/core/src/events/EventBus.ts | Event subscriptions |
| WindowManager | packages/renderer/src/WindowManager.ts | Panel registration |

### New UI Components Required (10 files)
1. `CombatHUDPanel.ts` - Main combat overlay
2. `HealthBarRenderer.ts` - Health bar rendering system
3. `CombatUnitPanel.ts` - Detailed unit info panel
4. `StanceControlsPanel.ts` - Combat stance UI
5. `ThreatIndicatorRenderer.ts` - Threat visualization
6. `CombatLogPanel.ts` - Combat event log
7. `TacticalOverviewPanel.ts` - Strategic view
8. `DefenseManagementPanel.ts` - Defense zones/patrols
9. `DamageNumbersRenderer.ts` (optional) - Floating numbers
10. `AbilityBarPanel.ts` (optional) - Ability quick access

### Files to Modify (5 files)
1. `packages/renderer/src/Renderer.ts` - Add health bar and threat rendering
2. `packages/renderer/src/WindowManager.ts` - Register new panels
3. `packages/renderer/src/MenuBar.ts` - Add combat menu items
4. `packages/renderer/src/InputHandler.ts` - Add combat keyboard shortcuts
5. `packages/renderer/src/index.ts` - Export new components

---

## Events

**Listens to:**
- `conflict:started` - Activate combat HUD
- `conflict:resolved` - Update combat log
- `injury:inflicted` - Update health bars
- `injury:healed` - Remove injury display

**Emits:** None (UI only consumes events, user actions go through ActionQueue)

---

## Implementation Phases

1. **Phase 1 (MUST):** Health bars, Combat HUD, Stance controls
2. **Phase 2 (MUST):** Threat indicators, Combat unit panel
3. **Phase 3 (SHOULD):** Combat log, Floating numbers
4. **Phase 4 (SHOULD):** Tactical overview, Defense management
5. **Phase 5 (MAY):** Ability bar, Advanced features

---

## Notes for Test Agent

### Test Coverage Required

**Unit Tests:**
- Health bar color calculation (thresholds: 75% yellow, 25% red)
- Threat indicator positioning (on-screen vs edge calculation)
- Combat log filtering and pruning (max 100 events)
- Stance button state updates
- Event subscription handling

**Integration Tests:**
- Combat HUD activation on conflict:started event
- Health bar display when injury:inflicted fires
- Combat unit panel data synchronization
- Tactical overview force calculation accuracy
- Defense zone and GuardDuty integration

**Edge Cases:**
- Multiple simultaneous conflicts
- Entity death during combat (cleanup)
- Off-screen combat (log still updates)
- Rapid stance changes
- Defense zone with no assigned units
- Threat indicator for fleeing predator

**Performance Tests:**
- 10+ agents in combat
- 5+ simultaneous conflicts
- 100+ combat log events
- Health bars only render for visible entities
- Sprite caching for threat indicators

---

## Notes for Implementation Agent

### Critical Integration Points

1. **Event Subscriptions:** All combat UI panels must subscribe to conflict:started, conflict:resolved, injury:inflicted in constructors
2. **Component Queries:** Use `world.getAllEntitiesWithComponent('conflict')` to find active conflicts
3. **Data Mapping:** ConflictComponent and InjuryComponent exist - create display wrappers (ActiveConflictDisplay, InjuryDisplay) with UI-specific fields
4. **WindowManager Integration:** All panels except HealthBar and ThreatIndicators implement IWindowPanel
5. **Renderer Integration:** HealthBars and ThreatIndicators render directly on canvas via Renderer.render()

### Visual Style Guidelines

- Follow existing 8-bit pixel art style
- Use monospace font for text
- Color palette:
  - Health: Green (#00FF00) → Yellow (#FFFF00) → Red (#FF0000)
  - Threats: Yellow (#FFFF00) → Orange (#FFA500) → Red (#FF0000)
  - Background: Semi-transparent black (rgba(0,0,0,0.7))
- Pixel scale: 2x (matching existing UI)

### Performance Considerations

- Health bars only render for entities on-screen or recently damaged
- Combat log max 100 events, auto-prune oldest
- Threat indicators use sprite caching
- Tactical overview only updates when visible

### Error Handling (NO SILENT FALLBACKS)

```typescript
// ✅ GOOD: Throw on missing required data
if (!entity.hasComponent('conflict')) {
  throw new Error(`Entity ${entity.id} missing ConflictComponent for combat display`);
}

// ❌ BAD: Silent fallback
const conflict = entity.getComponent('conflict') ?? defaultConflict; // WRONG
```

---

## Dependencies Met

✅ Conflict system core mechanics exist (ConflictComponent, AgentCombatSystem)
✅ InjuryComponent exists
✅ CombatStatsComponent exists
✅ Event system in place (conflict:started, conflict:resolved, injury:inflicted)
✅ Spec is complete with clear requirements
✅ UI system infrastructure exists (WindowManager, IWindowPanel)

---

## Handoff

Work order is complete and comprehensive. Ready for Test Agent to create test suite.

**Next Step:** Test Agent reads work order and creates test files based on acceptance criteria.

---

spec-agent-001 signing off ✓
