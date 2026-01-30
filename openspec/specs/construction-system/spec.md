# Construction System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Purpose

The construction system enables agents to build and upgrade village structures, with procedural generation creating unique architectural variations while maintaining game balance.

## Overview

The construction system enables agents to build and upgrade structures in the village. Buildings provide functionality (crafting stations, storage, shops), shelter, and community spaces. Advanced buildings can be designed procedurally, creating unique architectural variations while maintaining game balance.

---

## Building Types

### Building Categories

```typescript
type BuildingCategory =
  | "production"    // Crafting, processing
  | "storage"       // Warehouses, silos
  | "residential"   // Agent homes
  | "commercial"    // Shops, markets
  | "community"     // Town hall, plaza
  | "farming"       // Barns, greenhouses
  | "research"      // Labs, libraries
  | "decoration";   // Fences, statues
```

### Building Definition

```typescript
interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  description: string;

  // Footprint
  size: { width: number; height: number };
  entranceOffset: Position;

  // Requirements
  requiredResearch: string[];
  constructionCost: ItemStack[];
  constructionTime: number;      // In-game hours

  // Functionality
  functionality: BuildingFunction[];
  capacity: number;              // Storage/worker slots
  upgrades: BuildingUpgrade[];

  // Balance
  tier: number;                  // 1-5 power level
  maintenanceCost: ItemStack[];  // Daily upkeep

  // Visual
  spriteId: string;
  isGenerated: boolean;          // Procedurally created?
}
```

---

## Requirements

### Requirement: Construction Process

Buildings SHALL be constructed over time:

#### Scenario: Agent initiates construction
- **WHEN** an agent initiates construction
- **THEN** the system SHALL:
  1. Verify location is valid:
     - All tiles are buildable terrain
     - No overlapping buildings
     - Connected to path network (optional)
  2. Reserve tiles for construction
  3. Deduct materials from agent/storage
  4. Create construction site object
  5. Track progress (0-100%)

#### Scenario: Construction progress reaches 100%
- **WHEN** construction progress reaches 100%
- **THEN** the system SHALL:
  1. Replace construction site with building
  2. Initialize building state
  3. Emit "building:complete" event
  4. Update pathfinding grid

### Requirement: Construction Progress

Construction SHALL advance with agent work:

```typescript
function calculateConstructionProgress(
  agent: Agent,
  building: BuildingDefinition,
  ticksWorked: number
): number {
  const baseProgress = ticksWorked / building.constructionTime;
  const skillBonus = 1 + (agent.skills.construction / 200); // 1.0 - 1.5x
  const toolBonus = getToolBonus(agent.inventory); // 1.0 - 2.0x

  return baseProgress * skillBonus * toolBonus;
}
```

### Requirement: Building Functionality

Buildings SHALL provide specific functions:

```typescript
type BuildingFunction =
  | { type: "crafting"; recipes: string[]; speed: number }
  | { type: "storage"; itemTypes: ItemType[]; capacity: number }
  | { type: "sleeping"; restBonus: number }
  | { type: "shop"; shopType: ShopType }
  | { type: "research"; fields: ResearchField[]; bonus: number }
  | { type: "gathering_boost"; resourceTypes: string[]; radius: number }
  | { type: "mood_aura"; moodBonus: number; radius: number }
  | { type: "automation"; tasks: AutoTask[] };
```

### Requirement: Building Upgrades

Buildings SHALL support upgrades:

```typescript
interface BuildingUpgrade {
  id: string;
  name: string;
  description: string;

  // Costs
  materialCost: ItemStack[];
  researchRequired: string[];
  upgradeTime: number;

  // Effects
  capacityBonus: number;
  speedBonus: number;
  newFunctions: BuildingFunction[];
  visualChange: string;  // New sprite layer
}
```

#### Scenario: Agent upgrades a building
- **WHEN** an agent upgrades a building
- **THEN** the building SHALL:
  - Remain functional during upgrade (optional)
  - Apply bonuses upon completion
  - Increment upgrade level
  - Update visual appearance
  - Maintain previous functionality

---

## Core Buildings

### Tier 1 - Basic

| Building | Size | Cost | Function |
|----------|------|------|----------|
| Workbench | 2x2 | 20 Wood | Basic crafting |
| Storage Chest | 1x1 | 10 Wood | 20 item slots |
| Campfire | 1x1 | 10 Stone, 5 Wood | Cooking, warmth |
| Tent | 2x2 | 10 Cloth, 5 Wood | Basic shelter |
| Well | 1x1 | 30 Stone | Water source |

### Tier 2 - Established

| Building | Size | Cost | Function |
|----------|------|------|----------|
| Cabin | 3x3 | 50 Wood, 20 Stone | Proper housing |
| Forge | 2x3 | 40 Stone, 20 Iron | Metal crafting |
| Farm Shed | 3x2 | 30 Wood | Seed/tool storage |
| Market Stall | 2x2 | 25 Wood | Basic trading |
| Windmill | 2x2 | 40 Wood, 10 Stone | Grain processing |

### Tier 2.5 - Animal Housing

| Building | Size | Cost | Function |
|----------|------|------|----------|
| Chicken Coop | 2x2 | 25 Wood | Houses 8 birds |
| Kennel | 2x3 | 30 Wood, 10 Stone | Houses 6 dogs |
| Stable | 3x4 | 50 Wood, 20 Stone | Houses 4 horses/donkeys |
| Apiary | 2x2 | 20 Wood, 5 Glass | Houses 3 bee colonies |
| Aquarium | 2x2 | 30 Glass, 10 Stone | Houses 10 fish |

