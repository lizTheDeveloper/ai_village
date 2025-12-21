# Agent Spatial Memory System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Agents don't have perfect map knowledge. They remember places they've been and things they've discovered - rare plant locations, animal dens, resource deposits, danger zones. This knowledge can be shared with other agents through conversation, creating a social knowledge network.

---

## Spatial Memory Architecture

```typescript
interface SpatialMemory {
  agentId: string;

  // What they know about the world
  knownLocations: LocationMemory[];
  exploredChunks: Set<ChunkId>;
  mentalMap: MentalMap;

  // Knowledge sources
  sources: {
    personal: number;           // % from own exploration
    shared: number;             // % from other agents
    inherited: number;          // % from upbringing
  };
}

interface LocationMemory {
  id: string;
  position: Position;
  type: LocationType;

  // What's there
  content: LocationContent;

  // Knowledge quality
  confidence: number;           // 0-1, decays if not revisited
  lastVisited?: GameTime;
  lastUpdated: GameTime;
  timesVisited: number;

  // Source
  source: MemorySource;
  sharedBy?: AgentId;           // If learned from someone

  // Accessibility
  accessNotes?: string;         // "Hard to reach in winter"
  dangerNotes?: string;         // "Wolves nearby"
}

type LocationType =
  | "resource_node"       // Where to find stuff
  | "plant_patch"         // Wild plants
  | "animal_territory"    // Where animals live
  | "water_source"
  | "shelter"
  | "landmark"
  | "building"
  | "danger_zone"
  | "secret_spot"         // Personal discoveries
  | "meeting_place";

interface LocationContent {
  // What's at this location
  resources?: ResourceType[];
  plants?: PlantSpecies[];
  animals?: AnimalSpecies[];
  structures?: StructureType[];
  features?: string[];          // "Beautiful view", "Echo cave"

  // Quality/abundance
  abundance?: "sparse" | "moderate" | "abundant";
  quality?: "poor" | "average" | "excellent";

  // Conditions
  seasonal?: Season[];          // Only available in certain seasons
  timeOfDay?: TimeOfDay[];      // Only at certain times
  weatherDependent?: boolean;
}

type MemorySource =
  | "explored"            // Found it themselves
  | "told_by_agent"       // Another agent shared
  | "overheard"           // Heard in conversation
  | "taught"              // Formally taught
  | "discovered"          // Found while doing something else
  | "inherited";          // Knew from childhood/background
```

---

## Mental Map

Agents have an imperfect mental model of the world:

```typescript
interface MentalMap {
  // Known areas (explored chunks)
  knownAreas: Map<ChunkId, AreaKnowledge>;

  // Routes between places
  knownRoutes: Route[];

  // Spatial relationships
  relationships: SpatialRelationship[];

  // Map accuracy
  accuracy: {
    positions: number;          // How accurate are locations? 0-1
    distances: number;          // How accurate are distance estimates?
    directions: number;         // How accurate are directions?
  };
}

interface AreaKnowledge {
  chunkId: ChunkId;
  terrain: TerrainType;
  familiarity: number;          // 0-1, how well they know it
  lastVisited: GameTime;

  // What they remember about it
  features: string[];
  hazards: string[];
  resources: ResourceType[];
}

interface Route {
  from: Position | LocationId;
  to: Position | LocationId;

  // Path knowledge
  path?: Position[];            // Exact path if known
  estimatedDistance: number;    // May be inaccurate
  actualDistance?: number;      // If traveled

  // Conditions
  difficulty: number;
  hazards: string[];
  landmarks: string[];          // "Past the big oak"
}

interface SpatialRelationship {
  // Relative knowledge
  subject: LocationId;
  relation: "north_of" | "south_of" | "near" | "far_from" | "between";
  reference: LocationId;
  confidence: number;
}
```

---

## Fog of War / Visibility

Agents don't know what they haven't seen:

