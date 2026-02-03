# LLM-Integrated Agent Debugging

This system allows you to use natural language to investigate agent behavior through the metrics server dashboard.

## Typical Workflow

**You:** "Can you take a look at session ID xyz, agent Cedar is walking way far away into the desert but saying he's trying to gather berries"

**LLM will:**
1. Find Cedar by name
2. Start deep logging for Cedar
3. Wait ~30 seconds for data collection
4. Analyze the logs
5. Report findings

## API Endpoints

All endpoints are on `http://localhost:8766/api/live/`

### 1. Find Agent by Name

```bash
curl "http://localhost:8766/api/live/agents/find-by-name?name=Cedar"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 1,
    "agents": [
      {
        "id": "a1b2c3d4-5678-...",
        "name": "Cedar",
        "position": { "x": 150.2, "y": 89.5 },
        "behavior": "gather"
      }
    ]
  }
}
```

### 2. Start Logging

```bash
curl -X POST "http://localhost:8766/api/live/debug-agent?id=a1b2c3d4-5678&start=true"
```

**Or by name:**
```bash
curl -X POST "http://localhost:8766/api/live/debug-agent?name=Cedar&start=true"
```

### 3. Get Recent Log Entries

```bash
# Get last 100 entries (default)
curl "http://localhost:8766/api/live/debug-agent/logs?agent=Cedar"

# Get last 500 entries
curl "http://localhost:8766/api/live/debug-agent/logs?agent=Cedar&limit=500"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 100,
    "entries": [
      {
        "timestamp": 1704502800000,
        "tick": 12450,
        "agentName": "Cedar",
        "position": { "x": 150.2, "y": 89.5 },
        "target": { "x": 180.0, "y": 95.0, "source": "steering" },
        "behavior": "gather",
        "distanceFromHome": 45.8,
        "needs": { "hunger": 0.3, "energy": 0.7, "health": 1.0 },
        "thought": "I need to gather berries for the village"
      }
      // ... more entries
    ]
  }
}
```

### 4. Analyze Agent Behavior

```bash
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=Cedar"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEntries": 487,
    "maxDistanceFromHome": 78.3,
    "avgDistanceFromHome": 42.1,
    "behaviorChanges": [
      {
        "tick": 12300,
        "from": "wander",
        "to": "gather",
        "distance": 15.2
      },
      {
        "tick": 12450,
        "from": "gather",
        "to": "return_home",
        "distance": 78.3
      }
    ],
    "behaviors": {
      "gather": 320,
      "wander": 120,
      "return_home": 47
    },
    "recentThoughts": [
      "I need to gather berries for the village",
      "The desert looks promising for resources",
      "I should head back soon, getting tired"
    ],
    "currentPosition": { "x": 180.2, "y": 95.1 },
    "currentTarget": { "x": 40.0, "y": 35.0, "source": "steering" }
  }
}
```

### 5. Stop Logging

```bash
curl -X POST "http://localhost:8766/api/live/debug-agent?id=a1b2c3d4&stop=true"
```

### 6. List All Log Files

```bash
curl "http://localhost:8766/api/live/debug-agent/log-files"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "files": [
      {
        "filename": "Cedar-a1b2c3d4.jsonl",
        "path": "logs/agent-debug/Cedar-a1b2c3d4.jsonl",
        "size": 524288
      }
    ]
  }
}
```

## LLM Investigation Workflow

### Example: "Cedar is walking far into the desert"

**Step 1: Find the agent**
```bash
curl "http://localhost:8766/api/live/agents/find-by-name?name=Cedar"
```

**Step 2: Start logging**
```bash
curl -X POST "http://localhost:8766/api/live/debug-agent?id=CEDAR_ID&start=true"
```

**Step 3: Wait 30-60 seconds for data collection**

**Step 4: Analyze behavior**
```bash
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=Cedar"
```

**Step 5: Interpret results**

Look for:
- **maxDistanceFromHome**: How far did Cedar go? (e.g., 78.3 tiles)
- **behaviorChanges**: What triggered the journey? (e.g., switched to "gather" at distance 15.2)
- **behaviors**: What was Cedar doing most? (e.g., "gather": 320 ticks)
- **recentThoughts**: What was Cedar thinking? (e.g., "The desert looks promising for resources")
- **currentTarget**: Where is Cedar going? (e.g., back home at {40, 35})

**Step 6: Report findings**

