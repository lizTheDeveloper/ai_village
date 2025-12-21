# Inter-Village Trade System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Villages specialize based on local resources and develop trade relationships with other settlements. Trade happens through caravans, traveling merchants, trade posts, and eventually established trade routes. This system operates across all simulation layers - from individual transactions at full detail to aggregate trade flows at abstract scale.

---

## Trade Infrastructure

### Trade Routes

```typescript
interface TradeRoute {
  id: string;
  name?: string;                // "The Silk Road"

  // Endpoints
  villages: VillageId[];        // Can be 2+ for routes with stops
  established: GameTime;
  discoveredBy: AgentId;

  // Physical path
  path: Position[];
  distance: number;             // Travel time in days
  terrain: TerrainDifficulty;
  dangers: RouteDanger[];

  // Traffic
  traffic: {
    caravansPerSeason: number;
    primaryGoods: ResourceType[];
    averageValue: number;
  };

  // State
  active: boolean;
  safety: number;               // 0-100, affects bandit risk
  maintenance: number;          // Road quality
}

interface RouteDanger {
  type: "bandits" | "wildlife" | "terrain" | "weather" | "political";
  severity: number;             // 0-1
  location?: Position;
  seasonal?: Season[];
}
```

### Trade Posts

```typescript
interface TradePost {
  id: string;
  position: Position;
  ownedBy?: VillageId;

  // Type
  type: "outpost" | "market" | "port" | "caravan_stop" | "border_crossing";

  // Capacity
  capacity: {
    merchants: number;          // How many can trade here
    storage: number;            // Goods that can be stored
    stables: number;            // Pack animals
  };

  // Services
  services: {
    banking: boolean;           // Store/transfer wealth
    storage: boolean;           // Leave goods
    repairs: boolean;           // Fix wagons, equipment
    lodging: boolean;           // Rest for travelers
    information: boolean;       // Rumors, prices, routes
  };

  // Current state
  currentMerchants: MerchantId[];
  storedGoods: Map<OwnerId, Inventory>;
  priceBoard: Map<ResourceType, PriceInfo>;
}
```

---

## Trade Actors

### Caravans

```typescript
interface Caravan {
  id: string;
  ownerId: VillageId | AgentId;

  // Composition
  leader: AgentId;              // Caravan master
  guards: AgentId[];
  merchants: AgentId[];
  workers: AgentId[];
  animals: AnimalId[];          // Pack animals

  // Cargo
  cargo: {
    goods: Map<ResourceType, number>;
    value: number;
    weight: number;
    capacity: number;
  };

  // Journey
  route: TradeRoute;
  currentPosition: Position;
  destination: VillageId;
  origin: VillageId;
  schedule: CaravanSchedule;

  // State
  state: CaravanState;
  morale: number;
  supplies: number;             // Days of food/water
  health: number;               // Overall condition
}

type CaravanState =
  | "loading"
  | "traveling"
  | "resting"
  | "trading"
  | "unloading"
  | "returning"
  | "stranded"
  | "attacked";

interface CaravanSchedule {
  departureDate: GameTime;
  expectedArrival: GameTime;
  stops: { position: Position; duration: number }[];
  returnTrip: boolean;
}
```

### Traveling Merchants

```typescript
interface TravelingMerchant {
  id: string;
  agentId: AgentId;

  // Type
  specialization: MerchantType;
  reputation: Map<VillageId, number>;

  // Inventory
  inventory: {
    goods: Map<ResourceType, number>;
    currency: number;
    capacity: number;
  };

  // Travel pattern
  circuit: VillageId[];         // Regular route
  currentStop: number;
  visitDuration: number;        // Days at each stop
  nextDeparture: GameTime;

  // Knowledge
  priceKnowledge: Map<VillageId, Map<ResourceType, PriceMemory>>;
  routeKnowledge: TradeRoute[];
  contacts: Map<VillageId, AgentId[]>;  // Who they know
}

type MerchantType =
  | "general"           // Buys/sells everything
  | "luxury"            // Rare goods, gems, art
  | "livestock"         // Animals
  | "equipment"         // Tools, weapons, armor
  | "provisions"        // Food, supplies
  | "exotic"            // Rare items from far lands
  | "specialist";       // One specific trade
```

