# Phase 12: Economy & Trade - Implementation Plan

**Created:** 2025-12-26
**Status:** Ready for Implementation
**Spec:** `openspec/specs/economy-system/spec.md`
**Estimated LOC:** ~3,000

---

## Overview

Implement a complete economy system including currency, trading, shops, market simulation, and UI. This phase integrates with existing inventory, item, and building systems.

---

## Implementation Phases

### Phase 12.1: Core Economy Components (~400 LOC)

#### 12.1.1: CurrencyComponent

**File:** `packages/core/src/components/CurrencyComponent.ts`

```typescript
import type { Component } from '../ecs/Component.js';

export interface TransactionRecord {
  id: string;
  type: 'buy' | 'sell' | 'trade' | 'transfer';
  amount: number;
  otherPartyId: string;
  itemId?: string;
  quantity?: number;
  tick: number;
  timestamp: number;
}

export interface CurrencyComponent extends Component {
  type: 'currency';
  balance: number;
  transactionHistory: TransactionRecord[];
  maxHistorySize: number;
}

export function createCurrencyComponent(initialBalance: number = 100): CurrencyComponent {
  return {
    type: 'currency',
    version: 1,
    balance: initialBalance,
    transactionHistory: [],
    maxHistorySize: 100,
  };
}

export function addCurrency(component: CurrencyComponent, amount: number, record: Omit<TransactionRecord, 'id'>): CurrencyComponent {
  const newBalance = component.balance + amount;
  if (newBalance < 0) {
    throw new Error(`Insufficient funds: have ${component.balance}, need ${-amount}`);
  }

  const transaction: TransactionRecord = {
    ...record,
    id: crypto.randomUUID(),
  };

  const history = [transaction, ...component.transactionHistory].slice(0, component.maxHistorySize);

  return {
    ...component,
    balance: newBalance,
    transactionHistory: history,
  };
}
```

**Tasks:**
- [ ] Create CurrencyComponent with balance and transaction history
- [ ] Add helper functions for currency operations
- [ ] Export from components/index.ts
- [ ] Add to AgentEntity creation (initial balance: 100)

#### 12.1.2: ShopComponent

**File:** `packages/core/src/components/ShopComponent.ts`

```typescript
import type { Component } from '../ecs/Component.js';

export type ShopType =
  | 'general'
  | 'farm_supply'
  | 'blacksmith'
  | 'tavern'
  | 'apothecary'
  | 'clothier'
  | 'curiosity'
  | 'player_shop';

export interface ShopStock {
  itemId: string;
  quantity: number;
  customPrice?: number;
  reserved: number;
}

export interface ShopComponent extends Component {
  type: 'shop';
  shopType: ShopType;
  ownerId: string;
  name: string;

  // Inventory
  stock: ShopStock[];
  currencyReserve: number;

  // Pricing
  buyMarkup: number;      // 1.2 = 20% above base value (player pays more)
  sellMarkdown: number;   // 0.8 = 80% of base value (player gets less)
  haggleEnabled: boolean;

  // Hours
  openHours: { start: number; end: number }; // 0-24
  daysOpen: number[]; // 0-6 for days of week

  // Stats
  totalSales: number;
  totalPurchases: number;
}

export function createShopComponent(
  shopType: ShopType,
  ownerId: string,
  name: string
): ShopComponent {
  return {
    type: 'shop',
    version: 1,
    shopType,
    ownerId,
    name,
    stock: [],
    currencyReserve: 500,
    buyMarkup: 1.2,
    sellMarkdown: 0.8,
    haggleEnabled: true,
    openHours: { start: 8, end: 18 },
    daysOpen: [1, 2, 3, 4, 5, 6], // Mon-Sat
    totalSales: 0,
    totalPurchases: 0,
  };
}
```

**Tasks:**
- [ ] Create ShopComponent with full shop state
- [ ] Add helper functions for stock management
- [ ] Export from components/index.ts

#### 12.1.3: MarketStateComponent

**File:** `packages/core/src/components/MarketStateComponent.ts`