Example report:
```
Analysis of agent Cedar:

Cedar wandered 78.3 tiles from home (average 42.1 tiles) while gathering resources.

Behavior breakdown:
- Gathering: 65.7% of the time (320 ticks)
- Wandering: 24.6% (120 ticks)
- Returning home: 9.7% (47 ticks)

The agent switched from wandering to gathering at 15.2 tiles from home, then
continued gathering until reaching 78.3 tiles away. At that point, Cedar
switched to "return_home" behavior.

Recent thoughts:
- "I need to gather berries for the village"
- "The desert looks promising for resources"
- "I should head back soon, getting tired"

Diagnosis: Cedar's gathering behavior is working correctly - the agent
explores for resources and returns home when getting far away. The 78.3 tile
distance might be too far if berries are closer to home. Consider tuning the
resource detection radius or gathering priority.
```

### Example: "Why isn't this agent working?"

**Step 1: Find all agents**
```bash
curl "http://localhost:8766/api/live/agents/find-by-name?name="
```

**Step 2: Start logging suspicious agent**
```bash
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_ID&start=true"
```

**Step 3: Get recent logs**
```bash
curl "http://localhost:8766/api/live/debug-agent/logs?agent=AGENT_ID&limit=50"
```

**Step 4: Check for patterns**
- Is position changing? (stuck?)
- Is behavior changing? (decision paralysis?)
- Is target present? (pathfinding working?)
- Are needs critical? (starving?)

## Common Investigation Patterns

### Pattern 1: Agent Stuck in Place

**Symptoms:**
- Position not changing across multiple log entries
- Target present but unreachable
- Behavior stuck in one state

**Check:**
```bash
# Get last 50 entries
curl "http://localhost:8766/api/live/debug-agent/logs?agent=NAME&limit=50" | \
  jq '.data.entries[] | {tick, position, target, behavior}'
```

Look for repeating position values with different targets.

### Pattern 2: Agent Wandering Too Far

**Symptoms:**
- maxDistanceFromHome > 100 tiles
- No "return_home" behavior triggered

**Check:**
```bash
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=NAME" | \
  jq '.data | {maxDistance: .maxDistanceFromHome, avgDistance: .avgDistanceFromHome, behaviors: .behaviors}'
```

### Pattern 3: Agent Not Completing Tasks

**Symptoms:**
- Behavior changes frequently (< 20 ticks per behavior)
- No tasks completed
- High behavior churn

**Check:**
```bash
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=NAME" | \
  jq '.data.behaviorChanges | length'
```

High behavior change count (> 50 in 500 ticks) indicates decision instability.

### Pattern 4: Agent Ignoring Needs

**Symptoms:**
- hunger/energy/health critical but behavior not changing
- No "eat" or "sleep" behaviors

**Check:**
```bash
curl "http://localhost:8766/api/live/debug-agent/logs?agent=NAME&limit=100" | \
  jq '.data.entries[] | select(.needs.hunger > 0.8 or .needs.energy < 0.2) | {tick, behavior, needs}'
```

## Integration with Session Analysis

When investigating a specific session:

```bash
# 1. Find the session
curl "http://localhost:8766/dashboard?session=SESSION_ID"

# 2. List agents in that session
curl "http://localhost:8766/api/live/agents/find-by-name?name="

# 3. Start logging agents of interest
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_1&start=true"
curl -X POST "http://localhost:8766/api/live/debug-agent?id=AGENT_2&start=true"

# 4. Wait for data collection

# 5. Analyze each agent
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=AGENT_1"
curl "http://localhost:8766/api/live/debug-agent/analyze?agent=AGENT_2"
```

## Performance Notes

- **Batch size**: Logs written every 20 ticks (~1 second)
- **File size**: ~1KB per logged tick = ~1MB per 1000 ticks
- **Recommendation**: Log 1-3 agents at a time, not all agents
- **Analysis limit**: Default 1000 most recent entries for analysis

## Error Handling

**No game client connected:**
```json
{
  "error": "No game client connected"
}
```
Solution: Ensure game is running and connected to metrics server

**Agent not found:**
```json
{
  "success": true,
  "data": {
    "count": 0,
    "agents": []
  }
}
```
Solution: Check agent name spelling, agent may have died

**No log file:**
```json
{
  "success": true,
  "data": {
    "count": 0,
    "entries": []
  }
}
```
Solution: Agent hasn't been logged yet, start logging first
