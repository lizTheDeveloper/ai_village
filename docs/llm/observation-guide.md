# Observation Guide for LLM Agents

**Purpose:** Identify what to observe, which patterns to track, and how to detect emergent behavior.

---

## What to Observe

### 1. Agent Lifecycle Tracking

**Birth → Behavior → Death cycle:**
```bash
# Monitor births
wscat -c ws://localhost:8765 | grep "\"event\":\"birth\""

# Track deaths by cause
curl -s "http://localhost:8766/dashboard?session=latest" | \
  jq '.metrics.agent_lifecycle | group_by(.causeOfDeath) | map({cause: .[0].causeOfDeath, count: length})'
```

**Metrics to track:**
- `avgLifespan`: Average ticks alive (target: >7200 = ~6 hours)
- `childrenCount`: Reproduction rate
- `causeOfDeath`: "hunger" | "thirst" | "old_age" | "attacked"
- `generationDistribution`: How many agents in each generation

**Patterns to identify:**
- **Population collapse:** Sudden drop in population
- **Starvation cycles:** Periodic hunger deaths
- **Successful lineages:** Families with many descendants

---

### 2. Behavioral Patterns

**Activity distribution:**
```bash
curl -s "http://localhost:8766/dashboard/agents?session=latest" | \
  jq '.agents | group_by(.behavior) | map({behavior: .[0].behavior, count: length}) | sort_by(.count) | reverse'
```

**Metrics:**
- `dominantBehaviors`: Top 3 behaviors by frequency
- `behaviorDiversity`: Number of unique behaviors
- `adoptionCurves`: S-curve adoption patterns

**Patterns:**
- **Monoculture:** All agents doing same behavior (bad sign)
- **Healthy diversity:** 5+ behaviors with balanced distribution
- **Innovation adoption:** New behaviors spreading through population

---

### 3. Social Network Analysis

**Network formation:**
```bash
curl -s "http://localhost:8766/dashboard?session=latest" | \
  jq '{density: .metrics.socialNetwork.density, clustering: .metrics.socialNetwork.clustering, isolated: .metrics.socialNetwork.isolatedAgents}'
```

**Metrics:**
- `density`: 0-1, edges / max possible edges (target: 0.1-0.3)
- `clustering`: 0-1, how clique-like (target: 0.2-0.4)
- `isolatedAgents`: Count with no connections (target: <10%)
- `centralityScores`: Influence ranking

**Patterns:**
- **Healthy network:** Density 0.1-0.3, few isolated agents
- **Over-connected:** Density >0.5 (unrealistic)
- **Fragmented:** Multiple disconnected clusters
- **Power law:** Few highly connected agents, many with 1-2 connections

---

### 4. Economic Metrics

**Resource flows:**
```bash
curl -s "http://localhost:8766/dashboard?session=latest" | \
  jq '{gini: .metrics.wealthDistribution.giniCoefficient, top10: .metrics.wealthDistribution.top10Percent, bottom50: .metrics.wealthDistribution.bottom50Percent}'
```

**Metrics:**
- `giniCoefficient`: 0-1 inequality (0=equality, 1=max inequality)
  - Target: 0.25-0.45 (realistic societies)
  - Warning: >0.6 (extreme inequality)
- `resourcesGathered`: Total by type
- `resourcesConsumed`: Consumption rate
- `stockpiles`: Available reserves

**Patterns:**
- **Balanced economy:** Gini 0.3-0.4, stable stockpiles
- **Resource crisis:** Stockpiles declining, Gini rising
- **Hoarding:** Few agents hold majority of resources

---

### 5. Spatial Patterns

**Territory formation:**
```bash
curl "http://localhost:8766/api/metrics/spatial"
```

**Metrics:**
- `heatmaps`: Density by location
- `territories`: Community boundary polygons
- `hotspots`: High-activity areas
- `trails`: Movement patterns

**Patterns:**
- **Clustering:** Agents group in specific areas
- **Territories:** Communities claim distinct regions
- **Migration:** Movement trails show expansion
- **Centralization:** Single hotspot vs distributed activity

---

### 6. Performance Profiling

**System bottlenecks:**
```bash
curl "http://localhost:8766/admin/queries/system-timing" | \
  jq '.systems | sort_by(.avgTickTimeMs) | reverse | .[0:10]'
```

**Metrics:**
- `tickDuration`: <50ms target (20 TPS)
- `systemTiming`: Per-system execution time
- `slowestSystem`: Identify bottleneck
- `memoryUsage`: Track for leaks