```typescript
interface AgentVisibility {
  // Current vision
  currentView: {
    position: Position;
    radius: number;             // How far they can see
    blockedBy: Position[];      // Terrain/building occlusion
  };

  // Map knowledge
  mapKnowledge: {
    // What percentage of the world they've seen
    exploredPercentage: number;

    // Per-chunk knowledge
    chunks: Map<ChunkId, ChunkKnowledge>;
  };
}

interface ChunkKnowledge {
  status: "unknown" | "heard_of" | "partially_explored" | "well_known";

  // What they know
  terrainKnown: boolean;
  resourcesKnown: boolean;
  structuresKnown: boolean;
  dangersKnown: boolean;

  // Currency of knowledge
  lastUpdated: GameTime;
  mayBeOutdated: boolean;
}

// What an agent can "see" right now
function getVisibleArea(agent: Agent): VisibleTile[] {
  const baseRadius = 8;         // Tiles
  const modifiers = {
    nightTime: 0.3,
    foggy: 0.5,
    rainy: 0.7,
    forest: 0.6,              // Trees block view
    hill: 1.5,                // High ground helps
  };

  let radius = baseRadius;
  for (const [condition, mod] of Object.entries(modifiers)) {
    if (hasCondition(agent, condition)) {
      radius *= mod;
    }
  }

  return getTilesInRadius(agent.position, radius);
}

// Agents must explore to learn
async function exploreArea(agent: Agent, area: Position[]): Promise<void> {
  for (const pos of area) {
    const chunkId = getChunkId(pos);

    // Mark as explored
    agent.spatialMemory.exploredChunks.add(chunkId);

    // Discover what's there
    const contents = getTileContents(pos);

    if (contents.notable) {
      // Form location memory
      const memory: LocationMemory = {
        id: generateId(),
        position: pos,
        type: classifyLocation(contents),
        content: {
          resources: contents.resources,
          plants: contents.plants,
          animals: contents.animals,
        },
        confidence: 1.0,
        lastVisited: gameTime.now(),
        lastUpdated: gameTime.now(),
        timesVisited: 1,
        source: "explored",
      };

      agent.spatialMemory.knownLocations.push(memory);

      // May form episodic memory too if significant
      if (contents.rare || contents.dangerous) {
        await createEpisodicMemory(agent, {
          type: "discovery",
          content: `Discovered ${describeContents(contents)} at ${describeLocation(pos)}`,
          importance: contents.rare ? 0.7 : 0.5,
        });
      }
    }
  }
}
```

---

## Knowledge Sharing

Agents can tell each other about locations:

```typescript
interface KnowledgeSharing {
  // How knowledge is shared
  methods: {
    conversation: ShareMethod;
    teaching: ShareMethod;
    maps: ShareMethod;          // If they can make maps
    landmarks: ShareMethod;     // Pointing/gesturing
  };
}

interface ShareMethod {
  // Transfer effectiveness
  transferRate: number;         // What % of knowledge transfers
  accuracyLoss: number;         // How much accuracy is lost

  // Requirements
  requires: {
    trust: number;              // Min trust to share
    relationship: string[];     // "friend", "family", "guild"
    skill?: string;             // Skill needed
  };
}

// When agents share location knowledge
async function shareLocationKnowledge(
  sharer: Agent,
  receiver: Agent,
  location: LocationMemory,
  context: ConversationContext
): Promise<boolean> {

  // Check if sharer wants to share
  const willShare = await decideToShare(sharer, receiver, location);
  if (!willShare) return false;

  // Check trust level
  const trust = getRelationshipTrust(sharer, receiver);
  if (trust < 0.3) {
    // Low trust = vague information
    const vagueMemory: LocationMemory = {
      ...location,
      position: fuzzyPosition(location.position, 5),  // +/- 5 tiles
      confidence: 0.5,
      source: "told_by_agent",
      sharedBy: sharer.id,
    };
    receiver.spatialMemory.knownLocations.push(vagueMemory);
  } else {
    // High trust = accurate information
    const sharedMemory: LocationMemory = {
      ...location,
      confidence: location.confidence * 0.9,  // Slight accuracy loss
      source: "told_by_agent",
      sharedBy: sharer.id,
      lastVisited: undefined,  // Receiver hasn't been there
    };
    receiver.spatialMemory.knownLocations.push(sharedMemory);
  }

  // Both form memories of the exchange
  await createConversationMemory(sharer, receiver, {
    topic: "shared_location",
    content: `Told ${receiver.name} about ${location.type} at ${describeLocation(location.position)}`,
  });

  await createConversationMemory(receiver, sharer, {
    topic: "learned_location",
    content: `${sharer.name} told me about ${location.type} - ${describeVaguely(location)}`,
  });

  return true;
}

// Decide whether to share (can involve LLM for complex decisions)
async function decideToShare(
  sharer: Agent,
  receiver: Agent,
  location: LocationMemory
): Promise<boolean> {

  // Secret spots are harder to share
  if (location.type === "secret_spot") {
    const trust = getRelationshipTrust(sharer, receiver);
    if (trust < 0.8) return false;
  }

  // Competitive resources might not be shared
  if (location.content.abundance === "sparse") {
    // Might want to keep for themselves
    const generosity = sharer.personality.generosity;
    if (Math.random() > generosity) return false;
  }

  // Generally share useful info with friends
  const relationship = getRelationship(sharer, receiver);
  return relationship.type !== "enemy" && relationship.trust > 0.2;
}
```

