# Ringworld Save System Integration

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Overview

The existing save/timeline/multiverse system provides **perfect infrastructure** for implementing the hierarchical ringworld abstraction. This document shows how to leverage the existing architecture instead of building parallel systems.

## The Brilliant Discovery

**You've already built a time travel engine and multiverse simulator!**

The save system is NOT just persistence - it's:
- **Timeline Manager** - Automatic snapshots with variable intervals
- **Canon Event Triggers** - Major events auto-save (deaths, births, discoveries)
- **Multiverse Coordinator** - Multiple universes with independent time scales
- **Universe Forking** - Create parallel timelines from any snapshot
- **Passages** - Inter-universe connections (threads, bridges, gates)
- **Time Travel** - Fork from snapshot = alternate timeline

## Key Architecture Components

### Timeline Manager (packages/core/src/multiverse/TimelineManager.ts)

```typescript
// Variable interval auto-saves scale with universe age
const DEFAULT_INTERVAL_THRESHOLDS = [
  { afterTicks: 0, interval: 1200 },       // 0-10 min: every 1 min
  { afterTicks: 12000, interval: 6000 },   // 10-60 min: every 5 min
  { afterTicks: 72000, interval: 12000 },  // 60+ min: every 10 min
];

interface TimelineEntry {
  id: string;
  universeId: string;
  tick: bigint;
  entityCount: number;
  label?: string;
  isAutoSave: boolean;
  canonEventType?: CanonEventType;  // agent:died, agent:born, soul:created, time:milestone
  snapshot?: UniverseSnapshot;      // Full world state
}
```

**Canon Events That Auto-Save:**
- `agent:died` - Preserve moment of death for potential rewind
- `agent:birth` - Record significant population changes
- `soul:ceremony_complete` - Soul creation milestone
- `time:day_changed` - Day 30, 90, 180, 365, 730, 1095 milestones
- **NEW: `megastructure:discovered`** - Builder tech found
- **NEW: `civilization:first_contact`** - Meeting new peoples
- **NEW: `region:explored`** - Visiting new megasegment

**Pruning Rules:**
- Auto-saves: Pruned after 24 hours or max 100 snapshots
- Canon event saves: **PRESERVED FOREVER**
- Manual saves: **PRESERVED FOREVER**

### Multiverse Coordinator (packages/core/src/multiverse/MultiverseCoordinator.ts)

```typescript
// Multiple universes with independent time
class MultiverseCoordinator {
  private absoluteTick: bigint;  // Monotonic, never resets
  private universes: Map<string, UniverseInstance>;
  private passages: Map<string, PassageConnection>;

  // Fork universe from any timeline snapshot
  async forkUniverse(
    sourceUniverseId: string,
    forkId: string,
    forkName: string,
    options?: {
      timeScale?: number;
      fromSnapshotId?: string;  // Fork from specific snapshot = TIME TRAVEL
    }
  ): Promise<UniverseInstance>;
}

interface UniverseInstance {
  config: {
    id: string;
    timeScale: number;        // 1.0 = normal, 2.0 = 2x speed, 0.1 = slow abstract
    parentId?: string;        // For forked universes
    forkedAtTick?: bigint;    // When this timeline diverged
    paused: boolean;
  };
  world: World;
  universeTick: bigint;       // Universe-relative tick
  lastAbsoluteTick: bigint;   // Last update in absolute time
}

interface PassageConnection {
  id: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  type: 'thread' | 'bridge' | 'gate' | 'confluence';
  active: boolean;
}
```

### Save File Structure (packages/core/src/persistence/types.ts)

```typescript
interface SaveFile {
  header: {
    name: string;
    playTime: number;
    gameVersion: string;
    screenshot?: string;
  };

  multiverse: MultiverseSnapshot;  // Absolute time state
  universes: UniverseSnapshot[];   // Array of universe states
  passages: PassageSnapshot[];     // Inter-universe connections

  checksums: {
    overall: string;
    universes: Record<string, string>;
    multiverse: string;
  };
}

interface UniverseSnapshot {
  identity: { id: string; name: string };
  time: { universeTick: string; timeScale: number };
  entities: VersionedEntity[];
  worldState: {
    terrain: SerializedChunkData | null;
    zones: SerializedZone[];
  };
  checksums: { entities: string; components: string; worldState: string };
}
```

## Ringworld Integration Strategies

### Strategy 1: Each Megasegment = Universe

