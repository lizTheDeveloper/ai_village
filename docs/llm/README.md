# LLM Interaction Guide for Multiverse: The End of Eternity

**Target Audience:** Language Model agents seeking to observe, analyze, and interact with the game simulation programmatically.

**Last Updated:** 2026-01-13

---

## Purpose

This documentation enables LLM agents to interact with the game simulation through APIs without browser UI access. You can observe emergent behavior, run experiments, analyze social dynamics, test game balance, and validate AI systems programmatically.

## Three Modes of Interaction

### 1. Observer Mode (Read-Only)
Query game state, metrics, and telemetry without modifying simulation:
- Monitor agent lifecycle (birth → behavior → death)
- Track social network formation and evolution
- Analyze economic trends (resource flows, wealth inequality)
- Observe spatial patterns (territories, heatmaps, movement)
- Profile system performance (TPS, memory, bottlenecks)

**Use cases:** Data analysis, emergent behavior detection, performance monitoring, regression detection

### 2. Controller Mode (State Modification)
Issue commands and modify game state through admin API:
- Spawn/remove entities programmatically
- Set agent LLM providers and parameters
- Adjust strategic priorities
- Trigger specific events
- Fork universes for A/B testing

**Use cases:** Automated testing, experiment setup, balance tuning, hypothesis validation

### 3. Experimenter Mode (Headless Simulation)
Run long-duration simulations at accelerated speed:
- Fast-forward to weeks/months of game time
- Test population dynamics over 100+ days
- Validate magic system balance
- Profile performance at scale
- A/B test universe forks with different initial conditions