### Tier 3 - Developed

| Building | Size | Cost | Function |
|----------|------|------|----------|
| House | 4x4 | 80 Wood, 40 Stone | Full housing, storage |
| Workshop | 3x4 | 60 Wood, 30 Iron | Advanced crafting |
| Barn | 4x3 | 70 Wood | Large storage, 12 large animals |
| General Store | 3x3 | 50 Wood, 20 Stone | Shop |
| Library | 3x3 | 40 Wood, 50 Paper | Research bonus, chronicle storage |
| Trade Post | 3x3 | 45 Wood, 25 Stone | Inter-village trade hub |
| Archive | 3x2 | 35 Wood, 40 Paper | Stores written works |
| Printing Press | 2x3 | 30 Wood, 20 Iron | Mass-produces written works |
| Caravan Station | 4x3 | 60 Wood, 30 Stone | Caravan rest, trade storage |

### Tier 4 - Advanced

| Building | Size | Cost | Function |
|----------|------|------|----------|
| Manor | 5x5 | 150 Wood, 100 Stone | Large housing |
| Factory | 4x5 | 100 Iron, 50 Stone | Mass production |
| Town Hall | 5x4 | 100 Wood, 80 Stone | Community center |
| Research Lab | 4x4 | 60 Stone, 40 Glass | Advanced research |
| Warehouse | 5x3 | 80 Wood, 30 Iron | Massive storage |

### Tier 5 - Legendary

| Building | Size | Cost | Function |
|----------|------|------|----------|
| Grand Cathedral | 6x8 | 200 Stone, 100 Glass | Mood aura, events |
| Arcane Tower | 3x3 | 100 Stone, 50 Crystal | Magical research |
| Trade Emporium | 6x4 | 150 Wood, 100 Gold | Master trading |

---

## Procedural Building Generation

### Requirement: Generated Buildings

The system SHALL support procedurally generated building designs:

```typescript
interface GeneratedBuilding {
  id: string;
  baseBuildingId: string;  // Template it derives from
  name: string;            // LLM generated
  description: string;     // LLM generated lore

  // Variations from base
  sizeModifier: { width: number; height: number };
  materialSubstitutions: Map<string, string>;
  bonusEffects: BuildingEffect[];

  // Visual
  styleVariant: ArchitecturalStyle;
  decorativeElements: string[];
  generatedSprite: string;

  // Balance constraints
  tier: number;            // Cannot exceed base tier + 1
  powerBudget: number;     // Total effect strength limit

  // Provenance
  designedBy: string;      // Agent ID
  designDate: GameTime;
}
```

### Requirement: Architectural Styles

Generated buildings SHALL follow style constraints:

```typescript
type ArchitecturalStyle =
  | "rustic"       // Wood, simple, cozy
  | "stone_craft"  // Stone, sturdy, medieval
  | "elven"        // Elegant, nature-integrated
  | "dwarven"      // Underground-inspired, geometric
  | "modern"       // Clean lines, efficient
  | "whimsical"    // Curved, colorful, fantastical
  | "ancient"      // Weathered, mysterious
  | "hybrid";      // Mix of styles (generated)
```

---

## Balance Constraints

### Requirement: Building Power Budget

Generated buildings SHALL respect power limits:

```typescript
interface BuildingBalanceConstraints {
  // Tier caps
  maxTier: number;                    // Based on village progress

  // Effect limits by tier
  maxEffectStrength: Map<number, number>;

  // Diminishing returns
  duplicatePenalty: number;           // Reduce power if similar exists

  // Resource scaling
  costMultiplierByPower: number;      // Higher power = higher cost

  // Maintenance scaling
  upkeepByTier: Map<number, ItemStack[]>;
}
```

### Requirement: Building Deduplication

The system SHALL prevent duplicate generated buildings:

#### Scenario: New building is generated
- **WHEN** a new building is generated
- **THEN** the system SHALL:
  1. Calculate similarity hash from:
     - Base building type
     - Primary functions
     - Effect types
  2. Check against existing generated buildings
  3. IF similarity > 80%
     - Reject or force significant variation
  4. Track function distribution
  5. Bias generation toward underrepresented functions

---

## Maintenance and Decay

### Requirement: Building Maintenance

Buildings SHALL require upkeep:

#### Scenario: New day begins
- **WHEN** a new day begins
- **THEN** for each building:
  - Check maintenance supplies
  - IF supplies insufficient
    - Reduce building condition by 5
  - IF condition < 50
    - Reduce functionality by (100 - condition)%
  - IF condition <= 0
    - Building becomes "ruined"
    - Requires repair before use

---

## Open Questions

1. Building placement automation vs manual?
2. Collaborative construction by multiple agents?
3. Building destruction/demolition?
4. Historical buildings that can't be recreated?

---

## Related Specs

**Core Integration:**
- `world-system/spec.md` - Tile placement
- `items-system/spec.md` - Construction materials
- `research-system/spec.md` - Building unlocks
- `game-engine/spec.md` - Construction progress in tick

**Economy & Trade:**
- `economy-system/spec.md` - Shop buildings
- `economy-system/inter-village-trade.md` - Trade posts, caravan stations

**Specialized Systems:**
- `animal-system/spec.md` - Animal housing requirements
- `agent-system/chroniclers.md` - Archive, printing press, library usage
