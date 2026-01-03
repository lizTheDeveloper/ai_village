> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

**# Factory AI Specification

## Overview

The Factory AI is an autonomous management system for factory cities, similar to the City Director but for industrial production. It monitors factories, detects bottlenecks, optimizes resource flow, and requests materials automatically.

**Unlocked via Research:** Tier 5 "Factory AI" technology

## Core Concept

Instead of micromanaging every machine, belt, and power plant, the Factory AI acts as an intelligent overseer:

- **Monitors** production statistics in real-time
- **Detects** bottlenecks before they cause shutdowns
- **Optimizes** power distribution and resource allocation
- **Requests** materials from logistics network
- **Adapts** production goals based on current state

## Architecture

```
┌─────────────────────┐
│   Factory AI Core   │  (Research unlock)
│   (Entity)          │
│                     │
│  Component:         │
│  FactoryAIComponent │
├─────────────────────┤
│  - Goals            │  maximize_output, efficiency, etc.
│  - Stats            │  machines, power, efficiency
│  - Bottlenecks      │  power, input, output, transport
│  - Decisions        │  recent AI actions
│  - Requests         │  resource logistics requests
└─────────────────────┘
         │
         │ monitored by
         ▼
┌─────────────────────┐
│  FactoryAISystem    │  (Priority 48)
│                     │
│  Every N ticks:     │
│  1. Update stats    │
│  2. Detect issues   │
│  3. Make decisions  │
│  4. Request help    │
└─────────────────────┘
```

## Component: FactoryAIComponent

**File:** `packages/core/src/components/FactoryAIComponent.ts`

### Fields

**Identity:**
- `name: string` - Factory name
- `primaryOutputs: string[]` - Main products (e.g., ['solar_sail'])

**Goals:**
- `goal: FactoryGoal` - Current objective
  - `maximize_output` - Produce as much as possible
  - `efficiency` - Minimize waste/power
  - `stockpile` - Build reserves
  - `research` - Produce for research
  - `emergency` - Crisis mode
  - `shutdown` - Graceful shutdown

**Health:**
- `health: FactoryHealth` - Overall status
  - `optimal` - Everything perfect
  - `good` - Minor issues
  - `degraded` - Significant problems
  - `critical` - Major failures
  - `offline` - No power/catastrophic

**Statistics** (`stats: FactoryStats`):
```typescript
{
  totalMachines: number;
  activeMachines: number;
  idleMachines: number;
  totalInputsPerMinute: number;
  totalOutputsPerMinute: number;
  efficiency: number; // 0-1
  powerGeneration: number;
  powerConsumption: number;
  powerEfficiency: number; // 0-1
  beltUtilization: number; // 0-1
  inputStockpileDays: number;
  outputStorageUtilization: number; // 0-1
}
```

**Bottlenecks** (`bottlenecks: ProductionBottleneck[]`):
```typescript
{
  type: 'power' | 'input' | 'output' | 'machine' | 'transport';
  severity: number; // 0-1
  affectedItem?: string;
  location: string; // entity ID or area
  suggestion: string;
  detectedAt: number;
}
```

**Decisions** (`recentDecisions: FactoryDecision[]`):
```typescript
{
  timestamp: number;
  action: 'request_resources' | 'adjust_production' | 'balance_power' | ...;
  reasoning: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  priority: number; // 0-1
}
```

**Resource Requests** (`resourceRequests: ResourceRequest[]`):
```typescript
{
  itemId: string;
  quantityNeeded: number;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  reason: string;
  requestedAt: number;
  fulfilled: boolean;
}
```

### Configuration

- `decisionInterval: number` - How often AI thinks (ticks)
- `minPowerEfficiency: number` - Threshold for power crisis (0-1)
- `minStockpileDays: number` - Days of input reserves required
- `maxOutputStorage: number` - Storage full threshold (0-1)
- `intelligenceLevel: number` - AI quality (1-10)
- `allowExpansion: boolean` - Can AI expand factory?
- `allowLogisticsRequests: boolean` - Can AI request resources?

## System: FactoryAISystem

**File:** `packages/core/src/systems/FactoryAISystem.ts`

**Priority:** 48 (before off-screen optimization at 49)

### Update Loop

Every `decisionInterval` ticks:

