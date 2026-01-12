# Navigation Knowledge Layer

**Location**: `packages/core/src/navigation/`

Knowledge-based navigation infrastructure: social information sharing, world-level stigmergy, zone management, and β-space navigation.

## Overview

This module provides the **knowledge layer** for navigation, not pathfinding/movement (see `@ai-village/navigation` package for steering/pathfinding).

Two knowledge types:
- **World-level** (MapKnowledge): Stigmergic (ant-trail) knowledge shared via environment
- **Agent-level** (HearsayMemory): Social knowledge from communication and personal exploration

## Core Components

### 1. MapKnowledge (World Singleton)

Sector-based (16×16 tiles) stigmergic knowledge emerging from agent behavior:

```typescript
import { getMapKnowledge, worldToSector } from '@ai-village/core';

const map = getMapKnowledge();
const sector = map.getSector(sectorX, sectorY);

// Worn paths: Traffic counts create pathfinding preferences
sector.pathTraffic.get('n'); // Traffic to north neighbor

// Resource areas: Region-level abundance (0-100 scale)
sector.resourceAbundance.set('food', 85);

// Terrain analysis: Elevation, water ratios
sector.averageElevation; // Sea level = 0
sector.waterRatio;       // 0-1 (1 = all water)
```

**Key insight**: Agents share "berries up north" (regions), not "berries at (45, 32)" (precise coordinates).

### 2. HearsayMemory (Per-Agent Component)

Lightweight social knowledge:

```typescript
import { addHearsay, getHearsayForResource } from '@ai-village/core';

// Agent hears "berries are north" from another agent
addHearsay(hearsayComp, {
  resourceType: 'food',
  direction: 'north',
  distance: 'medium',
  sourceAgentId: 'agent_123',
  sourceAgentName: 'Alice',
  heardAt: world.tick,
  speakerPosition: { x: 50, y: 50 },
});

// Query trusted information
const hearsay = getHearsayForResource(hearsayComp, 'food');
// Returns hearsay from high-trust sources about food
```

**Trust system**: Tracks verification success/failure, updates trust scores (0-1).

### 3. SpeechParser

Extracts resource mentions from agent speech:

```typescript
import { parseResourceMentions, vectorToCardinal } from '@ai-village/core';

const mentions = parseResourceMentions("Found berries to the north!");
// [{resourceType: 'food', direction: 'north', distance: 'close', ...}]

// Convert vectors to cardinal directions
const dir = vectorToCardinal({ x: 0, y: -10 }); // 'north'
```

### 4. KnowledgeTransmission (Integration)

Ties speech parsing to memory updates:

```typescript
import { processHeardSpeech, recordResourceDiscovery } from '@ai-village/core';

// Agent hears another agent's speech
processHearedSpeech(world, listenerEntity, speakerEntity, speechText);
// Auto-parses, creates hearsay entries, updates trust

// Agent discovers resource directly
recordResourceDiscovery(world, agentEntity, resourceType, position);
// Updates MapKnowledge abundance, creates verified hearsay
```

### 5. ZoneManager (Player Designations)

Player-painted zones influence agent building placement:

```typescript
import { getZoneManager } from '@ai-village/core';

const zm = getZoneManager();

// Player creates farming zone
const zone = zm.createZone('farming', 1); // priority=1
zm.addTilesToZone(zone.id, [{ x: 10, y: 10 }, { x: 11, y: 10 }]);

// Query zone at tile
const zoneAt = zm.getZoneAt(15, 15);
if (zoneAt?.type === 'farming') {
  // Prefer wells, crops here
}
```

**Zone types**: farming, storage, industry, housing, social, pasture, wilderness, restricted

### 6. Spaceship & β-Space Navigation

Emotional topology navigation for inter-timeline travel:

```typescript
// SpaceshipComponent: β-space navigation, emotional anchoring
ship.ship_type = 'story_ship';
ship.beta_space.can_navigate = true;
ship.beta_space.emotional_signature = {
  emotions: { joy: 0.8, wonder: 0.6 },
};

// EmotionalNavigationSystem: Route ships via narrative weight
// Paths follow emotional topology, not Euclidean distance
```

## Architecture

**Sector-based world division**:
- `SECTOR_SIZE = 16` (16×16 tiles per sector)
- Sectors track: traffic, resources, elevation, water ratio, exploration
- Conversion: `worldToSector(x, y)`, `sectorToWorld(sectorX, sectorY)`

**Knowledge flow**:
```
Agent explores → marks ExploredSector in HearsayMemory
Agent finds resource → recordResourceDiscovery() → updates MapKnowledge abundance
Agent speaks → SpeechParser extracts mentions → processHeardSpeech() → creates Hearsay
Agent verifies hearsay → verifyHearsay() → updates TrustRating
```

## Usage Patterns

**Exploration + communication**:
```typescript
// 1. Agent explores, marks sectors
markExplored(hearsayComp, sectorX, sectorY, world.tick, ['food']);

// 2. Agent finds berries, updates map
recordResourceDiscovery(world, agentEntity, 'food', { x: 45, y: 32 });

// 3. Agent tells others
const speech = "I found berries to the north!";
processHeardSpeech(world, listenerEntity, speakerEntity, speech);

// 4. Listener queries trusted information
const hearsay = getHearsayForResource(listenerComp, 'food');
const bestLocation = getBestResourceLocation(world, listenerEntity, 'food');
```

**Zone-based building**:
```typescript
// Player paints farming zone, agent queries
const zone = zoneManager.getZoneAt(buildX, buildY);
if (zone?.type === 'farming') {
  // +50 placement score for wells in farming zones
}
```

## Integration

**Works with**:
- `@ai-village/navigation` (steering/movement uses sectors for spatial queries)
- `AgentBrainSystem` (LLM context includes hearsay, zone info)
- `BuildingSystem` (zone affinity scoring)
- `CommunicationSystem` (speech triggers hearsay creation)

**No A* pathfinding here** - see `@ai-village/navigation` for SteeringSystem, MovementSystem.

## Files

- `MapKnowledge.ts` - World stigmergy (sectors, traffic, resources)
- `HearsayMemory.ts` - Agent social knowledge (hearsay, trust, fog-of-war)
- `SpeechParser.ts` - Extract resource mentions from speech
- `KnowledgeTransmission.ts` - Integration (speech → hearsay, discovery → map)
- `ZoneManager.ts` - Player zone storage and queries
- `SpaceshipComponent.ts` - β-space navigation interfaces
- `EmotionalNavigationSystem.ts` - Emotional topology routing
- `RainbowPlanetComponent.ts` - Rainbow Mars quantum mechanics

## Further Reading

- **ARCHITECTURE_OVERVIEW.md** - ECS patterns, metasystems
- **METASYSTEMS_GUIDE.md** - Multiverse, consciousness, magic
- `packages/navigation/README.md` - Pathfinding, steering, movement (separate package)