---

## Price Discovery

### Multi-Village Pricing

```typescript
interface RegionalPricing {
  // Each village has local prices
  villagePrices: Map<VillageId, Map<ResourceType, number>>;

  // Price factors
  factors: {
    localSupply: number;        // Abundant = cheap
    localDemand: number;        // Needed = expensive
    transportCost: number;      // Distance markup
    scarcity: number;           // Rarity multiplier
    seasonality: number;        // Seasonal variation
    taxesAndTariffs: number;
  };

  // Price spread
  spread: {
    buyPrice: number;           // What merchants pay
    sellPrice: number;          // What merchants charge
    margin: number;             // Profit margin
  };
}

// Calculate trade opportunity
function findTradeOpportunity(
  merchant: TravelingMerchant,
  sourceVillage: VillageId,
  destVillage: VillageId
): TradeOpportunity[] {

  const opportunities: TradeOpportunity[] = [];

  for (const [resource, sourcePrice] of getPrices(sourceVillage)) {
    const destPrice = getPrice(destVillage, resource);
    const transportCost = calculateTransportCost(
      sourceVillage,
      destVillage,
      resource
    );

    const profit = destPrice - sourcePrice - transportCost;

    if (profit > 0) {
      opportunities.push({
        resource,
        buyAt: sourceVillage,
        sellAt: destVillage,
        buyPrice: sourcePrice,
        sellPrice: destPrice,
        profit,
        profitMargin: profit / sourcePrice,
      });
    }
  }

  // Sort by profit margin
  return opportunities.sort((a, b) => b.profitMargin - a.profitMargin);
}
```

### Price Propagation

```typescript
interface PricePropagation {
  // How prices spread between villages
  mechanism: "merchant_knowledge" | "instant" | "delayed";

  // Merchants carry price information
  merchantPropagation: {
    // When merchant arrives, they share prices from origin
    onArrival: (merchant: TravelingMerchant, village: Village) => void;

    // Prices they share are from when they left
    priceAge: number;           // Days old

    // Not perfectly accurate
    accuracy: number;           // 0.8-0.95
  };

  // Price adjustment
  adjustment: {
    // If merchants report high prices elsewhere, local prices rise
    arbitrageEffect: number;

    // Lag time for adjustment
    adjustmentSpeed: number;    // Days to full adjustment
  };
}

// Merchants share price knowledge when visiting
async function merchantArrivesAtVillage(
  merchant: TravelingMerchant,
  village: Village
): Promise<void> {

  // Share price knowledge from previous stops
  for (const [villageId, prices] of merchant.priceKnowledge) {
    for (const [resource, memory] of prices) {
      // Add some noise for imperfect information
      const reportedPrice = memory.price * (0.9 + Math.random() * 0.2);

      // Village traders learn about external prices
      village.marketKnowledge.set(villageId, resource, {
        price: reportedPrice,
        age: memory.age,
        source: merchant.id,
      });
    }
  }

  // Merchant learns local prices
  for (const [resource, price] of village.market.prices) {
    merchant.priceKnowledge.set(village.id, resource, {
      price,
      age: 0,
      reliable: true,
    });
  }
}
```

---

## Trade Agreements

