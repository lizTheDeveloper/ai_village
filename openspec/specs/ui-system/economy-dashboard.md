# Economy Dashboard UI Specification

## Overview

The Economy Dashboard provides comprehensive visualization of village economics, including resource flows, production rates, consumption patterns, stockpile trends, and trade balances. Features real-time graphs, alerts, and management tools.

## Version

0.1.0

## Dependencies

- `economy-system/spec.md` - Economy mechanics
- `economy-system/inter-village-trade.md` - Trade system
- `items-system/spec.md` - Item definitions
- `ui-system/notifications.md` - Economic alerts

## Requirements

### REQ-ECON-001: Dashboard Overview
- **Description**: Main economic summary panel
- **Priority**: MUST

```typescript
// Re-export from economy-system for reference
import type {
  Currency, ItemValue, MarketState,
  Shop, ShopStock, ShopType,
  TradeOffer, EconomicEvent, WanderingMerchant,
  VillageEconomy
} from "economy-system/spec";

// VillageEconomy from economy-system/spec.md contains:
// totalCurrency, averageAgentWealth, dailyTransactionVolume, weeklyTransactionVolume,
// inflationRate, priceStabilityIndex, dailyItemsProduced, dailyItemsConsumed,
// giniCoefficient, economicGrowth

interface EconomyDashboard {
  isOpen: boolean;
  position: "fullscreen" | "panel";

  // Core data from economy-system
  villageEconomy: VillageEconomy;
  marketState: MarketState;

  // Display data
  economyData: EconomyDataDisplay;
  lastUpdate: GameTime;

  // View sections
  sections: DashboardSection[];
  activeSections: Set<string>;

  // Time range
  timeRange: TimeRange;

  // Methods
  open(): void;
  close(): void;
  refresh(): void;
  setTimeRange(range: TimeRange): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for economy data
interface EconomyDataDisplay {
  // Link to core economy-system data
  villageEconomy: VillageEconomy;
  marketState: MarketState;

  // Stockpiles
  resources: ResourceStockDisplay[];
  totalValue: number;

  // Rates (from VillageEconomy.dailyItemsProduced/Consumed)
  productionRates: Map<string, number>;
  consumptionRates: Map<string, number>;
  netRates: Map<string, number>;

  // Trade
  tradeBalance: number;
  recentTrades: TradeRecordDisplay[];

  // Shops and merchants
  activeShops: Shop[];
  visitingMerchants: WanderingMerchant[];

  // Workforce
  workerAllocation: Map<string, number>;
  productivityIndex: number;

  // From VillageEconomy
  inflationRate: number;
  giniCoefficient: number;
  economicGrowth: number;
}

type TimeRange =
  | "hour"
  | "day"
  | "week"
  | "season"
  | "year"
  | "all_time";

interface DashboardSection {
  id: string;
  title: string;
  position: Vector2;
  size: Vector2;
  isCollapsed: boolean;
  isResizable: boolean;
}
```

### REQ-ECON-002: Resource Stockpiles
- **Description**: Current inventory levels for all resources
- **Priority**: MUST

