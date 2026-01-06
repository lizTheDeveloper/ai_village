# Ringworld Renormalization System

**Status**: Design Draft
**Date**: 2026-01-06
**Goal**: Create a sub-game that simulates the feeling of "the whole ringworld is being simulated" through on-demand instantiation and statistical abstraction.

## Overview

The Ringworld Renormalization System creates the illusion of simulating trillions of souls across multiple ringworlds by:

1. **Abstracting state upward** - Details compress into statistics at higher tiers
2. **Instantiating on-demand** - Only compute what's being observed
3. **Seeded regeneration** - Revisiting locations produces consistent results
4. **Belief aggregation** - Collective consciousness creates emergent pan-dimensional effects

## The Core Problem

You cannot simulate 10^12 (trillion) souls in real-time. But you CAN:
- Track that there ARE a trillion souls
- Know their aggregate beliefs, fears, technologies, cultures
- Instantiate a representative sample when the player looks
- Ensure that sample is CONSISTENT with the aggregate statistics

This is **renormalization**: physics at different scales, same underlying reality.

## Tier Architecture

```
MULTIVERSE LAYER (The Eternal Archive)
├─ Contains: 9+ Ringworlds
├─ Stable State: Ringworld names, relative positions, inter-ring membranes
├─ Resolution: 10^15 souls per ringworld
│
├─ RINGWORLD LAYER
│   ├─ Contains: ~100 Gigasegments per ringworld
│   ├─ Stable State: Arc coordinates, total population (trillions), dominant civilizations
│   ├─ Resolution: 10^13 souls per gigasegment
│   │
│   ├─ GIGASEGMENT LAYER
│   │   ├─ Contains: ~1000 Megasegments
│   │   ├─ Stable State: Population (billions), tech level, major factions, belief density
│   │   ├─ Resolution: 10^10 souls per megasegment
│   │   │
│   │   ├─ MEGASEGMENT LAYER (Continental)
│   │   │   ├─ Contains: ~100 Subsections
│   │   │   ├─ Stable State: Major cities (named), trade routes, resources
│   │   │   ├─ Resolution: 10^8 souls per subsection
│   │   │   │
│   │   │   ├─ SUBSECTION LAYER (National)
│   │   │   │   ├─ Contains: ~100 Regions
│   │   │   │   ├─ Stable State: Capital cities, universities, factions
│   │   │   │   ├─ Resolution: 10^6 souls per region
│   │   │   │   │
│   │   │   │   ├─ REGION LAYER (State/Province)
│   │   │   │   │   ├─ Contains: ~100 Zones
│   │   │   │   │   ├─ Stable State: City names, governors, local events
│   │   │   │   │   ├─ Resolution: 10^4 souls per zone
│   │   │   │   │   │
│   │   │   │   │   ├─ ZONE LAYER (City/Metro) ← HEADLESS CITY TESTS
│   │   │   │   │   │   ├─ Contains: ~100 Chunks
│   │   │   │   │   │   ├─ Stable State: Districts, major buildings, TV station
│   │   │   │   │   │   ├─ Resolution: 100-1000 entities per chunk
│   │   │   │   │   │   │
│   │   │   │   │   │   └─ CHUNK LAYER (Full ECS) ← CURRENT GAME
│   │   │   │   │   │       ├─ Contains: Individual entities
│   │   │   │   │   │       └─ Resolution: Every agent, every tile
```

## On-Demand Instantiation

### The Observation Window

Only compute what the player is actually looking at:

```typescript
interface ObservationWindow {
  // Full simulation (ECS runs)
  activeChunks: Set<ChunkId>;           // ~9 chunks around camera

  // Partial simulation (tick summaries)
  adjacentZones: Set<ZoneId>;           // ~8 zones surrounding

  // Statistical only (no simulation, just numbers)
  visibleRegions: Set<RegionId>;        // What's on the minimap

  // Pure abstraction (aggregates only)
  everything_else: AbstractionLayer;    // The rest of the ringworld
}
```

### Instantiation Flow

When player moves to a new location:

