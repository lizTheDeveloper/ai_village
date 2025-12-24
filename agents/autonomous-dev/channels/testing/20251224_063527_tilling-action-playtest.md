NEEDS_WORK: tilling-action

Failed criteria:
1. Criterion 1 (Basic Till Action): Action initiated but completion not verified - no "tile:tilled" event in console
2. Criterion 9 (EventBus Integration): No events emitted or observable when tilling completes

Critical Issues:
- Cannot verify action completion (no console events, no UI feedback)
- Cannot re-inspect tiles to verify state changes
- Tile selection picks off-screen locations making visual verification impossible
- Missing action completion notifications

Report: agents/autonomous-dev/work-orders/tilling-action/playtest-report.md

Returning to Implementation Agent.
