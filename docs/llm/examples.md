# Complete Examples for LLM Agents

**Purpose:** Working code examples with expected outputs.

---

## Example 1: Query All Agents and Their Needs

### Bash
```bash
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq '.agents[] | {name, hunger: .needs.hunger, energy: .needs.energy, behavior}'
```

### Expected Output
```json
{
  "name": "Alice",
  "hunger": 0.7,
  "energy": 0.4,
  "behavior": "gathering"
}
{
  "name": "Bob",
  "hunger": 0.3,
  "energy": 0.8,
  "behavior": "rest"
}
```

### Analysis
```bash
# Calculate average hunger
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq '[.agents[].needs.hunger] | add / length'

# Output: 0.65
```

---

## Example 2: Track Agent Lifecycle Over 24 Hours

### JavaScript (Node.js)
```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8765');
const lifecycleData = [];

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.type === 'agent' && (msg.data.event === 'birth' || msg.data.event === 'death')) {
    lifecycleData.push({
      timestamp: Date.now(),
      event: msg.data.event,
      agentId: msg.data.agentId,
      name: msg.data.name,
      causeOfDeath: msg.data.causeOfDeath,
    });

    console.log(`${msg.data.event.toUpperCase()}: ${msg.data.name} ${msg.data.causeOfDeath ? '(' + msg.data.causeOfDeath + ')' : ''}`);
  }
});

// After 24 hours
setTimeout(() => {
  console.log(`\nLifecycle Summary (24 hours):`);
  const births = lifecycleData.filter(e => e.event === 'birth').length;
  const deaths = lifecycleData.filter(e => e.event === 'death').length;
  console.log(`Births: ${births}`);
  console.log(`Deaths: ${deaths}`);
  console.log(`Net change: ${births - deaths}`);

  ws.close();
}, 24 * 60 * 60 * 1000);
```

### Expected Output
```
BIRTH: Charlie
DEATH: Alice (hunger)
BIRTH: Diana
...
Lifecycle Summary (24 hours):
Births: 12
Deaths: 8
Net change: +4
```

---

## Example 3: Analyze Social Network Formation

### Python
```python
import requests
import time

def get_network_metrics():
    response = requests.get('http://localhost:8766/dashboard?session=latest')
    data = response.json()
    return {
        'density': data['metrics']['socialNetwork']['density'],
        'clustering': data['metrics']['socialNetwork']['clustering'],
        'isolated': data['metrics']['socialNetwork']['isolatedAgents'],
    }

# Track over 10 days
results = []
for day in range(10):
    metrics = get_network_metrics()
    results.append({'day': day, **metrics})
    print(f"Day {day}: Density={metrics['density']:.2f}, Clustering={metrics['clustering']:.2f}")
    time.sleep(72)  # 72 seconds = 1 game day at 1x speed

# Analyze growth
print("\nNetwork Formation Analysis:")
print(f"Initial density: {results[0]['density']:.2f}")
print(f"Final density: {results[-1]['density']:.2f}")
print(f"Growth: {(results[-1]['density'] - results[0]['density']) / results[0]['density'] * 100:.1f}%")
```

### Expected Output
```
Day 0: Density=0.05, Clustering=0.10
Day 1: Density=0.08, Clustering=0.15
...
Day 9: Density=0.22, Clustering=0.35

Network Formation Analysis:
Initial density: 0.05
Final density: 0.22
Growth: 340.0%
```

---

## Example 4: Run Headless Performance Benchmark

### JavaScript
```javascript
import { HeadlessCitySimulator } from '@ai-village/city-simulator';

async function benchmark() {
  const presets = ['basic', 'large-city'];

  for (const preset of presets) {
    const sim = new HeadlessCitySimulator({ preset, autoRun: false });
    await sim.initialize();

    // Measure entity count
    const entityCount = sim.getWorld().query().executeEntities().length;

    // Measure TPS
    sim.setSpeed(1);
    sim.start();
    await new Promise(resolve => setTimeout(resolve, 30000));
    const tps = sim.getStats().ticksPerSecond;

    console.log(`${preset}: ${entityCount} entities, ${tps.toFixed(2)} TPS`);
    sim.pause();
  }
}

benchmark();
```

### Expected Output
```
basic: 125 entities, 20.00 TPS
large-city: 450 entities, 18.50 TPS
```

---

