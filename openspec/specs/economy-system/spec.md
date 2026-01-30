# Shops and Economy System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The economy system manages currency, trading, shops, and dynamic pricing that adapts to supply and demand, enabling player-agents and AI to participate in a living market.

## Overview

The economy system manages currency, trading, shops, pricing, and economic simulation. Agents (including the player-agent) can buy, sell, trade, and run shops. The economy adapts dynamically to supply and demand, including for procedurally generated items.

**Scope:** This spec covers local village economy. For trade between villages, see `inter-village-trade.md`.

---

## Currency and Value

### Currency Types

```typescript
interface Currency {
  id: string;
  name: string;
  symbol: string;
  baseUnit: number;          // Smallest denomination

  // Conversion (if multiple currencies)
  exchangeRates: Map<string, number>;
}

// Default currency
const VillageCoins: Currency = {
  id: "coins",
  name: "Village Coins",
  symbol: "🪙",
  baseUnit: 1,
  exchangeRates: new Map()
};
```

### Value Calculation

```typescript
interface ItemValue {
  baseValue: number;         // Defined in item definition
  qualityMultiplier: number; // 0.5 - 2.0 based on quality
  rarityMultiplier: number;  // From rarity tier
  demandMultiplier: number;  // Current market demand
  supplyPenalty: number;     // Oversupply reduces value

  finalValue: number;        // Calculated sale price
}

function calculateItemValue(item: Item, market: MarketState): number {
  const base = item.definition.baseValue;
  const quality = 0.5 + (item.quality / 100) * 1.5; // 0.5 - 2.0
  const rarity = rarityMultipliers[item.definition.rarity];
  const demand = market.getDemandMultiplier(item.definition.id);
  const supply = market.getSupplyPenalty(item.definition.id);

  return Math.floor(base * quality * rarity * demand * supply);
}
```

---

## Requirements

### Requirement: Shop System

Shops SHALL enable buying and selling:

```typescript
interface Shop {
  id: string;
  name: string;
  owner: string;             // Agent ID (can be player)
  buildingId: string;
  type: ShopType;

  // Inventory
  stock: ShopStock[];
  currency: number;          // Shop's money reserve

  // Pricing
  buyMarkup: number;         // % above base value
  sellMarkdown: number;      // % below base value
  haggleEnabled: boolean;

  // Hours
  openHours: { start: number; end: number };
  daysOpen: number[];        // 0-6 for days of week
}

interface ShopStock {
  itemId: string;
  quantity: number;
  customPrice?: number;      // Override calculated price
  reserved: number;          // Reserved for orders
}

type ShopType =
  | "general"         // Buys/sells everything
  | "farm_supply"     // Seeds, tools, fertilizer
  | "blacksmith"      // Tools, metal goods
  | "tavern"          // Food, drinks
  | "apothecary"      // Potions, herbs
  | "clothier"        // Clothing, cloth
  | "curiosity"       // Rare items, artifacts
  | "player_shop";    // Player-run, any type
```

### Requirement: Trading Transactions

Trading SHALL follow this process:

#### Scenario: Agent buys from a shop
- **WHEN** an agent buys from a shop
- **THEN** the system SHALL:
  1. Verify shop is open
  2. Verify item in stock
  3. Calculate price (base * quality * markup)
  4. Verify buyer has sufficient currency
  5. IF haggleEnabled AND buyer attempts haggle
     - Calculate haggle success (trading skill vs owner skill)
     - Apply discount (5-20%) on success
  6. Transfer currency buyer → shop
  7. Transfer item shop → buyer
  8. Update market statistics
  9. Emit "trade:complete" event

#### Scenario: Agent sells to a shop
- **WHEN** an agent sells to a shop
- **THEN** the system SHALL:
  1. Verify shop is open
  2. Verify shop buys this item type
  3. Calculate price (base * quality * markdown)
  4. Verify shop has sufficient currency
  5. Apply haggle if attempted
  6. Transfer item seller → shop
  7. Transfer currency shop → seller
  8. Update market statistics

### Requirement: Player Shop Ownership

The player-agent SHALL be able to run shops:

#### Scenario: Player owns a shop building
- **WHEN** the player owns a shop building
- **THEN** the player SHALL be able to:
  - Set stock from personal inventory
  - Set custom prices per item
  - Set markup/markdown percentages
  - Set operating hours
  - Hire AI agent employees
  - View sales history
  - Collect profits

