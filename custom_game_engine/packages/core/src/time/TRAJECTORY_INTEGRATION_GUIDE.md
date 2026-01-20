# TrajectoryPromptBuilder Integration Guide

## Overview

The `TrajectoryPromptBuilder` (from `@ai-village/llm`) provides LLM-driven trajectory generation for soul agents during time jumps. This enables narrative compression of years/centuries into meaningful life stories.

**Package Location**: `packages/llm/src/TrajectoryPromptBuilder.ts`
**Integration Point**: `TimeCompressionSystem.generateSoulTrajectory()`
**Spec Reference**: `openspec/specs/grand-strategy/03-TIME-SCALING.md` (lines 300-405, 1000-1055)

## Key Interfaces

### LifeTrajectory

Complete life trajectory with detailed milestones and end state (alive/dead):

```typescript
interface LifeTrajectory {
  soulAgentId: string;
  startTick: number;
  endTick: number;
  milestones: Milestone[];
  endState: {
    alive: boolean;
    age: number;
    causeOfDeath?: string;
    descendants: string[];
    achievements: string[];
  };
}
```

### Milestone

Individual life event during time jump:

```typescript
interface Milestone {
  year: number;                 // Year during jump (0 to yearsCovered)
  event: string;                // Event description
  emotionalImpact: number;      // -1 (devastating) to 1 (joyful)
  involvedAgents: string[];     // Other agent IDs involved
  significance: number;         // 0 (minor) to 1 (life-defining)
}
```

### MajorEvent

Civilization-wide historical event:

```typescript
interface MajorEvent {
  tick: number;
  type: 'discovery' | 'war' | 'plague' | 'golden_age' | 'extinction' | 'contact' | 'ascension' | 'cultural';
  title: string;
  description: string;
  involvedSoulAgents: string[];
  impact: {
    population: number;    // Delta
    techLevel: number;     // Delta
    stability: number;     // Delta (-1 to 1)
  };
  significance: number;    // 0-1 (era-defining)
}
```

## Core Functions

### Life Trajectory Generation

**buildLifeTrajectoryPrompt(request, currentAge, techLevel)**

Generates comprehensive prompt with:
- Life expectancy calculation based on tech level
- Death handling (will agent die during jump?)
- Age-appropriate milestones
- Purpose/destiny alignment

```typescript
const prompt = trajectoryBuilder.buildLifeTrajectoryPrompt(
  {
    soulEntity,
    startTick,
    endTick,
    yearsCovered: 100,
    world
  },
  currentAge: 35,
  techLevel: 5  // 0-10 scale
);
```

**parseLifeTrajectoryResponse(soulAgentId, llmResponse, startTick, endTick)**

Parses LLM JSON response into `LifeTrajectory` with validation:
- Extracts milestones array
- Validates emotionalImpact (-1 to 1)
- Validates significance (0 to 1)
- Sorts milestones chronologically
- Parses end state (alive/dead, achievements)

### Basic Trajectory Generation

**buildSoulTrajectoryPrompt(request)**

Simpler trajectory without death handling:

```typescript
const prompt = trajectoryBuilder.buildSoulTrajectoryPrompt({
  soulEntity,
  startTick,
  endTick,
  yearsCovered: 50,
  world
});
```

**parseTrajectoryResult(soulId, llmResponse)**

Parses basic `TrajectoryResult`:
- narrative (summary)
- majorEvents (array of strings)
- characterDevelopment
- skillsGained
- relationshipChanges
- achievements

### Life Expectancy Calculation

**calculateLifeExpectancy(techLevel, currentAge)**

Tech-aware life expectancy calculation:

```typescript
const remainingYears = trajectoryBuilder.calculateLifeExpectancy(
  techLevel: 5,   // 0-10 scale (0=stone age, 10=industrial)
  currentAge: 40
);
// Returns expected remaining years of life
```

**Tech Level Mapping**:
- 0-2 (stone age): 30-40 years base
- 3-5 (bronze/iron): 40-60 years
- 6-8 (medieval): 50-70 years
- 9-10 (industrial/modern): 70-90 years

Includes ±20% randomness for variety.

### Major Events Generation

**buildMajorEventsPrompt(params)**

Civilization-wide events during time jump:

```typescript
const prompt = trajectoryBuilder.buildMajorEventsPrompt({
  years: 500,
  totalEvents: 25,
  startingPopulation: 5000,
  techLevel: 6,
  civilizationCount: 3,
  soulTrajectories: [/* soul trajectories */],
  startTick,
  endTick
});
```