---

## Knowledge Queries

Agents can query their spatial memory:

```typescript
interface SpatialQuery {
  // Types of queries
  queries: {
    nearest: (type: LocationType) => LocationMemory | null;
    all: (type: LocationType) => LocationMemory[];
    inArea: (area: BoundingBox) => LocationMemory[];
    withResource: (resource: ResourceType) => LocationMemory[];
    routeTo: (destination: Position) => Route | null;
  };
}

// Find nearest known location of type
function findNearest(
  agent: Agent,
  type: LocationType,
  resource?: ResourceType
): LocationMemory | null {

  const candidates = agent.spatialMemory.knownLocations
    .filter(loc => loc.type === type)
    .filter(loc => !resource || loc.content.resources?.includes(resource))
    .filter(loc => loc.confidence > 0.3);  // Must be reasonably sure

  if (candidates.length === 0) return null;

  // Sort by distance
  candidates.sort((a, b) => {
    const distA = distance(agent.position, a.position);
    const distB = distance(agent.position, b.position);
    return distA - distB;
  });

  return candidates[0];
}

// Example: Agent looking for herbs
async function findHerbs(agent: Agent): Promise<Position | null> {
  // Check spatial memory first
  const knownHerbs = findNearest(agent, "plant_patch");

  if (knownHerbs) {
    // Go to known location
    return knownHerbs.position;
  }

  // Ask other agents
  const nearbyAgents = getNearbyAgents(agent, 5);
  for (const other of nearbyAgents) {
    const theirKnowledge = findNearest(other, "plant_patch");
    if (theirKnowledge) {
      // Initiate conversation to ask
      await initiateConversation(agent, other, {
        topic: "asking_for_location",
        seeking: "plant_patch",
      });
      return null;  // Will get info through conversation
    }
  }

  // Must explore
  return null;
}
```

---

## Memory Decay

Spatial memories fade if not reinforced:

```typescript
interface SpatialMemoryDecay {
  // Decay rules
  decay: {
    // Base decay per season
    baseDecayRate: 0.1;

    // Factors that slow decay
    reinforcement: {
      visited: -0.5;            // Visiting resets/boosts
      thought_about: -0.1;      // Recalling slows decay
      used_knowledge: -0.2;     // Acting on it helps
    };

    // Factors that speed decay
    acceleration: {
      never_visited: 0.2;       // Secondhand knowledge decays faster
      contradicted: 0.3;        // If info seems wrong
      old: 0.1;                 // Very old memories decay faster
    };

    // Minimum confidence before forgetting
    forgetThreshold: 0.1;
  };
}

// Run decay each season
function decaySpatialMemories(agent: Agent): void {
  const toRemove: string[] = [];

  for (const memory of agent.spatialMemory.knownLocations) {
    // Calculate decay
    let decay = 0.1;  // Base

    // Modify based on factors
    if (!memory.lastVisited) {
      decay += 0.2;  // Never visited = faster decay
    }

    const age = gameTime.seasonsSince(memory.lastUpdated);
    if (age > 4) {
      decay += 0.1;  // Old memories
    }

    // Apply decay
    memory.confidence = Math.max(0, memory.confidence - decay);

    // Remove if too low
    if (memory.confidence < 0.1) {
      toRemove.push(memory.id);
    }
  }

  // Remove forgotten locations
  agent.spatialMemory.knownLocations =
    agent.spatialMemory.knownLocations.filter(m => !toRemove.includes(m.id));
}

// Visiting reinforces memory
function visitLocation(agent: Agent, position: Position): void {
  const existing = agent.spatialMemory.knownLocations
    .find(m => distance(m.position, position) < 2);

  if (existing) {
    // Reinforce
    existing.confidence = 1.0;
    existing.lastVisited = gameTime.now();
    existing.timesVisited++;

    // Update content if changed
    const currentContent = getTileContents(position);
    if (contentChanged(existing.content, currentContent)) {
      existing.content = currentContent;
      existing.lastUpdated = gameTime.now();
    }
  } else {
    // New location
    exploreArea(agent, [position]);
  }
}
```

---

## Outdated Information

The world changes - agents may have outdated info:

```typescript
interface OutdatedKnowledge {
  // Things that can change
  changeable: {
    resources: "can be depleted";
    plants: "seasonal, can be harvested";
    animals: "migrate, can be hunted";
    structures: "can be built/destroyed";
    dangers: "threats can move";
  };

  // Handling outdated info
  handling: {
    // Agent arrives and finds things different
    onDiscrepancy: (agent, memory, reality) => void;

    // Update confidence in source
    sourceCredibilityUpdate: boolean;
  };
}

// When agent finds reality doesn't match memory
async function handleDiscrepancy(
  agent: Agent,
  memory: LocationMemory,
  reality: LocationContent
): Promise<void> {

  // Update the memory
  memory.content = reality;
  memory.lastUpdated = gameTime.now();
  memory.lastVisited = gameTime.now();

  // If learned from someone, reduce trust in their info
  if (memory.sharedBy) {
    const sharer = getAgent(memory.sharedBy);
    if (sharer) {
      // Reduce spatial info credibility
      adjustCredibility(agent, sharer, "spatial_info", -0.1);
    }
  }

  // Form memory of the surprise
  if (significantChange(memory.content, reality)) {
    await createEpisodicMemory(agent, {
      type: "surprise",
      content: `Expected ${describeContent(memory.content)} but found ${describeContent(reality)}`,
      importance: 0.4,
      emotionalValence: reality.better ? 0.3 : -0.2,
    });
  }
}
```

---

## Integration with Movement

When agents decide to go somewhere:

```typescript
// Agent wants to find something
async function seekResource(agent: Agent, resource: ResourceType): Promise<void> {
  // 1. Check spatial memory
  const knownLocation = findNearest(agent, "resource_node", resource);

  if (knownLocation && knownLocation.confidence > 0.5) {
    // Go to remembered location
    await setDestination(agent, knownLocation.position, {
      reason: `Going to get ${resource}`,
      expectation: knownLocation.content,
    });
    return;
  }

  // 2. Check if anyone nearby might know
  const nearbyAgents = getNearbyAgents(agent, 5);
  if (nearbyAgents.length > 0) {
    // Could ask someone
    const shouldAsk = Math.random() > 0.5;  // Simple heuristic
    if (shouldAsk) {
      await initiateConversation(agent, nearbyAgents[0], {
        topic: "asking_location",
        resource,
      });
      return;
    }
  }

  // 3. Explore to find it
  const unexploredDirection = findUnexploredDirection(agent);
  await setDestination(agent, unexploredDirection, {
    reason: `Exploring to find ${resource}`,
    exploring: true,
  });
}
```