#### Scenario: Player is offline/not controlling
- **WHEN** the player is offline/not controlling
- **THEN** AI agents MAY:
  - Run the shop according to set rules
  - Restock from designated storage
  - Adjust prices within set bounds

---

## Market Simulation

### Requirement: Supply and Demand

The market SHALL simulate supply/demand:

```typescript
interface MarketState {
  // Track per item
  itemStats: Map<string, {
    totalSupply: number;      // Available in all shops
    recentSales: number;      // Last 7 days
    recentPurchases: number;  // Last 7 days
    averagePrice: number;     // Rolling average
    priceHistory: number[];   // Last 30 data points
  }>;

  // Demand calculation
  getDemandMultiplier(itemId: string): number;

  // Supply penalty
  getSupplyPenalty(itemId: string): number;
}

// Demand formula
function getDemandMultiplier(stats: ItemStats): number {
  const salesRatio = stats.recentSales / Math.max(stats.recentPurchases, 1);
  // High sales, low supply = high demand
  if (salesRatio > 2) return 1.5;      // Very high demand
  if (salesRatio > 1.2) return 1.2;    // High demand
  if (salesRatio > 0.8) return 1.0;    // Normal
  if (salesRatio > 0.5) return 0.85;   // Low demand
  return 0.7;                           // Very low demand
}

// Supply penalty
function getSupplyPenalty(stats: ItemStats): number {
  const supplyRatio = stats.totalSupply / Math.max(stats.recentSales, 1);
  // Oversupply reduces prices
  if (supplyRatio > 10) return 0.5;    // Massive oversupply
  if (supplyRatio > 5) return 0.7;     // High oversupply
  if (supplyRatio > 2) return 0.85;    // Slight oversupply
  return 1.0;                           // Normal/undersupply
}
```

### Requirement: Price Discovery for Generated Items

Generated items SHALL have prices determined dynamically:

#### Scenario: New item is generated
- **WHEN** a new item is generated
- **THEN** the economy system SHALL:
  1. Calculate base value from:
     - Sum of input material values
     - Crafting complexity bonus
     - Tier multiplier
     - Effect power valuation
  2. Apply rarity multiplier
  3. Set initial price with high uncertainty
  4. Track first N transactions
  5. Stabilize price based on actual market behavior
  6. Update similar items' valuations

```typescript
interface GeneratedItemPricing {
  itemId: string;
  calculatedBaseValue: number;
  uncertaintyRange: number;     // ±% variance
  transactionHistory: Transaction[];
  stabilized: boolean;          // After N transactions

  // Comparable items
  similarItems: string[];
  categoryAverage: number;
}
```

---

## Agent-to-Agent Trading

### Requirement: Direct Trading

Agents SHALL trade directly with each other:

```typescript
interface TradeOffer {
  offerer: string;           // Agent ID
  target: string;            // Agent ID
  offering: ItemStack[];
  requesting: ItemStack[];
  currencyOffered: number;
  currencyRequested: number;

  // Negotiation
  isCounterOffer: boolean;
  originalOfferId?: string;
  expiresAt: GameTime;
}
```

#### Scenario: Agent makes a trade offer
- **WHEN** an agent makes a trade offer
- **THEN** the target agent (AI or player) SHALL:
  1. Evaluate offer fairness:
     - Calculate total value of offering
     - Calculate total value of requesting
     - Consider relationship with offerer
     - Consider personal need for items
  2. Accept, reject, or counter
  3. IF player-agent, display UI for decision
  4. IF AI agent, use LLM to decide based on personality

### Requirement: Player Trading UI

The player SHALL have a trading interface:

#### Scenario: Player receives a trade offer
- **WHEN** the player receives a trade offer
- **THEN** the UI SHALL display:
  - Offerer's portrait and name
  - Items/currency offered (with values)
  - Items/currency requested (with values)
  - Fairness indicator
  - Accept/Reject/Counter buttons
  - Relationship status with offerer

---

## Economic Events

### Requirement: Market Events

The economy SHALL have dynamic events:

```typescript
type EconomicEvent =
  | { type: "merchant_arrival"; merchant: Merchant; duration: number }
  | { type: "shortage"; itemCategory: string; priceIncrease: number }
  | { type: "surplus"; itemCategory: string; priceDecrease: number }
  | { type: "festival"; bonusDemand: Map<string, number> }
  | { type: "trade_route"; connectedVillage: string; newItems: string[] }
  | { type: "economic_boom"; allPricesModifier: number }
  | { type: "recession"; allPricesModifier: number };
```

