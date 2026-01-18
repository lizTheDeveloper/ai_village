# Trade & Logistics Hierarchy - Flow-Based Economics

**Status:** 🚧 Design Document
**Version:** 1.0.0
**Last Updated:** 2026-01-17
**Dependencies:** 04-SPATIAL-HIERARCHY.md, 05-SHIP-FLEET-HIERARCHY.md, 06-POLITICAL-HIERARCHY.md, TradeAgreementSystem, Hierarchy Simulator

---

## Overview & Motivation

### The Trade Hierarchy Vision

Trade is the **economic bloodstream** connecting all domains - spatial, political, and ship hierarchies. From a single villager bartering fish for pottery, to galactic trade networks moving exotic matter across universes.

**Tier Table: Trade Route → Shipping Lane → Trade Network → Trade Federation**

| Tier | Scale | Goods Flow | Simulation | Integration |
|------|-------|------------|------------|-------------|
| **Trade Route** | 2 settlements | Individual shipments | ECS trades | TradingSystem |
| **Shipping Lane** | Regional corridor | Aggregate flow (goods/tick) | TransportHub | TradeAgreementSystem |
| **Trade Network** | Planet/System | Flow topology | Graph analysis | ResourceFlow |
| **Trade Federation** | Multi-system | Standardization | Economic bloc | Political domain |

**Core Innovation:** Flow-based economics scales from counting individual items to tracking aggregate throughput using renormalization group theory.

---

## Core Concepts

### 1. From Items to Flows

**The Problem:** At chunk tier, you track every item:
```typescript
agent.inventory = [
  { itemId: 'iron_ore', quantity: 5 },
  { itemId: 'bread', quantity: 2 }
];
```

At galaxy tier, there are **quadrillions** of individual items. You can't track each one.

**The Solution:** Renormalize to flow rates (goods/tick):

```typescript
// Chunk tier (individual)
trader.deliver({ itemId: 'iron_ore', quantity: 5 }); // 1 trade

// Region tier (aggregate)
tradeRoute.flow = 100; // iron_ore/tick flowing on this route

// Planet tier (topology)
network.totalFlow = 10_000; // total goods/tick across all routes

// Federation tier (economics)
bloc.GDP = 1_000_000; // currency units/tick
```

**Key Insight:** Individual transactions become statistical noise at scale.

### 2. Chokepoints and Strategic Control

**Definition:** Chokepoint = location where multiple trade routes converge

**Why they matter:**
- **Taxation:** Control chokepoint = tax all passing goods
- **Blockade:** Block chokepoint = starve downstream regions
- **Piracy:** Raid chokepoint = maximum loot
- **Military:** Defend chokepoint = protect entire network

**Example:**
```
Planet A → Wormhole Gate → Planet B
         ↑ CHOKEPOINT

If gate blockaded:
  - Planet B loses 80% of imports
  - Economic collapse in 30 game-days
  - Political instability ensues
```

### 3. Currency and Value

**Local Currencies:**
- Each settlement mints its own currency
- Value determined by local supply/demand

**Exchange Rates:**
- Emerge from trade arbitrage
- "1 Iron Coin = 0.8 Gold Coins"

**Currency Unions:**
- Political entities standardize currency
- Trade Federation enforces common currency
- Reduces transaction costs

---

## Tier 1: Trade Route Level (Individual Routes)

**Scale:** 2 settlements, specific goods
**Simulation:** Full ECS (individual agent trades)
**Status:** ✅ Mostly exists (TradingSystem, TradeAgreementSystem)

### Overview

A trade route is the **atomic unit** of trade - one settlement exchanges goods with another via caravans or ships.

### Existing System: TradingSystem

**Location:** `packages/core/src/systems/TradingSystem.ts`

**What it does:**
- Individual agents trade items
- Market events (prices fluctuate)
- Local supply/demand

**Example:**
```typescript
// Agent trades fish for bread
tradingSystem.executeTrade(
  fishermanId,
  bakerId,
  { itemId: 'fish', quantity: 3 },
  { itemId: 'bread', quantity: 2 }
);
```

### Existing System: TradeAgreementSystem

**Location:** `packages/core/src/systems/TradeAgreementSystem.ts`

**What it does:**
- Formal agreements between civilizations
- 5 trade scopes: local, inter_village, cross_timeline, cross_universe, cross_multiverse
- Escrow for untrusted trades
- Hilbert-time causal ordering (async trades)

**TradeAgreement interface (existing):**
```typescript
interface TradeAgreement {
  id: string;
  scope: 'local' | 'inter_village' | 'cross_timeline' | 'cross_universe' | 'cross_multiverse';
  parties: CivilizationIdentity[];  // Who's trading
  terms: TradeTerm[];               // What's traded
  mediators: Mediator[];            // Mayor/diplomat agents
  status: 'proposed' | 'active' | 'negotiating' | 'cancelled' | 'expired';

  proposedAt: bigint;
  acceptedAt?: bigint;
  expiresAt?: bigint;

  // Cross-realm metadata (for cross-universe trades)
  crossRealmMetadata?: {
    passageIds: string[];           // Wormhole/portal IDs
    escrowEntities: string[];       // Items held in escrow
    timeSyncMode: 'absolute' | 'relative';
    trustLevel: 'untrusted' | 'new' | 'established' | 'trusted';
    successfulTrades: number;
    failedTrades: number;
  };

  violations: TradeViolation[];
  totalValueExchanged: number;
}
```

**TradeTerm interface (existing):**
```typescript
interface TradeTerm {
  itemId: string;
  quantity: number;
  providedBy: string;  // Civilization ID
  receivedBy: string;

  delivery: {
    method: 'immediate' | 'periodic';
    frequency?: number;     // Ticks between deliveries
    nextDeliveryTick?: bigint;
  };

  pricePerUnit?: number;
  currency?: string;
}
```

### NEW: TradeRouteTier

**Extends existing TradeAgreement with route-specific data:**

```typescript
/**
 * Trade Route - individual route between two settlements
 * Extends TradeAgreement with logistics, transport, and hazards
 */
interface TradeRouteTier {
  id: string;

  /**
   * Based on existing TradeAgreement
   */
  agreementId: string;  // Reference to TradeAgreement

  /**
   * Route endpoints (spatial domain)
   */
  origin: {
    tierId: string;     // Spatial tier ID (village, city, etc)
    name: string;
    coordinates: Vector3D;
  };

  destination: {
    tierId: string;
    name: string;
    coordinates: Vector3D;
  };

  /**
   * Distance and travel time
   */
  distance: number;     // km
  travelTime: number;   // Ticks for caravan/ship to complete route

  /**
   * Goods transported (from TradeTerm)
   */
  goods: {
    itemId: string;
    quantity: number;       // Per shipment
    frequency: number;      // Shipments/tick (e.g., 0.01 = 1 per 100 ticks)
    flowRate: number;       // quantity * frequency = goods/tick
  }[];

  /**
   * Transport method
   */
  transport: {
    method: 'caravan' | 'ship' | 'courier_ship' | 'portal';

    // If ship
    assignedShipIds?: string[];  // Ship IDs from Ship domain
    cargoCapacity?: number;      // Tons per trip

    // If caravan
    agents?: string[];           // Agent IDs pulling carts

    // If portal
    passageId?: string;          // Portal entity ID
  };

  /**
   * Route profitability (currency/tick)
   */
  economics: {
    revenue: number;      // Income from sales
    cost: number;         // Transport, escort, fees
    profit: number;       // revenue - cost

    // Pricing
    buyPrice: Map<string, number>;   // Price at origin
    sellPrice: Map<string, number>;  // Price at destination
    margin: number;                  // Profit percentage
  };

  /**
   * Hazards and security
   */
  hazards: {
    pirateRisk: number;        // 0-1, chance of pirate attack
    weatherRisk: number;       // Environmental hazards
    politicalRisk: number;     // War, embargo

    // Mitigation
    escortSquadronId?: string;  // Squadron from Ship domain providing protection
    insuranceCost: number;      // Cost to insure cargo
  };

  /**
   * Route health
   */
  status: {
    active: boolean;
    lastShipmentTick: bigint;
    shipmentsCompleted: number;
    shipmentsLost: number;      // Piracy, accidents
    reliability: number;        // 0-1, shipmentsCompleted / (completed + lost)
  };
}
```

### Trade Route Mechanics

**1. Establishing a Route:**

```typescript
/**
 * Create trade route from existing agreement
 */
function createTradeRoute(
  agreement: TradeAgreement,
  transport: 'caravan' | 'ship' | 'portal',
  world: World
): TradeRouteTier {
  // Get endpoints from agreement parties
  const origin = getSpatialTier(agreement.parties[0].id);
  const destination = getSpatialTier(agreement.parties[1].id);

  // Calculate distance
  const distance = calculateDistance(origin.coordinates, destination.coordinates);
  const travelTime = calculateTravelTime(distance, transport);

  // Convert terms to goods flow
  const goods = agreement.terms.map(term => ({
    itemId: term.itemId,
    quantity: term.quantity,
    frequency: term.delivery.method === 'periodic' ?
      1 / (term.delivery.frequency ?? 1) :
      0.1,  // Immediate = occasional shipment
    flowRate: term.quantity * (1 / (term.delivery.frequency ?? 10)),
  }));

  // Assign transport
  let assignedTransport;
  if (transport === 'ship') {
    assignedTransport = {
      method: 'ship',
      assignedShipIds: assignShipsToRoute(agreement, world),
      cargoCapacity: calculateCargoNeeds(goods),
    };
  }

  // Calculate economics
  const economics = calculateRouteEconomics(goods, distance, transport);

  // Assess hazards
  const hazards = assessRouteHazards(origin, destination, world);

  return {
    id: `route_${agreement.id}`,
    agreementId: agreement.id,
    origin: { tierId: origin.id, name: origin.name, coordinates: origin.coordinates },
    destination: { tierId: destination.id, name: destination.name, coordinates: destination.coordinates },
    distance,
    travelTime,
    goods,
    transport: assignedTransport,
    economics,
    hazards,
    status: {
      active: true,
      lastShipmentTick: BigInt(world.tick),
      shipmentsCompleted: 0,
      shipmentsLost: 0,
      reliability: 1.0,
    },
  };
}
```

**2. Route Execution (Per Tick):**

```typescript
/**
 * Process trade routes each tick
 */
function processTradeRoutes(routes: TradeRouteTier[], world: World): void {
  for (const route of routes) {
    if (!route.status.active) continue;

    // Check if shipment due
    const ticksSinceLastShipment = Number(BigInt(world.tick) - route.status.lastShipmentTick);
    const shipmentDue = route.goods.some(g =>
      ticksSinceLastShipment >= (1 / g.frequency)
    );

    if (!shipmentDue) continue;

    // Execute shipment
    const result = executeShipment(route, world);

    if (result.success) {
      route.status.shipmentsCompleted++;
      route.status.lastShipmentTick = BigInt(world.tick);

      // Deliver goods to destination
      for (const good of route.goods) {
        deliverGoods(route.destination.tierId, good.itemId, good.quantity, world);
      }
    } else {
      // Shipment lost (piracy, accident)
      route.status.shipmentsLost++;
      console.warn(`Shipment lost on route ${route.id}: ${result.reason}`);
    }

    // Update reliability
    route.status.reliability =
      route.status.shipmentsCompleted /
      (route.status.shipmentsCompleted + route.status.shipmentsLost);
  }
}
```

