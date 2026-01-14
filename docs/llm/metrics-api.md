# Metrics Server API Reference

**Base URL:** `http://localhost:8766`
**WebSocket:** `ws://localhost:8765`
**Auto-started with:** `./start.sh server` or `./start.sh`

---

## Table of Contents

1. [Connection & Health](#connection--health)
2. [Dashboard Endpoints](#dashboard-endpoints)
3. [Agent Queries](#agent-queries)
4. [Session Management](#session-management)
5. [Time-Series Data](#time-series-data)
6. [WebSocket Streaming](#websocket-streaming)
7. [Response Formats](#response-formats)
8. [Error Handling](#error-handling)

---

## Connection & Health

### Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1736774400000,
  "uptime": 3600
}
```

**Use:** Verify server is running before making other requests.

---

## Dashboard Endpoints

### Get Latest Session Summary
```bash
GET /dashboard?session=latest
```

**Response Schema:**
```json
{
  "sessionId": "session-abc123",
  "duration": 14400,
  "peakPopulation": 52,
  "totalBirths": 5,
  "totalDeaths": 3,
  "dominantBehaviors": ["gathering", "rest"],
  "metrics": {
    "population": 50,
    "avgHealth": 85.2,
    "avgHunger": 0.65,
    "avgEnergy": 0.72,
    "avgThirst": 0.88,
    "foodSupply": 450.5,
    "wealthDistribution": {
      "giniCoefficient": 0.32,
      "top10Percent": 0.45,
      "bottom50Percent": 0.15
    },
    "socialNetwork": {
      "density": 0.12,
      "clustering": 0.35,
      "nodeCount": 50,
      "edgeCount": 120,
      "isolatedAgents": 3
    }
  },
  "performance": {
    "avgFps": 60,
    "minFps": 58,
    "tickDuration": 8.5,
    "totalEntities": 4260,
    "peakMemory": 150000000,
    "slowestSystem": "pathfinding"
  }
}
```

**Fields:**
- `sessionId`: Unique session identifier
- `duration`: Ticks elapsed
- `peakPopulation`: Maximum concurrent agents
- `metrics.population`: Current living agents
- `metrics.avgHealth`: 0-100 health average
- `metrics.avgHunger`: 0-1 hunger average (0=starving, 1=full)
- `metrics.wealthDistribution.giniCoefficient`: 0-1 inequality (0=equality, 1=max inequality)
- `metrics.socialNetwork.density`: 0-1 network density (edges / max possible edges)
- `performance.tickDuration`: Milliseconds per tick (target: <50ms)
- `performance.totalEntities`: All entities in world

### Get Specific Session
```bash
GET /dashboard?session=SESSION_ID
```

**Example:**
```bash
curl "http://localhost:8766/dashboard?session=session-abc123"
```

---

## Agent Queries

### List All Agents in Session
```bash
GET /dashboard/agents?session=SESSION_ID
```

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-123",
      "name": "Alice",
      "generation": 2,
      "age": 5000,
      "status": "alive",
      "position": {"x": 50.5, "y": 75.2},
      "needs": {
        "hunger": 0.7,
        "energy": 0.4,
        "thirst": 0.9,
        "social": 0.5,
        "cleanliness": 0.8
      },
      "behavior": "gathering",
      "skills": {
        "farming": 2.5,
        "crafting": 1.2,
        "hunting": 0.8
      }
    }
  ]
}
```

**Fields:**
- `id`: Unique agent UUID
- `generation`: Birth generation (0=initial spawn, 1=first generation offspring)
- `age`: Ticks alive
- `status`: "alive" | "dead"
- `needs.*`: 0-1 values (lower = more urgent)
- `behavior`: Current behavior string
- `skills.*`: Skill levels (1 level = 100 XP)

### Get Agent Details
```bash
GET /dashboard/agent?id=AGENT_ID
```

**Response:**
```json
{
  "id": "agent-123",
  "name": "Alice",
  "birthTimestamp": 1234567890,
  "generation": 2,
  "parents": ["agent-001", "agent-002"],
  "initialStats": {
    "health": 100,
    "hunger": 0.5,
    "thirst": 0.5,
    "energy": 1.0
  },
  "currentStats": {
    "health": 85,
    "hunger": 0.7,
    "thirst": 0.9,
    "energy": 0.4
  },
  "lifecycle": {
    "lifespan": 5000,
    "realTimeAlive": 250000,
    "ageAtDeath": null,
    "causeOfDeath": null
  },
  "legacy": {
    "childrenCount": 2,
    "descendantsCount": 5,
    "skillsLearned": ["farming", "crafting"],
    "buildingsCreated": 3,
    "resourcesGathered": {
      "wheat": 150,
      "wood": 80,
      "stone": 45
    }
  },
  "position": {"x": 50.5, "y": 75.2},
  "behavior": "gathering",
  "currentAction": {
    "type": "harvest_plant",
    "target": "plant-456",
    "progress": 0.6
  },
  "skills": {
    "farming": 2.5,
    "crafting": 1.2
  },
  "memory": {
    "episodicCount": 45,
    "semanticCount": 12,
    "spatialCount": 230
  },
  "relationships": [
    {
      "agentId": "agent-456",
      "name": "Bob",
      "strength": 0.8,
      "type": "friend"
    }
  ]
}
```

**Use:** Deep dive into single agent's complete state and history.

---

## Session Management

### List All Sessions
```bash
GET /api/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-abc123",
      "startTime": 1736774400000,
      "endTime": null,
      "duration": 14400,
      "status": "active"
    },
    {
      "id": "session-xyz789",
      "startTime": 1736770000000,
      "endTime": 1736774000000,
      "duration": 28800,
      "status": "completed"
    }
  ],
  "active": "session-abc123"
}
```

**Fields:**
- `id`: Session identifier
- `startTime`: Unix timestamp (ms)
- `duration`: Ticks elapsed
- `status`: "active" | "completed" | "archived"

---

## Time-Series Data

### Get Time-Series Metrics
```bash
GET /api/timeseries?session=SESSION_ID&metrics=population,avgHealth,avgEnergy&interval=60000
```

**Parameters:**
- `session`: Session ID or "latest"
- `metrics`: Comma-separated metric names
- `interval`: Bucket size in milliseconds (default: 60000 = 1 minute)

**Available Metrics:**
- `population` - Living agent count
- `avgHealth` - Average health (0-100)
- `avgHunger` - Average hunger (0-1)
- `avgEnergy` - Average energy (0-1)
- `avgThirst` - Average thirst (0-1)
- `totalEntities` - All entities in world
- `tickDuration` - Tick time in ms
- `fps` - Frames per second
- `memoryUsage` - Memory usage in bytes

**Response:**
```json
{
  "metrics": [
    {
      "name": "population",
      "data": [
        {"timestamp": 1736774400000, "value": 50},
        {"timestamp": 1736774460000, "value": 51},
        {"timestamp": 1736774520000, "value": 52}
      ]
    },
    {
      "name": "avgHealth",
      "data": [
        {"timestamp": 1736774400000, "value": 85.2},
        {"timestamp": 1736774460000, "value": 84.8},
        {"timestamp": 1736774520000, "value": 86.1}
      ]
    }
  ],
  "interval": 60000,
  "count": 3
}
```

---

## WebSocket Streaming

### Connect to WebSocket
```bash
wscat -c ws://localhost:8765
```

**JavaScript Example:**
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
  console.log('Connected to metrics stream');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from metrics stream');
};
```

### Message Types

#### Snapshot Update (Every 100 ticks = 5 seconds)
```json
{
  "type": "snapshot",
  "data": {
    "tick": 14400,
    "timestamp": 1736774400000,
    "population": 50,
    "avgHealth": 85.2,
    "avgHunger": 0.65,
    "avgEnergy": 0.72,
    "fps": 60,
    "tickDuration": 8.5
  }
}
```

#### Agent Event
```json
{
  "type": "agent",
  "data": {
    "event": "birth",
    "agentId": "agent-789",
    "name": "Charlie",
    "generation": 3,
    "parents": ["agent-123", "agent-456"],
    "timestamp": 1736774400000
  }
}
```

**Agent Events:**
- `birth` - Agent spawned
- `death` - Agent died (includes `causeOfDeath`)
- `level_up` - Agent gained skill level
- `relationship_formed` - Social connection created

#### Interaction Event
```json
{
  "type": "interaction",
  "data": {
    "event": "conversation_started",
    "participants": ["agent-123", "agent-456"],
    "initiator": "agent-123",
    "timestamp": 1736774400000
  }
}
```

#### Resource Event
```json
{
  "type": "resource",
  "data": {
    "event": "gathered",
    "agentId": "agent-123",
    "resourceType": "wheat",
    "amount": 5,
    "timestamp": 1736774400000
  }
}
```

---

## Response Formats

### Success Response
All successful API calls return JSON with consistent structure:

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "timestamp": 1736774400000,
  "session": "session-abc123"
}
```

### Pagination
For large result sets (agents, events):

```json
{
  "data": [...],
  "pagination": {
    "total": 250,
    "offset": 0,
    "limit": 100,
    "hasMore": true
  }
}
```

**Query Parameters:**
- `offset`: Skip N records (default: 0)
- `limit`: Return max N records (default: 100, max: 1000)

**Example:**
```bash
curl "http://localhost:8766/dashboard/agents?session=latest&offset=100&limit=50"
```

---

## Error Handling

### Error Response Schema
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": 1736774400000
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `SESSION_NOT_FOUND` | 404 | Invalid session ID |
| `AGENT_NOT_FOUND` | 404 | Invalid agent ID |
| `INVALID_PARAMETERS` | 400 | Missing or malformed parameters |
| `SERVER_ERROR` | 500 | Internal server error |
| `RATE_LIMITED` | 429 | Too many requests |

### Example Error Handling

**Bash:**
```bash
response=$(curl -s "http://localhost:8766/dashboard/agent?id=invalid-id")
success=$(echo "$response" | jq -r '.success')

if [ "$success" = "false" ]; then
  error=$(echo "$response" | jq -r '.error')
  echo "Error: $error"
  exit 1
fi
```

**JavaScript:**
```javascript
async function fetchAgent(agentId) {
  const response = await fetch(`http://localhost:8766/dashboard/agent?id=${agentId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(`API Error: ${data.error} (${data.code})`);
  }

  return data.data;
}
```

---

## Query Patterns

### Pattern 1: Monitor Population Over Time
```bash
# Poll every 60 seconds
while true; do
  curl -s "http://localhost:8766/dashboard?session=latest" | \
    jq '{timestamp: .timestamp, population: .metrics.population, avgHealth: .metrics.avgHealth}'
  sleep 60
done
```

### Pattern 2: Track Agent Lifecycle
```bash
# Get all agents
agents=$(curl -s "http://localhost:8766/dashboard/agents?session=latest" | jq '.agents')

# Filter by status
alive=$(echo "$agents" | jq '[.[] | select(.status == "alive")]')
dead=$(echo "$agents" | jq '[.[] | select(.status == "dead")]')

echo "Alive: $(echo "$alive" | jq 'length')"
echo "Dead: $(echo "$dead" | jq 'length')"
```

### Pattern 3: Find Agents by Behavior
```bash
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq '.agents[] | select(.behavior == "gathering") | {name, position}'
```

### Pattern 4: Calculate Average Needs
```bash
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq '[.agents[].needs.hunger] | add / length'
```

### Pattern 5: Export Agent Data to CSV
```bash
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq -r '.agents[] | [.name, .age, .needs.hunger, .needs.energy, .behavior] | @csv' > agents.csv
```

---

## Performance Tips

1. **Use `session=latest` for caching:** Most recent session data is cached
2. **Specify time ranges:** Use `?start=TIMESTAMP&end=TIMESTAMP` to reduce data transfer
3. **Limit fields with jq:** Only extract needed fields to reduce bandwidth
4. **Use WebSocket for continuous monitoring:** Avoids polling overhead
5. **Batch requests:** Combine multiple queries when possible
6. **Set appropriate intervals:** Don't poll faster than data updates (100 ticks = 5 seconds)

**Bad (polling every second):**
```bash
while true; do curl "http://localhost:8766/dashboard?session=latest"; sleep 1; done
```

**Good (WebSocket streaming):**
```bash
wscat -c ws://localhost:8765
```

---

## Data Retention

Metrics server uses tiered storage:

| Tier | Duration | Resolution | Storage |
|------|----------|------------|---------|
| **Hot** | 1 hour | Raw events | In-memory |
| **Warm** | 24 hours | 1-minute aggregates | On-disk JSON |
| **Cold** | Forever | Daily aggregates | Compressed archives |

**Implications:**
- Real-time queries (last hour): Full resolution, fast
- Historical queries (1-24 hours): Minute-level, fast
- Long-term queries (>24 hours): Daily-level, slower

**Access archived data:**
```bash
curl "http://localhost:8766/api/archive?date=2026-01-01"
```

---

## Related Documentation

- **[admin-api.md](./admin-api.md)** - Admin dashboard API (state modification)
- **[observation-guide.md](./observation-guide.md)** - What metrics to track and why
- **[examples.md](./examples.md)** - Complete working examples

---

## Troubleshooting

### Connection Refused
**Symptom:** `curl: (7) Failed to connect to localhost port 8766`

**Fix:**
```bash
cd custom_game_engine && ./start.sh server
curl http://localhost:8766/api/health
```

### Empty Data
**Symptom:** `{"agents": []}`

**Cause:** Game not running or metrics not enabled

**Fix:**
```bash
# Ensure game is running
curl http://localhost:3000

# Check metrics system enabled in game console
game.world.gameLoop.systemRegistry.getSystem('metrics_collection')
```

### WebSocket Connection Failed
**Symptom:** `Error: connect ECONNREFUSED`

**Fix:**
```bash
# Check WebSocket port
lsof -i :8765

# Test with wscat
wscat -c ws://localhost:8765
```

### Slow Queries
**Symptom:** Requests take >5 seconds

**Cause:** Large result set or no caching

**Fix:**
```bash
# Add pagination
curl "http://localhost:8766/dashboard/agents?session=latest&limit=50"

# Use time ranges
curl "http://localhost:8766/api/timeseries?start=1736774400000&end=1736778000000"
```
