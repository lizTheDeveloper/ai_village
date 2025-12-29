# Quality Appraisal & Trading System

## Overview

Implement a D&D-inspired item identification/appraisal system where agents don't automatically know the true quality of items. This creates opportunities for skilled appraisers, deceptive trades, lucky finds, and economic specialization.

## Core Concept: Perceived vs True Quality

Every item has two quality values:
- **True Quality**: The actual quality (0-100), affects crafting results, food nutrition, tool durability
- **Perceived Quality**: What an agent *believes* the quality is (can be wrong)

Until an agent appraises an item, they see only perceived quality (which may be a rough estimate, completely wrong, or unknown).

## D&D Mechanics Adapted

| D&D Concept | Game Adaptation |
|-------------|-----------------|
| Identify spell | Full appraisal (reveals exact quality) |
| Appraise skill check | Skill + d20 vs DC determines accuracy |
| Detect Magic | Quick glance gives quality tier, not exact value |
| Cursed items | Items that appear high-quality but are actually poor |
| Expertise | High-skill specialists get advantage on appraisals |

---

## Part 1: Appraisal Skill

### Add to SkillId

```typescript
export type SkillId =
  | 'building'
  | 'farming'
  | 'gathering'
  | 'cooking'
  | 'crafting'
  | 'social'
  | 'exploration'
  | 'combat'
  | 'animal_handling'
  | 'medicine'
  | 'appraisal';  // NEW
```

### Skill Levels & Effects

| Level | Name | Appraisal Ability |
|-------|------|-------------------|
| 0 | Untrained | Can only see quality tier (poor/normal/fine/etc), ±30 error |
| 1 | Novice | ±20 quality error, can detect "feels wrong" on fakes |
| 2 | Apprentice | ±15 quality error, identifies item category bonuses |
| 3 | Journeyman | ±10 quality error, advantage on familiar item types |
| 4 | Expert | ±5 quality error, can appraise without handling |
| 5 | Master | Exact quality, can detect tampering/forgery |

### Synergies

Appraisal synergizes with domain skills:
- **Appraisal + Crafting**: Bonus when appraising crafted goods (tools, furniture)
- **Appraisal + Cooking**: Bonus when appraising food quality
- **Appraisal + Farming**: Bonus when appraising crops and seeds
- **Appraisal + Gathering**: Bonus when appraising raw materials

```typescript
const APPRAISAL_SYNERGIES: SkillSynergy[] = [
  {
    id: 'keen_craftsman_eye',
    name: "Craftsman's Eye",
    skills: ['appraisal', 'crafting'],
    qualityBonus: 0,
    xpSharing: 0.15,
    speedBonus: 0,
    appraisalBonus: 10,  // NEW: reduces error by 10 for crafted items
  },
  {
    id: 'market_farmer',
    name: 'Market Farmer',
    skills: ['appraisal', 'farming'],
    qualityBonus: 0,
    xpSharing: 0.15,
    speedBonus: 0,
    appraisalBonus: 10,
  },
];
```

---

## Part 2: Item Knowledge Component

Track what each agent knows about items they've encountered.

### ItemKnowledgeComponent

```typescript
interface ItemAppraisal {
  itemId: string;
  slotIndex: number;           // Which inventory slot (items are unique per slot)
  trueQuality: number;         // Actual quality (hidden until revealed)
  perceivedQuality: number;    // What agent thinks quality is
  confidence: AppraisalConfidence;
  appraiserAgentId?: string;   // Who appraised it (for trust chains)
  appraisalTick?: number;      // When it was appraised
}

type AppraisalConfidence =
  | 'unknown'      // Never examined, no idea
  | 'guess'        // Quick glance, knows tier only
  | 'estimated'    // Casual appraisal, ±15-30 error possible
  | 'appraised'    // Formal appraisal, ±5-15 error possible
  | 'verified'     // Master appraisal or self-crafted, exact value known

interface ItemKnowledgeComponent extends Component {
  type: 'item_knowledge';

  // Per-item appraisals (keyed by "itemId:slotIndex" or unique item UUID)
  appraisals: Map<string, ItemAppraisal>;

  // Remembered market prices (for haggling)
  priceMemory: Map<string, { price: number; tick: number; shopId: string }>;

  // Trusted appraisers (agents whose appraisals this agent believes)
  trustedAppraisers: Set<string>;
}
```

### Self-Crafted Items