**Pros:**
- Full isolation between megasegments
- Independent time scales (active vs abstract)
- Built-in pause/resume for unexplored regions
- Passages = inter-megasegment travel

**Cons:**
- High memory overhead (one World per megasegment)
- Max ~100 concurrent megasegments (realistic limit)

**Use Case:** Small ringworld (100-1000 megasegments), player actively exploring

```typescript
// Register megasegments as universes
for (let i = 0; i < 1000; i++) {
  const world = new WorldImpl(new EventBusImpl());
  const timeScale = i === currentMegaseg ? 1.0 : 0.1;  // Active region full speed

  multiverseCoordinator.registerUniverse(world, {
    id: `megasegment:${i}`,
    name: `Megasegment ${i}`,
    timeScale,
    multiverseId: 'ringworld:alpha',
    paused: (i > 100),  // Pause distant megasegments
  });
}

// Travel to new megasegment
multiverseCoordinator.resumeUniverse('megasegment:250');
multiverseCoordinator.setTimeScale('megasegment:250', 1.0);
multiverseCoordinator.setTimeScale('megasegment:7', 0.1);  // Slow down old region
```

### Strategy 2: Regions Use Timeline Snapshots

**Pros:**
- Scales to millions of regions
- Only active region fully loaded
- Built-in time travel per region
- Canon events auto-save region state

**Cons:**
- Regions share world state (not truly isolated)
- Requires custom region swapping logic

**Use Case:** Massive ringworld (millions of regions), Factorio-style abstraction

```typescript
// When player enters new region
async function loadRegion(address: RingworldAddress): Promise<void> {
  const regionId = `megaseg:${address.megasegment}:region:${address.region}`;

  // Find latest snapshot for this region
  const snapshot = timelineManager.findSnapshotAtTick(
    regionId,
    currentTick
  );

  if (snapshot) {
    // Hydrate from snapshot
    await worldSerializer.deserializeWorld(snapshot.snapshot, world);
  } else {
    // Generate procedurally (no snapshot exists)
    const template = selectRegionTemplate(address.megasegment, address.region);
    await generateRegion(address, template, world);
  }
}

// When player leaves region
async function unloadRegion(address: RingworldAddress): Promise<void> {
  const regionId = `megaseg:${address.megasegment}:region:${address.region}`;

  // Create snapshot before unloading
  await timelineManager.createSnapshot(
    regionId,
    world,
    BigInt(currentTick),
    false, // manual save
    `Region ${address.region} state`
  );

  // Clear world entities
  // (World will be repopulated when loading next region)
}
```

### Strategy 3: Hybrid - Megasegments as Universes, Regions as Snapshots

**Pros:**
- Best of both worlds
- Isolation at megasegment level
- Lightweight snapshots at region level
- Scales to ~100 megasegments × 100 regions each

**Cons:**
- More complex architecture
- Memory overhead for active megasegments

**Use Case:** Medium ringworld (10,000 regions), structured exploration

```typescript
// Active megasegments = universes
const activeMegasegs = new Set([7, 12, 23]);  // Player and nearby

for (const megaseg of activeMegasegs) {
  const world = new WorldImpl(new EventBusImpl());
  multiverseCoordinator.registerUniverse(world, {
    id: `megasegment:${megaseg}`,
    timeScale: (megaseg === currentMegaseg) ? 1.0 : 0.5,
    multiverseId: 'ringworld:alpha',
    paused: false,
  });
}

// Abstract megasegments = just statistics
const abstractMegasegs: Map<number, AbstractMegasegment> = new Map();
for (let i = 0; i < 1000; i++) {
  if (!activeMegasegs.has(i)) {
    abstractMegasegs.set(i, {
      id: i,
      population: Math.floor(Math.random() * 10_000_000),
      production: { food: 50000, energy: 30000 },
      consumption: { food: 40000, energy: 25000 },
    });
  }
}

// Within active megasegment, regions = snapshots
const regionId = `megasegment:${currentMegaseg}:region:${currentRegion}`;
const regionSnapshot = timelineManager.findSnapshotAtTick(regionId, currentTick);
```

## Delta Storage Integration

The existing component versioning system supports delta-like storage:

```typescript
// Define delta component type
interface RegionDeltaComponent extends Component {
  type: 'region_delta';
  deltas: Delta[];
  baseTemplate: string;
  baseSeed: number;
}

interface Delta {
  tick: number;
  action: 'item_removed' | 'item_added' | 'building_built' | 'terrain_modified';
  position: Position;
  data: DeltaData;
}

// Register serializer
componentSerializerRegistry.registerSerializer('region_delta', {
  serialize(component: RegionDeltaComponent) {
    return {
      $schema: 'https://aivillage.dev/schemas/component/region_delta/v1',
      $version: 1,
      type: 'region_delta',
      data: {
        deltas: component.deltas,
        baseTemplate: component.baseTemplate,
        baseSeed: component.baseSeed,
      },
    };
  },
  deserialize(data) {
    return {
      type: 'region_delta',
      deltas: data.data.deltas,
      baseTemplate: data.data.baseTemplate,
      baseSeed: data.data.baseSeed,
    };
  },
});

// When saving region
const deltaEntity = world.createEntity();
deltaEntity.addComponent({
  type: 'region_delta',
  deltas: recordedDeltas,
  baseTemplate: 'ancient_landing_platform',
  baseSeed: 782934,
});

// Snapshot includes delta component
const snapshot = await timelineManager.createSnapshot(regionId, world, tick);
// snapshot.entities includes the region_delta entity

// When loading region
// 1. Generate base region from template + seed
const baseRegion = generateRegion(template, seed);

// 2. Find region_delta component in snapshot
const deltaEntity = snapshot.entities.find(e =>
  e.components.some(c => c.type === 'region_delta')
);

// 3. Apply deltas
for (const delta of deltaEntity.deltas) {
  applyDelta(world, delta);
}
```

## Passages = Inter-Megasegment Travel

```typescript
// Spaceport connects two megasegments
multiverseCoordinator.createPassage(
  'spaceport:alpha_7_to_12',
  'megasegment:7',
  'megasegment:12',
  'gate'  // Permanent, stable fast travel
);

// Wormhole (unstable, temporary)
multiverseCoordinator.createPassage(
  'wormhole:temporal_23_to_450',
  'megasegment:23',
  'megasegment:450',
  'thread'  // Unstable, may collapse
);

// Dimensional rift (4D passage)
multiverseCoordinator.createPassage(
  'rift:dimensional_7_to_alternate_7',
  'megasegment:7',
  'megasegment:7:alternate',  // Parallel timeline megaseg 7!
  'confluence'  // Connects parallel realities
);

// Travel through passage
function usePassage(passageId: string, entity: Entity): void {
  const passage = multiverseCoordinator.getPassage(passageId);
  if (!passage || !passage.active) {
    throw new Error('Passage not available');
  }

  // Remove entity from source universe
  const sourceUniverse = multiverseCoordinator.getUniverse(passage.sourceUniverseId);
  sourceUniverse.world.removeEntity(entity.id);

  // Add entity to target universe
  const targetUniverse = multiverseCoordinator.getUniverse(passage.targetUniverseId);
  targetUniverse.world.addEntity(entity);  // TODO: Add addEntity to World interface

  // Emit event
  targetUniverse.world.eventBus.publish('entity:arrived_via_passage', {
    entityId: entity.id,
    passageId,
    fromUniverse: passage.sourceUniverseId,
  });
}
```

## Canon Events for Ringworld

```typescript
// Extend canon event types for ringworld
type CanonEventType =
  | 'agent:died'
  | 'agent:born'
  | 'soul:created'
  | 'time:milestone'
  // Ringworld events
  | 'megastructure:discovered'
  | 'civilization:first_contact'
  | 'region:explored'
  | 'spaceport:activated'
  | 'builder_tech:acquired'
  | 'shadow_square:malfunction'
  | 'rim_wall:breach';

// In TimelineManager.attachToWorld(), add:
eventBus.subscribe('megastructure:discovered', (event) => {
  const data = event.data as {
    megasegmentId: number;
    type: string;
    name: string;
  };
  this.onCanonEvent(
    universeId,
    world,
    BigInt(world.tick),
    'megastructure:discovered',
    `Discovered ${data.type}: ${data.name}`
  ).catch(err => console.error('[TimelineManager] Failed to save on discovery:', err));
});

eventBus.subscribe('civilization:first_contact', (event) => {
  const data = event.data as {
    civilizationName: string;
    megasegmentId: number;
    techLevel: number;
  };
  this.onCanonEvent(
    universeId,
    world,
    BigInt(world.tick),
    'civilization:first_contact',
    `First contact with ${data.civilizationName} (tech level ${data.techLevel})`
  ).catch(err => console.error('[TimelineManager] Failed to save on first contact:', err));
});
```