```typescript
import type { Component } from '../ecs/Component.js';

export interface ItemMarketStats {
  itemId: string;
  totalSupply: number;
  recentSales: number;      // Last 7 days
  recentPurchases: number;  // Last 7 days
  averagePrice: number;
  priceHistory: number[];   // Last 30 data points
  lastUpdated: number;
}

export interface MarketStateComponent extends Component {
  type: 'market_state';
  itemStats: Map<string, ItemMarketStats>;
  totalCurrency: number;
  dailyTransactionVolume: number;
  weeklyTransactionVolume: number;
  inflationRate: number;
  lastDayProcessed: number;
}

export function createMarketStateComponent(): MarketStateComponent {
  return {
    type: 'market_state',
    version: 1,
    itemStats: new Map(),
    totalCurrency: 0,
    dailyTransactionVolume: 0,
    weeklyTransactionVolume: 0,
    inflationRate: 0,
    lastDayProcessed: 0,
  };
}

export function getDemandMultiplier(stats: ItemMarketStats): number {
  const salesRatio = stats.recentSales / Math.max(stats.recentPurchases, 1);
  if (salesRatio > 2) return 1.5;
  if (salesRatio > 1.2) return 1.2;
  if (salesRatio > 0.8) return 1.0;
  if (salesRatio > 0.5) return 0.85;
  return 0.7;
}

export function getSupplyPenalty(stats: ItemMarketStats): number {
  const supplyRatio = stats.totalSupply / Math.max(stats.recentSales, 1);
  if (supplyRatio > 10) return 0.5;
  if (supplyRatio > 5) return 0.7;
  if (supplyRatio > 2) return 0.85;
  return 1.0;
}
```

**Tasks:**
- [ ] Create MarketStateComponent as singleton on world
- [ ] Add demand/supply calculation helpers
- [ ] Export from components/index.ts

---

### Phase 12.2: Value Calculation System (~300 LOC)

#### 12.2.1: Extend ItemDefinition

**File:** `packages/core/src/items/ItemDefinition.ts` (modify existing)

```typescript
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 5.0,
  legendary: 10.0,
};

// Add to ItemDefinition interface:
export interface ItemDefinition {
  // ... existing fields ...
  baseValue: number;        // Base price in currency
  rarity: ItemRarity;
}
```

**Tasks:**
- [ ] Add `baseValue` and `rarity` to ItemDefinition
- [ ] Update all existing item definitions with values
- [ ] Add RARITY_MULTIPLIERS constant

#### 12.2.2: PricingService

**File:** `packages/core/src/economy/PricingService.ts`

```typescript
import type { World } from '../ecs/World.js';
import type { ItemDefinition } from '../items/ItemDefinition.js';
import type { MarketStateComponent, ItemMarketStats } from '../components/MarketStateComponent.js';
import { getDemandMultiplier, getSupplyPenalty, RARITY_MULTIPLIERS } from '../components/MarketStateComponent.js';

export interface PriceBreakdown {
  baseValue: number;
  qualityMultiplier: number;
  rarityMultiplier: number;
  demandMultiplier: number;
  supplyPenalty: number;
  finalPrice: number;
}

export function calculateItemPrice(
  item: { definition: ItemDefinition; quality?: number },
  marketState: MarketStateComponent | undefined
): PriceBreakdown {
  const base = item.definition.baseValue;
  const quality = 0.5 + ((item.quality ?? 50) / 100) * 1.5; // 0.5 - 2.0
  const rarity = RARITY_MULTIPLIERS[item.definition.rarity] ?? 1.0;

  let demand = 1.0;
  let supply = 1.0;

  if (marketState) {
    const stats = marketState.itemStats.get(item.definition.id);
    if (stats) {
      demand = getDemandMultiplier(stats);
      supply = getSupplyPenalty(stats);
    }
  }

  const final = Math.floor(base * quality * rarity * demand * supply);

  return {
    baseValue: base,
    qualityMultiplier: quality,
    rarityMultiplier: rarity,
    demandMultiplier: demand,
    supplyPenalty: supply,
    finalPrice: Math.max(1, final),
  };
}

export function calculateBuyPrice(
  item: { definition: ItemDefinition; quality?: number },
  shop: { buyMarkup: number },
  marketState: MarketStateComponent | undefined
): number {
  const { finalPrice } = calculateItemPrice(item, marketState);
  return Math.ceil(finalPrice * shop.buyMarkup);
}

export function calculateSellPrice(
  item: { definition: ItemDefinition; quality?: number },
  shop: { sellMarkdown: number },
  marketState: MarketStateComponent | undefined
): number {
  const { finalPrice } = calculateItemPrice(item, marketState);
  return Math.floor(finalPrice * shop.sellMarkdown);
}
```