When an agent crafts an item, they automatically know its true quality:

```typescript
// In CraftingSystem, after crafting completes:
const knowledge = entity.getComponent<ItemKnowledgeComponent>('item_knowledge');
if (knowledge) {
  knowledge.appraisals.set(itemKey, {
    itemId: craftedItem.id,
    slotIndex: targetSlot,
    trueQuality: calculatedQuality,
    perceivedQuality: calculatedQuality,  // They know exactly
    confidence: 'verified',
    appraiserAgentId: entity.id,
    appraisalTick: world.currentTick,
  });
}
```

---

## Part 3: Appraisal Mechanics

### Appraisal Check (D20-style)

```typescript
interface AppraisalResult {
  success: boolean;
  perceivedQuality: number;
  confidence: AppraisalConfidence;
  error: number;  // Difference from true quality (can be negative)
  criticalSuccess: boolean;  // Nat 20 equivalent
  criticalFailure: boolean;  // Nat 1 equivalent
}

function performAppraisal(
  appraiser: Entity,
  item: { itemId: string; trueQuality: number; category: ItemCategory },
  appraisalType: 'quick' | 'careful' | 'thorough'
): AppraisalResult {
  const skills = appraiser.getComponent<SkillsComponent>('skills');
  const appraisalLevel = skills?.skills.appraisal?.level ?? 0;

  // Base DC depends on how far from "normal" (50) the quality is
  // Extreme qualities are harder to judge
  const qualityDeviation = Math.abs(item.trueQuality - 50);
  const baseDC = 10 + Math.floor(qualityDeviation / 10);

  // Roll d20 + skill modifier
  const roll = Math.floor(Math.random() * 20) + 1;
  const skillMod = appraisalLevel * 2;  // +2 per level
  const synergyBonus = getSynergyBonusForCategory(skills, item.category);

  // Appraisal type modifiers
  const typeModifiers = {
    quick: { timeCost: 1, dcMod: 5, maxConfidence: 'guess' },
    careful: { timeCost: 5, dcMod: 0, maxConfidence: 'estimated' },
    thorough: { timeCost: 20, dcMod: -5, maxConfidence: 'appraised' },
  };
  const typeMod = typeModifiers[appraisalType];

  const totalRoll = roll + skillMod + synergyBonus;
  const adjustedDC = baseDC + typeMod.dcMod;

  // Critical success/failure (nat 20/1)
  const critSuccess = roll === 20;
  const critFail = roll === 1;

  // Calculate error based on success margin
  let error: number;
  let confidence: AppraisalConfidence;

  if (critSuccess) {
    // Natural 20: Perfect appraisal
    error = 0;
    confidence = 'verified';
  } else if (critFail) {
    // Natural 1: Wildly wrong
    error = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.floor(Math.random() * 20));
    confidence = 'guess';
  } else if (totalRoll >= adjustedDC + 10) {
    // Beat DC by 10+: Excellent appraisal
    error = Math.floor((Math.random() - 0.5) * 6);  // ±3
    confidence = appraisalLevel >= 4 ? 'verified' : 'appraised';
  } else if (totalRoll >= adjustedDC) {
    // Beat DC: Good appraisal
    const baseError = getBaseErrorForLevel(appraisalLevel);
    error = Math.floor((Math.random() - 0.5) * baseError * 2);
    confidence = typeMod.maxConfidence;
  } else {
    // Failed DC: Poor appraisal
    const failMargin = adjustedDC - totalRoll;
    error = Math.floor((Math.random() - 0.5) * (20 + failMargin * 2));
    confidence = 'guess';
  }

  // Clamp perceived quality to valid range
  const perceivedQuality = Math.max(0, Math.min(100, item.trueQuality + error));

  return {
    success: totalRoll >= adjustedDC,
    perceivedQuality,
    confidence,
    error,
    criticalSuccess: critSuccess,
    criticalFailure: critFail,
  };
}

function getBaseErrorForLevel(level: SkillLevel): number {
  const errors = [30, 20, 15, 10, 5, 0];
  return errors[level];
}
```

---

## Part 4: Trading Integration

### Modified TradingSystem.sellToShop

