> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Automation Research Tree - Manual to Stellar Engineering

> *"From hand tools to harnessing stars - a complete technology progression"*

This document defines the research tree for automation and factory systems, from basic manual crafting to Dyson Swarm construction. Research is done **at research benches** by agents with appropriate skills.

---

## Research System Design

### How Research Works

```typescript
/**
 * Research is performed at research benches, not automatically
 * Agents must have required skills and consume research materials
 */
interface ResearchDefinition {
  id: string;
  name: string;
  tier: number;

  /** Research cost (items consumed) */
  cost: ResourceCost[];

  /** Time to research (in ticks) */
  researchTime: number;

  /** Prerequisites (must be researched first) */
  prerequisites: string[];

  /** Required agent skills */
  requiredSkills: string[];

  /** What this research unlocks */
  unlocks: {
    buildings?: string[];
    recipes?: string[];
    machines?: string[];
    items?: string[];
  };

  /** Research category for UI grouping */
  category: 'production' | 'logistics' | 'power' | 'automation' | 'space' | 'stellar';
}

interface ResourceCost {
  itemId: string;
  amount: number;
}
```

---

## Tier 0: Stone Age (No Research Required)

**Starting technologies** - available immediately:

- Hand crafting
- Stone tools
- Basic gathering
- Manual smelting (campfire)
- Wood processing

---

## Tier 1: Manual Age - Basic Industry

### 1.1 Metallurgy

**Unlocks smelting and metal processing**

```typescript
export const RESEARCH_METALLURGY: ResearchDefinition = {
  id: 'metallurgy',
  name: 'Metallurgy',
  tier: 1,

  cost: [
    { itemId: 'stone', amount: 50 },
    { itemId: 'copper_ore', amount: 10 },
    { itemId: 'iron_ore', amount: 10 },
  ],

  researchTime: 1200, // 1 minute at 20 ticks/sec

  prerequisites: [],

  requiredSkills: ['mining', 'basic_crafting'],

  unlocks: {
    buildings: ['stone_furnace_smeltery'],
    machines: ['stone_furnace'],
    recipes: [
      'iron_ingot',
      'copper_ingot',
      'bronze_ingot',
    ],
  },

  category: 'production',
};
```

### 1.2 Advanced Smelting

**Better furnaces and alloys**

```typescript
export const RESEARCH_ADVANCED_SMELTING: ResearchDefinition = {
  id: 'advanced_smelting',
  name: 'Advanced Smelting',
  tier: 1,

  cost: [
    { itemId: 'iron_ingot', amount: 20 },
    { itemId: 'copper_ingot', amount: 20 },
    { itemId: 'coal', amount: 30 },
  ],

  researchTime: 1800,

  prerequisites: ['metallurgy'],

  requiredSkills: ['smelting'],

  unlocks: {
    machines: ['steel_furnace'],
    recipes: [
      'steel_ingot',
      'carbon_steel',
    ],
  },

  category: 'production',
};
```

### 1.3 Woodworking

**Carpentry and wood processing**

```typescript
export const RESEARCH_WOODWORKING: ResearchDefinition = {
  id: 'woodworking',
  name: 'Woodworking',
  tier: 1,

  cost: [
    { itemId: 'log', amount: 50 },
    { itemId: 'stone_tool', amount: 5 },
  ],

  researchTime: 900,

  prerequisites: [],

  requiredSkills: ['woodworking'],

  unlocks: {
    buildings: ['woodworking_workshop'],
    machines: ['sawmill', 'workbench'],
    recipes: [
      'wood_plank',
      'wooden_gear',
      'stick',
    ],
  },

  category: 'production',
};
```

### 1.4 Basic Tools

**Hand tools and manual equipment**

```typescript
export const RESEARCH_BASIC_TOOLS: ResearchDefinition = {
  id: 'basic_tools',
  name: 'Basic Tools',
  tier: 1,

  cost: [
    { itemId: 'iron_ingot', amount: 10 },
    { itemId: 'wood_plank', amount: 20 },
  ],

  researchTime: 600,

  prerequisites: ['metallurgy', 'woodworking'],

  requiredSkills: ['crafting'],

  unlocks: {
    items: [
      'iron_pickaxe',
      'iron_axe',
      'iron_hammer',
      'wrench',
    ],
  },

  category: 'production',
};
```

---

## Tier 2: Steam Age - Automation Begins

### 2.1 Steam Power

**Unlocks steam engines and mechanical power**

```typescript
export const RESEARCH_STEAM_POWER: ResearchDefinition = {
  id: 'steam_power',
  name: 'Steam Power',
  tier: 2,

  cost: [
    { itemId: 'iron_ingot', amount: 100 },
    { itemId: 'copper_ingot', amount: 50 },
    { itemId: 'gear', amount: 20 },
  ],

  researchTime: 3600, // 3 minutes

  prerequisites: ['advanced_smelting'],

  requiredSkills: ['engineering'],

  unlocks: {
    buildings: ['steam_smelter'],
    machines: [
      'boiler',
      'steam_engine',
      'water_pump',
    ],
    recipes: [
      'boiler',
      'steam_engine',
      'pipe',
    ],
  },

  category: 'power',
};
```

