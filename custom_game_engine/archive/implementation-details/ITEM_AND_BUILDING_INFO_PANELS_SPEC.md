# Item and Building Info Panels Specification

> **Status**: Design Specification
> **Date**: 2026-01-06
> **Related**: Window Management System, Dev Panel Integration

## Overview

ItemInfoPanel and BuildingInfoPanel complete the entity info panel suite, providing detailed information about items and buildings respectively. Both panels follow established patterns from AgentInfoPanel, AnimalInfoPanel, and PlantInfoPanel while exposing entity-specific information and actions.

## Common Architecture

Both panels follow the same architectural patterns:

### Base Structure
```typescript
export class [Entity]InfoPanel implements IWindowPanel {
  private visible: boolean = false;
  private selectedEntityId: string | null = null;
  private panelWidth = 320;
  private panelHeight = 480;
  private padding = 10;
  private lineHeight = 16;
  private scrollOffset = 0;
  private contentHeight = 0;
  private devSection = new DevSection();

  // IWindowPanel interface methods
  getId(): string;
  getTitle(): string;
  getDefaultWidth(): number;
  getDefaultHeight(): number;
  isVisible(): boolean;
  setVisible(visible: boolean): void;

  // Entity selection
  setSelectedEntity(entity: Entity | null): void;
  getSelectedEntityId(): string | null;

  // Rendering
  render(ctx, x, y, width, height, world): void;
  renderAt(ctx, x, y, width, height, world): void;

  // Interaction
  handleScroll(deltaY, contentHeight): boolean;
  handleClick(x, y, width, height, world): boolean;
}
```

### Dev Panel Integration
Both panels include a dev section at the bottom showing all components with `devToolsPanel: true`:

```typescript
// Dev Section rendering (at end of scrollable content)
currentY += this.lineHeight;
ctx.fillStyle = '#FFD700';
ctx.font = 'bold 12px monospace';
ctx.fillText('DEV PANEL', x + this.padding, currentY);
currentY += this.lineHeight + 8;

const devContext: SectionRenderContext = {
  ctx, x,
  y: currentY - this.lineHeight - 8,
  width: renderWidth,
  height: Math.max(200, renderHeight - (currentY - y)),
  padding: this.padding,
  lineHeight: this.lineHeight,
};

this.devSection.render(devContext, selectedEntity, identity);
currentY += 300; // Approximate dev section height
```

---

## ItemInfoPanel Specification

### Purpose
Display detailed information about any selected item entity, including inventory items, dropped items, equipment, resources, crafted goods, and quest items.

### Component Dependencies

**Required Components:**
- `item` - Core item data (type, name, description)
- `identity` - Item identity and metadata

**Optional Components:**
- `inventory` - Stack size and quantity (for stackable items)
- `resource` - Resource type and amount (for resource items)
- `equipment` - Equipment slot and stats (for wearable items)
- `weapon` - Weapon stats and damage (for weapons)
- `armor` - Armor stats and defense (for armor)
- `consumable` - Consumable effects and uses (for consumables)
- `crafted` - Crafting metadata (crafter, quality, materials)
- `quality` - Item quality/durability
- `enchantment` - Magical properties (if enchanted)
- `value` - Economic value and price
- `ownership` - Owner and origin tracking
- `quest_item` - Quest association (if quest item)

### Panel Layout

#### Header Section (Lines 1-3)
```
[Icon] Item Name
Type: [Item Type]  Quality: [★★★★☆]
```

Example:
```
🗡️ Steel Longsword
Type: Weapon (Sword)  Quality: ★★★★☆
```

#### Status Section (Lines 4-8)
```
STATUS
Durability: [==========] 100%
Condition: Excellent
Weight: 2.5 kg
Value: 150 gold
```

For stackable items:
```
STATUS
Quantity: 24/99
Weight: 0.1 kg each (2.4 kg total)
Value: 5 gold each (120 gold total)
```

#### Details Section (Lines 9-15)
Content varies by item type:

**Weapon:**
```
WEAPON STATS
Damage: 15-22 Slashing
Attack Speed: Fast
Reach: Medium
Special: +5% Critical Chance
```

**Armor:**
```
ARMOR STATS
Defense: 12 Physical
Slots: Chest
Special: +2 Strength
```