**Tasks:**
- [ ] Create PricingService with price calculation
- [ ] Implement buy/sell price helpers
- [ ] Export from economy/index.ts

---

### Phase 12.3: Trading System (~600 LOC)

#### 12.3.1: Trade Events

**File:** `packages/core/src/events/EventMap.ts` (add to existing)

```typescript
// Add to EventMap:
'trade:buy': {
  buyerId: EntityId;
  sellerId: EntityId;
  shopId?: EntityId;
  itemId: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
};

'trade:sell': {
  sellerId: EntityId;
  buyerId: EntityId;
  shopId?: EntityId;
  itemId: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
};

'trade:offer_made': {
  offererId: EntityId;
  targetId: EntityId;
  offeredItems: Array<{ itemId: string; quantity: number }>;
  requestedItems: Array<{ itemId: string; quantity: number }>;
  currencyOffered: number;
  currencyRequested: number;
};

'trade:offer_accepted': {
  offerId: string;
  offererId: EntityId;
  targetId: EntityId;
};

'trade:offer_rejected': {
  offerId: string;
  offererId: EntityId;
  targetId: EntityId;
  reason?: string;
};

'market:price_changed': {
  itemId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
};
```

**Tasks:**
- [ ] Add trade events to EventMap
- [ ] Add market events to EventMap

#### 12.3.2: TradingSystem

**File:** `packages/core/src/systems/TradingSystem.ts`

```typescript
import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../EventBus.js';
import type { ShopComponent } from '../components/ShopComponent.js';
import type { CurrencyComponent } from '../components/CurrencyComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { MarketStateComponent } from '../components/MarketStateComponent.js';
import { calculateBuyPrice, calculateSellPrice } from '../economy/PricingService.js';
import { getItemCount, removeItem, addItem } from '../components/InventoryComponent.js';
import { addCurrency } from '../components/CurrencyComponent.js';

export interface BuyResult {
  success: boolean;
  error?: string;
  totalPaid?: number;
}

export interface SellResult {
  success: boolean;
  error?: string;
  totalReceived?: number;
}

export class TradingSystem implements System {
  readonly id = 'trading';
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  update(_world: World, _deltaTime: number): void {
    // Trading is event-driven, no per-tick updates needed
  }

  buyFromShop(
    world: World,
    buyerId: string,
    shopEntityId: string,
    itemId: string,
    quantity: number
  ): BuyResult {
    // Implementation: validate, calculate price, transfer currency/items
    // Emit trade:buy event
  }

  sellToShop(
    world: World,
    sellerId: string,
    shopEntityId: string,
    itemId: string,
    quantity: number
  ): SellResult {
    // Implementation: validate, calculate price, transfer items/currency
    // Emit trade:sell event
  }

  updateMarketStats(world: World): void {
    // Called daily to update supply/demand stats
  }
}
```

**Tasks:**
- [ ] Create TradingSystem with buy/sell methods
- [ ] Implement shop validation (open hours, stock, funds)
- [ ] Implement currency/item transfers
- [ ] Emit trade events
- [ ] Update market statistics
- [ ] Register in demo/main.ts

#### 12.3.3: TradeActionHandler

**File:** `packages/core/src/actions/TradeActionHandler.ts`

```typescript
import type { ActionHandler, Action, ValidationResult, ExecutionResult } from './ActionHandler.js';
import type { World } from '../ecs/World.js';
import type { TradingSystem } from '../systems/TradingSystem.js';

export class TradeActionHandler implements ActionHandler {
  readonly actionType = 'trade';
  private tradingSystem: TradingSystem;

  constructor(tradingSystem: TradingSystem) {
    this.tradingSystem = tradingSystem;
  }

  validate(action: Action, world: World): ValidationResult {
    // Validate: actor exists, target exists, has required items/currency
  }

  execute(action: Action, world: World): ExecutionResult {
    const { subtype } = action.parameters;

    if (subtype === 'buy') {
      return this.executeBuy(action, world);
    } else if (subtype === 'sell') {
      return this.executeSell(action, world);
    }

    return { success: false, error: 'Unknown trade subtype' };
  }

  private executeBuy(action: Action, world: World): ExecutionResult {
    // Call tradingSystem.buyFromShop
  }

  private executeSell(action: Action, world: World): ExecutionResult {
    // Call tradingSystem.sellToShop
  }
}
```