### 2.2 Automation I

**Basic conveyor belts and mechanical automation**

```typescript
export const RESEARCH_AUTOMATION_1: ResearchDefinition = {
  id: 'automation_1',
  name: 'Automation I - Conveyor Belts',
  tier: 2,

  cost: [
    { itemId: 'iron_ingot', amount: 50 },
    { itemId: 'gear', amount: 30 },
    { itemId: 'wood_plank', amount: 40 },
  ],

  researchTime: 2400,

  prerequisites: ['steam_power'],

  requiredSkills: ['engineering'],

  unlocks: {
    machines: [
      'wooden_belt',
      'inserter_basic',
    ],
    items: [
      'belt_tier_1',
      'inserter',
    ],
  },

  category: 'logistics',
};
```

### 2.3 Assembly Machines I

**First automated crafting machines**

```typescript
export const RESEARCH_ASSEMBLY_1: ResearchDefinition = {
  id: 'assembly_1',
  name: 'Assembly Machines I',
  tier: 2,

  cost: [
    { itemId: 'iron_ingot', amount: 80 },
    { itemId: 'gear', amount: 50 },
    { itemId: 'electronic_circuit_basic', amount: 10 },
  ],

  researchTime: 4200,

  prerequisites: ['automation_1'],

  requiredSkills: ['engineering', 'assembly'],

  unlocks: {
    buildings: ['gear_factory'],
    machines: ['assembly_machine_i'],
    recipes: [
      'assembly_machine_i',
    ],
  },

  category: 'automation',
};
```

### 2.4 Mechanical Engineering

**Gears, axles, and mechanical components**

```typescript
export const RESEARCH_MECHANICAL_ENGINEERING: ResearchDefinition = {
  id: 'mechanical_engineering',
  name: 'Mechanical Engineering',
  tier: 2,

  cost: [
    { itemId: 'iron_ingot', amount: 60 },
    { itemId: 'steel_ingot', amount: 20 },
  ],

  researchTime: 1800,

  prerequisites: ['basic_tools'],

  requiredSkills: ['engineering'],

  unlocks: {
    recipes: [
      'iron_gear',
      'steel_gear',
      'axle',
      'bearing',
    ],
  },

  category: 'production',
};
```

---

## Tier 3: Electric Age - Mass Production

### 3.1 Electricity

**Power generation and distribution**

```typescript
export const RESEARCH_ELECTRICITY: ResearchDefinition = {
  id: 'electricity',
  name: 'Electricity',
  tier: 3,

  cost: [
    { itemId: 'copper_wire', amount: 200 },
    { itemId: 'iron_ingot', amount: 100 },
    { itemId: 'steel_ingot', amount: 50 },
  ],

  researchTime: 7200, // 6 minutes

  prerequisites: ['steam_power'],

  requiredSkills: ['electrical_engineering'],

  unlocks: {
    machines: [
      'small_electric_pole',
      'medium_electric_pole',
      'power_switch',
    ],
    recipes: [
      'copper_wire',
      'electric_pole',
    ],
  },

  category: 'power',
};
```

### 3.2 Electronics

**Circuit boards and electronic components**

```typescript
export const RESEARCH_ELECTRONICS: ResearchDefinition = {
  id: 'electronics',
  name: 'Electronics',
  tier: 3,

  cost: [
    { itemId: 'copper_wire', amount: 100 },
    { itemId: 'iron_plate', amount: 50 },
  ],

  researchTime: 4800,

  prerequisites: ['electricity'],

  requiredSkills: ['electronics'],

  unlocks: {
    buildings: ['circuit_factory'],
    recipes: [
      'electronic_circuit',
      'copper_cable',
    ],
  },

  category: 'production',
};
```

### 3.3 Advanced Electronics

**Advanced circuits and processors**

```typescript
export const RESEARCH_ADVANCED_ELECTRONICS: ResearchDefinition = {
  id: 'advanced_electronics',
  name: 'Advanced Electronics',
  tier: 3,

  cost: [
    { itemId: 'electronic_circuit', amount: 100 },
    { itemId: 'plastic_bar', amount: 50 },
    { itemId: 'copper_wire', amount: 200 },
  ],

  researchTime: 9600,

  prerequisites: ['electronics', 'oil_processing'],

  requiredSkills: ['electronics'],

  unlocks: {
    recipes: [
      'advanced_circuit',
      'integrated_circuit',
    ],
  },

  category: 'production',
};
```

### 3.4 Solar Energy

**Solar panels and renewable power**

```typescript
export const RESEARCH_SOLAR_ENERGY: ResearchDefinition = {
  id: 'solar_energy',
  name: 'Solar Energy',
  tier: 3,

  cost: [
    { itemId: 'electronic_circuit', amount: 50 },
    { itemId: 'steel_ingot', amount: 100 },
    { itemId: 'copper_plate', amount: 100 },
  ],

  researchTime: 6000,

  prerequisites: ['electricity', 'electronics'],

  requiredSkills: ['electrical_engineering'],

  unlocks: {
    buildings: ['solar_farm'],
    machines: [
      'solar_panel',
      'accumulator',
    ],
    recipes: [
      'solar_panel',
      'accumulator',
    ],
  },

  category: 'power',
};
```

