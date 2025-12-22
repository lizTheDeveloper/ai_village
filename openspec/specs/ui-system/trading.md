# Trading UI Specification

## Overview

The Trading UI provides interfaces for agent-to-agent bartering, merchant trading, and inter-village commerce. Features offer/counter-offer negotiation, trade history, and reputation tracking.

## Version

0.1.0

## Dependencies

- `economy-system/spec.md` - Economy mechanics (Shop, ShopStock, ShopType, TradeOffer, MarketState, WanderingMerchant, Currency)
- `economy-system/inter-village-trade.md` - Inter-village trade
- `agent-system/relationship-system.md` - Trust and reputation
- `ui-system/inventory.md` - Item display

## Requirements

### REQ-TRADE-001: Trade Initiation
- **Description**: Start a trade between two parties
- **Priority**: MUST

```typescript
// Re-export from economy-system for reference
import type {
  Shop, ShopStock, ShopType, Currency,
  TradeOffer as EconomyTradeOffer,  // Has offerer, target, offering, requesting
  MarketState, ItemValue,
  WanderingMerchant, EconomicEvent
} from "economy-system/spec";

interface TradeInitiation {
  // Trade participants
  initiator: TradePartyDisplay;
  recipient: TradePartyDisplay;

  // Trade type
  tradeType: TradeType;

  // Methods
  requestTrade(initiator: EntityId, recipient: EntityId): TradeRequestDisplay;
  acceptTrade(requestId: string): TradeSession;
  declineTrade(requestId: string, reason?: string): void;
  cancelRequest(requestId: string): void;
}

// UI display wrapper for trade party
interface TradePartyDisplay {
  type: "agent" | "merchant" | "village" | "shop";
  entityId: EntityId;
  name: string;
  portrait: Sprite;

  // For shop types - uses Shop from economy-system
  shop?: Shop;

  // For merchant types - uses WanderingMerchant from economy-system
  merchant?: WanderingMerchant;

  // Inventory access
  availableItems: ItemStack[];
  currency: number;           // From Shop.currency if applicable

  // Reputation
  trustLevel: number;
  tradeHistory: number;
}

type TradeType =
  | "barter"         // Item for item
  | "purchase"       // Item for currency (from Shop)
  | "gift"           // One-way transfer
  | "diplomatic";    // Village-level trade

// EconomyTradeOffer from economy-system/spec.md:
// - offerer: string (Agent ID)
// - target: string (Agent ID)
// - offering: ItemStack[]
// - requesting: ItemStack[]
// - currencyOffered: number
// - currencyRequested: number
// - isCounterOffer: boolean
// - originalOfferId?: string
// - expiresAt: GameTime

// UI display wrapper for trade request
interface TradeRequestDisplay {
  id: string;
  initiator: TradePartyDisplay;
  recipient: TradePartyDisplay;
  tradeType: TradeType;

  // References economy-system TradeOffer
  economyOffer?: EconomyTradeOffer;

  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: number;
  expiresAt: number;

  // For AI response
  responseMessage: string | null;
}
```

### REQ-TRADE-002: Trade Window
- **Description**: Main trading interface showing both parties' offers
- **Priority**: MUST

```typescript
interface TradeWindow {
  isOpen: boolean;
  session: TradeSession;

  // Layout
  layout: TradeLayout;

  // Panels
  leftPanel: TradePanel;    // Initiator's side
  rightPanel: TradePanel;   // Recipient's side

  // Trade status
  tradeStatus: TradeStatus;

  // Methods
  open(session: TradeSession): void;
  close(): void;
  confirmTrade(): void;
  cancelTrade(): void;
}

interface TradeSession {
  id: string;
  parties: [TradeParty, TradeParty];

  // Offers
  leftOffer: TradeOffer;
  rightOffer: TradeOffer;

  // State
  status: TradeStatus;
  round: number;

  // Lock states
  leftLocked: boolean;
  rightLocked: boolean;

  // History
  offerHistory: OfferHistoryEntry[];
}

type TradeStatus =
  | "negotiating"    // Still modifying offers
  | "pending_lock"   // One side locked
  | "both_locked"    // Ready to confirm
  | "completed"      // Trade executed
  | "cancelled"      // Trade cancelled
  | "declined";      // Trade declined

interface TradeLayout {
  windowSize: Vector2;
  panelWidth: number;
  dividerWidth: number;

  // Sections
  showInventories: boolean;
  showOfferAreas: boolean;
  showValueComparison: boolean;
  showTradeButtons: boolean;
}
```