1. **Update Statistics**
   - Count machines (total, active, idle)
   - Calculate power (generation, consumption, efficiency)
   - Estimate production rates
   - Check stockpiles and storage

2. **Detect Bottlenecks**
   - Power shortage (efficiency < threshold)
   - Input shortage (machines idle)
   - Output blockage (storage full)
   - Transport congestion (belts at capacity)

3. **Make Decisions**
   - Sort bottlenecks by severity
   - Address top 3 issues
   - Execute goal-specific strategies
   - Record decisions for debugging

4. **Request Resources**
   - Generate logistics requests
   - Calculate quantities needed
   - Set urgency based on severity

### Decision Logic

**Power Crisis** (efficiency < 0.3):
- Emergency mode
- Shutdown non-critical machines
- Request emergency power cells

**Power Shortage** (efficiency < minPowerEfficiency):
- Calculate MW needed
- Request solar panels or generators
- Record decision

**Input Shortage** (machines idle):
- Identify missing materials
- Calculate quantity (hours of production)
- Request from logistics
- Set urgency based on severity

**Output Blockage** (storage full):
- Reduce production rate
- Request storage expansion if allowed
- Optimize transport

**Goal-Specific Actions:**

| Goal | Strategy |
|------|----------|
| `maximize_output` | Expand capacity if running at >90% efficiency |
| `efficiency` | Optimize power, install efficiency modules |
| `stockpile` | Request bulk materials, build reserves |
| `emergency` | Shutdown non-critical, prioritize essentials |

## Intelligence Levels

AI quality improves with research upgrades:

| Level | Name | Description | Decision Interval | Min Power Efficiency |
|-------|------|-------------|-------------------|---------------------|
| 1 | Basic | Detects simple bottlenecks | 200 ticks (10s) | 0.5 |
| 2 | Standard | Basic resource requests | 150 ticks | 0.6 |
| 3 | Advanced | Optimizes production | 100 ticks (5s) | 0.7 |
| 4 | Expert | Predicts bottlenecks | 100 ticks | 0.75 |
| 5 | Master | Full autonomous | 50 ticks (2.5s) | 0.8 |
| 6 | Genius | Proactive expansion | 50 ticks | 0.85 |
| 7 | Savant | Learns from mistakes | 20 ticks (1s) | 0.9 |
| 8 | Oracle | Predicts days ahead | 20 ticks | 0.95 |
| 9 | Singularity | Transcendent | 10 ticks (0.5s) | 0.98 |
| 10 | Omniscient | Perfect optimization | 10 ticks | 0.99 |

## Research Tree

### Tier 5: Factory AI (Base)

**Cost:**
- 5000 science
- 10 minutes research time
- 100 processing units
- 500 advanced circuits
- 10 quantum processors

**Prerequisites:**
- Processing Unit Production (Tier 4)
- Logistics Network (Tier 5)
- AI Research (Tier 5)

**Unlocks:**
- Factory AI Core building
- Factory AI Module item
- Intelligence Level 1

**Effects:**
- +20% factory efficiency
- -15% power consumption
- +30% logistics throughput

### Upgrades

**Enhanced Learning** (Tier 5):
- Intelligence → Level 3
- 2000 science, 5 min
- 50 processing units

**Predictive Analytics** (Tier 6):
- Intelligence → Level 5
- 5000 science, 10 min
- 20 quantum processors

**Neural Evolution** (Tier 6):
- Intelligence → Level 7
- 10000 science, 20 min
- 50 quantum processors

**Transcendence** (Tier 6):
- Intelligence → Level 10
- 50000 science, 1 hour
- 200 quantum processors
- 1 singularity core
- Requires Dyson Sphere

## Usage Example

### Setup

```typescript
import { createFactoryAI } from '@ai-village/core';

// Create Factory AI Core entity
const factoryAI = world.createEntity();
factoryAI.addComponent(createPositionComponent(1000, 1000));

const ai = createFactoryAI(
  'Dyson Swarm Factory Alpha',
  ['solar_sail'],
  {
    goal: 'maximize_output',
    targetProductionRate: 90, // 90 sails/min
    allowExpansion: true,
    allowLogisticsRequests: true,
    intelligenceLevel: 5, // Master
  }
);

factoryAI.addComponent(ai);
```

### Monitoring

