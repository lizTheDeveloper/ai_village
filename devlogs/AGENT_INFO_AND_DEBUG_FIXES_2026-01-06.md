# Agent Info Panel and Debug Logging Fixes - Session Summary

**Date**: 2026-01-06
**Focus**: UI display scaling, agent debugging, and deep logging system

## Issues Addressed

### 1. ✅ Personality/Game Traits Display Scaling

**Problem**: Agent personality traits (openness, work ethic, etc.) were showing tiny values like "0.7" instead of "70" because the UI expected 0-100 scale but data was 0-1.

**Fixed Files**:
- `packages/renderer/src/panels/agent-info/SkillsSection.ts`

**Changes**:
- Line 304: Fixed `renderTraitBar()` - Removed division by 100 (value is already 0-1)
- Line 349: Fixed `renderSimpleTraitBar()` - Removed division by 100
- Line 361: Display as percentage: `Math.round(value * 100)`
- Line 378-384: Updated `getTraitColor()` - Changed thresholds from 70/50/30 to 0.7/0.5/0.3

**Result**: Traits now display correctly (e.g., 0.7 → "70")

---

### 2. ✅ Thinking Field Text Cutoff

**Problem**: Agent thoughts were cut off after 3 lines, hiding important decision-making context.

**Fixed Files**:
- `packages/renderer/src/panels/agent-info/InfoSection.ts`

**Changes**:
- Line 353: Increased `maxLines` from 3 to 50 in `renderWrappedText()`

**Result**: Full agent thoughts now visible

---

### 3. ⚠️ Target Line Not Showing (Debug Logging Added)

**Problem**: Cyan dashed line from agent to target wasn't rendering.

**Fixed Files**:
- `packages/renderer/src/Renderer.ts`

**Changes**:
- Lines 2735-2791: Enhanced `drawNavigationPath()`:
  - Check both steering component AND action queue for targets
  - Added comprehensive console logging `[TargetLine]`
  - Fixed worldToScreen conversion bug

**Next Steps**:
- Check browser console for `[TargetLine]` messages to diagnose why line isn't appearing
- Verify if agents have steering targets or action queue targets

---

### 4. ✅ Agent Deep Debug Logging System

**Problem**: No way to track agent decisions, paths, or understand why agents wander far from home.

**New Files Created**:
- `packages/core/src/debug/AgentDebugLogger.ts` - Core logging system
- `packages/core/src/debug/index.ts` - Exports
- `AGENT_DEBUG_LOGGING.md` - Complete documentation

**Features**:
- **Position History**: Complete path walked by agent
- **Target Tracking**: Where agent is going (steering or action queue)
- **Behavior Changes**: Logs when agent switches behaviors
- **Action Queue State**: Queued actions with targets
- **Needs & Goals**: Hunger, energy, health, goals
- **Home Tracking**: Distance from assigned bed
- **Batch Streaming**: Writes every 20 ticks (~1 second) to reduce I/O
- **Toggle On/Off**: Not always running, can be enabled per-agent

**Log Format**: JSONL (JSON Lines) in `logs/agent-debug/AgentName-id.jsonl`

**Example Log Entry**:
```json
{
  "timestamp": 1704502800000,
  "tick": 12450,
  "agentId": "a1b2c3d4-...",
  "agentName": "Alice",
  "position": { "x": 45.2, "y": 32.1 },
  "target": { "x": 50.0, "y": 30.0, "source": "steering" },
  "behavior": "gather",
  "distanceFromHome": 6.4,
  "needs": { "hunger": 0.3, "energy": 0.8, "health": 1.0 },
  "thought": "I should gather more stone for building"
}
```

**Integration Required** (see `AGENT_DEBUG_LOGGING.md`):
1. Add `AgentDebugManager` to GameLoop in `demo/src/main.ts`
2. Add metrics server endpoints in `scripts/metrics-server.ts`
3. Expose to `window.game` for browser console access

**Usage Examples**:

```javascript
// Browser console
game.debugManager.startLogging('agent-id', 'AgentName');
game.debugManager.getTrackedAgents();
game.debugManager.stopLogging('agent-id');
```

```bash
# Metrics server API (when integrated)
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_ID&start=true"
curl "http://localhost:8766/api/live/debug-agent/list"
```

**Analysis Examples**:

```bash
# Extract position path for visualization
cat logs/agent-debug/Alice-*.jsonl | \
  jq -r '[.tick, .position.x, .position.y] | @csv' > alice-path.csv

# Find when agent wandered far from home
cat logs/agent-debug/Alice-*.jsonl | \
  jq -r 'select(.distanceFromHome > 20) | {tick, distance: .distanceFromHome, behavior, target}'

# Find behavior changes
cat logs/agent-debug/Alice-*.jsonl | \
  jq -r 'select(.behaviorChanged == true) | {tick, from: .previousBehavior, to: .behavior}'
```

---

## Testing Checklist

- [x] Personality traits display correctly (0-1 → 0-100)
- [x] Thinking field shows full text
- [x] Debug logging added to target line rendering
- [ ] Target line rendering works (needs browser console check)
- [ ] AgentDebugManager integrated with GameLoop
- [ ] Metrics server endpoints added
- [ ] Test deep logging with real agent
- [ ] Analyze wandering behavior with logs

---

## Next Steps

1. **Verify Target Line** - Check browser console for `[TargetLine]` messages to diagnose issue
2. **Integrate Debug Logger** - Add to GameLoop and metrics server (see `AGENT_DEBUG_LOGGING.md`)
3. **Test Deep Logging** - Enable for one agent, let it run for ~1000 ticks, analyze logs
4. **Diagnose Wandering** - Use logs to find why agents go far from home
5. **Create Visualization** - Plot agent paths on map overlay
6. **Add DevPanel Toggle** - UI button to enable/disable deep logging

---

## Files Modified

```
packages/renderer/src/panels/agent-info/SkillsSection.ts
packages/renderer/src/panels/agent-info/InfoSection.ts
packages/renderer/src/Renderer.ts
```

## Files Created

```
packages/core/src/debug/AgentDebugLogger.ts
packages/core/src/debug/index.ts
AGENT_DEBUG_LOGGING.md
devlogs/AGENT_INFO_AND_DEBUG_FIXES_2026-01-06.md
```

---

## Performance Impact

- **Display Fixes**: None (rendering only)
- **Debug Logging**: Minimal when disabled
- **Deep Logging** (when enabled):
  - Batch writes every 20 ticks (~1 second)
  - ~1KB per logged tick
  - ~1MB per agent per 1000 ticks
  - **Recommendation**: Log 1-3 agents at a time

---

## Questions to Answer with Deep Logging

1. **Why do agents wander far from home?**
   - Check `distanceFromHome` values
   - What `behavior` triggers long journeys?
   - What `target` are they going to?
   - What `actionQueue` actions are queued?

2. **Are agents making good decisions?**
   - Check `behaviorChanged` events
   - Compare `needs` state to `behavior` choice
   - Review `thought` content for reasoning

3. **Where do agents spend their time?**
   - Plot `position` history on map
   - Calculate time spent in different zones
   - Find patterns in movement

4. **What's in their action queue?**
   - Check `actionQueue` for pending actions
   - See if actions match expected behavior
   - Find stuck/blocked actions
