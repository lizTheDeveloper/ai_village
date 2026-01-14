# Experiment Workflows for LLM Agents

**Purpose:** Common experiment patterns and testing methodologies.

---

## Hypothesis → Test → Analyze Workflow

### Standard Scientific Method
```bash
# 1. Define hypothesis
# H0: Increasing initial resources by 50% leads to 20%+ population growth

# 2. Create baseline
curl -X POST http://localhost:8766/admin/actions/save-universe \
  -d '{"universeId": "universe:main", "name": "baseline"}'

# 3. Fork for experiment
curl -X POST http://localhost:8766/admin/actions/fork-universe \
  -d '{"sourceId": "universe:main", "name": "high-resources"}'

# 4. Modify experimental condition
# (Requires custom implementation to modify resources)

# 5. Run both for 100 days
# Use headless simulator at 100x speed

# 6. Analyze results
baseline_pop=$(curl "http://localhost:8766/dashboard?session=universe:main&days=100" | jq '.metrics.population')
experiment_pop=$(curl "http://localhost:8766/dashboard?session=universe:high-resources&days=100" | jq '.metrics.population')

growth=$(echo "scale=2; ($experiment_pop - $baseline_pop) / $baseline_pop * 100" | bc)
echo "Population growth: $growth%"

# 7. Conclusion
if (( $(echo "$growth > 20" | bc -l) )); then
  echo "✅ Hypothesis confirmed"
else
  echo "❌ Hypothesis rejected"
fi
```

---

## Population Dynamics Experiments

### Test Starvation Resistance
```javascript
// Run headless simulation with low initial food
const sim = new HeadlessCitySimulator({
  preset: 'basic',
  // Modify to reduce initial food (requires code change)
});

let starvationDeaths = 0;

sim.on('agent', (event) => {
  if (event.event === 'death' && event.causeOfDeath === 'hunger') {
    starvationDeaths++;
  }
});

sim.setSpeed(100);
sim.start();

sim.on('day', (day) => {
  if (day === 30) {
    sim.pause();
    const totalDeaths = /* query deaths */;
    const starvationRate = starvationDeaths / totalDeaths;
    console.log(`Starvation rate: ${(starvationRate * 100).toFixed(1)}%`);
  }
});
```

---

## Economic Balance Testing

### Test Gini Coefficient Stability
```bash
# Query Gini over 100 days
curl "http://localhost:8766/api/timeseries?session=latest&metrics=gini&interval=86400000" | \
  jq '.metrics[0].data[] | {day: (.timestamp / 86400000), gini: .value}'

# Acceptable: Gini stays 0.25-0.45
# Warning: Gini >0.6 (extreme inequality)
# Failure: Gini continuously increasing
```

---

## Social Behavior Studies

### Test Network Formation
```javascript
// Track social network density over time
const densityData = [];

sim.on('day', async (day) => {
  if (day % 10 === 0) {
    const metrics = await fetch('http://localhost:8766/dashboard?session=latest').then(r => r.json());
    densityData.push({
      day,
      density: metrics.metrics.socialNetwork.density,
      clustering: metrics.metrics.socialNetwork.clustering,
    });
  }

  if (day === 100) {
    // Analyze: density should increase, then stabilize
    console.log('Network formation:', densityData);
  }
});
```

---

## Magic System Validation

### Test Spell Balance
```bash
# Enable magic for all agents
agents=$(curl -s "http://localhost:8766/dashboard/agents?session=latest" | jq -r '.agents[].id')

for agentId in $agents; do
  curl -X POST http://localhost:8766/admin/actions/set-agent-llm \
    -d "{\"agentId\": \"$agentId\", \"provider\": \"groq\"}"
done

# Run for 10 days
sleep 600  # 10 minutes real time at 1x speed

# Query magic usage
curl "http://localhost:8766/dashboard?session=latest" | \
  jq '.metrics.magic_spells_cast | group_by(.spell) | map({spell: .[0].spell, count: length})'
```

---

## Performance Profiling

### Identify Bottleneck Systems
```bash
# Run for 1000 ticks
# Query system timing
curl "http://localhost:8766/admin/queries/system-timing" | \
  jq '.systems | sort_by(.avgTickTimeMs) | reverse | .[0:5]'

# Expected: No system >20ms average
# If found: Focus optimization on that system
```

---

## Regression Testing

### Test Suite Pattern
```bash
#!/bin/bash
set -e

echo "Running regression tests..."

# Test 1: Population stability
./test-population-stability.sh
echo "✅ Test 1 passed"

# Test 2: No starvation deaths
./test-starvation-resistance.sh
echo "✅ Test 2 passed"

# Test 3: TPS performance
./test-tps-performance.sh
echo "✅ Test 3 passed"

echo "All regression tests passed!"
```

---

## Related Documentation

- **[observation-guide.md](./observation-guide.md)** - What to measure
- **[headless-gameplay.md](./headless-gameplay.md)** - Long-running experiments
- **[examples.md](./examples.md)** - Complete working code
