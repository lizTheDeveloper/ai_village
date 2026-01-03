> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Food Processing Factory Blueprints

> *From raw crops to finished meals - realistic food production chains*

This document defines food processing factory blueprints for automated food production. Inspired by real-world food factories with stages for milling, baking, canning, and preservation.

## Table of Contents

1. [Tier 1: Manual Food Processing](#tier-1-manual-processing)
2. [Tier 2: Industrial Bakeries & Mills](#tier-2-industrial-bakeries)
3. [Tier 3: Mass Food Production](#tier-3-mass-production)
4. [Multi-Stage Production Chains](#production-chains)

---

## Tier 1: Manual Food Processing

### 1.1 Hand Mill & Oven (6x6)

**Purpose:** Manual grinding and baking for small communities.

```typescript
export const HAND_BAKERY: FactoryBlueprint = {
  id: 'hand_bakery',
  name: 'Hand Mill & Oven',
  tier: 1,
  size: { width: 6, height: 6 },

  layoutString: [
    '######',
    '#....#',
    '#.MM.#',
    '#....#',
    '#.OO.#',
    '######',
  ],
  buildingMaterial: 'stone',

  machines: [
    // Hand mills (M) - grind wheat into flour
    { machineItemId: 'hand_mill', offset: { x: 2, y: 2 }, recipe: 'flour' },
    { machineItemId: 'hand_mill', offset: { x: 3, y: 2 }, recipe: 'flour' },

    // Stone ovens (O) - bake bread
    { machineItemId: 'stone_oven', offset: { x: 2, y: 4 }, recipe: 'bread' },
    { machineItemId: 'stone_oven', offset: { x: 3, y: 4 }, recipe: 'bread' },
  ],

  inputChests: [
    { offset: { x: 1, y: 1 }, filter: ['wheat', 'corn'] },
  ],
  outputChests: [
    { offset: { x: 4, y: 4 }, filter: ['bread', 'corn_bread'] },
  ],

  powerRequired: 0, // Manual power

  productionGoal: {
    outputItemId: 'bread',
    targetRate: 30, // loaves per hour (manual)
  },

  nutritionMultiplier: 2.5, // Bread is 2.5x more filling than raw wheat

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['baking', 'milling'],
    accessPoints: [{ x: 2, y: 0 }],
  },
};
```

**Recipes:**
- Wheat (60 nutrition) → **Flour** (80 nutrition) → **Bread** (150 nutrition)
- Corn (80 nutrition) → **Cornmeal** (100 nutrition) → **Corn Bread** (180 nutrition)

### 1.2 Smokehouse (4x6)

**Purpose:** Preserve food through smoking and curing.

```typescript
export const SMOKEHOUSE: FactoryBlueprint = {
  id: 'smokehouse',
  name: 'Smokehouse',
  tier: 1,
  size: { width: 4, height: 6 },

  layoutString: [
    '####',
    '#..#',
    '#SS#',
    '#SS#',
    '#..#',
    '####',
  ],
  buildingMaterial: 'wood',

  machines: [
    // Smoking racks (S)
    { machineItemId: 'smoke_rack', offset: { x: 1, y: 2 }, recipe: 'smoked_meat' },
    { machineItemId: 'smoke_rack', offset: { x: 2, y: 2 }, recipe: 'smoked_meat' },
    { machineItemId: 'smoke_rack', offset: { x: 1, y: 3 }, recipe: 'smoked_fish' },
    { machineItemId: 'smoke_rack', offset: { x: 2, y: 3 }, recipe: 'smoked_fish' },
  ],

  inputChests: [
    { offset: { x: 0, y: 1 }, filter: ['raw_meat', 'raw_fish', 'wood'] },
  ],
  outputChests: [
    { offset: { x: 3, y: 4 }, filter: ['smoked_meat', 'smoked_fish'] },
  ],

  powerRequired: 0,

  productionGoal: {
    outputItemId: 'smoked_meat',
    targetRate: 20, // per hour
  },

  preservationBonus: 10, // Smoked food lasts 10x longer

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['preservation', 'smoking'],
    accessPoints: [{ x: 1, y: 0 }],
  },
};
```

---

## Tier 2: Industrial Bakeries & Mills

### 2.1 Industrial Mill (10x12)

**Purpose:** Automated grain milling using water/steam power.

```typescript
export const INDUSTRIAL_MILL: FactoryBlueprint = {
  id: 'industrial_mill',
  name: 'Industrial Grain Mill',
  tier: 2,
  size: { width: 10, height: 12 },

  layoutString: [
    '##########',
    '#........#',
    '#.WWWWWW.#', // Waterwheel/steam power
    '#........#',
    '#.MMMMMM.#', // Milling stones
    '#........#',
    '#.SSSSSS.#', // Sieves (separate flour from chaff)
    '#........#',
    '#.PPPPPP.#', // Packaging stations
    '#........#',
    '##########',
  ],
  buildingMaterial: 'stone',

  machines: [
    // Waterwheel/Steam engines (W)
    { machineItemId: 'waterwheel', offset: { x: 2, y: 2 } },
    { machineItemId: 'waterwheel', offset: { x: 3, y: 2 } },
    { machineItemId: 'waterwheel', offset: { x: 4, y: 2 } },
    { machineItemId: 'waterwheel', offset: { x: 5, y: 2 } },
    { machineItemId: 'waterwheel', offset: { x: 6, y: 2 } },
    { machineItemId: 'waterwheel', offset: { x: 7, y: 2 } },

    // Grinding stones (M)
    { machineItemId: 'mill_stone', offset: { x: 2, y: 4 }, recipe: 'flour' },
    { machineItemId: 'mill_stone', offset: { x: 3, y: 4 }, recipe: 'flour' },
    { machineItemId: 'mill_stone', offset: { x: 4, y: 4 }, recipe: 'cornmeal' },
    { machineItemId: 'mill_stone', offset: { x: 5, y: 4 }, recipe: 'cornmeal' },
    { machineItemId: 'mill_stone', offset: { x: 6, y: 4 }, recipe: 'flour' },
    { machineItemId: 'mill_stone', offset: { x: 7, y: 4 }, recipe: 'flour' },

    // Sieves (S) - refine flour quality
    { machineItemId: 'sieve', offset: { x: 2, y: 6 }, recipe: 'refined_flour' },
    { machineItemId: 'sieve', offset: { x: 3, y: 6 }, recipe: 'refined_flour' },
    { machineItemId: 'sieve', offset: { x: 4, y: 6 }, recipe: 'refined_flour' },
    { machineItemId: 'sieve', offset: { x: 5, y: 6 }, recipe: 'refined_flour' },
    { machineItemId: 'sieve', offset: { x: 6, y: 6 }, recipe: 'refined_flour' },
    { machineItemId: 'sieve', offset: { x: 7, y: 6 }, recipe: 'refined_flour' },

    // Packaging (P)
    { machineItemId: 'packager', offset: { x: 2, y: 8 } },
    { machineItemId: 'packager', offset: { x: 3, y: 8 } },
    { machineItemId: 'packager', offset: { x: 4, y: 8 } },
    { machineItemId: 'packager', offset: { x: 5, y: 8 } },
    { machineItemId: 'packager', offset: { x: 6, y: 8 } },
    { machineItemId: 'packager', offset: { x: 7, y: 8 } },
  ],

  beltLayout: [
    // Wheat input conveyor
    { offset: { x: 1, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 2, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 3, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 4, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 5, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 6, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 7, y: 3 }, direction: 'east', tier: 1 },

    // Flour output conveyor
    { offset: { x: 7, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 6, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 5, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 4, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 3, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 2, y: 9 }, direction: 'west', tier: 1 },
    { offset: { x: 1, y: 9 }, direction: 'south', tier: 1 },
  ],

  powerRequired: 150, // kW (mechanical from waterwheel)
  powerGeneration: 300, // Self-powered

  productionGoal: {
    outputItemId: 'refined_flour',
    targetRate: 600, // kg per hour
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['milling', 'engineering'],
    accessPoints: [{ x: 4, y: 0 }],
  },
};
```

### 2.2 Industrial Bakery (14x18)

**Purpose:** Mass bread production with big ovens and assembly lines.

```typescript
export const INDUSTRIAL_BAKERY: FactoryBlueprint = {
  id: 'industrial_bakery',
  name: 'Industrial Bakery',
  tier: 2,
  size: { width: 14, height: 18 },

  layoutString: [
    '##############',
    '#............#',
    '#.DDDDDD.....#', // Dough mixers
    '#............#',
    '#.FFFFFF.....#', // Fermentation chambers
    '#............#',
    '#.SSSSSSS....#', // Dough shaping machines
    '#............#',
    '#.OOOOOOOO...#', // Big industrial ovens
    '#.OOOOOOOO...#',
    '#............#',
    '#.CCCCCCCC...#', // Cooling racks
    '#............#',
    '#.PPPPPPPP...#', // Packaging line
    '#............#',
    '##############',
  ],
  buildingMaterial: 'brick',

  machines: [
    // Dough mixers (D)
    { machineItemId: 'dough_mixer', offset: { x: 2, y: 2 }, recipe: 'bread_dough' },
    { machineItemId: 'dough_mixer', offset: { x: 3, y: 2 }, recipe: 'bread_dough' },
    { machineItemId: 'dough_mixer', offset: { x: 4, y: 2 }, recipe: 'bread_dough' },
    { machineItemId: 'dough_mixer', offset: { x: 5, y: 2 }, recipe: 'bread_dough' },
    { machineItemId: 'dough_mixer', offset: { x: 6, y: 2 }, recipe: 'pastry_dough' },
    { machineItemId: 'dough_mixer', offset: { x: 7, y: 2 }, recipe: 'pastry_dough' },

    // Fermentation chambers (F) - let dough rise
    { machineItemId: 'fermentation_chamber', offset: { x: 2, y: 4 } },
    { machineItemId: 'fermentation_chamber', offset: { x: 3, y: 4 } },
    { machineItemId: 'fermentation_chamber', offset: { x: 4, y: 4 } },
    { machineItemId: 'fermentation_chamber', offset: { x: 5, y: 4 } },
    { machineItemId: 'fermentation_chamber', offset: { x: 6, y: 4 } },
    { machineItemId: 'fermentation_chamber', offset: { x: 7, y: 4 } },

    // Shaping machines (S) - form loaves
    { machineItemId: 'dough_shaper', offset: { x: 2, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 3, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 4, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 5, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 6, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 7, y: 6 } },
    { machineItemId: 'dough_shaper', offset: { x: 8, y: 6 } },

    // BIG OVENS (O) - the heart of the bakery!
    { machineItemId: 'industrial_oven', offset: { x: 2, y: 8 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 3, y: 8 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 4, y: 8 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 5, y: 8 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 6, y: 8 }, recipe: 'croissant' },
    { machineItemId: 'industrial_oven', offset: { x: 7, y: 8 }, recipe: 'croissant' },
    { machineItemId: 'industrial_oven', offset: { x: 8, y: 8 }, recipe: 'pastry' },
    { machineItemId: 'industrial_oven', offset: { x: 9, y: 8 }, recipe: 'pastry' },

    { machineItemId: 'industrial_oven', offset: { x: 2, y: 9 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 3, y: 9 }, recipe: 'bread' },
    { machineItemId: 'industrial_oven', offset: { x: 4, y: 9 }, recipe: 'corn_bread' },
    { machineItemId: 'industrial_oven', offset: { x: 5, y: 9 }, recipe: 'corn_bread' },
    { machineItemId: 'industrial_oven', offset: { x: 6, y: 9 }, recipe: 'cake' },
    { machineItemId: 'industrial_oven', offset: { x: 7, y: 9 }, recipe: 'cake' },
    { machineItemId: 'industrial_oven', offset: { x: 8, y: 9 }, recipe: 'pie' },
    { machineItemId: 'industrial_oven', offset: { x: 9, y: 9 }, recipe: 'pie' },

    // Cooling racks (C)
    { machineItemId: 'cooling_rack', offset: { x: 2, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 3, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 4, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 5, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 6, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 7, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 8, y: 11 } },
    { machineItemId: 'cooling_rack', offset: { x: 9, y: 11 } },

    // Packaging (P)
    { machineItemId: 'bread_packager', offset: { x: 2, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 3, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 4, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 5, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 6, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 7, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 8, y: 13 } },
    { machineItemId: 'bread_packager', offset: { x: 9, y: 13 } },
  ],

  // Conveyor belts for assembly line
  beltLayout: [
    // Flour & water input
    { offset: { x: 1, y: 1 }, direction: 'east', tier: 1 },

    // Dough to ovens
    { offset: { x: 2, y: 7 }, direction: 'south', tier: 1 },
    { offset: { x: 3, y: 7 }, direction: 'south', tier: 1 },

    // Bread output
    { offset: { x: 2, y: 14 }, direction: 'east', tier: 1 },
    { offset: { x: 3, y: 14 }, direction: 'east', tier: 1 },
    { offset: { x: 4, y: 14 }, direction: 'east', tier: 1 },
  ],

  powerRequired: 800, // kW for ovens and machines

  productionGoal: {
    outputItemId: 'bread',
    targetRate: 2400, // loaves per hour (40 per minute)
  },

  outputNutrition: 150, // Each bread loaf

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['baking', 'food_processing'],
    accessPoints: [{ x: 6, y: 0 }, { x: 6, y: 17 }],
  },
};
```

---

## Tier 3: Mass Food Production

### 3.1 Cannery & Food Processing Plant (20x24)

**Purpose:** Preserve vegetables, fruits, and prepared meals in cans.

```typescript
export const CANNERY: FactoryBlueprint = {
  id: 'cannery',
  name: 'Industrial Cannery',
  tier: 3,
  size: { width: 20, height: 24 },

  layoutString: [
    '####################',
    '#..................#',
    '#.WWWWWWWW.........#', // Washing stations
    '#..................#',
    '#.CCCCCCCC.........#', // Cutting & prep
    '#..................#',
    '#.KKKKKKKK.........#', // Cooking kettles
    '#..................#',
    '#.FFFFFFFFFF.......#', // Filling machines
    '#..................#',
    '#.SSSSSSSSSS.......#', // Sealing machines
    '#..................#',
    '#.HHHHHHHHHH.......#', // Heat treatment (sterilization)
    '#..................#',
    '#.LLLLLLLLLL.......#', // Labeling
    '#..................#',
    '####################',
  ],
  buildingMaterial: 'stainless_steel',

  machines: [
    // Washing (W)
    ...Array.from({ length: 10 }, (_, i) => ({
      machineItemId: 'industrial_washer',
      offset: { x: 2 + i, y: 2 },
    })),

    // Cutting & prep (C)
    ...Array.from({ length: 10 }, (_, i) => ({
      machineItemId: 'food_processor',
      offset: { x: 2 + i, y: 4 },
      recipe: i < 5 ? 'sliced_vegetables' : 'diced_fruit',
    })),

    // Cooking kettles (K) - big industrial cookers
    ...Array.from({ length: 10 }, (_, i) => ({
      machineItemId: 'cooking_kettle',
      offset: { x: 2 + i, y: 6 },
      recipe: 'cooked_vegetables',
    })),

    // Can filling (F)
    ...Array.from({ length: 12 }, (_, i) => ({
      machineItemId: 'can_filler',
      offset: { x: 2 + i, y: 8 },
    })),

    // Sealing (S)
    ...Array.from({ length: 12 }, (_, i) => ({
      machineItemId: 'can_sealer',
      offset: { x: 2 + i, y: 10 },
    })),

    // Heat treatment - sterilization (H)
    ...Array.from({ length: 12 }, (_, i) => ({
      machineItemId: 'retort_sterilizer',
      offset: { x: 2 + i, y: 12 },
    })),

    // Labeling (L)
    ...Array.from({ length: 12 }, (_, i) => ({
      machineItemId: 'labeling_machine',
      offset: { x: 2 + i, y: 14 },
    })),
  ],

  beltLayout: [
    // Input conveyor (raw vegetables/fruits)
    ...Array.from({ length: 10 }, (_, i) => ({
      offset: { x: 2 + i, y: 1 },
      direction: 'south' as BeltDirection,
      tier: 2 as 1 | 2 | 3,
    })),

    // Output conveyor (canned goods)
    ...Array.from({ length: 12 }, (_, i) => ({
      offset: { x: 2 + i, y: 15 },
      direction: 'east' as BeltDirection,
      tier: 2 as 1 | 2 | 3,
    })),
  ],

  powerRequired: 2400, // kW

  productionGoal: {
    outputItemId: 'canned_vegetables',
    targetRate: 7200, // cans per hour
  },

  preservationBonus: 100, // Canned food lasts 100x longer

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['food_processing', 'canning'],
    accessPoints: [{ x: 9, y: 0 }, { x: 9, y: 23 }],
  },
};
```

---

## Production Chains

### Complete Food Production Flow

**Raw Crops → Processed Food:**

1. **Wheat** (60 nutrition)
   - → Mill → **Flour** (80 nutrition)
   - → Bakery → **Bread** (150 nutrition)
   - Nutrition multiplier: **2.5x**

2. **Corn** (80 nutrition)
   - → Mill → **Cornmeal** (100 nutrition)
   - → Bakery → **Corn Bread** (180 nutrition)
   - Nutrition multiplier: **2.25x**

3. **Potato** (70 nutrition)
   - → Cannery → **Canned Potatoes** (90 nutrition, lasts 100x longer)
   - → Bakery → **Potato Bread** (160 nutrition)
   - Nutrition multiplier: **1.3-2.3x**

4. **Carrot** (45 nutrition)
   - → Cannery → **Canned Carrots** (55 nutrition, lasts 100x longer)
   - → Soup Kitchen → **Vegetable Soup** (120 nutrition)
   - Nutrition multiplier: **1.2-2.7x**

### Factory Progression

- **Tier 1:** Hand mills + stone ovens (30 loaves/hour)
- **Tier 2:** Industrial mills + big ovens (2400 loaves/hour) **80x more productive!**
- **Tier 3:** Mass canneries + automated kitchens (7200 cans/hour)

### Nutrition Math

For 20 NPCs eating ~20 nutrition/hour each:

- **Raw crops needed:** 400 nutrition/hour
- **With Tier 1 bakery:** 160 nutrition in crops → 400 nutrition in bread (2.5x multiplier)
- **Savings:** 60% fewer crops needed when processed!

**This means farming 4 berry bushes per NPC becomes sustainable when combined with crop processing!**
