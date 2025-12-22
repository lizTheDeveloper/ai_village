# Trade Routes UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Trade Routes UI provides visualization and management of inter-village trade infrastructure. Players can view trade routes, track caravans, monitor merchant movements, analyze prices, and manage trade agreements.

**Core concept:**
> "Trade connects villages, spreads knowledge, and builds wealth"

---

## Dependencies

- `economy-system/inter-village-trade.md` - Trade routes, caravans, merchants, agreements
- `economy-system/spec.md` - Base economy, market prices
- `world-system/abstraction-layers.md` - Simulation layers affect trade detail

---

## Requirements

### REQ-TRD-001: Trade Route Map

Overlay showing trade routes on the world map.

```typescript
// Re-export from economy-system/inter-village-trade for reference
import type {
  TradeRoute, RouteDanger, TerrainDifficulty,
  TradePost,
  Caravan, CaravanState, CaravanSchedule,
  TravelingMerchant, MerchantType,
  RegionalPricing, TradeOpportunity,
  TradeAgreement, TradeAgreementType, TradeExchange,
  AbstractTradeFlow, VillageSpecialization,
  TradeEvent, TradeEventType
} from "economy-system/inter-village-trade";

interface TradeRouteMap {
  isOpen: boolean;

  // Map overlay
  showRoutes: boolean;
  showTradePosts: boolean;
  showCaravans: boolean;
  showMerchants: boolean;
  showTradeFlows: boolean;

  // Route data
  routes: TradeRouteDisplay[];
  tradePosts: TradePostDisplay[];

  // Active traders
  activeCaravans: CaravanDisplay[];
  merchantsInTransit: MerchantDisplay[];

  // Selection
  selectedRoute: TradeRoute | null;
  selectedPost: TradePost | null;
  selectedCaravan: Caravan | null;

  // Filters
  filterByVillage: VillageId | null;
  filterByGoods: ResourceType | null;
  showInactiveRoutes: boolean;
}
```

