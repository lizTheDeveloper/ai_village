# Admin Dashboard API Reference

**Base URL:** `http://localhost:8766/admin`
**Purpose:** State modification and control capabilities
**Safety:** Some actions are destructive - create snapshots before experimenting

---

## Table of Contents

1. [Capabilities System](#capabilities-system)
2. [Queries (Read-Only)](#queries-read-only)
3. [Actions (State-Modifying)](#actions-state-modifying)
4. [Agent Control](#agent-control)
5. [Universe Management](#universe-management)
6. [LLM Queue Control](#llm-queue-control)
7. [Sprite Management](#sprite-management)
8. [Safety Guidelines](#safety-guidelines)

---

## Capabilities System

The admin API is organized into **capabilities** - modules that group related queries and actions.

### Architecture
```
Capability
├── Queries (read-only, safe)
│   └── GET /admin/queries/{query-id}
└── Actions (state-modifying, use caution)
    └── POST /admin/actions/{action-id}
```

### Available Capabilities

| Capability | Purpose | Queries | Actions |
|------------|---------|---------|---------|
| **overview** | System health | System stats, TPS, entity counts | - |
| **agents** | Agent control | List agents, agent details | Set LLM provider, spawn agent |
| **llm** | LLM management | Provider stats, queue status | Set provider, clear queue |
| **universes** | Universe control | List universes, fork info | Create, fork, delete universe |
| **saves** | Save/load/time travel | List snapshots, save info | Save, load, time travel |
| **sprites** | Asset generation | Sprite queue status | Request sprite generation |
| **roadmap** | Feature tracking | Feature status, pipeline | Update status, add feature |

---

## Queries (Read-Only)

Queries are **safe** - they only read state without modification.

### Overview Queries

#### Get System Overview
```bash
GET /admin/queries/system-overview
```

**Response:**
```json
{
  "tps": 19.8,
  "fps": 60,
  "tickDuration": 8.5,
  "entityCount": 4260,
  "systemCount": 212,
  "activeAgents": 50,
  "memoryUsage": 150000000,
  "uptime": 3600000
}
```

#### Get System Timing
```bash
GET /admin/queries/system-timing
```

**Response:**
```json
{
  "systems": [
    {
      "id": "pathfinding",
      "avgTickTimeMs": 12.5,
      "maxTickTimeMs": 45.2,
      "callCount": 14400
    },
    {
      "id": "agent_brain",
      "avgTickTimeMs": 8.3,
      "maxTickTimeMs": 32.1,
      "callCount": 14400
    }
  ],
  "total": 212
}
```

**Use:** Identify performance bottlenecks.

### Agent Queries

#### List All Agents
```bash
GET /admin/queries/agents?format=json
```

**Parameters:**
- `format`: "json" | "table" (default: json)

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-123",
      "name": "Alice",
      "llmProvider": "groq",
      "age": 5000,
      "generation": 2,
      "status": "alive"
    }
  ],
  "count": 50
}
```

#### Get Agent Details
```bash
GET /admin/queries/agent?id=AGENT_ID
```

**Response:** Same as `/dashboard/agent?id=AGENT_ID` (see metrics-api.md)

### LLM Queries

#### Get Provider Stats
```bash
GET /admin/queries/providers?format=json
```

**Response:**
```json
{
  "providers": [
    {
      "name": "groq",
      "requestCount": 1250,
      "tokenCount": 350000,
      "avgLatencyMs": 450,
      "errorRate": 0.02,
      "isActive": true,
      "cooldownUntil": null
    },
    {
      "name": "openai",
      "requestCount": 800,
      "tokenCount": 280000,
      "avgLatencyMs": 650,
      "errorRate": 0.01,
      "isActive": true,
      "cooldownUntil": null
    }
  ],
  "totalRequests": 2050,
  "totalTokens": 630000
}
```

**Fields:**
- `requestCount`: Total LLM requests
- `tokenCount`: Total tokens consumed
- `avgLatencyMs`: Average response time
- `errorRate`: 0-1 failure rate
- `cooldownUntil`: Timestamp when provider available again (null if active)

#### Get LLM Queue Status
```bash
GET /admin/queries/llm-queue
```

**Response:**
```json
{
  "queueLength": 5,
  "processing": 2,
  "pending": 3,
  "requests": [
    {
      "id": "req-123",
      "agentId": "agent-456",
      "provider": "groq",
      "status": "processing",
      "created": 1736774400000,
      "elapsed": 450
    }
  ]
}
```

### Universe Queries

#### List Universes
```bash
GET /admin/queries/universes
```

**Response:**
```json
{
  "universes": [
    {
      "id": "universe:main",
      "name": "Main Timeline",
      "created": 1736770000000,
      "tick": 14400,
      "population": 50,
      "status": "active"
    },
    {
      "id": "universe:experiment-1",
      "name": "Low Resources Test",
      "created": 1736774000000,
      "tick": 7200,
      "population": 45,
      "status": "paused"
    }
  ]
}
```

### Save Queries

#### List Snapshots
```bash
GET /admin/queries/snapshots?universeId=universe:main
```

**Response:**
```json
{
  "snapshots": [
    {
      "key": "snapshot-abc123",
      "name": "Pre-experiment backup",
      "tick": 14400,
      "timestamp": 1736774400000,
      "size": 5242880,
      "compressed": true
    }
  ],
  "count": 10
}
```

---

## Actions (State-Modifying)

Actions **modify game state**. Use with caution and create snapshots first.

### Agent Actions

#### Set Agent LLM Provider
```bash
POST /admin/actions/set-agent-llm
Content-Type: application/json

{
  "agentId": "agent-123",
  "provider": "groq"
}
```

**Parameters:**
- `agentId`: Target agent UUID
- `provider`: "groq" | "openai" | "anthropic" | "local" | null

**Response:**
```json
{
  "success": true,
  "agentId": "agent-123",
  "oldProvider": "openai",
  "newProvider": "groq"
}
```

**Use:** Switch agent AI providers for testing.

#### Spawn Agent
```bash
POST /admin/actions/spawn-agent
Content-Type: application/json

{
  "x": 100,
  "y": 150,
  "name": "TestAgent",
  "llmProvider": "groq"
}
```

**Parameters:**
- `x`, `y`: Spawn coordinates
- `name`: Agent name (optional, auto-generated if omitted)
- `llmProvider`: LLM provider (optional, defaults to "groq")

**Response:**
```json
{
  "success": true,
  "agentId": "agent-789",
  "name": "TestAgent",
  "position": {"x": 100, "y": 150}
}
```

#### Remove Agent
```bash
POST /admin/actions/remove-agent
Content-Type: application/json

{
  "agentId": "agent-123",
  "reason": "testing"
}
```

**WARNING:** This is destructive. Agent data is lost unless you have a snapshot.

### LLM Actions

#### Set Global LLM Provider
```bash
POST /admin/actions/set-global-llm
Content-Type: application/json

{
  "provider": "groq"
}
```

**Effect:** Sets default provider for all new agents.

#### Clear LLM Queue
```bash
POST /admin/actions/clear-llm-queue
Content-Type: application/json

{}
```

**Effect:** Cancels all pending LLM requests.

**Use:** Emergency action if queue is stuck.

### Universe Actions

#### Create Universe
```bash
POST /admin/actions/create-universe
Content-Type: application/json

{
  "name": "Experiment Timeline",
  "initialPopulation": 20,
  "worldSize": {"width": 200, "height": 200}
}
```

**Response:**
```json
{
  "success": true,
  "universeId": "universe:experiment-timeline",
  "name": "Experiment Timeline"
}
```

#### Fork Universe
```bash
POST /admin/actions/fork-universe
Content-Type: application/json

{
  "sourceId": "universe:main",
  "name": "Low Resources Fork"
}
```

**Response:**
```json
{
  "success": true,
  "sourceId": "universe:main",
  "forkId": "universe:low-resources-fork",
  "tick": 14400
}
```

**Effect:** Creates exact copy of universe at current tick.

**Use:** A/B testing, experiment branching.

#### Delete Universe
```bash
POST /admin/actions/delete-universe
Content-Type: application/json

{
  "universeId": "universe:experiment-1"
}
```

**WARNING:** Destructive and irreversible.

### Save/Load Actions

#### Save Universe
```bash
POST /admin/actions/save-universe
Content-Type: application/json

{
  "universeId": "universe:main",
  "name": "Pre-experiment backup",
  "description": "Backup before resource scarcity test"
}
```

**Response:**
```json
{
  "success": true,
  "snapshotKey": "snapshot-abc123",
  "tick": 14400,
  "size": 5242880
}
```

#### Load Snapshot
```bash
POST /admin/actions/load-snapshot
Content-Type: application/json

{
  "snapshotKey": "snapshot-abc123",
  "universeId": "universe:main"
}
```

**Effect:** Restores universe to snapshot state (time travel).

**WARNING:** Current state is lost unless you save first.

#### Time Travel
```bash
POST /admin/actions/time-travel
Content-Type: application/json

{
  "universeId": "universe:main",
  "targetTick": 10000
}
```

**Effect:** Rewinds or fast-forwards to specific tick.

**Requires:** Snapshot at or before target tick.

---

## Agent Control

### Complete Agent Control Example

```bash
# 1. Create snapshot before experiments
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:main", "name": "pre-agent-control"}'

# 2. Spawn test agent
response=$(curl -s -X POST http://localhost:8766/admin/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100, "name": "TestBot", "llmProvider": "groq"}')

agentId=$(echo "$response" | jq -r '.agentId')
echo "Spawned agent: $agentId"

# 3. Monitor agent
curl "http://localhost:8766/dashboard/agent?id=$agentId"

# 4. Change LLM provider
curl -X POST http://localhost:8766/admin/actions/set-agent-llm \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$agentId\", \"provider\": \"openai\"}"

# 5. Remove agent when done
curl -X POST http://localhost:8766/admin/actions/remove-agent \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$agentId\", \"reason\": \"experiment complete\"}"
```

---

## Universe Management

### A/B Testing Workflow

```bash
# 1. Save main universe
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:main", "name": "baseline"}'

# 2. Fork for experiment
response=$(curl -s -X POST http://localhost:8766/admin/actions/fork-universe \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "universe:main", "name": "experiment-low-resources"}')

experimentId=$(echo "$response" | jq -r '.forkId')

# 3. Modify experiment universe (hypothetical endpoint)
# Note: Actual modification requires game-specific APIs

# 4. Run both universes for 100 days
# (Use headless simulator or wait)

# 5. Compare results
main_pop=$(curl -s "http://localhost:8766/dashboard?session=universe:main" | jq '.metrics.population')
exp_pop=$(curl -s "http://localhost:8766/dashboard?session=$experimentId" | jq '.metrics.population')

echo "Main population: $main_pop"
echo "Experiment population: $exp_pop"
echo "Difference: $((exp_pop - main_pop))"

# 6. Delete experiment if not needed
curl -X POST http://localhost:8766/admin/actions/delete-universe \
  -H "Content-Type: application/json" \
  -d "{\"universeId\": \"$experimentId\"}"
```

---

## LLM Queue Control

### Monitor and Control LLM Queue

```bash
# Get queue status
queue=$(curl -s "http://localhost:8766/admin/queries/llm-queue")
queueLength=$(echo "$queue" | jq '.queueLength')

echo "Queue length: $queueLength"

# If queue too long, check provider stats
providers=$(curl -s "http://localhost:8766/admin/queries/providers?format=json")
echo "$providers" | jq '.providers[] | {name, errorRate, cooldownUntil}'

# Emergency: Clear stuck queue
if [ "$queueLength" -gt 100 ]; then
  echo "Queue stuck, clearing..."
  curl -X POST http://localhost:8766/admin/actions/clear-llm-queue \
    -H "Content-Type: application/json" \
    -d '{}'
fi
```

---

## Sprite Management

### Query Sprite Status
```bash
GET /admin/queries/sprite-queue
```

**Response:**
```json
{
  "pending": 5,
  "generating": 2,
  "completed": 150,
  "failed": 3,
  "queue": [
    {
      "id": "sprite-req-123",
      "description": "wooden barrel",
      "status": "generating",
      "progress": 0.6,
      "eta": 3000
    }
  ]
}
```

### Request Sprite Generation
```bash
POST /admin/actions/generate-sprite
Content-Type: application/json

{
  "description": "stone fountain with moss",
  "type": "building",
  "size": 32
}
```

**Use:** Generate sprites on-demand for testing.

---

## Safety Guidelines

### Before Destructive Actions

**ALWAYS create a snapshot first:**
```bash
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:main", "name": "before-experiment"}'
```

### Destructive Actions List

These actions **cannot be undone** without a snapshot:
- `remove-agent`
- `delete-universe`
- `load-snapshot` (overwrites current state)
- `clear-llm-queue` (cancels pending requests)

### Safe Actions

These actions are reversible or non-destructive:
- `set-agent-llm` (can change back)
- `spawn-agent` (can remove)
- `save-universe` (creates snapshot)
- `fork-universe` (creates copy)
- All queries (read-only)

### Best Practices

1. **Snapshot before experiments:**
   ```bash
   save → experiment → compare → restore or keep
   ```

2. **Test on forks, not main:**
   ```bash
   fork universe:main → modify fork → test → delete fork
   ```

3. **Monitor TPS impact:**
   ```bash
   # Check TPS before/after action
   curl -s "http://localhost:8766/admin/queries/system-overview" | jq '.tps'
   ```

4. **Verify actions succeeded:**
   ```bash
   response=$(curl -s -X POST ...)
   success=$(echo "$response" | jq -r '.success')
   if [ "$success" != "true" ]; then
     echo "Action failed!"
     exit 1
   fi
   ```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Agent not found",
  "code": "AGENT_NOT_FOUND",
  "timestamp": 1736774400000
}
```

### Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| `AGENT_NOT_FOUND` | Invalid agent ID | Verify agent exists with `/admin/queries/agents` |
| `UNIVERSE_NOT_FOUND` | Invalid universe ID | List universes with `/admin/queries/universes` |
| `SNAPSHOT_NOT_FOUND` | Invalid snapshot key | List snapshots with `/admin/queries/snapshots` |
| `INVALID_PROVIDER` | Unknown LLM provider | Use "groq", "openai", "anthropic", or "local" |
| `ACTION_FAILED` | Action execution failed | Check logs for details |

### Example Error Handling
```bash
response=$(curl -s -X POST http://localhost:8766/admin/actions/set-agent-llm \
  -H "Content-Type: application/json" \
  -d '{"agentId": "invalid-id", "provider": "groq"}')

success=$(echo "$response" | jq -r '.success')

if [ "$success" != "true" ]; then
  error=$(echo "$response" | jq -r '.error')
  code=$(echo "$response" | jq -r '.code')
  echo "Error [$code]: $error"
  exit 1
fi

echo "Success!"
```

---

## Performance Considerations

### Action Impact on TPS

| Action | Tick Blocking | Recommended Limit |
|--------|---------------|-------------------|
| `set-agent-llm` | ~1ms | 100/minute |
| `spawn-agent` | ~10ms | 10/minute |
| `remove-agent` | ~5ms | 20/minute |
| `save-universe` | ~500ms | 1/5 minutes |
| `load-snapshot` | ~1000ms | 1/10 minutes |
| `fork-universe` | ~800ms | 1/10 minutes |

**Rule:** If action blocks tick for >50ms, TPS drops below target 20.

**Best practice:** Batch actions during low-activity periods or pause simulation.

---

## Related Documentation

- **[metrics-api.md](./metrics-api.md)** - Metrics server API (read-only queries)
- **[interaction-guide.md](./interaction-guide.md)** - High-level interaction patterns
- **[experiment-workflows.md](./experiment-workflows.md)** - Common experiment patterns

---

## Troubleshooting

### Action Doesn't Execute
**Symptom:** `{"success": true}` but no effect

**Cause:** Action queued but game not processing actions

**Fix:**
```bash
# Check game is running
curl http://localhost:3000

# Check TPS
curl -s "http://localhost:8766/admin/queries/system-overview" | jq '.tps'
# Should be ~20, if 0 then game is paused
```

### Snapshot Not Found After Save
**Symptom:** `SNAPSHOT_NOT_FOUND` when loading recently saved snapshot

**Cause:** Save still processing or failed

**Fix:**
```bash
# List all snapshots
curl "http://localhost:8766/admin/queries/snapshots?universeId=universe:main"

# Check snapshot exists and has non-zero size
```

### Universe Fork Fails
**Symptom:** `{"success": false, "error": "Fork failed"}`

**Cause:** Source universe not found or disk space full

**Fix:**
```bash
# Verify source universe exists
curl "http://localhost:8766/admin/queries/universes" | jq '.universes[] | select(.id == "universe:main")'

# Check disk space
df -h
```