```
1. Player approaches Zone X
2. System queries: Zone X stable state
   - Name: "Crystalline Heights"
   - Population: 847,293
   - Tech Level: 7
   - Dominant Faction: Merchants Guild
   - Major Buildings: [TV Station, University, 3 Temples]
   - Recent Events: [Plague ended 2 years ago, New governor elected]

3. System generates Zone X from seed:
   seed = hash(zone_coordinates + creation_epoch + stable_events)

4. Generated zone MUST satisfy constraints:
   - Population within 5% of stable state
   - Buildings mentioned in stable state MUST exist
   - Faction presence matches stable percentages
   - Historical scars from recorded events visible

5. Zone X becomes active, entities spawn
6. Player leaves Zone X
7. Zone X abstracts:
   - Major events recorded to stable state
   - Population delta recorded
   - Everything else discarded
```

### Seeded Consistency

The same location must feel the same on revisit:

```typescript
function generateLocation(stableState: StableState, seed: number): Location {
  const rng = seededRandom(seed);

  // Deterministic from seed + constraints
  const layout = generateLayout(rng, stableState.constraints);
  const buildings = placeMandatoryBuildings(stableState.majorBuildings, layout);
  const fillBuildings = generateFillBuildings(rng, layout, stableState.techLevel);

  // Named NPCs are stable
  const namedNPCs = stableState.importantFigures.map(fig => instantiateNPC(fig));

  // Generic NPCs generated to meet population
  const genericNPCs = generatePopulation(rng,
    stableState.population - namedNPCs.length,
    stableState.demographics
  );

  return { layout, buildings, npcs: [...namedNPCs, ...genericNPCs] };
}
```

## Stable State Schema

What gets persisted at each level:

### Ringworld Stable State
```typescript
interface RingworldStableState {
  id: string;
  name: string;                         // "Ringworld Alpha"
  epoch: number;                        // Creation time
  circumference_km: number;             // ~10^8 km
  width_km: number;                     // ~10^6 km

  // Aggregate statistics
  totalPopulation: bigint;              // Trillions
  averageTechLevel: number;             // 0-10
  dominantSpecies: SpeciesDistribution;

  // Stable geography
  gigasegments: GigasegmentReference[]; // ~100 entries
  majorGeographicFeatures: Feature[];   // Mountains, seas, etc.

  // Inter-dimensional
  beliefDensity: number;                // Souls believing / area
  deityPresence: Map<DeityId, number>;
  dimensionalThinness: number;          // How permeable reality is
}
```

### Zone Stable State (City Level - ties to headless city)
```typescript
interface ZoneStableState {
  id: string;
  name: string;                         // "Crystalline Heights"
  coordinates: { x: number, y: number, gigasegment: string };
  seed: number;                         // For regeneration

  // Demographics
  population: number;                   // Exact count
  populationDelta: number;              // Change since last visit
  demographics: {
    species: Map<Species, number>;
    factions: Map<FactionId, number>;
    ageDistribution: number[];
  };

  // Infrastructure
  techLevel: number;
  buildings: MandatoryBuilding[];       // MUST exist on regeneration
  districts: DistrictDefinition[];

  // Named entities (always consistent)
  importantFigures: NamedNPCReference[];
  rulingFaction: FactionId;
  governor: NamedNPCReference | null;

  // TV Station (if exists)
  tvStation?: {
    name: string;
    channels: number;
    broadcastReach: number;             // How many zones receive signal
    famousBroadcasts: BroadcastReference[];
  };

  // History
  recordedEvents: HistoricalEvent[];
  playerVisits: VisitRecord[];
  playerSignificantActions: Action[];   // Things player did here

  // Magic/Belief
  temples: TempleReference[];
  localBeliefs: Map<DeityId, number>;
  magicalAnomalies: AnomalyReference[];
}
```

## Belief Aggregation & Pan-Dimensional Effects

### The Belief Economy

Souls believing creates magical power:

```typescript
interface BeliefAggregation {
  // Per deity, sum across all zones
  calculateTotalBelief(deityId: DeityId): bigint {
    return this.ringworlds.reduce((sum, ringworld) => {
      return sum + ringworld.gigasegments.reduce((gSum, giga) => {
        return gSum + BigInt(giga.population) * BigInt(giga.beliefDensity[deityId] || 0);
      }, 0n);
    }, 0n);
  }
}
```

### Thresholds for Transcendent Effects