### REQ-TRADE-003: Trade Offer Panel
- **Description**: Display and modify trade offers
- **Priority**: MUST

```typescript
interface TradePanel {
  party: TradeParty;
  offer: TradeOffer;

  // Display areas
  inventoryArea: InventoryGrid;
  offerArea: OfferGrid;
  currencyDisplay: CurrencyDisplay;

  // Interaction
  isEditable: boolean;
  isLocked: boolean;

  // Methods
  addToOffer(item: ItemStack): void;
  removeFromOffer(item: ItemStack): void;
  setCurrencyOffer(amount: number): void;
}

interface TradeOffer {
  items: ItemStack[];
  currency: number;

  // Value calculation
  totalValue: number;

  // Validation
  isValid: boolean;
  validationErrors: string[];
}

interface OfferGrid {
  slots: OfferSlot[];
  maxSlots: number;

  // Drag-drop
  canAcceptDrop(item: ItemStack): boolean;
  handleDrop(item: ItemStack, slotIndex: number): void;

  // Visual
  emptySlotSprite: Sprite;
  highlightValidDrops: boolean;
}

interface OfferSlot {
  index: number;
  item: ItemStack | null;

  // Visual states
  isHighlighted: boolean;
  isHovered: boolean;

  // Actions
  onRightClick(): void;  // Remove from offer
}

interface CurrencyDisplay {
  label: string;
  currentAmount: number;
  offeredAmount: number;
  remainingAmount: number;

  // Input
  inputEnabled: boolean;
  minAmount: number;
  maxAmount: number;

  // Methods
  setAmount(amount: number): void;
  increment(delta: number): void;
}
```

### REQ-TRADE-004: Value Comparison
- **Description**: Show fairness of trade offers
- **Priority**: MUST

```typescript
// Uses ItemValue and MarketState from economy-system/spec.md for value calculation
// ItemValue from economy-system:
// - baseValue, qualityMultiplier, rarityMultiplier, demandMultiplier, supplyPenalty, finalValue

interface ValueComparison {
  leftValue: number;
  rightValue: number;

  // Uses MarketState from economy-system for calculations
  marketState: MarketState;

  // Difference
  valueDifference: number;
  differencePercent: number;

  // Fairness
  fairnessRating: FairnessRating;

  // Display
  showExactValues: boolean;
  showFairnessBar: boolean;
  showWarnings: boolean;
}

type FairnessRating =
  | "very_unfair_left"    // Left giving much more
  | "unfair_left"         // Left giving more
  | "fair"                // Roughly equal
  | "unfair_right"        // Right giving more
  | "very_unfair_right";  // Right giving much more

interface FairnessBar {
  position: Vector2;
  width: number;
  height: number;

  // Visual
  leftColor: Color;
  rightColor: Color;
  fairZoneColor: Color;

  // Indicator position (-1 to 1, 0 = fair)
  indicatorPosition: number;

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for value breakdown using economy-system's ItemValue
interface ValueBreakdownDisplay {
  // Itemized values using economy-system's ItemValue
  items: ItemValueDisplay[];
  currencyValue: number;
  totalValue: number;

  // Modifiers from economy-system calculation
  reputationModifier: number;
  bulkModifier: number;
  rarityModifier: number;
}

// UI display wrapper for ItemValue from economy-system
interface ItemValueDisplay {
  item: ItemStack;

  // From economy-system's ItemValue
  economyValue: ItemValue;  // baseValue, qualityMultiplier, rarityMultiplier, demandMultiplier, supplyPenalty, finalValue

  // UI formatting
  baseValueFormatted: string;
  modifiedValueFormatted: string;
  modifiers: ValueModifierDisplay[];
}

interface ValueModifierDisplay {
  name: string;
  multiplier: number;
  reason: string;
  formattedImpact: string;  // "+15%", "-10%", etc.
}
```