**Consumable:**
```
CONSUMABLE
Effect: Restore 50 Health
Duration: Instant
Uses: 3/3
```

**Resource:**
```
RESOURCE
Type: Wood (Oak)
Amount: 24 units
Regen: +0.5/day (if renewable)
```

**Crafted Item:**
```
CRAFTED BY
Crafter: Blacksmith Gorin
Quality: Masterwork
Materials: Iron Ore (5), Coal (2)
```

#### Ownership Section (Lines 16-18)
```
OWNERSHIP
Owner: Agent Elara
Origin: Crafted at Forge #3
```

For quest items:
```
QUEST ITEM
Quest: "The Lost Sword"
Can't drop, can't sell
```

#### Actions Section (Bottom buttons)
Buttons vary by item type and context:

- **Equip** (for equipment not equipped)
- **Unequip** (for equipped items)
- **Use** (for consumables)
- **Drop** (for droppable items)
- **Dismantle** (for craftable items)
- **Examine** (for quest items)

#### Dev Panel Section (Scrollable bottom)
Shows all components with `devToolsPanel: true` for debugging.

### Color Coding

- **Item Name**: Gold (`#FFD700`) for rare/magical, White for common
- **Quality Stars**: Gold (`#FFD700`)
- **Durability Bar**: Green (`#4CAF50`) > 70%, Yellow (`#FFC107`) > 40%, Red (`#FF5722`) ≤ 40%
- **Stats**: Cyan (`#00CCD4`) for positive bonuses, Red (`#FF5722`) for penalties
- **Quest Items**: Purple (`#9C27B0`)
- **Dev Panel Header**: Gold (`#FFD700`)

### Interaction Behaviors

**Scrolling**: Entire panel scrolls if content exceeds panel height
**Click Equip**: Emits `ui_action` event with `{ action: 'equip', entityId, slot }`
**Click Use**: Emits `ui_action` event with `{ action: 'use', entityId }`
**Click Drop**: Emits `ui_action` event with `{ action: 'drop', entityId }`

### Example Component Structure

```typescript
interface ItemComponent {
  type: 'item';
  itemType: 'weapon' | 'armor' | 'consumable' | 'resource' | 'quest' | 'misc';
  name: string;
  description: string;
  icon: string;
  stackable: boolean;
  maxStack: number;
  weight: number;
  value: number;
}

interface QualityComponent {
  type: 'quality';
  durability: number;      // 0-100
  maxDurability: number;
  condition: 'broken' | 'poor' | 'fair' | 'good' | 'excellent' | 'pristine';
  qualityLevel: number;    // 1-5 stars
}

interface WeaponComponent {
  type: 'weapon';
  damageType: 'slashing' | 'piercing' | 'bludgeoning' | 'magic';
  damageMin: number;
  damageMax: number;
  attackSpeed: 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast';
  reach: 'melee' | 'medium' | 'long';
  specialEffects: Array<{ type: string; value: number }>;
}
```

---

## BuildingInfoPanel Specification

### Purpose
Display detailed information about any selected building entity, including construction status, production, workers, storage, and upgrades.

### Component Dependencies

**Required Components:**
- `building` - Core building data (type, name, blueprint)
- `identity` - Building identity and metadata
- `position` - Location on map

**Optional Components:**
- `construction` - Construction progress (for buildings under construction)
- `health` - Building integrity
- `production` - Production queue and rates
- `storage` - Stored resources/items
- `workers` - Assigned workers
- `housing` - Housing capacity and residents
- `shop` - Shop inventory and prices
- `ownership` - Owner/faction
- `upgrade` - Upgrade status and available upgrades
- `power` - Power generation/consumption (if applicable)
- `defense` - Defense stats (for military buildings)

### Panel Layout

#### Header Section (Lines 1-3)
```
[Icon] Building Name
Type: [Building Type]  Status: [Operational]
```

Example:
```
🏭 Iron Forge
Type: Production (Smithy)  Status: Operational
```

#### Status Section (Lines 4-10)
```
STATUS
Health: [==========] 100%
Condition: Excellent
Workers: 2/3 (needs 1 more)
Efficiency: 85%
Power: Consuming 5 kW
```