```typescript
public sellToShop(
  world: World,
  sellerId: EntityId,
  shopEntityId: EntityId,
  itemId: string,
  quantity: number,
  slotIndex?: number  // NEW: specify which slot to sell from
): TradeResult {
  // ... existing validation ...

  const sellerKnowledge = seller.getComponent<ItemKnowledgeComponent>('item_knowledge');
  const shopKnowledge = shop.getComponent<ItemKnowledgeComponent>('item_knowledge');

  // Get true quality from inventory
  const slot = sellerInventory.slots[slotIndex];
  const trueQuality = slot.quality ?? DEFAULT_QUALITY;

  // What does the SELLER think it's worth?
  const sellerAppraisal = sellerKnowledge?.appraisals.get(`${itemId}:${slotIndex}`);
  const sellerPerceivedQuality = sellerAppraisal?.perceivedQuality ?? DEFAULT_QUALITY;

  // What does the SHOP think it's worth?
  // Shop may do its own appraisal or trust the seller
  let shopPerceivedQuality: number;

  if (shopKnowledge) {
    const existingAppraisal = shopKnowledge.appraisals.get(`${itemId}:incoming`);
    if (existingAppraisal) {
      shopPerceivedQuality = existingAppraisal.perceivedQuality;
    } else {
      // Shop appraises incoming goods
      const shopOwner = world.getEntity(shopComponent.ownerId);
      const appraisalResult = performAppraisal(shopOwner, {
        itemId,
        trueQuality,
        category: itemDef.category,
      }, 'careful');
      shopPerceivedQuality = appraisalResult.perceivedQuality;
    }
  } else {
    shopPerceivedQuality = DEFAULT_QUALITY;
  }

  // Price negotiation based on perceived qualities
  const sellerAskingPrice = calculateSellPrice(
    { definition: itemDef, quality: sellerPerceivedQuality },
    shopComponent,
    marketState
  );

  const shopOfferPrice = calculateSellPrice(
    { definition: itemDef, quality: shopPerceivedQuality },
    shopComponent,
    marketState
  );

  // Final price is negotiated (see Part 5: Haggling)
  const finalPrice = negotiatePrice(seller, shopOwner, sellerAskingPrice, shopOfferPrice);

  // ... rest of transaction ...
}
```

### Modified TradingSystem.buyFromShop

```typescript
public buyFromShop(
  world: World,
  buyerId: EntityId,
  shopEntityId: EntityId,
  itemId: string,
  quantity: number
): TradeResult {
  // ... existing validation ...

  const buyerKnowledge = buyer.getComponent<ItemKnowledgeComponent>('item_knowledge');

  // Shop knows true quality of its own stock
  const stockSlot = shopComponent.stock.find(s => s.itemId === itemId);
  const trueQuality = stockSlot.quality ?? DEFAULT_QUALITY;

  // What does the BUYER think it's worth?
  // Buyer can request to appraise before buying
  let buyerPerceivedQuality: number;

  const existingAppraisal = buyerKnowledge?.appraisals.get(`${itemId}:shop:${shopEntityId}`);
  if (existingAppraisal) {
    buyerPerceivedQuality = existingAppraisal.perceivedQuality;
  } else {
    // Buyer only sees quality tier without appraisal
    buyerPerceivedQuality = DEFAULT_QUALITY;  // Assumes average
  }

  // Shop prices based on TRUE quality (they know their stock)
  const shopAskingPrice = calculateBuyPrice(
    { definition: itemDef, quality: trueQuality },
    shopComponent,
    marketState
  );

  // Buyer's perceived value
  const buyerPerceivedValue = calculateBuyPrice(
    { definition: itemDef, quality: buyerPerceivedQuality },
    shopComponent,
    marketState
  );

  // Buyer decides if it's a good deal
  if (buyerPerceivedValue < shopAskingPrice * 0.8) {
    // Buyer thinks it's overpriced - may haggle or walk away
    // ... haggling logic ...
  }

  // ... rest of transaction ...
}
```

---

## Part 5: Haggling System

When perceived values differ, agents can haggle.

### Haggling Mechanics