### REQ-TRADE-005: Negotiation Flow
- **Description**: Counter-offer and negotiation mechanics
- **Priority**: MUST

```typescript
interface NegotiationFlow {
  session: TradeSession;

  // Current round
  currentRound: number;
  maxRounds: number | null;

  // Offer states
  lastOffer: TradeOffer;
  counterOffer: TradeOffer | null;

  // Methods
  proposeOffer(): void;
  acceptOffer(): void;
  counterOffer(): void;
  walkAway(): void;
}

interface OfferHistoryEntry {
  round: number;
  party: TradeParty;
  offer: TradeOffer;
  action: OfferAction;
  timestamp: number;
}

type OfferAction =
  | "proposed"
  | "modified"
  | "accepted"
  | "countered"
  | "declined";

interface NegotiationButtons {
  // Action buttons
  proposeButton: Button;
  acceptButton: Button;
  counterButton: Button;
  cancelButton: Button;

  // State-dependent visibility
  showPropose: boolean;
  showAccept: boolean;
  showCounter: boolean;

  // Lock button
  lockButton: Button;
  isLocked: boolean;
}
```

### REQ-TRADE-006: Merchant Interface
- **Description**: Specialized UI for merchant NPCs
- **Priority**: SHOULD

```typescript
// Uses Shop, ShopStock, ShopType, WanderingMerchant from economy-system/spec.md
// Shop: id, name, owner, buildingId, type, stock: ShopStock[], currency, buyMarkup, sellMarkdown, haggleEnabled, openHours, daysOpen
// ShopStock: itemId, quantity, customPrice?, reserved
// ShopType: "general" | "farm_supply" | "blacksmith" | "tavern" | "apothecary" | "clothier" | "curiosity" | "player_shop"
// WanderingMerchant: id, name, specialty, exoticItems, wantsToBuy, arrivalTime, departureTime, location, buyMarkup, sellBonus

interface MerchantInterface {
  // Uses Shop or WanderingMerchant from economy-system
  shop?: Shop;
  wanderingMerchant?: WanderingMerchant;

  // Display wrapper
  merchantDisplay: MerchantDisplay;

  // Shop inventory display (wraps ShopStock[] from economy-system)
  shopInventoryDisplay: ShopInventoryDisplay;

  // Player resources
  playerInventory: ItemStack[];
  playerCurrency: number;

  // Pricing (computed from Shop.buyMarkup, Shop.sellMarkdown)
  buyPrices: Map<string, number>;
  sellPrices: Map<string, number>;
  priceModifier: number;      // Based on reputation

  // Categories
  categories: ShopCategoryDisplay[];
  selectedCategory: ShopCategoryDisplay | null;
}

// UI display wrapper for Shop or WanderingMerchant
interface MerchantDisplay {
  id: EntityId;
  name: string;
  portrait: Sprite;

  // From Shop or WanderingMerchant
  shopName: string;
  specialty: string;
  shopType: ShopType;  // From economy-system

  // From Shop.haggleEnabled
  haggleEnabled: boolean;

  // Reputation
  playerReputation: number;

  // From Shop.openHours and Shop.daysOpen
  isOpen: boolean;
  openHoursFormatted: string;  // "9:00 - 17:00"

  // For WanderingMerchant
  isWandering: boolean;
  departureTime?: GameTime;
}

// UI display wrapper for ShopStock[] from economy-system
interface ShopInventoryDisplay {
  // Wraps ShopStock from economy-system
  items: ShopItemDisplay[];

  // Display
  layout: "grid" | "list";
  sortBy: "name" | "price" | "category";

  // Filtering
  showAffordableOnly: boolean;
  searchQuery: string;
}

// UI display wrapper for ShopStock from economy-system
interface ShopItemDisplay {
  // From ShopStock in economy-system
  stock: ShopStock;

  // Resolved item data
  item: Item;
  quantity: number;          // From stock.quantity
  reserved: number;          // From stock.reserved

  // Prices (calculated from item value + Shop.buyMarkup/sellMarkdown)
  buyPrice: number;
  sellPrice: number;

  // Stock status
  inStock: boolean;          // quantity > reserved
  maxStock: number;
  restockRate: number;

  // Price modifiers applied
  priceModifier: number;
  priceModifierReason: string | null;  // From stock.customPrice if set
}

interface ShopCategoryDisplay {
  id: string;
  name: string;
  icon: Sprite;
  itemCount: number;
  shopType?: ShopType;  // From economy-system
}
```