### 3.5 Oil Processing

**Petroleum extraction and refining**

```typescript
export const RESEARCH_OIL_PROCESSING: ResearchDefinition = {
  id: 'oil_processing',
  name: 'Oil Processing',
  tier: 3,

  cost: [
    { itemId: 'steel_ingot', amount: 150 },
    { itemId: 'electronic_circuit', amount: 30 },
    { itemId: 'stone_brick', amount: 100 },
  ],

  researchTime: 12000, // 10 minutes

  prerequisites: ['electricity'],

  requiredSkills: ['chemical_engineering'],

  unlocks: {
    buildings: ['oil_refinery'],
    machines: [
      'pumpjack',
      'oil_refinery',
      'chemical_plant',
      'storage_tank',
    ],
    recipes: [
      'basic_oil_processing',
      'advanced_oil_processing',
      'heavy_oil_cracking',
      'light_oil_cracking',
    ],
  },

  category: 'production',
};
```

### 3.6 Plastics

**Plastic production from petroleum**

```typescript
export const RESEARCH_PLASTICS: ResearchDefinition = {
  id: 'plastics',
  name: 'Plastics',
  tier: 3,

  cost: [
    { itemId: 'petroleum_gas', amount: 100 },
    { itemId: 'coal', amount: 50 },
  ],

  researchTime: 6000,

  prerequisites: ['oil_processing'],

  requiredSkills: ['chemical_engineering'],

  unlocks: {
    recipes: [
      'plastic_bar',
      'sulfur',
      'sulfuric_acid',
    ],
  },

  category: 'production',
};
```

### 3.7 Advanced Material Processing

**Steel, concrete, and advanced materials**

```typescript
export const RESEARCH_ADVANCED_MATERIALS: ResearchDefinition = {
  id: 'advanced_materials',
  name: 'Advanced Material Processing',
  tier: 3,

  cost: [
    { itemId: 'steel_ingot', amount: 100 },
    { itemId: 'stone_brick', amount: 100 },
  ],

  researchTime: 7200,

  prerequisites: ['advanced_smelting'],

  requiredSkills: ['metallurgy', 'chemistry'],

  unlocks: {
    recipes: [
      'concrete',
      'steel_plate',
      'iron_stick',
    ],
  },

  category: 'production',
};
```

### 3.8 Automation II

**Electric belts and better logistics**

```typescript
export const RESEARCH_AUTOMATION_2: ResearchDefinition = {
  id: 'automation_2',
  name: 'Automation II - Electric Belts',
  tier: 3,

  cost: [
    { itemId: 'electronic_circuit', amount: 100 },
    { itemId: 'iron_gear', amount: 100 },
    { itemId: 'steel_ingot', amount: 50 },
  ],

  researchTime: 9600,

  prerequisites: ['automation_1', 'electricity'],

  requiredSkills: ['engineering', 'electronics'],

  unlocks: {
    machines: [
      'electric_belt',
      'fast_inserter',
      'splitter',
    ],
    items: [
      'belt_tier_2',
      'fast_inserter',
    ],
  },

  category: 'logistics',
};
```

### 3.9 Assembly Machines II

**Faster automated manufacturing**

```typescript
export const RESEARCH_ASSEMBLY_2: ResearchDefinition = {
  id: 'assembly_2',
  name: 'Assembly Machines II',
  tier: 3,

  cost: [
    { itemId: 'electronic_circuit', amount: 100 },
    { itemId: 'steel_ingot', amount: 100 },
    { itemId: 'iron_gear', amount: 100 },
  ],

  researchTime: 10800,

  prerequisites: ['assembly_1', 'electronics'],

  requiredSkills: ['engineering', 'assembly'],

  unlocks: {
    machines: ['assembly_machine_ii'],
    recipes: [
      'assembly_machine_ii',
    ],
  },

  category: 'automation',
};
```

---

## Tier 4: Digital Age - Advanced Manufacturing

### 4.1 Advanced Electronics II

**Processing units and computer chips**

```typescript
export const RESEARCH_ADVANCED_ELECTRONICS_2: ResearchDefinition = {
  id: 'advanced_electronics_2',
  name: 'Processing Units',
  tier: 4,

  cost: [
    { itemId: 'advanced_circuit', amount: 200 },
    { itemId: 'electronic_circuit', amount: 200 },
    { itemId: 'sulfuric_acid', amount: 100 },
  ],

  researchTime: 18000, // 15 minutes

  prerequisites: ['advanced_electronics'],

  requiredSkills: ['electronics', 'nanofabrication'],

  unlocks: {
    buildings: ['processing_unit_plant'],
    recipes: [
      'processing_unit',
    ],
  },

  category: 'production',
};
```

### 4.2 Modules

**Production modules for machine enhancement**