## Example 5: Test Magic Spell Balance

### Bash Script
```bash
#!/bin/bash

# Get all agents
agents=$(curl -s "http://localhost:8766/dashboard/agents?session=latest" | jq -r '.agents[].id')

# Enable LLM for all agents (enables magic)
for agentId in $agents; do
  curl -s -X POST http://localhost:8766/admin/actions/set-agent-llm \
    -H "Content-Type: application/json" \
    -d "{\"agentId\": \"$agentId\", \"provider\": \"groq\"}"
done

echo "Enabled LLM for all agents, waiting 10 minutes..."
sleep 600

# Query spell usage
curl -s "http://localhost:8766/dashboard?session=latest" | \
  jq -r '.metrics.magic_spells_cast | group_by(.spell) | .[] | "\(.[0].spell): \(length)"'
```

### Expected Output
```
fireball: 5
heal: 12
teleport: 3
```

---

## Example 6: A/B Test Universe Fork

### Complete Workflow
```bash
#!/bin/bash
set -e

echo "=== A/B Test: Low Resources Impact ==="

# 1. Save baseline
echo "Saving baseline..."
curl -s -X POST http://localhost:8766/admin/actions/save-universe \
  -H "Content-Type: application/json" \
  -d '{"universeId": "universe:main", "name": "ab-test-baseline"}' | jq

# 2. Fork universe
echo "Forking universe..."
fork_response=$(curl -s -X POST http://localhost:8766/admin/actions/fork-universe \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "universe:main", "name": "low-resources-fork"}')
fork_id=$(echo "$fork_response" | jq -r '.forkId')
echo "Fork ID: $fork_id"

# 3. Modify fork (hypothetical - requires custom implementation)
# Would reduce initial resources by 50%

# 4. Run both for 100 days (use headless simulator)
echo "Running experiment for 100 days..."
# Start headless simulators for both universes
# (Requires multiple simulator instances or sequential runs)

# 5. Compare results after 100 days
echo "Comparing results..."
main_data=$(curl -s "http://localhost:8766/dashboard?session=universe:main")
fork_data=$(curl -s "http://localhost:8766/dashboard?session=$fork_id")

main_pop=$(echo "$main_data" | jq '.metrics.population')
fork_pop=$(echo "$fork_data" | jq '.metrics.population')

echo "Main universe population: $main_pop"
echo "Fork universe population: $fork_pop"
echo "Difference: $((fork_pop - main_pop))"

# 6. Cleanup
echo "Cleaning up fork..."
curl -s -X POST http://localhost:8766/admin/actions/delete-universe \
  -H "Content-Type: application/json" \
  -d "{\"universeId\": \"$fork_id\"}" | jq

echo "=== A/B Test Complete ==="
```

---

## Example 7: Export and Analyze Agent Data

### Python Analysis
```python
import requests
import pandas as pd
import matplotlib.pyplot as plt

# Fetch agent data
response = requests.get('http://localhost:8766/dashboard/agents?session=latest')
agents = response.json()['agents']

# Convert to DataFrame
df = pd.DataFrame(agents)

# Analysis
print("Population:", len(df))
print("\nBehavior Distribution:")
print(df['behavior'].value_counts())

print("\nAverage Needs:")
needs_df = pd.DataFrame(df['needs'].tolist())
print(needs_df.mean())

# Visualization
needs_df.mean().plot(kind='bar', title='Average Agent Needs')
plt.ylabel('Value (0-1)')
plt.savefig('agent_needs.png')

# Find struggling agents (hunger < 0.3)
struggling = df[df['needs'].apply(lambda x: x['hunger'] < 0.3)]
print(f"\nStruggling agents: {len(struggling)}")
print(struggling[['name', 'behavior']])
```

### Expected Output
```
Population: 50

Behavior Distribution:
gathering     15
rest          12
crafting       8
building       7
farming        5
social         3

Average Needs:
hunger         0.65
energy         0.72
thirst         0.88
social         0.45
cleanliness    0.60

Struggling agents: 3
          name    behavior
5        Alice   gathering
12         Bob   gathering
23    Charlie      crafting
```

---

## Related Documentation

- **[metrics-api.md](./metrics-api.md)** - API reference
- **[observation-guide.md](./observation-guide.md)** - What to analyze
- **[experiment-workflows.md](./experiment-workflows.md)** - Experiment patterns