### REQ-TRADE-007: Trade History
- **Description**: Record of past trades
- **Priority**: SHOULD

```typescript
interface TradeHistory {
  trades: TradeRecord[];

  // Filtering
  filterByParty: EntityId | null;
  filterByType: TradeType | null;
  filterByDateRange: DateRange | null;

  // Sorting
  sortBy: "date" | "value" | "party";
  sortDirection: "asc" | "desc";

  // Pagination
  pageSize: number;
  currentPage: number;
  totalPages: number;

  // Methods
  getTradesWith(partyId: EntityId): TradeRecord[];
  getTotalTradeValue(): number;
}

interface TradeRecord {
  id: string;
  timestamp: number;
  tradeType: TradeType;

  // Parties
  parties: [TradeParty, TradeParty];

  // What was traded
  leftOffer: TradeOffer;
  rightOffer: TradeOffer;

  // Outcome
  wasSuccessful: boolean;

  // Summary
  getSummary(): string;
}

interface TradeHistoryPanel {
  isOpen: boolean;
  history: TradeHistory;

  // Display
  showSummaryStats: boolean;
  showRecentTrades: boolean;
  showByTrader: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}

interface TradeStatistics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;

  totalValueTraded: number;
  averageTradeValue: number;

  mostTradedWith: TradeParty;
  mostTradedItem: Item;
}
```

### REQ-TRADE-008: Trust and Reputation
- **Description**: Display trust levels affecting trade
- **Priority**: SHOULD

```typescript
interface TrustDisplay {
  party: TradeParty;
  trustLevel: number;        // 0-1

  // Trust breakdown
  trustFactors: TrustFactor[];

  // Impact on trade
  priceModifier: number;
  creditLimit: number;
  specialDeals: boolean;
}

interface TrustFactor {
  name: string;
  impact: number;
  description: string;

  // Source
  source: "history" | "reputation" | "relationship" | "faction";
}

interface ReputationBadge {
  level: ReputationLevel;
  icon: Sprite;
  label: string;
  benefits: string[];
}

type ReputationLevel =
  | "hostile"
  | "unfriendly"
  | "neutral"
  | "friendly"
  | "trusted"
  | "honored";
```

### REQ-TRADE-009: Quick Trade
- **Description**: Simplified trade for simple transactions
- **Priority**: MAY

```typescript
interface QuickTrade {
  // Single item purchase
  item: ItemStack;
  price: number;

  // Quick actions
  buyOne(): void;
  buyAll(): void;
  sellOne(): void;
  sellAll(): void;

  // Quantity selector
  quantity: number;
  maxQuantity: number;

  // Total calculation
  totalPrice: number;
  canAfford: boolean;
}

interface QuickTradePopup {
  item: Item;
  mode: "buy" | "sell";

  // Pricing
  unitPrice: number;
  quantity: number;
  totalPrice: number;

  // Controls
  quantitySlider: Slider;
  confirmButton: Button;
  cancelButton: Button;

  // Display
  position: Vector2;
  showPriceBreakdown: boolean;
}
```

### REQ-TRADE-010: Trade Notifications
- **Description**: Alerts for trade-related events
- **Priority**: SHOULD