**Trade Route Map Overlay:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🗺️ TRADE ROUTES                                    [Filters] [Legend] [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                    🏔️                                              │   │
│  │                   /  \                                              │   │
│  │     🏘️ Hilltop ━━━━━━━━━━━━━━━━━━ 🏘️ Riverside                    │   │
│  │        │  ⚠️Bandits     \         /                                │   │
│  │        │                 \       /  🐪 Caravan                      │   │
│  │        │                  \     /   (3 days to dest)                │   │
│  │        │                   \   /                                    │   │
│  │        │                    📍                                      │   │
│  │        │               Trade Post                                   │   │
│  │        │                    │                                       │   │
│  │        ╰────────────────────┼────────────────╮                      │   │
│  │                             │                │                      │   │
│  │     🏘️ Oakwood ━━━━━━━━━━━━━━━━━━━━━━━━━━ 🏘️ Marshland             │   │
│  │        (Your Village)       👤 Merchant                             │   │
│  │                            (arriving today)                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  LEGEND                                                                     │
│  ━━━━ Active route (safe)    ╌╌╌╌ Inactive route                           │
│  ━━━━ Active route (danger)  📍 Trade post                                 │
│  🐪 Caravan                   👤 Merchant                                   │
│  ⚠️ Danger zone                                                             │
│                                                                             │
│  QUICK STATS: 4 routes | 1 trade post | 2 active caravans | 1 merchant     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Selected: The Forest Road (Oakwood ↔ Riverside)              [View Route] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-002: Route Detail Panel

Detailed view of a specific trade route.

```typescript
// TradeRouteDisplay wraps TradeRoute with UI properties
interface TradeRouteDisplay {
  route: TradeRoute;                   // From inter-village-trade

  // Visualization
  pathPoints: Position[];
  totalDistance: number;
  travelTime: string;                  // "3 days"

  // Danger overlay
  dangers: DangerDisplay[];
  overallSafety: number;               // 0-100

  // Traffic info
  trafficSummary: TrafficSummary;

  // Economic value
  economicStats: RouteEconomicStats;
}

interface DangerDisplay {
  danger: RouteDanger;                 // From inter-village-trade
  icon: Sprite;
  color: Color;
  position: Position;
  tooltip: string;
}

interface TrafficSummary {
  caravansPerSeason: number;
  merchantsPerSeason: number;
  primaryGoods: { resource: ResourceType; volume: number }[];
  averageValue: number;
}

interface RouteEconomicStats {
  totalTradeValue: number;             // This season
  profitGenerated: number;
  topTradedGoods: ResourceType[];
  priceArbitrage: Map<ResourceType, number>;  // Price difference
}
```

**Route Detail Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📍 THE FOREST ROAD                                          [◀ Back] [X]  │
│  Oakwood ↔ Riverside                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ROUTE OVERVIEW                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Distance: 45 km                   Travel Time: 3 days (foot), 2 days (cart)│
│  Terrain: Forest, Hills           Established: Spring, Year 2              │
│  Discovered By: Merchant Toma     Status: Active                           │
│                                                                             │
│  SAFETY: ████████░░ 78%                                                    │
│                                                                             │
│  DANGERS                                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ⚠️ Bandit Activity (km 15-20)                          Severity: 30%│    │
│  │    Last incident: 12 days ago | Recommendation: Travel in groups   │    │
│  │                                                                     │    │
│  │ 🐺 Wildlife Risk (km 25-30)                            Severity: 15%│    │
│  │    Wolf territory | Recommendation: Armed guards                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  TRAFFIC (This Season)                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Caravans: 8 trips                 Merchants: 12 visits                    │
│  Total Value: 15,000 coins         Primary Goods: Grain, Lumber, Fish      │
│                                                                             │
│  PRICE ARBITRAGE OPPORTUNITIES                                              │
│  ┌──────────────┬───────────────┬───────────────┬────────────────────┐     │
│  │ Resource     │ Oakwood Price │ Riverside Price│ Profit Margin     │     │
│  ├──────────────┼───────────────┼───────────────┼────────────────────┤     │
│  │ Grain        │ 5 coins       │ 8 coins       │ +60% (buy here)   │     │
│  │ Fish         │ 12 coins      │ 6 coins       │ +100% (sell here) │     │
│  │ Lumber       │ 8 coins       │ 10 coins      │ +25%              │     │
│  └──────────────┴───────────────┴───────────────┴────────────────────┘     │
│                                                                             │
│  ACTIVE CARAVANS                                                            │
│  • 🐪 Caravan from Riverside → Oakwood (arriving tomorrow)                  │
│  • 🐪 Caravan from Oakwood → Riverside (departed 2 days ago)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-003: Caravan Tracker

Track active caravans.

```typescript
// CaravanDisplay wraps Caravan with UI properties
interface CaravanDisplay {
  caravan: Caravan;                    // From inter-village-trade

  // Journey visualization
  journeyProgress: number;             // 0-1
  currentSegment: string;              // "Forest path near Oakwood"
  remainingDistance: number;
  eta: GameTime;

  // Status indicators
  stateIcon: Sprite;
  stateColor: Color;
  healthBar: number;
  moraleBar: number;
  suppliesBar: number;

  // Cargo summary
  cargoSummary: CargoSummaryDisplay;

  // Crew summary
  crewSummary: CrewSummaryDisplay;
}

interface CargoSummaryDisplay {
  totalValue: number;
  totalWeight: number;
  capacityUsed: number;                // 0-1
  topItems: { resource: ResourceType; quantity: number; value: number }[];
}

interface CrewSummaryDisplay {
  leader: { name: string; tradingSkill: number };
  guardCount: number;
  merchantCount: number;
  workerCount: number;
  animalCount: number;
}
```

**Caravan Tracker:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🐪 ACTIVE CARAVANS                                                  [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CARAVAN: Merchant Guild Expedition                     [TRAVELING]  │   │
│  │                                                                     │   │
│  │ Route: Oakwood → Riverside                                          │   │
│  │ Progress: ████████████████████░░░░░░░░░░░░░░ 60%                   │   │
│  │ ETA: Tomorrow evening                                               │   │
│  │                                                                     │   │
│  │ CREW                          CARGO                                 │   │
│  │ 👤 Leader: Toma (Trading 67)  📦 Grain: 200 units (1,000 coins)    │   │
│  │ ⚔️ Guards: 3                   📦 Lumber: 50 units (400 coins)      │   │
│  │ 🧳 Workers: 2                  📦 Crafts: 10 items (600 coins)      │   │
│  │ 🐴 Animals: 4 horses           ─────────────────────────────        │   │
│  │                               Total Value: 2,000 coins              │   │
│  │                                                                     │   │
│  │ Health: ████████░░ 80%   Morale: ██████░░░░ 60%   Supplies: 5 days │   │
│  │                                                                     │   │
│  │ ⚠️ Entering bandit territory in 2 hours                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CARAVAN: Village Supply Run                            [LOADING]    │   │
│  │                                                                     │   │
│  │ Route: Oakwood → Trade Post → Hilltop                               │   │
│  │ Departure: In 2 days                                                │   │
│  │                                                                     │   │
│  │ Loading cargo... (45% complete)                        [View More]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Total Caravans: 2 active | 1 loading | Value in transit: 2,400 coins      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-004: Merchant Tracker

Track traveling merchants.

```typescript
// MerchantDisplay wraps TravelingMerchant with UI properties
interface MerchantDisplay {
  merchant: TravelingMerchant;         // From inter-village-trade

  // Current status
  currentLocation: string;             // Village name or "In transit"
  nextDestination: string;
  arrivalTime: GameTime | null;
  departureTime: GameTime | null;

  // Reputation
  localReputation: number;             // 0-100 for current village
  reputationLabel: string;

  // Inventory summary
  inventorySummary: MerchantInventoryDisplay;

  // Trade history
  recentTrades: RecentTradeDisplay[];

  // Knowledge value
  priceKnowledge: MerchantKnowledgeDisplay;
}

interface MerchantInventoryDisplay {
  totalValue: number;
  currency: number;
  topGoods: { resource: ResourceType; quantity: number; price: number }[];
  specialItems: string[];              // Rare or unique items
}

interface RecentTradeDisplay {
  village: string;
  bought: { resource: ResourceType; quantity: number }[];
  sold: { resource: ResourceType; quantity: number }[];
  profit: number;
  date: GameTime;
}

interface MerchantKnowledgeDisplay {
  villagesKnown: number;
  routesKnown: number;
  pricesKnown: number;
  newsCarried: string[];               // Rumors from other villages
}
```

**Merchant Tracker:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 TRAVELING MERCHANTS                                              [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ MERCHANTS     │  LORENZO THE EXOTIC                                        │
│               │  ─────────────────────────────────────────────────────────  │
│ ● Lorenzo     │                                                             │
│ ○ Mira        │  Specialization: 💎 Exotic Goods                           │
│ ○ Old Chen    │  Currently: Visiting Oakwood (3 more days)                 │
│               │  Reputation Here: ████████░░ 78% (Trusted)                 │
│               │                                                             │
│ ─────────     │  CIRCUIT                                                    │
│ [View All]    │  Oakwood → Riverside → Hilltop → Marshland → (return)      │
│               │                                                             │
│               │  CURRENT INVENTORY                                          │
│               │  ┌─────────────────────────────────────────────────────┐   │
│               │  │ 💰 Currency: 450 coins                              │   │
│               │  │ 💎 Gems: 5 (rare) - 200 coins each                  │   │
│               │  │ 📜 Maps: 2 (Distant lands)                          │   │
│               │  │ 🧪 Potions: 8 (Various)                             │   │
│               │  │ 📚 Rare Books: 3                                    │   │
│               │  │ ─────────────────────────────────────────────────   │   │
│               │  │ Total Inventory Value: 1,850 coins                  │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│               │  NEWS FROM OTHER VILLAGES                                   │
│               │  • "Riverside had a bumper fish harvest"                   │
│               │  • "Hilltop is running low on grain"                       │
│               │  • "Bandits spotted on the mountain pass"                  │
│               │                                                             │
│               │  PRICE KNOWLEDGE                                            │
│               │  Villages: 4 | Routes: 6 | Price points: 48                │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  [Trade with Lorenzo]          [Ask about prices]         [Ask for news]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-005: Trade Agreements Panel

View and manage trade agreements.

```typescript
// TradeAgreementDisplay wraps TradeAgreement with UI properties
interface TradeAgreementDisplay {
  agreement: TradeAgreement;           // From inter-village-trade

  // Status
  statusLabel: string;
  statusColor: Color;
  timeRemaining: string;

  // Terms summary
  termsSummary: AgreementTermsSummary;

  // Performance
  fulfillmentRate: number;             // 0-1
  violations: ViolationDisplay[];
  satisfactionByParty: Map<VillageId, number>;
}

interface AgreementTermsSummary {
  weProvide: ExchangeSummary[];
  weReceive: ExchangeSummary[];
  frequency: string;
  specialTerms: string[];
}

interface ExchangeSummary {
  resource: ResourceType;
  quantity: number;
  priceTerms?: string;
}

interface ViolationDisplay {
  date: GameTime;
  violator: VillageId;
  description: string;
  resolved: boolean;
}
```

**Trade Agreements Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📜 TRADE AGREEMENTS                                                 [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTIVE AGREEMENTS (3)                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🤝 GRAIN EXCHANGE with Riverside                        [ACTIVE]    │   │
│  │                                                                     │   │
│  │ Type: Recurring Exchange                                            │   │
│  │ Established: Spring Y2              Expires: Winter Y3 (6 months)   │   │
│  │ Negotiated by: Elder Thom + Merchant Alara                          │   │
│  │                                                                     │   │
│  │ TERMS                                                               │   │
│  │ We provide:  🌾 Grain (50 units/month)                              │   │
│  │ We receive:  🐟 Fish (30 units/month)                               │   │
│  │ Frequency:   Monthly                                                │   │
│  │ Special:     Priority pricing (10% discount)                        │   │
│  │                                                                     │   │
│  │ FULFILLMENT: ████████████████████░░ 92%                            │   │
│  │                                                                     │   │
│  │ Their Satisfaction: ████████░░ 85%    Our Satisfaction: ████████░░ 80%│   │
│  │                                                                     │   │
│  │ [View Details]    [Renegotiate]    [Terminate]                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🛡️ EXCLUSIVE METAL SUPPLY from Hilltop                  [ACTIVE]    │   │
│  │                                                                     │   │
│  │ Type: Exclusive Agreement                                           │   │
│  │ We are sole buyer of their iron ore                                 │   │
│  │ Duration: 2 seasons remaining                                        │   │
│  │                                                                     │   │
│  │ [View Details]    [Renegotiate]    [Terminate]                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  EXPIRED/TERMINATED (1)                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ Lumber trade with Marshland - Terminated (they violated terms)         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [+ New Agreement]                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-006: Regional Prices Panel

View prices across villages.

```typescript
interface RegionalPricesPanel {
  // Price comparison
  resources: ResourceType[];
  villages: VillageId[];
  priceMatrix: Map<VillageId, Map<ResourceType, number>>;

  // Arbitrage opportunities
  opportunities: TradeOpportunity[];   // From inter-village-trade

  // Price trends
  trends: Map<ResourceType, PriceTrend>;

  // Knowledge source
  priceAge: Map<VillageId, Map<ResourceType, number>>;  // Days old
}

interface PriceTrend {
  resource: ResourceType;
  direction: "rising" | "stable" | "falling";
  changePercent: number;
  reason?: string;
}
```

**Regional Prices Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💰 REGIONAL PRICES                                                  [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRICE COMPARISON                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌────────────┬──────────┬──────────┬──────────┬──────────┬─────────────┐  │
│  │ Resource   │ Oakwood  │ Riverside│ Hilltop  │ Marshland│ Best Deal   │  │
│  ├────────────┼──────────┼──────────┼──────────┼──────────┼─────────────┤  │
│  │ 🌾 Grain   │ 5 ●      │ 8        │ 9        │ 7        │ Buy here    │  │
│  │ 🐟 Fish    │ 12       │ 6 ●      │ 10       │ 8        │ Buy Riversd │  │
│  │ 🪵 Lumber  │ 8        │ 10       │ 6 ●      │ 12       │ Buy Hilltop │  │
│  │ ⛏️ Iron Ore│ 15       │ 18       │ 8 ●      │ 20       │ Buy Hilltop │  │
│  │ 🌿 Herbs   │ 6        │ 8        │ 10       │ 4 ●      │ Buy Marshl. │  │
│  └────────────┴──────────┴──────────┴──────────┴──────────┴─────────────┘  │
│                                                                             │
│  ● = Lowest price   Price age: Today (Oakwood), 3 days (others)            │
│                                                                             │
│  ARBITRAGE OPPORTUNITIES                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🌟 HIGH PROFIT                                                             │
│  • Buy Fish at Riverside (6) → Sell at Oakwood (12)  Profit: +100%         │
│  • Buy Iron at Hilltop (8) → Sell at Marshland (20)  Profit: +150%         │
│                                                                             │
│  📈 MODERATE PROFIT                                                         │
│  • Buy Grain at Oakwood (5) → Sell at Hilltop (9)    Profit: +80%          │
│  • Buy Herbs at Marshland (4) → Sell at Hilltop (10) Profit: +150%         │
│                                                                             │
│  PRICE TRENDS                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📈 Iron Ore: Rising (+15%) - Hilltop mines producing less                 │
│  📉 Grain: Falling (-10%) - Good harvest across region                     │
│  ━ Fish: Stable - Normal fishing season                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-TRD-007: Trade Events Log

Log of significant trade events.

```typescript
interface TradeEventsLog {
  events: TradeEventDisplay[];

  // Filters
  filterByType: TradeEventType[];
  filterByVillage: VillageId | null;
  filterByTime: TimeRange;

  // Grouping
  groupBy: "time" | "type" | "village";
}

interface TradeEventDisplay {
  event: TradeEvent;                   // From inter-village-trade
  icon: Sprite;
  color: Color;
  summary: string;
  details: string;
  actionable: boolean;
  actions?: TradeEventAction[];
}

interface TradeEventAction {
  label: string;
  action: () => void;
}
```

**Trade Events Log:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 TRADE EVENTS                                     [Filter] [Group] [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TODAY                                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🟢 10:30  Merchant Lorenzo arrived at Oakwood                              │
│            Carrying exotic goods, news from Hilltop                         │
│            [Trade with merchant]                                            │
│                                                                             │
│  🟡 08:15  Caravan departed for Riverside                                   │
│            Cargo: 200 grain, 50 lumber. ETA: 3 days                        │
│            [Track caravan]                                                  │
│                                                                             │
│  YESTERDAY                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🟢 15:00  Trade agreement renewed with Riverside                           │
│            Grain-for-fish exchange continues for 6 more months             │
│            [View agreement]                                                 │
│                                                                             │
│  🔴 11:30  Caravan attacked near Hilltop                                    │
│            Minor losses, 2 guards injured. Bandits driven off.             │
│            [View details]                                                   │
│                                                                             │
│  THIS WEEK                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🟢 Day 5  New trade route discovered: Marshland shortcut                  │
│            Saves 1 day travel time, avoids bandit territory                │
│            [View route]                                                     │
│                                                                             │
│  🟡 Day 3  Prices updated: Iron ore rising at Hilltop                       │
│            +15% from last month. Supply shortage reported.                 │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Showing: 6 events | Filter: All types | Range: This week                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

```
TRADE UI CONTROLS:
- T              : Open trade routes map
- R              : Toggle route display
- C              : View caravans
- M              : View merchants
- A              : View agreements
- P              : View prices
- E              : View events log
- Escape         : Close
```

---

## State Management

### Trade System Integration

```typescript
interface TradeUIState {
  // View state
  isOpen: boolean;
  activePanel: TradePanel;

  // Selection
  selectedRoute: TradeRoute | null;
  selectedPost: TradePost | null;
  selectedCaravan: Caravan | null;
  selectedMerchant: TravelingMerchant | null;

  // Filters
  villageFilter: VillageId | null;
  goodsFilter: ResourceType | null;
  timeFilter: TimeRange;

  // Events from trade system
  onCaravanDeparted: Event<Caravan>;
  onCaravanArrived: Event<Caravan>;
  onCaravanAttacked: Event<Caravan>;
  onMerchantArrived: Event<TravelingMerchant>;
  onAgreementSigned: Event<TradeAgreement>;
  onRouteDiscovered: Event<TradeRoute>;
  onPricesUpdated: Event<VillageId>;
}

type TradePanel =
  | "map"
  | "routes"
  | "caravans"
  | "merchants"
  | "agreements"
  | "prices"
  | "events";
```

---

## Open Questions

1. Should players be able to invest in trade routes (improve roads, clear bandits)?
2. Trade route naming by players?
3. Merchant reputation system with player actions?
4. Automated trade agreement suggestions?
5. Trade embargo visualization and mechanics?

---

## Related Specs

- `economy-system/inter-village-trade.md` - Source system spec
- `economy-system/spec.md` - Base economy
- `ui-system/map.md` - Trade route map overlay
- `ui-system/trading.md` - Individual trading UI