```typescript
// Reference ItemValue from economy-system for value calculation
// ItemValue contains: baseValue, qualityMultiplier, rarityMultiplier, demandMultiplier, supplyPenalty, finalValue

interface ResourceStockpileView {
  resources: ResourceStockDisplay[];

  // Link to market state for dynamic pricing
  marketState: MarketState;

  // Display options
  viewMode: "grid" | "list" | "compact";
  sortBy: StockSortOption;
  groupBy: "category" | "none";

  // Filtering
  showCategories: Set<ResourceCategory>;
  searchQuery: string;
  showZeroStock: boolean;

  // Alerts
  showLowStockWarnings: boolean;
  showOverstockWarnings: boolean;
}

// Display wrapper for resource stocks
interface ResourceStockDisplay {
  resourceId: string;
  name: string;
  icon: Sprite;
  category: ResourceCategory;

  // Quantities
  currentAmount: number;
  capacity: number | null;     // null = unlimited
  reserved: number;            // Allocated to jobs

  // Value from economy-system
  itemValue: ItemValue;        // From economy-system
  unitValue: number;           // From itemValue.finalValue
  totalValue: number;          // currentAmount * unitValue

  // Market state for this resource (from MarketState.itemStats)
  marketStats?: {
    totalSupply: number;
    recentSales: number;
    recentPurchases: number;
    averagePrice: number;
    priceHistory: number[];
  };

  // Status
  status: StockStatus;
  trend: StockTrend;

  // Thresholds
  lowThreshold: number;
  targetThreshold: number;
}

type ResourceCategory =
  | "raw_materials"    // Wood, stone, ore
  | "food"             // Edibles
  | "crafted_goods"    // Tools, furniture
  | "building_materials"
  | "luxury"           // Decorative, trade goods
  | "special";         // Quest items, rare

type StockStatus =
  | "critical"         // Below minimum
  | "low"              // Below low threshold
  | "adequate"         // Normal range
  | "surplus"          // Above target
  | "overstock";       // Near capacity

interface StockTrend {
  direction: "rising" | "falling" | "stable";
  changeRate: number;          // Per day
  projectedDaysUntilEmpty: number | null;
  projectedDaysUntilFull: number | null;
}

type StockSortOption =
  | "name"
  | "amount"
  | "value"
  | "category"
  | "trend"
  | "urgency";
```

### REQ-ECON-003: Production Rates
- **Description**: Resource production over time
- **Priority**: MUST

```typescript
interface ProductionRatesView {
  // Per-resource rates
  rates: ProductionRate[];

  // Totals
  totalProductionValue: number;
  totalConsumptionValue: number;
  netValue: number;

  // Time period
  period: TimeRange;

  // Display
  showGraph: boolean;
  graphType: "line" | "bar" | "stacked";
}

interface ProductionRate {
  resourceId: string;
  name: string;
  icon: Sprite;

  // Rates per day
  produced: number;
  consumed: number;
  net: number;

  // Breakdown
  productionSources: ProductionSource[];
  consumptionSources: ConsumptionSource[];

  // Trend
  productionTrend: number;     // Change vs previous period
  consumptionTrend: number;
}

interface ProductionSource {
  type: "building" | "agent" | "natural";
  sourceId: string;
  sourceName: string;
  amount: number;
  efficiency: number;          // 0-1
}

interface ConsumptionSource {
  type: "needs" | "crafting" | "building" | "trade" | "decay";
  description: string;
  amount: number;
}
```

### REQ-ECON-004: Resource Flow Graph
- **Description**: Time-series graph of resource levels
- **Priority**: MUST

```typescript
interface ResourceFlowGraph {
  // Data
  series: GraphSeries[];
  timeRange: TimeRange;

  // Graph config
  graphType: GraphType;
  showLegend: boolean;
  showGrid: boolean;
  showTooltips: boolean;

  // Interaction
  hoveredPoint: DataPoint | null;
  selectedSeries: string[];

  // Methods
  addSeries(resourceId: string): void;
  removeSeries(resourceId: string): void;
  setTimeRange(range: TimeRange): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface GraphSeries {
  id: string;
  name: string;
  color: Color;
  dataPoints: DataPoint[];

  // Visual
  lineWidth: number;
  showPoints: boolean;
  fillArea: boolean;
  fillOpacity: number;
}

interface DataPoint {
  timestamp: GameTime;
  value: number;
}

type GraphType =
  | "line"
  | "area"
  | "stacked_area"
  | "bar"
  | "stacked_bar";

interface GraphInteraction {
  // Zoom
  zoomEnabled: boolean;
  currentZoom: number;

  // Pan
  panEnabled: boolean;
  panOffset: number;

  // Selection
  brushSelect: boolean;
  selectedRange: [GameTime, GameTime] | null;

  // Tooltip
  showCrosshair: boolean;
  tooltipPosition: Vector2;
}
```

### REQ-ECON-005: Trade Balance
- **Description**: Summary of trade activity
- **Priority**: SHOULD