### Wandering Merchants

```typescript
interface WanderingMerchant {
  id: string;
  name: string;
  specialty: string;

  // Inventory
  exoticItems: ShopStock[];     // Items not normally available
  wantsToBuy: string[];         // Will pay premium for these

  // Visit
  arrivalTime: GameTime;
  departureTime: GameTime;
  location: Position;

  // Pricing
  buyMarkup: number;            // Higher for exotics
  sellBonus: number;            // Pays more for local goods
}
```

---

## Information Economy

Written works (books, newspapers, scrolls) are tradeable goods with unique value dynamics. See `agent-system/chroniclers.md` for how they're created.

### Requirement: Written Work Valuation

Written works SHALL have value based on content and provenance:

```typescript
interface WrittenWorkValue {
  workId: string;
  category: "written_work";

  // Base value factors
  authorReputation: number;       // 0-1, famous authors command premium
  contentSignificance: number;    // 0-1, importance of documented events
  accuracy: number;               // 0-1, verified information worth more
  uniqueness: number;             // 0-1, rare information is valuable

  // Scarcity
  copiesInExistence: number;
  copiesInThisVillage: number;
  isOriginal: boolean;            // Original manuscript vs copy

  // Age effects
  ageInSeasons: number;
  historicalAppreciation: number; // Old accurate works gain value

  // Final value calculation
  calculateValue(): number {
    const baseValue = 10;
    const reputationBonus = this.authorReputation * 20;
    const significanceBonus = this.contentSignificance * 30;
    const accuracyBonus = this.accuracy * 15;
    const uniquenessBonus = this.uniqueness * 25;
    const scarcityMultiplier = this.isOriginal ? 3 : (1 / Math.log2(this.copiesInExistence + 1));
    const ageBonus = this.accuracy > 0.7 ? Math.log2(this.ageInSeasons + 1) * 5 : 0;

    return Math.floor(
      (baseValue + reputationBonus + significanceBonus + accuracyBonus + uniquenessBonus + ageBonus)
      * scarcityMultiplier
    );
  }
}
```

### Requirement: Information as Commodity

Information itself has economic value:

```typescript
interface InformationEconomy {
  // What's valuable
  valuableInformation: {
    discoveries: "recipes, techniques, research results";
    distantNews: "events from other villages";
    secrets: "hidden locations, private dealings";
    predictions: "weather, market trends, harvest timing";
  };

  // How it's monetized
  monetization: {
    writtenWorks: "chroniclers sell books and newspapers";
    exclusiveNews: "first to know pays premium";
    consultations: "scholars advise for fee";
    subscriptions: "regular newspaper delivery";
  };

  // Information shops
  informationVenues: {
    library: "pay to access archives";
    newsstand: "buy newspapers";
    scholar: "pay for research consultation";
    tavern: "buy drinks to hear rumors (indirect)";
  };
}
```

### Requirement: Chronicler Economic Role

Chroniclers participate in economy as information producers:

#### Scenario: Chronicler completes a written work
- **WHEN** a chronicler completes a written work
- **THEN** the system SHALL:
  1. Calculate initial value based on content
  2. Chronicler may:
     - Sell to local library
     - Sell copies to merchants (for distant sale)
     - Give to patron (if sponsored)
     - Keep for personal archive
  3. Track sales and distribution
  4. Author reputation affects future work value
  5. Popular works may be copied (with permission or piracy)

---

## Village Economy Metrics

### Requirement: Economy Tracking

The system SHALL track village economy health:

```typescript
interface VillageEconomy {
  // Wealth
  totalCurrency: number;        // All agents + shops
  averageAgentWealth: number;

  // Activity
  dailyTransactionVolume: number;
  weeklyTransactionVolume: number;

  // Prices
  inflationRate: number;        // Price change over time
  priceStabilityIndex: number;  // Variance measure

  // Production
  dailyItemsProduced: Map<string, number>;
  dailyItemsConsumed: Map<string, number>;

  // Balance indicators
  giniCoefficient: number;      // Wealth inequality
  economicGrowth: number;       // Week-over-week
}
```

---

## Player Economy Features

### Requirement: Player Economic Actions

The player-agent SHALL have full economic capabilities:

```typescript
interface PlayerEconomicActions {
  // Shopping
  buyFromShop(shopId: string, itemId: string, quantity: number): Transaction;
  sellToShop(shopId: string, itemId: string, quantity: number): Transaction;

  // Trading
  makeTradeOffer(targetAgentId: string, offer: TradeOffer): void;
  respondToOffer(offerId: string, response: "accept" | "reject" | TradeOffer): void;

  // Shop management
  setShopPrices(shopId: string, prices: Map<string, number>): void;
  setShopStock(shopId: string, stock: ShopStock[]): void;
  collectShopProfits(shopId: string): number;

  // Currency
  checkBalance(): number;
  transferCurrency(targetId: string, amount: number): void;

  // Information
  viewMarketPrices(): MarketState;
  viewPriceHistory(itemId: string): number[];
}
```

---

## Economic Balance

### Requirement: Currency Sinks and Faucets

The economy SHALL maintain balance:

**Currency Faucets (money enters):**
- Selling to NPC merchants
- Quest rewards
- Resource discovery bonuses
- Generated item sales

**Currency Sinks (money exits):**
- Building construction costs
- Building maintenance
- Tool durability/repair
- Purchasing from NPC merchants
- Event participation fees

#### Scenario: Currency balance monitoring
- The system SHALL monitor currency_in vs currency_out
- **IF** currency_in > currency_out * 1.5 over 30 days
- **THEN** trigger mild inflation event
- **IF** currency_out > currency_in * 1.5 over 30 days
- **THEN** trigger economic stimulus event

### Requirement: Generated Item Economic Impact

Generated items SHALL not destabilize economy:

#### Scenario: New item is generated
- **WHEN** a new item is generated
- **THEN** the system SHALL:
  1. Evaluate economic impact:
     - Does it obsolete existing items?
     - What's its production cost?
     - What's its expected sale price?
  2. IF impact score > threshold
     - Increase production costs
     - Limit production quantity
     - Add special requirements
  3. Track economic metrics post-introduction
  4. Apply corrective adjustments if needed

---

## Alien Economic Systems

Different species may have fundamentally different economic structures that don't fit the currency/trade model.

### Post-Scarcity Economics

When technology eliminates material needs, economy transforms:

```typescript
interface PostScarcityEconomy {
  type: "post_scarcity";

  // No currency
  currency: null;

  // What matters instead
  valueSystems: {
    reputation: ReputationEconomy;
    attention: AttentionEconomy;
    access: AccessEconomy;
    favors: FavorNetwork;
  };

  // Resources
  resourceAvailability: "unlimited" | "effectively_unlimited";
  scarcityItems: string[];           // Few things still scarce
}

interface ReputationEconomy {
  // Reputation is the currency
  reputationScore: Map<string, number>;

  earnedBy: [
    "notable_achievements",
    "artistic_creation",
    "helping_others",
    "unique_expertise",
    "interesting_experiences",
  ];

  spentOn: [
    "attention_from_others",
    "participation_in_exclusive_events",
    "priority_access",
    "social_influence",
  ];

  // Reputation decay
  decayRate: number;                 // Must keep doing interesting things
  negativePossible: boolean;         // Can reputation go negative?
}

interface AttentionEconomy {
  // Time and attention are scarce
  attentionAsResource: {
    limited: true;
    tradeable: boolean;
    valuable: "very";
  };

  // Being interesting has value
  interestingness: Map<string, number>;

  // Boredom is poverty
  boredAgentsBehavior: "seek_novelty" | "create_drama" | "sublime";
}
```

```
Post-scarcity economic rules:

RESOURCE ACQUISITION:
  - Request anything material → receive it (from Minds/fabricators)
  - No payment required
  - No rationing for standard items
  - Only truly unique items require "payment"

WHAT HAS VALUE:
  - Reputation: "They did the interesting thing"
  - Experiences: "They were there when it happened"
  - Relationships: "Important people want to spend time with them"
  - Expertise: "They know how to do the unique thing"
  - Stories: "They have stories worth hearing"

TRANSACTIONS:
  - No shops (everything freely available)
  - No currency exchange
  - Favors exchanged informally
  - Reputation tracked socially, not formally

SCARCITY EXCEPTIONS:
  - Original artworks (copies free, originals have meaning)
  - Personal time of notable individuals
  - Participation in exclusive events
  - Risk/adventure opportunities
```

### Hive Collective Economics

Hives have no individual ownership:

```typescript
interface HiveEconomy {
  type: "hive_collective";
  hiveId: string;

  // Resources owned by HIVE, not individuals
  collectiveResources: HiveResources;

  // No individual wealth
  individualOwnership: false;

  // Distribution
  distributionMethod: "need_based" | "caste_allocation" | "queen_directed";
}

interface HiveResources {
  // Pooled resources
  foodStores: number;
  buildingMaterials: number;
  specializedResources: Map<string, number>;

  // Production
  dailyProduction: Map<string, number>;
  productionAssignments: Map<string, string[]>;  // Resource → worker IDs

  // Consumption
  dailyConsumption: Map<string, number>;
  consumptionByCaste: Map<string, Map<string, number>>;
}

interface HiveResourceAllocation {
  // Queen/hive mind allocates
  allocator: "queen" | "hive_mind" | "instinctive";

  // Allocation rules
  priorities: [
    "queen_needs",
    "larva_feeding",
    "soldier_equipment",
    "worker_maintenance",
    "expansion",
    "storage",
  ];

  // Workers don't "own" tools
  toolAssignment: Map<string, string>;  // Worker → tool (temporary)
}
```

```
Hive economic rules:

OWNERSHIP:
  - All resources belong to hive
  - Workers have no personal property
  - Tools assigned, not owned
  - No inheritance (workers don't reproduce)

PRODUCTION:
  - Workers produce for hive
  - No wages, no payment
  - Production quotas assigned
  - Specialization by caste

CONSUMPTION:
  - Workers fed by hive
  - Needs met according to caste
  - No luxury for workers
  - Queen may have luxuries

TRADE WITH OUTSIDE:
  - Hive trades as single entity
  - Representatives negotiate on behalf of hive
  - All incoming resources go to collective
  - Workers don't personally trade
```

### Dominance-Based Economics

Resources flow to the dominant:

```typescript
interface DominanceEconomy {
  type: "dominance_based";

  // Dominance hierarchy IS the economy
  hierarchy: DominanceHierarchy;

  // Resources flow upward
  tributeSystem: TributeFlow;

  // Weakness = poverty
  resourceDistribution: "by_rank";
}

interface DominanceHierarchy {
  ranks: Map<string, number>;        // Agent → rank (0 = top)

  // Rank determines everything
  rankPrivileges: Map<number, {
    resourceAccess: number;          // 0-1
    tributeReceived: number;         // From those below
    tributePaid: number;             // To those above
  }>;
}

interface TributeFlow {
  // Subordinates give to superiors
  tributeRates: Map<number, number>; // Rank → % of resources up

  // What counts as tribute
  tributeTypes: ["food", "valuables", "service", "information"];

  // Failure to tribute
  failureConsequence: "challenge" | "punishment" | "death";
}

// Kif-style: Weakness is death
interface KifEconomics extends DominanceEconomy {
  // Taking is expected
  mightMakesRight: true;

  // Generosity is weakness
  givingFreely: "sign_of_weakness";

  // Only trade if can't take
  tradeReason: "mutual_deterrence";

  // Property rights
  propertyRights: "backed_by_force";
}
```

```
Dominance economic rules:

OWNERSHIP:
  - Own what you can hold
  - Taking from weaker is expected
  - Defending possessions is necessary
  - Can't defend it? Don't own it.

PRODUCTION:
  - Subordinates produce
  - Dominants take portion
  - Producing without protection = being robbed

TRADE:
  - Only trade with equals (can't take from them)
  - Trading with weaker = weakness (why not just take?)
  - Trade implies mutual respect/fear

ECONOMIC RISE:
  - Gain resources by gaining rank
  - Gain rank by defeating superiors
  - More resources = more subordinates = more power

ECONOMIC FALL:
  - Lose a challenge = lose everything
  - Subordinates immediately abandon you
  - Resources seized by victor
```

### Pack Mind Economics

Pack minds share resources as single entity:

```typescript
interface PackMindEconomy {
  type: "pack_shared";
  packId: string;

  // One inventory for whole pack
  sharedInventory: ItemStack[];

  // One currency pool
  sharedCurrency: number;

  // No internal economy
  internalTrade: false;

  // Bodies don't own separately
  perBodyOwnership: false;
}

interface PackEconomicBehavior {
  // External trade
  tradeAsOneEntity: true;
  representativeBodies: string[];    // Which bodies can negotiate

  // Resource gathering
  gatheringCoordination: true;       // Bodies coordinate harvesting
  pooledGathering: true;             // All gathering goes to shared

  // Consumption
  needsDistribution: "as_needed";    // Bodies take what they need
  noInternalAccounting: true;        // Don't track who consumed what
}
```