**parseMajorEventsResponse(llmResponse, startTick, endTick)**

Parses array of `MajorEvent` objects with:
- Year offset to absolute tick conversion
- Event type validation
- Impact value validation
- Significance clamping (0-1)

## Integration Pattern (TimeCompressionSystem)

### Step 1: Import Dependencies

```typescript
import { TrajectoryPromptBuilder, LLMDecisionQueue } from '@ai-village/llm';
```

### Step 2: Get Current State

```typescript
// Get soul identity
const soulIdentity = soulEntity.getComponent(CT.SoulIdentity) as SoulIdentityComponent;

// Get current age
const agentComp = soulEntity.getComponent(CT.Agent) as AgentComponent;
const currentAge = agentComp?.age || 25;

// Estimate tech level
const techLevel = this.estimateTechnologyLevel(world);
```

### Step 3: Build Prompt

```typescript
const trajectoryBuilder = new TrajectoryPromptBuilder();

const prompt = trajectoryBuilder.buildLifeTrajectoryPrompt(
  {
    soulEntity: soulEntity as Entity,
    startTick,
    endTick,
    yearsCovered,
    world
  },
  currentAge,
  techLevel
);
```

### Step 4: Queue LLM Request

```typescript
const llmQueue = getLLMDecisionQueue(); // From service registry

const response = await llmQueue.requestDecision(
  `trajectory_${soulEntity.id}`,
  prompt
);
```

### Step 5: Parse Response

```typescript
const lifeTrajectory = trajectoryBuilder.parseLifeTrajectoryResponse(
  soulEntity.id,
  response,
  startTick,
  endTick
);

if (!lifeTrajectory) {
  console.warn(`Failed to parse trajectory for soul ${soulEntity.id}`);
  return this.generatePlaceholderTrajectory(...);
}
```

### Step 6: Convert to SoulTrajectory

```typescript
return createSoulTrajectory({
  soulId: soulEntity.id,
  soulName: soulIdentity.soulName,
  narrative: lifeTrajectory.milestones.map(m => `Year ${m.year}: ${m.event}`).join('\n'),
  majorEvents: lifeTrajectory.milestones.map(m => m.event),
  characterDevelopment: lifeTrajectory.endState.alive
    ? 'Continued growth and development'
    : `Life ended: ${lifeTrajectory.endState.causeOfDeath || 'unknown cause'}`,
  skillsGained: [],
  relationshipChanges: [],
  achievements: lifeTrajectory.endState.achievements
});
```

## Era Snapshot Generation

### Build Era Prompt

```typescript
const prompt = trajectoryBuilder.buildEraSnapshotPrompt(
  eraNumber: 5,
  startTick,
  endTick,
  yearsCovered: 1000,
  world
);
```

LLM returns:
- eraName (poetic name)
- summary (2-3 paragraphs)
- majorEvents (array)
- culturalDevelopments
- notableFigures
- conflicts
- legacy

## Performance Considerations

### Pre-allocated Objects

The TrajectoryPromptBuilder uses functional parsing with minimal allocations:
- JSON parsing with regex extraction
- Array.map for transformations
- No intermediate buffers

### Batching

For multiple souls, batch requests:

```typescript
const trajectoryPromises = soulEntities.map(soul =>
  this.generateSoulTrajectory(world, soul, startTick, endTick, years)
);

const trajectories = (await Promise.all(trajectoryPromises))
  .filter((t): t is SoulTrajectory => t !== null);
```

### Caching

Trajectory generation is expensive. Cache results:
- Store in TimeCompressionSnapshotComponent
- Re-use for time-travel archaeology
- Never regenerate past trajectories

## Example LLM Responses

### Life Trajectory Response