```typescript
// Reference trade types from economy-system
// TradeOffer contains: offerer, target, offering, requesting, currencyOffered, currencyRequested
// WanderingMerchant contains: exoticItems, wantsToBuy, buyMarkup, sellBonus

interface TradeBalanceView {
  // Summary
  totalExports: number;
  totalImports: number;
  netBalance: number;

  // By resource
  resourceBalances: ResourceTradeBalance[];

  // By partner
  partnerBalances: PartnerTradeBalanceDisplay[];

  // Active shops from economy-system
  villageShops: Shop[];

  // Visiting merchants from economy-system
  activeMerchants: WanderingMerchant[];

  // History
  balanceHistory: BalanceHistoryEntry[];
  trendDirection: "surplus" | "deficit" | "balanced";
}

interface ResourceTradeBalance {
  resourceId: string;
  name: string;
  icon: Sprite;

  exported: number;
  imported: number;
  net: number;

  // Value (using ItemValue from economy-system)
  exportValue: number;
  importValue: number;
  netValue: number;

  // Market demand multiplier affects trade value
  demandMultiplier: number;    // From MarketState
  supplyPenalty: number;       // From MarketState
}

// Display wrapper for trade partners
interface PartnerTradeBalanceDisplay {
  partnerId: string;
  partnerName: string;
  partnerType: "agent" | "merchant" | "village";

  // Link to economy-system types
  shop?: Shop;                  // If partner has a shop
  wanderingMerchant?: WanderingMerchant;  // If visiting merchant

  totalTraded: number;
  balance: number;              // Positive = we gained
  tradeCount: number;

  // Recent trade offers
  recentOffers: TradeOffer[];   // From economy-system
}

// Display wrapper for trade records
interface TradeRecordDisplay {
  id: string;
  timestamp: GameTime;
  tradeOffer: TradeOffer;       // From economy-system

  // Computed display values
  totalValueExchanged: number;
  wasProfit: boolean;
  profitAmount: number;
}

interface BalanceHistoryEntry {
  period: GameTime;
  exports: number;
  imports: number;
  balance: number;
}
```

### REQ-ECON-006: Workforce Allocation
- **Description**: How labor is distributed across jobs
- **Priority**: SHOULD

```typescript
interface WorkforceAllocationView {
  // By job
  jobAllocations: JobAllocation[];

  // Summary
  totalWorkers: number;
  employedWorkers: number;
  idleWorkers: number;

  // Efficiency
  overallEfficiency: number;

  // Display
  viewMode: "chart" | "list";
  chartType: "pie" | "bar";
}

interface JobAllocation {
  jobId: string;
  jobName: string;
  icon: Sprite;
  color: Color;

  // Workers
  currentWorkers: number;
  idealWorkers: number;        // Optimal for current needs
  maxWorkers: number | null;

  // Status
  isUnderstaffed: boolean;
  isOverstaffed: boolean;

  // Productivity
  efficiency: number;          // 0-1
  outputPerWorker: number;
}

interface WorkforceChart {
  allocations: JobAllocation[];
  chartType: "pie" | "bar" | "treemap";

  // Interaction
  selectedJob: string | null;
  hoveredJob: string | null;

  // Click to filter roster
  onJobClick(jobId: string): void;
}
```

### REQ-ECON-007: Economic Alerts
- **Description**: Warnings about economic issues
- **Priority**: SHOULD