**3. Piracy and Hazards:**

```typescript
/**
 * Execute a shipment, checking for hazards
 */
function executeShipment(
  route: TradeRouteTier,
  world: World
): { success: boolean; reason?: string } {
  // Check pirate attack
  if (Math.random() < route.hazards.pirateRisk) {
    // Check if escort present
    if (route.hazards.escortSquadronId) {
      const squadron = getSquadron(route.hazards.escortSquadronId);

      // Escorts engage pirates
      const escortWins = squadron.combat.combatExperience > 0.5; // Simplified
      if (escortWins) {
        // Escort defeats pirates, shipment continues
        return { success: true };
      } else {
        // Escort lost, shipment captured
        return { success: false, reason: 'pirate_attack' };
      }
    } else {
      // No escort, shipment lost
      return { success: false, reason: 'pirate_attack' };
    }
  }

  // Check weather/accidents
  if (Math.random() < route.hazards.weatherRisk) {
    return { success: false, reason: 'weather_damage' };
  }

  // Check political disruption
  if (Math.random() < route.hazards.politicalRisk) {
    return { success: false, reason: 'embargo' };
  }

  // Shipment successful
  return { success: true };
}
```

### Integration with Ship Domain

**Escort Missions:**

```typescript
/**
 * Assign squadron to escort trade route
 * (From 05-SHIP-FLEET-HIERARCHY.md)
 */
function assignEscort(
  route: TradeRouteTier,
  squadronId: string,
  world: World
): void {
  const squadron = getSquadron(squadronId);

  // Update squadron mission
  squadron.mission = {
    type: 'escort',
    escortedTradeAgreementId: route.agreementId,
    status: 'en_route',
  };

  // Update route
  route.hazards.escortSquadronId = squadronId;
  route.hazards.pirateRisk *= 0.2;  // 80% reduction with escort
}
```

**Ship Assignment:**

```typescript
/**
 * Assign ships to route based on cargo needs
 */
function assignShipsToRoute(
  agreement: TradeAgreement,
  world: World
): string[] {
  // Calculate cargo needed
  const cargoVolume = agreement.terms.reduce((sum, term) =>
    sum + calculateItemVolume(term.itemId) * term.quantity, 0
  );

  // Find available ships with capacity
  const availableShips = world.query()
    .with('spaceship')
    .executeEntities()
    .filter(e => {
      const ship = e.getComponent<SpaceshipComponent>('spaceship');
      return ship &&
        ship.ship_type === 'courier_ship' &&
        !ship.currentMission;  // Available
    });

  // Assign ships until capacity met
  const assignedShips: string[] = [];
  let remainingCargo = cargoVolume;

  for (const shipEntity of availableShips) {
    const ship = shipEntity.getComponent<SpaceshipComponent>('spaceship');
    if (!ship) continue;

    assignedShips.push(shipEntity.id);
    remainingCargo -= ship.cargoCapacity ?? 0;

    if (remainingCargo <= 0) break;
  }

  return assignedShips;
}
```

---

## Tier 2: Shipping Lane Level (Major Corridors)

**Scale:** Multiple routes forming a corridor
**Simulation:** Aggregate flow (goods/tick)
**Status:** 🆕 New Tier

### Overview

A shipping lane is a **major trade corridor** connecting multiple settlements in a region. It represents the aggregation of many individual routes.

**Example:**
```
Village A ─┐
Village B ─┼─► SHIPPING LANE ─► City X
Village C ─┘                    (1000 goods/tick)
```

### Existing System: TransportHub (Hierarchy Simulator)

**Location:** `packages/hierarchy-simulator/src/types/economy.ts`

**TransportHub interface (existing):**
```typescript
interface TransportHub {
  id: string;
  type: 'spaceport' | 'warp_gate' | 'dimensional_portal' | 'trade_station';
  position: { x: number; y: number };
  capacity: number;      // Throughput per tick
  connections: string[]; // Connected hub IDs
  operational: boolean;
}
```

**TradeRoute interface (existing, from hierarchy simulator):**
```typescript
interface TradeRoute {
  id: string;
  from: string;  // Address or ID
  to: string;
  resources: Map<string, number>;  // Resource type -> quantity per tick
  type: 'spaceport' | 'portal' | 'warp_gate' | 'physical_route';
  active: boolean;
  efficiency: number;  // 0-1
}
```

### NEW: ShippingLaneTier

**Aggregates multiple TradeRouteTier into a corridor:**

```typescript
/**
 * Shipping Lane - major trade corridor aggregating routes
 * Links to TransportHub at endpoints
 */
interface ShippingLaneTier {
  id: string;
  name: string;  // "Northern Trade Corridor", "Silk Road"

  /**
   * Endpoints (spatial domain)
   */
  endpoints: {
    start: {
      tierId: string;        // Region/City ID
      hubId?: string;        // TransportHub ID (if exists)
      coordinates: Vector3D;
    };
    end: {
      tierId: string;
      hubId?: string;
      coordinates: Vector3D;
    };
  };

  /**
   * Constituent routes (references TradeRouteTier)
   */
  routes: {
    routeIds: string[];      // Individual trade routes using this lane
    totalRoutes: number;     // Count
  };

  /**
   * Aggregate flow (goods/tick)
   */
  flow: {
    byResource: Map<string, number>;  // Resource -> quantity/tick
    totalVolume: number;              // Total goods/tick
    direction: 'bidirectional' | 'one_way';

    // Peak flow tracking
    peakVolume: number;
    peakTick: bigint;
  };

  /**
   * Infrastructure
   */
  infrastructure: {
    roadQuality: number;     // 0-1, affects travel time
    portCapacity: number;    // Max goods/tick (bottleneck)
    warehouseStorage: number;  // Buffer for fluctuations

    // Upgrades
    upgrades: {
      paved_road?: boolean;
      trade_station?: boolean;
      warp_gate?: boolean;
    };
  };

  /**
   * Economics
   */
  economics: {
    totalRevenue: number;    // Sum of all route profits
    taxRevenue: number;      // If lane controlled by political entity
    maintenanceCost: number;

    // Employment
    jobsCreated: number;     // Merchants, sailors, guards
  };

  /**
   * Strategic importance
   */
  strategic: {
    isChokepoint: boolean;   // Multiple routes depend on this
    dependentRegions: string[];  // Regions that would collapse if blocked
    alternativeRoutes: string[]; // Backup shipping lanes

    // Control
    controlledBy?: string;   // Political entity ID
    contested: boolean;      // Multiple factions want control
  };

  /**
   * Hazards (aggregate)
   */
  hazards: {
    avgPirateRisk: number;   // Average across routes
    totalIncidents: number;  // Attacks/disasters this period

    // Security
    patrolStrength: number;  // Naval patrols (0-1)
    fortifications: string[]; // Fort/station IDs
  };

  /**
   * Status
   */
  status: {
    operational: boolean;
    congestion: number;      // 0-1, flow / capacity
    lastMajorIncident?: {
      type: string;
      tick: bigint;
      impact: number;
    };
  };
}
```

### Shipping Lane Mechanics

**1. Lane Formation (Emergent):**

```typescript
/**
 * Detect shipping lanes from route clustering
 */
function detectShippingLanes(
  routes: TradeRouteTier[],
  threshold: number = 5  // Min routes to form lane
): ShippingLaneTier[] {
  const lanes: ShippingLaneTier[] = [];

  // Cluster routes by spatial proximity
  const clusters = clusterRoutesByPath(routes, maxDistance: 100); // km

  for (const cluster of clusters) {
    if (cluster.routes.length < threshold) continue;

    // Aggregate flow
    const aggregateFlow = new Map<string, number>();
    for (const route of cluster.routes) {
      for (const good of route.goods) {
        const current = aggregateFlow.get(good.itemId) ?? 0;
        aggregateFlow.set(good.itemId, current + good.flowRate);
      }
    }

    const totalVolume = Array.from(aggregateFlow.values())
      .reduce((sum, flow) => sum + flow, 0);

    // Create lane
    const lane: ShippingLaneTier = {
      id: `lane_${Date.now()}`,
      name: generateLaneName(cluster.routes),
      endpoints: {
        start: cluster.startRegion,
        end: cluster.endRegion,
      },
      routes: {
        routeIds: cluster.routes.map(r => r.id),
        totalRoutes: cluster.routes.length,
      },
      flow: {
        byResource: aggregateFlow,
        totalVolume,
        direction: detectDirection(cluster.routes),
        peakVolume: totalVolume,
        peakTick: BigInt(world.tick),
      },
      infrastructure: {
        roadQuality: avgRoadQuality(cluster.routes),
        portCapacity: calculatePortCapacity(cluster.routes),
        warehouseStorage: 0,
        upgrades: {},
      },
      economics: {
        totalRevenue: cluster.routes.reduce((sum, r) => sum + r.economics.profit, 0),
        taxRevenue: 0,
        maintenanceCost: cluster.routes.length * 10,  // Per route
        jobsCreated: cluster.routes.length * 5,
      },
      strategic: {
        isChokepoint: detectChokepoint(cluster.routes),
        dependentRegions: findDependentRegions(cluster.routes),
        alternativeRoutes: [],
        contested: false,
      },
      hazards: {
        avgPirateRisk: avgPirateRisk(cluster.routes),
        totalIncidents: 0,
        patrolStrength: 0,
        fortifications: [],
      },
      status: {
        operational: true,
        congestion: totalVolume / calculatePortCapacity(cluster.routes),
        lastMajorIncident: undefined,
      },
    };

    lanes.push(lane);
  }

  return lanes;
}
```

**2. Chokepoint Detection:**

```typescript
/**
 * Identify chokepoints (critical lanes)
 */
function detectChokepoint(routes: TradeRouteTier[]): boolean {
  // A chokepoint is a lane where:
  // 1. Many routes converge
  // 2. Few alternative paths exist

  const routeCount = routes.length;
  const uniqueDestinations = new Set(routes.map(r => r.destination.tierId)).size;

  // If many routes but few destinations = bottleneck
  return routeCount > 10 && uniqueDestinations < 3;
}

/**
 * Find regions that would collapse if lane blocked
 */
function findDependentRegions(routes: TradeRouteTier[]): string[] {
  const dependentRegions: Set<string> = new Set();

  for (const route of routes) {
    // Check if destination relies on this route for critical goods
    const criticalGoods = route.goods.filter(g =>
      isCriticalResource(g.itemId)  // e.g., food, medicine
    );

    if (criticalGoods.length > 0) {
      dependentRegions.add(route.destination.tierId);
    }
  }

  return Array.from(dependentRegions);
}
```

**3. Lane Blockade:**