```typescript
export const RESEARCH_MODULES: ResearchDefinition = {
  id: 'modules',
  name: 'Production Modules',
  tier: 4,

  cost: [
    { itemId: 'advanced_circuit', amount: 100 },
    { itemId: 'electronic_circuit', amount: 100 },
  ],

  researchTime: 14400,

  prerequisites: ['advanced_electronics'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    buildings: ['module_factory'],
    recipes: [
      'speed_module_1',
      'efficiency_module_1',
      'productivity_module_1',
    ],
  },

  category: 'automation',
};
```

### 4.3 Speed Modules 2

**Advanced speed modules**

```typescript
export const RESEARCH_SPEED_MODULES_2: ResearchDefinition = {
  id: 'speed_modules_2',
  name: 'Speed Modules 2',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 50 },
    { itemId: 'advanced_circuit', amount: 50 },
    { itemId: 'speed_module_1', amount: 4 },
  ],

  researchTime: 21600,

  prerequisites: ['modules', 'advanced_electronics_2'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    recipes: ['speed_module_2'],
  },

  category: 'automation',
};
```

### 4.4 Speed Modules 3

**Ultimate speed modules**

```typescript
export const RESEARCH_SPEED_MODULES_3: ResearchDefinition = {
  id: 'speed_modules_3',
  name: 'Speed Modules 3',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'advanced_circuit', amount: 100 },
    { itemId: 'speed_module_2', amount: 4 },
  ],

  researchTime: 28800,

  prerequisites: ['speed_modules_2'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    recipes: ['speed_module_3'],
  },

  category: 'automation',
};
```

### 4.5 Productivity Modules 2 & 3

**Advanced productivity modules**

```typescript
export const RESEARCH_PRODUCTIVITY_MODULES_2: ResearchDefinition = {
  id: 'productivity_modules_2',
  name: 'Productivity Modules 2',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 50 },
    { itemId: 'advanced_circuit', amount: 50 },
    { itemId: 'productivity_module_1', amount: 4 },
  ],

  researchTime: 21600,

  prerequisites: ['modules', 'advanced_electronics_2'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    recipes: ['productivity_module_2'],
  },

  category: 'automation',
};

export const RESEARCH_PRODUCTIVITY_MODULES_3: ResearchDefinition = {
  id: 'productivity_modules_3',
  name: 'Productivity Modules 3',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'advanced_circuit', amount: 100 },
    { itemId: 'productivity_module_2', amount: 4 },
  ],

  researchTime: 28800,

  prerequisites: ['productivity_modules_2'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    recipes: ['productivity_module_3'],
  },

  category: 'automation',
};
```

### 4.6 Automation III

**Advanced belts and logistics**

```typescript
export const RESEARCH_AUTOMATION_3: ResearchDefinition = {
  id: 'automation_3',
  name: 'Automation III - Express Belts',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'advanced_circuit', amount: 100 },
    { itemId: 'steel_ingot', amount: 200 },
  ],

  researchTime: 18000,

  prerequisites: ['automation_2', 'advanced_electronics_2'],

  requiredSkills: ['engineering', 'electronics'],

  unlocks: {
    machines: [
      'express_belt',
      'stack_inserter',
    ],
    items: [
      'belt_tier_3',
      'stack_inserter',
    ],
  },

  category: 'logistics',
};
```

### 4.7 Assembly Machines III

**Ultimate manufacturing speed**

```typescript
export const RESEARCH_ASSEMBLY_3: ResearchDefinition = {
  id: 'assembly_3',
  name: 'Assembly Machines III',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'steel_ingot', amount: 200 },
    { itemId: 'advanced_circuit', amount: 100 },
  ],

  researchTime: 21600,

  prerequisites: ['assembly_2', 'advanced_electronics_2'],

  requiredSkills: ['engineering', 'assembly'],

  unlocks: {
    machines: ['assembly_machine_iii'],
    recipes: ['assembly_machine_iii'],
  },

  category: 'automation',
};
```

### 4.8 Logistics Network

**Abstracted logistics with requester/provider chests**

```typescript
export const RESEARCH_LOGISTICS_NETWORK: ResearchDefinition = {
  id: 'logistics_network',
  name: 'Logistics Network',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 200 },
    { itemId: 'advanced_circuit', amount: 200 },
    { itemId: 'steel_ingot', amount: 300 },
  ],

  researchTime: 28800, // 24 minutes

  prerequisites: ['automation_3'],

  requiredSkills: ['logistics', 'electronics'],

  unlocks: {
    machines: [
      'logistics_hub_tier_1',
      'requester_chest',
      'provider_chest',
      'storage_chest',
    ],
    recipes: [
      'logistics_hub',
      'requester_chest',
      'provider_chest',
    ],
  },

  category: 'logistics',
};
```

### 4.9 Advanced Logistics

**Faster logistics networks**

```typescript
export const RESEARCH_ADVANCED_LOGISTICS: ResearchDefinition = {
  id: 'advanced_logistics',
  name: 'Advanced Logistics',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 300 },
    { itemId: 'advanced_circuit', amount: 300 },
  ],

  researchTime: 36000,

  prerequisites: ['logistics_network'],

  requiredSkills: ['logistics', 'electronics'],

  unlocks: {
    machines: [
      'logistics_hub_tier_2',
      'buffer_chest',
    ],
  },

  category: 'logistics',
};
```