```typescript
// Reference EconomicEvent from economy-system
// EconomicEvent types: merchant_arrival, shortage, surplus, festival, trade_route, economic_boom, recession

interface EconomicAlerts {
  alerts: EconomicAlertDisplay[];

  // Active economic events from economy-system
  activeEvents: EconomicEvent[];

  // Filtering
  showResolved: boolean;
  filterBySeverity: AlertSeverity | null;
  filterByCategory: AlertCategory | null;

  // Display
  maxAlertsShown: number;
  sortBy: "severity" | "time" | "category";
}

// Display wrapper for economic alerts
interface EconomicAlertDisplay {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;

  // Link to economy-system event if applicable
  economicEvent?: EconomicEvent;

  // Context
  resourceId: string | null;
  relatedEntities: string[];

  // Timing
  triggeredAt: GameTime;
  resolvedAt: GameTime | null;

  // Actions
  suggestedActions: SuggestedAction[];
}

type AlertSeverity =
  | "critical"        // Immediate attention needed
  | "warning"         // Potential issue
  | "info";           // Informational

// Alert categories - many map to EconomicEvent types
type AlertCategory =
  | "shortage"        // Maps to EconomicEvent.shortage
  | "surplus"         // Maps to EconomicEvent.surplus
  | "production"      // Production issues
  | "consumption"     // Unusual consumption
  | "trade"           // Trade imbalance, merchant_arrival, trade_route
  | "workforce"       // Labor issues
  | "market_event"    // festival, economic_boom, recession
  | "merchant";       // merchant_arrival from EconomicEvent

interface SuggestedAction {
  label: string;
  action: () => void;
  icon: Sprite;
}

// Example alerts mapped to EconomicEvent types
const ECONOMIC_ALERT_TYPES = [
  { trigger: "food < 10 days supply", severity: "critical", category: "shortage" },
  { trigger: "wood storage > 90%", severity: "warning", category: "surplus" },
  { trigger: "no farmers assigned", severity: "warning", category: "workforce" },
  { trigger: "trade deficit > 100/day", severity: "info", category: "trade" },
  { trigger: "EconomicEvent.merchant_arrival", severity: "info", category: "merchant" },
  { trigger: "EconomicEvent.economic_boom", severity: "info", category: "market_event" },
  { trigger: "EconomicEvent.recession", severity: "warning", category: "market_event" }
];
```

### REQ-ECON-008: Projections
- **Description**: Forecast future resource levels
- **Priority**: MAY

```typescript
interface EconomicProjections {
  resource: string;
  currentLevel: number;

  // Projections
  projectedLevels: ProjectedLevel[];
  projectionRange: TimeRange;

  // Scenarios
  scenarios: ProjectionScenario[];
  activeScenario: string;
}

interface ProjectedLevel {
  timestamp: GameTime;
  level: number;
  confidence: number;          // 0-1, decreases over time
}

interface ProjectionScenario {
  id: string;
  name: string;
  description: string;

  // Modified assumptions
  productionModifier: number;
  consumptionModifier: number;
  tradeModifier: number;

  // Results
  projectedLevels: ProjectedLevel[];
}

interface ProjectionGraph {
  // Shows current + projected
  historicalData: DataPoint[];
  projectedData: DataPoint[];

  // Confidence band
  showConfidenceBand: boolean;
  confidenceHigh: DataPoint[];
  confidenceLow: DataPoint[];

  // Thresholds
  showThresholds: boolean;
  criticalThreshold: number;
  targetThreshold: number;
}
```

### REQ-ECON-009: Resource Details
- **Description**: Deep dive into individual resource
- **Priority**: SHOULD

```typescript
interface ResourceDetailsView {
  resource: ResourceStock;

  // Sections
  showOverview: boolean;
  showProduction: boolean;
  showConsumption: boolean;
  showHistory: boolean;
  showStorage: boolean;

  // Methods
  openForResource(resourceId: string): void;
  close(): void;
}

interface ResourceOverview {
  resource: ResourceStock;

  // Quick stats
  currentAmount: number;
  dailyNet: number;
  daysUntilEmpty: number | null;
  valuePerUnit: number;
}

interface ResourceProductionDetails {
  totalProduction: number;
  sources: ProductionSource[];

  // Top producers
  topProducers: ProducerRanking[];
}

interface ResourceConsumptionDetails {
  totalConsumption: number;
  breakdown: ConsumptionBreakdown[];
}

interface ConsumptionBreakdown {
  category: string;
  amount: number;
  percentage: number;
  details: ConsumptionSource[];
}

interface ProducerRanking {
  entityId: string;
  entityName: string;
  entityType: "building" | "agent";
  production: number;
  efficiency: number;
}
```

