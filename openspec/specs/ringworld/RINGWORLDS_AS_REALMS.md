# Ringworlds as Realms - Architectural Specification

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Core Insight

**Ringworlds are INFINITE REALMS, not universes.**

They exist **inter-dimensionally** - accessible from multiple universes simultaneously, lousy with dimensional rifts and reality-warping superweapons, maintained by confluence of countless races across billions of years.

## Why Realms, Not Universes?

From the user:
> "with so many beings on a ringworld I would imagine they'd be present in a lot of realities and with magic, these would be absolutely lousy with dimensional-holes and reality-warping superweapons. Their sheer size and likely confluence of races would keep them around and maintained for billions of years, so they'd likely hardly be said to be in one particular dimension or another, so frankly they could be inter-universal realms"

**Existing Realm Architecture Provides:**

```typescript
// From packages/core/src/realms/RealmTypes.ts
interface RealmProperties {
  id: string;
  name: string;
  category: RealmCategory;  // 'wild', 'personal', etc.
  parentUniverseId: string;  // Can be 'multiverse:any' for inter-universal!

  // Size and topology
  size: RealmSize;        // 'infinite' for ringworlds (requires 0.90+ presence)
  topology: string;       // 'nested' - contains sub-realms (megasegments!)

  // Time dilation
  timeFlow: TimeFlowType;
  timeRatio: number;      // Independent time scaling

  // Physical properties
  environment: string;
  stability: number;      // 0-1, how stable reality is

  // Access control
  accessMethods: AccessMethod[];     // portal, physical_gate, etc.
  accessRestrictions: AccessRestriction[];

  // Governance
  ruler?: string;         // Presence ID (or none if abandoned)
  contested: boolean;     // Multiple factions vie for control
  laws: RealmLaw[];       // Special physics/rules

  // Maintenance
  selfSustaining: boolean;   // true for ancient megastructures
  maintenanceCost: number;   // 0 for self-sustaining
  subRealms?: string[];      // NESTED MEGASEGMENTS!
}
```

## Ringworld Realm Definition

```typescript
export const FirstRingworld: RealmProperties = {
  // Identity
  id: 'ringworld:alpha',
  name: 'The First Ring',
  category: 'wild',  // Untamed, unclaimed (Builders are gone)
  parentUniverseId: 'multiverse:convergence',  // Inter-universal anchor point

  // Scale
  size: 'infinite',  // Requires Presence 0.90+ to create
  topology: 'nested',  // Contains 1000 megasegment sub-realms

  // Time (can vary per megasegment)
  timeFlow: 'normal',
  timeRatio: 1.0,

  // Environment
  environment: 'constructed_biosphere',
  stability: 0.92,  // High, but dimensional rifts lower it from 1.0

  // Access
  accessMethods: [
    'portal',        // Dimensional rifts
    'physical_gate', // Spaceports, transport hubs
    'pilgrimage',    // Long journey through space
    'transformation' // Become energy, travel as light
  ],
  accessRestrictions: [],  // Open to all (unlike divine realms)

  // Governance
  ruler: undefined,  // Builders gone, no single ruler
  contested: true,   // Thousands of factions, civilizations, empires

  laws: [
    {
      name: 'builder_physics',
      effect: 'exotic_materials_stable',
      enforcement: 'automatic',
      description: 'Scrith, exotic matter, and Builder tech remain stable'
    },
    {
      name: 'shadow_square_cycle',
      effect: 'day_night_cycle',
      enforcement: 'environmental',
      description: 'Twenty shadow squares orbit, creating 24-hour day/night'
    },
    {
      name: 'rim_wall_containment',
      effect: 'atmosphere_retained',
      enforcement: 'automatic',
      description: '3000km walls hold atmosphere despite no gravity well'
    },
    {
      name: 'dimensional_permeability',
      effect: 'rifts_common',
      enforcement: 'environmental',
      description: 'Weak dimensional boundaries, portals form easily'
    },
    {
      name: 'reality_anchor_disruption',
      effect: 'magic_amplified',
      enforcement: 'environmental',
      description: 'Ancient superweapons weakened reality, magic 2x stronger'
    }
  ],

  // Maintenance
  selfSustaining: true,  // Billions of years old, maintained by countless races
  maintenanceCost: 0,    // No single entity maintains it

  // Nested structure
  subRealms: [
    'megasegment:0',    // Prime Meridian
    'megasegment:1',
    'megasegment:2',
    // ... 997 more
  ]
};
```