**Use cases:** Overnight testing, time-lapse observation, scalability validation, reproduction system testing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  LLM Agent (You)                                    │
│  - curl/HTTP requests                               │
│  - WebSocket streaming                              │
│  - Headless game control                            │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  Metrics Server (http://localhost:8766)             │
│  - REST API endpoints                               │
│  - Admin dashboard queries                          │
│  - WebSocket streaming (port 8765)                  │
│  - Performance metrics, agent snapshots             │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  Game Engine (ECS @ 20 TPS)                         │
│  - 212+ systems (agent AI, plants, buildings)       │
│  - 4,000-6,000 entities                             │
│  - Event bus (agent:birth, resource:gathered, etc.) │
│  - MetricsCollectionSystem (priority 999)           │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│  Headless City Simulator (http://localhost:3032)    │
│  - Full game engine without rendering               │
│  - Fast-forward simulation (1-100x speed)           │
│  - Preset configurations (basic, large-city, etc.)  │
│  - Programmatic control API                         │
└─────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Game systems emit events → MetricsCollectionSystem
2. Metrics batched and stored (hot/warm/cold tiers)
3. Metrics streamed to server (http://localhost:8766)
4. LLM queries via REST API or WebSocket
5. Admin actions modify game state via capabilities API

---

## Quick Start Examples

### Example 1: Query All Agents and Their Needs
```bash
curl "http://localhost:8766/dashboard/agents?session=latest" | jq '.agents[] | {name: .name, hunger: .needs.hunger, energy: .needs.energy}'
```

**Response:**
```json
{
  "name": "Alice",
  "hunger": 0.7,
  "energy": 0.4
}
{
  "name": "Bob",
  "hunger": 0.3,
  "energy": 0.8
}
```

### Example 2: Track Agent Lifecycle Over 24 Hours
```bash
# Start watching (WebSocket)
wscat -c ws://localhost:8765

# Server sends:
{
  "type": "metrics_update",
  "data": {
    "agent_lifecycle": {
      "agent-123": {
        "birthTimestamp": 1234567890,
        "lifespan": 14400,
        "causeOfDeath": "hunger",
        "childrenCount": 2
      }
    }
  }
}
```

### Example 3: Run Headless Performance Benchmark
```javascript
// Node.js script
const simulator = new HeadlessCitySimulator({ preset: 'large-city' });
await simulator.initialize();

simulator.setSpeed(100); // 100x fast-forward
simulator.start();

setTimeout(() => {
  const stats = simulator.getStats();
  console.log(`TPS: ${stats.ticksPerSecond.toFixed(2)}`);
  console.log(`Population: ${stats.cityStats.population}`);
  console.log(`Entity count: ${stats.cityStats.totalBuildings + stats.cityStats.population}`);
}, 30000); // After 30 seconds
```

### Example 4: Test Magic Spell Balance
```bash
# Set agent LLM provider to enable magic
curl -X POST http://localhost:8766/admin/actions/set-agent-llm \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent-123", "provider": "groq"}'

# Query magic usage after 1000 ticks
curl "http://localhost:8766/dashboard?session=latest" | jq '.metrics.magic_spells_cast'
```

### Example 5: A/B Test Universe Fork
```bash
# Create universe fork
curl -X POST http://localhost:8766/admin/actions/fork-universe \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "universe:main", "name": "experiment-low-resources"}'

# Modify initial resources in fork
curl -X POST http://localhost:8766/admin/actions/modify-universe-state \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:experiment-low-resources", "resources": {"wheat": 10}}'

# Compare results after 100 days
curl "http://localhost:8766/dashboard?session=universe:main&days=100" > main.json
curl "http://localhost:8766/dashboard?session=universe:experiment-low-resources&days=100" > experiment.json
diff <(jq '.metrics.population' main.json) <(jq '.metrics.population' experiment.json)
```

---

## Documentation Structure

### Core API References
- **[metrics-api.md](./metrics-api.md)** - Metrics server REST API, query patterns, response formats
- **[admin-api.md](./admin-api.md)** - Admin dashboard API, capabilities, queries vs actions
- **[headless-gameplay.md](./headless-gameplay.md)** - City simulator API, presets, speed control

### Analysis Guides
- **[observation-guide.md](./observation-guide.md)** - What to observe, patterns to identify, metrics to track
- **[interaction-guide.md](./interaction-guide.md)** - How to modify game state, issue commands, validate changes

### Experiment Workflows
- **[experiment-workflows.md](./experiment-workflows.md)** - Common patterns for hypothesis testing, A/B comparison
- **[examples.md](./examples.md)** - Complete working examples with curl commands and response parsing

---

## Key Capabilities

### Read-Only Observation
- **Agent snapshots**: Full lifecycle tracking from birth to death
- **Performance metrics**: FPS, tick duration, memory usage, system timing
- **Economic metrics**: Resource flows, Gini coefficient, wealth distribution
- **Social networks**: Relationship graphs, centrality, clustering, communities
- **Spatial analytics**: Heatmaps, territories, movement trails, hotspots
- **Behavioral patterns**: Activity distribution, behavior adoption curves
- **Time-series data**: Population, needs, resources over time

### State Modification
- **Agent control**: Set LLM provider, spawn/remove agents, grant XP
- **Entity spawning**: Create buildings, resources, plants programmatically
- **Strategic priorities**: Override CityManager decisions
- **Universe management**: Fork, load, save, time travel
- **Event triggering**: Force decisions, weather changes, emergent events

### Experimentation
- **Headless simulation**: Run at 100x speed without rendering
- **Preset configurations**: basic (50 agents), large-city (200 agents), population-growth (20 agents)
- **Time travel**: Revert to snapshots, replay history, fork timelines
- **Performance profiling**: Measure TPS at different entity counts
- **Regression testing**: Validate changes don't break game balance

---

## Data Access Methods

### 1. HTTP REST API (Metrics Server)
**Best for:** One-time queries, periodic polling, dashboard data

```bash
curl http://localhost:8766/dashboard?session=latest
curl http://localhost:8766/dashboard/agents?session=SESSION_ID
curl http://localhost:8766/dashboard/agent?id=AGENT_ID
```

### 2. WebSocket Streaming (Real-time)
**Best for:** Live monitoring, event-driven updates, continuous observation

```bash
wscat -c ws://localhost:8765
# Receives: {"type": "metrics_update", "data": {...}}
```

### 3. Admin API (Control)
**Best for:** State modification, experiment setup, automated testing

```bash
curl http://localhost:8766/admin/queries/providers
curl -X POST http://localhost:8766/admin/actions/set-agent-llm -d '{...}'
```

### 4. Headless Simulator API (Long-running)
**Best for:** Overnight experiments, performance benchmarking, time-lapse analysis

```javascript
const sim = new HeadlessCitySimulator({preset: 'large-city'});
await sim.initialize();
sim.setSpeed(100);
sim.start();
```

---

## Response Formats

All API endpoints return JSON. Data structures are documented in detail in:
- **metrics-api.md** - Metrics server response schemas
- **admin-api.md** - Admin API response schemas
- **examples.md** - Complete response examples with field descriptions

**Common response structure:**
```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "timestamp": 1234567890,
  "session": "session-abc123"
}
```

**Error response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": 1234567890
}
```

---

## Safety Considerations

### Read-Only Operations (Safe)
- All GET requests to metrics endpoints
- WebSocket subscriptions
- Admin queries (`/admin/queries/*`)
- Headless simulator state reading

### State-Modifying Operations (Use Caution)
- Admin actions (`/admin/actions/*`)
- Entity spawning/removal
- Universe forking
- Agent LLM provider changes

**WARNING:** Some operations are destructive and cannot be undone:
- Entity removal (agents, buildings)
- Universe deletion
- State modification without snapshots

**Best Practice:** Always create a snapshot before destructive operations:
```bash
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -d '{"universeId": "universe:main", "name": "pre-experiment-backup"}'
```

---

## Performance Considerations

### Rate Limiting
- Metrics API: No enforced limit, but recommend max 10 requests/second
- WebSocket: Automatic throttling, snapshots every 100 ticks (5 seconds)
- Admin API: No limit, but state changes are expensive

### Query Optimization
- Use `session=latest` for most recent data (cached)
- Specify time ranges to reduce data transfer: `?start=TIMESTAMP&end=TIMESTAMP`
- Use WebSocket for continuous monitoring instead of polling
- Cache responses when data doesn't change frequently

### Impact on Simulation
- **Metrics queries:** Negligible (<0.1ms)
- **Admin queries:** Low (<1ms)
- **Admin actions:** Medium (1-10ms, blocks tick)
- **Entity spawning:** High (10-50ms, may drop TPS temporarily)

**Rule of thumb:** If TPS drops below 15, reduce query frequency or entity count.

---

## Getting Started

1. **Start the game server:**
   ```bash
   cd custom_game_engine && ./start.sh server
   ```
   This starts:
   - Metrics server (http://localhost:8766)
   - WebSocket server (ws://localhost:8765)
   - Game engine (background)

2. **Verify connectivity:**
   ```bash
   curl http://localhost:8766/dashboard?session=latest
   wscat -c ws://localhost:8765
   ```

3. **Choose your mode:**
   - **Observer:** Start with metrics-api.md and observation-guide.md
   - **Controller:** Read admin-api.md and interaction-guide.md
   - **Experimenter:** Begin with headless-gameplay.md and experiment-workflows.md

4. **Run your first experiment:**
   See examples.md for complete working examples with expected outputs.

---

## Related Documentation

- **[../CLAUDE.md](../../CLAUDE.md)** - Human developer guidelines
- **[../../custom_game_engine/ARCHITECTURE_OVERVIEW.md](../../custom_game_engine/ARCHITECTURE_OVERVIEW.md)** - ECS architecture
- **[../../custom_game_engine/SYSTEMS_CATALOG.md](../../custom_game_engine/SYSTEMS_CATALOG.md)** - All 212+ systems
- **[../../custom_game_engine/packages/metrics/README.md](../../custom_game_engine/packages/metrics/README.md)** - Metrics system internals
- **[../../custom_game_engine/packages/city-simulator/README.md](../../custom_game_engine/packages/city-simulator/README.md)** - Headless simulator internals

---

## Support

If you encounter issues or have questions:
1. Check relevant documentation sections above
2. Verify server is running: `curl http://localhost:8766/api/health`
3. Check logs: `tail -f custom_game_engine/logs/metrics-server.log`
4. Review browser console (F12) for client-side errors

For LLM-specific issues:
- Invalid JSON responses: Check endpoint path and parameters
- Connection refused: Ensure `./start.sh server` is running
- Empty data: Verify game is running and generating metrics
- Timeout errors: Reduce query complexity or increase timeout