### 4.10 Production Speed 1-10

**Critical speed upgrades required for Dyson Swarm feasibility**

```typescript
// Each level increases production speed by 10%
// Level 10 = 2x production speed across ALL machines

export const RESEARCH_PRODUCTION_SPEED_1: ResearchDefinition = {
  id: 'production_speed_1',
  name: 'Production Speed 1',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'advanced_circuit', amount: 100 },
  ],

  researchTime: 14400,

  prerequisites: ['assembly_3'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    globalModifier: {
      type: 'production_speed',
      multiplier: 1.1, // +10%
    },
  },

  category: 'automation',
};

// Speed 2-5 follow same pattern, increasing cost
export const RESEARCH_PRODUCTION_SPEED_5: ResearchDefinition = {
  id: 'production_speed_5',
  name: 'Production Speed 5',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 500 },
    { itemId: 'advanced_circuit', amount: 500 },
    { itemId: 'productivity_module_2', amount: 50 },
  ],

  researchTime: 72000,

  prerequisites: ['production_speed_4'],

  requiredSkills: ['advanced_engineering'],

  unlocks: {
    globalModifier: {
      type: 'production_speed',
      multiplier: 1.5, // +50% total (cumulative)
    },
  },

  category: 'automation',
};

export const RESEARCH_PRODUCTION_SPEED_10: ResearchDefinition = {
  id: 'production_speed_10',
  name: 'Production Speed 10',
  tier: 5, // Requires space age

  cost: [
    { itemId: 'processing_unit', amount: 2000 },
    { itemId: 'quantum_processor', amount: 500 },
    { itemId: 'productivity_module_3', amount: 100 },
  ],

  researchTime: 288000, // 4 hours

  prerequisites: ['production_speed_9', 'quantum_computing'],

  requiredSkills: ['advanced_engineering', 'quantum_engineering'],

  unlocks: {
    globalModifier: {
      type: 'production_speed',
      multiplier: 2.0, // +100% (2x speed)
    },
  },

  category: 'automation',

  description: 'CRITICAL for Dyson Swarm - reduces production time from months to days',
};
```

### 4.11 Mining Productivity 1-10

**Increase resource yield from mining**

```typescript
export const RESEARCH_MINING_PRODUCTIVITY_1: ResearchDefinition = {
  id: 'mining_productivity_1',
  name: 'Mining Productivity 1',
  tier: 4,

  cost: [
    { itemId: 'processing_unit', amount: 100 },
    { itemId: 'advanced_circuit', amount: 100 },
  ],

  researchTime: 14400,

  prerequisites: ['advanced_electronics_2'],

  requiredSkills: ['mining', 'engineering'],

  unlocks: {
    globalModifier: {
      type: 'mining_yield',
      multiplier: 1.1, // +10% ore per node
    },
  },

  category: 'production',
};

// Mining productivity scales to 10 levels
// Level 10 = 2x ore yield (critical for massive resource demands)
```

---

## Tier 5: Space Age - Orbital Industry

### 5.1 Rocket Science

**Foundation for space travel**

```typescript
export const RESEARCH_ROCKET_SCIENCE: ResearchDefinition = {
  id: 'rocket_science',
  name: 'Rocket Science',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 500 },
    { itemId: 'advanced_circuit', amount: 500 },
    { itemId: 'productivity_module_1', amount: 100 },
  ],

  researchTime: 72000, // 1 hour

  prerequisites: ['advanced_electronics_2', 'modules'],

  requiredSkills: ['aerospace_engineering', 'rocket_science'],

  unlocks: {
    recipes: [
      'rocket_fuel',
    ],
  },

  category: 'space',
};
```

### 5.2 Rocket Components

**Low density structures and rocket parts**

```typescript
export const RESEARCH_ROCKET_COMPONENTS: ResearchDefinition = {
  id: 'rocket_components',
  name: 'Rocket Components',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 300 },
    { itemId: 'rocket_fuel', amount: 100 },
    { itemId: 'steel_plate', amount: 500 },
  ],

  researchTime: 86400,

  prerequisites: ['rocket_science'],

  requiredSkills: ['aerospace_engineering'],

  unlocks: {
    recipes: [
      'low_density_structure',
      'rocket_control_unit',
    ],
  },

  category: 'space',
};
```

### 5.3 Satellites

**Orbital satellite construction**

```typescript
export const RESEARCH_SATELLITES: ResearchDefinition = {
  id: 'satellites',
  name: 'Satellites',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 500 },
    { itemId: 'low_density_structure', amount: 100 },
    { itemId: 'rocket_control_unit', amount: 100 },
    { itemId: 'solar_panel', amount: 100 },
  ],

  researchTime: 108000,

  prerequisites: ['rocket_components', 'solar_energy'],

  requiredSkills: ['aerospace_engineering'],

  unlocks: {
    recipes: ['satellite'],
  },

  category: 'space',
};
```

### 5.4 Rocket Silo

**Launch facility construction**