```typescript
interface TradeAgreement {
  id: string;
  parties: VillageId[];         // Usually 2

  // Type
  type: TradeAgreementType;
  negotiatedBy: AgentId[];      // The negotiators

  // Terms
  terms: {
    // Regular exchanges
    exchanges: TradeExchange[];

    // Pricing
    priceGuarantees?: Map<ResourceType, PriceRange>;
    preferentialTreatment: boolean;

    // Exclusivity
    exclusive: boolean;         // Can't trade this good elsewhere
    nonCompete: ResourceType[]; // Resources covered

    // Duration
    duration: number;           // Seasons
    renewalTerms: "auto" | "renegotiate" | "expire";
  };

  // State
  established: GameTime;
  expires: GameTime;
  violations: Violation[];
  satisfaction: Map<VillageId, number>;  // How happy each party is
}

type TradeAgreementType =
  | "spot"              // One-time exchange
  | "recurring"         // Regular deliveries
  | "exclusive"         // Only trade partner for goods
  | "alliance"          // Full trade alliance
  | "embargo";          // Refusal to trade

interface TradeExchange {
  // What village A provides
  from: VillageId;
  provides: Map<ResourceType, number>;

  // What village B provides in return
  to: VillageId;
  receives: Map<ResourceType, number>;

  // Frequency
  frequency: "one_time" | "weekly" | "monthly" | "seasonal";
}
```

---

## Abstract Trade Simulation

When villages are at abstract layer, trade is simulated as flows:

```typescript
interface AbstractTradeFlow {
  // Aggregate trade between two villages
  source: VillageId;
  destination: VillageId;

  // Volume
  volume: {
    total: number;              // Total value per season
    byResource: Map<ResourceType, number>;
  };

  // Direction
  netFlow: number;              // Positive = source exports more

  // Health
  reliability: number;          // 0-1
  growth: number;               // Trend
}

// Simulate abstract trade for a period
function simulateAbstractTrade(
  villages: VillageAggregate[],
  period: number                // Days
): TradeResult[] {

  const results: TradeResult[] = [];

  for (const source of villages) {
    for (const dest of villages) {
      if (source.id === dest.id) continue;

      // Check if trade route exists
      const route = findRoute(source, dest);
      if (!route) continue;

      // Calculate what each wants to trade
      const sourceSurplus = source.economy.surplus;
      const destScarcity = dest.economy.scarcity;

      // Match supply with demand
      for (const [resource, surplus] of sourceSurplus) {
        const demand = destScarcity.get(resource) || 0;

        if (surplus > 0 && demand > 0) {
          const traded = Math.min(surplus, demand);
          const value = traded * getRegionalPrice(resource);

          results.push({
            from: source.id,
            to: dest.id,
            resource,
            quantity: traded,
            value,
          });

          // Update village aggregates
          source.economy.surplus.set(resource, surplus - traded);
          dest.economy.scarcity.set(resource, demand - traded);
          source.economy.wealth += value * 0.6;  // Trade profit
        }
      }
    }
  }

  return results;
}
```

---

## Trade Events

```typescript
interface TradeEvent {
  type: TradeEventType;
  timestamp: GameTime;
  participants: string[];
  details: any;
}

type TradeEventType =
  // Positive
  | "trade_route_discovered"
  | "trade_agreement_signed"
  | "profitable_exchange"
  | "new_merchant_arrives"
  | "trade_post_established"

  // Negative
  | "caravan_attacked"
  | "trade_dispute"
  | "embargo_declared"
  | "price_crash"
  | "route_blocked"

  // Neutral
  | "merchant_departed"
  | "prices_updated"
  | "agreement_renewed"
  | "tariff_changed";

// Generate trade events at different layers
function generateTradeEvents(
  layer: SimulationLayer,
  state: WorldState
): TradeEvent[] {

  switch (layer) {
    case "full":
      // Individual transactions, negotiations
      return generateDetailedTradeEvents(state);

    case "active":
      // Caravan arrivals, merchant visits
      return generateActiveTradeEvents(state);

    case "abstract":
      // Route changes, agreements, major disruptions
      return generateAbstractTradeEvents(state);

    case "historical":
      // Only major trade shifts
      return generateHistoricalTradeEvents(state);
  }
}
```

---

## Specialization & Comparative Advantage