```typescript
const BELIEF_THRESHOLDS = {
  // Local effects (single zone)
  SHRINE_ACTIVE: 1_000n,                // Thousand believers
  TEMPLE_MIRACLES: 100_000n,            // Hundred thousand

  // Regional effects (subsection)
  REGIONAL_AVATAR: 10_000_000n,         // Ten million
  WEATHER_CONTROL: 100_000_000n,        // Hundred million

  // Continental effects (megasegment)
  CONTINENTAL_PRESENCE: 1_000_000_000n, // Billion
  REALITY_WARPING: 10_000_000_000n,     // Ten billion

  // Ringworld effects
  RINGWORLD_DEITY: 100_000_000_000n,    // Hundred billion
  STAR_MANIPULATION: 1_000_000_000_000n,// Trillion

  // Multi-ring effects
  DIMENSIONAL_MEMBRANE: 10_000_000_000_000n,    // Ten trillion (across 9 rings)
  SWISS_CHEESE_REALITY: 100_000_000_000_000n,   // Hundred trillion
  PAN_DIMENSIONAL_HIVEMIND: 1_000_000_000_000_000n // Quadrillion
};
```

### Swiss-Cheese Membranes

When belief density is high enough, reality becomes permeable:

```typescript
interface DimensionalMembrane {
  sourceRingworld: RingworldId;
  targetRingworld: RingworldId;

  // Membrane properties
  permeability: number;                 // 0-1, how easily things cross
  stability: 'gossamer' | 'stable' | 'swiss_cheese' | 'merged';

  // What can cross
  allowsConsciousness: boolean;         // Thoughts/prayers
  allowsInformation: boolean;           // Knowledge transfer
  allowsEntities: boolean;              // Physical crossing
  allowsDeities: boolean;               // Divine manifestation

  // Maintenance
  beliefRequired: bigint;               // Minimum belief to keep open
  currentBelief: bigint;
  degradationRate: number;              // How fast it closes without belief
}
```

### Pan-Dimensional Hive Minds

When multiple ringworlds share consciousness:

```typescript
interface HiveMindCollective {
  id: string;
  name: string;                         // "The Crystalline Consensus"

  // Participating consciousness
  sourceDeity: DeityId;                 // Usually started by a deity
  memberRingworlds: Set<RingworldId>;
  totalConnectedSouls: bigint;

  // Collective properties
  sharedMemory: CollectiveMemory;       // What the hive "knows"
  consensusBeliefs: Map<Concept, number>;
  collectiveGoals: Goal[];

  // Power scaling
  collectivePower(): number {
    // Power scales with log of connected souls
    // A trillion souls = power level 12
    // Ten trillion = power level 13
    return Math.log10(Number(this.totalConnectedSouls));
  }

  // Actions the hive can take
  canManipulateReality: boolean;        // At 10^14 souls
  canCreateUniverses: boolean;          // At 10^15 souls
  canTranscendTime: boolean;            // At 10^16 souls
}
```

## Integration with Headless City Tests

The existing headless city simulator becomes the "Zone" layer:

```typescript
// headless-city/CitySimulator.ts becomes:

class ZoneSimulator {
  private stableState: ZoneStableState;
  private isInstantiated: boolean = false;
  private cityManager: CityManager;     // Existing headless city code

  // Called when player approaches
  async instantiate(): Promise<void> {
    if (this.isInstantiated) return;

    // Generate from stable state
    const seed = this.stableState.seed;
    const config = this.stableStateToConfig();

    // Use existing headless city infrastructure
    this.cityManager = new CityManager(config);
    await this.cityManager.initialize();

    // Spawn mandatory buildings
    for (const building of this.stableState.buildings) {
      await this.cityManager.placeBuilding(building);
    }

    // Spawn named NPCs
    for (const npc of this.stableState.importantFigures) {
      await this.cityManager.spawnNamedAgent(npc);
    }

    // Fill remaining population
    await this.cityManager.spawnPopulation(
      this.stableState.population - this.stableState.importantFigures.length
    );

    this.isInstantiated = true;
  }

  // Called when player leaves
  async abstract(): Promise<void> {
    if (!this.isInstantiated) return;

    // Extract stable state updates
    const newPopulation = this.cityManager.getPopulation();
    const significantEvents = this.cityManager.getSignificantEvents();
    const namedNPCUpdates = this.cityManager.getNamedNPCStates();

    // Update stable state
    this.stableState.population = newPopulation;
    this.stableState.recordedEvents.push(...significantEvents);
    this.updateNamedNPCs(namedNPCUpdates);

    // Discard detailed simulation
    this.cityManager.dispose();
    this.isInstantiated = false;
  }
}
```