**Tasks:**
- [ ] Create TradeActionHandler
- [ ] Add 'trade' to action types in AgentAction.ts
- [ ] Register handler in action system
- [ ] Add trade parsing in LLM response parser

---

### Phase 12.4: Shop Buildings (~300 LOC)

#### 12.4.1: Shop Building Blueprints

**File:** `packages/core/src/buildings/ShopBlueprints.ts`

```typescript
import type { BuildingBlueprint } from './BuildingBlueprint.js';

export const SHOP_BLUEPRINTS: BuildingBlueprint[] = [
  {
    type: 'general_store',
    name: 'General Store',
    description: 'Buys and sells common goods',
    category: 'economic',
    function: 'trade',
    tier: 2,
    size: { width: 3, height: 3 },
    buildCost: [
      { itemId: 'wood', quantity: 30 },
      { itemId: 'stone', quantity: 20 },
    ],
    buildTime: 200,
    workersRequired: 0,
    providesStorage: true,
    storageCapacity: 50,
  },
  {
    type: 'blacksmith',
    name: 'Blacksmith',
    description: 'Crafts and sells metal tools and weapons',
    category: 'economic',
    function: 'trade',
    tier: 2,
    size: { width: 3, height: 3 },
    buildCost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 40 },
      { itemId: 'iron_ingot', quantity: 10 },
    ],
    buildTime: 300,
    workersRequired: 1,
    providesStorage: false,
    storageCapacity: 0,
  },
  // ... more shop types
];

export function registerShopBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SHOP_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
```

**Tasks:**
- [ ] Create shop building blueprints
- [ ] Add general_store, blacksmith, farm_supply, tavern
- [ ] Register in BuildingBlueprintRegistry
- [ ] Update demo to register shop blueprints

#### 12.4.2: Shop Creation on Building Complete

**File:** `packages/core/src/systems/BuildingSystem.ts` (modify existing)

```typescript
// When a shop building is completed, create ShopComponent
if (isShopBuilding(buildingType)) {
  const shopComponent = createShopComponent(
    getShopType(buildingType),
    builderId,
    buildingBlueprint.name
  );
  entity.addComponent(shopComponent);
}
```

**Tasks:**
- [ ] Add shop component creation on building completion
- [ ] Map building types to shop types

---

### Phase 12.5: Trade Behavior (~400 LOC)

#### 12.5.1: TradeBehavior

**File:** `packages/core/src/behavior/behaviors/TradeBehavior.ts`

```typescript
import { BaseBehavior, type BehaviorContext, type BehaviorResult } from './BaseBehavior.js';

export class TradeBehavior extends BaseBehavior {
  readonly name = 'trade';

  protected phases = ['find_shop', 'move_to_shop', 'trading', 'complete'];

  update(context: BehaviorContext): BehaviorResult {
    const phase = this.getPhase(context);

    switch (phase) {
      case 'find_shop':
        return this.findNearestShop(context);
      case 'move_to_shop':
        return this.moveToShop(context);
      case 'trading':
        return this.executeTrade(context);
      case 'complete':
        return this.complete(context);
      default:
        return { done: true };
    }
  }

  private findNearestShop(context: BehaviorContext): BehaviorResult {
    // Find shops that buy/sell desired items
  }

  private moveToShop(context: BehaviorContext): BehaviorResult {
    // Navigate to shop
  }

  private executeTrade(context: BehaviorContext): BehaviorResult {
    // Execute buy or sell action
  }
}

export const tradeBehavior = new TradeBehavior();
```

**Tasks:**
- [ ] Create TradeBehavior with phases
- [ ] Implement shop finding (by item type)
- [ ] Implement movement to shop
- [ ] Implement trade execution
- [ ] Register in behavior registry

#### 12.5.2: LLM Decision Integration

**File:** `packages/core/src/decision/LLMDecisionProcessor.ts` (modify existing)

```typescript
// Add to action parsing:
if (cleaned.includes('buy') || cleaned.includes('purchase')) {
  const itemMatch = cleaned.match(/buy\s+(\w+)/);
  return {
    type: 'trade',
    subtype: 'buy',
    itemId: itemMatch?.[1] || 'food'
  };
}

if (cleaned.includes('sell')) {
  const itemMatch = cleaned.match(/sell\s+(\w+)/);
  return {
    type: 'trade',
    subtype: 'sell',
    itemId: itemMatch?.[1] || 'wood'
  };
}
```

