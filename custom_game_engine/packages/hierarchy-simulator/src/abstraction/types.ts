/**
 * Hierarchical Abstraction Types
 *
 * 7-tier scale ladder:
 * - Gigasegment: 10^15 km² (billions of population)
 * - Megasegment: 10^13 km² (hundreds of millions)
 * - Sub-section: 10^10 km² (planet-city, 10M-500M)
 * - Region: 10^8 km² (district, 100K-10M)
 * - Zone: 10^5 km² (building cluster, 1K-100K)
 * - Chunk: 3 km² (FULL ECS SIMULATION)
 * - Tile: 9 m² (individual physics)
 */

export type TierLevel =
  | 'gigasegment'
  | 'megasegment'
  | 'subsection'
  | 'region'
  | 'zone'
  | 'chunk'
  | 'tile';

export type SimulationMode =
  | 'abstract'      // Statistics only
  | 'semi-active'   // Partial simulation
  | 'active';       // Full ECS

export interface UniversalAddress {
  gigasegment: number;      // 0-9999 (galactic scale)
  megasegment: number;      // 0-99 (solar system scale)
  subsection: number;       // 0-999 (planet-sized)
  region: number;           // 0-99 (district scale)
  zone: number;             // 0-999 (building cluster)
  chunk: { x: number; y: number };  // 32×32 tiles
  tile: { x: number; y: number };   // 3m × 3m
}

export interface ResourceFlow {
  type: string;
  production: number;   // Per tick
  consumption: number;  // Per tick
  storage: number;      // Current stockpile
  capacity: number;     // Max storage
}

export interface TradeRoute {
  id: string;
  from: string;  // Address or ID
  to: string;
  resources: Map<string, number>;  // Resource type -> quantity per tick
  type: 'spaceport' | 'portal' | 'warp_gate' | 'physical_route';
  active: boolean;
  efficiency: number;  // 0-1
}

export interface PopulationStats {
  total: number;
  growth: number;        // Per tick
  carryingCapacity: number;  // Max sustainable population
  distribution: {
    workers: number;
    military: number;
    researchers: number;
    children: number;
    elderly: number;
  };
}

export interface EconomicState {
  production: Map<string, number>;   // Resource -> amount per tick
  consumption: Map<string, number>;  // Resource -> amount per tick
  stockpiles: Map<string, number>;   // Resource -> current amount
  tradeBalance: number;               // Net imports/exports value
}

export interface AbstractTier {
  // Identity
  id: string;
  name: string;
  tier: TierLevel;
  address: Partial<UniversalAddress>;

  // Simulation
  mode: SimulationMode;
  tick: number;
  timeScale: number;  // 1.0 = normal, 0.1 = 10x slower (abstract)

  // Population
  population: PopulationStats;

  // Economy
  economy: EconomicState;

  // Trade
  tradeRoutes: TradeRoute[];
  transportHubs: TransportHub[];

  // Game Mechanics
  stability: StabilityMetrics;
  tech: TechProgress;
  activeEvents: GameEvent[];

  // Research Infrastructure
  universities: number;  // Count of universities at this tier
  researchGuilds: Map<string, number>;  // Field -> guild count
  activeResearch: string[];  // Paper IDs being researched
  scientistPool: Map<number, number>;  // Tier -> count of scientists available

  // Children
  children: AbstractTier[];

  // Methods
  update(deltaTime: number): void;
  activate(): void;      // Switch from abstract to active
  deactivate(): void;    // Switch from active to abstract
  addEvent(event: GameEvent): void;
  getTotalPopulation(): number;
  getAllDescendants(): AbstractTier[];  // Flatten all nested children
  addChild(child: AbstractTier): void;  // Add a child tier
  toJSON(): any;
}

export interface TransportHub {
  id: string;
  type: 'spaceport' | 'warp_gate' | 'dimensional_portal' | 'trade_station';
  position: { x: number; y: number };
  capacity: number;      // Throughput per tick
  connections: string[]; // Connected hub IDs
  operational: boolean;
}

export interface ProductionFacility {
  id: string;
  type: string;
  produces: Map<string, number>;   // Resource -> amount per tick
  requires: Map<string, number>;   // Resource -> amount per tick
  efficiency: number;   // 0-1
  workers: number;
}

export interface CulturalIdentity {
  name: string;
  language: string;
  techLevel: number;     // 0-10
  traditions: string[];
  population: number;
  growthRate: number;
}

export const TIER_SCALES: Record<TierLevel, {
  area: number;          // km²
  populationRange: [number, number];
  childrenCount: number;
  label: string;
}> = {
  gigasegment: {
    area: 1e15,
    populationRange: [10_000_000_000, 100_000_000_000],  // 10-100 billion
    childrenCount: 100,  // 100 megasegments
    label: 'Gigasegment'
  },
  megasegment: {
    area: 1e13,
    populationRange: [100_000_000, 1_000_000_000],  // 100M-1B
    childrenCount: 100,  // 100 subsections
    label: 'Megasegment'
  },
  subsection: {
    area: 1e10,
    populationRange: [10_000_000, 500_000_000],  // 10M-500M
    childrenCount: 100,  // 100 regions
    label: 'Sub-section'
  },
  region: {
    area: 1e8,
    populationRange: [100_000, 10_000_000],  // 100K-10M
    childrenCount: 100,  // 100 zones
    label: 'Region'
  },
  zone: {
    area: 1e5,
    populationRange: [1_000, 100_000],  // 1K-100K
    childrenCount: 100,  // 100 chunks
    label: 'Zone'
  },
  chunk: {
    area: 3,  // 3 km² (FULL ECS)
    populationRange: [10, 1_000],  // 10-1K
    childrenCount: 1024,  // 32×32 tiles
    label: 'Chunk'
  },
  tile: {
    area: 0.000009,  // 9 m²
    populationRange: [0, 10],  // 0-10
    childrenCount: 0,
    label: 'Tile'
  }
};

export interface SimulationStats {
  tick: number;
  activeTiers: number;
  totalPopulation: number;
  totalProduction: Map<string, number>;
  totalConsumption: Map<string, number>;
  activeTradeRoutes: number;
  economicEfficiency: number;  // 0-1
}

export const RESOURCE_TYPES = [
  'food',
  'water',
  'energy',
  'materials',
  'technology',
  'luxury_goods',
  'exotic_matter',
  'dimensional_crystals'
] as const;

export type ResourceType = typeof RESOURCE_TYPES[number];

// Game Events & Crises
export type EventType =
  | 'tech_breakthrough'
  | 'resource_discovery'
  | 'cultural_renaissance'
  | 'trade_boom'
  | 'population_boom'
  | 'natural_disaster'
  | 'resource_shortage'
  | 'civil_unrest'
  | 'infrastructure_failure'
  | 'pandemic'
  | 'war'
  | 'migration_wave';

export interface GameEvent {
  id: string;
  type: EventType;
  tier: string;  // Tier ID
  tick: number;
  severity: number;  // 1-10
  duration: number;  // Ticks
  description: string;
  effects: {
    populationChange?: number;
    stabilityChange?: number;
    techLevelChange?: number;
    resourceModifier?: Map<ResourceType, number>;  // Multiplier
  };
}

export interface StabilityMetrics {
  overall: number;  // 0-100
  economic: number;  // 0-100
  social: number;   // 0-100
  infrastructure: number;  // 0-100
  happiness: number;  // 0-100
}

export interface TechProgress {
  level: number;  // 0-10
  research: number;  // Progress to next level (0-100)
  efficiency: number;  // Production multiplier (1.0 + level * 0.1)
}