## Time Travel = Alternate Ringworld Timelines

```typescript
// Fork ringworld at Day 30 to explore "what if shadow squares failed?"
const baselineSnapshot = timelineManager.findSnapshotAtTick(
  'universe:ringworld_prime',
  BigInt(30 * 1200 * 24)  // Day 30 tick
);

const alternateTim eline = await multiverseCoordinator.forkUniverse(
  'universe:ringworld_prime',
  'universe:ringworld_shadow_square_failure',
  'Shadow Square Catastrophe Timeline',
  { fromSnapshotId: baselineSnapshot.id }
);

// Simulate shadow square failure in alternate timeline
const altUniverse = multiverseCoordinator.getUniverse('universe:ringworld_shadow_square_failure');
altUniverse.world.eventBus.publish('shadow_square:malfunction', {
  squareId: 'alpha_7',
  effect: 'permanent_day',
  affectedMegasegments: [7, 8, 9, 10],
});

// Player can switch between timelines
function switchTimeline(targetUniverseId: string): void {
  // Pause current universe
  multiverseCoordinator.pauseUniverse(currentUniverseId);

  // Resume target universe
  multiverseCoordinator.resumeUniverse(targetUniverseId);

  // Load universe world state into renderer
  const universe = multiverseCoordinator.getUniverse(targetUniverseId);
  gameLoop.setWorld(universe.world);
}
```

## Storage Scaling

**Baseline (no ringworld):**
- 1 save file = 1 universe snapshot (~5-50 MB)
- Timeline = 100 snapshots (~500 MB - 5 GB)

**Strategy 1 (Megasegments as Universes):**
- 1 save file = 100 universe snapshots (~500 MB - 5 GB)
- Timeline = 100 snapshots × 100 universes = 10,000 snapshots (~50-500 GB)
- **Mitigation:** Pause distant universes, only save active megasegments

**Strategy 2 (Regions as Snapshots):**
- 1 save file = 1 universe snapshot (~5-50 MB)
- Timeline = 100 regions × 10 snapshots = 1,000 snapshots (~5-50 GB)
- **Mitigation:** Prune auto-saves, keep only canon events + manual saves

**Strategy 3 (Hybrid):**
- 1 save file = ~10 active megasegment universes (~50-500 MB)
- Timeline = 10 megasegments × 100 regions × 5 snapshots = 5,000 snapshots (~25-250 GB)
- **Mitigation:** Aggressive pruning, IndexedDB compression

**Recommended:** Strategy 2 (Regions as Snapshots) with delta storage
- Store only deltas from procedural baseline
- ~200 bytes per delta vs 5 MB per full snapshot
- 1,000 regions × 100 deltas = 100,000 deltas = ~20 MB
- **1000x storage reduction!**

## Implementation Roadmap

### Phase 1: Leverage Existing Timeline System
- [x] Timeline Manager already implemented
- [x] Multiverse Coordinator already implemented
- [x] World serialization already implemented
- [ ] Add ringworld canon event types
- [ ] Attach to ringworld event bus

### Phase 2: Region Snapshot Integration
- [ ] Create RegionDeltaComponent
- [ ] Register region_delta serializer
- [ ] Implement region swap with snapshot loading
- [ ] Test round-trip (save region, load region)

### Phase 3: Megasegment Universes (Optional)
- [ ] Register megasegments as universes
- [ ] Implement time scale adjustment
- [ ] Create passages for travel
- [ ] Test multi-universe save/load

### Phase 4: Time Travel UI
- [ ] Timeline browser (show canon events)
- [ ] Fork from snapshot UI
- [ ] Switch between timelines
- [ ] Passage visualization

## Success Criteria

- ✅ Leverage existing save system (no duplication)
- ✅ Canon events auto-save ringworld discoveries
- ✅ Time travel via universe forking
- ✅ Passages enable inter-megasegment travel
- ✅ Storage scales to millions of regions (via delta storage)
- ✅ Player can explore alternate ringworld timelines

## Future Enhancements

- **Multiverse Ringworlds** - Each forked universe is a different ringworld
- **Temporal Anomalies** - Passages that connect different time periods
- **Builder Time Travel** - Find Builder devices that let you rewind specific regions
- **Convergence Events** - Timelines merge when critical events align
- **Timeline Divergence Tracker** - Show how far alternate timelines have drifted