## Megasegments as Sub-Realms

```typescript
// Active megasegment - full simulation
const Megasegment7Active: RealmProperties = {
  id: 'megasegment:7',
  name: 'The Crystal Wastes',
  category: 'territory',
  parentUniverseId: 'ringworld:alpha',  // Parent realm

  size: 'kingdom',  // Nation-scale (requires 0.80+)
  topology: 'nested',  // Contains 100 region sub-realms

  timeFlow: 'normal',
  timeRatio: 1.0,  // Full speed when active

  environment: 'crystalline_wasteland',
  stability: 0.75,  // Failed Builder experiment

  accessMethods: ['portal', 'physical_gate'],
  accessRestrictions: [],

  ruler: 'presence:crystal_collective',  // AI hive mind
  contested: false,

  laws: [
    {
      name: 'crystal_growth',
      effect: 'reality_crystallizes',
      enforcement: 'environmental',
      description: 'Failed Builder experiment causes slow reality crystallization'
    },
    {
      name: 'thought_resonance',
      effect: 'telepathy_enhanced',
      enforcement: 'environmental',
      description: 'Crystals amplify psychic signals'
    }
  ],

  selfSustaining: true,
  maintenanceCost: 0,

  subRealms: [
    'megaseg:7:region:0',
    'megaseg:7:region:1',
    // ... 98 more regions
  ]
};

// Abstract megasegment - statistics only
const Megasegment250Abstract: RealmProperties = {
  id: 'megasegment:250',
  name: 'The Worldforge',
  category: 'territory',
  parentUniverseId: 'ringworld:alpha',

  size: 'kingdom',
  topology: 'nested',

  // CRITICAL: Slowed time when abstract
  timeFlow: 'slow',
  timeRatio: 0.1,  // 10x slower = cheaper simulation

  environment: 'divine_architecture',
  stability: 0.98,  // Builder factory, very stable

  accessMethods: ['portal', 'physical_gate', 'summoning'],
  accessRestrictions: [
    {
      type: 'knowledge',
      requirement: 'knows_location',
      description: 'Must know Worldforge coordinates'
    }
  ],

  ruler: 'presence:maintenance_drones',
  contested: false,

  laws: [
    {
      name: 'perpetual_construction',
      effect: 'automatic_crafting',
      enforcement: 'environmental',
      description: 'Factory drones continuously produce Builder tech'
    }
  ],

  selfSustaining: true,
  maintenanceCost: 0,

  // Abstract - no sub-realms loaded
  subRealms: []
};
```

## Regions as Sub-Sub-Realms (Optional)

```typescript
// Active region within active megasegment
const Region23: RealmProperties = {
  id: 'megaseg:7:region:23',
  name: 'Ancient Landing Platform',
  category: 'personal',  // Size of village/town
  parentUniverseId: 'megasegment:7',

  size: 'domain',  // Village-scale (requires 0.60+)
  topology: 'bounded',  // Clear borders

  timeFlow: 'normal',
  timeRatio: 1.0,

  environment: 'ancient_ruins',
  stability: 0.85,

  accessMethods: ['physical_gate'],  // Walk from adjacent region
  accessRestrictions: [],

  ruler: undefined,  // Abandoned
  contested: false,

  laws: [],  // Inherits from parent megasegment

  selfSustaining: true,
  maintenanceCost: 0,

  subRealms: []  // No further nesting
};
```

## Hierarchical Realm Nesting

