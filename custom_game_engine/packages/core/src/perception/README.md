# Perception Module

Agent sensory systems for visual, auditory, and social awareness.

## Overview

Three processors handle agent perception:
- **VisionProcessor**: Detects entities (resources, plants, agents) and terrain features
- **HearingProcessor**: Collects speech from nearby agents
- **MeetingDetector**: Responds to meeting calls based on relationships

## Vision System

### Tiered Detection (1 tile = 1 meter)

**Close Range (~10m)**: Full detail, included in LLM prompts. Max 10 entities.

**Area Range (~50m)**: Tactical awareness, summarized in prompts. Max 50 entities.

**Distant Range (~200m)**: Landmarks only (peaks, cliffs, lakes). Max 20 features.

### Terrain Features

Research-based geomorphometry:
- TPI (Topographic Position Index) classifies features
- Slope analysis detects cliffs (>30° threshold)
- Flood fill identifies water bodies
- Features cached per 32x32 sector
- Forward-facing 120° cone only

Stores significant landmarks in spatial memory (importance: 200).

### Components Updated

- `VisionComponent`: Populates seenAgents, seenResources, nearbyAgents, distantLandmarks, terrainDescription
- `SpatialMemoryComponent`: Stores resource_location, plant_location, agent_seen, terrain_landmark

## Hearing System

Default range: 50 tiles. Detects speech from awake agents only.

Sleeping agents cannot hear or speak. Updates `VisionComponent.heardSpeech` with speaker name, text, ID, distance.

## Meeting Detection

Detects phrases: "calling a meeting", "gather around", "everyone come here", "meeting time"

Attendance based on familiarity:
- 0 familiarity: 30% chance
- 50 familiarity: 65% chance
- 100 familiarity: 100% chance

Does not interrupt: forced_sleep, seek_sleep, call_meeting, attend_meeting

## Usage

```typescript
import { PerceptionProcessor } from '@ai-village/core/perception';

const perception = new PerceptionProcessor();
const { vision, hearing, meeting } = perception.processAll(entity, world);

// Or individually
const visionResult = perception.processVision(entity, world);
const hearingResult = perception.processHearing(entity, world);
```

## Fog of War

Entities outside vision range are not perceived. Terrain features use sector-based caching (32x32 tiles) for performance. Memory component retains past observations with decay over time.