```typescript
export const RESEARCH_ROCKET_SILO: ResearchDefinition = {
  id: 'rocket_silo',
  name: 'Rocket Silo',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 1000 },
    { itemId: 'advanced_circuit', amount: 1000 },
    { itemId: 'steel_plate', amount: 1000 },
    { itemId: 'concrete', amount: 2000 },
  ],

  researchTime: 144000, // 2 hours

  prerequisites: ['satellites'],

  requiredSkills: ['aerospace_engineering', 'structural_engineering'],

  unlocks: {
    buildings: ['rocket_factory'],
    machines: ['rocket_silo'],
    recipes: ['rocket_silo'],
  },

  category: 'space',
};
```

### 5.5 Space Elevator

**Ground-to-orbit transport without rockets**

```typescript
export const RESEARCH_SPACE_ELEVATOR: ResearchDefinition = {
  id: 'space_elevator',
  name: 'Space Elevator',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 2000 },
    { itemId: 'low_density_structure', amount: 1000 },
    { itemId: 'carbon_nanotube', amount: 10000 },
  ],

  researchTime: 216000, // 3 hours

  prerequisites: ['rocket_silo', 'advanced_materials_2'],

  requiredSkills: ['structural_engineering', 'orbital_logistics'],

  unlocks: {
    buildings: ['space_elevator'],
    machines: [
      'elevator_segment',
      'cargo_pod',
      'loading_station',
    ],
  },

  category: 'space',
};
```

### 5.6 Advanced Materials II

**Carbon nanotubes and exotic alloys**

```typescript
export const RESEARCH_ADVANCED_MATERIALS_2: ResearchDefinition = {
  id: 'advanced_materials_2',
  name: 'Advanced Materials II',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 500 },
    { itemId: 'plastic_bar', amount: 1000 },
    { itemId: 'sulfuric_acid', amount: 500 },
  ],

  researchTime: 108000,

  prerequisites: ['advanced_materials'],

  requiredSkills: ['materials_science', 'nanotechnology'],

  unlocks: {
    recipes: [
      'carbon_nanotube',
      'titanium_alloy',
      'advanced_alloy',
    ],
  },

  category: 'production',
};
```

### 5.7 Teleportation

**Dimensional teleportation for instant item transfer**

```typescript
export const RESEARCH_TELEPORTATION: ResearchDefinition = {
  id: 'teleportation',
  name: 'Teleportation',
  tier: 5,

  cost: [
    { itemId: 'processing_unit', amount: 1000 },
    { itemId: 'advanced_circuit', amount: 1000 },
    { itemId: 'arcane_crystal', amount: 500 },
  ],

  researchTime: 180000, // 2.5 hours

  prerequisites: ['advanced_logistics'],

  requiredSkills: ['dimensional_magic', 'logistics'],

  unlocks: {
    machines: [
      'teleporter_sender',
      'teleporter_receiver',
      'dimensional_stabilizer',
    ],
    recipes: [
      'teleporter_pair',
      'dimensional_anchor',
    ],
  },

  category: 'logistics',

  description: 'Enables point-to-point instant item transfer via dimensional magic. Teleporters must be paired and require power to maintain dimensional link.',
};
```

---

## Tier 6: Stellar Age - Dyson Swarm

### 6.1 Stellar Engineering

**Foundation for star-scale projects**

```typescript
export const RESEARCH_STELLAR_ENGINEERING: ResearchDefinition = {
  id: 'stellar_engineering',
  name: 'Stellar Engineering',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 5000 },
    { itemId: 'low_density_structure', amount: 5000 },
    { itemId: 'rocket_control_unit', amount: 5000 },
    { itemId: 'satellite', amount: 1000 },
  ],

  researchTime: 432000, // 6 hours

  prerequisites: ['space_elevator'],

  requiredSkills: ['stellar_engineering', 'astrophysics'],

  unlocks: {
    recipes: [
      'solar_reflector',
    ],
  },

  category: 'stellar',
};
```

### 6.2 Nanofabrication

**Molecular assembly for solar sails**

```typescript
export const RESEARCH_NANOFABRICATION: ResearchDefinition = {
  id: 'nanofabrication',
  name: 'Nanofabrication',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 3000 },
    { itemId: 'carbon_nanotube', amount: 5000 },
    { itemId: 'quantum_processor', amount: 100 },
  ],

  researchTime: 360000,

  prerequisites: ['stellar_engineering', 'quantum_computing'],

  requiredSkills: ['nanofabrication', 'quantum_engineering'],

  unlocks: {
    machines: [
      'nanofabricator',
      'molecular_assembler',
    ],
    recipes: [
      'graphene_sheet',
      'graphene_frame',
    ],
  },

  category: 'stellar',
};
```

### 6.3 Quantum Computing

**Quantum processors for swarm coordination**

```typescript
export const RESEARCH_QUANTUM_COMPUTING: ResearchDefinition = {
  id: 'quantum_computing',
  name: 'Quantum Computing',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 2000 },
    { itemId: 'advanced_circuit', amount: 2000 },
  ],

  researchTime: 288000, // 4 hours

  prerequisites: ['advanced_electronics_2'],

  requiredSkills: ['quantum_engineering'],

  unlocks: {
    machines: [
      'quantum_fab',
      'quantum_supercomputer',
    ],
    recipes: [
      'quantum_processor',
      'qubit_array',
    ],
  },

  category: 'stellar',
};
```