```typescript
/**
 * Block a shipping lane (war, piracy, natural disaster)
 */
function blockadeLane(
  lane: ShippingLaneTier,
  blockingFleetId: string,
  world: World
): void {
  // Mark lane as blocked
  lane.status.operational = false;
  lane.status.lastMajorIncident = {
    type: 'blockade',
    tick: BigInt(world.tick),
    impact: lane.flow.totalVolume,  // Goods/tick disrupted
  };

  // Disable constituent routes
  for (const routeId of lane.routes.routeIds) {
    const route = getTradeRoute(routeId);
    route.status.active = false;
  }

  // Economic impact on dependent regions
  for (const regionId of lane.strategic.dependentRegions) {
    const region = getSpatialTier(regionId);

    // Reduce resource availability
    applyShortage(region, lane.flow.byResource);

    // Political instability
    if (region.governance) {
      region.governance.stability -= 0.2;  // Major crisis
    }
  }

  // Emit event
  world.eventBus.emit({
    type: 'trade:lane_blockaded',
    data: {
      laneId: lane.id,
      blockingFleetId,
      impactedRegions: lane.strategic.dependentRegions,
    },
  });
}
```

### Integration with TransportHub

**Hub Capacity as Bottleneck:**

```typescript
/**
 * Calculate lane capacity based on hub limits
 */
function calculateLaneCapacity(lane: ShippingLaneTier): number {
  // If lane uses hubs, capacity = min hub capacity
  if (lane.endpoints.start.hubId && lane.endpoints.end.hubId) {
    const startHub = getTransportHub(lane.endpoints.start.hubId);
    const endHub = getTransportHub(lane.endpoints.end.hubId);

    return Math.min(startHub.capacity, endHub.capacity);
  }

  // Otherwise, capacity = port capacity
  return lane.infrastructure.portCapacity;
}
```

**Hub Upgrades:**

```typescript
/**
 * Upgrade hub to increase lane throughput
 */
function upgradeHub(hubId: string, upgradeType: 'expand' | 'automate'): void {
  const hub = getTransportHub(hubId);

  switch (upgradeType) {
    case 'expand':
      hub.capacity *= 1.5;  // 50% more throughput
      break;
    case 'automate':
      // Automated loading = faster turnaround
      hub.capacity *= 1.2;
      hub.type = 'automated_hub';
      break;
  }

  // Update lanes using this hub
  const affectedLanes = findLanesUsingHub(hubId);
  for (const lane of affectedLanes) {
    lane.infrastructure.portCapacity = calculateLaneCapacity(lane);
    lane.status.congestion = lane.flow.totalVolume / lane.infrastructure.portCapacity;
  }
}
```

---

## Tier 3: Trade Network Level (Regional Topology)

**Scale:** All shipping lanes in a region/system
**Simulation:** Graph analysis (flow topology)
**Status:** 🆕 New Tier

### Overview

A trade network is the **complete graph** of trade connections within a spatial tier (planet, system). It enables analysis of network resilience, hub identification, and optimization.

### NEW: TradeNetworkTier

```typescript
/**
 * Trade Network - complete trade graph for a region
 * Analyzes topology, identifies hubs, measures resilience
 */
interface TradeNetworkTier {
  id: string;
  name: string;  // "Sol System Trade Network", "Terran Trade Sphere"

  /**
   * Spatial scope
   */
  scope: {
    spatialTierId: string;   // Planet/System ID
    tier: 'planet' | 'system' | 'sector';
  };

  /**
   * Network topology (graph structure)
   */
  topology: {
    nodes: {
      nodeId: string;        // Settlement/Hub ID
      type: 'settlement' | 'hub' | 'waypoint';
      importance: number;    // 0-1, betweenness centrality
      connections: number;   // Degree (edges)
    }[];

    edges: {
      laneId: string;        // ShippingLaneTier ID
      weight: number;        // Flow volume (goods/tick)
    }[];

    // Graph metrics
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;       // Avg connections per node
    diameter: number;        // Max shortest path length
    clustering: number;      // 0-1, how clustered is network
  };

  /**
   * Hub identification
   */
  hubs: {
    majorHubs: string[];     // Top 10% by betweenness centrality
    minorHubs: string[];
    isolatedNodes: string[]; // Poorly connected
  };

  /**
   * Aggregate flow (total for network)
   */
  flow: {
    totalVolume: number;     // Goods/tick across all lanes
    byResource: Map<string, number>;

    // Flow balance
    imports: Map<string, number>;  // Node ID -> imports
    exports: Map<string, number>;  // Node ID -> exports
    tradeBalance: Map<string, number>;  // exports - imports
  };

  /**
   * Network resilience
   */
  resilience: {
    redundancy: number;      // 0-1, avg alternative paths per route
    criticalNodes: string[]; // Nodes whose removal fragments network
    criticalLanes: string[]; // Lanes whose removal isolates regions

    // Attack scenarios
    randomFailureTolerance: number;  // % nodes can fail before collapse
    targetedAttackTolerance: number; // % hubs can fail before collapse
  };

  /**
   * Economics
   */
  economics: {
    totalGDP: number;        // Sum of all node GDPs
    tradeVolume: number;     // Total value exchanged
    avgTariff: number;       // Average tariff rate

    // Inequality
    giniCoefficient: number; // Wealth distribution (0 = equal, 1 = one node has all)
  };

  /**
   * Political control
   */
  control: {
    dominantFaction?: string;  // Political entity controlling majority
    factionShares: Map<string, number>;  // Faction -> % of nodes controlled
    disputed: boolean;         // Multiple factions contesting
  };

  /**
   * Status
   */
  status: {
    health: number;          // 0-1, operational efficiency
    congestion: number;      // 0-1, avg across all lanes
    disruptions: {
      type: string;
      affectedLanes: string[];
      severity: number;
    }[];
  };
}
```

### Network Analysis

**1. Hub Identification (Betweenness Centrality):**

```typescript
/**
 * Identify major trade hubs using betweenness centrality
 */
function identifyHubs(network: TradeNetworkTier): void {
  const graph = buildGraph(network);

  // Calculate betweenness centrality for each node
  const centrality = new Map<string, number>();

  for (const node of network.topology.nodes) {
    // Betweenness = how many shortest paths pass through this node
    let pathCount = 0;

    // For all pairs of other nodes
    for (const source of network.topology.nodes) {
      if (source.nodeId === node.nodeId) continue;

      for (const target of network.topology.nodes) {
        if (target.nodeId === node.nodeId || target.nodeId === source.nodeId) continue;

        // Find shortest path from source to target
        const path = dijkstra(graph, source.nodeId, target.nodeId);

        // Does it pass through this node?
        if (path.includes(node.nodeId)) {
          pathCount++;
        }
      }
    }

    centrality.set(node.nodeId, pathCount);
    node.importance = pathCount / (network.topology.totalNodes * (network.topology.totalNodes - 1));
  }

  // Sort by centrality
  const sortedNodes = network.topology.nodes.sort((a, b) => b.importance - a.importance);

  // Top 10% are major hubs
  const hubThreshold = Math.ceil(network.topology.totalNodes * 0.1);
  network.hubs.majorHubs = sortedNodes.slice(0, hubThreshold).map(n => n.nodeId);
  network.hubs.minorHubs = sortedNodes.slice(hubThreshold, hubThreshold * 3).map(n => n.nodeId);
  network.hubs.isolatedNodes = sortedNodes.filter(n => n.connections < 2).map(n => n.nodeId);
}
```

**2. Network Resilience Analysis:**

```typescript
/**
 * Measure network resilience to failures
 */
function analyzeResilience(network: TradeNetworkTier): void {
  const graph = buildGraph(network);

  // Critical nodes: removing them fragments network
  const criticalNodes: string[] = [];

  for (const node of network.topology.nodes) {
    // Remove node, check if network fragments
    const subgraph = removeNode(graph, node.nodeId);
    const components = findConnectedComponents(subgraph);

    if (components.length > 1) {
      // Network fragmented
      criticalNodes.push(node.nodeId);
    }
  }

  network.resilience.criticalNodes = criticalNodes;

  // Critical lanes
  const criticalLanes: string[] = [];

  for (const edge of network.topology.edges) {
    const subgraph = removeEdge(graph, edge.laneId);
    const components = findConnectedComponents(subgraph);

    if (components.length > 1) {
      criticalLanes.push(edge.laneId);
    }
  }

  network.resilience.criticalLanes = criticalLanes;

  // Random failure tolerance (simulate node removals)
  let failureCount = 0;
  const maxFailures = Math.floor(network.topology.totalNodes * 0.5);

  for (let i = 0; i < maxFailures; i++) {
    const randomNode = network.topology.nodes[Math.floor(Math.random() * network.topology.totalNodes)];
    const subgraph = removeNode(graph, randomNode.nodeId);
    const components = findConnectedComponents(subgraph);

    if (components.length > 1) {
      // Network collapsed
      break;
    }
    failureCount++;
  }

  network.resilience.randomFailureTolerance = failureCount / network.topology.totalNodes;

  // Targeted attack tolerance (remove hubs first)
  let attackCount = 0;
  const hubs = [...network.hubs.majorHubs];

  for (const hubId of hubs) {
    const subgraph = removeNode(graph, hubId);
    const components = findConnectedComponents(subgraph);

    if (components.length > 1) {
      break;
    }
    attackCount++;
  }

  network.resilience.targetedAttackTolerance = attackCount / hubs.length;
}
```

**3. Trade Balance Analysis:**

```typescript
/**
 * Calculate trade balance for each node
 */
function calculateTradeBalance(network: TradeNetworkTier): void {
  const imports = new Map<string, number>();
  const exports = new Map<string, number>();

  for (const edge of network.topology.edges) {
    const lane = getShippingLane(edge.laneId);

    // Get flow direction
    const fromNode = lane.endpoints.start.tierId;
    const toNode = lane.endpoints.end.tierId;

    // Sum flow by resource
    for (const [resource, flow] of lane.flow.byResource) {
      // Exports from source
      const currentExports = exports.get(fromNode) ?? 0;
      exports.set(fromNode, currentExports + flow);

      // Imports to destination
      const currentImports = imports.get(toNode) ?? 0;
      imports.set(toNode, currentImports + flow);
    }
  }

  network.flow.imports = imports;
  network.flow.exports = exports;

  // Calculate balance
  const tradeBalance = new Map<string, number>();
  for (const nodeId of network.topology.nodes.map(n => n.nodeId)) {
    const exp = exports.get(nodeId) ?? 0;
    const imp = imports.get(nodeId) ?? 0;
    tradeBalance.set(nodeId, exp - imp);
  }

  network.flow.tradeBalance = tradeBalance;
}
```

### Network Optimization

**Identify Bottlenecks:**

```typescript
/**
 * Find congested lanes that need capacity upgrades
 */
function identifyBottlenecks(network: TradeNetworkTier): string[] {
  const bottlenecks: string[] = [];

  for (const edge of network.topology.edges) {
    const lane = getShippingLane(edge.laneId);

    // Check congestion
    if (lane.status.congestion > 0.8) {
      bottlenecks.push(lane.id);
    }
  }

  return bottlenecks;
}
```