## TV Station Integration

TV Stations bridge zones, allowing events in one city to affect others:

```typescript
interface TVStation {
  id: string;
  name: string;                         // "Crystal Heights Broadcasting"
  location: ZoneId;

  // Broadcast reach
  signalStrength: number;               // 1-10
  reachableZones: ZoneId[];             // Calculated from signal + geography
  viewership: bigint;                   // Souls watching

  // Content
  channels: TVChannel[];
  famousBroadcasts: Broadcast[];        // Historically significant

  // Effects
  cultureSpread: Map<Concept, number>;  // Ideas spreading via broadcast
  beliefAmplification: number;          // TV increases belief spread rate
  unificationFactor: number;            // How much it homogenizes culture
}

interface Broadcast {
  id: string;
  title: string;
  type: 'news' | 'entertainment' | 'religious' | 'educational' | 'propaganda';

  // Reach
  originalAirDate: number;
  viewership: bigint;
  zonesReached: ZoneId[];

  // Impact
  culturalImpact: number;               // 0-10
  beliefShift: Map<DeityId, number>;    // +/- belief in deities
  conceptsIntroduced: Concept[];        // New ideas spread

  // Persistence
  isHistoricallySignificant: boolean;   // Worth saving in stable state
  replayable: boolean;                  // Can be watched again
}
```

## Save/Load Architecture

### What Gets Saved

```typescript
interface RingworldSave {
  // Always saved (tiny)
  multiverse: MultiverseStableState;    // ~1KB
  ringworlds: RingworldStableState[];   // ~100KB per ringworld

  // Saved if visited (grows with play)
  visitedGigasegments: Map<GigasegmentId, GigasegmentStableState>;
  visitedZones: Map<ZoneId, ZoneStableState>;

  // Saved temporarily (discarded on exit)
  activeSimulations: never;             // Don't save, regenerate

  // Compressed (events, not entities)
  historicalEvents: CompressedEventLog;
  playerActions: CompressedActionLog;
}
```

### Compression Strategy

```typescript
// Instead of saving every entity position...
interface UncompressedZone {
  entities: Entity[];                   // 10,000+ entities = huge
}

// ...save the constraints needed to regenerate
interface CompressedZone {
  seed: number;                         // 8 bytes
  population: number;                   // 4 bytes
  namedNPCs: NamedNPCState[];          // ~100 bytes each, only important ones
  buildings: BuildingState[];           // ~50 bytes each, only mandatory
  events: EventReference[];             // ~20 bytes each
  // Total: ~10KB instead of ~10MB
}
```

## Gameplay Loop at Ringworld Scale

### The Civilization Gardening Experience

```
1. OBSERVE (Zoom out to ringworld view)
   - See aggregate statistics
   - Identify problem areas (low stability, declining pop)
   - Notice emerging patterns (belief concentrations, tech clusters)

2. INVESTIGATE (Zoom to megasegment/zone)
   - Instantiate the area
   - See detailed simulation
   - Understand root causes

3. INTERVENE (Take action)
   - Build universities (long-term tech boost)
   - Establish temples (belief infrastructure)
   - Create trade routes (economic stability)
   - Found TV stations (cultural unification)

4. ABSTRACT (Zoom out, time passes)
   - Your changes persist in stable state
   - Simulation runs at abstract level
   - Statistical emergence plays out
   - Check back in decades/centuries later

5. TRANSCEND (Achieve multi-ring effects)
   - Enough belief → dimensional effects
   - Swiss-cheese membranes form
   - Hive minds emerge
   - Pan-dimensional play begins
```

### Victory Conditions