---

## Alien Spatial Memory

Different consciousness types have fundamentally different spatial memory structures.

### Pack Mind Shared Spatial Memory

Pack minds share ONE spatial memory across all bodies:

```typescript
interface PackSpatialMemory {
  packId: string;
  bodies: string[];

  // Single unified spatial memory
  sharedMemory: SpatialMemory;

  // Per-body perception
  bodyPerceptions: Map<string, BodyPerception>;

  // Multi-body advantages
  simultaneousExploration: boolean;
  parallelViews: boolean;
}

interface BodyPerception {
  bodyId: string;
  currentView: Position[];
  exploringNow: boolean;
}

// All bodies contribute to one mental map
function packExploration(pack: PackMind): void {
  // Bodies can explore different areas simultaneously
  for (const body of pack.bodies) {
    const visible = getVisibleArea(body);

    // Instantly shared with entire pack
    for (const tile of visible) {
      if (!pack.spatialMemory.exploredChunks.has(getChunkId(tile))) {
        // Whole pack learns immediately
        pack.spatialMemory.exploredChunks.add(getChunkId(tile));

        // Contents discovered by any body known to all
        const contents = getTileContents(tile);
        if (contents.notable) {
          createSharedLocationMemory(pack, tile, contents);
        }
      }
    }
  }
}

// Pack spatial advantages
interface PackSpatialAdvantages {
  // Multiple perspectives
  surroundingView: boolean;           // Bodies can surround area
  triangulation: boolean;             // Bodies triangulate positions

  // Coordinated exploration
  efficientSearch: boolean;           // Bodies spread out
  noRedundantExploration: boolean;    // Don't duplicate effort

  // Combined knowledge
  instantSharing: boolean;            // No need to communicate
  noAccuracyLoss: boolean;            // No "telephone game"
}
```

### Hive Collective Spatial Knowledge

Hives have perfect shared spatial memory through the queen/network:

```typescript
interface HiveSpatialMemory {
  hiveId: string;

  // Collective knowledge pool
  collectiveMemory: CollectiveSpatialMemory;

  // Queen's comprehensive view
  queenOverview: QueenSpatialAwareness;

  // Worker contribution
  workerPerceptions: WorkerPerceptionStream;
}

interface CollectiveSpatialMemory {
  // Perfect aggregate of all worker knowledge
  knownLocations: LocationMemory[];

  // Updated instantly from any worker
  updateLatency: 0;

  // No individual memories - only collective
  individualMemories: never;

  // Coverage from all workers
  explorationCoverage: Map<ChunkId, {
    discoveredBy: string;             // Worker ID
    confirmedBy: number;              // How many workers verified
    lastSeen: GameTime;
  }>;
}

interface QueenSpatialAwareness {
  // Queen sees through all workers
  activeViews: number;                // How many workers active

  // Queen's range
  directAwareness: number;            // Radius from queen
  workerAwareness: number;            // Through worker senses

  // Priority areas
  focusAreas: Position[];             // Where queen is paying attention
}

// Any worker's discovery is instantly hive knowledge
function workerDiscovery(hive: Hive, worker: Agent, location: Position): void {
  const contents = getTileContents(location);

  // Instant hive-wide knowledge
  // No sharing mechanic needed - it's automatic
  hive.spatialMemory.collectiveMemory.knownLocations.push({
    id: generateId(),
    position: location,
    type: classifyLocation(contents),
    content: contents,
    confidence: 1.0,
    source: "collective",
    lastUpdated: gameTime.now(),
  });

  // Worker gets no personal credit - it's for the hive
}

// Workers can query hive knowledge instantly
function workerQuery(hive: Hive, type: LocationType): LocationMemory[] {
  // Worker has access to all hive knowledge
  // No skill check, no relationship, just access
  return hive.spatialMemory.collectiveMemory.knownLocations
    .filter(loc => loc.type === type);
}
```