For under construction:
```
STATUS
Construction: [====------] 40%
Required: Iron (50), Wood (100)
Missing: Wood (20)
Workers: 3/5 (needs 2 more)
ETA: 2 hours
```

#### Production Section (Lines 11-18)
For production buildings:
```
PRODUCTION
Queue: Steel Sword (2), Iron Ingot (5)
Current: Steel Sword [====--] 66%
Rate: 0.5 items/hour
Output: 12 items today
```

For farms:
```
PRODUCTION
Growing: Wheat (24 plots)
Stage: Mature (ready to harvest)
Yield: ~240 wheat (expected)
```

For shops:
```
SHOP INVENTORY
Selling: Bread (12), Meat (5), Ale (8)
Gold: 450
Customers Today: 7
```

#### Workers Section (Lines 19-24)
```
WORKERS (2/3)
• Blacksmith Gorin (Master) ⚒️
• Apprentice Mara (Novice) 🔨
[Empty Slot - Assign Worker]
```

#### Storage Section (Lines 25-30)
```
STORAGE (45/100)
Iron Ore: 20 units
Coal: 15 units
Steel Ingots: 10 units
[View Full Inventory]
```

For housing:
```
RESIDENTS (4/8)
• Agent Elara
• Agent Torin
• Agent Mira
• Agent Kael
[4 Empty Beds]
```

#### Upgrades Section (Lines 31-35)
```
UPGRADES
Available:
• Tier 2 Forge (+50% speed) - 500 gold
• Extra Worker Slot - 300 gold
Current Tier: 1
```

#### Defense Section (For military buildings)
```
DEFENSE
Garrison: 5/10 soldiers
Defense Rating: 25
Range: Medium (10 tiles)
Ammo: 50/100 arrows
```

#### Actions Section (Bottom buttons)
Buttons vary by building type and state:

- **Assign Worker** (if slots available)
- **Remove Worker** (if workers assigned)
- **Start Production** (for production buildings)
- **Collect Output** (if production complete)
- **Upgrade** (if upgrades available)
- **Repair** (if damaged)
- **Demolish** (destructive action)

#### Dev Panel Section (Scrollable bottom)
Shows all components with `devToolsPanel: true` for debugging.

### Color Coding

- **Building Name**: Gold (`#FFD700`) for tier 3+, White for basic
- **Health Bar**: Green (`#4CAF50`) > 70%, Yellow (`#FFC107`) > 40%, Red (`#FF5722`) ≤ 40%
- **Construction Progress**: Cyan (`#00CCD4`)
- **Workers**: Green (`#4CAF50`) if fully staffed, Yellow (`#FFC107`) if understaffed
- **Production**: Lime (`#8BC34A`) for active, Gray (`#888888`) for idle
- **Missing Resources**: Red (`#FF5722`)
- **Dev Panel Header**: Gold (`#FFD700`)

### Interaction Behaviors

**Scrolling**: Entire panel scrolls if content exceeds panel height
**Click Assign Worker**: Opens worker selection dialog
**Click Collect Output**: Emits `ui_action` event with `{ action: 'collect_production', entityId }`
**Click Upgrade**: Opens upgrade confirmation dialog
**Click Demolish**: Opens demolition confirmation dialog

### Example Component Structure

```typescript
interface BuildingComponent {
  type: 'building';
  buildingType: string;  // 'forge', 'farm', 'house', etc.
  blueprintId: string;
  tier: number;
  status: 'under_construction' | 'operational' | 'damaged' | 'disabled';
  efficiency: number;  // 0-1
}

interface ConstructionComponent {
  type: 'construction';
  progress: number;  // 0-1
  requiredResources: Array<{ type: string; amount: number; provided: number }>;
  requiredWorkers: number;
  assignedWorkers: string[];
  startTick: number;
  estimatedCompletionTick: number;
}

interface ProductionComponent {
  type: 'production';
  queue: Array<{ itemType: string; quantity: number; progress: number }>;
  productionRate: number;
  outputInventory: Array<{ type: string; quantity: number }>;
  lastProductionTick: number;
}

interface WorkersComponent {
  type: 'workers';
  maxWorkers: number;
  assignedWorkers: Array<{
    agentId: string;
    agentName: string;
    role: string;
    skillLevel: number;
  }>;
  requiredSkills?: string[];
}
```