**Suggest New Routes:**

```typescript
/**
 * Suggest new shipping lanes to improve network
 */
function suggestNewRoutes(network: TradeNetworkTier): Array<{
  from: string;
  to: string;
  benefit: number;
}> {
  const suggestions: Array<{ from: string; to: string; benefit: number }> = [];

  // Find pairs of nodes with high trade volume but no direct connection
  for (const node1 of network.topology.nodes) {
    for (const node2 of network.topology.nodes) {
      if (node1.nodeId === node2.nodeId) continue;

      // Check if direct edge exists
      const directEdge = network.topology.edges.find(e => {
        const lane = getShippingLane(e.laneId);
        return (
          lane.endpoints.start.tierId === node1.nodeId &&
          lane.endpoints.end.tierId === node2.nodeId
        );
      });

      if (directEdge) continue;  // Already connected

      // Calculate potential trade volume
      const potentialVolume = estimatePotentialTrade(node1, node2, network);

      if (potentialVolume > 100) {  // Threshold
        suggestions.push({
          from: node1.nodeId,
          to: node2.nodeId,
          benefit: potentialVolume,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.benefit - a.benefit);
}
```

---

## Tier 4: Trade Federation Level (Multi-System)

**Scale:** Galaxy-wide economic bloc
**Simulation:** Strategic (standards, currency, policy)
**Status:** 🆕 New Tier

### Overview

A trade federation is a **galactic-scale economic alliance** that standardizes trade practices, enforces rules, and coordinates multi-system logistics.

**Examples:**
- "Terran Trade League" (human systems)
- "Galactic Commerce Authority" (multi-species)
- "Free Traders Consortium" (independent merchants)

### NEW: TradeFederationTier

```typescript
/**
 * Trade Federation - galactic economic alliance
 * Standardizes currency, laws, tariffs across systems
 */
interface TradeFederationTier {
  id: string;
  name: string;

  /**
   * Member entities (political domain)
   */
  members: {
    factionIds: string[];    // Political entities (nations, empires)
    totalMembers: number;
    founderIds: string[];    // Original members

    // Membership status
    fullMembers: string[];
    associateMembers: string[];  // Limited participation
    pendingApplications: string[];
  };

  /**
   * Territory (spatial domain)
   */
  territory: {
    controlledSystems: string[];  // Star system IDs
    totalSystems: number;
    totalPopulation: number;
    territoryArea: number;  // km²
  };

  /**
   * Trade networks (references TradeNetworkTier)
   */
  networks: {
    networkIds: string[];    // Member networks
    totalLanes: number;
    totalFlow: number;       // Goods/tick across federation
  };

  /**
   * Universal standards
   */
  standards: {
    // Currency
    commonCurrency: {
      name: string;          // "Galactic Credit", "Terran Dollar"
      symbol: string;        // "₡", "$"
      exchangeRates: Map<string, number>;  // Local currency -> federation rate
    };

    // Regulations
    regulations: {
      tariffRate: number;    // Standard tariff (0-1)
      bannedGoods: string[]; // Prohibited items
      inspectionRules: InspectionPolicy;

      // Labor standards
      minWage?: number;
      maxWorkHours?: number;
    };

    // Technical standards
    technical: {
      containerSizes: number[];  // Standard cargo containers
      shipCertification: string[]; // Required ship standards
      portProtocols: string[];     // Standardized docking procedures
    };
  };

  /**
   * Institutions
   */
  institutions: {
    // Central bank
    centralBank?: {
      reserves: number;      // Currency reserves
      interestRate: number;  // Lending rate
      inflationTarget: number;
    };

    // Regulatory bodies
    tradeCommission: {
      inspectors: number;
      enforcementBudget: number;
      violationCount: number;
    };

    // Dispute resolution
    arbitrationCourt: {
      cases: DisputeCase[];
      rulings: Ruling[];
    };
  };

  /**
   * Economic metrics
   */
  economics: {
    combinedGDP: number;     // Sum of member GDPs
    totalTradeVolume: number;
    growthRate: number;      // Annual GDP growth

    // Inequality
    giniCoefficient: number;
    richestMember: string;
    poorestMember: string;
  };

  /**
   * Military protection
   */
  security: {
    navyContributions: Map<string, number>;  // Member -> ships contributed
    totalNavyShips: number;

    // Anti-piracy
    pirateIncidents: number;
    patrolCoverage: number;  // 0-1, % of lanes patrolled

    // Blockade enforcement
    sanctionedFactions: string[];
    embargoedSystems: string[];
  };

  /**
   * Governance
   */
  governance: {
    governanceType: 'council' | 'democratic' | 'hegemonic';

    // Voting
    votingRules: {
      method: 'one_nation_one_vote' | 'weighted_by_gdp' | 'weighted_by_population';
      passingThreshold: number;  // e.g., 0.5 for majority
    };

    // Leadership
    chairperson?: string;    // Faction ID
    termLength: number;      // Ticks
    nextElection: bigint;
  };

  /**
   * Status
   */
  status: {
    cohesion: number;        // 0-1, how unified members are
    stability: number;       // 0-1, risk of dissolution

    // Crises
    activeCrises: {
      type: 'trade_war' | 'defection' | 'external_threat';
      severity: number;
      tick: bigint;
    }[];
  };
}
```

### Federation Mechanics

**1. Currency Standardization:**

```typescript
/**
 * Convert local currency to federation standard
 */
function convertCurrency(
  amount: number,
  fromCurrency: string,
  federation: TradeFederationTier
): number {
  const rate = federation.standards.commonCurrency.exchangeRates.get(fromCurrency);

  if (!rate) {
    throw new Error(`Currency ${fromCurrency} not recognized by federation`);
  }

  return amount * rate;
}

/**
 * Handle cross-border trade payment
 */
function processFederationPayment(
  buyer: string,
  seller: string,
  amount: number,
  localCurrency: string,
  federation: TradeFederationTier
): void {
  // Convert to federation currency
  const federationAmount = convertCurrency(amount, localCurrency, federation);

  // Apply tariff
  const tariff = federationAmount * federation.standards.regulations.tariffRate;
  const netAmount = federationAmount - tariff;

  // Transfer funds
  deductCurrency(buyer, federationAmount, localCurrency);
  addCurrency(seller, netAmount, federation.standards.commonCurrency.name);

  // Collect tariff for federation treasury
  addCurrency(federation.id, tariff, federation.standards.commonCurrency.name);
}
```

**2. Tariff Policy:**

```typescript
/**
 * Set federation tariff rate
 */
function setTariffRate(
  federation: TradeFederationTier,
  newRate: number,
  proposedBy: string
): { approved: boolean; reason?: string } {
  // Check if proposer is member
  if (!federation.members.fullMembers.includes(proposedBy)) {
    return { approved: false, reason: 'Not a full member' };
  }

  // Vote on tariff change
  const votes = conductVote(federation, {
    proposal: `Set tariff to ${newRate * 100}%`,
    proposedBy,
  });

  if (votes.passRate >= federation.governance.votingRules.passingThreshold) {
    // Approved
    federation.standards.regulations.tariffRate = newRate;

    // Emit event
    world.eventBus.emit({
      type: 'trade:tariff_changed',
      data: {
        federationId: federation.id,
        oldRate: federation.standards.regulations.tariffRate,
        newRate,
      },
    });

    return { approved: true };
  } else {
    return { approved: false, reason: 'Failed to reach threshold' };
  }
}
```

**3. Embargo Enforcement:**

```typescript
/**
 * Enforce embargo on system
 */
function enforceEmbargo(
  federation: TradeFederationTier,
  targetSystemId: string,
  navyFleetId: string,
  world: World
): void {
  // Add to embargoed list
  federation.security.embargoedSystems.push(targetSystemId);

  // Block all shipping lanes to/from target
  const networks = federation.networks.networkIds.map(id => getTradeNetwork(id));

  for (const network of networks) {
    for (const edge of network.topology.edges) {
      const lane = getShippingLane(edge.laneId);

      // Check if lane connects to embargoed system
      if (
        lane.endpoints.start.tierId === targetSystemId ||
        lane.endpoints.end.tierId === targetSystemId
      ) {
        // Blockade lane
        blockadeLane(lane, navyFleetId, world);
      }
    }
  }

  // Economic impact on target
  const targetSystem = getSpatialTier(targetSystemId);
  if (targetSystem.economy) {
    targetSystem.economy.GDP *= 0.3;  // 70% GDP loss from embargo
  }
}
```

**4. Trade Dispute Resolution:**

```typescript
/**
 * Arbitrate trade dispute between members
 */
function arbitrateDispute(
  federation: TradeFederationTier,
  plaintiff: string,
  defendant: string,
  disputeDetails: string
): Ruling {
  // Create case
  const disputeCase: DisputeCase = {
    id: `case_${Date.now()}`,
    plaintiff,
    defendant,
    details: disputeDetails,
    filedAt: BigInt(world.tick),
  };

  federation.institutions.arbitrationCourt.cases.push(disputeCase);

  // Simplified ruling (in practice, LLM would analyze)
  const ruling: Ruling = {
    caseId: disputeCase.id,
    decision: 'plaintiff',  // or 'defendant'
    damages: 100000,        // Compensation
    explanation: 'Defendant violated trade agreement terms',
  };

  federation.institutions.arbitrationCourt.rulings.push(ruling);

  // Enforce ruling
  if (ruling.decision === 'plaintiff') {
    transferCurrency(defendant, plaintiff, ruling.damages, federation.standards.commonCurrency.name);
  }

  return ruling;
}
```

### Federation Stability

**1. Cohesion Tracking:**

```typescript
/**
 * Calculate federation cohesion (unity)
 */
function calculateCohesion(federation: TradeFederationTier): number {
  // Factors affecting cohesion:
  // 1. Trade volume between members (higher = more cohesion)
  const avgTradeVolume = federation.economics.totalTradeVolume / federation.members.totalMembers;
  const tradeScore = Math.min(1, avgTradeVolume / 10000);

  // 2. Economic inequality (higher = less cohesion)
  const inequalityScore = 1 - federation.economics.giniCoefficient;

  // 3. Recent disputes (more = less cohesion)
  const recentDisputes = federation.institutions.arbitrationCourt.cases.filter(c =>
    Number(BigInt(world.tick) - c.filedAt) < 1000
  ).length;
  const disputeScore = Math.max(0, 1 - recentDisputes * 0.1);

  // 4. External threats (unifies members)
  const threatScore = federation.security.pirateIncidents > 10 ? 1.2 : 1.0;

  // Weighted average
  const cohesion = (
    tradeScore * 0.4 +
    inequalityScore * 0.3 +
    disputeScore * 0.3
  ) * threatScore;

  return Math.min(1, cohesion);
}
```

**2. Defection Risk:**