```typescript
const VICTORY_CONDITIONS = {
  // Tier 1: Single Zone
  ZONE_PROSPERITY: {
    requirement: "Zone stability > 90% for 100 years",
    reward: "Zone becomes self-sustaining"
  },

  // Tier 2: Region
  REGIONAL_HARMONY: {
    requirement: "All zones in region stable, trade routes connected",
    reward: "Regional governor AI unlocked"
  },

  // Tier 3: Megasegment
  CONTINENTAL_CIVILIZATION: {
    requirement: "10+ universities, tech level 8+, 1B population",
    reward: "Megasegment becomes 'civilized' (auto-stabilizes)"
  },

  // Tier 4: Ringworld
  RINGWORLD_UNITY: {
    requirement: "All gigasegments connected, shared culture via TV",
    reward: "Ringworld-scale deity effects available"
  },

  // Tier 5: Multi-Ring
  DIMENSIONAL_TRANSCENDENCE: {
    requirement: "10^14 souls believing, membranes to 3+ ringworlds",
    reward: "Pan-dimensional hive mind formation possible"
  },

  // Tier 6: The End of Eternity
  TEMPORAL_TRANSCENDENCE: {
    requirement: "10^16 souls in unified hive mind",
    reward: "Can manipulate timeline, true ending unlocked"
  }
};
```

## Implementation Phases

### Phase 1: Zone Layer (Use Existing Headless City)
- Wrap existing `CitySimulator` as `ZoneSimulator`
- Add stable state persistence
- Implement instantiate/abstract cycle
- Test: Visit zone, leave, revisit - should be consistent

### Phase 2: Region Layer
- Implement region abstraction
- Add inter-zone effects (trade, migration)
- TV station broadcast system
- Test: Changes in one zone affect neighbors

### Phase 3: Megasegment/Gigasegment Layers
- Statistical aggregation at continental scale
- University/research system integration
- Long-term event generation
- Test: Century-scale simulations

### Phase 4: Ringworld Layer
- Full ringworld abstraction
- Belief aggregation
- Deity effects at scale
- Test: Trillion-soul belief thresholds

### Phase 5: Multi-Ring / Dimensional
- Multiple ringworld management
- Dimensional membrane system
- Hive mind mechanics
- Test: Pan-dimensional play

## Technical Considerations

### Performance
- Zone instantiation: < 2 seconds
- Abstraction: < 500ms
- Ringworld-level tick: < 100ms (pure statistics)
- Save size: < 100MB for heavily-played ringworld

### Memory
- Active zone: ~100MB (full ECS)
- Adjacent zones: ~10MB each (partial state)
- Everything else: ~1KB per zone (stable state only)
- Total for 9 ringworlds: ~1GB if all explored

### Consistency
- Seeded RNG ensures reproducibility
- Stable state is the source of truth
- Generated content is ephemeral
- Player actions always recorded

## Appendix: Example Stable State Flow

```
Player visits "Crystalline Heights" for the first time:

1. Query region stable state:
   - Zone not yet visited
   - Generate name from seed: "Crystalline Heights"
   - Generate initial population: 847,293
   - Generate buildings from tech level + seed

2. Create zone stable state:
   {
     name: "Crystalline Heights",
     population: 847,293,
     techLevel: 7,
     buildings: [
       { type: "university", name: "Crystal Academy" },
       { type: "temple", deity: "wisdom_goddess" },
       { type: "tv_station", name: "CHB News" }
     ],
     importantFigures: [
       { name: "Governor Thalia", role: "governor" },
       { name: "Dean Marcus", role: "university_head" }
     ]
   }

3. Instantiate zone (headless city runs)

4. Player builds a new temple, kills a bandit leader

5. Player leaves, zone abstracts:
   {
     ...previous state,
     buildings: [
       ...previous,
       { type: "temple", deity: "war_god", builtBy: "player" }
     ],
     recordedEvents: [
       { type: "bandit_leader_killed", killer: "player", date: 1234567 }
     ]
   }

6. 50 years pass (statistical simulation)

7. Player returns:
   - Stable state loaded
   - Zone regenerated from seed + stable state
   - Player's temple exists
   - Bandit gang has new leader (generated from seed + event)
   - Population grew (statistical model)
   - Governor Thalia died (age), replaced by seeded successor
```

This creates the feeling of a living world that persists and evolves, while only computing what's necessary.