**Tasks:**
- [ ] Add trade action parsing in LLMDecisionProcessor
- [ ] Add 'trade' behavior to behaviorState handling
- [ ] Test LLM trade decisions

---

### Phase 12.6: Economy Dashboard UI (~400 LOC)

#### 12.6.1: EconomyPanel

**File:** `packages/renderer/src/EconomyPanel.ts`

```typescript
import type { World, MarketStateComponent } from '@ai-village/core';

export class EconomyPanel {
  private visible = false;
  private panelWidth = 450;
  private panelHeight = 500;

  toggle(): void {
    this.visible = !this.visible;
  }

  render(ctx: CanvasRenderingContext2D, world: World): void {
    if (!this.visible) return;

    // Get market state from world
    const marketState = this.getMarketState(world);

    // Render sections:
    // - Village Economy Overview (total currency, daily volume)
    // - Price Trends (top 10 items with price changes)
    // - Recent Transactions
    // - Supply/Demand Indicators
  }

  private getMarketState(world: World): MarketStateComponent | undefined {
    // Find the market state entity
  }
}
```

**Tasks:**
- [ ] Create EconomyPanel UI
- [ ] Add economy overview section
- [ ] Add price trends visualization
- [ ] Add transaction history
- [ ] Create EconomyPanelAdapter for WindowManager
- [ ] Add 'E' key binding to toggle
- [ ] Register with WindowManager

---

### Phase 12.7: Trading UI (~400 LOC)

#### 12.7.1: ShopPanel

**File:** `packages/renderer/src/ShopPanel.ts`

```typescript
import type { World, ShopComponent, EntityId } from '@ai-village/core';

export class ShopPanel {
  private visible = false;
  private selectedShopId: EntityId | null = null;
  private selectedAgentId: EntityId | null = null;

  openShop(shopId: EntityId, agentId: EntityId): void {
    this.selectedShopId = shopId;
    this.selectedAgentId = agentId;
    this.visible = true;
  }

  render(ctx: CanvasRenderingContext2D, world: World): void {
    if (!this.visible || !this.selectedShopId) return;

    // Render:
    // - Shop name and type
    // - Shop inventory with prices (buy from shop)
    // - Agent inventory with prices (sell to shop)
    // - Buy/Sell buttons
    // - Currency display
  }

  handleClick(x: number, y: number, world: World): boolean {
    // Handle buy/sell button clicks
  }
}
```

**Tasks:**
- [ ] Create ShopPanel UI
- [ ] Display shop inventory with buy prices
- [ ] Display agent inventory with sell prices
- [ ] Implement buy/sell button handlers
- [ ] Create ShopPanelAdapter for WindowManager
- [ ] Open on shop building click

#### 12.7.2: TradeOfferPanel (Agent-to-Agent)

**File:** `packages/renderer/src/TradeOfferPanel.ts`

```typescript
export class TradeOfferPanel {
  private visible = false;
  private offer: TradeOffer | null = null;

  showOffer(offer: TradeOffer): void {
    this.offer = offer;
    this.visible = true;
  }

  render(ctx: CanvasRenderingContext2D, world: World): void {
    if (!this.visible || !this.offer) return;

    // Render:
    // - Offerer info
    // - Items/currency offered
    // - Items/currency requested
    // - Fairness indicator
    // - Accept/Reject/Counter buttons
  }
}
```

**Tasks:**
- [ ] Create TradeOfferPanel
- [ ] Add fairness calculation display
- [ ] Implement accept/reject handlers
- [ ] Subscribe to trade:offer_made events

---

### Phase 12.8: Market Events (~200 LOC)

#### 12.8.1: MarketEventSystem

**File:** `packages/core/src/systems/MarketEventSystem.ts`