```typescript
/**
 * Check if member is likely to defect
 */
function assessDefectionRisk(
  federation: TradeFederationTier,
  memberId: string
): { risk: number; reasons: string[] } {
  const reasons: string[] = [];
  let risk = 0;

  // Low cohesion
  if (federation.status.cohesion < 0.5) {
    risk += 0.3;
    reasons.push('Low federation cohesion');
  }

  // Member is poor (wants to set own tariffs)
  const memberGDP = getMemberGDP(memberId);
  if (memberGDP < federation.economics.combinedGDP * 0.05) {
    risk += 0.2;
    reasons.push('Economic disadvantage');
  }

  // Member has alternative trade partners
  const externalTrade = calculateExternalTrade(memberId, federation);
  if (externalTrade > memberGDP * 0.3) {
    risk += 0.3;
    reasons.push('Strong external trade ties');
  }

  // Recent disputes
  const disputes = federation.institutions.arbitrationCourt.cases.filter(c =>
    c.plaintiff === memberId || c.defendant === memberId
  );
  if (disputes.length > 5) {
    risk += 0.2;
    reasons.push('Frequent trade disputes');
  }

  return { risk: Math.min(1, risk), reasons };
}
```

**3. Federation Dissolution:**

```typescript
/**
 * Handle federation collapse
 */
function dissolveFederation(
  federation: TradeFederationTier,
  world: World
): void {
  // Revert to local currencies
  for (const memberId of federation.members.fullMembers) {
    const member = getPoliticalEntity(memberId);

    // Restore local currency
    const localCurrency = member.economy?.currency ?? 'local_coin';

    // Convert federation holdings back
    const holdings = getCurrencyHoldings(memberId, federation.standards.commonCurrency.name);
    const rate = federation.standards.commonCurrency.exchangeRates.get(localCurrency) ?? 1;
    const localAmount = holdings / rate;

    setCurrencyHoldings(memberId, localCurrency, localAmount);
  }

  // Dissolve institutions
  federation.institutions.centralBank = undefined;

  // Emit event
  world.eventBus.emit({
    type: 'trade:federation_dissolved',
    data: {
      federationId: federation.id,
      formerMembers: federation.members.fullMembers,
    },
  });

  // Mark inactive
  federation.status.stability = 0;
}
```

---

## Tier 5: Inter-Universe Trade (Cross-Timeline Commerce)

**Scale:** Trade between forked timelines or separate universes
**Simulation:** Passage-based routing, escrow, Hilbert-time causal ordering
**Status:** 🆕 New Tier (integrates with TradeAgreementSystem cross-universe scopes)

### Overview

Inter-universe trade extends the trade hierarchy beyond a single universe. This tier integrates with:

1. **TradeAgreementSystem** - existing cross_timeline, cross_universe, cross_multiverse scopes
2. **PassageSystem** - threads, bridges, gates, confluences for inter-universe travel
3. **HilbertTime** - causal ordering for async cross-universe trades
4. **Multiverse Mechanics** - from 10-MULTIVERSE-MECHANICS.md

**Key Insight:** Inter-universe trade requires **physical travel** through passages - it's not teleportation. This means trade routes must account for:
- Passage stability and traversal cost
- Ship type requirements (some passages require specific ships)
- Causal violations (trades arriving "before" they were sent)
- Trust levels between universes (escrow requirements)

### Travel Progression Prerequisites

**CRITICAL:** Inter-universe trade is gated by technology progression:

```typescript
/**
 * Travel progression requirements
 * Inter-universe travel requires mastering earlier stages
 */
const TRAVEL_PROGRESSION = {
  // Stage 1: Multi-Planet (within solar system)
  interplanetary: {
    requiredTech: ['basic_propulsion', 'worldship_design'],
    requiredShips: ['worldship'],  // Generation ships, no FTL
    unlocksResources: [
      // Resources found on other planets in home system
      'stellarite_ore',      // Asteroid belts, moons
      'neutronium_shard',    // Gas giant moons, dense planets
      'raw_crystal',         // Crystal planets, geodes
    ],
  },

  // Stage 2: Multi-Star (interstellar travel)
  interstellar: {
    requiredTech: ['emotional_topology', 'heart_chamber_theory', 'beta_navigation'],
    requiredShips: ['threshold_ship', 'courier_ship', 'brainship'],
    prerequisites: ['interplanetary'],  // Must master multi-planet first
    unlocksResources: [
      // Resources ONLY found in other star systems
      'void_essence',        // Near black holes, void rifts
      'temporal_dust',       // Temporal anomalies, pulsars
      'exotic_matter',       // Neutron stars, magnetars
      'quantum_foam',        // Spacetime distortions
    ],
  },

  // Stage 3: Multi-Universe (inter-universe travel)
  multiversal: {
    requiredTech: ['probability_theory', 'timeline_mechanics', 'passage_navigation'],
    requiredShips: ['probability_scout', 'timeline_merger', 'svetz_retrieval'],
    prerequisites: ['interstellar'],  // Must master multi-star first
    unlocksResources: [
      // Resources ONLY found via inter-universe travel
      'probability_crystal',  // Collapsed alternate timelines
      'causal_thread',        // Canon event remnants
      'timeline_fragment',    // From extinct universes
      'multiverse_anchor',    // Stabilizes passage connections
    ],
  },
};
```

**Why This Progression Matters:**

1. **Worldships first:** Can't skip to FTL without building generation ships
2. **Interstellar gating:** Key inter-universe resources (void_essence, temporal_dust) spawn ONLY in other star systems
3. **No shortcuts:** You can't build a probability_scout without stellarite (other planets) + void_essence (other stars)

### Resource Spawn Locations (Magic-Conditional)

**CRITICAL:** Resource spawning depends on universe magic configuration from `MagicSpectrumConfig`. Non-magical universes use scientific alternatives.

```typescript
/**
 * Check universe magic config before spawning resources
 * Integration with packages/renderer/src/UniverseConfigScreen.ts
 */
function getAvailableResources(
  location: 'home_planet' | 'system_planets' | 'other_stars',
  magicConfig: MagicSpectrumConfig
): string[] {
  const hasMagic = magicConfig.intensity !== 'none';
  const hasAnimism = magicConfig.animism !== 'none';
  const hasEmotionalMagic = magicConfig.sources.includes('internal');

  // Scientific resources always available
  const scientific = SCIENTIFIC_RESOURCES[location];

  // Magical resources only if magic enabled
  const magical = hasMagic ? MAGICAL_RESOURCES[location] : [];

  // Animist resources only if animism enabled
  const animist = hasAnimism ? ANIMIST_RESOURCES[location] : [];

  // Emotional resources only if internal magic source
  const emotional = hasEmotionalMagic ? EMOTIONAL_RESOURCES[location] : [];

  return [...scientific, ...magical, ...animist, ...emotional];
}
```

**Scientific Resources** (always available, all universes):
```typescript
const SCIENTIFIC_RESOURCES = {
  home_planet: [
    'iron_ore', 'copper_ore', 'silicon_sand', 'coal',
    'gold_ore', 'silver_ore', 'rare_earth_ore', 'uranium_ore',
  ],

  system_planets: [
    'metallic_hydrogen',    // Gas giant cores, superconductor
    'platinum_iridium',     // Asteroid belts, precious metals
    'helium_3',             // Lunar regolith, fusion fuel
    'magnetic_monopoles',   // Trapped in asteroids (theoretical)
    'deuterium',            // Gas giants, fusion fuel
  ],

  other_stars: [
    'strange_matter',       // Neutron star surfaces (strangelets)
    'degenerate_matter',    // White dwarf material
    'frame_dragging_residue', // Near spinning black holes
    'quantum_vacuum_energy',  // Casimir effect harvesting
    'primordial_antimatter',  // Trapped in cosmic voids
  ],
};
```

**Magical Resources** (only if `intensity !== 'none'`):
```typescript
const MAGICAL_RESOURCES = {
  home_planet: [
    'mana_shard',           // Ley line nodes
    'arcane_crystal',       // Magical deposits
    'enchanted_ore',        // Magically infused metals
  ],

  system_planets: [
    'void_crystal',         // Magical moon formations
    'stellar_essence',      // Star-infused materials (NOT stellarite)
    'cosmic_mana',          // Concentrated space magic
  ],

  other_stars: [
    'primordial_mana',      // From universe creation
    'reality_fragment',     // Unstable spacetime magic
    'dimensional_anchor',   // Cross-dimensional stability
  ],
};
```

**Animist Resources** (only if `animism !== 'none'`):
```typescript
const ANIMIST_RESOURCES = {
  home_planet: [
    'spirit_stone',         // Contains minor spirits
    'kami_crystal',         // Shinto spirit housing
    'elemental_core',       // Bound elemental essence
  ],

  system_planets: [
    'planetary_spirit_shard', // From planet kami
    'void_spirit_essence',    // Space spirits
  ],

  other_stars: [
    'stellar_kami_fragment',  // Star spirits
    'cosmic_spirit_anchor',   // Great spirits of the void
  ],
};
```

**Emotional Resources** (only if `sources.includes('internal')`):
```typescript
const EMOTIONAL_RESOURCES = {
  home_planet: [
    'emotional_resonance',  // From emotional events
    'memory_crystal',       // Crystallized memories
    'soul_fragment',        // From death/rebirth
  ],

  system_planets: [
    'longing_essence',      // From generation ship crews
    'wonder_crystal',       // First contact emotions
  ],

  other_stars: [
    'awe_condensate',       // Encountering cosmic phenomena
    'terror_fragment',      // Near black holes
  ],
};
```

### Planet Type Spawning (Magic-Conditional)

**Fantasy planet types only spawn if magic is enabled:**

```typescript
/**
 * Determine which planet types can spawn in this universe
 * Based on MagicSpectrumConfig
 */
function getSpawnablePlanetTypes(magicConfig: MagicSpectrumConfig): PlanetType[] {
  // Scientific planets always available
  const scientific: PlanetType[] = [
    'terrestrial', 'super_earth', 'desert', 'ice', 'ocean',
    'volcanic', 'carbon', 'iron', 'tidally_locked', 'hycean',
    'rogue', 'gas_dwarf', 'moon',
  ];

  // Fantasy planets only if magic enabled
  if (magicConfig.intensity === 'none') {
    return scientific;
  }

  const fantasy: PlanetType[] = [];

  // Magical planets require moderate+ magic
  if (['moderate', 'high', 'extreme'].includes(magicConfig.intensity)) {
    fantasy.push('magical');
  }

  // Corrupted planets require certain paradigms
  if (magicConfig.sources.includes('daemonic') ||
      magicConfig.sources.includes('dark')) {
    fantasy.push('corrupted');
  }

  // Fungal planets - always available if any magic (alien biosphere)
  if (magicConfig.intensity !== 'none') {
    fantasy.push('fungal');
  }

  // Crystal planets - could be scientific OR magical
  // Always available (silicon-based life is scientifically plausible)
  fantasy.push('crystal');

  return [...scientific, ...fantasy];
}
```

### Ship Construction: Magic vs Science Paths

**β-Space ships require emotional magic OR scientific alternatives:**

