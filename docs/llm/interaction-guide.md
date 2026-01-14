# Interaction Guide for LLM Agents

**Purpose:** Modify game state, issue commands, run experiments programmatically.

---

## Selecting Agents

### Query and Select
```bash
# List all agents
agents=$(curl -s "http://localhost:8766/dashboard/agents?session=latest")

# Get first agent ID
agentId=$(echo "$agents" | jq -r '.agents[0].id')

# Select in UI (browser console)
game.setSelectedAgent("$agentId")
```

---

## Issuing Commands

### Set Agent LLM Provider
```bash
curl -X POST http://localhost:8766/admin/actions/set-agent-llm \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent-123", "provider": "groq"}'
```

**Providers:** "groq" | "openai" | "anthropic" | "local" | null

### Spawn Entities
```bash
# Spawn agent
curl -X POST http://localhost:8766/admin/actions/spawn-agent \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100, "name": "TestBot", "llmProvider": "groq"}'

# Spawn building (via browser console)
__gameTest.placeBuilding('tent', 50, 75)

# Spawn resource (not yet implemented via API)
```

### Modify Agent State
```bash
# Grant XP (browser console)
game.grantSkillXP('agent-123', 500)  // 500 XP = 5 levels

# Get skills
game.getAgentSkills('agent-123')
```

---

## Running Experiments

### Workflow Pattern
```bash
# 1. Save state
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -d '{"universeId": "universe:main", "name": "pre-experiment"}'

# 2. Modify state
curl -X POST http://localhost:8766/admin/actions/spawn-agent \
  -d '{"x": 100, "y": 100, "llmProvider": "groq"}'

# 3. Observe results
sleep 60  # Wait 1 minute
curl "http://localhost:8766/dashboard?session=latest" | jq '.metrics.population'

# 4. Restore or keep
curl -X POST http://localhost:8766/admin/actions/load-snapshot \
  -d '{"snapshotKey": "snapshot-abc123"}'
```

---

## Time Travel & Forking

### A/B Testing Pattern
```bash
# Save baseline
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -d '{"universeId": "universe:main", "name": "baseline"}'

# Fork universe
response=$(curl -X POST http://localhost:8766/admin/actions/fork-universe \
  -d '{"sourceId": "universe:main", "name": "experiment-A"}')
forkId=$(echo "$response" | jq -r '.forkId')

# Modify fork (hypothetical - requires custom implementation)
# ...

# Run both for 100 days
# Compare results
main=$(curl "http://localhost:8766/dashboard?session=universe:main" | jq '.metrics.population')
fork=$(curl "http://localhost:8766/dashboard?session=$forkId" | jq '.metrics.population')
echo "Main: $main, Fork: $fork, Diff: $((fork - main))"
```

---

## Validation Workflows

### Validate Change Doesn't Break Game
```bash
# Before change
before=$(curl -s "http://localhost:8766/dashboard?session=latest")
beforePop=$(echo "$before" | jq '.metrics.population')
beforeTPS=$(echo "$before" | jq '.performance.tickDuration')

# Make change
curl -X POST http://localhost:8766/admin/actions/spawn-agent \
  -d '{"x": 100, "y": 100}'

# After change (wait 30 seconds)
sleep 30
after=$(curl -s "http://localhost:8766/dashboard?session=latest")
afterPop=$(echo "$after" | jq '.metrics.population')
afterTPS=$(echo "$after" | jq '.performance.tickDuration')

# Validate
if [ "$afterPop" -eq $((beforePop + 1)) ]; then
  echo "✅ Population increased by 1"
else
  echo "❌ Unexpected population change"
fi

if (( $(echo "$afterTPS < 50" | bc -l) )); then
  echo "✅ TPS stable"
else
  echo "❌ TPS degraded"
fi
```

---

## Safety Practices

### Always Create Snapshots
```bash
# GOOD: Save before risky operation
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -d '{"universeId": "universe:main", "name": "before-delete"}'

curl -X POST http://localhost:8766/admin/actions/remove-agent \
  -d '{"agentId": "agent-123"}'

# Restore if needed
curl -X POST http://localhost:8766/admin/actions/load-snapshot \
  -d '{"snapshotKey": "snapshot-abc123"}'
```

### Test on Forks
```bash
# GOOD: Experiment on fork, not main
curl -X POST http://localhost:8766/admin/actions/fork-universe \
  -d '{"sourceId": "universe:main", "name": "test-fork"}'

# Run experiments on fork
# Delete fork when done
curl -X POST http://localhost:8766/admin/actions/delete-universe \
  -d '{"universeId": "universe:test-fork"}'
```

---

## Related Documentation

- **[admin-api.md](./admin-api.md)** - Complete API reference
- **[experiment-workflows.md](./experiment-workflows.md)** - Common patterns
- **[examples.md](./examples.md)** - Working examples
