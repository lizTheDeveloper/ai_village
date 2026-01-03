> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Factory Blueprints - Dyson Swarm Production Chain

> *From simple smelters to stellar engineering - a complete factory city progression*

This document defines factory blueprints for automated production, from early-game basics to end-game Dyson Swarm construction. Blueprints are organized by tech tier and production chain.

## Table of Contents

1. [Tier 1: Manual Age - Basic Production](#tier-1-manual-age)
2. [Tier 2: Steam Age - Automation Begins](#tier-2-steam-age)
3. [Tier 3: Electric Age - Mass Production](#tier-3-electric-age)
4. [Tier 4: Digital Age - Advanced Manufacturing](#tier-4-digital-age)
5. [Tier 5: Space Age - Orbital Industry](#tier-5-space-age)
6. [Tier 6: Stellar Age - Dyson Swarm](#tier-6-stellar-age)
7. [Complete City Layout](#complete-city-layout)

---

## Tier 1: Manual Age - Basic Production

### 1.1 Stone Furnace Smeltery (4x4)

**Purpose:** Smelt raw ore into usable ingots using manual fuel.

```typescript
export const STONE_FURNACE_SMELTERY: FactoryBlueprint = {
  id: 'stone_furnace_smeltery',
  name: 'Stone Furnace Smeltery',
  tier: 1,
  size: { width: 4, height: 4 },

  // Voxel building layout
  layoutString: [
    '####',
    '#..#',
    '#..#',
    '####',
  ],
  buildingMaterial: 'stone',

  // Machines
  machines: [
    { machineItemId: 'stone_furnace', offset: { x: 1, y: 1 } },
    { machineItemId: 'stone_furnace', offset: { x: 2, y: 1 } },
    { machineItemId: 'stone_furnace', offset: { x: 1, y: 2 } },
    { machineItemId: 'stone_furnace', offset: { x: 2, y: 2 } },
  ],

  // Input/Output (manual)
  inputChests: [
    { offset: { x: 0, y: 2 }, filter: ['iron_ore', 'copper_ore', 'coal'] },
  ],
  outputChests: [
    { offset: { x: 3, y: 2 }, filter: ['iron_ingot', 'copper_ingot'] },
  ],

  // No power needed (manual fuel)
  powerRequired: 0,

  productionGoal: {
    outputItemId: 'iron_ingot',
    targetRate: 20, // 20 per minute (manual)
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['mining', 'smelting'],
    accessPoints: [{ x: 1, y: 0 }], // Front door
  },
};
```

### 1.2 Woodworking Workshop (6x6)

**Purpose:** Process logs into planks, craft basic wooden components.

```typescript
export const WOODWORKING_WORKSHOP: FactoryBlueprint = {
  id: 'woodworking_workshop',
  name: 'Woodworking Workshop',
  tier: 1,
  size: { width: 6, height: 6 },

  layoutString: [
    '######',
    '#....#',
    '#.SS.#',
    '#.WW.#',
    '#....#',
    '######',
  ],
  buildingMaterial: 'wood',

  machines: [
    { machineItemId: 'sawmill', offset: { x: 2, y: 2 } }, // S
    { machineItemId: 'sawmill', offset: { x: 3, y: 2 } }, // S
    { machineItemId: 'workbench', offset: { x: 2, y: 3 } }, // W
    { machineItemId: 'workbench', offset: { x: 3, y: 3 } }, // W
  ],

  inputChests: [
    { offset: { x: 1, y: 1 }, filter: ['log', 'wood_plank'] },
  ],
  outputChests: [
    { offset: { x: 4, y: 4 }, filter: ['wood_plank', 'gear', 'stick'] },
  ],

  powerRequired: 0,

  productionGoal: {
    outputItemId: 'wood_plank',
    targetRate: 40,
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['woodworking', 'crafting'],
    accessPoints: [{ x: 2, y: 0 }],
  },
};
```

---

## Tier 2: Steam Age - Automation Begins

### 2.1 Steam-Powered Smelter (8x10)

**Purpose:** Automated ore processing using steam power and conveyor belts.

```typescript
export const STEAM_SMELTER: FactoryBlueprint = {
  id: 'steam_smelter',
  name: 'Steam-Powered Smelter',
  tier: 2,
  size: { width: 8, height: 10 },

  layoutString: [
    '########',
    '#......#',
    '#.FFFF.#',
    '#......#',
    '#.BB.BB#',
    '#......#',
    '#.PPPP.#',
    '#......#',
    '########',
  ],
  buildingMaterial: 'stone',

  machines: [
    // Furnaces (F)
    { machineItemId: 'steel_furnace', offset: { x: 2, y: 2 } },
    { machineItemId: 'steel_furnace', offset: { x: 3, y: 2 } },
    { machineItemId: 'steel_furnace', offset: { x: 4, y: 2 } },
    { machineItemId: 'steel_furnace', offset: { x: 5, y: 2 } },

    // Boilers (B)
    { machineItemId: 'boiler', offset: { x: 2, y: 4 } },
    { machineItemId: 'boiler', offset: { x: 3, y: 4 } },
    { machineItemId: 'boiler', offset: { x: 5, y: 4 } },
    { machineItemId: 'boiler', offset: { x: 6, y: 4 } },

    // Steam engines (P for Power)
    { machineItemId: 'steam_engine', offset: { x: 2, y: 6 } },
    { machineItemId: 'steam_engine', offset: { x: 3, y: 6 } },
    { machineItemId: 'steam_engine', offset: { x: 4, y: 6 } },
    { machineItemId: 'steam_engine', offset: { x: 5, y: 6 } },
  ],

  // Belt layout for ore input
  beltLayout: [
    // Input belt (ore)
    { offset: { x: 1, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 2, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 3, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 4, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 5, y: 3 }, direction: 'east', tier: 1 },
    { offset: { x: 6, y: 3 }, direction: 'south', tier: 1 },

    // Output belt (ingots)
    { offset: { x: 6, y: 7 }, direction: 'west', tier: 1 },
    { offset: { x: 5, y: 7 }, direction: 'west', tier: 1 },
    { offset: { x: 4, y: 7 }, direction: 'west', tier: 1 },
    { offset: { x: 3, y: 7 }, direction: 'west', tier: 1 },
    { offset: { x: 2, y: 7 }, direction: 'west', tier: 1 },
    { offset: { x: 1, y: 7 }, direction: 'south', tier: 1 },
  ],

  powerConduits: [
    { offset: { x: 4, y: 6 }, direction: 'north' },
  ],

  inputChests: [
    { offset: { x: 0, y: 3 }, filter: ['iron_ore', 'copper_ore'] },
  ],
  outputChests: [
    { offset: { x: 0, y: 8 }, filter: ['iron_ingot', 'copper_ingot', 'steel_ingot'] },
  ],

  powerRequired: 200, // kW
  powerGeneration: 400, // Self-powered via steam engines

  productionGoal: {
    outputItemId: 'iron_ingot',
    targetRate: 120, // 120 per minute
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['engineering', 'smelting'],
    accessPoints: [{ x: 3, y: 0 }, { x: 3, y: 9 }],
  },
};
```

### 2.2 Gear Factory (6x8)

**Purpose:** Mass produce gears and mechanical components.

```typescript
export const GEAR_FACTORY: FactoryBlueprint = {
  id: 'gear_factory',
  name: 'Gear Production Facility',
  tier: 2,
  size: { width: 6, height: 8 },

  layoutString: [
    '######',
    '#....#',
    '#.AA.#',
    '#....#',
    '#.AA.#',
    '#....#',
    '######',
  ],
  buildingMaterial: 'stone',

  machines: [
    { machineItemId: 'assembly_machine_i', offset: { x: 2, y: 2 }, recipe: 'iron_gear' },
    { machineItemId: 'assembly_machine_i', offset: { x: 3, y: 2 }, recipe: 'iron_gear' },
    { machineItemId: 'assembly_machine_i', offset: { x: 2, y: 4 }, recipe: 'copper_wire' },
    { machineItemId: 'assembly_machine_i', offset: { x: 3, y: 4 }, recipe: 'copper_wire' },
  ],

  beltLayout: [
    // Iron input
    { offset: { x: 1, y: 1 }, direction: 'east', tier: 1 },
    { offset: { x: 2, y: 1 }, direction: 'south', tier: 1 },

    // Copper input
    { offset: { x: 4, y: 1 }, direction: 'west', tier: 1 },
    { offset: { x: 3, y: 1 }, direction: 'south', tier: 1 },

    // Gear output
    { offset: { x: 2, y: 3 }, direction: 'south', tier: 1 },
    { offset: { x: 2, y: 5 }, direction: 'west', tier: 1 },
    { offset: { x: 1, y: 5 }, direction: 'south', tier: 1 },

    // Wire output
    { offset: { x: 3, y: 3 }, direction: 'south', tier: 1 },
    { offset: { x: 3, y: 5 }, direction: 'east', tier: 1 },
    { offset: { x: 4, y: 5 }, direction: 'south', tier: 1 },
  ],

  powerRequired: 200,

  productionGoal: {
    outputItemId: 'iron_gear',
    targetRate: 80,
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['engineering'],
    accessPoints: [{ x: 2, y: 0 }],
  },
};
```

---

## Tier 3: Electric Age - Mass Production

### 3.1 Solar Farm (20x20)

**Purpose:** Generate clean renewable power at scale.

```typescript
export const SOLAR_FARM: FactoryBlueprint = {
  id: 'solar_farm',
  name: 'Solar Power Farm',
  tier: 3,
  size: { width: 20, height: 20 },

  layoutString: [
    '####################',
    '#..................#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#..................#',
    '#.BBBB.BBBB.BBBB.B.#',
    '#.BBBB.BBBB.BBBB.B.#',
    '#..................#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#.SSSS.SSSS.SSSS.S.#',
    '#..................#',
    '#.BBBB.BBBB.BBBB.B.#',
    '#.BBBB.BBBB.BBBB.B.#',
    '#..................#',
    '#.....PPPP........#',
    '#..................#',
    '####################',
  ],
  buildingMaterial: 'metal',

  machines: [
    // Solar panels (S) - 48 total
    ...Array.from({ length: 12 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => ({
        machineItemId: 'solar_panel',
        offset: {
          x: 2 + col * 5 + (col >= 2 ? 1 : 0),
          y: 2 + (row < 6 ? row : row + 1) + (row >= 3 && row < 6 ? 1 : 0) + (row >= 9 ? 1 : 0)
        }
      }))
    ).flat(),

    // Accumulators (B for Battery) - 32 total
    ...Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => ({
        machineItemId: 'accumulator',
        offset: {
          x: 2 + col * 5 + (col >= 2 ? 1 : 0),
          y: 6 + (row < 4 ? row : row + 7)
        }
      }))
    ).flat(),

    // Power poles (P)
    { machineItemId: 'big_electric_pole', offset: { x: 7, y: 16 } },
    { machineItemId: 'big_electric_pole', offset: { x: 8, y: 16 } },
    { machineItemId: 'big_electric_pole', offset: { x: 9, y: 16 } },
    { machineItemId: 'big_electric_pole', offset: { x: 10, y: 16 } },
  ],

  powerConduits: [
    { offset: { x: 9, y: 16 }, direction: 'south' }, // Main output
  ],

  powerGeneration: 4800, // 100 kW per panel * 48 = 4.8 MW
  energyStorage: 16000, // 500 kWh per accumulator * 32

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['electrical_engineering'],
    accessPoints: [{ x: 9, y: 0 }],
  },
};
```

### 3.2 Circuit Board Factory (12x16)

**Purpose:** Produce electronic circuits and advanced circuits.

```typescript
export const CIRCUIT_FACTORY: FactoryBlueprint = {
  id: 'circuit_factory',
  name: 'Electronic Circuit Factory',
  tier: 3,
  size: { width: 12, height: 16 },

  layoutString: [
    '############',
    '#..........#',
    '#.AAA.AAA..#',
    '#..........#',
    '#.AAA.AAA..#',
    '#..........#',
    '#.CCC......#',
    '#..........#',
    '#.CCC......#',
    '#..........#',
    '############',
  ],
  buildingMaterial: 'metal',

  machines: [
    // Basic circuit assemblers (A)
    { machineItemId: 'assembly_machine_ii', offset: { x: 2, y: 2 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 3, y: 2 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 4, y: 2 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 6, y: 2 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 7, y: 2 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 8, y: 2 }, recipe: 'electronic_circuit' },

    { machineItemId: 'assembly_machine_ii', offset: { x: 2, y: 4 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 3, y: 4 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 4, y: 4 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 6, y: 4 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 7, y: 4 }, recipe: 'electronic_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 8, y: 4 }, recipe: 'electronic_circuit' },

    // Advanced circuit assemblers (C)
    { machineItemId: 'assembly_machine_ii', offset: { x: 2, y: 6 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 3, y: 6 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 4, y: 6 }, recipe: 'advanced_circuit' },

    { machineItemId: 'assembly_machine_ii', offset: { x: 2, y: 8 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 3, y: 8 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_ii', offset: { x: 4, y: 8 }, recipe: 'advanced_circuit' },
  ],

  beltLayout: [
    // Copper wire input (tier 2 belts)
    { offset: { x: 1, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 2, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 3, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 4, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 5, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 6, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 7, y: 1 }, direction: 'east', tier: 2 },
    { offset: { x: 8, y: 1 }, direction: 'east', tier: 2 },

    // Iron plate input
    { offset: { x: 9, y: 1 }, direction: 'south', tier: 2 },
    { offset: { x: 9, y: 2 }, direction: 'south', tier: 2 },
    { offset: { x: 9, y: 3 }, direction: 'south', tier: 2 },
    { offset: { x: 9, y: 4 }, direction: 'south', tier: 2 },

    // Basic circuit output
    { offset: { x: 1, y: 5 }, direction: 'east', tier: 2 },
    { offset: { x: 2, y: 5 }, direction: 'east', tier: 2 },
    { offset: { x: 3, y: 5 }, direction: 'east', tier: 2 },
    { offset: { x: 4, y: 5 }, direction: 'east', tier: 2 },
    { offset: { x: 5, y: 5 }, direction: 'south', tier: 2 },

    // Advanced circuit output
    { offset: { x: 1, y: 9 }, direction: 'east', tier: 2 },
    { offset: { x: 2, y: 9 }, direction: 'east', tier: 2 },
    { offset: { x: 3, y: 9 }, direction: 'east', tier: 2 },
    { offset: { x: 4, y: 9 }, direction: 'east', tier: 2 },
    { offset: { x: 5, y: 9 }, direction: 'south', tier: 2 },
  ],

  powerRequired: 1800, // 12 machines * 150 kW

  productionGoal: {
    outputItemId: 'electronic_circuit',
    targetRate: 240, // 12 machines * 20/min
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['electronics', 'assembly'],
    accessPoints: [{ x: 5, y: 0 }, { x: 5, y: 15 }],
  },
};
```

### 3.3 Oil Refinery Complex (24x32)

**Purpose:** Process crude oil into petroleum products.

```typescript
export const OIL_REFINERY: FactoryBlueprint = {
  id: 'oil_refinery',
  name: 'Oil Refinery Complex',
  tier: 3,
  size: { width: 24, height: 32 },

  layoutString: [
    '########################',
    '#......................#',
    '#.RRRR....RRRR....RRRR.#',
    '#......................#',
    '#.CCCC....CCCC....CCCC.#',
    '#......................#',
    '#.PPPP....PPPP........#',
    '#......................#',
    '#.SSSS...............S.#',
    '#......................#',
    '########################',
  ],
  buildingMaterial: 'metal',

  machines: [
    // Refineries (R)
    { machineItemId: 'oil_refinery', offset: { x: 2, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 3, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 4, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 5, y: 2 } },

    { machineItemId: 'oil_refinery', offset: { x: 10, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 11, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 12, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 13, y: 2 } },

    { machineItemId: 'oil_refinery', offset: { x: 18, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 19, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 20, y: 2 } },
    { machineItemId: 'oil_refinery', offset: { x: 21, y: 2 } },

    // Chemical plants (C)
    { machineItemId: 'chemical_plant', offset: { x: 2, y: 4 }, recipe: 'plastic_bar' },
    { machineItemId: 'chemical_plant', offset: { x: 3, y: 4 }, recipe: 'plastic_bar' },
    { machineItemId: 'chemical_plant', offset: { x: 4, y: 4 }, recipe: 'sulfur' },
    { machineItemId: 'chemical_plant', offset: { x: 5, y: 4 }, recipe: 'sulfur' },

    { machineItemId: 'chemical_plant', offset: { x: 10, y: 4 }, recipe: 'lubricant' },
    { machineItemId: 'chemical_plant', offset: { x: 11, y: 4 }, recipe: 'lubricant' },
    { machineItemId: 'chemical_plant', offset: { x: 12, y: 4 }, recipe: 'battery' },
    { machineItemId: 'chemical_plant', offset: { x: 13, y: 4 }, recipe: 'battery' },

    { machineItemId: 'chemical_plant', offset: { x: 18, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'chemical_plant', offset: { x: 19, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'chemical_plant', offset: { x: 20, y: 4 }, recipe: 'explosives' },
    { machineItemId: 'chemical_plant', offset: { x: 21, y: 4 }, recipe: 'explosives' },

    // Pumpjacks (P - pump crude oil from ground)
    { machineItemId: 'pumpjack', offset: { x: 2, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 3, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 4, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 5, y: 6 } },

    { machineItemId: 'pumpjack', offset: { x: 10, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 11, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 12, y: 6 } },
    { machineItemId: 'pumpjack', offset: { x: 13, y: 6 } },

    // Storage tanks (S)
    { machineItemId: 'storage_tank', offset: { x: 2, y: 8 } },
    { machineItemId: 'storage_tank', offset: { x: 3, y: 8 } },
    { machineItemId: 'storage_tank', offset: { x: 4, y: 8 } },
    { machineItemId: 'storage_tank', offset: { x: 5, y: 8 } },

    { machineItemId: 'storage_tank', offset: { x: 21, y: 8 } },
  ],

  // Fluid pipes (represented as special belts for liquids)
  fluidPipes: [
    // Crude oil from pumpjacks to refineries
    { from: { x: 2, y: 7 }, to: { x: 2, y: 3 }, fluid: 'crude_oil' },
    { from: { x: 10, y: 7 }, to: { x: 10, y: 3 }, fluid: 'crude_oil' },

    // Petroleum to chemical plants
    { from: { x: 3, y: 3 }, to: { x: 3, y: 5 }, fluid: 'petroleum_gas' },
    { from: { x: 11, y: 3 }, to: { x: 11, y: 5 }, fluid: 'petroleum_gas' },

    // Light oil to storage
    { from: { x: 4, y: 3 }, to: { x: 4, y: 8 }, fluid: 'light_oil' },

    // Heavy oil to storage
    { from: { x: 5, y: 3 }, to: { x: 5, y: 8 }, fluid: 'heavy_oil' },
  ],

  powerRequired: 4800, // Massive power consumption

  productionGoal: {
    outputItemId: 'plastic_bar',
    targetRate: 300,
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['chemical_engineering', 'petroleum'],
    accessPoints: [{ x: 11, y: 0 }, { x: 11, y: 31 }],
  },
};
```

---

## Tier 4: Digital Age - Advanced Manufacturing

### 4.1 Processing Unit Fabrication Plant (16x20)

**Purpose:** Produce processing units for advanced electronics.

```typescript
export const PROCESSING_UNIT_PLANT: FactoryBlueprint = {
  id: 'processing_unit_plant',
  name: 'Processing Unit Fabrication Plant',
  tier: 4,
  size: { width: 16, height: 20 },

  layoutString: [
    '################',
    '#..............#',
    '#.AAAA..AAAA...#',
    '#..............#',
    '#.AAAA..AAAA...#',
    '#..............#',
    '#.PPPP..PPPP...#',
    '#..............#',
    '#.PPPP..PPPP...#',
    '#..............#',
    '#.QQQQ........#',
    '#..............#',
    '################',
  ],
  buildingMaterial: 'advanced_alloy',

  machines: [
    // Advanced circuit assemblers (A)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 2 }, recipe: 'advanced_circuit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 2 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 2 }, recipe: 'advanced_circuit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 4 }, recipe: 'advanced_circuit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 4 }, recipe: 'advanced_circuit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 4 }, recipe: 'advanced_circuit' },

    // Processing unit assemblers (P)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 6 }, recipe: 'processing_unit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 6 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 6 }, recipe: 'processing_unit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 8 }, recipe: 'processing_unit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 8 }, recipe: 'processing_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 8 }, recipe: 'processing_unit' },

    // Quantum processors (Q - end-game)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 10 }, recipe: 'quantum_processor' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 10 }, recipe: 'quantum_processor' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 10 }, recipe: 'quantum_processor' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 10 }, recipe: 'quantum_processor' },
  ],

  // All machines have speed modules
  moduleConfiguration: {
    allMachines: [
      { moduleType: 'speed', bonus: 0.5 },
      { moduleType: 'speed', bonus: 0.5 },
    ],
  },

  beltLayout: [
    // Electric tier 3 belts (advanced)
    // Input feeds from sides, output down middle
  ],

  powerRequired: 6000, // 32 machines * ~200 kW with modules

  productionGoal: {
    outputItemId: 'processing_unit',
    targetRate: 480, // 16 machines * 30/min
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['quantum_engineering', 'nanofabrication'],
    accessPoints: [{ x: 7, y: 0 }],
  },
};
```

### 4.2 Module Production Facility (10x12)

**Purpose:** Produce productivity, speed, and efficiency modules.

```typescript
export const MODULE_FACTORY: FactoryBlueprint = {
  id: 'module_factory',
  name: 'Module Production Facility',
  tier: 4,
  size: { width: 10, height: 12 },

  layoutString: [
    '##########',
    '#........#',
    '#.SSS.EEE#',
    '#........#',
    '#.SSS.EEE#',
    '#........#',
    '#.PPP....#',
    '#........#',
    '##########',
  ],
  buildingMaterial: 'advanced_alloy',

  machines: [
    // Speed modules (S)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 2 }, recipe: 'speed_module_1' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 2 }, recipe: 'speed_module_2' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 2 }, recipe: 'speed_module_3' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 4 }, recipe: 'speed_module_1' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 4 }, recipe: 'speed_module_2' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 4 }, recipe: 'speed_module_3' },

    // Efficiency modules (E)
    { machineItemId: 'assembly_machine_iii', offset: { x: 6, y: 2 }, recipe: 'efficiency_module_1' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 7, y: 2 }, recipe: 'efficiency_module_2' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 2 }, recipe: 'efficiency_module_3' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 6, y: 4 }, recipe: 'efficiency_module_1' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 7, y: 4 }, recipe: 'efficiency_module_2' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 8, y: 4 }, recipe: 'efficiency_module_3' },

    // Productivity modules (P)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 6 }, recipe: 'productivity_module_1' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 6 }, recipe: 'productivity_module_2' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 6 }, recipe: 'productivity_module_3' },
  ],

  powerRequired: 3000,

  productionGoal: {
    outputItemId: 'speed_module_3',
    targetRate: 20,
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['advanced_engineering'],
    accessPoints: [{ x: 4, y: 0 }],
  },
};
```

---

## Tier 5: Space Age - Orbital Industry

### 5.1 Rocket Component Facility (30x40)

**Purpose:** Manufacture rocket parts for space launches.

```typescript
export const ROCKET_FACTORY: FactoryBlueprint = {
  id: 'rocket_factory',
  name: 'Rocket Component Manufacturing',
  tier: 5,
  size: { width: 30, height: 40 },

  layoutString: [
    // Large complex layout
    '##############################',
    '#............................#',
    '#.FFFFF..CCCC..EEEE..SSSS....#',
    '#............................#',
    '#.FFFFF..CCCC..EEEE..SSSS....#',
    '#............................#',
    '#.FFFFF..CCCC..EEEE..SSSS....#',
    '#............................#',
    '#.RRRRRRRRRRRRRRRR...........#',
    '#............................#',
    '##############################',
  ],
  buildingMaterial: 'titanium_alloy',

  machines: [
    // Rocket fuel production (F)
    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 2 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 2 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 2 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 2 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 6, y: 2 }, recipe: 'rocket_fuel' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 4 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 6, y: 4 }, recipe: 'rocket_fuel' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 2, y: 6 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 3, y: 6 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 4, y: 6 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 5, y: 6 }, recipe: 'rocket_fuel' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 6, y: 6 }, recipe: 'rocket_fuel' },

    // Rocket control units (C)
    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 2 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 2 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 2 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 12, y: 2 }, recipe: 'rocket_control_unit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 4 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 4 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 4 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 12, y: 4 }, recipe: 'rocket_control_unit' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 9, y: 6 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 6 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 11, y: 6 }, recipe: 'rocket_control_unit' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 12, y: 6 }, recipe: 'rocket_control_unit' },

    // Low density structures (E for lightweight)
    { machineItemId: 'assembly_machine_iii', offset: { x: 15, y: 2 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 16, y: 2 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 17, y: 2 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 18, y: 2 }, recipe: 'low_density_structure' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 15, y: 4 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 16, y: 4 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 17, y: 4 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 18, y: 4 }, recipe: 'low_density_structure' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 15, y: 6 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 16, y: 6 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 17, y: 6 }, recipe: 'low_density_structure' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 18, y: 6 }, recipe: 'low_density_structure' },

    // Satellite assembly (S)
    { machineItemId: 'assembly_machine_iii', offset: { x: 21, y: 2 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 22, y: 2 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 23, y: 2 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 24, y: 2 }, recipe: 'satellite' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 21, y: 4 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 22, y: 4 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 23, y: 4 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 24, y: 4 }, recipe: 'satellite' },

    { machineItemId: 'assembly_machine_iii', offset: { x: 21, y: 6 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 22, y: 6 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 23, y: 6 }, recipe: 'satellite' },
    { machineItemId: 'assembly_machine_iii', offset: { x: 24, y: 6 }, recipe: 'satellite' },

    // Rocket silos (R - final assembly)
    { machineItemId: 'rocket_silo', offset: { x: 2, y: 8 } },
    { machineItemId: 'rocket_silo', offset: { x: 5, y: 8 } },
    { machineItemId: 'rocket_silo', offset: { x: 8, y: 8 } },
    { machineItemId: 'rocket_silo', offset: { x: 11, y: 8 } },
    { machineItemId: 'rocket_silo', offset: { x: 14, y: 8 } },
    { machineItemId: 'rocket_silo', offset: { x: 17, y: 8 } },
  ],

  // Productivity modules in all rocket silos
  moduleConfiguration: {
    rocketSilos: [
      { moduleType: 'productivity', bonus: 0.1 },
      { moduleType: 'productivity', bonus: 0.1 },
      { moduleType: 'productivity', bonus: 0.1 },
      { moduleType: 'productivity', bonus: 0.1 },
    ],
  },

  powerRequired: 12000, // Massive power draw

  productionGoal: {
    outputItemId: 'satellite',
    targetRate: 60, // 1 per second
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['aerospace_engineering', 'rocket_science'],
    accessPoints: [{ x: 14, y: 0 }, { x: 14, y: 39 }],
  },
};
```

### 5.2 Space Elevator Base Station (40x40)

**Purpose:** Transport materials to orbit without rockets.

```typescript
export const SPACE_ELEVATOR: FactoryBlueprint = {
  id: 'space_elevator',
  name: 'Space Elevator Base Station',
  tier: 5,
  size: { width: 40, height: 40 },

  layoutString: [
    '########################################',
    '#......................................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#.........EEEEEEEEEE...................#',
    '#......................................#',
    '#..CCCC..........CCCC.........CCCC.....#',
    '#......................................#',
    '#..LLLL..........LLLL.........LLLL.....#',
    '#......................................#',
    '########################################',
  ],
  buildingMaterial: 'graphene_composite',

  machines: [
    // Elevator shaft (E - 100 segments tall)
    ...Array.from({ length: 10 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => ({
        machineItemId: 'elevator_segment',
        offset: { x: 10 + col, y: 2 + row }
      }))
    ).flat(),

    // Cargo pods (C)
    { machineItemId: 'cargo_pod', offset: { x: 3, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 4, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 5, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 6, y: 13 } },

    { machineItemId: 'cargo_pod', offset: { x: 14, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 15, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 16, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 17, y: 13 } },

    { machineItemId: 'cargo_pod', offset: { x: 25, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 26, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 27, y: 13 } },
    { machineItemId: 'cargo_pod', offset: { x: 28, y: 13 } },

    // Loading stations (L)
    { machineItemId: 'loading_station', offset: { x: 3, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 4, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 5, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 6, y: 15 } },

    { machineItemId: 'loading_station', offset: { x: 14, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 15, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 16, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 17, y: 15 } },

    { machineItemId: 'loading_station', offset: { x: 25, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 26, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 27, y: 15 } },
    { machineItemId: 'loading_station', offset: { x: 28, y: 15 } },
  ],

  powerRequired: 50000, // 50 MW continuous

  logisticsNetwork: {
    // Connects to orbital stations
    orbitalConnections: true,
    upliftCapacity: 1000, // tons per hour
  },

  productionGoal: {
    outputItemId: 'orbital_payload',
    targetRate: 1000, // 1000 tons/hour to orbit
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['structural_engineering', 'orbital_logistics'],
    accessPoints: [
      { x: 19, y: 0 },
      { x: 19, y: 39 },
      { x: 0, y: 19 },
      { x: 39, y: 19 },
    ],
  },
};
```

---

## Tier 6: Stellar Age - Dyson Swarm

### 6.1 Solar Sail Fabrication Mega-Complex (100x100)

**Purpose:** Mass produce solar sails for Dyson Swarm.

```typescript
export const SOLAR_SAIL_MEGAFACTORY: FactoryBlueprint = {
  id: 'solar_sail_megafactory',
  name: 'Solar Sail Fabrication Mega-Complex',
  tier: 6,
  size: { width: 100, height: 100 },

  layoutString: [
    // Massive 100x100 grid - abbreviated for brevity
    // Contains 16 production zones, each 20x20
  ],
  buildingMaterial: 'exotic_matter_composite',

  productionZones: [
    {
      name: 'Reflector Production',
      offset: { x: 5, y: 5 },
      size: { width: 20, height: 20 },
      machines: [
        // 64 assembly machines producing ultra-thin reflectors
        ...Array.from({ length: 64 }, (_, i) => ({
          machineItemId: 'nanofabricator',
          offset: { x: (i % 8) * 2, y: Math.floor(i / 8) * 2 },
          recipe: 'solar_reflector',
        })),
      ],
    },
    {
      name: 'Sail Frame Production',
      offset: { x: 30, y: 5 },
      size: { width: 20, height: 20 },
      machines: [
        // 64 assembly machines producing lightweight frames
        ...Array.from({ length: 64 }, (_, i) => ({
          machineItemId: 'nanofabricator',
          offset: { x: (i % 8) * 2, y: Math.floor(i / 8) * 2 },
          recipe: 'graphene_frame',
        })),
      ],
    },
    {
      name: 'Propulsion Module Assembly',
      offset: { x: 55, y: 5 },
      size: { width: 20, height: 20 },
      machines: [
        // Ion drive production
        ...Array.from({ length: 64 }, (_, i) => ({
          machineItemId: 'nanofabricator',
          offset: { x: (i % 8) * 2, y: Math.floor(i / 8) * 2 },
          recipe: 'ion_drive_micro',
        })),
      ],
    },
    {
      name: 'Navigation Computer Assembly',
      offset: { x: 80, y: 5 },
      size: { width: 20, height: 20 },
      machines: [
        // Quantum navigation chips
        ...Array.from({ length: 64 }, (_, i) => ({
          machineItemId: 'quantum_fab',
          offset: { x: (i % 8) * 2, y: Math.floor(i / 8) * 2 },
          recipe: 'nav_quantum_chip',
        })),
      ],
    },
    // 12 more zones...
    {
      name: 'Final Sail Assembly Line 1',
      offset: { x: 5, y: 75 },
      size: { width: 40, height: 20 },
      machines: [
        // 32 final assembly stations
        ...Array.from({ length: 32 }, (_, i) => ({
          machineItemId: 'mega_assembler',
          offset: { x: i * 1.2, y: 10 },
          recipe: 'solar_sail_complete',
        })),
      ],
    },
    {
      name: 'Final Sail Assembly Line 2',
      offset: { x: 50, y: 75 },
      size: { width: 40, height: 20 },
      machines: [
        // 32 more final assembly stations
        ...Array.from({ length: 32 }, (_, i) => ({
          machineItemId: 'mega_assembler',
          offset: { x: i * 1.2, y: 10 },
          recipe: 'solar_sail_complete',
        })),
      ],
    },
  ],

  // Tier 3 belts everywhere (advanced logistics)
  beltTier: 3,

  // Quantum logistics network (instant transfer within factory)
  logisticsHubs: [
    { offset: { x: 25, y: 25 }, tier: 3, range: 100 },
    { offset: { x: 75, y: 25 }, tier: 3, range: 100 },
    { offset: { x: 25, y: 75 }, tier: 3, range: 100 },
    { offset: { x: 75, y: 75 }, tier: 3, range: 100 },
  ],

  powerRequired: 500000, // 500 MW

  productionGoal: {
    outputItemId: 'solar_sail',
    targetRate: 10000, // 10,000 sails per minute
  },

  agentRequirements: {
    agentType: 'flying', // Factory too large for ground agents to navigate efficiently
    requiredSkills: ['stellar_engineering', 'nanofabrication', 'quantum_assembly'],
    accessPoints: [
      // Multiple aerial access points
      { x: 50, y: 0, type: 'aerial' },
      { x: 50, y: 99, type: 'aerial' },
      { x: 0, y: 50, type: 'aerial' },
      { x: 99, y: 50, type: 'aerial' },
    ],
  },
};
```

### 6.2 Orbital Launcher Array (50x50 each, 4 total)

**Purpose:** Launch solar sails into stellar orbit.

```typescript
export const ORBITAL_LAUNCHER: FactoryBlueprint = {
  id: 'orbital_launcher',
  name: 'Mass Driver Orbital Launcher',
  tier: 6,
  size: { width: 50, height: 50 },

  layoutString: [
    // 50x50 electromagnetic mass driver
  ],
  buildingMaterial: 'superconducting_alloy',

  machines: [
    // Mass driver coils (100 segments)
    ...Array.from({ length: 100 }, (_, i) => ({
      machineItemId: 'em_coil_segment',
      offset: {
        x: 25,
        y: Math.floor(i / 2)
      },
    })),

    // Loading mechanism
    { machineItemId: 'sail_loader', offset: { x: 25, y: 2 } },

    // Capacitor banks (C)
    ...Array.from({ length: 50 }, (_, i) => ({
      machineItemId: 'supercapacitor_bank',
      offset: {
        x: 2 + (i % 10) * 4,
        y: 10 + Math.floor(i / 10) * 4
      },
    })),

    // Launch control
    { machineItemId: 'launch_computer', offset: { x: 25, y: 45 } },
  ],

  powerRequired: 2000000, // 2 GW per launch
  powerStorage: 10000000, // 10 GWh capacitor banks

  launchRate: 600, // 10 per second (600 per minute)

  productionGoal: {
    outputItemId: 'orbital_solar_sail',
    targetRate: 600,
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['electromagnetic_engineering', 'orbital_mechanics'],
    accessPoints: [{ x: 25, y: 0 }],
  },
};
```

### 6.3 Antimatter Reactor (20x20)

**Purpose:** Power generation for stellar-scale projects.

```typescript
export const ANTIMATTER_REACTOR: FactoryBlueprint = {
  id: 'antimatter_reactor',
  name: 'Antimatter Power Station',
  tier: 6,
  size: { width: 20, height: 20 },

  layoutString: [
    '####################',
    '#..................#',
    '#...CCCCCCCCCC.....#',
    '#...CCCCCCCCCC.....#',
    '#...CCCCCCCCCC.....#',
    '#...CCCCCCCCCC.....#',
    '#..................#',
    '#...RRRRRRRRRR.....#',
    '#..................#',
    '#...GGGGGGGGGG.....#',
    '#..................#',
    '####################',
  ],
  buildingMaterial: 'exotic_shielding',

  machines: [
    // Antimatter containment (C)
    ...Array.from({ length: 40 }, (_, i) => ({
      machineItemId: 'antimatter_trap',
      offset: {
        x: 4 + (i % 10),
        y: 2 + Math.floor(i / 10)
      },
    })),

    // Reaction chamber (R)
    ...Array.from({ length: 10 }, (_, i) => ({
      machineItemId: 'antimatter_reactor_core',
      offset: { x: 4 + i, y: 7 },
    })),

    // Power generators (G)
    ...Array.from({ length: 10 }, (_, i) => ({
      machineItemId: 'gamma_turbine',
      offset: { x: 4 + i, y: 9 },
    })),
  ],

  fuelConsumption: {
    antimatter: 0.001, // micrograms per second
    matter: 0.001,
  },

  powerGeneration: 10000000, // 10 GW

  safetyRadius: 100, // Tiles - catastrophic failure zone

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['antimatter_physics', 'containment_engineering'],
    accessPoints: [{ x: 9, y: 0 }],
    requiredProtection: 'radiation_suit',
  },
};
```

### 6.4 Dyson Swarm Control Center (30x30)

**Purpose:** Monitor and coordinate millions of solar sails.

```typescript
export const DYSON_SWARM_CONTROL: FactoryBlueprint = {
  id: 'dyson_swarm_control',
  name: 'Dyson Swarm Coordination Center',
  tier: 6,
  size: { width: 30, height: 30 },

  layoutString: [
    '##############################',
    '#............................#',
    '#...QQQQQQQQ................#',
    '#...QQQQQQQQ................#',
    '#............................#',
    '#...NNNNNNNN................#',
    '#...NNNNNNNN................#',
    '#............................#',
    '#...TTTTTTTT................#',
    '#...TTTTTTTT................#',
    '#............................#',
    '#...DDDDDDDDDDDDDDDD........#',
    '#............................#',
    '##############################',
  ],
  buildingMaterial: 'quantum_crystal',

  machines: [
    // Quantum computers (Q - coordinate sail positions)
    ...Array.from({ length: 16 }, (_, i) => ({
      machineItemId: 'quantum_supercomputer',
      offset: {
        x: 4 + (i % 8),
        y: 2 + Math.floor(i / 8)
      },
    })),

    // Neural networks (N - predictive orbit modeling)
    ...Array.from({ length: 16 }, (_, i) => ({
      machineItemId: 'neural_compute_cluster',
      offset: {
        x: 4 + (i % 8),
        y: 5 + Math.floor(i / 8)
      },
    })),

    // Transmission arrays (T - communicate with sails)
    ...Array.from({ length: 16 }, (_, i) => ({
      machineItemId: 'quantum_transmitter',
      offset: {
        x: 4 + (i % 8),
        y: 8 + Math.floor(i / 8)
      },
    })),

    // Data storage (D - track all sail telemetry)
    ...Array.from({ length: 16 }, (_, i) => ({
      machineItemId: 'holographic_storage',
      offset: { x: 4 + i, y: 11 },
    })),
  ],

  powerRequired: 100000, // 100 MW

  swarmCapacity: 100000000, // Can coordinate 100 million sails

  metrics: {
    sailsDeployed: 0,
    energyCaptured: 0, // Watts from Dyson Swarm
    swarmCompletionPercent: 0, // 0-100%
  },

  productionGoal: {
    outputItemId: 'stellar_energy', // Power beamed back to planet
    targetRate: 1000000000, // 1 TW when complete
  },

  agentRequirements: {
    agentType: 'ground',
    requiredSkills: ['stellar_coordination', 'quantum_networking'],
    accessPoints: [{ x: 14, y: 0 }],
  },
};
```

---

## Complete City Layout

### Dyson Swarm Factory City (500x500)

**Purpose:** Entire integrated city that produces a Dyson Swarm.

```typescript
export const DYSON_FACTORY_CITY: FactoryBlueprint = {
  id: 'dyson_factory_city',
  name: 'Stellar Engineering Mega-City',
  tier: 6,
  size: { width: 500, height: 500 },

  districts: [
    // Resource extraction district (50x100)
    {
      name: 'Mining & Smelting Quarter',
      offset: { x: 0, y: 0 },
      buildings: [
        STONE_FURNACE_SMELTERY, // Early
        STEAM_SMELTER, // Mid
        // ... advanced smelters
      ],
    },

    // Component manufacturing (150x150)
    {
      name: 'Industrial Fabrication District',
      offset: { x: 60, y: 0 },
      buildings: [
        GEAR_FACTORY,
        CIRCUIT_FACTORY,
        PROCESSING_UNIT_PLANT,
        MODULE_FACTORY,
      ],
    },

    // Chemical processing (100x100)
    {
      name: 'Chemical & Petroleum Quarter',
      offset: { x: 220, y: 0 },
      buildings: [
        OIL_REFINERY,
        // Battery factories
        // Explosive production
      ],
    },

    // Power generation (200x100)
    {
      name: 'Energy District',
      offset: { x: 0, y: 110 },
      buildings: [
        SOLAR_FARM,
        SOLAR_FARM,
        SOLAR_FARM,
        SOLAR_FARM,
        ANTIMATTER_REACTOR,
        ANTIMATTER_REACTOR,
      ],
    },

    // Space infrastructure (200x150)
    {
      name: 'Aerospace Quarter',
      offset: { x: 210, y: 110 },
      buildings: [
        ROCKET_FACTORY,
        SPACE_ELEVATOR,
      ],
    },

    // Sail production mega-complex (300x200)
    {
      name: 'Solar Sail Production Zone',
      offset: { x: 0, y: 220 },
      buildings: [
        SOLAR_SAIL_MEGAFACTORY,
        SOLAR_SAIL_MEGAFACTORY, // 2nd factory
        SOLAR_SAIL_MEGAFACTORY, // 3rd factory
      ],
    },

    // Launch facilities (200x80, 4 launchers)
    {
      name: 'Orbital Launch Complex',
      offset: { x: 310, y: 220 },
      buildings: [
        ORBITAL_LAUNCHER,
        ORBITAL_LAUNCHER,
        ORBITAL_LAUNCHER,
        ORBITAL_LAUNCHER,
      ],
    },

    // Command & control (30x30)
    {
      name: 'Swarm Coordination Center',
      offset: { x: 235, y: 430 },
      buildings: [
        DYSON_SWARM_CONTROL,
      ],
    },

    // Residential (100x80)
    {
      name: 'Engineer Habitation Zone',
      offset: { x: 280, y: 430 },
      buildings: [
        // Housing for thousands of engineers
        // Recreation facilities
        // Life support
      ],
    },
  ],

  infrastructure: {
    // Massive power grid
    powerGrid: {
      totalGeneration: 50000000, // 50 GW
      totalConsumption: 45000000, // 45 GW
      transmission: 'quantum_entangled', // Zero loss
    },

    // Tier 3 logistics everywhere
    logisticsNetwork: {
      tier: 3,
      hubs: 50,
      coverage: '100%',
      throughput: 1000000, // items per minute
    },

    // Transport
    transportation: {
      agentType: 'mixed', // Ground + aerial
      maglev_trains: 20, // Fast internal transport
      aerial_drones: 1000, // For flying agents
    },
  },

  totalPopulation: 50000, // Engineers and technicians

  productionGoals: {
    solar_sail: {
      targetRate: 30000, // 30k per minute from 3 factories
      totalProduced: 0,
      targetTotal: 100000000, // 100 million sails for functional swarm
    },
    stellar_energy: {
      currentOutput: 0,
      targetOutput: 1000000000000, // 1 TW when 100M sails deployed
    },
  },

  completionTime: {
    // At 30k sails/min = 1.8M per hour = 43.2M per day
    // 100M sails = ~2.3 days of continuous production
    estimate: '2.3 days',

    // Realistically with maintenance, expansion:
    realistic: '1 month game time',
  },

  agentRequirements: {
    agentTypes: ['ground', 'flying'],
    totalAgents: 50000,
    skillDistribution: {
      mining: 5000,
      smelting: 3000,
      engineering: 10000,
      electronics: 8000,
      chemical_engineering: 4000,
      aerospace_engineering: 5000,
      stellar_engineering: 2000,
      quantum_engineering: 3000,
      antimatter_physics: 1000,
      logistics: 5000,
      maintenance: 4000,
    },
  },
};
```

---

## Production Chain Summary

From raw resources to Dyson Swarm:

1. **Iron Ore** → Smelter → **Iron Ingot**
2. **Copper Ore** → Smelter → **Copper Ingot**
3. **Iron Ingot** → Gear Factory → **Gears**
4. **Copper Ingot** → Circuit Factory → **Copper Wire** → **Electronic Circuit**
5. **Electronic Circuit** + **Iron Ingot** → Circuit Factory → **Advanced Circuit**
6. **Crude Oil** → Refinery → **Petroleum** → **Plastic**
7. **Advanced Circuit** + **Plastic** → Processing Unit Plant → **Processing Unit**
8. **Processing Unit** + **Advanced Circuit** → Module Factory → **Modules**
9. **Rocket Fuel** + **Processing Unit** → Rocket Factory → **Rocket Parts** → **Satellite**
10. **Satellite** + **Steel** → Solar Sail Factory → **Solar Reflector** + **Frame** + **Ion Drive** + **Navigation** → **Solar Sail**
11. **Solar Sail** → Orbital Launcher → **Deployed Sail in Orbit**
12. **100 Million Deployed Sails** = **Functional Dyson Swarm** → **1 TW of Energy**

The complete production chain requires all 6 tiers of automation working in harmony to achieve stellar engineering.
