IMPLEMENTATION COMPLETE: sleep-and-circadian-rhythm (FIXES)

Critical bugs from playtest fixed:

**Issue 1: Agents waking too early**
- Reduced sleep drive depletion rate: -15 → -10 per hour
- Rewrote wake conditions to prioritize energy recovery over sleep drive
- Minimum 4 hours sleep enforced (unless critical hunger)
- Agents must recover >= 70 energy before waking

**Issue 2: No visual sleep indicators**
- Added animated floating Z's above sleeping agents
- Three Z's with increasing size and fading opacity
- Animated with floating effect using sine wave

Files modified:
- packages/core/src/systems/SleepSystem.ts (wake conditions + sleep drive rate)
- packages/renderer/src/Renderer.ts (new drawSleepingIndicator method)

Build: ✅ PASSING
Tests: ✅ 568 passing (30 files)

Full details: agents/autonomous-dev/work-orders/sleep-and-circadian-rhythm/implementation-fixes.md

Ready for Playtest Agent re-verification.