### Symbiont Inherited Spatial Memory

Symbionts carry past hosts' spatial memories:

```typescript
interface SymbiontSpatialMemory {
  // Current host's spatial memory
  currentHostMemory: SpatialMemory;

  // Past hosts' memories (may be outdated)
  inheritedMemories: InheritedSpatialMemory[];

  // Integration level
  integration: number;                // How much current host accesses past
}

interface InheritedSpatialMemory {
  hostName: string;
  hostLifespan: DateRange;

  // Their spatial knowledge
  locations: LocationMemory[];

  // May be very outdated
  ageInYears: number;
  expectedAccuracy: number;           // Decreases with age

  // Access
  accessibility: "clear" | "foggy" | "fragments";
  triggerConditions: string[];        // What activates these memories
}

// Current host accessing past host's spatial memory
function accessInheritedLocation(
  joined: JoinedBeing,
  locationType: LocationType
): LocationMemory | null {

  // Check current memory first
  const current = findNearest(joined.currentHost, locationType);
  if (current && current.confidence > 0.7) {
    return current;
  }

  // Check inherited memories
  for (const inherited of joined.symbiont.inheritedMemories) {
    const pastMemory = inherited.locations
      .find(loc => loc.type === locationType);

    if (pastMemory) {
      // May be very outdated
      const adjustedMemory: LocationMemory = {
        ...pastMemory,
        confidence: pastMemory.confidence * inherited.expectedAccuracy,
        source: "inherited",
        // Note: position may be wrong if landscape changed
        accessNotes: `From ${inherited.hostName}, ${inherited.ageInYears} years ago`,
      };

      return adjustedMemory;
    }
  }

  return null;
}

// Symbiont-specific: Dejà vu moments
function experienceSpatialDejavu(joined: JoinedBeing, position: Position): void {
  // Current host visits place past host knew
  for (const inherited of joined.symbiont.inheritedMemories) {
    const pastMemory = inherited.locations
      .find(loc => distance(loc.position, position) < 3);

    if (pastMemory) {
      // Déjà vu experience
      createEpisodicMemory(joined.currentHost, {
        type: "inherited_memory_flash",
        content: `This place feels familiar... ${inherited.hostName} was here`,
        emotionalValence: 0.2,
        importance: 0.3,
      });
    }
  }
}
```

### Networked/Telepathic Spatial Sharing

Beings with telepathic links share spatial knowledge instantly:

```typescript
interface NetworkedSpatialMemory {
  nodeId: string;                     // This being
  networkId: string;                  // The network they belong to

  // Personal spatial memory
  personal: SpatialMemory;

  // Network-shared knowledge
  networkKnowledge: NetworkSpatialKnowledge;

  // Connection properties
  connectionStrength: number;         // 0-1
  sharingPermission: "all" | "significant" | "on_request" | "none";
}

interface NetworkSpatialKnowledge {
  // Knowledge from network members
  sharedLocations: Map<string, LocationMemory[]>;  // Member ID → their knowledge

  // Network-wide discoveries
  networkDiscoveries: LocationMemory[];

  // Access speed
  queryLatency: number;               // Milliseconds to access others' knowledge
}

// Query network for spatial knowledge
async function networkQuery(
  querier: NetworkedBeing,
  locationType: LocationType
): Promise<LocationMemory[]> {

  const results: LocationMemory[] = [];

  // Check own memory first
  const personal = querier.spatialMemory.personal.knownLocations
    .filter(loc => loc.type === locationType);
  results.push(...personal);

  // Query network (if connected)
  if (querier.connectionStrength > 0.3) {
    for (const [memberId, memberLocations] of querier.networkKnowledge.sharedLocations) {
      // Filter and add
      const memberMatches = memberLocations
        .filter(loc => loc.type === locationType)
        .map(loc => ({
          ...loc,
          source: "network",
          sharedBy: memberId,
          // Slight accuracy loss for network knowledge
          confidence: loc.confidence * 0.95,
        }));
      results.push(...memberMatches);
    }
  }

  return results;
}

// Instant spatial broadcast
function broadcastDiscovery(
  discoverer: NetworkedBeing,
  location: LocationMemory
): void {
  if (discoverer.sharingPermission === "none") return;

  const isSignificant = location.content.abundance === "abundant" ||
    location.type === "danger_zone";

  if (discoverer.sharingPermission === "significant" && !isSignificant) return;

  // Broadcast to network
  for (const member of getNetworkMembers(discoverer.networkId)) {
    if (member.id === discoverer.id) continue;

    // Instant knowledge transfer
    member.networkKnowledge.networkDiscoveries.push({
      ...location,
      source: "network_broadcast",
      sharedBy: discoverer.id,
    });
  }
}
```