```typescript
/**
 * Ship construction paths based on magic config
 */
const SHIP_CONSTRUCTION_PATHS = {
  // β-space ships have TWO paths
  threshold_ship: {
    magical_path: {
      requires: ['emotional_resonance', 'mana_shard', 'stellar_essence'],
      description: 'Heart chamber resonates with emotional magic',
      magicRequired: { sources: ['internal'] },
    },
    scientific_path: {
      requires: ['quantum_vacuum_energy', 'magnetic_monopoles', 'strange_matter'],
      description: 'Quantum tunneling through compressed spacetime',
      magicRequired: null,  // Works in mundane universes
    },
  },

  probability_scout: {
    magical_path: {
      requires: ['reality_fragment', 'dimensional_anchor', 'primordial_mana'],
      description: 'Magical observation collapses probability',
      magicRequired: { intensity: 'high' },
    },
    scientific_path: {
      requires: ['quantum_vacuum_energy', 'primordial_antimatter', 'frame_dragging_residue'],
      description: 'Quantum measurement of alternate timelines',
      magicRequired: null,
    },
  },
};

/**
 * Get available construction path for ship type
 */
function getShipConstructionPath(
  shipType: string,
  magicConfig: MagicSpectrumConfig
): 'magical' | 'scientific' {
  const paths = SHIP_CONSTRUCTION_PATHS[shipType];
  if (!paths) throw new Error(`Unknown ship type: ${shipType}`);

  // Check if magical path available
  const magicalReqs = paths.magical_path.magicRequired;
  const hasMagicalPath = magicalReqs === null ||
    (magicalReqs.intensity && ['moderate', 'high', 'extreme'].includes(magicConfig.intensity)) ||
    (magicalReqs.sources && magicalReqs.sources.every(s => magicConfig.sources.includes(s)));

  // Prefer magical if available (more flavorful)
  return hasMagicalPath ? 'magical' : 'scientific';
}
```

**Planetary Resources** (available on home planet or solar system):
```typescript
const PLANETARY_RESOURCES = {
  // Home planet (combined scientific + conditional magical)
  home_planet: [
    // Scientific (always)
    'iron_ore', 'copper_ore', 'silicon_sand', 'coal', 'rare_earth_ore',
    // Magical (conditional) - checked at runtime
    // 'mana_shard', 'emotional_resonance', etc.
  ],

  // Other planets in home solar system
  system_planets: [
    // Scientific (always)
    'metallic_hydrogen',  // Gas giant cores
    'platinum_iridium',   // Asteroid belts
    'helium_3',           // Gas giant atmospheres
    'magnetic_monopoles', // Trapped in asteroids
    // Magical (conditional)
    // 'stellar_essence', etc.
  ],
};
```

**Interstellar Resources** (require travel to other star systems):
```typescript
const INTERSTELLAR_RESOURCES = {
  // Only found near exotic stellar phenomena
  black_holes: ['void_essence', 'event_horizon_matter'],
  pulsars: ['temporal_dust', 'radiation_crystal'],
  neutron_stars: ['exotic_matter', 'degenerate_metal'],
  white_dwarfs: ['crystallized_carbon', 'stellar_diamond'],
  nebulae: ['quantum_foam', 'proto_matter'],
  binary_systems: ['gravitational_lens', 'orbital_resonance'],
};
```

**Multiversal Resources** (require inter-universe travel):
```typescript
const MULTIVERSAL_RESOURCES = {
  // From alternate timelines
  collapsed_timelines: ['probability_crystal', 'unrealized_potential'],
  extinct_universes: ['timeline_fragment', 'final_moment_echo'],
  canon_events: ['causal_thread', 'destiny_weave'],
  passage_nexuses: ['multiverse_anchor', 'confluence_stabilizer'],
};
```

### Inter-Universe Trade Route Tier

```typescript
/**
 * Trade route that crosses universe boundaries
 * Extends TradeRouteTier with passage and causal metadata
 */
interface InterUniverseTradeRoute extends TradeRouteTier {
  /**
   * Universe endpoints
   */
  sourceUniverse: {
    universeId: string;
    universeName: string;
    spatialTierId: string;  // Settlement within universe
  };

  targetUniverse: {
    universeId: string;
    universeName: string;
    spatialTierId: string;
  };

  /**
   * Passage used for transport
   * (From 10-MULTIVERSE-MECHANICS.md PassageExtended)
   */
  passage: {
    passageId: string;
    passageType: 'thread' | 'bridge' | 'gate' | 'confluence';
    stability: number;           // 0-1, unstable = higher risk
    traversalCost: {
      energyCost: number;        // Energy to traverse
      timeCost: number;          // Ticks to traverse
      riskFactor: number;        // Chance of failure
    };
    restrictions: {
      requiresShip: boolean;     // Threads require ships
      minimumCoherence: number;  // Ship emotional coherence
      allowedShipTypes: SpaceshipType[];
    };
  };

  /**
   * Trade scope (from TradeAgreementSystem)
   */
  scope: 'cross_timeline' | 'cross_universe' | 'cross_multiverse';

  /**
   * Hilbert-Time coordination
   */
  causal: {
    senderTime: HilbertTimeCoordinate;
    expectedArrivalTime: HilbertTimeCoordinate;
    causalParents: CausalReference[];

    // Violation handling
    violationRisk: number;      // Probability of causal violation
    violationPolicy: 'fork' | 'queue' | 'reject';
  };

  /**
   * Trust and escrow
   */
  trust: {
    trustLevel: 'untrusted' | 'new' | 'established' | 'trusted';
    escrowRequired: boolean;
    escrowEntities: string[];   // Items held in escrow
    successfulTrades: number;
    failedTrades: number;
  };

  /**
   * Contamination tracking
   */
  contamination: {
    contaminationLevel: number;  // 0-1, timeline incompatibility
    quarantineRequired: boolean;
    decontaminationCost: number;
  };
}
```

### Creating Inter-Universe Trade Routes

```typescript
/**
 * Establish trade route between two universes
 */
function createInterUniverseTradeRoute(
  agreement: TradeAgreement,
  passageId: string,
  world: World
): InterUniverseTradeRoute | null {
  // Validate scope
  if (!['cross_timeline', 'cross_universe', 'cross_multiverse'].includes(agreement.scope)) {
    throw new Error(`Invalid scope for inter-universe trade: ${agreement.scope}`);
  }

  // Get passage
  const passage = getPassage(passageId);
  if (!passage || !passage.active) {
    throw new Error(`Passage ${passageId} is not active`);
  }

  // Validate ship requirements
  if (passage.metadata.restrictions.requiresShip) {
    const availableShips = findShipsWithCoherence(
      passage.metadata.restrictions.minimumCoherence,
      passage.metadata.restrictions.allowedShipTypes,
      world
    );

    if (availableShips.length === 0) {
      console.warn(`No ships available meeting passage requirements`);
      return null;
    }
  }

  // Determine trust level and escrow
  const trustLevel = determineInitialTrust(
    agreement.parties[0],
    agreement.parties[1],
    agreement.scope
  );

  const escrowRequired = trustLevel === 'untrusted' || trustLevel === 'new';
  const escrowAmount = escrowRequired
    ? calculateEscrowRequirement(agreement.terms, agreement.scope)
    : 0;

  // Calculate causal risk
  const senderTime = getCurrentHilbertTime(agreement.parties[0].universeId);
  const causalRisk = calculateCausalViolationRisk(
    senderTime,
    passage.targetUniverseId
  );

  // Calculate contamination
  const contamination = calculateContamination(
    agreement.parties[0].universeId,
    agreement.parties[1].universeId
  );

  // Build route
  const route: InterUniverseTradeRoute = {
    // Base TradeRouteTier fields
    id: `iu_route_${agreement.id}`,
    agreementId: agreement.id,
    origin: {
      tierId: agreement.parties[0].spatialTierId,
      name: agreement.parties[0].name,
      coordinates: getCoordinates(agreement.parties[0].spatialTierId),
    },
    destination: {
      tierId: agreement.parties[1].spatialTierId,
      name: agreement.parties[1].name,
      coordinates: getCoordinates(agreement.parties[1].spatialTierId),
    },
    distance: calculateInterUniverseDistance(passage),
    travelTime: passage.metadata.traversalCost.timeCost,
    goods: convertTermsToGoods(agreement.terms),
    transport: {
      method: 'portal',
      passageId: passage.id,
    },
    economics: calculateInterUniverseEconomics(agreement, passage),
    hazards: {
      pirateRisk: 0.05,  // Lower in passages
      weatherRisk: 0,
      politicalRisk: agreement.scope === 'cross_multiverse' ? 0.3 : 0.1,
      insuranceCost: calculateInsuranceCost(agreement, passage),
    },
    status: {
      active: true,
      lastShipmentTick: BigInt(world.tick),
      shipmentsCompleted: 0,
      shipmentsLost: 0,
      reliability: 1.0,
    },

    // Inter-universe specific
    sourceUniverse: {
      universeId: agreement.parties[0].universeId,
      universeName: getUniverseName(agreement.parties[0].universeId),
      spatialTierId: agreement.parties[0].spatialTierId,
    },
    targetUniverse: {
      universeId: agreement.parties[1].universeId,
      universeName: getUniverseName(agreement.parties[1].universeId),
      spatialTierId: agreement.parties[1].spatialTierId,
    },
    passage: {
      passageId: passage.id,
      passageType: passage.type,
      stability: passage.metadata.stability,
      traversalCost: passage.metadata.traversalCost,
      restrictions: passage.metadata.restrictions,
    },
    scope: agreement.scope as 'cross_timeline' | 'cross_universe' | 'cross_multiverse',
    causal: {
      senderTime,
      expectedArrivalTime: calculateArrivalTime(senderTime, passage),
      causalParents: senderTime.causalParents,
      violationRisk: causalRisk,
      violationPolicy: causalRisk > 0.3 ? 'fork' : 'queue',
    },
    trust: {
      trustLevel,
      escrowRequired,
      escrowEntities: [],
      successfulTrades: 0,
      failedTrades: 0,
    },
    contamination: {
      contaminationLevel: contamination,
      quarantineRequired: contamination > 0.5,
      decontaminationCost: contamination * 1000,
    },
  };

  return route;
}
```

### Inter-Universe Trade Execution