```
Pack economic rules:

OWNERSHIP:
  - Pack owns things, not bodies
  - "My" means "the pack's"
  - All bodies access shared resources
  - No concept of body-specific property

EARNING:
  - Any body's work benefits pack
  - Specialization by body role
  - No internal wages or shares

SPENDING:
  - Unanimous (pack decides as one)
  - Or consensus if pack disagrees internally
  - Bodies don't make independent purchases

TRADE:
  - Pack negotiates as one mind
  - May use multiple bodies for dramatic effect
  - Others may be confused about who to pay
```

### Gift Economies

Some cultures operate on gift exchange:

```typescript
interface GiftEconomy {
  type: "gift";

  // No currency, only gifts
  currency: null;

  // Obligation networks
  obligationWeb: ObligationNetwork;

  // Prestige from giving
  prestigeFromGenerosity: true;

  // Shame from hoarding
  shameFromAccumulation: true;
}

interface ObligationNetwork {
  // Who owes whom
  obligations: Map<string, Obligation[]>;

  // Gift creates obligation
  giftCreatesObligation: boolean;

  // Obligation decay
  obligationDecay: number;           // Days until forgotten
}

interface Obligation {
  from: string;
  to: string;
  originalGift: string;
  giftValue: number;
  createdAt: GameTime;
  fulfilled: boolean;
  fulfilledWith?: string;
}

// Potlatch-style: Competitive giving
interface CompetitiveGiftEconomy extends GiftEconomy {
  // Giving more = higher status
  prestigeFromLargerGifts: true;

  // Receiving obligates response
  mustReciprocate: true;

  // Failure to match = loss of status
  failureToMatchGift: "status_loss";

  // Giving beyond means
  stretchGiving: "expected";
}
```

```
Gift economy rules:

ACQUISITION:
  - Receive as gifts
  - Request would be shameful
  - Must appear surprised/grateful

GIVING:
  - Give generously = prestige
  - Hoard = shame
  - Calculating return = shameful
  - Pretend gifts are freely given

OBLIGATION:
  - Receiving creates obligation
  - Must reciprocate (but not immediately)
  - Greater gift = greater obligation
  - Matching gifts releases obligation

TRADE (as seen from outside):
  - Looks like barter but isn't
  - Explicit negotiation is shameful
  - Must pretend both sides are giving gifts
  - "Oh, you shouldn't have!"
```

### Symbiont Shared Economics

Joined beings have complex resource handling:

```typescript
interface SymbiontEconomy {
  // Two entities, one economic unit
  hostId: string;
  symbiontId: string;
  joinedId: string;

  // Shared resources
  sharedInventory: ItemStack[];
  sharedCurrency: number;

  // Decision-making
  economicDecisions: "host" | "symbiont" | "joint" | "dominant";

  // Inherited wealth
  symbiontBringsWealth: boolean;     // From previous hosts
  symbiontPersonalProperty: ItemStack[]; // Not shared with host
}

interface JoinedEconomicRights {
  // Who can spend
  hostSpending: "unrestricted" | "joint_approval" | "restricted";
  symbiontSpending: "unrestricted" | "joint_approval" | "restricted";

  // Inherited complications
  previousHostDebts: Debt[];
  previousHostCredits: Credit[];

  // On separation/death
  onHostDeath: "symbiont_inherits" | "estate_distributed" | "complex";
  onSymbiontTransfer: "wealth_stays_with_host" | "wealth_follows_symbiont" | "split";
}
```

---

## Open Questions

1. Interest/loans system?
2. Contracts and orders?
3. Economic competition between agents?
4. Taxation/village treasury?
5. Economic victory conditions?
6. How do post-scarcity cultures trade with scarcity cultures?
7. Can a pack mind have debts to individuals within it?
8. How does hive economy handle trade with individualist species?

---

## Related Specs

**Core Integration:**
- `items-system/spec.md` - Item values, trading
- `agent-system/spec.md` - Trading skill
- `construction-system/spec.md` - Shop buildings
- `game-engine/spec.md` - Event system

**Economy Sub-Systems:**
- `economy-system/inter-village-trade.md` - Trade routes, caravans, merchants
- `world-system/abstraction-layers.md` - Aggregate trade at abstract layer

**Related Systems:**
- `agent-system/chroniclers.md` - Information economy, written works as tradeable goods
- `animal-system/spec.md` - Animal products and livestock trade
- `research-system/spec.md` - Discovery value and research costs