```typescript
interface HaggleState {
  sellerId: EntityId;
  buyerId: EntityId;
  itemId: string;
  sellerAsk: number;
  buyerOffer: number;
  rounds: number;
  maxRounds: number;
}

function negotiatePrice(
  seller: Entity,
  buyer: Entity,
  sellerAsk: number,
  buyerOffer: number
): number {
  // Quick resolution for close prices
  if (Math.abs(sellerAsk - buyerOffer) / sellerAsk < 0.1) {
    return (sellerAsk + buyerOffer) / 2;
  }

  // Haggling check: Social skill vs Social skill
  const sellerSocial = seller.getComponent<SkillsComponent>('skills')?.skills.social?.level ?? 0;
  const buyerSocial = buyer.getComponent<SkillsComponent>('skills')?.skills.social?.level ?? 0;

  const sellerRoll = Math.floor(Math.random() * 20) + 1 + sellerSocial * 2;
  const buyerRoll = Math.floor(Math.random() * 20) + 1 + buyerSocial * 2;

  // Winner gets more favorable price
  const priceDiff = sellerAsk - buyerOffer;
  if (sellerRoll > buyerRoll) {
    // Seller wins: price closer to ask
    const advantage = (sellerRoll - buyerRoll) / 20;
    return buyerOffer + priceDiff * (0.5 + advantage * 0.5);
  } else {
    // Buyer wins: price closer to offer
    const advantage = (buyerRoll - sellerRoll) / 20;
    return sellerAsk - priceDiff * (0.5 + advantage * 0.5);
  }
}
```

---

## Part 6: Deception & Trust

### Deceptive Selling

Agents can attempt to misrepresent item quality:

```typescript
interface DeceptionAttempt {
  actualQuality: number;
  claimedQuality: number;
  deceptionCheck: number;  // Seller's Social roll
  insightCheck: number;    // Buyer's Appraisal roll
}

function attemptDeception(
  seller: Entity,
  buyer: Entity,
  item: { trueQuality: number }
): { success: boolean; detected: boolean } {
  const sellerSocial = getSkillLevel(seller, 'social');
  const buyerAppraisal = getSkillLevel(buyer, 'appraisal');

  // Deception: Social skill
  const deceptionRoll = d20() + sellerSocial * 2;

  // Insight: Appraisal skill
  const insightRoll = d20() + buyerAppraisal * 2;

  // Larger lies are harder to sell
  const lieSize = Math.abs(item.claimedQuality - item.trueQuality);
  const liePenalty = Math.floor(lieSize / 10);

  const success = deceptionRoll - liePenalty > insightRoll;
  const detected = insightRoll > deceptionRoll + 5;

  return { success, detected };
}
```

### Trust System

Agents remember who deceived them:

```typescript
interface TrustRecord {
  agentId: EntityId;
  trustLevel: number;        // -100 to 100
  successfulTrades: number;
  deceptionsDetected: number;
  lastInteraction: number;
}

// In ItemKnowledgeComponent:
interface ItemKnowledgeComponent {
  // ... existing fields ...

  trustRecords: Map<EntityId, TrustRecord>;
}

// Buyers are more skeptical of untrusted sellers:
function getSkepticismModifier(buyer: Entity, seller: Entity): number {
  const trust = buyer.getComponent<ItemKnowledgeComponent>('item_knowledge')
    ?.trustRecords.get(seller.id);

  if (!trust) return 0;  // Unknown seller, neutral
  if (trust.trustLevel < -20) return -5;  // Distrusted, harder to sell
  if (trust.trustLevel > 50) return 3;    // Trusted, easier to sell
  return 0;
}
```

---

## Part 7: UI Integration

### Inventory Display

```
┌─────────────────────────────────────────┐
│ INVENTORY                               │
├─────────────────────────────────────────┤
│ [1] Oak Wood x5         [???]           │  ← Unknown quality
│ [2] Wheat x10           [Fine?]         │  ← Estimated as Fine
│ [3] Iron Sword x1       [Masterwork ✓]  │  ← Verified masterwork
│ [4] Healing Herb x3     [Normal~]       │  ← Appraised, ~normal
└─────────────────────────────────────────┘

Legend:
  [???]         = Never examined
  [Tier?]       = Quick glance, tier only
  [Tier~]       = Estimated, could be wrong
  [Tier]        = Appraised, high confidence
  [Tier ✓]      = Verified, exact quality known
```

### Appraisal Action

Right-click item → "Appraise" submenu:
- **Quick Look** (1 tick): Learn quality tier only
- **Careful Appraisal** (5 ticks): ±15 error estimate
- **Thorough Examination** (20 ticks): ±5 error, high confidence

### Trade Screen