---

## Implementation Plan

### Phase 1: ItemInfoPanel
1. Create `packages/renderer/src/ItemInfoPanel.ts`
2. Implement basic structure with IWindowPanel interface
3. Add rendering for core sections (header, status, details)
4. Integrate DevSection at bottom
5. Add action buttons and click handlers
6. Test with various item types

### Phase 2: BuildingInfoPanel
1. Create `packages/renderer/src/BuildingInfoPanel.ts`
2. Implement basic structure with IWindowPanel interface
3. Add rendering for building-specific sections
4. Integrate DevSection at bottom
5. Add action buttons and click handlers
6. Test with various building types

### Phase 3: Window Manager Integration
1. Register both panels with WindowManager
2. Add keyboard shortcuts (I for items, B for buildings)
3. Add selection handlers in Renderer
4. Test panel switching and window management

### Phase 4: Event Handlers
1. Implement `ui_action` event handlers in main game loop
2. Add validation for actions (can equip? can use? can upgrade?)
3. Wire up to existing systems (inventory, construction, production)
4. Test full interaction flow

---

## Testing Checklist

### ItemInfoPanel
- [ ] Displays weapon items correctly
- [ ] Displays armor items correctly
- [ ] Displays consumable items correctly
- [ ] Displays stackable resource items correctly
- [ ] Displays quest items correctly
- [ ] Shows quality/durability bars
- [ ] Shows crafted item metadata
- [ ] Shows ownership information
- [ ] Action buttons work (equip, use, drop)
- [ ] Dev panel shows devToolsPanel components
- [ ] Scrolling works for long items
- [ ] Handles missing optional components gracefully

### BuildingInfoPanel
- [ ] Displays production buildings correctly
- [ ] Displays housing buildings correctly
- [ ] Displays shop buildings correctly
- [ ] Displays military buildings correctly
- [ ] Shows construction progress
- [ ] Shows worker assignments
- [ ] Shows storage/inventory
- [ ] Shows available upgrades
- [ ] Action buttons work (assign, collect, upgrade, demolish)
- [ ] Dev panel shows devToolsPanel components
- [ ] Scrolling works for complex buildings
- [ ] Handles missing optional components gracefully

---

## Related Components

- **AgentInfoPanel**: Pattern reference for tabbed architecture
- **AnimalInfoPanel**: Pattern reference for scrollable single-panel
- **PlantInfoPanel**: Pattern reference for scrollable single-panel
- **DevSection**: Shared dev panel component
- **WindowManager**: Window positioning and management
- **TabbedPanel**: Potential for future ItemInfoPanel tabs (if complex)
- **UnifiedHoverInfoPanel**: Lightweight hover tooltips (complementary)

---

## Future Enhancements

### ItemInfoPanel
- **Tabbed Interface**: Split into "Info", "Stats", "History", "Dev" tabs for complex items
- **Compare Mode**: Side-by-side comparison of two items
- **Repair Interface**: In-panel repair with resource requirements
- **Enchantment Interface**: View and modify enchantments
- **3D Preview**: Render item model if 3D assets available

### BuildingInfoPanel
- **Tabbed Interface**: "Info", "Production", "Workers", "Upgrades", "Dev" tabs
- **Blueprint Viewer**: Visual representation of building layout
- **Production Queue Management**: Drag-to-reorder production queue
- **Worker Management**: Assign/unassign workers inline
- **Upgrade Tree**: Visual upgrade path diagram
- **Resource Flow Diagram**: Visualize input/output resources

---

## Notes

- Both panels follow the **Conservation of Game Matter** principle - items/buildings are never truly deleted, only marked as destroyed/scrapped
- **Dev panels** on items/buildings enable admin actions like instant craft, instant build, modify stats
- Consider adding **keyboard shortcuts** for common actions (E to equip, U to use, D to drop)
- **Action button validation** should check agent capabilities before enabling buttons
- Both panels should **cache entity lookups** to avoid repeated world.getEntity() calls
- Consider **animation** for construction progress bars and production counters
- **Sound effects** for button clicks and actions enhance UX