```typescript
// Uses EconomicEvent from economy-system/spec.md for market events
// EconomicEvent types: merchant_arrival, shortage, surplus, festival, trade_route, economic_boom, recession

interface TradeNotifications {
  // Incoming requests (uses TradeRequestDisplay from REQ-TRADE-001)
  onTradeRequest(request: TradeRequestDisplay): void;

  // Trade updates
  onOfferChanged(session: TradeSession): void;
  onTradeCompleted(record: TradeRecord): void;
  onTradeCancelled(session: TradeSession): void;

  // Merchant events (uses WanderingMerchant from economy-system)
  onMerchantArrived(merchant: WanderingMerchant): void;
  onMerchantLeaving(merchant: WanderingMerchant): void;
  onRestockComplete(shop: Shop): void;

  // Economic events (uses EconomicEvent from economy-system)
  onEconomicEvent(event: EconomicEvent): void;

  // Special offers
  onSpecialDeal(deal: SpecialDealDisplay): void;
}

// UI display wrapper for special deals
interface SpecialDealDisplay {
  // Uses WanderingMerchant or Shop from economy-system
  merchant?: WanderingMerchant;
  shop?: Shop;

  merchantDisplay: MerchantDisplay;
  item: Item;
  discount: number;
  expiresAt: number;
  reason: string;

  // Related to EconomicEvent if applicable
  economicEvent?: EconomicEvent;
}
```

### REQ-TRADE-011: Keyboard Shortcuts
- **Description**: Quick access for trading actions
- **Priority**: SHOULD

```typescript
interface TradeShortcuts {
  // Window controls
  closeWindow: string;         // Default: "Escape"

  // Offer actions
  lockOffer: string;           // Default: "L"
  confirmTrade: string;        // Default: "Enter"
  cancelTrade: string;         // Default: "X"

  // Quick transfer
  transferOne: string;         // Default: "Click"
  transferStack: string;       // Default: "Shift+Click"
  transferAll: string;         // Default: "Ctrl+Click"

  // Currency
  addCurrency: string;         // Default: "C"
  maxCurrency: string;         // Default: "Ctrl+C"

  // Navigation
  focusInventory: string;      // Default: "I"
  focusOffer: string;          // Default: "O"
}
```

## Visual Style

```typescript
interface TradeStyle {
  // Window
  windowBackground: Color;
  panelBackground: Color;
  dividerColor: Color;

  // Offer areas
  offerBackground: Color;
  offerBorderColor: Color;
  emptySlotColor: Color;

  // Value display
  fairColor: Color;            // Green
  unfairColor: Color;          // Red
  neutralColor: Color;         // White

  // Buttons
  confirmButtonColor: Color;
  cancelButtonColor: Color;
  lockButtonColor: Color;
  lockedButtonColor: Color;

  // Item display
  itemSlotSize: number;
  itemPadding: number;

  // Typography
  headerFont: PixelFont;
  valueFont: PixelFont;

  // 8-bit styling
  pixelScale: number;
  useBorders: boolean;
}
```

## State Management

```typescript
interface TradeState {
  // Market state from economy-system
  marketState: MarketState;

  // Active trades
  activeSession: TradeSession | null;
  pendingRequests: TradeRequestDisplay[];

  // History
  tradeHistory: TradeRecord[];

  // Shops and merchants from economy-system
  availableShops: Shop[];
  visitingMerchants: WanderingMerchant[];

  // UI state
  isWindowOpen: boolean;
  selectedTab: "trade" | "history" | "reputation" | "market";

  // Events - using economy-system types
  onTradeStarted: Event<TradeSession>;
  onTradeCompleted: Event<TradeRecord>;
  onTradeCancelled: Event<TradeSession>;
  onEconomicEvent: Event<EconomicEvent>;       // From economy-system
  onMerchantArrived: Event<WanderingMerchant>; // From economy-system
  onPriceChanged: Event<{ itemId: string; oldPrice: number; newPrice: number }>;
}
```

## Integration Points

- **Economy System**: Value calculation, currency
- **Inventory System**: Item transfer
- **Agent System**: Trade participants
- **Relationship System**: Trust modifiers
- **Notification System**: Trade alerts