### 6.4 Ion Propulsion

**Micro-drives for sail positioning**

```typescript
export const RESEARCH_ION_PROPULSION: ResearchDefinition = {
  id: 'ion_propulsion',
  name: 'Ion Propulsion',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 2000 },
    { itemId: 'advanced_circuit', amount: 2000 },
    { itemId: 'low_density_structure', amount: 1000 },
  ],

  researchTime: 324000,

  prerequisites: ['rocket_science'],

  requiredSkills: ['aerospace_engineering'],

  unlocks: {
    recipes: [
      'ion_drive_micro',
      'xenon_propellant',
    ],
  },

  category: 'stellar',
};
```

### 6.5 Solar Sail Design

**Complete solar sail assembly**

```typescript
export const RESEARCH_SOLAR_SAIL: ResearchDefinition = {
  id: 'solar_sail',
  name: 'Solar Sail Design',
  tier: 6,

  cost: [
    { itemId: 'solar_reflector', amount: 1000 },
    { itemId: 'graphene_frame', amount: 1000 },
    { itemId: 'ion_drive_micro', amount: 1000 },
    { itemId: 'quantum_processor', amount: 500 },
  ],

  researchTime: 576000, // 8 hours

  prerequisites: [
    'nanofabrication',
    'quantum_computing',
    'ion_propulsion',
  ],

  requiredSkills: ['stellar_engineering', 'nanofabrication'],

  unlocks: {
    buildings: ['solar_sail_megafactory'],
    machines: ['mega_assembler'],
    recipes: ['solar_sail_complete'],
  },

  category: 'stellar',
};
```

### 6.6 Mass Driver Technology

**Electromagnetic orbital launchers**

```typescript
export const RESEARCH_MASS_DRIVER: ResearchDefinition = {
  id: 'mass_driver',
  name: 'Mass Driver Technology',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 5000 },
    { itemId: 'advanced_circuit', amount: 5000 },
    { itemId: 'steel_plate', amount: 10000 },
    { itemId: 'copper_wire', amount: 20000 },
  ],

  researchTime: 648000, // 9 hours

  prerequisites: ['space_elevator'],

  requiredSkills: ['electromagnetic_engineering', 'orbital_mechanics'],

  unlocks: {
    buildings: ['orbital_launcher'],
    machines: [
      'em_coil_segment',
      'sail_loader',
      'supercapacitor_bank',
    ],
  },

  category: 'stellar',
};
```

### 6.7 Antimatter Production

**Power for stellar-scale projects**

```typescript
export const RESEARCH_ANTIMATTER: ResearchDefinition = {
  id: 'antimatter',
  name: 'Antimatter Production',
  tier: 6,

  cost: [
    { itemId: 'processing_unit', amount: 10000 },
    { itemId: 'quantum_processor', amount: 5000 },
  ],

  researchTime: 864000, // 12 hours

  prerequisites: ['quantum_computing'],

  requiredSkills: ['antimatter_physics', 'particle_acceleration'],

  unlocks: {
    buildings: ['antimatter_reactor'],
    machines: [
      'antimatter_trap',
      'antimatter_reactor_core',
      'gamma_turbine',
    ],
    recipes: [
      'antimatter',
      'containment_field',
    ],
  },

  category: 'stellar',
};
```

### 6.8 Quantum Logistics

**Instant item transfer via entanglement**

```typescript
export const RESEARCH_QUANTUM_LOGISTICS: ResearchDefinition = {
  id: 'quantum_logistics',
  name: 'Quantum Logistics',
  tier: 6,

  cost: [
    { itemId: 'quantum_processor', amount: 2000 },
    { itemId: 'processing_unit', amount: 5000 },
  ],

  researchTime: 432000,

  prerequisites: ['advanced_logistics', 'quantum_computing'],

  requiredSkills: ['quantum_engineering', 'logistics'],

  unlocks: {
    machines: ['logistics_hub_tier_3'],
  },

  category: 'logistics',
};
```

### 6.9 AI-Mediated Teleportation

**Automated logistics with AI-driven resource management**

```typescript
export const RESEARCH_AI_MEDIATED_TELEPORTATION: ResearchDefinition = {
  id: 'ai_mediated_teleportation',
  name: 'AI-Mediated Teleportation',
  tier: 6,

  cost: [
    { itemId: 'quantum_processor', amount: 5000 },
    { itemId: 'processing_unit', amount: 10000 },
    { itemId: 'arcane_crystal', amount: 2000 },
  ],

  researchTime: 720000, // 10 hours

  prerequisites: ['teleportation', 'quantum_computing', 'quantum_logistics'],

  requiredSkills: ['dimensional_magic', 'quantum_engineering', 'ai_engineering'],

  unlocks: {
    machines: [
      'ai_logistics_coordinator',
      'auto_teleporter',
      'resource_monitor',
    ],
    recipes: [
      'neural_logistics_core',
    ],
  },

  category: 'logistics',

  description: 'Ultimate logistics system - AI monitors all factories and automatically teleports resources to keep hoppers full. If resources exist anywhere in the network, they are instantly delivered where needed. No transit time, no manual configuration required.',
};
```