### REQ-ECON-010: Comparison View
- **Description**: Compare metrics across time periods
- **Priority**: MAY

```typescript
interface PeriodComparison {
  metric: ComparisonMetric;
  periods: ComparisonPeriod[];

  // Display
  showAbsolute: boolean;
  showPercentChange: boolean;
  highlightBestPeriod: boolean;
}

interface ComparisonMetric {
  id: string;
  name: string;
  unit: string;

  getValue(period: TimeRange): number;
}

interface ComparisonPeriod {
  label: string;
  range: TimeRange;
  value: number;
  changeFromPrevious: number;
  changePercent: number;
}

// Comparable metrics
const COMPARISON_METRICS = [
  "total_production",
  "total_consumption",
  "net_resources",
  "trade_balance",
  "workforce_efficiency",
  "stockpile_value"
];
```

### REQ-ECON-011: Keyboard Shortcuts
- **Description**: Quick access for dashboard
- **Priority**: SHOULD

```typescript
interface EconomyDashboardShortcuts {
  // Window
  toggleDashboard: string;     // Default: "E"
  closeDashboard: string;      // Default: "Escape"

  // Navigation
  nextSection: string;         // Default: "Tab"
  previousSection: string;     // Default: "Shift+Tab"

  // Time range
  cycleTimeRange: string;      // Default: "T"
  zoomIn: string;              // Default: "+"
  zoomOut: string;             // Default: "-"

  // Resources
  searchResources: string;     // Default: "/"
  clearSearch: string;         // Default: "Escape"

  // Sections
  toggleSection: string;       // Default: "Space"
  expandAll: string;           // Default: "Ctrl+E"
  collapseAll: string;         // Default: "Ctrl+Shift+E"
}
```

## Visual Style

```typescript
interface EconomyDashboardStyle {
  // Background
  backgroundColor: Color;
  sectionBackground: Color;
  sectionBorder: Color;

  // Status colors
  positiveColor: Color;        // Green - surplus, growth
  negativeColor: Color;        // Red - deficit, decline
  neutralColor: Color;         // White - stable
  warningColor: Color;         // Orange - warning

  // Graph colors
  graphGridColor: Color;
  graphLineColors: Color[];    // Palette for series
  graphAreaOpacity: number;

  // Icons
  iconSize: number;
  categoryIcons: Map<ResourceCategory, Sprite>;

  // Typography
  headerFont: PixelFont;
  valueFont: PixelFont;
  labelFont: PixelFont;

  // 8-bit styling
  pixelScale: number;
  useDithering: boolean;
}
```

## State Management

```typescript
// Import core economy-system types for state management
import type {
  VillageEconomy, MarketState,
  Shop, TradeOffer, EconomicEvent,
  WanderingMerchant, Currency
} from "economy-system/spec";

interface EconomyDashboardState {
  // View state
  isOpen: boolean;
  activeTab: string;

  // Time range
  selectedTimeRange: TimeRange;

  // Selection
  selectedResource: string | null;
  selectedJob: string | null;

  // Filters
  resourceFilters: Set<ResourceCategory>;
  searchQuery: string;

  // Section states
  expandedSections: Set<string>;

  // Graph state
  graphZoom: number;
  graphPan: number;
  selectedSeries: string[];

  // Core economy-system data
  villageEconomy: VillageEconomy;
  marketState: MarketState;
  currency: Currency;

  // Events (consuming economy-system events)
  onResourceSelected: Event<string>;
  onAlertClicked: Event<EconomicAlertDisplay>;
  onEconomicEvent: Event<EconomicEvent>;
  onTradeCompleted: Event<TradeOffer>;
  onMerchantArrived: Event<WanderingMerchant>;
  onMarketStateChanged: Event<MarketState>;
}
```

## Integration Points

- **Economy System**: Resource data, production/consumption
- **Items System**: Item definitions, values
- **Agent System**: Workforce allocation
- **Trade System**: Trade history, balance
- **Notification System**: Economic alerts
- **Save System**: Historical data persistence