```typescript
interface VillageSpecialization {
  village: VillageId;

  // What they're good at producing
  advantages: {
    resource: ResourceType;
    advantage: number;          // Multiplier vs average
    reason: AdvantageReason;
  }[];

  // What they need from others
  dependencies: {
    resource: ResourceType;
    imported: number;           // % from trade
    sources: VillageId[];
  }[];
}

type AdvantageReason =
  | "natural_resources"     // They have iron deposits
  | "climate"               // Good for certain crops
  | "skills"                // Traditional expertise
  | "technology"            // They invented/researched it
  | "infrastructure"        // Mills, workshops
  | "location";             // On trade route

// Villages naturally specialize based on advantages
function calculateSpecialization(
  village: Village
): VillageSpecialization {

  const advantages = [];

  // Check natural resources
  for (const resource of village.naturalResources) {
    advantages.push({
      resource,
      advantage: 1.5,
      reason: "natural_resources",
    });
  }

  // Check climate for crops
  for (const crop of getAllCrops()) {
    const suitability = getCropSuitability(crop, village.biome, village.climate);
    if (suitability > 1.2) {
      advantages.push({
        resource: crop,
        advantage: suitability,
        reason: "climate",
      });
    }
  }

  // Check agent skills
  const skillCounts = countAgentSkills(village.agents);
  for (const [skill, count] of skillCounts) {
    if (count > village.agents.length * 0.2) {  // 20%+ have this skill
      advantages.push({
        resource: skillToResource(skill),
        advantage: 1 + (count / village.agents.length),
        reason: "skills",
      });
    }
  }

  return { village: village.id, advantages, dependencies: [] };
}
```

---

## Key Figure Trade Decisions

At background/abstract layers, trade decisions are made by key figures:

```typescript
interface TradeDecision {
  decisionMaker: KeyFigure;
  decision: TradeDecisionType;
  reasoning: string;
}

type TradeDecisionType =
  | "establish_route"
  | "break_agreement"
  | "negotiate_terms"
  | "embargo_village"
  | "accept_merchant"
  | "reject_merchant"
  | "set_tariff"
  | "subsidize_export";

async function keyFigureTradeDecision(
  figure: KeyFigure,
  situation: TradeSituation
): Promise<TradeDecision> {

  // For important decisions, use LLM
  if (situation.importance > 0.7) {
    const prompt = `
      You are ${figure.profile.name}, the ${figure.role} of ${figure.villageName}.
      Your traits: ${figure.profile.traits.join(", ")}
      Your priorities: ${figure.profile.priorities.join(", ")}

      Trade situation:
      ${situation.description}

      What do you decide? Consider your village's needs and your personal values.
    `;

    const response = await llm.complete(prompt);
    return parseTradeDecision(response);
  }

  // Otherwise, use heuristics based on profile
  if (figure.decisionStyle.tradeFriendliness > 0.7) {
    return { decision: "accept", reasoning: "Open to trade" };
  }

  // ... more heuristics
}
```

---

## Summary

| Component | Full Layer | Abstract Layer |
|-----------|------------|----------------|
| **Transactions** | Individual trades | Aggregate flows |
| **Merchants** | Full agents | Statistics |
| **Caravans** | Simulated journey | Instant transfer |
| **Prices** | Per-item | Resource averages |
| **Agreements** | Negotiated by agents | Decided by key figures |
| **Events** | All events | Major only |

Key concepts:
- **Trade routes** connect villages with known paths
- **Caravans** carry goods, can be attacked/delayed
- **Price discovery** through merchant knowledge
- **Specialization** based on comparative advantage
- **Key figures** make trade decisions at abstract layer

---

## Related Specs

**Core Integration:**
- `economy-system/spec.md` - Base economy
- `world-system/abstraction-layers.md` - Simulation layers
- `agent-system/spec.md` - Merchant agents

**Trade Infrastructure:**
- `construction-system/spec.md` - Trade posts, caravan stations as buildings
- `items-system/spec.md` - Traded goods are items with value

**Trade Goods:**
- `animal-system/spec.md` - Livestock trade, animal products
- `agent-system/chroniclers.md` - Written works as trade goods, news via merchants

**Trade at Scale:**
- `game-engine/spec.md` - Trade simulation in game loop