```typescript
import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';

export type MarketEvent =
  | { type: 'merchant_arrival'; merchantId: string; duration: number }
  | { type: 'shortage'; itemCategory: string; priceIncrease: number }
  | { type: 'surplus'; itemCategory: string; priceDecrease: number }
  | { type: 'festival'; bonusDemand: Map<string, number> };

export class MarketEventSystem implements System {
  readonly id = 'market_events';
  private activeEvents: MarketEvent[] = [];
  private eventCheckInterval = 1200; // Check every minute at 20 TPS
  private lastCheck = 0;

  update(world: World, _deltaTime: number): void {
    // Periodically check for event triggers
    // Apply active event effects
    // Remove expired events
  }

  private checkForRandomEvents(world: World): void {
    // Small chance of shortage/surplus events
    // Festival events on special days
  }
}
```

**Tasks:**
- [ ] Create MarketEventSystem
- [ ] Implement random event triggers
- [ ] Apply price modifiers during events
- [ ] Emit market events
- [ ] Display event notifications

---

## File Summary

### New Files

| File | LOC | Description |
|------|-----|-------------|
| `components/CurrencyComponent.ts` | 80 | Currency balance and transactions |
| `components/ShopComponent.ts` | 100 | Shop state and stock |
| `components/MarketStateComponent.ts` | 120 | Global market statistics |
| `economy/PricingService.ts` | 100 | Price calculation |
| `economy/index.ts` | 20 | Economy module exports |
| `systems/TradingSystem.ts` | 250 | Core trading logic |
| `systems/MarketEventSystem.ts` | 150 | Random market events |
| `actions/TradeActionHandler.ts` | 120 | Trade action validation/execution |
| `behavior/behaviors/TradeBehavior.ts` | 200 | Agent trading behavior |
| `buildings/ShopBlueprints.ts` | 100 | Shop building definitions |
| `renderer/EconomyPanel.ts` | 200 | Economy dashboard UI |
| `renderer/ShopPanel.ts` | 200 | Shop trading UI |
| `renderer/TradeOfferPanel.ts` | 150 | Agent trade offer UI |
| `renderer/adapters/*Adapter.ts` | 100 | Window adapters |

### Modified Files

| File | Changes |
|------|---------|
| `items/ItemDefinition.ts` | Add baseValue, rarity |
| `items/defaultItems.ts` | Add values to all items |
| `events/EventMap.ts` | Add trade/market events |
| `actions/AgentAction.ts` | Add 'trade' action type |
| `decision/LLMDecisionProcessor.ts` | Add trade parsing |
| `systems/BuildingSystem.ts` | Create shop on build complete |
| `buildings/BuildingBlueprintRegistry.ts` | Register shop blueprints |
| `world/AgentEntity.ts` | Add CurrencyComponent |
| `demo/main.ts` | Register new systems and UI |
| `components/index.ts` | Export new components |
| `systems/index.ts` | Export new systems |

---

## Implementation Order

1. **Week 1: Core Components**
   - CurrencyComponent
   - ShopComponent
   - MarketStateComponent
   - PricingService
   - Add baseValue/rarity to items

2. **Week 2: Trading System**
   - Trade events in EventMap
   - TradingSystem
   - TradeActionHandler
   - Shop building blueprints

3. **Week 3: Agent Integration**
   - TradeBehavior
   - LLM decision integration
   - Shop creation on building complete

4. **Week 4: UI**
   - EconomyPanel
   - ShopPanel
   - TradeOfferPanel
   - Key bindings and window registration

5. **Week 5: Polish**
   - MarketEventSystem
   - Price history tracking
   - Testing and balancing

---

## Testing Strategy

### Unit Tests

- `CurrencyComponent.test.ts` - Balance operations, transaction history
- `ShopComponent.test.ts` - Stock management, pricing
- `PricingService.test.ts` - Price calculations
- `TradingSystem.test.ts` - Buy/sell validation and execution

### Integration Tests

- `Trading.integration.test.ts` - Full buy/sell flows
- `ShopBuilding.integration.test.ts` - Build shop, create ShopComponent
- `MarketDynamics.integration.test.ts` - Supply/demand effects on prices

---

## Dependencies

- Phase 10 (Crafting) - Item system with definitions
- Phase 11 (Animals) - Animal products for trade
- Inventory system - Item transfers
- Building system - Shop buildings

---

## Success Criteria

- [ ] Agents can buy items from shops
- [ ] Agents can sell items to shops
- [ ] Prices vary based on supply/demand
- [ ] Shop buildings can be constructed
- [ ] Economy dashboard shows market state
- [ ] LLM agents can decide to trade
- [ ] All tests pass
- [ ] Build succeeds