```
Ringworld (Infinite Realm)
├── Megasegment 0 (Kingdom Sub-Realm) - Prime Meridian
│   ├── Region 0 (Domain) - The Great Spire
│   ├── Region 1 (Domain) - Tutorial Valley
│   └── ... 98 more regions
├── Megasegment 7 (Kingdom Sub-Realm) - Crystal Wastes [ACTIVE]
│   ├── Region 23 (Domain) - Ancient Landing Platform [ACTIVE]
│   ├── Region 24 (Domain) - Crystal Gardens [ABSTRACT]
│   └── ... 98 more regions
├── Megasegment 250 (Kingdom Sub-Realm) - Worldforge [ABSTRACT]
│   └── [No regions loaded - abstract statistics only]
└── ... 997 more megasegments
```

## Inter-Universal Access

**Ringworlds exist in MULTIPLE UNIVERSES simultaneously:**

```typescript
// Passages from different universes to same ringworld
multiverseCoordinator.createPassage(
  'passage:universe_a_to_ringworld',
  'universe:alpha',
  'ringworld:alpha',
  'gate'  // Spaceport in Universe A
);

multiverseCoordinator.createPassage(
  'passage:universe_b_to_ringworld',
  'universe:beta',
  'ringworld:alpha',
  'gate'  // Different spaceport in Universe B
);

// Dimensional rift connects universe C directly to Megasegment 7
multiverseCoordinator.createPassage(
  'rift:universe_c_to_megaseg_7',
  'universe:charlie',
  'megasegment:7',
  'thread'  // Unstable dimensional tear
);
```

**Result:** Ringworld accessible from three universes, each universe sees the SAME ringworld state (shared realm).

## Massively Complex Economies

### Gigasegment Level (Inter-Ringworld Trade)

```typescript
interface GigasegmentEconomy {
  ringworlds: string[];  // ['ringworld:alpha', 'ringworld:beta', ...]

  // Luxury goods exchange between ringworlds
  trade: {
    exports: {
      'clarketech:exotic_matter': 1_000_000,     // tons per year
      'cultural:music_crystals': 500_000,
      'magical:dimensional_anchors': 10_000
    },
    imports: {
      'food:luxury_delicacies': 2_000_000,
      'art:masterwork_sculptures': 50_000,
      'tech:alternate_physics_devices': 5_000
    }
  };

  population: 50_000_000_000;  // 50 billion across all ringworlds
}
```

### Ringworld Level (Inter-Megasegment)

```typescript
interface RingworldEconomy {
  megasegments: AbstractMegasegment[];  // 1000 megasegments

  // High-level trade between megasegments
  trade: Map<string, TradeFlow>;  // megasegment -> exports/imports
  transportHubs: TransportHub[];  // Spaceports, warp gates

  population: 10_000_000_000;  // 10 billion
}

interface TradeFlow {
  from: string;  // megasegment:7
  to: string;    // megasegment:12
  goods: {
    'food:grains': 100_000,           // tons per day
    'materials:crystals': 50_000,
    'tech:devices': 10_000
  };
  route: 'spaceport' | 'portal' | 'overland';
}
```

### Megasegment Level (Inter-Region)

```typescript
interface MegasegmentEconomy {
  regions: AbstractRegion[];  // 100 regions

  // City-level trade
  cities: City[];  // Hundreds of cities
  production: Map<ResourceType, number>;  // Per day
  consumption: Map<ResourceType, number>;

  population: 10_000_000;  // 10 million
}

interface City {
  id: string;
  regionId: string;
  population: number;  // 10K - 500K
  specialization: 'farming' | 'mining' | 'crafting' | 'research' | 'trade';

  production: Map<ResourceType, number>;
  consumption: Map<ResourceType, number>;

  // Trade with other cities
  tradeRoutes: TradeRoute[];
}
```

### Region Level (Full ECS Simulation)

```typescript
// When active, region uses full ECS
const activeRegion = await hydrateRegion(
  'megaseg:7:region:23',
  currentTick
);

// Full entity simulation
for (const entity of activeRegion.entities) {
  if (entity.hasComponent('agent')) {
    // Individual agent behavior
    AgentBrainSystem.update(entity);
  }
  if (entity.hasComponent('building')) {
    // Individual building production
    ProductionSystem.update(entity);
  }
}
```

## Dimensional Holes and Reality-Warping

