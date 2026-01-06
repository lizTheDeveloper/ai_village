# Agent Deep Debug Logging System

## Overview

The Agent Debug Logging system provides deep, batch-streamed logging of agent behavior to help debug decision-making, pathfinding, and wandering issues.

## Features

- **Position History**: Tracks complete path walked by agent
- **Target Tracking**: Records where agent is going (from steering or action queue)
- **Behavior Changes**: Logs when agent switches behaviors
- **Action Queue**: Captures queued actions with targets
- **Needs & Goals**: Records hunger, energy, health, and current goals
- **Home Tracking**: Distance from assigned bed/home
- **Batch Streaming**: Writes every 20 ticks (~1 second) to reduce I/O

## Usage

### 1. Via Browser Console (Development)

```javascript
// Start logging an agent
game.debugManager.startLogging('agent-id-here', 'AgentName');

// List currently tracked agents
game.debugManager.getTrackedAgents();

// Stop logging an agent
game.debugManager.stopLogging('agent-id-here');

// Stop all logging
game.debugManager.closeAll();
```

### 2. Via Metrics Server API (Recommended)

```bash
# Start deep logging for an agent
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_ID&start=true"

# Stop deep logging for an agent
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_ID&stop=true"

# List agents currently being logged
curl "http://localhost:8766/api/live/debug-agent/list"

# Get agent's position history
curl "http://localhost:8766/api/live/debug-agent?id=AGENT_ID&history=true"
```

## Log File Format

Logs are written to `logs/agent-debug/` as JSONL (JSON Lines):

```
logs/agent-debug/
├── Alice-a1b2c3d4.jsonl
├── Bob-e5f6g7h8.jsonl
└── Charlie-i9j0k1l2.jsonl
```

### Log Entry Structure

```json
{
  "timestamp": 1704502800000,
  "tick": 12450,
  "agentId": "a1b2c3d4-...",
  "agentName": "Alice",
  "position": { "x": 45.2, "y": 32.1 },
  "target": { "x": 50.0, "y": 30.0, "source": "steering" },
  "velocity": { "x": 0.5, "y": -0.2 },
  "speed": 2.0,
  "behavior": "gather",
  "behaviorQueue": [
    { "behavior": "gather", "label": "Gather Stone", "priority": "normal" }
  ],
  "actionQueue": [
    { "type": "move_to", "targetPos": { "x": 50, "y": 30 } }
  ],
  "needs": {
    "hunger": 0.3,
    "energy": 0.8,
    "health": 1.0
  },
  "goals": {
    "personal": "Collect resources for the village",
    "mediumTerm": null,
    "group": null
  },
  "home": { "x": 40.0, "y": 35.0 },
  "distanceFromHome": 6.4,
  "behaviorChanged": false,
  "thought": "I should gather more stone for building"
}
```

## Integration Steps

### Step 1: Add to GameLoop

In `demo/src/main.ts`, add the debug manager:

```typescript
import { AgentDebugManager } from '@ai-village/core';

// Create debug manager
const agentDebugManager = new AgentDebugManager('logs/agent-debug');

// In game loop tick
function tick() {
  gameLoop.tick();

  // Log tracked agents
  agentDebugManager.logTick(gameLoop.world);
}

// Expose to window for browser console access
(window as any).game = {
  ...game,
  debugManager: agentDebugManager
};
```

### Step 2: Add Metrics Server Endpoint

In `scripts/metrics-server.ts`, add endpoint:

```typescript
// GET /api/live/debug-agent?id=<id>&start=true
// GET /api/live/debug-agent?id=<id>&stop=true
// GET /api/live/debug-agent/list
app.get('/api/live/debug-agent', (req, res) => {
  const agentId = req.query.id as string;
  const start = req.query.start === 'true';
  const stop = req.query.stop === 'true';
  const list = req.query.list === 'true';
  const history = req.query.history === 'true';

  if (list) {
    const tracked = /* get from game */;
    res.json({ agents: tracked });
    return;
  }

  if (start) {
    /* start logging via websocket message to game */
    res.json({ success: true, message: `Started logging ${agentId}` });
    return;
  }

  if (stop) {
    /* stop logging via websocket message to game */
    res.json({ success: true, message: `Stopped logging ${agentId}` });
    return;
  }

  if (history) {
    /* get position history from logger */
    res.json({ positions: [] });
    return;
  }

  res.status(400).json({ error: 'Missing parameters' });
});
```

## Analysis Tools

### Extract Position History

```bash
# Extract just positions for visualization
cat logs/agent-debug/Alice-a1b2c3d4.jsonl | \
  jq -r 'select(.type != "session_start" and .type != "session_end") | [.tick, .position.x, .position.y] | @csv' > alice-path.csv
```

### Find Behavior Changes

```bash
# Find when agent changed behaviors
cat logs/agent-debug/Alice-a1b2c3d4.jsonl | \
  jq -r 'select(.behaviorChanged == true) | {tick, from: .previousBehavior, to: .behavior, distance_from_home: .distanceFromHome}'
```

### Analyze Distance from Home

```bash
# Show how far agent wandered
cat logs/agent-debug/Alice-a1b2c3d4.jsonl | \
  jq -r 'select(.distanceFromHome) | [.tick, .distanceFromHome, .behavior] | @csv' > distance-analysis.csv
```

### Extract Decisions

```bash
# Extract thought + behavior changes for decision analysis
cat logs/agent-debug/Alice-a1b2c3d4.jsonl | \
  jq -r 'select(.thought or .behaviorChanged) | {tick, behavior, thought, changed: .behaviorChanged}'
```

## Troubleshooting

### No Target Line Showing

Check the console for `[TargetLine]` messages. The debug logging in `Renderer.ts` will show:
- Whether steering component has a target
- Whether action queue has a targetPos
- Which source the target came from

### Agents Wandering Far from Home

Look at the logs:

1. Check `distanceFromHome` values - how far are they going?
2. Check `behavior` when far from home - what are they doing?
3. Check `actionQueue` - what actions are queued?
4. Check `home` coordinates - is home assigned correctly?

Example analysis:

```bash
# Find when agent goes far from home
cat logs/agent-debug/Alice-a1b2c3d4.jsonl | \
  jq -r 'select(.distanceFromHome > 20) | {tick, distance: .distanceFromHome, behavior, target, actionQueue: .actionQueue[0]}'
```

This will show:
- What behavior triggered the long journey
- Where they were going (target)
- What action was queued

## Performance Impact

- **Batch size**: 20 ticks (~1 second at 20 TPS)
- **File I/O**: Minimal, buffered writes
- **Memory**: ~1KB per logged tick = ~1MB per agent per 1000 ticks
- **Recommendation**: Log 1-3 agents at a time, not all agents

## Next Steps

1. **Integrate with GameLoop** - Add debug manager to main.ts
2. **Add Metrics Server Endpoint** - Enable remote control
3. **Create Visualization Tool** - Plot agent paths on map
4. **Add to DevPanel** - UI toggle for debugging
5. **Analyze Wandering** - Use logs to find why agents wander far