```typescript
/**
 * Execute inter-universe trade shipment
 */
function executeInterUniverseShipment(
  route: InterUniverseTradeRoute,
  world: World
): { success: boolean; reason?: string; fork?: UniverseSnapshot } {
  // Check passage stability
  if (route.passage.stability < 0.2) {
    return { success: false, reason: 'passage_collapsed' };
  }

  // Check ship availability (if required)
  if (route.passage.restrictions.requiresShip) {
    const ship = findAvailableShip(
      route.passage.restrictions.allowedShipTypes,
      route.passage.restrictions.minimumCoherence,
      world
    );

    if (!ship) {
      return { success: false, reason: 'no_ship_available' };
    }

    // Load cargo onto ship
    loadCargoOntoShip(ship, route.goods, world);
  }

  // Check for causal violation
  const currentTime = getCurrentHilbertTime(route.sourceUniverse.universeId);
  const violation = checkCausalViolation(currentTime, route.causal.expectedArrivalTime);

  if (violation) {
    if (route.causal.violationPolicy === 'fork') {
      // Fork target universe to resolve causality
      const fork = forkUniverseAtViolation(route.targetUniverse.universeId, violation);
      return {
        success: true,
        reason: 'causal_fork_created',
        fork,
      };
    } else if (route.causal.violationPolicy === 'queue') {
      // Queue shipment until causally valid
      queueShipment(route, violation.validFromTick);
      return { success: false, reason: 'queued_for_causality' };
    } else {
      return { success: false, reason: 'causal_violation_rejected' };
    }
  }

  // Process escrow
  if (route.trust.escrowRequired) {
    const escrowSuccess = processEscrow(route, world);
    if (!escrowSuccess) {
      return { success: false, reason: 'escrow_failed' };
    }
  }

  // Traverse passage
  const traversalSuccess = traversePassage(route, world);
  if (!traversalSuccess) {
    route.status.shipmentsLost++;
    route.trust.failedTrades++;
    return { success: false, reason: 'passage_traversal_failed' };
  }

  // Deliver goods
  deliverInterUniverseGoods(route, world);

  // Update statistics
  route.status.shipmentsCompleted++;
  route.trust.successfulTrades++;
  route.status.reliability =
    route.status.shipmentsCompleted /
    (route.status.shipmentsCompleted + route.status.shipmentsLost);

  // Upgrade trust if appropriate
  if (route.trust.successfulTrades >= 10 && route.trust.trustLevel === 'new') {
    route.trust.trustLevel = 'established';
    route.trust.escrowRequired = false;
  }
  if (route.trust.successfulTrades >= 50 && route.trust.trustLevel === 'established') {
    route.trust.trustLevel = 'trusted';
  }

  // Degrade passage stability (passages decay with use)
  route.passage.stability -= route.passage.stability * 0.001;

  return { success: true };
}
```

### Exotic Resource Trade

**Inter-universe trade enables access to resources unavailable locally:**

```typescript
/**
 * Resources that can ONLY be obtained via inter-universe trade
 * These resources exist in timelines where different events occurred
 */
const INTER_UNIVERSE_EXCLUSIVE_RESOURCES = {
  // From timelines where specific events happened differently
  timeline_variants: {
    // Timeline where alchemy succeeded
    'philosopherstone': {
      sourceTimeline: 'branch:alchemical_success',
      rarity: 'legendary',
      value: 50000,
      use: 'Transmutation, matter conversion',
    },

    // Timeline where magic dominates
    'concentrated_mana_crystal': {
      sourceTimeline: 'branch:magical_dominance',
      rarity: 'rare',
      value: 5000,
      use: 'Power source for magical technology',
    },

    // Timeline where dinosaurs survived
    'evolved_scale_armor': {
      sourceTimeline: 'branch:dinosaur_survival',
      rarity: 'uncommon',
      value: 1500,
      use: 'Lightweight armor, bio-tech',
    },

    // Timeline where AI achieved consciousness early
    'sentient_crystal_matrix': {
      sourceTimeline: 'branch:ai_emergence',
      rarity: 'legendary',
      value: 100000,
      use: 'Artificial consciousness substrate',
    },
  },

  // From extinct timelines (no longer reachable except via Svetz ships)
  extinct_timeline_salvage: {
    'final_moment_essence': {
      rarity: 'legendary',
      value: 500000,
      use: 'Timeline manipulation, resurrection',
    },
    'unrealized_potential': {
      rarity: 'rare',
      value: 10000,
      use: 'Probability manipulation',
    },
  },
};
```

### Integration with TradeAgreementSystem

**Extends existing TradeAgreementSystem cross-universe handling:**

```typescript
/**
 * Enhanced trade agreement for inter-universe routes
 * (Integrates with packages/core/src/systems/TradeAgreementSystem.ts)
 */
function enhanceAgreementForInterUniverse(
  agreement: TradeAgreement,
  passage: PassageExtended
): TradeAgreement {
  // Add cross-realm metadata
  agreement.crossRealmMetadata = {
    passageIds: [passage.id],
    escrowEntities: [],
    timeSyncMode: 'relative',  // Use Hilbert-time
    trustLevel: 'untrusted',   // Start untrusted
    successfulTrades: 0,
    failedTrades: 0,
  };

  // Validate Hilbert-time coordinates
  for (const party of agreement.parties) {
    if (!party.hilbertTime) {
      party.hilbertTime = getCurrentHilbertTime(party.universeId);
    }
  }

  // Set delivery to use passage
  for (const term of agreement.terms) {
    term.delivery.method = 'periodic';
    term.delivery.deliveryLocation = {
      passageId: passage.id,
      requiresEscrow: true,
    };
  }

  return agreement;
}
```

---

## Integration with Production Chain

### From Materials to Trade Goods

**65+ Exotic Materials** (from SpaceflightRecipes.ts):

```typescript
const SPACEFLIGHT_MATERIALS = {
  // Tier 1: Raw
  mana_shard: { tier: 1, value: 10 },
  rare_earth_ore: { tier: 1, value: 15 },
  silicon_sand: { tier: 1, value: 5 },

  // Tier 2: Processed
  refined_mana: { tier: 2, value: 40 },
  rare_earth_compound: { tier: 2, value: 60 },
  silicon_wafer: { tier: 2, value: 20 },

  // Tier 3: Components
  processing_unit: { tier: 3, value: 200 },
  quantum_processor: { tier: 3, value: 800 },
  resonance_core: { tier: 3, value: 500 },

  // Tier 4: Exotic
  soul_anchor: { tier: 4, value: 5000 },
  timeline_anchor: { tier: 4, value: 8000 },
  probability_lens: { tier: 4, value: 10000 },

  // Tier 5: Ship Components
  hull_plating: { tier: 5, value: 1000 },
  propulsion_unit: { tier: 5, value: 3000 },
  power_core: { tier: 5, value: 4000 },

  // Tier 6: Modules
  heart_chamber_core: { tier: 6, value: 15000 },
  emotion_theater_system: { tier: 6, value: 12000 },
  probability_drive: { tier: 6, value: 25000 },
};
```

### Trade Flow for Ship Construction

**Example: Building a Threshold Ship**

```
Planet A (Mining) produces:
  - Rare earth ore: 100/tick
  - Silicon sand: 200/tick

Planet B (Processing) produces:
  - Rare earth compound: 30/tick (from ore)
  - Silicon wafer: 80/tick (from sand)

Planet C (Manufacturing) produces:
  - Processing units: 10/tick (from wafers + compounds)
  - Hull plating: 5/tick (from stellarite)

Planet D (Shipyard) assembles:
  - Threshold ship: 1 per 2000 ticks
    Requires:
      - 10 hull_plating
      - 2 propulsion_unit
      - 1 navigation_array
      - 1 power_core
```

**Trade Routes Required:**

```typescript
const shipConstructionRoutes: TradeRouteTier[] = [
  // Raw → Processing
  {
    origin: 'planet:A',
    destination: 'planet:B',
    goods: [
      { itemId: 'rare_earth_ore', flowRate: 100 },  // Per tick
      { itemId: 'silicon_sand', flowRate: 200 },
    ],
  },

  // Processing → Manufacturing
  {
    origin: 'planet:B',
    destination: 'planet:C',
    goods: [
      { itemId: 'rare_earth_compound', flowRate: 30 },
      { itemId: 'silicon_wafer', flowRate: 80 },
    ],
  },

  // Manufacturing → Shipyard
  {
    origin: 'planet:C',
    destination: 'planet:D',
    goods: [
      { itemId: 'processing_unit', flowRate: 10 },
      { itemId: 'hull_plating', flowRate: 5 },
    ],
  },
];
```

**Network Analysis:**

```typescript
// Planet D (shipyard) is a chokepoint
// If blockaded → no ships produced → fleet cannot expand
// Strategic target for enemy

const network = getTradeNetwork('system:sol');
network.resilience.criticalNodes.includes('planet:D');  // true
```

### Just-In-Time vs Stockpiling

**Trade Agreement Delivery Methods:**

```typescript
// JIT (periodic, high frequency)
const jitAgreement: TradeTerm = {
  itemId: 'silicon_wafer',
  quantity: 10,
  delivery: {
    method: 'periodic',
    frequency: 10,  // Every 10 ticks
  },
};
// Result: Low inventory, efficient, but vulnerable to disruption

// Stockpiling (periodic, low frequency, large quantity)
const stockpileAgreement: TradeTerm = {
  itemId: 'silicon_wafer',
  quantity: 1000,
  delivery: {
    method: 'periodic',
    frequency: 1000,  // Every 1000 ticks
  },
};
// Result: High inventory, resilient, but ties up capital
```

---

## Currency Systems

### Local Currencies

**Each settlement mints its own:**

```typescript
interface LocalCurrency {
  name: string;         // "Iron Coin", "Gold Ducat"
  issuingEntity: string;  // Settlement/political entity ID

  // Backing
  backingType: 'commodity' | 'fiat' | 'precious_metal';
  backingReserve?: number;  // If commodity-backed

  // Supply
  totalSupply: number;
  inflationRate: number;  // Annual increase

  // Value
  purchasingPower: number;  // How much goods 1 unit buys
}
```

### Exchange Rates (Emergent)

**Rates emerge from arbitrage:**

```typescript
/**
 * Calculate exchange rate from trade flows
 */
function calculateExchangeRate(
  currency1: string,
  currency2: string,
  tradeVolume: Map<string, number>  // Goods traded between regions
): number {
  // Regions using currency1 export X goods
  const exports1 = tradeVolume.get(currency1) ?? 0;

  // Regions using currency2 export Y goods
  const exports2 = tradeVolume.get(currency2) ?? 0;

  // If currency1 region exports 2x more:
  // → currency1 is worth more
  // → exchange rate = exports2 / exports1

  return exports2 / Math.max(1, exports1);
}
```

**Example:**

```
Iron Kingdom exports: 1000 iron/tick
Gold Republic exports: 500 gold/tick

Exchange rate:
  1 Iron Coin = 500 / 1000 = 0.5 Gold Ducats
  OR
  1 Gold Ducat = 1000 / 500 = 2 Iron Coins
```

### Currency Unions (Federation Level)

**Federation standardizes currency:**

```typescript
/**
 * Establish common currency for federation
 */
function establishCommonCurrency(
  federation: TradeFederationTier,
  currencyName: string,
  symbol: string
): void {
  // Set federation currency
  federation.standards.commonCurrency = {
    name: currencyName,
    symbol,
    exchangeRates: new Map(),
  };

  // Calculate exchange rates for member currencies
  for (const memberId of federation.members.fullMembers) {
    const member = getPoliticalEntity(memberId);
    const localCurrency = member.economy?.currency ?? 'local_coin';

    // Rate based on member GDP
    const memberGDP = member.economy?.GDP ?? 1;
    const avgGDP = federation.economics.combinedGDP / federation.members.totalMembers;
    const rate = memberGDP / avgGDP;  // Stronger economy = better rate

    federation.standards.commonCurrency.exchangeRates.set(localCurrency, rate);
  }

  // Convert member holdings to federation currency
  for (const memberId of federation.members.fullMembers) {
    convertToFederationCurrency(memberId, federation);
  }
}
```