```typescript
// Ringworlds have WEAK dimensional boundaries
const RingworldLaws: RealmLaw[] = [
  {
    name: 'dimensional_permeability',
    effect: 'rifts_common',
    enforcement: 'environmental',
    description: 'Dimensional rifts form easily, portals are stable'
  },
  {
    name: 'reality_anchor_disruption',
    effect: 'magic_amplified',
    enforcement: 'environmental',
    description: 'Ancient superweapons weakened reality, magic 2x stronger'
  },
  {
    name: 'confluence_of_races',
    effect: 'cultural_mixing',
    enforcement: 'environmental',
    description: 'Thousands of species coexist, rapid cultural evolution'
  }
];

// Portal spawning system
class PortalSpawningSystem implements System {
  update(world: World): void {
    // Ringworlds spawn portals frequently
    const realmComponent = getRingworldRealm(world);
    if (!realmComponent) return;

    // Check dimensional permeability law
    const hasDimensionalPermeability = realmComponent.properties.laws.some(
      law => law.name === 'dimensional_permeability'
    );

    if (hasDimensionalPermeability && Math.random() < 0.01) {
      // 1% chance per tick to spawn portal
      const portal = world.createEntity();
      portal.addComponent({
        type: 'portal',
        targetRealmId: selectRandomRealm(),  // To another megasegment, universe, or reality
        stability: Math.random() * 0.5 + 0.3,  // 30-80% stable
        discoverable: true
      });
    }
  }
}
```

## Reality-Warping Superweapons

```typescript
interface RealmSuperweapon {
  id: string;
  name: string;
  type: 'dimension_flattening' | 'reality_anchoring' | 'time_dilation_bomb' | 'probability_manipulator';

  // Effects on realm
  modifiesLaws: RealmLaw[];
  stabilityPenalty: number;  // -0.05 to -0.3

  // Historical impact
  ageInYears: number;  // Billions of years
  deactivated: boolean;
  location: Position;
}

// Example: Dimension flattening weapon (Dark Forest style)
const FlatteningDevice: RealmSuperweapon = {
  id: 'weapon:flattener_alpha',
  name: 'The Dimensionality Reducer',
  type: 'dimension_flattening',

  modifiesLaws: [
    {
      name: 'forced_2d',
      effect: 'entities_lose_z_coordinate',
      enforcement: 'automatic',
      description: 'All entities within 100km flatten to 2D'
    }
  ],

  stabilityPenalty: -0.15,

  ageInYears: 3_200_000_000,  // 3.2 billion years old
  deactivated: false,  // Still active!
  location: { x: 7_500_000, y: 450_000 }  // Megasegment 7, deep in Crystal Wastes
};
```

## Stable Persistent Cultures

```typescript
// Cultures persist across save/load via realm state
interface CulturalIdentity {
  realmId: string;  // Which megasegment/region

  // Stable characteristics
  name: string;
  language: string;
  traditions: string[];
  techLevel: number;

  // Population
  population: number;
  growthRate: number;

  // Economic specialization
  exports: Map<ResourceType, number>;
  imports: Map<ResourceType, number>;

  // Inter-cultural relationships
  alliances: string[];  // Other culture IDs
  rivals: string[];
  tradePartners: string[];
}

// Culture persists in realm state
const CrystalCollective: CulturalIdentity = {
  realmId: 'megasegment:7',
  name: 'The Crystal Collective',
  language: 'Resonance',
  traditions: ['crystal_singing', 'hive_mind_meditation', 'geometric_art'],
  techLevel: 8,  // Clarke-tech tier

  population: 2_000_000,
  growthRate: 0.02,

  exports: new Map([
    ['crystals:psionic', 50_000],
    ['tech:thought_amplifiers', 1_000]
  ]),
  imports: new Map([
    ['food:organics', 100_000],
    ['materials:metals', 20_000]
  ]),

  alliances: ['megaseg:12:silicon_confederation'],
  rivals: ['megaseg:9:flesh_zealots'],
  tradePartners: ['megaseg:0:prime_merchants', 'megaseg:250:worldforge_drones']
};

// Saved with realm snapshot
const megaseg7Snapshot: UniverseSnapshot = {
  // ... entity data
  customData: {
    cultures: [CrystalCollective, /*...*/],
    economicFlows: {/*...*/},
    politicalState: {/*...*/}
  }
};
```

