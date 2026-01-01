WORK_ORDER_READY: conflict-ui

Work order exists at: agents/autonomous-dev/work-orders/conflict-ui/work-order.md

Phase: 16
Spec: openspec/specs/ui-system/conflict.md
Dependencies: All met ✅

Status: READY_FOR_TESTS
- All core combat UI components implemented (HealthBarRenderer, ThreatIndicatorRenderer, CombatHUDPanel, CombatLogPanel, CombatUnitPanel, StanceControls)
- Work order contains complete integration requirements
- 7 acceptance criteria defined with clear verification steps
- Files to modify identified (Renderer.ts, InputHandler.ts)
- Event wiring documented

Integration Required:
1. Component instantiation in Renderer constructor
2. Render loop integration
3. EventBus wiring for all combat events
4. Keyboard shortcuts (1-4 for stances)
5. Entity selection handling
6. Cleanup lifecycle

Handing off to Test Agent.

Attempt: #806
Timestamp: $(date +%s)