```json
{
  "milestones": [
    {
      "year": 5,
      "event": "Married childhood friend Elara",
      "emotionalImpact": 0.9,
      "involvedAgents": ["agent_elara_123"],
      "significance": 0.7
    },
    {
      "year": 15,
      "event": "Discovered iron smelting technique",
      "emotionalImpact": 0.8,
      "involvedAgents": [],
      "significance": 0.9
    },
    {
      "year": 45,
      "event": "Became village elder after founder's death",
      "emotionalImpact": 0.6,
      "involvedAgents": [],
      "significance": 0.8
    },
    {
      "year": 68,
      "event": "Died peacefully, surrounded by grandchildren",
      "emotionalImpact": -0.3,
      "involvedAgents": [],
      "significance": 1.0
    }
  ],
  "endState": {
    "alive": false,
    "age": 93,
    "causeOfDeath": "natural causes - old age",
    "descendants": ["agent_child1", "agent_child2", "agent_child3"],
    "achievements": [
      "Pioneered iron working in the region",
      "Founded blacksmith guild",
      "Served as village elder for 23 years"
    ]
  }
}
```

### Major Events Response

```json
{
  "events": [
    {
      "yearOffset": 50,
      "type": "discovery",
      "title": "The Bronze Revolution",
      "description": "Metallurgists discovered bronze alloy, revolutionizing tools and weapons",
      "involvedSouls": ["soul_kara", "soul_finn"],
      "impact": {
        "population": 500,
        "techLevel": 0.8,
        "stability": 0.3
      },
      "significance": 0.9
    },
    {
      "yearOffset": 150,
      "type": "war",
      "title": "The River Conflict",
      "description": "Two-year war over river access rights between settlements",
      "involvedSouls": [],
      "impact": {
        "population": -300,
        "techLevel": 0,
        "stability": -0.6
      },
      "significance": 0.7
    }
  ]
}
```

## Error Handling

### Failed Parsing

```typescript
const lifeTrajectory = trajectoryBuilder.parseLifeTrajectoryResponse(...);

if (!lifeTrajectory) {
  // LLM returned invalid JSON or missing fields
  // Fall back to placeholder trajectory
  return this.generatePlaceholderTrajectory(...);
}
```

### Missing Components

```typescript
const soulIdentity = soulEntity.getComponent(CT.SoulIdentity);
if (!soulIdentity) {
  throw new Error(`Soul entity ${soulEntity.id} missing SoulIdentityComponent`);
}
```

### Tech Level Estimation

```typescript
private estimateTechnologyLevel(world: World): number {
  // Heuristic: count buildings as proxy
  const buildings = world.query().with(CT.Building).executeEntities();

  // Better: check TechnologyUnlockComponent
  // Better: analyze building types
  // Better: check agent skills

  return Math.min(10, Math.floor(buildings.length / 20));
}
```

## Testing Strategy

### Unit Tests

Test prompt building:
```typescript
it('builds life trajectory prompt with death handling', () => {
  const builder = new TrajectoryPromptBuilder();
  const prompt = builder.buildLifeTrajectoryPrompt(request, 70, 3);
  expect(prompt).toContain('WILL LIKELY DIE');
  expect(prompt).toContain('70 years');
});
```

### Integration Tests

Test with mock LLM responses:
```typescript
it('parses life trajectory with milestones', () => {
  const mockResponse = `{"milestones": [...], "endState": {...}}`;
  const trajectory = builder.parseLifeTrajectoryResponse('soul_1', mockResponse, 0, 1000);
  expect(trajectory?.milestones).toHaveLength(4);
  expect(trajectory?.endState.alive).toBe(false);
});
```

### End-to-End Tests

Test full time jump:
```typescript
it('generates trajectories for all souls during time jump', async () => {
  const result = await timeCompressionSystem.processTimeJump(...);
  expect(result.soulTrajectories).toHaveLength(5);
  expect(result.eraSnapshot).toBeDefined();
});
```

## Future Enhancements

### Batch Processing

Process multiple souls in single LLM call:
```typescript
buildBatchTrajectoryPrompt(souls: Entity[], yearsCovered: number): string
```

### Descendant Generation

LLM generates descendant agents during time jump:
```typescript
interface Descendant {
  parentSoulId: string;
  name: string;
  birthYear: number;
  inheritedTraits: string[];
}
```

### Historical Consistency

Link soul trajectories to major events:
```typescript
// Soul participated in "The Bronze Revolution"
milestone.relatedEventId = 'event_bronze_revolution';
```

## References

- **Spec**: `openspec/specs/grand-strategy/03-TIME-SCALING.md`
- **Implementation**: `packages/llm/src/TrajectoryPromptBuilder.ts`
- **Integration**: `packages/core/src/systems/TimeCompressionSystem.ts`
- **Components**: `packages/core/src/components/TimeCompressionSnapshotComponent.ts`
- **Types**: `packages/core/src/types/ComponentType.ts`