## Implementation Strategy

### Phase 1: Ringworld Realm Definition
- [ ] Create `RingworldRealm` definition with nested sub-realms
- [ ] Define special laws (builder_physics, shadow_squares, dimensional_permeability)
- [ ] Register in `REALM_REGISTRY`

### Phase 2: Megasegment Sub-Realms
- [ ] Create 1000 megasegment realm definitions
- [ ] Implement active vs abstract state (timeRatio adjustment)
- [ ] Link megasegments as sub-realms of ringworld

### Phase 3: Inter-Universal Passages
- [ ] Create passages from multiple universes to ringworld
- [ ] Test shared realm state across universes
- [ ] Implement portal spawning system

### Phase 4: Economic Abstraction
- [ ] GigasegmentEconomy (luxury goods exchange)
- [ ] RingworldEconomy (transport hubs, trade flows)
- [ ] MegasegmentEconomy (city-level production/consumption)
- [ ] AbstractRegion (Factorio-style rates)

### Phase 5: Cultural Persistence
- [ ] CulturalIdentity component
- [ ] Save/load cultures with realm snapshots
- [ ] Inter-cultural relationships and diplomacy

### Phase 6: Dimensional Rifts
- [ ] Portal spawning based on dimensional_permeability law
- [ ] Reality-warping superweapon effects
- [ ] Stability degradation from ancient weapons

## Storage Scaling

**Realm-Based Storage:**

```
Ringworld Realm (1 entity with RealmComponent)
├── Properties: ~5 KB
├── Laws: ~2 KB
├── Sub-realm references: ~100 KB (1000 IDs)
└── Total: ~107 KB

Megasegment (Active)
├── Properties: ~5 KB
├── Full ECS entities: ~50 MB
├── Region snapshots: ~500 MB
└── Total: ~550 MB per active megasegment

Megasegment (Abstract)
├── Properties: ~5 KB
├── Economic state: ~500 KB
├── Cultural data: ~200 KB
└── Total: ~705 KB per abstract megasegment

Total Storage:
- Ringworld base: 107 KB
- 10 active megasegments: 5.5 GB
- 990 abstract megasegments: 698 MB
- Grand total: ~6.2 GB for entire ringworld
```

**Compare to:** Full simulation of 1000 megasegments = 550 GB (89x reduction!)

## Integration with Existing Systems

### Timeline Manager
- [ ] Snapshots include realm state (economic flows, cultures)
- [ ] Canon events trigger realm-level snapshots
- [ ] Fork ringworld at specific tick creates alternate timeline ringworld

### Multiverse Coordinator
- [ ] Ringworld realm accessible from multiple universes
- [ ] Each universe sees same ringworld state (shared)
- [ ] Time dilation per universe affects perceived ringworld time

### Delta Storage
- [ ] Store deltas per realm (not per universe)
- [ ] Realms delta format includes economic changes, portal spawns
- [ ] Compression via abstract economic state

## Success Criteria

- ✅ Ringworld implemented as Infinite Realm with nested sub-realms
- ✅ Megasegments as Kingdom sub-realms (active vs abstract)
- ✅ Inter-universal access via multiple passages
- ✅ Massively complex economies (gigasegment → city level)
- ✅ Stable persistent cultures across save/load
- ✅ Dimensional rifts spawn naturally due to realm laws
- ✅ Ancient superweapons affect realm stability
- ✅ Storage scales to handle 1000 megasegments (6-10 GB)

## Future Enhancements

- **Multiple Ringworlds** - Alpha, Beta, Gamma (each an Infinite Realm)
- **Dyson Spheres** - Different type of megastructure realm
- **Planet-Cities** - Entire planets as Kingdom realms
- **Hive Worlds** - Trillions of inhabitants, extreme abstraction
- **Realm Wars** - Factions fighting for control of megasegments
- **Builder Awakening** - Ancient presence returning to claim ringworld