---

## TypeScript Interfaces Summary

### Complete Type Definitions

```typescript
// ============================================================================
// Tier 1: Trade Route
// ============================================================================

interface TradeRouteTier {
  id: string;
  agreementId: string;

  origin: {
    tierId: string;
    name: string;
    coordinates: Vector3D;
  };

  destination: {
    tierId: string;
    name: string;
    coordinates: Vector3D;
  };

  distance: number;
  travelTime: number;

  goods: {
    itemId: string;
    quantity: number;
    frequency: number;
    flowRate: number;
  }[];

  transport: {
    method: 'caravan' | 'ship' | 'courier_ship' | 'portal';
    assignedShipIds?: string[];
    cargoCapacity?: number;
    agents?: string[];
    passageId?: string;
  };

  economics: {
    revenue: number;
    cost: number;
    profit: number;
    buyPrice: Map<string, number>;
    sellPrice: Map<string, number>;
    margin: number;
  };

  hazards: {
    pirateRisk: number;
    weatherRisk: number;
    politicalRisk: number;
    escortSquadronId?: string;
    insuranceCost: number;
  };

  status: {
    active: boolean;
    lastShipmentTick: bigint;
    shipmentsCompleted: number;
    shipmentsLost: number;
    reliability: number;
  };
}

// ============================================================================
// Tier 2: Shipping Lane
// ============================================================================

interface ShippingLaneTier {
  id: string;
  name: string;

  endpoints: {
    start: {
      tierId: string;
      hubId?: string;
      coordinates: Vector3D;
    };
    end: {
      tierId: string;
      hubId?: string;
      coordinates: Vector3D;
    };
  };

  routes: {
    routeIds: string[];
    totalRoutes: number;
  };

  flow: {
    byResource: Map<string, number>;
    totalVolume: number;
    direction: 'bidirectional' | 'one_way';
    peakVolume: number;
    peakTick: bigint;
  };

  infrastructure: {
    roadQuality: number;
    portCapacity: number;
    warehouseStorage: number;
    upgrades: {
      paved_road?: boolean;
      trade_station?: boolean;
      warp_gate?: boolean;
    };
  };

  economics: {
    totalRevenue: number;
    taxRevenue: number;
    maintenanceCost: number;
    jobsCreated: number;
  };

  strategic: {
    isChokepoint: boolean;
    dependentRegions: string[];
    alternativeRoutes: string[];
    controlledBy?: string;
    contested: boolean;
  };

  hazards: {
    avgPirateRisk: number;
    totalIncidents: number;
    patrolStrength: number;
    fortifications: string[];
  };

  status: {
    operational: boolean;
    congestion: number;
    lastMajorIncident?: {
      type: string;
      tick: bigint;
      impact: number;
    };
  };
}

// ============================================================================
// Tier 3: Trade Network
// ============================================================================

interface TradeNetworkTier {
  id: string;
  name: string;

  scope: {
    spatialTierId: string;
    tier: 'planet' | 'system' | 'sector';
  };

  topology: {
    nodes: {
      nodeId: string;
      type: 'settlement' | 'hub' | 'waypoint';
      importance: number;
      connections: number;
    }[];

    edges: {
      laneId: string;
      weight: number;
    }[];

    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    diameter: number;
    clustering: number;
  };

  hubs: {
    majorHubs: string[];
    minorHubs: string[];
    isolatedNodes: string[];
  };

  flow: {
    totalVolume: number;
    byResource: Map<string, number>;
    imports: Map<string, number>;
    exports: Map<string, number>;
    tradeBalance: Map<string, number>;
  };

  resilience: {
    redundancy: number;
    criticalNodes: string[];
    criticalLanes: string[];
    randomFailureTolerance: number;
    targetedAttackTolerance: number;
  };

  economics: {
    totalGDP: number;
    tradeVolume: number;
    avgTariff: number;
    giniCoefficient: number;
  };

  control: {
    dominantFaction?: string;
    factionShares: Map<string, number>;
    disputed: boolean;
  };

  status: {
    health: number;
    congestion: number;
    disruptions: {
      type: string;
      affectedLanes: string[];
      severity: number;
    }[];
  };
}

// ============================================================================
// Tier 4: Trade Federation
// ============================================================================

interface TradeFederationTier {
  id: string;
  name: string;

  members: {
    factionIds: string[];
    totalMembers: number;
    founderIds: string[];
    fullMembers: string[];
    associateMembers: string[];
    pendingApplications: string[];
  };

  territory: {
    controlledSystems: string[];
    totalSystems: number;
    totalPopulation: number;
    territoryArea: number;
  };

  networks: {
    networkIds: string[];
    totalLanes: number;
    totalFlow: number;
  };

  standards: {
    commonCurrency: {
      name: string;
      symbol: string;
      exchangeRates: Map<string, number>;
    };

    regulations: {
      tariffRate: number;
      bannedGoods: string[];
      inspectionRules: InspectionPolicy;
      minWage?: number;
      maxWorkHours?: number;
    };

    technical: {
      containerSizes: number[];
      shipCertification: string[];
      portProtocols: string[];
    };
  };

  institutions: {
    centralBank?: {
      reserves: number;
      interestRate: number;
      inflationTarget: number;
    };

    tradeCommission: {
      inspectors: number;
      enforcementBudget: number;
      violationCount: number;
    };

    arbitrationCourt: {
      cases: DisputeCase[];
      rulings: Ruling[];
    };
  };

  economics: {
    combinedGDP: number;
    totalTradeVolume: number;
    growthRate: number;
    giniCoefficient: number;
    richestMember: string;
    poorestMember: string;
  };

  security: {
    navyContributions: Map<string, number>;
    totalNavyShips: number;
    pirateIncidents: number;
    patrolCoverage: number;
    sanctionedFactions: string[];
    embargoedSystems: string[];
  };

  governance: {
    governanceType: 'council' | 'democratic' | 'hegemonic';
    votingRules: {
      method: 'one_nation_one_vote' | 'weighted_by_gdp' | 'weighted_by_population';
      passingThreshold: number;
    };
    chairperson?: string;
    termLength: number;
    nextElection: bigint;
  };

  status: {
    cohesion: number;
    stability: number;
    activeCrises: {
      type: 'trade_war' | 'defection' | 'external_threat';
      severity: number;
      tick: bigint;
    }[];
  };
}

// ============================================================================
// Supporting Types
// ============================================================================

interface DisputeCase {
  id: string;
  plaintiff: string;
  defendant: string;
  details: string;
  filedAt: bigint;
}

interface Ruling {
  caseId: string;
  decision: 'plaintiff' | 'defendant';
  damages: number;
  explanation: string;
}

interface InspectionPolicy {
  randomInspectionRate: number;  // 0-1
  targetedInspection: string[];  // High-risk goods
}
```

---

## Performance Considerations

### Computational Cost at Each Tier

| Tier | Entities | Operations/Tick | Simulation Cost |
|------|----------|----------------|-----------------|
| **Route** | 1 route | 1 shipment check + hazard roll | Low (O(1)) |
| **Lane** | 10-100 routes | Flow aggregation | Low (O(routes)) |
| **Network** | 100-1000 lanes | Graph analysis (cached) | Medium (O(lanes)) |
| **Federation** | 10-100 networks | Policy enforcement | Low (O(networks)) |

### Optimization Strategies

**1. Flow Caching:**

```typescript
// Cache aggregate flow, recompute only when routes change
class ShippingLaneCache {
  private flowCache = new Map<string, Map<string, number>>();
  private lastUpdate = new Map<string, bigint>();

  getFlow(laneId: string, world: World): Map<string, number> {
    const lastTick = this.lastUpdate.get(laneId) ?? 0n;

    // If cache fresh, return
    if (BigInt(world.tick) - lastTick < 100n) {
      return this.flowCache.get(laneId) ?? new Map();
    }

    // Recompute
    const lane = getShippingLane(laneId);
    const flow = aggregateRouteFlow(lane.routes.routeIds);

    this.flowCache.set(laneId, flow);
    this.lastUpdate.set(laneId, BigInt(world.tick));

    return flow;
  }
}
```

**2. Lazy Network Analysis:**

```typescript
// Only analyze network when queried
class TradeNetworkAnalyzer {
  private resilienceCache = new Map<string, ResilienceMetrics>();

  analyzeResilience(networkId: string): ResilienceMetrics {
    // Check cache
    if (this.resilienceCache.has(networkId)) {
      return this.resilienceCache.get(networkId)!;
    }

    // Expensive analysis
    const network = getTradeNetwork(networkId);
    const resilience = analyzeResilience(network);

    // Cache for 1000 ticks
    this.resilienceCache.set(networkId, resilience);
    setTimeout(() => this.resilienceCache.delete(networkId), 1000 * 50);

    return resilience;
  }
}
```

**3. Throttled Federation Updates:**

```typescript
// Update federation policies every 1000 ticks (not every tick)
class TradeFederationSystem implements System {
  private UPDATE_INTERVAL = 1000;
  private lastUpdate = 0;

  update(world: World): void {
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = world.tick;

    // Process all federations
    const federations = getAllFederations();
    for (const federation of federations) {
      updateCohesion(federation);
      checkDefections(federation);
      processDisputes(federation);
    }
  }
}
```

---

## Summary

This spec defines a **4-tier trade hierarchy** scaling from individual routes to galactic federations:

**Tier 1 (Route):** Individual agreements, extends TradeAgreementSystem with logistics
**Tier 2 (Lane):** Aggregate corridors, uses TransportHub, identifies chokepoints
**Tier 3 (Network):** Graph topology, extends ResourceFlow, resilience analysis
**Tier 4 (Federation):** Universal standards, currency unions, strategic embargoes

**Key Innovations:**
1. **Flow-based economics** renormalizes from items to goods/tick
2. **Chokepoint mechanics** enable strategic blockades and piracy
3. **Graph analysis** identifies critical infrastructure
4. **Currency standardization** reduces transaction costs at federation scale
5. **Cross-domain integration** with Ship (escorts), Political (control), Spatial (hubs)

**Integration Points:**
- **TradingSystem** → TradeRouteTier (individual trades)
- **TradeAgreementSystem** → TradeRouteTier (formal agreements)
- **Ship Domain** → Escort missions, cargo ships
- **Political Domain** → Tariffs, embargoes, control
- **Spatial Domain** → Hubs, chokepoints, territory
- **Production Chain** → 65+ materials flow through network

**Result:** A game where a single villager's fish trade can scale to galactic supply chains moving exotic matter between universes - with strategic chokepoints, pirate raids, and trade wars emerging naturally.

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-17
**Total Lines:** ~730
**Status:** Complete, ready for implementation