**Patterns:**
- **Healthy:** TPS 18-20, tick duration 8-15ms
- **Warning:** TPS 15-18, some systems >10ms
- **Critical:** TPS <15, tick duration >50ms

---

## Time-Series Analysis

### Population Trends
```bash
# Query population over time
curl "http://localhost:8766/api/timeseries?session=latest&metrics=population&interval=60000" | \
  jq '.metrics[0].data[] | {time: .timestamp, pop: .value}'
```

**Patterns:**
- **Stable:** ±10% variation
- **Growth:** Consistent upward trend
- **Decline:** Population dropping
- **Oscillation:** Boom-bust cycles

### Needs Tracking
```bash
curl "http://localhost:8766/api/timeseries?session=latest&metrics=avgHunger,avgEnergy,avgThirst"
```

**Healthy ranges:**
- `avgHunger`: 0.5-0.8 (well-fed)
- `avgEnergy`: 0.4-0.8 (rested)
- `avgThirst`: 0.6-1.0 (hydrated)

**Warning signs:**
- Any metric <0.3 consistently
- High variance (boom-bust)
- Correlated crashes (all needs drop together)

---

## Emergent Behavior Detection

### 1. Innovation Spread
Track when new behaviors appear and how they spread:

```javascript
// Subscribe to innovation events
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'agent' && msg.data.event === 'innovation') {
    console.log(`New behavior: ${msg.data.behavior} by ${msg.data.agentId}`);
  }
};
```

### 2. Spontaneous Organization
Detect when agents self-organize without central control:

- **Division of labor:** Agents specialize in behaviors
- **Territory formation:** Communities claim regions
- **Trade routes:** Repeated exchanges between same agents

### 3. Cultural Transmission
Track how behaviors spread through social connections:

```bash
# Get cultural diffusion data
curl "http://localhost:8766/api/metrics/cultural" | \
  jq '.cascadeTrees[] | {behavior, rootAgent, childCount: .children | length}'
```

---

## Correlation Analysis

### Cross-Metric Relationships
```bash
# Get time series for multiple metrics
curl "http://localhost:8766/api/timeseries?session=latest&metrics=population,avgHealth,avgHunger" > timeseries.json

# Calculate correlations (Python)
import json, numpy as np
data = json.load(open('timeseries.json'))
pop = [p['value'] for p in data['metrics'][0]['data']]
health = [p['value'] for p in data['metrics'][1]['data']]
hunger = [p['value'] for p in data['metrics'][2]['data']]

print(f"Pop-Health correlation: {np.corrcoef(pop, health)[0,1]:.2f}")
print(f"Pop-Hunger correlation: {np.corrcoef(pop, hunger)[0,1]:.2f}")
```

**Expected correlations:**
- Population ↔ Food supply: Strong negative (more agents = less food)
- Health ↔ Hunger: Strong positive (hungry = unhealthy)
- Social network density ↔ Population: Moderate positive

---

## Validation Checklists

### Game Balance Validation
- [ ] Population stable over 100 days (±20%)
- [ ] No mass starvation events (>10 deaths/day)
- [ ] Gini coefficient in realistic range (0.25-0.45)
- [ ] TPS remains >15 throughout
- [ ] Social network density 0.1-0.3

### System Performance Validation
- [ ] No system takes >20ms average
- [ ] Memory usage stable (no continuous growth)
- [ ] No errors in browser console
- [ ] Event bus processing <1000 events/tick

### Emergent Behavior Validation
- [ ] At least 5 unique behaviors active
- [ ] Behaviors spread through social connections
- [ ] Agents form communities (clustering >0.2)
- [ ] Innovation adoption follows S-curve

---

## Data Export Patterns

### Export for External Analysis
```bash
# Export full agent snapshot
curl -s "http://localhost:8766/dashboard/agents?session=latest" > agents.json

# Convert to CSV
jq -r '.agents[] | [.name, .age, .needs.hunger, .needs.energy, .behavior] | @csv' agents.json > agents.csv

# Load in Python/R for statistical analysis
import pandas as pd
df = pd.read_csv('agents.csv', names=['name', 'age', 'hunger', 'energy', 'behavior'])
```

### Time-Series Export
```bash
# Export population time series
curl -s "http://localhost:8766/api/timeseries?session=latest&metrics=population,avgHealth" | \
  jq -r '.metrics[] | .name as $metric | .data[] | [$metric, .timestamp, .value] | @csv' > timeseries.csv
```

---

## Related Documentation

- **[metrics-api.md](./metrics-api.md)** - API endpoints for querying metrics
- **[experiment-workflows.md](./experiment-workflows.md)** - How to run experiments
- **[examples.md](./examples.md)** - Complete working examples