```typescript
import { getAIStatusSummary } from '@ai-village/core';

// Get AI status
const summary = getAIStatusSummary(ai);
console.log(summary);

/*
✓ Dyson Swarm Factory Alpha [maximize_output]
  Production: 92% efficient (47/50 machines)
  Power: 98% (490/500 kW)
  Bottlenecks: 1
    - input: 40% (Request iron plates from logistics)
*/
```

### Fulfilling Requests

```typescript
import { fulfillRequest } from '@ai-village/core';

// Check pending requests
for (const request of ai.resourceRequests) {
  console.log(`Request: ${request.quantityNeeded}x ${request.itemId} (${request.urgency})`);
  console.log(`Reason: ${request.reason}`);

  // Deliver items
  deliverItems(request.itemId, request.quantityNeeded);

  // Mark fulfilled
  fulfillRequest(ai, request.itemId, request.quantityNeeded);
}
```

### Changing Goals

```typescript
// Switch to efficiency mode
ai.goal = 'efficiency';

// AI will now optimize for minimal waste/power
// instead of maximum output
```

## Integration with Off-Screen Optimization

Factory AI and Off-Screen Production work together:

1. **On-Screen:**
   - Factory AI monitors and makes decisions
   - Full simulation runs (belts, machines, power)

2. **Goes Off-Screen:**
   - Off-Screen system snapshots production rates
   - Factory AI decisions are paused (no monitoring)
   - Fast-forward mode calculates production

3. **Returns On-Screen:**
   - Production state restored
   - Factory AI resumes monitoring
   - AI detects any new bottlenecks from fast-forward

**Important:** Factory AI decisions are only made when factory is on-screen and actively simulated.

## Debug & Visualization

### AI Status UI

```typescript
function renderFactoryAI(ctx: CanvasRenderingContext2D, ai: FactoryAIComponent) {
  // Health indicator
  const healthColor = {
    optimal: 'green',
    good: 'lightgreen',
    degraded: 'yellow',
    critical: 'red',
    offline: 'gray',
  }[ai.health];

  ctx.fillStyle = healthColor;
  ctx.fillRect(x, y, 100, 20);

  // Stats
  ctx.fillStyle = 'white';
  ctx.fillText(`${ai.name}`, x, y - 5);
  ctx.fillText(`Eff: ${(ai.stats.efficiency * 100).toFixed(0)}%`, x, y + 35);
  ctx.fillText(`Pwr: ${(ai.stats.powerEfficiency * 100).toFixed(0)}%`, x, y + 50);

  // Bottlenecks
  if (ai.bottlenecks.length > 0) {
    ctx.fillStyle = 'orange';
    ctx.fillText(`⚠ ${ai.bottlenecks.length} issues`, x, y + 65);
  }
}
```

### Decision History

```typescript
// Show last 5 decisions
console.log(`=== ${ai.name} Recent Decisions ===`);
for (const decision of ai.recentDecisions.slice(0, 5)) {
  const time = new Date(decision.timestamp).toLocaleTimeString();
  console.log(`[${time}] ${decision.action}`);
  console.log(`  Reasoning: ${decision.reasoning}`);
  console.log(`  Expected: ${decision.expectedOutcome}`);
}
```

## Performance Considerations

### Decision Frequency

- **Low intelligence (1-2):** 200 ticks (10 seconds) - minimal CPU
- **Medium intelligence (3-5):** 100 ticks (5 seconds) - balanced
- **High intelligence (6-8):** 20-50 ticks (1-2.5 seconds) - active
- **Max intelligence (9-10):** 10 ticks (0.5 seconds) - intensive

For 10 factories at max intelligence: ~0.1ms per tick (acceptable)

### Bottleneck Detection

- Check only top 3 bottlenecks per cycle
- Clear resolved bottlenecks to prevent list growth
- Limit decision history to 20 entries

### Integration Cost

- Factory AI: ~0.01ms per factory per decision cycle
- Off-Screen Optimization: ~0.001ms per factory when off-screen
- Combined: Negligible for <100 factories

## See Also

- **FactoryAIComponent.ts** - Component implementation
- **FactoryAISystem.ts** - System implementation
- **FactoryAIResearch.ts** - Research definitions
- **AUTOMATION_LOGISTICS_SPEC.md** - Core automation systems
- **OFF_SCREEN_OPTIMIZATION.md** - Off-screen production
- **CityDirectorComponent.ts** - Similar system for cities