### Geological-Scale Spatial Memory

Beings that think in millennia perceive space differently:

```typescript
interface GeologicalSpatialMemory {
  beingId: string;

  // Don't remember locations - remember landscapes
  landscapeMemory: LandscapeMemory[];

  // Don't remember buildings - remember civilizations' territories
  civilizationTerritories: Map<string, TerritoryMemory>;

  // Geological features (change slowly, unlike mortal structures)
  geologicalFeatures: GeologicalFeature[];
}

interface LandscapeMemory {
  regionId: string;
  terrain: TerrainType;

  // Observed over millennia
  observedChanges: LandscapeChange[];

  // Current state
  currentState: string;

  // What they care about
  significantFeatures: string[];      // Mountains, rivers, not houses
}

interface LandscapeChange {
  changeType: "erosion" | "volcanic" | "glacial" | "biological" | "mortal_impact";
  startedAt: GameTime;
  duration: number;                   // Years
  description: string;
}

interface TerritoryMemory {
  // They don't remember the village - they remember "where those mortals lived"
  civilizationName: string;
  approximateRegion: BoundingBox;     // Large area, not precise location

  // Over centuries
  observedGenerations: number;
  observedRise: boolean;
  observedFall: boolean;

  // Current status
  currentStatus: "thriving" | "declining" | "gone" | "unknown";
  lastChecked: GameTime;              // "Last checked" might be centuries ago
}

// Geological beings don't navigate like mortals
function geologicalNavigation(being: GeologicalBeing, destination: string): void {
  // They don't pathfind around buildings
  // They move through the landscape (buildings are temporary)

  // Their "route" is through terrain features
  const route = findTerrainRoute(being.position, destination);

  // May pass through what mortals see as obstacles
  // (they'll erode/collapse in time anyway)
}

// What they notice
function geologicalPerception(being: GeologicalBeing): void {
  // Don't see individual tiles
  // See regional patterns

  const perception: GeologicalPerception = {
    // Terrain over large area
    terrain: getRegionalTerrain(being.position, 1000),  // 1000 tile radius

    // Geological features
    mountains: getMountainRanges(being.position, 10000),
    rivers: getRiverSystems(being.position, 10000),

    // Mortal activity (if persistent enough)
    civilizationActivity: getVisibleCivilizations(being.position),

    // Changes
    recentGeologicalEvents: getRecentGeologicalEvents(10000),  // 10000 years
  };
}
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Visibility** | Agents only see nearby tiles, blocked by terrain |
| **Exploration** | Must visit areas to know them |
| **Memory types** | Resources, plants, animals, dangers, landmarks |
| **Confidence** | 0-1, decays over time without reinforcement |
| **Sharing** | Can tell others, accuracy depends on trust |
| **Outdated info** | World changes, memories can become wrong |
| **Queries** | "Where's the nearest X?" uses spatial memory |

Key principles:
- **No omniscience** - agents only know what they've seen or been told
- **Social knowledge** - agents share and learn from each other
- **Imperfect information** - accuracy varies, info can be outdated
- **Memory decay** - unused knowledge fades

---

## Related Specs

- `agent-system/memory-system.md` - Episodic memory (separate system)
- `agent-system/movement.md` - How agents navigate using spatial memory
- `world-system/procedural-generation.md` - The world they're exploring