### 6.10 Swarm Coordination

**Control system for millions of sails**

```typescript
export const RESEARCH_SWARM_COORDINATION: ResearchDefinition = {
  id: 'swarm_coordination',
  name: 'Swarm Coordination',
  tier: 6,

  cost: [
    { itemId: 'quantum_processor', amount: 10000 },
    { itemId: 'processing_unit', amount: 10000 },
    { itemId: 'solar_sail_complete', amount: 10000 },
  ],

  researchTime: 1080000, // 15 hours

  prerequisites: [
    'solar_sail',
    'mass_driver',
    'quantum_computing',
  ],

  requiredSkills: ['stellar_coordination', 'quantum_networking'],

  unlocks: {
    buildings: ['dyson_swarm_control'],
    machines: [
      'quantum_transmitter',
      'neural_compute_cluster',
      'holographic_storage',
    ],
  },

  category: 'stellar',
};
```

### 6.11 Dyson Swarm

**Final research - enables full Dyson Swarm construction**

```typescript
export const RESEARCH_DYSON_SWARM: ResearchDefinition = {
  id: 'dyson_swarm',
  name: 'Dyson Swarm Construction',
  tier: 6,

  cost: [
    { itemId: 'quantum_processor', amount: 20000 },
    { itemId: 'solar_sail_complete', amount: 100000 },
    { itemId: 'antimatter', amount: 1000 },
  ],

  researchTime: 1800000, // 25 hours

  prerequisites: [
    'swarm_coordination',
    'antimatter',
    'quantum_logistics',
  ],

  requiredSkills: ['stellar_engineering', 'astrophysics', 'quantum_engineering'],

  unlocks: {
    buildings: ['dyson_factory_city'],
    achievement: 'DYSON_SWARM_COMPLETE',
  },

  category: 'stellar',

  description: 'The culmination of stellar engineering - harness the power of an entire star.',
};
```

---

## Research Tree Summary

### Total Research Progression

**69 Research Projects** across 6 tiers:

- **Tier 1 (Manual Age)**: 4 research projects
- **Tier 2 (Steam Age)**: 4 research projects
- **Tier 3 (Electric Age)**: 9 research projects
- **Tier 4 (Digital Age)**: 11 research projects
- **Tier 5 (Space Age)**: 7 research projects (includes Teleportation)
- **Tier 6 (Stellar Age)**: 12 research projects (includes AI-Mediated Teleportation)

### Total Research Time

Assuming sequential research with 1 agent:

- **Tier 1**: ~1.5 hours
- **Tier 2**: ~4 hours
- **Tier 3**: ~25 hours
- **Tier 4**: ~65 hours
- **Tier 5**: ~20 hours
- **Tier 6**: ~85 hours

**Total**: ~200 hours of research with 1 agent

With parallel research (multiple benches, multiple agents):
- **10 agents**: ~20 hours
- **50 agents**: ~4 hours

### Critical Path to Dyson Swarm

The minimum research path to unlock Dyson Swarm:

1. Metallurgy → Advanced Smelting
2. Steam Power → Automation I → Assembly I
3. Electricity → Electronics → Advanced Electronics
4. Oil Processing → Plastics
5. Advanced Electronics II → Modules
6. Automation III → Logistics Network → Advanced Logistics
7. Rocket Science → Rocket Components → Satellites → Rocket Silo
8. Advanced Materials II → Space Elevator
9. Stellar Engineering → Nanofabrication + Quantum Computing + Ion Propulsion
10. Solar Sail → Mass Driver
11. Antimatter + Quantum Logistics + Swarm Coordination
12. **Dyson Swarm**

**Critical path time**: ~150 hours with 1 agent, ~15 hours with 10 agents

---

## TypeScript Implementation

```typescript
// Example: Research progression tracking
export class ResearchTree {
  private completed: Set<string> = new Set();

  canResearch(researchId: string): boolean {
    const research = RESEARCH_DEFINITIONS[researchId];

    // Check prerequisites
    for (const prereq of research.prerequisites) {
      if (!this.completed.has(prereq)) {
        return false;
      }
    }

    return true;
  }

  completeResearch(researchId: string): void {
    this.completed.add(researchId);

    const research = RESEARCH_DEFINITIONS[researchId];

    // Unlock buildings
    for (const buildingId of research.unlocks.buildings ?? []) {
      this.unlockBuilding(buildingId);
    }

    // Unlock recipes
    for (const recipeId of research.unlocks.recipes ?? []) {
      this.unlockRecipe(recipeId);
    }

    // Unlock machines
    for (const machineId of research.unlocks.machines ?? []) {
      this.unlockMachine(machineId);
    }
  }

  getAvailableResearch(): ResearchDefinition[] {
    return Object.values(RESEARCH_DEFINITIONS)
      .filter(r => !this.completed.has(r.id))
      .filter(r => this.canResearch(r.id));
  }
}
```