```
┌─────────────────────────────────────────┐
│ SELL TO: Blacksmith's Shop              │
├─────────────────────────────────────────┤
│ Your Item: Iron Sword                   │
│ Your Appraisal: Fine (75) [estimated]   │
│ Shop's Offer: 45 gold                   │
│                                         │
│ ⚠ Shop values it lower than you!        │
│   They may have appraised it differently│
│                                         │
│ [Sell for 45g] [Haggle] [Cancel]        │
└─────────────────────────────────────────┘
```

---

## Part 8: LLM Agent Integration

### Prompt Context

Add appraisal information to agent prompts:

```typescript
// In PromptBuilder:
function buildInventoryContext(agent: Entity): string {
  const inventory = agent.getComponent<InventoryComponent>('inventory');
  const knowledge = agent.getComponent<ItemKnowledgeComponent>('item_knowledge');

  let context = "Your inventory:\n";
  for (let i = 0; i < inventory.slots.length; i++) {
    const slot = inventory.slots[i];
    if (!slot.itemId) continue;

    const appraisal = knowledge?.appraisals.get(`${slot.itemId}:${i}`);
    const qualityStr = formatQualityForPrompt(appraisal);

    context += `- ${slot.itemId} x${slot.quantity} ${qualityStr}\n`;
  }
  return context;
}

function formatQualityForPrompt(appraisal?: ItemAppraisal): string {
  if (!appraisal) return "(quality unknown)";

  const tier = getQualityTier(appraisal.perceivedQuality);
  switch (appraisal.confidence) {
    case 'unknown': return "(quality unknown)";
    case 'guess': return `(looks ${tier}?)`;
    case 'estimated': return `(seems ${tier}, ~${appraisal.perceivedQuality})`;
    case 'appraised': return `(${tier}, ~${appraisal.perceivedQuality})`;
    case 'verified': return `(${tier}, exactly ${appraisal.perceivedQuality})`;
  }
}
```

### Available Actions

```typescript
const APPRAISAL_ACTIONS = [
  {
    type: 'appraise_item',
    description: 'Examine an item to determine its quality',
    parameters: {
      slotIndex: 'number',
      thoroughness: "'quick' | 'careful' | 'thorough'",
    },
  },
  {
    type: 'request_appraisal',
    description: 'Ask another agent to appraise an item (uses their skill)',
    parameters: {
      slotIndex: 'number',
      appraiserAgentId: 'string',
    },
  },
];
```

---

## Implementation Order

1. **Phase 1: Core Data Structures**
   - Add `appraisal` to SkillId
   - Create ItemKnowledgeComponent
   - Add quality tracking to inventory operations

2. **Phase 2: Appraisal Mechanics**
   - Implement performAppraisal function
   - Add appraisal synergies
   - Create AppraisalSystem to handle appraise actions

3. **Phase 3: Trading Integration**
   - Modify sellToShop to use perceived qualities
   - Modify buyFromShop to require appraisal
   - Implement basic haggling

4. **Phase 4: Deception & Trust**
   - Add deception attempt mechanics
   - Implement trust records
   - Add "detected deception" events

5. **Phase 5: UI & LLM**
   - Update inventory UI with appraisal indicators
   - Add appraisal context to prompts
   - Add appraise_item action for LLM agents

---

## Events

```typescript
// New events to emit:
'appraisal:complete' -> { agentId, itemId, result: AppraisalResult }
'trade:haggle_start' -> { sellerId, buyerId, itemId, sellerAsk, buyerOffer }
'trade:haggle_complete' -> { sellerId, buyerId, finalPrice, winner }
'deception:attempted' -> { sellerId, buyerId, claimedQuality, actualQuality }
'deception:detected' -> { buyerId, sellerId, itemId }
'trust:changed' -> { agentId, targetAgentId, oldTrust, newTrust, reason }
```

---

## Files to Create/Modify

### New Files
- `packages/core/src/components/ItemKnowledgeComponent.ts`
- `packages/core/src/systems/AppraisalSystem.ts`
- `packages/core/src/economy/HagglingService.ts`
- `packages/core/src/economy/DeceptionService.ts`

### Modified Files
- `packages/core/src/components/SkillsComponent.ts` - Add 'appraisal' skill
- `packages/core/src/systems/TradingSystem.ts` - Quality-aware trading
- `packages/core/src/systems/CraftingSystem.ts` - Auto-verify crafted items
- `packages/core/src/items/InventoryComponent.ts` - Link to knowledge
- `packages/llm/src/PromptBuilder.ts` - Add appraisal context
- `packages/renderer/src/InventoryPanel.ts` - Show appraisal status
